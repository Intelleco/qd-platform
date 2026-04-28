import { Hono } from "hono";
import { corsMiddleware } from "./lib/cors";
import { normalizeError, notFound } from "./lib/errors";
import { R2CorpusReader } from "./lib/corpus";
import { applyBaseHeaders, createRequestId, failure } from "./lib/response";
import type { AppEnv, CorpusReader, Rng } from "./lib/types";
import { registerHealthRoutes } from "./routes/health";
import { registerItemRoutes } from "./routes/items";
import { registerQuestionRoutes } from "./routes/questions";
import { registerSpecRoutes } from "./routes/spec";

export interface CreateAppOptions {
  corpusReader?: CorpusReader;
  rng?: Rng;
  allowedOrigins?: readonly string[];
}

export function createApp(options: CreateAppOptions = {}): Hono<AppEnv> {
  const app = new Hono<AppEnv>();

  app.use("*", async (c, next) => {
    c.set("requestId", createRequestId());
    c.set("rng", options.rng ?? Math.random);
    applyBaseHeaders(c);
    await next();
  });

  app.use("*", corsMiddleware(options.allowedOrigins));

  app.use("*", async (c, next) => {
    c.set("corpusReader", options.corpusReader ?? new R2CorpusReader(c.env.QD_CORPUS));
    await next();
  });

  registerHealthRoutes(app);
  registerQuestionRoutes(app);
  registerItemRoutes(app);
  registerSpecRoutes(app);

  app.notFound((c) => {
    const error = notFound();
    return failure(c, error.code, error.publicMessage, error.status);
  });

  app.onError((error, c) => {
    const normalized = normalizeError(error);
    const headers =
      normalized.code === "method_not_allowed" ? { Allow: "GET, OPTIONS" } : undefined;
    return failure(c, normalized.code, normalized.publicMessage, normalized.status, headers);
  });

  return app;
}

