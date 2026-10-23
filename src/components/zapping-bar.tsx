import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, RadioTower } from "lucide-react";
import { useRef } from "react";
import { MediaImage } from "@/components/media-image";
import { Button } from "@/components/ui/button";
import { smoothHorizontalScroll } from "@/lib/motion";
import type { ApiChannel } from "@/lib/api";

interface ZappingBarProps {
  currentChannelId: string;
  channels: ApiChannel[];
  category?: string;
}

export function ZappingBar({ currentChannelId, channels, category }: ZappingBarProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Filtra canais relevantes (mesma categoria ou com EPG ativo), limitando a 16
  const pool = category ? channels.filter((ch) => ch.category === category) : channels;
  const displayChannels = pool.slice(0, 16);

  const scroll = (direction: -1 | 1) => {
    smoothHorizontalScroll(scrollRef.current, direction * 420);
  };

  if (displayChannels.length <= 1) return null;

  return (
    <div className="mt-6 rounded-2xl border border-border/80 bg-card/40 p-4 shadow-sm">
      <div className="flex items-center justify-between pb-3 border-b border-border/40">
        <div className="flex items-center gap-2">
          <RadioTower className="size-4 text-primary" aria-hidden="true" />
          <span className="font-display text-sm font-semibold text-foreground">Zapping rápido</span>
          {category && <span className="text-xs text-muted-foreground">· {category}</span>}
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="icon"
            className="size-7 rounded-full border-border/80 bg-card/60 hover:bg-card hover:border-primary/50 text-muted-foreground hover:text-foreground cursor-pointer"
            onClick={() => scroll(-1)}
            aria-label="Rolar canais para esquerda"
          >
            <ChevronLeft className="size-3.5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-7 rounded-full border-border/80 bg-card/60 hover:bg-card hover:border-primary/50 text-muted-foreground hover:text-foreground cursor-pointer"
            onClick={() => scroll(1)}
            aria-label="Rolar canais para direita"
          >
            <ChevronRight className="size-3.5" />
          </Button>
        </div>
      </div>

      <div ref={scrollRef} className="mt-3 flex gap-3 overflow-x-auto scrollbar-none pb-1">
        {displayChannels.map((channel) => {
          const isCurrent = channel.id === currentChannelId;
          const currentProgram = channel.epg?.current?.title;

          return (
            <Link
              key={channel.id}
              to="/canal/$channelId"
              params={{ channelId: channel.id }}
              className={`group flex items-center gap-3 shrink-0 rounded-xl border p-2.5 transition-all duration-200 min-w-[210px] max-w-[240px] ${
                isCurrent
                  ? "border-primary bg-primary/10 shadow-sm"
                  : "border-border/70 bg-card/60 hover:border-primary/40 hover:bg-card hover:-translate-y-0.5"
              }`}
            >
              <div className="logo-box h-8 w-12 shrink-0 border border-border/60 bg-background/80">
                <MediaImage
                  src={channel.logo_url}
                  alt={channel.name}
                  className="h-full w-full bg-transparent"
                  imgClassName="logo-box-img p-0.5"
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <span
                    className={`truncate font-display text-xs font-semibold ${isCurrent ? "text-primary" : "text-foreground group-hover:text-primary transition-colors"}`}
                  >
                    {channel.name}
                  </span>
                  {isCurrent && (
                    <span className="shrink-0 rounded-full bg-primary/20 px-1.5 py-0.2 text-[9px] font-semibold text-primary">
                      No ar
                    </span>
                  )}
                </div>
                <p className="truncate text-[11px] text-muted-foreground mt-0.5">
                  {currentProgram ?? channel.category}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
