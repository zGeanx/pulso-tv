// Typed API client for https://api.reidoscanais.st

const BASE_URL = "https://api.reidoscanais.st";

// ─── Raw API Types ────────────────────────────────────────────────────────────

export type ApiSportStatus = "live" | "upcoming" | "finished";

export interface ApiEmbed {
  provider: string;
  quality: string;
  embed_url: string;
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
  logo: string;
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

export interface ApiSearchMeta {
  query: string;
  total_channels: number;
  total_events: number;
}

export interface ApiSearchResult {
  channels: ApiChannel[];
  events: ApiSportEvent[];
  meta?: ApiSearchMeta;
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
  meta?: ApiSearchMeta;
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
    meta: res.meta,
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

export function isDisneyChannel(channel: ApiChannel): boolean {
  return /disney/i.test(`${channel.id} ${channel.name} ${channel.category}`);
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

const EVENT_STATUS_ORDER: Record<ApiSportStatus, number> = {
  live: 0,
  upcoming: 1,
  finished: 2,
};

/** Home agenda cards: live and upcoming first. */
export function pickFeaturedEvents(events: ApiSportEvent[], count = 4): ApiSportEvent[] {
  const sorted = [...events].sort(
    (a, b) => EVENT_STATUS_ORDER[a.status] - EVENT_STATUS_ORDER[b.status],
  );
  const active = sorted.filter((event) => event.status !== "finished");
  return (active.length >= count ? active : sorted).slice(0, count);
}

/** Schedule list: sports first, never Caze TV. */
export function pickScheduleChannels(channels: ApiChannel[], count = 6): ApiChannel[] {
  const sports = sortSportsFirst(samplePool(channels).filter((ch) => ch.category === "Esportes"));
  const first = pickUnique(sports, count, false);
  if (first.length >= count) return first;
  return [...first, ...pickUnique(samplePool(channels), count - first.length, true)];
}

/** Games whose embed provider mentions this channel (ESPN, Sportv 2, Premiere…). */
export function eventsForChannel(channel: ApiChannel, events: ApiSportEvent[]): ApiSportEvent[] {
  const key = channel.name.trim().toLocaleLowerCase("pt-BR");
  if (!key) return [];
  return events
    .filter((event) => event.status !== "finished")
    .filter((event) =>
      event.embeds.some((embed) => embed.provider.toLocaleLowerCase("pt-BR").includes(key)),
    )
    .sort((a, b) => {
      const status = EVENT_STATUS_ORDER[a.status] - EVENT_STATUS_ORDER[b.status];
      if (status !== 0) return status;
      return a.start_timestamp - b.start_timestamp;
    });
}

export function pickRelatedEvents(
  events: ApiSportEvent[],
  current: ApiSportEvent,
  count = 6,
): ApiSportEvent[] {
  return events
    .filter((event) => event.id !== current.id && event.status !== "finished")
    .sort((a, b) => {
      const status = EVENT_STATUS_ORDER[a.status] - EVENT_STATUS_ORDER[b.status];
      if (status !== 0) return status;
      return a.start_timestamp - b.start_timestamp;
    })
    .slice(0, count);
}

function providerKey(provider: string): string {
  return provider.replace(/\s*\(alternativo\)\s*/gi, "").trim().toLocaleLowerCase("pt-BR");
}

/** Channels that match the event embed providers (Sportv 2, ESPN 4…). */
export function channelsForEvent(event: ApiSportEvent, channels: ApiChannel[]): ApiChannel[] {
  const keys = [...new Set(event.embeds.map((embed) => providerKey(embed.provider)))];
  const matched: ApiChannel[] = [];
  for (const key of keys) {
    const channel = channels.find((item) => item.name.toLocaleLowerCase("pt-BR") === key);
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
        channel.id !== current.id &&
        channel.category === current.category &&
        !isCazeTv(channel),
    )
    .slice(0, count);
}
