import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { defaultResumeDesign, type ResumeSection } from "@/domain/resume";
import { SectionRenderer } from "@/features/resume-renderer/SectionRenderer";

describe("Skills renderer", () => {
  it("renders section rich text once with formatting and preserved line breaks", () => {
    const section: Extract<ResumeSection, { type: "skills" }> = {
      id: "skills-section",
      type: "skills" as const,
      heading: "Skills",
      visible: true,
      column: "full" as const,
      entries: [],
      content: [
        { type: "paragraph" as const, text: "B2B Sales & Account Management: B2B Sales, Account Management", spans: [
          { text: "B2B Sales & Account Management:", marks: ["bold" as const] },
          { text: " B2B Sales, Account Management", marks: [] },
        ] },
        { type: "paragraph" as const, text: "AI & Automation: Clay, Apollo", spans: [
          { text: "AI & Automation:", marks: ["bold" as const] },
          { text: " Clay, Apollo", marks: [] },
        ] },
      ],
    };
    const { container } = render(<SectionRenderer section={section} design={defaultResumeDesign} />);

    expect(screen.getAllByText("Skills")).toHaveLength(1);
    expect(screen.getByText("B2B Sales & Account Management:").closest("strong")).not.toBeNull();
    expect(screen.getByText("AI & Automation:").closest("strong")).not.toBeNull();
    expect(container.querySelectorAll("p")).toHaveLength(2);
  });

  it("converts legacy entry Markdown without discarding its skills", () => {
    const section: Extract<ResumeSection, { type: "skills" }> = {
      id: "legacy-skills",
      type: "skills",
      heading: "Skills",
      visible: true,
      column: "full",
      entries: [{ id: "legacy-entry", visible: true, name: "", description: "SKILLS\n\n**KYC & AML Compliance**\nKYC/KYB, AML Compliance" }],
    };
    render(<SectionRenderer section={section} design={defaultResumeDesign} />);

    expect(screen.getByText("KYC & AML Compliance").closest("strong")).not.toBeNull();
    expect(screen.getByText("KYC/KYB, AML Compliance")).toBeInTheDocument();
  });
});
