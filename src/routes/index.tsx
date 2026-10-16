import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Baby,
  BookOpen,
  Clapperboard,
  Clock3,
  Compass,
  Newspaper,
  Play,
  RadioTower,
  Sparkles,
  Trophy,
  Tv,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { EventCard } from "@/components/event-card";
import { MatchCover } from "@/components/match-cover";
import { MediaImage } from "@/components/media-image";
import { TeamCrest } from "@/components/team-crest";
import { Skeleton } from "@/components/ui/skeleton";
import { useChannels, useChannelCategories, useSports } from "@/hooks/use-api";
import {
  formatEpgRange,
  formatEventDay,
  formatEventTime,
  epgProgress,
  pickFeaturedChannels,
  pickFeaturedEvents,
  pickLiveNow,
  pickScheduleChannels,
} from "@/lib/api";
import type { ApiChannel, ApiSportEvent } from "@/lib/api";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Pulso TV | Canais e eventos ao vivo" },
      {
        name: "description",
        content: "Assista canais, programas e eventos esportivos ao vivo no Pulso TV.",
      },
      { property: "og:title", content: "Pulso TV | Canais e eventos ao vivo" },
      {
        property: "og:description",
        content: "Assista canais, programas e eventos esportivos ao vivo no Pulso TV.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const categoryIcons: Record<string, LucideIcon> = {
  "Canais Abertos": Tv,
  Entretenimento: Sparkles,
  Esportes: Trophy,
  Notícias: Newspaper,
  "Filmes e Séries": Clapperboard,
  Infantil: Baby,
  Documentários: BookOpen,
};

function isSportEvent(hero: ApiSportEvent | ApiChannel): hero is ApiSportEvent {
  return "competition" in hero;
}

function pickHero(
  events: ApiSportEvent[],
  channels: ApiChannel[],
): ApiSportEvent | ApiChannel | undefined {
  const withPlayer = events.filter((event) => event.embeds.length > 0);
  const pool = withPlayer.length > 0 ? withPlayer : events;
  const now = Date.now() / 1000;
  const nearest = (items: ApiSportEvent[]) =>
    [...items].sort(
      (a, b) => Math.abs(a.start_timestamp - now) - Math.abs(b.start_timestamp - now),
    );

  const live = nearest(pool.filter((event) => event.status === "live"));
  if (live[0]) return live[0];

  const upcoming = nearest(pool.filter((event) => event.status === "upcoming"));
  if (upcoming[0]) return upcoming[0];

  return channels.find((channel) => channel.embeds.length > 0) ?? channels[0];
}

function heroKicker(hero: ApiSportEvent | ApiChannel | undefined): string {
  if (!hero || !isSportEvent(hero)) return "Transmissão em destaque";
  if (hero.status === "live") {
    return hero.category === "Futebol" ? "Futebol ao vivo" : "Esportes ao vivo";
  }
  if (hero.status === "upcoming") {
    const day = formatEventDay(hero);
    const when = !day || day === "Hoje" ? "Hoje" : day === "Amanhã" ? "Amanhã" : day;
    return `${when} às ${formatEventTime(hero)}`;
  }
  return "Encerrado";
}

function stripMarkdown(text: string): string {
  return text.replace(/\*/g, "");
}

interface HeroSectionProps {
  hero: ApiSportEvent | ApiChannel | undefined;
}

function HeroSection({ hero }: HeroSectionProps) {
  const kicker = heroKicker(hero);

  if (hero && isSportEvent(hero)) {
    const event = hero;
    const isLive = event.status === "live";
    const hasEmbeds = event.embeds.length > 0;
    const description = event.description ? stripMarkdown(event.description) : null;

    return (
      <section className="border-b border-border">
        <div className="page-container grid gap-8 py-8 lg:grid-cols-12 lg:py-12">
          <div className="flex flex-col lg:col-span-5">
            <div className="flex items-center gap-3 text-xs font-medium uppercase tracking-widest text-primary">
              {isLive && <span className="live-dot" />}
              {kicker}
            </div>

            <p className="mt-4 text-sm font-medium uppercase tracking-wider text-muted-foreground">
              {event.competition}
            </p>

            <h1 className="mt-3 text-balance font-display text-4xl font-bold leading-none sm:text-5xl lg:text-6xl">
              {event.title}
            </h1>

            {event.teams && (
              <div className="mt-5 flex items-center gap-4">
                <TeamCrest
                  name={event.teams.home.name}
                  logo={event.teams.home.logo}
                  logos={event.teams.home.logos}
                />
                <span className="font-display text-lg font-semibold text-muted-foreground">×</span>
                <TeamCrest
                  name={event.teams.away.name}
                  logo={event.teams.away.logo}
                  logos={event.teams.away.logos}
                />
              </div>
            )}

            {description && (
              <p className="mt-5 max-w-md text-pretty text-muted-foreground line-clamp-3">
                {description}
              </p>
            )}

            <div className="mt-4 flex flex-wrap gap-x-4 text-xs uppercase tabular-nums text-muted-foreground">
              <span>{formatEventTime(event)}</span>
              <span>/</span>
              {isLive ? (
                <span className="text-live">Ao vivo</span>
              ) : event.status === "upcoming" ? (
                <span>Em breve</span>
              ) : (
                <span>Encerrado</span>
              )}
            </div>

            <Button
              variant="broadcast"
              size="lg"
              className="mt-8 w-fit"
              asChild={hasEmbeds}
              disabled={!hasEmbeds}
            >
              {hasEmbeds ? (
                <Link to="/evento/$eventId" params={{ eventId: event.id }}>
                  <Play />
                  {isLive ? "Assistir agora" : "Abrir transmissão"}
                </Link>
              ) : (
                <>
                  <Play />
                  {isLive ? "Assistir agora" : "Abrir transmissão"}
                </>
              )}
            </Button>
          </div>

          <div className="relative order-first self-start overflow-hidden rounded-lg bg-card lg:order-none lg:col-span-7">
            {event.poster ? (
              <>
                <img
                  src={event.poster}
                  alt=""
                  aria-hidden="true"
                  referrerPolicy="no-referrer"
                  loading="eager"
                  decoding="async"
                  className="pointer-events-none absolute inset-0 h-full w-full scale-110 object-cover opacity-45 blur-xl"
                />
                <MediaImage
                  src={event.poster}
                  alt={event.title}
                  eager
                  className="aspect-video w-full bg-transparent"
                  imgClassName="object-contain"
                  fallback={<MatchCover event={event} size="hero" />}
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
              </>
            ) : (
              <MatchCover event={event} size="hero" />
            )}
            <div className="absolute left-4 top-4">
              {isLive ? (
                <span className="status-label status-live">
                  <span className="live-dot" />
                  AO VIVO
                </span>
              ) : (
                <span className="status-label border border-border bg-background/80 text-muted-foreground">
                  {event.status === "upcoming" ? "EM BREVE" : "ENCERRADO"}
                </span>
              )}
            </div>
          </div>
        </div>
      </section>
    );
  }

  const channel = hero as ApiChannel | undefined;
  const featuredProgram = channel?.epg?.current?.title ?? "Ao vivo";
  const featuredNext = channel?.epg?.next?.title;
  const epgRange = channel?.epg?.current ? formatEpgRange(channel.epg.current) : "";

  return (
    <section className="border-b border-border">
      <div className="page-container grid gap-8 py-8 lg:grid-cols-12 lg:py-12">
        <div className="flex flex-col lg:col-span-5">
          <div className="flex items-center gap-3 text-xs font-medium uppercase tracking-widest text-primary">
            <span className="live-dot" />
            {kicker}
          </div>
          <h1 className="mt-6 text-balance font-display text-4xl font-bold leading-none sm:text-5xl lg:text-6xl">
            {featuredProgram}
          </h1>
          {channel && (
            <p className="mt-5 max-w-md text-pretty text-muted-foreground line-clamp-3">
              {channel.epg?.current?.description ?? `Transmissão ao vivo em ${channel.name}`}
            </p>
          )}
          {channel && (
            <div className="mt-4 flex flex-wrap gap-x-4 text-xs uppercase tabular-nums text-muted-foreground">
              <span>{channel.name}</span>
              {epgRange && (
                <>
                  <span>/</span>
                  <span>{epgRange}</span>
                </>
              )}
              <span className="text-live">/ Ao vivo</span>
            </div>
          )}
          {channel ? (
            <Button variant="broadcast" size="lg" className="mt-8 w-fit" asChild>
              <Link to="/canal/$channelId" params={{ channelId: channel.id }}>
                <Play />
                Assistir agora
              </Link>
            </Button>
          ) : null}
          {featuredNext && (
            <p className="mt-8 border-t border-border pt-5 text-xs text-muted-foreground lg:mt-10">
              A seguir · {featuredNext}
            </p>
          )}
        </div>

        <div
          id="player"
          className="relative order-first self-start overflow-hidden rounded-lg lg:order-none lg:col-span-7"
        >
          {channel?.epg?.current?.image ? (
            <MediaImage
              src={channel.epg.current.image}
              alt={featuredProgram}
              eager
              className="aspect-video w-full bg-background"
              imgClassName="object-contain"
            />
          ) : channel?.logo_url ? (
            <div className="flex aspect-video w-full items-center justify-center rounded-lg bg-card">
              <MediaImage
                src={channel.logo_url}
                alt={channel.name}
                className="h-32 w-48 bg-transparent"
                imgClassName="object-contain"
              />
            </div>
          ) : (
            <div className="aspect-video w-full rounded-lg bg-card" />
          )}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/65 via-transparent to-transparent" />
          <div className="absolute left-4 top-4 status-label status-live">
            <span className="live-dot" />
            AO VIVO
          </div>
        </div>
      </div>
    </section>
  );
}

function LiveNowSection({ channels }: { channels: ApiChannel[] }) {
  const sorted = pickLiveNow(channels, 3);

  return (
    <div className="lg:col-span-8">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
          <RadioTower className="size-5 text-primary" aria-hidden="true" />
          Ao vivo agora
        </h2>
        <Link
          to="/canais"
          search={{ categoria: "Esportes" }}
          className="flex items-center gap-1.5 text-xs uppercase text-muted-foreground hover:text-primary"
        >
          Ver todos <ArrowRight className="size-3" />
        </Link>
      </div>
      <div className="divide-y divide-border">
        {sorted.map((item) => (
          <Link
            key={item.id}
            to="/canal/$channelId"
            params={{ channelId: item.id }}
            className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 py-4 hover:text-primary"
          >
            <div className="logo-box h-14 w-24">
              <MediaImage
                src={item.logo_url}
                alt={item.name}
                className="h-full w-full bg-transparent"
                imgClassName="logo-box-img"
              />
            </div>
            <div className="min-w-0">
              <h3 className="truncate font-display text-lg font-medium">
                {item.epg?.current?.title ?? item.name}
              </h3>
              <p className="text-xs text-muted-foreground">
                {item.name} · {item.category}
              </p>
            </div>
            <div className="hidden items-center gap-3 text-sm text-muted-foreground sm:flex">
              <span className="tabular-nums">
                {item.epg?.current ? formatEpgRange(item.epg.current) : ""}
              </span>
              <span className="flex items-center gap-2 text-live">
                <span className="live-dot" />
                AO VIVO
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function ExploreSection({
  categories,
  channels,
}: {
  categories: { name: string }[];
  channels: ApiChannel[];
}) {
  const counts = channels.reduce<Record<string, number>>((acc, ch) => {
    acc[ch.category] = (acc[ch.category] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <aside className="lg:col-span-4">
      <div className="border-b border-border pb-3">
        <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
          <Compass className="size-5 text-primary" aria-hidden="true" />
          Explorar
        </h2>
      </div>
      <div className="divide-y divide-border">
        {categories.map((cat) => {
          const Icon = categoryIcons[cat.name] ?? Tv;
          return (
            <Link
              key={cat.name}
              to="/canais"
              search={{ categoria: cat.name }}
              className="group flex items-center justify-between py-3.5 text-sm hover:text-primary"
            >
              <span className="flex items-center gap-3">
                <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
                {cat.name}
              </span>
              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                {counts[cat.name] ?? 0}
                <ArrowRight className="size-3 opacity-0 transition-opacity group-hover:opacity-100" />
              </span>
            </Link>
          );
        })}
      </div>
    </aside>
  );
}

function FeaturedChannelsSection({ channels }: { channels: ApiChannel[] }) {
  const featured = pickFeaturedChannels(channels, 4);

  return (
    <div className="lg:col-span-5">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
          <Tv className="size-5 text-primary" aria-hidden="true" />
          Canais em destaque
        </h2>
        <Link
          to="/canais"
          search={{ categoria: "Esportes" }}
          className="flex items-center gap-1.5 text-xs uppercase text-muted-foreground hover:text-primary"
        >
          Todos os esportes <ArrowRight className="size-3" />
        </Link>
      </div>
      <div className="divide-y divide-border">
        {featured.map((channel) => (
          <Link
            key={channel.id}
            to="/canal/$channelId"
            params={{ channelId: channel.id }}
            className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 py-4 text-sm hover:text-primary"
          >
            <div className="logo-box h-10 w-16">
              <MediaImage
                src={channel.logo_url}
                alt={channel.name}
                className="h-full w-full bg-transparent"
                imgClassName="logo-box-img"
              />
            </div>
            <span className="min-w-0">
              <strong className="block truncate font-medium">{channel.name}</strong>
              <small className="text-muted-foreground">
                {channel.epg?.current?.title ?? channel.category}
              </small>
            </span>
            <span className="status-label status-live text-[10px]">
              <span className="live-dot" />
              AO VIVO
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function ScheduleSection({ channels }: { channels: ApiChannel[] }) {
  const scheduleItems = pickScheduleChannels(channels, 6);

  return (
    <div className="lg:col-span-7">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
          <Clock3 className="size-5 text-primary" aria-hidden="true" />
          Programação · agora
        </h2>
      </div>
      <div className="divide-y divide-border">
        {scheduleItems.map((channel) => {
          const current = channel.epg?.current;
          if (!current) return null;
          const progress = epgProgress(current);
          return (
            <Link
              key={channel.id}
              to="/canal/$channelId"
              params={{ channelId: channel.id }}
              className="grid grid-cols-[5.5rem_minmax(0,1fr)_auto] items-center gap-4 py-3.5 text-sm hover:text-primary"
            >
              <span className="font-display tabular-nums text-muted-foreground">
                {formatEpgRange(current)}
              </span>
              <span className="min-w-0">
                <span className="block truncate">{current.title}</span>
                <span className="mt-1.5 block h-0.5 max-w-40 bg-foreground/10">
                  <span className="block h-full bg-live" style={{ width: `${progress * 100}%` }} />
                </span>
              </span>
              <span className="text-xs text-muted-foreground">{channel.name}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function HeroSkeleton() {
  return (
    <section className="border-b border-border">
      <div className="page-container grid gap-8 py-8 lg:grid-cols-12 lg:py-12">
        <div className="flex flex-col gap-4 lg:col-span-5">
          <Skeleton className="h-3 w-36" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="mt-4 h-10 w-44" />
        </div>
        <Skeleton className="aspect-video w-full lg:col-span-7" />
      </div>
    </section>
  );
}

function ChannelCardSkeleton() {
  return (
    <div className="border-b border-border pb-5">
      <Skeleton className="aspect-video w-full" />
      <Skeleton className="mt-3 h-5 w-2/3" />
      <Skeleton className="mt-2 h-4 w-1/2" />
    </div>
  );
}

function Index() {
  const { data: channels = [], isLoading: loadingChannels } = useChannels();
  const { data: events = [], isLoading: loadingEvents } = useSports();
  const { data: categories = [] } = useChannelCategories();

  const hero = pickHero(events, channels);
  const heroLoading = loadingChannels || loadingEvents;
  const featuredEvents = pickFeaturedEvents(events, 4);

  return (
    <div>
      {heroLoading ? <HeroSkeleton /> : <HeroSection hero={hero} />}

      <section className="border-b border-border">
        <div className="page-container py-10">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
              <Trophy className="size-5 text-primary" aria-hidden="true" />
              Agenda esportiva
            </h2>
            <Link
              to="/agenda"
              className="flex items-center gap-2 text-xs uppercase text-muted-foreground hover:text-primary"
            >
              Agenda completa <ArrowRight className="size-3" />
            </Link>
          </div>
          {loadingEvents ? (
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <ChannelCardSkeleton key={i} />
              ))}
            </div>
          ) : (
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {featuredEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="border-b border-border">
        <div className="page-container grid gap-8 py-9 lg:grid-cols-12">
          {loadingChannels ? (
            <div className="col-span-12 grid gap-4 lg:grid-cols-12">
              <div className="space-y-4 lg:col-span-8">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
              <div className="space-y-3 lg:col-span-4">
                <Skeleton className="h-6 w-28" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          ) : (
            <>
              <LiveNowSection channels={channels} />
              <ExploreSection categories={categories} channels={channels} />
            </>
          )}
        </div>
      </section>

      <section className="border-t border-border">
        <div className="page-container grid gap-8 py-10 lg:grid-cols-12">
          {loadingChannels ? (
            <div className="col-span-7 space-y-3">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : (
            <ScheduleSection channels={channels} />
          )}
          {loadingChannels ? (
            <div className="col-span-5 space-y-3">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : (
            <FeaturedChannelsSection channels={channels} />
          )}
        </div>
      </section>
    </div>
  );
}
