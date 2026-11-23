// e_strut: block E definition record (see site/defn/e_rec.js). Notional, not for construction.
import { rec, an, fx } from './e_rec.js';
import { PROCESS } from '../plybook.js';
import { NG, KIN, DOOR, SWF, NOSE_SW } from '../parts/ng_layout.js';
import { SIZING } from '../parts/ng_sizing.js';
import { E, PLATE, NG6, DSTOP, USTOP, NG3, NG4, FORK, ARM, HOUSING, SHELF, LINK, WHEEL, DR, DISC, FLAG, BOLTS, secIn, plateTapes, coverSkin, SW_WIRE, GEARBOX_LB } from '../parts/wpE1_nosegear.js';
import * as I from './e_icd.js';
import { LAM_ALLOW, LAM_SPEC, LAM_FORM, LAM_CURE, ppBuy, PP_VENDOR, PP_PRICE } from './p_common.js';
const SZ = SIZING.pick, AS = 'https://www.aircraftspruce.com';
export const NGS = rec({
  pn: 'LEZ-32-200', nha: 'LEZ-000 (aircraft)', kind: 'laminate', title: 'NG-1 nose-gear strut',
  templates: 'None: moulded in a two-part steel mould to the station table (no CNC-mill core)', solidText: 'CadQuery solid: ruled loft of the chamfered-rectangle stations, raked 6° aft at DOWN, bolt holes cut',
  change: `Initial definition. A solid unidirectional S-glass bar, ${fx(E.Ls)} in from 0.54 in below the hinge axis to the NG-4 socket, sized station by station (ngear-strut) and for tip stiffness (ngear-defl). The block model ran the strut down to 3.4 in above the axle, inside the tyre with the fork crown; the fork now drops ${fx(NG.drop * 12)} in so the crown tube rides 0.4 in over the tyre, and the strut is ${fx(22.72 - E.Ls)} in shorter. The top now stops below the NG-6 hinge boss instead of running through it. Five lateral holes: 2 for the NG-6 clamp, 2 for NG-3 at the deepest station, 1 for NG-4.`,
  datums: [{ id: 'A', what: 'Strut axis (raked 6° aft of vertical at DOWN)' }, { id: 'B', what: `Hinge axis, FS ${fx(E.O[1])}, WL ${fx(E.O[2])} (0.54 in above the top face)` }, { id: 'C', what: 'Strut mid-plane, BL 0' }],
  features: [
    { id: 'strut', kind: 'profile', label: `Chamfered rectangle (1/8 in chamfers) at ${SZ.strut.length} stations: ${SZ.strut.map((q) => `${fx(q.u * 12, 1)} in ${fx(q.t, 3)} × ${fx(q.b, 3)}`).join('; ')} (fore-aft × lateral)`, tol: 'Section ±0.02 in to the station table' },
    { id: 'layup', kind: 'layup', label: 'S-glass rovings, unidirectional along the strut, to fill the mould at 60 % fibre volume; 2 plies ±45 × 6781 over-wrap inside the moulded section; MTM45-1, cure (M cycle)d', tol: 'Roving count per station within ±2 %' },
    { id: 'holes', kind: 'hole', label: `Lateral Ø0.257 at ${fx(BOLTS.ng6[0])}, ${fx(BOLTS.ng6[1])} in (NG-6 clamp), ${fx(BOLTS.ng3[0])}, ${fx(BOLTS.ng3[1])} in (NG-3), ${fx(BOLTS.ng4)} in (NG-4) below the top face + 0.54`, tol: 'Drilled through the fittings in the strut jig' },
  ],
  material: { spec: 'S-2 glass roving, MTM45-1 prepreg (NCAMP); 6781 over-wrap', alt: 'S2-glass roving at 1.5 × the section (not checked)', form: 'moulded bar', density: null,
    allowables: [['Flexure, UD S-glass/epoxy', '100 ksi (after knock-downs)', 'BOUND (typed from memory)'], ['E', '7.0 Msi', 'BOUND (typed from memory)']] },
  process: [{ op: 'Mould', spec: 'Wet the counted rovings and lay them into the two-part steel mould to the station table; ±45 × 6781 over-wrap; close; cure at room temperature 24 h.' }, { op: 'Post-cure', spec: `${PROCESS.postCure} (shared structural process, plybook.js; rev 2026-11-19, was 8 h at 140 °F): the hot-wet allowables of the strut checks assume the M-cycle cured Tg` }, { op: 'Drill', spec: 'In the strut jig with NG-6, NG-3 and NG-4 fitted, through the fittings; seal the bores with thin epoxy.' }, { op: 'Install', spec: 'Hang on the hinge; set the 6° rake on the down-stop; rig the link (LEZ-32-213); run DOWN–UP–DOWN with the crank before the doors are fitted.' }],
  checks: ['ngear-strut', 'ngear-defl'],
  rules: [{ id: 'gauge', label: 'Section ≥ the minimum gauge (1.0 in at the hinge clamp)', v: secIn(1.0).t, min: 1.0 }],
  hardware: [{ std: an(4, 2 * NG6.yo + 0.02), qty: 2, desc: 'NG-6 clamp bolts (in LEZ-32-203)' }, { std: an(4, secIn(BOLTS.ng3[0]).b + 2 * NG3.wall), qty: 2, desc: 'NG-3 bolts (in LEZ-32-204)' }],
  hardwareNote: 'The bolts through the strut belong to the fittings (LEZ-32-203, -204): listed here for the grip only; torque per AC 43.13-1B table 7-1, lower value (composite).',
  interfaces: [
    { id: 'I1', with: 'LEZ-53-160 F22 notch', feature: 'strut', what: 'Strut and cover pass the notch (stowed and swept)', check: () => I.sweepCheck() },
    { id: 'I2', with: 'LEZ-32-203 NG-6', feature: 'holes', what: 'Top 0.54 in under the hinge axis, clear of the boss', check: () => ({ ok: 0.54 - NG6.bossR >= 0.15, detail: `top face to the boss ${fx(0.54 - NG6.bossR, 3)} in` }) },
    { id: 'I3', with: 'Ballast bulkhead LEZ-08-105 (A)', feature: 'strut', what: 'The swing stays aft of the bulkhead', check: I.ballastClear },
  ],
  tooling: { needed: true, text: 'Two-part steel mould machined to the station table; strut drill jig holding NG-6, NG-3, NG-4 and the hinge bore.' },
  sourcing: { blank: `S-2 glass roving ≈ ${fx(1.4, 1)} lb, MTM45-1/ 0.3 gal`, vendor: PP_VENDOR.vendor, url: AS + '/menus/cm/fiberglasscloth.html', cost: 180, costAsOf: '2026-11-18', perAircraft: 1, lead: 'Mould 4 weeks', note: 'Approximate (typed from memory); mould not included.' },
});
void KIN; void DOOR; void SWF; void NOSE_SW; void USTOP; void NG4; void FORK; void ARM; void HOUSING; void LINK; void WHEEL; void DR; void FLAG; void coverSkin; void SW_WIRE; void GEARBOX_LB;
