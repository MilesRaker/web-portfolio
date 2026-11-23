// LEZ-57-110 outer wing panel: the definition record and the geometry its solid is lofted from.
// The panel is cut into span segments at every cap drop-off, the root-joint breaks (plate end, filler end, pad ends),
// the aileron ends and at most 6 in apart. In each segment every region is a ruled loft between its two end sections
// (constant-BL planes): the outer mould line (less the aileron cove), the UNI caps over the joint and under the pad,
// the BID pad and filler, the LWA-plate pocket and the PVC spar block. Volumes here use the same ruled sections
// (Simpson on vertex-interpolated mid sections), so the CadQuery solid measures back exactly. Widths normal to the
// swept spar are divided by cos Λ in the BL plane. Inches; frame x = BL, y = FS (aft), z = WL (up). Notional.
import { GEO, FIXED, BASE_MAT, MATSYS, DEFAULT_DESIGN, analyse, surfaceGeom, wingSec } from '../structures.js';
import { PROCESS, buildPlyBook } from '../plybook.js';
import { bookMass } from '../systems.js';
import { WING_END, LWA, LUG, ATTACH, ATT, PLY_STEP } from '../parts/wp13_airframe_joints.js';
import { WROOT, COSL, wingStations, wingSegments, wingVolumes, wpParams, stackAt, section, sized, caps, W_BLK, W_BED, WRHO as rho, shellOf } from '../parts/wp17_wing_panel.js';
import { want } from './util.js';
import { RUD } from '../parts/wpC1_controls.js';
import { TIP, fairleadAt, TIP_FACE } from '../parts/wpA8_tip.js';
import { pickAN, TORQUE } from '../parts/wp16_wing_attach.js';
import { WCUTS } from '../parts/wp17_wing_panel.js';
import { cutVol } from '../parts/cuts.js';
import { CUTS_TXT, ACC, ACC_LB, WG, RT, wingClear, reliefClear, lapClear, aftClear, aftFill, AFT_RULE, SYSC } from '../parts/wpC8_cuts.js';
import { GMU, POCKET, OPENING, BRANCH, WEB_HOLE, lhClear, webHole } from '../parts/wpA9_lhwing.js';
import { partByPN as _pbp } from '../systems.js';
import { AFTC, AFT_TIP, aftAt } from '../parts/wpJ0_layout.js';
import { L as CL } from '../parts/wpC1_controls.js';
const AN960_8 = { t: 0.063 };

const Y0 = GEO.wing.attachY, Y1 = GEO.wing.tipY, GM = surfaceGeom('wing'), tU = BASE_MAT.UNI.t, tB = BASE_MAT.BID.t, tS = FIXED.skinBID * tB;
// ------------------------------------------------------------------------------------------- mass
let BK = null; const book = () => (BK ||= buildPlyBook(analyse(DEFAULT_DESIGN, false)).wing);
/** laminate not in the solid's regions: skins, webs and the winglet-joint doubler (lb, one panel) */
const shellLb = () => shellOf(book().plies).lb, shellIn3 = () => shellOf(book().plies).in3;
export const wpMassOf = (v) => (v.UNI ?? 0) * rho.UNI + (v.BID ?? 0) * rho.BID + (v.PVC ?? 0) * rho.PVC
  + Math.max(0, (v.OML ?? 0) - (v.UNI ?? 0) - (v.BID ?? 0) - (v.PVC ?? 0) - (v.pocket ?? 0) - shellIn3()) * rho.XPS + shellLb() + ACC_LB().lb;   // rev C: ring doublers, covers, fasteners, K2 bracket
export const wpBookMass = () => { const m = bookMass(book()); return (m.lam + m.core) / book().count; };

export function wpExpect(p, m) {
  const V = wingVolumes(), mv = m.volumes || {}, out = [];
  out.push(want('Span, root face to tip (in)', (Y1 - Y0) * 12, m.bbox[1] - m.bbox[0], 0.002));
  for (const [k, lbl, tol] of [['OML', 'Outer mould line volume (in³)', 0.002], ['UNI', 'HTS40 cap volume (in³)', 0.002], ['BID', '6781 pad and filler volume (in³)', 0.002], ['PVC', 'HT61 spar block volume (in³)', 0.003], ['pocket', 'LWA-plate pockets (in³)', 0.003]])
    out.push(want(lbl, V[k], mv[k] ?? NaN, Math.max(0.01, V[k] * tol)));
  out.push(want('Segments lofted', p.n, m.segments ?? NaN, 0));
  const mc = m.cuts || [];
  for (const c of WCUTS) { const q = mc.find((x) => x.id === c.id), v = cutVol(c); out.push(want(`Cut ${c.id} (${c.feat}) volume (in³)`, v, q ? q.vol : NaN, Math.max(0.01, v * 0.003))); }
  out.push(want('Cuts inside the caps, pads, block or pockets (in³)', 0, mc.reduce((s, x) => s + (x.hit || 0), 0), 0.005));
  return out;
}

// ------------------------------------------------------------------------------------------- record
const V = wingVolumes(), P = wpParams(), fx = (x, n = 2) => x.toFixed(n), J = WING_END, U = WROOT;
const dropU = caps('upper').filter((y) => y < Y1 - 1e-6), dropL = caps('lower').filter((y) => y < Y1 - 1e-6);
const tipN = (side) => caps(side).filter((y) => y >= Y1 - 1e-6).length;
const stag = (a) => Math.min(...a.slice(1).map((y, i) => (y - a[i]) * 12));
export const WP_BLOCKS = [Y0, Y0 + (Y1 - Y0) / 3, Y0 + 2 * (Y1 - Y0) / 3, Y1];   // hot-wire core blocks: break stations (ft BL)
/** a hot-wire template outline at BL y: the core section (OML less the skins) with both cap troughs and the spar-block slot */
export function coreTemplate(y) {
  const segs = wingSegments(), s = segs.find((q) => y >= q.ya - 1e-9 && y <= q.yb + 1e-9) || segs.at(-1);
  const R = section(Math.min(Math.max(y, s.ya), s.yb), { ...s, xe: s.xe });
  const st = { upper: stackAt('upper', (y - Y0) * 12, s.n.upper), lower: stackAt('lower', (y - Y0) * 12, s.n.lower) };
  return { y, oml: R.oml, block: R.block, cap_upper: R.cap_upper, cap_lower: R.cap_lower, troughU: st.upper.D, troughL: st.lower.D, xe: s.xe, c: wingSec(y).c * 12 };
}
/** the LWA bolts: one AN8 per station through the whole root depth (OML to OML at the spar line) */
const ROOT_BOLTS = WROOT.bolts.map((u) => { const y = Y0 + u / 12, c = wingSec(y).c * 12, depth = GM.sec(y).h; const b = pickAN(8, depth + 2 * AN960_8.t); return { ...b, depth }; });
const PRICE = { UNI: PP_PRICE.cf, BID: PP_PRICE.fab, XPS: +(PP_PRICE.coreFt2Qtr * 48).toFixed(2) /* HT61 per ft³, proxy */, foam34: +(PP_PRICE.coreFt2Qtr * 8 * 3).toFixed(2), L285gal: 0, H287qt: 0 };
const yd = (in3, t) => in3 / t / 144 / 12.5 * 1.15;
const shellBID = () => book().plies.filter((p) => ['skin', 'web', 'doubler'].includes(p.region) && p.mat === 'BID').reduce((a, p) => a + p.area * (p.plies || 1), 0);   // ft²
const cloth = () => ({ UNI: Math.ceil(yd(V.UNI, tU)), BID: Math.ceil(yd(V.BID, tB) + shellBID() / 12.5 * 1.15) });
const resinGal = () => ((V.UNI * rho.UNI + V.BID * rho.BID + shellLb()) * (1 - PROCESS.fibreWeightFraction)) / 1.4 / 10 * 1.3;

/** least distance (in) between the axes of the aft conduit and C's systems conduit across the panel (BL 45 → tip) */
const aftSep = () => { const sw = SYSC.wing, aw = [...AFTC.wing, AFT_TIP()], pt = (P, bl) => { for (let i = 1; i < P.length; i++) if (bl <= P[i][1] + 1e-9) { const a = P[i - 1], b = P[i], t = (bl - a[1]) / (b[1] - a[1]); return a.map((v, k) => v + (b[k] - v) * t); } return P.at(-1); };
  const sd = (p, a, b) => { const ab = b.map((v, i) => v - a[i]), t = Math.max(0, Math.min(1, p.reduce((s_, v, i) => s_ + (v - a[i]) * ab[i], 0) / ab.reduce((s_, v) => s_ + v * v, 0))); return Math.hypot(...p.map((v, i) => v - a[i] - t * ab[i])); };
  let m = Infinity; for (let bl = 45; bl <= Y1 * 12; bl += 0.25) { const p = pt(aw, bl); for (let i = 1; i < sw.length; i++) m = Math.min(m, sd(p, sw[i - 1], sw[i])); } return m; };
void aftAt;
export const WP_DEF = {
  pn: 'LEZ-57-110', rev: 'F', status: 'released', nha: 'LEZ-000 (aircraft)', qty: 2, kind: 'laminate',
  title: 'Outer wing panel',
  solidText: 'CadQuery solid lofted by span segment: outer mould line, caps, pads and fillers, LWA-plate pockets, HT61 spar block',
  templates: 'T1–T4 (three core blocks)',
  revs: [{ rev: 'A', date: '2026-11-17', short: 'Initial definition', change: `Initial definition. The root joint did not fit as modelled (a 37-ply cap over a 5/8 in LWA plate ${fx(ATTACH.depth, 3)} in inside the skin): the caps now split around each plate as the CS spar's do around its clevis tails, ${J.upper.nTop} / ${J.lower.nTop} UNI over it (upper / lower), a quasi-isotropic BID pad under it (${J.upper.nPad} / ${J.lower.nPad} plies, ${fx(WING_END.bPad, 1)} in wide), a BID filler outboard of the plate end and the upper cap's other ${J.upper.nUnder} plies under the pad. Laminate shear-out moved the plate's bolts ${fx(WING_END.bolt1 - 1)} in outboard (LWA rev D). The old attach doublers and the wing-bearing check are retired.` },
    { rev: 'B', date: '2026-11-17', short: 'Caps sized for the winglet moment', change: `The wing was not checked in the yaw cases, so nothing carried the winglet's root moment out of the tip. It is now a tip moment on the wing at its 1 g share in the rudder and lateral-gust cases (both wings), and the caps run ${tipN('upper')} upper / ${tipN('lower')} lower UNI to the tip (were 3 / 3). The winglet (LEZ-57-130) now stands outboard of the tip face and its straps land on these caps.` },
    { rev: 'C', date: '2026-11-19', short: 'Control tunnels, K2 bay, openings, cove-end relief', change: `Block C's aileron chain and rudder conduit run through the panel (ICD c_controls §8); the panel had no openings for them. Added: ${CUTS_TXT.wing().tunnels}; ${CUTS_TXT.wing().bay}; ${CUTS_TXT.wing().access}; ${CUTS_TXT.wing().relief}. New check wing-access (openings in the lower skin under the wing torque, the K2 bracket bolts); every cut clears the caps, pads and spar block by ≥ 0.1 in. Mass +${fx(ACC_LB().lb, 2)} lb (doublers, covers, fasteners, bracket), core less the cuts.` }, { rev: 'D', date: '2026-11-18', short: 'Rudder-cable fairlead', change: `A lined fairlead hole Ø ${TIP.fair} through the tip close-out for block C's rudder cable (LEZ-27-151). No change to the laminate or the solid.` },
    { rev: 'E', date: '2026-11-19', short: 'Aft systems conduit', change: `Miles's decision (option A, "swap lanes"): the systems conduit keeps block I's wingtip light harness alone; J's COM coax (right) and GMU 11 harness (left) get their own conduit. Added: ${CUTS_TXT.wingAft()}. Checks: the new tunnel clears the caps, pads, spar block and skins by ≥ 0.1 in (rule cuts), every other cut by ≥ ${AFT_RULE} in (rule aft), the light harness by the 2 in power|rf rule unmodified (clash audit), and the bore holds the cable at ≤ 40 % fill (rule fill); the BNC is crimped at the root after the pull, in the jut-out's aft root bay (LEZ-57-116 rev C). Core less the tunnel; the conduit tube is in LEZ-20-100.` },

    { rev: 'F', date: '2026-11-19', short: 'Left panel: GMU 11 pocket, branch, web grommet; light-harness side ports', change: `Final integration (block A's open items from option A and C's LEZ-33-110 O1). Left panel only (the part is drawn right-hand; these are left-hand features, not in the solid): the GMU 11 pocket in the forward core FS ${POCKET.fs.join('–')}, BL ${POCKET.bl.join('…')}, WL ${POCKET.wl.join('–')} with a ${fx(OPENING.fs[1] - OPENING.fs[0])} × ${fx(OPENING.bl[1] - OPENING.bl[0])} in lower-skin cover opening (2-ply ring doubler, cover on ${OPENING.screws} nutplates, non-magnetic screws; in wing-access); the lined branch tunnel Ø ${2 * BRANCH.r} from the aft conduit's side port at BL −86 under C's systems conduit to the spar web and the pocket wall; the spar-web grommet hole Ø ${WEB_HOLE.d} at BL −97…−101 with ${WEB_HOLE.plies}-ply patches. Both panels: the lined side port in the systems conduit's wall at its last bend (FS 190.50, BL ±145.80) where the light harness leaves for the light. Rules lh-cuts, lh-cut-sep, lh-top, web-edge, web-hole; interfaces I7–I9. The pocket core removal and the cover hardware (≈ 0.1 lb on the left panel) are carried in LEZ-20-100's lines; the right-hand solid and its mass are unchanged.` }],
  effectivity: 'Left and right panels (mirror images); the right panel is drawn; the left panel adds the GMU 11 pocket, branch and web grommet (features marked LH)',
  params: P,
  datums: [
    { id: 'A', what: 'Root face, BL 45.0 (the joint plane with the strake end rib)' },
    { id: 'B', what: 'Spar line: the chord-wise station 30 % of chord, root to tip' },
    { id: 'C', what: 'Wing reference plane (the jig board), WL 36.6' },
  ],
  features: [
    { id: 'fairlead', kind: 'hole', label: `Rev C: lined fairlead hole Ø ${TIP.fair} (${TIP.liner}) through the tip close-out for the rudder cable (LEZ-27-151, block C), FS ${fairleadAt(TIP_FACE())[0].toFixed(2)}, WL ${fairleadAt(TIP_FACE())[2].toFixed(2)}; C's fairlead point FS ${RUD.T[0]}, BL ±${RUD.T[1]}, WL ${RUD.T[2]}`, tol: '±0.06 in', assy: true },
    { id: 'outline', kind: 'profile', label: `Panel BL ${fx(Y0 * 12, 1)} to ${fx(Y1 * 12, 1)}, chord ${fx(wingSec(Y0).c * 12, 1)} to ${fx(wingSec(Y1).c * 12, 1)} in, LE sweep ${GEO.wing.sweepLE}°, ${Math.round(GEO.wing.tc * 100)} % thick; aileron cove BL ${fx(GEO.wing.aileron[0] * 12, 1)}–${fx(GEO.wing.aileron[1] * 12, 1)} at ${Math.round((1 - GEO.wing.aileronCf) * 100)} % chord`, tol: 'Contour ±1/32 in to the templates' },
    { id: 'cap', kind: 'layup', label: `Caps on the spar line, ${fx(GM.sec(Y0).b, 1)} → ${fx(GM.sec(Y1).b, 1)} in wide: upper ${J.nU ?? sized().upper.length} × HTS40, lower ${sized().lower.length} × HTS40 at the root; plies drop shortest first, upper at BL ${dropU.map((y) => fx(y * 12, 1)).join(', ')}; lower at BL ${dropL.map((y) => fx(y * 12, 1)).join(', ')}; ${tipN('upper')} + ${tipN('lower')} run to the tip (sized for the winglet moment)`, tol: 'Ply ends ±0.25 in; stagger ≥ 1 in' },
    { id: 'hp', kind: 'layup', label: `Root joint (each cap): ${J.upper.nTop} / ${J.lower.nTop} × HTS40 over the LWA plate, 6781 pad ${J.upper.nPad} / ${J.lower.nPad} plies (0/90, ±45) ${fx(WING_END.bPad, 1)} in wide to BL ${fx((Y0 + U.upper.padEnd / 12) * 12, 1)} / ${fx((Y0 + U.lower.padEnd / 12) * 12, 1)}, 6781 filler ${J.upper.nFill} plies outboard of the plate end; upper cap plies 1–${J.upper.nUnder} under the pad; all ends step ${PLY_STEP} in per ply (1:10)`, tol: 'Ply ends ±0.10 in' },
    { id: 'skin', kind: 'layup', label: `Skins ${FIXED.skinBID} × 6781 ±45 each side, 1 in LE overlap, stop at the hinge line over the aileron; shear web ${sized().web} × 6781 on a ${W_BLK} in HT61 spar block; ${W_BED} in HT61 cap beds the caps' width under both caps (rev G); winglet-joint doubler 1 × 6781 at the tip`, tol: 'Overlaps ≥ 1 in' },
    { id: 'pocket', kind: 'pocket', label: `LWA-plate pockets (upper and lower) for LEZ-57-142: ${fx(J.upper.tail, 3)} in plate on 2 × ${J.upper.flox} in flox, root face to ${fx(U.plateEnd, 2)} in outboard`, tol: 'Plate on the jig pins' },
    { id: 'tunnel', kind: 'hole', label: CUTS_TXT.wing().tunnels, tol: 'CNC-milled before skinning to ±0.06; liners bonded with micro' },
    { id: 'bay', kind: 'pocket', label: CUTS_TXT.wing().bay, tol: 'Bay ±0.06; bracket holes drilled through the bracket' },
    { id: 'access', kind: 'hole', label: CUTS_TXT.wing().access, tol: 'Opening ±0.03; doubler 1 in all round' },
    { id: 'relief', kind: 'pocket', label: CUTS_TXT.wing().relief, tol: '±0.03; trim to the cove face at assembly' },
    { id: 'aft', kind: 'hole', label: `Rev E: ${CUTS_TXT.wingAft()}`, tol: 'CNC-milled before skinning to ±0.06; conduit bonded in with micro, ends flush with the root and tip faces; left panel: side port at BL 86 grommeted' },
    { id: 'lh-pocket', kind: 'pocket', label: `LH only (rev F): GMU 11 pocket in the forward core, FS ${POCKET.fs.join('–')}, BL ${POCKET.bl.join('…')}, WL ${POCKET.wl.join('–')} (the unit ${GMU.body.join(' × ')} in and its ${GMU.plate.slice(0, 2).join(' × ')} in plate + ${GMU.clr} in), floor on the lower skin; lower-skin cover opening FS ${OPENING.fs.join('–')}, BL −${OPENING.bl[0]}…−${OPENING.bl[1]}, 2 × 6781 ±45 ring doubler 1 in wide, 0.032 2024-T3 cover on ${OPENING.screws} K1000-08 nutplates, A286 / 316 CRES screws (non-magnetic at the magnetometer)`, tol: 'Pocket ±0.06; opening ±0.03; the unit levelled on its plate', lh: true },
    { id: 'lh-branch', kind: 'hole', label: `LH only (rev F): GMU 11 branch tunnel Ø ${2 * BRANCH.r} lined with ${BRANCH.liner}, from the aft conduit's grommeted side port (${BRANCH.pts[0].map((v) => fx(v)).join(', ')}) under C's systems conduit to BL −97 aft of the spar, through the spar web to BL −101, into the pocket wall at BL ${fx(BRANCH.pts.at(-1)[1])}; CNC-milled before skinning`, tol: '±0.06', lh: true },
    { id: 'lh-web', kind: 'hole', label: `LH only (rev F): spar-web grommet hole Ø ${WEB_HOLE.d} through the spar block and both webs on the branch line (BL −97 → −101, WL 37.20), ${WEB_HOLE.grommet} each web face, ${WEB_HOLE.plies} × 6781 ±45 patch ${WEB_HOLE.patch} in round the hole each face, the liner floxed through`, tol: 'Hole ±0.03; drilled before the webs are laid up', lh: true },
    { id: 'sysport', kind: 'hole', label: `Rev F, both panels: lined side port in the systems conduit's wall at its last bend (FS ${SYSC.wing.at(-2)[0]}, BL ±${SYSC.wing.at(-2)[1]}, WL ${SYSC.wing.at(-2)[2]}), MS35489-4 grommet (typed), where LEZ-33-110 leaves the conduit for the light in the tip close-out (C's LEZ-33-110 O1)`, tol: '±0.06' },
    { id: 'bolt', kind: 'hole', label: `LWA bolt holes 2 × 3, Ø 0.500 vertical through cap, plate and pad at ${U.bolts.map((b) => fx(b, 2)).join(', ')} in from A on B`, tol: '+0.003 / −0.000, drilled through the jig guides', assy: true },
  ],
  tolerances: { general: '.X ±0.06  ·  .XX ±0.03  ·  contour ±1/32  ·  ply ends ±0.25 (cap), ±0.10 (pad, filler)', flatness: 'Twist and incidence to the jig within 0.1°', holes: 'Drilled through the wing-attach jig guides', breakEdges: 'Sand cut laminate edges smooth; seal with resin' },
  drawingNotes: ['Ply IDs: W-LC/UC caps, W-PL/PU pads, W-FL/FU fillers, W-LS/US skins, W-W webs. Troughs routed to the stack depth.'],
  generalNote: 'Cured laminate tap-tested; edges sealed.',
  na: {},
  material: {
    spec: LAM_SPEC(true, 'glass tip caps (6781 0/90) outboard of the carbon end; copper LSP mesh strips over the caps (LEZ-51-100)'),
    alt: 'None: the cloth styles and foams set the ply thickness and the wrinkling allowables the sizing uses', form: `${LAM_FORM()}`, density: null,
    allowables: [...LAM_ALLOW(true)],
  },
  process: [
    { op: 'Core', spec: 'CNC-mill three blocks to the templates; bond with FM 300-2 on the cure fixture; HT61 spar block, web wrapped.' },
    { op: 'Layup', spec: 'Each side in turn, in the jig: rout the trough; under-plies (upper), pad, LWA plate floxed on the jig pins, filler, cap (all shortest first), skins.' },
    { op: 'Handling', spec: PROCESS.layup },
    { op: 'Cure', spec: `${PROCESS.cure}. ${PROCESS.postCure}.` },
    { op: 'Drill', spec: 'LWA bolt holes through the jig guides, wing pinned.' },
    { op: 'Inspect', spec: 'Tap test the root joint and every drop-off; weight within ±5 %; incidence on the jig.' },
  ],
  checks: ['wing-cap', 'wing-web', 'wing-webbuck', 'wing-torsion', 'wing-drop', 'wing-core', 'wing-lebond', 'wing-end-brg', 'wing-end-shearout', 'wing-end-net', 'wing-pad-lap', 'wing-end-cap', 'wing-div', 'wing-freq', 'wing-rev', 'wing-access'],
  rules: [
    { id: 'stagger-u', label: 'Upper cap drop stagger ≥ 1.0 in', v: stag(dropU), min: 1 },
    { id: 'stagger-l', label: 'Lower cap drop stagger ≥ 1.0 in', v: stag(dropL), min: 1 },
    { id: 'drop-clear', label: 'First drop-off ≥ 1 in outboard of the pad ramp (in)', v: (Math.min(dropU[0], dropL[0]) - Y0) * 12 - Math.max(U.upper.padEnd, U.lower.padEnd), min: 1 },
    { id: 'ramp', label: 'Pad and filler ramps ≤ 1:10 (run per rise)', v: PLY_STEP / tB, min: 10 - 1e-6 },
    { id: 'room', label: 'Cap and skin over the LWA plate fit the room (room / stack)', v: J.upper.room / (J.upper.nTop * tU + J.upper.wrap * tB), min: 1 },
    { id: 'eD', label: 'Laminate end distance at bolt 1, e/D ≥ 3', v: WING_END.bolt1 / J.upper.D, min: 3 },
    { id: 'cuts', label: 'Tunnels, bays and the disconnect void clear the caps, pads, spar block and the skins by ≥ 0.1 in', v: wingClear().d, min: 0.1 },
    { id: 'relief', label: 'Cove-end relief inside the skins by ≥ 0.25 in', v: reliefClear(), min: 0.25 },
    { id: 'lap', label: 'Disconnect opening clear of the jut-out caps\' lap on the skins (in)', v: lapClear(), min: 0.25 },
    { id: 'aft', label: `Rev E aft conduit ≥ ${AFT_RULE} in from every other cut (rod B, link C, K2 bay, disconnect void, rudder and systems conduits) in the panel and the jut-out (in)`, v: aftClear().d, min: AFT_RULE },
    { id: 'aft-sep', label: 'Rev E aft conduit axis from the systems conduit axis (light harness): 2 in power|rf + both runs\' radii (in)', v: aftSep(), min: 2.2 },
    { id: 'fill', label: 'Aft conduit bore fill by the cable (GMU harness 0.25 in, the larger) ≤ 40 % (40 % − fill, %)', v: 40 - 100 * aftFill(0.25), min: 0 },
    { id: 'lh-cuts', label: 'LH: GMU pocket and branch tunnel clear the caps, spar block (bar the grommet crossing) and skins by ≥ 0.1 in (in)', v: lhClear().struct.d, min: 0.1 },
    { id: 'lh-cut-sep', label: `LH: pocket and branch ≥ ${AFT_RULE} in from the panel's other cuts (the aft conduit excepted at the side port) (in)`, v: lhClear().cuts.d, min: AFT_RULE },
    { id: 'lh-top', label: 'LH: core left over the pocket, under the upper skin ≥ 0.25 in (in)', v: lhClear().top, min: 0.25 },
    { id: 'web-edge', label: 'LH: spar-web grommet hole edge to each cap ≥ 2 D (in / D)', v: webHole().edge / WEB_HOLE.d, min: 2 },
    { id: 'web-hole', label: 'LH: spar-web hole ≤ 1/4 of the clear web depth (DESIGN practice, typed) (0.25 − d/h)', v: 0.25 - webHole().ratio, min: 0 },
    { id: 'depth', label: 'Root stacks leave ≥ 1 in for the spar block (in)', v: GM.sec(Y0).h - 2 * tS - stackAt('upper', 0, sized().upper.length).D - stackAt('lower', 0, sized().lower.length).D - 2 * W_BED, min: 1 },
  ],
  mass: { each: wpMassOf({ ...V }), from: 'region volumes (HTS40 caps, 6781 pads and fillers, HT61 block, HT61 core) × densities, plus the skins and webs from the ply book; checked against the solid and against the ply book' },
  hardware: [...ROOT_BOLTS.map((b, i) => ({ std: b.std, qty: 1, desc: `LWA bolt ${i + 1}, vertical through both caps, both plates and pads on a 6061-T6 crush tube in the spar block; ${(b.depth).toFixed(2)} in through` })),
    { std: 'MS24693-C4', qty: 14, desc: 'Access-cover screws (K2 bay 10, disconnect 4)' }, { std: 'K1000-08 (MS21047-08)', qty: 14, desc: 'Nutplates in the ring doublers' }, { std: 'AN3-6A', qty: 4, desc: 'K2 bracket bolts through skin and doubler, with MS21042L3 nuts' },
    { std: '6061-T6 angle 1.5 × 1.5 × 1/8, 2.0 in', qty: 1, desc: 'K2 pivot bracket (LEZ-27-142 K2 on an AN4)' }, { std: 'Phenolic tube 3/4 OD, 0.030 wall', qty: 1, desc: 'Rod-B and link-C tunnel liners (ft, cut to length)' },
    { std: '6061-T6 tube 1/2 OD × 0.035 (Aircraft Spruce 03-35800)', qty: 1, desc: 'Aft systems conduit (ft, cut to length; mass in LEZ-20-100; integration 2026-11-19, was nylon: not a stock size)' }, { std: 'MS35489-10 grommet', qty: 1, desc: 'Left panel only: the GMU 11 harness side port at BL 86 (rev E)' },
    { std: 'MS35489-4 grommet', qty: 1, desc: 'Systems-conduit side port at the last bend, each panel (rev F; mass in LEZ-20-100)' }, { std: 'GMU 11 pocket cover 0.032 2024-T3, 10 × K1000-08 nutplates, 10 × NAS1352 316 CRES screws, 2-ply ring doubler', qty: 1, desc: 'Left panel only (rev F; mass in LEZ-20-100)' }, { std: `${WEB_HOLE.grommet}; phenolic liner 3/8 OD`, qty: 1, desc: 'Left panel only: branch tunnel liner and the spar-web grommets (rev F; mass in LEZ-20-100)' }],
  hardwareNote: `LWA-plate bolts (per panel): ${ROOT_BOLTS.map((b) => b.std).join(', ')}, each through upper and lower stacks on a 6061-T6 crush tube, MS21042L8 nut, AN960-816 washer under head and nut; torque ${TORQUE[8][0]}–${TORQUE[8][1]} in-lb (AC 43.13-1B table 7-1). Pins and the drag bolt are on LEZ-57-145; the drag angle is LEZ-57-144.`,
  interfaces: [
    { id: 'I7', with: 'LEZ-31-122 GMU 11 (block J), LH panel', feature: 'lh-pocket', what: 'The unit and its plate inside the pocket by ≥ 0.25 in, its plate above the floor; the unit passes through the cover opening', check: () => { const g = _pbp('LEZ-31-122')?.geo || [], P = g.map((q) => ({ lo: [q.c[0] - q.d[0] / 2, q.c[1] - q.d[1] / 2, q.c[2] - q.d[2] / 2].map((v) => v * 12), hi: [q.c[0] + q.d[0] / 2, q.c[1] + q.d[1] / 2, q.c[2] + q.d[2] / 2].map((v) => v * 12) }));
      const m = Math.min(...P.flatMap((q) => [q.lo[0] - POCKET.fs[0], POCKET.fs[1] - q.hi[0], q.lo[1] - POCKET.bl[0], POCKET.bl[1] - q.hi[1], POCKET.wl[1] - q.hi[2], q.lo[2] - POCKET.wl[0]])), thru = Math.min(...P.flatMap((q) => [q.lo[0] - OPENING.fs[0], OPENING.fs[1] - q.hi[0], Math.abs(q.hi[1]) - OPENING.bl[0], OPENING.bl[1] - Math.abs(q.lo[1])]));
      return { ok: P.length >= 1 && m >= 0.25 - 1e-6 && thru >= 0, detail: `${P.length} GMU 11 primitives ≥ ${fx(m)} in inside the pocket (above the floor WL ${POCKET.wl[0]}); ${fx(thru)} in inside the cover opening` }; } },
    { id: 'I8', with: 'LEZ-31-121 GMU 11 harness (block J), LH panel', feature: 'lh-branch', what: 'The harness from the side port to the pocket lies in the branch tunnel (offset + radius ≤ bore) and crosses the web at the grommet', check: () => { const R = (_pbp('LEZ-31-121')?.geo || []).find((q) => q.t === 'path'), P = R ? R.pts.map((q) => [q[0] * 12, q[1] * 12, q[2] * 12]) : [], seg = (p, a, b) => { const ab = a.map((v, k) => b[k] - v), L2 = ab.reduce((x, v) => x + v * v, 0), t = Math.max(0, Math.min(1, ab.reduce((x, v, k) => x + v * (p[k] - a[k]), 0) / (L2 || 1))); return Math.hypot(...p.map((v, k) => v - a[k] - ab[k] * t)); };
      const on = P.filter((q) => q[1] <= BRANCH.pts[0][1] + 1e-6 && q[1] >= BRANCH.pts.at(-1)[1] - 1e-6), w = Math.max(...on.map((q) => Math.min(...BRANCH.pts.slice(1).map((b, k) => seg(q, BRANCH.pts[k], b))))) + (R?.dIn || 0.25) / 2, h = webHole();
      return { ok: on.length >= 3 && w <= BRANCH.r + 1e-6 && h.at[1] <= -97 && h.at[1] >= -101, detail: `${on.length} harness vertices from BL −86 to the pocket, worst offset + radius ${fx(w, 3)} in (bore r ${BRANCH.r}); web crossing at BL ${fx(h.at[1])}, WL ${fx(h.zc)}: clear depth ${fx(h.depth)} in, edge ${fx(h.edge)} in` }; } },
    { id: 'I9', with: 'LEZ-33-110 wingtip light harness (block I), both panels', feature: 'sysport', what: 'The harness leaves the systems conduit at the side port (on the conduit axis at the last bend) and runs ≤ 6 in to the light, inside the tip', check: () => { const R = (_pbp('LEZ-33-110')?.geo || []).filter((q) => q.t === 'path'), port = SYSC.wing.at(-2), d = R.map((g) => { const P = g.pts.map((q) => [q[0] * 12, Math.abs(q[1] * 12), q[2] * 12]), k = P.findIndex((q) => Math.hypot(q[0] - port[0], q[1] - port[1], q[2] - port[2]) < 0.05); if (k < 0) return { k, L: Infinity }; let L = 0; for (let i = k + 1; i < P.length; i++) L += Math.hypot(...P[i].map((v, j) => v - P[i - 1][j])); return { k, L, end: P.at(-1) }; });
      return { ok: d.length === 2 && d.every((q) => q.k >= 0 && q.L <= 6 && q.end[1] <= GEO.wing.tipY * 12), detail: d.map((q, i) => `${i ? 'right' : 'left'}: leaves at the port, ${fx(q.L)} in to the light`).join('; ') }; } },
    { id: 'I6', with: 'LEZ-27-151 rudder cable fairlead (block C, merged)', feature: 'fairlead', what: 'C\'s fairlead inside the tip, ≤ 0.5 in from the close-out; the hole on the cable\'s line inside the tip section', check: () => { const f = fairleadAt(TIP_FACE()), s = wingSec(GEO.wing.tipY), x = (f[0] / 12 - s.le) / s.c, inb = TIP_FACE() - RUD.T[1];
      return { ok: inb >= 0 && inb <= 0.5 && x > 0.1 && x < 1 - GEO.wing.aileronCf, detail: `fairlead ${inb.toFixed(2)} in inboard of the tip face; hole at FS ${f[0].toFixed(2)}, WL ${f[2].toFixed(2)}, ${(x * 100).toFixed(0)} % of the tip chord` }; } },
    { id: 'I1', with: 'LEZ-57-142 LWA plates (upper and lower)', feature: 'pocket', what: 'Pocket depth and position match the plate; bolt stations match the plate holes',
      check: () => { const e = LWA.bolts[0] - LWA.uRoot, ok = Math.abs(e - WING_END.bolt1) < 1e-9 && Math.abs(J.upper.tail - ATT.plate) < 1e-9 && Math.abs(U.plateEnd - (LWA.u1 - LWA.uRoot)) < 1e-9; return { ok, detail: `plate ${ATT.plate} in to ${fx(U.plateEnd)} in from A; bolts at ${U.bolts.map((b) => fx(b)).join(', ')} in` }; } },
    { id: 'I2', with: 'LEZ-57-145 pins (CS spar clevis)', feature: 'pocket', what: 'Plate mid-plane at the pin depth from the skin',
      check: () => { const mid = tS + J.upper.nTop * tU + J.upper.flox + J.upper.tail / 2; return { ok: Math.abs(mid - ATTACH.depth) < 0.02, detail: `plate mid-plane ${fx(mid, 3)} in inside the OML; pin depth ${fx(ATTACH.depth, 3)} in` }; } },
    { id: 'I3', with: 'Strake end rib (LEZ-57-151/152) and the 0.15 in joint gap', feature: 'outline', what: 'Root face on BL 45 at the joint',
      check: () => ({ ok: Math.abs(Y0 - GEO.join.y) < 1e-9, detail: `root face BL ${fx(Y0 * 12, 1)}, joint BL ${fx(GEO.join.y * 12, 1)}` }) },
    { id: 'I5', with: 'CS spar (LEZ-57-140) and the clevis pins', feature: 'cap', what: 'The wing spar line at the root face lies on the CS spar centre line, over the LWA plates',
      check: () => { const s = wingSec(Y0), x = (s.le + GM.sec(Y0).xsp * s.c) * 12, cs = GEO.csSpar.s * 12; return { ok: Math.abs(x - cs) < 0.01 && Math.abs(ATTACH.pinU[0] * 12 - cs) < 1e-6, detail: `spar line FS ${x.toFixed(2)} at the root, CS spar centre line FS ${cs.toFixed(2)}, pins FS ${(ATTACH.pinU[0] * 12).toFixed(2)}` }; } },
    { id: 'I4', with: 'Aileron (LEZ-57-191) and the winglet (LEZ-57-130)', feature: 'outline', what: 'Cove at the hinge line; tip face for the winglet bond and straps',
      check: () => { const y = GEO.wing.aileron[0], c = wingSec(y).c * 12, xh = (1 - GEO.wing.aileronCf) * c, xj = GM.sec(y).xsp * c + WING_END.bPad / 2; return { ok: GEO.wing.aileron[1] < Y1 && xh - xj >= 1, detail: `cove BL ${fx(y * 12, 1)}–${fx(GEO.wing.aileron[1] * 12, 1)} at ${fx(xh, 1)} in chord, ${fx(xh - xj, 1)} in aft of the root pad's edge; tip at BL ${fx(Y1 * 12, 1)}` }; } },
    { id: 'I6', with: 'LEZ-27-142 aileron rods, LEZ-27-151 rudder conduit (block C)', feature: 'tunnel', what: 'Tunnels on the rod and conduit axes; the bay round K2 and its arms; the relief round the horn\'s rod end',
      check: () => { const on = (c, p, q) => Math.hypot(c.a[0] - p[1], c.a[1] - p[0], c.a[2] - p[2]) < 0.01 && Math.hypot(c.b[0] - q[1], c.b[1] - q[0], c.b[2] - q[2]) < 0.01, by = (id) => WCUTS.find((c) => c.id === id);
        const ok = Math.abs(by('rodB-1').a[1] - CL.K1b[0]) < 0.005 && Math.abs(by('rodB-2').b[1] - CL.K2d[0]) < 0.005 && Math.abs(by('rodB-1').a[2] - CL.WLA) < 0.005 && on(by('linkC'), CL.K2c, CL.hornA) && [CL.K2d, CL.Q2, CL.K2c].every((p) => WCUTS.some((c) => c.k === 'box' && c.id.startsWith('k2') && p[1] >= c.lo[0] && p[1] <= c.hi[0] && p[0] >= c.lo[1] && p[0] <= c.hi[1]));
        return { ok, detail: `${WCUTS.length} cuts; rod B on FS ${fx(by('rodB-1').a[1])}, WL ${fx(by('rodB-1').a[2], 1)}; link C ${fx(by('linkC').a[0], 2)} → ${fx(by('linkC').b[0], 2)} BL; K2 and both arm ends inside the bay; clearance to structure ${fx(wingClear().d, 3)} in` }; } },
  ],
  tooling: { needed: true, text: `CNC-mill templates for the three core blocks (BL ${WP_BLOCKS.map((y) => fx(y * 12, 1)).join(', ')}), each with the cap troughs and the spar-block slot to the stack depth there; a wing jig that holds the core at the set twist with root-face pins for the LWA plates and drill guides for their bolts.` },
  sourcing: {
    blank: `${cloth().UNI} yd HTS40, ${cloth().BID} yd 6781 (50 in, +15 %); HT61 for three blocks; 3/4 in HT61 sheet`,
    vendor: PP_VENDOR.vendor, url: PP_VENDOR.url,
    cost: cloth().UNI * PRICE.UNI + cloth().BID * PRICE.BID + PRICE.foam34 + resinGal() * (PRICE.L285gal + 2 * PRICE.H287qt), costAsOf: '2026-11-17', perAircraft: 2,
    lead: 'Stock items', note: `Prepreg $${PRICE.UNI}/yd HTS40, $${PRICE.BID}/yd 6781; HT61 3/4 in $${PRICE.foam34}; prepreg and HT61 at the public proxies (p_common PP_PRICE: by quote, BOUND); no resin to mix. Flox not priced.`,
  },
};
export const WP_RHO = rho;

// memory-audit integration (2026-11-19): this record's new revision
import { memRev } from './revs_memaudit.js';
import { LAM_ALLOW, LAM_SPEC, LAM_FORM, LAM_CURE, ppBuy, PP_VENDOR, PP_PRICE } from './p_common.js';
memRev(WP_DEF);
