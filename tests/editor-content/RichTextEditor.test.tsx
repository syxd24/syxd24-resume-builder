import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RichTextEditor } from "@/features/editor/content";
import {
  clipboardToRichText,
  editorElementToRichText,
  richTextToEditorHtml,
  safeRichTextHref,
} from "@/features/editor/content/rich-text-codec";

afterEach(() => {
  Reflect.deleteProperty(document, "execCommand");
  Reflect.deleteProperty(document, "queryCommandState");
});

describe("rich-text codec", () => {
  it("preserves legacy blocks, marks, links, and list semantics through the unified editor HTML", () => {
    const legacy = [
      { type: "paragraph" as const, text: "Intro" },
      {
        type: "bullet" as const,
        text: "Built products",
        spans: [
          { text: "Built", marks: ["bold" as const] },
          { text: " products", marks: [], href: "https://example.com/work" },
        ],
      },
      { type: "bullet" as const, text: "Improved quality" },
    ];
    const root = document.createElement("div");
    root.innerHTML = richTextToEditorHtml(legacy);

    expect(root.querySelectorAll("ul > li")).toHaveLength(2);
    expect(editorElementToRichText(root)).toEqual(legacy);
  });

  it("turns a pasted four-line CV description into four canonical bullets", () => {
    const pasted = clipboardToRichText("", [
      "- Developed B2B sales strategies.",
      "- Managed client relationships.",
      "- Generated 30 qualified meetings monthly.",
      "- Built AI-powered GTM workflows.",
    ].join("\n"));

    expect(pasted).toHaveLength(4);
    expect(pasted.every((block) => block.type === "bullet")).toBe(true);
    expect(pasted.map((block) => block.text)).toEqual([
      "Developed B2B sales strategies.",
      "Managed client relationships.",
      "Generated 30 qualified meetings monthly.",
      "Built AI-powered GTM workflows.",
    ]);
  });

  it("parses Markdown emphasis, links, lists, and line breaks from plain-text paste", () => {
    const pasted = clipboardToRichText("", "**B2B Sales:** Account Management\n*Pipeline Strategy* and [Apollo](https://example.com)\n- Lead generation");

    expect(pasted).toEqual([
      { type: "paragraph", text: "B2B Sales: Account Management", spans: [
        { text: "B2B Sales:", marks: ["bold"] }, { text: " Account Management", marks: [] },
      ] },
      { type: "paragraph", text: "Pipeline Strategy and Apollo", spans: [
        { text: "Pipeline Strategy", marks: ["italic"] }, { text: " and ", marks: [] }, { text: "Apollo", marks: [], href: "https://example.com" },
      ] },
      { type: "bullet", text: "Lead generation" },
    ]);
  });

  it("keeps reasonable Word-style formatting while discarding unsafe link protocols", () => {
    const pasted = clipboardToRichText(
      '<p class="MsoListParagraph">&#8226; <span style="font-weight: 700">Led sales</span> with <a href="javascript:alert(1)">unsafe</a></p>',
      "\u2022 Led sales with unsafe",
    );

    expect(pasted[0]).toMatchObject({ type: "bullet", text: "Led sales with unsafe" });
    expect(pasted[0]?.spans?.[0]).toMatchObject({ text: "Led sales", marks: ["bold"] });
    expect(pasted[0]?.spans?.some((span) => span.href)).toBe(false);
    expect(safeRichTextHref("example.com/work")).toBe("https://example.com/work");
    expect(safeRichTextHref("javascript:alert(1)")).toBeUndefined();
  });
});

describe("RichTextEditor", () => {
  it("renders one expanding editing surface without paragraph block controls", () => {
    render(
      <RichTextEditor
        label="Description"
        value={[{ type: "paragraph", text: "Build reliable products" }]}
        onChange={vi.fn()}
      />,
    );

    const editor = screen.getByRole("textbox", { name: "Description" });
    expect(editor).toHaveAttribute("contenteditable", "true");
    expect(editor).toHaveTextContent("Build reliable products");
    expect(screen.queryByText("Add paragraph")).not.toBeInTheDocument();
    expect(screen.queryByText("Remove block")).not.toBeInTheDocument();
    expect(screen.queryByText("Formatting preview")).not.toBeInTheDocument();
  });

  it("sanitizes and emits a multi-bullet paste as canonical RichText", () => {
    const onChange = vi.fn();
    render(<RichTextEditor label="Description" value={[]} onChange={onChange} />);
    const editor = screen.getByRole("textbox", { name: "Description" });
    const plainText = "- First result\n- Second result\n- Third result\n- Fourth result";

    fireEvent.paste(editor, {
      clipboardData: {
        getData: (type: string) => type === "text/plain" ? plainText : "",
      },
    });

    expect(onChange).toHaveBeenCalled();
    expect(onChange.mock.lastCall?.[0]).toEqual([
      { type: "bullet", text: "First result" },
      { type: "bullet", text: "Second result" },
      { type: "bullet", text: "Third result" },
      { type: "bullet", text: "Fourth result" },
    ]);
  });

  it("maps edited semantic HTML to structured spans and line breaks", () => {
    const onChange = vi.fn();
    render(<RichTextEditor label="Summary" value={[]} onChange={onChange} />);
    const editor = screen.getByRole("textbox", { name: "Summary" });
    editor.innerHTML = "<p><strong>Build</strong> reliable<br>products</p>";
    fireEvent.input(editor);

    expect(onChange.mock.lastCall?.[0][0]).toEqual({
      type: "paragraph",
      text: "Build reliable\nproducts",
      spans: [
        { text: "Build", marks: ["bold"] },
        { text: " reliable\nproducts", marks: [] },
      ],
    });
  });

  it("wires toolbar buttons and standard formatting shortcuts to native editing commands", () => {
    const execCommand = vi.fn(() => true);
    Object.defineProperty(document, "execCommand", { configurable: true, value: execCommand });
    Object.defineProperty(document, "queryCommandState", { configurable: true, value: vi.fn(() => false) });
    render(<RichTextEditor label="Summary" value={[{ type: "paragraph", text: "Build" }]} onChange={vi.fn()} />);
    const editor = screen.getByRole("textbox", { name: "Summary" });
    editor.focus();

    fireEvent.keyDown(editor, { key: "b", ctrlKey: true });
    fireEvent.click(screen.getByRole("button", { name: "Toggle unordered list" }));

    expect(execCommand).toHaveBeenCalledWith("bold", false);
    expect(execCommand).toHaveBeenCalledWith("insertUnorderedList", false);
  });

  it("opens hyperlink editing inside the toolbar rather than showing a permanent URL field", () => {
    render(<RichTextEditor label="Summary" value={[{ type: "paragraph", text: "Portfolio" }]} onChange={vi.fn()} />);

    expect(screen.queryByRole("group", { name: "Edit hyperlink" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Insert or edit hyperlink" }));
    expect(screen.getByRole("group", { name: "Edit hyperlink" })).toBeInTheDocument();
    expect(screen.getByLabelText("Link")).toHaveAttribute("placeholder", "https://example.com");
  });
});
