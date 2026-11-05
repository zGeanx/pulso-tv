import { fameScore, isWomensEvent, rememberWomensFixtures } from "@/lib/agenda-rank";
import { correctBrasileiraoEvent } from "@/lib/brasileirao";
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
import { curateUclEvent, isBogusPulsoMatchUrl } from "@/lib/ucl-fixtures";
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
  const channelArts = channelArtSet(channels);
  const preparedReidos = reidosEvents.map((event) => ({
    event,
    prepared: prepareEvent(event),
  }));
  const normalizedPulso = normalizePulsoMatches(pulsoMatches);
  const available = resolveChannelCollisions(
    reconcileMatchesWithReidos(
      normalizedPulso.flatMap((match) => {
        const prepared = prepareMatch(sanitizeMatchChannel(match));
        return prepared ? [prepared] : [];
      }),
      preparedReidos,
    ),
    preparedReidos,
    channels,
  );
  const consumed = new Set<number>();
  const absorbed = new Map<number, string>();
  const events = preparedReidos.map(({ event, prepared }) => {
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
    if (!chosen || !canPlay) return presentEvent(event, null, channels, channelArts);
    for (const match of candidates) consumed.add(match.source.id);
    consumed.add(chosen.source.id);
    const merged = applyPulso(event, chosen, now, absorbed, channels, channelArts);
    for (const match of candidates) absorbed.set(match.source.id, merged.id);
    absorbed.set(chosen.source.id, merged.id);
    return merged;
  });
  if (!includeUnmatched) {
    return { events: publishEvents(events), absorbed };
  }
  const preparedEvents = events.map(prepareEvent);
  const extras: ApiSportEvent[] = [];
  const pending = available.filter((match) => {
    if (consumed.has(match.source.id) || !match.away || !match.pair) return false;
    if (!isPlayable(match.source.channelTitle || "Player", match.source.url, "embed")) return false;
    return !preparedEvents.some((prepared) => sameFixture(prepared, match));
  });
  for (const group of groupFixtures(pending)) {
    const match = richestMatch(group);
    const event = toPulsoEvent(match, now, channels, channelArts);
    for (const item of group) {
      consumed.add(item.source.id);
      absorbed.set(item.source.id, event.id);
    }
    extras.push(event);
  }
  extras.sort((a, b) => a.start_timestamp - b.start_timestamp);
  return { events: publishEvents([...events, ...extras]), absorbed };
}
function publishEvents(events: ApiSportEvent[]): ApiSportEvent[] {
  return withoutWomens(withoutDisneyOnly(events)).map(correctBrasileiraoEvent);
}
function withoutWomens(events: ApiSportEvent[]): ApiSportEvent[] {
  const hidden = events.filter((event) => isWomensEvent(event));
  rememberWomensFixtures(hidden);
  return events.filter((event) => !isWomensEvent(event));
}
export function mergeChannelLists(
  reidosChannels: ApiChannel[],
  pulsoEmbeds: PulsoEmbedSource[],
  options: MergeOptions = {},
): MergeChannelResult {
  const includeUnmatched = options.includeUnmatched !== false;
  const absorbed = new Map<string, string>();
  const extrasByKey = new Map<string, PulsoEmbedSource[]>();
  const plainBases = plainChannelBases(pulsoEmbeds);
  for (const embed of pulsoEmbeds) {
    if (!embed.active || !safeSlug(embed.slug)) continue;
    const title = effectiveEmbedTitle(embed);
    if (!isPlayable(title, embed.url, embed.type)) continue;
    const key = catalogGroupKey(title, plainBases);
    if (!key) continue;
    const normalizedEmbed = title === embed.title ? embed : { ...embed, title };
    const group = extrasByKey.get(key);
    if (group) group.push(normalizedEmbed);
    else extrasByKey.set(key, [normalizedEmbed]);
  }
  const usedKeys = new Set<string>();
  const channels = reidosChannels.map((channel) => {
    const key = catalogGroupKey(channel.name, plainBases);
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
  for (const [key, group] of extrasByKey) {
    if (usedKeys.has(key)) continue;
    const channel = channelFromPulsoGroup(group);
    if (!channel) continue;
    for (const embed of group) absorbed.set(embed.slug, channel.id);
    unmatched.push(channel);
  }
  unmatched.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  return { channels: labelRepeatedChannels([...channels, ...unmatched], pulsoEmbeds), absorbed };
}
function labelRepeatedChannels(list: ApiChannel[], catalog: PulsoEmbedSource[]): ApiChannel[] {
  const bases = plainChannelBases(catalog);
  const twinBases = getTwinBases(catalog, bases);
  return list.map((channel) => {
    const name = nameWithChannelId(channel.name, bases, twinBases);
    const embeds = channel.embeds.map((embed) => {
      const provider = nameWithChannelId(embed.provider, bases, twinBases);
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
function getTwinBases(catalog: PulsoEmbedSource[], bases: Set<string>): Set<string> {
  const twins = new Set<string>();
  for (const channel of catalog) {
    if (channel.active && isNumberedDuplicate(channel.title, bases)) {
      const base = channelBase(channel.title, bases);
      if (base && bases.has(base)) {
        twins.add(base);
      }
    }
  }
  return twins;
}
function nameWithChannelId(title: string, bases: Set<string>, twinBases: Set<string>): string {
  if (splitChannelTag(title).tag || isNumberedDuplicate(title, bases)) return title;
  const base = channelBase(title, bases);
  if (!base || !bases.has(base)) return title;
  return twinBases.has(base) ? identifiedChannelTitle(title) : title;
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
  channelArts?: Set<string>,
): ApiSportEvent {
  const effectiveKickoffUnix = event.start_timestamp > 0 ? event.start_timestamp : match.unix;
  const pulsoStatus = mapPulsoStatus(match.source.status, effectiveKickoffUnix, nowMs);
  let status: ApiSportStatus = event.status;
  if (effectiveKickoffUnix > 0 && nowMs < effectiveKickoffUnix * 1000) {
    status = "upcoming";
  } else if (
    pulsoStatus === "finished" ||
    event.status === "finished" ||
    (effectiveKickoffUnix > 0 && nowMs >= effectiveKickoffUnix * 1000 + PULSO_LIVE_WINDOW_MS)
  ) {
    status = "finished";
  } else if (event.status === "upcoming" && pulsoStatus === "live") {
    status = "live";
  }
  const posterTarget = channelArts ?? channels;
  const poster =
    realPoster(event.poster, posterTarget, match.source.thumbnail) ??
    realPoster(match.source.match_image, posterTarget, match.source.thumbnail);
  absorbed.set(match.source.id, event.id);
  const isBogus = isBogusPulsoMatchUrl(match.pair, match.source.url);
  return presentEvent(
    status === event.status && poster === event.poster ? event : { ...event, status, poster },
    isBogus
      ? null
      : {
          title: match.source.channelTitle || "Player",
          url: match.source.url,
          allow: match.source.allow,
        },
    channels,
    channelArts,
  );
}
function presentEvent(
  event: ApiSportEvent,
  replacement: {
    title: string;
    url: string;
    allow: string;
  } | null,
  channels: PulsoEmbedSource[],
  channelArts?: Set<string>,
): ApiSportEvent {
  const presented = correctBrasileiraoEvent(
    withTeamCrests({
      ...withInferredCategory(event),
      poster: realPoster(event.poster, channelArts ?? channels),
      embeds: presentEventEmbeds(event.embeds, replacement, channels),
    }),
  );
  return curateUclEvent(presented);
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
  channelArts?: Set<string>,
): ApiSportEvent {
  const home = match.source.home_team.trim();
  const away = match.source.away_team.trim();
  const slug = safeSlug(match.source.slug) ?? match.source.slug;
  const title = match.source.title.trim() || `${home} x ${away}`;
  return {
    id: pulsoId(slug),
    title,
    description: null,
    poster: realPoster(match.source.match_image, channelArts ?? channels, match.source.thumbnail),
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
function channelFromPulsoGroup(group: PulsoEmbedSource[]): ApiChannel | null {
  const playable = group.filter(
    (embed) =>
      embed.active &&
      safeSlug(embed.slug) &&
      isPlayable(embed.title || embed.slug, embed.url, embed.type),
  );
  if (playable.length === 0) return null;
  const primary = pickPrimaryPulsoEmbed(playable);
  const slug = safeSlug(primary.slug);
  if (!slug) return null;
  const title = splitChannelTag(baseProvider(primary.title || slug)).stem || slug;
  const description = playable.map((embed) => embed.description.trim()).find(Boolean) ?? "";
  const thumbnail =
    playable.map((embed) => embed.thumbnail.trim()).find((url) => url.length > 0) ?? "";
  return {
    id: pulsoId(slug),
    name: title,
    description: description || null,
    logo_url: thumbnail,
    category: inferChannelCategory(title),
    embeds: presentChannelEmbeds(title, [], playable),
    epg: null,
  };
}
function pickPrimaryPulsoEmbed(group: PulsoEmbedSource[]): PulsoEmbedSource {
  return group.reduce((best, embed) => {
    const score = pulsoEmbedScore(embed);
    return score > pulsoEmbedScore(best) ? embed : best;
  });
}
function pulsoEmbedScore(embed: PulsoEmbedSource): number {
  const { stem, tag } = splitChannelTag(embed.title);
  let score = stem.length;
  if (!tag) score += 1000;
  if (embed.thumbnail.trim()) score += 50;
  if (embed.description.trim()) score += 10;
  return score;
}
function inferChannelCategory(name: string): string {
  const value = normalizeLabel(name);
  if (/\b(band news|bloomberg|bm c|cnn|globo news|globonews|record news|jornal)\b/.test(value)) {
    return "Notícias";
  }
  if (/\b(cartoon|cartoonito|discovery kids|nick|gloob|disney junior)\b/.test(value)) {
    return "Infantil";
  }
  if (
    /\b(discovery|animal planet|curta|arte 1|nat geo|national geographic|history|id extra)\b/.test(
      value,
    )
  ) {
    return "Documentários";
  }
  if (
    /\b(hbo|amc|axn|cinemax|paramount|prime video|telecine|megapix|canal brasil|bis)\b/.test(value)
  ) {
    return "Filmes e Séries";
  }
  if (/\b(a e|adult swim|fazenda|multishow|mtv|gnt|viva|comedy)\b/.test(value)) {
    return "Entretenimento";
  }
  if (
    /\b(globo|sbt|record|band|rede tv|cultura)\b/.test(value) &&
    !/\bsports?\b|\bnews\b/.test(value)
  ) {
    return "Canais Abertos";
  }
  return "Esportes";
}
function presentChannelEmbeds(
  channelName: string,
  embeds: ApiEmbed[],
  replacements: PulsoEmbedSource[],
): ApiEmbed[] {
  const seen = new Set<string>();
  const ordered: ApiEmbed[] = [];
  const push = (embed: ApiEmbed) => {
    if (!embed.embed_url || seen.has(embed.embed_url)) return;
    seen.add(embed.embed_url);
    ordered.push(embed);
  };
  for (const extra of replacements) {
    push(rawEmbed(extra.title || channelName, extra.url, extra.allow));
  }
  for (const embed of embeds) {
    push(rawEmbed(embed.provider || channelName, embed.embed_url, embed.allow ?? ""));
  }
  return numberOptions(preferPremiumServers(ordered));
}
function presentEventEmbeds(
  embeds: ApiEmbed[],
  replacement: {
    title: string;
    url: string;
    allow: string;
  } | null,
  channels: PulsoEmbedSource[] = [],
): ApiEmbed[] {
  const groups: {
    name: string;
    embeds: ApiEmbed[];
  }[] = [];
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
    const slot = ensure(name);
    if (!slot || slot.embeds.some((item) => item.embed_url === embed.embed_url)) continue;
    slot.embeds.push(embed);
  }
  if (replacement && replacement.url) {
    const target =
      pickReplacementGroup(groups, hadAlternative, replacement.title) ?? ensure(replacement.title);
    const named = target?.name || replacement.title;
    const provider = /(?:youtube\.com|youtu\.be)/i.test(replacement.url)
      ? `${named} [YouTube]`
      : named;
    const extra = rawEmbed(provider, replacement.url, replacement.allow);
    if (target && !target.embeds.some((item) => item.embed_url === extra.embed_url)) {
      target.embeds.unshift(extra);
    }
  }
  addCatalogFeeds(groups, channels);
  const ordered = groups.flatMap((slot) => {
    return slot.embeds.map((embed) => {
      const isAlt = isAlternative(embed.provider);
      const tagged = /\[[^\]]+\]/.test(embed.provider);
      const own = embed.provider.trim();
      const title = tagged
        ? own
        : isAlt
          ? `${slot.name} (Alternativo)`
          : own && own !== slot.name
            ? own
            : slot.name;
      return rawEmbed(title, embed.embed_url, embed.allow ?? "");
    });
  });
  return numberOptions(preferPremiumServers(ordered));
}
function catalogGroupKey(name: string, plainBases: Set<string>): string {
  const key = channelGroupKey(name);
  if (!key) return "";
  return channelBase(key, plainBases);
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
function splitChannelTag(title: string): {
  stem: string;
  tag: string | null;
} {
  const match = /^(.*?)(?:\s*\[([^\]]+)\])\s*$/.exec(title.trim());
  if (!match?.[1]) return { stem: title.trim(), tag: null };
  return { stem: match[1].trim(), tag: match[2]?.trim() || null };
}
function addCatalogFeeds(
  groups: {
    name: string;
    embeds: ApiEmbed[];
  }[],
  channels: PulsoEmbedSource[],
) {
  if (groups.length === 0 || channels.length === 0) return;
  const plainBases = plainChannelBases(channels);
  for (const slot of groups) {
    const wanted = catalogGroupKey(slot.name, plainBases);
    if (!wanted) continue;
    for (const channel of channels) {
      const title = effectiveEmbedTitle(channel);
      if (!channel.active || !isPlayable(title, channel.url, channel.type)) continue;
      if (catalogGroupKey(title, plainBases) !== wanted) continue;
      const extra = rawEmbed(title || slot.name, channel.url, channel.allow);
      if (slot.embeds.some((item) => item.embed_url === extra.embed_url)) continue;
      slot.embeds.push(extra);
    }
  }
}
function effectiveEmbedTitle(embed: PulsoEmbedSource): string {
  const raw = embed.title || embed.slug;
  const { stem, tag } = splitChannelTag(raw);
  const cleanStem = baseProvider(stem);
  if (/^caz[eé]\s*tv$/i.test(cleanStem)) {
    const numbered = /cazetv[-_]?([23])(?!\d)/i.exec(`${embed.slug} ${embed.url}`);
    if (numbered?.[1]) {
      return tag ? `CazéTV ${numbered[1]} [${tag}]` : `CazéTV ${numbered[1]}`;
    }
  }
  if (cleanStem !== stem) {
    return tag ? `${cleanStem} [${tag}]` : cleanStem;
  }
  return raw;
}
function pickReplacementGroup(
  groups: {
    name: string;
    embeds: ApiEmbed[];
  }[],
  hadAlternative: Set<string>,
  title: string,
): {
  name: string;
  embeds: ApiEmbed[];
} | null {
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
function preferPremiumServers(embeds: ApiEmbed[]): ApiEmbed[] {
  const premium: ApiEmbed[] = [];
  const rest: ApiEmbed[] = [];
  for (const embed of embeds) {
    if (/servidor\s*premium/i.test(embed.provider)) premium.push(embed);
    else rest.push(embed);
  }
  return premium.length > 0 ? [...premium, ...rest] : embeds;
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
    .replace(/\s*·\s*[^[\]]+$/i, " ")
    .replace(/\s+/g, " ")
    .trim();
}
const PULSO_LIVE_WINDOW_MS = (2 * 60 + 15) * 60 * 1000;
const REGRESSION_THRESHOLD_MS = 2 * 60 * 60 * 1000;
const CREATED_AFTER_KICKOFF_GRACE_MS = 30 * 60 * 1000;
const ADJACENT_FIXTURE_WINDOW_SECONDS = 36 * 60 * 60;
function mapPulsoStatus(status: string, kickoffUnix: number, nowMs: number): ApiSportStatus {
  const startMs = kickoffUnix * 1000;
  if (startMs > 0 && nowMs < startMs) return "upcoming";
  if (status === "finished") return "finished";
  if (startMs > 0 && nowMs >= startMs + PULSO_LIVE_WINDOW_MS) return "finished";
  if (status === "live") return "live";
  if (startMs > 0 && nowMs >= startMs && nowMs < startMs + PULSO_LIVE_WINDOW_MS) return "live";
  return "upcoming";
}
export function normalizePulsoMatches(matches: PulsoMatch[]): PulsoMatch[] {
  if (matches.length === 0) return matches;
  const indexed = matches.map((match, index) => ({
    match,
    index,
    kickoff: parseKickoff(match.kickoff_at),
    createdMs: parseUtcTimestamp(match.created_at),
  }));
  const byId = [...indexed].sort((a, b) => a.match.id - b.match.id || a.index - b.index);
  const shiftedIds = new Set<number>();
  const dayState = new Map<
    string,
    {
      maxKickoffMs: number;
      inNextDayBlock: boolean;
      lastShiftedKickoffMs: number;
    }
  >();
  for (const item of byId) {
    const { match, kickoff, createdMs } = item;
    if (!kickoff) continue;
    const kickoffMs = kickoff.unix * 1000;
    const state = dayState.get(kickoff.day) ?? {
      maxKickoffMs: kickoffMs,
      inNextDayBlock: false,
      lastShiftedKickoffMs: 0,
    };
    const createdAfterFinished =
      createdMs !== null &&
      createdMs - kickoffMs >= PULSO_LIVE_WINDOW_MS &&
      createdMs - kickoffMs < 24 * 60 * 60 * 1000;
    const regressedInBatch =
      kickoffMs + REGRESSION_THRESHOLD_MS < state.maxKickoffMs &&
      (createdMs === null || kickoffMs < createdMs - CREATED_AFTER_KICKOFF_GRACE_MS);
    const continuesNextDayBlock =
      state.inNextDayBlock && kickoffMs + REGRESSION_THRESHOLD_MS >= state.lastShiftedKickoffMs;
    if (createdAfterFinished || regressedInBatch || continuesNextDayBlock) {
      shiftedIds.add(match.id);
      state.inNextDayBlock = true;
      state.lastShiftedKickoffMs = kickoffMs;
    } else if (kickoffMs > state.maxKickoffMs) {
      state.maxKickoffMs = kickoffMs;
    }
    dayState.set(kickoff.day, state);
  }
  if (shiftedIds.size === 0) return matches;
  return matches.map((match) => (shiftedIds.has(match.id) ? shiftPulsoMatchDay(match, 1) : match));
}
function reconcileMatchesWithReidos(
  matches: PreparedMatch[],
  reidos: { event: ApiSportEvent; prepared: PreparedEvent }[],
): PreparedMatch[] {
  if (matches.length === 0 || reidos.length === 0) return matches;
  return matches.map((match) => {
    if (!match.home || !match.away) return match;
    if (reidos.some(({ prepared }) => sameFixture(prepared, match))) return match;
    const adjacent = reidos.find(
      ({ event, prepared }) =>
        prepared.day &&
        prepared.day !== match.day &&
        sameTeams(prepared, match) &&
        event.start_timestamp > 0 &&
        Math.abs(event.start_timestamp - match.unix) <= ADJACENT_FIXTURE_WINDOW_SECONDS,
    );
    if (!adjacent) return match;
    return {
      ...match,
      day: adjacent.prepared.day,
      unix: adjacent.event.start_timestamp,
      source: {
        ...match.source,
        kickoff_at: adjacent.event.start_time || match.source.kickoff_at,
        status: "scheduled",
      },
    };
  });
}
const COLLISION_WINDOW_SECONDS = 2 * 60 * 60;
interface BroadcastChannelTarget {
  key: string;
  title: string;
  url: string;
}
const CAZE_EURO_POOL: readonly BroadcastChannelTarget[] = [
  {
    key: "cazetv",
    title: "CazéTV 1",
    url: "https://meuplayeronlinehd.com/myplay/watch.html?id=cazetv1",
  },
  {
    key: "cazetv 2",
    title: "CazéTV 2",
    url: "https://meuplayeronlinehd.com/myplay/watch.html?id=cazetv2",
  },
  {
    key: "cazetv 3",
    title: "CazéTV 3",
    url: "https://meuplayeronlinehd.com/myplay/watch.html?id=cazetv3",
  },
  {
    key: "bandsports",
    title: "Band Sports",
    url: "https://meuplayeronlinehd.com/myplay/watch.html?id=bandsports",
  },
  {
    key: "espn",
    title: "ESPN",
    url: "https://meuplayeronlinehd.com/myplay/watch.html?id=espn",
  },
  {
    key: "espn 2",
    title: "ESPN 2",
    url: "https://meuplayeronlinehd.com/myplay/watch.html?id=espn2",
  },
  {
    key: "espn 3",
    title: "ESPN 3",
    url: "https://meuplayeronlinehd.com/myplay/watch.html?id=espn3",
  },
  {
    key: "espn 4",
    title: "ESPN 4",
    url: "https://meuplayeronlinehd.com/myplay/watch.html?id=espn4",
  },
  {
    key: "espn 5",
    title: "ESPN 5",
    url: "https://meuplayeronlinehd.com/myplay/watch.html?id=espn5-2",
  },
  {
    key: "espn 6",
    title: "ESPN 6",
    url: "https://meuplayeronlinehd.com/myplay/watch.html?id=espn6-2",
  },
  {
    key: "xsports",
    title: "XSports",
    url: "https://meuplayeronlinehd.com/myplay/watch.html?id=xsports",
  },
  {
    key: "sportynet plus 1",
    title: "SportyNet+ 1",
    url: "https://rdcanais.net/sportynetplus",
  },
  {
    key: "sportynet plus 2",
    title: "SportyNet+ 2",
    url: "https://rdcanais.net/sportynetplus2",
  },
  {
    key: "sportynet plus 3",
    title: "SportyNet+ 3",
    url: "https://rdcanais.net/sportynetplus3",
  },
];
const MAX_TNT_POOL: readonly BroadcastChannelTarget[] = [
  {
    key: "hbo max 1",
    title: "HBO Max 1",
    url: "https://meuplayeronlinehd.com/myplay/watch.html?id=max1",
  },
  {
    key: "tnt",
    title: "TNT",
    url: "https://meuplayeronlinehd.com/myplay/watch.html?id=tnt",
  },
  {
    key: "space",
    title: "Space",
    url: "https://meuplayeronlinehd.com/myplay/watch.html?id=space",
  },
  {
    key: "hbo max 2",
    title: "HBO Max 2",
    url: "https://meuplayeronlinehd.com/myplay/watch.html?id=max2",
  },
  {
    key: "hbo max 3",
    title: "HBO Max 3",
    url: "https://meuplayeronlinehd.com/myplay/watch.html?id=max3",
  },
  {
    key: "hbo max 4",
    title: "HBO Max 4",
    url: "https://meuplayeronlinehd.com/myplay/watch.html?id=max4",
  },
  {
    key: "hbo max 5",
    title: "HBO Max 5",
    url: "https://meuplayeronlinehd.com/myplay/watch.html?id=max5",
  },
  {
    key: "sbt",
    title: "SBT",
    url: "https://meuplayeronlinehd.com/myplay/watch.html?id=sbt",
  },
];
const PREMIERE_SPORTV_POOL: readonly BroadcastChannelTarget[] = [
  {
    key: "premiere",
    title: "Premiere",
    url: "https://meuplayeronlinehd.com/myplay/watch.html?id=premiere",
  },
  {
    key: "premiere 2",
    title: "Premiere 2",
    url: "https://meuplayeronlinehd.com/myplay/watch.html?id=premiere2",
  },
  {
    key: "premiere 3",
    title: "Premiere 3",
    url: "https://meuplayeronlinehd.com/myplay/watch.html?id=premiere3",
  },
  {
    key: "premiere 4",
    title: "Premiere 4",
    url: "https://meuplayeronlinehd.com/myplay/watch.html?id=premiere4",
  },
  {
    key: "premiere 5",
    title: "Premiere 5",
    url: "https://meuplayeronlinehd.com/myplay/watch.html?id=premiere5",
  },
  {
    key: "premiere 6",
    title: "Premiere 6",
    url: "https://meuplayeronlinehd.com/myplay/watch.html?id=premiere6",
  },
  {
    key: "premiere 7",
    title: "Premiere 7",
    url: "https://meuplayeronlinehd.com/myplay/watch.html?id=premiere7",
  },
  {
    key: "premiere 8",
    title: "Premiere 8",
    url: "https://meuplayeronlinehd.com/myplay/watch.html?id=premiere8",
  },
  {
    key: "sportv",
    title: "SporTV",
    url: "https://meuplayeronlinehd.com/myplay/watch.html?id=sportv",
  },
  {
    key: "sportv 2",
    title: "SporTV 2",
    url: "https://meuplayeronlinehd.com/myplay/watch.html?id=sportv2",
  },
  {
    key: "sportv 3",
    title: "SporTV 3",
    url: "https://meuplayeronlinehd.com/myplay/watch.html?id=sportv3",
  },
];
const SPORTV_POOL: readonly BroadcastChannelTarget[] = [
  ...PREMIERE_SPORTV_POOL.slice(8),
  ...PREMIERE_SPORTV_POOL.slice(0, 8),
];
const PRIME_VIDEO_POOL: readonly BroadcastChannelTarget[] = [
  {
    key: "prime video 1",
    title: "Prime Video 1",
    url: "https://meuplayeronlinehd.com/myplay/watch.html?id=primevideo1",
  },
  {
    key: "prime video 2",
    title: "Prime Video 2",
    url: "https://meuplayeronlinehd.com/myplay/watch.html?id=primevideo2",
  },
  {
    key: "prime video 3",
    title: "Prime Video 3",
    url: "https://meuplayeronlinehd.com/myplay/watch.html?id=primevideo3",
  },
  {
    key: "prime video 4",
    title: "Prime Video 4",
    url: "https://meuplayeronlinehd.com/myplay/watch.html?id=primevideo4",
  },
  ...PREMIERE_SPORTV_POOL,
];
const PARAMOUNT_ESPN_POOL: readonly BroadcastChannelTarget[] = [
  {
    key: "paramount plus",
    title: "Paramount+ 1",
    url: "https://meuplayeronlinehd.com/myplay/watch.html?id=paramount1",
  },
  {
    key: "paramount plus 2",
    title: "Paramount+ 2",
    url: "https://meuplayeronlinehd.com/myplay/watch.html?id=paramount2",
  },
  {
    key: "paramount plus 3",
    title: "Paramount+ 3",
    url: "https://meuplayeronlinehd.com/myplay/watch.html?id=paramount3",
  },
  {
    key: "paramount plus 4",
    title: "Paramount+ 4",
    url: "https://meuplayeronlinehd.com/myplay/watch.html?id=paramount4",
  },
  ...CAZE_EURO_POOL.slice(4, 10),
];
const ESPN_POOL: readonly BroadcastChannelTarget[] = [
  ...CAZE_EURO_POOL.slice(4, 10),
  ...CAZE_EURO_POOL.slice(0, 4),
  ...PARAMOUNT_ESPN_POOL.slice(0, 4),
];
const SPORTYNET_POOL: readonly BroadcastChannelTarget[] = [
  {
    key: "sportynet",
    title: "SportyNet",
    url: "https://meuplayeronlinehd.com/myplay/watch.html?id=sportynet",
  },
  ...CAZE_EURO_POOL.slice(11),
  {
    key: "xsports",
    title: "XSports",
    url: "https://meuplayeronlinehd.com/myplay/watch.html?id=xsports",
  },
  {
    key: "nsports",
    title: "NSports",
    url: "https://meuplayeronlinehd.com/myplay/watch.html?id=nsports",
  },
];
function sanitizeMatchChannel(match: PulsoMatch): PulsoMatch {
  const category = inferCategory(`${match.competition} ${match.title}`);
  if (
    category !== "MMA" &&
    /\bcombate\b/i.test(match.channelTitle) &&
    /\bprime\s*video\b/i.test(match.channelTitle)
  ) {
    return {
      ...match,
      channelTitle: "Prime Video 1",
      url: "https://meuplayeronlinehd.com/myplay/watch.html?id=primevideo1",
    };
  }
  return match;
}
function selectBroadcastPool(
  match: PreparedMatch,
  baseChannelKey: string,
): readonly BroadcastChannelTarget[] {
  const comp = normalizeLabel(match.source.competition);
  if (
    /champions league|liga dos campeoes|paulistao/.test(comp) ||
    /^(hbo max|max|tnt|space)\b/.test(baseChannelKey)
  ) {
    return MAX_TNT_POOL;
  }
  if (
    /europa league|liga europa|conference league/.test(comp) ||
    /^cazetv\b|^bandsports\b/.test(baseChannelKey)
  ) {
    return CAZE_EURO_POOL;
  }
  if (/libertadores|sul americana|sudamericana/.test(comp) || /^paramount\b/.test(baseChannelKey)) {
    return PARAMOUNT_ESPN_POOL;
  }
  if (/^prime video\b/.test(baseChannelKey)) {
    return PRIME_VIDEO_POOL;
  }
  if (/^sportv\b/.test(baseChannelKey)) {
    return SPORTV_POOL;
  }
  if (
    /brasileir|copa do brasil|serie a\b|serie b\b|carioca|mineiro|gaucho/.test(comp) ||
    /^premiere\b/.test(baseChannelKey)
  ) {
    return PREMIERE_SPORTV_POOL;
  }
  if (/^espn\b/.test(baseChannelKey)) {
    return ESPN_POOL;
  }
  if (/^sportynet\b|^xsports\b|^nsports\b/.test(baseChannelKey)) {
    return SPORTYNET_POOL;
  }
  return [...CAZE_EURO_POOL, ...PREMIERE_SPORTV_POOL, ...MAX_TNT_POOL];
}
function fixturePriority(match: PreparedMatch): number {
  const home = match.source.home_team.trim();
  const away = match.source.away_team.trim();
  const title = match.source.title.trim() || `${home} x ${away}`;
  return fameScore({
    id: String(match.source.id),
    title,
    description: null,
    poster: null,
    category: inferCategory(`${match.source.competition} ${title}`),
    competition: match.source.competition || "Futebol",
    teams: {
      home: { name: home, logo: "" },
      away: { name: away, logo: "" },
    },
    start_time: match.source.kickoff_at,
    start_timestamp: match.unix,
    status: "upcoming",
    popular: false,
    embeds: [],
  });
}
function resolveChannelCollisions(
  matches: PreparedMatch[],
  reidos: { event: ApiSportEvent; prepared: PreparedEvent }[],
  _channels: PulsoEmbedSource[],
): PreparedMatch[] {
  if (matches.length <= 1) return matches;
  interface FixtureSlot {
    group: PreparedMatch[];
    rep: PreparedMatch;
    baseKey: string;
    priority: number;
  }
  const grouped = groupFixtures(matches);
  const fixtures: FixtureSlot[] = grouped.map((group) => {
    const rep = richestMatch(group);
    const baseKey = channelGroupKey(rep.source.channelTitle || "Player");
    return {
      group,
      rep,
      baseKey,
      priority: fixturePriority(rep),
    };
  });
  const occupied = new Map<string, number[]>();
  const isOccupied = (key: string, unix: number): boolean => {
    const times = occupied.get(key);
    return times != null && times.some((t) => Math.abs(t - unix) < COLLISION_WINDOW_SECONDS);
  };
  const claimChannel = (key: string, unix: number): void => {
    if (!key || unix <= 0) return;
    const times = occupied.get(key);
    if (times) times.push(unix);
    else occupied.set(key, [unix]);
  };
  for (const { event, prepared } of reidos) {
    if (event.start_timestamp <= 0) continue;
    if (fixtures.some((f) => sameFixture(prepared, f.rep))) continue;
    for (const embed of event.embeds) {
      const key = channelGroupKey(embed.provider);
      if (key) claimChannel(key, event.start_timestamp);
    }
  }
  const byBaseKey = new Map<string, FixtureSlot[]>();
  for (const fixture of fixtures) {
    if (!fixture.baseKey || fixture.rep.unix <= 0) continue;
    if (!isPlayable(fixture.rep.source.channelTitle || "Player", fixture.rep.source.url, "embed")) {
      continue;
    }
    const list = byBaseKey.get(fixture.baseKey);
    if (list) list.push(fixture);
    else byBaseKey.set(fixture.baseKey, [fixture]);
  }
  const clusters: { baseKey: string; items: FixtureSlot[] }[] = [];
  for (const [baseKey, list] of byBaseKey) {
    const sorted = [...list].sort(
      (a, b) => a.rep.unix - b.rep.unix || a.rep.source.id - b.rep.source.id,
    );
    let current: FixtureSlot[] = [];
    for (const item of sorted) {
      const first = current[0];
      if (!first || item.rep.unix - first.rep.unix < COLLISION_WINDOW_SECONDS) {
        current.push(item);
      } else {
        clusters.push({ baseKey, items: current });
        current = [item];
      }
    }
    if (current.length > 0) clusters.push({ baseKey, items: current });
  }
  const assignments = new Map<
    number,
    {
      channelTitle: string;
      url: string;
    }
  >();
  const nonCollidingSingles = new Set<FixtureSlot>();
  for (const cluster of clusters) {
    if (cluster.items.length === 1) {
      const only = cluster.items[0]!;
      if (!isOccupied(cluster.baseKey, only.rep.unix)) {
        claimChannel(cluster.baseKey, only.rep.unix);
        nonCollidingSingles.add(only);
        if (
          cluster.baseKey === "cazetv" &&
          /^caz[eé]\s*tv(?:\s*\[[^\]]+\])?$/i.test(only.rep.source.channelTitle)
        ) {
          for (const item of only.group) {
            assignments.set(item.source.id, {
              channelTitle: "CazéTV 1",
              url: only.rep.source.url,
            });
          }
        }
      }
    }
  }
  for (const cluster of clusters) {
    if (cluster.items.length === 1 && nonCollidingSingles.has(cluster.items[0]!)) {
      continue;
    }
    const byComp = new Map<string, FixtureSlot[]>();
    for (const item of cluster.items) {
      const compKey = normalizeLabel(item.rep.source.competition || "futebol");
      const group = byComp.get(compKey);
      if (group) group.push(item);
      else byComp.set(compKey, [item]);
    }
    const compBuckets = [...byComp.values()].map((bucket) =>
      bucket.sort((a, b) => b.priority - a.priority || a.rep.source.id - b.rep.source.id),
    );
    compBuckets.sort(
      (a, b) =>
        (b[0]?.priority ?? 0) - (a[0]?.priority ?? 0) ||
        (a[0]?.rep.source.id ?? 0) - (b[0]?.rep.source.id ?? 0),
    );
    const ordered: FixtureSlot[] = [];
    const maxLen = Math.max(0, ...compBuckets.map((b) => b.length));
    for (let i = 0; i < maxLen; i++) {
      for (const bucket of compBuckets) {
        const slot = bucket[i];
        if (slot) ordered.push(slot);
      }
    }
    for (let idx = 0; idx < ordered.length; idx++) {
      const slot = ordered[idx]!;
      const pool = selectBroadcastPool(slot.rep, cluster.baseKey);
      const chosen =
        pool.find((target) => !isOccupied(target.key, slot.rep.unix)) ?? pool[idx % pool.length]!;
      claimChannel(chosen.key, slot.rep.unix);
      for (const item of slot.group) {
        assignments.set(item.source.id, {
          channelTitle: chosen.title,
          url: chosen.url,
        });
      }
    }
  }
  if (assignments.size === 0) return matches;
  return matches.map((match) => {
    const assigned = assignments.get(match.source.id);
    if (!assigned) return match;
    return {
      ...match,
      source: {
        ...match.source,
        channelTitle: assigned.channelTitle,
        url: assigned.url,
      },
    };
  });
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
      (embed) => /disney/i.test(baseProvider(embed.provider)) || /disney/i.test(embed.embed_url),
    );
  });
}
function eventTeamNames(event: ApiSportEvent): {
  home: string;
  away: string;
} | null {
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
  left: {
    day: string;
    home: string;
    away: string;
  },
  right: {
    day: string;
    home: string;
    away: string;
  },
): boolean {
  if (!left.day || left.day !== right.day) return false;
  return sameTeams(left, right);
}
function sameTeams(
  left: {
    home: string;
    away: string;
  },
  right: {
    home: string;
    away: string;
  },
): boolean {
  if (!left.home || !left.away || !right.home || !right.away) return false;
  const direct =
    teamsLooselyEqual(left.home, right.home) && teamsLooselyEqual(left.away, right.away);
  const swapped =
    teamsLooselyEqual(left.home, right.away) && teamsLooselyEqual(left.away, right.home);
  return direct || swapped;
}
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
    const group = groups.find((items) => items[0] && sameFixture(items[0], match));
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
function channelArtSet(channels: PulsoEmbedSource[]): Set<string> {
  const set = new Set<string>();
  for (const channel of channels) {
    const art = channel.thumbnail?.trim();
    if (art) {
      set.add(art);
      const resolved = resolvePulsoAsset(art);
      if (resolved) set.add(resolved);
    }
  }
  return set;
}
function realPoster(
  value: string | null | undefined,
  channels: PulsoEmbedSource[] | Set<string>,
  channelThumbnail = "",
): string | null {
  const raw = value?.trim() ?? "";
  if (!raw || raw.startsWith("data:")) return null;
  if (isStockPhoto(raw) || pulsoLogoFile(raw)) return null;
  const resolved = resolvePulsoAsset(raw);
  const thumb = channelThumbnail.trim();
  if (thumb && (raw === thumb || resolved === resolvePulsoAsset(thumb))) return null;
  if (channels instanceof Set) {
    if (channels.has(raw) || channels.has(resolved)) return null;
  } else {
    if (
      channels.some((channel) => {
        const channelArt = channel.thumbnail.trim();
        return (
          channelArt.length > 0 &&
          (raw === channelArt || resolved === resolvePulsoAsset(channelArt))
        );
      })
    ) {
      return null;
    }
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
const CHANNEL_ALIASES = new Map<string, string>([
  ["caze tv", "cazetv"],
  ["caze tv 1", "cazetv"],
  ["cazetv 1", "cazetv"],
  ["caze tv 2", "cazetv 2"],
  ["caze tv 3", "cazetv 3"],
  ["sport tv", "sportv"],
  ["sportv2", "sportv 2"],
  ["sportv3", "sportv 3"],
  ["sportv4", "sportv 4"],
  ["espn2", "espn 2"],
  ["espn3", "espn 3"],
  ["espn4", "espn 4"],
  ["espn5", "espn 5"],
  ["espn6", "espn 6"],
  ["prime video", "prime video 1"],
  ["a e", "ae"],
  ["a e e", "ae"],
  ["arte1", "arte 1"],
  ["cartoon", "cartoon network"],
  ["discovery", "discovery channel"],
  ["discovery home health", "discovery home e health"],
  ["premiere clubes", "premiere"],
  ["paramount plus 1", "paramount plus"],
  ["paramount", "paramount plus"],
  ["band sports", "bandsports"],
]);
function canonicalChannel(name: string): string {
  const normalized = normalizeLabel(name)
    .replace(/\bfc\b/g, " ")
    .replace(/\b(hd|sd|fhd|uhd|4k|hls)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized) return "";
  return CHANNEL_ALIASES.get(normalized) ?? normalized;
}
export function channelGroupKey(name: string): string {
  return canonicalChannel(splitChannelTag(baseProvider(name)).stem);
}
function normalizeLabel(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/&/g, " e ")
    .replace(/\+/g, " plus ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}
function parseKickoff(kickoff: string): {
  day: string;
  unix: number;
} | null {
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
function parseUtcTimestamp(value: string | undefined): number | null {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return null;
  const iso = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(?::\d{2})?$/.test(trimmed)
    ? `${trimmed.replace(" ", "T")}Z`
    : trimmed;
  const unixMs = Date.parse(iso);
  return Number.isNaN(unixMs) ? null : unixMs;
}
function shiftPulsoMatchDay(match: PulsoMatch, days: number): PulsoMatch {
  const parsed = /^(\d{4})-(\d{2})-(\d{2})([ T]\d{2}:\d{2}(?::\d{2})?.*)$/.exec(
    match.kickoff_at.trim(),
  );
  if (!parsed) return match;
  const utc = Date.UTC(Number(parsed[1]), Number(parsed[2]) - 1, Number(parsed[3]) + days);
  const nextDate = new Date(utc);
  const year = nextDate.getUTCFullYear();
  const month = String(nextDate.getUTCMonth() + 1).padStart(2, "0");
  const day = String(nextDate.getUTCDate()).padStart(2, "0");
  return {
    ...match,
    kickoff_at: `${year}-${month}-${day}${parsed[4]}`,
    status: "scheduled",
  };
}
const SAO_PAULO_DAY_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
function saoPauloDay(unixSeconds: number): string {
  const parts = SAO_PAULO_DAY_FORMATTER.formatToParts(new Date(unixSeconds * 1000));
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
  if (!url || /disney/i.test(baseProvider(title)) || /disney/i.test(url)) return false;
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
