#!/usr/bin/env bash
# Auditoria do MP4 final conforme os testes de aceitação da briefing.
set -uo pipefail
cd "$(dirname "$0")/.."
F=dist/conectfly_reels_viral_1080x1920.mp4; A=dist/audit; mkdir -p $A; R=$A/audit_report.md
v() { ffprobe -v error -select_streams v:0 -show_entries stream=$1 -of csv=p=0 "$F" | head -1 | tr -d ','; }
a() { ffprobe -v error -select_streams a:0 -show_entries stream=$1 -of csv=p=0 "$F" | head -1 | tr -d ','; }
ok() { [[ "$1" == "1" ]] && echo "✅ $2" || echo "❌ $2"; }
{
echo "# Auditoria — $(basename $F) — $(date -u +%FT%TZ)"; echo
ok $([[ "$(v width)x$(v height)" == "1080x1920" ]] && echo 1) "Resolução $(v width)×$(v height)"
ok $([[ "$(v avg_frame_rate)" == "30/1" ]] && echo 1) "Frame rate $(v avg_frame_rate) (constante)"
ok $([[ "$(v codec_name)" == "h264" && "$(v pix_fmt)" == "yuv420p" ]] && echo 1) "Vídeo $(v codec_name) $(v profile) · $(v pix_fmt) · $(( $(v bit_rate) / 1000 )) kbps"
ok $(python3 -c "print(1 if abs($(v duration)-35)<0.05 else 0)") "Duração $(v duration) s · $(v nb_frames) frames"
ok $([[ "$(a codec_name)" == "aac" && "$(a sample_rate)" == "48000" && "$(a channels)" == "2" ]] && echo 1) "Áudio $(a codec_name) $(a sample_rate) Hz · $(a channels) canais · $(( $(a bit_rate) / 1000 )) kbps"
echo "- Loudness (AAC decodificado): $(ffmpeg -hide_banner -i $F -vn -af ebur128=peak=true -f null - 2>&1 | grep -A14 Summary: | grep -E 'I:|Peak:' | tr -s ' ' | tr '\n' ' ')"
B=$(ffmpeg -hide_banner -i $F -vf "blackdetect=d=0.2:pix_th=0.02" -an -f null - 2>&1 | grep -o "black_start:[0-9.]* black_end:[0-9.]*" | tr '\n' ' ')
echo "- Frames pretos (≥0,2 s): ${B:-nenhum}"
Z=$(ffmpeg -hide_banner -i $F -vf "freezedetect=n=0.0003:d=1.2" -an -f null - 2>&1 | grep -o "freeze_start: [0-9.]*\|freeze_duration: [0-9.]*" | tr '\n' ' ')
echo "- Congelamentos (≥1,2 s): ${Z:-nenhum}"
ffprobe -v error "$F" >/dev/null && echo "✅ MP4 íntegro (ffprobe sem erros)"
} > $R
for s in 0 3 7 9 15 20 25 29 33; do ffmpeg -v error -y -ss $s -i $F -frames:v 1 -vf scale=360:-1 $A/thumb_$(printf %02d $s).png; done
ffmpeg -v error -y -pattern_type glob -i "$A/thumb_*.png" -vf "tile=9x1:padding=6:color=white" -frames:v 1 $A/thumbs_0-3-7-9-15-20-25-29-33.png
echo "- Thumbnails de validação: dist/audit/thumbs_0-3-7-9-15-20-25-29-33.png" >> $R
cat $R
