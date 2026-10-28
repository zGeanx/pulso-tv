import { normalizeTeamKey } from "@/lib/team-logos";
import type { PulsoMatch } from "@/lib/pulso-api";

const SHOW_BEFORE_MS = 6 * 60 * 60 * 1000;
const SHOW_AFTER_MS = 6 * 60 * 60 * 1000;

/**
 * The public match list left out Fluminense x Internacional on 28 Oct 2026
 * while CazéTV was live with the official YouTube broadcast.
 * The row drops after the window, and also when the catalog already has the fixture.
 */
const CAZE_BROADCASTS: readonly PulsoMatch[] = [
  {
    id: 900001,
    slug: "fluminense-x-internacional-28-10",
    home_team: "Fluminense",
    away_team: "Internacional",
    competition: "Brasileirão",
    kickoff_at: "2026-10-28 19:30:00",
    status: "scheduled",
    active: true,
    url: "https://www.youtube.com/embed/t4pf4qZ0c14",
    allow: "autoplay; encrypted-media; picture-in-picture; fullscreen",
    thumbnail: "",
    match_image: "",
    title: "Fluminense x Internacional",
    channelTitle: "CazéTV",
  },
];

export function supplementCazeMatches(matches: PulsoMatch[], nowMs = Date.now()): PulsoMatch[] {
  const extras = CAZE_BROADCASTS.filter(
    (extra) => inBroadcastWindow(extra.kickoff_at, nowMs) && !hasPlayableFixture(matches, extra),
  );
  return extras.length > 0 ? [...matches, ...extras] : matches;
}

function inBroadcastWindow(kickoff: string, nowMs: number): boolean {
  const start = kickoffMs(kickoff);
  if (start == null) return false;
  return nowMs >= start - SHOW_BEFORE_MS && nowMs <= start + SHOW_AFTER_MS;
}

function kickoffMs(kickoff: string): number | null {
  const match = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}):(\d{2})/.exec(kickoff.trim());
  const day = match?.[1];
  const hours = match?.[2];
  const minutes = match?.[3];
  if (!day || !hours || !minutes) return null;
  const unixMs = Date.parse(`${day}T${hours}:${minutes}:00-03:00`);
  return Number.isNaN(unixMs) ? null : unixMs;
}

function hasPlayableFixture(matches: PulsoMatch[], extra: PulsoMatch): boolean {
  const day = extra.kickoff_at.slice(0, 10);
  const home = normalizeTeamKey(extra.home_team);
  const away = normalizeTeamKey(extra.away_team);
  return matches.some((match) => {
    if (!match.active || !match.kickoff_at.startsWith(day) || !hasHttpUrl(match.url)) return false;
    if (/disney/i.test(match.channelTitle) || /disney/i.test(match.url)) return false;
    const left = normalizeTeamKey(match.home_team);
    const right = normalizeTeamKey(match.away_team);
    return (left === home && right === away) || (left === away && right === home);
  });
}

function hasHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "").toLocaleLowerCase("en-US");
    if (host === "example.com" || host.endsWith(".example.com")) return false;
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}
