import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, ChevronRight, Tv } from "lucide-react";
import { useEffect, useMemo } from "react";
import { ChannelCard } from "@/components/channel-card";
import { EventCard } from "@/components/event-card";
import { MediaImage } from "@/components/media-image";
import { Skeleton } from "@/components/ui/skeleton";
import { WatchPlayer } from "@/components/watch-player";
import { useChannels, useSport, useSports } from "@/hooks/use-api";
import {
  SPORT_STATUS_LABEL,
  channelsForEvent,
  formatEventDay,
  formatEventTime,
  pickRelatedEvents,
} from "@/lib/api";

export const Route = createFileRoute("/evento/$eventId")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.eventId} | Pulso TV` },
      { name: "description", content: "Assista ao evento no Pulso TV." },
      { property: "og:title", content: `${params.eventId} | Pulso TV` },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EventWatchPage,
});

function stripMarkdown(text: string): string {
  return text.replace(/\*/g, "");
}

function EventWatchPage() {
  const { eventId } = Route.useParams();
  const { data: event, isLoading, isError, refetch } = useSport(eventId);
  const { data: events = [] } = useSports();
  const { data: channels = [] } = useChannels();

  useEffect(() => {
    if (event) document.title = `${event.title} | Pulso TV`;
  }, [event]);

  const related = useMemo(
    () => (event ? pickRelatedEvents(events, event, 6) : []),
    [event, events],
  );
  const broadcastChannels = useMemo(
    () => (event ? channelsForEvent(event, channels) : []),
    [event, channels],
  );

  if (isLoading) {
    return (
      <div className="page-container py-8 lg:py-12">
        <Skeleton className="h-4 w-40" />
        <div className="mt-6 grid gap-8 lg:grid-cols-12">
          <Skeleton className="aspect-video w-full lg:col-span-8" />
          <div className="space-y-3 lg:col-span-4">
            <Skeleton className="h-16 w-28" />
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-20 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !event) {
    return (
      <div className="page-container py-20 text-center">
        <h1 className="font-display text-2xl font-semibold">Evento não encontrado</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Essa transmissão não está disponível ou o endereço mudou.
        </p>
        <div className="mt-6 flex justify-center gap-4">
          <button
            onClick={() => refetch()}
            className="text-sm text-primary underline-offset-4 hover:underline"
          >
            Tentar novamente
          </button>
          <Link to="/agenda" className="text-sm text-muted-foreground hover:text-foreground">
            Voltar à agenda
          </Link>
        </div>
      </div>
    );
  }

  const description = event.description ? stripMarkdown(event.description) : null;
  const day = formatEventDay(event);
  const isLive = event.status === "live";

  return (
    <div className="page-container py-8 lg:py-12">
      <nav className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground" aria-label="Trilha">
        <Link to="/" className="hover:text-foreground">
          Início
        </Link>
        <ChevronRight className="size-3" aria-hidden="true" />
        <Link to="/agenda" className="hover:text-foreground">
          Agenda
        </Link>
        <ChevronRight className="size-3" aria-hidden="true" />
        <span className="text-foreground">{event.title}</span>
      </nav>

      <div className="mt-6 grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <WatchPlayer title={event.title} embeds={event.embeds} />
          <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
            Player não carregou ou o sinal travou? Alguns provedores de internet bloqueiam
            conexões de streaming. Instale o app gratuito{" "}
            <a
              href="https://one.one.one.one/"
              target="_blank"
              rel="noreferrer"
              className="text-primary underline-offset-4 hover:underline"
            >
              1.1.1.1 da Cloudflare
            </a>
            , ative e recarregue a página.
          </p>
        </div>

        <aside className="lg:col-span-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className={isLive ? "status-label status-live" : "status-label"}>
              {isLive && <span className="live-dot" />}
              {isLive ? "AO VIVO" : SPORT_STATUS_LABEL[event.status]}
            </span>
            {event.category && <span className="status-label">{event.category}</span>}
            {event.competition && <span className="status-label">{event.competition}</span>}
          </div>

          {event.teams ? (
            <div className="mt-5 flex items-center gap-3">
              <div className="min-w-0 flex-1 text-center">
                <div className="logo-box mx-auto h-12 w-12">
                  <MediaImage
                    src={event.teams.home.logo}
                    alt={event.teams.home.name}
                    className="h-full w-full bg-transparent"
                    imgClassName="logo-box-img"
                  />
                </div>
                <p className="mt-2 truncate font-display text-sm font-semibold">{event.teams.home.name}</p>
              </div>
              <span className="shrink-0 font-display text-lg font-semibold text-muted-foreground">×</span>
              <div className="min-w-0 flex-1 text-center">
                <div className="logo-box mx-auto h-12 w-12">
                  <MediaImage
                    src={event.teams.away.logo}
                    alt={event.teams.away.name}
                    className="h-full w-full bg-transparent"
                    imgClassName="logo-box-img"
                  />
                </div>
                <p className="mt-2 truncate font-display text-sm font-semibold">{event.teams.away.name}</p>
              </div>
            </div>
          ) : null}

          <h1 className="mt-5 font-display text-3xl font-bold">{event.title}</h1>

          <dl className="mt-5 divide-y divide-border border-y border-border text-sm">
            <div className="grid grid-cols-[7rem_minmax(0,1fr)] gap-3 py-2.5">
              <dt className="text-muted-foreground">Campeonato</dt>
              <dd>{event.competition || "—"}</dd>
            </div>
            <div className="grid grid-cols-[7rem_minmax(0,1fr)] gap-3 py-2.5">
              <dt className="text-muted-foreground">Esporte</dt>
              <dd>{event.category || "—"}</dd>
            </div>
            <div className="grid grid-cols-[7rem_minmax(0,1fr)] gap-3 py-2.5">
              <dt className="text-muted-foreground">Horário</dt>
              <dd className="tabular-nums">
                {formatEventTime(event)}
                {day ? ` · ${day}` : ""}
              </dd>
            </div>
            {event.embeds.length > 0 && (
              <div className="grid grid-cols-[7rem_minmax(0,1fr)] gap-3 py-2.5">
                <dt className="text-muted-foreground">Sinais</dt>
                <dd>
                  {event.embeds.map((embed) => (
                    <p key={embed.embed_url}>
                      {embed.quality ? `${embed.provider} · ${embed.quality}` : embed.provider}
                    </p>
                  ))}
                </dd>
              </div>
            )}
          </dl>

          {description && (
            <p className="mt-5 text-sm leading-relaxed text-muted-foreground">{description}</p>
          )}
        </aside>
      </div>

      {broadcastChannels.length > 0 && (
        <section className="mt-12">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
              <Tv className="size-5 text-primary" aria-hidden="true" />
              Canais da transmissão
            </h2>
          </div>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {broadcastChannels.map((channel) => (
              <ChannelCard key={channel.id} channel={channel} />
            ))}
          </div>
        </section>
      )}

      {related.length > 0 && (
        <section className="mt-12">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
              <CalendarDays className="size-5 text-primary" aria-hidden="true" />
              Outros jogos
            </h2>
            <Link to="/agenda" className="text-xs uppercase text-muted-foreground hover:text-primary">
              Agenda completa
            </Link>
          </div>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {related.map((item) => (
              <EventCard key={item.id} event={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
