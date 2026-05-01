import type { Hono } from "hono";
import { methodNotAllowed } from "../lib/errors";
import { success } from "../lib/response";
import type { AppEnv } from "../lib/types";
import { buildPlatformSpec } from "../spec/data";
import { renderSpecMarkdown } from "../spec/markdown";

export function registerSpecRoutes(app: Hono<AppEnv>): void {
  app.get("/v1/spec", async (c) => {
    const catalog = await c.get("corpusReader").readCatalog();
    c.header("Cache-Control", "public, max-age=60");
    return success(c, buildPlatformSpec(catalog));
  });

  app.get("/v1/spec.md", async (c) => {
    const catalog = await c.get("corpusReader").readCatalog();
    c.header("Cache-Control", "public, max-age=60");
    return c.text(renderSpecMarkdown(buildPlatformSpec(catalog)));
  });

  app.all("/v1/spec", (c) => {
    throw methodNotAllowed(["GET", "OPTIONS"]);
  });

  app.all("/v1/spec.md", (c) => {
    throw methodNotAllowed(["GET", "OPTIONS"]);
  });
}
