"""Análise objetiva de amostras de voz: pitch mediano, faixa de pitch, pausas,
ruído de fundo, loudness e true peak. Uso: python3 scripts/analyze_voice.py a.mp3 b.mp3 ..."""
import subprocess, sys, json
import numpy as np, pyloudnorm as pyln

def load(path, sr=44100):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", str(sr), "-f", "f32le", "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32), sr

def pitch_track(x, sr, win=2048, hop=512):
    f0 = []
    for i in range(0, len(x) - win, hop):
        fr = x[i:i + win] * np.hanning(win)
        if np.sqrt(np.mean(fr ** 2)) < 0.02:
            continue
        ac = np.correlate(fr, fr, "full")[win - 1:]
        lo, hi = int(sr / 300), int(sr / 65)
        lag = lo + np.argmax(ac[lo:hi])
        if ac[lag] / ac[0] > 0.45:
            f0.append(sr / lag)
    return np.array(f0)

for p in sys.argv[1:]:
    x, sr = load(p)
    f0 = pitch_track(x, sr)
    env = np.sqrt(np.convolve(x ** 2, np.ones(441) / 441, "same"))
    silent = env < 10 ** (-40 / 20)
    # pausas internas (>=150 ms) entre fala
    runs, cur = [], 0
    for s in silent:
        cur = cur + 1 if s else (runs.append(cur) or 0)
    pauses = [r / sr for r in runs if r / sr >= 0.15]
    meter = pyln.Meter(sr)
    print(json.dumps({
        "file": p, "dur": round(len(x) / sr, 2),
        "f0_median_hz": round(float(np.median(f0)), 1), "f0_p10_p90": [round(float(np.percentile(f0, 10)), 1), round(float(np.percentile(f0, 90)), 1)],
        "lufs": round(meter.integrated_loudness(x.astype(np.float64)), 1), "peak_dbfs": round(float(20 * np.log10(np.abs(x).max())), 1),
        "noise_floor_dbfs": round(float(20 * np.log10(np.percentile(env, 5) + 1e-9)), 1),
        "internal_pauses_s": [round(float(v), 2) for v in pauses],
    }, ensure_ascii=False))
