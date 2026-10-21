import { Link } from "@tanstack/react-router";
import { Play } from "lucide-react";
import type { ApiChannel } from "@/lib/api";
import { epgProgress, formatEpgRange } from "@/lib/api";
import { MediaImage } from "@/components/media-image";

export function ChannelCard({ channel }: { channel: ApiChannel }) {
  const program = channel.epg?.current;
  const nextProgram = channel.epg?.next?.title ?? null;
  const cover = program?.image ?? null;
  const progress = program ? epgProgress(program) : 0;
  const range = program ? formatEpgRange(program) : "";

  return (
    <article className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-border/80 bg-card/60 transition-all duration-200 hover:-translate-y-1 hover:border-primary/50 hover:bg-card/90 hover:shadow-xl hover:shadow-black/30">
      <Link
        to="/canal/$channelId"
        params={{ channelId: channel.id }}
        className="flex h-full flex-col justify-between min-w-0"
      >
        <div className="relative aspect-video w-full overflow-hidden bg-background/50 border-b border-border/40">
          {cover ? (
            <>
              <MediaImage
                src={cover}
                alt={program?.title || channel.name}
                className="absolute inset-0 bg-background transition-transform duration-300 group-hover:scale-105"
                imgClassName="object-contain"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
              <div className="logo-box absolute bottom-2.5 left-2.5 h-8 w-14 border border-border/80 bg-background/90 backdrop-blur-md shadow-sm">
                <MediaImage
                  src={channel.logo_url}
                  alt={channel.name}
                  className="h-full w-full bg-transparent"
                  imgClassName="logo-box-img p-0.5"
                />
              </div>
            </>
          ) : (
            <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-gradient-to-br from-card via-card/90 to-background/60 p-6">
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="h-24 w-24 rounded-full bg-primary/10 blur-xl transition-all duration-300 group-hover:scale-125 group-hover:bg-primary/20" />
              </div>
              <MediaImage
                src={channel.logo_url}
                alt={channel.name}
                className="relative z-10 h-14 w-full max-w-[9rem] bg-transparent transition-transform duration-300 group-hover:scale-105"
                imgClassName="object-contain drop-shadow-md"
                fallback={
                  <div className="flex flex-col items-center justify-center gap-1 text-center">
                    <span className="font-display text-base font-bold text-foreground/90">
                      {channel.name}
                    </span>
                    <span className="text-[11px] text-muted-foreground">{channel.category}</span>
                  </div>
                }
              />
            </div>
          )}

          {program && (
            <div className="absolute left-2.5 top-2.5 z-20">
              <span className="status-label status-live text-[10px] shadow-sm">
                <span className="live-dot" />
                AO VIVO
              </span>
            </div>
          )}

          {/* Desktop play affordance */}
          <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-black/30 opacity-0 backdrop-blur-[1px] transition-all duration-200 group-hover:opacity-100">
            <span className="flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-transform duration-200 scale-90 group-hover:scale-100">
              <Play className="size-5 fill-current ml-0.5" aria-hidden="true" />
            </span>
          </div>

          {program && (
            <div className="absolute inset-x-0 bottom-0 z-20 h-1 bg-background/60">
              <div
                className="h-full bg-live transition-all"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col justify-between p-3.5 sm:p-4">
          <div>
            <div className="flex items-center justify-between gap-2">
              <h3 className="truncate font-display text-sm sm:text-base font-semibold text-foreground group-hover:text-primary transition-colors">
                {channel.name}
              </h3>
              <span className="shrink-0 rounded-md bg-secondary/70 px-2 py-0.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                {channel.category}
              </span>
            </div>
            <p className="mt-1.5 truncate text-xs sm:text-sm text-foreground/90 font-medium">
              {program?.title ?? "Transmissão contínua"}
            </p>
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-border/40 pt-2 text-[11px] text-muted-foreground">
            <span className="font-display tabular-nums">{range || "Sinal 24h"}</span>
            {nextProgram ? (
              <span
                className="truncate max-w-[130px] text-muted-foreground/80"
                title={`A seguir: ${nextProgram}`}
              >
                A seguir: {nextProgram}
              </span>
            ) : (
              <span className="text-muted-foreground/60">{channel.category}</span>
            )}
          </div>
        </div>
      </Link>
    </article>
  );
}
