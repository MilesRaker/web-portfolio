// e_ddrive: block E definition record (see site/defn/e_rec.js). Notional, not for construction.
import { rec, an, fx } from './e_rec.js';
import { NG, KIN, DOOR, SWF, NOSE_SW } from '../parts/ng_layout.js';
import { SIZING } from '../parts/ng_sizing.js';
import { E, PLATE, NG6, DSTOP, USTOP, NG3, NG4, FORK, ARM, HOUSING, SHELF, LINK, WHEEL, DR, DISC, FLAG, BOLTS, secIn, plateTapes, coverSkin, SW_WIRE, GEARBOX_LB } from '../parts/wpE1_nosegear.js';
import * as I from './e_icd.js';
const SZ = SIZING.pick, AS = 'https://www.aircraftspruce.com';
export const DDR = rec({
  pn: 'LEZ-32-232', nha: 'LEZ-32-210', kind: 'mechanism', title: 'Well-door drive: cams, followers, cables',
  change: 'Initial definition: 6061 cams on the cross-shaft ends (profile from the lift law: base circle for the whole stroke, cycloidal rise in the up-lock dwell), roller followers on AN3 pivots off the plates\' outer faces, 1/16 7×7 cables through F22 to nylon fairleads bonded on F28\'s aft face (the fairlead no longer sits inside F28), to the door horns.',
  datums: [{ id: 'A', what: 'Cross-shaft axis' }],
  features: [{ id: 'cam', kind: 'profile', label: 'Cam base Ø3.36, rise 0.14 over the dwell, 0.29 thick, 6061-T6 hard-anodised', tol: 'Profile ±0.005' }, { id: 'follower', kind: 'plate', label: 'Follower: roller arm 0.6, cable arm 2.6', tol: '—' }, { id: 'fairlead', kind: 'profile', label: 'Nylon fairlead on F28 aft face', tol: '—' }, { id: 'cable', kind: 'profile', label: 'MIL-DTL-83420 1/16 7×7', tol: '—' }],
  material: { spec: '6061-T6 (cams); 4130 (followers); nylon; MIL-DTL-83420 cable', alt: '—', form: 'bar, cable', density: null, allowables: [['Cable break', '480 lb', 'MIL-DTL-83420']] },
  process: [{ op: 'Install', spec: 'Cams keyed on the shaft; followers on their pivots; cables through F22 grommets and the F28 fairleads to the horns; turnbuckles; rig.' }],
  checks: ['ngear-door-load', 'ngear-door-clear'], hardware: [{ std: 'MS21251-B2S', qty: 2, desc: 'turnbuckles' }, { std: 'MS51844-2', qty: 4, desc: 'Nicopress sleeves' }, { std: 'AN3-12A', qty: 2, desc: 'follower pivots' }, { std: 'MS35489-6', qty: 2, desc: 'F22 grommets' }],
  hardwareNote: 'Turnbuckles safety-wired.', interfaces: [{ id: 'I1', with: 'LEZ-53-160 F22', feature: 'cable', what: 'Cables inside their F22 holes', check: I.cablesThroughF22 }, I.OPEN_BATTERY, I.OPEN_FAIRLEAD],
  tooling: { needed: false, text: 'Cable tension gauge.' },
  sourcing: { blank: '6061 bar 3.5 dia × 0.6; cable 1/16 × 10 ft', vendor: 'Aircraft Spruce', url: AS + '/menus/ah/main.html', cost: 60, costAsOf: '2026-11-18', perAircraft: 1, lead: 'Stock', note: 'Approximate.' },
});

void KIN; void DOOR; void SWF; void NOSE_SW; void USTOP; void NG4; void FORK; void ARM; void HOUSING; void LINK; void WHEEL; void DR; void FLAG; void coverSkin; void SW_WIRE; void GEARBOX_LB; void PLATE; void NG6; void DSTOP; void NG3; void SHELF; void DISC; void BOLTS; void secIn; void plateTapes; void I; void an; void SZ; void AS; void E;
