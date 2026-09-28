import { useState } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createDefaultResumeDocument, resumeDocumentSchema } from "@/domain/resume/schema";
import { ContentEditor } from "@/features/editor/content";
import { SECTION_CATALOG } from "@/features/editor/content/factories";

function ControlledEditor({ onDocument }: { onDocument?: (value: ReturnType<typeof createDefaultResumeDocument>) => void }) {
  const [document, setDocument] = useState(createDefaultResumeDocument);
  return (
    <ContentEditor
      document={document}
      onChange={(next) => {
        setDocument(next);
        onDocument?.(next);
      }}
      onRequestImport={() => undefined}
    />
  );
}

describe("ContentEditor", () => {
  it("updates personal details immediately through the controlled document", () => {
    const changed = vi.fn();
    render(<ControlledEditor onDocument={changed} />);

    fireEvent.click(screen.getByRole("button", { name: "Edit personal details" }));
    fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "Ada Lovelace" } });

    const next = changed.mock.lastCall?.[0];
    expect(next?.personal.fullName).toBe("Ada Lovelace");
    expect(resumeDocumentSchema.safeParse(next).success).toBe(true);
  });

  it("shows the required Add Content choices in product order and creates a real section", () => {
    const changed = vi.fn();
    render(<ControlledEditor onDocument={changed} />);

    fireEvent.click(screen.getAllByRole("button", { name: /add content/i })[0]!);
    const dialog = screen.getByRole("dialog", { name: "Add content" });
    const catalogButtons = within(dialog).getAllByRole("button").filter((button) =>
      SECTION_CATALOG.some((item) => button.textContent?.includes(item.title)),
    );
    expect(catalogButtons.map((button) => SECTION_CATALOG.find((item) => button.textContent?.includes(item.title))?.type)).toEqual(
      SECTION_CATALOG.map((item) => item.type),
    );

    fireEvent.click(within(dialog).getByRole("button", { name: /projects/i }));
    const next = changed.mock.lastCall?.[0];
    expect(next?.sections.at(-1)).toMatchObject({ type: "projects", entries: [], visible: true });
  });

  it("keeps section cards minimal and expands them without mounting and unmounting their editing fields", () => {
    render(<ControlledEditor />);

    expect(screen.queryByRole("button", { name: /move professional experience section/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /hide summary section/i })).not.toBeInTheDocument();

    const summaryToggle = screen.getByRole("button", { name: /profile/i });
    const summaryBody = document.getElementById(summaryToggle.getAttribute("aria-controls") ?? "");
    expect(summaryToggle).toHaveAttribute("aria-expanded", "false");
    expect(summaryBody?.textContent).toContain("Profile summary");

    fireEvent.click(summaryToggle);
    expect(summaryToggle).toHaveAttribute("aria-expanded", "true");
    expect(summaryBody?.textContent).toContain("Profile summary");
  });
});
