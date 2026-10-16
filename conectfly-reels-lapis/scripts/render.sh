#!/usr/bin/env bash
# Render final: H.264 yuv420p ~15 Mbps (alvo da briefing 12–18), AAC 48 kHz 320 kbps, + capa.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p dist
npx remotion render src/index.ts ConectFlyReels dist/conectfly_reels_viral_1080x1920.mp4 \
  --codec=h264 --pixel-format=yuv420p --image-format=png --video-bitrate=15M --x264-preset=slow \
  --audio-codec=aac --audio-bitrate=320k --gl=swangle --log=warn
npx remotion still src/index.ts Cover dist/conectfly_reels_capa.png --gl=swangle --log=warn
python3 scripts/srt.py
