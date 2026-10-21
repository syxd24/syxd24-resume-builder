import { expect, test, type APIRequestContext, type Browser, type Page } from "@playwright/test";
import JSZip from "jszip";

type ResumePayload = {
  resume: {
    id: string;
    title: string;
    lockVersion: number;
    sourceImportType: "pdf" | "docx" | "txt" | null;
    content: {
      personal: {
        fullName: string;
        photo?: { storagePath: string; alt?: string };
        details: Array<{
          id: string;
          kind: string;
          label: string;
          value: string;
          visible: boolean;
        }>;
      };
    };
  };
};

type ImportPayload = ResumePayload & {
  import: { id: string; status: "completed"; resumeId: string };
};

const serverEnvironmentReady = Boolean(
  process.env.SUPABASE_URL?.trim() && process.env.SUPABASE_SECRET_KEY?.trim(),
);

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";
const tinyPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

function editorUrl(id: string): RegExp {
  return new RegExp(`/resumes/${id}(?:\\?.*)?$`);
}

async function createDocx(text: string): Promise<Buffer> {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`,
  );
  zip.folder("_rels")?.file(
    ".rels",
    `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`,
  );
  zip.folder("word")?.file(
    "document.xml",
    `<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${text
      .split("\n")
      .map((line) => `<w:p><w:r><w:t>${line}</w:t></w:r></w:p>`)
      .join("")}<w:sectPr/></w:body></w:document>`,
  );
  return zip.generateAsync({ type: "nodebuffer" });
}

async function createPdf(browser: Browser, text: string): Promise<Buffer> {
  const pdfPage = await browser.newPage();
  try {
    await pdfPage.setContent(`<main style="font: 16px Arial; white-space: pre-line">${text}</main>`);
    return await pdfPage.pdf({ format: "A4", printBackground: true });
  } finally {
    await pdfPage.close();
  }
}

async function importThroughUi(
  page: Page,
  file: { name: string; mimeType: string; buffer: Buffer },
  trackCreated: (payload: ImportPayload) => void,
): Promise<ImportPayload> {
  await page.goto("/resumes/import");
  await expect(page.getByRole("heading", { name: "Bring your experience with you" })).toBeVisible();

  const responsePromise = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return url.pathname === "/api/import" && response.request().method() === "POST";
  });
  await page.locator('input[type="file"]').setInputFiles(file);

  const response = await responsePromise;
  expect(response.status(), await response.text()).toBe(201);
  const payload = await response.json() as ImportPayload;
  trackCreated(payload);
  expect(payload.import).toMatchObject({ status: "completed", resumeId: payload.resume.id });
  await expect(page).toHaveURL(editorUrl(payload.resume.id));
  await expandPersonalDetails(page);
  await expect(page.getByLabel("Full name")).toHaveValue(payload.resume.content.personal.fullName);
  return payload;
}

async function expectPersisted(request: APIRequestContext, id: string): Promise<ResumePayload["resume"]> {
  const response = await request.get(`/api/resumes/${id}`);
  expect(response.status(), await response.text()).toBe(200);
  return ((await response.json()) as ResumePayload).resume;
}

async function expandPersonalDetails(page: Page) {
  const fullName = page.getByLabel("Full name");
  if (!(await fullName.isVisible().catch(() => false))) {
    await page.getByRole("button", { name: "Edit personal details" }).click();
  }
  await expect(fullName).toBeVisible();
}

async function downloadBytes(page: Page): Promise<{ bytes: Buffer; filename: string }> {
  const downloadPromise = page.waitForEvent("download", { timeout: 60_000 });
  await page.getByRole("button", { name: "Download PDF" }).click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return { bytes: Buffer.concat(chunks), filename: download.suggestedFilename() };
}

test.describe("live local acceptance", () => {
  test.skip(
    !serverEnvironmentReady,
    "@live requires SUPABASE_URL and the server-only SUPABASE_SECRET_KEY in the Playwright process.",
  );

  test("@live creates, persists, exports, duplicates, deletes, imports, uploads, and cleans up", async ({
    browser,
    page,
    request,
  }) => {
    test.setTimeout(180_000);

    const runId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const createdResumeIds = new Set<string>();
    const createdImportIds = new Set<string>();
    const deletedResumeIds = new Set<string>();

    try {
      await page.goto("/resumes");
      await expect(page.getByRole("heading", { name: "My Resumes" })).toBeVisible();
      await page.getByRole("button", { name: "New resume", exact: true }).click();
      const createResponsePromise = page.waitForResponse((response) =>
        new URL(response.url()).pathname === "/api/resumes"
          && response.request().method() === "POST",
        { timeout: 30_000 },
      );
      await page.getByRole("button", { name: "Start blank", exact: true }).click();
      const createResponse = await createResponsePromise;
      expect(createResponse.status(), await createResponse.text()).toBe(201);
      await expect(page).toHaveURL(new RegExp(`/resumes/${UUID}$`), { timeout: 15_000 });

      const createdId = new URL(page.url()).pathname.split("/").at(-1);
      expect(createdId).toMatch(new RegExp(`^${UUID}$`));
      if (!createdId) throw new Error("The blank resume route did not include an id.");
      createdResumeIds.add(createdId);
      await expandPersonalDetails(page);

      const resumeTitle = `Live acceptance ${runId}`;
      const fullName = `Live Candidate ${runId}`;
      const savePromise = page.waitForResponse((response) =>
        new URL(response.url()).pathname === `/api/resumes/${createdId}`
          && response.request().method() === "PATCH",
      );
      await page.getByLabel("Resume title").fill(resumeTitle);
      await page.getByLabel("Full name").fill(fullName);
      const saveResponse = await savePromise;
      expect(saveResponse.status(), await saveResponse.text()).toBe(200);
      await expect(page.getByRole("status")).toHaveText("Saved");

      await page.reload();
      await expandPersonalDetails(page);
      await expect(page.getByLabel("Resume title")).toHaveValue(resumeTitle);
      await expect(page.getByLabel("Full name")).toHaveValue(fullName);
      const persisted = await expectPersisted(request, createdId);
      expect(persisted).toMatchObject({ id: createdId, title: resumeTitle });
      expect(persisted.content.personal.fullName).toBe(fullName);

      const detailValue = `Eligible ${runId}`;
      await page.getByRole("button", { name: "Add details" }).click();
      await page.getByLabel("Detail type").selectOption("custom");
      await page.getByRole("button", { name: "Add field" }).click();
      await page.getByLabel("Field name").last().fill("Security Clearance");
      const detailSavePromise = page.waitForResponse((response) =>
        new URL(response.url()).pathname === `/api/resumes/${createdId}`
          && response.request().method() === "PATCH",
      );
      await page.getByLabel("Value").last().fill(detailValue);
      const detailSaveResponse = await detailSavePromise;
      expect(detailSaveResponse.status(), await detailSaveResponse.text()).toBe(200);
      await expect(page.getByRole("status")).toHaveText("Saved");

      await page.reload();
      await expandPersonalDetails(page);
      const customDetail = page.getByRole("article", { name: "Edit Security Clearance" });
      await expect(customDetail.getByLabel("Value")).toHaveValue(detailValue);
      await expect(page.locator('[data-render-mode="editor"]').getByText(detailValue)).toBeVisible();
      expect((await expectPersisted(request, createdId)).content.personal.details).toEqual(expect.arrayContaining([
        expect.objectContaining({ kind: "custom", label: "Security Clearance", value: detailValue, visible: true }),
      ]));

      const photoUploadPromise = page.waitForResponse((response) =>
        new URL(response.url()).pathname === `/api/resumes/${createdId}/photo`
          && response.request().method() === "POST",
      );
      const photoSavePromise = page.waitForResponse((response) =>
        new URL(response.url()).pathname === `/api/resumes/${createdId}`
          && response.request().method() === "PATCH",
      );
      await page.locator('input[type="file"][accept*="image/jpeg"]').setInputFiles({
        name: `portrait-${runId}.png`,
        mimeType: "image/png",
        buffer: tinyPng,
      });
      const photoUploadResponse = await photoUploadPromise;
      expect(photoUploadResponse.status(), await photoUploadResponse.text()).toBe(201);
      const photoSaveResponse = await photoSavePromise;
      expect(photoSaveResponse.status(), await photoSaveResponse.text()).toBe(200);
      await expect(page.getByLabel("Profile photo attached")).toBeVisible();
      await expect(page.getByRole("status")).toHaveText("Saved");

      await page.reload();
      await expect(page.getByLabel("Profile photo attached")).toBeVisible();
      const persistedWithPhoto = await expectPersisted(request, createdId);
      expect(persistedWithPhoto.content.personal.photo?.storagePath).toMatch(
        new RegExp(`^resumes/${createdId}/photo/${UUID}\\.png$`),
      );

      const exported = await downloadBytes(page);
      expect(exported.filename).toMatch(/\.pdf$/i);
      expect(exported.bytes.subarray(0, 5).toString("ascii")).toBe("%PDF-");
      expect(exported.bytes.byteLength).toBeGreaterThan(1_000);

      const duplicateResponsePromise = page.waitForResponse((response) =>
        new URL(response.url()).pathname === `/api/resumes/${createdId}/duplicate`
          && response.request().method() === "POST",
      );
      await page.getByRole("button", { name: "Resume actions" }).click();
      await page.getByRole("menuitem", { name: "Duplicate" }).click();
      const duplicateResponse = await duplicateResponsePromise;
      expect(duplicateResponse.status(), await duplicateResponse.text()).toBe(201);
      const duplicate = ((await duplicateResponse.json()) as ResumePayload).resume;
      createdResumeIds.add(duplicate.id);
      expect(duplicate.id).not.toBe(createdId);
      expect(duplicate.title).toBe(`${resumeTitle} - Copy`);
      expect(duplicate.content.personal).toEqual(persistedWithPhoto.content.personal);
      await expect(page).toHaveURL(editorUrl(duplicate.id));
      await expandPersonalDetails(page);
      await expect(page.getByLabel("Full name")).toHaveValue(fullName);

      page.once("dialog", (dialog) => void dialog.accept());
      await page.getByRole("button", { name: "Resume actions" }).click();
      await page.getByRole("menuitem", { name: "Delete" }).click();
      await expect(page).toHaveURL(/\/resumes$/);
      const deletedDuplicate = await request.get(`/api/resumes/${duplicate.id}`);
      expect(deletedDuplicate.status()).toBe(404);
      createdResumeIds.delete(duplicate.id);
      deletedResumeIds.add(duplicate.id);

      await page.goto(`/resumes/${createdId}`);
      await expandPersonalDetails(page);
      const detailDeletePromise = page.waitForResponse((response) =>
        new URL(response.url()).pathname === `/api/resumes/${createdId}`
          && response.request().method() === "PATCH",
      );
      await page.getByRole("article", { name: "Edit Security Clearance" }).getByRole("button", { name: "Remove" }).click();
      const detailDeleteResponse = await detailDeletePromise;
      expect(detailDeleteResponse.status(), await detailDeleteResponse.text()).toBe(200);
      await expect(page.getByRole("status")).toHaveText("Saved");
      await page.reload();
      await expandPersonalDetails(page);
      await expect(page.getByRole("article", { name: "Edit Security Clearance" })).toHaveCount(0);
      expect((await expectPersisted(request, createdId)).content.personal.details).not.toEqual(expect.arrayContaining([
        expect.objectContaining({ label: "Security Clearance" }),
      ]));

      const txtName = `TXT Candidate ${runId}`;
      const txtPayload = await importThroughUi(page, {
        name: `live-${runId}.txt`,
        mimeType: "text/plain",
        buffer: Buffer.from(`${txtName}\nPlatform Engineer\n\nSUMMARY\nReliable TXT import.\n\nSKILLS\nTypeScript, PostgreSQL`),
      }, (payload) => {
        createdResumeIds.add(payload.resume.id);
        createdImportIds.add(payload.import.id);
      });
      expect(txtPayload.resume.sourceImportType).toBe("txt");
      expect((await expectPersisted(request, txtPayload.resume.id)).content.personal.fullName).toBe(txtName);

      const pdfName = `PDF Candidate ${runId}`;
      const pdfBuffer = await createPdf(
        browser,
        `${pdfName}\nSystems Engineer\n\nSUMMARY\nReliable PDF import.\n\nSKILLS\nPlaywright, Supabase`,
      );
      const pdfPayload = await importThroughUi(page, {
        name: `live-${runId}.pdf`,
        mimeType: "application/pdf",
        buffer: pdfBuffer,
      }, (payload) => {
        createdResumeIds.add(payload.resume.id);
        createdImportIds.add(payload.import.id);
      });
      expect(pdfPayload.resume.sourceImportType).toBe("pdf");
      expect((await expectPersisted(request, pdfPayload.resume.id)).content.personal.fullName).toBe(pdfName);

      const docxName = `DOCX Candidate ${runId}`;
      const docxPayload = await importThroughUi(page, {
        name: `live-${runId}.docx`,
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        buffer: await createDocx(
          `${docxName}\nApplication Engineer\n\nSUMMARY\nReliable DOCX import.\n\nSKILLS\nNext.js, TypeScript`,
        ),
      }, (payload) => {
        createdResumeIds.add(payload.resume.id);
        createdImportIds.add(payload.import.id);
      });
      expect(docxPayload.resume.sourceImportType).toBe("docx");
      expect((await expectPersisted(request, docxPayload.resume.id)).content.personal.fullName).toBe(docxName);

      for (const importId of [...createdImportIds]) {
        const response = await request.delete(`/api/import/${importId}`);
        expect(response.status(), await response.text()).toBe(204);
        createdImportIds.delete(importId);
      }
      for (const resumeId of [...createdResumeIds]) {
        const response = await request.delete(`/api/resumes/${resumeId}`);
        expect(response.status(), await response.text()).toBe(204);
        createdResumeIds.delete(resumeId);
        deletedResumeIds.add(resumeId);
      }
      for (const resumeId of deletedResumeIds) {
        expect((await request.get(`/api/resumes/${resumeId}`)).status()).toBe(404);
      }
    } finally {
      for (const importId of createdImportIds) {
        await request.delete(`/api/import/${importId}`).catch(() => undefined);
      }
      for (const resumeId of createdResumeIds) {
        await request.delete(`/api/resumes/${resumeId}`).catch(() => undefined);
      }
    }
  });
});
