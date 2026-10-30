# le goat — asset pipeline

These scripts record the live site and article and render the files posted to each platform. Run them from the repo root. Every Medium and Substack file starts with its figure's number in the article (01–16, top to bottom), and its caption is the article's.

The posted files are committed under `assets/`, one folder per platform: `assets/medium/`, `assets/substack/`, `assets/linkedin/`, `assets/instagram/`. What the scripts build along the way stays local and gitignored under `source/`: `source/figures/` holds the figure masters, `source/social/` the social masters, and `source/raw/` the original 4K Figma recording.

## Setup

```
cd pipeline && npm install && cd ..          # Playwright, for record.mjs and social.mjs
python3 -m venv pipeline/.venv
pipeline/.venv/bin/pip3 install -r pipeline/requirements.txt   # numpy, for loop.py and scenes.py
```

The shell scripts need `ffmpeg` and `bc`. The recorders need the repo served on port 8771: `python3 -m http.server 8771`.

## Platform rules

- **Medium** — JPG, PNG, GIF, 25 MB each (inline and featured). No WebP, no MP4 upload; only an uploaded GIF autoplays and loops. Full-width needs ≥ 1192 px; 1400 px recommended.
- **Substack** — AVIF, GIF, JPG, PNG, WebP (inline and cover). Some email clients show only a GIF's first frame.
- **Substack's two limits** — Substack takes a GIF only under about 5.4 MB *and* about 300 frames: 5.35 MB / 112 frames posted, while 5.6 MB / 209 frames and 3.5 MB / 326 frames did not. `fit.sh` holds every fitted GIF under 5.4 MB and 290 frames. A GIF frame carries its own delay, so frames that barely change (a wait, a blinking caret) are dropped and the frame before them is held for their time (`mpdecimate`, timing kept): a long loop spends its frames where something moves, and the 82 s MVP plays at 8 fps in 254 frames. Only a clip that still exceeds the cap gets its rate lowered. The ladder starts at 1400 w, 15 fps, 256 colors and steps fps down to 12, then width to 1200, then palette (192 → 64 colors, bayer dither) at 12, 10 and 8 fps, then 1000 and 900 w.
- **Shared GIFs** — a figure that fits both limits at a watchable frame rate posts the same file to Medium and Substack.
- **Split figures** — `fit.sh`'s split list gives a figure its own uncapped Medium encode and fits Substack's copy to its own budget: the long loops (Four manners, MVP, Proactive, Under the hood), whose frame cap would make Medium's copy choppy for no reason. Medium's own limit is 25 MB, so MVP posts there at 1200 w, 12 fps, 256 colors (12.2 MB).

Every motion figure is one GIF: a carousel loops through all its scenes, the way the article shows it as one figure.

## What goes where

`assets/medium/` and `assets/substack/` each hold all 16 figures, so either folder can be uploaded on its own. Every file is the same in both, except the split figures' GIFs: 07, 08, 13 and 14.

| # | Figure | File | GIF |
|---|---|---|---|
| 01 | Hero wall (8.8 s loop) | `01-hero-wall.gif` | 5.3 MB · 1200 w, 12 fps, 192 colors |
| 02 | Heatmap | `02-heatmap.png` | |
| 03 | Repeats | `03-repeats.png` | |
| 04 | Wait by hour | `04-wait-by-hour.png` | |
| 05 | Sankey | `05-sankey.png` | |
| 06 | Wired (26.1 s loop) | `06-wired.gif` | 5.0 MB · 1200 w, 8 fps, 64 colors |
| 07 | Four manners (44.7 s loop) | `07-manners.gif` | Substack 4.4 MB · 1200 w, 6.4 fps, 96 colors; Medium 5.6 MB · 1200 w, 10 fps, 64 colors |
| 08 | MVP, five asks (82 s loop) | `08-mvp.gif` | Substack 5.1 MB · 1000 w, 8 fps, 64 colors, stills held (254 frames); Medium 12.2 MB · 1200 w, 12 fps, 256 colors |
| 09 | Pilot | `09-pilot.png` | |
| 10 | Figma comment (ask → answer, 4–18 s) | `10-figma-comment.gif` | 5.4 MB · 1200 w, 8 fps, 64 colors |
| 11 | Checked answers | `11-checked-answers.png` | |
| 12 | Source trace | `12-source-trace.png` | |
| 13 | Proactive (29.9 s loop) | `13-proactive.gif` | Substack 4.5 MB · 1200 w, 9.6 fps, 128 colors; Medium 5.0 MB · 1200 w, 12 fps, 128 colors |
| 14 | Under the hood (21.7 s loop) | `14-under-the-hood.gif` | Substack 2.2 MB · 1200 w, 12 fps, 256 colors; Medium 3.5 MB · 1400 w, 15 fps, 256 colors |
| 15 | Impact (tiles + notes) | `15-impact.png` (1560 × 2519) | same |
| 16 | Barn | `16-barn.jpg` | same |

Sizes are decimal MB, the unit both platforms' limits use.

## Re-making a Medium or Substack figure

The article must be served at `http://localhost:8771/article/index.html`.

1. `node pipeline/record.mjs <figIndex>` records screencast frames at true 2× into `source/figures/<name>/` (indices are `figure.fig` order).
2. `pipeline/encode.sh <name> [start] [end]` builds the cropped master `source/figures/<name>.mp4` (once), then runs `fit.sh`. Figure 10's master is the site's own `media/figma-demo.mp4`.
3. `pipeline/fit.sh <name> [start] [end] [suffix] [budget_MB=5.6]` steps fps / width / palette down until the GIF fits, writes `assets/medium/<name>.gif` and copies it to `assets/substack/`.
4. `pipeline/.venv/bin/python3 pipeline/loop.py <name> <t0> <min_s>` finds seamless loop points; `pipeline/scenes.py <name>` finds scene cuts; `pipeline/sheet.sh <name> <every_s>` draws a contact sheet in `/tmp`.

`pipeline/batch.sh` holds every figure's loop range and re-encodes them all. Raw frames are deleted after the master is built, so to re-crop or re-time a figure, record it again.

## Re-making the social previews

The site's landing section alone (title, line and deck; no byline), centered in each frame: a still (PNG, the answer fully shown) and a ~10.5 s loop of one ask → answer beat, cut empty card to empty card. The deck's card is a little taller than on the site (height cap 460 px in the 4:5 frame and 540 px in the story, against the site's 352), so the answer's table and sources show whole.

| File | Size | For |
|---|---|---|
| `assets/linkedin/li-feed-4x5.png` / `.gif` | 1080 × 1350 | LinkedIn feed. 4:5 is the tallest shape LinkedIn shows uncropped. A GIF posts as an image and autoplays (≤ 500 frames, 100 MB; this one is 212 frames, 2.6 MB) |
| `assets/instagram/story-reel-9x16.png` / `.mp4` | 1080 × 1920 | Instagram Stories and Reels (an MP4, since Stories don't play an uploaded GIF); the hero sits in the middle, clear of the top and bottom UI |

With the site served at `http://localhost:8771/index.html`:

1. `node pipeline/social.mjs --video` records each frame's screencast into `source/social/<name>/`.
2. `pipeline/social.sh` builds each master `source/social/<name>.mp4`, then writes `assets/linkedin/li-feed-4x5.gif` and `assets/instagram/story-reel-9x16.mp4`, trimmed to one loop.
3. The posted PNG stills are frames taken from the masters at the full answer. `node pipeline/social.mjs` alone writes quick stills, mid-"Thinking", to `source/social/<name>@2x.png`.

Frame sizes, title and card height cap per frame live in `social.mjs`. Loop ranges live in `social.sh`; find new ones with `loop.py <name> <empty-card t0> 9` on a social master, for example `loop.py li-feed-4x5 8.8 9`.
