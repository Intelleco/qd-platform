import type { Difficulty, ResponseFormat, TestId } from "./types";

export const TEST_IDS = ["amc8", "amc10", "amc12", "aime"] as const satisfies readonly TestId[];

export const DIFFICULTIES = ["easy", "medium", "hard"] as const satisfies readonly Difficulty[];

export const RESPONSE_FORMATS = [
  "multiple_choice",
  "numeric_response"
] as const satisfies readonly ResponseFormat[];

export interface TestConfig {
  id: TestId;
  label: string;
  objectKey: string;
  yearMin: number;
  yearMax: number;
  sessions: readonly string[];
  questionNumberMin: number;
  questionNumberMax: number;
  responseFormats: readonly ResponseFormat[];
  rowCount: number;
  graphicRowCount: number;
}

export const TEST_CONFIG = {
  amc8: {
    id: "amc8",
    label: "AMC 8",
    objectKey: "corpus/amc8.jsonl",
    yearMin: 1985,
    yearMax: 2025,
    sessions: [],
    questionNumberMin: 1,
    questionNumberMax: 25,
    responseFormats: ["multiple_choice"],
    rowCount: 1000,
    graphicRowCount: 324
  },
  amc10: {
    id: "amc10",
    label: "AMC 10",
    objectKey: "corpus/amc10.jsonl",
    yearMin: 2000,
    yearMax: 2025,
    sessions: ["A", "B", "C", "D"],
    questionNumberMin: 1,
    questionNumberMax: 25,
    responseFormats: ["multiple_choice"],
    rowCount: 1300,
    graphicRowCount: 181
  },
  amc12: {
    id: "amc12",
    label: "AMC 12",
    objectKey: "corpus/amc12.jsonl",
    yearMin: 2000,
    yearMax: 2025,
    sessions: ["A", "B", "C", "D"],
    questionNumberMin: 1,
    questionNumberMax: 25,
    responseFormats: ["multiple_choice"],
    rowCount: 1300,
    graphicRowCount: 143
  },
  aime: {
    id: "aime",
    label: "AIME",
    objectKey: "corpus/aime.jsonl",
    yearMin: 1983,
    yearMax: 2025,
    sessions: ["I", "II"],
    questionNumberMin: 1,
    questionNumberMax: 15,
    responseFormats: ["numeric_response"],
    rowCount: 1035,
    graphicRowCount: 90
  }
} as const satisfies Record<TestId, TestConfig>;

export const CORPUS_TOTAL_ROWS = 4635;
export const CORPUS_GRAPHIC_ROWS = 738;
export const DUPLICATE_ITEM_ID_GROUPS = 41;

export function isTestId(value: string): value is TestId {
  return (TEST_IDS as readonly string[]).includes(value);
}

export function isDifficulty(value: string): value is Difficulty {
  return (DIFFICULTIES as readonly string[]).includes(value);
}

export function isResponseFormat(value: string): value is ResponseFormat {
  return (RESPONSE_FORMATS as readonly string[]).includes(value);
}

