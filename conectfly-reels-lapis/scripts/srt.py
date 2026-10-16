"""Gera dist/conectfly_reels_legendas.srt a partir da timeline da locução final (blocos curtos, ≤ 2 linhas)."""
import json
import textwrap

tl = json.load(open("src/data/timeline.json"))
ts = lambda s: f"{int(s // 3600):02d}:{int(s % 3600 // 60):02d}:{int(s % 60):02d},{int(round((s - int(s)) * 1000)):03d}"
caps = [c for line in tl["lines"] for c in line["captions"]]
out = []
for n, c in enumerate(caps, 1):
    nxt = caps[n]["start_s"] if n < len(caps) else c["end_s"] + 1
    end = min(c["end_s"] + 0.25, nxt - 0.02)  # sem sobreposição entre blocos
    text = "\n".join(textwrap.wrap(c["text"], 32)[:2])
    out.append(f"{n}\n{ts(c['start_s'])} --> {ts(end)}\n{text}\n")
n = len(caps) + 1
open("dist/conectfly_reels_legendas.srt", "w").write("\n".join(out))
print(f"{n - 1} legendas")
