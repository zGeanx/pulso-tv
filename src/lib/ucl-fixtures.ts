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

/**
 * Fixture channel mapping for UEFA Champions League matches.
 * Resolves the real broadcast channels (TNT, Space, Max 1-5) and prevents
 * all matches from falling back to HBO Max 1 (PSG x Barcelona).
 */
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
    channels: ["HBO Max"],
    primaryChannel: "HBO Max",
  },
};

export function isUclEvent(event: { competition?: string | null; title?: string | null }): boolean {
  const text = `${event.competition ?? ""} ${event.title ?? ""}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");
  return /champions league|liga dos campeoes|\bucl\b/.test(text);
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

/**
 * Curates a UEFA Champions League event to ensure:
 * 1. Only PSG x Barcelona has HBO Max 1 (beside TNT and SBT).
 * 2. Fenerbahçe x Slavia Praga and Liverpool x Villarreal are labeled as Space.
 * 3. Sabah x Borussia Dortmund is labeled as TNT.
 * 4. Man City, Napoli, Porto, Roma have HBO Max 2, 3, 4, 5 respectively.
 * 5. Stuttgart x Atlético de Madrid has HBO Max.
 * 6. Bogus max1 streams from Pulso API are stripped from other matches.
 * 7. Real match streams from esportesembed.org are preserved and prioritized.
 */
export function curateUclEvent(event: ApiSportEvent): ApiSportEvent {
  if (!isUclEvent(event)) return event;
  const names = eventTeamNames(event);
  if (!names) return event;
  const pair = uclPairKey(names.home, names.away);
  const config = UCL_FIXTURES[pair];
  if (!config) return event;

  // Filter out any bogus max1 streams mistakenly attached to non-PSG fixtures
  const validEmbeds = event.embeds.filter((embed) => {
    if (pair === "barcelona|psg") return true;
    return !/(?:\/|=)max1(?:[^\d]|$)/i.test(embed.embed_url);
  });

  const embeds: ApiEmbed[] = [];
  const seen = new Set<string>();

  const push = (embed: ApiEmbed) => {
    if (!embed.embed_url || seen.has(embed.embed_url)) return;
    seen.add(embed.embed_url);
    embeds.push(embed);
  };

  if (pair === "barcelona|psg") {
    // 1. HBO Max 1 catalog channel feeds
    for (const extra of config.extraEmbeds ?? []) {
      push({
        provider: extra.provider,
        quality: "",
        embed_url: extra.url,
        allow: extra.allow,
      });
    }

    // 2. Real streams from Reidos (Option 1 is TNT feed, Option 2 is TNT Alternativo, Option 3 is SBT)
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

  // 1. Extra embeds for the designated channel (Space / HBO Max 2-5)
  for (const extra of config.extraEmbeds ?? []) {
    push({
      provider: extra.provider,
      quality: "",
      embed_url: extra.url,
      allow: extra.allow,
    });
  }

  // 2. Existing streams from Reidos/Pulso with provider rewritten to match the fixture
  for (const embed of validEmbeds) {
    let provider = embed.provider;
    if (/hbo\s*max/i.test(provider)) {
      provider = isAlternative(provider)
        ? `${config.primaryChannel} (Alternativo)`
        : config.primaryChannel;
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
