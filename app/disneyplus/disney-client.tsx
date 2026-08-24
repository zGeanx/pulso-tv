"use client";

import { useEffect, useMemo, useState } from "react";
import { SiteFooter, SiteHeader } from "../components/site-chrome";
import { listSports } from "../../lib/reidoscanais/client";
import type { SportsEvent } from "../../lib/reidoscanais/types";

function timeLabel(event: SportsEvent) {
  return new Date(Number(event.start_timestamp) * 1000).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function DisneyClient() {
  const [events, setEvents] = useState<SportsEvent[]>([]);
  const [category, setCategory] = useState("Destaques");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      listSports({ status: "live" }, controller.signal),
      listSports({ status: "upcoming" }, controller.signal),
    ])
      .then(([live, upcoming]) => setEvents([...live, ...upcoming]))
      .catch((loadError) => {
        if (loadError instanceof DOMException && loadError.name === "AbortError") return;
        setError("Não foi possível carregar os eventos da área Disney+.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  const categories = useMemo(
    () => ["Destaques", ...Array.from(new Set(events.map((event) => event.category).filter(Boolean)))],
    [events]
  );

  const filtered = category === "Destaques" ? events : events.filter((event) => event.category === category);

  return (
    <main className="disney-page">
      <SiteHeader active="/disneyplus" />

      <section className="disney-stage">
        <div className="page-shell disney-shell">
          <header className="disney-heading">
            <div>
              <span className="section-kicker">ESPORTES E TRANSMISSÕES EXCLUSIVAS</span>
              <h1>Disney<span>+</span></h1>
              <p>Eventos esportivos e transmissões integradas da programação Disney+ e ESPN.</p>
            </div>
            <a className="button ghost" href="/agenda">
              Ver grade completa de jogos <span>→</span>
            </a>
          </header>

          <nav className="disney-tabs" aria-label="Categorias Disney+">
            {categories.map((item) => (
              <button
                key={item}
                className={category === item ? "active" : ""}
                onClick={() => setCategory(item)}
              >
                {item}
              </button>
            ))}
          </nav>

          <section aria-labelledby="disney-events-title">
            <div className="section-heading" style={{ marginBottom: 20 }}>
              <h2 id="disney-events-title" style={{ fontSize: 24, textTransform: "none" }}>{category}</h2>
              <p className="result-count">
                <strong>{filtered.length}</strong> {filtered.length === 1 ? "evento disponível" : "eventos disponíveis"}
              </p>
            </div>

            {loading ? (
              <div className="disney-empty" role="status">
                <strong>Carregando transmissões Disney+...</strong>
              </div>
            ) : error ? (
              <div className="disney-empty" role="alert">
                <strong>{error}</strong>
              </div>
            ) : filtered.length ? (
              <div className="disney-grid">
                {filtered.map((event, index) => (
                  <a
                    className="disney-card"
                    href={`/assistir/${encodeURIComponent(event.id)}`}
                    key={event.id}
                  >
                    <span
                      className="disney-poster"
                      style={
                        event.poster
                          ? { backgroundImage: `linear-gradient(180deg, transparent 20%, rgba(2, 6, 20, 0.95)), url(${event.poster})` }
                          : undefined
                      }
                    >
                      {!event.poster && <b>{String(index + 1).padStart(2, "0")}</b>}
                      <span className={`disney-status ${event.status}`}>
                        {event.status === "live" ? "● AO VIVO" : timeLabel(event)}
                      </span>
                    </span>
                    <span className="disney-card-copy">
                      <small>{event.competition ?? event.category}</small>
                      <strong>{event.title}</strong>
                    </span>
                  </a>
                ))}
              </div>
            ) : (
              <div className="disney-empty">
                <strong>Nenhum evento disponível nesta categoria no momento.</strong>
              </div>
            )}
          </section>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
