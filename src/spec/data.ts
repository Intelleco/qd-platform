import {
  CORPUS_GRAPHIC_ROWS,
  CORPUS_TOTAL_ROWS,
  DIFFICULTIES,
  DUPLICATE_ITEM_ID_GROUPS,
  TEST_CONFIG,
  TEST_IDS
} from "../lib/constants";

export const SPEC_VERSION = "2026-04-28";

export function buildPlatformSpec() {
  return {
    version: SPEC_VERSION,
    corpus: {
      total_rows: CORPUS_TOTAL_ROWS,
      graphic_rows: CORPUS_GRAPHIC_ROWS,
      duplicate_item_id_groups: DUPLICATE_ITEM_ID_GROUPS,
      notes: [
        "Rows with metadata.contain_graphic=true are returned unchanged in the MVP.",
        "item_id is content-hash based and is not globally unique across test files."
      ]
    },
    tests: Object.fromEntries(
      TEST_IDS.map((test) => {
        const config = TEST_CONFIG[test];
        return [
          test,
          {
            label: config.label,
            years: { min: config.yearMin, max: config.yearMax },
            sessions: config.sessions,
            question_numbers: {
              min: config.questionNumberMin,
              max: config.questionNumberMax
            },
            response_formats: config.responseFormats,
            difficulty_values_present: DIFFICULTIES,
            row_count: config.rowCount,
            graphic_row_count: config.graphicRowCount
          }
        ];
      })
    ),
    filters: {
      test: { type: "enum", required: true, values: TEST_IDS },
      year: { type: "integer", required: false, behavior: "exact citation.year match" },
      session: { type: "enum", required: false, applicable_tests: ["amc10", "amc12", "aime"] },
      question_number: { type: "integer", required: false, behavior: "exact original exam position match" },
      difficulty: { type: "enum", required: false, values: DIFFICULTIES },
      response_format: {
        type: "enum",
        required: false,
        values: ["multiple_choice", "numeric_response"]
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
          test: { type: "string", enum: TEST_IDS },
          year: { type: "integer" },
          session: { type: "string" },
          question_number: { type: "integer" },
          difficulty: { type: "string", enum: DIFFICULTIES },
          response_format: { type: "string", enum: ["multiple_choice", "numeric_response"] },
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
        discriminator: "metadata.response_format",
        answer_shape: "{ selection_mode: 'single'|'multi', correct_option_ids: string[] }",
        options: "question.options"
      },
      numeric_response: {
        discriminator: "metadata.response_format",
        answer_shape: "{ response_type: 'integer', correct_value: number }"
      }
    },
    unsupported_examples: [
      "SAT, ACT, AP, grade, topic, skill, standard, and non-math subject filters",
      "Deterministic seeded sampling",
      "Pagination cursors",
      "Report submission"
    ]
  } as const;
}

