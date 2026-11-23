// e_well: block E definition record (see site/defn/e_rec.js). Notional, not for construction.
import { rec, an, fx } from './e_rec.js';
import { NG, KIN, DOOR, SWF, NOSE_SW } from '../parts/ng_layout.js';
import { SIZING } from '../parts/ng_sizing.js';
import { E, PLATE, NG6, DSTOP, USTOP, NG3, NG4, FORK, ARM, HOUSING, SHELF, LINK, WHEEL, DR, DISC, FLAG, BOLTS, secIn, plateTapes, coverSkin, SW_WIRE, GEARBOX_LB } from '../parts/wpE1_nosegear.js';
import * as I from './e_icd.js';
import { LAM_ALLOW, LAM_SPEC, LAM_FORM, LAM_CURE, ppBuy, PP_VENDOR, PP_PRICE } from './p_common.js';
const SZ = SIZING.pick, AS = 'https://www.aircraftspruce.com';
export const WEL = rec({
  pn: 'LEZ-32-220', nha: 'LEZ-32-200', kind: 'laminate', title: 'NB nose-wheel well and strut channel',
  templates: 'Foam plug of the swept tyre envelope (the shell is laid over it)', solidText: 'CadQuery solid: side walls, ceiling band and forward wall of the well and the channel, 2 × 6781',
  change: 'Initial definition: 2 BID shell (0.03 in) over a plug of the swept tyre, walls at BL ±2.28 (well) and ±2.04 (channel) standing on the inner skin; ceiling to the contour; forward wall at FS 29.04 over the channel. Bonded to the inner skin along the slot and to the panel\'s forward face.',
  datums: [{ id: 'A', what: 'Centre line' }, { id: 'B', what: 'Inner skin' }],
  features: [{ id: 'well', kind: 'layup', label: '2 × 6781 ±45 (0.03 in), well FS 29.04–40.44, inner faces BL ±2.28, ceiling WL 36.6 → 31.6', tol: 'Inner surfaces ±1/16 in' }, { id: 'chan', kind: 'layup', label: '2 × 6781 channel F22 + 0.25 → FS 29.04, BL ±2.04, top WL 31.92', tol: '±1/16 in' }],
  material: { spec: '6781, MTM45-1', alt: '—', form: 'moulded shell', density: null, allowables: [] },
  process: [{ op: 'Lay up', spec: '2 × 6781 over the waxed plug; cure; trim to the skin; bond with flox and 1 × 6781 tape to the inner skin and the panel.' }],
  checks: ['ngear-stow'], hardware: [{ std: 'MS21047-L3', qty: 6, desc: 'nutplates in the wall for the door hinge brackets' }], hardwareNote: 'Hinge bracket bolts in LEZ-32-231.',
  interfaces: [{ id: 'I1', with: 'LEZ-53-150 shell', feature: 'well', what: 'Walls on the inner skin', check: I.wellOnCut }],
  tooling: { needed: true, text: 'Foam plug of the swept tyre and fork; trim template.' },
  sourcing: { blank: '6781 1.5 yd; foam for the plug', vendor: PP_VENDOR.vendor, url: AS + '/menus/cm/fiberglasscloth.html', cost: 35, costAsOf: '2026-11-18', perAircraft: 1, lead: 'Stock', note: 'Approximate.' },
});

void KIN; void DOOR; void SWF; void NOSE_SW; void USTOP; void NG4; void FORK; void ARM; void HOUSING; void LINK; void WHEEL; void DR; void FLAG; void coverSkin; void SW_WIRE; void GEARBOX_LB; void PLATE; void NG6; void DSTOP; void NG3; void SHELF; void DISC; void BOLTS; void secIn; void plateTapes; void I; void an; void SZ; void AS; void E;
