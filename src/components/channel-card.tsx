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
    <article className="min-w-0 border-b border-border pb-5 transition-transform active:scale-[0.98]">
      <Link
        to="/canal/$channelId"
        params={{ channelId: channel.id }}
        className="group block min-w-0"
      >
        <div className="relative aspect-video overflow-hidden rounded-md bg-card">
          {cover ? (
            <>
              <MediaImage
                src={cover}
                alt={program?.title || channel.name}
                className="absolute inset-0 bg-background"
                imgClassName="object-contain"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/70 via-transparent to-transparent" />
              <div className="logo-box absolute bottom-3 left-3 h-10 w-16">
                <MediaImage
                  src={channel.logo_url}
                  alt={channel.name}
                  className="h-full w-full bg-transparent"
                  imgClassName="logo-box-img p-0.5"
                />
              </div>
            </>
          ) : (
            <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-gradient-to-br from-card via-card/90 to-muted/40 p-6">
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="h-24 w-24 rounded-full bg-primary/10 blur-xl" />
              </div>
              <MediaImage
                src={channel.logo_url}
                alt={channel.name}
                className="relative z-10 h-16 w-full max-w-[10rem] bg-transparent"
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
            <div className="absolute left-3 top-3 z-20">
              <span className="status-label status-live">
                <span className="live-dot" />
                AO VIVO
              </span>
            </div>
          )}

          {channel.embeds.length > 0 && (
            <span className="absolute bottom-3 right-3 z-20 inline-flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
              <Play className="size-4" aria-hidden="true" />
            </span>
          )}

          {program && (
            <div className="absolute inset-x-0 bottom-0 z-20 h-0.5 bg-foreground/15">
              <div className="h-full bg-live" style={{ width: `${progress * 100}%` }} />
            </div>
          )}
        </div>

        <div className="mt-3 min-w-0">
          <h3 className="truncate font-display font-semibold">{channel.name}</h3>
          {program?.title && (
            <p className="truncate text-sm text-muted-foreground">{program.title}</p>
          )}
          {range && <p className="mt-1 font-display text-xs tabular-nums text-muted-foreground">{range}</p>}
          {nextProgram && (
            <p className="mt-1 truncate text-xs text-muted-foreground" title={`A seguir: ${nextProgram}`}>
              A seguir: {nextProgram}
            </p>
          )}
          <p className="mt-2 text-xs text-muted-foreground">{channel.category}</p>
        </div>
      </Link>
    </article>
  );
}
