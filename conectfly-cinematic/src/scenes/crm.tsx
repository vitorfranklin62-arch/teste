import React from "react";
import { AbsoluteFill, Img, interpolate, staticFile } from "remotion";
import { BRAND_GRADIENT, C } from "../lib/brand";
import { BODY, DISPLAY } from "../lib/fonts";
import { cine, inOut, lerp, prog } from "../lib/time";
import { Glass, Icons, Kinetic, Phone, ScrollShot, useLayout, Wordmark } from "../ui/kit";

// Telas reais do CRM Farmácia Preço Bom (prints do cliente, com dados pessoais desfocados — scripts/redact_crm.py)
const SHOT_W = 1424;
const SHOT_H = 832;
export const CRM_SHOTS = {
  dashboard: "captures/crm_real/crm_dashboard.png",
  chat: "captures/crm_real/crm_chat.png",
  pedidos: "captures/crm_real/crm_pedidos.png",
  encomendas: "captures/crm_real/crm_encomendas.png",
  campanhas: "captures/crm_real/crm_campanhas.png",
};

/** Abertura horizontal da parede curva (no 9:16 fica mais fechada para caber na tela). */
const WALL_F = (vertical: boolean) => (vertical ? 0.36 : 0.62);

type Marks = {
  a: number; out: number; doo: number; simples: number; completo: number; crm: number; painel: number;
  chat: number; pedidos: number; encomendas: number; campanhas: number; integrado: number; lugar: number;
};

/** Janela de app com barra de título (tela real). */
const AppWindow: React.FC<{ src: string; w: number; title: string; glow?: string; style?: React.CSSProperties; live?: number; zoom?: { s: number; fx: number; fy: number } }> = ({ src, w, title, glow = C.indigo, style, live = 0, zoom }) => {
  const bar = Math.round(w * 0.04);
  const h = w * (SHOT_H / SHOT_W);
  return (
    <Glass radius={w * 0.022} glow={glow} style={{ width: w, height: h + bar, ...style }}>
      <div style={{ height: bar, display: "flex", alignItems: "center", gap: bar * 0.28, paddingLeft: bar * 0.5, background: "rgba(4,5,26,0.92)", fontFamily: BODY, fontSize: bar * 0.42, color: C.muted, whiteSpace: "nowrap" }}>
        {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
          <span key={c} style={{ width: bar * 0.3, height: bar * 0.3, borderRadius: 99, background: c }} />
        ))}
        <span style={{ marginLeft: bar * 0.4 }}>{title}</span>
        {live > 0 ? (
          <span style={{ marginLeft: "auto", marginRight: bar * 0.5, display: "flex", alignItems: "center", gap: 8, color: "#4ade80", fontWeight: 600, opacity: live }}>
            <span style={{ width: bar * 0.26, height: bar * 0.26, borderRadius: 99, background: "#4ade80", boxShadow: "0 0 10px #4ade80" }} />
            AO VIVO
          </span>
        ) : null}
      </div>
      <div style={{ width: w, height: h, overflow: "hidden" }}>
        <Img src={staticFile(src)} style={{ width: w, height: h, display: "block", transformOrigin: `${zoom?.fx ?? 50}% ${zoom?.fy ?? 50}%`, transform: `scale(${zoom?.s ?? 1})` }} />
      </div>
    </Glass>
  );
};

const MODULES = [
  { key: "dashboard", label: "Painel em tempo real", icon: Icons.gauge, title: "CRM Farmácia Preço Bom — Dashboard", fx: 50, fy: 30 },
  { key: "chat", label: "Chat ao vivo com IA", icon: Icons.chat, title: "CRM Farmácia Preço Bom — Chat ao vivo", fx: 20, fy: 45 },
  { key: "pedidos", label: "Pedidos em kanban", icon: Icons.flow, title: "CRM Farmácia Preço Bom — Pedidos", fx: 30, fy: 55 },
  { key: "encomendas", label: "Encomendas + aviso no WhatsApp", icon: Icons.bolt, title: "CRM Farmácia Preço Bom — Encomendas", fx: 55, fy: 25 },
  { key: "campanhas", label: "Campanhas no WhatsApp", icon: Icons.spark, title: "CRM Farmácia Preço Bom — Campanhas", fx: 35, fy: 40 },
] as const;

export const SceneCRM: React.FC<{ m: Marks }> = ({ m }) => {
  const L = useLayout();
  const t = L.t;
  if (t < m.a - 0.2 || t > m.out + 0.1) return null;
  const V = L.vertical;
  const sceneOut = 1 - prog(t, m.out - 0.45, m.out, inOut);
  const headY = V ? L.safe.top - 10 : L.H * 0.05;
  const head = V ? 76 : 70;

  // ---- 1. simples: um único site no celular ----
  const simpleIn = prog(t, m.a, m.a + 0.8);
  const toComplex = prog(t, m.completo - 0.6, m.crm + 0.2, inOut);
  const phW = V ? 330 : 240;
  const phOpacity = simpleIn * (1 - prog(t, m.crm - 0.3, m.crm + 0.3));
  const phX = lerp(L.W / 2 - phW / 2, V ? L.safe.side : L.W * 0.08, toComplex);
  const phY = (V ? L.H * 0.31 : L.H * 0.26) + (1 - simpleIn) * 120 + Math.sin(t * 1.6) * 8;

  // ---- 2/3. deck de módulos reais ----
  const enters = [m.crm, m.chat, m.pedidos, m.encomendas, m.campanhas];
  const winW = V ? 900 : 820;
  const deckCx = L.W / 2;
  const deckCy = V ? L.H * 0.47 : L.H * 0.49;
  const integ = prog(t, m.integrado - 0.25, m.integrado + 1.0, inOut); // abre em parede curva
  const active = enters.filter((e) => t >= e).length; // quantos módulos já entraram

  // ---- escada de complexidade ----
  const steps = [
    { label: "Site", at: m.doo },
    { label: "Painel", at: m.painel },
    { label: "Chat", at: m.chat },
    { label: "Pedidos", at: m.pedidos },
    { label: "Encomendas", at: m.encomendas },
    { label: "Campanhas", at: m.campanhas },
  ];
  const ladderV = Math.min(prog(t, m.simples - 0.2, m.simples + 0.5), 1 - prog(t, m.integrado - 0.2, m.integrado + 0.4));
  const ladderW = V ? L.W - 2 * L.safe.side : L.W * 0.62;
  const ladderX = (L.W - ladderW) / 2;
  const ladderY = V ? L.H - L.safe.bottom - 150 : L.H * 0.835;

  return (
    <AbsoluteFill style={{ opacity: sceneOut, perspective: 2400 }}>
      {/* títulos */}
      <Kinetic lines={[{ text: "DO PROJETO" }, { text: "MAIS SIMPLES...", accent: true }]} at={m.doo} out={m.completo - 0.95} size={head} y={headY} />
      <Kinetic lines={[{ text: "...AO SISTEMA" }, { text: "MAIS COMPLETO.", accent: true }]} at={m.completo - 0.9} out={m.crm - 0.1} size={head} y={headY} />
      <Kinetic lines={[{ text: "UM CRM" }, { text: "SOB MEDIDA.", accent: true }]} at={m.crm} out={m.integrado - 0.15} size={head} y={headY} />
      <Kinetic lines={[{ text: "TUDO INTEGRADO." }, { text: "EM UM SÓ LUGAR.", accent: true }]} at={m.integrado} out={m.out} size={head} y={headY} />

      {/* 1 · o simples */}
      {phOpacity > 0 ? (
        <Phone w={phW} style={{ left: phX, top: phY, opacity: phOpacity, transform: `rotateY(${lerp(-12, 18, toComplex)}deg) scale(${1 - toComplex * 0.25})` }}>
          <ScrollShot src="captures/farmacia_site_mobile_scroll.jpg" srcWidth={780} srcHeight={5200} contentHeight={2600} w={phW * 0.92} h={phW * 0.92 * 2.16} scroll={prog(t, m.a, m.crm, inOut) * 0.4} />
        </Phone>
      ) : null}

      {/* 2/3 · deck: cada módulo real entra na sua palavra; os anteriores recuam (profundidade de campo) */}
      <AbsoluteFill style={{ transformStyle: "preserve-3d" }}>
        {MODULES.map((mod, i) => {
          const e = enters[i];
          const k = prog(t, e - 0.12, e + 0.55);
          if (k <= 0) return null;
          const depth = Math.max(0, active - 1 - i); // 0 = carta da frente
          const d = interpolate(depth, [0, 4], [0, 4]);
          // posição no deck
          const deckX = deckCx - winW / 2 + d * (V ? 26 : 44);
          const deckY = deckCy - (winW * 0.62) / 2 - d * (V ? 46 : 38);
          const deckZ = -d * 170;
          // posição na parede curva (tudo integrado)
          const n = MODULES.length;
          const ang = (i - (n - 1) / 2) * (V ? 30 : 26);
          const R = V ? 1200 : 1500;
          const wallW = V ? 430 : 470;
          const sc = lerp(1, wallW / winW, integ);
          const rad = (ang * Math.PI) / 180;
          const wx = deckCx + Math.sin(rad) * R * WALL_F(V) - winW / 2;
          const wy = (V ? L.H * 0.5 : L.H * 0.5) - (winW * 0.62) / 2 + (V ? (i % 2 ? 150 : -150) : 0);
          const wz = -(1 - Math.cos(rad)) * R;
          const x = lerp(deckX, wx, integ);
          const y = lerp(deckY, wy, integ);
          const z = lerp(deckZ, wz, integ);
          const rotY = lerp(-6 + d * 3, -ang * 0.9, integ);
          const blur = (1 - integ) * Math.min(6, d * 2.2) + (1 - k) * 10;
          return (
            <div key={mod.key} style={{ position: "absolute", left: x, top: y + (1 - k) * 160, width: winW, transformOrigin: "50% 50%", transform: `translateZ(${z + (1 - k) * -300}px) rotateY(${rotY}deg) rotateX(${(1 - k) * 18}deg) scale(${sc})`, opacity: k * (1 - (1 - integ) * Math.min(0.55, d * 0.18)), filter: blur > 0.3 ? `blur(${blur}px)` : undefined }}>
              <AppWindow src={CRM_SHOTS[mod.key]} w={winW} title={mod.title} glow={i % 2 ? C.violet : C.cyan} live={mod.key === "dashboard" ? prog(t, m.painel, m.painel + 0.4) : 0}
                zoom={{ s: 1 + (V ? 0.45 : 0.22) * prog(t, e + 0.2, (enters[i + 1] ?? m.integrado) + 0.3, inOut) * (1 - integ), fx: mod.fx, fy: mod.fy }} />
            </div>
          );
        })}
      </AbsoluteFill>

      {/* rótulo do módulo da frente */}
      {MODULES.map((mod, i) => {
        const e = enters[i];
        const next = enters[i + 1] ?? m.integrado;
        const k = Math.min(prog(t, e + 0.05, e + 0.45), 1 - prog(t, next - 0.15, next + 0.1));
        if (k <= 0) return null;
        return (
          <div key={mod.key} style={{ position: "absolute", left: 0, width: L.W, top: V ? deckCy + winW * 0.34 + 34 : deckCy + winW * 0.34 + 22, display: "flex", justifyContent: "center", opacity: k, transform: `translateY(${(1 - k) * 18}px)` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, padding: V ? "16px 30px" : "14px 26px", borderRadius: 999, background: "rgba(10,14,46,0.85)", border: `1.5px solid ${i % 2 ? C.violet : C.cyan}99`, boxShadow: `0 0 40px ${i % 2 ? C.violet : C.cyan}44`, fontFamily: DISPLAY, fontWeight: 700, fontSize: V ? 34 : 30, color: C.text }}>
              <span style={{ display: "flex", color: i % 2 ? C.violet : C.cyan }}>{mod.icon(V ? 34 : 30)}</span>
              {mod.label}
            </div>
          </div>
        );
      })}

      {/* escada de complexidade: do simples ao completo */}
      {ladderV > 0 ? (
        <div style={{ position: "absolute", left: ladderX, top: ladderY, width: ladderW, opacity: ladderV }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontFamily: BODY, fontWeight: 600, fontSize: V ? 20 : 18, letterSpacing: "0.2em", color: C.muted, marginBottom: 12 }}>
            <span>SIMPLES</span>
            <span>COMPLETO</span>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: V ? 10 : 12, height: V ? 120 : 66 }}>
            {steps.map((s, i) => {
              const k = prog(t, s.at - 0.05, s.at + 0.35);
              const hgt = (0.28 + (i / (steps.length - 1)) * 0.72) * (V ? 120 : 66);
              return (
                <div key={s.label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                  <div style={{ width: "100%", height: hgt, borderRadius: 10, background: k > 0 ? BRAND_GRADIENT : "rgba(169,177,214,0.12)", opacity: 0.25 + 0.75 * k, boxShadow: k > 0.5 ? `0 0 ${24 * k}px ${C.violet}88` : undefined, border: "1px solid rgba(169,177,214,0.25)", transform: `scaleY(${0.6 + 0.4 * cine(k)})`, transformOrigin: "bottom" }} />
                  <span style={{ fontFamily: BODY, fontWeight: 600, fontSize: V ? 22 : 18, color: k > 0.5 ? C.text : C.muted, whiteSpace: "nowrap" }}>{s.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* 4 · tudo integrado: núcleo ConectFly ligado a todos os módulos */}
      {integ > 0 ? (
        <>
          <svg width={L.W} height={L.H} style={{ position: "absolute", inset: 0, opacity: integ * 0.9 }}>
            {MODULES.map((_, i) => {
              const ang = ((i - (MODULES.length - 1) / 2) * (V ? 30 : 26) * Math.PI) / 180;
              const R = V ? 1200 : 1500;
              const pz = 2400 / (2400 + (1 - Math.cos(ang)) * R); // projeção da profundidade
              const tx = deckCx + Math.sin(ang) * R * WALL_F(V) * pz;
              const ty = L.H * 0.5 + (V ? (i % 2 ? 150 : -150) : 0) * pz;
              const draw = prog(t, m.integrado + i * 0.08, m.integrado + 0.7 + i * 0.08, inOut);
              return <line key={i} x1={deckCx} y1={L.H * 0.5} x2={lerp(deckCx, tx, draw)} y2={lerp(L.H * 0.5, ty, draw)} stroke={i % 2 ? C.violet : C.cyan} strokeWidth={3} style={{ filter: `drop-shadow(0 0 8px ${C.cyan})` }} />;
            })}
          </svg>
          <div style={{ position: "absolute", left: deckCx - (V ? 170 : 190), top: L.H * 0.5 - (V ? 60 : 64), width: V ? 340 : 380, height: V ? 120 : 128, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(4,5,26,0.88)", border: `2px solid ${C.cyan}aa`, boxShadow: `0 0 ${60 + 25 * Math.sin(t * 6)}px ${C.violet}`, opacity: prog(t, m.integrado + 0.2, m.integrado + 0.7), transform: `scale(${0.8 + 0.2 * prog(t, m.integrado + 0.2, m.integrado + 0.7)})` }}>
            <Wordmark size={V ? 58 : 62} glow={0.6} />
          </div>
        </>
      ) : null}
    </AbsoluteFill>
  );
};
