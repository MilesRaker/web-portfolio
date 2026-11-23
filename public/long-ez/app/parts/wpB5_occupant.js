// WPB5 — occupant accommodation checks (block B; Miles's decision 2026-11-20): hand reach from each occupant's shoulder to each
// primary control through its travel, leg reach to the rudder pedals through full travel with the toe brakes applied, leg
// clearance for the largest occupant with the pedals at full travel, and head clearance under the canopy in both seats. The
// occupants are ANSUR II's 5th-percentile female, 50th-percentile male and 95th-percentile male (wpB5_ansur.js, Gordon et al.
// 2012, NATICK/TR-15/007). Each check returns its margin; the records carry them as rules (revs_occupant.js).
//
// Occupant model (stated; every input is ANSUR II or the airframe as modelled; nothing typed):
//  • Seated on the cushion top uncompressed (ANSUR II measures on a hard seat). Front: the back on the lower pad (block A's reclined
//    LEZ-53-170) and the upper pad (LEZ-53-171's vertical face), on the line from the hip point that clears both (wpB4 OCCS;
//    occupant-12: the headrest pads are no longer on it). Rear: the back on the upright pad on LEZ-53-175.
//  • Shoulder (occupant-12): the acromion is ½ chest depth (ANSUR II dim. 25) forward of the back surface, normal to the torso line, at
//    sitting acromion height along it (wpB4 OCCS.acro); BL ± half the biacromial breadth. The back-surface point at that height is
//    where the shoulder strap leaves the body (the strap-angle model, OCCS.front / .rear). Was (seat-2): the acromion on the back
//    surface, which put half the head inside the seat back.
//  • Head (occupant-12): on a neck link from the acromion to the ear (sitting height − sitting acromion height − tragion-top of
//    head), plumb when erect (ear over shoulder). The head keeps its erect attitude (eyes level). Front seat: when the headrest pad is
//    behind the back of the head (½ head length aft of the ear, ANSUR II dim. 47) at its height, the neck tilts until the head rests on
//    the pad (or is pushed forward by it); otherwise the head stays erect. Vertex tragion-top above the ear; eye (eye height,
//    sitting − (sitting height − tragion-top)) above the ear, at the ear's FS (the eye's ~3 in forward offset is not modelled).
//    Not modelled: cushion compression under the occupant (would lower everyone; not sourced), the head tilting back with a
//    reclined torso without support.
//  • Hand reach with the harness locked: a sphere about the acromion of radius grip reach (shoulder-elbow + radiale-stylion +
//    ½ palm) for knobs, handles and the stick, fingertip reach (… + hand length) for toggles and the key. The shoulder does not
//    move (locked harness, no lean): the reach model of the harness-locked zone.
//  • Legs in the pedal's BL plane (BL ±4.32): the thigh from the rearmost buttock (on the pad face at thigh-mid height above the
//    cushion top) to the knee, link buttock-popliteal length; the shank from the knee to the heel, link popliteal height; the
//    foot square to the shank (ankle neutral), the ball of the foot ball-of-foot length from the heel. Reach: the ball on the
//    toe plate's centre with the knee straight reaches √(leg² + ball²) from the buttock. Clearance: knee up, solved for the
//    ball on the toe plate; thigh radius ½ thigh clearance tapering to the knee radius ½ (knee height sitting − popliteal height),
//    shank at the knee radius.
// Notional; not for construction.
import { partByPN } from '../systems.js';
import { CAB, OCCS, backFace, BACK_N, PAD_F } from './wpB4_cabin.js';
import { suFace } from './wpA4_seatback.js';
import { L as LC, ARM as ARMC, SZ as SZC } from './wpC1_controls.js';
import { TRAVEL as TRAVEL_C } from './wpC9_icd.js';
import { QD } from './wpH1_layout.js';
import { FL as FL_F } from './wp1_powerplant.js';
import { canPt, CANF } from './wpB1_canopy.js';
import { CL } from './canopy_layout.js';
import { PNL, PANEL, CUTS, insidePoly, edgeDist } from './wpB3_panel.js';
import { ANSUR_SRC, OCC_KEYS, OCC_NAME, ans, DERIVED, DERIVED_SRC, cite } from './wpB5_ansur.js';
export { OCC_KEYS, OCC_NAME };

const D2R = Math.PI / 180, hyp = Math.hypot, r2 = (v) => Math.round(v * 100) / 100;
/** DESIGN requirements (stated here, not sourced): head 1.0 in under the canopy's inner surface; legs 0.5 in from the panel,
 *  equipment, stick and consoles */
export const OCC_REQ = { head: 1.0, leg: 0.5, src: 'DESIGN: 1.0 in head, 0.5 in leg clearance (stated design values, not from a standard)' };
export const OCC_OPEN = 'OPEN ITEM (coordinator / Miles, 2026-11-20): the cockpit geometry (floor and pan WL, canopy height, seat-back FS, panel and pedal FS) does not accommodate the ANSUR II occupants; the checks carry their real margins until Miles decides the layout (docs/blocks/occupant.md).';

// ------------------------------------------------------------------------------------------- the occupants as seated
const cz = (s = 'front') => (s === 'front' ? CAB.pan.front.top : CAB.pan.top) + CAB.seat.foam;   // seat-3: the front seat on the belly liner
/** the front back pad's forward face at WL z: FS */
const padFS = (z) => { const a = backFace(PAD_F.v0), b = backFace(PAD_F.v0 + 10), n = BACK_N, k = CAB.seat.back, p = [a[0] + n[0] * k, a[1] + n[1] * k], q = [b[0] + n[0] * k, b[1] + n[1] * k]; return p[0] + (z - p[1]) * (q[0] - p[0]) / (q[1] - p[1]); };
/** occupant o in seat s ('front' | 'rear'): landmarks [FS, BL, WL] (in) */
/** the head on the neck (occupant-12): the neck link runs from the shoulder joint A to the ear (tragion), length sitting height −
 *  acromion height, sitting − tragion-top of head; erect it is plumb (ear over shoulder, the standard plumb line). The head keeps
 *  its erect attitude (eyes level) and rides on the neck's tilt φ (aft positive). Its back (opisthocranion) is ½ head length aft of
 *  the ear. The pilot lets the head back onto the headrest pad when the pad is behind the back of the head at its height: φ is
 *  solved for the back of the head on the pad face, within φ ∈ [0, torso lean]; a pad in front of the erect head pushes it forward
 *  (φ < 0). No pad at that height: the head stays erect (φ = 0) */
const HEAD_REST = (s, c) => s === 'front' ? { fs: suFace()[0] - PAD_F.head.t - c, z0: PAD_F.head.z0, z1: PAD_F.head.z1 } : null;
function headPose(o, s, a) {
  const A = a.pt, nL = ans('sitHt', o) - ans('acromSit', o) - ans('tragionTop', o), back = ans('headLen', o) / 2, pad = HEAD_REST(s, a.cushion);
  const ear = (phi) => [A[0] + nL * Math.sin(phi), A[1] + nL * Math.cos(phi)];
  let phi = 0, rest = 'erect (no headrest behind the head)';
  if (pad) { const g = (f) => ear(f)[0] + back - pad.fs;   // back of the head aft of the pad face (+ = into the pad)
    const lo = -20 * D2R, hi = a.lean;
    if (g(lo) <= 0 && g(hi) >= 0) { let x0 = lo, x1 = hi; for (let i = 0; i < 60; i++) { const m = (x0 + x1) / 2; if (g(m) < 0) x0 = m; else x1 = m; } const f = (x0 + x1) / 2, z = ear(f)[1];
      if (z >= pad.z0 - 0.5 && z <= pad.z1 + 0.5) { phi = f; rest = f >= 0 ? 'resting back on the headrest pad' : 'pushed forward by the headrest pad'; }
      else if (g(0) > 0 && z < pad.z0) rest = 'erect (the headrest is above the back of the head)';
      else rest = 'erect (the headrest is below the back of the head)'; }
    else if (g(hi) < 0) rest = 'erect (the headrest is out of reach behind the head)'; }
  const E = ear(phi), occ = [E[0] + back, E[1]];
  return { ear: E, occiput: occ, phi: phi / D2R, rest, neck: nL };
}
/** occupant o in seat s ('front' | 'rear'): landmarks [FS, BL, WL] (in). occupant-12: the shoulder is the joint (wpB4 OCCS.acro, ½ chest
 *  depth forward of the back), the head on the neck (headPose); eye and vertex above the ear by (eye height, sitting − (sitting
 *  height − tragion-top)) and tragion-top, at the ear's FS */
export function occupant(o, s = 'front') {
  const a = OCCS.acro[s][o], sh = a.pt, bl = DERIVED.shBL(o), z0 = cz(s), H = headPose(o, s, a), E = H.ear, eyeUp = ans('eyeSit', o) - (ans('sitHt', o) - ans('tragionTop', o));
  const rT = ans('thighClr', o) / 2, buttFS = s === 'front' ? padFS(z0 + rT) : CAB.backR.fs - CAB.seat.back;
  return { o, s, shoulder: { L: [sh[0], -bl, sh[1]], R: [sh[0], bl, sh[1]] }, back: OCCS[s][o], head: H, eye: [E[0], 0, E[1] + eyeUp], vertex: [E[0], 0, E[1] + ans('tragionTop', o)], occiput: [H.occiput[0], 0, H.occiput[1]],
    butt: [buttFS, 0, z0 + rT], rT, rK: (ans('kneeSit', o) - ans('popHt', o)) / 2, thigh: ans('buttPop', o), shank: ans('popHt', o), ball: ans('ballFoot', o), leg: DERIVED.leg(o), grip: DERIVED.grip(o), tip: DERIVED.tip(o) };
}

// ------------------------------------------------------------------------------------------- the controls through their travel
/** a point on a stick axis h in above its pivot G at roll r and pitch p (deg), as block C's wpC9 stickPt */
const stickPt = (G, h, r, p, cant) => { const a = (r - cant) * D2R, b = p * D2R, hc = h * Math.cos(b); return [G[0] - h * Math.sin(b), G[1] + hc * Math.sin(a), G[2] + hc * Math.cos(a)]; };
const travel = (G, h) => { const o = []; for (const r of [-1, 0, 1]) for (const p of [-1, 0, 1]) o.push(stickPt(G, h, r * TRAVEL_C.roll, p * TRAVEL_C.pitch, LC.cant)); return o; };
const knob = (r, a, bl) => [QD.pivot[1] - r * Math.sin(a * D2R), bl, QD.pivot[2] + r * Math.cos(a * D2R)];
const latchKnob = (a) => { const la = a + CL.leverOff; return [(CL.P[0] + CL.lever * Math.cos(la)) * 12, CL.yR * 12, (CL.P[1] + CL.lever * Math.sin(la)) * 12]; };
/** the toggles' bat tips stand 0.7 in aft of the panel's aft face (MS24524 bat, DESIGN); row and key from block B's panel cut-outs */
const SW = CUTS.find((c) => c.id === 'sw'), KEY = CUTS.find((c) => c.id === 'key'), TIP = PNL.aft + 0.7;
const trimEnd = (sg) => { const P = LC.trimPiv, hS = CAB.console.right.zTop - P[2], a = Math.atan((2.0 - 0.25) / hS); return [P[0] + sg * 3.0 * Math.sin(a), P[1], P[2] + 3.0 * Math.cos(a)]; };
/** id → { pn, what, seat, hand (+1 right, −1 left), reach 'grip' | 'tip', pts: positions over the travel } */
export const CONTROLS = {
  stick: { pn: 'LEZ-27-110', what: 'front stick grip, full pitch × roll travel', seat: 'front', hand: 1, reach: 'grip', pts: () => travel(LC.G1, ARMC.grip) },
  throttle: { pn: 'LEZ-76-100', what: `throttle knob over its ${QD.sweep}° sweep`, seat: 'front', hand: -1, reach: 'grip', pts: () => [-1, 0, 1].map((k) => knob(QD.throttle.knob.r, k * QD.sweep / 2, QD.throttle.knob.bl)) },
  mixture: { pn: 'LEZ-76-100', what: `mixture knob over its ${QD.sweep}° sweep`, seat: 'front', hand: -1, reach: 'grip', pts: () => [-1, 0, 1].map((k) => knob(QD.mixture.knob.r, k * QD.sweep / 2, QD.mixture.knob.bl)) },
  carbHeat: { pn: 'LEZ-76-100', what: `carb-heat knob pushed and pulled (${QD.heat.stroke} in)`, seat: 'front', hand: -1, reach: 'grip', pts: () => [0, QD.heat.stroke].map((k) => [QD.heat.fs, QD.heat.bl, QD.heat.knob.z + k]) },
  fuelSel: { pn: 'LEZ-28-135', what: 'fuel selector knob (remote drive)', seat: 'front', hand: -1, reach: 'grip', pts: () => [[FL_F.drive.H[1], FL_F.drive.H[0], FL_F.drive.H[2]]] },
  trim: { pn: 'LEZ-27-165', what: 'pitch trim knob over the friction guide', seat: 'front', hand: 1, reach: 'grip', pts: () => [trimEnd(-1), trimEnd(1)] },
  latch: { pn: 'LEZ-52-110', what: 'canopy latch handle knob from inside, locked and open', seat: 'front', hand: -1, reach: 'grip', pts: () => [latchKnob(CL.aLock), latchKnob(CL.aOpen)] },
  master: { pn: 'LEZ-31-140', what: 'MASTER toggle (switch row, inboard end)', seat: 'front', hand: 1, reach: 'tip', pts: () => [[TIP, SW.rect[0] + 0.35, (SW.rect[2] + SW.rect[3]) / 2]] },
  lbSwitch: { pn: 'LEZ-31-140', what: 'landing-brake switch S9 (switch row, outboard end)', seat: 'front', hand: 1, reach: 'tip', pts: () => [[TIP, SW.rect[1] - 0.35, (SW.rect[2] + SW.rect[3]) / 2]] },
  key: { pn: 'LEZ-74-100', what: 'ignition / magneto / start key switch', seat: 'front', hand: -1, reach: 'tip', pts: () => [[TIP, KEY.circ[0], KEY.circ[1]]] },
  rearStick: { pn: 'LEZ-27-111', what: 'rear stick grip, full pitch × roll travel', seat: 'rear', hand: 1, reach: 'grip', pts: () => travel(LC.G2, ARMC.gripR) },
};
/** hand reach: the farthest travel point from the occupant's shoulder on that side; MS = reach / distance − 1 */
export function handReach(id, o) {
  const c = CONTROLS[id], q = occupant(o, c.seat), sh = c.hand > 0 ? q.shoulder.R : q.shoulder.L, lim = c.reach === 'grip' ? q.grip : q.tip;
  let w = { d: -1 }; for (const p of c.pts()) { const d = hyp(p[0] - sh[0], p[1] - sh[1], p[2] - sh[2]); if (d > w.d) w = { d, p }; }
  return { id, o, d: w.d, at: w.p, sh, lim, ms: lim / w.d - 1 };
}

// ------------------------------------------------------------------------------------------- legs and the rudder pedals
/** the toe plate's centre on its aft face (block C's pedal primitives wpC2: toe plate 3.0 × 2.4 in at FS 35.45, WL 34.5) */
const TOE = { fs: 35.45 + 0.095, wl: 34.5 };
const rot = (p, c, a) => { const x = p[0] - c[0], z = p[1] - c[1]; return [c[0] + x * Math.cos(a) - z * Math.sin(a), c[1] + x * Math.sin(a) + z * Math.cos(a)]; };
const fwdOf = (p, c, deg) => [rot(p, c, deg * D2R), rot(p, c, -deg * D2R)].sort((a, b) => a[0] - b[0]);
/** the ball-of-foot point [FS, WL]: full rudder travel forward (pedal about its pivot) and the toe brake at its stop (the toe
 *  plate about its hinge, TOE_STOP, block C), or full travel aft without braking */
export function pedalBall(which, toeDeg = 0) {
  const piv = [LC.ped.s, LC.ped.z], hinge = [LC.toeHinge[0], LC.toeHinge[2]], b = toeDeg ? fwdOf([TOE.fs, TOE.wl], hinge, toeDeg)[0] : [TOE.fs, TOE.wl], e = fwdOf(b, piv, TRAVEL_C.pedal);
  return which === 'fwd' ? e[0] : e[1];
}
/** leg reach: the ball on the toe plate at full travel forward, brake applied; MS = √(leg² + ball²) / distance − 1 */
export function legReach(o, toeDeg) {
  const q = occupant(o), p = pedalBall('fwd', toeDeg), d = hyp(p[0] - q.butt[0], p[1] - q.butt[2]), lim = hyp(q.leg, q.ball);
  return { o, d, lim, ball: p, butt: q.butt, ms: lim / d - 1 };
}
/** the leg posed on the aft-most pedal (full travel back): knee up; if the pedal is out of reach, the straight leg toward it */
export function legPose(o, y = LC.ped.y) {
  const q = occupant(o), B = [q.butt[0], q.butt[2]], P = pedalBall('aft'), l2 = hyp(q.shank, q.ball), dx = P[0] - B[0], dz = P[1] - B[1], d = hyp(dx, dz), u = [dx / d, dz / d];
  let K, reach = true;
  if (d >= q.thigh + l2) { reach = false; K = [B[0] + u[0] * q.thigh, B[1] + u[1] * q.thigh]; }
  else { const a = (q.thigh ** 2 - l2 ** 2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, q.thigh ** 2 - a * a)), c = [B[0] + a * u[0], B[1] + a * u[1]], K1 = [c[0] - h * u[1], c[1] + h * u[0]], K2 = [c[0] + h * u[1], c[1] - h * u[0]]; K = K1[1] > K2[1] ? K1 : K2; }
  const kb = reach ? [(P[0] - K[0]) / l2, (P[1] - K[1]) / l2] : u, phi = Math.atan2(q.ball, q.shank), Hs = [-1, 1].map((sg) => { const v = rot([kb[0], kb[1]], [0, 0], sg * phi); return [K[0] + v[0] * q.shank, K[1] + v[1] * q.shank]; }).sort((a, b) => a[1] - b[1]);
  const H = Hs[0];
  return { o, y, reach, B, K, H, ball: P, rT: q.rT, rK: q.rK, kneeTop: K[1] + q.rK, segs: [[B, K, q.rT, q.rK], [K, H, q.rK, q.rK]] };
}
// obstacles, in [FS, BL, WL] in
const ft = (v) => v.map((x) => x * 12);
const boxD = (p, c, d) => hyp(...p.map((x, i) => Math.max(0, Math.abs(x - c[i]) - d[i] / 2)));
const segD = (p, a, b) => { const v = b.map((x, i) => x - a[i]), L2 = v.reduce((s, x) => s + x * x, 0), t = Math.max(0, Math.min(1, v.reduce((s, x, i) => s + x * (p[i] - a[i]), 0) / (L2 || 1))); return hyp(...p.map((x, i) => x - a[i] - t * v[i])); };
const panelD = (p) => { const dF = Math.max(0, PNL.fwd - p[0], p[0] - PNL.aft), yz = [p[1], p[2]], dP = insidePoly(yz, PANEL.pts) ? 0 : edgeDist(yz); return hyp(dF, dP); };
/** the equipment behind and on the panel (instrument backs), the shelf over the pedals, the nose-wheel well and the gear crank */
const BACKS = ['LEZ-31-110', 'LEZ-31-120', 'LEZ-31-130', 'LEZ-31-140', 'LEZ-31-150', 'LEZ-31-160', 'LEZ-24-130', 'LEZ-74-100', 'LEZ-77-100', 'LEZ-34-100', 'LEZ-25-160', 'LEZ-32-220', 'LEZ-32-214'];
const equipD = (p) => { let w = { d: Infinity }; for (const pn of BACKS) for (const g of partByPN(pn)?.geo || []) { let d = Infinity;
  if (g.t === 'box' && g.c && g.d) d = boxD(p, ft(g.c), ft(g.d)); else if (g.t === 'cyl' && g.a && g.b) d = segD(p, ft(g.a), ft(g.b)) - g.r * 12; else if (g.t === 'sphere' && g.c) d = hyp(...p.map((x, i) => x - g.c[i] * 12)) - g.r * 12; else continue;
  if (ft(g.c || g.a)[0] > PNL.aft + 0.5 && ft(g.b || g.c || g.a)[0] > PNL.aft + 0.5) continue;   // only what is at or forward of the panel
  if (d < w.d) w = { d, pn }; } return w; };
const stickD = (p) => { let m = Infinity; const rr = (SZC.stick[0] + 0.2) / 2; for (const r of [-1, 0, 1]) for (const q of [-1, 0, 1]) { const a = stickPt(LC.G1, 0, r * TRAVEL_C.roll, q * TRAVEL_C.pitch, LC.cant), b = stickPt(LC.G1, ARMC.grip + 1, r * TRAVEL_C.roll, q * TRAVEL_C.pitch, LC.cant); m = Math.min(m, segD(p, a, b) - rr); } return m; };
const consoleD = (p) => { const C = CAB.console; let m = Infinity; for (const [k, sg] of [['left', -1], ['right', 1]]) { const q = C[k], z0 = q.zTop - C.sand.t - C.lip, c = [(q.fs[0] + q.fs[1]) / 2, sg * (q.inb + 3), (z0 + q.zTop) / 2]; m = Math.min(m, boxD(p, c, [q.fs[1] - q.fs[0], 6, q.zTop - z0])); } return m; };
const OBST = { panel: ['panel (lower edge and face)', panelD], equip: ['instrument backs, avionics shelf, nose-wheel well and crank', (p) => equipD(p).d], stick: ['front stick over its travel', stickD], console: ['side consoles', consoleD] };
/** clearance (in) of the posed leg to each obstacle, both legs (BL ±y), sampled every 0.1 in along the thigh and shank */
export function legClear(o = 'm95') {
  const out = {}; for (const k of Object.keys(OBST)) out[k] = { d: Infinity };
  for (const sg of [-1, 1]) { const P = legPose(o, sg * LC.ped.y);
    for (const [a, b, ra, rb] of P.segs) { const n = Math.max(2, Math.ceil(hyp(b[0] - a[0], b[1] - a[1]) / 0.1));
      for (let i = 0; i <= n; i++) { const t = i / n, p = [a[0] + (b[0] - a[0]) * t, sg * LC.ped.y, a[1] + (b[1] - a[1]) * t], r = ra + (rb - ra) * t;
        for (const [k, [, f]] of Object.entries(OBST)) { const d = f(p) - r; if (d < out[k].d) out[k] = { d, at: p, side: sg }; } } } }
  return { o, pose: legPose(o), out };
}
export const OBST_NAME = Object.fromEntries(Object.entries(OBST).map(([k, [n]]) => [k, n]));

// ------------------------------------------------------------------------------------------- head under the canopy
/** clearance (in) from the vertex to the canopy's inner surface (acrylic) on the centre line at the vertex FS */
export function headClear(o, s) { const q = occupant(o, s), v = q.vertex, top = canPt(v[0] / 12, Math.PI / 2, -CANF.acrylic)[1]; return { o, s, vertex: v, eye: q.eye, canopy: top, gap: top - v[2], rest: q.head.rest, phi: q.head.phi }; }

// ------------------------------------------------------------------------------------------- the rules the records carry
const f1 = (v) => v.toFixed(1), f3 = (v) => v.toFixed(3);
const SRCR = `${ANSUR_SRC}; reach ${DERIVED_SRC.grip} / fingertip ${DERIVED_SRC.tip}; model in wpB5_occupant.js`;
/** one rule per control: v = the worst occupant's MS (min 0); the label carries every occupant's distance and limit */
export function reachRule(id) {
  const c = CONTROLS[id], rs = OCC_KEYS.map((o) => handReach(id, o)), w = rs.reduce((a, b) => (b.ms < a.ms ? b : a));
  return { id: `reach-${id}`, label: `Occupant hand reach (${c.reach === 'grip' ? 'grip' : 'fingertip'}, harness locked), ${c.what}: ${rs.map((r) => `${r.o} ${f1(r.d)} / ${f1(r.lim)} in MS ${f3(r.ms)}`).join(', ')} (ANSUR II; ${w.o} governs) (MS)`, v: w.ms, min: 0, occ: true, src: SRCR };
}
export function legReachRule() {
  const toe = TOE_DEG(), rs = OCC_KEYS.map((o) => legReach(o, toe)), w = rs.reduce((a, b) => (b.ms < a.ms ? b : a));
  return { id: 'reach-pedal', label: `Occupant leg reach to the toe plate at full rudder travel with the toe brake at its stop (${f1(toe)}°), knee straight: ${rs.map((r) => `${r.o} ${f1(r.d)} / ${f1(r.lim)} in MS ${f3(r.ms)}`).join(', ')} (ANSUR II, ${DERIVED_SRC.leg}) (MS)`, v: w.ms, min: 0, occ: true, src: SRCR };
}
export function legClearRules() {
  const L = legClear('m95'), P = L.pose;
  return Object.entries(L.out).map(([k, r]) => ({ id: `legclr-${k}`, label: `95th-male leg clearance to the ${OBST_NAME[k]}, pedal at full travel aft (${P.reach ? `knee at FS ${f1(P.K[0])} / WL ${f1(P.K[1])}` : 'pedal out of reach: straight leg toward it'}): ${f1(r.d)} in at FS ${f1(r.at[0])}, BL ${f1(r.at[1])}, WL ${f1(r.at[2])} (≥ ${OCC_REQ.leg} in, ${OCC_REQ.src}) (in)`, v: r.d, min: OCC_REQ.leg, occ: true, src: SRCR }));
}
export function headRule(s) {
  const rs = OCC_KEYS.map((o) => headClear(o, s));
  return { id: `head-${s}`, label: `Head clearance under the canopy, ${s} seat, 95th-percentile male (head on the neck, ${occupant('m95', s).head.rest}): vertex FS ${f1(rs[2].vertex[0])} / WL ${f1(rs[2].vertex[2])}, canopy inner WL ${f1(rs[2].canopy)}: ${f1(rs[2].gap)} in (${rs.slice(0, 2).map((r) => `${r.o} ${f1(r.gap)}`).join(', ')}) (≥ ${OCC_REQ.head} in, ${OCC_REQ.src}) (in)`, v: rs[2].gap, min: OCC_REQ.head, occ: true, src: SRCR };
}
let TOE_DEG = () => 0;
/** block C's toe stop angle (c27_pedals TOE_STOP), registered by revs_occupant.js (a definition module) */
export const setToeStop = (f) => { TOE_DEG = f; };
/** the occupants' landmarks, for the record notes and docs/blocks/occupant.md */
export const occTable = () => Object.fromEntries(['front', 'rear'].map((s) => [s, Object.fromEntries(OCC_KEYS.map((o) => { const q = occupant(o, s); return [o, { shoulder: q.shoulder.R.map(r2), eye: q.eye.map(r2), vertex: q.vertex.map(r2), butt: q.butt.map(r2) }]; }))]));
void cite;
