# RCP — CoRL 2026 Project Page

Static project page for *Unrolling the Action Manifold: Visuomotor Policy Learning via Recursive Cascades*.

## Develop / preview
```bash
cd site && python3 -m http.server 8000
# open http://localhost:8000
```

## Rebuild assets (figures, paper PDF, curated videos + manifest)
```bash
bash tools/build_assets.sh
```
Source assets are read from the repo root (`../corl_2026_template_submission`, `../real_world_videos`, `../_CoRL_2026__Recursive_Cascade_Policy.pdf`).

## Deploy
Any static host. For GitHub Pages, push `site/` contents to the Pages branch/root.

## Notes
- Authors are intentionally anonymized (paper under double-blind review).
- The "Code" link is a placeholder until a public repo exists.
- To swap a video clip, edit `tools/build_assets.sh` (the `CLIPS` mapping) and re-run, or replace the file under `static/videos/<method>/<task>/`.
