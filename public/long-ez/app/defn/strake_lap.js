// LEZ-57-151 strake-to-CS spar lap: the strake's skins over the spar caps (3 BID, no core) and the tank aft-wall tapes.
// The solid is the two lap bands lofted in BL planes (cad/loft3d.py) from wp21's sections. Notional.
import { GEO, MATSYS } from '../structures.js';
import { PROCESS } from '../plybook.js';
import { STK, LAP, lapStations, lapVolumes, lapParams, lapExtras, lapMassOf } from '../parts/wp21_strake.js';
import { want } from './util.js';

const fx = (x, n = 2) => x.toFixed(n);
export function lapExpect(p, m) {
  const P = lapParams(), q = P.segs.flatMap((s) => [0, 1].flatMap((e) => Object.values(s.regions).flatMap((r) => r[e].map((v) => [s.O[e][0], v[0], v[1]])))), mx = (i) => Math.max(...q.map((x) => x[i])), mn = (i) => Math.min(...q.map((x) => x[i])), V = lapVolumes();
  return [want('Span, BL (in)', mx(0) - mn(0), m.bbox[1] - m.bbox[0], 0.002), want('Lap, tank wall to the spar aft face, FS (in)', mx(1) - mn(1), m.bbox[3] - m.bbox[2], 0.002), want('6781 lap volume (in³)', V.BID, (m.volumes || {}).BID ?? NaN, Math.max(0.01, V.BID * 0.003)), want('Segments lofted', p.n, m.segments ?? NaN, 0)];
}
const V = lapVolumes(), X = lapExtras();
export const LAP_DEF = {
  pn: 'LEZ-57-151', rev: 'A', status: 'released', nha: 'LEZ-57-180', qty: 2, kind: 'laminate',
  title: 'Strake-to-CS spar lap',
  solidText: 'CadQuery solid: the upper and lower lap bands over the spar caps, lofted in BL planes',
  templates: 'None: the bands follow the spar caps',
  revs: [{ rev: 'A', date: '2026-11-17', short: 'Initial definition', change: `Initial definition. The lap check rested on an unlisted 1800 psi flox allowable over a 1 in lap and an assumed mass (0.45 lb). The lap now runs the cap width (${fx(LAP.cap)} in) to the spar's aft face, flush there (the wing's jut-out stands off it), its bond allowable is a bound on the resin's interlaminar strength, the strake lift share is a bound, and the mass (${fx(lapMassOf(V), 3)} lb) comes from the solid and the plies outside it.` }],
  effectivity: 'Left and right', params: lapParams(),
  datums: [{ id: 'A', what: `Tank aft wall: the CS spar's forward face, FS ${fx(LAP.s0)}` }, { id: 'B', what: `The spar's aft face, FS ${fx(LAP.s1)}` }],
  features: [
    { id: 'lap', kind: 'layup', label: `${LAP.n} × 6781 ±45 upper and lower over the spar caps, BL ${fx(STK.yR)} to ${fx(STK.yE)}, ${fx(LAP.onto)} in onto the strake's outer skin forward of A to B (flush), on a flox bed`, tol: 'Ends ±0.25 in; no step at B > 1/32 in' },
    { id: 'tape', kind: 'layup', label: `Inside the tank: flox corner and ${LAP.tape.n} × 6781 × ${LAP.tape.w} in tape on each skin-to-aft-wall corner, fuel-resistant epoxy`, tol: 'Continuous, no pinholes' },
  ],
  tolerances: { general: '.XX ±0.03', breakEdges: 'Feather the lap ends 1:20' }, drawingNotes: ['Sand the spar caps to a dull finish without cutting into the 6781 0/90.'], generalNote: 'Tap-tested; tank side sealed.', na: {},
  material: { spec: '6781 S2-glass, MTM45-1 prepreg (NCAMP) (fuel-resistant inside the tank), flox', alt: 'None', form: `${LAM_FORM()}`, density: null,
    allowables: [...LAM_ALLOW(false)] },
  process: [{ op: 'Prepare', spec: 'Sand the caps; flox bed.' }, { op: 'Layup', spec: `${LAP.n} × 6781 ±45 each face, shortest first, peel ply; tapes inside the tank before the upper shell closes.` }, { op: 'Cure', spec: `${PROCESS.cure}. ${PROCESS.postCure}.` }, { op: 'Inspect', spec: 'Tap test; tank leak test with the strake (2 psi).' }],
  checks: ['join-strake-spar'],
  rules: [{ id: 'flush', label: 'Lap ends at the spar aft face (jut-out gap kept) (in)', v: GEO.join.gap * 12 - (LAP.s1 - GEO.firewall * 12), min: 0.15 }, { id: 'onto', label: 'Lap onto the strake skin ≥ 1 in', v: LAP.onto, min: 1 }],
  mass: { each: lapMassOf({ ...V }), from: 'lap band volume × 6781 density, plus the 1 in onto the strake skin and the tank tapes; checked against the solid' },
  hardware: [], hardwareNote: 'None: bonded.',
  interfaces: [
    { id: 'I1', with: 'LEZ-57-180 strake', feature: 'lap', what: 'Starts at the tank wall where the strake shell stops', check: () => ({ ok: Math.abs(LAP.s0 - STK.aft) < 1e-9, detail: `lap FS ${fx(LAP.s0)}, shell ends FS ${fx(STK.aft)}` }) },
    { id: 'I2', with: 'LEZ-57-140 CS spar', feature: 'lap', what: 'Covers the cap width', check: () => ({ ok: Math.abs(LAP.cap - GEO.csSpar.width * 12) < 1e-9, detail: `lap ${fx(LAP.cap)} in, spar ${fx(GEO.csSpar.width * 12)} in` }) },
  ],
  tooling: { needed: false, text: 'None beyond the strake\'s rib templates.' },
  sourcing: { blank: `6781 from the strake's roll (${fx((V.BID / 0.01 + X.reduce((a, l) => a + l.a, 0)) / 144, 1)} ft²)`, vendor: PP_VENDOR.vendor, url: PP_VENDOR.url, cost: 10.5 * Math.ceil((V.BID / 0.01 + X.reduce((a, l) => a + l.a, 0)) / 144 / 12.5 * 1.15), costAsOf: '2026-11-17', perAircraft: 2, lead: 'Stock', note: '6781 at $10.50/yd; resin with the strake.' },
};
void lapStations;

// memory-audit integration (2026-11-19): this record's new revision
import { memRev } from './revs_memaudit.js';
import { LAM_ALLOW, LAM_SPEC, LAM_FORM, LAM_CURE, ppBuy, PP_VENDOR, PP_PRICE } from './p_common.js';
memRev(LAP_DEF);
