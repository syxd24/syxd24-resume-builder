import JSZip from "jszip";
import { describe, expect, it, vi } from "vitest";

vi.mock("pdf-parse/lib/pdf-parse.js", () => ({
  default: vi.fn(async () => ({ text: "", numpages: 1, numrender: 1, info: {}, metadata: null, version: "test" })),
}));

import { importMimeTypes } from "@/data/imports/types";
import { classifyResumeText } from "@/features/import/classifier";
import { ResumeImportError } from "@/features/import/errors";
import { extractResume } from "@/features/import/extractor";
import { sanitizeImportFilename, validateImportSource } from "@/features/import/validation";

async function minimalDocx(text: string): Promise<Uint8Array> {
  const zip = new JSZip();
  zip.file("[Content_Types].xml", `<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`);
  zip.folder("_rels")?.file(".rels", `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`);
  zip.folder("word")?.file("document.xml", `<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${text.split("\n").map((line) => `<w:p><w:r><w:t>${line}</w:t></w:r></w:p>`).join("")}<w:sectPr/></w:body></w:document>`);
  return zip.generateAsync({ type: "uint8array" });
}

describe("resume import", () => {
  it("validates extension, MIME, size, and safe storage names", () => {
    const bytes = new TextEncoder().encode("Alex Morgan\nSummary\nExperienced engineer");
    expect(validateImportSource({ originalName: "resume.txt", mimeType: importMimeTypes.txt, size: bytes.length }, bytes)).toBe("txt");
    expect(sanitizeImportFilename("../private\\Alex:Resume.txt")).toBe("Alex_Resume.txt");
    expect(() => validateImportSource({ originalName: "resume.pdf", mimeType: importMimeTypes.pdf, size: bytes.length }, bytes)).toThrow(ResumeImportError);
  });

  it("classifies supported headings and preserves ambiguous text", () => {
    const result = classifyResumeText(`Alex Morgan\nBackend Engineer\nalex@example.com\nNeeds manual review\n\nSUMMARY\nBuilds reliable systems.\n\nSKILLS\nTypeScript, PostgreSQL\n\nEXPERIENCE\nEngineer\nExample Ltd\nBuilt APIs.`);
    expect(result.document.personal).toMatchObject({ fullName: "Alex Morgan", jobTitle: "Backend Engineer", email: "alex@example.com" });
    expect(result.document.sections.map((section) => section.type)).toEqual(["custom", "summary", "skills", "experience"]);
    expect(result.unclassifiedText).toEqual(["Needs manual review"]);
  });

  it("extracts TXT into a canonical editable document", async () => {
    const bytes = new TextEncoder().encode("Alex Morgan\nEngineer\n\nSUMMARY\nReliable engineer.\n\nEDUCATION\nBSc Computing\nExample University");
    const result = await extractResume("txt", bytes);
    expect(result.document.personal.fullName).toBe("Alex Morgan");
    expect(result.document.sections.some((section) => section.type === "education")).toBe(true);
  });

  it("extracts real DOCX paragraph text without a paid service", async () => {
    const bytes = await minimalDocx("Alex Morgan\nEngineer\nSUMMARY\nDOCX content preserved.");
    const result = await extractResume("docx", bytes);
    expect(result.document.personal.fullName).toBe("Alex Morgan");
    expect(result.document.sections[0]?.type).toBe("summary");
  });

  it("reports image-only PDFs explicitly instead of inventing content", async () => {
    const bytes = new TextEncoder().encode("%PDF-1.7\nmock scanned payload");
    await expect(extractResume("pdf", bytes)).rejects.toMatchObject({ code: "NO_TEXT" });
  });
});
