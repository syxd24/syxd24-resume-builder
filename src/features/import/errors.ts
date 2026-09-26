export class ResumeImportError extends Error {
  importId?: string;
  constructor(
    message: string,
    public readonly code: "INVALID_FILE" | "UNSUPPORTED_FILE" | "NO_TEXT" | "PARSE_FAILED" | "STORAGE_FAILED" | "NOT_FOUND",
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "ResumeImportError";
  }
}
