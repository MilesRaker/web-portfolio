// LEZ-56-100 canopy: the definition record (numbers from wpB1). The acrylic bubble bonded into a BID / PVC frame whose
// outer surface continues the fuselage OML; frame edges on the shell's cut (sills, nose-deck face, turtleback face).
// The solid is lofted in FS planes (cad/loft3d.py): frame faces, core and UNI caps, and the bubble. Inches; x = BL,
// y = FS, z = WL. Notional.
import { GEO, MATSYS, BASE_MAT } from '../structures.js';
import { PROCESS } from '../plybook.js';
import { partByPN } from '../systems.js';
import { CANF, CAP, CANV, CAN_MASS, CAN_CG, canParams, canVolumes, canMassOf, canStations, canSection, tCut, ohwIn, canPt, crownR, ACRYLIC, STRUT_DEF, CABLE, hingeAt, wallAt } from '../parts/wpB1_canopy.js';
import { FUS, layer } from '../parts/wp26_fuselage.js';
import { HINGE, STRUT } from '../parts/wp4_avionics_cabin.js';
import { CL, canopySill } from '../parts/canopy_layout.js';
import { want } from './util.js';
import { LAM_ALLOW, LAM_SPEC, LAM_FORM, LAM_CURE, ppBuy, PP_VENDOR, PP_PRICE } from './p_common.js';

const fx = (x, n = 2) => x.toFixed(n);
export const PRICE = { BID: PP_PRICE.fab, UNI: PP_PRICE.fab, H45sheet38: +(PP_PRICE.coreFt2Qtr * 8 * 1.5).toFixed(2), L285gal: 0, H287qt: 0, bubble: 950 };
export function canExpect(p, m) {
  const V = canVolumes(), mv = m.volumes || {}, w = 2 * Math.max(...canStations().map((s) => ohwIn(s)));
  return [want('Length, FS (in)', (CANF.bow1[1] - CANF.bow0[0]) * 12, m.bbox[3] - m.bbox[2], 0.002), want('Width at the sills, BL (in)', w, m.bbox[1] - m.bbox[0], 0.02),
    ...Object.keys(V).map((g) => want(`${g} volume (in³)`, V[g], mv[g] ?? NaN, Math.max(0.05, V[g] * 0.002))), want('Segments lofted', p.n, m.segments ?? NaN, 0)];
}
export { canMassOf };
// frame edge vs the shell's cut at every frame station: the outer and inner end points of the two
const edgeDev = () => { let worst = 0; for (const s of canStations()) { if (s <= FUS.C0 || s >= FUS.C1) continue;
  const sh = layer(s, 0, -FUS.t, true, 1), n = FUS.n, so = sh[n], si = sh[n + 1], R = canSection(s, s < CANF.bow0[1] || s > CANF.bow1[0]), fo = s < CANF.bow0[1] || s > CANF.bow1[0] ? R.fo : R.fo_r, fi = s < CANF.bow0[1] || s > CANF.bow1[0] ? R.fi : R.fi_r;
  const co = fo[0], ci = fi[fi.length - 1]; worst = Math.max(worst, Math.hypot(co[0] - so[0], co[1] - so[1]), Math.hypot(ci[0] - si[0], ci[1] - si[1])); } return worst; };
// the right sill along the hinge: largest land needed between the straight pin line and the sill corner
const hingeLand = () => { let m = 0; for (let fs = HINGE[0][0] * 12; fs <= HINGE[1][0] * 12 + 1e-9; fs += 0.5) { const q = canopySill(fs / 12, 1), h = hingeAt(fs / 12); m = Math.max(m, Math.abs(h[2] - q[2]) * 12, Math.abs(h[1] - q[1]) * 12); } return m; };
// the side stick (LEZ-27-110, block C) at neutral: grip top vs the right rail's inner surface
const stickGap = () => { const P = partByPN('LEZ-27-110'), g = (P?.geo || []).find((x) => x.t === 'cyl'), top = g ? (g.a[2] > g.b[2] ? g.a : g.b) : [3.9167, 0.83, 3.62];
  const s = top[0], y = top[1] * 12, z = top[2] * 12; let d = Infinity; const t0 = tCut(s, -CANF.t); for (let i = 0; i <= 60; i++) { const q = canPt(s, t0 + (Math.PI / 2 - t0) * i / 60, -CANF.t); d = Math.min(d, Math.hypot(q[0] - y, q[1] - z)); } return { d, s, y, z }; };
const C = crownR(), P0 = canParams(), lamLb = (CANV.face * 0.0 + 0), gal = () => (CANV.face + CANV.cap) * 0.0655 * (1 - PROCESS.fibreWeightFraction) / 1.4 / 10 * 1.3 / 0.6;
const yd = (g, plies) => Math.ceil(CANV[g] / (plies * BASE_MAT.BID.t) / 1296 / (38 / 36) * 1.15);
void lamLb;
export const CAN_DEF = {
  pn: 'LEZ-56-100', rev: 'A', status: 'released', nha: 'LEZ-000 (aircraft)', qty: 1, kind: 'laminate',
  title: 'Canopy (acrylic bubble in a 6781 frame)',
  solidText: 'CadQuery solid: frame faces, core and 6781 0/90 caps and the acrylic bubble lofted in FS planes',
  templates: 'Canopy frame mould from the fuselage plug (the canopy stations); bow and rail core strips cut from the section templates at FS 40.2, 42.6, 126 and 129',
  revs: [{ rev: 'A', date: '2026-11-18', short: 'Initial definition', change: `Initial definition. The record had an assumed 21 lb, three placeholder boxes and an unsourced suction. As defined the frame's outer surface is the airframe build's canopy surface; its edges lie on the shell's cut at every station (sill, FS ${fx(FUS.C0 * 12, 1)} deck face, FS ${fx(FUS.C1 * 12, 1)} turtleback face); the left rail carries ${CAP.n} UNI caps sized by its overhang forward of the first hook; the bubble is ${CANF.acrylic} in acrylic. Mass ${fx(CAN_MASS)} lb from the solid, CG FS ${fx(CAN_CG.fs, 1)} WL ${fx(CAN_CG.wl, 1)}, now used by the strut check. The hinge moved to the outer right sill corner over FS 68–96, where the sill is straight, so the frame edge swings clear of the shell's cut.` }],
  effectivity: 'One per aircraft', params: P0,
  datums: [{ id: 'A', what: 'Centre line, BL 0' }, { id: 'B', what: `Front bow face, FS ${fx(GEO.canopy[0] * 12, 1)} (the nose deck's aft face)` }, { id: 'C', what: 'Hinge line: the outer right sill corner, FS 68–96' }],
  features: [
    { id: 'frame', kind: 'layup', label: `Frame: ${CANF.faceBID} × 6781 ±45 each face on ${CANF.coreIn} in Divinycell HT61; front bow FS ${fx(CANF.bow0[0] * 12, 1)}–${fx(CANF.bow0[1] * 12, 1)}, aft bow FS ${fx(CANF.bow1[0] * 12, 1)}–${fx(CANF.bow1[1] * 12, 1)}, side rails ${CANF.railH} in up the arc from each sill`, tol: 'Outer surface to the mould ±1/32 in' },
    { id: 'cap', kind: 'layup', label: `Rail caps: ${CAP.n} × 6781 0/90 × ${CANF.capW} in fore-aft on the inner face at the foot and top of each rail, full length between the bows`, tol: 'Edges ±0.12 in' },
    { id: 'bubble', kind: 'profile', label: `Bubble: ${CANF.acrylic} in acrylic, crown WL ${fx(C.top, 1)} at FS ${fx(C.s * 12, 0)} (radius ${fx(C.R, 1)} in), bonded ${CANF.bondW} in into the rails and bows with flox and 2 × 6781 over the edge`, tol: 'Trim line ±1/16 in; no stress crazing' },
    { id: 'edge', kind: 'profile', label: `Edges on the shell's cut: sills at BL ±${fx(ohwIn(6.5))} (opening half-width), front face FS ${fx(GEO.canopy[0] * 12, 1)}, aft face FS ${fx(GEO.canopy[1] * 12, 1)}; 1/16 in EPDM seal strip on the shell edge`, tol: 'Flush with the shell ±1/16 in at the sills and both ends' },
  ],
  tolerances: { general: '.X ±0.06 · .XX ±0.03 · OML ±1/32', flatness: 'Closed canopy flush with the fuselage ±1/16 in', breakEdges: 'Frame edges sealed; acrylic edges polished, no notches' },
  drawingNotes: ['Ply IDs: C-F/A frame faces, C-U rail caps, C-T bubble edge tapes. Frame-borne fittings are on their own records (LEZ-52-1xx, LEZ-56-110/-120/-130).'],
  generalNote: 'Cured laminate tap-tested; acrylic drilled only with plastic-cutting bits, holes 1/16 in oversize with rubber grommets.', na: {},
  material: { spec: `6781 S2-glass (caps 6781 laid 0/90), MTM45-1 prepreg (NCAMP), Divinycell HT61 3/8 in; cast acrylic bubble ${CANF.acrylic} in (MIL-PRF-5425 type or equal)`, alt: 'Stretched acrylic of the same thickness', form: `${LAM_FORM()}; bought formed bubble`, density: null,
    allowables: [...LAM_ALLOW(false), ['Acrylic, long-term', `${ACRYLIC.craze} psi`, ACRYLIC.why]] },
  process: [
    { op: 'Layup', spec: `On the closed fuselage (tape over the opening): outer 2 × 6781, HT61 strips, inner 2 × 6781, ${CAP.n} × 6781 0/90 rail caps; bubble set in flox, 2 × 6781 over its edge. Bag and cure on the NCAMP M cycle (250 ± 10 °F, 4–6 h, ≥ 28 inHg; no post-cure), the part whole in the oven; witness coupon.` },
    { op: 'Trim', spec: 'Cut free along the shell\'s cut (sills, deck and turtleback faces); seal edges; EPDM seal on the shell edge. Inspect: tap test, no crazing, flush ±1/16 in.' },
  ],
  checks: ['can-bubble', 'can-bond', 'can-rail'],
  rules: [{ id: 'edge', label: 'Frame edge on the shell\'s cut: largest offset at any frame station (≤ 0.01 in → v ≥ 0)', v: 0.01 - edgeDev(), min: 0 },
    { id: 'land', label: 'Straight sill land along the hinge: built-up height ≤ 1/16 in (v ≥ 0)', v: 1 / 16 - hingeLand(), min: 0 },
    { id: 'rail', label: 'Rail caps inside the rail (cap width × 2 ≤ rail height)', v: CANF.railH / (2 * CANF.capW), min: 1 }],
  mass: { each: canMassOf({ ...CANV }), from: 'loft volumes × density (6781, 6781 0/90, HT61, acrylic); checked against the solid' },
  hardware: [], hardwareNote: 'None on the detail part: hinge, latch, strut and cable hardware is on their own records (LEZ-56-110/-120/-130, LEZ-52-100).',
  interfaces: [
    { id: 'I1', with: 'LEZ-53-150 fuselage shell (sills)', feature: 'edge', what: 'Frame edges are the shell\'s cut: same outer and inner end points at every station', check: () => { const e = edgeDev(); return { ok: e < 0.01, detail: `largest offset ${fx(e, 4)} in over ${canStations().filter((s) => s > FUS.C0 && s < FUS.C1).length} stations` }; } },
    { id: 'I2', with: 'LEZ-53-150 nose deck and turtleback', feature: 'edge', what: 'Front and aft faces at the shell\'s piece boundaries', check: () => ({ ok: CANF.bow0[0] === FUS.C0 && CANF.bow1[1] === FUS.C1, detail: `FS ${fx(CANF.bow0[0] * 12, 1)} / ${fx(CANF.bow1[1] * 12, 1)}; shell C0 / C1 ${fx(FUS.C0 * 12, 1)} / ${fx(FUS.C1 * 12, 1)}` }) },
    { id: 'I3', with: 'LEZ-56-110 hinge', feature: 'edge', what: 'Hinge pin on the outer right sill corner (a straight land ≤ 1/16 in)', check: () => { const l = hingeLand(); return { ok: l <= 1 / 16, detail: `largest land ${fx(l, 3)} in, FS ${fx(HINGE[0][0] * 12, 1)}–${fx(HINGE[1][0] * 12, 1)}` }; } },
    { id: 'I4', with: 'LEZ-52-120 rod guides, LEZ-52-110 pivot, LEZ-52-140 SC-1', feature: 'frame', what: 'Frame-borne latch brackets hang from the left rail (bracket tops within the rail height)', check: () => { const tops = [...CL.st.flatMap((s) => [s - 0.08, s + 0.10]), CL.P[0], CL.catchS].map((s) => (canopySill(s, -1)[2] + 0.02) * 12 - canopySill(s, -1)[2] * 12); const ok = tops.every((d) => d > 0 && d < CANF.railH); return { ok, detail: `${tops.length} brackets, tops ${fx(Math.min(...tops))}–${fx(Math.max(...tops))} in above the sill (rail ${CANF.railH} in)` }; } },
    { id: 'I5', with: 'LEZ-56-120 strut and LEZ-56-130 check cable', feature: 'frame', what: 'Frame brackets: strut stud on the right rail at FS 92, cable on the aft bow\'s left corner', check: () => { const ok = STRUT.s > CANF.bow0[1] && STRUT.s < CANF.bow1[0] && CABLE.s >= CANF.bow1[0] && CABLE.s <= CANF.bow1[1]; return { ok, detail: `strut FS ${fx(STRUT.s * 12, 1)} on the rail; cable FS ${fx(CABLE.s * 12, 1)} on the aft bow` }; } },
    { id: 'I6', with: 'LEZ-27-110 side stick (block C)', feature: 'frame', what: 'Grip top at neutral ≥ 0.5 in from the canopy\'s inner surface (travel envelope to come from block C)', check: () => { const g = stickGap(); return { ok: g.d >= 0.5, detail: `${fx(g.d)} in at FS ${fx(g.s * 12, 1)}, BL ${fx(g.y)}, WL ${fx(g.z)}` }; } },
  ],
  tooling: { needed: true, text: 'Canopy frame moulded on the closed fuselage (tape and release over the opening); bubble trim template; hinge-line straight-edge for the land.' },
  sourcing: { blank: `${yd('face', 1)} yd 6781, 1 yd 6781 0/90 (50 in, +15 %); 1 sheet 3/8 in HT61; one formed acrylic bubble (Long-EZ size)`, vendor: PP_VENDOR.vendor, url: PP_VENDOR.url,
    cost: yd('face', 1) * PRICE.BID + PRICE.UNI + PRICE.H45sheet38 + gal() * (PRICE.L285gal + 2 * PRICE.H287qt) + PRICE.bubble, costAsOf: '2026-11-18', perAircraft: 1, lead: 'Bubble 4–8 weeks (typed from memory)', note: `Bubble price ≈ $${PRICE.bubble} typed from memory, not quoted; cloth and resin as the other laminates.` },
};
void STRUT_DEF; void wallAt; void CANF;
