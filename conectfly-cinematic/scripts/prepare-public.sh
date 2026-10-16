#!/usr/bin/env bash
# Copia os assets de produção para public/ (servido pelo Remotion durante o render).
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p public/captures public/audio public/references public/brand
python3 - <<'PY'
from PIL import Image
Image.MAX_IMAGE_PIXELS = None
import os, shutil
c = "assets/captures"
for f in ["crm_farmacia_login_desktop.png", "crm_farmacia_login_mobile.png", "farmacia_site_desktop.png", "farmacia_site_mobile.png"]:
    shutil.copy(f"{c}/{f}", f"public/captures/{f}")
# recortes para rolagem (só a região com conteúdo renderizado)
for src, box, size, out in [
    ("farmacia_site_desktop_full.png", (0, 0, 2880, 5400), (1920, 3600), "farmacia_site_desktop_scroll.jpg"),
    ("farmacia_site_mobile_full.png", (0, 0, 1170, 7800), (780, 5200), "farmacia_site_mobile_scroll.jpg"),
]:
    if os.path.exists(f"{c}/{src}"):
        Image.open(f"{c}/{src}").crop(box).resize(size, Image.LANCZOS).convert("RGB").save(f"public/captures/{out}", quality=92)
    elif os.path.exists(f"{c}/{out}"):
        shutil.copy(f"{c}/{out}", f"public/captures/{out}")
PY
mkdir -p public/captures/crm_real && cp assets/captures/crm_real/*.png public/captures/crm_real/
cp assets/references/*.jpg public/references/
cp assets/audio/final/conectfly_final_mix.wav assets/audio/final/conectfly_15s_final_mix.wav public/audio/
[ -f assets/brand/conectfly_logo_original.png ] && cp assets/brand/conectfly_logo_original.png public/brand/ || true
echo "public/ pronto"
