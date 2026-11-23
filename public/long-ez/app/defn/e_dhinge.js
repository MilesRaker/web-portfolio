// e_dhinge: block E definition record (see site/defn/e_rec.js). Notional, not for construction.
import { rec, an, fx } from './e_rec.js';
import { NG, KIN, DOOR, SWF, NOSE_SW } from '../parts/ng_layout.js';
import { SIZING } from '../parts/ng_sizing.js';
import { E, PLATE, NG6, DSTOP, USTOP, NG3, NG4, FORK, ARM, HOUSING, SHELF, LINK, WHEEL, DR, DISC, FLAG, BOLTS, secIn, plateTapes, coverSkin, SW_WIRE, GEARBOX_LB } from '../parts/wpE1_nosegear.js';
import * as I from './e_icd.js';
const SZ = SIZING.pick, AS = 'https://www.aircraftspruce.com';
export const DHG = rec({
  pn: 'LEZ-32-231', nha: 'LEZ-32-230', qty: 2, kind: 'weldment', effectivity: 'Left and right (mirror pair)', title: 'Door torque tubes and hinges (L/R)',
  change: 'Initial definition: 1/4 × 0.035 4130 torque tube along each door\'s outboard edge, closing horn at its forward end, 0.118 music-wire torsion spring, three 6061 bushed brackets on the well wall (forward of the door, and in the door\'s two notches).',
  datums: [{ id: 'A', what: 'Torque-tube axis' }],
  features: [{ id: 'tube', kind: 'tube', label: '1/4 × 0.035 4130, FS 29.28–40.32', tol: 'Straight 0.010' }, { id: 'horn', kind: 'tube', label: 'Horn 1/8 rod 0.45 in, up when shut', tol: '—' }, { id: 'spring', kind: 'profile', label: 'Torsion spring 0.118 music wire', tol: '—' }, { id: 'bracket', kind: 'plate', label: '6061 brackets 0.42 long, NAS75-4 bushings', tol: 'Bores coaxial 0.005' }],
  material: { spec: 'MIL-T-6736 4130 tube; ASTM A228 music wire; 6061-T6', alt: '—', form: 'tube, wire, bar', density: null, allowables: [] },
  process: [{ op: 'Weld', spec: 'Weld the horn to the tube; normalise; bush the brackets; fit the spring with preload.' }],
  checks: ['ngear-door-clear', 'ngear-door-load'], hardware: [{ std: 'SAE 841 sleeve 1/4 × 5/16 × 3/8', qty: 3, desc: 'sintered-bronze bushings, 1/4 ID × 5/16 OD × 3/8 long, pressed into the brackets (2026-11-22, was NAS75-4 Ø0.375 OD: the thinner wall lets the brackets clear the swept fork legs)' }, { std: 'AN3-4A', qty: 6, desc: 'bracket bolts into the well-wall nutplates' }],
  hardwareNote: 'Per side.', interfaces: [{ id: 'I1', with: 'LEZ-32-220 well wall', feature: 'bracket', what: 'Brackets on the wall inner face', check: I.bracketsOnWall },
    { id: 'I2', with: 'LEZ-32-206 fork, -207 wheel (swept)', feature: 'bracket', what: 'Tube, brackets, spring and horn clear the swept fork and wheel', check: I.hingeSweep }],
  tooling: { needed: false, text: 'Bracket line-up rod.' },
  sourcing: { blank: '4130 tube 1/4 × 0.035 × 12; 6061 bar', vendor: 'Aircraft Spruce', url: AS + '/menus/mp/tubing.html', cost: 20, costAsOf: '2026-11-18', perAircraft: 2, lead: 'Stock', note: 'Approximate.' },
});

void KIN; void DOOR; void SWF; void NOSE_SW; void USTOP; void NG4; void FORK; void ARM; void HOUSING; void LINK; void WHEEL; void DR; void FLAG; void coverSkin; void SW_WIRE; void GEARBOX_LB; void PLATE; void NG6; void DSTOP; void NG3; void SHELF; void DISC; void BOLTS; void secIn; void plateTapes; void I; void an; void SZ; void AS; void E;
DHG.rev = 'B';
DHG.revs.push({ rev: 'B', date: '2026-11-18', short: 'Brackets and spring out of the fork sweep', change: 'Interface check (block E ICD, hingeSweep): the swept fork legs passed 0.07 in from the forward bracket and 0.10 in from the torsion spring, the axle bosses 0.13 in from the middle bracket (FS 35.4). The middle bracket moves aft to FS 36.0–36.42, out of the band the fork sweeps past the hinge line (FS 29–35.5); the spring moves beside it (FS 36.52–37.32, anchored to it); the brackets\' inner faces move out from BL 1.85 to 1.92 (bushing wall), so the forward bracket, which stays by the horn, clears the swept legs.' });
