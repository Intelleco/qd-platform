import type { Context } from "hono";

export type TestId = string;
export type Difficulty = "easy" | "medium" | "hard";
export type ResponseFormat = "multiple_choice" | "numeric_response";

export interface CatalogSummary {
  total_rows: number;
  graphic_rows: number;
  duplicate_item_id_groups: number;
}

export interface TestCatalogEntry {
  id: TestId;
  label: string;
  display_name: string;
  description: string;
  status: "active";
  kind: "test";
  object_key: string;
  row_count: number;
  graphic_row_count: number;
  response_formats: readonly ResponseFormat[];
  sessions: readonly string[];
  year_min: number | null;
  year_max: number | null;
  question_number_min: number | null;
  question_number_max: number | null;
}

export interface TestCatalog {
  generated_at: string;
  summary: CatalogSummary;
  tests: readonly TestCatalogEntry[];
}

export interface ContentBlock {
  type: string;
  text?: string;
  [key: string]: unknown;
}

export interface QuestionRecord {
  item_id: string;
  content_hash: string;
  response_format: ResponseFormat;
  question: {
    stimulus: null | { content: ContentBlock[] };
    stem: { content: ContentBlock[] };
    options?: Array<{ id: string; content: ContentBlock[] }>;
  };
  answer:
    | { selection_mode: "single" | "multi"; correct_option_ids: string[] }
    | { response_type: "integer" | "numeric"; correct_value?: number; accepted_values?: unknown[] };
  citation: {
    author: string;
    year?: number;
    session?: string;
    question_number?: number;
  };
  taxonomy: { domain: "mathematics"; [key: string]: unknown };
  assessment_metadata: { difficulty?: Difficulty; [key: string]: unknown };
  lifecycle: { status: string; [key: string]: unknown };
  metadata: {
    primary_path: string;
    contain_graphic?: boolean;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface ItemMatch {
  test: TestId;
  item: QuestionRecord;
}

export type Rng = () => number;

export interface CorpusReader {
  readCatalog(): Promise<TestCatalog>;
  readTest(test: TestId): Promise<readonly QuestionRecord[]>;
  readAll(): Promise<readonly ItemMatch[]>;
}

export interface AppVariables {
  requestId: string;
  corpusReader: CorpusReader;
  rng: Rng;
}

export type AppEnv = {
  Bindings: Env;
  Variables: AppVariables;
};

export type AppContext = Context<AppEnv>;
