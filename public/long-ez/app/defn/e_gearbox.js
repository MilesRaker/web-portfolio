// e_gearbox: block E definition record (see site/defn/e_rec.js). Notional, not for construction.
import { rec, an, fx } from './e_rec.js';
import { NG, KIN, DOOR, SWF, NOSE_SW } from '../parts/ng_layout.js';
import { SIZING } from '../parts/ng_sizing.js';
import { E, PLATE, NG6, DSTOP, USTOP, NG3, NG4, FORK, ARM, HOUSING, SHELF, LINK, WHEEL, DR, DISC, FLAG, BOLTS, secIn, plateTapes, coverSkin, SW_WIRE, GEARBOX_LB } from '../parts/wpE1_nosegear.js';
import * as I from './e_icd.js';
const SZ = SIZING.pick, AS = 'https://www.aircraftspruce.com';
export const GBX = rec({
  pn: 'LEZ-32-210', nha: 'LEZ-32-200', kind: 'mechanism', title: 'Retract gearbox and crank stop',
  change: `Initial definition: bought worm-gear housing envelope ${fx(HOUSING.f[1] - HOUSING.f[0])} × ${fx(HOUSING.y[1] - HOUSING.y[0])} × ${fx(HOUSING.z[1] - HOUSING.z[0])} in (weight ${GEARBOX_LB.housing} lb typed from memory) whose mounting face sits on the RH NG-30 plate on a 0.04 in shim with 4 × AN4 into tapped bosses (the housing used to stop 0.9 in short of the plate). A 6061 lug under it takes the NG-64 tab at DOWN: the over-centre torque now has a stop (ngear-cstop) instead of the worm teeth. The gear flag moved to LEZ-32-214, behind the panel's flag window. No bearing at F22: the shaft runs in the gearbox and panel bearings.`,
  datums: [{ id: 'A', what: `Mounting face, BL ${fx(HOUSING.y[1])}` }, { id: 'B', what: `Cross-shaft bore, FS ${fx(E.A[1])}, WL ${fx(E.A[2])}` }],
  features: [{ id: 'housing', kind: 'profile', label: `Housing envelope FS ${HOUSING.f.join('–')}, BL ${HOUSING.y.join('–')}, WL ${HOUSING.z.join('–')}; cross-shaft bore Ø0.54, worm bore Ø0.34; 4 × 1/4-28 tapped`, tol: 'Vendor' }, { id: 'lug', kind: 'plate', label: `Stop lug 6061 FS ${HOUSING.lug.f.join('–')}, BL ${HOUSING.lug.y.join('–')}, WL ${HOUSING.lug.z.join('–')}, 2 × AN3 to the housing`, tol: 'Face to the NG-64 tab at DOWN ±0.005 (shim)' }],
  material: { spec: 'Bought single-start worm gearbox (Brock-type pattern), aluminium housing, sealed bearings; lug 6061-T6', alt: 'Shop-made housing to the same envelope', form: 'bought; lug from bar', density: null, allowables: [['6061-T6 F_bry', '56 ksi', 'MMPDS-typical'], ['Housing weight', `${GEARBOX_LB.housing} lb`, 'VENDOR (typed from memory)']] },
  process: [{ op: 'Install', spec: 'Shim to the plate; 4 × AN4; fit the lug and shim it to touch the NG-64 tab with the crank on its over-centre stop.' }],
  checks: ['ngear-cstop', 'ngear-lock'], na: { cut: 'Bought in (lug machined)', layup: 'Not a composite part' },
  hardware: [{ std: an(4, 0.42 + 0.04 + 0.40, 0.06), qty: 4, desc: 'housing to the RH plate, into tapped bosses' }, { std: 'AN960-416', qty: 4, desc: 'washers' }, { std: 'AN3-7A', qty: 2, desc: 'lug to housing' }, { std: 'KP8A', qty: 2, desc: 'flanged cross-shaft bearing in each NG-30 plate (typed from memory)' }],
  hardwareNote: 'Bolts safety-wired in pairs.',
  interfaces: [{ id: 'I1', with: 'LEZ-32-201 RH plate', feature: 'housing', what: 'Mounting face on the plate', check: I.housingSeat }, { id: 'I2', with: 'LEZ-32-212 NG-64 tab', feature: 'lug', what: 'Lug face at the tab at DOWN', check: () => ({ ok: Math.abs(HOUSING.lug.f[0] - ARM.tab.f[1]) < 1e-6, detail: `lug face FS ${HOUSING.lug.f[0]} = tab face ${ARM.tab.f[1]}` }) }],
  tooling: { needed: false, text: 'Shim stock.' },
  sourcing: { blank: '6061-T6 bar 0.5 × 0.8 × 0.5 (lug)', vendor: 'Brock-type worm drive (builder suppliers); hardware Aircraft Spruce', url: AS + '/menus/ah/main.html', cost: 220, costAsOf: '2026-11-18', perAircraft: 1, lead: '4–8 weeks', note: 'Approximate (typed from memory).' },
});

void KIN; void DOOR; void SWF; void NOSE_SW; void USTOP; void NG4; void FORK; void ARM; void HOUSING; void LINK; void WHEEL; void DR; void FLAG; void coverSkin; void SW_WIRE; void GEARBOX_LB; void PLATE; void NG6; void DSTOP; void NG3; void SHELF; void DISC; void BOLTS; void secIn; void plateTapes; void I; void an; void SZ; void AS; void E;
