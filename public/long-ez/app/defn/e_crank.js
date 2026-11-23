// e_crank: block E definition record (see site/defn/e_rec.js). Notional, not for construction.
import { rec, an, fx } from './e_rec.js';
import { NG, KIN, DOOR, SWF, NOSE_SW } from '../parts/ng_layout.js';
import { SIZING } from '../parts/ng_sizing.js';
import { E, PLATE, NG6, DSTOP, USTOP, NG3, NG4, FORK, ARM, HOUSING, SHELF, LINK, WHEEL, DR, DISC, FLAG, BOLTS, secIn, plateTapes, coverSkin, SW_WIRE, GEARBOX_LB } from '../parts/wpE1_nosegear.js';
import * as I from './e_icd.js';
const SZ = SIZING.pick, AS = 'https://www.aircraftspruce.com';
export const CRK = rec({
  pn: 'LEZ-32-214', nha: 'LEZ-32-210', kind: 'mechanism', title: 'U-joint, panel shaft, crank and flag',
  change: `Initial definition: one U-joint over the well, Ø5/16 panel shaft out through LEZ-31-100's crank hole at BL ${fx(NG.crank[1] * 12)}, WL ${fx(NG.crank[2] * 12)} (unchanged, so the released panel is unchanged), ${fx(NG.crankR * 12)} in crank with a Ø0.6 knob. Against the panel's released cut-outs the knob sweep clears every one by ≥ 0.25 in; the 0.18 in clash quoted in B's ICD was against the display faces (LEZ-31-140, -110, the old gear flag) that do not follow the cut-outs. The gear flag moved here, behind B's flag window, driven by a travelling nut on the panel shaft.`,
  datums: [{ id: 'A', what: 'Panel shaft axis at the panel aft face' }],
  features: [{ id: 'ujoint', kind: 'profile', label: 'MS20270 U-joint Ø0.75 × 1.4 (5/16 bores, typed from memory)', tol: 'Angle ≤ 30°' }, { id: 'shaft', kind: 'tube', label: 'Panel shaft Ø0.3125 4130 with a 1/4-28 thread for the flag nut', tol: '—' }, { id: 'crank', kind: 'plate', label: `Crank arm ${fx(NG.crankR * 12)} in, fold-out knob Ø0.6 × 1.2`, tol: '—' }, { id: 'flag', kind: 'plate', label: `Flag guide and blade behind the window BL ${FLAG.win[0]}…${FLAG.win[1]}, WL ${FLAG.win[2]}…${FLAG.win[3]}; green DOWN in the last 1/4 turn`, tol: 'Shows DOWN only with the crank on its stop' }],
  material: { spec: '4130 N bar; MS20270 U-joint; 6061 crank; nylon knob; 6061 0.032 flag', alt: '—', form: 'bar and sheet', density: null, allowables: [] },
  process: [{ op: 'Install', spec: 'U-joint pinned to the worm shaft and the panel shaft; flange bearing in the panel hole; crank pinned; set the flag nut at DOWN.' }],
  checks: ['ngear-crank'],
  hardware: [{ std: 'MS20270-B5', qty: 1, desc: 'U-joint, 5/16 bore (dash typed from memory)' }, { std: 'MS16562-12', qty: 3, desc: 'spring pins' }, { std: 'KFB5', qty: 1, desc: 'flange bearing in the panel (typed from memory)' }],
  hardwareNote: 'Pins safety-staked.',
  interfaces: [{ id: 'I1', with: 'LEZ-31-100 panel cut-outs (B)', feature: 'crank', what: 'Knob sweep ≥ 0.25 in from every cut-out', check: I.crankSweep }, { id: 'I2', with: 'LEZ-31-100 flag window (B)', feature: 'flag', what: 'Flag behind the window', check: I.flagWindow }, I.OPEN_DISPLAY],
  tooling: { needed: false, text: 'None.' },
  sourcing: { blank: '4130 bar 5/16 × 8; 6061 bar; nylon knob', vendor: 'Aircraft Spruce (U-joint, 4130)', url: AS + '/menus/ah/main.html', cost: 65, costAsOf: '2026-11-18', perAircraft: 1, lead: 'Stock', note: 'Approximate.' },
});

void KIN; void DOOR; void SWF; void NOSE_SW; void USTOP; void NG4; void FORK; void ARM; void HOUSING; void LINK; void WHEEL; void DR; void FLAG; void coverSkin; void SW_WIRE; void GEARBOX_LB; void PLATE; void NG6; void DSTOP; void NG3; void SHELF; void DISC; void BOLTS; void secIn; void plateTapes; void I; void an; void SZ; void AS; void E;
