// e_link: block E definition record (see site/defn/e_rec.js). Notional, not for construction.
import { rec, an, fx } from './e_rec.js';
import { NG, KIN, DOOR, SWF, NOSE_SW } from '../parts/ng_layout.js';
import { SIZING } from '../parts/ng_sizing.js';
import { E, PLATE, NG6, DSTOP, USTOP, NG3, NG4, FORK, ARM, HOUSING, SHELF, LINK, WHEEL, DR, DISC, FLAG, BOLTS, secIn, plateTapes, coverSkin, SW_WIRE, GEARBOX_LB } from '../parts/wpE1_nosegear.js';
import * as I from './e_icd.js';
const SZ = SIZING.pick, AS = 'https://www.aircraftspruce.com';
export const LNK = rec({
  pn: 'LEZ-32-213', nha: 'LEZ-32-210', kind: 'mechanism', title: 'Spring link (NG-64 to NG-3)',
  change: `Initial definition: clevis over the NG-64 eye, 4130 cartridge Ø${2 * LINK.cartR} with an ISO 10243 die spring (rate typed from memory) preloaded ${NG.spring.pre} in (${fx(NG.spring.k * NG.spring.pre, 0)} lb, lowered from 1200 lb so the crank effort meets the target with the up-lock squeeze), ${SZ.rod.od} × ${SZ.rod.w} 4130 rod and an MS21151 rod end; ${fx(KIN.l * 12, 2)} in pin to pin.`,
  datums: [{ id: 'A', what: 'Pin axes at NG-64 and NG-3' }],
  features: [{ id: 'cartridge', kind: 'tube', label: `Cartridge Ø${2 * LINK.cartR} × 0.065, ${fx(LINK.cart[1] - LINK.cart[0])} long; nested ISO 10243 heavy die springs 40 × 51 mm and 20 × 51 mm (${NG.spring.parts.join(', ')}), preloaded ${NG.spring.pre} in to ${fx(NG.spring.k * NG.spring.pre, 0)} lb`, tol: `Pin-to-pin ${fx(KIN.l * 12, 2)} ± 0.02` }, { id: 'rod', kind: 'tube', label: `Rod ${SZ.rod.od} × ${SZ.rod.w} 4130`, tol: '—' }, { id: 'clevis', kind: 'plate', label: 'Clevis ears BL ±0.135–0.26', tol: '—' }, { id: 'rodend', kind: 'profile', label: 'MS21151-4 rod end, jam nut safety-wired', tol: 'Vendor' }],
  material: { spec: 'MIL-T-6736 4130 tube; two nested ISO 10243 heavy-duty (red) die springs, 51 mm: McMaster-Carr 1804N219 (40 mm hole) and 1804N199 (20 mm hole) on a Ø 10 mm guide; MS21151 rod end', alt: 'Any ISO 10243 heavy 40 × 51 and 20 × 51 pair', form: 'tube and bar, welded clevis', density: null, allowables: [['Die spring rate', `${fx(NG.spring.k, 0)} lb/in (78 + 21 lbf/mm)`, 'VENDOR: McMaster-Carr ISO 10243 table (accessed 2026-11-19)'], ['Rated load at 25 % (51 mm)', `${NG.spring.maxLb} lb (1,000 + 265)`, 'VENDOR: McMaster-Carr (accessed 2026-11-19)']] },
  process: [{ op: 'Assemble', spec: 'Spring in the cartridge, preload nut to the set length, safety-wire; rod end jam nut; set pin-to-pin.' }],
  checks: ['ngear-link', 'ngear-spring', 'ngear-uplock'],
  hardware: [{ std: an(4, 2 * LINK.clevY[1]), qty: 1, desc: 'pin at the NG-64 eye' }, { std: an(4, NG3.gap + 2 * SZ.ear.t), qty: 1, desc: 'pin at NG-3' }, { std: 'MS21042L4', qty: 2, desc: 'nuts' }, { std: 'AN960-416L', qty: 2, desc: 'rod-end spacers' }],
  hardwareNote: 'Pins torqued so the rod end and clevis turn free.',
  interfaces: [{ id: 'I1', with: 'LEZ-32-202 / -226 stops', feature: 'cartridge', what: 'Clear of the stop bars and pads over the stroke', check: I.linkVsStops }, { id: 'I2', with: 'LEZ-32-216 S12', feature: 'cartridge', what: 'Switch outboard of the link', check: I.s12Clear }],
  tooling: { needed: false, text: 'Length gauge.' },
  sourcing: { blank: '4130 tube 1.1 × 0.07 × 4; 0.5 × 0.065 × 3', vendor: 'McMaster-Carr (die spring); Aircraft Spruce (rod end, 4130)', url: 'https://www.mcmaster.com/die-springs/', cost: 55, costAsOf: '2026-11-18', perAircraft: 1, lead: 'Stock', note: 'Springs McMaster-Carr 1804N219 and 1804N199 (prices not shown on the page: BOUND); tube and rod end approximate (typed from memory).' },
});

void KIN; void DOOR; void SWF; void NOSE_SW; void USTOP; void NG4; void FORK; void ARM; void HOUSING; void LINK; void WHEEL; void DR; void FLAG; void coverSkin; void SW_WIRE; void GEARBOX_LB; void PLATE; void NG6; void DSTOP; void NG3; void SHELF; void DISC; void BOLTS; void secIn; void plateTapes; void I; void an; void SZ; void AS; void E;
