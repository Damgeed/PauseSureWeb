import assert from "node:assert/strict";

const canonicalOrigin = "https://pausesure.com";
const analysisOrigin = "https://pausesure-production.up.railway.app";
const analysisEndpoint = `${analysisOrigin}/v1/analysis/check`;
const requestTimeoutMilliseconds = 20_000;

async function request(url, init = {}) {
  const signal = AbortSignal.timeout(requestTimeoutMilliseconds);
  return fetch(url, { ...init, signal });
}

function assertIncludesToken(value, token, header) {
  assert.ok(
    value.toLowerCase().split(",").map((part) => part.trim()).includes(token),
    `${header} must include ${token}`,
  );
}

async function verifyRedirect(url, expectedLocation) {
  const response = await request(url, { redirect: "manual" });
  assert.equal(response.status, 308, `${url} must return 308`);
  assert.equal(response.headers.get("location"), expectedLocation, `${url} must redirect to the canonical HTTPS origin`);
}

function verifyHtmlHeaders(response) {
  assert.equal(response.headers.get("strict-transport-security"), "max-age=31536000");
  assert.equal(response.headers.get("cross-origin-opener-policy"), "same-origin");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("x-frame-options"), "DENY");
  assert.equal(response.headers.get("x-pausesure-web-version"), "pausesure-web-6.2.0");
  assertIncludesToken(response.headers.get("cache-control") ?? "", "private", "Cache-Control");
  assertIncludesToken(response.headers.get("cache-control") ?? "", "no-store", "Cache-Control");

  const csp = response.headers.get("content-security-policy") ?? "";
  assert.match(csp, /default-src 'self'/u);
  assert.match(csp, /connect-src 'self' https:\/\/pausesure-production\.up\.railway\.app(?:;|$)/u);
  assert.match(csp, /script-src 'nonce-([A-Za-z0-9+/=]+)' 'strict-dynamic'/u);
  assert.match(csp, /script-src-attr 'none'/u);
  assert.match(csp, /frame-ancestors 'none'/u);
  assert.doesNotMatch(csp, /script-src[^;]*'unsafe-inline'/u);
  return csp.match(/script-src 'nonce-([A-Za-z0-9+/=]+)' 'strict-dynamic'/u)[1];
}

async function verifyCheckerBundle(html) {
  // Vinext can advertise route-specific chunks in the rendered RSC payload
  // instead of emitting every chunk as an initial script tag.
  const scriptSources = [...html.matchAll(/["'](\/_next\/static\/chunks\/[A-Za-z0-9_~.-]+\.js)["']/gu)]
    .map((match) => new URL(match[1], canonicalOrigin).toString())
    .filter((url, index, urls) => urls.indexOf(url) === index);
  assert.ok(scriptSources.length > 0, "The checker page must load executable assets");

  let sharedCheckerFound = false;
  for (const source of scriptSources) {
    const response = await request(source, { redirect: "error" });
    assert.equal(response.status, 200, `${source} must load`);
    const javascript = await response.text();
    if (javascript.includes(analysisEndpoint) && javascript.includes("google_web_risk")) {
      sharedCheckerFound = true;
      break;
    }
  }
  assert.ok(sharedCheckerFound, "The deployed checker bundle must use the shared Railway/Web Risk contract");
}

function verifyExecutableScriptNonces(html, expectedNonce) {
  for (const match of html.matchAll(/<script\b([^>]*)>/giu)) {
    const attributes = match[1] ?? "";
    if (/\btype=["']application\/ld\+json["']/iu.test(attributes)) continue;
    assert.match(attributes, new RegExp(`\\bnonce=["']${expectedNonce.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}["']`, "u"));
  }
}

async function verifySite() {
  const suffix = "release-smoke=1";
  await verifyRedirect(`http://pausesure.com/check?${suffix}`, `${canonicalOrigin}/check?${suffix}`);
  await verifyRedirect(`https://www.pausesure.com/check?${suffix}`, `${canonicalOrigin}/check?${suffix}`);
  await verifyRedirect(`http://www.pausesure.com/check?${suffix}`, `${canonicalOrigin}/check?${suffix}`);

  const response = await request(`${canonicalOrigin}/check`, { redirect: "error" });
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/iu);
  const nonce = verifyHtmlHeaders(response);
  const html = await response.text();
  verifyExecutableScriptNonces(html, nonce);
  assert.doesNotMatch(html, /analysis stays in (?:this|your) browser/iu);
  await verifyCheckerBundle(html);
}

async function verifyBackend() {
  for (const [path, expectedStatus] of [["/health/live", "ok"], ["/health/ready", "ready"]]) {
    const response = await request(`${analysisOrigin}${path}`, { redirect: "error" });
    assert.equal(response.status, 200, `${path} must be healthy`);
    assert.equal((await response.json()).status, expectedStatus);
  }

  // This is the only reputation lookup performed by this smoke run.
  const uniqueBenignUrl = `https://www.google.com/?pausesure-release-smoke=${Date.now()}-${crypto.randomUUID()}`;
  const response = await request(analysisEndpoint, {
    method: "POST",
    redirect: "error",
    referrerPolicy: "no-referrer",
    headers: {
      "content-type": "application/json",
      origin: canonicalOrigin,
    },
    body: JSON.stringify({ kind: "link", value: uniqueBenignUrl }),
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("access-control-allow-origin"), canonicalOrigin);
  assertIncludesToken(response.headers.get("cache-control") ?? "", "private", "Cache-Control");
  assertIncludesToken(response.headers.get("cache-control") ?? "", "no-store", "Cache-Control");

  const result = await response.json();
  assert.equal(result.schemaVersion, 1);
  assert.equal(result.engineVersion, "pausesure-rules-6.2.0");
  assert.equal(result.kind, "link");
  const evidence = result.reputation?.find((item) => item?.source?.id === "google_web_risk");
  assert.ok(evidence, "Google Web Risk evidence is required");
  assert.equal(evidence.schemaVersion, 1);
  assert.equal(evidence.availability, "available");
  assert.ok(["no_known_match", "malicious"].includes(evidence.resultType));
}

try {
  await verifySite();
  await verifyBackend();
  console.log("PauseSure production smoke passed: HTTPS/CSP, shared checker, backend 6.2, and Google Web Risk are live.");
} catch (error) {
  console.error(`PauseSure production smoke failed: ${error instanceof Error ? error.message : "unknown failure"}`);
  process.exitCode = 1;
}
