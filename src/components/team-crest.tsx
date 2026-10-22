import { MediaImage } from "@/components/media-image";
import { cn } from "@/lib/utils";

const SIZES = {
  sm: "h-11 w-11",
  md: "h-12 w-12",
  lg: "h-16 w-16",
} as const;

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0];
  const second = parts[1];
  if (!first) return "·";
  if (!second) return first.slice(0, 2).toUpperCase();
  return `${first[0] ?? ""}${second[0] ?? ""}`.toUpperCase();
}

function crestHue(name: string): number {
  let hash = 0;
  for (const char of name) hash = (hash * 33 + char.charCodeAt(0)) >>> 0;
  return hash % 360;
}

function CrestFallback({ name }: { name: string }) {
  return (
    <div
      className="absolute inset-0 flex items-center justify-center rounded-full font-display text-[0.65rem] font-semibold text-white"
      style={{ background: `oklch(0.55 0.12 ${crestHue(name)})` }}
    >
      {initials(name)}
    </div>
  );
}

export function TeamCrest({
  name,
  logo,
  logos,
  size = "sm",
  className,
}: {
  name: string;
  logo?: string | undefined;
  logos?: readonly string[] | undefined;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const sources = logos && logos.length > 0 ? logos : logo ? [logo] : [];
  return (
    <div className={cn("crest-box", SIZES[size], className)}>
      <MediaImage
        src={sources}
        alt={name}
        className="h-full w-full overflow-hidden bg-transparent"
        imgClassName="crest-img"
        fallback={<CrestFallback name={name} />}
      />
    </div>
  );
}
