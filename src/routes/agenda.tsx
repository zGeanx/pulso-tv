import { createFileRoute, Link } from "@tanstack/react-router";
import { Calendar, CheckCircle2, Clock3, List, Play, RadioTower, Search, Trophy, Tv, X } from "lucide-react";
import { useMemo, useState, type ElementType } from "react";
import { useSports } from "@/hooks/use-api";
import {
  SPORT_STATUS_LABEL,
  ALL_SPORT_STATUS_LABELS,
  eventChannelNames,
  formatAgendaDay,
  formatEventDay,
  formatEventTime,
  type SportStatusLabel,
  type ApiSportStatus,
} from "@/lib/api";
import { headlineEvents } from "@/lib/agenda-rank";
import { eventSearchBlob } from "@/lib/merge-catalog";
import { Skeleton } from "@/components/ui/skeleton";
import { TeamCrest } from "@/components/team-crest";

const ALL_TAB = "Todos os jogos" as const;
type TabLabel = typeof ALL_TAB | SportStatusLabel;

const tabs: TabLabel[] = [ALL_TAB, ...ALL_SPORT_STATUS_LABELS];

const tabIcons: Record<TabLabel, ElementType> = {
  "Todos os jogos": List,
  "Ao vivo agora": RadioTower,
  "Hoje & Próximos": Clock3,
  Encerrados: CheckCircle2,
};

const labelToApiStatus: Record<SportStatusLabel, ApiSportStatus> = {
  "Ao vivo agora": "live",
  "Hoje & Próximos": "upcoming",
  Encerrados: "finished",
};

const emptyCopy: Record<TabLabel, string> = {
  "Todos os jogos": "Nenhum evento encontrado",
  "Ao vivo agora": "Nenhum jogo ao vivo agora",
  "Hoje & Próximos": "Nenhum jogo próximo no momento",
  Encerrados: "Nenhum jogo encerrado na lista",
};

export const Route = createFileRoute("/agenda")({
  head: () => ({
    meta: [
      { title: "Agenda esportiva | Pulso TV" },
      {
        name: "description",
        content: "Jogos ao vivo, próximos eventos e resultados no Pulso TV.",
      },
      { property: "og:title", content: "Agenda esportiva | Pulso TV" },
      {
        property: "og:description",
        content: "Jogos ao vivo, próximos eventos e resultados no Pulso TV.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AgendaPage,
});

function AgendaPage() {
  const [tab, setTab] = useState<TabLabel>(ALL_TAB);
  const [query, setQuery] = useState("");
  const { data: events = [], isLoading, isError, refetch } = useSports();
  const headlines = useMemo(() => headlineEvents(events), [events]);

  const counts: Record<TabLabel, number> = {
    "Todos os jogos": headlines.length,
    "Ao vivo agora": headlines.filter((event) => event.status === "live").length,
    "Hoje & Próximos": headlines.filter((event) => event.status === "upcoming").length,
    Encerrados: headlines.filter((event) => event.status === "finished").length,
  };

  const filtered = useMemo(() => {
    const status = tab === ALL_TAB ? null : labelToApiStatus[tab];
    const inTab = status ? headlines.filter((event) => event.status === status) : headlines;
    const q = query.trim();
    return q ? inTab.filter((event) => fold(eventSearchBlob(event)).includes(fold(q))) : inTab;
  }, [headlines, query, tab]);

  return (
    <div className="page-container py-8 lg:py-12">
      <header className="flex flex-col gap-6 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between lg:pb-8">
        <div>
          <p className="section-kicker flex items-center gap-2 text-primary">
            <Trophy className="size-3.5" aria-hidden="true" />
            Agenda esportiva
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold sm:mt-3 sm:text-5xl">
            Partidas em campo.
          </h1>
          <p className="mt-3 max-w-xl text-sm text-muted-foreground sm:mt-4 sm:text-base">
            Acompanhe o que está ao vivo, o que começa em seguida e os placares do dia.
          </p>
        </div>

        {/* Search input */}
        <div className="w-full lg:max-w-md">
          <div className="relative flex items-center">
            <Search className="pointer-events-none absolute left-3.5 size-4 text-muted-foreground" aria-hidden="true" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-11 w-full rounded-xl border border-border/80 bg-card/60 pl-10 pr-9 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-all focus:border-primary focus:bg-card focus:ring-1 focus:ring-primary/40 sm:h-12"
              placeholder="Buscar time, campeonato ou esporte..."
              aria-label="Buscar time, campeonato ou esporte"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-3 rounded-md p-1 text-muted-foreground hover:bg-card hover:text-foreground cursor-pointer"
                aria-label="Limpar busca"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Filter Tabs */}
      <div className="py-5 sm:py-6">
        <div
          className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none"
          role="tablist"
        >
          {tabs.map((item) => {
            const Icon = tabIcons[item];
            const isSelected = tab === item;
            return (
              <button
                key={item}
                role="tab"
                aria-selected={isSelected}
                onClick={() => setTab(item)}
                className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-medium transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? "bg-primary font-semibold text-primary-foreground shadow-sm shadow-primary/20 scale-[1.02]"
                    : "border border-border/80 bg-card/60 text-muted-foreground hover:border-primary/50 hover:bg-card hover:text-foreground"
                }`}
              >
                <Icon className="size-3.5" aria-hidden="true" />
                <span>{item}</span>
                <span
                  className={`rounded-full px-1.5 py-0.5 font-display text-[11px] tabular-nums ${
                    isSelected
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-secondary/80 text-muted-foreground"
                  }`}
                >
                  {counts[item]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-border/70 bg-card/40 p-4 sm:p-5"
            >
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-center">
                <div className="flex items-center gap-3 lg:col-span-3">
                  <Skeleton className="h-12 w-16 rounded-xl" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
                <div className="lg:col-span-6 flex items-center justify-center gap-4">
                  <Skeleton className="h-5 w-28" />
                  <Skeleton className="size-8 rounded-full" />
                  <Skeleton className="size-4" />
                  <Skeleton className="size-8 rounded-full" />
                  <Skeleton className="h-5 w-28" />
                </div>
                <div className="lg:col-span-3 flex justify-end">
                  <Skeleton className="h-9 w-24 rounded-xl" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isError && (
        <div className="py-20 text-center">
          <h2 className="font-display text-xl font-semibold">Não foi possível carregar a agenda</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Verifique sua conexão e tente novamente.
          </p>
          <button
            onClick={() => refetch()}
            className="mt-4 text-sm text-primary underline-offset-4 hover:underline cursor-pointer"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {!isLoading && !isError && filtered.length > 0 && (
        <div className="space-y-2">
          {filtered.map((event, index) => {
            const statusLabel = SPORT_STATUS_LABEL[event.status];
            const isLive = event.status === "live";
            const time = formatEventTime(event);
            const day = formatEventDay(event);
            const hasEmbeds = event.embeds.length > 0;
            const showDay = day && day !== "Hoje";
            const divider = formatAgendaDay(event);
            const previous = filtered[index - 1];
            const showDivider = !previous || formatAgendaDay(previous) !== divider;
            const channels = eventChannelNames(event);

            return (
              <div key={event.id}>
                {showDivider && (
                  <div className={`flex items-center gap-3 pb-3 pt-6 ${index > 0 ? "mt-4" : ""}`}>
                    <span className="flex items-center gap-2 rounded-lg border border-border/80 bg-card/90 px-3 py-1 font-display text-xs font-semibold uppercase tracking-wider text-primary shadow-sm">
                      <Calendar className="size-3.5" />
                      {divider}
                    </span>
                    <div className="h-px flex-1 bg-border/60" />
                  </div>
                )}
                <Link
                  to="/evento/$eventId"
                  params={{ eventId: event.id }}
                  className="group block rounded-2xl border border-border/70 bg-card/40 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-card/80 hover:shadow-lg hover:shadow-black/20"
                >
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-center">
                    {/* Zona 1: Horário & Torneio */}
                    <div className="flex items-center gap-3 lg:col-span-3">
                      <div className="flex min-w-[4.25rem] flex-col items-center justify-center rounded-xl border border-border/70 bg-background/60 px-3 py-2 text-center shadow-inner">
                        <span className="font-display text-base sm:text-lg font-bold tabular-nums text-foreground group-hover:text-primary transition-colors">
                          {time}
                        </span>
                        {showDay && (
                          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                            {day}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="inline-block rounded-md bg-secondary/80 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground truncate max-w-[200px]">
                          {event.competition}
                        </span>
                        <p className="mt-0.5 truncate text-[11px] text-muted-foreground/80">
                          {event.category}
                        </p>
                      </div>
                    </div>

                    {/* Zona 2: Confronto & Transmissão */}
                    <div className="flex flex-col justify-center min-w-0 lg:col-span-6">
                      {event.teams ? (
                        <div className="flex items-center gap-3 sm:gap-4">
                          {/* Time Mandante */}
                          <div className="flex items-center gap-2.5 min-w-0 flex-1 justify-end">
                            <span className="truncate font-display text-sm sm:text-base font-semibold text-foreground text-right group-hover:text-primary transition-colors">
                              {event.teams.home.name}
                            </span>
                            <TeamCrest
                              name={event.teams.home.name}
                              logo={event.teams.home.logo}
                              logos={event.teams.home.logos}
                              className="size-8 sm:size-9 shrink-0 drop-shadow-sm transition-transform duration-200 group-hover:scale-110"
                            />
                          </div>

                          {/* Divisor VS */}
                          <span className="shrink-0 rounded-full border border-border/80 bg-background/90 px-2.5 py-0.5 font-display text-[11px] font-bold text-muted-foreground shadow-sm">
                            ×
                          </span>

                          {/* Time Visitante */}
                          <div className="flex items-center gap-2.5 min-w-0 flex-1 justify-start">
                            <TeamCrest
                              name={event.teams.away.name}
                              logo={event.teams.away.logo}
                              logos={event.teams.away.logos}
                              className="size-8 sm:size-9 shrink-0 drop-shadow-sm transition-transform duration-200 group-hover:scale-110"
                            />
                            <span className="truncate font-display text-sm sm:text-base font-semibold text-foreground text-left group-hover:text-primary transition-colors">
                              {event.teams.away.name}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <h3 className="truncate font-display text-base font-semibold text-foreground group-hover:text-primary transition-colors">
                            {event.title}
                          </h3>
                        </div>
                      )}

                      {/* Canais de Transmissão */}
                      {channels.length > 0 && (
                        <div className="mt-1.5 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
                          <Tv className="size-3 text-primary shrink-0" />
                          <span className="truncate">
                            {channels.join(" · ")}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Zona 3: Status & Ação Contextual */}
                    <div className="flex items-center justify-between lg:justify-end gap-3 lg:col-span-3 pt-2 lg:pt-0 border-t border-border/40 lg:border-t-0">
                      {isLive ? (
                        <div className="flex items-center gap-2.5">
                          <span className="status-label status-live text-[10px] shadow-sm">
                            <span className="live-dot" />
                            AO VIVO
                          </span>
                          <span className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground shadow-md shadow-primary/25 transition-all group-hover:scale-105">
                            <Play className="size-3.5 fill-current" />
                            Assistir
                          </span>
                        </div>
                      ) : event.status === "upcoming" ? (
                        <div className="flex items-center gap-2">
                          <span className="rounded-full border border-border/80 bg-background/80 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                            {statusLabel}
                          </span>
                          {hasEmbeds && (
                            <span className="inline-flex items-center gap-1.5 rounded-xl border border-border/80 bg-card/60 px-3 py-1 text-xs font-medium text-muted-foreground transition-colors group-hover:border-primary/50 group-hover:text-foreground">
                              Transmissão
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="rounded-full border border-border/60 bg-muted/30 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
                          {statusLabel}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      )}

      {!isLoading && !isError && filtered.length === 0 && (
        <div className="py-20 text-center">
          <h2 className="font-display text-xl font-semibold">{emptyCopy[tab]}</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Tente outro filtro ou termo de busca.
          </p>
        </div>
      )}
    </div>
  );
}

function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");
}
