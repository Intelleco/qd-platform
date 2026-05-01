import { describe, expect, it } from "vitest";
import { TEST_CATALOG_OBJECT_KEY } from "../src/lib/constants";
import { buildUploadEntries, parseArgs } from "../scripts/upload-corpus";

describe("upload corpus script", () => {
  it("builds upload entries for catalog and catalog-listed JSONL files", () => {
    const entries = buildUploadEntries();
    expect(entries[0]).toMatchObject({
      objectKey: TEST_CATALOG_OBJECT_KEY,
      contentType: "application/json"
    });
    expect(entries.map((entry) => entry.objectKey)).toEqual([
      "corpus/current/catalog/tests.json",
      "corpus/current/content/tests/amc8.jsonl",
      "corpus/current/content/tests/amc10.jsonl",
      "corpus/current/content/tests/amc12.jsonl",
      "corpus/current/content/tests/aime.jsonl",
      "corpus/current/content/tests/sat_math.jsonl",
      "corpus/current/content/tests/sat_rw.jsonl"
    ]);
  });

  it("parses local and remote upload modes", () => {
    expect(parseArgs(["--local", "--persist-to", ".wrangler/state"])).toEqual({
      mode: "--local",
      persistTo: ".wrangler/state"
    });
    expect(parseArgs(["--remote"])).toEqual({ mode: "--remote" });
    expect(() => parseArgs(["--local", "--remote"])).toThrow(/Choose only one/);
  });
});
