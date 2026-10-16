import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

function initials(label: string): string {
  const parts = label.trim().split(/\s+/).filter(Boolean);
  const first = parts[0];
  const second = parts[1];
  if (!first) return "·";
  if (!second) return first.slice(0, 2).toUpperCase();
  return `${first[0] ?? ""}${second[0] ?? ""}`.toUpperCase();
}

function listedSources(src: string | readonly string[] | null | undefined): string[] {
  const values = typeof src === "string" ? [src] : (src ?? []);
  return values.map((item) => item.trim()).filter((item) => item.length > 0);
}

interface MediaImageProps {
  src?: string | readonly string[] | null;
  alt: string;
  className?: string;
  imgClassName?: string;
  fallbackLabel?: string;
  fallback?: ReactNode;
  eager?: boolean;
}

export function MediaImage({
  src,
  alt,
  className,
  imgClassName,
  fallbackLabel,
  fallback,
  eager = false,
}: MediaImageProps) {
  const sources = listedSources(src);
  const sourceKey = sources.join("\0");
  const [index, setIndex] = useState(0);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    sources.length > 0 ? "loading" : "error",
  );

  useEffect(() => {
    setIndex(0);
    setStatus(sources.length > 0 ? "loading" : "error");
  }, [sourceKey, sources.length]);

  const current = sources[index] ?? "";
  const label = fallbackLabel ?? alt;

  function showReady() {
    setStatus("ready");
  }

  function showNext() {
    setIndex((value) => {
      const next = value + 1;
      if (next < sources.length) {
        setStatus("loading");
        return next;
      }
      setStatus("error");
      return value;
    });
  }

  return (
    <div className={cn("relative overflow-hidden bg-card", className)}>
      {status === "loading" && <div className="absolute inset-0 animate-pulse bg-muted" />}
      {status === "error" || !current ? (
        (fallback ?? (
          <div className="absolute inset-0 flex items-center justify-center font-display text-xs font-semibold text-muted-foreground">
            {initials(label)}
          </div>
        ))
      ) : (
        <img
          key={current}
          ref={(node) => {
            if (!node?.complete) return;
            if (node.naturalWidth > 0) showReady();
            else showNext();
          }}
          src={current}
          alt={alt}
          referrerPolicy="no-referrer"
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          onLoad={(event) => {
            if (event.currentTarget.naturalWidth > 0) showReady();
          }}
          onError={showNext}
          className={cn(
            "h-full w-full object-contain",
            status !== "ready" && "opacity-0",
            imgClassName,
          )}
        />
      )}
    </div>
  );
}
