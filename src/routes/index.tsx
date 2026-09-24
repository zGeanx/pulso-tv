import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Baby,
  BookOpen,
  Clapperboard,
  Clock3,
  Compass,
  Loader2,
  Newspaper,
  Play,
  RadioTower,
  Trophy,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChannelCard } from "@/components/channel-card";
import { PlayerModal } from "@/components/player-modal";
import { useChannels, useSports } from "@/hooks/use-api";
import { SPORT_STATUS_LABEL, formatEventTime } from "@/lib/api";
import type { ApiChannel, ApiSportEvent } from "@/lib/api";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Pulso TV — TV aberta e ao vivo" },
      {
        name: "description",
        content: "Assista canais, programas e eventos esportivos ao vivo no Pulso TV.",
      },
      { property: "og:title", content: "Pulso TV — TV aberta e ao vivo" },
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

const categoryIcons = {
  Esportes: Trophy,
  Notícias: Newspaper,
  "Filmes e Séries": Clapperboard,
  Infantil: Baby,
  Documentários: BookOpen,
} as const;

const EXPLORE_CATEGORIES = Object.keys(categoryIcons) as (keyof typeof categoryIcons)[];

// ─── Type guard ───────────────────────────────────────────────────────────────

function isSportEvent(hero: ApiSportEvent | ApiChannel): hero is ApiSportEvent {
  return "competition" in hero;
}

// ─── Hero selection logic ─────────────────────────────────────────────────────

function pickHero(
  events: ApiSportEvent[],
  channels: ApiChannel[],
): ApiSportEvent | ApiChannel | undefined {
  // 1. Live football
  const liveFutebol = events.find((e) => e.status === "live" && e.category === "Futebol");
  if (liveFutebol) return liveFutebol;

  // 2. Any live sport
  const liveSport = events.find((e) => e.status === "live");
  if (liveSport) return liveSport;

  // 3. Upcoming football
  const upcomingFutebol = events.find((e) => e.status === "upcoming" && e.category === "Futebol");
  if (upcomingFutebol) return upcomingFutebol;

  // 4. Any upcoming sport
  const upcomingSport = events.find((e) => e.status === "upcoming");
  if (upcomingSport) return upcomingSport;

  // 5. Fallback: channel with embeds
  return channels.find((ch) => ch.embeds.length > 0) ?? channels[0];
}

// ─── Kicker label ─────────────────────────────────────────────────────────────

function heroKicker(hero: ApiSportEvent | ApiChannel | undefined): string {
  if (!hero || !isSportEvent(hero)) return "Transmissão em destaque";
  if (hero.category === "Futebol") return "Futebol ao vivo";
  return "Esportes ao vivo";
}

// ─── Strip markdown asterisks ─────────────────────────────────────────────────

function stripMarkdown(text: string): string {
  return text.replace(/\*/g, "");
}

// ─── HeroSection ─────────────────────────────────────────────────────────────

interface HeroSectionProps {
  hero: ApiSportEvent | ApiChannel | undefined;
}

function HeroSection({ hero }: HeroSectionProps) {
  const [playerOpen, setPlayerOpen] = useState(false);
  const playerEmbedUrl = import.meta.env["VITE_PLAYER_EMBED_URL"] as string | undefined;

  const kicker = heroKicker(hero);

  if (hero && isSportEvent(hero)) {
    const event = hero;
    const isLive = event.status === "live";
    const hasEmbeds = event.embeds.length > 0;
    const description = event.description
      ? stripMarkdown(event.description).slice(0, 150)
      : null;

    return (
      <section className="border-b border-border">
        <div className="mx-auto grid max-w-screen-2xl gap-8 px-4 py-8 md:px-8 lg:grid-cols-12 lg:py-12">
          {/* Left — info */}
          <div className="flex flex-col lg:col-span-5">
            <div className="flex items-center gap-3 text-xs font-medium uppercase tracking-widest text-primary">
              {isLive && <span className="live-dot" />}
              {kicker}
            </div>

            <p className="mt-4 text-sm font-medium uppercase tracking-wider text-muted-foreground">
              {event.competition}
            </p>

            <h1 className="mt-3 text-balance font-display text-5xl font-bold leading-none sm:text-6xl lg:text-7xl">
              {event.title}
            </h1>

            {/* Team crests */}
            {event.teams && (
              <div className="mt-5 flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-card p-1">
                  <img
                    src={event.teams.home.logo}
                    alt={event.teams.home.name}
                    width={48}
                    height={48}
                    className="h-full w-full object-contain"
                  />
                </div>
                <span className="font-display text-lg font-semibold text-muted-foreground">×</span>
                <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-card p-1">
                  <img
                    src={event.teams.away.logo}
                    alt={event.teams.away.name}
                    width={48}
                    height={48}
                    className="h-full w-full object-contain"
                  />
                </div>
              </div>
            )}

            {description && (
              <p className="mt-5 max-w-md text-pretty text-muted-foreground">{description}</p>
            )}

            <div className="mt-4 flex flex-wrap gap-x-4 text-xs uppercase text-muted-foreground">
              <span>{formatEventTime(event.start_time)}</span>
              <span>/</span>
              {isLive ? (
                <span className="text-primary">Ao vivo</span>
              ) : (
                <span>Em breve</span>
              )}
            </div>

            <Button
              variant="broadcast"
              size="lg"
              className="mt-8 w-fit"
              onClick={() => (hasEmbeds ? setPlayerOpen(true) : undefined)}
              disabled={!hasEmbeds}
            >
              <Play />
              Assistir agora
            </Button>
          </div>

          {/* Right — poster */}
          <div className="relative overflow-hidden rounded-lg lg:col-span-7">
            {event.poster ? (
              <img
                src={event.poster}
                alt={event.title}
                className="aspect-[16/10] h-full w-full object-cover"
              />
            ) : event.teams ? (
              <div className="flex aspect-[16/10] h-full w-full items-center justify-center gap-10 rounded-lg bg-card">
                <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-background/50 p-2">
                  <img
                    src={event.teams.home.logo}
                    alt={event.teams.home.name}
                    width={96}
                    height={96}
                    className="h-full w-full object-contain"
                  />
                </div>
                <span className="font-display text-4xl font-bold text-muted-foreground">×</span>
                <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-background/50 p-2">
                  <img
                    src={event.teams.away.logo}
                    alt={event.teams.away.name}
                    width={96}
                    height={96}
                    className="h-full w-full object-contain"
                  />
                </div>
              </div>
            ) : (
              <div className="aspect-[16/10] h-full w-full rounded-lg bg-card" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
            <div className="absolute left-4 top-4">
              {isLive ? (
                <span className="status-label status-live">
                  <span className="live-dot" />
                  AO VIVO
                </span>
              ) : (
                <span className="status-label border border-border bg-background/80 text-muted-foreground">
                  EM BREVE
                </span>
              )}
            </div>
          </div>
        </div>

        {hasEmbeds && playerOpen && (
          <PlayerModal
            title={event.title}
            embeds={event.embeds}
            onClose={() => setPlayerOpen(false)}
          />
        )}
      </section>
    );
  }

  // ─── Fallback: channel hero (original behaviour) ──────────────────────────

  const channel = hero as ApiChannel | undefined;
  const featuredProgram = channel?.epg?.current?.title ?? "Ao vivo";
  const featuredNext = channel?.epg?.next?.title;

  return (
    <section className="border-b border-border">
      <div className="mx-auto grid max-w-screen-2xl gap-8 px-4 py-8 md:px-8 lg:grid-cols-12 lg:py-12">
        <div className="flex flex-col lg:col-span-5">
          <div className="flex items-center gap-3 text-xs font-medium uppercase tracking-widest text-primary">
            <span className="live-dot" />
            {kicker}
          </div>
          <h1 className="mt-6 text-balance font-display text-5xl font-bold leading-none sm:text-6xl lg:text-7xl">
            {featuredProgram}
          </h1>
          {channel && (
            <p className="mt-5 max-w-md text-pretty text-muted-foreground">
              {channel.epg?.current?.description ?? `Transmissão ao vivo em ${channel.name}`}
            </p>
          )}
          {channel && (
            <div className="mt-4 flex flex-wrap gap-x-4 text-xs uppercase text-muted-foreground">
              <span>{channel.name}</span>
              <span>/</span>
              <span>{channel.epg?.current?.formatted_time?.slice(0, 5) ?? ""}</span>
              <span className="text-primary">/ Ao vivo</span>
            </div>
          )}
          <Button
            variant="broadcast"
            size="lg"
            className="mt-8 w-fit"
            onClick={() => (channel?.embeds.length ? setPlayerOpen(true) : undefined)}
            asChild={!channel?.embeds.length}
          >
            {channel?.embeds.length ? (
              <>
                <Play />
                Assistir agora
              </>
            ) : (
              <a href="#player">
                <Play />
                Assistir agora
              </a>
            )}
          </Button>
          {featuredNext && (
            <p className="mt-auto border-t border-border pt-5 text-xs text-muted-foreground lg:mt-10">
              A seguir · {featuredNext}
            </p>
          )}
        </div>

        <div id="player" className="relative overflow-hidden rounded-lg lg:col-span-7">
          {playerEmbedUrl ? (
            <iframe
              src={playerEmbedUrl}
              title="Transmissão ao vivo Pulso TV"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              className="aspect-[16/10] h-full w-full border-0 bg-black"
            />
          ) : channel?.logo_url ? (
            <div className="flex aspect-[16/10] h-full w-full items-center justify-center rounded-lg bg-card">
              <img
                src={channel.logo_url}
                alt={channel.name}
                width={320}
                height={180}
                className="max-h-32 w-auto object-contain"
              />
            </div>
          ) : (
            <div className="aspect-[16/10] h-full w-full rounded-lg bg-card" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background/65 via-transparent to-transparent" />
          <div className="absolute left-4 top-4 status-label status-live">
            <span className="live-dot" />
            AO VIVO
          </div>
        </div>
      </div>

      {channel?.embeds.length && playerOpen && (
        <PlayerModal
          title={channel.name}
          embeds={channel.embeds}
          onClose={() => setPlayerOpen(false)}
        />
      )}
    </section>
  );
}

// ─── LiveNowSection ───────────────────────────────────────────────────────────

function LiveNowSection({ channels }: { channels: ApiChannel[] }) {
  const sportChannels = channels.filter((ch) => ch.category === "Esportes");
  const otherChannels = channels.filter((ch) => ch.category !== "Esportes");
  const sorted = [...sportChannels, ...otherChannels].slice(0, 3);

  return (
    <div className="lg:col-span-8">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
          <RadioTower className="size-5 text-primary" aria-hidden="true" />
          Ao vivo agora
        </h2>
        <Link
          to="/canais"
          className="flex items-center gap-1.5 text-xs uppercase text-muted-foreground hover:text-primary"
        >
          Ver todos <ArrowRight className="size-3" />
        </Link>
      </div>
      <div className="divide-y divide-border">
        {sorted.map((item) => (
          <div
            key={item.id}
            className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 py-4"
          >
            <div className="flex h-14 w-24 items-center justify-center rounded-md bg-card p-2">
              <img
                src={item.logo_url}
                alt={item.name}
                loading="lazy"
                width={96}
                height={54}
                className="max-h-10 w-auto object-contain"
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
              <span>{item.epg?.current?.formatted_time?.slice(0, 5) ?? ""}</span>
              <span className="flex items-center gap-2 text-primary">
                <span className="live-dot" />
                AO VIVO
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── ExploreSection ───────────────────────────────────────────────────────────

function ExploreSection() {
  return (
    <aside className="lg:col-span-4">
      <div className="border-b border-border pb-3">
        <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
          <Compass className="size-5 text-primary" aria-hidden="true" />
          Explorar
        </h2>
      </div>
      <div className="divide-y divide-border">
        {EXPLORE_CATEGORIES.map((cat) => {
          const Icon = categoryIcons[cat];
          return (
            <Link
              key={cat}
              to="/canais"
              search={{ categoria: cat }}
              className="flex items-center justify-between py-3.5 text-sm hover:text-primary"
            >
              <span className="flex items-center gap-3">
                <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
                {cat}
              </span>
            </Link>
          );
        })}
      </div>
    </aside>
  );
}

// ─── SportsSection ────────────────────────────────────────────────────────────

const STATUS_ORDER: Record<string, number> = { live: 0, upcoming: 1, finished: 2 };

function SportsSection({ events }: { events: ApiSportEvent[] }) {
  const [playerEvent, setPlayerEvent] = useState<ApiSportEvent | null>(null);

  const sorted = [...events].sort(
    (a, b) => (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99),
  );

  return (
    <>
      <div className="lg:col-span-5">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
            <Trophy className="size-5 text-primary" aria-hidden="true" />
            Agenda esportiva
          </h2>
          <Link
            to="/agenda"
            className="flex items-center gap-1.5 text-xs uppercase text-muted-foreground hover:text-primary"
          >
            Agenda completa <ArrowRight className="size-3" />
          </Link>
        </div>
        <div className="divide-y divide-border">
          {sorted.slice(0, 4).map((event) => (
            <div
              key={event.id}
              className="grid grid-cols-[3.5rem_minmax(0,1fr)_auto] gap-3 py-4 text-sm"
            >
              <span className="font-display text-primary">{formatEventTime(event.start_time)}</span>
              <span className="min-w-0">
                {event.teams ? (
                  <strong className="flex items-center gap-1.5 truncate font-medium">
                    <img
                      src={event.teams.home.logo}
                      alt={event.teams.home.name}
                      width={24}
                      height={24}
                      className="h-6 w-6 object-contain"
                    />
                    <span className="truncate">{event.title}</span>
                    <img
                      src={event.teams.away.logo}
                      alt={event.teams.away.name}
                      width={24}
                      height={24}
                      className="h-6 w-6 object-contain"
                    />
                  </strong>
                ) : (
                  <strong className="block truncate font-medium">{event.title}</strong>
                )}
                <small className="text-muted-foreground">{event.competition}</small>
              </span>
              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                {event.status === "live" && (
                  <span className="status-label status-live text-[10px]">
                    <span className="live-dot" />
                    Ao vivo
                  </span>
                )}
                {event.embeds.length > 0 && (
                  <button
                    onClick={() => setPlayerEvent(event)}
                    aria-label={`Assistir ${event.title}`}
                    className="text-primary hover:underline"
                  >
                    <Play className="size-3.5" />
                  </button>
                )}
              </span>
            </div>
          ))}
        </div>
      </div>

      {playerEvent && (
        <PlayerModal
          title={playerEvent.title}
          embeds={playerEvent.embeds}
          onClose={() => setPlayerEvent(null)}
        />
      )}
    </>
  );
}

// ─── ScheduleSection ──────────────────────────────────────────────────────────

function ScheduleSection({ channels }: { channels: ApiChannel[] }) {
  const scheduleItems = channels.slice(0, 4).flatMap((ch) => {
    const items: { time: string; name: string; channel: string }[] = [];
    if (ch.epg?.current) {
      items.push({
        time: ch.epg.current.formatted_time.slice(0, 5) || "—",
        name: ch.epg.current.title,
        channel: ch.name,
      });
    }
    return items;
  });

  return (
    <div className="lg:col-span-7">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
          <Clock3 className="size-5 text-primary" aria-hidden="true" />
          Programação · agora
        </h2>
      </div>
      <div className="divide-y divide-border">
        {scheduleItems.map(({ time, name, channel }) => (
          <div
            key={`${channel}-${time}`}
            className="grid grid-cols-[4rem_minmax(0,1fr)_auto] gap-4 py-3.5 text-sm"
          >
            <span className="font-display text-muted-foreground">{time}</span>
            <span>{name}</span>
            <span className="text-xs text-muted-foreground">{channel}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Index ────────────────────────────────────────────────────────────────────

function Index() {
  const { data: channels = [], isLoading: loadingChannels } = useChannels({ limit: 12 });
  const { data: events = [], isLoading: loadingEvents } = useSports({ limit: 10 });

  const hero = pickHero(events, channels);
  const heroLoading = loadingChannels || loadingEvents;

  return (
    <div>
      {/* Hero */}
      {heroLoading ? (
        <section className="flex h-[60vh] items-center justify-center border-b border-border">
          <Loader2 className="size-8 animate-spin text-primary" aria-label="Carregando" />
        </section>
      ) : (
        <HeroSection hero={hero} />
      )}

      {/* Live now + Explore */}
      <section className="border-b border-border">
        <div className="mx-auto grid max-w-screen-2xl gap-8 px-4 py-9 md:px-8 lg:grid-cols-12">
          {loadingChannels ? (
            <div className="col-span-12 flex justify-center py-10">
              <Loader2 className="size-6 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <LiveNowSection channels={channels} />
              <ExploreSection />
            </>
          )}
        </div>
      </section>

      {/* Featured channel cards */}
      <section className="mx-auto max-w-screen-2xl px-4 py-10 md:px-8">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
            <Clapperboard className="size-5 text-primary" aria-hidden="true" />
            Canais em destaque
          </h2>
          <Link
            to="/canais"
            className="flex items-center gap-2 text-xs uppercase text-muted-foreground hover:text-primary"
          >
            Catálogo completo <ArrowRight className="size-3" />
          </Link>
        </div>
        {loadingChannels ? (
          <div className="mt-6 flex justify-center">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {channels.slice(0, 4).map((channel) => (
              <ChannelCard key={channel.id} channel={channel} />
            ))}
          </div>
        )}
      </section>

      {/* Schedule + Sports */}
      <section className="border-t border-border">
        <div className="mx-auto grid max-w-screen-2xl gap-8 px-4 py-10 md:px-8 lg:grid-cols-12">
          {loadingChannels ? (
            <div className="col-span-7 flex justify-center py-10">
              <Loader2 className="size-6 animate-spin text-primary" />
            </div>
          ) : (
            <ScheduleSection channels={channels} />
          )}
          {loadingEvents ? (
            <div className="col-span-5 flex justify-center py-10">
              <Loader2 className="size-6 animate-spin text-primary" />
            </div>
          ) : (
            <SportsSection events={events} />
          )}
        </div>
      </section>
    </div>
  );
}
