#!/usr/bin/env python3
"""
One-time photo optimization for kiril-skidsteer v4.

Source JPEGs in public/images/ are 360-592 KB (smartphone-source).
Strategy: pre-compress each photo to ONE master WebP at 1280px long edge, Q82.
Next.js Image component handles responsive variants (srcset) at build/runtime.

Targets per directive:
  - master WebP: <=120 KB (effectively gives <100 KB hero variant + <40 KB thumb variant via next/image)
  - quality floor: Q78 (anti-pattern warning: don't sacrifice authenticity)

Outputs:
  {basename}.webp           master variant (1280px long edge, Q82)
Originals (JPGs) preserved as fallbacks + repo masters.
"""
import sys
from pathlib import Path
from PIL import Image, ImageOps

PUBLIC_IMAGES = Path(__file__).resolve().parent.parent / "public" / "images"

MASTER_MAX_LONG_EDGE = 1280
MASTER_QUALITY_START = 82
MASTER_QUALITY_FLOOR = 78
TARGET_KB = 120

SOURCES = [
    "cat-259b3-side-badge.jpg",
    "cat-259b3-front-snow.jpg",
    "mini-loading-bin-residential.jpg",
    "mini-demo-bricks.jpg",
    "mini-pushing-bricks.jpg",
    "mini-scooping-debris.jpg",
]


def fit_long_edge(img: Image.Image, max_long_edge: int) -> Image.Image:
    w, h = img.size
    long_edge = max(w, h)
    if long_edge <= max_long_edge:
        return img
    scale = max_long_edge / long_edge
    new_size = (round(w * scale), round(h * scale))
    return img.resize(new_size, Image.LANCZOS)


def encode_webp(src_path: Path, out_path: Path) -> dict:
    img = Image.open(src_path)
    img = ImageOps.exif_transpose(img)
    if img.mode != "RGB":
        img = img.convert("RGB")
    img = fit_long_edge(img, MASTER_MAX_LONG_EDGE)
    last_size = None
    last_q = None
    for q in range(MASTER_QUALITY_START, MASTER_QUALITY_FLOOR - 1, -1):
        img.save(out_path, format="WEBP", quality=q, method=6)
        size_kb = out_path.stat().st_size / 1024
        last_size, last_q = size_kb, q
        if size_kb <= TARGET_KB:
            return {
                "in": src_path.name,
                "out": out_path.name,
                "dims": img.size,
                "quality": q,
                "size_kb": round(size_kb, 1),
                "within_budget": True,
            }
    return {
        "in": src_path.name,
        "out": out_path.name,
        "dims": img.size,
        "quality": last_q,
        "size_kb": round(last_size, 1),
        "within_budget": False,
    }


def main():
    results = []
    for src_name in SOURCES:
        src_path = PUBLIC_IMAGES / src_name
        if not src_path.exists():
            print(f"MISSING: {src_path}", file=sys.stderr)
            continue
        out_path = PUBLIC_IMAGES / f"{src_path.stem}.webp"
        results.append(encode_webp(src_path, out_path))
    print(f"{'source':<40}{'output':<40}{'dims':<14}{'Q':<4}{'KB':>7}{'fit':>6}")
    for r in results:
        dims = f"{r['dims'][0]}x{r['dims'][1]}"
        fit = "OK" if r["within_budget"] else "OVER"
        print(f"{r['in']:<40}{r['out']:<40}{dims:<14}{r['quality']:<4}{r['size_kb']:>7}{fit:>6}")
    total_jpg = sum((PUBLIC_IMAGES / s).stat().st_size for s in SOURCES if (PUBLIC_IMAGES / s).exists()) / 1024
    total_webp = sum((PUBLIC_IMAGES / (Path(s).stem + ".webp")).stat().st_size for s in SOURCES if (PUBLIC_IMAGES / (Path(s).stem + ".webp")).exists()) / 1024
    print(f"\nTotal: JPG={total_jpg:.0f} KB -> WebP={total_webp:.0f} KB  (reduction {(1-total_webp/total_jpg)*100:.0f}%)")


if __name__ == "__main__":
    main()
