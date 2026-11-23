// WP22 — engine mount weldment LEZ-71-220: tube sizing and the definition's numbers. The truss (nodes and members) is
// laid out in wp1 (MOUNT); here each member group (longerons, diagonals, ring) takes the lightest standard 4130 N tube
// that keeps every member's margin at the target reserve over every engine-mount load combination, with the solve
// repeated as the stiffnesses change. The check replaces wp1's: thrust is carried as a bound, the tubes are SIZED and
// the allowables come from MIL-HDBK-5. Notional.
import { registerChecks, mk, GEO } from '../structures.js';
import { MOUNT, mountForces, mountCombos, mountMass } from './wp1_powerplant.js';
import { partByPN } from '../systems.js';
import { DEFAULT_DESIGN, loadCases, effective } from '../structures.js';

/** the upper pick-ups' bolt axis stands this far aft of the firewall's aft face (in): base plate + ear to the bolt (LEZ-71-222) */
export const UPK_STAND = 1.0;
/** rev B (block G, ICD G-F2): the upper pick-ups move inboard and down so the LEZ-71-222 base and backing plates sit
 *  inside the firewall outline (≥ 0.6 in inside the OML, clear of the cowl hinge-flange band).
 *  rev C (block A ICD, firewall integration): rev B's 1.5 in down put the cabin-side backing plate 0.43 in into the CS
 *  spar's top (WL 40.09 vs 40.52) and the lower base bolts 0.19 in above it (no room for the nut, washer and the panel's
 *  edge bond). 1.0 in down keeps the plate's lower edge 0.06 in above the spar top; 1.5 in inboard (BL ±4.74) keeps both
 *  plates' corners inside the OML by the rev B margins (base ≥ 0.6, backing plate ≥ 0.665 in). */
export const UPK_SHIFT = { inboard: 1.5, down: 1.0 };
for (const n of ['FTL', 'FTR']) { const q = MOUNT.nodes[n]; q[0] = GEO.firewall + UPK_STAND / 12; q[1] -= Math.sign(q[1]) * UPK_SHIFT.inboard / 12; q[2] -= UPK_SHIFT.down / 12; }
const TGT = 0.15, E = 29.0e6, FTU_W = 80000, FCY = 75000, RHO = 0.283;
/** standard 4130 N round tube (MIL-T-6736), OD × wall, in */
export const TUBES = [[0.5, 0.035], [0.5, 0.049], [0.625, 0.035], [0.625, 0.049], [0.75, 0.035], [0.75, 0.049], [0.875, 0.035], [0.875, 0.049], [1.0, 0.049]];
const area = (od, w) => Math.PI * ((od / 2) ** 2 - (od / 2 - w) ** 2);
export const GROUPS = { longeron: [0, 1, 2, 3], diagonal: [4, 5, 6, 7], ring: [8, 9, 10, 11] };
const MIN = [0.625, 0.035];   // smallest tube on an engine mount here: handling, weld heat and a dented-tube allowance
export function allowable(m, P) {
  if (P >= 0) return { Pa: FTU_W * m.A, mode: 'tension at the weld' };
  const ro = m.od / 2, ri = ro - m.w, rho = Math.sqrt((ro * ro + ri * ri) / 4), sl = m.L / rho, slc = Math.sqrt(2 * Math.PI ** 2 * E / FCY);
  const scr = sl < slc ? FCY - (FCY ** 2 / (4 * Math.PI ** 2 * E)) * sl * sl : Math.PI ** 2 * E / (sl * sl);
  return { Pa: Math.min(scr, FTU_W) * m.A, mode: sl < slc ? `column (Johnson), L/ρ ${sl.toFixed(0)}` : `column (Euler), L/ρ ${sl.toFixed(0)}`, sl };
}
const caseList = () => { const d = effective(DEFAULT_DESIGN); return loadCases(d).map((lc) => ({ d, lc, mc: mountCombos(d, lc) })).filter((c) => c.mc); };
function worstMS(idx, cs) {
  let w = Infinity;
  for (const { mc } of cs) for (const c of mc.combos) { const f = mountForces(c.F, c.M, mc.mm.c); for (const i of idx) { const m = f[i], al = allowable(m, m.P); w = Math.min(w, al.Pa / (mc.FS * Math.abs(m.P) + 1e-9) - 1); } }
  return w;
}
/** size the groups in place (MOUNT.members is shared with the geometry, the clash check and the 3D view) */
export const MOUNT_SIZING = (() => {
  const cs = caseList(), ok = TUBES.filter(([od, w]) => od >= MIN[0] && w >= MIN[1]).sort((a, b) => area(...a) - area(...b));
  for (let it = 0; it < 4; it++) for (const idx of Object.values(GROUPS)) {
    const pick = ok.find((t) => { const keep = idx.map((i) => MOUNT.members[i].slice(2)); idx.forEach((i) => { MOUNT.members[i][2] = t[0]; MOUNT.members[i][3] = t[1]; }); const ms = worstMS(idx, cs); idx.forEach((i, j) => { MOUNT.members[i][2] = keep[j][0]; MOUNT.members[i][3] = keep[j][1]; }); return ms >= TGT; }) || ok.at(-1);
    idx.forEach((i) => { MOUNT.members[i][2] = pick[0]; MOUNT.members[i][3] = pick[1]; });
  }
  const f0 = mountForces([0, 0, 0], [0, 0, 0], [0, 0, 0]);
  const cut = MOUNT.members.map(([a, b, od, w], i) => ({ id: `T${String(i + 1).padStart(2, '0')}`, a, b, od, w, L: f0[i].L, group: Object.entries(GROUPS).find(([, ix]) => ix.includes(i))[0] }));
  const mass = cut.reduce((s, t) => s + area(t.od, t.w) * t.L * RHO, 0);
  return { cut, mass, groups: Object.fromEntries(Object.entries(GROUPS).map(([g, ix]) => [g, MOUNT.members[ix[0]].slice(2)])), ms: Object.fromEntries(Object.entries(GROUPS).map(([g, ix]) => [g, worstMS(ix, cs)])) };
})();
{ const p = partByPN('LEZ-71-220'); if (p) { p.massEach = +MOUNT_SIZING.mass.toFixed(3); delete p.extraMass; p.src = { ...p.src, mass: 'GEOMETRY: the definition solid (LEZ-71-220), node-to-node tube lengths', geometry: 'LEZ sizing (wp22)' };
  const g = MOUNT_SIZING.groups; p.props = [['Tube sizes', `longerons ${g.longeron[0]} × ${g.longeron[1]}, diagonals ${g.diagonal[0]} × ${g.diagonal[1]}, ring ${g.ring[0]} × ${g.ring[1]} (4130 N, sized)`], ['Weld allowable', '80 ksi tension at welds (MIL-HDBK-5, fusion-welded 4130, not heat-treated after welding)']]; } }

registerChecks('wp1-mount', (d, lc) => {
  const mc = mountCombos(d, lc); if (!mc) return [];
  const { mm, W, FS, Q, Mg, combos } = mc;
  let worst = null;
  for (const c of combos) for (const m of mountForces(c.F, c.M, mm.c)) { const al = allowable(m, m.P), ms = al.Pa / (FS * Math.abs(m.P) + 1e-9) - 1; if (!worst || ms < worst.ms) worst = { ms, m, al, c }; }
  const { m, al, c } = worst;
  // thrust bound: the largest thrust at which this case's worst member keeps MS ≥ 0 (thrust acts in the sym combinations only)
  let tB = null; if (lc.type === 'sym') { let lo = 0, hi = 5000; const msAt = (T) => Math.min(...[1, -1].flatMap((sq) => [1, -1].map((sm) => { const F = [-T, 0, -lc.n * W], M = [sq * Q, 0, sm * Mg]; return Math.min(...mountForces(F, M, mm.c).map((x) => allowable(x, x.P).Pa / (FS * Math.abs(x.P) + 1e-9) - 1)); })));
    if (msAt(hi) >= 0) tB = hi; else { for (let i = 0; i < 30; i++) { const mid = (lo + hi) / 2; if (msAt(mid) >= 0) lo = mid; else hi = mid; } tB = lo; } }
  const r = mk('fuselage', 'mount-tube', 'Engine mount: critical tube', lc, `${m.a}–${m.b}, ${m.od} × ${m.w}`, al.mode, worst.ms, {
    formula: 'Space-truss stiffness solve (firewall pick-ups fixed, rigid engine on 4 pads); tension P_a = F_tu,weld·A; compression Johnson/Euler column, pinned ends',
    inputs: [['Mass on the mount', W, 'lb', 'DEFINED PARTS'], ['Mass-centre station', mm.c[0] * 12, 'in', 'DEFINED PARTS'], ['Load combination', c.tag, 'text', 'FAR23'], ['Limit torque (2 × mean, 4 cyl.)', Q, 'inlb', 'FAR23'], ['Gyroscopic moment, 1 rad/s', Mg, 'inlb', 'FAR23'],
      ['Thrust', d.thrust, 'lb', tB == null ? 'not in this combination' : `BOUND: MS stays ≥ 0 up to ${tB >= 5000 ? '> 5000' : tB.toFixed(0)} lb`], ['Tube', `${m.od} × ${m.w} 4130 N, L ${m.L.toFixed(1)} in`, 'text', 'SIZED'], ['F_tu at welds / F_cy', '80 / 75 ksi', 'text', 'MIL-HDBK-5: fusion-welded 4130 (not heat-treated after welding) / 4130 N tube, MIL-T-6736']],
    result: [['Member load (limit)', m.P, 'lb'], ['Factor of safety', FS, ''], ['Allowable', al.Pa, 'lb']],
  });
  r.sys = 'LEZ-71-220';
  return [r];
});
void mountMass;
