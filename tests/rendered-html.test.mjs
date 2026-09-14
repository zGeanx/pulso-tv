import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("includes the site favicon in the channel document head", async (t) => {
  t.mock.method(globalThis, "fetch", async (url) => Response.json({
    success: true,
    data: String(url).endsWith("/channels")
      ? [{ id: "test-channel", name: "Canal de teste", embeds: [] }]
      : [],
  }));
  const response = await render("/canal/test-channel");
  assert.equal(response.status, 200);
  const html = await response.text();
  const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1] ?? "";
  assert.match(head, /<link\b(?=[^>]*\brel="icon")(?=[^>]*\bhref="\/favicon.svg")[^>]*>/i);
});

test("prioritizes loading and offers live resync for playable channels", async (t) => {
  t.mock.method(globalThis, "fetch", async (url) => Response.json({
    success: true,
    data: String(url).endsWith("/channels")
      ? [{
          id: "test-channel",
          name: "Canal de teste",
          embeds: [{
            provider: "Servidor Premium",
            quality: "FULL HD",
            embed_url: "https://rdcanais.net/test-channel",
          }],
        }]
      : [],
  }));

  const response = await render("/canal/test-channel");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /loading="eager"/);
  assert.match(html, /Sincronizar ao vivo/);
  assert.match(html, /rel="preconnect" href="https:\/\/rdcanais\.net"/);
});

test("server-renders the Pulso TV experience", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<html lang="pt-BR">/i);
  assert.match(html, /<title>Pulso TV \| Canais e eventos ao vivo<\/title>/i);
  assert.match(html, /Seu lugar na/);
  assert.match(html, /Canais por categoria/);
  assert.match(html, /href="\/canais"/);
  assert.match(html, /href="\/agenda"/);
  assert.match(html, /href="\/disneyplus"/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/i);
});

test("keeps navigation and content in independent routes", async () => {
  const [page, layout, globals, siteChrome, channelsPage, channelsClient, agendaPage, agendaClient, disneyPage, disneyClient, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/components/site-chrome.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/canais/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/canais/canais-client.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/agenda/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/agenda/agenda-client.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/disneyplus/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/disneyplus/disney-client.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(page, /useEffect, useMemo, useState/);
  assert.match(page, /setQuery/);
  assert.match(page, /setSportsEvents/);
  assert.doesNotMatch(page, /Carregando agenda esportiva/);
  assert.match(page, /sportsEvents\.filter/);
  assert.doesNotMatch(page, /setSchedule|categoryIcons|const today/);
  assert.doesNotMatch(page, /href="#(?:canais|agenda|categorias)"/);
  assert.doesNotMatch(siteChrome, /next\/link|<Link/);
  assert.match(siteChrome, /<a[\s\S]*href=\{item\.href\}/);
  assert.match(channelsPage, /CanaisClient/);
  assert.match(agendaPage, /AgendaClient/);
  assert.match(disneyPage, /DisneyClient/);
  assert.doesNotMatch(channelsClient, /className="directory-count"/);
  assert.doesNotMatch(agendaClient, /className="directory-count"/);
  assert.doesNotMatch(disneyClient, /className="result-count"/);
  assert.match(disneyClient, /featuredChannels/);
  assert.match(disneyClient, /listChannels\("Esportes"/);
  assert.match(layout, /lang="pt-BR"/);
  assert.doesNotMatch(globals, /\.home-page\s+\.page-shell\s*\{/);
  assert.doesNotMatch(globals, /\.home-page\s+\.site-header\s*\{/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
});
