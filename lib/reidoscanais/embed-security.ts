import type { Embed } from "./types";

export const EMBED_ALLOW =
  "autoplay; encrypted-media; picture-in-picture; fullscreen";
export const EMBED_SANDBOX =
  "allow-scripts allow-same-origin allow-presentation allow-storage-access-by-user-activation";
export const EMBED_REFERRER_POLICY = "no-referrer" as const;

const PULSO_SITE_HOSTNAME = "pulso-tv-ao-vivo.zgeanx.chatgpt.site";
const DEFAULT_EMBED_HOSTS = ["esportesembed.net", "rdcanais.net"];
const unsandboxedEmbedHosts = new Set(DEFAULT_EMBED_HOSTS);
const configuredEmbedHosts = (
  (process.env.NEXT_PUBLIC_ALLOWED_EMBED_HOSTS ?? "")
    .split(",")
    .map(normalizeHostname)
    .filter(isValidConfiguredHostname)
);
const allowedEmbedHosts = new Set([
  ...DEFAULT_EMBED_HOSTS,
  ...configuredEmbedHosts,
]);

export const EMBED_FRAME_CSP = `frame-src ${[...allowedEmbedHosts]
  .flatMap((hostname) => [
    `https://${hostname}`,
    `https://*.${hostname}`,
  ])
  .join(" ")}`;

function normalizeHostname(hostname: string) {
  return hostname.trim().toLowerCase().replace(/\.+$/, "");
}

function isValidConfiguredHostname(hostname: string) {
  return (
    hostname.includes(".") &&
    !isIpLiteral(hostname) &&
    /^[a-z0-9.-]+$/.test(hostname) &&
    !hostname.startsWith(".") &&
    !hostname.includes("..")
  );
}

function isIpLiteral(hostname: string) {
  return hostname.includes(":") || /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname);
}

function isBlockedHostname(hostname: string) {
  return (
    !hostname.includes(".") ||
    isIpLiteral(hostname) ||
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    hostname === PULSO_SITE_HOSTNAME ||
    hostname.endsWith(`.${PULSO_SITE_HOSTNAME}`)
  );
}

function isConfiguredHost(hostname: string) {
  return [...allowedEmbedHosts].some(
    (allowed) => hostname === allowed || hostname.endsWith(`.${allowed}`),
  );
}

export function sanitizeEmbedUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.length === 0 || value.length > 2048) {
    return null;
  }

  try {
    const url = new URL(value);
    const hostname = normalizeHostname(url.hostname);

    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.port ||
      isBlockedHostname(hostname) ||
      !isConfiguredHost(hostname)
    ) {
      return null;
    }

    url.hostname = hostname;
    return url.toString();
  } catch {
    return null;
  }
}

export function sanitizeEmbeds(value: unknown): Embed[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((candidate) => {
    if (!candidate || typeof candidate !== "object") return [];

    const source = candidate as Record<string, unknown>;
    const embedUrl = sanitizeEmbedUrl(source.embed_url);
    if (!embedUrl) return [];

    return [
      {
        provider:
          typeof source.provider === "string" ? source.provider : "Player",
        quality: typeof source.quality === "string" ? source.quality : "HD",
        embed_url: embedUrl,
      },
    ];
  });
}

export function requiresUnsandboxedEmbed(value: unknown) {
  const safeUrl = sanitizeEmbedUrl(value);
  if (!safeUrl) return false;

  const hostname = normalizeHostname(new URL(safeUrl).hostname);
  return [...unsandboxedEmbedHosts].some(
    (trusted) => hostname === trusted || hostname.endsWith(`.${trusted}`),
  );
}

export function escapeHtmlAttribute(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function buildEmbedMarkup(embedUrl: unknown, title: string) {
  const safeUrl = sanitizeEmbedUrl(embedUrl);
  if (!safeUrl) return null;

  // The approved providers reject every iframe that has a sandbox attribute.
  // Only built-in hosts receive this compatibility exception; configured hosts
  // remain sandboxed. The URL allowlist and frame-src CSP are mandatory controls.
  const sandboxAttribute = requiresUnsandboxedEmbed(safeUrl)
    ? ""
    : ` sandbox="${EMBED_SANDBOX}"`;

  return `<iframe src="${escapeHtmlAttribute(safeUrl)}" title="${escapeHtmlAttribute(title)}" width="100%" height="100%" frameborder="0" allowfullscreen allow="${EMBED_ALLOW}"${sandboxAttribute} referrerpolicy="${EMBED_REFERRER_POLICY}"></iframe>`;
}
