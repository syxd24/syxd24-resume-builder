import mammoth from "mammoth";
import pdfParse from "pdf-parse/lib/pdf-parse.js";

import type { ResumeImportType } from "@/data/imports";
import type { ImportExtraction } from "@/server/import-export/contracts";

import { classifyResumeText } from "./classifier";
import { ResumeImportError } from "./errors";

async function extractPdf(bytes: Uint8Array): Promise<{ text: string; warnings: string[] }> {
  try {
    const parsed = await pdfParse(Buffer.from(bytes));
    const text = parsed.text.trim();
    if (text.length < 20) {
      throw new ResumeImportError("This PDF has no usable embedded text. Image-only/scanned PDFs require OCR, which is not enabled.", "NO_TEXT");
    }
    return { text, warnings: parsed.numpages > 1 ? [`Imported text from ${parsed.numpages} PDF pages.`] : [] };
  } catch (error) {
    if (error instanceof ResumeImportError) throw error;
    throw new ResumeImportError("The PDF could not be read. The private source file was retained so you can retry.", "PARSE_FAILED", { cause: error });
  }
}

async function extractDocx(bytes: Uint8Array): Promise<{ text: string; warnings: string[] }> {
  try {
    const result = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
    const text = result.value.trim();
    if (!text) throw new ResumeImportError("The DOCX did not contain readable document text.", "NO_TEXT");
    return { text, warnings: result.messages.map((message) => message.message) };
  } catch (error) {
    if (error instanceof ResumeImportError) throw error;
    throw new ResumeImportError("The DOCX could not be read. The private source file was retained so you can retry.", "PARSE_FAILED", { cause: error });
  }
}

function extractTxt(bytes: Uint8Array): { text: string; warnings: string[] } {
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes).trim();
    if (!text) throw new ResumeImportError("The text file is empty.", "NO_TEXT");
    return { text, warnings: [] };
  } catch (error) {
    if (error instanceof ResumeImportError) throw error;
    throw new ResumeImportError("The TXT file must use UTF-8 text encoding.", "PARSE_FAILED", { cause: error });
  }
}

export async function extractResume(type: ResumeImportType, bytes: Uint8Array): Promise<ImportExtraction> {
  const extracted = type === "pdf" ? await extractPdf(bytes) : type === "docx" ? await extractDocx(bytes) : extractTxt(bytes);
  const classified = classifyResumeText(extracted.text);
  return { ...classified, warnings: [...extracted.warnings, ...classified.warnings] };
}
