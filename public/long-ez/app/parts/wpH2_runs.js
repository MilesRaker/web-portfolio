// WPH2 — block H run registry: every routed run of block H in the definition frame (inches), built once from the layout
// (wpH1_layout.js) and the cabin raceway portions that block I's routing (wp12) gave the two cabin harnesses. The system
// records are re-pointed at these runs by wpH9_sync.js; the checks (wpH3_checks.js) and the records read the same runs.
import { partByPN } from '../systems.js';
import { P3, ptsOf } from './wpH0_route.js';
import * as LY from './wpH1_layout.js';
import { LEADS } from './wp6_engine_install.js';

/** the raceway portion (FS ≤ 142) of a cabin harness as wp12 routed it, in inches, with the head re-ended on its LRU */
function racewayHead(pn, head) {
  const g = partByPN(pn).geo.find((q) => q.t === 'path' && q.cls), pts = g.pts.map(P3), k = pts.findIndex((q, i) => i > 2 && q[1] > 116.50);
  return { pts: [...(head ? [head] : []), ...pts.slice(0, k)], rw: g.rwSpan ? [g.rwSpan[0] + (head ? 1 : 0), Math.min(g.rwSpan[1], k - 1) + (head ? 1 : 0)] : null, g };
}
const run = (name, nodes, o) => ({ name, nodes, rigid: [1, nodes.length - 2], ...o });
const node = (p, clamp) => ({ p, ...(clamp ? { clamp } : {}) });
function cabinRun(pn, kind, head) {
  const r = racewayHead(pn, head), tail = LY.cabinTail(kind), c = [...r.pts.slice(-1), ...tail];
  const sm = LY.smooth(c, kind === 'plead' ? 3.0 : 4.0, { 1: 'air', [c.length - 1]: 'air', [c.length - 2]: 'air' });
  const nodes = [...r.pts.slice(0, -1).map((p, i) => node(p, i === 0 || (r.rw && i >= r.rw[0] && i <= r.rw[1] && (i - r.rw[0]) % 2 === 0) ? 'air' : null)), ...sm];
  return { nodes, rw: r.rw };
}
export const RUNS = (() => {
  const R = {};
  const pl = cabinRun('LEZ-74-100', 'plead', LY.KEY_TERM), gea = cabinRun('LEZ-77-100', 'gea', null);
  R['LEZ-74-100'] = [run('P-leads and START lead, key switch to the boot', pl.nodes, { od: 0.25, bendMin: 2.5, span: 18, cls: 'signal', shield: true, rw: pl.rw })];
  R['LEZ-77-100'] = [run('GEA 24 sensor harness, unit to the boot', gea.nodes, { od: 0.35, bendMin: 3.5, span: 18, cls: 'signal', shield: true, rw: gea.rw })];
  R['LEZ-74-130'] = [LY.pleadRun(1), LY.pleadRun(-1)];
  R['LEZ-76-110'] = ['throttle', 'mixture', 'heat'].map(LY.cableRun);
  R['LEZ-77-110'] = [LY.trunkRun('A'), LY.trunkRun('B'), ...['LF', 'RF', 'LR', 'RR'].map(LY.branchRun)];
  R['LEZ-77-111'] = [LY.smallRun('Branch to the fuel-flow transducer', LY.FFT_BRANCH(ptsOf(R['LEZ-77-100'][0])), { 0: 'air', 2: 'air' }), LY.smallRun('Branch to the manifold transducers', LY.MANI_BRANCH, { 0: 'air', 2: 'air' }, { self: true })];
  R['LEZ-77-121'] = ['FUEL-P', 'MAP', 'OIL-P'].map(LY.lineRun);
  // ignition leads: block G's / wp6's lead paths re-started on the rev B cap; bracket over the crankcase and every corner clamped (on the engine)
  R['LEZ-74-110'] = partByPN('LEZ-74-110').geo.filter((g) => g.t === 'path').map((g, i) => { const l = LEADS[i], raw = g.pts.map(P3); raw[0] = LY.CAP(l.mag);
    const pts = [raw[0]]; for (let k = 1; k < raw.length; k++) { const a = raw[k - 1], b = raw[k], L = Math.hypot(...b.map((v, j) => v - a[j])); if (L > 16) pts.push(a.map((v, j) => v + (b[j] - v) / 2)); pts.push(b); }
    return run(`Lead, cyl ${LY.CYL_NO[l.k]} ${l.top ? 'top' : 'bottom'} (${l.mag > 0 ? 'left' : 'right'} magneto)`, pts.map((p) => node(p, 'eng')), { od: 0.30, bendMin: 1.8, span: 18, cls: 'ign', shield: true, mag: l.mag, k: l.k, top: l.top, raw: true }); });
  return R;
})();
