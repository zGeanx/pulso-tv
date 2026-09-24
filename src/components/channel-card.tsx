import { Play } from "lucide-react";
import { useState } from "react";
import type { ApiChannel } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { PlayerModal } from "@/components/player-modal";

export function ChannelCard({ channel }: { channel: ApiChannel }) {
  const [playerOpen, setPlayerOpen] = useState(false);
  const hasEmbeds = channel.embeds.length > 0;
  const program = channel.epg?.current?.title ?? null;
  const nextProgram = channel.epg?.next?.title ?? null;

  return (
    <>
      <article className="group min-w-0 border-b border-border pb-5">
        <div className="relative aspect-video overflow-hidden rounded-md bg-card">
          {/* Channel logo centered on a dark backdrop */}
          <div className="flex h-full w-full items-center justify-center bg-card p-6">
            <img
              src={channel.logo_url}
              alt={channel.name}
              loading="lazy"
              width={200}
              height={120}
              className="max-h-20 w-auto object-contain transition-transform duration-300 group-hover:scale-[1.04]"
            />
          </div>

          <div className="absolute left-3 top-3 flex items-center gap-2">
            {/* All channels in the API are always live/streaming */}
            <span className="status-label status-live">
              <span className="live-dot" />
              LIVE
            </span>
          </div>

          {hasEmbeds && (
            <Button
              variant="broadcast"
              size="icon"
              aria-label={`Assistir ${channel.name}`}
              className="absolute bottom-3 right-3 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
              onClick={() => setPlayerOpen(true)}
            >
              <Play />
            </Button>
          )}
        </div>

        <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] gap-3">
          <div className="min-w-0">
            <h3 className="truncate font-display font-semibold">{channel.name}</h3>
            {program && <p className="truncate text-sm text-muted-foreground">{program}</p>}
          </div>
          {nextProgram && (
            <span
              className="pt-1 font-display text-xs text-muted-foreground"
              title={`A seguir: ${nextProgram}`}
            >
              ↑ {nextProgram}
            </span>
          )}
        </div>

        <p className="mt-2 text-xs text-muted-foreground">{channel.category}</p>
      </article>

      {playerOpen && (
        <PlayerModal
          title={channel.name}
          embeds={channel.embeds}
          onClose={() => setPlayerOpen(false)}
        />
      )}
    </>
  );
}
