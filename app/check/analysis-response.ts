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
  label: "High risk" | "Unclear" | "Likely safe" | "Couldn’t verify";
  summary: string;
  signals: WebCheckSignal[];
  nextSteps: string[];
  limitation: string;
  reputation: ReputationResult[];
}

const kinds = new Set<WebCheckKind>(["text", "link", "phone", "screenshot", "qr", "audio"]);
const risks = new Set<WebRisk>(["high", "unclear", "insufficient"]);
const labels = new Set<WebCheckResult["label"]>(["High risk", "Unclear", "Likely safe", "Couldn’t verify"]);
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
    typeof value.engineVersion !== "string"
    || value.engineVersion.length < 3
    || value.engineVersion.length > 80
    || typeof value.risk !== "string"
    || !risks.has(value.risk as WebRisk)
    || typeof value.label !== "string"
    || !labels.has(value.label as WebCheckResult["label"])
    || !boundedText(value.summary, 1_000)
    || !boundedText(value.limitation, 1_000)
    || !Array.isArray(value.signals)
    || value.signals.length > 24
    || !Array.isArray(value.nextSteps)
    || value.nextSteps.length > 12
    || !Array.isArray(value.reputation)
    || value.reputation.length > 8
  ) return null;

  const kind = value.kind as WebCheckKind;
  const risk = value.risk as WebRisk;
  const label = value.label as WebCheckResult["label"];
  if (!kinds.has(kind) || !validLabelForRisk(risk, label)) return null;
  const signals = value.signals.map(parseSignal);
  const reputation = value.reputation.map((item) => parseReputation(item, nowMilliseconds));
  if (signals.some((item) => item === null) || reputation.some((item) => item === null)) return null;
  if (!value.nextSteps.every((item) => boundedText(item, 500))) return null;

  return {
    schemaVersion: 1,
    engineVersion: value.engineVersion,
    kind,
    risk,
    label,
    summary: value.summary,
    signals: signals as WebCheckSignal[],
    nextSteps: value.nextSteps as string[],
    limitation: value.limitation,
    reputation: reputation as ReputationResult[],
  };
}

function parseSignal(value: unknown): WebCheckSignal | null {
  if (
    !isRecord(value)
    || !boundedToken(value.code, 80)
    || !boundedText(value.title, 200)
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
    || !boundedText(value.indicator.host, 253)
    || !/^(?:[a-z\d](?:[a-z\d.-]*[a-z\d])?|\[[a-f\d:]+\])$/u.test(value.indicator.host)
  ) return null;
  const resultType = value.resultType as ReputationResult["resultType"];
  const availability = value.availability as ReputationResult["availability"];
  const checkedAtMilliseconds = Date.parse(value.checkedAt);
  const expiresAtMilliseconds = Date.parse(value.expiresAt);
  if (
    checkedAtMilliseconds > nowMilliseconds + 5 * 60_000
    || expiresAtMilliseconds <= nowMilliseconds
    || expiresAtMilliseconds <= checkedAtMilliseconds
    || expiresAtMilliseconds - checkedAtMilliseconds > 24 * 60 * 60_000
  ) return null;
  if (
    (resultType === "malicious" && (availability !== "available" || value.threatTypes.length === 0))
    || (resultType === "no_known_match" && (availability !== "available" || value.threatTypes.length !== 0))
    || (resultType === "couldnt_verify" && (availability !== "unavailable" || value.threatTypes.length !== 0))
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
  return label === "Likely safe" || label === "Couldn’t verify";
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
