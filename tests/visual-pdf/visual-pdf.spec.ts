import { createRequire } from "node:module";
import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { expect, test, type Page } from "@playwright/test";

import type { ResumeRecord } from "../../src/data/resumes/types";
import { resumeDesignSchema, resumeDocumentSchema } from "../../src/domain/resume";

const fixtureRoot = path.resolve("fixtures");
const resumeDocument = resumeDocumentSchema.parse(JSON.parse(readFileSync(path.join(fixtureRoot, "golden-resume.json"), "utf8")));
const design = resumeDesignSchema.parse(JSON.parse(readFileSync(path.join(fixtureRoot, "default-design.json"), "utf8")));
const resumeId = "00000000-0000-4000-8000-000000000001";
const outputDir = path.resolve("test-results/visual-pdf");
const require = createRequire(import.meta.url);
const pdfjs = require("pdf-parse/lib/pdf.js/v1.10.100/build/pdf.js") as {
  getDocument(data: Uint8Array): Promise<{
    numPages: number;
    getPage(pageNumber: number): Promise<{
      view: [number, number, number, number];
      getAnnotations(): Promise<Array<{ url?: string }>>;
      getTextContent(): Promise<{ items: Array<{ str?: string }> }>;
    }>;
  }>;
};

async function inspectPdf(pdfPath: string) {
  const bytes = readFileSync(pdfPath);
  const pdf = await pdfjs.getDocument(new Uint8Array(bytes));
  const firstPage = await pdf.getPage(1);
  const text = (await firstPage.getTextContent()).items.map((item) => item.str ?? "").join(" ");
  const links = (await firstPage.getAnnotations()).flatMap((annotation) => annotation.url ? [annotation.url] : []);
  return {
    pages: pdf.numPages,
    width: firstPage.view[2] - firstPage.view[0],
    height: firstPage.view[3] - firstPage.view[1],
    text,
    links,
    tagged: bytes.toString("latin1").includes("/StructTreeRoot") && bytes.toString("latin1").includes("/MarkInfo"),
  };
}

function record(title: string, updatedAt: string, pageFormat: "A4" | "Letter" = "A4"): ResumeRecord {
  const recordDesign = { ...design, document: { ...design.document, pageFormat } };
  return {
    id: title === "Resume Germany" ? resumeId : "00000000-0000-4000-8000-000000000002",
    title,
    content: resumeDocument,
    design: recordDesign,
    language: recordDesign.document.language,
    pageFormat,
    sortOrder: 0,
    sourceImportPath: null,
    sourceImportType: null,
    lockVersion: 1,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt,
  };
}

async function makeStable(page: Page) {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-delay: 0s !important;
        animation-duration: 0s !important;
        caret-color: transparent !important;
        scroll-behavior: auto !important;
        transition-delay: 0s !important;
        transition-duration: 0s !important;
      }
      nextjs-portal { display: none !important; }
    `,
  });
  await page.evaluate(async () => { await document.fonts.ready; });
}

async function expectNoDocumentOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}

async function openFixtureEditor(page: Page) {
  await page.route(`**/api/resumes/${resumeId}`, async (route) => {
    if (route.request().method() !== "PATCH") return route.continue();
    const body = route.request().postDataJSON() as { patch: Partial<ResumeRecord> };
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ resume: { ...record("Golden QA Resume", "2026-01-02T00:00:00.000Z"), ...body.patch, lockVersion: 2 } }),
    });
  });
  await page.goto("/__qa/visual-pdf?view=editor");
  await expect(page.getByRole("button", { name: "Edit personal details" })).toBeVisible();
  await makeStable(page);
}

test("library visual at 1440x900 uses two real resume thumbnails", async ({ page }) => {
  await page.route("**/api/resumes", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        resumes: [
          record("Resume Germany", "2026-01-03T00:00:00.000Z"),
          record("Resume Netherlands", "2026-01-02T00:00:00.000Z", "Letter"),
        ],
      }),
    });
  });
  await page.goto("/resumes");
  await expect(page.getByRole("article", { name: "Resume Germany" })).toBeVisible();
  await expect(page.getByRole("article", { name: "Resume Netherlands" })).toBeVisible();
  await makeStable(page);
  await expectNoDocumentOverflow(page);

  await expect(page).toHaveScreenshot("library-1440x900.png", { animations: "disabled" });
});

test("dashboard thumbnail fits one complete first page without cropping", async ({ page }) => {
  await page.route("**/api/resumes", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ resumes: [record("Resume Germany", "2026-01-03T00:00:00.000Z")] }),
    });
  });
  await page.goto("/resumes");
  const thumbnail = page.locator('[data-resume-thumbnail="true"]');
  const fittedPage = thumbnail.locator('[data-thumbnail-page="true"]');
  await expect(thumbnail.locator("[data-resume-page]")).toHaveCount(1);
  await expect.poll(async () => {
    const viewportBox = await thumbnail.boundingBox();
    const pageBox = await fittedPage.boundingBox();
    if (!viewportBox || !pageBox) return false;
    return pageBox.x >= viewportBox.x
      && pageBox.y >= viewportBox.y
      && pageBox.x + pageBox.width <= viewportBox.x + viewportBox.width + 0.5
      && pageBox.y + pageBox.height <= viewportBox.y + viewportBox.height + 0.5;
  }).toBe(true);
  mkdirSync(outputDir, { recursive: true });
  await page.screenshot({ path: path.join(outputDir, "dashboard-thumbnail-fit.png") });
});

test("Customize keeps settings close to a usable preview", async ({ page }) => {
  await page.setViewportSize({ width: 1900, height: 900 });
  await openFixtureEditor(page);
  await page.getByRole("tab", { name: "Customize" }).click();
  const settings = page.locator('[data-customize-settings="true"]');
  const preview = page.locator('[data-preview-scale="true"]');
  await expect(settings).toBeVisible();
  const settingsBox = await settings.boundingBox();
  const previewBox = await preview.boundingBox();
  expect(settingsBox).not.toBeNull();
  expect(previewBox).not.toBeNull();
  expect(previewBox!.x - (settingsBox!.x + settingsBox!.width)).toBeLessThan(100);
  expect(previewBox!.width).toBeGreaterThan(700);
  mkdirSync(outputDir, { recursive: true });
  await page.screenshot({ path: path.join(outputDir, "customize-layout-gap.png") });

  for (const viewport of [{ width: 1024, height: 768 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await expectNoDocumentOverflow(page);
  }
});

test("selected resume font matches between editor preview and PDF print source", async ({ page }) => {
  await openFixtureEditor(page);
  await page.getByRole("tab", { name: "Customize" }).click();
  await page.getByRole("button", { name: "Font", exact: true }).click();
  await page.getByLabel("Body font").selectOption("Source Sans 3");
  await page.evaluate(async () => { await document.fonts.ready; });
  const editorFamily = await page.locator('[data-render-mode="editor"]').evaluate((element) => getComputedStyle(element).fontFamily);
  expect(editorFamily).toContain("Source Sans 3");

  await page.goto("/__qa/visual-pdf?view=golden-print&font=Source%20Sans%203");
  await expect(page.locator('[data-qa-ready="true"]')).toBeVisible();
  await page.evaluate(async () => { await document.fonts.ready; });
  const printFamily = await page.locator('[data-render-mode="print"]').evaluate((element) => getComputedStyle(element).fontFamily);
  expect(printFamily).toBe(editorFamily);

  mkdirSync(outputDir, { recursive: true });
  const pdfPath = path.join(outputDir, "source-sans-3.pdf");
  await page.emulateMedia({ media: "print" });
  await page.pdf({ path: pdfPath, printBackground: true, preferCSSPageSize: true, displayHeaderFooter: false });
  expect((await inspectPdf(pdfPath)).text).toContain("Alex Morgan");
});

test("library remains usable at a mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/resumes", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ resumes: [record("Resume Germany", "2026-01-03T00:00:00.000Z")] }),
    });
  });
  await page.goto("/resumes");
  await expect(page.getByRole("heading", { name: "My Resumes" })).toBeVisible();
  await expect(page.getByRole("button", { name: "New resume", exact: true })).toBeVisible();
  await makeStable(page);
  await expectNoDocumentOverflow(page);
  await expect(page).toHaveScreenshot("library-390x844.png", { animations: "disabled" });
});

test("content editor visual with expanded experience", async ({ page }) => {
  await openFixtureEditor(page);
  await page.getByRole("button", { name: /^PROFESSIONAL EXPERIENCE$/i }).click();
  await expect(page.getByRole("region", { name: "content controls" }).getByText("Junior Software Developer", { exact: true })).toBeVisible();

  await expect(page).toHaveScreenshot("content-expanded-experience-1440x900.png", { animations: "disabled" });
});

test("editor adapts without document overflow at tablet and mobile widths", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await openFixtureEditor(page);
  await expectNoDocumentOverflow(page);
  await expect(page.getByRole("button", { name: "Download PDF" })).toBeVisible();
  await expect(page).toHaveScreenshot("editor-1024x768.png", { animations: "disabled" });

  await page.setViewportSize({ width: 390, height: 844 });
  await expectNoDocumentOverflow(page);
  await expect(page.getByRole("tab", { name: "Customize" })).toBeVisible();
  await page.getByRole("tab", { name: "Customize" }).click();
  await expect(page.getByRole("button", { name: "Document", exact: true })).toBeVisible();
  await expectNoDocumentOverflow(page);
});

test("Add Content modal visual contains every supported section", async ({ page }) => {
  await openFixtureEditor(page);
  await page.getByRole("button", { name: /Add content/i }).first().click();
  const dialog = page.getByRole("dialog", { name: "Add content" });
  await expect(dialog).toBeVisible();
  for (const label of [
    "Education", "Professional Experience", "Skills", "Languages", "Certificates", "Interests", "Projects",
    "Courses", "Awards", "Organisations", "Publications", "References", "Declaration", "Custom",
  ]) {
    await expect(dialog.getByRole("button", { name: new RegExp(`^${label}`) })).toBeVisible();
  }

  await expect(page).toHaveScreenshot("add-content-1440x900.png", { animations: "disabled" });
});

for (const category of ["Document", "Font Size", "Colors"] as const) {
  test(`Customize ${category} visual`, async ({ page }) => {
    await openFixtureEditor(page);
    await page.getByRole("tab", { name: "Customize" }).click();
    await page.getByRole("button", { name: category, exact: true }).click();
    const settingsHeading = category === "Document" ? "Document settings" : category === "Font Size" ? "Font size" : category;
    await expect(page.getByRole("heading", { name: settingsHeading, exact: true, level: 2 })).toBeVisible();

    await expect(page).toHaveScreenshot(`customize-${category.toLowerCase().replace(" ", "-")}-1440x900.png`, { animations: "disabled" });
  });
}

test("golden resume visual and links", async ({ page }) => {
  await page.goto("/__qa/visual-pdf?view=golden");
  await expect(page.locator('[data-qa-ready="true"]')).toBeVisible();
  await makeStable(page);
  await expect(page.getByRole("heading", { name: "Alex Morgan" })).toBeVisible();
  await expect(page.getByRole("link", { name: /GitHub/i })).toHaveAttribute("href", "https://github.com/example");
  for (const icon of ["email", "phone", "location", "website", "linkedin", "github", "work"] as const) {
    await expect(page.locator(`[data-contact-icon="${icon}"]`).first()).toBeVisible();
  }
  await expect(page.getByText(/Work Authorization:/)).toBeVisible();
  await expect(page.getByText(/Authorized to work in the EU/)).toBeVisible();
  await expect(page.locator("[data-resume-page]")).toHaveCount(1);

  await expect(page).toHaveScreenshot("golden-resume-1440x900.png", { animations: "disabled", fullPage: true });
});

test("custom personal details update the preview and respect visibility", async ({ page }) => {
  await openFixtureEditor(page);
  await page.getByRole("button", { name: "Edit personal details" }).click();
  await page.getByRole("button", { name: "Add details" }).click();
  await page.getByLabel("Detail type").selectOption("custom");
  await page.getByRole("button", { name: "Add field" }).click();

  await page.getByLabel("Field name").last().fill("Security Clearance");
  await page.getByLabel("Value").last().fill("Eligible");
  await expect(page.locator('[data-render-mode="editor"]').getByText("Security Clearance:")).toBeVisible();
  await expect(page.locator('[data-render-mode="editor"]').getByText("Eligible")).toBeVisible();

  const customDetail = page.getByRole("article", { name: "Edit Security Clearance" });
  await customDetail.getByRole("checkbox", { name: "Show" }).uncheck();
  await expect(page.locator('[data-render-mode="editor"]').getByText("Security Clearance:")).toHaveCount(0);
});

test("stress fixture renders 3+ pages without DOM overflow or duplicate entries", async ({ page }) => {
  await page.goto("/__qa/visual-pdf?view=stress");
  await expect(page.locator('[data-qa-ready="true"]')).toBeVisible();
  await makeStable(page);
  const pages = page.locator("[data-resume-page]");
  expect(await pages.count()).toBeGreaterThanOrEqual(3);

  const engineerHeadings = await page.getByText(/^Platform Engineer \d+$/).allTextContents();
  expect(engineerHeadings).toHaveLength(48);
  expect(new Set(engineerHeadings).size).toBe(48);

  const overflow = await pages.evaluateAll((pageNodes) => pageNodes.map((pageNode) => {
    const pageRect = pageNode.getBoundingClientRect();
    const escaped = [...pageNode.querySelectorAll<HTMLElement>("h2, section, footer")]
      .filter((element) => element.getClientRects().length > 0)
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.top < pageRect.top - 0.5 || rect.bottom > pageRect.bottom + 0.5;
      })
      .map((element) => ({ tag: element.tagName, text: element.textContent?.trim().slice(0, 80) }));
    return { page: pageNode.getAttribute("data-resume-page"), escaped };
  }));
  expect(overflow).toEqual(overflow.map((result) => ({ ...result, escaped: [] })));

  await expect(page).toHaveScreenshot("stress-resume-1440x900.png", { animations: "disabled", fullPage: true });
});

test("generated PDFs have selectable source text, links in the source tree, and exact page geometry", async ({ page }) => {
  mkdirSync(outputDir, { recursive: true });
  const variants = [
    { format: "A4", width: 595, height: 842 },
    { format: "Letter", width: 612, height: 792 },
  ] as const;

  for (const variant of variants) {
    await page.goto(`/__qa/visual-pdf?view=golden-print&format=${variant.format}`);
    await expect(page.locator('[data-qa-ready="true"]')).toBeVisible();
    await makeStable(page);
    await expect(page.getByRole("link", { name: /GitHub/i })).toHaveAttribute("href", "https://github.com/example");
    const previewPages = await page.locator("[data-resume-page]").count();
    const pdfPath = path.join(outputDir, `golden-${variant.format.toLowerCase()}.pdf`);
    await page.emulateMedia({ media: "print" });
    await page.pdf({ path: pdfPath, printBackground: true, preferCSSPageSize: true, displayHeaderFooter: false, tagged: true });
    const info = await inspectPdf(pdfPath);
    expect(info.pages).toBe(previewPages);
    expect(info.width).toBeCloseTo(variant.width, 0);
    expect(info.height).toBeCloseTo(variant.height, 0);
    expect(info.tagged).toBe(true);
    const compactText = info.text.replace(/\s+/g, "");
    expect(compactText).toContain("AlexMorgan");
    expect(compactText).toContain("PROFESSIONALEXPERIENCE");
    expect(compactText).toContain("WorkAuthorization:");
    expect(compactText).toContain("AuthorizedtoworkintheEU");
    expect(info.links).toContain("https://github.com/example");
  }

  await page.goto("/__qa/visual-pdf?view=stress-print");
  await expect(page.locator('[data-qa-ready="true"]')).toBeVisible();
  await makeStable(page);
  const previewPages = await page.locator("[data-resume-page]").count();
  const stressPath = path.join(outputDir, "stress-a4.pdf");
  await page.emulateMedia({ media: "print" });
  await page.pdf({ path: stressPath, printBackground: true, preferCSSPageSize: true, displayHeaderFooter: false, tagged: true });
  const stressInfo = await inspectPdf(stressPath);
  expect(stressInfo.pages).toBe(previewPages);
});
