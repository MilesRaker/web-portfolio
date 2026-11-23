// WPG1 — block G engine group: the O-235-C2C as a bought-in envelope (LEZ-71-210), the conical isolators (LEZ-71-221),
// the isolator cups, pick-up bushings and gussets welded on the released mount (LEZ-71-224) and the powerplant
// installation (LEZ-71-200). Geometry in the definition frame (inches: x = BL, y = FS aft, z = WL up) from the model's
// engine layout (wp1 ENG, MOUNT) so every part lands on the same nodes as the released mount weldment LEZ-71-220.
//  • The isolator stack is centred on each mount node: the cup (on the mount) opens aft round the engine's lug boss,
//    rubber pads ahead of, round and behind the boss, a steel spacer sleeve and an aft snubbing washer, one AN7 through
//    all of it. The lug boss is the engine's (envelope dimensions typed from public descriptions, marked).
//  • Checks: pad loads from the rigid-engine distribution (the same one the mount truss solve uses) for every
//    engine-mount combination: the isolator's fail-safe bolt, the rubber's bearing stress (bounded), the cup base and
//    wall, the pick-up bushings in bearing; the engine's envelope inside the cowl; the engine interfaces (wp1's check
//    re-registered with a design tolerance in place of the assumed one).
// Notional; public data only.
import { GEO, CS_FIT, registerChecks, mk, DEFAULT_DESIGN, effective, loadCases } from '../structures.js';
import { insideFus, partByPN } from '../systems.js';
import { ENG, MOUNT, cylS, MAG, mountCombos, engineInterfaces } from './wp1_powerplant.js';
import { O235, LUGS } from './engine_o235.js';
import { BRK, pickupReactions } from './wp6_engine_install.js';
import { UPK } from './wp23_upk.js';

export const r4 = (x) => Math.round(x * 1e4) / 1e4;
export const P3 = (q) => [r4(q[1] * 12), r4(q[0] * 12), r4(q[2] * 12)];   // model [s, y, z] ft → definition [BL, FS, WL] in
const F_ = ENG.flange, A_ = ENG.accFace, C_ = ENG.crankZ, N = MOUNT.nodes;
const TGT = 0.15;
export const ST = { Ftu: 95000, Fty: 75000, Fsu: 57000, Fbru: 175000, weldFtu: 80000, rho: 0.283, spec: 'MIL-HDBK-5: 4130 N (AMS 6350 sheet / MIL-T-6736 tube); 80 ksi at fusion welds not heat-treated after welding' };
export const AN_S = { 6: 8280, 7: 11250 }, AN_T = { 6: 9450, 7: 12900 };   // single-shear / tension ultimate, lb (alloy-steel AN bolts, AN standard; AN7 tension typed from the AN table)
export const RHO = { steel: 0.283, rubber: 0.040, al: 0.098, cast: 0.098, ss: 0.289 };

// ------------------------------------------------------------------------------------------- isolator stack (in)
/** u = axial position from the node (+ aft, toward the engine); radii in inches */
/** rev C (2026-11-19, source audit): the isolators are the bought cone bushings, two per lug (eight per engine): Aircraft
 *  Spruce 71032 (O-235/O-320/O-360, 8 req.; urethane 08-07392: OD 1.625 tapering to 1.00, height 0.92, ID 0.500), one from each
 *  side into a Ø 1.00 lug hole, on a 1/2 × .058 4130 spacer (ID 0.384) and an AN6 through-bolt. Drawn installed: each cone's
 *  Ø 1.625 shoulder 0.25 in thick outside the lug face, its Ø 1.00 nose 0.45 in into the bore (compressed from the 0.92 free
 *  height: BOUND, measure on receipt with the part numbers checked against the engine's parts catalogue) */
export const STACK = {
  cupR: 1.25, cupW: 0.095, cupBase: [-0.85, -0.70], cupWall: [-0.70, 0.55],              // 2.50 × .095 4130 N tube cup with a 0.15 in base disc
  lugR: 0.875, lugBore: 0.50, lug: [-0.45, 0.45],                                          // engine lug boss Ø 1.75 × 0.90, hole Ø 1.00 for the cones (ACS 71032 listing; envelope)
  padR: 0.8125, padRi: 0.25, fwd: [-0.70, -0.45], aft: [0.45, 0.80], radRi: 0.25, radR: 0.50,   // cone shoulders (Ø 1.625) and noses (Ø 1.00) in the bore, ID 0.50
  tubeRo: 0.25, tubeRi: 0.192, tube: [-0.70, 0.80],                                         // steel spacer 1/2 × .058 (ID 0.384)
  washR: 1.0, washer: [0.80, 0.90], an: 6,
};
STACK.grip = STACK.washer[1] - STACK.cupBase[0];
/** one isolator set (LEZ-71-221) in its own frame: x lateral, y = u (aft), z up; centred on the node */
export function isoPrims() {
  const S = STACK, c = (u0, u1, r, ri, feat, group) => ({ t: 'cyl', feat, group, a: [0, u0, 0], b: [0, u1, 0], r, ri });
  return [c(...S.fwd, S.padR, S.padRi, 'fwd', 'rubber'), c(...S.lug, S.radR, S.radRi, 'radial', 'rubber'), c(...S.aft, S.padR, S.padRi, 'aft', 'rubber'),
    c(...S.tube, S.tubeRo, S.tubeRi, 'sleeve', 'steel'), c(...S.washer, S.washR, 0.22, 'washer', 'steel')];
}

// ------------------------------------------------------------------------------------------- engine envelope (LEZ-71-210)
const box = (feat, c, d, extra = {}) => ({ t: 'box', feat, group: 'env', c: P3(c), d: [d[1], d[0], d[2]].map((v) => r4(v * 12)), ...extra });   // d given as [ds, dy, dz] ft
const cyl = (feat, a, b, r, extra = {}) => ({ t: 'cyl', feat, group: 'env', a: P3(a), b: P3(b), r: r4(r * 12), ...extra });
/** SAE AS127 type 1 flange as drawn here (typed from memory: verify against the engine's installation drawing) */
/** crank flange, SAE No. 1: 4.375 in bolt circle, six 3/8 in (AN6) bolts (src: Univair, McCauley SCM7153 for the O-235-C2C, hub
 *  data; Aircraft Spruce 10351 SAE 1 front plate '4-3/8'; accessed 2026-11-19; was 4.75 / 7/16 typed). Hole 0.390 (25/64) and
 *  OD / thickness BOUND: not found, verify on the engine */
export const FLANGE = { od: 6.25, bc: 4.375, n: 6, hole: 0.390, t: 0.62, bushOD: 0.625, an: 6 };
export function enginePrims() {
  const o = [];
  o.push(box('case', [(A_ + 0.28 + F_ - 0.22) / 2, 0, C_], [F_ - 0.22 - (A_ + 0.28), 0.90, 0.88]));
  o.push(box('acc', [A_ + 0.14, 0, C_], [0.28, 0.80, 0.80]));
  o.push(cyl('nose', [F_ - 0.22, 0, C_], [F_ - FLANGE.t / 12, 0, C_], 0.27));
  const hp = Array.from({ length: FLANGE.n }, (_, k) => { const a = (k + 0.5) * 2 * Math.PI / FLANGE.n; return { p: P3([F_ - FLANGE.t / 12, (FLANGE.bc / 24) * Math.cos(a), C_ + (FLANGE.bc / 24) * Math.sin(a)]), r: r4(FLANGE.hole / 2) }; });
  o.push(cyl('flange', [F_ - FLANGE.t / 12, 0, C_], [F_, 0, C_], FLANGE.od / 24, { holes: hp }));
  for (const [k, s] of Object.entries(cylS)) { const sg = k[0] === 'L' ? -1 : 1;
    o.push(cyl('cyl', [s, sg * 0.45, C_], [s, sg * 0.88, C_], 0.29));
    o.push(box('cyl', [s, sg * 1.04, C_], [0.50, 0.32, 0.56]));
    o.push(box('cyl', [s, sg * 1.2763, C_ + 0.02], [0.36, 0.1125, 0.30])); }
  o.push(box('sump', [A_ + 0.94, 0, C_ - 0.55], [1.12, 0.64, 0.24]));
  o.push(box('carb', [A_ + 0.27, 0, 2.18], [0.30, 0.30, 0.26]));
  for (const sg of [-1, 1]) { const m = MAG(sg); o.push(cyl('mag', [A_, m.a[1], m.a[2]], [A_ - 0.30, m.a[1], m.a[2]], 0.13)); }
  o.push(cyl('filter', [A_, 0, C_ + 0.05], [A_ - 0.28, 0, C_ + 0.05], 0.08));
  o.push(cyl('starter', [F_ - 0.20, -0.42, C_ - 0.42], [F_ - 0.80, -0.42, C_ - 0.42], 0.15));
  o.push(cyl('alt', [F_ - 0.24, 0.42, C_ - 0.42], [F_ - 0.74, 0.42, C_ - 0.42], 0.17));
  for (const L of LUGS(A_, C_)) { const S = STACK; o.push(cyl('lugs', [L.at[0] + S.lug[0] / 12, L.at[1], L.at[2]], [L.at[0] + S.lug[1] / 12, L.at[1], L.at[2]], S.lugR / 12, { ri: r4(S.lugBore) })); }
  for (const f of ENGINE_FEATURES) f(o);   // LEZ-71-210 rev B (block H): envelope corrections and added features
  return o;
}
/** crankcase bolts that carry the engine-side clamp brackets (block I's LEZ-24-100 lines, final integration): the
 *  parting-flange bolts on the case's top centre line and the two front bolts at the nose section's upper corners, on the
 *  approximate envelope (definition frame [BL, FS, WL], in). POSITIONS TYPED FROM MEMORY on the approximate O-235 case
 *  (BOUND): verify against the Lycoming installation drawing before the brackets are made; a bracket ≤ 2.0 in long reaches
 *  ±1 in of station either way. */
export const CASE_BOLTS = (() => { const top = r4((C_ + 0.44) * 12), fwd = r4((F_ - 0.22) * 12);
  return [...[139.5, 145.0, 150.5, 156.0].map((fs) => ({ id: `T${fs}`, at: [0, fs, top], what: 'top parting-flange bolt (5/16 in, typed)' })),
    ...[-1, 1].map((sg) => ({ id: sg < 0 ? 'NL' : 'NR', at: [sg * 4.80, r4(fwd - 0.50), r4(top - 0.44)], what: 'front case bolt, nose-section upper corner (typed)' }))]; })();
/** hook: functions that revise / add envelope features, registered by the owner of LEZ-71-210 rev B (block H, parts/wpH1_layout.js) */
export const ENGINE_FEATURES = [];
/** the carburettor hangs in the scoop blister (LEZ-71-250): it is fitted to the air box, not to the cowl */
const FIT_EXCLUDE = ['carb'];
/** points on a primitive's surface (in, definition frame) */
function samplePts(p, nt = 2) {
  const out = [];
  if (p.t === 'box') { for (const i of [-1, 0, 1]) for (const j of [-1, 0, 1]) for (const k of [-1, 0, 1]) if (i || j || k) out.push([p.c[0] + i * p.d[0] / 2, p.c[1] + j * p.d[1] / 2, p.c[2] + k * p.d[2] / 2]); }
  else { const ax = [0, 1, 2].map((i) => p.b[i] - p.a[i]), L = Math.hypot(...ax), e = ax.map((v) => v / L), u = Math.abs(e[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
    const d0 = u[0] * e[0] + u[1] * e[1] + u[2] * e[2], n1 = u.map((v, i) => v - d0 * e[i]), l1 = Math.hypot(...n1), m1 = n1.map((v) => v / l1), m2 = [e[1] * m1[2] - e[2] * m1[1], e[2] * m1[0] - e[0] * m1[2], e[0] * m1[1] - e[1] * m1[0]];
    for (let it = 0; it <= nt; it++) for (let k = 0; k < 16; k++) { const a = k * Math.PI / 8; const t = it / nt; out.push([0, 1, 2].map((i) => p.a[i] + ax[i] * t + p.r * (m1[i] * Math.cos(a) + m2[i] * Math.sin(a)))); } }
  return out;
}
/** clearance (in) from a point inside the cowl to the cowl's inner skin: the largest inset that still contains it */
function cowlClear(q) {
  const s = q[1] / 12, y = q[0] / 12, z = q[2] / 12; if (!insideFus(s, y, z, 0)) return -1;
  let lo = 0, hi = 1.0; for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; if (insideFus(s, y, z, m)) lo = m; else hi = m; } return lo * 12;
}
export const COWL_T = 4 * 0.010;   // 4 BID solid laminate (FIXED.cowl.BID × BID cured ply): the skin's inner face is this far inside the OML
export function engineFit() {
  let w = null; const rows = [];
  for (const p of enginePrims()) { if (FIT_EXCLUDE.includes(p.feat)) continue; for (const q of samplePts(p)) { if (q[1] < GEO.firewall * 12 + 1) continue; const c = cowlClear(q) - COWL_T; if (!w || c < w.c) w = { c, q, feat: p.feat }; } }
  rows.push(w); return w;
}
export const FIT_REQ = 0.5;
/** LEZ-71-223 rev B: leg B stands aft at the OUTBOARD (free) edge, clear of the magnetos (ICD G-F1), and starts this far
 *  below the pick-up hole's lower edge (in) instead of at the bottom end, so its corner stays inside the cowl's bottom corner */
export const LEGB_TRIM = 0.08;
/** the lower brackets' legs as boxes in the definition frame (in), both sides */
export function bracketBoxes() {
  const B = BRK, t = B.sec.t, b = B.sec.b, zL = CS_FIT.L * 12, FW = GEO.firewall * 12, zB0 = -B.h - (B.dP / 2 + LEGB_TRIM), out = [];
  for (const n of ['FBL', 'FBR']) { const y = N[n][1] * 12, o = Math.sign(y), e = y + o * B.xBolt;   // e: leg A's outboard (free) edge
    out.push({ feat: 'legA', lo: [Math.min(e, e - o * b), FW, zL + B.zBot], hi: [Math.max(e, e - o * b), FW + t, zL + B.zTop] });
    out.push({ feat: 'legB', lo: [Math.min(e, e - o * t), FW + t, zL + zB0], hi: [Math.max(e, e - o * t), FW + b, zL + B.zTop] }); }
  return out;
}
const boxDist = (q, bx) => Math.hypot(...[0, 1, 2].map((i) => Math.max(bx.lo[i] - q[i], q[i] - bx.hi[i], 0)));
/** clearance (in) from the engine envelope (sampled surface points) to the lower brackets */
export function bracketToEngine() {
  let w = { d: Infinity }; const bx = bracketBoxes();
  for (const p of enginePrims()) for (const q of samplePts(p, 8)) for (const b of bx) { const d = boxDist(q, b); if (d < w.d) w = { d, feat: p.feat, leg: b.feat, q }; }
  return w;
}   // in: the cowl plug clears the engine by ≥ 1/2 in everywhere (the cowl book's step 1; engine rocking on its mounts)

// ------------------------------------------------------------------------------------------- pad loads
const sub = (a, b) => a.map((v, i) => v - b[i]), add = (a, b) => a.map((v, i) => v + b[i]), mul = (a, k) => a.map((v) => v * k), dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const crs = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
function solve3(A, b) { const M = A.map((r, i) => [...r, b[i]]); for (let k = 0; k < 3; k++) { let p = k; for (let i = k + 1; i < 3; i++) if (Math.abs(M[i][k]) > Math.abs(M[p][k])) p = i; [M[k], M[p]] = [M[p], M[k]]; for (let i = k + 1; i < 3; i++) { const f = M[i][k] / M[k][k]; for (let j = k; j < 4; j++) M[i][j] -= f * M[k][j]; } } const x = [0, 0, 0]; for (let i = 2; i >= 0; i--) { let s = M[i][3]; for (let j = i + 1; j < 3; j++) s -= M[i][j] * x[j]; x[i] = s / M[i][i]; } return x; }
/** limit pad forces (lb, model axes [s, y, z]) for a force F and moment Mo at the mass centre: the rigid-engine share wp1's mount solve uses */
export function padForces(F, Mo, cgFt) {
  const ks = Object.keys(N).filter((k) => k[0] === 'E'), pads = ks.map((k) => mul(N[k], 12)), c0 = mul(pads.reduce((a, p) => add(a, p), [0, 0, 0]), 1 / pads.length), cg = mul(cgFt, 12);
  const Mt = add(Mo, crs(sub(cg, c0), F)), J = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (const p of pads) { const r = sub(p, c0), r2 = dot(r, r); for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) J[i][j] += (i === j ? r2 : 0) - r[i] * r[j]; }
  const Om = solve3(J, Mt);
  return Object.fromEntries(ks.map((k, i) => [k, add(mul(F, 1 / pads.length), crs(Om, sub(pads[i], c0)))]));
}
/** worst pad over every combination of a load case: { P (ultimate), ax, rad, n, c, FS } */
export function padCase(d, lc) {
  const mc = mountCombos(d, lc); if (!mc) return null; let w = null;
  for (const c of mc.combos) for (const [n, f] of Object.entries(padForces(c.F, c.M, mc.mm.c))) {
    const ax = Math.abs(f[0]) * mc.FS, rad = Math.hypot(f[1], f[2]) * mc.FS, P = Math.hypot(ax, rad);
    if (!w || P > w.P) w = { P, ax, rad, n, c, FS: mc.FS, emer: mc.emer, W: mc.W };
  }
  return w;
}
// rubber bearing: radial load on the sleeve's projected area, axial load on the fore or aft pad's annulus
const RUB = { allow: 1500 };   // psi: design bearing stress on the isolator rubber at ultimate (bounded below)
export function isoState(w) {
  const S = STACK, Arad = 2 * S.radR * (S.lug[1] - S.lug[0]), Aax = Math.PI * (S.padR ** 2 - S.padRi ** 2) * 0.81;   // rev C: radial on the cones' Ø 1.00 noses in the lug hole, axial on the Ø 1.625 shoulders
  const sRad = w.rad / Arad, sAx = w.ax / Aax, sR = Math.max(sRad, sAx);
  const bolt = AN_S[S.an], msBolt = bolt / w.P - 1;
  return { Arad, Aax, sRad, sAx, sR, msR: RUB.allow / sR - 1, bolt, msBolt, rMax: sR * (1 + 0) };
}
// cup: base disc shear-out round the washer and the bolt head; wall bearing under the radial load; cup-to-tube welds
export const CUP = { gusT: 0.063, gusL: 1.0, gusH: 0.75, weldThroat: 0.7 * 0.063 };
export function cupState(w) {
  const S = STACK, tb = S.cupBase[1] - S.cupBase[0], Lw = S.cupWall[1] - S.cupWall[0];
  const so = Math.PI * 2 * S.washR * tb * ST.Fsu;                    // axial load punching the base disc out round the rubber pad's rim (pad Ø ≈ washer Ø)
  const brg = 2 * S.cupR * Lw * ST.Fbru * 0.5;                        // radial load bearing on the wall's projected area, half the length taking it
  const weldL = 2 * Math.PI * S.cupR * 0.5 + 4 * CUP.gusL;           // half the cup's circumference welded to the ring cluster plus two gussets each side
  const weld = weldL * CUP.weldThroat * ST.weldFtu * 0.6;            // fillet throat in shear at 0.6 F_tu,weld
  return { so, brg, weld, weldL, ms: { base: so / w.ax - 1, wall: brg / w.rad - 1, weld: weld / w.P - 1 } };
}
// pick-up bushings: AN6 bearing on the bushing bore (upper: lateral bushing between the LEZ-71-222 ears; lower: fore-aft on LEZ-71-223)
export const BUSH = { od: 0.875, d: 0.375, upL: UPK.gap - 0.125, loL: 1.0 };
export function bushCase(d, lc) {
  const r = pickupReactions(d, lc); if (!r) return null; let w = null;
  for (const o of r.out) for (const [n, R] of Object.entries(o.R)) { const P = Math.hypot(...R) * r.FS, L = n[1] === 'T' ? BUSH.upL : BUSH.loL, allow = ST.Fbru * BUSH.d * L, ms = allow / P - 1; if (!w || ms < w.ms) w = { ms, P, n, L, allow, c: o.c, FS: r.FS, emer: r.emer }; }
  return w;
}

// ------------------------------------------------------------------------------------------- checks
const IN_ = (n, v, u, s = 'DERIVED') => [n, v, u, s];
registerChecks('wpG1-iso', (d, lc) => {
  const w = padCase(d, lc); if (!w) return [];
  const s = isoState(w), c = cupState(w), base = [['Load combination', w.c.tag, 'text', 'FAR23'], IN_('Mass on the mount', w.W, 'lb', 'DEFINED PARTS'), IN_('Factor of safety', w.FS, '', w.emer ? 'KD' : 'FAR23 × KD'),
    IN_('Pad load: axial / radial (ult.)', `${w.ax.toFixed(0)} / ${w.rad.toFixed(0)}`, 'lb', 'DERIVED: rigid engine on 4 pads (the mount solve\'s distribution)')];
  const rows = [
    Object.assign(mk('fuselage', 'iso-failsafe', 'Engine isolator: fail-safe AN6 through-bolt in shear', lc, `${w.n} pad`, 'bolt single shear', s.msBolt, {
      formula: 'the bolt passes the cup base, the spacer sleeve, the lug bore and the snubbing washer: with the rubber gone the lug bears on the sleeve; P = |pad load| in single shear', inputs: [...base, IN_('AN6 single shear', AN_S[6], 'lb', 'AN standard (the structures topic\'s value)')], result: [['|P| (ult.)', w.P, 'lb']] }), { sys: 'LEZ-71-221' }),
    Object.assign(mk('fuselage', 'iso-rubber', 'Engine isolator: rubber bearing stress', lc, `${w.n} pad`, s.sRad > s.sAx ? 'radial sleeve' : 'axial pad', s.msR, {
      formula: 'σ_rad = R_rad / (D_nose·L_boss) (the cones\' Ø 1.00 noses in the lug hole);  σ_ax = R_ax / (0.81·π·(r_o² − r_i²));  MS = σ_allow / max − 1', inputs: [...base, IN_('Rubber bearing allowable', RUB.allow, 'psi', `BOUND: typed design value for natural-rubber isolators (not a vendor rating); MS stays ≥ 0 down to ${(s.sR).toFixed(0)} psi`), IN_('Radial area / axial area', `${s.Arad.toFixed(2)} / ${s.Aax.toFixed(2)}`, 'in²', 'GEOMETRY')],
      result: [['σ radial', s.sRad, 'psi'], ['σ axial', s.sAx, 'psi']] }), { sys: 'LEZ-71-221' }),
    Object.assign(mk('fuselage', 'cup-base', 'Isolator cup: base disc shear-out under the axial pad load', lc, `${w.n} cup`, 'shear-out', c.ms.base, {
      formula: 'P_ax ≤ π·d_pad·t_base·F_su', inputs: [...base, IN_('Base disc t', STACK.cupBase[1] - STACK.cupBase[0], 'in', 'SIZED'), IN_('4130 N F_su', ST.Fsu, 'psi', ST.spec)], result: [['Allowable', c.so, 'lb']] }), { sys: 'LEZ-71-224' }),
    Object.assign(mk('fuselage', 'cup-wall', 'Isolator cup: wall bearing under the radial pad load', lc, `${w.n} cup`, 'bearing (half length)', c.ms.wall, {
      formula: 'R_rad ≤ D_cup·(L_wall/2)·F_bru', inputs: [...base, IN_('Cup', `${(2 * STACK.cupR).toFixed(2)} × ${STACK.cupW} 4130 N tube, wall ${(STACK.cupWall[1] - STACK.cupWall[0]).toFixed(2)} in long`, 'text', 'SIZED'), IN_('4130 N F_bru', ST.Fbru, 'psi', ST.spec)], result: [['Allowable', c.brg, 'lb']] }), { sys: 'LEZ-71-224' }),
    Object.assign(mk('fuselage', 'cup-weld', 'Isolator cup: welds to the ring cluster and gussets', lc, `${w.n} cup`, 'fillet throat shear', c.ms.weld, {
      formula: 'P ≤ L_weld·0.7·t·0.6·F_tu,weld;  L_weld = ½·π·D_cup + 4 gusset edges', inputs: [...base, IN_('Weld length', c.weldL, 'in', 'GEOMETRY'), IN_('Gusset t', CUP.gusT, 'in', 'SIZED'), IN_('F_tu at fusion welds', ST.weldFtu, 'psi', ST.spec)], result: [['Allowable', c.weld, 'lb']] }), { sys: 'LEZ-71-224' }),
  ];
  const b = bushCase(d, lc);
  if (b) rows.push(Object.assign(mk('fuselage', 'bush-brg', 'Mount pick-up bushings: AN6 bearing on the bushing', lc, `${b.n} bushing`, 'bearing', b.ms, {
    formula: 'P = FS·|R| at the pick-up;  allow = F_bru·D·L_bushing', inputs: [['Load combination', b.c.tag, 'text', 'FAR23'], IN_('Factor of safety', b.FS, '', b.emer ? 'KD' : 'FAR23 × KD'), IN_('Bushing length', b.L, 'in', 'SIZED'), IN_('4130 N F_bru', ST.Fbru, 'psi', ST.spec)], result: [['P (ult.)', b.P, 'lb'], ['Allowable', b.allow, 'lb']] }), { sys: 'LEZ-71-224' }));
  return rows;
});
registerChecks('wpG1-fit', (d, lc) => {
  if (lc.id !== 'W1-S1') return [];
  const w = engineFit();
  return [Object.assign(mk('cowl', 'eng-fit', 'Engine envelope inside the cowl with clearance', lc, `${w.feat}, FS ${w.q[1].toFixed(1)} BL ${w.q[0].toFixed(1)} WL ${w.q[2].toFixed(1)}`, 'clearance to the cowl\'s inner skin', w.c / FIT_REQ - 1, {
    formula: 'c = min over the envelope\'s surface points of (distance inside the cowl OML − laminate thickness);  MS = c / c_req − 1  (carburettor excluded: it hangs in the scoop blister, fitted to the air box)',
    inputs: [IN_('Required clearance', FIT_REQ, 'in', 'DESIGN: cowl plug clears the engine by ≥ 1/2 in (engine rocking on its isolators)'), IN_('Cowl laminate', COWL_T, 'in', 'GEOMETRY: 4 BID'), IN_('Envelope', `${O235.envelope.L} × ${O235.envelope.W} × ${O235.envelope.H} in`, 'text', 'TCDS / public spec (engine_o235.js sources)')],
    result: [['Minimum clearance', w.c, 'in']] }), { sys: 'LEZ-71-210' })];
});
// wp1's engine-interface check with the tolerance as a design value
registerChecks('wp1-iface', (d, lc) => {
  if (lc.id !== 'W1-S1') return [];
  const E = engineInterfaces(), r = mk('fuselage', 'eng-iface', `Engine interfaces land on the ${O235.model}: wiring terminals, sensor bosses, ports and mount lugs`, lc, E.worst.what || 'engine', 'interface position', E.tol / Math.max(E.worst.d, 1e-3) - 1, {
    formula: 'd = distance from each wiring endpoint / port / mount pick-up to the nearest engine primitive (0 on or inside);  MS = 0.6 in / d_max − 1',
    inputs: [['Interfaces checked', E.rows.length, '', 'MODEL'], ['Tolerance', E.tol, 'in', 'DESIGN: half the smallest terminal / boss pitch on the accessory case']],
    result: E.rows.map((q) => [`${q.what} (${q.kind})`, q.d, 'in']) });
  r.sys = 'LEZ-71-210'; return [r];
});

// ------------------------------------------------------------------------------------------- cups, bushings, gussets (LEZ-71-224)
export function cupPrims() {
  const S = STACK, o = [];
  for (const n of ['ETL', 'ETR', 'EBL', 'EBR']) { const q = P3(N[n]), at = (u) => [q[0], r4(q[1] + u), q[2]];
    o.push({ t: 'cyl', feat: 'cup', group: 'steel', a: at(S.cupBase[0]), b: at(S.cupBase[1]), r: S.cupR, holes: [{ p: at(S.cupBase[0]), r: 0.22 }] });
    o.push({ t: 'cyl', feat: 'cup', group: 'steel', a: at(S.cupWall[0]), b: at(S.cupWall[1]), r: S.cupR, ri: r4(S.cupR - S.cupW) });
    // two finger gussets in the ring plane: inboard (toward the opposite cup) and vertical (toward the other cup on the same side)
    const sx = -Math.sign(q[0]), sz = n[1] === 'T' ? -1 : 1;
    o.push({ t: 'box', feat: 'gusset', group: 'steel', c: [r4(q[0] + sx * (S.cupR + CUP.gusL / 2)), r4(q[1] + (S.cupWall[0] + S.cupWall[1]) / 2), q[2]], d: [CUP.gusL, CUP.gusH, CUP.gusT] });
    o.push({ t: 'box', feat: 'gusset', group: 'steel', c: [q[0], r4(q[1] + (S.cupWall[0] + S.cupWall[1]) / 2), r4(q[2] + sz * (S.cupR + CUP.gusL / 2))], d: [CUP.gusT, CUP.gusH, CUP.gusL] }); }
  for (const n of ['FTL', 'FTR']) { const q = P3(N[n]); o.push({ t: 'cyl', feat: 'bushing', group: 'steel', a: [r4(q[0] - BUSH.upL / 2), q[1], q[2]], b: [r4(q[0] + BUSH.upL / 2), q[1], q[2]], r: BUSH.od / 2, ri: BUSH.d / 2 }); }
  for (const n of ['FBL', 'FBR']) { const q = P3(N[n]), y0 = r4(GEO.firewall * 12 + BRK.sec.t); o.push({ t: 'cyl', feat: 'bushing', group: 'steel', a: [q[0], y0, q[2]], b: [q[0], r4(y0 + BUSH.loL), q[2]], r: BUSH.od / 2, ri: BUSH.d / 2 }); }
  return o;
}
export const TGT_RES = TGT;
void effective; void DEFAULT_DESIGN; void loadCases; void partByPN; void F_;
