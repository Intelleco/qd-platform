import { TEST_CONFIG, TEST_IDS } from "./constants";
import { corpusUnavailable } from "./errors";
import type { CorpusReader, ItemMatch, QuestionRecord, TestId } from "./types";

const r2Cache = new Map<TestId, Promise<readonly QuestionRecord[]>>();

export class R2CorpusReader implements CorpusReader {
  constructor(private readonly bucket: R2Bucket) {}

  async readTest(test: TestId): Promise<readonly QuestionRecord[]> {
    const cached = r2Cache.get(test);
    if (cached !== undefined) {
      return cached;
    }

    const loading = this.loadTest(test);
    r2Cache.set(test, loading);

    try {
      return await loading;
    } catch (error) {
      r2Cache.delete(test);
      throw error;
    }
  }

  async readAll(): Promise<readonly ItemMatch[]> {
    const groups = await Promise.all(
      TEST_IDS.map(async (test) => {
        const rows = await this.readTest(test);
        return rows.map((item) => ({ test, item }));
      })
    );
    return groups.flat();
  }

  private async loadTest(test: TestId): Promise<readonly QuestionRecord[]> {
    let object: R2ObjectBody | null;
    try {
      object = await this.bucket.get(TEST_CONFIG[test].objectKey);
    } catch {
      throw corpusUnavailable();
    }

    if (object === null) {
      throw corpusUnavailable();
    }

    try {
      return parseJsonl(object.body === null ? "" : await object.text());
    } catch {
      throw corpusUnavailable();
    }
  }
}

export class FixtureCorpusReader implements CorpusReader {
  constructor(private readonly records: Readonly<Record<TestId, readonly QuestionRecord[]>>) {}

  async readTest(test: TestId): Promise<readonly QuestionRecord[]> {
    return this.records[test];
  }

  async readAll(): Promise<readonly ItemMatch[]> {
    return TEST_IDS.flatMap((test) => this.records[test].map((item) => ({ test, item })));
  }
}

export function parseJsonl(text: string): readonly QuestionRecord[] {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return [];
  }

  return trimmed.split("\n").map((line) => JSON.parse(line) as QuestionRecord);
}

export async function findItemMatches(reader: CorpusReader, itemId: string): Promise<readonly ItemMatch[]> {
  const all = await reader.readAll();
  return all.filter((match) => match.item.item_id === itemId);
}
