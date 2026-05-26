import type { ErrorCode } from "./errorCodes";

export class RvcError extends Error {
  public readonly code: ErrorCode;
  public readonly cause?: unknown;

  constructor(code: ErrorCode, message: string, cause?: unknown) {
    super(message);

    this.code = code;
    this.cause = cause;
    this.name = "WebRvcError";

    Object.setPrototypeOf(this, RvcError.prototype);
  }
}
