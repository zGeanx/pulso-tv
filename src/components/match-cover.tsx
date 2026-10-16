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
        hero ? "p-5 sm:p-7" : "p-3.5",
        className,
      )}
      style={{
        background:
          "radial-gradient(circle at 18% 22%, oklch(0.32 0.055 154 / 0.55), transparent 55%), radial-gradient(circle at 82% 78%, oklch(0.28 0.04 154 / 0.45), transparent 55%), linear-gradient(145deg, oklch(0.18 0.012 150), oklch(0.235 0.016 152) 52%, oklch(0.165 0.01 150))",
      }}
    >
      <div className="min-h-5" />

      {event.teams ? (
        <div
          className={cn(
            "my-auto flex items-center justify-center",
            hero ? "gap-6 sm:gap-10" : "gap-4 sm:gap-6",
          )}
        >
          <TeamCrest
            name={event.teams.home.name}
            logo={event.teams.home.logo}
            logos={event.teams.home.logos}
            size={hero ? "lg" : "md"}
            className={hero ? "sm:h-20 sm:w-20" : "sm:h-14 sm:w-14"}
          />
          <span
            className={cn(
              "font-display font-bold text-white/45",
              hero ? "text-3xl sm:text-4xl" : "text-xl sm:text-2xl",
            )}
          >
            ×
          </span>
          <TeamCrest
            name={event.teams.away.name}
            logo={event.teams.away.logo}
            logos={event.teams.away.logos}
            size={hero ? "lg" : "md"}
            className={hero ? "sm:h-20 sm:w-20" : "sm:h-14 sm:w-14"}
          />
        </div>
      ) : (
        <p
          className={cn(
            "my-auto line-clamp-2 text-center font-display font-bold text-white/90",
            hero ? "px-6 text-2xl sm:text-3xl" : "px-3 text-base",
          )}
        >
          {event.title}
        </p>
      )}

      <div className="relative z-10 flex items-center justify-between gap-3 pr-11 text-[11px] font-medium tracking-wide text-white/75">
        <span className="truncate uppercase">{event.competition}</span>
        <span className="shrink-0 font-display tabular-nums text-white/85">{when}</span>
      </div>
    </div>
  );
}
