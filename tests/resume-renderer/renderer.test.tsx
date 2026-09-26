import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import fixtureDesign from "../../fixtures/default-design.json";
import fixtureDocument from "../../fixtures/golden-resume.json";
import { resumeDesignSchema, resumeDocumentSchema, type ResumeDocument } from "@/domain/resume";
import { ResumeRenderer } from "@/features/resume-renderer/ResumeRenderer";
import { formatDateRange, PAGE_DIMENSIONS } from "@/features/resume-renderer/format";
import { paginateResume } from "@/features/resume-renderer/pagination";

const document = resumeDocumentSchema.parse(fixtureDocument);
const design = resumeDesignSchema.parse(fixtureDesign);

describe("ResumeRenderer", () => {
  it("uses physical A4 and Letter dimensions", () => {
    expect(PAGE_DIMENSIONS.A4).toMatchObject({ widthMm: 210, heightMm: 297 });
    expect(PAGE_DIMENSIONS.Letter).toMatchObject({ widthMm: 215.9, heightMm: 279.4 });
  });

  it("formats date ranges using locale-aware design metadata", () => {
    const value = { start: { year: 2024, month: 2 }, current: true };
    expect(formatDateRange(value, { ...design, document: { ...design.document, dateFormat: "MMM YYYY" } })).toBe("Feb 2024 – Present");
  });

  it("renders semantic text and clickable links with the shared tree", () => {
    const { container } = render(<ResumeRenderer document={document} design={design} mode="editor" />);
    expect(screen.getByRole("heading", { name: "Alex Morgan" })).toBeTruthy();
    expect(screen.getByText("PROFESSIONAL EXPERIENCE")).toBeTruthy();
    const github = screen.getByRole("link", { name: /github/i });
    expect(github.getAttribute("href")).toBe("https://github.com/example");
    expect(container.querySelector('[data-resume-page="1"]')).toBeTruthy();
    expect(container.querySelectorAll("[data-resume-page]")).toHaveLength(1);
    expect(screen.getAllByText("LANGUAGES")).toHaveLength(1);
  });

  it("paginates a long resume without duplicating or dropping entries", () => {
    const experience = document.sections.find((section) => section.type === "experience");
    if (!experience || experience.type !== "experience") throw new Error("Fixture experience missing");
    const entries = Array.from({ length: 45 }, (_, index) => ({
      ...experience.entries[0]!,
      id: `stress-${index}`,
      position: `Engineer ${index}`,
    }));
    const longDocument: ResumeDocument = {
      ...document,
      sections: [{ ...experience, entries }],
    };
    const pages = paginateResume(longDocument, design, "A4");
    const renderedIds = pages.flatMap((page) => page.sections).flatMap((section) => "entries" in section ? section.entries.map((entry) => entry.id) : []);
    expect(pages.length).toBeGreaterThanOrEqual(3);
    expect(renderedIds).toEqual(entries.map((entry) => entry.id));
    expect(new Set(renderedIds).size).toBe(entries.length);
  });
});
