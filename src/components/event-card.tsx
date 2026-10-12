import { Link } from "@tanstack/react-router";
import { Play } from "lucide-react";
import type { ApiSportEvent } from "@/lib/api";
import { formatEventDay, formatEventTime } from "@/lib/api";
import { MediaImage } from "@/components/media-image";

const STATUS_BADGE: Record<ApiSportEvent["status"], { label: string; live?: boolean }> = {
  live: { label: "AO VIVO", live: true },
  upcoming: { label: "EM BREVE" },
  finished: { label: "ENCERRADO" },
};

export function EventCard({ event }: { event: ApiSportEvent }) {
  const badge = STATUS_BADGE[event.status];
  const day = formatEventDay(event);
  const time = formatEventTime(event);

  return (
    <article className="min-w-0 border-b border-border pb-5">
      <Link to="/evento/$eventId" params={{ eventId: event.id }} className="group block min-w-0">
        <div className="relative aspect-video overflow-hidden rounded-md bg-card">
          {event.poster ? (
            <>
              <MediaImage
                src={event.poster}
                alt={event.title}
                className="absolute inset-0 bg-background"
                imgClassName="object-contain"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/70 via-transparent to-transparent" />
            </>
          ) : event.teams ? (
            <div className="flex h-full w-full items-center justify-center gap-6 bg-card">
              <div className="logo-box h-16 w-16">
                <MediaImage
                  src={event.teams.home.logo}
                  alt={event.teams.home.name}
                  className="h-full w-full bg-transparent"
                  imgClassName="logo-box-img"
                />
              </div>
              <span className="font-display text-2xl font-semibold text-muted-foreground">×</span>
              <div className="logo-box h-16 w-16">
                <MediaImage
                  src={event.teams.away.logo}
                  alt={event.teams.away.name}
                  className="h-full w-full bg-transparent"
                  imgClassName="logo-box-img"
                />
              </div>
            </div>
          ) : (
            <div className="h-full w-full bg-card" />
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
            <span className="absolute bottom-3 right-3 inline-flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
              <Play className="size-4" aria-hidden="true" />
            </span>
          )}
        </div>

        <div className="mt-3 min-w-0">
          <h3 className="truncate font-display font-semibold">{event.title}</h3>
          <p className="truncate text-sm text-muted-foreground">{event.competition}</p>
          <p className="mt-1 font-display text-xs tabular-nums text-muted-foreground">
            {time}
            {day && day !== "Hoje" ? ` · ${day}` : ""}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">{event.category}</p>
        </div>
      </Link>
    </article>
  );
}
