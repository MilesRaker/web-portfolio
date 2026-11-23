// LEZ-53-171 upper seat back and headrest: the definition record (numbers from wpA4). A vertical panel standing on the front
// seat back's top edge (the knee), as builders' Long-EZ front seats have it (longezpush.com Ch. 26: the back slopes, then a
// vertical top section about 4 in tall, with the headrest pad above), carrying the front shoulder-harness anchors near its top
// edge and a round-topped headrest on the centre line. Solid: cad/slabs.py in its own vertical plane (u = BL, v up from the
// knee, w aft through the thickness). Notional.
import { FIXED, BASE_MAT, DEFAULT_DESIGN } from '../structures.js';
import { ANCH, BELT, OCCS, ACROMION, HARNESS_OPEN, PAD_F } from '../parts/wpB4_cabin.js';
import { SB, SBG, SU, SUG, SUP, STRAP, strapAngle, shoulderPt, strapWorst, OCC_KEYS, suParams, suMassOf, suTape, suAnchorPt, suFace } from '../parts/wpA4_seatback.js';
import { insideFus } from '../systems.js';
import { canPt, tCut, CANF } from '../parts/wpB1_canopy.js';
import { pickAN } from '../parts/wp16_wing_attach.js';
import { flatVolumes, edgeOf, ligament } from '../parts/wpA0_flat.js';
import { buy, plyAreas, PRICE } from './blkA_common.js';
import { LAM_ALLOW, LAM_FORM, PP_VENDOR } from './p_common.js';

const fx = (x, n = 2) => x.toFixed(n), G = SUG, tB = BASE_MAT.BID.t;
export const suParamsNow = () => suParams();
const P = suParams(), V = flatVolumes(P), A0 = plyAreas(P, { BID: tB }), B = buy({ BID: (A0.BID || 0) + suTape().area * SU.tape.n });
const anAN = pickAN(SB.anchor.an, SB.t + 0.125 + 2 * 0.063);
const aP = suAnchorPt(G.anchors[0]), [kFS, kWL] = [G.at(0)[0] * 12, G.at(0)[1] * 12];
/** least clearance (in) from the outline to the OML, both faces, by bisection on the offset */
const canopyClr = () => { let m = Infinity; for (const [u, v] of G.pts) { if (G.at(v)[1] * 12 <= SB.sillWL + 0.05) continue; let lo = 0, hi = 3; for (let i = 0; i < 30; i++) { const k = (lo + hi) / 2, h = SB.t / 24; const ok = [G.at(v)[0] - h, G.at(v)[0] + h].every((sF) => { const z = G.at(v)[1] * 12, t0 = tCut(sF, -(CANF.t + k)); let a = t0, b = Math.PI / 2; if (canPt(sF, b, -(CANF.t + k))[1] < z) return false; for (let j = 0; j < 40; j++) { const m = (a + b) / 2; if (canPt(sF, m, -(CANF.t + k))[1] < z) a = m; else b = m; } return Math.abs(u) <= canPt(sF, a, -(CANF.t + k))[0] + 1e-6; }); if (ok) lo = k; else hi = k; } m = Math.min(m, lo); } return m; };
export const SU_DEF = {
  pn: 'LEZ-53-171', rev: 'A', status: 'released', nha: 'LEZ-53-150', qty: 1, kind: 'laminate',
  title: 'Upper seat back and headrest (vertical top section)',
  solidText: 'CadQuery solid in its vertical plane: the outline extruded layer by layer (solid 6781 below the top edge, HT61 sandwich in the headrest), anchor holes cut through',
  templates: 'One full-size outline template with the anchor positions; a square to set it vertical on the seat back',
  revs: [{ rev: 'A', date: '2026-11-22', short: 'Initial definition', change: 'Initial definition (seat-2, owner: "redesign the head rest and upper portion of the seat to match images of the seats you have found"). Builders\' front seats (longezpush.com Ch. 26) slope about 20.5 in up from the floor and then stand vertical for about 4 in, with the headrest pad above the top. The reclined back LEZ-53-170 now ends at that knee; this panel stands on it, vertical, 4 in to its top edge, with the shoulder-harness anchors (moved here from LEZ-53-170) 0.6 in under that edge at BL ±5.5, and an 8 in wide round-topped headrest above it on the centre line, ≥ 1 in inside the canopy.' }],
  effectivity: 'One per aircraft', params: P, holeNames: G.holes.map((h) => h.what),
  datums: [{ id: 'A', what: `Knee line: the panel's lower edge on LEZ-53-170's top edge, FS ${fx(kFS)}, WL ${fx(kWL)}` }, { id: 'B', what: 'Centre line, BL 0' }, { id: 'C', what: `Top edge, WL ${fx(kWL + G.top)}; headrest apex WL ${fx(kWL + G.vHead)}` }],
  features: [
    { id: 'outline', kind: 'profile', label: `Vertical panel ${fx(2 * G.wRoot)} in wide at the knee, ${fx(2 * G.wTop)} in at the top edge ${fx(G.top)} in above it, ≥ ${SU.canopyClr} in inside the canopy; headrest ${fx(2 * G.hh)} in wide, ${fx(G.vHead - G.top)} in above the top edge with a round top (radius ${fx(G.hh)})`, tol: 'Contour ±1/16 in to the template' },
    { id: 'face', kind: 'layup', label: `${SB.faceBID} × 6781 0/90 each face; solid 6781 between them below the top edge; ${SB.coreIn} in Divinycell HT61 in the headrest`, tol: 'Debulked; no bridging or porosity' },
    { id: 'anchor', kind: 'hole', label: `Shoulder-harness anchors 2 × Ø ${fx(2 * G.anchors[0].r, 3)} at BL ±${SU.anchor.u}, WL ${fx(aP[2])} (FS ${fx(aP[1])}), ⊥ the panel; strap ${fx(strapWorst().deg, 1)}° below horizontal from the worst ANSUR II shoulder`, tol: '±0.03 in; ⊥ within 1°', assy: true },
    { id: 'knee', kind: 'layup', label: `Knee joint on LEZ-53-170's top edge: flox, ${SU.tape.n} × 6781 × ${2 * SU.tape.lap} in tapes both faces`, tol: 'Vertical within 0.5°', assy: true },
  ],
  tolerances: { general: '.X ±0.06 · .XX ±0.03 · contour ±1/16', flatness: 'Flat within 1/16 in', holes: 'Anchors ±0.03 in', breakEdges: 'All cut edges sealed with flox' },
  drawingNotes: ['View from aft (BL + to the right); v up from datum A.', 'The harness end fittings and bolts are LEZ-25-130 (block B), on these anchors.', 'The headrest pads (0.9 in, split at mid-height) are LEZ-25-120.'], generalNote: 'Cured laminate tap-tested; every hole edge sealed.', na: {},
  material: { spec: '6781 S2-glass, MTM45-1 prepreg (NCAMP), Divinycell HT61 sheet, flox', alt: 'None', form: `${LAM_FORM()}, flat on the table`, density: null, allowables: [...LAM_ALLOW(false)] },
  process: [
    { op: 'Layup', spec: 'Flat on the table: forward face; solid 6781 below the top-edge line, HT61 in the headrest; aft face. Bag and cure on the NCAMP M cycle (250 ± 10 °F, 4–6 h, ≥ 28 inHg; no post-cure); witness coupon.' },
    { op: 'Cut', spec: 'To the template: outline and anchor holes; seal every edge.' },
    { op: 'Install', spec: `Stand vertical on LEZ-53-170's top edge at FS ${fx(kFS)}; flox; ${SU.tape.n} × 6781 × ${2 * SU.tape.lap} in tapes both faces across the knee; drill the anchors ⊥ the panel.` },
    { op: 'Inspect', spec: 'Tap test; vertical; anchor positions; canopy closes clear.' },
  ],
  checks: ['f171-sh'],
  rules: [{ id: 'edge', label: 'Anchor holes ≥ 0.5 in from the outline (in)', v: Math.min(...G.holes.map((h) => edgeOf(h, [G.pts]))), min: 0.5 }, { id: 'lig', label: 'Ligament between holes ≥ 0.25 in (in)', v: ligament(G.holes), min: 0.25 },
    { id: 'canopy', label: 'Inside the canopy\'s inner skin by ≥ 1 in above the sill, both faces (in)', v: canopyClr(), min: SU.canopyClr - 0.01 },
    { id: 'strapLo', label: `Shoulder strap no more than ${SB.strapUp}° above horizontal from every occupant's shoulder (AC 21-34) (deg + ${SB.strapUp}, least)`, v: Math.min(...OCC_KEYS.map((k) => strapAngle(k))) + SB.strapUp, min: 0 },
    { id: 'strapHi', label: `Shoulder strap no more than ${SB.strapMax}° below horizontal from the shoulder, worst ANSUR II occupant (${strapWorst().k}: ${OCC_KEYS.map((k) => `${k} ${fx(strapAngle(k), 1)}°`).join(', ')}) (AC 21-34) (${SB.strapMax} − deg)`, v: SB.strapMax - strapWorst().deg, min: 0 }],
  mass: { each: suMassOf({ ...V }), from: 'layer volumes × density (HT61, 6781) plus the knee tapes; checked against the solid' },
  hardware: [], hardwareNote: `None on the detail part: the harness end-fitting bolts (${anAN.std} through the panel, an end fitting and a washer, MS21042L${SB.anchor.an} nut) are LEZ-25-130's.`,
  interfaces: [
    { id: 'O1', with: 'Miles (open decision, 2026-11-19)', feature: 'anchor', what: 'OPEN: shoulder-harness arrangement', open: true, check: () => ({ ok: true, detail: `OPEN ITEM: ${HARNESS_OPEN} Shoulders (FS / WL) from ${ACROMION.src}, on the torso line from the hip to the upper pad (lean ${fx(OCCS.torso.lean, 1)}° from vertical): ${OCC_KEYS.map((k) => `${k} ${fx(OCCS.front[k][0], 1)} / ${fx(OCCS.front[k][1], 1)}`).join(', ')}; anchors WL ${fx(aP[2])}; strap ${OCC_KEYS.map((k) => `${fx(strapAngle(k), 1)}°`).join(' / ')} below horizontal (rule ≤ ${SB.strapMax}°).` }) },
    { id: 'I1', with: 'LEZ-53-170 front seat back', feature: 'knee', what: 'Lower edge on the seat back\'s top edge; root no wider than that edge', check: () => ({ ok: Math.abs(kWL - SB.topWL) < 0.01 && G.wRoot <= SBG.wTop + 0.5, detail: `knee WL ${fx(kWL)} = LEZ-53-170's top edge; ${fx(2 * G.wRoot)} in on ${fx(2 * SBG.wTop)} in` }) },
    { id: 'I2', with: 'LEZ-25-130 front shoulder harness (block B, merged)', feature: 'anchor', what: 'B\'s strap ends on the anchors (≤ 0.25 in), B\'s strap load = the one sized for', check: () => {
      const an = G.anchors.map((a) => suAnchorPt(a)), off = Math.max(...an.map((a) => Math.min(...ANCH.shoulder.map((b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]))))), Pu = DEFAULT_DESIGN.emergencyFwd * BELT.occupant * BELT.shoulderShare / 2 * BELT.ff;
      const same = ['occupant', 'shoulderShare', 'ff'].every((k) => STRAP[k] === BELT[k]);
      return { ok: G.anchors.length === 2 && same && off <= 0.25, detail: `anchors BL ±${SU.anchor.u} at FS ${fx(an[0][1])}, WL ${fx(an[0][2])}, AN${SB.anchor.an}, sized for ${fx(Pu, 0)} lb ultimate per strap (B's BELT${same ? '' : ' DIFFERS'}); B's strap ends ${fx(off, 2)} in from them; 95th-male shoulder FS ${fx(shoulderPt('m95')[0])}, WL ${fx(shoulderPt('m95')[1])}` }; } },
    { id: 'I3', with: 'LEZ-25-120 seat pads (block B)', feature: 'outline', what: 'Upper pad between the anchors; headrest pads inside the headrest outline', check: () => ({ ok: PAD_F.upper.hw <= Math.abs(G.anchors[0].u) - 0.5 && PAD_F.head.hw <= G.hh - 0.25 && PAD_F.head.z1 <= suFace(G.vHead)[1], detail: `upper pad BL ±${fx(PAD_F.upper.hw)}; headrest pads BL ±${fx(PAD_F.head.hw)}, ${PAD_F.head.t} in thick, WL ${fx(PAD_F.head.z0)}–${fx(PAD_F.head.z1)} split at ${fx(PAD_F.head.split)}` }) },
  ],
  tooling: { needed: true, text: 'Outline template with the anchor positions; square for vertical on the seat back.' },
  sourcing: { blank: `${B.bid} yd 6781 (50 in, +15 %); HT61 offcut`, vendor: PP_VENDOR.vendor, url: PP_VENDOR.url, cost: +B.cost.toFixed(2), costAsOf: '2026-11-22', perAircraft: 1, lead: 'Stock items', note: 'Prices approximate, prepreg / HT proxies (p_common PP_PRICE, BOUND).' },
};
void FIXED; void PRICE; void SUP; void SBG;
