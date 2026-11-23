// e_cross: block E definition record (see site/defn/e_rec.js). Notional, not for construction.
import { rec, an, fx } from './e_rec.js';
import { NG, KIN, DOOR, SWF, NOSE_SW } from '../parts/ng_layout.js';
import { SIZING } from '../parts/ng_sizing.js';
import { E, PLATE, NG6, DSTOP, USTOP, NG3, NG4, FORK, ARM, HOUSING, SHELF, LINK, WHEEL, DR, DISC, FLAG, BOLTS, secIn, plateTapes, coverSkin, SW_WIRE, GEARBOX_LB } from '../parts/wpE1_nosegear.js';
import * as I from './e_icd.js';
const SZ = SIZING.pick, AS = 'https://www.aircraftspruce.com';
export const CRS = rec({
  pn: 'LEZ-32-212', nha: 'LEZ-32-210', kind: 'weldment', title: 'Worm wheel, cross-shaft and NG-64',
  change: `Initial definition. Bronze 45-tooth worm wheel on a Ø0.5 4130 cross-shaft between the plates' bearings (cams on its ends, LEZ-32-232); the NG-64 tapered bar ${SZ.arm.w} × ${SZ.arm.t} with its link eye and a stop tab that bears on the gearbox lug at DOWN; and the S12 finger: a 0.10 plate and Ø0.18 rod ${fx(SWF.r * 12, 1)} in from the shaft at ${SWF.ang}° (DOWN), which presses the gear-not-down switch only at the down lock and lifts straight off it (the block model had no actuator, and the switch sat in the link's path).`,
  datums: [{ id: 'A', what: `Cross-shaft axis, FS ${fx(E.A[1])}, WL ${fx(E.A[2])}` }],
  features: [{ id: 'wheel', kind: 'profile', label: `Worm wheel 45 T, pitch Ø${fx(2 * E.WR)}, 0.48 face, SAE 660 bronze, keyed`, tol: 'Backlash at the crank ≤ 1/8 turn' }, { id: 'shaft', kind: 'tube', label: 'Cross-shaft Ø0.5 4130, BL ±3.40', tol: '—' },
    { id: 'arm', kind: 'plate', label: `NG-64 ${SZ.arm.w} × ${SZ.arm.t} 4130 tapered to ${fx(SZ.arm.w * 0.75)}, radius ${fx(NG.r * 12)}, eye Ø0.257; stop tab FS ${ARM.tab.f.join('–')}`, tol: 'Radius ±0.01; over-centre 3–5° on the stop' }, { id: 'finger', kind: 'plate', label: `Finger hub, 0.10 plate and Ø${fx(2 * SWF.rod * 12, 2)} rod BL ${fx(SWF.y0 * 12)}–${fx(SWF.y1 * 12)}`, tol: `Presses the S12 lever ${fx(SWF.over * 12, 3)} at DOWN` }],
  material: { spec: '4130 N bar and plate; SAE 660 bronze wheel', alt: '—', form: 'welded arm and finger on the shaft, normalised', density: null, allowables: [['4130 N F_tu', '90 ksi', 'MMPDS-typical']] },
  process: [{ op: 'Weld', spec: 'Weld NG-64 hub, arm, tab and finger hub to the shaft in the fixture; normalise; key and pin the worm wheel.' }, { op: 'Install', spec: 'Through the plate bearings and the gearbox; cams on the ends; set the finger to press the switch at DOWN.' }],
  checks: ['ngear-arm', 'ngear-lock', 'ngear-cstop'],
  hardware: [{ std: 'MS20066-197', qty: 1, desc: 'Woodruff key, worm wheel (typed from memory)' }, { std: 'MS16562-12', qty: 1, desc: 'spring pin' }], hardwareNote: 'Link pin at the NG-64 eye belongs to LEZ-32-213.',
  interfaces: [{ id: 'I1', with: 'LEZ-32-216 S12', feature: 'finger', what: 'Pressed only at DOWN: C–NC made whenever the gear is not locked down', check: I.s12Sense }, { id: 'I2', with: 'LEZ-32-216 S12', feature: 'finger', what: 'Finger clear of the switch once off DOWN', check: I.s12Clear }, I.OPEN_S12_SENSE],
  tooling: { needed: true, text: 'Weld fixture holding the shaft, the NG-64 radius and the finger angle.' },
  sourcing: { blank: '4130 bar 1/2 × 8; 4130 plate 0.25 × 1 × 5; 0.10 × 1 × 4', vendor: 'Aircraft Spruce (4130); worm wheel from the gearbox vendor', url: AS + '/menus/mp/steelrod.html', cost: 75, costAsOf: '2026-11-18', perAircraft: 1, lead: 'With the gearbox', note: 'Approximate.' },
});

void KIN; void DOOR; void SWF; void NOSE_SW; void USTOP; void NG4; void FORK; void ARM; void HOUSING; void LINK; void WHEEL; void DR; void FLAG; void coverSkin; void SW_WIRE; void GEARBOX_LB; void PLATE; void NG6; void DSTOP; void NG3; void SHELF; void DISC; void BOLTS; void secIn; void plateTapes; void I; void an; void SZ; void AS; void E;
