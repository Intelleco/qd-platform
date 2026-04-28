import type { ContentfulStatusCode } from "hono/utils/http-status";

export type ErrorCode =
  | "bad_request"
  | "invalid_query"
  | "not_found"
  | "method_not_allowed"
  | "corpus_unavailable"
  | "internal_error";

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: ContentfulStatusCode;
  readonly publicMessage: string;

  constructor(code: ErrorCode, status: ContentfulStatusCode, publicMessage: string) {
    super(publicMessage);
    this.name = "AppError";
    this.code = code;
    this.status = status;
    this.publicMessage = publicMessage;
  }
}

export function badRequest(message: string): AppError {
  return new AppError("bad_request", 400, message);
}

export function invalidQuery(message: string): AppError {
  return new AppError("invalid_query", 400, message);
}

export function notFound(message = "Not found."): AppError {
  return new AppError("not_found", 404, message);
}

export function methodNotAllowed(allow: readonly string[]): AppError {
  return new AppError("method_not_allowed", 405, `Method not allowed. Allowed methods: ${allow.join(", ")}.`);
}

export function corpusUnavailable(): AppError {
  return new AppError("corpus_unavailable", 503, "Question corpus is unavailable.");
}

export function normalizeError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }
  return new AppError("internal_error", 500, "Internal server error.");
}
