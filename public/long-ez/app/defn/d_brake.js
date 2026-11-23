// LEZ-32-310 brake with its bolt-on axle and torque plate (bought in), right side drawn: vendor envelope (cad/d_prims.py).
// Notional; sizes and weights typed from memory, to be confirmed on the Matco drawing.
import { BRAKE_P, BRAKE_LB, STACK, CAL_PORT_IN } from '../parts/wpD2_brakes.js';
import { AXB, YC, ZAX, BOW } from '../parts/wpD1_gear.js';
import { partByPN } from '../systems.js';
import { primVolumes, primMass, rhoFrom } from './d_prims.js';
import { SHIELD_P } from '../parts/wpD2_brakes.js';
import { S0 } from '../parts/wpD1_gear.js';

const fx = (x, n = 2) => x.toFixed(n);
export const BRK_RHO = rhoFrom(BRAKE_P, BRAKE_LB);
export const BRK_DEF = {
  pn: 'LEZ-32-310', rev: 'A', status: 'released', nha: 'LEZ-000 (aircraft)', qty: 2, kind: 'cots',
  title: 'Brake, axle and torque plate',
  revs: [{ rev: 'A', date: '2026-11-18', short: 'Initial definition', change: `Initial definition: Matco internal-caliper brake (W51LT kit) with its disc, a torque plate and a bolt-on Ø${fx(2 * STACK.axleR, 3)} axle. Nothing held the axle before: the axle flange and torque plate now bolt laterally through the bow's leg end with 4 × AN${AXB.nb} on ±${AXB.a} × ±${AXB.b} in, the heat shield (LEZ-32-315) under the flange.` }],
  effectivity: 'Left and right (the left is the mirror placement)', params: BRAKE_P,
  datums: [{ id: 'A', what: `Axle centre line, WL ${fx(ZAX)}` }, { id: 'B', what: `Leg face, BL ${BOW.legFace}` }],
  features: [
    { id: 'axle', kind: 'plate', label: `Axle flange 2.8 × 3.2 × 0.25 at BL ${fx(STACK.x1)}–${fx(STACK.x2)}; spindle Ø${fx(2 * STACK.axleR, 3)} to BL ${fx(STACK.axleEnd)}; 4 × Ø${fx(AXB.D + 0.006, 3)} on ±${AXB.a} × ±${AXB.b}`, tol: 'Holes drilled with the plate as the guide' },
    { id: 'plate', kind: 'plate', label: `Torque plate 0.25 at BL ${fx(STACK.x2)}–${fx(STACK.x3)}, up to WL ${fx(ZAX + 3.3)} for the caliper`, tol: 'Vendor' },
    { id: 'disc', kind: 'profile', label: `Disc Ø${fx(2 * STACK.discR)} × ${fx(STACK.disc1 - STACK.disc0, 3)} at BL ${fx(STACK.disc0)}–${fx(STACK.disc1)} (typed from memory), on the wheel hub`, tol: 'Vendor' },
    { id: 'caliper', kind: 'profile', label: `Caliper envelope BL ${STACK.cal[0]}–${STACK.cal[1]}, WL ${STACK.cal[2]}–${STACK.cal[3]}; inlet AN816-3D on top at BL ${fx(CAL_PORT_IN[1])}`, tol: 'Vendor' },
  ],
  tolerances: { general: 'Vendor drawing governs', holes: 'Flange holes match-drilled through the leg end', breakEdges: '—' },
  drawingNotes: ['Bought-in: vendor envelope; confirm sizes, torque and pattern on the Matco drawing.', 'MIL-PRF-5606 fluid; bleed from the caliper bleeder up to the master cylinder.'], generalNote: 'Toe and camber set with shims under the axle flange.',
  na: { cut: 'Bought in', layup: 'Bought in' },
  material: { spec: 'Matco W51LT internal-caliper brake kit with torque plate and bolt-on axle; MIL-PRF-5606', alt: 'Equivalent 5.00-5 brake with the same envelope and KE rating', form: 'bought complete', density: null,
    allowables: [['Rated kinetic energy per brake', '337,932 ft·lb', 'VENDOR (typed from memory)'], ['Brake torque at 450 psi', '4,266 in·lb', 'VENDOR (typed from memory)']] },
  process: [{ op: 'Install', spec: `Shield, axle flange and torque plate on the leg end with 4 × AN${AXB.nb}, shims for toe and camber; caliper on the torque plate; disc on the wheel; bleed.` }, { op: 'Inspect', spec: 'Firm pedal; no leak at 1.5 × the maximum pressure; lining wear per the vendor.' }],
  checks: ['gear-brake-ke', 'gear-pant-heat'],
  rules: [{ id: 'cal', label: 'Caliper to the heat shield (in)', v: STACK.cal[0] - STACK.x1, min: 0.95 }],
  mass: { each: primMass(primVolumes(BRAKE_P), BRK_RHO), from: 'envelope volumes × effective densities from the vendor weights (typed from memory)' },
  hardware: [{ std: `AN${AXB.nb}-${AXB.nb === 5 ? 16 : 15}A`, qty: 4, desc: 'axle bolts laterally through the leg end, flange and torque plate' }, { std: `MS21042L${AXB.nb}`, qty: 4, desc: 'nuts, inboard' }, { std: `AN960-${AXB.nb * 100 + 16}`, qty: 8, desc: 'washers' }],
  hardwareNote: `4 × AN${AXB.nb} each side through leg, shield, flange and torque plate, MS21042L${AXB.nb} nuts; length to the measured grip; torque per AC 43.13-1B table 7-1.`,
  interfaces: [
    { id: 'I1', with: 'LEZ-32-170 leg end and LEZ-32-315 shield', feature: 'axle', what: 'Bolt pattern = the bow\'s axle pattern (FS ±a, WL axle ± b), same holes in the shield, flange seated on the leg face', check: () => {
      const want = [-1, 1].flatMap((a) => [-1, 1].map((b) => [S0 + a * AXB.a, ZAX + b * AXB.b])), on = (cuts) => cuts.length === 4 && want.every((w) => cuts.some((c) => Math.abs(c.a[1] - w[0]) < 1e-6 && Math.abs(c.a[2] - w[1]) < 1e-6 && Math.abs(c.r - (AXB.D + 0.006) / 2) < 1e-3));
      const ok = on(BRAKE_P.cuts) && on(SHIELD_P.cuts) && Math.abs(STACK.face - BOW.legFace) < 1e-9 && Math.abs(BRAKE_P.prims[0].c[0] - BRAKE_P.prims[0].d[0] / 2 - STACK.x1) < 1e-6;
      return { ok, detail: `4 × AN${AXB.nb} on FS ±${AXB.a} × WL ${fx(ZAX - AXB.b)}/${fx(ZAX + AXB.b)} in brake and shield, leg face BL ${BOW.legFace}, flange from BL ${fx(STACK.x1, 3)}` }; } },
    { id: 'I2', with: 'LEZ-32-312 brake line', feature: 'caliper', what: 'Inlet port where the line ends', check: () => { const p = partByPN('LEZ-32-310').ports['IN-R'].at; const d = Math.hypot(p[0] * 12 - CAL_PORT_IN[0], p[1] * 12 - CAL_PORT_IN[1], p[2] * 12 - CAL_PORT_IN[2]); return { ok: d < 1e-6, detail: `IN-R at FS ${fx(CAL_PORT_IN[0])}, BL ${fx(CAL_PORT_IN[1])}, WL ${fx(CAL_PORT_IN[2])}` }; } },
    { id: 'I3', with: 'LEZ-32-300 wheel', feature: 'disc', what: 'Disc on the hub, inboard of the tyre', check: () => ({ ok: STACK.disc1 <= STACK.hub[0] + 1e-9 && STACK.disc1 < YC - 2.475, detail: `disc BL ${fx(STACK.disc0)}–${fx(STACK.disc1)}` }) },
  ],
  tooling: { needed: false, text: 'None beyond the bow\'s axle drill guide (the flange).' },
  sourcing: { blank: '—', vendor: 'Matco mfg (W51LT wheel and brake kit, torque plate, axle) via Aircraft Spruce', url: 'https://www.aircraftspruce.com/menus/lg/wheelsbrakes.html', cost: 1388.0, costAsOf: '2026-11-19', perAircraft: 2, lead: '2–4 weeks', note: 'Matco W51LT wheel / brake / axle kit 06-00568 $1,388 per side (without axle 06-00079 $1,096; Aircraft Spruce, accessed 2026-11-19); the wheel is in this kit, LEZ-32-300 carries the tyre and tube.' },
};
