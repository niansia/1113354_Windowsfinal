"""Batch background-removal for the bird globe -- turns every iNaturalist photo into
a transparent cutout (the "real bird standing on the planet" look).

For each species in tools/_birds.json (exported from birds.generated.js):
  download the 240px "small" photo -> rembg (u2netp, CPU onnx) -> trim to content
  -> fit into 128px -> save web/birdcut/{taxonId}.png

Resumable: existing outputs are skipped, so re-running only fills the gaps.
Run:  python tools/gen_birdcut.py
"""
import io
import json
import sys
import time
import urllib.request
from pathlib import Path

from PIL import Image
from rembg import new_session, remove

HERE = Path(__file__).resolve().parent
OUT = HERE.parent / "web" / "birdcut"
OUT.mkdir(exist_ok=True)

birds = json.loads((HERE / "_birds.json").read_text(encoding="utf-8"))
session = new_session("u2netp")          # small fast model, fine for bokeh bird shots

UA = {"User-Agent": "CulturaGlobe/1.0 (educational; bird cutout build)"}
ok = skip = fail = 0
t0 = time.time()

for i, b in enumerate(birds):
    dst = OUT / (str(b["taxonId"]) + ".png")
    if dst.exists() and dst.stat().st_size > 0:
        skip += 1
        continue
    url = (b.get("sq") or "").replace("square", "small")
    if not url:
        fail += 1
        continue
    try:
        req = urllib.request.Request(url, headers=UA)
        with urllib.request.urlopen(req, timeout=15) as r:
            raw = r.read()
        cut = remove(raw, session=session)
        im = Image.open(io.BytesIO(cut)).convert("RGBA")
        bbox = im.getbbox()
        if bbox:
            im = im.crop(bbox)
        # drop cutouts where segmentation basically erased everything
        if im.width < 24 or im.height < 24:
            fail += 1
            continue
        im.thumbnail((128, 128), Image.LANCZOS)
        im.save(dst, "PNG", optimize=True)
        ok += 1
    except Exception as e:  # noqa: BLE001 -- log and move on, the run must finish
        fail += 1
        sys.stdout.write(f"  ! {b['taxonId']} {b.get('en','')}: {e}\n")
    if (i + 1) % 50 == 0:
        el = time.time() - t0
        sys.stdout.write(f"  [{i + 1}/{len(birds)}] ok={ok} skip={skip} fail={fail} ({el:.0f}s)\n")
        sys.stdout.flush()
    time.sleep(0.05)

print(f"done: ok={ok} skip={skip} fail={fail} -> {OUT}")
