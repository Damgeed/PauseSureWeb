const canonicalOrigin = "https://pausesure.com";
const maximumBodyBytes = 4_096;
const retentionDays = 180;

const inputValues = new Set(["text", "link", "screenshot", "qr", "phone"]);
const riskValues = new Set(["high", "unclear", "insufficient"]);
const actionValues = new Set(["verify", "recover"]);
const channelValues = new Set(["web"]);

const eventSchemas = {
  web_check_started: { input: inputValues, channel: channelValues },
  web_check_completed: { input: inputValues, risk: riskValues, channel: channelValues },
  result_viewed: { input: inputValues, risk: riskValues, channel: channelValues },
  next_action_selected: { action: actionValues, risk: riskValues, channel: channelValues },
} as const;

const createPrivacyEventTable = `
  CREATE TABLE IF NOT EXISTS privacy_event_daily (
    day TEXT NOT NULL CHECK (
      length(day) = 10
      AND day GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
      AND date(day, '+0 days') = day
    ),
    event_name TEXT NOT NULL CHECK (event_name IN (
      'web_check_started',
      'web_check_completed',
      'result_viewed',
      'next_action_selected'
    )),
    input_kind TEXT NOT NULL CHECK (input_kind IN (
      'none', 'text', 'link', 'screenshot', 'qr', 'phone'
    )),
    risk TEXT NOT NULL CHECK (risk IN (
      'none', 'high', 'unclear', 'insufficient'
    )),
    action TEXT NOT NULL CHECK (action IN (
      'none', 'verify', 'recover'
    )),
    channel TEXT NOT NULL CHECK (channel = 'web'),
    event_count INTEGER NOT NULL CHECK (event_count BETWEEN 1 AND 9007199254740991),
    updated_at INTEGER NOT NULL CHECK (updated_at > 0),
    CHECK (
      (
        event_name = 'web_check_started'
        AND input_kind <> 'none'
        AND risk = 'none'
        AND action = 'none'
      )
      OR (
        event_name IN ('web_check_completed', 'result_viewed')
        AND input_kind <> 'none'
        AND risk <> 'none'
        AND action = 'none'
      )
      OR (
        event_name = 'next_action_selected'
        AND input_kind = 'none'
        AND risk <> 'none'
        AND action <> 'none'
      )
    ),
    PRIMARY KEY(day, event_name, input_kind, risk, action, channel)
  )
`;

const schemaInitializationByDatabase = new WeakMap<D1Database, Promise<void>>();

async function ensurePrivacyEventTable(database: D1Database) {
  let initialization = schemaInitializationByDatabase.get(database);
  if (!initialization) {
    initialization = database.exec(createPrivacyEventTable)
      .then(() => undefined)
      .catch((error) => {
        schemaInitializationByDatabase.delete(database);
        throw error;
      });
    schemaInitializationByDatabase.set(database, initialization);
  }
  await initialization;
}

type EventName = keyof typeof eventSchemas;

export interface PrivacyEventEnv {
  DB?: D1Database;
  ANALYTICS_RATE_LIMITER?: RateLimit;
}

type EventBody = {
  schemaVersion: 1;
  name: EventName;
  day: string;
  count: 1;
  dimensions: Record<string, string>;
};

type BodyReadResult =
  | { ok: true; value: string }
  | { ok: false; reason: "invalid-encoding" | "too-large" };

function exactKeys(value: Record<string, unknown>, keys: readonly string[]) {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

function validDay(day: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const yesterday = new Date(now.getTime() - 86_400_000).toISOString().slice(0, 10);
  return day === today || day === yesterday;
}

function parseEvent(value: unknown): EventBody | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (!exactKeys(record, ["schemaVersion", "name", "day", "count", "dimensions"])) return null;
  if (record.schemaVersion !== 1 || typeof record.name !== "string" || !Object.hasOwn(eventSchemas, record.name)) return null;
  if (typeof record.day !== "string" || !validDay(record.day) || record.count !== 1) return null;
  if (!record.dimensions || typeof record.dimensions !== "object" || Array.isArray(record.dimensions)) return null;

  const name = record.name as EventName;
  const dimensions = record.dimensions as Record<string, unknown>;
  const schema = eventSchemas[name] as Record<string, ReadonlySet<string>>;
  if (!exactKeys(dimensions, Object.keys(schema))) return null;
  for (const [key, rawValue] of Object.entries(dimensions)) {
    if (typeof rawValue !== "string" || !schema[key]?.has(rawValue)) return null;
  }

  return record as EventBody;
}

function jsonError(message: string, status: number, extraHeaders?: Record<string, string>) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...extraHeaders,
    },
  });
}

function isExactJsonMediaType(value: string | null) {
  return /^application\/json(?:\s*;\s*charset\s*=\s*(?:utf-8|"utf-8"))?$/i.test(value?.trim() ?? "");
}

function canonicalIPv4(value: string): string | null {
  if (!/^\d{1,3}(?:\.\d{1,3}){3}$/u.test(value)) return null;
  const octets = value.split(".").map(Number);
  if (octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) return null;
  const canonical = octets.join(".");
  return canonical === value ? canonical : null;
}

function expandedIPv6(value: string): number[] | null {
  const pieces = value.split("::");
  if (pieces.length > 2) return null;
  const left = pieces[0] ? pieces[0].split(":") : [];
  const right = pieces.length === 2 && pieces[1] ? pieces[1].split(":") : [];
  const missing = 8 - left.length - right.length;
  if ((pieces.length === 1 && missing !== 0) || (pieces.length === 2 && missing < 1)) return null;
  const groups = [
    ...left,
    ...Array.from({ length: pieces.length === 2 ? missing : 0 }, () => "0"),
    ...right,
  ];
  if (groups.length !== 8 || groups.some((group) => !/^[a-f\d]{1,4}$/u.test(group))) return null;
  return groups.map((group) => Number.parseInt(group, 16));
}

function analyticsRateLimitKey(value: string): string | null {
  const ipv4 = canonicalIPv4(value);
  if (ipv4) return `v4:${ipv4}`;
  if (!value.includes(":") || !/^[a-f\d:.]+$/iu.test(value)) return null;
  try {
    const hostname = new URL(`https://[${value}]/`).hostname;
    const canonical = hostname.slice(1, -1);
    const groups = expandedIPv6(canonical);
    if (!groups) return null;
    if (
      groups.slice(0, 5).every((group) => group === 0)
      && groups[5] === 0xffff
    ) {
      const high = groups[6] ?? 0;
      const low = groups[7] ?? 0;
      return `v4:${high >> 8}.${high & 0xff}.${low >> 8}.${low & 0xff}`;
    }
    return `v6:${groups.slice(0, 4).map((group) => group.toString(16).padStart(4, "0")).join(":")}/64`;
  } catch {
    return null;
  }
}

async function readBoundedUtf8Body(request: Request): Promise<BodyReadResult> {
  if (!request.body) return { ok: true, value: "" };

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maximumBodyBytes) {
        try { await reader.cancel("request body exceeds analytics limit"); } catch { /* stream already closed */ }
        return { ok: false, reason: "too-large" };
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return { ok: true, value: new TextDecoder("utf-8", { fatal: true }).decode(bytes) };
  } catch {
    return { ok: false, reason: "invalid-encoding" };
  }
}

function retentionCutoff(now: Date) {
  return new Date(now.getTime() - retentionDays * 86_400_000).toISOString().slice(0, 10);
}

export async function deleteExpiredPrivacyEvents(env: PrivacyEventEnv, now = new Date()) {
  if (!env.DB) throw new Error("Analytics retention cleanup could not be completed.");
  await ensurePrivacyEventTable(env.DB);
  await env.DB.prepare("DELETE FROM privacy_event_daily WHERE day <= ?").bind(retentionCutoff(now)).run();
}

export async function handlePrivacyEvents(request: Request, env: PrivacyEventEnv): Promise<Response> {
  if (request.method !== "POST") {
    return new Response(null, { status: 405, headers: { allow: "POST", "cache-control": "no-store" } });
  }

  const requestUrl = new URL(request.url);
  if (requestUrl.origin !== canonicalOrigin || request.headers.get("origin") !== canonicalOrigin) {
    return jsonError("Canonical same-origin requests only.", 403);
  }
  if (!isExactJsonMediaType(request.headers.get("content-type"))) return jsonError("JSON required.", 415);

  const contentLength = request.headers.get("content-length");
  if (contentLength !== null) {
    if (!/^\d+$/.test(contentLength)) return jsonError("Invalid Content-Length.", 400);
    if (Number(contentLength) > maximumBodyBytes) return jsonError("Request too large.", 413);
  }

  const clientAddress = request.headers.get("cf-connecting-ip");
  if (!env.ANALYTICS_RATE_LIMITER || !clientAddress) {
    return jsonError("Analytics request could not be completed.", 503);
  }
  const clientRateLimitKey = analyticsRateLimitKey(clientAddress);
  if (!clientRateLimitKey) return jsonError("Analytics request could not be completed.", 503);
  // The edge limiter uses this request-scoped key only for abuse control. It is
  // never included in the D1 statements, analytics dimensions, or application logs.
  let rateLimit: { success: boolean };
  try {
    rateLimit = await env.ANALYTICS_RATE_LIMITER.limit({ key: `privacy-events:${clientRateLimitKey}` });
  } catch {
    return jsonError("Analytics request could not be completed.", 503);
  }
  if (!rateLimit.success) {
    return jsonError("Too many analytics requests.", 429, { "retry-after": "60" });
  }

  const raw = await readBoundedUtf8Body(request);
  if (!raw.ok) {
    return raw.reason === "too-large"
      ? jsonError("Request too large.", 413)
      : jsonError("Request must use valid UTF-8.", 400);
  }

  let body: unknown;
  try { body = JSON.parse(raw.value); } catch { return jsonError("Invalid JSON.", 400); }
  if (!body || typeof body !== "object" || Array.isArray(body) || !exactKeys(body as Record<string, unknown>, ["events"])) {
    return jsonError("Invalid analytics envelope.", 400);
  }

  const rawEvents = (body as { events?: unknown }).events;
  if (!Array.isArray(rawEvents) || rawEvents.length < 1 || rawEvents.length > 3) {
    return jsonError("Invalid event batch.", 400);
  }
  const events = rawEvents.map(parseEvent);
  if (events.some((event) => event === null)) {
    return jsonError("Event contains unsupported or identifying fields.", 400);
  }
  if (!env.DB) return jsonError("Analytics request could not be completed.", 503);
  await ensurePrivacyEventTable(env.DB);

  const statements: D1PreparedStatement[] = [];
  for (const event of events as EventBody[]) {
    const dims = event.dimensions;
    statements.push(env.DB.prepare(`
      INSERT INTO privacy_event_daily
        (day, event_name, input_kind, risk, action, channel, event_count, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (day, event_name, input_kind, risk, action, channel)
      DO UPDATE SET event_count = event_count + excluded.event_count, updated_at = excluded.updated_at
    `).bind(
      event.day,
      event.name,
      dims.input ?? "none",
      dims.risk ?? "none",
      dims.action ?? "none",
      dims.channel,
      event.count,
      Math.floor(Date.now() / 1000),
    ));
  }
  await env.DB.batch(statements);
  return new Response(null, { status: 204, headers: { "cache-control": "no-store" } });
}
