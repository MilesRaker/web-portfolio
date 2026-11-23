// WPA3 — firewall LEZ-53-180. The firewall's aft (engine-side) face is the plane GEO.firewall (FS 153.00) everywhere.
// Above and below the centre-section spar a flat sandwich panel lies forward of that plane (cabin side), its edges bonded
// to the spar's upper and lower faces and taped to the shell; across the spar's depth the spar's own aft face is the
// firewall (coordinator decision M-1). The fire-protection layer covers the whole aft face, panels and spar band alike:
// 1/8 in ceramic-fibre paper under 0.016 in corrosion-resistant steel sheet (FAR 23.1191-style; the list of materials
// accepted without test is typed from memory — notional, verify against eCFR / AC 20-135A, 2025-09-29, which refers to SAE AS6826 for the pass/fail criteria). Under the steel engine-mount
// fittings and the aluminium lower brackets the paper is left out and the fitting bears on a steel patch on the
// structure, sealed round with fire sealant, so the bolted stacks stay hard.
//  • Upper hard points (LEZ-71-222): solid BID in place of the core under each pick-up base, the panel ≤ 0.25 in with the
//    patch (TFW_MAX). The pick-up's fore-aft reaction is carried by two cabin-side gussets per side (foam ribs with UNI
//    caps, bonded to the spar top and the panel) either side of the backing plate.
//  • Layout: the firewall defines the hole and mounting positions for everything that passes through or mounts on it,
//    clear of the bracket legs, the pick-up plates, the gussets and the spar band (+1/4 in). Wave-2 blocks move their
//    items to these positions (block G interface G-F3).
//  • Checks: fw-hp (hard point between the gussets), fw-rib (gusset caps, web and root bond), fw-tape (edge bonds),
//    fw-equip (equipment bolts at the FAR 23.561 items-of-mass factors); fus-engine (bearing, structures.js) applies.
// Notional.
import { slabRow } from './slab_pass.js';
import { GEO, CS_FIT, FIXED, registerChecks, mk, psi, plyRF, allowB, BASE_MAT, effective, DEFAULT_DESIGN, materials, loadCases } from '../structures.js';
import { plyWeight, registerBookExtras } from '../plybook.js';
import { defineParts, partByPN, DENSITY, LOAD } from '../systems.js';
import { UPK, upkState } from './wp23_upk.js';
import { pickupReactions, BRK } from './wp6_engine_install.js';
import { MOUNT } from './wp1_powerplant.js';
import { r4, area2, perim, clipV, innerRing, vertPlane, flatParams, flatVolumes, toPlane, pip, lazyGeo, flatSlab } from './wpA0_flat.js';
import { RHO } from './wpA1_f28.js';

const TGT = 0.15, IN_ = (n, v, u, s = 'DERIVED') => [n, v, u, s], tB = BASE_MAT.BID.t, tU = BASE_MAT.GUD.t;
const bid = (n, a = 0) => Array.from({ length: n }, () => ({ mat: 'BID', angle: a }));
/** the stack (in): panel forward of the plane, fire layer aft of it; the patch under fittings */
export const FW = { s: GEO.firewall, faceBID: 2, coreIn: 0.1875, paper: 0.125, steel: 0.016, tsh: FIXED.fuselage.coreIn + 2 * FIXED.fuselage.faceBID * tB, fireOff: 0.06, tape: { n: 2, lap: 1.0 }, keep: 0.25, TFW_MAX: 0.25,
  fitPad: 0.5, rib: { core: 0.375, webBID: 3, depth: 1.5, capW: 0.75, gap: 0.20, lap: 2.0 }, hpMargin: 0.25 };
FW.tp = FW.coreIn + 2 * FW.faceBID * tB;
export const FW_RHO = { ...RHO, PAPER: 13.4 / 1728, SS: DENSITY.stainless };   // Fiberfrax 970J 1/8 in: 0.105–0.140 lb/ft² (10.1–13.4 lb/ft³), heavy end for mass: Aircraft Spruce 05-02679 page Q&A (accessed 2026-11-19)
const SPAR = { L: CS_FIT.L * 12, U: CS_FIT.U * 12 };
const N = MOUNT.nodes;
/** the upper pick-up base pattern on the firewall: centred on the node, as block G's released LEZ-71-222 (rev B/C) draws
 *  it (the offset this record first proposed is withdrawn: the firewall follows G's fittings) */
export const UPK_FW = { du: 0, dv: 0 };
const upkC = (sg) => ({ u: sg * (Math.abs(N.FTL[1]) * 12 + UPK_FW.du), v: N.FTL[2] * 12 + UPK_FW.dv });
const legA = () => (partByPN('LEZ-71-223')?.geo || []).filter((g) => g.t === 'box' && g.d[0] * 12 < 0.3).map((g) => { const c = toPlane(vertPlane(FW.s), g.c); return [c.u - g.d[1] * 6, c.u + g.d[1] * 6, c.v - g.d[2] * 6, c.v + g.d[2] * 6]; });
const grow = (R, m) => [R[0] - m, R[1] + m, R[2] - m, R[3] + m];
/** the firewall layout: every through-hole and mounting position (u = BL, v = WL), its owner and what it is */
// upper-panel items sit between the inboard gussets (|BL| ≤ 2.48 less the hole) above the spar band; moved there when the
// pick-ups moved to BL ±4.74 (mount rev C)
export const LAYOUT = [
  { id: 'fuel', pn: 'LEZ-28-155', blk: 'F', kind: 'fit', what: 'Fuel bulkhead union AN832-6 (steel), fire-sleeved both sides', pts: [[2.40, 30.60]], r: 0.29 },
  { id: 'gasc', pn: 'LEZ-73-100', blk: 'F', kind: 'equip', what: 'Gascolator bracket, 2 × AN3', pts: [[1.60, 28.20], [3.20, 28.20]], r: 0.0955, mass: 1.2 },
  { id: 'mani', pn: 'LEZ-77-120', blk: 'H', kind: 'equip', what: 'Sensor manifold (fuel P, oil P, MAP), 2 × AN3', pts: [[1.40, 33.40], [3.40, 33.40]], r: 0.0955, mass: 0.6 },
  { id: 'primer', pn: 'LEZ-73-130', blk: 'F', kind: 'fit', what: 'Primer bulkhead unions AN832-2D (steel, 5/16-24), supply and delivery, fire-sealed (integration 2026-11-19)', pts: [[2.90, 31.60], [3.60, 32.00]], r: 0.21 /* Ø 0.42: the 1/8 in tube with 1/8 in all round (slab rule) under the AN832-2D nut */ },
  { id: 'cables', pn: 'LEZ-76-110', blk: 'H', kind: 'pass', what: 'Engine-control cables (throttle, mixture, carb heat), fire-sealed grommet', pts: [[-2.40, 29.60]], r: 0.875 },
  { id: 'power', pn: 'LEZ-80-110', blk: 'H/I', kind: 'pass', what: 'Power boot: starter, ground, B-lead, field, P-leads, sensor harness (fire-sealed)', pts: [[-2.20, 33.10]], r: 1.50 },   // rev C: Ø 3.00 (was 2.50), over the starter and ground cables' swept footprints through the stack
  { id: 'start', pn: 'LEZ-80-100', blk: 'I', kind: 'equip', what: 'Starter contactor, 2 × AN3', pts: [[-2.00, 41.60], [-0.60, 41.60]], r: 0.0955, mass: 0.7 },
  { id: 'gnd', pn: 'LEZ-24-140', blk: 'I', kind: 'equip', what: 'Firewall ground block (engine strap), 2 × AN3', pts: [[-0.50, 43.60], [0.50, 43.60]], r: 0.0955, mass: 0.3 },
  { id: 'ovr', pn: 'LEZ-24-150', blk: 'I', kind: 'equip', what: 'Overvoltage relay / regulator, 2 × AN3', pts: [[0.60, 41.60], [2.00, 41.60]], r: 0.0955, mass: 0.4 },
];
export const FWG = lazyGeo(() => {
  const P = vertPlane(FW.s), ring = innerRing(FW.s, FW.tsh), upper = clipV(ring, SPAR.U, 'above'), lower = clipV(ring, SPAR.L, 'below');
  const fire = innerRing(FW.s, FW.fireOff, 360);
  const ribs = [], hp = [], win = [], holes = [];
  for (const sg of [1, -1]) {
    const c = upkC(sg), b = UPK.B / 2, k = UPK.Bk / 2;
    for (const [du, dv] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) holes.push({ id: 'upk', kind: 'bolt', u: r4(c.u + du * UPK.p / 2), v: r4(c.v + dv * UPK.p / 2), r: r4((UPK.db + 0.003) / 2), what: `LEZ-71-222 base bolt AN${UPK.nb}` });
    hp.push([c.u - b - FW.hpMargin, c.u + b + FW.hpMargin, SPAR.U - 1, c.v + b + FW.hpMargin + 2]);
    win.push(grow([c.u - b, c.u + b, c.v - b, c.v + b], FW.keep));
    for (const side of [-1, 1]) { const uc = c.u + side * (k + FW.rib.gap + (FW.rib.core + 2 * FW.rib.webBID * tB) / 2), top = Math.max(...upper.filter((q) => Math.abs(q[0] - uc) < 0.3).map((q) => q[1])) - 0.06; ribs.push({ sg, side, u: r4(uc), v0: SPAR.U, v1: r4(top), t: FW.rib.core + 2 * FW.rib.webBID * tB }); }
    const yP = sg * Math.abs(N.FBL[1]) * 12, zP = N.FBL[2] * 12;
    holes.push({ id: 'brk', kind: 'bolt', u: r4(yP), v: r4(zP), r: r4((BRK.dP + 0.006) / 2), what: `LEZ-71-223 lower pick-up AN${6}` });
    for (const zi of BRK.zSpar) holes.push({ id: 'brk', kind: 'bolt', u: r4(yP), v: r4(CS_FIT.L * 12 + zi), r: r4((BRK.dS + 0.006) / 2), what: `LEZ-71-223 spar bolt AN${BRK.an} (fire layer only)` });
    hp.push([yP - 1.0, yP + 1.0, zP - 1.0, zP + 1.0]);
  }
  for (const R of legA()) win.push(grow(R, FW.keep));
  const items = LAYOUT.map((L) => ({ ...L, holes: L.pts.map(([u, v]) => ({ id: L.id, kind: L.kind, u, v, r: L.r, what: `${L.pn} ${L.what}` })) }));
  for (const it of items) holes.push(...it.holes);
  const ins = items.filter((i) => i.kind === 'equip').flatMap((i) => i.holes.map((h) => [h.u - 0.3, h.u + 0.3, h.v - 0.3, h.v + 0.3]));
  // fire-sealed bulkhead fittings (the AN832 fuel union, block F FM-9): a CRES patch window and a flox insert under the nut,
  // so the fitting clamps the same hard 0.2435 in stack as the engine-mount fittings (not paper and foam)
  const fitWin = [], fitIns = [];
  for (const it of items.filter((i) => i.kind === 'fit')) for (const h of it.holes) { fitWin.push([h.u - h.r - FW.fitPad, h.u + h.r + FW.fitPad, h.v - h.r - FW.fitPad, h.v + h.r + FW.fitPad]); fitIns.push([h.u - h.r - FW.fitPad, h.u + h.r + FW.fitPad, h.v - h.r - FW.fitPad, h.v + h.r + FW.fitPad]); }
  ins.push(...fitIns);
  const wIn = Math.max(...ring.map((q) => q[0]));
  return { ring, upper, lower, panels: [upper, lower], fire, ribs, hp, win, fitWin, ins, holes, items, wIn, perim: perim(upper) + perim(lower), A: area2(upper) + area2(lower) };
});
/** the stack (w = FS − 153): panel faces and core forward of the plane, hard-point BID and equipment flox in the core,
 *  paper and steel sheet aft of it (out of the fitting windows), the steel patch in the windows */
export function fwLayers() {
  const t = FW.tp, f = FW.faceBID * tB;
  return [{ name: 'faceF', mat: 'BID', w0: -t, w1: -t + f, ol: 'panel', feat: 'face' }, { name: 'core', mat: 'PVC', w0: -t + f, w1: -f, ol: 'panel', cut: 'solid', feat: 'face' },
    { name: 'hpk', mat: 'BID', w0: -t + f, w1: -f, ol: 'panel', reg: 'hp', feat: 'hp' }, { name: 'insert', mat: 'FLOX', w0: -t + f, w1: -f, ol: 'panel', reg: 'ins', feat: 'equip' },
    { name: 'faceA', mat: 'BID', w0: -f, w1: 0, ol: 'panel', feat: 'face' },
    { name: 'paper', mat: 'PAPER', w0: 0, w1: FW.paper, ol: 'fire', cut: 'win', feat: 'fire' }, { name: 'steel', mat: 'SS', w0: FW.paper, w1: FW.paper + FW.steel, ol: 'fire', cut: 'win', feat: 'fire' },
    { name: 'patch', mat: 'SS', w0: 0, w1: FW.steel, ol: 'fire', reg: 'win', feat: 'fire' }];
}
export const fwParams = () => flatParams({ P: vertPlane(FW.s), polys: { panel: FWG.panels, fire: [FWG.fire] }, holes: FWG.holes, layers: fwLayers(), regs: { hp: FWG.hp, ins: FWG.ins, win: [...FWG.win, ...FWG.fitWin] }, cuts: { solid: [...FWG.hp, ...FWG.ins], win: [...FWG.win, ...FWG.fitWin] } });
/** gussets (cabin side, built in place): PVC rib with BID webs, UNI cap on the forward edge, BID tapes onto the spar top */
export const fwRibs = () => FWG.ribs.map((r) => { const h = r.v1 - r.v0, R = FW.rib, web = 2 * R.webBID * tB * R.depth * h, core = R.core * R.depth * h, cap = FW.ribCap * tU * R.capW * h, tape = 2 * R.lap * R.depth * 2 * R.webBID * tB;
  return { ...r, h, lb: (web + tape) * RHO.BID + core * RHO.PVC + cap * RHO.UNI, bidA: (web + tape) / tB, uniA: cap / tU }; });
export const fwTape = () => { const a = FWG.perim * 2 * FW.tape.lap * 2; return { area: a, lb: plyWeight('BID', a / 144, FW.tape.n) }; };
export const fwMassOf = (v) => fwLayers().reduce((a, l) => a + (v[l.name] ?? 0) * FW_RHO[l.mat], 0) + fwTape().lb + fwRibs().reduce((a, r) => a + r.lb, 0);
export const fwMass = () => fwMassOf(flatVolumes(fwParams()));

// ------------------------------------------------------------------------------------------- loads and sizing
/** worst pick-up fore-aft reaction (ult., lb) over every case and combination */
const upkCases = (d) => { const out = []; for (const lc of loadCases(d)) { const r = pickupReactions(d, lc); if (!r) continue; for (const o of r.out) for (const n of ['FTL', 'FTR']) if (o.R[n]) out.push({ lc, s: upkState(o.R[n], r.FS, UPK), n, tag: o.c.tag }); } return out; };
const hpState = (s, M) => { const span = UPK.Bk + 2 * FW.rib.gap, b = UPK.Bk, t = FW.tp, P = s.Rx, Mb = P * span / 8, sig = 6 * Mb / (b * t * t), N = sig * t, rf = plyRF(bid(Math.round(t / tB)), [N, 0, 0], M); return { span, b, t, P, Mb, sig, rf, ms: rf.rf - 1 }; };
const ribState = (s, M, nCap) => {
  const R = FW.rib, c = upkC(1), arm = c.v - SPAR.U, P = s.Rx / 2, Mr = P * arm, F = Mr / (R.depth - nCap * tU / 2), A = nCap * tU * R.capW, sc = F / A, msC = psi(M.GUD.Xc) / sc - 1;
  const Nxy = P / R.depth, wrf = plyRF(bid(2 * R.webBID, 45), [0, 0, Nxy], M), tau = F / (R.capW * R.lap), msB = psi(M.GUD.ILSS) / tau - 1;
  return { arm, P, Mr, F, A, sc, msC, Nxy, wrf, msW: wrf.rf - 1, tau, msB, ms: Math.min(msC, wrf.rf - 1, msB) };
};
FW.ribCap = (() => { const d = effective(DEFAULT_DESIGN), M = materials(d), cs = upkCases(d); for (let n = 2; n < 30; n++) if (cs.every((c) => ribState(c.s, M, n).ms >= TGT)) return n; return 30; })();

registerChecks('wpA3-firewall', (d, lc, Z, M) => {
  const sys = { sys: 'LEZ-53-180' }, out = [];
  if (['sym', 'roll', 'canard', 'emergency'].includes(lc.type)) {
    let w = null; const r = pickupReactions(d, lc);
    if (r) for (const o of r.out) for (const n of ['FTL', 'FTR']) if (o.R[n]) { const s = upkState(o.R[n], r.FS, UPK); if (!w || s.Rx > w.s.Rx) w = { s, n, tag: o.c.tag }; }
    if (w) {
      const base = [IN_('Load combination', w.tag, 'text', 'FAR23'), IN_('Pick-up fore-aft reaction R_x (ult.)', w.s.Rx, 'lb', 'DERIVED: mount truss solve (wp6 pickupReactions)')];
      const h = hpState(w.s, M);
      out.push(Object.assign(mk('fuselage', 'fw-hp', `Firewall upper hard point between the gussets (${h.t.toFixed(3)} in solid 6781)`, lc, `${w.n}, under the backing plate`, `hard point ${h.rf.mode}`, h.ms, {
        formula: 'the backing plate puts R_x on the hard point, which spans between the two gussets: M = R_x·s/8 (ends held by the gussets);  σ = 6M/(b·t²), CLT first-ply at N = σ·t',
        inputs: [...base, IN_('Span between gussets s', h.span, 'in', 'GEOMETRY'), IN_('Width b (backing plate)', h.b, 'in', 'LEZ-71-222 (SIZED)'), IN_('Hard point t (≤ grip − patch)', h.t, 'in', 'DESIGN'), IN_('Ply strengths', '6781 0/90 (MTM45-1) typical', 'text', allowB(h.ms))],
        result: [['M (ult.)', h.Mb, 'inlb'], ['σ', h.sig, 'psi']] }), sys));
      const g = ribState(w.s, M, FW.ribCap), m = [['cap compression', g.msC], ['web shear', g.msW], ['cap root bond', g.msB]].reduce((a, x) => (x[1] < a[1] ? x : a));
      out.push(Object.assign(mk('fuselage', 'fw-rib', `Firewall pick-up gussets (${FW.rib.depth} in deep, ${FW.ribCap} × 6781 0/90 cap, ${FW.rib.webBID} × 6781 webs)`, lc, `${w.n}, gussets to the spar top`, m[0], g.ms, {
        formula: 'each gusset takes R_x/2 as a cantilever from the spar top: M = (R_x/2)·arm;  cap F = M/(depth);  σ = F/A_cap;  web N_xy = (R_x/2)/depth (±45 × 6781, CLT);  cap root lap τ = F/(w·L)',
        inputs: [...base, IN_('Arm, spar top to the plate centre', g.arm, 'in', 'GEOMETRY'), IN_('Gusset depth (fore-aft)', FW.rib.depth, 'in', 'DESIGN'), IN_('Cap', `${FW.ribCap} × 6781 0/90 × ${FW.rib.capW} in`, 'text', 'SIZED'), IN_('Cap lap onto the spar top', FW.rib.lap, 'in', 'DESIGN'),
          IN_('6781 0/90 compression allowable', psi(M.GUD.Xc), 'psi', allowB(g.msC, 'compressive strength')), IN_('Bond allowable', psi(M.GUD.ILSS), 'psi', allowB(g.msB, 'interlaminar shear strength'))],
        result: [['Cap force (ult.)', g.F, 'lb'], ['σ cap', g.sc, 'psi'], ['N_xy web', g.Nxy, 'lb/in'], ['τ root', g.tau, 'psi']] }), sys));
      const Pin = 2 * Math.hypot(w.s.Ry, w.s.Rz), q = Pin / FWG.perim, tau = q / (2 * FW.tape.lap), ils = psi(M.GUD.ILSS), msT = ils / tau - 1;
      out.push(Object.assign(mk('fuselage', 'fw-tape', `Firewall panels to the shell and the spar (${FW.tape.n} × 6781 tapes each face)`, lc, 'panel edges', 'tape lap shear', msT, {
        formula: 'both pick-ups\' in-plane reactions shared round the bonded edges: q = 2·√(R_y² + R_z²) / perimeter;  τ = q/(2·lap)',
        inputs: [...base, IN_('In-plane reaction √(R_y² + R_z²) (ult.)', Math.hypot(w.s.Ry, w.s.Rz), 'lb', 'DERIVED'), IN_('Bonded perimeter (both panels)', FWG.perim, 'in', 'GEOMETRY'), IN_('Tape lap', FW.tape.lap, 'in', 'SIZED'), IN_('Bond allowable', ils, 'psi', allowB(msT, 'interlaminar shear strength'))],
        result: [['q (ult.)', q, 'lb/in'], ['τ', tau, 'psi']] }), sys));
    }
  }
  if (lc.type === 'emergency') {
    const worst = FWG.items.filter((i) => i.kind === 'equip').map((i) => { const P = i.mass * 18 / i.pts.length, Pa = psi(M.FLOX.shear) * Math.PI * 0.6 * FW.coreIn; return { i, P, Pa, ms: Pa / P - 1 }; }).reduce((a, b) => (b.ms < a.ms ? b : a));
    out.push(Object.assign(mk('fuselage', 'fw-equip', 'Firewall equipment bolts in flox inserts (items of mass, 18 g)', lc, worst.i.pn, 'flox insert shear-out', worst.ms, {
      formula: 'P = m·n / bolts per item;  P_allow = τ_flox·π·D_insert·t_core (bolts through 0.6 in flox inserts in the core, AN970 washers each face)',
      inputs: [IN_('Item mass', worst.i.mass, 'lb', 'DESIGN (allowance incl. bracket, ≥ the system record)'), IN_('Load factor, items of mass', 18, 'g', 'FAR 23.561(b)(3) (typed from memory; verify against eCFR)'), IN_('Bolts', worst.i.pts.length, '', 'DESIGN'),
        IN_('Insert', `Ø 0.6 × ${FW.coreIn} in flox`, 'text', 'DESIGN'), IN_('Flox shear', psi(M.FLOX.shear), 'psi', allowB(worst.ms, 'flox (resin) shear'))], result: [['P per bolt (ult.)', worst.P, 'lb'], ['P_allow', worst.Pa, 'lb']] }), sys));
  }
  return out;
});

// ------------------------------------------------------------------------------------------- the shell book: the hard point moves to the firewall (M-5)
registerBookExtras('fuselage', (books) => { const b = books.fuselage; if (!b) return; b.plies = b.plies.filter((p) => p.id !== 'F-D3').map((p, i) => ({ ...p, seq: i + 1 })); });

const S1 = (title, inspect) => ({ title, inspect });
defineParts([{ pn: 'LEZ-53-180', name: 'Firewall (panels above and below the CS spar, fire-protection layer, pick-up gussets)', kind: 'laminate', ata: 53, nha: 'LEZ-53-150', massItem: 'fus', material: 'HT61 sandwich, 6781 faces; ceramic paper and CRES sheet',
  massEach: +fwMass().toFixed(3), cg: [FW.s, 0, CS_FIT.z],
  geo: [{ t: 'box', c: [FW.s - FW.tp / 24, 0, (SPAR.L - 4) / 12], d: [FW.tp / 12, 0.8, 0.3], draw: false }],
  blurb: 'Composite firewall: sandwich panels above and below the centre-section spar with their aft faces flush with the spar\'s aft face (FS 153.0), the whole covered by CRES sheet over ceramic-fibre paper. Hard points and cabin-side gussets under the upper engine pick-ups; every pass-through and firewall item on the record\'s layout.',
  steps: [S1('Lay up the panels flat; pot the hard points and inserts; cure; cut to the templates', ['Outline within ±1/32 in', 'Hard points at the pick-up patterns']), S1('Bond the panels to the spar faces and tape to the shell; build the gussets in place', ['Panels flush with the spar aft face ±1/32 in', 'Gusset caps continuous onto the spar top']),
    S1('Fit the paper and the CRES sheet; patches under the fittings; fire sealant at every pass-through', ['Sheet laps ≥ 1/2 in at joints, fastened', 'Every hole fire-sealed or grommeted with a fireproof fitting'])],
  src: { mass: 'GEOMETRY: the definition solid (LEZ-53-180)' } }]);
void pip; void FW_RHO;
// the mass above was taken from the provisional geometry; refresh it once every parts module has loaded
LOAD.after.push(() => { const q = partByPN('LEZ-53-180'); if (q) q.massEach = +fwMass().toFixed(3); });

/** final integration (LEZ-31-100 rev C fix): the slab check, every line through the full thickness clear of the laminate in its hole */
export const fwSlab = () => flatSlab(fwParams());
registerChecks('fw-slab', (d, lc) => (lc.id !== 'W1-S1' ? [] : [slabRow(mk, lc, 'fw-slab', 'Firewall: every line through the thickness clear of the laminate in its hole or notch', 'LEZ-53-180', fwSlab(), { slab: 'the full-outline layers (faces and core)', clr: 'lines 1/8 in, rods 1/16 in all round; bolts and pins in their fit holes' })]));
