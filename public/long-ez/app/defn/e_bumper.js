// e_bumper: block E definition record (see site/defn/e_rec.js). Notional, not for construction.
import { rec, an, fx } from './e_rec.js';
import { NG, KIN, DOOR, SWF, NOSE_SW } from '../parts/ng_layout.js';
import { SIZING } from '../parts/ng_sizing.js';
import { E, PLATE, NG6, DSTOP, USTOP, NG3, NG4, FORK, ARM, HOUSING, SHELF, LINK, WHEEL, DR, DISC, FLAG, BOLTS, secIn, plateTapes, coverSkin, SW_WIRE, GEARBOX_LB } from '../parts/wpE1_nosegear.js';
import * as I from './e_icd.js';
const SZ = SIZING.pick, AS = 'https://www.aircraftspruce.com';
export const BMP = rec({
  pn: 'LEZ-32-225', nha: 'LEZ-000 (aircraft)', kind: 'machined', title: 'Nose bumper',
  change: 'Initial definition: 0.125 6061 base bonded to the belly at FS 3.6–6.5 on 4 flox inserts, 0.5 in rubber skid on 4 × #10 screws (tips ≤ 0.3 in into the inserts, clear of the landing light). Checked for the parked kneeling load (ngear-bumper).',
  datums: [{ id: 'A', what: 'Belly OML at BL ±0.72' }],
  features: [{ id: 'base', kind: 'plate', label: '6061-T6 0.125, 2.88 × 1.6, formed to the belly', tol: 'Fit ±1/32' }, { id: 'skid', kind: 'plate', label: 'Rubber skid 0.5 thick, 2.88 × 1.44, 4 × #10', tol: '—' }],
  material: { spec: '6061-T6 0.125; 70A neoprene', alt: 'UHMW skid', form: 'sheet', density: null, allowables: [['Neoprene bearing', '500 psi', 'BOUND (typed from memory)']] },
  process: [{ op: 'Install', spec: 'Pot 4 flox inserts in the belly core; bond the base; screw on the skid.' }],
  checks: ['ngear-bumper'], hardware: [{ std: 'MS24693-C51', qty: 4, desc: '#10 screws into the inserts' }], hardwareNote: 'Screws with nylon-insert nuts in the inserts.',
  interfaces: [{ id: 'I1', with: 'LEZ-53-150 belly', feature: 'base', what: 'Base on the OML', check: I.bumperOnSkin }],
  tooling: { needed: false, text: 'None.' },
  sourcing: { blank: '6061 0.125 × 3 × 2; neoprene 0.5 × 3 × 2', vendor: 'Aircraft Spruce', url: AS + '/menus/mp/aluminum.html', cost: 15, costAsOf: '2026-11-18', perAircraft: 1, lead: 'Stock', note: 'Approximate.' },
});

void KIN; void DOOR; void SWF; void NOSE_SW; void USTOP; void NG4; void FORK; void ARM; void HOUSING; void LINK; void WHEEL; void DR; void FLAG; void coverSkin; void SW_WIRE; void GEARBOX_LB; void PLATE; void NG6; void DSTOP; void NG3; void SHELF; void DISC; void BOLTS; void secIn; void plateTapes; void I; void an; void SZ; void AS; void E;
