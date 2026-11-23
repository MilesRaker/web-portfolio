// LEZ-57-130 winglet: the definition record and the geometry its solid is lofted from.
// The fin is two pieces on one PVC core: the upper winglet (h up from the wing chord plane, canted outboard) and the lower
// winglet below it. Each is cut into segments at the cap drop-offs, the rudder ends and at most 6 in apart; in each
// segment the outer mould line (less the rudder cove) and the two UNI cap bands are ruled lofts between constant-h section
// planes. Volumes here use the same ruled sections (Simpson on vertex-interpolated mid sections), so the CadQuery solid
// (cad/loft3d.py) measures back exactly. Inches; frame x = BL, y = FS (aft), z = WL (up), as the wing panel's. Notional.
import { GEO, FIXED, BASE_MAT, MATSYS, DEFAULT_DESIGN, analyse, surfaceGeom, wingSec, wingletSec } from '../structures.js';
import { PROCESS, buildPlyBook, FRAMES, afAt } from '../plybook.js';
import { bookMass } from '../systems.js';
import { WGL, wlSized, capsOf, finSegments, finVolumes, wlParams, wlShell, wlPoint, WL_RHO as rho } from '../parts/wp18_winglet.js';
import { want } from './util.js';
import { RUD } from '../parts/wpC1_controls.js';
import { TIP, fairleadAt, FIN_FACE, RSTOP } from '../parts/wpA8_tip.js';
import { DIPOLE } from '../parts/wpJ0_layout.js';
import { RHINGE, brackets, finNotch, hingePlies } from '../parts/wpAB_rudbal.js';
import { materials, effective } from '../structures.js';

const H = GEO.winglet.h, HL = GEO.wingletLow.h, Y1 = GEO.wing.tipY, GL = surfaceGeom('winglet'), GW = surfaceGeom('wing'), tU = BASE_MAT.GUD.t, tB = BASE_MAT.BID.t;
let BK = null; const book = () => (BK ||= buildPlyBook(analyse(DEFAULT_DESIGN, false)).winglet);
const sh = () => wlShell(book().plies);
export const wlMassOf = (v) => (v.UNI ?? 0) * rho.UNI + Math.max(0, (v.OML ?? 0) - (v.UNI ?? 0) - sh().in3) * rho.PVC + sh().lb;
export const wlBookMass = () => { const m = bookMass(book()); return (m.lam + m.core) / book().count; };
const PTS = () => { const P = wlParams(); return P.segs.flatMap((s) => [0, 1].flatMap((e) => s.regions.oml[e].map((q) => wlPoint(P, s, e, q)))); };
export function wlExpect(p, m) {
  const V = finVolumes(), mv = m.volumes || {}, pts = PTS(), mx = (i) => Math.max(...pts.map((q) => q[i])), mn = (i) => Math.min(...pts.map((q) => q[i]));
  return [want('Top of the fin, WL (in)', mx(2), m.bbox[5], 0.002), want('Bottom of the lower winglet, WL (in)', mn(2), m.bbox[4], 0.002), want('Inboard face at the root, BL (in)', mn(0), m.bbox[0], 0.002),
    want('Outer mould line volume (in³)', V.OML, mv.OML ?? NaN, Math.max(0.01, V.OML * 0.002)), want('6781 0/90 cap volume (in³)', V.UNI, mv.UNI ?? NaN, Math.max(0.01, V.UNI * 0.002)), want('Segments lofted', p.n, m.segments ?? NaN, 0)];
}

// block P: past the COM keep-out the wing's tip caps are glass (6781 0/90, GEO.wing.glassTip): the straps land on them
const WTIP = () => { const W = analyse(DEFAULT_DESIGN, false).Z.wing, T = W.tipG; return T ? { u: T.upper, l: T.lower, glass: true } : { u: W.upper.filter((p) => p.y1 >= Y1 - 1e-6).length, l: W.lower.filter((p) => p.y1 >= Y1 - 1e-6).length }; };
const V = finVolumes(), P = wlParams(), fx = (x, n = 2) => x.toFixed(n), Z = wlSized();
const drops = capsOf('upper').filter((h) => h < H - 1e-6), dropsL = capsOf('lower').filter((h) => h < H - 1e-6);
const stag = (a) => (a.length > 1 ? Math.min(...a.slice(1).map((y, i) => (y - a[i]) * 12)) : 99);
const inboardFace = (F, h) => { const s = F.sec(h); let m = 1e9; for (let i = 0; i <= 60; i++) { const x = i / 60; m = Math.min(m, F.pt(h, x, afAt(F, h, x).yl)[1]); } return m * 12; };
const gapAt = (F, h) => inboardFace(F, h) - Y1 * 12;
const PRICE = { UNI: PP_PRICE.fab, BID: PP_PRICE.fab, H45sheet: +(PP_PRICE.coreFt2Qtr * 8 * 3).toFixed(2), L285gal: 0, H287qt: 0 };
const yd = (ft2) => ft2 / 12.5 * 1.15;
const ft2Of = (mat) => book().plies.filter((p) => p.mat === mat).reduce((a, p) => a + p.area * (p.plies || 1), 0);
const cloth = () => ({ UNI: Math.ceil(yd(ft2Of('GUD'))), BID: Math.ceil(yd(ft2Of('BID'))) });
const lamLb = () => book().plies.reduce((a, p) => a + p.weight, 0);
const resinGal = () => lamLb() * (1 - PROCESS.fibreWeightFraction) / 1.4 / 10 * 1.3;
const sheets = () => Math.ceil((wlMassOf(V) - lamLb() + 1e-9) / rho.PVC / (24 * 48 * 0.75) * 1.4);   // 3/4 in H45, 2 × 4 ft, +40 % for the hot-wire blocks

export const WL_DEF = {
  pn: 'LEZ-57-130', rev: 'C', status: 'released', nha: 'LEZ-57-110', qty: 2, kind: 'laminate',
  title: 'Winglet (upper and lower)',
  solidText: 'CadQuery solid lofted by segment in constant-h planes: upper and lower winglet outer mould lines, both 6781 0/90 caps',
  templates: 'T1–T3 (upper root, upper tip, lower)',
  revs: [{ rev: 'A', date: '2026-11-17', short: 'Initial definition', change: `Initial definition. The joint to the wing was a single 4 × 3 in bond with assumed numbers, and the fin sat 1.5 in into the wing tip. As defined the fin stands outboard of the tip face on a ${WGL.gap} in flox line (cant ${GEO.winglet.cant}° keeps the published span), the lower winglet's root chord grows to the tip chord so the fin root covers the face, and the root moment reaches the wing through ${WGL.nS}-ply UNI straps in both inside corners; root caps and a ${WGL.nW}-ply fin-root web carry it between them. The wing is now sized for the winglet's root moment in the yaw cases: its caps run ${WTIP().u} / ${WTIP().l} plies to the tip (LEZ-57-110 rev B).` },
    { rev: 'B', date: '2026-11-18', short: 'Rudder-cable pulley hard point and fairlead', change: `Block C routes the rudder cable through the wing tip to a pulley in the fin and aft to the rudder horn (LEZ-55-193): a hard point for C's ${TIP.pulley} bracket (${TIP.inserts} flox-potted NAS1832C3 inserts, check tip-pulley) and a lined fairlead hole through the inboard root skin. No change to the laminate or the solid.` },
    { rev: 'C', date: '2026-11-18', short: 'COM dipole provision (right winglet)', change: `Block J (ICD J-F4): the COM antenna is a sleeve dipole inside the right fin. Before the inboard skin closes, the right winglet gets a 0.10 × 0.6 in channel cut in the core at ${Math.round(DIPOLE.x * 100)} % chord from h ${DIPOLE.h0} to ${DIPOLE.h1} in for J's copper-foil element (LEZ-23-110) and a Ø 0.25 in coax channel from the tip close-out to the feed at h ${DIPOLE.hFeed} in, with the ferrite choke at h ${DIPOLE.choke.join('–')} in; both filled with micro over the parts. No metal in the fin within 4 in of the element apart from C's rudder cable and pulley. Laminate, caps and webs unchanged; the left winglet is unchanged. Separate from rev B (block A / C pulley and fairlead).` }],
  effectivity: 'Left and right (mirror images); the right winglet is drawn',
  params: P,
  datums: [
    { id: 'A', what: 'Wing chord plane at the tip, WL 36.6: the fin root, h = 0' },
    { id: 'B', what: 'Wing tip face, BL 149.4: the fin\'s inboard face stands off it by the bond line' },
    { id: 'C', what: 'Fin spar line, 30 % of the winglet chord' },
  ],
  features: [
    { id: 'dipole', kind: 'hole', label: `Rev C (right winglet only): core channel 0.10 × 0.6 in at ${Math.round(DIPOLE.x * 100)} % chord (lower end) slanting to ${Math.round(DIPOLE.xTop * 100)} % (top), h ${DIPOLE.h0}–${DIPOLE.h1} in, for block J's COM sleeve-dipole element (LEZ-23-110), and a Ø 0.25 in coax channel from the tip close-out to the feed at h ${DIPOLE.hFeed} in (ferrite choke h ${DIPOLE.choke.join('–')} in); laid in before the inboard skin, filled with micro`, tol: '±0.25 in on h, ±0.10 in on chord', assy: true },
    { id: 'pulley', kind: 'hole', label: `Rev B: rudder-cable pulley hard point (block C's ${TIP.pulley} at FS ${RUD.P[0].toFixed(2)}, BL ±${RUD.P[1].toFixed(2)}, WL ${RUD.P[2].toFixed(2)}): ${TIP.inserts} × NAS1832C3 inserts potted Ø ${TIP.pot} × ${TIP.embed} in in flox through the inboard skin into the core`, tol: '±0.03 in to the bracket', assy: true },
    { id: 'rudstop', kind: 'hole', label: `DC-005: rudder full-travel stop (LEZ-27-160): ${RSTOP.block} on the fin's lower hard point beside the horn, ${RSTOP.bolts} × AN3 into flox-potted NAS1832C3 inserts (Ø ${TIP.pot} × ${TIP.embed} in, as the pulley bracket; check rud-stop); shimmed at rigging`, tol: '±0.06 in; stop set at rigging', assy: true },
    { id: 'fairlead', kind: 'hole', label: `Rev B: lined fairlead hole Ø ${TIP.fair} (${TIP.liner}) through the inboard root skin where the cable crosses it, FS ${fairleadAt(FIN_FACE())[0].toFixed(2)}, WL ${fairleadAt(FIN_FACE())[2].toFixed(2)}`, tol: '±0.06 in', assy: true },
    ...(GEO.winglet.rudderBal ? (() => { const BR = brackets(), N = finNotch(), dd = effective(DEFAULT_DESIGN), PL = hingePlies(dd, materials(dd)); return [
      { id: 'shroud', kind: 'profile', label: `DC-005: over the rudder the skins end at lips on a concentric shroud (the rudder's nose-tip radius + ${GEO.winglet.gapIn} in) about the rudder's hinge axis at mid-depth; the shroud face closed with 2 × 6781 lapping 1 in onto the skins`, tol: 'Shroud radius +0.02 / −0.00 in to the template' },
      { id: 'hinge-brackets', kind: 'hole', label: `DC-005 rudder hinge brackets (machined 6061-T6, flox-bonded between the skins): three, at h ${BR.map((k) => fx(k.h * 12, 2)).join(' / ')} in; each a base block between the skins (room ${PL.map((p) => fx(p.baseV, 2)).join(' / ')} in) with a ${BR.map((k) => `${k.tongue.t} × ${k.tongue.w}`).join(' / ')} in tongue reaching ${BR.map((k) => fx(k.Lt, 2)).join(' / ')} in aft to the axis, 2 × lateral through-bolts ${RHINGE.pitch} in apart (${BR.map((k) => `AN${k.finBolt} + ${k.washerStd}`).join(' / ')}); hinge doublers ${PL.map((p) => p.nFin).join(' / ')} × 6781 ±45 each face (check fin-hinge)`, tol: 'Tongue bores on the axis within 0.010 in (drill jig from the rudder datum A)', assy: true },
      { id: 'notch', kind: 'cut', label: `DC-005: notch in the outboard lip for the rudder cable and horn: h ${fx(N.hRange[0], 2)}–${fx(N.hRange[1], 2)} in, FS ${fx(N.fs[0], 2)}–${fx(N.fs[1], 2)} (${fx(N.len, 2)} in) through the skin, swept clear of the horn, its fairing and the MS20667-6 fork end over 0–30° about the true hinge axis by 0.06 in; core relief channel from the pulley to the notch, ${fx(N.relief, 2)} in deep below the skin at most; edges closed with 2 × 6781. The rudder stop block sits clear of the notch on the fin's lower hard point (LEZ-27-160, located at rigging)`, tol: '±0.03 in' },
      { id: 'wiper', kind: 'bond', label: `DC-005 gap seal: ${RHINGE.wiper.mat} wiper strips ${RHINGE.wiper.w} in wide on both lips over the rudder span (not over the notch or the brackets), ${RHINGE.wiper.note}`, tol: 'Light contact over 0–30°, no binding' }]; })() : []),
    { id: 'outline', kind: 'profile', label: `Upper winglet h 0 to ${fx(H * 12, 1)} in, chord ${fx(GEO.winglet.cr * 12, 1)} → ${fx(GEO.winglet.ct * 12, 1)} in, LE sweep ${GEO.winglet.sweepLE}°, cant ${GEO.winglet.cant}° outboard, ${Math.round(GEO.winglet.tc * 100)} % thick; rudder cove h ${fx(GEO.winglet.rudder[0] * 12, 1)}–${fx(GEO.winglet.rudder[1] * 12, 1)} in at ${Math.round((1 - GEO.winglet.rudderCf) * 100)} % chord. Lower winglet ${fx(HL * 12, 1)} in, chord ${fx(GEO.wingletLow.c[0] * 12, 1)} → ${fx(GEO.wingletLow.c[1] * 12, 1)} in, trailing edge on the wing's`, tol: 'Contour ±1/32 in to the templates' },
    { id: 'cap', kind: 'layup', label: `Caps on the spar line, ${fx(GEO.winglet.cap[0], 2)} → ${fx(GEO.winglet.cap[1], 2)} in wide: ${Z.upper.length} × 6781 0/90 outboard, ${Z.lower.length} × 6781 0/90 inboard at the root; drops at h ${drops.map((y) => fx(y * 12, 1)).join(', ')} in; ${Z.upper.filter((p) => p.y1 >= H - 1e-6).length} + ${Z.lower.filter((p) => p.y1 >= H - 1e-6).length} run to the tip`, tol: 'Ply ends ±0.25 in; stagger ≥ 1 in' },
    { id: 'root', kind: 'layup', label: `Fin root: root caps ${WGL.nRoot} × 6781 0/90 × ${fx(WGL.bW, 2)} in each face from ${fx(WGL.hRoot * 12, 1)} in down the lower winglet, lapping ${WGL.Lc} in onto the caps; fin-root web ${WGL.nW} × 6781 ±45 (${WGL.nW - Z.web} over the ${Z.web}-ply web), ${fx(WGL.hRoot * 12, 1)} in below to ${fx(WGL.hTop * 12, 1)} in above the root`, tol: 'Ply ends ±0.25 in, steps 0.5 in' },
    { id: 'strap', kind: 'layup', label: `Straps (at assembly): ${WGL.nS} × 6781 0/90 × ${fx(WGL.b, 2)} in in each inside corner, FS ${fx(WGL.x0, 2)}–${fx(WGL.x1, 2)} in aft of the tip LE; legs ${WGL.Lv} in up the winglet (${WGL.LvL} in down the lower winglet), ${WGL.Lh} in along the wing skin, round a ${WGL.R} in flox fillet; upper over the wing's upper cap, lower over the lower cap`, tol: 'Ends ±0.25 in, steps 0.5 in', assy: true },
    { id: 'skin', kind: 'layup', label: `Skins ${FIXED.skinBID} × 6781 ±45 each face, 1 in LE overlap, stop at the hinge line over the rudder; shear web ${Z.web} × 6781 on the HT61 core`, tol: 'Overlaps ≥ 1 in' },
    { id: 'bond', kind: 'bond', label: `Bond to the wing tip face: flox, ${WGL.gap} in at the chord plane, opening to ${fx(gapAt(FRAMES.winglet, WGL.hU / 12), 2)} in at the upper skin with the cant`, tol: 'Flox wedge ≤ 3/8 in; no voids at the straps', assy: true },
  ],
  tolerances: { general: '.X ±0.06  ·  .XX ±0.03  ·  contour ±1/32  ·  ply ends ±0.25', flatness: 'Cant to the jig block within 0.25°; toe within 0.25°', holes: 'None', breakEdges: 'Sand cut laminate edges smooth; seal with resin' },
  drawingNotes: ['Ply IDs: L-UC/LC caps, L-US/LS skins, L-V lower-winglet skins, L-W webs, L-RC root caps, L-WR root-web doubler, L-SU/SL straps.', 'Right winglet shown; left opposite.'],
  generalNote: 'Cured laminate tap-tested; edges sealed. The rudder (LEZ-55-193) is a separate part.',
  na: {},
  material: {
    spec: LAM_SPEC(false, 'caps and straps 6781 laid 0/90 (no carbon: the COM dipole is in the right fin)'),
    alt: 'None: the cloth styles and foam set the ply thickness and the wrinkling allowables the sizing uses', form: `${LAM_FORM()}`, density: null,
    allowables: [...LAM_ALLOW(false)],
  },
  process: [
    { op: 'Core', spec: 'CNC-mill the upper block (root and tip templates) and the lower block; bond them with FM 300-2 on the cant block; rout the spar slot and wrap the web and root-web doubler.' },
    { op: 'Layup', spec: 'Inboard face, then outboard: rout the cap trough; root caps, caps (shortest first), skins. Bag and cure on the NCAMP M cycle (250 ± 10 °F, 4–6 h, ≥ 28 inHg; no post-cure), the part whole in the oven; witness coupon.' },
    { op: 'Bond', spec: `On the wing in its jig: fin on the cant block, ${WGL.gap} in shims at the chord plane, flox the root to the tip face; ${WGL.R} in flox fillets in both inside corners.` },
    { op: 'Straps', spec: `${WGL.nS} × 6781 0/90 each corner, shortest first, debulked; bag and cure (M cycle) with the wing, the panel in the oven.` },
    { op: 'Inspect', spec: 'Tap test the caps, root and straps; weight within ±5 %; cant and toe on the jig.' },
  ],
  checks: ['winglet-cap', 'winglet-web', 'winglet-webbuck', 'winglet-drop', 'winglet-core', 'winglet-strap', 'winglet-strapbond', 'winglet-corner', 'winglet-rootweb', 'tip-pulley', 'rud-stop', 'fin-hinge', 'bal-loft'],
  rules: [
    { id: 'stagger', label: 'Cap drop stagger ≥ 1.0 in', v: Math.min(stag(drops), stag(dropsL)), min: 1 },
    { id: 'strap-w', label: 'Strap covers the wing cap and the winglet cap, ≥ 0.25 in each side (in)', v: Math.min(WGL.cWing - WGL.bWing / 2 - WGL.x0, WGL.cW - WGL.bW / 2 - WGL.x0, WGL.x1 - WGL.cWing - WGL.bWing / 2, WGL.x1 - WGL.cW - WGL.bW / 2), min: 0.25 },
    { id: 'legs', label: 'Strap legs ≥ 2 in', v: Math.min(WGL.Lv, WGL.LvL, WGL.Lh), min: 2 },
    { id: 'lower-strap', label: 'Lower strap inside the lower winglet\'s chord at its leg end (in from LE)', v: WGL.x0 - (FRAMES.wingletLow.sec(WGL.hRoot).le - wingSec(Y1).le) * 12, min: 0.5 },
    { id: 'clear', label: 'Bond line at the wing lower skin ≥ 0.02 in (the lower winglet leans inboard)', v: gapAt(FRAMES.wingletLow, WGL.hL / 12), min: 0.02 },
    { id: 'gap', label: 'Flox wedge at the upper skin ≤ 3/8 in (room left, in)', v: 0.375 - gapAt(FRAMES.winglet, WGL.hU / 12), min: 0 },
  ],
  mass: { each: wlMassOf({ ...V }), from: 'region volumes (6781 0/90 caps, HT61 core) × densities, plus skins, webs, root caps and straps from the ply book; checked against the solid and against the ply book' },
  hardware: [{ std: 'NAS1832C3-4', qty: 4, desc: 'Potted inserts, per fin: 2 for the pulley bracket, 2 for the rudder stop block (DC-005)' },
    { std: 'Rudder hinge bracket, 6061-T6 (machined detail of this part)', qty: 3, desc: 'DC-005: base block with the tongue to the axis, at the bottom, middle and top of the rudder' },
    { std: 'AN4-16A', qty: 2, desc: 'Bottom bracket lateral through-bolts' }, { std: 'AN3-16A', qty: 4, desc: 'Mid and top bracket lateral through-bolts' },
    { std: 'AN970-4', qty: 4, desc: 'Large-area washers, bottom bracket' }, { std: 'AN970-3', qty: 8, desc: 'Large-area washers, mid and top brackets' }, { std: 'MS21042L4', qty: 2, desc: 'Nuts' }, { std: 'MS21042L3', qty: 4, desc: 'Nuts' },
    { std: 'PET film 0.010 in × 0.5 in', qty: 1, desc: 'Gap-seal wiper strips, both lips (about 8 ft per fin)' }],
  hardwareNote: 'The skins and caps are bonded. Inserts potted in flox for the pulley bracket (block C) and the rudder full-travel stop block (LEZ-27-160). DC-005: the rudder hangs on three tongue brackets in this fin (the clevises and hinge bolts are on LEZ-55-193); brackets flox-bonded between the skins and through-bolted with large-area washers on local doublers; PET wiper seals on the lips.',
  interfaces: [
    { id: 'I4', with: 'LEZ-27-151 rudder cable pulley and fairlead (block C, merged)', feature: 'pulley', what: 'C\'s pulley inside the fin, clear of the rudder cove and the root straps; the fairlead on the cable\'s line', check: () => { const h = (RUD.P[2] - GEO.wing.z * 12) / Math.cos(GEO.winglet.cant * Math.PI / 180), s = wingletSec(h / 12), xP = (RUD.P[0] / 12 - s.le) / s.c, f = fairleadAt(FIN_FACE());
      return { ok: xP > 0.1 && xP < 1 - GEO.winglet.rudderCf * (1 + (GEO.winglet.rudderBal || 0)) - 0.02 && h > 1.0 && Math.abs(f[1] - FIN_FACE()) < 1e-6, detail: `pulley at h ${h.toFixed(2)} in, ${(xP * 100).toFixed(0)} % chord (cove from ${Math.round((1 - GEO.winglet.rudderCf) * 100)} %); fairlead on the root face at FS ${f[0].toFixed(2)}, WL ${f[2].toFixed(2)}` }; } },
    { id: 'I1', with: 'LEZ-57-110 outer wing panel, tip face', feature: 'bond', what: 'Inboard face off the tip face by the bond line at the root; chords match',
      check: () => { const g = gapAt(FRAMES.winglet, 0); return { ok: Math.abs(g - WGL.gap) < 0.01 && Math.abs(GEO.winglet.cr - wingSec(Y1).c) < 1e-6, detail: `bond line ${fx(g, 3)} in at h 0; root chord ${fx(GEO.winglet.cr * 12, 1)} in, tip chord ${fx(wingSec(Y1).c * 12, 1)} in` }; } },
    { id: 'I2', with: 'LEZ-57-110 caps at the tip (sized for the winglet moment)', feature: 'strap', what: 'Both straps land on a cap that runs to the tip',
      check: () => { const { u, l } = WTIP(); return { ok: u >= 3 && l >= 3, detail: `wing caps at the tip: ${u} upper, ${l} lower ${WTIP().glass ? '6781 0/90 (glass tip caps)' : 'HTS40'}` }; } },
    { id: 'I3', with: 'LEZ-55-193 rudder', feature: 'outline', what: 'Cove at the hinge line, h 3.0 to 36.0 in',
      check: () => ({ ok: GEO.winglet.rudder[1] < H && GEO.winglet.rudder[0] > 0, detail: `cove h ${fx(GEO.winglet.rudder[0] * 12, 1)}–${fx(GEO.winglet.rudder[1] * 12, 1)} in at ${Math.round((1 - GEO.winglet.rudderCf) * 100)} % chord` }) },
  ],
  tooling: { needed: true, text: `CNC-mill templates for the upper winglet (root and tip) and the lower winglet, each with the cap trough; a cant block holding the fin at ${GEO.winglet.cant}° on the wing jig, with ${WGL.gap} in shims at the chord plane.` },
  sourcing: {
    blank: `${cloth().UNI} yd 6781 0/90, ${cloth().BID} yd 6781 (50 in, +15 %); ${sheets()} sheet(s) 3/4 in HT61 (2 × 4 ft)`,
    vendor: PP_VENDOR.vendor, url: PP_VENDOR.url,
    cost: cloth().UNI * PRICE.UNI + cloth().BID * PRICE.BID + sheets() * PRICE.H45sheet + resinGal() * (PRICE.L285gal + 2 * PRICE.H287qt), costAsOf: '2026-11-17', perAircraft: 2,
    lead: 'Stock items', note: `Prepreg $${PRICE.UNI}/yd 6781 0/90, $${PRICE.BID}/yd 6781; HT61 3/4 in $${PRICE.H45sheet} a sheet; prepreg and HT61 at the public proxies (p_common PP_PRICE: by quote, BOUND); no resin to mix. Flox not priced.`,
  },
};

// memory-audit integration (2026-11-19): this record's new revision
import { memRev } from './revs_memaudit.js';
import { LAM_ALLOW, LAM_SPEC, LAM_FORM, LAM_CURE, ppBuy, PP_VENDOR, PP_PRICE } from './p_common.js';
memRev(WL_DEF);
