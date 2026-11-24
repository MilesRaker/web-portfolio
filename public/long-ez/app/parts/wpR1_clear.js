// WPR1 — cabin routing clearance pass (DC-012, 2026-11-23). Runs last, on the final routes, before the clamps, supports,
// conduits and the panel hole table are rebuilt from them (systems.js LOAD.after). Several cabin wiring and pitot-static
// runs went straight through equipment that later blocks placed on their lanes: the left signal raceway through the throttle
// quadrant, the panel trunk and the magnetometer harness through the GEA 24, the right RF / signal runs through the stick
// base, the control stops and the pitch-trim lever, the forward harness through the battery. For every electrical and
// pitot-static run forward of the firewall, each stretch that enters a drawn equipment primitive (cots, machined,
// weldment, mechanism) is carried around it: over, under or beside, whichever is the smallest offset that clears every
// obstacle by 0.2 in and keeps the run inside the fuselage, eased in and out over at least 1 in either side. A run's own
// terminations (the box it plugs into) are not obstacles. routeClashes() reports what is left (the Systems / Definition
// checks read the same rule). Notional.
import { GEO } from '../structures.js';
import { PARTS, zoneOf, SEP } from '../systems.js';

const IN = 1 / 12, CLEAR = 0.2 * IN, END = 1.5 * IN, STEP = 0.1 * IN;
export const CLEAR_CLASSES = new Set(['signal', 'power', 'rf', 'ign', 'pitot']);
const OBST_KINDS = new Set(['cots', 'machined', 'weldment', 'mechanism']);
/** fittings that sit on a run (the run passes through them by design): not obstacles to it */
const OWN = { 'LEZ-34-130': ['LEZ-34-132', 'LEZ-34-135'] };
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], len = (a) => Math.hypot(a[0], a[1], a[2]);

/** signed distance (ft) from p to a drawn primitive; boxes and oboxes may be pitched about the lateral axis (sysgeom) */
function sdf(g, p) {
  if (g.t === 'box' || g.t === 'obox') {
    let d = sub(p, g.c);
    if (g.pitch) { const a = -g.pitch * Math.PI / 180, cs = Math.cos(a), sn = Math.sin(a); d = [d[0] * cs + d[2] * sn, d[1], -d[0] * sn + d[2] * cs]; }   // s–z plane
    const q = d.map((v, i) => Math.abs(v) - g.d[i] / 2), o = Math.hypot(Math.max(q[0], 0), Math.max(q[1], 0), Math.max(q[2], 0));
    return o + Math.min(Math.max(q[0], q[1], q[2]), 0);
  }
  if (g.t === 'cyl') {
    const ab = sub(g.b, g.a), L = len(ab), u = mul(ab, 1 / L), ap = sub(p, g.a), t = dot(ap, u), rad = len(sub(ap, mul(u, t)));
    const dr = rad - g.r, ds = Math.max(-t, t - L);
    return dr > 0 && ds > 0 ? Math.hypot(dr, ds) : Math.max(dr, ds);
  }
  if (g.t === 'sphere') return len(sub(p, g.c)) - g.r;
  return Infinity;
}
const bbox = (g) => {
  if (g.t === 'box' || g.t === 'obox') { const e = g.pitch ? Math.hypot(g.d[0], g.d[2]) / 2 : 0; return [g.c.map((v, i) => v - (e && i !== 1 ? e : g.d[i] / 2)), g.c.map((v, i) => v + (e && i !== 1 ? e : g.d[i] / 2))]; }
  if (g.t === 'cyl') return [g.a.map((v, i) => Math.min(v, g.b[i]) - g.r), g.a.map((v, i) => Math.max(v, g.b[i]) + g.r)];
  if (g.t === 'sphere') return [g.c.map((v) => v - g.r), g.c.map((v) => v + g.r)];
  return null;
};
/** laminate the runs pass through (the instrument panel, the bulkheads, the seat backs, the firewall): a detour may not move a run where it crosses one (its hole) */
function laminates() {
  const out = [];
  for (const p of PARTS) { if (p.kind !== 'laminate' || !/panel and glareshield|bulkhead|firewall|seat back|^F2[28]\b/i.test(p.name)) continue; for (const g of p.geo || []) { const bb = bbox(g); if (bb) out.push({ pn: p.pn, g, lo: bb[0], hi: bb[1] }); } }
  // bulkhead F22 (LEZ-53-160) is not drawn as a system part: its plane at FS 22 (core and faces, 0.6 in) stands in for it
  { const g = { t: 'box', c: [22 / 12, 0, 36 / 12], d: [0.6 / 12, 30 / 12, 24 / 12] }, bb = bbox(g); out.push({ pn: 'LEZ-53-160', g, lo: bb[0], hi: bb[1] }); }
  return out;
}
let LAMS = [];
function obstacles() {
  const out = [];
  for (const p of PARTS) {
    if (!(OBST_KINDS.has(p.kind) || (p.kind === 'laminate' && /shelf/i.test(p.name || ''))) || p.hide3D || /^LEZ-20-1/.test(p.pn)) continue;   // the avionics shelf too
    for (const g of p.geo || []) { if (g.draw === false || g.external) continue; const bb = bbox(g); if (bb) out.push({ pn: p.pn, g, lo: bb[0], hi: bb[1] }); }
  }
  return out;
}
const near = (o, p, m) => p[0] > o.lo[0] - m && p[0] < o.hi[0] + m && p[1] > o.lo[1] - m && p[1] < o.hi[1] + m && p[2] > o.lo[2] - m && p[2] < o.hi[2] + m;

/** samples along a polyline: { p, arc, seg } every STEP */
function samples(pts) {
  const out = []; let arc = 0;
  for (let i = 1; i < pts.length; i++) {
    const d = sub(pts[i], pts[i - 1]), L = len(d), n = Math.max(1, Math.ceil(L / STEP));
    for (let k = 0; k < n; k++) out.push({ p: add(pts[i - 1], mul(d, k / n)), arc: arc + L * k / n, seg: i });
    arc += L;
  }
  out.push({ p: pts.at(-1), arc, seg: pts.length - 1 });
  return out;
}
const arcs = (pts) => { const a = [0]; for (let i = 1; i < pts.length; i++) a.push(a[i - 1] + len(sub(pts[i], pts[i - 1]))); return a; };
const at = (pts, A, s) => { let i = 1; while (i < pts.length - 1 && A[i] < s) i++; const t = (s - A[i - 1]) / ((A[i] - A[i - 1]) || 1); return add(pts[i - 1], mul(sub(pts[i], pts[i - 1]), Math.min(1, Math.max(0, t)))); };

/** the run's interferences: [{ o, a, b, depth }] (arc range, ft), its terminations and ends excluded */
function clashes(g, OB) {
  const r = (g.dIn || 0.25) * IN / 2, S = samples(g.pts), L = S.at(-1).arc, ends = [g.pts[0], g.pts.at(-1)];
  const ext = new Set(g.extSeg || []), res = [];
  for (const o of OB) {
    if (ends.some((e) => near(o, e, 1.0 * IN) && sdf(o.g, e) < 1.0 * IN)) continue;   // a termination
    let cur = null;
    for (const q of S) {
      if (q.arc < END || q.arc > L - END || ext.has(q.seg) || !near(o, q.p, r + CLEAR)) { if (cur) { res.push(cur); cur = null; } continue; }
      const d = r + 0.05 * IN - sdf(o.g, q.p);   // report only real interference (0.05 in tolerance); the detour clears by CLEAR
      if (d > 0) { if (!cur) cur = { o, a: q.arc, b: q.arc, depth: d }; cur.b = q.arc; cur.depth = Math.max(cur.depth, d); }
      else if (cur) { res.push(cur); cur = null; }
    }
    if (cur) res.push(cur);
  }
  return res.sort((x, y) => x.a - y.a);
}
// separation from the other runs (in): the class rules (systems.js SEP), block J's EMC rule for its sensitive runs (power 0.5,
// ignition 2, the shielded P-leads not touching) and no run touching another. A detour may not take a run closer to another
// than the rule, nor closer than it already was where it was already inside the rule.
const J_SENS = new Set(['LEZ-23-125', 'LEZ-31-121', 'LEZ-25-162', 'LEZ-23-110', 'LEZ-34-111']);
const sepIn = (pa, a, pb, b) => {
  let need = SEP[`${a.cls}|${b.cls}`] ?? SEP[`${b.cls}|${a.cls}`] ?? 0;
  const emc = (x, y) => (J_SENS.has(x) ? (y.pn === 'LEZ-74-100' ? 0.01 : y.cls === 'power' ? 0.5 : y.cls === 'ign' ? 2 : 0) : 0);
  return Math.max(need, emc(pa, { pn: pb, cls: b.cls }), emc(pb, { pn: pa, cls: a.cls }), 0.01);
};
function segPt(p, a, b) { const ab = sub(b, a), t = Math.max(0, Math.min(1, dot(sub(p, a), ab) / (dot(ab, ab) || 1))); return len(sub(p, add(a, mul(ab, t)))); }
function minClear(P, others, per) {   // least clearance (in) from sample points P to each other run, less radii, against its rule: worst (clear − need); per: fills one value per run
  let worst = Infinity;
  for (const [oi, o] of others.entries()) {
    let wo = Infinity;
    const lo = o.lo, hi = o.hi, m = o.reach;
    for (const p of P) {
      if (p[0] < lo[0] - m || p[0] > hi[0] + m || p[1] < lo[1] - m || p[1] > hi[1] + m || p[2] < lo[2] - m || p[2] > hi[2] + m) continue;
      let d = Infinity; for (let j = 1; j < o.g.pts.length; j++) d = Math.min(d, segPt(p, o.g.pts[j - 1], o.g.pts[j]));
      wo = Math.min(wo, d * 12 - o.rr - o.need);
    }
    if (per) per[oi] = wo;
    worst = Math.min(worst, wo);
  }
  return worst;
}
/** tightest corner (fillet the legs allow, half the shorter leg) among the vertices from i0 to i1, ft */
function tightestR(pts, i0, i1) {
  let R = Infinity;
  for (let i = Math.max(1, i0); i <= Math.min(pts.length - 2, i1); i++) {
    const u = sub(pts[i], pts[i - 1]), v = sub(pts[i + 1], pts[i]), lu = len(u), lv = len(v);
    if (lu < 1e-9 || lv < 1e-9) continue;
    const th = Math.acos(Math.max(-1, Math.min(1, dot(u, v) / lu / lv)));
    if (th < 1e-4) continue;
    R = Math.min(R, Math.min(lu, lv) / 2 / Math.tan(th / 2));
  }
  return R;
}
const sepWorse = (P0, P1, others, tol) => { const w0 = [], w1 = []; minClear(P0, others, w0); minClear(P1, others, w1); return w1.findIndex((v, i) => v < Math.min(0, w0[i] ?? Infinity) - tol); };
const okPath = (pts, g, OB, r, a0, b0, others, P0, tgt) => {
  const P = [];
  for (const q of samples(pts)) {
    if (q.arc < a0 || q.arc > b0) continue;
    if (!zoneOf(q.p)) { DBG.push(['pzone', g.__pn, q.p.map((v) => +(v * 12).toFixed(1))]); return false; }
    for (const o of OB) if (near(o, q.p, r + CLEAR) && sdf(o.g, q.p) < r + (o === tgt ? CLEAR : 0.1 * IN) - 1e-4) { DBG.push(['pobst', g.__pn, o.pn]); return false; }   // the one being cleared by 0.2 in, the rest by 0.1 in
    P.push(q.p);
  }
  const bad = others ? sepWorse(P0, P, others, 1e-3) : -1; if (bad >= 0) DBG.push(['psep', g.__pn, others[bad].pn]);
  return bad < 0;
};

/** carry one interference around its obstacle; returns the new points and an index map, or null */
function detour(g, c, OB, others) {
  const pts = g.pts, A = arcs(pts), L = A.at(-1), r = (g.dIn || 0.25) * IN / 2;
  const pa = at(pts, A, c.a), pb = at(pts, A, c.b), u0 = sub(pb, pa), u = len(u0) > 1e-6 ? mul(u0, 1 / len(u0)) : sub(at(pts, A, Math.min(L, c.b + IN)), pa);
  // pitot-static runs keep their rising profile (block J's drain rule): they step sideways only
  const dirs = [[0, 0, 1], [0, 0, -1], [0, 1, 0], [0, -1, 0], [1, 0, 0], [-1, 0, 0]].filter((e) => Math.abs(dot(e, u)) / (len(u) || 1) < 0.7 && !(g.cls === 'pitot' && e[2]));
  const rule = g.bendRule || 0;
  const S = samples(pts).filter((q) => q.arc >= c.a - 0.3 * IN && q.arc <= c.b + 0.3 * IN);
  const cands = [];
  for (const e of dirs) {
    // smallest offset along e that takes every sample of the stretch clear of this obstacle
    let need = 0;
    for (const q of S) { let k = 0; while (k < 80 && sdf(c.o.g, add(q.p, mul(e, k * 0.05 * IN))) < r + CLEAR) k++; need = Math.max(need, k * 0.05 * IN); }
    let found = false;
    for (const extra of [0, 0.15, 0.35, 0.7, 1.2, 2.0, 3.0]) for (const rk of [1.3, 2.5, 4, 6]) {
      if (found) break;
      // the ramps shorten (to 0.3 in) where the stretch is close to an end of the run, so a run can leave its terminal sideways
      const D = need + extra * IN, ramp = Math.max(1.0 * IN, rk * D);
      const rA = Math.min(ramp, c.a - 0.3 * IN - 0.25 * IN), rB = Math.min(ramp, L - 0.25 * IN - c.b - 0.3 * IN);
      if (rA < 0.3 * IN || rB < 0.3 * IN) continue;
      const a0 = c.a - 0.3 * IN - rA, b0 = c.b + 0.3 * IN + rB;
      if ((g.extSeg || []).some((i) => A[i] > a0 && A[i - 1] < b0)) continue;
      if (samples(pts).some((q) => q.arc > a0 - 0.1 * IN && q.arc < b0 + 0.1 * IN && LAMS.some((o) => near(o, q.p, r + 0.25 * IN) && sdf(o.g, q.p) < r + 0.25 * IN))) continue;   // keeps its hole
      const w = (s) => (s <= a0 || s >= b0 ? 0 : s >= c.a - 0.3 * IN && s <= c.b + 0.3 * IN ? 1 : s < c.a ? (s - a0) / rA : (b0 - s) / rB);
      const ease = (t) => t * t * (3 - 2 * t);
      const keyS = [a0, c.a - 0.3 * IN, c.b + 0.3 * IN, b0];
      const inner = A.map((s, i) => ({ s, i })).filter(({ s }) => s > a0 && s < b0 && keyS.every((k) => Math.abs(s - k) > 0.5 * IN));
      const stations = [...new Set([...keyS, ...inner.map((x) => x.s)])].sort((x, y) => x - y);
      const mid = stations.map((s) => add(at(pts, A, s), mul(e, D * ease(w(s)))));
      const before = pts.filter((_, i) => A[i] < a0 - 1e-9), after = pts.filter((_, i) => A[i] > b0 + 1e-9);
      const np = [...before, ...mid, ...after];
      const P0 = samples(pts).filter((q) => q.arc >= a0 - 0.2 * IN && q.arc <= b0 + 0.2 * IN).map((q) => q.p);
      if (!okPath(np, g, OB, r, a0 - 0.2 * IN, b0 + 0.2 * IN, others, P0, c.o)) continue;
      const iA = before.length - 1, iB = before.length + mid.length;
      if (rule && tightestR(np, iA, iB) < Math.min(rule, tightestR(pts, Math.max(0, iA), Math.min(pts.length - 1, iA + inner.length + 1))) - 1e-6) continue;
      // index map: old vertex i → new index (vertices inside the detour map to their shifted copy)
      const map = pts.map((_, i) => { if (A[i] < a0 - 1e-9) return i; if (A[i] > b0 + 1e-9) return before.length + mid.length + (i - (pts.length - after.length)); const k = stations.findIndex((s) => Math.abs(s - A[i]) < 1e-9); return k < 0 ? -1 : before.length + k; });
      cands.push({ D, np, map, e }); found = true;
    }
  }
  if (!cands.length) return null;
  return cands.sort((x, y) => x.D - y.D)[0];
}

/** remap the index-based fields of a path after its points changed */
function remap(g, map, nOld, nNew) {
  if (g.rwSpan) { const [a, b] = g.rwSpan; let i = a; while (i < b && !(map[i] >= 0)) i++; let j = b; while (j > a && !(map[j] >= 0)) j--; g.rwSpan = [map[i] >= 0 ? map[i] : a, map[j] >= 0 ? map[j] : b]; }
  if (g.extSeg) { const out = new Set(); for (const i of g.extSeg) { const a = map[i - 1], b = map[i]; if (a >= 0 && b >= 0) for (let k = a + 1; k <= b; k++) out.add(k); } g.extSeg = [...out].sort((x, y) => x - y); }
  if (g.rigid) g.rigid = g.rigid.map((i) => map[i]).filter((i) => i >= 0);
}

export const CLEARED = [];   // what the pass moved: { pn, path, around, by (in), dir }
/** raceway bundles step inboard round what sits on their lane, all members together so the lay stays parallel (wp12 steps
 *  its bundles round what was on the wall when it ran; the throttle quadrant, the stick base, the control stops and the
 *  pitch-trim lever were placed on the lanes by later blocks) */
const ease = (t) => t * t * (3 - 2 * t);
function stepBundles(OB) {
  const out = [], byRw = new Map();
  for (const p of PARTS) for (const g of p.geo || []) if (g.t === 'path' && g.raceway && g.rwSpan && CLEAR_CLASSES.has(g.cls)) { if (!byRw.has(g.raceway)) byRw.set(g.raceway, []); byRw.get(g.raceway).push({ pn: p.pn, g }); }
  for (const [rw, mem] of byRw) {
    for (let pass = 0; pass < 6; pass++) {
      // the first obstacle any member's raceway section runs into
      let hit = null;
      for (const m of mem) {
        const sec = m.g.pts.slice(m.g.rwSpan[0], m.g.rwSpan[1] + 1), r = (m.g.dIn || 0.25) * IN / 2;
        for (const q of samples(sec)) for (const o of OB) {
          if (o.pn === m.pn || !near(o, q.p, r + CLEAR) || sdf(o.g, q.p) >= r + 0.05 * IN) continue;
          if (!hit || q.p[0] < hit.s) hit = { o, s: q.p[0] };
        }
      }
      if (!hit) break;
      // its station range on every member, and the side (the wall's) from the members' mean BL; obstacles the step itself
      // runs into join the set (one plateau round them all)
      const side = Math.sign(mem.reduce((a, m) => a + m.g.pts[m.g.rwSpan[0]][1], 0)) || 1;
      const memG = new Set(mem.map((m) => m.g));
      const othersOf = (m) => RUNS.filter((o) => !memG.has(o.g)).map((o) => { const need = sepIn(m.pn, m.g, o.pn, o.g), rr = ((m.g.dIn || 0.25) + (o.g.dIn || 0.25)) / 2;
        return { ...o, need, rr, reach: (need + rr) / 12 + 1e-3, lo: [0, 1, 2].map((i) => Math.min(...o.g.pts.map((q) => q[i]))), hi: [0, 1, 2].map((i) => Math.max(...o.g.pts.map((q) => q[i]))) }; });
      const OTH = new Map(mem.map((m) => [m, othersOf(m)]));
      let ok = null, set = null;
      for (const e of [[0, -side, 0], [0, 0, -1], [0, -side * 0.7071, 0.7071], [0, -side * 0.4472, 0.8944], [0, -side * 0.8944, 0.4472], [0, -side * 0.7071, -0.7071], [0, side * 0.7071, 0.7071], [0, 0, 1]]) {
      if (ok) break;
      set = new Set([hit.o.pn]);
      for (let grow = 0; grow < 4 && !ok; grow++) {
        let sa = Infinity, sb = -Infinity, need = 0;
        for (const m of mem) {
          const sec = m.g.pts.slice(m.g.rwSpan[0], m.g.rwSpan[1] + 1), r = (m.g.dIn || 0.25) * IN / 2;
          for (const q of samples(sec)) for (const o of OB) { if (!set.has(o.pn) || o.pn === m.pn || !near(o, q.p, r + CLEAR) || sdf(o.g, q.p) >= r + CLEAR) continue;
            sa = Math.min(sa, q.p[0]); sb = Math.max(sb, q.p[0]);
            let k = 0; while (k < 120 && OB.some((x) => set.has(x.pn) && x.pn !== m.pn && sdf(x.g, add(q.p, mul(e, k * 0.05 * IN))) < r + CLEAR)) k++; need = Math.max(need, k * 0.05 * IN); }
        }
        if (!(sb >= sa)) break;
        let blocker = null;
        for (const extra of [0, 0.15, 0.35, 0.7, 1.2]) for (const rk of [3, 2, 1.4]) {
          if (ok) break;
          const D = need + extra * IN, Lr = Math.max(2.0 * IN, rk * D), p0 = sa - 0.3 * IN, p1 = sb + 0.3 * IN;
          const f = (s) => D * (s < p0 - Lr || s > p1 + Lr ? 0 : s >= p0 && s <= p1 ? 1 : s < p0 ? ease((s - (p0 - Lr)) / Lr) : ease(((p1 + Lr) - s) / Lr));
          const keys = [p0 - Lr, p0 - Lr / 2, p0, p1, p1 + Lr / 2, p1 + Lr];
          const trial = mem.map((m) => {
            const g = m.g, [i0, i1] = g.rwSpan, sec = g.pts.slice(i0, i1 + 1), lo = Math.min(sec[0][0], sec.at(-1)[0]), hi = Math.max(sec[0][0], sec.at(-1)[0]);
            // points either side of a panel or bulkhead crossing inside the section stay exactly where they are (the hole stays put)
            const rr = (g.dIn || 0.25) * IN / 2, lock = new Set();
            for (let j = 0; j + 1 < sec.length; j++) if (samples([sec[j], sec[j + 1]]).some((q) => LAMS.some((o) => near(o, q.p, rr) && sdf(o.g, q.p) < rr))) for (let k = j - 2; k <= j + 3; k++) if (k >= 0 && k < sec.length) lock.add(k);   // and their neighbours: the drawn fillets keep their legs
            const kin = keys.filter((k) => k > lo + 0.3 * IN && k < hi - 0.3 * IN && [...lock].every((j) => Math.abs(sec[j][0] - k) > 0.6 * IN)), keep = sec.map((q, j) => j === 0 || j === sec.length - 1 || lock.has(j) || kin.every((k) => Math.abs(q[0] - k) > 0.6 * IN));
            const fwd = sec.at(-1)[0] >= sec[0][0], ss = [...new Set([...sec.filter((_, j) => keep[j]).map((q) => q[0]), ...kin])].sort((x, y) => (fwd ? x - y : y - x));
            const atS = (s) => { for (let j = 1; j < sec.length; j++) { const a = sec[j - 1], b = sec[j]; if ((s - a[0]) * (s - b[0]) <= 0 && a[0] !== b[0]) { const t = (s - a[0]) / (b[0] - a[0]); return add(a, mul(sub(b, a), t)); } } return sec.reduce((x, q) => (Math.abs(q[0] - s) < Math.abs(x[0] - s) ? q : x)); };
            const nsec = ss.map((s) => add(atS(s), mul(e, f(s))));
            const np = [...g.pts.slice(0, i0), ...nsec, ...g.pts.slice(i1 + 1)];
            const map = g.pts.map((q, i) => (i < i0 ? i : i > i1 ? i - (i1 + 1) + i0 + nsec.length : keep[i - i0] ? i0 + ss.indexOf(q[0]) : -1));
            const moved = [...lock].some((j) => f(sec[j][0]) > 1e-9);
            return { m, np, map, span: [i0, i0 + nsec.length - 1], moved };
          });
          blocker = null;
          if (trial.some((t) => t.moved)) { DBG.push(['hole-in', rw]); continue; }
          // a section end whose joining run passes through a panel or bulkhead hole stays put (the run keeps its hole)
          const fixed = mem.flatMap((m) => { const [i0, i1] = m.g.rwSpan, P = m.g.pts, r = (m.g.dIn || 0.25) * IN / 2, out = [];
            const thru = (a, b) => a && b && samples([a, b]).some((q) => LAMS.some((o) => near(o, q.p, r + 0.25 * IN) && sdf(o.g, q.p) < r + 0.25 * IN));
            if (thru(P[i0 - 1], P[i0])) out.push(P[i0][0]); if (thru(P[i1], P[i1 + 1])) out.push(P[i1][0]); return out; });
          if (fixed.some((s) => s > p0 - Lr - 0.05 * IN && s < p1 + Lr + 0.05 * IN)) { DBG.push(['hole-end', rw]); continue; }
          const inStep = (q) => q.p[0] > p0 - Lr - 0.05 * IN && q.p[0] < p1 + Lr + 0.05 * IN;   // only where the bundle moved (what it ran into elsewhere is the next step's)
          const good = trial.every((t) => { const r = (t.m.g.dIn || 0.25) * IN / 2; return samples(t.np.slice(t.span[0], t.span[1] + 1)).filter(inStep).every((q) => { if (!zoneOf(q.p)) { DBG.push(['zone', rw, t.m.pn, q.p.map((v) => +(v * 12).toFixed(1))]); return false; }
            const bad = OB.find((o) => o.pn !== t.m.pn && near(o, q.p, r + CLEAR) && sdf(o.g, q.p) < r + CLEAR - 1e-4); if (bad) { blocker = blocker || bad.pn; DBG.push(['obst', rw, t.m.pn, bad.pn, q.p.map((v) => +(v * 12).toFixed(1))]); return false; } return true; }); });
          // and no closer to the other runs than their separation rules (or than they already were)
          const sepOk = good && trial.every((t) => { const oth = OTH.get(t.m), [a, b] = t.span;
            const bad = sepWorse(samples(t.m.g.pts.slice(t.m.g.rwSpan[0], t.m.g.rwSpan[1] + 1)).filter(inStep).map((q) => q.p), samples(t.np.slice(a, b + 1)).filter(inStep).map((q) => q.p), oth, 0.1);   // 0.1 in allowance where a pair was already inside its rule
            if (bad >= 0) { DBG.push(['sep', rw, t.m.pn, oth[bad].pn]); return false; } return true; });
          // bends: no corner in the stepped section tighter than its rule (or than the section already had)
          const bendOk = good && sepOk && trial.every((t) => { const rule = t.m.g.bendRule || 0; if (!rule) return true; const [a, b] = t.span, [i0, i1] = t.m.g.rwSpan;
            const now = tightestR(t.np, a, b), was = tightestR(t.m.g.pts, i0, i1); if (now < Math.min(0.8 * rule, was, 0.4 * rule) - 1e-6) { DBG.push(['bend', rw, t.m.pn, +(now * 12).toFixed(2), +(rule * 12).toFixed(2)]); return false; } return true; });
          if (bendOk) { ok = { trial, D, e }; break; }
        }
        if (!ok && blocker && !set.has(blocker)) set.add(blocker); else if (!ok) break;
      }
      }
      if (!ok) { out.push({ raceway: rw, around: hit.o.pn, by: null, note: 'no clear step' }); break; }
      for (const t of ok.trial) { const n0 = t.m.g.pts.length; t.m.g.pts = t.np; remap(t.m.g, t.map, n0, t.np.length); t.m.g.rwSpan = t.span; }
      out.push({ raceway: rw, around: [...set].join(' + '), by: +(ok.D * 12).toFixed(2), dir: ok.e.join(','), members: mem.length });
    }
  }
  return out;
}
export const STEPPED = [], DBG = [];
/** after the bundles have stepped: the canopy-switch lead (LEZ-24-161 path 3) left the switch S13 inboard through the
 *  throttle quadrant to join the left signal bundle; it now drops outboard of the quadrant to WL 36.92 (under the front
 *  headset jacks), crosses inboard behind the quadrant at FS 52.45 and joins the bundle there (corners ≥ 0.85 in radius) */
const AFTER_STEP = [() => {
  const p = PARTS.find((q) => q.pn === 'LEZ-24-161'), g = p && (p.geo || []).filter((q) => q.t === 'path' && CLEAR_CLASSES.has(q.cls))[3];
  if (!g || !g.rwSpan || g.rwSpan[0] < 3 || Math.abs(g.pts[2][0] * 12 - 49.9) > 0.3) { console.warn('[wpR1] S13 lead: route moved, not re-laid'); return; }
  const i0 = g.rwSpan[0], lane = g.pts[i0], put = [[49.98 / 12, -10.50 / 12, 37.40 / 12], [50.70 / 12, -10.50 / 12, 36.92 / 12], [52.45 / 12, -10.50 / 12, 36.92 / 12], [52.45 / 12, lane[1], lane[2]]];   // drop in two 45° corners (R ≥ 0.85 in), ≥ 0.25 in under the jacks' lower forward corner
  const n0 = g.pts.length, cut = i0 - 3;   // head points between the drop and the lane
  g.pts = [...g.pts.slice(0, 3), ...put, ...g.pts.slice(i0)];
  const map = Array.from({ length: n0 }, (_, i) => (i < 3 ? i : i < i0 ? -1 : i - cut + put.length));
  const end = map[g.rwSpan[1]]; remap(g, map, n0, g.pts.length); g.rwSpan = [3 + put.length, end];
  CLEARED.push({ pn: 'LEZ-24-161', path: 3, around: 'LEZ-76-100', by: null, dir: 'laid by hand (behind the quadrant)' });
}];
let RUNS = [];
export function clearRoutes() {
  const OB = obstacles(), fw = GEO.firewall; LAMS = laminates();
  RUNS = []; for (const p of PARTS) for (const g of p.geo || []) if (g.t === 'path' && g.cls) RUNS.push({ pn: p.pn, g });
  STEPPED.push(...stepBundles(OB.filter((o) => o.lo[0] < fw)));
  for (const f of AFTER_STEP) f();
  for (const p of PARTS) {
    const paths = (p.geo || []).filter((g) => g.t === 'path' && CLEAR_CLASSES.has(g.cls));
    paths.forEach((g, gi) => {
      const ends = [g.pts[0], g.pts.at(-1)];   // the boxes it terminates in are not obstacles to it
      const OBp = OB.filter((o) => o.pn !== p.pn && !(OWN[p.pn] || []).includes(o.pn) && !ends.some((e) => near(o, e, 1.0 * IN) && sdf(o.g, e) < 1.0 * IN));
      Object.defineProperty(g, '__pn', { value: `${p.pn}#${gi}`, configurable: true });
      const others = RUNS.filter((o) => o.g !== g).map((o) => { const need = sepIn(p.pn, g, o.pn, o.g), rr = ((g.dIn || 0.25) + (o.g.dIn || 0.25)) / 2;
        return { ...o, need, rr, reach: (need + rr) / 12 + 1e-3, lo: [0, 1, 2].map((i) => Math.min(...o.g.pts.map((q) => q[i]))), hi: [0, 1, 2].map((i) => Math.max(...o.g.pts.map((q) => q[i]))) }; });
      for (let pass = 0; pass < 8; pass++) {
        const cs = clashes(g, OBp).filter((c) => at(g.pts, arcs(g.pts), (c.a + c.b) / 2)[0] < fw - 0.05);   // the cabin (engine-bay runs keep block H's routing and its engine-motion checks)
        if (!cs.length) break;
        let done = false;
        for (const c of cs) {
          const d = detour(g, c, OBp, others);
          if (!d) continue;
          const n0 = g.pts.length; g.pts = d.np; remap(g, d.map, n0, d.np.length);
          CLEARED.push({ pn: p.pn, path: gi, around: c.o.pn, by: +(d.D * 12).toFixed(2), dir: d.e.join(',') });
          done = true; break;
        }
        if (!done) break;
      }
    });
  }
  return CLEARED;
}
/** remaining interferences of cabin wiring and pitot-static runs with drawn equipment (for checks and tests) */
export function routeClashes() {
  const OB = obstacles(), out = [];
  for (const p of PARTS) (p.geo || []).filter((g) => g.t === 'path' && CLEAR_CLASSES.has(g.cls)).forEach((g, gi) => {
    for (const c of clashes(g, OB.filter((o) => o.pn !== p.pn && !(OWN[p.pn] || []).includes(o.pn)))) out.push({ pn: p.pn, path: gi, obstacle: c.o.pn, depthIn: +(c.depth * 12).toFixed(2), fs: +(at(g.pts, arcs(g.pts), (c.a + c.b) / 2)[0] * 12).toFixed(1) });
  });
  return out;
}
/** two stretches the automatic detour cannot take (they leave a terminal straight into the obstacle), laid by hand:
 *  · the canopy-switch lead (LEZ-24-161 path 3) went from the switch S13 inboard through the throttle quadrant: it now drops
 *    outboard of the quadrant body and under its pivot boss, runs forward at WL 37.5 and rejoins the left signal lane at FS 45.3;
 *  · the right static line (LEZ-34-130 path 4) left its port at FS 58 through the pitch-trim friction guide and lever: it now
 *    turns inboard to BL 10.45 within 0.4 in of the port and runs forward inboard of them. */
// (the canopy-switch lead: down outboard of the quadrant, under its pivot boss at BL −10.65 / WL 37.5, corners ≥ 0.85 in radius)
const MANUAL = [
  { pn: 'LEZ-34-130', path: 4, at: 1, was: [49.0, 9.60, 38.70], insert: true, put: [[57.60, 10.45, 38.62]] },
];
export const BEFORE = routeClashes();
const BL = (q) => [q[1] / 12, q[0] / 12, q[2] / 12];   // (FS, BL, WL) in → model ft
for (const m of MANUAL) {
  const p = PARTS.find((q) => q.pn === m.pn), g = p && (p.geo || []).filter((q) => q.t === 'path' && CLEAR_CLASSES.has(q.cls))[m.path];
  const w = [m.was[0] / 12, m.was[1] / 12, m.was[2] / 12];
  if (!g || !g.pts[m.at] || len(sub(g.pts[m.at], w)) > 0.25 * IN) { console.warn('[wpR1] manual reroute skipped (route moved):', m.pn, m.path); continue; }
  const add_ = m.put.map((q) => [q[0] / 12, q[1] / 12, q[2] / 12]), n0 = g.pts.length, k = m.insert ? 0 : 1;
  g.pts = [...g.pts.slice(0, m.at), ...add_, ...g.pts.slice(m.at + k)];
  const shift = add_.length - k, map = Array.from({ length: n0 }, (_, i) => (i < m.at ? i : i === m.at && !m.insert ? m.at : i + shift));
  remap(g, map, n0, g.pts.length);
  CLEARED.push({ pn: m.pn, path: m.path, around: m.pn === 'LEZ-24-161' ? 'LEZ-76-100' : 'LEZ-27-165', by: null, dir: 'laid by hand' });
}
void BL;
/** single points moved by hand (FS, BL, WL in; checked against where they were, so a later re-layout is not overwritten):
 *  (the forward harness LEZ-24-162 over the battery's aft top corner is NOT moved here: clearing it moves its F22
 *   pass-through hole up into the canard hard-point doubler; left open, see DC-012)
 *  (starter cable LEZ-80-110 passes 0.11 in under the bus module's floor flange, inside the 0.2 in rule: lowering it moves
 *   its F28 pass-through (the drawn bend fillet reaches into the bulkhead); left open, see DC-012)
 *  · GEA 24 engine harness LEZ-77-100: a point under the rudder-pedal cross tube (it ran through the tube's lower side). */
const NUDGE = [
  { pn: 'LEZ-77-100', path: 0, insert: [1, [34.80, -5.04, 36.50], [37.44, -7.40, 36.35]] },
];
for (const n of NUDGE) {
  const p = PARTS.find((q) => q.pn === n.pn), g = p && (p.geo || []).filter((q) => q.t === 'path' && CLEAR_CLASSES.has(q.cls))[n.path];
  if (!g) continue;
  const near_ = (i, q) => g.pts[i] && len(sub(g.pts[i], [q[0] / 12, q[1] / 12, q[2] / 12])) < 0.05 * IN;
  if (n.split) { const [i, fs] = n.split, a = g.pts[i - 1], b = g.pts[i], s = fs / 12;
    if (!a || !b || (a[0] - s) * (b[0] - s) >= 0) { console.warn('[wpR1] nudge skipped (route moved):', n.pn); continue; }
    const t = (s - a[0]) / (b[0] - a[0]), n0 = g.pts.length; g.pts = [...g.pts.slice(0, i), add(a, mul(sub(b, a), t)), ...g.pts.slice(i)];
    remap(g, Array.from({ length: n0 }, (_, k) => (k < i ? k : k + 1)), n0, g.pts.length); }
  if (n.moves) { if (!n.moves.every(([i, was]) => near_(i, was))) { console.warn('[wpR1] nudge skipped (route moved):', n.pn); continue; }
    for (const [i, , now] of n.moves) g.pts[i] = [now[0] / 12, now[1] / 12, now[2] / 12]; }
  if (n.shiftVec) { const { from, was, v, w } = n.shiftVec; if (!near_(from, was)) { console.warn('[wpR1] nudge skipped (route moved):', n.pn); continue; }
    w.forEach((k, j) => { const q = g.pts[from + j]; g.pts[from + j] = [q[0] + k * v[0] / 12, q[1] + k * v[1] / 12, q[2] + k * v[2] / 12]; }); }
  if (n.shiftBL) { const { from, was, dy } = n.shiftBL; if (!near_(from, was)) { console.warn('[wpR1] nudge skipped (route moved):', n.pn); continue; }
    dy.forEach((d, k) => { const q = g.pts[from + k]; g.pts[from + k] = [q[0], q[1] + d / 12, q[2]]; }); }
  if (n.insert) { const [i, prev, q] = n.insert; if (!near_(i - 1, prev)) { console.warn('[wpR1] nudge skipped (route moved):', n.pn); continue; }
    const n0 = g.pts.length; g.pts = [...g.pts.slice(0, i), [q[0] / 12, q[1] / 12, q[2] / 12], ...g.pts.slice(i)];
    remap(g, Array.from({ length: n0 }, (_, k) => (k < i ? k : k + 1)), n0, g.pts.length); }
  CLEARED.push({ pn: n.pn, path: n.path, around: { 'LEZ-24-162': 'LEZ-24-110', 'LEZ-80-110': 'LEZ-24-130', 'LEZ-77-100': 'LEZ-27-150', 'LEZ-77-110': 'LEZ-80-100' }[n.pn], by: null, dir: 'nudged by hand' });
}
clearRoutes();
// after the detours: the main power feed's climb over the GEA 24 (LEZ-24-161 path 0) came out level with the avionics
// shelf's aft edge (FS 36.6), 0.14 in from it; its run across behind the shelf moves 0.2 in aft (the shelf's 0.25 in rule)
{ const p = PARTS.find((q) => q.pn === 'LEZ-24-161'), g = p && (p.geo || []).filter((q) => q.t === 'path' && CLEAR_CLASSES.has(q.cls))[0];
  const hit = g ? g.pts.map((q, i) => [q, i]).filter(([q]) => Math.abs(q[0] * 12 - 36.9) < 0.02 && q[2] * 12 > 40 && q[1] * 12 < 6 && q[1] * 12 > -7) : [];
  if (hit.length === 5) { for (const [q, i] of hit) g.pts[i] = [q[0] + 0.2 * IN, q[1], q[2]]; CLEARED.push({ pn: 'LEZ-24-161', path: 0, around: 'LEZ-31-160', by: 0.2, dir: '1,0,0' }); }
  else console.warn('[wpR1] shelf nudge skipped (route moved)', hit.length); }
export const AFTER = routeClashes();
