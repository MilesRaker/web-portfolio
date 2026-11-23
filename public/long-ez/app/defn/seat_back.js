// LEZ-53-170 front seat back: the definition record (numbers from wpA4). A flat PVC sandwich reclined 36°, from the belly
// to its top edge at FS 97.2, cut to the shell's inner contour where its plane meets it, leg openings for the rear
// passenger, the front shoulder-harness anchors in solid hard points. Solid: cad/blkA_bulkhead.py in the seat-back plane
// (u = BL, v up the slope from the foot at the floor, w aft-down through the thickness). Notional.
import { FIXED, BASE_MAT, MATSYS, fusAt, DEFAULT_DESIGN } from '../structures.js';
import { ANCH, BELT, CAB, OCCS, ACROMION, HARNESS_OPEN } from '../parts/wpB4_cabin.js';
import { STRAP, strapAngle, shoulderPt, strapWorst, OCC_KEYS } from '../parts/wpA4_seatback.js';
import { insideFus } from '../systems.js';
import { PROCESS } from '../plybook.js';
import { SB, SBG, SBP, SUG, sbParams, sbMassOf, sbTape, sbRegs } from '../parts/wpA4_seatback.js';
import { RHO } from '../parts/wpA1_f28.js';
import { pickAN } from '../parts/wp16_wing_attach.js';
import { flatVolumes, edgeOf, ligament, crossings, pip } from '../parts/wpA0_flat.js';
import { flatExpect, buy, plyAreas, PRICE } from './blkA_common.js';
import { LAM_ALLOW, LAM_SPEC, LAM_FORM, LAM_CURE, ppBuy, PP_VENDOR, PP_PRICE } from './p_common.js';

const fx = (x, n = 2) => x.toFixed(n), G = SBG, tB = BASE_MAT.BID.t;
export const sbParamsNow = () => sbParams();
const P = sbParams(), V = flatVolumes(P), A0 = plyAreas(P, { BID: tB }), B = buy({ BID: (A0.BID || 0) + sbTape().area * SB.tape.n });
const inOpen = (c) => [...G.legs, ...G.slots.map((s) => s.R)].some((R) => c.u > R[0] && c.u < R[1] && c.v > R[2] && c.v < R[3]);
const anAN = pickAN(SB.anchor.an, SB.t + 0.125 + 2 * 0.063);
/** the least clearance (in) from the upper panel's outline (above the sill) to the OML, by bisection on the offset */
const canopyClr = () => { const r = SB.recline * Math.PI / 180; let m = Infinity; for (const [u, v] of G.pts) { const [fs, z] = G.at(v); if (z * 12 <= SB.sillWL + 0.05) continue; let lo = 0, hi = 3; for (let i = 0; i < 30; i++) { const k = (lo + hi) / 2; if (insideFus(fs, u / 12, z, k / 12)) lo = k; else hi = k; } m = Math.min(m, lo); } void r; return m; };
export const SB_DEF = {
  pn: 'LEZ-53-170', rev: 'C', status: 'released', nha: 'LEZ-53-150', qty: 1, kind: 'laminate',
  title: 'Front seat back (reclined bulkhead)',
  solidText: 'CadQuery solid in the seat-back plane: the outline extruded layer by layer (core, hard points, faces), holes cut through',
  templates: 'One full-size outline template (developed in the reclined plane) with the anchor and hole positions; a 36° installation gauge',
  // seat-2 2026-11-22: the live rev texts read anchors that moved to LEZ-53-171; they are the frozen record's words (rev_frozen.js)
  revs: [{ rev: "A", date: '2026-11-18', short: "Initial definition", change: "Initial definition. The front seat back was a station (FS 97.2) and an upholstery slab; the shell's belt doubler F-D2 sat behind it and the shoulder-harness anchors were defined nowhere. As defined: a 0.540 in PVC sandwich reclined 36°, belly to FS 97.2 (WL 46.70), leg openings outboard of BL ±7.5 up to 6.5 in above the floor, the front shoulder-harness anchors (AN5) at BL ±3.5 in solid-BID hard points running to the side walls, pass-through holes from the routed lines; checks f170-sh, f170-back, f170-tape." }, { rev: "B", date: '2026-11-18', short: "Anchors sized to block B's strap load", change: "Integration with block B (ICD phase 2): f170-sh divided the occupant by FIXED.belts.points, which block B's builder set to 2 (shell lap anchors only), putting 1,287 lb on each shoulder anchor (MS −0.21). The anchors now take block B's own strap load (n·W·0.6/2 × 1.33 = 772 lb ultimate), independent of the anchor count, and the hard-point depth and core are sized for it (lightest first at the +15 % reserve: 2 in, 0.5 in). The anchor positions are block A's; I2 lists where B's strap ends are. The roll tube LEZ-27-140 has its hole (flat parts now load after B and C)." }, { rev: "C", date: '2026-11-18', short: "Back to shoulder height; anchors raised", change: "Safety fix (coordinator decision): the back ended at WL 39.4 with the anchors at WL 38.55, so the shoulder straps ran about 61° below horizontal and the upper back had no support. The back now runs on up the slope to WL 46.7 (as the 3D model's FrontSeat): taped to the shell up to the sill (WL 41.83), free-standing above it 1 in inside the canopy. The anchors move to BL ±3.5, WL 46.1 (FS 102.10): the strap runs 106.0° below horizontal from the design shoulder point (FS 103.92, WL 52.47; 0–30° guidance typed from memory). No foam core passes the two straps' transverse shear, so the upper panel and 1.5 in side frames down the taped edges are solid BID (f170-sh); the aft face stays forward of the rear seat pan (FS 103)." }],
  effectivity: 'One per aircraft', params: P, holeNames: G.holes.map((h) => h.what),
  datums: [{ id: 'A', what: `Foot line: the plane's trace on the floor reference, FS ${fx(SB.sPan * 12)}, WL ${fx(SBP.o[2] * 12)}` }, { id: 'B', what: 'Centre line, BL 0' }, { id: 'C', what: `Top edge, WL ${fx(SB.topWL)} at FS ${fx(G.at(G.vTop)[0] * 12)} (reclined ${SB.recline}° from vertical)` }],
  features: [
    { id: 'outline', kind: 'profile', label: `The shell's inner contour where the reclined plane meets it up to the sill (WL ${SB.sillWL}, ${fx(2 * G.wRoot)} in wide), above it ${SB.canopyClr} in inside the OML (canopy) to the top at WL ${SB.topWL} (${fx(2 * G.wTop)} in wide), ${fx(G.vTop - G.vBot)} in up the slope; leg openings BL ±${SB.leg.u0} to the walls from the belly to ${SB.leg.h} in above the floor`, tol: 'Contour ±1/16 in to the template' },
    { id: 'face', kind: 'layup', label: `${SB.faceBID} × 6781 0/90 each face on ${SB.coreIn} in Divinycell HT61`, tol: 'Debulked; no bridging or porosity' },
    { id: 'hp', kind: 'layup', label: `Solid 6781 in place of the core over the whole upper panel above the sill and in ${SB.frame} in side frames along the taped side edges down to the floor (the strap load path)`, tol: 'Edges ±0.25 in' },
    { id: 'pass', kind: 'hole', label: `${G.pass.length} pass-through holes (hole table); the left raceway in one hole; the roll tube and the engine controls run through the leg openings`, tol: '±0.06 in position' },
  ],
  tolerances: { general: '.X ±0.06 · .XX ±0.03 · contour ±1/16', flatness: 'Flat within 1/16 in', holes: 'Pass-throughs ±0.06 in', breakEdges: 'All cut edges sealed with flox' },
  drawingNotes: ['Developed view of the reclined plane from aft (BL + to the right); v up the slope from datum A.', 'The harness end fittings and bolts are LEZ-25-130 (block B), on these anchors.'], generalNote: 'Cured laminate tap-tested; every hole edge sealed.', na: {},
  material: { spec: '6781 S2-glass, MTM45-1 prepreg (NCAMP), Divinycell HT61 1/2 in sheet, flox', alt: 'None', form: `${LAM_FORM()}, flat on the table`, density: null,
    allowables: [...LAM_ALLOW(false), ['HT61 core shear', 'datasheet-typical', 'BOUND (see f170-back)']] },
  process: [
    { op: 'Layup', spec: 'Flat on the table: forward face on the HT61 sheet; cut the hard-point pockets and fill with 6781; aft face. Bag and cure on the NCAMP M cycle (250 ± 10 °F, 4–6 h, ≥ 28 inHg; no post-cure), the part whole in the oven; witness coupon.' },
    { op: 'Cut', spec: 'To the template: outline, leg openings and holes; seal every edge.' },
    { op: 'Install', spec: `At ${SB.recline}° in the fuselage jig, top edge at WL ${SB.topWL}; flox fillets; ${SB.tape.n} × 6781 × ${2 * SB.tape.lap} in tapes both faces to the belly and the sides up to the sill (the upper panel is free-standing); drill the anchors ⊥ the panel.` },
    { op: 'Inspect', spec: 'Tap test; recline and top-edge station; anchor positions.' },
  ],
  checks: ['f170-sh', 'f170-back', 'f170-tape', 'f170-slab'],
  rules: [{ id: 'edge', label: 'Every hole ≥ 0.25 in from the outline (in)', v: Math.min(...G.holes.map((h) => edgeOf(h, [G.pts]))), min: 0.25 }, { id: 'lig', label: 'Ligament between holes ≥ 0.25 in (in)', v: ligament(G.holes), min: 0.25 },
    { id: 'canopy', label: 'Upper panel inside the canopy (OML) by ≥ 1 in (in)', v: canopyClr(), min: SB.canopyClr - 0.01 },
    // integration 2026-11-19 (Miles / coordinator): the strap leaves the back at the top-edge anchors (WL ${SB.anchor.wl}); the angle is
    // judged at each ANSUR II occupant's shoulder (B's OCCS: 5th female, 50th male, 95th male), governed by the worst. It fails for the
    // 50th / 95th male: an open decision for Miles (HARNESS_OPEN), shown here as it is, to be confirmed at his seated mock-up fit check
    { id: 'rear', label: 'Aft face forward of the rear seat pan front, FS 103 (block B) (in)', v: 82.5 - Math.max(...G.pts.map(([, v]) => G.at(v)[0] * 12 + SB.t / 2 * Math.cos(SB.recline * Math.PI / 180))), min: 0 }],
  mass: { each: sbMassOf({ ...V }), from: 'layer volumes × density (HT61, 6781) plus the installation tapes; checked against the solid' },
  hardware: [], hardwareNote: 'None: the shoulder-harness anchors are on LEZ-53-171 (seat-2).',
  interfaces: [
    { id: 'I1', with: 'LEZ-53-150 fuselage shell', feature: 'outline', what: 'Outline on the shell\'s inner contour in the reclined plane', check: () => { const t = FIXED.fuselage.coreIn + 2 * FIXED.fuselage.faceBID * tB; return { ok: Math.abs(t - SB.tsh) < 1e-9 && G.wRoot > 10, detail: `offset ${fx(SB.tsh, 3)} in; half-width ${fx(G.wRoot)} in at the sill, where the taped part ends` }; } },
    { id: 'I2', with: 'LEZ-53-171 upper seat back and headrest', feature: 'outline', what: 'The upper panel stands on the top edge (the knee), taped both faces', check: () => ({ ok: Math.abs(SUG.at(0)[1] * 12 - SB.topWL) < 0.01 && SUG.wRoot <= G.wTop + 0.5, detail: `knee WL ${fx(SB.topWL)} at FS ${fx(G.at(G.vTop)[0] * 12)}; upper panel ${fx(2 * SUG.wRoot)} in wide on a ${fx(2 * G.wTop)} in top edge` }) },
    { id: 'I3', with: 'Lines routed through the seat back', feature: 'pass', what: 'Every crossing has a hole, or runs through a leg opening', check: () => { const all = crossings(SBP).filter((c) => pip([c.u, c.v], G.pts) || inOpen(c)), miss = all.filter((c) => !inOpen(c) && !G.pass.some((h) => Math.hypot(h.u - c.u, h.v - c.v) + c.r <= h.r + 1e-3)); return { ok: !miss.length, detail: `${all.length} crossings: ${G.pass.length} holes, the rest through the leg openings${miss.length ? `; missing ${miss.map((m) => m.pn).join(', ')}` : ''}` }; } },
    { id: 'I4', with: 'LEZ-25-100 floor and LEZ-25-120 cushion (block B)', feature: 'outline', what: 'Floor meets the seat back at datum A; the cushion lies on the forward face', check: () => ({ ok: SBP.o[2] * 12 >= fusAt(SB.sPan).bot * 12 + SB.tsh - 0.01, detail: `(seat-3: the foot on the belly's inner skin, the front liner meeting it) foot line FS ${fx(SB.sPan * 12)} WL ${fx(SBP.o[2] * 12)}: B's floor stops here or slots under it` }) },
  ],
  tooling: { needed: true, text: 'Developed outline template with the anchor and hole positions; 36° installation gauge; fuselage jig station.' },
  sourcing: { blank: `${B.bid} yd 6781 (50 in, +15 %); 1 sheet 1/2 in HT61`, vendor: PP_VENDOR.vendor, url: PP_VENDOR.url,
    cost: +(B.cost + PRICE.H45sheet38).toFixed(2), costAsOf: '2026-11-18', perAircraft: 1, lead: 'Stock items', note: 'Prices approximate, prepreg / HT proxies (p_common PP_PRICE, BOUND).' },
};
void RHO;
