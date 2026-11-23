// Block f_fuel: definition records and drawing views for this block's parts. Owned by the block's agent.
// DEFS entries have the same shape as site/defn/release.js; VIEWS entries the same signature as site/defn/sheet.js (k, D).
import { paramHash } from '../util.js';
import { srcAudit } from '../src_audit.js';
import { primsExpect } from '../g_prims.js';
import { primView } from '../g_views.js';
import * as R from '../f_fuel.js';
import { fParams, fMassOf } from '../f_fuel.js';
import { solidRef } from '../solid_ref.js';   // solids by reference: meshes load on demand
const F110_SOLID = solidRef('f_sump', 'F110_SOLID');
const F120_SOLID = solidRef('f_feed', 'F120_SOLID');
const F130_SOLID = solidRef('f_valve', 'F130_SOLID');
const F135_SOLID = solidRef('f_drive', 'F135_SOLID');
const F140_SOLID = solidRef('f_pump', 'F140_SOLID');
const F150_SOLID = solidRef('f_line150', 'F150_SOLID');
const F155_SOLID = solidRef('f_union', 'F155_SOLID');
const F160_SOLID = solidRef('f_vent', 'F160_SOLID');
const F165_SOLID = solidRef('f_ventfit', 'F165_SOLID');
const F170_SOLID = solidRef('f_filler', 'F170_SOLID');
const F180_SOLID = solidRef('f_qdrain', 'F180_SOLID');
const F185_SOLID = solidRef('f_drainline', 'F185_SOLID');
const F190_SOLID = solidRef('f_gauge', 'F190_SOLID');
const F731_SOLID = solidRef('f_gasc', 'F731_SOLID');
const F732_SOLID = solidRef('f_hoses', 'F732_SOLID');
const F733_SOLID = solidRef('f_primer', 'F733_SOLID');   // integration 2026-11-19: the engine primer system

const AC = [{ sx: 1, x: 0, y: 0, z: 0 }];   // solids built in the aircraft frame, in place (both sides drawn where there are two)
const prim = (def, solid) => ({ def, solid, params: fParams(def.pn), hash: paramHash, expect: (p, m) => primsExpect(p, m), massOf: fMassOf(def.pn), place: () => AC });
export const DEFS = {
  'LEZ-28-100': { def: R.INST_DEF, solid: null, install: true, params: () => R.INST_DEF.params, hash: paramHash, shows: ['LEZ-28-110', 'LEZ-28-120', 'LEZ-28-130', 'LEZ-28-135', 'LEZ-28-140', 'LEZ-28-150', 'LEZ-28-155', 'LEZ-73-100', 'LEZ-73-130'], massOf: () => R.INST_DEF.hardware.reduce((a, l) => a + l.qty * l.each, 0) },
  'LEZ-28-110': prim(R.SUMP_DEF, F110_SOLID), 'LEZ-28-120': prim(R.FEED_DEF, F120_SOLID), 'LEZ-28-130': prim(R.VALVE_DEF, F130_SOLID), 'LEZ-28-135': prim(R.DRIVE_DEF, F135_SOLID), 'LEZ-28-140': prim(R.PUMP_DEF, F140_SOLID),
  'LEZ-28-150': prim(R.L150_DEF, F150_SOLID), 'LEZ-28-155': prim(R.UNION_DEF, F155_SOLID), 'LEZ-28-160': prim(R.VENT_DEF, F160_SOLID), 'LEZ-28-165': prim(R.VFIT_DEF, F165_SOLID),
  'LEZ-28-170': prim(R.CAP_DEF, F170_SOLID), 'LEZ-28-180': prim(R.QDR_DEF, F180_SOLID), 'LEZ-28-185': prim(R.DRL_DEF, F185_SOLID), 'LEZ-28-190': prim(R.GAUGE_DEF, F190_SOLID),
  'LEZ-73-100': prim(R.GASC_DEF, F731_SOLID), 'LEZ-73-110': prim(R.HOSE_DEF, F732_SOLID), 'LEZ-73-130': prim(R.PRIMER_DEF, F733_SOLID),
};
// source audit 2026-11-19: one new rev per changed part (docs/blocks/f_fuel.md "Source audit")
srcAudit(DEFS, {
"LEZ-28-100": [
"Integral tanks: 23.965(a)(2) pressure, 23.965(c) vibration test, 23.963(c) access covers, 23.967(b) drains; fuel densities",
"The strakes are integral tanks (pre-Amendment 23-64 Part 23, CFR 2010 text): the 2 psi test (23.965(a)(3), supported nonmetallic tanks) is replaced by the pressure at the maximum limit acceleration with a full tank at the critical 6.08 lb/gal (tank-press: 0.80 psi at +4.4 g, 0.32 psi at -1.76 g on the upper skin, 1.73 psi landing 3.0 g with a 0.25 drag reaction BOUND; test 1.95 psi), handed to the structures agent as a distributed load (docs/icd/f_fuel.md); the 23.965(c) vibration test (25 h, 1/32 in, 2/3 water, 2,520 cpm); ten lower-skin access covers Ø 5.5 over Ø 4.0 openings (tank-access, reach ≤ 24 in, MS +0.27); drains and vents for the wedge compartments and the aft fuselage bay (tank-adj). Flow and head now use the lightest 100LL (5.77 lb/gal, CRC 2025 survey); the weight and balance keeps 6.0."
],
"LEZ-28-130": [
"Source audit: Andair FS20X2F, cost",
"Valve named: Andair FS20X2F (LEFT / RIGHT / OFF, 90° between, top button to select OFF); cost 716 (was 320, typed)."
],
"LEZ-28-140": [
"Facet 40106 named, 3 in envelope, 1/8 NPT ports",
"Pump named in the SCD: Facet 40106 (4.0 psi minimum / 7.0 maximum, 32 gph); the maker states its pumps are not for aircraft use (accepted by Miles, 2026-11-19). Envelope Ø 3.0 × 4.0 port to port (the 3 in cube plus AN816-6-2D adapters on the 1/8-27 NPT ports; was Ø 1.7, 1/4 NPT). fuel-press uses the 7.0 psi maximum (MS +0.14); cost 82.75 (40105 price, same family)."
],
"LEZ-28-170": [
"Usher UD-3-F cap: Ø 3.75 ring on the crown, vendor mass",
"Cap named: Usher UD-3-F with flat adaptor, 2 in opening, Ø 3-3/4 ring (was Ø 3.0), 0.375 lb each (vendor, replaces the solid estimate); the ring top follows the crown under the OML; cost 109.85 (was 90)."
],
"LEZ-28-180": [
"Saf-Air SA18 flush drains",
"Drain named: Saf-Air SA18 (F391-18) flush 1/8 NPT (CAV-110 is the protruding push type); cost 63.85 (was 25)."
],
"LEZ-73-100": [
"Andair GAS375-M, mass, riser port",
"Gascolator named: Andair GAS375-M (152 g, 0.335 lb without fittings; was 0.8 lb typed); its 0.22 psi at 20 gph drop (K ≈ 1,100) is in fuel-flow (MS +1.04); cost 597. New RISER / HOSE ports at the riser clip on the bracket."
],
"LEZ-73-110": [
"124-6J hose (4.0 in bend), rigid riser re-route",
"The Stratoflex 124-6J bend radius is 4.00 in (was 2.0 typed): with the 4.0 in chord to the engine pump the hose could not bend at 4 in with 0.5 in slack (fuel-hose MS -0.34). A 3/8 × 0.035 5052-O riser now climbs the firewall aft face from the gascolator outlet to BL 7.0, WL 36.0, and the hose spans 5.9 in from there (radius 4.69 in; fuel-hose MS +0.09 on slack). Hose mass 0.234 lb/ft (was 0.09)."
]
});
const SIDE = { u: [1, 1], v: [2, 1] }, PLAN = { u: [1, 1], v: [0, 1] }, FRONT = { u: [0, -1], v: [2, 1] };
const two = (a, b) => primView({ views: [{ title: a[0], ...a[1] }, { title: b[0], ...b[1] }], frame: 'aircraft' });
const right = (p) => p.a ? p.a[0] >= 0 || p.b[0] >= 0 : p.c[0] >= 0;
const twoR = (a, b) => primView({ views: [{ title: a[0], ...a[1], only: right }, { title: b[0], ...b[1], only: right }], frame: 'aircraft' });
export const VIEWS = {
  'LEZ-28-100': primView({ prims: () => ['LEZ-28-110', 'LEZ-28-120', 'LEZ-28-130', 'LEZ-28-140', 'LEZ-28-150', 'LEZ-28-155', 'LEZ-73-100', 'LEZ-73-110'].flatMap((pn) => fParams(pn)().prims), views: [{ title: 'PLAN, FWD ← (TANK OUTLETS TO THE ENGINE PUMP)', ...PLAN, area: [70, 120, 1080, 470] }], frame: 'aircraft' }),
  'LEZ-28-110': twoR(['RIGHT WELL, LOOKING FORWARD', FRONT], ['SIDE, FWD ←', SIDE]),
  'LEZ-28-120': two(['PLAN, FWD ←', PLAN], ['SIDE, FWD ←', SIDE]),
  'LEZ-28-130': two(['SIDE, FWD ←', SIDE], ['LOOKING FORWARD', FRONT]),
  'LEZ-28-135': two(['PLAN, FWD ←', PLAN], ['SIDE, FWD ←', SIDE]),
  'LEZ-28-140': two(['SIDE, FWD ←', SIDE], ['LOOKING FORWARD', FRONT]),
  'LEZ-28-150': two(['PLAN, FWD ←', PLAN], ['SIDE, FWD ←', SIDE]),
  'LEZ-28-155': two(['SIDE, FWD ←', SIDE], ['LOOKING FORWARD', FRONT]),
  'LEZ-28-160': twoR(['RIGHT VENT, SIDE, FWD ←', SIDE], ['LOOKING FORWARD', FRONT]),
  'LEZ-28-165': twoR(['RIGHT FITTING, SIDE, FWD ←', SIDE], ['LOOKING FORWARD', FRONT]),
  'LEZ-28-170': twoR(['RIGHT CAP, SIDE, FWD ←', SIDE], ['LOOKING FORWARD', FRONT]),
  'LEZ-28-180': twoR(['RIGHT DRAIN, SIDE, FWD ←', SIDE], ['LOOKING FORWARD', FRONT]),
  'LEZ-28-185': two(['PLAN, FWD ←', PLAN], ['SIDE, FWD ←', SIDE]),
  'LEZ-28-190': twoR(['RIGHT GAUGE, LOOKING FORWARD', FRONT], ['SIDE, FWD ←', SIDE]),
  'LEZ-73-100': two(['SIDE, FWD ←', SIDE], ['LOOKING FORWARD', FRONT]),
  'LEZ-73-110': two(['SIDE, FWD ←', SIDE], ['PLAN, FWD ←', PLAN]),
  'LEZ-73-130': two(['SIDE, FWD ←', SIDE], ['PLAN, FWD ←', PLAN]),
};
