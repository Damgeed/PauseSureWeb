import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

test("uses a first-party Cloudflare Workers configuration", async () => {
  const source = await readFile(new URL("../wrangler.jsonc", import.meta.url), "utf8");

  assert.match(source, /"name"\s*:\s*"pausesure-web"/);
  assert.match(source, /"main"\s*:\s*"\.\/worker\/index\.ts"/);
  assert.match(source, /"binding"\s*:\s*"DB"/);
  assert.match(source, /"database_name"\s*:\s*"pausesure-web-analytics"/);
  assert.match(source, /"pattern"\s*:\s*"pausesure\.com"/);
  assert.match(source, /"pattern"\s*:\s*"www\.pausesure\.com"/);
  assert.doesNotMatch(source, /database_id\s*"\s*:/, "a fake D1 identifier must not be committed");
  assert.doesNotMatch(source, /(?:OpenAI|ChatGPT|site-creator)/i);
});

test("does not package hosting-control-plane metadata", async () => {
  await assert.rejects(access(new URL("../dist/.openai", import.meta.url)));
});

test("redirects www to the canonical apex without dropping path or query", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("redirect-test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  const env = { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } };
  const ctx = { waitUntil() {}, passThroughOnException() {} };
  const response = await worker.fetch(
    new Request("https://www.pausesure.com/resources?from=www"),
    env,
    ctx,
  );

  assert.equal(response.status, 308);
  assert.equal(response.headers.get("location"), "https://pausesure.com/resources?from=www");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
});
