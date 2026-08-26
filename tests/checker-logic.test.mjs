import assert from "node:assert/strict";
import test from "node:test";
import { analyzeCheck, analyzeLink, analyzePhone, analyzeText } from "../app/check/checker.ts";

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
  for (const input of [
    "pausesure.com",
    "www.pausesure.com",
    "pausesure.ai/help",
    "pausesure.co/check",
    "//www.example.com/help",
  ]) {
    const result = analyzeLink(input);
    assert.ok(!result.signals.some((item) => item.code === "invalid_link"), `${input} should parse`);
    assert.ok(!result.signals.some((item) => item.code === "unencrypted"), `${input} should default to HTTPS`);
  }
});

test("flags website-like addresses that are missing a recognized top-level domain", () => {
  for (const input of [
    "pausesure",
    "www.pausesure",
    "www.pausesure/account/verify",
    "https://pausesure",
    "https://www.pausesure",
    "pausesure.not-a-tld",
  ]) {
    const result = analyzeLink(input);
    assert.ok(result.signals.some((item) => item.code === "invalid_link"), `${input} should be flagged as incomplete`);
    assert.notEqual(result.risk, "insufficient", `${input} should not look like a no-signal result`);
  }
});

test("recognizes internationalized top-level domains from the IANA root-zone list", () => {
  const result = analyzeLink("食狮.中国");
  assert.ok(!result.signals.some((item) => item.code === "invalid_link"));
  assert.ok(result.signals.some((item) => item.code === "encoded_host"));
});

test("rejects malformed hostnames even when an explicit web scheme parses", () => {
  for (const input of [
    "https://foo_bar.com",
    "https://-bad.com",
    "https://bad-.com",
    "https://foo..com",
    "https://.com",
    `https://${"a".repeat(64)}.com`,
    `https://${Array.from({ length: 4 }, () => "a".repeat(63)).join(".")}.com`,
  ]) {
    const result = analyzeLink(input);
    assert.ok(result.signals.some((item) => item.code === "invalid_link"), `${input} should have invalid hostname syntax`);
    assert.notEqual(result.risk, "insufficient");
  }
});

test("accepts a valid maximum-length label and a trailing DNS root dot", () => {
  for (const input of [`${"a".repeat(63)}.com`, "https://example.com."]) {
    const result = analyzeLink(input);
    assert.ok(!result.signals.some((item) => item.code === "invalid_link"), `${input} should have valid hostname syntax`);
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

test("inspects a complete bare domain when it appears inside message text", () => {
  const result = analyzeText("Please sign in at pausesure.com/account/verify.");
  assert.ok(result.signals.some((item) => item.code === "sensitive_path"));
  assert.ok(!result.signals.some((item) => item.code === "invalid_link"));
});

test("does not reinterpret domain-shaped substrings inside non-web text", () => {
  const email = analyzeText("Write to security@pausesure.com or security.team@pausesure.com if you have a question.");
  assert.ok(!email.signals.some((item) => item.code === "invalid_link"));
  assert.ok(!email.signals.some((item) => item.code === "sensitive_path"));

  const unsupportedScheme = analyzeText("The app callback is custom:pausesure.com/account/verify");
  assert.ok(!unsupportedScheme.signals.some((item) => item.code === "sensitive_path"));

  const versionNumber = analyzeText("Version 1.2 is ready.");
  assert.ok(!versionNumber.signals.some((item) => item.code === "ip_host"));
});

test("preserves complete suspicious bare link tokens inside message text", () => {
  const cases = [
    ["trusted.com@evil.com/account/verify", ["embedded_identity", "sensitive_path"]],
    ["trusted.com@192.0.2.9:8080/account/verify", ["embedded_identity", "ip_host", "unusual_port", "sensitive_path"]],
    ["192.0.2.9/account/verify", ["ip_host", "sensitive_path"]],
    ["//evil.com/account/verify", ["sensitive_path"]],
    ["аррӏе.com/account/verify", ["encoded_host", "sensitive_path"]],
  ];

  for (const [value, expectedSignals] of cases) {
    const result = analyzeText(`Open (${value}).`);
    for (const expectedSignal of expectedSignals) {
      assert.ok(result.signals.some((item) => item.code === expectedSignal), `${value} should produce ${expectedSignal}`);
    }
  }
});

test("flags an incomplete www address when it appears inside message text", () => {
  const result = analyzeText("Please sign in at www.pausesure before the deadline");
  assert.ok(result.signals.some((item) => item.code === "invalid_link"));
  assert.notEqual(result.risk, "insufficient");
});

test("analyzes decoded QR destinations as links", () => {
  const cases = [
    ["example.com/account/verify", "sensitive_path"],
    ["bit.ly/reset", "short_link"],
    ["javascript:alert(1)", "invalid_link"],
  ];

  for (const [value, expectedSignal] of cases) {
    const result = analyzeCheck("qr", value);
    assert.ok(result.signals.some((item) => item.code === expectedSignal), `${value} should produce ${expectedSignal}`);
    assert.notEqual(result.risk, "insufficient", `${value} should not lose its link warning in the QR flow`);
  }
});

test("inspects later links instead of allowing a benign first-link bypass", () => {
  const result = analyzeText(
    "Read https://safe.example first, then use http://trusted.example@192.0.2.9:8080/account/verify",
  );

  assert.equal(result.risk, "high");
  assert.ok(result.signals.some((item) => item.code === "embedded_identity"));
  assert.ok(result.signals.some((item) => item.code === "ip_host"));
});

test("recognizes shortened destinations with a www prefix", () => {
  const result = analyzeLink("https://www.bit.ly/reset");
  assert.ok(result.signals.some((item) => item.code === "short_link"));
});

test("warns when a message exceeds the bounded link inspection limit", () => {
  const links = Array.from({ length: 9 }, (_, index) => `https://example${index}.com`).join(" ");
  const result = analyzeText(links);
  assert.ok(result.signals.some((item) => item.code === "many_links"));
  assert.notEqual(result.risk, "insufficient");
});

test("does not claim a phone number proves identity", () => {
  const result = analyzePhone("+1 (202) 555-0123");
  assert.equal(result.risk, "insufficient");
  assert.match(result.summary, /cannot prove/i);
});
