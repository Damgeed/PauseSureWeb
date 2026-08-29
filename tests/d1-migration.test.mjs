import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { createPrivacyEventTable } from "../worker/privacy-events.ts";

const migrationDirectory = new URL("../drizzle/", import.meta.url);

async function migrationSources() {
  const names = (await readdir(migrationDirectory))
    .filter((name) => /^\d+_[a-z0-9_]+\.sql$/u.test(name))
    .sort();
  return Promise.all(names.map(async (name) => ({
    name,
    source: await readFile(new URL(name, migrationDirectory), "utf8"),
  })));
}

test("applies the aggregate-only D1 schema to SQLite and preserves rows", async () => {
  const migrations = await migrationSources();
  const database = new DatabaseSync(":memory:");

  try {
    assert.deepEqual(migrations.map(({ name }) => name), [
      "0000_famous_chamber.sql",
      "0001_constrain_privacy_aggregates.sql",
    ]);
    database.exec(migrations[0].source);
    database.prepare(`
      INSERT INTO privacy_event_daily
        (day, event_name, input_kind, risk, action, channel, event_count, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      "2026-08-27",
      "web_check_completed",
      "link",
      "high",
      "none",
      "web",
      2,
      1_777_000_000,
    );
    database.exec(migrations[1].source);
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
    assert.deepEqual(
      { ...database.prepare(`
        SELECT day, event_name, input_kind, risk, action, channel, event_count, updated_at
          FROM privacy_event_daily
      `).get() },
      {
        day: "2026-08-27",
        event_name: "web_check_completed",
        input_kind: "link",
        risk: "high",
        action: "none",
        channel: "web",
        event_count: 2,
        updated_at: 1_777_000_000,
      },
    );
  } finally {
    database.close();
  }
});

test("D1 schema rejects free-form, mismatched, invalid-date, and unsafe-count rows", async () => {
  const database = new DatabaseSync(":memory:");
  try {
    for (const { source } of await migrationSources()) database.exec(source);
    const insert = database.prepare(`
      INSERT INTO privacy_event_daily
        (day, event_name, input_kind, risk, action, channel, event_count, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const validRows = [
      ["web_check_started", "text", "none", "none"],
      ["web_check_completed", "link", "high", "none"],
      ["result_viewed", "qr", "unclear", "none"],
      ["next_action_selected", "none", "insufficient", "verify"],
    ];
    for (const [event, input, risk, action] of validRows) {
      insert.run("2026-08-27", event, input, risk, action, "web", 1, 1_777_000_000);
    }

    for (const invalid of [
      ["2026-08-27", "custom_event", "none", "none", "none", "web", 1, 1_777_000_000],
      ["2026-08-27", "web_check_started", "private-free-text", "none", "none", "web", 1, 1_777_000_000],
      ["2026-08-27", "web_check_started", "text", "high", "none", "web", 1, 1_777_000_000],
      ["2026-02-30", "web_check_started", "text", "none", "none", "web", 1, 1_777_000_000],
      ["2026-08-27", "web_check_started", "text", "none", "none", "web", 0, 1_777_000_000],
      ["2026-08-27", "web_check_started", "text", "none", "none", "web", 9_007_199_254_740_992, 1_777_000_000],
    ]) {
      assert.throws(() => insert.run(...invalid), /constraint failed/iu);
    }
  } finally {
    database.close();
  }
});

test("initial migration is safe after defensive Worker bootstrap", async () => {
  const migrations = await migrationSources();
  const database = new DatabaseSync(":memory:");
  try {
    database.exec(createPrivacyEventTable);
    database.prepare(`
      INSERT INTO privacy_event_daily
        (day, event_name, input_kind, risk, action, channel, event_count, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      "2026-08-28",
      "web_check_started",
      "screenshot",
      "none",
      "none",
      "web",
      1,
      1_777_000_001,
    );

    assert.doesNotThrow(() => database.exec(migrations[0].source));
    database.exec(migrations[1].source);
    assert.equal(
      database.prepare("SELECT event_count FROM privacy_event_daily").get().event_count,
      1,
      "applying tracked migrations after bootstrap must preserve aggregate rows",
    );
  } finally {
    database.close();
  }
});
