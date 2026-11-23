// WP23 — upper engine-mount pick-ups LEZ-71-222: a 4130 N clevis fitting on the firewall's aft face at each upper hard
// point, its two ears straddling the mount's cross-bushing (LEZ-71-224) on a lateral AN6 bolt in double shear, its base
// bolted fore-aft through the firewall hard point with four AN bolts into a 6061-T6 backing plate on the cabin side.
//  • Reactions from the mount truss (pickupReactions, wp6) at FTL / FTR, every engine-mount combination.
//  • Checks: ears (bearing, shear-out, net tension), the pick-up bolt (double shear), ear bending under the lateral load,
//    the base bolts (tension from pull-off and the moments about the base, shear; interaction), backing-plate bending.
// The ear and base thicknesses and the base bolts are sized to the +15 % reserve. Notional.
import { registerChecks, mk, GEO } from '../structures.js';
import { pickupReactions } from './wp6_engine_install.js';
import { MOUNT } from './wp1_powerplant.js';
import { UPK_STAND } from './wp22_mount.js';
import { partByPN } from '../systems.js';
import { DEFAULT_DESIGN, effective, loadCases, materials, psi, allowB } from '../structures.js';

const TGT = 0.15, IN_ = (n, v, u, s = 'DERIVED') => [n, v, u, s];
// 4130 N, S-basis: Ftu 95 / Fty 75 / Fsu 57 ksi; Fbru (e/D 2.0) 200 ksi at t ≤ 0.188, 190 at t > 0.188 (190 used: thickness-safe). src 'MIL-HDBK-5J
// table 2.3.1.0(c1) AISI 4130 (KasperCalc transcription and files.engineering.com excerpt, accessed 2026-11-19)'
const ST = { Ftu: 95000, Fty: 75000, Fsu: 57000, Fbru: 190000, rho: 0.283, spec: 'MIL-HDBK-5J table 2.3.1.0(c1), 4130 N sheet (AMS 6350), S-basis (accessed 2026-11-19)' };
const AL = { Ftu: 42000, Fty: 35000, rho: 0.098, spec: 'MMPDS 6061-T6 sheet, A-basis' };
const AN = { 3: { s: 2126, t: 2210 }, 4: { s: 3682, t: 4080 },   // shear: Fsu 75 ksi × π/4 d² (MIL-HDBK-5J 125 ksi column, derived)
   5: { s: 5750, t: 6500 }, 6: { s: 8280, t: 10100 } };   // single shear / tension ultimate, lb (AN standard)
const SHEET = [0.063, 0.071, 0.080, 0.090, 0.100, 0.125, 0.160, 0.190];
/** geometry (in): ears w wide, bolt h off the base face, e from the bolt to the ear tip; base plate B square, bolts on a p square */
const YC = { v: 0 };   // BID transverse compression (design), set from the materials at sizing
const geoOf = (te, tb, nb) => { const D = 0.375, gap = 0.75; return { D, te, tb, nb, w: 1.0, e: 2 * D + 0.05, h: UPK_STAND - tb, gap, B: 2.25, p: 1.5, Bk: 2.75, tk: 0.125, db: nb / 16, Yc: YC.v }; };
/** ultimate state at one node for reaction R (limit, lb, aircraft axes [FS, BL, WL]) */
export function upkState(R, FS, g) {
  const Rx = Math.abs(R[0]) * FS, Ry = Math.abs(R[1]) * FS, Rz = Math.abs(R[2]) * FS, Pin = Math.hypot(Rx, Rz), P = Math.hypot(Rx, Ry, Rz);
  const brg = 2 * g.D * g.te * ST.Fbru, so = 2 * 2 * (g.e - g.D / 2) * g.te * ST.Fsu, net = 2 * (g.w - g.D) * g.te * ST.Ftu * 0.75, lug = Math.min(brg, so, net);
  const pin = 2 * AN[6].s;
  const sb = 6 * (Ry / 2) * g.h / (g.w * g.te ** 2) + (Pin / 2) / (g.w * g.te);   // each ear: lateral half as a cantilever from the base + its share in-plane
  // base bolts: four on a p × p square; pull-off Rx, moments about the base from Rz·h and Ry·h; shear Ry, Rz shared
  const Mz = Rz * g.h, My = Ry * g.h, tMax = Rx / 4 + Mz / (2 * g.p) + My / (2 * g.p), sMax = Math.hypot(Ry, Rz) / 4, b = AN[g.nb], inter = Math.hypot(sMax / b.s, tMax / b.t);
  // backing plate: the bolts' pull draws it onto the firewall's cabin face, which it bears on over its area
  const Ttot = Rx + 2 * (Mz + My) / g.p, sk = Ttot / (g.Bk * g.Bk - 4 * Math.PI * (g.db / 2) ** 2);
  return { Rx, Ry, Rz, Pin, P, ms: { lug: lug / Pin - 1, pin: pin / P - 1, ear: ST.Fty / sb - 1, base: 1 / inter - 1, back: g.Yc / sk - 1 }, lug, brg, so, net, pin, sb, tMax, sMax, sk, mode: lug === brg ? 'ear bearing' : lug === so ? 'ear shear-out' : 'ear net tension' };
}
const cases = () => { const d = effective(DEFAULT_DESIGN), out = []; for (const lc of loadCases(d)) { const r = pickupReactions(d, lc); if (!r) continue; for (const o of r.out) for (const n of ['FTL', 'FTR']) if (o.R[n]) out.push({ R: o.R[n], FS: r.FS }); } return out; };
export const UPK = (() => {
  YC.v = psi(materials(effective(DEFAULT_DESIGN)).BID.Yc);
  const cs = cases(); let pick = null;
  for (const nb of [3, 4, 5]) for (const te of SHEET) for (const tb of SHEET.filter((t) => t >= te)) {
    const g = geoOf(te, tb, nb), ok = cs.every((c) => Math.min(...Object.values(upkState(c.R, c.FS, g).ms)) >= TGT); if (!ok) continue;
    const v = 2 * g.w * (g.h + g.e) * te + g.B * g.B * tb; if (!pick || v < pick.v) pick = { ...g, v };
  }
  const g = pick, holeA = Math.PI * (g.db / 2) ** 2, earA = g.w * (g.h + g.e) - Math.PI * (g.D / 2) ** 2;
  const fittingV = 2 * earA * g.te + (g.B * g.B - 4 * holeA) * g.tb, backV = (g.Bk * g.Bk - 4 * holeA) * g.tk;
  return { ...g, fittingV, backV, mass: fittingV * ST.rho + backV * AL.rho };
})();
{ const p = partByPN('LEZ-71-222'); if (p) { p.massEach = +UPK.mass.toFixed(3); p.src = { ...p.src, mass: 'GEOMETRY: the definition solid (LEZ-71-222)' }; } }

registerChecks('wp23-upk', (d, lc) => {
  const r = pickupReactions(d, lc); if (!r) return [];
  let w = null;
  for (const o of r.out) for (const n of ['FTL', 'FTR']) { const R = o.R[n]; if (!R) continue; const s = upkState(R, r.FS, UPK); for (const [k, ms] of Object.entries(s.ms)) if (!w || !w[k] || ms < w[k].ms) { w ||= {}; w[k] = { ms, s, c: o.c, n }; } }
  if (!w) return [];
  const g = UPK, base = (x) => [['Load combination', x.c.tag, 'text', 'FAR23'], IN_('Reactions R_x, R_y, R_z (ult.)', `${x.s.Rx.toFixed(0)}, ${x.s.Ry.toFixed(0)}, ${x.s.Rz.toFixed(0)}`, 'lb', 'DERIVED: mount truss solve'), IN_('Factor of safety', r.FS, '', r.emer ? 'KD' : 'FAR23 × KD')];
  const fit = IN_('Fitting', `two ${g.te} in ears ${g.w} in wide, bolt ${g.h} in off a ${g.tb} in base; 4130 N`, 'text', 'SIZED'), mat = IN_('4130 N F_tu / F_ty / F_su / F_bru', '95 / 75 / 57 / 175 ksi', 'text', ST.spec);
  const row = (id, title, mode, k, formula, result, extra = []) => Object.assign(mk('fuselage', id, title, lc, `${w[k].n}, firewall upper hard point`, mode, w[k].ms, { formula, inputs: [...base(w[k]), fit, ...extra, mat], result }), { sys: 'LEZ-71-222' });
  return [
    row('upk-lug', 'Upper pick-up: ears at the bolt', w.lug.s.mode, 'lug', 'P = √(R_x² + R_z²) in the ears\' plane;  allow = min(2·D·t·F_bru, 4·(e − D/2)·t·F_su, 2·K·(w − D)·t·F_tu), K = 0.75', [['P (ult.)', w.lug.s.Pin, 'lb'], ['Allowable', w.lug.s.lug, 'lb']], [IN_('End distance e', g.e, 'in', 'GEOMETRY')]),
    row('upk-pin', 'Upper pick-up: AN6 bolt in double shear', 'bolt double shear', 'pin', '|R| on two shear planes', [['|R| (ult.)', w.pin.s.P, 'lb'], ['Allowable', w.pin.s.pin, 'lb']], [IN_('AN6 single shear', AN[6].s, 'lb', 'AN standard')]),
    row('upk-ear', 'Upper pick-up: ear bending under the lateral reaction', 'ear bending + direct', 'ear', 'σ = 6·(R_y/2)·h / (w·t²) + (P/2) / (w·t)', [['σ (ult.)', w.ear.s.sb, 'psi']]),
    row('upk-base', `Upper pick-up: base bolts (4 × AN${g.nb}), tension and shear`, 'combined shear and tension', 'base', 'T = R_x/4 + R_z·h/(2p) + R_y·h/(2p);  V = √(R_y² + R_z²)/4;  (V/V_a)² + (T/T_a)² ≤ 1',
      [['Bolt tension (ult.)', w.base.s.tMax, 'lb'], ['Bolt shear (ult.)', w.base.s.sMax, 'lb']], [IN_(`AN${g.nb}`, `${AN[g.nb].s} lb shear, ${AN[g.nb].t} lb tension`, 'text', 'AN standard'), IN_('Bolt square p', g.p, 'in', 'GEOMETRY')]),
    row('upk-back', 'Upper pick-up: firewall bearing under the backing plate', 'laminate compression under the plate', 'back', 'the bolts\' total pull (R_x + 2·(R_z + R_y)·h/p) bears on the firewall over the backing plate', [['σ (ult.)', w.back.s.sk, 'psi']], [IN_('Backing plate', `${g.Bk} × ${g.Bk} × ${g.tk} in 6061-T6`, 'text', 'SIZED'), IN_('Through-thickness compression allowable', g.Yc, 'psi', allowB(w.back.ms, '6781 transverse compression, taken through the thickness'))]),
  ];
});
void GEO; void MOUNT;
