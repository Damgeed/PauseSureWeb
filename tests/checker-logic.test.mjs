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

test("does not claim a phone number proves identity", () => {
  const result = analyzePhone("+1 (202) 555-0123");
  assert.equal(result.risk, "insufficient");
  assert.match(result.summary, /cannot prove/i);
});
