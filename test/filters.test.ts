import { describe, expect, it } from "vitest";
import { filterQuestions, parseQuestionSearch, sampleQuestions } from "../src/lib/filters";
import { loadFixtureCatalog, loadFixtureCorpus } from "./fixtures";

const catalog = loadFixtureCatalog();

describe("query parsing", () => {
  it("requires a valid test", () => {
    expect(() => parseQuestionSearch(new URLSearchParams(), catalog)).toThrow(/test is required/);
    expect(() => parseQuestionSearch(new URLSearchParams("test=not_real"), catalog)).toThrow(/test is required/);
  });

  it("rejects repeated scalar params and unknown params", () => {
    expect(() => parseQuestionSearch(new URLSearchParams("test=amc8&limit=1&limit=2"), catalog)).toThrow(/Repeated/);
    expect(() => parseQuestionSearch(new URLSearchParams("test=amc8&topic=algebra"), catalog)).toThrow(/Unsupported/);
  });

  it("validates test-specific sessions and response formats", () => {
    expect(() => parseQuestionSearch(new URLSearchParams("test=amc8&session=A"), catalog)).toThrow(/session/);
    expect(() => parseQuestionSearch(new URLSearchParams("test=aime&response_format=multiple_choice"), catalog)).toThrow(
      /response_format/
    );
  });

  it("rejects unavailable ranges for SAT catalog entries", () => {
    expect(() => parseQuestionSearch(new URLSearchParams("test=sat_math&year=2025"), catalog)).toThrow(/year/);
    expect(() => parseQuestionSearch(new URLSearchParams("test=sat_rw&question_number=1"), catalog)).toThrow(
      /question_number/
    );
  });

  it("accepts SAT section searches by test and response format", () => {
    const args = parseQuestionSearch(new URLSearchParams("test=sat_math&response_format=numeric_response"), catalog);
    expect(args).toMatchObject({
      test: "sat_math",
      responseFormat: "numeric_response",
      limit: 20
    });
  });

  it("parses valid filters and defaults limit", () => {
    const args = parseQuestionSearch(
      new URLSearchParams("test=amc10&year=2025&session=A&question_number=3&difficulty=easy"),
      catalog
    );
    expect(args).toMatchObject({
      test: "amc10",
      year: 2025,
      session: "A",
      questionNumber: 3,
      difficulty: "easy",
      limit: 20
    });
  });
});

describe("filtering and sampling", () => {
  const corpus = loadFixtureCorpus(catalog);
  const records = (test: string) => {
    const items = corpus[test];
    expect(items).toBeDefined();
    return items ?? [];
  };

  it("filters by year, session, question number, difficulty, and format", () => {
    const args = parseQuestionSearch(
      new URLSearchParams(
        "test=amc10&year=2000&session=A&question_number=1&difficulty=easy&response_format=multiple_choice"
      ),
      catalog
    );
    const results = filterQuestions(records("amc10"), args);
    expect(results).toHaveLength(1);
    expect(results[0]?.citation).toMatchObject({ year: 2000, session: "A", question_number: 1 });
  });

  it("filters response format from the top-level field", () => {
    const args = parseQuestionSearch(new URLSearchParams("test=sat_math&response_format=numeric_response"), catalog);
    const results = filterQuestions(records("sat_math"), args);
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((item) => item.response_format === "numeric_response")).toBe(true);
  });

  it("returns graphic-marked rows unchanged", () => {
    const graphic = records("amc8").find((item) => item.metadata.contain_graphic);
    expect(graphic).toBeDefined();
    expect(graphic?.metadata.contain_graphic).toBe(true);
  });

  it("samples deterministically with injected RNG", () => {
    const sampled = sampleQuestions([1, 2, 3, 4], 2, () => 0);
    expect(sampled).toEqual([2, 3]);
  });
});
