import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

function initials(label: string): string {
  const parts = label.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "·";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

interface MediaImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  imgClassName?: string;
  fallbackLabel?: string;
  eager?: boolean;
}

export function MediaImage({
  src,
  alt,
  className,
  imgClassName,
  fallbackLabel,
  eager = false,
}: MediaImageProps) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">(src ? "loading" : "error");

  useEffect(() => {
    setStatus(src ? "loading" : "error");
  }, [src]);

  const label = fallbackLabel ?? alt;

  return (
    <div className={cn("relative overflow-hidden bg-card", className)}>
      {status === "loading" && <div className="absolute inset-0 animate-pulse bg-muted" />}
      {status === "error" || !src ? (
        <div className="absolute inset-0 flex items-center justify-center font-display text-xs font-semibold text-muted-foreground">
          {initials(label)}
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          referrerPolicy="no-referrer"
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          onLoad={() => setStatus("ready")}
          onError={() => setStatus("error")}
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
