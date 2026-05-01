import { describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { FixtureCorpusReader } from "../src/lib/corpus";
import { corpusUnavailable } from "../src/lib/errors";
import { loadFixtureCatalog, loadFixtureCorpus, TEST_ENV } from "./fixtures";

const catalog = loadFixtureCatalog();
const corpus = loadFixtureCorpus(catalog);
const records = (test: string) => {
  const items = corpus[test];
  expect(items).toBeDefined();
  return items ?? [];
};

function makeApp(rng = () => 0) {
  return createApp({
    corpusReader: new FixtureCorpusReader(catalog, corpus),
    rng,
    allowedOrigins: ["https://qd.org", "http://localhost:5173"]
  });
}

async function json(res: Response) {
  return (await res.json()) as Record<string, unknown>;
}

describe("routes", () => {
  it("serves health with envelope and base headers", async () => {
    const res = await makeApp().request("/v1/health", {}, TEST_ENV);
    const body = await json(res);

    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(res.headers.get("x-qd-request-id")).toMatch(/^req_/);
    expect(body).toMatchObject({ ok: true, data: { status: "ok" } });
  });

  it("serves sampled questions and marks short result sets", async () => {
    const res = await makeApp().request("/v1/questions?test=amc8&year=1985&question_number=1&limit=10", {}, TEST_ENV);
    const body = await json(res);

    expect(res.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      meta: { requested: 10, returned: 1, short: true }
    });
  });

  it("serves SAT sections from the catalog", async () => {
    const res = await makeApp().request("/v1/questions?test=sat_rw&response_format=multiple_choice&limit=3", {}, TEST_ENV);
    const body = await json(res);

    expect(res.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      meta: { requested: 3, returned: 3, short: false }
    });
  });

  it("rejects invalid queries", async () => {
    const res = await makeApp().request("/v1/questions?test=amc8&session=A", {}, TEST_ENV);
    const body = await json(res);

    expect(res.status).toBe(400);
    expect(body).toMatchObject({ ok: false, error: { code: "invalid_query" } });
  });

  it("rejects filters unavailable for a catalog entry", async () => {
    const res = await makeApp().request("/v1/questions?test=sat_rw&year=2025", {}, TEST_ENV);
    const body = await json(res);

    expect(res.status).toBe(400);
    expect(body).toMatchObject({ ok: false, error: { code: "invalid_query" } });
  });

  it("returns one random duplicate item match with metadata", async () => {
    const duplicate = records("amc10").find((item) => records("amc12").some((other) => other.item_id === item.item_id));
    expect(duplicate).toBeDefined();

    const res = await makeApp(() => 0.99).request(`/v1/items/${duplicate?.item_id}`, {}, TEST_ENV);
    const body = await json(res);

    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(body).toMatchObject({
      ok: true,
      meta: { match_count: 2, selected_test: "amc12" }
    });
  });

  it("returns not found for unknown item ids", async () => {
    const res = await makeApp().request("/v1/items/not-real", {}, TEST_ENV);
    const body = await json(res);

    expect(res.status).toBe(404);
    expect(body).toMatchObject({ ok: false, error: { code: "not_found" } });
  });

  it("serves spec json and markdown from shared data", async () => {
    const app = makeApp();
    const specRes = await app.request("/v1/spec", {}, TEST_ENV);
    const specBody = await json(specRes);
    const markdownRes = await app.request("/v1/spec.md", {}, TEST_ENV);
    const markdown = await markdownRes.text();

    expect(specBody).toMatchObject({
      ok: true,
      data: { corpus: { total_rows: 10044, graphic_rows: 738, duplicate_item_id_groups: 126 } }
    });
    expect(markdown).toContain("Graphic-marked rows returned unchanged: 738");
    expect(markdown).toContain("AMC 10");
  });

  it("handles method not allowed", async () => {
    const res = await makeApp().request("/v1/health", { method: "POST" }, TEST_ENV);
    const body = await json(res);

    expect(res.status).toBe(405);
    expect(res.headers.get("Allow")).toBe("GET, OPTIONS");
    expect(body).toMatchObject({ ok: false, error: { code: "method_not_allowed" } });
  });

  it("handles CORS preflight for allowed origins", async () => {
    const res = await makeApp().request(
      "/v1/questions",
      {
        method: "OPTIONS",
        headers: { Origin: "https://qd.org", "Access-Control-Request-Method": "GET" }
      },
      TEST_ENV
    );
    const body = await json(res);

    expect(res.status).toBe(200);
    expect(res.headers.get("access-control-allow-origin")).toBe("https://qd.org");
    expect(body).toMatchObject({ ok: true });
  });

  it("maps corpus failures to corpus_unavailable", async () => {
    const app = createApp({
      corpusReader: {
        async readCatalog() {
          throw corpusUnavailable();
        },
        async readTest() {
          throw corpusUnavailable();
        },
        async readAll() {
          throw corpusUnavailable();
        }
      },
      allowedOrigins: ["https://qd.org"]
    });

    const res = await app.request("/v1/questions?test=amc8", {}, TEST_ENV);
    const body = await json(res);

    expect(res.status).toBe(503);
    expect(body).toMatchObject({ ok: false, error: { code: "corpus_unavailable", message: "Question corpus is unavailable." } });
  });
});
