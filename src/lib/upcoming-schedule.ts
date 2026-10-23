import type { ApiEmbed, ApiSportEvent } from "@/lib/api";
import { resolveTeamCrests } from "@/lib/team-logos";

export interface UpcomingMatchSeed {
  slug: string;
  homeTeam: string;
  awayTeam: string;
  competition: string;
  category?: string;
  hour: number;
  minute: number;
  popular?: boolean;
  embeds: ApiEmbed[];
}

export const UPCOMING_SEEDS: UpcomingMatchSeed[] = [
  {
    slug: "real-madrid-x-barcelona",
    homeTeam: "Real Madrid",
    awayTeam: "Barcelona",
    competition: "La Liga",
    category: "Futebol",
    hour: 16,
    minute: 0,
    popular: true,
    embeds: [
      {
        provider: "ESPN [SPT]",
        quality: "HD",
        embed_url: "https://sporturbo.link/player/canais/ampv-espn1",
        allow: "autoplay; encrypted-media; picture-in-picture; fullscreen",
      },
    ],
  },
  {
    slug: "arsenal-x-chelsea",
    homeTeam: "Arsenal",
    awayTeam: "Chelsea",
    competition: "Premier League",
    category: "Futebol",
    hour: 16,
    minute: 30,
    popular: true,
    embeds: [
      {
        provider: "ESPN [SPT]",
        quality: "HD",
        embed_url: "https://sporturbo.link/player/canais/ampv-espn1",
        allow: "autoplay; encrypted-media; picture-in-picture; fullscreen",
      },
    ],
  },
  {
    slug: "manchester-city-x-liverpool",
    homeTeam: "Manchester City",
    awayTeam: "Liverpool",
    competition: "Premier League",
    category: "Futebol",
    hour: 17,
    minute: 30,
    popular: true,
    embeds: [
      {
        provider: "ESPN [SPT]",
        quality: "HD",
        embed_url: "https://sporturbo.link/player/canais/ampv-espn1",
        allow: "autoplay; encrypted-media; picture-in-picture; fullscreen",
      },
    ],
  },
  {
    slug: "internacional-x-gremio",
    homeTeam: "Internacional",
    awayTeam: "Grêmio",
    competition: "Brasileirão Série A",
    category: "Futebol",
    hour: 19,
    minute: 0,
    popular: true,
    embeds: [
      {
        provider: "Premiere [SPT]",
        quality: "HD",
        embed_url: "https://sporturbo.link/player/canais/ampv-premiere1",
        allow: "autoplay; encrypted-media; picture-in-picture; fullscreen",
      },
      {
        provider: "Sportv [SPT]",
        quality: "HD",
        embed_url: "https://sporturbo.link/player/canais/ampv-sportv1",
        allow: "autoplay; encrypted-media; picture-in-picture; fullscreen",
      },
    ],
  },
  {
    slug: "palmeiras-x-sao-paulo",
    homeTeam: "Palmeiras",
    awayTeam: "São Paulo",
    competition: "Brasileirão Série A",
    category: "Futebol",
    hour: 20,
    minute: 0,
    popular: true,
    embeds: [
      {
        provider: "Premiere [SPT]",
        quality: "HD",
        embed_url: "https://sporturbo.link/player/canais/ampv-premiere1",
        allow: "autoplay; encrypted-media; picture-in-picture; fullscreen",
      },
      {
        provider: "Sportv [SPT]",
        quality: "HD",
        embed_url: "https://sporturbo.link/player/canais/ampv-sportv1",
        allow: "autoplay; encrypted-media; picture-in-picture; fullscreen",
      },
    ],
  },
  {
    slug: "corinthians-x-santos",
    homeTeam: "Corinthians",
    awayTeam: "Santos",
    competition: "Brasileirão Série A",
    category: "Futebol",
    hour: 21,
    minute: 30,
    popular: true,
    embeds: [
      {
        provider: "Premiere [SPT]",
        quality: "HD",
        embed_url: "https://sporturbo.link/player/canais/ampv-premiere1",
        allow: "autoplay; encrypted-media; picture-in-picture; fullscreen",
      },
    ],
  },
];

/**
 * Generates high-profile fixtures scheduled for the next day (up to +1 day ahead)
 * so that when the current day has no active important fixtures or when matches finish,
 * the agenda is never left empty.
 */
export function generateNextDayUpcomingEvents(baseDate = new Date()): ApiSportEvent[] {
  const nextDay = new Date(baseDate);
  nextDay.setDate(nextDay.getDate() + 1);

  const year = nextDay.getFullYear();
  const month = nextDay.getMonth();
  const day = nextDay.getDate();

  const yyyy = String(year);
  const mm = String(month + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");

  return UPCOMING_SEEDS.map((seed) => {
    const matchDate = new Date(year, month, day, seed.hour, seed.minute, 0);
    const start_timestamp = Math.floor(matchDate.getTime() / 1000);
    const hh = String(seed.hour).padStart(2, "0");
    const min = String(seed.minute).padStart(2, "0");
    const start_time = `${yyyy}-${mm}-${dd} ${hh}:${min}:00`;

    const homeCrests = resolveTeamCrests(seed.homeTeam);
    const awayCrests = resolveTeamCrests(seed.awayTeam);

    return {
      id: `pulso-${seed.slug}-${mm}-${dd}`,
      title: `${seed.homeTeam} x ${seed.awayTeam}`,
      description: `${seed.competition} · Transmissão ao vivo`,
      poster: null,
      category: seed.category ?? "Futebol",
      competition: seed.competition,
      teams: {
        home: {
          name: seed.homeTeam,
          logo: homeCrests[0] ?? "",
          logos: homeCrests,
        },
        away: {
          name: seed.awayTeam,
          logo: awayCrests[0] ?? "",
          logos: awayCrests,
        },
      },
      start_time,
      start_timestamp,
      status: "upcoming",
      popular: seed.popular ?? true,
      embeds: seed.embeds,
    };
  });
}
