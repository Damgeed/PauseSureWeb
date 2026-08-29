import assert from "node:assert/strict";
import test from "node:test";
import {
  handleDeploymentSmoke,
} from "../worker/deployment-smoke.ts";

const canonicalOrigin = "https://pausesure.com";
const expectedVersion = "pausesure-web-6.3.1";
const requestHeaders = {
  origin: canonicalOrigin,
  "x-pausesure-release-version": expectedVersion,
};

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
    headers: { ...requestHeaders, ...headers },
    body,
  });
}

function streamedRequest(chunks) {
  return new Request(`${canonicalOrigin}/api/deployment-smoke`, {
    method: "POST",
    headers: requestHeaders,
    body: new ReadableStream({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(chunk);
        controller.close();
      },
    }),
    duplex: "half",
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
  assert.equal(calls.filter((call) => call.type === "exec").length, 0);
  assert.equal(calls.filter((call) => call.type === "run").length, 1);
  const write = calls.find((call) => call.type === "run");
  assert.deepEqual(write.values.slice(0, 1), [expectedVersion]);
  assert.equal(typeof write.values[1], "number");
  assert.doesNotMatch(
    write.source,
    /\b(?:user_id|account_id|session_id|device_id|ip_address|url|phone_number|message|content|image|free_form)\b/iu,
    "the release marker must not add user, request, or checked-content fields",
  );
});

test("uses reviewed migrations as the only deployment-smoke schema authority", async () => {
  const { calls, database } = makeDatabase();
  const { limiter } = makeRateLimiter();
  const response = await handleDeploymentSmoke(request(), {
    DB: database,
    DEPLOYMENT_RATE_LIMITER: limiter,
  }, expectedVersion);

  assert.equal(response.status, 204);
  assert.equal(calls.some((call) => /\b(?:CREATE|ALTER|DROP)\b/iu.test(call.source)), false);
});

test("accepts a transport-level stream that contains zero body bytes", async () => {
  const { calls, database } = makeDatabase();
  const { calls: limiterCalls, limiter } = makeRateLimiter();
  const response = await handleDeploymentSmoke(streamedRequest([]), {
    DB: database,
    DEPLOYMENT_RATE_LIMITER: limiter,
  }, expectedVersion);

  assert.equal(response.status, 204);
  assert.deepEqual(limiterCalls, [{ key: "deployment-smoke" }]);
  assert.equal(calls.filter((call) => call.type === "run").length, 1);
});

test("routes the production smoke through the Worker security boundary", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("deployment-smoke-test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  const { calls, database } = makeDatabase();
  const { limiter } = makeRateLimiter();
  const response = await worker.fetch(streamedRequest([]), {
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
    streamedRequest([new TextEncoder().encode("unexpected")]),
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
  assert.equal(missingDatabase.headers.get("x-pausesure-release-phase"), "bindings");

  const { database } = makeDatabase();
  const missingLimiter = await handleDeploymentSmoke(request(), { DB: database }, expectedVersion);
  assert.equal(missingLimiter.status, 503);
  assert.equal(missingLimiter.headers.get("x-pausesure-release-phase"), "bindings");
});

test("reports only the failed infrastructure boundary on closed service failures", async () => {
  const { database } = makeDatabase();
  const limiterFailure = await handleDeploymentSmoke(request(), {
    DB: database,
    DEPLOYMENT_RATE_LIMITER: { async limit() { throw new Error("private provider detail"); } },
  }, expectedVersion);
  assert.equal(limiterFailure.status, 503);
  assert.equal(limiterFailure.headers.get("x-pausesure-release-phase"), "limiter");
  assert.doesNotMatch(await limiterFailure.text(), /private provider detail/u);

  const databaseFailure = await handleDeploymentSmoke(request(), {
    DB: { async exec() { throw new Error("private database detail"); } },
    DEPLOYMENT_RATE_LIMITER: makeRateLimiter().limiter,
  }, expectedVersion);
  assert.equal(databaseFailure.status, 503);
  assert.equal(databaseFailure.headers.get("x-pausesure-release-phase"), "database");
  assert.doesNotMatch(await databaseFailure.text(), /private database detail/u);
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
