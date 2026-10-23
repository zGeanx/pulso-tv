import {
  fetchChannel,
  fetchChannels,
  fetchSearch,
  fetchSport,
  fetchSports,
  sortEvents,
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
import { isFlagLogo, PULSO_ORIGIN, resolvePulsoAsset } from "@/lib/pulso-assets";
import { generateNextDayUpcomingEvents } from "@/lib/upcoming-schedule";

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
  match_image: string;
  title: string;
  channelTitle: string;
  home_logo?: string;
  away_logo?: string;
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

/** Initials avatars and country flags are not club crests. */
export function isPlaceholderLogo(url: string): boolean {
  if (!url || url.startsWith("data:")) return true;
  return isFlagLogo(url);
}

function readAsset(values: unknown[]): string {
  const urls = values.map((value) => resolvePulsoAsset(readString(value))).filter(Boolean);
  return urls.find((url) => !isPlaceholderLogo(url)) ?? urls[0] ?? "";
}

function nestedTeamLogo(value: Record<string, unknown>, side: "home" | "away"): string {
  const direct = value[side];
  const teams = value["teams"];
  const team = isRecord(teams) ? teams[side] : null;
  const source = isRecord(team) ? team : isRecord(direct) ? direct : null;
  if (!source) return "";
  return readString(source["logo"]) || readString(source["badge"]) || readString(source["image"]);
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

  const home_logo = readAsset([
    value["home_team_logo"],
    value["home_logo"],
    value["home_team_badge"],
    value["home_team_image"],
    nestedTeamLogo(value, "home"),
  ]);

  const away_logo = readAsset([
    value["away_team_logo"],
    value["away_logo"],
    value["away_team_badge"],
    value["away_team_image"],
    nestedTeamLogo(value, "away"),
  ]);

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
    allow:
      readString(value["allow_policy"]) || (channel ? readString(channel["allow_policy"]) : ""),
    thumbnail: readAsset([
      value["thumbnail"],
      channel ? channel["thumbnail"] : "",
      value["channel_logo"],
      value["stream_logo"],
    ]),
    match_image: readAsset([value["match_image"], value["cover"], value["banner"]]),
    title: readString(value["title"]),
    channelTitle:
      (channel ? readString(channel["title"]) : "") || readString(value["channel_name"]),
    home_logo,
    away_logo,
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
    thumbnail: readAsset([
      value["thumbnail"],
      value["logo"],
      value["channel_logo"],
      value["stream_logo"],
    ]),
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
  const ordered = sortEvents(list);
  const offset = params.offset ?? 0;
  const skipped = offset > 0 ? ordered.slice(offset) : ordered;
  return params.limit != null ? skipped.slice(0, params.limit) : skipped;
}

export async function fetchMergedSports(params: SportsParams = {}): Promise<ApiSportEvent[]> {
  const [reidos, pulso, catalog] = await Promise.allSettled([
    fetchSports({}),
    fetchPulsoMatches(),
    fetchPulsoEmbeds(),
  ]);
  if (reidos.status === "rejected" && pulso.status === "rejected") {
    throw reidos.reason;
  }
  const { events } = mergeSportEvents(
    reidos.status === "fulfilled" ? reidos.value : [],
    pulso.status === "fulfilled" ? pulso.value : [],
    { channels: catalog.status === "fulfilled" ? catalog.value : [] },
  );

  const nextDay = generateNextDayUpcomingEvents();
  const existingPairs = new Set(
    events.map((e) => {
      const h = e.teams?.home.name.toLocaleLowerCase("pt-BR") ?? "";
      const a = e.teams?.away.name.toLocaleLowerCase("pt-BR") ?? "";
      return h && a ? `${h}|${a}` : e.title.toLocaleLowerCase("pt-BR");
    }),
  );

  const additionalNextDay = nextDay.filter((item) => {
    const h = item.teams?.home.name.toLocaleLowerCase("pt-BR") ?? "";
    const a = item.teams?.away.name.toLocaleLowerCase("pt-BR") ?? "";
    const pair = `${h}|${a}`;
    const invPair = `${a}|${h}`;
    return (
      !existingPairs.has(pair) &&
      !existingPairs.has(invPair) &&
      !existingPairs.has(item.title.toLocaleLowerCase("pt-BR"))
    );
  });

  return sliceSports([...events, ...additionalNextDay], params);
}

export async function fetchMergedSport(id: string): Promise<ApiSportEvent> {
  const sports = await fetchMergedSports();
  const direct = sports.find((event) => event.id === id);
  if (direct) return direct;

  const slug = pulsoSlug(id);
  if (slug) {
    const [reidos, pulso, catalog] = await Promise.allSettled([
      fetchSports({}),
      fetchPulsoMatches(),
      fetchPulsoEmbeds(),
    ]);
    const matches = pulso.status === "fulfilled" ? pulso.value : [];
    const match = matches.find((item) => item.slug === slug);
    if (!match) throw new Error(`Evento não encontrado: ${id}`);
    const { events, absorbed } = mergeSportEvents(
      reidos.status === "fulfilled" ? reidos.value : [],
      [match],
      { channels: catalog.status === "fulfilled" ? catalog.value : [] },
    );
    const hostId = absorbed.get(match.id);
    const host = hostId ? events.find((event) => event.id === hostId) : undefined;
    if (!host) throw new Error(`Evento não encontrado: ${id}`);
    return host;
  }

  const [reidos, pulso, catalog] = await Promise.allSettled([
    fetchSport(id),
    fetchPulsoMatches(),
    fetchPulsoEmbeds(),
  ]);
  if (reidos.status === "rejected") throw reidos.reason;
  const matches = pulso.status === "fulfilled" ? pulso.value : [];
  const { events } = mergeSportEvents([reidos.value], matches, {
    includeUnmatched: false,
    channels: catalog.status === "fulfilled" ? catalog.value : [],
  });
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
    remote.status === "fulfilled"
      ? remote.value
      : { channels: [] as ApiChannel[], events: [] as ApiSportEvent[] };
  const matches = matchesResult.status === "fulfilled" ? matchesResult.value : [];
  const embeds = embedsResult.status === "fulfilled" ? embedsResult.value : [];

  const eventsMerged = mergeSportEvents(base.events, matches, {
    includeUnmatched: false,
    channels: embeds,
  });
  const eventsSolo = mergeSportEvents([], matches, { channels: embeds });
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
