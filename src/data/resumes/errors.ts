import type { ResumeRecord } from "./types";

export class ResumeDataError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "ResumeDataError";
  }
}

export class ResumeNotFoundError extends ResumeDataError {
  constructor(id: string) {
    super(`Resume ${id} was not found.`);
    this.name = "ResumeNotFoundError";
  }
}

export class ResumeConflictError extends ResumeDataError {
  constructor(public readonly current: ResumeRecord) {
    super(`Resume ${current.id} changed since it was loaded.`);
    this.name = "ResumeConflictError";
  }
}
