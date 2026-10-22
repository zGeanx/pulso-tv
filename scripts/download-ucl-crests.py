"""Download UEFA Champions League and European crests as WebP.

Source: Transfermarkt wappen CDN (verified verein IDs).
"""

from __future__ import annotations

import io
import time
import urllib.request
from pathlib import Path

from PIL import Image

OUT = Path(__file__).resolve().parents[1] / "public" / "logos" / "ucl-2026"

# Transfermarkt /startseite/verein/{id}
TEAMS: dict[str, int] = {
    # 2024/25 & 2025/26 League Phase 36 Clubs
    "real_madrid": 418,
    "manchester_city": 281,
    "bayern_munchen": 27,
    "psg": 583,
    "liverpool": 31,
    "inter": 46,
    "borussia_dortmund": 16,
    "rb_leipzig": 23826,
    "barcelona": 131,
    "bayer_leverkusen": 15,
    "atletico_madrid": 13,
    "atalanta": 800,
    "juventus": 506,
    "benfica": 294,
    "arsenal": 11,
    "club_brugge": 2282,
    "shakhtar": 660,
    "milan": 5,
    "feyenoord": 234,
    "sporting_cp": 336,
    "psv": 383,
    "dinamo_zagreb": 419,
    "salzburg": 509,
    "lille": 1082,
    "estrela_vermelha": 159,
    "young_boys": 252,
    "celtic": 371,
    "slovan_bratislava": 540,
    "monaco": 162,
    "sparta_praga": 197,
    "aston_villa": 405,
    "bologna": 1025,
    "girona": 12321,
    "stuttgart": 79,
    "sturm_graz": 122,
    "brest": 3911,
    # European League & Qualifiers & Top Clubs
    "chelsea": 631,
    "tottenham": 148,
    "newcastle": 762,
    "manchester_united": 985,
    "athletic_club": 621,
    "villarreal": 1050,
    "real_sociedad": 681,
    "real_betis": 150,
    "eintracht_frankfurt": 24,
    "napoli": 6195,
    "roma": 12,
    "lazio": 398,
    "fiorentina": 430,
    "marseille": 244,
    "rc_lens": 826,
    "lyon": 1041,
    "porto": 720,
    "braga": 1075,
    "galatasaray": 141,
    "fenerbahce": 36,
    "besiktas": 114,
    "bodo_glimt": 1053,
    "copenhagen": 190,
    "slavia_praha": 62,
    "union_sg": 2004,
    "olympiacos": 683,
    "paok": 1091,
    "panathinaikos": 265,
    "aek_atenas": 2441,
    "qarabag": 10625,
    "kairat_almaty": 10482,
    "pafos": 45457,
    "sabah": 63993,
    "ajax": 610,
    "como": 1047,
    "viking": 239,
    "lask_linz": 413,
    "viktoria_plzen": 941,
    "malmo": 496,
    "midtjylland": 865,
    # South American clubs commonly encountering Wikimedia 429 rate-limiting
    "olimpia": 4467,
    "colo_colo": 2434,
    "deportivo_cali": 4124,
    "talleres": 3938,
    "estudiantes": 288,
    "cerro_porteno": 4464,
    "nacional": 4434,
    "penarol": 2817,
    "u_de_chile": 4426,
    "libertad": 4466,
    "bolivar": 1746,
}

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"


def fetch(url: str) -> bytes:
    req = urllib.request.Request(
        url,
        headers={"User-Agent": UA, "Referer": "https://www.transfermarkt.com/", "Accept": "image/*"},
    )
    with urllib.request.urlopen(req, timeout=40) as res:
        return res.read()


def to_webp(data: bytes, dest: Path) -> None:
    img = Image.open(io.BytesIO(data)).convert("RGBA")
    if max(img.size) > 512:
        img.thumbnail((512, 512), Image.Resampling.LANCZOS)
    dest.parent.mkdir(parents=True, exist_ok=True)
    img.save(dest, "WEBP", quality=92, method=6)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    ok: list[str] = []
    miss: list[str] = []
    for slug, team_id in TEAMS.items():
        dest = OUT / f"{slug}.webp"
        url = f"https://tmssl.akamaized.net/images/wappen/head/{team_id}.png"
        try:
            data = fetch(url)
            if len(data) < 800:
                raise RuntimeError(f"tiny payload ({len(data)} bytes)")
            to_webp(data, dest)
            print(f"ok {slug:22} tm={team_id:<6} {dest.stat().st_size:6}B")
            ok.append(slug)
        except Exception as err:
            print(f"fail {slug}: {err}")
            miss.append(slug)
        time.sleep(0.1)
    print(f"\ndone {len(ok)}/{len(TEAMS)} -> {OUT}")
    if miss:
        print("missing:", ", ".join(miss))


if __name__ == "__main__":
    main()
