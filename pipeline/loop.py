"""Finds a seamless loop: the later frame most like the frame at t0.
Usage: pipeline/.venv/bin/python3 pipeline/loop.py <name> <t0> <min_len_s>
<name> is a figure master (source/figures/<name>.mp4), a social master (source/social/<name>.mp4) or a path to an MP4."""
import re, subprocess, sys
from pathlib import Path
import numpy as np


def master(name):
    """Resolves a master's path from a figure or social name, or returns the given path."""
    root = Path(__file__).resolve().parent.parent
    hits = [p for p in (Path(name), root / "source/figures" / f"{name}.mp4", root / "source/social" / f"{name}.mp4") if p.is_file()]
    if not hits:
        sys.exit(f"no master for {name}")
    return str(hits[0])


name, t0, mn = sys.argv[1], float(sys.argv[2]), float(sys.argv[3])
src = master(name)
raw = subprocess.run(["ffmpeg", "-v", "error", "-i", src, "-vf", "fps=10,scale=160:-2,format=gray", "-f", "rawvideo", "-"], capture_output=True).stdout
probe = subprocess.run(["ffmpeg", "-i", src], capture_output=True, text=True).stderr
w0, h0 = map(int, re.search(r" (\d{3,5})x(\d{3,5})[ ,]", probe.split(" Video: ")[1]).groups())
H = int(round(160 * h0 / w0 / 2) * 2)
fr = np.frombuffer(raw, np.uint8).reshape(-1, H, 160).astype(np.int16)
a = fr[int(t0 * 10)]
d = [(np.abs(fr[i] - a).mean(), i / 10) for i in range(int((t0 + mn) * 10), len(fr))]
print(name, "best loop ends:", [(round(t, 1), round(float(v), 2)) for v, t in sorted(d)[:5]])
