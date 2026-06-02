const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function countUp(el){
  const to = parseFloat(el.dataset.to);
  const suffix = el.dataset.suffix || '';
  const decimals = (el.dataset.to.split('.')[1] || '').length;
  if (reduce){ el.textContent = to.toFixed(decimals) + suffix; return; }
  const dur = 1200; let start = null;
  function tick(ts){
    if(!start) start = ts;
    const k = Math.min(1, (ts - start) / dur);
    const eased = 1 - Math.pow(1 - k, 3);
    el.textContent = (to * eased).toFixed(decimals) + suffix;
    if(k < 1) requestAnimationFrame(tick); else el.textContent = to.toFixed(decimals) + suffix;
  }
  requestAnimationFrame(tick);
}

const io = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if(e.isIntersecting){
      e.target.classList.add('is-visible');
      e.target.querySelectorAll?.('.stat-num').forEach(countUp);
      if(e.target.classList.contains('stat-num')) countUp(e.target);
      io.unobserve(e.target);
    }
  });
}, {threshold: .2});

document.querySelectorAll('.reveal').forEach(el => io.observe(el));
document.querySelectorAll('.stat-num').forEach(el => io.observe(el));
