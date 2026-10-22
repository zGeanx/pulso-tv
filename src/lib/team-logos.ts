import type { ApiSportEvent } from "@/lib/api";
import { pulsoLogoFile, resolvePulsoAsset } from "@/lib/pulso-assets";

const runtimeLogoCache = new Map<string, string>();

const CLUB_WORDS = /\b(fc|sk|cf|ac|cr|ec|clube|club|futebol|futsal|fk|bsc|gnk|rc)\b/g;

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
    .replace(/[øØ]/g, "o")
    .replace(/[æÆ]/g, "ae")
    .replace(/[œŒ]/g, "oe")
    .replace(/ß/g, "ss")
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
  ["club estudiantes de la plata", "estudiantes"],
  ["estudiantes de la plata", "estudiantes"],
  ["estudiantes lp", "estudiantes"],
  ["edlp", "estudiantes"],
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
  ["aek athens", "aek atenas"],
  ["aek", "aek atenas"],
  ["bodo / glimt", "bodo glimt"],
  ["bodoglimt", "bodo glimt"],
  ["bodo", "bodo glimt"],
  ["bod glimt", "bodo glimt"],
  ["fk bodo glimt", "bodo glimt"],
  ["vfb stuttgart", "stuttgart"],
  ["bayern de munique", "bayern munchen"],
  ["bayern munique", "bayern munchen"],
  ["bayern", "bayern munchen"],
  ["bayern munich", "bayern munchen"],
  ["fc bayern munchen", "bayern munchen"],
  ["fc bayern", "bayern munchen"],
  ["inter de milao", "inter"],
  ["internazionale", "inter"],
  ["inter milan", "inter"],
  ["fc internazionale", "inter"],
  ["ac milan", "milan"],
  ["brugge", "club brugge"],
  ["shakhtar donetsk", "shakhtar"],
  ["shakhtar", "shakhtar"],
  ["chakhtar donetsk", "shakhtar"],
  ["chakhtar", "shakhtar"],
  ["leipzig", "rb leipzig"],
  ["red bull leipzig", "rb leipzig"],
  ["rasenballsport leipzig", "rb leipzig"],
  ["losc lille", "lille"],
  ["losc", "lille"],
  ["como 1907", "como"],
  ["rc lens", "lens"],
  ["lens", "lens"],
  ["betis", "real betis"],
  ["viking fk", "viking"],
  ["lask linz", "lask linz"],
  ["lask", "lask linz"],
  ["celtic fc", "celtic"],
  ["gnk dinamo zagreb", "dinamo zagreb"],
  ["rb salzburg", "salzburg"],
  ["red bull salzburg", "salzburg"],
  ["crvena zvezda", "estrela vermelha"],
  ["red star belgrade", "estrela vermelha"],
  ["bsc young boys", "young boys"],
  ["sk sturm graz", "sturm graz"],
  ["stade brestois", "brest"],
  ["stade brestois 29", "brest"],
  ["bologna fc", "bologna"],
  ["girona fc", "girona"],
  ["atalanta bc", "atalanta"],
  ["leverkusen", "bayer leverkusen"],
  ["as monaco", "monaco"],
  ["athletic bilbao", "athletic club"],
  ["athletic", "athletic club"],
  ["frankfurt", "eintracht frankfurt"],
  ["eintracht", "eintracht frankfurt"],
  ["olympiakos", "olympiacos"],
  ["fc copenhagen", "copenhagen"],
  ["kobenhavn", "copenhagen"],
  ["union saint gilloise", "union sg"],
  ["royale union saint gilloise", "union sg"],
  ["qarabag fk", "qarabag"],
  ["kairat", "kairat almaty"],
  ["pafos fc", "pafos"],
  ["olympique marseille", "marseille"],
  ["olympique de marseille", "marseille"],
  ["olympique lyonnais", "lyon"],
  ["olympique lyon", "lyon"],
  ["sociedad", "real sociedad"],
  ["ss lazio", "lazio"],
  ["acf fiorentina", "fiorentina"],
  ["as roma", "roma"],
  ["ssc napoli", "napoli"],
  ["chelsea fc", "chelsea"],
  ["tottenham hotspur", "tottenham"],
  ["spurs", "tottenham"],
  ["arsenal fc", "arsenal"],
  ["man united", "manchester united"],
  ["man utd", "manchester united"],
  ["man city", "manchester city"],
  ["paris saint germain", "psg"],
  ["paris sg", "psg"],
  ["barca", "barcelona"],
  ["atleti", "atletico madrid"],
  ["sl benfica", "benfica"],
  ["fc porto", "porto"],
  ["afc ajax", "ajax"],
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
  talleres: "/logos/ucl-2026/talleres.webp",
  estudiantes: "/logos/ucl-2026/estudiantes.webp",
  "atletico tucuman": "https://r2.thesportsdb.com/images/media/team/badge/m5i2q21775755577.png",
  instituto: "https://r2.thesportsdb.com/images/media/team/badge/jup59w1578825794.png",
  danubio: "https://r2.thesportsdb.com/images/media/team/badge/vtryqv1473541135.png",
  "montevideo city torque":
    "https://r2.thesportsdb.com/images/media/team/badge/cbro131677794355.png",
  "deportivo maldonado": "https://r2.thesportsdb.com/images/media/team/badge/0fmxza1580234592.png",
  liverpool: "/logos/ucl-2026/liverpool.webp",
  "liverpool montevideo": "https://r2.thesportsdb.com/images/media/team/badge/0xat6f1678717839.png",
  "inter miami": "https://r2.thesportsdb.com/images/media/team/badge/m4it3e1602103647.png",
  penarol: "/logos/ucl-2026/penarol.webp",
  nacional: "/logos/ucl-2026/nacional.webp",
  "cerro porteno": "/logos/ucl-2026/cerro_porteno.webp",
  "cerro largo":
    "https://upload.wikimedia.org/wikipedia/commons/a/a7/Escudo_Cerro_Largo_F%C3%BAtbol_Club.png",
  "universidad de chile": "/logos/ucl-2026/u_de_chile.webp",
  sassuolo: "https://media.api-sports.io/football/teams/488.png",
  bolivar: "/logos/ucl-2026/bolivar.webp",
  "deportivo cali": "/logos/ucl-2026/deportivo_cali.webp",
  olimpia: "/logos/ucl-2026/olimpia.webp",
  libertad: "/logos/ucl-2026/libertad.webp",
  "colo colo": "/logos/ucl-2026/colo_colo.webp",
  "ldu quito": "https://r2.thesportsdb.com/images/media/team/badge/5tf5ch1736404372.png",
  "real madrid": "/logos/ucl-2026/real_madrid.webp",
  barcelona: "/logos/ucl-2026/barcelona.webp",
  "atletico madrid": "/logos/ucl-2026/atletico_madrid.webp",
  "west ham": "https://media.api-sports.io/football/teams/48.png",
  qpr: "https://r2.thesportsdb.com/images/media/team/badge/l4qscx1601721022.png",
  braga: "/logos/ucl-2026/braga.webp",
  sporting: "/logos/ucl-2026/sporting_cp.webp",
  benfica: "/logos/ucl-2026/benfica.webp",
  porto: "/logos/ucl-2026/porto.webp",
  famalicao: "https://r2.thesportsdb.com/images/media/team/badge/a3f4er1563653256.png",
  alverca: "https://r2.thesportsdb.com/images/media/team/badge/6ljryf1691990098.png",
  "vitoria guimaraes": "https://cdn.sportmonks.com/images/soccer/teams/30/830.png",
  "coventry city": "/logos/teams/coventry_city.png",
  "newcastle united": "/logos/ucl-2026/newcastle.webp",
  "al nassr": "/logos/teams/al_nassr.png",
  neftchi: "/logos/teams/neftchi.png",
  psv: "/logos/ucl-2026/psv.webp",
  heerenveen: "https://r2.thesportsdb.com/images/media/team/badge/surtsx1473534841.png",
  galatasaray: "/logos/ucl-2026/galatasaray.webp",
  kasimpasa: "https://r2.thesportsdb.com/images/media/team/badge/uryxtp1448203236.png",
  "slavia praga": "/logos/ucl-2026/slavia_praha.webp",
  "sparta praga": "/logos/ucl-2026/sparta_praga.webp",
  zlin: "https://r2.thesportsdb.com/images/media/team/badge/dlljv61693459452.png",
  ajax: "/logos/ucl-2026/ajax.webp",
  feyenoord: "/logos/ucl-2026/feyenoord.webp",
  "manchester city": "/logos/ucl-2026/manchester_city.webp",
  "manchester united": "/logos/ucl-2026/manchester_united.webp",
  arsenal: "/logos/ucl-2026/arsenal.webp",
  chelsea: "/logos/ucl-2026/chelsea.webp",
  tottenham: "/logos/ucl-2026/tottenham.webp",
  psg: "/logos/ucl-2026/psg.webp",
  "bayern munchen": "/logos/ucl-2026/bayern_munchen.webp",
  "borussia dortmund": "/logos/ucl-2026/borussia_dortmund.webp",
  juventus: "/logos/ucl-2026/juventus.webp",
  milan: "/logos/ucl-2026/milan.webp",
  inter: "/logos/ucl-2026/inter.webp",
  roma: "/logos/ucl-2026/roma.webp",
  napoli: "/logos/ucl-2026/napoli.webp",
  lazio: "/logos/ucl-2026/lazio.webp",
  fiorentina: "/logos/ucl-2026/fiorentina.webp",
  atalanta: "/logos/ucl-2026/atalanta.webp",
  bologna: "/logos/ucl-2026/bologna.webp",
  como: "/logos/ucl-2026/como.webp",
  "rb leipzig": "/logos/ucl-2026/rb_leipzig.webp",
  "bayer leverkusen": "/logos/ucl-2026/bayer_leverkusen.webp",
  stuttgart: "/logos/ucl-2026/stuttgart.webp",
  "eintracht frankfurt": "/logos/ucl-2026/eintracht_frankfurt.webp",
  "aston villa": "/logos/ucl-2026/aston_villa.webp",
  monaco: "/logos/ucl-2026/monaco.webp",
  lille: "/logos/ucl-2026/lille.webp",
  brest: "/logos/ucl-2026/brest.webp",
  marseille: "/logos/ucl-2026/marseille.webp",
  lens: "/logos/ucl-2026/rc_lens.webp",
  lyon: "/logos/ucl-2026/lyon.webp",
  "club brugge": "/logos/ucl-2026/club_brugge.webp",
  "union sg": "/logos/ucl-2026/union_sg.webp",
  celtic: "/logos/ucl-2026/celtic.webp",
  salzburg: "/logos/ucl-2026/salzburg.webp",
  "sturm graz": "/logos/ucl-2026/sturm_graz.webp",
  "young boys": "/logos/ucl-2026/young_boys.webp",
  shakhtar: "/logos/ucl-2026/shakhtar.webp",
  "dinamo zagreb": "/logos/ucl-2026/dinamo_zagreb.webp",
  "estrela vermelha": "/logos/ucl-2026/estrela_vermelha.webp",
  "slovan bratislava": "/logos/ucl-2026/slovan_bratislava.webp",
  fenerbahce: "/logos/ucl-2026/fenerbahce.webp",
  besiktas: "/logos/ucl-2026/besiktas.webp",
  "bodo glimt": "/logos/ucl-2026/bodo_glimt.webp",
  copenhagen: "/logos/ucl-2026/copenhagen.webp",
  olympiacos: "/logos/ucl-2026/olympiacos.webp",
  paok: "/logos/ucl-2026/paok.webp",
  panathinaikos: "/logos/ucl-2026/panathinaikos.webp",
  "aek atenas": "/logos/ucl-2026/aek_atenas.webp",
  qarabag: "/logos/ucl-2026/qarabag.webp",
  "kairat almaty": "/logos/ucl-2026/kairat_almaty.webp",
  pafos: "/logos/ucl-2026/pafos.webp",
  sabah: "/logos/ucl-2026/sabah.webp",
  viking: "/logos/ucl-2026/viking.webp",
  "lask linz": "/logos/ucl-2026/lask_linz.webp",
  "viktoria plzen": "/logos/ucl-2026/viktoria_plzen.webp",
  malmo: "/logos/ucl-2026/malmo.webp",
  midtjylland: "/logos/ucl-2026/midtjylland.webp",
  "athletic club": "/logos/ucl-2026/athletic_club.webp",
  villarreal: "/logos/ucl-2026/villarreal.webp",
  "real sociedad": "/logos/ucl-2026/real_sociedad.webp",
  "real betis": "/logos/ucl-2026/real_betis.webp",
  girona: "/logos/ucl-2026/girona.webp",
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
const MISLABELED_CREST_STEMS = new Set([
  "teams/boca_juniors",
  "teams/libertad",
  "teams/nacional",
  "teams/cerro_porteno",
]);

export function isMislabeledCrest(url: string): boolean {
  const file = pulsoLogoFile(url);
  if (!file) return false;
  const stem = file.replace(/\.(png|jpe?g|webp|svg)$/i, "");
  return MISLABELED_CREST_STEMS.has(stem);
}

export function curatedTeamCrest(name: string): string {
  const key = normalizeTeamKey(name);
  if (!key) return "";
  const url = KNOWN_LOGOS[key] ?? "";
  if (!url || isMislabeledCrest(url)) return "";
  return url;
}

/**
 * Hosted `teams/` crests are the catalog, except the files known to show another club.
 * A remote URL still has to match the curated crest when one exists.
 */
export function catalogCrestFitsTeam(url: string, teamName: string): boolean {
  if (!url || isMislabeledCrest(url)) return false;
  const file = pulsoLogoFile(url);
  if (file?.startsWith("teams/")) return true;
  const curated = curatedTeamCrest(teamName);
  if (curated) {
    return resolvePulsoAsset(url) === resolvePulsoAsset(curated);
  }
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
