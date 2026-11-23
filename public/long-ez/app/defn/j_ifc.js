// Block J: interface checks shared by the J records, computed live against the partners' published geometry: B's panel
// layout and hood, C's pedals over their travel, D's master cylinders, E's crank sweep and NG-30 plates, A's bulkhead
// hole tables, ballast and ELT inserts, C's wing systems conduit, every other block's parts as primitives. Inches.
import { PARTS, partByPN, routes, insideOML, zoneOf } from '../systems.js';
import { CUTS, HOOD, PANEL, insidePoly } from '../parts/wpB3_panel.js';
import { NG } from '../parts/ng_layout.js';
import { LINK } from '../parts/wpC1_controls.js';
import { bboxOf, primBox } from './blkB_prims.js';
import * as L from '../parts/wpJ0_layout.js';
import { JP } from '../parts/wpJ1_avionics.js';

export const fx = (x, n = 2) => (Number.isFinite(x) ? x.toFixed(n) : String(x));
const J = /^LEZ-(31-1[1-6]|31-12|34-1|23-1|25-16)/;
const ok = (c, detail) => ({ ok: !!c, detail });
// ------------------------------------------------------------------------------------------- distances
const ptBox = (p, b) => Math.hypot(Math.max(b[0] - p[0], 0, p[0] - b[1]), Math.max(b[2] - p[1], 0, p[1] - b[3]), Math.max(b[4] - p[2], 0, p[2] - b[5]));
const boxBox = (a, b) => Math.hypot(Math.max(b[0] - a[1], 0, a[0] - b[1]), Math.max(b[2] - a[3], 0, a[2] - b[3]), Math.max(b[4] - a[5], 0, a[4] - b[5]));
const IN3 = (q) => [q[1] * 12, q[0] * 12, q[2] * 12];   // model ft [FS, BL, WL] → [BL, FS, WL] in
/** another part's display primitives as samples: [{pn, kind, box?, pts?, r}] in the prims frame (in) */
export function others(filter = () => true) {
  const out = [];
  for (const p of PARTS) { if (J.test(p.pn) || p.hide3D || !filter(p.pn)) continue;
    for (const g of p.geo || []) { if (g.draw === false) continue;
      if (g.t === 'box') { const c = IN3(g.c), d = [g.d[1] * 12, g.d[0] * 12, g.d[2] * 12]; out.push({ pn: p.pn, box: [c[0] - d[0] / 2, c[0] + d[0] / 2, c[1] - d[1] / 2, c[1] + d[1] / 2, c[2] - d[2] / 2, c[2] + d[2] / 2] }); }
      else if (g.t === 'cyl' || g.t === 'path') { const P = g.t === 'cyl' ? [g.a, g.b] : g.pts, r = g.t === 'cyl' ? g.r * 12 : (g.dIn || 0.25) / 2, pts = [];
        for (let i = 1; i < P.length; i++) { const a = IN3(P[i - 1]), b = IN3(P[i]), n = Math.max(2, Math.ceil(Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) / 0.25)); for (let k = 0; k <= n; k++) pts.push(a.map((v, j) => v + (b[j] - v) * k / n)); }
        out.push({ pn: p.pn, pts, r }); }
      else if (g.t === 'sphere') out.push({ pn: p.pn, pts: [IN3(g.c)], r: g.r * 12 }); } }
  return out;
}
const dist = (b, o) => (o.box ? boxBox(b, o.box) : Math.min(...o.pts.map((p) => ptBox(p, b))) - o.r);
const segPt = (p, a, b) => { const ab = b.map((v, i) => v - a[i]), L2 = ab.reduce((s, v) => s + v * v, 0), t = Math.max(0, Math.min(1, p.reduce((s, v, i) => s + (v - a[i]) * ab[i], 0) / (L2 || 1))); return Math.hypot(...p.map((v, i) => v - a[i] - t * ab[i])); };
/** distance from a point to a J primitive (boxes exact, rods and tubes to their surface, spheres) */
export const ptPrim = (p, m) => (m.k === 'cyl' ? Math.max(0, segPt(p, m.a, m.b) - m.r) : m.k === 'sph' ? Math.max(0, Math.hypot(...p.map((v, i) => v - m.c[i])) - m.r) : ptBox(p, primBox(m)));
/** least clearance from a J part's solid (each primitive's box) to every other block's part; except: pn regexp to skip */
export function clearance(pn, except = /^$/, prims = null) {
  const P = (prims || JP[pn].prims()).filter((m) => m.k !== 'ext'), O = others((q) => !except.test(q));
  let w = { d: Infinity, pn: '—' };
  for (const m of P) { const b = primBox(m); for (const o of O) { let d = dist(b, o); if (m.k === 'cyl' && !o.box && d < 1) d = Math.min(...o.pts.map((p) => ptPrim(p, m))) - o.r; if (d < w.d) w = { d, pn: o.pn }; } }
  return w;
}
// ------------------------------------------------------------------------------------------- moving partners
const pedalAxis = () => { const c = (partByPN('LEZ-27-150')?.geo || []).find((g) => g.t === 'cyl' && Math.abs(g.a[1] - g.b[1]) * 12 > 15); return c ? [c.a[0] * 12, c.a[2] * 12] : [37.44, 37.44]; };
/** C's pedals swept from neutral to full (pad forward, 0 → C's stop LINK.pedalDeg, 17.6° since DC-005 (2026-11-21), which strokes the rudder 30° on the unloaded geometry;
 *  each pedal moves forward only, its stops behind it at neutral and full), with D's master cylinders on them: least
 *  clearance to a J part. The toe stroke moves only D's rod and C's toe tab, forward of the cross tube. */
export const PEDAL_DEG = () => LINK.pedalDeg;
export function pedalSweep(pn, prims = null) {
  const P = (prims || JP[pn].prims()).filter((m) => m.k !== 'ext'), [fa, za] = pedalAxis(), geo = ['LEZ-27-150', 'LEZ-32-311'].flatMap((q) => (partByPN(q)?.geo || []).filter((g) => g.draw !== false));
  let w = Infinity;
  for (let k = 0, n = 8; k <= n; k++) { const deg = PEDAL_DEG() * k / n, t = deg * Math.PI / 180, rot = (q) => { const f = q[1] - fa, z = q[2] - za; return [q[0], fa + f * Math.cos(t) + z * Math.sin(t), za - f * Math.sin(t) + z * Math.cos(t)]; };
    for (const g of geo) { let pts = [], r = 0;
      if (g.t === 'box') { const c = IN3(g.c), d = [g.d[1] * 12, g.d[0] * 12, g.d[2] * 12]; for (const i of [-0.5, 0, 0.5]) for (const j of [-0.5, 0, 0.5]) for (const k of [-0.5, 0, 0.5]) pts.push([c[0] + i * d[0], c[1] + j * d[1], c[2] + k * d[2]]); }
      else if (g.t === 'cyl') { const a = IN3(g.a), b = IN3(g.b); r = g.r * 12; for (let k = 0; k <= 8; k++) pts.push(a.map((v, j) => v + (b[j] - v) * k / 8)); } else continue;
      pts = pts.map(rot); for (const m of P) for (const p of pts) w = Math.min(w, ptPrim(p, m) - r); } }
  return w;
}
/** E's gear crank: arm and knob swept about the shaft (axis FS-wise through NG.crank), true 3D clearance to a J part */
export function crankSweep(pn) {
  const c = NG.crank.map((v) => v * 12), arm = NG.crankR * 12, P = JP[pn].prims().filter((m) => m.k !== 'ext');
  const zones = [{ fs: [c[0] + 0.36, c[0] + 0.60], r: [0.4, arm + 0.01] }, { fs: [c[0] + 0.60, c[0] + 1.80], r: [arm - 0.30, arm + 0.30] }];   // E's arm (0.24 thick, 0.36 wide) and knob (Ø 0.60 × 1.2)
  let w = Infinity; for (const Z of zones) for (let k = 0; k < 72; k++) { const a = k * Math.PI / 36; for (const rr of [Z.r[0], (Z.r[0] + Z.r[1]) / 2, Z.r[1]]) for (const f of [Z.fs[0], Z.fs[1]]) { const p = [c[1] + rr * Math.cos(a), f, c[2] + rr * Math.sin(a)]; for (const m of P) w = Math.min(w, ptPrim(p, m)); } }
  return w;
}
/** B's glareshield hood: least clearance from a body forward of the panel (top of its boxes, the round section of its
 *  rods) to the hood's inner surface over the hood's length */
export function hoodClear(pn) {
  const inner = HOOD.pts.slice(HOOD.pts.length / 2), zAt = (y) => { let zt = Infinity; for (let i = 1; i < inner.length; i++) { const a = inner[i - 1], c = inner[i]; if ((a[0] - y) * (c[0] - y) <= 0 && a[0] !== c[0]) zt = Math.min(zt, a[1] + (y - a[0]) / (c[0] - a[0]) * (c[1] - a[1])); } return zt; };
  const pts = []; for (const m of JP[pn].prims()) { const b = primBox(m); if (!(b[3] > HOOD.u0 && b[2] < HOOD.u1)) continue;
    if (m.k === 'cyl' && Math.abs(m.a[1] - m.b[1]) > 0.5) for (let k = 0; k <= 36; k++) { const t = k * Math.PI / 36; pts.push([m.a[0] + m.r * Math.cos(t), m.a[2] + m.r * Math.sin(t)]); }
    else for (const y of [b[0], (b[0] + b[1]) / 2, b[1]]) pts.push([y, b[5]]); }
  return pts.length ? Math.min(...pts.map(([y, z]) => zAt(y) - z)) : Infinity;
}
// ------------------------------------------------------------------------------------------- the panel layout
const cut = (id) => CUTS.find((C) => C.id === id);
const mine = (id) => L.CUT[id];
/** the J layout's copy of B's cut-out equals B's live table; the face covers it ≥ 0.10 in a side; the body passes inside it */
export function onCut(id, face, body) {
  const C = cut(id), m = mine(id); if (!C) return ok(false, `B has no cut-out ${id}`);
  const same = C.rect ? C.rect.every((v, i) => Math.abs(v - m[i]) < 0.005) : C.circ.every((v, i) => Math.abs(v - m[i]) < 0.005);
  const c = C.rect ? [(C.rect[0] + C.rect[1]) / 2, (C.rect[2] + C.rect[3]) / 2] : [C.circ[0], C.circ[1]], w = C.rect ? C.rect[1] - C.rect[0] : 2 * C.circ[2], h = C.rect ? C.rect[3] - C.rect[2] : 2 * C.circ[2];
  const cover = Math.min((face[0] - w) / 2, (face[1] - h) / 2), fit = Math.min((w - body[0]) / 2, (h - body[1]) / 2);
  const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => [c[0] + a * face[0] / 2, c[1] + b * face[1] / 2]), inside = corners.every((q) => insidePoly(q, PANEL.pts));
  return ok(same && cover >= 0.10 - 1e-9 && fit >= -1e-9 && inside, `B's ${id} ${C.rect ? `${fx(w)} × ${fx(h)}` : `Ø ${fx(w, 3)}`} at ${fx(c[0])}, ${fx(c[1])} ${same ? '= J layout' : '≠ J layout'}; face covers it by ${fx(cover)} (≥ 0.10); body inside by ${fx(fit)}; face corners inside the panel outline ${inside ? 'yes' : 'NO'}`);
}
/** faces on the panel's aft face do not overlap each other (≥ 0.10 in) */
export function facesApart() {
  const F = [['axis', E3(L.AXIS_C, L.ENV.axis.bezel)], ['g5', E3(L.G5_C, L.ENV.g5.bezel)], ['warn', E3(L.WARN_C, L.ENV.warn.face)], ['elt', E3(L.ELTR_C, L.ENV.eltRemote.face)], ['sw', E3(L.SW_C, L.ENV.sw.plate)]];
  let w = { d: Infinity }; for (let i = 0; i < F.length; i++) for (let j = i + 1; j < F.length; j++) { const a = F[i][1], b = F[j][1], d = Math.max(b[0] - a[1], a[0] - b[1], b[2] - a[3], a[2] - b[3]); if (d < w.d) w = { d, a: F[i][0], b: F[j][0] }; }
  return ok(w.d >= 0.10, `closest faces ${w.a} / ${w.b}: ${fx(w.d)} in apart (≥ 0.10)`);
}
function E3(c, d) { return [c[0] - d[0] / 2, c[0] + d[0] / 2, c[1] - d[2] / 2, c[1] + d[2] / 2]; }
// ------------------------------------------------------------------------------------------- routes and holes
/** every crossing of a J part's routes through a plane lies inside a hole of the partner's live table */
export function throughHoles(pn, plane, holes, label) {
  const R = routes().filter((r) => r.part === pn), bad = [], hit = [];
  for (const r of R) for (let i = 1; i < r.pts.length; i++) { const a = r.pts[i - 1], b = r.pts[i]; if ((a[0] - plane) * (b[0] - plane) >= 0) continue; const t = (plane - a[0]) / (b[0] - a[0]), y = (a[1] + t * (b[1] - a[1])) * 12, z = (a[2] + t * (b[2] - a[2])) * 12, rr = (r.dIn || 0.25) / 2;
    const h = holes.find((q) => Math.hypot(q.y - y, q.z - z) + rr <= q.r + 1e-3); (h ? hit : bad).push(`${fx(y)}, ${fx(z)}${h ? ` in ${h.id || 'hole'}` : ''}`); }
  return ok(!bad.length, `${label}: ${hit.length} crossing(s) in holes${hit.length ? ` (${hit.join('; ')})` : ''}${bad.length ? `; NOT IN A HOLE: ${bad.join('; ')}` : ''}`);
}
/** a route lies in a zone or on its declared external segments everywhere (the clash audit's zone rule, restated) */
export const inZones = (pn) => { const R = routes().filter((r) => r.part === pn); let n = 0; for (const r of R) for (let i = 1; i < r.pts.length; i++) { if (r.external || (r.extSeg || []).includes(i)) continue; for (let k = 0; k <= 8; k++) { const p = r.pts[i - 1].map((v, j) => v + (r.pts[i][j] - v) * k / 8); if (!zoneOf(p)) n++; } } return ok(!n, n ? `${n} sample(s) outside every zone` : `${R.length} run(s) inside the airframe zones (declared external segments excepted)`); };
export const onOML = (p) => insideOML(p);
export { J, ok };
