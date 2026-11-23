// LEZ-57-142 LWA plate: the pilot of the build-ready definition. Every field of the part definition standard is filled
// in here, from the same numbers the sizing in wp13 uses, so the record, the CadQuery solid (cad/lwa_plate.py) and the
// drawing sheet (defn/sheet.js) cannot drift apart: the release audit (defn/release.js) re-checks all three.
// Notional: public data and this model's own analysis. Not for construction.
import { GEO, FIXED } from '../structures.js';
import { LWA, LUG, ATT, ATTACH, SEAL, WING_END } from '../parts/wp13_airframe_joints.js';

import { r4, paramHash as hashOf, want } from './util.js';

/** the numbers that define the solid, in inches (u spanwise from the pin centre, w fore-aft, v up from the bottom face) */
export function lwaParams() {
  return { W: r4(LWA.W), L: r4(LWA.L), t: r4(LWA.t), u0: r4(LWA.u0), u1: r4(LWA.u1), D: r4(LWA.D), dB: r4(LWA.dBolt), bolts: LWA.bolts.map(r4), rIn: LWA.rIn, rOut: LWA.rOut };
}
export const paramHash = (p = lwaParams()) => hashOf(p);
/** the solid measured back against the record (and so against the drawing, which is drawn from the record) */
export function lwaExpect(p, m) {
  const bb = 0.002, out = [want('Length (u0 to u1)', p.u1 - p.u0, m.bbox[1] - m.bbox[0], bb), want('Width W', p.W, m.bbox[3] - m.bbox[2], bb), want('Thickness t', p.t, m.bbox[5] - m.bbox[4], bb)];
  for (const h of [{ feat: 'pin', x: 0, d: p.D }, ...p.bolts.map((u, i) => ({ feat: `b${i + 1}`, x: u, d: p.dB }))]) { const g = m.holes.find((q) => q.feat === h.feat); out.push(want(`${h.feat} position`, h.x, g ? g.x : NaN), want(`${h.feat} diameter`, h.d, g ? 2 * g.r : NaN)); }
  out.push(want('Corner radii', p.rIn + p.rOut, (m.corners[0] || 0) + (m.corners[1] || 0)));
  return out;
}

const P = lwaParams(), fx = (x, n = 3) => x.toFixed(n);
const tolX = { xx: 0.03, xxx: 0.010 };

export const LWA_DEF = {
  pn: 'LEZ-57-142', rev: 'D', status: 'released', nha: 'LEZ-57-110', qty: 4,
  title: 'LWA plate, wing spar-end lug',
  revs: [{ rev: 'A', date: '2026-11-16', short: 'Initial definition (build-ready pilot)', change: 'Initial definition: the build-ready pilot. The definition pass found that the earlier 1.02 in deep vertical plate failed lug net tension; the lug now lies in the cap plane with a vertical pin (wp13 iterations 4 and 5).' },
    { rev: 'B', date: '2026-11-17', short: 'Clevis ref LEZ-57-143; geometry same', change: 'The clevis block became its own detail (LEZ-57-143): the drawing note and interface I1 now name it. The gap seal moved to the centre of the joint gap. No change to the plate\'s geometry, material or checks.' },
    { rev: 'C', date: '2026-11-17', short: 'NHA wing panel LEZ-57-110; geometry same', change: 'The wing-attach assembly shared its number with the CS spar laminate (both LEZ-57-140). The plate is built into the wing panel, so its next-higher assembly is now LEZ-57-110; the pin and cap-bolt hardware moved to the new wing-attach installation LEZ-57-145. Geometry and checks unchanged.'  },
    { rev: 'D', date: '2026-11-17', short: 'Bolts 2.75 in outboard (wing root)' /* literal: history is not recomputed (2026-11-21) */, change: `The wing panel definition (LEZ-57-110) splits the wing caps around the plate the same way the CS spar does around the clevis tail: ${WING_END.upper.nTop} UNI over it, a quasi-isotropic BID pad under it, and (upper cap) the other ${WING_END.upper.nUnder} UNI under the pad. Shear-out of that laminate toward the wing root face needs the first bolt ${WING_END.bolt1.toFixed(2)} in from the root face (was 1.00 in): all three bolts move ${(WING_END.bolt1 - 1).toFixed(2)} in outboard and the plate is ${(WING_END.bolt1 - 1).toFixed(2)} in longer. Pin end unchanged.` }],
  effectivity: 'All four positions: upper and lower spar-end joints, left and right wings',

  // ---------------------------------------------------------------- geometry (feature list in drawing order)
  params: P,
  datums: [
    { id: 'A', what: 'Top face: the bond face against the wing spar cap' },
    { id: 'B', what: 'Pin hole axis' },
    { id: 'C', what: 'Centre line along the length, midway between the long edges' },
  ],
  features: [
    { id: 'outline', kind: 'profile', label: `Plan ${fx(P.L, 2)} × ${fx(P.W)} in, lug-end corners R ${fx(P.rIn, 2)}, outboard corners R ${fx(P.rOut, 2)}`, tol: `L ±${tolX.xx}, W ±0.005 (ground blank)` },
    { id: 'thick', kind: 'thickness', label: `Thickness ${fx(P.t)} in`, tol: '±0.005 (ground blank)' },
    { id: 'pin', kind: 'hole', d: P.D, at: [0, 0], label: `Pin hole Ø ${fx(P.D)} +0.002 / −0.000, ⊥ A within 0.002`, tol: '+0.002 / −0.000', assy: true, note: `Ø 0.250 pilot in the detail part; match-reamed to size at assembly through the LEZ-57-143 clevis tangs` },
    ...P.bolts.map((u, i) => ({ id: `b${i + 1}`, kind: 'hole', d: P.dB, at: [u, 0], label: `Bolt hole ${i + 1}: Ø ${fx(P.dB)} +0.003 / −0.000 at ${fx(u, 2)} from B`, tol: '+0.003 / −0.000', assy: true, note: 'Ø 0.250 pilot in the detail part; drilled and reamed to size at assembly through the wing spar cap' })),
  ],
  drawingNotes: ['† Ø .250 pilot in the detail part. Final size is match-drilled and reamed at assembly (pin hole through the LEZ-57-143 clevis tangs; bolt holes through the wing spar cap).'],
  na: { cut: 'Machined from a blank: no flat pattern', layup: 'Metal part' },
  tolerances: { general: `.XX ±${tolX.xx}  ·  .XXX ±${tolX.xxx.toFixed(3)}  ·  angles ±1°`, flatness: '0.005 over the bond face (A)', holes: 'hole positions ±0.005 from B along C; on C within 0.005', breakEdges: '0.010–0.030 all edges' },

  // ---------------------------------------------------------------- material and process
  material: {
    spec: 'AMS-QQ-A-250/4, 2024-T351 plate', alt: 'Commercial 2024-T351 ground blank to ASTM B209, with a material certificate',
    form: `${fx(P.t)} in thick, grain (L) along the length of the part`, density: 0.1003,
    allowables: [['F_tu (L)', '64 ksi', 'MIL-HDBK-5H CN1 table 3.2.3.0(b1), 2024-T351 plate A-basis (METU AE462 copy, accessed 2026-11-19)'], ['F_bru (e/D 2.0)', '117 ksi (0.5–1.0 in; 119 at 0.25–0.499)', 'MIL-HDBK-5H CN1 table 3.2.3.0(b1), 2024-T351 plate A-basis (METU AE462 copy, accessed 2026-11-19)'], ['F_su', '38 ksi (0.25–0.499 in; 37 at 0.5–1.0)', 'MIL-HDBK-5H CN1 table 3.2.3.0(b1), 2024-T351 plate A-basis (METU AE462 copy, accessed 2026-11-19)']],
  },
  process: [
    { op: 'Machine', spec: 'From the blank below; profile, corner radii and Ø 0.250 pilot holes. Surface finish 125 µin Ra or better.' },
    { op: 'Edges', spec: 'Break all edges 0.010–0.030 in; no burrs in the pilot holes.' },
    { op: 'Conversion coat', spec: 'MIL-DTL-5541, Type I, Class 1A, all surfaces.' },
    { op: 'Prime', spec: 'MIL-PRF-23377 epoxy primer, all surfaces except the bond face (A), which is masked.' },
    { op: 'Bond face', spec: 'Left bare (conversion coat only) for the flox bond to the spar cap; surface preparation is part of the wing panel layup (LEZ-57-110).' },
    { op: 'Identify', spec: 'Bag and tag with part number and revision; no stamping or engraving on the part.' },
  ],

  // ---------------------------------------------------------------- substantiation
  checks: ['lwa-lug', 'lwa-bolts', 'wing-attach'],
  rules: [
    { id: 'pin-eD', label: 'Pin hole end distance e/D ≥ 2.0', v: LWA.e / LWA.D, min: 2 },
    { id: 'pin-side', label: 'Pin hole side distance (W/2)/D ≥ 1.5', v: LWA.W / 2 / LWA.D, min: 1.5 },
    { id: 'bolt-eD', label: 'Outboard bolt end distance e/d ≥ 2.0', v: (LWA.u1 - LWA.bolts.at(-1)) / LWA.dBolt, min: 2 },
    { id: 'bolt-side', label: 'Bolt side distance (W/2)/d ≥ 2.0', v: LWA.W / 2 / LWA.dBolt, min: 2 },
    { id: 'pitch', label: 'Bolt pitch ≥ 4d', v: LUG.pitch, min: 4 },
    { id: 'pin-b1', label: 'Pin to bolt 1 edge-to-edge ≥ 1.0 d', v: (LWA.bolts[0] - LWA.D / 2 - LWA.dBolt / 2) / LWA.dBolt, min: 1 },
  ],

  // ---------------------------------------------------------------- mass
  mass: { each: LWA.mass, from: 'solid volume × 0.1003 lb/in³ (checked against the CadQuery solid)' },

  // ---------------------------------------------------------------- hardware (on the part itself) and interfaces
  hardware: [],
  hardwareNote: 'None on the detail part. The pin, nut and washers and the three AN8 cap bolts are installation hardware on LEZ-57-145.',
  interfaces: [
    { id: 'I1', with: 'LEZ-57-143 clevis block tangs', feature: 'pin', what: 'Pin hole coaxial with the tang bores; tang width equals plate width; running gap each side ≥ 0.03 in; tang end distance 2D',
      check: () => { const tangEnd = ((LUG.yPin + LWA.e / 12) - LUG.yPin) * 12 / LWA.D; return { ok: LUG.gap >= 0.03 - 1e-9 && tangEnd >= 2 - 1e-9 && LUG.W === LWA.W, detail: `gap ${LUG.gap} in, tang e/D ${tangEnd.toFixed(2)}, widths ${LUG.W} / ${LWA.W} in` }; } },
    { id: 'I2', with: 'Wing spar cap (wing root)', feature: 'outline', what: 'Bond face below the cap with a 0.03 in flox line; plate narrower than the cap with 0.25 in each side',
      check: () => { const top = ATTACH.depth - LWA.t / 2, need = LUG.cap + LUG.flox, capW = GEO.wing.cap[0]; return { ok: top >= need - 1e-9 && LWA.W <= capW - 0.5 + 1e-9, detail: `bond face ${top.toFixed(3)} in inside the skin (needs ≥ ${need.toFixed(3)}); width ${LWA.W} in in a ${capW} in cap` }; } },
    { id: 'I3', with: 'AN8 cap through-bolts and the wing root laminate (LEZ-57-110)', feature: 'b1', what: 'Bolt count, diameter and first-bolt distance from the root face match the wing-end checks',
      check: () => { const e = LWA.bolts[0] - LWA.uRoot, J = WING_END.upper; return { ok: LWA.dBolt === J.D && LWA.bolts.length === J.nB && Math.abs(e - WING_END.bolt1) < 1e-9, detail: `${LWA.bolts.length} × Ø ${LWA.dBolt} in, bolt 1 ${e.toFixed(2)} in from the root face; the wing-end checks use ${J.nB} × Ø ${J.D} in at ${WING_END.bolt1.toFixed(2)} in` }; } },
    { id: 'I5', with: 'Root-rib gap seal (LEZ-57-152)', feature: 'thick', what: 'The lugs cross the 0.15 in joint gap under the seal line: at least 0.03 in between the seal and the plate face',
      check: () => { const sealIn = SEAL.inset * 12 + SEAL.dIn / 2, top = ATTACH.depth - LWA.t / 2; return { ok: top - sealIn >= 0.03 - 1e-9, detail: `seal reaches ${sealIn.toFixed(3)} in inside the skin, plate face at ${top.toFixed(3)} in: ${(top - sealIn).toFixed(3)} in clear` }; } },
    { id: 'I4', with: `AN${ATT.pin} pin (hardware on LEZ-57-145)`, feature: 'pin', what: 'Hole diameter equals the AN pin diameter',
      check: () => ({ ok: Math.abs(LWA.D - ATT.pin / 16) < 1e-9, detail: `Ø ${LWA.D} in hole, AN${ATT.pin} = ${ATT.pin / 16} in` }) },
  ],

  // ---------------------------------------------------------------- tooling and sourcing
  tooling: { needed: false, text: 'None for the detail: machined from a ground blank on a manual mill. The holes are finished at assembly on the wing-attach jig, which is defined with LEZ-57-145.' },
  sourcing: {
    blank: 'TCI Precision Metals SB-2024-0625-02-12: 0.625 × 2.000 × 12.000 in 2024-T351, ground to ±0.002 in on thickness',
    vendor: 'Zoro (zoro.com item G814641519)', url: 'https://www.zoro.com/tci-precision-metals-precision-groundmilled-625in-x-2000in-x-12000in-2024-t351-aluminum-sb-2024-0625-02-12/i/G814641519/',
    cost: 86.99, costAsOf: '2026-11-16', perAircraft: 4, lead: 'Stock item (lead time not stated)',
    note: `One blank per plate: the 12 in blank leaves ${(12 - P.L).toFixed(1)} in of grip and saw allowance.`,
  },
};

// memory-audit integration (2026-11-19): this record's new revision
import { memRev } from './revs_memaudit.js';
memRev(LWA_DEF);
