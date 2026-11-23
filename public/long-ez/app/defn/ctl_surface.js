// Control-surface definition records (LEZ-57-191 aileron, LEZ-55-192 elevator), built from one template. The solid is the
// parent airfoil from the hinge gap to the trailing edge, hinge face bevelled for travel, lofted in BL planes
// (cad/loft3d.py); the record's numbers come from WP19 (wp19_ctl.js). Inches; frame x = BL, y = FS, z = WL. Notional.
import { GEO, FIXED, BASE_MAT, MATSYS, DEFAULT_DESIGN, analyse, CTL, materials, effective } from '../structures.js';
import { PROCESS, buildPlyBook } from '../plybook.js';
import { bookMass } from '../systems.js';
import { CTLS, HINGE, ctlSection, ctlStations, ctlVolume, ctlParams, ctlShell, CTL_RHO, hingeLoad, padPlies } from '../parts/wp19_ctl.js';
import { want } from './util.js';
import { L as CL, LINK } from '../parts/wpC1_controls.js';
import { LAM_ALLOW, LAM_SPEC, LAM_FORM, LAM_CURE, ppBuy, PP_VENDOR, PP_PRICE } from './p_common.js';

const fx = (x, n = 2) => x.toFixed(n);
let BK = null; const books = () => (BK ||= buildPlyBook(analyse(DEFAULT_DESIGN, false)));
const PRICE = { BID: PP_PRICE.fab, XPS: +(PP_PRICE.coreFt2Qtr * 48).toFixed(2), H45sheet: +(PP_PRICE.coreFt2Qtr * 8 * 3).toFixed(2), L285gal: 0, H287qt: 0, hinge: 38.50 };

export function makeCtl(id, T) {
  const C = CTLS[id], book = () => books()[id], [a0, b0] = CTL[id].span(), st = ctlStations(id), a = st[0], b = st.at(-1);
  const sh = () => ctlShell(book().plies), rho = CTL_RHO(book().core.mat);
  const massOf = (v) => Math.max(0, (v.OML ?? 0) - sh().in3) * rho + sh().lb;
  const bookMassEach = () => { const m = bookMass(book()); return (m.lam + m.core) / book().count; };
  const pts3 = () => { const P = ctlParams(id); return P.segs.flatMap((s) => [0, 1].flatMap((e) => s.regions.oml[e].map((q) => [s.O[e][0], q[0], q[1]]))); };
  const expect = (p, m) => { const q = pts3(), mx = (i) => Math.max(...q.map((x) => x[i])), mn = (i) => Math.min(...q.map((x) => x[i])), V = ctlVolume(id);
    return [want('Span, end to end (in)', mx(0) - mn(0), m.bbox[1] - m.bbox[0], 0.002), want('Hinge face to trailing edge, FS (in)', mx(1) - mn(1), m.bbox[3] - m.bbox[2], 0.002),
      want('Depth, WL (in)', mx(2) - mn(2), m.bbox[5] - m.bbox[4], 0.002), want('Outer mould line volume (in³)', V, m.volumes?.OML ?? NaN, Math.max(0.01, V * 0.002)), want('Segments lofted', p.n, m.segments ?? NaN, 0)]; };
  const s0 = ctlSection(id, a), s1 = ctlSection(id, b), d = effective(DEFAULT_DESIGN), M = materials(d), nP = padPlies(id, M, d.FS), hl = hingeLoad(id, d);
  const ft2 = (mat) => book().plies.filter((p) => p.mat === mat).reduce((s, p) => s + p.area * (p.plies || 1), 0);
  const lamLb = () => book().plies.reduce((s, p) => s + p.weight, 0), gal = () => lamLb() * (1 - PROCESS.fibreWeightFraction) / 1.4 / 10 * 1.3, bidYd = () => Math.ceil(ft2('BID') / 12.5 * 1.15);
  const coreBuy = T.core === 'XPS' ? { text: 'HT61 from the wing blocks\' offcuts', cost: 0 } : { text: '1 sheet 3/4 in HT61 (2 × 4 ft)', cost: PRICE.H45sheet };
  const def = {
    pn: C.pn, rev: T.hornB ? 'B' : 'A', status: 'released', nha: T.nha, qty: 2, kind: 'laminate', title: T.title,
    solidText: 'CadQuery solid lofted in BL planes from the parent airfoil, hinge gap to trailing edge, hinge face bevelled for travel',
    templates: `T1–T2 (${T.core === 'XPS' ? 'Styrofoam' : 'PVC'} core, inboard and outboard ends)`,
    revs: [{ rev: 'A', date: '2026-11-17', short: 'Initial definition', change: `Initial definition. The surface was the parent's aft ${Math.round(CTL[id].cf() * 100)} % with no gaps, hinges or horn, a hinge-moment coefficient and skin taken as ASSUMED, and a core volume overstated by the book's thickness rule. As defined: ${C.gap} in hinge gap and end gaps, the hinge face bevelled ${fx(s0.bev, 2)} in for ±${C.travel()}° travel, an ${HINGE.std} continuous hinge on the ${C.hinge > 0 ? 'upper' : 'lower'} skin, a 6061-T6 horn on a ${nP}-ply BID pad; the core volume comes from the true sections. C_h and the hinge line's C_N are carried as bounds.` }, ...(T.hornB ? [{ rev: 'B', date: '2026-11-18', short: 'Horn rod-end hole', change: T.hornB() }] : [])],
    effectivity: 'Left and right (mirror images); the right surface is drawn',
    params: ctlParams(id),
    datums: [{ id: 'A', what: `Hinge line: the pin axis on the ${C.hinge > 0 ? 'upper' : 'lower'} skin at the parent's ${Math.round((1 - CTL[id].cf()) * 100)} % chord` }, { id: 'B', what: `Inboard end face, BL ${fx(a * 12, 1)}` }, { id: 'C', what: 'Parent chord plane' }],
    features: [
      { id: 'outline', kind: 'profile', label: `BL ${fx(a * 12, 1)} to ${fx(b * 12, 1)} (${fx((b - a) * 12, 1)} in), chord ${fx(s0.chord, 2)} → ${fx(s1.chord, 2)} in at the hinge side; the parent's airfoil aft of the hinge line; ${C.gap} in hinge gap, ${C.endGap} in end gaps`, tol: 'Contour ±1/32 in to the templates' },
      { id: 'bevel', kind: 'profile', label: `Hinge face bevelled: the ${C.hinge > 0 ? 'lower' : 'upper'} corner set back ${fx(s0.bev, 2)} → ${fx(s1.bev, 2)} in so ±${C.travel()}° clears the cove by ${C.gap} in`, tol: '±0.03 in' },
      { id: 'skin', kind: 'layup', label: `Skins ${FIXED.ctl.skinBID} × 6781 ±45 each side, wrapped 1 in onto the hinge-face web (${FIXED.ctl.hingeWebBID} × 6781); hinge doubler 2 × 6781 over the forward 35 %; horn pad ${nP} × 6781 at the inboard end`, tol: 'Overlaps ≥ 1 in' },
      { id: 'hinge', kind: 'hinge', label: `${HINGE.std} continuous hinge, ${fx(hl.L, 1)} in, leaf floxed and laid up under 1 × 6781 on the ${C.hinge > 0 ? 'upper' : 'lower'} skin; the other leaf on the parent's cove`, tol: 'Pin straight within 0.03 in over the length', assy: true },
      { id: 'horn', kind: 'hole', label: `Horn: 6061-T6 ${C.horn.t} × ${C.horn.w} in plate, arm ${C.horn.arm} in, 2 × AN${C.horn.bolt} through the pad at the inboard end${T.hornHole ? `; ${T.hornHole()}` : ''}`, tol: 'Holes +0.003 / −0.000; rod-end hole ±0.010 from datum A', assy: true },
    ],
    tolerances: { general: '.X ±0.06  ·  .XX ±0.03  ·  contour ±1/32', flatness: 'Trailing edge straight within 1/16 in; no twist relative to the parent', holes: 'Horn bolts drilled through the horn', breakEdges: 'Sand cut laminate edges smooth; seal with resin' },
    drawingNotes: [`Ply IDs: ${T.pre}-US/LS skins, ${T.pre}-W hinge-face web, ${T.pre}-UDH/LDH hinge doublers, ${T.pre}-HP horn pad.`, 'Right surface shown; left opposite.', 'Static balance per the build step before installation.'],
    generalNote: 'Cured laminate tap-tested; edges sealed.', na: {},
    material: { spec: `6781 S2-glass, MTM45-1 prepreg (NCAMP), ${T.core === 'XPS' ? 'Divinycell HT61' : 'Divinycell HT61'} core; ${HINGE.std} hinge; 6061-T6 horn`, alt: 'None: the cloth styles and foam set the ply thickness and allowables', form: `${LAM_FORM()}`, density: null,
      allowables: [...LAM_ALLOW(false), ['6061-T6 sheet F_ty', '35 ksi', 'MMPDS A-basis']] },
    process: [
      { op: 'Core', spec: 'CNC-mill to the two templates; sand the hinge-face bevel to the template line.' },
      { op: 'Layup', spec: 'Hinge-face web, horn pad; skins and hinge doublers each side in turn, cure between; cure on the M cycle (250 ± 10 °F, 4–6 h, no post-cure).' },
      { op: 'Hinge', spec: `${HINGE.std} leaf floxed to the skin at the hinge line, 1 × 6781 over it; pin in, surface hung in the cove with ${C.gap} in shims.` },
      { op: 'Horn', spec: `Drill the two AN${C.horn.bolt} holes through horn and pad; MS21042L${C.horn.bolt} nuts, AN960 washers.` },
      { op: 'Inspect', spec: `Full travel ±${C.travel()}° without contact; static balance; weight within ±5 %.` },
    ],
    checks: [`${id}-torsion`, `${id}-hinge`, `${id}-horn`],
    rules: [
      { id: 'gap', label: 'Hinge gap ≥ 0.06 in', v: C.gap, min: 0.06 },
      { id: 'travel', label: `Bevel clears the cove at ±${C.travel()}° (setback / needed)`, v: Math.min(s0.bev / (s0.depth * Math.tan(C.travel() * Math.PI / 180)), s1.bev / (s1.depth * Math.tan(C.travel() * Math.PI / 180))), min: 1 },
      { id: 'eD', label: 'Horn bolt edge distance e/D ≥ 2 (0.5 in from the plate edge)', v: 0.5 / (C.horn.bolt / 16), min: 2 },
      { id: 'leaf', label: 'Hinge leaf bond inside the hinge doubler (in)', v: 0.35 * s0.chord - HINGE.leafBond, min: 0.5 },
    ],
    hardware: [{ std: `${HINGE.std}-7200`, qty: 1, desc: `Continuous hinge, cut to ${fx(hl.L, 1)} in` }, { std: `AN${C.horn.bolt}-5A`, qty: 2, desc: 'Horn bolts through the pad' }, { std: `MS21042L${C.horn.bolt}`, qty: 2, desc: 'Nuts' }, { std: `AN960-${C.horn.bolt === 3 ? 10 : 416}`, qty: 4, desc: 'Washers, under head and nut' }],
    hardwareNote: `${HINGE.std} hinge (${fx(hl.L, 1)} in), 2 × AN${C.horn.bolt}-5A horn bolts with MS21042L${C.horn.bolt} nuts and AN960 washers; torque 20–25 in-lb (AC 43.13-1B table 7-1). The rod end is on ${T.rodPN}.`,
    interfaces: [
      { id: 'I1', with: `${T.parentPN} cove`, feature: 'outline', what: 'Hinge face off the cove face by the gap; ends inside the cove by the end gap',
        check: () => { const ok = Math.abs((a - a0) * 12 - (C.endGapLo ?? C.endGap)) < 1e-3 && Math.abs((b0 - b) * 12 - (C.endGapHi ?? C.endGap)) < 1e-3; return { ok, detail: `cove BL ${fx(a0 * 12, 1)}–${fx(b0 * 12, 1)}, surface ${fx(a * 12, 2)}–${fx(b * 12, 2)}; hinge gap ${C.gap} in` }; } },
      { id: 'I2', with: `${T.rodPN} rod`, feature: 'horn', what: 'Horn sized for the delivered load (LEZ-27 linkage)',
        check: () => { if (!T.delivered) return { ok: C.rod > 0, detail: `horn sized for ${fx(C.rod, 1)} lb (${C.rodSrc})` }; const got = T.delivered(); return { ok: got <= C.rod * 1.01, detail: `delivered ${fx(got, 1)} lb ≤ design ${fx(C.rod, 1)} lb (${C.rodSrc})` }; } },
      ...(T.linkCheck ? [{ id: 'I3', with: `${T.rodPN} link and the parent's cove`, feature: 'horn', what: 'Rod-end hole where the link ends; cove relief', check: T.linkCheck }] : []),
    ],
    tooling: { needed: true, text: 'CNC-mill templates at both ends cut from the parent\'s aft contour with the bevel line; a glassing cradle; the parent\'s jig to hang the surface on its hinge.' },
    sourcing: { blank: `${bidYd()} yd 6781 (50 in, +15 %); ${coreBuy.text}; ${HINGE.std} 6 ft`, vendor: PP_VENDOR.vendor, url: PP_VENDOR.url,
      cost: bidYd() * PRICE.BID + coreBuy.cost + gal() * (PRICE.L285gal + 2 * PRICE.H287qt) + PRICE.hinge / 2, costAsOf: '2026-11-17', perAircraft: 2, lead: 'Stock items', note: `6781 $${PRICE.BID}/yd; hinge ~$${PRICE.hinge} per 6 ft (shared by both surfaces); resin as the wing.` },
  };
  def.mass = { each: massOf({ OML: ctlVolume(id) }), from: 'OML volume less the laminate × core density, plus the plies from the ply book; checked against the solid and the ply book' };
  return { def, massOf, bookMassEach, expect, params: () => ctlParams(id) };
}
const P3 = (p) => `FS ${fx(p[0], 2)}, BL ${fx(p[1], 2)}, WL ${fx(p[2], 2)}`;
export const AIL = makeCtl('aileron', { title: 'Aileron', nha: 'LEZ-57-110', core: 'XPS', pre: 'A', parentPN: 'LEZ-57-110 outer wing panel', rodPN: 'LEZ-27-142',
  hornHole: () => `rod-end hole Ø 0.1875 (AN3, axis ∥ the hinge) ${CTLS.aileron.horn.arm} in straight below the hinge pin and 0.30 in forward of the hinge face, at ${P3(CL.hornA)}; the wing's cove-end wall relieved 0.6 in fore-aft × 1.8 in deep at BL ${fx(CL.relA[0], 2)}–${fx(CL.relA[1], 2)} round the rod end`,
  hornB: () => 'Block C (flight controls) defines the horn\'s rod-end hole (it was not dimensioned) so link C of LEZ-27-142 can meet it square to the hinge: Ø 0.1875 straight below the pin, ' + CTLS.aileron.horn.arm + ' in, 0.30 in ahead of the hinge face, with a cove relief in the wing (LEZ-57-110) for the link end. Horn plate, pad and loads unchanged.',
  delivered: () => LINK.ailRod, linkCheck: () => { const v = [CL.K2c[0] - CL.hornA[0], CL.K2c[1] - CL.hornA[1]], n = Math.hypot(...v), c = (v[0] * CL.hingeA[0] + v[1] * CL.hingeA[1]) / n, arm = CL.pinA[2] - CL.hornA[2]; return { ok: Math.abs(c) < 0.01 && Math.abs(arm - CTLS.aileron.horn.arm) < 1e-6, detail: `hole ${P3(CL.hornA)}, ${fx(arm, 3)} in below the pin; link C square to the hinge (cos ${c.toExponential(1)})` }; } });
export const ELV = makeCtl('elevator', { title: 'Elevator', nha: 'LEZ-55-120', core: 'PVC', pre: 'E', parentPN: 'LEZ-55-120 canard', rodPN: 'LEZ-27-130',
  hornHole: () => `rod-end hole Ø 0.1875 (AN3, axis ∥ the hinge) ${CTLS.elevator.horn.arm} in from the hinge pin at 45° forward-down, at ${P3(CL.hornE)}, below the canard; the canard's cove lip relieved 0.30 in at BL 13.80–14.10 for the horn root`,
  hornB: () => 'Block C (flight controls) defines the horn\'s rod-end hole so the torque tube\'s parallelogram link (LEZ-27-130) works it square: Ø 0.1875, ' + CTLS.elevator.horn.arm + ' in from the pin at 45° forward-down, below the canard, with a 0.30 in relief in the canard\'s cove lip (LEZ-55-120) for the horn root. Horn plate, pad and loads unchanged.',
  delivered: () => LINK.hornE, linkCheck: () => { const r = Math.hypot(CL.hornE[0] - CL.pinE[0], CL.hornE[2] - CL.pinE[2]); return { ok: Math.abs(r - CTLS.elevator.horn.arm) < 1e-6, detail: `hole ${P3(CL.hornE)}, ${fx(r, 3)} in from the pin; link 1.30 in square to the horn` }; } });
