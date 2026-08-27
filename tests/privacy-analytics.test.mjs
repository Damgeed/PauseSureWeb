import assert from "node:assert/strict";
import test from "node:test";

import { trackPrivacyEvent } from "../app/check/privacy-analytics.ts";

test("rechecks current analytics consent after an asynchronous check completes", async () => {
  const consent = { enabled: true };
  const requests = [];
  const send = async (url, init) => {
    requests.push({ url, init });
    return new Response(null, { status: 204 });
  };

  let releaseCheck;
  const checkFinished = new Promise((resolve) => { releaseCheck = resolve; });
  const completion = (async () => {
    await checkFinished;
    trackPrivacyEvent("web_check_completed", { input: "link", risk: "high" }, consent, send);
    trackPrivacyEvent("result_viewed", { input: "link", risk: "high" }, consent, send);
  })();

  consent.enabled = false;
  releaseCheck();
  await completion;

  assert.equal(requests.length, 0, "events reached after opt-out must not be submitted");

  consent.enabled = true;
  trackPrivacyEvent("web_check_started", { input: "link" }, consent, send);
  assert.equal(requests.length, 1, "a later explicit opt-in should permit new events");
  assert.equal(requests[0].url, "/api/privacy-events");
  assert.equal(JSON.parse(requests[0].init.body).events[0].name, "web_check_started");
});
