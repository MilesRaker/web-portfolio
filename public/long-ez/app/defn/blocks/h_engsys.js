// Block h_engsys: definition records and drawing views for this block's parts. Owned by the block's agent.
// DEFS entries have the same shape as site/defn/release.js; VIEWS entries the same signature as site/defn/sheet.js (k, D).
import '../h_engine.js';
import { srcAudit } from '../src_audit.js';
import { primView } from '../g_views.js';
import { paramHash } from '../util.js';
import { primEntry } from '../h_common.js';
import * as PR from '../../parts/wpH4_prims.js';
import { KEY_DEF, HARN_DEF, PLUG_DEF, PLEAD_DEF } from '../h_ign.js';
import { QUAD_DEF, CABLE_DEF } from '../h_ctl.js';
import { GEA_DEF, SNS_DEF, BRN_DEF, MANI_DEF, LINE_DEF, FFT_DEF } from '../h_ems.js';
import '../h_icd.js';   // ICD phase 2: interface checks against the partners' own symbols
import { solidRef } from '../solid_ref.js';   // solids by reference: meshes load on demand
const H_KEY_SOLID = solidRef('h_key', 'H_KEY_SOLID');
const H_HARN_SOLID = solidRef('h_harness', 'H_HARN_SOLID');
const H_PLUG_SOLID = solidRef('h_plugs', 'H_PLUG_SOLID');
const H_PLEAD_SOLID = solidRef('h_pleads', 'H_PLEAD_SOLID');
const H_QUAD_SOLID = solidRef('h_quadrant', 'H_QUAD_SOLID');
const H_CABLE_SOLID = solidRef('h_cables', 'H_CABLE_SOLID');
const H_GEA_SOLID = solidRef('h_gea24', 'H_GEA_SOLID');
const H_SNS_SOLID = solidRef('h_sensors', 'H_SNS_SOLID');
const H_BRN_SOLID = solidRef('h_branches', 'H_BRN_SOLID');
const H_MANI_SOLID = solidRef('h_manifold', 'H_MANI_SOLID');
const H_LINE_SOLID = solidRef('h_lines', 'H_LINE_SOLID');
const H_FFT_SOLID = solidRef('h_fft', 'H_FFT_SOLID');

void paramHash;
export const DEFS = {
  'LEZ-74-100': primEntry(KEY_DEF, H_KEY_SOLID, PR.keyParams, PR.KEY_RHO()),
  'LEZ-74-110': primEntry(HARN_DEF, H_HARN_SOLID, PR.harnessParams, PR.HARNESS_RHO),
  'LEZ-74-120': primEntry(PLUG_DEF, H_PLUG_SOLID, PR.plugParams, PR.PLUG_RHO(), 8),
  'LEZ-74-130': primEntry(PLEAD_DEF, H_PLEAD_SOLID, PR.pleadParams, PR.PLEAD_RHO),
  'LEZ-76-100': primEntry(QUAD_DEF, H_QUAD_SOLID, PR.quadParams, PR.QUAD_RHO),
  'LEZ-76-110': primEntry(CABLE_DEF, H_CABLE_SOLID, PR.cableParams, PR.CABLE_RHO),
  'LEZ-77-100': primEntry(GEA_DEF, H_GEA_SOLID, PR.geaParams, PR.GEA_RHO()),
  'LEZ-77-110': primEntry(SNS_DEF, H_SNS_SOLID, PR.sensorParams, PR.SENSOR_RHO()),
  'LEZ-77-111': primEntry(BRN_DEF, H_BRN_SOLID, PR.branchParams, PR.BRANCH_RHO),
  'LEZ-77-120': primEntry(MANI_DEF, H_MANI_SOLID, PR.maniParams, PR.MANI_RHO()),
  'LEZ-77-121': primEntry(LINE_DEF, H_LINE_SOLID, PR.lineParams, PR.LINE_RHO),
  'LEZ-77-130': primEntry(FFT_DEF, H_FFT_SOLID, PR.fftParams, PR.FFT_RHO()),
};
// source audit 2026-11-19: one new rev per changed part (docs/blocks/*.md "Source audit")
srcAudit(DEFS, {
"LEZ-74-100": [
"Source audit: ACS A-510-2 true size, start relay K3",
"Switch ACS A-510-2 (11-03170): 2.28 in long, 2.23 in widest, 7/8 in notched hole (block B ask), 0.209 lb, $256 (were Ø 1.25 × 1.95, 5/8 in, 0.40 lb, $145, typed). Its START contact is rated 2 A and the STS-S12 coil draws 2.9 A: START now drives start relay K3 (FB1-6 5 A to K2 coil). The body is modelled round (Ø 2.23 × 2.28) and the switch centre moves to BL −9.55, WL 40.35 (0.15 in outboard, 0.05 in down: clear of the warning panel LEZ-31-150 by 0.29 in, inside the OML, B's key-edge rule 0.29 in); the 2.23 in body cannot sit in B's Ø 1.25 rear spot-face: B to give the 0.25 in local panel some other way (front counterbore or insert) and cut the 7/8 in notched hole at BL −9.55, WL 40.35 (ask in docs/icd/b_cockpit.md). The magnetometer harness head moved 0.45 in inboard to stay clear of the longer body (jemc-seg)."
],
"LEZ-74-110": [
"Source audit: ACS 12304-33 harness",
"Harness per ACS 12304-33 (mfr 08-17287), 5 mm shielded, 5/8-24 plugs, for Slick 4370 / 4371; $199.85 (was 7 mm, $450, typed). Lead nuts 80–90 in-lb (SI 1042AI)."
],
"LEZ-74-120": [
"Source audit: plug torque, mass, cost",
"Torque 420 in-lb per Lycoming SI 1042AI (was 360–420, typed); mass 0.25 lb each (conservative end, was 0.12); $42.50 each (was 32)."
],
"LEZ-76-110": [
"Source audit: ACS A-920 data, ±4° swivel re-rig, cost",
"Cables per ACS A-920: 0.078 in inner, 10-32 rod ends, ±4° rod-end swivel, 5 in minimum bend. The conduit ends were re-angled (throttle end FS 158.55, heat bracket 18°) so the rod swing is 3.55° throttle, 2.28° mixture, 3.30° heat (ctl-travel MS +0.13, ctl-route +0.09). Cost ≥ 500 (3 × 72 in at $166.75; was 210)."
],
"LEZ-77-100": [
"Source audit: GEA 24 true size, four connectors, cost",
"GEA 24 010-01042-00: 6.50 × 1.90 × 3.00 in on edge, 0.71 lb, four connectors J241–J244 (9, 50, 25, 37-pin; 0.89 lb with backshells) per G3X IM 190-01115-01 rev AV (were 2.40 × 3.60 × 1.44, two connectors, typed); centre WL 37.10; $1,188 (was 720)."
],
"LEZ-77-110": [
"Source audit: type K CHT, sensor kit, cost re-split",
"CHT type K 3/8-24 threaded (Alcor 86253 / Garmin 494-70000-00; was type J bayonet). The Garmin kit (Table 21-2) plus carb fuel-P 0–15 psig ($384) and UMA T1A9-1 tach sensor in the magneto vent port ($149.75); kit FT-60 costed on LEZ-77-130: 1,228.75 (was 950)."
],
"LEZ-77-120": [
"Source audit: fuel-P 0–15 psig, oil-P 100 psi, cost split",
"Fuel-pressure transducer 0–15 psig (Garmin lists no 0–30 psi sensor; carb inlet ≤ 8 psi), oil pressure limit 100 psi (OM 60297-9); transducers costed with the kit on LEZ-77-110, this record 80 (bar and fittings, BOUND; was 560)."
],
"LEZ-77-121": [
"Source audit: -3 hose 303-3",
"-3 hose 0.120 lb/ft, 3,000 psi (Aeroquip 303-3; was 0.07 lb/ft typed)."
],
"LEZ-77-130": [
"Source audit: EI FT-60 envelope, ports, cost",
"FT-60 1.90 × 1.62 × 1.375 in, 0.33 lb, ports ±0.95 in (were typed); block F ports moved to match; $485 (was 260)."
]
});
const SIDE = { u: [1, 1], v: [2, 1] }, PLAN = { u: [1, 1], v: [0, 1] }, FRONT = { u: [0, -1], v: [2, 1] };
const two = (a, b) => primView({ views: [{ title: a[0], ...a[1] }, { title: b[0], ...b[1] }], frame: 'aircraft' });
export const VIEWS = {
  'LEZ-74-100': two(['SIDE ELEVATION, FWD ←', SIDE], ['PLAN, FWD ←', PLAN]),
  'LEZ-74-110': two(['PLAN, FWD ←', PLAN], ['VIEW LOOKING FORWARD', FRONT]),
  'LEZ-74-120': two(['PLAN, FWD ←', PLAN], ['VIEW LOOKING FORWARD', FRONT]),
  'LEZ-74-130': two(['VIEW LOOKING FORWARD', FRONT], ['SIDE ELEVATION, FWD ←', SIDE]),
  'LEZ-76-100': two(['SIDE ELEVATION, FWD ←', SIDE], ['VIEW LOOKING FORWARD', FRONT]),
  'LEZ-76-110': two(['SIDE ELEVATION, FWD ←', SIDE], ['PLAN, FWD ←', PLAN]),
  'LEZ-77-100': two(['SIDE ELEVATION, FWD ←', SIDE], ['PLAN, FWD ←', PLAN]),
  'LEZ-77-110': two(['PLAN, FWD ←', PLAN], ['VIEW LOOKING FORWARD', FRONT]),
  'LEZ-77-111': two(['VIEW LOOKING FORWARD', FRONT], ['PLAN, FWD ←', PLAN]),
  'LEZ-77-120': two(['VIEW LOOKING FORWARD', FRONT], ['SIDE ELEVATION, FWD ←', SIDE]),
  'LEZ-77-121': two(['PLAN, FWD ←', PLAN], ['SIDE ELEVATION, FWD ←', SIDE]),
  'LEZ-77-130': two(['SIDE ELEVATION, FWD ←', SIDE], ['VIEW LOOKING FORWARD', FRONT]),
};
