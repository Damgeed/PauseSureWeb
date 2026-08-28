import assert from "node:assert/strict";
import test from "node:test";

import { LatestCheckSequence, parseAnalysisResponse, readBoundedJSON } from "../app/check/analysis-response.ts";

function payload(overrides = {}) {
  return {
    schemaVersion: 1,
    engineVersion: "pausesure-rules-6.3.0",
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

function noKnownMatchReputation(host = "example.com") {
  return {
    schemaVersion: 1,
    kind: "url",
    source: { id: "google_web_risk", name: "Google Web Risk" },
    resultType: "no_known_match",
    availability: "available",
    checkedAt: "2026-08-27T08:00:00.000Z",
    expiresAt: "2026-08-27T08:00:00.000Z",
    threatTypes: [],
    cached: false,
    lookupDurationMs: 10,
    disclaimer: "A missing match is not a guarantee.",
    indicator: { host },
  };
}

test("accepts the bounded canonical analysis response", () => {
  assert.deepEqual(parseAnalysisResponse(payload(), "text"), payload());
});

test("uses schema version for compatibility across newer rule engines", () => {
  assert.equal(parseAnalysisResponse(payload({ engineVersion: "pausesure-rules-6.0.9" }), "text"), null);
  assert.equal(parseAnalysisResponse(payload({ engineVersion: "pausesure-rules-7.0.0" }), "text")?.engineVersion, "pausesure-rules-7.0.0");
  assert.equal(parseAnalysisResponse(payload({ engineVersion: "pausesure-rules-999999999999999999999999.0.0" }), "text"), null);
  assert.equal(parseAnalysisResponse(payload({ engineVersion: "pausesure-rules-next" }), "text"), null);
});

test("bounds JSON responses and cancels every rejected response stream", async () => {
  function trackedStream(chunks) {
    let cancelled = false;
    return {
      stream: new ReadableStream({
        start(controller) {
          for (const chunk of chunks) controller.enqueue(new TextEncoder().encode(chunk));
        },
        cancel() { cancelled = true; },
      }),
      wasCancelled: () => cancelled,
    };
  }

  const wrongTypeBody = trackedStream(["not json"]);
  assert.equal(await readBoundedJSON(new Response(wrongTypeBody.stream, {
    headers: { "content-type": "text/plain" },
  }), 100), null);
  assert.equal(wrongTypeBody.wasCancelled(), true, "wrong media types must be cancelled");

  const declaredOversizeBody = trackedStream(["{}"]);
  assert.equal(await readBoundedJSON(new Response(declaredOversizeBody.stream, {
    headers: { "content-length": "101", "content-type": "application/json" },
  }), 100), null);
  assert.equal(declaredOversizeBody.wasCancelled(), true, "declared oversized bodies must be cancelled");

  const streamedOversizeBody = trackedStream(["1234", "5678"]);
  assert.equal(await readBoundedJSON(new Response(streamedOversizeBody.stream, {
    headers: { "content-type": "application/json" },
  }), 5), null);
  assert.equal(streamedOversizeBody.wasCancelled(), true, "streamed oversized bodies must be cancelled");

  const valid = { engine: "pausesure-rules-6.3.0" };
  assert.deepEqual(await readBoundedJSON(new Response(JSON.stringify(valid), {
    headers: { "content-type": "application/json; charset=utf-8" },
  }), 1_024), valid);
});

test("rejects mismatched kinds, unsafe labels, and oversized response content", () => {
  assert.equal(parseAnalysisResponse(payload(), "link"), null);
  assert.equal(parseAnalysisResponse(payload({ risk: "high", label: "Likely safe" }), "text"), null);
  assert.equal(parseAnalysisResponse(payload({ risk: "insufficient", label: "Likely safe", signals: [] }), "text"), null);
  assert.equal(parseAnalysisResponse(payload({ risk: "unclear", label: "Unclear", signals: [] }), "text"), null);
  assert.equal(parseAnalysisResponse(payload({ nextSteps: [] }), "text"), null);
  assert.equal(parseAnalysisResponse(payload({ summary: "x".repeat(1_001) }), "text"), null);
  assert.equal(parseAnalysisResponse(payload({ signals: Array.from({ length: 25 }, () => payload().signals[0]) }), "text"), null);
});

test("rejects malformed destination evidence", () => {
  const now = new Date("2026-08-27T08:05:00.000Z");
  const reputation = [noKnownMatchReputation()];
  assert.ok(parseAnalysisResponse(payload({ reputation }), "text", now));
  for (const candidate of [
    { ...reputation[0], indicator: { host: "" } },
    { ...reputation[0], source: { id: "substituted", name: "Google Web Risk" } },
    { ...reputation[0], availability: "unavailable" },
    { ...reputation[0], threatTypes: ["PHISHING"] },
    { ...reputation[0], threatTypes: ["MALWARE"] },
    { ...reputation[0], expiresAt: "2026-08-27T08:04:00.000Z" },
    { ...reputation[0], cached: true },
  ]) {
    assert.equal(parseAnalysisResponse(payload({ reputation: [candidate] }), "text", now), null);
  }

  const malicious = {
    ...reputation[0],
    resultType: "malicious",
    expiresAt: "2026-08-27T08:30:00.000Z",
    threatTypes: ["SOCIAL_ENGINEERING"],
  };
  const maliciousPayload = payload({
    reputation: [malicious],
    signals: [{
      code: "known_threat_match",
      title: "Known threat match",
      detail: "The destination matched current threat intelligence.",
      severity: "critical",
    }],
  });
  assert.ok(parseAnalysisResponse(maliciousPayload, "text", now));
  assert.equal(
    parseAnalysisResponse({
      ...maliciousPayload,
      reputation: [{ ...malicious, expiresAt: "2026-08-27T08:30:00.001Z" }],
    }, "text", now),
    null,
    "malicious matches must never exceed the backend's thirty-minute Web Risk cap",
  );
  assert.equal(
    parseAnalysisResponse(payload({
      risk: "insufficient",
      label: "Couldn’t verify",
      signals: [],
      reputation: [{
        ...reputation[0],
        resultType: "couldnt_verify",
        availability: "unavailable",
        checkedAt: "2026-08-27T08:04:00.000Z",
        expiresAt: "2026-08-27T08:09:00.001Z",
      }],
    }), "text", now),
    null,
    "provider failure backoff must never exceed the configured five-minute cap",
  );
  assert.equal(
    parseAnalysisResponse(payload({
      risk: "insufficient",
      label: "Couldn’t verify",
      signals: [],
      reputation: [malicious],
    }), "text", now),
    null,
  );
  assert.equal(
    parseAnalysisResponse({
      ...maliciousPayload,
      reputation: [{ ...malicious, threatTypes: [] }],
    }, "text", now),
    null,
  );
});

test("accepts canonical unbracketed IPv6 reputation hosts", () => {
  const now = new Date("2026-08-27T08:05:00.000Z");
  const reputation = [noKnownMatchReputation("2001:4860:4860::8888")];
  const result = parseAnalysisResponse(payload({ reputation }), "text", now);
  assert.equal(result?.reputation[0]?.indicator.host, "2001:4860:4860::8888");
});

test("accepts canonical IPv4 and valid lowercase DNS reputation hosts", () => {
  const now = new Date("2026-08-27T08:05:00.000Z");
  for (const host of [
    "192.0.2.42",
    "example.com",
    "sub-domain.example.com",
    "xn--bcher-kva.example",
  ]) {
    const result = parseAnalysisResponse(
      payload({ reputation: [noKnownMatchReputation(host)] }),
      "text",
      now,
    );
    assert.equal(result?.reputation[0]?.indicator.host, host, host);
  }
});

test("rejects malformed DNS and noncanonical IPv4-like reputation hosts", () => {
  const now = new Date("2026-08-27T08:05:00.000Z");
  for (const host of [
    "example..com",
    "a-.example.com",
    "-a.example.com",
    "example.com.",
    "Example.com",
    "example_com",
    "999.999.999.999",
    "256.0.0.1",
    "192.168.001.1",
    "127.1",
    "xn--.example",
  ]) {
    assert.equal(
      parseAnalysisResponse(payload({ reputation: [noKnownMatchReputation(host)] }), "text", now),
      null,
      host,
    );
  }
});

test("rejects noncanonical or malformed IPv6-like reputation hosts", () => {
  const now = new Date("2026-08-27T08:05:00.000Z");
  for (const host of [
    "[2001:4860:4860::8888]",
    "2001:4860:4860:0:0:0:0:8888",
    "2001:04860:4860::8888",
    "2001:4860::8888::1",
    "dead:beef",
    "::::",
    "2001:4860:4860::8888%25eth0",
    "2001:4860:4860::8888/path",
  ]) {
    assert.equal(
      parseAnalysisResponse(payload({ reputation: [noKnownMatchReputation(host)] }), "text", now),
      null,
      host,
    );
  }
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
