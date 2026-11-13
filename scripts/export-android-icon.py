#!/usr/bin/env python3
"""Export the Android launcher icon from the iOS app icon.

The iOS icon draws the solar system inside a rounded frame on black. The
adaptive foreground crops the square inside that frame (so no rim or corner
shows under any launcher mask), maps it onto the 72dp visible area and mirrors
it outward to fill the 108dp layer. The monochrome layer is a ringed planet,
the icon's Saturn, inside the 66dp safe zone. Legacy icons cover API 24 and
25. Every file is WebP because the repository ignores *.PNG.

Requires Pillow and numpy. Run from the repository root:

    python3 scripts/export-android-icon.py
"""
import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
MASTER = ROOT / "ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png"
RES = ROOT / "android/app/src/main/res"
DENSITIES = {"mdpi": 1, "hdpi": 1.5, "xhdpi": 2, "xxhdpi": 3, "xxxhdpi": 4}

CROP = (100, 100, 924, 924)   # inside the frame's rim and rounded corners
LAYER = 432                   # 108dp at xxxhdpi


def foreground():
    art = np.asarray(Image.open(MASTER).convert("RGB").crop(CROP))
    pad = round(art.shape[0] * 18 / 72)
    full = np.pad(art, ((pad, pad), (pad, pad), (0, 0)), mode="reflect")
    return Image.fromarray(full).resize((LAYER, LAYER), Image.LANCZOS).convert("RGBA")


def saturn(px=LAYER * 4):
    """Ringed planet: disc radius 13dp, ring 27dp x 8dp tilted 18 degrees."""
    k = px / 108
    y, x = np.mgrid[0:px, 0:px]
    u = (x + 0.5) / k - 54
    v = (y + 0.5) / k - 54
    disc = u * u + v * v <= 13.0 ** 2
    near_disc = u * u + v * v <= 15.0 ** 2
    t = math.radians(-18)
    ru = u * math.cos(t) - v * math.sin(t)       # ring frame
    rv = u * math.sin(t) + v * math.cos(t)
    ring_r = np.sqrt((ru / 27.0) ** 2 + (rv / 8.0) ** 2)
    band = (ring_r >= 0.80) & (ring_r <= 1.0)
    band_gap = (ring_r >= 0.70) & (ring_r <= 1.10)
    front = rv > 0
    shape = (disc & ~(band_gap & front)) | (band & ~(near_disc & ~front))
    img = Image.fromarray((shape * 255).astype("uint8"))
    alpha = img.resize((LAYER, LAYER), Image.LANCZOS)
    out = Image.new("RGBA", (LAYER, LAYER), (255, 255, 255, 0))
    out.putalpha(alpha)
    return out


def legacy(fg, size, round_icon):
    inner = round(size * 44 / 48)
    big = inner * 4
    mask = Image.new("L", (big, big), 0)
    draw = ImageDraw.Draw(mask)
    if round_icon:
        draw.ellipse([0, 0, big - 1, big - 1], fill=255)
    else:
        draw.rounded_rectangle([0, 0, big - 1, big - 1], radius=round(big * 0.18), fill=255)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    off = (size - inner) // 2
    visible = fg.crop((72, 72, 360, 360)).resize((inner, inner), Image.LANCZOS)
    out.paste(visible, (off, off), mask.resize((inner, inner), Image.LANCZOS))
    return out


def main():
    fg = foreground()
    mono = saturn()
    for name, scale in DENSITIES.items():
        folder = RES / f"mipmap-{name}"
        folder.mkdir(parents=True, exist_ok=True)
        px = round(108 * scale)
        fg.resize((px, px), Image.LANCZOS).save(folder / "ic_launcher_foreground.webp", "WEBP", quality=94, method=6)
        mono.resize((px, px), Image.LANCZOS).save(folder / "ic_launcher_monochrome.webp", "WEBP", lossless=True)
        for round_icon, file in ((False, "ic_launcher.webp"), (True, "ic_launcher_round.webp")):
            legacy(fg, round(48 * scale), round_icon).save(folder / file, "WEBP", lossless=True)
    print(f"wrote launcher layers to {RES.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
