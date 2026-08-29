import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const reputationOrigin = "https://pausesure-production.up.railway.app";

test("renders the public multi-page company site", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  const env = { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } };
  const ctx = { waitUntil() {}, passThroughOnException() {} };
  const routes = ["/", "/check", "/product", "/how-it-works", "/safety", "/resources", "/company", "/privacy", "/security", "/terms", "/support", "/account-deletion"];
  const releaseSource = await readFile(new URL("../app/release.ts", import.meta.url), "utf8");
  const appStoreEnabled = /stage:\s*"app-store",/.test(releaseSource);

  for (const route of routes) {
    const response = await worker.fetch(new Request(`http://localhost${route}`, { headers: { accept: "text/html" } }), env, ctx);
    assert.equal(response.status, 200, `${route} should render`);
    assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    assert.equal(response.headers.get("x-frame-options"), "DENY");
    assert.equal(response.headers.get("x-pausesure-web-version"), "pausesure-web-6.3.1");
    assert.equal(response.headers.get("referrer-policy"), "strict-origin-when-cross-origin");
    assert.match(response.headers.get("permissions-policy") ?? "", /camera=\(\)/);
    const csp = response.headers.get("content-security-policy") ?? "";
    assert.match(csp, /default-src 'self'/);
    assert.match(csp, /connect-src 'self' https:\/\/pausesure-production\.up\.railway\.app(?:;|$)/);
    assert.match(csp, /frame-ancestors 'none'/);
    assert.match(csp, /object-src 'none'/);
    assert.match(csp, /base-uri 'none'/);
    assert.match(csp, /img-src 'self' data: blob:/);
    assert.match(csp, /script-src-attr 'none'/);
    const nonceMatch = csp.match(/script-src 'nonce-([A-Za-z0-9+/=]+)' 'strict-dynamic'/);
    assert.ok(nonceMatch, "executable scripts should use a strict per-response nonce policy");
    assert.doesNotMatch(csp, /script-src[^;]*'unsafe-inline'/);
    assert.match(csp, /style-src 'self'(?:;|$)/);
    assert.match(csp, /style-src-attr 'none'/);
    assert.doesNotMatch(csp, /style-src[^;]*'unsafe-inline'/);
    assert.deepEqual(csp.match(/https?:\/\/[^\s;]+/g) ?? [], [reputationOrigin]);
    assert.doesNotMatch(csp, /\*/u, "CSP should not allow wildcard resource origins");
    const html = await response.text();
    const escapedNonce = nonceMatch[1].replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
    for (const match of html.matchAll(/<script\b([^>]*)>/giu)) {
      const attributes = match[1] ?? "";
      if (/\btype=["']application\/ld\+json["']/iu.test(attributes)) continue;
      assert.match(attributes, new RegExp(`\\bnonce=["']${escapedNonce}["']`, "u"), `${route} emitted an executable script without the renderer nonce`);
    }
    assert.match(html, /PauseSure/i);
    assert.doesNotMatch(html, /codex-preview/i);
    assert.doesNotMatch(html, /(?:OpenAI|ChatGPT)/i, `${route} should not expose hosting-platform branding`);
    assert.doesNotMatch(html, /mailto:/i, `${route} should not advertise an unverified email route`);
    assert.doesNotMatch(html, /\/(?:_next|_vinext)\/image\?/i, `${route} should use deploy-safe image URLs`);
    assert.doesNotMatch(html, /(?:in active development|still in development|pre-release|coming to iPhone|product in development|development-stage|private development|not yet listed|will appear when|when it becomes available|authorized testers|when available)/i, `${route} should use deliberate ready-state language`);
    assert.doesNotMatch(html, /(?:\blocal(?:ly)?\b|\bunavailable\b|\boffline\b|on (?:the )?device|on-device|in (?:this|your) browser|private browser|live URL intelligence|coming soon|coming up)/i, `${route} should not restore removed interface wording`);
    const canonicalUrl = `https://pausesure.com${route === "/" ? "" : route}`;
    assert.ok(html.includes(`<link rel="canonical" href="${canonicalUrl}"/>`), `${route} should have a self-referencing canonical URL`);
    assert.ok(html.includes(`<meta property="og:url" content="${canonicalUrl}"/>`), `${route} should have a route-specific Open Graph URL`);

    if (route === "/") {
      if (appStoreEnabled) {
        assert.match(html, /Download on the App Store/i);
      } else {
        assert.match(html, /Check something now/i);
        assert.doesNotMatch(html, /Check iPhone availability/i);
        assert.doesNotMatch(html, /Download on the App Store/i);
      }
    }

    if (route === "/safety") {
      assert.match(html, /Protection setup check/i);
      assert.match(html, /It checks setup—not your private content/i);
      assert.match(html, /does not inspect calls, messages, contacts, photos, links, screenshots, QR codes, or audio/i);
      assert.match(html, /Protection tools/i);
      assert.match(html, /does not record cellular calls or analyze live call audio/i);
    }

    if (route === "/check") {
      assert.match(html, /does not open the submitted site/iu);
      assert.match(html, /currently responds, has been deactivated, or later returns/iu);
      assert.match(html, /role="tablist"/i);
      assert.match(html, /role="tab"[^>]*aria-controls="checker-input-panel"/i);
      assert.match(html, /role="tabpanel"[^>]*aria-labelledby="checker-tab-text"/i);
      assert.match(html, /class="checker-result-live"[^>]*aria-live="polite"/i);
      const sensitiveControl = html.match(/<textarea\b[^>]*id="check-content"[^>]*>/iu)?.[0] ?? "";
      assert.match(sensitiveControl, /\bautocomplete="off"/iu);
      assert.match(sensitiveControl, /\bautocorrect="off"/iu);
      assert.match(sensitiveControl, /\bautocapitalize="none"/iu);
      assert.match(sensitiveControl, /\bspellcheck="false"/iu);
      assert.match(sensitiveControl, /\bmaxlength="16000"/iu);
      assert.match(html, /submitted text, phone number, or destination/iu);
    }

    if (route === "/privacy") {
      assert.match(html, /text, phone number, destination, or screenshot you deliberately submit/iu);
      assert.match(html, /Google Cloud Vision for text recognition/iu);
      assert.match(html, /does not retain the screenshot or extracted text in application data or request logs/iu);
      assert.match(html, /Google Cloud processes submitted screenshots for Vision text recognition/iu);
      assert.match(html, /retained for up to 180 days/iu);
    }

    if (route === "/product") {
      assert.match(html, /server text recognition/iu);
      assert.match(html, /same shared PauseSure fraud engine and Google Web Risk checks/iu);
      assert.match(html, /Pasted wording remains available as a fallback/iu);
    }

    if (route === "/how-it-works") {
      assert.match(html, /Screenshot text recognition and every supported input feed the same shared analysis contract/iu);
    }
  }

  const missing = await worker.fetch(new Request("http://localhost/not-a-pause-sure-page", { headers: { accept: "text/html" } }), env, ctx);
  assert.equal(missing.status, 404, "unknown routes should return a real 404");
  assert.match(await missing.text(), /This link does not lead to a PauseSure page/i);
});

test("does not grant the renderer nonce to untrusted response scripts", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("nonce-test", `${process.pid}-${Date.now()}`);
  const { withSecurityHeaders } = await import(workerUrl.href);
  assert.equal(typeof withSecurityHeaders, "function");
  const response = await withSecurityHeaders(new Response(
    "<html><body><script>globalThis.injected = true</script></body></html>",
    { headers: { "content-type": "text/html; charset=utf-8" } },
  ), "trusted-renderer-nonce");
  const html = await response.text();
  assert.doesNotMatch(html, /<script[^>]*\bnonce=/iu);
  assert.match(response.headers.get("content-security-policy") ?? "", /'nonce-trusted-renderer-nonce'/u);
});

test("uses only the canonical production analysis route for checker decisions", async () => {
  const source = await readFile(new URL("../app/check/checker-client.tsx", import.meta.url), "utf8");
  assert.match(source, /\/v1\/analysis\/check/);
  assert.match(source, /\/v1\/analysis\/check-image/);
  assert.match(source, /\{ kind: "screenshot", image \}/u, "the image route should use the canonical request envelope");
  assert.match(source, /parseAnalysisResponse\(responsePayload, expectedKind\)/u, "all routes must use the shared response-contract parser");
  assert.match(source, /standardAnalysisTimeoutMilliseconds = 15_000/u);
  assert.match(source, /imageAnalysisTimeoutMilliseconds = 25_000/u);
  assert.match(source, /controller,\s*imageAnalysisTimeoutMilliseconds,/u, "screenshot OCR should have a bounded timeout that covers the provider chain");
  assert.match(source, /fetch\(endpoint,/u, "the fixed route selected by the checker must be the route fetched");
  assert.match(source, /redirect:\s*"error"/u, "submitted content must never follow an HTTP redirect");
  assert.match(source, /credentials:\s*"omit"/u);
  assert.match(source, /referrerPolicy:\s*"no-referrer"/u);
  assert.match(source, /cache:\s*"no-store"/u);
  assert.match(source, /response\.url\s*!==\s*endpoint/u, "the analysis response must come from the selected fixed endpoint");
  assert.match(source, /setNormalizedImage\(null\)/u, "clear and mode changes must release prepared image bytes");
  assert.match(source, /URL\.revokeObjectURL\(imageUrl\)/u, "preview object URLs must be revoked");
  assert.match(
    source,
    /if \(inputKind === "screenshot"\) \{\s*setValue\(""\);\s*setNormalizedImage\(null\);[\s\S]*setImageUrl\(null\);[\s\S]*imageInput\.current\.value = "";/u,
    "successful screenshot checks must release pasted text, the base64 payload, preview URL, and file input",
  );
  const sensitiveControlSources = source
    .split("\n")
    .filter((line) => line.includes("id=\"check-content\"") && (line.includes("<input") || line.includes("<textarea")));
  assert.equal(sensitiveControlSources.length, 2);
  for (const tag of sensitiveControlSources) {
    assert.match(tag, /autoComplete="off"/u);
    assert.match(tag, /autoCorrect="off"/u);
    assert.match(tag, /autoCapitalize="none"/u);
    assert.match(tag, /spellCheck=\{false\}/u);
    assert.match(tag, /maxLength=\{maximumCheckValueCharacters\}/u);
  }
  assert.match(source, /const analyticsConsent = useRef<AnalyticsConsent>\(\{ enabled: false \}\)/u);
  assert.match(
    source,
    /function updateAnalytics\(enabled: boolean\) \{\s*analyticsConsent\.current\.enabled = enabled;\s*setAnalyticsEnabled\(enabled\);/u,
    "opt-out must update the stable consent gate before React schedules a rerender",
  );
  const analyticsCalls = source.split("\n").filter((line) => line.includes("trackPrivacyEvent("));
  assert.equal(analyticsCalls.length, 5);
  assert.ok(
    analyticsCalls.every((line) => line.includes("analyticsConsent.current")),
    "every event emission must read live consent instead of a rendered boolean closure",
  );
  assert.doesNotMatch(source, /analyzeCheck|combineReputationDecision|\/v1\/reputation\/check/);
});

test("permits browser reputation requests only to the production gateway", async () => {
  const headers = await readFile(new URL("../public/_headers", import.meta.url), "utf8");
  const cspLine = headers.split("\n").find((line) => line.includes("Content-Security-Policy:")) ?? "";

  assert.match(cspLine, /connect-src 'self' https:\/\/pausesure-production\.up\.railway\.app(?:;|$)/);
  assert.match(cspLine, /script-src 'none'/);
  assert.doesNotMatch(cspLine, /script-src[^;]*'unsafe-inline'/);
  assert.deepEqual(cspLine.match(/https?:\/\/[^\s;]+/g) ?? [], [reputationOrigin]);
  assert.doesNotMatch(cspLine, /\*/u);
});

test("publishes a schema-valid Scam Pulse feed backed by official sources", async () => {
  const raw = await readFile(new URL("../public/scam-pulse/v1.json", import.meta.url), "utf8");
  const feed = JSON.parse(raw);
  const allowedSourceHosts = new Set([
    "pausesure.com",
    "www.pausesure.com",
    "consumer.ftc.gov",
    "www.ftc.gov",
    "ic3.gov",
    "www.ic3.gov",
    "scamshield.gov.sg",
    "www.scamshield.gov.sg",
    "ncsc.gov.uk",
    "www.ncsc.gov.uk",
  ]);

  assert.equal(feed.schemaVersion, 1);
  assert.equal(feed.sourceID, "pausesure-curated-v1");
  assert.ok(Number.isFinite(Date.parse(feed.generatedAt)));
  assert.ok(Date.parse(feed.generatedAt) <= Date.now() + 5 * 60 * 1000, "feed generation time must not be in the future");
  assert.ok(Date.parse(feed.generatedAt) >= Date.now() - 14 * 24 * 60 * 60 * 1000, "reviewed feed must be regenerated at least every 14 days");
  assert.ok(Array.isArray(feed.campaigns));
  assert.ok(feed.campaigns.length >= 4);
  assert.ok(feed.campaigns.length <= 250);

  const identifiers = new Set();
  const representedHosts = new Set();
  for (const campaign of feed.campaigns) {
    assert.equal(typeof campaign.id, "string");
    assert.ok(campaign.id.length > 0);
    assert.ok(!identifiers.has(campaign.id), `duplicate campaign id: ${campaign.id}`);
    identifiers.add(campaign.id);
    assert.ok(campaign.title.length > 0 && campaign.title.length <= 160);
    assert.ok(campaign.summary.length > 0 && campaign.summary.length <= 600);
    assert.ok(campaign.category.length > 0 && campaign.category.length <= 80);
    assert.ok(Array.isArray(campaign.regions) && campaign.regions.length <= 20);
    assert.ok(campaign.regions.every((region) => typeof region === "string" && region.length > 0 && region.length <= 80));
    assert.ok(Number.isFinite(Date.parse(campaign.publishedAt)));
    assert.ok(Date.parse(campaign.publishedAt) <= Date.now() + 5 * 60 * 1000, `${campaign.id} publication time must not be in the future`);
    const source = new URL(campaign.sourceURL);
    assert.equal(source.protocol, "https:");
    assert.ok(allowedSourceHosts.has(source.hostname), `${campaign.id} must use a reviewed government source host`);
    representedHosts.add(source.hostname);
  }
  assert.ok(representedHosts.size >= 3, "feed should retain independent official source coverage");

  const headers = await readFile(new URL("../public/_headers", import.meta.url), "utf8");
  assert.match(headers, /\/scam-pulse\/\*\.json[\s\S]*Content-Type:\s*application\/json; charset=utf-8/);
  assert.match(headers, /\/scam-pulse\/\*\.json[\s\S]*Cache-Control:\s*public, max-age=300, must-revalidate/);
  assert.match(headers, /\/_next\/static\/\*[\s\S]*Cache-Control:\s*public, max-age=31536000, immutable/);
});

test("accepts only same-origin, allowlisted, content-free analytics", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("analytics-test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  const batches = [];
  const runs = [];
  const schemaExecutes = [];
  const rateLimitKeys = [];
  const DB = {
    async exec(sql) { schemaExecutes.push(sql); return { count: 1, duration: 0 }; },
    prepare(sql) {
      return {
        sql,
        values: [],
        bind(...values) { this.values = values; return this; },
        async run() { runs.push(this); return { success: true }; },
      };
    },
    async batch(statements) { batches.push(statements); return statements.map(() => ({ success: true })); },
  };
  const ANALYTICS_RATE_LIMITER = {
    async limit({ key }) { rateLimitKeys.push(key); return { success: true }; },
  };
  const env = { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) }, DB, ANALYTICS_RATE_LIMITER };
  const ctx = { waitUntil() {}, passThroughOnException() {} };
  const day = new Date().toISOString().slice(0, 10);
  const validBody = { events: [{ schemaVersion: 1, name: "web_check_completed", day, count: 1, dimensions: { input: "link", risk: "high", channel: "web" } }] };
  const analyticsHeaders = {
    origin: "https://pausesure.com",
    "content-type": "application/json",
    "cf-connecting-ip": "192.0.2.10",
  };
  const valid = await worker.fetch(new Request("https://pausesure.com/api/privacy-events", {
    method: "POST",
    headers: analyticsHeaders,
    body: JSON.stringify(validBody),
  }), env, ctx);
  assert.equal(valid.status, 204);
  assert.equal(schemaExecutes.length, 1, "the final constrained aggregate table should initialize once per D1 binding");
  assert.match(schemaExecutes[0], /^\s*CREATE TABLE IF NOT EXISTS privacy_event_daily/u);
  assert.match(schemaExecutes[0], /event_count INTEGER NOT NULL CHECK/u);
  assert.equal(batches.length, 1);
  assert.equal(batches[0].length, 1, "only aggregate upserts should run in the request path");
  assert.ok(batches[0][0].values.every((value) => !String(value).includes("http")), "aggregate values should contain no checked URL");
  assert.ok(batches[0][0].values.every((value) => value !== "192.0.2.10"), "the edge rate-limit key must never enter D1");
  assert.deepEqual(rateLimitKeys, ["privacy-events:v4:192.0.2.10"]);

  const ipv6RateLimitKeys = [];
  const ipv6Env = {
    ...env,
    DB: { ...DB, async batch(statements) { return statements.map(() => ({ success: true })); } },
    ANALYTICS_RATE_LIMITER: {
      async limit({ key }) { ipv6RateLimitKeys.push(key); return { success: true }; },
    },
  };
  for (const address of ["2001:db8:abcd:42::1", "2001:db8:abcd:42:ffff::2"]) {
    const response = await worker.fetch(new Request("https://pausesure.com/api/privacy-events", {
      method: "POST",
      headers: { ...analyticsHeaders, "cf-connecting-ip": address },
      body: JSON.stringify(validBody),
    }), ipv6Env, ctx);
    assert.equal(response.status, 204);
  }
  assert.deepEqual(ipv6RateLimitKeys, [
    "privacy-events:v6:2001:0db8:abcd:0042/64",
    "privacy-events:v6:2001:0db8:abcd:0042/64",
  ], "IPv6 addresses in one delegated /64 must share an abuse-control key");

  const identifying = await worker.fetch(new Request("https://pausesure.com/api/privacy-events", {
    method: "POST",
    headers: analyticsHeaders,
    body: JSON.stringify({ events: [{ ...validBody.events[0], rawContent: "secret message" }] }),
  }), env, ctx);
  assert.equal(identifying.status, 400);

  const impossibleDimensions = await worker.fetch(new Request("https://pausesure.com/api/privacy-events", {
    method: "POST",
    headers: analyticsHeaders,
    body: JSON.stringify({ events: [{ schemaVersion: 1, name: "web_check_started", day, count: 1, dimensions: { risk: "high", action: "mark_safe", channel: "web" } }] }),
  }), env, ctx);
  assert.equal(impossibleDimensions.status, 400);

  const amplifiedCount = await worker.fetch(new Request("https://pausesure.com/api/privacy-events", {
    method: "POST",
    headers: analyticsHeaders,
    body: JSON.stringify({ events: [{ ...validBody.events[0], count: 5 }] }),
  }), env, ctx);
  assert.equal(amplifiedCount.status, 400);

  const inheritedEventName = await worker.fetch(new Request("https://pausesure.com/api/privacy-events", {
    method: "POST",
    headers: analyticsHeaders,
    body: JSON.stringify({ events: [{ schemaVersion: 1, name: "constructor", day, count: 1, dimensions: {} }] }),
  }), env, ctx);
  assert.equal(inheritedEventName.status, 400, "prototype properties must not bypass the exact event allowlist");

  const crossOrigin = await worker.fetch(new Request("https://pausesure.com/api/privacy-events", {
    method: "POST",
    headers: { origin: "https://attacker.example", "content-type": "application/json" },
    body: JSON.stringify(validBody),
  }), env, ctx);
  assert.equal(crossOrigin.status, 403);

  const wrongMediaType = await worker.fetch(new Request("https://pausesure.com/api/privacy-events", {
    method: "POST",
    headers: { ...analyticsHeaders, "content-type": "application/json-p" },
    body: JSON.stringify(validBody),
  }), env, ctx);
  assert.equal(wrongMediaType.status, 415);

  let pulledBytes = 0;
  let streamCancelled = false;
  const oversizedBody = new ReadableStream({
    pull(controller) {
      pulledBytes += 1_024;
      controller.enqueue(new Uint8Array(1_024));
    },
    cancel() { streamCancelled = true; },
  }, { highWaterMark: 0 });
  const oversized = await worker.fetch(new Request("https://pausesure.com/api/privacy-events", {
    method: "POST",
    headers: analyticsHeaders,
    body: oversizedBody,
    duplex: "half",
  }), env, ctx);
  assert.equal(oversized.status, 413);
  assert.ok(streamCancelled, "oversized chunked bodies should be cancelled immediately");
  assert.ok(pulledBytes <= 5_120, `the worker should stop near the 4096-byte limit, read ${pulledBytes} bytes`);
  assert.equal(batches.length, 1, "rejected requests must not touch D1");

  const rateLimitedEnv = {
    ...env,
    ANALYTICS_RATE_LIMITER: { async limit() { return { success: false }; } },
  };
  const rateLimited = await worker.fetch(new Request("https://pausesure.com/api/privacy-events", {
    method: "POST",
    headers: analyticsHeaders,
    body: JSON.stringify(validBody),
  }), rateLimitedEnv, ctx);
  assert.equal(rateLimited.status, 429);
  assert.equal(rateLimited.headers.get("retry-after"), "60");
  assert.equal(batches.length, 1, "rate-limited requests must not touch D1");

  const unavailableLimiter = await worker.fetch(new Request("https://pausesure.com/api/privacy-events", {
    method: "POST",
    headers: analyticsHeaders,
    body: JSON.stringify(validBody),
  }), { ...env, ANALYTICS_RATE_LIMITER: undefined }, ctx);
  assert.equal(unavailableLimiter.status, 503, "analytics must fail closed when edge abuse protection is unavailable");
  assert.equal(batches.length, 1, "unprotected requests must not touch D1");

  const failedLimiter = await worker.fetch(new Request("https://pausesure.com/api/privacy-events", {
    method: "POST",
    headers: analyticsHeaders,
    body: JSON.stringify(validBody),
  }), { ...env, ANALYTICS_RATE_LIMITER: { async limit() { throw new Error("edge unavailable"); } } }, ctx);
  assert.equal(failedLimiter.status, 503, "analytics must fail closed when the edge limiter errors");
  assert.equal(batches.length, 1, "limiter failures must not touch D1");

  const logged = [];
  const originalConsoleError = console.error;
  console.error = (...values) => { logged.push(values); };
  let failedDatabase;
  try {
    failedDatabase = await worker.fetch(new Request("https://pausesure.com/api/privacy-events", {
      method: "POST",
      headers: analyticsHeaders,
      body: JSON.stringify(validBody),
    }), {
      ...env,
      DB: { ...DB, async batch() { throw new Error("sensitive provider detail"); } },
    }, ctx);
  } finally {
    console.error = originalConsoleError;
  }
  assert.equal(failedDatabase.status, 503, "D1 failures must stay inside the generic response boundary");
  assert.equal(failedDatabase.headers.get("cache-control"), "no-store");
  assert.match(failedDatabase.headers.get("content-security-policy") ?? "", /default-src 'self'/u);
  assert.deepEqual(await failedDatabase.json(), { error: "Request could not be completed." });
  assert.deepEqual(logged, [["[PauseSure] Request handling failed."]]);

  assert.equal(schemaExecutes.length, 3, "each distinct D1 binding should initialize at most once");
  assert.ok(schemaExecutes.every((sql) => /^\s*CREATE TABLE IF NOT EXISTS privacy_event_daily/u.test(sql)));
  assert.equal(runs.length, 0, "retention cleanup must not run in a user request");
});

test("runs aggregate retention cleanup from the daily scheduled handler", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("retention-test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  const runs = [];
  const schemaExecutes = [];
  const DB = {
    async exec(sql) { schemaExecutes.push(sql); return { count: 1, duration: 0 }; },
    prepare(sql) {
      return {
        sql,
        values: [],
        bind(...values) { this.values = values; return this; },
        async run() { runs.push(this); return { success: true }; },
      };
    },
    async batch() { throw new Error("scheduled retention should not batch analytics events"); },
  };
  const scheduledWork = [];
  worker.scheduled({}, { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) }, DB }, {
    waitUntil(promise) { scheduledWork.push(promise); },
    passThroughOnException() {},
  });
  await Promise.all(scheduledWork);

  assert.equal(schemaExecutes.length, 1);
  assert.match(schemaExecutes[0], /^\s*CREATE TABLE IF NOT EXISTS privacy_event_daily/u);
  assert.equal(runs.length, 1);
  assert.match(runs[0].sql, /^DELETE FROM privacy_event_daily WHERE day <= \?$/);
  assert.match(runs[0].values[0], /^\d{4}-\d{2}-\d{2}$/);

  const logged = [];
  const originalConsoleError = console.error;
  console.error = (...values) => logged.push(values);
  try {
    const failedWork = [];
    worker.scheduled({}, {
      ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
      DB: {
        prepare() {
          return {
            bind() { return this; },
            async run() { throw new Error("private row value"); },
          };
        },
        async batch() { throw new Error("not used"); },
      },
    }, {
      waitUntil(promise) { failedWork.push(promise); },
      passThroughOnException() {},
    });
    await assert.rejects(Promise.all(failedWork), /Scheduled analytics retention cleanup failed/);
  } finally {
    console.error = originalConsoleError;
  }
  assert.deepEqual(logged, [["[PauseSure] Scheduled analytics retention cleanup failed."]]);
});

test("ships optimized brand imagery and product film", async () => {
  for (const path of ["brand/pausesure-logo.png", "brand/protect-myself.png", "brand/help-someone.png"]) {
    const data = await readFile(new URL(`../public/${path}`, import.meta.url));
    assert.deepEqual([...data.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10], `${path} should be a PNG`);
    assert.ok(data.length > 10_000, `${path} should not be an empty placeholder`);
  }

  for (const path of ["../public/og.png", "../app/icon.png", "../app/apple-icon.png"]) {
    const data = await readFile(new URL(path, import.meta.url));
    assert.deepEqual([...data.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10], `${path} should be a PNG`);
    assert.ok(data.length > 10_000, `${path} should not be an empty placeholder`);
  }

  const video = await readFile(new URL("../public/pausesure-intro.mp4", import.meta.url));
  assert.equal(video.subarray(4, 8).toString("ascii"), "ftyp", "the product film should be a valid MP4");
  assert.ok(video.length > 250_000, "the product film should contain real optimized video data");
});

test("keeps navigation visible without hiding anchored content", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(css, /\.site-header\s*\{[^}]*position:\s*sticky;[^}]*top:\s*0;/s);
  assert.match(css, /html\s*\{[^}]*scroll-padding-top:/s);
  assert.match(css, /\.site-header-overlay\s*\{[^}]*margin-bottom:\s*var\(--site-nav-overlap\);/s);
  assert.doesNotMatch(css, /\.site-header-overlay\s*\{[^}]*position:\s*absolute;/s);
  assert.doesNotMatch(css, /\.legal-header\s+\.site-header\s*\{[^}]*position:\s*static;/s);
});

test("dismisses the mobile navigation without weakening keyboard access", async () => {
  const source = await readFile(new URL("../app/mobile-navigation.tsx", import.meta.url), "utf8");
  assert.match(source, /document\.addEventListener\("pointerdown",\s*handlePointerDown\)/);
  assert.match(source, /!event\.composedPath\(\)\.includes\(details\)/);
  assert.match(source, /event\.key\s*===\s*"Escape"/);
  assert.match(source, /closeMenu\(true\)/, "Escape should close the menu and restore summary focus");
  assert.match(source, /aria-expanded=\{isOpen\}/);
  assert.match(source, /onClick=\{\(\)\s*=>\s*closeMenu\(\)\}/, "menu links should close the menu after activation");
  assert.match(source, /removeEventListener\("pointerdown",\s*handlePointerDown\)/, "outside-click listeners should be cleaned up");
});

test("explains bare and incomplete link formats in the checker", async () => {
  const source = await readFile(new URL("../app/check/checker-client.tsx", import.meta.url), "utf8");
  assert.match(source, /pausesure\.com or https:\/\/example\.com\/account\/verify/);
  assert.match(source, /No http:\/\/, https:\/\/, or www\. is needed/);
  assert.match(source, /incomplete ending such as www\.pausesure will be flagged/);
  assert.match(source, /aria-describedby=\{kind === "link" \? "link-format-help" : undefined\}/);
});
