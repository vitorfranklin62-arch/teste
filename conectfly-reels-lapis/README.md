# ConectFly — Reels "Os dois lápis" (retenção)

Reels cinematográfico de 35 s (1080×1920, 30 fps) que usa a curiosidade de **dois lápis quase se tocando**
para prender a atenção e, depois do impacto, transformar esse tempo de tela em interesse pelos serviços da
ConectFly e em conversa pelo WhatsApp.

## Entregas (`dist/`)

| Arquivo | Conteúdo |
|---|---|
| `conectfly_reels_viral_1080x1920.mp4` | Vídeo final · H.264 yuv420p ~15 Mbps · AAC 48 kHz 320 kbps · −14 LUFS |
| `conectfly_reels_capa.png` | Capa 1080×1920 (macro dos lápis + gancho) |
| `conectfly_reels_legendas.srt` | Legendas geradas da timeline da locução final (blocos curtos, ≤ 2 linhas) |
| `conectfly_reels_roteiro.txt` | Roteiro final, tempo a tempo, com as mudanças de copy |
| `audit/` | Relatório de auditoria + thumbnails nos segundos 0, 3, 7, 9, 15, 20, 25, 29 e 33 |

Áudio: `assets/audio/conectfly_reels_mix.wav` (master) e stems `stem_voice|music|sfx.wav`;
locução por frase em `assets/voice/line_1..7.wav`.

## Como reproduzir

```bash
npm ci
pip install numpy scipy soundfile pyloudnorm
python3 scripts/voice.py        # divide o take ElevenLabs em 1 arquivo por frase + timeline (src/data/timeline.json)
python3 scripts/soundtrack.py   # trilha original 35 s
python3 scripts/mix.py          # mix + master (−14 LUFS, ≤ −1 dBTP), impacto alinhado em 7,000 s
bash scripts/prepare-public.sh  # assets → public/
bash scripts/render.sh          # MP4 + capa + SRT em dist/
bash scripts/audit.sh           # checagens + thumbnails
```

`npx remotion studio src/index.ts` abre o editor visual.

## Como foi feito

- **Lápis 3D (Three.js):** superfície paramétrica real de um lápis sextavado apontado, com
  `r(θ,y) = min(sextavado(θ), cone(y))`, que gera naturalmente a borda recortada entre laca e madeira.
  Laca preta com clearcoat, cedro com veios procedurais e grafite com brilho metálico.
  Iluminação macro com key lateral, rim lights (branco frio + acento) e environment map.
  O vão entre as pontas fecha de forma quase imperceptível e encosta em exatamente **7,000 s** (frame 210).
- **Impacto:** flash, onda de choque, fragmentos de grafite, faíscas e linhas de energia que desenham uma
  interface. Depois, **silêncio de contraste** (−44 a −48 dB) até a locução entrar.
- **Match cut:** o "7" nasce no ponto exato do contato e se encaixa na frase "Você esperou 7 segundos por isso."
- **Loop:** os últimos 0,6 s voltam ao enquadramento inicial dos lápis.
- Toda animação é função do frame (determinística). Áreas seguras: 250 px topo, 360 px base, 170 px direita.

## Pendências e substitutos (registrados com transparência)

| Item da briefing | Situação |
|---|---|
| `assets/referencia.mp4` | **Não foi enviado** (só o JSON). A técnica foi recriada a partir da descrição da briefing; nada do vídeo original foi usado |
| Logo oficial (`assets/conectfly-logo.png`) | **Indisponível**: em 16/10/2026 o domínio `conectfly-site.vitinhonavoz18.workers.dev` não resolve no DNS público (ENOTFOUND, inclusive fora deste ambiente), e o ambiente também não acessa a internet aberta. Usada **só a palavra "ConectFly"** em tipografia neutra, como a briefing manda. Para trocar: salve a logo em `assets/conectfly-logo.png`, aponte `LOGO_FILE` em `src/theme/brand.ts` para `brand/conectfly-logo.png` e rode `prepare-public` + `render` |
| Cores oficiais | Provisórias: preto, branco e **um** acento (`#38D3EE`, em `src/theme/brand.ts`), como a briefing pede na ausência de tokens |
| Screenshots | **Reais**: site da Farmácia Preço Bom (projeto ConectFly) e CRM Farmácia Preço Bom (dados de clientes desfocados). Outros cases (Barber Connection, TG Baterias, Robson Lopes, FlyControl) aguardam prints do cliente. O repo `ADVOCACIA-RENATO-SANTOS-` **não** foi usado: é um fork de projeto open source de terceiros (DeskcommCRM), não um trabalho da ConectFly. O app é um **conceito ilustrativo** e o fluxo de IA usa **dados fictícios**, ambos sinalizados na tela |
| Locução | ElevenLabs `eleven_v4`, voz pt-BR "Thales", gerada pelo conector ElevenLabs da sessão. A API direta está bloqueada pela rede |
| Música | **Original**, sintetizada por código (`scripts/soundtrack.py`). ElevenLabs Music não está disponível no conector desta sessão |
| Blender | Não instalado; os lápis foram feitos em Three.js (a alternativa prevista na briefing) |

## Checklist de verificação final

- [x] MP4 real 1080×1920, 30 fps, 35 s
- [x] Gancho dos lápis em 0–7 s; colisão em 7,0 s
- [x] Virada comercial antes de 15 s (12,2 s)
- [x] Sites, sistemas, aplicativos e CRM + IA expostos
- [x] Logo oficial: indisponibilidade documentada (palavra "ConectFly" neutra)
- [x] WhatsApp (71) 98442-6119 legível no encerramento
- [x] Som original e licenciado; locução inteligível; legendas (SRT + queimadas) sincronizadas
- [ ] Escuta humana da mix e aprovação da logo/cores oficiais
