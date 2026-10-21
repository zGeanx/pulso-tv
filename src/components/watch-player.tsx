import { Check, ChevronDown, Link2, Maximize2, Minimize2, Share2 } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import type { ApiEmbed } from "@/lib/api";

interface WatchPlayerProps {
  title: string;
  embeds: ApiEmbed[];
  theaterMode?: boolean;
  onToggleTheater?: () => void;
}

const DEFAULT_IFRAME_ALLOW = "autoplay; fullscreen; picture-in-picture";

function optionLabel(embed: ApiEmbed) {
  const parts = [embed.provider, embed.quality].filter((part) => part.trim().length > 0);
  return parts.join(" · ");
}

function iframeAllow(embed: ApiEmbed): string {
  const extra = embed.allow?.trim();
  if (!extra) return DEFAULT_IFRAME_ALLOW;
  const seen = new Set<string>();
  const parts: string[] = [];
  for (const token of `${DEFAULT_IFRAME_ALLOW}; ${extra}`.split(";")) {
    const value = token.trim();
    if (!value) continue;
    const key = value.toLocaleLowerCase("en-US");
    if (seen.has(key)) continue;
    seen.add(key);
    parts.push(value);
  }
  return parts.join("; ");
}

async function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const field = document.createElement("textarea");
  field.value = value;
  field.setAttribute("readonly", "");
  field.style.position = "fixed";
  field.style.left = "-9999px";
  document.body.appendChild(field);
  field.select();
  document.execCommand("copy");
  document.body.removeChild(field);
}

export function WatchPlayer({ title, embeds, theaterMode, onToggleTheater }: WatchPlayerProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<"embed" | "share" | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const current = embeds[selectedIndex];

  useEffect(() => {
    function onPointer(event: MouseEvent) {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
      if (
        (event.key === "t" || event.key === "T") &&
        !["INPUT", "TEXTAREA"].includes((event.target as HTMLElement)?.tagName)
      ) {
        onToggleTheater?.();
      }
    }

    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onToggleTheater]);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(null), 1600);
    return () => window.clearTimeout(timer);
  }, [copied]);

  async function copyEmbed() {
    if (!current) return;
    await copyText(current.embed_url);
    setCopied("embed");
  }

  async function sharePage() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    await copyText(url);
    setCopied("share");
  }

  return (
    <div className="w-full">
      <div
        className={`relative overflow-hidden rounded-xl bg-black border border-border/80 shadow-2xl transition-all duration-300 ${
          theaterMode ? "aspect-video w-full max-h-[82vh] mx-auto" : "aspect-video w-full"
        }`}
      >
        {current ? (
          <iframe
            key={current.embed_url}
            src={current.embed_url}
            title={`${title} — ${optionLabel(current)}`}
            allow={iframeAllow(current)}
            allowFullScreen
            className="absolute inset-0 h-full w-full border-0"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Nenhuma fonte disponível
          </div>
        )}
      </div>

      {embeds.length > 0 && current && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div ref={boxRef} className="relative">
            <button
              type="button"
              aria-haspopup="listbox"
              aria-expanded={open}
              aria-controls={listId}
              aria-label="Escolher servidor de transmissão"
              onClick={() => setOpen((value) => !value)}
              className="inline-flex min-h-10 max-w-56 items-center justify-between gap-2.5 rounded-xl border border-border/80 bg-card/60 px-3 text-xs sm:text-sm transition-colors hover:border-primary hover:bg-card cursor-pointer shadow-sm"
            >
              <span className="truncate font-medium">{optionLabel(current)}</span>
              <ChevronDown
                className={`size-3.5 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
                aria-hidden="true"
              />
            </button>

            {open && (
              <ul
                id={listId}
                role="listbox"
                aria-label="Servidores de transmissão"
                className="absolute left-0 top-[calc(100%+0.35rem)] z-30 w-full min-w-48 overflow-hidden rounded-xl border border-border/80 bg-popover/95 backdrop-blur-md py-1.5 shadow-xl"
              >
                {embeds.map((embed, index) => {
                  const selected = index === selectedIndex;
                  return (
                    <li key={embed.embed_url} role="presentation">
                      <button
                        type="button"
                        role="option"
                        aria-selected={selected}
                        onClick={() => {
                          setSelectedIndex(index);
                          setOpen(false);
                        }}
                        className={`flex min-h-9 w-full items-center px-3 text-left text-xs sm:text-sm transition-colors cursor-pointer ${
                          selected
                            ? "bg-primary text-primary-foreground font-semibold"
                            : "text-muted-foreground hover:bg-accent hover:text-foreground"
                        }`}
                      >
                        <span className="truncate">{optionLabel(embed)}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onToggleTheater && (
              <button
                type="button"
                onClick={onToggleTheater}
                className={`inline-flex min-h-10 items-center gap-2 rounded-xl border px-3 text-xs transition-all cursor-pointer ${
                  theaterMode
                    ? "border-primary bg-primary/15 text-primary font-medium shadow-sm"
                    : "border-border/80 bg-card/60 text-muted-foreground hover:border-primary/50 hover:bg-card hover:text-foreground"
                }`}
                title={theaterMode ? "Sair do modo cinema [T]" : "Modo cinema [T]"}
              >
                {theaterMode ? (
                  <Minimize2 className="size-3.5" />
                ) : (
                  <Maximize2 className="size-3.5" />
                )}
                <span className="hidden sm:inline">
                  {theaterMode ? "Modo normal" : "Modo cinema"}
                </span>
                <span className="hidden rounded bg-background/80 px-1 py-0.2 text-[10px] font-mono text-muted-foreground lg:inline">
                  T
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={() => void copyEmbed()}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border/80 bg-card/60 px-3 text-xs text-muted-foreground transition-all hover:border-primary/50 hover:bg-card hover:text-foreground cursor-pointer shadow-sm"
            >
              {copied === "embed" ? (
                <Check className="size-3.5 text-primary" />
              ) : (
                <Link2 className="size-3.5" />
              )}
              {copied === "embed" ? "Copiado" : "Copiar embed"}
            </button>

            <button
              type="button"
              onClick={() => void sharePage()}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border/80 bg-card/60 px-3 text-xs text-muted-foreground transition-all hover:border-primary/50 hover:bg-card hover:text-foreground cursor-pointer shadow-sm"
            >
              {copied === "share" ? (
                <Check className="size-3.5 text-primary" />
              ) : (
                <Share2 className="size-3.5" />
              )}
              {copied === "share" ? "Link copiado" : "Compartilhar"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
