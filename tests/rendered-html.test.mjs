import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("renders the public multi-page company site", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  const env = { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } };
  const ctx = { waitUntil() {}, passThroughOnException() {} };
  const routes = ["/", "/product", "/how-it-works", "/safety", "/resources", "/company", "/privacy", "/security", "/terms", "/support", "/account-deletion"];
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
