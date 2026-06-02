// Animated explainer of the Recursive Cascade Policy, based on the architecture figure.
// Scene A: generator internals (observation -> encoder -> tokens -> generator -> action latents).
// Scene B: the same generator reused to instantiate the trajectory level by level.
const cv = document.getElementById('arch-anim');
if (cv) {
  const ctx = cv.getContext('2d');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const stepEls = [...document.querySelectorAll('.how-steps li')];
  const capEl = document.querySelector('.how-caption');
  const CAPTIONS = [
    'Encode — a ResNet and self-attention fuse the camera image and robot state into observation tokens.',
    'Generate — the shared generator self-attends over its level, start/end, context and mask tokens, cross-attends to the observation, and emits action latents.',
    'Level 0 — the generator predicts a few sparse boundary anchors that sketch the global trajectory.',
    'Recurse — each adjacent anchor pair is fed back to the same generator, which infills the waypoint between them.',
    'Level N — the gaps fill into a dense, executable trajectory, all decoded in parallel.',
  ];

  const W = 960, H = 540;
  let dpr = 1;
  function resize(){ dpr = Math.min(devicePixelRatio || 1, 2); cv.width = W*dpr; cv.height = H*dpr; ctx.setTransform(dpr,0,0,dpr,0,0); }
  resize(); addEventListener('resize', resize);

  const C = {
    ink:'#1f2733', muted:'#6b7280', faint:'rgba(31,39,51,.16)',
    rose:'#7D5C58', roseFill:'#E7D2CC', roseSoft:'#D2C2C0',
    slate:'#5b7aa8', slateFill:'#C9D8EC', slateSoft:'#B0C4DE',
    green:'#6f9e62', greenFill:'#D2E9C4',
    gray:'#8b94a3', grayFill:'#E4E7ED',
    box:'#f2f3f7', boxStroke:'rgba(31,39,51,.14)',
  };

  const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
  const norm = (g,a,b)=>clamp((g-a)/(b-a),0,1);
  const ease = t=> t<0.5 ? 2*t*t : 1-Math.pow(-2*t+2,2)/2;
  const lerp = (a,b,t)=>a+(b-a)*t;

  function rr(x,y,w,h,r){ ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); }
  function box(x,y,w,h,r,fill,stroke,lw){ rr(x,y,w,h,r); if(fill){ctx.fillStyle=fill;ctx.fill();} if(stroke){ctx.lineWidth=lw||1.4;ctx.strokeStyle=stroke;ctx.stroke();} }
  function label(s,x,y,size,color,align,weight,serif){ ctx.fillStyle=color; ctx.textAlign=align||'center'; ctx.textBaseline='middle'; ctx.font=`${weight||500} ${size}px ${serif?'Fraunces, Georgia, serif':'Inter, system-ui, sans-serif'}`; ctx.fillText(s,x,y); }
  function withA(a,fn){ if(a<=0) return; ctx.save(); ctx.globalAlpha = a; fn(); ctx.restore(); }
  function arrow(x1,y1,x2,y2,color,lw){ ctx.strokeStyle=color; ctx.fillStyle=color; ctx.lineWidth=lw||1.4; ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke(); const a=Math.atan2(y2-y1,x2-x1), hl=7; ctx.beginPath(); ctx.moveTo(x2,y2); ctx.lineTo(x2-hl*Math.cos(a-0.42),y2-hl*Math.sin(a-0.42)); ctx.lineTo(x2-hl*Math.cos(a+0.42),y2-hl*Math.sin(a+0.42)); ctx.closePath(); ctx.fill(); }
  function flow(x1,y1,x2,y2,prog,color){ for(let i=0;i<3;i++){ const f=((prog + i/3)%1); const x=lerp(x1,x2,f), y=lerp(y1,y2,f); ctx.beginPath(); ctx.arc(x,y,2.6,0,7); ctx.fillStyle=color; ctx.fill(); } }
  function sq(x,y,s,fill,stroke,dashed){ rr(x,y,s,s,5); ctx.fillStyle=fill; ctx.fill(); ctx.lineWidth=1.4; ctx.setLineDash(dashed?[4,3]:[]); ctx.strokeStyle=stroke; ctx.stroke(); ctx.setLineDash([]); }

  // Trajectory bezier (Scene B)
  const P0={x:175,y:372}, C1={x:380,y:150}, C2={x:650,y:470}, P3={x:880,y:300};
  function bez(t){ const u=1-t; return { x:u*u*u*P0.x+3*u*u*t*C1.x+3*u*t*t*C2.x+t*t*t*P3.x, y:u*u*u*P0.y+3*u*u*t*C1.y+3*u*t*t*C2.y+t*t*t*P3.y }; }
  const L0t=[0,1/3,2/3,1];
  function subdivide(ts){ const out=[]; for(let i=0;i<ts.length;i++){ out.push(ts[i]); if(i<ts.length-1) out.push((ts[i]+ts[i+1])/2); } return out; }
  const L1t=subdivide(L0t), L2t=subdivide(L1t);

  // ---- Scene A: generator internals ----
  function sceneA(a, encodeP, genP, now){
    withA(a, ()=>{
      // observation column ---------------------------------------------------
      box(60,352,118,62,10,'#fff',C.boxStroke); label('camera + state',119,383,13,C.muted);
      box(78,300,82,30,7,C.roseFill,C.rose,1.4); label('ResNet',119,315,12,C.rose,'center',600);
      box(52,232,150,52,10,'#fbf6f4',C.rose,1.5); label('Obs Encoder',127,250,14,C.rose,'center',600);
      box(64,266,126,16,5,C.greenFill,C.green,1); label('self-attention',127,274,10,'#3f6135');
      arrow(119,352,119,332,C.faint); arrow(119,300,119,286,C.faint);
      // observation tokens
      const otx=232, oty=232;
      for(let i=0;i<4;i++){ const ta=norm(encodeP, i*0.18, i*0.18+0.5); withA(ta, ()=> sq(otx, oty+i*30, 22, C.greenFill, C.green)); }
      withA(norm(encodeP,.2,.7), ()=> label('obs tokens',243,232+4*30+4,11,C.muted));
      withA(norm(encodeP,0,1)*0.9, ()=> flow(190,258,232,258, (now*0.5)%1, C.green));

      // generator -----------------------------------------------------------
      const gx=398, gy=176, gw=330, gh=176;
      box(gx,gy,gw,gh,14,C.box,C.boxStroke,1.6);
      box(gx+16,gy+16,gw-32,30,7,C.slateFill,C.slate,1.2); label('cross-attention',gx+gw/2,gy+31,12,'#33507a',600);
      box(gx+16,gy+gh-46,gw-32,30,7,C.greenFill,C.green,1.2); label('self-attention',gx+gw/2,gy+gh-31,12,'#3f6135',600);
      label('Recursive Shared',gx+gw/2,gy+gh/2-10,17,C.ink,'center',600,true);
      label('Generator · 6M',gx+gw/2,gy+gh/2+13,17,C.ink,'center',600,true);

      // input tokens (slide up + stagger)
      const slide = lerp(26,0, ease(norm(genP,0,0.45)));
      const toks=[['Level',C.grayFill,C.gray,false],['Start',C.slateFill,C.slate,false],['End',C.slateFill,C.slate,false],['Context',C.roseFill,C.rose,false],['mask',C.box,C.boxStroke,true],['mask',C.box,C.boxStroke,true]];
      const ty=gy+gh+44, tx0=gx+24, s=30, gap=18;
      toks.forEach((t,i)=>{ const ta=norm(genP, i*0.05, i*0.05+0.3); const x=tx0+i*(s+gap); withA(ta, ()=>{ sq(x, ty+slide, s, t[1], t[2], t[3]); label(t[0], x+s/2, ty+slide+s+12, 9.5, C.muted); arrow(x+s/2, ty+slide-4, x+s/2, gy+gh+6, C.faint); }); });

      // self-attention lines among input tokens
      withA(norm(genP,0.32,0.6)*(0.5+0.5*Math.sin(now*4)), ()=>{ ctx.strokeStyle=C.green; ctx.lineWidth=1; for(let i=0;i<toks.length;i++)for(let j=i+1;j<toks.length;j++){ const xi=tx0+i*(s+gap)+s/2, xj=tx0+j*(s+gap)+s/2; ctx.beginPath(); ctx.moveTo(xi,gy+gh-24); ctx.quadraticCurveTo((xi+xj)/2, gy+gh-52, xj, gy+gh-24); ctx.stroke(); } });
      // cross-attention: obs tokens -> generator
      withA(norm(genP,0.5,0.8), ()=>{ arrow(255,290, gx-2, gy+31, C.slate,1.6); flow(255,290, gx-2, gy+31, (now*0.6)%1, C.slate); });

      // action latents out the top
      const lx=gx+gw/2-2*34, ly=120;
      withA(norm(genP,0.66,1), ()=>{ arrow(gx+gw/2, gy-2, gx+gw/2, ly+30, C.faint,1.6); label('action latents', gx+gw/2, ly-16, 12, C.muted); });
      for(let i=0;i<4;i++){ const la=norm(genP, 0.7+i*0.05, 0.85+i*0.05); const shade=['#D8E3F1','#BFD0E8','#9DB6DA','#7E9BC8'][i]; withA(la, ()=> sq(lx+i*34, ly, 28, shade, C.slate)); }
    });
  }

  // ---- Scene B: level-by-level generation ----
  function drawNode(now, active){
    box(60,64,168,46,23, active?'#fbf6f4':'#fff', C.rose, active?2:1.4);
    label('Gθ · shared generator', 144, 87, 13, C.rose,'center',600);
    if(active){ withA(0.5+0.5*Math.sin(now*5), ()=> box(60,64,168,46,23,null,C.roseSoft,3)); }
  }
  function dot(p,r,fill,stroke){ ctx.beginPath(); ctx.arc(p.x,p.y,r,0,7); ctx.fillStyle=fill; ctx.fill(); if(stroke){ctx.lineWidth=1.5;ctx.strokeStyle=stroke;ctx.stroke();} }
  function poly(ts,a){ withA(a,()=>{ ctx.strokeStyle=C.slateSoft; ctx.lineWidth=2.4; ctx.beginPath(); ts.forEach((t,i)=>{ const p=bez(t); i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y); }); ctx.stroke(); }); }

  function sceneB(a, l0, l1, lN, now){
    withA(a, ()=>{
      // faint guide curve
      withA(0.5,()=>{ ctx.strokeStyle=C.faint; ctx.lineWidth=1.4; ctx.beginPath(); for(let t=0;t<=1.0001;t+=0.02){ const p=bez(t); t?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y);} ctx.stroke(); });

      const lvl = lN>0?'Level N · execution' : l1>0?'Level 1 · recursive infill' : 'Level 0 · global anchors';
      label(lvl, 500, 116, 15, C.ink, 'center', 600, true);
      drawNode(now, (l0>0&&l0<1)||(l1>0&&l1<1)||(lN>0&&lN<1));

      // Level 0 anchors (rose)
      const nA = L0t.length;
      poly(L0t, Math.min(1, l0*1.2));
      for(let i=0;i<nA;i++){ const ap=norm(l0, i/nA*0.8, i/nA*0.8+0.3); if(ap<=0) continue; const p=bez(L0t[i]); withA(Math.min(1,ap),()=>{ const r=lerp(2,9,ease(ap)); dot(p,r,C.rose); withA(0.3,()=>dot(p,r+5,null,C.rose)); }); }

      // Level 1 infill (slate midpoints between anchors)
      if(l1>0){
        poly(L1t, l1);
        const mids=[1/6,3/6,5/6];
        mids.forEach((t,i)=>{ const mp=norm(l1, i*0.22, i*0.22+0.4); if(mp<=0) return; const p=bez(t);
          // highlight the pair being infilled
          withA((1-mp)*0.9, ()=>{ const lp=bez(L0t[i]), rp=bez(L0t[i+1]); ctx.strokeStyle=C.slate; ctx.lineWidth=2; ctx.setLineDash([5,4]); ctx.beginPath(); ctx.moveTo(lp.x,lp.y); ctx.lineTo(rp.x,rp.y); ctx.stroke(); ctx.setLineDash([]); });
          withA(Math.min(1,mp), ()=> dot(p, lerp(2,6,ease(mp)), C.slate));
        });
      }

      // Level N dense + execution
      if(lN>0){
        // dense smooth curve
        withA(lN,()=>{ ctx.strokeStyle=C.slate; ctx.lineWidth=2.6; ctx.beginPath(); for(let t=0;t<=1.0001;t+=0.01){ const p=bez(t); t?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y);} ctx.stroke(); });
        L2t.forEach((t,i)=>{ const dp=norm(lN, (i/L2t.length)*0.7, (i/L2t.length)*0.7+0.3); if(dp<=0) return; withA(Math.min(1,dp), ()=> dot(bez(t), 3.4, C.slate)); });
        // anchors stay visible on top
        L0t.forEach(t=> dot(bez(t),6,C.rose));
        // gripper at the end
        withA(norm(lN,0.55,1),()=>{ const g=bez(1); ctx.strokeStyle=C.rose; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(g.x-2,g.y-13); ctx.lineTo(g.x-12,g.y-13); ctx.lineTo(g.x-12,g.y+13); ctx.lineTo(g.x-2,g.y+13); ctx.moveTo(g.x+2,g.y-13); ctx.lineTo(g.x+12,g.y-13); ctx.lineTo(g.x+12,g.y+13); ctx.lineTo(g.x+2,g.y+13); ctx.stroke(); withA(norm(lN,0.7,1),()=> label('execution', g.x, g.y-26, 12, C.rose,'center',600)); });
      }
    });
  }

  let lastStep = -1;
  function setStep(i){ if(i===lastStep) return; lastStep=i; stepEls.forEach((el,idx)=>el.classList.toggle('active', idx===i)); if(capEl) capEl.textContent = CAPTIONS[i]; }

  function render(g, now){
    ctx.clearRect(0,0,W,H);
    const aA = Math.min(norm(g,0,0.04), 1-norm(g,0.42,0.50));
    const aB = norm(g,0.44,0.52);
    sceneA(aA, norm(g,0.02,0.20), norm(g,0.20,0.42), now);
    sceneB(aB, norm(g,0.50,0.64), norm(g,0.64,0.80), norm(g,0.80,0.94), now);
    const step = g<0.20?0 : g<0.50?1 : g<0.64?2 : g<0.80?3 : 4;
    setStep(step);
  }

  const FORCE = new URLSearchParams(location.search).get('frame');
  if (reduce){ /* CSS shows the static figure fallback */ }
  else if (FORCE!==null){ render(parseFloat(FORCE), 0); }
  else {
    const T = 22000; let t0 = null;
    const loop = (ts)=>{ if(t0==null) t0=ts; render(((ts-t0)%T)/T, ts/1000); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }
}
