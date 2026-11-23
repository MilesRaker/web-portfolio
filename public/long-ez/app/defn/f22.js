// LEZ-53-160 bulkhead F22: the definition record (numbers from wp25). A flat PVC sandwich at FS 22 cut to the fuselage's
// inner contour, its top edge under the canard, a notch for the nose-gear strut and a hole for every line through FS 22.
// The solid is extruded layer by layer through the thickness (cad/bulkhead.py). Inches; x = BL, y = FS, z = WL. Notional.
import { GEO, FIXED, BASE_MAT, MATSYS, DEFAULT_DESIGN, analyse } from '../structures.js';
import { PROCESS, buildPlyBook, FRAMES, afAt } from '../plybook.js';
import { bookMass } from '../systems.js';
import { F22G, HP, TAPE, NGD, f22Params, f22Volumes, f22Area, F22_RHO_LAM } from '../parts/wp25_f22.js';
import { CNA } from '../parts/wp24_canard.js';
import { NG } from '../parts/ng_layout.js';
import { WELL } from '../parts/wp11_nose_gear.js';
import { want } from './util.js';

const fx = (x, n = 2) => x.toFixed(n), F2 = FIXED.F22, G = F22G, CG = GEO.canard;
let BK = null; const book = () => (BK ||= buildPlyBook(analyse(DEFAULT_DESIGN, false)).F22);
const nHP = () => analyse(DEFAULT_DESIGN, false).Z.f22Dbl;
export const f22ParamsNow = () => f22Params(nHP());
const tape = () => book().plies.filter((p) => p.region === 'tape').reduce((a, p) => a + p.weight, 0);
export const f22MassOf = (v) => f22ParamsNow().layers.reduce((a, l) => a + (v[l.name] ?? 0) * F22_RHO_LAM[l.mat], 0) + tape();
export const f22BookMass = () => { const m = bookMass(book()); return m.lam + m.core; };
export function f22Expect(p, m) {
  const V = f22Volumes(nHP()), mv = m.volumes || {}, ys = p.pts.map((q) => q[0]), zs = p.pts.map((q) => q[1]);
  return [want('Width, BL (in)', Math.max(...ys) - Math.min(...ys), m.bbox[1] - m.bbox[0], 0.002), want('Height, WL (in)', Math.max(...zs) - Math.min(...zs), m.bbox[5] - m.bbox[4], 0.002),
    ...p.layers.map((l) => want(`${l.name} volume (in³)`, V[l.name], mv[l.name] ?? NaN, Math.max(0.005, V[l.name] * 0.003))), want('Holes', p.holes.length, (m.holes || []).length, 0)];
}
// the canard's lower surface over F22 at the attach, and the distance from each hole to the outline
const zCanard = (fs) => { const x = (fs / 12 - CG.le) / CG.c, a = afAt(FRAMES.canard, CG.attachY, x); return (CG.z + a.yl * CG.c) * 12; };
const segDist = (p, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], u = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy || 1))); return Math.hypot(p[0] - a[0] - u * dx, p[1] - a[1] - u * dy); };
const edgeOf = (h) => Math.min(...G.pts.map((q, i) => segDist([h.y, h.z], q, G.pts[(i + 1) % G.pts.length]))) - h.r;
const lig = () => { let m = Infinity; for (let i = 0; i < G.holes.length; i++) for (let j = i + 1; j < G.holes.length; j++) { const a = G.holes[i], b = G.holes[j]; m = Math.min(m, Math.hypot(a.y - b.y, a.z - b.z) - a.r - b.r); } return m; };
const P = f22ParamsNow(), V = f22Volumes(nHP()), pass = G.holes.filter((h) => h.kind === 'pass');
const PRICE = { BID: PP_PRICE.fab, UNI: PP_PRICE.fab, H45sheet38: +(PP_PRICE.coreFt2Qtr * 8 * 1.5).toFixed(2), L285gal: 0, H287qt: 0 };
const ft2 = (mat) => book().plies.filter((p) => p.mat === mat).reduce((a, p) => a + p.area * (p.plies || 1), 0);
const gal = () => book().plies.reduce((a, p) => a + p.weight, 0) * (1 - PROCESS.fibreWeightFraction) / 1.4 / 10 * 1.3;
import { plateOnF22, landClear } from './e_icd.js';
export const F22_DEF = {
  pn: 'LEZ-53-160', rev: 'B', status: 'released', nha: 'LEZ-53-150', qty: 1, kind: 'laminate',
  title: 'Bulkhead F22 (canard and nose-gear bulkhead)',
  solidText: 'CadQuery solid: the outline extruded layer by layer through the thickness (core, faces, doublers), holes cut through',
  templates: 'One full-size outline template with the hole positions; the canard-bolt drill guide',
  revs: [{ rev: 'A', date: '2026-11-18', short: 'Initial definition', change: `Initial definition. The ply book drew F22 as a rectangle 92 % of the fuselage's height with leg holes the pedals (at FS 36.6) never needed, its deep-beam check took the depth as 0.8 × the fuselage, and nothing checked the nose-gear loads the NG-30 plates put into it. As defined the outline is the shell's inner contour at FS 22, cut level ${fx(0.03)} in under the canard and notched for the strut; ${pass.length} pass-through holes come from the lines the model routes through FS 22; the canard tabs bolt to its forward face; a ${F2.ngDbl}-ply doubler on each face carries the nose-gear drag; and ${TAPE.n} BID tapes each face join it to the shell.` }, { rev: 'B', date: '2026-11-18', short: 'NG-30 lands, shaft hole, pitot hole (block E)', change: 'Block E defined the NG-30 plates on it. The plates now stop 0.03 in (flox) short of the nose-gear doubler face and bond on it outside the notch with 4-ply BID tapes (on LEZ-32-201); the f22-ng strip height h_p is the plate\'s own height on F22 (bottom on the inner skin at the plate BL), 12.3 in instead of 12.65. The worm-shaft hole is a grommeted clearance hole (Ø0.625; the drawn F22 bearing, which had no seat or flange holes, is dropped). The pitot-static hole moves outboard off the RH plate land to BL 3.30 (the line is re-routed in wp4).' }],
  effectivity: 'One per aircraft', params: P,
  datums: [{ id: 'A', what: 'Forward face of the core, FS ' + fx(GEO.F22 * 12 - F2.coreIn / 2, 3) }, { id: 'B', what: 'Centre line, BL 0' }, { id: 'C', what: `Top edge, WL ${fx(G.zTop)} (under the canard)` }],
  features: [
    { id: 'outline', kind: 'profile', label: `The fuselage shell's inner contour at FS 22 (OML less ${fx(G.tsh, 3)} in), ${fx(2 * G.wIn)} in wide; top cut level at WL ${fx(G.zTop)}, ${fx(0.03)} in under the canard's lower surface; strut notch ${fx(2 * G.halfW)} in wide to WL ${fx(G.chanTop)}`, tol: 'Contour ±1/32 in to the template' },
    { id: 'face', kind: 'layup', label: `${F2.faceBID} × 6781 ±45 each face on ${F2.coreIn} in Divinycell HT61; ${G.A.toFixed(0)} in² net`, tol: 'Debulked; no bridging or porosity' },
    { id: 'ng', kind: 'layup', label: `Nose-gear doubler ${F2.ngDbl} × 6781 each face from each NG-30 plate (BL ±${fx(NG.plateY * 12)}) out to the side, full height`, tol: 'Edges ±0.25 in' },
    { id: 'hp', kind: 'layup', label: `Hard points at BL ±${fx(CG.attachY * 12, 1)} on the aft face: ${nHP()} × 6781 ${HP.w} × ${fx(HP.h)} in, ${F2.doublerUNI} × 6781 0/90 ${HP.w / 2} in wide (vertical), down from C`, tol: 'Edges ±0.25 in' },
    { id: 'bolt', kind: 'hole', label: `Canard bolts 4 × Ø ${fx(2 * G.holes[0].r, 3)} at BL ±${fx(CG.attachY * 12, 1)}, ${CNA.edge} and ${fx(CNA.edge + CNA.pitch)} in below the canard's lower surface, in flox inserts`, tol: 'Drilled through the canard tab with the F22 guide', assy: true },
    { id: 'pass', kind: 'hole', label: `${pass.length} pass-through holes (see the hole table), flox-sealed, grommets where a line chafes`, tol: '±0.06 in position' },
  ],
  tolerances: { general: '.X ±0.06 · .XX ±0.03 · contour ±1/32', flatness: 'Flat within 1/16 in across the panel', holes: 'Pass-throughs ±0.06 in; canard bolts through the guide', breakEdges: 'All cut edges and holes sealed with flox or resin' },
  drawingNotes: ['Ply IDs: B-F/A faces, B-NF/NA nose-gear doublers, B-D / B-U hard points, B-T tapes.', 'Flat panel; viewed from aft (BL + to the right).'], generalNote: 'Cured laminate tap-tested; every hole edge sealed.', na: {},
  material: { spec: '6781 S2-glass (caps 6781 laid 0/90), MTM45-1 prepreg (NCAMP), Divinycell HT61 3/8 in sheet, flox inserts', alt: 'None', form: `${LAM_FORM()}, flat on the table`, density: null,
    allowables: [...LAM_ALLOW(false), ['HT61 core shear', 'datasheet-typical', 'BOUND (see f22-ng)']] },
  process: [
    { op: 'Layup', spec: 'Flat on the table: forward nose-gear doubler and forward face on the HT61 sheet; flox inserts at the bolt and hole positions; aft face, aft doubler and hard points. Bag and cure on the NCAMP M cycle (250 ± 10 °F, 4–6 h, ≥ 28 inHg; no post-cure), the part whole in the oven; witness coupon.' },
    { op: 'Cut', spec: 'To the template: outline, notch and holes; seal every edge.' },
    { op: 'Install', spec: `In the fuselage jig at FS 22, square to the centre line; flox fillets; ${TAPE.n} × 6781 × ${2 * TAPE.lap} in tapes both faces all round. The canard tabs are laid against its forward face when the canard is fitted.` },
    { op: 'Inspect', spec: 'Tap test; top edge to the canard template; hole positions.' },
  ],
  checks: ['f22-shear', 'f22-bearing', 'f22-ng', 'f22-tape', 'f22-slab'],
  rules: [{ id: 'edge', label: 'Every hole ≥ 0.25 in from the outline (in)', v: Math.min(...G.holes.map(edgeOf)), min: 0.25 }, { id: 'lig', label: 'Ligament between holes ≥ 0.25 in (in)', v: lig(), min: 0.25 },
    { id: 'notch', label: 'NG-30 plates outside the notch (in)', v: NG.plateY * 12 - G.halfW, min: 0.1 }],
  mass: { each: f22MassOf({ ...V }), from: 'layer volumes × density (HT61, 6781, 6781 0/90) plus the installation tapes from the ply book; checked against the solid and the ply book' },
  hardware: [], hardwareNote: 'None on the detail part: the canard bolts, nuts and washers are hardware on the canard (LEZ-55-120).',
  interfaces: [
    { id: 'I9', with: 'LEZ-32-201 NG-30 plates (E)', feature: 'ng', what: 'Plates land on the doubler with a flox gap, outside the notch; no pass-through on the lands', check: () => { const a = plateOnF22(), b = landClear(); return { ok: a.ok && b.ok, detail: `${a.detail}; ${b.detail}` }; } },
    { id: 'I1', with: 'LEZ-55-120 canard', feature: 'outline', what: 'Top edge under the canard\'s lower surface with a flox gap', check: () => { const z = Math.min(zCanard(GEO.F22 * 12 - 0.375), zCanard(GEO.F22 * 12), zCanard(GEO.F22 * 12 + 0.375)); return { ok: Math.abs(z - G.zTop - 0.03) < 1e-6, detail: `canard ${fx(z, 3)} in, top edge ${fx(G.zTop, 3)} in` }; } },
    { id: 'I2', with: 'LEZ-55-120 canard tabs', feature: 'bolt', what: 'Bolt positions match the tab', check: () => { const bad = G.holes.filter((h) => h.kind === 'bolt').filter((h) => Math.abs(Math.abs(h.y) - CG.attachY * 12) > 1e-6 || ![0, 1].some((i) => Math.abs(h.z - (G.zTop + 0.03 - CNA.edge - i * CNA.pitch)) < 1e-3)); return { ok: !bad.length && FIXED.canardAttach.nb === CNA.nb, detail: `${2 * CNA.nb} bolts at BL ±${fx(CG.attachY * 12, 1)}` }; } },
    { id: 'I3', with: 'LEZ-32-201 NG-30 plates and LEZ-32-220 strut channel', feature: 'outline', what: 'Notch clears the channel; plates land on the doubler', check: () => ({ ok: G.halfW > WELL.chan.halfW * 12 && G.chanTop > WELL.chan.top * 12 && NG.plateY * 12 > G.halfW, detail: `notch ±${fx(G.halfW)} to WL ${fx(G.chanTop)}, channel ±${fx(WELL.chan.halfW * 12)} to WL ${fx(WELL.chan.top * 12)}` }) },
    { id: 'I4', with: 'LEZ-53-150 fuselage shell', feature: 'outline', what: 'Outline is the shell\'s inner contour', check: () => { const w = Math.max(...G.pts.map((q) => Math.abs(q[0]))); return { ok: Math.abs(w - G.wIn) < 0.01, detail: `half-width ${fx(w, 3)} in, shell inner ${fx(G.wIn, 3)} in` }; } },
    { id: 'I5', with: 'Lines routed through FS 22', feature: 'pass', what: 'Every crossing has a hole', check: () => { const miss = G.raw.filter((r) => !pass.some((h) => Math.hypot(h.y - r.y, h.z - r.z) + r.r <= h.r + 1e-3)); return { ok: !miss.length, detail: `${G.raw.length} crossings in ${pass.length} holes${miss.length ? `; missing ${miss.map((m) => m.what).join(', ')}` : ''}` }; } },
  ],
  tooling: { needed: true, text: 'Full-size outline template with the hole centres; the F22 canard drill guide; fuselage jig station.' },
  sourcing: { blank: `${Math.ceil(ft2('BID') / 12.5 * 1.15)} yd 6781, ${Math.max(1, Math.ceil(ft2('GUD') / 12.5 * 1.15))} yd 6781 0/90 (50 in, +15 %); 1 sheet 3/8 in HT61`, vendor: PP_VENDOR.vendor, url: PP_VENDOR.url,
    cost: Math.ceil(ft2('BID') / 12.5 * 1.15) * PRICE.BID + Math.max(1, Math.ceil(ft2('GUD') / 12.5 * 1.15)) * PRICE.UNI + PRICE.H45sheet38 + gal() * (PRICE.L285gal + 2 * PRICE.H287qt), costAsOf: '2026-11-18', perAircraft: 1, lead: 'Stock items', note: 'Prices approximate; prepreg and HT61 by quote (proxy prices, p_common PP_PRICE, BOUND).' },
};
void BASE_MAT; void NGD;

// memory-audit integration (2026-11-19): this record's new revision
import { memRev } from './revs_memaudit.js';
import { LAM_ALLOW, LAM_SPEC, LAM_FORM, LAM_CURE, ppBuy, PP_VENDOR, PP_PRICE } from './p_common.js';
memRev(F22_DEF);
