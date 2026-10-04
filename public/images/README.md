# Photos — swap-in instructions

Photos are config-driven. To replace placeholders with real photos from Kiril:

1. Drop the new files into this directory. Recommended sizes: 1200×1200 (square) or 1600×900 (landscape).
2. Edit `config/site.json` → `photos` array. Update `src` paths and `alt` text.
3. Commit + push. Vercel rebuilds the static site automatically.

No code changes required. The `PhotoStrip` and home-page hero pull from `config/site.json` at build time.

## Current placeholders

`skidsteer-1.svg` … `skidsteer-4.svg` — generic dark slate / orange swatches with caption "Skid-steer photo N".
Replace with real JPGs (e.g. `skidsteer-1.jpg`) and update `src` extension in `config/site.json`.
