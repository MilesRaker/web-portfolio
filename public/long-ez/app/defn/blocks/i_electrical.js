// Block i_electrical: definition records and drawing views for this block's parts. Owned by the block's agent.
// DEFS entries have the same shape as site/defn/release.js; VIEWS entries the same signature as site/defn/sheet.js (k, D).
import { paramHash } from '../util.js';
import { primExpect, primMass } from '../d_prims.js';
import { RHO, KEY, PER_SET, hwMass } from '../../parts/wpI1_power.js';
import { BAT_DEF, MAS_DEF, BUS_DEF, GND_DEF, VR_DEF, K2_DEF, TIP_DEF, LDG_DEF, PWR_DEF, PNLH_DEF, FWDH_DEF, STRAP_DEF, CAB_DEF, TIPH_DEF, INST_DEF, SUP_DEF, CLIP_DEF } from '../i_defs.js';
import { VIEWS_I } from '../i_views.js';
import '../i_icd.js';   // phase-2 interface checks (final integration): appended to the records above
import { solidRef } from '../solid_ref.js';   // solids by reference: meshes load on demand
const BAT_SOLID = solidRef('i_battery', 'BAT_SOLID');
const MAS_SOLID = solidRef('i_master', 'MAS_SOLID');
const BUS_SOLID = solidRef('i_bus', 'BUS_SOLID');
const GND_SOLID = solidRef('i_ground', 'GND_SOLID');
const VR_SOLID = solidRef('i_vr', 'VR_SOLID');
const K2_SOLID = solidRef('i_k2', 'K2_SOLID');
const TIP_SOLID = solidRef('i_tips', 'TIP_SOLID');
const LDG_SOLID = solidRef('i_ldg', 'LDG_SOLID');
const PWRH_SOLID = solidRef('i_pwr_h', 'PWRH_SOLID');
const PNLH_SOLID = solidRef('i_pnl_h', 'PNLH_SOLID');
const FWDH_SOLID = solidRef('i_fwd_h', 'FWDH_SOLID');
const STRAP_SOLID = solidRef('i_strap', 'STRAP_SOLID');
const CAB_SOLID = solidRef('i_cables', 'CAB_SOLID');
const TIPH_SOLID = solidRef('i_tip_h', 'TIPH_SOLID');

const one = () => [{ sx: 1, x: 0, y: 0, z: 0 }];
/** bought-in envelopes and swept harnesses: primitives (cad/d_prims.py) in the aircraft frame; mass from the solid's volumes */
const prim = (def, solid) => { const k = KEY[def.pn]; return { def, solid, params: () => def.params, hash: paramHash, expect: (p, m) => primExpect(p, m), massOf: (m) => primMass(m.volumes || {}, RHO[k]) / (PER_SET[k] || 1), place: one }; };
/** installations: no solid of their own; the hardware lines are the definition */
const inst = (def, shows) => ({ def, solid: null, install: true, shows, params: () => def.params, hash: paramHash, massOf: () => hwMass(def.hardware) });
export const DEFS = {
  'LEZ-24-110': prim(BAT_DEF, BAT_SOLID),
  'LEZ-24-120': prim(MAS_DEF, MAS_SOLID),
  'LEZ-24-130': prim(BUS_DEF, BUS_SOLID),
  'LEZ-24-140': prim(GND_DEF, GND_SOLID),
  'LEZ-24-150': prim(VR_DEF, VR_SOLID),
  'LEZ-80-100': prim(K2_DEF, K2_SOLID),
  'LEZ-33-100': prim(TIP_DEF, TIP_SOLID),
  'LEZ-33-120': prim(LDG_DEF, LDG_SOLID),
  'LEZ-24-160': prim(PWR_DEF, PWRH_SOLID),
  'LEZ-24-161': prim(PNLH_DEF, PNLH_SOLID),
  'LEZ-24-162': prim(FWDH_DEF, FWDH_SOLID),
  'LEZ-24-165': prim(STRAP_DEF, STRAP_SOLID),
  'LEZ-80-110': prim(CAB_DEF, CAB_SOLID),
  'LEZ-33-110': prim(TIPH_DEF, TIPH_SOLID),
  'LEZ-24-100': inst(INST_DEF, ['LEZ-24-110', 'LEZ-24-120', 'LEZ-24-130', 'LEZ-24-140', 'LEZ-24-150', 'LEZ-80-100']),
  'LEZ-20-100': inst(SUP_DEF, ['LEZ-24-160', 'LEZ-24-161', 'LEZ-24-162', 'LEZ-80-110']), 'LEZ-20-110': inst(CLIP_DEF, ['LEZ-33-110']),
};
export const VIEWS = VIEWS_I;
