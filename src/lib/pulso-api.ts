// Public catalog from https://api.pulso-tv.online — read-only, alongside Rei dos Canais.

import {
  fetchChannel,
  fetchChannels,
  fetchSearch,
  fetchSport,
  fetchSports,
  type ApiChannel,
  type ApiSearchResult,
  type ApiSportEvent,
  type SportsParams,
} from "@/lib/api";
import {
  eventSearchBlob,
  mergeChannelLists,
  mergeSportEvents,
  pulsoSlug,
} from "@/lib/merge-catalog";

const PULSO_ORIGIN = "https://api.pulso-tv.online";

export interface PulsoMatch {
  id: number;
  slug: string;
  home_team: string;
  away_team: string;
  competition: string;
  kickoff_at: string;
  status: string;
  active: boolean;
  url: string;
  allow: string;
  thumbnail: string;
  title: string;
  channelTitle: string;
}

export interface PulsoEmbedSource {
  id: number;
  slug: string;
  title: string;
  description: string;
  url: string;
  type: string;
  allow: string;
  thumbnail: string;
  active: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function flagEnabled(value: unknown): boolean {
  return value !== false;
}

async function fetchPulsoList(proxyPath: string, upstreamPath: string): Promise<unknown[]> {
  const url = typeof window === "undefined" ? `${PULSO_ORIGIN}${upstreamPath}` : proxyPath;
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) {
    throw new Error(`Pulso API error ${response.status}: ${proxyPath}`);
  }
  const payload: unknown = await response.json();
  if (!Array.isArray(payload)) {
    throw new Error(`Pulso API invalid payload: ${proxyPath}`);
  }
  return payload;
}

function readMatch(value: unknown): PulsoMatch | null {
  if (!isRecord(value)) return null;
  const id = value["id"];
  const slug = readString(value["slug"]);
  if (typeof id !== "number" || !Number.isFinite(id) || !slug) return null;

  const channel = isRecord(value["channel"]) ? value["channel"] : null;
  const channelActive =
    channel == null || (flagEnabled(channel["active"]) && flagEnabled(channel["enabled"]));

  return {
    id,
    slug,
    home_team: readString(value["home_team"]),
    away_team: readString(value["away_team"]),
    competition: readString(value["competition"]),
    kickoff_at: readString(value["kickoff_at"]),
    status: readString(value["status"]) || "scheduled",
    active: flagEnabled(value["active"]) && flagEnabled(value["enabled"]) && channelActive,
    url: readString(value["url"]) || (channel ? readString(channel["url"]) : ""),
    allow: readString(value["allow_policy"]) || (channel ? readString(channel["allow_policy"]) : ""),
    thumbnail: readString(value["thumbnail"]) || (channel ? readString(channel["thumbnail"]) : ""),
    title: readString(value["title"]),
    channelTitle: (channel ? readString(channel["title"]) : "") || readString(value["channel_name"]),
  };
}

function readEmbed(value: unknown): PulsoEmbedSource | null {
  if (!isRecord(value)) return null;
  const id = value["id"];
  const slug = readString(value["slug"]);
  if (typeof id !== "number" || !Number.isFinite(id) || !slug) return null;

  return {
    id,
    slug,
    title: readString(value["title"]),
    description: readString(value["description"]),
    url: readString(value["url"]),
    type: readString(value["type"]),
    allow: readString(value["allow_policy"]),
    thumbnail: readString(value["thumbnail"]),
    active: flagEnabled(value["active"]) && flagEnabled(value["enabled"]),
  };
}

export async function fetchPulsoMatches(): Promise<PulsoMatch[]> {
  const payload = await fetchPulsoList("/api/pulso/matches", "/api/public/matches");
  return payload.flatMap((item) => {
    const match = readMatch(item);
    return match ? [match] : [];
  });
}

export async function fetchPulsoEmbeds(): Promise<PulsoEmbedSource[]> {
  const payload = await fetchPulsoList("/api/pulso/embeds", "/api/public/embeds");
  return payload.flatMap((item) => {
    const embed = readEmbed(item);
    return embed ? [embed] : [];
  });
}

function sliceSports(events: ApiSportEvent[], params: SportsParams): ApiSportEvent[] {
  let list = events;
  if (params.status) list = list.filter((event) => event.status === params.status);
  if (params.category) list = list.filter((event) => event.category === params.category);
  if (params.search) {
    const query = params.search.toLocaleLowerCase("pt-BR");
    list = list.filter((event) => eventSearchBlob(event).includes(query));
  }
  const offset = params.offset ?? 0;
  const skipped = offset > 0 ? list.slice(offset) : list;
  return params.limit != null ? skipped.slice(0, params.limit) : skipped;
}

export async function fetchMergedSports(params: SportsParams = {}): Promise<ApiSportEvent[]> {
  const [reidos, pulso] = await Promise.allSettled([fetchSports({}), fetchPulsoMatches()]);
  if (reidos.status === "rejected" && pulso.status === "rejected") {
    throw reidos.reason;
  }
  const { events } = mergeSportEvents(
    reidos.status === "fulfilled" ? reidos.value : [],
    pulso.status === "fulfilled" ? pulso.value : [],
  );
  return sliceSports(events, params);
}

export async function fetchMergedSport(id: string): Promise<ApiSportEvent> {
  const slug = pulsoSlug(id);
  if (slug) {
    const [reidos, pulso] = await Promise.allSettled([fetchSports({}), fetchPulsoMatches()]);
    const matches = pulso.status === "fulfilled" ? pulso.value : [];
    const match = matches.find((item) => item.slug === slug);
    if (!match) throw new Error(`Evento não encontrado: ${id}`);
    const { events, absorbed } = mergeSportEvents(
      reidos.status === "fulfilled" ? reidos.value : [],
      [match],
    );
    const hostId = absorbed.get(match.id);
    const host = hostId ? events.find((event) => event.id === hostId) : undefined;
    if (!host) throw new Error(`Evento não encontrado: ${id}`);
    return host;
  }

  const [reidos, pulso] = await Promise.allSettled([fetchSport(id), fetchPulsoMatches()]);
  if (reidos.status === "rejected") throw reidos.reason;
  const matches = pulso.status === "fulfilled" ? pulso.value : [];
  const { events } = mergeSportEvents([reidos.value], matches, { includeUnmatched: false });
  return events[0] ?? reidos.value;
}

export async function fetchMergedChannels(): Promise<ApiChannel[]> {
  const [reidos, pulso] = await Promise.allSettled([fetchChannels(), fetchPulsoEmbeds()]);
  if (reidos.status === "rejected" && pulso.status === "rejected") {
    throw reidos.reason;
  }
  const { channels } = mergeChannelLists(
    reidos.status === "fulfilled" ? reidos.value : [],
    pulso.status === "fulfilled" ? pulso.value : [],
  );
  return channels;
}

export async function fetchMergedChannel(id: string): Promise<ApiChannel> {
  const slug = pulsoSlug(id);
  if (slug) {
    const [reidos, pulso] = await Promise.allSettled([fetchChannels(), fetchPulsoEmbeds()]);
    const embeds = pulso.status === "fulfilled" ? pulso.value : [];
    const embed = embeds.find((item) => item.slug === slug);
    if (!embed) throw new Error(`Canal não encontrado: ${id}`);
    const { channels, absorbed } = mergeChannelLists(
      reidos.status === "fulfilled" ? reidos.value : [],
      [embed],
    );
    const hostId = absorbed.get(embed.slug);
    const host = hostId ? channels.find((channel) => channel.id === hostId) : undefined;
    if (!host) throw new Error(`Canal não encontrado: ${id}`);
    return host;
  }

  const [reidos, pulso] = await Promise.allSettled([fetchChannel(id), fetchPulsoEmbeds()]);
  if (reidos.status === "rejected") throw reidos.reason;
  const embeds = pulso.status === "fulfilled" ? pulso.value : [];
  const { channels } = mergeChannelLists([reidos.value], embeds, { includeUnmatched: false });
  return channels[0] ?? reidos.value;
}

export async function fetchMergedSearch(query: string): Promise<ApiSearchResult> {
  const needle = query.trim().toLocaleLowerCase("pt-BR");
  const [remote, matchesResult, embedsResult] = await Promise.allSettled([
    fetchSearch(query),
    fetchPulsoMatches(),
    fetchPulsoEmbeds(),
  ]);
  if (
    remote.status === "rejected" &&
    matchesResult.status === "rejected" &&
    embedsResult.status === "rejected"
  ) {
    throw remote.reason;
  }

  const base =
    remote.status === "fulfilled" ? remote.value : { channels: [] as ApiChannel[], events: [] as ApiSportEvent[] };
  const matches = matchesResult.status === "fulfilled" ? matchesResult.value : [];
  const embeds = embedsResult.status === "fulfilled" ? embedsResult.value : [];

  const eventsMerged = mergeSportEvents(base.events, matches, { includeUnmatched: false });
  const eventsSolo = mergeSportEvents([], matches);
  const events = [
    ...eventsMerged.events,
    ...eventsSolo.events.filter((event) => {
      const eventSlug = pulsoSlug(event.id);
      if (!eventSlug) return false;
      const match = matches.find((item) => item.slug === eventSlug);
      if (!match || eventsMerged.absorbed.has(match.id)) return false;
      return eventSearchBlob(event).includes(needle);
    }),
  ];

  const channelsMerged = mergeChannelLists(base.channels, embeds, { includeUnmatched: false });
  const channelsSolo = mergeChannelLists([], embeds);
  const channels = [
    ...channelsMerged.channels,
    ...channelsSolo.channels.filter((channel) => {
      const channelSlug = pulsoSlug(channel.id);
      if (!channelSlug || channelsMerged.absorbed.has(channelSlug)) return false;
      const blob = `${channel.name} ${channel.category}`.toLocaleLowerCase("pt-BR");
      return blob.includes(needle);
    }),
  ];

  return { channels, events };
}
