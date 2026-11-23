// LEZ-57-143 clevis block: the CS spar half of each spar-end joint, the second part of the build-ready definition.
// Every field of the part definition standard is filled in from the numbers the sizing in wp13 uses; the CadQuery solid
// (cad/clevis_block.py) and the drawing sheet (defn/sheet.js) are built from the same numbers and re-checked by the
// release audit (defn/release.js). Notional: public data and this model's own analysis. Not for construction.
import { GEO } from '../structures.js';
import { CLV, LWA, LUG, ATT, ATTACH, SEAL, SPAR_END } from '../parts/wp13_airframe_joints.js';
import { r4, paramHash, want } from './util.js';

/** the numbers that define the solid, in inches (u spanwise from the pin centre, w fore-aft, v up from the bottom face) */
export function clvParams() {
  const k = ['W', 'H', 'tT', 'tail', 'u0', 'u1', 'uSlot', 'uWeb', 'D', 'dB', 'slot', 'rSlot', 'rTail', 'rTang', 'rEnd'];
  return { ...Object.fromEntries(k.map((x) => [x, r4(CLV[x])])), L: r4(CLV.L), bolts: CLV.bolts.map(r4) };
}
/** the solid measured back against the record */
export function clvExpect(p, m) {
  const bb = 0.002, out = [want('Length (u0 to u1)', p.L, m.bbox[1] - m.bbox[0], bb), want('Width W', p.W, m.bbox[3] - m.bbox[2], bb), want('Height H', p.H, m.bbox[5] - m.bbox[4], bb),
    want('Slot width', p.slot, m.slot ?? NaN), want('Tail thickness', p.tail, m.tail ?? NaN)];
  for (const h of [{ feat: 'pin', x: 0, d: p.D }, ...p.bolts.map((u, i) => ({ feat: `b${i + 1}`, x: u, d: p.dB }))]) { const g = m.holes.find((q) => q.feat === h.feat); out.push(want(`${h.feat} position`, h.x, g ? g.x : NaN), want(`${h.feat} diameter`, h.d, g ? 2 * g.r : NaN)); }
  const radii = [...new Set([p.rSlot, p.rTail, p.rTang, p.rEnd])].sort((a, b) => a - b), got = m.corners || [];
  out.push(want('Fillet and corner radii', radii.reduce((a, b) => a + b, 0), got.reduce((a, b) => a + b, 0)));
  return out;
}

const P = clvParams(), fx = (x, n = 3) => x.toFixed(n);

export const CLV_DEF = {
  pn: 'LEZ-57-143', rev: 'C', status: 'released', nha: 'LEZ-57-140', qty: 4,
  title: 'Clevis block, CS spar-end fork',
  revs: [{ rev: 'A', date: '2026-11-17', short: 'Initial definition', change: 'Initial definition. The block gained a tail under the CS spar cap so the cap bolts have a load path into the fork; the gap seal moved to the centre of the joint gap so the tang ends clear it.' },
    { rev: 'B', date: '2026-11-17', short: 'Bolts 2.75 in inboard (CS spar)' /* literal: history is not recomputed (2026-11-21) */, change: `The CS spar definition (LEZ-57-140) found the cap laminate shears out between the first bolt and the clevis web at 1.0 in (MS ${(SPAR_END.log[1].ms).toFixed(2)}). Bolt 1 moved to ${SPAR_END.bolt1.toFixed(2)} in from the web face and the tail grew to match; NHA LEZ-57-140 is now the CS spar itself (the wing-attach assembly that shared the number became LEZ-57-145).` },
    { rev: 'C', date: '2026-11-17', short: 'Bolts 0.25 in further inboard (L285 basis)', change: `The laminating epoxy is now MGS L285 and the laminate checks use its published typical values × 0.80. The cap's in-plane shear strength is taken at the published interlaminar shear, lower than the old typical value, so shear-out moved bolt 1 to ${SPAR_END.bolt1.toFixed(2)} in from the web face; the tail grew to match.` }],
  effectivity: 'All four positions: upper and lower spar-end joints, left and right',
  params: P,
  datums: [
    { id: 'A', what: 'Tail top face: the bond face against the CS spar cap' },
    { id: 'B', what: 'Pin hole axis' },
    { id: 'C', what: 'Centre line along the length, midway between the long edges' },
  ],
  features: [
    { id: 'outline', kind: 'profile', label: `Envelope ${fx(P.L, 2)} × ${fx(P.W)} × ${fx(P.H)} in; tang ends R ${fx(P.rTang, 2)} in plan, tail end R ${fx(P.rEnd, 2)}`, tol: `L ±0.03, W ±0.005, H ±0.005` },
    { id: 'slot', kind: 'slot', label: `Slot ${fx(P.slot)} wide, ${fx(-P.uSlot, 2)} deep from the pin axis, root fillets R ${fx(P.rSlot, 2)}`, tol: '+0.005 / −0.000 on width', note: `Fits the ${fx(LWA.t)} in LWA plate with a ${fx(LUG.gap, 2)} in running gap each side` },
    { id: 'tail', kind: 'tail', label: `Tail ${fx(P.tail)} thick, ${fx(P.uWeb - P.u0, 2)} long, web-to-tail fillets R ${fx(P.rTail, 2)}`, tol: '±0.005' },
    { id: 'pin', kind: 'hole', d: P.D, at: [0, 0], label: `Pin hole Ø ${fx(P.D)} +0.002 / −0.000 through both tangs, ⊥ A within 0.002`, tol: '+0.002 / −0.000', assy: true, note: 'Ø 0.250 pilot in the detail part; match-reamed to size at assembly through the LWA plate (LEZ-57-142)' },
    ...P.bolts.map((u, i) => ({ id: `b${i + 1}`, kind: 'hole', d: P.dB, at: [u, 0], label: `Bolt hole ${i + 1}: Ø ${fx(P.dB)} +0.003 / −0.000 at ${fx(-u, 2)} inboard of B`, tol: '+0.003 / −0.000', assy: true, note: 'Ø 0.250 pilot in the detail part; drilled and reamed to size at assembly through the CS spar cap' })),
  ],
  tolerances: { general: '.XX ±0.03  ·  .XXX ±0.010  ·  angles ±1°', flatness: '0.005 over the tail bond face (A)', holes: 'hole positions ±0.005 from B along C; on C within 0.005', breakEdges: '0.010–0.030 all edges except the slot root fillets' },
  drawingNotes: ['† Ø .250 pilot in the detail part. Final size is match-drilled and reamed at assembly (pin hole through the LWA plate LEZ-57-142; bolt holes through the CS spar cap).', 'Slot root fillets R .06 are machined, not broken: no tool marks across the fillet.'],
  na: { cut: 'Machined from a blank: no flat pattern', layup: 'Metal part' },

  material: {
    spec: 'AMS-QQ-A-250/4, 2024-T351 plate', alt: 'Commercial 2024-T351 rectangle bar 1.5 × 2 in to ASTM B211 with a material certificate, if the grain runs along the length',
    form: `cut from 1.5 in plate, grain (L) along the length of the part`, density: 0.1003,
    allowables: [['F_tu (L)', '64 ksi', 'MIL-HDBK-5H CN1 table 3.2.3.0(b1), 2024-T351 plate A-basis (METU AE462 copy, accessed 2026-11-19)'], ['F_bru (e/D 2.0)', '117 ksi (0.5–1.0 in; 119 at 0.25–0.499)', 'MIL-HDBK-5H CN1 table 3.2.3.0(b1), 2024-T351 plate A-basis (METU AE462 copy, accessed 2026-11-19)'], ['F_su', '38 ksi (0.25–0.499 in; 37 at 0.5–1.0)', 'MIL-HDBK-5H CN1 table 3.2.3.0(b1), 2024-T351 plate A-basis (METU AE462 copy, accessed 2026-11-19)']],
  },
  process: [
    { op: 'Machine', spec: 'From the blank below: profile, slot, fillets and Ø 0.250 pilot holes. Surface finish 125 µin Ra or better; slot faces 63 µin Ra.' },
    { op: 'Edges', spec: 'Break all edges 0.010–0.030 in except the slot root fillets; no burrs in the slot or the pilot holes.' },
    { op: 'Conversion coat', spec: 'MIL-DTL-5541, Type I, Class 1A, all surfaces.' },
    { op: 'Prime', spec: 'MIL-PRF-23377 epoxy primer, all surfaces except the tail bond face (A), which is masked; no primer inside the slot.' },
    { op: 'Bond face', spec: 'Left bare (conversion coat only) for the flox bond to the CS spar cap; surface preparation is part of the CS spar layup (LEZ-57-140).' },
    { op: 'Identify', spec: 'Bag and tag with part number and revision; no stamping or engraving on the part.' },
  ],

  checks: ['clv-tangs', 'clv-web', 'clv-tail', 'wing-attach'],
  rules: [
    { id: 'pin-eD', label: 'Tang end distance e/D ≥ 2.0', v: CLV.e / CLV.D, min: 2 },
    { id: 'pin-side', label: 'Pin hole side distance (W/2)/D ≥ 1.5', v: CLV.W / 2 / CLV.D, min: 1.5 },
    { id: 'bolt-eD', label: 'Tail-end bolt end distance e/d ≥ 2.0', v: (CLV.bolts.at(-1) - CLV.u0) / CLV.dB, min: 2 },
    { id: 'bolt-side', label: 'Bolt side distance (W/2)/d ≥ 2.0', v: CLV.W / 2 / CLV.dB, min: 2 },
    { id: 'pitch', label: 'Bolt pitch ≥ 4d', v: LUG.pitch, min: 4 },
    { id: 'web-b1', label: 'Web face to bolt 1 edge ≥ 1.0 d (wrench and fillet room)', v: (CLV.uWeb - CLV.bolts[0] - CLV.dB / 2) / CLV.dB, min: 1 },
    { id: 'slot-r', label: 'Slot root fillet ≥ 0.06 in', v: CLV.rSlot / 0.06, min: 1 },
  ],
  mass: { each: CLV.mass, from: 'solid volume × 0.1003 lb/in³ (checked against the CadQuery solid)' },
  hardware: [],
  hardwareNote: 'None on the detail part. The three AN8 through-bolts, crush tubes, nuts and washers are hardware on the CS spar (LEZ-57-140); the pin, nut and washers are installation hardware on LEZ-57-145.',
  interfaces: [
    { id: 'I1', with: 'LEZ-57-142 LWA plate', feature: 'slot', what: 'Slot width = plate + running gap each side ≥ 0.03 in; slot bottom ≥ 0.10 in past the plate\'s lug end; widths equal; pin coaxial',
      check: () => { const gap = (CLV.slot - LWA.t) / 2, clear = CLV.slotIn - LWA.e; return { ok: gap >= 0.03 - 1e-9 && clear >= 0.10 - 1e-9 && CLV.W === LWA.W, detail: `gap ${gap.toFixed(3)} in each side, ${clear.toFixed(2)} in past the lug end, widths ${CLV.W} / ${LWA.W} in` }; } },
    { id: 'I2', with: 'CS spar cap (spar end)', feature: 'tail', what: 'Tail bond face under the cap with a 0.03 in flox line; tang tops inside the skin; block inside the spar width',
      check: () => { const top = ATTACH.depth - CLV.tail / 2, need = Math.max(LUG.cap, SPAR_END.tTop) + LUG.flox, tang = ATTACH.depth - CLV.H / 2, spar = GEO.csSpar.width * 12; return { ok: top >= need - 1e-9 && tang >= LUG.skin - 1e-9 && CLV.W <= spar - 0.5, detail: `bond face ${top.toFixed(3)} in inside the skin (needs ≥ ${need.toFixed(3)}); tang top ${tang.toFixed(3)} in (needs ≥ ${LUG.skin}); ${CLV.W} in in a ${spar.toFixed(2)} in spar` }; } },
    { id: 'I3', with: 'AN8 through-bolts and CS spar end laminate (LEZ-57-140)', feature: 'b1', what: 'Bolt count, diameter and spacing match the spar-end checks (bearing, shear-out, net section)',
      check: () => { const e = CLV.uWeb - CLV.bolts[0], ok = CLV.dB === SPAR_END.D && CLV.bolts.length === SPAR_END.nB && Math.abs(e - SPAR_END.bolt1) < 1e-9; return { ok, detail: `${CLV.bolts.length} × Ø ${CLV.dB} in, bolt 1 ${e.toFixed(2)} in from the web; the spar-end checks use ${SPAR_END.nB} × Ø ${SPAR_END.D} in at ${SPAR_END.bolt1.toFixed(2)} in` }; } },
    { id: 'I4', with: `AN${ATT.pin} pin (hardware on LEZ-57-145)`, feature: 'pin', what: 'Hole diameter equals the AN pin diameter',
      check: () => ({ ok: Math.abs(CLV.D - ATT.pin / 16) < 1e-9, detail: `Ø ${CLV.D} in hole, AN${ATT.pin} = ${ATT.pin / 16} in` }) },
    { id: 'I5', with: 'Root-rib gap seal (LEZ-57-152)', feature: 'outline', what: 'Tang ends stop at least 0.03 in short of the seal in the joint gap',
      check: () => { const tip = LUG.yPin + CLV.u1 / 12, seal = SEAL.y - SEAL.dIn / 24, c = (seal - tip) * 12; return { ok: c >= 0.03 - 1e-9, detail: `tang ends ${c.toFixed(3)} in short of the seal` }; } },
  ],
  tooling: { needed: false, text: 'None for the detail: machined from a cut blank on a mill (slot with a 0.125 in ball-nose or a corner-radius end mill for the R 0.06 root). The bolt holes are finished at assembly through the CS spar on its layup jig (LEZ-57-140); the pin hole on the wing-attach jig (LEZ-57-145).' },
  sourcing: {
    blank: 'Cut from 1.5 in 2024-T351 plate (AMS-QQ-A-250/4): a 12 × 12 in piece gives five 2.1 × 12 in strips, one per block plus a spare',
    vendor: 'Online Metals part 7946', url: 'https://www.onlinemetals.com/en/buy/aluminum/1-5-aluminum-plate-2024-t351/pid/7946?variant=7946_24_36',
    cost: 323.73 / 4, costAsOf: '2026-11-17', perAircraft: 4, lead: 'Stock, cut to order (lead time not stated)',
    note: `One 12 × 12 in piece ($323.73) covers all four blocks; each blank leaves ${(12 - P.L).toFixed(1)} in of length for holding and saw allowance.`,
  },
};

// memory-audit integration (2026-11-19): this record's new revision
import { memRev } from './revs_memaudit.js';
memRev(CLV_DEF);
