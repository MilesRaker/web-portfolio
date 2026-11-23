// WPA4 — front seat back LEZ-53-170: the reclined structural seat back behind the pilot, the jig's "seat" station. A flat
// PVC sandwich in a plane reclined 36° from vertical (airframe/build.py FrontSeat), from the belly to its top edge at
// FS 97.2 (FRONT_SEATBACK_S), cut to the shell's inner contour where the plane meets it and taped to the sides and belly.
//  • Leg openings: the rear passenger's legs pass beside the front seat (dims.py: rear legroom runs beside the front
//    seat), so the lower outboard corners are open from the belly up to 6.5 in above the floor; the central keel and
//    the full-width upper band remain. Holes or edge slots for every routed line crossing the plane.
//  • Front shoulder-harness anchors (block B places the harness; LEZ-25-130): one each side at BL ±anchor, 1.5 in under
//    the top edge, in a solid-BID hard point that runs out to the side wall, so the anchor load goes as solid-laminate
//    bending and shear to the side tapes and into the side panel in its own plane.
//  • Rev C: the back runs on up the slope to shoulder height (WL 46.7): a free-standing solid-BID upper panel above the
//    sill, ≥ 1 in inside the canopy, joined to solid side frames; the anchors sit on it at BL ±3.5, WL 45.5 (strap 0–30°
//    below horizontal from the shoulder, typed from memory).
//  • Checks: f170-sh (anchor bearing, the upper panel as a cantilever from the rev A top, side tapes) at the FAR 23.561
//    forward factor with the 23.785 fitting factor; f170-back (the pilot's back as a pressure on the panel); f170-tape.
// Notional.
import { slabRow } from './slab_pass.js';
import { FIXED, registerChecks, mk, psi, plyRF, allowB, BASE_MAT, fusAt, effective, DEFAULT_DESIGN, materials, loadCases } from '../structures.js';
import { plyWeight } from '../plybook.js';
import { defineParts, insideFus, LOAD, partByPN } from '../systems.js';
import { PILOT_MAX } from './wp5_integration.js';
import { r4, area2, perim, notch, crossingsSlab, slabOf, mergeHoles, pip, flatParams, flatVolumes, edgeNotches, lazyGeo, flatSlab } from './wpA0_flat.js';
import { RHO } from './wpA1_f28.js';
import { canPt, tCut, CANF } from './wpB1_canopy.js';

const TGT = 0.15, IN_ = (n, v, u, s = 'DERIVED') => [n, v, u, s], tB = BASE_MAT.BID.t, D2R = Math.PI / 180;
const bid = (n, a = 0) => Array.from({ length: n }, () => ({ mat: 'BID', angle: a }));
// seat-1 2026-11-22: the seat moved 6 in forward to the plans' pilot arm (W&B arm 59 in; the occupant's seat point was FS 65.6)
// and reclined to the plans' 45° to the floor: foot FS 57.3 (was 63.3, 42°)
export const SB = { recline: 45, sPan: 4.775, top: 5.975,   // re-layout 2026-11-20: foot FS 63.3 (was 88.8), ESTIMATE (plans: 45° to the floor, top near FS 80)
  tsh: FIXED.fuselage.coreIn + 2 * FIXED.fuselage.faceBID * tB, floorOff: 0.17, footUp: -0.13 /* seat-3 2026-11-22: the seat 3 in lower, on the belly (was 0.12) */,
  leg: { u0: 7.5, h: 9.5 /* seat-3: 9.5 in above the lowered foot keeps the openings' tops where they were (was 6.5) */ }, anchor: { u: 3.5, wl: 46.1 /* integration 2026-11-19 (Miles): at the top edge (WL 46.7), 0.6 in under it; was 45.5 */, an: 5, hp: 2.0 }, FF: 1.33, back: { w: 14.4, h: 16.0 }, beta: 0.0626, tape: { n: 2, lap: 1.0 }, faceBID: 2, coreIn: 0.5,
  // rev C: the back runs on up the slope to shoulder height (WL 46.7, as the 3D model's FrontSeat): taped to the shell up to
  // the sill, a free-standing upper panel above it ≥ canopyClr inside the OML. The shoulder-harness anchors sit on it near
  // shoulder height. The upper panel is solid BID (no foam core can pass the straps' 2P transverse shear), joined to solid
  // BID side frames `frame` wide that run down the taped side edges, so the strap load reaches the side tapes in laminate
  topWL: 46.7, sillWL: 41.83, canopyClr: 1.0, frame: 1.5,
  // seated pilot's shoulder point (DESIGN, typed from memory: shoulders at about WL 47–50 for this reclined seat, after
  // block B's occupant estimate), 6 in forward-up of the back's plane (2 in pad + torso half-depth)
  // strap angle at the shoulder (2026-11-19): AC 21-34 places the harness between 5° below and 30° above horizontal at the shoulder (the
  // attachment no more than 5° below); src 'FAA AC 21-34, Shoulder Harness - Safety Belt Installations (faa.gov, accessed 2026-11-19)'. The old
  // 30° below (typed from memory) is outside it. strapMax: degrees below horizontal; strapUp: degrees above.
  shoulder: { wl: 48.0, off: 6.0 }, strapMax: 5, strapUp: 30 };
// the plane: origin at the seat-back foot on the centre line (FS 88.8, the floor + 0.12 ft), v up the slope, w aft-down
const r = SB.recline * D2R, z0 = fusAt(SB.sPan + 0.05).bot + SB.floorOff + SB.footUp;
export const SBP = { o: [SB.sPan, 0, z0], eu: [0, 1, 0], ev: [Math.sin(r), 0, Math.cos(r)], en: [Math.cos(r), 0, -Math.sin(r)] };
// seat-2 2026-11-22 (owner: "redesign the head rest and upper portion of the seat to match images of the seats"): builders' photos
// and notes (longezpush.com Ch. 26, Upholstery) show the front seat back sloping about 20.5 in up from the floor, then a vertical
// top section of about 4 in ("both the front and back seats have a vertical component ... 4 in vertical section on the front
// seat at the top"; the seat pad's "dogleg"), and a headrest pad above it. The reclined panel now ends at that knee; the vertical
// top section, the harness anchors and the headrest are LEZ-53-171 (below)
SB.knee = { v: 20.5, rise: 4.0, src: 'longezpush.com, Chapter 26 – Upholstery (front seat back dimensions photo: 20.5 in sloped; text: 4 in vertical top section), accessed 2026-11-22' };
SB.topWL = +(z0 * 12 + SB.knee.v * Math.cos(r)).toFixed(3);   // the knee (was WL 46.7 on the slope)
const at = (v) => [SB.sPan + v / 12 * Math.sin(r), z0 + v / 12 * Math.cos(r)];   // (s ft, z ft) of the plane's centre line at v (in)
const vAtWL = (wl) => (wl / 12 - z0) * 12 / Math.cos(r);
const vOld = (SB.top - SB.sPan) * 12 / Math.sin(r);   // the rev A top edge (FS 97.2)
/** half-width of the plane's cut at v: the shell's inner contour below the sill, ≥ canopyClr inside the OML above it */
const hwAt = (v, off) => { const [s, z] = at(v), ins = (y) => insideFus(s, y / 12, z, off / 12); if (!ins(0)) return 0; let a = 0, b = 20; for (let i = 0; i < 40; i++) { const m = (a + b) / 2; if (ins(m)) a = m; else b = m; } return a; };
const halfW = (v) => { const [, z] = at(v), off = z * 12 > SB.sillWL ? Math.max(SB.tsh, SB.canopyClr) : SB.tsh; return hwAt(v, off); };
const vSill = vAtWL(SB.sillWL);
/** the shoulder point (in, [FS, WL]) and the strap angle below horizontal from it to an anchor at v */
// integration 2026-11-19 (coordinator / Miles): A's typed design shoulder (WL 48.0, 6 in off the plane) is RETIRED: it sat 5–6 in
// below the ANSUR II occupants. The shoulder points are block B's occupant model (wpB4 OCCS: ANSUR II sitting acromion height,
// 5th-percentile female 20.3 in, 50th male 23.7 in, 95th male 25.7 in, up the back pad from the cushion top; Gordon et al. 2012,
// NATICK/TR-15/007, dtic.mil ADA611869, accessed 2026-11-19), which B registers here (B imports this module). The legacy point is
// kept only as the fallback before B loads. Every strap angle is to be confirmed at Miles's seated mock-up fit check.
export const OCC_KEYS = ['f5', 'm50', 'm95'];
let SHM = null;
export const setShoulderModel = (f) => { SHM = f; };
const legacyShoulder = () => { const v = vAtWL(SB.shoulder.wl - SB.shoulder.off * Math.sin(r)), [s, z] = at(v); return [s * 12 - SB.shoulder.off * Math.cos(r), z * 12 + SB.shoulder.off * Math.sin(r)]; };
/** shoulder point [FS, WL] (in) of occupant k (default the 95th-percentile male) */
export const shoulderPt = (k = 'm95') => (SHM ? SHM(k) : legacyShoulder());
/** strap angle below horizontal (deg) from occupant k's shoulder to the point v up the plane where the strap leaves the back
 *  (> 90° means the anchor is ahead of the shoulder: the strap runs forward and down) */
export const strapAngle = (k = 'm95') => { const S = shoulderPt(k), a = suAnchorPt(SUG.anchors[0]); return Math.atan2(S[1] - a[2], a[1] - S[0]) / D2R; };   // seat-2: to LEZ-53-171's anchor
/** the governing occupant (largest angle below horizontal) */
export const strapWorst = () => OCC_KEYS.map((k) => ({ k, deg: strapAngle(k) })).reduce((a, b) => (b.deg > a.deg ? b : a));
export const SBG = lazyGeo(() => {
  const vTop = vAtWL(SB.topWL);
  let vBot = 0; while (halfW(vBot - 0.05) > 0) vBot -= 0.05; let lo = vBot - 0.05, hi = vBot; for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; if (halfW(m) > 0) hi = m; else lo = m; } vBot = hi;
  // seat-3: with the seat lowered the knee (the top edge) can be under the sill; the outline then ends at it
  const vEnd = Math.min(vSill, vTop), vs = []; for (let i = 0; i <= 40; i++) vs.push(vBot + (vEnd - vBot) * (1 - Math.cos(Math.PI / 2 * i / 40)));
  const vs2 = []; if (vTop > vSill) for (let i = 1; i <= 24; i++) vs2.push(vSill + (vTop - vSill) * i / 24);
  const right = [...vs.map((v) => [halfW(v), v]), ...(vTop > vSill ? [[hwAt(vSill + 1e-6, Math.max(SB.tsh, SB.canopyClr)), vSill]] : []), ...vs2.map((v) => [halfW(v), v])], left = right.slice().reverse().map(([u, v]) => [-u, v]);
  let pts = [[0, vBot], ...right.slice(1), ...left.slice(0, -1)];
  pts = pts.filter((q, i) => i === 0 || Math.hypot(q[0] - pts[i - 1][0], q[1] - pts[i - 1][1]) > 1e-4);
  const vFloor = 0, legs = [1, -1].map((sg) => (sg > 0 ? [SB.leg.u0, 30, vBot - 2, vFloor + SB.leg.h / Math.cos(r)] : [-30, -SB.leg.u0, vBot - 2, vFloor + SB.leg.h / Math.cos(r)]));
  for (const R of legs) pts = notch(pts, R);
  const anchors = [];   // seat-2: the shoulder-harness anchors are on the upper panel LEZ-53-171 (SUG.anchors)
  const raw = crossingsSlab(SBP, ...slabOf(sbLayers()), [pts]);   // rev: holes from each line's footprint through the whole thickness
  const en = edgeNotches(pts, mergeHoles(raw).map((h) => ({ ...h, id: 'pass' })));
  pts = en.pts;
  const holes = [...anchors, ...en.holes], wTop = halfW(vTop);
  // the taped perimeter: every edge below the sill (the upper panel's edges are free)
  const taped = pts.reduce((a, q, i) => { const n = pts[(i + 1) % pts.length]; return a + (Math.max(q[1], n[1]) <= vSill + 1e-6 && Math.min(q[1], n[1]) < vTop - 1e-3 ? Math.hypot(n[0] - q[0], n[1] - q[1]) : 0); }, 0);   // the top edge is the knee joint, not taped to the shell
  const legTop = legs[0][3], edgeAt = (v) => (v < legTop ? Math.min(SB.leg.u0, halfW(v)) : halfW(v));
  return { pts, vTop, vOld, vSill, vBot, legs, legTop, anchors, raw, pass: en.holes, slots: en.slots, holes, wTop, wRoot: hwAt(vSill - 1e-6, SB.tsh), perim: perim(pts), taped, A: area2(pts), at, halfW, hwAt, vAtWL, edgeAt };
});
/** solid BID (the core left out): the whole upper panel above the sill, and side frames `frame` wide inside the taped side
 *  edges from the sill down to the floor, stepped to follow the edge (cells of the union count once) */
export const sbRegs = () => { const G = SBG, vS = Math.min(G.vSill, G.vTop), out = G.vTop > G.vSill ? [[-30, 30, G.vSill, G.vTop + 1]] : [[-30, 30, G.vTop - 1.5, G.vTop + 1]], n = 16;   // seat-3: with the knee under the sill, a 1.5 in solid band along the knee for the upper panel's tapes
  for (let i = 0; i < n; i++) { const a = G.vBot + (vS - G.vBot) * i / n, b = G.vBot + (vS - G.vBot) * (i + 1) / n, u = Math.min(G.edgeAt(a), G.edgeAt(b)) - SB.frame; out.push([u, 30, a, b + 1e-6], [-30, -u, a, b + 1e-6]); }
  return { hp: out }; };
export function sbLayers() {
  const c = SB.coreIn / 2, tf = SB.faceBID * tB;
  return [{ name: 'core', mat: 'PVC', w0: -c, w1: c, ol: 'out', cut: 'hp', feat: 'face' }, { name: 'hpk', mat: 'BID', w0: -c, w1: c, ol: 'out', reg: 'hp', feat: 'hp' },
    { name: 'faceF', mat: 'BID', w0: -c - tf, w1: -c, ol: 'out', feat: 'face' }, { name: 'faceA', mat: 'BID', w0: c, w1: c + tf, ol: 'out', feat: 'face' }];
}
export const sbParams = () => { const R = sbRegs(); return flatParams({ P: SBP, polys: { out: [SBG.pts] }, holes: SBG.holes, layers: sbLayers(), regs: { hp: R.hp }, cuts: { hp: R.hp } }); };
export const sbTape = () => { const a = SBG.taped * 2 * SB.tape.lap * 2; return { area: a, lb: plyWeight('BID', a / 144, SB.tape.n) }; };
export const sbMassOf = (v) => sbLayers().reduce((a, l) => a + (v[l.name] ?? 0) * RHO[l.mat], 0) + sbTape().lb;
export const sbMass = () => sbMassOf(flatVolumes(sbParams()));
// ------------------------------------------------------------------------------------------- LEZ-53-171 upper seat back and headrest
// seat-2 2026-11-22: a vertical panel standing on the reclined back's top edge (the knee), as builders' front seats show it
// (longezpush.com Ch. 26: the sloped back, then a vertical top section about 4 in tall), carrying the shoulder-harness
// anchors near its top edge and, above that edge, a narrow round-topped headrest on the centre line (the builders' headrest
// pads sit on the seat top behind the head, about 8 in wide, the pad trimmed to 0.9 in thick: the same source). Free-standing
// inside the canopy (≥ 1 in from the OML), joined to LEZ-53-170's top edge with flox and BID tapes on both faces.
export const SU = { rise: SB.knee.rise, head: { hw: 4.0, straight: 3.5 }, anchor: { u: 5.5, below: 0.75 }, tape: { n: 2, lap: 1.0 }, canopyClr: 1.0,
  src: 'longezpush.com, Chapter 26 – Upholstery (front seat top section and headrest pads), accessed 2026-11-22; headrest width and height DESIGN' };
const kS = SB.sPan + SB.knee.v / 12 * Math.sin(r), kZ = z0 + SB.knee.v / 12 * Math.cos(r);
/** the upper panel's plane: origin on the knee's centre line, v straight up, w aft (thickness) */
export const SUP = { o: [kS, 0, kZ], eu: [0, 1, 0], ev: [0, 0, 1], en: [1, 0, 0] };
/** half-width (in) of the upper panel at v (in above the knee), both faces ≥ canopyClr inside the OML */
const canHw = (sFt, zIn, off) => { const t0 = tCut(sFt, off); if (canPt(sFt, Math.PI / 2, off)[1] < zIn) return 0; if (canPt(sFt, t0, off)[1] >= zIn) return canPt(sFt, t0, off)[0];
  let a = t0, b = Math.PI / 2; for (let i = 0; i < 50; i++) { const m = (a + b) / 2; if (canPt(sFt, m, off)[1] < zIn) a = m; else b = m; } return canPt(sFt, a, off)[0]; };
/** half-width (in) of the upper panel at v (in above the knee): both faces ≥ canopyClr inside the canopy's inner skin (the
 *  canopy as built, wpB1) above the sill, inside the shell below it */
const suHw = (v) => { const z = kZ * 12 + v, h = (SB.t || 0.6) / 24;
  if (z > SB.sillWL) return Math.max(0, Math.min(...[kS - h, kS + h].map((sFt) => canHw(sFt, z, -(CANF.t + SU.canopyClr)))));
  const off = SB.tsh / 12, ins = (y) => insideFus(kS - h, y / 12, z / 12, off) && insideFus(kS + h, y / 12, z / 12, off);
  if (!ins(0)) return 0; let a = 0, b = 20; for (let i = 0; i < 40; i++) { const m = (a + b) / 2; if (ins(m)) a = m; else b = m; } return a; };
export const SUG = lazyGeo(() => {
  const H = SU.head, top = SU.rise, right = [];
  for (let i = 0; i <= 12; i++) { const v = top * i / 12; right.push([r4(suHw(v)), r4(v)]); }
  const hh = Math.min(H.hw, suHw(top + H.straight + H.hw) - 0.05), v1 = top + H.straight;
  right.push([hh, top], [hh, v1]);
  for (let i = 1; i < 12; i++) { const a = Math.PI / 2 * i / 12; right.push([r4(hh * Math.cos(a)), r4(v1 + hh * Math.sin(a))]); }
  const apex = [0, r4(v1 + hh)], left = right.slice().reverse().map(([u, v]) => [-u, v]);
  let pts = [...right, apex, ...left]; pts = pts.filter((q, i) => i === 0 || Math.hypot(q[0] - pts[i - 1][0], q[1] - pts[i - 1][1]) > 1e-4);
  const anchors = [1, -1].map((sg) => ({ id: 'anchor', kind: 'bolt', u: sg * SU.anchor.u, v: r4(top - SU.anchor.below), r: r4((SB.anchor.an / 16 + 0.006) / 2), what: `front shoulder-harness anchor AN${SB.anchor.an}` }));
  return { pts, anchors, holes: anchors, top, vHead: apex[1], hh, wRoot: suHw(0), wTop: suHw(top), A: area2(pts), perim: perim(pts), at: (v) => [kS, kZ + v / 12], hw: suHw };
});
/** an anchor's point on the upper panel's forward face, aircraft frame [BL, FS, WL] (in) */
export const suAnchorPt = (a) => [a.u, kS * 12 - SB.t / 2, kZ * 12 + a.v];
/** the upper panel's forward face: FS (in) and the WL (in) at v */
export const suFace = (v = 0) => [kS * 12 - SB.t / 2, kZ * 12 + v];
export const suRegs = () => ({ hp: [[-30, 30, -1, SUG.top]] });   // solid below the top edge (the anchors), cored headrest above
export const suParams = () => { const R = suRegs(); return flatParams({ P: SUP, polys: { out: [SUG.pts] }, holes: SUG.holes, layers: sbLayers(), regs: { hp: R.hp }, cuts: { hp: R.hp } }); };
export const suTape = () => { const a = 2 * SUG.wRoot * 2 * SU.tape.lap * 2; return { area: a, lb: plyWeight('BID', a / 144, SU.tape.n) }; };
export const suMassOf = (v) => sbLayers().reduce((a, l) => a + (v[l.name] ?? 0) * RHO[l.mat], 0) + suTape().lb;
export const suMass = () => suMassOf(flatVolumes(suParams()));
/** the shoulder strap load this record is sized for: block B's harness values (LEZ-25-130 BELT; B imports this module,
 *  so the numbers are carried here and the record's I2 checks they still equal B's) */
export const STRAP = { occupant: 215, shoulderShare: 0.6, ff: 1.33 };
const BELT = STRAP;
/** shoulder anchor state, both straps together (P each, taken normal to the panel: conservative): bearing at the AN bolt
 *  in the solid band; the upper panel as a cantilever from the rev A top (where the back is taped all round) up to the
 *  anchors, faces in bending and the core in shear over the root width; the side tapes below the root */
function shState(n, M, h, core, nF) {
  const t = core + 2 * nF * tB, P = n * BELT.occupant * BELT.shoulderShare / 2 * BELT.ff, D = SB.anchor.an / 16, brg = P / (D * t), msBr = psi(M.BID.Fbru) / brg - 1;
  const lam = bid(Math.round(t / tB)), ILSS = psi(M.GUD.ILSS);
  // seat-2: LEZ-53-171 a cantilever from the knee (anchors L1 above it), the knee's tapes carry its root moment as a couple
  const L1 = SUG.anchors[0].v, b1 = 2 * SUG.wRoot, M1 = 2 * P * L1, sig1 = 6 * M1 / (b1 * t * t), rf1 = plyRF(lam, [sig1 * t, 0, 0], M), msB1 = rf1.rf - 1;
  const Nk = M1 / (b1 * t) + P / b1, tauK = Nk / SU.tape.lap, msK = ILSS / tauK - 1;
  // LEZ-53-170's solid band from the knee down to the sill, then the side tapes below it
  const L = L1 + Math.max(0, SBG.vTop - SBG.vSill), b = 2 * Math.min(SBG.wRoot, SBG.wTop), Mb = 2 * P * L, sig = 6 * Mb / (b * t * t), rf = plyRF(lam, [sig * t, 0, 0], M), msB = rf.rf - 1, N = sig * t;
  const tau = 2 * P / (b * t), msC = ILSS / tau - 1;
  const tauT = 2 * P / (SBG.taped * 2 * SB.tape.lap), msT = ILSS / tauT - 1;
  const ms171 = Math.min(msBr, msB1, msK), ms170 = Math.min(msB, msC, msT);
  return { P, D, t, brg, msBr, L1, b1, M1, rf1, msB1, Nk, tauK, msK, L, b, Mb, N, rf, msB, tau, msC, tauT, msT, h, ms171, ms170, ms: Math.min(ms171, ms170) };
}
/** sized: faces and core of the whole back (the pilot's back load, f170-back, also governs them) and the band depth,
 *  lightest first that keeps f170-sh at the +15 % reserve under block B's strap load */
{ const d = effective(DEFAULT_DESIGN), M = materials(d), n = d.emergencyFwd * (d.KD ?? 1), A = SBG.A; let pick = null;
  for (const core of [0.375, 0.5, 0.625, 0.75]) { if (core < SB.coreIn) continue; const s = shState(n, M, 0, core, SB.faceBID); if (s.ms >= TGT) { pick = { core }; break; } }
  pick ||= { core: 0.75 }; SB.coreIn = pick.core; void A; }
SB.t = SB.coreIn + 2 * SB.faceBID * tB;

// ------------------------------------------------------------------------------------------- checks
const nUlt = (d) => d.FS * Math.max(...loadCases(d).filter((lc) => lc.type === 'sym').map((lc) => lc.n));
registerChecks('wpA4-seatback', (d, lc, Z, M) => {
  const sys = { sys: 'LEZ-53-170' }, out = [];
  if (lc.type === 'emergency') {
    const s = shState(lc.n * (d.KD ?? 1), M, SB.anchor.hp, SB.coreIn, SB.faceBID), { P, D, t, brg, msBr, L1, b1, M1, rf1, msB1, Nk, tauK, msK, L, b, Mb, N, rf, msB, tau, msC, tauT, msT } = s;
    const common = [IN_('Load factor (ultimate)', lc.n, 'g', 'FAR23'), IN_('Occupant weight', BELT.occupant, 'lb', 'FAR23 (LEZ-25-130 BELT)'), IN_('Shoulder share of the occupant, per strap ½', BELT.shoulderShare, '', 'BOUND: block B\'s upper-torso share (LEZ-25-130, typed from memory)'), IN_('Fitting factor (seat and belt attachments)', BELT.ff, '', 'FAR 23.785 (typed from memory; verify against eCFR)')];
    const m171 = s.ms171 === msBr ? 'anchor bearing' : s.ms171 === msB1 ? `upper panel bending at the knee (${rf1.mode})` : 'knee tapes, lap shear';
    out.push(Object.assign(mk('fuselage', 'f171-sh', `Upper seat back: shoulder-harness anchors (AN${SB.anchor.an} in solid 6781) and the panel and knee joint they hang on`, lc, `BL ±${SU.anchor.u}, WL ${(suAnchorPt(SUG.anchors[0])[2]).toFixed(2)}`, m171, s.ms171, {
      formula: 'P = n·W·share/2 × 1.33 per strap (block B), normal to the panel (conservative);  σ_br = P/(D·t);  the solid upper panel a cantilever from the knee: M = 2P·L, σ = 6M/(b·t²) (CLT first ply);  knee tapes both faces carry M as a couple plus the shear: N = M/(b·t) + P/b, τ = N/lap',
      inputs: [...common, IN_('Upper panel', `solid 6781 ${t.toFixed(3)} in, ${b1.toFixed(1)} in wide at the knee, anchors ${L1.toFixed(2)} in above it`, 'text', 'SIZED'), IN_('Knee tapes', `${SU.tape.n} × 6781, ${SU.tape.lap} in lap each side, both faces`, 'text', 'DESIGN'),
        IN_('Bearing allowable', psi(M.BID.Fbru), 'psi', allowB(msBr, 'compressive strength (bearing not published)')), IN_('Ply strengths', '6781 (MTM45-1) typical', 'text', allowB(msB1)), IN_('Bond allowable', psi(M.GUD.ILSS), 'psi', allowB(msK, 'interlaminar shear strength'))],
      result: [['P per strap (ult.)', P, 'lb'], ['σ bearing', brg, 'psi'], ['M at the knee (ult.)', M1, 'inlb'], ['N knee tapes', Nk, 'lb/in'], ['τ knee tapes', tauK, 'psi']] }), { sys: 'LEZ-53-171' }));
    const m170 = s.ms170 === msB ? `solid band bending at the sill (${rf.mode})` : s.ms170 === msC ? 'solid band transverse shear' : 'side tapes, lap shear';
    out.push(Object.assign(mk('fuselage', 'f170-sh', 'Front seat back: the upper panel\'s strap load through the solid band to the sill and the side tapes', lc, `knee WL ${SB.topWL.toFixed(2)} to the sill WL ${SB.sillWL}`, m170, s.ms170, {
      formula: 'P per strap as LEZ-53-171 (f171-sh);  the solid band a cantilever from the sill (taped all round below it, side frames solid): M = 2P·L (L = anchors above the knee + knee above the sill along the back, conservative), σ = 6M/(b·t²), τ = 2P/(b·t) against the ILSS;  side tapes τ = 2P/(taped perimeter × 2 faces × lap)',
      inputs: [...common, IN_('Solid band', `solid 6781 ${t.toFixed(3)} in, ${b.toFixed(1)} in wide at the sill, lever ${L.toFixed(2)} in; side frames ${SB.frame} in solid`, 'text', 'SIZED'),
        IN_('Interlaminar shear allowable', psi(M.GUD.ILSS), 'psi', allowB(msC, 'interlaminar shear strength')), IN_('Ply strengths', '6781 (MTM45-1) typical', 'text', allowB(msB)), IN_('Bond allowable', psi(M.GUD.ILSS), 'psi', allowB(msT, 'interlaminar shear strength'))],
      result: [['M at the sill (ult.)', Mb, 'inlb'], ['N (solid, ult.)', N, 'lb/in'], ['τ band', tau, 'psi'], ['τ side tapes', tauT, 'psi']] }), sys));
  }
  if (lc.type === 'sym' && lc.n === Math.max(...loadCases(d).filter((q) => q.type === 'sym').map((q) => q.n))) {
    const P = PILOT_MAX * nUlt(d) * Math.sin(r), p = P / (SB.back.w * SB.back.h), sb = Math.min(2 * SBG.wTop, SBG.vTop - SBG.vBot), Mx = SB.beta * p * sb * sb, dd = SB.coreIn + SB.faceBID * tB, N = Mx / dd, rf = plyRF(bid(SB.faceBID), [N, 0, 0], M), tau = P / (2 * (SB.back.w + SB.back.h) * dd), msC = psi(M.PVC.tau) / tau - 1, ms = Math.min(rf.rf - 1, msC);
    out.push(Object.assign(mk('fuselage', 'f170-back', `Front seat back under the pilot (${SB.faceBID} × 6781 0/90 faces on ${SB.coreIn} in HT61)`, lc, 'panel centre, footprint edge', rf.rf - 1 < msC ? `face ${rf.mode}` : 'core shear round the footprint', ms, {
      formula: 'P = W·n_ult·sin(recline) as p = P/(w·h) over the whole panel for bending: M = β·p·b², N = M/d;  core shear round the footprint τ = P/(2(w + h)·d)',
      inputs: [IN_('Pilot weight (placard maximum)', PILOT_MAX, 'lb', 'DESIGN (wp5 PILOT_MAX)'), IN_('Ultimate load factor', nUlt(d), 'g', 'FAR23 (V-n, × FS)'), IN_('Recline', SB.recline, 'deg', 'GEOMETRY (airframe/build.py FrontSeat)'), IN_('Back footprint', `${SB.back.w} × ${SB.back.h} in`, 'text', 'DESIGN'),
        IN_('Plate coefficient β', SB.beta, '', `BOUND: Roark simply supported plate, a/b 1.2 (typed from memory); MS stays ≥ 0 up to β = ${(SB.beta * rf.rf).toFixed(3)}`), IN_('Core shear allowable', psi(M.PVC.tau), 'psi', `BOUND: HT61 datasheet-typical; MS stays ≥ 0 down to ${tau.toFixed(0)} psi`), IN_('Ply strengths', '6781 (MTM45-1) typical', 'text', allowB(rf.rf - 1))],
      result: [['P (ult.)', P, 'lb'], ['N face', N, 'lb/in'], ['τ core', tau, 'psi']] }), sys));
    const q = P / SBG.perim, tauT = q / (2 * SB.tape.lap), msT = psi(M.GUD.ILSS) / tauT - 1;
    out.push(Object.assign(mk('fuselage', 'f170-tape', `Front seat back to the shell (${SB.tape.n} × 6781 tapes each face)`, lc, 'perimeter', 'tape lap shear', msT, {
      formula: 'q = P/perimeter;  τ = q/(2·lap)', inputs: [IN_('Back load P (ult.)', P, 'lb', 'DERIVED (f170-back)'), IN_('Bonded perimeter', SBG.perim, 'in', 'GEOMETRY'), IN_('Tape lap', SB.tape.lap, 'in', 'SIZED'), IN_('Bond allowable', psi(M.GUD.ILSS), 'psi', allowB(msT, 'interlaminar shear strength'))],
      result: [['q (ult.)', q, 'lb/in'], ['τ', tauT, 'psi']] }), sys));
  }
  return out;
});

const S1 = (title, inspect) => ({ title, inspect });
const [sc, zc] = SBG.at((SBG.vTop + SBG.vBot) / 2);
defineParts([{ pn: 'LEZ-53-170', name: 'Front seat back (reclined structural bulkhead, shoulder-harness anchors)', kind: 'laminate', ata: 53, nha: 'LEZ-53-150', massItem: 'fus', material: 'HT61 sandwich, 6781 faces',
  massEach: +sbMass().toFixed(3), cg: [sc, 0, zc], geo: [{ t: 'box', c: [sc, 0, zc], d: [0.05, 0.6, 0.4], draw: false }],
  blurb: 'Reclined HT61-foam sandwich seat back behind the pilot, taped to the belly and the sides; leg openings at its lower outboard corners for the rear passenger; the front shoulder harness anchors in solid hard points at its top corners.',
  steps: [S1('Lay up the forward face; lay the hard-point 6781 packs; lay up the aft face; cure; cut to the template', ['Outline within ±1/16 in', 'Hard points at the anchor positions']), S1('Install at 36° in the fuselage jig; flox fillets; tape both faces', ['Recline 36° ± 0.5°', 'Top edge at FS 97.2 ± 0.1'])],
  src: { mass: 'GEOMETRY: the definition solid (LEZ-53-170)' } }]);
void TGT;
// the mass above was taken from the provisional geometry; refresh it once every parts module has loaded
LOAD.after.push(() => { const q = partByPN('LEZ-53-170'); if (q) q.massEach = +sbMass().toFixed(3); });

// seat-2: LEZ-53-171, the vertical top section with the harness anchors and the headrest
{ const [ss, zz] = SUG.at(SUG.top);
  defineParts([{ pn: 'LEZ-53-171', name: 'Upper seat back and headrest (vertical top section, shoulder-harness anchors)', kind: 'laminate', ata: 53, nha: 'LEZ-53-150', massItem: 'fus', material: 'Solid 6781 below the top edge; HT61 sandwich headrest',
    massEach: +suMass().toFixed(3), cg: [ss, 0, zz], geo: [{ t: 'box', c: [ss, 0, zz], d: [0.05, 0.4, 0.4], draw: false }],
    blurb: 'Vertical panel on the reclined seat back\'s top edge, as builders\' Long-EZ front seats have it: the shoulder-harness anchors near its top edge and a round-topped headrest on the centre line above, free-standing inside the canopy.',
    steps: [S1('Lay up flat: solid 6781 below the top edge, HT61 sandwich in the headrest; cure; cut to the template', ['Outline within ±1/16 in', 'Anchor holes drilled from the template']), S1('Stand on LEZ-53-170\'s top edge, vertical; flox; tape both faces', ['Vertical within 0.5°', 'Headrest on the centre line'])],
    src: { mass: 'GEOMETRY: the definition solid (LEZ-53-171)' } }]); }
LOAD.after.push(() => { const q = partByPN('LEZ-53-171'); if (q) q.massEach = +suMass().toFixed(3); });

/** final integration (LEZ-31-100 rev C fix): the slab check, every line through the full thickness clear of the laminate in its hole */
export const sbSlab = () => flatSlab(sbParams());
registerChecks('sb-slab', (d, lc) => (lc.id !== 'W1-S1' ? [] : [slabRow(mk, lc, 'f170-slab', 'Front seat back: every line through the thickness clear of the laminate in its hole or notch', 'LEZ-53-170', sbSlab(), { slab: 'the full-outline layers (faces and core)', clr: 'lines 1/8 in, rods 1/16 in all round; bolts and pins in their fit holes' })]));
