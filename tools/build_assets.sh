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
