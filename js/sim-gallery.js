// Build the simulation-rollout gallery from static/sim/manifest.json.
// Videos lazy-load and play only while in view (paused otherwise); honors reduced-motion.
const root = document.getElementById('sim-gallery');
if (root) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const MANISKILL = { pickcube: 'PickCube', pushcube: 'PushCube', stackcube: 'StackCube' };
  const FIXWORD = { conainer: 'container' };

  function pretty(task, bench) {
    if (bench === 'maniskill' && MANISKILL[task]) return MANISKILL[task];
    return task.split('_').map(w => (FIXWORD[w] || w)).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      const v = e.target;
      if (e.isIntersecting) {
        if (!v.src && v.dataset.src) v.src = v.dataset.src;
        if (!reduce) v.play().catch(() => { v.controls = true; });
      } else { v.pause(); }
    });
  }, { threshold: 0.25, rootMargin: '120px' });

  fetch('static/sim/manifest.json').then(r => r.json()).then((m) => {
    m.groups.forEach((g) => {
      const sec = document.createElement('div');
      sec.className = 'sim-group';
      const h = document.createElement('h3');
      h.className = 'res-h reveal';
      h.textContent = g.label;
      sec.appendChild(h);

      const grid = document.createElement('div');
      grid.className = 'sim-grid reveal';
      g.clips.forEach((c) => {
        const fig = document.createElement('figure');
        fig.className = 'sim-card card';
        const v = document.createElement('video');
        v.muted = true; v.loop = true; v.playsInline = true; v.preload = 'none';
        v.poster = c.poster; v.dataset.src = c.src;
        if (reduce) v.controls = true;
        const cap = document.createElement('figcaption');
        cap.textContent = pretty(c.task, g.benchmark);
        fig.append(v, cap);
        grid.appendChild(fig);
        io.observe(v);
      });
      sec.appendChild(grid);
      root.appendChild(sec);
    });
    // let reveal.js animate the freshly added groups
    document.querySelectorAll('#sim-gallery .reveal').forEach((el) => {
      if (window.__revealObserver) window.__revealObserver.observe(el); else el.classList.add('is-visible');
    });
  }).catch(() => {
    root.innerHTML = '<p style="text-align:center;color:var(--muted)">Simulation videos not found — run <code>bash tools/build_assets.sh</code>.</p>';
  });
}
