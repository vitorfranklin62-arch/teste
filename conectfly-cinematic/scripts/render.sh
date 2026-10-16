#!/usr/bin/env bash
# Renderiza os três MP4 Full HD + capa. Requer: npm i, áudio mixado (scripts/mix.py) em public/audio.
set -euo pipefail
cd "$(dirname "$0")/.."
OUT=out; mkdir -p "$OUT"
common=(--codec=h264 --pixel-format=yuv420p --crf=16 --x264-preset=slow --audio-codec=aac --audio-bitrate=320k --gl=swangle --log=warn)
npx remotion render src/index.ts ReelsMain      "$OUT/conectfly_reels_fullhd.mp4"      "${common[@]}"
npx remotion render src/index.ts HorizontalMain "$OUT/conectfly_horizontal_fullhd.mp4" "${common[@]}"
npx remotion render src/index.ts Reels15      "$OUT/conectfly_reels_15s.mp4"         "${common[@]}"
# Capa: frame do encerramento com marca + CTA
npx remotion still src/index.ts ReelsMain "$OUT/conectfly_cover.png" --frame=1605 --gl=swangle --log=warn
