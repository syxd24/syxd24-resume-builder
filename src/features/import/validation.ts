import { importMimeTypes, type ResumeImportType } from "@/data/imports/types";
import type { ImportSource } from "@/server/api/contracts";

import { ResumeImportError } from "./errors";

export const MAX_IMPORT_BYTES = 15 * 1024 * 1024;

const extensionToType: Record<string, ResumeImportType> = { pdf: "pdf", docx: "docx", txt: "txt" };

export function sanitizeImportFilename(filename: string): string {
  const leaf = filename.replace(/\\/g, "/").split("/").at(-1) ?? "resume";
  const sanitized = leaf
    .normalize("NFKC")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/[^\p{L}\p{N}._ -]+/gu, "_")
    .replace(/\.{2,}/g, ".")
    .trim()
    .slice(0, 180);
  return sanitized && sanitized !== "." ? sanitized : "resume";
}

export function sourceTypeFromName(filename: string): ResumeImportType | undefined {
  const extension = filename.toLowerCase().split(".").at(-1) ?? "";
  return extensionToType[extension];
}

function hasPdfSignature(bytes: Uint8Array): boolean {
  return bytes.length >= 5 && new TextDecoder("ascii").decode(bytes.slice(0, 5)) === "%PDF-";
}

function hasZipSignature(bytes: Uint8Array): boolean {
  return bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
}

function looksLikeText(bytes: Uint8Array): boolean {
  if (bytes.some((byte) => byte === 0)) return false;
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(bytes.slice(0, Math.min(bytes.length, 8192)));
    return true;
  } catch {
    return false;
  }
}

export function validateImportSource(source: ImportSource, bytes: Uint8Array): ResumeImportType {
  if (source.size !== bytes.byteLength || bytes.byteLength === 0 || bytes.byteLength > MAX_IMPORT_BYTES) {
    throw new ResumeImportError("The selected file is empty, incomplete, or larger than 15 MiB.", "INVALID_FILE");
  }
  const type = sourceTypeFromName(source.originalName);
  if (!type) throw new ResumeImportError("Choose a PDF, DOCX, or TXT resume.", "UNSUPPORTED_FILE");
  if (source.mimeType !== importMimeTypes[type]) {
    throw new ResumeImportError("The file extension and MIME type do not match.", "INVALID_FILE");
  }
  const signatureMatches = type === "pdf" ? hasPdfSignature(bytes) : type === "docx" ? hasZipSignature(bytes) : looksLikeText(bytes);
  if (!signatureMatches) throw new ResumeImportError(`The selected ${type.toUpperCase()} file does not contain valid ${type.toUpperCase()} data.`, "INVALID_FILE");
  return type;
}

export function buildPrivateImportPath(filename: string, importKey = crypto.randomUUID()): string {
  return `imports/pending/${importKey}/${sanitizeImportFilename(filename)}`;
}

export function titleFromFilename(filename: string): string {
  return sanitizeImportFilename(filename).replace(/\.(pdf|docx|txt)$/i, "").trim() || "Imported Resume";
}
