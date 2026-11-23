// e_cover: block E definition record (see site/defn/e_rec.js). Notional, not for construction.
import { rec, an, fx } from './e_rec.js';
import { NG, KIN, DOOR, SWF, NOSE_SW } from '../parts/ng_layout.js';
import { SIZING } from '../parts/ng_sizing.js';
import { E, PLATE, NG6, DSTOP, USTOP, NG3, NG4, FORK, ARM, HOUSING, SHELF, LINK, WHEEL, DR, DISC, FLAG, BOLTS, secIn, plateTapes, coverSkin, SW_WIRE, GEARBOX_LB } from '../parts/wpE1_nosegear.js';
import * as I from './e_icd.js';
import { LAM_ALLOW, LAM_SPEC, LAM_FORM, LAM_CURE, ppBuy, PP_VENDOR, PP_PRICE } from './p_common.js';
const SZ = SIZING.pick, AS = 'https://www.aircraftspruce.com';
export const CVR = rec({
  pn: 'LEZ-32-205', nha: 'LEZ-32-200', kind: 'laminate', title: 'Strut cover (fills the belly slot gear-up)',
  templates: 'None: shaped on the stowed strut against the slot with a feeler gauge', solidText: 'CadQuery solid: ruled loft of the cover sections along the strut (stowed depth to the skin, width inside the slot)',
  change: 'Initial definition. Foam fairing on the strut\'s forward face, 1/8 in inside the slot edges and clear of the door torque tubes, depth to the skin line with the gear up; 2 BID skin. Shorter with the shorter strut.',
  datums: [{ id: 'A', what: 'Strut forward face' }], features: [{ id: 'cover', kind: 'profile', label: '13 sections along the strut, 0.18 ft to the NG-4 socket', tol: 'Flush with the skin ±1/32 in, gear up' },
    { id: 'skin', kind: 'layup', label: `2 × 6781 ±45 over Divinycell HT61 (${fx(coverSkin(), 3)} lb of skin)`, tol: 'No dry spots' }],
  material: { spec: 'Divinycell HT61; 6781; MTM45-1', alt: 'Divinycell HT61', form: 'foam block shaped on the strut', density: null, allowables: [] },
  process: [{ op: 'Shape', spec: 'Bond the foam on the stowed strut, sand to the slot with 1/8 in gaps and flush with the skin; 2 × 6781; cure; bond to the strut.' }],
  checks: ['ngear-stow'], hardware: [], hardwareNote: 'None: bonded.',
  interfaces: [{ id: 'I1', with: 'LEZ-32-220 channel / F22 notch', feature: 'cover', what: 'Inside the channel through the swing (stow check)', check: () => I.sweepCheck(['LEZ-32-205']) }],
  tooling: { needed: false, text: 'Feeler gauge; sanding block.' },
  sourcing: { blank: 'Urethane foam 4 × 4 × 18 in; 0.5 yd 6781', vendor: PP_VENDOR.vendor, url: AS + '/menus/cm/foam.html', cost: 20, costAsOf: '2026-11-18', perAircraft: 1, lead: 'Stock', note: 'Approximate.' },
});

void KIN; void DOOR; void SWF; void NOSE_SW; void USTOP; void NG4; void FORK; void ARM; void HOUSING; void LINK; void WHEEL; void DR; void FLAG; void coverSkin; void SW_WIRE; void GEARBOX_LB; void PLATE; void NG6; void DSTOP; void NG3; void SHELF; void DISC; void BOLTS; void secIn; void plateTapes; void I; void an; void SZ; void AS; void E;
