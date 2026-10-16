import type { ApiSportEvent } from "@/lib/api";
import { pulsoLogoFile, resolvePulsoAsset } from "@/lib/pulso-assets";

const runtimeLogoCache = new Map<string, string>();

const CLUB_WORDS = /\b(fc|sk|cf|ac|cr|ec|clube|club|futebol|futsal)\b/g;

const STATE_CODES = new Set([
  "ac",
  "al",
  "am",
  "ap",
  "ba",
  "ce",
  "df",
  "es",
  "go",
  "ma",
  "mg",
  "ms",
  "mt",
  "pa",
  "pb",
  "pe",
  "pi",
  "pr",
  "rj",
  "rn",
  "ro",
  "rr",
  "rs",
  "sc",
  "se",
  "sp",
  "to",
]);

/**
 * Shared team key for crest lookup and fixture matching.
 * State codes stay (`Atlético-MG` and `Atlético-GO` do not collapse).
 */
export function normalizeTeamKey(name: string): string {
  const normalized = baseTeamName(name);
  if (!normalized) return "";
  const direct = TEAM_ALIASES.get(normalized);
  if (direct) return direct;
  const stripped = normalized.replace(CLUB_WORDS, " ").replace(/\s+/g, " ").trim();
  if (!stripped || stripped === normalized) return normalized;
  return TEAM_ALIASES.get(stripped) ?? stripped;
}

function baseTeamName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/&/g, " e ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

const TEAM_ALIASES = new Map<string, string>([
  ["gimmnasia la plata", "gimnasia la plata"],
  ["gimnasia y esgrima la plata", "gimnasia la plata"],
  ["club atletico tucuman", "atletico tucuman"],
  ["club atletico talleres", "talleres"],
  ["atletico talleres", "talleres"],
  ["talleres cordoba", "talleres"],
  ["talleres de cordoba", "talleres"],
  ["instituto atletico central cordoba", "instituto"],
  ["torque", "montevideo city torque"],
  ["liverpool fc", "liverpool"],
  ["fastav zlin", "zlin"],
  ["fc zlin", "zlin"],
  ["sk slavia praga", "slavia praga"],
  ["slavia praha", "slavia praga"],
  ["slavia prague", "slavia praga"],
  ["sparta praha", "sparta praga"],
  ["queens park rangers", "qpr"],
  ["west ham united", "west ham"],
  ["sporting clube portugal", "sporting"],
  ["sporting clube de portugal", "sporting"],
  ["newcastle", "newcastle united"],
  ["sporting cp", "sporting"],
  ["sporting lisboa", "sporting"],
  ["sc braga", "braga"],
  ["psv eindhoven", "psv"],
  ["sc heerenveen", "heerenveen"],
  ["jimbee cartagena", "cartagena"],
  ["noia portus apostoli", "noia"],
  ["athletico", "athletico pr"],
  ["athletico paranaense", "athletico pr"],
  ["atletico paranaense", "athletico pr"],
  ["atletico pr", "athletico pr"],
  ["cap", "athletico pr"],
  ["atletico mineiro", "atletico mg"],
  ["atletico de madrid", "atletico madrid"],
  ["cam", "atletico mg"],
  ["america mineiro", "america mg"],
  ["atletico goianiense", "atletico go"],
  ["rb bragantino", "red bull bragantino"],
  ["bragantino", "red bull bragantino"],
  ["vasco", "vasco da gama"],
  ["botafogo rj", "botafogo"],
  ["botafogo fr", "botafogo"],
  ["sport recife", "sport"],
  ["sc recife", "sport"],
  ["ldu", "ldu quito"],
  ["liga de quito", "ldu quito"],
  ["club bolivar", "bolivar"],
  ["u de chile", "universidad de chile"],
  ["club universidad de chile", "universidad de chile"],
  ["wolves", "wolverhampton"],
  ["gremio novorizontino", "novorizontino"],
  ["operario ferroviario", "operario"],
  ["inter miami cf", "inter miami"],
  ["club internacional de futbol miami", "inter miami"],
  ["sc internacional", "internacional"],
  ["sc corinthians", "corinthians"],
  ["se palmeiras", "palmeiras"],
  ["spfc", "sao paulo"],
  ["sccp", "corinthians"],
  ["crf", "flamengo"],
  ["sep", "palmeiras"],
  ["bfr", "botafogo"],
  ["brazil", "brasil"],
  ["germany", "alemanha"],
  ["belgium", "belgica"],
  ["poland", "polonia"],
  ["france", "franca"],
  ["spain", "espanha"],
  ["england", "inglaterra"],
  ["italy", "italia"],
  ["uruguay", "uruguai"],
  ["netherlands", "holanda"],
  ["holland", "holanda"],
  ["cape verde", "cabo verde"],
  ["indonesia", "indonesia"],
  ["united states", "estados unidos"],
  ["usa", "estados unidos"],
  ["eua", "estados unidos"],
  ["mexico", "mexico"],
  ["japan", "japao"],
  ["south korea", "coreia do sul"],
  ["ecuador", "equador"],
  ["paraguay", "paraguai"],
  ["morocco", "marrocos"],
]);

const NATIONAL_TEAMS = new Set([
  "brasil",
  "argentina",
  "uruguai",
  "paraguai",
  "chile",
  "colombia",
  "equador",
  "peru",
  "bolivia",
  "venezuela",
  "mexico",
  "estados unidos",
  "costa rica",
  "honduras",
  "panama",
  "jamaica",
  "canada",
  "alemanha",
  "franca",
  "espanha",
  "portugal",
  "inglaterra",
  "italia",
  "holanda",
  "belgica",
  "croacia",
  "suica",
  "polonia",
  "servia",
  "dinamarca",
  "suecia",
  "noruega",
  "austria",
  "turquia",
  "gales",
  "escocia",
  "irlanda",
  "grecia",
  "romenia",
  "ucrania",
  "russia",
  "hungria",
  "republica tcheca",
  "eslovaquia",
  "eslovenia",
  "finlandia",
  "islandia",
  "marrocos",
  "senegal",
  "nigeria",
  "camaroes",
  "gana",
  "egito",
  "tunisia",
  "argelia",
  "costa do marfim",
  "cabo verde",
  "mali",
  "africa do sul",
  "japao",
  "coreia do sul",
  "coreia do norte",
  "australia",
  "ira",
  "arabia saudita",
  "catar",
  "indonesia",
  "china",
  "nova zelandia",
]);

const KNOWN_LOGOS: Record<string, string> = {
  palmeiras: "https://cdn.sportmonks.com/images/soccer/teams/30/3422.png",
  santos: "https://cdn.sportmonks.com/images/soccer/teams/4/3684.png",
  flamengo: "https://cdn.sportmonks.com/images/soccer/teams/0/1024.png",
  corinthians: "https://cdn.sportmonks.com/images/soccer/teams/15/303.png",
  "sao paulo": "https://cdn.sportmonks.com/images/soccer/teams/8/3496.png",
  gremio: "https://cdn.sportmonks.com/images/soccer/teams/13/2925.png",
  internacional: "https://cdn.sportmonks.com/images/soccer/teams/8/2696.png",
  "vasco da gama": "https://cdn.sportmonks.com/images/soccer/teams/24/696.png",
  fluminense: "https://cdn.sportmonks.com/images/soccer/teams/7/1095.png",
  botafogo: "https://cdn.sportmonks.com/images/soccer/teams/16/2864.png",
  cruzeiro: "https://cdn.sportmonks.com/images/soccer/teams/11/3371.png",
  "atletico mg": "https://cdn.sportmonks.com/images/soccer/teams/3/3427.png",
  "athletico pr": "https://cdn.sportmonks.com/images/soccer/teams/8/3432.png",
  bahia: "https://cdn.sportmonks.com/images/soccer/teams/20/692.png",
  fortaleza: "https://cdn.sportmonks.com/images/soccer/teams/5/3621.png",
  ceara: "https://cdn.sportmonks.com/images/soccer/teams/28/12220.png",
  vitoria: "https://cdn.sportmonks.com/images/soccer/teams/16/3440.png",
  sport: "https://r2.thesportsdb.com/images/media/team/badge/tyrbls1545421563.png",
  coritiba: "https://cdn.sportmonks.com/images/soccer/teams/13/6285.png",
  "red bull bragantino": "https://cdn.sportmonks.com/images/soccer/teams/0/7808.png",
  cuiaba: "https://cdn.sportmonks.com/images/soccer/teams/23/5463.png",
  juventude: "https://cdn.sportmonks.com/images/soccer/teams/23/6487.png",
  criciuma: "https://cdn.sportmonks.com/images/soccer/teams/20/6036.png",
  "atletico go": "https://cdn.sportmonks.com/images/soccer/teams/11/8331.png",
  goias: "https://media.api-sports.io/football/teams/151.png",
  "vila nova": "https://cdn.sportmonks.com/images/soccer/teams/5/11941.png",
  "america mg": "https://cdn.sportmonks.com/images/soccer/teams/21/6325.png",
  avai: "https://cdn.sportmonks.com/images/soccer/teams/4/6468.png",
  chapecoense: "https://cdn.sportmonks.com/images/soccer/teams/6/710.png",
  novorizontino: "https://cdn.sportmonks.com/images/soccer/teams/2/6370.png",
  mirassol: "https://cdn.sportmonks.com/images/soccer/teams/22/11126.png",
  operario: "https://cdn.sportmonks.com/images/soccer/teams/22/14710.png",
  "ponte preta": "https://cdn.sportmonks.com/images/soccer/teams/27/3931.png",
  guarani: "https://r2.thesportsdb.com/images/media/team/badge/tpipb21766508536.png",
  paysandu: "https://cdn.sportmonks.com/images/soccer/teams/25/6489.png",
  remo: "https://cdn.sportmonks.com/images/soccer/teams/30/11550.png",
  londrina: "https://cdn.sportmonks.com/images/soccer/teams/29/9181.png",
  nautico: "https://cdn.sportmonks.com/images/soccer/teams/29/12157.png",
  crb: "https://cdn.sportmonks.com/images/soccer/teams/12/6188.png",
  "botafogo sp": "https://cdn.sportmonks.com/images/soccer/teams/8/104.png",
  amazonas: "https://r2.thesportsdb.com/images/media/team/badge/owccd41754110658.png",
  brusque: "https://r2.thesportsdb.com/images/media/team/badge/o7p43b1766507803.png",
  ituano: "https://r2.thesportsdb.com/images/media/team/badge/7fg7n71596796444.png",
  "boca juniors": "https://media.api-sports.io/football/teams/451.png",
  "river plate": "https://media.api-sports.io/football/teams/435.png",
  racing: "https://r2.thesportsdb.com/images/media/team/badge/vi4mu41695734959.png",
  independiente: "https://r2.thesportsdb.com/images/media/team/badge/eki4nd1580842605.png",
  "san lorenzo": "https://media.api-sports.io/football/teams/460.png",
  "gimnasia la plata": "https://r2.thesportsdb.com/images/media/team/badge/epmttr1678849271.png",
  talleres: "https://upload.wikimedia.org/wikipedia/commons/d/d0/Talleres_Cordoba_badge.png",
  "atletico tucuman": "https://r2.thesportsdb.com/images/media/team/badge/m5i2q21775755577.png",
  instituto: "https://r2.thesportsdb.com/images/media/team/badge/jup59w1578825794.png",
  danubio: "https://r2.thesportsdb.com/images/media/team/badge/vtryqv1473541135.png",
  "montevideo city torque":
    "https://r2.thesportsdb.com/images/media/team/badge/cbro131677794355.png",
  "deportivo maldonado": "https://r2.thesportsdb.com/images/media/team/badge/0fmxza1580234592.png",
  liverpool: "https://r2.thesportsdb.com/images/media/team/badge/kfaher1737969724.png",
  "liverpool montevideo": "https://r2.thesportsdb.com/images/media/team/badge/0xat6f1678717839.png",
  "inter miami": "https://r2.thesportsdb.com/images/media/team/badge/m4it3e1602103647.png",
  penarol: "https://r2.thesportsdb.com/images/media/team/badge/uuwpux1473541171.png",
  nacional:
    "https://upload.wikimedia.org/wikipedia/commons/d/df/Club_Nacional_de_Football_logo_%28variant%29.png",
  "cerro porteno":
    "https://upload.wikimedia.org/wikipedia/commons/6/65/Escudo_Cerro_Porte%C3%B1o_Transparente.png",
  "cerro largo":
    "https://upload.wikimedia.org/wikipedia/commons/a/a7/Escudo_Cerro_Largo_F%C3%BAtbol_Club.png",
  "universidad de chile":
    "https://upload.wikimedia.org/wikipedia/commons/2/2d/Emblema_del_Club_Universidad_de_Chile.png",
  sassuolo: "https://media.api-sports.io/football/teams/488.png",
  bolivar: "https://media.api-sports.io/football/teams/3702.png",
  "deportivo cali":
    "https://upload.wikimedia.org/wikipedia/commons/8/83/Asociaci%C3%B3n_Deportivo_Cali_logo.png",
  olimpia:
    "https://upload.wikimedia.org/wikipedia/en/thumb/4/45/Club_Olimpia_logo.svg/250px-Club_Olimpia_logo.svg.png",
  libertad: "https://upload.wikimedia.org/wikipedia/en/e/ee/Club_Libertad_logo.png",
  "colo colo":
    "https://upload.wikimedia.org/wikipedia/en/thumb/b/be/Colo-Colo.svg/330px-Colo-Colo.svg.png",
  "ldu quito": "https://r2.thesportsdb.com/images/media/team/badge/5tf5ch1736404372.png",
  "real madrid": "https://cdn.sportmonks.com/images/soccer/teams/12/3468.png",
  barcelona: "https://cdn.sportmonks.com/images/soccer/teams/19/83.png",
  "atletico madrid": "https://media.api-sports.io/football/teams/530.png",
  "west ham": "https://cdn.sportmonks.com/images/soccer/teams/8/168.png",
  qpr: "https://r2.thesportsdb.com/images/media/team/badge/l4qscx1601721022.png",
  braga: "https://cdn.sportmonks.com/images/soccer/teams/8/264.png",
  sporting: "https://cdn.sportmonks.com/images/soccer/teams/15/239.png",
  benfica: "https://cdn.sportmonks.com/images/soccer/teams/23/247.png",
  porto: "https://cdn.sportmonks.com/images/soccer/teams/24/248.png",
  famalicao: "https://r2.thesportsdb.com/images/media/team/badge/a3f4er1563653256.png",
  alverca: "https://r2.thesportsdb.com/images/media/team/badge/6ljryf1691990098.png",
  "vitoria guimaraes": "https://cdn.sportmonks.com/images/soccer/teams/30/830.png",
  "coventry city": "/logos/teams/coventry_city.png",
  "newcastle united": "/logos/teams/newcastle_united.png",
  "al nassr": "/logos/teams/al_nassr.png",
  neftchi: "/logos/teams/neftchi.png",
  psv: "https://cdn.sportmonks.com/images/soccer/teams/19/627.png",
  heerenveen: "https://r2.thesportsdb.com/images/media/team/badge/surtsx1473534841.png",
  galatasaray: "https://cdn.sportmonks.com/images/soccer/teams/27/571.png",
  kasimpasa: "https://r2.thesportsdb.com/images/media/team/badge/uryxtp1448203236.png",
  "slavia praga": "https://r2.thesportsdb.com/images/media/team/badge/hq2b7u1777680580.png",
  "sparta praga": "https://cdn.sportmonks.com/images/soccer/teams/6/230.png",
  zlin: "https://r2.thesportsdb.com/images/media/team/badge/dlljv61693459452.png",
  ajax: "https://cdn.sportmonks.com/images/soccer/teams/25/633.png",
  feyenoord: "https://media.api-sports.io/football/teams/209.png",
  "manchester city": "https://cdn.sportmonks.com/images/soccer/teams/9/9.png",
  "manchester united": "https://cdn.sportmonks.com/images/soccer/teams/14/14.png",
  arsenal: "https://cdn.sportmonks.com/images/soccer/teams/19/19.png",
  chelsea: "https://cdn.sportmonks.com/images/soccer/teams/18/18.png",
  tottenham: "https://cdn.sportmonks.com/images/soccer/teams/6/6.png",
  psg: "https://cdn.sportmonks.com/images/soccer/teams/13/589.png",
  "bayern munique": "https://cdn.sportmonks.com/images/soccer/teams/22/502.png",
  "borussia dortmund": "https://cdn.sportmonks.com/images/soccer/teams/26/506.png",
  juventus: "https://media.api-sports.io/football/teams/496.png",
  milan: "https://cdn.sportmonks.com/images/soccer/teams/29/637.png",
  inter: "https://cdn.sportmonks.com/images/soccer/teams/17/625.png",
  roma: "https://media.api-sports.io/football/teams/497.png",
  napoli: "https://media.api-sports.io/football/teams/492.png",
  brasil: "https://r2.thesportsdb.com/images/media/team/badge/jl6dip1726167280.png",
  argentina: "https://r2.thesportsdb.com/images/media/team/badge/3zplhu1726167477.png",
  alemanha: "https://r2.thesportsdb.com/images/media/team/badge/1xysi51726167152.png",
  australia: "https://r2.thesportsdb.com/images/media/team/badge/eylq8x1781926138.png",
  belgica: "https://r2.thesportsdb.com/images/media/team/badge/8xlvxv1592062265.png",
  polonia: "https://r2.thesportsdb.com/images/media/team/badge/ttvrxy1455466076.png",
  franca: "https://cdn.sportmonks.com/images/soccer/teams/20/5140.png",
  espanha: "https://cdn.sportmonks.com/images/soccer/teams/15/5135.png",
  portugal: "https://cdn.sportmonks.com/images/soccer/teams/26/5146.png",
  inglaterra: "https://r2.thesportsdb.com/images/media/team/badge/vf5ttc1726166739.png",
  italia: "https://cdn.sportmonks.com/images/soccer/teams/12/5132.png",
  uruguai: "https://r2.thesportsdb.com/images/media/team/badge/6vjbr11726167756.png",
  colombia: "https://r2.thesportsdb.com/images/media/team/badge/4ymyku1691180081.png",
  holanda: "https://r2.thesportsdb.com/images/media/team/badge/1p0hr41593787110.png",
  cartagena: "https://r2.thesportsdb.com/images/media/team/badge/xzrxd71677472112.png",
  noia: "https://r2.thesportsdb.com/images/media/team/badge/4zi9rr1734497753.png",
  burnley: "/logos/teams/burnley.png",
  wolverhampton: "/logos/teams/wolverhampton.png",
  frosinone: "/logos/teams/frosinone.png",
  peru: "/logos/teams/peru.png",
  japao: "/logos/teams/japao.png",
  chile: "/logos/teams/chile.png",
  "colon uru": "/logos/teams/colon.png",
};

rememberStateSuffixes(Object.keys(KNOWN_LOGOS));

/** Catalog files that depict a different club, even when the name matches. */
const MISLABELED_CREST_FILES = new Set([
  "teams/boca_juniors.png",
  "teams/libertad.png",
  "teams/nacional.png",
  "teams/cerro_porteno.png",
]);

export function isMislabeledCrest(url: string): boolean {
  const file = pulsoLogoFile(url);
  return file != null && MISLABELED_CREST_FILES.has(file);
}

export function curatedTeamCrest(name: string): string {
  const key = normalizeTeamKey(name);
  if (!key) return "";
  const url = KNOWN_LOGOS[key] ?? "";
  if (!url || isMislabeledCrest(url)) return "";
  return url;
}

/**
 * A verified crest is the only crest for that team.
 * Pulso `teams/` files are ignored unless that exact file is the verified one:
 * the host has served another club under the right filename.
 */
export function catalogCrestFitsTeam(url: string, teamName: string): boolean {
  if (!url || isMislabeledCrest(url)) return false;
  const curated = curatedTeamCrest(teamName);
  if (curated) {
    return resolvePulsoAsset(url) === resolvePulsoAsset(curated);
  }
  const file = pulsoLogoFile(url);
  if (file?.startsWith("teams/")) return false;
  return true;
}

function rememberStateSuffixes(keys: string[]) {
  const known = new Set(keys);
  for (const key of keys) {
    const tail = key.split(" ").at(-1) ?? "";
    if (STATE_CODES.has(tail)) continue;
    for (const state of STATE_CODES) {
      const alias = `${key} ${state}`;
      if (known.has(alias) || TEAM_ALIASES.has(alias)) continue;
      TEAM_ALIASES.set(alias, key);
    }
  }
}

export function isNationalTeam(name: string): boolean {
  const key = normalizeTeamKey(name);
  return key.length > 0 && NATIONAL_TEAMS.has(key);
}

function cacheableCrest(url: string): boolean {
  if (!url || url.startsWith("data:")) return false;
  return !/\/flags\//i.test(url);
}

export function registerTeamLogo(name: string, logoUrl: string): void {
  if (!name || !cacheableCrest(logoUrl) || !catalogCrestFitsTeam(logoUrl, name)) return;
  const key = normalizeTeamKey(name);
  if (key && !runtimeLogoCache.has(key)) {
    runtimeLogoCache.set(key, logoUrl);
  }
}

export function registerTeamLogosFromEvents(events: ApiSportEvent[]): void {
  for (const event of events) {
    if (event.teams?.home?.name && event.teams.home.logo) {
      registerTeamLogo(event.teams.home.name, event.teams.home.logo);
    }
    if (event.teams?.away?.name && event.teams.away.logo) {
      registerTeamLogo(event.teams.away.name, event.teams.away.logo);
    }
  }
}

/** Local map first, then a crest seen on another listing. */
export function resolveTeamCrests(name: string): string[] {
  const key = normalizeTeamKey(name);
  if (!key) return [];
  const urls: string[] = [];
  const push = (url: string | undefined) => {
    if (!url) return;
    const resolved = resolvePulsoAsset(url);
    if (resolved && !urls.includes(resolved)) urls.push(resolved);
  };
  push(KNOWN_LOGOS[key]);
  push(runtimeLogoCache.get(key));
  return urls;
}

export function resolveTeamLogo(name: string): string {
  return resolveTeamCrests(name)[0] ?? "";
}
