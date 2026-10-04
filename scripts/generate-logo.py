#!/usr/bin/env python3
"""
Generate logo candidates for King Equipment Rental via Imagen 4.

Per directive WS3:
- Brand: King Equipment Rental (Toronto-area skid-steer rental)
- Color: deep orange #C2410C on white
- Style: professional industrial, NOT cute/cartoonish/startup-clean
- First pass: text-free marks (text reliability is dominant Imagen failure mode)
- Generate 4-8 candidates across 2-3 prompt variants; visual QA before owner-eye

Outputs PNGs to public/images/logo-candidates/.
"""
import base64
import json
import os
import sys
import urllib.request
from pathlib import Path

OUT_DIR = Path(__file__).resolve().parent.parent / "public" / "images" / "logo-candidates"
KEY_PATH = Path("/tmp/.gemini_key")
MODEL = "imagen-4.0-generate-001"
ENDPOINT = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:predict"

PROMPTS = [
    {
        "label": "v1-crown-block",
        "prompt": (
            "Bold geometric logo mark for an industrial equipment rental company. "
            "Subject: a stylized crown silhouette formed from solid angular blocks, "
            "suggesting strength and stability. Deep orange (hex #C2410C) on a pure white background. "
            "Flat vector design. No text. No words. No letters. No gradients. No drop shadows. "
            "No photorealistic detail. No small intricate elements. "
            "Clean simple lines that read clearly at favicon size (16x16 pixels) and at large nav size. "
            "Square 1:1 aspect ratio. Centered composition. Single primary subject."
        ),
        "n": 4,
    },
    {
        "label": "v2-angular-monogram",
        "prompt": (
            "Professional logo mark for a Toronto heavy-equipment rental business. "
            "Subject: a strong angular geometric shape — like a stylized anvil silhouette, or a bold "
            "diamond/shield form, or an abstract industrial mark suggesting machinery strength. "
            "Solid deep orange (hex #C2410C) on pure white background. Flat design. No gradients. "
            "No text. No words. No letters. No alphabet characters anywhere in the image. "
            "Heavy industrial feel — not cute, not cartoonish, not startup-clean. "
            "Scales cleanly from 16x16 favicon to 200x200 navigation logo. "
            "Square 1:1 aspect ratio. Centered composition. Single bold subject."
        ),
        "n": 4,
    },
]


def load_key() -> str:
    if KEY_PATH.exists():
        return KEY_PATH.read_text().strip()
    return os.environ.get("GEMINI_API_KEY", "").strip()


def call_imagen(prompt: str, sample_count: int, key: str) -> list[bytes]:
    payload = {
        "instances": [{"prompt": prompt}],
        "parameters": {
            "sampleCount": sample_count,
            "aspectRatio": "1:1",
            "personGeneration": "dont_allow",
        },
    }
    req = urllib.request.Request(
        f"{ENDPOINT}?key={key}",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=90) as resp:
        body = json.loads(resp.read())
    preds = body.get("predictions", [])
    images = []
    for p in preds:
        b64 = p.get("bytesBase64Encoded")
        if b64:
            images.append(base64.b64decode(b64))
    return images


def main():
    key = load_key()
    if not key:
        print("ERROR: no GEMINI_API_KEY found", file=sys.stderr)
        sys.exit(1)
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    saved = []
    for variant in PROMPTS:
        label = variant["label"]
        try:
            print(f"[gen] {label}: requesting {variant['n']} candidates...")
            images = call_imagen(variant["prompt"], variant["n"], key)
        except urllib.error.HTTPError as e:
            print(f"  HTTP ERROR: {e.code} {e.reason}", file=sys.stderr)
            print(f"  body: {e.read().decode()[:500]}", file=sys.stderr)
            continue
        except Exception as e:
            print(f"  ERROR: {e}", file=sys.stderr)
            continue
        for i, img_bytes in enumerate(images, 1):
            out = OUT_DIR / f"{label}-{i:02d}.png"
            out.write_bytes(img_bytes)
            saved.append(out)
            print(f"  -> {out.name}  ({len(img_bytes)/1024:.1f} KB)")
    print(f"\nSaved {len(saved)} candidates to {OUT_DIR}")


if __name__ == "__main__":
    main()
