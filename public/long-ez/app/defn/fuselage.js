// LEZ-53-150 fuselage shell: the definition record (numbers from wp26 and the ply book). The urethane sandwich on the
// model's super-ellipse contour from the nose-cone joint to the firewall, open over the cockpit. The solid is lofted in
// FS planes (cad/loft3d.py), each half of the ring as faces and core. Inches; x = BL, y = FS, z = WL. Notional.
import { GEO, FIXED, MATSYS, BASE_MAT, DEFAULT_DESIGN, analyse, fusAt, FUS_SHAPE } from '../structures.js';
import { PROCESS, buildPlyBook } from '../plybook.js';
import { bookMass, partByPN } from '../systems.js';
import { GM, FAIR } from '../parts/wpD1_gear.js';
import { EXIT } from '../parts/wpD2_brakes.js';
import { FUS, fusParams, fusVolumes, fusStations, FUS_RHO } from '../parts/wp26_fuselage.js';
import { F22G } from '../parts/wp25_f22.js';
import { want } from './util.js';
import { BAT, K1 } from '../parts/wpI0_layout.js';
import { NOSE_SLOT } from '../parts/wpE2_shell.js';
import { insideFus } from '../systems.js';

const fx = (x, n = 2) => x.toFixed(n), FZ = FIXED.fuselage;
let BK = null; const book = () => (BK ||= buildPlyBook(analyse(DEFAULT_DESIGN, false)).fuselage);
const lam = () => book().plies.reduce((a, p) => a + p.weight * (p.qty || 1), 0);
export const fusMassOf = (v) => Math.max(0, (v.core ?? 0) - lonIn3()) * FUS_RHO.PU + lam();
const lonIn3 = () => book().plies.filter((p) => p.region === 'longeron').reduce((a, p) => a + p.area * 144 * (p.qty || 1) * (p.plies || 1) * BASE_MAT.GUD.t, 0);
export const fusBookMass = () => { const m = bookMass(book()); return m.lam + m.core; };
export function fusExpect(p, m) {
  const V = fusVolumes(), mv = m.volumes || {}, st = fusStations(), wMax = Math.max(...st.map((s) => fusAt(s).w)) * 12;
  return [want('Length, FS (in)', (FUS.s1 - FUS.s0) * 12, m.bbox[3] - m.bbox[2], 0.002), want('Width, BL (in)', wMax, m.bbox[1] - m.bbox[0], 0.02),
    want('Core volume (in³)', V.core, mv.core ?? NaN, Math.max(0.05, V.core * 0.002)), want('Face volume (in³)', V.face, mv.face ?? NaN, Math.max(0.05, V.face * 0.002)), want('Segments lofted', p.n, m.segments ?? NaN, 0)];
}
const V = fusVolumes(), Z = analyse(DEFAULT_DESIGN, false).Z;
const PRICE = { UNI: PP_PRICE.fab, BID: PP_PRICE.fab, PUsheet: +(PP_PRICE.coreFt2Qtr * 16 * 1.5).toFixed(2) /* 2 × 8 ft HT61 3/8 in at the HP80 proxy (BOUND) */, L285gal: 0, H287qt: 0 };
const ft2 = (mat) => book().plies.filter((p) => p.mat === mat).reduce((a, p) => a + p.area * (p.qty || 1) * (p.plies || 1), 0);
const gal = () => lam() * (1 - PROCESS.fibreWeightFraction) / 1.4 / 10 * 1.3;
const sheets = () => Math.ceil(book().core.volume * 1728 / (24 * 96 * FZ.coreIn) * 1.3);
const ohw = (s) => (Math.min(FUS_SHAPE.canopyHalfW, fusAt(s).w / 2 - 0.02) - 0.03) * 12;
// rev E (block A ICD, block D open items -120 O1/O2, -312 O2): installation features on the belly for the merged main gear
const GEAR_S0 = GEO.gear.s * 12, POT = 0.25;   // flox potting: the core replaced round each base-bolt hole out to the angle flange + 0.25 in
const angles = () => (partByPN('LEZ-32-120')?.geo || []).filter((g) => g.t === 'box' && g.mat === '6061').map((g) => ({ fs: [(g.c[0] - g.d[0] / 2) * 12, (g.c[0] + g.d[0] / 2) * 12], bl: [(g.c[1] - g.d[1] / 2) * 12, (g.c[1] + g.d[1] / 2) * 12] }));
/** fairing-half nutplates (MS21047-L06), 3 per half: two along the outboard edge clear of the attach angles and the brake union, one aft near the centre line */
export const FAIR_NP = [-1, 1].flatMap((sg) => [[GEAR_S0 - FAIR.L / 2 + 0.75, sg * (FAIR.span - 0.6)], [GEAR_S0, sg * (FAIR.span - 0.6)], [GEAR_S0 + FAIR.L / 2 - 0.75, sg * 1.0]]);
/** the brake line's AN832-3D bulkhead union through the belly corner: hole Ø 0.391 (3/8-24 thread, typed from memory), flox potting Ø 1.0 */
export const BRK_UNION = { s: EXIT.s, y: EXIT.y, hole: 0.391, pot: 1.0 };
// rev J (final integration: block I's open items LEZ-24-110 O1, LEZ-24-120 O1): the battery vent's belly drain and the
// master contactor's wall pad, installation features drilled / bonded at assembly
/** battery vent drain: the vent tube's lower end on the shell's inner face (wpI1 sets it there), a Ø 0.31 hole for the
 *  1/4 in tube's bulkhead drain fitting, flox potting Ø 0.75 (core replaced) */
export const BATT_DRAIN = { at: BAT.vent[1], hole: 0.31, pot: 0.75 };
/** K1 wall pad: G-10 0.063 bonded to the left side wall's inner face under the contactor bracket, two NAS1832-3 inserts
 *  potted Ø 0.60 in flox through the sandwich at the bracket's AN3 holes (K1's axis ± 0.95 in) */
export const K1_PAD = { bl: K1.c[0] - K1.L / 2 - 0.063, fs: [K1.c[1] - 1.30, K1.c[1] + 1.30], wl: [K1.c[2] - 1.55, K1.c[2] + 1.55], t: 0.063, bed: 0.75, ins: [[K1.c[1], K1.c[2] - 0.95], [K1.c[1], K1.c[2] + 0.95]], pot: 0.60 };
const shellRoom = (bl, fs, wl) => { let lo = -2, hi = 6; for (let k = 0; k < 36; k++) { const m = (lo + hi) / 2; if (insideFus(fs / 12, bl / 12, wl / 12, m / 12)) lo = m; else hi = m; } return lo - FUS.t; };
const F22_AFT = GEO.F22 * 12 + 0.375 / 2 + 6 * 0.0101, F22_FWD = GEO.F22 * 12 - 0.375 / 2 - 6 * 0.0101, TAPE = 1.0;
const boxGap = (p, a) => Math.hypot(Math.max(a.fs[0] - p[0], 0, p[0] - a.fs[1]), Math.max(a.bl[0] - p[1], 0, p[1] - a.bl[1]));
export const FUS_DEF = {
  pn: 'LEZ-53-150', rev: 'J', status: 'released', nha: 'LEZ-000 (aircraft)', qty: 1, kind: 'laminate',
  title: 'Fuselage shell',
  solidText: 'CadQuery solid: faces and core lofted in FS planes, each half of the ring, open over the cockpit',
  templates: 'Side template (flat); bulkhead stations F22, F28, panel, seat and firewall as the jig; deck and nose contour templates',
  revs: [{ rev: 'A', date: '2026-11-18', short: 'Initial definition', change: `Initial definition. The shell's checks took the core thickness, the engine weight, thrust and bolt, the belt anchors and the flox as ASSUMED, and the engine attach as four bolts in the firewall — but this mount's lower legs go to the CS spar and only the upper pick-ups (LEZ-71-222) bolt through the firewall. As defined the firewall hard point is checked under those pick-ups' base bolts, which takes it from ${'21–23'} plies to ${Z.fwPlies}; the belt layout and insert are the design's and the flox a bound; the core is a design value. The core volume comes from the shell's sections (${fx(book().core.volume, 2)} ft³), not a thickness times an area.` }, { rev: 'B', date: '2026-11-18', short: 'Firewall hard point to LEZ-53-180', change: 'The firewall engine-mount hard point F-D3 is removed from the side panels: the pick-ups bolt through the firewall panel, which carries its own hard points and gussets (LEZ-53-180). No change to the shell solid.' }, { rev: 'C', date: '2026-11-18', short: 'Landing-brake opening', change: `Block C (flight controls): the belly opening for the landing brake LEZ-27-170, FS ${fx(FUS.cut.s0 * 12, 1)}–${fx(FUS.cut.s1 * 12, 1)}, BL ±${FUS.cut.hw}, with a ${FUS.cut.dblUNI}-ply UNI doubler ${FUS.cut.dblW} in wide along each edge (${FUS.cut.dblRun} in past each end); the bending section drops the belly inside the opening and counts the doublers (fus-bend). Also BID pads for the pedal cross-tube brackets, the landing-brake actuator's keel bracket and the elevator torque-tube bearings, and Ø 0.875 grommeted side holes for the torque tube at FS 26.84, WL 40.87.` }, { rev: 'D', date: '2026-11-18', short: 'Gear hard-point pads on the belly', change: 'Block D interface review (docs/icd/d_maingear.md D120-1): the main-gear pads F-D1, F-D4 and F-D5 were on the side panels (from BL ±10.4 up), but the LEZ-32-120 attach-angle flanges and their base bolts sit on the belly at BL ±7.4–8.7. The pads move to the belly, centred at BL ±' + (GEO.gear.padY * 12).toFixed(1) + ' (GEO.gear.padY), one pad per side (F-D1R/L, F-D4R/L, F-D5R/L); plies, sizes and mass unchanged.' }, { rev: 'E', date: '2026-11-18', short: 'Nose-gear slot and well opening (block E)', change: 'The belly is cut for the nose gear: the strut slot from FS 7.44 (NG-30 box) to FS 29.04 at the airframe model\'s half-width (1.14 → 2.26 in, slotHW) and the well/door opening from FS 29.04 to the panel at the well\'s inner faces (±2.28 in), so the well walls bond on a land and the doors close 1/8 in inside it. The opening is now open in the section checks (fus-bend, fus-shear, from F28 aft, through the belly-cut hook). The 15-ply hinge doubler F-I01 left this book: the hinge bears on the NG-30 plates\' own hard point (LEZ-32-201). The opening is cut at installation to the LEZ-32-220 template; the loft solid is still drawn uncut and the belly UNI pattern still runs through it (open item: split F-B either side of the slot when the shell solid carries the cut).' }, { rev: 'G', date: '2026-11-18', short: 'Nose slot to the channel walls', change: 'Interface check (block E): between F22 and the NB well the cut ran out to the slot table (2.08–2.26 in from FS 24 aft) while the strut channel LEZ-32-220 stands on the skin at ±2.04–2.07, so the channel walls stood over the hole and the belly was open beside them. The cut there is now the channel\'s inner faces (±2.04 in); the well opening and the slot forward of F22 are unchanged. fus-bend and fus-shear see the narrower cut. No change to the shell solid.' }, { rev: 'H', date: '2026-11-18', short: 'Main-gear installation features', change: `Block D's open items on the shell (LEZ-32-120 O1 / O2, LEZ-32-312 O2), as installation features drilled at assembly: flox potting under the four attach-angle flanges (8 × AN${GM.nb}), six MS21047-L06 fairing nutplates, and the two AN832-3D brake unions through the belly corner at FS ${BRK_UNION.s}, BL ±${BRK_UNION.y}. Checks I7–I9. No change to the laminate or the solid; the potting flox (≈ 0.05 lb) is carried with LEZ-32-120.` }, { rev: 'J', date: '2026-11-19', short: 'Battery vent drain, K1 wall pad', change: `Block I's open items on the shell (LEZ-24-110 O1, LEZ-24-120 O1), as installation features at assembly: the battery vent's belly drain hole Ø ${BATT_DRAIN.hole} at BL ${fx(BATT_DRAIN.at[0])}, FS ${fx(BATT_DRAIN.at[1])} (flox potting Ø ${BATT_DRAIN.pot}), and the master contactor's G-10 wall pad on the left side wall (BL ${fx(K1_PAD.bl)}, FS ${fx(K1_PAD.fs[0])}–${fx(K1_PAD.fs[1])}) with two potted NAS1832-3 inserts at WL ${K1_PAD.ins.map((q) => fx(q[1])).join(' / ')}. Checks I10–I11. No change to the laminate or the solid; the fitting, pad and inserts (≈ 0.05 lb) are LEZ-24-100 hardware lines.` }],
  effectivity: 'One per aircraft', params: fusParams(),
  datums: [{ id: 'A', what: 'Centre line, BL 0' }, { id: 'B', what: `Firewall station, FS ${fx(FUS.s1 * 12, 1)}` }, { id: 'C', what: 'Reference waterline, WL 0' }],
  effectivity: 'One per aircraft', params: fusParams(),
  datums: [{ id: 'A', what: 'Centre line, BL 0' }, { id: 'B', what: `Firewall station, FS ${fx(FUS.s1 * 12, 1)}` }, { id: 'C', what: 'Reference waterline, WL 0' }],
  features: [
    { id: 'slot', kind: 'profile', label: 'Nose-gear opening (rev E): strut slot FS 7.44–22 inside the NG-30 plates, half-width 1.14 → 2.00 in, then to FS 29.04 no wider than the strut channel inner faces (±2.04 in, rev F); well/door opening FS 29.04–40.44 at ±2.28 in; cut at installation to the LEZ-32-220 template, edges sealed with flox and 1 × 6781 onto the well walls', tol: '±1/32 in to the template' },
    { id: 'core', kind: 'profile', label: `Contour: super-ellipse sections (sides ^${fx(1 / FUS_SHAPE.side, 1)}, top ^${fx(1 / FUS_SHAPE.top, 1)}, belly ^${fx(1 / FUS_SHAPE.belly, 1)}) on the station table, FS ${fx(FUS.s0 * 12, 1)} to ${fx(FUS.s1 * 12, 1)}; cockpit open FS ${fx(FUS.C0 * 12, 1)}–${fx(FUS.C1 * 12, 1)} to ±${fx(ohw(6.5), 1)} in at the sills`, tol: 'Contour ±1/16 in to the templates' },
    { id: 'opening', kind: 'cutout', label: `Landing-brake opening FS ${fx(FUS.cut.s0 * 12, 1)}–${fx(FUS.cut.s1 * 12, 1)}, BL ±${FUS.cut.hw} (vertical edges), corners R 0.25; ${FUS.cut.dblUNI} × 6781 0/90 × ${FUS.cut.dblW} in edge doublers (F-D9) ${FUS.cut.dblRun} in past each end`, tol: 'Edges ±1/32 in; panel gap 0.06 in all round' },
    { id: 'ctl', kind: 'hole', label: 'Control interfaces: torque-tube side holes Ø 0.875 at FS 26.84, WL 40.87 (grommet); pads F-D10 for the pedal brackets (FS 37.4, BL ±10.8) and the actuator keel bracket (FS 52.4, BL 0); F-D11 under the torque-tube bearings', tol: 'Holes drilled at assembly on the tube', assy: true },
    { id: 'battdrain', kind: 'hole', label: `Rev J: battery vent drain Ø ${BATT_DRAIN.hole} through the belly at BL ${fx(BATT_DRAIN.at[0])}, FS ${fx(BATT_DRAIN.at[1])} for the 1/4 in tube's bulkhead drain fitting, flox potting Ø ${BATT_DRAIN.pot}`, tol: 'Drilled at assembly on the tube', assy: true },
    { id: 'k1pad', kind: 'hole', label: `Rev J: master contactor wall pad, G-10 ${K1_PAD.t} × ${fx(K1_PAD.fs[1] - K1_PAD.fs[0], 1)} × ${fx(K1_PAD.wl[1] - K1_PAD.wl[0], 1)} in bonded on a tapered flox bed (0–${K1_PAD.bed} in, the wall's tumblehome) to the left side wall at FS ${fx(K1_PAD.fs[0])}–${fx(K1_PAD.fs[1])}; 2 × NAS1832-3 inserts potted Ø ${K1_PAD.pot} at FS ${fx(K1_PAD.ins[0][0])}, WL ${K1_PAD.ins.map((q) => fx(q[1])).join(' / ')}`, tol: 'Inserts drilled through the bracket', assy: true },
    { id: 'face', kind: 'layup', label: `${FZ.faceBID} × 6781 ±45 each face on ${FZ.coreIn} in Divinycell HT61 (sides, belly, decks, nose); belly ${FZ.bottomUNI} × 6781 0/90 fore-aft inside; top longerons ${FZ.longeronPlies} × 6781 0/90 × ${FZ.longeronW} in in a routed recess; the firewall hard points are on LEZ-53-180`, tol: 'Belly skin laps ≥ 2 in onto the sides' },
  ],
  tolerances: { general: '.X ±0.06 · contour ±1/16 · ply ends ±0.25', flatness: 'Sides symmetric about the centre line within 1/16 in', breakEdges: 'Cut edges sealed' },
  drawingNotes: ['Ply IDs: see the ply book (F-I/O sides, F-T longerons, F-B belly, F-N/K decks, F-Q nose, F-D doublers).', 'Built on the bulkheads in the fuselage jig.'], generalNote: 'Cured laminate tap-tested.', na: {},
  material: { spec: LAM_SPEC(false, 'longerons and belly plies 6781 laid 0/90'), alt: 'Divinycell HT61 where a deck or the nose is carved', form: `${LAM_FORM()}`, density: null,
    allowables: [...LAM_ALLOW(false)] },
  process: book().steps.map((s) => ({ op: `Step ${s.step}`, spec: s.title })),
  checks: ['fus-bend', 'fus-shear', 'fus-engine', 'fus-belt'],
  rules: [{ id: 'fw', label: 'Firewall hard point within the pick-up\'s drawn grip (0.25 in)', v: 0.25 - Z.fwPlies * 0.01, min: 0 }, { id: 'sill', label: 'Cockpit opening inside the sides at every station (in)', v: Math.min(...fusStations().filter((s) => s > FUS.C0 && s < FUS.C1).map((s) => fusAt(s).w / 2 * 12 - FUS.t - ohw(s))), min: 0.25 }],
  mass: { each: fusMassOf({ ...V }), from: 'core from the solid less the longeron recesses × HT61 density, plus the ply book\'s laminate; checked against the solid and the ply book' },
  hardware: [], hardwareNote: 'None on the shell: inserts and fasteners belong to the parts that bolt to it.',
  interfaces: [
    { id: 'I7', with: 'LEZ-32-120 main-gear attach angles (block D, merged)', feature: 'gearpot', what: 'Flox potting under every attach-angle flange (2 base bolts each)', check: () => { const a = angles(); return { ok: a.length === 4 && a.every((q) => q.fs[1] - q.fs[0] >= 2 * GM.pb), detail: `${a.length} angle flanges potted (${2 * a.length} AN${GM.nb} holes), FS ${a.map((q) => `${q.fs[0].toFixed(1)}–${q.fs[1].toFixed(1)}`).filter((x, k, A) => A.indexOf(x) === k).join(', ')}` }; } },
    { id: 'I8', with: 'LEZ-32-120 fairing half (block D, merged)', feature: 'fairnp', what: 'Nutplates inside the fairing footprint by ≥ 0.4 in and ≥ 0.75 in from the attach angles and the brake union', check: () => { const a = angles(), m = Math.min(...FAIR_NP.map((q) => Math.min(...a.map((b) => boxGap(q, b)), Math.hypot(q[0] - BRK_UNION.s, Math.abs(q[1]) - BRK_UNION.y) - BRK_UNION.pot / 2))), inF = Math.min(...FAIR_NP.map((q) => Math.min(q[0] - (GEAR_S0 - FAIR.L / 2), GEAR_S0 + FAIR.L / 2 - q[0], FAIR.span - Math.abs(q[1]))));
      return { ok: FAIR_NP.length === 6 && m >= 0.75 && inF >= 0.4, detail: `6 nutplates; ${m.toFixed(2)} in from the angles / union, ${inF.toFixed(2)} in inside the fairing edge` }; } },
    { id: 'I9', with: 'LEZ-32-312 brake line (block D, merged)', feature: 'brkunion', what: 'The union hole is where the line leaves the shell, potted, clear of the attach angles', check: () => { const L = partByPN('LEZ-32-312'), ex = (L?.geo || []).filter((g) => g.pts).map((g) => g.pts.map((q) => [q[0] * 12, q[1] * 12])).map((P) => Math.min(...P.map((q) => Math.hypot(q[0] - BRK_UNION.s, Math.abs(q[1]) - BRK_UNION.y)))), a = angles(), clr = Math.min(...a.map((b) => boxGap([BRK_UNION.s, BRK_UNION.y], b))) - BRK_UNION.pot / 2;
      return { ok: ex.length === 2 && ex.every((d) => d <= 0.2) && clr >= 0.25, detail: `line within ${Math.max(...ex).toFixed(2)} in of the union centre (both sides); potting ${clr.toFixed(2)} in clear of the aft angle` }; } },
    { id: 'I10', with: 'LEZ-24-110 battery vent (block I)', feature: 'battdrain', what: 'The vent tube ends on the shell\'s inner face at the drain hole; hole and potting ≥ 0.5 in from the nose-gear slot and ≥ 0.5 in from F22\'s tape lands', check: () => { const p = BATT_DRAIN.at, room = shellRoom(p[0], p[1], p[2]), slot = Math.abs(p[0]) - NOSE_SLOT.hw(p[1] / 12) - BATT_DRAIN.pot / 2, f22 = F22_FWD - TAPE - (p[1] + BATT_DRAIN.pot / 2);
      return { ok: Math.abs(room) <= 0.05 && slot >= 0.5 && f22 >= 0.5, detail: `vent end ${fx(room, 3)} in from the inner face at BL ${fx(p[0])}, FS ${fx(p[1])}, WL ${fx(p[2])}; potting ${fx(slot)} in outboard of the nose slot, ${fx(f22)} in ahead of F22's forward tape` }; } },
    { id: 'I11', with: 'LEZ-24-120 master contactor bracket (block I)', feature: 'k1pad', what: 'Pad on the side wall\'s inner face under the bracket on a tapered flox bed (0–0.75 in, the wall\'s tumblehome); inserts at the bracket\'s AN3 holes, ≥ 0.5 in past F22\'s aft tape land, edge distance in the pad ≥ the potting radius + 0.25 in', check: () => { const P = K1_PAD, corners = P.fs.flatMap((f) => P.wl.map((w) => shellRoom(P.bl, f, w))), on = Math.min(...corners) >= -0.01 && Math.max(...corners) <= P.bed, holes = [-0.95, 0.95].map((dz) => [K1.c[1], K1.c[2] + dz]), match = holes.every((h, i) => Math.hypot(h[0] - P.ins[i][0], h[1] - P.ins[i][1]) < 0.01);
      const tape = Math.min(...P.ins.map((q) => q[0] - P.pot / 2)) - (F22_AFT + TAPE), edge = Math.min(...P.ins.flatMap((q) => [q[0] - P.fs[0], P.fs[1] - q[0], q[1] - P.wl[0], P.wl[1] - q[1]])) - P.pot / 2;
      return { ok: on && match && tape >= 0.5 && edge >= 0.25, detail: `pad corners ${corners.map((c) => fx(c)).join(' / ')} in from the inner face; inserts on the bracket holes ${match ? '(0.00 in)' : 'OFF'}; ${fx(tape)} in aft of F22's tape land; edge ${fx(edge)} in` }; } },
    { id: 'I1', with: 'LEZ-53-160 F22', feature: 'core', what: 'F22 is cut to the shell\'s inner contour', check: () => ({ ok: Math.abs(F22G.tsh - FUS.t) < 1e-9, detail: `shell ${fx(FUS.t, 3)} in, F22 offset ${fx(F22G.tsh, 3)} in` }) },
    { id: 'I2', with: 'LEZ-71-222 upper pick-ups', feature: 'face', what: 'Hard point sized for their base bolts', check: () => ({ ok: Z.fwPlies * 0.01 <= 0.25 + 1e-9, detail: `${Z.fwPlies} × 6781, ${fx(Z.fwPlies * 0.01, 3)} in` }) },
    { id: 'I4', with: 'LEZ-27-170 landing brake', feature: 'opening', what: 'Opening = panel + gap', check: () => ({ ok: true, detail: `opening FS ${fx(FUS.cut.s0 * 12, 1)}–${fx(FUS.cut.s1 * 12, 1)}, BL ±${FUS.cut.hw}; panel 0.06 in inside` }) },
    { id: 'I3', with: 'Canopy', feature: 'core', what: 'Opening at the canopy stations', check: () => ({ ok: FUS.C0 === GEO.canopy[0] && FUS.C1 === GEO.canopy[1], detail: `FS ${fx(FUS.C0 * 12, 1)}–${fx(FUS.C1 * 12, 1)}` }) },
  ],
  tooling: { needed: true, text: 'Fuselage jig with the bulkhead stations; flat side-layup table with the side template; deck and nose contour templates.' },
  sourcing: { blank: `${Math.ceil(ft2('BID') / 12.5 * 1.15)} yd 6781, ${Math.ceil(ft2('GUD') / 12.5 * 1.15)} yd 6781 0/90 (50 in, +15 %); ${sheets()} sheets 3/8 in Divinycell HT61 2 × 8 ft`, vendor: PP_VENDOR.vendor, url: PP_VENDOR.url,
    cost: Math.ceil(ft2('BID') / 12.5 * 1.15) * PRICE.BID + Math.ceil(ft2('GUD') / 12.5 * 1.15) * PRICE.UNI + sheets() * PRICE.PUsheet + gal() * (PRICE.L285gal + 2 * PRICE.H287qt), costAsOf: '2026-11-18', perAircraft: 1, lead: 'Stock items', note: 'Prices approximate.' },
};

// Block F revision (site/defn/f_revs.js): fuel-system holes, inserts and conduits at assembly; solid unchanged
import { SHELL_REV, SHELL_FEAT, SHELL_IF } from './f_revs.js';
FUS_DEF.rev = 'J'; FUS_DEF.revs.splice(FUS_DEF.revs.findIndex((r) => r.rev === 'G'), 0, SHELL_REV); FUS_DEF.features.push(SHELL_FEAT()); FUS_DEF.interfaces.push(SHELL_IF());

// memory-audit integration (2026-11-19): this record's new revision
import { memRev } from './revs_memaudit.js';
import { LAM_ALLOW, LAM_SPEC, LAM_FORM, LAM_CURE, ppBuy, PP_VENDOR, PP_PRICE } from './p_common.js';
memRev(FUS_DEF);
