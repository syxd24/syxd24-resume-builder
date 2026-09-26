import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RichTextEditor } from "@/features/editor/content";

describe("RichTextEditor", () => {
  it("stores bold formatting as structured spans", () => {
    const onChange = vi.fn();
    render(
      <RichTextEditor
        label="Summary"
        value={[{ type: "paragraph", text: "Build reliable products" }]}
        onChange={onChange}
      />,
    );
    const textarea = screen.getByLabelText("Paragraph 1") as HTMLTextAreaElement;
    textarea.setSelectionRange(0, 5);
    fireEvent.select(textarea);
    fireEvent.click(screen.getByRole("button", { name: "Bold selected text" }));

    expect(onChange.mock.lastCall?.[0][0]).toMatchObject({
      type: "paragraph",
      text: "Build reliable products",
      spans: [
        { text: "Build", marks: ["bold"] },
        { text: " reliable products", marks: [] },
      ],
    });
  });

  it("stores list semantics rather than decorative text", () => {
    const onChange = vi.fn();
    render(
      <RichTextEditor
        label="Description"
        value={[{ type: "paragraph", text: "Reduced latency" }]}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Toggle unordered list" }));
    expect(onChange.mock.lastCall?.[0][0]).toMatchObject({ type: "bullet", text: "Reduced latency" });
  });

  it("normalizes selected-text links before storing them", () => {
    const onChange = vi.fn();
    render(
      <RichTextEditor
        label="Project description"
        value={[{ type: "paragraph", text: "Portfolio" }]}
        onChange={onChange}
      />,
    );
    const textarea = screen.getByLabelText("Paragraph 1") as HTMLTextAreaElement;
    textarea.setSelectionRange(0, 9);
    fireEvent.select(textarea);
    fireEvent.change(screen.getByLabelText("Link for selected text"), { target: { value: "example.com/work" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply link" }));

    expect(onChange.mock.lastCall?.[0][0].spans[0]).toMatchObject({
      text: "Portfolio",
      href: "https://example.com/work",
    });
  });
});
