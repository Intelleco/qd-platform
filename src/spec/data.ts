import { activeTestEntries, DIFFICULTIES, RESPONSE_FORMATS, testIds } from "../lib/constants";
import type { TestCatalog, TestCatalogEntry } from "../lib/types";

export const SPEC_VERSION = "2026-04-28";

export function buildPlatformSpec(catalog: TestCatalog) {
  return {
    version: SPEC_VERSION,
    corpus: {
      total_rows: catalog.summary.total_rows,
      graphic_rows: catalog.summary.graphic_rows,
      duplicate_item_id_groups: catalog.summary.duplicate_item_id_groups,
      notes: [
        "Rows with metadata.contain_graphic=true are returned unchanged in the MVP.",
        "item_id is content-hash based and is not globally unique across test files."
      ]
    },
    tests: Object.fromEntries(
      activeTestEntries(catalog).map((config) => [
        config.id,
        {
          label: config.label,
          display_name: config.display_name,
          description: config.description,
          object_key: config.object_key,
          years: rangeObject(config.year_min, config.year_max),
          sessions: config.sessions,
          question_numbers: rangeObject(config.question_number_min, config.question_number_max),
          response_formats: config.response_formats,
          difficulty_values_present: DIFFICULTIES,
          row_count: config.row_count,
          graphic_row_count: config.graphic_row_count
        }
      ])
    ) as Record<string, TestSpec>,
    filters: {
      test: { type: "enum", required: true, values: testIds(catalog) },
      year: { type: "integer", required: false, behavior: "exact citation.year match when available" },
      session: { type: "enum", required: false, behavior: "exact citation.session match when available" },
      question_number: { type: "integer", required: false, behavior: "exact original exam position match when available" },
      difficulty: { type: "enum", required: false, values: DIFFICULTIES },
      response_format: {
        type: "enum",
        required: false,
        values: RESPONSE_FORMATS
      },
      limit: { type: "integer", required: false, default: 20, minimum: 1, maximum: 100 }
    },
    tool_schema: {
      name: "search_questions",
      input_schema: {
        type: "object",
        required: ["test"],
        additionalProperties: false,
        properties: {
          test: { type: "string", enum: testIds(catalog) },
          year: { type: "integer" },
          session: { type: "string" },
          question_number: { type: "integer" },
          difficulty: { type: "string", enum: DIFFICULTIES },
          response_format: { type: "string", enum: RESPONSE_FORMATS },
          limit: { type: "integer", minimum: 1, maximum: 100, default: 20 }
        }
      },
      output_union: [
        { kind: "supported", args: "SearchArgs" },
        { kind: "unsupported", reason: "string" }
      ]
    },
    response_formats: {
      multiple_choice: {
        discriminator: "response_format",
        answer_shape: "{ selection_mode: 'single'|'multi', correct_option_ids: string[] }",
        options: "question.options"
      },
      numeric_response: {
        discriminator: "response_format",
        answer_shape: "{ response_type: 'numeric', accepted_values: unknown[] }"
      }
    },
    unsupported_examples: [
      "ACT, AP, topic, skill, standard, and school subject filters",
      "Deterministic seeded sampling",
      "Pagination cursors",
      "Report submission"
    ]
  } as const;
}

type TestSpec = {
  label: string;
  display_name: string;
  description: string;
  object_key: string;
  years: RangeSpec;
  sessions: TestCatalogEntry["sessions"];
  question_numbers: RangeSpec;
  response_formats: TestCatalogEntry["response_formats"];
  difficulty_values_present: typeof DIFFICULTIES;
  row_count: number;
  graphic_row_count: number;
};

type RangeSpec = { min: number; max: number } | null;

function rangeObject(min: number | null, max: number | null): RangeSpec {
  if (min === null || max === null) {
    return null;
  }
  return { min, max };
}
