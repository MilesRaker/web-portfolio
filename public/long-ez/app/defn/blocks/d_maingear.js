// Block d_maingear: definition records and drawing views for this block's parts. Owned by the block's agent.
// DEFS entries have the same shape as site/defn/release.js; VIEWS entries the same signature as site/defn/sheet.js (k, D).
import { paramHash } from '../util.js';
import { srcAudit } from '../src_audit.js';
import { BOW_DEF, bowExpect, bowMassOf, bowBookMass } from '../d_gearbow.js';
import { bowParams } from '../../parts/wpD1_gear.js';
import { GMT_DEF, gmtExpect, gmtMassOf } from '../d_gearmount.js';
import { mountParams } from '../../parts/wpD1_gear.js';
import { VIEWS_D } from '../d_views.js';
import { primExpect, primMass, primView } from '../d_prims.js';
import { WHEEL_P, BRAKE_P, SHIELD_P, MC_P, LINE_P, SW_P, SW_AT, LINE_RHO } from '../../parts/wpD2_brakes.js';
import { WHL_DEF, WHL_RHO } from '../d_wheel.js';
import { BRK_DEF, BRK_RHO } from '../d_brake.js';
import { MCY_DEF, MCY_RHO } from '../d_mcyl.js';
import { LIN_DEF } from '../d_brakeline.js';
import { SHD_DEF } from '../d_heatshield.js';
import { PNT_DEF, PNT_RHO, PBK_DEF } from '../d_pant.js';
import { PANT_P, BRKT_P, BRKT_RHO } from '../../parts/wpD3_pant.js';
import { SWT_DEF, SWT_RHO } from '../d_uswitch.js';
import { solidRef } from '../solid_ref.js';   // solids by reference: meshes load on demand
const BOW_SOLID = solidRef('gear_bow', 'BOW_SOLID');
const GMT_SOLID = solidRef('gear_mount', 'GMT_SOLID');
const WHL_SOLID = solidRef('gear_wheel', 'WHL_SOLID');
const BRK_SOLID = solidRef('gear_brake', 'BRK_SOLID');
const MCY_SOLID = solidRef('brake_mc', 'MCY_SOLID');
const LIN_SOLID = solidRef('brake_line', 'LIN_SOLID');
const SHD_SOLID = solidRef('heat_shield', 'SHD_SOLID');
const SWT_SOLID = solidRef('gear_switch', 'SWT_SOLID');
const PNT_SOLID = solidRef('gear_pant', 'PNT_SOLID');
const PBK_SOLID = solidRef('gear_pant', 'PBK_SOLID');

const mirror = () => [1, -1].map((sx) => ({ sx, x: 0, y: 0, z: 0 }));
export const DEFS = {
  // the main gear bow: the right half lofted along the bow (UNI core, ear), mirrored for the left
  'LEZ-32-170': { def: BOW_DEF, solid: BOW_SOLID, params: bowParams, hash: paramHash, expect: bowExpect, book: 'gear', laminate: true,
    massOf: (m) => bowMassOf(m.volumes || {}), massBook: bowBookMass, place: mirror },
  // the attachment, per side: tube, angles, backing strips in the aircraft frame; the left is the mirror placement
  'LEZ-32-120': { def: GMT_DEF, solid: GMT_SOLID, params: mountParams, hash: paramHash, expect: gmtExpect, massOf: (m) => gmtMassOf(m.volumes || {}), place: mirror },
};
// bought-in envelopes, the shield and the line: primitives (cad/d_prims.py); mass from the envelope at the vendor weights
const prim = (def, P, solid, rho, place = mirror) => ({ def, solid, params: () => P, hash: paramHash, expect: (p, m) => primExpect(p, m), massOf: (m) => primMass(m.volumes || {}, rho), place });
Object.assign(DEFS, {
  'LEZ-32-300': prim(WHL_DEF, WHEEL_P, WHL_SOLID, WHL_RHO),
  'LEZ-32-310': prim(BRK_DEF, BRAKE_P, BRK_SOLID, BRK_RHO),
  'LEZ-32-311': prim(MCY_DEF, MC_P, MCY_SOLID, MCY_RHO),
  'LEZ-32-312': prim(LIN_DEF, LINE_P, LIN_SOLID, LINE_RHO),
  'LEZ-32-315': prim(SHD_DEF, SHIELD_P, SHD_SOLID, { sheet: 0.286 }),
  // DC-005: the wheel pant (bought-in envelope, trimmed) and its mounting
  'LEZ-32-320': prim(PNT_DEF, PANT_P, PNT_SOLID, PNT_RHO),
  'LEZ-32-321': prim(PBK_DEF, BRKT_P, PBK_SOLID, BRKT_RHO),
  // the switch in its own frame, placed at S11, S12, S13 (x = BL, y = WL, z = FS, ft)
  'LEZ-32-216': prim(SWT_DEF, SW_P, SWT_SOLID, SWT_RHO, () => SW_AT.map((s) => ({ sx: 1, x: s.at[1], y: s.at[2], z: s.at[0] }))),
});
// source audit 2026-11-19: one new rev per changed part
srcAudit(DEFS, {
"LEZ-32-300": [
"Source audit: tyre and tube cost, Matco wheel on the AXLE1A axle",
"Tyre and tube $288.85 (Goodyear 06-07100 + Leakguard 06-00755); the wheel is the Matco W51LT on the Ø 1.25 AXLE1A axle with 1.25 in taper roller bearings and the Matco nut (AN310-6 cannot fit); wheel mass from the 9.2 lb kit."
],
"LEZ-32-310": [
"Source audit: Matco W51LT kit, Ø 1.25 axle, 9.2 lb, cost",
"Axle Ø 1.25 (was 0.75); wheel and brake 9.2 lb per side (was 5.15, +8.1 lb per aircraft); kit 06-00568 $1,388 per side (was 420)."
],
"LEZ-32-311": [
"Source audit: MC-4 data, cost; pull type kept pending C",
"No pull-type cylinder found; MC-4 (push, 7.5 in hole to hole, 1.388 in stroke, remote reservoir) priced $197.85 (was 95). Adoption waits for block C to re-rig the toe tab (docs/icd/c_controls.md C-S1)."
],
"LEZ-32-312": [
"Source audit: Aeroquip 303-3 hose",
"-3 hose ID 1/8, OD 0.453 (was 0.19 / 0.44), 0.120 lb/ft (was 0.10), 3,000 psi working (was 1,500); bulk $14.85/ft."
],
"LEZ-32-216": [
"Source audit: Honeywell V15W envelope",
"Sealed V15W 33 × 10.3 × 15.9 mm (was 27.8 mm, the unsealed family); bracket lengthened to 1.50 in; MS27716 reference removed (a toggle-switch spec)."
]
});
export const VIEWS = { ...VIEWS_D,
  'LEZ-32-300': primView(WHEEL_P, { notes: [['TYRE 5.00-5 6-PLY, MAX INFLATED ENVELOPE; WHEEL HUB AND BEARING BORE ON THE AXLE (VENDOR DATA TYPED FROM MEMORY)', 'tyre']] }),
  'LEZ-32-310': primView(BRAKE_P, { notes: [['AXLE FLANGE, TORQUE PLATE, SPINDLE, DISC AND CALIPER ENVELOPES; 4 HOLES ON THE BOW\'S AXLE PATTERN', 'axle']] }),
  'LEZ-32-311': primView(MC_P, { notes: [['ROD EYE ON THE PEDAL TOE ARM, BODY EYE ON BLOCK C\'S ANCHOR (BOTH AN3)', 'rod']] }),
  'LEZ-32-312': primView(LINE_P, { titles: ['ROUTE, LOOKING AFT (BL ACROSS)', 'ROUTE, LOOKING INBOARD (FS ACROSS)'], notes: [['TUBE IN THE CABIN ALONG THE LOWER SIDE CORNER; -3 HOSE FROM THE BELLY UNION DOWN THE BOW\'S AFT FACE', 'tube']] }),
  'LEZ-32-315': primView(SHIELD_P, { titles: ['EDGE VIEW, LOOKING AFT', 'FACE VIEW, LOOKING INBOARD'], notes: [['0.025 321 STAINLESS; CLAMPED UNDER THE AXLE FLANGE', 'sheet']] }),
  'LEZ-32-320': primView(PANT_P, { titles: ['FRONT VIEW, LOOKING AFT', 'SIDE VIEW, LOOKING INBOARD'], notes: [['PRE-MOULDED GLASS PANT ENVELOPE; LEG SLOT IN THE INNER WALL, 2 × #10 INBOARD, AN4 OUTBOARD HARD-POINT', 'shell']] }),
  'LEZ-32-321': primView(BRKT_P, { titles: ['PLAN, LOOKING DOWN (BL ACROSS)', 'SIDE, LOOKING INBOARD'], notes: [['0.125 6061-T6 BRACKET UNDER THE UPPER AXLE BOLT HEADS; Ø0.75 STANDOFF ON THE AXLE NUT', 'bracket']] }),
  'LEZ-32-216': primView(SW_P, { titles: ['FRONT VIEW (OWN FRAME)', 'SIDE VIEW (OWN FRAME)'], notes: [['SWITCH ON A 0.040 6061-T6 ANGLE; 2 × #4 TO THE SWITCH, 2 × #6 TO THE HOST', 'bracket']] }),
};
