#!/usr/bin/env bash
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"   # .../site
ROOT="$(cd "$HERE/.." && pwd)"                             # repo root
SRC_FIG="$ROOT/corl_2026_template_submission/Figures"
OUT_FIG="$HERE/static/figures"
mkdir -p "$OUT_FIG"

echo "== Figures =="
# pdf basename -> output name
declare -A FIGS=(
  [teaser]=teaser
  [main_v2]=architecture
  [exp_vis_long_v2]=eval_panels
  [real_world_v2]=real_world_chart
  [hierarchy_vis]=hierarchy
  [latent_vis]=latent_umap
  [traj_error]=traj_error
)
for pdf in "${!FIGS[@]}"; do
  out="${FIGS[$pdf]}"
  pdftoppm -png -r 200 -singlefile "$SRC_FIG/$pdf.pdf" "$OUT_FIG/$out" 2>/dev/null
  # trim surrounding whitespace (ImageMagick if present, else Python/Pillow)
  if command -v convert >/dev/null 2>&1; then
    convert "$OUT_FIG/$out.png" -fuzz 4% -trim +repage "$OUT_FIG/$out.png" || true
  elif command -v python3 >/dev/null 2>&1; then
    python3 "$HERE/tools/trim_whitespace.py" "$OUT_FIG/$out.png" 16 >/dev/null || true
  fi
  echo "  figure: $out.png"
done

# robot setup photo (already a PNG)
cp "$SRC_FIG/visualization/real_world_overall.png" "$OUT_FIG/robot_setup.png"
echo "  figure: robot_setup.png"

echo "== Paper PDF =="
cp "$ROOT/_CoRL_2026__Recursive_Cascade_Policy.pdf" "$HERE/static/paper.pdf"
echo "  paper.pdf copied"

echo "== Videos =="
SRC_VID="$ROOT/real_world_videos"
OUT_VID="$HERE/static/videos"
mkdir -p "$OUT_VID/posters"

# method out_key|source_subdir|Label
METHODS=(
  "rcp|fracpolicy|RCP (Ours)"
  "act|act/act|ACT"
  "dp|dp/dp|Diffusion Policy"
  "carp|carp/carp|CARP"
)
# task out_key|source_subdir|Label
TASKS=(
  "stack_bowl|run_stack_bowl|Stack Bowl"
  "transfer_tape|run_packaging_tape|Transfer Tape"
  "weigh_apple|run_pick_up_weigh|Weigh Apple"
  "open_drawer|run_open_drawers|Open Drawer"
)

MANIFEST="$OUT_VID/manifest.json"
echo "{" > "$MANIFEST"
echo '  "methods": {"rcp":"RCP (Ours)","act":"ACT","dp":"Diffusion Policy","carp":"CARP"},' >> "$MANIFEST"
echo '  "tasks": {"stack_bowl":"Stack Bowl","transfer_tape":"Transfer Tape","weigh_apple":"Weigh Apple","open_drawer":"Open Drawer"},' >> "$MANIFEST"
echo '  "clips": [' >> "$MANIFEST"
first=1
for m in "${METHODS[@]}"; do
  IFS='|' read -r mkey msub mlabel <<< "$m"
  for t in "${TASKS[@]}"; do
    IFS='|' read -r tkey tsub tlabel <<< "$t"
    srcdir="$SRC_VID/$msub/$tsub"
    [ -d "$srcdir" ] || { echo "  MISSING dir: $srcdir"; continue; }
    for oc in "success|成功" "fail|失败"; do
      IFS='|' read -r ockey occn <<< "$oc"
      src=$(ls "$srcdir/${occn}"*.mp4 2>/dev/null | sort -V | head -n1 || true)
      if [ -z "$src" ]; then
        echo "  NO CLIP: $mkey/$tkey/$ockey (none available)"
        continue
      fi
      mkdir -p "$OUT_VID/$mkey/$tkey"
      dst="$OUT_VID/$mkey/$tkey/${ockey}_1.mp4"
      ffmpeg -y -v error -i "$src" -vf "scale=-2:'min(540,ih)'" \
        -c:v libx264 -crf 24 -preset veryfast -an -movflags +faststart "$dst"
      poster="$OUT_VID/posters/${mkey}_${tkey}_${ockey}.jpg"
      ffmpeg -y -v error -ss 1 -i "$dst" -frames:v 1 -q:v 4 "$poster" || \
        ffmpeg -y -v error -i "$dst" -frames:v 1 -q:v 4 "$poster"
      relsrc="videos/$mkey/$tkey/${ockey}_1.mp4"
      relposter="videos/posters/${mkey}_${tkey}_${ockey}.jpg"
      [ $first -eq 1 ] && first=0 || echo "," >> "$MANIFEST"
      printf '    {"method":"%s","task":"%s","outcome":"%s","src":"%s","poster":"%s"}' \
        "$mkey" "$tkey" "$ockey" "$relsrc" "$relposter" >> "$MANIFEST"
      echo "  clip: $mkey/$tkey/$ockey"
    done
  done
done
echo "" >> "$MANIFEST"
echo "  ]" >> "$MANIFEST"
echo "}" >> "$MANIFEST"
echo "== manifest written: $MANIFEST =="
