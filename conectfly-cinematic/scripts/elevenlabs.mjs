// Integração direta com a API oficial ElevenLabs (alternativa ao conector MCP).
//
// Nesta produção o áudio foi gerado pelo conector ElevenLabs da sessão (o host
// api.elevenlabs.io estava bloqueado pela política de rede do ambiente). Este script
// reproduz o mesmo pipeline via HTTP autenticado quando a rede/credenciais permitirem.
//
// Segurança: a chave vem de ELEVENLABS_API_KEY (.env local ou segredo do ambiente);
// nunca é impressa nem gravada. Custos: reaproveita arquivos existentes (cache) e
// só gera o que falta. Use --dry-run para apenas validar conta/modelos e estimar uso.
//
// Uso: node --env-file=.env scripts/elevenlabs.mjs [--dry-run] [--only=voice|music|sfx|align]
import fs from "node:fs";
import path from "node:path";

const API = "https://api.elevenlabs.io";
const KEY = process.env.ELEVENLABS_API_KEY;
const VOICE = process.env.ELEVENLABS_VOICE_ID || "Q0l58S3V13QxkdteObmh"; // Thales (biblioteca ElevenLabs), escolhido na seleção de vozes
const DRY = process.argv.includes("--dry-run");
const ONLY = (process.argv.find((a) => a.startsWith("--only=")) || "").split("=")[1];
const SRC = "assets/audio/source";
const SFX_DIR = "assets/audio/sfx_src";

if (!KEY) {
  console.error("✘ ELEVENLABS_API_KEY ausente. Copie .env.example para .env e preencha (ou configure o segredo do ambiente).");
  process.exit(1);
}

async function api(method, route, body, { json = true, form = false } = {}) {
  const headers = { "xi-api-key": KEY };
  if (body && !form) headers["Content-Type"] = "application/json";
  const res = await fetch(API + route, { method, headers, body: body ? (form ? body : JSON.stringify(body)) : undefined });
  if (res.status === 429) throw new Error(`Rate limit em ${route} — aguarde e rode de novo (o cache evita regerar o que já existe).`);
  if (!res.ok) throw new Error(`${method} ${route} → HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return json ? res.json() : Buffer.from(await res.arrayBuffer());
}

const cached = (f) => fs.existsSync(f) && fs.statSync(f).size > 0;

// --- 1. Conta, modelos, voz ---------------------------------------------------
const sub = await api("GET", "/v1/user/subscription");
console.log(`Plano: ${sub.tier} · créditos usados ${sub.character_count}/${sub.character_limit}`);
const models = await api("GET", "/v1/models");
const has = (id) => models.find((m) => m.model_id === id);
const ttsModel = has("eleven_v4") ? "eleven_v4" : has("eleven_v3") ? "eleven_v3" : "eleven_multilingual_v2";
console.log(`Modelo TTS: ${ttsModel}${ttsModel !== "eleven_v4" ? " (eleven_v4 indisponível nesta conta)" : ""}`);
const voice = await api("GET", `/v1/voices/${VOICE}`).catch(() => null);
if (!voice) throw new Error(`Voz ${VOICE} não acessível nesta conta — escolha outra em /v1/voices e defina ELEVENLABS_VOICE_ID.`);
console.log(`Voz: ${voice.name}`);
// Formato: WAV/PCM 44,1 kHz se o plano permitir; senão MP3 44,1 kHz 192 kbps.
const pcmOk = ["pro", "scale", "business", "enterprise"].some((t) => String(sub.tier).toLowerCase().includes(t));
const fmt = pcmOk ? "pcm_44100" : "mp3_44100_192";

// --- 2. Roteiro final (tags = direção de interpretação, não são faladas) -----
const SCRIPT =
  "[calm, intriguing] E se a tecnologia pudesse levar o seu negócio muito mais longe? [pause] [confident, warm] Na ConectFly, transformamos ideias em soluções digitais de verdade. [pause] [clear, professional] Criamos sites profissionais, sistemas inteligentes e experiências que conectam empresas aos seus clientes. [pause] [inspiring, assured] Com inteligência artificial e automações, seu negócio ganha mais organização, agilidade e liberdade para crescer. [pause] [proud, natural] Da primeira ideia ao projeto no ar, cada detalhe importa. [long pause] [deep, confident] ConectFly. [pause] Conecte. [short pause] Automatize. [short pause] Evolua. [pause] [warmly] O futuro do seu negócio começa aqui.";
const spoken = SCRIPT.replace(/\[[^\]]*\]/g, "").replace(/\s+/g, " ").trim();
console.log(`Roteiro: ${SCRIPT.length} caracteres enviados (${spoken.length} falados).`);
if (DRY) process.exit(0);

// --- 3. Narração --------------------------------------------------------------
const narr = path.join(SRC, pcmOk ? "narration_original.pcm" : "narration_original.mp3");
if ((!ONLY || ONLY === "voice") && !cached(narr)) {
  // Eleven v4: só stability e similarity_boost (sem style/speed/speaker boost legados, sem SSML).
  const audio = await api("POST", `/v1/text-to-speech/${VOICE}?output_format=${fmt}`, {
    text: SCRIPT, model_id: ttsModel, language_code: "pt", voice_settings: { stability: 0.5, similarity_boost: 0.8 },
  }, { json: false });
  fs.writeFileSync(narr, audio);
  console.log("✔ narração", narr);
}

// --- 4. Alinhamento forçado (timestamps por palavra) -------------------------
const alignOut = path.join(SRC, "alignment_words_raw.json");
if ((!ONLY || ONLY === "align") && !cached(alignOut)) {
  const form = new FormData();
  form.append("file", new Blob([fs.readFileSync(narr)]), path.basename(narr));
  form.append("text", SCRIPT);
  const al = await api("POST", "/v1/forced-alignment", form, { form: true });
  fs.writeFileSync(alignOut, JSON.stringify({ words: al.words.map((w) => ({ text: w.text, type: "word", start: w.start, end: w.end })) }, null, 2));
  console.log("✔ alinhamento", alignOut);
}

// --- 5. Trilha (ElevenLabs Music) ---------------------------------------------
const music = "assets/audio/stems/music_elevenlabs_40s.mp3";
if ((!ONLY || ONLY === "music") && !cached(music)) {
  const musicModel = has("music_v2_5") ? "music_v2_5" : undefined;
  const audio = await api("POST", "/v1/music", {
    prompt: "Premium futuristic cinematic technology commercial soundtrack, sophisticated electronic orchestral hybrid, deep atmospheric synthesizers, warm analog pads, subtle cinematic percussion, elegant digital pulses, inspiring progression, mysterious opening, emotional technological reveal, confident corporate energy, strong but refined final brand signature, modern high-end software company advertisement, spacious immersive stereo mix, no vocals, no lyrics, no recognizable copyrighted melodies, clean cinematic production.",
    music_length_ms: 40000, force_instrumental: true, ...(musicModel ? { model_id: musicModel } : {}),
  }, { json: false }).catch((e) => (console.warn("⚠ Música indisponível:", e.message, "— mantendo a trilha original sintetizada (scripts/soundtrack.py)."), null));
  if (audio) fs.writeFileSync(music, audio), console.log("✔ trilha", music);
}

// --- 6. Efeitos sonoros --------------------------------------------------------
const SFX = {
  sfx01_energy_awakening: ["Deep cinematic digital energy pulse awakening in a large futuristic space, subtle low frequency impact, elegant shimmering particles, short atmospheric tail.", 3],
  sfx02_digital_portal: ["Immersive futuristic portal opening, layered synthetic whoosh, shimmering energy field, smooth rising resonance, spacious cinematic finish.", 3],
  sfx03_interface_transition: ["Premium futuristic user interface transition, delicate glassy electronic sweep, precise subtle digital clicks, polished technological texture.", 1.5],
  sfx04_artificial_intelligence: ["Futuristic artificial intelligence processing ambience, delicate digital pulses, flowing synthetic signal patterns, sophisticated computational sound, no robotic voices.", 5],
  sfx05_connection_network: ["Elegant sequence of synchronized digital connections activating, soft crystalline pulses and flowing electronic energy, clean premium technological sound.", 2],
  sfx06_brand_reveal: ["Powerful yet sophisticated cinematic brand logo reveal, warm low frequency impact, luminous harmonic shimmer and short polished reverb tail.", 4],
};
if (!ONLY || ONLY === "sfx") {
  for (const [name, [text, dur]] of Object.entries(SFX)) {
    const f = path.join(SFX_DIR, `${name}.mp3`);
    if (cached(f)) continue;
    const audio = await api("POST", "/v1/sound-generation", { text, duration_seconds: dur, prompt_influence: 0.4, model_id: "eleven_text_to_sound_v2" }, { json: false });
    fs.writeFileSync(f, audio);
    console.log("✔ sfx", f);
  }
}
console.log("Pronto. Próximo passo: npm run timeline && npm run soundtrack && npm run mix && npm run render");
