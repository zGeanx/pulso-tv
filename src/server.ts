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
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

const PULSO_PUBLIC_PROXY: Record<string, string> = {
  "/api/pulso/matches": `${PULSO_ORIGIN}/api/public/matches`,
  "/api/pulso/embeds": `${PULSO_ORIGIN}/api/public/embeds`,
};

/** Same-origin read of `/logos/*`. The API marks those files as same-origin only. */
async function proxyPulsoLogo(request: Request): Promise<Response | null> {
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  const url = new URL(request.url);
  if (url.pathname !== PULSO_LOGO_ROUTE) return null;
  const file = pulsoLogoFile(`/logos/${url.searchParams.get("path") ?? ""}`);
  if (!file) return new Response(null, { status: 400 });

  try {
    const upstream = await fetch(`${PULSO_ORIGIN}/logos/${file}`, {
      headers: { Accept: "image/*,*/*" },
    });
    const headers = new Headers();
    const contentType = upstream.headers.get("content-type");
    if (contentType) headers.set("content-type", contentType);
    if (upstream.ok) headers.set("cache-control", "public, max-age=86400");
    return new Response(request.method === "HEAD" ? null : await upstream.arrayBuffer(), {
      status: upstream.status,
      headers,
    });
  } catch (error) {
    console.error(error);
    return new Response(null, { status: 502 });
  }
}

/** Same-origin read of the public Pulso catalog. Localhost is not on that API's CORS list. */
async function proxyPulsoCatalog(request: Request): Promise<Response | null> {
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  const target = PULSO_PUBLIC_PROXY[new URL(request.url).pathname];
  if (!target) return null;

  try {
    const upstream = await fetch(target, { headers: { Accept: "application/json" } });
    const headers = new Headers();
    headers.set(
      "content-type",
      upstream.headers.get("content-type") ?? "application/json; charset=utf-8",
    );
    if (upstream.ok) headers.set("cache-control", "public, max-age=30");
    return new Response(request.method === "HEAD" ? null : await upstream.arrayBuffer(), {
      status: upstream.status,
      headers,
    });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: "pulso_unavailable" }), {
      status: 502,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const logo = await proxyPulsoLogo(request);
      if (logo) return logo;

      const proxied = await proxyPulsoCatalog(request);
      if (proxied) return proxied;

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
