import { TEST_IDS } from "../lib/constants";
import type { buildPlatformSpec } from "./data";

type PlatformSpec = ReturnType<typeof buildPlatformSpec>;

export function renderSpecMarkdown(spec: PlatformSpec): string {
  const lines = [
    "# qd-platform API Spec",
    "",
    `Version: ${spec.version}`,
    "",
    "## Corpus",
    "",
    `- Total rows: ${spec.corpus.total_rows}`,
    `- Graphic-marked rows returned unchanged: ${spec.corpus.graphic_rows}`,
    `- Duplicate item_id groups: ${spec.corpus.duplicate_item_id_groups}`,
    "",
    "## Tests",
    ""
  ];

  for (const test of TEST_IDS) {
    const config = spec.tests[test];
    if (config === undefined) {
      continue;
    }
    lines.push(
      `### ${config.label}`,
      "",
      `- Years: ${config.years.min}-${config.years.max}`,
      `- Sessions: ${config.sessions.length > 0 ? config.sessions.join(", ") : "none"}`,
      `- Question numbers: ${config.question_numbers.min}-${config.question_numbers.max}`,
      `- Response formats: ${config.response_formats.join(", ")}`,
      `- Difficulties: ${config.difficulty_values_present.join(", ")}`,
      `- Rows: ${config.row_count}`,
      `- Graphic rows: ${config.graphic_row_count}`,
      ""
    );
  }

  lines.push(
    "## Filters",
    "",
    "- `test` is required.",
    "- Optional filters: `year`, `session`, `question_number`, `difficulty`, `response_format`, `limit`.",
    "- `limit` defaults to 20 and must be between 1 and 100.",
    "",
    "## Response Formats",
    "",
    "- `multiple_choice`: answer has `selection_mode` and `correct_option_ids`.",
    "- `numeric_response`: answer has `response_type` and `correct_value`.",
    "",
    "## Unsupported",
    "",
    ...spec.unsupported_examples.map((example) => `- ${example}`),
    ""
  );

  return lines.join("\n");
}
