#!/usr/bin/env python3
"""One-off converter: turns the legacy 10 MB project JSON files (base64 PNG inside)
into small per-site assets served as static files:

  public/assets/sites/index.json
  public/assets/sites/<slug>/project.json     (frame URLs instead of data URLs)
  public/assets/sites/<slug>/frame-N.webp
  public/assets/sites/<slug>/thumb.webp       (480x300 card thumbnail)
  public/assets/sites/<slug>/annotation.png

Usage: python3 tools/convert-sites.py <legacy-json-dir> [out-dir]
Requires Pillow with WebP support. Not part of the build; the output is committed.
"""
import base64, io, json, os, sys
from PIL import Image

SITES = [  # file stem in the legacy folder, slug, display name
    ("phnaek-pkay-Boeng Trakoun", "boeng-trakoun", "Boeng Trakoun"),
    ("phnaek-pkay-prey chan village", "prey-chan", "Prey Chan"),
    ("phnaek-pkay-chhorkchey Village", "chhork-chey", "Chhork Chey"),
    ("phnaek-pkay-thma-da", "thma-da", "Thma Da"),
    ("phnaek-pkay-an-ses", "an-ses", "An Ses"),
]
DESC = "Village site along the Cambodia–Thailand border"
SECRET_KEYS = ("mapboxToken", "sentinelId", "placesApiKey")


def decode(data_url):
    return Image.open(io.BytesIO(base64.b64decode(data_url.split(",", 1)[1])))


def main(src_dir, out_dir):
    index = []
    for stem, slug, name in SITES:
        project = json.load(open(os.path.join(src_dir, stem + ".json"), encoding="utf-8"))
        site_dir = os.path.join(out_dir, slug)
        os.makedirs(site_dir, exist_ok=True)
        frames = []
        for n, im in enumerate(project["images"], start=1):
            img = decode(im["src"]).convert("RGB")
            path = f"frame-{n}.webp"
            img.save(os.path.join(site_dir, path), "WEBP", quality=88, method=6)
            if n == 1:
                thumb = img.copy()
                thumb.thumbnail((480, 300))
                thumb.save(os.path.join(site_dir, "thumb.webp"), "WEBP", quality=78, method=6)
            entry = {k: v for k, v in im.items() if k != "src"}
            entry["src"] = f"/assets/sites/{slug}/{path}"
            frames.append(entry)
        out = {k: v for k, v in project.items() if k not in ("images", "annotation", "savedAt")}
        if project.get("map"):
            out["map"] = {k: v for k, v in project["map"].items() if k not in SECRET_KEYS}
        out["images"] = frames
        if project.get("annotation"):
            note = decode(project["annotation"]).convert("RGBA")
            if note.getchannel("A").getbbox():  # skip fully transparent (empty) drawings
                note.save(os.path.join(site_dir, "annotation.png"), optimize=True)
                out["annotation"] = f"/assets/sites/{slug}/annotation.png"
        json.dump(out, open(os.path.join(site_dir, "project.json"), "w", encoding="utf-8"), separators=(",", ":"))
        index.append({
            "slug": slug, "name": name, "desc": DESC,
            "lat": project["map"]["lat"], "lng": project["map"]["lng"],
            "thumb": f"/assets/sites/{slug}/thumb.webp", "frames": len(frames),
        })
    json.dump({"sites": index}, open(os.path.join(out_dir, "index.json"), "w", encoding="utf-8"), indent=1)
    print("wrote", len(index), "sites to", out_dir)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else "public/assets/sites")
