import {
  activeTestEntries,
  findTestEntry,
  isResponseFormat,
  TEST_CATALOG_OBJECT_KEY
} from "./constants";
import { corpusUnavailable } from "./errors";
import type { CorpusReader, ItemMatch, QuestionRecord, TestCatalog, TestId } from "./types";

let r2CatalogCache: Promise<TestCatalog> | undefined;
const r2TestCache = new Map<TestId, Promise<readonly QuestionRecord[]>>();

export class R2CorpusReader implements CorpusReader {
  constructor(private readonly bucket: R2Bucket) {}

  async readCatalog(): Promise<TestCatalog> {
    if (r2CatalogCache !== undefined) {
      return r2CatalogCache;
    }

    const loading = this.loadCatalog();
    r2CatalogCache = loading;

    try {
      return await loading;
    } catch (error) {
      r2CatalogCache = undefined;
      throw error;
    }
  }

  async readTest(test: TestId): Promise<readonly QuestionRecord[]> {
    const cached = r2TestCache.get(test);
    if (cached !== undefined) {
      return cached;
    }

    const loading = this.loadTest(test);
    r2TestCache.set(test, loading);

    try {
      return await loading;
    } catch (error) {
      r2TestCache.delete(test);
      throw error;
    }
  }

  async readAll(): Promise<readonly ItemMatch[]> {
    const catalog = await this.readCatalog();
    const groups = await Promise.all(
      activeTestEntries(catalog).map(async (entry) => {
        const rows = await this.readTest(entry.id);
        return rows.map((item) => ({ test: entry.id, item }));
      })
    );
    return groups.flat();
  }

  private async loadCatalog(): Promise<TestCatalog> {
    try {
      return parseCatalog(await this.loadText(TEST_CATALOG_OBJECT_KEY));
    } catch {
      throw corpusUnavailable();
    }
  }

  private async loadTest(test: TestId): Promise<readonly QuestionRecord[]> {
    const catalog = await this.readCatalog();
    const entry = findTestEntry(catalog, test);
    if (entry === undefined) {
      throw corpusUnavailable();
    }

    try {
      return parseJsonl(await this.loadText(entry.object_key));
    } catch {
      throw corpusUnavailable();
    }
  }

  private async loadText(objectKey: string): Promise<string> {
    const object = await this.bucket.get(objectKey);
    if (object === null) {
      throw corpusUnavailable();
    }
    return object.body === null ? "" : await object.text();
  }
}

export class FixtureCorpusReader implements CorpusReader {
  constructor(
    private readonly catalog: TestCatalog,
    private readonly records: Readonly<Record<string, readonly QuestionRecord[]>>
  ) {}

  async readCatalog(): Promise<TestCatalog> {
    return this.catalog;
  }

  async readTest(test: TestId): Promise<readonly QuestionRecord[]> {
    return this.records[test] ?? [];
  }

  async readAll(): Promise<readonly ItemMatch[]> {
    return activeTestEntries(this.catalog).flatMap((entry) =>
      (this.records[entry.id] ?? []).map((item) => ({ test: entry.id, item }))
    );
  }
}

export function parseJsonl(text: string): readonly QuestionRecord[] {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return [];
  }

  return trimmed.split("\n").map((line) => JSON.parse(line) as QuestionRecord);
}

export function parseCatalog(text: string): TestCatalog {
  const value = JSON.parse(text) as unknown;
  if (!isRecord(value)) {
    throw new Error("Catalog must be an object.");
  }

  const generatedAt = value.generated_at;
  const summary = value.summary;
  const tests = value.tests;
  if (typeof generatedAt !== "string" || !isRecord(summary) || !Array.isArray(tests)) {
    throw new Error("Catalog has invalid top-level fields.");
  }

  const parsedTests = tests.map(parseCatalogEntry);
  return {
    generated_at: generatedAt,
    summary: {
      total_rows: readNumber(summary, "total_rows"),
      graphic_rows: readNumber(summary, "graphic_rows"),
      duplicate_item_id_groups: readNumber(summary, "duplicate_item_id_groups")
    },
    tests: parsedTests
  };
}

export async function findItemMatches(reader: CorpusReader, itemId: string): Promise<readonly ItemMatch[]> {
  const all = await reader.readAll();
  return all.filter((match) => match.item.item_id === itemId);
}

function parseCatalogEntry(value: unknown): TestCatalog["tests"][number] {
  if (!isRecord(value)) {
    throw new Error("Catalog test entry must be an object.");
  }

  const responseFormats = value.response_formats;
  const sessions = value.sessions;
  if (!Array.isArray(responseFormats) || !responseFormats.every(isCatalogResponseFormat)) {
    throw new Error("Catalog test entry has invalid response_formats.");
  }
  if (!Array.isArray(sessions) || !sessions.every((session) => typeof session === "string")) {
    throw new Error("Catalog test entry has invalid sessions.");
  }

  return {
    id: readString(value, "id"),
    label: readString(value, "label"),
    display_name: readString(value, "display_name"),
    description: readString(value, "description"),
    status: readStringLiteral(value, "status", "active"),
    kind: readStringLiteral(value, "kind", "test"),
    object_key: readString(value, "object_key"),
    row_count: readNumber(value, "row_count"),
    graphic_row_count: readNumber(value, "graphic_row_count"),
    response_formats: responseFormats,
    sessions,
    year_min: readNullableNumber(value, "year_min"),
    year_max: readNullableNumber(value, "year_max"),
    question_number_min: readNullableNumber(value, "question_number_min"),
    question_number_max: readNullableNumber(value, "question_number_max")
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Catalog field ${key} must be a non-empty string.`);
  }
  return value;
}

function readStringLiteral<T extends string>(record: Record<string, unknown>, key: string, expected: T): T {
  const value = readString(record, key);
  if (value !== expected) {
    throw new Error(`Catalog field ${key} must be ${expected}.`);
  }
  return expected;
}

function readNumber(record: Record<string, unknown>, key: string): number {
  const value = record[key];
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new Error(`Catalog field ${key} must be an integer.`);
  }
  return value;
}

function readNullableNumber(record: Record<string, unknown>, key: string): number | null {
  const value = record[key];
  if (value === null) {
    return null;
  }
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new Error(`Catalog field ${key} must be an integer or null.`);
  }
  return value;
}

function isCatalogResponseFormat(value: unknown): boolean {
  return typeof value === "string" && isResponseFormat(value);
}
