import assert from "node:assert/strict";
import test from "node:test";
import { analyzeLink, analyzePhone, analyzeText } from "../app/check/checker.ts";

test("flags combined pressure, payment, and secrecy without declaring certainty", () => {
  const result = analyzeText("Act now. Buy gift cards and do not tell anyone. Send the codes immediately.");
  assert.equal(result.risk, "high");
  assert.ok(result.signals.some((item) => item.code === "payment"));
  assert.ok(result.signals.some((item) => item.code === "secrecy"));
  assert.match(result.limitation, /not proof/i);
});

test("treats absent signals as insufficient evidence rather than safe", () => {
  const result = analyzeText("Can we talk tomorrow afternoon?");
  assert.equal(result.risk, "insufficient");
  assert.doesNotMatch(result.label, /^safe$/i);
  assert.match(result.limitation, /cannot guarantee/i);
});

test("explains structurally suspicious link patterns", () => {
  const result = analyzeLink("http://trusted.example@192.0.2.9:8080/account/verify");
  assert.equal(result.risk, "high");
  assert.ok(result.signals.some((item) => item.code === "embedded_identity"));
  assert.ok(result.signals.some((item) => item.code === "ip_host"));
  assert.ok(result.signals.some((item) => item.code === "unusual_port"));
});

test("accepts common bare domains as HTTPS web addresses", () => {
  for (const input of ["www.example.com", "example.com/help", "//www.example.com/help"]) {
    const result = analyzeLink(input);
    assert.ok(!result.signals.some((item) => item.code === "invalid_link"), `${input} should parse`);
    assert.ok(!result.signals.some((item) => item.code === "unencrypted"), `${input} should default to HTTPS`);
  }
});

test("normalization preserves suspicious structure and explicit HTTP warnings", () => {
  const bareSuspicious = analyzeLink("trusted.example@192.0.2.9:8080/account/verify");
  assert.equal(bareSuspicious.risk, "high");
  assert.ok(bareSuspicious.signals.some((item) => item.code === "embedded_identity"));
  assert.ok(bareSuspicious.signals.some((item) => item.code === "ip_host"));
  assert.ok(bareSuspicious.signals.some((item) => item.code === "unusual_port"));
  assert.ok(bareSuspicious.signals.some((item) => item.code === "sensitive_path"));

  const explicitHttp = analyzeLink("http://www.example.com");
  assert.ok(explicitHttp.signals.some((item) => item.code === "unencrypted"));
});

test("does not turn arbitrary text into a web address", () => {
  for (const input of ["please verify this account", "javascript:alert(1)", "mailto:security@example.com"]) {
    const result = analyzeLink(input);
    assert.ok(result.signals.some((item) => item.code === "invalid_link"), `${input} should not be accepted as a website`);
  }
});

test("inspects a bare www address when it appears inside message text", () => {
  const result = analyzeText("Please sign in at www.example.com/account/verify");
  assert.ok(result.signals.some((item) => item.code === "sensitive_path"));
});

test("does not claim a phone number proves identity", () => {
  const result = analyzePhone("+1 (202) 555-0123");
  assert.equal(result.risk, "insufficient");
  assert.match(result.summary, /cannot prove/i);
});
