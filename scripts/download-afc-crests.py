"""Download AFC Champions League Elite 2026/27 crests as WebP.

Source: Transfermarkt wappen, via the Wikidata Transfermarkt team id (P7223).
"""

from __future__ import annotations

import io
import json
import time
import urllib.parse
import urllib.request
from pathlib import Path

from PIL import Image

OUT = Path(__file__).resolve().parents[1] / "public" / "logos" / "afc-2026"
UA = "PulsoTV/1.0 (https://pulso-tv.online; crest lookup)"

# slug, wikipedia title, expected country
TEAMS: list[tuple[str, str, str]] = [
    ("al_hilal", "Al Hilal SFC", "Saudi Arabia"),
    ("al_ahli_dubai", "Shabab Al Ahli Club", "United Arab Emirates"),
    ("al_ahli", "Al-Ahli Saudi FC", "Saudi Arabia"),
    ("al_nassr", "Al-Nassr FC", "Saudi Arabia"),
    ("al_ittihad", "Al-Ittihad Club (Jeddah)", "Saudi Arabia"),
    ("al_qadsiah", "Al Qadsiah FC", "Saudi Arabia"),
    ("al_ain", "Al Ain FC", "United Arab Emirates"),
    ("al_wasl", "Al Wasl SC", "United Arab Emirates"),
    ("al_sadd", "Al Sadd SC", "Qatar"),
    ("al_gharafa", "Al-Gharafa SC", "Qatar"),
    ("al_shamal", "Al-Shamal SC", "Qatar"),
    ("esteghlal", "Esteghlal F.C.", "Iran"),
    ("tractor", "Tractor S.C.", "Iran"),
    ("neftchi_fergana", "FC Neftchi Fergana", "Uzbekistan"),
    ("pakhtakor", "Pakhtakor FC", "Uzbekistan"),
    ("al_quwa_al_jawiya", "Al-Quwa Al-Jawiya", "Iraq"),
    ("buriram", "Buriram United F.C.", "Thailand"),
    ("kashima", "Kashima Antlers", "Japan"),
    ("jeonbuk", "Jeonbuk Hyundai Motors", "South Korea"),
    ("shanghai_port", "Shanghai Port F.C.", "China"),
    ("daejeon", "Daejeon Hana Citizen", "South Korea"),
    ("vissel_kobe", "Vissel Kobe", "Japan"),
    ("newcastle_jets", "Newcastle Jets FC", "Australia"),
    ("johor", "Johor Darul Ta'zim F.C.", "Malaysia"),
    ("port_fc", "Port F.C.", "Thailand"),
    ("beijing_guoan", "Beijing Guoan F.C.", "China"),
    ("pohang", "Pohang Steelers", "South Korea"),
    ("kashiwa", "Kashiwa Reysol", "Japan"),
    ("cong_an_ha_noi", "Cong An Hanoi FC", "Vietnam"),
    ("kyoto_sanga", "Kyoto Sanga FC", "Japan"),
    ("ratchaburi", "Ratchaburi F.C.", "Thailand"),
    ("gamba_osaka", "Gamba Osaka", "Japan"),
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
    label = get_json(url)["entities"][qid].get("labels", {}).get("en", {}).get("value", qid)
    if label == "People's Republic of China":
        return "China"
    return label


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
    OUT.mkdir(parents=True, exist_ok=True)
    ok: list[str] = []
    miss: list[str] = []
    for slug, title, expected_country in TEAMS:
        dest = OUT / f"{slug}.webp"
        try:
            resolved, qid = wiki_qid(title)
            claims = entity_claims(qid)
            country_qid = claim_id(claims, "P17")
            country = country_label(country_qid) if country_qid else "?"
            if country != expected_country:
                raise RuntimeError(f"country {country} != {expected_country} ({resolved})")
            team_id = claim_string(claims, "P7223")
            if not team_id:
                raise RuntimeError(f"no Transfermarkt id on {resolved}")
            data = fetch_bytes(f"https://tmssl.akamaized.net/images/wappen/head/{team_id}.png")
            if len(data) < 800:
                raise RuntimeError(f"tiny payload ({len(data)} bytes)")
            to_webp(data, dest)
            print(f"ok {slug:22} tm={team_id:<6} {resolved}")
            ok.append(slug)
        except Exception as err:
            print(f"fail {slug}: {err}")
            miss.append(slug)
        time.sleep(0.12)
    print(f"\ndone {len(ok)}/{len(TEAMS)} -> {OUT}")
    if miss:
        print("missing:", ", ".join(miss))


if __name__ == "__main__":
    main()
