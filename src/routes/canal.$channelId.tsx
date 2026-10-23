import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, ChevronRight, RadioTower, Tv } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ChannelCard } from "@/components/channel-card";
import { EventCard } from "@/components/event-card";
import { MediaImage } from "@/components/media-image";
import { Skeleton } from "@/components/ui/skeleton";
import { WatchPlayer } from "@/components/watch-player";
import { ZappingBar } from "@/components/zapping-bar";
import { useChannel, useChannels, useSports } from "@/hooks/use-api";
import {
  eventsForChannel,
  formatEpgRange,
  labelFromSlug,
  pickRelatedChannels,
  type ApiChannel,
  type ApiEpgEntry,
  type ApiEpgNextEntry,
} from "@/lib/api";

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

function ChannelDetailsPanel({
  channel,
  current,
  next,
  currentRange,
  nextRange,
  theaterMode,
}: {
  channel: ApiChannel;
  current?: ApiEpgEntry | null | undefined;
  next?: ApiEpgNextEntry | null | undefined;
  currentRange: string;
  nextRange: string;
  theaterMode: boolean;
}) {
  return (
    <aside
      className={
        theaterMode
          ? "mt-8 grid gap-8 lg:grid-cols-2 rounded-2xl border border-border/80 bg-card/40 p-6 shadow-sm"
          : "lg:col-span-4"
      }
    >
      <div className="space-y-4">
        <div className="flex items-start gap-4">
          <div className="logo-box h-16 w-24 shrink-0 shadow-md">
            <MediaImage
              src={channel.logo_url}
              alt={channel.name}
              className="h-full w-full bg-transparent"
              imgClassName="logo-box-img p-1"
            />
          </div>
          <div className="min-w-0">
            <p className="section-kicker">{channel.category}</p>
            <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold">{channel.name}</h1>
            {current && (
              <div className="mt-2 status-label status-live">
                <span className="live-dot" />
                AO VIVO
              </div>
            )}
          </div>
        </div>

        {channel.description && (
          <p className="text-sm leading-relaxed text-muted-foreground">{channel.description}</p>
        )}
      </div>

      <div className="space-y-5">
        {current && (
          <div className={theaterMode ? "" : "border-t border-border pt-5"}>
            <p className="section-kicker flex items-center gap-2">
              <RadioTower className="size-3.5 text-primary" aria-hidden="true" />
              No ar agora
            </p>
            <p className="mt-1.5 font-display text-lg font-semibold text-foreground">
              {current.title}
            </p>
            {currentRange && (
              <p className="mt-0.5 font-display text-xs tabular-nums text-muted-foreground">
                {currentRange}
              </p>
            )}
            {current.description && current.description !== "Sinopse não disponível." && (
              <p className="mt-2.5 line-clamp-4 text-sm text-muted-foreground leading-relaxed">
                {current.description}
              </p>
            )}
          </div>
        )}

        {next && (
          <div className="border-t border-border/60 pt-4">
            <p className="section-kicker">A seguir</p>
            <p className="mt-1 font-display font-medium text-foreground/90">{next.title}</p>
            {nextRange && (
              <p className="mt-0.5 font-display text-xs tabular-nums text-muted-foreground">
                {nextRange}
              </p>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}

function ChannelWatchPage() {
  const { channelId } = Route.useParams();
  const { data: channel, isLoading, isError, refetch } = useChannel(channelId);
  const { data: channels = [] } = useChannels();
  const { data: events = [] } = useSports();
  const [theaterMode, setTheaterMode] = useState(false);

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
  const nextRange =
    next?.start_time && next.end_time
      ? formatEpgRange({ start_time: next.start_time, end_time: next.end_time })
      : "";

  return (
    <div>
      <div
        className={
          theaterMode
            ? "w-full bg-black/95 border-b border-border/80 shadow-2xl transition-[background-color,border-color] duration-300"
            : "page-container pt-8 lg:pt-12"
        }
      >
        <div
          className={
            theaterMode
              ? "mx-auto w-full max-w-[1720px] 2xl:max-w-[1880px] px-4 sm:px-6 lg:px-8 py-4 sm:py-6"
              : ""
          }
        >
          <nav
            className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground mb-4"
            aria-label="Trilha"
          >
            <Link to="/canais" className="hover:text-foreground transition-colors">
              Canais
            </Link>
            <ChevronRight className="size-3" aria-hidden="true" />
            <Link
              to="/canais"
              search={{ categoria: channel.category }}
              className="hover:text-foreground transition-colors"
            >
              {channel.category}
            </Link>
            <ChevronRight className="size-3" aria-hidden="true" />
            <span className="text-foreground font-medium">{channel.name}</span>
          </nav>

          <div className={theaterMode ? "w-full" : "grid gap-8 lg:grid-cols-12"}>
            <div className={theaterMode ? "w-full" : "lg:col-span-8"}>
              <WatchPlayer
                title={channel.name}
                embeds={channel.embeds}
                theaterMode={theaterMode}
                onToggleTheater={() => setTheaterMode((prev) => !prev)}
              />

              {!theaterMode && (
                <ZappingBar
                  currentChannelId={channel.id}
                  channels={channels}
                  category={channel.category}
                />
              )}
            </div>

            {!theaterMode && (
              <ChannelDetailsPanel
                channel={channel}
                current={current}
                next={next}
                currentRange={currentRange}
                nextRange={nextRange}
                theaterMode={false}
              />
            )}
          </div>
        </div>
      </div>

      <div
        className={theaterMode ? "page-container py-8 lg:py-12" : "page-container pb-8 lg:pb-12"}
      >
        {theaterMode && (
          <>
            <ZappingBar
              currentChannelId={channel.id}
              channels={channels}
              category={channel.category}
            />

            <ChannelDetailsPanel
              channel={channel}
              current={current}
              next={next}
              currentRange={currentRange}
              nextRange={nextRange}
              theaterMode={true}
            />
          </>
        )}

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
    </div>
  );
}
