#!/usr/bin/env bash
# Encodes a recorded figure into a master MP4 and the GIFs for Medium and Substack. Paths are from the repo root.
# Usage: pipeline/encode.sh <name> [start_s] [end_s] [suffix]
#   master:   source/figures/<name>.mp4       (cropped, constant 30 fps, near-lossless; local only)
#   gif:      assets/substack/<name><suffix>.gif and assets/medium/<name><suffix>.gif   (fit.sh: under 5.4 MB and 290 frames, Substack's limits;
#             a split figure gets its own Medium encode)
# Figure 10's master is the site's own recording, media/figma-demo.mp4.
set -euo pipefail
cd "$(dirname "$0")/.."
name=$1; ss=${2:-0}; to=${3:-}; sfx=${4:-}
src=source/figures/$name
master=source/figures/$name.mp4
[ "$name" = 10-figma-comment ] && master=media/figma-demo.mp4
if [ ! -f "$master" ]; then
  crop=$(cat "$src/crop.txt")
  (cd "$src" && ffmpeg -v error -y -f concat -safe 0 -i frames.txt -vf "crop=$crop,fps=30,format=yuv420p" -c:v libx264 -crf 8 -preset slow ../$name.mp4)
fi
pipeline/fit.sh "$name" "$ss" "$to" "$sfx"
