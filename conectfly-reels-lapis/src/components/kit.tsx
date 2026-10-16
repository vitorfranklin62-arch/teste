import React from "react";
import { Easing, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { ACCENT, LOGO_FILE, MUTED, PAPER } from "../theme/brand";
import { BODY, DISPLAY } from "../theme/fonts";

export const cine = Easing.bezier(0.22, 1, 0.36, 1);
export const inOut = Easing.bezier(0.65, 0, 0.35, 1);
export const prog = (t: number, a: number, b: number, ease = cine) =>
  interpolate(t, [a, b], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
export const win = (t: number, a: number, b: number, fin = 0.3, fout = 0.3) => Math.min(prog(t, a, a + fin), 1 - prog(t, b - fout, b, inOut));
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

/** Áreas seguras do Reels (briefing): 250 px topo, 360 px base, 170 px direita. */
export const SAFE = { top: 250, bottom: 360, left: 70, right: 170 };
export const CX = (SAFE.left + (1080 - SAFE.right)) / 2; // centro horizontal da área segura (490 px)
export const SAFE_W = 1080 - SAFE.left - SAFE.right; // 840 px

export const useT = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return f / fps;
};

/** Título cinético palavra a palavra (desfoque → nitidez), centralizado na área segura. */
export const Headline: React.FC<{ text: string; at: number; out: number; y: number; size?: number; accentWords?: string[]; weight?: number; stagger?: number }> = ({ text, at, out, y, size = 86, accentWords = [], weight = 800, stagger = 0.07 }) => {
  const t = useT();
  const exit = prog(t, out - 0.25, out, inOut);
  if (t < at - 0.05 || exit >= 1) return null;
  const words = text.split(" ");
  return (
    <div style={{ position: "absolute", top: y, left: SAFE.left, width: SAFE_W, textAlign: "center", fontFamily: DISPLAY, fontWeight: weight, fontSize: size, lineHeight: 1.05, letterSpacing: "-0.015em", color: PAPER, opacity: 1 - exit, filter: `blur(${exit * 12}px)` }}>
      {words.map((w, i) => {
        const k = prog(t, at + i * stagger, at + i * stagger + 0.45);
        const accent = accentWords.includes(w.replace(/[.,!?]/g, ""));
        return (
          <span key={i} style={{ display: "inline-block", marginRight: "0.22em", opacity: k, transform: `translateY(${(1 - k) * size * 0.5}px)`, filter: `blur(${(1 - k) * 14}px)`, color: accent ? ACCENT : PAPER, textShadow: accent ? `0 0 ${size * 0.5}px ${ACCENT}66` : "0 0 30px rgba(0,0,0,0.6)" }}>
            {w}
          </span>
        );
      })}
    </div>
  );
};

export const Sub: React.FC<{ text: string; at: number; out: number; y: number; size?: number }> = ({ text, at, out, y, size = 34 }) => {
  const t = useT();
  const v = win(t, at, out, 0.45, 0.25);
  if (v <= 0) return null;
  return (
    <div style={{ position: "absolute", top: y, left: SAFE.left, width: SAFE_W, textAlign: "center", fontFamily: BODY, fontWeight: 500, fontSize: size, color: MUTED, letterSpacing: "0.01em", opacity: v, transform: `translateY(${(1 - v) * 14}px)` }}>
      {text}
    </div>
  );
};

/** Legenda queimada (acessibilidade): bloco curto da fala atual, acima da área de UI do Reels. */
export const Captions: React.FC<{ chunks: { text: string; start_s: number; end_s: number }[] }> = ({ chunks }) => {
  const t = useT();
  const c = chunks.find((x) => t >= x.start_s - 0.05 && t < x.end_s + 0.12);
  if (!c) return null;
  const k = prog(t, c.start_s - 0.05, c.start_s + 0.15);
  return (
    <div style={{ position: "absolute", left: SAFE.left, width: SAFE_W, top: 1920 - SAFE.bottom - 128, display: "flex", justifyContent: "center" }}>
      <div style={{ padding: "12px 24px", borderRadius: 14, background: "rgba(0,0,0,0.62)", fontFamily: BODY, fontWeight: 600, fontSize: 40, lineHeight: 1.2, color: PAPER, textAlign: "center", maxWidth: SAFE_W, opacity: k, transform: `translateY(${(1 - k) * 8}px)` }}>{c.text}</div>
    </div>
  );
};

/** Janela de navegador com barra de endereço. */
export const Browser: React.FC<{ w: number; h: number; url?: string; children: React.ReactNode; style?: React.CSSProperties }> = ({ w, h, url = "", children, style }) => {
  const bar = Math.round(w * 0.045);
  return (
    <div style={{ position: "absolute", width: w, height: h, borderRadius: w * 0.022, overflow: "hidden", background: "#0d0f14", border: "1px solid rgba(255,255,255,0.14)", boxShadow: `0 50px 120px rgba(0,0,0,0.8), 0 0 80px ${ACCENT}22`, ...style }}>
      <div style={{ height: bar, display: "flex", alignItems: "center", gap: bar * 0.25, padding: `0 ${bar * 0.4}px`, background: "#161a22" }}>
        {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
          <span key={c} style={{ width: bar * 0.28, height: bar * 0.28, borderRadius: 99, background: c }} />
        ))}
        <div style={{ flex: 1, marginLeft: bar * 0.4, height: bar * 0.56, borderRadius: 99, background: "#0b0d12", color: MUTED, fontFamily: BODY, fontSize: bar * 0.32, display: "flex", alignItems: "center", paddingLeft: bar * 0.4, whiteSpace: "nowrap", overflow: "hidden" }}>{url}</div>
      </div>
      <div style={{ position: "relative", width: w, height: h - bar, overflow: "hidden" }}>{children}</div>
    </div>
  );
};

/** Smartphone (moldura original, sem barra de status de sistema). */
export const Phone: React.FC<{ w: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ w, children, style }) => {
  const h = w * 2.08;
  return (
    <div style={{ position: "absolute", width: w, height: h, borderRadius: w * 0.17, padding: w * 0.035, boxSizing: "border-box", background: "linear-gradient(160deg,#2b2f38,#08090c)", border: "1.5px solid rgba(255,255,255,0.22)", boxShadow: `0 60px 140px rgba(0,0,0,0.85), 0 0 90px ${ACCENT}22`, ...style }}>
      <div style={{ position: "relative", width: "100%", height: "100%", borderRadius: w * 0.135, overflow: "hidden", background: "#000" }}>
        {children}
        <div style={{ position: "absolute", top: w * 0.03, left: "50%", width: w * 0.28, height: w * 0.08, marginLeft: -w * 0.14, borderRadius: 99, background: "#000" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(125deg, rgba(255,255,255,0.12), rgba(255,255,255,0) 32%)", pointerEvents: "none" }} />
      </div>
    </div>
  );
};

/** Imagem real com rolagem (scroll) limitada à área com conteúdo. */
export const Scroll: React.FC<{ src: string; w: number; h: number; srcW: number; srcH: number; contentH?: number; k: number }> = ({ src, w, h, srcW, srcH, contentH, k }) => {
  const s = w / srcW;
  const maxY = Math.max(0, (contentH ?? srcH) * s - h);
  return (
    <div style={{ width: w, height: h, overflow: "hidden", position: "relative" }}>
      <Img src={staticFile(src)} style={{ position: "absolute", left: 0, top: -maxY * k, width: w, height: srcH * s }} />
    </div>
  );
};

/** Marca: logo oficial quando disponível; senão a palavra ConectFly em tipografia neutra (pendência registrada). */
export const Wordmark: React.FC<{ size: number; glow?: number }> = ({ size, glow = 0.6 }) =>
  LOGO_FILE ? (
    <Img src={staticFile(LOGO_FILE)} style={{ height: size * 1.3 }} />
  ) : (
    <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: size, letterSpacing: "-0.02em", color: PAPER, textShadow: `0 0 ${size * 0.6 * glow}px ${ACCENT}88` }}>
      Conect<span style={{ color: ACCENT }}>Fly</span>
    </div>
  );

/** Tag pequena de transparência ("Conceito ilustrativo", "Dados fictícios"). */
export const Tag: React.FC<{ text: string; at: number; out: number; x: number; y: number }> = ({ text, at, out, x, y }) => {
  const t = useT();
  const v = win(t, at, out, 0.3, 0.2);
  if (v <= 0) return null;
  return (
    <div style={{ position: "absolute", left: x, top: y, padding: "8px 16px", borderRadius: 99, border: `1px solid ${MUTED}66`, background: "rgba(0,0,0,0.55)", fontFamily: BODY, fontWeight: 500, fontSize: 22, color: MUTED, letterSpacing: "0.06em", opacity: v }}>{text}</div>
  );
};

/** Flash de transição (corte por luz). */
export const Flash: React.FC<{ at: number; dur?: number; max?: number; color?: string }> = ({ at, dur = 0.35, max = 0.8, color = "#ffffff" }) => {
  const t = useT();
  const k = t < at - 0.08 ? 0 : t < at ? prog(t, at - 0.08, at) : 1 - prog(t, at, at + dur, inOut);
  if (k <= 0) return null;
  return <div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at 50% 50%, ${color}, ${ACCENT}55 40%, rgba(0,0,0,0) 75%)`, opacity: k * max, mixBlendMode: "screen" }} />;
};

/** Vinheta + grão de filme (unidade cinematográfica). */
export const Grade: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 48% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.7) 100%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", inset: 0, opacity: 0.06, mixBlendMode: "overlay", pointerEvents: "none", backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' seed='${f % 9}'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")` }} />
    </>
  );
};

export { DISPLAY, BODY };
