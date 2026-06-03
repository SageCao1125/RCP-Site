# Project Page of Recursive Cascade Policy

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

## Deploy
Any static host. For GitHub Pages, push `site/` contents to the Pages branch/root.

