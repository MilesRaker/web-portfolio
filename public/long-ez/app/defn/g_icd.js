// Block G interface checks added by the ICD (docs/icd/g_powerplant.md, phase 2). Notional.
//  • gSolidClashes(): every block G definition solid (the records' primitives), the released mount tubes, upper pick-ups
//    and lower brackets, checked against each other for interpenetration. Declared mates (a lug in its cup, a flange on
//    the engine, a hose on its port) are listed with the reason; the item still open (ICD G-O2, engine envelope rev B,
//    block H) is listed; G-O1 (induction) is closed by the scoop rev B
//    by name and reported, so any other clash fails the audit.
//  • flangeBand(): the cowl's firewall flange band (LEZ-71-120, 0.6 in inside the OML at FS 153) against the fittings on
//    the firewall's aft face (LEZ-71-222 bases, LEZ-71-223 legs A): every point inside the band lies in a declared notch.
// Frame: definition frame, inches [BL, FS, WL].
import { GEO } from '../structures.js';
import { insideFus } from '../systems.js';
import { MOUNT } from '../parts/wp1_powerplant.js';
import { UPK } from '../parts/wp23_upk.js';
import { bracketBoxes } from '../parts/wpG1_engine.js';

const sub = (a, b) => a.map((v, i) => v - b[i]), dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], len = (a) => Math.hypot(...a);
const ft = (q) => [q[1] * 12, q[0] * 12, q[2] * 12];   // model [s, y, z] ft → [BL, FS, WL] in
const radius = (g) => g.r ?? Math.max(g.r1 || 0, g.r2 || 0);
/** how deep a point lies inside a primitive (in, > 0 inside) */
function depth(g, p) {
  if (g.t === 'box') return Math.min(...[0, 1, 2].map((i) => g.d[i] / 2 - Math.abs(p[i] - g.c[i])));
  const ab = sub(g.b, g.a), L = len(ab), e = ab.map((v) => v / L), w = sub(p, g.a), ax = dot(w, e), rad = len(sub(w, e.map((v) => v * ax)));
  return Math.min(radius(g) - rad, ax, L - ax);
}
/** surface sample points of a primitive */
function samples(g) {
  const o = [];
  if (g.t === 'box') { for (const i of [-1, -0.5, 0, 0.5, 1]) for (const j of [-1, -0.5, 0, 0.5, 1]) for (const k of [-1, -0.5, 0, 0.5, 1]) o.push([g.c[0] + i * g.d[0] / 2, g.c[1] + j * g.d[1] / 2, g.c[2] + k * g.d[2] / 2]); return o; }
  const ab = sub(g.b, g.a), L = len(ab), e = ab.map((v) => v / L), u = Math.abs(e[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0], t0 = sub(u, e.map((v) => v * dot(u, e))), n1 = t0.map((v) => v / len(t0));
  const n2 = [e[1] * n1[2] - e[2] * n1[1], e[2] * n1[0] - e[0] * n1[2], e[0] * n1[1] - e[1] * n1[0]], r = radius(g);
  for (const t of [0, 0.25, 0.5, 0.75, 1]) for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6; o.push(g.a.map((v, i) => v + ab[i] * t + r * (n1[i] * Math.cos(a) + n2[i] * Math.sin(a)))); }
  return o;
}
const bbox = (g) => (g.t === 'box' ? [g.c.map((v, i) => v - g.d[i] / 2), g.c.map((v, i) => v + g.d[i] / 2)]
  : [[0, 1, 2].map((i) => Math.min(g.a[i], g.b[i]) - radius(g)), [0, 1, 2].map((i) => Math.max(g.a[i], g.b[i]) + radius(g))]);

/** the released mount, pick-ups and brackets as primitives */
function releasedPrims() {
  const N = MOUNT.nodes, o = [];
  for (const [a, b, od] of MOUNT.members) o.push({ pn: 'LEZ-71-220', feat: `${a}-${b}`, p: { t: 'cyl', a: ft(N[a]), b: ft(N[b]), r: od / 2 } });
  for (const n of ['FTL', 'FTR']) { const q = ft(N[n]), FW = GEO.firewall * 12;
    o.push({ pn: 'LEZ-71-222', feat: 'base', p: { t: 'box', c: [q[0], FW + UPK.tb / 2, q[2]], d: [UPK.B, UPK.tb, UPK.B] } });
    for (const sd of [-1, 1]) o.push({ pn: 'LEZ-71-222', feat: 'ears', p: { t: 'box', c: [q[0] + sd * (UPK.gap / 2 + UPK.te / 2), FW + UPK.tb + (UPK.h + UPK.e) / 2, q[2]], d: [UPK.te, UPK.h + UPK.e, UPK.w] } }); }
  for (const b of bracketBoxes()) o.push({ pn: 'LEZ-71-223', feat: b.feat, p: { t: 'box', c: b.lo.map((v, i) => (v + b.hi[i]) / 2), d: b.hi.map((v, i) => v - b.lo[i]) } });
  return o;
}
/** designed contacts: [pn.feat pattern, pn.feat pattern, reason] */
export const MATES = [
  [/^LEZ-71-210\.(lugs|case|acc)/, /^LEZ-71-22[14]\./, 'lug bosses in the isolators and cups'],
  [/^LEZ-71-221\./, /^LEZ-71-224\./, 'isolator stack in its cup'],
  [/^LEZ-71-224\./, /^LEZ-71-22[023]\./, 'cups and bushings welded on the mount, bushings on the pick-up bolts'],
  [/^LEZ-71-220\./, /^LEZ-71-22[23]\./, 'mount nodes on the pick-up bolts'],
  [/^LEZ-71-210\.lugs/, /^LEZ-71-220\./, 'tube ends on the cups round the lug bosses'],
  [/^LEZ-71-220\./, /^LEZ-71-220\./, 'tubes meet at the nodes'],
  [/^LEZ-71-210\.(flange|nose)/, /^LEZ-61-110\./, 'extension on the crank flange'],
  [/^LEZ-61-1[012]0\./, /^LEZ-61-1[012]0\./, 'prop, extension and spinner in the bolt stack'],
  [/^LEZ-71-210\.cyl/, /^LEZ-78-100\./, 'stacks on the exhaust ports (port in the head envelope)'],
  [/^LEZ-78-100\./, /^LEZ-78-110\.muff/, 'muff round its stack'],
  [/^LEZ-71-210\./, /^LEZ-79-115\./, 'hoses on the crankcase ports'],
  [/^LEZ-79-11[05]\./, /^LEZ-79-11[05]\./, 'hoses on the cooler ports'],
  [/^LEZ-71-230\./, /^LEZ-79-1(10|15)\./, 'cooler and its hose ends on the lower rear wall'],
  [/^LEZ-71-210\.case/, /^LEZ-79-110\.bracket/, 'cooler strap to the crankcase'],
  [/^LEZ-71-251\./, /^LEZ-71-252\./, 'filter in the air box'],
  [/^LEZ-71-251\.spigot/, /^LEZ-78-110\.scat/, 'SCAT over its spigot'],
];
/** still open (ICD G-O2, block H's engine record rev B). Reported in the check's detail, not counted */
export const OPEN = [
  [/^LEZ-71-210\.(acc|mag)/, /^LEZ-71-220\./, 'G-O2: the approximate accessory-housing and magneto envelopes cross the ring\'s top and bottom tubes and the top and bottom face diagonals: LEZ-71-210 rev B (block H) to clear every tube by ≥ 0.5 in (housing ≤ 8.64 in tall, WL 31.44–40.08)'],
];
const match = (L, a, b) => L.find(([x, y]) => (x.test(a) && y.test(b)) || (x.test(b) && y.test(a)));
/** interpenetrations deeper than tol (in) among the given primitive sets */
export function gSolidClashes(defPrims, tol = 0.02) {
  const all = [...defPrims.filter((q) => q.p.t === 'box' || q.p.t === 'cyl' || q.p.t === 'cone'), ...releasedPrims()].map((q) => ({ ...q, key: `${q.pn}.${q.feat}`, bb: bbox(q.p) }));
  const hits = new Map();
  for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) {
    const A = all[i], B = all[j]; if (A.pn === B.pn && A.pn !== 'LEZ-71-220') continue;
    if (match(MATES, A.key, B.key)) continue;
    if (![0, 1, 2].every((k) => A.bb[0][k] < B.bb[1][k] - tol && B.bb[0][k] < A.bb[1][k] - tol)) continue;
    let d = -Infinity; for (const q of samples(A.p)) d = Math.max(d, depth(B.p, q)); for (const q of samples(B.p)) d = Math.max(d, depth(A.p, q));
    if (d <= tol) continue;
    const k = [A.key, B.key].sort().join(' × '); if (!hits.has(k) || hits.get(k).d < d) hits.set(k, { d, a: A.key, b: B.key, open: match(OPEN, A.key, B.key)?.[2] });
  }
  const list = [...hits.values()].sort((a, b) => b.d - a.d);
  return { fail: list.filter((h) => !h.open), open: list.filter((h) => h.open), n: all.length };
}

// ------------------------------------------------------------------------------------------- firewall flange band
export const BAND = 0.6;   // in inside the OML at FS 153 (LEZ-71-120 drawing note; DESIGN)
/** flange notches (BL, WL rectangles, in): the flange's firewall leg is cut away round the lower brackets' outboard-bottom corners */
export const NOTCHES = [-1, 1].map((sg) => ({ id: sg < 0 ? 'N-L' : 'N-R', what: `round the ${sg < 0 ? 'left' : 'right'} lower bracket's (LEZ-71-223) leg A outboard-bottom corner`, bl: [sg < 0 ? -8.6 : 7.4, sg < 0 ? -7.4 : 8.6], wl: [27.4, 28.4] }));
export const NOTCH_MAX = 3.0;   // in, the longest run of hinge leaf without the flange behind it (DESIGN)
const insetAt = (y, z) => { const FW = GEO.firewall; let lo = -0.5, hi = 3; for (let k = 0; k < 36; k++) { const m = (lo + hi) / 2; if (insideFus(FW, y / 12, z / 12, m / 12)) lo = m; else hi = m; } return lo; };
/** firewall-face fitting points inside the band and outside every notch */
export function flangeBand() {
  const rects = [];
  for (const n of ['FTL', 'FTR']) { const q = ft(MOUNT.nodes[n]); rects.push({ what: `LEZ-71-222 base ${n}`, bl: [q[0] - UPK.B / 2, q[0] + UPK.B / 2], wl: [q[2] - UPK.B / 2, q[2] + UPK.B / 2] }); }
  for (const b of bracketBoxes().filter((x) => x.feat === 'legA')) rects.push({ what: `LEZ-71-223 leg A ${b.lo[0] < 0 ? 'L' : 'R'}`, bl: [b.lo[0], b.hi[0]], wl: [b.lo[2], b.hi[2]] });
  const bad = [], inNotch = [];
  for (const r of rects) for (let i = 0; i <= 40; i++) for (let j = 0; j <= 40; j++) {
    if (i && j && i < 40 && j < 40) continue;   // the outline is enough: the band is at the edge
    const y = r.bl[0] + (r.bl[1] - r.bl[0]) * i / 40, z = r.wl[0] + (r.wl[1] - r.wl[0]) * j / 40, d = insetAt(y, z);
    if (d >= BAND) continue;
    const nt = NOTCHES.find((n) => y >= n.bl[0] && y <= n.bl[1] && z >= n.wl[0] && z <= n.wl[1]);
    (nt ? inNotch : bad).push({ what: r.what, y, z, d, nt: nt?.id });
  }
  const span = Math.max(...NOTCHES.map((n) => Math.hypot(n.bl[1] - n.bl[0], n.wl[1] - n.wl[0])));
  return { bad, inNotch, span, rects };
}

// ------------------------------------------------------------------------------------------- scoop rev B: blister region (ICD G-O1)
/** clearance (in) between two primitive sets: surface samples of each against the other (boxes, cylinders exact; lofts by
 *  their section vertices), negative = interpenetration depth */
const vertsOf = (g) => (g.t === 'loft' ? g.secs.flat() : null);
function clearOne(A, B) {
  if (A.t === 'loft' && B.t === 'loft') return Math.min(...A.secs.flat().flatMap((p) => B.secs.flat().map((q) => len(sub(p, q)))));
  if (A.t === 'loft') return Math.min(...vertsOf(A).map((p) => -depth(B, p)));
  if (B.t === 'loft') return Math.min(...vertsOf(B).map((p) => -depth(A, p)));
  return Math.min(...samples(A).map((p) => -depth(B, p)), ...samples(B).map((p) => -depth(A, p)));
}
/** signed distance from a point to a box or cylinder (in): negative inside */
const sdist = (g, p) => { const d = depth(g, p); if (d > 0) return -d;
  if (g.t === 'box') return len([0, 1, 2].map((i) => Math.max(Math.abs(p[i] - g.c[i]) - g.d[i] / 2, 0)));
  const ab = sub(g.b, g.a), L = len(ab), e = ab.map((v) => v / L), w = sub(p, g.a), ax = dot(w, e), rad = len(sub(w, e.map((v) => v * ax)));
  return Math.hypot(Math.max(-ax, ax - L, 0), Math.max(rad - radius(g), 0)); };
// a lower bound on a pair's clearance: the gap between their bounds (every sample, vertex and surface point of a
// primitive lies within its bounds), less a rounding allowance; -Infinity when the bounds touch (perf)
const boundsOf = (g) => (g.t === 'loft' ? (() => { const P = g.secs.flat(); return [[0, 1, 2].map((i) => Math.min(...P.map((q) => q[i]))), [0, 1, 2].map((i) => Math.max(...P.map((q) => q[i])))]; })() : bbox(g));
const gapOf = (A, B) => { let m = -Infinity; for (let i = 0; i < 3; i++) { const g = Math.max(A[0][i] - B[1][i], B[0][i] - A[1][i]); if (!(g <= 0 || g > 0)) return -Infinity; if (g > m) m = g; }
  return m > 0 ? m - 1e-7 : -Infinity; };   // the largest axis gap: never above any of the distances clearance() takes
export function clearance(As, Bs) {
  let w = { d: Infinity };
  const BA = As.map(boundsOf), BB = Bs.map(boundsOf);
  for (const [ia, a] of As.entries()) for (const [ib, b] of Bs.entries()) {
    if (gapOf(BA[ia], BB[ib]) >= w.d) continue;   // cannot be nearer than the nearest so far (same result)
    let d;
    if (a.t === 'loft' || b.t === 'loft') { const L = a.t === 'loft' ? a : b, O = a.t === 'loft' ? b : a; d = O.t === 'loft' ? clearOne(L, O) : Math.min(...L.secs.flat().map((p) => sdist(O, p))); }
    else d = Math.min(...samples(a).map((p) => sdist(b, p)), ...samples(b).map((p) => sdist(a, p)));
    if (d < w.d) w = { d, a: a.feat, b: b.feat };
  }
  return w;
}
