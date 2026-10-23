import type { ApiSportEvent } from "@/lib/api";
import { EVENT_STATUS_ORDER, getEventEffectiveStatus } from "@/lib/sport-status";

/** A match below this is a lower division, a small league, or a minor fixture. */
const MIN_FAME = 70;

const WOMENS =
  /femin|femen|femmin|frauen|damen|\bladies\b|\bwomen\b|\bwoman\b|\bnwsl\b|\bwsl\b|\buwcl\b|\bfem\b/;

const BLOCKED =
  /\b(amistosos?|friendly|friendlies|serie\s*[cd]|terceira divisao|quarta divisao|league (one|two)|3\.\s*liga|sub-?\d{2}|u-?\d{2}|under-?\d{2}|juvenil|futsal|campeonato turco|super lig)\b/;

/** More specific leagues first. Score is how watched the competition is. */
const LEAGUES: ReadonlyArray<[RegExp, number]> = [
  [/champions league|liga dos campeoes/, 100],
  [/copa do mundo|world cup/, 100],
  [/mundial de clubes|club world cup/, 98],
  [/libertadores/, 96],
  [/premier league/, 94],
  [/la liga|laliga|campeonato espanhol/, 92],
  [/bundesliga/, 90],
  [/brasileirao serie b|brasileiro serie b|\bserie b\b/, 46],
  [/brasileirao|brasileiro/, 90],
  [/\bserie a\b/, 86],
  [/ligue 1|campeonato frances/, 84],
  [/europa league|liga europa/, 80],
  [/conference league/, 74],
  [/copa do brasil/, 78],
  [/sul-?americana|sudamericana/, 76],
  [/liga portugal|primeira liga/, 72],
  [/fa cup|copa del rey|coppa italia|dfb-pokal/, 70],
  [/eredivisie|campeonato holandes/, 64],
  [/campeonato argentino|liga profesional/, 62],
  [/\bchampionship\b/, 44],
  [/\bnba\b|\bnbb\b/, 88],
  [/\bufc\b/, 86],
  [/formula\s*1|\bf1\b/, 90],
];

/** One score per club. Longer names are listed first so "real madrid" beats "madrid". */
const CLUBS: ReadonlyArray<[string, number]> = [
  ["real madrid", 22],
  ["barcelona", 22],
  ["manchester city", 22],
  ["manchester united", 20],
  ["bayern", 22],
  ["liverpool", 20],
  ["psg", 20],
  ["paris saint", 20],
  ["juventus", 18],
  ["arsenal", 18],
  ["chelsea", 18],
  ["flamengo", 26],
  ["palmeiras", 24],
  ["corinthians", 24],
  ["sao paulo", 22],
  ["atletico madrid", 18],
  ["borussia", 16],
  ["inter de milao", 18],
  ["inter milan", 18],
  ["internazionale", 18],
  ["ac milan", 16],
  ["benfica", 16],
  ["porto", 16],
  ["boca juniors", 16],
  ["river plate", 16],
  ["tottenham", 16],
  ["napoli", 14],
  ["ajax", 14],
  ["gremio", 14],
  ["internacional", 14],
  ["fluminense", 14],
  ["botafogo", 14],
  ["atletico mg", 14],
  ["atletico mineiro", 14],
  ["cruzeiro", 12],
  ["vasco", 12],
  ["santos", 12],
  ["bahia", 10],
  ["sporting", 12],
  ["galatasaray", 14],
  ["fenerbahce", 14],
  ["besiktas", 14],
  ["newcastle", 12],
  ["roma", 12],
  ["sevilla", 10],
  ["trabzonspor", 8],
  ["braga", 8],
];

function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");
}

function blob(event: ApiSportEvent): string {
  return fold(
    `${event.competition} ${event.title} ${event.description ?? ""} ${event.category} ${event.teams?.home.name ?? ""} ${event.teams?.away.name ?? ""}`,
  );
}

const womensFixtures: string[] = [];

/** Women's football never belongs on the agenda, in any competition or friendly. */
export function isWomensLabel(value: string): boolean {
  return WOMENS.test(fold(value));
}

export function isWomensEvent(event: ApiSportEvent): boolean {
  return isWomensLabel(blob(event));
}

/** Remember fixtures removed from the agenda so the same match can be hidden on channel guides. */
export function rememberWomensFixtures(events: readonly ApiSportEvent[]): void {
  womensFixtures.length = 0;
  for (const event of events) {
    const title = fold(event.title).replace(/\s+/g, " ").trim();
    if (title.length > 3) womensFixtures.push(title);
  }
}

export function isWomensBroadcast(title: string): boolean {
  if (isWomensLabel(title)) return true;
  const text = fold(title);
  return womensFixtures.some((fixture) => text.includes(fixture));
}

function clubScore(name: string): number {
  const padded = ` ${fold(name)
    .replace(/[^a-z0-9]+/g, " ")
    .trim()} `;
  let best = 0;
  for (const [club, score] of CLUBS) {
    const needle = ` ${club} `;
    if (padded.includes(needle) && score > best) best = score;
  }
  return best;
}

/** 0 when the match is outside the main leagues and clubs. */
export function fameScore(event: ApiSportEvent): number {
  const text = blob(event);
  if (isWomensEvent(event) || BLOCKED.test(text)) return 0;
  const league = LEAGUES.find(([pattern]) => pattern.test(text));
  if (!league) return 0;
  const teams =
    (event.teams ? clubScore(event.teams.home.name) : 0) +
    (event.teams ? clubScore(event.teams.away.name) : 0);
  return league[1] + teams + (event.popular ? 4 : 0);
}

/** Main leagues only, live and upcoming matches first, ordered by relevance and kickoff. */
export function headlineEvents(events: ApiSportEvent[]): ApiSportEvent[] {
  const now = Date.now() / 1000;
  const filtered = events.filter((event) => {
    const status = getEventEffectiveStatus(event, now);
    return fameScore(event) >= MIN_FAME || status === "live";
  });

  const activeCount = filtered.filter(
    (event) => getEventEffectiveStatus(event, now) !== "finished",
  ).length;
  const list = activeCount > 0 ? filtered : events.filter((event) => !isWomensEvent(event));

  return list.sort((a, b) => {
    const statusA = getEventEffectiveStatus(a, now);
    const statusB = getEventEffectiveStatus(b, now);
    const statusDiff = EVENT_STATUS_ORDER[statusA] - EVENT_STATUS_ORDER[statusB];
    if (statusDiff !== 0) return statusDiff;

    if (statusA === "live") {
      const fame = fameScore(b) - fameScore(a);
      if (fame !== 0) return fame;
      return a.start_timestamp - b.start_timestamp;
    }

    if (statusA === "upcoming") {
      const timeDiff = a.start_timestamp - b.start_timestamp;
      if (timeDiff !== 0) return timeDiff;
      return fameScore(b) - fameScore(a);
    }

    const timeDiff = b.start_timestamp - a.start_timestamp;
    if (timeDiff !== 0) return timeDiff;
    return fameScore(b) - fameScore(a);
  });
}
