import type { WebCheckResult } from "./checker";

export const WEB_RISK_THREAT_TYPES = [
  "MALWARE",
  "SOCIAL_ENGINEERING",
  "UNWANTED_SOFTWARE",
] as const;

export type WebRiskThreatType = (typeof WEB_RISK_THREAT_TYPES)[number];
export type ReputationResultType = "malicious" | "no_known_match" | "couldnt_verify";
export type ReputationAvailability = "available" | "unavailable";

export interface ReputationResponse {
  schemaVersion: 1;
  kind: "url";
  source: {
    id: "google_web_risk";
    name: "Google Web Risk";
  };
  resultType: ReputationResultType;
  availability: ReputationAvailability;
  checkedAt: string;
  expiresAt: string;
  threatTypes: WebRiskThreatType[];
  indicator: {
    host: string;
  };
  cached: boolean;
  lookupDurationMs?: number;
  disclaimer: string;
}

export interface ProviderReputationEvidence {
  kind: "provider_response";
  submittedURL: string;
  response: ReputationResponse;
}

export interface TransportFailureEvidence {
  kind: "transport_failure";
  submittedURL: string;
  indicator: {
    host: string;
  };
  resultType: "couldnt_verify";
  availability: "unavailable";
  attemptedAt: string;
  disclaimer: string;
}

export type ReputationEvidence = ProviderReputationEvidence | TransportFailureEvidence;

const allowedThreatTypes = new Set<string>(WEB_RISK_THREAT_TYPES);
const maximumClockSkewMilliseconds = 5 * 60 * 1_000;
const maximumFreshnessWindowMilliseconds = 25 * 60 * 60 * 1_000;
const maximumLookupDurationMilliseconds = 60_000;

export function parseReputationResponse(
  value: unknown,
  expectedSubmittedURL: string,
  now: Date = new Date(),
): ReputationResponse | null {
  if (!isRecord(value)) return null;
  const expectedHost = hostForIndicator(expectedSubmittedURL);
  if (!expectedHost) return null;

  if (value.schemaVersion !== 1 || value.kind !== "url") return null;
  if (!isRecord(value.source)) return null;
  if (value.source.id !== "google_web_risk" || value.source.name !== "Google Web Risk") {
    return null;
  }
  if (!isReputationResultType(value.resultType) || !isReputationAvailability(value.availability)) {
    return null;
  }
  if (!Array.isArray(value.threatTypes) || value.threatTypes.length > WEB_RISK_THREAT_TYPES.length) {
    return null;
  }
  if (
    !value.threatTypes.every((item) => typeof item === "string" && allowedThreatTypes.has(item))
    || new Set(value.threatTypes).size !== value.threatTypes.length
  ) {
    return null;
  }
  if (!isRecord(value.indicator) || value.indicator.host !== expectedHost) return null;
  if (typeof value.cached !== "boolean") return null;
  if (
    typeof value.disclaimer !== "string"
    || value.disclaimer.trim().length === 0
    || value.disclaimer.length > 300
  ) {
    return null;
  }
  if (
    value.lookupDurationMs !== undefined
    && (
      typeof value.lookupDurationMs !== "number"
      || !Number.isInteger(value.lookupDurationMs)
      || value.lookupDurationMs < 0
      || value.lookupDurationMs > maximumLookupDurationMilliseconds
    )
  ) {
    return null;
  }

  const checkedAt = exactTimestamp(value.checkedAt);
  const expiresAt = exactTimestamp(value.expiresAt);
  const nowMilliseconds = now.getTime();
  if (
    checkedAt === null
    || expiresAt === null
    || !Number.isFinite(nowMilliseconds)
    || checkedAt > nowMilliseconds + maximumClockSkewMilliseconds
    || expiresAt <= nowMilliseconds
    || expiresAt <= checkedAt
    || expiresAt - checkedAt > maximumFreshnessWindowMilliseconds
  ) {
    return null;
  }

  const threatTypes = value.threatTypes as WebRiskThreatType[];
  if (
    (value.resultType === "malicious"
      && (value.availability !== "available" || threatTypes.length === 0))
    || (value.resultType === "no_known_match"
      && (value.availability !== "available" || threatTypes.length !== 0))
    || (value.resultType === "couldnt_verify"
      && (value.availability !== "unavailable" || threatTypes.length !== 0))
  ) {
    return null;
  }

  return {
    schemaVersion: 1,
    kind: "url",
    source: { id: "google_web_risk", name: "Google Web Risk" },
    resultType: value.resultType,
    availability: value.availability,
    checkedAt: value.checkedAt as string,
    expiresAt: value.expiresAt as string,
    threatTypes,
    indicator: { host: expectedHost },
    cached: value.cached,
    ...(value.lookupDurationMs === undefined
      ? {}
      : { lookupDurationMs: value.lookupDurationMs as number }),
    disclaimer: value.disclaimer,
  };
}

export function providerEvidence(
  submittedURL: string,
  response: ReputationResponse,
): ProviderReputationEvidence {
  return { kind: "provider_response", submittedURL, response };
}

export function evidenceFromGatewayPayload(
  value: unknown,
  submittedURL: string,
  now: Date = new Date(),
): ReputationEvidence {
  const parsed = parseReputationResponse(value, submittedURL, now);
  return parsed
    ? providerEvidence(submittedURL, parsed)
    : transportFailureEvidence(submittedURL, now);
}

export function transportFailureEvidence(
  submittedURL: string,
  attemptedAt: Date = new Date(),
): TransportFailureEvidence {
  return {
    kind: "transport_failure",
    submittedURL,
    indicator: { host: hostForIndicator(submittedURL) ?? "unknown" },
    resultType: "couldnt_verify",
    availability: "unavailable",
    attemptedAt: attemptedAt.toISOString(),
    disclaimer: "No live provider result was received. This is not a safety result.",
  };
}

export function combineReputationDecision(
  rulesResult: WebCheckResult,
  evidence: ReputationEvidence[],
): WebCheckResult {
  const malicious = evidence.filter((item): item is ProviderReputationEvidence => (
    item.kind === "provider_response" && item.response.resultType === "malicious"
  ));
  if (malicious.length > 0) {
    const threatNames = [...new Set(malicious.flatMap((item) => item.response.threatTypes))]
      .map((type) => type.toLowerCase().replaceAll("_", " "))
      .join(", ");
    return {
      risk: "high",
      label: "High risk",
      summary: malicious.length === 1
        ? "Google Web Risk identified a checked address on one or more threat lists."
        : `Google Web Risk identified ${malicious.length} checked addresses on one or more threat lists.`,
      signals: [
        {
          code: "google_web_risk_match",
          title: "Known threat match",
          detail: threatNames
            ? `Google Web Risk reported: ${threatNames}.`
            : "Google Web Risk reported a malicious-address match.",
        },
        ...rulesResult.signals.filter((item) => item.code !== "limited_evidence"),
      ],
      nextSteps: [
        "Do not open the flagged address or enter information on its destination.",
        "Use the organization’s official app or type its known address yourself.",
        "If you already entered a password or payment detail, begin recovery now.",
      ],
      limitation: malicious[0].response.disclaimer,
    };
  }

  if (rulesResult.risk !== "insufficient") return rulesResult;
  const hasUnverifiedAddress = evidence.some((item) => (
    item.kind === "transport_failure" || item.response.resultType === "couldnt_verify"
  ));
  if (!hasUnverifiedAddress) return rulesResult;

  return {
    ...rulesResult,
    risk: "unclear",
    label: "Couldn’t verify",
    summary: "At least one checked web address did not receive a usable live threat-intelligence result.",
    limitation: "Couldn’t verify is not a safety result. Try again before using the address.",
  };
}

export class LatestCheckSequence {
  private current = 0;

  begin(): number {
    this.current += 1;
    return this.current;
  }

  invalidate(): void {
    this.current += 1;
  }

  isCurrent(sequence: number): boolean {
    return sequence === this.current;
  }
}

function hostForIndicator(value: string): string | null {
  try {
    const host = new URL(value).hostname.toLowerCase().replace(/\.$/u, "");
    return host || null;
  } catch {
    return null;
  }
}

function exactTimestamp(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const date = new Date(value);
  const milliseconds = date.getTime();
  return Number.isFinite(milliseconds) && date.toISOString() === value
    ? milliseconds
    : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isReputationResultType(value: unknown): value is ReputationResultType {
  return value === "malicious" || value === "no_known_match" || value === "couldnt_verify";
}

function isReputationAvailability(value: unknown): value is ReputationAvailability {
  return value === "available" || value === "unavailable";
}
