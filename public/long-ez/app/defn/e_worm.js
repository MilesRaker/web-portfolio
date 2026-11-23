// e_worm: block E definition record (see site/defn/e_rec.js). Notional, not for construction.
import { rec, an, fx } from './e_rec.js';
import { NG, KIN, DOOR, SWF, NOSE_SW } from '../parts/ng_layout.js';
import { SIZING } from '../parts/ng_sizing.js';
import { E, PLATE, NG6, DSTOP, USTOP, NG3, NG4, FORK, ARM, HOUSING, SHELF, LINK, WHEEL, DR, DISC, FLAG, BOLTS, secIn, plateTapes, coverSkin, SW_WIRE, GEARBOX_LB } from '../parts/wpE1_nosegear.js';
import * as I from './e_icd.js';
const SZ = SIZING.pick, AS = 'https://www.aircraftspruce.com';
export const WRM = rec({
  pn: 'LEZ-32-211', nha: 'LEZ-32-210', kind: 'machined', title: 'Worm and drive shaft (worm to U-joint)',
  change: 'Initial definition: hardened single-start worm, lead 0.125, Ø0.75, on a 5/16 4130 shaft to the U-joint at FS 34.8, through clearance holes in F22 and F28 (no bearing between the gearbox and the panel).',
  datums: [{ id: 'A', what: `Worm axis, BL ${fx(E.wormY)}, WL ${fx(E.wormZ)}` }],
  features: [{ id: 'worm', kind: 'profile', label: 'Worm Ø0.75 pitch, single start, lead 0.125, 2.88 long, case-hardened', tol: 'Runout ≤ 0.003 TIR' }, { id: 'shaft', kind: 'tube', label: 'Shaft Ø0.3125 4130, FS 11.4 to the U-joint', tol: 'Straight 0.010 / ft' }],
  material: { spec: '4130 N bar (shaft); 8620 case-hardened worm', alt: '4140 HT worm', form: 'bar, turned', density: null, allowables: [] },
  process: [{ op: 'Machine', spec: 'Turn and thread the worm; case-harden; press on the shaft and pin.' }, { op: 'Install', spec: 'Through F22 and F28 grommets into the gearbox; pin to the U-joint.' }],
  checks: ['ngear-lock', 'ngear-crank'],
  hardware: [{ std: 'MS16562-12', qty: 1, desc: 'spring pin, worm to shaft' }], hardwareNote: 'Shaft pinned to the U-joint (LEZ-32-214).',
  interfaces: [{ id: 'I1', with: 'LEZ-53-160 F22', feature: 'shaft', what: 'Shaft inside its F22 hole', check: I.wormThroughF22 }, I.OPEN_WORM_GROMMET],
  tooling: { needed: false, text: 'None.' },
  sourcing: { blank: '4130 bar 5/16 × 24; 8620 bar 1 × 3', vendor: 'Aircraft Spruce (4130 bar); worm from the gearbox vendor', url: AS + '/menus/mp/steelrod.html', cost: 60, costAsOf: '2026-11-18', perAircraft: 1, lead: 'With the gearbox', note: 'Approximate.' },
});

void KIN; void DOOR; void SWF; void NOSE_SW; void USTOP; void NG4; void FORK; void ARM; void HOUSING; void LINK; void WHEEL; void DR; void FLAG; void coverSkin; void SW_WIRE; void GEARBOX_LB; void PLATE; void NG6; void DSTOP; void NG3; void SHELF; void DISC; void BOLTS; void secIn; void plateTapes; void I; void an; void SZ; void AS; void E;
