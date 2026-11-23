// Block c_controls: definition records and drawing views for this block's parts. Owned by the block's agent.
// DEFS entries have the same shape as site/defn/release.js; VIEWS entries the same signature as site/defn/sheet.js (k, D).
import { STK_F, STK_R } from '../c27_sticks.js';
import { PROD, TT, BAL } from '../c27_pitch.js';
import { ROLLT, BEAM, AROD } from '../c27_roll.js';
import { PED, CAB, STOPS, TRIM } from '../c27_pedals.js';
import { LB_DEF, lbParams, lbExpect, lbMassOf, ACT, HAR } from '../c27_lb.js';
import { CI_DEF, ciParams } from '../c27_install.js';
import { primView, lbView, ciView } from '../c27_views.js';
import { paramHash } from '../util.js';
import { solidNS } from '../solid_ref.js';   // solids by reference: meshes load on demand
const SOL = solidNS('c27');

const one = () => [{ sx: 1, x: 0, y: 0, z: 0 }], two = () => [1, -1].map((sx) => ({ sx, x: 0, y: 0, z: 0 }));
const rec = (R, solid, place = one) => ({ def: R.def, solid, params: R.params, hash: paramHash, expect: R.expect, massOf: R.massOf, place });
export const DEFS = {
  'LEZ-27-100': { def: CI_DEF, solid: null, install: true, params: ciParams, hash: paramHash, shows: ['LEZ-27-110', 'LEZ-27-111', 'LEZ-27-120', 'LEZ-27-130', 'LEZ-27-140', 'LEZ-27-141', 'LEZ-27-142', 'LEZ-27-150'],
    massOf: () => CI_DEF.hardware.reduce((a, l) => a + l.qty * l.each, 0) },
  'LEZ-27-110': rec(STK_F, SOL.S110), 'LEZ-27-111': rec(STK_R, SOL.S111), 'LEZ-27-120': rec(PROD, SOL.S120), 'LEZ-27-130': rec(TT, SOL.S130), 'LEZ-27-135': rec(BAL, SOL.S135, two),
  'LEZ-27-140': rec(ROLLT, SOL.S140), 'LEZ-27-141': rec(BEAM, SOL.S141), 'LEZ-27-142': rec(AROD, SOL.S142, two), 'LEZ-27-150': rec(PED, SOL.S150), 'LEZ-27-151': rec(CAB, SOL.S151, two),
  'LEZ-27-160': rec(STOPS, SOL.S160), 'LEZ-27-165': rec(TRIM, SOL.S165), 'LEZ-27-171': rec(ACT, SOL.S171), 'LEZ-27-172': rec(HAR, SOL.S172),
  'LEZ-27-170': { def: LB_DEF, solid: SOL.S170, params: lbParams, hash: paramHash, expect: lbExpect, laminate: true, massOf: (m) => lbMassOf(m.volumes || {}), place: one },
};
export const VIEWS = Object.fromEntries([...Object.keys(DEFS).filter((pn) => !['LEZ-27-100', 'LEZ-27-170'].includes(pn)).map((pn) => [pn, primView(pn)]), ['LEZ-27-170', lbView], ['LEZ-27-100', ciView]]);

// memory-audit integration (2026-11-19): the block's new revisions
import { applyMemRevs } from '../revs_memaudit.js';
applyMemRevs(DEFS);
