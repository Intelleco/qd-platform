import type { Hono } from "hono";
import { methodNotAllowed, notFound } from "../lib/errors";
import { chooseRandom } from "../lib/filters";
import { findItemMatches } from "../lib/corpus";
import { success } from "../lib/response";
import type { AppEnv } from "../lib/types";

export function registerItemRoutes(app: Hono<AppEnv>): void {
  app.get("/v1/items/:item_id", async (c) => {
    const itemId = c.req.param("item_id");
    const matches = await findItemMatches(c.get("corpusReader"), itemId);
    const selected = chooseRandom(matches, c.get("rng"));

    if (selected === undefined) {
      throw notFound("Question item was not found.");
    }

    c.header("Cache-Control", "no-store");
    return success(
      c,
      { item: selected.item },
      {
        match_count: matches.length,
        selected_test: selected.test
      }
    );
  });

  app.all("/v1/items/:item_id", (c) => {
    throw methodNotAllowed(["GET", "OPTIONS"]);
  });
}

