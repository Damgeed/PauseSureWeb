import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

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
      "0002_deployment_smoke.sql",
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
    database.exec(migrations[2].source);
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

    const deploymentColumns = database
      .prepare("PRAGMA table_info(deployment_smoke)")
      .all()
      .map((column) => column.name);
    assert.deepEqual(deploymentColumns, ["id", "web_version", "checked_at"]);
    database.prepare(`
      INSERT INTO deployment_smoke (id, web_version, checked_at)
      VALUES (?, ?, ?)
    `).run(1, "pausesure-web-6.3.0", 1_777_000_001);
    assert.deepEqual(
      { ...database.prepare("SELECT id, web_version, checked_at FROM deployment_smoke").get() },
      { id: 1, web_version: "pausesure-web-6.3.0", checked_at: 1_777_000_001 },
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

    const deploymentInsert = database.prepare(`
      INSERT INTO deployment_smoke (id, web_version, checked_at)
      VALUES (?, ?, ?)
    `);
    for (const invalid of [
      [2, "pausesure-web-6.3.0", 1_777_000_000],
      [1, "private-free-text", 1_777_000_000],
      [1, "pausesure-web-6.3.0", 0],
    ]) {
      assert.throws(() => deploymentInsert.run(...invalid), /constraint failed/iu);
    }
  } finally {
    database.close();
  }
});

test("keeps tracked migrations as the only D1 schema authority", async () => {
  const workerPaths = (await readdir(new URL("../worker/", import.meta.url)))
    .filter((workerPath) => workerPath.endsWith(".ts"));
  assert.ok(workerPaths.length > 0, "the Worker source directory must be covered");
  for (const workerPath of workerPaths) {
    const source = await readFile(new URL(`../worker/${workerPath}`, import.meta.url), "utf8");
    assert.doesNotMatch(source, /\b(?:CREATE|ALTER|DROP)\s+(?:TABLE|INDEX)\b/iu, `${workerPath} must not contain DDL`);
    assert.doesNotMatch(source, /\.exec\s*\(/u, `${workerPath} must not execute unprepared schema SQL`);
  }
});
