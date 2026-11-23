// WP12 — wire and hose routing: raceways, bundling, bend radii and supports.
// Practice follows FAA AC 43.13-1B ch. 11 (wire) and ch. 9 (fluid lines) as design rules for this notional airframe:
//  • Cabin wiring runs in four sidewall raceways instead of loose individual runs: on the left a power bundle with a signal
//    bundle 1.3 in above it; on the right an RF (coax) bundle with a signal bundle above it. Power and RF are on opposite
//    sides (2 in rule). All four sit just above the tank-sump outlets (so no wire is below a fuel line) and just below the
//    armrests, and step inboard round anything on the wall (static ports, stick base, sump wells).
//  • Routes sharing a raceway are packed into one bundle (two-row lay) and supported by a single cushion clamp per station.
//  • Every flexible run is drawn and checked with its minimum bend radius; every run is supported at no more than the
//    AC 43.13 spacing for its kind (wire 24 in → 18 in design; aluminium tube 9/12/16 in by size; hose 18 in).
//  • Wires stay above fuel, oil and brake lines where they run within 6 in of them (drips run down, not onto wires).
import { GEO, registerChecks, mk } from '../structures.js';
import { LOAD, PARTS, defineParts, defineReqs, insideFus, routes, partByPN, filletPts, bendRule, pathLength, V3 } from '../systems.js';
import { RUN_PLAN } from './wp3_electrical.js';
import { R_TIP_HEAD } from './wpI0_layout.js';

const { add, sub, mul, len } = V3;
const WALL = 0.045, IN = 1 / 12;
const hwFus = (s, z) => { let w = 0; while (w < 2 && insideFus(s, w + 0.004, z, 0)) w += 0.004; return w; };

// ------------------------------------------------------------------------------------------- raceways
// centreline hugs the sidewall: wall face − clamp standoff (1/2 in) − bundle half-depth; side −1 left, +1 right
export const RACEWAYS = {
  LP: { side: -1, z: 2.950 /* integration 2026-11-19: 0.12 in lower (was 2.960) so the starter and ground cables keep 1.1 in from the left signal lanes (elec-emc) */, s: [3.55, 8.225], rows: 2, cls: 'power', why: 'left power: starter, ground, power harness, wingtip lights, landing brake' },
  LS: { side: -1, z: 3.115, s: [3.55, 10.175], cls: 'signal', why: 'left signal: key switch and P-leads, engine monitor, magnetometer CAN, left console' },
  RF: { side: 1, z: 2.98, s: [3.55, 10.175], cls: 'rf', why: 'right RF: COM and transponder coax' },
  RS: { side: 1, z: 3.09, s: [3.55, 10.175], cls: 'signal', why: 'right signal: ELT remote, right console (PTT)' },
};
const STANDOFF = 0.5 * IN;
// obstacles on the wall: every drawn part primitive near the raceway band; the bundle steps inboard to clear them by 1/4 in
const OBST = [];
// block I: the canopy strut's wp4 position (fixed end FS 84 on the wall) is stale; block B's record puts it at FS 92 above
// the raceway (I-R4), so it is no obstacle here. Fuel parts (sump wells, gauges) keep power bundles 2 in away (SEP fuel|power);
// (the selector remote drive LEZ-28-135 is a mechanism, not a fuel part); audio jack boxes (block J's LEZ-23-12x, with their shielded branches) keep power bundles 1 in away (block I EMC rule)
// and signal bundles 0.5 in (J's jack solids are larger than the system boxes).
const STALE = new Set(['LEZ-56-120']);
for (const p of PARTS) { if (p.hide3D || p.meshes || p.ngBody || STALE.has(p.pn)) continue; for (const g of p.geo || []) { let lo, hi;
  if (g.t === 'box' || g.t === 'obox') { lo = g.c.map((v, i) => v - g.d[i] / 2); hi = g.c.map((v, i) => v + g.d[i] / 2); }
  else if (g.t === 'cyl') { lo = g.a.map((v, i) => Math.min(v, g.b[i]) - g.r); hi = g.a.map((v, i) => Math.max(v, g.b[i]) + g.r); }
  else if (g.t === 'sphere') { lo = g.c.map((v) => v - g.r); hi = g.c.map((v) => v + g.r); } else continue;
  if (hi[0] > 3.4 && lo[0] < 10.275 && hi[2] > 2.70 && lo[2] < 3.25 && Math.max(Math.abs(lo[1]), Math.abs(hi[1])) > 0.6) OBST.push({ lo, hi, pn: p.pn, fuel: /^LEZ-28-/.test(p.pn) && p.kind !== 'mechanism', sig: /^LEZ-23-12/.test(p.pn) }); } }
// block I: block H's engine-control cables (LEZ-76-110, defined after this module) leave the throttle quadrant and drop down
// the left wall through the power raceway's band at FS 79–86 (H's merged route, typed here; LEZ-80-110 / -24-160 check
// the live runs): the bundle passes inboard of them
OBST.push({ lo: [56.45 / 12, -9.75 / 12, 33.6 / 12], hi: [61.45 / 12, -8.85 / 12, 36.7 / 12], pn: 'LEZ-76-110 (H cables)', fuel: false, sig: false });
const BUNDLE_R = 0.045, CLR = 0.25 / 12;
for (const r of Object.values(RACEWAYS)) {
  const wall = (s) => r.side * (hwFus(s, r.z) - WALL - STANDOFF - BUNDLE_R), cache = new Map();
  // block I: the bundle's own extent (lanes, set before the first call) rather than a nominal radius; the centreline y is the outboard lane
  const clearAt = (s, y) => OBST.every((o) => { const c = o.fuel && r.cls === 'power' ? 2.1 / 12 : o.fuel ? 1.2 / 12 /* fuel|signal, fuel|rf 1 in (final integration: F's sight gauges) */ : o.sig && r.cls === 'power' ? 1.3 / 12 : o.sig ? 0.5 / 12 : CLR, ez = r.extZ ?? BUNDLE_R, eo = r.extO ?? BUNDLE_R, ei = r.extI ?? BUNDLE_R, ylo = r.side > 0 ? y - ei : y - eo, yhi = r.side > 0 ? y + eo : y + ei;
    return s + BUNDLE_R + c < o.lo[0] || s - BUNDLE_R - c > o.hi[0] || r.z + ez + c < o.lo[2] || r.z - ez - c > o.hi[2] || yhi + c < o.lo[1] || ylo - c > o.hi[1]; });
  const raw = (s) => { let y = wall(s); for (let k = 0; k < 40 && !clearAt(s, y); k++) y -= r.side * 0.01; return y; };
  // the jog is eased over ±4 in so the bundle bends at its radius instead of kinking
  r.y = (s) => { const k = Math.round(s * 20); if (!cache.has(k)) { let y = raw(k / 20); for (let d = -0.35; d <= 0.35; d += 0.05) { const yy = raw(k / 20 + d) + r.side * Math.abs(d) * 0.25; if ((yy - y) * r.side < 0) y = yy; } cache.set(k, y); } return cache.get(k); };
  r.members = [];
}
/** which route goes where: part number, path index (among the part's classed paths), points kept at the head and tail */
const PLAN = [
  // block I's runs (head / tail counts from wp3 RUN_PLAN and the layout, wpI0_layout.js)
  { pn: 'LEZ-80-110', i: 0, rw: 'LP', head: RUN_PLAN.start[0], tailFrom: RUN_PLAN.start[1], sIn: 4.05, sOut: 8.225 },     // starter cable: under the panel edge, out ahead of the CS spar's lower face
  { pn: 'LEZ-80-110', i: 1, rw: 'LP', head: RUN_PLAN.gnd[0], tailFrom: RUN_PLAN.gnd[1], sIn: 4.05, sOut: 8.225 },     // ground cable
  { pn: 'LEZ-24-160', i: 0, rw: 'LP', head: RUN_PLAN.pwr[0], tailFrom: RUN_PLAN.pwr[1], sIn: 4.05, sOut: 8.225 },     // power harness, bus module → firewall boot
  { pn: 'LEZ-24-160', i: 1, rw: 'LP', head: RUN_PLAN.pump[0], tailFrom: RUN_PLAN.pump[1], sIn: 4.05, sOut: 8.225 },     // power harness, bus module → aft centre (boost pump)
  { pn: 'LEZ-27-172', i: 0, rw: 'LP', head: 1, tailFrom: 2, sOut: 5.7917 /* seat-3: leaves the raceway at FS 69.5 for the actuator behind the seat back */ },   // landing-brake actuator
  { pn: 'LEZ-33-110', i: 0, rw: 'LP', head: R_TIP_HEAD.length, tailFrom: R_TIP_HEAD.length + 2, sIn: 4.05, sOut: 8.225 },     // left wingtip lights, to the systems tunnel
  { pn: 'LEZ-74-100', i: 0, rw: 'LS', head: 1, tailFrom: 2, sOut: 9.675 },     // key switch, P-leads
  { pn: 'LEZ-24-161', i: 3, rw: 'LS', head: RUN_PLAN.s13[0], tailFrom: RUN_PLAN.s13[1], sIn: 4.00, sOut: 3.55 },     // canopy-switch lead S13 (block I)
  { pn: 'LEZ-77-100', i: 0, rw: 'LS', head: 2, tailFrom: 5 },     // GEA 24 engine harness (panel rev C: a node ahead of the panel, square through the LS bundle hole)
  { pn: 'LEZ-23-125', i: 1, rw: 'LS', head: 2, tailFrom: 3, sIn: 3.55, sOut: 7.2583 },   // (J: through its own panel hole (rev C); stations on the P-leads' so the lanes stay parallel through the quadrant step)   // left console, rear-seat jacks
  { pn: 'LEZ-31-121', i: 0, rw: 'LS', head: 5, tailFrom: 6, sIn: 4.20, sOut: 8.875 },   // (J: from the GSU 25D on J's shelf)     // magnetometer (left wing)
  { pn: 'LEZ-25-162', i: 1, rw: 'RF', head: 2, tailFrom: 4 },     // ELT remote (final integration, panel rev C: rides the RF bundle, clear of C's roll tube at the seat back)
  { pn: 'LEZ-23-125', i: 0, rw: 'RS', head: 3, tailFrom: 4, sIn: 3.7591, sOut: 3.8725 },   // (J: through its own panel hole, panel rev C)   // right console (PTT)
  { pn: 'LEZ-23-110', i: 0, rw: 'RF', head: 3, tailFrom: 5, sOut: 8.775 },   // (J: to the CS spar tunnel)     // COM coax to the right winglet
  { pn: 'LEZ-34-111', i: 0, rw: 'RF', head: 5, tailFrom: 6, sOut: 5.7500 /* seat-3: leaves the raceway at FS 69 for the blade behind the seat back, aft of the primer lines */ },   // (J: belly blade at FS 50)   // transponder coax to the belly blade
  // right wingtip lights ride the left power bundle and cross behind the rear seat bulkhead (the crossing is in the
  // layout tail), so no power wire runs in the right-hand RF raceway
  { pn: 'LEZ-33-110', i: 1, rw: 'LP', head: R_TIP_HEAD.length, tailFrom: R_TIP_HEAD.length + 2, sIn: 4.05, sOut: 8.225 },
];
const classed = (p) => p.geo.filter((g) => g.t === 'path' && g.cls);

// ------------------------------------------------------------------------------------------- reroute onto the raceways
for (const pl of PLAN) {
  const p = partByPN(pl.pn), g = p && classed(p)[pl.i];
  if (!g) throw new Error(`routing plan: no path ${pl.pn}#${pl.i}`);
  pl.g = g; pl.part = p; RACEWAYS[pl.rw].members.push(pl);
}
for (const [name, rw] of Object.entries(RACEWAYS)) {
  // lanes: two-row lay, outboard row against the wall; pitch from the fattest member
  const pitch = Math.max(...rw.members.map((m) => m.g.dIn || 0.25), 0.25) * IN + 0.006;
  rw.pitch = pitch; rw.od = 0;
  const nr = rw.rows || 2;   // block I: the left power bundle is laid three high (narrower against the wall)
  rw.members.forEach((m, k) => { const row = k % nr, col = Math.floor(k / nr); m.lane = { dy: -rw.side * (col * pitch + (row % 2) * pitch / 2), dz: (row - (nr - 1) / 2) * pitch * 0.866 * (rw.members.length > 1 ? 1 : 0) }; });
  // bundle OD for the clamp: area sum with 15 % lay allowance
  rw.od = 1.15 * Math.sqrt(rw.members.reduce((a, m) => a + (m.g.dIn || 0.25) ** 2, 0));
  rw.name = name;
  // bundle extents about the centreline (ft): outboard, inboard and vertical, from the lanes and member diameters
  const rr = (m) => (m.g.dIn || 0.25) * IN / 2;
  rw.extO = Math.max(...rw.members.map((m) => -rw.side * m.lane.dy * 0 + rr(m)), BUNDLE_R * 0) || BUNDLE_R; rw.extI = Math.max(...rw.members.map((m) => Math.abs(m.lane.dy) + rr(m))) || BUNDLE_R; rw.extZ = Math.max(...rw.members.map((m) => Math.abs(m.lane.dz) + rr(m))) || BUNDLE_R;
}
const lanePt = (rw, m, s) => [s, rw.y(s) + m.lane.dy, rw.z + m.lane.dz];
for (const pl of PLAN) {
  const rw = RACEWAYS[pl.rw], g = pl.g, old = g.pts, head = old.slice(0, pl.head), tail = old.slice(pl.tailFrom);
  const sA = head.at(-1)[0], sB = tail[0][0], fwd = sB > sA;
  const s0 = pl.sIn ?? Math.min(Math.max(fwd ? Math.max(sA + 0.2, rw.s[0]) : Math.min(sA - 0.2, rw.s[1]), rw.s[0]), rw.s[1]);
  let s1 = pl.sOut ?? (fwd ? Math.min(sB - 0.2, rw.s[1]) : Math.max(sB + 0.2, rw.s[0]));
  s1 = Math.min(Math.max(s1, rw.s[0]), rw.s[1]);
  const n = Math.max(2, Math.ceil(Math.abs(s1 - s0) / 0.5)), mid = [];
  for (let k = 0; k <= n; k++) mid.push(lanePt(rw, pl, s0 + (s1 - s0) * k / n));
  const nMid = mid.length; if (pl.bridge) mid.push(...pl.bridge);
  const ext = (g.extSeg || []).filter((i) => i > pl.tailFrom).map((i) => i - pl.tailFrom + head.length + mid.length);
  g.pts = [...head, ...mid, ...tail];
  if (g.extSeg) g.extSeg = ext;
  g.raceway = pl.rw; g.rwSpan = [head.length, head.length + nMid - 1];
}

// ------------------------------------------------------------------------------------------- bend radii (all flexible runs)
// each run is formed 25 % above its rule radius where the legs allow (the check then measures against the rule itself)
function bendRadii() { for (const r of routes()) { const g = PARTS.find((p) => p.pn === r.part).geo.filter((q) => q.t === 'path' && q.cls)[r.i]; const R = bendRule(g); if (R) { g.bendRule = R * IN; g.bendR = 1.25 * R * IN; } } }
bendRadii();

// ------------------------------------------------------------------------------------------- supports
// AC 43.13-1B: wire bundles ≤ 24 in (design 18 in); aluminium tube 1/8–3/16 in 9 in, 1/4–5/16 in 12 in, 3/8–1/2 in 16 in;
// hose 18 in (ASSUMED); pitot-static nylon 12 in (ASSUMED). Cushion clamps MS21919WDG, dash = ID in 1/16 in.
export function spanRule(g) {
  const d = g.dIn || 0.25;
  if (g.cls === 'power' || g.cls === 'signal' || g.cls === 'rf' || g.cls === 'ign') return 18;
  if (g.cls === 'pitot') return 12;
  if (['fuel', 'oil', 'brake', 'air'].includes(g.cls)) return g.wallIn ? (d <= 0.1875 ? 9 : d <= 0.3125 ? 12 : 16) : 18;
  return 0;
}
const clampDash = (odIn) => Math.max(3, Math.ceil(odIn * 16 + 1));
/** support stations along a polyline: both ends are held by their fittings/connectors; interior clamps evenly spaced */
function stations(pts, spanFt, from = 0, to = null) {
  const out = [], L = pathLength(pts), a = from, b = to ?? L, n = Math.ceil((b - a) / spanFt) - 1;
  for (let k = 1; k <= n; k++) out.push(a + (b - a) * k / (n + 1));
  return out;
}
function pointAt(pts, d) { let acc = 0; for (let i = 1; i < pts.length; i++) { const l = len(sub(pts[i], pts[i - 1])); if (acc + l >= d) { const t = (d - acc) / (l || 1); return { p: add(pts[i - 1], mul(sub(pts[i], pts[i - 1]), t)), dir: mul(sub(pts[i], pts[i - 1]), 1 / (l || 1)), seg: i }; } acc += l; } return { p: pts.at(-1), dir: [1, 0, 0], seg: pts.length - 1 }; }
const arcLenTo = (pts, idx) => pathLength(pts.slice(0, idx + 1));

/** conduits and lined tunnels a run may pass through (final integration, 2026-11-19): a run inside one is supported along
 *  its length by the conduit, so no clamp is placed there (it would sit inside a foam core or a spar); the conduit's mouths
 *  count as supports. Entries: polyline in inches [FS, BL, WL] (right side; `mirror` also matches the left), bore radius (in).
 *  Registered by the owners of the cuts (block C wpC8_cuts: the systems conduit, the aft lane; block I: the CS spar tunnel;
 *  block A: the left wing's GMU 11 branch) before every module has loaded, when the clamps are rebuilt. */
export const CONDUITS = [];
export const registerConduit = (c) => { const k = CONDUITS.findIndex((q) => q.id === c.id); if (k >= 0) CONDUITS[k] = c; else CONDUITS.push(c); };
registerConduit({ id: 'cs-sys', what: 'LEZ-57-140 CS spar systems tunnel', pts: [[123.06, 9.90, 39.50], [127.50, 12.90, 39.50]], r: 0.40, mirror: true });
const segDistIn = (p, a, b) => { const ab = sub(b, a), L2 = V3.dot(ab, ab), t = L2 ? Math.max(0, Math.min(1, V3.dot(sub(p, a), ab) / L2)) : 0; return len(sub(p, add(a, mul(ab, t)))); };
/** the run's arc-length intervals (ft) inside a registered conduit (its axis within the bore radius), merged; ≥ 0.5 in long */
export function conduitSpans(pts) {
  const L = pathLength(pts), n = Math.max(2, Math.ceil(L / (0.1 / 12))), inside = [];
  for (let k = 0; k <= n; k++) { const d = L * k / n, q = pointAt(pts, d).p, P = [q[0] * 12, q[1] * 12, q[2] * 12];
    inside.push(CONDUITS.some((c) => { const Q = c.mirror ? [P[0], Math.abs(P[1]), P[2]] : P; for (let i = 1; i < c.pts.length; i++) if (segDistIn(Q, c.pts[i - 1], c.pts[i]) <= c.r + 0.02) return true; return false; })); }
  const out = []; let a = null;
  for (let k = 0; k <= n; k++) { if (inside[k] && a === null) a = L * k / n; if ((!inside[k] || k === n) && a !== null) { const b = L * (inside[k] ? k : k - 1) / n; if (b - a >= 0.5 / 12) out.push([a, b]); a = null; } }
  return out;
}
/** free run lengths beyond a conduit mouth that need no clamp of their own (in), and where the mouth clamp goes (in outside) */
export const MOUTH = { free: 6.0, at: 1.0 };
export const CLAMPS = [];
/** block I: built at import and rebuilt once every module has loaded (other blocks re-route runs after this module: brake lines,
 *  heat muff, landing-brake harness, pump lead), so each clamp sits on its run's final path */
function buildClamps() {
  CLAMPS.length = 0;
// raceway bundle clamps: one per station, every 15 in along the raceway
for (const rw of Object.values(RACEWAYS)) {
  if (!rw.members.length) continue;
  const n = Math.ceil((rw.s[1] - rw.s[0]) / 1.25);
  for (let k = 0; k <= n; k++) {
    const s = rw.s[0] + (rw.s[1] - rw.s[0]) * k / n, used = rw.members.filter((m) => { const a = m.g.pts[m.g.rwSpan[0]][0], b = m.g.pts[m.g.rwSpan[1]][0]; return s >= Math.min(a, b) - 1e-6 && s <= Math.max(a, b) + 1e-6; });
    if (!used.length) continue;
    const od = 1.15 * Math.sqrt(used.reduce((a, m) => a + (m.g.dIn || 0.25) ** 2, 0)), cy = rw.y(s) + used.reduce((a, m) => a + m.lane.dy, 0) / used.length;
    CLAMPS.push({ at: [s, cy, rw.z], dir: [1, 0, 0], od, dash: clampDash(od), raceway: rw.name, members: used.map((m) => `${m.pn}#${m.i}`), wall: rw.side });
  }
}
// individual run clamps: the free lengths outside the raceways
for (const r of routes()) {
  const g = PARTS.find((p) => p.pn === r.part).geo.filter((q) => q.t === 'path' && q.cls)[r.i], span = spanRule(g) * IN;
  if (!span) continue;
  const L = pathLength(g.pts), free0 = g.rwSpan ? [[0, arcLenTo(g.pts, g.rwSpan[0])], [arcLenTo(g.pts, g.rwSpan[1]), L]] : [[0, L]];
  const sta = [];
  // final integration: the lengths inside conduits are supported by the conduit (no clamp in a foam core or a spar); a free
  // length that leaves a conduit mouth gets a clamp MOUTH.at outside it unless it is short (≤ MOUTH.free) to its next support
  const cond = conduitSpans(g.pts); g.conduits = cond;
  const free = [], mouths = [];
  for (const [a0, b0] of free0) { let segs = [[a0, b0, false, false]];
    for (const [ca, cb] of cond) segs = segs.flatMap(([a, b, ma, mb]) => (cb <= a || ca >= b ? [[a, b, ma, mb]] : [...(ca > a ? [[a, ca, ma, true]] : []), ...(cb < b ? [[cb, b, true, mb]] : [])]));
    for (const q of segs) if (q[1] - q[0] > 1e-6) free.push(q); }
  for (const [ca, cb] of cond) mouths.push(ca, cb);
  const mouthSta = [];
  for (const [a, b, ma, mb] of free) { if (b - a <= MOUTH.free / 12 + 1e-9) continue; if (ma) mouthSta.push(a + MOUTH.at / 12); if (mb) mouthSta.push(b - MOUTH.at / 12); }
  // block I: a clamp never sits on a bulkhead / panel plane (it would put a fitting in the hole): slide it aft until ≥ 0.75 in clear
  const PLANES = [6.87, 22, 28, 40.75, 130.2, 153].map((x) => x / 12), offPlane = (d) => { let dd = d; for (let k = 0; k < 12 && PLANES.some((x) => Math.abs(pointAt(g.pts, dd).p[0] - x) < 0.75 / 12); k++) dd += 0.25 / 12; return Math.min(dd, pathLength(g.pts) - 0.1 / 12); };
  for (const d of mouthSta) sta.push(d);
  for (const [a, b, ma, mb] of free) { const a1 = ma && b - a > MOUTH.free / 12 + 1e-9 ? a + MOUTH.at / 12 : a, b1 = mb && b - a > MOUTH.free / 12 + 1e-9 ? b - MOUTH.at / 12 : b; for (const d of stations(g.pts, span * 0.9, a1, b1)) sta.push(offPlane(d)); }   // 10 % margin on the rule
  // raceway part: the bundle clamps support it; record the stations it passes for the span check
  // a clamp on the run itself where it joins and leaves its raceway bundle
  const brk = [];
  if (g.rwSpan) for (const k of g.rwSpan) { const d = arcLenTo(g.pts, k), q = pointAt(g.pts, Math.max(1e-4, d)); brk.push(d); CLAMPS.push({ at: g.pts[k], dir: q.dir, od: g.dIn || 0.25, dash: clampDash(g.dIn || 0.25), run: `${r.part}#${r.i}`, cls: g.cls, ext: false, breakout: true }); }
  g.supports = [0, L, ...sta, ...brk, ...mouths];
  if (g.rwSpan) { const rw = RACEWAYS[g.raceway], a0 = arcLenTo(g.pts, g.rwSpan[0]), seg = g.pts.slice(g.rwSpan[0], g.rwSpan[1] + 1), s0 = seg[0][0];
    // raceway stations are at fixed s; along the bundle, arc length ≈ distance in s (the raceway runs fore and aft)
    for (const c of CLAMPS.filter((c) => c.raceway === rw.name && c.members.includes(`${r.part}#${r.i}`))) { let acc = 0, best = null; for (let k = 1; k < seg.length; k++) { const l = len(sub(seg[k], seg[k - 1])); if ((c.at[0] - seg[k - 1][0]) * (c.at[0] - seg[k][0]) <= 0) { best = acc + l * Math.abs((c.at[0] - seg[k - 1][0]) / ((seg[k][0] - seg[k - 1][0]) || 1)); break; } acc += l; } if (best !== null) g.supports.push(a0 + best); } void s0; }
  g.supports.sort((a, b) => a - b);
  // a clamp slid off a plane can leave a span over the rule (the brake lines at the panel): add a clamp in that span
  const inCond = (a, b) => cond.some(([ca, cb]) => a >= ca - 1e-6 && b <= cb + 1e-6);
  for (let pass = 0; pass < 3; pass++) { const S = g.supports, add_ = []; for (let k = 1; k < S.length; k++) if (S[k] - S[k - 1] > span + 1e-9 && !inCond(S[k - 1], S[k])) add_.push(offPlane((S[k] + S[k - 1]) / 2)); if (!add_.length) break; sta.push(...add_); g.supports.push(...add_); g.supports.sort((a, b) => a - b); }
  for (const d of sta) { const q = pointAt(g.pts, d), ext = r.external || (g.extSeg || []).includes(q.seg); CLAMPS.push({ at: q.p, dir: q.dir, od: g.dIn || 0.25, dash: clampDash(g.dIn || 0.25), run: `${r.part}#${r.i}`, cls: g.cls, ext }); }
}
}
buildClamps();

// clamp part: one record for all cushion clamps (drawn as rings), with the dash-size breakdown in its hardware list
const sizes = () => { const bySize = {}; for (const c of CLAMPS.filter((q) => !q.ext)) bySize[c.dash] = (bySize[c.dash] || 0) + 1; return bySize; }, bySize = sizes();
const ring = (c) => { const h = 0.25 * IN, r = (c.od / 2 + 0.06) * IN; return { t: 'cyl', a: add(c.at, mul(c.dir, -h / 2)), b: add(c.at, mul(c.dir, h / 2)), r, colour: 0x2b6cb0, mat: 'steel' }; };
let IN_C = CLAMPS.filter((c) => !c.ext), EX_C = CLAMPS.filter((c) => c.ext);
defineParts([{ pn: 'LEZ-20-100', name: `Wire and line supports: ${IN_C.length} cushion clamps, raceway standoffs and grommets`, kind: 'cots', ata: 20, massItem: 'cabin', massEach: CLAMPS.length * 0.006, qty: 1,
  std: 'MS21919WDG cushion clamps (nitrile, AC 43.13-1B 11-?? support spacing), MS27039 screws into bonded nutplate standoffs, MS35489 grommets at bulkheads',
  geo: IN_C.map(ring),
  hardware: [...Object.entries(bySize).sort((a, b) => a[0] - b[0]).map(([d, n]) => ({ std: `MS21919WDG${d}`, qty: n, desc: `cushion clamp, ${d}/16 in ID` })), { std: 'MS27039C1-06', qty: IN_C.length, desc: 'clamp screw' }, { std: 'MS21047L3', qty: IN_C.length, desc: 'nutplate on a bonded G-10 standoff' }],
  props: [['Clamps', `${IN_C.length} (raceway bundle clamps every 15 in; individual runs at their AC 43.13 spacing)`], ['Raceways', Object.values(RACEWAYS).map((r) => `${r.name} ${r.side < 0 ? 'L' : 'R'} WL ${(r.z * 12).toFixed(1)}: ${r.members.length} runs, bundle Ø ${r.od.toFixed(2)} in`).join('; ')]],
  blurb: 'Every wire bundle and line is held by a cushion clamp on a bonded standoff at no more than its AC 43.13 spacing. In the cabin the wiring is gathered into five sidewall raceways (power left, signal and RF right) so the bundles run straight and low along the wall, below the armrests and clear of the sticks, throttle and seats.',
  steps: [{ title: 'Bond G-10 standoffs with nutplates to the sidewalls at the raceway stations; lay bundles; clamp', inspect: ['Clamp spacing ≤ the drawing', 'No wire within 1/2 in of structure edges without a grommet or chafe sleeve', 'Bundles lie in their raceway lane, power and RF on opposite sides'] }],
  src: { mass: 'ASSUMED', design: 'AC 43.13-1B ch. 9 & 11 (practice)' } },
  { pn: 'LEZ-20-110', name: `Line clips outside the skin: ${EX_C.length} cushion clamps on the gear legs and wing-root runs`, kind: 'cots', ata: 20, massItem: 'cabin', massEach: EX_C.length * 0.006, qty: 1, external: true /* on the main-gear legs and in the wing-root gaps */,
    std: 'MS21919WDG cushion clamps on bonded G-10 tabs', geo: EX_C.map(ring), hardware: [{ std: 'MS21919WDG4', qty: EX_C.length, desc: 'cushion clamp' }, { std: 'MS27039C1-06', qty: EX_C.length, desc: 'clamp screw' }],
    blurb: 'Clips holding the brake lines down the main-gear legs and the runs that cross the wing-root gaps.', steps: [{ title: 'Bond tabs to the gear legs; clamp lines', inspect: ['Clamp spacing ≤ the drawing'] }], src: { mass: 'ASSUMED' } }]);

// block I: after every module has loaded, re-route-proof clamps (the support records are rebuilt from the final list)
LOAD.after.push(() => { buildClamps(); IN_C = CLAMPS.filter((c) => !c.ext); EX_C = CLAMPS.filter((c) => c.ext);
  const a = PARTS.find((p) => p.pn === 'LEZ-20-100'), b = PARTS.find((p) => p.pn === 'LEZ-20-110'), bs = sizes();
  a.geo = IN_C.map(ring); a.name = `Wire and line supports: ${IN_C.length} cushion clamps, raceway standoffs and grommets`; a.massEach = CLAMPS.length * 0.006;
  a.hardware = [...Object.entries(bs).sort((x, y) => x[0] - y[0]).map(([d, n]) => ({ std: `MS21919WDG${d}`, qty: n, desc: `cushion clamp, ${d}/16 in ID` })), { std: 'MS27039C1-06', qty: IN_C.length, desc: 'clamp screw' }, { std: 'MS21047L3', qty: IN_C.length, desc: 'nutplate on a bonded G-10 standoff' }];
  b.geo = EX_C.map(ring); b.name = `Line clips outside the skin: ${EX_C.length} cushion clamps on the gear legs and wing-root runs`; b.massEach = EX_C.length * 0.006; b.hardware = [{ std: 'MS21919WDG4', qty: EX_C.length, desc: 'cushion clamp' }, { std: 'MS27039C1-06', qty: EX_C.length, desc: 'clamp screw' }]; });

// ------------------------------------------------------------------------------------------- checks
const FLUID = new Set(['fuel', 'oil', 'brake']), WIRE = new Set(['power', 'signal', 'rf', 'ign']);
function segClosest(p1, q1, p2, q2) {
  const d1 = sub(q1, p1), d2 = sub(q2, p2), r = sub(p1, p2), a = V3.dot(d1, d1), e = V3.dot(d2, d2), f = V3.dot(d2, r);
  let s = 0, t = 0;
  if (a > 1e-12 && e > 1e-12) { const c = V3.dot(d1, r), b = V3.dot(d1, d2), den = a * e - b * b; s = den > 1e-12 ? Math.min(1, Math.max(0, (b * f - c * e) / den)) : 0; t = (b * s + f) / e; if (t < 0) { t = 0; s = Math.min(1, Math.max(0, -c / a)); } else if (t > 1) { t = 1; s = Math.min(1, Math.max(0, (b - c) / a)); } }
  const P = add(p1, mul(d1, s)), Q = add(p2, mul(d2, t)); return { d: len(sub(P, Q)), P, Q };
}
/** routing audit: bend radius, support span, wires above fluid lines within 6 in */
export function routingAudit() {
  const bends = [], spans = [], drips = [];
  const rs = routes().map((r) => ({ r, g: PARTS.find((p) => p.pn === r.part).geo.filter((q) => q.t === 'path' && q.cls)[r.i] }));
  for (const { r, g } of rs) {
    if (g.bendR) { const f = filletPts(g.pts, g.bendR), k = g.bendR / g.bendRule; const inner = f.ratios.filter((q) => q.i > 1 && q.i < g.pts.length - 2); const w = inner.length ? inner.reduce((a, q) => (q.ratio < a.ratio ? q : a)) : null; if (w) bends.push({ run: `${r.part}#${r.i}`, name: r.name, cls: g.cls, ratio: w.ratio * k, at: w.at, R: g.bendRule * 12 }); }
    if (g.supports) { const s = g.supports, cd = g.conduits || []; let mx = 0; for (let k = 1; k < s.length; k++) if (!cd.some(([ca, cb]) => s[k - 1] >= ca - 1e-6 && s[k] <= cb + 1e-6)) mx = Math.max(mx, s[k] - s[k - 1]); /* a length inside a conduit is supported by it */ spans.push({ run: `${r.part}#${r.i}`, name: r.name, cls: g.cls, span: mx * 12, rule: spanRule(g) }); }
  }
  for (const A of rs) if (WIRE.has(A.g.cls)) for (const B of rs) if (FLUID.has(B.g.cls)) {
    let best = null;
    const e0 = A.g.pts[0], e1 = A.g.pts.at(-1);
    for (let i = 1; i < A.g.pts.length; i++) for (let j = 1; j < B.g.pts.length; j++) { const c = segClosest(A.g.pts[i - 1], A.g.pts[i], B.g.pts[j - 1], B.g.pts[j]); if (len(sub(c.P, e0)) < 4 / 12 || len(sub(c.P, e1)) < 4 / 12) continue; if (!best || c.d < best.d) best = c; }
    if (best && best.d * 12 < 6) drips.push({ wire: `${A.r.part}#${A.r.i}`, line: `${B.r.part}#${B.r.i}`, name: `${A.r.name} / ${B.r.name}`, d: best.d * 12, above: (best.P[2] - best.Q[2]) * 12, at: best.P });
  }
  return { bends, spans, drips };
}

registerChecks('wp12', (d, lc) => {
  if (lc.id !== 'W1-S1') return [];
  const a = routingAudit(), out = [];
  { const w = a.bends.reduce((x, q) => (q.ratio < x.ratio ? q : x), { ratio: 9 });
    const r = mk('fuselage', 'route-bend', 'Minimum bend radius, every flexible run (terminations excluded)', lc, w.name || '—', 'bend radius', w.ratio - 1, {
      formula: 'filleted route, radius limited by half the shorter leg;  MS = min(r_achieved / r_required) − 1;  r_required: wire 10×OD, coax 6×OD (≥ 1 in), Al tube 3×OD, hose 5×OD, pitot-static 1 in',
      inputs: [['Runs checked', a.bends.length, '', 'MODEL'], ['Rule source', 'AC 43.13-1B 11-?? / 9-?? practice', 'text', 'ASSUMED']],
      result: [['Worst run', `${w.run} (${w.cls})`, 'text'], ['Required radius', w.R, 'in'], ['Achieved / required', w.ratio, '']] }); r.sys = 'LEZ-20-100'; out.push(r); }
  { const w = a.spans.reduce((x, q) => (q.span / q.rule > x.span / x.rule ? q : x), { span: 0, rule: 1 });
    const r = mk('fuselage', 'route-support', 'Support spacing, every wire bundle and line', lc, w.name || '—', 'support span', w.rule / w.span - 1, {
      formula: 'MS = min(allowed span / longest unsupported span) − 1;  fittings, connectors and clamps count as supports',
      inputs: [['Runs checked', a.spans.length, '', 'MODEL'], ['Clamps', CLAMPS.length, '', 'MODEL'], ['Wire bundles', 18, 'in', 'AC 43.13 ≤ 24 in; design'], ['Al tube 3/16 / 1/4 / 3/8 in', '9 / 12 / 16', 'in', 'AC 43.13-1B']],
      result: [['Worst run', `${w.run} (${w.cls})`, 'text'], ['Longest span', w.span, 'in'], ['Allowed', w.rule, 'in']] }); r.sys = 'LEZ-20-100'; out.push(r); }
  { const below = a.drips.filter((q) => q.above < -0.25), w = below.reduce((x, q) => (q.above < x.above ? q : x), { above: 0 });
    const ms = below.length ? -1 + Math.max(0, 1 + w.above / 6) : 1;
    const r = mk('fuselage', 'route-drip', 'Wires above fuel, oil and brake lines wherever within 6 in', lc, w.name || 'all crossings', 'routing rule', ms, {
      formula: 'for every wire run within 6 in of a fluid line: wire at or above the line at the closest point (¼ in tolerance);  MS = 1 when none below',
      inputs: [['Close approaches checked', a.drips.length, '', 'MODEL']],
      result: [['Wire runs below a fluid line', below.length, ''], ['Worst', below.length ? `${w.name}: ${(-w.above).toFixed(2)} in below` : 'none', 'text']] }); r.sys = 'LEZ-20-100'; out.push(r); }
  return out;
});

defineReqs([{ id: 'R-ROUTE-1', ref: 'AC 43.13-1B 9 & 11 (practice)', title: 'Wiring and lines: bend radii, support spacing, wires above fluid lines, power and RF segregated in raceways', checks: /^route-(bend|support|drip)$/, method: 'analysis', closed: true,
  verify: () => ({ ok: Object.values(RACEWAYS).every((r) => !r.members.some((m) => (r.cls === 'power') !== (m.g.cls === 'power'))), detail: `${Object.keys(RACEWAYS).length} raceways, ${PLAN.length} runs gathered, ${CLAMPS.length} clamps` }) }]);
