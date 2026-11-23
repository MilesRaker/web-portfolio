// e_fork: block E definition record (see site/defn/e_rec.js). Notional, not for construction.
import { rec, an, fx } from './e_rec.js';
import { NG, KIN, DOOR, SWF, NOSE_SW } from '../parts/ng_layout.js';
import { SIZING } from '../parts/ng_sizing.js';
import { E, PLATE, NG6, DSTOP, USTOP, NG3, NG4, FORK, ARM, HOUSING, SHELF, LINK, WHEEL, DR, DISC, FLAG, BOLTS, secIn, plateTapes, coverSkin, SW_WIRE, GEARBOX_LB } from '../parts/wpE1_nosegear.js';
import * as I from './e_icd.js';
const SZ = SIZING.pick, AS = 'https://www.aircraftspruce.com';
export const FRK = rec({
  pn: 'LEZ-32-206', nha: 'LEZ-32-200', kind: 'weldment', title: 'Nose fork, caster head and axle',
  change: `Initial definition. The block model's crown sat 2.3 in above the axle, inside the 10.2 in tyre; the fork now drops ${fx(NG.drop * 12)} in from the strut tip with the crown tube 0.4 in over the tyre and ${fx(SZ.Lleg)} in legs. The legs re-sized for that length in the envelope between the tyre and the door torque tubes: ${SZ.leg.h} × ${SZ.leg.b} × ${SZ.leg.w} in oval 4130 (ngear-fork). Caster boss ${2 * FORK.bossR} OD with two bronze bushings on the NG-4 spindle; friction damper under the end plate; AN10 axle.`,
  datums: [{ id: 'A', what: 'Caster axis = strut axis' }, { id: 'B', what: `Axle, FS ${fx(E.AX[1])}, WL ${fx(E.AX[2])}` }],
  features: [{ id: 'leg', kind: 'tube', label: `Legs ${SZ.leg.h} × ${SZ.leg.b} × ${SZ.leg.w} oval (32-gon in the solid), centres BL ±${fx(E.FY, 3)}`, tol: 'Axle bores coaxial 0.005' }, { id: 'crown', kind: 'tube', label: `Crown 7/8 × 0.058, ${fx(E.crownU - E.Ls)} in below the strut tip; AN6 retainer through`, tol: '—' },
    { id: 'boss', kind: 'tube', label: `Caster boss Ø${2 * FORK.bossR} × ${fx(FORK.bossR - FORK.bossRi)} with 2 SAE 660 bushings`, tol: 'Bushing bore reamed to the spindle +0.002' }, { id: 'damper', kind: 'plate', label: `Friction damper Ø${2 * FORK.dampR}, Belleville stack; 3–5 lb breakaway at the tyre`, tol: '—' }, { id: 'axboss', kind: 'tube', label: 'Axle bosses Ø1.2 bored 0.627; axle pin flush with their outer faces, cross-drilled Ø0.191 with each boss for the AN3 retainers', tol: 'Coaxial 0.005' }],
  material: { spec: 'MIL-T-6736 4130 N tube (round 1-5/16 × 0.049 die-flattened for the legs); SAE 660 bushings', alt: '—', form: 'tube, TIG-welded, normalised', density: null, allowables: [['4130 welded F_tu', '80 ksi', 'MMPDS-typical']] },
  process: [{ op: 'Weld', spec: 'Flatten the leg tubes in the die; fish-mouth to the crown; weld legs, crown, boss and axle bosses in the fork fixture; normalise; line-bore the axle bosses; press and ream the bushings.' }, { op: 'Install', spec: 'On the spindle with the damper stack; AN6 retainer through the crown; axle with spacers; set the breakaway.' }],
  checks: ['ngear-fork', 'ngear-axle', 'ngear-caster'],
  hardware: [{ std: `5/8 in axle pin, 4130 HT 125 ksi, ground, ${fx(2 * (E.FY + SZ.leg.b / 2), 3)} long (flush with the bosses)`, qty: 1, desc: 'axle' }, { std: an(3, 2 * FORK.axBossR), qty: 2, desc: 'cross-bolt through each axle boss and the pin' }, { std: 'MS21042L3', qty: 2, desc: 'nut' }, { std: 'AN960-1016', qty: 4, desc: 'washers / hub spacers' }, { std: 'AN6-12A', qty: 1, desc: 'caster retainer through the crown into the spindle cap' }, { std: 'MS21042L6', qty: 1, desc: 'nut' }],
  hardwareNote: 'Axle pin pushed through bosses, spacers and hub; AN3 cross-bolts snug; hub free to turn.',
  interfaces: [{ id: 'I1', with: 'LEZ-32-207 wheel', feature: 'axboss', what: 'Hub between the bosses', check: I.hubInFork }, { id: 'I2', with: 'LEZ-32-207 tyre', feature: 'leg', what: 'Tyre clear of legs and crown', check: I.tyreInFork },
    { id: 'I3', with: 'LEZ-32-230/-231/-232 doors, hinges, cables', feature: 'leg', what: 'Swept fork, axle and wheel clear the door hardware and the open doors', check: I.hingeSweep },
    { id: 'I4', with: 'LEZ-53-150 nose opening, LEZ-53-165 F28 notch (A)', feature: 'leg', what: 'Swept fork inside the opening and the F28 notch', check: () => I.sweepCheck(['LEZ-32-206', 'LEZ-32-207']) }],
  tooling: { needed: true, text: 'Leg flattening die; fork weld fixture with the axle and caster axes; line-boring bar.' },
  sourcing: { blank: '4130 tube 1-5/16 × 0.049 × 16; 7/8 × 0.058 × 5; 1-9/16 × 0.18 × 2; SAE 660 bushings', vendor: 'Aircraft Spruce (4130 tube, bronze bushings)', url: AS + '/menus/mp/tubing.html', cost: 70, costAsOf: '2026-11-18', perAircraft: 1, lead: 'Stock', note: 'Approximate.' },
});

void KIN; void DOOR; void SWF; void NOSE_SW; void USTOP; void NG4; void FORK; void ARM; void HOUSING; void LINK; void WHEEL; void DR; void FLAG; void coverSkin; void SW_WIRE; void GEARBOX_LB; void PLATE; void NG6; void DSTOP; void NG3; void SHELF; void DISC; void BOLTS; void secIn; void plateTapes; void I; void an; void SZ; void AS; void E;
FRK.rev = 'B';
FRK.revs.push({ rev: 'B', date: '2026-11-18', short: 'Flush axle pin', change: 'Interface check (block E ICD, hingeSweep): the AN10 axle bolt, head and nut reaching BL ±2.23, passed 0.12 in through the door torque tubes (inner surface ±2.01) as the wheel rose through the opening, and 0.08 in from the open doors. The axle is now a 5/8 in 4130 pin heat-treated to the AN bolt strength, flush with the axle bosses\' outer faces, held by an AN3 cross-bolt through each boss; ngear-axle keeps the AN10 shear rating.' });
