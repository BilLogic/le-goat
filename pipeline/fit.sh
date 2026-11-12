#!/usr/bin/env bash
# One GIF for Medium and Substack: steps fps / width / palette down until it fits the budget, then writes it to assets/article/, the one
# folder both platforms upload from. Paths are from the repo root.
# Usage: pipeline/fit.sh <name> [start_s] [end_s] [suffix] [budget_MB=5.4]
#   Substack takes a GIF only under about 5.4 MB AND about 300 frames (5.35 MB / 112 frames posted; 5.6 MB / 209 and 3.5 MB / 326 did not),
#   so the fitted GIF is capped at FRAMES and the budget is decimal MB. Medium's own limit is 25 MB.
#   Frames that barely change (a wait, a blinking caret) are dropped and the frame before them held for their time (mpdecimate, timing kept),
#   so a long loop spends its frames where something moves; only if that still exceeds the cap is the rate itself lowered.
#   Ladder: 1400 w 15 fps 256 sierra → 12 fps → 1200 w → fewer colors, bayer dither → 10 / 8 fps → 1000 w (below Medium's 1192 full-width).
#   A figure in the budget list below fits a tighter budget than the default.
set -euo pipefail
cd "$(dirname "$0")/.."
n=$1; s=${2:-0}; e=${3:-}; x=${4:-}; budget=$(echo "${5:-5.4}*1000000/1" | bc); FRAMES=290
master=source/figures/$n.mp4
[ "$n" = 10-figma-comment ] && master=media/figma-demo.mp4
range=(-ss "$s"); [ -n "$e" ] && range+=(-to "$e")
# the frame cap as a top fps for this clip (one decimal); without an end time the clip's length is unknown and no cap applies
fmax=; [ -n "$e" ] && fmax=$(echo "scale=1; $FRAMES/($e-$s)" | bc)
# Per-figure budgets (MB): over about 5 MB Substack re-encodes a GIF lossily and its moving cards smear, so those figures stay under 4.8;
# the long loops fit a little under that so their frame rate stays watchable on both platforms. A row may pin one rung
# (width fps colors dither) when the ladder's pick bands a soft shadow, as 64 colors does under 06's chat window.
row=$(awk -v k="$n$x" '$1 == k { $1 = ""; print }' <<'LIST'
01-hero-wall 4.8
06-wired 4.8 1000 10 192 bayer:bayer_scale=5
07-manners 4.5
08-mvp 4.8
10-figma-comment 4.8
13-proactive 4.5
14-under-the-hood 3.0
LIST
)
read -r lim pin <<<"$row" || true
[ -n "$lim" ] && [ -z "${5:-}" ] && budget=$(echo "$lim*1000000/1" | bc)
out=assets/article/$n$x.gif
mb() { echo "$(stat -f%z "$1")/1000000" | bc -l; }
frames() { ffmpeg -nostdin -v error -i "$1" -map 0:v -f null -progress /tmp/fit-frames.txt - </dev/null; grep '^frame=' /tmp/fit-frames.txt | tail -1 | cut -d= -f2; }
DEC=mpdecimate=hi=2560:lo=960:frac=0.6   # drop a frame when no 8×8 block moved more than ~40/px and under 40 % of them more than ~15/px
gif() { # width fps colors dither out [decimate]
  ffmpeg -nostdin -v error -y "${range[@]}" -i "$master" -vf "fps=$2,scale=$1:-1:flags=lanczos,${6:+$DEC,}split[a][b];[a]palettegen=max_colors=$3:stats_mode=diff:reserve_transparent=0[p];[b][p]paletteuse=dither=$4:diff_mode=rectangle" -vsync vfr -loop 0 "$5"
}
LADDER=("1400 15 256 sierra2_4a" "1400 12 256 bayer:bayer_scale=5" "1200 12 256 bayer:bayer_scale=5" "1200 12 192 bayer:bayer_scale=5"
        "1200 12 128 bayer:bayer_scale=5" "1200 10 96 bayer:bayer_scale=5" "1200 10 64 bayer:bayer_scale=5" "1200 8 96 bayer:bayer_scale=5"
        "1200 8 64 bayer:bayer_scale=5" "1000 8 64 bayer:bayer_scale=5" "900 8 64 bayer:bayer_scale=5")
[ -n "${pin:-}" ] && LADDER=("$pin")
# pass 1 runs the ladder at its own rates, stills held, and needs both limits met; pass 2 (a clip too long for that) runs it at the capped rate
for pass in held capped; do for cfg in "${LADDER[@]}"; do
  set -- $cfg
  fps=$2; [ $pass = capped ] && [ -n "$fmax" ] && [ "$(echo "$fps > $fmax" | bc)" = 1 ] && fps=$fmax
  gif "$1" "$fps" "$3" "$4" "$out" dec
  [ $pass = held ] && [ -n "$fmax" ] && [ "$(frames "$out")" -gt "$FRAMES" ] && continue
  if [ "$(stat -f%z "$out")" -le "$budget" ]; then
    printf '%-44s %5.2f MB  (%s w, %s fps, %s colors, %s) → assets/article\n' "$n$x.gif" "$(mb "$out")" "$1" "$fps" "$3" "${4%%:*}"; exit 0
  fi
done; [ -z "$fmax" ] && break; done
printf '%-44s %5.2f MB  still over budget at 900 w\n' "$n$x.gif" "$(mb "$out")"; exit 1
