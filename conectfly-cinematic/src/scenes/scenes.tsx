import React from "react";
import { AbsoluteFill, interpolate } from "remotion";
import { BRAND_GRADIENT, C, CTA } from "../lib/brand";
import { BODY, DISPLAY } from "../lib/fonts";
import { cine, inOut, lerp, prog, win } from "../lib/time";
import { Chip, Glass, Icons, Kicker, Kinetic, Laptop, Phone, ScrollShot, useLayout, Wordmark } from "../ui/kit";

const DESK_SCROLL = { src: "captures/farmacia_site_desktop_scroll.jpg", srcWidth: 1920, srcHeight: 3600, contentHeight: 1750 };
const MOB_SCROLL = { src: "captures/farmacia_site_mobile_scroll.jpg", srcWidth: 780, srcHeight: 5200, contentHeight: 2600 };
// Telas reais do CRM (prints do cliente com dados pessoais desfocados — scripts/redact_crm.py)
const CRM_DESK = { src: "captures/crm_real/crm_dashboard.png", srcWidth: 1424, srcHeight: 832 };
const CRM_CHAT = { src: "captures/crm_real/crm_chat.png", srcWidth: 1424, srcHeight: 832 };

/** Flash de luz (corte por energia). */
export const Flash: React.FC<{ at: number; dur?: number; color?: string; max?: number }> = ({ at, dur = 0.5, color = "#ffffff", max = 0.85 }) => {
  const { t } = useLayout();
  const k = t < at - 0.12 ? 0 : t < at ? prog(t, at - 0.12, at) : 1 - prog(t, at, at + dur, inOut);
  if (k <= 0) return null;
  return <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 50%, ${color} 0%, ${C.cyan}88 35%, rgba(4,5,26,0) 75%)`, opacity: k * max, mixBlendMode: "screen" }} />;
};

// ---------------- CENA 1 — Nasce uma conexão ----------------
export const SceneHook: React.FC<{ textAt: number; out: number }> = ({ textAt, out }) => {
  const L = useLayout();
  const size = L.vertical ? 92 : 96;
  return (
    <AbsoluteFill>
      <Kicker text="CONECTFLY" at={textAt - 0.3} out={out} y={L.vertical ? L.safe.top + 40 : L.H * 0.12} size={L.vertical ? 30 : 26} />
      <Kinetic lines={[{ text: "E SE O SEU NEGÓCIO" }, { text: "PUDESSE IR ALÉM?", accent: true }]} at={textAt} out={out} size={size} y={L.vertical ? L.H * 0.63 : L.H * 0.66} stagger={0.11} />
    </AbsoluteFill>
  );
};

// ---------------- CENA 2 — Universo ConectFly ----------------
export const SceneBrand: React.FC<{ logoAt: number; lineAt: number; out: number }> = ({ logoAt, lineAt, out }) => {
  const L = useLayout();
  const v = win(L.t, logoAt - 0.1, out, 0.9, 0.45);
  if (v <= 0) return null;
  const sweep = prog(L.t, logoAt, logoAt + 1.4, inOut); // iluminação progressiva
  const size = L.vertical ? 150 : 170;
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", top: L.H * (L.vertical ? 0.36 : 0.3), width: L.W, display: "flex", justifyContent: "center", opacity: v, transform: `scale(${lerp(1.08, 1, cine(Math.min(1, sweep * 1.4)))})`, filter: `blur(${(1 - v) * 10}px)` }}>
        {/* iluminação progressiva: base apagada + cópia acesa recortada por clip-path */}
        <div style={{ position: "relative" }}>
          <div style={{ opacity: 0.16 }}>
            <Wordmark size={size} glow={0} />
          </div>
          <div style={{ position: "absolute", inset: 0, clipPath: `inset(-40% ${100 - sweep * 100}% -40% -10%)` }}>
            <Wordmark size={size} glow={0.6 + sweep} />
          </div>
        </div>
      </div>
      <Kinetic lines={[{ text: "TRANSFORMAMOS IDEIAS" }, { text: "EM SOLUÇÕES.", accent: true }]} at={lineAt} out={out} size={L.vertical ? 64 : 76} y={L.H * (L.vertical ? 0.52 : 0.55)} />
      <Kicker text="SITES · SISTEMAS · AUTOMAÇÕES COM IA" at={lineAt + 0.6} out={out} y={L.H * (L.vertical ? 0.69 : 0.8)} size={L.vertical ? 28 : 24} />
    </AbsoluteFill>
  );
};

// ---------------- CENAS 3 e 4 — Sites, sistemas e clientes conectados ----------------
export const SceneServices: React.FC<{ a: number; sites: number; sistemas: number; experiencias: number; conectam: number; out: number }> = ({ a, sites, sistemas, experiencias, conectam, out }) => {
  const L = useLayout();
  const t = L.t;
  if (t < a - 0.2 || t > out + 0.1) return null;
  const head = L.vertical ? 84 : 78;
  const headY = L.vertical ? L.safe.top + 10 : L.H * 0.08;

  // Notebook: entra girando, tela rola (site real)
  const lapIn = prog(t, a, a + 1.0);
  const toSystem = prog(t, sistemas - 0.35, sistemas + 0.45, inOut);
  const toPhones = prog(t, experiencias - 0.3, experiencias + 0.6, inOut);
  const lapW = L.vertical ? 900 : 1080;
  const lapX = L.W / 2 - lapW / 2 + (L.vertical ? 0 : 0) - toPhones * (L.vertical ? 140 : 360);
  const lapY = (L.vertical ? L.H * 0.36 : L.H * 0.26) + (1 - lapIn) * 120 + toPhones * (L.vertical ? -40 : 30);
  const lapScale = (0.86 + 0.14 * lapIn) * (1 + toSystem * 0.35 * (1 - toPhones)) * (1 - toPhones * 0.22);
  const lapRot = lerp(28, -6, cine(prog(t, a, sistemas))) + toPhones * 14;
  const lapOpacity = lapIn * (1 - toSystem * (1 - toPhones));

  // Janela do sistema (CRM real) emergindo do notebook
  const sysV = Math.min(prog(t, sistemas - 0.1, sistemas + 0.6), 1 - prog(t, experiencias - 0.4, experiencias + 0.1, inOut));
  const sysW = L.vertical ? 860 : 760;
  const sysH = sysW * (CRM_DESK.srcHeight / CRM_DESK.srcWidth);

  // Smartphone com a versão responsiva do mesmo site
  const phV = prog(t, experiencias - 0.1, experiencias + 0.8);
  const phW = L.vertical ? 400 : 300;
  const outV = 1 - prog(t, out - 0.45, out, inOut);

  const chipSize = L.vertical ? 30 : 24;
  const chipsY = L.vertical ? L.H * 0.67 : L.H * 0.78;
  const chips = [
    { t: "Organização de processos", i: Icons.flow },
    { t: "Gestão operacional", i: Icons.gauge },
    { t: "Atendimento", i: Icons.chat },
    { t: "Integração entre ferramentas", i: Icons.plug },
  ];

  return (
    <AbsoluteFill style={{ opacity: outV, perspective: 2200 }}>
      <Kinetic lines={[{ text: "SITES QUE" }, { text: "IMPRESSIONAM.", accent: true }]} at={sites} out={sistemas - 0.15} size={head} y={headY} />
      <Kinetic lines={[{ text: "SISTEMAS QUE" }, { text: "SIMPLIFICAM.", accent: true }]} at={sistemas} out={experiencias - 0.1} size={head} y={headY} />
      <Kinetic lines={[{ text: "E CONECTAM" }, { text: "CLIENTES.", accent: true }]} at={conectam - 0.25} out={out} size={head} y={headY} />

      {lapOpacity > 0.01 ? (
        <Laptop w={lapW} style={{ left: lapX, top: lapY, opacity: lapOpacity, transform: `scale(${lapScale}) rotateY(${lapRot}deg) rotateX(${6 - 4 * lapIn}deg)` }}>
          <ScrollShot {...DESK_SCROLL} w={lapW * 0.96} h={lapW * 0.625} scroll={prog(t, a + 0.4, experiencias + 2.5, inOut)} />
        </Laptop>
      ) : null}

      {sysV > 0 ? (
        <Glass radius={26} glow={C.violet} style={{ left: L.W / 2 - sysW / 2, top: (L.vertical ? L.H * 0.33 : L.H * 0.27) + (1 - sysV) * 60, width: sysW, height: sysH, opacity: sysV, transform: `scale(${0.9 + 0.1 * sysV}) rotateX(${(1 - sysV) * 12}deg)` }}>
          <div style={{ height: 44, display: "flex", alignItems: "center", gap: 10, paddingLeft: 20, background: "rgba(4,5,26,0.85)", fontFamily: BODY, fontSize: 18, color: C.muted }}>
            <span style={{ width: 12, height: 12, borderRadius: 9, background: "#ff5f57" }} />
            <span style={{ width: 12, height: 12, borderRadius: 9, background: "#febc2e" }} />
            <span style={{ width: 12, height: 12, borderRadius: 9, background: "#28c840" }} />
            <span style={{ marginLeft: 16 }}>CRM Farmácia Preço Bom — Dashboard</span>
          </div>
          <ScrollShot src={CRM_DESK.src} srcWidth={CRM_DESK.srcWidth} srcHeight={CRM_DESK.srcHeight} w={sysW} h={sysH - 44} scroll={0} />
        </Glass>
      ) : null}
      {chips.map((c, i) => {
        const col = L.vertical ? 0 : i % 2;
        const row = L.vertical ? i : Math.floor(i / 2);
        const style: React.CSSProperties = L.vertical
          ? { left: L.W / 2, top: chipsY + row * (chipSize * 2.55), transform: "translateX(-50%)" }
          : { left: col === 0 ? L.W * 0.27 : L.W * 0.53, top: chipsY + row * (chipSize * 2.6) };
        return (
          <div key={c.t} style={{ position: "absolute", ...style }}>
            <Chip text={c.t} icon={c.i(chipSize * 1.1)} at={sistemas + 0.35 + i * 0.22} out={experiencias} size={chipSize} style={{ position: "relative" }} color={i % 2 ? C.violet : C.cyan} />
          </div>
        );
      })}

      {phV > 0 ? (
        <Phone w={phW} style={{ left: L.vertical ? L.W / 2 + 40 : L.W * 0.62, top: (L.vertical ? L.H * 0.44 : L.H * 0.3) + (1 - phV) * 200, opacity: phV, transform: `rotateY(${lerp(-24, -8, cine(prog(t, experiencias, out)))}deg) rotateZ(${(1 - phV) * 6}deg)` }}>
          <ScrollShot {...MOB_SCROLL} w={phW * 0.92} h={phW * 0.92 * 2.16} scroll={prog(t, experiencias + 0.4, out, inOut)} />
        </Phone>
      ) : null}
      {phV > 0 ? (
        <Chip text="Mesmo projeto, 100% responsivo" icon={Icons.check(chipSize)} at={conectam + 0.3} out={out} size={chipSize} color={C.cyan} style={{ left: L.vertical ? L.safe.side + 10 : L.W * 0.14, top: L.vertical ? L.H * 0.74 : L.H * 0.9 }} />
      ) : null}
    </AbsoluteFill>
  );
};

// ---------------- CENA 5 — Inteligência artificial ----------------
export const SceneAI: React.FC<{ a: number; ia: number; automacoes: number; benefits: [number, number, number]; out: number }> = ({ a, ia, automacoes, benefits, out }) => {
  const L = useLayout();
  const t = L.t;
  if (t < a - 0.2 || t > out + 0.1) return null;
  const v = 1 - prog(t, out - 0.5, out, inOut);
  const cx = L.W / 2;
  const cy = L.vertical ? L.H * 0.46 : L.H * 0.5;
  const r = L.vertical ? 250 : 210;
  const s = L.vertical ? 1 : 0.9;

  // Solicitação do cliente → circuito → IA → saídas
  const inCard = { x: L.vertical ? L.safe.side + 10 : L.W * 0.05, y: L.vertical ? L.safe.top + 205 : cy - 70, w: L.vertical ? 640 : 470 };
  const outs = [
    { label: "Atendimento", icon: Icons.chat, at: automacoes - 0.6 },
    { label: "CRM", icon: Icons.crm, at: automacoes - 0.2 },
    { label: "Automações", icon: Icons.bolt, at: automacoes + 0.25 },
  ].map((o, i) => ({
    ...o,
    x: L.vertical ? L.W * (0.17 + i * 0.33) : L.W * 0.8,
    y: L.vertical ? cy + r + 110 : cy - 170 + i * 170,
  }));
  const reqK = prog(t, a + 0.15, a + 0.7);
  const flowIn = prog(t, ia - 0.1, ia + 0.9, inOut);
  const startX = inCard.x + (L.vertical ? inCard.w * 0.5 : inCard.w);
  const startY = L.vertical ? inCard.y + 150 : inCard.y + 75;
  const inPath = L.vertical
    ? `M ${startX} ${startY} C ${startX} ${startY + 120}, ${cx} ${cy - r - 140}, ${cx} ${cy - r * 0.55}`
    : `M ${startX} ${startY} C ${startX + 160} ${startY}, ${cx - r - 160} ${cy}, ${cx - r * 0.55} ${cy}`;
  const outPath = (o: (typeof outs)[number]) =>
    L.vertical ? `M ${cx} ${cy + r * 0.55} C ${cx} ${cy + r + 40}, ${o.x} ${o.y - 140}, ${o.x} ${o.y - 34}` : `M ${cx + r * 0.55} ${cy} C ${cx + r + 120} ${cy}, ${o.x - 220} ${o.y}, ${o.x - 140} ${o.y}`;

  const benefitY = L.vertical ? cy + r + 210 : L.H * 0.86;
  const benefitTexts = ["Organização", "Agilidade", "Liberdade para crescer"];

  return (
    <AbsoluteFill style={{ opacity: v }}>
      <Kinetic lines={[{ text: "INTELIGÊNCIA" }, { text: "ARTIFICIAL.", accent: true }]} at={ia} out={automacoes - 0.05} size={L.vertical ? 84 : 72} y={L.vertical ? L.safe.top - 20 : L.H * 0.06} />
      <Kinetic lines={[{ text: "AUTOMAÇÕES" }, { text: "INTELIGENTES.", accent: true }]} at={automacoes} out={out} size={L.vertical ? 84 : 72} y={L.vertical ? L.safe.top - 20 : L.H * 0.06} />

      <svg width={L.W} height={L.H} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <linearGradient id="g" x1="0" x2="1">
            <stop offset="0" stopColor={C.cyan} />
            <stop offset="1" stopColor={C.violet} />
          </linearGradient>
        </defs>
        <path d={inPath} stroke="url(#g)" strokeWidth={4 * s} fill="none" strokeDasharray="1400" strokeDashoffset={1400 * (1 - flowIn)} opacity={0.9} style={{ filter: `drop-shadow(0 0 10px ${C.cyan})` }} />
        {outs.map((o, i) => {
          const k = prog(t, o.at - 0.3, o.at + 0.4, inOut);
          return <path key={i} d={outPath(o)} stroke="url(#g)" strokeWidth={4 * s} fill="none" strokeDasharray="1400" strokeDashoffset={1400 * (1 - k)} opacity={0.9} style={{ filter: `drop-shadow(0 0 10px ${C.violet})` }} />;
        })}
        {/* pacote de dados percorrendo o circuito */}
        {flowIn > 0 && flowIn < 1 ? <circle r={9 * s} fill="#fff" style={{ offsetPath: `path('${inPath}')`, offsetDistance: `${flowIn * 100}%`, filter: `drop-shadow(0 0 14px ${C.cyan})` } as React.CSSProperties} /> : null}
      </svg>

      <div style={{ position: "absolute", left: inCard.x, top: inCard.y, width: inCard.w, opacity: reqK, transform: `translateY(${(1 - reqK) * 30}px)` }}>
        <div style={{ fontFamily: BODY, fontWeight: 600, fontSize: L.vertical ? 24 : 20, letterSpacing: "0.22em", color: C.cyan, marginBottom: 12 }}>SOLICITAÇÃO DO CLIENTE</div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 16, padding: L.vertical ? "22px 28px" : "18px 22px", borderRadius: 26, borderTopLeftRadius: 6, background: "rgba(17,24,66,0.85)", border: `1.5px solid ${C.cyan}66`, boxShadow: `0 0 50px ${C.cyan}33`, fontFamily: BODY, fontSize: L.vertical ? 34 : 28, color: C.text, whiteSpace: "nowrap" }}>
          <span style={{ color: C.cyan, display: "flex" }}>{Icons.chat(L.vertical ? 36 : 30)}</span>
          Olá! Vocês fazem entrega hoje?
        </div>
        <div style={{ fontFamily: BODY, fontSize: L.vertical ? 20 : 16, color: C.muted, marginTop: 10, opacity: 0.85 }}>simulação ilustrativa</div>
      </div>

      {outs.map((o, i) => {
        const k = prog(t, o.at, o.at + 0.45);
        return (
          <div key={o.label} style={{ position: "absolute", left: o.x, top: o.y, transform: `translate(-50%, -50%) scale(${0.85 + 0.15 * k})`, opacity: k }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: L.vertical ? "18px 24px" : "16px 22px", borderRadius: 20, background: "rgba(17,24,66,0.88)", border: `1.5px solid ${(i % 2 ? C.violet : C.cyan)}88`, boxShadow: `0 0 40px ${(i % 2 ? C.violet : C.cyan)}44`, fontFamily: DISPLAY, fontWeight: 700, fontSize: L.vertical ? 30 : 28, color: C.text, whiteSpace: "nowrap" }}>
              <span style={{ display: "flex", color: i % 2 ? C.violet : C.cyan }}>{o.icon(L.vertical ? 34 : 30)}</span>
              {o.label}
            </div>
          </div>
        );
      })}

      {benefitTexts.map((b, i) => {
        const w = L.vertical ? [270, 230, 420][i] : [250, 215, 390][i];
        const xs = L.vertical ? [L.safe.side, L.safe.side + 245, L.safe.side + 455] : [L.W * 0.26, L.W * 0.42, L.W * 0.555];
        const ys = [benefitY, benefitY, benefitY];
        return <Chip key={b} text={b} icon={Icons.check(L.vertical ? 26 : 24)} at={benefits[i]} out={out} size={L.vertical ? 26 : 24} color={i === 1 ? C.violet : C.cyan} style={{ left: xs[i], top: ys[i], minWidth: w * 0 }} />;
      })}
    </AbsoluteFill>
  );
};

// ---------------- CENA 6 — Projetos reais (showroom) ----------------
export const SceneShowroom: React.FC<{ a: number; enters: [number, number, number]; out: number; dissolve: number }> = ({ a, enters, out, dissolve }) => {
  const L = useLayout();
  const t = L.t;
  if (t < a - 0.2 || t > dissolve + 0.1) return null;
  const drift = interpolate(t, [a, out], [10, -6]);
  const diss = prog(t, out, dissolve, inOut); // telas viram pontos de luz
  const item = (k: number) => ({ opacity: k * (1 - diss), filter: `blur(${(1 - k) * 12 + diss * 18}px)` });
  const k1 = prog(t, enters[0], enters[0] + 0.8);
  const k2 = prog(t, enters[1], enters[1] + 0.8);
  const k3 = prog(t, enters[2], enters[2] + 0.8);
  const shrink = 1 - diss * 0.75;

  const label = (text: string, k: number, style: React.CSSProperties) => (
    <div style={{ position: "absolute", fontFamily: BODY, fontWeight: 600, fontSize: L.vertical ? 26 : 22, color: C.text, opacity: k * (1 - diss), display: "flex", alignItems: "center", gap: 10, whiteSpace: "nowrap", ...style }}>
      <span style={{ width: 10, height: 10, borderRadius: 9, background: C.cyan, boxShadow: `0 0 14px ${C.cyan}` }} />
      {text}
    </div>
  );

  const deskW = L.vertical ? 880 : 1000;
  const deskH = deskW * 0.625;
  const crmW = L.vertical ? 520 : 560;
  const crmH = crmW * (832 / 1424);
  const phW = L.vertical ? 260 : 250;

  const desk = L.vertical ? { x: L.W / 2 - deskW / 2, y: 490 } : { x: L.W * 0.1, y: L.H * 0.24 };
  const crm = L.vertical ? { x: L.safe.side, y: 1095 } : { x: L.W * 0.57, y: L.H * 0.58 };
  const ph = L.vertical ? { x: L.W - L.safe.side - phW, y: 890 } : { x: L.W * 0.75, y: L.H * 0.2 };

  return (
    <AbsoluteFill style={{ perspective: 2400 }}>
      <Kinetic lines={[{ text: "TECNOLOGIA APLICADA" }, { text: "A NEGÓCIOS REAIS.", accent: true }]} at={enters[0] - 0.1} out={out + 0.25} size={L.vertical ? 74 : 66} y={L.vertical ? L.safe.top - 30 : L.H * 0.04} />
      <AbsoluteFill style={{ transformStyle: "preserve-3d", transform: `rotateY(${drift}deg) scale(${shrink})` }}>
        <Glass radius={22} style={{ left: desk.x, top: desk.y + (1 - k1) * 80, width: deskW, height: deskH, transform: `translateZ(${(1 - k1) * -400}px)`, ...item(k1) }}>
          <ScrollShot {...DESK_SCROLL} w={deskW} h={deskH} scroll={prog(t, enters[0], out, inOut) * 0.6} />
        </Glass>
        {label("Farmácia Preço Bom — site", k1, { left: desk.x + 8, top: desk.y + deskH + 18 })}

        <Glass radius={20} glow={C.violet} style={{ left: crm.x, top: crm.y + (1 - k3) * 80, width: crmW, height: crmH, transform: `translateZ(${(1 - k3) * -400 + 120}px)`, ...item(k3) }}>
          <ScrollShot src={CRM_CHAT.src} srcWidth={CRM_CHAT.srcWidth} srcHeight={CRM_CHAT.srcHeight} w={crmW} h={crmH} scroll={0} />
        </Glass>
        {label("CRM Farmácia Preço Bom — chat ao vivo", k3, { left: crm.x + 8, top: crm.y + crmH + 16 })}

        <Phone w={phW} style={{ left: ph.x, top: ph.y + (1 - k2) * 80, transform: `translateZ(${(1 - k2) * -400 + 220}px) rotateY(-10deg)`, ...item(k2) }}>
          <ScrollShot {...MOB_SCROLL} w={phW * 0.92} h={phW * 0.92 * 2.16} scroll={prog(t, enters[1], out, inOut) * 0.5} />
        </Phone>
        {label("Versão mobile", k2, L.vertical ? { left: ph.x + 30, top: ph.y + phW * 2.06 + 14 } : { left: ph.x + 30, top: ph.y + phW * 2.06 + 14 })}
      </AbsoluteFill>
      <div style={{ position: "absolute", left: 0, width: L.W, top: L.vertical ? 400 : L.H * 0.95, textAlign: "center", fontFamily: BODY, fontSize: L.vertical ? 24 : 20, letterSpacing: "0.12em", color: C.muted, opacity: prog(t, enters[2] + 0.3, enters[2] + 0.9) * (1 - diss) }}>
        PORTFÓLIO TAMBÉM INCLUI FLYCONTROL · ROBSON LOPES CABELEIREIRO{L.vertical ? <br /> : " · "}TG BATERIAS · BARBER CONNECTION
      </div>
    </AbsoluteFill>
  );
};

// ---------------- CENA 7 — Conecte. Automatize. Evolua. ----------------
export const SceneSignature: React.FC<{ brand: number; words: [number, number, number]; out: number }> = ({ brand, words, out }) => {
  const L = useLayout();
  const t = L.t;
  if (t < brand - 0.3 || t > out + 0.1) return null;
  const big = L.vertical ? 150 : 170;
  const bv = win(t, brand - 0.05, words[0] - 0.05, 0.35, 0.3);
  const list: [string, number, number, boolean][] = [
    ["CONECTE.", words[0], words[1], false],
    ["AUTOMATIZE.", words[1], words[2], false],
    ["EVOLUA.", words[2], out, true],
  ];
  return (
    <AbsoluteFill>
      {bv > 0 ? (
        <div style={{ position: "absolute", top: L.H / 2 - big * 0.62, width: L.W, display: "flex", justifyContent: "center", opacity: bv, transform: `scale(${1.12 - 0.12 * bv})`, filter: `blur(${(1 - bv) * 12}px)` }}>
          <Wordmark size={big * 0.95} />
        </div>
      ) : null}
      {list.map(([w, a, b, accent]) => {
        const k = prog(t, a - 0.04, a + 0.35);
        const o = prog(t, b - 0.12, b + 0.12, inOut);
        if (k <= 0 || o >= 1) return null;
        const size = L.vertical ? (w.length > 9 ? 112 : 150) : 170;
        return (
          <div key={w} style={{ position: "absolute", top: L.H / 2 - size * 0.6, width: L.W, textAlign: "center", fontFamily: DISPLAY, fontWeight: 800, fontSize: size, letterSpacing: "-0.02em", opacity: k * (1 - o), transform: `scale(${lerp(1.25, 1, cine(k)) * (1 + o * 0.15)})`, filter: `blur(${(1 - k) * 18 + o * 14}px)`, ...(accent ? { backgroundImage: BRAND_GRADIENT, WebkitBackgroundClip: "text", color: "transparent" } : { color: C.text, textShadow: `0 0 60px ${C.indigo}aa` }) }}>
            {w}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

// ---------------- CENA 8 — Assinatura final + CTA ----------------
export const SceneEnd: React.FC<{ crisp: number; tagline: number; headline: number; cta: number; sheen: number }> = ({ crisp, tagline, headline, cta, sheen }) => {
  const L = useLayout();
  const t = L.t;
  if (t < crisp - 0.4) return null;
  // tamanho casado com as partículas 3D que formaram a palavra (ver Universe.LogoParticles)
  const F = L.vertical ? 127 : 179;
  const k = prog(t, crisp - 0.2, crisp + 0.7);
  const sh = prog(t, sheen, sheen + 0.9, inOut);
  const lift = 0; // o wordmark nítido assume exatamente o lugar das partículas
  const ctaK = prog(t, cta, cta + 0.6);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", top: L.H / 2 - F * 0.56 - lift, width: L.W, display: "flex", justifyContent: "center", opacity: k }}>
        <div style={{ position: "relative" }}>
          <Wordmark size={F} glow={1 + Math.sin(sh * Math.PI) * 0.8} />
          <div style={{ position: "absolute", inset: 0, background: `linear-gradient(105deg, rgba(255,255,255,0) ${sh * 140 - 40}%, rgba(255,255,255,0.75) ${sh * 140 - 20}%, rgba(255,255,255,0) ${sh * 140}%)`, mixBlendMode: "overlay", WebkitMaskImage: "linear-gradient(#000,#000)", opacity: sh > 0 && sh < 1 ? 1 : 0 }} />
        </div>
      </div>
      <Kicker text="SITES • SISTEMAS • AUTOMAÇÕES COM IA" at={tagline} y={L.H / 2 + F * 0.62 - lift + 6} size={L.vertical ? 30 : 30} />
      <Kinetic lines={L.vertical ? [{ text: "SEU PRÓXIMO PROJETO" }, { text: "COMEÇA AQUI.", accent: true }] : [{ text: "SEU PRÓXIMO PROJETO COMEÇA AQUI.", accent: false }]} at={headline} size={L.vertical ? 70 : 62} y={L.H / 2 + F * 0.62 - lift + (L.vertical ? 90 : 80)} stagger={0.06} />
      {ctaK > 0 ? (
        <div style={{ position: "absolute", width: L.W, top: L.vertical ? L.H - L.safe.bottom - 170 : L.H * 0.79, display: "flex", flexDirection: "column", alignItems: "center", gap: 18, opacity: ctaK, transform: `translateY(${(1 - ctaK) * 30}px)` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, padding: L.vertical ? "28px 52px" : "24px 46px", borderRadius: 999, backgroundImage: BRAND_GRADIENT, boxShadow: `0 0 ${60 + 30 * Math.sin(t * 5)}px ${C.violet}aa`, fontFamily: DISPLAY, fontWeight: 800, fontSize: L.vertical ? 40 : 36, color: "#fff", letterSpacing: "0.02em" }}>
            {CTA.headline}.<span style={{ display: "flex" }}>{Icons.arrow(L.vertical ? 40 : 36)}</span>
          </div>
          <div style={{ fontFamily: BODY, fontWeight: 500, fontSize: L.vertical ? 28 : 26, color: C.muted }}>{CTA.url_display}</div>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

// ---------------- Corte 15 s — montagem rápida de serviços ----------------
export const SceneMontage: React.FC<{ a: number; b: number }> = ({ a, b }) => {
  const L = useLayout();
  const t = L.t;
  if (t < a - 0.1 || t > b + 0.1) return null;
  const seg = (b - a) / 3;
  const parts = [
    { word: "SITES", k: win(t, a, a + seg + 0.05, 0.18, 0.15) },
    { word: "SISTEMAS", k: win(t, a + seg, a + 2 * seg + 0.05, 0.18, 0.15) },
    { word: "INTELIGÊNCIA ARTIFICIAL", k: win(t, a + 2 * seg, b, 0.18, 0.2) },
  ];
  const lapW = L.vertical ? 880 : 1000;
  const crmW = L.vertical ? 860 : 900;
  return (
    <AbsoluteFill style={{ perspective: 2000 }}>
      {parts[0].k > 0 ? (
        <Laptop w={lapW} style={{ left: L.W / 2 - lapW / 2, top: L.vertical ? L.H * 0.38 : L.H * 0.3, opacity: parts[0].k, transform: `scale(${0.9 + 0.12 * prog(t, a, a + seg)}) rotateY(${lerp(16, -8, prog(t, a, a + seg))}deg)` }}>
          <ScrollShot {...DESK_SCROLL} w={lapW * 0.96} h={lapW * 0.625} scroll={prog(t, a, a + seg) * 0.3} />
        </Laptop>
      ) : null}
      {parts[1].k > 0 ? (
        <Glass radius={24} glow={C.violet} style={{ left: L.W / 2 - crmW / 2, top: L.vertical ? L.H * 0.38 : L.H * 0.3, width: crmW, height: crmW * (832 / 1424), opacity: parts[1].k, transform: `scale(${0.92 + 0.1 * prog(t, a + seg, a + 2 * seg)})` }}>
          <ScrollShot src={CRM_DESK.src} srcWidth={CRM_DESK.srcWidth} srcHeight={CRM_DESK.srcHeight} w={crmW} h={crmW * (832 / 1424)} scroll={0} />
        </Glass>
      ) : null}
      {parts.map((p, i) =>
        p.k > 0 ? (
          <div key={p.word} style={{ position: "absolute", top: L.vertical ? L.safe.top + 40 : L.H * 0.1, width: L.W, textAlign: "center", fontFamily: DISPLAY, fontWeight: 800, fontSize: L.vertical ? (i === 2 ? 82 : 120) : 110, letterSpacing: "-0.01em", opacity: p.k, transform: `scale(${1.1 - 0.1 * p.k})`, ...(i === 2 ? { backgroundImage: BRAND_GRADIENT, WebkitBackgroundClip: "text", color: "transparent" } : { color: C.text }) }}>
            {i === 2 && L.vertical ? (
              <>
                INTELIGÊNCIA
                <br />
                ARTIFICIAL
              </>
            ) : (
              p.word
            )}
          </div>
        ) : null,
      )}
    </AbsoluteFill>
  );
};
