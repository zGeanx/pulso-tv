import type { ApiSportEvent } from "@/lib/api";
import { formatEventDay, formatEventTime } from "@/lib/api";
import { TeamCrest } from "@/components/team-crest";
import { cn } from "@/lib/utils";

export function MatchCover({
  event,
  size = "card",
  className,
}: {
  event: Pick<ApiSportEvent, "title" | "competition" | "teams" | "start_timestamp">;
  size?: "card" | "hero";
  className?: string;
}) {
  const day = formatEventDay(event);
  const time = formatEventTime(event);
  const when = day && day !== "Hoje" ? `${day} · ${time}` : time;
  const hero = size === "hero";

  return (
    <div
      className={cn(
        "relative flex aspect-video w-full flex-col justify-between overflow-hidden select-none",
        hero ? "p-5 sm:p-7 @container" : "p-3.5",
        className,
      )}
    >
      <img
        src="/match-pitch.webp"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
      />
      <div className="pointer-events-none absolute inset-0 bg-black/35" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/70 to-transparent" />

      <div className="relative z-10 min-h-5" />

      {event.teams ? (
        <div
          className={cn(
            "relative z-10 my-auto flex items-center justify-center",
            hero ? "gap-8 sm:gap-12 lg:gap-16" : "gap-5 sm:gap-8",
          )}
        >
          <TeamCrest
            name={event.teams.home.name}
            logo={event.teams.home.logo}
            logos={event.teams.home.logos}
            size="lg"
            className={
              hero
                ? "size-[clamp(6.5rem,58cqmin,16rem)]"
                : "h-16 w-16 sm:h-[5.5rem] sm:w-[5.5rem]"
            }
          />
          <span
            className={cn(
              "font-display font-bold text-white/70 drop-shadow-md",
              hero ? "text-[clamp(2rem,8cqmin,3.5rem)]" : "text-2xl sm:text-3xl",
            )}
          >
            ×
          </span>
          <TeamCrest
            name={event.teams.away.name}
            logo={event.teams.away.logo}
            logos={event.teams.away.logos}
            size="lg"
            className={
              hero
                ? "size-[clamp(6.5rem,58cqmin,16rem)]"
                : "h-16 w-16 sm:h-[5.5rem] sm:w-[5.5rem]"
            }
          />
        </div>
      ) : (
        <p
          className={cn(
            "relative z-10 my-auto line-clamp-2 text-center font-display font-bold text-white drop-shadow-md",
            hero ? "px-6 text-2xl sm:text-3xl" : "px-3 text-base",
          )}
        >
          {event.title}
        </p>
      )}

      <div className="relative z-10 flex items-center justify-between gap-3 pr-11 text-[11px] font-medium tracking-wide text-white/90 drop-shadow-sm">
        <span className="truncate uppercase">{event.competition}</span>
        <span className="shrink-0 font-display tabular-nums">{when}</span>
      </div>
    </div>
  );
}
