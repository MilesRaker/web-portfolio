// LEZ-57-141 wing drag / torsion fitting (the third bolt): a machined 2024-T351 L bolted to the CS spar's aft face whose
// arm runs aft along the lower skin to a lug on the vertical drag bolt. Every field of the definition standard is filled
// from the numbers the fitting sizing in wp15 uses (DRG); the CadQuery solid (cad/drag_fitting.py) and the drawing sheet
// are built from the same numbers and re-checked by the release audit. Notional: public data and this model's analysis.
import { GEO, CS_FIT } from '../structures.js';
import { ATTACH, ATT, CHORD } from '../parts/wp13_airframe_joints.js';
import { DRG, HARD, dragVolume, DRAG_ANGLE_T } from '../parts/wp15_cs_spar.js';
import { r4, want } from './util.js';

/** the numbers that define the solid, inches: x spanwise from the centre line (+ outboard), y aft from the spar's aft
 *  face, z up from the spar's lower face */
export function drgParams() {
  const g = DRG, k = ['Wf', 'tf', 'zA', 'zTop', 'yB', 'yEnd', 'Wa', 'Wl', 'ta', 'Dd', 'dB', 'r'];
  return { ...Object.fromEntries(k.map((x) => [x, r4(g[x])])), zR: g.zR.map(r4), cols: g.cols.map(r4), pilot: 0.1875 };
}
/** the solid measured back against the record */
export function drgExpect(p, m) {
  const bb = 0.002, out = [want('Flange width W_f', p.Wf, m.bbox[1] - m.bbox[0], bb), want('Length (spar face to lug end)', p.yEnd, m.bbox[3] - m.bbox[2], bb),
    want('Height (arm bottom to flange top)', p.zTop - p.zA, m.bbox[5] - m.bbox[4], bb), want('Arm thickness', p.ta, m.ta ?? NaN, bb), want('Flange thickness', p.tf, m.tf ?? NaN, bb)];
  const H = [{ feat: 'drag', d: p.Dd, at: [0, p.yB], ax: 'xy' }, ...p.zR.flatMap((z, i) => p.cols.map((x, j) => ({ feat: `f${i * p.cols.length + j + 1}`, d: p.dB, at: [x, z], ax: 'xz' })))];
  for (const h of H) { const g = m.holes.find((q) => q.feat === h.feat), got = g ? (h.ax === 'xy' ? [g.x, g.y] : [g.x, g.z]) : [NaN, NaN];
    out.push(want(`${h.feat} x`, h.at[0], got[0]), want(`${h.feat} ${h.ax === 'xy' ? 'y' : 'z'}`, h.at[1], got[1]), want(`${h.feat} diameter`, h.d, g ? 2 * g.r : NaN)); }
  return out;
}

const P = drgParams(), fx = (x, n = 3) => x.toFixed(n), h = HARD.find((q) => q.id === 'drag'), H = P.zTop - P.zA;
const BLANK = { thick: 3, price: 654.26, url: 'https://speedymetals.com/p-885-3-2024-t351-aluminum-plate.aspx' };

export const DRG_DEF = {
  pn: 'LEZ-57-141', rev: 'B', status: 'released', nha: 'LEZ-57-145', qty: 2,
  title: 'Wing drag / torsion fitting',
  revs: [{ rev: 'A', date: '2026-11-17', short: 'Initial definition', change: `Initial definition. The fitting was a 0.22 lb stand-in with the drag bolt in double shear and no checks of its own. As defined it is a machined L: the arm (2.5 → 1 in wide, 0.625 in thick) carries the drag moment's spanwise couple and the torsion couple ${fx(P.yB, 1)} in back to the flange in bending, which sizes it; the lug laps over the wing's drag angle (LEZ-57-144) so the AN${ATT.drag} is in single shear; the flange bolts and the spar's drag hard point now take per-bolt loads from the fitting statics. The chordwise load (${CHORD.k} × |V| at ${Math.round(CHORD.at * 100)} % of the panel span) is carried as a bound on every check.` }, { rev: 'B', date: '2026-11-17', short: 'Re-sized on the 1/4 in drag angle', change: `The wing drag angle (LEZ-57-144) is now a 1/4 in 6061-T6 angle on a BID doubler, so the lug (datum B) sits 0.125 in higher. Re-sized: arm ${P.Wa} → ${P.Wl} in wide × ${P.ta} in (was 2.5 → 1 × 0.625), flange rows ${P.zR.map((z) => z.toFixed(2)).join(' / ')} in above the spar's lower face (was 1.80 / 3.30) so the washers still clear the corner fillet; flange ${P.tf} in unchanged.` }],
  effectivity: 'Left and right wing roots; the left fitting is the right mirrored',
  params: P,
  datums: [
    { id: 'A', what: 'Flange front face: the face against the CS spar\'s aft face' },
    { id: 'B', what: 'Arm bottom face: on the wing drag angle\'s leg' },
    { id: 'C', what: 'Centre plane, spanwise, through the drag bolt' },
  ],
  features: [
    { id: 'outline', kind: 'profile', label: `Envelope ${fx(P.Wf, 2)} × ${fx(P.yEnd, 2)} × ${fx(H, 2)} in; arm tapers straight from ${P.Wa} in at A to ${P.Wl} in at the drag bolt; lug end square`, tol: 'Profile ±0.03' },
    { id: 'flange', kind: 'flange', label: `Flange ${fx(P.tf)} thick, ${fx(P.Wf, 2)} wide, ${fx(H, 2)} tall from B`, tol: '±0.010; A flat within 0.005' },
    { id: 'arm', kind: 'arm', label: `Arm ${fx(P.ta)} thick, ${fx(P.yEnd, 2)} long from A`, tol: '±0.010; B flat within 0.005' },
    { id: 'fillet', kind: 'radius', label: `Inside corner R ${fx(P.r, 2)} across the arm`, tol: '+0.03 / −0.00', note: 'Machined, not broken: no tool marks across the fillet' },
    { id: 'drag', kind: 'hole', d: P.Dd, at: [0, P.yB], label: `Drag-bolt hole Ø ${fx(P.Dd)} +0.003 / −0.000, ${fx(P.yB, 2)} from A on C`, tol: '+0.003 / −0.000', assy: true, note: `Ø ${fx(P.pilot)} pilot in the detail; drilled and reamed at assembly through the lug and the wing angle with the wing pinned` },
    ...P.zR.flatMap((z, i) => P.cols.map((x, j) => ({ id: `f${i * P.cols.length + j + 1}`, kind: 'hole', d: P.dB, at: [x, z], label: `Flange bolt hole Ø ${fx(P.dB)} +0.003 / −0.000, ${fx(Math.abs(x), 2)} ${x < 0 ? 'inboard' : 'outboard'} of C, ${fx(z - P.zA, 2)} above B`, tol: '+0.003 / −0.000', assy: true, note: `Ø ${fx(P.pilot)} pilot in the detail; drilled and reamed at assembly through the CS spar's drag hard point` }))),
  ],
  tolerances: { general: '.XX ±0.03  ·  .XXX ±0.010  ·  angles ±1°', flatness: '0.005 over A and over B', holes: 'pilot positions ±0.010', breakEdges: '0.010–0.030 all edges except the inside-corner fillet' },
  drawingNotes: [`† Ø ${fx(P.pilot)} pilots in the detail part. Final sizes are drilled and reamed at assembly: flange holes through the CS spar's drag hard point (LEZ-57-140), the drag-bolt hole through the wing angle (LEZ-57-144) with the wing pinned.`,
    'Right fitting shown; left fitting opposite (mirror about the aircraft centre line).', 'Grain (L) fore-aft, along the arm.'],
  na: { cut: 'Machined from a blank: no flat pattern', layup: 'Metal part' },

  material: {
    spec: 'AMS-QQ-A-250/4, 2024-T351 plate', alt: 'ASTM B209 2024-T351 plate with a material certificate',
    form: `machined from ${BLANK.thick} in plate, the L profile in the plate's length-thickness plane, grain (L) along the arm`, density: 0.1003,
    allowables: [['F_tu (L)', '64 ksi', 'MIL-HDBK-5H CN1 table 3.2.3.0(b1), 2024-T351 plate A-basis (METU AE462 copy, accessed 2026-11-19)'], ['F_bru (e/D 2.0)', '117 ksi (0.5–1.0 in; 119 at 0.25–0.499)', 'MIL-HDBK-5H CN1 table 3.2.3.0(b1), 2024-T351 plate A-basis (METU AE462 copy, accessed 2026-11-19)'], ['F_su', '38 ksi (0.25–0.499 in; 37 at 0.5–1.0)', 'MIL-HDBK-5H CN1 table 3.2.3.0(b1), 2024-T351 plate A-basis (METU AE462 copy, accessed 2026-11-19)']],
  },
  process: [
    { op: 'Machine', spec: 'From the blank below: L profile, arm taper in plan, inside-corner fillet, pilot holes. Surface finish 125 µin Ra or better; A and B 63 µin Ra.' },
    { op: 'Edges', spec: 'Break all edges 0.010–0.030 in except the inside-corner fillet; no burrs in the pilot holes.' },
    { op: 'Conversion coat', spec: 'MIL-DTL-5541, Type I, Class 1A, all surfaces (re-touch the reamed holes at assembly).' },
    { op: 'Prime', spec: 'MIL-PRF-23377 epoxy primer, all surfaces.' },
    { op: 'Identify', spec: 'Bag and tag with part number, revision and hand (L / R); no stamping or engraving on the part.' },
  ],

  checks: ['drg-arm', 'drg-flange', 'drg-lug', 'drg-bolts', 'wing-attach-drag', 'cs-hp-drag'],
  rules: [
    { id: 'lug-eD', label: 'Drag-bolt end distance e/D ≥ 2.0', v: (P.yEnd - P.yB) / P.Dd, min: 2 },
    { id: 'lug-side', label: 'Drag-bolt side distance (W_l/2)/D ≥ 1.5', v: P.Wl / 2 / P.Dd, min: 1.5 },
    { id: 'fl-edge', label: 'Flange bolt edge distance (side) e/D ≥ 2.0', v: (P.Wf / 2 - Math.max(...P.cols)) / P.dB, min: 2 },
    { id: 'fl-top', label: 'Flange bolt end distance (top) e/D ≥ 2.0', v: (P.zTop - P.zR.at(-1)) / P.dB, min: 2 },
    { id: 'fl-arm', label: 'Lower flange bolts clear the fillet: washer (D) above the fillet tangent', v: (P.zR[0] - P.dB - (P.zA + P.ta + P.r)) / P.dB, min: 0 },
    { id: 'pitch', label: 'Flange bolt pitch ≥ 4 D (both directions)', v: Math.min(P.zR[1] - P.zR[0], P.cols[1] - P.cols[0]) / P.dB, min: 4 },
  ],
  mass: { each: dragVolume(DRG) * 0.1003, from: 'solid volume × 0.1003 lb/in³ (checked against the CadQuery solid)' },
  hardware: [],
  hardwareNote: `The vertical AN${ATT.drag} drag bolt, MS21042L${ATT.drag} nut and washers are installation hardware on LEZ-57-145; the 2 × 2 AN6 flange bolts, crush tubes, nuts and washers are hardware on the CS spar (LEZ-57-140).`,
  interfaces: [
    { id: 'I1', with: 'LEZ-57-140 CS spar drag hard point', feature: 'f1', what: 'Bolt count, diameter and pattern match the spar hard point',
      check: () => { const ok = h && h.d === P.dB && h.zIn.every((z, i) => Math.abs(z - P.zR[i]) < 1e-3) && h.cols.every((c, i) => Math.abs(c - P.cols[i]) < 1e-3); return { ok, detail: `spar: ${h.n} × Ø ${h.d} at z ${h.zIn.join(', ')}, x ${h.cols.join(', ')}; fitting: ${P.zR.length * P.cols.length} × Ø ${P.dB}` }; } },
    { id: 'I2', with: 'Drag bolt and the wing drag angle (LEZ-57-144)', feature: 'drag', what: 'Hole at the drag-bolt station; arm bottom on the angle leg; hole equals the AN diameter',
      check: () => { const yb = (ATTACH.drag[0] - GEO.firewall) * 12, zb = (ATTACH.zLo - CS_FIT.L) * 12 + DRAG_ANGLE_T; return { ok: Math.abs(yb - P.yB) < 1e-3 && Math.abs(zb - P.zA) < 1e-3 && P.Dd === ATT.drag / 16, detail: `bolt ${yb.toFixed(3)} in aft of the spar (hole ${P.yB}); arm bottom ${P.zA} in on a ${DRAG_ANGLE_T} in angle leg; AN${ATT.drag} = ${ATT.drag / 16} in` }; } },
    { id: 'I3', with: 'Spar aft face / firewall', feature: 'flange', what: 'The CS spar\'s aft face is the firewall line here, outboard of the fuselage: flange on the spar face, inside the spar depth',
      check: () => { const fw = GEO.csSpar.s + GEO.csSpar.width / 2, top = P.zTop, depth = GEO.csSpar.depthFt * 12; return { ok: Math.abs(fw - GEO.firewall) < 1e-6 && top <= depth - 0.25, detail: `spar aft face at FS ${(fw * 12).toFixed(2)}, flange top ${top.toFixed(2)} in, spar depth ${depth.toFixed(2)} in` }; } },
  ],
  tooling: { needed: true, text: 'The wing-attach jig (LEZ-57-145) holds the wing pinned on the spar pins: the fitting is clamped to the spar face and the wing angle, the flange holes are drilled and reamed through the spar from the fitting pilots, then the drag-bolt hole through the lug and the angle together.' },
  sourcing: {
    blank: `${BLANK.thick} in 2024-T351 plate (AMS-QQ-A-250/4), 12 × 12 in: three ${BLANK.thick} × ${fx(Math.ceil((H + 0.25) * 4) / 4, 2)} × ${fx(Math.ceil((P.yEnd + 0.4) * 4) / 4, 2)} in blanks, one per fitting plus a spare`,
    vendor: 'Speedy Metals (2024-T351 plate, 3 in)', url: BLANK.url,
    cost: BLANK.price / 2, costAsOf: '2026-11-17', perAircraft: 2, lead: 'Stock, cut to order (lead time not stated)',
    note: `One 12 × 12 in piece ($${BLANK.price}) covers both fittings and a spare; most of the plate becomes chips: a two-piece riveted angle would cost less but adds a joint in the bending path.`,
  },
};

// memory-audit integration (2026-11-19): this record's new revision
import { memRev } from './revs_memaudit.js';
memRev(DRG_DEF);
