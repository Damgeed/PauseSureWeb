import assert from "node:assert/strict";
import test from "node:test";

import { analyzeLink, analyzeText } from "../app/check/checker.ts";
import {
  combineReputationDecision,
  evidenceFromGatewayPayload,
  LatestCheckSequence,
  parseReputationResponse,
  providerEvidence,
  transportFailureEvidence,
} from "../app/check/reputation.ts";

const now = new Date("2026-08-26T12:00:00.000Z");
const submittedURL = "https://example.com/news";

function response(overrides = {}) {
  return {
    schemaVersion: 1,
    kind: "url",
    source: { id: "google_web_risk", name: "Google Web Risk" },
    resultType: "no_known_match",
    availability: "available",
    checkedAt: "2026-08-26T11:59:00.000Z",
    expiresAt: "2026-08-26T12:29:00.000Z",
    threatTypes: [],
    indicator: { host: "example.com" },
    cached: false,
    lookupDurationMs: 42,
    disclaimer: "Google Web Risk results can include false positives and false negatives.",
    ...overrides,
  };
}

test("accepts an exact, fresh, internally consistent gateway response", () => {
  assert.deepEqual(parseReputationResponse(response(), submittedURL, now), response());

  const withoutDuration = response();
  delete withoutDuration.lookupDurationMs;
  assert.deepEqual(parseReputationResponse(withoutDuration, submittedURL, now), withoutDuration);
});

test("requires the exact provider source and submitted host", () => {
  for (const candidate of [
    response({ source: { id: "other", name: "Google Web Risk" } }),
    response({ source: { id: "google_web_risk", name: "Other" } }),
    response({ indicator: { host: "different.example.com" } }),
    response({ schemaVersion: 2 }),
    response({ kind: "phone" }),
  ]) {
    assert.equal(parseReputationResponse(candidate, submittedURL, now), null);
  }
});

test("whitelists unique threat types and enforces result-state consistency", () => {
  const validMalicious = response({
    resultType: "malicious",
    threatTypes: ["MALWARE", "SOCIAL_ENGINEERING"],
  });
  assert.ok(parseReputationResponse(validMalicious, submittedURL, now));

  const validUnavailable = response({
    resultType: "couldnt_verify",
    availability: "unavailable",
  });
  assert.ok(parseReputationResponse(validUnavailable, submittedURL, now));

  for (const candidate of [
    response({ resultType: "malicious", threatTypes: [] }),
    response({ resultType: "malicious", availability: "unavailable", threatTypes: ["MALWARE"] }),
    response({ resultType: "no_known_match", availability: "unavailable" }),
    response({ resultType: "no_known_match", threatTypes: ["MALWARE"] }),
    response({ resultType: "couldnt_verify", availability: "available" }),
    response({ resultType: "couldnt_verify", availability: "unavailable", threatTypes: ["MALWARE"] }),
    response({ resultType: "malicious", threatTypes: ["PHISHING"] }),
    response({ resultType: "malicious", threatTypes: ["MALWARE", "MALWARE"] }),
    response({ resultType: "malicious", threatTypes: [7] }),
  ]) {
    assert.equal(parseReputationResponse(candidate, submittedURL, now), null);
  }
});

test("requires exact, fresh, ordered, bounded timestamps and lookup duration", () => {
  for (const candidate of [
    response({ checkedAt: "26 August 2026 11:59 UTC" }),
    response({ expiresAt: "2026-08-26T12:00:00.000Z" }),
    response({ checkedAt: "2026-08-26T12:06:00.000Z" }),
    response({ checkedAt: "2026-08-26T11:59:00.000Z", expiresAt: "2026-08-27T13:00:00.000Z" }),
    response({ checkedAt: "2026-08-26T12:10:00.000Z", expiresAt: "2026-08-26T12:05:00.000Z" }),
    response({ lookupDurationMs: -1 }),
    response({ lookupDurationMs: 60_001 }),
    response({ lookupDurationMs: 1.5 }),
    response({ lookupDurationMs: "42" }),
  ]) {
    assert.equal(parseReputationResponse(candidate, submittedURL, now), null);
  }
});

test("turns malformed gateway payloads and network failures into unattributed transport evidence", () => {
  const malformed = evidenceFromGatewayPayload(
    response({ indicator: { host: "wrong.example.com" } }),
    submittedURL,
    now,
  );
  const networkFailure = transportFailureEvidence(submittedURL, now);

  for (const failure of [malformed, networkFailure]) {
    assert.equal(failure.kind, "transport_failure");
    assert.equal(failure.resultType, "couldnt_verify");
    assert.equal(failure.availability, "unavailable");
    assert.equal("source" in failure, false);
    assert.match(failure.disclaimer, /no live provider result/i);
  }
});

test("never lets provider absence or a no-match downgrade deterministic warnings", () => {
  const high = analyzeText("Act now. Buy gift cards and do not tell anyone.");
  const unclear = analyzeLink("http://example.com/");
  const noMatch = providerEvidence(
    submittedURL,
    parseReputationResponse(response(), submittedURL, now),
  );
  const unavailable = transportFailureEvidence(submittedURL, now);

  assert.equal(combineReputationDecision(high, [noMatch, unavailable]).label, "High risk");
  assert.equal(combineReputationDecision(unclear, [noMatch, unavailable]).label, "Unclear");
});

test("uses Likely safe only when every URL lookup returns no known match", () => {
  const rules = analyzeText("Please review https://example.com/news tomorrow.");
  const parsed = parseReputationResponse(response(), submittedURL, now);
  assert.ok(parsed);
  const noMatch = providerEvidence(submittedURL, parsed);

  assert.equal(rules.label, "Likely safe");
  assert.equal(combineReputationDecision(rules, [noMatch]).label, "Likely safe");
  assert.equal(
    combineReputationDecision(rules, [noMatch, transportFailureEvidence("https://pausesure.com/check", now)]).label,
    "Couldn’t verify",
  );
});

test("escalates the complete decision when any checked URL has a malicious match", () => {
  const rules = analyzeText("Review https://example.com/news and https://pausesure.com/check tomorrow.");
  const safeResponse = parseReputationResponse(response(), submittedURL, now);
  const maliciousURL = "https://pausesure.com/check";
  const maliciousResponse = parseReputationResponse(response({
    resultType: "malicious",
    threatTypes: ["SOCIAL_ENGINEERING"],
    indicator: { host: "pausesure.com" },
  }), maliciousURL, now);
  assert.ok(safeResponse);
  assert.ok(maliciousResponse);

  const combined = combineReputationDecision(rules, [
    providerEvidence(submittedURL, safeResponse),
    providerEvidence(maliciousURL, maliciousResponse),
  ]);
  assert.equal(combined.label, "High risk");
  assert.ok(combined.signals.some((item) => item.code === "google_web_risk_match"));
});

test("invalidates stale asynchronous check sequences", () => {
  const sequence = new LatestCheckSequence();
  const first = sequence.begin();
  const second = sequence.begin();
  assert.equal(sequence.isCurrent(first), false);
  assert.equal(sequence.isCurrent(second), true);

  sequence.invalidate();
  assert.equal(sequence.isCurrent(second), false);
});
