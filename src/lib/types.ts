import type { Context } from "hono";

export type TestId = "amc8" | "amc10" | "amc12" | "aime";
export type Difficulty = "easy" | "medium" | "hard";
export type ResponseFormat = "multiple_choice" | "numeric_response";

export interface ContentBlock {
  type: string;
  text?: string;
  [key: string]: unknown;
}

export interface QuestionRecord {
  item_id: string;
  content_hash: string;
  question: {
    stimulus: null | { content: ContentBlock[] };
    stem: { content: ContentBlock[] };
    options?: Array<{ id: string; content: ContentBlock[] }>;
  };
  answer:
    | { selection_mode: "single" | "multi"; correct_option_ids: string[] }
    | { response_type: "integer"; correct_value: number };
  citation: {
    author: string;
    year: number;
    session?: string;
    question_number: number;
  };
  taxonomy: { domain: "mathematics"; [key: string]: unknown };
  assessment_metadata: { difficulty: Difficulty; [key: string]: unknown };
  lifecycle: { status: string; [key: string]: unknown };
  metadata: {
    response_format: ResponseFormat;
    primary_path: string;
    contain_graphic: boolean;
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

