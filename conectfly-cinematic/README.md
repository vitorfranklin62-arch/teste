# ConectFly Cinematic Experience 2.0

Comercial cinematográfico da ConectFly produzido de forma 100% programática:
**Remotion + Three.js** para imagem, **ElevenLabs v4** para locução, **ElevenLabs Sound Effects**
para o sound design, trilha original composta por código, **Playwright** para capturar projetos
reais e **FFmpeg** para auditoria.

> **Leia antes:** [`PRODUCTION_REPORT.md`](PRODUCTION_REPORT.md). Ele registra o que foi entregue,
> as restrições do ambiente (site oficial e `api.elevenlabs.io` bloqueados pela rede) e o que
> falta para a versão final de marca: **a logo oficial, a paleta oficial e os cases do site**.

## Entregas

| Arquivo | Descrição |
|---|---|
| `conectfly_reels_fullhd.mp4` | 1080×1920 · 9:16 · 30 fps · H.264 + AAC · 54 s (inclui a seção CRM “do simples ao complexo”) |
| `conectfly_horizontal_fullhd.mp4` | 1920×1080 · 16:9 · 30 fps · 54 s · recomposição própria (não é o vertical esticado) |
| `conectfly_reels_15s.mp4` | Corte publicitário próprio de 15 s, com edição e CTA próprios |
| `conectfly_cover.png` | Capa 1080×1920 (assinatura + CTA) |
| `assets/audio/final/conectfly_narration.wav` | Locução ElevenLabs v4 (voz Thales) editada na timeline — 2 takes unidos em pausas naturais, sem processamento |
| `assets/audio/final/conectfly_soundtrack.wav` | Trilha original (54 s) |
| `assets/audio/final/conectfly_final_mix.wav` | Mix master do corte principal (−14 LUFS, < −1 dBTP) |
| `assets/audio/final/conectfly_{voice,music,sfx}_only.wav` | Stems pós-fader (32-bit float) — somados = mix pré-limitador |
| `assets/audio/final/conectfly_sfx/` | Os 6 efeitos ElevenLabs |
| `audit/` | Relatório da auditoria + contact sheets dos MP4 finais |
| `brand-guidelines.json` | Paleta, gradientes, tipografia, CTA — **provisórios** (ver relatório) |
| `narration-timeline.json` | Frases e palavras com início/fim em segundos e frames (alinhamento forçado) |

## Pipeline (audio-first)

```
roteiro → ElevenLabs v4 (narração) → alinhamento forçado (Scribe) → narration-timeline.json
       → trilha (scripts/soundtrack.py) + SFX ElevenLabs → mix/master (scripts/mix.py)
       → Remotion (cenas sincronizadas aos marcadores reais) → MP4 → auditoria (scripts/audit.sh)
```

O vídeo segue a voz: cada entrada de texto, corte de câmera e efeito usa o tempo real da
palavra (ex.: o núcleo de IA aparece em "inteligência", cada palavra de *Conecte · Automatize ·
Evolua* entra no início real da sílaba falada).

## Como rodar

```bash
npm ci
pip install numpy scipy soundfile pyloudnorm pillow
cp .env.example .env            # opcional: só para gerar áudio pela API direta

npm run elevenlabs -- --dry-run # valida conta, modelos (eleven_v4), voz e estima uso — sem gastar créditos
npm run elevenlabs              # gera só o que faltar (cache em assets/audio)
npm run capture                 # Playwright: site oficial + projetos (ver URLs no topo do script)
python3 scripts/redact_crm.py <pasta-com-prints>   # telas do CRM: corta o Windows e desfoca dados pessoais (LGPD)
npm run timeline                # alinhamento → narration-timeline.json + src/data/cut15.json
npm run soundtrack              # trilha original 40 s e 15 s
npm run mix                     # stems + masters
npm run prepare-public          # copia assets para public/
npm run render                  # 3 MP4 + capa em out/
npm run audit                   # ffprobe, pretos, congelamentos, loudness, contact sheets
```

`npm run studio` abre o Remotion Studio para ajustes visuais.

### Trocar pela logo oficial

1. Salve a logo em `assets/brand/conectfly_logo_original.png`.
2. Em `brand-guidelines.json` (e `src/data/brand-guidelines.json`) defina
   `"logo": { "official_file": "brand/conectfly_logo_original.png" }` e ajuste `palette`.
3. `npm run prepare-public && npm run render`.

## Estrutura

```
src/
  Root.tsx               composições ReelsMain · HorizontalMain · Reels15 (tempos vindos da narração)
  three/Universe.tsx     universo 3D: estrelas, partícula-semente, portal, núcleo de IA, rede, logo em partículas
  scenes/scenes.tsx      cenas principais + montagem do corte de 15 s (layout recomposto por proporção)
  scenes/crm.tsx         seção CRM: simples → completo, deck de módulos reais, parede “tudo integrado”
  ui/kit.tsx             tipografia cinética, notebook, smartphone, vidro, chips, wordmark, safe areas
  lib/                   marca, fontes locais, tempo/easing
  data/                  narration-timeline.json, cut15.json, brand-guidelines.json, captures.json
scripts/                 elevenlabs, capture, redact_crm, build-timeline, soundtrack, mix, render, stills, audit
assets/                  capturas reais, referências, áudio-fonte, SFX, stems
```

Toda animação é função pura do frame atual (determinística); sem `Math.random` nem eventos em tempo real.
