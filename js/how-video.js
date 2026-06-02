// Play the "how it works" explainer when it scrolls into view; pause when it leaves.
// Honors prefers-reduced-motion (stays paused, poster + controls only).
const v = document.getElementById('how-video');
if (v) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) {
    v.setAttribute('controls', '');
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { v.play().catch(() => v.setAttribute('controls', '')); }
        else { v.pause(); }
      });
    }, { threshold: 0.4 });
    io.observe(v);
  }
}
