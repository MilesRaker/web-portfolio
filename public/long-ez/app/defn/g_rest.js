// Block G definition records: cowl group (LEZ-71-155 cowling, LEZ-71-120 cowl attachment, LEZ-71-230 baffles,
// LEZ-71-240 NACA inlets), induction (LEZ-71-250 scoop, LEZ-71-251 air box, LEZ-71-252 filter), exhaust (LEZ-78-100,
// LEZ-78-110) and oil (LEZ-79-100, -110, -115). Numbers from parts/wpG3_cowl.js and wpG4_systems.js; solids by
// cad/g_prims.py. Notional, public data only; typed values are BOUNDs or marked.
import { GEO, fusAt } from '../structures.js';
import { SCOOP, scoopDims as scoopDimsW } from '../parts/wp10_induction_gear.js';
import { insideFus, bookMass } from '../systems.js';
import { PROCESS } from '../plybook.js';
import { RHO, P3, enginePrims, cupPrims, engineFit } from '../parts/wpG1_engine.js';
import { PX } from '../parts/wpG2_prop.js';
import { CWL, cowlPrims, cowlBook, lamRho, cowlStations, NACA, nacaPrims, nacaArea, bafflePrims, BAF, engClear, HINGE, innerArea, cooling2 } from '../parts/wpG3_cowl.js';
import { AB, SPIGOT, HEAT_ARM_G, inBlister, SHEET, SCP, scoopPrims, scoopInlet, airboxPrims, filterPrims, FOAM, ARM, EXH, exhaustPrims, exhExits, MUFF, muffPrims, SCAT_RHO, COOLER, CUT, COOLER_PORTS, HEAT_PORT, coolerPrims, HOSE, HOSES, OIL_PORTS, hosePrims, OIL, lineClear, mountPrims, exhCowl } from '../parts/wpG4_systems.js';
import { tidy, massOfPrims, groupVols } from './g_prims.js';
import { LAM_ALLOW, LAM_SPEC, LAM_FORM, LAM_CURE, ppBuy, PP_VENDOR, PP_PRICE } from './p_common.js';

const fx = (x, n = 2) => x.toFixed(n), DATE = '2026-11-18';
const LAM = lamRho(), AL = 0.098, SS = 0.289;
/** steepest slope of the scoop's aft taper (deg) and the rev A peak depth (ft) */
const SCP_TAPER = () => { let m = 0; for (let i = 0; i < 200; i++) { const a = SCOOP.s0 + (SCOOP.s1 - SCOOP.s0) * (SCOOP.hold + (1 - SCOOP.hold) * i / 200); m = Math.max(m, (scoopDimsW(a)[1] - scoopDimsW(a + 0.01)[1]) / 0.01); } return Math.atan(m) * 180 / Math.PI; };
const SCOOP_A_D = 0.30;
const rev0 = (change) => [{ rev: 'A', date: DATE, short: 'Initial definition', change }];
const lamProcess = (n, what) => [{ op: 'Lay up', spec: `${n} plies MTM45-1 / 6781 (±45), debulked, bagged and cured on the M cycle, over ${what}; peel ply.` }, { op: 'Cure', spec: PROCESS.cure || 'Cure at room temperature.' }, { op: 'Post-cure', spec: `${PROCESS.postCure} (shared structural process, rev 2026-11-19)` }, { op: 'Trim', spec: 'Trim to the template; seal the edges with resin.' }];
const lamMaterial = (n) => ({ spec: '6781 S2-glass, MTM45-1 prepreg (NCAMP)', alt: 'Equivalent 8.9 oz 6781', form: `${n} × 6781 solid laminate, ${fx(n * 0.010, 3)} in`, density: LAM, allowables: [['Cured 6781 laminate density', `${fx(LAM, 4)} lb/in³`, 'the cowl ply book (ply weight / volume)']] });
const clearTo = (pts, r, prims) => lineClear(pts, r, prims).d;
/** least clearance (in) of a set of primitives' sampled box corners / cylinder ends from other primitives */
function primClear(A, B) { let w = Infinity; for (const p of A) { const pts = p.t === 'box' ? [-1, 1].flatMap((i) => [-1, 1].flatMap((j) => [-1, 1].map((k) => [p.c[0] + i * p.d[0] / 2, p.c[1] + j * p.d[1] / 2, p.c[2] + k * p.d[2] / 2]))) : p.t === 'loft' ? p.secs.flat() : [p.a, p.b]; for (const q of pts) w = Math.min(w, clearTo([q, q.map((v) => v + 1e-6)], 0, B)); } return w; }

// ------------------------------------------------------------------------------------------- LEZ-71-155 cowling
export const cowlParams = () => ({ frame: 'aircraft', prims: cowlPrims().map(tidy) });
const CP = cowlParams(), bk = cowlBook();
export const cowlBookMass = () => { const m = bookMass(cowlBook()); return m.lam + m.core; };
export const COWL_DEF = {
  pn: 'LEZ-71-155', rev: 'B', status: 'released', nha: 'LEZ-71-200', qty: 1, kind: 'laminate',
  title: 'Cowling, upper and lower',
  solidText: 'CadQuery solid: the 4 × 6781 shell lofted in FS planes, each half of the ring, firewall to the trailing edge',
  templates: 'Station templates for the male plug at every OML-table station',
  revs: [...rev0(`Initial definition. The cowl's trailing edge was FS ${fx(16.2 * 12, 1)} in the ply book but the OML ran to FS ${fx(16.35 * 12, 1)}: one trailing edge now, at FS ${fx(CWL.s1 * 12, 1)} (ICD G-F8), round the spinner. The shell is the OML inset by the ${CWL.t} in laminate; the cooling inlets (LEZ-71-240), the scoop (LEZ-71-250) and the exhaust exits are trimmed into the lower cowl at assembly. Panels checked under the full ram pressure at VD as thin membranes.`), { rev: 'B', date: DATE, short: 'Openings for the scoop rev B and the NACA inlets rev B', change: `Shell, laminate and ply book unchanged: the scoop (LEZ-71-250 rev B) is a separate laminate screwed on over its flange. The lower cowl\'s scoop opening, trimmed at assembly, grows to FS ${fx(SCOOP.s0 * 12, 1)}–${fx(SCOOP.s1 * 12, 1)}, BL ${fx((SCOOP.y - SCOOP.hw) * 12, 2)} to ${fx((SCOOP.y + SCOOP.hw) * 12, 2)} (less a 1.0 in flange land), and the NACA openings move to BL ±${fx(NACA.c)}.` }],
  effectivity: 'One per aircraft', params: CP,
  datums: [{ id: 'A', what: 'Firewall aft face, FS 153.0 (the hinge line)' }, { id: 'B', what: 'Centre line' }, { id: 'C', what: 'Crankshaft line' }],
  features: [
    { id: 'face', kind: 'layup', label: `${CWL.plies} × 6781 ±45 solid laminate, ${CWL.t} in, FS ${fx(CWL.s0 * 12, 1)} to ${fx(CWL.s1 * 12, 1)} on the OML table; split at the sides (upper / lower), plies H-U1…4 and H-L1…4`, tol: 'Contour ±1/16 in to the plug' },
  ],
  tolerances: { general: 'Contour ±1/16 in · trim ±1/32 in', flatness: 'Cowl OML meets the shell OML at the firewall with no step (≤ 1/32 in)', breakEdges: 'Trimmed edges sealed' },
  drawingNotes: ['Openings trimmed at assembly: two NACA inlets (LEZ-71-240), the scoop (LEZ-71-250), four exhaust exits (LEZ-78-100).', 'The aft lip forms the cooling-air exit round the spinner (LEZ-61-120).'],
  generalNote: 'Tap-test the cured shell; fill and paint white (heat).', na: {},
  material: lamMaterial(CWL.plies),
  process: bk.steps.map((s) => ({ op: `Step ${s.step}`, spec: s.title })),
  checks: ['cwl-press'],
  rules: [{ id: 'fit', label: 'Engine envelope ≥ 1/2 in inside the cowl (in)', v: engineFit().c, min: 0.5 }],
  mass: { each: groupVols(CP.prims).lam * LAM, from: `solid volume × the ply book's cured density (${fx(LAM, 4)} lb/in³); within 2 % of the book` },
  hardware: [], hardwareNote: 'Hinges, screws and seal are LEZ-71-120.',
  interfaces: [
    { id: 'I1', with: 'LEZ-53-150 shell at the firewall', feature: 'face', what: 'Same OML at FS 153.0 (no step)', check: () => { const s = CWL.s0, f = fusAt(s), ok = Math.abs(cowlStations()[0] - s) < 1e-9; return { ok, detail: `first section at FS ${fx(s * 12, 1)} on the OML table (${fx(f.w * 12)} wide)` }; } },
    { id: 'I2', with: 'LEZ-71-210 engine', feature: 'face', what: 'Envelope ≥ 1/2 in inside', check: () => { const w = engineFit(); return { ok: w.c >= 0.5, detail: `${fx(w.c, 3)} in at the ${w.feat}` }; } },
    { id: 'I3', with: 'LEZ-61-120 spinner', feature: 'face', what: 'Exit annulus ≥ 1.5 × the cooling inlets', check: () => { const a = exitArea(); return { ok: a.ok, detail: a.detail }; } },
  ],
  tooling: { needed: true, text: bk.tool.text },
  sourcing: { blank: `${Math.ceil(bk.plies.reduce((a, p) => a + p.area, 0) / 12.5 * 1.15)} yd 6781 (50 in, +15 %); ${fx(bookMass(bk).lam * (1 - PROCESS.fibreWeightFraction) / 1.4 / 10 * 1.3, 2)} gal (no resin: prepreg)`, vendor: PP_VENDOR.vendor, url: PP_VENDOR.url, cost: Math.ceil(bk.plies.reduce((a, p) => a + p.area, 0) / 12.5 * 1.15) * 10.5 + 60, costAsOf: DATE, perAircraft: 1, lead: 'Stock', note: 'Prices approximate; plug foam not priced.' },
};
export function exitArea() { const s = CWL.s1, a = innerArea(s) - Math.PI * PX.spin.r ** 2, need = 1.5 * nacaArea(); return { ok: a >= need, a, detail: `${fx(a, 1)} in² round the Ø ${2 * PX.spin.r} spinner at FS ${fx(s * 12, 1)} (≥ ${fx(need, 1)})` }; }
export function cowlExitClear() { const s = CWL.s1, f = fusAt(s), r = PX.ext.flR; let c = Infinity; for (let i = 0; i < 72; i++) { const a = i * Math.PI / 36, y = r * Math.cos(a), z = f.top * 6 + f.bot * 6 + r * Math.sin(a); let lo = 0, hi = 0.5; for (let k = 0; k < 30; k++) { const m = (lo + hi) / 2; if (insideFus(s - 1e-4, y / 12, z / 12, m)) lo = m; else hi = m; } c = Math.min(c, lo * 12 - CWL.t); } return c; }

// ------------------------------------------------------------------------------------------- LEZ-71-120 cowl attachment
const hingeL = fusAt(GEO.firewall).w * 12 * 1.4, sideL = 2 * (CWL.s1 - GEO.firewall) * 12 * 0.5;
const CA_LINES = [
  { std: 'MS20257P3-…', qty: 4, desc: `continuous hinge, 0.040 in 2024-T3 leaves, 0.090 in pin, ${fx(hingeL / 4, 1)} in each (firewall flange to the upper and lower cowl, L and R)`, each: hingeL / 4 * (2 * 0.75 * 0.040 * AL + Math.PI * 0.045 ** 2 * 0.29) },
  { std: '2024-T3 0.040 angle', qty: 1, desc: `firewall flange, ${fx(hingeL, 1)} in round the firewall aft face`, each: hingeL * 1.0 * 0.040 * AL * 2 },
  { std: 'MS20470AD4', qty: Math.round(hingeL), desc: 'rivets, hinge leaves to the flange (1 per in)', each: 0.0006 },
  { std: 'AN3-5A', qty: Math.round(hingeL / 3), desc: 'flange to the firewall through the shell laminate (1 per 3 in)', each: 0.012 },
  { std: 'MS21042L3', qty: Math.round(hingeL / 3), desc: 'nuts for the flange bolts', each: 0.004 },
  { std: 'MS24694S + K1000-08 nutplate', qty: Math.round(sideL / 4), desc: 'split-line screws, 1 per 4 in each side', each: 0.006 },
  { std: 'Silicone baffle-seal strip 0.06 × 1.5', qty: 2, desc: 'cowl-to-wing-root seal, 30 in each', each: 30 * 0.06 * 1.5 * 0.045 },
];
export const caParams = () => ({ lines: CA_LINES.map((l) => [l.std, l.qty, +l.each.toFixed(5)]), hingeL: +hingeL.toFixed(3), sideL: +sideL.toFixed(3) });
export const CA_DEF = {
  pn: 'LEZ-71-120', rev: 'A', status: 'released', nha: 'LEZ-71-200', qty: 1, install: true,
  title: 'Cowl attachment',
  revs: rev0('Initial definition. Mass was ASSUMED (0.9 lb); now the hardware lines. The hinge check took the plenum pressure as 0.8 q (ASSUMED); here it is the full ram pressure at VD, an upper bound.'),
  effectivity: 'One per aircraft', params: caParams(), datums: [],
  features: [{ id: 'hinge', kind: 'joint', label: `Firewall flange (2024-T3 angle, AN3 through the firewall edge) with four continuous hinges, ${fx(hingeL, 1)} in in all; pins pull forward`, tol: 'Pins slide by hand' }, { id: 'split', kind: 'joint', label: `Split line at the sides: #8 screws into nutplates every 4 in, ${fx(sideL, 1)} in`, tol: 'Gap ≤ 1/16 in' }, { id: 'seal', kind: 'joint', label: 'Silicone seal strip on the cowl edge bearing on the jut-out (0.12 in gap)', tol: 'Seal compressed 25–50 %' }],
  tolerances: { general: 'Rivet pitch 1.0 ± 0.1 in; torque per AC 43.13-1B' },
  drawingNotes: ['Rivet the hinge leaves to the flange, flox the mating leaves into the cowls with the cowl clecoed in place.', `Firewall keep-out: the flange band, ${fx(0.6, 1)} in inside the OML all round at FS 153.0–153.4 (docs/blocks/g_powerplant.md).`],
  na: { cut: 'Installation', layup: 'Installation' },
  material: { spec: 'MS20257 continuous hinge (2024-T3, stainless pin); 2024-T3 sheet angle; AN / MS hardware; silicone-fabric seal strip', alt: '—', form: 'bought hardware', density: AL, allowables: [['2024-T3 F_bru (e/D 1.5)', '147 ksi', 'MMPDS (typed from the handbook table)']] },
  process: [{ op: 'Flange', spec: 'Form the flange to the firewall outline; bolt through the firewall edge with flox in the bolt holes.' }, { op: 'Hinges', spec: 'Rivet the leaves to the flange; flox the mating leaves into the cowl laminates on the plug.' }, { op: 'Split line', spec: 'Nutplates on the lower cowl flange; screws through the upper.' }, { op: 'Seal', spec: 'Bond the seal strip with RTV.' }],
  checks: ['cwa-hinge'], rules: [],
  mass: { each: CA_LINES.reduce((a, l) => a + l.qty * l.each, 0), from: 'hardware lines' },
  hardware: CA_LINES, hardwareNote: CA_LINES.map((l) => `${l.qty} × ${l.std}`).join(', '),
  interfaces: [{ id: 'I1', with: 'LEZ-53-150 / firewall LEZ-53-180', feature: 'hinge', what: 'Hinge line inside the OML at the firewall', check: () => { const s = GEO.firewall + 0.03, y = 0, z = fusAt(s).top - 0.03; return { ok: insideFus(s, y, z, 0), detail: `hinge path 0.36 in inside the OML at FS ${fx(s * 12, 2)}` }; } }],
  tooling: { needed: true, text: 'The cowl plug (LEZ-71-155) holds the cowls while the hinge leaves are floxed in.' },
  sourcing: { blank: 'Bought hardware', vendor: 'Aircraft Spruce (MS20257 hinge, nutplates, seal strip)', url: 'https://www.aircraftspruce.com/', cost: 140, costAsOf: DATE, perAircraft: 1, lead: 'Stock', note: 'Approximate.' },
};

// ------------------------------------------------------------------------------------------- LEZ-71-230 baffles
export const bafParams = () => ({ frame: 'aircraft', prims: bafflePrims(CUT).map(tidy) });
const BP = bafParams(), BAF_RHO = { al: AL, rubber: 0.045 };
export const BAF_DEF = {
  pn: 'LEZ-71-230', rev: 'B', status: 'released', nha: 'LEZ-71-200', qty: 1,
  title: 'Cylinder baffles and plenum seals',
  revs: [...rev0(`Initial definition. Mass was ASSUMED (3.5 lb). As defined: ${BAF.t} in 6061-T6 side walls along the seal line, the rear wall, inter-cylinder deflectors (wp1's layout), a lower rear wall on the right carrying the oil cooler over a ${fx(CUT.y1 - CUT.y0)} × ${fx(CUT.z1 - CUT.z0)} in cut-out (ICD G-F7), and silicone-fabric seals on the side walls.`), { rev: 'B', date: DATE, short: 'Clear of the engine envelope', change: 'The rear wall ran through the crankcase (2.5 in), the right bank\'s deflectors sat in the right cylinders (the left bank\'s positions mirrored, 2.4 in) and the side walls cut the rocker covers (0.4 in) (ICD G phase 2, solid-clash check on LEZ-71-200). Now the rear wall is two pieces from the crankcase side to the cowl side, each bank\'s deflectors sit between its own cylinders, and each side-wall panel stops ' + BAF.engClr + ' in above any engine feature it would cross.' }],
  effectivity: 'One set per aircraft', params: BP,
  datums: [{ id: 'A', what: 'Cylinder centre lines' }, { id: 'B', what: 'Crankshaft line' }],
  features: [
    { id: 'side', kind: 'plate', label: `Side walls ${BAF.t} in, up to ${fx(4.32)} in deep along the seal line each side, each panel's lower edge ${BAF.engClr} in clear of the rocker covers and heads`, tol: 'Seal line ±1/8 in to the cowl' },
    { id: 'rear', kind: 'plate', label: 'Rear wall behind the rear cylinders', tol: '±1/8 in' },
    { id: 'deflector', kind: 'plate', label: 'Inter-cylinder deflectors (4)', tol: 'Per the engine maker\'s baffle drawing' },
    { id: 'lowerwall', kind: 'plate', label: `Lower rear wall (right) round the oil-cooler cut-out, BL ${fx(CUT.y0)}–${fx(CUT.y1)}, WL ${fx(CUT.z0)}–${fx(CUT.z1)}`, tol: 'Cut-out ±1/16 in' },
    { id: 'seal', kind: 'seal', label: `Seals: silicone-fabric strip ${BAF.seal.t} × ${BAF.seal.w} in, riveted, lying with the flow`, tol: 'No gaps at the cowl' },
  ],
  tolerances: { general: '.XX ±0.03', breakEdges: 'Deburr all edges' },
  drawingNotes: [`Bend flanges every ${BAF.flangePitch} in (stiffeners).`, 'Fit to the engine; seals bear on the cowl with 1/2 in overlap.'], generalNote: 'Alodine and prime.',
  na: { cut: 'Sheet cut to templates made on the engine', layup: 'Metal part' },
  material: { spec: 'AMS-QQ-A-250/11 6061-T6 sheet 0.032 in; silicone-coated fibreglass seal fabric', alt: '2024-T3 0.032', form: 'sheet', density: AL, allowables: [['6061-T6 F_ty', '35 ksi', 'MMPDS']] },
  process: [{ op: 'Cut', spec: 'Cut and bend to templates fitted on the engine.' }, { op: 'Fit', spec: 'Screw to the cylinder and case studs; rivet the seals.' }],
  checks: ['baf-press'], rules: [{ id: 'pitch', label: 'Flange pitch ≤ 3 in', v: 3 / BAF.flangePitch, min: 1 }],
  mass: { each: massOfPrims(BP.prims, BAF_RHO), from: 'solid volumes: aluminium × 0.098, seal × 0.045 lb/in³ (typed)' },
  hardware: [{ std: 'MS35206 screws, AN960 washers', qty: 30, desc: 'to the engine', each: 0.003 }, { std: 'MS20470AD3', qty: 60, desc: 'seal rivets', each: 0.0004 }], hardwareNote: '30 screws to the engine; 60 rivets for the seals.',
  interfaces: [{ id: 'I1', with: 'LEZ-79-110 oil cooler', feature: 'lowerwall', what: 'Cut-out inside the cooler face', check: () => ({ ok: CUT.y0 > COOLER.y0 && CUT.y1 < COOLER.y1 && CUT.z0 > COOLER.z[0] && CUT.z1 < COOLER.z[1], detail: `cut-out ${fx(CUT.y1 - CUT.y0)} × ${fx(CUT.z1 - CUT.z0)} inside the ${COOLER.W} × ${fx(COOLER.z[1] - COOLER.z[0])} face` }) }, { id: 'I2', with: 'LEZ-71-210 engine envelope', feature: 'side', what: `Walls and deflectors clear of the engine by ≥ ${BAF.engClr} in (seals excepted; the lower rear wall carries the cooler)`, check: () => { const pl = BP.prims.filter((p) => p.feat === 'side' || p.feat === 'rear' || p.feat === 'deflector'); const pts = pl.flatMap((p) => [-1, -0.5, 0, 0.5, 1].flatMap((a) => [-1, -0.5, 0, 0.5, 1].flatMap((b) => [-1, 1].map((c) => [p.c[0] + c * p.d[0] / 2 * (p.d[0] < 0.1 ? 1 : a), p.c[1] + (p.d[1] < 0.1 ? c : a) * p.d[1] / 2, p.c[2] + b * p.d[2] / 2])))); const d = engClear(pts); return { ok: d >= BAF.engClr - 0.01, detail: `${pl.length} plates; nearest engine feature ${fx(d)} in` }; } }],
  tooling: { needed: true, text: 'Cardboard templates made on the engine; a brake for the flanges.' },
  sourcing: { blank: '6061-T6 0.032 sheet 2 × 4 ft; seal fabric 1.5 in × 12 ft', vendor: 'Aircraft Spruce (6061 sheet, baffle seal)', url: 'https://www.aircraftspruce.com/', cost: 95, costAsOf: DATE, perAircraft: 1, lead: 'Stock', note: 'Approximate.' },
};

// ------------------------------------------------------------------------------------------- LEZ-71-240 NACA inlets
export const nacaParams = () => ({ frame: 'aircraft', prims: nacaPrims().map(tidy) });
const NP = nacaParams();
const nacaClear = () => primClear(NP.prims, [...enginePrims(), ...exhaustPrims(), ...mountPrims(), ...cupPrims()]);
export const NACA_DEF = {
  pn: 'LEZ-71-240', rev: 'B', status: 'released', nha: 'LEZ-71-155', qty: 1, kind: 'laminate',
  title: 'Cooling inlets, NACA submerged (L/R)', templates: 'Ramp and wall templates (flat) for the plug',
  revs: [...rev0(`Initial definition. The inlet had been moved forward across the firewall and the shell / cowl joint, into the brackets, gascolator and fuel fitting (ICD G-F6), with an assumed 40 in² throat. As defined: two submerged inlets on the lower cowl, one each side of the carb scoop at BL ±${fx(NACA.c)}, ramps from FS ${fx(NACA.x0, 1)} (aft of the hinge flange) to throats at FS ${fx(NACA.x1, 1)}, each ${NACA.w1} × ${NACA.d1} in (${fx(nacaArea(), 1)} in² together). The cooling-area check's assumed inputs are now design values or bounds.`), { rev: 'B', date: DATE, short: 'Outboard of the wider scoop', change: `The scoop rev B is wider and off-centre (ICD G-O1); each inlet stays 1.25 in outboard of the scoop\'s widest edge, at BL ±${fx(NACA.c)} (rev A ±8.67).` }],
  effectivity: 'One pair per aircraft', params: NP,
  datums: [{ id: 'A', what: 'Cowl OML' }, { id: 'B', what: 'Centre line' }],
  features: [
    { id: 'ramp', kind: 'layup', label: `${NACA.plies} × 6781 ramp floors, ${NACA.w0} in wide at FS ${fx(NACA.x0, 1)} to ${NACA.w1} in at the throat, ${NACA.d0} → ${NACA.d1} in deep`, tol: 'Ramp ±1/16 in' },
    { id: 'walls', kind: 'layup', label: `${NACA.plies} × 6781 side walls; lips radiused 1/4 in`, tol: 'Walls sharp at the cowl skin' },
  ],
  tolerances: { general: '±1/16 in', breakEdges: 'Lip radius 1/4 in' },
  drawingNotes: ['Laid up over foam ramp plugs on the lower cowl plug; trimmed through the cowl.'], generalNote: 'Bonded to the lower cowl with flox and 2 × 6781 tapes.', na: {},
  material: lamMaterial(NACA.plies),
  process: lamProcess(NACA.plies, 'carved foam ramp plugs'),
  checks: ['pwr-cool'], rules: [{ id: 'area', label: 'Throat area ≥ 1.15 × the required area', v: nacaArea() / cooling2().Areq / 1.15, min: 1 }],
  mass: { each: groupVols(NP.prims).lam * LAM, from: `solid volume × ${fx(LAM, 4)} lb/in³ (the cowl book's cured 6781)` },
  hardware: [], hardwareNote: 'None: bonded into the lower cowl.',
  interfaces: [
    { id: 'I1', with: 'LEZ-71-210, LEZ-78-100, LEZ-71-220 / -224', feature: 'ramp', what: 'Ducts clear of the engine, exhaust, mount and cups by ≥ 0.5 in', check: () => { const c = nacaClear(); return { ok: c >= 0.5, detail: `${fx(c)} in` }; } },
    { id: 'I2', with: 'LEZ-71-250 scoop and the firewall', feature: 'walls', what: 'Clear of the scoop; aft of the hinge flange', check: () => ({ ok: NACA.c - NACA.w1 / 2 > (0.05 + 0.36) * 12 + 0.5 && NACA.x0 >= GEO.firewall * 12 + 1.0, detail: `inboard wall at BL ${fx(NACA.c - NACA.w1 / 2)}; ramp starts FS ${fx(NACA.x0, 1)}` }) },
  ],
  tooling: { needed: true, text: 'Foam ramp plugs carved to the ramp and wall templates, fixed to the cowl plug.' },
  sourcing: { blank: '1 yd 6781; 0.2 gal MTM45-1; Divinycell HT61 for the plugs', vendor: 'Aircraft Spruce', url: 'https://www.aircraftspruce.com/catalog/cmpages/rutan.php', cost: 45, costAsOf: DATE, perAircraft: 1, lead: 'Stock', note: 'Approximate.' },
};

// ------------------------------------------------------------------------------------------- LEZ-71-250 scoop
export const scpParams = () => ({ frame: 'aircraft', prims: scoopPrims().map(tidy) });
const SPP = scpParams();
export const SCOOP_DEF = {
  pn: 'LEZ-71-250', rev: 'B', status: 'released', nha: 'LEZ-71-155', qty: 1, kind: 'laminate',
  title: 'Carb air scoop (blister on the lower cowl)', templates: 'Station templates for the scoop plug (= airframe/build.py scoop rings)',
  revs: [...rev0(`Initial definition. Mass was ASSUMED (1.2 lb). As defined: 2 × 6781 shell on the airframe model's scoop rings (build.py SC), ram inlet ${fx(scoopInlet(), 1)} in² below the skin, flanged to the lower cowl.`), { rev: 'B', date: DATE, short: 'Deeper, longer blister for the air box below the carb flange', change: `The rev A blister left 1.3–1.6 in below the carburettor flange, so the air box, filter, flapper, heat spigot and arm sat inside the carburettor envelope by up to 1.3 in (ICD G-O1). (owner\'s decision on ICD G-O1, 2026-11-18): depth ${fx(SCOOP_A_D * 12, 1)} → ${fx(SCOOP.d * 12, 2)} in below the cowl line, half-width ${fx(0.36 * 12, 2)} → ${fx(SCOOP.hw * 12, 2)} in, centred at BL ${fx(SCOOP.y * 12, 1)} so the heat spigot and the SCAT pass left of the carburettor; mouth moved to FS ${fx(SCOOP.s0 * 12, 1)} (same ${fx(scoopInlet(), 2)} in² inlet, ≥ 1 in aft of the gascolator drain), full depth FS 164.0–166.2, then a cosine taper to FS ${fx(SCOOP.s1 * 12, 1)} (steepest ${fx(SCP_TAPER(), 0)}°) back into the cowl lines. New checks scp-ground and scp-drag; ram recovery kept at 0.7 as a bound in ind-air.` }],
  effectivity: 'One per aircraft', params: SPP,
  datums: [{ id: 'A', what: 'Cowl OML' }, { id: 'B', what: `Scoop centre plane (BL ${fx(SCOOP.y * 12, 1)})` }],
  features: [{ id: 'shell', kind: 'layup', label: `${SCP.t / 0.010} × 6781 shell, inlet at FS ${fx(SCOOP.s0 * 12, 1)}, full depth ${fx(SCOOP.d * 12, 2)} in FS 164.0–166.2, tapering (steepest ${fx(SCP_TAPER(), 0)}°) to nothing at FS ${fx(SCOOP.s1 * 12, 1)}; inlet lip rolled 1/4 in`, tol: 'Contour ±1/16 in' }],
  tolerances: { general: '±1/16 in', breakEdges: 'Inlet lip radius ≥ 1/4 in' },
  drawingNotes: ['Screwed to the lower cowl with a flange so it comes off with the cowl.', 'The lower prop disc runs in the blister\'s wake: tell the prop maker (LEZ-61-100) when the pitch is set. The prop and extension natural-frequency analysis is still outstanding (run-up vibration survey before flight).'], generalNote: 'Seal the flange with RTV.', na: {},
  material: lamMaterial(2), process: lamProcess(2, 'a foam plug on the lower cowl'),
  checks: ['ind-air', 'scp-ground', 'scp-drag'], rules: [{ id: 'taper', label: 'Aft face no steeper than 25° (wake into the lower prop disc)', v: 25 / SCP_TAPER(), min: 1 }],
  mass: { each: groupVols(SPP.prims).lam * LAM, from: `solid volume × ${fx(LAM, 4)} lb/in³` },
  hardware: [{ std: 'MS24693C screws + K1000-08 nutplates', qty: 10, desc: 'scoop flange to the lower cowl', each: 0.004 }], hardwareNote: '10 × #8 screws into nutplates.',
  interfaces: [{ id: 'I1', with: 'LEZ-71-251 air box, LEZ-71-252 filter', feature: 'shell', what: 'Every corner of the air box and filter ≥ 0.10 in inside the blister\'s inner skin (rev B: was the floor against the lowest point only)', check: () => { const pts = [...airboxPrims().filter((p) => p.t === 'box').flatMap((p) => [-1, 1].flatMap((a) => [-1, 1].flatMap((b) => [-1, 1].map((c) => [p.c[0] + a * p.d[0] / 2, p.c[1] + b * p.d[1] / 2, p.c[2] + c * p.d[2] / 2])))), ...filterPrims()[0].secs.flat()].filter((q) => q[2] < fusAt(q[1] / 12).bot * 12); let m = Infinity; for (const q of pts) { let lo = -1, hi = 2; for (let k = 0; k < 24; k++) { const md = (lo + hi) / 2; if (inBlister(q, md)) lo = md; else hi = md; } m = Math.min(m, lo); } return { ok: m >= 0.10, detail: `${pts.length} corners below the cowl line; nearest ${fx(m)} in inside the inner skin` }; } }],
  tooling: { needed: true, text: 'Foam plug on the lower cowl plug, carved to the station templates.' },
  sourcing: { blank: '0.5 yd 6781; 0.1 gal MTM45-1', vendor: 'Aircraft Spruce', url: 'https://www.aircraftspruce.com/catalog/cmpages/rutan.php', cost: 25, costAsOf: DATE, perAircraft: 1, lead: 'Stock', note: 'Approximate.' },
};

// ------------------------------------------------------------------------------------------- LEZ-71-251 air box
export const abxParams = () => ({ frame: 'aircraft', prims: airboxPrims().map(tidy) });
const AXP = abxParams();
export const ABX_DEF = {
  pn: 'LEZ-71-251', rev: 'C', status: 'released', nha: 'LEZ-71-200', qty: 1,
  title: 'Air box with carb-heat (alternate air) flapper',
  revs: [...rev0(`Initial definition. Mass and the induction check's inputs were ASSUMED. As defined: ${SHEET.box} in 6061-T6 box riveted on the carburettor adapter, flapper on a steel pin under the 2 in SCAT spigot, control arm at BL ${fx(ARM()[0])}, FS ${fx(ARM()[1])}, WL ${fx(ARM()[2])} (block H's carb-heat cable lands there, ICD G-F4); drain in the floor.`), { rev: 'B', date: DATE, short: 'Below the carburettor flange', change: `The rev A box enclosed the carburettor\'s lower 1.7 in; the lid, flapper, spigot and arm were inside its envelope (ICD G-O1). Now the whole box is below the flange (WL ${fx(AB.lid)}): lid with the carb adapter, a floor in three steps under the 25° filter, ram air in at the front below the filter, filtered air up to the throat (about 1 in clear under it). The heat spigot stands in the lid left of the carburettor (BL ${fx(SPIGOT.x)}, FS ${fx(SPIGOT.y)}), the flapper under it, the carb-heat arm on the lid aft of it (top at BL ${fx(ARM()[0])}, FS ${fx(ARM()[1])}, WL ${fx(ARM()[2])}: block H\'s cable lands there, ICD G-O3).` }, { rev: 'C', date: DATE, short: 'Spigot and carb-heat crank clear of the engine rev B carb arms (H-O1)', change: `Block H\'s engine rev B put the throttle and mixture arms on the carburettor\'s left side, where the heat spigot stood (0.00 in), and the arm on the lid could not be reached by a cable (H-O1). Now the spigot stands ≥ 1 in aft of the arms\' rod sweeps (BL ${fx(SPIGOT.x)}, FS ${fx(SPIGOT.y)}), the box runs aft to FS ${fx(AB.y1, 1)} (last floor step up where the blister tapers), and the carb-heat arm is a crank on the flapper pin: pin along BL at FS ${fx(HEAT_ARM_G.pivot[1])}, WL ${fx(HEAT_ARM_G.pivot[2])}, out through the left wall; arm ${HEAT_ARM_G.r} in in the plane BL ${fx(HEAT_ARM_G.plane)}, ${HEAT_ARM_G.travel}° (±45° about straight down; COLD tip aft at FS ${fx(HEAT_ARM_G.cold[1])}, HOT forward at FS ${fx(HEAT_ARM_G.hot[1])}); block H\'s conduit ends on a bracket at the box\'s front-left corner (FS ${fx(HEAT_ARM_G.conduitEnd[1])}, WL ${fx(HEAT_ARM_G.conduitEnd[2])}) and the cable runs straight aft to the tip.` }],
  effectivity: 'One per aircraft', params: AXP,
  datums: [{ id: 'A', what: 'Carburettor flange face' }, { id: 'B', what: 'Carburettor bore axis' }],
  features: [
    { id: 'box', kind: 'sheet', label: `Floor (three steps under the filter), risers, side, front and aft walls ${SHEET.box} in 6061-T6, drain Ø 0.36 in the floor\'s low aft corner; box BL ${fx(AB.x0)} to ${fx(AB.x1)}, FS ${fx(AB.y0, 1)}–${fx(AB.y1, 1)}, all below WL ${fx(AB.lid)}`, tol: '±0.03' },
    { id: 'lid', kind: 'sheet', label: 'Lid with the Ø 2.0 heat port', tol: '±0.03' },
    { id: 'adapter', kind: 'plate', label: 'Carburettor adapter plate 3.6 × 3.6 × 0.125, Ø 1.75 bore, 4 × AN3', tol: 'Bolt pattern to the MA-3A flange' },
    { id: 'spigot', kind: 'tube', label: '2 in SCAT spigot', tol: '±0.03' },
    { id: 'flapper', kind: 'valve', label: 'Flapper door and hinge pin: COLD seals the heat port; HOT shuts off ram air', tol: 'Seals to a 0.003 in feeler' },
    { id: 'arm', kind: 'lever', label: `Carb-heat crank on the flapper pin: pin along BL at FS ${fx(HEAT_ARM_G.pivot[1])}, WL ${fx(HEAT_ARM_G.pivot[2])}; arm ${HEAT_ARM_G.r} in in the plane BL ${fx(HEAT_ARM_G.plane)}, ${HEAT_ARM_G.travel}° (COLD tip aft, HOT forward); conduit-end bracket at FS ${fx(HEAT_ARM_G.conduitEnd[1])} for block H\'s LEZ-76-110`, tol: 'Full travel with cushion' },
  ],
  tolerances: { general: '.XX ±0.03', breakEdges: '0.010–0.030' }, drawingNotes: ['Rivet with MS20470AD4 at 1 in pitch; seal the seams.'], generalNote: 'Alodine and prime.',
  na: { cut: 'Flat patterns cut from sheet (developed from the box faces)', layup: 'Metal part' },
  material: { spec: 'AMS-QQ-A-250/11 6061-T6 sheet 0.040 / 0.063 / 0.125 in; 4130 pin', alt: '5052-H32 sheet', form: 'sheet', density: AL, allowables: [['6061-T6 F_ty', '35 ksi', 'MMPDS']] },
  process: [{ op: 'Cut and bend', spec: 'Cut the box from sheet; bend; rivet; fit the flapper with an over-centre stop each end.' }, { op: 'Install', spec: 'Bolt to the carburettor with a new gasket (4 × AN3); safety wire.' }],
  checks: ['ind-air', 'abx-flange'], rules: [],
  mass: { each: massOfPrims(AXP.prims, { al: AL, steel: RHO.steel }), from: 'solid volumes × 0.098 (aluminium) and 0.283 (pin) lb/in³' },
  hardware: [{ std: 'AN3-5A', qty: 4, desc: 'bolt, air box to carburettor flange', each: 0.012 }, { std: 'MS21042L3', qty: 4, desc: 'nut', each: 0.004 }, { std: 'MS20470AD4', qty: 60, desc: 'rivet, box seams', each: 0.0006 }],
  hardwareNote: '4 × AN3-5A with MS21042L3 nuts to the carburettor; 60 rivets.',
  interfaces: [{ id: 'I1', with: 'LEZ-71-210 carburettor (CARB-AIR)', feature: 'adapter', what: 'Adapter on the carburettor flange', check: () => { const a = AXP.prims.find((p) => p.feat === 'adapter'), c = P3([11.1575 + 0.27, 0, 2.04]); return { ok: Math.abs(a.c[1] - c[1]) < 0.05 && Math.abs(a.c[2] - (2.045 * 12)) < 1e-3, detail: `adapter at FS ${fx(a.c[1])}, WL ${fx(a.c[2])}` }; } }],
  tooling: { needed: false, text: 'Sheet-metal brake and a flapper drilling jig.' },
  sourcing: { blank: '6061-T6 sheet 0.040, 12 × 24 in; 0.125 plate 4 × 4 in', vendor: 'Aircraft Spruce', url: 'https://www.aircraftspruce.com/', cost: 60, costAsOf: DATE, perAircraft: 1, lead: 'Stock', note: 'Approximate.' },
};

// ------------------------------------------------------------------------------------------- LEZ-71-252 filter
export const fltParams = () => ({ frame: 'aircraft', prims: filterPrims().map(tidy) });
const FP = fltParams();
export const FLT_DEF = {
  pn: 'LEZ-71-252', rev: 'B', status: 'released', nha: 'LEZ-71-251', qty: 1, kind: 'cots',
  title: 'Induction air filter element',
  revs: [...rev0('Initial definition: the element\'s envelope as the solid, inclined 25° aft-end-down in the air box; rating and density typed from memory (bounded in ind-air).'), { rev: 'B', date: DATE, short: 'Element 5.4 × 5.48 in', change: 'Element resized to the new box: 5.4 × 5.48 × 0.96 in (29.6 in², at least the rev A 29.0 in² the typed 200 cfm rating was taken for), still 25° aft end down.' }],
  effectivity: 'One per aircraft', params: FP,
  datums: [{ id: 'A', what: 'Filter seat in the air box' }],
  features: [{ id: 'element', kind: 'envelope', label: 'Oiled foam element 5.4 × 5.48 × 0.96 in (29.6 in²) in an aluminium frame with a gasket, inclined 25° aft end down', tol: 'Vendor' }],
  tolerances: { general: 'Vendor part' }, drawingNotes: ['Replace on condition or per the vendor\'s interval.'], generalNote: '—',
  na: { cut: 'Bought-in', layup: 'Bought-in' },
  material: { spec: 'Flame-retardant reticulated Divinycell HT61, oiled, aluminium frame', alt: 'Pleated paper element of the same envelope', form: 'bought', density: FOAM.rho, allowables: [['Rated flow', `${FOAM.ratedCfm} cfm`, 'BOUND (typed)']] },
  process: [{ op: 'Install', spec: 'Seat in the air box with its gasket; check light-tight round the frame.' }],
  checks: ['ind-air'], rules: [],
  mass: { each: groupVols(FP.prims).foam * FOAM.rho, from: `envelope × ${FOAM.rho} lb/in³ (oiled foam with frame, typed)` },
  hardware: [], hardwareNote: 'Held by the air box lid.',
  interfaces: [{ id: 'I1', with: 'LEZ-71-251 air box', feature: 'element', what: 'Element inside the box', check: () => { const ab = AXP.prims.filter((p) => p.feat === 'box'), f = FP.prims[0].secs.flat(), lo = Math.min(...ab.map((p) => p.c[1] - p.d[1] / 2)) - 4, hi = Math.max(...ab.map((p) => p.c[1] + p.d[1] / 2)); return { ok: f.every((q) => q[1] >= lo && q[1] <= hi), detail: `FS ${fx(Math.min(...f.map((q) => q[1])))}–${fx(Math.max(...f.map((q) => q[1])))}` }; } }],
  tooling: { needed: false, text: 'None.' },
  sourcing: { blank: 'Foam induction filter element, 5.4 × 5.5 × 1.0 in, rated ≥ 200 cfm', vendor: 'Aircraft Spruce (foam induction filters; typed from memory)', url: 'https://www.aircraftspruce.com/', cost: 35, costAsOf: DATE, perAircraft: 1, lead: 'Stock', note: 'Approximate; a custom-size element may be needed.' },
};

// ------------------------------------------------------------------------------------------- LEZ-78-100 exhaust
export const exhParams = () => ({ frame: 'aircraft', prims: exhaustPrims().map(tidy) });
const XP = exhParams();
export const EXH_DEF = {
  pn: 'LEZ-78-100', rev: 'B', status: 'released', nha: 'LEZ-71-200', qty: 1,
  title: 'Exhaust stacks (4)',
  revs: [...rev0(`Initial definition. Mass carried an ASSUMED 1.6 lb for flanges and hardware. As defined: four ${EXH.od} × ${EXH.w} in 321 stainless stacks on the existing routes with ${EXH.fl.t} in flanges, checked for clearance to the cowl, to fuel and oil runs and to the SCAT (the separations the routing rules lacked, ICD G-F11).`), { rev: 'B', date: DATE, short: 'Stacks rerouted outboard of the starter and alternator', change: 'The straight runs to the exits went through the starter (0.9 in), the alternator (1.1 in) and the crankcase (0.4 in) (ICD G phase 2). The stacks now run aft outboard of them (rear stacks BL ±8.3 at WL 30.0, front stacks BL ±10.2 at WL 31.0, the rear inboard of the front stacks\' port drops), sweep inboard behind them from FS 186.7 and leave through the lower cowl as before; the rear stacks take the inner exits, the front stacks the outer.' }],
  effectivity: 'One set per aircraft', params: XP,
  datums: [{ id: 'A', what: 'Exhaust port flange faces' }],
  features: [{ id: 'stack', kind: 'tube', label: `Stacks ${EXH.od} × ${EXH.w} 321 SS, one per cylinder, exits through the lower cowl ahead of the prop`, tol: 'Bends to the fixture ±1/8 in' }, { id: 'flange', kind: 'plate', label: `Flanges ${EXH.fl.L} × ${EXH.fl.W} × ${EXH.fl.t} in, 2 stud holes at ${EXH.fl.pitch} in`, tol: 'Flat after welding' }],
  tolerances: { general: '±1/8 in on bends', breakEdges: '—' }, drawingNotes: ['Fit on the engine with the cowl; ≥ 1 in to the cowl except at the exit sleeve.'], generalNote: 'Inspect welds for cracks every 50 h.',
  na: { cut: 'Tube bent to the fixture', layup: 'Metal part' },
  material: { spec: '321 stainless tube 1.5 × 0.035 (AMS 5557); 321 / 304 plate flanges', alt: '304L', form: 'tube and plate', density: SS, allowables: [['321 SS F_ty at 1,500 °F', '12 ksi', 'BOUND (typed)']] },
  process: [{ op: 'Bend', spec: 'Mandrel-bend to the fixture; weld the flanges (TIG, argon back-purge).' }, { op: 'Install', spec: 'New gaskets; brass nuts on the studs; safety per the engine maker.' }],
  checks: ['exh-clear', 'exh-hang'], rules: [],
  mass: { each: massOfPrims(XP.prims, { ss: SS }), from: 'solid volumes × 0.289 lb/in³' },
  hardware: [{ std: 'Exhaust gasket (Lycoming type)', qty: 4, desc: 'port gasket', each: 0.02 }, { std: 'Brass exhaust nut 5/16-24', qty: 8, desc: 'on the port studs', each: 0.01 }], hardwareNote: '4 gaskets, 8 brass nuts.',
  interfaces: [{ id: 'I1', with: 'LEZ-71-155 cowl', feature: 'stack', what: '≥ 1 in to the inner skin outside the exits', check: () => { const c = exhCowl(); return { ok: c.d >= 1.0, detail: `${fx(c.d)} in` }; } }, { id: 'I2', with: 'LEZ-61-100 prop', feature: 'stack', what: 'Exits ≥ 4 in ahead of the blades', check: () => { const e = Math.max(...exhExits().map((q) => q[1])), b = PX.yBp + PX.hub.L / 2 - PX.blade.rootT / 2; return { ok: b - e >= 4, detail: `${fx(b - e)} in` }; } }],
  tooling: { needed: true, text: 'Stack fixture: a plate drilled to the port pattern with the exit positions.' },
  sourcing: { blank: '321 SS tube 1.5 × 0.035, 6 ft; 0.25 plate 6 × 6 in', vendor: 'Aircraft Spruce (321 stainless tube)', url: 'https://www.aircraftspruce.com/', cost: 220, costAsOf: '2026-11-19', perAircraft: 1, lead: 'Stock', note: 'Material, shop-built (welding by a shop); BOUND. Bought alternative: ACS Long-EZ exhaust system 33804, $2,599 (Aircraft Spruce Long-EZ kit page, accessed 2026-11-19).' },
};

// ------------------------------------------------------------------------------------------- LEZ-78-110 muff + SCAT
export const muffParams = () => ({ frame: 'aircraft', prims: muffPrims().map(tidy) });
const MP = muffParams();
export const MUFF_DEF = {
  pn: 'LEZ-78-110', rev: 'D', status: 'released', nha: 'LEZ-78-100', qty: 1,
  title: 'Carb-heat muff and SCAT duct',
  revs: [...rev0(`Initial definition. Mass was ASSUMED. As defined: a ${MUFF.L} in 321 stainless shroud ${MUFF.gap} in round the left-rear stack, its forward end feeding a 2 in SCAT to the air box's heat port; checked for the carb-heat temperature rise (film coefficient bounded).`), { rev: 'B', date: DATE, short: 'Muff on the new left-rear run', change: 'The muff follows the left-rear stack\'s rerouted run (its longest straight before the exit, rev B of LEZ-78-100), clear of the starter it ran through. The SCAT route to the heat spigot is still open with the air box (ICD G-O1).' }, { rev: 'C', date: DATE, short: 'SCAT round the sump to the new heat spigot', change: 'The SCAT ran from the muff through the sump and the carburettor to a spigot inside the carburettor envelope (ICD G-O1). Now it leaves the muff\'s inboard-lower side, runs forward outboard of the sump and under the crankcase, round the sump\'s front and down beside the carburettor into the scoop blister, onto the heat spigot in the air box lid.' }, { rev: 'D', date: DATE, short: 'SCAT aft of the engine rev B carb arms (H-O1)', change: 'The SCAT\'s last run came down through block H\'s engine rev B carburettor arms (−0.52 in; 0.05 in from a conduit, the throttle rod sweep 0.16 in into it). It now comes down aft of them, behind the carburettor and outboard of the sump, onto the spigot at FS 166.6: ≥ 1 in from the arms over their travel and from the conduits (I3).' }],
  effectivity: 'One per aircraft', params: MP,
  datums: [{ id: 'A', what: 'Left-rear stack axis' }],
  features: [{ id: 'muff', kind: 'shroud', label: `Shroud ${fx(2 * (EXH.od / 2 + MUFF.gap + MUFF.w), 3)} OD × ${MUFF.w} 321 SS, ${MUFF.L} in, open aft, outlet forward`, tol: '±1/16 in' }, { id: 'scat', kind: 'duct', label: '2 in SCAT to LEZ-71-251 HEAT-IN, hose clamps both ends', tol: 'Clear of the other stacks ≥ 1 in' }],
  tolerances: { general: '±1/16 in' }, drawingNotes: ['Clamp the shroud to the stack with two stainless band clamps.'], generalNote: '—',
  na: { cut: 'Sheet rolled to the shroud', layup: 'Metal part' },
  material: { spec: '321 stainless sheet 0.032; SCAT 2 in (silicone-coated, wire reinforced)', alt: '—', form: 'sheet, hose', density: SS, allowables: [] },
  process: [{ op: 'Make', spec: 'Roll and weld the shroud; weld on the outlet spigot.' }, { op: 'Install', spec: 'Clamp to the stack; SCAT to the air box; support every 12 in.' }],
  checks: ['muff-heat'], rules: [],
  mass: { each: massOfPrims(MP.prims, { ss: SS, scat: SCAT_RHO }), from: 'solid volumes: shroud × 0.289; SCAT at 0.12 lb/ft (typed) over the drawn wall' },
  hardware: [{ std: 'MS9068 band clamp', qty: 2, desc: 'shroud to stack', each: 0.03 }, { std: 'AN737 hose clamp', qty: 2, desc: 'SCAT ends', each: 0.02 }], hardwareNote: '2 band clamps, 2 hose clamps.',
  interfaces: [{ id: 'I1', with: 'LEZ-71-251 HEAT-IN', feature: 'scat', what: 'SCAT ends on the spigot', check: () => { const s = MP.prims.filter((p) => p.feat === 'scat').at(-1).b, h = HEAT_PORT; return { ok: Math.hypot(...s.map((v, i) => v - h[i])) < 0.01, detail: `end at ${s.map((v) => fx(v)).join(', ')}` }; } }],
  tooling: { needed: false, text: 'Slip roll for the shroud.' },
  sourcing: { blank: '321 SS sheet 0.032, 6 × 14 in; SCAT 2 in × 2 ft', vendor: 'Aircraft Spruce', url: 'https://www.aircraftspruce.com/', cost: 75, costAsOf: DATE, perAircraft: 1, lead: 'Stock', note: 'Approximate.' },
};

// ------------------------------------------------------------------------------------------- LEZ-79-100 oil
const OIL_LINES = [{ std: 'SAE J1899 ashless-dispersant aviation oil, US qt', qty: OIL.qt, desc: 'engine oil (break-in: mineral oil per the overhaul shop)', each: OIL.lbQt }];
export const oilParams = () => ({ qt: OIL.qt, lbQt: OIL.lbQt, minQt: OIL.minQt });
export const OIL_DEF = {
  pn: 'LEZ-79-100', rev: 'A', status: 'released', nha: 'LEZ-71-200', qty: 1, install: true,
  title: `Engine oil, ${OIL.qt} US qt`,
  revs: rev0(`Initial definition: ${OIL.qt} qt at ${OIL.lbQt} lb/qt (the system record carried 11.3 lb). Quantity checked against the fuel endurance at the engine maker's maximum consumption (typed, bounded).`),
  effectivity: 'One fill', params: oilParams(), datums: [],
  features: [{ id: 'fill', kind: 'fluid', label: `${OIL.qt} US qt in the sump (O-235 capacity [OM]); minimum for flight ${OIL.minQt} qt (typed, bounded)`, tol: 'Dipstick full mark' }],
  tolerances: { general: 'Fill to the dipstick' }, drawingNotes: ['Change at the overhaul shop\'s break-in interval, then per the engine maker.'],
  na: { cut: 'Fluid', layup: 'Fluid' },
  material: { spec: 'SAE J1899 ashless-dispersant aviation oil (SAE J1966 mineral oil for break-in)', alt: 'Multigrade per the engine maker', form: 'fluid', density: 0.0284, allowables: [] },
  process: [{ op: 'Fill', spec: `${OIL.qt} qt; run; check for leaks; top up to the mark.` }],
  checks: ['oil-qty'], rules: [],
  mass: { each: OIL_LINES.reduce((a, l) => a + l.qty * l.each, 0), from: 'hardware lines (quarts × lb/qt)' },
  hardware: OIL_LINES, hardwareNote: `${OIL.qt} × 1 qt`,
  interfaces: [], tooling: { needed: false, text: 'None.' },
  sourcing: { blank: `${OIL.qt} qt aviation oil`, vendor: 'Aircraft Spruce (aviation oil)', url: 'https://www.aircraftspruce.com/', cost: 60, costAsOf: DATE, perAircraft: 1, lead: 'Stock', note: 'Approximate.' },
};

// ------------------------------------------------------------------------------------------- LEZ-79-110 oil cooler
export const olcParams = () => ({ frame: 'aircraft', prims: coolerPrims().map(tidy), dryLb: COOLER.dryLb });
const CLP = olcParams();
export const olcMass = (m) => (m.volumes?.core > 0 ? COOLER.dryLb + (m.volumes.al ?? 0) * AL : 0);
export const OLC_DEF = {
  pn: 'LEZ-79-110', rev: 'A', status: 'released', nha: 'LEZ-71-200', qty: 1, kind: 'cots',
  title: 'Oil cooler, 9-row (engine-mounted)',
  revs: rev0(`Initial definition. The record said "firewall, right side" but the cooler was carried on the mount, with no bracket or air path (ICD G-F7), and its box would now sit on the lower bracket's leg B. As defined: engine-mounted, its aft face sealed over a cut-out in the lower rear baffle wall (LEZ-71-230) so lower-plenum air passes forward through it into the accessory bay; a 0.063 in doubler frame on the wall and a strap to the crankcase carry it; the hoses run straight from the crankcase ports into its inboard face.`),
  effectivity: 'One per aircraft', params: CLP,
  datums: [{ id: 'A', what: 'Cooler aft face (on the baffle wall)' }],
  features: [{ id: 'core', kind: 'envelope', label: `Core ${COOLER.W} × ${fx(COOLER.x[1] - COOLER.x[0])} × ${fx(COOLER.z[1] - COOLER.z[0])} in at BL ${fx(COOLER.y0)}–${fx(COOLER.y1)}, FS ${fx(COOLER.x[0])}–${fx(COOLER.x[1])}, WL ${COOLER.z[0]}–${COOLER.z[1]}; -8 ports on the inboard face`, tol: 'Vendor envelope' }, { id: 'bracket', kind: 'sheet', label: '0.063 6061-T6 doubler bands on the wall\'s aft (plenum) face above and below the cut-out, the cooler bolted through wall and bands; a strap from its top to the crankcase side', tol: '±0.03' }],
  tolerances: { general: 'Vendor part; bracket ±0.03' }, drawingNotes: ['Silicone gasket between the cooler face and the baffle wall all round the cut-out.'], generalNote: 'Pressure-test the hoses with the cooler at 1.5 × the oil pressure limit.',
  na: { cut: 'Bought-in', layup: 'Bought-in' },
  material: { spec: 'Aviation oil cooler, 9 rows, -8 ports (vendor); bracket 6061-T6 0.063', alt: 'Any cooler of this envelope and rating', form: 'bought; bracket sheet', density: null, allowables: [['Rated rejection', `${COOLER.ratedBtu} BTU/h at 30 lb/min air`, 'BOUND (typed)'], ['Dry mass', `${COOLER.dryLb} lb`, 'typed from memory']] },
  process: [{ op: 'Install', spec: 'Rivet the doubler frame to the wall; bolt the cooler through it (4 × AN3); strap to the crankcase.' }],
  checks: ['olc-heat', 'olc-mount'], rules: [],
  mass: { each: COOLER.dryLb + groupVols(CLP.prims).al * AL, from: `vendor dry mass ${COOLER.dryLb} lb (typed) + the bracket's solid × 0.098 lb/in³` },
  hardware: [{ std: 'AN3-5A', qty: 4, desc: 'cooler to the doubler frame', each: 0.012 }, { std: 'MS21042L3', qty: 4, desc: 'nut', each: 0.004 }], hardwareNote: '4 × AN3-5A with MS21042L3 nuts.',
  interfaces: [
    { id: 'I1', with: 'LEZ-71-220 / -224 / -221 mount, cups and isolators', feature: 'core', what: 'Clear of the mount by ≥ 0.5 in', check: () => { const c = primClear(CLP.prims.filter((p) => p.feat === 'core'), [...mountPrims(), ...cupPrims()]); return { ok: c >= 0.5, detail: `${fx(c)} in` }; } },
    { id: 'I2', with: 'LEZ-79-115 hoses', feature: 'core', what: 'Ports where the hoses end', check: () => { const h = HOSES(); return { ok: Math.hypot(...h[0].pts.at(-1).map((v, i) => v - COOLER_PORTS.IN[i])) < 1e-3 && Math.hypot(...h[1].pts[0].map((v, i) => v - COOLER_PORTS.OUT[i])) < 1e-3, detail: 'IN / OUT on the inboard face' }; } },
  ],
  tooling: { needed: false, text: 'None.' },
  sourcing: { blank: 'Aviation oil cooler, 9-row, -8 ports, ≥ 30,000 BTU/h', vendor: 'Aircraft Spruce (aviation oil coolers; typed from memory)', url: 'https://www.aircraftspruce.com/', cost: 573, costAsOf: '2026-11-19', perAircraft: 1, lead: 'Stock', note: 'Aero-Classics 8000074 9-row, 8.14 × 5.33 × 3.62 in, 3/8 NPT ports (Aircraft Spruce 08-00641, accessed 2026-11-19); heat rating not published (BOUND).' },
};

// ------------------------------------------------------------------------------------------- LEZ-79-115 hoses
export const olhParams = () => ({ frame: 'aircraft', prims: hosePrims().map(tidy) });
const HP = olhParams();
export const OLH_DEF = {
  pn: 'LEZ-79-115', rev: 'A', status: 'released', nha: 'LEZ-79-110', qty: 1,
  title: 'Oil cooler hoses (-8, fire-sleeved)',
  revs: rev0(`Initial definition. The hoses ran 0.06 in from a mount diagonal (ICD G-F5) to a firewall cooler. As defined: two straight -8 hoses from the crankcase ports (BL ${OIL_PORTS.OUT[0]}) into the cooler's inboard face, behind the mount ring and between the cups; both ends on the engine, so no isolator motion to take.`),
  effectivity: 'One pair per aircraft', params: HP,
  datums: [{ id: 'A', what: 'Engine port faces' }],
  features: [{ id: 'supply', kind: 'hose', label: `Engine OIL-OUT → cooler IN, ${fx(HOSES()[0].pts.reduce((a, q, i, s) => a + (i ? Math.hypot(...q.map((v, k) => v - s[i - 1][k])) : 0), 0))} in`, tol: 'Length ±1/4 in' }, { id: 'return', kind: 'hose', label: `Cooler OUT → engine OIL-RTN, ${fx(HOSES()[1].pts.reduce((a, q, i, s) => a + (i ? Math.hypot(...q.map((v, k) => v - s[i - 1][k])) : 0), 0))} in`, tol: 'Length ±1/4 in' }],
  tolerances: { general: 'Hose assemblies to length ±1/4 in' }, drawingNotes: ['Straight swivel ends both ends; AS1072 fire sleeve over the whole length.'], generalNote: 'Proof-test 1.5 × the oil pressure limit.',
  na: { cut: 'Hose cut to length', layup: 'Hose' },
  material: { spec: 'MIL-DTL-8794 / SAE 100R5 class -8 hose, AN fittings, AS1072 fire sleeve', alt: 'PTFE -8 hose with fire sleeve', form: 'hose assemblies', density: HOSE.rho, allowables: [['Minimum bend radius', '4 in', 'BOUND (typed)']] },
  process: [{ op: 'Make up', spec: 'Cut, fit the swivel ends, fire-sleeve, proof-test.' }, { op: 'Install', spec: 'Torque the B-nuts; safety; check no contact with the cups or the ring tube.' }],
  checks: ['olh-clear'], rules: [],
  mass: { each: massOfPrims(HP.prims, { hose: HOSE.rho }), from: `solid volumes × ${HOSE.rho} lb/in³ (hose, fittings and sleeve smeared, typed)` },
  hardware: [{ std: 'AN6800-type -8 swivel end', qty: 4, desc: 'hose ends', each: 0.06 }], hardwareNote: '4 × -8 straight swivel ends.',
  interfaces: [{ id: 'I1', with: 'LEZ-71-210 OIL-OUT / OIL-RTN', feature: 'supply', what: 'Hose ends on the engine ports', check: () => { const h = HOSES(); return { ok: Math.hypot(...h[0].pts[0].map((v, i) => v - OIL_PORTS.OUT[i])) < 1e-3 && Math.hypot(...h[1].pts.at(-1).map((v, i) => v - OIL_PORTS.RTN[i])) < 1e-3, detail: 'on the ports' }; } }],
  tooling: { needed: false, text: 'Hose-assembly tooling (mandrel, vice jaws).' },
  sourcing: { blank: '-8 hose 1 ft, 4 ends, AS1072 sleeve 1 ft', vendor: 'Aircraft Spruce (hose assemblies made to length)', url: 'https://www.aircraftspruce.com/', cost: 120, costAsOf: '2026-11-19', perAircraft: 1, lead: 'Days (made to order)', note: 'Stratoflex 111-8 at $18.85/ft (Aircraft Spruce, accessed 2026-11-19) plus ends and fire sleeve (BOUND).' },
};
void SCP; void BAF; void HINGE; void clearTo; void SS;
