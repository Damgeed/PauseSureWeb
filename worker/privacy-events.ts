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
  if (!env.DB) throw new Error("Analytics storage unavailable for retention cleanup.");
  await env.DB.prepare("DELETE FROM privacy_event_daily WHERE day < ?").bind(retentionCutoff(now)).run();
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
    return jsonError("Analytics protection unavailable.", 503);
  }
  // The edge limiter uses this request-scoped key only for abuse control. It is
  // never included in the D1 statements, analytics dimensions, or application logs.
  let rateLimit: { success: boolean };
  try {
    rateLimit = await env.ANALYTICS_RATE_LIMITER.limit({ key: `privacy-events:${clientAddress}` });
  } catch {
    return jsonError("Analytics protection unavailable.", 503);
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
  if (!env.DB) return jsonError("Analytics storage unavailable.", 503);

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
