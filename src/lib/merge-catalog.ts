import type { ApiChannel, ApiEmbed, ApiSportEvent, ApiSportStatus } from "@/lib/api";
import { resolvePulsoAsset } from "@/lib/pulso-assets";
import { isPlaceholderLogo, type PulsoEmbedSource, type PulsoMatch } from "@/lib/pulso-api";
import { registerTeamLogosFromEvents, resolveTeamLogo } from "@/lib/team-logos";

export const PULSO_ID_PREFIX = "pulso-";

const SAO_PAULO_OFFSET = "-03:00";

const TEAM_ALIASES = new Map<string, string>([
  ["vasco", "vasco da gama"],
  ["athletico", "athletico pr"],
  ["athletico paranaense", "athletico pr"],
  ["atletico paranaense", "athletico pr"],
  ["atletico pr", "athletico pr"],
  ["atletico mineiro", "atletico mg"],
  ["america mineiro", "america mg"],
  ["atletico goianiense", "atletico go"],
  ["bragantino", "red bull bragantino"],
  ["rb bragantino", "red bull bragantino"],
  ["gremio novorizontino", "novorizontino"],
  ["sport recife", "sport"],
  ["botafogo fr", "botafogo"],
  ["botafogo rj", "botafogo"],
]);

export interface MergeSportResult {
  events: ApiSportEvent[];
  absorbed: Map<number, string>;
}

export interface MergeChannelResult {
  channels: ApiChannel[];
  absorbed: Map<string, string>;
}

interface MergeOptions {
  includeUnmatched?: boolean;
  now?: number;
}

interface PreparedMatch {
  source: PulsoMatch;
  day: string;
  unix: number;
  pair: string;
  home: string;
  away: string;
}

interface PreparedEvent {
  event: ApiSportEvent;
  day: string;
  pair: string;
  home: string;
  away: string;
}

export function pulsoId(slug: string): string {
  return `${PULSO_ID_PREFIX}${slug}`;
}

export function pulsoSlug(id: string): string | null {
  if (!id.startsWith(PULSO_ID_PREFIX)) return null;
  const slug = id.slice(PULSO_ID_PREFIX.length);
  return safeSlug(slug);
}

export function eventSearchBlob(event: ApiSportEvent): string {
  return `${event.title} ${event.competition} ${event.category} ${event.teams?.home.name ?? ""} ${event.teams?.away.name ?? ""}`.toLocaleLowerCase(
    "pt-BR",
  );
}

export function mergeSportEvents(
  reidosEvents: ApiSportEvent[],
  pulsoMatches: PulsoMatch[],
  options: MergeOptions = {},
): MergeSportResult {
  registerTeamLogosFromEvents(reidosEvents);
  const includeUnmatched = options.includeUnmatched !== false;
  const now = options.now ?? Date.now();
  const available = pulsoMatches.flatMap((match) => {
    const prepared = prepareMatch(match);
    return prepared ? [prepared] : [];
  });
  const consumed = new Set<number>();
  const absorbed = new Map<number, string>();

  const events = reidosEvents.map((event) => {
    const prepared = prepareEvent(event);
    const exact = available.find(
      (match) =>
        !consumed.has(match.source.id) &&
        match.pair.length > 0 &&
        match.pair === prepared.pair &&
        match.day === prepared.day,
    );
    const chosen = exact ?? findIncomplete(prepared, available, consumed);
    const playable =
      chosen != null &&
      isPlayable(chosen.source.channelTitle || "Player", chosen.source.url, "embed");
    if (!chosen || !playable) return presentEvent(event, null);
    consumed.add(chosen.source.id);
    return applyPulso(event, chosen, now, absorbed);
  });

  if (!includeUnmatched) {
    return { events: withoutDisneyOnly(events), absorbed };
  }

  const extras: ApiSportEvent[] = [];
  for (const match of available) {
    if (consumed.has(match.source.id) || !match.away || !match.pair) continue;
    const label = match.source.channelTitle || "Player";
    if (!isPlayable(label, match.source.url, "embed")) continue;
    const event = toPulsoEvent(match, now);
    absorbed.set(match.source.id, event.id);
    extras.push(event);
  }
  extras.sort((a, b) => a.start_timestamp - b.start_timestamp);

  return { events: withoutDisneyOnly([...events, ...extras]), absorbed };
}

export function mergeChannelLists(
  reidosChannels: ApiChannel[],
  pulsoEmbeds: PulsoEmbedSource[],
  options: MergeOptions = {},
): MergeChannelResult {
  const includeUnmatched = options.includeUnmatched !== false;
  const absorbed = new Map<string, string>();
  const extrasByKey = new Map<string, PulsoEmbedSource[]>();

  for (const embed of pulsoEmbeds) {
    if (!embed.active || !safeSlug(embed.slug)) continue;
    if (!isPlayable(embed.title || embed.slug, embed.url, embed.type)) continue;
    const key = canonicalChannel(embed.title || embed.slug);
    if (!key) continue;
    const group = extrasByKey.get(key);
    if (group) group.push(embed);
    else extrasByKey.set(key, [embed]);
  }

  const usedKeys = new Set<string>();
  const channels = reidosChannels.map((channel) => {
    const key = canonicalChannel(channel.name);
    const extras = key && !usedKeys.has(key) ? extrasByKey.get(key) : undefined;
    if (key && extras) {
      usedKeys.add(key);
      for (const extra of extras) absorbed.set(extra.slug, channel.id);
    }
    return {
      ...channel,
      embeds: presentChannelEmbeds(channel.name, channel.embeds, extras ?? []),
    };
  });

  if (!includeUnmatched) return { channels, absorbed };

  const unmatched: ApiChannel[] = [];
  for (const embed of pulsoEmbeds) {
    if (absorbed.has(embed.slug)) continue;
    const channel = toPulsoChannel(embed);
    if (!channel) continue;
    absorbed.set(embed.slug, channel.id);
    unmatched.push(channel);
  }
  unmatched.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  return { channels: [...channels, ...unmatched], absorbed };
}

function prepareMatch(match: PulsoMatch): PreparedMatch | null {
  if (!match.active || match.status === "cancelled" || !safeSlug(match.slug)) return null;
  const kickoff = parseKickoff(match.kickoff_at);
  if (!kickoff) return null;
  const home = canonicalTeam(match.home_team);
  if (!home) return null;
  const away = canonicalTeam(match.away_team);
  return {
    source: match,
    day: kickoff.day,
    unix: kickoff.unix,
    pair: away ? pairKey(home, away) : "",
    home,
    away,
  };
}

function prepareEvent(event: ApiSportEvent): PreparedEvent {
  const names = eventTeamNames(event);
  const home = names ? canonicalTeam(names.home) : "";
  const away = names ? canonicalTeam(names.away) : "";
  return {
    event,
    day: saoPauloDay(event.start_timestamp),
    pair: home && away ? pairKey(home, away) : "",
    home,
    away,
  };
}

function findIncomplete(
  event: PreparedEvent,
  available: PreparedMatch[],
  consumed: Set<number>,
): PreparedMatch | null {
  if (!event.home || !event.away) return null;
  const candidates = available.filter((match) => {
    if (consumed.has(match.source.id) || match.away || match.day !== event.day) return false;
    const hitsHome = match.home === event.home;
    const hitsAway = match.home === event.away;
    if (!hitsHome && !hitsAway) return false;
    const other = hitsHome ? event.away : event.home;
    const blob = normalizeLabel(`${match.source.competition} ${match.source.title}`);
    return tokensOverlap(other, blob);
  });
  return candidates.length === 1 ? (candidates[0] ?? null) : null;
}

function applyPulso(
  event: ApiSportEvent,
  match: PreparedMatch,
  nowMs: number,
  absorbed: Map<number, string>,
): ApiSportEvent {
  const pulsoStatus = mapPulsoStatus(match.source.status, match.unix, nowMs);
  const status: ApiSportStatus =
    event.status === "upcoming" && pulsoStatus === "live" ? "live" : event.status;
  absorbed.set(match.source.id, event.id);
  return presentEvent(status === event.status ? event : { ...event, status }, {
    title: match.source.channelTitle || "Player",
    url: match.source.url,
    allow: match.source.allow,
  });
}

function presentEvent(
  event: ApiSportEvent,
  replacement: { title: string; url: string; allow: string } | null,
): ApiSportEvent {
  return { ...event, embeds: presentEventEmbeds(event.embeds, replacement) };
}

function toPulsoEvent(match: PreparedMatch, nowMs: number): ApiSportEvent {
  const home = match.source.home_team.trim();
  const away = match.source.away_team.trim();
  const slug = safeSlug(match.source.slug) ?? match.source.slug;
  const title = match.source.title.trim() || `${home} x ${away}`;
  const homeLogo = teamCrest(home, match.source.home_logo);
  const awayLogo = teamCrest(away, match.source.away_logo);
  return {
    id: pulsoId(slug),
    title,
    description: null,
    poster: match.source.match_image || match.source.thumbnail || null,
    category: "Futebol",
    competition: match.source.competition || "Futebol",
    teams: {
      home: { name: home, logo: homeLogo },
      away: { name: away, logo: awayLogo },
    },
    start_time: match.source.kickoff_at,
    start_timestamp: match.unix,
    status: mapPulsoStatus(match.source.status, match.unix, nowMs),
    popular: false,
    embeds: presentEventEmbeds([], {
      title: match.source.channelTitle || "Player",
      url: match.source.url,
      allow: match.source.allow,
    }),
  };
}

function teamCrest(name: string, catalogLogo: string | undefined): string {
  const catalog = catalogLogo?.trim() ?? "";
  if (catalog && !isPlaceholderLogo(catalog)) return catalog;
  return resolvePulsoAsset(resolveTeamLogo(name)) || catalog;
}

function toPulsoChannel(embed: PulsoEmbedSource): ApiChannel | null {
  const slug = safeSlug(embed.slug);
  if (!slug || !embed.active) return null;
  const title = embed.title || slug;
  if (!isPlayable(title, embed.url, embed.type)) return null;
  return {
    id: pulsoId(slug),
    name: title,
    description: embed.description.trim() ? embed.description.trim() : null,
    logo_url: embed.thumbnail,
    category: "Esportes",
    embeds: presentChannelEmbeds(title, [], [embed]),
    epg: null,
  };
}

function presentChannelEmbeds(
  channelName: string,
  embeds: ApiEmbed[],
  replacements: PulsoEmbedSource[],
): ApiEmbed[] {
  const extras = replacements.map((embed) =>
    rawEmbed(embed.title || channelName, embed.url, embed.allow),
  );
  const ordered = spliceReplacement(embeds, () => true, extras).map((embed) =>
    rawEmbed(channelName, embed.embed_url, embed.allow ?? ""),
  );
  return numberOptions(ordered);
}

function presentEventEmbeds(
  embeds: ApiEmbed[],
  replacement: { title: string; url: string; allow: string } | null,
): ApiEmbed[] {
  const groups: { name: string; embeds: ApiEmbed[] }[] = [];
  const indexByKey = new Map<string, number>();
  const hadAlternative = new Set<string>();

  const ensure = (name: string) => {
    const key = canonicalChannel(name) || normalizeLabel(name);
    const existing = key ? indexByKey.get(key) : undefined;
    if (existing != null) return groups[existing];
    const slot = { name, embeds: [] as ApiEmbed[] };
    if (key) indexByKey.set(key, groups.length);
    groups.push(slot);
    return slot;
  };

  for (const embed of embeds) {
    const name = baseProvider(embed.provider);
    if (!name) continue;
    const key = canonicalChannel(name);
    if (isAlternative(embed.provider)) {
      if (key) hadAlternative.add(key);
      ensure(name);
      continue;
    }
    const slot = ensure(name);
    if (!slot || slot.embeds.some((item) => item.embed_url === embed.embed_url)) continue;
    slot.embeds.push(embed);
  }

  if (replacement) {
    const target =
      pickReplacementGroup(groups, hadAlternative, replacement.title) ?? ensure(replacement.title);
    const extra = rawEmbed(target?.name || replacement.title, replacement.url, replacement.allow);
    if (target && !target.embeds.some((item) => item.embed_url === extra.embed_url)) {
      target.embeds.push(extra);
    }
  }

  const ordered = groups.flatMap((slot) =>
    slot.embeds.map((embed) => rawEmbed(slot.name, embed.embed_url, embed.allow ?? "")),
  );
  return numberOptions(ordered);
}

function pickReplacementGroup(
  groups: { name: string; embeds: ApiEmbed[] }[],
  hadAlternative: Set<string>,
  title: string,
): { name: string; embeds: ApiEmbed[] } | null {
  const wanted = canonicalChannel(title);
  if (!wanted) return null;
  const exact = groups.find((slot) => canonicalChannel(slot.name) === wanted);
  if (exact) return exact;
  const loose = groups.filter((slot) => {
    const key = canonicalChannel(slot.name);
    return (
      hadAlternative.has(key) && (key.startsWith(`${wanted} `) || wanted.startsWith(`${key} `))
    );
  });
  const looseMatch = loose[0];
  if (looseMatch) return looseMatch;
  const onlyAlternative = groups.filter((slot) => hadAlternative.has(canonicalChannel(slot.name)));
  return onlyAlternative.length === 1 ? (onlyAlternative[0] ?? null) : null;
}

function spliceReplacement(
  embeds: ApiEmbed[],
  replaces: (embed: ApiEmbed) => boolean,
  extras: ApiEmbed[],
): ApiEmbed[] {
  const kept: ApiEmbed[] = [];
  let inserted = false;
  for (const embed of embeds) {
    if (replaces(embed) && isAlternative(embed.provider)) {
      if (!inserted) {
        pushUnique(kept, extras);
        inserted = true;
      }
      continue;
    }
    pushUnique(kept, [embed]);
  }
  if (!inserted) pushUnique(kept, extras);
  return kept;
}

function numberOptions(embeds: ApiEmbed[]): ApiEmbed[] {
  return embeds.map((embed, index) => {
    const next: ApiEmbed = {
      provider: embed.provider,
      quality: `Opção ${index + 1}`,
      embed_url: embed.embed_url,
    };
    const policy = embed.allow?.trim();
    if (policy) next.allow = policy;
    return next;
  });
}

function rawEmbed(title: string, url: string, allow: string): ApiEmbed {
  const embed: ApiEmbed = {
    provider: title.trim() || "Player",
    quality: "",
    embed_url: url,
  };
  const policy = allow.trim();
  if (policy) embed.allow = policy;
  return embed;
}

function pushUnique(target: ApiEmbed[], extras: ApiEmbed[]) {
  for (const extra of extras) {
    if (target.some((item) => item.embed_url === extra.embed_url)) continue;
    target.push(extra);
  }
}

function isAlternative(provider: string): boolean {
  return /alternativo/i.test(provider);
}

function baseProvider(provider: string): string {
  return provider
    .replace(/\s*\(alternativo\)\s*/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function mapPulsoStatus(status: string, kickoffUnix: number, nowMs: number): ApiSportStatus {
  if (status === "finished") return "finished";
  if (status === "live" && nowMs >= kickoffUnix * 1000) return "live";
  return "upcoming";
}

function withoutDisneyOnly(events: ApiSportEvent[]): ApiSportEvent[] {
  return events.filter((event) => {
    if (event.embeds.length === 0) return true;
    return !event.embeds.every(
      (embed) => /disney/i.test(embed.provider) || /disney/i.test(embed.embed_url),
    );
  });
}

function eventTeamNames(event: ApiSportEvent): { home: string; away: string } | null {
  const home = event.teams?.home.name?.trim() ?? "";
  const away = event.teams?.away.name?.trim() ?? "";
  if (home && away) return { home, away };
  const parts = event.title.split(/\s+x\s+/i);
  const titleHome = parts[0]?.trim() ?? "";
  const titleAway = parts[1]?.trim() ?? "";
  if (!titleHome || !titleAway || parts.length !== 2) return null;
  return { home: titleHome, away: titleAway };
}

function pairKey(home: string, away: string): string {
  return home < away ? `${home}|${away}` : `${away}|${home}`;
}

function tokensOverlap(team: string, blob: string): boolean {
  const tokens = team.split(" ").filter((token) => token.length >= 4);
  if (tokens.length === 0) return team.length > 0 && blob.includes(team);
  return tokens.every((token) => blob.includes(token));
}

function canonicalTeam(name: string): string {
  const normalized = normalizeLabel(name);
  if (!normalized) return "";
  return TEAM_ALIASES.get(normalized) ?? normalized;
}

function canonicalChannel(name: string): string {
  const normalized = normalizeLabel(name)
    .replace(/\bfc\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized) return "";
  if (normalized === "sport tv") return "sportv";
  return normalized;
}

function normalizeLabel(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/&/g, " e ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function parseKickoff(kickoff: string): { day: string; unix: number } | null {
  const match = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/.exec(kickoff.trim());
  if (!match) return null;
  const day = match[1];
  const hours = match[2];
  const minutes = match[3];
  if (!day || !hours || !minutes) return null;
  const unixMs = Date.parse(`${day}T${hours}:${minutes}:${match[4] ?? "00"}${SAO_PAULO_OFFSET}`);
  if (Number.isNaN(unixMs)) return null;
  return { day, unix: Math.floor(unixMs / 1000) };
}

function saoPauloDay(unixSeconds: number): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(unixSeconds * 1000));
  const year = parts.find((part) => part.type === "year")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  const day = parts.find((part) => part.type === "day")?.value ?? "";
  if (!year || !month || !day) return "";
  return `${year}-${month}-${day}`;
}

function safeSlug(slug: string): string | null {
  const trimmed = slug.trim();
  return /^[a-z0-9-]+$/i.test(trimmed) ? trimmed : null;
}

function isPlayable(title: string, url: string, type: string): boolean {
  if (!url || /disney/i.test(title) || /disney/i.test(url)) return false;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
  const host = parsed.hostname.replace(/^www\./, "").toLocaleLowerCase("en-US");
  if (host === "example.com" || host.endsWith(".example.com")) return false;
  const youtube =
    host === "youtube.com" ||
    host === "youtu.be" ||
    host === "m.youtube.com" ||
    host === "youtube-nocookie.com";
  if (youtube || type === "youtube") return parsed.pathname.startsWith("/embed/");
  return true;
}
