import { ianaTopLevelDomains } from "./iana-top-level-domains.js";

export type WebCheckKind = "text" | "link" | "phone" | "screenshot" | "qr";

export type WebRisk = "high" | "unclear" | "insufficient";

export interface WebCheckSignal {
  code: string;
  title: string;
  detail: string;
}

export interface WebCheckResult {
  risk: WebRisk;
  label: string;
  summary: string;
  signals: WebCheckSignal[];
  nextSteps: string[];
  limitation: string;
}

const patterns = {
  urgency: /\b(urgent|immediately|right now|today only|final notice|act now|within \d+ (?:minute|hour)s?|account (?:will be )?(?:closed|suspended|locked)|warrant|arrest)\b/i,
  secrecy: /\b(don't tell|do not tell|keep (?:this|it) secret|stay on the (?:phone|line)|no one else|between us)\b/i,
  payment: /\b(gift cards?|wire transfer|bank transfer|cryptocurrency|bitcoin|crypto|payment app|cash app|zelle|venmo|western union|moneygram|deposit|pay a fee)\b/i,
  credential: /\b(password|passcode|verification code|one[- ]time code|security code|social security|ssn|bank account|card number|seed phrase|recovery phrase)\b/i,
  impersonation: /\b(irs|social security administration|police|sheriff|fbi|customs|your bank|fraud department|technical support|microsoft support|apple support|amazon support)\b/i,
  remoteAccess: /\b(anydesk|teamviewer|screen share|remote access|install this app|download this app)\b/i,
};

const shorteners = new Set(["bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "is.gd", "buff.ly"]);
const maximumLinksPerMessage = 8;
const maximumLinkCharacters = 2_048;
const boundedTextTokenPattern = new RegExp(
  `(?:^|\\s)(\\S{1,${maximumLinkCharacters}})(?=\\s|$)`,
  "gu",
);
const leadingLinkPunctuation = new Set(["<", "(", "[", "{", "\"", "'", "“", "‘"]);
const trailingLinkPunctuation = new Set([">", ")", "]", "}", "\"", "'", "”", "’", ".", ",", "!", "?", ";", ":"]);

interface HostnameInspection {
  normalizedHostname: string;
  labelCount: number;
  isNumeric: boolean;
  hasValidSyntax: boolean;
  hasRecognizedTopLevelDomain: boolean;
}

function inspectHostname(hostname: string): HostnameInspection {
  const normalizedHostname = hostname.toLowerCase().replace(/\.$/, "");
  const labels = normalizedHostname.split(".");
  const isIpv4 = /^\d{1,3}(?:\.\d{1,3}){3}$/.test(normalizedHostname);
  const isIpv6 = normalizedHostname.startsWith("[")
    && normalizedHostname.endsWith("]")
    && normalizedHostname.includes(":");
  const isNumeric = isIpv4 || isIpv6;
  const hasValidSyntax = normalizedHostname.length > 0
    && normalizedHostname.length <= 253
    && labels.every((label) =>
      label.length >= 1
      && label.length <= 63
      && /^[a-z\d](?:[a-z\d-]*[a-z\d])?$/i.test(label),
    );

  return {
    normalizedHostname,
    labelCount: labels.length,
    isNumeric,
    hasValidSyntax,
    hasRecognizedTopLevelDomain: hasValidSyntax
      && labels.length >= 2
      && ianaTopLevelDomains.has(labels[labels.length - 1]),
  };
}

function trimLinkToken(token: string): string {
  let start = 0;
  let end = token.length;
  while (start < end && leadingLinkPunctuation.has(token[start])) start += 1;
  while (end > start && trailingLinkPunctuation.has(token[end - 1])) end -= 1;
  return token.slice(start, end);
}

function normalizeWebAddress(value: string): string {
  const raw = value.trim();
  if (!raw) return raw;

  // Keep explicit schemes intact so HTTP and non-web schemes cannot silently
  // become HTTPS. A domain followed by a numeric port is the one ambiguous
  // case (for example, example.com:8443), so it is handled as a bare address.
  if (/^[a-z][a-z\d+.-]*:\/\//i.test(raw)) return raw;
  if (/^[a-z][a-z\d+.-]*:(?!\d+(?:[/?#]|$))/i.test(raw)) return raw;
  if (raw.startsWith("//")) return `https:${raw}`;

  // Only add HTTPS when the input parses as a syntactically valid dotted
  // hostname or numeric host. This avoids turning arbitrary text into
  // something URL-shaped while accepting forms such as www.example.com/path.
  if (/[\s\\]/.test(raw)) return raw;

  try {
    const candidate = new URL(`https://${raw}`);
    const hostname = inspectHostname(candidate.hostname);

    return hostname.isNumeric || (hostname.hasValidSyntax && hostname.labelCount >= 2)
      ? candidate.toString()
      : raw;
  } catch {
    return raw;
  }
}

function looksLikeStandaloneEmail(value: string): boolean {
  const firstAt = value.indexOf("@");
  if (firstAt <= 0 || firstAt !== value.lastIndexOf("@")) return false;

  const destination = value.slice(firstAt + 1);
  return !/[/?#]/.test(destination) && !/:\d+(?:$)/.test(destination);
}

function shouldInspectTextLink(value: string): boolean {
  if (/^(?:https?:\/\/|\/\/|www\.)/i.test(value)) return true;

  // Preserve domain:port while refusing to reinterpret custom schemes as
  // HTTPS, and leave ordinary email addresses out of message-link analysis.
  if (/^[a-z][a-z\d+.-]*:(?!\d+(?:[/?#]|$))/i.test(value)) return false;
  if (looksLikeStandaloneEmail(value)) return false;
  if (!/[.@\[\]]/u.test(value)) return false;

  try {
    const candidate = new URL(normalizeWebAddress(value));
    if (!["http:", "https:"].includes(candidate.protocol) || !candidate.hostname) return false;

    const hostname = inspectHostname(candidate.hostname);
    if (hostname.isNumeric) {
      return Boolean(candidate.username || candidate.password)
        || /^(?:\d{1,3}\.){3}\d{1,3}(?::\d+)?(?:[/?#]|$)/.test(value)
        || /^\[[a-f\d:]+\](?::\d+)?(?:[/?#]|$)/i.test(value);
    }
    return hostname.hasRecognizedTopLevelDomain;
  } catch {
    return false;
  }
}

function signal(code: string, title: string, detail: string): WebCheckSignal {
  return { code, title, detail };
}

function resultFor(signals: WebCheckSignal[], context: string): WebCheckResult {
  const strongCodes = new Set(["payment", "credential", "secrecy", "remote_access", "embedded_identity", "ip_host", "encoded_host"]);
  const strongCount = signals.filter((item) => strongCodes.has(item.code)).length;
  const risk: WebRisk = strongCount >= 1 && signals.length >= 2 ? "high" : signals.length > 0 ? "unclear" : "insufficient";

  if (risk === "high") {
    return {
      risk,
      label: "Strong warning signals",
      summary: `Pause before acting. ${context} contains a combination commonly used to create pressure or hide identity.`,
      signals,
      nextSteps: [
        "Do not reply, pay, click, call back, or share a code yet.",
        "Leave the incoming channel and use an official app, statement, card, or website you find yourself.",
        "Ask someone you trust before taking a time-sensitive or irreversible action.",
      ],
      limitation: "This is a warning based on visible patterns, not proof of who sent the request.",
    };
  }

  if (risk === "unclear") {
    return {
      risk,
      label: "Verify before acting",
      summary: `PauseSure found something worth checking in ${context}, but the available evidence is not enough for a definitive conclusion.`,
      signals,
      nextSteps: [
        "Do not use contact details or links supplied in the request.",
        "Verify the request through an official channel you locate independently.",
        "Keep money and sensitive information where they are while you check.",
      ],
      limitation: "A warning can be a false positive, and a missing warning never means a request is safe.",
    };
  }

  return {
    risk,
    label: "Not enough evidence",
    summary: `No strong pattern was visible in ${context}. That does not establish that the sender, link, or request is legitimate.`,
    signals: [signal("limited_evidence", "Limited visible evidence", "Many scams look ordinary at first or depend on context outside this check.")],
    nextSteps: [
      "Verify unexpected requests through an official channel you find yourself.",
      "Never share a password, security code, or payment because someone is rushing you.",
      "Check again if the conversation changes or a payment request appears.",
    ],
    limitation: "PauseSure cannot guarantee that something is safe.",
  };
}

export function analyzeText(value: string): WebCheckResult {
  const text = value.trim();
  if (!text) return resultFor([], "the text provided");

  const signals: WebCheckSignal[] = [];
  if (patterns.urgency.test(text)) signals.push(signal("urgency", "Pressure or urgency", "The wording pushes for action before there is time to verify."));
  if (patterns.secrecy.test(text)) signals.push(signal("secrecy", "Secrecy request", "Legitimate organizations and loved ones should not prevent you from asking for help."));
  if (patterns.payment.test(text)) signals.push(signal("payment", "Hard-to-reverse payment", "The request mentions a payment method frequently used to make recovery difficult."));
  if (patterns.credential.test(text)) signals.push(signal("credential", "Sensitive information requested", "Passwords, codes, account details, and recovery phrases should not be shared in response to an unexpected contact."));
  if (patterns.impersonation.test(text)) signals.push(signal("impersonation", "Claimed trusted identity", "A familiar organization name can be copied. Verify through contact information you find independently."));
  if (patterns.remoteAccess.test(text)) signals.push(signal("remote_access", "Remote device access", "Unexpected requests to install remote-control software can expose accounts and files."));

  let inspectedLinks = 0;
  for (const tokenMatch of text.matchAll(boundedTextTokenPattern)) {
    const linkValue = trimLinkToken(tokenMatch[1]);
    if (
      !linkValue
      || linkValue.length > maximumLinkCharacters
      || !shouldInspectTextLink(linkValue)
    ) continue;
    if (inspectedLinks >= maximumLinksPerMessage) {
      if (!signals.some((existing) => existing.code === "many_links")) {
        signals.push(signal("many_links", "Many destinations", "The message contains more links than this first check inspects individually. Verify every destination independently."));
      }
      break;
    }
    inspectedLinks += 1;
    const linkResult = analyzeLink(linkValue);
    for (const item of linkResult.signals) {
      if (item.code !== "limited_evidence" && !signals.some((existing) => existing.code === item.code)) signals.push(item);
    }
  }

  return resultFor(signals, "this message");
}

export function analyzeLink(value: string): WebCheckResult {
  const raw = value.trim();
  const signals: WebCheckSignal[] = [];
  let url: URL;
  try {
    url = new URL(normalizeWebAddress(raw));
  } catch {
    return resultFor([signal("invalid_link", "Incomplete or invalid link", "A trustworthy destination should be presented as a complete, inspectable web address.")], "this link");
  }

  if (!["http:", "https:"].includes(url.protocol) || !url.hostname) {
    return resultFor([signal("invalid_link", "Unsupported link type", "PauseSure checks HTTP and HTTPS website addresses. Other link types need a different verification route.")], "this link");
  }

  const hostname = inspectHostname(url.hostname);
  const host = hostname.normalizedHostname;
  if (!hostname.isNumeric && !hostname.hasValidSyntax) {
    signals.push(signal(
      "invalid_link",
      "Invalid website address",
      "The destination name is malformed. Each part must use letters, numbers, or interior hyphens and stay within standard length limits.",
    ));
  } else if (!hostname.isNumeric && !hostname.hasRecognizedTopLevelDomain) {
    signals.push(signal(
      "invalid_link",
      "Incomplete website address",
      "This address does not end in a recognized top-level domain such as .com, .ai, or .co. Do not guess the missing ending; ask for or find the complete address independently.",
    ));
  }
  if (url.protocol !== "https:") signals.push(signal("unencrypted", "No encrypted connection", "This address does not begin with HTTPS. Do not enter personal or payment information."));
  if (url.username || url.password || raw.includes("@")) signals.push(signal("embedded_identity", "Hidden destination pattern", "The address includes identity text that can make a different destination look legitimate."));
  if (hostname.isNumeric) signals.push(signal("ip_host", "Numeric destination", "The address uses a numeric host instead of a recognizable organization domain."));
  if (host.includes("xn--")) signals.push(signal("encoded_host", "Encoded domain name", "Internationalized domain encoding can be legitimate, but it can also imitate familiar letters."));
  if (url.port && !["80", "443"].includes(url.port)) signals.push(signal("unusual_port", "Unusual network port", "The address uses a nonstandard port that deserves additional verification."));
  if (host.split(".").length > 4) signals.push(signal("deep_subdomain", "Long destination name", "Important organization names placed early in a long address may not control the actual domain."));
  const comparableHost = host.startsWith("www.") ? host.slice(4) : host;
  if (shorteners.has(comparableHost)) signals.push(signal("short_link", "Destination is hidden", "A shortened address prevents you from seeing the final website before opening it."));
  if (/\b(login|verify|secure|wallet|payment|invoice|account)\b/i.test(url.pathname.replace(/[-_]/g, " "))) signals.push(signal("sensitive_path", "Sensitive-action wording", "The address asks for a login, verification, account, or payment action. Confirm the real domain first."));

  return resultFor(signals, "this web address");
}

export function analyzePhone(value: string): WebCheckResult {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) {
    return resultFor([signal("invalid_phone", "Number format needs checking", "The number does not look like a complete national or international phone number.")], "this phone number");
  }
  return {
    ...resultFor([], "this phone number"),
    summary: "A phone number alone cannot prove who is calling. Caller ID can be spoofed, including a number that appears familiar.",
    nextSteps: [
      "Do not call back using a number supplied in an unexpected message.",
      "Find the organization’s official number on its app, statement, card, or verified website.",
      "If the caller claimed to be someone you know, call that person using a number already saved in your contacts.",
    ],
  };
}

export function analyzeCheck(kind: WebCheckKind, value: string): WebCheckResult {
  if (kind === "link") return analyzeLink(value);
  if (kind === "qr") return analyzeLink(value);
  if (kind === "phone") return analyzePhone(value);
  return analyzeText(value);
}
