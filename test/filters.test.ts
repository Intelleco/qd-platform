import { describe, expect, it } from "vitest";
import { filterQuestions, parseQuestionSearch, sampleQuestions } from "../src/lib/filters";
import { loadFixtureCorpus } from "./fixtures";

describe("query parsing", () => {
  it("requires a valid test", () => {
    expect(() => parseQuestionSearch(new URLSearchParams())).toThrow(/test is required/);
    expect(() => parseQuestionSearch(new URLSearchParams("test=sat"))).toThrow(/test is required/);
  });

  it("rejects repeated scalar params and unknown params", () => {
    expect(() => parseQuestionSearch(new URLSearchParams("test=amc8&limit=1&limit=2"))).toThrow(/Repeated/);
    expect(() => parseQuestionSearch(new URLSearchParams("test=amc8&topic=algebra"))).toThrow(/Unsupported/);
  });

  it("validates test-specific sessions and response formats", () => {
    expect(() => parseQuestionSearch(new URLSearchParams("test=amc8&session=A"))).toThrow(/session/);
    expect(() => parseQuestionSearch(new URLSearchParams("test=aime&response_format=multiple_choice"))).toThrow(
      /response_format/
    );
  });

  it("parses valid filters and defaults limit", () => {
    const args = parseQuestionSearch(
      new URLSearchParams("test=amc10&year=2025&session=A&question_number=3&difficulty=easy")
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
  const corpus = loadFixtureCorpus();

  it("filters by year, session, question number, difficulty, and format", () => {
    const args = parseQuestionSearch(
      new URLSearchParams(
        "test=amc10&year=2000&session=A&question_number=1&difficulty=easy&response_format=multiple_choice"
      )
    );
    const results = filterQuestions(corpus.amc10, args);
    expect(results).toHaveLength(1);
    expect(results[0]?.citation).toMatchObject({ year: 2000, session: "A", question_number: 1 });
  });

  it("returns graphic-marked rows unchanged", () => {
    const graphic = corpus.amc8.find((item) => item.metadata.contain_graphic);
    expect(graphic).toBeDefined();
    expect(graphic?.metadata.contain_graphic).toBe(true);
  });

  it("samples deterministically with injected RNG", () => {
    const sampled = sampleQuestions([1, 2, 3, 4], 2, () => 0);
    expect(sampled).toEqual([2, 3]);
  });
});

