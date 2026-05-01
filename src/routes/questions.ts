import type { Hono } from "hono";
import { filterQuestions, parseQuestionSearch, sampleQuestions } from "../lib/filters";
import { methodNotAllowed } from "../lib/errors";
import { success } from "../lib/response";
import type { AppEnv } from "../lib/types";

export function registerQuestionRoutes(app: Hono<AppEnv>): void {
  app.get("/v1/questions", async (c) => {
    const corpus = c.get("corpusReader");
    const catalog = await corpus.readCatalog();
    const args = parseQuestionSearch(new URL(c.req.url).searchParams, catalog);
    const records = await corpus.readTest(args.test);
    const filtered = filterQuestions(records, args);
    const items = sampleQuestions(filtered, args.limit, c.get("rng"));

    c.header("Cache-Control", "no-store");
    return success(
      c,
      { items },
      {
        requested: args.limit,
        returned: items.length,
        short: items.length < args.limit
      }
    );
  });

  app.all("/v1/questions", (c) => {
    throw methodNotAllowed(["GET", "OPTIONS"]);
  });
}
