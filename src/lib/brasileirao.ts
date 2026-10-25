import type { ApiSportEvent } from "@/lib/api";
import { normalizeTeamKey } from "@/lib/team-logos";

/**
 * 2026 CBF rosters. The catalog sometimes swaps the division:
 * Vasco x Corinthians arrived as Série B, São Bernardo x Vila Nova as bare "Brasileirão".
 */
const SERIE_A_2026 = new Set([
  "athletico pr",
  "atletico mg",
  "bahia",
  "botafogo",
  "chapecoense",
  "corinthians",
  "coritiba",
  "cruzeiro",
  "flamengo",
  "fluminense",
  "gremio",
  "internacional",
  "mirassol",
  "palmeiras",
  "red bull bragantino",
  "remo",
  "santos",
  "sao paulo",
  "vasco da gama",
  "vitoria",
]);

const SERIE_B_2026 = new Set([
  "america mg",
  "athletic club",
  "atletico go",
  "avai",
  "botafogo sp",
  "ceara",
  "crb",
  "criciuma",
  "cuiaba",
  "fortaleza",
  "goias",
  "juventude",
  "londrina",
  "nautico",
  "novorizontino",
  "operario",
  "ponte preta",
  "sao bernardo",
  "sport",
  "vila nova",
]);

function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");
}

function isBrasileiraoLabel(competition: string): boolean {
  return /brasileir/.test(fold(competition));
}

function divisionOf(name: string): "A" | "B" | null {
  if (/\bbilbao\b/.test(fold(name))) return null;
  const key = normalizeTeamKey(name);
  if (SERIE_A_2026.has(key)) return "A";
  if (SERIE_B_2026.has(key)) return "B";
  return null;
}

/** Replace a Brasileirão label when both clubs belong to the same 2026 division. */
export function correctBrasileiraoEvent(event: ApiSportEvent): ApiSportEvent {
  if (!isBrasileiraoLabel(event.competition)) return event;
  const home = event.teams?.home.name ?? "";
  const away = event.teams?.away.name ?? "";
  if (!home || !away) return event;
  const homeDivision = divisionOf(home);
  const awayDivision = divisionOf(away);
  if (!homeDivision || homeDivision !== awayDivision) return event;
  const competition = homeDivision === "A" ? "Brasileirão Série A" : "Brasileirão Série B";
  if (event.competition === competition) return event;
  return { ...event, competition };
}
