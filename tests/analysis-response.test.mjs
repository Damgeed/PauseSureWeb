import assert from "node:assert/strict";
import test from "node:test";

import { LatestCheckSequence, parseAnalysisResponse } from "../app/check/analysis-response.ts";

function payload(overrides = {}) {
  return {
    schemaVersion: 1,
    engineVersion: "pausesure-rules-6.0.0",
    kind: "text",
    risk: "high",
    label: "High risk",
    summary: "Multiple fraud signals were found.",
    signals: [{
      code: "credential_request",
      title: "Credential request",
      detail: "The sender asks for a security code.",
      severity: "critical",
    }],
    nextSteps: ["Do not share the code."],
    limitation: "This is not proof of sender identity.",
    reputation: [],
    ...overrides,
  };
}

test("accepts the bounded canonical analysis response", () => {
  assert.deepEqual(parseAnalysisResponse(payload(), "text"), payload());
});

test("rejects mismatched kinds, unsafe labels, and oversized response content", () => {
  assert.equal(parseAnalysisResponse(payload(), "link"), null);
  assert.equal(parseAnalysisResponse(payload({ risk: "high", label: "Likely safe" }), "text"), null);
  assert.equal(parseAnalysisResponse(payload({ summary: "x".repeat(1_001) }), "text"), null);
  assert.equal(parseAnalysisResponse(payload({ signals: Array.from({ length: 25 }, () => payload().signals[0]) }), "text"), null);
});

test("rejects malformed destination evidence", () => {
  const reputation = [{
    schemaVersion: 1,
    kind: "url",
    source: { id: "google_web_risk", name: "Google Web Risk" },
    resultType: "no_known_match",
    availability: "available",
    checkedAt: "2026-08-27T08:00:00.000Z",
    expiresAt: "2026-08-27T08:30:00.000Z",
    threatTypes: [],
    cached: false,
    lookupDurationMs: 10,
    disclaimer: "A missing match is not a guarantee.",
    indicator: { host: "example.com" },
  }];
  assert.ok(parseAnalysisResponse(payload({ reputation }), "text"));
  assert.equal(parseAnalysisResponse(payload({ reputation: [{ ...reputation[0], indicator: { host: "" } }] }), "text"), null);
});

test("ignores stale asynchronous check results", () => {
  const sequence = new LatestCheckSequence();
  const first = sequence.begin();
  const second = sequence.begin();
  assert.equal(sequence.isCurrent(first), false);
  assert.equal(sequence.isCurrent(second), true);
  sequence.invalidate();
  assert.equal(sequence.isCurrent(second), false);
});
