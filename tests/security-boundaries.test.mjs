import assert from "node:assert/strict";
import test from "node:test";

import {
  buildEmbedMarkup,
  EMBED_ALLOW,
  EMBED_FRAME_CSP,
  EMBED_SANDBOX,
  requiresUnsandboxedEmbed,
  sanitizeEmbedUrl,
  sanitizeEmbeds,
} from "../lib/reidoscanais/embed-security.ts";
import {
  jsonApiResponse,
  proxyApi,
} from "../lib/reidoscanais/proxy.ts";

test("proxy reserializes valid JSON with first-party safe headers", async (t) => {
  t.mock.method(globalThis, "fetch", async () =>
    new Response('{"success":true,"data":["ok"]}', {
      status: 201,
      headers: { "Content-Type": "text/html" },
    }),
  );

  const response = await proxyApi({ path: "/health", maxAge: 30 });

  assert.equal(response.status, 201);
  assert.equal(response.headers.get("content-type"), "application/json; charset=utf-8");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(
    response.headers.get("cache-control"),
    "public, max-age=0, s-maxage=30, stale-while-revalidate=60",
  );
  assert.deepEqual(await response.json(), { success: true, data: ["ok"] });
});

test("proxy rejects active or malformed upstream bodies without reflecting them", async (t) => {
  t.mock.method(globalThis, "fetch", async () =>
    new Response('<script>globalThis.compromised = true</script>', {
      headers: { "Content-Type": "text/html" },
    }),
  );

  const response = await proxyApi({ path: "/health" });
  const body = await response.text();

  assert.equal(response.status, 502);
  assert.equal(response.headers.get("content-type"), "application/json; charset=utf-8");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.doesNotMatch(body, /script|compromised/i);
  assert.equal(JSON.parse(body).success, false);
});

test("local JSON errors use the same non-sniffable response policy", async () => {
  const response = jsonApiResponse(
    { success: false, data: [], message: "Inválido" },
    { status: 400 },
  );

  assert.equal(response.status, 400);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("cache-control"), "no-store");
});

test("embed validation accepts canonical public HTTPS and rejects unsafe destinations", () => {
  assert.equal(
    sanitizeEmbedUrl("https://rdcanais.net:443/watch?id=1"),
    "https://rdcanais.net/watch?id=1",
  );

  for (const unsafe of [
    "http://rdcanais.net/watch",
    "javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "/api/reidoscanais/health",
    "https://user:pass@rdcanais.net/watch",
    "https://rdcanais.net:8443/watch",
    "https://pulso-tv-ao-vivo.zgeanx.chatgpt.site/api/reidoscanais/health",
    "https://localhost/watch",
    "https://127.0.0.1/watch",
    "https://[::1]/watch",
    "https://router.home.arpa/admin",
    "https://10.0.0.1.sslip.io/admin",
    "https://127.0.0.1.nip.io/admin",
    "https://unknown-player.example/watch",
  ]) {
    assert.equal(sanitizeEmbedUrl(unsafe), null, unsafe);
  }

  assert.deepEqual(
    sanitizeEmbeds([
      { provider: "Seguro", quality: "HD", embed_url: "https://rdcanais.net/watch" },
      { provider: "Inseguro", quality: "HD", embed_url: "javascript:alert(1)" },
    ]),
    [{ provider: "Seguro", quality: "HD", embed_url: "https://rdcanais.net/watch" }],
  );

  assert.match(EMBED_FRAME_CSP, /https:\/\/rdcanais\.net/);
  assert.match(EMBED_FRAME_CSP, /https:\/\/\*\.esportesembed\.net/);
  assert.doesNotMatch(EMBED_FRAME_CSP, /https:\s|(?:^|\s)\*(?:\s|$)/);
});

test("copied markup is one escaped iframe restricted to a validated provider", () => {
  const markup = buildEmbedMarkup(
    "https://rdcanais.net/watch?a=1&b=2",
    'Canal x"><img src=x onerror=alert(1)> & \'teste\'',
  );

  assert.ok(markup);
  assert.equal((markup.match(/<iframe\b/g) ?? []).length, 1);
  assert.equal((markup.match(/<img\b/g) ?? []).length, 0);
  assert.match(markup, /a=1&amp;b=2/);
  assert.match(markup, /&quot;&gt;&lt;img/);
  assert.match(markup, /&#39;teste&#39;/);
  assert.doesNotMatch(markup, /\bsandbox=/i);
  assert.match(markup, new RegExp(`allow="${EMBED_ALLOW}"`));
  assert.match(EMBED_FRAME_CSP, /https:\/\/rdcanais\.net/);
  assert.equal(requiresUnsandboxedEmbed("https://rdcanais.net/watch"), true);
  assert.equal(requiresUnsandboxedEmbed("https://unknown-player.example/watch"), false);
  assert.doesNotMatch(EMBED_SANDBOX, /allow-(?:top-navigation|popups|downloads)/);
});

test("unsafe embeds cannot produce copied markup", () => {
  assert.equal(buildEmbedMarkup("javascript:alert(1)", "Canal"), null);
});
