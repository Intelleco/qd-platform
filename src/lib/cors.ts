import type { MiddlewareHandler } from "hono";
import { AppError } from "./errors";
import { success } from "./response";
import type { AppEnv } from "./types";

const CORS_METHODS = "GET, OPTIONS";
const CORS_HEADERS = "content-type, authorization";

export function parseAllowedOrigins(value: string | undefined): readonly string[] {
  return (value ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

export function corsMiddleware(overrideOrigins?: readonly string[]): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const requestOrigin = c.req.header("Origin");
    const allowedOrigins = new Set(overrideOrigins ?? parseAllowedOrigins(c.env.QD_ALLOWED_ORIGINS));

    if (requestOrigin !== undefined && allowedOrigins.has(requestOrigin)) {
      c.header("access-control-allow-origin", requestOrigin);
      c.header("vary", "Origin");
      c.header("access-control-allow-methods", CORS_METHODS);
      c.header("access-control-allow-headers", CORS_HEADERS);
      c.header("access-control-max-age", "86400");
    }

    if (c.req.method === "OPTIONS") {
      c.header("Cache-Control", "no-store");
      if (requestOrigin !== undefined && !allowedOrigins.has(requestOrigin)) {
        throw new AppError("bad_request", 400, "Origin is not allowed.");
      }
      return success(c, { status: "ok" });
    }

    await next();
  };
}

