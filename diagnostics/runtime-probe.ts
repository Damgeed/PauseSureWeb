interface Env {
  DB: D1Database;
  ANALYTICS_RATE_LIMITER: RateLimit;
  DEPLOYMENT_RATE_LIMITER: RateLimit;
}

function json(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      "cache-control": "no-store",
      "content-type": "application/json; charset=utf-8",
      "x-content-type-options": "nosniff",
    },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (request.method !== "GET") return json({ error: "GET required" }, 405);

    try {
      if (url.pathname === "/d1") {
        const result = await env.DB.prepare("SELECT 1 AS ok").first<{ ok: number }>();
        return json({ stage: "d1", ok: result?.ok === 1 });
      }
      if (url.pathname === "/rate-analytics") {
        const result = await env.ANALYTICS_RATE_LIMITER.limit({ key: "runtime-probe" });
        return json({ stage: "rate-analytics", success: result.success });
      }
      if (url.pathname === "/rate-deployment") {
        const result = await env.DEPLOYMENT_RATE_LIMITER.limit({ key: "runtime-probe" });
        return json({ stage: "rate-deployment", success: result.success });
      }
      return json({ error: "Not Found" }, 404);
    } catch (error) {
      return json({
        stage: url.pathname.slice(1),
        errorName: error instanceof Error ? error.name : "UnknownError",
        errorMessage: error instanceof Error ? error.message.slice(0, 240) : "Unknown runtime failure",
      }, 503);
    }
  },
};
