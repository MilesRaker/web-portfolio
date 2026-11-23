// WPH0 — block H shared routing tools (definition frame, inches: x = BL + right, y = FS aft, z = WL up).
// A run is a list of nodes { p: [BL, FS, WL], clamp?: 'air' | 'eng' | 'end' } with an outside diameter. The tools give
// what the block H checks need for every run that bridges the firewall and the engine or crosses the engine bay:
//  • clearance to the released block G parts (mount tubes, isolator cups and bushings, lower brackets, upper pick-ups,
//    engine envelope, exhaust stacks and muff, air box, oil cooler and hoses) and to the cowl's inner skin;
//  • the largest bend radius each corner allows (fillet limited by half the shorter leg), against the run's minimum;
//  • the longest unsupported span between clamps;
//  • the engine-motion slack of the free span between the last airframe clamp and the first engine clamp: the developed
//    length must exceed the chord by the engine excursion, and the curvature the excursion adds to the formed bend must
//    keep the run above its minimum bend radius (S-bend: κ = 6δ/L²).
// Notional; the obstacle shapes are block G's definition primitives (approximate where block G says so).
import { GEO, fusAt } from '../structures.js';
import { insideFus, partByPN } from '../systems.js';
import { P3, enginePrims, cupPrims, bracketBoxes, COWL_T } from './wpG1_engine.js';
import { exhaustPrims, muffPrims, airboxPrims, coolerPrims, hosePrims, mountPrims, scoopRing, SCP } from './wpG4_systems.js';
import { SCOOP } from './wp10_induction_gear.js';
import { contourRing } from './wpG3_cowl.js';

export const r4 = (x) => Math.round(x * 1e4) / 1e4;
export const T3 = (q) => q.map(r4);
const sub = (a, b) => a.map((v, i) => v - b[i]), add = (a, b) => a.map((v, i) => v + b[i]), mul = (a, k) => a.map((v) => v * k), dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], len = (a) => Math.hypot(...a);
export const V = { sub, add, mul, dot, len };
/** definition frame (in, [BL, FS, WL]) → model frame (ft, [s, y, z]) */
export const FT = (q) => [q[1] / 12, q[0] / 12, q[2] / 12];
export { P3 };
export const FW_IN = GEO.firewall * 12;
/** engine excursion on the isolators at the accessory end (block G, LEZ-71-210: BOUND ±0.25 in each axis, typed from memory) */
export const ENG_MOTION = { each: 0.25, get vec() { return this.each * Math.sqrt(3); } };
/** clearance rules (DESIGN): rigid structure and mount tubes (ICD G-F5), the cowl skin */
export const CLR = { mount: 0.25, cowl: 0.50, hot: 1.0 };

// ------------------------------------------------------------------------------------------- obstacles
const boxP = (feat, lo, hi) => ({ t: 'box', feat, c: lo.map((v, i) => (v + hi[i]) / 2), d: lo.map((v, i) => hi[i] - v) });
/** the upper pick-ups (LEZ-71-222 rev B) as block G's sync draws them (system record → definition frame) */
const upkPrims = () => (partByPN('LEZ-71-222')?.geo || []).filter((g) => g.t === 'box').map((g) => ({ t: 'box', feat: 'LEZ-71-222', c: P3(g.c), d: [g.d[1] * 12, g.d[0] * 12, g.d[2] * 12] }));
export const OBST = {
  mount: () => mountPrims().map((p) => ({ ...p, feat: `mount ${p.feat}` })),
  cups: () => cupPrims().map((p) => ({ ...p, feat: `LEZ-71-224 ${p.feat}` })),
  brackets: () => bracketBoxes().map((b) => boxP(`LEZ-71-223 ${b.feat}`, b.lo, b.hi)),
  upk: upkPrims,
  engine: () => enginePrims().map((p) => ({ ...p, feat: `engine ${p.feat}` })),
  exhaust: () => [...exhaustPrims().map((p) => ({ ...p, feat: `LEZ-78-100 ${p.feat}` })), ...muffPrims().filter((p) => p.feat === 'muff').map((p) => ({ ...p, feat: 'LEZ-78-110 muff' }))],
  scat: () => muffPrims().filter((p) => p.feat === 'scat').map((p) => ({ ...p, feat: 'LEZ-78-110 SCAT' })),
  airbox: () => airboxPrims().map((p) => ({ ...p, feat: `LEZ-71-251 ${p.feat}` })),
  cooler: () => [...coolerPrims().map((p) => ({ ...p, feat: `LEZ-79-110 ${p.feat}` })), ...hosePrims().map((p) => ({ ...p, feat: 'LEZ-79-115 hose' }))],
};
export const structure = () => [...OBST.mount(), ...OBST.cups(), ...OBST.brackets(), ...OBST.upk()];

// ------------------------------------------------------------------------------------------- distances
function segDist(p1, q1, p2, q2) { const d1 = sub(q1, p1), d2 = sub(q2, p2), r = sub(p1, p2), a = dot(d1, d1), e = dot(d2, d2), f = dot(d2, r); let s, t;
  if (a < 1e-12 && e < 1e-12) return len(r);
  if (a < 1e-12) { s = 0; t = Math.min(1, Math.max(0, f / e)); } else { const c = dot(d1, r); if (e < 1e-12) { t = 0; s = Math.min(1, Math.max(0, -c / a)); } else { const b = dot(d1, d2), den = a * e - b * b; s = den > 1e-12 ? Math.min(1, Math.max(0, (b * f - c * e) / den)) : 0; t = (b * s + f) / e; if (t < 0) { t = 0; s = Math.min(1, Math.max(0, -c / a)); } else if (t > 1) { t = 1; s = Math.min(1, Math.max(0, (b - c) / a)); } } }
  return len(sub(add(p1, mul(d1, s)), add(p2, mul(d2, t)))); }
export const segSeg = segDist;
const boxD = (q, p) => len([0, 1, 2].map((i) => Math.max(Math.abs(q[i] - p.c[i]) - p.d[i] / 2, 0)));
/** surface-to-surface clearance (in) from a polyline of radius r to a set of primitives; { d, at (feature), seg } */
export function clearTo(pts, r, prims, from = 1, to = pts.length - 1) {
  let w = { d: Infinity, at: null, seg: null };
  for (let i = Math.max(1, from); i <= to; i++) for (const p of prims) {
    let d;
    if (p.t === 'cyl' || p.t === 'cone') d = segDist(pts[i - 1], pts[i], p.a, p.b) - (p.r ?? Math.max(p.r1, p.r2));
    else if (p.t === 'box') {
      const a = pts[i - 1], b = pts[i], gap = (k) => Math.max(0, Math.max(Math.min(a[k], b[k]) - p.c[k], p.c[k] - Math.max(a[k], b[k])) - p.d[k] / 2);
      if (Math.hypot(gap(0), gap(1), gap(2)) - 1e-7 - r >= w.d) continue;   // the segment's bounds already clear the worst so far (perf)
      // samples every 0.05 in: the same points and arithmetic as boxD(add(a, mul(sub(b, a), k / n)), p), without allocating
      const v0 = b[0] - a[0], v1 = b[1] - a[1], v2 = b[2] - a[2], n = Math.max(1, Math.ceil(Math.hypot(v0, v1, v2) / 0.05)); d = Infinity;
      for (let k = 0; k <= n; k++) { const t = k / n, e = Math.hypot(Math.max(Math.abs(a[0] + v0 * t - p.c[0]) - p.d[0] / 2, 0), Math.max(Math.abs(a[1] + v1 * t - p.c[1]) - p.d[1] / 2, 0), Math.max(Math.abs(a[2] + v2 * t - p.c[2]) - p.d[2] / 2, 0)); if (e < d) d = e; } }
    else continue;
    d -= r; if (d < w.d) w = { d, at: p.feat, seg: i };
  }
  return w;
}
/** distance (in) from a point in the engine bay to the cowl's inner skin in its station plane. Within block G's carb-scoop
 *  blister (LEZ-71-250) the cowl bottom is open over the blister's mouth: there the limit is the blister's inner skin
 *  (its ring, G's `scoopRing`), and points below the cowl line inside the blister count as inside (ICD phase 2). */
const pip2 = ([x, y], poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };
export function skinDist(q) {
  const s = q[1] / 12; if (s <= GEO.firewall || s >= GEO.cowl.s1) return Infinity;
  const inFus = insideFus(s, q[0] / 12, q[2] / 12, 0), blister = s > SCOOP.s0 && s < SCOOP.s1, bot = fusAt(s).bot * 12;
  const ring = blister ? scoopRing(s, SCP.t / 12, 61) : null, span = ring ? [Math.min(...ring.map((p) => p[0])), Math.max(...ring.map((p) => p[0]))] : null, open = (y, z) => ring && z < bot + 0.75 && y > span[0] && y < span[1];
  if (!inFus && !(ring && pip2([q[0], q[2]], ring.map((p) => [p[0], p[2]])))) return -1;
  let best = Infinity; for (const [y, z] of contourRing(s, 360, -COWL_T)) if (!open(y, z)) best = Math.min(best, Math.hypot(y - q[0], z - q[2]));
  if (ring) for (let i = 1; i < ring.length; i++) { const a = ring[i - 1], b = ring[i], ab = [b[0] - a[0], b[2] - a[2]], t = Math.max(0, Math.min(1, ((q[0] - a[0]) * ab[0] + (q[2] - a[2]) * ab[1]) / (ab[0] ** 2 + ab[1] ** 2 || 1))); best = Math.min(best, Math.hypot(a[0] + t * ab[0] - q[0], a[2] + t * ab[1] - q[2])); }
  return best;
}
/** clearance (in) of a run (radius r) to the cowl's inner skin, sampled every 0.25 in aft of the firewall */
export function cowlClear(pts, r) {
  let w = { d: Infinity, at: null };
  for (let i = 1; i < pts.length; i++) { const n = Math.max(1, Math.ceil(len(sub(pts[i], pts[i - 1])) / 0.25)); for (let k = 0; k <= n; k++) { const q = add(pts[i - 1], mul(sub(pts[i], pts[i - 1]), k / n)); if (q[1] <= FW_IN + 0.5) continue; const d = skinDist(q) - r; if (d < w.d) w = { d, at: q.map((v) => +v.toFixed(2)) }; } }
  return w;
}

// ------------------------------------------------------------------------------------------- run geometry
export const ptsOf = (run) => run.nodes.map((n) => n.p);
export const pathLen = (pts) => pts.slice(1).reduce((a, q, i) => a + len(sub(q, pts[i])), 0);
/** per interior corner: deflection and the largest fillet radius the legs allow (half the shorter leg) */
export function corners(pts) {
  const out = [];
  for (let i = 1; i < pts.length - 1; i++) { const a = sub(pts[i - 1], pts[i]), b = sub(pts[i + 1], pts[i]), La = len(a), Lb = len(b);
    const c = Math.max(-1, Math.min(1, dot(a, b) / (La * Lb))), defl = Math.PI - Math.acos(c);
    out.push({ i, defl, R: defl < 1e-4 ? Infinity : Math.min(La, Lb) / 2 / Math.tan(defl / 2), at: pts[i] }); }
  return out;
}
/** tightest bend of a run: corners at formed fittings (elbows, terminations) listed in run.rigid are excluded */
export function tightest(run) { const rig = new Set(run.rigid || []); const c = corners(ptsOf(run)).filter((q) => !rig.has(q.i)); return c.length ? c.reduce((a, q) => (q.R < a.R ? q : a)) : { R: Infinity, i: null }; }
/** arc length at each node */
export function arc(pts) { const s = [0]; for (let i = 1; i < pts.length; i++) s.push(s[i - 1] + len(sub(pts[i], pts[i - 1]))); return s; }
/** longest unsupported span (in): ends and clamped nodes are supports */
export function maxSpan(run) {
  const pts = ptsOf(run), s = arc(pts), sup = run.nodes.map((n, i) => (n.clamp ? s[i] : null)).filter((v) => v != null);
  let m = 0, at = 0; for (let k = 1; k < sup.length; k++) if (sup[k] - sup[k - 1] > m) { m = sup[k] - sup[k - 1]; at = k; }
  return { span: m, at };
}
/** the free span that bridges the airframe and the engine: from the last airframe-held node to the first engine-held node */
/** runs are listed from the airframe end to the engine end; every node held by a clamp says by what ('air' / 'eng') */
export function bridge(run) {
  const n = run.nodes, b = n.findIndex((q) => q.clamp === 'eng');
  if (b < 0) return null;
  let a = -1; for (let i = b - 1; i >= 0; i--) if (n[i].clamp === 'air') { a = i; break; }
  if (a < 0) return null;
  const pts = ptsOf(run).slice(a, b + 1), L = pathLen(pts), chord = len(sub(pts.at(-1), pts[0])), rig = new Set((run.rigid || []).map((i) => i - a)), cs = corners(pts).filter((q) => !rig.has(q.i)), R0 = cs.length ? Math.min(...cs.map((q) => q.R)) : Infinity;
  const dl = ENG_MOTION.vec, kAdd = 6 * dl / (L * L), Rmin = run.bendMin, Rnet = 1 / (1 / R0 + kAdd);
  return { a, b, L, chord, excess: L - chord, R0, Rnet, Rmin, need: dl, msSlack: (L - chord) / dl - 1, msBend: Rnet / Rmin - 1 };
}
/** primitives for a run's solid: one tube per segment (closed-form volumes; no fill at the bends) */
export const runPrims = (pts, ro, ri, feat, group = feat) => pts.slice(1).map((b, i) => ({ t: 'cyl', feat, group, a: T3(pts[i]), b: T3(b), r: r4(ro), ...(ri > 0 ? { ri: r4(ri) } : {}) }));
/** a run's crossing of the firewall plane (BL, WL) and its distance from a pass centre (in) */
export function fwCrossing(pts) {
  for (let i = 1; i < pts.length; i++) { const A = pts[i - 1], B = pts[i]; if ((A[1] - FW_IN) * (B[1] - FW_IN) <= 0 && A[1] !== B[1]) { const t = (FW_IN - A[1]) / (B[1] - A[1]); return [A[0] + t * (B[0] - A[0]), A[2] + t * (B[2] - A[2])]; } }
  return null;
}
void fusAt;
/** index range of a run's polyline with `trim` inches cut from the start / end (for ends that land on a terminal or port) */
export function trimIdx(pts, trimA = 0, trimB = 0) { const s = arc(pts), L = s.at(-1); let i0 = 1, i1 = pts.length - 1; while (i0 < pts.length - 1 && s[i0 - 1] < trimA) i0++; while (i1 > i0 && L - s[i1] < trimB) i1--; return [i0, i1]; }
