import assert from "node:assert/strict";
import test from "node:test";
import {
  createDeploymentSmokeTable,
  handleDeploymentSmoke,
} from "../worker/deployment-smoke.ts";

const canonicalOrigin = "https://pausesure.com";
const expectedVersion = "pausesure-web-6.3.1";

function makeDatabase() {
  const calls = [];
  const database = {
    async exec(source) {
      calls.push({ type: "exec", source });
    },
    prepare(source) {
      return {
        bind(...values) {
          return {
            async run() {
              calls.push({ type: "run", source, values });
              return { success: true };
            },
          };
        },
      };
    },
  };
  return { calls, database };
}

function request(headers = {}, body) {
  return new Request(`${canonicalOrigin}/api/deployment-smoke`, {
    method: "POST",
    headers: {
      origin: canonicalOrigin,
      "x-pausesure-release-version": expectedVersion,
      ...headers,
    },
    body,
  });
}

test("writes only a fixed release marker and returns an empty 204", async () => {
  const { calls, database } = makeDatabase();
  const response = await handleDeploymentSmoke(request(), { DB: database }, expectedVersion);

  assert.equal(response.status, 204);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(await response.text(), "");
  assert.equal(calls.filter((call) => call.type === "exec").length, 1);
  assert.match(calls[0].source, /CREATE TABLE IF NOT EXISTS deployment_smoke/u);
  assert.equal(calls.filter((call) => call.type === "run").length, 1);
  const write = calls.find((call) => call.type === "run");
  assert.deepEqual(write.values.slice(0, 1), [expectedVersion]);
  assert.equal(typeof write.values[1], "number");
  assert.doesNotMatch(
    `${createDeploymentSmokeTable}\n${write.source}`,
    /\b(?:user_id|account_id|session_id|device_id|ip_address|url|phone_number|message|content|image|free_form)\b/iu,
    "the release marker must not add user, request, or checked-content fields",
  );
});

test("rejects untrusted, malformed, or body-bearing requests before D1", async () => {
  const cases = [
    new Request(`${canonicalOrigin}/api/deployment-smoke`, { method: "GET" }),
    request({ origin: "https://attacker.example" }),
    request({ "x-pausesure-release-version": "pausesure-web-0.0.0" }),
    request({ "content-type": "text/plain" }, "unexpected"),
  ];

  for (const candidate of cases) {
    const { calls, database } = makeDatabase();
    const response = await handleDeploymentSmoke(candidate, { DB: database }, expectedVersion);
    assert.ok([400, 403, 405].includes(response.status));
    assert.equal(calls.length, 0);
  }
});

test("fails closed when the D1 binding is missing", async () => {
  const response = await handleDeploymentSmoke(request(), {}, expectedVersion);
  assert.equal(response.status, 503);
  assert.match(await response.text(), /could not be completed/iu);
});
