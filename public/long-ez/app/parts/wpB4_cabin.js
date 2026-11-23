// WPB4 — cockpit interior (ATA 25): floor pans, webs and thigh support LEZ-25-100; side consoles / armrests LEZ-25-110;
// cushions LEZ-25-120 / -121; restraint harnesses LEZ-25-130; baggage shelf, net and tie-downs LEZ-25-140; carpet and the
// cabin vent LEZ-25-150. The geometry is placed between what the model already routes through the cockpit (landing-brake
// actuator, under-floor lines, throttle cables and side raceways, roll tube, fuel feed and selector): every envelope is
// checked against every other block's line and box, and a clash is either designed out or listed as a re-route ask with
// its owner. Seat backs are block A's (front LEZ-53-170 top at FS 97.2, rear LEZ-53-175 at FS 130.2): the cushions and
// the shoulder-harness anchors are placed against the lines below. Inches; x = BL, y = FS, z = WL. Notional.
import { GEO, FIXED, CORES, FUS_SHAPE, fusAt, BASE_MAT, registerChecks, mk, psi, allowB, plyRF, effective, materials, DEFAULT_DESIGN } from '../structures.js';
import { plyWeight } from '../plybook.js';
import { PARTS, partByPN } from '../systems.js';
import { canPt, tCut, CANF, bandAt } from './wpB1_canopy.js';
import { CL } from './canopy_layout.js';
import { tidy, groupVols, massFrom, RHO, bboxOf } from '../defn/blkB_prims.js';
import { L as LC, ARM as ARMC, SZ as SZC, LB, LOADS as LOADSC } from './wpC1_controls.js';
import './wpC2_prims.js';
import { consoleEnvelope, TRAVEL as TRAVEL_C } from './wpC9_icd.js';   // block C's system geometry (stick, actuator) is final before the cabin reads it
import { SB, SBP, SBG, SU, SUG, suFace, suAnchorPt } from './wpA4_seatback.js';
import * as A4 from './wpA4_seatback.js';   // optional: A's design shoulder point and strap angle (rev C)
export const A_SHOULDER = typeof A4.shoulderPt === 'function' ? A4.shoulderPt : null, A_STRAP = typeof A4.strapAngle === 'function' ? A4.strapAngle : null;
import { RB, RBG } from './wpA2_rearbhd.js';
import { ans } from './wpB5_ansur.js';

const tB = BASE_MAT.BID.t, IN_ = (n, v, u, s = 'DERIVED') => [n, v, u, s], TGT = 0.15, T = CANF.t;
const sp = (v, e) => Math.sign(v) * Math.abs(v) ** e;
const yz = (s, t, off) => { const f = fusAt(s), w = f.w / 2 * 12 + off, h = (f.top - f.bot) / 2 * 12 + off, zc = (f.top + f.bot) / 2 * 12, sn = Math.sin(t); return [w * sp(Math.cos(t), FUS_SHAPE.side), zc + h * sp(sn, sn < 0 ? FUS_SHAPE.belly : FUS_SHAPE.top)]; };
/** inner belly WL at station fs (in) and BL y (in) */
export function bellyAt(fs, y) { const s = fs / 12; let lo = -Math.PI / 2, hi = 0; for (let i = 0; i < 50; i++) { const m = (lo + hi) / 2; if (yz(s, m, -T)[0] < Math.abs(y)) lo = m; else hi = m; } return yz(s, lo, -T)[1]; }
/** inner wall BL (in, magnitude) at station fs and WL z (in) */
export function wallIn(fs, z) { const s = fs / 12; let lo = -Math.PI / 2 + 0.01, hi = tCut(s, -T); for (let i = 0; i < 50; i++) { const m = (lo + hi) / 2; if (yz(s, m, -T)[1] < z) lo = m; else hi = m; } return yz(s, lo, -T)[0]; }

// ------------------------------------------------------------------------------------------- the layout (design values)
const SAND = (nB, core) => ({ nB, core, t: core + 2 * nB * tB });
export const CAB = {
  // integration 2026-11-19 (Miles, shoulder-harness decision): the occupants sit 2.0 in lower: both pans recessed 1.0 in toward the
  // belly (top WL 29.5 → 28.5) and the cushions 1.0 in thinner (3.0 → 2.0 in) in the firmer Confor CF-47EG, within the existing recline
  pan: { top: 28.5, front: { fs: [44.00, 62.50] /* seat-1 2026-11-22: front edge 50 → 44 with the seat (aft edge follows the seat back) */, hw: 8.6 }, rear: { fs: [82.50, 96.00], hw: 7.6 }, web: 0.40, sand: SAND(2, 0.75) },
  // seat-1 2026-11-22: the thigh ramp moves forward with the seat to just aft of the panel (aft face FS 41.2) and rises at the
  // plans' 30° (pilot seat floor: front ramp 30°, back end 45° to the seat back; aryjglantz.com); was FS 44–50 to WL 31.0
  thigh: { fs: [41.50, 44.00], hw: 7.0, zFront: +(28.5 + 2.5 * Math.tan(Math.PI / 6)).toFixed(2) },
  console: { left: { fs: [45.75, 62.50], zTop: 39.15 /* 2026-11-22, was 39.25: 0.25 in under the canopy hook tongues (was 0.19) */, inb: 8.7 /* seat-1 2026-11-22, was 8.6: as the right */ }, right: { fs: [46.02, 62.50], zTop: 38.6, inb: 8.7 /* seat-1 2026-11-22, was 8.6: 0.5 in to the 95th-male thigh, now higher beside the hip */ }, sand: SAND(2, 0.37), lip: 0.75 },   // core 0.37 (2026-11-19, was 0.375): the 7725 cured ply grew to 0.0113 in, so the core takes up the difference and the console keeps its 0.415 in depth over block G's LEZ-76-100
  seat: { foam: 2.0, foamSpec: 'Confor CF-47EG (the firmest of the CONFOR EG range; density taken as CF-45EG\'s 6.0 lb/ft³, 3M/Aearo MSS50: BOUND for CF-47)', back: 2.0, front: { fs: [44.00, 62.30] /* follows the front pan (set below) */, hw: 8.0 }, rear: { fs: [83.00, 96.00], hw: 8.0 } },
  // block A's seat backs, read from their modules (below): front LEZ-53-170 reclined plane, rear LEZ-53-175 upright at FS 130.2
  backR: { zTop: 43.0 }, lapFS: 56.50 /* seat-1 2026-11-22: 6 in forward with the seat (was 62.5) */,
  shelf: { fs: [106.00, 121.50], bl: [-8.4, 2.6], top: 39.0, sand: SAND(2, 0.375), bayTop: 44.5 },
};
CAB.pan.under = CAB.pan.top - CAB.pan.sand.t;
// seat-3 2026-11-22 (owner: "move the seat as low as possible ... 3 inches lower"; the landing brake moved aft out from under it):
// the pilot sits on the belly. The front pan is now a 6781 liner bonded to the shell's inner skin, the cushion contoured to
// it (4 plies: the belly's inner face in shear under the pilot, cab-floorF); its top on the centre line sets the seat (was a sandwich pan at WL 28.5 over the brake actuator, on webs)
CAB.pan.front.liner = { nB: 4, t: +(4 * tB).toFixed(4) };
CAB.pan.front.top = +(bellyAt(56, 0) + CAB.pan.front.liner.t).toFixed(3);   // at the seat point (the belly falls aft; the cushion is contoured to it forward)
// the thigh support is now the liner run forward to FS 41.5 (the belly rises there); the cushion's front edge makes the ramp
CAB.thigh.zFront = +(bellyAt(CAB.thigh.fs[0], 0) + CAB.pan.front.liner.t).toFixed(2);
// ---- block A's seat backs as built (wpA4 SBP / SBG, wpA2 RB): the cushions, the pan's aft edge and the shoulder anchors follow them
/** the front seat back's forward face at slope coordinate v (in up the plane from its foot): [FS, WL] */
export const backFace = (v) => { const h = SB.t / 2; return [SBP.o[0] * 12 + v * SBP.ev[0] - h * SBP.en[0], SBP.o[2] * 12 + v * SBP.ev[2] - h * SBP.en[2]]; };
/** v on the front seat back's forward face at height WL z */
export const backV = (z) => (z - backFace(0)[1]) / SBP.ev[2];
/** forward-up unit normal of the front seat back in (FS, WL) */
export const BACK_N = [-SBP.en[0], -SBP.en[2]];
CAB.backF = { foot: backFace(0), top: backFace(SBG.vTop), vTop: SBG.vTop, gapPan: 0.12 };
CAB.backR.fs = RB.s * 12 - RB.t / 2;   // the rear bulkhead's forward face
// the front pan runs aft to the seat back: its aft edge 0.12 in clear of the back's forward face at the pan's underside (flox fillet, 2 BID tape)
CAB.pan.front.fs[1] = +(backFace(backV(CAB.pan.front.top))[0] - CAB.backF.gapPan).toFixed(3);
// console cut-outs (FS range × BL range), for the equipment that comes through the top
// the stick slot covers block C's canted stick tube over its travel through the console top (C's consoleEnvelope at
// the top and bottom faces) plus 1/8 in; the trim cut-out is the friction
// guide's footprint (the guide's flange screws to a 2 BID return under the top) grown by 0.15 in
export const STICK_SLOT = (() => {
  // block C's own envelope of the canted stick tube (wpC9 consoleEnvelope) at the console's top and bottom faces, + 1/8 in
  const zT = CAB.console.right.zTop, zB = zT - CAB.console.sand.t, E = [consoleEnvelope(zT), consoleEnvelope(zB)], c = 0.125;
  const env = { fs: [Math.min(...E.map((e) => e.fs[0])), Math.max(...E.map((e) => e.fs[1]))], bl: [Math.min(...E.map((e) => e.bl[0])), Math.max(...E.map((e) => e.bl[1]))] };
  // the stick's PTT lead (LEZ-23-125, right console run) comes up through the slot: the slot runs forward to 0.5 in ahead of where it crosses the top
  const ptt = [];
  for (const g of partByPN('LEZ-23-125')?.geo || []) if (g.pts) for (let i = 1; i < g.pts.length; i++) for (let k = 0; k <= 40; k++) { const q = g.pts[i - 1].map((v, j) => (v + (g.pts[i][j] - v) * k / 40) * 12); if (q[1] > 0 && q[2] > zB - 0.5 && q[2] < zT + 0.5 && Math.abs(q[0] - LC.G1[0]) < 6) ptt.push(q); }
  const fs0 = Math.min(env.fs[0] - c, ptt.length ? Math.min(...ptt.map((q) => q[0])) - 0.5 : Infinity), bl1 = Math.max(env.bl[1] + c, ptt.length ? Math.max(...ptt.map((q) => q[1])) + 0.5 : -Infinity);
  return { pitchDeg: TRAVEL_C.pitch, rollDeg: TRAVEL_C.roll, cant: LC.cant, env, clr: c, ptt: ptt.length ? [Math.min(...ptt.map((q) => q[0])), Math.max(...ptt.map((q) => q[1]))] : null, fs: [+fs0.toFixed(3), +(env.fs[1] + c).toFixed(3)], bl: [+(env.bl[0] - c).toFixed(3), +bl1.toFixed(3)] };
})();
const TRIM_GUIDE = { c: [LC.trimPiv[0], LC.trimPiv[1]], d: [4.0, 0.6], grow: 0.15 };
export const CONSOLE_CUTS = {
  left: [{ id: 'throttle', fs: [46.25, 53.05], bl: [-10.7, -9.0], pn: 'LEZ-76-100, LEZ-23-120 (levers and headset jacks)' }],
  right: [{ id: 'stick', fs: STICK_SLOT.fs, bl: STICK_SLOT.bl, pn: 'LEZ-27-110' },
    { id: 'trim', fs: [TRIM_GUIDE.c[0] - TRIM_GUIDE.d[0] / 2 - TRIM_GUIDE.grow, TRIM_GUIDE.c[0] + TRIM_GUIDE.d[0] / 2 + TRIM_GUIDE.grow], bl: [TRIM_GUIDE.c[1] - TRIM_GUIDE.d[1] / 2 - TRIM_GUIDE.grow, TRIM_GUIDE.c[1] + TRIM_GUIDE.d[1] / 2 + TRIM_GUIDE.grow], pn: 'LEZ-27-165' }],
};
// the right console rib block C's stick bearing block bolts to (LEZ-27-110 I3): a 0.25 in solid-BID plate on the block's aft
// face, hung from the console top (taped 2 BID to its underside and the lip), stopping inboard of the right-side raceway,
// with a clearance hole for the roll tube and 2 × AN3 at C's WL
export const RIB = (() => {
  const blk = [LC.G1[0] + 2.5, LC.G1[1], LC.G1[2]], s0 = blk[0] + 0.375, t = 0.25, s = s0 + t / 2, slope = (LC.G2[2] - LC.G1[2]) / (LC.G2[0] - LC.G1[0]);
  return { s0, s1: s0 + t, t, zBot: blk[2] - 1.0 - 0.6, bolts: [blk[2] - 0.75, blk[2] + 0.75].map((z) => [blk[1], z]), tube: [LC.G1[1], LC.G1[2] + (s - LC.G1[0]) * slope], tubeR: SZC.rollTube[0] / 2 + 0.0625, boltR: 0.0969,
    out: +(LC.G1[1] + SZC.rollTube[0] / 2 + 0.0625 + 0.275).toFixed(3),   // outboard edge: 0.275 in web outside the tube hole, clear of the right-side raceway at the wall
    pass: { fs: [blk[0] - 0.5, s0 + t + 0.9], bl: [blk[1] - 1.1, blk[1] + 1.1], wl: [blk[2] - 1.2, blk[2] + 1.3] } };   // bolted interface: the block and the tube where it runs through the rib
})();
// the thigh support's front web leaves a gap over the keel for block C's landing-brake actuator
export const ACT_GAP = (() => { const g = partByPN('LEZ-27-171')?.geo?.[0]; const r = g?.r ? g.r * 12 : 0.625; return { r, hw: +(r + 0.25 + 0.375).toFixed(3) }; })();
/** landing-brake horn and actuator sweep (block C, LB()): the lowest clearance under the thigh support / front pan (in) */
export function lbSweep() {
  const B = LB(), A = [B.A[0], B.A[2]], rB = ACT_GAP.r, under = (fs) => fs >= CAB.thigh.fs[0] && fs <= CAB.thigh.fs[1] ? CAB.thigh.zFront + (CAB.pan.front.top - CAB.thigh.zFront) * (fs - CAB.thigh.fs[0]) / (CAB.thigh.fs[1] - CAB.thigh.fs[0]) - CAB.pan.sand.t : fs > CAB.thigh.fs[1] && fs <= CAB.pan.front.fs[1] ? CAB.pan.front.top - CAB.pan.front.liner.t : null;
  let w = { clr: Infinity };
  for (let th = 0; th <= 70; th += 1) { const H = B.at(B.a, th), T = B.at(B.a + 0.35, th);
    const pts = [...Array.from({ length: 21 }, (_, k) => [A[0] + (H[0] - A[0]) * k / 20, A[1] + (H[1] - A[1]) * k / 20, rB]), [T[0], T[1], 0.35], [H[0], H[1], 0.35]];
    for (const [fs, z, r] of pts) { const u = under(fs); if (u == null) continue; const c = u - (z + r); if (c < w.clr) w = { clr: c, fs, th, z: z + r }; } }
  return Number.isFinite(w.clr) ? w : { clr: 9.99, fs: 0, th: 0, z: 0, none: true };   // seat-3: the brake is aft of the seat, nothing under it
}

// ------------------------------------------------------------------------------------------- primitives per part
const box = (g, x0, x1, y0, y1, z0, z1) => ({ k: 'box', g, c: [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], d: [x1 - x0, y1 - y0, z1 - z0] });
const rectP = (x0, x1, y0, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
/** a sandwich plate extruded along z (plan polygon in BL / FS): faces and core as three layers */
function plateZ(pts, top, S, holes = []) { const f = S.nB * tB; return [{ k: 'ext', g: 'face', ax: 'z', u0: top - f, u1: top, pts, holes }, { k: 'ext', g: 'core', ax: 'z', u0: top - f - S.core, u1: top - f, pts, holes }, { k: 'ext', g: 'face', ax: 'z', u0: top - S.t, u1: top - f - S.core, pts, holes }]; }
/** seat-3: a contoured layer on the shell's inner skin from FS f0 to f1, ±hw, thickness t, off the skin by gap (section at the highest belly) */
function linerSec(g, f0, f1, hw, t, gap) { const n = 24, sec = [], zIn = (y) => Math.max(...[f0, (f0 + f1) / 2, f1].map((f) => bellyAt(f, y)));
  for (let i = 0; i <= n; i++) { const y = -hw + 2 * hw * i / n; sec.push([+y.toFixed(4), +(zIn(y) + gap).toFixed(4)]); }
  return { k: 'ext', g, ax: 'y', u0: f0, u1: f1, pts: [...sec, ...sec.slice().reverse().map(([y, z]) => [y, +(z + t).toFixed(4)])] }; }
export function floorPrims() {
  const P = CAB.pan, out = [];
  // seat-3: the front liner on the shell's inner skin, contoured (each piece's section at its highest belly), in two pieces: under
  // the thighs (FS 41.5–44) and under the seat to the seat back's foot
  for (const [g, f0, f1, hw] of [['thigh', CAB.thigh.fs[0], CAB.thigh.fs[1], CAB.thigh.hw], ['face', P.front.fs[0], P.front.fs[1], P.front.hw]]) out.push(linerSec(g, f0, f1, hw, P.front.liner.t, 0.01));
  for (const k of ['rear']) { const q = P[k];
    out.push(...plateZ(rectP(-q.hw, q.hw, q.fs[0], q.fs[1]), P.top, P.sand));
    for (const sg of [-1, 1]) { const y0 = sg * (q.hw - P.web), y1 = sg * q.hw, zb = Math.max(bellyAt(q.fs[0], q.hw), bellyAt(q.fs[1], q.hw)) + 0.02; out.push(box('web', Math.min(y0, y1), Math.max(y0, y1), q.fs[0], q.fs[1], zb, P.under)); } }
  return tidy(out);
}
// the thigh support's sloping plate is one sandwich group ('core' carries its mean density, see FLOOR_RHO)
export function consolePrims() {
  const C = CAB.console, out = [];
  for (const [side, sg] of [['left', -1], ['right', 1]]) { const q = C[side], wall = Math.min(wallIn(q.fs[0], q.zTop - C.sand.t), wallIn(q.fs[1], q.zTop - C.sand.t)) - 0.05;
    // a cut-out that reaches the inboard edge becomes an edge notch in the top, and the inboard lip is cut over its FS range
    const edge = (c) => (sg > 0 ? c.bl[0] <= q.inb : c.bl[1] >= -q.inb), cuts = CONSOLE_CUTS[side], notches = cuts.filter(edge);
    let pts = sg < 0 ? rectP(-wall, -q.inb, q.fs[0], q.fs[1]) : rectP(q.inb, wall, q.fs[0], q.fs[1]);
    for (const c of notches) { const ob = sg > 0 ? c.bl[1] : c.bl[0], ib = sg * q.inb;   // the notch's outboard edge and the console's inboard edge
      pts = sg > 0 ? [[ib, q.fs[0]], [wall, q.fs[0]], [wall, q.fs[1]], [ib, q.fs[1]], [ib, c.fs[1]], [ob, c.fs[1]], [ob, c.fs[0]], [ib, c.fs[0]]]
        : [[-wall, q.fs[0]], [ib, q.fs[0]], [ib, c.fs[0]], [ob, c.fs[0]], [ob, c.fs[1]], [ib, c.fs[1]], [ib, q.fs[1]], [-wall, q.fs[1]]]; }
    out.push(...plateZ(pts, q.zTop, C.sand, cuts.filter((c) => !edge(c)).map((c) => ({ pts: rectP(c.bl[0], c.bl[1], c.fs[0], c.fs[1]) }))));
    const y0 = sg < 0 ? -q.inb : q.inb - C.sand.t, y1 = sg < 0 ? -q.inb + C.sand.t : q.inb, z0 = q.zTop - C.sand.t - C.lip, z1 = q.zTop - C.sand.t;
    const spans = notches.map((c) => c.fs).sort((u, v) => u[0] - v[0]).reduce((acc, f) => { const L = acc.pop(); return [...acc, [L[0], f[0]], [f[1], L[1]]]; }, [[q.fs[0], q.fs[1]]]);
    for (const [f0, f1] of spans) if (f1 - f0 > 0.01) out.push(box('lip', y0, y1, f0, f1, z0, z1)); }
  { const q = C.right, zU = q.zTop - C.sand.t;
    out.push({ k: 'ext', g: 'rib', ax: 'y', u0: RIB.s0, u1: RIB.s1, pts: [[q.inb, RIB.zBot], [RIB.out, RIB.zBot], [RIB.out, zU], [q.inb, zU]],
      holes: [{ c: RIB.tube, r: RIB.tubeR }, ...RIB.bolts.map((c) => ({ c, r: RIB.boltR }))] }); }
  return tidy(out);
}
const cushion = (q, zb, foam) => [box('foam', -q.hw, q.hw, q.fs[0], q.fs[1], zb, zb + foam), box('cover', -q.hw, q.hw, q.fs[0], q.fs[1], zb + foam, zb + foam + 0.06)];
/** front cushion on the pan, its aft face on A's seat back; the back pad on the back's forward face from the cushion top to
 *  0.5 in under the back's top edge, inboard of A's leg openings; a headrest roll above the top edge */
/** back pads on A's front seat back, each 0.25 in inside A's outline (SBG.halfW) over its whole v range and inboard of the
 *  leg openings: a wide lower pad from the cushion top, and (where A's back narrows toward a taller top) a narrower upper
 *  pad that stays 0.75 in inboard of the shoulder-strap anchors so the straps come off the back beside it */
const fitHw = (v0, v1, hw) => { let m = hw; for (let i = 0; i <= 40; i++) m = Math.min(m, SBG.halfW(v0 + (v1 - v0) * i / 40) - 0.25); return m; };
export const PAD_F = (() => {
  // seat-2 2026-11-22: the lower pad on the reclined back up to the knee; an upper pad on LEZ-53-171's vertical face between the
  // shoulder straps' anchors; the headrest pads on the headrest (0.9 in thick, split in two, as builders trim and split them:
  // longezpush.com Ch. 26)
  const S = CAB.seat, v0 = backV(CAB.pan.front.top + S.foam), hwL = Math.min(S.front.hw, SB.leg.u0 - 0.75);   // seat-3: 0.75 in inside the leg openings (was 0.25), clear of the left raceway where it steps inboard past the throttle cables
  let v1 = SBG.vTop - 0.25; while (v1 > v0 + 2 && fitHw(v0, v1, hwL) < hwL - 1e-9) v1 -= 0.05;
  const pads = [{ v0, v1, hw: hwL }];
  const upper = { z0: suFace(0.25)[1], z1: suFace(SUG.top - 0.25)[1], hw: +Math.min(hwL, SUG.wTop - 0.25, Math.abs(SUG.anchors[0].u) - 0.75).toFixed(3) };
  const head = { t: 0.9, z0: suFace(SUG.top + 0.25)[1], z1: suFace(SUG.vHead - 0.3)[1], hw: +(SUG.hh - 0.3).toFixed(3) };
  head.split = +((head.z0 + head.z1) / 2).toFixed(3);
  return { v0, v1, hw: hwL, pads, upper, head, hwH: head.hw, padAt: (v) => pads.find((p) => v >= p.v0 - 1e-9 && v <= p.v1 + 1e-9) || null };
})();
/** a seated occupant against the front back pad: shoulder (acromion) OCC.hs in up the pad face from the cushion top. The
 *  height is typed from memory (≈ 50th-percentile adult male sitting acromion height); used only while block A has no
 *  design shoulder point of its own (A's rev C exports shoulderPt / strapAngle, which then govern) */
/** ANSUR II sitting acromion heights (in, hard seat): 5th-percentile female 515 mm, 50th male 603 mm, 95th male 653 mm (Gordon et al.
 *  2012, NATICK/TR-15/007, Acromial Height, Sitting, pp. 235-236; dtic.mil ADA611869, accessed 2026-11-19; memaudit hwregs acromion-sit).
 *  Measured on a hard seat: the cushion's compression is not taken off (conservative for the strap angle). */
export const ACROMION = { f5: 20.3, m50: 23.7, m95: 25.7, src: 'ANSUR II (Gordon et al. 2012, NATICK/TR-15/007), Acromial Height, Sitting, pp. 235-236 (dtic.mil ADA611869, accessed 2026-11-19)' };
/** every occupant's shoulder [FS, WL] in each seat: front against the reclined pad (hs up the pad face from the cushion top, on the
 *  pad face), rear against the upright pad on the rear bulkhead (hs above the cushion top, on the pad face) */
/** seat-2 2026-11-22 (owner: "Small pilots will use cushions"): a removable back cushion for the small pilot, its thickness
 *  sized so the 5th-percentile female reaches every front control (grip and fingertip reach MS ≥ 0, wpB5). Confor foam, the
 *  same as the seat pads; it lies on the lower, upper and headrest pads alike, moving the torso forward by its thickness */
export const SMALL_CUSHION = { f5: 2.0, spec: 'removable back cushion, Confor CF-47EG, on all three back pads' };
const OCC_K = ['f5', 'm50', 'm95'];
export const OCCS = (() => { const out = { front: {}, rear: {}, acro: { front: {}, rear: {} } }, v0 = PAD_F.v0;
  // occupant-12 2026-11-22: the back rests on the lower pad at the hip, on the upper pad's face (the vertical top section pushes the
  // shoulders up and forward: longezpush.com Ch. 26) and on the headrest pads up to the shoulders' height (the shoulder blades);
  // it lies on the line from the hip point that clears them. Above the shoulders the spine curves forward (the neck), so the
  // headrest pads there meet the head, not the back (wpB5 occupant): solved per occupant (was, seat-2: every headrest pad on the
  // torso line). out.front / out.rear: the back surface at acromion height (where the shoulder strap leaves the body: the
  // strap-angle model); out.acro: the shoulder joint, ½ chest depth forward of the back surface (DERIVED: ANSUR II Chest Depth,
  // dim. 25, p. 93; the acromion lies at about the torso's mid-depth), normal to the torso line
  const torso = (c, hs) => { const back = CAB.seat.back + c, f0 = backFace(v0), f1 = backFace(v0 + 10), p0 = [f0[0] + BACK_N[0] * back, f0[1] + BACK_N[1] * back], z0 = CAB.pan.front.top + CAB.seat.foam;
    const H = [p0[0] + (z0 - p0[1]) * (f1[0] - f0[0]) / (f1[1] - f0[1]), z0], pts = [], head = [];   // occupant-12: the hip point on the pad face at the seat surface (ANSUR II heights are from it; was the pad face normal to the seat-surface point, 1.4 in high)
    for (let i = 1; i <= 20; i++) { const f = backFace(v0 + (PAD_F.v1 - v0) * i / 20); pts.push([f[0] + BACK_N[0] * back, f[1] + BACK_N[1] * back]); }
    for (let i = 0; i <= 10; i++) pts.push([suFace()[0] - CAB.seat.back - c, PAD_F.upper.z0 + (PAD_F.upper.z1 - PAD_F.upper.z0) * i / 10]);
    for (let i = 0; i <= 40; i++) head.push([suFace()[0] - PAD_F.head.t - c, PAD_F.head.z0 + (PAD_F.head.z1 - PAD_F.head.z0) * i / 40]);
    const solve = (P) => Math.min(...P.map((q) => Math.atan2(q[0] - H[0], q[1] - H[1])));
    let lean = solve(pts); for (let k = 0; k < 20; k++) { const zs = H[1] + Math.cos(lean) * hs, l2 = solve([...pts, ...head.filter((q) => q[1] <= zs)]); if (Math.abs(l2 - lean) < 1e-9) break; lean = l2; }
    return { H, lean, dir: [Math.sin(lean), Math.cos(lean)] }; };
  for (const [k, hs] of Object.entries(ACROMION)) { if (k === 'src') continue; const T = torso(SMALL_CUSHION[k] || 0, hs), d = ans('chestDepth', k) / 2;
    const b = out.front[k] = [T.H[0] + T.dir[0] * hs, T.H[1] + T.dir[1] * hs];
    out.acro.front[k] = { pt: [b[0] - T.dir[1] * d, b[1] + T.dir[0] * d], lean: T.lean, cushion: SMALL_CUSHION[k] || 0 };
    const r = out.rear[k] = [CAB.backR.fs - CAB.seat.back, CAB.pan.top + CAB.seat.foam + hs];
    out.acro.rear[k] = { pt: [r[0] - d, r[1]], lean: 0, cushion: 0 }; }
  const T0 = torso(0, ACROMION.m50); out.torso = { H: T0.H, lean: T0.lean * 180 / Math.PI, by: Object.fromEntries(OCC_K.map((k) => [k, +(out.acro.front[k].lean * 180 / Math.PI).toFixed(1)])) };
  return out; })();
A4.setShoulderModel?.((k) => OCCS.front[k] || OCCS.front.m95);
/** the rear shoulder-harness anchors (Miles 2026-11-19: at the top of the rear seat back): on LEZ-53-175's forward face at BL ±3.5,
 *  WL 41.5, 0.5 in under the baggage notch's lower edge (RB.bag.v0, WL 42.0: the bulkhead is open above it on the left) */
export const REAR_ANCH = { u: 3.5, wl: 41.5, fs: CAB.backR.fs };
/** strap angle below horizontal (deg) from an occupant's shoulder [FS, WL] to the point [FS, WL] where the strap leaves the seat back */
export const strapDeg = (sh, a) => Math.atan2(sh[1] - a[1], a[0] - sh[0]) * 180 / Math.PI;
export const rearStrap = () => Object.entries(OCCS.rear).map(([k, sh]) => ({ k, deg: strapDeg(sh, [REAR_ANCH.fs, REAR_ANCH.wl]) })).reduce((a, b) => (b.deg > a.deg ? b : a));
/** the open decision both seats' records carry (coordinator, 2026-11-19) */
export const HARNESS_OPEN = 'Shoulder-harness angle exceeds AC 21-34 (5° below horizontal) for the 50th/95th male (and the rear seat for all occupants); decision deferred to Miles\'s seated fit check; candidate fix: a headrest/roll-over frame above shoulder height with a centre Y-harness or inertia reel.';
export const OCC = (() => { const hs = ACROMION.m50, sh = OCCS.front.m50;   // seat-2: the 50th male on the torso line (OCCS)
  return { hs, shoulder: sh, angle: () => { const a = suAnchorPt(SUG.anchors[0]); return Math.atan2(sh[1] - a[2], Math.abs(sh[0] - a[1])) * 180 / Math.PI; } }; })();
/** functional reach from the seated pilot's shoulder (acromion) to a grip centre, for controls beside the seat (final
 *  integration: the fuel selector knob, block F). The shoulder's BL (half the biacromial breadth) and the reach are TYPED
 *  FROM MEMORY (BOUND: 5th-percentile female 24.5 in, 50th-percentile male 28.0 in); the shoulder point is OCC's, which
 *  follows the shoulder model (Miles's open decision): a change there re-runs every reach check */
// reach (2026-11-19): acromion-to-grip as the sum of ANSUR II 5th-percentile limb segments, 307 + 218 + half palm 50 = 575 mm = 22.6 in (5th female;
// conservative), 363 + 267 + 58 = 688 mm = 27.1 in (50th male); half biacromial breadth 6.6 in for the 5th female (inboard shoulder: the reach
// case), 8.8 in (95th male) for clearance. src 'Gordon et al. 2012, ANSUR II Methods and Summary Statistics, NATICK/TR-15/007 (dtic.mil
// ADA611869, accessed 2026-11-19)', derived. Cross-check: ANSUR II thumb-tip reach (from the back wall), 5th female 674 mm (26.5 in).
export const REACH = { shoulderBL: 6.6, shoulderBLclear: 8.8, p5f: 22.6, p50m: 27.1, src: 'ANSUR II (Gordon et al. 2012, NATICK/TR-15/007): 5th-percentile female acromion-to-grip 22.6 in and 50th male 27.1 in as limb-segment sums (derived); half biacromial 6.6 in (5th female); shoulder point from B\'s occupant OCC (sitting acromion 23.7 in)' };
export const reachTo = (p, side = -1) => { const sh = [side * REACH.shoulderBL, OCC.shoulder[0], OCC.shoulder[1]]; return { sh, d: Math.hypot(p[0] - sh[0], p[1] - sh[1], p[2] - sh[2]) }; };
const r4c = (x) => Math.round(x * 1e4) / 1e4;
export function frontSeatPrims() {
  const S = CAB.seat, P = CAB.pan, N = BACK_N, off = (p, k) => [p[0] + N[0] * k, p[1] + N[1] * k], fz = (z) => backFace(backV(z))[0];
  const z0 = P.front.top, z1 = P.front.top + S.foam, L = CAB.backF.vTop;
  // seat-3: the cushion fills the belly's curve under a flat top (Oregon Aero-style contoured core): a contoured block to the seat
  // back's foot, and the wedge under the reclined back's face above it
  const q = P.front, n = 16, zIn = (y) => Math.max(...[S.front.fs[0], (S.front.fs[0] + fz(z0)) / 2, fz(z0)].map((f) => bellyAt(f, y))) + q.liner.t + 0.02, sec = [];
  for (let i = 0; i <= n; i++) { const y = -S.front.hw + 2 * S.front.hw * i / n; sec.push([+y.toFixed(4), +Math.min(zIn(y), z1 - 0.75).toFixed(4)]); }
  const seat = { k: 'ext', g: 'foam', ax: 'y', u0: S.front.fs[0], u1: +fz(z0).toFixed(4), pts: [...sec, [S.front.hw, z1], [-S.front.hw, z1]] };
  const wedge = { k: 'ext', g: 'foam', ax: 'x', u0: -S.front.hw, u1: S.front.hw, pts: [[fz(z0), z0], [fz(z1), z1], [fz(z0), z1]] };
  const cover = box('cover', -S.front.hw, S.front.hw, S.front.fs[0], fz(z1) - S.back * 0.9, z1, z1 + 0.06);
  const pads = PAD_F.pads.map((q) => { const bot = backFace(q.v0), top = backFace(q.v1); return { k: 'ext', g: 'foam', ax: 'x', u0: -q.hw, u1: q.hw, pts: [bot, top, off(top, S.back), off(bot, S.back)] }; });
  // seat-2: the upper pad on LEZ-53-171's face and the round-topped headrest pads (split at mid-height) on its headrest
  const U = PAD_F.upper, Hd = PAD_F.head, fF = suFace()[0], arch = (z0, z1) => { const zc = Hd.z1 - Hd.hw, out = [];
    const edge = (z) => (z <= zc ? Hd.hw : Math.sqrt(Math.max(0, Hd.hw * Hd.hw - (z - zc) ** 2)));
    for (let i = 0; i <= 12; i++) { const z = z0 + (z1 - z0) * i / 12; out.push([edge(z), z]); }
    return [...out.map(([u, z]) => [r4c(u), r4c(z)]), ...out.slice().reverse().map(([u, z]) => [r4c(-u), r4c(z)])].filter((q, i, a) => i === 0 || Math.hypot(q[0] - a[i - 1][0], q[1] - a[i - 1][1]) > 1e-4); };
  const upper = { k: 'ext', g: 'foam', ax: 'x', u0: -U.hw, u1: U.hw, pts: [[fF, U.z0], [fF, U.z1], [fF - S.back, U.z1], [fF - S.back, U.z0]] };
  const heads = [[Hd.z0, Hd.split - 0.05], [Hd.split + 0.05, Hd.z1]].map(([a, b]) => ({ k: 'ext', g: 'foam', ax: 'y', u0: fF - Hd.t, u1: fF, pts: arch(a, b) }));
  return tidy([seat, wedge, cover, ...pads, upper, ...heads]);
}
export function rearSeatPrims() {
  const S = CAB.seat, R = CAB.backR;
  return tidy([...cushion(S.rear, CAB.pan.top, S.foam), box('foam', -(S.rear.hw - 0.5), S.rear.hw - 0.5, R.fs - S.back, R.fs, CAB.pan.top + S.foam, R.zTop - 1.0)]);   // back pad on the bulkhead's forward face (integration 2026-11-19: 15 in wide, so with the seat 2 in lower it stays clear of H's engine-control cables at BL −8.3…−9.7)
}
// harness (one set; the rear set is its mirror in the rear seat): straps as rounds of the webbing's section
export const HARN = { web: [1.75, 0.06], buckle: [2.5, 2.0, 0.6] };
const rW = Math.sqrt(HARN.web[0] * HARN.web[1] / Math.PI);
export const ANCH = (() => {
  const fs = CAB.lapFS, z = +(CAB.pan.front.top + 2.1).toFixed(2) /* seat-3: 2.1 in above the liner, outboard of the hips (was WL 28.0) */, wall = wallIn(fs, z), B = CAB.backF;
  const sh = [-1, 1].map((sg) => { const a = SUG.anchors.find((q) => Math.sign(q.u) === sg), p = suAnchorPt(a); return [p[0], p[1] - 0.09, p[2]]; });   // A's anchors on LEZ-53-171 (seat-2), end fitting on the forward face
  return { lap: [-1, 1].map((sg) => [sg * (wall - 0.30), fs, z]), shoulder: sh, buckle: [0, fs - 7.0, CAB.pan.front.top + 5.0], shoulderPt: [-1, 1].map((sg) => (A_SHOULDER ? [sg * 3.0, ...A_SHOULDER()] : [sg * 3.0, B.top[0] - 4.0, B.top[1] + 1.5])) };   // A's design shoulder point when it has one
})();
export function harnessPrims() {
  const A = ANCH, cyl = (g, a, b, r = rW) => ({ k: 'cyl', g, a, b, r });
  return tidy([...A.lap.map((p) => cyl('web', p, A.buckle)), ...A.shoulder.map((p, i) => cyl('web', p, A.shoulderPt[i])), ...A.shoulderPt.map((p) => cyl('web', p, A.buckle)),
    box('buckle', -HARN.buckle[0] / 2, HARN.buckle[0] / 2, A.buckle[1] - 1, A.buckle[1] + 1, A.buckle[2] - 0.3, A.buckle[2] + 0.3),
    ...A.lap.map((p) => box('bracket', Math.sign(p[0]) > 0 ? p[0] : p[0] - 0.09, Math.sign(p[0]) > 0 ? p[0] + 0.09 : p[0], p[1] - 1.25, p[1] + 1.25, p[2] - 1.0, p[2] + 1.0))]);
}
export function baggagePrims() {
  const S = CAB.shelf;
  return tidy([...plateZ(rectP(S.bl[0], S.bl[1], S.fs[0], S.fs[1]), S.top, S.sand),
    box('net', S.bl[0] + 0.3, S.bl[1] - 0.3, S.fs[0] + 0.3, S.fs[0] + 0.36, S.top, S.bayTop - 0.5),
    ...[[0, 0], [1, 0], [0, 1], [1, 1]].map(([i, k]) => ({ k: 'cyl', g: 'steel', a: [S.bl[i] + (i ? -0.8 : 0.8), S.fs[k] + (k ? -0.8 : 0.8), S.top - S.sand.t - 0.1], b: [S.bl[i] + (i ? -0.8 : 0.8), S.fs[k] + (k ? -0.8 : 0.8), S.top + 0.6], r: 0.0938 }))]);
}
export const VENT = (() => { const s = 50.81 / 12, t = Math.PI - tCut(s, 0) - 0.42, o = canPt(s, t, 0), i = canPt(s, t, -0.6); return { s, o, i }; })();
export function upholsteryPrims() {
  const H = CAB.thigh, v = VENT, fs = v.s * 12;
  return tidy([linerSec('carpet', H.fs[0], H.fs[1], H.hw, 0.2, 0.01 + CAB.pan.front.liner.t),   // seat-3: on the thigh liner, contoured
    { k: 'cyl', g: 'vent', a: [v.o[0], fs, v.o[1]], b: [v.i[0], fs, v.i[1]], r: 1.6, ri: 1.25 }]);
}
export const FLOOR_RHO = { face: plyWeight('BID', 1, 1) / 144 / tB, core: BASE_MAT.PVC.rho * 62.43 / 1728, web: 0.0105 /* PVC strip wrapped in 2 BID, mean */ };
FLOOR_RHO.core = FLOOR_RHO.core; // sloping thigh-support plate uses 'core' with the sandwich mean below
export const THIGH_RHO = (2 * CAB.pan.sand.nB * tB * FLOOR_RHO.face + CAB.pan.sand.core * BASE_MAT.PVC.rho * 62.43 / 1728) / CAB.pan.sand.t;
export const RHOS = {
  floor: { face: FLOOR_RHO.face, core: BASE_MAT.PVC.rho * 62.43 / 1728, web: FLOOR_RHO.web, thigh: THIGH_RHO },
  console: { face: FLOOR_RHO.face, core: BASE_MAT.PVC.rho * 62.43 / 1728, lip: FLOOR_RHO.web, rib: FLOOR_RHO.face /* solid BID */ },
  seat: { foam: 0.00347 /* Confor CF-45EG 96.1 kg/m³ = 6.0 lb/ft³: 3M/Aearo CONFOR EG MSS50 (accessed 2026-11-19) */, cover: 0.030 /* FR fabric over the top, as a 0.06 in skin */ },
  harness: { web: 0.035 /* nylon / polyester webbing */, buckle: 0.12 /* steel and aluminium rotary buckle, mean */, bracket: RHO.steel },
  baggage: { face: FLOOR_RHO.face, core: BASE_MAT.PVC.rho * 62.43 / 1728, net: 0.006 /* polyester net envelope */, steel: RHO.steel },
  upholstery: { carpet: 0.012 /* FR carpet ≈ 0.25 lb/ft² at 0.2 in, typed */, vent: 0.05 /* polycarbonate / aluminium vent, mean */ },
};
// the thigh support's plate is drawn in group 'core' of floorPrims: count it at the sandwich mean
export const floorMass = () => massFrom(groupVols(floorPrims()), RHOS.floor);

// ------------------------------------------------------------------------------------------- clearance to other blocks' items
const OWN = /^LEZ-(25-1[0-5]|52-|56-|31-100)/;
/** points sampled on every other part's lines, rods and boxes (in), with the item's radius */
export function foreignPts() {
  const out = [];
  for (const p of PARTS) { if (OWN.test(p.pn)) continue;
    for (const g of p.geo || []) {
      const r = g.dIn ? g.dIn / 2 : g.r ? g.r * 12 : 0;
      const P = g.pts || (g.t === 'cyl' && g.a && g.b ? [g.a, g.b] : null);
      if (P) for (let i = 0; i < P.length - 1; i++) for (let k = 0; k <= 12; k++) { const q = P[i].map((v, j) => (v + (P[i + 1][j] - v) * k / 12) * 12); out.push({ pn: p.pn, q: [q[1], q[0], q[2]], r }); }
      else if (g.t === 'box') for (const sx of [-0.5, 0, 0.5]) for (const sy of [-0.5, 0, 0.5]) for (const sz of [-0.5, 0, 0.5]) out.push({ pn: p.pn, q: [(g.c[1] + sx * g.d[1]) * 12, (g.c[0] + sy * g.d[0]) * 12, (g.c[2] + sz * g.d[2]) * 12], r: 0 });
    } }
  return out;
}
/** every foreign item inside a part's primitives' boxes grown by the clearance; cut-outs (plan rectangles) let declared items through */
/** a BL-wise extrusion (profile [FS, WL]) within d of point q [BL, FS, WL]: the profile itself, not its bounding box (integration
 *  2026-11-19: the lowered, sloping thigh support's box took in the landing-brake actuator 2.3 in below it) */
function extNear(m, q, d) {
  if (q[0] < Math.min(m.u0, m.u1) - d || q[0] > Math.max(m.u0, m.u1) + d) return false;
  const P = m.pts, x = q[1], y = q[2]; let inside = false, best = Infinity;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, yi] = P[i], [xj, yj] = P[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
    const vx = xj - xi, vy = yj - yi, L2 = vx * vx + vy * vy, u = Math.max(0, Math.min(1, ((x - xi) * vx + (y - yi) * vy) / (L2 || 1))); best = Math.min(best, Math.hypot(x - xi - u * vx, y - yi - u * vy)); }
  return inside || best < d;
}
export function intrusions(prims, clr = 0.25, pass = [], exclude = []) {
  const bx = prims.map((m) => [m, bboxOf([m])]), hit = new Map(), segD = (q, a, b) => { const v = b.map((x, i) => x - a[i]), L2 = v.reduce((s, x) => s + x * x, 0), u = Math.max(0, Math.min(1, v.reduce((s, x, i) => s + x * (q[i] - a[i]), 0) / (L2 || 1))); return Math.hypot(...q.map((x, i) => x - a[i] - u * v[i])); };
  for (const f of foreignPts()) { if (exclude.includes(f.pn) || pass.some((c) => f.q[1] > c.fs[0] && f.q[1] < c.fs[1] && f.q[0] > c.bl[0] && f.q[0] < c.bl[1] && (!c.wl || (f.q[2] > c.wl[0] && f.q[2] < c.wl[1])))) continue;
    for (const [m, b] of bx) { const inB = f.q[0] > b[0] - clr - f.r && f.q[0] < b[1] + clr + f.r && f.q[1] > b[2] - clr - f.r && f.q[1] < b[3] + clr + f.r && f.q[2] > b[4] - clr - f.r && f.q[2] < b[5] + clr + f.r;
      if (inB && (m.k === 'cyl' ? segD(f.q, m.a, m.b) < m.r + clr + f.r : m.k === 'ext' && (m.ax === 'x' || m.ax === 'y') ? extNear(m, m.ax === 'y' ? [f.q[1], f.q[0], f.q[2]] : f.q, clr + f.r) : true)) { hit.set(f.pn, (hit.get(f.pn) || 0) + 1); break; } } }
  return [...hit.entries()].map(([pn, n]) => ({ pn, n }));
}
/** re-route asks: items of other blocks that today run through a block-B envelope; each has an owner and a stated fix */
export const ASKS = {
  'LEZ-20-100': { owner: 'I', fix: 'move the right raceway clamp at FS 87.6, BL 8.4, WL 37.1 outboard to the side raceway (BL ≥ 10.5); it sits where the front seat back pad and the rear passenger\'s legs are' },
  'LEZ-27-172': { owner: 'C', fix: 'run the landing-brake actuator harness under the front seat pan (WL ≤ 28.4) instead of diagonally through the seat cushion' },
  'LEZ-28-120': { owner: 'F', fix: 'keep the fuel feed lines below WL 28.4 under the rear pan, or aft of FS 122 (the rear cushion ends at FS 121.5)' },
};
export const asksOk = (list) => list.every((x) => ASKS[x.pn]);

// ------------------------------------------------------------------------------------------- belts (fus-belt agreement)
/** lap-belt anchors: through-bolted G10 hard points in the shell (2 per occupant); shoulder anchors on the seat backs (A) */
export const BELT = { occupant: 215, ff: 1.33, lapShare: 1.0, shoulderShare: 0.6, hp: { d: 2.0, t: T }, bolt: 4, webLap: 1500, webSh: 1500 };
Object.assign(FIXED.belts, { insertD: BELT.hp.d, embed: BELT.hp.t, points: 4 });   // 4 per occupant, the contract LEZ-53-170 sizes to: 2 lap (shell, this block) + 2 shoulder (seat back, A)
FIXED.beltSource = { points: 'DESIGN: four per occupant: two lap-belt anchors in the shell (LEZ-25-130; cab-harness also checks them with the whole occupant on the lap belt) and two shoulder anchors on the seat backs (LEZ-53-170 / -175)', insert: 'DESIGN: through-bolted G10 hard point 2 in across the full 0.415 in shell (LEZ-25-130)', flox: (ms) => allowB(ms, 'flox (resin) shear') };

// ------------------------------------------------------------------------------------------- checks
const bid = (n) => Array.from({ length: n }, () => ({ mat: 'BID', angle: 45 })), bid0 = (n) => Array.from({ length: n }, () => ({ mat: 'BID', angle: 0 }));
/** seat pan under the occupant at 6 g down, spanning between its webs (one-way strip), and the thigh support */
export function panState(M, S = CAB.pan.sand) {
  const W = BELT.occupant * 6.0, q = CAB.pan.rear, span = 2 * (q.hw - CAB.pan.web), len = q.fs[1] - q.fs[0], w = W / len, Mx = w * span / 8, d = S.core + S.nB * tB, N = Mx / d, rf = plyRF(bid(S.nB), [N, 0, 0], M), tau = W / 2 / len / d;
  return { W, span, len, Mx, N, rf, tau, ms: Math.min(rf.rf - 1, psi(M.PVC.tau) / tau - 1) };
}
{ const M = materials(effective(DEFAULT_DESIGN)), size = () => { sz: for (const core of [0.75, 1.0]) for (let n = 1; n <= 6; n++) { CAB.pan.sand = SAND(n, core); if (panState(M).ms >= TGT) break sz; } CAB.pan.under = CAB.pan.top - CAB.pan.sand.t; };
  // integration 2026-11-19: the pan's aft edge follows its own underside, so size, place the edge, size again (the lower pan moved it)
  size(); CAB.pan.front.fs[1] = +(backFace(backV(CAB.pan.front.top))[0] - CAB.backF.gapPan).toFixed(3);   // seat-3: the sandwich is the rear pan's; the front liner ends at the seat back's foot
  CAB.seat.front.fs = [CAB.pan.front.fs[0], +(CAB.pan.front.fs[1] - 0.2).toFixed(3)]; }   // seat-1: the cushion follows the pan
/** seat-3: the pilot's 6 g on the belly under the liner: a strip across the belly's flat (where it rises ≤ 1 in) */
export function floorFState(M) {
  const q0 = CAB.pan.front, fm = (q0.fs[0] + q0.fs[1]) / 2, z0 = bellyAt(fm, 0); let b2 = 0; while (b2 < 12 && bellyAt(fm, b2 + 0.05) - z0 <= 1.0) b2 += 0.05;
  const F = FIXED.fuselage, W = BELT.occupant * 6.0, len = q0.fs[1] - q0.fs[0], b = 2 * b2, q = W / (len * b), Mx = q * b * b / 8, d = F.coreIn + (F.faceBID + q0.liner.nB) * tB, N = Mx / d;
  // the shell's HT61 core is too weak in shear for the pilot's whole 6 g on the belly: an HT101 insert in the shell under the seat
  // (LEZ-53-150, FS 44–57, BL ±8; the liner's footprint), scaled from HT61 by the datasheet minima (CORES)
  const tauA = psi(M.PVC.tau) * CORES.HT101.tau / CORES.HT61.tau;
  const rf = plyRF(bid(F.faceBID + q0.liner.nB), [N, 0, 0], M), tau = q * b / 2 / d, msF = rf.rf - 1, msC = tauA / tau - 1;
  return { W, len, b, q, Mx, d, N, rf, tau, tauA, msF, msC, ms: Math.min(msF, msC) };
}
registerChecks('wpB4-cabin', (d, lc, Z, M) => {
  if (lc.type !== 'emergency') return [];
  const out = [], tag = (r, pn) => out.push(Object.assign(r, { sys: pn }));
  { const s = floorFState(M), F = FIXED.fuselage;   // seat-3: the pilot on the belly through the liner
    tag(mk('fuselage', 'cab-floorF', `Front seat on the belly at 6 g down (shell ${F.faceBID} × BID faces on ${F.coreIn} in core, + ${CAB.pan.front.liner.nB} × 6781 liner inside)`, lc, `FS ${CAB.pan.front.fs.join('–')}, the flat of the belly`, s.msF < s.msC ? `inner face + liner ${s.rf.mode}` : 'shell core shear', s.ms, {
      formula: 'W = 6.0 · W_occ (ultimate) as a pressure on the cushion footprint;  the belly a one-way strip across its flat (the width where it rises ≤ 1 in, the curved sides stiffer, conservative): M = q·b²/8, N = M/d on the inner face plus the liner;  τ = q·b/(2d)',
      inputs: [IN_('Downward load factor (ultimate)', 6.0, 'g', 'FAR23 23.561(b)(2) downward 6.0 g (typed from memory)'), IN_('Occupant', BELT.occupant, 'lb', 'FAR23'), IN_('Strip span b / footprint length', `${s.b.toFixed(1)} / ${s.len.toFixed(1)} in`, 'text', 'GEOMETRY'),
        IN_('Core shear (HT101 insert under the seat)', s.tauA, 'psi', `BOUND: HT61 allowable × HT101/HT61 datasheet minima; MS stays ≥ 0 down to ${s.tau.toFixed(0)} psi`)],
      result: [['q', s.q, 'psi'], ['N inner face', s.N, 'lb/in'], ['τ core', s.tau, 'psi']] }), 'LEZ-25-100'); }
  { const s = panState(M);
    tag(mk('fuselage', 'cab-floor', `Rear seat pan at 6 g down (${CAB.pan.sand.nB} × 6781 each face on ${CAB.pan.sand.core} in HT61)`, lc, `FS ${CAB.pan.rear.fs.join('–')}, between the webs`, s.rf.rf - 1 < psi(M.PVC.tau) / s.tau - 1 ? `face ${s.rf.mode}` : 'core shear', s.ms, {
      formula: 'W = 6.0 · W_occ (ultimate, all on the pan);  strip between the webs: M = (W/len)·span/8;  N = M/d;  τ = (W/2)/len/d', inputs: [IN_('Downward load factor (ultimate)', 6.0, 'g', 'FAR23 23.561(b)(2) downward 6.0 g (typed from memory)'), IN_('Occupant', BELT.occupant, 'lb', 'FAR23'),
        IN_('Span between webs / length', `${s.span.toFixed(1)} / ${s.len.toFixed(1)} in`, 'text', 'GEOMETRY'), IN_('Sandwich', `${CAB.pan.sand.nB} × 6781 / ${CAB.pan.sand.core} in HT61`, 'text', 'SIZED'), IN_('Core shear', psi(M.PVC.tau), 'psi', `BOUND: HT61 datasheet-typical; MS stays ≥ 0 down to ${s.tau.toFixed(0)} psi`)],
      result: [['N face', s.N, 'lb/in'], ['τ core', s.tau, 'psi']] }), 'LEZ-25-100'); }
  { const C = CAB.console, P = 100 * d.FS, arm = 12.0 - C.left.inb, b = 6.0, dd = C.sand.core + C.sand.nB * tB, N = P * arm / (dd * b), rf = plyRF(bid0(C.sand.nB), [N, 0, 0], M);
    tag(mk('fuselage', 'cab-console', 'Armrest / console top under a 100 lb push at its inboard edge', lc, 'console top, cantilever from the wall', `face ${rf.mode}`, rf.rf - 1, {
      formula: 'P = 100 lb (limit) × FS on a 6 in width;  M = P·arm;  N = M/(d·b)', inputs: [IN_('Push (limit)', 100, 'lb', 'DESIGN: armrest / handhold load'), IN_('Arm from the wall', arm, 'in', 'GEOMETRY'), IN_('Effective width', b, 'in', 'DESIGN'), IN_('Sandwich', `${C.sand.nB} × 6781 0/90 / ${C.sand.core} in HT61`, 'text', 'DESIGN'), IN_('6781 allowables', 'MTM45-1 × kB', 'text', allowB(rf.rf - 1, 'tension / compression'))],
      result: [['N face', N, 'lb/in']] }), 'LEZ-25-110'); }
  { const P = Math.hypot(LOADSC.pitch.single, LOADSC.roll.single) * d.FS * 1.15, D = 0.19, t = RIB.t, br = P / (2 * D * t), sh = 2 * 2126 / P, msBr = psi(M.BID.Fbru) / br - 1, ms = Math.min(msBr, sh - 1);
    tag(mk('fuselage', 'cab-stick-rib', 'Right console rib under block C\'s stick bearing block: 2 × AN3 bearing and shear', lc, `FS ${RIB.s0.toFixed(2)}, BL ${LC.G1[1]}`, msBr < sh - 1 ? 'rib bearing (solid 6781)' : 'AN3 single shear', ms, {
      formula: 'P = |F_pitch, F_roll| (pilot, limit) × FS × 1.15, all at the block;  σ_br = P/(2·D·t);  bolts 2 × AN3 single shear', inputs: [IN_('Pilot pitch / roll force (limit)', `${LOADSC.pitch.single} / ${LOADSC.roll.single}`, 'lb', 'FAR23 23.397(b), from block C (typed from memory there)'),
        IN_('Rib', `${t} in solid 6781`, 'text', 'DESIGN'), IN_('Bolts', '2 × AN3 (Ø 0.19 in)', 'text', 'DESIGN'), IN_('AN3 single shear', 2126, 'lb', 'AN standard'), IN_('6781 bearing', psi(M.BID.Fbru), 'psi', allowB(msBr, 'compressive strength (bearing not published)'))],
      result: [['P at the block (ult.)', P, 'lb'], ['σ bearing', br, 'psi']] }), 'LEZ-25-110'); }
  { const n = lc.n * (d.KD ?? 1), Pl = n * BELT.occupant * BELT.lapShare / 2 * BELT.ff, Ps = n * BELT.occupant * BELT.shoulderShare / 2 * BELT.ff, an4 = 3682, br = 0.090 * 0.25 * 200000, ins = psi(M.FLOX.shear) * 4 * BELT.hp.d * BELT.hp.t;
    const terms = [['lap webbing', BELT.webLap / Pl], ['shoulder webbing', BELT.webSh / Ps], ['lap anchor bolt (AN4, single shear)', an4 / Pl], ['anchor bracket bearing (0.090 4130)', br / Pl], ['G10 hard point shear-out in the shell', ins / Pl]].sort((a, b) => a[1] - b[1]);
    tag(mk('fuselage', 'cab-harness', 'Restraint harness at 9 g forward: webbing, anchor bolts, brackets and shell hard points', lc, 'front and rear seats', terms[0][0], terms[0][1] - 1, {
      formula: 'P_lap = n·W·share/2 × 1.33;  P_shoulder = n·W·0.6/2 × 1.33;  hard point = τ_flox · perimeter(4·d) · t', inputs: [IN_('Forward load factor (ultimate)', lc.n, 'g', 'FAR23 23.561'), IN_('Occupant', BELT.occupant, 'lb', 'FAR23'), IN_('Seat / belt fitting factor', BELT.ff, '', 'FAR23 23.625(d) 1.33 (typed from memory)'),
        IN_('Lap share (all the occupant on the lap belt: conservative)', BELT.lapShare, '', 'DESIGN'), IN_('Shoulder share', BELT.shoulderShare, '', 'BOUND: upper-torso share typed from memory (≈ 0.5–0.6); MS on the webbing stays ≥ 0 to share ' + (BELT.shoulderShare * BELT.webSh / Ps).toFixed(2)),
        IN_('Webbing strength (each half)', BELT.webLap, 'lb', 'BOUND: TSO-C22g / C114 harness, typed from memory; buy a harness whose data sheet shows ≥ this'), IN_('AN4 single shear', an4, 'lb', 'AN standard'), IN_('Hard point', `G10 ${BELT.hp.d} in square through the ${BELT.hp.t} in shell`, 'text', 'DESIGN'), IN_('Flox shear', psi(M.FLOX.shear), 'psi', allowB(terms[0][1] - 1, 'resin shear (flox)'))],
      result: [['Lap anchor (ult.)', Pl, 'lb'], ['Shoulder strap (ult.)', Ps, 'lb'], ...terms.map(([k, r]) => [k, r - 1, 'MS'])] }), 'LEZ-25-130'); }
  { const S = CAB.shelf, W = 25 * 6.0 + 2.0 * 6.0, span = S.bl[1] - S.bl[0], len = S.fs[1] - S.fs[0], Mx = W / len * span / 8, dd = S.sand.core + S.sand.nB * tB, N = Mx / dd, rf = plyRF(bid(S.sand.nB), [N, 0, 0], M), tape = W / (2 * len * 1.0) , ils = psi(M.GUD.ILSS), ms = Math.min(rf.rf - 1, ils / tape - 1);
    tag(mk('fuselage', 'cab-shelf', 'Baggage shelf with 25 lb at 6 g down; its side tapes', lc, `FS ${S.fs.join('–')}`, rf.rf - 1 < ils / tape - 1 ? `face ${rf.mode}` : 'tape shear', ms, {
      formula: 'W = 6·(bag + shelf);  M = (W/len)·span/8;  N = M/d;  tape τ = W/(2·len·lap)', inputs: [IN_('Placarded baggage', 25, 'lb', 'DESIGN: placard'), IN_('Downward load factor', 6.0, 'g', 'FAR23 23.561(b)(2) downward 6.0 g (typed from memory)'), IN_('Span / length', `${span.toFixed(1)} / ${len.toFixed(1)} in`, 'text', 'GEOMETRY'), IN_('Sandwich', `${S.sand.nB} × 6781 / ${S.sand.core} in HT61`, 'text', 'DESIGN'), IN_('Bond', ils, 'psi', allowB(ms, 'interlaminar shear'))],
      result: [['N face', N, 'lb/in'], ['τ tape', tape, 'psi']] }), 'LEZ-25-140'); }
  return out;
});

// ------------------------------------------------------------------------------------------- system records follow the definitions
const setP = (pn, m, extra = {}) => { const p = partByPN(pn); if (p) { Object.assign(p, extra); p.massEach = +m.toFixed(4); p.src = { ...p.src, mass: `GEOMETRY: the definition solid (${pn})` }; } };
export const MASSES = {
  floor: floorMass(), console: massFrom(groupVols(consolePrims()), RHOS.console), front: massFrom(groupVols(frontSeatPrims()), RHOS.seat), rear: massFrom(groupVols(rearSeatPrims()), RHOS.seat),
  harness: massFrom(groupVols(harnessPrims()), RHOS.harness), baggage: massFrom(groupVols(baggagePrims()), RHOS.baggage), upholstery: massFrom(groupVols(upholsteryPrims()), RHOS.upholstery),
};
const B4 = (pts) => pts.map(([s, y, z]) => [s / 12, y / 12, z / 12]);
setP('LEZ-25-100', MASSES.floor, { geo: [{ t: 'box', c: [53.89 / 12, 0, (CAB.pan.front.top - 0.2) / 12], d: [18 / 12, 17 / 12, 0.03], draw: false }, { t: 'box', c: [86.5 / 12, 0, (CAB.pan.top - 0.2) / 12], d: [18 / 12, 16 / 12, 0.03], draw: false }] });
setP('LEZ-25-110', MASSES.console, { geo: [-1, 1].map((sg) => ({ t: 'box', c: [50.81 / 12, sg * 9.8 / 12, (sg < 0 ? 39.0 : 38.6) / 12], d: [16 / 12, 2.2 / 12, 0.02], draw: false })) });
setP('LEZ-25-120', MASSES.front, { geo: [{ t: 'box', c: [54.5 / 12, 0, 30.5 / 12], d: [16 / 12, 16 / 12, 3 / 12] }] });
setP('LEZ-25-121', MASSES.rear, { geo: [{ t: 'box', c: [89.25 / 12, 0, 30.5 / 12], d: [13.5 / 12, 16 / 12, 3 / 12] }] });
setP('LEZ-25-130', MASSES.harness, { geo: [{ t: 'box', c: [ANCH.buckle[1] / 12, ANCH.buckle[0] / 12, ANCH.buckle[2] / 12], d: [2 / 12, 2.5 / 12, 0.6 / 12] }] });
setP('LEZ-25-140', MASSES.baggage, { name: 'Baggage shelf, net and tie-downs (behind the rear seat back)', tie: { n: 4, insertD: 0.75, embed: CAB.shelf.sand.t, bag: 25, src: true }, geo: [{ t: 'box', c: [(CAB.shelf.fs[0] + CAB.shelf.fs[1]) / 24, (CAB.shelf.bl[0] + CAB.shelf.bl[1]) / 24, (CAB.shelf.top - 0.2) / 12], d: [(CAB.shelf.fs[1] - CAB.shelf.fs[0]) / 12, (CAB.shelf.bl[1] - CAB.shelf.bl[0]) / 12, 0.03] }],
  blurb: 'A sandwich shelf behind the rear seat back (FS 131.5–147, BL −8.4 to +2.6, WL 39.0), above the aileron pushrods, the lines across the turtleback, the raceway and fuel sumps and clear of the ELT and the lines on the right; reached over the rear seat back; cargo net on four through-bolted tie-downs; placarded 25 lb.' });
setP('LEZ-25-150', MASSES.upholstery, { name: 'Upholstery (FR carpet on the thigh support) and cabin vent (in the canopy)', geo: [{ t: 'box', c: [46.52 / 12, 0, 30.2 / 12], d: [5 / 12, 14 / 12, 0.02], draw: false }] });
void psi; void CL; void bandAt; void GEO; void TGT;
