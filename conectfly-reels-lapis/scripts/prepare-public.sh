#!/usr/bin/env bash
# Copia os assets para public/ (servido pelo Remotion no render).
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p public/captures public/audio public/brand
cp assets/captures/* public/captures/
[ -f assets/audio/conectfly_reels_mix.wav ] && cp assets/audio/conectfly_reels_mix.wav public/audio/ || true
[ -f assets/conectfly-logo.png ] && cp assets/conectfly-logo.png public/brand/ || true
echo "public/ pronto"
