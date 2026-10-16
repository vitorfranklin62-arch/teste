#!/usr/bin/env bash
# Render final em 3 segmentos intermediários (ProRes HQ, sem áudio) + encode final com FFmpeg.
#   seg 1: frames 0–275    (0–9,2 s)  lápis 3D, impacto, revelação
#   seg 2: frames 276–1030 (9,2–34,4 s) cenas 2D (WebGL nunca é montado)
#   seg 3: frames 1031–1049 (34,4–35 s) volta aos lápis (loop)
# Motivo: o renderizador WebGL por software trava ao desmontar o canvas 3D no meio do render.
# Final: H.264 High yuv420p ~15 Mbps (alvo 12–18), AAC 48 kHz 320 kbps, faststart.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p dist build
common=(--codec=prores --prores-profile=hq --muted --image-format=png --gl=swangle --log=warn)
npx remotion render src/index.ts ConectFlyReels build/seg1.mov --frames=0-275 "${common[@]}"
npx remotion render src/index.ts ConectFlyReels build/seg2.mov --frames=276-1030 "${common[@]}"
npx remotion render src/index.ts ConectFlyReels build/seg3.mov --frames=1031-1049 "${common[@]}"
printf "file 'seg1.mov'\nfile 'seg2.mov'\nfile 'seg3.mov'\n" > build/concat.txt
ffmpeg -v error -y -f concat -safe 0 -i build/concat.txt -i assets/audio/conectfly_reels_mix.wav \
  -map 0:v -map 1:a -c:v libx264 -preset slow -profile:v high -pix_fmt yuv420p -r 30 \
  -b:v 15M -maxrate 18M -bufsize 30M -x264-params "keyint=60:min-keyint=30" \
  -c:a aac -b:a 320k -ar 48000 -ac 2 -t 35 -movflags +faststart dist/conectfly_reels_viral_1080x1920.mp4
npx remotion still src/index.ts Cover dist/conectfly_reels_capa.png --gl=swangle --log=warn
python3 scripts/srt.py
echo "render ok"
