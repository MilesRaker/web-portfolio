// Block H interface checks added by the ICD (docs/icd/h_engsys.md, phase 2). Each check reads the partner's own symbols
// (block A's firewall layout and rear-bulkhead holes, block F's fuel lines, block G's air box, SCAT and the released
// LEZ-71-210 rev B solid, block B's canopy-latch keep-out) instead of block H's copies of them, so a move on either side
// fails the audit. Items owned by unfinished blocks stay open items in the ICD, not failing checks. Notional.
// Frame: definition frame, inches [BL, FS, WL].
import { partByPN, PASS, KEEPOUTS } from '../systems.js';
import { LAYOUT } from '../parts/wpA3_firewall.js';
import { RB, RBG } from '../parts/wpA2_rearbhd.js';
import { enginePrims } from '../parts/wpG1_engine.js';
import * as R from '../parts/wpH0_route.js';
import * as LY from '../parts/wpH1_layout.js';
import { RUNS } from '../parts/wpH2_runs.js';
import { fx, DATE } from './h_common.js';
import { SW_P, SW_AT } from '../parts/wpD2_brakes.js';
import { KEY_DEF, HARN_DEF, PLEAD_DEF } from './h_ign.js';
import { QUAD_DEF, CABLE_DEF } from './h_ctl.js';
import { GEA_DEF, MANI_DEF, FFT_DEF } from './h_ems.js';
import { ENG_DEF } from './g_engine.js';

const FW = R.FW_IN, layout = (id) => LAYOUT.find((q) => q.id === id);
const passAt = (id) => { const p = PASS.find((q) => q.id === id); return p ? [p.at[1] * 12, p.at[2] * 12] : null; };
/** a run's crossings of the firewall, inside the layout hole with ≥ 1/4 in radial room */
function inLayout(id, runs, passId) {
  const L = layout(id); if (!L) return { ok: false, detail: `no block A layout item '${id}'` };
  const c = L.pts[0], room = runs.map((r) => { const q = R.fwCrossing(R.ptsOf(r)); return q ? L.r - Math.hypot(q[0] - c[0], q[1] - c[1]) - r.od / 2 : -Infinity; }), p = passAt(passId);
  const dp = p ? Math.hypot(p[0] - c[0], p[1] - c[1]) : Infinity;
  return { ok: Math.min(...room) >= 0.25 && dp < 0.01, detail: `layout ${id} BL ${c[0]} / WL ${c[1]}, Ø ${fx(2 * L.r)}: radial room ${room.map((v) => fx(v)).join(' / ')} in (≥ 0.25); pass ${passId} ${p ? `${fx(dp, 3)} in from the layout centre` : 'missing'}` };
}
/** clearance of a segment set (in) to primitives */
const clear = (pts, r, prims) => R.clearTo(pts, r, prims);
/** rod and arm-tip sweep: conduit end E to the tip at every 5° of the arm's travel */
function rodSweep(k) {
  const c = LY.CEND[k], A = c.arm, out = [];
  for (let a = -A.travel / 2; a <= A.travel / 2 + 1e-9; a += 5) out.push([c.E, LY.armTip(A, a, c.mid)]);
  return out;
}
function sweepClear(k, prims) { let w = { d: Infinity, at: null }; for (const s of rodSweep(k)) { const q = clear(s, LY.CABLE.rod / 2, prims); if (q.d < w.d) w = q; } return w; }
const HOT = () => R.OBST.scat(), BOX = () => R.OBST.airbox();
/** a thin box as the segment along its longest side with the larger cross half-size as radius (conservative) */
const boxSeg = (p) => { const k = [0, 1, 2].reduce((a, i) => (p.d[i] > p.d[a] ? i : a), 0), e = [0, 0, 0]; e[k] = p.d[k] / 2; const r = Math.max(...p.d.filter((_, i) => i !== k)) / 2; return { pts: [p.c.map((v, i) => v - e[i]), p.c.map((v, i) => v + e[i])], r }; };

const ADD = {
  'LEZ-76-110': [
    { id: 'X1', with: 'LEZ-53-180 firewall layout (block A): engine-control grommet', feature: 'throttle', what: 'Every crossing inside block A\'s layout hole with ≥ 0.25 in radial room; fw-cables at the layout centre', check: () => inLayout('cables', RUNS['LEZ-76-110'], 'fw-cables') },
    { id: 'X2', with: 'LEZ-53-175 rear bulkhead (block A): generated pass holes', feature: 'mixture', what: 'Each conduit inside one of the bulkhead\'s holes', check: () => { const holes = RBG.pass || [], bad = RUNS['LEZ-76-110'].map((r) => { const p = R.ptsOf(r); for (let i = 1; i < p.length; i++) if ((p[i - 1][1] - RB.s * 12) * (p[i][1] - RB.s * 12) < 0) { const t = (RB.s * 12 - p[i - 1][1]) / (p[i][1] - p[i - 1][1]), u = p[i - 1][0] + t * (p[i][0] - p[i - 1][0]), v = p[i - 1][2] + t * (p[i][2] - p[i - 1][2]); return Math.max(...holes.map((h) => h.r - Math.hypot(h.u - u, h.v - v) - r.od / 2)); } return -Infinity; }); return { ok: bad.every((m) => m >= 0), detail: `edge room ${bad.map((m) => fx(m)).join(' / ')} in to A's holes (${holes.length})` }; } },
    { id: 'X3', with: 'LEZ-71-251 rev B carb-heat arm and LEZ-78-110 SCAT (block G)', feature: 'heat', what: 'Arm modelled with its pivot below its tip; rod sweep ≥ 1 in from the SCAT and ≥ 0.25 in from the air box', check: () => { const h = LY.HEAT_ARM, s = sweepClear('heat', HOT()), b = sweepClear('heat', BOX().filter((p) => !/arm|bracket/.test(p.feat)));   /* G's conduit-end bracket holds the end fitting the rod leaves (G rev D, final integration) */ return { ok: h.r > 0 && s.d >= 1.0 && b.d >= 0.25, detail: `arm R ${fx(h.r)} in (pivot WL ${fx(h.pivot[2])}, tip WL ${fx(h.tip[2])}); rod sweep ${fx(s.d)} in to the SCAT, ${fx(b.d)} in to ${b.at}` }; } },
    { id: 'X4', with: 'LEZ-78-110 SCAT and LEZ-71-251 air box (block G)', feature: 'throttle', what: 'Throttle and mixture rods over their travel ≥ 1 in from the SCAT and ≥ 0.25 in from the air box', check: () => { const r = ['throttle', 'mixture'].map((k) => ({ k, s: sweepClear(k, HOT()), b: sweepClear(k, BOX()) })); return { ok: r.every((q) => q.s.d >= 1.0 && q.b.d >= 0.25), detail: r.map((q) => `${q.k}: SCAT ${fx(q.s.d)}, air box ${fx(q.b.d)} in`).join('; ') }; } },
  ],
  'LEZ-74-100': [{ id: 'X1', with: 'LEZ-53-180 firewall layout (block A): power boot', feature: 'harness', what: 'Crossing inside block A\'s layout boot with ≥ 0.25 in radial room; the H pass at the layout centre', check: () => inLayout('power', RUNS['LEZ-74-100'], 'fw-boot-h') }],
  'LEZ-77-100': [{ id: 'X1', with: 'LEZ-53-180 firewall layout (block A): power boot', feature: 'harness', what: 'Crossing inside block A\'s layout boot with ≥ 0.25 in radial room; the H pass at the layout centre', check: () => inLayout('power', RUNS['LEZ-77-100'], 'fw-boot-h') }],
  'LEZ-77-120': [{ id: 'X1', with: 'LEZ-53-180 firewall layout (block A): mani mass allowance', feature: 'block', what: 'Installed mass ≤ the allowance block A sized its inserts for', check: () => { const L = layout('mani'); return { ok: !!L && MANI_DEF.mass.each <= L.mass, detail: `${fx(MANI_DEF.mass.each, 3)} lb ≤ ${L?.mass} lb (fw-equip)` }; } }],
  'LEZ-77-130': [{ id: 'X1', with: 'LEZ-28-150 fuel lines (block F)', feature: 'ports', what: 'F\'s line ends on the transducer\'s ports', check: () => { const t = partByPN('LEZ-77-130').ports, g = partByPN('LEZ-28-150')?.geo || [], P = (q) => R.P3(q); const a = g.find((q) => q.ends?.[1] === 'LEZ-77-130:IN'), b = g.find((q) => q.ends?.[0] === 'LEZ-77-130:OUT'); if (!a || !b) return { ok: false, detail: 'F\'s lines do not end on LEZ-77-130' }; const d = [Math.hypot(...P(a.pts.at(-1)).map((v, i) => v - P(t.IN.at)[i])), Math.hypot(...P(b.pts[0]).map((v, i) => v - P(t.OUT.at)[i]))]; return { ok: Math.max(...d) < 0.01, detail: `IN ${fx(d[0], 3)} / OUT ${fx(d[1], 3)} in` }; } }],
  'LEZ-76-100': [{ id: 'X2', with: 'LEZ-32-216 S11 (block D): the switch actuator', feature: 'cam', what: 'Idle cam: the base circle clears the actuator and the lobe over-travels it, each by ≥ 1/32 in', check: () => { const top = Math.max(...SW_P.prims.filter((p) => p.g === 'switch').map((p) => p.c[2] + p.d[2] / 2)), s = SW_AT.find((q) => q.ref === 'S11'), a = LY.QD.pivot[2] - (s.at[2] * 12 + top), c = LY.QD.cam, rel = a - c.r0, ovr = c.r1 - a; return { ok: rel >= 1 / 32 && ovr >= 1 / 32, detail: `actuator ${fx(a, 3)} in below the pivot (switch top ${fx(top, 2)} in over S11's base): released gap ${fx(rel, 3)} in, over-travel ${fx(ovr, 3)} in` }; } },
    { id: 'X1', with: 'LEZ-52-100 canopy-latch keep-out (block B, KEEPOUTS)', feature: 'knobs', what: 'Knobs, levers and the heat knob inboard of the keep-out\'s inboard face by ≥ 0.05 in', check: () => { const k = KEEPOUTS.find((q) => q.id === 'ko-canopy-latch'); if (!k) return { ok: true, detail: 'no keep-out record (open item for block B)' }; const face = Math.max(k.c[1] - k.d[1] / 2, k.c[1] + k.d[1] / 2) * 12, Q = LY.QD, m = Math.min(Q.throttle.knob.bl - Q.throttle.knob.d / 2, Q.mixture.knob.bl - Q.mixture.knob.d / 2, Q.throttle.bl - Q.throttle.t / 2, Q.heat.bl - Q.heat.knob.d / 2) - face; return { ok: m >= 0.05, detail: `${fx(m)} in inboard of BL ${fx(face)}` }; } }],
  'LEZ-74-130': [{ id: 'X1', with: 'LEZ-71-210 rev B solid (P-lead terminal posts)', feature: 'left', what: 'Each P-lead end on a magneto primitive of the released solid', check: () => { const mag = enginePrims().filter((p) => p.feat === 'mag'), d = RUNS['LEZ-74-130'].map((r) => Math.max(0, R.clearTo([R.ptsOf(r).at(-1), R.ptsOf(r).at(-1).map((v) => v + 1e-6)], 0, mag).d)); return { ok: Math.max(...d) <= 0.01, detail: `${d.map((v) => fx(v, 3)).join(' / ')} in` }; } }],
  'LEZ-74-110': [{ id: 'X1', with: 'LEZ-71-210 rev B solid (harness caps)', feature: 'top', what: 'Each lead starts on a magneto cap of the released solid', check: () => { const mag = enginePrims().filter((p) => p.feat === 'mag'), d = RUNS['LEZ-74-110'].map((r) => Math.max(0, R.clearTo([R.ptsOf(r)[0], R.ptsOf(r)[0].map((v) => v + 1e-6)], 0, mag).d)); return { ok: Math.max(...d) <= 0.01, detail: `${d.length} leads, worst ${fx(Math.max(...d), 3)} in` }; } }],
  'LEZ-71-210': [{ id: 'X1', with: 'LEZ-78-110 SCAT and LEZ-71-251 air box (block G)', feature: 'carb', what: 'Rev B carburettor arms and pivot bosses ≥ 0.25 in from the SCAT and the air box (its carburettor adapter excepted: the designed mate on the flange)', check: () => {
    const arms = enginePrims().filter((p) => p.feat === 'carb' && (p.t === 'box' ? Math.min(...p.d) <= 0.2 : p.r <= 0.26)), w = { d: Infinity, at: null };   // the rev B arm plates and pivot bosses, not the carburettor envelope (which sits on the adapter)
    for (const p of arms) { const q = p.t === 'box' ? boxSeg(p) : { pts: [p.a, p.b], r: p.r }; for (const o of [...HOT(), ...BOX().filter((b) => !/adapter/.test(b.feat))]) { const c = R.clearTo(q.pts, q.r, [o]); if (c.d < w.d) { w.d = c.d; w.at = o.feat; } } }
    return { ok: w.d >= 0.25, detail: `${fx(w.d)} in to ${w.at}` }; } }],
};
const DEFS_BY_PN = { 'LEZ-76-110': CABLE_DEF, 'LEZ-74-100': KEY_DEF, 'LEZ-77-100': GEA_DEF, 'LEZ-77-120': MANI_DEF, 'LEZ-77-130': FFT_DEF, 'LEZ-76-100': QUAD_DEF, 'LEZ-74-130': PLEAD_DEF, 'LEZ-74-110': HARN_DEF, 'LEZ-71-210': ENG_DEF };
for (const [pn, list] of Object.entries(ADD)) { const d = DEFS_BY_PN[pn]; for (const i of list) { const k = d.interfaces.findIndex((q) => q.id === i.id); if (k >= 0) d.interfaces[k] = i; else d.interfaces.push(i); } }

// revisions for the phase-2 changes
QUAD_DEF.rev = 'B';
QUAD_DEF.revs = [...QUAD_DEF.revs, { rev: 'B', date: DATE, short: 'Pivot lowered, longer cable arms', change: `ICD phase 2: the pivot 0.05 in lower (WL ${LY.QD.pivot[2]}; the side plates' top stays 0.25 in under the console, block B) so the pivot hole's edge distance is ${fx((LY.QD.plate.wl[1] - LY.QD.pivot[2]) / LY.QD.piv.d)} D (was 1.12 D); the cable arms are sized for the cushion with the 15 % reserve (throttle ${LY.LEVER.throttle} in, mixture ${LY.LEVER.mixture} in).` }];
CABLE_DEF.rev = 'B';
CABLE_DEF.revs = [...CABLE_DEF.revs, { rev: 'B', date: DATE, short: 'Conduit heads on the longer quadrant arms', change: `ICD phase 2: the throttle and mixture heads follow the quadrant's rev B arms (${LY.LEVER.throttle} / ${LY.LEVER.mixture} in). The carb-heat landing on LEZ-71-251 rev B and the SCAT (LEZ-78-110 rev C) clearance are open (ICD H-O1).` }];
