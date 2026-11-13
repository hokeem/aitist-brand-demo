# Aitist brand demo

Live site: https://aitist-brand-demo.aitist-dev.chatgpt.site/

## Run locally

No build or npm installation is required. From the repository root:

```sh
python3 -m http.server 8000 --directory dist
```

Open http://localhost:8000 . Do not open index.html via file://: WebGL assets use HTTP fetch.

## Source

- `dist/index.html`: current homepage.
- `dist/assets/`: CSS, native WebGL animation, fonts, stone geometry and imagery.
- `dist/blog/`: research index and articles.
- `research-content.json`: research editorial source and references.
- Python generators: retained authoring utilities. They may regenerate older homepage layouts; edit the current dist files directly for the published design.

Deploy `dist/` to any static host. Font licenses are included alongside the fonts. No open-source license is granted for brand assets by this upload.

Snapshot of published source commit d28df0a3dca53355bb43eb9e9d21be7f1a9b935d.
