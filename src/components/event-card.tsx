import { Link } from "@tanstack/react-router";
import { Play } from "lucide-react";
import type { ApiSportEvent } from "@/lib/api";
import { eventChannelNames, formatEventDay, formatEventRelative, formatEventTime } from "@/lib/api";
import { MatchCover } from "@/components/match-cover";
import { MediaImage } from "@/components/media-image";
import { TeamCrest } from "@/components/team-crest";

const STATUS_BADGE: Record<ApiSportEvent["status"], { label: string; live?: boolean }> = {
  live: { label: "AO VIVO", live: true },
  upcoming: { label: "EM BREVE" },
  finished: { label: "ENCERRADO" },
};

export function EventCard({ event }: { event: ApiSportEvent }) {
  const badge = STATUS_BADGE[event.status];
  const day = formatEventDay(event);
  const time = formatEventTime(event);
  const relative = formatEventRelative(event);
  const channels = eventChannelNames(event);
  const footerLine = channels.length > 0 ? channels.join(" · ") : event.category;

  return (
    <article className="min-w-0 border-b border-border pb-5">
      <Link to="/evento/$eventId" params={{ eventId: event.id }} className="group block min-w-0">
        <div className="relative aspect-video overflow-hidden rounded-md bg-card">
          {event.poster ? (
            <>
              <img
                src={event.poster}
                alt=""
                aria-hidden="true"
                referrerPolicy="no-referrer"
                loading="lazy"
                decoding="async"
                className="pointer-events-none absolute inset-0 h-full w-full scale-110 object-cover opacity-45 blur-xl"
              />
              <MediaImage
                src={event.poster}
                alt={event.title}
                className="absolute inset-0 bg-transparent"
                imgClassName="object-contain"
                fallback={<MatchCover event={event} className="h-full w-full" />}
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/70 via-transparent to-transparent" />
            </>
          ) : (
            <MatchCover event={event} className="h-full w-full" />
          )}

          <div className="absolute left-3 top-3">
            {badge.live ? (
              <span className="status-label status-live">
                <span className="live-dot" />
                {badge.label}
              </span>
            ) : (
              <span className="status-label">{badge.label}</span>
            )}
          </div>

          {event.embeds.length > 0 && (
            <span className="absolute bottom-3 right-3 z-20 inline-flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
              <Play className="size-4" aria-hidden="true" />
            </span>
          )}
        </div>

        <div className="mt-3 flex min-w-0 items-start gap-3">
          {event.teams ? (
            <div className="flex shrink-0 items-center gap-1.5 pt-0.5">
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
          <div className="min-w-0">
            <h3 className="truncate font-display font-semibold">{event.title}</h3>
            <p className="truncate text-sm text-muted-foreground">{event.competition}</p>
            <p className="mt-1 font-display text-xs tabular-nums text-muted-foreground">
              {time}
              {day && day !== "Hoje" ? ` · ${day}` : ""}
              {relative ? ` · ${relative}` : ""}
            </p>
            <p className="mt-2 truncate text-xs text-muted-foreground">{footerLine}</p>
          </div>
        </div>
      </Link>
    </article>
  );
}
