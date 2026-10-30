#!/usr/bin/env bash
# Contact sheet of a master: one tile every N seconds, timestamps burned in. Usage: pipeline/sheet.sh <name> <every_s>
cd "$(dirname "$0")/.."; ffmpeg -v error -y -i source/figures/$1.mp4 -vf "fps=1/$2,scale=480:-1,drawtext=text='%{pts\:hms}':x=8:y=8:fontsize=22:fontcolor=red:box=1:boxcolor=white,tile=5x8:padding=6:color=white" -frames:v 1 /tmp/sheet_$1.png
