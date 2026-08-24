"use client";

import { useEffect, useState } from "react";
import { SiteFooter, SiteHeader } from "./components/site-chrome";
import {
  PlayIcon,
  ArrowRightIcon,
  SearchIcon,
  TvIcon,
  FilmIcon,
  TrophyIcon,
  NewspaperIcon,
  CompassIcon,
  ClapperboardIcon,
  GamepadIcon,
  FlameIcon,
  ClockIcon,
} from "./components/icons";

const API_URL = "https://api.reidoscanais.st";

type Embed = {
  provider: string;
  quality: string;
  embed_url: string;
};

type EpgProgram = {
  title: string;
  description?: string;
  formatted_time?: string;
  start_time: number;
  end_time: number;
  image?: string;
};

type ApiChannel = {
  id: string;
  name: string;
  description?: string;
  logo_url?: string;
  category?: string;
  embeds?: Embed[];
  epg?: {
    current?: EpgProgram;
    next?: EpgProgram;
  };
};

type ApiEvent = {
  id: string;
  title: string;
  description?: string;
  poster?: string;
  category?: string;
  competition?: string;
  teams?: {
    home?: { name: string; logo?: string };
    away?: { name: string; logo?: string };
  };
  start_timestamp: number;
  status: "upcoming" | "live" | "finished";
  embeds?: Embed[];
};

type ApiResponse<T> = {
  success: boolean;
  data: T;
  message?: string;
};

type Channel = {
  id: string;
  name: string;
  short: string;
  category: string;
  show: string;
  time: string;
  color: string;
  logoUrl?: string;
  progress: number;
  embeds: Embed[];
  route: "canal" | "assistir";
};

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
}

function getProgramProgress(program?: EpgProgram) {
  if (!program) return 0;
  const duration = Number(program.end_time) - Number(program.start_time);
  if (duration <= 0) return 0;
  const now = Math.floor(Date.now() / 1000);
  const progress = ((now - Number(program.start_time)) / duration) * 100;
  return Math.min(100, Math.max(0, progress));
}

function formatEventTime(timestamp: number) {
  if (!timestamp) return "Horário a confirmar";
  return new Date(Number(timestamp) * 1000).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
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

function normalizeChannel(channel: ApiChannel): Channel {
  const category = decodeText(channel.category) || "Outros";
  return {
    id: channel.id,
    name: decodeText(channel.name),
    short: getInitials(channel.name),
    category,
    show:
      decodeText(channel.epg?.current?.title) ||
      decodeText(channel.description) ||
      "Programação ao vivo",
    time: channel.epg?.current?.formatted_time || "No ar agora",
    color: "#3b82f6",
    logoUrl: channel.logo_url || channel.epg?.current?.image,
    progress: getProgramProgress(channel.epg?.current),
    embeds: channel.embeds ?? [],
    route: "canal",
  };
}

function eventToChannel(event: ApiEvent): Channel {
  const category = decodeText(event.category) || "Esportes";
  const title = decodeText(event.title);
  return {
    id: event.id,
    name: title,
    short: getInitials(title),
    category,
    show: decodeText(event.description || event.competition || category),
    time: formatEventTime(event.start_timestamp),
    color: "#3b82f6",
    logoUrl: event.poster,
    progress: event.status === "finished" ? 100 : 0,
    embeds: event.embeds ?? [],
    route: "assistir",
  };
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [channels, setChannels] = useState<Channel[]>([]);
  const [sportsEvents, setSportsEvents] = useState<ApiEvent[]>([]);
  const [featuredEvent, setFeaturedEvent] = useState<ApiEvent | null>(null);
  const [loading, setLoading] = useState(true);

  const heroPlayable = featuredEvent
    ? eventToChannel(featuredEvent)
    : channels[0] ?? null;
  const homeTeam = featuredEvent?.teams?.home;
  const awayTeam = featuredEvent?.teams?.away;
  function openItem(channel: Channel) {
    window.location.assign(`/${channel.route}/${encodeURIComponent(channel.id)}`);
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      window.location.assign(`/canais?q=${encodeURIComponent(query.trim())}`);
    }
  }

  useEffect(() => {
    const controller = new AbortController();

    fetch(`${API_URL}/channels`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    })
      .then((res) => res.json())
      .then((payload: ApiResponse<ApiChannel[]>) => {
        if (payload.success) setChannels(payload.data.map(normalizeChannel));
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    Promise.all([
      fetch(`${API_URL}/sports?status=live`, { signal: controller.signal, headers: { Accept: "application/json" } }).then((r) => r.json()),
      fetch(`${API_URL}/sports?status=upcoming`, { signal: controller.signal, headers: { Accept: "application/json" } }).then((r) => r.json()),
    ])
      .then(([livePayload, upcomingPayload]: [ApiResponse<ApiEvent[]>, ApiResponse<ApiEvent[]>]) => {
        const live = livePayload.success ? livePayload.data : [];
        const upcoming = upcomingPayload.success ? upcomingPayload.data : [];
        setFeaturedEvent(live[0] ?? upcoming[0] ?? null);
        setSportsEvents([...live, ...upcoming]);
      })
      .catch(() => {});

    return () => controller.abort();
  }, []);

  return (
    <main>
      <SiteHeader active="/" searchValue={query} onSearchChange={setQuery} />

      {/* ─── Hero Section ─── */}
      <section className="hero page-shell" id="inicio">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="live-dot" /> {channels.length > 0 ? `${channels.length} canais ao vivo` : "Transmissão em tempo real"}
          </div>
          <h1>
            Seu lugar na<br />primeira <em>fila.</em>
          </h1>
          <p>
            Encontre o que está ao vivo agora, acompanhe a grade esportiva e abra qualquer canal em sua página própria.
          </p>
          <div className="hero-actions">
            <button
              className="button primary"
              disabled={!heroPlayable}
              onClick={() => heroPlayable && openItem(heroPlayable)}
            >
              <PlayIcon style={{ width: 15, height: 15 }} /> Assistir destaque
            </button>
            <a className="button ghost" href="/canais">
              Ver todos os canais <ArrowRightIcon style={{ width: 14, height: 14 }} />
            </a>
          </div>
        </div>

        <div className="spotlight" aria-label="Destaque ao vivo">
          <div className="spotlight-top">
            <span className="on-air">
              <i /> {featuredEvent?.status === "live" ? "AO VIVO" : "EM BREVE"}
            </span>
            <span>{featuredEvent?.embeds?.[0]?.quality ?? "FULL HD"}</span>
          </div>

          {homeTeam && awayTeam ? (
            <div className="score-stage">
              <div className="team">
                {homeTeam.logo ? (
                  <img
                    src={homeTeam.logo}
                    alt={homeTeam.name}
                    style={{ width: 64, height: 64, objectFit: "contain", borderRadius: "50%" }}
                  />
                ) : (
                  <b>{getInitials(homeTeam.name)}</b>
                )}
                <span>{homeTeam.name}</span>
              </div>
              <div className="score">
                <strong>×</strong>
                <small>{featuredEvent?.status === "live" ? "AO VIVO" : formatEventTime(featuredEvent?.start_timestamp ?? 0)}</small>
              </div>
              <div className="team">
                {awayTeam.logo ? (
                  <img
                    src={awayTeam.logo}
                    alt={awayTeam.name}
                    style={{ width: 64, height: 64, objectFit: "contain", borderRadius: "50%" }}
                  />
                ) : (
                  <b>{getInitials(awayTeam.name)}</b>
                )}
                <span>{awayTeam.name}</span>
              </div>
            </div>
          ) : (
            <div style={{ flex: 1, display: "grid", placeItems: "center", padding: 24, textAlign: "center", fontSize: 24, fontWeight: 800 }}>
              {featuredEvent?.title ?? "Carregando programação ao vivo..."}
            </div>
          )}

          <div className="spotlight-bottom">
            <div>
              <small>{featuredEvent?.competition ?? featuredEvent?.category ?? "Destaque"}</small>
              <strong>{featuredEvent?.title ?? "Confira a programação"}</strong>
            </div>
            <button
              disabled={!heroPlayable}
              onClick={() => heroPlayable && openItem(heroPlayable)}
              aria-label="Abrir transmissão do destaque"
            >
              <PlayIcon style={{ width: 14, height: 14 }} />
            </button>
          </div>
        </div>

        <div className="signal-lines" aria-hidden="true">
          <span /><span /><span />
        </div>
      </section>

      {/* ─── Quick Search Bar ─── */}
      <section className="quick-find page-shell" aria-labelledby="quick-title">
        <div>
          <span className="section-kicker">BUSCA INSTANTÂNEA</span>
          <h2 id="quick-title">O que você quer assistir?</h2>
          <p className="quick-find-sub">Busque por canais, eventos, times e programas ao vivo</p>
        </div>
        <form className="main-search" onSubmit={handleSearchSubmit}>
          <SearchIcon style={{ color: "var(--text-muted)", flexShrink: 0 }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ex: SporTV, ESPN, Globo, Futebol, UFC..."
            aria-label="Buscar canal ou evento"
          />
          <kbd>ENTER</kbd>
        </form>
      </section>

      {/* ─── Agenda Esportiva (16:9 Cards Model) ─── */}
      <section className="agenda-section page-shell" aria-labelledby="agenda-title">
        <div className="section-heading">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ color: "var(--crimson)", display: "flex", alignItems: "center" }}>
              <FlameIcon style={{ width: 24, height: 24 }} />
            </span>
            <h2 id="agenda-title">Agenda esportiva</h2>
          </div>
          <a href="/agenda">
            Ver todos <ArrowRightIcon style={{ width: 14, height: 14 }} />
          </a>
        </div>

        <div className="agenda-cards-grid">
          {sportsEvents.length ? (
            sportsEvents.slice(0, 10).map((event) => {
              const time = formatEventTime(event.start_timestamp);
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
                    <span className={`agenda-card-badge ${isLive ? "live" : "upcoming"}`}>
                      {isLive ? (
                        <>
                          <i /> AO VIVO
                        </>
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
                      {[decodeText(event.competition) || "Futebol", `Hoje - ${time}`].filter(Boolean).join(" · ")}
                    </small>
                  </div>
                </a>
              );
            })
          ) : (
            <div className="empty-state">
              <strong>Carregando agenda esportiva...</strong>
              <span>Consultando eventos ao vivo e próximos jogos.</span>
            </div>
          )}
        </div>
      </section>

      {/* ─── Channels by Category Rows (Compact Model) ─── */}
      <section className="channels-section page-shell" aria-labelledby="channels-title">
        <div className="section-heading">
          <div>
            <span className="section-kicker">GRADE AO VIVO</span>
            <h2 id="channels-title">Canais por categoria</h2>
          </div>
          <a href="/canais">
            Ver grade completa <ArrowRightIcon style={{ width: 14, height: 14 }} />
          </a>
        </div>

        {loading ? (
          <div className="empty-state" role="status">
            <strong>Carregando canais...</strong>
            <span>Buscando sinais e programação em tempo real.</span>
          </div>
        ) : (
          (() => {
            const mainCats = [
              { name: "Canais Abertos", Icon: TvIcon },
              { name: "Documentários", Icon: CompassIcon },
              { name: "Entretenimento", Icon: ClapperboardIcon },
              { name: "Esportes", Icon: TrophyIcon },
              { name: "Filmes e Séries", Icon: FilmIcon },
              { name: "Notícias", Icon: NewspaperIcon },
              { name: "Infantil", Icon: GamepadIcon },
            ];

            return mainCats.map(({ name: catName, Icon: CatIcon }) => {
              const catChannels = channels.filter(
                (c) => c.category === catName || (catName === "Esportes" && c.category === "Futebol")
              );
              if (!catChannels.length) return null;

              return (
                <div className="channel-row-section" key={catName}>
                  <div className="channel-row-header">
                    <h3 className="channel-row-title">
                      <span className="cat-badge-icon">
                        <CatIcon style={{ width: 22, height: 22 }} />
                      </span>
                      {catName}
                    </h3>
                    <div className="channel-row-actions">
                      <a href={`/canais?categoria=${encodeURIComponent(catName)}`}>
                        Ver todos <ArrowRightIcon style={{ width: 14, height: 14 }} />
                      </a>
                    </div>
                  </div>

                  <div className="compact-channel-grid">
                    {catChannels.slice(0, 7).map((channel) => (
                      <a
                        className="channel-card-compact"
                        key={channel.id}
                        href={`/canal/${encodeURIComponent(channel.id)}`}
                      >
                        <div className="card-logo-box">
                          {channel.logoUrl ? (
                            <img src={channel.logoUrl} alt={channel.name} />
                          ) : (
                            <span className="logo-text">{channel.short}</span>
                          )}
                        </div>
                        <div className="card-info">
                          <span className="card-name">{channel.name}</span>
                          <span className="card-show">
                            <strong>Agora:</strong> {channel.show}
                          </span>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              );
            });
          })()
        )}

        <div style={{ textAlign: "center", marginTop: 20 }}>
          <a className="button primary" href="/canais" style={{ minWidth: 240 }}>
            Ver todos os {channels.length} canais <ArrowRightIcon style={{ width: 14, height: 14 }} />
          </a>
        </div>
      </section>

      {/* ─── Category Showcase Section ─── */}
      <section className="category-showcase page-shell" aria-labelledby="explore-title">
        <div className="section-heading">
          <div>
            <span className="section-kicker">NAVEGUE POR TEMA</span>
            <h2 id="explore-title">Explore por categoria</h2>
          </div>
          <a href="/canais">
            Ver todas <ArrowRightIcon style={{ width: 14, height: 14 }} />
          </a>
        </div>
        <div className="category-grid">
          {([
            { name: "Esportes", desc: "Futebol, UFC, Basquete e mais", Icon: TrophyIcon, color: "emerald" },
            { name: "Filmes e Séries", desc: "Blockbusters, séries e clássicos", Icon: FilmIcon, color: "crimson" },
            { name: "Notícias", desc: "Jornalismo 24 horas no ar", Icon: NewspaperIcon, color: "slate" },
            { name: "Infantil", desc: "Desenhos e diversão para a família", Icon: GamepadIcon, color: "lime" },
          ] as const).map((cat) => {
            const Icon = cat.Icon;
            return (
              <button
                key={cat.name}
                data-color={cat.color}
                onClick={() => window.location.assign(`/canais?categoria=${encodeURIComponent(cat.name)}`)}
              >
                <span className="cat-icon">
                  <Icon style={{ width: 26, height: 26 }} />
                </span>
                <span>
                  <strong>{cat.name}</strong>
                  <small>{cat.desc}</small>
                </span>
                <i>
                  <ArrowRightIcon style={{ width: 16, height: 16 }} />
                </i>
              </button>
            );
          })}
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
