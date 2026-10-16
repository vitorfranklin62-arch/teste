# PRODUCTION REPORT — ConectFly Cinematic Experience 2.0

Data: 2026-10-16 · Ambiente: container cloud Claude Code (4 vCPU, sem GPU)

## 1. Status em uma frase

Comercial principal de **54 s** (9:16 e 16:9) e corte próprio de 15 s, renderizados e auditados
(seção 10), com locução ElevenLabs v4 real, 6 efeitos ElevenLabs reais, sincronia por alinhamento
forçado e **telas reais** do portfólio. Destaque desta versão: uma seção de CRM, **“do projeto mais
simples ao sistema mais completo”**, feita com as telas reais do CRM Farmácia Preço Bom, com
**dados pessoais de clientes desfocados**. **A identidade visual da ConectFly é provisória**, porque o
site oficial está bloqueado neste ambiente (seção 2).

## 2. Restrições do ambiente (registradas com precisão)

| Recurso | Situação | Efeito na produção |
|---|---|---|
| `conectfly-site.vitinhonavoz18.workers.dev` | **Bloqueado** pela política de rede (proxy respondeu 403 ao CONNECT; Playwright: `ERR_TUNNEL_CONNECTION_FAILED`) | Sem logo, paleta, tipografia ou CTA oficiais; sem capturas de FlyControl, Robson Lopes Cabeleireiro, TG Baterias e Barber Connection |
| `api.elevenlabs.io` (API direta) | **Bloqueado** pela política de rede | Áudio gerado pelo **conector ElevenLabs** da sessão (mesmos modelos, mesma conta). `scripts/elevenlabs.mjs` implementa a via HTTP direta, mas **não foi executado** |
| ElevenLabs Music (`music_v2_5`) | **Indisponível**: o conector desta sessão é a versão restrita (voz + SFX, sem música) | Trilha **original composta por código** (seção 7) |
| Repositório `CRM-FLYCONTROL` | Vazio (nenhum commit) | Sem telas do FlyControl |
| GPU | Inexistente | WebGL via SwiftShader (CPU): ~1h15 de render por versão de 54 s, determinístico |

**Como liberar:** em *Environment settings → Network access*, adicione
`conectfly-site.vitinhonavoz18.workers.dev` e `api.elevenlabs.io` aos domínios permitidos
(docs: https://code.claude.com/docs/en/cloud-environments#network-access). Depois rode `npm run capture`,
atualize `brand-guidelines.json` e rode `npm run render`.

## 3. Estrutura do comercial principal (54 s)

| Tempo | Cena | Locução (tempo real da palavra) |
|---|---|---|
| 0,0–5,2 | 1 · Nasce uma conexão: partícula → raios → portal | “E se a tecnologia…” (0,67) |
| 5,2–9,8 | 2 · Universo ConectFly: travessia do portal, marca com iluminação progressiva | “Na **ConectFly**…” (5,40) |
| 9,8–16,5 | 3 · Sites → sistemas (dashboard real) → smartphone responsivo | “sites” 10,29 · “sistemas” 11,73 · “conectam” 14,09 |
| 16,5–29,9 | **4 · CRM: do simples ao complexo** | “Do projeto mais simples” 16,90 · “completo” 19,58 · “CRM” 20,82 · “painel” 21,70 · “chat” 23,22 · “pedidos” 24,26 · “encomendas” 24,90 · “campanhas” 25,74 · “integrado” 27,66 |
| 29,9–37,7 | 5 · Inteligência artificial: solicitação → núcleo de IA → atendimento/CRM/automações | “inteligência” 30,21 · “automações” 31,69 |
| 37,7–42,4 | 6 · Showroom de projetos reais → dissolvem em partículas | “primeira ideia” 37,93 · “detalhe” 40,21 |
| 42,4–48,2 | 7 · Conecte · Automatize · Evolua (rede de conexões) | 43,14 · 44,53 · 45,65 · 47,01 |
| 48,2–54,0 | 8 · Partículas formam a marca → tagline → CTA | “O futuro…” 48,37 · “aqui” 50,37 |

### Seção CRM — “do simples ao complexo”

1. **Simples:** um único site (Farmácia Preço Bom, mobile) flutuando sozinho.
2. **Completo:** uma *escada de complexidade* (Site → Painel → Chat → Pedidos → Encomendas → Campanhas)
   acende degrau a degrau, cada um na palavra falada.
3. **Módulos reais em deck 3D:** Dashboard (com selo “AO VIVO” em “painel em tempo real”), Chat ao vivo
   com IA, Pedidos em kanban, Encomendas com aviso no WhatsApp e Campanhas no WhatsApp. As telas de trás
   recuam com profundidade de campo; a da frente faz *push-in* lento na área de interesse, para ficar
   legível no celular.
4. **“Tudo integrado, em um só lugar”:** o deck se abre numa parede curva com os 5 módulos ligados a
   um núcleo ConectFly.
   A trilha segue a mesma ideia: começa com **uma única nota**, ganha harmonia em “completo” e o
   groove inteiro entra em “CRM”.

## 4. Privacidade (LGPD): telas do CRM

Os prints do CRM enviados pelo cliente trazem **dados pessoais de clientes da farmácia**: nomes, fotos,
telefones, endereço e medicamentos, que são **dado pessoal sensível (saúde)**. Antes de entrar no vídeo,
`scripts/redact_crm.py`:
- corta a barra de título e a barra de tarefas do Windows e a barra de rolagem;
- desfoca (pixelização + gaussiano) nomes e avatares dos contatos, o texto da mensagem, nomes, itens,
  endereço e telefones dos pedidos e encomendas, a pergunta de teste e a mensagem de erro do widget da IA;
- desfoca os valores de faturamento e vendas do dashboard (sigilo comercial; hoje estão zerados).

**Os prints originais não foram versionados** no repositório; só as versões redigidas
(`assets/captures/crm_real/`). O nome “Vitor Franklin” (conta da dona, no topo das telas) foi mantido.
**Recomendo** que a farmácia confirme a autorização para exibir o sistema em material publicitário.

## 5. Identidade visual (provisória)

- **Logo:** sem acesso à oficial, usei um **wordmark tipográfico** “ConectFly” (Sora ExtraBold + gradiente),
  sem nenhum símbolo inventado. Para trocar, defina `logo.official_file` em `brand-guidelines.json`.
- **Paleta:** mediana das cores saturadas das imagens de referência enviadas (`#38D3EE` · `#3B6FD8` ·
  `#4F5BE8` · `#7C4DFF` · `#A23BD6`, fundo `#04051A`).
- **Tipografia:** Sora (títulos) e Inter (textos), pacotes locais OFL.
- **CTA:** “SOLICITE SEU ORÇAMENTO.” + `conectfly-site.vitinhonavoz18.workers.dev`, o único link oficial conhecido.
- **Cases com tela real:** Site Farmácia Preço Bom (build local do repo, desktop + mobile) e **CRM Farmácia
  Preço Bom** (dashboard, chat ao vivo, pedidos, encomendas, campanhas; prints do cliente, redigidos).
  FlyControl, Robson Lopes Cabeleireiro, TG Baterias e Barber Connection aparecem **só como nomes**, sem telas inventadas.

## 6. Locução: ElevenLabs v4

- **Modelo:** `eleven_v4` (via conector ElevenLabs). Interpretação por pontuação e Audio Tags; sem SSML
  e sem Style/Speed/Speaker Boost. O conector não expõe `stability`/`similarity_boost` (valeram os
  padrões da voz); o script da API direta usa 0,50 / 0,80.
- **Seleção** (3 amostras de ~8,6 s, mesma frase, 1 geração cada):

  | Voz (biblioteca ElevenLabs, pt-BR) | F0 mediana | Faixa F0 p10–p90 | Ruído de fundo | Pausa entre frases |
  |---|---|---|---|---|
  | **Thales — Sophisticated and Vibrant** ✔ | 156 Hz | 125–224 Hz | −85 dBFS | 0,52 s |
  | Rômulo Franklin — Radialista & Locutor | 189 Hz | 163–206 Hz | −60 dBFS | 0,47 s |
  | Leonardo Hamaral | 127 Hz | 98–194 Hz | −69 dBFS | 0,18 s |

  **Eu não ouvi os áudios** (o ambiente não tem saída de som); a escolha foi por métricas
  (`scripts/analyze_voice.py`) e pela descrição da voz. Escuta humana final recomendada.
- **Takes:** take principal (36,64 s) e take CRM (12,64 s), mesma voz e modelo. Comparação objetiva:
  ruído −85,9 vs −85,7 dBFS, loudness −24,6 vs −24,1 LUFS, F0 152 vs 167 Hz (entrega um pouco mais
  enérgica, coerente com a direção “confident”).
- **Edição:** o take CRM entra no silêncio natural após “clientes.” (15,50–15,84 s do take principal);
  os dois lados mantêm as pausas originais (~0,8 s e ~0,6 s). Nenhum time-stretch, aceleração ou corte de
  pausa. Formato do conector: MP3 44,1 kHz/128 kbps; `conectfly_narration.wav` é a narração editada, sem processamento.

### Roteiro final (tags = direção, não são faladas)

```
[calm, intriguing] E se a tecnologia pudesse levar o seu negócio muito mais longe? [pause]
[confident, warm] Na ConectFly, transformamos ideias em soluções digitais de verdade. [pause]
[clear, professional] Criamos sites profissionais, sistemas inteligentes e experiências que conectam empresas aos seus clientes.
[confident, clear] Do projeto mais simples ao sistema mais completo. [pause]
Um CRM com painel em tempo real, chat ao vivo, pedidos, encomendas e campanhas no WhatsApp...
[proud, natural] tudo integrado, em um só lugar.
[inspiring, assured] Com inteligência artificial e automações, seu negócio ganha mais organização, agilidade e liberdade para crescer. [pause]
[proud, natural] Da primeira ideia ao projeto no ar, cada detalhe importa. [long pause]
[deep, confident] ConectFly. [pause] Conecte. [short pause] Automatize. [short pause] Evolua. [pause]
[warmly] O futuro do seu negócio começa aqui.
```

Sincronia: alinhamento forçado palavra a palavra de cada take → `narration-timeline.json` (s + frames,
já na timeline do vídeo). Conferido com detecção de silêncio independente (FFmpeg): ex. fim de
“longe?” 3,973 s × início do silêncio 3,974 s.

## 7. Trilha musical: origem e licença

**Original, composta e sintetizada por código** (`scripts/soundtrack.py`): sem samples, sem melodias de
terceiros, sem vocais. Ré menor, 96 BPM, híbrido eletrônico/orquestral, reverb por convolução,
determinística. **Todas as seções derivam dos marcadores da narração**: mistério → expansão → ritmo
moderno → CRM (uma nota → harmonia → groove completo → acorde aberto em “integrado”) → descoberta (IA)
→ pico moderado (projetos) → respiro → crescimento (assinatura) → resolução em Ré maior com assinatura
de sino (Ré–Lá–Fá♯–Ré). Criada nesta produção, livre para uso comercial pela ConectFly.
Motivo: ElevenLabs Music indisponível na sessão (`npm run elevenlabs -- --only=music` gera a versão
ElevenLabs quando a API estiver liberada).

## 8. Sound design: ElevenLabs Sound Effects

Modelo `eleven_text_to_sound_v2`, prompts da briefing, 1 geração por efeito (durações automáticas de 1–3 s):
01 Energy Awakening (nascimento da partícula) · 02 Digital Portal (portal; dissolução dos projetos) ·
03 Interface Transition (cada tela/módulo do CRM, subindo de tom a cada módulo) · 04 Artificial
Intelligence (“inteligência artificial”, “automações”) · 05 Connection Network (“completo”, “integrado”,
benefícios e Conecte/Automatize/Evolua em 0, +2, +4 semitons) · 06 Brand Reveal (“CRM”, “ConectFly.” e logo final).

## 9. Mixagem e master

- Voz: HPF 70 Hz, presença +2 dB em 3 kHz, sem compressão pesada.
- Trilha: low-shelf −8 dB abaixo de 140 Hz, ar acima de 2,5 kHz, **ducking pela voz** (−11 dB, ataque 60 ms, release 450 ms).
- SFX: −10 dB, cedendo levemente à voz.
- Voz sobre a música durante a fala: **mediana +11,5 dB**.
- Master: **−14,1 LUFS, true peak −1,2 dBTP** (54 s); −14,1 LUFS / −1,2 dBTP (15 s). Limitador 4× oversampled.
- Stems em WAV 32-bit float (somados = mix pré-limitador); mix final em WAV 24-bit 48 kHz.

## 10. Auditoria técnica

(preenchida após o render — ver abaixo)

## 11. Consumo de créditos ElevenLabs

| Item | Gerações | Créditos |
|---|---|---|
| Amostras de voz | 3 | 504 |
| Narração principal | 1 | 700 |
| Efeitos sonoros | 6 | 300 |
| Alinhamento forçado (take principal) | 1 | 0 |
| **Versão 2 — narração CRM** | 1 | 219 |
| **Versão 2 — alinhamento forçado (take CRM)** | 1 | 417 |
| **Total** | **13** | **2.140** (~US$ 21 pelo preço informado pela API) |

O orçamento inicial da briefing (3 amostras + 1 narração + 6 SFX = 1.504 créditos) foi respeitado na v1.
A v2 acrescentou **um** take de locução, necessário para a seção CRM pedida, e seu alinhamento. Ao
contrário do primeiro, este alinhamento foi cobrado; daria para trocá-lo por detecção de silêncio local,
com menos precisão por palavra. Três pedidos de SFX receberam **429 (rate limit)** antes de iniciar:
nada foi gerado nem cobrado, e cada um foi reenviado uma vez.

## 12. Fontes e licenças dos assets

| Asset | Origem | Licença/uso |
|---|---|---|
| Locução | ElevenLabs `eleven_v4`, voz de biblioteca “Thales” | Uso comercial conforme o plano ElevenLabs da conta |
| Efeitos sonoros | ElevenLabs `eleven_text_to_sound_v2` | Idem |
| Trilha | Original, `scripts/soundtrack.py` | Criada nesta produção |
| Site Farmácia Preço Bom | Captura Playwright do build local do repo do cliente | Material do cliente |
| CRM Farmácia Preço Bom | Prints enviados pelo cliente, **redigidos** (seção 4) | Material do cliente; confirmar autorização da farmácia |
| Imagens de referência | Enviadas na briefing | Só referência de paleta (não aparecem no vídeo) |
| Fontes Sora e Inter | @fontsource | SIL Open Font License |
| Three.js, React, Remotion | npm | MIT; **Remotion exige licença de empresa** para companhias com mais de 3 pessoas (remotion.dev/license) |

## 13. Pendências para a versão final de marca

1. Liberar `conectfly-site.vitinhonavoz18.workers.dev` → `npm run capture` → logo, paleta, tipografia e CTA
   oficiais em `brand-guidelines.json` → `npm run render`.
2. Telas dos cases que faltam (FlyControl, Robson Lopes Cabeleireiro, TG Baterias, Barber Connection).
3. Escuta humana da locução e da mix (fone e celular).
4. Autorização da Farmácia Preço Bom para exibir o CRM no anúncio.
5. Opcional: trilha via ElevenLabs Music com `api.elevenlabs.io` liberado.
