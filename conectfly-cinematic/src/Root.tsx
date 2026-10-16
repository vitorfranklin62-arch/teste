import React from "react";
import { AbsoluteFill, Audio, Composition, staticFile } from "remotion";
import "./lib/fonts";
import { C } from "./lib/brand";
import { M15, M40, S40, sec } from "./lib/time";
import { Flash, SceneAI, SceneBrand, SceneEnd, SceneHook, SceneMontage, SceneServices, SceneShowroom, SceneSignature } from "./scenes/scenes";
import { Universe, UniverseCue } from "./three/Universe";
import { Grade } from "./ui/kit";

// ===================== Comercial principal (40 s) =====================
// Todos os tempos vêm do alinhamento real da locução (narration-timeline.json).
const PORTAL = M40.conectfly_1 - 0.2; // câmera atravessa o portal logo antes de "ConectFly"
const S3_START = S40.L3_servicos.start - 0.05;
const S5_START = S40.L4_ia.start - 0.05;
const S6_START = S40.L5_projetos.start - 0.1;
const S6_OUT = S40.L5_projetos.end + 0.35;
const S6_DISSOLVE = S6_OUT + 0.9;
const S7_OUT = S40.L6_assinatura.end + 0.45;
const LOGO_SETTLE = M40.futuro + 1.3;

const CUE40: UniverseCue = {
  speed: [
    [0, 0.6], [PORTAL - 1.5, 6], [PORTAL, 55], [PORTAL + 0.6, 10], [S3_START, 4], [S5_START, 7],
    [S6_START, 3], [S6_OUT, 2], [S6_DISSOLVE, 18], [M40.conectfly_2, 4], [M40.futuro, 1.2], [40, 0.4],
  ],
  seed: { appear: 0.15, pulse: M40.primeira_palavra, fadeOut: PORTAL - 0.4 },
  portal: { pass: PORTAL, visibleFrom: 1.6 },
  core: { a: S5_START - 0.1, b: S40.L4_ia.end + 0.3 },
  network: { a: S6_OUT + 0.2, b: S7_OUT + 0.5, pulses: [M40.conectfly_2, M40.conecte, M40.automatize, M40.evolua] },
  logo: { a: S7_OUT - 0.5, settle: LOGO_SETTLE },
  flashes: [PORTAL, M40.conectfly_2],
};

export const Commercial40: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: C.void }}>
    <Universe cue={CUE40} dim={(t) => (t > S3_START && t < S40.L3_servicos.end ? 0.55 : t > S6_START && t < S6_OUT ? 0.6 : 1)} />
    <Flash at={PORTAL} dur={0.55} />
    <SceneHook textAt={M40.primeira_palavra + 0.25} out={PORTAL - 0.25} />
    <SceneBrand logoAt={M40.conectfly_1} lineAt={M40.conectfly_1 + 0.75} out={S3_START} />
    <SceneServices a={S3_START} sites={M40.sites} sistemas={M40.sistemas} experiencias={M40.experiencias} conectam={M40.conectam} out={S40.L3_servicos.end + 0.05} />
    <SceneAI a={S5_START} ia={M40.inteligencia_artificial} automacoes={M40.automacoes} benefits={[M40.organizacao, M40.agilidade, M40.liberdade]} out={S40.L4_ia.end + 0.05} />
    <SceneShowroom a={S6_START} enters={[M40.primeira_ideia, M40.projeto_no_ar, M40.detalhe]} out={S6_OUT} dissolve={S6_DISSOLVE} />
    <Flash at={M40.conectfly_2} dur={0.45} max={0.5} />
    <SceneSignature brand={M40.conectfly_2} words={[M40.conecte, M40.automatize, M40.evolua]} out={S7_OUT} />
    <SceneEnd crisp={LOGO_SETTLE - 0.15} sheen={M40.aqui + 0.55} tagline={M40.aqui + 0.2} headline={M40.aqui + 0.7} cta={M40.aqui + 1.0} />
    <Grade />
    <Audio src={staticFile("audio/conectfly_final_mix.wav")} />
  </AbsoluteFill>
);

// ===================== Corte publicitário próprio (15 s) =====================
const P15 = 4.35;
const CUE15: UniverseCue = {
  speed: [[0, 0.8], [P15 - 1.2, 8], [P15, 60], [P15 + 0.5, 12], [6.4, 18], [M15.conectfly, 4], [M15.futuro, 1.2], [15, 0.4]],
  seed: { appear: 0.05, pulse: M15.primeira_palavra, fadeOut: P15 - 0.35 },
  portal: { pass: P15, visibleFrom: 1.0 },
  core: { a: 5.7, b: 6.55 },
  network: { a: 6.2, b: M15.futuro + 0.4, pulses: [M15.conectfly, M15.conecte, M15.automatize, M15.evolua] },
  logo: { a: M15.futuro - 0.6, settle: M15.futuro + 1.0 },
  flashes: [P15, M15.conectfly],
};

export const Commercial15: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: C.void }}>
    <Universe cue={CUE15} dim={(t) => (t > 4.4 && t < 5.75 ? 0.5 : 1)} />
    <Flash at={P15} dur={0.4} />
    <SceneHook textAt={M15.primeira_palavra + 0.2} out={P15 - 0.2} />
    <SceneMontage a={4.45} b={6.4} />
    <Flash at={M15.conectfly} dur={0.4} max={0.5} />
    <SceneSignature brand={M15.conectfly} words={[M15.conecte, M15.automatize, M15.evolua]} out={M15.futuro - 0.1} />
    <SceneEnd crisp={M15.futuro + 0.85} sheen={M15.aqui_end - 0.15} tagline={M15.futuro + 1.3} headline={M15.aqui - 0.3} cta={M15.aqui + 0.1} />
    <Grade />
    <Audio src={staticFile("audio/conectfly_15s_final_mix.wav")} />
  </AbsoluteFill>
);

export const Root: React.FC = () => (
  <>
    <Composition id="Reels40" component={Commercial40} durationInFrames={sec(40)} fps={30} width={1080} height={1920} />
    <Composition id="Horizontal40" component={Commercial40} durationInFrames={sec(40)} fps={30} width={1920} height={1080} />
    <Composition id="Reels15" component={Commercial15} durationInFrames={sec(15)} fps={30} width={1080} height={1920} />
  </>
);
