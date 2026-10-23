import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Baby,
  BookOpen,
  ChevronLeft,
  ChevronRight,
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
import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { Button } from "@/components/ui/button";
import { EventCard } from "@/components/event-card";
import { MatchCover } from "@/components/match-cover";
import { MediaImage } from "@/components/media-image";
import { TeamCrest } from "@/components/team-crest";
import { Skeleton } from "@/components/ui/skeleton";
import { smoothHorizontalScroll, staggerEntrance } from "@/lib/motion";
import { headlineEvents, isWomensBroadcast } from "@/lib/agenda-rank";
import { useChannels, useChannelCategories, useSports } from "@/hooks/use-api";
import {
  formatEpgRange,
  formatEventDay,
  formatEventTime,
  epgProgress,
  getEventEffectiveStatus,
  isEventFinished,
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
  const activeEvents = headlineEvents(events).filter((event) => !isEventFinished(event));
  const withPlayer = activeEvents.filter((event) => event.embeds.length > 0);
  const pool = withPlayer.length > 0 ? withPlayer : activeEvents;
  const now = Date.now() / 1000;
  const nearest = (items: ApiSportEvent[]) =>
    [...items].sort(
      (a, b) => Math.abs(a.start_timestamp - now) - Math.abs(b.start_timestamp - now),
    );

  const live = nearest(pool.filter((event) => getEventEffectiveStatus(event) === "live"));
  if (live[0]) return live[0];

  const upcoming = nearest(pool.filter((event) => getEventEffectiveStatus(event) === "upcoming"));
  if (upcoming[0]) return upcoming[0];

  return channels.find((channel) => channel.embeds.length > 0) ?? channels[0];
}

function heroKicker(hero: ApiSportEvent | ApiChannel | undefined): string {
  if (!hero || !isSportEvent(hero)) return "Transmissão em destaque";
  const status = getEventEffectiveStatus(hero);
  if (status === "live") {
    return hero.category === "Futebol" ? "Futebol ao vivo" : "Esportes ao vivo";
  }
  if (status === "upcoming") {
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
    const isLive = getEventEffectiveStatus(event) === "live";
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

            <h1 className="mt-3 text-balance font-display text-3xl font-bold leading-tight sm:text-5xl sm:leading-none lg:text-6xl">
              {event.title}
            </h1>

            {event.teams && (
              <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
                <span className="flex items-center gap-2 rounded-full border border-border/70 bg-card/60 px-3 py-1.5 font-medium text-foreground shadow-xs">
                  <TeamCrest
                    name={event.teams.home.name}
                    logo={event.teams.home.logo}
                    logos={event.teams.home.logos}
                    className="h-5 w-5"
                  />
                  <span>{event.teams.home.name}</span>
                </span>
                <span className="font-display font-semibold text-muted-foreground/60">×</span>
                <span className="flex items-center gap-2 rounded-full border border-border/70 bg-card/60 px-3 py-1.5 font-medium text-foreground shadow-xs">
                  <TeamCrest
                    name={event.teams.away.name}
                    logo={event.teams.away.logo}
                    logos={event.teams.away.logos}
                    className="h-5 w-5"
                  />
                  <span>{event.teams.away.name}</span>
                </span>
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
              className="mt-8 w-fit gap-2 px-6 h-11 font-medium shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]"
              asChild={hasEmbeds}
              disabled={!hasEmbeds}
            >
              {hasEmbeds ? (
                <Link to="/evento/$eventId" params={{ eventId: event.id }}>
                  <Play className="size-4 fill-current" />
                  {isLive ? "Assistir agora" : "Abrir transmissão"}
                </Link>
              ) : (
                <>
                  <Play className="size-4 fill-current" />
                  {isLive ? "Assistir agora" : "Abrir transmissão"}
                </>
              )}
            </Button>
          </div>

          <div className="relative order-first self-start lg:order-none lg:col-span-7">
            {/* Ambient stadium glow */}
            <div
              className="pointer-events-none absolute -inset-2 rounded-2xl bg-gradient-to-tr from-primary/20 via-primary/5 to-transparent blur-2xl opacity-60"
              aria-hidden="true"
            />
            <div className="relative overflow-hidden rounded-xl border border-border/80 bg-card shadow-xl">
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
                  <span className="status-label border border-border bg-background/85 text-muted-foreground backdrop-blur-md">
                    {event.status === "upcoming" ? "EM BREVE" : "ENCERRADO"}
                  </span>
                )}
              </div>
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

        <div id="player" className="relative order-first self-start lg:order-none lg:col-span-7">
          {/* Ambient stadium glow */}
          <div
            className="pointer-events-none absolute -inset-2 rounded-2xl bg-gradient-to-tr from-primary/20 via-primary/5 to-transparent blur-2xl opacity-60"
            aria-hidden="true"
          />
          <div className="relative overflow-hidden rounded-xl border border-border/80 bg-card shadow-xl">
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
      </div>
    </section>
  );
}

const categoryStyles: Record<
  string,
  {
    gradient: string;
    borderHover: string;
    iconBg: string;
    badgeText?: string;
  }
> = {
  Esportes: {
    gradient: "from-emerald-500/15 via-emerald-500/5 to-transparent",
    borderHover: "hover:border-emerald-500/50 hover:shadow-emerald-950/30",
    iconBg: "bg-emerald-500/15 text-emerald-400 group-hover:bg-emerald-500/25",
    badgeText: "Mais assistido",
  },
  "Filmes e Séries": {
    gradient: "from-purple-500/15 via-purple-500/5 to-transparent",
    borderHover: "hover:border-purple-500/50 hover:shadow-purple-950/30",
    iconBg: "bg-purple-500/15 text-purple-400 group-hover:bg-purple-500/25",
  },
  Entretenimento: {
    gradient: "from-pink-500/15 via-pink-500/5 to-transparent",
    borderHover: "hover:border-pink-500/50 hover:shadow-pink-950/30",
    iconBg: "bg-pink-500/15 text-pink-400 group-hover:bg-pink-500/25",
  },
  Notícias: {
    gradient: "from-blue-500/15 via-blue-500/5 to-transparent",
    borderHover: "hover:border-blue-500/50 hover:shadow-blue-950/30",
    iconBg: "bg-blue-500/15 text-blue-400 group-hover:bg-blue-500/25",
  },
  "Canais Abertos": {
    gradient: "from-amber-500/15 via-amber-500/5 to-transparent",
    borderHover: "hover:border-amber-500/50 hover:shadow-amber-950/30",
    iconBg: "bg-amber-500/15 text-amber-400 group-hover:bg-amber-500/25",
  },
  Documentários: {
    gradient: "from-cyan-500/15 via-cyan-500/5 to-transparent",
    borderHover: "hover:border-cyan-500/50 hover:shadow-cyan-950/30",
    iconBg: "bg-cyan-500/15 text-cyan-400 group-hover:bg-cyan-500/25",
  },
  Infantil: {
    gradient: "from-orange-500/15 via-orange-500/5 to-transparent",
    borderHover: "hover:border-orange-500/50 hover:shadow-orange-950/30",
    iconBg: "bg-orange-500/15 text-orange-400 group-hover:bg-orange-500/25",
  },
};

function LiveNowSection({ channels }: { channels: ApiChannel[] }) {
  const sorted = pickLiveNow(
    channels.filter((channel) => !isWomensBroadcast(channel.epg?.current?.title ?? "")),
    3,
  );

  return (
    <div className="lg:col-span-7">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
          <RadioTower className="size-5 text-primary" aria-hidden="true" />
          Ao vivo agora
        </h2>
        <Link
          to="/canais"
          search={{ categoria: "Esportes" }}
          className="flex items-center gap-1.5 text-xs uppercase text-muted-foreground hover:text-primary transition-colors"
        >
          Ver todos <ArrowRight className="size-3" />
        </Link>
      </div>
      <div className="mt-2 divide-y divide-border/60">
        {sorted.map((item) => (
          <Link
            key={item.id}
            to="/canal/$channelId"
            params={{ channelId: item.id }}
            className="group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 py-3.5 px-3 -mx-3 rounded-xl transition-all duration-200 hover:bg-card/50"
          >
            <div className="logo-box h-12 w-20 shrink-0 sm:h-14 sm:w-24 group-hover:border-primary/40 transition-colors">
              <MediaImage
                src={item.logo_url}
                alt={item.name}
                className="h-full w-full bg-transparent"
                imgClassName="logo-box-img"
              />
            </div>
            <div className="min-w-0">
              <h3 className="truncate font-display text-base font-medium sm:text-lg group-hover:text-primary transition-colors">
                {item.epg?.current?.title ?? item.name}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {item.name} · {item.category}
              </p>
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground sm:flex">
              <span className="hidden tabular-nums sm:inline font-display text-xs">
                {item.epg?.current ? formatEpgRange(item.epg.current) : ""}
              </span>
              <span className="status-label status-live text-[10px]">
                <span className="live-dot" />
                <span className="hidden sm:inline">AO VIVO</span>
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

  const sorted = [...categories].sort((a, b) => (counts[b.name] ?? 0) - (counts[a.name] ?? 0));

  const mainCategory = sorted[0];
  const otherCategories = sorted.slice(1);

  return (
    <aside className="lg:col-span-5">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
          <Compass className="size-5 text-primary" aria-hidden="true" />
          Categorias
        </h2>
        <Link
          to="/canais"
          className="flex items-center gap-1.5 text-xs uppercase text-muted-foreground hover:text-primary transition-colors"
        >
          Ver catálogo <ArrowRight className="size-3" />
        </Link>
      </div>

      <div className="mt-3.5 grid grid-cols-2 gap-2.5">
        {mainCategory &&
          (() => {
            const Icon = categoryIcons[mainCategory.name] ?? Tv;
            const style = categoryStyles[mainCategory.name] ?? {
              gradient: "from-primary/15 via-primary/5 to-transparent",
              borderHover: "hover:border-primary/50",
              iconBg: "bg-primary/15 text-primary",
              badgeText: "Destaque",
            };
            const count = counts[mainCategory.name] ?? 0;

            return (
              <Link
                key={mainCategory.name}
                to="/canais"
                search={{ categoria: mainCategory.name }}
                className={`group col-span-2 relative flex items-center justify-between overflow-hidden rounded-xl border border-border/80 bg-card/60 bg-gradient-to-r ${style.gradient} p-3 sm:p-3.5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${style.borderHover}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/60 transition-colors ${style.iconBg}`}
                  >
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-display text-sm sm:text-base font-semibold group-hover:text-primary transition-colors">
                        {mainCategory.name}
                      </span>
                      <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-emerald-400">
                        {style.badgeText ?? "Destaque"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {count} canais disponíveis ao vivo
                    </p>
                  </div>
                </div>
                <div className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-background/60 text-muted-foreground transition-all duration-200 group-hover:border-primary/50 group-hover:text-primary group-hover:translate-x-0.5">
                  <ArrowRight className="size-3.5" />
                </div>
              </Link>
            );
          })()}

        {otherCategories.map((cat) => {
          const Icon = categoryIcons[cat.name] ?? Tv;
          const style = categoryStyles[cat.name] ?? {
            gradient: "from-card/60 to-card/30",
            borderHover: "hover:border-primary/50",
            iconBg: "bg-card/80 text-muted-foreground",
          };
          const count = counts[cat.name] ?? 0;

          return (
            <Link
              key={cat.name}
              to="/canais"
              search={{ categoria: cat.name }}
              className={`group relative flex flex-col justify-between overflow-hidden rounded-xl border border-border/70 bg-card/50 bg-gradient-to-br ${style.gradient} p-2.5 sm:p-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${style.borderHover}`}
            >
              <div className="flex items-start justify-between gap-2">
                <span
                  className={`flex size-7 sm:size-8 shrink-0 items-center justify-center rounded-lg border border-border/60 transition-colors ${style.iconBg}`}
                >
                  <Icon className="size-3.5 sm:size-4" aria-hidden="true" />
                </span>
                <span className="font-display text-[11px] tabular-nums text-muted-foreground group-hover:text-foreground">
                  {count} {count === 1 ? "canal" : "canais"}
                </span>
              </div>
              <div className="mt-2.5 flex items-center justify-between">
                <span className="truncate text-xs sm:text-sm font-medium text-foreground/90 group-hover:text-primary transition-colors">
                  {cat.name}
                </span>
                <ArrowRight className="size-3 text-muted-foreground/30 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-primary" />
              </div>
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
          className="flex items-center gap-1.5 text-xs uppercase text-muted-foreground hover:text-primary transition-colors"
        >
          Todos os esportes <ArrowRight className="size-3" />
        </Link>
      </div>
      <div className="mt-2 divide-y divide-border/60">
        {featured.map((channel) => (
          <Link
            key={channel.id}
            to="/canal/$channelId"
            params={{ channelId: channel.id }}
            className="group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3.5 py-3.5 px-3 -mx-3 rounded-xl text-sm transition-all duration-200 hover:bg-card/50"
          >
            <div className="logo-box h-10 w-16 group-hover:border-primary/40 transition-colors">
              <MediaImage
                src={channel.logo_url}
                alt={channel.name}
                className="h-full w-full bg-transparent"
                imgClassName="logo-box-img"
              />
            </div>
            <span className="min-w-0">
              <strong className="block truncate font-medium group-hover:text-primary transition-colors">
                {channel.name}
              </strong>
              <small className="text-muted-foreground">
                {isWomensBroadcast(channel.epg?.current?.title ?? "")
                  ? channel.category
                  : (channel.epg?.current?.title ?? channel.category)}
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
      <div className="mt-2 divide-y divide-border/60">
        {scheduleItems.map((channel) => {
          const current = channel.epg?.current;
          if (!current || isWomensBroadcast(current.title)) return null;
          const progress = epgProgress(current);
          return (
            <Link
              key={channel.id}
              to="/canal/$channelId"
              params={{ channelId: channel.id }}
              className="group grid grid-cols-[5.5rem_minmax(0,1fr)_auto] items-center gap-4 py-3.5 px-3 -mx-3 rounded-xl text-sm transition-all duration-200 hover:bg-card/50"
            >
              <span className="font-display tabular-nums text-muted-foreground text-xs sm:text-sm">
                {formatEpgRange(current)}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-medium group-hover:text-primary transition-colors">
                  {current.title}
                </span>
                <span className="mt-1.5 block h-1 max-w-44 rounded-full bg-foreground/10 overflow-hidden">
                  <span
                    className="block h-full rounded-full bg-live transition-all"
                    style={{ width: `${progress * 100}%` }}
                  />
                </span>
              </span>
              <span className="text-xs text-muted-foreground shrink-0">{channel.name}</span>
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

function ChannelCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={className ?? "border-b border-border pb-5"}>
      <Skeleton className="aspect-video w-full" />
      <Skeleton className="mt-3 h-5 w-2/3" />
      <Skeleton className="mt-2 h-4 w-1/2" />
    </div>
  );
}

function SportsAgendaSection({ events, loading }: { events: ApiSportEvent[]; loading: boolean }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: -1 | 1) => {
    smoothHorizontalScroll(scrollRef.current, direction * 560);
  };

  return (
    <section className="border-b border-border">
      <div className="page-container py-8 sm:py-10">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
            <Trophy className="size-5 text-primary" aria-hidden="true" />
            Agenda esportiva
          </h2>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5">
              <Button
                variant="outline"
                size="icon"
                className="size-8 rounded-full border-border/80 bg-card/60 hover:bg-card hover:border-primary/50 text-muted-foreground hover:text-foreground cursor-pointer"
                onClick={() => scroll(-1)}
                aria-label="Rolar para esquerda"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="size-8 rounded-full border-border/80 bg-card/60 hover:bg-card hover:border-primary/50 text-muted-foreground hover:text-foreground cursor-pointer"
                onClick={() => scroll(1)}
                aria-label="Rolar para direita"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
            <Link
              to="/agenda"
              className="flex items-center gap-1.5 text-xs uppercase text-muted-foreground hover:text-primary transition-colors"
            >
              Agenda completa <ArrowRight className="size-3" />
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="mt-6 flex gap-4 overflow-x-auto scrollbar-none pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="w-[82vw] max-w-[320px] shrink-0 sm:w-[280px] lg:w-[320px]">
                <ChannelCardSkeleton className="min-w-0 border-b-0 pb-0" />
              </div>
            ))}
          </div>
        ) : (
          <div
            ref={scrollRef}
            className="mt-6 flex gap-5 overflow-x-auto scrollbar-none pb-2 -mx-4 px-4 sm:mx-0 sm:px-0"
          >
            {events.map((event) => (
              <div
                key={event.id}
                className="sports-card-item w-[82vw] max-w-[320px] shrink-0 sm:w-[280px] lg:w-[320px]"
              >
                <EventCard event={event} className="min-w-0 border-b-0 pb-0" />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function Index() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { data: channels = [], isLoading: loadingChannels } = useChannels();
  const { data: events = [], isLoading: loadingEvents } = useSports();
  const { data: categories = [] } = useChannelCategories();

  const hero = pickHero(events, channels);
  const heroLoading = loadingChannels || loadingEvents;
  const featuredEvents = pickFeaturedEvents(events, 8);

  useGSAP(
    () => {
      if (!containerRef.current) return;
      if (!loadingEvents && featuredEvents.length > 0) {
        const carouselCards = containerRef.current.querySelectorAll(".sports-card-item");
        if (carouselCards.length > 0) {
          staggerEntrance(Array.from(carouselCards).slice(0, 8), {
            y: 12,
            stagger: 0.03,
            duration: 0.3,
          });
        }
      }
    },
    { scope: containerRef, dependencies: [loadingEvents, featuredEvents.length] },
  );

  return (
    <div ref={containerRef}>
      {heroLoading ? <HeroSkeleton /> : <HeroSection hero={hero} />}

      <SportsAgendaSection events={featuredEvents} loading={loadingEvents} />

      <section className="border-b border-border">
        <div className="page-container grid gap-8 py-9 lg:grid-cols-12">
          {loadingChannels ? (
            <div className="col-span-12 grid gap-4 lg:grid-cols-12">
              <div className="space-y-4 lg:col-span-7">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
              <div className="space-y-3 lg:col-span-5">
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
