// Block j_avionics: definition records and drawing views for this block's parts. Owned by the block's agent.
// DEFS entries have the same shape as site/defn/release.js; VIEWS entries the same signature as site/defn/sheet.js (k, D).
// Every J part is a set of primitives (cad/blkB_prims.py) placed in the aircraft frame; records in ../j_records.js.
import { paramHash } from '../util.js';
import { primsEntry } from '../blkB_common.js';
import { jParams, jRho } from '../../parts/wpJ1_avionics.js';
import { J_DEFS } from '../j_records.js';
import { VIEWS_J } from '../j_views.js';
import { solidRef } from '../solid_ref.js';   // solids by reference: meshes load on demand
const J_AXIS_SOLID = solidRef('j_axis', 'J_AXIS_SOLID');
const J_G5_SOLID = solidRef('j_g5', 'J_G5_SOLID');
const J_WARN_SOLID = solidRef('j_warn', 'J_WARN_SOLID');
const J_SWITCHES_SOLID = solidRef('j_switches', 'J_SWITCHES_SOLID');
const J_SHELF_SOLID = solidRef('j_shelf', 'J_SHELF_SOLID');
const J_GTX_SOLID = solidRef('j_gtx', 'J_GTX_SOLID');
const J_GSU_SOLID = solidRef('j_gsu', 'J_GSU_SOLID');
const J_GMU_SOLID = solidRef('j_gmu', 'J_GMU_SOLID');
const J_GTP_SOLID = solidRef('j_gtp', 'J_GTP_SOLID');
const J_GA35S_SOLID = solidRef('j_ga35s', 'J_GA35S_SOLID');
const J_GA35_SOLID = solidRef('j_ga35', 'J_GA35_SOLID');
const J_BLADE_SOLID = solidRef('j_blade', 'J_BLADE_SOLID');
const J_WHIP_SOLID = solidRef('j_whip', 'J_WHIP_SOLID');
const J_ELT_SOLID = solidRef('j_elt', 'J_ELT_SOLID');
const J_PITOT_SOLID = solidRef('j_pitot', 'J_PITOT_SOLID');
const J_PSLINES_SOLID = solidRef('j_pslines', 'J_PSLINES_SOLID');
const J_STATICS_SOLID = solidRef('j_statics', 'J_STATICS_SOLID');
const J_TEES_SOLID = solidRef('j_tees', 'J_TEES_SOLID');
const J_COM_SOLID = solidRef('j_com', 'J_COM_SOLID');
const J_COAX_SOLID = solidRef('j_coax', 'J_COAX_SOLID');
const J_ELTCOAX_SOLID = solidRef('j_eltcoax', 'J_ELTCOAX_SOLID');
const J_CONSOLE_SOLID = solidRef('j_console', 'J_CONSOLE_SOLID');
const J_MAGHARNESS_SOLID = solidRef('j_magharness', 'J_MAGHARNESS_SOLID');
const J_JACKS_SOLID = solidRef('j_jacks', 'J_JACKS_SOLID');

const D = Object.fromEntries(J_DEFS.map((d) => [d.pn, d]));
export const DEFS = {
  'LEZ-31-110': { ...primsEntry(D['LEZ-31-110'], J_AXIS_SOLID, () => jParams('LEZ-31-110'), jRho('LEZ-31-110')), hash: paramHash },
  'LEZ-31-130': { ...primsEntry(D['LEZ-31-130'], J_G5_SOLID, () => jParams('LEZ-31-130'), jRho('LEZ-31-130')), hash: paramHash },
  'LEZ-31-150': { ...primsEntry(D['LEZ-31-150'], J_WARN_SOLID, () => jParams('LEZ-31-150'), jRho('LEZ-31-150')), hash: paramHash },
  'LEZ-31-140': { ...primsEntry(D['LEZ-31-140'], J_SWITCHES_SOLID, () => jParams('LEZ-31-140'), jRho('LEZ-31-140')), hash: paramHash },
  'LEZ-31-160': { ...primsEntry(D['LEZ-31-160'], J_SHELF_SOLID, () => jParams('LEZ-31-160'), jRho('LEZ-31-160')), hash: paramHash, laminate: true },
  'LEZ-34-100': { ...primsEntry(D['LEZ-34-100'], J_GTX_SOLID, () => jParams('LEZ-34-100'), jRho('LEZ-34-100')), hash: paramHash },
  'LEZ-31-120': { ...primsEntry(D['LEZ-31-120'], J_GSU_SOLID, () => jParams('LEZ-31-120'), jRho('LEZ-31-120')), hash: paramHash },
  'LEZ-31-122': { ...primsEntry(D['LEZ-31-122'], J_GMU_SOLID, () => jParams('LEZ-31-122'), jRho('LEZ-31-122')), hash: paramHash },
  'LEZ-31-124': { ...primsEntry(D['LEZ-31-124'], J_GTP_SOLID, () => jParams('LEZ-31-124'), jRho('LEZ-31-124')), hash: paramHash },
  'LEZ-34-114': { ...primsEntry(D['LEZ-34-114'], J_GA35S_SOLID, () => jParams('LEZ-34-114'), jRho('LEZ-34-114')), hash: paramHash },
  'LEZ-34-112': { ...primsEntry(D['LEZ-34-112'], J_GA35_SOLID, () => jParams('LEZ-34-112'), jRho('LEZ-34-112')), hash: paramHash },
  'LEZ-34-110': { ...primsEntry(D['LEZ-34-110'], J_BLADE_SOLID, () => jParams('LEZ-34-110'), jRho('LEZ-34-110')), hash: paramHash },
  'LEZ-25-161': { ...primsEntry(D['LEZ-25-161'], J_WHIP_SOLID, () => jParams('LEZ-25-161'), jRho('LEZ-25-161')), hash: paramHash },
  'LEZ-25-160': { ...primsEntry(D['LEZ-25-160'], J_ELT_SOLID, () => jParams('LEZ-25-160'), jRho('LEZ-25-160')), hash: paramHash },
  'LEZ-34-120': { ...primsEntry(D['LEZ-34-120'], J_PITOT_SOLID, () => jParams('LEZ-34-120'), jRho('LEZ-34-120')), hash: paramHash },
  'LEZ-34-130': { ...primsEntry(D['LEZ-34-130'], J_PSLINES_SOLID, () => jParams('LEZ-34-130'), jRho('LEZ-34-130')), hash: paramHash },
  'LEZ-34-132': { ...primsEntry(D['LEZ-34-132'], J_STATICS_SOLID, () => jParams('LEZ-34-132'), jRho('LEZ-34-132')), hash: paramHash },
  'LEZ-34-135': { ...primsEntry(D['LEZ-34-135'], J_TEES_SOLID, () => jParams('LEZ-34-135'), jRho('LEZ-34-135')), hash: paramHash },
  'LEZ-23-110': { ...primsEntry(D['LEZ-23-110'], J_COM_SOLID, () => jParams('LEZ-23-110'), jRho('LEZ-23-110')), hash: paramHash },
  'LEZ-34-111': { ...primsEntry(D['LEZ-34-111'], J_COAX_SOLID, () => jParams('LEZ-34-111'), jRho('LEZ-34-111')), hash: paramHash },
  'LEZ-25-162': { ...primsEntry(D['LEZ-25-162'], J_ELTCOAX_SOLID, () => jParams('LEZ-25-162'), jRho('LEZ-25-162')), hash: paramHash },
  'LEZ-23-125': { ...primsEntry(D['LEZ-23-125'], J_CONSOLE_SOLID, () => jParams('LEZ-23-125'), jRho('LEZ-23-125')), hash: paramHash },
  'LEZ-31-121': { ...primsEntry(D['LEZ-31-121'], J_MAGHARNESS_SOLID, () => jParams('LEZ-31-121'), jRho('LEZ-31-121')), hash: paramHash },
  'LEZ-23-120': { ...primsEntry(D['LEZ-23-120'], J_JACKS_SOLID, () => jParams('LEZ-23-120'), jRho('LEZ-23-120')), hash: paramHash },
};
export const VIEWS = VIEWS_J;
