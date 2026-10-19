import type { ApiChannel, ApiEmbed, ApiSportEvent, ApiSportStatus, ApiTeam } from "@/lib/api";
import { isFlagLogo, pulsoLogoFile, resolvePulsoAsset } from "@/lib/pulso-assets";
import { isPlaceholderLogo, type PulsoEmbedSource, type PulsoMatch } from "@/lib/pulso-api";
import {
  catalogCrestFitsTeam,
  curatedTeamCrest,
  isNationalTeam,
  normalizeTeamKey,
  registerTeamLogosFromEvents,
  resolveTeamCrests,
} from "@/lib/team-logos";

export const PULSO_ID_PREFIX = "pulso-";

const SAO_PAULO_OFFSET = "-03:00";

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
  /** Catalog feeds used to expand repeated channels such as HBO Max / HBO Max 1. */
  channels?: PulsoEmbedSource[];
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
  const channels = options.channels ?? [];
  const available = pulsoMatches.flatMap((match) => {
    const prepared = prepareMatch(match);
    return prepared ? [prepared] : [];
  });
  const consumed = new Set<number>();
  const absorbed = new Map<number, string>();

  const events = reidosEvents.map((event) => {
    const prepared = prepareEvent(event);
    const candidates = available.filter(
      (match) => !consumed.has(match.source.id) && sameFixture(prepared, match),
    );
    const playable = candidates.filter((match) =>
      isPlayable(match.source.channelTitle || "Player", match.source.url, "embed"),
    );
    const exact = playable.find((match) => match.pair === prepared.pair) ?? null;
    const incomplete =
      exact || playable.length > 0 ? null : findIncomplete(prepared, available, consumed);
    const chosen = exact ?? playable[0] ?? incomplete;
    const canPlay =
      chosen != null &&
      isPlayable(chosen.source.channelTitle || "Player", chosen.source.url, "embed");
    if (!chosen || !canPlay) return presentEvent(event, null, channels);
    for (const match of candidates) consumed.add(match.source.id);
    consumed.add(chosen.source.id);
    const merged = applyPulso(event, chosen, now, absorbed, channels);
    for (const match of candidates) absorbed.set(match.source.id, merged.id);
    absorbed.set(chosen.source.id, merged.id);
    return merged;
  });

  if (!includeUnmatched) {
    return { events: withoutDisneyOnly(events), absorbed };
  }

  const extras: ApiSportEvent[] = [];
  const pending = available.filter((match) => {
    if (consumed.has(match.source.id) || !match.away || !match.pair) return false;
    if (!isPlayable(match.source.channelTitle || "Player", match.source.url, "embed")) return false;
    return !events.some((event) => sameFixture(prepareEvent(event), match));
  });
  for (const group of groupFixtures(pending)) {
    const match = richestMatch(group);
    const event = toPulsoEvent(match, now, channels);
    for (const item of group) {
      consumed.add(item.source.id);
      absorbed.set(item.source.id, event.id);
    }
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

  if (!includeUnmatched)
    return { channels: labelRepeatedChannels(channels, pulsoEmbeds), absorbed };

  const unmatched: ApiChannel[] = [];
  for (const embed of pulsoEmbeds) {
    if (absorbed.has(embed.slug)) continue;
    const channel = toPulsoChannel(embed);
    if (!channel) continue;
    absorbed.set(embed.slug, channel.id);
    unmatched.push(channel);
  }
  unmatched.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  return { channels: labelRepeatedChannels([...channels, ...unmatched], pulsoEmbeds), absorbed };
}

/** Plain "HBO Max" is feed 1 when "HBO Max 1 …" also exists. Put that id in the name. */
function labelRepeatedChannels(list: ApiChannel[], catalog: PulsoEmbedSource[]): ApiChannel[] {
  return list.map((channel) => {
    const name = nameWithChannelId(channel.name, catalog);
    const embeds = channel.embeds.map((embed) => {
      const provider = nameWithChannelId(embed.provider, catalog);
      if (provider === embed.provider) return embed;
      const next: ApiEmbed = { ...embed, provider };
      if (/^Opção \d+$/.test(embed.quality)) next.quality = "";
      return next;
    });
    if (name === channel.name && embeds.every((embed, index) => embed === channel.embeds[index])) {
      return channel;
    }
    return { ...channel, name, embeds };
  });
}

function nameWithChannelId(title: string, catalog: PulsoEmbedSource[]): string {
  const bases = plainChannelBases(catalog);
  if (splitChannelTag(title).tag || isNumberedDuplicate(title, bases)) return title;
  const base = channelBase(title, bases);
  if (!base || !bases.has(base)) return title;
  const hasTwin = catalog.some(
    (channel) =>
      channel.active &&
      isNumberedDuplicate(channel.title, bases) &&
      channelBase(channel.title, bases) === base,
  );
  return hasTwin ? identifiedChannelTitle(title) : title;
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
  channels: PulsoEmbedSource[],
): ApiSportEvent {
  const pulsoStatus = mapPulsoStatus(match.source.status, match.unix, nowMs);
  const status: ApiSportStatus =
    event.status === "upcoming" && pulsoStatus === "live" ? "live" : event.status;
  const poster =
    realPoster(event.poster, channels, match.source.thumbnail) ??
    realPoster(match.source.match_image, channels, match.source.thumbnail);
  absorbed.set(match.source.id, event.id);
  return presentEvent(
    status === event.status && poster === event.poster ? event : { ...event, status, poster },
    {
      title: match.source.channelTitle || "Player",
      url: match.source.url,
      allow: match.source.allow,
    },
    channels,
  );
}

function presentEvent(
  event: ApiSportEvent,
  replacement: { title: string; url: string; allow: string } | null,
  channels: PulsoEmbedSource[],
): ApiSportEvent {
  return withTeamCrests({
    ...withInferredCategory(event),
    poster: realPoster(event.poster, channels),
    embeds: presentEventEmbeds(event.embeds, replacement, channels),
  });
}

function withTeamCrests(event: ApiSportEvent): ApiSportEvent {
  const names = eventTeamNames(event);
  if (!names) return event;
  return {
    ...event,
    teams: {
      home: teamSide(names.home, event.teams?.home.logo),
      away: teamSide(names.away, event.teams?.away.logo),
    },
  };
}

function teamSide(name: string, catalogLogo: string | undefined): ApiTeam {
  const logos = crestCandidates(name, catalogLogo);
  return { name, logo: logos[0] ?? "", logos };
}

function crestCandidates(name: string, catalogLogo: string | undefined): string[] {
  const logos: string[] = [];
  const push = (url: string) => {
    if (url && !logos.includes(url)) logos.push(url);
  };

  const raw = catalogLogo?.trim() ?? "";
  const resolved = raw && !raw.startsWith("data:") ? resolvePulsoAsset(raw) : "";
  if (resolved && !isPlaceholderLogo(resolved) && catalogCrestFitsTeam(raw, name)) {
    push(resolved);
  }

  const curated = curatedTeamCrest(name);
  if (curated) push(resolvePulsoAsset(curated));

  for (const url of resolveTeamCrests(name)) {
    if (catalogCrestFitsTeam(url, name)) push(url);
  }
  if (isNationalTeam(name) && resolved && isFlagLogo(resolved)) push(resolved);
  return logos;
}

function toPulsoEvent(
  match: PreparedMatch,
  nowMs: number,
  channels: PulsoEmbedSource[],
): ApiSportEvent {
  const home = match.source.home_team.trim();
  const away = match.source.away_team.trim();
  const slug = safeSlug(match.source.slug) ?? match.source.slug;
  const title = match.source.title.trim() || `${home} x ${away}`;
  return {
    id: pulsoId(slug),
    title,
    description: null,
    poster: realPoster(match.source.match_image, channels, match.source.thumbnail),
    category: inferCategory(`${match.source.competition} ${title}`),
    competition: match.source.competition || "Futebol",
    teams: {
      home: teamSide(home, match.source.home_logo),
      away: teamSide(away, match.source.away_logo),
    },
    start_time: match.source.kickoff_at,
    start_timestamp: match.unix,
    status: mapPulsoStatus(match.source.status, match.unix, nowMs),
    popular: false,
    embeds: presentEventEmbeds(
      [],
      {
        title: match.source.channelTitle || "Player",
        url: match.source.url,
        allow: match.source.allow,
      },
      channels,
    ),
  };
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
  channels: PulsoEmbedSource[] = [],
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

  const ordered = groups.flatMap((slot) => {
    const repeated = repeatedChannelOptions(slot.name, channels);
    if (repeated.length > 0) return repeated;
    return slot.embeds.map((embed) => rawEmbed(slot.name, embed.embed_url, embed.allow ?? ""));
  });
  return numberOptions(ordered);
}

/**
 * "HBO Max" and "HBO Max 1 [MPHD2]" are the same channel: the first feed was
 * registered without a number. When that pair exists, show both and label the
 * unnumbered feed as 1.
 */
function repeatedChannelOptions(provider: string, channels: PulsoEmbedSource[]): ApiEmbed[] {
  const plainBases = plainChannelBases(channels);
  const wanted = channelBase(provider, plainBases);
  if (!wanted) return [];

  const family = channels.filter((channel) => {
    if (!channel.active || !isPlayable(channel.title, channel.url, channel.type)) return false;
    return channelBase(channel.title, plainBases) === wanted;
  });
  const numbered = family.filter((channel) => isNumberedDuplicate(channel.title, plainBases));
  const primary = family.filter((channel) => {
    if (isNumberedDuplicate(channel.title, plainBases)) return false;
    return !splitChannelTag(channel.title).tag;
  });
  if (numbered.length === 0 || primary.length === 0) return [];

  const primaryHost = embedHost(primary[0]?.url ?? "");
  const sameHost = numbered.filter((channel) => embedHost(channel.url) === primaryHost);
  const duplicates = (sameHost.length > 0 ? sameHost : numbered).sort((a, b) =>
    a.title.localeCompare(b.title, "pt-BR"),
  );

  const ordered = [...primary, ...duplicates];
  const seen = new Set<string>();
  const options: ApiEmbed[] = [];
  for (const channel of ordered) {
    if (seen.has(channel.url)) continue;
    seen.add(channel.url);
    const title = isNumberedDuplicate(channel.title, plainBases)
      ? channel.title
      : identifiedChannelTitle(channel.title);
    options.push(rawEmbed(title, channel.url, channel.allow));
  }
  return options;
}

function plainChannelBases(channels: PulsoEmbedSource[]): Set<string> {
  const bases = new Set<string>();
  for (const channel of channels) {
    const { stem } = splitChannelTag(channel.title);
    const normalized = normalizeLabel(stem);
    if (!/\s1$/.test(normalized)) bases.add(normalized);
  }
  return bases;
}

function channelBase(title: string, plainBases: Set<string>): string {
  const { stem } = splitChannelTag(baseProvider(title));
  const normalized = normalizeLabel(stem);
  const duplicate = /^(.*)\s1$/.exec(normalized);
  if (duplicate?.[1] && plainBases.has(duplicate[1])) return duplicate[1];
  return normalized;
}

function isNumberedDuplicate(title: string, plainBases: Set<string>): boolean {
  const { stem } = splitChannelTag(baseProvider(title));
  const normalized = normalizeLabel(stem);
  const duplicate = /^(.*)\s1$/.exec(normalized);
  return Boolean(duplicate?.[1] && plainBases.has(duplicate[1]));
}

function identifiedChannelTitle(title: string): string {
  const { stem, tag } = splitChannelTag(title);
  const named = `${stem} 1`;
  return tag ? `${named} [${tag}]` : named;
}

function splitChannelTag(title: string): { stem: string; tag: string | null } {
  const match = /^(.*?)(?:\s*\[([^\]]+)\])\s*$/.exec(title.trim());
  if (!match?.[1]) return { stem: title.trim(), tag: null };
  return { stem: match[1].trim(), tag: match[2]?.trim() || null };
}

function embedHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLocaleLowerCase("en-US");
  } catch {
    return "";
  }
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
      quality: nameCarriesChannelId(embed.provider) ? embed.quality.trim() : `Opção ${index + 1}`,
      embed_url: embed.embed_url,
    };
    const policy = embed.allow?.trim();
    if (policy) next.allow = policy;
    return next;
  });
}

function nameCarriesChannelId(provider: string): boolean {
  const { stem, tag } = splitChannelTag(provider);
  if (tag) return true;
  return /\s\d+$/.test(normalizeLabel(stem));
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

const PULSO_LIVE_WINDOW_MS = (2 * 60 + 15) * 60 * 1000;

function mapPulsoStatus(status: string, kickoffUnix: number, nowMs: number): ApiSportStatus {
  if (status === "finished") return "finished";
  if (status === "live") return "live";
  const startMs = kickoffUnix * 1000;
  if (nowMs >= startMs && nowMs < startMs + PULSO_LIVE_WINDOW_MS) return "live";
  if (nowMs >= startMs + PULSO_LIVE_WINDOW_MS) return "finished";
  return "upcoming";
}

function inferCategory(text: string): string {
  const value = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");
  if (/\bfutsal\b/.test(value)) return "Futsal";
  if (/\b(basquete|basketball|nba|nbb)\b/.test(value)) return "Basquete";
  if (/\b(volei|volleyball)\b/.test(value)) return "Vôlei";
  if (/\b(tenis|atp|wta)\b/.test(value)) return "Tênis";
  if (/\b(mma|ufc|bellator)\b/.test(value)) return "MMA";
  if (/\b(formula\s*1|f1)\b/.test(value)) return "F1";
  return "Futebol";
}

function withInferredCategory(event: ApiSportEvent): ApiSportEvent {
  const inferred = inferCategory(`${event.competition} ${event.title}`);
  if (inferred === "Futebol" || (event.category && event.category !== "Futebol")) return event;
  return { ...event, category: inferred };
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

function sameFixture(
  left: { day: string; home: string; away: string },
  right: { day: string; home: string; away: string },
): boolean {
  if (!left.day || left.day !== right.day) return false;
  if (!left.home || !left.away || !right.home || !right.away) return false;
  const direct =
    teamsLooselyEqual(left.home, right.home) && teamsLooselyEqual(left.away, right.away);
  const swapped =
    teamsLooselyEqual(left.home, right.away) && teamsLooselyEqual(left.away, right.home);
  return direct || swapped;
}

/** "América" and "América-MG" are the same club; "Botafogo" and "Botafogo-SP" only match when the opponent does too. */
function teamsLooselyEqual(left: string, right: string): boolean {
  if (left === right) return true;
  const a = left.split(" ").filter(Boolean);
  const b = right.split(" ").filter(Boolean);
  if (a.length === 0 || b.length === 0 || a.length === b.length) return false;
  const [shorter, longer] = a.length < b.length ? [a, b] : [b, a];
  return shorter.every((token, index) => longer[index] === token);
}

function groupFixtures(matches: PreparedMatch[]): PreparedMatch[][] {
  const groups: PreparedMatch[][] = [];
  for (const match of matches) {
    const group = groups.find((items) => sameFixture(items[0], match));
    if (group) group.push(match);
    else groups.push([match]);
  }
  return groups;
}

function richestMatch(matches: PreparedMatch[]): PreparedMatch {
  return matches.reduce((best, match) =>
    matchRichness(match) > matchRichness(best) ? match : best,
  );
}

function matchRichness(match: PreparedMatch): number {
  const names = match.home.length + match.away.length;
  const art = realPoster(match.source.match_image, [], match.source.thumbnail) ? 1000 : 0;
  return art + names;
}

function realPoster(
  value: string | null | undefined,
  channels: PulsoEmbedSource[],
  channelThumbnail = "",
): string | null {
  const raw = value?.trim() ?? "";
  if (!raw || raw.startsWith("data:")) return null;
  if (isStockPhoto(raw) || pulsoLogoFile(raw)) return null;
  const resolved = resolvePulsoAsset(raw);
  const thumb = channelThumbnail.trim();
  if (thumb && (raw === thumb || resolved === resolvePulsoAsset(thumb))) return null;
  if (
    channels.some((channel) => {
      const channelArt = channel.thumbnail.trim();
      return (
        channelArt.length > 0 && (raw === channelArt || resolved === resolvePulsoAsset(channelArt))
      );
    })
  ) {
    return null;
  }
  return resolved;
}

function isStockPhoto(url: string): boolean {
  return /images\.unsplash\.com/i.test(url);
}

function tokensOverlap(team: string, blob: string): boolean {
  const tokens = team.split(" ").filter((token) => token.length >= 4);
  if (tokens.length === 0) return team.length > 0 && blob.includes(team);
  return tokens.every((token) => blob.includes(token));
}

function canonicalTeam(name: string): string {
  return normalizeTeamKey(name);
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
