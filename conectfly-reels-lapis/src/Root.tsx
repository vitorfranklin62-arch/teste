import React from "react";
import { AbsoluteFill, Audio, Composition, staticFile } from "remotion";
import { Captions, Flash, Grade, prog, SAFE, SAFE_W, inOut, useT } from "./components/kit";
import { IMPACT, PencilScene } from "./components/PencilScene";
import tl from "./data/timeline.json";
import { SceneApps, SceneCTA, SceneCrmAI, SceneSeven, SceneSites, SceneSlowSite, SceneSystems } from "./scenes/scenes";
import { BODY } from "./theme/fonts";
import { MUTED } from "./theme/brand";

const L = Object.fromEntries(tl.lines.map((l) => [l.id, l])) as Record<string, (typeof tl.lines)[number]>;
const DUR = tl.duration_s;
const LOOP_IN = DUR - 0.6; // volta ao enquadramento inicial dos lápis (loop)

/** Texto do gancho: discreto, fino, sem marca nem oferta. */
const HookText: React.FC = () => {
  const t = useT();
  const v = Math.min(prog(t, 1.2, 1.7), 1 - prog(t, 3.0, 3.4, inOut));
  if (v <= 0) return null;
  return (
    <div style={{ position: "absolute", left: SAFE.left, width: SAFE_W, top: 1380, textAlign: "center", fontFamily: BODY, fontWeight: 400, fontSize: 40, letterSpacing: "0.12em", color: "#e9edf5", opacity: v * 0.92, filter: `blur(${(1 - v) * 6}px)`, textShadow: "0 0 18px #000, 0 0 36px #000, 0 2px 4px #000" }}>
      Só mais um segundo...
    </div>
  );
};

const Pencils: React.FC = () => {
  const t = useT();
  const show = t < 9.2 || t > LOOP_IN - 0.05;
  if (!show) return null;
  const opacity = t < 9.2 ? 1 - prog(t, 8.5, 9.1, inOut) : prog(t, LOOP_IN, DUR - 0.12, inOut);
  return <PencilScene localTime={(x) => (x > LOOP_IN - 0.05 ? x - DUR : x)} opacity={opacity} />;
};

export const ConectFlyReels: React.FC = () => {
  const caps = tl.lines.flatMap((l) => l.captions);
  const l2b = L.L2.captions[1].start_s;
  const l7b = L.L7.captions[1].start_s;
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <Pencils />
      <HookText />
      <SceneSeven a={8.5} out={L.L2.start_s - 0.28} />
      <SceneSlowSite a={L.L2.start_s - 0.28} q1={L.L2.start_s} q2={l2b} reveal={L.L2.end_s - 0.45} out={L.L3.start_s} />
      <SceneSites a={L.L3.start_s - 0.3} cut1={L.L3.start_s + 1.75} cut2={L.L3.start_s + 3.35} out={L.L4.start_s} />
      <SceneSystems a={L.L4.start_s - 0.3} cut={L.L4.start_s + 1.9} out={L.L5.start_s} />
      <SceneApps a={L.L5.start_s - 0.3} lift={L.L5.start_s + 1.05} s2={L.L5.start_s + 2.0} out={L.L6.start_s} />
      <SceneCrmAI a={L.L6.start_s - 0.3} out={L.L7.start_s} />
      <SceneCTA a={L.L7.start_s - 0.35} brand={L.L7.start_s + 0.4} line2={l7b} out={LOOP_IN + 0.35} />
      {[L.L3.start_s, L.L4.start_s, L.L5.start_s, L.L6.start_s].map((x) => (
        <Flash key={x} at={x} dur={0.3} max={0.35} />
      ))}
      <Flash at={L.L7.start_s + 0.4} dur={0.45} max={0.6} />
      <Captions chunks={caps} />
      <Grade />
      <Audio src={staticFile("audio/conectfly_reels_mix.wav")} />
    </AbsoluteFill>
  );
};

/** Capa: macro dos lápis quase se tocando + o gancho. */
export const Cover: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#000" }}>
    <PencilScene localTime={() => 6.2} />
    <div style={{ position: "absolute", left: SAFE.left, width: SAFE_W, top: 1380, textAlign: "center", fontFamily: BODY, fontWeight: 400, fontSize: 40, letterSpacing: "0.12em", color: "#e9edf5" }}>Só mais um segundo...</div>
    <div style={{ position: "absolute", left: SAFE.left, width: SAFE_W, top: 300, textAlign: "center", fontFamily: BODY, fontWeight: 500, fontSize: 26, letterSpacing: "0.3em", color: MUTED }}>CONECTFLY</div>
    <Grade />
  </AbsoluteFill>
);

export const Root: React.FC = () => (
  <>
    <Composition id="ConectFlyReels" component={ConectFlyReels} durationInFrames={Math.round(DUR * 30)} fps={30} width={1080} height={1920} />
    <Composition id="Cover" component={Cover} durationInFrames={1} fps={30} width={1080} height={1920} />
  </>
);

export { IMPACT };
