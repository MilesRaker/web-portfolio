// e_hinge: block E definition record (see site/defn/e_rec.js). Notional, not for construction.
import { rec, an, fx } from './e_rec.js';
import { NG, KIN, DOOR, SWF, NOSE_SW } from '../parts/ng_layout.js';
import { SIZING } from '../parts/ng_sizing.js';
import { E, PLATE, NG6, DSTOP, USTOP, NG3, NG4, FORK, ARM, HOUSING, SHELF, LINK, WHEEL, DR, DISC, FLAG, BOLTS, secIn, plateTapes, coverSkin, SW_WIRE, GEARBOX_LB } from '../parts/wpE1_nosegear.js';
import * as I from './e_icd.js';
const SZ = SIZING.pick, AS = 'https://www.aircraftspruce.com';
export const HNG = rec({
  pn: 'LEZ-32-202', nha: 'LEZ-32-201', kind: 'machined', title: 'NG-8 discs, hinge bolt and down-stop',
  change: `Initial definition. NG-8 discs Ø${2 * DISC.r} × 0.25 in 6061-T6 outside each plate, flatted at WL ${fx(DISC.flat())} where the skin rises, 6 × AN3 each on a Ø${2 * DISC.bc} circle; one AN4 hinge bolt (the sizing's pick: ng-pivot no longer says AN5). The down-stop moved from in front of the strut (where it would have blocked the retraction) to above and forward of the NG-6 lip: the lip's top face lands on a urethane pad under a 6061 bar between the plates. The bar is clear of block A's ballast bulkhead.`,
  datums: [{ id: 'A', what: `Hinge axis, FS ${fx(E.O[1])}, WL ${fx(E.O[2])}` }, { id: 'B', what: `Plate outer faces, BL ±${fx(E.plate.yo)}` }],
  features: [{ id: 'disc', kind: 'plate', label: `Disc Ø${2 * DISC.r} × 0.25, bore Ø0.257, 6 × Ø0.191 on Ø${2 * DISC.bc}, flat at WL ${fx(DISC.flat())}`, tol: 'Holes ±0.005 true position (match-drilled with the plates)' },
    { id: 'stop', kind: 'plate', label: `Down-stop bar 6061-T6, ${fx(DSTOP.bar.u[1] - DSTOP.bar.u[0])} × ${fx(DSTOP.bar.n[1] - DSTOP.bar.n[0])} in, BL ±${fx(DSTOP.bar.y)}, tapped 10-32 each end`, tol: 'Pad face square to the lip ±0.5°' },
    { id: 'pad', kind: 'plate', label: `90A HT61 pad ${fx(DSTOP.pad.u[1] - DSTOP.pad.u[0])} thick, BL ±${DSTOP.pad.y}, bonded`, tol: 'Shim to contact at 6.0° ± 0.5°' }, { id: 'bolt', kind: 'hole', label: 'AN4 hinge bolt, BL ±3.40', tol: 'Push fit in the bushings' }],
  material: { spec: 'AMS-QQ-A-250/11 6061-T6 plate 0.25 and bar; 90A HT61 sheet; AN4 bolt', alt: '2024-T3', form: 'plate and bar', density: null, allowables: [['6061-T6 F_bru', '88 ksi', 'MMPDS-typical'], ['Urethane pad bearing', '3 ksi', 'BOUND (typed from memory)']] },
  process: [{ op: 'Machine', spec: 'Cut and bore the discs; machine the bar, tap the ends 10-32 × 0.5 deep; bond the pad with flexible epoxy.' }, { op: 'Install', spec: 'Discs on the plates with AN3s; hinge bolt through disc, plate, NG-6 bushings, plate, disc; bar between the plates with an AN3 each end.' }],
  checks: ['ngear-hinge', 'ngear-hinge-lat', 'ngear-dstop'],
  rules: [{ id: 'eD', label: 'Disc bolt edge distance ≥ 1.5 D', v: (DISC.r - DISC.bc) / 0.19 / 1.5, min: 1 }],
  hardware: [{ std: an(4, 2 * (E.plate.yo + 0.25)), qty: 1, desc: 'hinge bolt' }, { std: 'MS21042L4', qty: 1, desc: 'nut' }, { std: 'AN960-416', qty: 2, desc: 'washers' }, { std: an(3, 0.25 + 0.42), qty: 12, desc: 'NG-8 disc bolts' }, { std: 'MS21042L3', qty: 12, desc: 'nuts' }, { std: an(3, 0.42 + 0.40, 0.06), qty: 2, desc: 'down-stop bar bolts into the bar ends' }],
  hardwareNote: 'Hinge bolt grip disc to disc; torque the hinge nut to the lower AC 43.13 value then back to the cotter-free self-locking position with no end-play.',
  interfaces: [{ id: 'I1', with: 'LEZ-32-201 plates', feature: 'disc', what: 'Disc clear of the inner skin', check: I.discsInside }, { id: 'I2', with: 'LEZ-32-203 NG-6 lip', feature: 'pad', what: 'Contact at DOWN, clear through the swing', check: () => I.stopCheck('down') }],
  tooling: { needed: false, text: 'Uses the NG-30 box jig for the match-drilled holes.' },
  sourcing: { blank: '6061-T6 plate 0.25 × 2 × 4; bar 0.75 × 0.5 × 5; HT61 1/4 sheet', vendor: 'Aircraft Spruce (6061 plate, AN hardware)', url: AS + '/menus/mp/aluminum.html', cost: 28, costAsOf: '2026-11-18', perAircraft: 1, lead: 'Stock', note: 'Approximate (typed from memory).' },
});
void KIN; void DOOR; void SWF; void NOSE_SW; void USTOP; void NG4; void FORK; void ARM; void HOUSING; void LINK; void WHEEL; void DR; void FLAG; void coverSkin; void SW_WIRE; void GEARBOX_LB;
