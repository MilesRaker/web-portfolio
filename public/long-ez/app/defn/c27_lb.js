// LEZ-27-170 landing-brake panel (laminate, lofted on the belly contour), LEZ-27-171 actuator (bought-in envelope),
// LEZ-27-172 actuator harness. Notional.
import { L, LB, MAT, harnessPts } from '../parts/wpC1_controls.js';
import { CAB } from '../parts/wpB4_cabin.js';
import { fusAt, FUS_SHAPE, BASE_MAT } from '../structures.js';
import { PROCESS } from '../plybook.js';
import { makePrimRec, fx, pt, DATE, MEMNOTE } from './c27_common.js';
import { icdIface } from '../parts/wpC9_icd.js';
import { paramHash, want, r4 } from './util.js';
import { LAM_ALLOW, LAM_SPEC, LAM_FORM, LAM_CURE, ppBuy, PP_VENDOR, PP_PRICE } from './p_common.js';

const g = L.lb, tF = 3 * BASE_MAT.BID.t, tC = 0.25;
const sp = (v, e) => Math.sign(v) * Math.abs(v) ** e;
/** belly contour point at FS (in), parameter t, offset off (in, + out): [BL, WL] (the shell's own formula, wp26) */
export function bellyPt(fs, t, off) { const f = fusAt(fs / 12), w = f.w / 2 * 12 + off, h = (f.top - f.bot) / 2 * 12 + off, zc = (f.top + f.bot) / 2 * 12, sn = Math.sin(t); return [w * sp(Math.cos(t), FUS_SHAPE.side), zc + h * sp(sn, sn < 0 ? FUS_SHAPE.belly : FUS_SHAPE.top)]; }
/** half-angle φ about the bottom (t = −π/2 ± φ) where |BL| = y at offset off */
export const phiAt = (fs, y, off) => { const w = fusAt(fs / 12).w / 2 * 12 + off; return Math.asin(Math.min(1, (y / w) ** (1 / FUS_SHAPE.side))); };
function layerPoly(fs, o1, o2, y) {
  const n = 16, a = [], b = [], p1 = phiAt(fs, y, o1), p2 = phiAt(fs, y, o2);
  for (let i = 0; i <= n; i++) { const u = -1 + 2 * i / n; a.push(bellyPt(fs, -Math.PI / 2 + u * p1, o1)); b.push(bellyPt(fs, -Math.PI / 2 + u * p2, o2)); }
  return [...a, ...b.reverse()].map(([y_, z]) => [r4(y_), r4(z)]);
}
export function lbParams() {
  const s0 = g.s0 + g.gap, s1 = g.s1 - g.gap, n = 8, st = Array.from({ length: n + 1 }, (_, i) => r4(s0 + (s1 - s0) * i / n)), y = g.hw - g.gap;
  const LAY = { fo: [0, -tF], core: [-tF, -tF - tC], fi: [-tF - tC, -2 * tF - tC] };
  const segs = st.slice(0, -1).map((a, i) => { const b = st[i + 1], regions = {}; for (const [k, [o1, o2]] of Object.entries(LAY)) regions[k] = [layerPoly(a, o1, o2, y), layerPoly(b, o1, o2, y)];
    return { piece: 'P', ha: a, hb: b, keep: [i === 0, i === n - 1], O: [[0, a, 0], [0, b, 0]], regions }; });
  return { segs, axes: { P: [[1, 0, 0], [0, 0, 1]] }, group: { fo: 'face', fi: 'face', core: 'core' }, feat: { face: 'face', core: 'core' }, n };
}
const area = (p) => Math.abs(p.reduce((a, q, i) => { const r = p[(i + 1) % p.length]; return a + q[0] * r[1] - r[0] * q[1]; }, 0)) / 2;
export function lbVolumes(P = lbParams()) { const V = { face: 0, core: 0 }; for (const s of P.segs) { const Lg = s.hb - s.ha; for (const [k, [a, b]] of Object.entries(s.regions)) { const m = a.map((q, i) => [(q[0] + b[i][0]) / 2, (q[1] + b[i][1]) / 2]); V[P.group[k]] += Lg / 6 * (area(a) + 4 * area(m) + area(b)); } } return V; }
const RHO = { face: MAT.bid.rho, core: MAT.pvc.rho };
export const lbMassOf = (v) => (v.face ?? 0) * RHO.face + (v.core ?? 0) * RHO.core;
export function lbExpect(p, m) { const V = lbVolumes(p); return [want('Face volume (in³)', V.face, m.volumes?.face ?? NaN, Math.max(0.01, V.face * 0.002)), want('Core volume (in³)', V.core, m.volumes?.core ?? NaN, Math.max(0.01, V.core * 0.003)), want('Segments lofted', p.n, m.segments ?? NaN, 0)]; }
const B = LB(), V0 = lbVolumes(), plies = (2 * 3 * (g.s1 - g.s0) * 2 * g.hw / 144 * 1.15);
export const LB_DEF = {
  pn: 'LEZ-27-170', rev: 'A', status: 'released', nha: 'LEZ-27-100', qty: 1, kind: 'laminate', title: 'Landing brake (belly speed brake)', templates: 'T1–T2 (belly contour at FS 62 and FS 78, from the shell mould)',
  solidText: 'CadQuery solid lofted in FS planes on the shell\'s own belly contour (outer face, core, inner face), the opening less the edge gap',
  revs: [{ rev: 'A', date: DATE, short: 'Initial definition', change: `Initial definition. The panel was a 25.2 × 16.2 in flat ASSUMED box with no opening in the shell; its actuator (2 in stroke, 50 lb, 16.85 in aft of the hinge) could neither reach 70° nor hold the airload (ICD F19–F21). As defined the panel is ${fx(g.s1 - g.s0, 1)} × ${fx(2 * g.hw, 1)} in on the belly contour (FS ${g.s0}–${g.s1}, BL ±${g.hw}) in the LEZ-53-150 rev B opening, 3 BID / ${tC} in H45 / 3 BID, hinged at its forward edge; a ${fx(B.a, 2)} in horn 35° forward of vertical takes a 3 in actuator anchored forward on the keel; placard ${g.Vlb} KIAS.` }],
  effectivity: 'One per aircraft', params: lbParams(),
  datums: [{ id: 'A', what: 'Hinge line, FS ' + fx(g.s0, 1) + ' on the belly' }, { id: 'B', what: 'Aircraft centre line' }, { id: 'C', what: 'Belly outer mould line (the shell\'s)' }],
  features: [
    { id: 'outline', kind: 'profile', label: `FS ${fx(g.s0 + g.gap, 2)}–${fx(g.s1 - g.gap, 2)}, BL ±${fx(g.hw - g.gap, 2)} on the belly contour; ${g.gap} in gap to the opening`, tol: 'Flush ±1/16 in closed' },
    { id: 'face', kind: 'layup', label: '3 × 6781 ±45 outer and inner faces, 1 in wrap round the edges', tol: 'Overlaps ≥ 1 in' },
    { id: 'core', kind: 'core', label: `${tC} in Divinycell HT61, edges ramped 45°`, tol: '±0.02' },
    { id: 'horn', kind: 'hole', label: `Horn: 6061-T6 0.19 in plate on a 4 × 6781 pad at BL 0, ${fx(B.a, 2)} in from A at 25° up from the panel (aft of the hinge), AN3 at ${pt(B.horn)}`, tol: 'Hole ±0.010', assy: true },
    { id: 'hinge', kind: 'hinge', label: 'MS20257-P3 hinge along A, 12 in, leaves floxed to the panel and the shell\'s opening edge', tol: 'Pin straight 0.03', assy: true },
  ],
  tolerances: { general: '.X ±0.06 · .XX ±0.03 · contour ±1/32 to the shell', flatness: 'Follows the belly within 1/32', holes: 'Horn holes drilled through the pad', breakEdges: 'Edges sealed with resin' },
  drawingNotes: ['Lay up on the fuselage belly (the shell is the mould) over release film, before the opening is cut free; trim to the gap line.', MEMNOTE],
  generalNote: 'Cured laminate tap-tested; edges sealed.', na: {},
  material: { spec: `6781 S2-glass, MTM45-1, Divinycell HT61 ${tC} in core; 6061-T6 horn; MS20257-P3 hinge`, alt: 'None', form: `${LAM_FORM()}`, density: null,
    allowables: [['6781 ±45 face (design)', '18 ksi (≈ 2 × τ12)', 'BOUND: 7781 prepreg τ12 8.96 ksi, RTD (NIAR/NCAMP CAM-RP-2023-010, wichita.edu, accessed 2026-11-19); prepreg MTM45-1 not published: coupon-test'], ['HT61 shear (minimum)', '67 psi (0.46 MPa)', 'Diab Divinycell H technical data June 2020 rev19, HT61 minimum (accessed 2026-11-19)']] },
  process: [{ op: 'Layup', spec: 'Inner face, core, outer face on the belly over release film inside the opening; cure; cure (M cycle) with the shell.' }, { op: 'Fit', spec: 'Hinge on A, horn on its pad, actuator (LEZ-27-171) on the horn; limit switches set closed-flush and 70°.' }, { op: 'Inspect', spec: 'Closes flush ±1/16 in; opens 70° ±3°; blows back above the placard speed.' }],
  checks: ['c27-lb-panel'],
  rules: [{ id: 'gap', label: 'Edge gap ≥ 0.06 in', v: g.gap, min: 0.06 }, { id: 'aft', label: 'Opening aft of the pilot\'s seat: forward edge aft of the front liner (seat-3) (in)', v: g.s0 - CAB.pan.front.fs[1], min: 0 }],
  mass: { each: lbMassOf(V0), from: 'loft volumes: faces × 6781 density, core × HT61 density' },
  hardware: [{ std: 'MS20257-P3-12', qty: 1, desc: 'Hinge, 12 in' }, { std: 'AN3-5A', qty: 2, desc: 'Horn bolts through the pad' }, { std: 'MS21042L3', qty: 2, desc: 'Nuts' }],
  hardwareNote: 'MS20257-P3 hinge (12 in); horn on 2 × AN3 through a 4 × 6781 pad; actuator clevis bolt in LEZ-27-171.',
  interfaces: [
    { id: 'I1', with: 'LEZ-53-150 fuselage shell (rev B opening)', feature: 'outline', what: 'Panel inside the opening by the gap', check: () => ({ ok: true, detail: `opening FS ${g.s0}–${g.s1}, BL ±${g.hw}; panel ${fx(g.s0 + g.gap, 2)}–${fx(g.s1 - g.gap, 2)}, ±${fx(g.hw - g.gap, 2)}` }) },
    { id: 'I2', with: 'LEZ-27-171 actuator', feature: 'horn', what: 'Horn hole on the actuator rod clevis', check: () => ({ ok: true, detail: `${pt(B.horn)}; stroke used ${fx(B.need, 2)} in of ${B.stroke}` }) },
  ],
  tooling: { needed: true, text: 'The shell belly is the mould (release film); hinge drilling fixture.' },
  sourcing: { blank: `${Math.ceil(plies / 12.5 * 9)} ft² 6781 (6 plies, +15 %); HT61 ${tC} in 2 × 2 ft; 0.3 gal resin`, vendor: PP_VENDOR.vendor, url: PP_VENDOR.url, cost: 48.0, costAsOf: '2026-11-18', perAircraft: 1, lead: 'Stock', note: 'Approximate (typed from memory).' },
};
export const ACT = makePrimRec('LEZ-27-171', {
  nha: 'LEZ-27-170', title: 'Landing-brake actuator, 14 V linear (bought-in)', kind: 'cots', effectivity: 'One per aircraft',
  change: `Initial definition. The actuator was a 2 in / ≥ 50 lb SCD envelope at a point that needed 17.4 in of stroke (ICD F19). As defined: a 3 in stroke, 150 lb class 14 V actuator (Progressive Automations PA-14 class; envelope, stroke, ${B.retracted} in retracted pin to pin and rating typed from memory), anchored on a keel bracket at ${pt(B.A)}, rod clevis on the panel horn; worst required force ${fx(B.F, 0)} lb at ${B.thF}°.`,
  datums: [{ id: 'A', what: 'Anchor clevis pin (lateral)' }, { id: 'B', what: 'Actuator axis' }],
  features: [
    { id: 'body', kind: 'envelope', label: `Body Ø 1.25 × ${fx(B.retracted - 2.1, 2)} in (vendor envelope, motor and gearbox; typed from memory), 2.0 lb`, tol: 'Vendor' },
    { id: 'rod', kind: 'envelope', label: 'Rod Ø 0.5, 3 in stroke, internal limit switches', tol: 'Vendor' },
    { id: 'clevis', kind: 'lug', label: 'Clevis ends with Ø 0.1875 pins (AN3)', tol: 'Vendor' },
    { id: 'bracket', kind: 'block', label: `Anchor bracket 6061-T6 1.5 × 1.5 × 0.5 in on a hard point in the front seat back's aft face (LEZ-53-170) at ${pt(B.A)} (seat-3; was a keel bracket under the pilot's seat)`, tol: '—' },
  ],
  checks: ['c27-lb-actuator'], rules: [{ id: 'stroke', label: 'Stroke used within the actuator\'s stroke (in)', v: B.stroke - B.need, min: 0 }, { id: 'force', label: 'Peak force within the rating (lb)', v: B.rated - B.F, min: 0 }],
  hardware: [{ std: 'AN3-7A', qty: 2, desc: 'Clevis pins' }, { std: 'AN310-3', qty: 2, desc: 'Castle nuts' }, { std: 'MS24665-132', qty: 2, desc: 'Cotter pins' }],
  hardwareNote: 'Both clevises on AN3 bolts with castle nuts and cotter pins.', na: { cut: 'Bought-in', layup: 'Bought-in' }, tolerances: { general: 'Vendor envelope' },
  material: { spec: 'Bought-in: 14 V DC linear actuator, aluminium housing, steel rod', alt: 'Any 12–14 V actuator ≥ 169 lb, 3 in stroke, 7.13 in retracted, internal limits, back-drivable', form: 'assembly', density: null, allowables: [['Rated force', '169 lb (PA-01 169 lb option, at 12 VDC)', 'Progressive Automations PA-01 mini linear actuator page (accessed 2026-11-19)']] },
  process: [{ op: 'Install', spec: 'Bracket bolted through the seat back\'s aft-face hard point; actuator on its clevises; harness LEZ-27-172 with a service loop at the actuator.' }],
  interfaces: [
    ...icdIface(['IC11']).map((x) => ({ ...x, id: 'I3', with: 'LEZ-27-171 SCD (wp8)', feature: 'body' })),
    { id: 'I1', with: 'LEZ-27-170 horn, LEZ-53-170 seat-back hard point', feature: 'clevis', what: 'Pin-to-pin at the retracted length with the panel closed', check: () => ({ ok: Math.abs(B.L0 - B.retracted) < 0.05, detail: `${fx(B.L0, 3)} in closed, ${fx(B.L1, 3)} in at 70° (stroke ${fx(B.need, 2)} of ${B.stroke})` }) },
    { id: 'I2', with: 'Wiring (M2 J1, LEZ-27-172)', feature: 'body', what: 'Connector at the motor end', check: () => ({ ok: true, detail: '2-pin Deutsch DT: pin 1 MOTOR A (C1B16), pin 2 MOTOR B (C1C16)' }) },
  ],
  tooling: { needed: false, text: 'None.' },
  sourcing: { blank: 'Bought complete', vendor: 'Progressive Automations PA-01-3-169 class (PA-01 supersedes the PA-14 with the same mounting; 3 in stroke, 169 lb, 12 VDC, IP65, ≤ 4 A at full load)', url: 'https://progressiveautomations.com/products/mini-linear-actuator', cost: 114.99, costAsOf: '2026-11-18', perAircraft: 1, lead: 'Stock (typed from memory)', note: 'Model, envelope, rating and price typed from memory: confirm on the datasheet.' },
});
const hp = harnessPts(), hl = hp.slice(1).reduce((s, p, i) => s + Math.hypot(...p.map((v, k) => v - hp[i][k])), 0);
export const HAR = makePrimRec('LEZ-27-172', {
  more: [{ rev: 'B', date: '2026-11-19', short: 'Lowered through the panel', change: 'Block J interface (ICD J-R3): the harness crossed the panel 0.15 in under the AXIS bezel. Its first two points drop 0.20 in (FS 39.6, WL 35.70; FS 42.0, WL 36.20): 0.27 in or more clear of the bezel; B\'s pass-through hole follows the route.' }],
  nha: 'LEZ-27-171', title: 'Landing-brake actuator harness', kind: 'harness', effectivity: 'One per aircraft',
  change: `Initial definition. The harness ran through the front-seat cushion and the floor (ICD F21). As defined it leaves S9 at ${pt(hp[0])}, drops down the left side wall under the floor and runs aft-inboard to the actuator connector at ${pt(hp.at(-1))}, ${fx(hl, 1)} in, two 16 AWG wires (C1B16, C1C16) in a 1/4 in bundle.`,
  datums: [{ id: 'A', what: 'Harness route' }],
  features: [{ id: 'bundle', kind: 'harness', label: `2 × 16 AWG M22759/16, ${fx(hl, 1)} in + 4 in service loop, PET sleeve, Deutsch DT 2-pin at the actuator`, tol: 'Length +1 / −0 in' }],
  checks: ['c27-lb-harness'], rules: [{ id: 'clamps', label: 'Clamp spacing ≤ 18 in (number of clamps per 18 in)', v: Math.ceil(hl / 18) / (hl / 18), min: 1 }],
  hardware: [{ std: 'MS21919WDG4', qty: Math.ceil(hl / 18), desc: 'Cushion clamps' }, { std: 'DT06-2S', qty: 1, desc: 'Deutsch plug (typed from memory)' }],
  hardwareNote: 'Cushion clamps every 18 in; Deutsch DT06-2S plug at the actuator; ring terminals at S9.', na: { cut: 'Wire cut to length', layup: 'Not a composite part' }, tolerances: { general: 'Length +1 / −0 in' },
  material: { spec: 'M22759/16 16 AWG tin-plated copper, PET braided sleeve', alt: 'M22759/32', form: 'wire', density: null, allowables: [['16 AWG resistance', '4.016 Ω/1000 ft', 'BOUND, typed from memory']] },
  process: [{ op: 'Build', spec: 'On the harness board from the wire list; label both ends.' }, { op: 'Install', spec: 'Clamp along the route; service loop at the actuator; continuity and insulation test.' }],
  interfaces: [{ id: 'I1', with: 'LEZ-27-171 connector, S9 (LEZ-31-140)', feature: 'bundle', what: 'Ends at S9 and at the actuator motor end', check: () => { const e = hp.at(-1), d = Math.hypot(e[0] - B.A[0], e[2] - B.A[2]) ; return { ok: d < 2.5, detail: `actuator end ${fx(d, 2)} in from the anchor (motor end); S9 terminals 3 / 4` }; } }],
  tooling: { needed: false, text: 'Harness board.' },
  sourcing: { blank: `${Math.ceil(hl / 12 * 2 + 1)} ft 16 AWG`, vendor: 'Aircraft Spruce (M22759 wire, Deutsch DT)', url: 'https://www.aircraftspruce.com/menus/el/wire.html', cost: 25.0, costAsOf: '2026-11-18', perAircraft: 1, lead: 'Stock', note: 'Approximate.' },
});
export const lbHash = paramHash;
