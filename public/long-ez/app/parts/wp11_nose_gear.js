// WP11 — nose landing gear, detailed: NG-30 box, NG-6 hinge, NG-1 strut, fork and wheel, worm-drive retract with the NG-64
// crank and spring link, panel crank, NB wheel well and strut cover. Every moving part is articulated in the 3D view by the
// same kinematics the checks use (ng_layout.js). Notional, from public builder sources; not for construction.
//
// Public sources used (no plans or POH text was used; part names follow the builders' usage):
//  [DF] Brian DeFord, Cozy build log ch. 13 (deford.com): Brock retract mechanism, spring strut, strut pivot, brackets, nose-
//       wheel fork and crank; Featherlite nose cone, wheel well, strut cover; NG-30s carry the strut pivot and retract and
//       attach to F-22; crank rod with a single U-joint exits at the instrument panel.
//  [LP] "longezproject" blog, Nose and nose gear parts 2 and 9: NG-1L leg, NG-3 and NG-4 brackets, hinge-to-NG-3 hole
//       6.15 in as built vs 6.71 in nominal; F-22 notch raised to pull the leg in; wheel in the well ~0.030 in clear;
//       strut lies flush with the nose skin when retracted; retract geometry is what makes the wheel fit.
//  [EP] "A Long EZ Push" (longezpush.com) ch. 13: NG-1 strut is solid S-glass; NB nose-wheel cover meets the lower panel
//       centre strut beside the gear viewing window; NG-30 cover in the nose.
//  [FB] flyingbackward blog: NG-30 plates box the worm drive and NG-6 bearing block on 15-ply hard-points; NG-8 2 in
//       aluminium discs flank the hinge; NG-64 welded steel crank; spring-loaded link on a 5/16 in bolt.
//  [CZ] Canardzone forum threads: die spring in the retract link (≈1,094 lb rating quoted from Canard Pusher 25);
//       worm-drive crank replaced the original push-rod; over-centre down lock; electric nose lifts as an option.
//  [AS] Aircraft Spruce catalogue: Long-EZ nose-gear mounting plate 01-00838, NG9 insert 01-00809, Azusa 280/250-4
//       4-ply tyre 06-01287 and tube 06-01288.
import { GEO, registerChecks, mk, WEIGHT_CASES, aircraft } from '../structures.js';
import { defineParts, defineReqs, defineKeepouts, firstInsideOML, marchHeights, partByPN } from '../systems.js';
import { NG, KIN, F22, PANEL, DOOR, strutPt, axleAt, C_at, B_at, noseGearPose, camFrac, doorAxisZ, hornTip, d2r } from './ng_layout.js';
import { SIZING, MAT, AN_SHEAR, TGT, noseLoads, cross2, hingeMoment, linkForce, column, profAt, memberMargins } from './ng_sizing.js';
export { noseLoads };
const SZ = SIZING.pick, MS_ = SIZING.masses;

const S1 = (title, inspect) => ({ title, inspect });
const NGP = { massItem: 'nose', ata: 32, anim: 'nosegear' };
const FS_ = (d) => d.FS;
export const NG_SOURCES = ['DF', 'LP', 'EP', 'FB', 'CZ', 'AS'];

// ------------------------------------------------------------------------------------------- airframe sections
const _belly = new Map();
const BELLY_Z = marchHeights(1.8, 0.002, 4), BELLY_LO = BELLY_Z.slice(0, -1);   // z = 1.8, += 0.002 while < 4: the first inside (firstInsideOML; perf)
export function belly(s) { const k = Math.round(s * 200); if (!_belly.has(k)) { const i = firstInsideOML(k / 200, 0, BELLY_LO); _belly.set(k, i >= 0 ? BELLY_Z[i] : BELLY_Z.at(-1)); } return _belly.get(k); }

// NB wheel well: open-bottom shell between F-22 and the panel, ceiling contoured over the tyre and under the crank shaft;
// strut channel forward of it (F-22 to the well) and the NG-30 box forward of F-22. Mirrors airframe/build.py (NG_WELL).
export const WELL = { s0: 2.42, s1: PANEL - 0.005, halfW: 0.19, wall: 0.015,
  ceil: [[2.42, 3.05], [2.90, 3.05], [3.00, 3.02], [3.05, 3.004], [3.10, 2.983], [3.15, 2.957], [3.20, 2.925], [3.25, 2.875], [3.30, 2.80], [3.334, 2.70], [3.37, 2.63]],
  chan: { s0: F22, halfW: 0.17, top: 2.66 }, slot: { s0: NG.box[0], s1: PANEL - 0.005, halfW: 0.14 } };
// belly-slot half-width (edge on ring vertex 2 of the airframe model: airframe/build.py WELL_J)
const SLOT_HW = [[0.62, 0.095], [0.8, 0.11], [1.0, 0.127], [1.2, 0.144], [1.4, 0.151], [1.6, 0.158], [1.83, 0.167], [2.0, 0.173], [2.2, 0.18], [2.42, 0.188], [2.6, 0.191], [2.8, 0.195], [3.0, 0.199], [3.2, 0.203], [3.37, 0.206]];
export const slotHW = (s) => { const t = SLOT_HW; if (s <= t[0][0]) return t[0][1]; for (let i = 1; i < t.length; i++) if (s <= t[i][0]) return t[i - 1][1] + (t[i][1] - t[i - 1][1]) * (s - t[i - 1][0]) / (t[i][0] - t[i - 1][0]); return t.at(-1)[1]; };
export const ceilAt = (s) => { const c = WELL.ceil; if (s <= c[0][0]) return c[0][1]; for (let i = 1; i < c.length; i++) if (s <= c[i][0]) { const [a, za] = c[i - 1], [b, zb] = c[i]; return za + (zb - za) * (s - a) / (b - a); } return c.at(-1)[1]; };

// ------------------------------------------------------------------------------------------- geometry helpers (down pose)
const P0 = NG.phi0, IN = 1 / 12;
/** box along the strut at the down pose: u0..u1 down the strut, no off the aft face, tn fore-aft, w lateral (ft) */
const sbox = (u0, u1, no, tn, w, extra = {}) => ({ t: 'obox', c: strutPt(P0, (u0 + u1) / 2, no), d: [tn, w, u1 - u0], pitch: -P0, ...extra });
const scyl = (u0, u1, no, r, y0 = 0, y1 = 0, extra = {}) => ({ t: 'cyl', a: strutPt(P0, u0, no, y0), b: strutPt(P0, u1, no, y1), r, ...extra });
/** strut section at u (ft): [fore-aft, lateral], from the sizing iteration (ng_sizing.js) */
const secAt = (u) => { const q = profAt(SZ.strut, u); return [q.t * IN, q.b * IN]; };
const AX = axleAt(P0), TY = NG.tyreW, FY = SZ.FY, LEGH = SZ.leg.b / 24;   // fork-leg centres from the sizing envelope; LEGH half-width (ft)
// strut cover: fills the belly slot under the stowed strut (depth from the stowed strut's lower face to the skin)
/** quadrilateral section of a bar on the strut at u: n0..n1 off the aft face, ±w/2 laterally (down pose) */
const qsec = (u, n0, n1, w) => [strutPt(P0, u, n1, w / 2), strutPt(P0, u, n1, -w / 2), strutPt(P0, u, n0, -w / 2), strutPt(P0, u, n0, w / 2)];
const coverSegs = (() => {
  // fairing width follows the belly slot (1/8 in gap each side), capped clear of the door torque tubes at the well
  const out = [], secs = [], n = 12, u0 = 0.18, u1 = NG.Ls - 0.02;
  const depthAt = (u) => { const [tn] = secAt(u), p = strutPt(NG.phi1, u, -tn / 2); return [tn, Math.max(0.004, p[2] - belly(p[0]) - 0.004), 2 * Math.min(slotHW(p[0]) - 0.0104, DOOR.hingeY - NG.tyreW * 0 - 0.025)]; };
  for (let i = 0; i < n; i++) {
    const a = u0 + (u1 - u0) * i / n, b = u0 + (u1 - u0) * (i + 1) / n, [tn, depth, W] = depthAt((a + b) / 2);
    out.push(sbox(a, b, -tn / 2 - depth / 2, depth, W, { colour: 0xe8e8e4, draw: false }));
  }
  for (let i = 0; i <= n; i++) { const u = u0 + (u1 - u0) * i / n, [tn, depth, W] = depthAt(u); secs.push(qsec(u, -tn / 2 - depth, -tn / 2 + 0.002, W)); }
  out.push({ t: 'loft', secs, colour: 0xe8e8e4 });
  return out;
})();
/** chamfered-rectangle (octagon) section of the strut at u: as moulded, 1/8 in chamfers */
const osec = (u, grow = 0) => { const [tn, w] = secAt(u), h = tn / 2 + grow, b = w / 2 + grow, c = Math.min(0.12 / 12, h * 0.4, b * 0.4);
  return [[h, b - c], [h - c, b], [-h + c, b], [-h, b - c], [-h, -b + c], [-h + c, -b], [h - c, -b], [h, -b + c]].map(([n, y]) => strutPt(P0, u, n, y)); };
const strutLoft = { t: 'loft', secs: SZ.strut.map((q) => osec(q.u)), colour: 0xd8d4c4, mat: 'glass' };
const plate = (sg) => [[NG.box[0], 1.05, 3.22, 0.045], [1.05, 1.45, 3.30, 0.015], [1.45, F22 - 0.01, 3.30, 0.012]].map(([a, b, top, m]) => {
  const bot = belly(a) + m; return { t: 'box', c: [(a + b) / 2, sg * (NG.plateY + NG.plateT / 2), (bot + top) / 2], d: [b - a, NG.plateT, top - bot], mat: 'glass', draw: false }; });
/** NG-30 plate profile (s, z): follows the belly, raked forward edge, top edge stepping up behind the gearbox; one lightening
 *  hole in the low-stress corner between the hinge and the gearbox hard-points (foam core removed, edges flox-closed) */
const plateProfile = (() => { const s0 = NG.box[0], s1 = F22 - 0.01, bot = (s) => belly(s) + 0.02, pts = [];
  for (let s = s0 + 0.04; s <= s1 + 1e-9; s += 0.08) pts.push([s, bot(s)]);
  pts.push([s1, bot(s1)], [s1, 3.30], [1.30, 3.30], [1.05, 3.22], [s0 + 0.10, 3.10], [s0, 2.95], [s0, bot(s0) + 0.06]);
  return { pts, holes: [[[1.30, 2.62], [1.62, 2.52], [1.62, 2.98], [1.36, 3.06]]] }; })();
const plateDraw = (sg) => ({ t: 'xpoly', ...plateProfile, y0: sg > 0 ? NG.plateY : -NG.plateY - NG.plateT, y1: sg > 0 ? NG.plateY + NG.plateT : -NG.plateY, mat: 'glass', colour: 0x7fa7c9, op: 0.45 });
const WR = NG.worm.N * NG.worm.lead / Math.PI / 24;           // worm-wheel pitch radius, ft
const WORM_A = [NG.A[0] - 0.12, NG.wormY, NG.wormZ], WORM_B = [NG.A[0] + 0.12, NG.wormY, NG.wormZ];
const CRANK_DIR = (() => { const a = NG.ujoint, b = NG.crank, v = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], L = Math.hypot(...v); return v.map((x) => x / L); })();
const handle = (() => { const c = NG.crank, k = [c[0] + 0.03, c[1], c[2]]; return [{ t: 'cyl', a: NG.crank, b: k, r: 0.02, mat: 'steel' }, { t: 'box', c: [k[0] + 0.01, c[1], c[2] - NG.crankR / 2], d: [0.02, 0.03, NG.crankR], mat: 'steel' }, { t: 'cyl', a: [k[0] + 0.02, c[1], c[2] - NG.crankR], b: [k[0] + 0.12, c[1], c[2] - NG.crankR], r: 0.025, colour: 0x222222 }]; })();

// ------------------------------------------------------------------------------------------- parts
defineParts([
  // ---------------- fixed structure and housings
  { ...NGP, pn: 'LEZ-32-201', ngBody: 'fixed', name: 'NG-30 nose-gear side plates and hard-points (L/R), bonded to F-22', kind: 'laminate', nha: 'LEZ-32-200', qty: 2, massEach: 0.82,
    geo: [...plate(-1), ...plate(1), plateDraw(-1), plateDraw(1)],
    props: [['Plates', 'glass / foam / glass, 0.42 in, 15-ply BID hard-points at the hinge and gearbox bolts; one flox-edged lightening hole between them'], ['Box', `FS ${(NG.box[0] * 12).toFixed(1)} to F-22, inner faces ±${(NG.plateY * 12).toFixed(2)} in`]],
    blurb: 'The primary structure of the nose gear [DF, FB]: two plates bonded to the forward face of F-22 and to the nose skin, boxing the NG-6 hinge and the worm gearbox. Hard-points of solid glass round every bolt; the box is open on top under the nose deck.',
    interfaces: [],   // the hinge bears on the plates' own hard point HP1 (ngear-hinge-lat) and the plates bond to F22 and the skin with tapes (ngear-ng30): LEZ-32-201; the shell's F-I01 doubler is gone (LEZ-53-150 rev E)
    steps: [S1('Cut the plates from glass/foam/glass panel; replace foam with flox at the hard-points; lay up 15 plies BID', ['Plates match-drilled as a pair for the hinge and gearbox', 'Hard-point plies visible at each hole, no voids (tap test)']),
      S1('Assemble plates, hinge and gearbox on the bench; check the mechanism; bond to F-22 and the nose skin', ['Mechanism runs DOWN → UP → DOWN with no bind before bonding', 'Plates square to the centreline ±0.25°'])], src: { mass: 'ASSUMED', design: '[DF] [FB] [EP]' } },
  { ...NGP, pn: 'LEZ-32-202', ngBody: 'fixed', name: `NG-8 hinge discs (L/R), AN${SZ.hingeBolt} hinge bolt and down-stop`, kind: 'machined', nha: 'LEZ-32-201', material: '6061', massEach: 0.30,
    geo: [-1, 1].map((sg) => ({ t: 'cyl', a: [NG.O[0], sg * (NG.plateY + NG.plateT), NG.O[2]], b: [NG.O[0], sg * (NG.plateY + NG.plateT + 0.021), NG.O[2]], r: 1 / 12, mat: '6061' }))
      .concat([{ t: 'cyl', a: [NG.O[0], -(NG.plateY + NG.plateT + 0.04), NG.O[2]], b: [NG.O[0], NG.plateY + NG.plateT + 0.04, NG.O[2]], r: SZ.hingeBolt / 16 / 24, mat: 'steel' },
        ...[-1, 1].map((sg) => ({ t: 'cyl', a: [NG.O[0], sg * (NG.plateY + NG.plateT + 0.021), NG.O[2]], b: [NG.O[0], sg * (NG.plateY + NG.plateT + 0.03), NG.O[2]], r: SZ.hingeBolt / 16 / 24 + 0.012, mat: 'steel', colour: 0x8c96a3 })),   // washer + nut
        { t: 'box', c: strutPt(P0, -0.10, -0.10), d: [0.06, 0.30, 0.05], mat: '6061', colour: 0x4b5563 }]),
    hardware: [{ std: `AN${SZ.hingeBolt}-27A`, qty: 1, desc: 'hinge bolt through NG-8 discs, NG-30s and NG-6 bushings' }, { std: `MS21042L${SZ.hingeBolt}`, qty: 1, desc: 'self-locking nut' }, { std: `AN960-${SZ.hingeBolt}16`, qty: 2, desc: 'washer' },
      { std: 'AN3-5A', qty: 6, desc: 'bolt, NG-8 disc to NG-30' }, { std: 'MS21042L3', qty: 6, desc: 'nut' }],
    props: [['NG-8 disc', `2.0 in dia × 1/4 in 6061-T6, ${SZ.hingeBolt}/16 in bore (builders show 5/16 [FB]; sized here)`], ['Down-stop', 'urethane-faced block; NG-6 bears on it gear-down']],
    blurb: `The hinge: an AN${SZ.hingeBolt} bolt through 2 in aluminium discs bolted outside each NG-30 plate [FB], so the bolt bears on metal, not glass. The down-stop block takes the strut\'s forward swing; the over-centre crank holds the strut against it.`,
    steps: [S1('Machine discs; locate on the plate pair from the jig; drill with the plates', ['Hinge bolt a push fit, no rock', 'Down-stop sets the 6° rake ±0.5°'])], src: { mass: 'ASSUMED', design: '[FB] [LP]' } },
  { ...NGP, pn: 'LEZ-32-210', ngBody: 'fixed', name: 'Nose-gear retract gearbox: housing, bearings and cross-shaft bearings (Brock-type worm drive)', kind: 'mechanism', nha: 'LEZ-32-200', massEach: 1.1,
    geo: [{ t: 'box', c: [NG.A[0], NG.wormY, (NG.A[2] - WR - 0.02 + NG.wormZ + 0.06) / 2], d: [0.30, 0.09, NG.wormZ + 0.06 - (NG.A[2] - WR - 0.02)], mat: '6061', op: 0.35 },
      ...[-1, 1].map((sg) => ({ t: 'cyl', a: [NG.A[0], sg * NG.plateY, NG.A[2]], b: [NG.A[0], sg * (NG.plateY + NG.plateT + 0.015), NG.A[2]], r: 0.06, mat: '6061' }))],   // no bearing at F22 (the shaft passes a grommeted clearance hole; LEZ-53-160 rev B)
    worm: { lead: NG.worm.lead, pitchD: NG.worm.pitchD, mu: NG.worm.mu },
    hardware: [{ std: 'AN4-10A', qty: 4, desc: 'bolt, gearbox to right NG-30' }, { std: 'MS21042L4', qty: 4, desc: 'nut' }, { std: 'AN960-416', qty: 8, desc: 'washer' }, { std: 'KP8A', qty: 2, desc: 'flanged ball bearing, Ø1/2 cross-shaft (in the NG-30s)' }],
    props: [['Worm', `single-start, lead ${NG.worm.lead} in, pitch dia ${NG.worm.pitchD} in`], ['Worm wheel', `${NG.worm.N} teeth, pitch dia ${(WR * 24).toFixed(2)} in`], ['Ratio', `${NG.worm.N} : 1`]],
    blurb: 'Bought-in worm gearbox (Brock-type [DF]) bolted to the right NG-30. The worm is single-start, so it cannot be driven backwards by the gear: the gearbox itself holds the gear wherever the crank stops. The housing is drawn translucent so the worm and wheel show.',
    steps: [S1('Assemble gearbox; set down-stop and up-stop', ['Gear holds DOWN with 100 lb aft on the tyre and the crank free', 'Flag reads DOWN only when on the down-stop', 'Backlash at the crank ≤ 1/8 turn'])], src: { mass: 'ASSUMED', design: '[DF] [CZ]' } },
  { ...NGP, pn: 'LEZ-32-220', ngBody: 'fixed', name: 'NB nose-wheel well and strut channel (moulded, between F-22 and the panel)', kind: 'laminate', nha: 'LEZ-32-200', massEach: 1.6, meshes: /^NoseWheelWell$/,
    geo: [{ t: 'box', c: [(WELL.s0 + 3.0) / 2, 0, (belly(WELL.s0) + 0.03 + 3.05) / 2], d: [3.0 - WELL.s0, 2 * WELL.halfW, 3.05 - belly(WELL.s0) - 0.03] },
      { t: 'box', c: [(3.0 + WELL.s1) / 2, 0, (belly(3.0) + 0.03 + 2.77) / 2], d: [WELL.s1 - 3.0, 2 * WELL.halfW, 2.77 - belly(3.0) - 0.03] },
      { t: 'box', c: [(WELL.chan.s0 + WELL.s0) / 2, 0, (belly(WELL.chan.s0) + 0.03 + WELL.chan.top) / 2], d: [WELL.s0 - WELL.chan.s0, 2 * WELL.chan.halfW, WELL.chan.top - belly(WELL.chan.s0) - 0.03] }],
    blurb: 'The NB cover: a moulded shell between F-22 and the instrument panel, between the pilot\'s legs, contoured over the stowed tyre and under the crank shaft [DF, EP]. A strut channel runs forward to the F-22 notch; the gear viewing window in the lower panel looks into it.',
    steps: [S1('Lay up 2 BID over a foam plug of the swept tyre envelope; trim; bond in', ['Tyre clears the shell by ≥ 1/4 in through the whole retract arc', 'Shell sealed to the skin (keeps nose air off the pilot\'s legs)'])], src: { mass: 'ASSUMED', design: '[DF] [EP] [LP]' } },
  { ...NGP, pn: 'LEZ-32-225', ngBody: 'fixed', external: true /* skid under the nose: the airplane parks kneeling on it */, name: 'Nose bumper (replaceable skid for parking gear-up)', kind: 'machined', material: 'rubber', massEach: 0.15,
    geo: [{ t: 'box', c: [0.42, 0, belly(0.42) - 0.015], d: [0.24, 0.12, 0.03], colour: 0x222222 }],
    blurb: 'Long-EZs park nose-down with the gear cranked up [CZ]; this bolt-on rubber skid takes the nose on the ramp and is replaced when worn.',
    steps: [S1('Bond the bumper base; screw on the rubber skid', ['Skid replaceable without disturbing the skin'])], src: { mass: 'ASSUMED' } },
  // ---------------- strut body (rotates about the hinge)
  { ...NGP, pn: 'LEZ-32-200', ngBody: 'strut', external: true /* extended: hangs below the belly; the stowed pose is checked by ngear-stow */, name: 'NG-1 nose-gear strut, solid S-glass, tapered (and nose-gear installation)', kind: 'laminate', material: 'glass', massEach: +MS_.strut.toFixed(2),
    geo: SZ.strut.slice(1).map((q, i) => { const a = SZ.strut[i]; return sbox(a.u, q.u, 0, (a.t + q.t) / 24, (a.b + q.b) / 24, { mat: 'glass', draw: false }); }).concat([strutLoft]),
    props: [['Section (fore-aft × lateral, in)', SZ.strut.map((q) => `${(q.u * 12).toFixed(1)} in: ${q.t.toFixed(3)} × ${q.b.toFixed(3)}`).join('; ')], ['Shape', 'chamfered rectangle, 1/8 in chamfers; deepest fore-aft at NG-3, widest at the hinge (side load)'],
      ['Hinge to fork head', `${(NG.Ls * 12).toFixed(1)} in`], ['Rake (gear down)', `${NG.phi0}° aft`], ['Travel', `${(NG.phi1 - NG.phi0).toFixed(1)}° (down → stowed)`],
      ...SIZING.log.filter((r) => r.member === 'NG-1 strut').map((r) => [`Iteration ${r.it}`, `${r.desc} — ${r.mass.toFixed(2)} lb, MS ${r.ms >= 0 ? '+' : ''}${r.ms.toFixed(2)}, tip ${r.defl.toFixed(1)} in`]),
      ...SIZING.summary.map((r) => [`Gear members, iteration ${r.it}`, `${r.desc}: ${r.mass.toFixed(2)} lb, min MS ${r.ms >= 0 ? '+' : ''}${r.ms.toFixed(2)}`])],
    blurb: `A solid S-glass bar [EP] hung from the NG-6 hinge, raked 6° aft. Its section is sized station by station (fore-aft for the aft and forward loads, which peak at the NG-3 link bracket; lateral for the side load, which peaks at the hinge), then thickened beyond NG-3 to hold the tyre's fore-aft deflection under ${3.0} in at limit load. Cranked up it swings aft through the F-22 notch into the belly slot under its strut cover [LP].`,
    steps: [S1('Lay unidirectional S-glass rovings in the two-part steel mould to the station table; ±45° BID over-wrap; post-cure', ['Section within ±0.02 in of the station table', 'No dry fibres or voids (tap test, backlight)']), S1('Fit NG-6, NG-3 and NG-4; set the hinge-to-NG-3 hole', [`Hinge to NG-3 hole ${(NG.c * 12).toFixed(2)} ± 0.03 in (it governs how far the wheel stows [LP])`])], src: { mass: 'COMPUTED (station table × 0.072 lb/in³ + 5 %)', design: '[EP] [LP] + LEZ sizing' } },
  { ...NGP, pn: 'LEZ-32-203', ngBody: 'strut', name: 'NG-6 hinge fitting (pocketed 6061: clamp cheeks, bushing bosses, stop lip)', kind: 'machined', nha: 'LEZ-32-200', material: '6061', massEach: +MS_.ng6.toFixed(2),
    geo: (() => { const [tn, w] = secAt(0), cw = 0.15 / 12, o = [];
      for (const sg of [-1, 1]) o.push({ t: 'obox', c: strutPt(P0, -0.03, 0, sg * (w / 2 + cw / 2)), d: [tn + 0.05, cw, 0.22], pitch: -P0, mat: '6061', colour: 0x9aa4ae });   // clamp cheeks
      o.push({ t: 'cyl', a: [NG.O[0], -(NG.plateY - 0.004), NG.O[2]], b: [NG.O[0], NG.plateY - 0.004, NG.O[2]], r: SZ.hingeBolt / 16 / 24 + 0.25 / 12, mat: '6061', colour: 0x9aa4ae });   // bushing boss across
      o.push({ t: 'obox', c: strutPt(P0, -0.12, -tn / 2 - 0.02, 0), d: [0.05, w + 0.02, 0.05], pitch: -P0, mat: '6061', colour: 0x9aa4ae });   // down-stop lip
      o.push({ t: 'obox', c: strutPt(P0, 0.065, 0, 0), d: [tn + 0.05, w + 2 * cw, 0.03], pitch: -P0, mat: '6061', colour: 0x9aa4ae });   // lower clamp band
      return o; })(),
    hardware: [{ std: 'AN4-13A', qty: 2, desc: 'clamp bolt through the strut' }, { std: 'MS21042L4', qty: 2, desc: 'nut' }, { std: `NAS75-${SZ.hingeBolt}`, qty: 2, desc: 'bushing, hinge bore' }],
    props: [['Iterations', SIZING.log.filter((r) => r.member === 'NG-6 hinge casting').map((r) => `${r.it}: ${r.desc}, ${r.mass.toFixed(2)} lb`).join('; ')], ['Bushing bearing MS', `${SZ.ng6ms >= 0 ? '+' : ''}${SZ.ng6ms.toFixed(2)}`]],
    blurb: 'Pocketed aluminium fitting: two 0.15 in cheeks clamp the strut top, a bossed cross-tube carries the hinge bushings, a lip lands on the down-stop and a band closes the clamp below. The solid block it replaces weighed 0.6 lb. A cast NG6A alternative is sold for builders; this model machines it from plate.',
    steps: [S1('Machine; bush; clamp to the strut with flox', ['Hinge bore square to the strut ±0.25°', 'Bushings pressed, reamed to the bolt', 'Pocket floors ≥ 0.10 in'])], src: { mass: 'COMPUTED (pocketed)', design: '[FB] [LP] + LEZ sizing' } },
  { ...NGP, pn: 'LEZ-32-204', external: true /* below the belly gear-down; stowed pose checked by ngear-stow */, ngBody: 'strut', name: 'NG-3 link clevis and NG-4 fork-head bracket (4130 sheet, welded)', kind: 'weldment', nha: 'LEZ-32-200', material: '4130', massEach: +MS_.ng3.toFixed(2),
    geo: (() => { const [tc, wc] = secAt(NG.c), [tt, wt] = secAt(NG.Ls), et = SZ.ear.t / 12, gap = 0.5 / 12, o = [];
      o.push({ t: 'loft', secs: [osec(NG.c - 0.07, 0.006), osec(NG.c + 0.07, 0.006)], mat: '4130', colour: 0x5aa0d8 });   // NG-3 band round the strut
      for (const sg of [-1, 1]) o.push({ t: 'obox', c: strutPt(P0, NG.c, (tc / 2 + NG.cn + 0.04) / 2, sg * (gap / 2 + et / 2)), d: [NG.cn + 0.04 - tc / 2, et, 0.11], pitch: -P0, mat: '4130', colour: 0x5aa0d8 });   // clevis ears
      o.push(scyl(NG.c, NG.c, NG.cn, SZ.linkBolt / 16 / 24, -gap / 2 - et - 0.01, gap / 2 + et + 0.01, { mat: 'steel' }));   // link pin
      o.push({ t: 'loft', secs: [osec(NG.Ls - 0.12, 0.006), osec(NG.Ls - 0.01, 0.006)], mat: '4130', colour: 0x5aa0d8 });   // NG-4 socket
      return o; })(),
    hardware: [{ std: `AN${SZ.linkBolt}-16A`, qty: 1, desc: 'link pin at NG-3' }, { std: `MS21042L${SZ.linkBolt}`, qty: 1, desc: 'nut' }, { std: 'AN4-12A', qty: 4, desc: 'band and socket through-bolts' }, { std: 'MS21042L4', qty: 4, desc: 'nut' }],
    props: [['Clevis ears', `${SZ.ear.t} in 4130 × 2, pin bearing MS ${SZ.ear.ms >= 0 ? '+' : ''}${SZ.ear.ms.toFixed(2)}`], ['Iterations', SIZING.log.filter((r) => r.member === 'NG-3 clevis ears').map((r) => `${r.it}: ${r.desc}, ${r.mass.toFixed(2)} lb`).join('; ')]],
    blurb: `NG-3 is a welded band round the strut with two ${SZ.ear.t} in clevis ears for the spring link, ${(NG.c * 12).toFixed(1)} in down the strut (builders measure 6.15–6.71 in [LP]); NG-4 is the socket that caps the strut and carries the fork's caster bearing.`,
    steps: [S1('Form and weld; normalise; drill in the strut jig', [`Hinge to NG-3 hole ${(NG.c * 12).toFixed(2)} ± 0.03 in`, 'Caster axis on the strut centreline ±0.02 in'])], src: { mass: 'COMPUTED', design: '[LP] [FB] + LEZ sizing' } },
  { ...NGP, pn: 'LEZ-32-205', external: true /* below the belly gear-down; stowed pose checked by ngear-stow */, ngBody: 'strut', name: 'Strut cover (SC), fills the belly slot gear-up', kind: 'laminate', nha: 'LEZ-32-200', massEach: 0.4,
    geo: coverSegs,
    blurb: 'A foam-and-glass fairing bonded to the strut\'s forward face. Gear-up it fills the belly slot flush with the nose skin [LP], keeping cold nose air off the pilot\'s legs; builders sand it in with a feeler gauge along the strut.',
    steps: [S1('Shape the foam on the stowed strut against the slot; glass 2 BID; bond to the strut', ['Flush with the skin ±1/32 in along the slot (feeler gauge)'])], src: { mass: 'ASSUMED', design: '[LP]' } },
  { ...NGP, pn: 'LEZ-32-206', external: true /* below the belly gear-down; stowed pose checked by ngear-stow */, ngBody: 'strut', name: `Nose fork (${SZ.leg.h} × ${SZ.leg.b} × ${SZ.leg.w} in oval 4130 legs), caster head, friction shimmy damper and axle`, kind: 'weldment', nha: 'LEZ-32-200', material: '4130', massEach: +MS_.fork.toFixed(2),
    geo: (() => { const r = SZ.leg.b / 24, crown = NG.Ls + NG.crownIn / 12, o = [];
      /** oval leg section: depth h fore-aft (in the s–z plane, square to the leg), width b across */
      const oval = (p, e, h, b) => { const nn = [-e[1], e[0]]; return Array.from({ length: 16 }, (_, k) => { const a = k / 16 * 2 * Math.PI, u = Math.cos(a) * h / 24, v = Math.sin(a) * b / 24; return [p[0] + nn[0] * u, p[1] + v, p[2] + nn[1] * u]; }); };
      o.push(scyl(NG.Ls + 0.31 / 12, NG.Ls + NG.crownIn / 12 - 0.0365, 0, 0.065, 0, 0, { mat: '4130', colour: 0x5a6672 }));   // caster boss
      o.push(scyl(NG.Ls + 0.19 / 12, NG.Ls + 0.31 / 12, 0, 0.079, 0, 0, { mat: 'steel', colour: 0x8b5e3c }));   // friction damper disc pack
      o.push(scyl(crown, crown, 0, 0.0365, -FY - r, FY + r, { mat: '4130', colour: 0x5a6672 }));   // crown tube 7/8 in
      for (const sg of [-1, 1]) {
        { const A = strutPt(P0, crown, 0, sg * FY), B = [AX[0], sg * FY, AX[2]], L = Math.hypot(B[0] - A[0], B[2] - A[2]), e = [(B[0] - A[0]) / L, (B[2] - A[2]) / L];
          o.push({ t: 'loft', secs: [oval(A, e, SZ.leg.h * 1.15, SZ.leg.b), oval([A[0] + e[0] * 0.04, A[1], A[2] + e[1] * 0.04], e, SZ.leg.h, SZ.leg.b), oval(B, e, SZ.leg.h * 0.85, SZ.leg.b)], mat: '4130', colour: 0x5a6672 });   // oval leg, gusseted at the crown
          o.push({ t: 'cyl', a: A, b: B, r: r * 0.9, mat: '4130', draw: false }); }
                o.push({ t: 'cyl', a: [AX[0], sg * (FY - r), AX[2]], b: [AX[0], sg * (FY + r), AX[2]], r: 0.06, mat: '4130', colour: 0x5a6672 });   // axle boss
      }
      o.push({ t: 'cyl', a: [AX[0], -FY - r - 0.01, AX[2]], b: [AX[0], FY + r + 0.01, AX[2]], r: 0.3125 / 12, mat: 'steel' });   // 5/8 axle
      return o; })(),
    hardware: [{ std: 'AN10-36A', qty: 1, desc: 'axle bolt, 5/8 in (wheel bearing bore)' }, { std: 'MS21042L10', qty: 1, desc: 'nut' }, { std: 'AN960-1016', qty: 2, desc: 'washer' }, { std: 'MS20365-1018', qty: 1, desc: 'caster bolt nut' }, { std: 'MS24665-283', qty: 2, desc: 'cotter pin' }],
    props: [['Legs', `${SZ.leg.h} × ${SZ.leg.b} × ${SZ.leg.w} in oval 4130 tube (fore-aft × across × wall), ${(SZ.Lleg).toFixed(1)} in crown to axle; MS ${SZ.leg.ms >= 0 ? '+' : ''}${SZ.leg.ms.toFixed(2)} (drag + portal-frame side, welded 80 ksi)`], ['Trail', `${(NG.trail * 12).toFixed(1)} in behind the caster axis`], ['Damper', 'Belleville washers loading a friction disc at the caster head; 3–5 lb breakaway at the tyre'],
      ['Iterations', SIZING.log.filter((r) => r.member === 'Fork legs').map((r) => `${r.it}: ${r.desc}, ${r.mass.toFixed(2)} lb, MS ${r.ms >= 0 ? '+' : ''}${r.ms.toFixed(2)}`).join('; ')]],
    blurb: 'Free-castering welded fork, steering by differential braking. The flat-bar legs of the first model failed the side load (MS −0.49); a round tube that passes is too wide for the gap between the tyre and the door torque tube, so the legs are 4130 tube flattened to an oval: deep fore-aft for the drag load, narrow across, and braced against side load by the clamped axle (a portal frame). A spring-loaded friction disc at the caster head damps shimmy [CZ].',
    steps: [S1('Mitre and TIG-weld legs to the crown and the caster boss; normalise', ['Axle bosses coaxial within 0.005 in', 'Caster friction 3–5 lb at the tyre', 'Fork centres itself within ±5° when lifted'])], src: { mass: 'COMPUTED + 0.55 lb head and damper', design: '[DF] [CZ] + LEZ sizing' } },
  { ...NGP, pn: 'LEZ-32-207', external: true /* below the belly gear-down; stowed pose checked by ngear-stow */, ngBody: 'strut', name: 'Nose wheel: 4 in split-hub wheel, Azusa 280/250-4 4-ply tyre and tube', kind: 'cots', nha: 'LEZ-32-200', massEach: 3.0,
    geo: [{ t: 'cyl', a: [AX[0], -TY / 2, AX[2]], b: [AX[0], TY / 2, AX[2]], r: NG.R, mat: 'rubber', draw: false },
      { t: 'torus', c: AX, axis: [0, 1, 0], R: NG.R - TY * 0.42, r: TY * 0.48, colour: 0x1f1f1f, mat: 'rubber' },                          // tyre
      ...[-1, 1].map((sg) => ({ t: 'cyl', a: [AX[0], sg * TY * 0.10, AX[2]], b: [AX[0], sg * TY * 0.40, AX[2]], r: 2.1 / 12, mat: '6061', colour: 0xb7bec7 })),   // rim halves
      { t: 'cyl', a: [AX[0], -TY * 0.55, AX[2]], b: [AX[0], TY * 0.55, AX[2]], r: 0.6 / 12, mat: '6061', colour: 0x9aa4ae },              // hub barrel
      ...[-1, 1].map((sg) => ({ t: 'cyl', a: [AX[0], sg * TY * 0.55, AX[2]], b: [AX[0], sg * TY * 0.62, AX[2]], r: 0.45 / 12, mat: 'steel', colour: 0x6b7280 }))],   // bearing seals
    std: 'Azusa 280/250-4 4-ply tyre (Aircraft Spruce 06-01287) and tube (06-01288) on a 4 in split-hub wheel with sealed ball bearings and 5/8 in axle [AS]; inflation per the tyre sidewall',
    props: [['Tyre', '2.80/2.50-4, OD ≈ 10.2 in, width 2.8 in'], ['Static nose load', `${SZ.n.stat.toFixed(0)} lb (forward-CG gross)`]], src: { mass: 'ASSUMED (catalogue class)', design: '[AS] [FB]' } },
  // ---------------- drive train (each rotates on its own axis)
  { ...NGP, pn: 'LEZ-32-211', ngBody: 'worm', name: 'Worm and drive shaft (worm to U-joint)', kind: 'machined', nha: 'LEZ-32-210', material: '4130', massEach: 0.6,
    geo: [{ t: 'cyl', a: WORM_A, b: WORM_B, r: NG.worm.pitchD / 24 - 0.004, mat: 'steel', colour: 0xc9ced6 },
      { t: 'path', pts: (() => { const L = (WORM_B[0] - WORM_A[0]) * 12, n = Math.round(L / NG.worm.lead * 16), r = NG.worm.pitchD / 24; return Array.from({ length: n + 1 }, (_, k) => { const a = k / 16 * 2 * Math.PI; return [WORM_A[0] + (k / n) * (WORM_B[0] - WORM_A[0]), WORM_A[1] + r * Math.cos(a), WORM_A[2] + r * Math.sin(a)]; }); })(), dIn: 0.05, drawR: 0.025, massPerFt: 0, mat: 'steel', colour: 0xe5e7eb },   // thread
      { t: 'cyl', a: WORM_B, b: [NG.ujoint[0] - 0.03, NG.ujoint[1], NG.ujoint[2]], r: 0.3125 / 24, mat: '4130' }],
    blurb: 'Single-start hardened worm on a 5/16 in shaft, running aft through a bearing in F-22, over the NB well, to the U-joint.',
    steps: [S1('Turn and harden the worm; press on the shaft; pin', ['Runout ≤ 0.003 in TIR', 'Shaft clears the NB shell ≥ 1/4 in'])], src: { mass: 'ASSUMED', design: '[DF]' } },
  { ...NGP, pn: 'LEZ-32-214', ngBody: 'crank', name: 'U-joint, panel shaft and gear crank (lower centre panel)', kind: 'mechanism', nha: 'LEZ-32-210', material: '4130', massEach: 0.5,
    geo: [{ t: 'sphere', c: NG.ujoint, r: 0.035, mat: 'steel', colour: 0x8c96a3 }, { t: 'cyl', a: [NG.ujoint[0] + 0.03 * CRANK_DIR[0], NG.ujoint[1], NG.ujoint[2] + 0.03 * CRANK_DIR[2]], b: NG.crank, r: 0.3125 / 24, mat: '4130' }, ...handle],
    faces: [{ draw: 'gearflag', c: [PANEL + 0.057, -1.75 / 12, 34.5 / 12], w: 0.9 / 12, h: 0.6 / 12, state: 'down' }],   // gear position flag behind the panel's flag window (LEZ-31-100)
    std: 'MS20270 universal joint (shaft U-joint, 5/16 bore)', hardware: [{ std: 'MS20270-B8', qty: 1, desc: 'universal joint' }, { std: 'MS16562-12', qty: 2, desc: 'spring pin' }],
    blurb: `A single U-joint lets the shaft drop under the display to the lower centre panel [DF], where a fold-out crank handle turns it ${NG.turns.toFixed(1)} times from DOWN to UP.`,
    steps: [S1('Fit U-joint and panel bearing; pin the crank', ['U-joint angle ≤ 30°', 'Crank turns smoothly, ≤ 1/8 turn backlash'])], src: { mass: 'ASSUMED', design: '[DF]' } },
  { ...NGP, pn: 'LEZ-32-212', ngBody: 'arm', name: 'Worm wheel, cross-shaft and NG-64 crank arm', kind: 'weldment', nha: 'LEZ-32-210', material: '4130', massEach: +(MS_.arm + 0.35).toFixed(2),
    geo: [{ t: 'cyl', a: [NG.A[0], NG.wormY - 0.02, NG.A[2]], b: [NG.A[0], NG.wormY + 0.02, NG.A[2]], r: WR, mat: 'brass', draw: false },
      { t: 'gear', c: [NG.A[0], NG.wormY, NG.A[2]], axis: [0, 1, 0], rp: WR, teeth: NG.worm.N, w: 0.04, mat: 'brass', colour: 0xc9a227 },
      { t: 'cyl', a: [NG.A[0], -DOOR.camY - 0.03, NG.A[2]], b: [NG.A[0], DOOR.camY + 0.03, NG.A[2]], r: 0.0208, mat: '4130' },
      // NG-64: tapered bar (sized), boss on the cross-shaft and a clevis boss for the link
      (() => { const B = B_at(KIN.ad), u = [B[0] - NG.A[0], B[2] - NG.A[2]], L = Math.hypot(...u), e = [u[0] / L, u[1] / L], nrm = [-e[1], e[0]], w0 = SZ.arm.w / 12, w1 = SZ.arm.w * 0.75 / 12, t = SZ.arm.t / 12;
        const sec = (f, w) => { const c = [NG.A[0] + u[0] * f, NG.A[2] + u[1] * f]; return [[c[0] + nrm[0] * w / 2, t / 2, c[1] + nrm[1] * w / 2], [c[0] - nrm[0] * w / 2, t / 2, c[1] - nrm[1] * w / 2], [c[0] - nrm[0] * w / 2, -t / 2, c[1] - nrm[1] * w / 2], [c[0] + nrm[0] * w / 2, -t / 2, c[1] + nrm[1] * w / 2]]; };
        return { t: 'loft', secs: [sec(0.12, w0), sec(0.88, w1)], mat: '4130', colour: 0x5aa0d8 }; })(),
      { t: 'cyl', a: [NG.A[0], -SZ.arm.t / 24 - 0.008, NG.A[2]], b: [NG.A[0], SZ.arm.t / 24 + 0.008, NG.A[2]], r: 0.045, mat: '4130', colour: 0x5aa0d8 },
      { t: 'cyl', a: [B_at(KIN.ad)[0], -0.03, B_at(KIN.ad)[2]], b: [B_at(KIN.ad)[0], 0.03, B_at(KIN.ad)[2]], r: 0.032, mat: '4130', colour: 0x5aa0d8 }],
    props: [['Crank radius', `${(NG.r * 12).toFixed(2)} in`], ['NG-64 bar', `${SZ.arm.w} × ${SZ.arm.t} in 4130, tapered to ${(SZ.arm.w * 0.75).toFixed(2)} at the link boss; MS ${SZ.arm.ms >= 0 ? '+' : ''}${SZ.arm.ms.toFixed(2)}`], ['Travel', `${NG.travel.toFixed(0)}° (DOWN over centre → UP)`], ['Over-centre at DOWN', `${NG.beta}°`],
      ['Iterations', SIZING.log.filter((r) => r.member === 'NG-64 crank arm').map((r) => `${r.it}: ${r.desc}, ${r.mass.toFixed(2)} lb, MS ${r.ms >= 0 ? '+' : ''}${r.ms.toFixed(2)}`).join('; ')]],
    blurb: `The NG-64 welded crank [FB] on the worm-wheel cross-shaft. The first block model's 0.48 in round bar failed the 4° off-line link load (MS −0.35); the sized flat bar puts its depth in the plane of the bending. Gear DOWN it lies ${NG.beta}° past dead centre against its stop, so a drag load on the wheel pushes it harder onto the stop: an over-centre down lock that does not rely on the worm [CZ].`,
    steps: [S1('Weld arm to shaft; normalise; key the worm wheel', ['Arm radius ±0.01 in', 'Over-centre 3–5° at the down stop'])], src: { mass: 'ASSUMED', design: '[FB] [CZ]' } },
  { ...NGP, pn: 'LEZ-32-213', external: true /* below the belly gear-down; stowed pose checked by ngear-stow */, ngBody: 'link', name: 'Spring link: die-spring cartridge, rod ends (NG-64 to NG-3)', kind: 'mechanism', nha: 'LEZ-32-210', material: '4130', massEach: +MS_.rod.toFixed(2), rodOD: SZ.rod.od,
    geo: [{ t: 'cyl', a: B_at(KIN.ad), b: C_at(NG.phi0), r: 0.045, mat: '4130', colour: 0x7aa95c }],
    std: 'ISO 10243 heavy-duty die spring in a 4130 cartridge; MS21151 rod ends', hardware: [{ std: `MS21151-${SZ.linkBolt}`, qty: 2, desc: 'rod end' }, { std: `AN${SZ.linkBolt}-14A`, qty: 1, desc: 'bolt at NG-64' }, { std: `MS21042L${SZ.linkBolt}`, qty: 1, desc: 'nut' }],
    props: [['Free length (pin to pin)', `${(KIN.l * 12).toFixed(2)} in`], ['Rod', `${SZ.rod.od} in ${SZ.rod.kind}${SZ.rod.kind === 'tube' ? ` × ${SZ.rod.w}` : ''} 4130; ${SZ.rod.mode}; MS ${SZ.rod.ms >= 0 ? '+' : ''}${SZ.rod.ms.toFixed(2)}`], ['Die spring', `${NG.spring.k} lb/in, preload ${NG.spring.pre} in (${NG.spring.k * NG.spring.pre} lb), solid at ${NG.spring.solid} in (${NG.spring.k * NG.spring.solid} lb)`]],
    blurb: 'Telescoping link with a preloaded die spring [CZ, FB]. Turning the crank through dead centre squeezes the spring, which then holds the crank over centre; at limit loads the cartridge goes solid and the link is rigid.',
    steps: [S1('Assemble cartridge with the spring preloaded; set length; safety rod-end jam nuts', [`Pin-to-pin ${(KIN.l * 12).toFixed(2)} ± 0.02 in`, 'Crank snaps over centre into the stop'])], src: { mass: 'ASSUMED', design: '[CZ] [FB]' } },
]);

// ---------------- wheel-well doors (fairing) and their drive
const doorSec = (s, sg) => { const z = belly(s) + 0.0005; return [[s, sg * DOOR.yOut, z], [s, sg * DOOR.yIn, z], [s, sg * DOOR.yIn, z + DOOR.t], [s, sg * DOOR.yOut, z + DOOR.t]]; };
const doorGeo = (sg) => { const body = sg > 0 ? 'doorR' : 'doorL', ss = [0, 0.2, 0.4, 0.6, 0.8, 1].map((f) => DOOR.s0 + (DOOR.s1 - DOOR.s0) * f), sm = (DOOR.s0 + DOOR.s1) / 2;
  return [{ t: 'loft', secs: ss.map((x) => doorSec(x, sg)), colour: 0xeeeeea, body },
    { t: 'box', c: [sm, sg * (DOOR.yIn + DOOR.yOut) / 2, belly(sm) + DOOR.t / 2], d: [DOOR.s1 - DOOR.s0, DOOR.yOut - DOOR.yIn, DOOR.t], draw: false, body },
    ...[2.70, 3.02, 3.30].map((x) => ({ t: 'box', c: [x, sg * (DOOR.hingeY + DOOR.yOut) / 2 - sg * 0.004, doorAxisZ(x) - 0.006], d: [0.05, 0.03, 0.02], mat: '6061', colour: 0x9aa4ae, body }))]; };   // door-to-tube clips
const tubeA = (sg) => [DOOR.quadS, sg * DOOR.hingeY, doorAxisZ(DOOR.quadS)], tubeB = (sg) => [DOOR.s1, sg * DOOR.hingeY, doorAxisZ(DOOR.s1)];
const LV = DOOR.lever;
defineParts([
  { ...NGP, pn: 'LEZ-32-230', ngBody: 'door', external: true /* skin-flush fairing doors; hang open below the belly gear-down */, name: 'Nose-wheel well doors (L/R), moulded fairing doors', kind: 'laminate', nha: 'LEZ-32-220', qty: 2, massEach: 0.35,
    geo: [...doorGeo(-1), ...doorGeo(1)],
    props: [['Panel', `${((DOOR.s1 - DOOR.s0) * 12).toFixed(1)} × ${((DOOR.yOut - DOOR.yIn) * 12).toFixed(1)} in each, moulded on the belly; ${(DOOR.t * 12).toFixed(2)} in (2 BID / 1/16 in foam / 2 BID)`], ['Open', `${DOOR.openDeg}° (hang outboard of the tyre and fork)`], ['Gap', '1/8 in at the centreline and the slot edges']],
    blurb: 'Clamshell fairing doors that close the NB-well opening aft of the strut cover, so the stowed wheel no longer leaves an open, turbulent hole in the belly (the reason builders add them [CZ]; most Long-EZs fly without). Each is moulded on the fuselage as its own tool, so it closes flush with the skin under the stowed tyre.',
    steps: [S1('Mould on the belly over the cut-out (release film); 2 BID / 1/16 in PVC foam / 2 BID; trim to the slot with 1/8 in gaps', ['Flush with the skin ±1/32 in closed', 'Doors swing free open-to-closed with the cable slack']),
      S1('Bond the tube clips; rig the cable', ['Doors closed and pulled snug at UP with ≥ 1/16 in under the tyre', 'Doors fully open before the crank leaves the up-lock'])], src: { mass: 'ASSUMED', design: '[CZ] [AS-adjacent: builder door mods]' } },
  { ...NGP, pn: 'LEZ-32-231', ngBody: 'door', name: 'Door hinge torque tubes, cable quadrants, torsion springs and hinge brackets (L/R)', kind: 'weldment', nha: 'LEZ-32-230', material: '4130', qty: 2, massEach: 0.25,
    geo: [-1, 1].flatMap((sg) => { const body = sg > 0 ? 'doorR' : 'doorL', a = tubeA(sg), b = tubeB(sg);
      return [{ t: 'cyl', a, b, r: DOOR.tubeR, wall: 0.035, mat: '4130', body },
        { t: 'cyl', a, b: [a[0], sg * Math.abs(hornTip(0)[1]), hornTip(0)[2]], r: 0.0104, mat: '4130', colour: 0x5aa0d8, body },                     // closing horn (up when shut)
        { t: 'sphere', c: [a[0], sg * Math.abs(hornTip(0)[1]), hornTip(0)[2]], r: 0.012, mat: 'steel', body },                                           // cable eye
        { t: 'cyl', a: [36.52 / 12, a[1], doorAxisZ(36.52 / 12)], b: [37.32 / 12, a[1], doorAxisZ(37.32 / 12)], r: 0.017, mat: 'steel', colour: 0xc9ced6, body: 'fixed' },     // torsion spring (anchored to the bracket)
        ...[DOOR.quadS + 0.03, 36.21 / 12, 3.33].map((x) => ({ t: 'box', c: [x, sg * (WELL.halfW - 0.006), doorAxisZ(x) + 0.01], d: [0.035, 0.012, 0.05], mat: '6061', colour: 0x9aa4ae, body: 'fixed' }))]; }),
    hardware: [{ std: 'NAS75-4', qty: 6, desc: 'hinge bushing, 1/4 in tube in the brackets' }, { std: 'AN3-4A', qty: 6, desc: 'bracket bolts into the well wall inserts' }, { std: 'MS21042L3', qty: 6, desc: 'nut' },
      { std: 'ASTM A228 0.118 in music-wire torsion spring', qty: 2, desc: 'door-open spring (wire size per builder note [CZ])' }, { std: 'AN100-3', qty: 2, desc: 'cable thimble at the horn' }],
    props: [['Torque tube', '1/4 × .035 4130, along each door\'s outboard edge'], ['Closing horn', `${(DOOR.hornR * 12).toFixed(2)} in, up when shut; ${(DOOR.cableTravel * 12).toFixed(2)} in of cable closes the door ${DOOR.openDeg}°`], ['Spring', 'music-wire torsion spring, holds the door on its open stop']],
    blurb: 'Each door rides on a 4130 torque tube in three bushed brackets on the NB-well wall. A music-wire torsion spring (the 0.118 in wire builders use [CZ]) holds the door open; the closing cable pulls a short horn on the tube\'s forward end, which points up when the door is shut, so it sweeps only the space above the skin. Fail-safe: a broken cable or seized drive leaves the doors open and cannot block the gear.',
    steps: [S1('Weld quadrant to tube; bush brackets; fit springs with preload', ['Door returns fully open from any position with the cable released', 'Tube end-play ≤ 0.010 in'])], src: { mass: 'ASSUMED', design: '[CZ]' } },
  { ...NGP, pn: 'LEZ-32-232', ngBody: 'arm', name: 'Door drive: cross-shaft cams, follower levers, closing cables and fairleads (L/R)', kind: 'mechanism', nha: 'LEZ-32-210', material: '4130', massEach: 0.45,
    geo: [-1, 1].flatMap((sg) => { const y = sg * DOOR.camY, fol = sg > 0 ? 'followerR' : 'followerL', rc = LV.rollerAt, lobe = Math.atan2(rc[1] - NG.A[2], rc[0] - NG.A[0]) - (KIN.au - KIN.ad) * d2r;
      return [{ t: 'cyl', a: [NG.A[0], y - 0.012, NG.A[2]], b: [NG.A[0], y + 0.012, NG.A[2]], r: DOOR.camR, mat: '4130', colour: 0xc9a227, body: 'arm' },
        // cam lobe: placed so that it reaches the follower roller at UP (the cam turns with the cross-shaft)
        { t: 'cyl', a: [NG.A[0] + (DOOR.camR - 0.004) * Math.cos(lobe), y - 0.012, NG.A[2] + (DOOR.camR - 0.004) * Math.sin(lobe)], b: [NG.A[0] + (DOOR.camR - 0.004) * Math.cos(lobe), y + 0.012, NG.A[2] + (DOOR.camR - 0.004) * Math.sin(lobe)], r: DOOR.lift + 0.008, mat: '4130', colour: 0xc9a227, body: 'arm' },
        { t: 'cyl', a: [LV.pivot[0], y - 0.02, LV.pivot[1]], b: [LV.pivot[0], y + 0.02, LV.pivot[1]], r: 0.012, mat: 'steel', body: 'fixed' },                      // lever pivot pin on the NG-30 plate
        { t: 'cyl', a: [LV.pivot[0], y, LV.pivot[1]], b: [rc[0], y, rc[1]], r: 0.012, mat: '4130', colour: 0x5aa0d8, body: fol },                                     // roller arm
        { t: 'cyl', a: [rc[0], y - 0.01, rc[1]], b: [rc[0], y + 0.01, rc[1]], r: 0.02, mat: 'steel', colour: 0xc9ced6, body: fol },                                   // roller
        { t: 'cyl', a: [LV.pivot[0], y, LV.pivot[1]], b: [LV.tip[0], y, LV.tip[1]], r: 0.012, mat: '4130', colour: 0x5aa0d8, body: fol },                             // cable arm
        { t: 'sphere', c: [DOOR.fairlead[0], y, DOOR.fairlead[1]], r: 0.02, mat: 'nylon', colour: 0x333333, body: 'fixed' },                                         // fairlead
        { t: 'cyl', a: [LV.tip[0], y, LV.tip[1]], b: [DOOR.fairlead[0], y, DOOR.fairlead[1]], r: 1 / 192, mat: 'steel', colour: 0xd0d4da, body: 'cable', draw: false }]; }),
    std: 'MIL-DTL-83420 1/16 in 7×7 galvanised cable (break 480 lb); nylon fairleads; Nicopress sleeves',
    hardware: [{ std: 'MS21251-B2S', qty: 2, desc: 'turnbuckle, door cable' }, { std: 'MS51844-2', qty: 4, desc: 'Nicopress sleeve' }, { std: 'AN3-12A', qty: 2, desc: 'follower pivot bolt' }],
    props: [['Cam', `base Ø ${(DOOR.camR * 24).toFixed(1)} in, rise ${(DOOR.lift * 12).toFixed(2)} in over the last ${Math.abs(KIN.au - KIN.aStop - KIN.dir * DOOR.rise).toFixed(0)}° of crank travel`], ['Follower', `roller arm ${(LV.roller * 12).toFixed(1)} in, cable arm ${(LV.arm * 12).toFixed(1)} in → ${(DOOR.cableTravel * 12).toFixed(2)} in of cable`], ['Sequence', 'doors stay open for the whole strut swing; close only in the up-lock dwell']],
    blurb: 'How the doors know where the gear is: a cam on each end of the worm-wheel cross-shaft. For the whole strut swing the follower rides the cam\'s base circle and the doors stay open on their springs. Once the strut lands on its up-stop the crank keeps turning through the up-lock (the spring link stretches over centre), and only then does the cam lobe lift the follower: its 3 in arm pulls the cable aft-to-forward, the quadrants turn and the doors close under the tyre. Cranking down reverses it: the doors are open before the strut moves.',
    steps: [S1('Fit cams to the cross-shaft (keyed, set screws safety-wired); fit followers; rig cables with turnbuckles', ['Doors start to move only after the strut is on the up-stop', 'Doors snug, not over-travelled, at full UP (cable ≈ 2 lb pre-tension)'])], src: { mass: 'ASSUMED', design: 'LEZ (sequence from the four-bar up-lock dwell)' } },
  { ...NGP, pn: 'LEZ-32-226', ngBody: 'fixed', name: 'Strut up-stop (urethane pad on the NG-30 cross member)', kind: 'machined', nha: 'LEZ-32-201', material: '6061', massEach: 0.1,
    geo: [{ t: 'box', c: strutPt(NG.phi1, 0.02, (secAt(0)[0] + 0.07) / 2 + 0.017), d: [0.11, 0.30, 0.03], mat: '6061', colour: 0x4b5563 }],
    blurb: 'The NG-6 casting lands on this pad at UP. The crank then goes on over centre, stretching the spring link, so the strut is held hard against the pad (up-lock) while the cam closes the doors.',
    steps: [S1('Bond and bolt the pad cross-member between the NG-30s', [`Strut up angle ${NG.phi1.toFixed(1)}° ± 0.3°`])], src: { mass: 'ASSUMED' } },
]);
defineKeepouts([
  ...[-1, 1].map((sg) => ({ id: `ko-ng-door-drive-${sg > 0 ? 'R' : 'L'}`, t: 'box', c: [(LV.pivot[0] + NG.A[0]) / 2 + 0.02, sg * DOOR.camY, (LV.tip[1] + NG.A[2] + DOOR.camR) / 2], d: [0.36, 0.06, NG.A[2] + DOOR.camR + 0.03 - LV.tip[1] + 0.04], why: 'door cam and follower', owner: 'LEZ-32-232' })),
  { id: 'ko-ng-box', t: 'box', c: [(NG.box[0] + F22) / 2, 0, 2.86], d: [F22 - NG.box[0], 0.14, 1.0], why: 'nose-gear box (crank, link, strut swing)', owner: 'LEZ-32-201' },
  { id: 'ko-ng-chan', t: 'box', c: [(F22 + WELL.s0) / 2, 0, 2.43], d: [WELL.s0 - F22, 2 * WELL.chan.halfW + 0.04, 0.5], why: 'nose-gear strut channel', owner: 'LEZ-32-220' },
  { id: 'ko-ng-well', t: 'box', c: [(WELL.s0 + WELL.s1) / 2, 0, 2.60], d: [WELL.s1 - WELL.s0, 2 * WELL.halfW + 0.04, 0.95], why: 'NB nose-wheel well', owner: 'LEZ-32-220' },
]);

// ------------------------------------------------------------------------------------------- loads
const wormEff = () => { const w = NG.worm, lam = Math.atan(w.lead / (Math.PI * w.pitchD)), rho = Math.atan(w.mu); return { eta: Math.tan(lam) / Math.tan(lam + rho), lam: lam / d2r }; };
const VLE = 100;                                     // KIAS, gear operating speed (ASSUMED placard)
const CDA = 0.30;                                    // ft², tyre + fork + strut exposed (ASSUMED)
const GEAR_W = MS_.strut + MS_.ng6 + MS_.ng3 + 0.4 + MS_.fork + 3.0;   // lb, swinging parts (sized)
const CG_U = 1.45;                                   // ft down the strut, swinging-mass CG (ASSUMED from the part layout)
const DOOR_SPRING = 1.5 / 12;                        // ft·lb, door torsion-spring torque near closed (ASSUMED)
const VNE = 180;                                     // KIAS (ASSUMED placard for the door load case)
/** door clearances and sequence (in, deg) */
export function doorClear() {
  // open door: lowest |y| of its inner face when hanging (rotate the inner edge about the tube axis)
  const th = DOOR.openDeg * d2r, zc = doorAxisZ(2.9), b0 = belly(2.9), rIn = [DOOR.yIn - DOOR.hingeY, b0 + DOOR.t - zc], rOut = [DOOR.yIn - DOOR.hingeY, b0 - zc];
  const rot = (v) => [v[0] * Math.cos(th) - v[1] * Math.sin(th), v[0] * Math.sin(th) + v[1] * Math.cos(th)];
  const yOpenMin = DOOR.hingeY + Math.min(rot(rIn)[0], rot(rOut)[0], 0) - DOOR.tubeR;
  const openTyre = (yOpenMin - NG.tyreW / 2) * 12, openFork = (yOpenMin - FY - LEGH) * 12;
  // closed: tyre bottom to the door's inner face
  const ax = axleAt(NG.phi1), closed = ((ax[2] - NG.R) - (belly(ax[0]) + DOOR.t)) * 12;
  // sequence: crank degrees from the strut landing on its up-stop to the cam starting to lift
  let aLift = null; for (const r of KIN.rows) if (camFrac(r.a) > 1e-4) { aLift = r.a; break; }
  const seq = Math.abs(aLift - KIN.aStop);
  // cam pressure angle (cycloidal rise: peak slope 2h/β on the base radius)
  const beta = Math.abs(KIN.au - KIN.aStop) * d2r - DOOR.rise * d2r, press = Math.atan(2 * DOOR.lift / ((DOOR.camR + 0.02) * beta)) / d2r;
  // tube to fork leg (fixed tube, fork passes inboard of it)
  const tubeFork = (DOOR.hingeY - DOOR.tubeR - FY - LEGH) * 12;
  return { openTyre, openFork, closed, seq, tubeFork, yOpenMin, press };
}
/** crank-shaft torque profile over the stroke: gravity, air drag below the belly, and the over-centre spring */
export function crankProfile() {
  const q = 0.5 * 0.002377 * (VLE * 1.6878) ** 2, R = KIN.rows, out = [], { eta } = wormEff();
  for (let i = 1; i < R.length; i++) {
    const a = R[i - 1], b = R[i], dA = (b.a - a.a) * d2r, dP = (b.phi - a.phi) * d2r, phi = (a.phi + b.phi) / 2;
    const ax = axleAt(phi), exposed = Math.max(0, Math.min(1, (belly(ax[0]) - (ax[2] - NG.R)) / (2 * NG.R)));
    const Mg = GEAR_W * CG_U * Math.sin(phi * d2r);                                  // lifting the gear (lb·ft, against retraction)
    const Ma = q * CDA * exposed * Math.max(0, NG.O[2] - ax[2]);                      // drag aft at the wheel (helps retract, opposes extend)
    const Fs = NG.spring.k * (NG.spring.pre + Math.abs(KIN.l - b.len) * 12), Ws = Fs * (Math.abs(KIN.l - b.len) - Math.abs(KIN.l - a.len));   // spring work (ft·lb) over the step (double-acting cartridge)
    const Wd = 2 * DOOR_SPRING * (camFrac(b.a) - camFrac(a.a)) * DOOR.closeDeg * d2r;   // closing both doors against their springs (ft·lb)
    const Tret = Math.abs(dA) > 0 ? ((Mg - Ma) * dP + Ws + Wd) / Math.abs(dA) : 0, Text = Math.abs(dA) > 0 ? ((Ma - Mg) * dP - Ws - Wd) / Math.abs(dA) : 0;   // lb·ft at the worm wheel
    out.push({ t: i / (R.length - 1), phi, Tret, Text, Fret: Math.max(0, Tret) / (NG.worm.N * eta * 0.9 * NG.crankR), Fext: Math.max(0, Text) / (NG.worm.N * eta * 0.9 * NG.crankR) });
  }
  return out;
}
/** stowed and swept clearances (in) */
export function stowClear() {
  const ax = axleAt(NG.phi1), R = NG.R, res = { wall: (WELL.halfW - NG.tyreW / 2) * 12, fork: (WELL.halfW - FY - 0.0125) * 12, ceil: 9, panel: (PANEL - (ax[0] + R)) * 12, flush: 0, swing: 9, f22: 9 };
  for (let k = 0; k <= 60; k++) { const s = ax[0] - R + 2 * R * k / 60, top = ax[2] + Math.sqrt(Math.max(0, R * R - (s - ax[0]) ** 2)); res.ceil = Math.min(res.ceil, (ceilAt(s) - top) * 12); }
  res.flush = (ax[2] - R - belly(ax[0])) * 12;           // + = tyre above the skin line
  // swing: every tyre point inside the skin must be inside the well (s ≥ s0) or within the slot width
  for (let p = NG.phi0; p <= NG.phi1; p += 0.5) { const a = axleAt(p); for (let k = 0; k < 36; k++) { const th = k * 10 * d2r, s = a[0] + R * Math.cos(th), z = a[2] + R * Math.sin(th); if (z > belly(s) + 0.01 && s < WELL.s0) res.swing = Math.min(res.swing, (Math.min(slotHW(s), s >= WELL.chan.s0 ? WELL.chan.halfW : 9) - NG.tyreW / 2) * 12); } }
  if (res.swing === 9) res.swing = (WELL.chan.halfW - NG.tyreW / 2) * 12;   // no tyre point inside the skin ahead of the well: the channel walls bound it
  // the shaft clears the shell
  for (let s = WELL.s0; s <= WELL.s1; s += 0.02) { const t = Math.min(1, Math.max(0, (s - NG.ujoint[0]) / (NG.crank[0] - NG.ujoint[0]))), z = s < NG.ujoint[0] ? NG.wormZ : NG.ujoint[2] + (NG.crank[2] - NG.ujoint[2]) * t; res.f22 = Math.min(res.f22, (z - 0.3125 / 24 - ceilAt(s) - WELL.wall) * 12); }
  return res;
}

registerChecks('wp11', (d, lc) => {
  if (lc.id !== 'W1-S1') return [];
  const out = [], tag = (r, pn) => { r.sys = pn; out.push(r); return r; }, n = noseLoads(d), FS = FS_(d);
  const MM = memberMargins(d), sg = (x) => `${x >= 0 ? '+' : ''}${x.toFixed(3)}`, itRows = (m) => SIZING.log.filter((r) => r.member === m).map((r) => [`Iteration ${r.it}: ${r.desc}`, `${r.mass.toFixed(2)} lb, MS ${sg(r.ms)}`, 'text']);
  const caseRows = MM.CS.map((k) => [`Case ${k.id}`, `ground ${Math.hypot(k.Fs, k.Fz, k.S).toFixed(0)} lb, link ${Math.abs(k.P).toFixed(0)} lb`, 'text']);
  // strut: worst station of the sized profile, fore-aft and lateral bending + axial, all three FAR 23.499 cases
  { const w = MM.strut.worst, at = MM.strut.at, q = profAt(SZ.strut, at);
    tag(mk('fuselage', 'ngear-strut', 'NG-1 strut, worst station of the tapered profile (aft, forward and side load cases)', lc, `strut ${(at * 12).toFixed(1)} in below the hinge`, w.sFa >= w.sLat ? 'fore-aft bending + axial, S-glass' : 'lateral bending + axial, S-glass', MM.strut.ms, {
      formula: 'FAR 23.499(a) V = 2.25·static, D = 0.8·V; (b) F = 0.4·V forward; (c) S = 0.7·V side, at the ground contact;  M(u) about each station with the link reaction at NG-3;  σ = FS·(M/Z_oct + N/A_oct), 1/8 in chamfers;  MS = F/σ − 1 at the worst of 11 stations',
      inputs: [['Gross weight (forward CG case)', MM.n.W, 'lb', 'MODEL'], ['CG', MM.n.cg * 12, 'in', 'MODEL'], ['Main / nose axle', `${(GEO.gear.s * 12).toFixed(1)} / ${(MM.n.sN * 12).toFixed(1)} in`, 'text', 'MODEL'],
        ['Section at the worst station', `${q.t.toFixed(3)} × ${q.b.toFixed(3)} in (fore-aft × lateral)`, 'text', 'SIZED'], ['Allowable (UD S-glass/epoxy, flexure)', MAT.sglass.F, 'psi', `BOUND: S-glass UD flexure ≥ 150 ksi typical, 100 ksi after environment and B-basis knock-downs (typed from memory); MS ≥ 0 down to ${(MAT.sglass.F / (1 + MM.strut.ms)).toFixed(0)} psi`], ['Sizing target', `+${TGT * 100} % at ultimate`, 'text', 'DESIGN'], ...caseRows],
      result: [['Static nose load', MM.n.stat, 'lb'], ['Fore-aft stress (ult.)', w.sFa, 'psi'], ['Lateral stress (ult.)', w.sLat, 'psi'], ['Strut mass', MM.strut.mass, 'lb'], ...itRows('NG-1 strut')] }), 'LEZ-32-200'); }
  // strut stiffness: tyre fore-aft deflection at limit aft load (shimmy and wheel-well clearance)
  tag(mk('fuselage', 'ngear-defl', 'NG-1 strut tip deflection at the limit aft load', lc, 'tyre contact', 'stiffness (shimmy, door and well clearance)', MM.deflMax / MM.defl - 1, {
    formula: 'δ = ∫ M(u)·(L−u) / (E·I(u)) du, cantilever from the hinge with the link at NG-3 (stations integrated);  MS = δ_max / δ − 1',
    inputs: [['E (UD S-glass/epoxy)', MAT.sglass.E, 'psi', `BOUND: UD S-glass/epoxy E 7–8 Msi (typed from memory); MS ≥ 0 down to ${(MAT.sglass.E * MM.defl / MM.deflMax / 1e6).toFixed(2)} Msi`], ['Deflection limit', MM.deflMax, 'in', 'DESIGN (shimmy, door and well clearance limit)']],
    result: [['Tip deflection (limit)', MM.defl, 'in']] }), 'LEZ-32-200');
  // fork legs
  tag(mk('fuselage', 'ngear-fork', `Fork legs (${SZ.leg.h} × ${SZ.leg.b} × ${SZ.leg.w} in oval 4130), drag + side bending at the crown`, lc, 'fork crown', 'combined bending + axial, welded 4130', MM.leg.ms, {
    formula: 'per leg: M_fa = D/2·L (cantilever from the crown);  M_lat = S/2·L/2 (portal frame: crown and clamped axle);  P = V/2 + S·R/span (side couple about the axle);  σ = FS·(M_fa/Z_fa + M_lat/Z_lat + P/A), oval tube;  welded 80 ksi',
    inputs: [['Leg length crown to axle', MM.leg.Lleg, 'in', 'GEOMETRY'], ['Tyre radius', NG.R * 12, 'in', 'CATALOGUE'], ['Lateral envelope (tyre to door torque tube)', MM.leg.env, 'in', 'GEOMETRY'], ['Tube', `${SZ.leg.h} × ${SZ.leg.b} × ${SZ.leg.w} in oval 4130`, 'text', 'SIZED']],
    result: [['Fore-aft moment (limit)', MM.leg.Mfa, 'in·lb'], ['Lateral moment (limit)', MM.leg.Mlat, 'in·lb'], ['Leg axial (limit)', MM.leg.Pleg, 'lb'], ['Stress (ult.)', MM.leg.s, 'psi'], ...itRows('Fork legs')] }), 'LEZ-32-206');
  // spring link: rod column and pins
  tag(mk('fuselage', 'ngear-link', `Spring link (${SZ.rod.od} in ${SZ.rod.kind}), cartridge solid: rod column and AN${SZ.linkBolt} pins in double shear`, lc, 'NG-64 → NG-3', MM.link.col.Pa < MM.link.boltL ? MM.link.col.mode : 'pin shear', MM.link.ms, {
    formula: 'P = max over the three cases of M_hinge / (r_C × e_link);  cartridge solid at limit;  MS = min(P_cr, 2·P_s) / (FS·P) − 1',
    inputs: [['Link pin-to-pin', KIN.l * 12, 'in', 'GEOMETRY'], ['Rod', `${SZ.rod.od} in ${SZ.rod.kind}${SZ.rod.kind === 'tube' ? ` × ${SZ.rod.w}` : ''} 4130, F_cy ${MAT.c4130.Fty / 1000} ksi, E ${MAT.c4130.E / 1e6} Msi`, 'text', 'MMPDS-typical'], [`AN${SZ.linkBolt} single shear`, AN_SHEAR[SZ.linkBolt], 'lb', 'AN standard'], ...caseRows],
    result: [['Link force (limit, worst case)', MM.pmax, 'lb'], ['Column allowable', MM.link.col.Pa, 'lb'], ['Pin allowable (double shear)', MM.link.boltL, 'lb'], ...itRows('Spring-link rod')] }), 'LEZ-32-213');
  // NG-64 crank arm
  tag(mk('fuselage', 'ngear-arm', `NG-64 crank arm (${SZ.arm.w} × ${SZ.arm.t} in 4130 bar)`, lc, 'NG-64 at the cross-shaft', 'axial + bending from the link off-line angle', MM.arm.ms, {
    formula: 'σ = FS·(P/A + P·r·sin(β+1°)/Z), Z = t·w²/6;  1° added for rigging tolerance on the over-centre angle',
    inputs: [['Crank radius', NG.r * 12, 'in', 'GEOMETRY'], ['Over-centre', NG.beta, '°', 'DESIGN'], ['Bar', `${SZ.arm.w} × ${SZ.arm.t} in`, 'text', 'SIZED']],
    result: [['Stress (ult.)', MM.arm.s, 'psi'], ...itRows('NG-64 crank arm')] }), 'LEZ-32-212');
  // NG-3 clevis ears
  tag(mk('fuselage', 'ngear-ng3', `NG-3 clevis ears (${SZ.ear.t} in 4130), pin bearing`, lc, 'NG-3 link pin', 'bearing, 4130 sheet', MM.ear.ms, {
    formula: 'σ_br = FS·P / (2·d·t);  F_bru 4130 (MMPDS-typical)', inputs: [['Pin diameter', SZ.linkBolt / 16, 'in', 'SIZED'], ['Ear thickness', SZ.ear.t, 'in', 'SIZED'], ['F_bru', MAT.c4130.Fbru, 'psi', 'MMPDS-typical']],
    result: [['Bearing stress (ult.)', MM.ear.s, 'psi'], ...itRows('NG-3 clevis ears')] }), 'LEZ-32-204');
  // hinge bolt
  tag(mk('fuselage', 'ngear-hinge', `Hinge bolt AN${SZ.hingeBolt} (double shear) and NG-8 disc bearing`, lc, 'NG-8 / NG-6 hinge', MM.hinge.shear < MM.hinge.bear ? 'bolt double shear' : 'disc bearing, 6061', MM.hinge.ms, {
    formula: 'R = max over the three cases of |hinge reaction|;  MS = min(2·P_s, 2·d·t·F_bru) / (FS·R) − 1',
    inputs: [[`AN${SZ.hingeBolt} single shear`, AN_SHEAR[SZ.hingeBolt], 'lb', 'AN standard'], ['NG-8 disc', '1/4 in 6061-T6, F_bru 88 ksi', 'text', 'MMPDS-typical']],
    result: [['Hinge reaction (limit)', MM.Ro, 'lb'], ['Shear allowable', MM.hinge.shear, 'lb'], ['Bearing allowable', MM.hinge.bear, 'lb'], ...itRows('Hinge bolt')] }), 'LEZ-32-202');
  // axle
  tag(mk('fuselage', 'ngear-axle', 'Nose axle, 5/8 in pin flush with the axle bosses (fixed by the wheel bearings), double shear', lc, 'fork axle', 'pin double shear', MM.axle.ms, {
    formula: 'R = √(V² + D² + S²) (all three at once: conservative);  MS = 2·P_s / (FS·R) − 1, P_s the AN10 single-shear rating (pin heat-treated to the AN bolt strength, 125 ksi)', inputs: [['5/8 in pin single shear (AN10 rating)', AN_SHEAR[10], 'lb', 'DESIGN: 4130 pin heat-treated to 125 ksi F_tu, rated as AN10 (AN standard)']],
    result: [['Axle resultant (limit)', MM.axle.R, 'lb']] }), 'LEZ-32-206');
  // spring preload holds the over-centre lock under taxi loads and the rigging test
  { const Ptaxi = Math.abs(linkForce(hingeMoment(0.3 * n.stat, n.stat))), P100 = Math.abs(linkForce(hingeMoment(100, 0))), Fpre = NG.spring.k * NG.spring.pre, Pg = Math.max(Ptaxi, P100);
    tag(mk('fuselage', 'ngear-spring', 'Die-spring preload vs link force at taxi loads (no movement at the lock)', lc, 'spring link', 'preload', Fpre / Pg - 1, {
      formula: 'P = M_hinge / (r_C × e_link) for 1 g vertical + 0.3 g drag, and for the 100 lb rigging pull;  MS = F_preload / P − 1',
      inputs: [['Die spring rate (nested pair)', NG.spring.k, 'lb/in', `VENDOR: ${NG.spring.parts.join(' + ')}, 78 + 21 lbf/mm (McMaster-Carr ISO 10243 table, accessed 2026-11-19)`], ['Stack rated load at 25 % deflection', NG.spring.maxLb, 'lb', 'VENDOR (McMaster-Carr, accessed 2026-11-19)'], ['Preload deflection', NG.spring.pre, 'in', 'DESIGN (set by the cartridge nut)'], ['Static nose load', n.stat, 'lb', 'MODEL'], ['Builder note', '≈1,094 lb die spring quoted from Canard Pusher 25 [CZ]', 'text', 'PUBLIC']],
      result: [['Preload', Fpre, 'lb'], ['Link force, taxi', Ptaxi, 'lb'], ['Link force, 100 lb rigging pull', P100, 'lb']] }), 'LEZ-32-213'); }
  // over-centre lock geometry and worm self-locking
  { const { lam } = wormEff(), rho = Math.atan(NG.worm.mu) / d2r, ms = Math.min(NG.beta / 2, rho / lam) - 1;
    tag(mk('fuselage', 'ngear-lock', 'Down lock: over-centre angle and worm self-locking', lc, 'NG-64 crank / worm', 'lock geometry', ms, {
      formula: 'MS = min(β / 2°, ρ / λ) − 1;  β over-centre at the stop, λ worm lead angle, ρ = atan μ (no back-drive when λ < ρ)',
      inputs: [['Over-centre at the stop β', NG.beta, 'deg', 'GEOMETRY'], ['Required β', 2, 'deg', 'DESIGN (rigging tolerance ±1° on 3°)'], ['Worm lead angle λ', lam, 'deg', 'DERIVED'], ['Friction μ', NG.worm.mu, '', `BOUND: hardened steel worm on bronze, lubricated, 0.05–0.10 (typed from memory); the lock holds while μ > tan λ = ${Math.tan(lam * d2r).toFixed(3)}`]],
      result: [['Friction angle ρ', rho, 'deg'], ['Crank turns DOWN → UP', NG.turns, 'turns']] }), 'LEZ-32-212'); }
  // pilot crank force over the stroke
  { const pr = crankProfile(), Fr = Math.max(...pr.map((p) => p.Fret)), Fe = Math.max(...pr.map((p) => p.Fext)), F = Math.max(Fr, Fe), Fall = 20, { eta } = wormEff();
    tag(mk('fuselage', 'ngear-crank', 'Pilot crank force, retract and extend at V_LE (gravity, air drag, over-centre spring)', lc, 'panel crank', 'pilot effort', Fall / F - 1, {
      formula: 'T_wheel = (ΣM·dφ + spring work) / dα;  F_crank = T_wheel / (N·η·0.9·R_crank);  MS = F_allow / F_max − 1',
      inputs: [['V_LE (placard)', VLE, 'KIAS', 'DESIGN (placard)'], ['Exposed CdA', CDA, 'ft²', 'BOUND: tyre 2.8 × 10.2 in + fork + strut at Cd ≈ 1 (≈ 0.25 ft²), rounded up'], ['Swinging weight', GEAR_W, 'lb', 'MODEL'], ['Worm ratio N', NG.worm.N, '', 'GEOMETRY'], ['Worm efficiency η', eta, '', 'DERIVED'], ['Crank radius', NG.crankR * 12, 'in', 'GEOMETRY'], ['Allowable crank force', Fall, 'lb', 'BOUND: one-hand crank, sustained (human-factors guidance typed from memory, 20–30 lb); the lower value used']],
      result: [['Peak force, retract', Fr, 'lb'], ['Peak force, extend', Fe, 'lb'], ['Crank turns', NG.turns, 'turns']] }), 'LEZ-32-214'); }
  // stowage and swing clearances
  { const c = stowClear(), need = 0.25, min = Math.min(c.wall, c.fork, c.ceil, c.panel, c.swing, c.f22);
    tag(mk('fuselage', 'ngear-stow', 'Wheel stows in the NB well: clearances through the swing and gear-up', lc, 'NB well', 'clearance', min / need - 1, {
      formula: 'tyre envelope (OD, width) at every strut angle vs. well walls, contoured ceiling, panel and belly slot;  MS = min clearance / 0.25 in − 1',
      inputs: [['Tyre OD × width', `${(NG.R * 24).toFixed(1)} × ${(NG.tyreW * 12).toFixed(1)} in`, 'text', 'Azusa 280/250-4'], ['Well half-width', WELL.halfW * 12, 'in', 'GEOMETRY'], ['Slot half-width', WELL.slot.halfW * 12, 'in', 'GEOMETRY']],
      result: [['Tyre to well wall', c.wall, 'in'], ['Fork to well wall', c.fork, 'in'], ['Tyre to ceiling (min)', c.ceil, 'in'], ['Tyre to panel', c.panel, 'in'], ['Tyre in the slot during the swing', c.swing, 'in'], ['Crank shaft to shell', c.f22, 'in'], ['Tyre bottom above the skin line', c.flush, 'in']] }), 'LEZ-32-220'); }
  // wheel-well doors: clearances and sequence
  { const c = doorClear(), ms = Math.min(c.openFork / 0.15, c.openTyre / 0.25, c.tubeFork / 0.15, c.closed / 0.0625, c.seq / 0.5, 45 / c.press) - 1;
    tag(mk('fuselage', 'ngear-door-clear', 'Well doors: open clear of tyre and fork, close only after the wheel is home, clear the stowed tyre', lc, 'well doors', 'clearance / sequence', ms, {
      formula: 'MS = min(open door/tube to fork / 0.15 in, open door to tyre / 0.25 in, tube to fork / 0.15 in, closed door to tyre / (1/16 in), cam lead / 0.5°, 45° / cam pressure angle) − 1',
      inputs: [['Door open angle', DOOR.openDeg, 'deg', 'GEOMETRY'], ['Door laminate', DOOR.t * 12, 'in', 'DESIGN'], ['Cam rise starts after up-stop', DOOR.rise, 'crank deg', 'GEOMETRY']],
      result: [['Open door to fork leg', c.openFork, 'in'], ['Open door to tyre', c.openTyre, 'in'], ['Torque tube to fork leg', c.tubeFork, 'in'], ['Closed door to stowed tyre', c.closed, 'in'], ['Strut on up-stop before doors move', c.seq, 'crank deg'], ['Up-lock dwell', NG.dwell, 'crank deg'], ['Cam pressure angle (peak)', c.press, 'deg'], ['Cam rise', DOOR.lift * 12, 'in']] }), 'LEZ-32-230'); }
  // door suction at VNE held by the cable (doors closed, gear up)
  { const q = 0.5 * 0.002377 * (VNE * 1.6878) ** 2, A = (DOOR.s1 - DOOR.s0) * (DOOR.yOut - DOOR.yIn), F = 0.6 * q * A, M = F * (DOOR.hingeY - (DOOR.yIn + DOOR.yOut) / 2) + DOOR_SPRING, T = M / (DOOR.hornR * 0.6), brk = 480;   // cable at ≥ 37° to the horn when shut
    tag(mk('fuselage', 'ngear-door-load', 'Closed well door under belly suction at V_NE, held by its cable', lc, 'door cable', 'cable break', brk / (FS * T) - 1, {
      formula: 'F = Cp·q·A (Cp −0.6);  M = F·arm + spring;  T = M / (r_horn·sin γ), γ ≥ 37° cable-to-horn when shut;  MS = T_break / (FS·T) − 1',
      inputs: [['V_NE', VNE, 'KIAS', 'DESIGN (placard)'], ['Door area', A * 144, 'in²', 'GEOMETRY'], ['Suction coefficient', -0.6, '', `BOUND: belly Cp −0.3 to −0.6 near the nose (typed from memory); MS ≥ 0 down to Cp ${(-0.6 * (1 + brk / (FS * T) - 1)).toFixed(1)}`], ['Horn radius', DOOR.hornR * 12, 'in', 'GEOMETRY'], ['Cable', '1/16 in 7×7, 480 lb break', 'text', 'MIL-DTL-83420']],
      result: [['Door load', F, 'lb'], ['Hinge moment', M * 12, 'in·lb'], ['Cable tension (limit)', T, 'lb']] }), 'LEZ-32-232'); }
  // up-lock: spring link squeeze through the up toggle within the cartridge stroke
  { const avail = NG.spring.solid - NG.spring.pre, ms = Math.min(avail / NG.uplockIn, NG.gammaUp / 2) - 1;
    tag(mk('fuselage', 'ngear-uplock', 'Up-lock: spring-link squeeze through the up toggle inside the cartridge stroke; over-centre at UP', lc, 'spring link at UP', 'stroke / lock geometry', ms, {
      formula: 'δ = max |L(α) − L_free| with the strut on its up-stop;  MS = min((δ_solid − δ_pre) / δ, γ_up / 2°) − 1',
      inputs: [['Cartridge stroke beyond preload', avail, 'in', 'DESIGN (cartridge drawing)'], ['Over-centre at UP γ', NG.gammaUp, 'deg', 'GEOMETRY']],
      result: [['Squeeze through the toggle', NG.uplockIn, 'in'], ['Up-lock dwell', NG.dwell, 'crank deg'], ['Link sense at UP', KIN.upSense, 'text']] }), 'LEZ-32-213'); }
  return out;
});

defineReqs([
  { id: 'R-GEAR-4', ref: '23.729 / 23.499', title: 'Retracting nose gear: positive down and up locks, loads, crank effort, stowage clear of structure, well doors sequenced and fail-safe open, position indication and warning', checks: /^ngear-(strut|defl|fork|link|arm|ng3|hinge|axle|spring|lock|crank|stow|uplock|door-clear|door-load)$/, method: 'analysis', closed: true,
    verify: () => ({ ok: !!partByPN('LEZ-32-216') && !!partByPN('LEZ-31-150'), detail: `over-centre crank ${NG.beta}° past centre + non-back-drivable worm; DOWN flag at the panel crank; gear-not-down switch on the NG-64 arm to the warning unit; ${NG.turns.toFixed(1)} crank turns` }) },
]);
void noseGearPose;
