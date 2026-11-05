"""Download crests for leagues the agenda filter will show.

Source: Transfermarkt wappen, via the Wikidata Transfermarkt team id (P7223).
Clubs that already have a crest in the map are not listed here.
"""

from __future__ import annotations

import io
import json
import time
import urllib.parse
import urllib.request
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1] / "public" / "logos" / "agenda-2026"
UA = "PulsoTV/1.0 (https://pulso-tv.online; crest lookup)"
UK = {"United Kingdom", "England", "Scotland", "Wales", "Northern Ireland"}
COUNTRY_ALIASES = {
    "Czech Republic": {"Czech Republic", "Czechia"},
    "Czechia": {"Czech Republic", "Czechia"},
    "Turkey": {"Turkey", "Türkiye"},
    "Türkiye": {"Turkey", "Türkiye"},
}

# slug, wikipedia title, expected country
TEAMS: list[tuple[str, str, str]] = [
    ("brentford", "Brentford F.C.", "England"),
    ("everton", "Everton F.C.", "England"),
    ("fulham", "Fulham F.C.", "England"),
    ("hull_city", "Hull City A.F.C.", "England"),
    ("ipswich", "Ipswich Town F.C.", "England"),
    ("leeds", "Leeds United F.C.", "England"),
    ("nottingham_forest", "Nottingham Forest F.C.", "England"),
    ("middlesbrough", "Middlesbrough F.C.", "England"),
    ("birmingham", "Birmingham City F.C.", "England"),
    ("stoke", "Stoke City F.C.", "England"),
    ("swansea", "Swansea City A.F.C.", "Wales"),
    ("west_brom", "West Bromwich Albion F.C.", "England"),
    ("southampton", "Southampton F.C.", "England"),
    ("sheffield_united", "Sheffield United F.C.", "England"),
    ("portsmouth", "Portsmouth F.C.", "England"),
    ("norwich", "Norwich City F.C.", "England"),
    ("millwall", "Millwall F.C.", "England"),
    ("blackburn", "Blackburn Rovers F.C.", "England"),
    ("bristol_city", "Bristol City F.C.", "England"),
    ("wrexham", "Wrexham A.F.C.", "Wales"),
    ("bolton", "Bolton Wanderers F.C.", "England"),
    ("cardiff", "Cardiff City F.C.", "Wales"),
    ("lincoln_city", "Lincoln City F.C.", "England"),
    ("watford", "Watford F.C.", "England"),
    ("charlton", "Charlton Athletic F.C.", "England"),
    ("derby", "Derby County F.C.", "England"),
    ("preston", "Preston North End F.C.", "England"),
    ("sevilla", "Sevilla FC", "Spain"),
    ("alaves", "Deportivo Alavés", "Spain"),
    ("rayo_vallecano", "Rayo Vallecano", "Spain"),
    ("deportivo_la_coruna", "Deportivo de La Coruña", "Spain"),
    ("espanyol", "RCD Espanyol", "Spain"),
    ("osasuna", "CA Osasuna", "Spain"),
    ("racing_santander", "Racing de Santander", "Spain"),
    ("elche", "Elche CF", "Spain"),
    ("levante", "Levante UD", "Spain"),
    ("valencia", "Valencia CF", "Spain"),
    ("malaga", "Málaga CF", "Spain"),
    ("castellon", "CD Castellón", "Spain"),
    ("almeria", "UD Almería", "Spain"),
    ("eibar", "SD Eibar", "Spain"),
    ("granada", "Granada CF", "Spain"),
    ("mallorca", "RCD Mallorca", "Spain"),
    ("sporting_gijon", "Sporting de Gijón", "Spain"),
    ("burgos", "Burgos CF", "Spain"),
    ("oviedo", "Real Oviedo", "Spain"),
    ("sabadell", "CE Sabadell FC", "Spain"),
    ("las_palmas", "UD Las Palmas", "Spain"),
    ("cordoba", "Córdoba CF", "Spain"),
    ("valladolid", "Real Valladolid", "Spain"),
    ("tenerife", "CD Tenerife", "Spain"),
    ("eldense", "CD Eldense", "Spain"),
    ("celta_fortuna", "RC Celta Fortuna", "Spain"),
    ("leganes", "CD Leganés", "Spain"),
    ("andorra_fc", "FC Andorra", "Andorra"),
    ("real_sociedad_b", "Real Sociedad B", "Spain"),
    ("cadiz", "Cádiz CF", "Spain"),
    ("albacete", "Albacete Balompié", "Spain"),
    ("ceuta", "AD Ceuta FC", "Spain"),
    ("augsburg", "FC Augsburg", "Germany"),
    ("union_berlin", "1. FC Union Berlin", "Germany"),
    ("werder_bremen", "SV Werder Bremen", "Germany"),
    ("elversberg", "SV 07 Elversberg", "Germany"),
    ("gladbach", "Borussia Mönchengladbach", "Germany"),
    ("hamburger_sv", "Hamburger SV", "Germany"),
    ("koln", "1. FC Köln", "Germany"),
    ("mainz", "1. FSV Mainz 05", "Germany"),
    ("paderborn", "SC Paderborn 07", "Germany"),
    ("schalke", "FC Schalke 04", "Germany"),
    ("wolfsburg", "VfL Wolfsburg", "Germany"),
    ("heidenheim", "1. FC Heidenheim", "Germany"),
    ("st_pauli", "FC St. Pauli", "Germany"),
    ("hannover", "Hannover 96", "Germany"),
    ("darmstadt", "SV Darmstadt 98", "Germany"),
    ("kaiserslautern", "1. FC Kaiserslautern", "Germany"),
    ("hertha", "Hertha BSC", "Germany"),
    ("nurnberg", "1. FC Nürnberg", "Germany"),
    ("bochum", "VfL Bochum", "Germany"),
    ("karlsruhe", "Karlsruher SC", "Germany"),
    ("dynamo_dresden", "Dynamo Dresden", "Germany"),
    ("holstein_kiel", "Holstein Kiel", "Germany"),
    ("bielefeld", "Arminia Bielefeld", "Germany"),
    ("magdeburg", "1. FC Magdeburg", "Germany"),
    ("braunschweig", "Eintracht Braunschweig", "Germany"),
    ("greuther_furth", "SpVgg Greuther Fürth", "Germany"),
    ("energie_cottbus", "FC Energie Cottbus", "Germany"),
    ("osnabruck", "VfL Osnabrück", "Germany"),
    ("cagliari", "Cagliari Calcio", "Italy"),
    ("genoa", "Genoa CFC", "Italy"),
    ("lecce", "US Lecce", "Italy"),
    ("monza", "AC Monza", "Italy"),
    ("parma", "Parma Calcio 1913", "Italy"),
    ("torino", "Torino FC", "Italy"),
    ("udinese", "Udinese Calcio", "Italy"),
    ("venezia", "Venezia FC", "Italy"),
    ("palermo", "Palermo FC", "Italy"),
    ("modena", "Modena FC", "Italy"),
    ("ascoli", "Ascoli Calcio 1898 FC", "Italy"),
    ("mantova", "Mantova 1911", "Italy"),
    ("benevento", "Benevento Calcio", "Italy"),
    ("pisa", "Pisa SC", "Italy"),
    ("sudtirol", "FC Südtirol", "Italy"),
    ("padova", "Calcio Padova", "Italy"),
    ("hellas_verona", "Hellas Verona FC", "Italy"),
    ("avellino", "US Avellino 1912", "Italy"),
    ("cesena", "Cesena FC", "Italy"),
    ("virtus_entella", "Virtus Entella", "Italy"),
    ("carrarese", "Carrarese Calcio", "Italy"),
    ("arezzo", "SS Arezzo", "Italy"),
    ("cremonese", "US Cremonese", "Italy"),
    ("vicenza", "LR Vicenza", "Italy"),
    ("juve_stabia", "SS Juve Stabia", "Italy"),
    ("empoli", "Empoli FC", "Italy"),
    ("sampdoria", "UC Sampdoria", "Italy"),
    ("catanzaro", "US Catanzaro 1929", "Italy"),
    ("angers", "Angers SCO", "France"),
    ("auxerre", "AJ Auxerre", "France"),
    ("le_havre", "Le Havre AC", "France"),
    ("le_mans", "Le Mans FC", "France"),
    ("lorient", "FC Lorient", "France"),
    ("nice", "OGC Nice", "France"),
    ("paris_fc", "Paris FC", "France"),
    ("strasbourg", "RC Strasbourg Alsace", "France"),
    ("toulouse", "Toulouse FC", "France"),
    ("troyes", "ES Troyes AC", "France"),
    ("estoril", "G.D. Estoril Praia", "Portugal"),
    ("gil_vicente", "Gil Vicente F.C.", "Portugal"),
    ("rio_ave", "Rio Ave F.C.", "Portugal"),
    ("santa_clara", "C.D. Santa Clara", "Portugal"),
    ("arouca", "F.C. Arouca", "Portugal"),
    ("moreirense", "Moreirense F.C.", "Portugal"),
    ("casa_pia", "Casa Pia A.C.", "Portugal"),
    ("estrela_amadora", "C.F. Estrela da Amadora", "Portugal"),
    ("academico_viseu", "Académico de Viseu F.C.", "Portugal"),
    ("maritimo", "C.S. Marítimo", "Portugal"),
    ("nacional_madeira", "C.D. Nacional", "Portugal"),
    ("cusco", "Cusco FC", "Peru"),
    ("independiente_medellin", "Independiente Medellín", "Colombia"),
    ("universitario", "Club Universitario de Deportes", "Peru"),
    ("coquimbo", "Coquimbo Unido", "Chile"),
    ("tolima", "Deportes Tolima", "Colombia"),
    ("la_guaira", "Deportivo La Guaira F.C.", "Venezuela"),
    ("independiente_rivadavia", "Independiente Rivadavia", "Argentina"),
    ("universidad_catolica", "Club Deportivo Universidad Católica", "Chile"),
    ("barcelona_sc", "Barcelona S.C.", "Ecuador"),
    ("santa_fe", "Independiente Santa Fe", "Colombia"),
    ("platense", "Club Atlético Platense", "Argentina"),
    ("junior", "Atlético Junior", "Colombia"),
    ("sporting_cristal", "Sporting Cristal", "Peru"),
    ("lanus", "Club Atlético Lanús", "Argentina"),
    ("always_ready", "Club Always Ready", "Bolivia"),
    ("independiente_del_valle", "Independiente del Valle", "Ecuador"),
    ("rosario_central", "Rosario Central", "Argentina"),
    ("universidad_central", "Universidad Central de Venezuela F.C.", "Venezuela"),
    ("america_cali", "América de Cali", "Colombia"),
    ("tigre", "Club Atlético Tigre", "Argentina"),
    ("macara", "C.S.D. Macará", "Ecuador"),
    ("alianza_atletico", "Club Alianza Atlético", "Peru"),
    ("cienciano", "Cienciano", "Peru"),
    ("puerto_cabello", "Academia Puerto Cabello", "Venezuela"),
    ("juventud", "Juventud de Las Piedras", "Uruguay"),
    ("millonarios", "Millonarios F.C.", "Colombia"),
    ("boston_river", "Boston River", "Uruguay"),
    ("ohiggins", "O'Higgins F.C.", "Chile"),
    ("deportivo_cuenca", "C.D. Cuenca", "Ecuador"),
    ("recoleta", "Deportivo Recoleta", "Paraguay"),
    ("caracas", "Caracas F.C.", "Venezuela"),
    ("independiente_petrolero", "Club Independiente Petrolero", "Bolivia"),
    ("palestino", "Club Deportivo Palestino", "Chile"),
    ("riestra", "Deportivo Riestra", "Argentina"),
    ("audax_italiano", "Audax Italiano", "Chile"),
    ("barracas_central", "Club Atlético Barracas Central", "Argentina"),
    ("blooming", "Club Blooming", "Bolivia"),
    ("carabobo", "Carabobo F.C.", "Venezuela"),
]


def get_json(url: str) -> dict:
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=40) as res:
        return json.loads(res.read().decode())


def fetch_bytes(url: str) -> bytes:
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Referer": "https://www.transfermarkt.com/",
            "Accept": "image/*",
        },
    )
    with urllib.request.urlopen(req, timeout=40) as res:
        return res.read()


def wiki_qid(title: str) -> tuple[str, str]:
    url = (
        "https://en.wikipedia.org/w/api.php?action=query&format=json&redirects=1"
        "&prop=pageprops&ppprop=wikibase_item&titles=" + urllib.parse.quote(title)
    )
    page = next(iter(get_json(url)["query"]["pages"].values()))
    if "missing" in page or "pageprops" not in page:
        raise RuntimeError(f"wikipedia page not found: {title}")
    return page["title"], page["pageprops"]["wikibase_item"]


def entity_claims(qid: str) -> dict:
    url = f"https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids={qid}&props=claims"
    return get_json(url)["entities"][qid]["claims"]


def claim_string(claims: dict, prop: str) -> str | None:
    values = claims.get(prop) or []
    if not values:
        return None
    value = values[0].get("mainsnak", {}).get("datavalue", {}).get("value")
    return value if isinstance(value, str) else None


def claim_id(claims: dict, prop: str) -> str | None:
    values = claims.get(prop) or []
    if not values:
        return None
    value = values[0].get("mainsnak", {}).get("datavalue", {}).get("value")
    if isinstance(value, dict):
        return value.get("id")
    return None


def country_label(qid: str) -> str:
    url = (
        "https://www.wikidata.org/w/api.php?action=wbgetentities&format=json"
        f"&ids={qid}&props=labels&languages=en"
    )
    return get_json(url)["entities"][qid].get("labels", {}).get("en", {}).get("value", qid)


def country_ok(actual: str, expected: str) -> bool:
    if actual == expected:
        return True
    if actual in UK and expected in UK:
        return True
    return actual in COUNTRY_ALIASES.get(expected, set())


def to_webp(data: bytes, dest: Path) -> None:
    img = Image.open(io.BytesIO(data)).convert("RGBA")
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)
    if max(img.size) > 512:
        img.thumbnail((512, 512), Image.Resampling.LANCZOS)
    if img.getchannel("A").getextrema()[0] == 255:
        padded = Image.new("RGBA", (img.width + 2, img.height + 2), (0, 0, 0, 0))
        padded.paste(img, (1, 1))
        img = padded
    dest.parent.mkdir(parents=True, exist_ok=True)
    img.save(dest, "WEBP", quality=92, method=6)


# Wikidata has no Transfermarkt id for these clubs. Ids are the verein number.
FALLBACK_TM = {
    "augsburg": "167",
    "universitario": "6593",
    "santa_fe": "11648",
    "sporting_cristal": "1450",
    "lanus": "333",
    "macara": "17426",
    "alianza_atletico": "17479",
    "juventud": "17428",
    "deportivo_cuenca": "8781",
    "carabobo": "14682",
}


def main() -> None:
    ROOT.mkdir(parents=True, exist_ok=True)
    ok: list[str] = []
    miss: list[str] = []
    for slug, title, expected_country in TEAMS:
        dest = ROOT / f"{slug}.webp"
        if dest.exists() and dest.stat().st_size > 800:
            print(f"skip {slug}")
            ok.append(slug)
            continue
        try:
            team_id = FALLBACK_TM.get(slug)
            resolved = title
            if not team_id:
                resolved, qid = wiki_qid(title)
                claims = entity_claims(qid)
                country_qid = claim_id(claims, "P17")
                country = country_label(country_qid) if country_qid else "?"
                if not country_ok(country, expected_country):
                    raise RuntimeError(f"country {country} != {expected_country} ({resolved})")
                team_id = claim_string(claims, "P7223")
            if not team_id:
                raise RuntimeError(f"no Transfermarkt id on {resolved}")
            data = fetch_bytes(f"https://tmssl.akamaized.net/images/wappen/head/{team_id}.png")
            if len(data) < 800:
                raise RuntimeError(f"tiny payload ({len(data)} bytes)")
            to_webp(data, dest)
            print(f"ok {slug:24} tm={team_id:<6} {dest.stat().st_size:6}B  {resolved}")
            ok.append(slug)
        except Exception as err:
            print(f"fail {slug}: {err}")
            miss.append(slug)
        time.sleep(0.12)
    print(f"\ndone {len(ok)}/{len(TEAMS)}")
    if miss:
        print("missing:", ", ".join(miss))
        raise SystemExit(1)


if __name__ == "__main__":
    main()
