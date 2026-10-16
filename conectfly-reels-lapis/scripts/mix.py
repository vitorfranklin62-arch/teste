"""Mixagem e master do Reels (voz · trilha · efeitos).

- Voz (ElevenLabs v4, já montada na timeline por scripts/voice.py) em primeiro plano.
- Trilha com ducking guiado pelo envelope real da voz; o gancho (0–7 s) fica baixo ("tensão muito baixa").
- Impacto: o transiente do SFX é alinhado exatamente em 7,000 s.
- Master: −14 LUFS integrados, true peak ≤ −1 dBTP (detecção 4× oversampled).
- Saídas: assets/audio/conectfly_reels_mix.wav + stems (voz, trilha, efeitos).

Uso: python3 scripts/mix.py
"""
import json
import subprocess

import numpy as np
import pyloudnorm as pyln
import soundfile as sf
from scipy import signal
from scipy.ndimage import minimum_filter1d

SR = 48000
TL = json.load(open("src/data/timeline.json"))
L = {l["id"]: l for l in TL["lines"]}
DUR = TL["duration_s"]
IMPACT = TL["impact_s"]
N = int(DUR * SR)
db = lambda v: 10 ** (v / 20)


def load(path, mono=True):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-ac", "1" if mono else "2", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout
    x = np.frombuffer(raw, np.float32).astype(np.float64)
    return x if mono else x.reshape(-1, 2).T


def fade(x, a=0.005, b=0.04):
    x = x.copy()
    na, nb = int(a * SR), int(b * SR)
    x[:na] *= np.linspace(0, 1, na)
    x[-nb:] *= np.linspace(1, 0, nb)
    return x


def place(buf, x, t, gain=1.0, pan=0.0):
    i = int(round(t * SR))
    if x.ndim == 1:
        x = np.stack([x * np.sqrt(1 - pan), x * np.sqrt(1 + pan)])
    m = min(x.shape[1], buf.shape[1] - i)
    if m > 0 and i >= 0:
        buf[:, i:i + m] += gain * x[:, :m]


def pitch(x, semis):
    return x if semis == 0 else signal.resample(x, int(len(x) / 2 ** (semis / 12)))


def onset(x, thresh_db=-24):
    """Início do transiente (primeira amostra acima do limiar relativo ao pico)."""
    lim = np.abs(x).max() * db(thresh_db)
    return int(np.argmax(np.abs(x) > lim))


def duck_gain(v, depth=-11.0):
    n = int(0.03 * SR)
    rms = np.sqrt(np.convolve(v ** 2, np.ones(n) / n, "same"))
    a, r = np.exp(-1 / (0.06 * SR / 48)), np.exp(-1 / (0.45 * SR / 48))
    env = np.zeros_like(rms)
    s = 0.0
    for i, val in enumerate(rms[::48]):
        c = a if val > s else r
        s = c * s + (1 - c) * val
        env[i * 48:(i + 1) * 48] = s
    amt = np.clip((20 * np.log10(env + 1e-9) + 42) / 12, 0, 1)
    return db(depth * amt)


def true_peak_limit(x, ceiling=-1.2, la=0.005, rel=0.08):
    up = signal.resample_poly(x, 4, 1, axis=1)
    pk = np.abs(up).max(0).reshape(-1, 4).max(1)[: x.shape[1]]
    pk = np.pad(pk, (0, x.shape[1] - len(pk)))
    need = minimum_filter1d(np.minimum(1.0, db(ceiling) / np.maximum(pk, 1e-9)), size=2 * int(la * SR) + 1, mode="nearest")
    r = np.exp(-1 / (rel * SR))
    g = np.empty_like(need)
    s = 1.0
    for i in range(0, len(need), 32):
        tgt = need[i:i + 32].min()
        s = tgt if tgt < s else r ** 32 * s + (1 - r ** 32) * tgt
        g[i:i + 32] = s
    return x * g


SFX = {k: fade(load(f"assets/sfx/{k}.mp3")) for k in [
    "sfx01_energy_awakening", "sfx02_digital_portal", "sfx03_interface_transition", "sfx04_artificial_intelligence",
    "sfx05_connection_network", "sfx06_brand_reveal", "sfx07_tension_ticktock", "sfx08_pencil_impact"]}

if __name__ == "__main__":
    voice = load("assets/voice/narration_edit.wav")[:N]
    voice = np.pad(voice, (0, N - len(voice)))
    voice = signal.sosfilt(signal.butter(2, 70, "high", fs=SR, output="sos"), voice)
    voice = voice + (db(2) - 1) * signal.sosfilt(signal.butter(2, [2200, 4200], "band", fs=SR, output="sos"), voice)
    V = np.stack([voice, voice]) / np.sqrt(2) * np.sqrt(2)

    music = load("assets/music/conectfly_reels_music.wav", mono=False)[:, :N]
    music = np.pad(music, ((0, 0), (0, N - music.shape[1])))
    t = np.arange(N) / SR
    hook = np.interp(t, [0, 5.0, IMPACT - 0.02, IMPACT, DUR], [db(-7), db(-5), db(-3), 1, 1])  # gancho baixo, crescendo
    duck = duck_gain(voice)
    M = music * db(-6.5) * hook * duck

    X = np.zeros((2, N))
    # tensão + tique-taque (0–7 s), crescendo nos 2 últimos segundos, corte seco no impacto
    tick = SFX["sfx07_tension_ticktock"][: int((IMPACT - 0.01) * SR)]
    env = np.interp(np.arange(len(tick)) / SR, [0, 0.4, 5.0, IMPACT], [0, db(-6), db(-4), 1])
    place(X, fade(tick * env, 0.3, 0.015), 0.0, gain=db(-2))
    # impacto: transiente alinhado em 7,000 s
    imp = SFX["sfx08_pencil_impact"]
    place(X, imp, IMPACT - onset(imp) / SR, gain=db(2))
    s3 = "sfx03_interface_transition"
    ev = [
        ("sfx01_energy_awakening", 8.45, -6, 0, 0),
        ("sfx05_connection_network", 9.45, -5, 0, 2),  # o "7" encaixa na frase
        ("sfx02_digital_portal", L["L2"]["end_s"] - 1.05, -4, 0, 0),  # transformação da página
        (s3, L["L3"]["start_s"] - 0.05, -4, -0.2, 0), (s3, L["L3"]["start_s"] + 1.7, -5, 0.2, 2), (s3, L["L3"]["start_s"] + 3.3, -5, 0, 4),
        (s3, L["L4"]["start_s"] - 0.05, -4, 0.2, 0), (s3, L["L4"]["start_s"] + 1.85, -5, -0.2, 2),
        (s3, L["L5"]["start_s"] - 0.05, -4, 0, -2), ("sfx05_connection_network", L["L5"]["start_s"] + 1.0, -5, 0, 0), (s3, L["L5"]["start_s"] + 1.95, -6, 0.2, 5),
        (s3, L["L6"]["start_s"] - 0.05, -4, 0, 0),
        ("sfx05_connection_network", L["L6"]["start_s"] + 0.25, -6, -0.3, 7),  # notificação: mensagem do cliente
        ("sfx05_connection_network", L["L6"]["start_s"] + 0.85, -7, 0.3, 9),  # classificação da IA
        ("sfx04_artificial_intelligence", L["L6"]["start_s"] + 1.4, -6, 0, 2),
        ("sfx05_connection_network", L["L6"]["start_s"] + 2.1, -6, 0, 4),
        ("sfx02_digital_portal", L["L7"]["start_s"] - 0.6, -4, 0, -2),  # energia converge
        ("sfx06_brand_reveal", L["L7"]["start_s"] + 0.38, -1, 0, 0),
        ("sfx06_brand_reveal", L["L7"]["end_s"] + 0.05, -4, 0, -3),  # assinatura sonora final
    ]
    for name, at, g, pan, semis in ev:
        place(X, pitch(SFX[name], semis), at, gain=db(g), pan=pan)
    X = X * db(-9) * (0.55 + 0.45 * duck)

    # silêncio de contraste: a cauda do impacto some rápido e só volta junto com a locução
    vo = L["L1"]["start_s"]
    contrast = np.interp(t, [0, IMPACT + 0.32, IMPACT + 0.75, vo - 0.12, vo + 0.05, DUR], [1, 1, db(-22), db(-22), 1, 1])
    M = M * contrast
    X = X * contrast
    stems = {"voice": V, "music": M, "sfx": X}
    mix = V + M + X
    meter = pyln.Meter(SR)
    gain = db(-14 - meter.integrated_loudness(mix.T))
    stems = {k: v * gain for k, v in stems.items()}
    mix = true_peak_limit(sum(stems.values()))
    mix = true_peak_limit(mix * db(-14 - meter.integrated_loudness(mix.T)))
    sf.write("assets/audio/conectfly_reels_mix.wav", mix.T.astype(np.float32), SR, subtype="PCM_24")
    for k, v in stems.items():
        sf.write(f"assets/audio/stem_{k}.wav", v.T.astype(np.float32), SR, subtype="FLOAT")
    up = signal.resample_poly(mix, 4, 1, axis=1)
    rv, rm = [np.sqrt(np.convolve(x.mean(0) ** 2, np.ones(19200) / 19200, "same")) + 1e-9 for x in (stems["voice"], stems["music"])]
    act = rv > db(-30)
    print({"lufs": round(meter.integrated_loudness(mix.T), 2), "true_peak_dbtp": round(float(20 * np.log10(np.abs(up).max())), 2),
           "voz_sobre_trilha_mediana_db": round(float(np.median(20 * np.log10(rv[act] / rm[act]))), 1), "impact_onset_s": round(IMPACT, 3)})
