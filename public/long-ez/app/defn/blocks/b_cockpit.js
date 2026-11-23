// Block b_cockpit: definition records and drawing views for this block's parts. Owned by the block's agent.
// DEFS entries have the same shape as site/defn/release.js; VIEWS entries the same signature as site/defn/sheet.js (k, D).
import { paramHash } from '../util.js';
import { CAN_DEF, canExpect, canMassOf } from '../blkB_canopy.js';
import { canParams } from '../../parts/wpB1_canopy.js';
import { VIEWS_B } from '../blkB_views.js';
import { HNG_DEF, STR_DEF, CBL_DEF, HW_RHO, primsEntry } from '../blkB_canopy_hw.js';
import { hingeParams, strutParams, cableParams } from '../../parts/wpB2_canopy_hw.js';
import { latchDef, LP, LRHO, LATCH_INSTALL } from '../blkB_latch.js';
import { PNL_DEF } from '../blkB_panel.js';
import { panelParams, PNL_RHO } from '../../parts/wpB3_panel.js';
import { CABIN_DEFS, CP, RHOS } from '../blkB_cabin.js';
import { solidRef } from '../solid_ref.js';   // solids by reference: meshes load on demand
const CAN_SOLID = solidRef('blkB_canopy', 'CAN_SOLID');
const HNG_SOLID = solidRef('blkB_hinge', 'HNG_SOLID');
const STR_SOLID = solidRef('blkB_strut', 'STR_SOLID');
const CBL_SOLID = solidRef('blkB_cable', 'CBL_SOLID');
const HDL_SOLID = solidRef('blkB_handle', 'HDL_SOLID');
const ROD_SOLID = solidRef('blkB_rod', 'ROD_SOLID');
const HOOK_SOLID = solidRef('blkB_hook', 'HOOK_SOLID');
const SC1_SOLID = solidRef('blkB_sc1', 'SC1_SOLID');
const DOOR_SOLID = solidRef('blkB_door', 'DOOR_SOLID');
const PNL_SOLID = solidRef('blkB_panel', 'PNL_SOLID');
const FLR_SOLID = solidRef('blkB_floor', 'FLR_SOLID');
const CON_SOLID = solidRef('blkB_console', 'CON_SOLID');
const SEATF_SOLID = solidRef('blkB_seatF', 'SEATF_SOLID');
const SEATR_SOLID = solidRef('blkB_seatR', 'SEATR_SOLID');
const HAR_SOLID = solidRef('blkB_harness', 'HAR_SOLID');
const BAG_SOLID = solidRef('blkB_baggage', 'BAG_SOLID');
const UPH_SOLID = solidRef('blkB_uphol', 'UPH_SOLID');

const here = () => [{ sx: 1, x: 0, y: 0, z: 0 }];
export const DEFS = {
  // canopy: frame and bubble lofted in FS planes, in place
  'LEZ-56-100': { def: CAN_DEF, solid: CAN_SOLID, params: canParams, hash: paramHash, expect: canExpect, laminate: true, massOf: (m) => canMassOf(m.volumes || {}), place: here },
  // bought-in canopy hardware: vendor envelopes with their mounting features, in place
  'LEZ-56-110': { ...primsEntry(HNG_DEF, HNG_SOLID, hingeParams, HW_RHO.hinge), hash: paramHash },
  'LEZ-56-120': { ...primsEntry(STR_DEF, STR_SOLID, strutParams, HW_RHO.strut), hash: paramHash },
  'LEZ-56-130': { ...primsEntry(CBL_DEF, CBL_SOLID, cableParams, HW_RHO.cable), hash: paramHash },
  // canopy latch: detail parts from their own primitives, in place; the installation shows them
  'LEZ-52-110': { ...primsEntry(latchDef('LEZ-52-110'), HDL_SOLID, LP.handle, LRHO), hash: paramHash },
  'LEZ-52-120': { ...primsEntry(latchDef('LEZ-52-120'), ROD_SOLID, LP.rod, LRHO), hash: paramHash },
  'LEZ-52-130': { ...primsEntry(latchDef('LEZ-52-130'), HOOK_SOLID, LP.hook, LRHO), hash: paramHash },
  'LEZ-52-140': { ...primsEntry(latchDef('LEZ-52-140'), SC1_SOLID, LP.sc1, LRHO), hash: paramHash },
  'LEZ-52-150': { ...primsEntry(latchDef('LEZ-52-150'), DOOR_SOLID, LP.door, LRHO), hash: paramHash },
  'LEZ-52-100': { def: LATCH_INSTALL, solid: null, install: true, params: () => LATCH_INSTALL.params, hash: paramHash, shows: ['LEZ-52-130', 'LEZ-52-120', 'LEZ-52-110', 'LEZ-52-140', 'LEZ-52-150'],
    massOf: () => LATCH_INSTALL.hardware.reduce((a, l) => a + l.qty * l.each, 0) },
  // instrument panel and glareshield: layers and hood extruded along FS, in place
  'LEZ-31-100': { ...primsEntry(PNL_DEF, PNL_SOLID, panelParams, PNL_RHO), hash: paramHash, laminate: true },
  // cockpit interior, in place
  'LEZ-25-100': { ...primsEntry(CABIN_DEFS['LEZ-25-100'], FLR_SOLID, CP.floor, RHOS.floor), hash: paramHash, laminate: true },
  'LEZ-25-110': { ...primsEntry(CABIN_DEFS['LEZ-25-110'], CON_SOLID, CP.console, RHOS.console), hash: paramHash, laminate: true },
  'LEZ-25-120': { ...primsEntry(CABIN_DEFS['LEZ-25-120'], SEATF_SOLID, CP.front, RHOS.seat), hash: paramHash },
  'LEZ-25-121': { ...primsEntry(CABIN_DEFS['LEZ-25-121'], SEATR_SOLID, CP.rear, RHOS.seat), hash: paramHash },
  'LEZ-25-130': { ...primsEntry(CABIN_DEFS['LEZ-25-130'], HAR_SOLID, CP.harness, RHOS.harness), hash: paramHash },
  'LEZ-25-140': { ...primsEntry(CABIN_DEFS['LEZ-25-140'], BAG_SOLID, CP.baggage, RHOS.baggage), hash: paramHash },
  'LEZ-25-150': { ...primsEntry(CABIN_DEFS['LEZ-25-150'], UPH_SOLID, CP.upholstery, RHOS.upholstery), hash: paramHash },
};
export const VIEWS = VIEWS_B;

// memory-audit integration (2026-11-19): the block's new revisions
import { applyMemRevs } from '../revs_memaudit.js';
applyMemRevs(DEFS);
