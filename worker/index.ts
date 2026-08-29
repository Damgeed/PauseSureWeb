/** Cloudflare Worker entry point for PauseSure. */
import handler from "vinext/server/app-router-entry";
import {
  handleDeploymentSmoke,
  type DeploymentSmokeEnv,
} from "./deployment-smoke";
import {
  deleteExpiredPrivacyEvents,
  handlePrivacyEvents,
  type PrivacyEventEnv,
} from "./privacy-events";

const canonicalOrigin = "https://pausesure.com";
const webReleaseVersion = "pausesure-web-6.3.1";

interface Env extends PrivacyEventEnv, DeploymentSmokeEnv {
  ASSETS: Fetcher;
}

function contentSecurityPolicy(nonce: string): string {
  return [
    "default-src 'self'",
    "base-uri 'none'",
    "connect-src 'self' https://pausesure-production.up.railway.app",
    "font-src 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "img-src 'self' data: blob:",
    "media-src 'self'",
    "object-src 'none'",
    `script-src 'nonce-${nonce}' 'strict-dynamic'`,
    "script-src-attr 'none'",
    "style-src 'self'",
    "style-src-attr 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

const securityHeaders = {
  "Cross-Origin-Opener-Policy": "same-origin",
  "Permissions-Policy": "camera=(), geolocation=(), microphone=(), payment=(), usb=()",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Strict-Transport-Security": "max-age=31536000",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-PauseSure-Web-Version": webReleaseVersion,
} as const;

function createNonce(): string {
  const nonceBytes = crypto.getRandomValues(new Uint8Array(18));
  return btoa(String.fromCharCode(...nonceBytes));
}

function withNoncePolicy(request: Request, nonce: string): Request {
  const headers = new Headers(request.headers);
  // Vinext reads the request policy and applies the nonce only to framework-owned
  // bootstrap scripts while rendering. Never bless arbitrary response script tags.
  headers.set("Content-Security-Policy", contentSecurityPolicy(nonce));
  return new Request(request, { headers });
}

export async function withSecurityHeaders(response: Response, nonce: string): Promise<Response> {
  const contentType = response.headers.get("content-type") ?? "";
  const headers = new Headers(response.headers);
  headers.set("Content-Security-Policy", contentSecurityPolicy(nonce));
  if (/^text\/html\b/i.test(contentType)) headers.set("Cache-Control", "private, no-store");
  for (const [name, value] of Object.entries(securityHeaders)) {
    headers.set(name, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function isDevelopmentHost(hostname: string) {
  // Production is canonical-only. HTTP preview access remains available solely for the
  // Vite/Workers development runtime and is never a configured public route.
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

function canonicalRedirect(url: URL) {
  const destination = new URL(canonicalOrigin);
  destination.pathname = url.pathname;
  destination.search = url.search;
  return Response.redirect(destination.toString(), 308);
}

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const nonce = createNonce();
    const url = new URL(request.url);
    const hostname = url.hostname.toLowerCase();
    const isDevelopment = isDevelopmentHost(hostname);

    if (!isDevelopment && (url.protocol !== "https:" || hostname === "www.pausesure.com")) {
      return withSecurityHeaders(canonicalRedirect(url), nonce);
    }
    if (!isDevelopment && url.origin !== canonicalOrigin) {
      return withSecurityHeaders(new Response("Misdirected Request", { status: 421 }), nonce);
    }

    try {
      if (url.pathname === "/api/deployment-smoke") {
        return withSecurityHeaders(
          await handleDeploymentSmoke(request, env, webReleaseVersion),
          nonce,
        );
      }

      if (url.pathname === "/api/privacy-events") {
        return withSecurityHeaders(await handlePrivacyEvents(request, env), nonce);
      }

      if (url.pathname === "/_vinext/image" || url.pathname === "/_next/image") {
        return withSecurityHeaders(new Response("Not Found", { status: 404 }), nonce);
      }

      return withSecurityHeaders(await handler.fetch(withNoncePolicy(request, nonce), env, ctx), nonce);
    } catch {
      // Never log request content, provider errors, addresses, or analytics values.
      console.error("[PauseSure] Request handling failed.");
      return withSecurityHeaders(new Response(
        JSON.stringify({ error: "Request could not be completed." }),
        {
          status: 503,
          headers: {
            "cache-control": "no-store",
            "content-type": "application/json; charset=utf-8",
          },
        },
      ), nonce);
    }
  },

  scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(deleteExpiredPrivacyEvents(env).catch(() => {
      // Keep scheduled failures visible without writing SQL, row values, IPs,
      // or any analytics dimensions to logs.
      console.error("[PauseSure] Scheduled analytics retention cleanup failed.");
      throw new Error("Scheduled analytics retention cleanup failed.");
    }));
  },
};

export default worker;
