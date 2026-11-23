// WPD2 — main wheels, brakes and the brake circuit, block D: the envelopes of the bought-in parts (LEZ-32-300 wheel and
// tyre, LEZ-32-310 brake with its axle and torque plate, LEZ-32-311 master cylinder, LEZ-32-216 switches), the heat shield
// LEZ-32-315 and the brake lines LEZ-32-312, as primitive lists the CadQuery script (cad/d_prims.py) builds. Vendor sizes
// and weights are typed from memory or public catalogue pages: every one is marked so in the records. Notional.
// Stack at each leg end, outboard from the leg face (BL 39.9): heat shield, axle flange, torque plate; then the caliper
// round the disc, the disc on the wheel hub, the wheel and tyre on the axle spindle.
import { registerChecks, mk, fusAt } from '../structures.js';
import { partByPN } from '../systems.js';
import { BOW, AXB, YC, S0, ZAX, wAt, legAt, SCHED, FLANGE } from './wpD1_gear.js';
import { TYRE } from './wp10_induction_gear.js';
import { DISC } from './wp2_controls_gear.js';
import { layer, FUS } from './wp26_fuselage.js';
import { NOSE_SW } from './ng_layout.js';
import { CANOPY_SW } from './wp4_avionics_cabin.js';
import { L as CL, ARM as CARM, LOADS as CLOADS } from './wpC1_controls.js';

const r4 = (x) => Math.round(x * 1e4) / 1e4, R4 = (p) => p.map(r4), cylX = (g, x0, x1, r, ri, yz = [S0, ZAX]) => ({ g, t: 'cyl', a: R4([x0, ...yz]), b: R4([x1, ...yz]), r, ...(ri ? { ri } : {}) });
const box = (g, lo, hi) => ({ g, t: 'box', c: R4(lo.map((v, i) => (v + hi[i]) / 2)), d: R4(hi.map((v, i) => v - lo[i])) });

// ------------------------------------------------------------------------------------------- the stack (right side, BL in)
export const STACK = (() => {
  const face = BOW.legFace, sh = 0.025, fl = 0.25, tp = 0.25, disc = YC - DISC.offset * 12, dt = DISC.t * 12;
  return { face, sh, x1: face + sh, x2: face + sh + fl, x3: face + sh + fl + tp, disc0: disc - dt / 2, disc1: disc + dt / 2, discR: DISC.r * 12, cal: [40.9, 41.75, 8.4, 9.6, 0.9], hub: [disc + dt / 2, YC + 2.1, 2.5], axleR: 0.625, axleEnd: YC + 2.5 };   // Matco AXLE1A Ø 1.25 flange-mount axle with 1.25 in taper roller bearings (06-00568 page and axle chart, accessed 2026-11-19)
})();
const holes = (into, x0, x1) => [-1, 1].flatMap((a) => [-1, 1].map((b) => ({ feat: 'axle', a: R4([x0, S0 + a * AXB.a, ZAX + b * AXB.b]), b: R4([x1, S0 + a * AXB.a, ZAX + b * AXB.b]), r: r4((AXB.D + 0.006) / 2), into })));
// LEZ-32-300: tyre (max inflated, TYRE) and wheel hub with the bearing bore on the axle
export const WHEEL_P = { prims: [cylX('tyre', YC - TYRE.width / 2, YC + TYRE.width / 2, TYRE.odMax / 2, STACK.hub[2]), cylX('wheel', STACK.hub[0], STACK.hub[1], STACK.hub[2], STACK.axleR)], cuts: [] };
export const WHEEL_LB = { tyre: 5.9, wheel: 6.95 };   // tyre + tube BOUND (typed); wheel = Matco W51LT wheel-and-brake 9.2 lb per side (vendor, axle not included) less the plate, disc and caliper lines below
// LEZ-32-310: axle flange + spindle, torque plate, disc, caliper
const S = STACK;
export const BRAKE_P = { prims: [box('axle', [S.x1, S0 - FLANGE.hy, ZAX - FLANGE.hz], [S.x2, S0 + FLANGE.hy, ZAX + FLANGE.hz]), box('plate', [S.x2, S0 - FLANGE.hy, ZAX - FLANGE.hz], [S.x3, S0 + FLANGE.hy, ZAX + 3.3]), cylX('axle', S.x3, S.axleEnd, S.axleR),
  cylX('disc', S.disc0, S.disc1, S.discR, S.hub[2]), box('caliper', [S.cal[0], S0 - S.cal[4], S.cal[2]], [S.cal[1], S0 + S.cal[4], S.cal[3]])], cuts: holes([0, 1], S.x1, S.x3) };
export const BRAKE_LB = { axle: 0.75, plate: 0.35, disc: 1.0, caliper: 0.9 };   // split BOUND; wheel + plate + disc + caliper = 9.2 lb per side (Matco W51LT, Aircraft Spruce 06-00568, accessed 2026-11-19); axle BOUND
// LEZ-32-315: the shield sheet under the axle flange
export const SHIELD_P = { prims: [box('sheet', [S.face, S0 - 2.25, ZAX - 1.75], [S.x1, S0 + 2.25, ZAX + 3.5])], cuts: holes([0], S.face, S.x1) };
export const CAL_PORT_IN = [S0, 41.05, S.cal[3]];   // brake inlet on the caliper's top, inboard of the disc
// LEZ-32-311 master cylinder: rod eye on the pedal toe arm, body anchored on the pedal assembly (block C); own size typed
const MC = (() => { const R = [4.32, 34.9000, 35.5], d = [0, 3.2, 0.7], L = Math.hypot(...d), u = d.map((v) => v / L), at = (s) => R4(R.map((v, i) => v + u[i] * s));
  return { R, u, rod: [at(0), at(1.4)], body: [at(1.4), at(4.4)], boss: [at(4.4), at(5.0)], out: R4([...at(1.7).slice(0, 2), at(1.7)[2] - 0.55]), eye: at(5.0) }; })();   // outlet under the body's forward end, clear of the panel harnesses above
export const MC_P = { prims: [{ g: 'rod', t: 'cyl', a: MC.rod[0], b: MC.rod[1], r: 0.156 }, { g: 'body', t: 'cyl', a: MC.body[0], b: MC.body[1], r: 0.5 }, { g: 'body', t: 'cyl', a: MC.boss[0], b: MC.boss[1], r: 0.3 }], cuts: [] };
export const MC_LB = { rod: 0.05, body: 0.40 };
export const MC_GEO = MC;

// ------------------------------------------------------------------------------------------- the brake line route (right side)
const innerAt = (s, dz) => {   // inner shell point at station s (ft) dz in above the bottom, moved 0.35 in inboard of the inner face
  const f = fusAt(s), L = layer(s, -FUS.t, -FUS.t - 0.001, false, 1).slice(0, FUS.n + 1), z = f.bot * 12 + dz;
  for (let i = 0; i < L.length - 1; i++) if ((L[i][1] - z) * (L[i + 1][1] - z) <= 0) { const t = (z - L[i][1]) / (L[i + 1][1] - L[i][1]); return [s * 12, L[i][0] + t * (L[i + 1][0] - L[i][0]) - 0.35, z]; }
  return null;
};
const shellAtY = (s, y, off) => {   // WL of the shell surface (offset off in, − inward) at BL y, station s (ft)
  const L = layer(s, off, off - 0.001, false, 1).slice(0, FUS.n + 1);
  for (let i = 0; i < L.length - 1; i++) if ((L[i][0] - y) * (L[i + 1][0] - y) <= 0) return L[i][1] + (y - L[i][0]) / (L[i + 1][0] - L[i][0]) * (L[i + 1][1] - L[i][1]);
  return null;
};
export const EXIT = { s: 116.5, y: 10.4 };   // belly bulkhead union: aft of the aft attach angle, outboard of both angles, under the fairing
export const LINE = (() => {
  const cabin = [3.5, 5.0, 6.5, 8.0, 9.5, 10.4].map((s) => innerAt(s, 4.8)), zi = shellAtY(EXIT.s / 12, EXIT.y, -FUS.t), zo = shellAtY(EXIT.s / 12, EXIT.y, 0);
  const exitIn = [EXIT.s, EXIT.y - 0.15, zi + 0.35], exitOut = [EXIT.s, EXIT.y + 0.1, zo - 0.45];
  const leg = [0.08, 0.2, 0.35, 0.5, 0.65, 0.78].map((u) => { const { p } = legAt(u); return [S0 + wAt(u) / 2 + SCHED.nX * 0.01 + 0.32, p[0], p[1]]; });
  const start = [MC.out[1], MC.out[0], MC.out[2]], pts = [start, [start[0] + 1.5, 6.5, 31.5], ...cabin, exitIn, exitOut, ...leg, [S0 + 0.9, 40.4, 11.2], [CAL_PORT_IN[0], CAL_PORT_IN[1], CAL_PORT_IN[2] + 0.05]];   // [FS, BL, WL]
  const iHose = pts.indexOf(exitOut);   // the -3 hose from the belly fitting down the leg
  return { pts: pts.map(R4), iHose, tube: { od: 0.1875, id: 0.1875 - 2 * 0.028 }, hose: { od: 0.453, id: 0.125 } };   // Aeroquip 303-3: ID 1/8, OD 0.453, min bend 3.00 in (Aircraft Spruce, accessed 2026-11-19)
})();
export const LINE_P = (() => {
  const prims = [], P = LINE.pts.map(([fs, bl, wl]) => [bl, fs, wl]);
  for (let i = 1; i < P.length; i++) { const k = i >= LINE.iHose + 1 ? LINE.hose : LINE.tube, g = i >= LINE.iHose + 1 ? 'hose' : 'tube';
    prims.push({ g, t: 'cyl', a: P[i - 1], b: P[i], r: k.od / 2, ri: r4(k.id / 2) }, { g: 'fluid', t: 'cyl', a: P[i - 1], b: P[i], r: r4(k.id / 2) }); }
  return { prims, cuts: [] };
})();
export const LINE_RHO = { tube: 0.097, hose: 0.12 / 12 / (Math.PI / 4 * (0.453 ** 2 - 0.125 ** 2)), fluid: 0.0307 };   // 5052; -3 hose 0.120 lb/ft (303-3, Aircraft Spruce, accessed 2026-11-19); MIL-PRF-5606

// ------------------------------------------------------------------------------------------- LEZ-32-216 switch with its bracket (own frame)
// rev 2026-11-19: Honeywell V15W sealed (IP67) 33 × 10.3 × 15.9 mm (Honeywell comparison sheet, accessed 2026-11-19; was 27.8 mm, the unsealed V family)
export const SW_P = { prims: [box('switch', [-0.65, -0.2, 0], [0.65, 0.2, 0.63]), box('switch', [-0.45, -0.1, 0.63], [0.45, 0.1, 0.67]), box('bracket', [-0.75, -0.24, -0.04], [0.75, 0.2, 0]), box('bracket', [-0.75, -0.24, 0], [0.75, -0.2, 0.8])],
  cuts: [...[-1, 1].map((s) => ({ feat: 'mount', a: R4([s * 0.4375, -0.25, 0.32]), b: R4([s * 0.4375, 0.21, 0.32]), r: 0.06, into: [0, 3] })), ...[-1, 1].map((s) => ({ feat: 'base', a: R4([s * 0.45, -0.02, -0.05]), b: R4([s * 0.45, -0.02, 0.01]), r: 0.0725, into: [2] }))] };
/** each switch's own frame (x along the switch, y through it, z up from the bracket base) in the definition frame
 *  [BL, FS, WL] at its position (final integration: the S11 axis mapping, ICD h_engsys §7.5): S11 lies along FS on block H's
 *  quadrant face (LEZ-76-100), actuator up under the idle cam, its plunger across the cam plate */
export const SW_FRAME = { S11: { x: [0, 1, 0], y: [1, 0, 0], z: [0, 0, 1] } };
export const SW_LB = { switch: 0.018, bracket: 0.012 };   // typed from memory: sealed basic switch ≈ 8 g; 0.040 6061 bracket
export const SW_AT = [{ ref: 'S11', what: 'Throttle closed', at: [4.0827, -0.82, 3.05], host: 'throttle quadrant (block G)' }, { ref: 'S12', what: 'Nose gear not down', at: NOSE_SW, host: 'NG-30 plate LEZ-32-201 (block E)' }, { ref: 'S13', what: 'Canopy pin', at: CANOPY_SW, host: 'canopy forward hook (block B)' }];

// ------------------------------------------------------------------------------------------- checks: brake circuit pressure
export const BRK = { bore: 0.625, tubeFtu: 28000, hoseWork: 3000, type: 'pull', stroke: 0.75, strokeAvail: 1.00, rodD: 0.3125, rodFtu: 125000, eyeAN: 3 };   // stroke: makes full pressure; strokeAvail: the SCD's travel before the cylinder bottoms (rev D: C's toe stop ends the travel first)
/** the toe lever as block C built it (LEZ-27-150, wpC1 L / ARM): the toe pad and the toe tab pivot on the toe hinge; the tab's
 *  arm is the rod eye's lever about the hinge normal to the cylinder axis. ratio = MC rod force / toe force. apply: how the
 *  eye-to-eye length changes when the toe pad goes forward (+1 extends: the rod is pulled; −1 shortens: pushed) */
export function toeLever() {
  const u = [MC.eye[1] - MC.R[1], MC.eye[2] - MC.R[2]], Lu = Math.hypot(...u), e = [u[0] / Lu, u[1] / Lu], t = [CL.mcRod[0] - CL.toeHinge[0], CL.mcRod[2] - CL.toeHinge[2]];
  const arm = Math.abs(t[0] * e[1] - t[1] * e[0]), d = [-t[1], t[0]], fwd = d[0] < 0 ? d : [-d[0], -d[1]];   // rod-eye motion when the tab top tips forward (FS decreasing)
  return { arm, pad: CARM.toePad, ratio: CARM.toePad / arm, apply: -(fwd[0] * e[0] + fwd[1] * e[1]) > 0 ? 1 : -1, toe: CLOADS.toe };
}
/** rated pull the SCD calls for: FS 1.5 × the most the pilot can push through the toe lever, +15 % reserve, to 10 lb */
export const MC_PULL = () => { const k = toeLever(); return Math.ceil(1.5 * 1.15 * k.toe * k.ratio / 10) * 10; };
export const MC_SCD = () => { const k = toeLever(); return `Pull-to-apply (tension) toe-brake master cylinder: rod extends to apply; ${BRK.bore} in bore, integral reservoir, MIL-PRF-5606; ${MC.R && (Math.hypot(...MC.eye.map((v, i) => v - MC.R[i]))).toFixed(1)} in eye to eye with the brakes off (rod retracted), full pressure within ${BRK.stroke} in of rod stroke, ≥ ${BRK.strokeAvail.toFixed(2)} in of stroke available (block C's toe stop ends the travel first); AN3 eyes both ends; 1/8 NPT outlet; rated pull ≥ ${MC_PULL()} lb (FS 1.5 × ${k.toe} lb toe × ratio ${k.ratio.toFixed(3)}, +15 %); envelope Ø1.0 body × 6.0 in`; };
registerChecks('wpD2-brakes', (d, lc) => {
  if (lc.id !== 'W1-S1') return [];
  const k = toeLever(), A = Math.PI / 4 * BRK.bore ** 2, P = k.toe * k.ratio, p = P / A, burst = 2 * BRK.tubeFtu * 0.028 / 0.1875, ms = Math.min(burst / (d.FS * p), BRK.hoseWork / p) - 1;
  const lev = ['Pedal-to-MC ratio (toe pad / tab arm about the toe hinge)', k.ratio, '', `GEOMETRY: LEZ-27-150 (block C) toe pad ${k.pad} in / tab arm ${k.arm.toFixed(3)} in normal to the cylinder axis`];
  const toeIn = ['Toe force on the pedal', k.toe, 'lb', `BOUND: FAR 23.397(b) rudder-pedal force used as the toe force (block C LOADS.toe); MS ≥ 0 up to ${(Math.min(burst / d.FS, BRK.hoseWork) * A / k.ratio).toFixed(0)} lb`];
  const out = [Object.assign(mk('gear', 'brk-line', 'Brake lines: tube burst and hose working pressure at the most the pilot can push', lc, 'tube in the cabin, -3 hose down the leg', burst / (d.FS * p) < BRK.hoseWork / p ? 'tube burst' : 'hose working pressure', ms, {
    formula: 'P_rod = F_toe · a_pad / a_tab;  p = P_rod / A_MC;  tube burst = 2·F_tu·t/D against FS·p;  hose rated working pressure against p',
    inputs: [toeIn, lev, ['MC bore', BRK.bore, 'in', 'VENDOR (typed from memory)'], ['Tube 3/16 × .028 5052-O F_tu', BRK.tubeFtu, 'psi', 'MMPDS-typical'], ['-3 hose rated working pressure', BRK.hoseWork, 'psi', 'VENDOR (MIL-H-8794-3, typed from memory)']],
    result: [['MC rod force (limit)', P, 'lb'], ['Line pressure (limit)', p, 'psi'], ['Tube burst', burst, 'psi']] }), { sys: 'LEZ-32-312' })];
  // the pull-type cylinder in tension: piston rod, the AN3 eye bolts (double shear in the clevis / ear), the rated pull
  { const Pu = d.FS * P, Ar = Math.PI / 4 * BRK.rodD ** 2, sR = Pu / Ar, eye = 2 * 2126 /* AN3 single shear, Fsu 75 ksi × π/4 × 0.190² (MIL-HDBK-5J, derived; 2026-11-19) */, rated = MC_PULL();
    const modes = [['piston rod tension', BRK.rodFtu / sR - 1], [`AN${BRK.eyeAN} eye bolt, double shear`, eye / Pu - 1], ['rated pull (SCD)', rated / Pu - 1]].sort((a, b) => a[1] - b[1]);
    out.push(Object.assign(mk('gear', 'brk-mc', 'Master cylinder pulled to apply: rod, eye bolts and rated pull at the most the pilot can push', lc, 'each master cylinder', modes[0][0], modes[0][1], {
      formula: 'P = F_toe · a_pad / a_tab (rod in tension, pull-to-apply);  σ_rod = FS·P / (πd²/4);  eye bolts 2 × single shear;  SCD rated pull against FS·P',
      inputs: [toeIn, lev, ['Piston rod Ø', BRK.rodD, 'in', 'VENDOR envelope (typed from memory)'], ['Rod F_tu', BRK.rodFtu, 'psi', `BOUND: stainless or alloy-steel rod, typed from memory; MS ≥ 0 down to ${Math.ceil(sR)} psi`], [`AN${BRK.eyeAN} single shear`, 2126, 'lb', 'AN standard (Fsu 75 ksi × π/4 d²)'], ['Rated pull, required in the SCD', rated, 'lb', 'DESIGN (LEZ-32-311 source control)']],
      result: [['Rod pull (ult.)', Pu, 'lb'], ['σ rod', sR, 'psi']] }), { sys: 'LEZ-32-311' })); }
  return out;
});

// ------------------------------------------------------------------------------------------- system records: geometry and ports from the envelopes
const ftP = (p) => [p[1] / 12, p[0] / 12, p[2] / 12];   // [BL, FS, WL] in → [FS, BL, WL] ft
{ const mcOut = (sg) => [MC.out[1] / 12, sg * MC.out[0] / 12, MC.out[2] / 12], cal = (sg) => [CAL_PORT_IN[0] / 12, sg * CAL_PORT_IN[1] / 12, CAL_PORT_IN[2] / 12];
  const mc = partByPN('LEZ-32-311'); if (mc) Object.assign(mc, { name: 'Brake master cylinders, pull-to-apply (L/R)', scd: { spec: MC_SCD(), envelope: [6.0, 1.0, 1.0] }, geo: [-1, 1].map((sg) => ({ t: 'cyl', a: [MC.R[1] / 12, sg * MC.R[0] / 12, MC.R[2] / 12], b: [MC.eye[1] / 12, sg * MC.eye[0] / 12, MC.eye[2] / 12], r: 0.04 })), ports: { 'OUT-L': { at: mcOut(-1), kind: 'brake', fit: 'AN816-3D' }, 'OUT-R': { at: mcOut(1), kind: 'brake', fit: 'AN816-3D' } } });
  const br = partByPN('LEZ-32-310'); if (br) Object.assign(br, { name: 'Brakes: Matco internal-caliper brake, disc, torque plate and bolt-on axle (L/R)', ports: { 'IN-L': { at: cal(-1), kind: 'brake', fit: 'AN816-3D / bleeder' }, 'IN-R': { at: cal(1), kind: 'brake', fit: 'AN816-3D / bleeder' } },
    geo: [-1, 1].flatMap((sg) => BRAKE_P.prims.map((p) => (p.t === 'box' ? { t: 'box', c: [p.c[1] / 12, sg * p.c[0] / 12, p.c[2] / 12], d: [p.d[1] / 12, p.d[0] / 12, p.d[2] / 12], mat: 'steel' } : { t: 'cyl', a: [p.a[1] / 12, sg * p.a[0] / 12, p.a[2] / 12], b: [p.b[1] / 12, sg * p.b[0] / 12, p.b[2] / 12], r: p.r / 12, mat: 'steel' }))) });
  const ln = partByPN('LEZ-32-312'); if (ln) Object.assign(ln, { name: 'Brake lines (L/R): 3/16 × .028 5052-O tube in the cabin, -3 hose from the belly fitting down the bow\'s aft face',
    geo: [-1, 1].map((sg) => { const sd = sg < 0 ? 'L' : 'R'; return { t: 'path', pts: LINE.pts.map((q) => [q[0] / 12, sg * q[1] / 12, q[2] / 12]), dIn: LINE.tube.od, wallIn: 0.028, cls: 'brake', extSeg: Array.from({ length: LINE.pts.length - LINE.iHose }, (_, i) => LINE.iHose + i), ends: [`LEZ-32-311:OUT-${sd}`, `LEZ-32-310:IN-${sd}`], endFit: ['AN818-3D / AN819-3D', '-3 hose swivel, AN816-3D at the caliper'] }; }) });
  const sh = partByPN('LEZ-32-315'); if (sh) Object.assign(sh, { name: 'Brake heat shields at the leg ends (L/R), clamped under the axle flanges', nha: 'LEZ-32-310', external: true,
    geo: [-1, 1].map((sg) => { const p = SHIELD_P.prims[0]; return { t: 'box', c: [p.c[1] / 12, sg * p.c[0] / 12, p.c[2] / 12], d: [p.d[1] / 12, p.d[0] / 12, p.d[2] / 12] }; }),
    blurb: `0.025 in 321 stainless sheet clamped between the leg end and the axle flange, larger than the leg end, so the disc sees steel, not glass; ${(STACK.disc0 - STACK.x1).toFixed(2)} in from the disc face, ${(STACK.cal[0] - STACK.x1).toFixed(2)} in from the caliper.`,
    steps: [{ title: 'Cut and drill on the axle pattern; clamp between the leg-end pad and the axle flange', inspect: [`Disc face ≥ 1 in from the shield (${(STACK.disc0 - STACK.x1).toFixed(2)} in), caliper ≥ 0.95 in (${(STACK.cal[0] - STACK.x1).toFixed(2)} in), through full wheel rotation`, 'Shield covers the leg end fore-aft and above the flange'] }] });
  const sw = partByPN('LEZ-32-216'); if (sw) Object.assign(sw, { qty: 3 });
  void ftP; }

// ------------------------------------------------------------------------------------------- system-part masses from the definition envelopes
import { primVolumes as _pv } from '../defn/d_prims.js';
import { mountVolumes, FAIR } from './wpD1_gear.js';
{ const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0), V = (P, rho) => Object.entries(_pv(P)).reduce((a, [g, v]) => a + v * rho[g], 0), mv = mountVolumes();
  const set = (pn, m, how) => { const p = partByPN(pn); if (p) { p.massEach = +m.toFixed(3); p.src = { ...(p.src || {}), mass: `GEOMETRY: the definition ${how} (${pn})` }; } };
  set('LEZ-32-300', sum(WHEEL_LB), 'envelope at the vendor weights'); set('LEZ-32-310', sum(BRAKE_LB), 'envelope at the vendor weights'); set('LEZ-32-311', sum(MC_LB), 'envelope at the vendor weight');
  set('LEZ-32-312', V(LINE_P, LINE_RHO), 'solid'); set('LEZ-32-315', V(SHIELD_P, { sheet: 0.286 }), 'solid'); set('LEZ-32-216', sum(SW_LB), 'envelope at the vendor weight');
  set('LEZ-32-120', mv.tube * 0.283 + (mv.angle + mv.back) * 0.098 + FAIR.lb, 'solid'); }

// final integration (2026-11-19, block D open item LEZ-32-312 O3): the -3 hose leaves the fairing half through an edge notch
// at the point it crosses the fairing's lower face (the fairing envelope: FS S0 ± L/2, out to BL ± span, its lower face hF
// below the belly at the union), 0.06 in all round the hose, edged with a nylon grommet strip
import { FAIR as _FAIR, S0 as _S0 } from './wpD1_gear.js';
import { bellyAt as _belly } from './wpF0_layout.js';
export const HOSE_NOTCH = (() => { const P = LINE.pts.slice(LINE.iHose), zf = _belly(EXIT.y, EXIT.s, 0) - _FAIR.hF;
  for (let i = 1; i < P.length; i++) { const a = P[i - 1], b = P[i]; if ((a[2] - zf) * (b[2] - zf) <= 0 && a[2] !== b[2]) { const t = (zf - a[2]) / (b[2] - a[2]), q = a.map((v, k) => v + (b[k] - v) * t);
    const w = LINE.hose.od + 0.12; return { at: q.map((v) => Math.round(v * 1e4) / 1e4), w, from: Math.round((q[0] - w / 2) * 1e4) / 1e4, zf, edge: _FAIR.span, fs: [_S0 - _FAIR.L / 2, _S0 + _FAIR.L / 2] }; } }
  return null; })();
