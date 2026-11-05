"""Download 2026/27 Europa League and Conference League crests as WebP.

Source: Transfermarkt wappen, via the Wikidata Transfermarkt team id (P7223).
Clubs that already live in public/logos/ucl-2026 are not downloaded again.
"""

from __future__ import annotations

import io
import json
import time
import urllib.parse
import urllib.request
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1] / "public" / "logos"
UA = "PulsoTV/1.0 (https://pulso-tv.online; crest lookup)"
UK = {"United Kingdom", "England", "Scotland", "Wales", "Northern Ireland"}
COUNTRY_ALIASES = {
    "Czech Republic": {"Czech Republic", "Czechia"},
    "Czechia": {"Czech Republic", "Czechia"},
    "Turkey": {"Turkey", "Türkiye"},
    "Türkiye": {"Turkey", "Türkiye"},
}

# slug, wikipedia title, expected country, output folder
TEAMS: list[tuple[str, str, str, str]] = [
    ("anderlecht", "R.S.C. Anderlecht", "Belgium", "uel-2026"),
    ("ararat_armenia", "FC Ararat-Armenia", "Armenia", "uel-2026"),
    ("az_alkmaar", "AZ Alkmaar", "Netherlands", "uel-2026"),
    ("bournemouth", "AFC Bournemouth", "England", "uel-2026"),
    ("celje", "NK Celje", "Slovenia", "uel-2026"),
    ("celta_vigo", "RC Celta de Vigo", "Spain", "uel-2026"),
    ("crystal_palace", "Crystal Palace F.C.", "England", "uel-2026"),
    ("ferencvaros", "Ferencvárosi TC", "Hungary", "uel-2026"),
    ("hapoel_beer_sheva", "Hapoel Be'er Sheva F.C.", "Israel", "uel-2026"),
    ("hoffenheim", "TSG 1899 Hoffenheim", "Germany", "uel-2026"),
    ("jagiellonia", "Jagiellonia Białystok", "Poland", "uel-2026"),
    ("lech_poznan", "Lech Poznań", "Poland", "uel-2026"),
    ("levski_sofia", "PFC Levski Sofia", "Bulgaria", "uel-2026"),
    ("lillestrom", "Lillestrøm SK", "Norway", "uel-2026"),
    ("nec", "NEC Nijmegen", "Netherlands", "uel-2026"),
    ("ofi", "OFI Crete F.C.", "Greece", "uel-2026"),
    ("omonia", "AC Omonia", "Cyprus", "uel-2026"),
    ("rennes", "Stade Rennais F.C.", "France", "uel-2026"),
    ("sunderland", "Sunderland A.F.C.", "England", "uel-2026"),
    ("torreense", "S.C.U. Torreense", "Portugal", "uel-2026"),
    ("freiburg", "SC Freiburg", "Germany", "uecl-2026"),
    ("gent", "K.A.A. Gent", "Belgium", "uecl-2026"),
    ("brighton", "Brighton & Hove Albion F.C.", "England", "uecl-2026"),
    ("lugano", "FC Lugano", "Switzerland", "uecl-2026"),
    ("getafe", "Getafe CF", "Spain", "uecl-2026"),
    ("kups", "Kuopion Palloseura", "Finland", "uecl-2026"),
    ("twente", "FC Twente", "Netherlands", "uecl-2026"),
    ("lincoln_red_imps", "Lincoln Red Imps F.C.", "Gibraltar", "uecl-2026"),
    ("borac_banja_luka", "FK Borac Banja Luka", "Bosnia and Herzegovina", "uecl-2026"),
    ("sint_truiden", "Sint-Truidense V.V.", "Belgium", "uecl-2026"),
    ("brann", "SK Brann", "Norway", "uecl-2026"),
    ("hearts", "Heart of Midlothian F.C.", "Scotland", "uecl-2026"),
    ("trabzonspor", "Trabzonspor", "Turkey", "uecl-2026"),
    ("universitatea_craiova", "CS Universitatea Craiova", "Romania", "uecl-2026"),
    ("riga", "Riga FC", "Latvia", "uecl-2026"),
    ("hajduk_split", "HNK Hajduk Split", "Croatia", "uecl-2026"),
    ("jablonec", "FK Jablonec", "Czech Republic", "uecl-2026"),
    ("nordsjaelland", "FC Nordsjælland", "Denmark", "uecl-2026"),
    ("agf", "Aarhus Gymnastikforening", "Denmark", "uecl-2026"),
    ("inter_escaldes", "Inter Club d'Escaldes", "Andorra", "uecl-2026"),
    ("thun", "FC Thun", "Switzerland", "uecl-2026"),
    ("cska_sofia", "PFC CSKA Sofia", "Bulgaria", "uecl-2026"),
    ("kauno_zalgiris", "FK Kauno Žalgiris", "Lithuania", "uecl-2026"),
    ("mjallby", "Mjällby AIF", "Sweden", "uecl-2026"),
    ("iberia_1999", "FC Iberia 1999", "Georgia", "uecl-2026"),
    ("egnatia", "KF Egnatia", "Albania", "uecl-2026"),
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
    dest.parent.mkdir(parents=True, exist_ok=True)
    img.save(dest, "WEBP", quality=92, method=6)


def main() -> None:
    ok: list[str] = []
    miss: list[str] = []
    for slug, title, expected_country, folder in TEAMS:
        dest = ROOT / folder / f"{slug}.webp"
        try:
            resolved, qid = wiki_qid(title)
            claims = entity_claims(qid)
            country_qid = claim_id(claims, "P17")
            country = country_label(country_qid) if country_qid else "?"
            if not country_ok(country, expected_country):
                raise RuntimeError(f"country {country} != {expected_country} ({resolved})")
            team_id = claim_string(claims, "P7223")
            if not team_id:
                raise RuntimeError(f"no Transfermarkt id on {resolved}")
            if dest.exists() and dest.stat().st_size > 800:
                print(f"skip {slug:22} tm={team_id:<6} {resolved}")
                ok.append(slug)
                continue
            data = fetch_bytes(f"https://tmssl.akamaized.net/images/wappen/head/{team_id}.png")
            if len(data) < 800:
                raise RuntimeError(f"tiny payload ({len(data)} bytes)")
            to_webp(data, dest)
            print(f"ok {slug:22} tm={team_id:<6} {dest.stat().st_size:6}B  {resolved} ({country})")
            ok.append(slug)
        except Exception as err:
            print(f"fail {slug}: {err}")
            miss.append(slug)
        time.sleep(0.15)
    print(f"\ndone {len(ok)}/{len(TEAMS)}")
    if miss:
        print("missing:", ", ".join(miss))
        raise SystemExit(1)


if __name__ == "__main__":
    main()
