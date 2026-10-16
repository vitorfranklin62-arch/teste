import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import React, { useMemo } from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { ACCENT } from "../theme/brand";
import { makePencilGeometry, makePencilMaterials } from "./Pencil";

/**
 * Macro cinematográfico dos dois lápis.
 * Tempo local (s): 0 → 7 suspense (vão quase fechando), 7,0 = contato, 7 → 9 impacto e linhas de energia.
 * `localTime` permite reutilizar o mesmo plano no fim do vídeo (loop): valores ≤ 0 reproduzem o enquadramento inicial.
 */
export const IMPACT = 7.0;

const smooth = (x: number) => x * x * (3 - 2 * x);
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/** Vão entre as pontas (mm): fecha de forma quase imperceptível e encosta exatamente no impacto. */
export const gapAt = (t: number) => {
  if (t >= IMPACT) return 0;
  const slow = 0.9 - 0.32 * clamp01(t / 6.6);
  const k = clamp01((t - 6.6) / (IMPACT - 6.6));
  return slow * (1 - k * k * k);
};

const rand = (seed: number) => {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
};

let glowTex: THREE.Texture | null = null;
const glow = () => {
  if (glowTex) return glowTex;
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, "rgba(255,255,255,1)");
  r.addColorStop(0.25, "rgba(255,255,255,0.75)");
  r.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = r;
  g.fillRect(0, 0, 128, 128);
  glowTex = new THREE.CanvasTexture(c);
  return glowTex;
};

const Environment: React.FC = () => {
  const { gl, scene } = useThree();
  useMemo(() => {
    const pm = new THREE.PMREMGenerator(gl);
    scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.35;
  }, [gl, scene]);
  return null;
};

const Pencils: React.FC<{ t: number }> = ({ t }) => {
  const geo = useMemo(() => makePencilGeometry(), []);
  const mats = useMemo(() => makePencilMaterials(null), []);
  const gap = gapAt(t);
  // recuo elástico após o contato
  const since = t - IMPACT;
  const recoil = since > 0 ? 0.32 * Math.exp(-since * 5.5) * Math.sin(since * 26) + 0.12 * (1 - Math.exp(-since * 3)) : 0;
  // microvibração (quase imperceptível) antes do contato
  const micro = t < IMPACT ? 0.004 * Math.sin(t * 37.0) + 0.003 * Math.sin(t * 53.3 + 1) : 0;
  return (
    <group>
      {/* lápis de cima: ponta para baixo */}
      <mesh geometry={geo} material={mats} position={[micro, gap / 2 + Math.max(0, recoil), 0]} rotation={[0, 0.21, 0]} />
      {/* lápis de baixo: ponta para cima */}
      <mesh geometry={geo} material={mats} position={[-micro, -gap / 2 - Math.max(0, recoil), 0]} rotation={[Math.PI, 0.74, 0]} />
    </group>
  );
};

/** Poeira em suspensão: partículas próximas fora de foco (bokeh) e distantes, iluminadas. */
const Dust: React.FC<{ t: number; fade: number }> = ({ t, fade }) => {
  const pts = useMemo(() => {
    const r = rand(9);
    return new Array(70).fill(0).map(() => ({ x: (r() - 0.5) * 60, y: (r() - 0.5) * 90, z: -40 + r() * 70, s: 0.15 + r() * 0.5, vx: (r() - 0.5) * 0.25, vy: 0.15 + r() * 0.35, ph: r() * 6 }));
  }, []);
  return (
    <group>
      {pts.map((p, i) => {
        const near = p.z > 12; // muito perto da lente → grande e difuso
        const sc = near ? p.s * 6 : p.s;
        return (
          <sprite key={i} position={[p.x + p.vx * t + Math.sin(t * 0.6 + p.ph) * 0.4, ((p.y + p.vy * t + 45) % 90) - 45, p.z]} scale={[sc, sc, 1]}>
            <spriteMaterial map={glow()} color={i % 7 === 0 ? ACCENT : "#cfd6e6"} transparent opacity={(near ? 0.06 : 0.22) * fade} depthWrite={false} blending={THREE.AdditiveBlending} />
          </sprite>
        );
      })}
    </group>
  );
};

/** Impacto: flash, onda de choque, fragmentos de grafite, faíscas e linhas de energia que desenham uma interface. */
const Impact: React.FC<{ t: number }> = ({ t }) => {
  const since = t - IMPACT;
  const parts = useMemo(() => {
    const r = rand(77);
    return new Array(220).fill(0).map((_, i) => {
      const spark = i < 70;
      const a = r() * Math.PI * 2;
      const el = (r() - 0.5) * 1.4;
      const sp = spark ? 6 + r() * 18 : 1.5 + r() * 6;
      return { spark, vx: Math.cos(a) * Math.cos(el) * sp, vy: Math.sin(el) * sp * 0.8, vz: Math.sin(a) * Math.cos(el) * sp, size: spark ? 0.08 + r() * 0.14 : 0.03 + r() * 0.06, life: spark ? 0.35 + r() * 0.5 : 0.9 + r() * 0.8 };
    });
  }, []);
  const lines = useMemo(() => {
    // segmentos que crescem a partir do contato e formam o "esqueleto" de uma interface
    const L: [number, number, number, number, number][] = [];
    const W = 14, H = 22;
    const rect = (x0: number, y0: number, x1: number, y1: number, d: number) => {
      L.push([x0, y0, x1, y0, d], [x1, y0, x1, y1, d + 0.05], [x1, y1, x0, y1, d + 0.1], [x0, y1, x0, y0, d + 0.15]);
    };
    L.push([0, 0, -W, 0, 0], [0, 0, W, 0, 0], [0, 0, 0, H, 0.05], [0, 0, 0, -H, 0.05]);
    rect(-W, -H, W, H, 0.25);
    rect(-W + 2, H - 7, W - 2, H - 2, 0.45);
    rect(-W + 2, -3, -1, 6, 0.55);
    rect(1, -3, W - 2, 6, 0.6);
    rect(-W + 2, -H + 2, W - 2, -6, 0.7);
    return L;
  }, []);
  if (since < 0 || since > 2.2) return null;
  const flash = Math.exp(-since * 9);
  const ring = clamp01(since / 0.7);
  const linesK = clamp01((since - 0.12) / 1.1);
  const linesFade = 1 - clamp01((since - 1.55) / 0.5);
  const segs: number[] = [];
  for (const [x0, y0, x1, y1, d] of lines) {
    const k = smooth(clamp01((linesK - d) / 0.35));
    if (k <= 0) continue;
    segs.push(x0, y0, 0.2, x0 + (x1 - x0) * k, y0 + (y1 - y0) * k, 0.2);
  }
  const lg = new THREE.BufferGeometry();
  lg.setAttribute("position", new THREE.Float32BufferAttribute(segs, 3));
  return (
    <group>
      <sprite scale={[2 + 30 * (1 - flash), 2 + 30 * (1 - flash), 1]}>
        <spriteMaterial map={glow()} color="#ffffff" transparent opacity={flash} blending={THREE.AdditiveBlending} depthWrite={false} />
      </sprite>
      <sprite scale={[6 + 14 * ring, 6 + 14 * ring, 1]}>
        <spriteMaterial map={glow()} color={ACCENT} transparent opacity={0.6 * flash} blending={THREE.AdditiveBlending} depthWrite={false} />
      </sprite>
      <mesh scale={[0.3 + 9 * smooth(ring), 0.3 + 9 * smooth(ring), 1]}>
        <torusGeometry args={[1, 0.012, 8, 160]} />
        <meshBasicMaterial color={ACCENT} transparent opacity={(1 - ring) * 0.9} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      {parts.map((p, i) => {
        const tt = Math.min(since, p.life);
        const drag = 3.2;
        const f = (1 - Math.exp(-drag * tt)) / drag;
        const x = p.vx * f, y = p.vy * f - (p.spark ? 0 : 2.2 * tt * tt), z = p.vz * f;
        const a = 1 - clamp01(since / p.life);
        if (a <= 0) return null;
        return (
          <sprite key={i} position={[x, y, z]} scale={[p.size, p.size, 1]}>
            <spriteMaterial map={glow()} color={p.spark ? (i % 3 ? "#ffffff" : ACCENT) : "#8d939c"} transparent opacity={a * (p.spark ? 1 : 0.8)} blending={p.spark ? THREE.AdditiveBlending : THREE.NormalBlending} depthWrite={false} />
          </sprite>
        );
      })}
      {segs.length ? (
        <lineSegments geometry={lg}>
          <lineBasicMaterial color={ACCENT} transparent opacity={0.95 * linesFade} blending={THREE.AdditiveBlending} />
        </lineSegments>
      ) : null}
    </group>
  );
};

const CameraRig: React.FC<{ t: number }> = ({ t }) => {
  const { camera } = useThree();
  // altura enquadrada (mm): aproximação lenta e contínua (exponencial) até a macro extrema
  const pre = Math.min(t, IMPACT);
  let h = 64 * Math.pow(24 / 64, pre / IMPACT);
  const since = t - IMPACT;
  if (since > 0) h = h * (1 + 0.9 * smooth(clamp01((since - 0.25) / 1.4))); // recua para revelar as linhas
  const fov = 16;
  const d = h / (2 * Math.tan(((fov / 2) * Math.PI) / 180));
  const orbit = interpolate(t, [-1, IMPACT], [-0.2, 0.12]);
  const elev = 0.06;
  const shake = since > 0 ? 0.08 * Math.exp(-since * 7) : 0;
  const cam = camera as THREE.PerspectiveCamera;
  cam.fov = fov;
  cam.near = 1;
  cam.far = 2000;
  cam.position.set(Math.sin(orbit) * d + Math.sin(t * 91) * shake * h, Math.sin(elev) * d + Math.cos(t * 77) * shake * h, Math.cos(orbit) * d);
  cam.lookAt(0, 0, 0);
  cam.updateProjectionMatrix();
  return null;
};

export const PencilScene: React.FC<{ localTime: (t: number) => number; opacity?: number }> = ({ localTime, opacity = 1 }) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const t = localTime(frame / fps);
  const dustFade = 1 - clamp01((t - IMPACT) / 0.6);
  // a luz principal "respira" com o suspense e explode no impacto
  const since = t - IMPACT;
  const keyBoost = since > 0 ? 1 + 2.5 * Math.exp(-since * 6) : 1 + 0.15 * clamp01((t - 5) / 2);
  return (
    <div style={{ position: "absolute", inset: 0, opacity }}>
      <ThreeCanvas width={width} height={height} gl={{ antialias: true, preserveDrawingBuffer: true }} camera={{ fov: 16, position: [0, 0, 200], near: 1, far: 2000 }}>
        <color attach="background" args={["#000000"]} />
        <Environment />
        <CameraRig t={t} />
        <ambientLight intensity={0.04} />
        {/* key suave pela frente/esquerda, concentrada nas pontas */}
        <spotLight position={[-150, 50, 70]} angle={0.22} penumbra={1} intensity={4.2 * keyBoost} decay={0} color="#fff1e0" />
        {/* preenchimento suave do lado oposto */}
        <spotLight position={[140, -30, 90]} angle={0.3} penumbra={1} intensity={0.9} decay={0} color="#cfe0ff" />
        {/* rim lights por trás: contorno branco frio e acento da marca */}
        <directionalLight position={[-40, 30, -80]} intensity={3.2} color="#dfe9ff" />
        <directionalLight position={[50, -20, -70]} intensity={2.4} color={ACCENT} />
        <directionalLight position={[0, 80, 10]} intensity={0.5} color="#ffffff" />
        <Pencils t={t} />
        <Dust t={t} fade={dustFade} />
        <Impact t={t} />
      </ThreeCanvas>
    </div>
  );
};
