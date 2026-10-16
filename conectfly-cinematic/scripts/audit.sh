#!/usr/bin/env bash
# Auditoria audiovisual automática dos MP4 renderizados.
# Verifica: contêiner/codecs, resolução, fps constante, duração (vídeo × áudio),
# frames pretos inesperados, congelamentos, loudness integrado e true peak do
# áudio já codificado (AAC), e extrai frames representativos de cada cena.
set -uo pipefail
cd "$(dirname "$0")/.."
OUT=out; AUD="$OUT/audit"; mkdir -p "$AUD"
REPORT="$AUD/audit_report.md"
: > "$REPORT"

check() { # arquivo largura altura duração_esperada
  local f="$1" w="$2" h="$3" d="$4" name; name=$(basename "$f" .mp4)
  echo "## $name" >> "$REPORT"
  if ! ffprobe -v error "$f" >/dev/null 2>&1; then echo "- ❌ MP4 inválido" >> "$REPORT"; return; fi
  local v a
  v=$(ffprobe -v error -select_streams v:0 -show_entries stream=codec_name,profile,width,height,r_frame_rate,avg_frame_rate,pix_fmt,nb_frames,duration,bit_rate -of default=nw=1 "$f" | tr '\n' ' ')
  a=$(ffprobe -v error -select_streams a:0 -show_entries stream=codec_name,sample_rate,channels,duration,bit_rate -of default=nw=1 "$f" | tr '\n' ' ')
  echo "- Vídeo: \`$v\`" >> "$REPORT"
  echo "- Áudio: \`$a\`" >> "$REPORT"
  local vw vh vr vd ad
  vw=$(ffprobe -v error -select_streams v:0 -show_entries stream=width -of csv=p=0 "$f")
  vh=$(ffprobe -v error -select_streams v:0 -show_entries stream=height -of csv=p=0 "$f")
  vr=$(ffprobe -v error -select_streams v:0 -show_entries stream=avg_frame_rate -of csv=p=0 "$f")
  vd=$(ffprobe -v error -select_streams v:0 -show_entries stream=duration -of csv=p=0 "$f")
  ad=$(ffprobe -v error -select_streams a:0 -show_entries stream=duration -of csv=p=0 "$f")
  [[ "$vw" == "$w" && "$vh" == "$h" ]] && echo "- ✅ Resolução ${vw}×${vh}" >> "$REPORT" || echo "- ❌ Resolução ${vw}×${vh} (esperado ${w}×${h})" >> "$REPORT"
  [[ "$vr" == "30/1" ]] && echo "- ✅ 30 fps constantes" >> "$REPORT" || echo "- ❌ frame rate $vr" >> "$REPORT"
  python3 - "$vd" "$ad" "$d" >> "$REPORT" <<'EOF'
import sys
vd, ad, d = map(float, sys.argv[1:])
print(f"- {'✅' if abs(vd-d) < 0.05 else '❌'} Duração vídeo {vd:.3f}s (alvo {d}s); áudio {ad:.3f}s; diferença A/V {abs(vd-ad)*1000:.0f} ms")
EOF
  local black
  black=$(ffmpeg -hide_banner -i "$f" -vf "blackdetect=d=0.25:pix_th=0.04" -an -f null - 2>&1 | grep -o "black_start:[0-9.]* black_end:[0-9.]*" | tr '\n' ';')
  [[ -z "$black" ]] && echo "- ✅ Nenhum trecho preto ≥ 0,25 s" >> "$REPORT" || echo "- ⚠️ Trechos escuros: $black" >> "$REPORT"
  local frz
  frz=$(ffmpeg -hide_banner -i "$f" -vf "freezedetect=n=0.0005:d=1.0" -an -f null - 2>&1 | grep -o "freeze_start: [0-9.]*\|freeze_duration: [0-9.]*" | tr '\n' ' ')
  [[ -z "$frz" ]] && echo "- ✅ Nenhum congelamento ≥ 1 s" >> "$REPORT" || echo "- ⚠️ Congelamentos: $frz" >> "$REPORT"
  local loud
  loud=$(ffmpeg -hide_banner -i "$f" -vn -af "ebur128=peak=true" -f null - 2>&1 | grep -A12 "Summary:" | grep -E "I:|LRA:|Peak:" | tr -s ' ' | tr '\n' ' ')
  echo "- Loudness (AAC decodificado): \`$loud\`" >> "$REPORT"
  local clip
  clip=$(ffmpeg -hide_banner -i "$f" -vn -af astats=metadata=0 -f null - 2>&1 | grep -m1 "Number of clipped samples\|Peak level dB" | tr -s ' ')
  echo "- astats: \`$clip\`" >> "$REPORT"
  # frames representativos (1 a cada 2 s) + contact sheet
  mkdir -p "$AUD/$name"
  ffmpeg -v error -y -i "$f" -vf "fps=1/3,scale=-2:540" "$AUD/$name/f_%03d.jpg"
  ffmpeg -v error -y -pattern_type glob -i "$AUD/$name/f_*.jpg" -vf "tile=$( [[ $w -gt $h ]] && echo 6x3 || echo 9x2 ):padding=4:color=white" -frames:v 1 "$AUD/${name}_contact.jpg"
  echo "- Frames: \`$AUD/$name/\` · contact sheet: \`$AUD/${name}_contact.jpg\`" >> "$REPORT"
  echo >> "$REPORT"
}

echo "# Auditoria audiovisual — $(date -u +%FT%TZ)" >> "$REPORT"
echo >> "$REPORT"
check "$OUT/conectfly_reels_fullhd.mp4" 1080 1920 54
check "$OUT/conectfly_horizontal_fullhd.mp4" 1920 1080 54
check "$OUT/conectfly_reels_15s.mp4" 1080 1920 15
cat "$REPORT"
