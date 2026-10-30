#!/usr/bin/env bash
# Every motion deliverable as one seamless loop: name start end. Loop ends come from loop.py on the masters.
# Each GIF is fit under the shared Medium / Substack budget by fit.sh, so no figure is refit by hand.
cd "$(dirname "$0")"
while read -r n s e; do [ -z "$n" ] || ./encode.sh "$n" "$s" "$e" < /dev/null; done <<'LIST'
01-hero-wall 8.8 17.6
06-wired 0 26.1
07-manners 0 44.7
08-mvp 0 82.0
10-figma-comment 4 18
13-proactive 0 29.9
14-under-the-hood 0 21.7
LIST
