// LEZ-32-300 main wheel and tyre (bought in), right side drawn: the vendor envelope (cad/d_prims.py). Notional; the vendor
// sizes and weights are typed from memory or public catalogue pages and must be confirmed on the vendor drawing.
import { GEO, aircraft, WEIGHT_CASES, effective, DEFAULT_DESIGN } from '../structures.js';
import { PANT } from '../parts/wp10_induction_gear.js';
import { BOW } from '../parts/wpD1_gear.js';
import { openItem } from './d_icd.js';
import { TYRE } from '../parts/wp10_induction_gear.js';
import { WHEEL_P, WHEEL_LB, STACK } from '../parts/wpD2_brakes.js';
import { YC, ZAX } from '../parts/wpD1_gear.js';
import { primVolumes, primMass, rhoFrom } from './d_prims.js';

const fx = (x, n = 2) => x.toFixed(n);
export const WHL_RHO = rhoFrom(WHEEL_P, WHEEL_LB);
/** heaviest static load on one main (lb), the same weight cases and nose station as gear-tyre-load (wp10) */
const mainLoad = () => { const d = effective(DEFAULT_DESIGN), sN = 2.55; return Math.max(...WEIGHT_CASES.map((wc) => { const a = aircraft(d, wc); return a.W * (a.cg - sN) / (GEO.gear.s - sN) / 2; })); };
const loaded = (W) => TYRE.odMax / 2 - (TYRE.odMax / 2 - TYRE.slr) * W / TYRE.ratedLoad;
export const WHL_DEF = {
  pn: 'LEZ-32-300', rev: 'A', status: 'released', nha: 'LEZ-000 (aircraft)', qty: 2, kind: 'cots',
  title: 'Main wheel and tyre',
  revs: [{ rev: 'A', date: '2026-11-18', short: 'Initial definition', change: `Initial definition: Goodyear Flight Special II 5.00-5 6-ply tyre and tube on the Matco 5.00-5 wheel, on a Ø${fx(2 * STACK.axleR, 3)} bolt-on axle (LEZ-32-310). Envelope from the max inflated tyre; mass split typed from memory (${WHEEL_LB.tyre} lb tyre and tube, ${WHEEL_LB.wheel} lb wheel).` }],
  effectivity: 'Left and right (identical; the left is the mirror placement)', params: WHEEL_P,
  datums: [{ id: 'A', what: `Axle centre line, BL ${fx(YC)} wheel centre-plane, WL ${fx(ZAX)}` }],
  features: [
    { id: 'tyre', kind: 'profile', label: `Tyre 5.00-5 6-ply: Ø${TYRE.odMax} max inflated × ${TYRE.width} wide (typed from memory); rated ${TYRE.ratedLoad} lb, ${TYRE.ratedPsi} psi, ${TYRE.ratedMph} mph`, tol: 'Vendor' },
    { id: 'wheel', kind: 'profile', label: `Wheel 5.00-5, hub Ø${fx(2 * STACK.hub[2])} BL ${fx(STACK.hub[0])}–${fx(STACK.hub[1])}, bearing bore on the Ø${fx(2 * STACK.axleR, 3)} axle; disc on the inboard hub flange`, tol: 'Vendor' },
  ],
  tolerances: { general: 'Vendor drawing governs', holes: 'Bearing fit per the vendor', breakEdges: '—' },
  drawingNotes: ['Bought-in: vendor envelope only; confirm every size on the Matco and Goodyear drawings before use.', 'Service inflation 30 psi at about 600 lb (tyre-load check).'], generalNote: 'Balance the tyre on the wheel.',
  na: { cut: 'Bought in', layup: 'Bought in' },
  material: { spec: 'Goodyear 505C61-8 tyre and inner tube; Matco W51LT 5.00-5 wheel (aluminium halves, 1.25 in taper roller bearings on the AXLE1A axle)', alt: 'Any TSO-C62 5.00-5 6-ply tyre with the same OD and width', form: 'bought complete', density: null,
    allowables: [['Tyre rated load / speed', `${TYRE.ratedLoad} lb / ${TYRE.ratedMph} mph`, 'VENDOR (typed from memory)'], ['Effective density of the envelope', `tyre ${WHL_RHO.tyre.toFixed(4)}, wheel ${WHL_RHO.wheel.toFixed(4)} lb/in³`, 'DERIVED from the vendor weights']] },
  process: [{ op: 'Assemble', spec: 'Mount the tyre and tube on the wheel halves; torque the through-bolts per the vendor; inflate to 30 psi.' }, { op: 'Install', spec: 'Pack the bearings; on the axle with the spacer and axle nut, cotter-pinned; wheel pant on the axle stud.' }],
  checks: ['gear-tyre-load', 'gear-tyre-speed', 'gear-pant-clear'],
  rules: [{ id: 'clear', label: 'Disc inboard of the tyre sidewall (in)', v: YC - TYRE.width / 2 * 1.034 - STACK.disc1, min: 0.25 }],
  mass: { each: primMass(primVolumes(WHEEL_P), WHL_RHO), from: 'envelope volumes × effective densities set from the vendor weights (typed from memory)' },
  hardware: [{ std: 'Matco axle nut and washer (with AXLE1A)', qty: 1, desc: 'axle nut (an AN310-6 is a 3/8 in nut and cannot fit the Ø 1.25 axle)' }, { std: 'MS24665-283', qty: 1, desc: 'cotter pin' }], hardwareNote: 'Axle nut and cotter pin per the vendor; wheel through-bolts come with the wheel.',
  interfaces: [
    { id: 'I1', with: 'LEZ-32-310 axle', feature: 'wheel', what: 'Bearing bore on the axle spindle', check: () => ({ ok: WHEEL_P.prims[1].ri === STACK.axleR && STACK.axleEnd >= STACK.hub[1], detail: `Ø${fx(2 * STACK.axleR, 3)} spindle to BL ${fx(STACK.axleEnd)}, hub to ${fx(STACK.hub[1])}` }) },
    { id: 'I2', with: 'GEO.gear axle height', feature: 'tyre', what: 'Loaded radius at the static main load within 0.1 in of the axle height', check: () => { const W = mainLoad(), r = loaded(W); return { ok: Math.abs(r - GEO.gear.axleZ * 12) <= 0.1, detail: `loaded radius ${fx(r)} in at ${fx(W, 0)} lb, axle WL ${fx(GEO.gear.axleZ * 12)}` }; } },
    openItem('O1', 'wheel pants (block D, no part number yet)', `The pants exist only as PANT (wp10, airframe/dims.py) inside the MainGear mesh: no PN, mass line or mounting. Their inner wall (BL ${fx(YC - PANT.HW * 12)} at axle height) is inboard of the leg end (BL ${BOW.legFace}) and the brake stack, so the leg and the -3 hose pass through it: a cut-out, the pant mounting on the axle flange and its own record are needed (suggest LEZ-32-320)`),
    { id: 'I3', with: 'Wheel pant (airframe model PANT)', feature: 'tyre', what: 'Same tyre size as the pant check', check: () => ({ ok: WHEEL_P.prims[0].r === TYRE.odMax / 2, detail: `Ø${TYRE.odMax} × ${TYRE.width}` }) },
  ],
  tooling: { needed: false, text: 'None: tyre irons and a bearing packer.' },
  sourcing: { blank: '—', vendor: 'Aircraft Spruce (Goodyear 505C61-8 tyre, 5.00-5 tube; Matco wheel and brake kit)', url: 'https://www.aircraftspruce.com/menus/lg/wheelsbrakes.html', cost: 288.85, costAsOf: '2026-11-19', perAircraft: 2, lead: 'Stock', note: 'Goodyear tyre 06-07100 $149.00 + Leakguard tube 06-00755 $139.85 (Aircraft Spruce, accessed 2026-11-19); the Matco wheel is costed in the W51LT kit (LEZ-32-310).' },
};
