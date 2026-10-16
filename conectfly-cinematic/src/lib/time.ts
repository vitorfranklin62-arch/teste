import { Easing, interpolate } from "remotion";
import tl from "../data/narration-timeline.json";
import cut from "../data/cut15.json";

export const FPS = 30;
export const sec = (s: number) => Math.round(s * FPS);

/** Marcadores do corte principal (segundos na timeline do vídeo, já com o offset da voz). */
export const MARK = Object.fromEntries(Object.entries(tl.markers).map(([k, v]) => [k, v.start_s])) as Record<keyof typeof tl.markers, number>;
export const SENT = Object.fromEntries(tl.sentences.map((s) => [s.id, { start: s.start_s, end: s.end_s }])) as Record<string, { start: number; end: number }>;
export const M15 = cut.markers;

export const cine = Easing.bezier(0.22, 1, 0.36, 1); // saída suave (cinematográfica)
export const inOut = Easing.bezier(0.65, 0, 0.35, 1);

/** 0→1 entre a e b (segundos), com easing; t em segundos. */
export const prog = (t: number, a: number, b: number, ease = cine) =>
  interpolate(t, [a, b], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });

/** Janela de visibilidade com entrada e saída suaves. */
export const win = (t: number, a: number, b: number, fin = 0.4, fout = 0.4) =>
  Math.min(prog(t, a, a + fin), 1 - prog(t, b - fout, b, inOut));

export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
