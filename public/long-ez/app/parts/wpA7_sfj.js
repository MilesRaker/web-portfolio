// WPA7 — strake-to-fuselage joint LEZ-57-150. The strake's root rib is a plane at BL ±STK.yR; the fuselage side tapers
// inboard of it going aft, so between the rib face and the side there is a gap that grows from about 0.1 in near the
// strake's leading edge to 1.2 in (lower skin) and 2.6 in (upper skin) at the tank's aft wall (ICD M-12). The joint is a
// dry close-out wedge: a PVC block hot-wired to the gap at each station, floxed to the rib face and the fuselage side,
// wrapped in 2 BID, with 2-BID outside tapes from the strake skins onto the fuselage side top and bottom and a 3/4 in
// micro fillet faired over (the 3D model's contour). The tank stays inside the strake (the root rib is its wall).
//  • Sections are taken in FS planes (u = BL, v = WL), right side, mirrored; the solid is lofted by cad/loft3d.py.
//  • Checks: join-strake-fus (wp13: the tapes and flox along the root, now with the cavity's fuel and no ASSUMED input)
//    and sfj-wedge (the root shear crossing the wedge: foam shear and the two flox lines, the load shared in proportion
//    to the local depth). Notional.
import { GEO, FIXED, registerChecks, mk, psi, allowB, BASE_MAT, omlAt } from '../structures.js';
import { plyWeight } from '../plybook.js';
import { partByPN, insideFus } from '../systems.js';
import { STK, strakeVolumes } from './wp21_strake.js';
import { r4 } from './wpA0_flat.js';

const IN_ = (n, v, u, s = 'DERIVED') => [n, v, u, s], tB = BASE_MAT.BID.t;
export const SFJ = { minGap: 0.03, minH: 0.30, N: 10, wrap: 2, tape: { n: 2, lap: 1.0 }, flox: 0.03, fillet: 0.75 };
export const SFJ_RHO = { PVC: BASE_MAT.PVC.rho * 62.43 / 1728, BID: plyWeight('BID', 1, 1) / 144 / tB, FLOX: 0.043, MICRO: 0.010 };   // flox and micro typed from memory (mass only)
const yR = STK.yR, s1 = STK.aft;
/** the fuselage side (OML) at FS fs and WL z (in) */
const side = (fs, z) => { let a = 0, b = 20; for (let i = 0; i < 40; i++) { const m = (a + b) / 2; if (insideFus(fs / 12, m / 12, z / 12, 0)) a = m; else b = m; } return a; };
const skins = (fs) => { const m = omlAt(fs / 12, yR / 12); return m ? { lo: m.lo * 12, up: m.up * 12 } : null; };
/** the wedge's section at fs: rib face at BL yR from the lower to the upper skin, back down the fuselage side */
export function sfjSection(fs) {
  const k = skins(fs); if (!k) return null;
  const zs = Array.from({ length: SFJ.N + 1 }, (_, i) => k.up - (k.up - k.lo) * i / SFJ.N);
  return [[yR, k.lo], [yR, k.up], ...zs.map((z) => [Math.min(side(fs, z), yR - SFJ.minGap), z])];
}
export const SFJG = (() => {
  let s0 = 44.5; while (!skins(s0) || skins(s0).up - skins(s0).lo < SFJ.minH) s0 += 0.25;
  const k = Math.ceil((s1 - s0) / 6), st = Array.from({ length: k + 1 }, (_, i) => +(s0 + (s1 - s0) * i / k).toFixed(4));
  const gaps = st.map((fs) => { const q = skins(fs); return { fs, lo: yR - side(fs, q.lo), up: yR - side(fs, q.up), H: q.up - q.lo }; });
  return { s0, st, gaps };
})();
const area2 = (p) => Math.abs(p.reduce((a, q, i) => { const r = p[(i + 1) % p.length]; return a + q[0] * r[1] - r[0] * q[1]; }, 0)) / 2;
const per = (p) => p.reduce((a, q, i) => { const r = p[(i + 1) % p.length]; return a + Math.hypot(r[0] - q[0], r[1] - q[1]); }, 0);
export function sfjParams() {
  const st = SFJG.st, rr = (a) => a.map(([u, v]) => [r4(u), r4(v)]);
  return { segs: st.slice(0, -1).map((fs, i) => ({ piece: 'S', ha: r4(fs), hb: r4(st[i + 1]), keep: [i === 0, i === st.length - 2], O: [[0, r4(fs), 0], [0, r4(st[i + 1]), 0]], regions: { wedge: [rr(sfjSection(fs)), rr(sfjSection(st[i + 1]))] } })),
    axes: { S: [[1, 0, 0], [0, 0, 1]] }, group: { wedge: 'OML' }, feat: { OML: 'wedge' }, n: st.length - 1 };
}
export function sfjVolume() { const st = SFJG.st; let V = 0; for (let i = 0; i < st.length - 1; i++) { const A = sfjSection(st[i]), B = sfjSection(st[i + 1]), m = A.map((p, j) => [(p[0] + B[j][0]) / 2, (p[1] + B[j][1]) / 2]); V += (st[i + 1] - st[i]) / 6 * (area2(A) + 4 * area2(m) + area2(B)); } return V; }
/** laminate and bond lines outside the solid (per side, in² and lb): the 2-BID wrap round the wedge, the outside tapes,
 *  the flox lines on the rib and side faces, the micro fillets top and bottom */
export function sfjExtras() {
  const st = SFJG.st; let wrap = 0, face = 0, tapes = 0;
  for (let i = 0; i < st.length - 1; i++) { const L = st[i + 1] - st[i], A = sfjSection(st[i]), B = sfjSection(st[i + 1]); wrap += L * (per(A) + per(B)) / 2; face += L * (SFJG.gaps[i].H + SFJG.gaps[i + 1].H) / 2; tapes += L * 2 * (2 * SFJ.tape.lap + (SFJG.gaps[i].lo + SFJG.gaps[i].up) / 2); }
  const filletA = (1 - Math.PI / 4) * SFJ.fillet ** 2, len = st.at(-1) - st[0];
  return [{ what: `Wrap, ${SFJ.wrap} × 6781 round the wedge`, a: wrap, lb: plyWeight('BID', wrap / 144, SFJ.wrap) }, { what: `Outside tapes, ${SFJ.tape.n} × 6781 top and bottom, ${SFJ.tape.lap} in onto the strake skin and the side`, a: tapes, lb: plyWeight('BID', tapes / 144, SFJ.tape.n) },
    { what: 'Flox lines, rib face and side face', a: 2 * face, lb: 2 * face * SFJ.flox * SFJ_RHO.FLOX }, { what: `Micro fillets R ${SFJ.fillet} in, top and bottom`, a: 0, lb: 2 * filletA * len * SFJ_RHO.MICRO }];
}
export const sfjMassOf = (v) => (v.OML ?? 0) * SFJ_RHO.PVC + sfjExtras().reduce((a, x) => a + x.lb, 0);
// the strake cavity's fuel and the tank's root length, for join-strake-fus (wp13 reads FIXED.strakeFuel)
FIXED.strakeFuel = { lb: strakeVolumes().cavity / 231 * 6.0, Lr: s1 - SFJG.s0 };
{ const p = partByPN('LEZ-57-150'); if (p) { p.massEach = +sfjMassOf({ OML: sfjVolume() }).toFixed(3); p.src = { ...p.src, mass: 'GEOMETRY: the definition solid (LEZ-57-150)' };
  p.name = 'Strake-to-fuselage joint: HT61 close-out wedge in 2 × 6781, flox both faces, 2-ply 6781 tapes top and bottom, 3/4 in micro fillet (L/R)'; } }

registerChecks('wpA7-sfj', (d, lc, Z, M) => {
  if (lc.type !== 'sym' || lc.n <= 0) return [];
  const fuel = FIXED.strakeFuel.lb, Vj = (1 - lc.ac.shareC) * lc.ac.W / 2 * lc.n * 0.18 + fuel * lc.n, P = Vj * d.FS, st = SFJG.st;
  let Arib = 0; for (let i = 0; i < st.length - 1; i++) Arib += (st[i + 1] - st[i]) * (SFJG.gaps[i].H + SFJG.gaps[i + 1].H) / 2;
  const tau = P / Arib, msF = psi(M.PVC.tau) / tau - 1, ils = psi(M.GUD.ILSS), msB = ils / tau - 1, ms = Math.min(msF, msB);
  const shareMax = 0.18 * Math.max(0, (psi(M.PVC.tau) * Arib / d.FS - fuel * lc.n) / Math.max(1e-9, Vj - fuel * lc.n));
  return [Object.assign(mk('strake', 'sfj-wedge', 'Strake-to-fuselage close-out wedge: the root shear across the gap (HT61 core, flox both faces)', lc, 'strake root, FS ' + SFJG.s0.toFixed(1) + '–' + s1.toFixed(1), msF < msB ? 'wedge core shear' : 'flox line shear', ms, {
    formula: 'the strake\'s root shear V = FS·(L_strake + W_fuel·n) crosses the wedge from the rib face to the side, shared along the root in proportion to the local depth H: τ = V / ∫H ds (core and both flox lines)',
    inputs: [IN_('Strake lift share (× the wing-side lift)', 0.18, '', `BOUND: MS stays ≥ 0 up to ${shareMax.toFixed(2)}`), IN_('Fuel per side', fuel, 'lb', 'MODEL: the strake cavity (strakeVolumes) × 6.0 lb/US gal'), IN_('Rib face area ∫H ds', Arib, 'in2', 'GEOMETRY'),
      IN_('Core shear allowable (HT61)', psi(M.PVC.tau), 'psi', `BOUND: HT61 datasheet-typical; MS stays ≥ 0 down to ${tau.toFixed(1)} psi`), IN_('Flox line allowable', ils, 'psi', allowB(msB, 'interlaminar shear strength, taken for the flox bond'))],
    result: [['V (ult.)', P, 'lb'], ['τ', tau, 'psi']] }), { sys: 'LEZ-57-150' })];
});
void GEO;
