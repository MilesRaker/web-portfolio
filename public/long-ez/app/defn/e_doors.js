// e_doors: block E definition record (see site/defn/e_rec.js). Notional, not for construction.
import { rec, an, fx } from './e_rec.js';
import { NG, KIN, DOOR, SWF, NOSE_SW } from '../parts/ng_layout.js';
import { SIZING } from '../parts/ng_sizing.js';
import { E, PLATE, NG6, DSTOP, USTOP, NG3, NG4, FORK, ARM, HOUSING, SHELF, LINK, WHEEL, DR, DISC, FLAG, BOLTS, secIn, plateTapes, coverSkin, SW_WIRE, GEARBOX_LB } from '../parts/wpE1_nosegear.js';
import * as I from './e_icd.js';
const SZ = SIZING.pick, AS = 'https://www.aircraftspruce.com';
export const DRS = rec({
  pn: 'LEZ-32-230', nha: 'LEZ-32-220', qty: 2, kind: 'laminate', effectivity: 'Left and right (mirror pair)', title: 'Nose-wheel well doors (L/R)',
  templates: 'None: moulded on the belly over the cut-out', solidText: 'CadQuery solid: ruled lofts on the belly, notched at the hinge brackets',
  change: `Initial definition: 2 BID / 1/16 PVC / 2 BID (${fx(DR.t, 3)} in), moulded on the belly; notched at the middle and aft hinge brackets so the opening door clears them (the block model's brackets lay in the door's swing). Outer edge BL ${fx(DOOR.yOut * 12, 3)}.`,
  datums: [{ id: 'A', what: 'Torque-tube axis' }],
  features: [{ id: 'door', kind: 'layup', label: `2 × 6781 / H80 1/16 / 2 × 6781, FS ${fx(DOOR.s0 * 12)}–${fx(DOOR.s1 * 12)}, BL ${fx(DOOR.yIn * 12, 3)}–${fx(DOOR.yOut * 12, 3)}; notches BL ≥ ${DR.notchY} at FS ${DR.brk[1].join('–')} and ${DR.brk[2][0]}+`, tol: 'Flush ±1/32 closed' }],
  material: { spec: '6781, Divinycell H80 1/16, MTM45-1', alt: '—', form: 'moulded on the aircraft', density: null, allowables: [] },
  process: [{ op: 'Mould', spec: 'Release the belly over the cut-out; lay up; cure; trim to the opening with 1/8 in gaps; notch at the brackets; bond the torque tube with flox and 2 × 6781.' }],
  checks: ['ngear-door-clear', 'ngear-door-load'], hardware: [], hardwareNote: 'Bonded to the torque tube (LEZ-32-231).',
  interfaces: [{ id: 'I1', with: 'LEZ-32-231 brackets', feature: 'door', what: 'Notches clear the brackets by 0.05 in', check: I.doorNotches },
    { id: 'I2', with: 'LEZ-53-150 nose opening (rev F)', feature: 'door', what: 'Outer edge 1/8 in inside the cut edge', check: I.doorToCut }],
  tooling: { needed: true, text: 'The belly as the mould (release film), trim template.' },
  sourcing: { blank: '6781 0.5 yd; H80 1/16 sheet', vendor: 'Aircraft Spruce', url: AS + '/menus/cm/fiberglasscloth.html', cost: 15, costAsOf: '2026-11-18', perAircraft: 2, lead: 'Stock', note: 'Approximate.' },
});

void KIN; void DOOR; void SWF; void NOSE_SW; void USTOP; void NG4; void FORK; void ARM; void HOUSING; void LINK; void WHEEL; void DR; void FLAG; void coverSkin; void SW_WIRE; void GEARBOX_LB; void PLATE; void NG6; void DSTOP; void NG3; void SHELF; void DISC; void BOLTS; void secIn; void plateTapes; void I; void an; void SZ; void AS; void E;
DRS.rev = 'B';
DRS.revs.push({ rev: 'B', date: '2026-11-18', short: 'Middle notch follows the bracket', change: 'The middle hinge bracket LEZ-32-231 moved aft to FS 36.0–36.42 (out of the fork sweep); the door\'s middle notch moves with it.' });
