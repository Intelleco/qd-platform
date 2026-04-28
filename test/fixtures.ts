import { readFileSync } from "node:fs";
import { join } from "node:path";
import { TEST_IDS } from "../src/lib/constants";
import { parseJsonl } from "../src/lib/corpus";
import type { QuestionRecord, TestId } from "../src/lib/types";

export function loadFixtureCorpus(): Record<TestId, readonly QuestionRecord[]> {
  const entries = TEST_IDS.map((test) => {
    const file = join("_sample_data", "corpus", `${test}.jsonl`);
    return [test, parseJsonl(readFileSync(file, "utf8"))] as const;
  });
  return Object.fromEntries(entries) as Record<TestId, readonly QuestionRecord[]>;
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
