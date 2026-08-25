/** Cloudflare Worker entry point for PauseSure. */
import handler from "vinext/server/app-router-entry";
import { deleteExpiredPrivacyEvents, handlePrivacyEvents, type PrivacyEventEnv } from "./privacy-events";

const canonicalOrigin = "https://pausesure.com";

interface Env extends PrivacyEventEnv {
  ASSETS: Fetcher;
}

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'none'",
  "connect-src 'self'",
  "font-src 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "img-src 'self' data: blob:",
  "media-src 'self'",
  "object-src 'none'",
  // Vinext/React currently emits inline bootstrap script elements. Inline
  // attributes and styles remain prohibited.
  "script-src 'self' 'unsafe-inline'",
  "script-src-attr 'none'",
  "style-src 'self'",
  "style-src-attr 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = {
  "Content-Security-Policy": contentSecurityPolicy,
  "Cross-Origin-Opener-Policy": "same-origin",
  "Permissions-Policy": "camera=(), geolocation=(), microphone=(), payment=(), usb=()",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Strict-Transport-Security": "max-age=31536000",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
} as const;

function withSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(securityHeaders)) {
    headers.set(name, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function isLocalDevelopmentHost(hostname: string) {
  // Production is canonical-only. Local HTTP remains available solely for the
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
    const url = new URL(request.url);
    const hostname = url.hostname.toLowerCase();
    const isLocalDevelopment = isLocalDevelopmentHost(hostname);

    if (!isLocalDevelopment && (url.protocol !== "https:" || hostname === "www.pausesure.com")) {
      return withSecurityHeaders(canonicalRedirect(url));
    }
    if (!isLocalDevelopment && hostname !== "pausesure.com") {
      return withSecurityHeaders(new Response("Misdirected Request", { status: 421 }));
    }

    if (url.pathname === "/api/privacy-events") {
      return withSecurityHeaders(await handlePrivacyEvents(request, env));
    }

    if (url.pathname === "/_vinext/image") {
      return withSecurityHeaders(new Response("Not Found", { status: 404 }));
    }

    return withSecurityHeaders(await handler.fetch(request, env, ctx));
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
