# Neon Coast Cover Lab

[![make.fun bounty](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/konzlodon74-dot/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/konzlodon74-dot/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

Entry for the make.fun bounty [gta6-cover-art-01](https://make.fun/bounty/gta6-cover-art-01).

Turn any photo into GTA-style poster cover art — a multi-panel collage with a
neon-sunset colour grade and bold caption lettering — and export it as a PNG
in the sizes posts actually use: 1080 × 1080, 1080 × 1350 and 1920 × 1080.

It is a plain static web app. There is no build step, no account and no
server: serve the `app/` folder with any static file server, open it in a
desktop browser, and everything runs on your own machine. Your photos are
read locally and never uploaded anywhere.

## Use it

1. Pick a layout: Mosaic (6 panels), Triptych (3), Duo (2) or Hero (1).
2. Click a panel, then click one of the bundled photos — or add your own
   photos and drop them into panels instead. One photo can fill every panel,
   or each panel can hold a different one.
3. Drag a photo inside its panel to reframe it, scroll to zoom, and give each
   panel its own look: Sunset grade, Neon grade, Noir or Clean.
4. Write your caption. The title is lettered automatically in a heavy poster
   face with a gradient fill and a black keyline; the kicker line rides on a
   slanted colour strip.
5. Choose a size and press **Export PNG**.

Four sample photos are bundled under `app/samples/` (two made for make.fun,
two generated for this app) so the tool works the moment it opens.

## Run it locally

```
node serve.ts            # serves app/ at http://localhost:8123
```

Regenerate the screenshots in `screenshots/` (headless Chromium required):

```
node shots.mjs           # captures the scenes named in shots.json
```

Hand the entry in the way the grader does:

```
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## Credits and licenses

- App code: MIT, see `LICENSE`.
- Display lettering: Anton and Archivo, both under the SIL Open Font License
  1.1 — the font files and their license texts live in `app/fonts/`.
- Sample photos: made with an image model for make.fun and for this app;
  free to use.

Every title, name and piece of artwork in this app is invented for it. It is
not affiliated with Rockstar Games or the Grand Theft Auto series.
