// Typed API client for https://api.reidoscanais.si

import { headlineEvents } from "@/lib/agenda-rank";

const BASE_URL = "https://api.reidoscanais.si";

// ─── Raw API Types ────────────────────────────────────────────────────────────

import {
  EVENT_STATUS_ORDER,
  MATCH_DURATION_SECONDS,
  getEventEffectiveStatus,
  isEventFinished,
  type ApiSportStatus,
} from "@/lib/sport-status";

export {
  EVENT_STATUS_ORDER,
  MATCH_DURATION_SECONDS,
  getEventEffectiveStatus,
  isEventFinished,
  type ApiSportStatus,
};

export interface ApiEmbed {
  provider: string;
  quality: string;
  embed_url: string;
  /** Iframe allow policy from the Pulso catalog, when the embed comes from that source. */
  allow?: string;
}

export interface ApiEpgEntry {
  title: string;
  description: string | null;
  formatted_time: string;
  start_time: number;
  end_time: number;
  image: string | null;
}

export interface ApiEpgNextEntry {
  title: string;
  description?: string | null;
  formatted_time: string;
  start_time?: number;
  end_time?: number;
  image?: string | null;
}

export interface ApiEpg {
  current: ApiEpgEntry | null;
  next: ApiEpgNextEntry | null;
}

export interface ApiChannel {
  id: string;
  name: string;
  description: string | null;
  logo_url: string;
  category: string;
  embeds: ApiEmbed[];
  epg: ApiEpg | null;
}

export interface ApiTeam {
  name: string;
  /** First crest that should be painted. Empty when every candidate failed upstream. */
  logo: string;
  /** Crests in paint order. A verified crest is the only candidate for that team. */
  logos?: string[];
}

export interface ApiSportEvent {
  id: string;
  title: string;
  description: string | null;
  poster: string | null;
  category: string;
  competition: string;
  teams?: {
    home: ApiTeam;
    away: ApiTeam;
  };
  start_time: string;
  start_timestamp: number;
  status: ApiSportStatus;
  popular: boolean;
  embeds: ApiEmbed[];
}

export interface ApiCategory {
  id: number;
  name: string;
}

export interface ApiSearchResult {
  channels: ApiChannel[];
  events: ApiSportEvent[];
}

// ─── Response wrappers ────────────────────────────────────────────────────────

interface ApiListResponse<T> {
  success: boolean;
  data: T[];
  total?: number;
}

interface ApiSearchResponse {
  success: boolean;
  data: {
    channels: ApiChannel[];
    events: ApiSportEvent[];
  };
}

interface ApiItemResponse<T> {
  success: boolean;
  data: T;
}

// ─── Fetch helper ─────────────────────────────────────────────────────────────

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...init?.headers,
    },
  });
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${path}`);
  }
  return res.json() as Promise<T>;
}

// ─── Channels ─────────────────────────────────────────────────────────────────

export async function fetchChannels(): Promise<ApiChannel[]> {
  const res = await apiFetch<ApiListResponse<ApiChannel>>("/channels");
  return res.data;
}

export async function fetchChannelCategories(): Promise<ApiCategory[]> {
  const res = await apiFetch<ApiListResponse<ApiCategory>>("/channels/categories");
  return res.data;
}

export async function fetchChannel(id: string): Promise<ApiChannel> {
  const res = await apiFetch<ApiItemResponse<ApiChannel>>(`/channels/${encodeURIComponent(id)}`);
  if (!res.data) throw new Error(`Canal não encontrado: ${id}`);
  return res.data;
}

// ─── Sports ───────────────────────────────────────────────────────────────────

export interface SportsParams {
  status?: ApiSportStatus;
  category?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

/**
 * Hide events whose only signals are Disney+: the channels API has no Disney
 * grade, so these agenda items have no matching channel to watch on Pulso TV.
 */
function isDisneyProvider(provider: string): boolean {
  return /disney/i.test(provider);
}

function isDisneyOnlyEvent(event: ApiSportEvent): boolean {
  return event.embeds.length > 0 && event.embeds.every((embed) => isDisneyProvider(embed.provider));
}

export async function fetchSport(id: string): Promise<ApiSportEvent> {
  const res = await apiFetch<ApiItemResponse<ApiSportEvent>>(`/sports/${encodeURIComponent(id)}`);
  if (!res.data || isDisneyOnlyEvent(res.data)) {
    throw new Error(`Evento não encontrado: ${id}`);
  }
  return res.data;
}

export async function fetchSports(params: SportsParams = {}): Promise<ApiSportEvent[]> {
  const query = new URLSearchParams();
  if (params.status) query.set("status", params.status);
  if (params.category) query.set("category", params.category);
  if (params.search) query.set("search", params.search);
  if (params.limit != null) query.set("limit", String(params.limit));
  if (params.offset != null) query.set("offset", String(params.offset));
  const qs = query.toString() ? `?${query.toString()}` : "";
  const res = await apiFetch<ApiListResponse<ApiSportEvent>>(`/sports${qs}`);
  return res.data.filter((event) => !isDisneyOnlyEvent(event));
}

// ─── Search ───────────────────────────────────────────────────────────────────

export async function fetchSearch(q: string): Promise<ApiSearchResult> {
  const res = await apiFetch<ApiSearchResponse>(`/search?q=${encodeURIComponent(q)}`);
  return {
    channels: res.data.channels ?? [],
    events: (res.data.events ?? []).filter((event) => !isDisneyOnlyEvent(event)),
  };
}

// ─── Derived UI helpers ───────────────────────────────────────────────────────

/** Maps API sport status to the Portuguese labels used in the agenda UI */
export const SPORT_STATUS_LABEL = {
  live: "Ao vivo agora",
  upcoming: "Hoje & Próximos",
  finished: "Encerrados",
} as const satisfies Record<ApiSportStatus, string>;

export type SportStatusLabel = (typeof SPORT_STATUS_LABEL)[ApiSportStatus];

export const ALL_SPORT_STATUS_LABELS = Object.values(SPORT_STATUS_LABEL) as SportStatusLabel[];

function formatClock(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Formats a sport event using the Unix timestamp (already in the correct instant). */
export function formatEventTime(event: Pick<ApiSportEvent, "start_timestamp">): string {
  try {
    return formatClock(event.start_timestamp);
  } catch {
    return "--:--";
  }
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/** Relative day label when the event is not today. */
export function formatEventDay(event: Pick<ApiSportEvent, "start_timestamp">): string | null {
  const eventDate = new Date(event.start_timestamp * 1000);
  const today = startOfDay(new Date());
  const eventDay = startOfDay(eventDate);
  const dayMs = 86_400_000;

  if (eventDay === today) return "Hoje";
  if (eventDay === today + dayMs) return "Amanhã";
  if (eventDay === today - dayMs) return "Ontem";

  return eventDate.toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
}

/** Relative kickoff phrase ("em 25 min", "começou há 10 min") for today's window. */
export function formatEventRelative(
  event: Pick<ApiSportEvent, "start_timestamp" | "status">,
  nowMs = Date.now(),
): string | null {
  const status = getEventEffectiveStatus(event, nowMs / 1000);
  if (!Number.isFinite(event.start_timestamp) || status === "finished") return null;
  const diffMin = Math.round((event.start_timestamp * 1000 - nowMs) / 60_000);

  if (status === "live") {
    if (diffMin > 0) return "agora";
    const elapsed = Math.max(1, -diffMin);
    if (elapsed < 60) return `começou há ${elapsed} min`;
    if (elapsed <= 180) {
      const hours = Math.floor(elapsed / 60);
      const mins = elapsed % 60;
      return mins > 0 ? `começou há ${hours}h ${mins}min` : `começou há ${hours}h`;
    }
    return null;
  }

  if (diffMin <= 0 && diffMin >= -15) return "começando agora";
  if (diffMin > 0 && diffMin < 60) return `em ${diffMin} min`;
  if (diffMin >= 60 && diffMin <= 12 * 60) {
    const hours = Math.floor(diffMin / 60);
    const mins = diffMin % 60;
    return mins > 0 ? `em ${hours}h ${mins}min` : `em ${hours}h`;
  }
  return null;
}

/** Deduplicated broadcast channel names for an event ("Sportv", "Premiere"). */
export function eventChannelNames(event: Pick<ApiSportEvent, "embeds">): string[] {
  const names: string[] = [];
  const seen = new Set<string>();
  for (const embed of event.embeds) {
    let clean = embed.provider
      .replace(/\s*\[[^\]]+\]\s*$/g, "")
      .replace(/\s*\(alternativo\)\s*/gi, " ")
      .trim()
      .replace(/\s+/g, " ");
    if (!clean || /^player$/i.test(clean)) continue;
    if (/^hbo\s*max(\s*1)?$/i.test(clean)) clean = "Max";
    const key = clean.toLocaleLowerCase("pt-BR");
    if (seen.has(key)) continue;
    seen.add(key);
    names.push(clean);
  }
  return names;
}

export function formatEpgRange(entry: Pick<ApiEpgEntry, "start_time" | "end_time">): string {
  if (!entry.start_time || !entry.end_time) return "";
  return `${formatClock(entry.start_time)} – ${formatClock(entry.end_time)}`;
}

export function epgProgress(entry: Pick<ApiEpgEntry, "start_time" | "end_time">): number {
  const span = entry.end_time - entry.start_time;
  if (!Number.isFinite(span) || span <= 0) return 0;
  const now = Date.now() / 1000;
  return Math.min(1, Math.max(0, (now - entry.start_time) / span));
}

export function filterChannels(channels: ApiChannel[], query: string): ApiChannel[] {
  const q = query.trim().toLocaleLowerCase("pt-BR");
  if (!q) return channels;
  return channels.filter((ch) =>
    `${ch.name} ${ch.category} ${ch.epg?.current?.title ?? ""} ${ch.epg?.next?.title ?? ""}`
      .toLocaleLowerCase("pt-BR")
      .includes(q),
  );
}

function logoKey(url: string): string {
  return url.split("?")[0] ?? url;
}

function hasCurrentProgram(channel: ApiChannel): boolean {
  return Boolean(channel.epg?.current?.title);
}

function isCazeTv(channel: ApiChannel): boolean {
  return /caze/i.test(channel.name);
}

function samplePool(channels: ApiChannel[]): ApiChannel[] {
  return channels.filter((ch) => !isCazeTv(ch) && hasCurrentProgram(ch));
}

function sportsRank(name: string): number {
  const n = name.trim().toLocaleLowerCase("pt-BR");
  if (n === "espn") return 0;
  if (n === "sportv") return 1;
  if (n === "premiere") return 2;
  if (n === "combate") return 3;
  if (n.startsWith("espn")) return 4;
  if (n.startsWith("sportv")) return 5;
  if (n.startsWith("premiere")) return 6;
  return 20;
}

function sortSportsFirst(channels: ApiChannel[]): ApiChannel[] {
  return [...channels].sort((a, b) => {
    const aSport = a.category === "Esportes" ? 0 : 1;
    const bSport = b.category === "Esportes" ? 0 : 1;
    if (aSport !== bSport) return aSport - bSport;
    const rank = sportsRank(a.name) - sportsRank(b.name);
    if (rank !== 0) return rank;
    return a.name.localeCompare(b.name, "pt-BR");
  });
}

function pickUnique(
  channels: ApiChannel[],
  count: number,
  preferNewCategory: boolean,
): ApiChannel[] {
  const seenLogos = new Set<string>();
  const seenCats = new Set<string>();
  const picked: ApiChannel[] = [];

  const attempt = (requireNewCat: boolean) => {
    for (const channel of channels) {
      if (picked.length >= count) return;
      const key = logoKey(channel.logo_url);
      if (seenLogos.has(key)) continue;
      if (requireNewCat && seenCats.has(channel.category)) continue;
      seenLogos.add(key);
      seenCats.add(channel.category);
      picked.push(channel);
    }
  };

  attempt(preferNewCategory);
  if (picked.length < count) attempt(false);
  return picked;
}

/** Live-now row: sports channels first, never Caze TV, no repeated logos. */
export function pickLiveNow(channels: ApiChannel[], count = 3): ApiChannel[] {
  const sports = sortSportsFirst(samplePool(channels).filter((ch) => ch.category === "Esportes"));
  if (sports.length > 0) return pickUnique(sports, count, false);
  return pickUnique(sortSportsFirst(samplePool(channels)), count, false);
}

/** Featured cards: ESPN, Sportv, Premiere and other sports — never Caze TV. */
export function pickFeaturedChannels(channels: ApiChannel[], count = 4): ApiChannel[] {
  const sports = sortSportsFirst(samplePool(channels).filter((ch) => ch.category === "Esportes"));
  const picked = pickUnique(sports, count, false);
  if (picked.length >= count) return picked;
  return [...picked, ...pickUnique(samplePool(channels), count - picked.length, true)];
}

/** Live first, then upcoming, then finished. Inside each group, by kickoff. */
export function sortEvents(events: ApiSportEvent[]): ApiSportEvent[] {
  const now = Date.now() / 1000;
  return [...events].sort((a, b) => {
    const statusA = getEventEffectiveStatus(a, now);
    const statusB = getEventEffectiveStatus(b, now);
    const status = EVENT_STATUS_ORDER[statusA] - EVENT_STATUS_ORDER[statusB];
    if (status !== 0) return status;
    if (statusA === "finished") {
      return b.start_timestamp - a.start_timestamp;
    }
    return a.start_timestamp - b.start_timestamp;
  });
}

/** Home agenda cards: only live and upcoming matches still to be played. */
export function pickFeaturedEvents(events: ApiSportEvent[], count = 4): ApiSportEvent[] {
  const ranked = headlineEvents(events);
  const active = ranked.filter((event) => !isEventFinished(event));
  return active.slice(0, count);
}

/** Schedule list: sports first, never Caze TV. */
export function pickScheduleChannels(channels: ApiChannel[], count = 6): ApiChannel[] {
  const sports = sortSportsFirst(samplePool(channels).filter((ch) => ch.category === "Esportes"));
  const first = pickUnique(sports, count, false);
  if (first.length >= count) return first;
  return [...first, ...pickUnique(samplePool(channels), count - first.length, true)];
}

/** Games on this channel. "ESPN" does not include ESPN 2 or ESPN 4. */
export function eventsForChannel(channel: ApiChannel, events: ApiSportEvent[]): ApiSportEvent[] {
  if (!channel.name.trim()) return [];
  return sortEvents(
    events
      .filter((event) => !isEventFinished(event))
      .filter((event) =>
        event.embeds.some((embed) => sameBroadcastChannel(embed.provider, channel.name)),
      ),
  );
}

export function pickRelatedEvents(
  events: ApiSportEvent[],
  current: ApiSportEvent,
  count = 6,
): ApiSportEvent[] {
  return sortEvents(
    events.filter((event) => event.id !== current.id && !isEventFinished(event)),
  ).slice(0, count);
}

const SLUG_ACRONYMS = new Set(["espn", "ufc", "nba", "hbo", "nfl", "mlb", "nhl", "f1"]);
const SLUG_MINOR = new Set(["de", "da", "do", "das", "dos", "e", "em", "no", "na"]);

/** "mirassol-x-internacional" → "Mirassol x Internacional". */
export function labelFromSlug(slug: string): string {
  let decoded = slug;
  try {
    decoded = decodeURIComponent(slug);
  } catch {
    decoded = slug;
  }
  const body = decoded.replace(/^pulso-/, "").replace(/-\d{2}-\d{2}$/, "");
  return body
    .split("-")
    .filter(Boolean)
    .map((token, index) => {
      const lower = token.toLocaleLowerCase("pt-BR");
      if (lower === "x") return "x";
      if (index > 0 && SLUG_MINOR.has(lower)) return lower;
      if (SLUG_ACRONYMS.has(lower)) return lower.toUpperCase();
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}

/** Day chip inside the agenda list. */
export function formatAgendaDay(event: Pick<ApiSportEvent, "start_timestamp">): string {
  const label = formatEventDay(event);
  if (label === "Hoje" || label === "Amanhã" || label === "Ontem") return label;
  const date = new Date(event.start_timestamp * 1000);
  const weekday = date.toLocaleDateString("pt-BR", { weekday: "short" }).replace(/\.$/, "");
  const datePart = date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  return `${weekday}., ${datePart}`;
}

function looseChannelName(value: string): string {
  return value
    .replace(/\s*\[[^\]]+\]\s*$/g, "")
    .replace(/\s*\(alternativo\)\s*/gi, " ")
    .trim()
    .toLocaleLowerCase("pt-BR")
    .replace(/\s+/g, " ");
}

function channelTag(value: string): string {
  return /\[([^\]]+)\]\s*$/.exec(value.trim())?.[1]?.toLocaleLowerCase("pt-BR") ?? "";
}

/** "HBO Max 1" is the unnumbered HBO Max feed. A tagged name only matches that tag. */
function sameBroadcastChannel(provider: string, channelName: string): boolean {
  if (channelTag(provider) !== channelTag(channelName)) return false;
  const providerKey = looseChannelName(provider);
  const channelKey = looseChannelName(channelName);
  if (providerKey === channelKey) return true;
  return providerKey.endsWith(" 1") && channelKey === providerKey.slice(0, -2);
}

/** Channels that match the event embed providers (Sportv 2, ESPN 4…). */
export function channelsForEvent(event: ApiSportEvent, channels: ApiChannel[]): ApiChannel[] {
  const matched: ApiChannel[] = [];
  for (const embed of event.embeds) {
    const channel = channels.find((item) => sameBroadcastChannel(embed.provider, item.name));
    if (channel && !matched.some((item) => item.id === channel.id)) matched.push(channel);
  }
  return matched;
}

export function pickRelatedChannels(
  channels: ApiChannel[],
  current: ApiChannel,
  count = 6,
): ApiChannel[] {
  return channels
    .filter(
      (channel) =>
        channel.id !== current.id && channel.category === current.category && !isCazeTv(channel),
    )
    .slice(0, count);
}
