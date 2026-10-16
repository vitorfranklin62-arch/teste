"""Divide o take ElevenLabs v4 em um arquivo por frase e monta a timeline da locução.

- Fronteiras das frases = silêncios reais do take (silencedetect, -48 dB).
- Ajuste de microtempo permitido pela briefing: pausas INTERNAS longas (>0,3 s) viram 0,25 s.
  A fala nunca é acelerada nem esticada.
- Saídas: assets/voice/line_0N.wav, assets/voice/narration_edit.wav (já na timeline do vídeo)
  e src/data/timeline.json (frases, trechos e legendas, em segundos e frames).

Uso: python3 scripts/voice.py
"""
import json
import subprocess
import numpy as np
import soundfile as sf

SR = 48000
FPS = 30
DUR = 35.0
VO_START = 8.4   # impacto em 7,0 s + 1,4 s de silêncio de contraste
GAP = 0.20       # respiro entre frases (ritmo de Reels: cortes a cada 1–2 s)
TAKE = "assets/voice/narration_take.mp3"

# (id, texto falado, início, fim no take, pausas internas a encurtar [(ini, fim)])
LINES = [
    ("L1", "Você esperou sete segundos... por dois lápis.", 0.0, 3.751, [(2.186, 2.556)]),
    ("L2", "E o seu cliente? Esperaria tanto por você?", 4.896, 7.638, [(5.722, 6.118)]),
    ("L3", "Na ConectFly, criamos sites que prendem a atenção... e passam confiança.", 8.637, 13.505, [(11.894, 12.200)]),
    ("L4", "Sistemas inteligentes, feitos sob medida pro seu negócio.", 14.241, 17.839, []),
    ("L5", "Aplicativos que tiram a sua ideia do papel.", 18.567, 21.357, []),
    ("L6", "CRM e automações com inteligência artificial.", 21.993, 25.419, []),
    ("L7", "Fale com a ConectFly. Seu próximo projeto começa aqui.", 25.947, 29.954, [(27.396, 27.801)]),
]
# Legendas: blocos curtos (≤ 2 linhas), com o mesmo texto falado
CAPTIONS = {
    "L1": ["Você esperou sete segundos...", "por dois lápis."],
    "L2": ["E o seu cliente?", "Esperaria tanto por você?"],
    "L3": ["Na ConectFly, criamos sites", "que prendem a atenção...", "e passam confiança."],
    "L4": ["Sistemas inteligentes,", "feitos sob medida pro seu negócio."],
    "L5": ["Aplicativos que tiram", "a sua ideia do papel."],
    "L6": ["CRM e automações", "com inteligência artificial."],
    "L7": ["Fale com a ConectFly.", "Seu próximo projeto começa aqui."],
}


# a qual trecho de fala (separado por pausa interna) pertence cada bloco de legenda
CAP_SPAN = {"L1": [0, 1], "L2": [0, 1], "L3": [0, 0, 1], "L7": [0, 1]}


def load(path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).astype(np.float64)


def fade(x, a=0.008, b=0.03):
    x = x.copy()
    na, nb = int(a * SR), int(b * SR)
    x[:na] *= np.linspace(0, 1, na)
    x[-nb:] *= np.linspace(1, 0, nb)
    return x


take = load(TAKE)
out = np.zeros(int(DUR * SR))
t = VO_START
timeline = []
for lid, text, s0, s1, pauses in LINES:
    # pedaços de fala entre as pausas internas; cada pausa longa vira 0,25 s
    cuts = [s0] + [v for p in pauses for v in p] + [s1]
    pieces, spans, cur = [], [], 0.0  # spans = trechos de fala (início/fim) dentro da frase editada
    for i in range(0, len(cuts), 2):
        a, b = cuts[i], cuts[i + 1]
        pieces.append(fade(take[int(a * SR):int(b * SR)]))
        spans.append((cur, cur + (b - a)))
        cur += b - a
        if i + 2 < len(cuts):
            pieces.append(np.zeros(int(0.25 * SR)))
            cur += 0.25
    line = np.concatenate(pieces)
    sf.write(f"assets/voice/line_{lid[1]}.wav", line.astype(np.float32), SR, subtype="PCM_24")
    i0 = int(t * SR)
    out[i0:i0 + len(line)] += line[: len(out) - i0]
    dur = len(line) / SR
    # legendas: distribui pelo tamanho do texto dentro da duração real da frase
    # legendas: cada bloco pertence a um trecho de fala (as quebras coincidem com as pausas reais);
    # vários blocos no mesmo trecho dividem o tempo pelo tamanho do texto
    caps = CAPTIONS[lid]
    owner = CAP_SPAN.get(lid, [0] * len(caps))
    times = []
    for sp_i, (a_, b_) in enumerate(spans):
        mine = [k for k, o in enumerate(owner) if o == sp_i]
        w = np.array([len(caps[k]) for k in mine], float)
        e = a_ + np.concatenate([[0], np.cumsum(w) / w.sum()]) * (b_ - a_)
        times += [(e[j], e[j + 1]) for j in range(len(mine))]
    timeline.append({
        "id": lid, "text": text, "start_s": round(t, 3), "end_s": round(t + dur, 3),
        "start_frame": round(t * FPS), "end_frame": round((t + dur) * FPS), "file": f"assets/voice/line_{lid[1]}.wav",
        "captions": [{"text": c, "start_s": round(t + times[k][0], 3), "end_s": round(t + times[k][1], 3)} for k, c in enumerate(caps)],
    })
    t += dur + GAP

end = timeline[-1]["end_s"]
assert end <= DUR - 0.4, f"locução termina em {end:.2f}s — não sobra assinatura"
sf.write("assets/voice/narration_edit.wav", out.astype(np.float32), SR, subtype="PCM_24")
json.dump({"fps": FPS, "duration_s": DUR, "impact_s": 7.0, "vo_start_s": VO_START, "lines": timeline}, open("src/data/timeline.json", "w"), indent=2, ensure_ascii=False)
for l in timeline:
    print(f'{l["id"]} {l["start_s"]:6.2f}–{l["end_s"]:6.2f}s  {l["text"]}')
