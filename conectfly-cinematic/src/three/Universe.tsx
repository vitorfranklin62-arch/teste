import { ThreeCanvas } from "@remotion/three";
import React, { useEffect, useMemo, useState } from "react";
import { continueRender, delayRender, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";
import { C } from "../lib/brand";
import { cine, inOut, prog } from "../lib/time";

/** Roteiro do universo 3D — tudo em segundos, derivado dos marcadores da narração. */
export type UniverseCue = {
  /** [tempo, velocidade] — velocidade de viagem da câmera (unidades/s). */
  speed: [number, number][];
  seed: { appear: number; pulse: number; fadeOut: number };
  portal: { pass: number; visibleFrom: number };
  core?: { a: number; b: number };
  network: { a: number; b: number; pulses: number[] };
  logo: { a: number; settle: number; hold?: boolean };
  /** Momentos em que o universo "respira" (flash curto de brilho). */
  flashes?: number[];
};

const rand = (seed: number) => {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
};

const glowTexture = (() => {
  let tex: THREE.Texture | null = null;
  return () => {
    if (tex) return tex;
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const g = c.getContext("2d")!;
    const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    r.addColorStop(0, "rgba(255,255,255,1)");
    r.addColorStop(0.18, "rgba(255,255,255,0.85)");
    r.addColorStop(0.45, "rgba(255,255,255,0.22)");
    r.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = r;
    g.fillRect(0, 0, 128, 128);
    tex = new THREE.CanvasTexture(c);
    return tex;
  };
})();

/** Distância percorrida até t (integral da curva de velocidade, passo de 1 frame). */
const travel = (t: number, speed: [number, number][]) => {
  let d = 0;
  const dt = 1 / 30;
  for (let x = 0; x < t; x += dt) {
    d += interpolate(x, speed.map((s) => s[0]), speed.map((s) => s[1]), { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) * Math.min(dt, t - x);
  }
  return d;
};

const PALETTE = [C.cyan, C.violet, C.indigo, C.purple, "#ffffff", C.cyan].map((h) => new THREE.Color(h));

// ---------------- Campo de estrelas ----------------
const STARS = 2600;
const DEPTH = 320;
const Stars: React.FC<{ dist: number; dim: number }> = ({ dist, dim }) => {
  const base = useMemo(() => {
    const r = rand(7);
    const pos = new Float32Array(STARS * 3);
    const col = new Float32Array(STARS * 3);
    for (let i = 0; i < STARS; i++) {
      const a = r() * Math.PI * 2;
      const rad = 3 + Math.pow(r(), 0.7) * 70;
      pos[i * 3] = Math.cos(a) * rad;
      pos[i * 3 + 1] = Math.sin(a) * rad;
      pos[i * 3 + 2] = -r() * DEPTH;
      const c = PALETTE[Math.floor(r() * PALETTE.length)];
      col.set([c.r, c.g, c.b], i * 3);
    }
    return { pos, col };
  }, []);
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(base.pos), 3));
    g.setAttribute("color", new THREE.BufferAttribute(base.col, 3));
    return g;
  }, [base]);
  const p = geo.getAttribute("position") as THREE.BufferAttribute;
  for (let i = 0; i < STARS; i++) {
    let z = base.pos[i * 3 + 2] + dist;
    z = ((z % DEPTH) + DEPTH) % DEPTH - DEPTH; // wrap
    p.setZ(i, z);
  }
  p.needsUpdate = true;
  return (
    <points geometry={geo}>
      <pointsMaterial size={0.55} map={glowTexture()} vertexColors transparent opacity={0.9 * dim} depthWrite={false} blending={THREE.AdditiveBlending} sizeAttenuation />
    </points>
  );
};

// ---------------- Partícula-semente + raios ----------------
const Seed: React.FC<{ t: number; cue: UniverseCue["seed"] }> = ({ t, cue }) => {
  const appear = prog(t, cue.appear, cue.appear + 1.2);
  const pulse = Math.exp(-Math.max(0, t - cue.pulse) * 3) * (t >= cue.pulse ? 1 : 0);
  const breathe = 1 + 0.08 * Math.sin(t * 4);
  const out = 1 - prog(t, cue.fadeOut - 0.6, cue.fadeOut, inOut);
  const rays = useMemo(() => {
    const r = rand(11);
    return new Array(36).fill(0).map(() => ({ a: r() * Math.PI * 2, b: (r() - 0.5) * 0.6, len: 4 + r() * 10, delay: r() * 0.5, c: PALETTE[Math.floor(r() * 4)] }));
  }, []);
  if (out <= 0) return null;
  const k = prog(t, cue.pulse, cue.pulse + 2.2);
  return (
    <group position={[0, 0, -18]}>
      <sprite scale={[(1.4 + 4 * pulse) * appear * breathe, (1.4 + 4 * pulse) * appear * breathe, 1]}>
        <spriteMaterial map={glowTexture()} color={C.cyan} transparent opacity={out} blending={THREE.AdditiveBlending} depthWrite={false} />
      </sprite>
      <sprite scale={[0.5 * appear, 0.5 * appear, 1]}>
        <spriteMaterial map={glowTexture()} color="#ffffff" transparent opacity={out} blending={THREE.AdditiveBlending} depthWrite={false} />
      </sprite>
      {rays.map((ray, i) => {
        const kk = Math.max(0, Math.min(1, (k - ray.delay * 0.4) / 0.8));
        if (kk <= 0) return null;
        const dir = new THREE.Vector3(Math.cos(ray.a), Math.sin(ray.a), ray.b).normalize();
        const p0 = dir.clone().multiplyScalar(0.6 + kk * ray.len * 0.4);
        const p1 = dir.clone().multiplyScalar(0.6 + kk * ray.len);
        const g = new THREE.BufferGeometry().setFromPoints([p0, p1]);
        return (
          <line key={i}>
            <primitive object={g} attach="geometry" />
            <lineBasicMaterial color={ray.c} transparent opacity={out * (1 - kk * 0.5)} blending={THREE.AdditiveBlending} />
          </line>
        );
      })}
    </group>
  );
};

// ---------------- Portal ----------------
const Portal: React.FC<{ t: number; cue: UniverseCue["portal"] }> = ({ t, cue }) => {
  if (t < cue.visibleFrom || t > cue.pass + 0.8) return null;
  const k = prog(t, cue.visibleFrom, cue.pass, (x) => x * x * x); // acelera até atravessar
  // depois da travessia os anéis seguem passando pela câmera (nenhum fica parado na frente)
  const z = interpolate(k, [0, 1], [-140, 4]) + Math.max(0, t - cue.pass) * 90;
  const fade = prog(t, cue.visibleFrom, cue.visibleFrom + 1.0);
  return (
    <group position={[0, 0, z]} rotation={[0, 0, t * 0.25]}>
      {new Array(9).fill(0).map((_, i) => (
        <mesh key={i} position={[0, 0, -i * 5]} rotation={[0, 0, i * 0.35]}>
          <torusGeometry args={[6 + i * 0.25, 0.05 + (i % 3 === 0 ? 0.06 : 0), 8, 96]} />
          <meshBasicMaterial color={i % 2 ? C.violet : C.cyan} transparent opacity={fade * (0.9 - i * 0.07)} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      ))}
      {new Array(24).fill(0).map((_, i) => {
        const a = (i / 24) * Math.PI * 2;
        return (
          <mesh key={`s${i}`} position={[Math.cos(a) * 6.6, Math.sin(a) * 6.6, -2]} rotation={[0, 0, a]}>
            <boxGeometry args={[0.9, 0.08, 0.08]} />
            <meshBasicMaterial color={i % 3 ? C.indigo : C.purple} transparent opacity={fade * 0.8} blending={THREE.AdditiveBlending} />
          </mesh>
        );
      })}
      <sprite position={[0, 0, -40]} scale={[26, 26, 1]}>
        <spriteMaterial map={glowTexture()} color={C.blue} transparent opacity={fade * 0.55} blending={THREE.AdditiveBlending} depthWrite={false} />
      </sprite>
    </group>
  );
};

// ---------------- Núcleo de IA ----------------
const Core: React.FC<{ t: number; cue: NonNullable<UniverseCue["core"]> }> = ({ t, cue }) => {
  const v = Math.min(prog(t, cue.a, cue.a + 0.9), 1 - prog(t, cue.b - 0.6, cue.b, inOut));
  if (v <= 0) return null;
  const s = interpolate(v, [0, 1], [0.3, 1]);
  const beat = 1 + 0.06 * Math.sin((t - cue.a) * Math.PI * 2 * 1.6);
  return (
    <group position={[0, 0.4, -16]} scale={[s * beat, s * beat, s * beat]}>
      <mesh rotation={[t * 0.4, t * 0.6, 0]}>
        <icosahedronGeometry args={[2.4, 1]} />
        <meshBasicMaterial color={C.cyan} wireframe transparent opacity={0.75 * v} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh rotation={[-t * 0.3, t * 0.2, t * 0.1]}>
        <icosahedronGeometry args={[3.3, 0]} />
        <meshBasicMaterial color={C.violet} wireframe transparent opacity={0.45 * v} blending={THREE.AdditiveBlending} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh key={i} rotation={[Math.PI / 2 + i * 0.7, t * (0.5 + i * 0.2), i]}>
          <torusGeometry args={[4.2 + i * 0.6, 0.025, 6, 128]} />
          <meshBasicMaterial color={i === 1 ? C.purple : C.indigo} transparent opacity={0.6 * v} blending={THREE.AdditiveBlending} />
        </mesh>
      ))}
      <sprite scale={[9, 9, 1]}>
        <spriteMaterial map={glowTexture()} color={C.violet} transparent opacity={0.7 * v} blending={THREE.AdditiveBlending} depthWrite={false} />
      </sprite>
      <sprite scale={[3.2, 3.2, 1]}>
        <spriteMaterial map={glowTexture()} color="#ffffff" transparent opacity={0.9 * v} blending={THREE.AdditiveBlending} depthWrite={false} />
      </sprite>
    </group>
  );
};

// ---------------- Rede de conexões ----------------
const NODES = 110;
const Network: React.FC<{ t: number; cue: UniverseCue["network"] }> = ({ t, cue }) => {
  const data = useMemo(() => {
    const r = rand(23);
    const nodes: THREE.Vector3[] = [];
    for (let i = 0; i < NODES; i++) {
      const u = r() * 2 - 1;
      const a = r() * Math.PI * 2;
      const rad = 7 + r() * 4;
      nodes.push(new THREE.Vector3(Math.sqrt(1 - u * u) * Math.cos(a) * rad, u * rad * 1.3, Math.sqrt(1 - u * u) * Math.sin(a) * rad));
    }
    const edges: [number, number, number][] = [];
    for (let i = 0; i < NODES; i++)
      for (let j = i + 1; j < NODES; j++) if (nodes[i].distanceTo(nodes[j]) < 4.2) edges.push([i, j, Math.floor(r() * (cue.pulses.length + 1))]);
    return { nodes, edges };
  }, [cue.pulses.length]);
  const v = Math.min(prog(t, cue.a, cue.a + 1.0), 1 - prog(t, cue.b - 0.8, cue.b, inOut));
  if (v <= 0) return null;
  // cada palavra ativa um grupo de conexões
  const active = cue.pulses.filter((p) => t >= p).length;
  const lastPulse = cue.pulses.filter((p) => t >= p).at(-1);
  const flash = lastPulse !== undefined ? Math.exp(-(t - lastPulse) * 4) : 0;
  const positions: number[] = [];
  const colors: number[] = [];
  for (const [i, j, g] of data.edges) {
    const on = g < active ? 1 : 0.12;
    const c = (g % 2 ? new THREE.Color(C.violet) : new THREE.Color(C.cyan)).multiplyScalar(on * (0.7 + 0.6 * flash));
    positions.push(...data.nodes[i].toArray(), ...data.nodes[j].toArray());
    colors.push(c.r, c.g, c.b, c.r, c.g, c.b);
  }
  const lg = new THREE.BufferGeometry();
  lg.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  lg.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  const pg = new THREE.BufferGeometry().setFromPoints(data.nodes);
  return (
    <group position={[0, 0, -24]} rotation={[0.2, t * 0.18, 0]} scale={[v, v, v]}>
      <lineSegments geometry={lg}>
        <lineBasicMaterial vertexColors transparent opacity={0.85 * v} blending={THREE.AdditiveBlending} depthWrite={false} />
      </lineSegments>
      <points geometry={pg}>
        <pointsMaterial size={0.9 + flash * 0.6} map={glowTexture()} color={C.cyan} transparent opacity={v} blending={THREE.AdditiveBlending} depthWrite={false} />
      </points>
    </group>
  );
};

// ---------------- Partículas que formam a marca ----------------
const useWordmarkTargets = (count: number) => {
  const [targets, setTargets] = useState<Float32Array | null>(null);
  const [handle] = useState(() => delayRender("wordmark targets"));
  useEffect(() => {
    document.fonts.load("800 160px Sora").then(() => {
      const w = 1400;
      const h = 260;
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const g = c.getContext("2d")!;
      g.fillStyle = "#fff";
      g.font = "800 200px Sora";
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText("ConectFly", w / 2, h / 2 + 8);
      const img = g.getImageData(0, 0, w, h).data;
      const pts: number[] = [];
      for (let y = 0; y < h; y += 3) for (let x = 0; x < w; x += 3) if (img[(y * w + x) * 4 + 3] > 128) pts.push(x, y);
      const r = rand(31);
      const out = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        const k = Math.floor(r() * (pts.length / 2)) * 2;
        out[i * 3] = ((pts[k] - w / 2) / w) * 13;
        out[i * 3 + 1] = (-(pts[k + 1] - h / 2) / w) * 13;
        out[i * 3 + 2] = (r() - 0.5) * 0.25;
      }
      setTargets(out);
      continueRender(handle);
    });
  }, [count, handle]);
  return targets;
};

const LOGO_PTS = 2400;
const LogoParticles: React.FC<{ t: number; cue: UniverseCue["logo"]; narrow: boolean }> = ({ t, cue, narrow }) => {
  const targets = useWordmarkTargets(LOGO_PTS);
  const starts = useMemo(() => {
    const r = rand(41);
    const s = new Float32Array(LOGO_PTS * 3);
    for (let i = 0; i < LOGO_PTS; i++) {
      const a = r() * Math.PI * 2;
      const rad = 10 + r() * 30;
      s.set([Math.cos(a) * rad, Math.sin(a) * rad, -20 - r() * 40], i * 3);
    }
    return s;
  }, []);
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(LOGO_PTS * 3), 3));
    const col = new Float32Array(LOGO_PTS * 3);
    for (let i = 0; i < LOGO_PTS; i++) {
      const c = new THREE.Color(C.cyan).lerp(new THREE.Color(C.purple), (i % 97) / 97);
      col.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    return g;
  }, []);
  if (!targets || t < cue.a - 0.2) return null;
  const k = prog(t, cue.a, cue.settle, inOut);
  const shimmer = cue.hold ? 1 : 1;
  const p = geo.getAttribute("position") as THREE.BufferAttribute;
  const scale = narrow ? 0.62 : 1;
  for (let i = 0; i < LOGO_PTS; i++) {
    const d = Math.min(1, Math.max(0, k * 1.25 - ((i % 50) / 50) * 0.25)); // chegada escalonada
    const e = cine(d);
    const swirl = (1 - e) * 2.2;
    const sx = starts[i * 3] * (1 - e) + targets[i * 3] * scale * e + Math.sin(i + t * 2) * swirl;
    const sy = starts[i * 3 + 1] * (1 - e) + targets[i * 3 + 1] * scale * e + Math.cos(i * 1.3 + t * 2) * swirl;
    const sz = starts[i * 3 + 2] * (1 - e) + (targets[i * 3 + 2] - 12) * e;
    p.setXYZ(i, sx, sy, sz);
  }
  p.needsUpdate = true;
  const fadeToCrisp = 1 - prog(t, cue.settle - 0.1, cue.settle + 0.9); // o wordmark nítido assume
  return (
    <points geometry={geo}>
      <pointsMaterial size={0.16} map={glowTexture()} vertexColors transparent opacity={prog(t, cue.a - 0.2, cue.a + 0.4) * fadeToCrisp * shimmer} blending={THREE.AdditiveBlending} depthWrite={false} />
    </points>
  );
};

export const Universe: React.FC<{ cue: UniverseCue; dim?: (t: number) => number }> = ({ cue, dim }) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const t = frame / fps;
  const dist = useMemo(() => travel(t, cue.speed), [t, cue.speed]);
  const narrow = height > width;
  const flash = (cue.flashes ?? []).reduce((m, f) => Math.max(m, t >= f ? Math.exp(-(t - f) * 5) : 0), 0);
  return (
    <ThreeCanvas width={width} height={height} camera={{ fov: narrow ? 72 : 50, position: [0, 0, 0], near: 0.1, far: 500 }} gl={{ antialias: true, preserveDrawingBuffer: true }}>
      <color attach="background" args={[C.void]} />
      <fog attach="fog" args={[C.void, 60, 300]} />
      <Stars dist={dist} dim={(dim ? dim(t) : 1) * (1 + flash * 0.6)} />
      <Seed t={t} cue={cue.seed} />
      <Portal t={t} cue={cue.portal} />
      {cue.core ? <Core t={t} cue={cue.core} /> : null}
      <Network t={t} cue={cue.network} />
      <LogoParticles t={t} cue={cue.logo} narrow={narrow} />
    </ThreeCanvas>
  );
};
