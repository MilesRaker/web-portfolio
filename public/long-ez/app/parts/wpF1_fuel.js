// WPF1 — block F (fuel system) checks and the post-load adjustments that must run after the routing module (wp12).
// Geometry comes from wpF0_layout.js through wp1's records (FL, FPRIMS). Inches, definition frame [BL, FS, WL].
//  fuel-flow   boost pump alone (engine pump failed) to the carburettor at 1.25 × take-off flow (FAR 23.955(c)), flowmeter blocked
//  fuel-grav   boost pump off: gravity + the engine pump's suction to its inlet at 1.5 × take-off flow (the 23.955(b) gravity figure)
//  fuel-press  both pumps running: carburettor inlet pressure ≤ the engine's limit (FAR 23.955(c))
//  fuel-qty    usable fuel per tank on the released cavity (unusable at the worst attitude, 2 % expansion space) ≥ the placard
//  fuel-vent   vent line pressure drop at the maximum inflow; pick-up in air at 98 % full in level and cruise attitudes
//  fuel-drain  wells are the tanks' low points; drain lines and the cabin runs fall to their drains (normal ground attitude)
//  fuel-support longest unsupported span of every block F run vs AC 43.13 spacing (wp12 supports)
//  fuel-sep    separations: exhaust 6, ignition and power 2, RF / signal 1, mount tubes 0.5, cables / brake / rods and any
//              other part 0.25 in (FM-13/14); released partners govern, the rest are reported open items
//  fuel-hose   gascolator-to-engine-pump hose: slack for ±0.25 in of engine motion, bend radius, mount-tube clearance
// Typed-from-memory values are BOUNDs with the value at which MS reaches 0. Notional.
import { registerChecks, mk, FIXED, MASS_ITEMS, scoped, DEFAULT_DESIGN } from '../structures.js';
import { PARTS, partByPN, equipByRef, pathLength, defineReqs } from '../systems.js';
import { FL, FPRIMS, TANK_GAL, PORT, MOUNT } from './wp1_powerplant.js';
import { O235 } from './engine_o235.js';
import { outletSweep, unusableAt, PITCH, hOf, tankCells, TUBE, HOSE6, minRadius, pathLen, inOf, ftOf, R1, BAYS, DRIVE, omlLow, omlTop, hwAt, bellyAt, GRID_D } from './wpF0_layout.js';
import { spanRule } from './wp12_routing.js';
import { exhaustPrims, muffPrims } from './wpG4_systems.js';
// min / max of a long array without spreading it into arguments (a module worker's smaller stack overflows on the tank cells)
const amin = (a) => { let m = Infinity; for (const v of a) { if (v !== v) return NaN; if (v < m) m = v; } return m; }, amax = (a) => { let m = -Infinity; for (const v of a) { if (v !== v) return NaN; if (v > m) m = v; } return m; };

const sub = (a, b) => a.map((v, i) => v - b[i]), add = (a, b) => a.map((v, i) => v + b[i]), mul = (a, k) => a.map((v) => v * k), dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], len = (a) => Math.hypot(...a);
const IN_ = (n, v, u, s = 'DERIVED') => [n, v, u, s];
export const OWNPN = /^LEZ-(28-1|73-1)/;

// ------------------------------------------------------------------------------------------- post-load adjustments
// the gascolator-to-pump hose is PTFE with a fire sleeve: its own bend rule (typed, BOUND in fuel-hose) replaces wp12's
// generic 5 × OD for hoses
for (const g of partByPN('LEZ-73-110').geo.filter((q) => q.t === 'path' && q.dIn === HOSE6.od)) { g.bendRule = HOSE6.bendMin / 12; g.bendR = 1.25 * HOSE6.bendMin / 12; }
// the boost pump's connector (I's EQUIP M1) and the end of I's power harness move with the pump (ICD F140-1): the pigtail
// comes down from above onto the connector on top of the pump, ≥ 2 in from the pump's fuel lines
export const PUMP_CONN = [FL.PUMP.a[0], (FL.PUMP.a[1] + FL.PUMP.b[1]) / 2, FL.PUMP.a[2] + 0.85 + 0.65];
{ const m = equipByRef('M1'); if (m) m.at = ftOf(PUMP_CONN);
  const h = partByPN('LEZ-24-160')?.geo.filter((q) => q.t === 'path')[1];
  if (h) { const k = h.pts.length - 2; h.pts = [...h.pts.slice(0, k), ftOf([-3.0, 115.50, 35.0]), ftOf([PUMP_CONN[0], PUMP_CONN[1], 34.2]), ftOf(PUMP_CONN)];
    const L = pathLength(h.pts), s0 = (h.supports || []).filter((x) => x < pathLength(h.pts.slice(0, k + 1)) - 1e-6); h.supports = [...new Set([...s0, L])].sort((a, b) => a - b); } }

// ------------------------------------------------------------------------------------------- fuel data (typed values are BOUNDs)
export const FD = {
  bsfc: 0.50,          // lb/hp·h, full-rich take-off (typed from memory)
  rho: 6.0,            // lb/US gal avgas for the weight and balance (FAA-H-8083-25)
  rhoFlow: 5.77,       // lb/US gal, lightest 100LL in the CRC 2025 survey at 15 °C (691.9 kg/m³; accessed 2026-11-19): flow and head
  rhoCrit: 6.08,       // lb/US gal, heaviest in the same survey (728.2 kg/m³): tank pressure (23.965(a)(2))
  nu: 8.0e-6,          // ft²/s avgas kinematic viscosity (typed)
  pump: { p0: 4.0, Qmax: 32, pMax: 7.0 },   // Facet 40106 solid-state: 4.0 psi minimum / 7.0 maximum, 32 gph (Facet ratings via Aircraft Spruce, accessed 2026-11-19): the 4.0 psi minimum for flow, 7.0 for the carb limit
  pMinCarb: 0.5, pMaxCarb: 8.0,  // carburettor inlet pressure limits, psi (typed from memory; G to confirm)
  pEngMax: 6.0,        // engine pump outlet maximum, psi (typed)
  suction: 1.0,        // suction the engine pump may draw at its inlet without vapour, psi (DESIGN, typed)
  K: { bend: 0.4, fit: 0.9, valve: 2.0, strainer: 1.5, gasc: 1100, fftBlocked: 4.0, engPumpFailed: 6.0, wellEntry: 1.0 },
  ventAllow: 0.25,     // psi, vent line drop allowed (DESIGN; the tank test pressure is the tank-press value, 23.965(a)(2))
  rodFpm: 2000,        // maximum rate of descent, ft/min (DESIGN)
  expansion: 0.02,     // FAR 23.969 expansion space (typed from memory)
};
export const takeoffGph = () => FD.bsfc * O235.hp / FD.rhoFlow;
/** Andair GAS375 pressure drop 0.22 psi at 20 gph (0.71 at 38) on the 3/8 × 0.035 bore: K ≈ 1,100 velocity heads (Andair data, accessed 2026-11-19) */
export const GASC_DP = { psi: 0.22, gph: 20 };
const ID = { tube: (TUBE.feed.od - 2 * TUBE.feed.w) / 12, hose: HOSE6.id / 12, pass: (TUBE.pass.od - 2 * TUBE.pass.w) / 12 };
const RHO_F = FD.rhoFlow / 7.4805 / 32.174;   // slug/ft³ (lightest fuel: least head, highest volume flow)
const corners = (pts) => Math.max(0, pts.length - 2);
/** pipe + fitting loss (psi) at q gph through a run of length L ft, bore D ft, ΣK */
function dp(q, L, D, K) { const V = q * 0.13368 / 3600 / (Math.PI * D * D / 4), Re = V * D / FD.nu, f = Re < 2300 ? 64 / Math.max(Re, 1) : 0.316 * Re ** -0.25; return (f * L / D + K) * RHO_F * V * V / 2 / 144; }
/** the feed path, segment by segment: [lengthFt, boreFt, K] */
function feedPath(toCarb) {
  const K = FD.K, segs = [[0.15, ID.pass, K.strainer + K.wellEntry], [pathLen(FL.feed(1)) / 12, ID.tube, corners(FL.feed(1)) * K.bend + 2 * K.fit + K.valve], [pathLen(FL.vToPump) / 12, ID.tube, corners(FL.vToPump) * K.bend + 2 * K.fit],
    [pathLen(FL.pToFft) / 12, ID.tube, corners(FL.pToFft) * K.bend + 2 * K.fit + K.fftBlocked], [pathLen(FL.fftToFw) / 12, ID.tube, corners(FL.fftToFw) * K.bend + 2 * K.fit], [0.15, ID.tube, 2 * K.fit + K.gasc], [pathLen(FL.riser) / 12, ID.tube, 2 * K.bend + 2 * K.fit], [pathLen(FL.hose1) / 12, ID.hose, 2 * K.fit]];
  if (toCarb) segs.push([pathLen(FL.hose2) / 12, ID.hose, 2 * K.fit + K.engPumpFailed + K.fit]);
  return segs;
}
const lossAt = (q, segs) => segs.reduce((a, [Lf, D, K]) => a + dp(q, Lf, D, K), 0);
/** head (psi) from the sill (fuel at the unusable level) down to point p at pitch a */
const headTo = (p, a) => RHO_F * 32.174 * (hOf(FL.sump.sill, a) - hOf(p, a)) / 12 / 144;
function solveQ(avail) { let lo = 0, hi = 60; for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (avail(m) >= 0) lo = m; else hi = m; } return lo; }
export function flowCases() {
  const Q = takeoffGph(), out = {};
  const segsC = feedPath(true), segsP = feedPath(false), carb = FL.eng.carbIn, pin = FL.eng.fpIn;
  out.pump = [-3, 10].map((a) => { const h = headTo(carb, a), avail = (q) => FD.pump.p0 * (1 - q / FD.pump.Qmax) + h - lossAt(q, segsC) - FD.pMinCarb, q = solveQ(avail); return { a, h, q, req: 1.25 * Q, loss: lossAt(1.25 * Q, segsC) }; }).sort((x, y) => x.q / x.req - y.q / y.req)[0];
  out.grav = [-3, 10].map((a) => { const h = headTo(pin, a), avail = (q) => h - lossAt(q, segsP) + FD.suction, q = solveQ(avail); return { a, h, q, req: 1.5 * Q, loss: lossAt(1.5 * Q, segsP) }; }).sort((x, y) => x.q / x.req - y.q / y.req)[0];
  out.L = { carb: segsC.reduce((a, s) => a + s[0], 0) * 12, pin: segsP.reduce((a, s) => a + s[0], 0) * 12 };
  return out;
}

// ------------------------------------------------------------------------------------------- quantity (FM-1/2/3)
export function quantity() {
  const S = outletSweep(TANK_GAL).best, un = S.worst, usable = TANK_GAL * (1 - FD.expansion) - un, placard = Math.floor(usable);
  return { V: TANK_GAL, fs: S.fs, sill: S.sill, u: S.u, un, usable, placard, totalUsableLb: 2 * placard * FD.rho, unusableLb: 2 * un * FD.rho };
}
FIXED.fuelQty = quantity();   // read by the weight-and-balance items and the placard
// weight and balance (FM-3): the fuel load is the usable fuel; the unusable fuel is empty weight (LEZ-28-100's lines)
FIXED.fuelMaxLb = FIXED.fuelQty.totalUsableLb;
{ const it = MASS_ITEMS.find((i) => i[0] === 'fuel'); if (it) { it[1] = `Fuel, ${2 * FIXED.fuelQty.placard} gal usable (strakes)`; it[2] = FIXED.fuelMaxLb; } }

/** the unusable fuel's centroid (in) for the weight and balance: the lowest `un` gallons of each tank in the level ground
 *  attitude (where it lies when the aircraft is weighed), both tanks (so on the centre line) */
export function unusableCG() { const q = FIXED.fuelQty, C = tankCells(TANK_GAL), n = Math.round(q.un / C.galPer), b = [...C.pts].sort((x, y) => x[2] - y[2]).slice(0, n);
  return [0, b.reduce((s, p) => s + p[1], 0) / b.length, b.reduce((s, p) => s + p[2], 0) / b.length]; }
/** LEZ-28-100 installation lines (consumables). The unusable fuel is empty weight in the weight and balance
 *  (FIXED.unusableFuel, read by wp5's loading sweep); it is kept out of the structural mass model, whose gross cases are
 *  filled to gross with fuel anyway */
export const INSTALL_LINES = () => [
  { std: 'Fuel-resistant thread sealant and fire sealant', qty: 1, desc: 'fittings and the firewall union', each: 0.05 },
  { std: 'Placards: fuel grade / usable quantity at the fillers, selector positions', qty: 3, desc: 'vinyl placards', each: 0.005 },
  // rev 2026-11-19 (integral tanks): 23.963(c) access covers and 23.967(b) drains (holes in A's skins: ICD F, docs/icd/f_fuel.md)
  { std: 'Tank access cover: 0.063 6061-T6 Ø 5.5 over a Ø 4.0 opening, bonded nutplate ring with 8 × MS21047L08, Viton gasket, 8 × MS51958-63 (DESIGN; mass BOUND)', qty: 10, desc: 'lower strake skin, 5 per tank (bays 1 and 2: two each, bay 3: one; tank-access)', each: 0.24 },
  { std: 'Drain grommet Ø 0.25 (nylon, fuel-resistant) at the low point; vent hole Ø 0.25', qty: 5, desc: 'wedge compartments (drain + vent each side) and the aft fuselage bay drain (tank-adj)', each: 0.002 },
];
FIXED.unusableFuel = { lb: FIXED.fuelQty.unusableLb, s: unusableCG()[1] / 12 };
{ const p = partByPN('LEZ-28-100'), m = INSTALL_LINES().reduce((a, l) => a + l.qty * l.each, 0); p.massEach = +m.toFixed(4); p.src = { ...p.src, mass: 'LEZ-28-100 record: consumables (the unusable fuel is in the weight and balance)' }; }

// ------------------------------------------------------------------------------------------- separations (FM-10/13/14)
/** blocks whose parts are released in this merge (A airframe, B cockpit, C controls, D main gear, G powerplant) */
export const RELEASED = new Set(['A', 'B', 'C', 'D', 'G']);
export function blockOf(pn) {
  const [, a, b] = pn.split('-'), n = Number(b);
  if (['53', '55', '57', '08'].includes(a)) return 'A';
  if (a === '25' && n < 160 || a === '52' || a === '56' || pn === 'LEZ-31-100') return 'B';
  if (a === '27') return 'C';
  if (a === '32') return n >= 200 && n < 300 ? 'E' : 'D';
  if (['71', '61', '78', '79'].includes(a)) return 'G';
  if (['74', '76', '77'].includes(a)) return 'H';
  if (['20', '24', '33', '80'].includes(a)) return 'I';
  return 'J';
}
const RULE = { exhaust: 6, ign: 2, power: 2, rf: 1, signal: 1 };
const segD = (p1, q1, p2, q2) => { const d1 = sub(q1, p1), d2 = sub(q2, p2), r = sub(p1, p2), a = dot(d1, d1), e = dot(d2, d2), f = dot(d2, r); let s = 0, t = 0;
  if (a > 1e-12 && e > 1e-12) { const c = dot(d1, r), b = dot(d1, d2), den = a * e - b * b; s = den > 1e-12 ? Math.min(1, Math.max(0, (b * f - c * e) / den)) : 0; t = (b * s + f) / e; if (t < 0) { t = 0; s = Math.min(1, Math.max(0, -c / a)); } else if (t > 1) { t = 1; s = Math.min(1, Math.max(0, (b - c) / a)); } }
  else if (e > 1e-12) t = Math.min(1, Math.max(0, f / e)); else if (a > 1e-12) s = Math.min(1, Math.max(0, -dot(d1, r) / a));
  return len(sub(add(p1, mul(d1, s)), add(p2, mul(d2, t)))); };
const boxD = (q, lo, hi) => len([0, 1, 2].map((i) => Math.max(lo[i] - q[i], 0, q[i] - hi[i])));
/** shapes (in): capsules {a, b, r} and boxes {lo, hi}, with the class (route class, or 'part') */
function shapesOf(p) {
  const out = [];
  for (const g of p.geo || []) {
    if (g.t === 'path') { const pts = g.pts.map(inOf); for (let i = 1; i < pts.length; i++) out.push({ k: 'cap', a: pts[i - 1], b: pts[i], r: (g.dIn || 0.25) / 2, cls: g.cls || 'part' }); }
    else if (g.t === 'cyl') out.push({ k: 'cap', a: inOf(g.a), b: inOf(g.b), r: g.r * 12, cls: 'part' });
    else if (g.t === 'sphere') out.push({ k: 'cap', a: inOf(g.c), b: inOf(g.c), r: g.r * 12, cls: 'part' });
    else if (g.t === 'box' || g.t === 'obox') { const c = inOf(g.c), d = [g.d[1] * 12, g.d[0] * 12, g.d[2] * 12]; out.push({ k: 'box', lo: sub(c, mul(d, 0.5)), hi: add(c, mul(d, 0.5)), cls: 'part' }); }
    else if (g.t === 'frame') for (const [a, b, od] of g.members) out.push({ k: 'cap', a: inOf(g.nodes[a]), b: inOf(g.nodes[b]), r: od / 2, cls: 'tube' });
  }
  return out;
}
/** capsule against box: the nearest of the capsule's axis samples (every 0.15 in, ends included) to the box, less its
 *  radius. Same samples and the same arithmetic as sampling into an array, without the allocation (perf) */
function capBoxD(C, lo, hi, step = 0.15) {
  const a = C.a, b = C.b, v0 = b[0] - a[0], v1 = b[1] - a[1], v2 = b[2] - a[2], n = Math.max(1, Math.ceil(Math.hypot(v0, v1, v2) / step));
  let m = Infinity;
  for (let i = 0; i <= n; i++) { const t = i / n, q0 = a[0] + v0 * t, q1 = a[1] + v1 * t, q2 = a[2] + v2 * t;
    const d = Math.hypot(Math.max(lo[0] - q0, 0, q0 - hi[0]), Math.max(lo[1] - q1, 0, q1 - hi[1]), Math.max(lo[2] - q2, 0, q2 - hi[2])); if (d < m) m = d; }
  return m - C.r;
}
function shapeDist(A, B) {
  if (A.k === 'cap' && B.k === 'cap') return segD(A.a, A.b, B.a, B.b) - A.r - B.r;
  if (A.k === 'box' && B.k === 'box') return len([0, 1, 2].map((i) => Math.max(A.lo[i] - B.hi[i], 0, B.lo[i] - A.hi[i])));
  const C = A.k === 'cap' ? A : B, X = A.k === 'cap' ? B : A; return capBoxD(C, X.lo, X.hi);
}
/** a lower bound on shapeDist from the shapes' axis-aligned bounds (perf: pairs that cannot govern are skipped; the
 *  bound is exact geometry, never above the sampled distance, and is used with a 1e-7 in allowance for rounding) */
const bnd = (s) => s.bb || (s.bb = s.k === 'box' ? { lo: s.lo, hi: s.hi, r: 0 } : { lo: [0, 1, 2].map((i) => Math.min(s.a[i], s.b[i])), hi: [0, 1, 2].map((i) => Math.max(s.a[i], s.b[i])), r: s.r });
function lowD(A, B) {
  const P = bnd(A), Q = bnd(B);
  return Math.hypot(Math.max(P.lo[0] - Q.hi[0], 0, Q.lo[0] - P.hi[0]), Math.max(P.lo[1] - Q.hi[1], 0, Q.lo[1] - P.hi[1]), Math.max(P.lo[2] - Q.hi[2], 0, Q.lo[2] - P.hi[2])) - P.r - Q.r - 1e-7;
}
/** foreign parts my items legitimately touch at their ports or mountings (in): [pn, at, radius] */
const MATES = () => [['LEZ-77-130', null, 99], ['LEZ-71-210', FL.eng.fpIn, 1.8], ['LEZ-71-210', FL.eng.fpOut, 1.0], ['LEZ-71-210', FL.eng.carbIn, 1.6], ['LEZ-77-121', FL.eng.carbIn, 1.8], ['LEZ-24-160', PUMP_CONN, 2.2], ['LEZ-71-250', FL.eng.carbIn, 2.6], ['LEZ-79-100', null, 99],
  ['LEZ-53-180', null, 99], ['LEZ-71-200', null, 99], ['LEZ-20-100', null, 99], ['LEZ-20-110', null, 99], ['LEZ-53-150', null, 99], ['LEZ-57-180', null, 99], ['LEZ-57-150', null, 99],
  ...(FIXED.fuelMates || [])];   // integration 2026-11-19: the primer's nozzle terminations (wpF9_primer) add their own
const near = (s, q, r) => (s.k === 'cap' ? segD(s.a, s.b, q, q) : boxD(q, s.lo, s.hi)) < r;
/** every block F shape against every other part's shapes: clearance less the rule; worst per partner */
export function separations() { return scoped('fuelSeparations', separationsNow); }   // shared within a memo scope (release audits; perf)
function separationsNow() {
  const mine = PARTS.filter((p) => OWNPN.test(p.pn)), others = PARTS.filter((p) => !OWNPN.test(p.pn)), rows = [];
  // the selector drive (LEZ-28-135) carries no fuel: it keeps the mechanical 0.25 in from everything (cls 'mech')
  const mineS = mine.flatMap((p) => shapesOf(p).map((s) => ({ ...s, pn: p.pn, cls: p.pn === 'LEZ-28-135' ? 'mech' : s.cls === 'part' || s.cls === 'pushrod' ? 'fuel' : s.cls })));
  const grown = (S) => { const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity]; for (const q of S) { const b = bnd(q); for (let i = 0; i < 3; i++) { lo[i] = Math.min(lo[i], b.lo[i] - b.r); hi[i] = Math.max(hi[i], b.hi[i] + b.r); } } return { lo, hi, r: 0 }; };
  const MB = grown(mineS);
  for (const o of others) {
    const os = shapesOf(o), mates = MATES().filter((m) => m[0] === o.pn); if (mates.some((m) => !m[1])) continue;
    // a part whose shapes all lie 6.5 in or more from every block F shape (bounds grown by the radii) cannot make a row (perf)
    if (os.length && lowD({ bb: MB }, { bb: grown(os) }) >= 6.5) continue;
    let w = null;
    for (const A of mineS) for (const B of os) {
      const need = A.cls === 'mech' ? 0.25 : RULE[B.cls] ?? (B.cls === 'tube' ? (/LEZ-73-110/.test(A.pn) ? 0.5 : 0.25) : 0.25);
      if (w && lowD(A, B) - need >= w.m) continue;   // cannot be the new worst (perf; same result)
      if (mates.some((m) => near(A, m[1], m[2]) && near(B, m[1], m[2]))) continue;
      const d = shapeDist(A, B), m = d - need;
      if (!w || m < w.m) w = { m, d, need, mine: A.pn, other: o.pn, cls: B.cls, at: A.k === 'cap' ? A.a : A.lo };
    }
    if (w && w.d < 6.5) rows.push({ ...w, block: blockOf(o.pn), released: RELEASED.has(blockOf(o.pn)) });
  }
  // the mount frame (LEZ-71-220) and the exhaust stacks from their definition primitives
  for (const [a, b, od] of MOUNT.members) { const T = { k: 'cap', a: inOf(MOUNT.nodes[a]), b: inOf(MOUNT.nodes[b]), r: od / 2 };
    for (const A of mineS) { if (lowD(A, T) >= 3) continue; const need = /LEZ-73-1/.test(A.pn) ? 0.5 : 0.25, d = shapeDist(A, T); if (d < 3) rows.push({ m: d - need, d, need, mine: A.pn, other: `LEZ-71-220 ${a}–${b}`, cls: 'tube', block: 'G', released: true }); } }
  for (const x of exhaustPrims().filter((q) => q.feat === 'stack')) { const T = { k: 'cap', a: x.a, b: x.b, r: x.r };
    for (const A of mineS) { if (lowD(A, T) >= 8) continue; if ((FIXED.fuelHotExempt || []).some((e) => e.pn === A.pn && near(A, e.at, e.r))) continue; const d = shapeDist(A, T); if (d < 8) rows.push({ m: d - 6, d, need: 6, mine: A.pn, other: 'LEZ-78-100 stack', cls: 'exhaust', block: 'G', released: true }); } }
  // the carb-heat muff (a hot shroud: the exhaust rule) and its SCAT duct (hot air: 1 in), from block G's definition primitives (ICD phase 2)
  for (const x of muffPrims().filter((q) => q.t === 'cyl')) { const hot = x.feat === 'muff', need = hot ? 6 : 1, T = { k: 'cap', a: x.a, b: x.b, r: x.r };
    for (const A of mineS) { if (lowD(A, T) >= need + 2) continue; const d = shapeDist(A, T); if (d < need + 2) rows.push({ m: d - need, d, need, mine: A.pn, other: hot ? 'LEZ-78-110 muff' : 'LEZ-78-110 SCAT', cls: hot ? 'exhaust' : 'hot air', block: 'G', released: true }); } }
  const best = new Map(); for (const r of rows) { const k = `${r.mine}|${r.other}`; if (!best.has(k) || r.m < best.get(k).m) best.set(k, r); }
  return [...best.values()].sort((a, b) => a.m - b.m);
}
/** not cached: other modules run the analysis while they load, before every part has its final geometry */
export const sepCache = () => separations();

// ------------------------------------------------------------------------------------------- hose, supports, drains, vent
export function hoseState(sep = sepCache()) {
  const h = FL.hose1, c = len(sub(h.at(-1), h[0])), Lh = pathLen(h), R = minRadius(h), clr = Math.min(...sep.filter((r) => r.mine === 'LEZ-73-110' && r.cls === 'tube').map((r) => r.d), 9);
  return { c, Lh, slack: Lh - c, R, clr, need: 2 * 0.25, ms: Math.min((Lh - c) / 0.5, R / HOSE6.bendMin, clr / 0.5) - 1 };
}
export function supportState() {
  const out = [];
  for (const p of PARTS.filter((q) => OWNPN.test(q.pn))) p.geo.forEach((g, i) => { if (g.t !== 'path' || !g.supports) return; const s = [...g.supports].sort((a, b) => a - b); let mx = 0; for (let k = 1; k < s.length; k++) mx = Math.max(mx, s[k] - s[k - 1]); out.push({ run: `${p.pn}#${i}`, span: mx * 12, rule: spanRule(g) }); });
  return out.sort((a, b) => b.span / b.rule - a.span / a.rule);
}
/** smallest drop (in) between consecutive points of a run that must fall in the flow direction (negative = a rise) */
const minDrop = (pts) => Math.min(...pts.slice(1).map((q, i) => pts[i][2] - q[2]));
export function drainState() {
  const S = FL.sump, items = [
    ['well bottom below the sill', S.sill[2] - S.wBot - 1.0], ['drain from the well bottom', S.wBot - FL.sump.drainPt[2]],
    ['drain lines fall well → poppet', minDrop(FL.drainLine(1))], ['feed lines fall well → selector', minDrop(FL.feed(1))], ['selector → pump falls', minDrop(FL.vToPump)],
    ['pump → transducer falls', minDrop(FL.pToFft)], ['gascolator bowl below the union and the hose to the engine pump', Math.min(FL.UNION.wl, ...FL.hose1.map((q) => q[2])) - FL.gasc.bowlBot - 1.0]];
  const w = items.reduce((a, b) => (b[1] < a[1] ? b : a));
  return { items, w, ms: w[1] >= 0 ? 1 : -1, fftTrap: FL.UNION.wl - FL.fft.out[2] };
}
export function ventState() {
  const q = takeoffGph() * 1.25 * 0.13368 / 3600, Vt = TANK_GAL * 0.13368, pAtm = 2116, rhoA = 0.0765 / 32.174, inflow = Vt * (rhoA * 32.174 * FD.rodFpm / 60) / pAtm + q;   // ft³/s of air
  const D = (TUBE.vent.od - 2 * TUBE.vent.w) / 12, A = Math.PI * D * D / 4, V = inflow / A, Lf = pathLen(FL.vent.pts) / 12, Re = V * D / 1.6e-4, f = Re < 2300 ? 64 / Math.max(Re, 1) : 0.316 * Re ** -0.25, K = 1.5 + corners(FL.vent.pts) * 0.4;
  const drop = (f * Lf / D + K) * rhoA * V * V / 2 / 144, m = FL.vent.margins;
  return { inflow, V, drop, m, ms: Math.min(FD.ventAllow / drop, (Math.min(m[1], m[2]) + 0.5) / 0.5) - 1 };
}

// ------------------------------------------------------------------------------------------- selector remote drive (FAR 23.995)
/** LEZ-28-135: torsion of the 6061 tube under the pilot's twist load, the drives' and joint's rating, wind-up at the
 *  valve's detent torque against the detent spacing, and the joint's working angle. Typed values are BOUNDs. */
export const SEL = { Tpilot: 133, FS: 1.5, Fsu: 27000, G: 3.8e6, rating: 300, Tdet: 20, twistAllow: 15, ujMax: DRIVE.ujMax };
export function selState() {
  const D = FL.drive, T = DRIVE.tube, ro = T.od / 2, ri = ro - T.w, J = Math.PI / 2 * (ro ** 4 - ri ** 4), Tu = SEL.Tpilot * SEL.FS, tau = Tu * ro / J;
  const theta = SEL.Tdet * D.length / (SEL.G * J) * 180 / Math.PI;
  const terms = [['tube torsion', SEL.Fsu / tau - 1], ['drive / joint rating', SEL.rating / Tu - 1], ['wind-up at the detent', SEL.twistAllow / theta - 1], ['joint angle', SEL.ujMax / D.ujAngle - 1]].sort((a, b) => a[1] - b[1]);
  return { J, Tu, tau, theta, L: D.length, ang: D.ujAngle, terms, ms: terms[0][1], tauMax: SEL.Fsu, ratingMin: Tu };
}

// ------------------------------------------------------------------------------------------- checks
registerChecks('wpF1-fuel', (d, lc) => {
  if (lc.id !== 'W1-S1') return [];
  const out = [], tag = (r, pn) => { r.sys = pn; out.push(r); }, Q = takeoffGph(), F = flowCases(), q = quantity();
  const bsfcMax = (x) => FD.bsfc * x.q / x.req;
  tag(mk('strake', 'fuel-flow', 'Fuel flow at the carburettor, boost pump alone (engine pump failed), flowmeter blocked', lc, 'tank sill → carb inlet', `${F.pump.a > 0 ? 'nose-up' : 'nose-down'} ${Math.abs(F.pump.a)}°, unusable fuel only`, F.pump.q / F.pump.req - 1, {
    formula: 'p_pump(Q) + ρgΔh − Σ(f L/D + ΣK) ρV²/2 ≥ p_min;  MS = Q_avail / (1.25 Q_take-off) − 1  (FAR 23.955(a), (c))',
    inputs: [IN_('Take-off power', O235.hp, 'hp', 'TCDS E-223'), IN_('Fuel density (flow)', FD.rhoFlow, 'lb/US gal', 'CRC 2025 avgas survey minimum, 691.9 kg/m³ at 15 °C (accessed 2026-11-19)'), IN_('BSFC full rich', FD.bsfc, 'lb/hp·h', `BOUND: typed; MS stays ≥ 0 up to ${bsfcMax(F.pump).toFixed(2)}`), IN_('Flow factor, pump systems', 1.25, '', 'FAR23: 23.955(c) (CFR 2013 text)'),
      IN_('Pump minimum pressure / free flow', `${FD.pump.p0} psi / ${FD.pump.Qmax} gph`, 'text', 'Facet 40106 ratings (Aircraft Spruce, accessed 2026-11-19)'), IN_('Carb minimum inlet pressure', FD.pMinCarb, 'psi', 'BOUND: typed; G to confirm'),
      IN_('K: strainer, valve, blocked transducer, gascolator, failed engine pump', `${FD.K.strainer}, ${FD.K.valve}, ${FD.K.fftBlocked}, ${FD.K.gasc}, ${FD.K.engPumpFailed}`, 'text', 'gascolator K from Andair GAS375 0.22 psi at 20 gph (accessed 2026-11-19); the rest BOUND (typed)'), IN_('Path length', F.L.carb, 'in', 'GEOMETRY'), IN_('Head, sill to carb', F.pump.h, 'psi', 'GEOMETRY')],
    result: [['Required flow', F.pump.req, 'gph'], ['Loss at the required flow', F.pump.loss, 'psi'], ['Available flow', F.pump.q, 'gph']] }), 'LEZ-28-100');
  tag(mk('strake', 'fuel-grav', 'Fuel to the engine pump, boost pump off (gravity + the engine pump\'s suction)', lc, 'tank sill → engine pump inlet', `${F.grav.a > 0 ? 'nose-up' : 'nose-down'} ${Math.abs(F.grav.a)}°, unusable fuel only`, F.grav.q / F.grav.req - 1, {
    formula: 'ρgΔh + p_suction − Δp_line(Q) ≥ 0;  MS = Q_avail / (1.5 Q_take-off) − 1  (the 23.955(b) gravity figure, conservative for a pump system)',
    inputs: [IN_('Flow factor', 1.5, '', 'FAR23: 23.955(b) (CFR 2013 text)'), IN_('Engine pump suction allowed', FD.suction, 'psi', 'DESIGN: well under the vapour margin of avgas (typed)'), IN_('Boost pump off: bypass K', FD.K.fit, '', 'BOUND: typed'), IN_('Path length', F.L.pin, 'in', 'GEOMETRY'), IN_('Head, sill to pump inlet', F.grav.h, 'psi', 'GEOMETRY')],
    result: [['Required flow', F.grav.req, 'gph'], ['Loss at the required flow', F.grav.loss, 'psi'], ['Available flow', F.grav.q, 'gph']] }), 'LEZ-28-100');
  const pMax = Math.max(FD.pEngMax, FD.pump.pMax);
  tag(mk('strake', 'fuel-press', 'Carburettor inlet pressure with both pumps running', lc, 'carb inlet', 'pressure limit', FD.pMaxCarb / pMax - 1, {
    formula: 'the diaphragm pump\'s outlet is set by its spring: p_carb ≤ max(p_engine pump, p_boost dead-head);  MS = p_limit / p_carb − 1 (23.955(c))',
    inputs: [IN_('Engine pump outlet maximum', FD.pEngMax, 'psi', `BOUND: typed; MS stays ≥ 0 up to ${FD.pMaxCarb} psi`), IN_('Boost pump maximum (Facet 40106)', FD.pump.pMax, 'psi', 'Facet 40106 ratings 4.0–7.0 psi (Aircraft Spruce, accessed 2026-11-19)'), IN_('Carb inlet limit', FD.pMaxCarb, 'psi', 'BOUND: typed; G to confirm')], result: [['p_carb max', pMax, 'psi']] }), 'LEZ-28-100');
  tag(mk('strake', 'fuel-qty', `Usable fuel per tank on the released cavity vs the placard (${q.placard} US gal)`, lc, `outlet through R1 at FS ${q.fs.toFixed(1)}`, 'quantity', q.usable / q.placard - 1, {
    formula: 'usable = V_cavity × (1 − 2 % expansion) − unusable_worst;  unusable = fuel below the outlet sill over the attitude sweep (FAR 23.959)',
    inputs: [IN_('Cavity volume (LEZ-57-180)', q.V, 'US gal', 'MODEL: strakeVolumes'), IN_('Expansion space', FD.expansion, '', 'FAR23: 23.969 (typed from memory)'), IN_('Attitudes', PITCH.join(', '), 'deg', 'DESIGN: descent, level, cruise, climb at V_y'), IN_('Cell grid', `${tankCells(TANK_GAL).pts.length} cells`, 'text', 'GEOMETRY')],
    result: [['Unusable at each attitude', q.u.map((x) => x.toFixed(2)).join(' / '), 'text'], ['Unusable (worst)', q.un, 'US gal'], ['Usable', q.usable, 'US gal']] }), 'LEZ-28-110');
  const v = ventState();
  tag(mk('strake', 'fuel-vent', 'Tank vent: line drop at the maximum inflow; pick-up in air at 98 % full', lc, 'vent line and pick-up', v.ms === FD.ventAllow / v.drop - 1 ? 'pressure drop' : 'ullage', v.ms, {
    formula: 'Q_air = V_tank·(ρg·ROD)/p + 1.25 Q_fuel;  Δp = (fL/D + ΣK)ρV²/2 ≤ Δp_allow;  pick-up height over the 98 %-full surface ≥ −0.5 in at level and cruise',
    inputs: [IN_('Maximum rate of descent', FD.rodFpm, 'ft/min', 'DESIGN'), IN_('Allowed drop', FD.ventAllow, 'psi', 'DESIGN (under the tank-press test pressure)'), IN_('Vent bore', TUBE.vent.od - 2 * TUBE.vent.w, 'in', 'DESIGN')],
    result: [['Air inflow', v.inflow, 'ft³/s'], ['Δp', v.drop, 'psi'], ['Pick-up over the 98 % surface at −3 / 0 / +3 / +10°', v.m.map((x) => x.toFixed(2)).join(' / '), 'text']] }), 'LEZ-28-160');
  const dr = drainState();
  tag(mk('fuselage', 'fuel-drain', 'Drains at the low points, normal ground attitude', lc, dr.w[0], 'continuous fall', dr.ms, {
    formula: 'each item ≥ 0 in (well bottom ≥ 1 in under the sill; lines fall toward their drain; gascolator bowl ≥ 1 in below the union and the hose)', inputs: [IN_('Ground attitude', 0, 'deg', 'GEOMETRY: static ground plane')],
    result: dr.items.map(([n, x]) => [n, x, 'in']).concat([['Transducer (H) below the union: water trap to drain at the transducer', dr.fftTrap, 'in']]) }), 'LEZ-28-180');
  const sp = supportState(), ws = sp[0];
  tag(mk('fuselage', 'fuel-support', 'Line support spacing, every block F run', lc, ws.run, 'support span', ws.rule / ws.span - 1, {
    formula: 'MS = allowed span / longest unsupported span − 1 (fittings and clamps support)', inputs: [IN_('Al tube 3/16 / 1/4 / 3/8 in', '9 / 12 / 16', 'in', 'AC 43.13-1B ch. 9 (practice)'), IN_('Hose', 18, 'in', 'DESIGN')],
    result: [['Runs', sp.length, ''], ['Longest span', ws.span, 'in'], ['Allowed', ws.rule, 'in']] }), 'LEZ-28-150');
  const sep = sepCache(), rel = sep.filter((r) => r.released), w = rel[0], open = sep.filter((r) => !r.released && r.m < 0);
  tag(mk('fuselage', 'fuel-sep', 'Separation from exhaust, ignition, power, signal, mount tubes, controls and released parts', lc, w ? `${w.mine} ↔ ${w.other}` : '—', 'clearance', w ? w.m / w.need : 1, {
    formula: 'clearance − rule ≥ 0: exhaust 6, ignition and power 2, RF / signal 1, mount tubes 0.5 at hoses (0.25 + engine motion), anything else 0.25 in;  MS = (clearance − rule) / rule over released partners',
    inputs: [IN_('Rules', 'exhaust 6 · ign 2 · power 2 · rf 1 · signal 1 · tube 0.5 / 0.25 · other 0.25', 'text', 'DESIGN (SEP + FM-13)'), IN_('Released blocks', [...RELEASED].join(', '), 'text', 'MODEL')],
    result: [['Worst released', w ? `${w.mine} ↔ ${w.other}: ${w.d.toFixed(2)} in (rule ${w.need})` : 'none', 'text'], ['Open items (unreleased blocks)', open.length ? open.map((r) => `${r.other} (${r.block}) ${r.d.toFixed(2)}/${r.need}`).join('; ') : 'none', 'text']] }), 'LEZ-28-120');
  const sl = selState();
  tag(mk('fuselage', 'fuel-sel', 'Selector remote drive: pilot twist, drive rating, wind-up at the detent, joint angle', lc, 'LEZ-28-135 drive train', sl.terms[0][0], sl.ms, {
    formula: 'T_ult = 1.5 × T_pilot;  τ = T_ult·r_o / J (tube);  T_ult ≤ drive and joint rating;  θ = T_detent·L/(G·J) ≤ allowed wind-up;  joint angle ≤ its working limit;  MS = min − 1',
    inputs: [IN_('Pilot twist on a knob', SEL.Tpilot, 'in·lb', '14 CFR 25.405 table, twist row, as the yardstick for 23.405 (23.405 gives no number; eCFR via Cornell LII, accessed 2026-11-19)'), IN_('Factor of safety', SEL.FS, '', 'FAR23: 23.303'),
      IN_('6061-T6 shear ultimate', SEL.Fsu, 'psi', `BOUND: MIL-HDBK-5 typical, typed; MS stays ≥ 0 down to ${sl.tau.toFixed(0)} psi`), IN_('Drive / joint rating (ultimate)', SEL.rating, 'in·lb', `BOUND: vendor class, typed; MS stays ≥ 0 down to ${sl.Tu.toFixed(0)} in·lb`),
      IN_('Valve detent torque', SEL.Tdet, 'in·lb', 'BOUND: typed (SCD to state)'), IN_('Shear modulus 6061', SEL.G, 'psi', 'BOUND: typed'), IN_('Allowed wind-up', SEL.twistAllow, 'deg', 'DESIGN: one third of the 45° half-step between detents'),
      IN_('Joint working angle limit', SEL.ujMax, 'deg', 'DESIGN (SCD)'), IN_('Tube', `${DRIVE.tube.od} × ${DRIVE.tube.w}`, 'in', 'DESIGN'), IN_('Drive length', sl.L, 'in', 'GEOMETRY')],
    result: [['T ult', sl.Tu, 'in·lb'], ['τ', sl.tau, 'psi'], ['Wind-up', sl.theta, 'deg'], ['Joint angle', sl.ang, 'deg']] }), 'LEZ-28-135');
  const h = hoseState(sep);
  tag(mk('fuselage', 'fuel-hose', 'Gascolator to engine pump hose: slack for the engine motion, bend radius, mount clearance', lc, 'LEZ-73-110 run 1', 'slack / bend / clearance', h.ms, {
    formula: 'slack = L − chord ≥ 2 × 0.25 in;  R_min ≥ hose minimum;  clearance to the mount tubes ≥ 0.5 in;  MS = min(ratios) − 1',
    inputs: [IN_('Engine motion at the accessory end', 0.25, 'in', 'BOUND: G (typed)'), IN_('-6 PTFE fire-sleeved hose minimum bend radius', HOSE6.bendMin, 'in', `BOUND: typed; MS stays ≥ 0 up to ${h.R.toFixed(2)} in`)],
    result: [['Chord / length', `${h.c.toFixed(2)} / ${h.Lh.toFixed(2)}`, 'text'], ['Slack', h.slack, 'in'], ['Smallest radius', h.R, 'in'], ['To the mount tubes', h.clr, 'in']] }), 'LEZ-73-110');
  return out;
});
void R1; void BAYS; void unusableAt; void PORT; void FPRIMS;

// ------------------------------------------------------------------------------------------- integral strake tanks (rev 2026-11-19)
// The strakes are integral tanks: 14 CFR Part 23 before Amendment 23-64, CFR 2010 title 14 vol. 1 (govinfo, accessed 2026-11-19):
// 23.965(a)(2) pressure at the maximum limit acceleration with a full tank (replaces the 2 psi test, which is 23.965(a)(3) for
// supported nonmetallic tanks); 23.965(c) the (b)(1)–(4) vibration test; 23.963(c) interior inspection and repair; 23.967(b)
// adjacent compartments ventilated and drained.
export const CFR = 'CFR 2010 title 14 vol. 1 (pre-Amdt 23-64), govinfo (accessed 2026-11-19)';
export const TANK_LOAD = { dragFrac: 0.25, reachMax: 24, hole: 4.0, cover: 5.5, land: 0.25, screws: 8 };
// dragFrac: level-landing drag reaction 0.25 × vertical (23.479(a)(2), typed from memory: BOUND); reachMax: arm reach from an access
// opening to every point of the bay (BOUND, DESIGN); hole: clear opening Ø (admits a hand and a borescope; DESIGN); cover Ø over the land
const RHO_IN = () => FD.rhoCrit / 231;   // lb/in³
/** full-tank pressure field for one acceleration case: effective gravity g = [gFS, gWL] in g (fuel pushed along g); the free
 *  surface at the tank point furthest up-field (the filler cap top counts: tank full to the cap) */
export function tankPressure() {
  const C = tankCells(TANK_GAL), d = GRID_D / 2, f = FL.filler, top = [f.bl, f.fs, f.zTop], D = DEFAULT_DESIGN;
  const cases = [{ id: 'flight +n1', g: [0, -D.n1], src: `limit manoeuvring load factor n1 = ${D.n1} (design)` }, { id: 'flight n2', g: [0, -D.n2], src: `negative limit load factor n2 = ${D.n2} (design)` },
    { id: 'landing', g: [-TANK_LOAD.dragFrac * D.nLand, -D.nLand], src: `limit landing load factor ${D.nLand} (design) with the drag reaction ${TANK_LOAD.dragFrac} × vertical (23.479(a)(2), BOUND: typed)` }];
  const out = cases.map((c) => { const pot = (q) => c.g[0] * q[1] + c.g[1] * q[2];   // fuel pressure head grows along g: p = ρ (pot(q) − min pot)
    let lo = Infinity, hi = -Infinity, at = null, sfc = null; const cand = [top, ...C.pts.flatMap((q) => [[q[0], q[1] - d, q[2] - d], [q[0], q[1] + d, q[2] + d], [q[0], q[1] - d, q[2] + d], [q[0], q[1] + d, q[2] - d]])];
    for (const q of cand) { const v = pot(q); if (v < lo) { lo = v; sfc = q; } if (v > hi) { hi = v; at = q; } }
    return { ...c, p: RHO_IN() * (hi - lo), at, sfc, head: (hi - lo) / Math.hypot(...c.g) }; });
  const bays = BAYS.map(([a, b], k) => { const pts = C.pts.filter((q) => q[0] >= a && q[0] <= b), zs = pts.map((q) => q[2]), xs = pts.map((q) => q[1]);
    return { k: k + 1, bl: [a, b], fs: [amin(xs) - d, amax(xs) + d], wl: [amin(zs) - d, amax(zs) + d] }; });
  const w = out.reduce((a, q) => (q.p > a.p ? q : a));
  return { cases: out, w, bays, zTop: top[2], test: Math.ceil(w.p * 1.1 * 20) / 20 };   // test at p_max + the 10 % reserve, up to 0.05 psi
}
// the governing field for the structures' tank checks (wp21_strake wp21-tank: strake-tank-comb, strake-rib-p, cs-tank-wall); memoized
{ let memo = null; FIXED.tankField = () => (memo ||= tankPressure()); }
/** 23.963(c): access openings in the lower skin of each bay, the fewest per bay that bring every cell within reach */
export function tankAccess() {
  const C = tankCells(TANK_GAL), T = TANK_LOAD;
  return BAYS.map(([a, b], k) => { const pts = C.pts.filter((q) => q[0] >= a && q[0] <= b), bl = (a + b) / 2, xs = pts.map((q) => q[1]), x0 = amin(xs), x1 = amax(xs);
    for (let n = 1; n <= 6; n++) { const ports = Array.from({ length: n }, (_, i) => { const fs = x0 + (x1 - x0) * (i + 0.5) / n; return [bl, fs, omlLow(bl, fs)]; });
      const reach = amax(pts.map((q) => Math.min(...ports.map((o) => Math.hypot(q[0] - o[0], q[1] - o[1], q[2] - o[2])))));
      if (reach <= T.reachMax || n === 6) return { k: k + 1, ports, reach, fit: (b - a) - T.cover - 2 * T.land, n }; } });
}
/** 23.967(b): the compartments next to each strake tank and their drains / vents (holes in A's skins: ICD F, docs/icd/f_fuel.md) */
export function tankAdjacent() {
  const xs = tankCells(TANK_GAL).pts.map((q) => q[1]), x0 = amin(xs), x1 = amax(xs), low = (bl, f0, f1) => { let m = [Infinity, 0]; for (let fs = f0; fs <= f1; fs += 0.5) { const z = omlLow(bl, fs); if (z < m[0]) m = [z, fs]; } return m; };
  const wedgeBL = (R1.inb + hwAt((x0 + x1) / 2, 36.0, 0)) / 2, belly = (f0, f1) => { let m = [Infinity, 0]; for (let fs = f0; fs <= f1; fs += 0.5) { const z = bellyAt(0, fs, 0); if (z < m[0]) m = [z, fs]; } return m; };
  // the cavity fills the strake section (OML less the skin) forward to the leading edge and aft to the CS spar, and the wing outboard
  // of the end rib is foam-cored: the compartments next to the tanks are the wedge inboard of R1 and the fuselage bay aft of the
  // rear-seat bulkhead (valve, pump, lines; the cabin forward of it is the personnel compartment of 23.967(d))
  const C = [{ id: 'wedge', what: 'R1 to the fuselage side, each side', bl: wedgeBL, f: [x0, x1] }, { id: 'fuselage bay', what: 'aft fuselage bay FS 130.2–148.6 (valve, pump, fuel lines)', bl: 0, f: [105.0, 123.0] }];
  return C.map((c) => { if (c.id === 'fuselage bay') { const [z, fs] = belly(c.f[0], c.f[1]); return { ...c, drain: [0, fs, z], vent: [0, c.f[0], NaN], ventBy: 'open to the ventilated cabin over the rear-seat bulkhead (BOUND: the cabin ventilation, block B)', ok: Number.isFinite(z) }; }
    const [z, fs] = low(c.bl, c.f[0], c.f[1]), hiFs = c.f[0] + 1.0, zt = omlTop(c.bl, hiFs);
    return { ...c, drain: [c.bl, fs, z], vent: [c.bl, hiFs, zt], ventBy: 'Ø 0.25 hole in the upper skin at the forward end', ok: Number.isFinite(z) && Number.isFinite(zt) && zt > z }; });
}
registerChecks('wpF1-tank', (d, lc) => {
  if (lc.id !== 'W1-S1') return [];
  const out = [], tag = (r, pn) => { r.sys = pn; out.push(r); }, P = tankPressure(), A = tankAccess(), J = tankAdjacent();
  tag(mk('strake', 'tank-press', 'Integral strake tank: pressure at the maximum limit acceleration, full tank (23.965(a)(2)); test pressure', lc, `${P.w.id}: at FS ${P.w.at[1].toFixed(1)}, WL ${P.w.at[2].toFixed(1)}`, 'test vs required', P.test / P.w.p - 1, {
    formula: 'p(q) = ρ_crit · g_eff · (q − q_top) along g_eff, tank full to the cap;  p_max over the cases;  test pressure = p_max rounded up to 0.1 psi;  MS = p_test / p_max − 1. The distributed field goes to the structures agent (skins, ribs, CS-spar walls) with the simultaneous critical limit loads (ICD F, docs/icd/f_fuel.md)',
    inputs: [IN_('Fuel density (critical)', FD.rhoCrit, 'lb/US gal', 'CRC 2025 avgas survey maximum, 728.2 kg/m³ at 15 °C (accessed 2026-11-19)'), ...P.cases.map((c) => IN_(`${c.id}: g_eff (FS, WL)`, `${c.g.map((v) => v.toFixed(2)).join(', ')} g → ${c.p.toFixed(3)} psi`, 'text', c.src)),
      IN_('Rule', '23.965(a)(2)', 'text', `FAR23: ${CFR}`), IN_('Tank geometry', `${tankCells(TANK_GAL).pts.length} cells, cap top WL ${P.zTop.toFixed(2)}`, 'text', 'GEOMETRY: released cavity (LEZ-57-180)')],
    result: [...P.cases.map((c) => [`p_max ${c.id}`, c.p, 'psi']), ['Test pressure', P.test, 'psi']] }), 'LEZ-28-100');
  const wa = A.reduce((a, q) => (q.reach / TANK_LOAD.reachMax > a.reach / TANK_LOAD.reachMax ? q : a)), fit = Math.min(...A.map((q) => q.fit));
  tag(mk('strake', 'tank-access', 'Integral tank interior inspection and repair: access openings in each bay (23.963(c))', lc, `bay ${wa.k}`, 'reach / cover fit', Math.min(TANK_LOAD.reachMax / wa.reach - 1, fit / TANK_LOAD.cover), {
    formula: 'per bay: n openings Ø hole in the lower skin, equally spaced along the bay; reach = max over the bay of the distance to the nearest opening;  MS = min(reach_max / reach − 1, (bay width − cover − 2 land) / cover)',
    inputs: [IN_('Rule', '23.963(c)', 'text', `FAR23: ${CFR}`), IN_('Clear opening / cover Ø', `${TANK_LOAD.hole} / ${TANK_LOAD.cover}`, 'in', 'DESIGN'), IN_('Reach allowed', TANK_LOAD.reachMax, 'in', 'BOUND: arm reach, not from a source'),
      ...A.map((q) => IN_(`Bay ${q.k}: openings`, q.ports.map((o) => `FS ${o[1].toFixed(1)}`).join(', '), 'text', 'DESIGN'))],
    result: A.map((q) => [`Bay ${q.k} reach`, q.reach, 'in']) }), 'LEZ-28-100');
  tag(mk('strake', 'tank-adj', 'Compartments adjacent to the integral tanks ventilated and drained (23.967(b))', lc, J.map((c) => c.id).join(', '), 'drain at the low point, vent above it', J.every((c) => c.ok) ? 1 : -1, {
    formula: 'each adjacent compartment: a Ø 0.25 drain at its lowest point in the lower skin (level ground) and a Ø 0.25 vent at its high forward point;  MS = 1 if every compartment has both, −1 otherwise',
    inputs: [IN_('Rule', '23.967(b)', 'text', `FAR23: ${CFR}`), ...J.map((c) => IN_(`${c.id} (${c.what})`, `drain Ø 0.25 at FS ${c.drain[1].toFixed(1)}, WL ${c.drain[2].toFixed(2)}; vent: ${c.ventBy}`, 'text', 'GEOMETRY / DESIGN'))],
    result: J.map((c) => [c.id, c.ok ? 'drained and vented' : 'missing', 'text']) }), 'LEZ-28-100');
  return out;
});
defineReqs([
  { id: 'R-FUEL-T1', ref: '23.965(a)(2) (pre-Amdt 64)', title: 'Integral strake tanks withstand the pressure at the maximum limit acceleration with a full tank, with the critical limit loads (test at tank-press value; structure by the structures agent)', checks: /^tank-press$/, method: 'analysis + test', closed: false },
  { id: 'R-FUEL-T2', ref: '23.965(c), (b)(1)–(4) (pre-Amdt 64)', title: 'Vibration test: tank and support mounted as installed, 25 h at ≥ 1/32 in total displacement, 2/3 full of water, at 0.9 × max continuous propeller rpm (2,520 cpm) unless a critical frequency governs (then the same number of cycles)', method: 'test', closed: false, verify: () => ({ ok: true, detail: `${0.9 * O235.rpm} cpm × 25 h = ${(0.9 * O235.rpm * 60 * 25 / 1e6).toFixed(2)} M cycles; process step on LEZ-28-100` }) },
  { id: 'R-FUEL-T3', ref: '23.963(c) (pre-Amdt 64)', title: 'Integral tanks: interior inspection and repair through lower-skin access covers', checks: /^tank-access$/, method: 'analysis', closed: true },
  { id: 'R-FUEL-T4', ref: '23.967(b) (pre-Amdt 64)', title: 'Compartments adjacent to the integral tanks ventilated and drained', checks: /^tank-adj$/, method: 'analysis', closed: true },
]);
