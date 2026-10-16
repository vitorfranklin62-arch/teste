// Monta a timeline da narração a partir de SEGMENTOS de takes reais e do alinhamento
// forçado (ElevenLabs Scribe, timestamps por palavra) de cada take.
//
// Corte principal (54 s):
//   take "main" 0 → 15,67 s  (abertura · marca · serviços)           — cortado no silêncio após "clientes."
//   take "crm"  inteiro      ("Do projeto mais simples ... em um só lugar.")
//   take "main" 15,67 s → fim (IA · projetos · assinatura · encerramento)
// Nada é acelerado/esticado: só reposicionado em pausas naturais do locutor.
//
// Saídas: narration-timeline.json (raiz + src/data) e src/data/cut15.json.
import fs from "node:fs";

const FPS = 30;
const VIDEO_DURATION = 54;
const SOURCES = {
  main: { audio: "assets/audio/source/narration_original.mp3", align: "assets/audio/source/alignment_words_raw.json", duration: 36.64 },
  crm: { audio: "assets/audio/source/narration_crm.mp3", align: "assets/audio/source/alignment_crm_words_raw.json", duration: 12.64 },
};
const SEGMENTS = [
  { src: "main", src_start: 0.0, src_end: 15.67, at: 0.6 },
  { src: "crm", src_start: 0.0, src_end: 12.6, at: 16.82 },
  { src: "main", src_start: 15.67, src_end: 36.64, at: 29.87 },
];

const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z]/g, "");
const f = (t) => Math.round(t * FPS);
const r3 = (x) => +x.toFixed(3);

// Remove audio tags ([calm, intriguing], [pause]... — direção de interpretação, não fala).
const spokenWords = (rawPath) => {
  const raw = JSON.parse(fs.readFileSync(rawPath, "utf8"));
  const out = [];
  let inTag = false;
  for (const w of raw.words) {
    if (w.type !== "word") continue;
    if (w.text.startsWith("[")) inTag = true;
    const wasTag = inTag;
    if (w.text.endsWith("]")) inTag = false;
    if (!wasTag) out.push({ text: w.text, start: w.start, end: w.end });
  }
  return out;
};

// Palavras na timeline do vídeo
const words = [];
for (const seg of SEGMENTS) {
  for (const w of spokenWords(SOURCES[seg.src].align)) {
    if (w.start >= seg.src_start && w.start < seg.src_end) {
      const d = seg.at - seg.src_start;
      words.push({ text: w.text, start: r3(w.start + d), end: r3(Math.min(w.end, seg.src_end) + d), src: seg.src });
    }
  }
}

const sentences = [
  { id: "L1_abertura", emotion: "calm, intriguing, cinematic", text: "E se a tecnologia pudesse levar o seu negócio muito mais longe?" },
  { id: "L2_marca", emotion: "confident, warm", text: "Na ConectFly, transformamos ideias em soluções digitais de verdade." },
  { id: "L3_servicos", emotion: "clear, professional", text: "Criamos sites profissionais, sistemas inteligentes e experiências que conectam empresas aos seus clientes." },
  { id: "L3b_crm", emotion: "confident, clear → proud, natural", text: "Do projeto mais simples ao sistema mais completo. Um CRM com painel em tempo real, chat ao vivo, pedidos, encomendas e campanhas no WhatsApp... tudo integrado, em um só lugar." },
  { id: "L4_ia", emotion: "inspiring, assured", text: "Com inteligência artificial e automações, seu negócio ganha mais organização, agilidade e liberdade para crescer." },
  { id: "L5_projetos", emotion: "proud, natural", text: "Da primeira ideia ao projeto no ar, cada detalhe importa." },
  { id: "L6_assinatura", emotion: "deep, confident", text: "ConectFly. Conecte. Automatize. Evolua." },
  { id: "L7_encerramento", emotion: "warmly, cinematic finish", text: "O futuro do seu negócio começa aqui." },
];
let cursor = 0;
for (const s of sentences) {
  const expected = s.text.split(/\s+/);
  const ws = words.slice(cursor, cursor + expected.length);
  ws.forEach((w, i) => {
    if (norm(w.text) !== norm(expected[i])) throw new Error(`Alinhamento divergente em ${s.id}: "${w.text}" ≠ "${expected[i]}"`);
  });
  cursor += expected.length;
  s.words = ws;
}
if (cursor !== words.length) throw new Error(`Sobraram ${words.length - cursor} palavras sem frase`);

const findWord = (text, nth = 0) => {
  const hits = words.filter((w) => norm(w.text) === norm(text));
  if (!hits[nth]) throw new Error(`Marcador não encontrado: ${text}#${nth}`);
  return hits[nth];
};

// Marcadores que guiam a montagem (o vídeo segue a voz).
const markerDefs = {
  primeira_palavra: ["E"], conectfly_1: ["ConectFly,"],
  sites: ["sites"], sistemas: ["sistemas"], experiencias: ["experiências"], conectam: ["conectam"], clientes: ["clientes."],
  crm_do: ["Do"], crm_simples: ["simples"], crm_completo: ["completo."], crm: ["CRM"], crm_painel: ["painel"],
  crm_chat: ["chat"], crm_pedidos: ["pedidos,"], crm_encomendas: ["encomendas"], crm_campanhas: ["campanhas"],
  crm_whatsapp: ["WhatsApp..."], crm_integrado: ["integrado,"], crm_lugar: ["lugar."],
  inteligencia_artificial: ["inteligência"], automacoes: ["automações,"], organizacao: ["organização,"], agilidade: ["agilidade"], liberdade: ["liberdade"],
  primeira_ideia: ["primeira"], projeto_no_ar: ["projeto", 1], detalhe: ["detalhe"],
  conectfly_2: ["ConectFly.", 1], conecte: ["Conecte."], automatize: ["Automatize."], evolua: ["Evolua."], futuro: ["futuro"], aqui: ["aqui."],
};
const markers = {};
for (const [k, [w, nth]] of Object.entries(markerDefs)) {
  const hit = findWord(w, nth ?? 0);
  markers[k] = { word: hit.text, start_s: hit.start, end_s: hit.end, start_frame: f(hit.start), end_frame: f(hit.end) };
}

const out = {
  generated_by: "scripts/build-timeline.mjs",
  sources: SOURCES,
  alignment: "ElevenLabs Scribe v1 (forced alignment, word level) — um arquivo por take em assets/audio/source/",
  fps: FPS,
  segments: SEGMENTS,
  video_duration_s: VIDEO_DURATION,
  video_duration_frames: VIDEO_DURATION * FPS,
  sentences: sentences.map((s) => ({
    id: s.id, emotion_tags: s.emotion, text: s.text,
    start_s: s.words[0].start, end_s: s.words.at(-1).end, start_frame: f(s.words[0].start), end_frame: f(s.words.at(-1).end),
    words: s.words.map((w) => ({ text: w.text, start_s: w.start, end_s: w.end, start_frame: f(w.start), end_frame: f(w.end) })),
  })),
  markers,
};
fs.writeFileSync("narration-timeline.json", JSON.stringify(out, null, 2));
fs.mkdirSync("src/data", { recursive: true });
fs.writeFileSync("src/data/narration-timeline.json", JSON.stringify(out, null, 2));
for (const s of out.sentences) console.log(`${s.id.padEnd(16)} ${s.start_s.toFixed(2)}–${s.end_s.toFixed(2)}s  [${s.start_frame}–${s.end_frame}]`);
console.log(Object.entries(markers).map(([k, m]) => `${k}@${m.start_s}`).join("  "));

// ---------------- Corte de 15 s (edição própria, só o take "main") ----------------
const srcMain = (text, nth = 0) => spokenWords(SOURCES.main.align).filter((w) => norm(w.text) === norm(text))[nth];
const segA = { src: "main", src_start: 0.0, src_end: r3(srcMain("longe?").end + 0.08), at: 0.5 };
const segB = { src: "main", src_start: r3(srcMain("ConectFly.", 1).start - 0.14), src_end: r3(srcMain("aqui.").end + 0.12), at: 6.4 };
const mapB = (t) => r3(t - segB.src_start + segB.at);
const cut15 = {
  duration_s: 15, fps: FPS, segments: [segA, segB],
  markers: {
    primeira_palavra: r3(srcMain("E").start - segA.src_start + segA.at),
    conectfly: mapB(srcMain("ConectFly.", 1).start), conecte: mapB(srcMain("Conecte.").start), automatize: mapB(srcMain("Automatize.").start),
    evolua: mapB(srcMain("Evolua.").start), futuro: mapB(srcMain("futuro").start), aqui: mapB(srcMain("aqui.").start), aqui_end: mapB(srcMain("aqui.").end),
  },
};
fs.writeFileSync("src/data/cut15.json", JSON.stringify(cut15, null, 2));
console.log("cut15", JSON.stringify(cut15.markers));
