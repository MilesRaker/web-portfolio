// SLAB_PASS — shared pass-through kit for flat bulkheads and panels (LEZ-31-100 rev C fix, used by B's panel and hood,
// A's F28 / rear bulkhead / seat back / firewall and E's F22). A routed line crosses a flat part of finite thickness at
// an angle, often through a bend, so its footprint in the part's plane is not one circle at the mid-plane: it is the
// union of the tube's cross-sections through the whole slab (the tube circle at both faces and everything between,
// plus the spherical end-cap overhang within a radius of each face). This kit samples every routed path (raw polyline
// and its drawn fillet) and every rod (cyl) along its length through a slab [w0 − r, w1 + r] of a part plane, gives
// each pass the least round hole that covers that footprint with its clearance, and measures how close every sample
// comes to the part's material (web, rim, bonded edge) with the openings it actually has, so a margin-form check can
// stand on the part's record. Plane frames are wpA0_flat's: origin o (ft, [FS, BL, WL]), in-plane axes eu, ev and the
// normal en; u, v, w in inches. Notional.
import { PARTS, filletPts } from '../systems.js';

const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
/** a model point (ft) in a plane frame (in): u, v in the plane, w through it (wpA0_flat's toPlane) */
export const toPlane = (P, p) => { const d = sub(p, P.o); return { u: dot(d, P.eu) * 12, v: dot(d, P.ev) * 12, w: dot(d, P.en) * 12 }; };
export function pip([x, y], poly) { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; }

const STEP = 0.03;   // sample spacing along a line (in)
const FIL = new WeakMap();
const filleted = (g) => { const c = FIL.get(g); if (c && c.src === g.pts && c.R === g.bendR) return c.pts; const pts = filletPts(g.pts, g.bendR).pts; FIL.set(g, { src: g.pts, R: g.bendR, pts }); return pts; };
/** a line's radius (in): paths ½ OD (¼ in when not given), rods their radius */
export const lineR = (g) => (g.t === 'cyl' ? g.r * 12 : (g.dIn ?? (g.r ? g.r * 24 : 0.25)) / 2);
/** the polylines of a part primitive that are lines: a path's points and its drawn fillet, a rod's axis */
const polysOf = (g) => (g.t === 'path' && g.pts ? (g.bendR ? [g.pts, filleted(g)] : [g.pts]) : g.t === 'cyl' && g.a && g.b ? [[g.a, g.b]] : []);

/** every pass of every routed line through the slab [w0, w1] (in) of plane P: [{pn, gi, t, cls, r, samples: [{u, v, w,
 *  rr}], end}], rr the tube's section radius at that sample (the full radius inside the slab, the end cap's within r
 *  of a face). A line that crosses the slab twice gives two passes; end marks a pass in which the line ends (a fitting or
 *  termination on the part, placed by its own hole table, not a pass-through). skip(pn, g) leaves lines out. */
export function slabPasses(P, w0, w1, skip = () => false) {
  const out = [];
  for (const p of PARTS) for (const [gi, g] of (p.geo || []).entries()) {
    const L = polysOf(g); if (!L.length || skip(p.pn, g)) continue; const r = lineR(g), passes = [];
    for (const [k, pts] of L.entries()) {
      const Q = pts.map((q) => toPlane(P, q)); let cur = null;
      for (let i = 0; i < Q.length - 1; i++) { const a = Q[i], b = Q[i + 1];
        if (Math.max(a.w, b.w) < w0 - r || Math.min(a.w, b.w) > w1 + r) { cur = null; continue; }
        const Ls = Math.hypot(b.u - a.u, b.v - a.v, b.w - a.w), n = Math.max(2, Math.ceil(Ls / STEP));
        for (let j = 0; j <= n; j++) { const f = j / n, q = { u: a.u + f * (b.u - a.u), v: a.v + f * (b.v - a.v), w: a.w + f * (b.w - a.w) };
          const dw = q.w < w0 ? w0 - q.w : q.w > w1 ? q.w - w1 : 0; if (dw >= r) { cur = null; continue; }
          const rr = Math.sqrt(r * r - dw * dw); if (rr < 0.01) continue;
          if (!cur) { cur = { samples: [], fil: k > 0 }; passes.push(cur); }
          if ((i === 0 && j === 0) || (i === Q.length - 2 && j === n)) cur.end = true;   // the line ends here (a termination, not a pass)
          cur.samples.push({ u: q.u, v: q.v, w: q.w, rr }); } }
      cur = null;
    }
    // a fillet's samples join the raw pass they shadow (within 1 in of it)
    const raw = passes.filter((q) => !q.fil), fil = passes.filter((q) => q.fil);
    for (const f of fil) { const m = raw.find((q) => q.samples.some((s) => f.samples.some((t) => Math.hypot(s.u - t.u, s.v - t.v) < 1))); if (m) { m.samples.push(...f.samples); m.end = m.end || f.end; } else raw.push(f); }
    for (const q of raw) out.push({ pn: p.pn, gi, t: g.t, cls: g.cls || g.t, r, end: !!q.end, samples: q.samples });
  }
  return out;
}
/** the least circle enclosing discs {u, v, R} (Bădoiu–Clarkson on the discs' far points, then the exact radius) */
export function enclose(D) {
  let c = [(Math.min(...D.map((d) => d.u - d.R)) + Math.max(...D.map((d) => d.u + d.R))) / 2, (Math.min(...D.map((d) => d.v - d.R)) + Math.max(...D.map((d) => d.v + d.R))) / 2];
  const far = (c) => D.reduce((a, d) => { const e = Math.hypot(d.u - c[0], d.v - c[1]) + d.R; return e > a.e ? { e, d } : a; }, { e: -1 });
  for (let k = 1; k <= 400; k++) { const { d } = far(c), L = Math.hypot(d.u - c[0], d.v - c[1]) || 1, p = [d.u + (d.u - c[0]) / L * d.R, d.v + (d.v - c[1]) / L * d.R]; c = [c[0] + (p[0] - c[0]) / (k + 1), c[1] + (p[1] - c[1]) / (k + 1)]; }
  return { u: c[0], v: c[1], r: far(c).e };
}
/** a round hole over a pass's whole footprint with clearance clr (in), radius rounded up to `q` and at least rMin */
export function footHole(pass, clr, q = 1 / 32, rMin = 0) {
  const e = enclose(pass.samples.map((s) => ({ u: s.u, v: s.v, R: s.rr + clr })));
  return { u: e.u, v: e.v, r: Math.max(rMin, Math.ceil((e.r - 1e-9) / q) * q), drift: enclose(pass.samples.map((s) => ({ u: s.u, v: s.v, R: 0 }))).r };
}
const segD = (p, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy || 1))); return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy); };
export const polyDist = (q, P) => { let m = Infinity; for (let i = 0; i < P.length; i++) m = Math.min(m, segD(q, P[i], P[(i + 1) % P.length])); return m; };
/** how far a point sits inside an opening (> 0) or outside it (< 0): circles {u, v, r}, rectangles {rect: [u0, u1, v0, v1]}, polygons {pts} */
export function depthIn(q, o) {
  if (o.rect) { const R = o.rect, d = Math.min(q[0] - R[0], R[1] - q[0], q[1] - R[2], R[3] - q[1]); if (d >= 0) return d; return -Math.hypot(Math.max(R[0] - q[0], 0, q[0] - R[1]), Math.max(R[2] - q[1], 0, q[1] - R[3])); }
  if (o.pts) { const d = polyDist(q, o.pts); return pip(q, o.pts) ? d : -d; }
  return o.r - Math.hypot(q[0] - o.u, q[1] - o.v);
}
/** the free distance at q: how far a tube centred there may grow before it touches the part's material (the outline
 *  polygons less the openings); negative inside the material (how deep) */
export function freeAt(q, outlines, openings) {
  const inMat = outlines.filter((P) => pip(q, P)), dEdge = Math.min(...outlines.map((P) => polyDist(q, P)));
  const best = openings.reduce((a, o) => Math.max(a, depthIn(q, o)), -Infinity);
  if (!inMat.length) return Math.max(dEdge, best);
  return best > 0 ? best : Math.max(best, -dEdge);
}
/** does a pass reach into the part, or come within `near` (in) of its outline? */
export const touches = (pass, outlines, near = 0) => pass.samples.some((s) => outlines.some((P) => pip([s.u, s.v], P) || polyDist([s.u, s.v], P) < s.rr + near));
/** the slab check: every sample of every pass through the part kept clr(pass) clear of its material.
 *  Returns per line the worst sample: margin = free − rr (in), need = clr, ms = margin / need − 1. Rods seated in one of
 *  the `fitted` openings (bolt, pin and fitting holes, sized as fits by the part) are left to that fit. */
export function slabAudit(passes, outlines, openings, clr, fitted = []) {
  const rows = [];
  for (const p of passes) { let w = null;
    if (p.t === 'cyl' && fitted.some((o) => p.samples.every((s) => depthIn([s.u, s.v], o) >= s.rr - 0.02))) continue;   // a bolt or pin in its fit hole
    for (const s of p.samples) { const m = freeAt([s.u, s.v], outlines, openings) - s.rr; if (!w || m < w.margin) w = { margin: m, u: s.u, v: s.v, w: s.w }; }
    const need = clr(p); rows.push({ pn: p.pn, gi: p.gi, cls: p.cls, r: p.r, need, ...w, ms: w.margin / need - 1 }); }
  return rows.sort((a, b) => a.ms - b.ms);
}

/** the passes through a flat part that count for its holes and its slab check: every line through [w0, w1] that is not a
 *  termination and reaches the outline or comes within its clearance of it */
export const partPasses = (P, w0, w1, outlines, clr, skip = () => false) => slabPasses(P, w0, w1, skip).filter((c) => !c.end && touches(c, outlines, clr(c)));
/** a flat part's slab check as one margin row: the worst line over the slabs given ([{w0, w1, outlines, openings, fitted}]) */
export function slabWorst(P, slabs, clr, skip = () => false) {
  const rows = slabs.flatMap((S) => slabAudit(partPasses(P, S.w0, S.w1, S.outlines, clr, skip), S.outlines, S.openings, clr, S.fitted || []).map((r) => ({ ...r, slab: S.name || '' })));
  rows.sort((a, b) => a.ms - b.ms);
  return { rows, worst: rows[0] || null, n: rows.length };
}
/** the slab check as a margin row (mk from structures.js), one load case: the worst line through the part */
export function slabRow(mk, lc, id, name, sys, res, { slab, clr }) {
  const w = res.worst, ms = w ? Math.min(9, w.ms) : 9, f = (x) => x.toFixed(2);
  const r = mk('fuselage', id, name, lc, w ? `${w.pn}#${w.gi} at ${f(w.u)}, ${f(w.v)} (w ${f(w.w)})` : 'no line through it', 'clearance through the thickness', ms, {
    formula: 'every routed path and rod sampled along its length through the part\'s full thickness (0.03 in steps; the tube\'s section at each sample, its end cap within a radius of each face; the raw route and its drawn fillet): free = distance to the part\'s material (web, rim, bonded edge) with the openings the part has;  MS = min((free − r_section) / clearance) − 1',
    inputs: [['Lines through the slab', res.n, '', 'MODEL'], ['Slab', slab, 'text', 'GEOMETRY'], ['Clearance all round', clr, 'text', 'DESIGN'], ['Sample spacing', STEP, 'in', 'DESIGN']],
    result: [['Worst line', w ? `${w.pn}#${w.gi}` : '—', 'text'], ['Least clearance', w ? w.margin : 0, 'in'], ['Required', w ? w.need : 0, 'in']] });
  r.sys = sys; return r;
}
