import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { TEST_IDS, TEST_CONFIG } from "../src/lib/constants";

interface UploadOptions {
  mode: "--local" | "--remote";
  persistTo?: string;
}

const BUCKET_NAME = "qd-data";

function parseArgs(args: readonly string[]): UploadOptions {
  const local = args.includes("--local");
  const remote = args.includes("--remote");
  if (local && remote) {
    throw new Error("Choose only one upload mode: --local or --remote.");
  }

  const persistIndex = args.indexOf("--persist-to");
  const persistTo = persistIndex >= 0 ? args[persistIndex + 1] : undefined;
  if (persistIndex >= 0 && persistTo === undefined) {
    throw new Error("--persist-to requires a directory.");
  }

  return {
    mode: remote ? "--remote" : "--local",
    ...(persistTo === undefined ? {} : { persistTo })
  };
}

function uploadOne(test: (typeof TEST_IDS)[number], options: UploadOptions): void {
  const source = resolve("_sample_data", "corpus", `${test}.jsonl`);
  if (!existsSync(source)) {
    throw new Error(`Missing corpus fixture: ${source}`);
  }

  const objectPath = `${BUCKET_NAME}/${TEST_CONFIG[test].objectKey}`;
  const args = [
    "wrangler",
    "r2",
    "object",
    "put",
    objectPath,
    "--file",
    source,
    "--content-type",
    "application/x-ndjson",
    "--force",
    options.mode
  ];

  if (options.persistTo !== undefined) {
    args.push("--persist-to", options.persistTo);
  }

  const result = spawnSync("npx", args, { stdio: "inherit" });
  if (result.status !== 0) {
    throw new Error(`Upload failed for ${objectPath}.`);
  }
}

const options = parseArgs(process.argv.slice(2));
for (const test of TEST_IDS) {
  uploadOne(test, options);
}

