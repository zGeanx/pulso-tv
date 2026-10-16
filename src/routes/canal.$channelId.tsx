import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, ChevronRight, RadioTower, Tv } from "lucide-react";
import { useEffect, useMemo } from "react";
import { ChannelCard } from "@/components/channel-card";
import { EventCard } from "@/components/event-card";
import { MediaImage } from "@/components/media-image";
import { Skeleton } from "@/components/ui/skeleton";
import { WatchPlayer } from "@/components/watch-player";
import { useChannel, useChannels, useSports } from "@/hooks/use-api";
import { eventsForChannel, formatEpgRange, labelFromSlug, pickRelatedChannels } from "@/lib/api";

export const Route = createFileRoute("/canal/$channelId")({
  head: ({ params }) => {
    const label = labelFromSlug(params.channelId);
    const title = `${label} | Pulso TV`;
    const description = `Assista ${label} ao vivo no Pulso TV.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: ChannelWatchPage,
});

function ChannelWatchPage() {
  const { channelId } = Route.useParams();
  const { data: channel, isLoading, isError, refetch } = useChannel(channelId);
  const { data: channels = [] } = useChannels();
  const { data: events = [] } = useSports();

  useEffect(() => {
    if (channel) document.title = `${channel.name} | Pulso TV`;
  }, [channel]);

  const games = useMemo(
    () => (channel ? eventsForChannel(channel, events).slice(0, 6) : []),
    [channel, events],
  );
  const related = useMemo(
    () => (channel ? pickRelatedChannels(channels, channel, 6) : []),
    [channel, channels],
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

  if (isError || !channel) {
    return (
      <div className="page-container py-20 text-center">
        <h1 className="font-display text-2xl font-semibold">Canal não encontrado</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Esse sinal não está disponível ou o endereço mudou.
        </p>
        <div className="mt-6 flex justify-center gap-4">
          <button
            onClick={() => refetch()}
            className="text-sm text-primary underline-offset-4 hover:underline"
          >
            Tentar novamente
          </button>
          <Link to="/canais" className="text-sm text-muted-foreground hover:text-foreground">
            Voltar aos canais
          </Link>
        </div>
      </div>
    );
  }

  const current = channel.epg?.current;
  const next = channel.epg?.next;
  const currentRange = current ? formatEpgRange(current) : "";
  const nextRange = next?.start_time && next.end_time ? formatEpgRange(next) : "";

  return (
    <div className="page-container py-8 lg:py-12">
      <nav
        className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground"
        aria-label="Trilha"
      >
        <Link to="/canais" className="hover:text-foreground">
          Canais
        </Link>
        <ChevronRight className="size-3" aria-hidden="true" />
        <Link
          to="/canais"
          search={{ categoria: channel.category }}
          className="hover:text-foreground"
        >
          {channel.category}
        </Link>
        <ChevronRight className="size-3" aria-hidden="true" />
        <span className="text-foreground">{channel.name}</span>
      </nav>

      <div className="mt-6 grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <WatchPlayer title={channel.name} embeds={channel.embeds} />
        </div>

        <aside className="lg:col-span-4">
          <div className="flex items-start gap-4">
            <div className="logo-box h-16 w-24 shrink-0">
              <MediaImage
                src={channel.logo_url}
                alt={channel.name}
                className="h-full w-full bg-transparent"
                imgClassName="logo-box-img"
              />
            </div>
            <div className="min-w-0">
              <p className="section-kicker">{channel.category}</p>
              <h1 className="mt-1 font-display text-3xl font-bold">{channel.name}</h1>
              {current && (
                <div className="mt-2 status-label status-live">
                  <span className="live-dot" />
                  AO VIVO
                </div>
              )}
            </div>
          </div>

          {channel.description && (
            <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
              {channel.description}
            </p>
          )}

          {current && (
            <div className="mt-6 border-t border-border pt-5">
              <p className="section-kicker flex items-center gap-2">
                <RadioTower className="size-3.5 text-primary" aria-hidden="true" />
                Agora
              </p>
              <p className="mt-2 font-display text-lg font-semibold">{current.title}</p>
              {currentRange && (
                <p className="mt-1 font-display text-xs tabular-nums text-muted-foreground">
                  {currentRange}
                </p>
              )}
              {current.description && current.description !== "Sinopse não disponível." && (
                <p className="mt-3 line-clamp-5 text-sm text-muted-foreground">
                  {current.description}
                </p>
              )}
            </div>
          )}

          {next && (
            <div className="mt-5 border-t border-border pt-5">
              <p className="section-kicker">A seguir</p>
              <p className="mt-2 font-display font-medium">{next.title}</p>
              {nextRange && (
                <p className="mt-1 font-display text-xs tabular-nums text-muted-foreground">
                  {nextRange}
                </p>
              )}
            </div>
          )}
        </aside>
      </div>

      {games.length > 0 && (
        <section className="mt-12">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
              <CalendarDays className="size-5 text-primary" aria-hidden="true" />
              Próximos jogos
            </h2>
            <Link
              to="/agenda"
              className="text-xs uppercase text-muted-foreground hover:text-primary"
            >
              Agenda completa
            </Link>
          </div>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {games.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </section>
      )}

      {related.length > 0 && (
        <section className="mt-12">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
              <Tv className="size-5 text-primary" aria-hidden="true" />
              Outros canais · {channel.category}
            </h2>
            <Link
              to="/canais"
              search={{ categoria: channel.category }}
              className="text-xs uppercase text-muted-foreground hover:text-primary"
            >
              Ver todos
            </Link>
          </div>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((item) => (
              <ChannelCard key={item.id} channel={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
