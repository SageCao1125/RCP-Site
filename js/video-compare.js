const root = document.getElementById('vc');
if (root) {
  const TASK_RATES = { // success rate per task: RCP + each baseline
    stack_bowl:{rcp:'50%',act:'30%',dp:'20%',carp:'35%'},
    transfer_tape:{rcp:'65%',act:'30%',dp:'30%',carp:'15%'},
    weigh_apple:{rcp:'35%',act:'20%',dp:'25%',carp:'15%'},
    open_drawer:{rcp:'80%',act:'75%',dp:'50%',carp:'60%'},
  };
  const NOTES = {
    'transfer_tape|carp':'CARP often fails here — discrete quantization breaks the fine bimanual transfer.',
    'open_drawer|dp':'Diffusion Policy struggles with the precise single-arm handle pull.',
    'weigh_apple|act':'ACT has no successful trial on this long-horizon task in our runs.',
  };
  const TASK_ORDER = ['stack_bowl','transfer_tape','weigh_apple','open_drawer'];
  const BASE_ORDER = ['act','dp','carp'];

  let M = null;
  const state = {task:'stack_bowl', base:'act', rcpOutcome:'success', baseOutcome:'fail'};

  fetch('static/videos/manifest.json').then(r=>r.json()).then(m=>{ M=m; build(); }).catch(()=>{
    root.innerHTML = '<p class="vc-note">Video manifest not found — run <code>bash tools/build_assets.sh</code>.</p>';
  });

  const has = (method,task,outcome) => M.clips.some(c=>c.method===method&&c.task===task&&c.outcome===outcome);
  const clip = (method,task,outcome) => M.clips.find(c=>c.method===method&&c.task===task&&c.outcome===outcome);

  function build(){
    const tabs = root.querySelector('.vc-tabs');
    tabs.innerHTML = '';
    TASK_ORDER.forEach(t=>{
      const b = document.createElement('button');
      b.textContent = M.tasks[t]; b.setAttribute('role','tab'); b.dataset.task = t;
      b.onclick = () => { state.task = t; firstAvailableOutcomes(); render(); };
      tabs.appendChild(b);
    });
    const methods = root.querySelector('.vc-methods');
    methods.innerHTML = '';
    BASE_ORDER.forEach(mk=>{
      const b = document.createElement('button');
      b.textContent = M.methods[mk]; b.setAttribute('role','tab'); b.dataset.method = mk;
      b.onclick = () => { state.base = mk; firstAvailableOutcomes(); render(); };
      methods.appendChild(b);
    });
    firstAvailableOutcomes(); render();
  }

  function firstAvailableOutcomes(){
    state.rcpOutcome = has('rcp',state.task,'success') ? 'success' : (has('rcp',state.task,'fail') ? 'fail' : null);
    state.baseOutcome = has(state.base,state.task,'fail') ? 'fail' : (has(state.base,state.task,'success') ? 'success' : null);
  }

  function setSide(sideEl, method, outcome, label){
    const video = sideEl.querySelector('video');
    const nameEl = sideEl.querySelector('.vc-name');
    const rateEl = sideEl.querySelector('.vc-rate');
    const toggle = sideEl.querySelector('.vc-toggle');
    if(label) nameEl.textContent = label;
    rateEl.textContent = TASK_RATES[state.task][method] ? TASK_RATES[state.task][method] + ' success' : '';
    toggle.innerHTML = '';
    ['success','fail'].forEach(oc=>{
      const b = document.createElement('button');
      b.textContent = oc==='success' ? '✓ Success' : '✗ Failure';
      if(!has(method,state.task,oc)) b.disabled = true;
      b.setAttribute('aria-pressed', String(outcome===oc));
      b.onclick = () => { if(sideEl.dataset.side==='rcp') state.rcpOutcome = oc; else state.baseOutcome = oc; render(); };
      toggle.appendChild(b);
    });
    const c = outcome ? clip(method,state.task,outcome) : null;
    if(c){ video.poster = c.poster; video.src = c.src; video.load(); video.play().catch(()=>{}); }
    else { video.removeAttribute('src'); video.poster = ''; video.load(); }
  }

  function render(){
    root.querySelectorAll('.vc-tabs button').forEach(b=>b.setAttribute('aria-selected', String(b.dataset.task===state.task)));
    root.querySelectorAll('.vc-methods button').forEach(b=>b.setAttribute('aria-selected', String(b.dataset.method===state.base)));
    const sides = root.querySelectorAll('.vc-side');
    setSide(sides[0], 'rcp', state.rcpOutcome, 'RCP (Ours)');
    setSide(sides[1], state.base, state.baseOutcome, M.methods[state.base]);
    root.querySelector('.vc-note').textContent = NOTES[state.task+'|'+state.base] || '';
  }
}
