const canvas = document.getElementById('cascade');
if (canvas) {
  const ctx = canvas.getContext('2d');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ROSE = '#7D5C58', SLATE = '#5b7aa8';
  let W, H, dpr;

  function resize(){
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }
  window.addEventListener('resize', resize); resize();

  // Base curve from intent node (left) to gripper target (right)
  function basePts(){
    const x0 = W*0.16, y0 = H*0.5, x1 = W*0.84, y1 = H*0.46;
    const cx1 = W*0.40, cy1 = H*0.18, cx2 = W*0.60, cy2 = H*0.86;
    return {x0,y0,x1,y1,cx1,cy1,cx2,cy2};
  }
  function bezier(t,p){
    const u=1-t, tt=t*t, uu=u*u, uuu=uu*u, ttt=tt*t;
    return {
      x: uuu*p.x0 + 3*uu*t*p.cx1 + 3*u*tt*p.cx2 + ttt*p.x1,
      y: uuu*p.y0 + 3*uu*t*p.cy1 + 3*u*tt*p.cy2 + ttt*p.y1
    };
  }
  // recursive levels: waypoint counts per level
  const LEVELS = [3, 5, 9, 33];

  function drawScene(progress){
    ctx.clearRect(0,0,W,H);
    const p = basePts();
    const totalPhases = LEVELS.length;
    const phase = Math.min(totalPhases-1, Math.floor(progress*totalPhases));
    const subT = (progress*totalPhases) - phase;

    // faint full-path guide
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(51,66,95,.12)';
    ctx.beginPath();
    for(let t=0;t<=1;t+=0.01){const q=bezier(t,p); t===0?ctx.moveTo(q.x,q.y):ctx.lineTo(q.x,q.y);} ctx.stroke();

    // dense path up to current level (slate), eased in
    const dense = LEVELS[phase];
    ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(91,122,168,'+(0.35+0.5*subT)+')';
    ctx.beginPath();
    for(let i=0;i<=dense;i++){const q=bezier(i/dense,p); i===0?ctx.moveTo(q.x,q.y):ctx.lineTo(q.x,q.y);} ctx.stroke();

    // waypoint dots for current dense level
    for(let i=0;i<=dense;i++){
      const q=bezier(i/dense,p);
      ctx.beginPath(); ctx.arc(q.x,q.y, 3.2, 0, Math.PI*2);
      ctx.fillStyle='rgba(91,122,168,.85)'; ctx.fill();
    }
    // sparse global anchors (rose) — always visible, larger
    const anchors = LEVELS[0];
    for(let i=0;i<=anchors;i++){
      const q=bezier(i/anchors,p);
      ctx.beginPath(); ctx.arc(q.x,q.y, 8, 0, Math.PI*2);
      ctx.fillStyle=ROSE; ctx.fill();
      ctx.beginPath(); ctx.arc(q.x,q.y, 13, 0, Math.PI*2);
      ctx.strokeStyle='rgba(125,92,88,.25)'; ctx.lineWidth=1.5; ctx.stroke();
    }
    // intent node (left) pulse
    const pulse = 1 + 0.12*Math.sin(progress*Math.PI*2);
    ctx.beginPath(); ctx.arc(p.x0, p.y0, 16*pulse, 0, Math.PI*2);
    ctx.fillStyle='rgba(125,92,88,.18)'; ctx.fill();
    ctx.beginPath(); ctx.arc(p.x0, p.y0, 7, 0, Math.PI*2);
    ctx.fillStyle=ROSE; ctx.fill();
    // gripper target (right) — simple bracket
    ctx.strokeStyle=SLATE; ctx.lineWidth=3;
    const gx=p.x1, gy=p.y1;
    ctx.beginPath();
    ctx.moveTo(gx-2,gy-14); ctx.lineTo(gx-12,gy-14); ctx.lineTo(gx-12,gy+14); ctx.lineTo(gx-2,gy+14);
    ctx.moveTo(gx+2,gy-14); ctx.lineTo(gx+12,gy-14); ctx.lineTo(gx+12,gy+14); ctx.lineTo(gx+2,gy+14);
    ctx.stroke();
  }

  if (reduce){ drawScene(1); }
  else {
    let start=null; const DUR=7000;
    function frame(ts){
      if(!start) start=ts;
      let prog=((ts-start)%DUR)/DUR;          // 0..1 loop
      const held = prog < 0.85 ? prog/0.85 : 1; // ease + hold near end
      drawScene(held);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
}
