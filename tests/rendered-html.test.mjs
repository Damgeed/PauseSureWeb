import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

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
    assert.equal(response.headers.get("referrer-policy"), "strict-origin-when-cross-origin");
    assert.match(response.headers.get("permissions-policy") ?? "", /camera=\(\)/);
    const html = await response.text();
    assert.match(html, /PauseSure/i);
    assert.doesNotMatch(html, /codex-preview/i);
    assert.doesNotMatch(html, /(?:OpenAI|ChatGPT)/i, `${route} should not expose hosting-platform branding`);
    assert.doesNotMatch(html, /mailto:/i, `${route} should not advertise an unverified email route`);
    assert.doesNotMatch(html, /\/(?:_next|_vinext)\/image\?/i, `${route} should use deploy-safe image URLs`);
    assert.doesNotMatch(html, /(?:in active development|still in development|pre-release|coming to iPhone|product in development|development-stage|private development)/i, `${route} should use deliberate launch-ready language`);
    const canonicalUrl = `https://pausesure.com${route === "/" ? "" : route}`;
    assert.ok(html.includes(`<link rel="canonical" href="${canonicalUrl}"/>`), `${route} should have a self-referencing canonical URL`);
    assert.ok(html.includes(`<meta property="og:url" content="${canonicalUrl}"/>`), `${route} should have a route-specific Open Graph URL`);

    if (route === "/") {
      if (appStoreEnabled) {
        assert.match(html, /Download on the App Store/i);
      } else {
        assert.match(html, /Check iPhone availability/i);
        assert.doesNotMatch(html, /Download on the App Store/i);
      }
    }
  }

  const missing = await worker.fetch(new Request("http://localhost/not-a-pause-sure-page", { headers: { accept: "text/html" } }), env, ctx);
  assert.equal(missing.status, 404, "unknown routes should return a real 404");
  assert.match(await missing.text(), /This link does not lead to a PauseSure page/i);
});

test("accepts only same-origin, allowlisted, content-free analytics", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("analytics-test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  const batches = [];
  const DB = {
    prepare(sql) {
      return { bind(...values) { return { sql, values }; } };
    },
    async batch(statements) { batches.push(statements); return statements.map(() => ({ success: true })); },
  };
  const env = { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) }, DB };
  const ctx = { waitUntil() {}, passThroughOnException() {} };
  const day = new Date().toISOString().slice(0, 10);
  const validBody = { events: [{ schemaVersion: 1, name: "web_check_completed", day, count: 1, dimensions: { input: "link", risk: "high", channel: "web" } }] };
  const valid = await worker.fetch(new Request("http://localhost/api/privacy-events", {
    method: "POST",
    headers: { origin: "http://localhost", "content-type": "application/json" },
    body: JSON.stringify(validBody),
  }), env, ctx);
  assert.equal(valid.status, 204);
  assert.equal(batches.length, 1);
  assert.equal(batches[0].length, 2, "retention cleanup and aggregate upsert should run");
  assert.ok(batches[0][1].values.every((value) => !String(value).includes("http")), "aggregate values should contain no checked URL");

  const identifying = await worker.fetch(new Request("http://localhost/api/privacy-events", {
    method: "POST",
    headers: { origin: "http://localhost", "content-type": "application/json" },
    body: JSON.stringify({ events: [{ ...validBody.events[0], rawContent: "secret message" }] }),
  }), env, ctx);
  assert.equal(identifying.status, 400);

  const crossOrigin = await worker.fetch(new Request("http://localhost/api/privacy-events", {
    method: "POST",
    headers: { origin: "https://attacker.example", "content-type": "application/json" },
    body: JSON.stringify(validBody),
  }), env, ctx);
  assert.equal(crossOrigin.status, 403);
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
