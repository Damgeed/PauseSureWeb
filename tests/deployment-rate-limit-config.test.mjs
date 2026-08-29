import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("uses a dedicated low-volume edge limit for deployment smoke writes", async () => {
  const source = await readFile(new URL("../wrangler.jsonc", import.meta.url), "utf8");
  assert.match(
    source,
    /"name"\s*:\s*"DEPLOYMENT_RATE_LIMITER"[\s\S]*?"namespace_id"\s*:\s*"1002"[\s\S]*?"limit"\s*:\s*5[\s\S]*?"period"\s*:\s*60/u,
  );
  assert.equal(
    (source.match(/"namespace_id"\s*:\s*"1002"/gu) ?? []).length,
    1,
    "the deployment limiter namespace must be declared exactly once",
  );
});
