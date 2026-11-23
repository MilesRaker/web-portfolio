// WPH1 — block H layout (definition frame, inches: x = BL + right, y = FS aft, z = WL up).
//  • LEZ-71-210 rev B envelope features (block H owns this revision, coordinator decision 2): the magnetos' harness caps
//    and P-lead terminals, the carburettor's throttle and mixture arms, the tach drive pick-up, the oil-pressure boss and
//    the case ground stud. Positions approximate: the Lycoming / Slick / Marvel-Schebler installation data govern.
//  • The throttle quadrant LEZ-76-100 (left console), the carb-heat control head, the S11 mounting face.
//  • Every block H run (cables, P-leads, harness tails and branches, sensor lines, ignition leads) as nodes with clamps.
// Engine maker's conventions (coordinator decision 7; typed from memory, verify against the operator's manual):
//  Lycoming left / right are seen from the accessory end looking toward the propeller; in this pusher that is looking aft,
//  so engine LEFT = aircraft RIGHT (+BL). Cylinders: 1 right front, 2 left front, 3 right rear, 4 left rear, front = prop
//  end; firing order 1-3-2-4. The LEFT magneto carries the impulse coupling; in START the key switch grounds the right
//  magneto. The left magneto fires the top plugs of 1 and 3 and the bottom plugs of 2 and 4; the right one the rest.
// Notional; public data and typed values only (marked).
import { GEO } from '../structures.js';
import { ENG, cylS } from './wp1_powerplant.js';
import { P3, ENGINE_FEATURES } from './wpG1_engine.js';
import { ARM, HEAT_ARM_G } from './wpG4_systems.js';
import { r4, T3, V, FW_IN } from './wpH0_route.js';

const { sub, add, mul, len } = V;
const A_ = ENG.accFace * 12, C_ = ENG.crankZ * 12;
export const DATE = '2026-11-18';

// ------------------------------------------------------------------------------------------- engine conventions
/** model cylinder keys (aircraft side L/R, engine rear R / front F) → Lycoming cylinder numbers (see the header) */
export const CYL_NO = { LF: 1, RF: 2, LR: 3, RR: 4 };
export const CYL_OF = Object.fromEntries(Object.entries(CYL_NO).map(([k, n]) => [n, k]));
export const FIRING = [1, 3, 2, 4];
/** magnetos by the engine maker's names: LEFT (engine left = +BL, impulse coupling), RIGHT (−BL) */
export const MAGS = { L: { sg: 1, ref: 'MG2', impulse: true, name: 'Left magneto (engine left, aircraft right side; impulse coupling)' }, R: { sg: -1, ref: 'MG1', impulse: false, name: 'Right magneto (engine right, aircraft left side)' } };
/** which plugs each magneto fires */
export const FIRES = { L: [[1, true], [3, true], [2, false], [4, false]], R: [[2, true], [4, true], [1, false], [3, false]] };

/** rev B corrections to block G's approximate envelope (block G's G-O2): the magnetos 1.00 in lower and 0.30 in inboard and the accessory
 *  housing 7.80 in high (was 9.60), 9.00 in wide, so every feature stands ≥ 0.5 in from every mount tube */
export const REVB = { magDz: -1.00, magDy: -0.30, accH: 7.80, accW: 9.00 };
// ------------------------------------------------------------------------------------------- engine rev B features
const MAGAX = (sg) => ({ y: sg * (2.88 + REVB.magDy), z: 39.36 + REVB.magDz, r: 1.56, fs: [130.29, 133.89] });      // the magneto envelope (rev B)
export const CAP = (sg) => [sg * 3.60, 132.45, 41.40 + REVB.magDz];                         // harness outlet: top of the cap (EQUIP MG moves here)
const capBase = (sg) => { const m = MAGAX(sg), dy = CAP(sg)[0] - m.y; return m.z + Math.sqrt(m.r * m.r - dy * dy) - 0.25; };
const TERM_ANG = 40 * Math.PI / 180;
/** P-lead terminal: a post standing radially out of the magneto's outboard-upper side */
export const PTERM = (sg) => { const m = MAGAX(sg), e = [sg * Math.cos(TERM_ANG), 0, Math.sin(TERM_ANG)], s = [m.y + m.r * e[0], 131.50, m.z + m.r * e[2]]; return { a: T3(s), b: T3(add(s, mul(e, 0.35))), e }; };
/** carburettor arms (approximate, typed: the MA-3A installation data govern). Pivot on the carburettor's left side; the
 *  arm swings in its BL plane about a shaft along BL; at mid travel it stands vertical; the cable pushes the tip aft to
 *  open the throttle / lean the mixture? (no: see dir). Travel and radius typed from memory as BOUNDs. */
export const CARB_ARMS = {
  throttle: { bl: -2.80, pivot: [-2.80, 136.10, 26.10], r: 1.50, travel: 70, dir: 'aft = open', hole: 0.19 },
  mixture: { bl: -2.30, pivot: [-2.30, 137.50, 25.80], r: 1.25, travel: 50, dir: 'aft = rich', hole: 0.19 },
};
/** the air box's carb-heat arm (block G, LEZ-71-251 rev D, ICD H-O1): block G's crank on the flapper pin, taken whole from
 *  `HEAT_ARM_G` (pivot, radius, travel, plane BL −4.60). It hangs from the pin and swings fore and aft: COLD tip aft, HOT tip
 *  forward (cable pulled). `armTip` measures from straight up, so the hanging arm's mid-travel is 180°. */
export const HEAT_ARM = { bl: HEAT_ARM_G.plane, pivot: HEAT_ARM_G.pivot, r: HEAT_ARM_G.r, travel: HEAT_ARM_G.travel, tip: HEAT_ARM_G.cold, conduitEnd: HEAT_ARM_G.conduitEnd };
/** tip of an arm at θ (deg) from its mid-travel position (vertical up); + rotates the tip aft */
export const armTip = (A, deg, mid = 0) => { const a = (deg + mid) * Math.PI / 180; return [A.pivot[0], A.pivot[1] + A.r * Math.sin(a), A.pivot[2] + A.r * Math.cos(a)]; };
/** the heat arm hangs down (mid-travel 180° from straight up); COLD = −45° about it (tip aft), HOT = +45° (tip forward) */
export const HEAT_MID = 180;
export const FUEL_PUMP = { a: [3.00, 133.89, 31.50], b: [3.00, 131.50, 31.50], r: 0.75 };   // AN-type diaphragm pump envelope (approximate, typed)
/** tach: Garmin's 4-cylinder kit uses a UMA T1A9-1 magneto-mounted sensor in the right (non-impulse) magneto's vent port (G3X IM
 *  §21.2.6), not a tach-pad pick-up; drawn on the accessory face at the old envelope (position BOUND: re-terminate on the magneto) */
export const TACH = { a: [-1.20, 133.89, 32.76], b: [-1.20, 133.29, 32.76], r: 0.50 };
export const OILP_BOSS = { a: [3.60, 133.89, 34.56], b: [3.60, 133.60, 34.56], r: 0.30 };
export const GND_STUD = { a: [-2.40, 135.09, 35.76 + REVB.accH / 2], b: [-2.40, 135.09, 35.76 + REVB.accH / 2 + 0.60], r: 0.19 };   // case ground stud E1, 1/4-28 on the accessory housing top (block I lands the strap; typed from memory, G-O6)
const cylP = (feat, a, b, r) => ({ t: 'cyl', feat, group: 'env', a: T3(a), b: T3(b), r: r4(r) });
const boxP = (feat, c, d) => ({ t: 'box', feat, group: 'env', c: T3(c), d: T3(d) });
export function engineRevB() {
  const o = [];
  for (const sg of [-1, 1]) { const c = CAP(sg); o.push(cylP('mag', [c[0], c[1], capBase(sg)], c, 0.55)); const t = PTERM(sg); o.push(cylP('mag', t.a.map((v, i) => v - t.e[i] * 0.1), t.b, 0.16)); }
  for (const A of Object.values(CARB_ARMS)) { const tip = armTip(A, 0); o.push(cylP('carb', [A.pivot[0] + 0.5, A.pivot[1], A.pivot[2]], [A.pivot[0] - 0.0625, A.pivot[1], A.pivot[2]], 0.25)); o.push(boxP('carb', [A.bl, A.pivot[1], (A.pivot[2] + tip[2]) / 2 + 0.06], [0.125, 0.40, A.r + 0.37])); }
  o.push(cylP('acc', FUEL_PUMP.a, FUEL_PUMP.b, FUEL_PUMP.r));   // engine-driven fuel pump on the accessory housing (block F's ports FP-IN / FP-OUT)
  o.push(cylP('acc', TACH.a, TACH.b, TACH.r), cylP('acc', OILP_BOSS.a, OILP_BOSS.b, OILP_BOSS.r), cylP('ground', GND_STUD.a, GND_STUD.b, GND_STUD.r));
  return o;
}
/** applied inside block G's enginePrims(): correct the magnetos and the accessory housing, then add the rev B features */
export function reviseEngine(o) {
  for (const p of o) {
    if (p.feat === 'mag') { const dy = Math.sign(p.a[0]) * REVB.magDy; p.a = T3([p.a[0] + dy, p.a[1], p.a[2] + REVB.magDz]); p.b = T3([p.b[0] + dy, p.b[1], p.b[2] + REVB.magDz]); }
    if (p.feat === 'acc' && p.t === 'box') p.d = T3([REVB.accW, p.d[1], REVB.accH]);
  }
  o.push(...engineRevB());
}
ENGINE_FEATURES.push(reviseEngine);

// ------------------------------------------------------------------------------------------- spark plugs
/** plug seat (on the cylinder envelope) and its axis: the model's PLUG point and lean (wp6) */
export const PLUG_AT = (k, top) => { const sg = k[0] === 'L' ? -1 : 1, s = cylS[k] * 12; return { sg, p: T3([sg * (top ? 13.44 : 13.20), s + (top ? 0.72 : -1.44), C_ + (top ? 3.24 : -2.64)]), e: (() => { const d = [sg * 0.84, 0, top ? 0.60 : -0.60]; const L = len(d); return d.map((v) => v / L); })() }; };
export const PLUG = { hex: 0.875, hexL: 0.40, bodyR: 0.30, bodyL: 1.40, reach: 0.50, threadR: 0.354, lb: 0.25 };   // Champion REM37BY 18 mm; 0.25 lb the conservative end (SkyGeek shipping weight, accessed 2026-11-19); envelope BOUND

// ------------------------------------------------------------------------------------------- throttle quadrant (LEZ-76-100)
// Left console (block B): its top laminate WL 38.88–39.12; the throttle cut-out FS 68.3–75.1, BL −10.7…−9.0. The canopy
// latch keep-out (BL ≤ −9.96 above WL 39.43) keeps the levers and knobs inboard of BL −9.96. S11 (block D) at BL −9.84,
// FS 71.04, WL 36.60 is the bracket base; its switch stands above it under the throttle hub, actuated by the idle cam.
export const QD = {
  pivot: [-9.6375, 48.99, 38.25]   /* 0.05 in lower than rev A: pivot edge distance 1.32 D (ICD phase 2) */, piv: { d: 0.25, an: 'AN4' },
  plateO: [-10.25, -10.125], plateI: [-9.085, -8.995], plate: { fs: [46.95, 50.25], wl: [36.40, 38.58], t: 0.125 },   // top 0.25 in under the console's lower face
  aft: { fs: [50.75, 51.00], bl: [-9.75, -8.975], wl: [36.00, 37.40] },                 // conduit anchor plate (inboard part, clear of the raceway clamps)
  shelf: { bl: [-10.15, -9.64], fs: [48.19, 49.79], wl: [36.35, 36.60] },                // S11 mounting face, 2 × #6 nutplates 0.90 in apart
  cam: { bl: [-9.94, -9.75], r0: 0.90, r1: 1.03, lobe: 12 },     // rev B: 0.05 smaller with the lowered pivot (same gap to S11's actuator)                             // cam plate keyed to the throttle; lobe over the last 12° at idle
  throttle: { bl: -9.49, t: 0.19, knob: { bl: -9.45, r: 4.40, d: 0.85, h: 0.80 } },
  mixture: { bl: -9.20, t: 0.16, knob: { bl: -8.62, r: 3.90, d: 0.70, h: 0.70 } },
  sweep: 60, knobForce: 15,
  heat: { bl: -9.25, fs: 46.55, head: [37.60, 38.80], knob: { d: 0.75, h: 0.60, z: 40.10 }, stroke: 2.0 },
  s11: [-9.84, 48.99, 36.60], s11Holes: 0.90,
};
export const CONSOLE = { top: [38.88, 39.12], cut: { fs: [46.25, 53.05], bl: [-10.7, -9.0] }, latch: { bl: -9.96, wl: 39.43 } };
export const CUSHION = 1 / 16;          // DESIGN: the carburettor / air-box stop is met this far (cable) before the quadrant stop, both ends
/** stroke an arm needs (chord between its stops, projected on the conduit axis u) and the rod's swing off that axis */
export function armStroke(A, mid, E, u) {
  const t0 = armTip(A, -A.travel / 2, mid), t1 = armTip(A, A.travel / 2, mid), n = 20; let lo = Infinity, hi = -Infinity, sw = 0, sMin = Infinity;
  for (let i = 0; i <= n; i++) { const t = armTip(A, -A.travel / 2 + A.travel * i / n, mid), d = sub(t, E), s = d[0] * u[0] + d[1] * u[1] + d[2] * u[2], lat = len(sub(d, mul(u, s))); lo = Math.min(lo, s); hi = Math.max(hi, s); sMin = Math.min(sMin, s); sw = Math.max(sw, Math.atan2(lat, s)); }
  return { stroke: hi - lo, ang: sw * 180 / Math.PI, rodMin: sMin, t0, t1 };
}
/** quadrant lever: cable attach radius below the pivot giving the arm's stroke plus the cushion at each end */
/** sized for the cushion with the design reserve (TGT 0.15): cushion ≥ 1.15 × 1/16 in at each end (ICD phase 2) */
export const CUSHION_TGT = 1.15;
export const leverR = (stroke) => Math.ceil((stroke + 2 * CUSHION * CUSHION_TGT) / (2 * Math.sin(QD.sweep / 2 * Math.PI / 180)) * 20) / 20;

// ------------------------------------------------------------------------------------------- runs
/** a run: nodes { p, clamp }, OD, minimum bend radius, class; built from corner points filleted at R (in) */
const N = (p, clamp) => ({ p: T3(p), ...(clamp ? { clamp } : {}) });
export function smooth(corners, R, clamps = {}) {
  const n = corners.length, out = [N(corners[0], clamps[0])];
  const L = corners.slice(1).map((q, i) => len(sub(q, corners[i])));
  for (let i = 1; i < n - 1; i++) {
    const P = corners[i], a = mul(sub(corners[i - 1], P), 1 / L[i - 1]), b = mul(sub(corners[i + 1], P), 1 / L[i]);
    const c = Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2])), th = Math.acos(c), defl = Math.PI - th, Ri = Array.isArray(R) ? R[i] : R;
    if (defl < deg(2) || !Ri) { out.push(N(P, clamps[i])); continue; }
    const t = Math.min(Ri * Math.tan(defl / 2), i - 1 === 0 ? 0.93 * L[i - 1] : L[i - 1] / 2, i + 1 === n - 1 ? 0.93 * L[i] : L[i] / 2), r = t / Math.tan(defl / 2), bis = add(a, b), bl = len(bis), ctr = add(P, mul(bis, r / Math.sin(th / 2) / bl));
    const p0 = add(P, mul(a, t)), p1 = add(P, mul(b, t)), u0 = sub(p0, ctr), u1 = sub(p1, ctr), m = Math.max(2, Math.ceil(defl / deg(5)));
    for (let k = 0; k <= m; k++) { const f = k / m, w0 = Math.sin((1 - f) * defl) / Math.sin(defl), w1 = Math.sin(f * defl) / Math.sin(defl); out.push(N(add(ctr, add(mul(u0, w0), mul(u1, w1))), k === Math.round(m / 2) ? clamps[i] : undefined)); }
  }
  out.push(N(corners[n - 1], clamps[n - 1]));
  return out.filter((q, i) => i === 0 || len(sub(q.p, out[i - 1].p)) > 2e-3 || (q.clamp && !out[i - 1].clamp));
}
const deg = (a) => a * Math.PI / 180;
export const CABLE = { od: 0.25, bendMin: 5.0, R: 7.0, inner: 0.078, rod: 0.156, rodEnd: '10-32', span: 18, swivel: 4 };   // ACS A-920: ~0.25 OD, 0.078 SS inner, 10-32 RH ends, min bend 5 in recommended (never < 3), swivel ±4° (Aircraft Spruce A-920 Q&A, accessed 2026-11-19); rod Ø BOUND
/** grommet positions (BL, WL) on the firewall: block A's layout centre BL −2.40, WL 29.60 */
export const GROMMET = { c: [-2.40, 29.60], r: 0.875, at: { throttle: [-2.44, 29.92], mixture: [-2.01, 29.54], heat: [-2.71, 29.34] } };   // rev B crossings (ICD H-O1): heat lowest and outboard, under the other two
export const BOOT = { c: [-2.20, 33.10], r: 1.25 };
export const MANI_HOLES = [[1.40, 33.40], [3.40, 33.40]];

// ------------------------------------------------------------------------------------------- control cables (LEZ-76-110)
const zAxis = (A) => A.pivot[2] + A.r * (1 + Math.cos(deg(A.travel / 2))) / 2;
/** conduit end fittings on the engine bracket (clamped to the carburettor) and the conduit axis at each */
/** the carb-heat conduit end (ICD H-O1): in the arm's plane (BL −4.60), on a bracket off the air box's left wall top, the
 *  conduit axis 25° down (rev C: 18°) so the rod meets the crank near square at mid-travel. Block G's bracket point (FS 160.20, WL 23.30)
 *  lies 0.40 in from the blister's inner skin with the blister's front face closing in ahead of it, so a 6 in conduit bend
 *  cannot reach it along +FS; FS 162.50, WL 24.75 is the nearest point with ≥ 0.5 in to the skin along the approach. */
/** rev C (2026-11-19): the ACS A-920 swivel allows ±4° (Aircraft Spruce A-920 Q&A: 8° total), so the conduit end stands back
 *  HEAT_BACK along its axis to lengthen the exposed rod and bring the swing under 4° */
export const HEAT_BACK = 1.5;
/** the axis 18° down (was 25°) through a point 0.30 in lower, so the rod's swing splits evenly about it over the crank's 90° (3.3°) */
export const HEAT_END = (() => { const a = HEAT_ARM_G.conduitDown * Math.PI / 180, u = [0, Math.cos(a), -Math.sin(a)]; return { E: [...HEAT_ARM_G.conduitEnd], u, s: 2.0 }; })();   // = block G's bracket (wpG4 HEAT_ARM_G, 18° axis, 1.5 in back)
export const CEND = (() => {
  const t = CARB_ARMS.throttle, m = CARB_ARMS.mixture, h = HEAT_ARM;
  return { throttle: { E: T3([t.bl, 133.05, zAxis(t)]), u: [0, 1, 0], arm: t, mid: 0 },   // rev C: 1.5 in further forward (A-920 swivel ±4°)
    mixture: { E: T3([m.bl, 135.50, zAxis(m)]), u: [0, 1, 0], arm: m, mid: 0 },
    heat: { E: T3(HEAT_END.E), u: HEAT_END.u, arm: h, mid: HEAT_MID } };   // conduit end on the air box's left wall top, in the arm's plane, 25° down (ICD H-O1)
})();
export const STROKE = Object.fromEntries(Object.entries(CEND).map(([k, c]) => [k, armStroke(c.arm, c.mid, c.E, c.u)]));
/** carb-heat knob stroke between its stops (the head's adjustable stop collar), rounded up to 0.05 in over arm + cushions */
export const HEAT_STOP = () => Math.ceil((STROKE.heat.stroke + 2 * CUSHION) * 20) / 20 + 0.05;
export const LEVER = { throttle: leverR(STROKE.throttle.stroke), mixture: leverR(STROKE.mixture.stroke) };
/** conduit heads at the quadrant's aft plate: on the line through the mid-sagitta of the lever's attach arc */
export const QHEAD = Object.fromEntries(['throttle', 'mixture'].map((k) => [k, T3([QD[k].bl, QD.aft.fs[1], QD.pivot[2] - LEVER[k] * (1 + Math.cos(deg(QD.sweep / 2))) / 2])]));
const gz = (k) => [GROMMET.at[k][0], FW_IN, GROMMET.at[k][1]];
/** through block A's rear-bulkhead hole (LEZ-53-175 at FS 130.2: centre BL −8.64, WL 30.32, r 0.875): the conduit's
 *  crossing at hBL, WL 30.32, on a straight run from FS 124 */
const viaRB = (bl, hBL) => { const a = [bl, 98.50, 31.0], h = [hBL, 104.70, 30.32]; return [a, a.map((v, i) => v + 2.4 * (h[i] - v))]; };
/** a point on the straight a→b at station fs (the cabin clamp ahead of the firewall) */
const onAt = (a, b, fs) => { const t = (fs - a[1]) / (b[1] - a[1]); return a.map((v, i) => v + t * (b[i] - v)); };
export const CABLE_CORNERS = {
  throttle: { pts: [QHEAD.throttle, [-9.49, 56.45, QHEAD.throttle[2]], [-9.30, 62.20, 31.8], [-9.65, 69.70, 31.0], [-9.65, 84.50, 31.0], ...viaRB(-9.65, -9.04), onAt(viaRB(-9.65, -9.04)[1], [-2.20, 125.70, 31.2], 119.0), [-2.20, 125.70, 31.2], [-2.74, 130.50, CEND.throttle.E[2]], CEND.throttle.E],   // rev C: conduit end 1.05 in forward
    R: [0, 7.5, 7.5, 7.5, 0, 7.5, 7.5, 0, 8.0, 6.0, 0], clamps: { 0: 'air', 2: 'air', 3: 'air', 4: 'air', 5: 'air', 6: 'air', 7: 'air', 9: 'eng', 10: 'eng' } },
  mixture: { pts: [QHEAD.mixture, [-9.20, 56.45, QHEAD.mixture[2]], [-8.95, 62.70, 32.0], [-9.25, 70.70, 31.0], [-9.25, 84.50, 31.0], ...viaRB(-9.25, -8.64), onAt(viaRB(-9.25, -8.64)[1], [-1.80, 125.50, 30.8], 119.0), [-1.80, 125.50, 30.8], [-2.25, 131.97, CEND.mixture.E[2]], CEND.mixture.E],
    R: [0, 7.5, 7.5, 7.5, 0, 7.5, 7.5, 0, 8.5, 10, 0], clamps: { 0: 'air', 2: 'air', 3: 'air', 4: 'air', 5: 'air', 6: 'air', 7: 'air', 9: 'eng', 10: 'eng' } },
  // rev B (ICD H-O1): down through the firewall boot under the throttle and mixture, through the blister's mouth inboard of its
  // front-left face, to the conduit end in the crank's plane; engine clamps (rev B) on the throttle / mixture conduit bracket
  heat: { pts: [[QD.heat.bl, QD.heat.fs, QD.heat.head[0]], [QD.heat.bl, QD.heat.fs, 30.5], [-8.85, 59.95, 31.0], [-8.85, 73.20, 31.0], [-8.85, 88.50, 31.0], ...viaRB(-8.85, -8.24), onAt(viaRB(-8.85, -8.24)[1], [-2.30, 125.90, 30.25], 119.0), [-2.30, 125.90, 30.25], [-3.253, 130.50, 27.85], CEND.heat.E.map((v, i) => v - HEAT_END.u[i] * HEAT_END.s), CEND.heat.E],   // rev C: conduit end 1.5 in back on an 18° axis (A-920 swivel)
    R: [0, 7.5, 0, 0, 0, 7.5, 7.5, 0, 7.5, 7.5, 7.5, 0], clamps: { 0: 'air', 1: 'air', 2: 'air', 3: 'air', 4: 'air', 5: 'air', 6: 'air', 7: 'air', 9: 'eng', 11: 'eng' } },
};
export const cableRun = (k) => { const c = CABLE_CORNERS[k]; return { name: `${k} cable`, od: CABLE.od, bendMin: CABLE.bendMin, span: CABLE.span, cls: 'cable', shield: true, nodes: smooth(c.pts, c.R, c.clamps) }; };
void r4;

// ------------------------------------------------------------------------------------------- key switch, P-leads, GEA harness
/** the key switch on block B's panel cut-out (LEZ-31-100 `CUTS` key: BL −9.40, WL 40.40), body behind the panel */
/** ACS A-510-2 keyed switch (ACS 11-03170): 2.28 in long behind the panel, 2.23 in at the widest, 7/8 in notched panel hole, 0.209 lb
 *  (Aircraft Spruce 11-03170 page, accessed 2026-11-19); round body envelope Ø 2.23 BOUND; max panel thickness not stated (BOUND). Rev 2026-11-19: centre 0.15 in outboard and 0.05 in down (BL −9.55, WL 40.35) to clear the warning panel; the 2.23 in body needs the 0.25 in local panel from a front counterbore or a thinner insert, not a rear spot-face (block B ask) */
export const KEYSW = { c: [-9.55, 40.25] /* integration 2026-11-19: 0.10 in down (B's 0.5 in edge rule with the 7/8 in hole; warning unit ≥ 0.25 in) */, face: 41.184, panelT: 0.443, seat: 0.02 /* the body's face sits on the panel's forward face: drawn 0.02 in off it (contact, not into the panel) */, body: { d: 2.23, L: 2.28 }, bushing: { d: 0.875, grip: 0.25 }, spot: { d: 1.25, depth: 0.20, from: 'aft (pilot) face', src: 'counterbore Ø 1.25 for the bezel nut (nut OD not published: BOUND); depth 0.20 leaves 0.243 in of panel for the 0.25 in bushing grip; the 2.23 in body seats on the uncut forward face (integration 2026-11-19, ICD B-S2)' }, lb: 0.209 };
export const KEY_TERM = [KEYSW.c[0], KEYSW.face - KEYSW.panelT - KEYSW.seat - KEYSW.body.L + 0.05, KEYSW.c[1]];   // terminal end of the body
/** boot positions of H's two bundles (inside block A's Ø 3.00 boot (rev C), leaving room for block I's runs) */
export const BOOT_AT = { plead: [-2.85, 33.00], gea: [-1.75, 33.75] };
export const PLEAD = { od: 0.20, bendMin: 2.0, span: 18 };      // two M27500-18TG1T14 in a sleeve (OD typed)
export const GEA = { od: 0.35, bendMin: 3.5, span: 18 };
const bz = (k, fs) => [BOOT_AT[k][0], fs, BOOT_AT[k][1]];
/** cabin tail of a raceway run: from its raceway node at FS ≤ 142 down below the CS spar (lower face WL 35.17) to the boot */
export const cabinTail = (k) => (k === 'plead' ? [[-6.60, 120.70, 33.6], [-3.60, 125.10, BOOT_AT.plead[1]], bz('plead', FW_IN), bz('plead', 128.20)] : [[-6.20, 120.70, 34.0], [-2.60, 125.10, BOOT_AT.gea[1]], bz('gea', FW_IN), bz('gea', 128.20)]);
/** bay: P-leads from the boot clamp to each magneto's P-lead terminal (engine-held clamp on the magneto flange) */
export const PLEAD_CORNERS = (sg) => {
  const t = PTERM(sg).b, B0 = bz('plead', 128.20);
  return sg < 0 ? [B0, [-7.82, 129.08, 31.33], [-7.05, 132.50, 37.01], [-4.60, 131.63, 39.40], t] : [B0, [-1.54, 130.76, 33.88], [2.72, 129.72, 34.61], [4.12, 129.79, 37.00], [4.06, 131.33, 39.38], t];
};
export const pleadRun = (sg) => { const c = PLEAD_CORNERS(sg), n = c.length, nodes = smooth(c, 2.8, { 0: 'air', [n - 2]: 'eng', [n - 1]: 'eng' }); return { name: `P-lead to the ${sg > 0 ? 'left' : 'right'} magneto`, od: PLEAD.od, bendMin: PLEAD.bendMin, span: PLEAD.span, cls: 'signal', shield: true, nodes, rigid: [1, nodes.length - 2] }; };

// ------------------------------------------------------------------------------------------- engine monitor: trunks, branches, probes
export const B0G = bz('gea', 128.20);                               // harness break just aft of the boot, clamped to the firewall
export const E1 = [0.00, 134.80, 40.80];                            // engine clamp on the accessory housing top (CHT / EGT trunk)
export const E2 = [-2.40, 133.60, 33.20];                           // engine clamp on the accessory face (oil-temperature and tach branch)
export const BR = { od: 0.22, bendMin: 2.2, span: 18 };             // one branch: CHT (J) and EGT (K) pairs, shielded, fire-sleeved
export const TRUNK = { od: 0.35, bendMin: 3.5 };
export const TRUNK_A = [B0G, [-4.59, 127.93, 36.71], [-2.14, 128.01, 41.86], [0.49, 132.83, 42.81], E1];
export const TRUNK_B = [B0G, [-2.44, 128.69, 31.63], [-2.99, 132.67, 31.33], E2];
const gapFS = (sg) => (sg < 0 ? (cylS.LR + cylS.LF) / 2 : (cylS.RR + cylS.RF) / 2) * 12;
export const TC = (k) => { const p = PLUG_AT(k, false).p; return [p[0], p[1], r4(p[2] - 0.72)]; };       // CHT bayonet under the bottom plug
export const TE = (k) => { const sg = k[0] === 'L' ? -1 : 1, s = cylS[k] * 12; return T3([sg * 11.64, s + 2.16, 30.72]); };   // EGT clamp on the stack riser
export const PK = (k) => { const sg = k[0] === 'L' ? -1 : 1, s = cylS[k] * 12; return k[1] === 'R' ? T3([sg * 12.0, s - 3.04, 31.4]) : T3([sg * 12.5, s - 3.04, 31.4]); };
/** branch corners from the trunk clamp E1 to the probe break PK: rear cylinders come down ahead of their barrel, front
 *  cylinders down the gap between the heads, outboard of the stacks, muff and SCAT */
export const BRANCH_CORNERS = (k) => {
  const sg = k[0] === 'L' ? -1 : 1, s = cylS[k] * 12, top = [sg * 5.0, 138.00, 43.0];
  if (k[1] === 'R') { const fs = s - 4.95; return [E1, top, [sg * 7.0, fs, 40.0], [sg * 7.0, fs, 32.4], PK(k)]; }
  const g = gapFS(sg); return [E1, top, [sg * 9.5, g, 42.3], [sg * 12.5, g, 39.6], [sg * 12.5, g, 32.2], PK(k)];
};
export const branchRun = (k) => { const c = BRANCH_CORNERS(k), n = c.length; return { name: `CHT / EGT branch, cylinder ${CYL_NO[k]}`, od: BR.od, bendMin: BR.bendMin, span: BR.span, cls: 'signal', shield: true, nodes: smooth(c, 2.8, { 0: 'eng', 1: 'eng', [n - 3]: 'eng', [n - 1]: 'eng' }) }; };
export const trunkRun = (which) => { const c = which === 'A' ? TRUNK_A : TRUNK_B, n = c.length; return { name: which === 'A' ? 'Sensor trunk to the CHT / EGT branches' : 'Sensor branch to the oil-temperature sender and the tach pick-up', od: which === 'A' ? TRUNK.od : BR.od, bendMin: which === 'A' ? TRUNK.bendMin : BR.bendMin, span: 18, cls: 'signal', shield: true, nodes: smooth(c, which === 'A' ? 4.0 : 3.2, { 0: 'air', [n - 1]: 'eng' }), rigid: [1] }; };

// ------------------------------------------------------------------------------------------- sensor manifold (LEZ-77-120)
/** 6061-T6 block on the firewall's fire layer (CRES face FS 153.141) on block A's two AN3 holes; three transducers stand
 *  on its top face, connectors up; -3 hoses leave the bottom face through AN822-3D elbows pointing aft */
export const MANI = { face: 127.641, bl: [0.40, 3.90], depth: 0.75, wl: [32.90, 33.90], ports: { MAP: 0.90, 'FUEL-P': 1.90, 'OIL-P': 2.90 }, xd: { d: 0.875, L: 1.75, conn: 0.75 }, elbow: { fs: 0.31, drop: 0.45 } };
MANI.fs = [MANI.face, MANI.face + MANI.depth];
MANI.mid = (MANI.fs[0] + MANI.fs[1]) / 2;
export const MANI_PORT = (k) => T3([MANI.ports[k], MANI.fs[1] + MANI.elbow.fs, MANI.wl[0] - MANI.elbow.drop]);
export const XD_TOP = (k) => T3([MANI.ports[k], MANI.mid, MANI.wl[1] + MANI.xd.L + MANI.xd.conn]);
export const maniEnvelope = () => [{ t: 'box', feat: 'LEZ-77-120 block', c: [(MANI.bl[0] + MANI.bl[1]) / 2, MANI.mid, (MANI.wl[0] + MANI.wl[1]) / 2], d: [MANI.bl[1] - MANI.bl[0], MANI.depth, MANI.wl[1] - MANI.wl[0]] },
  ...Object.values(MANI.ports).map((x) => ({ t: 'cyl', feat: 'LEZ-77-120 transducer', a: [x, MANI.mid, MANI.wl[1]], b: [x, MANI.mid, MANI.wl[1] + MANI.xd.L + MANI.xd.conn], r: MANI.xd.d / 2 })),
  ...Object.values(MANI.ports).map((x) => ({ t: 'box', feat: 'LEZ-77-120 elbow', c: [x, MANI.fs[1], MANI.wl[0] - 0.25], d: [0.5, 0.8, 0.5] }))];

// ------------------------------------------------------------------------------------------- sensor lines (LEZ-77-121)
/** engine ports for the lines: oil pressure on the accessory housing boss, MAP moved (rev B) to the sump's right side at the
 *  intake riser (approximate), fuel pressure from block F's tee at the carburettor inlet (F owns the tee) */
export const ENG_PORTS = { 'OIL-P': T3(OILP_BOSS.b), MAP: [4.00, 138.80, 29.80], 'CARB-PT': [1.92, 136.29, 27.36] };
export const HOSE3 = { od: 0.50, id: 0.125, bendMin: 2.5, span: 18, lbFt: 0.12 };   // -3 hose: 0.120 lb/ft, 3,000 psi (Aeroquip 303-3 data, Aircraft Spruce, accessed 2026-11-19); OD over the AS1072 sleeve BOUND
export const LINE_PORTS = { 'FUEL-P': 'CARB-PT', MAP: 'MAP', 'OIL-P': 'OIL-P' };
MANI.ports = { 'FUEL-P': 0.90, MAP: 1.90, 'OIL-P': 2.90 };
export const LINE_CORNERS = {
  'FUEL-P': [MANI_PORT('FUEL-P'), [0.68, 127.24, 27.51], [-0.85, 133.63, 26.81], ENG_PORTS['CARB-PT']],
  MAP: [MANI_PORT('MAP'), [6.01, 130.72, 32.42], [5.57, 132.71, 27.52], [3.64, 137.14, 27.51], ENG_PORTS.MAP],
  'OIL-P': [MANI_PORT('OIL-P'), [3.94, 129.66, 33.58], [4.27, 131.04, 34.42], [3.98, 132.80, 34.78], ENG_PORTS['OIL-P']],
};
export const lineRun = (k) => { const c = LINE_CORNERS[k], n = c.length, nodes = smooth(c, 3.4, { 0: 'air', [n - 1]: 'eng' }); return { name: `${k} line`, od: HOSE3.od, bendMin: HOSE3.bendMin, span: HOSE3.span, cls: k === 'FUEL-P' ? 'fuel' : k === 'OIL-P' ? 'oil' : 'air', shield: true, nodes, rigid: [1, nodes.length - 2] }; };

// ------------------------------------------------------------------------------------------- branches to the manifold and the fuel-flow transducer (LEZ-77-111)
export const FFT_AT = [3.96, 123.54, 28.80];                       // LEZ-77-130 centre (block F's lines end on its ports: unchanged)
export const FFT = { L: 1.90, w: 1.62, h: 1.375, lb: 0.33, port: 0.95 };   // EI FT-60: 1.90 L × 1.62 W × 1.375 H, 5.3 oz, 1/4 NPT female (electronicsinternational.com, accessed 2026-11-19)
export const MANI_BRANCH = [B0G, [0.20, 128.30, 37.30], [2.90, 128.20, 37.30]];
export const FFT_BRANCH = (tail) => { const q = tail.find((p) => p[1] >= 122.70) || tail[0]; return [q, [0.00, 123.30, 33.00], [FFT_AT[0], FFT_AT[1], 31.45]]; };
export const smallRun = (name, c, cl, o = {}) => ({ name, od: 0.25, bendMin: 2.5, span: 18, cls: 'signal', shield: true, nodes: smooth(c, 2.8, cl), ...o });
