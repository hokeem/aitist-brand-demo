# Zenith brand and website

Zenith (formerly Aitist) builds efficient inference systems. This repo holds the brand system and the static website.

- **Brand guidelines:** [BRAND.md](BRAND.md)
- **Logo files:** [`brand/`](brand/)
- **Website preview:** https://aitist.airacle-home.pages.dev (temporary)

## Run the site locally

No build step or npm install is needed. From the repository root:

```sh
python3 -m http.server 8000 --directory dist
```

Open http://localhost:8000. Don't open `index.html` via `file://`, because the 3D scene loads ES modules over HTTP.

## Structure

- `dist/index.html`: the homepage.
- `dist/assets/scene.js`: the real-time 3D scene. It renders the GPU module, the sand river, the crystal and the chip with three.js, which is vendored in `dist/assets/vendor/`. It has three modes:
  - `hero`: the river pours into the GPU, and the board turns gold on scroll;
  - `story`: one object per results step, with a sand orbit;
  - `cover`: static renders for cards.
- `dist/assets/boot.js`: mounts the scenes and links the 3D steps to the results section.
- `dist/assets/v2.css`, `v2.js`: site styles and reveal motion.
- `dist/assets/tiles/`, `dist/assets/research/`: card images and research covers. They are 3D renders plus dark macro photography.
- `dist/blog/`: research index and articles.
- `dist/favicon.svg`: the app icon.
- `research-content.json`: editorial source and references for the research notes.
- `tools/render-art.html`: re-renders 3D card and cover art from `scene.js` (see below).
- `legacy/`: Python generators from the Aitist stone-era site, kept for reference only. They produce the old layout.

## Re-render the 3D art

Serve the repo root, not `dist/`, and open the renderer:

```sh
python3 -m http.server 8000
# http://localhost:8000/tools/render-art.html?n=0          research cover 0 (1440x900)
# http://localhost:8000/tools/render-art.html?n=6&w=2400&h=1000   wide card
# http://localhost:8000/tools/render-art.html?mode=hero    hero still
```

Covers 0–5 match the six research notes; 6–9 are the card layouts. Screenshot the canvas at 2x and export as WebP.

## Deploy

Deploy `dist/` to any static host. The current preview runs on Cloudflare Pages:

```sh
wrangler pages deploy dist --project-name airacle-home --branch aitist
```

Font licenses (OFL) are bundled next to the fonts. Brand assets are not open-source licensed.
