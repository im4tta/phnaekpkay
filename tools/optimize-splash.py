#!/usr/bin/env python3
"""Shrink the generated splash PNGs (smooth gradients) to 128-colour PNG-8 with dithering.
Run after tools/make-icons.mjs:  python3 -I tools/optimize-splash.py"""
import glob
from PIL import Image

for path in sorted(glob.glob("public/assets/splash/*.png")):
    img = Image.open(path).convert("RGB")
    img.quantize(colors=128, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.FLOYDSTEINBERG).save(path, optimize=True)
