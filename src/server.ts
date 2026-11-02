import "./lib/error-capture";
import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { PULSO_LOGO_ROUTE, PULSO_ORIGIN, pulsoLogoFile } from "./lib/pulso-assets";
type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};
let serverEntryPromise: Promise<ServerEntry> | undefined;
async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;
  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;
  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}
function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as {
      unhandled?: unknown;
      message?: unknown;
    };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}
const PULSO_PUBLIC_PROXY: Record<string, string> = {
  "/api/pulso/matches": `${PULSO_ORIGIN}/api/public/matches`,
  "/api/pulso/embeds": `${PULSO_ORIGIN}/api/public/embeds`,
};
const REIDOS_ORIGIN = "https://api.reidoscanais.my";
const REIDOS_PROXY_PREFIX = "/api/reidos";
const UPSTREAM_TIMEOUT_MS = 3500;
const MAX_CACHE_ENTRIES = 256;
interface CachedUpstream {
  body: ArrayBuffer;
  contentType: string;
  freshUntil: number;
  staleUntil: number;
}
interface CachePolicy {
  freshMs: number;
  staleMs: number;
  cacheControl: string;
  accept?: string;
  defaultContentType?: string;
}
const LOGO_CACHE_POLICY: CachePolicy = {
  freshMs: 60 * 60000,
  staleMs: 24 * 60 * 60000,
  cacheControl: "public, max-age=86400",
  accept: "image/*,*/*",
  defaultContentType: "image/png",
};
const LIVE_CATALOG_POLICY: CachePolicy = {
  freshMs: 30000,
  staleMs: 10 * 60000,
  cacheControl: "public, max-age=30, stale-while-revalidate=120",
  accept: "application/json",
  defaultContentType: "application/json; charset=utf-8",
};
const CHANNELS_CATALOG_POLICY: CachePolicy = {
  freshMs: 60000,
  staleMs: 15 * 60000,
  cacheControl: "public, max-age=60, stale-while-revalidate=300",
  accept: "application/json",
  defaultContentType: "application/json; charset=utf-8",
};
const upstreamCache = new Map<string, CachedUpstream>();
const upstreamInFlight = new Map<string, Promise<CachedUpstream>>();
function scheduleBackground(ctx: unknown, task: Promise<unknown>): void {
  if (
    typeof ctx === "object" &&
    ctx !== null &&
    "waitUntil" in ctx &&
    typeof (
      ctx as {
        waitUntil?: unknown;
      }
    ).waitUntil === "function"
  ) {
    (
      ctx as {
        waitUntil: (promise: Promise<unknown>) => void;
      }
    ).waitUntil(task);
  }
}
function storeCachedUpstream(key: string, entry: CachedUpstream): void {
  if (upstreamCache.has(key)) {
    upstreamCache.delete(key);
  } else if (upstreamCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = upstreamCache.keys().next().value;
    if (oldestKey !== undefined) upstreamCache.delete(oldestKey);
  }
  upstreamCache.set(key, entry);
}
function buildCachedResponse(
  method: string,
  entry: CachedUpstream,
  cacheControl: string,
): Response {
  const headers = new Headers();
  if (entry.contentType) headers.set("content-type", entry.contentType);
  headers.set("cache-control", cacheControl);
  return new Response(method === "HEAD" ? null : entry.body, {
    status: 200,
    headers,
  });
}
async function revalidateUpstream(
  cacheKey: string,
  targetUrl: string,
  policy: CachePolicy,
): Promise<CachedUpstream> {
  const existing = upstreamInFlight.get(cacheKey);
  if (existing) return existing;
  const task = (async () => {
    try {
      const upstream = await fetch(targetUrl, {
        headers: { Accept: policy.accept ?? "application/json" },
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      });
      if (!upstream.ok) {
        throw new Error(`Upstream HTTP ${upstream.status} for ${targetUrl}`);
      }
      const body = await upstream.arrayBuffer();
      const now = Date.now();
      const entry: CachedUpstream = {
        body,
        contentType:
          upstream.headers.get("content-type") ??
          policy.defaultContentType ??
          "application/json; charset=utf-8",
        freshUntil: now + policy.freshMs,
        staleUntil: now + policy.staleMs,
      };
      storeCachedUpstream(cacheKey, entry);
      return entry;
    } finally {
      upstreamInFlight.delete(cacheKey);
    }
  })();
  upstreamInFlight.set(cacheKey, task);
  return task;
}
async function fetchWithMemoryCache(
  request: Request,
  cacheKey: string,
  targetUrl: string,
  policy: CachePolicy,
  ctx: unknown,
): Promise<Response> {
  const now = Date.now();
  const cached = upstreamCache.get(cacheKey);
  if (cached && now < cached.freshUntil) {
    return buildCachedResponse(request.method, cached, policy.cacheControl);
  }
  if (cached && now < cached.staleUntil) {
    const background = revalidateUpstream(cacheKey, targetUrl, policy).catch((error) => {
      console.error(error);
    });
    scheduleBackground(ctx, background);
    return buildCachedResponse(request.method, cached, policy.cacheControl);
  }
  try {
    const entry = await revalidateUpstream(cacheKey, targetUrl, policy);
    return buildCachedResponse(request.method, entry, policy.cacheControl);
  } catch (error) {
    if (cached) {
      return buildCachedResponse(request.method, cached, policy.cacheControl);
    }
    throw error;
  }
}
async function proxyPulsoLogo(request: Request, ctx: unknown): Promise<Response | null> {
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  const url = new URL(request.url);
  if (url.pathname !== PULSO_LOGO_ROUTE) return null;
  const file = pulsoLogoFile(`/logos/${url.searchParams.get("path") ?? ""}`);
  if (!file) return new Response(null, { status: 400 });
  const targetUrl = `${PULSO_ORIGIN}/logos/${file}`;
  try {
    return await fetchWithMemoryCache(request, `logo:${file}`, targetUrl, LOGO_CACHE_POLICY, ctx);
  } catch (error) {
    console.error(error);
    return new Response(null, { status: 502 });
  }
}
async function proxyPulsoCatalog(request: Request, ctx: unknown): Promise<Response | null> {
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  const url = new URL(request.url);
  const target = PULSO_PUBLIC_PROXY[url.pathname];
  if (!target) return null;
  const policy =
    url.pathname === "/api/pulso/embeds" ? CHANNELS_CATALOG_POLICY : LIVE_CATALOG_POLICY;
  const targetUrl = `${target}${url.search}`;
  try {
    return await fetchWithMemoryCache(
      request,
      `pulso:${url.pathname}${url.search}`,
      targetUrl,
      policy,
      ctx,
    );
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: "pulso_unavailable" }), {
      status: 502,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }
}
async function proxyReidosCatalog(request: Request, ctx: unknown): Promise<Response | null> {
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  const url = new URL(request.url);
  if (!url.pathname.startsWith(`${REIDOS_PROXY_PREFIX}/`)) return null;
  const upstreamPath = url.pathname.slice(REIDOS_PROXY_PREFIX.length);
  if (!upstreamPath.startsWith("/")) return new Response(null, { status: 400 });
  const policy = upstreamPath.startsWith("/channels")
    ? CHANNELS_CATALOG_POLICY
    : LIVE_CATALOG_POLICY;
  const targetUrl = `${REIDOS_ORIGIN}${upstreamPath}${url.search}`;
  try {
    return await fetchWithMemoryCache(
      request,
      `reidos:${upstreamPath}${url.search}`,
      targetUrl,
      policy,
      ctx,
    );
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: "reidos_unavailable" }), {
      status: 502,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }
}
export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const logo = await proxyPulsoLogo(request, ctx);
      if (logo) return logo;
      const proxied = await proxyPulsoCatalog(request, ctx);
      if (proxied) return proxied;
      const reidos = await proxyReidosCatalog(request, ctx);
      if (reidos) return reidos;
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
