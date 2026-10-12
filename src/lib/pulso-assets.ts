export const PULSO_ORIGIN = "https://api.pulso-tv.online";
export const PULSO_LOGO_ROUTE = "/api/pulso/logo";

const LOGO_FILE = /^(teams|channels|flags)\/[a-z0-9][a-z0-9._+-]*\.(png|jpe?g|svg|webp)$/i;

/** `teams/alverca.png` when the value points at a Pulso catalog file. */
export function pulsoLogoFile(value: string): string | null {
  const raw = value.trim();
  if (!raw || raw.startsWith("data:")) return null;
  const pathname = logoPathname(raw);
  if (!pathname?.startsWith("/logos/")) return null;
  const file = pathname.slice("/logos/".length);
  return LOGO_FILE.test(file) ? file : null;
}

/**
 * The API sends `Cross-Origin-Resource-Policy: same-origin` on `/logos`.
 * Rewrite those files to the same-origin proxy so the browser can paint them.
 * Vite serves extension URLs itself, so the proxy path cannot end in `.png`.
 */
export function resolvePulsoAsset(value: string): string {
  const raw = value.trim();
  if (!raw || raw.startsWith("data:")) return raw;
  const file = pulsoLogoFile(raw);
  if (file) return `${PULSO_LOGO_ROUTE}?path=${encodeURIComponent(file)}`;
  if (raw.startsWith("//")) return `https:${raw}`;
  return raw;
}

export function isFlagLogo(url: string): boolean {
  return pulsoLogoFile(url)?.startsWith("flags/") ?? false;
}

function logoPathname(raw: string): string | null {
  if (raw.startsWith("/logos/")) return raw.split("?")[0] ?? raw;
  if (raw.startsWith(PULSO_LOGO_ROUTE)) {
    try {
      const path = new URL(raw, "https://pulso.local").searchParams.get("path");
      return path ? `/logos/${path}` : null;
    } catch {
      return null;
    }
  }
  const absolute = raw.startsWith("//") ? `https:${raw}` : raw;
  if (!/^https?:\/\//i.test(absolute)) return null;
  try {
    const url = new URL(absolute);
    if (url.origin !== PULSO_ORIGIN) return null;
    return url.pathname;
  } catch {
    return null;
  }
}
