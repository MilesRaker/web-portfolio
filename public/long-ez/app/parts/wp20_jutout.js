// WP20 — wing-root jut-out LEZ-57-116: the outer wing panel's inboard extension aft of the CS spar, root face (BL 45) in
// to the cowl side, firewall gap aft to the trailing edge. It carries the third bolt: the drag angle (LEZ-57-144) puts the
// torsion couple's vertical force F_z into it at BL 26.4, and the jut-out takes it out to the panel as a cantilever.
//  • A drag spar on the bolt's FS line does that: UNI caps top and bottom (the lower one under the angle, the bolt
//    through it), a PVC block wrapped in BID webs from outboard of the angle to the root face, and the caps run on Lov
//    past the root face onto the panel's skins aft of its spar.
//  • Checks: caps at the root face, the webs (CLT and wrinkling on the PVC), the caps' lap into the panel.
// Sections are taken in constant-FS planes (the inboard end follows the cowl side). Notional.
import { GEO, registerChecks, mk, FIXED, psi, laminate, plyRF, allowB, BASE_MAT, DEFAULT_DESIGN, materials, loadCases, capAllowable, wrinkling, omlAt, fusAt, wingRootSec, MATSYS } from '../structures.js';
import { plyWeight } from '../plybook.js';
import { ATTACH, rootLoads, fittingForces } from './wp13_airframe_joints.js';
import { DANG } from './wp15_cs_spar.js';
import { partByPN } from '../systems.js';
import { cutsVol, cutParams } from './cuts.js';
/** cuts in the jut-out's core (rev B: block C's K1 bay and tunnels), right side; see cuts.js */
export const JCUTS = [];
export const jutInboard = (s) => yIn(s);

const FF = 1.15, TGT = 0.15, IN_ = (n, v, u, s = 'DERIVED') => [n, v, u, s], r4 = (x) => Math.round(x * 1e4) / 1e4;
const tU = BASE_MAT.UNI.t, tB = BASE_MAT.BID.t, tS = FIXED.skinBID * tB, YJ = GEO.join.y * 12;
const bid = (n) => Array.from({ length: n }, () => ({ mat: 'BID', angle: 45 }));
const S0 = (GEO.firewall + GEO.join.gap) * 12;   // front wall (in FS)
const yIn = (s) => { const w = fusAt(s / 12).w / 2 * 12 + GEO.join.cowlGap * 12; let lo = 1.0 * 12, hi = YJ;   // inboard edge: the cowl side, or the trailing edge's kink
  const te = (y) => { const r = wingRootSec(y / 12); return (r.le + r.c) * 12; }; if (te(lo) >= s) return w; for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (te(m) < s) lo = m; else hi = m; } return Math.max(w, hi); };
const om = (s, y) => { const o = omlAt(s / 12, y / 12); if (o) return o; const r = wingRootSec(y / 12); return omlAt(Math.max(r.le + 1e-9, Math.min(s / 12, r.le + r.c - 1e-9)), y / 12); };   // clamped onto the section at the edges
const up = (s, y) => om(s, y).up * 12, lo = (s, y) => om(s, y).lo * 12;

/** the drag spar and the jut-out's numbers (inches) */
export const JS = (() => {
  const sB = ATTACH.drag[0] * 12, yB = ATTACH.drag[1] * 12, yA = yB + DANG.L / 2 + 0.6;   // spar FS (on the bolt), bolt BL, block's inboard end clear of the angle
  // rev C (2026-11-19): caps 1.0 in wide on the 1.0 in H45 block (were 2.0 in on Styrofoam), so they wrinkle on H45 and the block stays clear of block C's cuts
  const b = 1.0, wBlk = 1.0, Lov = 6.0, d0 = DEFAULT_DESIGN, M = materials(d0), cases = [];
  for (const lc of loadCases(d0)) { const R = rootLoads(d0, lc); if (!R) continue; cases.push({ lc, Fz: Math.abs(fittingForces(R).R3) * d0.FS * FF, R }); }
  const h = (y) => up(sB, y) - lo(sB, y), arm = YJ - yB;
  // rev C (2026-11-19): the H45 block is as wide as the caps (it was 1.0 in), so the skin over the caps wrinkles on H45, not on the
  // Styrofoam (Panel Core 30 minimums: G 400 psi)
  const comp = capAllowable(M, FIXED.skinBID, 'PVC', true).allow, tauWr = wrinkling(psi(M.BID.E1), 'PVC', M) * 0.8;
  const need = (n) => Math.min(...cases.map((c) => comp / (c.Fz * arm / ((h(YJ) - 2 * tS - n * tU) * n * tU * b)) - 1));
  let n = 3; while (n < 60 && need(n) < TGT) n++;
  const hw = (y) => h(y) - 2 * tS - 2 * n * tU;
  const webMS = (nW) => Math.min(...cases.map((c) => { const Nxy = c.Fz / (2 * hw(yA)); return Math.min(plyRF(bid(nW), [0, 0, Nxy], M).rf, tauWr / (Nxy / laminate(bid(nW), M).h)) - 1; }));
  let nW = 2; while (nW < 40 && webMS(nW) < TGT) nW++;
  return { sB, yB, yA, b, wBlk, Lov, n, nW, arm, h, hw, cases, comp, tauWr, yLo0: yB - DANG.L / 2 - 0.5 };
})();
const caseOf = (d, lc) => { const R = rootLoads(d, lc); if (!R) return null; return { Fz: Math.abs(fittingForces(R).R3) * d.FS * FF, R }; };

registerChecks('wp20-jutout', (d, lc, Z, M) => {
  const c = caseOf(d, lc); if (!c) return [];
  const J = JS, out = [], dd = J.h(YJ) - 2 * tS - J.n * tU, Mr = c.Fz * J.arm, F = Mr / dd, sig = F / (J.n * tU * J.b);
  const CA = capAllowable(M, FIXED.skinBID, 'PVC', true), msC = CA.allow / sig - 1, base = [IN_('Drag-bolt vertical force (limit)', c.Fz / (d.FS * FF), 'lb', 'DERIVED'), IN_('Factor', `${d.FS} × ${FF}`, '', 'FAR23 × FAR 23.625')];
  out.push(Object.assign(mk('wing', 'jut-cap', 'Jut-out drag spar: caps at the wing root face', lc, `BL ${YJ.toFixed(1)}, FS ${J.sB.toFixed(1)}`, CA.mode, msC, {
    formula: 'M = F_z·(BL_root − BL_bolt);  F = M / d;  σ = F / (n·t·b), the compressed cap wrinkling with the skin on the HT61 block under it',
    inputs: [...base, IN_('Arm, bolt to the root face', J.arm, 'in', 'GEOMETRY'), IN_('Cap centroid separation d', dd, 'in', 'MODEL'), IN_('Caps', `${J.n} × HTS40 × ${J.b} in`, 'text', 'SIZED'),
      IN_('Compression allowable', CA.allow, 'psi', `BOUND: Hoff wrinkling on the HT61 block; MS stays ≥ 0 down to × ${(1 / (1 + msC)).toFixed(2)}`)],
    result: [['M (ult. × 1.15)', Mr, 'inlb'], ['Cap force', F, 'lb'], ['σ', sig, 'psi']] }), { sys: 'LEZ-57-116' }));
  { const Nxy = c.Fz / (2 * J.hw(J.yA)), rf = plyRF(bid(J.nW), [0, 0, Nxy], M), tau = Nxy / laminate(bid(J.nW), M).h, msW = J.tauWr / tau - 1, ms = Math.min(rf.rf - 1, msW);
    out.push(Object.assign(mk('wing', 'jut-web', `Jut-out drag spar: webs (${J.nW} × 6781 ±45 each face of the HT61 block)`, lc, `BL ${J.yA.toFixed(1)}, block's inboard end`, rf.rf - 1 < msW ? `web ${rf.mode}` : 'face wrinkling under shear (0.8 × Hoff)', ms, {
      formula: 'N_xy = F_z / (2·h_web) (two webs);  CLT first-ply;  τ_cr = 0.8 · 0.5 (E·E_c·G_c)^⅓ on the HT61 block', inputs: [...base, IN_('Web depth (shallowest, at the block\'s inboard end)', J.hw(J.yA), 'in', 'MODEL'), IN_('Web plies each face', J.nW, '', 'SIZED'),
        IN_('HT61 block', `${FIXED.webCore}: E_c·G_c`, '', `BOUND: wrinkling ∝ (E_c·G_c)^⅓; MS stays ≥ 0 down to × ${(1 / (1 + Math.max(0, msW)) ** 3).toFixed(2)}`), IN_('Ply strengths', '6781 (MTM45-1) typical', 'text', allowB(rf.rf - 1))],
      result: [['N_xy (ult.)', Nxy, 'lb/in'], ['τ', tau, 'psi'], ['τ_cr', J.tauWr, 'psi']] }), { sys: 'LEZ-57-116' })); }
  { const tau = F / (J.b * J.Lov), ils = psi(M.UNI.ILSS), ms = ils / tau - 1;
    out.push(Object.assign(mk('wing', 'jut-lap', 'Jut-out drag spar: caps lapping onto the panel\'s skins', lc, `BL ${YJ.toFixed(1)}–${(YJ + J.Lov).toFixed(1)}`, 'interlaminar shear', ms, {
      formula: 'τ = F / (b·L_ov)', inputs: [...base, IN_('Lap L_ov', J.Lov, 'in', 'SIZED'), IN_('Cap width b', J.b, 'in', 'GEOMETRY'), IN_('Interlaminar shear allowable', ils, 'psi', allowB(ms, 'interlaminar shear strength'))],
      result: [['Cap force (ult. × 1.15)', F, 'lb'], ['τ', tau, 'psi']] }), { sys: 'LEZ-57-116' })); }
  return out;
});

// ------------------------------------------------------------------------------------------- sections (the solid)
const NB = 24;
/** FS stations (in): front wall to where the section has narrowed to 1 in, with the spar's band edges */
export function jutStations() {
  const J = JS; let s1 = S0; for (let s = S0; s < 200; s += 0.05) { if (YJ - yIn(s) < 1.0 || !omlAt(s / 12, YJ / 12 - 0.01)) break; s1 = s; }
  const brk = [...new Set([S0, s1, J.sB - J.b / 2, J.sB - J.wBlk / 2, J.sB + J.wBlk / 2, J.sB + J.b / 2].map((x) => +x.toFixed(5)))].sort((a, b) => a - b), out = [brk[0]];   // rev C: the caps and the block share their edges
  for (let i = 1; i < brk.length; i++) { const a = out.at(-1), k = Math.max(1, Math.ceil(brk[i] - a)); for (let j = 1; j <= k; j++) out.push(+(a + (brk[i] - a) * j / k).toFixed(5)); }
  return out;
}
/** regions of the section at FS s: OML (BL across, WL up) and, inside the spar's band, caps and the PVC block */
export function jutSection(s, flags) {
  const J = JS, y0 = yIn(s), ys = Array.from({ length: NB + 1 }, (_, i) => y0 + (YJ - y0) * i / NB), R = {};
  R.oml = [...ys.map((y) => [y, up(s, y)]), ...ys.slice().reverse().map((y) => [y, lo(s, y)])];
  const band = (yA, side) => { const yy = Array.from({ length: 9 }, (_, i) => yA + (YJ - yA) * i / 8), f = side > 0 ? up : lo, a = side * tS, b = side * (tS + J.n * tU);
    return [...yy.map((y) => [y, f(s, y) - a]), ...yy.slice().reverse().map((y) => [y, f(s, y) - b])]; };
  if (flags.cap) { R.cap_u = band(J.yA, 1); R.cap_l = band(J.yLo0, -1); }
  if (flags.blk) { const yy = Array.from({ length: 9 }, (_, i) => J.yA + (YJ - J.yA) * i / 8); R.block = [...yy.map((y) => [y, up(s, y) - tS - J.n * tU]), ...yy.slice().reverse().map((y) => [y, lo(s, y) + tS + J.n * tU])]; }
  return R;
}
const area2 = (p) => Math.abs(p.reduce((a, q, i) => { const r = p[(i + 1) % p.length]; return a + q[0] * r[1] - r[0] * q[1]; }, 0)) / 2;
export function jutSegments() {
  const st = jutStations(), J = JS, segs = [];
  for (let i = 0; i < st.length - 1; i++) { const a = st[i], b = st[i + 1], m = (a + b) / 2, flags = { cap: Math.abs(m - J.sB) < J.b / 2, blk: Math.abs(m - J.sB) < J.wBlk / 2 };
    const A = jutSection(a, flags), B = jutSection(b, flags); segs.push({ a, b, first: i === 0, last: i === st.length - 2, regions: Object.fromEntries(Object.keys(A).map((k) => [k, [A[k], B[k]]])) }); }
  return segs;
}
export function jutVolumes(segs) {
  const whole = !segs; segs ||= jutSegments();
  const V = { OML: 0, UNI: 0, PVC: 0 }, g = (k) => (k === 'oml' ? 'OML' : k === 'block' ? 'PVC' : 'UNI');
  for (const s of segs) for (const [k, [A, B]] of Object.entries(s.regions)) { const m = A.map((p, i) => [(p[0] + B[i][0]) / 2, (p[1] + B[i][1]) / 2]); V[g(k)] += (s.b - s.a) / 6 * (area2(A) + 4 * area2(m) + area2(B)); }
  if (whole) V.OML -= cutsVol(JCUTS);
  return V;
}
export function jutParams() {
  const segs = jutSegments(), rr = (a) => a.map(([u, v]) => [r4(u), r4(v)]);
  return { segs: segs.map((s) => ({ piece: 'S', ha: r4(s.a), hb: r4(s.b), keep: [s.first, s.last], O: [[0, r4(s.a), 0], [0, r4(s.b), 0]], regions: Object.fromEntries(Object.entries(s.regions).map(([k, [A, B]]) => [k, [rr(A), rr(B)]])) })),
    axes: { S: [[1, 0, 0], [0, 0, 1]] }, group: { oml: 'OML', cap_u: 'UNI', cap_l: 'UNI', block: 'PVC' }, feat: { OML: 'outline', UNI: 'spar', PVC: 'spar' }, n: segs.length, ...(JCUTS.length ? { cuts: cutParams(JCUTS) } : {}) };
}
/** the laminate outside the solid's regions (inches², lb): skins, front wall, inboard close-out, drag-spar webs, the
 *  drag-angle doubler, and the caps' lap onto the panel (outside the jut-out's OML) */
export function jutShell() {
  const st = jutStations(), J = JS; let top = 0, bot = 0, inb = 0;
  for (let i = 0; i < st.length - 1; i++) { const m = (st[i] + st[i + 1]) / 2, ds = st[i + 1] - st[i], y0 = yIn(m), n = 16; let at = 0, ab = 0;
    for (let k = 0; k < n; k++) { const ya = y0 + (YJ - y0) * k / n, yb = y0 + (YJ - y0) * (k + 1) / n; at += Math.hypot(yb - ya, up(m, yb) - up(m, ya)); ab += Math.hypot(yb - ya, lo(m, yb) - lo(m, ya)); }
    top += at * ds; bot += ab * ds; inb += (up(m, y0) - lo(m, y0)) * ds; }
  const front = area2(jutSection(S0, {}).oml), webA = 2 * (YJ - J.yA) * J.hw((J.yA + YJ) / 2), dbl = DANG.dblArea;
  const lines = [['Skins, upper and lower', 'BID', FIXED.skinBID, top + bot, true], ['Front wall (0.15 in off the CS spar)', 'BID', 2, front, true], ['Inboard close-out (cowl side)', 'BID', 2, inb, true],
    ['Drag-spar webs (both faces of the block)', 'BID', J.nW, webA, true], ['Drag-angle doubler (LEZ-57-144)', 'BID', DANG.nD, dbl, true], ['Drag-spar caps lapping the panel', 'UNI', J.n, 2 * J.b * J.Lov, false]];
  const out = lines.map(([what, mat, n, a, inside]) => ({ what, mat, n, a, inside, lb: plyWeight(mat, a / 144, n), in3: a * n * BASE_MAT[mat].t }));
  return { lines: out, lb: out.reduce((s, l) => s + l.lb, 0), in3: out.filter((l) => l.inside).reduce((s, l) => s + l.in3, 0) };
}
export const JUT_RHO = { UNI: plyWeight('UNI', 1, 1) / 144 / tU, PVC: BASE_MAT.PVC.rho * 62.43 / 1728, XPS: BASE_MAT.XPS.rho * 62.43 / 1728, AL: 0.098 };
const POCKET = () => DANG.L * DANG.b * DANG.b;   // the angle's envelope, routed out of the core (in³)
/** rev B: mass outside the regions that block C's openings add (ring doubler, cover, fasteners), set by wpC8_cuts.js */
export const JEXTRA = { lb: 0 };
export const jutMassOf = (v) => JEXTRA.lb + (v.UNI ?? 0) * JUT_RHO.UNI + (v.PVC ?? 0) * JUT_RHO.PVC + Math.max(0, (v.OML ?? 0) - (v.UNI ?? 0) - (v.PVC ?? 0) - jutShell().in3 - POCKET()) * JUT_RHO.XPS + jutShell().lb;
{ const p = partByPN('LEZ-57-116'); if (p) { p.massEach = +jutMassOf(jutVolumes()).toFixed(3); p.src = { ...p.src, mass: 'GEOMETRY: the definition solid (LEZ-57-116)' };
  p.props = [...p.props.filter((x) => !/^(Mass|Construction|Drag-angle doubler)/.test(x[0])), ['Construction', `2 × 6781 skins on CNC-milled HT61; drag spar on the bolt line: ${JS.n} × HTS40 × ${JS.b} in caps, ${JS.nW} × 6781 webs on a ${JS.wBlk} in HT61 block; 2 × 6781 front wall and inboard close-out`]]; } }
