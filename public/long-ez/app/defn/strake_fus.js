// LEZ-57-150 strake-to-fuselage joint: the definition record (numbers from wpA7). The close-out wedge between the strake's
// root rib plane and the tapering fuselage side, lofted in FS planes by cad/loft3d.py (right side; left mirrored), with
// its wrap, tapes, flox lines and fillets from their dimensions. Notional.
import { MATSYS } from '../structures.js';
import { PROCESS } from '../plybook.js';
import { STK, LAP } from '../parts/wp21_strake.js';
import { SFJ, SFJG, sfjParams, sfjVolume, sfjExtras, sfjMassOf, sfjSection } from '../parts/wpA7_sfj.js';
import { want } from './util.js';
import { PRICE } from './blkA_common.js';

const fx = (x, n = 2) => x.toFixed(n), G = SFJG;
export function sfjExpect(p, m) {
  const q = p.segs.flatMap((s) => [0, 1].flatMap((e) => s.regions.wedge[e].map((v) => [v[0], s.O[e][1], v[1]]))), mx = (i) => Math.max(...q.map((x) => x[i])), mn = (i) => Math.min(...q.map((x) => x[i])), V = sfjVolume();
  return [want('BL extent (in)', mx(0) - mn(0), m.bbox[1] - m.bbox[0], 0.002), want('FS extent (in)', mx(1) - mn(1), m.bbox[3] - m.bbox[2], 0.002), want('WL extent (in)', mx(2) - mn(2), m.bbox[5] - m.bbox[4], 0.002),
    want('Wedge volume (in³)', V, m.volumes?.OML ?? NaN, Math.max(0.01, V * 0.002)), want('Segments lofted', p.n, m.segments ?? NaN, 0)];
}
const X = sfjExtras(), V = sfjVolume(), gMax = Math.max(...G.gaps.map((g) => g.up)), bidFt2 = (X[0].a * SFJ.wrap + X[1].a * SFJ.tape.n) / 144 * 2;
export const SFJ_DEF = {
  pn: 'LEZ-57-150', rev: 'A', status: 'released', nha: 'LEZ-57-180', qty: 2, kind: 'laminate', title: 'Strake-to-fuselage joint (close-out wedge)',
  solidText: 'CadQuery solid: the HT61 close-out wedge lofted in FS planes between the strake root rib plane and the fuselage side', templates: `CNC-mill templates for the wedge at FS ${G.st.map((s) => fx(s, 1)).join(', ')}`,
  revs: [{ rev: 'A', date: '2026-11-18', short: 'Initial definition', change: `Initial definition. The joint was "flox, 2 BID tapes, micro fillet" with an assumed lift share and flox strength, and bond boxes on a fuselage side that is not where the strake's flat root rib is: the gap from the rib face (BL ${fx(STK.yR)}) to the side grows to ${fx(gMax)} in at the tank's aft wall (M-12). As defined: a PVC close-out wedge hot-wired to the gap at each station from FS ${fx(G.s0, 1)} to the tank wall (FS ${fx(STK.aft)}), floxed both faces, 2 BID wrap, 2 BID tapes top and bottom, micro fillets; join-strake-fus now uses the cavity's fuel (${fx(26.99 * 6, 0)} lb a side) and bounds; new check sfj-wedge.` }],
  effectivity: 'Left and right (mirror images); the right joint is drawn', params: sfjParams(),
  datums: [{ id: 'A', what: `The strake root rib face, BL ${fx(STK.yR)}` }, { id: 'B', what: `The tank's aft wall, FS ${fx(STK.aft)}` }, { id: 'C', what: 'The fuselage side (OML)' }],
  features: [
    { id: 'wedge', kind: 'profile', label: `HT61 (HT61) wedge from FS ${fx(G.s0, 1)} to ${fx(STK.aft)}: rib face at BL ${fx(STK.yR)} between the strake's skins (${fx(Math.min(...G.gaps.map((g) => g.H)), 1)}–${fx(Math.max(...G.gaps.map((g) => g.H)), 1)} in deep), inner face on the fuselage side; gap ${fx(Math.min(...G.gaps.map((g) => g.lo)), 2)}–${fx(gMax, 2)} in`, tol: '±1/32 in to the templates' },
    { id: 'wrap', kind: 'layup', label: `${SFJ.wrap} × 6781 ±45 wrap round the wedge; ${SFJ.tape.n} × 6781 tapes top and bottom, ${SFJ.tape.lap} in onto the strake skin and the side; ${SFJ.flox} in flox both faces; R ${SFJ.fillet} micro fillets`, tol: 'Laps ≥ 1 in' },
  ],
  tolerances: { general: '.XX ±0.03', flatness: 'Outside contour fair to the 3D model within 1/32 in', breakEdges: 'Feather the tapes 1:20' },
  drawingNotes: ['Right joint shown; left opposite.', 'The tank wall is the strake\'s root rib: the wedge is dry. Sump drains (block F) pass through it in sleeves.'], generalNote: 'Tap-tested.', na: {},
  material: { spec: '6781 S2-glass, MTM45-1 prepreg (NCAMP), Divinycell HT61, flox, micro', alt: 'None', form: `${LAM_FORM()}`, density: null, allowables: [...LAM_ALLOW(false), ['HT61 core shear', 'datasheet-typical', 'BOUND (sfj-wedge)']] },
  process: [{ op: 'Core', spec: 'CNC-mill the wedge in pieces to the station templates; dry-fit between the rib and the side.' }, { op: 'Bond', spec: 'Flox the wedge to the rib face and the side; wrap 2 × 6781; cure.' }, { op: 'Tape', spec: '2 × 6781 tapes top and bottom from the strake skins onto the side; micro fillets faired to the contour; cure (M cycle) with the strake.' }, { op: 'Inspect', spec: 'Tap test; contour to the templates.' }],
  checks: ['join-strake-fus', 'sfj-wedge'],
  rules: [{ id: 'end', label: 'Ends at the tank wall where the lap (LEZ-57-151) begins (in)', v: 0.01 - Math.abs(G.st.at(-1) - LAP.s0), min: 0 }, { id: 'gap', label: 'Closes the gap at every station (min rib-to-side span modelled, in)', v: Math.min(...G.st.map((s) => { const p = sfjSection(s); return p[0][0] - Math.max(...p.slice(2).map((q) => q[0])); })), min: SFJ.minGap - 1e-9 }],
  mass: { each: sfjMassOf({ OML: V }), from: `wedge ${fx(V, 1)} in³ × HT61 density, plus ${X.map((x) => x.what.toLowerCase()).join(', ')}; checked against the solid` },
  hardware: [], hardwareNote: 'None: bonded.',
  interfaces: [
    { id: 'I1', with: 'LEZ-57-180 strake root rib', feature: 'wedge', what: 'Rib face on the rib plane', check: () => ({ ok: G.st.every((s) => Math.abs(sfjSection(s)[0][0] - STK.yR) < 1e-9), detail: `rib face BL ${fx(STK.yR)}` }) },
    { id: 'I2', with: 'LEZ-53-150 fuselage side', feature: 'wedge', what: 'Inner face on the fuselage OML', check: () => ({ ok: G.gaps.every((g) => g.H > 0), detail: `gaps ${G.gaps.map((g) => `${fx(g.fs, 0)}: ${fx(g.lo)}/${fx(g.up)}`).join(', ')} (lower/upper skin)` }) },
    { id: 'I3', with: 'LEZ-57-151 strake lap', feature: 'wedge', what: 'Ends where the lap begins', check: () => ({ ok: Math.abs(G.st.at(-1) - LAP.s0) < 0.01, detail: `wedge ends FS ${fx(G.st.at(-1))}, lap from FS ${fx(LAP.s0)}` }) },
  ],
  tooling: { needed: true, text: 'CNC-mill templates at the loft stations; the strake rib templates locate the rib face.' },
  sourcing: { blank: `HT61 offcuts; ${fx(bidFt2, 1)} ft² 6781; flox and micro`, vendor: PP_VENDOR.vendor, url: PP_VENDOR.url, cost: +(Math.ceil(bidFt2 / 12.5 * 1.15) * PRICE.BID / 2 + 15).toFixed(2), costAsOf: '2026-11-18', perAircraft: 2, lead: 'Stock', note: 'Approximate; offcuts from the bulkhead sheets.' },
};

// Block F revision (site/defn/f_revs.js): fuel-system holes, inserts and conduits at assembly; solid unchanged
import { WEDGE_REV, WEDGE_FEAT, WEDGE_IF } from './f_revs.js';
import { LAM_ALLOW, LAM_SPEC, LAM_FORM, LAM_CURE, ppBuy, PP_VENDOR, PP_PRICE } from './p_common.js';
SFJ_DEF.rev = 'B'; SFJ_DEF.revs.push(WEDGE_REV); SFJ_DEF.features.push(WEDGE_FEAT()); SFJ_DEF.interfaces.push(WEDGE_IF());
