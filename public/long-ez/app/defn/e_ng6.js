// e_ng6: block E definition record (see site/defn/e_rec.js). Notional, not for construction.
import { rec, an, fx } from './e_rec.js';
import { NG, KIN, DOOR, SWF, NOSE_SW } from '../parts/ng_layout.js';
import { SIZING } from '../parts/ng_sizing.js';
import { E, PLATE, NG6, DSTOP, USTOP, NG3, NG4, FORK, ARM, HOUSING, SHELF, LINK, WHEEL, DR, DISC, FLAG, BOLTS, secIn, plateTapes, coverSkin, SW_WIRE, GEARBOX_LB } from '../parts/wpE1_nosegear.js';
import * as I from './e_icd.js';
const SZ = SIZING.pick, AS = 'https://www.aircraftspruce.com';
export const NG6D = rec({
  pn: 'LEZ-32-203', nha: 'LEZ-32-200', kind: 'machined', title: 'NG-6 hinge fitting',
  change: `Initial definition. Two 0.15 in 6061 cheeks clamp the strut's top ${fx(NG6.u1 - 0.54)} in with 2 × AN4 through the strut; a pressed 6061 boss tube (Ø0.75) carries two NAS75-4 bushings across the box above the strut's top face; a lip on the forward edge lands on the down-stop; bands close the clamp fore and aft. Checked for the side-load couple on the strut faces (ngear-ng6). The top now ends ${fx(-NG6.u0)} in above the hinge axis, so its swing stays ${'≥'} 0.25 in aft of block A's ballast bulkhead.`,
  datums: [{ id: 'A', what: 'Boss bore axis (hinge)' }, { id: 'B', what: 'Strut axis' }],
  features: [{ id: 'cheek', kind: 'plate', label: `Cheeks 0.15 × ${2 * NG6.n} × ${fx(NG6.u1 - NG6.u0)} in at BL ±${NG6.yi}–${NG6.yo}, boss holes Ø0.75, clamp holes Ø0.257`, tol: 'Bore square to the strut ±0.25°' },
    { id: 'boss', kind: 'tube', label: `Boss tube Ø0.75 × 0.1875 wall, BL ±${fx(NG6.bossY)}, bushings pressed and reamed`, tol: 'Bushing bore +0.001/−0' }, { id: 'lip', kind: 'plate', label: 'Stop lip 0.35 × 1.36 across the cheeks, top face on the down-stop pad', tol: 'Top face ±0.005' }, { id: 'band', kind: 'plate', label: 'Clamp bands 0.15 thick fore and aft, 1.1 in long', tol: '—' }],
  material: { spec: 'AMS-QQ-A-250/11 6061-T6 plate; 6061-T6 tube 0.75 × 0.1875', alt: '2024-T351', form: 'plate and tube, welded-free (bonded and bolted)', density: null, allowables: [['6061-T6 F_bru', '88 ksi', 'MMPDS-typical']] },
  process: [{ op: 'Machine', spec: 'Cut cheeks, lip and bands; bore the boss holes with the cheeks clamped as a pair; press the tube; press and ream the bushings.' }, { op: 'Install', spec: 'Flox-bed on the strut top in the jig; drill the clamp holes through; AN4 bolts.' }],
  checks: ['ngear-ng6', 'ngear-hinge'],
  rules: [{ id: 'edge', label: 'Boss hole edge above the bore ≥ 0.25 in', v: -NG6.u0 - NG6.bossR, min: 0.25 }],
  hardware: [{ std: an(4, 2 * NG6.yo + 0.02), qty: 2, desc: 'clamp bolts through cheeks and strut' }, { std: 'MS21042L4', qty: 2, desc: 'nuts' }, { std: 'NAS75-4', qty: 2, desc: 'bushings in the boss' }],
  hardwareNote: 'Clamp bolts torqued to the lower AC 43.13-1B value (bearing on composite).',
  interfaces: [{ id: 'I1', with: 'LEZ-08-105 ballast bulkhead (A)', feature: 'lip', what: 'Swept fitting ≥ 0.25 in aft', check: I.ballastClear }, { id: 'I2', with: 'LEZ-32-226 up-stop', feature: 'cheek', what: 'No contact through the swing', check: () => I.stopCheck('up') }],
  tooling: { needed: true, text: 'Strut drill jig (shared with LEZ-32-200).' },
  sourcing: { blank: '6061-T6 plate 0.25 × 4 × 4; tube 0.75 × 0.1875 × 5', vendor: 'Aircraft Spruce (6061, NAS75 bushings)', url: AS + '/menus/mp/aluminum.html', cost: 35, costAsOf: '2026-11-18', perAircraft: 1, lead: 'Stock', note: 'Approximate (typed from memory).' },
});
void KIN; void DOOR; void SWF; void NOSE_SW; void USTOP; void NG4; void FORK; void ARM; void HOUSING; void LINK; void WHEEL; void DR; void FLAG; void coverSkin; void SW_WIRE; void GEARBOX_LB;
