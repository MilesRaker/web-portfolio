// WPD3 — main wheel pants and their mounting (DC-013, 2026-11-23). Closes LEZ-32-300 open item O1: the pants existed only
// as the airframe model's PANT shape (wp10, airframe/dims.py) with no part number, mass line or mounting, and their inner
// wall (BL 39.12) is inboard of the leg end (BL 39.9), so the leg and the brake hose pass through it.
//  • LEZ-32-320 wheel pant (L/R): a bought-in pre-moulded glass pant for a 5.00-5 tyre, trimmed here: the tyre slot, a
//    slot in the inner wall from its top edge down past the leg end, 1/4 in clear of the leg (the brake hose shares it), two
//    #10 screw holes in the inner wall either side of the slot and an AN4 hard-point in the outer wall. It rides on the axle and the leg end, so it moves with the wheel.
//  • LEZ-32-321 pant mounting (L/R), 6061-T6:
//      inboard, a bracket clamped under the heads of the two upper axle bolts on the torque plate's outboard face: a web
//      on the bolts, arms running inboard fore and aft of the leg end (clear of the heat shield and the leg), feet on the
//      pant's inner wall with MS21047L3 nutplates for 2 × NAS1352-3 screws (#10) through the wall;
//      outboard, an axle-end standoff (Ø 0.75) on the Matco axle nut's pant boss, tapped 1/4-28 for an AN4 bolt through
//      the pant's outer wall hard-point.
// The pant comes off outboard after the AN4 bolt and the two #10 screws: wheel, brake and axle stay on the leg.
// Frames: params (prims) are [BL, FS, WL] in (block D); system geo is [FS, BL, WL] ft. Notional; the pant vendor, its
// mass and the axle-nut boss are typed (see the records).
import { registerChecks, mk } from '../structures.js';
import { defineParts, partByPN } from '../systems.js';
import { YC, ZAX, S0, BOW, AXB, LEGPAD } from './wpD1_gear.js';
import { STACK } from './wpD2_brakes.js';
import { PANT, TYRE } from './wp10_induction_gear.js';

const R4 = (v) => v.map((x) => Math.round(x * 1e4) / 1e4), r4 = (x) => Math.round(x * 1e4) / 1e4;
const box = (g, lo, hi) => ({ g, t: 'box', c: R4(lo.map((v, i) => (v + hi[i]) / 2)), d: R4(hi.map((v, i) => v - lo[i])) });
const cylX = (g, x0, x1, r, ri) => ({ g, t: 'cyl', a: R4([x0, S0, ZAX]), b: R4([x1, S0, ZAX]), r, ...(ri ? { ri } : {}) });

// ------------------------------------------------------------------------------------------- the pant (as trimmed)
export const PNT = (() => {
  const wallIn = r4(YC - PANT.HW * 12), wallOut = r4(YC + PANT.HW * 12), t = 0.06;   // inner faces of the side walls; glass wall 0.06 in
  // the leg end comes down nearly vertical (bow centre line BL ≈ 39.15 at its end, WL 4.75) and the inner wall's plane
  // (BL 39.12) runs through it, so the inner wall is slotted from its top edge down to 1/4 in below the leg end, 1/4 in
  // clear of the leg fore and aft; the brake hose comes down the leg's aft face inside the slot (≥ 1/8 in from its edge)
  const gap = 0.25, legEnd = LEGPAD.z0;
  const hose = partByPN('LEZ-32-312'), h = hose && (hose.geo || []).find((g) => g.t === 'path' && g.cls), hr = (h?.dIn || 0.453) / 2;
  let aft = S0 + BOW.w1 / 2 + gap, fwd = S0 - BOW.w1 / 2 - gap, hoseAt = null;
  if (h) for (let i = 1; i < h.pts.length; i++) { const a = h.pts[i - 1].map((v) => v * 12), b = h.pts[i].map((v) => v * 12), ya = Math.abs(a[1]), yb = Math.abs(b[1]);
    if ((ya - wallIn) * (yb - wallIn) <= 0 && ya !== yb) { const k = (wallIn - ya) / (yb - ya), s = a[0] + (b[0] - a[0]) * k, z = a[2] + (b[2] - a[2]) * k; hoseAt = [r4(s), r4(z)]; aft = Math.max(aft, s + hr + 0.125); fwd = Math.min(fwd, s - hr - 0.125); } }
  const top = ZAX + PANT.UP * 12;
  const cut = { fs: [r4(fwd), r4(aft)], wl: [r4(legEnd - gap), r4(top)], legEnd, hoseAt, hoseR: hr };
  return { wallIn, wallOut, t, cut, gap, len: [r4(S0 - PANT.L0 * 12), r4(S0 + PANT.L1 * 12)], wl: [r4(ZAX - PANT.DN * 12), r4(top)] };
})();
/** LEZ-32-320 envelope (vendor shape, trimmed): the shell's outer envelope; mass from the vendor weight */
export const PANT_P = { prims: [box('shell', [PNT.wallIn - PNT.t, PNT.len[0], PNT.wl[0]], [PNT.wallOut + PNT.t, PNT.len[1], PNT.wl[1]])], cuts: [] };
export const PANT_LB = { shell: 2.6 };   // BOUND: per pant, trimmed, with its doublers and paint (typed; confirm on the vendor part)

// ------------------------------------------------------------------------------------------- LEZ-32-321 mounting
const T = 0.125, xW = STACK.x3, upper = ZAX + AXB.b;   // web on the torque plate's outboard face, at the upper axle bolts
export const PBK = {
  t: T, web: { bl: [xW, r4(xW + T)], fs: [r4(S0 - 2.5), r4(S0 + 2.5)], wl: [r4(ZAX + 0.5), r4(ZAX + 2.0)] },
  footFs: [r4(S0 - 3.5), r4(S0 + 3.5)], screwFs: [r4(S0 - 3.0), r4(S0 + 3.0)], screwWl: r4(ZAX + 1.25),
  so: { r: 0.375, bl: [r4(STACK.axleEnd), PNT.wallOut], tap: 0.1065 },   // Ø0.75 standoff; 1/4-28 tap drill #3 (0.213)
};
const W = PBK.web, inner = PNT.wallIn;
export const BRKT_P = {
  prims: [
    box('bracket', [W.bl[0], W.fs[0], W.wl[0]], [W.bl[1], W.fs[1], W.wl[1]]),                                   // web on the bolts
    box('bracket', [inner, W.fs[0], W.wl[0]], [W.bl[0], r4(W.fs[0] + T), W.wl[1]]),                               // forward arm
    box('bracket', [inner, r4(W.fs[1] - T), W.wl[0]], [W.bl[0], W.fs[1], W.wl[1]]),                               // aft arm
    box('bracket', [inner, PBK.footFs[0], W.wl[0]], [r4(inner + T), W.fs[0], W.wl[1]]),                           // forward foot on the pant wall
    box('bracket', [inner, W.fs[1], W.wl[0]], [r4(inner + T), PBK.footFs[1], W.wl[1]]),                           // aft foot
    cylX('standoff', PBK.so.bl[0], PBK.so.bl[1], PBK.so.r),                                                     // outboard axle-end standoff
  ],
  cuts: [
    ...[-1, 1].map((a) => ({ feat: 'axle', a: R4([W.bl[0], S0 + a * AXB.a, upper]), b: R4([W.bl[1], S0 + a * AXB.a, upper]), r: r4((AXB.D + 0.006) / 2), into: [0] })),
    ...PBK.screwFs.map((f, k) => ({ feat: 'screw', a: R4([inner, f, PBK.screwWl]), b: R4([inner + T, f, PBK.screwWl]), r: 0.098, into: [3 + k] })),
  ],
};
export const BRKT_RHO = { bracket: 0.098, standoff: 0.098 };   // 6061-T6

// system geometry (model frame, ft; both sides), drawn in the 3D view inside the pants
const toGeo = (p, side) => (p.t === 'box'
  ? { t: 'box', c: [p.c[1] / 12, side * p.c[0] / 12, p.c[2] / 12], d: [p.d[1] / 12, p.d[0] / 12, p.d[2] / 12], mat: '6061' }
  : { t: 'cyl', a: [p.a[1] / 12, side * p.a[0] / 12, p.a[2] / 12], b: [p.b[1] / 12, side * p.b[0] / 12, p.b[2] / 12], r: p.r / 12, mat: '6061' });
defineParts([
  { massItem: 'gear', pn: 'LEZ-32-320', external: true, hide3D: true /* drawn by the airframe model (PANT) */, name: 'Main wheel pants (L/R), pre-moulded glass, trimmed: tyre slot, leg cut-out, inboard screws, outboard hard-point',
    kind: 'cots', ata: 32, nha: 'LEZ-32-300', qty: 2, massEach: PANT_LB.shell,
    geo: [1, -1].map((s) => ({ t: 'box', c: [(PNT.len[0] + PNT.len[1]) / 24, s * YC / 12, (PNT.wl[0] + PNT.wl[1]) / 24], d: [(PNT.len[1] - PNT.len[0]) / 12, (PNT.wallOut - PNT.wallIn + 2 * PNT.t) / 12, (PNT.wl[1] - PNT.wl[0]) / 12], draw: false })),
    blurb: 'Rides on the axle and the leg end through LEZ-32-321: two #10 screws inboard, one AN4 outboard; comes off outboard.',
    steps: [{ title: 'Trim and fit the pants', inspect: ['Leg slot 1/4 in clear of the leg, hose 1/8 in clear of the slot edge', 'Tyre clears the slot and the shell turning the wheel by hand', 'Screws and the AN4 bolt torqued; nutplates riveted'] }],
    src: { mass: 'BOUND (typed)' } },
  { massItem: 'gear', pn: 'LEZ-32-321', external: true, name: 'Wheel-pant mounting (L/R): inboard bracket under the upper axle bolts, outboard axle-end standoff',
    kind: 'machined', ata: 32, nha: 'LEZ-32-320', qty: 2, massEach: 0.29, material: '6061-T6',
    geo: [1, -1].flatMap((s) => BRKT_P.prims.map((p) => toGeo(p, s))),
    blurb: 'Web on the torque plate under the upper AN5 axle bolt heads; arms inboard fore and aft of the leg end to feet on the pant wall; standoff on the axle nut.',
    steps: [{ title: 'Fit the brackets', inspect: ['Web flat on the torque plate under both upper bolt heads', 'Arms clear the heat shield and the leg end ≥ 0.12 in', 'Nutplates riveted on the feet'] }],
    src: { mass: 'Solid × 6061' } },
]);

// ------------------------------------------------------------------------------------------- checks
/** pant attachment loads (limit, lb) and their margins: the pant's inertia in a hard landing and its air loads at V_D */
export function pantMount(d) {
  const m = PANT_LB.shell, nLand = 6.0, VD = 200, q = 0.5 * 0.002377 * (VD * 1.6878) ** 2;
  const front = (PNT.wallOut - PNT.wallIn + 2 * PNT.t) * (PNT.wl[1] - PNT.wl[0]) * 0.85 / 144, side = (PNT.len[1] - PNT.len[0]) * (PNT.wl[1] - PNT.wl[0]) * 0.75 / 144;
  const D = 0.12 * front * q, Sd = 0.6 * side * q * Math.sin(10 * Math.PI / 180), Vi = m * nLand;   // C_D 0.12 frontal; side C_L 0.6 at 10° slip
  const R = Math.hypot(D, Vi), shareIn = 0.5, FS_ = 1.5;
  // inboard: two #10 screws through the 0.06 glass wall into nutplates (bearing in the glass governs); outboard: AN4 in a flox hard-point
  const screw = { shear: 1000, brgGlass: 0.19 * PNT.t * 40000 }, an4 = { shear: 2210, brgGlass: 0.25 * 0.12 * 40000 };
  const perScrew = Math.hypot(R * shareIn / 2, Sd / 2) * FS_, outb = Math.hypot(R * (1 - shareIn), Sd) * FS_;
  const ms = Math.min(Math.min(screw.shear, screw.brgGlass) / perScrew, Math.min(an4.shear, an4.brgGlass) / outb) - 1;
  return { ms, D, Sd, Vi, R, perScrew, outb, VD, q, screw, an4, nLand, m };
}
registerChecks('wpD3-pant', (d, lc) => {
  if (lc.id !== 'W1-S1') return [];
  const P = pantMount(d), out = [];
  const r1 = mk('gear', 'gear-pant-mount', 'Wheel-pant mounting: two #10 screws inboard, one AN4 outboard (landing inertia, drag and side load at V_D)', lc, 'each pant', 'fastener shear and glass bearing', P.ms, {
    formula: 'F = √((m·n_land)² + D²) shared ½ inboard (2 screws), ½ outboard; side S = C_L·q·S_side·sin 10°;  D = C_D·q·A_front;  MS = allowable / (1.5 × load) − 1, allowable = min(fastener shear, bearing in 0.06 glass at 40 ksi)',
    inputs: [['Pant mass', P.m, 'lb', 'BOUND: typed; the margin is ample for any pant under 10 lb'], ['Hard-landing load factor at the axle', P.nLand, 'g', 'BOUND: well above the 23.473 limit landing factor at the wheel'],
      ['V_D', P.VD, 'kt', 'BOUND: above the Long-EZ red line (≈ 174 kt); the margin holds to well beyond'], ['Dynamic pressure', P.q, 'psf', 'DERIVED'], ['Drag C_D (frontal)', 0.12, '', 'BOUND: faired pant, ×3 margin over typical'], ['#10 screw shear (NAS1352-3)', P.screw.shear, 'lb', 'HANDBOOK'], ['AN4 shear', P.an4.shear, 'lb', 'HANDBOOK'], ['Glass bearing', 40000, 'psi', 'BOUND: E-glass/epoxy bearing, conservative']],
    result: [['Drag at V_D', P.D, 'lb'], ['Side load', P.Sd, 'lb'], ['Per inboard screw (×1.5)', P.perScrew, 'lb'], ['Outboard bolt (×1.5)', P.outb, 'lb']] });
  r1.sys = 'LEZ-32-320'; out.push(r1);
  // leg slot: the leg end and the brake hose inside the inner wall's slot with the gap all round
  const C = PNT.cut, legGap = Math.min(S0 - BOW.w1 / 2 - C.fs[0], C.fs[1] - S0 - BOW.w1 / 2, C.legEnd - C.wl[0]);
  const hoseGap = C.hoseAt ? Math.min(C.hoseAt[0] - C.hoseR - C.fs[0], C.fs[1] - C.hoseAt[0] - C.hoseR) : NaN;
  const ms2 = Math.min(legGap / 0.25, (isFinite(hoseGap) ? hoseGap : 0) / 0.125) - 1;
  const r2 = mk('gear', 'gear-pant-cutout', 'Wheel-pant leg slot: the leg end and the brake hose pass the inner wall clear all round', lc, `slot FS ${C.fs.join('–')}, WL ${C.wl[0]} to the top edge`, 'gap', ms2, {
    formula: 'slot = leg end width (fore-aft) + 1/4 in each side, from 1/4 in below the leg end to the pant top edge; widened aft so the hose crossing the wall plane keeps ≥ 1/8 in;  MS = min(leg gap / ¼, hose gap / ⅛) − 1',
    inputs: [['Leg width (fore-aft)', BOW.w1, 'in', 'GEOMETRY'], ['Leg end (bottom of the bow)', C.legEnd, 'in WL', 'GEOMETRY'], ['Inner wall', PNT.wallIn, 'in BL', 'GEOMETRY'], ['Hose crossing the wall plane', C.hoseAt ? `FS ${C.hoseAt[0]}, WL ${C.hoseAt[1]}` : 'none', 'text', 'ROUTED']],
    result: [['Leg gap', legGap, 'in'], ['Hose to the slot edge', hoseGap, 'in']] });
  r2.sys = 'LEZ-32-320'; out.push(r2);
  return out;
});
