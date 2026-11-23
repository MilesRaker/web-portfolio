// e_ng30: block E definition record (see site/defn/e_rec.js). Notional, not for construction.
import { rec, an, fx } from './e_rec.js';
import { NG, KIN, DOOR, SWF, NOSE_SW } from '../parts/ng_layout.js';
import { SIZING } from '../parts/ng_sizing.js';
import { E, PLATE, NG6, DSTOP, USTOP, NG3, NG4, FORK, ARM, HOUSING, SHELF, LINK, WHEEL, DR, DISC, FLAG, BOLTS, secIn, plateTapes, coverSkin, SW_WIRE, GEARBOX_LB } from '../parts/wpE1_nosegear.js';
import * as I from './e_icd.js';
import { LAM_ALLOW, LAM_SPEC, LAM_FORM, LAM_CURE, ppBuy, PP_VENDOR, PP_PRICE } from './p_common.js';
const SZ = SIZING.pick, AS = 'https://www.aircraftspruce.com';
export const NG30 = rec({
  pn: 'LEZ-32-201', nha: 'LEZ-32-200', qty: 2, kind: 'laminate', effectivity: 'Left and right (mirror pair); gearbox, shelf and harness holes in the right plate only', title: 'NG-30 side plates (L/R)',
  templates: 'One plate template with the hard-point and hole positions (the core is cut from sheet, not CNC-milled)', solidText: 'CadQuery solid: faces, core and hard points extruded from the plate profile, the S12 shelf, holes cut',
  change: `Initial definition. The profile ended 0.12 in into F22 and its bottom followed the OML at BL 0, inside the shell sandwich: it now ends 0.03 in (flox) short of F22's doubler face and sits on the inner skin at its own BL. Forward of FS ${fx(PLATE.sCap)} its top is cut to WL ${fx(PLATE.cap)}, under block A's ballast slabs. Hard points (solid BID/flox) take every bolt: HP1 the hinge, NG-8 discs and down-stop; HP2 the cross-shaft bearing, gearbox, follower pivot and S12 shelf; HP3 the up-stop. The hinge doubler F-I01 left the shell book for HP1. The S12 switch sits on a 6061 shelf on the right plate with 2 tapped #6-32 holes; its harness passes a grommet. The pitot line now runs outboard of the plate (wp4).`,
  datums: [{ id: 'A', what: `Inner face, BL ${fx(E.plate.yi)}` }, { id: 'B', what: `Hinge bore, FS ${fx(E.O[1])}, WL ${fx(E.O[2])}` }, { id: 'C', what: `Aft edge, FS ${fx(PLATE.s1, 3)} (on F22)` }],
  features: [
    { id: 'face', kind: 'layup', label: `Faces 3 × 6781 ±45 (0.04 in) each side over 0.34 in Divinycell H100; plate ${fx(E.plate.yo - E.plate.yi)} in thick, FS ${fx(PLATE.s0)}–${fx(PLATE.s1)}, top WL 39.60 aft of FS 15.6`, tol: 'Profile ±1/32 in to the template' },
    { id: 'hp', kind: 'layup', label: 'Hard points HP1 (FS 7.6–11.2), HP2 (FS 10.25–15.45, WL ≥ 33.25), HP3 (FS 16.2–19.0): core replaced by 6781 and flox', tol: 'No voids (tap test)' },
    { id: 'core', kind: 'layup', label: 'Lightening hole FS 15.6–19.4, WL 33.2–36.7, edges flox-closed', tol: '±1/16 in' },
    { id: 'shelf', kind: 'plate', label: `S12 shelf: 0.063 6061-T6 angle, horizontal leg BL ${SHELF.y0}–${fx(E.plate.yi)} at WL ${fx(SHELF.z, 3)}, 2 × #6-32 tapped at BL ${SHELF.screws.map((y) => fx(y)).join(', ')}, FS ${fx(SHELF.screwF)}; 2 × AN3 to HP2`, tol: 'Holes ±0.010' },
  ],
  material: { spec: '6781, MTM45-1; Divinycell H100 0.34 in; cotton flox; shelf AMS-QQ-A-250/11 6061-T6 0.063', alt: 'H80 core', form: 'flat sandwich panel, cut to template', density: null, allowables: [['Tape lap shear (secondary bond)', '1500 psi', 'BOUND (typed from memory)'], ['6781 hard-point bearing', '30 ksi', 'BOUND (typed from memory)']] },
  process: [{ op: 'Lay up', spec: 'Cut the core to the template; rout the hard-point and hole cut-outs; fill with 6781/flox; 3 × 6781 each face; cure flat.' }, { op: 'Drill', spec: 'Match-drill the pair in the box jig (hinge, discs, bearing, stops, pivot); gearbox, shelf and grommet holes in the right plate.' },
    { op: 'Bond', spec: `Flox to F22 and the inner skin; 4-ply 6781 tapes, 1 in onto each, both faces of each plate along F22 and the belly (${fx(plateTapes().area, 0)} in² per plate); notch the tape round any F22 hole beside it.` }],
  checks: ['ngear-ng30', 'ngear-hinge-lat', 'f22-ng'],
  rules: [{ id: 'land', label: 'Plate on F22 doubler, outside the notch (in)', v: E.plate.yi - 2.165, min: 0.10 }],
  hardware: [{ std: 'AN3-5A', qty: 2, desc: 'shelf to the right plate (HP2), MS21042L3 nuts' }, { std: 'MS35489-14', qty: 1, desc: 'grommet, S12 harness' }],
  hardwareNote: 'The plates carry the hinge, gearbox, stop and pivot bolts of their partners (LEZ-32-202, -210, -226, -232).',
  interfaces: [
    { id: 'I1', with: 'LEZ-53-160 F22', feature: 'face', what: 'Aft edge on the doubler face with flox; bottom at F22\'s edge', check: I.plateOnF22 },
    { id: 'I2', with: 'LEZ-53-160 F22 holes', feature: 'face', what: 'No pass-through on the plate land', check: I.landClear },
    { id: 'I3', with: 'LEZ-53-150 shell', feature: 'face', what: 'Bottom on the inner skin at the plate BL', check: I.plateOnSkin },
    { id: 'I4', with: 'LEZ-08-100/105 ballast (A)', feature: 'face', what: 'Top under the lead floor', check: I.ballastClear },
    { id: 'I5', with: 'LEZ-32-216 S12', feature: 'shelf', what: 'Bracket base on the shelf, #6 holes coincide', check: I.s12Host },
    { id: 'I6', with: 'Routed lines (J pitot, I harness)', feature: 'face', what: 'No line inside a plate', check: I.routesVsPlate },
    { id: 'I7', with: 'LEZ-32-210 gearbox', feature: 'hp', what: 'Housing face on the right plate', check: I.housingSeat },
    { id: 'I8', with: 'LEZ-55-120 canard tabs', feature: 'face', what: 'Tab leg on F22 clear of the plates', check: I.tabClear },
    { id: 'I9', with: 'LEZ-53-160 F22 layer stack', feature: 'face', what: 'F22_FWD is F22\'s forward face', check: I.f22Face },
  ],
  tooling: { needed: true, text: 'Plate template; box assembly jig holding both plates, the hinge bore and the cross-shaft bore coaxial, square to the centreline.' },
  sourcing: { blank: 'Divinycell H100 0.375 in, 24 × 12; 6781 1 yd; 6061-T6 0.063 2 × 2 in', vendor: PP_VENDOR.vendor, url: AS + '/menus/cm/foam.html', cost: 45, costAsOf: '2026-11-18', perAircraft: 2, lead: 'Stock', note: 'Approximate per plate (typed from memory).' },
});
void KIN; void DOOR; void SWF; void NOSE_SW; void USTOP; void NG4; void FORK; void ARM; void HOUSING; void LINK; void WHEEL; void DR; void FLAG; void coverSkin; void SW_WIRE; void GEARBOX_LB;
