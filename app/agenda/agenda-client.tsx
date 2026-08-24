"use client";

import { useEffect, useMemo, useState } from "react";
import { SiteFooter, SiteHeader } from "../components/site-chrome";
import { SearchIcon, FlameIcon, ClockIcon } from "../components/icons";
import { listSports } from "../../lib/reidoscanais/client";
import type { SportsEvent } from "../../lib/reidoscanais/types";

type StatusFilter = "all" | "live" | "upcoming" | "finished";

const statusTabs: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "Todos os jogos" },
  { key: "live", label: "Ao vivo agora" },
  { key: "upcoming", label: "Hoje & Próximos" },
  { key: "finished", label: "Encerrados" },
];

function decodeText(text?: string) {
  if (!text) return "";
  return text
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function eventTime(event: SportsEvent) {
  return new Date(Number(event.start_timestamp) * 1000).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function groupTitle(status: SportsEvent["status"]) {
  if (status === "live") return "Ao vivo agora";
  if (status === "upcoming") return "Hoje & Próximos jogos";
  return "Jogos encerrados";
}

export default function AgendaClient() {
  const [events, setEvents] = useState<SportsEvent[]>([]);
  const [status, setStatus] = useState<StatusFilter>("all");
  const [category, setCategory] = useState("Todas");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      listSports({ status: "live" }, controller.signal),
      listSports({ status: "upcoming" }, controller.signal),
      listSports({ status: "finished" }, controller.signal),
    ])
      .then(([live, upcoming, finished]) => setEvents([...live, ...upcoming, ...finished]))
      .catch((loadError) => {
        if (loadError instanceof DOMException && loadError.name === "AbortError") return;
        setError("Não foi possível carregar a agenda de eventos no momento.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  const categories = useMemo(
    () => ["Todas", ...Array.from(new Set(events.map((event) => decodeText(event.category)).filter(Boolean)))],
    [events]
  );

  const counts = useMemo(
    () => ({
      all: events.length,
      live: events.filter((event) => event.status === "live").length,
      upcoming: events.filter((event) => event.status === "upcoming").length,
      finished: events.filter((event) => event.status === "finished").length,
    }),
    [events]
  );

  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("pt-BR");
    return events.filter((event) => {
      const matchesStatus = status === "all" || event.status === status;
      const matchesCategory = category === "Todas" || decodeText(event.category) === category;
      const matchesQuery =
        !term ||
        [event.title, event.competition, event.category]
          .filter(Boolean)
          .some((value) => decodeText(value).toLocaleLowerCase("pt-BR").includes(term));
      return matchesStatus && matchesCategory && matchesQuery;
    });
  }, [category, events, query, status]);

  const grouped = (["live", "upcoming", "finished"] as const)
    .map((groupStatus) => ({
      status: groupStatus,
      items: filtered.filter((event) => event.status === groupStatus),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <main>
      <SiteHeader active="/agenda" />

      <section className="directory-hero page-shell agenda-hero">
        <div>
          <span className="section-kicker">TRANSMISSÕES ESPORTIVAS</span>
          <h1>Agenda esportiva</h1>
          <p>Confira todos os confrontos organizados por jogos ao vivo agora, próximos de hoje e encerrados.</p>
        </div>
      </section>

      <section className="directory-content page-shell">
        <label className="directory-search">
          <SearchIcon style={{ color: "var(--text-muted)", flexShrink: 0 }} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por time, campeonato ou esporte..."
            aria-label="Buscar evento na agenda"
          />
        </label>

        {/* Status Filter Tabs (Ao vivo agora, Hoje & Próximos, Encerrados, Todos) */}
        <div className="status-tabs" role="tablist" aria-label="Filtrar por status">
          {statusTabs.map((tab) => (
            <button
              key={tab.key}
              role="tab"
              aria-selected={status === tab.key}
              className={status === tab.key ? "active" : ""}
              onClick={() => setStatus(tab.key)}
            >
              {tab.label}
              <span>{counts[tab.key]}</span>
            </button>
          ))}
        </div>

        {/* Category / Sport Filter Pills */}
        {categories.length > 2 && (
          <div className="light-tabs" role="tablist" aria-label="Filtrar por modalidade">
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
        )}

        {loading ? (
          <div className="directory-empty" role="status">
            <strong>Carregando agenda esportiva...</strong>
            <span>Consultando grade de transmissões em tempo real.</span>
          </div>
        ) : error ? (
          <div className="directory-empty" role="alert">
            <strong>Programação indisponível.</strong>
            <span>{error}</span>
          </div>
        ) : grouped.length ? (
          grouped.map((group) => (
            <section className="event-group" key={group.status}>
              <div className="event-group-title">
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {group.status === "live" && (
                    <span style={{ color: "var(--crimson)", display: "flex", alignItems: "center" }}>
                      <FlameIcon style={{ width: 20, height: 20 }} />
                    </span>
                  )}
                  <h2>{groupTitle(group.status)}</h2>
                </div>
                <span>{group.items.length} {group.items.length === 1 ? "jogo" : "jogos"}</span>
              </div>

              {/* 16:9 Card Grid for Matches */}
              <div className="agenda-cards-grid">
                {group.items.map((event) => {
                  const time = eventTime(event);
                  const isLive = event.status === "live";
                  const isFinished = event.status === "finished";

                  return (
                    <a
                      className={`agenda-match-card${isFinished ? " finished" : ""}`}
                      key={event.id}
                      href={`/assistir/${encodeURIComponent(event.id)}`}
                    >
                      <div className="agenda-card-thumb">
                        {event.poster ? (
                          <img src={event.poster} alt={event.title} />
                        ) : (
                          <div className="agenda-thumb-placeholder">
                            <span>{event.title}</span>
                          </div>
                        )}
                        <span
                          className={`agenda-card-badge ${
                            isLive ? "live" : isFinished ? "finished" : "upcoming"
                          }`}
                        >
                          {isLive ? (
                            <>
                              <i /> AO VIVO
                            </>
                          ) : isFinished ? (
                            "ENCERRADO"
                          ) : (
                            <>
                              <ClockIcon style={{ width: 11, height: 11 }} /> Hoje - {time}
                            </>
                          )}
                        </span>
                      </div>
                      <div className="agenda-card-body">
                        <strong>{decodeText(event.title)}</strong>
                        <small>
                          {[decodeText(event.competition) || decodeText(event.category) || "Futebol", `Hoje - ${time}`]
                            .filter(Boolean)
                            .join(" · ")}
                        </small>
                      </div>
                    </a>
                  );
                })}
              </div>
            </section>
          ))
        ) : (
          <div className="directory-empty">
            <strong>Nenhum evento encontrado.</strong>
            <span>Tente alterar os filtros ou o termo de busca.</span>
            <button
              className="button primary"
              style={{ marginTop: 12 }}
              onClick={() => {
                setQuery("");
                setStatus("all");
                setCategory("Todas");
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
