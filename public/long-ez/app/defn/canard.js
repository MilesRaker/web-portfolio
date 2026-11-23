// LEZ-55-120 canard: the definition record. One piece tip to tip; the solid is the right half lofted in BL planes
// (cad/loft3d.py) from wp24's sections (OML less the elevator cove, both caps) and mirrored. Inches; x = BL, y = FS, z = WL.
import { GEO, FIXED, BASE_MAT, MATSYS, DEFAULT_DESIGN, analyse, surfaceGeom } from '../structures.js';
import { PROCESS, buildPlyBook } from '../plybook.js';
import { bookMass } from '../systems.js';
import { CNA, cnCaps, cnStations, cnVolumes, cnParams, cnShell, CN_RHO } from '../parts/wp24_canard.js';
import { want } from './util.js';
import { CCUTS, cnSegments } from '../parts/wp24_canard.js';
import { L as CL } from '../parts/wpC1_controls.js';
import { cutVol } from '../parts/cuts.js';
import { CUTS_TXT, CG, lipRule } from '../parts/wpC8_cuts.js';
import { CTLS } from '../parts/wp19_ctl.js';
const CTLS_E = CTLS.elevator;
import { fitAN } from '../parts/wp16_wing_attach.js';
import { F28 } from '../parts/wpA1_f28.js';

const fx = (x, n = 2) => x.toFixed(n), G = GEO.canard, GM = surfaceGeom('canard');
let BK = null; const book = () => (BK ||= buildPlyBook(analyse(DEFAULT_DESIGN, false)).canard);
const sh = () => cnShell(book().plies);
export const cnMassOf = (v) => (2 * (v.UNI ?? 0)) * CN_RHO.UNI + Math.max(0, 2 * ((v.OML ?? 0) - (v.UNI ?? 0)) - sh().in3) * CN_RHO.PVC + sh().lb;   // the solid is the half: × 2
export const cnBookMass = () => { const m = bookMass(book()); return (m.lam + m.core) / book().count; };
export function cnExpect(p, m) {
  const V = cnVolumes(), mv = m.volumes || {};
  return [want('Half span, BL 0 to the tip (in)', G.semi * 12, m.bbox[1] - m.bbox[0], 0.002), want('Chord, LE to TE (in)', G.c * 12, m.bbox[3] - m.bbox[2], 0.01),
    want('Outer mould line volume, half (in³)', V.OML, mv.OML ?? NaN, Math.max(0.01, V.OML * 0.002)), want('HTS40 cap volume, half (in³)', V.UNI, mv.UNI ?? NaN, Math.max(0.01, V.UNI * 0.002)), want('Segments lofted', p.n, m.segments ?? NaN, 0),
    ...CCUTS.map((c) => { const q = (m.cuts || []).find((x) => x.id === c.id), v = cutVol(c); return want(`Cut ${c.id} (${c.feat}) volume, half (in³)`, v, q ? q.vol : NaN, Math.max(0.005, v * 0.01)); }), want('Cuts inside the caps (in³)', 0, (m.cuts || []).reduce((a, x) => a + (x.hit || 0), 0), 0.002)];
}
const V = cnVolumes(), Z = analyse(DEFAULT_DESIGN, false).Z.canard, dU = cnCaps('upper').filter((y) => y < G.semi - 1e-6), dL = cnCaps('lower').filter((y) => y < G.semi - 1e-6);
// F22 bolt and F28 pin grips (rev C): tab + bulkhead at the hard point + one AN960 washer under the nut (AN grip table typed from memory, wp16 pickAN)
const F22hp = () => { const F2 = FIXED.F22, tB = BASE_MAT.BID.t; return F2.coreIn + 2 * F2.faceBID * tB + 2 * (F2.ngDbl || 0) * tB + analyse(DEFAULT_DESIGN, false).Z.f22Dbl * tB + F2.doublerUNI * BASE_MAT.UNI.t; };
export const CN_GRIP = (() => fitAN(CNA.an, CNA.nT * BASE_MAT.BID.t + F22hp()))();   // 2026-11-19 (rev E): corrected AN grip terms, washers ≤ 1/8 in (wp16 fitAN)
/** the F28 torque pins: tab + F28 at its hard point (the same stack LEZ-53-165 checks) */
export const CN_PIN = () => fitAN(CNA.pin, CNA.nP * BASE_MAT.BID.t + F28.t + F28.hpBID * BASE_MAT.BID.t);
const stag = (a) => Math.min(...a.slice(1).map((y, i) => (y - a[i]) * 12));
const PRICE = { UNI: PP_PRICE.cf, BID: PP_PRICE.fab, H45sheet: +(PP_PRICE.coreFt2Qtr * 8 * 3).toFixed(2), L285gal: 0, H287qt: 0 };
const ft2 = (mat) => book().plies.filter((p) => p.mat === mat).reduce((a, p) => a + p.area * (p.plies || 1), 0);
const lam = () => book().plies.reduce((a, p) => a + p.weight, 0), gal = () => lam() * (1 - PROCESS.fibreWeightFraction) / 1.4 / 10 * 1.3;
const sheets = () => Math.ceil(book().core.volume * 1728 / (24 * 48 * 0.75) * 1.4);
export const CN_DEF = {
  pn: 'LEZ-55-120', rev: 'D', status: 'released', nha: 'LEZ-000 (aircraft)', qty: 1, kind: 'laminate',
  title: 'Canard',
  solidText: 'CadQuery solid: the right half lofted in BL planes (OML less the elevator cove, both caps), mirrored',
  templates: 'T1–T2 (one constant-chord pair, with the cap troughs)',
  revs: [{ rev: 'A', date: '2026-11-17', short: 'Initial definition', change: `Initial definition. The attach was a 4-ply skin doubler with no canard-side check, and the F22 bearing check took the bolt as ASSUMED. As defined the canard bolts to F22 through its spar block, 2 × AN4 a side on 6061-T6 crush tubes with a 2-ply web doubler, and an AN4 pin at F28 takes the root torque; the skin doublers are retired. Core volume now from the sections (the book's thickness rule overstated it). The twist requirement is a design value, not an assumption.` },
    { rev: 'B', date: '2026-11-18', short: 'Attach on tabs', change: `Defining F22 showed rev A's bolts could not work: F22 sits under the spar block's aft half, so nothing of F22 lies beside the spar block for a fore-aft bolt; and at BL ±7.2 the attach sat outside the shell under the canard (its inner wall is at BL ±6.6 there). The attach moves to BL ±${fx(G.attachY * 12, 1)}, and the pitot line and the forward harness are rerouted clear of it. The canard now carries a ${CNA.nT}-ply BID tab under the spar at each attach, its ${CNA.Lf} in flange floxed to the lower skin and its ${CNA.hT.toFixed(2)} in leg down F22's forward face, ${CNA.w} in wide, ${CNA.nb} × AN${CNA.an} into the F22 hard point; ${CNA.nP}-ply tabs at F28 take the AN${CNA.pin} torque pins. The web doublers and crush tubes are gone. New checks on the tab's bond and net section.` }, { rev: 'C', date: '2026-11-18', short: 'F22 bolt length', change: `Hardware only (ICD M-4): the F22 attach bolts were AN${CNA.an}-5A (grip 0.235 in) against a ${CN_GRIP.stack.toFixed(3)} in stack (${CNA.nT}-ply tab, F22 at its hard point, one washer); now ${CN_GRIP.std} (grip ${CN_GRIP.grip.toFixed(3)} in). AN grip lengths typed from memory (wp16 pickAN). The F28 pins stay AN4-10A (LEZ-53-165 checks the grip).` }, { rev: 'D', date: '2026-11-19', short: 'Cove-lip relief for the elevator horn', change: `The elevator's horn (LEZ-55-192 rev B) stands forward of its pin at the inboard end and sweeps into the canard's lower cove lip at full travel (ICD c_controls §8). Added: ${CUTS_TXT.canard()}; it takes ${fx(lipRule().cut, 2)} in of the canard-side hinge-leaf bond at the inboard end. Mass less ${fx(2 * cutVol(CCUTS[0]), 3)} in³ of core; no check changes.` }],
  effectivity: 'One per aircraft, tip to tip; the right half is drawn', params: cnParams(),
  datums: [{ id: 'A', what: 'Centre line, BL 0' }, { id: 'B', what: `Spar line, ${Math.round(G.spar * 100)} % chord (FS ${fx((G.le + G.spar * G.c) * 12, 1)})` }, { id: 'C', what: `Chord plane, WL ${fx(G.z * 12, 1)}` }],
  features: [
    { id: 'outline', kind: 'profile', label: `Span ${fx(2 * G.semi * 12, 1)} in, constant chord ${fx(G.c * 12, 2)} in, ${Math.round(G.tc * 100)} % thick; elevator cove BL ±${fx(G.elevator[0] * 12, 1)}–${fx(G.elevator[1] * 12, 1)} at ${Math.round((1 - G.elevCf) * 100)} % chord`, tol: 'Contour ±1/32 in to the templates' },
    { id: 'cap', kind: 'layup', label: `Caps on B, ${fx(GM.sec(0).b, 1)} → ${fx(GM.sec(G.semi).b, 1)} in wide, continuous through the centre: ${Z.upper.length} upper, ${Z.lower.length} lower HTS40 at BL 0; drops at ±BL upper ${dU.map((y) => fx(y * 12, 1)).join(', ')}; lower ${dL.map((y) => fx(y * 12, 1)).join(', ')}`, tol: 'Ply ends ±0.25 in; stagger ≥ 1 in' },
    { id: 'skin', kind: 'layup', label: `Skins ${FIXED.skinBID} × 6781 ±45, 1 in LE overlap, stop at the hinge line over the elevators; shear web ${Z.web} × 6781 on the HT61 spar block`, tol: 'Overlaps ≥ 1 in' },
    { id: 'tab', kind: 'layup', label: `Attach tabs at BL ±${fx(G.attachY * 12, 1)}: F22 tab ${CNA.nT} × 6781 ±45, ${CNA.w} in wide, ${CNA.Lf} in flange floxed under the canard ending on F22's forward face, ${fx(CNA.hT)} in leg down it; F28 tab ${CNA.nP} × 6781, 1.5 in leg`, tol: 'Legs flat on the bulkhead faces within 0.02 in' },
    { id: 'relief', kind: 'pocket', label: CUTS_TXT.canard(), tol: '±0.03; flox-sealed' },
    { id: 'attach', kind: 'hole', label: `F22 bolts ${CNA.nb} × Ø ${fx(CNA.D, 3)} fore-aft through the tab leg, ${CNA.edge} in and ${fx(CNA.edge + CNA.pitch)} in below the canard's lower surface; AN${CNA.pin} pin through the F28 tab`, tol: 'Drilled through the F22 jig guide', assy: true },
  ],
  tolerances: { general: '.X ±0.06 · .XX ±0.03 · contour ±1/32 · ply ends ±0.25', flatness: 'Incidence within 0.1° across the span; no twist', holes: 'Attach holes through the jig guide with the canard on the fuselage', breakEdges: 'Sand cut laminate edges smooth; seal with resin' },
  drawingNotes: ['Ply IDs: C-UC/LC caps, C-US/LS skins, C-W web, C-TA / C-TP attach tabs.', 'Built in one piece, upside down in the leveling jig, then flipped.'], generalNote: 'Cured laminate tap-tested; edges sealed.', na: {},
  material: { spec: 'HTS40 carbon / 6781 S2-glass, MTM45-1 prepreg (NCAMP), Divinycell HT61 core', alt: 'None: the HT61 core sets the wrinkling allowable the caps are sized to', form: `${LAM_FORM()}`, density: null,
    allowables: [...LAM_ALLOW(true)] },
  process: [
    { op: 'Core', spec: 'CNC-mill the HT61 blocks to the constant-chord templates; join on the jig; fit the spar block and wrap the web.' },
    { op: 'Layup', spec: 'Upside down in the jig: lower trough, lower caps (shortest first), skins; flip; upper caps, skins. Bag and cure on the NCAMP M cycle (250 ± 10 °F, 4–6 h, ≥ 28 inHg; no post-cure), the part whole in the oven; witness coupon.' },
    { op: 'Attach', spec: `On the fuselage at incidence: lay the tabs in place against F22 and F28 (release film on the bulkheads), cure; drill through the F22 guide, ${CNA.nb} × AN${CNA.an} a side with MS21042L${CNA.an} nuts; AN${CNA.pin} pins at F28.` },
    { op: 'Inspect', spec: 'Tap test the caps and the attach; weight within ±5 %; incidence across the span.' },
  ],
  checks: ['canard-cap', 'canard-web', 'canard-webbuck', 'canard-torsion', 'canard-drop', 'canard-core', 'canard-div', 'canard-freq', 'canard-twist', 'canard-attach', 'canard-pin'],
  rules: [{ id: 'stagger-u', label: 'Upper cap drop stagger ≥ 1 in', v: stag(dU), min: 1 }, { id: 'stagger-l', label: 'Lower cap drop stagger ≥ 1 in', v: stag(dL), min: 1 },
    { id: 'leaf', label: 'Canard-side hinge-leaf bond kept with the lip relief (share)', v: lipRule().kept, min: 0.99 },
    { id: 'lip', label: 'Lip relief clear of the lower cap (in)', v: CG.fs[0] - (G.le + G.spar * G.c) * 12 - GM.sec(0).b / 2, min: 1 },
    { id: 'eD', label: 'Tab bolt edge distance e/D ≥ 2 (sides and bottom)', v: Math.min((CNA.w / 2) / CNA.D, (CNA.hT - CNA.edge - (CNA.nb - 1) * CNA.pitch) / CNA.D) / 2, min: 1 }],
  mass: { each: cnMassOf({ ...V }), from: 'half-span region volumes × 2 (HTS40 caps, HT61 core) plus skins, webs and doublers from the ply book; checked against the solid and the ply book' },
  hardware: [{ std: CN_GRIP.std, qty: 2 * CNA.nb, desc: `F22 attach bolts, fore-aft through the tab and the F22 hard point (grip ${CN_GRIP.grip.toFixed(3)} in over ${CN_GRIP.stack.toFixed(3)} in)` }, { std: `MS21042L${CNA.an}`, qty: 2 * CNA.nb, desc: 'Nuts' }, { std: CN_PIN().std, qty: 2, desc: `F28 torque pins (grip ${CN_PIN().grip.toFixed(3)} in over ${CN_PIN().stack.toFixed(3)} in with washers)` }],
  hardwareNote: `${2 * CNA.nb} × AN${CNA.an} F22 bolts with MS21042L${CNA.an} nuts and AN960 washers; 2 × AN${CNA.pin} F28 pins; torque per AC 43.13-1B table 7-1.`,
  interfaces: [
    { id: 'I1', with: 'LEZ-53-160 F22 bulkhead', feature: 'attach', what: 'Bolt count and size the F22 bearing check uses', check: () => ({ ok: FIXED.canardAttach.nb === CNA.nb && FIXED.canardAttach.an === CNA.an, detail: `${CNA.nb} × AN${CNA.an} a side in both records` }) },
    { id: 'I2', with: 'LEZ-55-192 elevators', feature: 'outline', what: 'Cove at the hinge line', check: () => ({ ok: G.elevator[1] < G.semi, detail: `cove BL ${fx(G.elevator[0] * 12, 1)}–${fx(G.elevator[1] * 12, 1)}` }) },
    { id: 'I3', with: 'LEZ-55-192 horn (rev B), LEZ-27-130 link (block C)', feature: 'relief', what: 'Every point of the horn root that comes within the 0.06 in gap of the canard over ±20° lies inside the lip relief', check: () => {
      const pin = CG.pin, d0 = Math.atan2(CL.hornE[2] - pin[1], CL.hornE[0] - pin[0]), poly = cnSegments().find((q) => CG.bl[0] / 12 >= q.a - 1e-9 && CG.bl[0] / 12 < q.b).regions.oml[0];
      const low = (x) => { const z = []; for (let k = 0; k < poly.length; k++) { const a = poly[k], b = poly[(k + 1) % poly.length]; if ((a[0] - x) * (b[0] - x) <= 0 && a[0] !== b[0]) z.push(a[1] + (x - a[0]) / (b[0] - a[0]) * (b[1] - a[1])); } return z.length ? Math.min(...z) : -Infinity; };
      let bad = null, n = 0; for (let th = -20; th <= 20; th += 2) for (let k = 0; k <= 30; k++) { const sd = 1.5 * k / 30, a = d0 + th * Math.PI / 180, x = pin[0] + sd * Math.cos(a), z = pin[1] + sd * Math.sin(a);
        if (x < CG.fs[1] && z > low(x) - 0.06) { n++; if (!(x >= CG.fs[0] && z <= CG.wl[1] && z >= CG.wl[0])) bad = [x, z, th]; } }
      return { ok: !bad, detail: bad ? `horn edge at FS ${fx(bad[0])}, WL ${fx(bad[1])} (${bad[2]}°) outside the relief` : `${n} horn-root points within the gap of the lip, all inside the relief FS ${CG.fs[0]}–${CG.fs[1]}, WL ${CG.wl[0]}–${CG.wl[1]}` }; } },
  ],
  tooling: { needed: true, text: 'Constant-chord CNC-mill templates with the cap troughs; the leveling jig; the F22 drill guide.' },
  sourcing: { blank: `${Math.ceil(ft2('UNI') / 12.5 * 1.15)} yd HTS40, ${Math.ceil(ft2('BID') / 12.5 * 1.15)} yd 6781 (50 in, +15 %); ${sheets()} sheets 3/4 in HT61`, vendor: PP_VENDOR.vendor, url: PP_VENDOR.url,
    cost: Math.ceil(ft2('UNI') / 12.5 * 1.15) * PRICE.UNI + Math.ceil(ft2('BID') / 12.5 * 1.15) * PRICE.BID + sheets() * PRICE.H45sheet + gal() * (PRICE.L285gal + 2 * PRICE.H287qt), costAsOf: '2026-11-17', perAircraft: 1, lead: 'Stock items', note: 'As the wing.' },
};
void cnStations; void BASE_MAT;

// memory-audit integration (2026-11-19): this record's new revision
import { memRev } from './revs_memaudit.js';
import { LAM_ALLOW, LAM_SPEC, LAM_FORM, LAM_CURE, ppBuy, PP_VENDOR, PP_PRICE } from './p_common.js';
memRev(CN_DEF);
