// Long-EZ Explorer — bootstrap. Evaluates the engine and the parts modules one work package per task, in exactly the
// order the static imports evaluate them (parts/index.js is the list), so the page keeps painting and the loading line
// says where it is; then the two definition-record modules whose load-time effects the analysis has always included
// (block B's latch masses, block G's exhaust and cowl bindings); then the application (app_main.js), whose static
// imports find every module already evaluated. The other definition records and the solids load later, on demand.
const status = (t) => { const el = document.getElementById('loading'); if (el) el.textContent = t; };
const yieldTask = () => new Promise((r) => setTimeout(r, 0));
const t0 = performance.now(), laps = [];
const lap = (k) => { laps.push(`${k} ${Math.round(performance.now() - t0)} ms`); };
try {
  status('Loading the engine…');
  for (const m of ['./structures.js', './plybook.js', './drawing.js', './systems.js']) await import(m);
  lap('engine');
  // the work packages, from parts/index.js's own import list (the evaluation order); fetched in parallel first
  let order = [];
  try { const src = await (await fetch(new URL('./parts/index.js', import.meta.url))).text(); order = [...src.matchAll(/^import '(\.[^']+)';/gm)].map((m) => new URL(m[1], new URL('./parts/', import.meta.url)).href); } catch { order = []; }
  for (const u of order) { const l = document.createElement('link'); l.rel = 'modulepreload'; l.href = u; document.head.append(l); }
  for (let i = 0; i < order.length; i++) { status(`Loading the parts ${i + 1}/${order.length}…`); await yieldTask(); await import(order[i]); }
  await import('./parts/index.js');   // any module the list missed, then markLoaded()
  lap('parts');
  status('Loading the definition hooks…'); await yieldTask();
  await import('./defn/blkB_latch.js'); await import('./defn/blocks/g_powerplant.js');
  lap('hooks');
} catch (e) { status(`Could not load the model: ${e.message}`); throw e; }
window.__lezBoot = laps.join(', ');
await yieldTask();
await import('./app_main.js');
