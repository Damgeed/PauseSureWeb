import assert from "node:assert/strict";

const canonicalOrigin = "https://pausesure.com";
const analysisOrigin = "https://pausesure-production.up.railway.app";
const analysisEndpoint = `${analysisOrigin}/v1/analysis/check`;
const imageAnalysisEndpoint = `${analysisOrigin}/v1/analysis/check-image`;
const expectedWebVersion = "pausesure-web-6.3.1";
const expectedEngineVersion = "pausesure-rules-6.3.0";
const requestTimeoutMilliseconds = 20_000;
const propagationAttempts = 12;
const propagationDelayMilliseconds = 5_000;
const benignScreenshotBase64 = "iVBORw0KGgoAAAANSUhEUgAAAKAAAAAwCAAAAACzwi6yAAACtElEQVRYw+2YTUhUYRSGn6v5AzphTKHjT40krhwNTXPCwMQgiIhKo0LJ8gfT7GcRChmBhotoIVTQIkIjKIkMghbtKiIzXUTQwkrSUTPJEMShcdQ5LWauOmrdLg6MxD2b+33n3Pech4/7fourCGs7QoINYAAagMEGMAANwGADGIAGYLABDEADUKPeoVz2rcKS/QqlyjSlyvQKkrYtUf3q+qCi0X9X0ioB9cf3Ss+FmMC1Czzg59nzV83q5s7watutCzigh2h16YwyL6+7w3W103mCcy12U3Ld6OLU5NkM0/b6X+q2NJ9qpY+Tltk6032KFT9R5Yah3ZERtrsAn4qSEo8MBBjQXXBp9rj1Zq5jITWWecN0TK7lTPn2VQ2caLMAZzr225aJZvYNnKtylD+GruzOlIK39iHNmfL3eEh6mTcUq0grzSLSzmGRElxSgktqaBWReppUxQtui0hZqG1cRIrwE1VgmxB5zVGRnJAnIpN5JGoAaAPOh1Vkc8qciIg93KkCusPTPCLiiotfAkiH+AAXiSq82ehC6aVYROSdJqC2SRqbvc8wcDrsDwAi3f02X3XQna8AETs7nVH+ukzf01+UBRAJfewFyN6kNV6Xiwfp6vKu1C+OEeIAsDCS6v9y7IqiGF92lHgAEn9ozNRlklhqfQdvV1PxjAEwhuUPnVcQAUl4r4IJrZm6AM3mbgCuX5lPWcNeAri74kz/LgJSeQ7w1YFG6LtmqntbgHsXv8xnwk59uAU0jZzWIQK25T56Cq46j+ZMTRc3qnayikymkVVzIDRheOGa+WYlv2YH6VNLXTyluniRqIJxEZGNhSJv1ofsKd8anaflYn0naOqpl7aPVT0JCynL+9qf7TMN3VF6RIC951Dfs4xXaVojFeP/oAFoABqABuDaDgPQAAx2GID/PeBvJxkFuZNQxVIAAAAASUVORK5CYII=";

async function request(url, init = {}, timeoutMilliseconds = requestTimeoutMilliseconds) {
  const signal = AbortSignal.timeout(timeoutMilliseconds);
  return fetch(url, { ...init, signal });
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function retryForPropagation(label, operation) {
  let lastError;
  for (let attempt = 1; attempt <= propagationAttempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt === propagationAttempts) break;
      console.log(`${label} is not active yet (attempt ${attempt}/${propagationAttempts}); retrying in ${propagationDelayMilliseconds / 1000}s.`);
      await wait(propagationDelayMilliseconds);
    }
  }
  throw lastError;
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
  assert.equal(response.headers.get("x-pausesure-web-version"), expectedWebVersion);
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
    if (
      javascript.includes(analysisEndpoint)
      && javascript.includes(imageAnalysisEndpoint)
      && javascript.includes("google_web_risk")
    ) {
      sharedCheckerFound = true;
      break;
    }
  }
  assert.ok(sharedCheckerFound, "The deployed checker bundle must use the shared Railway OCR/Web Risk contract");
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

async function verifyD1Write() {
  const response = await request(`${canonicalOrigin}/api/deployment-smoke`, {
    method: "POST",
    redirect: "error",
    referrerPolicy: "no-referrer",
    headers: {
      origin: canonicalOrigin,
      "x-pausesure-release-version": expectedWebVersion,
    },
  });
  const releasePhase = response.headers.get("x-pausesure-release-phase") ?? "none";
  assert.equal(
    response.status,
    204,
    `the content-free D1 deployment smoke must return 204 (failed phase: ${releasePhase})`,
  );
  assert.equal(response.headers.get("x-pausesure-web-version"), expectedWebVersion);
  assertIncludesToken(response.headers.get("cache-control") ?? "", "no-store", "Cache-Control");
  assert.equal(await response.text(), "", "the deployment smoke must not return database details");
}

async function verifyBackend() {
  for (const [path, expectedStatus] of [["/health/live", "ok"], ["/health/ready", "ready"]]) {
    const response = await request(`${analysisOrigin}${path}`, { redirect: "error" });
    assert.equal(response.status, 200, `${path} must be healthy`);
    assert.equal((await response.json()).status, expectedStatus);
  }

  const imageResponse = await request(imageAnalysisEndpoint, {
    method: "POST",
    redirect: "error",
    referrerPolicy: "no-referrer",
    headers: {
      "content-type": "application/json",
      origin: canonicalOrigin,
    },
    body: JSON.stringify({
      kind: "screenshot",
      image: { mediaType: "image/png", dataBase64: benignScreenshotBase64 },
    }),
  }, 30_000);
  assert.equal(imageResponse.status, 200, "the screenshot OCR route must accept a bounded benign PNG");
  assert.equal(imageResponse.headers.get("access-control-allow-origin"), canonicalOrigin);
  assertIncludesToken(imageResponse.headers.get("cache-control") ?? "", "private", "Cache-Control");
  assertIncludesToken(imageResponse.headers.get("cache-control") ?? "", "no-store", "Cache-Control");
  const imageResult = await imageResponse.json();
  assert.equal(imageResult.schemaVersion, 1);
  assert.equal(imageResult.engineVersion, expectedEngineVersion);
  assert.equal(imageResult.kind, "screenshot");
  assert.deepEqual(imageResult.reputation, [], "the benign OCR smoke must not perform another Web Risk lookup");

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
  assert.equal(result.engineVersion, expectedEngineVersion);
  assert.equal(result.kind, "link");
  const evidence = result.reputation?.find((item) => item?.source?.id === "google_web_risk");
  assert.ok(evidence, "Google Web Risk evidence is required");
  assert.equal(evidence.schemaVersion, 1);
  assert.equal(evidence.availability, "available");
  assert.ok(["no_known_match", "malicious"].includes(evidence.resultType));
}

try {
  await retryForPropagation("PauseSure web release", verifySite);
  await retryForPropagation("PauseSure D1 release write", verifyD1Write);
  await verifyBackend();
  console.log("PauseSure production smoke passed: HTTPS/CSP, web 6.3, D1, backend 6.3, server OCR, and Google Web Risk are live.");
} catch (error) {
  console.error(`PauseSure production smoke failed: ${error instanceof Error ? error.message : "unknown failure"}`);
  process.exitCode = 1;
}
