import type { ApiSportEvent } from "@/lib/api";

const runtimeLogoCache = new Map<string, string>();

export function normalizeTeamKey(name: string): string {
  if (!name) return "";
  const cleaned = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(
      /\b(fc|sk|cf|sc|ac|cr|ec|clube|club|de|futebol|futsal|sp|rj|mg|pr|rs|ba|pe|ce|go|sc)\b/g,
      " ",
    )
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");

  return TEAM_ALIASES.get(cleaned) ?? cleaned;
}

const TEAM_ALIASES = new Map<string, string>([
  ["gimmnasia la plata", "gimnasia la plata"],
  ["gimnasia y esgrima la plata", "gimnasia la plata"],
  ["atletico tucuman", "atletico tucuman"],
  ["club atletico tucuman", "atletico tucuman"],
  ["instituto atletico central cordoba", "instituto"],
  ["danubio fc", "danubio"],
  ["montevideo city torque", "montevideo city torque"],
  ["torque", "montevideo city torque"],
  ["liverpool montevideo", "liverpool"],
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
  ["newcastle", "newcastle united"],
  ["sporting cp", "sporting"],
  ["sporting lisboa", "sporting"],
  ["sc braga", "braga"],
  ["psv eindhoven", "psv"],
  ["sc heerenveen", "heerenveen"],
  ["jimbee cartagena", "cartagena"],
  ["noia portus apostoli", "noia"],
  ["athletico paranaense", "athletico pr"],
  ["atletico paranaense", "athletico pr"],
  ["atletico mineiro", "atletico mg"],
  ["america mineiro", "america mg"],
  ["atletico goianiense", "atletico go"],
  ["rb bragantino", "red bull bragantino"],
  ["bragantino", "red bull bragantino"],
  ["vasco", "vasco da gama"],
  ["botafogo rj", "botafogo"],
  ["sport recife", "sport"],
  ["gremio novorizontino", "novorizontino"],
  ["operario ferroviario", "operario"],
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
  sport: "https://cdn.sportmonks.com/images/soccer/teams/15/2703.png",
  coritiba: "https://cdn.sportmonks.com/images/soccer/teams/13/6285.png",
  "red bull bragantino": "https://cdn.sportmonks.com/images/soccer/teams/0/7808.png",
  cuiaba: "https://cdn.sportmonks.com/images/soccer/teams/23/5463.png",
  juventude: "https://cdn.sportmonks.com/images/soccer/teams/23/6487.png",
  criciuma: "https://cdn.sportmonks.com/images/soccer/teams/20/6036.png",
  "atletico go": "https://cdn.sportmonks.com/images/soccer/teams/11/8331.png",
  goias: "https://cdn.sportmonks.com/images/soccer/teams/17/2705.png",
  "vila nova": "https://cdn.sportmonks.com/images/soccer/teams/5/11941.png",
  "america mg": "https://cdn.sportmonks.com/images/soccer/teams/21/6325.png",
  avai: "https://cdn.sportmonks.com/images/soccer/teams/4/6468.png",
  chapecoense: "https://cdn.sportmonks.com/images/soccer/teams/6/710.png",
  novorizontino: "https://cdn.sportmonks.com/images/soccer/teams/2/6370.png",
  mirassol: "https://cdn.sportmonks.com/images/soccer/teams/22/11126.png",
  operario: "https://cdn.sportmonks.com/images/soccer/teams/22/14710.png",
  "ponte preta": "https://cdn.sportmonks.com/images/soccer/teams/20/2708.png",
  guarani: "https://cdn.sportmonks.com/images/soccer/teams/22/6486.png",
  paysandu: "https://cdn.sportmonks.com/images/soccer/teams/25/6489.png",
  remo: "https://cdn.sportmonks.com/images/soccer/teams/30/11550.png",
  londrina: "https://cdn.sportmonks.com/images/soccer/teams/29/9181.png",
  nautico: "https://cdn.sportmonks.com/images/soccer/teams/29/12157.png",
  crb: "https://cdn.sportmonks.com/images/soccer/teams/12/6188.png",
  "botafogo sp": "https://cdn.sportmonks.com/images/soccer/teams/8/104.png",
  amazonas: "https://cdn.sportmonks.com/images/soccer/teams/17/284369.png",
  brusque: "https://cdn.sportmonks.com/images/soccer/teams/23/11575.png",
  ituano: "https://cdn.sportmonks.com/images/soccer/teams/21/6485.png",
  "boca juniors": "https://cdn.sportmonks.com/images/soccer/teams/12/1004.png",
  "river plate": "https://cdn.sportmonks.com/images/soccer/teams/2/994.png",
  racing: "https://cdn.sportmonks.com/images/soccer/teams/11/1003.png",
  independiente: "https://cdn.sportmonks.com/images/soccer/teams/10/1002.png",
  "san lorenzo": "https://cdn.sportmonks.com/images/soccer/teams/8/1000.png",
  "gimnasia la plata": "https://r2.thesportsdb.com/images/media/team/badge/epmttr1678849271.png",
  "atletico tucuman": "https://r2.thesportsdb.com/images/media/team/badge/m5i2q21775755577.png",
  instituto: "https://r2.thesportsdb.com/images/media/team/badge/jup59w1578825794.png",
  danubio: "https://r2.thesportsdb.com/images/media/team/badge/vtryqv1473541135.png",
  "montevideo city torque":
    "https://r2.thesportsdb.com/images/media/team/badge/cbro131677794355.png",
  "deportivo maldonado": "https://r2.thesportsdb.com/images/media/team/badge/0fmxza1580234592.png",
  liverpool: "https://r2.thesportsdb.com/images/media/team/badge/0xat6f1678717839.png",
  penarol: "https://cdn.sportmonks.com/images/soccer/teams/21/1013.png",
  nacional: "https://cdn.sportmonks.com/images/soccer/teams/14/1006.png",
  "cerro porteno": "https://cdn.sportmonks.com/images/soccer/teams/20/1012.png",
  olimpia: "https://cdn.sportmonks.com/images/soccer/teams/19/1011.png",
  libertad: "https://cdn.sportmonks.com/images/soccer/teams/18/1010.png",
  "colo colo": "https://cdn.sportmonks.com/images/soccer/teams/17/1009.png",
  "ldu quito": "https://cdn.sportmonks.com/images/soccer/teams/23/1015.png",
  "real madrid": "https://cdn.sportmonks.com/images/soccer/teams/12/3468.png",
  barcelona: "https://cdn.sportmonks.com/images/soccer/teams/19/83.png",
  "atletico madrid": "https://cdn.sportmonks.com/images/soccer/teams/14/798.png",
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
  feyenoord: "https://cdn.sportmonks.com/images/soccer/teams/18/626.png",
  "manchester city": "https://cdn.sportmonks.com/images/soccer/teams/9/9.png",
  "manchester united": "https://cdn.sportmonks.com/images/soccer/teams/14/14.png",
  arsenal: "https://cdn.sportmonks.com/images/soccer/teams/19/19.png",
  chelsea: "https://cdn.sportmonks.com/images/soccer/teams/18/18.png",
  tottenham: "https://cdn.sportmonks.com/images/soccer/teams/6/6.png",
  psg: "https://cdn.sportmonks.com/images/soccer/teams/13/589.png",
  "bayern munique": "https://cdn.sportmonks.com/images/soccer/teams/22/502.png",
  "borussia dortmund": "https://cdn.sportmonks.com/images/soccer/teams/26/506.png",
  juventus: "https://cdn.sportmonks.com/images/soccer/teams/30/638.png",
  milan: "https://cdn.sportmonks.com/images/soccer/teams/29/637.png",
  inter: "https://cdn.sportmonks.com/images/soccer/teams/17/625.png",
  roma: "https://cdn.sportmonks.com/images/soccer/teams/28/636.png",
  napoli: "https://cdn.sportmonks.com/images/soccer/teams/13/589.png",
  brasil: "https://cdn.sportmonks.com/images/soccer/teams/10/5130.png",
  argentina: "https://cdn.sportmonks.com/images/soccer/teams/29/5149.png",
  alemanha: "https://r2.thesportsdb.com/images/media/team/badge/1xysi51726167152.png",
  australia: "https://r2.thesportsdb.com/images/media/team/badge/eylq8x1781926138.png",
  belgica: "https://r2.thesportsdb.com/images/media/team/badge/8xlvxv1592062265.png",
  polonia: "https://r2.thesportsdb.com/images/media/team/badge/ttvrxy1455466076.png",
  franca: "https://cdn.sportmonks.com/images/soccer/teams/20/5140.png",
  espanha: "https://cdn.sportmonks.com/images/soccer/teams/15/5135.png",
  portugal: "https://cdn.sportmonks.com/images/soccer/teams/26/5146.png",
  inglaterra: "https://cdn.sportmonks.com/images/soccer/teams/7/5127.png",
  italia: "https://cdn.sportmonks.com/images/soccer/teams/12/5132.png",
  uruguai: "https://cdn.sportmonks.com/images/soccer/teams/22/5142.png",
  colombia: "https://cdn.sportmonks.com/images/soccer/teams/28/5148.png",
  holanda: "https://cdn.sportmonks.com/images/soccer/teams/16/5136.png",
  cartagena: "https://r2.thesportsdb.com/images/media/team/badge/xzrxd71677472112.png",
  noia: "https://r2.thesportsdb.com/images/media/team/badge/4zi9rr1734497753.png",
};

export function registerTeamLogo(name: string, logoUrl: string): void {
  if (!name || !logoUrl) return;
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

export function resolveTeamLogo(name: string): string {
  const key = normalizeTeamKey(name);
  if (!key) return "";

  const cached = runtimeLogoCache.get(key);
  if (cached) return cached;

  const staticHit = KNOWN_LOGOS[key];
  if (staticHit) return staticHit;

  for (const [knownKey, url] of Object.entries(KNOWN_LOGOS)) {
    if (key.includes(knownKey) || knownKey.includes(key)) {
      return url;
    }
  }

  for (const [cachedKey, url] of runtimeLogoCache.entries()) {
    if (key.includes(cachedKey) || cachedKey.includes(key)) {
      return url;
    }
  }

  return "";
}
