import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { AppContext } from "./types";

export interface SuccessEnvelope<TData> {
  ok: true;
  data: TData;
  meta: Record<string, unknown>;
}

export interface ErrorEnvelope {
  ok: false;
  error: {
    code: string;
    message: string;
  };
  meta: {
    request_id: string;
  };
}

export function createRequestId(): string {
  return `req_${crypto.randomUUID().replaceAll("-", "")}`;
}

export function applyBaseHeaders(c: AppContext): void {
  c.header("x-qd-request-id", c.get("requestId"));
  c.header("x-content-type-options", "nosniff");
  c.header("referrer-policy", "no-referrer");
}

export function success<TData>(
  c: AppContext,
  data: TData,
  meta: Record<string, unknown> = {},
  status: ContentfulStatusCode = 200
) {
  const body: SuccessEnvelope<TData> = {
    ok: true,
    data,
    meta: {
      request_id: c.get("requestId"),
      ...meta
    }
  };
  return c.json(body, status);
}

export function failure(
  c: AppContext,
  code: string,
  message: string,
  status: ContentfulStatusCode,
  headers?: Record<string, string>
) {
  for (const [key, value] of Object.entries(headers ?? {})) {
    c.header(key, value);
  }

  const body: ErrorEnvelope = {
    ok: false,
    error: { code, message },
    meta: { request_id: c.get("requestId") }
  };
  return c.json(body, status);
}
