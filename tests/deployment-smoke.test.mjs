import assert from "node:assert/strict";
import test from "node:test";
import {
  createDeploymentSmokeTable,
  handleDeploymentSmoke,
} from "../worker/deployment-smoke.ts";

const canonicalOrigin = "https://pausesure.com";
const expectedVersion = "pausesure-web-6.3.0";

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

function makeRateLimiter(success = true) {
  const calls = [];
  return {
    calls,
    limiter: {
      async limit(value) {
        calls.push(value);
        return { success };
      },
    },
  };
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

test("writes only a fixed, globally rate-limited release marker and returns an empty 204", async () => {
  const { calls, database } = makeDatabase();
  const { calls: limiterCalls, limiter } = makeRateLimiter();
  const response = await handleDeploymentSmoke(request(), {
    DB: database,
    DEPLOYMENT_RATE_LIMITER: limiter,
  }, expectedVersion);

  assert.equal(response.status, 204);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(await response.text(), "");
  assert.deepEqual(limiterCalls, [{ key: "deployment-smoke" }]);
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

test("routes the production smoke through the Worker security boundary", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("deployment-smoke-test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  const { calls, database } = makeDatabase();
  const { limiter } = makeRateLimiter();
  const response = await worker.fetch(request(), {
    ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
    DB: database,
    DEPLOYMENT_RATE_LIMITER: limiter,
  }, {
    waitUntil() {},
    passThroughOnException() {},
  });

  assert.equal(response.status, 204);
  assert.equal(response.headers.get("x-pausesure-web-version"), expectedVersion);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.match(response.headers.get("content-security-policy") ?? "", /default-src 'self'/u);
  assert.equal(calls.filter((call) => call.type === "run").length, 1);
});

test("rejects untrusted, malformed, or body-bearing requests before edge or D1 work", async () => {
  const cases = [
    new Request(`${canonicalOrigin}/api/deployment-smoke`, { method: "GET" }),
    request({ origin: "https://attacker.example" }),
    request({ "x-pausesure-release-version": "pausesure-web-0.0.0" }),
    request({ "content-type": "text/plain" }, "unexpected"),
  ];

  for (const candidate of cases) {
    const { calls, database } = makeDatabase();
    const { calls: limiterCalls, limiter } = makeRateLimiter();
    const response = await handleDeploymentSmoke(candidate, {
      DB: database,
      DEPLOYMENT_RATE_LIMITER: limiter,
    }, expectedVersion);
    assert.ok([400, 403, 405].includes(response.status));
    assert.equal(calls.length, 0);
    assert.equal(limiterCalls.length, 0);
  }
});

test("fails closed when D1 or the dedicated edge limiter is missing", async () => {
  const { limiter } = makeRateLimiter();
  const missingDatabase = await handleDeploymentSmoke(request(), {
    DEPLOYMENT_RATE_LIMITER: limiter,
  }, expectedVersion);
  assert.equal(missingDatabase.status, 503);

  const { database } = makeDatabase();
  const missingLimiter = await handleDeploymentSmoke(request(), { DB: database }, expectedVersion);
  assert.equal(missingLimiter.status, 503);
});

test("does not touch D1 when the deployment smoke rate limit is exhausted", async () => {
  const { calls, database } = makeDatabase();
  const { limiter } = makeRateLimiter(false);
  const response = await handleDeploymentSmoke(request(), {
    DB: database,
    DEPLOYMENT_RATE_LIMITER: limiter,
  }, expectedVersion);

  assert.equal(response.status, 429);
  assert.equal(response.headers.get("retry-after"), "60");
  assert.equal(calls.length, 0);
});
