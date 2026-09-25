import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CheckCircle2,
  Clock3,
  List,
  Play,
  RadioTower,
  Search,
  Trophy,
} from "lucide-react";
import { useMemo, useState, type ElementType } from "react";
import { useSports } from "@/hooks/use-api";
import {
  SPORT_STATUS_LABEL,
  ALL_SPORT_STATUS_LABELS,
  formatEventDay,
  formatEventTime,
  type SportStatusLabel,
  type ApiSportStatus,
} from "@/lib/api";
import { MediaImage } from "@/components/media-image";
import { Skeleton } from "@/components/ui/skeleton";

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

  const statusParam = tab !== ALL_TAB ? labelToApiStatus[tab as SportStatusLabel] : undefined;

  const sportsParams: import("@/lib/api").SportsParams = statusParam ? { status: statusParam } : {};
  const { data: events = [], isLoading, isError, refetch } = useSports(sportsParams);

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("pt-BR");
    if (!q) return events;
    return events.filter((e) =>
      `${e.title} ${e.competition} ${e.category}`.toLocaleLowerCase("pt-BR").includes(q),
    );
  }, [events, query]);

  return (
    <div className="page-container py-8 lg:py-12">
      <header className="grid gap-6 border-b border-border pb-8 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <p className="section-kicker flex items-center gap-2 text-primary">
            <Trophy className="size-3.5" aria-hidden="true" />
            Esportes
          </p>
          <h1 className="mt-3 font-display text-4xl font-bold sm:text-5xl">Agenda em campo.</h1>
          <p className="mt-4 max-w-xl text-muted-foreground">
            Acompanhe o que está ao vivo, o que começa em seguida e os placares do dia.
          </p>
        </div>
        <label className="flex h-12 items-center gap-3 self-end border-b border-border lg:col-span-5">
          <Search className="text-primary" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent outline-none placeholder:text-muted-foreground"
            placeholder="Time, campeonato ou esporte"
            aria-label="Buscar time, campeonato ou esporte"
          />
        </label>
      </header>

      <div className="flex gap-6 overflow-x-auto border-b border-border pt-6" role="tablist">
        {tabs.map((item) => {
          const Icon = tabIcons[item];
          return (
            <button
              key={item}
              role="tab"
              aria-selected={tab === item}
              onClick={() => setTab(item)}
              className={`flex min-h-11 shrink-0 items-center gap-2 border-b-2 pb-3 text-sm transition-colors ${
                tab === item
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="size-4" aria-hidden="true" />
              {item}
            </button>
          );
        })}
      </div>

      {isLoading && (
        <div className="divide-y divide-border">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="grid grid-cols-[5rem_minmax(0,1fr)_auto] items-center gap-4 py-5">
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
        <div className="divide-y divide-border">
          {filtered.map((event) => {
            const statusLabel = SPORT_STATUS_LABEL[event.status];
            const isLive = event.status === "live";
            const time = formatEventTime(event);
            const day = formatEventDay(event);
            const hasEmbeds = event.embeds.length > 0;
            const showDay = day && day !== "Hoje";

            return (
              <article
                key={event.id}
                className="grid grid-cols-[3.5rem_minmax(0,1fr)] gap-4 py-5 sm:grid-cols-[5rem_minmax(0,1fr)_auto] sm:items-center"
              >
                <div>
                  <p className="font-display text-lg tabular-nums text-primary">{time}</p>
                  {showDay && (
                    <p className="text-[11px] capitalize text-muted-foreground">{day}</p>
                  )}
                  <p className="text-[11px] uppercase text-muted-foreground">{event.category}</p>
                </div>

                <div className="min-w-0">
                  <p className="flex min-w-0 items-center gap-2 font-display text-lg font-medium">
                    {event.teams ? (
                      <>
                        <MediaImage
                          src={event.teams.home.logo}
                          alt={event.teams.home.name}
                          className="h-6 w-6 shrink-0 bg-transparent"
                          imgClassName="object-contain"
                        />
                        <span className="min-w-0 truncate">{event.title}</span>
                        <MediaImage
                          src={event.teams.away.logo}
                          alt={event.teams.away.name}
                          className="h-6 w-6 shrink-0 bg-transparent"
                          imgClassName="object-contain"
                        />
                      </>
                    ) : (
                      <span className="min-w-0 truncate">{event.title}</span>
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {event.competition}
                    {event.embeds[0]?.provider ? ` · ${event.embeds[0].provider}` : ""}
                  </p>
                </div>

                <div className="col-start-2 flex items-center gap-3 sm:col-start-auto">
                  <span className={isLive ? "status-label status-live" : "status-label"}>
                    {isLive && <span className="live-dot" />}
                    {statusLabel}
                  </span>
                  {hasEmbeds && (
                    <Link
                      to="/evento/$eventId"
                      params={{ eventId: event.id }}
                      aria-label={`Assistir ${event.title}`}
                      className="flex min-h-11 items-center gap-1.5 rounded border border-border px-3 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                    >
                      <Play className="size-3" />
                      Assistir
                    </Link>
                  )}
                </div>
              </article>
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
