import type { Hono } from "hono";
import { methodNotAllowed } from "../lib/errors";
import { success } from "../lib/response";
import type { AppEnv } from "../lib/types";

export function registerHealthRoutes(app: Hono<AppEnv>): void {
  app.get("/v1/health", (c) => {
    c.header("Cache-Control", "no-store");
    return success(c, { status: "ok" });
  });

  app.all("/v1/health", (c) => {
    throw methodNotAllowed(["GET", "OPTIONS"]);
  });
}

