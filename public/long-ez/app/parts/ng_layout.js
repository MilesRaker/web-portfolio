// Nose-gear layout and kinematics (model frame, ft: s aft of the nose tip, y right, z above ground).
// Shared by the part records (wp11), the checks and the 3D view, so the drawn mechanism, the analysed
// mechanism and the animated one are the same. Pure data and maths: no part definitions here.
//
// Arrangement (Long-EZ practice as builders describe it; dimensions are this model's, notional):
//  • Two NG-30 side plates form a box in the nose, bonded to the forward face of bulkhead F-22. They carry the NG-6 hinge
//    block (strut pivot) and the worm gearbox.
//  • The NG-1 strut hangs from the hinge, raked 6° aft. It retracts AFT through the F-22 notch; the wheel stows in the
//    NB wheel well between F-22 and the instrument panel, the strut lying in the belly slot behind its strut cover.
//  • A single-start worm turns a 40-tooth worm wheel; the NG-64 crank on the worm-wheel shaft drives the strut through a
//    spring link (die spring) to the NG-3 bracket on the strut. Gear DOWN, the crank sits 4° over centre against its stop,
//    so drag loads on the wheel push it harder into the stop; the worm also cannot be back-driven.
//  • A shaft with one U-joint runs from the worm to a crank on the lower centre panel, next to the gear viewing window.
const d2r = Math.PI / 180;
export const F22 = 22 / 12;                         // canard bulkhead F-22 (FS 22)
export const PANEL = 40.5 / 12;                     // instrument panel bulkhead (FS 40.5)
export const NG = {
  O: [0.735, 0, 2.58],          // NG-6 hinge: strut pivot bolt axis (lateral)
  A: [1.119, 0, 3.02],           // worm-wheel / NG-64 crank shaft axis (lateral)
  phi0: 6,                      // strut rake aft of vertical, gear down (deg)
  stowZ: 2.575,                 // axle height stowed: tyre flush with the belly skin
  R: 0.3667, tyreW: 0.233,      // Azusa 280/250-4 tyre (06-01287) and tube (06-01288): OD 8.8 in, width 2.8 in (Aircraft Spruce, accessed 2026-11-19; was 10.2 in)
  drop: 0.67, trail: 0.06, crownIn: 2.15,   // crownIn: strut tip to the fork crown-tube axis (NG-4 end plate, damper, caster boss)
       // fork: axle below the strut tip (crown clear above the tyre), and trail behind the caster axis
  c: 0.54, cn: 0.09,            // NG-3 link bracket: 6.5 in down the strut from the hinge, 1.1 in off its aft face
  r: 0.30, beta: 3,             // NG-64 crank radius, over-centre angle at the down stop (deg)
  gammaUp: 3,                   // over-centre past the up toggle: the strut sits on its up-stop, spring squeezed (up-lock dwell)
  strut: { root: [1.25, 1.25], tip: [1.0, 1.0] },   // NG-1 section, fore-aft × lateral (in), at hinge and fork head
  worm: { lead: 0.125, pitchD: 0.75, mu: 0.08, N: 45 },   // single-start worm (in), wheel teeth; μ 0.08: static 0.13 can fall to about 0.08 under shock and vibration (trade article, accessed 2026-11-19), the conservative end for the self-lock
  wormY: 0.07,                  // worm and worm wheel sit beside the crank plane
  ujoint: [2.90, 0.07, 3.12],   // shaft U-joint, over the well
  crank: [3.43, 0.07, 2.90],    // panel crank shaft exit (aft face of the lower centre panel)
  crankR: 0.125,                // crank handle radius
  plateY: 0.19, plateT: 0.035,  // NG-30 plates: inner face |y|, thickness
  box: [0.62, F22],             // NG-30 box, s range
  // die-spring stack (integration 2026-11-19; the 3,000 lb/in 25 mm spring could not be bought, memaudit gearfuel die-k): two nested
  // ISO 10243 heavy-duty (red) springs, 51 mm long: outer 40 mm hole / 20 mm rod, 78 lbf/mm, 1,000 lb at its 25 % maximum deflection
  // (McMaster-Carr 1804N219), inner 20 mm hole / 10 mm rod, 21 lbf/mm, 265 lb at 25 % (1804N199), on a Ø 10 mm guide inside the
  // outer's 20 mm bore. src 'McMaster-Carr, metric die springs, 51 mm length, ISO 10243 table (mcmaster.com/springs/length~51millimeters,
  // accessed 2026-11-19)'. k: combined rate (lb/in); pre: preload deflection (in); solid: the stack's rated maximum deflection, 25 % of 51 mm
  spring: { k: (78 + 21) * 25.4, pre: 0.43, solid: 0.25 * 51 / 25.4, maxLb: 1000 + 265, parts: ['McMaster-Carr 1804N219 (40 × 51 mm heavy)', 'McMaster-Carr 1804N199 (20 × 51 mm heavy, nested)'] },
};
NG.wormZ = NG.A[2] + (NG.worm.N * NG.worm.lead / Math.PI) / 24 + NG.worm.pitchD / 24;   // worm axis on top of the wheel
NG.Ls = (NG.O[2] - NG.R + NG.trail * Math.sin(NG.phi0 * d2r)) / Math.cos(NG.phi0 * d2r) - NG.drop;   // hinge → fork head

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], hyp = (v) => Math.hypot(v[0], v[1], v[2]);
/** unit vectors of the strut at angle phi (deg): u down the strut, n its aft face (at phi = 90 n points up) */
export function strutAxes(phi) { const p = phi * d2r; return { u: [Math.sin(p), 0, -Math.cos(p)], n: [Math.cos(p), 0, Math.sin(p)] }; }
/** point on the strut body: ud along it from the hinge, no off its aft face, y lateral */
export function strutPt(phi, ud, no = 0, y = 0) { const { u, n } = strutAxes(phi), O = NG.O; return [O[0] + u[0] * ud + n[0] * no, y, O[2] + u[2] * ud + n[2] * no]; }
export const axleAt = (phi) => strutPt(phi, NG.Ls + NG.drop, NG.trail);
export const C_at = (phi) => strutPt(phi, NG.c, NG.cn);
export const B_at = (al) => [NG.A[0] + NG.r * Math.cos(al * d2r), 0, NG.A[2] + NG.r * Math.sin(al * d2r)];

// stowed strut angle: axle at stowZ
function solvePhi1() { let lo = 60, hi = 130; for (let k = 0; k < 60; k++) { const m = (lo + hi) / 2; if (axleAt(m)[2] < NG.stowZ) lo = m; else hi = m; } return (lo + hi) / 2; }
NG.phi1 = solvePhi1();

/** kinematic table. Crank angle alpha (deg, in the s–z plane from +s toward +z). Gear down = alpha_d (over centre);
 *  turning the crank through the toggle compresses the spring, then the strut follows with the link at its free length. */
export const KIN = (() => {
  const C0 = C_at(NG.phi0), th = Math.atan2(C0[2] - NG.A[2], C0[0] - NG.A[0]) / d2r;
  let best = null;
  for (const sgn of [1, -1]) {
    const ad = th + sgn * NG.beta, l = hyp(sub(B_at(ad), C0)), dir = -sgn, rows = [];
    let a = ad, phi = NG.phi0, ok = true;
    for (let k = 0; k < 6000; k++) {
      const Lb = hyp(sub(B_at(a), C_at(NG.phi0)));
      if (Lb <= l + 1e-9 && rows.length < 1e4 && (a - ad) * dir <= 2 * NG.beta + 1e-9) { rows.push({ a, phi: NG.phi0, len: Lb }); a += dir * 0.1; continue; }
      // strut moving: |B(a) − C(phi)| = l, phi continued from the last row
      let lo = phi - 0.5, hi = phi + 3, f = (p) => hyp(sub(B_at(a), C_at(p))) - l, flo = f(lo), fhi = f(hi);
      if (flo * fhi > 0) { ok = false; break; }
      for (let j = 0; j < 50; j++) { const m = (lo + hi) / 2, fm = f(m); if (fm * flo > 0) { lo = m; flo = fm; } else hi = m; }
      const p = (lo + hi) / 2; if (p < phi - 1e-6) { ok = false; break; }
      phi = Math.min(p, NG.phi1); rows.push({ a, phi, len: l });
      a += dir * 0.1;
      if (p >= NG.phi1) break;
    }
    if (ok && phi >= NG.phi1 - 1e-6) {
      // up-lock dwell: the strut is on its up-stop; the crank turns on through dead centre, squeezing the die spring,
      // and stops gammaUp past it. The door cam closes the doors in this dwell, when the wheel is already home.
      // (here the link is stretched: the cartridge is double-acting, its die spring squeezed by extension as by compression)
      const aStop = a - dir * 0.1, CU = C_at(NG.phi1), sg = Math.sign(hyp(sub(B_at(a), CU)) - l) || 1; let dmax = 0, amax = a, k2 = 0;
      while (k2++ < 2000) { const Lb = hyp(sub(B_at(a), CU)), dd = (Lb - l) * sg; if (dd < -1e-9) break; rows.push({ a, phi: NG.phi1, len: Lb }); if (dd > dmax) { dmax = dd; amax = a; } if ((a - amax) * dir >= NG.gammaUp) break; a += dir * 0.1; }
      best = { sgn, dir, th, ad, au: rows.at(-1).a, aStop, aToggleUp: amax, l, upDev: dmax, upSense: sg > 0 ? 'tension' : 'compression', rows }; break;
    }
  }
  if (!best) throw new Error('nose-gear four-bar has no continuous solution');
  return best;
})();
NG.travel = Math.abs(KIN.au - KIN.ad);                 // crank (worm-wheel) travel, deg
NG.turns = NG.travel / 360 * NG.worm.N;               // panel-crank turns, down → up
NG.uplockIn = KIN.upDev * 12;                         // die-spring squeeze through the up toggle, in
NG.dwell = Math.abs(KIN.au - KIN.aStop);              // crank (worm-wheel) degrees with the strut on its up-stop

// ------------------------------------------------------------------------------------------- wheel-well doors
// Two clamshell fairing doors close the NB-well opening aft of the strut cover. Each hangs on a 5/16 in 4130 torque tube
// along its outboard edge; a music-wire torsion spring holds it open (fail-safe: a dead drive leaves the doors open and
// the gear free to extend). Closing is by cable from a cam on each end of the worm-wheel cross-shaft: the cam is on its
// base circle for the whole strut stroke and only rises during the up-lock dwell, so the doors close after the tyre is
// home and open again before the strut leaves its up-stop.
export const DOOR = {
  s0: 2.62, s1: 3.36,           // door panel, fore and aft edges (aft of the strut cover)
  yIn: 0.012, yOut: (2.28 - 0.125) / 12,   // outer edge 1/8 in inside the well opening (LEZ-53-150 rev E: ±2.28 in)      // inner and outer edges (|y|), closed
  hingeY: 0.178, t: 0.0075,     // torque-tube axis |y|; door laminate thickness (0.09 in)
  axis: [[2.44, 2.1815], [3.36, 2.1365]],   // torque-tube axis (s, z): skin + door + tube radius (belly 2.159 / 2.114)
  tubeR: 0.25 / 24, openDeg: 95,
  hornR: 0.45 / 12,             // closing horn on the tube's forward end: points up when the door is shut
  camY: 0.26, camR: 0.14,       // cam on the cross-shaft (|y|), base radius
  lever: { dir: [-0.8, -0.6], roller: 0.6 / 12, arm: 2.6 / 12 },   // follower: roller below-forward of the cam; cam arm 0.6 in, cable arm 2.6 in (down)
  fairlead: [2.36, 2.33], quadS: 2.44,        // fairlead (s, z) where the cable enters the well; quadrant station
  rise: 1.0,                    // cam rise starts this many crank degrees after the strut lands on its up-stop
};
{ const L = DOOR.lever, u = L.dir, p = [-u[1], u[0]], rc = [NG.A[0] + (DOOR.camR + 0.02) * u[0], NG.A[2] + (DOOR.camR + 0.02) * u[1]];   // roller on the base circle
  L.rollerAt = rc; L.pivot = [rc[0] - L.roller * p[0], rc[1] - L.roller * p[1]]; L.tip = [L.pivot[0], L.pivot[1] - L.arm]; }
/** door-hinge axis point at s */
export const doorAxisZ = (s) => { const [[a, za], [b, zb]] = DOOR.axis; return za + (zb - za) * (s - a) / (b - a); };
/** right-door horn tip at door angle th (deg); sg = ±1 for the side */
export function hornTip(th, sg = 1) { const s = DOOR.quadS, z = doorAxisZ(s), a = th * d2r; return [s, sg * (DOOR.hingeY - DOOR.hornR * Math.sin(a)), z + DOOR.hornR * Math.cos(a)]; }
DOOR.cableTravel = (() => { const f = [DOOR.fairlead[0], DOOR.camY, DOOR.fairlead[1]], d = (p) => Math.hypot(p[0] - f[0], p[1] - f[1], p[2] - f[2]); return d(hornTip(DOOR.openDeg)) - d(hornTip(0)); })();
DOOR.lift = DOOR.cableTravel * DOOR.lever.roller / DOOR.lever.arm;     // cam rise, ft
DOOR.closeDeg = DOOR.openDeg;
const cyclo = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x - Math.sin(2 * Math.PI * x) / (2 * Math.PI));
/** cam lift fraction (0 → 1) at crank angle a */
export function camFrac(a) { const a0 = KIN.aStop + KIN.dir * DOOR.rise, a1 = KIN.au; return cyclo(((a - a0) * KIN.dir) / ((a1 - a0) * KIN.dir)); }
export const doorDeg = (a) => Math.max(0, DOOR.openDeg - camFrac(a) * DOOR.closeDeg);

/** gear-not-down switch S12 (LEZ-32-216, own frame placed at NOSE_SW: lever up). A finger on the cross-shaft (LEZ-32-212),
 *  `ang` from +s about A at DOWN, presses the lever `over` in past its free height only at DOWN; turning the crank lifts it
 *  straight off (the finger moves up and slightly aft), so the switch is released (C–NC made) whenever the gear is not down.
 *  The switch sits on a shelf on the right NG-30 plate (LEZ-32-201), outboard of the link and the NG-64 arm. */
export const SWF = { r: 2.9 / 12, ang: -170, rod: 0.09 / 12, y0: -0.40 / 12, y1: 1.95 / 12, armY: [-0.40 / 12, -0.30 / 12], over: 0.045 / 12, lever: 0.67 / 12, swY: 0.12 };
SWF.at = (al) => { const a = (SWF.ang + (al - KIN.ad)) * d2r; return [NG.A[0] + SWF.r * Math.cos(a), NG.A[2] + SWF.r * Math.sin(a)]; };   // finger axis (s, z) at crank angle al
export const NOSE_SW = (() => { const f = SWF.at(KIN.ad); return [f[0], SWF.swY, f[1] - SWF.rod - SWF.lever + SWF.over]; })();

/** pose at t (0 = down and locked, 1 = up), crank turned at constant speed */
export function noseGearPose(t) {
  t = Math.min(1, Math.max(0, t));
  const R = KIN.rows, x = t * (R.length - 1), i = Math.min(R.length - 2, Math.floor(x)), f = x - i, q = R[i], w = R[i + 1];
  const a = q.a + (w.a - q.a) * f, phi = q.phi + (w.phi - q.phi) * f, len = q.len + (w.len - q.len) * f;
  const crank = (a - KIN.ad) * KIN.dir * NG.worm.N;     // panel-crank rotation, deg
  const B = B_at(a), C = C_at(phi), springIn = NG.spring.pre + Math.abs(KIN.l - len) * 12;
  const cam = camFrac(a), door = doorDeg(a), lever = -Math.asin(DOOR.lift * cam / DOOR.lever.roller) / d2r;   // follower turns nose-down (cw in s–z): the cable arm swings forward
  return { t, phi, alpha: a, crank, B, C, axle: axleAt(phi), springIn, cam, door, lever, onStop: phi >= NG.phi1 - 1e-6, down: phi <= NG.phi0 + 1e-6 && Math.abs(a - KIN.ad) < 1e-6, up: t >= 1 };
}
export { d2r };
