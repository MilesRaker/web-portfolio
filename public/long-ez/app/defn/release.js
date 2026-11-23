// Release audit for parts with a definition record. A released part fails if any field of the definition standard is
// short, if its solid is stale against the model or measures differently from the record (and so from the drawing,
// which is drawn from the record), if a check falls below zero or rests on an ASSUMED input, if a design rule or an
// interface misses, or if the computed mass disagrees with the solid. Runs in the explorer and in tests/audit.mjs.
import { LWA_DEF, lwaParams, lwaExpect } from './lwa_plate.js';
import { CLV_DEF, clvParams, clvExpect } from './clevis_block.js';
import { CS_DEF, csParams, csExpect, csMassOf, csBookMass } from './cs_spar.js';
import { MTB_DEF, mtbParams, mtbExpect } from './mount_bracket.js';
import { DRG_DEF, drgParams, drgExpect } from './drag_fitting.js';
import { ATTACH } from '../parts/wp13_airframe_joints.js';
import { MOUNT } from '../parts/wp1_powerplant.js';
import { GEO, CS_FIT, withAnalysisMemo } from '../structures.js';
import { WA_DEF, waParams } from './wing_attach.js';
import { DA_DEF, daParams, daExpect } from './drag_angle.js';
import { WP_DEF, wpExpect, wpMassOf, wpBookMass } from './wing_panel.js';
import { wpParams } from '../parts/wp17_wing_panel.js';
import { WL_DEF, wlExpect, wlMassOf, wlBookMass } from './winglet.js';
import { wlParams } from '../parts/wp18_winglet.js';
import { AIL, ELV } from './ctl_surface.js';
import { JUT_DEF, jutExpect } from './jutout.js';
import { jutParams, jutMassOf } from '../parts/wp20_jutout.js';
import { RJ_DEF, rjParams } from './root_joint.js';
import { SK_DEF, skExpect, skMassOf, skBookMass } from './strake.js';
import { strakeParams } from '../parts/wp21_strake.js';
import { LAP_DEF, lapExpect } from './strake_lap.js';
import { lapParams, lapMassOf } from '../parts/wp21_strake.js';
import { MNT_DEF, mntParams, mntExpect } from './engine_mount.js';
import { UPK_DEF, upkParams, upkExpect } from './upper_pickup.js';
import { CN_DEF, cnExpect, cnMassOf, cnBookMass } from './canard.js';
import { cnParams } from '../parts/wp24_canard.js';
import { F22_DEF, f22ParamsNow, f22Expect, f22MassOf, f22BookMass } from './f22.js';
import { FUS_DEF, fusExpect, fusMassOf, fusBookMass } from './fuselage.js';
import { fusParams } from '../parts/wp26_fuselage.js';
import * as BLK_A from './blocks/a_airframe.js';
import * as BLK_B from './blocks/b_cockpit.js';
import * as BLK_C from './blocks/c_controls.js';
import * as BLK_D from './blocks/d_maingear.js';
import * as BLK_E from './blocks/e_nosegear.js';
import * as BLK_F from './blocks/f_fuel.js';
import * as BLK_G from './blocks/g_powerplant.js';
import * as BLK_H from './blocks/h_engsys.js';
import * as BLK_I from './blocks/i_electrical.js';
import * as BLK_J from './blocks/j_avionics.js';
import * as BLK_P from './blocks/p_prepreg.js';
import { applyPrepregRevs } from './revs_prepreg.js';
import { applyRevs } from './revs_slab.js';
import { applyA1 } from './revs_a1.js';
import { applyFlap } from './revs_flap.js';
import { applyRudder } from './revs_rudder.js';
import { applyRudLink } from './revs_rudlink.js';
import { applyRudBal } from './revs_rudbal.js';
import { applyGeom1 } from './revs_geom1.js';
import { applySeat1 } from './revs_seat1.js';
import { applySeat2 } from './revs_seat2.js';
import { applySeat3 } from './revs_seat3.js';
import { applyOcc12 } from './revs_occ12.js';
import { freezeRevs } from './rev_freeze.js';
import { applyInteg } from './revs_integ.js';
import { applyStandIn } from './standin.js';
import { applyOccupant } from './revs_occupant.js';
import './integ_revs.js';   // the integration's rev entries (fills INTEG)
import { paramHash } from './util.js';
import { solidRef } from './solid_ref.js';   // solids by reference: meshes load on demand
const LWA_SOLID = solidRef('lwa_plate', 'LWA_SOLID');
const CLV_SOLID = solidRef('clevis_block', 'CLV_SOLID');
const CS_SOLID = solidRef('cs_spar', 'CS_SOLID');
const MTB_SOLID = solidRef('mount_bracket', 'MTB_SOLID');
const DRG_SOLID = solidRef('drag_fitting', 'DRG_SOLID');
const DA_SOLID = solidRef('drag_angle', 'DA_SOLID');
const WP_SOLID = solidRef('wing_panel', 'WP_SOLID');
const WL_SOLID = solidRef('winglet', 'WL_SOLID');
const ELV_SOLID = solidRef('elevator', 'ELV_SOLID');
const AIL_SOLID = solidRef('aileron', 'AIL_SOLID');
const JUT_SOLID = solidRef('jutout', 'JUT_SOLID');
const SK_SOLID = solidRef('strake', 'SK_SOLID');
const LAP_SOLID = solidRef('strake_lap', 'LAP_SOLID');
const MNT_SOLID = solidRef('engine_mount', 'MNT_SOLID');
const UPK_SOLID = solidRef('upper_pickup', 'UPK_SOLID');
const CN_SOLID = solidRef('canard', 'CN_SOLID');
const F22_SOLID = solidRef('f22', 'F22_SOLID');
const FUS_SOLID = solidRef('fuselage', 'FUS_SOLID');

/** every part with a definition record: the record, its solid, its parameters and how the solid is measured back;
 *  vMid: depth of the part's mid-plane above its bottom face (in), for placing the solid on its pin */
export const DEFS = {
  'LEZ-57-142': { def: LWA_DEF, solid: LWA_SOLID, params: lwaParams, hash: paramHash, expect: lwaExpect, vMid: (p) => p.t / 2 },
  'LEZ-57-143': { def: CLV_DEF, solid: CLV_SOLID, params: clvParams, hash: paramHash, expect: clvExpect, vMid: (p) => p.H / 2 },
  // a laminate: mass from region volumes × densities, and cross-checked against the ply book
  'LEZ-57-140': { def: CS_DEF, solid: CS_SOLID, params: csParams, hash: paramHash, expect: csExpect, book: 'csSpar', laminate: true,
    massOf: (m) => csMassOf(m.volumes || {}), massBook: () => { const b = csBookMass(); return b.lam + b.core; } },
  // placed by its own frame: x across leg A (+ toward the free edge, outboard), y aft of the firewall, z up from the spar's lower face
  'LEZ-71-223': { def: MTB_DEF, solid: MTB_SOLID, params: mtbParams, hash: paramHash, expect: mtbExpect,
    place: () => ['FBL', 'FBR'].map((n) => { const y = MOUNT.nodes[n][1], o = Math.sign(y); return { sx: o, x: y, y: CS_FIT.L, z: GEO.firewall }; }) },
  'LEZ-57-141': { def: DRG_DEF, solid: DRG_SOLID, params: drgParams, hash: paramHash, expect: drgExpect,
    place: () => [-1, 1].map((sg) => ({ sx: sg, x: sg * ATTACH.drag[1], y: CS_FIT.L, z: GEO.csSpar.s + GEO.csSpar.width / 2 })) },
  // the outer wing panel: a laminate lofted by span segment, right and left (mirrored) in its own model frame
  'LEZ-57-110': { def: WP_DEF, solid: WP_SOLID, params: wpParams, hash: paramHash, expect: wpExpect, book: 'wing', laminate: true,
    massOf: (m) => wpMassOf(m.volumes || {}), massBook: wpBookMass, place: () => [1, -1].map((sx) => ({ sx, x: 0, y: 0, z: 0 })) },
  // the wing drag angle: own frame x spanwise from the bolt, y aft, z up from leg A's underside (on the doubler)
  'LEZ-57-144': { def: DA_DEF, solid: DA_SOLID, params: daParams, hash: paramHash, expect: daExpect,
    place: () => [-1, 1].map((sg) => ({ sx: sg, x: sg * ATTACH.drag[1], y: ATTACH.zLo, z: ATTACH.drag[0] })) },
  // the winglet: a laminate lofted by segment in its own section planes, in the wing panel's frame; right and left (mirrored)
  'LEZ-57-130': { def: WL_DEF, solid: WL_SOLID, params: wlParams, hash: paramHash, expect: wlExpect, book: 'winglet', laminate: true,
    massOf: (m) => wlMassOf(m.volumes || {}), massBook: wlBookMass, place: () => [1, -1].map((sx) => ({ sx, x: 0, y: 0, z: 0 })) },
  // control surfaces: lofted in BL planes in the wing panel's frame; right and left (mirrored)
  'LEZ-57-191': { def: AIL.def, solid: AIL_SOLID, params: AIL.params, hash: paramHash, expect: AIL.expect, book: 'aileron', laminate: true,
    massOf: (m) => AIL.massOf(m.volumes || {}), massBook: AIL.bookMassEach, place: () => [1, -1].map((sx) => ({ sx, x: 0, y: 0, z: 0 })) },
  // the wing-root jut-out: a laminate system part lofted in FS planes, in the wing panel's frame; right and left (mirrored)
  'LEZ-57-116': { def: JUT_DEF, solid: JUT_SOLID, params: jutParams, hash: paramHash, expect: jutExpect, laminate: true,
    massOf: (m) => jutMassOf(m.volumes || {}), place: () => [1, -1].map((sx) => ({ sx, x: 0, y: 0, z: 0 })) },
  'LEZ-57-152': { def: RJ_DEF, solid: null, install: true, params: rjParams, hash: paramHash, shows: ['LEZ-57-142', 'LEZ-57-143'],
    massOf: () => RJ_DEF.hardware.reduce((a, l) => a + l.qty * l.each, 0) },
  'LEZ-57-180': { def: SK_DEF, solid: SK_SOLID, params: strakeParams, hash: paramHash, expect: skExpect, book: 'strake', laminate: true,
    massOf: (m) => skMassOf(m.volumes || {}), massBook: skBookMass, place: () => [1, -1].map((sx) => ({ sx, x: 0, y: 0, z: 0 })) },
  'LEZ-57-151': { def: LAP_DEF, solid: LAP_SOLID, params: lapParams, hash: paramHash, expect: lapExpect, laminate: true,
    massOf: (m) => lapMassOf(m.volumes || {}), place: () => [1, -1].map((sx) => ({ sx, x: 0, y: 0, z: 0 })) },
  // the engine mount: tubes node to node in the aircraft frame (x = BL, y = FS, z = WL)
  'LEZ-71-220': { def: MNT_DEF, solid: MNT_SOLID, params: mntParams, hash: paramHash, expect: mntExpect, massOf: (m) => m.volume * 0.283, place: () => [{ sx: 1, x: 0, y: 0, z: 0 }] },
  // upper pick-up: own frame x lateral (+ outboard), y aft of the firewall, z up from the bolt axis
  'LEZ-71-222': { def: UPK_DEF, solid: UPK_SOLID, params: upkParams, hash: paramHash, expect: upkExpect, massOf: (m) => (m.volumes?.fitting ?? 0) * 0.283 + (m.volumes?.back ?? 0) * 0.098,
    place: () => ['FTL', 'FTR'].map((n) => { const q = MOUNT.nodes[n]; return { sx: Math.sign(q[1]), x: q[1], y: q[2], z: GEO.firewall }; }) },
  // the canard: the right half in BL planes, mirrored for the left
  'LEZ-55-120': { def: CN_DEF, solid: CN_SOLID, params: cnParams, hash: paramHash, expect: cnExpect, book: 'canard', laminate: true,
    massOf: (m) => cnMassOf(m.volumes || {}), massBook: cnBookMass, place: () => [1, -1].map((sx) => ({ sx, x: 0, y: 0, z: 0 })) },
  'LEZ-55-192': { def: ELV.def, solid: ELV_SOLID, params: ELV.params, hash: paramHash, expect: ELV.expect, book: 'elevator', laminate: true,
    massOf: (m) => ELV.massOf(m.volumes || {}), massBook: ELV.bookMassEach, place: () => [1, -1].map((sx) => ({ sx, x: 0, y: 0, z: 0 })) },
  // fuselage shell: both halves of the ring lofted in FS planes, in place
  'LEZ-53-150': { def: FUS_DEF, solid: FUS_SOLID, params: fusParams, hash: paramHash, expect: fusExpect, book: 'fuselage', laminate: true,
    massOf: (m) => fusMassOf(m.volumes || {}), massBook: fusBookMass, place: () => [{ sx: 1, x: 0, y: 0, z: 0 }] },
  // bulkhead F22: aircraft frame, in place
  'LEZ-53-160': { def: F22_DEF, solid: F22_SOLID, params: f22ParamsNow, hash: paramHash, expect: f22Expect, book: 'F22', laminate: true,
    massOf: (m) => f22MassOf(m.volumes || {}), massBook: f22BookMass, place: () => [{ sx: 1, x: 0, y: 0, z: 0 }] },
  // an installation: no solid of its own; shows the detail parts' solids it joins
  'LEZ-57-145': { def: WA_DEF, solid: null, install: true, params: waParams, hash: paramHash, shows: ['LEZ-57-143', 'LEZ-57-142', 'LEZ-57-141'],
    massOf: () => WA_DEF.hardware.reduce((a, l) => a + l.qty * l.each, 0) },
};
for (const B of [BLK_A, BLK_B, BLK_C, BLK_D, BLK_E, BLK_F, BLK_G, BLK_H, BLK_I, BLK_J, BLK_P]) Object.assign(DEFS, B.DEFS);   // block records
applyRevs(DEFS);   // final integration: the panel rev C fix's revisions to the other parts (revs_slab.js)
applyInteg(DEFS);   // source-audit integration revs, then the rev lists renumbered at merge (revs_integ.js)
applyPrepregRevs(DEFS);   // block P: the prepreg conversion's rev on every composite record (revs_prepreg.js)
applyStandIn(DEFS);   // 2026-11-20: stand-in sourcing estimates on the twelve ply-book laminates, quotes requested (standin.js)
applyOccupant(DEFS);   // occupant reach and clearance checks, open with the cockpit geometry (revs_occupant.js, 2026-11-20), last
applyA1(DEFS);   // 2026-11-21: overall length option A1, winglet sweep 37° → 27.16° and what follows (revs_a1.js)
applyFlap(DEFS);   // 2026-11-21: control-surface formula corrected, wing caps and root joint re-sized (revs_flap.js)
applyRudder(DEFS);   // 2026-11-21: DC-005 rudder 35 % chord, h 3–54 in, 30° travel (revs_rudder.js)
applyRudLink(DEFS);   // 2026-11-21: DC-005 linkage: set-back balance, 3/16 in cable, rudder stops (revs_rudlink.js)
applyRudBal(DEFS);    // 2026-11-21: DC-005 balance made buildable: NACA nose, discrete hinges, sourced values, mass balance (revs_rudbal.js)
applyGeom1(DEFS);     // 2026-11-22: small geometry fixes (canopy hinge, left console, nose-door brackets) (revs_geom1.js)
applySeat1(DEFS);     // 2026-11-22: front seat to the plans, 6 in forward at 45° (DC-006, revs_seat1.js)
applySeat2(DEFS);     // 2026-11-22: upper seat back and headrest to builders' photos, small-pilot cushion (DC-007, revs_seat2.js)
applySeat3(DEFS);     // 2026-11-22: seat on the belly, landing brake aft (DC-008, revs_seat3.js)
applyOcc12(DEFS);     // 2026-11-22: occupant posture model (DC-009, revs_occ12.js)
export const REV_FREEZE = freezeRevs(DEFS);   // last: old revisions keep the text they had when made (rev_frozen.js, tools/freeze_revs.mjs)
export const defOf = (pn) => DEFS[pn] || null;


/** solid against the record (and so against the drawing, which is drawn from the record) */
export function measureCheck(pn) {
  const D = DEFS[pn]; if (!D) return null;
  return D.install ? [] : D.expect(D.params(), D.solid.measured);
}

/** release audit: rows are the analysis check rows (R.rows); clashes from SYS.clashCheck(). Read-only, so the
 *  record functions' own analyses share one within the call (withAnalysisMemo; perf) */
export const releaseAudit = (pn, rows, clashes = []) => withAnalysisMemo(() => releaseAuditNow(pn, rows, clashes));
function releaseAuditNow(pn, rows, clashes) {
  const D = DEFS[pn]; if (!D) return null;
  const d = D.def, items = [];
  const it = (cat, ok, msg) => items.push({ cat, ok: !!ok, msg });
  if (D.install) {   // an installation: the hardware lines are the definition
    for (const l of d.hardware) it('hardware', l.std && l.qty > 0 && l.each > 0, `${l.qty} × ${l.std}: ${l.desc}`);
    const mH = D.massOf(); it('mass', Math.abs(mH - d.mass.each) / d.mass.each < 0.005, `Mass ${d.mass.each.toFixed(3)} lb in the record, ${mH.toFixed(3)} lb from the hardware lines`);
  } else {
  // stale solid
  const h = D.hash(D.params());
  it('solid', h === D.solid.hash, h === D.solid.hash ? `Solid built from the current model (parameters ${h}, ${D.solid.made})` : `Solid is stale: built from ${D.solid.hash}, the model is now ${h}; run cad/make_solids.sh`);
  for (const c of measureCheck(pn)) it('drawing', c.ok, `${c.what}: record ${c.want.toFixed(4)} in, solid ${Number.isFinite(c.got) ? c.got.toFixed(4) : 'missing'} in`);
  if (!D.solid.measured.volume) it('drawing', false, 'No solid built yet');
  // mass
  const mSolid = D.massOf ? D.massOf(D.solid.measured) : D.solid.measured.volume * d.material.density;
  it('mass', Math.abs(mSolid - d.mass.each) / d.mass.each < 0.005, `Mass ${d.mass.each.toFixed(3)} lb in the record, ${mSolid.toFixed(3)} lb from the solid`);
  if (D.massBook) { const mb = D.massBook(); it('mass', Math.abs(mb - mSolid) / mSolid < 0.02, `Ply book ${mb.toFixed(2)} lb (plies + core, before finish), solid ${mSolid.toFixed(2)} lb`); }
  }
  // checks: every row of the part, every case
  const mine = rows.filter((r) => d.checks.includes(r.id));
  const ids = [...new Set(mine.map((r) => r.id))];
  for (const id of d.checks) { const rs = mine.filter((r) => r.id === id); const min = rs.length ? Math.min(...rs.map((r) => r.ms)) : NaN;
    it('substantiation', rs.length && min >= 0, rs.length ? `${id}: lowest MS ${min >= 0 ? '+' : ''}${min.toFixed(2)} over ${rs.length} cases` : `${id}: no check rows`); }
  const assumed = [], bound = [];
  for (const r of mine) for (const [name, , , src] of (r.trace && r.trace.inputs) || []) {
    const s = String(src || '');
    if (/^ASSUMED/i.test(s)) assumed.push(`${r.id}: ${name}`); else if (/^BOUND/i.test(s)) bound.push(`${r.id}: ${name}`);
  }
  const uniq = (a) => [...new Set(a)];
  it('substantiation', !assumed.length, assumed.length ? `ASSUMED inputs on the load path: ${uniq(assumed).join('; ')}` : 'No ASSUMED input on the load path');
  void ids;
  // design rules and interfaces
  for (const r of d.rules) it('rules', r.v >= r.min - 1e-9, `${r.label}: ${r.v.toFixed(2)}`);
  for (const f of d.interfaces) { const c = f.check(); it('interfaces', c.ok, `${f.id} ${f.with}: ${c.detail}`); }
  const mineClash = clashes.filter((c) => c.part === pn || (pn === 'LEZ-57-142' && /LWA plate/.test(c.detail || '')) || (pn === 'LEZ-57-143' && /clevis block/.test(c.detail || '')));   // routes inside its keep-outs
  it('interfaces', !mineClash.length, mineClash.length ? `Clashes: ${mineClash.map((c) => c.detail).join('; ')}` : 'Clear of every route and keep-out');
  // completeness of the record
  const filled = [['identity', d.pn && d.rev && d.nha && d.title], ['material', d.material.spec && d.process.length], ...(D.laminate ? [['layup', d.features.some((f) => f.kind === 'layup')]] : []), ['tooling', d.tooling && d.tooling.text], ['sourcing', d.sourcing && d.sourcing.vendor && d.sourcing.cost != null]];
  for (const [k, v] of filled) it('record', v, `${k}: ${v ? 'filled' : 'empty'}`);
  const fails = items.filter((x) => !x.ok);
  return { pn, rev: d.rev, ok: !fails.length, items, fails, bound: uniq(bound) };
}
