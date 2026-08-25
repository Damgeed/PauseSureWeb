interface PrivacyEventEnv {
  DB?: D1Database;
}

const eventNames = new Set(["web_check_started", "web_check_completed", "result_viewed", "next_action_selected", "false_positive_reported"]);
const dimensionValues: Record<string, Set<string>> = {
  input: new Set(["text", "link", "screenshot", "qr", "phone"]),
  risk: new Set(["high", "unclear", "insufficient"]),
  action: new Set(["stop", "verify", "call_trusted", "recover", "report", "mark_safe", "open_settings"]),
  channel: new Set(["web"]),
};

type EventBody = {
  schemaVersion: number;
  name: string;
  day: string;
  count: number;
  dimensions: Record<string, string>;
};

function exactKeys(value: Record<string, unknown>, keys: string[]) {
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
  if (record.schemaVersion !== 1 || typeof record.name !== "string" || !eventNames.has(record.name)) return null;
  if (typeof record.day !== "string" || !validDay(record.day)) return null;
  if (!Number.isInteger(record.count) || (record.count as number) < 1 || (record.count as number) > 5) return null;
  if (!record.dimensions || typeof record.dimensions !== "object" || Array.isArray(record.dimensions)) return null;
  const dimensions = record.dimensions as Record<string, unknown>;
  if (Object.keys(dimensions).length > 4) return null;
  for (const [key, rawValue] of Object.entries(dimensions)) {
    if (typeof rawValue !== "string" || !dimensionValues[key]?.has(rawValue)) return null;
  }
  if (dimensions.channel !== "web") return null;
  return record as EventBody;
}

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
}

export async function handlePrivacyEvents(request: Request, env: PrivacyEventEnv): Promise<Response> {
  if (request.method !== "POST") return new Response(null, { status: 405, headers: { allow: "POST", "cache-control": "no-store" } });
  const requestUrl = new URL(request.url);
  const origin = request.headers.get("origin");
  if (origin !== requestUrl.origin) return jsonError("Same-origin requests only.", 403);
  if (!(request.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) return jsonError("JSON required.", 415);
  const declaredSize = Number(request.headers.get("content-length") ?? "0");
  if (declaredSize > 4_096) return jsonError("Request too large.", 413);

  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > 4_096) return jsonError("Request too large.", 413);
  let body: unknown;
  try { body = JSON.parse(raw); } catch { return jsonError("Invalid JSON.", 400); }
  if (!body || typeof body !== "object" || Array.isArray(body) || !exactKeys(body as Record<string, unknown>, ["events"])) return jsonError("Invalid analytics envelope.", 400);
  const rawEvents = (body as { events?: unknown }).events;
  if (!Array.isArray(rawEvents) || rawEvents.length < 1 || rawEvents.length > 8) return jsonError("Invalid event batch.", 400);
  const events = rawEvents.map(parseEvent);
  if (events.some((event) => event === null)) return jsonError("Event contains unsupported or identifying fields.", 400);
  if (!env.DB) return jsonError("Analytics storage unavailable.", 503);

  const cutoff = new Date(Date.now() - 180 * 86_400_000).toISOString().slice(0, 10);
  const statements = [env.DB.prepare("DELETE FROM privacy_event_daily WHERE day < ?").bind(cutoff)];
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
