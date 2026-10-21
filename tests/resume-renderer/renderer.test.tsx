import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import fixtureDesign from "../../fixtures/default-design.json";
import fixtureDocument from "../../fixtures/golden-resume.json";
import { resumeDesignSchema, resumeDocumentSchema, type ResumeDocument } from "@/domain/resume";
import { ResumeRenderer } from "@/features/resume-renderer/ResumeRenderer";
import { fontStack, formatDateRange, PAGE_DIMENSIONS } from "@/features/resume-renderer/format";
import { paginateResume } from "@/features/resume-renderer/pagination";

const document = resumeDocumentSchema.parse(fixtureDocument);
const design = resumeDesignSchema.parse(fixtureDesign);

afterEach(cleanup);

describe("ResumeRenderer", () => {
  it("uses physical A4 and Letter dimensions", () => {
    expect(PAGE_DIMENSIONS.A4).toMatchObject({ widthMm: 210, heightMm: 297 });
    expect(PAGE_DIMENSIONS.Letter).toMatchObject({ widthMm: 215.9, heightMm: 279.4 });
  });

  it("maps professional font choices to the bundled font variables", () => {
    expect(fontStack("Source Sans 3")).toContain("var(--font-source-sans-3)");
    expect(fontStack("Open Sans")).toContain("var(--font-open-sans)");
    expect(fontStack("Libre Baskerville")).toContain("var(--font-libre-baskerville)");
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

  it("uses distinct, print-safe icons for standard contacts and recognized links", () => {
    const { container } = render(<ResumeRenderer document={document} design={design} mode="print" />);

    for (const icon of ["email", "phone", "location", "website", "linkedin", "github"]) {
      expect(container.querySelector(`[data-contact-icon="${icon}"]`)).toBeTruthy();
    }
    expect(container.querySelector('[data-contact-kind="linkedin"]')?.getAttribute("href")).toBe("https://www.linkedin.com/in/example");
    expect(container.querySelector('[data-contact-kind="github"]')?.getAttribute("href")).toBe("https://github.com/example");
    expect(container.firstElementChild?.getAttribute("style")).toContain("--resume-icon-color: #244E64");
  });

  it("renders only visible nonempty flexible personal details in the header", () => {
    const detailedDocument: ResumeDocument = {
      ...document,
      personal: {
        ...document.personal,
        details: [
          { id: "work", kind: "work-authorization", label: "Work Authorization", value: "Authorized to work in Poland", visible: true },
          { id: "visa", kind: "visa-status", label: "Visa Status", value: "", visible: true },
          { id: "hidden", kind: "custom", label: "Hidden", value: "Do not render", visible: false },
        ],
      },
    };
    const { container } = render(<ResumeRenderer document={detailedDocument} design={design} />);

    expect(screen.getAllByText("Work Authorization:").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Authorized to work in Poland").length).toBeGreaterThan(0);
    expect(screen.queryByText("Visa Status:")).toBeNull();
    expect(screen.queryByText("Do not render")).toBeNull();
    expect(container.querySelector('[data-contact-kind="detail-work-authorization"] [data-contact-icon="work"]')).toBeTruthy();
  });

  it("removes all contact icons when icon display is disabled", () => {
    const withoutIcons = {
      ...design,
      header: { ...design.header, showIcons: false },
    };
    const { container } = render(<ResumeRenderer document={document} design={withoutIcons} />);
    expect(container.querySelector("[data-contact-icon]")).toBeNull();
  });

  it("can limit dashboard rendering to the complete first page", () => {
    const experience = document.sections.find((section) => section.type === "experience");
    if (!experience || experience.type !== "experience") throw new Error("Fixture experience missing");
    const longDocument: ResumeDocument = {
      ...document,
      sections: [{ ...experience, entries: Array.from({ length: 45 }, (_, index) => ({ ...experience.entries[0]!, id: `thumb-${index}` })) }],
    };

    const { container } = render(<ResumeRenderer document={longDocument} design={design} mode="thumbnail" pageLimit={1} />);
    expect(container.querySelectorAll("[data-resume-page]")).toHaveLength(1);
    expect(container.querySelector('[data-resume-page="1"]')).toBeTruthy();
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
