// WPA0 — block A geometry kit for flat parts (bulkheads, firewall, ballast): outlines in a part plane, holes generated
// from the routed lines that cross the plane, region areas and the layer stack handed to cad/blkA_bulkhead.py.
// A part plane has an origin o (ft, [FS, BL, WL]) and unit axes eu, ev (in the plane) and en (through the thickness);
// in-plane coordinates u, v and the thickness coordinate w are in inches: u = (p − o)·eu, v = (p − o)·ev, w = (p − o)·en.
// A vertical bulkhead at station s uses o = [s, 0, 0], eu = BL, ev = WL, en = FS, so u = BL, v = WL and w = FS − s.
// Notional.
import { fusOutline } from '../structures.js';
import { PARTS, LOAD } from '../systems.js';
import { partPasses, footHole, polyDist, slabWorst, enclose } from './slab_pass.js';
/** geometry that reads other parts' routes (holes, slots, layouts), built on first use and rebuilt once every parts
 *  module has loaded (LOAD.done), so it never depends on import order. Used like the plain object it builds. */
export function lazyGeo(build) {
  let v = null, final = false;
  const get = () => { if (!v || (!final && LOAD.done)) { v = build(); final = LOAD.done; } return v; };
  return new Proxy({}, { get: (_, k) => get()[k], has: (_, k) => k in get(), ownKeys: () => Reflect.ownKeys(get()), getOwnPropertyDescriptor: (_, k) => { const d = Object.getOwnPropertyDescriptor(get(), k); return d && { ...d, configurable: true }; } });
}

export const r4 = (x) => Math.round(x * 1e4) / 1e4;
export const area2 = (p) => Math.abs(p.reduce((s, q, i) => { const r = p[(i + 1) % p.length]; return s + q[0] * r[1] - r[0] * q[1]; }, 0)) / 2;
export const perim = (p) => p.reduce((s, q, i) => { const r = p[(i + 1) % p.length]; return s + Math.hypot(r[0] - q[0], r[1] - q[1]); }, 0);
export function pip([x, y], poly) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; }
  return c;
}
/** Sutherland–Hodgman: a (possibly concave) polygon clipped to the rectangle [u0, u1, v0, v1] (exact area) */
export function clipRect(poly, [u0, u1, v0, v1]) {
  let out = poly;
  const E = [[(p) => p[0] >= u0, (a, b) => [u0, a[1] + (u0 - a[0]) / (b[0] - a[0]) * (b[1] - a[1])]], [(p) => p[0] <= u1, (a, b) => [u1, a[1] + (u1 - a[0]) / (b[0] - a[0]) * (b[1] - a[1])]],
    [(p) => p[1] >= v0, (a, b) => [a[0] + (v0 - a[1]) / (b[1] - a[1]) * (b[0] - a[0]), v0]], [(p) => p[1] <= v1, (a, b) => [a[0] + (v1 - a[1]) / (b[1] - a[1]) * (b[0] - a[0]), v1]]];
  for (const [ins, cut] of E) { const src = out; out = []; for (let i = 0; i < src.length; i++) { const a = src[i], b = src[(i + 1) % src.length]; if (ins(b)) { if (!ins(a)) out.push(cut(a, b)); out.push(b); } else if (ins(a)) out.push(cut(a, b)); } if (!out.length) break; }
  return out;
}
/** keep the part of a polygon on one side of a horizontal line v = c (keep: 'below' or 'above') */
export function clipV(poly, c, keep) { const big = 1e4; return clipRect(poly, keep === 'below' ? [-big, big, -big, c] : [-big, big, c, big]); }
export const circle = (h, n = 128) => Array.from({ length: n }, (_, i) => [h.u + h.r * Math.cos(2 * Math.PI * i / n), h.v + h.r * Math.sin(2 * Math.PI * i / n)]);
/** a polygon less a rectangle that crosses its boundary (a notch): the run of the outline inside the rectangle is
 *  replaced by the rectangle's own edges on the polygon's inside. Rectangles wholly inside are not notches (use holes). */
export function notch(poly, R) {
  const [u0, u1, v0, v1] = R, inR = (p) => p[0] > u0 && p[0] < u1 && p[1] > v0 && p[1] < v1;
  const per = 2 * (u1 - u0) + 2 * (v1 - v0);
  const tOf = ([x, y]) => { const e = 1e-7; if (Math.abs(y - v0) < e) return x - u0; if (Math.abs(x - u1) < e) return (u1 - u0) + (y - v0); if (Math.abs(y - v1) < e) return (u1 - u0) + (v1 - v0) + (u1 - x); return 2 * (u1 - u0) + (v1 - v0) + (v1 - y); };
  const ptOf = (t) => { t = ((t % per) + per) % per; const a = u1 - u0, b = v1 - v0; if (t <= a) return [u0 + t, v0]; if (t <= a + b) return [u1, v0 + t - a]; if (t <= 2 * a + b) return [u1 - (t - a - b), v1]; return [u0, v1 - (t - 2 * a - b)]; };
  const corners = [[u0, v0, 0], [u1, v0, u1 - u0], [u1, v1, u1 - u0 + v1 - v0], [u0, v1, 2 * (u1 - u0) + v1 - v0]];
  const hit = (a, b) => {   // Liang–Barsky: parameter interval of segment ab inside R
    let t0 = 0, t1 = 1; const dx = b[0] - a[0], dy = b[1] - a[1];
    for (const [p, q] of [[-dx, a[0] - u0], [dx, u1 - a[0]], [-dy, a[1] - v0], [dy, v1 - a[1]]]) { if (Math.abs(p) < 1e-14) { if (q < 0) return null; continue; } const r = q / p; if (p < 0) { if (r > t1) return null; if (r > t0) t0 = r; } else { if (r < t0) return null; if (r < t1) t1 = r; } }
    return t1 - t0 > 1e-12 ? [t0, t1] : null;
  };
  const at = (a, b, t) => [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])];
  const out = []; let entry = null, start = -1;
  const n = poly.length;
  // start the walk at a vertex outside R
  for (let i = 0; i < n; i++) if (!inR(poly[i])) { start = i; break; }
  if (start < 0) return poly;   // wholly inside: nothing left
  const path = (E, X) => {   // from E to X round R's boundary, on the polygon's inside
    const tE = tOf(E), tX = tOf(X), fwd = ((tX - tE) % per + per) % per, cand = [];
    for (const dir of [1, -1]) {
      const L = dir > 0 ? fwd : per - fwd, mid = ptOf(tE + dir * L / 2);
      const cs = corners.filter((c) => { const d = dir > 0 ? ((c[2] - tE) % per + per) % per : ((tE - c[2]) % per + per) % per; return d > 1e-9 && d < L - 1e-9; })
        .sort((p, q) => (dir > 0 ? (((p[2] - tE) % per + per) % per) - (((q[2] - tE) % per + per) % per) : (((tE - p[2]) % per + per) % per) - (((tE - q[2]) % per + per) % per)));
      cand.push({ ok: pip(mid, poly), pts: cs.map((c) => [c[0], c[1]]) });
    }
    return (cand.find((c) => c.ok) || cand[0]).pts;
  };
  for (let k = 0; k < n; k++) {
    const a = poly[(start + k) % n], b = poly[(start + k + 1) % n], h = hit(a, b);
    if (!entry) out.push(a);
    if (!h) continue;
    if (!entry && h[0] > 1e-12) { entry = at(a, b, h[0]); out.push(entry); }
    else if (!entry) { entry = a; }
    if (h[1] < 1 - 1e-12) { const X = at(a, b, h[1]); out.push(...path(entry, X), X); entry = null; }
  }
  return out;
}
/** the fuselage shell's inner contour at station s (ft) less off (in): [BL, WL] inches, from the bottom centre up the right side */
export const innerRing = (s, off, n = 360) => fusOutline(s, n, -off / 12).pts.map(([y, z]) => [y * 12, z * 12]);
/** plane frames */
export const vertPlane = (s) => ({ o: [s, 0, 0], eu: [0, 1, 0], ev: [0, 0, 1], en: [1, 0, 0] });
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const toPlane = (P, p) => { const d = sub(p, P.o); return { u: dot(d, P.eu) * 12, v: dot(d, P.ev) * 12, w: dot(d, P.en) * 12 }; };
/** every routed line (path) and cylinder axis of the system parts that crosses the plane: in-plane position, a clearance
 *  hole radius (in) and what it is. Paths get grommet holes (½ OD + 1/8 in, ≥ 1/4 in); cylinders (shafts, cables,
 *  fittings) a clearance hole (r + 1/16 in, ≥ 1/8 in). skip(pn) leaves parts out (their holes are placed by the record). */
export function crossings(P, skip = () => false) {
  const out = [];
  for (const p of PARTS) { if (skip(p.pn)) continue;
    for (const g of p.geo || []) {
      const pts = g.t === 'path' ? g.pts : g.t === 'cyl' ? [g.a, g.b] : null; if (!pts) continue;
      for (let i = 0; i < pts.length - 1; i++) {
        const A = toPlane(P, pts[i]), B = toPlane(P, pts[i + 1]); if (A.w * B.w >= 0) continue;
        const t = A.w / (A.w - B.w), u = A.u + t * (B.u - A.u), v = A.v + t * (B.v - A.v);
        let r, kind;
        if (g.t === 'path') { r = Math.max(0.25, Math.ceil(((g.dIn || 0.25) / 2 + 0.125) * 16) / 16); kind = 'pass'; }
        else { kind = 'fit'; r = Math.max(0.125, Math.ceil((g.r * 12 + 1 / 16) * 32) / 32); }
        out.push({ pn: p.pn, cls: g.cls || g.t, kind, u, v, r, what: p.pn });
      }
    }
  }
  return out;
}
/** rev (final integration, LEZ-31-100 rev C fix): every routed line through the part's slab w0–w1 (in), its hole sized
 *  from its swept footprint through the whole thickness (the tube at both faces and between, its radius and clearance),
 *  not from the mid-plane crossing alone. Same shape and clearance rules as crossings(): paths get grommet holes (½ OD +
 *  1/8 in all round the footprint, ≥ 1/4 in, to 1/16); rods a clearance hole (r + 1/16 in all round, ≥ 1/8 in, to 1/32).
 *  polys: the part's outline(s); a line counts when it reaches them or comes within its clearance of the edge. */
export const flatClr = (c) => (c.t === 'cyl' ? 1 / 16 : 0.125);
export function crossingsSlab(P, w0, w1, polys, skip = () => false) {
  return partPasses(P, w0, w1, polys, flatClr, skip).map((c) => { const path = c.t !== 'cyl', h = footHole(c, flatClr(c), path ? 1 / 16 : 1 / 32, path ? 0.25 : 0.125);
    return { pn: c.pn, cls: c.cls, kind: path ? 'pass' : 'fit', u: h.u, v: h.v, r: h.r, base: h.r - flatClr(c), what: c.pn, drift: h.drift, pass: c }; });
}
/** the through-thickness extent (in) of a layer stack: its full-outline layers (local doublers left to their regions) */
export const slabOf = (layers) => { const L = layers.filter((l) => !l.reg); return [Math.min(...L.map((l) => l.w0)), Math.max(...L.map((l) => l.w1))]; };
/** the slab check of a flat part from its CAD params: every line sampled through each outline's full-outline layers keeps
 *  its clearance (flatClr) from the material, in the holes the part has; rods in its fit holes (isFit) are left to the fit */
export function flatSlab(prm, isFit = (h) => h.id !== 'pass', skip = () => false) {
  const P = { o: prm.frame.o.map((x) => x / 12), eu: prm.frame.eu, ev: prm.frame.ev, en: prm.frame.en }, by = {};
  for (const l of prm.layers) { if (l.reg) continue; const b = (by[l.ol] = by[l.ol] || { w0: Infinity, w1: -Infinity }); b.w0 = Math.min(b.w0, l.w0); b.w1 = Math.max(b.w1, l.w1); }
  const op = prm.holes.map((h) => ({ u: h.u, v: h.v, r: h.r })), fit = prm.holes.filter(isFit).map((h) => ({ u: h.u, v: h.v, r: h.r }));
  return slabWorst(P, Object.entries(by).map(([ol, b]) => ({ name: ol, w0: b.w0, w1: b.w1, outlines: prm.polys[ol], openings: op, fitted: fit })), flatClr, skip);
}
/** merge crowding grommet holes into one: lines whose holes come within gap of each other form a group, and the group
 *  gets one hole enclosing all its members (centre of their extents, radius to the farthest member's edge); bolt and
 *  fitting holes are kept apart */
export function mergeHoles(raw, gap = 0.25) {
  const enc = (g) => { if (g.length > 1 && g.every((q) => q.pass)) {   // footprint members (crossingsSlab): the least circle over every member's footprint and clearance
      const e = enclose(g.flatMap((q) => q.pass.samples.map((s) => ({ u: s.u, v: s.v, R: s.rr + q.r - q.base })))); return { ...g[0], u: e.u, v: e.v, r: e.r, what: [...new Set(g.map((q) => q.what))].join(', '), n: g.length, pass: null }; }
    const cu = (Math.min(...g.map((q) => q.u - q.r)) + Math.max(...g.map((q) => q.u + q.r))) / 2, cv = (Math.min(...g.map((q) => q.v - q.r)) + Math.max(...g.map((q) => q.v + q.r))) / 2;
    return { ...g[0], u: cu, v: cv, r: g.length > 1 ? Math.max(...g.map((q) => Math.hypot(q.u - cu, q.v - cv) + q.r)) : g[0].r, what: [...new Set(g.map((q) => q.what))].join(', '), n: g.length }; };
  let groups = raw.filter((h) => h.kind === 'pass').map((h) => [h]);
  for (let again = true; again;) {
    again = false;
    const E = groups.map(enc);
    outer: for (let i = 0; i < groups.length; i++) for (let j = i + 1; j < groups.length; j++) if (Math.hypot(E[i].u - E[j].u, E[i].v - E[j].v) < E[i].r + E[j].r + gap) { groups[i] = [...groups[i], ...groups[j]]; groups.splice(j, 1); again = true; break outer; }
  }
  const holes = [...groups.map(enc), ...raw.filter((h) => h.kind !== 'pass').map((h) => ({ ...h }))];
  for (const h of holes) { if (h.kind === 'pass') h.r = Math.ceil(h.r * 16) / 16; h.u = r4(h.u); h.v = r4(h.v); }
  return holes;
}
/** holes closer than min to the outline become notches open to the nearest edge (a slot as wide as the hole; also a rod
 *  passing through an opening whose footprint grazes its edge); returns
 *  the new outline, the holes kept, and the notch rectangles with what runs through them */
export function edgeNotches(pts, holes, min = 0.25) {
  const keep = [], slots = [];
  for (const h of holes) {
    const e = edgeOf(h, [pts]); if ((h.kind !== 'pass' && !(h.kind === 'fit' && e < -h.r)) || e >= min) { keep.push(h); continue; }   // a rod whose footprint centre lies in an opening and only grazes its edge widens the opening
    let best = null; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length], d = segD([h.u, h.v], a, b); if (!best || d < best.d) { const dx = b[0] - a[0], dy = b[1] - a[1], t = Math.max(0, Math.min(1, ((h.u - a[0]) * dx + (h.v - a[1]) * dy) / (dx * dx + dy * dy || 1))); best = { d, p: [a[0] + t * dx, a[1] + t * dy] }; } }
    const du = best.p[0] - h.u, dv = best.p[1] - h.v, out = 2;
    const R = e < -h.r ? [h.u - h.r, h.u + h.r, h.v - h.r, h.v + h.r]   // centre in the opening: widen the opening over the footprint only
      : Math.abs(dv) >= Math.abs(du) ? [h.u - h.r, h.u + h.r, dv < 0 ? h.v - h.r - out : h.v - h.r, dv < 0 ? h.v + h.r : h.v + h.r + out] : [du < 0 ? h.u - h.r - out : h.u - h.r, du < 0 ? h.u + h.r : h.u + h.r + out, h.v - h.r, h.v + h.r];
    pts = notch(pts, R); slots.push({ R: R.map(r4), what: h.what });
  }
  return { pts, holes: keep, slots };
}
const segD = (p, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy || 1))); return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy); };
/** distance from a hole's edge to the nearest outline edge of the polygon it lies in (in) */
export const edgeOf = (h, polys) => { const inn = polys.filter((q) => pip([h.u, h.v], q)); return inn.length ? Math.min(...inn.map((q) => Math.min(...q.map((a, i) => segD([h.u, h.v], a, q[(i + 1) % q.length]))))) - h.r : -Math.min(...polys.map((q) => polyDist([h.u, h.v], q))) - h.r; };   // centre outside: notch it
export function ligament(holes) { let m = Infinity; for (let i = 0; i < holes.length; i++) for (let j = i + 1; j < holes.length; j++) m = Math.min(m, Math.hypot(holes[i].u - holes[j].u, holes[i].v - holes[j].v) - holes[i].r - holes[j].r); return m; }
/** net area (in²) of a layer: its outline polygons, intersected with the region rectangles (regs) or less the cut
 *  rectangles (cuts), less every hole whose centre lies in one of the polygons (circles clipped the same way) */
export function areaOf(polys, holes, regs = null, cuts = []) {
  if (regs) regs = cells(regs); cuts = cells(cuts);   // overlapping rectangles count once, as the CAD union does
  const inside = holes.filter((h) => polys.some((q) => pip([h.u, h.v], q)));
  const part = (poly) => (regs ? regs.reduce((s, R) => s + area2(clipRect(poly, R)), 0) : area2(poly) - cuts.reduce((s, K) => s + area2(clipRect(poly, K)), 0));
  return polys.reduce((s, q) => s + part(q), 0) - inside.reduce((s, h) => s + part(circle(h)), 0);
}
/** a set of rectangles as disjoint cells covering their union (coordinate compression): exact for any overlap */
export function cells(rects) {
  if (rects.length < 2) return rects;
  const us = [...new Set(rects.flatMap((R) => [R[0], R[1]]))].sort((a, b) => a - b), vs = [...new Set(rects.flatMap((R) => [R[2], R[3]]))].sort((a, b) => a - b), out = [];
  for (let i = 0; i < us.length - 1; i++) for (let j = 0; j < vs.length - 1; j++) { const cu = (us[i] + us[i + 1]) / 2, cv = (vs[j] + vs[j + 1]) / 2;
    if (rects.some((R) => cu > R[0] && cu < R[1] && cv > R[2] && cv < R[3])) out.push([us[i], us[i + 1], vs[j], vs[j + 1]]); }
  return out;
}
/** a region's net area when the region set is a list of rectangles (in²), for the ply book and the mass */
export const rectArea = ([u0, u1, v0, v1]) => Math.max(0, u1 - u0) * Math.max(0, v1 - v0);
/** the params handed to cad/blkA_bulkhead.py */
export function flatParams({ P, polys, holes, layers, regs = {}, cuts = {} }) {
  const rr = (a) => a.map(([u, v]) => [r4(u), r4(v)]), f = (x) => +x.toFixed(9);
  return { frame: { o: P.o.map((x) => f(x * 12)), eu: P.eu.map(f), ev: P.ev.map(f), en: P.en.map(f) },
    polys: Object.fromEntries(Object.entries(polys).map(([k, ps]) => [k, ps.map(rr)])), holes: holes.map((h, i) => ({ id: h.id, n: i, u: r4(h.u), v: r4(h.v), r: r4(h.r), ...(h.only ? { only: h.only } : {}) })),
    layers: layers.map((l) => ({ name: l.name, feat: l.feat || l.name, mat: l.mat, w0: r4(l.w0), w1: r4(l.w1), ol: l.ol, reg: l.reg || null, cut: l.cut || null })),
    regs: Object.fromEntries(Object.entries(regs).map(([k, rs]) => [k, rs.map((R) => R.map(r4))])), cuts: Object.fromEntries(Object.entries(cuts).map(([k, rs]) => [k, rs.map((R) => R.map(r4))])) };
}
/** layer volumes (in³) from the params, the way the CAD script builds them */
export function flatVolumes(p) {
  const H = (l) => p.holes.filter((h) => !h.only || h.only.includes(l.name)).map((h) => ({ u: h.u, v: h.v, r: h.r }));
  return Object.fromEntries(p.layers.map((l) => [l.name, areaOf(p.polys[l.ol], H(l), l.reg ? p.regs[l.reg] : null, l.cut ? p.cuts[l.cut] : []) * (l.w1 - l.w0)]));
}
/** lines crossing a slab of the part between w0 and w1 (in): one hole per line that covers its whole run through the
 *  slab (centre of the entry and exit points, radius the line's clearance plus half the drift) */
export function crossingsThrough(P, w0, w1, skip = () => false) {
  const out = [];
  for (const p of PARTS) { if (skip(p.pn)) continue;
    for (const g of p.geo || []) { if (g.t !== 'path') continue;
      const pts = g.pts.map((q) => toPlane(P, q)), seg = [];
      for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1]; if (Math.max(a.w, b.w) < w0 || Math.min(a.w, b.w) > w1 || a.w === b.w) continue;
        const t0 = Math.max(0, Math.min(1, (w0 - a.w) / (b.w - a.w))), t1 = Math.max(0, Math.min(1, (w1 - a.w) / (b.w - a.w))); for (const t of [t0, t1]) seg.push([a.u + t * (b.u - a.u), a.v + t * (b.v - a.v)]); }
      if (!seg.length) continue;
      const us = seg.map((q) => q[0]), vs = seg.map((q) => q[1]), u = (Math.min(...us) + Math.max(...us)) / 2, v = (Math.min(...vs) + Math.max(...vs)) / 2;
      const drift = Math.max(...seg.map((q) => Math.hypot(q[0] - u, q[1] - v)));
      out.push({ pn: p.pn, cls: g.cls, kind: 'pass', u, v, r: Math.ceil(((g.dIn || 0.25) / 2 + 0.125 + drift) * 16) / 16, what: p.pn });
    }
  }
  return out;
}
