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

  for (const route of routes) {
    const response = await worker.fetch(new Request(`http://localhost${route}`, { headers: { accept: "text/html" } }), env, ctx);
    assert.equal(response.status, 200, `${route} should render`);
    assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
    const html = await response.text();
    assert.match(html, /PauseSure/i);
    assert.doesNotMatch(html, /codex-preview/i);
    assert.doesNotMatch(html, /(?:OpenAI|ChatGPT)/i, `${route} should not expose hosting-platform branding`);
    assert.doesNotMatch(html, /\/(?:_next|_vinext)\/image\?/i, `${route} should use deploy-safe image URLs`);
  }
});

test("ships optimized brand imagery and product film", async () => {
  for (const path of ["brand/pausesure-logo.webp", "brand/protect-myself.webp", "brand/help-someone.webp"]) {
    const data = await readFile(new URL(`../public/${path}`, import.meta.url));
    assert.equal(data.subarray(0, 4).toString("ascii"), "RIFF", `${path} should be a WebP container`);
    assert.equal(data.subarray(8, 12).toString("ascii"), "WEBP", `${path} should be a WebP image`);
    assert.ok(data.length > 1_000, `${path} should not be an empty placeholder`);
  }

  for (const path of ["og.png"]) {
    const data = await readFile(new URL(`../public/${path}`, import.meta.url));
    assert.deepEqual([...data.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10], `${path} should be a PNG`);
    assert.ok(data.length > 10_000, `${path} should not be an empty placeholder`);
  }

  const video = await readFile(new URL("../public/pausesure-intro.mp4", import.meta.url));
  assert.equal(video.subarray(4, 8).toString("ascii"), "ftyp", "the product film should be a valid MP4");
assert.ok(video.length > 250_000, "the product film should contain real optimized video data");
});
