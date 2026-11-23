// Block B: the record side of cad/blkB_prims.py. Exact volumes and bounding boxes of the primitives a solid is built from,
// so a record can state its volumes and mass and the audit can measure them back. Inches. Notional.
import { want, r4 } from './util.js';

const area = (p) => Math.abs(p.reduce((a, q, i) => { const r = p[(i + 1) % p.length]; return a + q[0] * r[1] - r[0] * q[1]; }, 0)) / 2;
export const polyArea = area;
/** volume of one primitive (in³); holes in an extrusion lie inside it and do not overlap */
export function primVol(m) {
  if (m.k === 'box') return m.d[0] * m.d[1] * m.d[2];
  if (m.k === 'cyl') { const L = Math.hypot(m.b[0] - m.a[0], m.b[1] - m.a[1], m.b[2] - m.a[2]); return Math.PI * (m.r * m.r - (m.ri || 0) ** 2) * L; }
  if (m.k === 'sph') return 4 / 3 * Math.PI * m.r ** 3;
  if (m.k === 'ext') return (area(m.pts) - (m.holes || []).reduce((a, h) => a + (h.r ? Math.PI * h.r * h.r : area(h.pts)), 0)) * Math.abs(m.u1 - m.u0);
  throw new Error(`primitive ${m.k}`);
}
export const groupVols = (prims) => prims.reduce((o, m) => { o[m.g] = (o[m.g] || 0) + primVol(m); return o; }, {});
/** exact bounding box [x0, x1, y0, y1, z0, z1] */
export function primBox(m) {
  if (m.k === 'box') return [0, 1, 2].flatMap((i) => [m.c[i] - m.d[i] / 2, m.c[i] + m.d[i] / 2]);
  if (m.k === 'sph') return [0, 1, 2].flatMap((i) => [m.c[i] - m.r, m.c[i] + m.r]);
  if (m.k === 'cyl') { const v = [0, 1, 2].map((i) => m.b[i] - m.a[i]), L = Math.hypot(...v); return [0, 1, 2].flatMap((i) => { const e = m.r * Math.sqrt(Math.max(0, 1 - (v[i] / L) ** 2)); return [Math.min(m.a[i], m.b[i]) - e, Math.max(m.a[i], m.b[i]) + e]; }); }
  const P = m.pts.map((q) => q[0]), Q = m.pts.map((q) => q[1]), U = [Math.min(m.u0, m.u1), Math.max(m.u0, m.u1)], pp = [Math.min(...P), Math.max(...P)], qq = [Math.min(...Q), Math.max(...Q)];
  return m.ax === 'x' ? [...U, ...pp, ...qq] : m.ax === 'y' ? [...pp, ...U, ...qq] : [...pp, ...qq, ...U];
}
export function bboxOf(prims) {
  const b = [Infinity, -Infinity, Infinity, -Infinity, Infinity, -Infinity];
  for (const m of prims) { const q = primBox(m); for (let i = 0; i < 6; i += 2) { b[i] = Math.min(b[i], q[i]); b[i + 1] = Math.max(b[i + 1], q[i + 1]); } }
  return b;
}
/** the standard measure-back rows: overall size in each axis, every group's volume, the primitive count */
export function primsExpect(p, m, labels = ['Width, BL (in)', 'Length, FS (in)', 'Height, WL (in)']) {
  const V = groupVols(p.prims), mv = m.volumes || {}, b = bboxOf(p.prims), mb = m.bbox || [NaN, NaN, NaN, NaN, NaN, NaN];
  return [...labels.map((l, i) => want(l, b[2 * i + 1] - b[2 * i], mb[2 * i + 1] - mb[2 * i], 0.002)),
    ...Object.keys(V).map((g) => want(`${g} volume (in³)`, V[g], mv[g] ?? NaN, Math.max(0.0005, V[g] * 0.002))), want('Primitives', p.prims.length, m.prims ?? NaN, 0)];
}
/** mass (lb) from group volumes × densities (lb/in³) */
export const massFrom = (vols, rho) => Object.entries(vols).reduce((a, [g, v]) => a + v * (rho[g] ?? NaN), 0);
/** round every number in a primitive list (params are hashed: keep them stable and short) */
export function tidy(prims) {
  const R = (x) => (Array.isArray(x) ? x.map(R) : typeof x === 'number' ? r4(x) : x && typeof x === 'object' ? Object.fromEntries(Object.entries(x).map(([k, v]) => [k, R(v)])) : x);
  return prims.map(R);
}
export const RHO = { steel: 0.283, cres: 0.286, al: 0.098, bronze: 0.233, acetal: 0.051, nylon: 0.041, acrylic: 0.0430, urethane: 0.040, rubber: 0.045, foamC: 0.0012, foamR: 0.0016, polyester: 0.0498, fabric: 0.0340 };
/** a system record's display primitives (ft, [FS, BL, WL] model frame) as solid primitives (in, x = BL, y = FS, z = WL),
 *  grouped by material: the record's own geometry becomes the solid it is measured against */
const MAP = (p) => [p[1] * 12, p[0] * 12, p[2] * 12];
export function fromGeo(geo, gOf = (g) => g.mat || 'part') {
  const out = [];
  for (const g of geo) {
    if (g.draw === false) continue;
    if (g.t === 'box') out.push({ k: 'box', g: gOf(g), c: MAP(g.c), d: [g.d[1] * 12, g.d[0] * 12, g.d[2] * 12] });
    else if (g.t === 'cyl') out.push({ k: 'cyl', g: gOf(g), a: MAP(g.a), b: MAP(g.b), r: g.r * 12, ...(g.wall ? { ri: g.r * 12 - g.wall * 12 } : {}) });
    else if (g.t === 'sphere') out.push({ k: 'sph', g: gOf(g), c: MAP(g.c), r: g.r * 12 });
  }
  return tidy(out);
}
