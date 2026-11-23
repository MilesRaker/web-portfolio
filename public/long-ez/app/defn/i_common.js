// Block I definition helpers: geometry in the definition frame (inches [BL, FS, WL]), clearances between primitives, other
// blocks' interface checks reused as evidence, and the record boilerplate. Notional; not for construction.
import { PARTS, partByPN, pinOf, WIRES, EQUIP, KEEPOUTS } from '../systems.js';
import { IN, dPrim, samples, pathsOf, r4 } from '../parts/wpI1_power.js';
import { DEFS } from './release.js';

export const DATE = '2026-11-19';
export const fx = (x, n = 2) => (Number.isFinite(x) ? x.toFixed(n) : String(x));
export const rev0 = (change) => [{ rev: 'A', date: DATE, short: 'Initial definition', change }];
export const open = (id, owner, what) => ({ id, with: owner, feature: 'open', what: `OPEN (${owner}): ${what}`, open: true, check: () => ({ ok: true, detail: `OPEN item, owner ${owner}: ${what}` }) });
const sub = (a, b) => a.map((v, i) => v - b[i]), len = (a) => Math.hypot(...a);

/** another part's drawn primitives in the definition frame; paths become one cylinder per segment */
export function geoIn(pn, keep = () => true) {
  const p = partByPN(pn); if (!p) return [];
  const out = [];
  for (const g of p.geo || []) { if (!keep(g)) continue;
    if (g.t === 'box' || g.t === 'obox') out.push({ t: 'box', c: IN(g.c), d: [g.d[1] * 12, g.d[0] * 12, g.d[2] * 12], what: pn });
    else if (g.t === 'cyl') out.push({ t: 'cyl', a: IN(g.a), b: IN(g.b), r: g.r * 12, what: pn });
    else if (g.t === 'sphere') out.push({ t: 'sphere', c: IN(g.c), r: g.r * 12, what: pn });
    else if (g.t === 'path') { const P = g.pts.map(IN); for (let i = 1; i < P.length; i++) out.push({ t: 'cyl', a: P[i - 1], b: P[i], r: (g.dIn || 0.25) / 2, what: pn }); } }
  return out;
}
export const koIn = (id) => { const k = KEEPOUTS.find((q) => q.id === id); return k && k.c ? { t: 'box', c: IN(k.c), d: [k.d[1] * 12, k.d[0] * 12, k.d[2] * 12], what: id } : null; };
/** surface sample points of a primitive (box faces on a grid, cylinder rings and end caps) */
export function primPts(g, n = 4) {
  const out = [];
  if (g.t === 'box' || g.lo) { const lo = g.lo || g.c.map((v, i) => v - g.d[i] / 2), hi = g.hi || g.c.map((v, i) => v + g.d[i] / 2);
    for (let i = 0; i <= n; i++) for (let j = 0; j <= n; j++) for (let k = 0; k <= n; k++) { if (![i, j, k].some((q) => q === 0 || q === n)) continue; out.push([lo[0] + (hi[0] - lo[0]) * i / n, lo[1] + (hi[1] - lo[1]) * j / n, lo[2] + (hi[2] - lo[2]) * k / n]); } return out; }
  if (g.t === 'cyl') { const ab = sub(g.b, g.a), L = len(ab) || 1, e = ab.map((v) => v / L), t = Math.abs(e[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
    const u = [e[1] * t[2] - e[2] * t[1], e[2] * t[0] - e[0] * t[2], e[0] * t[1] - e[1] * t[0]], ul = len(u), uu = u.map((v) => v / ul), w = [e[1] * uu[2] - e[2] * uu[1], e[2] * uu[0] - e[0] * uu[2], e[0] * uu[1] - e[1] * uu[0]];
    for (let i = 0; i <= n + 2; i++) { const c = g.a.map((v, k) => v + ab[k] * i / (n + 2)); out.push(c); for (let a = 0; a < 12; a++) { const th = a * Math.PI / 6; out.push(c.map((v, k) => v + g.r * (Math.cos(th) * uu[k] + Math.sin(th) * w[k]))); } } return out; }
  if (g.t === 'sphere') return [g.c];
  return out;
}
/** least surface distance (in) between two sets of primitives (sampled both ways), with the governing pair */
export function clear(A, B) {
  let w = { c: Infinity };
  for (const a of A) for (const p of primPts(a)) for (const b of B) { const c = dPrim(p, b); if (c < w.c) w = { c, at: p, what: b.what || b.g || b.t, mine: a.g }; }
  for (const b of B) for (const p of primPts(b)) for (const a of A) { const c = dPrim(p, a); if (c < w.c) w = { c, at: p, what: b.what || b.t, mine: a.g }; }
  return w;
}
/** least clearance (in) from a run (polyline P, diameter d) to primitives, optional skip(sample) */
export function runClear(P, d, B, skip = () => false) {
  let w = { c: Infinity };
  for (const q of samples(P, 0.25)) { if (skip(q)) continue; for (const b of B) { const c = dPrim(q.p, b) - d / 2; if (c < w.c) w = { c, at: q.p, what: b.what || b.feat || b.t }; } }
  return w;
}
export const at3 = (p) => (p ? `BL ${fx(p[0])}, FS ${fx(p[1])}, WL ${fx(p[2])}` : '—');
/** another record's interface check, as evidence for ours: passes when it passes, or when its detail never names `pn` */
export function viaRecord(pn, id, mine) {
  const D = DEFS[pn]; const f = D && D.def.interfaces.find((q) => q.id === id); if (!f) return { ok: false, detail: `${pn} ${id}: no such interface` };
  const c = f.check(), names = [].concat(mine), hit = names.filter((m) => c.detail.includes(m));
  return { ok: c.ok || !hit.length, detail: `${pn} rev ${D.def.rev} ${id} (${f.what}): ${c.ok ? 'passes' : `fails on other items only (${c.detail.slice(0, 140)}…)`}${hit.length && !c.ok ? `; NAMES ${hit.join(', ')}` : ''}` };
}
/** every wire of a harness ends on a defined pin of a defined piece of equipment */
export function wireList(pn) {
  const ws = WIRES.filter((x) => [].concat(x.harness).includes(pn)), bad = ws.filter((x) => !pinOf(x.from) || !pinOf(x.to));
  return { ok: ws.length > 0 && !bad.length, n: ws.length, detail: `${ws.length} wires, each from a defined pin to a defined pin${bad.length ? `; UNDEFINED: ${bad.map((x) => `${x.id} ${!pinOf(x.from) ? x.from : x.to}`).join(', ')}` : ''}` };
}
export const equipIn = (ref) => { const e = EQUIP.find((q) => q.ref === ref); return e ? IN(e.at) : null; };
export { PARTS, partByPN, pathsOf, r4, len, sub };
