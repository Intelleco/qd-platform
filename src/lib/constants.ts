import type { Difficulty, ResponseFormat, TestCatalog, TestCatalogEntry } from "./types";

export const TEST_CATALOG_OBJECT_KEY = "corpus/current/catalog/tests.json";

export const DIFFICULTIES = ["easy", "medium", "hard"] as const satisfies readonly Difficulty[];

export const RESPONSE_FORMATS = [
  "multiple_choice",
  "numeric_response"
] as const satisfies readonly ResponseFormat[];

export function activeTestEntries(catalog: TestCatalog): readonly TestCatalogEntry[] {
  return catalog.tests.filter((test) => test.status === "active");
}

export function testIds(catalog: TestCatalog): readonly string[] {
  return activeTestEntries(catalog).map((test) => test.id);
}

export function findTestEntry(catalog: TestCatalog, id: string): TestCatalogEntry | undefined {
  return activeTestEntries(catalog).find((test) => test.id === id);
}

export function isDifficulty(value: string): value is Difficulty {
  return (DIFFICULTIES as readonly string[]).includes(value);
}

export function isResponseFormat(value: string): value is ResponseFormat {
  return (RESPONSE_FORMATS as readonly string[]).includes(value);
}
