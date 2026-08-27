export type WebCheckKind = "text" | "link" | "phone" | "screenshot" | "qr" | "audio";
export type WebRisk = "high" | "unclear" | "insufficient";

export interface WebCheckSignal {
  code: string;
  title: string;
  detail: string;
  severity: "warning" | "critical";
}

export interface ReputationResult {
  resultType: "malicious" | "no_known_match" | "couldnt_verify";
  availability: "available" | "unavailable";
  source: { id: string; name: string };
  checkedAt: string;
  expiresAt: string;
  threatTypes: string[];
  cached: boolean;
  lookupDurationMs: number;
  disclaimer: string;
  indicator: { host: string };
}

export interface WebCheckResult {
  schemaVersion: 1;
  engineVersion: string;
  kind: WebCheckKind;
  risk: WebRisk;
  label: "High risk" | "Unclear" | "Couldn’t verify";
  summary: string;
  signals: WebCheckSignal[];
  nextSteps: string[];
  limitation: string;
  reputation: ReputationResult[];
}

export async function readBoundedJSON(
  response: Response,
  maximumBytes: number,
): Promise<unknown | null> {
  if (!Number.isSafeInteger(maximumBytes) || maximumBytes < 1) {
    await cancelResponseBody(response.body);
    return null;
  }
  const contentType = response.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
  if (contentType !== "application/json" || !response.body) {
    await cancelResponseBody(response.body);
    return null;
  }

  const declaredLengthHeader = response.headers.get("content-length");
  if (declaredLengthHeader !== null) {
    const declaredLength = Number(declaredLengthHeader);
    if (Number.isFinite(declaredLength) && declaredLength > maximumBytes) {
      await cancelResponseBody(response.body);
      return null;
    }
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maximumBytes) {
        try { await reader.cancel(); } catch { /* response stream already failed */ }
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(body)) as unknown;
}

async function cancelResponseBody(body: ReadableStream<Uint8Array> | null): Promise<void> {
  if (!body) return;
  try { await body.cancel(); } catch { /* best-effort cancellation */ }
}

const kinds = new Set<WebCheckKind>(["text", "link", "phone", "screenshot", "qr", "audio"]);
const risks = new Set<WebRisk>(["high", "unclear", "insufficient"]);
const labels = new Set<WebCheckResult["label"]>(["High risk", "Unclear", "Couldn’t verify"]);
const resultTypes = new Set<ReputationResult["resultType"]>(["malicious", "no_known_match", "couldnt_verify"]);
const threatTypes = new Set([
  "MALWARE",
  "SOCIAL_ENGINEERING",
  "SOCIAL_ENGINEERING_EXTENDED_COVERAGE",
  "UNWANTED_SOFTWARE",
]);

export function parseAnalysisResponse(
  value: unknown,
  expectedKind: WebCheckKind,
  now: Date = new Date(),
): WebCheckResult | null {
  if (!isRecord(value) || value.schemaVersion !== 1 || value.kind !== expectedKind) return null;
  const nowMilliseconds = now.getTime();
  if (!Number.isFinite(nowMilliseconds)) return null;
  if (
    !supportedEngineVersion(value.engineVersion)
    || typeof value.risk !== "string"
    || !risks.has(value.risk as WebRisk)
    || typeof value.label !== "string"
    || !labels.has(value.label as WebCheckResult["label"])
    || !boundedText(value.summary, 1_000)
    || !boundedText(value.limitation, 800)
    || !Array.isArray(value.signals)
    || value.signals.length > 24
    || !Array.isArray(value.nextSteps)
    || value.nextSteps.length < 1
    || value.nextSteps.length > 3
    || !Array.isArray(value.reputation)
    || value.reputation.length > 2
  ) return null;

  const kind = value.kind as WebCheckKind;
  const risk = value.risk as WebRisk;
  const label = value.label as WebCheckResult["label"];
  if (!kinds.has(kind) || !validLabelForRisk(risk, label)) return null;
  const signals = value.signals.map(parseSignal);
  const reputation = value.reputation.map((item) => parseReputation(item, nowMilliseconds));
  if (signals.some((item) => item === null) || reputation.some((item) => item === null)) return null;
  if (!value.nextSteps.every((item) => boundedText(item, 800))) return null;
  const parsedSignals = signals as WebCheckSignal[];
  const parsedReputation = reputation as ReputationResult[];
  const hasMaliciousReputation = parsedReputation.some((item) => item.resultType === "malicious");
  const hasThreatSignal = parsedSignals.some((item) => item.code === "known_threat_match");
  if (
    (hasMaliciousReputation && (risk !== "high" || label !== "High risk" || !hasThreatSignal))
    || (hasThreatSignal && !hasMaliciousReputation)
    || (risk === "high" && parsedSignals.length === 0)
    || (risk === "unclear" && parsedSignals.length === 0)
    || (kind === "phone" && parsedReputation.length > 0)
  ) return null;

  return {
    schemaVersion: 1,
    engineVersion: value.engineVersion,
    kind,
    risk,
    label,
    summary: value.summary,
    signals: parsedSignals,
    nextSteps: value.nextSteps as string[],
    limitation: value.limitation,
    reputation: parsedReputation,
  };
}

function parseSignal(value: unknown): WebCheckSignal | null {
  if (
    !isRecord(value)
    || !boundedToken(value.code, 80)
    || !boundedText(value.title, 160)
    || !boundedText(value.detail, 800)
    || (value.severity !== "warning" && value.severity !== "critical")
  ) return null;
  return {
    code: value.code,
    title: value.title,
    detail: value.detail,
    severity: value.severity,
  };
}

function parseReputation(value: unknown, nowMilliseconds: number): ReputationResult | null {
  if (
    !isRecord(value)
    || value.schemaVersion !== 1
    || value.kind !== "url"
    || typeof value.resultType !== "string"
    || !resultTypes.has(value.resultType as ReputationResult["resultType"])
    || (value.availability !== "available" && value.availability !== "unavailable")
    || !isRecord(value.source)
    || value.source.id !== "google_web_risk"
    || value.source.name !== "Google Web Risk"
    || !exactTimestamp(value.checkedAt)
    || !exactTimestamp(value.expiresAt)
    || !Array.isArray(value.threatTypes)
    || value.threatTypes.length > 4
    || !value.threatTypes.every((item) => typeof item === "string" && threatTypes.has(item))
    || new Set(value.threatTypes).size !== value.threatTypes.length
    || typeof value.cached !== "boolean"
    || typeof value.lookupDurationMs !== "number"
    || !Number.isInteger(value.lookupDurationMs)
    || value.lookupDurationMs < 0
    || value.lookupDurationMs > 60_000
    || !boundedText(value.disclaimer, 500)
    || !isRecord(value.indicator)
    || !validReputationHost(value.indicator.host)
  ) return null;
  const resultType = value.resultType as ReputationResult["resultType"];
  const availability = value.availability as ReputationResult["availability"];
  const checkedAtMilliseconds = Date.parse(value.checkedAt);
  const expiresAtMilliseconds = Date.parse(value.expiresAt);
  if (checkedAtMilliseconds > nowMilliseconds + 5 * 60_000) return null;
  if (
    (resultType === "malicious" && (availability !== "available" || value.threatTypes.length === 0))
    || (resultType === "no_known_match" && (
      availability !== "available"
      || value.threatTypes.length !== 0
      || value.cached
      || expiresAtMilliseconds !== checkedAtMilliseconds
      || nowMilliseconds - checkedAtMilliseconds > 5 * 60_000
    ))
    || (resultType === "couldnt_verify" && (availability !== "unavailable" || value.threatTypes.length !== 0))
  ) return null;
  if (
    resultType !== "no_known_match"
    && (
      expiresAtMilliseconds <= nowMilliseconds
      || expiresAtMilliseconds <= checkedAtMilliseconds
      || expiresAtMilliseconds - checkedAtMilliseconds > (
        resultType === "malicious" ? 30 * 60_000 : 5 * 60_000
      )
    )
  ) return null;
  return {
    resultType,
    availability,
    source: { id: value.source.id, name: value.source.name },
    checkedAt: value.checkedAt,
    expiresAt: value.expiresAt,
    threatTypes: value.threatTypes as string[],
    cached: value.cached,
    lookupDurationMs: value.lookupDurationMs,
    disclaimer: value.disclaimer,
    indicator: { host: value.indicator.host },
  };
}

function validLabelForRisk(risk: WebRisk, label: WebCheckResult["label"]): boolean {
  if (risk === "high") return label === "High risk";
  if (risk === "unclear") return label === "Unclear";
  return label === "Couldn’t verify";
}

function supportedEngineVersion(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const match = /^pausesure-rules-(\d+)\.(\d+)\.(\d+)$/u.exec(value);
  if (!match) return false;
  const major = Number(match[1]);
  const minor = Number(match[2]);
  const patch = Number(match[3]);
  if (![major, minor, patch].every(Number.isSafeInteger)) return false;
  return major > 6 || (major === 6 && minor >= 1);
}

function exactTimestamp(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const milliseconds = Date.parse(value);
  return Number.isFinite(milliseconds) && new Date(milliseconds).toISOString() === value;
}

function boundedText(value: unknown, maximum: number): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= maximum;
}

function boundedToken(value: unknown, maximum: number): value is string {
  return boundedText(value, maximum) && /^[a-z\d_.-]+$/iu.test(value);
}

function validReputationHost(value: unknown): value is string {
  if (!boundedText(value, 253)) return false;
  if (value.includes(":")) return isCanonicalUnbracketedIPv6(value);
  if (isCanonicalIPv4(value)) return true;

  // A host made only of digits and dots is an IPv4 candidate, not a DNS name.
  // Reject abbreviated, out-of-range, and otherwise noncanonical forms rather
  // than letting them pass the more permissive DNS-label rules below.
  if (/^[\d.]+$/u.test(value)) return false;

  const labels = value.split(".");
  if (labels.some((label) => (
    label.length === 0
    || label.length > 63
    || !/^[a-z\d](?:[a-z\d-]*[a-z\d])?$/u.test(label)
  ))) return false;

  try {
    // Exact round-tripping also rejects malformed punycode and any hostname
    // that the URL parser would normalize into a different destination.
    return new URL(`https://${value}/`).hostname === value;
  } catch {
    return false;
  }
}

function isCanonicalIPv4(value: string): boolean {
  const octets = value.split(".");
  return octets.length === 4 && octets.every((octet) => (
    /^(?:0|[1-9]\d{0,2})$/u.test(octet)
    && Number(octet) <= 255
  ));
}

function isCanonicalUnbracketedIPv6(value: string): boolean {
  if (!value.includes(":") || !/^[a-f\d:]+$/u.test(value)) return false;
  try {
    const parsed = new URL(`https://[${value}]/`);
    return parsed.hostname === `[${value}]`;
  } catch {
    return false;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export class LatestCheckSequence {
  private value = 0;

  begin(): number {
    this.value += 1;
    return this.value;
  }

  invalidate(): void {
    this.value += 1;
  }

  isCurrent(candidate: number): boolean {
    return candidate === this.value;
  }
}
