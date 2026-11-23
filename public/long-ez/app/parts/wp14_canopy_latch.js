// WP14 — canopy latch, safety catch, hinge and restraint (ATA 52 / 56), detailed.
//  LOCK: the pilot pushes the handle down and forward along the left canopy rail; a 3/4 in crank and a 3 in link drive the
//  latch rod forward 1.2 in, carrying a bronze roller into each of three hooks on the left longeron. The hook throats
//  ramp down 0.04 in toward the closed end, so the rollers draw the canopy onto its seal (a clamping latch [EAA]). The
//  toggle ends 5° past dead centre on a stop: any aft load on the rod drives it harder onto the stop. A pin switch at the
//  forward hook closes only in the last 1/8 in of rod travel, so the CANOPY light and tone stay on until the rod is home.
//  SC-1: a spring stainless catch on the front of the left frame snaps under a lip on the longeron whenever the canopy is
//  shut; if the main latch is left open the canopy lifts ½ in and stops [RAF mandatory, builder logs]. Press it inboard to
//  release (reachable with the canopy cracked open). Outside: a flush access door with a cam lock over the handle [CZ].
//  Hinge along the right sill (existing LEZ-56-110), gas strut (LEZ-56-120) and a stainless check cable as the open stop.
// Notional: sizes from this model's loads (FAR 23.783 / 23.625 yardsticks); the plans govern a real airplane.
import { registerChecks, mk, psi, allowB } from '../structures.js';
import { defineParts, defineReqs, defineKeepouts } from '../systems.js';
import { CL, CAN, CP, cpBound, canopyArea, suction, canopySill, latchPose, toggleRate } from './canopy_layout.js';
import { HINGE } from './wp4_avionics_cabin.js';
import { CABLE, wallAt, bandAt, surfY } from './wpB1_canopy.js';

const S1 = (title, inspect) => ({ title, inspect });
const IN = 1 / 12, FF = 1.15, TGT = 0.15, d2r = Math.PI / 180;
// AN shear: Fsu 75 ksi × π/4 d² (MIL-HDBK-5J, derived). 4130 Fbru 145 ksi at e/D 1.5: BOUND (the e/D 1.5 column was not in the transcriptions found;
// below the e/D 2.0 200 ksi). 301 ½ hard 150 / 110 ksi, E 28 Msi, AMS 5518: src 'Aircraft Materials AMS 5518 page (accessed 2026-11-19)'
const AN_SHEAR = { 3: 2126, 4: 3682, 5: 5750 }, F4130 = { tu: 95000, ty: 75000, bru: 145000 }, SS301 = { tu: 150000, ty: 110000, E: 28e6 };
const CAB = { massItem: 'cabin' };
const { st, zT, yH, yR, hook: H, roller: RL, rod: ROD } = CL;

// ------------------------------------------------------------------------------------------- loads
/** canopy suction at speed V (kt): Cp −0.6 average over the plan area (a BOUND, canopy_layout.js CP); the hinge and the
 *  latch side share it; the latch side is spread over the hooks with a 1.33 uneven-fit factor */
const perHook = (V) => suction(V) / 2 / st.length * 1.33;
/** latch effort and design speeds, set by this design (rigging and placards), not assumed */
export const LDES = { preload: 30, mu: 0.10, vCatch: 100, gust: 40 };
/** hinge fastening (LEZ-56-110): leaf riveted to the frame, the sill leaf screwed into nutplates potted in the sill */
// rivetSs: MS20470AD4 single shear 368 lb = 2117-T (AD) 30 ksi on the 1/8 in shank: src 'FAA AC 43.13-1B ch. 4 table 4-8 (RAANZ mirror, accessed 2026-11-19)'
export const HFIX = { rivetP: 1.0, rivetSs: 368, screwP: 2.0, screwT: 1000, insD: 0.50, insL: 0.40 };

// ------------------------------------------------------------------------------------------- sizing (rod tube, axle)
const TUBES = [[0.375, 0.035], [0.375, 0.049], [0.5, 0.035], [0.5, 0.049]];
const tubeZ = (od, w) => { const ri = od / 2 - w; return Math.PI * ((od / 2) ** 4 - ri ** 4) / (4 * (od / 2)); };
const SUP = 0.16 * 12;                                             // in, guide brackets ±0.08 ft either side of each hook
function sizeLatch(VD) {
  const P = perHook(VD) * 1.5 * FF;                                // ult × fitting factor
  const rod = TUBES.find(([od, w]) => F4130.tu / (P * SUP / 4 / tubeZ(od, w)) - 1 >= TGT) || TUBES.at(-1);
  const cant = 0.30;                                               // in, roller load to the rod clamp face
  const axle = [3, 4, 5].find((k) => { const d = k / 16, Z = Math.PI * d ** 3 / 32; return 125000 / (P * cant / Z) - 1 >= TGT; });
  return { P, rod, axle, cant };
}
export const LSZ = sizeLatch(175);

// ------------------------------------------------------------------------------------------- geometry
const sgL = -1, by = (y) => y;  void sgL;
const tH = H.t * IN, thrH = H.throatH * IN, jaw = H.jaw * IN, rR = RL.od / 24, rodR = ROD.od / 24;
/** hook (LEZ-52-130), ft: a C-hook opening aft, throat closed end at s − 0.03, mouth at s + 0.05; a tongue runs forward
 *  along the wall on the throat line, so its two flush screws go into potted nutplates inside the top longeron band of
 *  the shell (LEZ-53-150), fitted from inside; a G10 spacer fills the plate-to-wall gap. */
export const hookWall = (s) => wallAt(s, zT * 12) / 12;   // wall BL at the throat line (ft, magnitude)
export const HOOK_SCREW = { ds: [-0.10, -0.19], d: 0.190, std: 'NAS1580 / MS24694-type 100° flush screw #10-32 (3/16 in), into an MS21047 nutplate potted in the band' };
const hookGeo = (s) => {
  const sE = s - 0.03, sM = s + 0.05, zc = zT, plateOut = -yH + tH / 2, wall = hookWall(s), gap = wall - plateOut;
  return [
    { t: 'box', c: [(sE + sM) / 2, yH, zc + thrH / 2 + jaw / 2], d: [sM - sE + 0.03, tH, jaw], mat: '4130', colour: 0x5a6672 },        // upper jaw
    { t: 'box', c: [(sE + sM) / 2 + 0.01, yH, zc - thrH / 2 - jaw / 2], d: [sM - sE + 0.05, tH, jaw], mat: '4130', colour: 0x5a6672 }, // lower jaw (lead-in)
    { t: 'box', c: [sE - 0.015, yH, zc], d: [0.03, tH, thrH + 2 * jaw], mat: '4130', colour: 0x5a6672 },                              // web
    { t: 'box', c: [sE - 0.13, yH, zc], d: [0.20, tH, thrH + 2 * jaw], mat: '4130', colour: 0x5a6672 },                               // tongue forward on the throat line
    { t: 'box', c: [sE - 0.10, -(plateOut + gap / 2), zc], d: [0.26, gap, thrH + 2 * jaw], mat: 'g10', colour: 0x7c8a5a },             // spacer to the wall
    ...HOOK_SCREW.ds.map((ds) => ({ t: 'cyl', a: [s + ds, yH + tH / 2, zc], b: [s + ds, -(wall + 0.025), zc], r: HOOK_SCREW.d / 24, mat: 'steel', colour: 0x8c96a3 })),   // into the nutplate in the band
  ];
};
// rod body (moves fore-aft with the latch and swings with the canopy): locked position
const sLock = (s) => s - 0.03 + rR + 0.004;                        // roller seated at the throat's closed end
const rodS0 = CL.switchS + 0.05, rodS1 = st[2] + 0.12;
const rodGeo = [
  { t: 'cyl', a: [rodS0, yR, zT], b: [rodS1, yR, zT], r: rodR, wall: ROD.w * IN, mat: '4130', colour: 0xc9ced6, body: 'latchRod' },
  ...st.flatMap((s) => [
    { t: 'cyl', a: [sLock(s), yR + 0.012, zT], b: [sLock(s), yH - tH / 2 - 0.008, zT], r: LSZ.axle / 32 * IN, mat: 'steel', colour: 0x8c96a3, body: 'latchRod' },   // axle
    { t: 'cyl', a: [sLock(s), yH + tH / 2 + 0.002, zT], b: [sLock(s), yH - tH / 2 - 0.002, zT], r: rR, mat: 'bronze', colour: 0xb08d57, body: 'latchRod' },          // roller in the throat
    { t: 'box', c: [sLock(s), yR + 0.005, zT], d: [0.07, 0.035, 0.06], mat: '6061', colour: 0x9aa4ae, body: 'latchRod' }]),                                     // clamp block on the rod
  { t: 'box', c: [rodS0 + 0.01, yR, zT - 0.035], d: [0.02, 0.03, 0.05], mat: '6061', colour: 0x9aa4ae, body: 'latchRod' },                                   // switch striker
  { t: 'cyl', a: [CL.sC(CL.aLock), yR - 0.012, zT], b: [CL.sC(CL.aLock), yR + 0.03, zT], r: 0.025, mat: '4130', colour: 0x5aa0d8, body: 'latchRod' },         // link clevis on the rod
];
// canopy-borne fixed pieces: guide brackets with Delrin bushings, handle pivot bracket and stop, SC-1 spring catch
const frameZ = (s) => canopySill(s, -1)[2] + 0.02;
const guideGeo = st.flatMap((s) => [s - 0.08, s + 0.10].map((sb) => [
  { t: 'box', c: [sb, yR + 0.02, (frameZ(sb) + zT - 0.03) / 2], d: [0.05, 0.0052, frameZ(sb) - zT + 0.03], mat: '6061', colour: 0x9aa4ae, body: 'canopy' },
  { t: 'cyl', a: [sb - 0.02, yR, zT], b: [sb + 0.02, yR, zT], r: rodR + 0.012, mat: 'acetal', colour: 0x222222, body: 'canopy' }])).flat();
const handleBodyGeo = (() => {   // crank + handle lever + knob, drawn at the locked pose (rotates about the pivot axis)
  const P = CL.P, a = CL.aLock, B = CL.B(a), la = a + CL.leverOff, K = [P[0] + CL.lever * Math.cos(la), P[1] + CL.lever * Math.sin(la)];
  return [
    { t: 'cyl', a: [P[0], yR + 0.03, P[1]], b: [B[0], yR + 0.03, B[1]], r: 0.022, mat: '4130', colour: 0x5aa0d8, body: 'latchHandle' },           // crank arm
    { t: 'cyl', a: [P[0], yR + 0.045, P[1]], b: [K[0], yR + 0.045, K[1]], r: 0.025, mat: '6061', colour: 0x2b2f36, body: 'latchHandle' },          // handle lever
    { t: 'sphere', c: [K[0], yR + 0.045, K[1]], r: 0.05, mat: 'nylon', colour: 0xc8302a, body: 'latchHandle' },                                     // knob
    { t: 'cyl', a: [P[0], yR + 0.015, P[1]], b: [P[0], yR + 0.065, P[1]], r: 0.03, mat: '4130', colour: 0x5aa0d8, body: 'latchHandle' }];            // hub
})();
/** the left rail's outer surface (|BL|, in) at the pivot: the outside-release shaft ends just inside it */
export const RAIL_OUT = surfY(CL.P[0], CL.P[1] * 12);
const pivotGeo = [
  { t: 'box', c: [CL.P[0], yR + 0.005, (frameZ(CL.P[0]) + CL.P[1] - 0.02) / 2], d: [0.12, 0.0052, frameZ(CL.P[0]) - CL.P[1] + 0.06], mat: '4130', colour: 0x9aa4ae, body: 'canopy' },   // pivot bracket
  { t: 'cyl', a: [CL.P[0], yR - 0.005, CL.P[1]], b: [CL.P[0], yR + 0.075, CL.P[1]], r: 0.25 / 24, mat: 'steel', colour: 0x8c96a3, body: 'canopy' },                                  // AN4 pivot bolt
  { t: 'box', c: [CL.B(CL.aLock)[0] - 0.01, yR + 0.03, CL.B(CL.aLock)[1] - 0.03], d: [0.03, 0.03, 0.02], mat: 'urethane', colour: 0x333333, body: 'canopy' },                      // over-centre stop
  { t: 'cyl', a: [CL.P[0], yR - 0.005, CL.P[1]], b: [CL.P[0], -(RAIL_OUT - 0.10) / 12, CL.P[1]], r: 0.15 / 12, mat: '4130', colour: 0x9aa4ae, body: 'canopy', external: true /* inside the canopy rail: the containment test has no canopy OML */ },          // square-drive shaft out through the rail (outside release)
];
const cq = canopySill(CL.catchS, -1);
const sc1Geo = [
  { t: 'box', c: [CL.catchS, -0.875, (cq[2] + 3.245) / 2], d: [0.08, 0.040 * IN, cq[2] - 3.245], mat: '301', colour: 0xd9dde2, body: 'canopy' },     // spring leg
  { t: 'box', c: [CL.catchS, -0.890, 3.245], d: [0.08, 0.03, 0.040 * IN], mat: '301', colour: 0xd9dde2, body: 'canopy' },                           // foot under the lip
  { t: 'box', c: [CL.catchS, -0.875, cq[2] - 0.02], d: [0.10, 0.02, 0.04], mat: 'glass', colour: 0x8899aa, body: 'canopy' },                       // frame hard point
];
const catchLip = { t: 'box', c: [CL.catchS, -0.905, 3.245 + 0.04 + 0.006], d: [0.10, 0.04, 0.012], mat: '6061', colour: 0x9aa4ae };            // ½ in above the foot
const lipWall = wallAt(CL.catchS, (3.245 + 0.046) * 12) / 12, lipGap = lipWall - 0.925;
const lipSpacer = { t: 'box', c: [CL.catchS, -(0.925 + lipGap / 2), 3.245 + 0.046], d: [0.10, lipGap, 0.06], mat: 'g10', colour: 0x7c8a5a };   // lip block to the wall (band)
const SW = [CL.switchS, yR, zT - 0.045];
/** outside release (LEZ-52-150): cover disc flush in the rail's outer skin on the handle axis, its ring, the cam lock */
const DOOR_GEO = [
  { t: 'cyl', a: [CL.P[0], -(RAIL_OUT - 0.06) / 12, CL.P[1]], b: [CL.P[0], -RAIL_OUT / 12, CL.P[1]], r: 0.50 / 12, mat: 'glass', colour: 0xe8e8e4, body: 'canopy', external: true },
  { t: 'cyl', a: [CL.P[0], -(RAIL_OUT - 0.30) / 12, CL.P[1]], b: [CL.P[0], -(RAIL_OUT - 0.06) / 12, CL.P[1]], r: 0.58 / 12, wall: 0.10 / 12, mat: '6061', colour: 0x9aa4ae, body: 'canopy', external: true },
  { t: 'cyl', a: [CL.P[0] + 0.025, -(RAIL_OUT - 0.55) / 12, CL.P[1]], b: [CL.P[0] + 0.025, -(RAIL_OUT - 0.06) / 12, CL.P[1]], r: 0.15 / 12, mat: 'steel', colour: 0x8c96a3, body: 'canopy', external: true },
];  // DOOR_GEO lies in the canopy rail (inside the canopy's OML, which the containment test does not model)

defineParts([
  { ...CAB, pn: 'LEZ-52-100', name: 'Canopy latch assembly: handle and over-centre toggle, latch rod, three hooks, safety catch, outside access, warning switch', kind: 'install', ata: 52, nha: 'LEZ-56-100', massEach: 0.15,
    geo: [{ t: 'box', c: [st[1], yR, zT], d: [0.1, 0.05, 0.05], draw: false }],
    latch: { hooks: st.length, overCentreDeg: CL.beta, strokeIn: CL.stroke * 12, handleArm: CL.lever * 12 },
    props: [['Hooks', `${st.length}, at FS ${st.map((s) => (s * 12 - 20).toFixed(0)).join(' / ')} (published FS)`], ['Rod stroke', `${(CL.stroke * 12).toFixed(2)} in for ${CL.travelDeg.toFixed(0)}° of handle`], ['Toggle', `crank ${(CL.r * 12).toFixed(2)} in, link ${(CL.L * 12).toFixed(2)} in, ${CL.beta}° over centre onto a stop`]],
    blurb: 'Top assembly. LOCK: handle down and forward along the left rail; the rod slides 1.2 in forward and a roller enters each of three hooks on the left longeron, drawing the canopy onto its seal; the toggle snaps 5° over centre onto its stop. UNLOCK: lift the handle (about 100°) through the snap. The CANOPY light and tone stay on until the rod is fully home. The SC-1 catch holds the canopy ½ in open if it is ever left unlatched.',
    steps: [S1('Fit hooks, then the rod and handle with the canopy closed on its seal; set the toggle stop', ['Every roller seated at its throat end with the handle on the stop', 'Handle cannot reach the stop with any roller out of its hook', 'Canopy cannot be lifted at the latch side with the handle locked (30 lb pull)']),
      S1('Rig the warning switch and the SC-1', ['CANOPY light off only in the last 1/8 in of rod travel', 'Unlatched canopy stops at ½ in on the SC-1; releases with a thumb push'])], src: { mass: 'install hardware', design: 'Long-EZ plans arrangement as builders describe it [LP-push] [CZ]; LEZ detail' } },
  { ...CAB, pn: 'LEZ-52-110', name: 'Latch handle and over-centre toggle: crank, lever, knob, pivot bracket, stop', kind: 'machined', ata: 52, nha: 'LEZ-52-100', material: '4130 / 6061', massEach: 0.35,
    geo: [...handleBodyGeo, ...pivotGeo],
    hardware: [{ std: 'AN4-12A', qty: 1, desc: 'pivot bolt' }, { std: 'MS21042L4', qty: 1, desc: 'nut' }, { std: 'NAS75-4', qty: 2, desc: 'bushing' }, { std: 'MS21151-3', qty: 2, desc: 'link rod ends (crank and rod clevis)' }, { std: 'AN3-6A', qty: 2, desc: 'rod-end bolts' }, { std: 'MS24665-132', qty: 3, desc: 'cotter pins' }],
    props: [['Pivot', `${(CL.P[0] * 12 - 20).toFixed(1)} in FS, ${((CL.P[1] - zT) * 12).toFixed(2)} in above the rod`], ['Crank / link / lever', `${(CL.r * 12).toFixed(2)} / ${(CL.L * 12).toFixed(2)} / ${(CL.lever * 12).toFixed(1)} in`], ['Handle travel', `${CL.travelDeg.toFixed(0)}°`]],
    blurb: 'A 4130 crank and a 6061 lever on one hub, pivoting on an AN4 bolt in a bracket bonded and bolted to the left canopy frame. The link (two MS21151 rod ends on a short 4130 rod) reaches forward and down to a clevis on the latch rod. Locked, the crank sits 5° past the line to the clevis, against a HT61 stop: rod loads push it harder onto the stop.',
    steps: [S1('Bolt the bracket through the frame hard point; set the stop with the rollers seated', ['5° ± 1° past centre on the stop', 'Lever clears the stick and the throttle through full travel'])], src: { mass: 'ASSUMED', design: 'LEZ (kinematics in canopy_layout.js)' } },
  { ...CAB, pn: 'LEZ-52-120', name: `Latch rod (${ROD.od} × ${LSZ.rod[1]} in 4130), three rollers on AN${LSZ.axle} axles, guide brackets with acetal bushings`, kind: 'weldment', ata: 52, nha: 'LEZ-52-100', material: '4130 / 6061 / SAE 841 bronze', massEach: 0.55,
    geo: [...rodGeo, ...guideGeo],
    hardware: [{ std: `AN${LSZ.axle}-7A`, qty: 3, desc: 'roller axle through the clamp block' }, { std: 'SAE 841 flanged bronze bushing, 3/8 OD', qty: 3, desc: 'roller (COTS oil-impregnated bushing)' }, { std: `MS21042L${LSZ.axle}`, qty: 3, desc: 'nut' },
      { std: 'Acetal (Delrin) flanged bushing, 3/8 ID', qty: 6, desc: 'rod guide in each bracket (COTS)' }, { std: 'AN3-5A', qty: 12, desc: 'bracket to canopy frame hard points' }],
    props: [['Rod', `${ROD.od} × ${LSZ.rod[1]} in 4130 tube, ${((rodS1 - rodS0) * 12).toFixed(1)} in`], ['Guides', '6 brackets, ±1 in either side of each hook (rod span 1.9 in between supports at a hook)'], ['Roller', `${RL.od} in bronze on AN${LSZ.axle}, cantilever ${LSZ.cant} in from the clamp`]],
    blurb: 'The latch rod runs along the inside of the left canopy frame below the longeron top, in acetal bushings on six 6061 brackets bonded to the frame. Clamp blocks carry a bronze roller on an AN axle into each hook throat. Guide brackets sit right beside each hook so the roller load bends the rod over only 1.9 in.',
    steps: [S1('Ream the brackets in line on a straight-edge jig; slide the rod; set the clamp blocks with the rollers on the throat ends', ['Rod slides with < 2 lb with the canopy open', 'Rollers turn freely'])], src: { mass: 'ASSUMED', design: 'LEZ sizing' } },
  { ...CAB, pn: 'LEZ-52-130', name: `Canopy latch hooks (3), ${H.t} in 4130, on the left longeron`, kind: 'machined', ata: 52, nha: 'LEZ-52-100', qty: 3, material: '4130 normalised', massEach: 0.07,
    geo: st.flatMap((s) => hookGeo(s)),
    hardware: [{ std: 'MS24694-S (#10-32 flush)', qty: 6, desc: 'tongue to the wall, into the potted nutplates' }, { std: 'MS21047-3 nutplate on a 6061 strip, flox-potted', qty: 6, desc: 'in the top longeron band, fitted from inside (no fastener through the outer skin)' }],
    props: [['Throat', `${H.throatH} in high, ${H.depth} in deep, ramped ${H.ramp} in down toward the closed end (draws the canopy onto the seal)`], ['Jaws', `${H.jaw} in deep`]],
    blurb: 'Three C-hooks, opening aft, each on a tongue that runs forward along the left wall on the throat line, screwed with two flush #10 screws into nutplates potted in the top longeron band (fitted from inside, so nothing pierces the outer skin or the strake fillet); a G10 spacer fills the gap to the wall. The throat ramps down 0.04 in toward its closed end so the advancing rollers pull the canopy down onto its seal (EAA: a latch that clamps).',
    steps: [S1('Fit each hook to its roller with the canopy closed; drill the longeron; bolt with flox-filled bushings in the foam', ['Roller seats at the throat end with 0.01–0.02 in vertical clearance', 'No step at the longeron top'])], src: { mass: 'COMPUTED', design: 'plans arrangement [LP-push]; LEZ sizing' } },
  { ...CAB, pn: 'LEZ-52-140', name: 'SC-1 canopy safety catch: 0.040 in 301 stainless spring catch on the frame, 6061 lip on the longeron', kind: 'machined', ata: 52, nha: 'LEZ-52-100', material: '301 stainless ½-hard / 6061', massEach: 0.06,
    geo: [...sc1Geo, catchLip, lipSpacer],
    hardware: [{ std: 'AN3-4A', qty: 2, desc: 'catch to the frame hard point (button-head with a racetrack slot for adjustment, as builders fit it)' }, { std: 'AN3-5A', qty: 2, desc: 'lip to the longeron' }],
    blurb: 'A spring stainless catch on a hard point at the front of the left canopy frame; closing the canopy flexes it past a 6061 lip on the longeron and it snaps under. With the main latch open the canopy can lift only ½ in. The plans have called for a stainless safety catch since the early 1980s (mandatory per RAF) [GAN/NTSB report]; builders trial-fit it in mild steel and cut the final part from stainless [LP-push]. Release: press it inboard with the canopy cracked open.',
    steps: [S1('Bend the catch from 0.040 301 ½-hard; fit to the hard point; set the lip ½ in above the foot', ['Snaps under the lip on every close', 'Releases with ≤ 10 lb thumb push', 'Canopy stops at ½ in when unlatched'])], src: { mass: 'ASSUMED', design: 'plans SC-1 concept [LP-push] [NTSB]; LEZ sizing' } },
  { ...CAB, pn: 'LEZ-52-150', name: 'Outside canopy release: flush cover with cam lock in the left canopy rail, over the handle\'s square drive', kind: 'install', ata: 52, nha: 'LEZ-52-100', massEach: 0.20,
    geo: DOOR_GEO,
    std: 'Flush 1/4-turn cam lock (COTS); 1/4 in square socket on the handle shaft',
    blurb: 'A 1.0 in flush cover in the left canopy rail over the end of the latch handle\'s shaft: with the cover open, a 1/4 in square drive turns the handle from outside (ground crew, rescue) [CZ]. Nothing cuts the fuselage side or its longeron. A cam lock keeps the cover shut; it is a before-takeoff checklist item ("emergency canopy release cover — closed / locked") [NTSB].',
    steps: [S1('Bore the rail for the shaft on the handle axis; bond the cover ring; fit cover and cam lock', ['Cover flush ±1/32 in', 'Square drive turns the handle through its full travel'])], src: { mass: 'GEOMETRY', design: '[CZ] [NTSB]; LEZ (no shell cut-out)' } },
  { ...CAB, pn: 'LEZ-56-130', name: 'Canopy check cable (open stop): 1/16 in 7×19 stainless with thimbles and swaged sleeves', kind: 'install', ata: 56, nha: 'LEZ-56-100', massEach: 0.08,
    geo: [{ t: 'path', pts: [CABLE.wall, [CABLE.s, (CABLE.wall[1] + CABLE.frame[1]) / 2 - 0.05, (CABLE.wall[2] + CABLE.frame[2]) / 2 - 0.08], CABLE.frame], dIn: 0.0625, drawR: 0.01, massPerFt: 0, mat: 'steel', colour: 0xb0b6be }],
    std: 'MIL-DTL-83420 1/16 in 7×19 corrosion-resistant cable (480 lb minimum break), thimbles, oval swaged sleeves',
    blurb: 'A short stainless cable from the right side wall to the canopy frame, folded in a loop when closed, tight at 80° open: the hard stop that takes a ground gust on the open canopy off the hinge and the strut.',
    steps: [S1('Swage to length with the canopy at 80°', ['Cable taut at the strut\'s full extension', 'Loop clears the hinge and the occupant when closed'])], src: { mass: 'ASSUMED' } },
]);
// the warning switch moves to the forward hook (LEZ-32-216 places it from CANOPY_SW in wp4 → canopy_layout)
export const CANOPY_SWITCH_AT = SW;

defineKeepouts([
  { id: 'ko-canopy-latch', t: 'box', c: [(rodS0 + rodS1) / 2, yR - 0.01, zT - 0.02], d: [rodS1 - rodS0 + 0.1, 0.12, 0.20], why: 'canopy latch rod, hooks and handle sweep', owner: 'LEZ-52-100', applies: () => true },
]);

// ------------------------------------------------------------------------------------------- checks
const I_ = (n, v, u, s = 'DERIVED') => [n, v, u, s];
export function toggleCheck() {
  // pilot effort: seal preload per hook drawn down by the ramp; rolling friction plus the ramp work; force at the knob
  const pre = LDES.preload, mu = LDES.mu, ramp = H.ramp / H.depth, Frod = st.length * pre * (mu + ramp);
  let worst = 0; for (let a = CL.aOpen; a <= CL.aLock; a += 0.5 * d2r) worst = Math.max(worst, Math.abs(Frod * toggleRate(a)) / CL.lever);
  return { pre, mu, ramp, Frod, Fknob: worst, ms: Math.min(20 / Math.max(worst, 1e-6), CL.beta / 3) - 1 };
}
registerChecks('wp14', (d, lc, Z, M) => {
  if (lc.id !== 'W1-S1') return [];
  const out = [], tag = (r, pn) => { r.sys = pn; out.push(r); };
  // hooks, rollers, rod and bolts at VD suction
  { const P = perHook(d.VD) * d.FS * FF, D = LSZ.axle / 16, Zax = Math.PI * D ** 3 / 32, sAx = P * LSZ.cant / Zax;
    const jawM = P * (H.depth / 2), sJaw = jawM / (H.t * H.jaw ** 2 / 6), sRod = P * SUP / 4 / tubeZ(ROD.od, LSZ.rod[1]);
    const e = (-0.015 - (HOOK_SCREW.ds[0] + HOOK_SCREW.ds[1]) / 2) * 12, sp = Math.abs(HOOK_SCREW.ds[0] - HOOK_SCREW.ds[1]) * 12, Ps = P * Math.hypot(0.5, e / sp), ins = psi(M.FLOX.shear) * Math.PI * 0.75 * 0.415;
    const terms = [['hook jaw bending', F4130.tu / sJaw], ['roller axle bending', 125000 / sAx], ['latch rod bending between guides', F4130.tu / sRod], ['tongue screws (2 × #10, couple)', AN_SHEAR[3] / Ps], ['potted nutplate in the band', ins / Ps]].sort((a, b) => a[1] - b[1]);
    tag(mk('fuselage', 'cab-canopy-latch', 'Canopy latch at VD suction: hooks, rollers, rod and hook bolts', lc, 'left longeron, 3 hooks', terms[0][0], terms[0][1] - 1, {
      formula: 'F = 0.6·q_D·A;  latch side F/2 over 3 hooks × 1.33 (uneven fit);  × FS × 1.15 fitting factor;  jaw M = P·depth/2, axle M = P·e, rod M = P·L/4;  screw = P·√(0.5² + (e/s)²)',
      inputs: [I_('V_D', d.VD, 'kt', 'MODEL'), I_('Average suction Cp', -CP.avg, '', cpBound(CP.avg, terms[0][1] - 1)), I_('Canopy plan area', canopyArea(), 'ft²', 'GEOMETRY'), I_('Hook', `${H.t} in 4130, jaw ${H.jaw} in, throat depth ${H.depth} in`, 'text', 'DESIGN'),
        I_('Axle / rod', `AN${LSZ.axle}, cantilever ${LSZ.cant} in / ${ROD.od} × ${LSZ.rod[1]} in 4130 over ${SUP.toFixed(1)} in`, 'text', 'SIZED'), I_('Tongue screws', `2 × #10 flush, ${sp.toFixed(2)} in apart, ${e.toFixed(2)} in from the throat`, 'text', 'DESIGN'), I_('Potted nutplate plug', 'Ø 0.75 in flox through the 0.415 in shell', 'text', 'DESIGN'), I_('Flox shear', psi(M.FLOX.shear), 'psi', allowB(terms[0][1] - 1, 'resin shear (flox)'))],
      result: [['Canopy suction (limit)', suction(d.VD), 'lb'], ['Per hook (ult. × 1.15)', P, 'lb'], ...terms.map(([n, r]) => [n, r - 1, 'MS'])] }), 'LEZ-52-130'); }
  // toggle: over-centre and pilot effort
  { const T = toggleCheck();
    tag(mk('fuselage', 'cab-canopy-toggle', 'Latch toggle: ≥ 3° over centre and ≤ 20 lb at the knob through the stroke', lc, 'left canopy rail', T.Fknob / 20 > 3 / CL.beta ? 'handle force' : 'over-centre angle', T.ms, {
      formula: 'F_rod = n·preload·(μ + ramp slope);  F_knob = max(F_rod·|ds/dα|) / lever;  MS = min(20 lb / F_knob, β / 3°) − 1',
      inputs: [I_('Seal preload per hook', T.pre, 'lb', 'DESIGN: rigging limit, hooks shimmed until a spring scale at each roller reads ≤ 30 lb (LEZ-52-100 rigging step)'), I_('Rolling + slide friction μ', T.mu, '', `BOUND: dry bronze bushing rolling on 4130 with some slide, typed from memory (0.05–0.10); MS stays ≥ 0 to μ ${Math.max(0, (T.mu + T.ramp) * (1 + T.ms) - T.ramp).toFixed(2)}`), I_('Throat ramp slope', T.ramp, '', 'DESIGN'), I_('Over-centre', CL.beta, '°', 'DESIGN'), I_('Lever', CL.lever * 12, 'in', 'DESIGN')],
      result: [['Rod force', T.Frod, 'lb'], ['Peak knob force', T.Fknob, 'lb'], ['Handle travel', CL.travelDeg, '°']] }), 'LEZ-52-110'); }
  // SC-1: holds the unlatched canopy at takeoff / initial-climb speed
  { const Vto = LDES.vCatch, Pl = suction(Vto) / 2, P = Pl * d.FS * FF, t = 0.040, w = 0.96, e = 0.06, Z = w * t * t / 6, sb = P * e / Z;
    const Pmax = SS301.ty * Z / e / (d.FS * FF), Vhold = Math.sqrt(Pmax * 2 / (0.6 * 0.5 * 0.002377 * canopyArea())) / 1.6878;
    const kRel = 3 * SS301.E * (w * t ** 3 / 12) / 2.0 ** 3 * 0.15;
    tag(mk('fuselage', 'cab-canopy-catch', 'SC-1 safety catch holds an unlatched canopy at takeoff / climb speed', lc, 'front left frame', 'catch foot bending', SS301.ty / sb - 1, {
      formula: 'P = 0.6·q·A/2 (latch side on one catch) × FS × 1.15;  σ = P·e / (w·t²/6), e = foot bearing offset from the bend;  release force = 3EI·δ/L³',
      inputs: [I_('Speed', Vto, 'kt', 'DESIGN: the catch is designed to hold an unlatched canopy to 100 kt (rotation to initial climb, with margin)'), I_('Average suction Cp', -CP.avg, '', cpBound(CP.avg, SS301.ty / sb - 1)), I_('Catch', `${t} in × ${w} in 301 ½-hard`, 'text', 'DESIGN'), I_('Bearing offset e', e, 'in', 'DESIGN')],
      result: [['Catch load (limit)', Pl, 'lb'], ['Bending stress (ult.)', sb, 'psi'], ['Holds to (MS 0)', Vhold, 'kt'], ['Thumb release force', kRel, 'lb']] }), 'LEZ-52-140'); }
  // hinge running load and the check cable on a ground gust
  { const Lh = (HINGE[1][0] - HINGE[0][0]) * 12, w_ = suction(d.VD) / 2 / Lh * d.FS, kn = 0.063 * 0.040 * 104000 / 0.5;  // per in: pin bearing in a knuckle every 1/2 in; 2024-T3 sheet Fbru e/D 1.5 104 ksi A-basis (MIL-HDBK-5H CN1 table 3.2.3.0(b1), METU copy, accessed 2026-11-19)
    const H_ = HFIX, riv = H_.rivetSs / H_.rivetP, ins = psi(M.FLOX.shear) * Math.PI * H_.insD * H_.insL / H_.screwP, scr = H_.screwT / H_.screwP;
    const terms = [['knuckle bearing on the pin', kn / w_], ['leaf rivets to the frame (shear)', riv / w_], ['sill screw inserts (flox pull-out)', ins / w_], ['sill screws (tension)', scr / w_]].sort((a, b) => a[1] - b[1]);
    tag(mk('fuselage', 'cab-canopy-hinge', 'Canopy hinge running load at VD suction: knuckles, rivets, sill screws and inserts', lc, 'right sill', terms[0][0], terms[0][1] - 1, {
      formula: 'w = FS·(F/2)/L_hinge;  knuckle = d_pin·t_leaf·F_bru per knuckle (2 per in);  rivet = P_s / pitch;  insert = τ_flox·π·D·L / pitch;  screw = P_t / pitch',
      inputs: [I_('V_D', d.VD, 'kt', 'MODEL'), I_('Average suction Cp', -CP.avg, '', cpBound(CP.avg, terms[0][1] - 1)), I_('Hinge length', Lh, 'in', 'GEOMETRY'), I_('Pin / leaf', '0.063 in / 0.040 in 2024-T3, F_bru 104 ksi (e/D 1.5)', 'text', 'MS20001 (dimensions BOUND: not found in public sources)'),
        I_('Leaf rivets', `MS20470AD4 at ${H_.rivetP} in, ${H_.rivetSs} lb single shear`, 'text', 'AC 43.13-1B ch. 4 table 4-8: 2117-T (AD) 30 ksi on the 1/8 in shank (RAANZ mirror, accessed 2026-11-19); one value everywhere'),
        I_('Sill screws', `AN525-832 at ${H_.screwP} in into MS21047 nutplates in flox inserts Ø ${H_.insD} × ${H_.insL} in`, 'text', 'DESIGN'), I_('Screw tension', H_.screwT, 'lb', 'BOUND: #8-32 alloy screw 1,000 lb, the conservative end (125 ksi × stress area 0.0140 in² = 1,750 lb, root area ≈ 1,550 lb; Aircraft Spruce 2026 HA catalogue, accessed 2026-11-19); nutplate push-out not the limit'),
        I_('Flox shear allowable', psi(M.FLOX.shear), 'psi', allowB(terms[0][1] - 1, 'resin shear (flox)'))],
      result: [['Running load (ult.)', w_, 'lb/in'], ...terms.map(([n, r]) => [n, r - 1, 'MS'])] }), 'LEZ-56-110'); }
  { const V = LDES.gust, q = 0.5 * 0.002377 * (V * 1.6878) ** 2, F = 1.2 * q * canopyArea(), M = F * CAN.hw, T = M / (CABLE.lever / 12) * d.FS;
    tag(mk('fuselage', 'cab-canopy-strap', 'Canopy check cable: 40 kt ground gust on the open canopy', lc, 'right side, open stop', 'cable break', 480 / T - 1, {
      formula: 'F = 1.2·q·A (flat plate);  M = F·half-width about the hinge;  T = FS·M / lever (the cable\'s perpendicular distance from the hinge at 80°)', inputs: [I_('Cable lever about the hinge at 80°', CABLE.lever, 'in', 'GEOMETRY'), I_('Gust', V, 'kt', 'DESIGN: placarded limit, do not open the canopy in winds over 40 kt'), I_('Cable', '1/16 in 7×19 CRES, 480 lb', 'text', 'MIL-DTL-83420')],
      result: [['Gust load (limit)', F, 'lb'], ['Cable tension (ult.)', T, 'lb']] }), 'LEZ-56-130'); }
  return out;
});

defineReqs([
  { id: 'R-CAB-3', ref: '23.783 (yardstick)', title: 'Canopy: positive latching that cannot unlatch in flight, a safety catch, unlatched warning, outside release, hinge and open stop', checks: /^cab-canopy-(latch|toggle|catch|hinge|strap)$/, method: 'analysis', closed: true },
]);
void by; void latchPose;
/** the parts' own primitives (ft, model frame), for their definition solids (site/defn/blkB_latch.js) */
export const LATCH_GEO = { handle: () => [...handleBodyGeo, ...pivotGeo], rod: () => [...rodGeo, ...guideGeo], hook: (s) => hookGeo(s), sc1: () => [...sc1Geo, catchLip, lipSpacer], door: () => DOOR_GEO,
  sLock, rodS0, rodS1, frameZ, lipGap, lipWall, SUP };

// Latch detail masses on the system records (moved here from site/defn/blkB_latch.js, final integration 2026-11-19): set
// when the parts load, so the explorer's mass model and the release audit read the same masses whether or not the
// definition records have been loaded.
import { fromGeo as _fg, groupVols as _gv, massFrom as _mf } from '../defn/blkB_prims.js';
import { partByPN as _pp } from '../systems.js';
export const LATCH_RHO = { '4130': 0.283, steel: 0.283, bronze: 0.233, '6061': 0.098, acetal: 0.051, nylon: 0.041, urethane: 0.040, '301': 0.286, glass: 0.065, g10: 0.065 };
export const latchMass = (geo) => _mf(_gv(_fg(geo)), LATCH_RHO);
export const LATCH_MASS = { handle: latchMass(LATCH_GEO.handle()), rod: latchMass(LATCH_GEO.rod()), hook: latchMass(LATCH_GEO.hook(CL.st[0])), sc1: latchMass(LATCH_GEO.sc1()), door: latchMass(LATCH_GEO.door()) };
/** LEZ-52-100 installation hardware lines (link, rigging shims, canopy seal) */
export const LATCH_HW = [
  { std: 'MS21151-3 rod end', qty: 2, each: 0.025, desc: 'link ends (crank and rod clevis)' }, { std: '4130 rod 3/16 in, link', qty: 1, each: 0.020, desc: `link body, ${(CL.L * 12).toFixed(2)} in between rod-end centres` },
  { std: 'AN3-6A', qty: 2, each: 0.012, desc: 'rod-end bolts' }, { std: 'MS21042L3', qty: 2, each: 0.003, desc: 'nuts' }, { std: 'MS24665-132', qty: 3, each: 0.001, desc: 'cotter pins' },
  { std: 'AN960-10L', qty: 6, each: 0.001, desc: 'rigging shims under the hooks (as required)' }, { std: 'EPDM bulb seal 1/4 in', qty: 1, each: 0.12, desc: 'canopy seal on the shell\'s cut, both sills and both ends' },
];
for (const [pn, k] of [['LEZ-52-110', 'handle'], ['LEZ-52-120', 'rod'], ['LEZ-52-130', 'hook'], ['LEZ-52-140', 'sc1'], ['LEZ-52-150', 'door']]) { const p = _pp(pn); if (p) { p.massEach = +LATCH_MASS[k].toFixed(4); p.src = { ...p.src, mass: `GEOMETRY: the definition solid (${pn})` }; } }
{ const p = _pp('LEZ-52-100'); if (p) { p.massEach = +LATCH_HW.reduce((a, l) => a + l.qty * l.each, 0).toFixed(4); p.src = { ...p.src, mass: 'GEOMETRY: hardware lines (LEZ-52-100)' }; } }
