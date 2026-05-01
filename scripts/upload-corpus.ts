import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { activeTestEntries, TEST_CATALOG_OBJECT_KEY } from "../src/lib/constants";
import { parseCatalog } from "../src/lib/corpus";

interface UploadOptions {
  mode: "--local" | "--remote";
  persistTo?: string;
}

export interface UploadEntry {
  source: string;
  objectKey: string;
  contentType: "application/json" | "application/x-ndjson";
}

const BUCKET_NAME = "qd-data";

export function parseArgs(args: readonly string[]): UploadOptions {
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

export function buildUploadEntries(sampleRoot = "_sample_data"): readonly UploadEntry[] {
  const catalogSource = resolve(sampleRoot, TEST_CATALOG_OBJECT_KEY);
  const catalog = parseCatalog(readFileSync(catalogSource, "utf8"));
  return [
    {
      source: catalogSource,
      objectKey: TEST_CATALOG_OBJECT_KEY,
      contentType: "application/json"
    },
    ...activeTestEntries(catalog).map((entry) => ({
      source: resolve(sampleRoot, entry.object_key),
      objectKey: entry.object_key,
      contentType: "application/x-ndjson" as const
    }))
  ];
}

function uploadOne(entry: UploadEntry, options: UploadOptions): void {
  if (!existsSync(entry.source)) {
    throw new Error(`Missing corpus fixture: ${entry.source}`);
  }

  const objectPath = `${BUCKET_NAME}/${entry.objectKey}`;
  const args = [
    "wrangler",
    "r2",
    "object",
    "put",
    objectPath,
    "--file",
    entry.source,
    "--content-type",
    entry.contentType,
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

export function main(args: readonly string[] = process.argv.slice(2)): void {
  const options = parseArgs(args);
  for (const entry of buildUploadEntries()) {
    uploadOne(entry, options);
  }
}

const entrypoint = process.argv[1];
if (entrypoint !== undefined && import.meta.url === pathToFileURL(entrypoint).href) {
  main();
}
