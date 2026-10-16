"""Mixagem e masterização (camadas A voz · B trilha · C efeitos).

- Voz em primeiro plano: HPF 70 Hz, leve presença em 3 kHz, sem compressão pesada.
- Trilha com ducking automático guiado pelo envelope real da voz (ataque 60 ms, release 450 ms).
- SFX posicionados nos marcadores do narration-timeline.json / cut15.json.
- Master: -14 LUFS integrados, true peak < -1 dBTP (limitador com detecção 4x oversampled).
- Exporta stems pós-fader em WAV 32-bit float (somam a mix pré-limitador, sem clipping) e a mix final em WAV 48 kHz 24-bit.

Uso: python3 scripts/mix.py
"""
import json
import subprocess
import numpy as np
import pyloudnorm as pyln
import soundfile as sf
from scipy import signal

SR = 48000
OUT = "assets/audio/final"
TL = json.load(open("narration-timeline.json"))
CUT = json.load(open("src/data/cut15.json"))
M = {k: v["start_s"] for k, v in TL["markers"].items()}
S = {x["id"]: (x["start_s"], x["end_s"]) for x in TL["sentences"]}
DUR = TL["video_duration_s"]


def load(path, mono=True):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-ac", "1" if mono else "2", "-ar", str(SR), "-f", "f32le", "-"],
                         capture_output=True, check=True).stdout
    x = np.frombuffer(raw, np.float32).astype(np.float64)
    return x if mono else x.reshape(-1, 2).T


def place(buf, x, t, gain=1.0, pan=0.0):
    i = int(round(t * SR))
    if x.ndim == 1:
        x = np.stack([x * np.sqrt((1 - pan) / 2) * np.sqrt(2), x * np.sqrt((1 + pan) / 2) * np.sqrt(2)])
    m = min(x.shape[1], buf.shape[1] - i)
    if m > 0:
        buf[:, i:i + m] += gain * x[:, :m]


def db(v):
    return 10 ** (v / 20)


def pitch(x, semitones):
    """Variação de altura por reamostragem (mantém o caráter do efeito, muda o timbre)."""
    if semitones == 0:
        return x
    r = 2 ** (semitones / 12)
    return signal.resample(x, int(len(x) / r))


def fade(x, fin=0.005, fout=0.04):
    a, b = int(fin * SR), int(fout * SR)
    x = x.copy()
    x[:a] *= np.linspace(0, 1, a)
    x[-b:] *= np.linspace(1, 0, b)
    return x


def voice_chain(v):
    sos_hp = signal.butter(2, 70, "high", fs=SR, output="sos")
    v = signal.sosfilt(sos_hp, v)
    # presença suave (+2 dB em torno de 3 kHz) via banda somada
    sos_bp = signal.butter(2, [2200, 4200], "band", fs=SR, output="sos")
    return v + (db(2) - 1) * signal.sosfilt(sos_bp, v)


def envelope(x, attack=0.06, release=0.45, win=0.03):
    n = int(win * SR)
    rms = np.sqrt(np.convolve(x ** 2, np.ones(n) / n, "same"))
    a, r = np.exp(-1 / (attack * SR)), np.exp(-1 / (release * SR))
    out = np.zeros_like(rms)
    s = 0.0
    for i, v in enumerate(rms[::48]):  # 1 kHz de controle basta para automação de ganho
        c = a if v > s else r
        s = c * s + (1 - c) * v
        out[i * 48:(i + 1) * 48] = s
    return out


def duck_gain(voice_mono, depth_db=-11.0, thresh_db=-42.0):
    env = envelope(voice_mono)
    lvl = 20 * np.log10(env + 1e-9)
    amt = np.clip((lvl - thresh_db) / 12.0, 0, 1)  # 0..1 conforme a voz entra
    return db(depth_db * amt)


def true_peak_limit(x, ceiling_dbtp=-1.2, lookahead=0.005, release=0.08):
    up = signal.resample_poly(x, 4, 1, axis=1)
    pk = np.abs(up).max(0).reshape(-1, 4).max(1)[: x.shape[1]]
    pk = np.pad(pk, (0, x.shape[1] - len(pk)))
    need = np.minimum(1.0, db(ceiling_dbtp) / np.maximum(pk, 1e-9))
    la = int(lookahead * SR)
    need = _sliding_min(need, la)  # lookahead: o ganho começa a cair antes do pico
    r = np.exp(-1 / (release * SR))
    g = np.empty_like(need)
    s = 1.0
    for i in range(0, len(need), 32):
        tgt = need[i:i + 32].min()
        s = tgt if tgt < s else r ** 32 * s + (1 - r ** 32) * tgt
        g[i:i + 32] = s
    return x * g


def _sliding_min(x, w):
    from scipy.ndimage import minimum_filter1d
    return minimum_filter1d(x, size=2 * w + 1, mode="nearest")


def master(stems, target_lufs=-14.0):
    mix = sum(stems.values())
    meter = pyln.Meter(SR)
    gain = db(target_lufs - meter.integrated_loudness(mix.T))
    stems = {k: v * gain for k, v in stems.items()}
    mix = true_peak_limit(sum(stems.values()))
    # pequena correção pós-limitador para cravar o alvo
    g2 = db(target_lufs - meter.integrated_loudness(mix.T))
    mix = true_peak_limit(mix * g2)
    return stems, mix


def write(name, x, subtype="PCM_24"):
    sf.write(f"{OUT}/{name}", x.T.astype(np.float32), SR, subtype=subtype)


def report(name, x):
    meter = pyln.Meter(SR)
    up = signal.resample_poly(x, 4, 1, axis=1)
    return {"file": name, "lufs_i": round(meter.integrated_loudness(x.T), 2),
            "true_peak_dbtp": round(20 * np.log10(np.abs(up).max()), 2),
            "sample_peak_dbfs": round(20 * np.log10(np.abs(x).max()), 2), "duration_s": round(x.shape[1] / SR, 3)}


SFX = {k: load(f"assets/audio/sfx_src/{k}.mp3") for k in [
    "sfx01_energy_awakening", "sfx02_digital_portal", "sfx03_interface_transition",
    "sfx04_artificial_intelligence", "sfx05_connection_network", "sfx06_brand_reveal"]}
SFX = {k: fade(v) for k, v in SFX.items()}
# Takes de locução ElevenLabs v4 (mesma voz/modelo), montados por segmentos em pausas naturais.
TAKES = {k: load(v["audio"]) for k, v in TL["sources"].items()}


def assemble(segments, chain=True):
    """Voz montada a partir dos segmentos (sem time-stretch). chain=False → narração crua."""
    n = int(max(s["at"] + s["src_end"] - s["src_start"] for s in segments) * SR) + SR
    v = np.zeros((2, n))
    for s in segments:
        a, b = int(s["src_start"] * SR), int(s["src_end"] * SR)
        x = TAKES[s["src"]][a:b]
        place(v, fade(voice_chain(x) if chain else x, 0.01, 0.06), s["at"])
    return v


def build(duration, segments, music_path, sfx_events, music_gain_db=-6.5, sfx_gain_db=-10.0):
    n = int(duration * SR)
    voice = assemble(segments)[:, :n]
    voice = np.pad(voice, ((0, 0), (0, n - voice.shape[1])))
    music = load(music_path, mono=False)[:, :n]
    music = np.pad(music, ((0, 0), (0, n - music.shape[1])))
    duck = duck_gain(voice.mean(0))
    music = music * db(music_gain_db) * duck
    sfx = np.zeros((2, n))
    for name, t, g, pan, semi in sfx_events:
        place(sfx, pitch(SFX[name], semi), t, gain=db(g), pan=pan)
    sfx = sfx * db(sfx_gain_db) * (0.5 + 0.5 * duck)  # efeitos cedem um pouco à voz
    return {"voice": voice, "music": music, "sfx": sfx}


if __name__ == "__main__":
    import os
    os.makedirs(OUT, exist_ok=True)
    os.makedirs(f"{OUT}/conectfly_sfx", exist_ok=True)
    reports = []

    # ---- corte principal (54 s) ----
    ev = [
        ("sfx01_energy_awakening", 0.25, 0, 0, 0),
        ("sfx02_digital_portal", M["conectfly_1"] - 1.25, -1, 0, 0),
        ("sfx03_interface_transition", M["sites"] - 0.5, -2, -0.3, 0),
        ("sfx03_interface_transition", M["sistemas"] - 0.15, -3, 0.3, 2),
        ("sfx03_interface_transition", M["experiencias"] - 0.15, -3, -0.2, -2),
        # CRM — do simples ao complexo: cada módulo entra com um "clique" de interface, subindo de tom
        ("sfx03_interface_transition", M["crm_do"] - 0.2, -4, 0, -2),
        ("sfx05_connection_network", M["crm_completo"] - 0.05, -4, 0, 0),
        ("sfx06_brand_reveal", M["crm"] - 0.05, -3, 0, 2),
        ("sfx03_interface_transition", M["crm_chat"] - 0.1, -4, -0.3, 0),
        ("sfx03_interface_transition", M["crm_pedidos"] - 0.1, -4, 0.3, 1),
        ("sfx03_interface_transition", M["crm_encomendas"] - 0.1, -4, -0.3, 2),
        ("sfx03_interface_transition", M["crm_campanhas"] - 0.1, -4, 0.3, 3),
        ("sfx05_connection_network", M["crm_integrado"] - 0.05, -2, 0, 2),
        ("sfx04_artificial_intelligence", M["inteligencia_artificial"] - 0.1, -2, 0, 0),
        ("sfx04_artificial_intelligence", M["automacoes"] + 0.1, -5, 0.25, 3),
        ("sfx05_connection_network", M["organizacao"], -8, -0.3, 0),
        ("sfx05_connection_network", M["agilidade"], -8, 0.3, 2),
        ("sfx05_connection_network", M["liberdade"], -8, 0, 4),
        ("sfx03_interface_transition", M["primeira_ideia"] - 0.25, -2, 0, 0),
        ("sfx03_interface_transition", M["projeto_no_ar"] - 0.1, -5, 0.3, 2),
        ("sfx02_digital_portal", S["L5_projetos"][1] + 0.3, -5, 0, -3),  # projetos viram partículas
        ("sfx06_brand_reveal", M["conectfly_2"] - 0.05, 0, 0, 0),
        ("sfx05_connection_network", M["conecte"] - 0.04, -1, -0.15, 0),
        ("sfx05_connection_network", M["automatize"] - 0.04, -1, 0.15, 2),
        ("sfx05_connection_network", M["evolua"] - 0.04, -1, 0, 4),
        ("sfx06_brand_reveal", M["aqui"] + 0.55, 0, 0, -2),  # logo final + assinatura
    ]
    st = build(DUR, TL["segments"], "assets/audio/stems/music_main.wav", ev)
    st, mix = master(st)
    write("conectfly_voice_only.wav", st["voice"], "FLOAT")  # pré-limitador: float evita clipping
    write("conectfly_music_only.wav", st["music"], "FLOAT")
    write("conectfly_sfx_only.wav", st["sfx"], "FLOAT")
    write("conectfly_final_mix.wav", mix)
    reports += [report(k, v) for k, v in [("conectfly_voice_only.wav", st["voice"]), ("conectfly_music_only.wav", st["music"]),
                                          ("conectfly_sfx_only.wav", st["sfx"]), ("conectfly_final_mix.wav", mix)]]

    # ---- corte 15 s ----
    k = CUT["markers"]
    ev15 = [
        ("sfx01_energy_awakening", 0.1, 0, 0, 0),
        ("sfx02_digital_portal", 3.35, -1, 0, 0),
        ("sfx03_interface_transition", 4.4, -2, -0.3, 0),
        ("sfx03_interface_transition", 5.1, -3, 0.3, 2),
        ("sfx04_artificial_intelligence", 5.75, -4, 0, 3),
        ("sfx06_brand_reveal", k["conectfly"] - 0.05, 0, 0, 0),
        ("sfx05_connection_network", k["conecte"] - 0.04, -1, -0.15, 0),
        ("sfx05_connection_network", k["automatize"] - 0.04, -1, 0.15, 2),
        ("sfx05_connection_network", k["evolua"] - 0.04, -1, 0, 4),
        ("sfx06_brand_reveal", k["aqui_end"] - 0.15, 0, 0, -2),
    ]
    st15 = build(15.0, CUT["segments"], "assets/audio/stems/music_15s.wav", ev15)
    st15, mix15 = master(st15)
    write("conectfly_15s_final_mix.wav", mix15)
    reports.append(report("conectfly_15s_final_mix.wav", mix15))

    # ---- entregáveis de áudio "brutos" ----
    narr = assemble(TL["segments"], chain=False)[:, : int(DUR * SR)].mean(0)  # narração editada, sem processamento
    sf.write(f"{OUT}/conectfly_narration.wav", narr.astype(np.float32), SR, subtype="PCM_24")
    music_raw = load("assets/audio/stems/music_main.wav", mono=False)
    sf.write(f"{OUT}/conectfly_soundtrack.wav", music_raw.T.astype(np.float32), SR, subtype="PCM_24")
    for name, x in SFX.items():
        sf.write(f"{OUT}/conectfly_sfx/{name}.wav", x.astype(np.float32), SR, subtype="PCM_24")

    json.dump(reports, open(f"{OUT}/loudness_report.json", "w"), indent=2)
    for r in reports:
        print({kk: (float(vv) if not isinstance(vv, str) else vv) for kk, vv in r.items()})
