import type { ApiEmbed, ApiSportEvent } from "@/lib/api";
import { normalizeTeamKey } from "@/lib/team-logos";
export interface UclFixtureConfig {
  channels: string[];
  primaryChannel: string;
  extraEmbeds?: {
    provider: string;
    url: string;
    allow?: string;
  }[];
}
export const UCL_FIXTURES: Record<string, UclFixtureConfig> = {
  "barcelona|psg": {
    channels: ["HBO Max 1", "TNT", "SBT"],
    primaryChannel: "HBO Max 1",
    extraEmbeds: [
      {
        provider: "HBO MAX 1 [SPT]",
        url: "https://sporturbo.link/player/canais/ampv-max1",
        allow: "autoplay; encrypted-media; picture-in-picture; fullscreen",
      },
      {
        provider: "HBO MAX 1 [MPHD2]",
        url: "https://meuplayeronlinehd.com/myplay/watch.html?id=max1-2",
        allow: "autoplay; encrypted-media; picture-in-picture; fullscreen",
      },
    ],
  },
  "fenerbahce|slavia praga": {
    channels: ["Space"],
    primaryChannel: "Space",
    extraEmbeds: [
      {
        provider: "Space",
        url: "https://meuplayeronlinehd.com/myplay/watch.html?id=space",
        allow: "autoplay; encrypted-media; picture-in-picture; fullscreen",
      },
    ],
  },
  "borussia dortmund|sabah": {
    channels: ["TNT"],
    primaryChannel: "TNT",
  },
  "liverpool|villarreal": {
    channels: ["Space"],
    primaryChannel: "Space",
    extraEmbeds: [
      {
        provider: "Space",
        url: "https://meuplayeronlinehd.com/myplay/watch.html?id=space",
        allow: "autoplay; encrypted-media; picture-in-picture; fullscreen",
      },
    ],
  },
  "aek atenas|manchester city": {
    channels: ["HBO Max 2"],
    primaryChannel: "HBO Max 2",
    extraEmbeds: [
      {
        provider: "HBO MAX 2 [SPT]",
        url: "https://sporturbo.link/player/canais/ampv-max2",
        allow: "autoplay; encrypted-media; picture-in-picture; fullscreen",
      },
      {
        provider: "HBO MAX 2 [MPHD2]",
        url: "https://meuplayeronlinehd.com/myplay/watch.html?id=max2-2",
        allow: "autoplay; encrypted-media; picture-in-picture; fullscreen",
      },
    ],
  },
  "bodo glimt|napoli": {
    channels: ["HBO Max 3"],
    primaryChannel: "HBO Max 3",
    extraEmbeds: [
      {
        provider: "HBO MAX 3 [SPT]",
        url: "https://sporturbo.link/player/canais/ampv-max3",
        allow: "autoplay; encrypted-media; picture-in-picture; fullscreen",
      },
      {
        provider: "HBO MAX 3 [MPHD2]",
        url: "https://meuplayeronlinehd.com/myplay/watch.html?id=max3-2",
        allow: "autoplay; encrypted-media; picture-in-picture; fullscreen",
      },
    ],
  },
  "porto|psv": {
    channels: ["HBO Max 4"],
    primaryChannel: "HBO Max 4",
    extraEmbeds: [
      {
        provider: "HBO MAX 4 [SPT]",
        url: "https://sporturbo.link/player/canais/ampv-max4",
        allow: "autoplay; encrypted-media; picture-in-picture; fullscreen",
      },
      {
        provider: "HBO MAX 4 [MPHD2]",
        url: "https://meuplayeronlinehd.com/myplay/watch.html?id=max4-2",
        allow: "autoplay; encrypted-media; picture-in-picture; fullscreen",
      },
    ],
  },
  "roma|slovan bratislava": {
    channels: ["HBO Max 5"],
    primaryChannel: "HBO Max 5",
    extraEmbeds: [
      {
        provider: "HBO MAX 5 [SPT]",
        url: "https://sporturbo.link/player/canais/ampv-max5",
        allow: "autoplay; encrypted-media; picture-in-picture; fullscreen",
      },
      {
        provider: "HBO MAX 5 [MPHD2]",
        url: "https://meuplayeronlinehd.com/myplay/watch.html?id=max5-2",
        allow: "autoplay; encrypted-media; picture-in-picture; fullscreen",
      },
    ],
  },
  "atletico madrid|stuttgart": {
    channels: ["Max"],
    primaryChannel: "Max",
  },
  "rb leipzig|real madrid": {
    channels: ["TNT", "Max"],
    primaryChannel: "TNT",
  },
  "arsenal|bayern munchen": {
    channels: ["Space", "Max"],
    primaryChannel: "Space",
  },
  "como|manchester united": {
    channels: ["Max"],
    primaryChannel: "Max",
  },
  "galatasaray|lille": {
    channels: ["Max"],
    primaryChannel: "Max",
  },
  "aston villa|viking": {
    channels: ["Max"],
    primaryChannel: "Max",
  },
  "club brugge|lens": {
    channels: ["Max"],
    primaryChannel: "Max",
  },
  "lask linz|sporting": {
    channels: ["Max"],
    primaryChannel: "Max",
  },
  "inter|shakhtar": {
    channels: ["Max"],
    primaryChannel: "Max",
  },
  "feyenoord|real betis": {
    channels: ["Space", "Max"],
    primaryChannel: "Space",
  },
};
export function isUclEvent(event: { competition?: string | null; title?: string | null }): boolean {
  const text = `${event.competition ?? ""} ${event.title ?? ""}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");
  return /champions league|liga dos campeoes|\bucl\b/.test(text);
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
export function uclPairKey(home: string, away: string): string {
  const h = normalizeTeamKey(home);
  const a = normalizeTeamKey(away);
  return h < a ? `${h}|${a}` : `${a}|${h}`;
}
export function isBogusPulsoMatchUrl(pair: string, url: string): boolean {
  if (pair === "barcelona|psg") return false;
  return /(?:\/|=)max1(?:[^\d]|$)/i.test(url);
}
function isAlternative(provider: string): boolean {
  return /alternativo/i.test(provider);
}
function nameCarriesChannelId(provider: string): boolean {
  const match = /^(.*?)(?:\s*\[([^\]]+)\])\s*$/.exec(provider.trim());
  if (match?.[2]) return true;
  const stem = (match?.[1] ?? provider).trim().toLocaleLowerCase("pt-BR");
  return /\s\d+$/.test(stem);
}
function renumberOptions(embeds: ApiEmbed[]): ApiEmbed[] {
  return embeds.map((embed, index) => {
    const policy = embed.allow?.trim();
    const next: ApiEmbed = {
      provider: embed.provider,
      quality: nameCarriesChannelId(embed.provider) ? embed.quality.trim() : `Opção ${index + 1}`,
      embed_url: embed.embed_url,
    };
    if (policy) next.allow = policy;
    return next;
  });
}
export function curateUclEvent(event: ApiSportEvent): ApiSportEvent {
  if (!isUclEvent(event)) return event;
  const names = eventTeamNames(event);
  if (!names) return event;
  const pair = uclPairKey(names.home, names.away);
  const config = UCL_FIXTURES[pair];
  const primaryChannel = config?.primaryChannel || "Max";
  const isPsgBarca = pair === "barcelona|psg";
  const validEmbeds = event.embeds.filter((embed) => {
    if (isPsgBarca) return true;
    return !/(?:\/|=)max1(?:[^\d]|$)/i.test(embed.embed_url);
  });
  const embeds: ApiEmbed[] = [];
  const seen = new Set<string>();
  const push = (embed: ApiEmbed) => {
    if (!embed.embed_url || seen.has(embed.embed_url)) return;
    seen.add(embed.embed_url);
    embeds.push(embed);
  };
  if (isPsgBarca) {
    for (const extra of config?.extraEmbeds ?? []) {
      push({
        provider: extra.provider,
        quality: "",
        embed_url: extra.url,
        ...(extra.allow ? { allow: extra.allow } : {}),
      });
    }
    for (const embed of validEmbeds) {
      let provider = embed.provider;
      if (/hbo/i.test(provider)) {
        provider = isAlternative(provider) ? "TNT (Alternativo)" : "TNT";
      }
      push({
        ...embed,
        provider,
      });
    }
    return {
      ...event,
      embeds: renumberOptions(embeds),
    };
  }
  for (const extra of config?.extraEmbeds ?? []) {
    push({
      provider: extra.provider,
      quality: "",
      embed_url: extra.url,
      ...(extra.allow ? { allow: extra.allow } : {}),
    });
  }
  for (const embed of validEmbeds) {
    let provider = embed.provider;
    if (/hbo\s*max(\s*1)?|max\b/i.test(provider)) {
      provider = isAlternative(provider) ? `${primaryChannel} (Alternativo)` : primaryChannel;
    }
    push({
      ...embed,
      provider,
    });
  }
  return {
    ...event,
    embeds: renumberOptions(embeds),
  };
}
