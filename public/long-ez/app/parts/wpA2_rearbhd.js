// WPA2 — rear seat bulkhead LEZ-53-175 at FS 130.2 (the model's rear seat-back station, REAR_SEATBACK_S in airframe/dims.py,
// 1.2 in aft of the canopy's aft edge): a flat PVC sandwich fitted inside the shell under the turtledeck and taped to it.
//  • Outline: the shell's inner contour at FS 130.2 (closed section). The foot stands over the main-gear mount
//    extrusions (LEZ-32-120, block D): it is notched to clear each extrusion by 1/8 in (sealed with soft foam, no load
//    path into the gear mount), so the gear loads stay in the shell and D's extrusions. Holes: a grommet hole for every
//    routed line crossing FS 130.2 (brake lines, fuel feeds, raceways, rudder cables, engine controls…), and four flox
//    inserts on the aft face for the ELT tray (block J).
//  • Checks: f175-back (the reclined rear seat back bears on it: occupant × ultimate load factor × sin recline, as a
//    pressure on a simply supported plate), f175-tape (the tapes), f175-elt (tray inserts at the FAR 23.561 items-of-mass
//    factors). It does not carry the rear shoulder harness: those anchor on the CS spar top (block B), see the record.
// Notional.
import { slabRow } from './slab_pass.js';
import { FIXED, registerChecks, mk, psi, plyRF, allowB, BASE_MAT, effective, DEFAULT_DESIGN, materials, loadCases } from '../structures.js';
import { plyWeight } from '../plybook.js';
import { defineParts, PARTS, LOAD, partByPN } from '../systems.js';
import { PAX_MAX } from './wp5_integration.js';
import { ELT_AT } from './wp4_avionics_cabin.js';
import { r4, area2, perim, notch, innerRing, vertPlane, crossingsSlab, slabOf, mergeHoles, pip, flatParams, flatVolumes, toPlane, edgeNotches, lazyGeo, flatSlab } from './wpA0_flat.js';
import { RHO } from './wpA1_f28.js';

const TGT = 0.15, IN_ = (n, v, u, s = 'DERIVED') => [n, v, u, s], tB = BASE_MAT.BID.t;
const bid = (n) => Array.from({ length: n }, () => ({ mat: 'BID', angle: 0 }));   // faces laid 0/90 (fibres along BL and WL): the panel works in plate bending
/** station and seat geometry (the rear seat's recline and back width are airframe/build.py's: seat("RearSeat", …, 30, 1.65, 1.5)) */
export const RB = { s: 8.725,   // re-layout 2026-11-20: FS 104.7 (was 130.2), moved with the aft group; ESTIMATE (plans: against the CS spar)
  recline: 30, backW: 18.0, backH: 16.0, tape: { n: 2, lap: 1.0 }, gearClr: 0.125, tsh: FIXED.fuselage.coreIn + 2 * FIXED.fuselage.faceBID * tB,
  bag: { u0: -8.4, u1: 2.6, v0: 42.0 }, elt: { n: 4, du: 2.0, dv: 1.5, insertD: 0.375, std: 'NAS1832C3-6' }, beta: 0.0626 };   // β: Roark, simply supported rectangular plate, uniform load, a/b = 1.2 (typed from memory: bound)
const S = RB.s * 12, RBG_W = 6.0;   // boxes narrower than this are extrusion envelopes
export const RBG = lazyGeo(() => {
  const P = vertPlane(RB.s);
  let pts = innerRing(RB.s, RB.tsh);
  // notches over the main-gear extrusions: every LEZ-32-120 box crossing the plane, grown by the clearance
  const notches = [];
  for (const p of PARTS.filter((q) => q.pn === 'LEZ-32-120')) for (const g of p.geo) if (g.t === 'box' && Math.abs(g.c[0] - RB.s) < g.d[0] / 2 && g.d[1] * 12 < RBG_W) {   // the extrusions, not the bow's centre section under the belly
    const c = toPlane(P, g.c), R = [c.u - g.d[1] * 6 - RB.gearClr, c.u + g.d[1] * 6 + RB.gearClr, c.v - g.d[2] * 6 - RB.gearClr, c.v + g.d[2] * 6 + RB.gearClr];
    const before = area2(pts); pts = notch(pts, R); if (area2(pts) < before - 1e-6) notches.push(R);
  }
  // baggage access opening above the rear back pad (block B's shelf LEZ-25-140, FS 131.5–147, BL −8.4…+2.6, WL ≥ 39): open
  // from the top edge down to WL bag.v0; the turtledeck closes it above
  pts = notch(pts, [RB.bag.u0, RB.bag.u1, RB.bag.v0, Math.max(...pts.map((q) => q[1])) + 1]);
  const raw = crossingsSlab(P, ...slabOf(rbLayers()), [pts]);   // rev: holes from each line's footprint through the whole thickness
  const en = edgeNotches(pts, mergeHoles(raw).map((h) => ({ ...h, id: 'pass' })));
  pts = en.pts; const pass = en.holes, slots = en.slots;
  const ec = toPlane(P, ELT_AT), elt = [-1, 1].flatMap((a) => [-1, 1].map((b) => ({ id: 'elt', kind: 'insert', u: r4(ec.u + a * RB.elt.du / 2), v: r4(ec.v + b * RB.elt.dv / 2), r: 0.095, what: `ELT tray insert ${RB.elt.std}` })));
  const holes = [...pass, ...elt], us = pts.map((q) => q[0]), vs = pts.map((q) => q[1]);
  return { pts, notches, slots, raw, pass, elt, holes, wIn: Math.max(...us), zTop: Math.max(...vs), zBot: Math.min(...vs), perim: perim(pts), A: area2(pts) };
});
// ------------------------------------------------------------------------------------------- back load and sizing
const nUlt = (d) => d.FS * Math.max(...loadCases(d).filter((lc) => lc.type === 'sym').map((lc) => lc.n));
/** the back load as a pressure p on the back's footprint, applied to the whole panel (conservative); span b the shorter side */
const backState = (d, M, nF, core) => {
  const P = PAX_MAX * nUlt(d) * Math.sin(RB.recline * Math.PI / 180), p = P / (RB.backW * RB.backH), a = 2 * RBG.wIn, b = RBG.zTop - RBG.zBot, sb = Math.min(a, b);
  const Mx = RB.beta * p * sb * sb, dd = core + nF * tB, N = Mx / dd, rf = plyRF(bid(nF), [N, 0, 0], M), V = P / (2 * (RB.backW + RB.backH)), tau = V / dd, msC = psi(M.PVC.tau) / tau - 1;
  return { P, p, a, b, sb, Mx, dd, N, rf, V, tau, msF: rf.rf - 1, msC, ms: Math.min(rf.rf - 1, msC) };
};
export const RBS = (() => { const d = effective(DEFAULT_DESIGN), M = materials(d); for (const core of [0.375, 0.5, 0.625]) for (let n = 2; n <= 4; n++) { const s = backState(d, M, n, core); if (s.ms >= TGT) return { faceBID: n, core }; } return { faceBID: 4, core: 0.75 }; })();
RB.faceBID = RBS.faceBID; RB.coreIn = RBS.core; RB.t = RB.coreIn + 2 * RB.faceBID * tB;
export function rbLayers() {
  const c = RB.coreIn / 2, tf = RB.faceBID * tB;
  return [{ name: 'core', mat: 'PVC', w0: -c, w1: c, ol: 'out', cut: 'ins', feat: 'face' }, { name: 'insert', mat: 'FLOX', w0: -c, w1: c, ol: 'out', reg: 'ins', feat: 'elt' },
    { name: 'faceF', mat: 'BID', w0: -c - tf, w1: -c, ol: 'out', feat: 'face' }, { name: 'faceA', mat: 'BID', w0: c, w1: c + tf, ol: 'out', feat: 'face' }];
}
export const rbRegs = () => RBG.elt.map((h) => [h.u - 0.375, h.u + 0.375, h.v - 0.375, h.v + 0.375]);
export const rbParams = () => flatParams({ P: vertPlane(RB.s), polys: { out: [RBG.pts] }, holes: RBG.holes, layers: rbLayers(), regs: { ins: rbRegs() }, cuts: { ins: rbRegs() } });
export const rbTape = () => { const a = RBG.perim * 2 * RB.tape.lap * 2; return { area: a, lb: plyWeight('BID', a / 144, RB.tape.n) }; };
export const rbMassOf = (v) => rbLayers().reduce((a, l) => a + (v[l.name] ?? 0) * RHO[l.mat], 0) + rbTape().lb;
export const rbMass = () => rbMassOf(flatVolumes(rbParams()));

// ------------------------------------------------------------------------------------------- checks
registerChecks('wpA2-rearbhd', (d, lc, Z, M) => {
  const sys = { sys: 'LEZ-53-175' }, out = [];
  if (lc.type === 'sym' && lc.n === Math.max(...loadCases(d).filter((q) => q.type === 'sym').map((q) => q.n))) {
    const s = backState(d, M, RB.faceBID, RB.coreIn);
    out.push(Object.assign(mk('fuselage', 'f175-back', `Rear seat bulkhead under the rear seat back (${RB.faceBID} × 6781 faces on ${RB.coreIn} in HT61)`, lc, 'panel centre, footprint edge', s.msF < s.msC ? `face ${s.rf.mode}` : 'core shear round the footprint', s.ms, {
      formula: 'P = W·n_ult·sin(recline) on the back footprint as p = P/(w·h), applied to the whole panel for bending (conservative): simply supported plate M = β·p·b², N = M/d;  core shear where the load enters, round the footprint: τ = P / (2(w + h)·d)',
      inputs: [IN_('Occupant weight (rear seat placard maximum)', PAX_MAX, 'lb', 'DESIGN (wp5 PAX_MAX)'), IN_('Ultimate load factor', nUlt(d), 'g', 'FAR23 (V-n, × FS)'), IN_('Seat-back recline', RB.recline, 'deg', 'GEOMETRY (airframe/build.py RearSeat)'),
        IN_('Back footprint', `${RB.backW} × ${RB.backH} in`, 'text', 'DESIGN (seat back 1.5 ft wide)'), IN_('Panel spans a × b', `${s.a.toFixed(1)} × ${s.b.toFixed(1)}`, 'in', 'GEOMETRY'),
        IN_('Plate coefficient β', RB.beta, '', `BOUND: Roark simply supported plate, a/b 1.2 (typed from memory); MS stays ≥ 0 up to β = ${(RB.beta * (1 + s.msF)).toFixed(3)}`),
        IN_('Core shear allowable', psi(M.PVC.tau), 'psi', `BOUND: HT61 datasheet-typical; MS stays ≥ 0 down to ${s.tau.toFixed(0)} psi`), IN_('Ply strengths', '6781 (MTM45-1) typical', 'text', allowB(s.msF))],
      result: [['P (ult.)', s.P, 'lb'], ['M (ult.)', s.Mx, 'inlb/in'], ['N face', s.N, 'lb/in'], ['τ core', s.tau, 'psi']] }), sys));
    const q = s.P / RBG.perim, tau = q / (2 * RB.tape.lap), ils = psi(M.GUD.ILSS), msT = ils / tau - 1;
    out.push(Object.assign(mk('fuselage', 'f175-tape', `Rear seat bulkhead to the shell (${RB.tape.n} × 6781 tapes each face)`, lc, 'bulkhead perimeter', 'tape lap shear', msT, {
      formula: 'q = P / perimeter;  τ = q / (2 faces × lap)', inputs: [IN_('Back load P (ult.)', s.P, 'lb', 'DERIVED (f175-back)'), IN_('Bonded perimeter', RBG.perim, 'in', 'GEOMETRY'), IN_('Tape lap', RB.tape.lap, 'in', 'SIZED'), IN_('Bond allowable', ils, 'psi', allowB(msT, 'interlaminar shear strength'))],
      result: [['q (ult.)', q, 'lb/in'], ['τ', tau, 'psi']] }), sys));
  }
  if (lc.type === 'emergency') {
    const W = 1.9 + 0.6, nF = 18.0, P = W * nF, Pa = psi(M.FLOX.shear) * Math.PI * RB.elt.insertD * RB.coreIn * RB.elt.n, ms = Pa / P - 1;
    out.push(Object.assign(mk('fuselage', 'f175-elt', 'ELT tray inserts on the rear seat bulkhead (items of mass, 18 g forward)', lc, 'aft face, ELT tray', 'flox insert shear-out', ms, {
      formula: 'P = W·n (ultimate);  P_allow = n_ins·τ_flox·π·D·L', inputs: [IN_('ELT and tray', W, 'lb', 'LEZ-25-160 (1.9 lb) + tray (DESIGN 0.6 lb)'), IN_('Forward factor, items of mass', nF, 'g', 'FAR 23.561(b)(3) (typed from memory; verify against eCFR)'),
        IN_('Inserts', `${RB.elt.n} × ${RB.elt.std}, Ø ${RB.elt.insertD} × ${RB.coreIn} in`, 'text', 'DESIGN'), IN_('Flox shear', psi(M.FLOX.shear), 'psi', allowB(ms, 'flox (resin) shear'))],
      result: [['P (ult.)', P, 'lb'], ['P_allow', Pa, 'lb']] }), sys));
  }
  return out;
});

const S1 = (title, inspect) => ({ title, inspect });
defineParts([{ pn: 'LEZ-53-175', name: 'Rear seat bulkhead (FS 130.2)', kind: 'laminate', ata: 53, nha: 'LEZ-53-150', massItem: 'fus', material: 'HT61 sandwich, 6781 faces',
  massEach: +rbMass().toFixed(3), cg: [RB.s, 0, (RBG.zTop + RBG.zBot) / 24],
  geo: [{ t: 'box', c: [RB.s, 0, (RBG.zTop + RBG.zBot) / 24], d: [RB.t / 12, RBG.wIn / 12, (RBG.zTop - RBG.zBot) / 24], draw: false }],
  blurb: 'HT61-foam sandwich bulkhead behind the rear seat, under the turtledeck: the rear seat back leans on it, the ELT tray bolts to its aft face, every line aft passes through it, and its foot is notched clear of the main-gear mount extrusions.',
  steps: [S1('Lay up the forward face; pot the ELT inserts; lay up the aft face; cure; cut to the template', ['Outline within ±1/32 in', 'Notches clear the extrusions by 1/8 in']), S1('Install in the fuselage jig at FS 130.2; flox fillets; tape both faces', ['Square to the centre line ±0.25°', 'Soft foam seal in the notches, no flox'])],
  src: { mass: 'GEOMETRY: the definition solid (LEZ-53-175)' } }]);
void S;
// the mass above was taken from the provisional geometry; refresh it once every parts module has loaded
LOAD.after.push(() => { const q = partByPN('LEZ-53-175'); if (q) q.massEach = +rbMass().toFixed(3); });

/** final integration (LEZ-31-100 rev C fix): the slab check, every line through the full thickness clear of the laminate in its hole */
export const rbSlab = () => flatSlab(rbParams());
registerChecks('rb-slab', (d, lc) => (lc.id !== 'W1-S1' ? [] : [slabRow(mk, lc, 'f175-slab', 'Rear seat bulkhead: every line through the thickness clear of the laminate in its hole or notch', 'LEZ-53-175', rbSlab(), { slab: 'the full-outline layers (faces and core)', clr: 'lines 1/8 in, rods 1/16 in all round; bolts and pins in their fit holes' })]));
