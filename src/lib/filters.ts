import {
  DIFFICULTIES,
  findTestEntry,
  isDifficulty,
  isResponseFormat,
  testIds
} from "./constants";
import { invalidQuery } from "./errors";
import type { Difficulty, QuestionRecord, ResponseFormat, Rng, TestCatalog, TestId } from "./types";

export interface QuestionSearchArgs {
  test: TestId;
  year?: number;
  session?: string;
  questionNumber?: number;
  difficulty?: Difficulty;
  responseFormat?: ResponseFormat;
  limit: number;
}

const ALLOWED_PARAMS = new Set([
  "test",
  "year",
  "session",
  "question_number",
  "difficulty",
  "response_format",
  "limit"
]);

const SCALAR_PARAMS = [...ALLOWED_PARAMS];

export function parseQuestionSearch(searchParams: URLSearchParams, catalog: TestCatalog): QuestionSearchArgs {
  for (const key of searchParams.keys()) {
    if (!ALLOWED_PARAMS.has(key)) {
      throw invalidQuery(`Unsupported query parameter: ${key}.`);
    }
  }

  for (const key of SCALAR_PARAMS) {
    if (searchParams.getAll(key).length > 1) {
      throw invalidQuery(`Repeated query parameter is not allowed: ${key}.`);
    }
  }

  const ids = testIds(catalog);
  const testValue = searchParams.get("test");
  const config = testValue === null ? undefined : findTestEntry(catalog, testValue);
  if (testValue === null || config === undefined) {
    throw invalidQuery(`test is required and must be one of: ${ids.join(", ")}.`);
  }

  const limit = parseOptionalInteger(searchParams.get("limit"), "limit") ?? 20;
  const args: QuestionSearchArgs = {
    test: testValue,
    limit
  };

  if (args.limit < 1 || args.limit > 100) {
    throw invalidQuery("limit must be an integer between 1 and 100.");
  }

  const year = parseOptionalInteger(searchParams.get("year"), "year");
  if (year !== undefined) {
    if (config.year_min === null || config.year_max === null) {
      throw invalidQuery(`year is not available for ${testValue}.`);
    }
    if (year < config.year_min || year > config.year_max) {
      throw invalidQuery(`year must be between ${config.year_min} and ${config.year_max} for ${testValue}.`);
    }
    args.year = year;
  }

  const questionNumber = parseOptionalInteger(searchParams.get("question_number"), "question_number");
  if (questionNumber !== undefined) {
    if (config.question_number_min === null || config.question_number_max === null) {
      throw invalidQuery(`question_number is not available for ${testValue}.`);
    }
    if (questionNumber < config.question_number_min || questionNumber > config.question_number_max) {
      throw invalidQuery(
        `question_number must be between ${config.question_number_min} and ${config.question_number_max} for ${testValue}.`
      );
    }
    args.questionNumber = questionNumber;
  }

  const session = searchParams.get("session");
  if (session !== null) {
    if (!(config.sessions as readonly string[]).includes(session)) {
      const allowed = config.sessions.length > 0 ? config.sessions.join(", ") : "none";
      throw invalidQuery(`session is not valid for ${testValue}. Allowed sessions: ${allowed}.`);
    }
    args.session = session;
  }

  const difficulty = searchParams.get("difficulty");
  if (difficulty !== null) {
    if (!isDifficulty(difficulty)) {
      throw invalidQuery(`difficulty must be one of: ${DIFFICULTIES.join(", ")}.`);
    }
    args.difficulty = difficulty;
  }

  const responseFormat = searchParams.get("response_format");
  if (responseFormat !== null) {
    if (!isResponseFormat(responseFormat) || !(config.response_formats as readonly ResponseFormat[]).includes(responseFormat)) {
      throw invalidQuery(`response_format is not valid for ${testValue}. Allowed formats: ${config.response_formats.join(", ")}.`);
    }
    args.responseFormat = responseFormat;
  }

  return args;
}

export function filterQuestions(
  records: readonly QuestionRecord[],
  args: QuestionSearchArgs
): readonly QuestionRecord[] {
  return records.filter((record) => {
    if (args.year !== undefined && record.citation.year !== args.year) {
      return false;
    }
    if (args.session !== undefined && record.citation.session !== args.session) {
      return false;
    }
    if (args.questionNumber !== undefined && record.citation.question_number !== args.questionNumber) {
      return false;
    }
    if (args.difficulty !== undefined && record.assessment_metadata.difficulty !== args.difficulty) {
      return false;
    }
    if (args.responseFormat !== undefined && record.response_format !== args.responseFormat) {
      return false;
    }
    return true;
  });
}

export function sampleQuestions<T>(items: readonly T[], limit: number, rng: Rng): readonly T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = boundedRandomIndex(index + 1, rng);
    const current = copy[index];
    const random = copy[randomIndex];
    if (current !== undefined && random !== undefined) {
      copy[index] = random;
      copy[randomIndex] = current;
    }
  }
  return copy.slice(0, limit);
}

export function chooseRandom<T>(items: readonly T[], rng: Rng): T | undefined {
  if (items.length === 0) {
    return undefined;
  }
  return items[boundedRandomIndex(items.length, rng)];
}

function parseOptionalInteger(value: string | null, name: string): number | undefined {
  if (value === null) {
    return undefined;
  }
  if (!/^-?\d+$/.test(value)) {
    throw invalidQuery(`${name} must be an integer.`);
  }
  return Number.parseInt(value, 10);
}

function boundedRandomIndex(length: number, rng: Rng): number {
  const value = rng();
  if (!Number.isFinite(value)) {
    return 0;
  }
  const clamped = Math.min(Math.max(value, 0), 0.999999999999);
  return Math.floor(clamped * length);
}
