// e_wheel: block E definition record (see site/defn/e_rec.js). Notional, not for construction.
import { rec, an, fx } from './e_rec.js';
import { NG, KIN, DOOR, SWF, NOSE_SW } from '../parts/ng_layout.js';
import { SIZING } from '../parts/ng_sizing.js';
import { E, PLATE, NG6, DSTOP, USTOP, NG3, NG4, FORK, ARM, HOUSING, SHELF, LINK, WHEEL, DR, DISC, FLAG, BOLTS, secIn, plateTapes, coverSkin, SW_WIRE, GEARBOX_LB } from '../parts/wpE1_nosegear.js';
import * as I from './e_icd.js';
const SZ = SIZING.pick, AS = 'https://www.aircraftspruce.com';
export const WHL = rec({
  pn: 'LEZ-32-207', nha: 'LEZ-32-200', kind: 'cots', title: 'Nose wheel and tyre (2.80/2.50-4)',
  change: `Initial definition: vendor envelope (tyre Ø10.2 × 2.8, rim Ø4.5, hub ±${WHEEL.hubY} on a 5/8 bore); weights typed from memory (tyre and tube ${WHEEL.lb.tyre} lb, rim ${WHEEL.lb.rim}, hub and bearings ${WHEEL.lb.hub}). The hub was ±1.54 against the fork bosses at ±1.47: now ±${WHEEL.hubY} with spacers.`,
  datums: [{ id: 'A', what: `Axle, FS ${fx(E.AX[1])}, WL ${fx(E.AX[2])}` }],
  features: [{ id: 'tyre', kind: 'profile', label: 'Tyre 2.80/2.50-4 4-ply, OD 10.2 × 2.8 (typed from memory)', tol: 'Vendor' }, { id: 'rim', kind: 'profile', label: 'Split rim halves Ø4.5', tol: 'Vendor' }, { id: 'hub', kind: 'profile', label: 'Hub ±1.35 with sealed 5/8 ball bearings', tol: 'Vendor' }],
  material: { spec: 'Azusa 280/250-4 tyre (AS 06-01287) and tube (06-01288) on a 4 in split-hub wheel', alt: 'Any 2.80/2.50-4 tyre of the same OD and width', form: 'bought complete', density: null, allowables: [['Tyre load', '≥ 300 lb static (typed from memory)', 'VENDOR']] },
  process: [{ op: 'Assemble', spec: 'Tube and tyre on the halves; through-bolts per the vendor; inflate per the sidewall.' }],
  checks: [], na: { cut: 'Bought in', layup: 'Bought in' }, hardware: [], hardwareNote: 'Wheel through-bolts come with the wheel; axle and spacers in LEZ-32-206.',
  interfaces: [{ id: 'I1', with: 'LEZ-32-206 fork', feature: 'hub', what: 'Hub between the axle bosses', check: I.hubInFork }, { id: 'I2', with: 'LEZ-32-220 well', feature: 'tyre', what: 'Stows with clearance (ngear-stow)', check: () => ({ ok: WHEEL.tyreR + WHEEL.tyreR2 <= NG.R * 12 + 1e-6, detail: `envelope R ${fx(WHEEL.tyreR + WHEEL.tyreR2)} = the stow check's ${fx(NG.R * 12)}` }) },
    { id: 'I3', with: 'LEZ-53-150 nose opening, F22 / F28 notches, door hardware', feature: 'tyre', what: 'Swept wheel inside the opening and clear of the door hardware', check: () => { const a = I.sweepCheck(['LEZ-32-207']), b = I.hingeSweep(); return { ok: a.ok && b.ok, detail: `${a.detail}; ${b.detail}` }; } }],
  tooling: { needed: false, text: 'None.' },
  sourcing: { blank: '—', vendor: 'Aircraft Spruce (Azusa 06-01287 tyre, 06-01288 tube, 4 in wheel)', url: AS + '/menus/lg/wheelsbrakes.html', cost: 95, costAsOf: '2026-11-18', perAircraft: 1, lead: 'Stock', note: 'Approximate prices typed from memory.' },
});

void KIN; void DOOR; void SWF; void NOSE_SW; void USTOP; void NG4; void FORK; void ARM; void HOUSING; void LINK; void WHEEL; void DR; void FLAG; void coverSkin; void SW_WIRE; void GEARBOX_LB; void PLATE; void NG6; void DSTOP; void NG3; void SHELF; void DISC; void BOLTS; void secIn; void plateTapes; void I; void an; void SZ; void AS; void E;
