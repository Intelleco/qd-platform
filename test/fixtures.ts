import { readFileSync } from "node:fs";
import { join } from "node:path";
import { activeTestEntries, TEST_CATALOG_OBJECT_KEY } from "../src/lib/constants";
import { parseCatalog, parseJsonl } from "../src/lib/corpus";
import type { QuestionRecord, TestCatalog } from "../src/lib/types";

export function loadFixtureCatalog(): TestCatalog {
  return parseCatalog(readFileSync(join("_sample_data", TEST_CATALOG_OBJECT_KEY), "utf8"));
}

export function loadFixtureCorpus(catalog = loadFixtureCatalog()): Record<string, readonly QuestionRecord[]> {
  const entries = activeTestEntries(catalog).map((test) => {
    const file = join("_sample_data", test.object_key);
    return [test.id, parseJsonl(readFileSync(file, "utf8"))] as const;
  });
  return Object.fromEntries(entries) as Record<string, readonly QuestionRecord[]>;
}

const unusedR2Bucket: R2Bucket = {
  async head() {
    return null;
  },
  async get() {
    return null;
  },
  async put() {
    throw new Error("Unused test R2 bucket.");
  },
  async createMultipartUpload() {
    throw new Error("Unused test R2 bucket.");
  },
  resumeMultipartUpload() {
    throw new Error("Unused test R2 bucket.");
  },
  async delete() {},
  async list() {
    return { objects: [], delimitedPrefixes: [], truncated: false };
  }
};

export const TEST_ENV = {
  QD_CORPUS: unusedR2Bucket,
  QD_ALLOWED_ORIGINS: "https://qd.org,https://www.qd.org,http://localhost:5173"
} satisfies Env;
