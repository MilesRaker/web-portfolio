// WPG2 — block G propeller group: LEZ-61-100 propeller (bought-in wood, 57 in), LEZ-61-110 prop extension (6061-T6,
// 8 in) and LEZ-61-120 spinner. Definition frame (inches: x = BL, y = FS aft, z = WL up), on the crankshaft line.
//  Stack aft of the crank flange (SAE 1, LEZ-71-210): extension forward flange, body, aft flange with six 4130 drive
//  bushings; spinner backplate; prop hub; crush plate; spinner aft bulkhead; six AN6 prop bolts through all of it (SAE 1:
//  6 × 3/8 on a 4.375 in circle; rev 2026-11-19, was AN7 on 4.75).
//  • Diameter: 57 in so the tip clears the ground by ≥ 7 in level (FAR 23.925(a)(1), confirmed 2026-11-19; ICD G-F9); the 62 in
//    prop left 4.74 in. GEO.prop.r carries it (the gear's own prop-clearance check reads it).
//  • Checks: the extension in torsion (2 × mean torque, 23.361), bending (gyroscopic 23.371 + the prop's inertia load)
//    and at its drive; the prop bolts; the wood hub on the drive bushings (bounded); static ground clearance; the prop
//    disc's clearance to the wing trailing edge and the exhaust exits.
// Notional; public data cited (research of 2026-11-19); what was not found stays a BOUND. Wood density is the materials topic's.
import { GEO, registerChecks, mk, wingSec } from '../structures.js';
import { ENG } from './wp1_powerplant.js';
import { FLANGE, AN_S, AN_T, ST, r4 } from './wpG1_engine.js';
import { O235 } from './engine_o235.js';
import { massOfPrims } from '../defn/g_prims.js';

const FL = r4(ENG.flange * 12), ZC = r4(ENG.crankZ * 12);
export const AL_BAR = { Ftu: 42000, Fty: 35000, Fsu: 27000, Fbru: 88000, rho: 0.098, spec: 'MMPDS 6061-T6 rolled bar (AMS-QQ-A-225/8), values typed from the handbook tables' };
export const WOOD = { rho: 0.0243, spec: 'laminated hard maple / birch, 42 lb/ft³ (typed from memory)' };
/** stations along the crankshaft (FS, in) and radii */
export const PX = (() => {
  const ext = { L: 8.0, flT: 0.5, flR: 3.125, bodyR: 1.50, boreR: 1.25 };
  const bp = { t: 0.090, r: 4.0 }, hub = { L: 4.0, w: 6.0 }, crush = { t: 0.25, r: 2.875 }, blk = { t: 0.090, r: 3.95 };
  const bush = { ro: 0.375, ri: 0.21875, inFl: 0.5, proj: 0.75 };
  const y0 = FL, y1 = y0 + ext.L, yBp = y1 + bp.t, yHub = yBp + hub.L, yCr = yHub + crush.t, yBk = yCr + blk.t;
  const blade = { rootZ: 3.0, tipR: r4(GEO.prop.r * 12), rootC: 4.5, rootT: 2.4, tipC: 2.2, tipT: 0.45 };
  const spin = { r: 4.0, w: 0.040, cylEnd: yBk + 0.4, tip: yBk + 0.4 + 6.5, tipR: 0.5 };
  return { ext, bp, hub, crush, blk, bush, blade, spin, y0, y1, yBp, yHub, yCr, yBk, bc: FLANGE.bc, n: FLANGE.n };
})();
const holeAt = (y, k, rr = PX.bc / 2) => { const a = (k + 0.5) * 2 * Math.PI / PX.n; return [r4(rr * Math.cos(a)), r4(y), r4(ZC + rr * Math.sin(a))]; };
const ring = (y, r) => Array.from({ length: PX.n }, (_, k) => ({ p: holeAt(y, k), r }));
const C = (feat, group, y0, y1, r, ri, extra = {}) => ({ t: 'cyl', feat, group, a: [0, r4(y0), ZC], b: [0, r4(y1), ZC], r: r4(r), ...(ri ? { ri: r4(ri) } : {}), ...extra });

// ------------------------------------------------------------------------------------------- extension (LEZ-61-110)
export function extPrims() {
  const E = PX.ext, B = PX.bush, o = [];
  o.push(C('fwd', 'al', PX.y0, PX.y0 + E.flT, E.flR, E.boreR, { holes: ring(PX.y0, FLANGE.hole / 2) }));
  o.push(C('body', 'al', PX.y0 + E.flT, PX.y1 - E.flT, E.bodyR, E.boreR));
  o.push(C('aft', 'al', PX.y1 - E.flT, PX.y1, E.flR, E.boreR, { holes: ring(PX.y1 - E.flT, B.ro) }));
  for (let k = 0; k < PX.n; k++) { const a = holeAt(PX.y1 - B.inFl, k), b = holeAt(PX.y1 + PX.bp.t + B.proj, k); o.push({ t: 'cyl', feat: 'bush', group: 'steel', a, b, r: B.ro, ri: B.ri }); }
  return o;
}
// ------------------------------------------------------------------------------------------- propeller (LEZ-61-100)
export function propPrims() {
  const H = PX.hub, Bl = PX.blade, yc = (PX.yBp + PX.yHub) / 2, o = [];
  o.push({ t: 'box', feat: 'hub', group: 'wood', c: [0, r4(yc), ZC], d: [H.w, H.L, 2 * Bl.rootZ], holes: Array.from({ length: PX.n }, (_, k) => { const q = holeAt(yc, k); return { ax: 1, u: q[0], v: q[2], r: PX.bush.ro }; }) });
  for (const sg of [1, -1]) {
    const sec = (z, c, t) => [[-c / 2, yc - t / 2], [c / 2, yc - t / 2], [c / 2, yc + t / 2], [-c / 2, yc + t / 2]].map(([x, y]) => [r4(x), r4(y), r4(ZC + sg * z)]);
    o.push({ t: 'loft', feat: 'blade', group: 'wood', secs: [sec(Bl.rootZ, Bl.rootC, Bl.rootT), sec(Bl.tipR, Bl.tipC, Bl.tipT)] });
  }
  o.push(C('crush', 'al', PX.yHub, PX.yCr, PX.crush.r, 0, { holes: ring(PX.yHub, PX.bush.ri + 0.003) }));
  return o;
}
// ------------------------------------------------------------------------------------------- spinner (LEZ-61-120)
export function spinPrims() {
  const S = PX.spin, o = [];
  o.push(C('backplate', 'al', PX.y1, PX.yBp, PX.bp.r, 0, { holes: ring(PX.y1, PX.bush.ro) }));
  o.push(C('bulkhead', 'al', PX.yCr, PX.yBk, PX.blk.r, 0, { holes: ring(PX.yCr, PX.bush.ri + 0.003) }));
  o.push(C('shell', 'al', PX.y1, S.cylEnd, S.r, S.r - S.w));
  o.push({ t: 'cone', feat: 'shell', group: 'al', a: [0, r4(S.cylEnd), ZC], b: [0, r4(S.tip), ZC], r1: S.r, r2: S.tipR, w: S.w });
  return o;
}

// ------------------------------------------------------------------------------------------- mass properties
/** prop polar moment about the crankshaft (slug·ft²) and mass (lb) from the blade and hub envelopes */
export function propInertia() {
  const Bl = PX.blade, H = PX.hub, n = 200; let I = 0, m = 0;
  for (let i = 0; i < n; i++) { const r = Bl.rootZ + (Bl.tipR - Bl.rootZ) * (i + 0.5) / n, u = (r - Bl.rootZ) / (Bl.tipR - Bl.rootZ), c = Bl.rootC + (Bl.tipC - Bl.rootC) * u, t = Bl.rootT + (Bl.tipT - Bl.rootT) * u, dm = 2 * WOOD.rho * c * t * (Bl.tipR - Bl.rootZ) / n; m += dm; I += dm * r * r; }
  const mh = WOOD.rho * H.w * H.L * 2 * Bl.rootZ; m += mh; I += mh * (H.w ** 2 + (2 * Bl.rootZ) ** 2) / 12;
  return { Ip: I / 32.174 / 144, m, I };
}

// ------------------------------------------------------------------------------------------- checks
const IN_ = (n, v, u, s = 'DERIVED') => [n, v, u, s];
export const FAR925 = 7.0;   // in, FAR 23.925(a)(1), nose-wheel aircraft, level, static (typed from memory: verify against the CFR)
export function groundClear() { const tip = ZC - PX.blade.tipR; return { c: tip, rot: Math.atan2(tip, (PX.yBp + PX.hub.L / 2) - GEO.gear.s * 12) * 180 / Math.PI }; }
/** prop forward face to the wing trailing edge inside the disc, and to the exhaust exits (in) */
export function discClear(exhaustExits = []) {
  const yF = PX.yBp + PX.hub.L / 2 - PX.blade.rootT / 2; let te = Infinity;
  for (let bl = GEO.wing.rootY * 12; bl <= PX.blade.tipR; bl += 0.25) { const w = wingSec(bl / 12); te = Math.min(te, yF - (w.le + w.c) * 12); }
  const ex = exhaustExits.length ? Math.min(...exhaustExits.map((q) => yF - q[1])) : Infinity;
  return { te, ex, yF };
}
const DRIVE = { woodBrg: 1500 };   // psi, wood bearing on the drive bushings (design value, bounded)
export function extState(d, n) {
  const E = PX.ext, P = propInertia(), Q = 2 * 5252 * O235.hp / O235.rpm * 12;            // 23.361: 2 × mean torque, in·lb
  const w = 2 * Math.PI * O235.rpm / 60, Mg = P.Ip * w * 1.0 * 12;                           // 23.371: 1 rad/s, in·lb
  const mSpin = massOfPrims(spinPrims(), { al: AL_BAR.rho }), Wp = P.m + mSpin, lever = (PX.yBp + PX.hub.L / 2) - (PX.y0 + E.flT);   // prop + spinner on the extension (spinner allowance typed)
  const FS = d.FS, M = FS * (Mg + Wp * n * lever), T = FS * Q, Pax = FS * d.thrust;
  const ro = E.bodyR, ri = E.boreR, Ib = Math.PI / 4 * (ro ** 4 - ri ** 4), J = 2 * Ib, A = Math.PI * (ro ** 2 - ri ** 2);
  const sig = M * ro / Ib + Pax / A, tau = T * ro / J, inter = Math.hypot(sig / AL_BAR.Fty, tau / (AL_BAR.Fsu * AL_BAR.Fty / AL_BAR.Ftu));
  const rb = PX.bc / 2, V = T / (PX.n * rb), Vbush = Math.PI * (PX.bush.ro ** 2 - PX.bush.ri ** 2) * ST.Fsu, brgFl = AL_BAR.Fbru * 2 * PX.bush.ro * PX.bush.inFl;
  const tBolt = M / (PX.n * rb / 2) + Pax / PX.n;                                             // bolts on a circle: max tension M/(n r/2)
  const wood = V / (2 * PX.bush.ro * PX.bush.proj);
  return { P, Q, Mg, Wp, lever, M, T, Pax, sig, tau, inter, V, Vbush, brgFl, tBolt, wood, n, FS };
}
registerChecks('wpG2-prop', (d, lc) => {
  const rows = [];
  if (lc.type === 'sym' && lc.n > 0) {
    const s = extState(d, lc.n), base = [IN_('Limit load factor', lc.n, '', 'FAR23'), IN_('Factor of safety', s.FS, '', 'FAR23'), IN_('Limit torque, 2 × mean (4 cyl.)', s.Q, 'inlb', 'FAR23: 23.361, TCDS power and rpm'), IN_('Gyroscopic moment, 1 rad/s', s.Mg, 'inlb', 'FAR23: 23.371 with the prop\'s own polar moment (MODEL)'),
      IN_('Prop + spinner on the extension', s.Wp, 'lb', 'MODEL: prop envelope × wood density + the spinner\'s solid (LEZ-61-120)'), IN_('Thrust', d.thrust, 'lb', `BOUND: axial stress is ${(s.Pax / Math.PI / (PX.ext.bodyR ** 2 - PX.ext.boreR ** 2) / s.sig * 100).toFixed(1)} % of the total`)];
    const mat = IN_('6061-T6 bar F_ty / F_su / F_bru', `${AL_BAR.Fty} / ${AL_BAR.Fsu} / ${AL_BAR.Fbru}`, 'psi', AL_BAR.spec);
    rows.push(Object.assign(mk('fuselage', 'pext-body', 'Prop extension body: bending (gyroscopic + inertia) with torsion', lc, 'body at the forward flange', 'combined bending and torsion', 1 / s.inter - 1, {
      formula: 'σ = M·r/I + P/A, M = FS·(Ip·ω·Ω + W·n·ℓ);  τ = FS·Q·r/J;  (σ/F_ty)² + (τ/(F_su·F_ty/F_tu))² ≤ 1', inputs: [...base, IN_('Body', `Ø ${2 * PX.ext.bodyR} × Ø ${2 * PX.ext.boreR} 6061-T6`, 'text', 'SIZED'), mat], result: [['M (ult.)', s.M, 'inlb'], ['σ', s.sig, 'psi'], ['τ', s.tau, 'psi']] }), { sys: 'LEZ-61-110' }));
    rows.push(Object.assign(mk('fuselage', 'pext-drive', 'Prop extension drive: bushings in shear, aft flange in bearing', lc, 'aft flange, 6 drive bushings', s.Vbush < s.brgFl ? 'bushing shear' : 'flange bearing', Math.min(s.Vbush, s.brgFl) / s.V - 1, {
      formula: 'V = FS·Q / (n·r_BC) per bushing (friction ignored);  allow = min(bushing annulus × F_su, F_bru·D·t_engaged)', inputs: [...base, IN_('Bushings', `${PX.n} × Ø ${2 * PX.bush.ro} / Ø ${2 * PX.bush.ri} 4130 N on a Ø ${PX.bc} circle`, 'text', 'SIZED; SAE No. 1 circle 4.375 in (Univair / McCauley SCM7153 hub data, accessed 2026-11-19)'), IN_('4130 N F_su', ST.Fsu, 'psi', ST.spec), mat], result: [['V per bushing (ult.)', s.V, 'lb'], ['Shear allowable', s.Vbush, 'lb'], ['Bearing allowable', s.brgFl, 'lb']] }), { sys: 'LEZ-61-110' }));
    rows.push(Object.assign(mk('fuselage', 'pext-bolts', 'Prop bolts (6 × AN6, SAE 1): tension from the bending moment and thrust', lc, 'prop bolt circle', 'bolt tension', AN_T[6] / s.tBolt - 1, {
      formula: 'T = M / (n·r/2) + P/n  (preload not counted against the allowable: torque 175–225 in-lb, Sensenich WOOD-CF-REV-B Table 1)', inputs: [...base, IN_('AN6 tension', AN_T[6], 'lb', 'AN standard (the structures topic\'s value)'), IN_('Bolt circle', PX.bc, 'in', 'SAE No. 1: Univair / McCauley SCM7153 hub data (accessed 2026-11-19)')], result: [['Bolt tension (ult.)', s.tBolt, 'lb']] }), { sys: 'LEZ-61-110' }));
    rows.push(Object.assign(mk('fuselage', 'prop-drive', 'Prop hub: wood bearing on the drive bushings', lc, 'hub bores, 6 bushings', 'wood bearing', DRIVE.woodBrg / s.wood - 1, {
      formula: 'σ = V / (D_bush · engagement)  (friction from the bolt preload ignored)', inputs: [...base, IN_('Bushing engagement in the hub', PX.bush.proj, 'in', 'SIZED'), IN_('Wood bearing allowable', DRIVE.woodBrg, 'psi', `BOUND: design value for laminated maple along the grain (typed); MS stays ≥ 0 down to ${s.wood.toFixed(0)} psi`)], result: [['σ (ult.)', s.wood, 'psi']] }), { sys: 'LEZ-61-100' }));
  }
  if (lc.id === 'W1-S1') {
    const g = groundClear(), dc = discClear(EXH_EXITS());
    rows.push(Object.assign(mk('gear', 'prop-ground', 'Prop tip ground clearance, level, static', lc, 'prop tip, blade down', 'clearance', g.c / FAR925 - 1, {
      formula: 'c = WL_hub − R_tip (ground plane at WL 0, gear statically deflected);  MS = c / 7 in − 1', inputs: [IN_('Hub WL', ZC, 'in', 'MODEL'), IN_('Tip radius', PX.blade.tipR, 'in', 'SIZED'), IN_('Required (nose-wheel aircraft)', FAR925, 'in', 'FAR23: 23.925(a)(1), 7 in nose-wheel gear (14 CFR Part 23, 2011 edition, pre-Amdt 23-64, govinfo, accessed 2026-11-19)')],
      result: [['Clearance', g.c, 'in'], ['Rotation about the mains to a strike', g.rot, 'deg']] }), { sys: 'LEZ-61-100' }));
    rows.push(Object.assign(mk('gear', 'prop-clear', 'Prop disc clear of the wing trailing edge and the exhaust exits', lc, dc.te < dc.ex ? 'wing root trailing edge' : 'exhaust exit', 'axial gap', Math.min(dc.te, dc.ex) / 4.0 - 1, {
      formula: 'gap = blade forward face FS − (trailing-edge FS inside the disc, exhaust exit FS);  MS = gap / 4 in − 1', inputs: [IN_('Required gap', 4.0, 'in', 'DESIGN: wake and exhaust gas off the wood blades'), IN_('Blade forward face', dc.yF, 'in', 'GEOMETRY')],
      result: [['Wing TE gap', dc.te, 'in'], ['Exhaust exit gap', dc.ex, 'in']] }), { sys: 'LEZ-61-100' }));
  }
  return rows;
});
let EXH_EXITS = () => [];
export const bindExhaust = (f) => { EXH_EXITS = f; };

// final integration (2026-11-19): analyses not yet done, listed as open requirements so the audit's requirement count and
// the explorer's requirement list carry them (owner Miles: these are his open decisions, not closed by the model)
import { defineReqs as _defineReqs } from '../systems.js';
_defineReqs([
  { id: 'R-PROP-1', ref: '23.907 (yardstick) / prop maker', title: 'Propeller and extension natural frequencies (blade bending and torsion, the extension\'s bending) clear of the engine\'s firing orders and the blister wake (open analysis: Miles)', method: 'analysis', wp: 'WP1' },
  { id: 'R-FLUT-1', ref: '23.629 (yardstick)', title: 'Flutter: a flutter analysis or ground vibration test of the wing, canard, winglets and their surfaces (R-STR-8 covers divergence, reversal and the mass balance only; open analysis: Miles)', method: 'analysis / test', wp: 'WP2' },
]);
