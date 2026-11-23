// LEZ-57-180 strake (fuel tank): the definition record. The solid is lofted in constant-BL planes (cad/loft3d.py) from
// wp21's sections: the outer mould line from the leading edge to the CS spar's forward face and, in each bay, the tank
// cavity inside the shell. Inches; frame x = BL, y = FS (aft), z = WL (up). Notional.
import { GEO, FIXED, BASE_MAT, MATSYS, DEFAULT_DESIGN, analyse, strakeSec, strakeBays } from '../structures.js';
import { PROCESS, buildPlyBook } from '../plybook.js';
import { bookMass } from '../systems.js';
import { STK, strakeSection, strakeStations, strakeVolumes, strakeParams, STRAKE_RHO, strakeBidIn3 } from '../parts/wp21_strake.js';
import { RJ } from '../parts/wp13_airframe_joints.js';
import { want } from './util.js';

const fx = (x, n = 2) => x.toFixed(n), F = FIXED.strake, tB = BASE_MAT.BID.t;
let BK = null; const book = () => (BK ||= buildPlyBook(analyse(DEFAULT_DESIGN, false)).strake);
const lam = () => book().plies.reduce((a, p) => a + p.weight, 0);
export const skMassOf = (v) => Math.max(0, (v.OML ?? 0) - (v.cavity ?? 0) - strakeBidIn3(book().plies)) * STRAKE_RHO.PVC + lam();
export const skBookMass = () => { const m = bookMass(book()); return (m.lam + m.core) / book().count; };
export function skExpect(p, m) {
  const P = strakeParams(), q = P.segs.flatMap((s) => [0, 1].flatMap((e) => s.regions.oml[e].map((v) => [s.O[e][0], v[0], v[1]]))), mx = (i) => Math.max(...q.map((x) => x[i])), mn = (i) => Math.min(...q.map((x) => x[i])), V = strakeVolumes(), mv = m.volumes || {};
  return [want('Root face, BL (in)', mn(0), m.bbox[0], 0.002), want('End rib face, BL (in)', mx(0), m.bbox[1], 0.002), want('Leading edge, FS (in)', mn(1), m.bbox[2], 0.002), want('Tank aft wall, FS (in)', mx(1), m.bbox[3], 0.002),
    want('Outer mould line volume (in³)', V.OML, mv.OML ?? NaN, Math.max(0.01, V.OML * 0.002)), want('Tank cavity volume (in³)', V.cavity, mv.cavity ?? NaN, Math.max(0.01, V.cavity * 0.002)), want('Segments lofted', p.n, m.segments ?? NaN, 0)];
}
const V = strakeVolumes(), bays = strakeBays().map((b) => b * 12);
const PRICE = { BID: PP_PRICE.fab, H45sheet: +(PP_PRICE.coreFt2Qtr * 8 * 3).toFixed(2), L285gal: 0, H287qt: 0 };
const bidYd = () => Math.ceil(book().plies.reduce((a, p) => a + p.area * (p.plies || 1), 0) / 12.5 * 1.15);
const sheets = () => Math.ceil(book().core.volume * 1728 / (24 * 48 * F.coreIn) * 1.3);
const gal = () => lam() * (1 - PROCESS.fibreWeightFraction) / 1.4 / 10 * 1.3;
export const SK_DEF = {
  pn: 'LEZ-57-180', rev: 'A', status: 'released', nha: 'LEZ-000 (aircraft)', qty: 2, kind: 'laminate',
  title: 'Strake and fuel tank',
  solidText: 'CadQuery solid lofted in constant-BL planes: outer mould line, LE to the CS spar face, with the tank cavity in each bay',
  templates: 'T1–T4 (one per rib station)',
  revs: [{ rev: 'A', date: '2026-11-17', short: 'Initial definition', change: `Initial definition. The tank check had the fuel density, vent pressure, faces and core as ASSUMED; with the FAR 23.965(a)(3) 2 psi test pressure and vent ram at VD the 1-ply ±45 inner face and the 15.5 in bays failed. As defined: four ribs (a second baffle) give three ${fx(bays[0], 1)} in bays, the inner face is 0/90 with its fibres spanwise, and the shell stops at the CS spar's forward face (LEZ-57-151 laps the caps). The end rib (R4) moves here from LEZ-57-152. The cavity holds ${fx(V.cavity / 231, 1)} US gal a side.` }],
  effectivity: 'Left and right (mirror images); the right strake is drawn',
  params: strakeParams(),
  datums: [{ id: 'A', what: `Root rib face, BL ${fx(STK.yR)}: the fuselage side at its widest under the strake` }, { id: 'B', what: `Tank aft wall: the CS spar's forward face, FS ${fx(STK.aft)}` }, { id: 'C', what: `Wing chord plane, WL ${fx(GEO.wing.z * 12, 1)}` }],
  features: [
    { id: 'outline', kind: 'profile', label: `BL ${fx(STK.yR)} to ${fx(STK.yE)}, leading edge FS ${fx(strakeSec(STK.yR / 12).le * 12, 1)} at the root to ${fx(strakeSec(STK.yE / 12).le * 12, 1)} at the end rib, aft to the spar face at FS ${fx(STK.aft)}`, tol: 'Contour ±1/32 in to the rib templates' },
    { id: 'shell', kind: 'layup', label: `Shell: ${F.faceBID} × 6781 ±45 outside, ${F.coreIn} in HT61, ${F.innerBID} × 6781 0/90 inside (fibres spanwise, fuel-resistant epoxy); ${fx(STK.tsh, 3)} in thick`, tol: 'Splices staggered ≥ 2 in' },
    { id: 'ribs', kind: 'layup', label: `Ribs at BL ${STK.ribs.map((y) => fx(y, 1)).join(', ')}: ${F.coreIn} in HT61, ${F.ribBID} × 6781 each face; bays ${bays.map((b) => fx(b, 1)).join(' / ')} in clear; the end rib faces the wing root across the ${fx(GEO.join.gap * 12)} in gap`, tol: 'Ribs square to the spar ±0.5°' },
    { id: 'cavity', kind: 'pocket', label: `Tank: ${fx(V.cavity / 231, 1)} US gal inside the shell (three bays, interconnected at the bottom)`, tol: 'Leak-tight at 2 psi (FAR 23.965(a)(3))' },
  ],
  tolerances: { general: '.X ±0.06  ·  .XX ±0.03  ·  contour ±1/32', flatness: 'End rib flat within 0.03 in (the seal face)', holes: 'Fuel fittings per LEZ-28', breakEdges: 'Sand cut laminate edges smooth; seal with fuel-resistant resin' },
  drawingNotes: ['Ply IDs: K-US/LS outer skins, K-UN/LN tank-side faces, K-R1–R4 ribs.', 'Right strake shown; left opposite. Built on the airplane over the CS spar.'],
  generalNote: 'Tank-side surfaces in fuel-resistant epoxy; no pinholes.', na: {},
  material: { spec: '6781 S2-glass, MTM45-1 prepreg (NCAMP) (tank side: fuel-resistant), Divinycell HT61 3/8 in', alt: 'None: the cloth style and the foam set the face thickness and the wrinkling allowables', form: `${LAM_FORM()}`, density: null,
    allowables: [...LAM_ALLOW(false), ['HT61 core shear', `${BASE_MAT.PVC.tau} MPa`, 'Divinycell H datasheet, typical']] },
  process: [
    { op: 'Ribs', spec: 'Cut HT61 rib blanks to the templates; lay up both faces flat and cure (M cycle); bond to the fuselage side and the CS spar with FM 300-2 (250 °F, the assembly in the oven).' },
    { op: 'Lower shell', spec: 'Lay up the tank-side face (0/90) on the HT61 panel, bond onto the ribs, lay up the outside (±45).' },
    { op: 'Fittings', spec: 'Fuel fittings, sump, vent; seal and leak-check each bay at 1/4 psi.' },
    { op: 'Upper shell', spec: 'As the lower; cure on the M cycle (250 ± 10 °F, 4–6 h, no post-cure) (the shared cure, plybook PROCESS.cure); 23.965(c) vibration test, then the tank proof test at 1.95 psi (1.10 × block F\'s 1.73 psi governing field, docs/icd/f_fuel.md F-S1; the 2 psi test is withdrawn), no leak.' },
  ],
  checks: ['strake-tank', 'strake-fwd', 'strake-tank-comb', 'strake-rib-p'],
  rules: [
    { id: 'bay', label: 'Bay clear span ≤ 10.5 in', v: 10.5 / Math.max(...bays), min: 1 },
    { id: 'gap', label: 'End rib face on the joint gap (in from the wing root)', v: (GEO.join.y * 12 - STK.yE) / (GEO.join.gap * 12), min: 1 },
    { id: 'le', label: 'Shell inside the LE radius (radius / shell)', v: 1.1019 * strakeSec(STK.yE / 12).tc ** 2 * strakeSec(STK.yE / 12).c * 12 / STK.tsh, min: 1.5 },
  ],
  mass: { each: skMassOf({ ...V }), from: 'shell and ribs (OML less the cavity) less the glass × HT61 density, plus the plies from the ply book; checked against the solid and the ply book' },
  hardware: [], hardwareNote: 'Fuel fittings, sump and vent are on the fuel system (LEZ-28).',
  interfaces: [
    { id: 'I1', with: 'LEZ-57-140 CS spar', feature: 'outline', what: 'Tank aft wall on the spar\'s forward face',
      check: () => ({ ok: Math.abs(STK.aft - (GEO.csSpar.s - GEO.csSpar.width / 2) * 12) < 1e-6, detail: `aft wall FS ${fx(STK.aft)}, spar forward face FS ${fx((GEO.csSpar.s - GEO.csSpar.width / 2) * 12)}` }) },
    { id: 'I2', with: 'LEZ-57-152 seal and the wing root', feature: 'ribs', what: 'End rib face on the strake side of the gap',
      check: () => ({ ok: Math.abs(STK.yE - RJ.yS * 12) < 1e-6, detail: `end rib face BL ${fx(STK.yE)}, seal on BL ${fx(RJ.yS * 12)}` }) },
    { id: 'I3', with: 'LEZ-57-150 fuselage side', feature: 'outline', what: 'Root rib face on the fuselage side at its widest under the strake',
      check: () => ({ ok: Math.abs(STK.yR / 12 - GEO.strake.yRoot) < 1e-9, detail: `root face BL ${fx(STK.yR)}` }) },
  ],
  tooling: { needed: true, text: 'Rib templates at the four rib stations (T1–T4) located on the fuselage side and the CS spar; a leading-edge template; the tank test manifold (2 psi).' },
  sourcing: { blank: `${bidYd()} yd 6781 (50 in, +15 %); ${sheets()} sheet(s) 3/8 in HT61 (2 × 4 ft)`, vendor: PP_VENDOR.vendor, url: PP_VENDOR.url,
    cost: bidYd() * PRICE.BID + sheets() * PRICE.H45sheet + gal() * (PRICE.L285gal + 2 * PRICE.H287qt), costAsOf: '2026-11-17', perAircraft: 2, lead: 'Stock items', note: 'HT61 3/8 in priced as the 3/4 in sheet (upper bound).' },
};
void strakeSection; void strakeStations; void tB;

// Block F revision (site/defn/f_revs.js): fuel-system holes, inserts and conduits at assembly; solid unchanged
import { STRAKE_REV, STRAKE_FEAT, STRAKE_IF, STRAKE_NOTE } from './f_revs.js';
SK_DEF.rev = 'B'; SK_DEF.revs.push(STRAKE_REV); SK_DEF.features.push(STRAKE_FEAT()); SK_DEF.interfaces.push(STRAKE_IF()); SK_DEF.drawingNotes.push(STRAKE_NOTE());

// memory-audit integration (2026-11-19): this record's new revision
import { memRev } from './revs_memaudit.js';
import { LAM_ALLOW, LAM_SPEC, LAM_FORM, LAM_CURE, ppBuy, PP_VENDOR, PP_PRICE } from './p_common.js';
memRev(SK_DEF);
