"use client";

import { useEffect, useMemo, useState } from "react";
import { SiteFooter, SiteHeader } from "../components/site-chrome";
import { SearchIcon, CloseIcon } from "../components/icons";
import { listCategories, listChannels } from "../../lib/reidoscanais/client";
import type { Channel } from "../../lib/reidoscanais/types";

const fallbackCategories = [
  "Todos",
  "Canais Abertos",
  "Documentários",
  "Entretenimento",
  "Esportes",
  "Filmes e Séries",
  "Infantil",
  "Notícias",
];

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0] ?? "").join("").toUpperCase();
}

function decodeText(text?: string) {
  if (!text) return "";
  return text
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

export default function CanaisClient() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [categories, setCategories] = useState(fallbackCategories);
  const [category, setCategory] = useState("Todos");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const qParam = params.get("q");
    const catParam = params.get("categoria");
    const frame = window.requestAnimationFrame(() => {
      if (qParam) setQuery(qParam);
      if (catParam) setCategory(catParam);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    listCategories(controller.signal)
      .then((items) => {
        const names = (Array.isArray(items) ? items : [])
          .map((item) => (typeof item === "string" ? item : item.name ?? ""))
          .filter(Boolean);
        if (names.length) {
          setCategories(["Todos", ...Array.from(new Set(names))]);
        }
      })
      .catch(() => setCategories(fallbackCategories));
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError(null);
      try {
        setChannels(await listChannels(category, controller.signal));
      } catch (loadError) {
        if (loadError instanceof DOMException && loadError.name === "AbortError") return;
        setChannels([]);
        setError("Não foi possível carregar os canais no momento.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void load();
    return () => controller.abort();
  }, [category]);

  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("pt-BR");
    if (!term) return channels;
    return channels.filter((channel) =>
      [channel.name, channel.category, channel.epg?.current?.title]
        .filter(Boolean)
        .some((value) => value!.toLocaleLowerCase("pt-BR").includes(term))
    );
  }, [channels, query]);

  return (
    <main>
      <SiteHeader active="/canais" searchValue={query} onSearchChange={setQuery} />

      <section className="directory-hero page-shell">
        <div>
          <span className="section-kicker">GRADE COMPLETA</span>
          <h1>Canais de TV ao vivo</h1>
          <p>Explore todos os canais disponíveis. Clique em qualquer canal para abrir o player exclusivo.</p>
        </div>
        <div className="directory-count">
          <strong>{loading ? "—" : filtered.length}</strong>
          <span>{filtered.length === 1 ? "canal encontrado" : "canais encontrados"}</span>
        </div>
      </section>

      <section className="directory-content page-shell" aria-labelledby="channel-directory-title">
        <h2 className="sr-only" id="channel-directory-title">Lista de canais</h2>

        <label className="directory-search">
          <SearchIcon style={{ color: "var(--text-muted)", flexShrink: 0 }} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar canal por nome, número ou programa..."
            aria-label="Buscar canal"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              style={{ color: "var(--text-muted)", padding: 4, display: "grid", placeItems: "center" }}
              aria-label="Limpar busca"
            >
              <CloseIcon style={{ width: 14, height: 14 }} />
            </button>
          )}
        </label>

        <div className="light-tabs" role="tablist" aria-label="Filtrar canais por categoria">
          {categories.map((item) => (
            <button
              key={item}
              role="tab"
              aria-selected={category === item}
              className={category === item ? "active" : ""}
              onClick={() => setCategory(item)}
            >
              {item}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="directory-empty" role="status">
            <strong>Carregando canais...</strong>
            <span>Buscando programação em tempo real.</span>
          </div>
        ) : error ? (
          <div className="directory-empty" role="alert">
            <strong>Programação indisponível.</strong>
            <span>{error}</span>
          </div>
        ) : filtered.length ? (
          <div className="compact-channel-grid">
            {filtered.map((channel) => {
              const current = channel.epg?.current;
              return (
                <a
                  className="channel-card-compact"
                  href={`/canal/${encodeURIComponent(channel.id)}`}
                  key={channel.id}
                >
                  <div className="card-logo-box">
                    {channel.logo_url ? (
                      <img src={channel.logo_url} alt={`Logo de ${channel.name}`} />
                    ) : (
                      <span className="logo-text">{initials(channel.name)}</span>
                    )}
                  </div>
                  <div className="card-info">
                    <span className="card-name">{decodeText(channel.name)}</span>
                    <span className="card-show">
                      <strong>Agora:</strong> {decodeText(current?.title ?? channel.description ?? "Programação ao vivo")}
                    </span>
                  </div>
                </a>
              );
            })}
          </div>
        ) : (
          <div className="directory-empty">
            <strong>Nenhum canal encontrado.</strong>
            <span>Tente buscar por outro termo ou selecione uma categoria diferente.</span>
            <button
              className="button primary"
              style={{ marginTop: 12 }}
              onClick={() => {
                setQuery("");
                setCategory("Todos");
              }}
            >
              Limpar filtros
            </button>
          </div>
        )}
      </section>

      <SiteFooter />
    </main>
  );
}
