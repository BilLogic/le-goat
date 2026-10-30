"""Finds scene changes in a master by watching the caption strip (bottom of the figure).
Usage: pipeline/.venv/bin/python3 pipeline/scenes.py <name> [strip_frac]   (master: source/figures/<name>.mp4)"""
import re, subprocess, sys
from pathlib import Path
import numpy as np

name = sys.argv[1]
frac = float(sys.argv[2]) if len(sys.argv) > 2 else 0.2
src = str(Path(__file__).resolve().parent.parent / "source/figures" / f"{name}.mp4")
info = subprocess.run(["ffmpeg", "-i", src], capture_output=True, text=True).stderr
w, h = map(int, re.search(r" (\d{3,5})x(\d{3,5})[ ,]", info.split(" Video: ")[1]).groups())
sh = int(h * frac) // 2 * 2
W, H = 320, max(2, int(sh * 320 / w) // 2 * 2)
raw = subprocess.run(["ffmpeg", "-v", "error", "-i", src, "-vf", f"fps=10,crop={w}:{sh}:0:{h-sh},scale={W}:{H},format=gray", "-f", "rawvideo", "-"], capture_output=True).stdout
fr = np.frombuffer(raw, np.uint8).reshape(-1, H, W).astype(np.int16)
d = np.concatenate([[0], (np.abs(np.diff(fr, axis=0)) > 24).mean(axis=(1, 2))])
cuts = [i / 10 for i in range(len(d)) if d[i] > 0.01 and (i < 3 or d[i - 1] <= 0.01)]
merged = []
for c in cuts:
    if not merged or c - merged[-1] > 1.5: merged.append(c)
print(name, f"{len(fr)/10:.1f}s", "cuts:", merged)
