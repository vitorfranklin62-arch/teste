import React from "react";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { BRAND_GRADIENT, C, LOGO_FILE } from "../lib/brand";
import { BODY, DISPLAY } from "../lib/fonts";
import { cine, inOut, prog } from "../lib/time";

/** Layout responsivo: mesma lógica, recomposição por proporção (sem distorcer). */
export const useLayout = () => {
  const { width: W, height: H, fps } = useVideoConfig();
  const t = useCurrentFrame() / fps;
  const vertical = H > W;
  const u = Math.min(W, H) / 1080; // 1 u = 1 px em 1080 de largura mínima
  // Áreas seguras do Instagram Reels (topo: perfil; base: legenda/botões).
  const safe = vertical ? { top: 250, bottom: 430, side: 72 } : { top: 70, bottom: 80, side: 110 };
  return { W, H, t, vertical, u, safe };
};

type Line = { text: string; accent?: boolean };

/** Título cinético: palavras sobem com desfoque → nitidez, escalonadas. */
export const Kinetic: React.FC<{
  lines: Line[];
  at: number;
  out?: number;
  size: number;
  y: number;
  align?: "center" | "left";
  x?: number;
  maxWidth?: number;
  stagger?: number;
  weight?: number;
  tracking?: number;
}> = ({ lines, at, out, size, y, align = "center", x, maxWidth, stagger = 0.07, weight = 800, tracking = -0.01 }) => {
  const { t, W } = useLayout();
  const exit = out !== undefined ? prog(t, out - 0.35, out, inOut) : 0;
  if (t < at - 0.05 || exit >= 1) return null;
  let wi = 0;
  return (
    <div
      style={{
        position: "absolute",
        top: y,
        left: x ?? 0,
        width: maxWidth ?? W,
        textAlign: align,
        fontFamily: DISPLAY,
        fontWeight: weight,
        fontSize: size,
        lineHeight: 1.04,
        letterSpacing: `${tracking}em`,
        color: C.text,
        opacity: 1 - exit,
        filter: `blur(${exit * 14}px)`,
        transform: `translateY(${-exit * size * 0.3}px)`,
      }}
    >
      {lines.map((ln, li) => (
        <div key={li} style={{ whiteSpace: "nowrap" }}>
          {ln.text.split(" ").map((w, i) => {
            const k = prog(t, at + wi++ * stagger, at + wi * stagger + 0.55);
            return (
              <span
                key={i}
                style={{
                  display: "inline-block",
                  marginRight: "0.24em",
                  opacity: k,
                  filter: `blur(${(1 - k) * 16}px)`,
                  transform: `translateY(${(1 - k) * 0.45 * size}px) scale(${0.96 + 0.04 * k})`,
                  ...(ln.accent ? { backgroundImage: BRAND_GRADIENT, WebkitBackgroundClip: "text", color: "transparent" } : {}),
                  textShadow: ln.accent ? undefined : `0 0 ${size * 0.5}px rgba(79,91,232,0.35)`,
                }}
              >
                {w}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};

/** Rótulo pequeno em caixa alta (kicker). */
export const Kicker: React.FC<{ text: string; at: number; out?: number; y: number; size: number; x?: number; align?: "center" | "left"; width?: number }> = ({ text, at, out, y, size, x = 0, align = "center", width }) => {
  const { t, W } = useLayout();
  const v = Math.min(prog(t, at, at + 0.5), out !== undefined ? 1 - prog(t, out - 0.3, out) : 1);
  if (v <= 0) return null;
  return (
    <div style={{ position: "absolute", top: y, left: x, width: width ?? W, textAlign: align, fontFamily: BODY, fontWeight: 600, fontSize: size, letterSpacing: "0.32em", color: C.cyan, opacity: v, transform: `translateY(${(1 - v) * 10}px)` }}>
      {text}
    </div>
  );
};

/** Moldura de vidro com reflexo — usada para telas reais flutuantes. */
export const Glass: React.FC<{ children: React.ReactNode; radius: number; style?: React.CSSProperties; glow?: string }> = ({ children, radius, style, glow = C.indigo }) => (
  <div
    style={{
      position: "absolute",
      borderRadius: radius,
      overflow: "hidden",
      background: "rgba(17,24,66,0.6)",
      border: "1.5px solid rgba(169,177,214,0.28)",
      boxShadow: `0 40px 120px rgba(0,0,0,0.65), 0 0 90px ${glow}55, inset 0 1px 0 rgba(255,255,255,0.18)`,
      ...style,
    }}
  >
    {children}
    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(125deg, rgba(255,255,255,0.13) 0%, rgba(255,255,255,0) 32%)", pointerEvents: "none" }} />
  </div>
);

/** Tela real com rolagem suave (imagem de página inteira). */
export const ScrollShot: React.FC<{ src: string; w: number; h: number; scroll: number; srcWidth: number; srcHeight: number; contentHeight?: number }> = ({ src, w, h, scroll, srcWidth, srcHeight, contentHeight }) => {
  const scale = w / srcWidth;
  // contentHeight limita a rolagem à região com conteúdo real renderizado na captura.
  const maxY = Math.max(0, (contentHeight ?? srcHeight) * scale - h);
  return (
    <div style={{ width: w, height: h, overflow: "hidden", position: "relative", background: "#000" }}>
      <Img src={staticFile(src)} style={{ position: "absolute", left: 0, top: -maxY * scroll, width: w, height: srcHeight * scale }} />
    </div>
  );
};

/** Notebook em CSS 3D (tela real + base), sem texturas inventadas. */
export const Laptop: React.FC<{ w: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ w, children, style }) => {
  const sh = w * 0.625;
  return (
    <div style={{ position: "absolute", width: w, transformStyle: "preserve-3d", ...style }}>
      <div style={{ width: w, height: sh + w * 0.04, borderRadius: w * 0.022, background: "linear-gradient(180deg,#1a1f3d,#0c1028)", padding: w * 0.02, boxSizing: "border-box", border: "1px solid rgba(169,177,214,0.35)", boxShadow: `0 0 120px ${C.indigo}66` }}>
        <div style={{ width: "100%", height: "100%", borderRadius: w * 0.008, overflow: "hidden", position: "relative" }}>
          {children}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(120deg, rgba(255,255,255,0.12), rgba(255,255,255,0) 35%)" }} />
        </div>
      </div>
      <div style={{ width: w * 1.16, marginLeft: -w * 0.08, height: w * 0.03, borderRadius: `0 0 ${w * 0.03}px ${w * 0.03}px`, background: "linear-gradient(180deg,#3a4170,#161b3a)", boxShadow: "0 30px 60px rgba(0,0,0,0.6)" }} />
    </div>
  );
};

/** Smartphone em CSS (tela real responsiva). */
export const Phone: React.FC<{ w: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ w, children, style }) => {
  const h = w * 2.06;
  return (
    <div style={{ position: "absolute", width: w, height: h, borderRadius: w * 0.16, background: "linear-gradient(160deg,#2a3060,#0b0f26)", padding: w * 0.04, boxSizing: "border-box", border: "1.5px solid rgba(169,177,214,0.45)", boxShadow: `0 50px 120px rgba(0,0,0,0.7), 0 0 110px ${C.violet}55`, ...style }}>
      <div style={{ width: "100%", height: "100%", borderRadius: w * 0.125, overflow: "hidden", position: "relative", background: "#000" }}>
        {children}
        <div style={{ position: "absolute", top: w * 0.03, left: "50%", width: w * 0.3, height: w * 0.085, marginLeft: -w * 0.15, borderRadius: 99, background: "#05060f" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(130deg, rgba(255,255,255,0.14), rgba(255,255,255,0) 30%)" }} />
      </div>
    </div>
  );
};

/** Chip de benefício / processo. */
export const Chip: React.FC<{ icon?: React.ReactNode; text: string; at: number; out?: number; size: number; style?: React.CSSProperties; color?: string }> = ({ icon, text, at, out, size, style, color = C.cyan }) => {
  const { t } = useLayout();
  const v = Math.min(prog(t, at, at + 0.45), out !== undefined ? 1 - prog(t, out - 0.3, out) : 1);
  if (v <= 0) return null;
  return (
    <div
      style={{
        position: "absolute",
        display: "flex",
        alignItems: "center",
        gap: size * 0.55,
        padding: `${size * 0.55}px ${size * 0.95}px`,
        borderRadius: 999,
        background: "rgba(10,14,46,0.78)",
        border: `1.5px solid ${color}88`,
        boxShadow: `0 0 ${size * 1.6}px ${color}44`,
        fontFamily: BODY,
        fontWeight: 600,
        fontSize: size,
        color: C.text,
        whiteSpace: "nowrap",
        opacity: v,
        transform: `translateY(${(1 - v) * size}px) scale(${0.92 + 0.08 * v})`,
        ...style,
      }}
    >
      {icon ? <span style={{ display: "flex", color }}>{icon}</span> : null}
      {text}
    </div>
  );
};

/** Marca: usa a logo oficial quando configurada; senão, wordmark tipográfico provisório. */
export const Wordmark: React.FC<{ size: number; style?: React.CSSProperties; glow?: number }> = ({ size, style, glow = 1 }) =>
  LOGO_FILE ? (
    <Img src={staticFile(LOGO_FILE)} style={{ height: size * 1.4, ...style }} />
  ) : (
    // O brilho fica numa camada irmã desfocada: drop-shadow direto em texto com
    // background-clip gera uma caixa escura no Chromium.
    <div style={{ position: "relative", fontFamily: DISPLAY, fontWeight: 800, fontSize: size, letterSpacing: "-0.02em", lineHeight: 1.1, ...style }}>
      <div style={{ position: "absolute", inset: 0, color: "rgba(124,77,255,0.75)", filter: `blur(${size * 0.22 * glow}px)`, opacity: Math.min(1, 0.55 * glow) }}>ConectFly</div>
      <div style={{ position: "relative", backgroundImage: BRAND_GRADIENT, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>ConectFly</div>
    </div>
  );

/** Vinheta + grão leve para unidade cinematográfica. */
export const Grade: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, rgba(4,5,26,0) 55%, rgba(4,5,26,0.75) 100%)" }} />
      <AbsoluteFill
        style={{
          opacity: 0.05,
          mixBlendMode: "overlay",
          backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' seed='${frame % 8}'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")`,
        }}
      />
    </AbsoluteFill>
  );
};

/** Ícones de linha (SVG inline, sem dependências). */
const icon = (d: React.ReactNode, s: number) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
    {d}
  </svg>
);
export const Icons = {
  flow: (s: number) => icon(<><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /><path d="M10 6.5h4a3 3 0 0 1 3 3V14" /></>, s),
  gauge: (s: number) => icon(<><path d="M12 14l4-4" /><path d="M3.5 18a9 9 0 1 1 17 0" /></>, s),
  chat: (s: number) => icon(<><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" /></>, s),
  plug: (s: number) => icon(<><path d="M9 7V3M15 7V3M6 7h12v4a6 6 0 0 1-12 0V7zM12 17v4" /></>, s),
  spark: (s: number) => icon(<><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" /></>, s),
  crm: (s: number) => icon(<><circle cx="9" cy="8" r="3.2" /><path d="M3 20a6 6 0 0 1 12 0M16 11h5M16 15h5M18 7h3" /></>, s),
  bolt: (s: number) => icon(<><path d="M13 2L4 14h7l-1 8 9-12h-7z" /></>, s),
  check: (s: number) => icon(<><path d="M20 6L9 17l-5-5" /></>, s),
  arrow: (s: number) => icon(<><path d="M5 12h14M13 6l6 6-6 6" /></>, s),
};

export { interpolate, cine };
