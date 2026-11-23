// LEZ-57-144 wing drag-bolt angle: the wing half of the third bolt, a stock 6061-T6 equal angle floxed into the wing-root
// jut-out's root pocket on a BID doubler. Every field of the definition standard is filled from the numbers the sizing in
// wp15 uses (DANG); the CadQuery solid (cad/drag_angle.py) and the drawing sheet are built from the same numbers and
// re-checked by the release audit. Notional: public data and this model's own analysis. Not for construction.
import { CS_FIT } from '../structures.js';
import { ATTACH, ATT } from '../parts/wp13_airframe_joints.js';
import { DANG, DRG } from '../parts/wp15_cs_spar.js';
import { r4, want } from './util.js';

/** the numbers that define the solid, inches: x spanwise from the bolt (+ outboard), y aft from the bolt, z up from leg A's underside */
export function daParams() { const g = DANG; return { b: g.b, t: g.t, L: g.L, D: r4(g.D), yh: r4(g.yh), eF: r4(g.eF), pilot: 0.1875 }; }
export function daExpect(p, m) {
  const bb = 0.002, out = [want('Leg A (fore-aft)', p.b, m.bbox[3] - m.bbox[2], bb), want('Leg B (height)', p.b, m.bbox[5] - m.bbox[4], bb), want('Length (spanwise)', p.L, m.bbox[1] - m.bbox[0], bb),
    want('Leg thickness', p.t, m.legT ?? NaN, bb), want('Heel aft of the bolt', p.yh, m.bbox[3], bb)];
  const h = m.holes.find((q) => q.feat === 'drag');
  out.push(want('Drag-bolt hole x', 0, h ? h.x : NaN), want('Drag-bolt hole y', 0, h ? h.y : NaN), want('Drag-bolt hole diameter', p.D, h ? 2 * h.r : NaN));
  return out;
}

const P = daParams(), g = DANG, fx = (x, n = 3) => x.toFixed(n);
const STOCK = { 1.5: { 0.25: { price: 9.48, len: 12, url: 'https://speedymetals.com/p-2196-1-12-x-1-12-angle-6061-t6-aluminum-extruded.aspx' } } };
const stock = (STOCK[P.b] || {})[P.t] || null;
export const DA_DEF = {
  pn: 'LEZ-57-144', rev: 'A', status: 'released', nha: 'LEZ-57-110', qty: 2,
  title: 'Wing drag-bolt angle',
  revs: [{ rev: 'A', date: '2026-11-17', short: 'Initial definition', change: `Initial definition. The angle was a 0.06 lb 2024 stand-in with no checks. As defined it is a ${P.b} × ${P.b} × ${P.t} in 6061-T6 stock angle ${P.L} in long, sized by leg A bending under the torsion couple; it sits on a ${g.nD}-ply BID doubler in the jut-out's lower skin, which the skin needed to spread the bolt's in-plane load. Leg A is ${P.t} in, so the fitting's lug (LEZ-57-141 rev B) sits ${fx(P.t - 0.125)} in higher and the drag bolt (LEZ-57-145 rev B) is longer and now passes the skin.` }],
  effectivity: 'Left and right jut-outs; the left angle is the right mirrored',
  params: P,
  datums: [
    { id: 'A', what: 'Leg A underside: on the doubler in the jut-out\'s lower skin' },
    { id: 'B', what: 'Heel: leg B\'s forward face, toward the bolt' },
    { id: 'C', what: 'Centre of the length, spanwise' },
  ],
  features: [
    { id: 'outline', kind: 'profile', label: `Cut length ${fx(P.L, 2)} in from ${P.b} × ${P.b} × ${P.t} in stock angle; ends square`, tol: 'Length ±0.03; ends square within 0.5°' },
    { id: 'legA', kind: 'leg', label: `Leg A ${P.b} in fore-aft on the lower skin; bolt ${fx(P.eF, 2)} in aft of its forward edge`, tol: 'As extruded (AMS-QQ-A-200/8)' },
    { id: 'legB', kind: 'leg', label: `Leg B ${P.b} in tall, standing up ${fx(P.yh, 2)} in aft of the bolt, clear of the lug's end`, tol: 'As extruded' },
    { id: 'drag', kind: 'hole', d: P.D, at: [0, 0], label: `Drag-bolt hole Ø ${fx(P.D)} +0.003 / −0.000, ${fx(P.yh, 2)} forward of B on C`, tol: '+0.003 / −0.000', assy: true, note: `Ø ${fx(P.pilot)} pilot in the detail; drilled and reamed at assembly through the fitting's lug, the angle, the doubler and the skin with the wing pinned` },
  ],
  tolerances: { general: '.XX ±0.03  ·  .XXX ±0.010  ·  angles ±1°', holes: 'pilot ±0.010 from B and C', breakEdges: '0.010–0.030 all cut edges and hole edges' },
  generalNote: 'Inside fillet as extruded. Bond faces (leg A underside, leg B aft face) scuffed and primed for flox.',
  drawingNotes: [`† Ø ${fx(P.pilot)} pilot in the detail; final size at assembly (LEZ-57-145).`, 'Right angle shown; left opposite.'],
  na: { cut: 'Cut to length from stock: no flat pattern', layup: 'Metal part (the doubler under it is jut-out laminate, LEZ-57-116)' },
  material: {
    spec: 'AMS-QQ-A-200/8, 6061-T6 extruded structural angle', alt: 'ASTM B221 6061-T6 angle with a material test report',
    form: `${P.b} × ${P.b} × ${P.t} in equal angle, cut to length`, density: 0.098,
    allowables: [['F_tu', '38 ksi', 'MIL-HDBK-5J table 3.6.2.0(g) A-basis, extrusion t ≤ 1.000 in (KasperCalc transcription, accessed 2026-11-19)'], ['F_bru (e/D 2.0)', '82 ksi', 'MIL-HDBK-5J table 3.6.2.0(g) A-basis (was 88, the B-basis value)'], ['F_su', '24 ksi', 'Aluminum Association 1968 minimum, below the handbook 26 ksi (conservative)']],
  },
  process: [
    { op: 'Machine', spec: 'Saw to length, square the ends, deburr; drill the Ø 0.1875 pilot.' },
    { op: 'Conversion coat', spec: 'MIL-DTL-5541, Type I, Class 1A; prime MIL-PRF-23377 except the bond faces, which are scuffed and wiped.' },
    { op: 'Install', spec: `On the jig with the wing pinned: lay the ${g.nD}-ply 6781 doubler, flox the angle onto it with the fitting's lug clamped in place, flox leg B to the pocket's aft wall and tape it with 2 × 6781 onto the skin.` },
    { op: 'Identify', spec: 'Bag and tag with part number, revision and hand (L / R) before installation.' },
  ],
  checks: ['dang-lug', 'dang-bend', 'dang-bond', 'dang-skin', 'wing-attach-drag'],
  rules: [
    { id: 'eD', label: 'Bolt to forward edge e/D ≥ 2.0', v: P.eF / P.D, min: 2 },
    { id: 'side', label: 'Bolt to the ends (L/2)/D ≥ 2.0', v: P.L / 2 / P.D, min: 2 },
    { id: 'heel', label: 'Leg B clear of the lug end by ≥ 0.1 in', v: (P.yh - P.t) - (DRG.yEnd - DRG.yB), min: 0.1 },
    { id: 'lap', label: 'Lug fully on leg A: lug width ≤ angle length', v: P.L / DRG.Wl, min: 1 },
  ],
  mass: { each: g.mass, from: 'solid volume × 0.098 lb/in³ (checked against the CadQuery solid)' },
  hardware: [], hardwareNote: `None on the detail: the AN${ATT.drag} drag bolt, nut and washers are installation hardware on LEZ-57-145.`,
  interfaces: [
    { id: 'I1', with: 'LEZ-57-141 drag / torsion fitting', feature: 'legA', what: 'Lug on leg A: the fitting\'s arm bottom sits on leg A\'s top',
      check: () => { const legTop = (ATTACH.zLo - CS_FIT.L) * 12 + P.t; return { ok: Math.abs(DRG.zA - legTop) < 1e-6, detail: `arm bottom ${fx(DRG.zA)} in above the CS spar's lower face; leg A top ${fx(legTop)} in` }; } },
    { id: 'I2', with: 'Drag bolt (LEZ-57-145)', feature: 'drag', what: 'Hole diameter equals the AN bolt',
      check: () => ({ ok: P.D === ATT.drag / 16, detail: `hole Ø ${P.D}, AN${ATT.drag} = ${ATT.drag / 16} in` }) },
    { id: 'I3', with: 'Jut-out lower skin (LEZ-57-116)', feature: 'legA', what: 'Doubler under the angle, inside the room between the OML and the angle',
      check: () => ({ ok: 2 * 0.01 + g.nD * 0.01 <= g.below, detail: `skin 2 × 6781 + doubler ${g.nD} × 6781 = ${fx((2 + g.nD) * 0.01)} in, room ${fx(g.below)} in (flox bed fills the rest)` }) },
  ],
  tooling: { needed: true, text: 'The wing-attach jig: the angle is floxed in with the wing pinned and the drag fitting\'s lug clamped on it, so the bolt hole lines up; the hole is drilled through the lug afterward.' },
  sourcing: {
    blank: `${P.b} × ${P.b} × ${P.t} in 6061-T6 angle, one ${stock ? stock.len : 12} in length for both angles`,
    vendor: 'Speedy Metals (6061-T6 extruded angle)', url: stock ? stock.url : 'https://speedymetals.com/',
    cost: stock ? stock.price / 2 : null, costAsOf: '2026-11-17', perAircraft: 2, lead: 'Stock, cut to order',
    note: stock ? `$${stock.price} for ${stock.len} in covers both angles (2 × ${P.L} in plus saw kerf).` : 'Price not found',
  },
};

// memory-audit integration (2026-11-19): this record's new revision
import { memRev } from './revs_memaudit.js';
memRev(DA_DEF);
