// Typed API client for https://api.reidoscanais.st

const BASE_URL = "https://api.reidoscanais.st";

// ─── Raw API Types ────────────────────────────────────────────────────────────

export type ApiChannelStatus = "live" | "upcoming" | "offline";
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

export interface ApiSearchResult {
  channels: ApiChannel[];
  sports: ApiSportEvent[];
}

// ─── Response wrappers ────────────────────────────────────────────────────────

interface ApiListResponse<T> {
  success: boolean;
  data: T[];
  total?: number;
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

export interface ChannelsParams {
  category?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export async function fetchChannels(params: ChannelsParams = {}): Promise<ApiChannel[]> {
  const query = new URLSearchParams();
  if (params.category) query.set("category", params.category);
  if (params.search) query.set("search", params.search);
  if (params.limit != null) query.set("limit", String(params.limit));
  if (params.offset != null) query.set("offset", String(params.offset));
  const qs = query.toString() ? `?${query.toString()}` : "";
  const res = await apiFetch<ApiListResponse<ApiChannel>>(`/channels${qs}`);
  return res.data;
}

export async function fetchChannel(id: string): Promise<ApiChannel> {
  const res = await apiFetch<ApiItemResponse<ApiChannel>>(`/channels/${id}`);
  return res.data;
}

export async function fetchChannelCategories(): Promise<ApiCategory[]> {
  const res = await apiFetch<ApiListResponse<ApiCategory>>("/channels/categories");
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

export async function fetchSports(params: SportsParams = {}): Promise<ApiSportEvent[]> {
  const query = new URLSearchParams();
  if (params.status) query.set("status", params.status);
  if (params.category) query.set("category", params.category);
  if (params.search) query.set("search", params.search);
  if (params.limit != null) query.set("limit", String(params.limit));
  if (params.offset != null) query.set("offset", String(params.offset));
  const qs = query.toString() ? `?${query.toString()}` : "";
  const res = await apiFetch<ApiListResponse<ApiSportEvent>>(`/sports${qs}`);
  return res.data;
}

export async function fetchSportCategories(): Promise<ApiCategory[]> {
  const res = await apiFetch<ApiListResponse<ApiCategory>>("/sports/categories");
  return res.data;
}

// ─── Search ───────────────────────────────────────────────────────────────────

export async function fetchSearch(q: string): Promise<ApiSearchResult> {
  const res = await apiFetch<ApiItemResponse<ApiSearchResult>>(
    `/search?q=${encodeURIComponent(q)}`,
  );
  return res.data;
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

/** Formats a UTC start_time string ("YYYY-MM-DD HH:mm:ss") to a short time */
export function formatEventTime(isoString: string): string {
  try {
    // The API returns times in UTC — convert to browser local time
    const date = new Date(isoString.replace(" ", "T") + "Z");
    return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return isoString.slice(11, 16);
  }
}
