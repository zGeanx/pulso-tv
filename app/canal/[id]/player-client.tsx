"use client";

import { useEffect, useState } from "react";
import { SiteFooter, SiteHeader } from "../../components/site-chrome";
import {
  ChevronRightIcon,
  MonitorPlayIcon,
  CodeIcon,
  ShareIcon,
  TheaterIcon,
  ShieldCheckIcon,
  DownloadIcon,
  FlameIcon,
  ArrowRightIcon,
  TrophyIcon,
  ClockIcon,
} from "../../components/icons";

export type Embed = {
  provider: string;
  quality: string;
  embed_url: string;
};

export type Playable = {
  id: string;
  name: string;
  short: string;
  category: string;
  show: string;
  time: string;
  color: string;
  logoUrl?: string;
  competition?: string;
  description?: string;
  teams?: {
    home?: { name: string; logo?: string };
    away?: { name: string; logo?: string };
  };
  embeds: Embed[];
};

type SuggestionItem = {
  id: string;
  title: string;
  detail: string;
  time: string;
  poster?: string;
  status: "live" | "upcoming" | "finished";
  route: "assistir" | "canal";
};

type SuggestionsEnvelope<T> = {
  success: boolean;
  data: T;
};

type SportSuggestion = {
  id: string | number;
  title: string;
  competition?: string;
  category?: string;
  start_timestamp?: number;
  poster?: string;
  status: "live" | "upcoming";
};

type ChannelSuggestion = {
  id: string | number;
  name: string;
  category?: string;
  description?: string;
  logo_url?: string;
  epg?: {
    current?: {
      title?: string;
      formatted_time?: string;
      image?: string;
    };
  };
};

type PlayerClientProps = {
  channel: Playable | null;
  sectionHref?: string;
  sectionLabel?: string;
};

function decodeText(text?: string) {
  if (!text) return "";
  return text
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

export default function PlayerClient({
  channel,
  sectionHref = "/canais",
  sectionLabel = "Canais",
}: PlayerClientProps) {
  const [embedIndex, setEmbedIndex] = useState(0);
  const [theaterMode, setTheaterMode] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);

  const selectedEmbed = channel?.embeds[embedIndex] ?? null;
  const isSport = channel?.category?.toLowerCase().includes("esporte") || channel?.category?.toLowerCase().includes("futebol") || sectionHref === "/agenda";

  useEffect(() => {
    const controller = new AbortController();
    const apiUrl = "https://api.reidoscanais.st";

    if (isSport) {
      Promise.all([
        fetch(`${apiUrl}/sports?status=live`, { signal: controller.signal, headers: { Accept: "application/json" } }).then((r) => r.json() as Promise<SuggestionsEnvelope<SportSuggestion[]>>),
        fetch(`${apiUrl}/sports?status=upcoming`, { signal: controller.signal, headers: { Accept: "application/json" } }).then((r) => r.json() as Promise<SuggestionsEnvelope<SportSuggestion[]>>),
      ])
        .then(([liveRes, upcomingRes]) => {
          const live = liveRes.success ? liveRes.data : [];
          const upcoming = upcomingRes.success ? upcomingRes.data : [];
          const all = [...live, ...upcoming]
            .filter((item) => String(item.id) !== channel?.id)
            .slice(0, 4)
            .map((item) => ({
              id: String(item.id),
              title: decodeText(item.title),
              detail: [decodeText(item.competition), decodeText(item.category)].filter(Boolean).join(" · ") || "Futebol ao vivo",
              time: item.start_timestamp ? `Hoje · ${new Date(Number(item.start_timestamp) * 1000).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : "Ao vivo",
              poster: item.poster,
              status: item.status as "live" | "upcoming",
              route: "assistir" as const,
            }));
          setSuggestions(all);
        })
        .catch(() => {});
    } else {
      fetch(`${apiUrl}/channels`, { signal: controller.signal, headers: { Accept: "application/json" } })
        .then((r) => r.json())
        .then((res: SuggestionsEnvelope<ChannelSuggestion[]>) => {
          if (res.success) {
            const sameCat = res.data
              .filter((c) => c.category === channel?.category && String(c.id) !== channel?.id)
              .slice(0, 4)
              .map((c) => ({
                id: String(c.id),
                title: decodeText(c.name),
                detail: decodeText(c.epg?.current?.title || c.description || c.category),
                time: c.epg?.current?.formatted_time || "No ar agora",
                poster: c.logo_url || c.epg?.current?.image,
                status: "live" as const,
                route: "canal" as const,
              }));
            setSuggestions(sameCat);
          }
        })
        .catch(() => {});
    }

    return () => controller.abort();
  }, [channel?.id, channel?.category, isSport]);

  function handleCopyEmbed() {
    if (!selectedEmbed) return;
    const iframeCode = `<iframe src="${selectedEmbed.embed_url}" title="${channel?.name}" width="100%" height="100%" frameborder="0" allowfullscreen allow="autoplay; encrypted-media; picture-in-picture"></iframe>`;
    navigator.clipboard.writeText(iframeCode);
    setCopiedEmbed(true);
    setTimeout(() => setCopiedEmbed(false), 2000);
  }

  function handleShare() {
    if (typeof window === "undefined") return;
    const shareUrl = window.location.href;
    if (navigator.share) {
      navigator.share({ title: channel?.name, url: shareUrl }).catch(() => {});
    } else {
      navigator.clipboard.writeText(shareUrl);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2000);
    }
  }

  return (
    <main style={{ minHeight: "100vh", backgroundColor: "var(--bg-canvas)" }}>
      <SiteHeader active={sectionHref === "/agenda" ? "/agenda" : "/canais"} />

      <section className="page-shell" style={{ padding: "28px 0 72px" }}>
        {channel ? (
          <>
            {/* Breadcrumb */}
            <nav
              aria-label="Navegação estrutural"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                color: "var(--text-muted)",
                fontSize: 13,
                marginBottom: 16,
              }}
            >
              <a href="/" style={{ color: "var(--text-secondary)" }}>
                Início
              </a>
              <ChevronRightIcon style={{ width: 12, height: 12 }} />
              <a href={sectionHref} style={{ color: "var(--text-secondary)" }}>
                {sectionLabel}
              </a>
              <ChevronRightIcon style={{ width: 12, height: 12 }} />
              <strong style={{ color: "#ffffff" }}>{channel.name}</strong>
            </nav>

            {/* Player Shell Card */}
            <article className={`player-shell-card ${theaterMode ? "theater-active" : ""}`}>
              {/* Player Video Frame */}
              <div className="player-screen-wrap">
                {selectedEmbed ? (
                  <iframe
                    key={selectedEmbed.embed_url}
                    src={selectedEmbed.embed_url}
                    title={`Transmissão ao vivo de ${channel.name}`}
                    allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                    allowFullScreen
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div style={{ display: "grid", placeContent: "center", textAlign: "center", height: "100%", padding: 30, color: "var(--text-muted)" }}>
                    <strong style={{ color: "#ffffff", fontSize: 18, display: "block", marginBottom: 6 }}>
                      Sinal temporariamente indisponível
                    </strong>
                    <span style={{ fontSize: 13 }}>
                      Tente outro sinal na lista abaixo ou recarregue a página em instantes.
                    </span>
                  </div>
                )}
              </div>

              {/* Player Action Toolbar below video */}
              <div className="player-toolbar">
                <div className="player-toolbar-left">
                  {channel.embeds.map((embed, idx) => (
                    <button
                      key={`${embed.provider}-${idx}`}
                      onClick={() => setEmbedIndex(idx)}
                      className={`player-tool-btn ${embedIndex === idx ? "primary" : ""}`}
                    >
                      <MonitorPlayIcon style={{ width: 15, height: 15 }} />
                      <span>{embed.provider || `Player ${idx + 1}`}</span>
                      <span className="player-quality-badge">{embed.quality || "HD"}</span>
                    </button>
                  ))}
                </div>

                <div className="player-toolbar-right">
                  <button className="player-tool-btn" onClick={handleCopyEmbed}>
                    <CodeIcon style={{ width: 15, height: 15 }} />
                    <span>{copiedEmbed ? "Copiado!" : "Copiar embed"}</span>
                  </button>
                  <button className="player-tool-btn" onClick={handleShare}>
                    <ShareIcon style={{ width: 15, height: 15 }} />
                    <span>{copiedShare ? "Link copiado!" : "Compartilhar"}</span>
                  </button>
                  <button
                    className={`player-tool-btn ${theaterMode ? "primary" : ""}`}
                    onClick={() => setTheaterMode(!theaterMode)}
                  >
                    <TheaterIcon style={{ width: 15, height: 15 }} />
                    <span>Modo Teatro</span>
                  </button>
                </div>
              </div>

              {/* Player Details & Match Header */}
              <div className="player-details-body">
                {/* Badges Bar */}
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginBottom: 16 }}>
                  <span className="on-air" style={{ fontSize: 11 }}>
                    <i /> AO VIVO
                  </span>
                  <span
                    style={{
                      background: "rgba(59, 130, 246, 0.15)",
                      color: "#93c5fd",
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "4px 10px",
                      borderRadius: "var(--radius-full)",
                      textTransform: "uppercase",
                      border: "1px solid rgba(59, 130, 246, 0.3)",
                    }}
                  >
                    {channel.category}
                  </span>
                  {channel.competition && (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        background: "rgba(255, 255, 255, 0.05)",
                        color: "var(--text-secondary)",
                        fontSize: 11,
                        fontWeight: 700,
                        padding: "4px 10px",
                        borderRadius: "var(--radius-full)",
                        border: "1px solid var(--border-card)",
                      }}
                    >
                      <TrophyIcon style={{ width: 12, height: 12, color: "#f59e0b" }} />
                      {channel.competition}
                    </span>
                  )}
                </div>

                {/* Team Matchup Banner (if home & away teams exist) */}
                {channel.teams?.home && channel.teams?.away ? (
                  <div className="event-matchup-stage">
                    <div className="event-team-box">
                      {channel.teams.home.logo ? (
                        <img src={channel.teams.home.logo} alt={channel.teams.home.name} />
                      ) : (
                        <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(255,255,255,0.08)", display: "grid", placeItems: "center", fontWeight: 800 }}>
                          {channel.teams.home.name[0]}
                        </div>
                      )}
                      <span>{channel.teams.home.name}</span>
                    </div>

                    <div className="event-matchup-divider">
                      <strong>×</strong>
                      <span>
                        <ClockIcon style={{ width: 13, height: 13 }} />
                        {channel.time}
                      </span>
                    </div>

                    <div className="event-team-box">
                      {channel.teams.away.logo ? (
                        <img src={channel.teams.away.logo} alt={channel.teams.away.name} />
                      ) : (
                        <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(255,255,255,0.08)", display: "grid", placeItems: "center", fontWeight: 800 }}>
                          {channel.teams.away.name[0]}
                        </div>
                      )}
                      <span>{channel.teams.away.name}</span>
                    </div>
                  </div>
                ) : (
                  <h1
                    style={{
                      margin: "0 0 10px",
                      font: "800 clamp(22px, 3vw, 32px) var(--display)",
                      letterSpacing: "-0.5px",
                      color: "#ffffff",
                    }}
                  >
                    {channel.name}
                  </h1>
                )}

                {/* Description Text */}
                <p style={{ margin: "14px 0 0", color: "var(--text-secondary)", fontSize: "14.5px", lineHeight: "1.6" }}>
                  {channel.description || channel.show || `Assista à transmissão ao vivo de ${channel.name} com qualidade HD e múltiplos sinais.`}
                </p>

                {/* VPN / Troubleshooting Callout Card (Cloudflare 1.1.1.1) */}
                <aside className="vpn-callout-card" aria-label="Dica VPN">
                  <div className="vpn-callout-left">
                    <div className="vpn-icon-wrap">
                      <ShieldCheckIcon style={{ width: 22, height: 22 }} />
                    </div>
                    <div className="vpn-callout-copy">
                      <h2>Player não carregou ou o sinal travou?</h2>
                      <p>
                        Alguns provedores de internet bloqueiam conexões de streaming. Instale o app gratuito{" "}
                        <strong style={{ color: "#ffffff" }}>1.1.1.1 da Cloudflare</strong>, ative e recarregue a página.
                      </p>
                    </div>
                  </div>
                  <a
                    className="vpn-callout-btn"
                    href="https://one.one.one.one/pt-BR/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <DownloadIcon style={{ width: 15, height: 15 }} />
                    Baixar 1.1.1.1 grátis
                  </a>
                </aside>
              </div>
            </article>

            {/* "Mais Futebol" / Suggestions Section */}
            {suggestions.length > 0 && (
              <section className="suggestions-section" aria-labelledby="suggestions-title">
                <div className="suggestions-heading">
                  <h2 id="suggestions-title">
                    <span className="flame-icon">
                      <FlameIcon style={{ width: 22, height: 22 }} />
                    </span>
                    {isSport ? "Mais Futebol & Esportes" : `Mais em ${channel.category}`}
                  </h2>
                  <a
                    href={isSport ? "/agenda" : `/canais?categoria=${encodeURIComponent(channel.category)}`}
                    style={{
                      fontSize: 13.5,
                      fontWeight: 700,
                      color: "var(--primary)",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    Ver todos <ArrowRightIcon style={{ width: 14, height: 14 }} />
                  </a>
                </div>

                <div className="suggestions-grid">
                  {suggestions.map((item) => (
                    <a
                      className="suggestion-card"
                      key={item.id}
                      href={`/${item.route}/${encodeURIComponent(item.id)}`}
                    >
                      <div className="suggestion-thumb-wrap">
                        {item.poster ? (
                          <img src={item.poster} alt={item.title} />
                        ) : (
                          <div style={{ display: "grid", placeItems: "center", height: "100%", color: "var(--text-muted)", fontSize: 18, fontWeight: 800 }}>
                            {item.title}
                          </div>
                        )}
                        <span className={`suggestion-badge ${item.status === "live" ? "live" : "upcoming"}`}>
                          {item.status === "live" ? (
                            <>
                              <i /> Ao vivo
                            </>
                          ) : (
                            <>
                              <ClockIcon style={{ width: 11, height: 11 }} /> {item.time}
                            </>
                          )}
                        </span>
                      </div>
                      <div className="suggestion-body">
                        <strong>{item.title}</strong>
                        <span>{item.detail}</span>
                      </div>
                    </a>
                  ))}
                </div>
              </section>
            )}
          </>
        ) : (
          <div className="empty-state" role="alert" style={{ minHeight: 360 }}>
            <strong>Canal ou evento não encontrado.</strong>
            <span>Este endereço pode ter expirado ou o sinal foi temporariamente desativado.</span>
            <a className="button primary" href={sectionHref} style={{ marginTop: 16 }}>
              Voltar para {sectionLabel.toLocaleLowerCase("pt-BR")} <ArrowRightIcon style={{ width: 14, height: 14 }} />
            </a>
          </div>
        )}
      </section>

      <SiteFooter />
    </main>
  );
}
