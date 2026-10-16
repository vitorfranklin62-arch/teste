"""Trilha original — "cinematic minimal electronic / luxury tech" (35 s, 120 BPM, Ré menor).

Licença: composta e sintetizada por código nesta produção (sem samples, sem melodias de terceiros).
Estrutura derivada de src/data/timeline.json:
  0–7 s    gancho hipnótico: drone + pulso de coração que aperta até o impacto
  7,0 s    drop no impacto e SILÊNCIO de contraste até a locução
  8,4 s    revelação "7": pad + sino
  12–15 s  página lenta: pulso abafado (low-pass) → abre na revelação do site
  15–30 s  demonstrações: groove pulsante que ganha camadas a cada serviço
  30,4 s   marca: acorde aberto (Ré sus → Ré maior) e assinatura sonora; termina em silêncio p/ o loop

Uso: python3 scripts/soundtrack.py  →  assets/music/conectfly_reels_music.wav
"""
import json
import sys

import numpy as np
import soundfile as sf

sys.path.insert(0, "scripts")
from synth import (BEAT, CH, ROOT, SR, Track, arp_pattern, bell, chord_bed, drums, highpass, impact, kick, lowpass, pad,  # noqa: E402
                   pluck, riser, shimmer, sub, with_reverb)

TL = json.load(open("src/data/timeline.json"))
L = {l["id"]: l for l in TL["lines"]}
DUR = TL["duration_s"]
IMPACT = TL["impact_s"]


def bass_pulse(chord, a, b, tr, gain=0.22, cutoff=700):
    """Baixo pulsante em colcheias (assinatura 'luxury tech')."""
    t = np.ceil(a / (BEAT / 2)) * (BEAT / 2)
    root = ROOT[chord] + 12
    while t < b - 0.02:
        tr.add(lowpass(pluck(root, length=0.22, bright=cutoff), 2400), t, gain=gain)
        t += BEAT / 2


def cycle(names, a, b, tr, **kw):
    bar = BEAT * 4
    t, i = a, 0
    while t < b - 0.05:
        e = min(b, t + bar)
        if b - e < bar * 0.5:
            e = b
        n = names[i % len(names)]
        if kw.get("pads", True):
            chord_bed([(n, t, e, kw.get("cutoff", 2400))], tr, pad_g=kw.get("pad_g", 0.42), sub_g=kw.get("sub_g", 0.12))
        if kw.get("bass"):
            bass_pulse(n, t, e, tr, gain=kw["bass"])
        if kw.get("arp"):
            arp_pattern(n, t, e, tr, gain=kw["arp"], bright=kw.get("bright", 3800))
        t, i = e, i + 1


def build():
    tr = Track(DUR)
    # ---- 1 · gancho (0–7 s): drone + batida de coração que acelera ----
    tr.add(sub(38, IMPACT, attack=1.5, release=0.05), 0.0, gain=0.10)
    tr.add(pad([50, 57, 62], IMPACT - 0.2, cutoff=500, attack=2.0, release=0.1), 0.0, gain=0.32)
    tr.add(shimmer(IMPACT - 0.4), 0.2, gain=0.06)
    t, period = 0.6, 1.0
    while t < IMPACT - 0.15:  # "tum-tum" cada vez mais curto
        g = 0.10 + 0.22 * (t / IMPACT) ** 2
        tr.add(kick(), t, gain=g)
        tr.add(kick(), t + 0.18, gain=g * 0.55)
        period = max(0.42, period * 0.93)
        t += period
    tr.add(riser(2.0, 200, 9000), IMPACT - 2.0, gain=0.11)
    # ---- 2 · drop no impacto (o SFX de contato soma por cima) e silêncio de contraste ----
    tr.add(impact(33, 2.2), IMPACT, gain=0.20)
    tr.add(bell(81, 2.4), IMPACT + 0.02, gain=0.07)
    # ---- 3 · revelação "7" ----
    a7 = L["L1"]["start_s"] - 0.05
    tr.add(pad([50, 57, 62, 69], L["L2"]["start_s"] - a7, cutoff=1400, attack=0.6), a7, gain=0.36)
    tr.add(bell(86, 2.0), a7 + 0.15, gain=0.09)
    # ---- 4 · página lenta: pulso abafado → abre na revelação ----
    s4, rev = L["L2"]["start_s"] - 0.1, L["L2"]["end_s"] - 0.45
    muffled = Track(DUR)
    cycle(["Dm"], s4, rev, muffled, bass=0.24, pad_g=0.3, cutoff=900)
    m = muffled.stereo()
    m = np.stack([lowpass(ch, 600) for ch in m])
    tr.L += m[0]
    tr.R += m[1]
    tr.add(riser(rev - s4, 300, 8000), s4 + 0.2, gain=0.07)
    tr.add(impact(38, 1.6), rev, gain=0.10)
    # ---- 5 · demonstrações: groove que ganha camadas ----
    g0 = L["L3"]["start_s"] - 0.05
    sys0, app0, crm0, cta0 = L["L4"]["start_s"], L["L5"]["start_s"], L["L6"]["start_s"], L["L7"]["start_s"]
    cycle(["Dm", "Bb", "F", "C"], g0, sys0, tr, bass=0.20, arp=0.10, pad_g=0.36, cutoff=2600)
    drums(g0, sys0 - 0.05, tr, kick_g=0.26, hat_g=0.05, half=True)
    cycle(["Gm", "Bb", "F", "C"], sys0, app0, tr, bass=0.21, arp=0.12, pad_g=0.38, cutoff=3000, bright=4200)
    drums(sys0, app0 - 0.05, tr, kick_g=0.28, hat_g=0.06)
    cycle(["Bb", "C", "Dm"], app0, crm0, tr, bass=0.21, arp=0.12, pad_g=0.38, cutoff=3400, bright=4600)
    drums(app0, crm0 - 0.05, tr, kick_g=0.28, hat_g=0.06)
    cycle(["Gm", "Bb", "F", "C"], crm0, cta0, tr, bass=0.22, arp=0.13, pad_g=0.40, cutoff=3800, bright=5000)
    drums(crm0, cta0 - 0.1, tr, kick_g=0.30, hat_g=0.065)
    for x in (sys0, app0, crm0):
        tr.add(riser(0.9, 400, 9000), x - 0.9, gain=0.06)
    tr.add(riser(1.2, 300, 9500), cta0 - 1.2, gain=0.10)
    # ---- 6 · marca + assinatura sonora; termina quase em silêncio (loop) ----
    end_sig = L["L7"]["end_s"] + 0.05
    tr.add(impact(36, 2.5), cta0 + 0.4, gain=0.15)
    chord_bed([("Dsus", cta0 + 0.35, end_sig, 2600)], tr, pad_g=0.45, sub_g=0.14)
    tr.add(pad([50, 54, 57, 62, 66], DUR - end_sig, cutoff=2400, attack=0.2, release=0.4), end_sig, gain=0.40)
    for i, mnote in enumerate([74, 81, 78, 86]):  # Ré – Lá – Fá# – Ré
        tr.add(bell(mnote, 2.5), end_sig + i * 0.13, gain=0.10, pan=(-0.3, 0.3, -0.1, 0.1)[i])
    st = tr.stereo()
    # silêncio de contraste após o hit: corta a cama entre o impacto e a locução (mantém o próprio impacto)
    g = np.ones(st.shape[1])
    a, b = int((IMPACT + 0.03) * SR), int((L["L1"]["start_s"] - 0.1) * SR)
    hit = Track(DUR)
    hit.add(impact(33, 2.2), IMPACT, gain=0.20)
    hit.add(bell(81, 2.4), IMPACT + 0.02, gain=0.07)
    hs = hit.stereo()
    st[:, a:b] = hs[:, a:b]
    st = with_reverb(st, wet=0.26)
    # master da trilha (EQ: graves contidos para a voz, brilho)
    st = highpass(st, 32)
    st = st - 0.55 * lowpass(st, 140)
    st = st + 0.8 * highpass(st, 2500)
    fade = np.ones(st.shape[1])
    f0 = int((DUR - 0.5) * SR)
    fade[f0:] = np.linspace(1, 0, st.shape[1] - f0) ** 2
    st = st * fade
    st = st / np.max(np.abs(st)) * 10 ** (-3 / 20)
    return st


if __name__ == "__main__":
    st = build()
    sf.write("assets/music/conectfly_reels_music.wav", st.T.astype(np.float32), SR, subtype="FLOAT")
    print("ok", st.shape)
