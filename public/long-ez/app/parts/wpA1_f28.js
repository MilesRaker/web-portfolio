// WPA1 — bulkhead F28 LEZ-53-165: the canard's aft bulkhead at FS 28, a flat PVC sandwich (3 BID each face) fitted inside
// the fuselage shell and taped to it, as F22 (wp25). The canard (LEZ-55-120 rev B) sits on its top edge; its 6-ply BID
// F28 tabs hang down F28's forward face at BL ±attachY and an AN4 torque pin passes through each tab and an F28 hard
// point. With the F22 bolts the pins react the canard's root torque: F = FS·1.15·T/arm per side, up or down.
//  • Outline: the shell's inner contour at FS 28, cut level 0.03 in under the canard's lower surface over the
//    thickness envelope, notched for the nose-gear strut channel (as F22); a Ø 1.375 in hole (or edge slot) for the
//    pitch rod (block C's request: the rod and its sweep). Holes: the two pins (WL 0.75 in below the canard, mid-leg of
//    the tab) and a grommet hole for every routed line crossing FS 28 outside the notch (edge slots where too close).
//  • Checks: f28-pin (pin bearing in the F28 hard point), f28-shear (F28 as a deep beam between the sides under the pin
//    couple), f28-tape (the tapes to the shell). Notional.
import { slabRow } from './slab_pass.js';
import { GEO, FIXED, registerChecks, mk, psi, plyRF, allowB, BASE_MAT, surfaceLoads, effective, DEFAULT_DESIGN, materials, loadCases } from '../structures.js';
import { FRAMES, afAt, plyWeight } from '../plybook.js';
import { defineParts, LOAD, partByPN } from '../systems.js';
import { CNA } from './wp24_canard.js';
import { WELL } from './wp11_nose_gear.js';
import { r4, area2, perim, clipV, notch, innerRing, vertPlane, crossingsSlab, slabOf, mergeHoles, pip, flatParams, flatVolumes, edgeNotches, lazyGeo, flatSlab } from './wpA0_flat.js';

const TGT = 0.15, FF = 1.15, IN_ = (n, v, u, s = 'DERIVED') => [n, v, u, s], tB = BASE_MAT.BID.t;
const AN_SS = { 4: 3682 };   // AN4 single shear, lb (AN standard, as wp24)
const bid = (n) => Array.from({ length: n }, () => ({ mat: 'BID', angle: 45 }));
/** F28 build numbers: 3 BID faces on 3/8 in H45 (as F22), 2 BID × 1 in tapes; flox inserts round the pins */
export const F28 = { s: GEO.F28, coreIn: 0.375, faceBID: 3, tape: { n: 2, lap: 1.0 }, env: 0.375, gap: 0.03, pinDown: CNA.edge, insert: 0.75, hp: { w: CNA.w + 1.0, h: 2.0 }, tsh: FIXED.fuselage.coreIn + 2 * FIXED.fuselage.faceBID * BASE_MAT.BID.t };
F28.t = F28.coreIn + 2 * F28.faceBID * tB;
export const RHO = { BID: plyWeight('BID', 1, 1) / 144 / tB, UNI: plyWeight('GUD', 1, 1) / 144 / BASE_MAT.GUD.t, GUD: plyWeight('GUD', 1, 1) / 144 / BASE_MAT.GUD.t, PVC: BASE_MAT.PVC.rho * 62.43 / 1728, FLOX: 0.043 };   // flox ≈ 1.2 g/cm³ (typed from memory)
const S = F28.s * 12, G = GEO.canard;
/** the canard's lower surface WL at FS fs (in), BL y (ft) */
export const zCanardLo = (fs, y = G.attachY) => { const x = (fs / 12 - G.le) / G.c, a = afAt(FRAMES.canard, y, x); return (G.z + a.yl * G.c) * 12; };
/** the pitch rod (LEZ-27-120, block C) crosses F28 near BL 9: block C asks for a Ø 1.375 in clearance hole for the rod and its
 *  sweep (the rev A slot at BL 2.5–3.9 for the old inboard bellcrank is gone: C moved the bellcrank to BL ±9, forward of F28) */
export const PITCH_HOLE = { pn: 'LEZ-27-120', d: 1.375 };
/** block E (merged): the worm drive shaft LEZ-32-211 passes in a grommet (hole = shaft + 1/8 in a side); the door-cable
 *  fairleads get #6 screw holes (Ø 0.144 close fit, typed from memory) */
export const WORM = { pn: 'LEZ-32-211', grommet: 0.125 }, FAIRLEAD = { off: 0.6, r: 0.072, seat: 0.25, pn: 'LEZ-32-232' };   // rev D: the fairlead seats in a Ø 0.50 hole (E's O2), its screw 0.6 in outboard
export const F28G = lazyGeo(() => {
  const zTop = Math.min(zCanardLo(S - F28.env), zCanardLo(S), zCanardLo(S + F28.env)) - F28.gap;
  let pts = clipV(innerRing(F28.s, F28.tsh), zTop, 'below');
  const halfW = WELL.chan.halfW * 12 + 0.125, chanTop = WELL.chan.top * 12 + 0.25, zBot = Math.min(...pts.map((q) => q[1]));
  pts = notch(pts, [-halfW, halfW, zBot - 1, chanTop]);
  const pins = [1, -1].map((sg) => ({ id: 'pin', kind: 'pin', u: sg * G.attachY * 12, v: r4(zCanardLo(S) - F28.pinDown), r: 0.128, what: `canard torque pin AN${CNA.pin}` }));
  const raw = crossingsSlab(vertPlane(F28.s), ...slabOf(f28Layers()), [pts]).map((c) => (c.pn === PITCH_HOLE.pn ? { ...c, r: Math.max(c.r, PITCH_HOLE.d / 2) }
    : c.pn === WORM.pn ? { ...c, kind: 'pass', r: Math.ceil((c.r - 1 / 16 + WORM.grommet) * 16) / 16, what: `${c.pn} (grommet)` }
    : c.pn === FAIRLEAD.pn ? { ...c, kind: 'pass', r: Math.max(c.r, FAIRLEAD.seat), what: `${c.pn} door-cable fairlead seat Ø ${2 * FAIRLEAD.seat}` } : c));   // block E: the worm shaft runs in a grommet; rev D: the door-cable fairleads seat in F28
  const en = edgeNotches(pts, mergeHoles(raw).map((h) => ({ ...h, id: 'pass' })));
  pts = en.pts; const pass = en.holes, slots = en.slots;
  // block E: nylon door-cable fairleads bonded on F28's aft face (LEZ-32-232), each held by a #6 screw 0.5 in outboard of its cable hole
  const fl = (partByPN('LEZ-32-232')?.geo || []).filter((g) => g.t === 'sphere' && Math.abs(g.c[0] * 12 - (S + F28.t / 2)) < 0.5).map((g) => ({ id: 'fl', kind: 'screw', u: r4(g.c[1] * 12 + Math.sign(g.c[1]) * FAIRLEAD.off), v: r4(g.c[2] * 12), r: FAIRLEAD.r, what: 'LEZ-32-232 door-cable fairlead #6 screw' }));
  const holes = [...pins, ...pass, ...fl];
  const wIn = Math.max(...pts.map((q) => q[0]));
  const lowAt = (u) => Math.min(...innerRing(F28.s, F28.tsh).filter((q) => Math.abs(q[0] - u) < 0.2).map((q) => q[1]));
  return { pts, zTop, zBot, halfW, chanTop, slots, pins, pass, fl, holes, raw, wIn, perim: perim(pts), A: area2(pts), depthAt: (u) => zTop - lowAt(u) };
});
/** hard-point doubler on the aft face round each pin, and the flox inserts (core replaced) */
export const f28Regs = () => ({ hp: F28G.pins.map((p) => [p.u - F28.hp.w / 2, p.u + F28.hp.w / 2, F28G.zTop - F28.hp.h, F28G.zTop + 1]), ins: F28G.pins.map((p) => [p.u - F28.insert / 2, p.u + F28.insert / 2, p.v - F28.insert / 2, p.v + F28.insert / 2]) });
// ------------------------------------------------------------------------------------------- pin load and sizing
const pinLoad = (d, lc) => { const L = surfaceLoads('canard', d, lc); if (!L) return null; const r = L.at(0); return { T: Math.abs(r.T), F: d.FS * FF * Math.abs(r.T) / CNA.arm }; };
const pinState = (d, M, lc, n) => { const p = pinLoad(d, lc); if (!p) return null; const t = 2 * F28.faceBID * tB + n * tB, D = CNA.pin / 16, s = p.F / (D * t); return { ...p, t, D, s, ms: psi(M.BID.Fbru) / s - 1 }; };
export const F28HP = (() => { const d = effective(DEFAULT_DESIGN), M = materials(d), cs = loadCases(d); for (let n = 2; n < 20; n++) if (cs.every((lc) => { const s = pinState(d, M, lc, n); return !s || s.ms >= TGT; })) return { n }; return { n: 20 }; })();
F28.hpBID = F28HP.n;
/** the stack through the thickness (w = FS − 28, in): core (less the inserts), inserts, faces, the aft hard point */
export function f28Layers() {
  const c = F28.coreIn / 2, tf = F28.faceBID * tB, th = F28.hpBID * tB;
  return [{ name: 'core', mat: 'PVC', w0: -c, w1: c, ol: 'out', cut: 'ins', feat: 'face' }, { name: 'insert', mat: 'FLOX', w0: -c, w1: c, ol: 'out', reg: 'ins', feat: 'pin' },
    { name: 'faceF', mat: 'BID', w0: -c - tf, w1: -c, ol: 'out', feat: 'face' }, { name: 'faceA', mat: 'BID', w0: c, w1: c + tf, ol: 'out', feat: 'face' },
    { name: 'hp', mat: 'BID', w0: c + tf, w1: c + tf + th, ol: 'out', reg: 'hp', feat: 'hp' }];
}
export const f28Params = () => { const R = f28Regs(); return flatParams({ P: vertPlane(F28.s), polys: { out: [F28G.pts] }, holes: F28G.holes, layers: f28Layers(), regs: { hp: R.hp, ins: R.ins }, cuts: { ins: R.ins } }); };
export const f28Tape = () => { const a = F28G.perim * 2 * F28.tape.lap * 2; return { area: a, lb: plyWeight('BID', a / 144, F28.tape.n) }; };   // both faces, 1 in on the shell and 1 in on F28
export const f28MassOf = (v) => f28Layers().reduce((a, l) => a + (v[l.name] ?? 0) * RHO[l.mat], 0) + f28Tape().lb;
export const f28Mass = () => f28MassOf(flatVolumes(f28Params()));

// ------------------------------------------------------------------------------------------- checks
const base = (p) => [IN_('Canard root torque per side T (limit)', p.T, 'inlb', 'TAS'), IN_('Arm F22 → F28', CNA.arm, 'in', 'GEOMETRY'), IN_('Fitting factor', FF, '', 'FAR 23.625')];
registerChecks('wpA1-f28', (d, lc, Z, M) => {
  const s = pinState(d, M, lc, F28.hpBID); if (!s) return [];
  const out = [], sys = { sys: 'LEZ-53-165' };
  out.push(Object.assign(mk('fuselage', 'f28-pin', `F28 torque-pin hard point (AN${CNA.pin}): bearing in the F28 laminate`, lc, `BL ±${(G.attachY * 12).toFixed(1)}, WL ${F28G.pins[0].v.toFixed(2)}`, 'laminate bearing', s.ms, {
    formula: 'F = FS·1.15·T/arm per side (the couple with the F22 bolts);  σ_br = F / (D·t), t = both faces + the aft hard point (the flox insert is not counted)',
    inputs: [...base(s), IN_('Pin', `AN${CNA.pin} (Ø ${s.D})`, 'text', 'LEZ-55-120 (SIZED)'), IN_('F28 laminate at the pin', `${F28.faceBID} + ${F28.faceBID} × 6781 faces + ${F28.hpBID} × 6781 hard point`, 'text', 'SIZED'),
      IN_('Bearing allowable', psi(M.BID.Fbru), 'psi', allowB(s.ms, 'compressive strength (bearing not published)'))], result: [['F (ult. × 1.15)', s.F, 'lb'], ['σ bearing', s.s, 'psi']] }), sys));
  // deep beam between the sides: each pin puts F on F28 at BL ±attachY, reacted by the side tapes
  const a = F28G.wIn - G.attachY * 12, h = F28G.depthAt(G.attachY * 12), V = s.F, sh = plyRF(bid(2 * F28.faceBID), [0, 0, V / h], M), sB = V * a / (h * h / 6) / (2 * F28.faceBID * tB), msB = psi(M.BID.Xc) / sB - 1, ms = Math.min(sh.rf - 1, msB);
  out.push(Object.assign(mk('fuselage', 'f28-shear', `F28 panel shear and bending under the pin couple (${F28.faceBID} × 6781 each face)`, lc, 'between the pins and the sides', sh.rf - 1 < msB ? `face ${sh.mode}` : 'face bending', ms, {
    formula: 'deep beam from each pin to its side: V = F, M = V·a;  N_xy = V/h (CLT first-ply);  σ = M/(h²/6)/t_faces', inputs: [...base(s), IN_('Depth h at the pin', h, 'in', 'GEOMETRY'), IN_('Arm a, pin to side', a, 'in', 'GEOMETRY'),
      IN_('Ply strengths', '6781 (MTM45-1) typical', 'text', allowB(ms))], result: [['N_xy (ult.)', V / h, 'lb/in'], ['σ face bending', sB, 'psi']] }), sys));
  const q = 2 * s.F / F28G.perim, tau = q / (2 * F28.tape.lap), ils = psi(M.GUD.ILSS), msT = ils / tau - 1;
  out.push(Object.assign(mk('fuselage', 'f28-tape', `F28 to the fuselage shell (${F28.tape.n} × 6781 tapes each face)`, lc, 'bulkhead perimeter', 'tape lap shear', msT, {
    formula: 'q = 2F / perimeter;  τ = q / (2 faces × lap)', inputs: [...base(s), IN_('Bonded perimeter', F28G.perim, 'in', 'GEOMETRY'), IN_('Tape lap', F28.tape.lap, 'in', 'SIZED'), IN_('Bond allowable', ils, 'psi', allowB(msT, 'interlaminar shear strength'))],
    result: [['q (ult.)', q, 'lb/in'], ['τ', tau, 'psi']] }), sys));
  return out;
});

// ------------------------------------------------------------------------------------------- system part
const S1 = (title, inspect) => ({ title, inspect });
defineParts([{ pn: 'LEZ-53-165', name: 'Bulkhead F28 (canard aft bulkhead, torque-pin hard points)', kind: 'laminate', ata: 53, nha: 'LEZ-53-150', massItem: 'fus', material: 'HT61 sandwich, 3 × 6781 faces',
  massEach: +f28Mass().toFixed(3), cg: [F28.s, 0, (F28G.zTop + F28G.zBot) / 24],
  geo: [{ t: 'box', c: [F28.s, 0, (F28G.zTop + F28G.zBot) / 24], d: [F28.t / 12, F28G.wIn / 12, (F28G.zTop - F28G.zBot) / 24], draw: false }],   // a core block for the systems model (inside the OML); the definition solid is the geometry
  blurb: 'HT61-foam sandwich bulkhead at fuselage station 28: the canard sits on its top edge, and the canard\'s F28 tabs take AN4 torque pins through its hard points. Notched for the strut channel and slotted for the pitch bellcrank.',
  steps: [S1('Lay up the forward face; pot the pin inserts; lay up the aft face and hard points; cure; cut to the template', ['Outline within ±1/32 in', 'Inserts at the pin positions']), S1('Install in the fuselage jig at FS 28; flox fillets; tape both faces', ['Square to the centre line ±0.25°', 'Top edge to the canard template'])],
  src: { mass: 'GEOMETRY: the definition solid (LEZ-53-165)' } }]);
void TGT; void AN_SS;
// the mass above was taken from the provisional geometry; refresh it once every parts module has loaded
LOAD.after.push(() => { const q = partByPN('LEZ-53-165'); if (q) q.massEach = +f28Mass().toFixed(3); });

/** final integration (LEZ-31-100 rev C fix): the slab check, every line through the full thickness clear of the laminate in its hole */
export const f28Slab = () => flatSlab(f28Params());
registerChecks('f28-slab', (d, lc) => (lc.id !== 'W1-S1' ? [] : [slabRow(mk, lc, 'f28-slab', 'F28: every line through the thickness clear of the laminate in its hole or notch', 'LEZ-53-165', f28Slab(), { slab: 'the full-outline layers (faces and core)', clr: 'lines 1/8 in, rods 1/16 in all round; bolts and pins in their fit holes' })]));
