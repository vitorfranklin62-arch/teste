// Converte o alinhamento forçado (ElevenLabs Scribe, timestamps por palavra) em
// narration-timeline.json: frases, palavras e marcadores de sincronia, em segundos
// e em frames (30 fps), já com o deslocamento da voz na timeline do vídeo.
//
// A voz entra VOICE_OFFSET segundos depois do início do vídeo, para a cena 1
// abrir em silêncio (partícula surgindo) antes da primeira palavra.
import fs from "node:fs";

const FPS = 30;
const VOICE_OFFSET = 0.6; // s
const raw = JSON.parse(fs.readFileSync("assets/audio/source/alignment_words_raw.json", "utf8"));

// Remove as audio tags ([calm, intriguing], [pause]...) — são direção de interpretação,
// não fala. Uma tag pode vir quebrada em duas "palavras" ("[long" + "pause]").
const words = [];
let inTag = false;
for (const w of raw.words) {
  if (w.type !== "word") continue;
  const t = w.text;
  if (t.startsWith("[")) inTag = true;
  const wasTag = inTag;
  if (t.endsWith("]")) inTag = false;
  if (wasTag) continue;
  words.push({ text: t, start: +w.start.toFixed(3), end: +w.end.toFixed(3) });
}

// Frases do roteiro (ordem do take). Cada uma consome N palavras.
const sentences = [
  { id: "L1_abertura", emotion: "calm, intriguing, cinematic", text: "E se a tecnologia pudesse levar o seu negócio muito mais longe?" },
  { id: "L2_marca", emotion: "confident, warm", text: "Na ConectFly, transformamos ideias em soluções digitais de verdade." },
  { id: "L3_servicos", emotion: "clear, professional", text: "Criamos sites profissionais, sistemas inteligentes e experiências que conectam empresas aos seus clientes." },
  { id: "L4_ia", emotion: "inspiring, assured", text: "Com inteligência artificial e automações, seu negócio ganha mais organização, agilidade e liberdade para crescer." },
  { id: "L5_projetos", emotion: "proud, natural", text: "Da primeira ideia ao projeto no ar, cada detalhe importa." },
  { id: "L6_assinatura", emotion: "deep, confident", text: "ConectFly. Conecte. Automatize. Evolua." },
  { id: "L7_encerramento", emotion: "warmly, cinematic finish", text: "O futuro do seu negócio começa aqui." },
];

const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z]/g, "");
let cursor = 0;
for (const s of sentences) {
  const n = s.text.split(/\s+/).length;
  const ws = words.slice(cursor, cursor + n);
  ws.forEach((w, i) => {
    const expected = s.text.split(/\s+/)[i];
    if (norm(w.text) !== norm(expected)) throw new Error(`Alinhamento divergente: "${w.text}" ≠ "${expected}"`);
  });
  cursor += n;
  s.words = ws;
}
if (cursor !== words.length) throw new Error(`Sobraram ${words.length - cursor} palavras sem frase`);

const toVideo = (t) => +(t + VOICE_OFFSET).toFixed(3);
const f = (t) => Math.round(t * FPS);
const findWord = (text, nth = 0) => {
  const hits = words.filter((w) => norm(w.text) === norm(text));
  if (!hits[nth]) throw new Error(`Marcador não encontrado: ${text}#${nth}`);
  return hits[nth];
};

// Marcadores que guiam a montagem (o vídeo segue a voz).
const markerDefs = {
  primeira_palavra: ["E"],
  conectfly_1: ["ConectFly,"],
  sites: ["sites"],
  sistemas: ["sistemas"],
  experiencias: ["experiências"],
  conectam: ["conectam"],
  clientes: ["clientes."],
  inteligencia_artificial: ["inteligência"],
  automacoes: ["automações,"],
  organizacao: ["organização,"],
  agilidade: ["agilidade"],
  liberdade: ["liberdade"],
  primeira_ideia: ["primeira"],
  projeto_no_ar: ["projeto"],
  detalhe: ["detalhe"],
  conectfly_2: ["ConectFly.", 1],
  conecte: ["Conecte."],
  automatize: ["Automatize."],
  evolua: ["Evolua."],
  futuro: ["futuro"],
  aqui: ["aqui."],
};
const markers = {};
for (const [k, [w, nth]] of Object.entries(markerDefs)) {
  const hit = findWord(w, nth ?? 0);
  markers[k] = { word: hit.text, start_s: toVideo(hit.start), end_s: toVideo(hit.end), start_frame: f(toVideo(hit.start)), end_frame: f(toVideo(hit.end)) };
}

const out = {
  generated_by: "scripts/build-timeline.mjs",
  source_audio: "assets/audio/source/narration_original.mp3",
  alignment: "ElevenLabs Scribe v1 (forced alignment, word level) — assets/audio/source/alignment_words_raw.json",
  fps: FPS,
  voice_offset_s: VOICE_OFFSET,
  narration_duration_s: 36.64,
  video_duration_s: 40,
  video_duration_frames: 40 * FPS,
  sentences: sentences.map((s) => ({
    id: s.id,
    emotion_tags: s.emotion,
    text: s.text,
    start_s: toVideo(s.words[0].start),
    end_s: toVideo(s.words.at(-1).end),
    start_frame: f(toVideo(s.words[0].start)),
    end_frame: f(toVideo(s.words.at(-1).end)),
    words: s.words.map((w) => ({ text: w.text, start_s: toVideo(w.start), end_s: toVideo(w.end), start_frame: f(toVideo(w.start)), end_frame: f(toVideo(w.end)) })),
  })),
  markers,
};
fs.writeFileSync("narration-timeline.json", JSON.stringify(out, null, 2));
fs.mkdirSync("src/data", { recursive: true });
fs.writeFileSync("src/data/narration-timeline.json", JSON.stringify(out, null, 2));
for (const s of out.sentences) console.log(`${s.id.padEnd(16)} ${s.start_s.toFixed(2)}–${s.end_s.toFixed(2)}s  [${s.start_frame}–${s.end_frame}]`);
console.log(Object.entries(markers).map(([k, m]) => `${k}@${m.start_s}`).join("  "));

// ---------------- Corte de 15 s (edição própria, mesmo take, sem time-stretch) ----------------
// Segmento A: L1 inteira. Segmento B: bloco contínuo "ConectFly. Conecte. Automatize. Evolua.
// O futuro do seu negócio começa aqui." — preservando as pausas originais do locutor.
const src = (text, nth = 0) => findWord(text, nth);
const segA = { src_start: 0.0, src_end: +(src("longe?").end + 0.08).toFixed(3), at: 0.5 };
const segB = { src_start: +(src("ConectFly.", 1).start - 0.14).toFixed(3), src_end: +(src("aqui.").end + 0.12).toFixed(3), at: 6.4 };
const mapB = (t) => +(t - segB.src_start + segB.at).toFixed(3);
const cut15 = {
  duration_s: 15,
  fps: FPS,
  segments: [segA, segB],
  markers: {
    primeira_palavra: +(src("E").start - segA.src_start + segA.at).toFixed(3),
    conectfly: mapB(src("ConectFly.", 1).start),
    conecte: mapB(src("Conecte.").start),
    automatize: mapB(src("Automatize.").start),
    evolua: mapB(src("Evolua.").start),
    futuro: mapB(src("futuro").start),
    aqui: mapB(src("aqui.").start),
    aqui_end: mapB(src("aqui.").end),
  },
};
fs.writeFileSync("src/data/cut15.json", JSON.stringify(cut15, null, 2));
console.log("cut15", JSON.stringify(cut15.markers));
