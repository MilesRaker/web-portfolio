// Block G: shared helpers for parts whose solid is built from primitives by cad/g_prims.py (boxes with through-holes,
// cylinders and tubes with axial holes, frustum shells, ruled lofts between two parallel planar sections). The record's
// params carry the primitives; the expected volume of each primitive is worked out here in closed form and measured back
// from the solid, so the solid, the drawing and the mass all come from the same numbers. Inches. Notional.
import { r4, want } from './util.js';

const sub = (a, b) => a.map((v, i) => v - b[i]), dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], len = (a) => Math.hypot(...a);
const crs = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
/** Newell area vector of a planar polygon (3D points) */
function areaVec(pts) { let n = [0, 0, 0]; for (let i = 0; i < pts.length; i++) { const c = crs(pts[i], pts[(i + 1) % pts.length]); n = n.map((v, k) => v + c[k]); } return n.map((v) => v / 2); }
const cent = (pts) => [0, 1, 2].map((k) => pts.reduce((a, p) => a + p[k], 0) / pts.length);
/** closed-form volume of one primitive (in³), less its own holes */
export function primVol(p) {
  if (p.t === 'box') return p.d[0] * p.d[1] * p.d[2] - (p.holes || []).reduce((a, h) => a + Math.PI * h.r * h.r * p.d[h.ax], 0);
  if (p.t === 'cyl') { const L = len(sub(p.b, p.a)); return Math.PI * (p.r * p.r - (p.ri || 0) ** 2) * L - (p.holes || []).reduce((a, h) => a + Math.PI * h.r * h.r * L, 0); }
  if (p.t === 'cone') { const L = len(sub(p.b, p.a)), f = (a, b) => Math.PI * L / 3 * (a * a + a * b + b * b); return f(p.r1, p.r2) - f(p.r1 - p.w, p.r2 - p.w); }
  if (p.t === 'loft') {   // prismatoid: exact for a ruled loft between corresponding vertices of two parallel sections
    const [A, B] = p.secs, M = A.map((q, i) => q.map((v, k) => (v + B[i][k]) / 2)), nA = areaVec(A), n = nA.map((v) => v / len(nA)), h = Math.abs(dot(sub(cent(B), cent(A)), n));
    const ar = (s) => Math.abs(dot(areaVec(s), n));
    return h / 6 * (ar(A) + 4 * ar(M) + ar(B));
  }
  throw new Error(`unknown primitive ${p.t}`);
}
/** a tube along a polyline as one cylinder primitive per segment (no fill at the bends) */
export const pathPrims = (pts, ro, ri, feat, group = feat) => pts.slice(1).map((b, i) => ({ t: 'cyl', feat, group, a: pts[i].map(r4), b: b.map(r4), r: r4(ro), ri: r4(ri) }));
/** round every number in a primitive to 4 places (the params are hashed) */
export const tidy = (p) => JSON.parse(JSON.stringify(p, (k, v) => (typeof v === 'number' ? r4(v) : v)));
/** group volumes in closed form */
export function groupVols(prims) { const g = {}; for (const p of prims) g[p.group] = (g[p.group] || 0) + primVol(p); return g; }
/** measured-back rows: every primitive's volume, each group's, the primitive count */
export function primsExpect(p, m, extra = []) {
  const v = m.prims || [], gv = groupVols(p.prims), mg = m.volumes || {};
  const rows = [want('Primitives built', p.prims.length, v.length, 0)];
  p.prims.forEach((q, i) => { const e = primVol(q); rows.push(want(`${q.feat}: ${q.t} ${i + 1} volume (in³)`, e, v[i] ?? NaN, Math.max(2e-4, e * 2e-4))); });
  for (const [g, e] of Object.entries(gv)) rows.push(want(`Group ${g} volume (in³)`, e, mg[g] ?? NaN, Math.max(5e-4, e * 2e-4)));
  return [...rows, ...extra];
}
/** mass from group volumes × densities (lb/in³) */
export const massOfGroups = (rho) => (m) => Object.entries(m.volumes || {}).reduce((a, [g, v]) => a + v * (rho[g] ?? NaN), 0);
export const massOfPrims = (prims, rho) => Object.entries(groupVols(prims)).reduce((a, [g, v]) => a + v * rho[g], 0);
/** bounding box of the primitives (approximate for cylinders off-axis: their end discs' extents), [xmin, xmax, ymin, ymax, zmin, zmax] */
export function primsBox(prims) {
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity], put = (q) => q.forEach((v, k) => { lo[k] = Math.min(lo[k], v); hi[k] = Math.max(hi[k], v); });
  for (const p of prims) {
    if (p.t === 'box') { put(p.c.map((v, k) => v - p.d[k] / 2)); put(p.c.map((v, k) => v + p.d[k] / 2)); }
    else if (p.t === 'loft') p.secs.flat().forEach(put);
    else { const n = sub(p.b, p.a), L = len(n), e = n.map((v) => v / L), r = p.r ?? Math.max(p.r1, p.r2);
      for (const c of [p.a, p.b]) { const rr = p.t === 'cone' ? (c === p.a ? p.r1 : p.r2) : r; put(c.map((v, k) => v - rr * Math.sqrt(Math.max(0, 1 - e[k] * e[k])))); put(c.map((v, k) => v + rr * Math.sqrt(Math.max(0, 1 - e[k] * e[k])))); } }
  }
  return [lo[0], hi[0], lo[1], hi[1], lo[2], hi[2]];
}
