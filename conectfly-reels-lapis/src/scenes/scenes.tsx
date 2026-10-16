import React, { useLayoutEffect, useRef, useState } from "react";
import { continueRender, delayRender, Img, staticFile } from "remotion";
import { Browser, BODY, CX, DISPLAY, Headline, inOut, lerp, Phone, prog, SAFE, SAFE_W, Scroll, Sub, Tag, useT, win, Wordmark } from "../components/kit";
import { ACCENT, MUTED, PAPER, WHATSAPP } from "../theme/brand";

const DESK = { src: "captures/farmacia_site_desktop_scroll.jpg", srcW: 1920, srcH: 3600, contentH: 1750 };
const MOB = { src: "captures/farmacia_site_mobile_scroll.jpg", srcW: 780, srcH: 5200, contentH: 2600 };
const SHOT = (name: string) => ({ src: `captures/${name}.png`, srcW: 1424, srcH: 832 });

// ======================= 03 · REVELAÇÃO: "7" =======================
/** O "7" nasce no ponto onde as pontas se tocaram (match cut) e se reorganiza dentro da frase. */
export const SceneSeven: React.FC<{ a: number; out: number }> = ({ a, out }) => {
  const t = useT();
  const ref = useRef<HTMLSpanElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [handle] = useState(() => delayRender("medir o 7"));
  useLayoutEffect(() => {
    document.fonts.ready.then(() => {
      const r = ref.current!.getBoundingClientRect();
      const p = root.current!.getBoundingClientRect(); // coordenadas relativas ao quadro inteiro
      setPos({ x: r.left - p.left + r.width / 2, y: r.top - p.top + r.height / 2, w: r.width, h: r.height });
      continueRender(handle);
    });
  }, [handle]);
  // o layout fica sempre montado (invisível fora da janela) para a medição do "7" existir desde o início
  const v = t < a - 0.1 ? 0 : 1 - prog(t, out - 0.3, out, inOut);
  const grow = prog(t, a, a + 0.45); // nasce minúsculo na ponta e cresce
  const settle = prog(t, a + 0.95, a + 1.6, inOut); // reorganiza na frase
  const size = 92;
  const bigScale = 8.5;
  const s = lerp(lerp(0.05, bigScale, grow), 1, settle);
  const cx = pos ? lerp(540, pos.x, settle) : 540;
  const cy = pos ? lerp(960, pos.y, settle) : 960;
  const words = prog(t, a + 1.25, a + 1.85);
  const line = (txt: string, k: number) => <span style={{ opacity: k, filter: `blur(${(1 - k) * 10}px)` }}>{txt}</span>;
  return (
    <div ref={root} style={{ position: "absolute", inset: 0, opacity: v, visibility: v > 0 ? "visible" : "hidden" }}>
      <div style={{ position: "absolute", top: 700, left: SAFE.left, width: SAFE_W, textAlign: "center", fontFamily: DISPLAY, fontWeight: 800, fontSize: size, lineHeight: 1.12, color: PAPER, letterSpacing: "-0.015em" }}>
        <div>{line("Você esperou", words)}</div>
        <div>
          <span ref={ref} style={{ opacity: 0 }}>7</span>
          {line(" segundos", words)}
        </div>
        <div>{line("por isso.", prog(t, a + 1.45, a + 2.05))}</div>
      </div>
      <div style={{ position: "absolute", left: cx, top: cy, transform: `translate(-50%, -50%) scale(${s})`, fontFamily: DISPLAY, fontWeight: 800, fontSize: size, lineHeight: 1, color: ACCENT, textShadow: `0 0 ${30 + 40 * (1 - settle)}px ${ACCENT}aa`, opacity: Math.min(1, grow * 3) }}>7</div>
      {/* cronômetro discreto */}
      <div style={{ position: "absolute", top: 1100, left: SAFE.left, width: SAFE_W, textAlign: "center", fontFamily: BODY, fontWeight: 500, fontSize: 30, letterSpacing: "0.3em", color: MUTED, opacity: prog(t, a + 1.8, a + 2.3) }}>
        00:00:07
      </div>
    </div>
  );
};

// ======================= 04 · VIRADA COMERCIAL =======================
const Cursor: React.FC<{ x: number; y: number; click: number }> = ({ x, y, click }) => (
  <div style={{ position: "absolute", left: x, top: y }}>
    {click > 0 && click < 1 ? <div style={{ position: "absolute", left: -40 * click, top: -40 * click, width: 80 * click, height: 80 * click, borderRadius: 99, border: `3px solid ${ACCENT}`, opacity: 1 - click }} /> : null}
    <svg width="44" height="56" viewBox="0 0 22 28" style={{ filter: `drop-shadow(0 0 10px ${ACCENT})` }}>
      <path d="M2 2 L2 22 L7.5 17 L11 26 L14.5 24.5 L11 15.8 L18.5 15.8 Z" fill="#fff" stroke="#000" strokeWidth="1.2" />
    </svg>
  </div>
);

export const SceneSlowSite: React.FC<{ a: number; q1: number; q2: number; reveal: number; out: number }> = ({ a, q1, q2, reveal, out }) => {
  const t = useT();
  const v = win(t, a, out, 0.35, 0.25);
  if (v <= 0) return null;
  const bw = 880, bh = 800, bx = CX - bw / 2, by = 560;
  const spin = (t * 360 * 0.6) % 360;
  const pct = Math.round(lerp(12, 31, prog(t, a, reveal, (x) => x)));
  const shimmer = (t * 0.8) % 1;
  // cursor: vaga pela página lenta, clica, depois aponta o resultado
  const cx = lerp(lerp(620, 300, prog(t, a + 0.2, q2 - 0.2, inOut)), 560, prog(t, q2 - 0.1, reveal - 0.2, inOut));
  const cy = lerp(lerp(520, 300, prog(t, a + 0.2, q2 - 0.2, inOut)), 640, prog(t, q2 - 0.1, reveal - 0.2, inOut));
  const click = prog(t, reveal - 0.25, reveal + 0.2, (x) => x);
  const rv = prog(t, reveal, reveal + 0.55, inOut); // revelação circular a partir do cursor
  const pushIn = 1 + 0.05 * prog(t, a, out, (x) => x);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: v }}>
      <Headline text="E seu cliente?" at={q1} out={out} y={SAFE.top + 20} size={88} />
      <Headline text="Esperaria tanto?" at={q2} out={out} y={SAFE.top + 125} size={88} accentWords={["tanto"]} />
      <div style={{ position: "absolute", inset: 0, transform: `scale(${pushIn})`, transformOrigin: `${CX}px 1000px` }}>
        <Browser w={bw} h={bh} url={rv > 0.5 ? "Farmácia Preço Bom — site ConectFly" : "seunegocio.com.br"} style={{ left: bx, top: by }}>
          {/* página lenta e pouco atrativa (genérica, ilustrativa) */}
          <div style={{ position: "absolute", inset: 0, background: "#e9e9e6", fontFamily: "Georgia, serif", color: "#666" }}>
            <div style={{ height: 90, background: "#c9c9c4", display: "flex", alignItems: "center", paddingLeft: 30, fontSize: 30 }}>Minha Empresa</div>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{ margin: "28px 30px", height: i === 0 ? 220 : 110, borderRadius: 6, background: `linear-gradient(90deg, #d6d6d2 ${shimmer * 100 - 30}%, #e4e4e0 ${shimmer * 100}%, #d6d6d2 ${shimmer * 100 + 30}%)` }} />
            ))}
            <div style={{ position: "absolute", left: 0, right: 0, top: 560, display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
              <div style={{ width: 70, height: 70, borderRadius: 99, border: "8px solid #c4c4c0", borderTopColor: "#8a8a86", transform: `rotate(${spin}deg)` }} />
              <div style={{ fontSize: 30 }}>Carregando... {pct}%</div>
              <div style={{ width: 420, height: 12, borderRadius: 6, background: "#d0d0cc" }}>
                <div style={{ width: `${pct}%`, height: 12, borderRadius: 6, background: "#9c9c98" }} />
              </div>
            </div>
          </div>
          {/* interface premium (site real) revelada a partir do clique */}
          <div style={{ position: "absolute", inset: 0, clipPath: `circle(${rv * 140}% at ${((cx - bx) / bw) * 100}% ${((cy - by) / bh) * 100}%)` }}>
            <Scroll {...DESK} w={bw} h={bh} k={0.02 + 0.1 * prog(t, reveal, out)} />
          </div>
        </Browser>
        {t < reveal + 0.6 ? <Cursor x={cx} y={cy} click={click} /> : null}
      </div>
    </div>
  );
};

// ======================= 05 · SITES =======================
export const SceneSites: React.FC<{ a: number; cut1: number; cut2: number; out: number }> = ({ a, cut1, cut2, out }) => {
  const t = useT();
  const v = win(t, a, out, 0.25, 0.3);
  if (v <= 0) return null;
  // take 1: notebook em perspectiva com rolagem (speed ramp no scroll)
  const k1 = win(t, a, cut1 + 0.25, 0.3, 0.3);
  const lapW = 900;
  const rot = lerp(16, -5, prog(t, a, cut1, inOut));
  // take 2: celular herói, desktop desfocado atrás (parallax)
  const k2 = win(t, cut1, out, 0.3, 0.3);
  const ph = 420;
  const zoomCTA = prog(t, cut2, cut2 + 0.9, inOut);
  const ring = prog(t, cut2 + 0.6, cut2 + 1.3, (x) => x);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: v, perspective: 2200 }}>
      <Headline text="SITES QUE IMPRESSIONAM" at={a + 0.15} out={out} y={SAFE.top + 10} size={84} accentWords={["IMPRESSIONAM"]} />
      <Sub text="Presença digital pensada para converter" at={a + 0.9} out={out} y={SAFE.top + 215} />
      {k1 > 0 ? (
        <div style={{ position: "absolute", left: CX - lapW / 2, top: 640, opacity: k1, transform: `rotateY(${rot}deg) scale(${lerp(0.9, 1.02, prog(t, a, cut1))})`, transformStyle: "preserve-3d" }}>
          <Browser w={lapW} h={600} url="Farmácia Preço Bom — site ConectFly">
            <Scroll {...DESK} w={lapW} h={560} k={prog(t, a + 0.2, cut1 + 0.2, inOut) * 0.7} />
          </Browser>
        </div>
      ) : null}
      {k2 > 0 ? (
        <>
          <div style={{ position: "absolute", left: CX - 480, top: 700, width: 960, opacity: 0.35 * k2, filter: "blur(10px)", transform: `translateX(${lerp(60, -40, prog(t, cut1, out))}px) scale(1.05)` }}>
            <Scroll {...DESK} w={960} h={560} k={0.3} />
          </div>
          <Phone w={ph} style={{ left: CX - ph / 2, top: 600, opacity: k2, transform: `translateY(${(1 - prog(t, cut1, cut1 + 0.5)) * 120}px) rotateY(${lerp(-14, 6, prog(t, cut1, out))}deg)` }}>
            <div style={{ position: "absolute", inset: 0, transform: `scale(${1 + 0.38 * zoomCTA})`, transformOrigin: "50% 61%" }}>
              <Scroll {...MOB} w={ph * 0.93} h={ph * 0.93 * 2.16} k={prog(t, cut1 + 0.1, cut2, inOut) * 0.35 * (1 - zoomCTA)} />
            </div>
            {ring > 0 && ring < 1 ? <div style={{ position: "absolute", left: "50%", top: "61%", width: ph * 0.95 * (0.9 + 0.3 * ring), height: 90 * (0.9 + 0.3 * ring), transform: "translate(-50%,-50%)", borderRadius: 99, border: `4px solid ${ACCENT}`, opacity: 1 - ring, boxShadow: `0 0 30px ${ACCENT}` }} /> : null}
          </Phone>
        </>
      ) : null}
    </div>
  );
};

// ======================= 06 · SISTEMAS =======================
const AppWin: React.FC<{ shot: ReturnType<typeof SHOT>; w: number; title: string; zoom: number; origin: string; style?: React.CSSProperties }> = ({ shot, w, title, zoom, origin, style }) => {
  const h = w * (shot.srcH / shot.srcW);
  return (
    <Browser w={w} h={h + Math.round(w * 0.045)} url={title} style={style}>
      <div style={{ width: w, height: h, transform: `scale(${zoom})`, transformOrigin: origin }}>
        <Img src={staticFile(shot.src)} style={{ width: w, height: h }} />
      </div>
    </Browser>
  );
};

export const SceneSystems: React.FC<{ a: number; cut: number; out: number }> = ({ a, cut, out }) => {
  const t = useT();
  const v = win(t, a, out, 0.25, 0.3);
  if (v <= 0) return null;
  const morph = prog(t, a, a + 0.7, inOut); // site → dashboard
  const k1 = 1 - prog(t, cut - 0.15, cut + 0.25, inOut);
  const k2 = prog(t, cut - 0.15, cut + 0.35);
  const w = 900;
  const scan = prog(t, a + 0.1, a + 0.9, (x) => x);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: v }}>
      <Headline text="SISTEMAS SOB MEDIDA" at={a + 0.1} out={out} y={SAFE.top + 10} size={84} accentWords={["SOB", "MEDIDA"]} />
      <Sub text="Tecnologia para sua operação" at={a + 0.8} out={out} y={SAFE.top + 215} />
      {k1 > 0 ? (
        <div style={{ position: "absolute", inset: 0, opacity: k1 }}>
          {/* o site se dissolve em grade e vira o dashboard */}
          <div style={{ position: "absolute", left: CX - w / 2, top: 640, opacity: 1 - morph, filter: `blur(${morph * 14}px)`, transform: `scale(${1 + morph * 0.1})` }}>
            <Browser w={w} h={560} url="">
              <Scroll {...DESK} w={w} h={520} k={0.3} />
            </Browser>
          </div>
          <div style={{ position: "absolute", left: CX - w / 2, top: 640, opacity: morph, transform: `scale(${lerp(0.92, 1, morph)})` }}>
            <AppWin shot={SHOT("crm_dashboard")} w={w} title="CRM Farmácia Preço Bom — Dashboard" zoom={1 + 0.35 * prog(t, a + 0.6, cut, inOut)} origin="50% 22%" />
          </div>
          {scan > 0 && scan < 1 ? <div style={{ position: "absolute", left: CX - w / 2, width: w, top: 640 + 600 * scan, height: 3, background: ACCENT, boxShadow: `0 0 30px 6px ${ACCENT}` }} /> : null}
        </div>
      ) : null}
      {k2 > 0 ? (
        <div style={{ position: "absolute", left: CX - w / 2, top: 640, opacity: k2, transform: `translateX(${(1 - k2) * 80}px)` }}>
          <AppWin shot={SHOT("crm_pedidos")} w={w} title="CRM Farmácia Preço Bom — Pedidos" zoom={1 + 0.45 * prog(t, cut, out, inOut)} origin="18% 62%" />
        </div>
      ) : null}
      <Tag text="Telas reais · dados de clientes ocultos" at={a + 0.9} out={out} x={CX - 230} y={1230} />
    </div>
  );
};

// ======================= 07 · APLICATIVOS =======================
const SKETCH = [
  "M300 120 h300 q30 0 30 30 v600 q0 30 -30 30 h-300 q-30 0 -30 -30 v-600 q0 -30 30 -30 z", // celular
  "M300 190 h300", // barra
  "M310 230 h280 v120 h-280 z", // card herói
  "M310 380 h130 v110 h-130 z", "M460 380 h130 v110 h-130 z", // cards
  "M310 520 h280 M310 560 h220 M310 600 h250", // lista
  "M350 680 h200 q20 0 20 20 v10 q0 20 -20 20 h-200 q-20 0 -20 -20 v-10 q0 -20 20 -20 z", // botão
];

const ConceptApp: React.FC<{ t: number; w: number; s2: number }> = ({ t, w, s2 }) => {
  const sw = prog(t, s2, s2 + 0.45, inOut);
  const card = (label: string, sub: string, i: number) => (
    <div key={label} style={{ borderRadius: 18, padding: 16, background: i === 0 ? ACCENT : "#141821", color: i === 0 ? "#00131a" : PAPER, fontFamily: BODY, opacity: prog(t, s2 - 0.9 + i * 0.12, s2 - 0.6 + i * 0.12) }}>
      <div style={{ fontWeight: 700, fontSize: 20 }}>{label}</div>
      <div style={{ fontSize: 15, opacity: 0.7, marginTop: 4 }}>{sub}</div>
    </div>
  );
  return (
    <div style={{ position: "absolute", inset: 0, background: "#07090d", overflow: "hidden" }}>
      {/* tela 1: início */}
      <div style={{ position: "absolute", inset: 0, padding: "70px 22px", transform: `translateX(${-sw * 100}%)` }}>
        <div style={{ fontFamily: BODY, fontSize: 16, color: MUTED }}>Bem-vindo de volta</div>
        <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 30, color: PAPER, marginTop: 4 }}>Seu app</div>
        <div style={{ marginTop: 18, height: 150, borderRadius: 22, background: `linear-gradient(135deg, ${ACCENT}, #0b3a47)`, padding: 18, fontFamily: DISPLAY, fontWeight: 700, fontSize: 24, color: "#00131a" }}>Tudo em um toque</div>
        <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {card("Pedidos", "acompanhe", 0)}
          {card("Agenda", "horários", 1)}
          {card("Pagamentos", "Pix e cartão", 2)}
          {card("Mensagens", "atendimento", 3)}
        </div>
      </div>
      {/* tela 2: detalhe com progresso */}
      <div style={{ position: "absolute", inset: 0, padding: "70px 22px", transform: `translateX(${(1 - sw) * 100}%)` }}>
        <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 28, color: PAPER }}>Pedido em andamento</div>
        {["Recebido", "Em preparo", "A caminho"].map((s, i) => {
          const done = prog(t, s2 + 0.3 + i * 0.25, s2 + 0.5 + i * 0.25);
          return (
            <div key={s} style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 26, fontFamily: BODY, fontSize: 20, color: PAPER }}>
              <div style={{ width: 30, height: 30, borderRadius: 99, border: `3px solid ${ACCENT}`, background: done > 0.5 ? ACCENT : "transparent", transform: `scale(${0.8 + 0.2 * done})` }} />
              {s}
            </div>
          );
        })}
        <div style={{ position: "absolute", left: 22, right: 22, bottom: 60, height: 58, borderRadius: 99, background: ACCENT, color: "#00131a", fontFamily: DISPLAY, fontWeight: 700, fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>Acompanhar</div>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 14, display: "flex", justifyContent: "center" }}>
        <div style={{ width: w * 0.32, height: 5, borderRadius: 9, background: "rgba(255,255,255,0.5)" }} />
      </div>
    </div>
  );
};

export const SceneApps: React.FC<{ a: number; lift: number; s2: number; out: number }> = ({ a, lift, s2, out }) => {
  const t = useT();
  const v = win(t, a, out, 0.25, 0.3);
  if (v <= 0) return null;
  const draw = prog(t, a + 0.05, lift, (x) => x);
  const up = prog(t, lift, lift + 0.6, inOut); // a ideia "sai do papel"
  const ph = 410;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: v, perspective: 2000 }}>
      <Headline text="APLICATIVOS" at={a + 0.05} out={out} y={SAFE.top + 10} size={90} accentWords={["APLICATIVOS"]} />
      <Sub text="Sua ideia em movimento" at={a + 0.6} out={out} y={SAFE.top + 125} />
      {/* papel com o rascunho a lápis */}
      <div style={{ position: "absolute", left: CX - 420, top: 520, width: 840, height: 880, borderRadius: 10, background: "radial-gradient(circle at 40% 30%, #f4f1ea, #dcd7cc)", boxShadow: "0 40px 100px rgba(0,0,0,0.8)", transform: `rotateX(${18 + up * 30}deg) rotateZ(-3deg) translateY(${up * 260}px)`, opacity: 1 - up }}>
        <svg width={840} height={880} viewBox="0 0 900 880">
          {SKETCH.map((d, i) => {
            const k = Math.min(1, Math.max(0, draw * SKETCH.length - i));
            return (
              <g key={i}>
                <path d={d} fill="none" stroke="#3a3a3e" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - k} opacity={0.85} />
                <path d={d} fill="none" stroke="#5a5a60" strokeWidth={1.5} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - k} transform="translate(2,1.5)" opacity={0.6} />
              </g>
            );
          })}
        </svg>
      </div>
      {/* o rascunho vira o app no celular */}
      {up > 0 ? (
        <Phone w={ph} style={{ left: CX - ph / 2, top: lerp(700, 520, up), opacity: up, transform: `rotateY(${lerp(-24, -8, prog(t, lift, out))}deg) rotateX(${(1 - up) * 30}deg) scale(${lerp(0.8, 1, up)})` }}>
          <ConceptApp t={t} w={ph} s2={s2} />
        </Phone>
      ) : null}
      <Tag text="Conceito ilustrativo" at={lift + 0.3} out={out} x={CX - 130} y={1386} />
    </div>
  );
};

// ======================= 08 · CRM + IA =======================
export const SceneCrmAI: React.FC<{ a: number; out: number }> = ({ a, out }) => {
  const t = useT();
  const v = win(t, a, out, 0.25, 0.3);
  if (v <= 0) return null;
  const msg = prog(t, a + 0.25, a + 0.6);
  const cls = prog(t, a + 0.85, a + 1.2);
  const ai = prog(t, a + 1.4, a + 1.8);
  const typing = prog(t, a + 1.5, a + 2.4, (x) => x);
  const flow = prog(t, a + 2.1, a + 2.9, inOut);
  const reply = "Entregamos sim! Me passa o seu endereço que eu já calculo o frete.";
  const box = (k: number, extra: React.CSSProperties, children: React.ReactNode) => (
    <div style={{ position: "absolute", left: SAFE.left + 10, width: SAFE_W - 20, opacity: k, transform: `translateY(${(1 - k) * 30}px) scale(${0.96 + 0.04 * k})`, ...extra }}>{children}</div>
  );
  const nodes = ["WhatsApp", "IA", "CRM", "Pedidos"];
  return (
    <div style={{ position: "absolute", inset: 0, opacity: v }}>
      {/* tela real do chat ao vivo (dados de clientes desfocados) ao fundo */}
      <div style={{ position: "absolute", left: CX - 470, top: 560, width: 940, opacity: 0.32, filter: "blur(3px)" }}>
        <Img src={staticFile("captures/crm_chat.png")} style={{ width: 940 }} />
      </div>
      <Headline text="CRM + AUTOMAÇÕES COM IA" at={a + 0.05} out={out} y={SAFE.top + 10} size={74} accentWords={["IA"]} />
      <Sub text="Mais eficiência no atendimento" at={a + 0.7} out={out} y={SAFE.top + 200} />
      {box(msg, { top: 560 }, (
        <div style={{ display: "inline-block", padding: "20px 26px", borderRadius: 26, borderTopLeftRadius: 6, background: "#1c2a24", border: "1px solid #2f5d48", fontFamily: BODY, color: PAPER }}>
          <div style={{ fontSize: 20, color: "#6fdc9c", fontWeight: 600 }}>Cliente · WhatsApp</div>
          <div style={{ fontSize: 34, marginTop: 6 }}>Oi! Vocês entregam hoje?</div>
        </div>
      ))}
      {box(cls, { top: 740 }, (
        <div style={{ display: "inline-flex", gap: 12, alignItems: "center", padding: "12px 22px", borderRadius: 99, border: `1.5px solid ${ACCENT}`, background: "rgba(56,211,238,0.12)", fontFamily: BODY, fontWeight: 600, fontSize: 26, color: PAPER }}>
          <span style={{ width: 12, height: 12, borderRadius: 99, background: ACCENT, boxShadow: `0 0 12px ${ACCENT}` }} />
          IA classificou: Novo pedido · prioridade alta
        </div>
      ))}
      {box(ai, { top: 830 }, (
        <div style={{ padding: "22px 26px", borderRadius: 24, background: "#0f1720", border: `1.5px solid ${ACCENT}88`, boxShadow: `0 0 40px ${ACCENT}33`, fontFamily: BODY, color: PAPER }}>
          <div style={{ fontSize: 20, color: ACCENT, fontWeight: 600, letterSpacing: "0.04em" }}>RESPOSTA SUGERIDA PELA IA</div>
          <div style={{ fontSize: 32, marginTop: 8, lineHeight: 1.3, minHeight: 84 }}>{reply.slice(0, Math.round(reply.length * typing))}</div>
          <div style={{ display: "flex", gap: 12, marginTop: 14 }}>
            <div style={{ padding: "10px 24px", borderRadius: 99, background: ACCENT, color: "#00131a", fontWeight: 700, fontSize: 22 }}>Enviar</div>
            <div style={{ padding: "10px 24px", borderRadius: 99, border: `1px solid ${MUTED}`, color: MUTED, fontSize: 22 }}>Editar</div>
          </div>
        </div>
      ))}
      {/* fluxo conectando os módulos */}
      <div style={{ position: "absolute", left: SAFE.left + 10, width: SAFE_W - 20, top: 1160, display: "flex", justifyContent: "space-between", alignItems: "center", opacity: prog(t, a + 2.0, a + 2.3) }}>
        {nodes.map((n, i) => {
          const on = flow * (nodes.length - 1) >= i - 0.01;
          return (
            <React.Fragment key={n}>
              <div style={{ padding: "12px 18px", borderRadius: 16, background: on ? "rgba(56,211,238,0.16)" : "#10141b", border: `1.5px solid ${on ? ACCENT : "#2a3140"}`, color: on ? PAPER : MUTED, fontFamily: DISPLAY, fontWeight: 700, fontSize: 24, boxShadow: on ? `0 0 24px ${ACCENT}55` : undefined }}>{n}</div>
              {i < nodes.length - 1 ? (
                <div style={{ flex: 1, height: 3, margin: "0 8px", background: "#2a3140", position: "relative" }}>
                  <div style={{ position: "absolute", inset: 0, width: `${Math.min(1, Math.max(0, flow * (nodes.length - 1) - i)) * 100}%`, background: ACCENT, boxShadow: `0 0 12px ${ACCENT}` }} />
                </div>
              ) : null}
            </React.Fragment>
          );
        })}
      </div>
      <Tag text="Demonstração · dados fictícios" at={a + 0.6} out={out} x={CX - 190} y={1270} />
    </div>
  );
};

// ======================= 09 · CTA FINAL =======================
const WaIcon: React.FC<{ s: number }> = ({ s }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="#00131a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.5 11.6a8.5 8.5 0 0 1-12.6 7.5L3.5 20.5l1.4-4.2A8.5 8.5 0 1 1 20.5 11.6z" />
    <path d="M9 8.6c.2 2.6 3 5.4 5.6 5.8l1.2-1.3-1.9-1-1 .9c-1-.4-2.4-1.8-2.8-2.8l.9-1-1-1.9z" fill="#00131a" stroke="none" />
  </svg>
);

export const SceneCTA: React.FC<{ a: number; brand: number; line2: number; out: number }> = ({ a, brand, line2, out }) => {
  const t = useT();
  const v = win(t, a, out, 0.2, 0.45);
  if (v <= 0) return null;
  const conv = prog(t, a, brand, inOut); // linhas de energia convergem
  const logo = prog(t, brand, brand + 0.6);
  const btn = prog(t, line2 + 0.5, line2 + 1.0);
  const pulse = 0.5 + 0.5 * Math.sin((t - line2) * 5);
  const streaks = new Array(14).fill(0).map((_, i) => {
    const ang = (i / 14) * Math.PI * 2;
    const r0 = 1200, r1 = 40;
    const r = lerp(r0, r1, conv);
    return { x: 540 + Math.cos(ang) * r, y: 900 + Math.sin(ang) * r, ang };
  });
  return (
    <div style={{ position: "absolute", inset: 0, opacity: v }}>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, opacity: 1 - logo * 0.85 }}>
        {streaks.map((s, i) => (
          <line key={i} x1={s.x} y1={s.y} x2={s.x + Math.cos(s.ang) * 260 * (1 - conv)} y2={s.y + Math.sin(s.ang) * 260 * (1 - conv)} stroke={i % 3 ? PAPER : ACCENT} strokeWidth={3} strokeLinecap="round" opacity={0.8} />
        ))}
      </svg>
      <div style={{ position: "absolute", left: SAFE.left, width: SAFE_W, top: 700, display: "flex", justifyContent: "center", opacity: logo, transform: `scale(${lerp(1.15, 1, logo)})`, filter: `blur(${(1 - logo) * 12}px)` }}>
        <Wordmark size={128} glow={0.6 + 0.4 * (1 - logo)} />
      </div>
      <Sub text="Fale com a ConectFly" at={brand + 0.25} out={out + 1} y={880} size={40} />
      <Headline text="SEU PRÓXIMO PROJETO COMEÇA AQUI" at={line2} out={out + 1} y={980} size={70} accentWords={["AQUI"]} />
      {btn > 0 ? (
        <div style={{ position: "absolute", left: SAFE.left, width: SAFE_W, top: 1230, display: "flex", justifyContent: "center", opacity: btn, transform: `translateY(${(1 - btn) * 30}px)` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18, padding: "24px 40px", borderRadius: 99, background: ACCENT, boxShadow: `0 0 ${40 + 30 * pulse}px ${ACCENT}aa`, fontFamily: DISPLAY, fontWeight: 800, fontSize: 40, color: "#00131a" }}>
            <WaIcon s={46} />
            WhatsApp {WHATSAPP.display}
          </div>
        </div>
      ) : null}
    </div>
  );
};
