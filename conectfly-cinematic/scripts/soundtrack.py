"""Trilha original ConectFly — híbrido eletrônico/orquestral sintetizado por código.

Por que sintetizada: o conector ElevenLabs disponível nesta sessão não expõe o modelo de
música (music_v2_5) e o host api.elevenlabs.io está bloqueado pela política de rede do
ambiente. A briefing autoriza "trilha original fornecida ou devidamente licenciada,
registrando a origem": esta é 100% original, gerada deterministicamente por este script
(sem samples, sem melodias de terceiros). Origem registrada em PRODUCTION_REPORT.md.

Tonalidade Ré menor, 96 BPM. As seções são posicionadas nos tempos reais da narração
(narration-timeline.json), não em tempos estimados.

Uso: python3 scripts/soundtrack.py   ->  assets/audio/stems/music_40s.wav, music_15s.wav
"""
import json
import numpy as np
from scipy import signal
import soundfile as sf

SR = 48000
BPM = 96
BEAT = 60 / BPM
S16 = BEAT / 4
rng = np.random.default_rng(20261016)  # determinístico

TL = json.load(open("narration-timeline.json"))
M = {k: v["start_s"] for k, v in TL["markers"].items()}


def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def env_adsr(n, a, d, s, r, sr=SR):
    a, d, r = int(a * sr), int(d * sr), int(r * sr)
    sus = max(n - a - d - r, 0)
    e = np.concatenate([np.linspace(0, 1, a, endpoint=False), np.linspace(1, s, d, endpoint=False), np.full(sus, s), np.linspace(s, 0, r)])
    return np.pad(e, (0, max(0, n - len(e))))[:n]


def lowpass(x, fc, order=2):
    sos = signal.butter(order, min(fc, SR * 0.45), "low", fs=SR, output="sos")
    return signal.sosfilt(sos, x)


def highpass(x, fc, order=2):
    sos = signal.butter(order, fc, "high", fs=SR, output="sos")
    return signal.sosfilt(sos, x)


def bandpass_sweep(x, f0, f1, q=4.0, block=1024):
    """Filtro passa-banda com frequência central variando (riser / whoosh)."""
    out = np.zeros_like(x)
    n = len(x)
    zi = None
    for i in range(0, n, block):
        fc = f0 * (f1 / f0) ** (i / max(n, 1))
        bw = fc / q
        sos = signal.butter(2, [max(20, fc - bw / 2), min(SR * 0.45, fc + bw / 2)], "band", fs=SR, output="sos")
        if zi is None:
            zi = signal.sosfilt_zi(sos) * 0
        seg, zi = signal.sosfilt(sos, x[i:i + block], zi=zi)
        out[i:i + block] = seg
    return out


def saw(f, n, phase=0.0):
    t = np.arange(n) / SR
    return 2 * ((f * t + phase) % 1.0) - 1


class Track:
    def __init__(self, dur):
        self.n = int(dur * SR)
        self.L = np.zeros(self.n)
        self.R = np.zeros(self.n)

    def add(self, x, t, gain=1.0, pan=0.0):
        i = int(t * SR)
        if i >= self.n:
            return
        if x.ndim == 1:
            l, r = x * np.sqrt((1 - pan) / 2), x * np.sqrt((1 + pan) / 2)
        else:
            l, r = x[0], x[1]
        m = min(len(l), self.n - i)
        self.L[i:i + m] += gain * l[:m]
        self.R[i:i + m] += gain * r[:m]

    def stereo(self):
        return np.stack([self.L, self.R])


# ---------------- instrumentos ----------------

def pad(notes, dur, cutoff=1800, attack=1.2, release=1.6, detune=0.12):
    n = int((dur + release) * SR)
    L = np.zeros(n)
    R = np.zeros(n)
    for m in notes:
        f = mtof(m)
        for k, cents in enumerate(np.linspace(-detune, detune, 5) * 100):
            ff = f * 2 ** (cents / 1200)
            v = saw(ff, n, rng.random())
            if k % 2:
                L += v
            else:
                R += v
            if k == 2:
                L += v * 0.5
                R += v * 0.5
    e = env_adsr(n, attack, 0.5, 0.85, release)
    L, R = highpass(lowpass(L, cutoff), 110) * e, highpass(lowpass(R, cutoff), 110) * e
    norm = 1 / (len(notes) * 5)
    return np.stack([L, R]) * norm


def sub(m, dur, attack=0.4, release=0.8):
    n = int((dur + release) * SR)
    t = np.arange(n) / SR
    x = np.sin(2 * np.pi * mtof(m) * t) + 0.15 * np.sin(4 * np.pi * mtof(m) * t)
    return x * env_adsr(n, attack, 0.2, 0.9, release)


def pluck(m, length=0.32, bright=3200):
    n = int(length * SR)
    t = np.arange(n) / SR
    f = mtof(m)
    x = 0.6 * saw(f, n) + 0.4 * np.sign(np.sin(2 * np.pi * f * t))
    x = lowpass(x * np.exp(-t / 0.09), bright)
    return x * np.exp(-t / 0.12)


def kick():
    n = int(0.45 * SR)
    t = np.arange(n) / SR
    f = 45 + 85 * np.exp(-t / 0.045)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-t / 0.18) + 0.08 * lowpass(rng.standard_normal(n), 2000) * np.exp(-t / 0.01)


def hat(open_=False):
    n = int((0.18 if open_ else 0.05) * SR)
    t = np.arange(n) / SR
    return highpass(rng.standard_normal(n), 7000) * np.exp(-t / (0.06 if open_ else 0.012))


def riser(dur, f0=300, f1=7000):
    n = int(dur * SR)
    x = bandpass_sweep(rng.standard_normal(n), f0, f1, q=3)
    e = np.linspace(0, 1, n) ** 2.2
    return x * e


def impact(low=36, tail=2.4):
    n = int(tail * SR)
    t = np.arange(n) / SR
    f = mtof(low) * (1 + 0.6 * np.exp(-t / 0.06))
    boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.55)
    crack = lowpass(rng.standard_normal(n), 3500) * np.exp(-t / 0.05) * 0.5
    return boom + crack


def bell(m, tail=3.5):
    n = int(tail * SR)
    t = np.arange(n) / SR
    f = mtof(m)
    x = sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t / (tail * d)) for r, a, d in [(1, 1, 0.45), (2.0, 0.5, 0.25), (3.01, 0.28, 0.14), (4.2, 0.15, 0.08)])
    return x * np.minimum(1, t / 0.004)


def shimmer(dur):
    n = int(dur * SR)
    x = lowpass(highpass(rng.standard_normal(n), 5000), 11000) * 0.25
    lfo = 0.5 + 0.5 * np.sin(2 * np.pi * 0.3 * np.arange(n) / SR)
    return x * lfo * env_adsr(n, dur * 0.4, 0.1, 0.8, dur * 0.4)


def reverb_ir(seconds=2.8, predelay=0.02):
    n = int(seconds * SR)
    t = np.arange(n) / SR
    irs = []
    for _ in range(2):
        x = rng.standard_normal(n) * np.exp(-t / (seconds / 6.5))
        x = lowpass(x, 6500)
        x = np.concatenate([np.zeros(int(predelay * SR)), x])
        irs.append(x / np.sqrt(np.sum(x ** 2)))
    return irs


IR = reverb_ir()


def with_reverb(st, wet=0.35):
    out = []
    for ch, ir in zip(st, IR):
        w = signal.fftconvolve(ch, ir)[: len(ch)]
        out.append(ch * (1 - wet) + w * wet * 1.6)
    return np.stack(out)


# ---------------- harmonia ----------------
# Ré menor: i – VI – III – VII  (Dm, Bb, F, C) e Gm como iv.
CH = {
    "Dm": [50, 57, 62, 65, 69],
    "Bb": [46, 58, 62, 65, 70],
    "F": [53, 57, 60, 65, 69],
    "C": [48, 55, 60, 64, 67],
    "Gm": [43, 58, 62, 67, 70],
    "Dsus": [50, 57, 62, 64, 69],
}
ROOT = {"Dm": 38, "Bb": 34, "F": 41, "C": 36, "Gm": 31, "Dsus": 38}


def arp_pattern(chord, t0, t1, tr, gain=0.16, octave=12, bright=3200, pan_spread=0.5):
    notes = sorted(set(CH[chord][1:] + [n + octave for n in CH[chord][1:3]]))
    i = 0
    t = np.ceil(t0 / S16) * S16
    while t < t1 - 0.02:
        m = notes[i % len(notes)] + (12 if (i // len(notes)) % 2 else 0)
        tr.add(pluck(m, bright=bright), t, gain=gain * (1.0 if i % 4 == 0 else 0.7), pan=pan_spread * np.sin(i * 0.9))
        i += 1
        t += S16


def drums(t0, t1, tr, kick_g=0.32, hat_g=0.07, half=False):
    t = np.ceil(t0 / BEAT) * BEAT
    b = 0
    while t < t1 - 0.01:
        if (not half and b % 2 == 0) or (half and b % 4 == 0):
            tr.add(kick(), t, gain=kick_g)
        tr.add(hat(open_=(b % 2 == 1)), t + BEAT / 2, gain=hat_g, pan=0.3)
        tr.add(hat(), t + BEAT * 0.75, gain=hat_g * 0.5, pan=-0.3)
        b += 1
        t += BEAT


def chord_bed(seq, tr, pad_g=0.5, sub_g=0.16, cutoff=1800):
    for name, t0, t1, *opt in seq:
        c = opt[0] if opt else cutoff
        tr.add(pad(CH[name], t1 - t0, cutoff=c), t0, gain=pad_g)
        tr.add(sub(ROOT[name], t1 - t0), t0, gain=sub_g)


# ---------------- arranjo 40 s ----------------

def build_40():
    tr = Track(40.0)
    # 0–5.2  mistério: drone grave + brilho, quase silêncio no início
    tr.add(sub(38, 5.0, attack=2.5), 0.4, gain=0.12)
    tr.add(pad([50, 57, 62], 5.0, cutoff=600, attack=2.5), 0.3, gain=0.45)
    tr.add(shimmer(4.8), 0.5, gain=0.12)
    tr.add(riser(2.0, 200, 5000), M["conectfly_1"] - 2.0, gain=0.10)
    # 5.2–9.8  expansão do universo digital
    chord_bed([("Bb", 5.2, 7.6, 1400), ("F", 7.6, 9.9, 1900)], tr, pad_g=0.55)
    tr.add(impact(38, 2.0), M["conectfly_1"] - 0.05, gain=0.108)
    arp_pattern("Bb", 6.4, 7.6, tr, gain=0.07, bright=1800)
    arp_pattern("F", 7.6, 9.9, tr, gain=0.09, bright=2200)
    # 9.9–16.5  ritmo moderno (sites / sistemas)
    chord_bed([("C", 9.9, 12.4), ("Dm", 12.4, 14.9), ("Bb", 14.9, 16.5)], tr, pad_g=0.45, cutoff=2300)
    arp_pattern("C", 9.9, 12.4, tr, gain=0.13)
    arp_pattern("Dm", 12.4, 14.9, tr, gain=0.13)
    arp_pattern("Bb", 14.9, 16.5, tr, gain=0.13)
    drums(9.9, 16.4, tr, half=True)
    # 16.5–24.1  IA: progressão e descoberta
    chord_bed([("Gm", 16.5, 18.9, 2400), ("Bb", 18.9, 21.4, 2800), ("F", 21.4, 23.0, 3200), ("C", 23.0, 24.2, 3400)], tr, pad_g=0.48)
    for name, a, b in [("Gm", 16.5, 18.9), ("Bb", 18.9, 21.4), ("F", 21.4, 23.0), ("C", 23.0, 24.2)]:
        arp_pattern(name, a, b, tr, gain=0.14, bright=4200)
    drums(16.5, 24.0, tr)
    tr.add(riser(1.4, 400, 8000), 22.7, gain=0.07)
    # 24.1–27.7  projetos reais: pico emocional moderado
    chord_bed([("Dm", 24.1, 26.0, 3600), ("Bb", 26.0, 27.8, 3600)], tr, pad_g=0.55)
    tr.add(bell(74, 2.5), 24.15, gain=0.10, pan=-0.2)
    tr.add(bell(77, 2.5), 25.25, gain=0.08, pan=0.2)
    tr.add(bell(81, 2.5), 26.6, gain=0.08)
    arp_pattern("Dm", 24.1, 26.0, tr, gain=0.14, bright=4500)
    arp_pattern("Bb", 26.0, 27.6, tr, gain=0.14, bright=4500)
    drums(24.1, 27.5, tr, kick_g=0.36)
    # 27.7–29.5  respiro (long pause) + riser para a assinatura
    tr.add(pad(CH["C"], 1.8, cutoff=900), 27.7, gain=0.4)
    tr.add(riser(1.8, 250, 9000), M["conectfly_2"] - 1.8, gain=0.13)
    # 29.5–34.6  CONECTE · AUTOMATIZE · EVOLUA — crescimento emocional
    chord_bed([("Dm", 29.5, 30.9, 3000), ("Bb", 30.9, 32.0, 3400), ("F", 32.0, 33.4, 3800), ("C", 33.4, 34.6, 4200)], tr, pad_g=0.6, sub_g=0.2)
    for key in ("conectfly_2", "conecte", "automatize", "evolua"):
        tr.add(impact(36 if key == "conectfly_2" else 38, 2.0), M[key] - 0.03, gain=0.132 if key == "conectfly_2" else 0.090)
    arp_pattern("F", 32.0, 33.4, tr, gain=0.10, bright=5000)
    arp_pattern("C", 33.4, 34.6, tr, gain=0.11, bright=5000)
    # 34.6–40  encerramento marcante: resolve em Ré (sus → maior), assinatura de sino
    chord_bed([("Bb", 34.6, 36.3, 2600), ("Dsus", 36.3, 39.0, 2200)], tr, pad_g=0.5, sub_g=0.16)
    tr.add(pad([50, 54, 57, 62, 66], 2.8, cutoff=2400, attack=0.6, release=2.0), 37.1, gain=0.45)  # Ré maior (luz)
    tr.add(impact(38, 3.0), M["aqui"] + 0.55, gain=0.120)
    for i, m in enumerate([74, 81, 78, 86]):  # D – A – F# – D: assinatura sonora curta
        tr.add(bell(m, 3.0), M["aqui"] + 0.55 + i * 0.16, gain=0.11, pan=(-0.3, 0.3, -0.1, 0.1)[i])
    st = with_reverb(tr.stereo(), wet=0.32)
    return master(st, fade_out=(38.2, 40.0))


# ---------------- arranjo 15 s (corte próprio) ----------------

def build_15(markers15):
    tr = Track(15.0)
    tr.add(sub(38, 4.0, attack=1.2), 0.0, gain=0.12)
    tr.add(pad([50, 57, 62], 4.2, cutoff=700, attack=1.2), 0.0, gain=0.45)
    tr.add(shimmer(4.0), 0.1, gain=0.12)
    tr.add(riser(1.0, 300, 7000), 3.4, gain=0.10)
    # 4.4–6.4 montagem rápida (sites · sistemas · IA)
    tr.add(impact(38, 1.6), 4.4, gain=0.108)
    chord_bed([("Bb", 4.4, 5.4, 2800), ("C", 5.4, 6.4, 3200)], tr, pad_g=0.5)
    arp_pattern("Bb", 4.4, 5.4, tr, gain=0.14, bright=4200)
    arp_pattern("C", 5.4, 6.4, tr, gain=0.14, bright=4500)
    drums(4.4, 6.3, tr)
    tr.add(riser(0.9, 300, 9000), markers15["conectfly"] - 0.9, gain=0.12)
    chord_bed([("Dm", markers15["conectfly"] - 0.1, markers15["conecte"], 3000), ("Bb", markers15["conecte"], markers15["automatize"], 3400),
               ("F", markers15["automatize"], markers15["evolua"], 3800), ("C", markers15["evolua"], markers15["futuro"] - 0.1, 4000),
               ("Dsus", markers15["futuro"] - 0.1, 14.4, 2400)], tr, pad_g=0.58, sub_g=0.18)
    for key in ("conectfly", "conecte", "automatize", "evolua"):
        tr.add(impact(36 if key == "conectfly" else 38, 1.8), markers15[key] - 0.03, gain=0.120 if key == "conectfly" else 0.084)
    tr.add(pad([50, 54, 57, 62, 66], 1.6, cutoff=2400, attack=0.4, release=1.2), markers15["aqui_end"] - 0.2, gain=0.4)
    for i, m in enumerate([74, 81, 78, 86]):
        tr.add(bell(m, 2.5), markers15["aqui_end"] - 0.2 + i * 0.14, gain=0.10)
    st = with_reverb(tr.stereo(), wet=0.3)
    return master(st, fade_out=(14.0, 15.0))


def master(st, fade_out):
    a, b = int(fade_out[0] * SR), int(fade_out[1] * SR)
    g = np.ones(st.shape[1])
    g[a:b] = np.cos(np.linspace(0, np.pi / 2, b - a)) ** 2
    g[b:] = 0
    st = st * g
    st = highpass(st, 32)  # limpa subgrave inaudível
    st = st - 0.62 * lowpass(st, 140)  # low-shelf ≈ -8 dB: graves não competem com a voz
    st = st + 0.9 * highpass(st, 2500)  # ar/brilho (≈ +5.5 dB acima de 2,5 kHz)
    peak = np.max(np.abs(st))
    st = st / peak * 10 ** (-3 / 20)
    return np.tanh(st * 1.1) / np.tanh(1.1) * 10 ** (-1 / 20)


if __name__ == "__main__":
    import os
    os.makedirs("assets/audio/stems", exist_ok=True)
    m40 = build_40()
    sf.write("assets/audio/stems/music_40s.wav", m40.T.astype(np.float32), SR, subtype="FLOAT")
    cut = json.load(open("src/data/cut15.json"))
    m15 = build_15(cut["markers"])
    sf.write("assets/audio/stems/music_15s.wav", m15.T.astype(np.float32), SR, subtype="FLOAT")
    print("ok", m40.shape, m15.shape)
