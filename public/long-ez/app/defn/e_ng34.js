// e_ng34: block E definition record (see site/defn/e_rec.js). Notional, not for construction.
import { rec, an, fx } from './e_rec.js';
import { NG, KIN, DOOR, SWF, NOSE_SW } from '../parts/ng_layout.js';
import { SIZING } from '../parts/ng_sizing.js';
import { E, PLATE, NG6, DSTOP, USTOP, NG3, NG4, FORK, ARM, HOUSING, SHELF, LINK, WHEEL, DR, DISC, FLAG, BOLTS, secIn, plateTapes, coverSkin, SW_WIRE, GEARBOX_LB } from '../parts/wpE1_nosegear.js';
import * as I from './e_icd.js';
const SZ = SIZING.pick, AS = 'https://www.aircraftspruce.com';
export const NG34 = rec({
  pn: 'LEZ-32-204', nha: 'LEZ-32-200', kind: 'weldment', title: 'NG-3 clevis and NG-4 fork head',
  change: `Initial definition. NG-3: 4130 ${NG3.wall} in half-shells round the strut's deepest station (following its taper), welded clevis ears ${SZ.ear.t} in with a ${NG3.gap} in gap for the rod end, held by 2 × AN4 through the strut (the link force is 93 % along the strut: the block model's band had no positive hold, ngear-ng3bolt). NG-4: a ${NG4.wall} in socket on the strut tip, a ${NG4.plate} in end plate and a ${2 * NG4.spR} × ${fx(NG4.spR - NG4.spRi)} 4130 caster spindle; the block model's 3/8 in pin could not carry the fork moment (ngear-caster).`,
  datums: [{ id: 'A', what: 'Strut axis' }, { id: 'B', what: `NG-3 pin, ${fx(E.c)} in below the hinge, ${fx(E.cn)} in aft of the axis` }],
  features: [{ id: 'ng3', kind: 'plate', label: `NG-3 shells ${NG3.wall} 4130 N, ${fx(NG3.u1 - NG3.u0)} in long, 2 × Ø0.257 lateral`, tol: 'Fit to the strut with a flox bed' }, { id: 'ear', kind: 'plate', label: `Ears ${SZ.ear.t} × 1.1 in, pin Ø0.257 ${fx(E.cn)} in off the axis (e 0.40)`, tol: `Pin ${fx(E.c)} ± 0.03 in from the hinge` },
    { id: 'ng4', kind: 'plate', label: `NG-4 socket ${NG4.wall} wall × ${NG4.L} in, end plate ${NG4.plate}, AN4 cross bolt`, tol: 'Socket on the strut axis ±0.02' }, { id: 'spindle', kind: 'tube', label: `Caster spindle ${2 * NG4.spR} × ${fx(NG4.spR - NG4.spRi)} 4130, welded to the end plate, on the strut axis`, tol: 'Square to the end plate ±0.25°' }],
  material: { spec: 'MIL-S-18729 4130 N sheet 0.065/0.080; MIL-T-6736 4130 tube 1.125 × 0.120', alt: '—', form: 'sheet and tube, TIG-welded, normalised', density: null, allowables: [['4130 N F_tu / F_bru', '90 / 125 ksi', 'MMPDS-typical']] },
  process: [{ op: 'Weld', spec: 'Form the shells on a strut-shaped mandrel; weld the ears; weld the spindle to the NG-4 end plate in a fixture; normalise; prime.' }, { op: 'Install', spec: 'Flox-bed on the strut in the jig; drill through; AN4 bolts.' }],
  checks: ['ngear-ng3', 'ngear-ng3bolt', 'ngear-caster'],
  rules: [{ id: 'eD', label: 'Ear end distance e/D ≥ 1.5', v: 0.40 / 0.25 / 1.5, min: 1 }],
  hardware: [{ std: an(4, secIn(BOLTS.ng3[0]).b + 2 * NG3.wall), qty: 2, desc: 'NG-3 bolts through the strut' }, { std: an(4, secIn(E.Ls).b + 2 * NG4.wall), qty: 1, desc: 'NG-4 cross bolt' }, { std: 'MS21042L4', qty: 3, desc: 'nuts' }],
  hardwareNote: 'The link pin at NG-3 belongs to LEZ-32-213.',
  interfaces: [{ id: 'I1', with: 'LEZ-32-213 rod end', feature: 'ear', what: 'Rod end and spacers fill the gap', check: () => ({ ok: NG3.gap >= 2 * LINK.endY + 0.1, detail: `gap ${NG3.gap} in, rod end ${fx(2 * LINK.endY)} in + 2 × AN960-416L spacers` }) },
    { id: 'I2', with: 'LEZ-32-206 fork boss', feature: 'spindle', what: 'Spindle in the boss bushings', check: () => ({ ok: FORK.bossRi > NG4.spR, detail: `spindle Ø${2 * NG4.spR}, bushing bore Ø${fx(2 * NG4.spR + 0.002, 3)} in the boss Ø${fx(2 * FORK.bossRi)}` }) }],
  tooling: { needed: true, text: 'Strut-shaped forming mandrel; spindle weld fixture; strut drill jig.' },
  sourcing: { blank: '4130 N 0.080 sheet 6 × 6; 0.065 sheet 6 × 6; 4130 tube 1.125 × 0.120 × 3', vendor: 'Aircraft Spruce (4130 sheet and tube)', url: AS + '/menus/mp/steelsheet.html', cost: 60, costAsOf: '2026-11-18', perAircraft: 1, lead: 'Stock', note: 'Approximate (typed from memory).' },
});

void KIN; void DOOR; void SWF; void NOSE_SW; void USTOP; void NG4; void FORK; void ARM; void HOUSING; void LINK; void WHEEL; void DR; void FLAG; void coverSkin; void SW_WIRE; void GEARBOX_LB; void PLATE; void NG6; void DSTOP; void NG3; void SHELF; void DISC; void BOLTS; void secIn; void plateTapes; void I; void an; void SZ; void AS; void E;
