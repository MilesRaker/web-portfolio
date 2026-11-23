// The live engine for the Definition tab: in a module worker when the browser can start one (the page stays
// responsive while the parts and records load and while a part is re-audited), otherwise on the main thread, one request
// per task. call(op, ...args) returns a promise; progress(text) reports the loading stages.
export function liveEngine(design, progress = () => {}) {
  let seq = 0, kind = 'worker', ready, worker = null;
  const wait = new Map();
  const viaMain = async () => {
    kind = 'main';
    const ENG = await import('./engine.js'), tick = () => new Promise((r) => setTimeout(r, 0));
    let q = Promise.resolve();
    const call = (op, ...args) => (q = q.then(async () => { await tick(); return op === 'init' ? ENG.init(args[0], progress) : ENG[op](...args); }));
    await call('init', design);
    return call;
  };
  ready = new Promise((resolve) => {
    let w;
    try { w = worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' }); } catch (e) { resolve(viaMain()); return; }
    let started = false;
    const fail = () => { if (started) return; started = true; w.terminate(); progress('live engine on the main thread'); resolve(viaMain()); };
    w.onerror = (e) => { e.preventDefault?.(); fail(); };
    w.onmessage = (ev) => {
      const m = ev.data;
      if (m.progress) { progress(m.progress); return; }
      const p = wait.get(m.id); if (!p) return; wait.delete(m.id);
      if (m.err) p.reject(new Error(m.err)); else p.resolve(m.r);
    };
    const call = (op, ...args) => new Promise((res, rej) => { const id = ++seq; wait.set(id, { resolve: res, reject: rej }); w.postMessage({ id, op, args }); });
    call('init', design).then(() => { started = true; resolve(call); }, (e) => { console.warn('[LEZ] definition worker failed, using the main thread:', e.message); fail(); });
  });
  return { ready, get kind() { return kind; }, call: async (op, ...args) => (await ready)(op, ...args), terminate: () => worker && worker.terminate() };
}
