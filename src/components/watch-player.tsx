import { Check, ChevronDown, Link2, Share2 } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import type { ApiEmbed } from "@/lib/api";

interface WatchPlayerProps {
  title: string;
  embeds: ApiEmbed[];
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

export function WatchPlayer({ title, embeds }: WatchPlayerProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<"embed" | "share" | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const current = embeds[selectedIndex];

  useEffect(() => {
    if (!open) return;

    function onPointer(event: MouseEvent) {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

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
    <div>
      <div className="relative aspect-video overflow-hidden rounded-lg bg-black">
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
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <div ref={boxRef} className="relative">
            <button
              type="button"
              aria-haspopup="listbox"
              aria-expanded={open}
              aria-controls={listId}
              aria-label="Escolher servidor de transmissão"
              onClick={() => setOpen((value) => !value)}
              className="inline-flex min-h-10 max-w-52 items-center justify-between gap-2 rounded-md border border-border bg-card px-2.5 text-xs sm:text-sm transition-colors hover:border-primary"
            >
              <span className="truncate">{optionLabel(current)}</span>
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
                className="absolute left-0 top-[calc(100%+0.35rem)] z-20 w-full min-w-44 overflow-hidden rounded-md border border-border bg-popover py-1 shadow-lg"
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
                        className={`flex min-h-9 w-full items-center px-2.5 text-left text-xs sm:text-sm transition-colors ${
                          selected
                            ? "bg-primary text-primary-foreground font-medium"
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
            <button
              type="button"
              onClick={() => void copyEmbed()}
              className="inline-flex min-h-11 items-center gap-2 rounded-md border border-border px-3 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary"
            >
              {copied === "embed" ? <Check className="size-3.5" /> : <Link2 className="size-3.5" />}
              {copied === "embed" ? "Copiado" : "Copiar embed"}
            </button>
            <button
              type="button"
              onClick={() => void sharePage()}
              className="inline-flex min-h-11 items-center gap-2 rounded-md border border-border px-3 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary"
            >
              {copied === "share" ? <Check className="size-3.5" /> : <Share2 className="size-3.5" />}
              {copied === "share" ? "Link copiado" : "Compartilhar"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
