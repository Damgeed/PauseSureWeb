import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

test("uses a first-party Cloudflare Workers configuration", async () => {
  const source = await readFile(new URL("../wrangler.jsonc", import.meta.url), "utf8");
  const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  const wranglerVersion = packageJson.devDependencies.wrangler;
  const [major, minor] = wranglerVersion.split(".").map(Number);

  assert.match(source, /"name"\s*:\s*"pausesure-web"/);
  assert.match(source, /"main"\s*:\s*"\.\/worker\/index\.ts"/);
  assert.match(source, /"binding"\s*:\s*"DB"/);
  assert.match(source, /"database_name"\s*:\s*"pausesure-web-analytics"/);
  assert.match(source, /"pattern"\s*:\s*"pausesure\.com"/);
  assert.match(source, /"pattern"\s*:\s*"www\.pausesure\.com"/);
  assert.match(source, /"workers_dev"\s*:\s*false/);
  assert.match(source, /"preview_urls"\s*:\s*false/);
  assert.match(source, /"name"\s*:\s*"ANALYTICS_RATE_LIMITER"/);
  assert.match(source, /"namespace_id"\s*:\s*"1001"/);
  assert.match(source, /"limit"\s*:\s*60/);
  assert.match(source, /"period"\s*:\s*60/);
  assert.match(source, /"crons"\s*:\s*\["17 3 \* \* \*"\]/);
  assert.doesNotMatch(source, /"images"\s*:/, "the unused image transformation binding must remain disabled");
  assert.ok(major > 4 || (major === 4 && minor >= 102), "Wrangler must resolve auto-provisioned D1 bindings for remote migrations");
  assert.doesNotMatch(source, /(?:database_id|account_id)"?\s*:\s*"(?:0{8}-|<|replace|example|fake)/i, "placeholder Cloudflare identifiers must not be committed");
  assert.doesNotMatch(source, /(?:OpenAI|ChatGPT|site-creator)/i);
});

test("deploys only a CI-approved main commit without repeating the full verification suite", async () => {
  const workflow = await readFile(new URL("../.github/workflows/deploy-cloudflare.yml", import.meta.url), "utf8");
  const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));

  assert.match(workflow, /workflow_run:/u);
  assert.match(workflow, /workflows:\s*\["Web CI"\]/u);
  assert.match(workflow, /types:\s*\[completed\]/u);
  assert.match(workflow, /branches:\s*\[main\]/u);
  assert.match(workflow, /workflow_run\.conclusion == 'success'/u);
  assert.match(workflow, /workflow_run\.head_branch == 'main'/u);
  assert.match(workflow, /workflow_run\.head_sha/u, "the deployment must publish the exact CI-reviewed commit");
  assert.match(workflow, /CLOUDFLARE_API_TOKEN:\s*\$\{\{ secrets\.CLOUDFLARE_API_TOKEN \}\}/u);
  assert.match(workflow, /CLOUDFLARE_ACCOUNT_ID:\s*\$\{\{ secrets\.CLOUDFLARE_ACCOUNT_ID \}\}/u);
  assert.match(workflow, /npm run db:migrate:remote/u);
  assert.match(workflow, /npm run build/u);
  assert.match(workflow, /npm run deploy:built/u);
  assert.match(workflow, /npm run smoke:production/u);
  assert.doesNotMatch(workflow, /npm run verify/u, "Web CI is the verification authority; deployment must not run the same suite twice");
  assert.equal(packageJson.scripts["deploy:built"], "wrangler deploy");
  assert.equal(packageJson.scripts.deploy, "npm run verify && npm run deploy:built");
});

test("does not package hosting-control-plane metadata", async () => {
  await assert.rejects(access(new URL("../dist/.openai", import.meta.url)));
});

test("keeps raw SQL migrations without dead ORM or starter code", async () => {
  const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  assert.equal(packageJson.dependencies?.["drizzle-orm"], undefined);
  assert.equal(packageJson.devDependencies?.["drizzle-kit"], undefined);
  await readFile(new URL("../drizzle/0000_famous_chamber.sql", import.meta.url), "utf8");
  await readFile(new URL("../drizzle/0002_deployment_smoke.sql", import.meta.url), "utf8");
  for (const path of ["../drizzle.config.ts", "../db/index.ts", "../db/schema.ts", "../examples/d1/app/api/notes/route.ts"]) {
    await assert.rejects(access(new URL(path, import.meta.url)), `${path} should stay removed`);
  }
});

test("redirects every production HTTP and www request to the fixed HTTPS origin", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("redirect-test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  const env = { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } };
  const ctx = { waitUntil() {}, passThroughOnException() {} };
  for (const [requestUrl, expectedLocation] of [
    ["https://www.pausesure.com/resources?from=www", "https://pausesure.com/resources?from=www"],
    ["http://pausesure.com/check?from=http", "https://pausesure.com/check?from=http"],
    ["http://www.pausesure.com:8080/resources?from=port", "https://pausesure.com/resources?from=port"],
    ["http://pausesure.com//attacker.example/path?from=slash", "https://pausesure.com//attacker.example/path?from=slash"],
  ]) {
    const response = await worker.fetch(new Request(requestUrl), env, ctx);
    assert.equal(response.status, 308);
    assert.equal(response.headers.get("location"), expectedLocation);
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    assert.equal(response.headers.get("x-pausesure-web-version"), "pausesure-web-6.3.0");
    assert.match(response.headers.get("content-security-policy") ?? "", /frame-ancestors 'none'/);
  }

  const unexpectedOrigins = [
    "https://pausesure-web.example.workers.dev/",
    "https://pausesure.com:8443/",
  ];
  for (const requestUrl of unexpectedOrigins) {
    const unexpectedOrigin = await worker.fetch(new Request(requestUrl), env, ctx);
    assert.equal(unexpectedOrigin.status, 421);
    for (const [header, expected] of [
      ["content-security-policy", /default-src 'self'/],
      ["cross-origin-opener-policy", "same-origin"],
      ["permissions-policy", /camera=\(\)/],
      ["referrer-policy", "strict-origin-when-cross-origin"],
      ["strict-transport-security", "max-age=31536000"],
      ["x-content-type-options", "nosniff"],
      ["x-frame-options", "DENY"],
    ]) {
      const value = unexpectedOrigin.headers.get(header) ?? "";
      if (expected instanceof RegExp) assert.match(value, expected, `${header} should protect 421 responses`);
      else assert.equal(value, expected, `${header} should protect 421 responses`);
    }
  }

  for (const path of ["/_vinext/image", "/_next/image"]) {
    const unusedImageRoute = await worker.fetch(new Request(`https://pausesure.com${path}?url=/icon.png&w=64&q=75`), env, ctx);
    assert.equal(unusedImageRoute.status, 404);
    assert.equal(unusedImageRoute.headers.get("x-content-type-options"), "nosniff");
  }
});
