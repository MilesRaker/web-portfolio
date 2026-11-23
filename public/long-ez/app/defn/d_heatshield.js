// LEZ-32-315 brake heat shield, right one drawn (left the mirror): 0.025 in 321 stainless sheet clamped between the bow's
// leg end and the axle flange, so the disc faces steel 1.35 in away. Solid: cad/d_prims.py. Notional.
import { SHIELD_P, STACK } from '../parts/wpD2_brakes.js';
import { AXB, BOW, S0, ZAX } from '../parts/wpD1_gear.js';
import { primVolumes, primMass } from './d_prims.js';

const fx = (x, n = 2) => x.toFixed(n), RHO = { sheet: 0.286 }, P = SHIELD_P.prims[0];
export const SHD_DEF = {
  pn: 'LEZ-32-315', rev: 'A', status: 'released', nha: 'LEZ-32-310', qty: 2, kind: 'machined',
  title: 'Brake heat shield',
  revs: [{ rev: 'A', date: '2026-11-18', short: 'Initial definition', change: `Initial definition. It was a sheet on stand-offs inside the wheel pant, 0.80 in from the caliper. With the leg end now inboard of the brake, the glass nearest the disc is the leg: the shield is clamped under the axle flange, ${fx(STACK.disc0 - STACK.x1)} in from the disc face and ${fx(STACK.cal[0] - STACK.x1)} in from the caliper.` }],
  effectivity: 'Left and right (identical; mirror placement)', params: SHIELD_P,
  datums: [{ id: 'A', what: `Face on the leg end, BL ${BOW.legFace}` }, { id: 'B', what: `Axle centre, FS ${fx(S0, 1)}, WL ${fx(ZAX)}` }],
  features: [{ id: 'sheet', kind: 'plate', label: `${fx(P.d[1])} × ${fx(P.d[2])} × ${P.d[0]} in 321 stainless, ${fx(ZAX - P.c[2] + P.d[2] / 2)} below B; 4 × Ø${fx(AXB.D + 0.006, 3)} on ±${AXB.a} × ±${AXB.b} from B`, tol: 'Holes ±0.010 (drilled with the axle flange as the guide)' }],
  tolerances: { general: '.XX ±0.03', holes: 'With the flange', breakEdges: 'Deburr' },
  drawingNotes: ['Right shown; left identical.'], generalNote: 'Flat within 0.02 in.', na: { cut: 'Sheared rectangle with 4 holes: no flat pattern needed', layup: 'Metal part' },
  material: { spec: 'AMS 5510 321 stainless sheet, 0.025 in', alt: 'AMS 5513 304', form: '0.025 sheet', density: RHO.sheet, allowables: [['321 continuous service', '1,500 °F', 'MMPDS-typical']] },
  process: [{ op: 'Machine', spec: 'Shear to size; drill the holes with the axle flange as the guide.' }, { op: 'Install', spec: 'Between the leg end and the axle flange under the 4 axle bolts.' }],
  checks: ['gear-pant-heat'],
  rules: [{ id: 'disc', label: 'Disc face to the shield ≥ 1 in', v: STACK.disc0 - STACK.x1, min: 1 }, { id: 'cal', label: 'Caliper to the shield ≥ 0.95 in', v: STACK.cal[0] - STACK.x1, min: 0.95 }, { id: 'cover', label: 'Covers the leg end fore-aft (in)', v: P.d[1] - BOW.w1, min: 0.5 }],
  mass: { each: primMass(primVolumes(SHIELD_P), RHO), from: 'solid volume × 0.286 lb/in³' },
  hardware: [], hardwareNote: 'Clamped by the LEZ-32-310 axle bolts.',
  interfaces: [{ id: 'I1', with: 'LEZ-32-310 axle flange and LEZ-32-170 leg end', feature: 'sheet', what: 'Holes on the axle pattern', check: () => ({ ok: SHIELD_P.cuts.length === 4 && STACK.face === BOW.legFace, detail: `4 holes on ±${AXB.a} × ±${AXB.b}, face BL ${BOW.legFace}` }) }],
  tooling: { needed: false, text: 'None.' },
  sourcing: { blank: '0.025 × 6 × 6 in 321 sheet', vendor: 'Aircraft Spruce (stainless sheet)', url: 'https://www.aircraftspruce.com/menus/mp/stainlesssteelsheet.html', cost: 12.0, costAsOf: '2026-11-18', perAircraft: 2, lead: 'Stock', note: 'Approximate.' },
};
