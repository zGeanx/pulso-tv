"""Download UEFA Champions League 2025/26 league-phase crests as WebP.

Source: Transfermarkt wappen CDN (verified verein IDs).
Porto is not in the 2025/26 league phase; included as an extra catalog crest.
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
    "ajax": 1041,
    "arsenal": 11,
    "atalanta": 800,
    "athletic_club": 621,
    "atletico_madrid": 13,
    "barcelona": 131,
    "bayern_munchen": 27,
    "benfica": 294,
    "bodo_glimt": 1053,
    "borussia_dortmund": 16,
    "chelsea": 631,
    "club_brugge": 2282,
    "copenhagen": 190,
    "eintracht_frankfurt": 24,
    "galatasaray": 141,
    "inter": 46,
    "juventus": 506,
    "kairat_almaty": 10482,
    "bayer_leverkusen": 15,
    "liverpool": 31,
    "manchester_city": 281,
    "marseille": 244,
    "monaco": 162,
    "napoli": 6195,
    "newcastle": 762,
    "olympiacos": 683,
    "pafos": 45457,
    "psg": 583,
    "psv": 383,
    "qarabag": 865,
    "real_madrid": 418,
    "slavia_praha": 62,
    "sporting_cp": 336,
    "tottenham": 148,
    "union_sg": 2004,
    "villarreal": 1050,
    "porto": 720,
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
        url = f"https://tmssl.akamaized.net/images/wappen/head/{team_id}.png"
        try:
            data = fetch(url)
            if len(data) < 800:
                raise RuntimeError(f"tiny payload ({len(data)} bytes)")
            dest = OUT / f"{slug}.webp"
            to_webp(data, dest)
            print(f"ok {slug:22} tm={team_id:<6} {dest.stat().st_size:6}B")
            ok.append(slug)
        except Exception as err:
            print(f"fail {slug}: {err}")
            miss.append(slug)
        time.sleep(0.15)
    print(f"\ndone {len(ok)}/{len(TEAMS)} -> {OUT}")
    if miss:
        print("missing:", ", ".join(miss))


if __name__ == "__main__":
    main()
