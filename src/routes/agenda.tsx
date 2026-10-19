import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Clock3, List, Play, RadioTower, Search, Trophy } from "lucide-react";
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
      <header className="grid gap-5 border-b border-border pb-6 lg:grid-cols-12 lg:gap-6 lg:pb-8">
        <div className="lg:col-span-7">
          <p className="section-kicker flex items-center gap-2 text-primary">
            <Trophy className="size-3.5" aria-hidden="true" />
            Esportes
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold sm:mt-3 sm:text-5xl">
            Agenda em campo.
          </h1>
          <p className="mt-3 max-w-xl text-sm text-muted-foreground sm:mt-4 sm:text-base">
            Acompanhe o que está ao vivo, o que começa em seguida e os placares do dia.
          </p>
        </div>
        <label className="flex h-11 items-center gap-3 self-end rounded-md border border-border bg-card/60 px-3.5 sm:h-12 lg:col-span-5 lg:rounded-none lg:border-0 lg:border-b lg:bg-transparent lg:px-0">
          <Search className="size-4 shrink-0 text-primary sm:size-5" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground sm:text-base"
            placeholder="Time, campeonato ou esporte"
            aria-label="Buscar time, campeonato ou esporte"
          />
        </label>
      </header>

      <div
        className="flex items-center gap-2 overflow-x-auto border-b border-border pb-3 pt-4 touch-pan-x [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden sm:pt-6"
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
              className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-xs font-medium transition-all ${
                isSelected
                  ? "bg-primary font-semibold text-primary-foreground shadow-sm"
                  : "border border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground"
              }`}
            >
              <Icon className="size-3.5" aria-hidden="true" />
              <span>{item}</span>
              <span
                className={`text-[10px] tabular-nums ${
                  isSelected ? "text-primary-foreground/80" : "text-muted-foreground"
                }`}
              >
                {counts[item]}
              </span>
            </button>
          );
        })}
      </div>

      {isLoading && (
        <div className="divide-y divide-border">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="grid grid-cols-[5rem_minmax(0,1fr)_auto] items-center gap-4 py-5"
            >
              <Skeleton className="h-10 w-16" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-1/3" />
              </div>
              <Skeleton className="h-7 w-24" />
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
            className="mt-4 text-sm text-primary underline-offset-4 hover:underline"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {!isLoading && !isError && filtered.length > 0 && (
        <div>
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
                  <div className={`pb-2 pt-6 ${index > 0 ? "mt-2 border-t border-border" : ""}`}>
                    <span className="inline-block rounded-md bg-secondary/80 px-2.5 py-1 text-xs font-semibold tracking-wide text-foreground">
                      {divider}
                    </span>
                  </div>
                )}
                <Link
                  to="/evento/$eventId"
                  params={{ eventId: event.id }}
                  className="group block border-b border-border py-4 transition-colors hover:bg-card/40 active:scale-[0.99]"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                    <div className="flex min-w-0 items-start gap-3 sm:items-center sm:gap-4">
                      <div className="w-14 shrink-0 text-left sm:w-16">
                        <p className="font-display text-base font-semibold tabular-nums text-primary sm:text-lg">
                          {time}
                        </p>
                        {showDay && (
                          <p className="text-[10px] capitalize text-muted-foreground sm:text-[11px]">
                            {day}
                          </p>
                        )}
                        <p className="text-[10px] uppercase text-muted-foreground sm:text-[11px]">
                          {event.category}
                        </p>
                      </div>

                      {event.teams ? (
                        <div className="flex shrink-0 items-center gap-1.5 pt-0.5 sm:pt-0">
                          <TeamCrest
                            name={event.teams.home.name}
                            logo={event.teams.home.logo}
                            logos={event.teams.home.logos}
                            className="h-7 w-7"
                          />
                          <TeamCrest
                            name={event.teams.away.name}
                            logo={event.teams.away.logo}
                            logos={event.teams.away.logos}
                            className="h-7 w-7"
                          />
                        </div>
                      ) : null}

                      <div className="min-w-0 flex-1">
                        <h3 className="truncate font-display text-base font-medium text-foreground transition-colors group-hover:text-primary sm:text-lg">
                          {event.title}
                        </h3>
                        <p className="truncate text-xs text-muted-foreground sm:text-sm">
                          {event.competition}
                          {channels.length > 0 ? ` · ${channels.join(" · ")}` : ""}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 pl-[4.25rem] sm:justify-end sm:pl-0">
                      <span
                        className={
                          isLive ? "status-label status-live text-[10px]" : "status-label text-[10px]"
                        }
                      >
                        {isLive && <span className="live-dot" />}
                        {statusLabel}
                      </span>
                      {hasEmbeds && (
                        <span className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-border bg-card/60 px-3 text-xs text-muted-foreground transition-colors group-hover:border-primary group-hover:text-primary">
                          <Play className="size-3" />
                          Assistir
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
