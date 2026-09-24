import { useEffect, useRef, useState } from "react";
import { X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ApiEmbed } from "@/lib/api";

interface PlayerModalProps {
  title: string;
  embeds: ApiEmbed[];
  onClose: () => void;
}

export function PlayerModal({ title, embeds, onClose }: PlayerModalProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Trap focus / prevent body scroll
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, []);

  const current = embeds[selectedIndex];

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 px-4 backdrop-blur-xl"
      role="dialog"
      aria-modal="true"
      aria-label={`Assistir ${title}`}
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div className="flex w-full max-w-5xl flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">{title}</h2>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Fechar player">
            <X />
          </Button>
        </div>

        {/* Player */}
        <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
          {current ? (
            <iframe
              key={current.embed_url}
              src={current.embed_url}
              title={`${title} — ${current.provider}`}
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 h-full w-full border-0"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              Nenhuma fonte disponível
            </div>
          )}
        </div>

        {/* Server selector — only shown when there are multiple sources */}
        {embeds.length > 1 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <ChevronDown className="size-3" />
              Fonte:
            </span>
            {embeds.map((embed, i) => (
              <button
                key={embed.embed_url}
                onClick={() => setSelectedIndex(i)}
                className={`rounded border px-3 py-1 text-xs transition-colors ${
                  i === selectedIndex
                    ? "border-primary text-primary"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {embed.provider}
                <span className="ml-1 opacity-60">· {embed.quality}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
