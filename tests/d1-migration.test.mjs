import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

test("applies the aggregate-only D1 schema to SQLite", async () => {
  const migration = await readFile(
    new URL("../drizzle/0000_famous_chamber.sql", import.meta.url),
    "utf8",
  );
  const database = new DatabaseSync(":memory:");

  try {
    database.exec(migration);
    const columns = database
      .prepare("PRAGMA table_info(privacy_event_daily)")
      .all()
      .map((column) => column.name);

    assert.deepEqual(columns, [
      "day",
      "event_name",
      "input_kind",
      "risk",
      "action",
      "channel",
      "event_count",
      "updated_at",
    ]);
    assert.ok(
      columns.every(
        (column) => !/(?:user|account|session|device|ip|url|phone|message|content|text)/i.test(column),
      ),
      "aggregate analytics must not add identifying or checked-content columns",
    );
  } finally {
    database.close();
  }
});
