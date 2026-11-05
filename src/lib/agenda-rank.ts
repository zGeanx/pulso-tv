import type { ApiSportEvent } from "@/lib/api";
import { EVENT_STATUS_ORDER, getEventEffectiveStatus } from "@/lib/sport-status";
const MIN_FAME = 70;
const WOMENS =
  /femin|femen|femmin|frauen|damen|\bladies\b|\bwomen\b|\bwoman\b|\bnwsl\b|\bwsl\b|\buwcl\b|\bfem\b/;
const BLOCKED =
  /\b(amistosos?|friendly|friendlies|serie\s*[cd]|terceira divisao|quarta divisao|league (one|two)|3\.\s*liga|sub-?\d{2}|u-?\d{2}|under-?\d{2}|juvenil|futsal|campeonato turco|super lig)\b/;
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
  ["milan", 18],
  ["ac milan", 18],
  ["benfica", 16],
  ["porto", 16],
  ["boca juniors", 16],
  ["river plate", 16],
  ["tottenham", 16],
  ["leverkusen", 16],
  ["napoli", 14],
  ["ajax", 14],
  ["lyon", 14],
  ["real sociedad", 14],
  ["atalanta", 14],
  ["aston villa", 14],
  ["rb leipzig", 14],
  ["psv", 14],
  ["villarreal", 14],
  ["lazio", 14],
  ["monaco", 14],
  ["marseille", 14],
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
  ["celtic", 12],
  ["rangers", 12],
  ["crystal palace", 12],
  ["brighton", 12],
  ["west ham", 12],
  ["eintracht frankfurt", 12],
  ["stuttgart", 12],
  ["feyenoord", 12],
  ["real betis", 12],
  ["athletic bilbao", 12],
  ["fiorentina", 12],
  ["lille", 12],
  ["sevilla", 10],
  ["bournemouth", 10],
  ["freiburg", 10],
  ["hoffenheim", 10],
  ["az alkmaar", 10],
  ["anderlecht", 10],
  ["club brugge", 10],
  ["salzburg", 10],
  ["getafe", 10],
  ["olympiacos", 10],
  ["bologna", 10],
  ["trabzonspor", 8],
  ["braga", 8],
  ["sunderland", 8],
  ["dinamo zagreb", 8],
  ["sparta praga", 8],
  ["panathinaikos", 8],
  ["copenhagen", 8],
  ["ferencvaros", 6],
  ["ferencvarosi", 6],
  ["lech poznan", 6],
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
export function isWomensLabel(value: string): boolean {
  return WOMENS.test(fold(value));
}
export function isWomensEvent(event: ApiSportEvent): boolean {
  return isWomensLabel(blob(event));
}
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
export function headlineEvents(events: ApiSportEvent[]): ApiSportEvent[] {
  const now = Date.now() / 1000;
  const list = events.filter((event) => fameScore(event) >= MIN_FAME);
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
