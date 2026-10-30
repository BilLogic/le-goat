#!/usr/bin/env bash
# Social previews: builds each frame's master from social.mjs's screencast, then the deliverable trimmed to one seamless loop.
# Usage: pipeline/social.sh     (masters + posts; loop ranges below come from loop.py on the masters)
#   master:  source/social/<name>.mp4   (exact output size, 30 fps, near-lossless; local only)
#   post:    assets/<platform>/<name>.<kind>   (linkedin gif: 1080 w, 20 fps, LinkedIn takes ≤ 500 frames;
#                                        instagram mp4: H.264 high, yuv420p, faststart, ~8 Mbps cap)
set -euo pipefail
cd "$(dirname "$0")/.."
while read -r name w h s e kind platform; do
  [ -z "$name" ] && continue
  master=source/social/$name.mp4
  if [ -f "source/social/$name/frames.txt" ]; then
    (cd "source/social/$name" && ffmpeg -nostdin -v error -y -f concat -safe 0 -i frames.txt -vf "fps=30,scale=${w}:${h}:flags=lanczos,format=yuv420p" -c:v libx264 -crf 10 -preset medium "../$name.mp4")
    rm -rf "source/social/$name"
  fi
  [ "$s" = "-" ] && continue
  out=assets/$platform/$name.$kind
  if [ "$kind" = gif ]; then
    ffmpeg -nostdin -v error -y -ss "$s" -to "$e" -i "$master" -vf "fps=20,split[a][b];[a]palettegen=max_colors=256:stats_mode=diff[p];[b][p]paletteuse=dither=sierra2_4a:diff_mode=rectangle" -loop 0 "$out"
  else
    ffmpeg -nostdin -v error -y -ss "$s" -to "$e" -i "$master" -c:v libx264 -profile:v high -pix_fmt yuv420p -crf 17 -maxrate 8M -bufsize 16M -preset slow -movflags +faststart -an "$out"
  fi
  printf '%-34s %5.2f MB\n' "$out" "$(echo "$(stat -f%z "$out")/1000000" | bc -l)"
done <<'LIST'
li-feed-4x5 1080 1350 8.8 19.4 gif linkedin
story-reel-9x16 1080 1920 8.8 19.1 mp4 instagram
LIST
