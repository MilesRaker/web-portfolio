// Canopy latch layout and kinematics, shared by the parts (wp14), the checks and the 3D view (app.js).
// Arrangement after the Long-EZ plans as builders describe them [LP-push]: three latch hooks bolted to the left longeron
// (the forward one at FS 44), a latch rod on the canopy frame carrying a roller into each hook, worked by a handle on the
// left frame of the front cockpit; the SC-1 stainless spring safety catch at the front of the frame; a hinge along the
// right sill [RAF, CZ]. Geometry and sizes here are this model's (notional), not the plans'.
import { fusAt, FUS_SHAPE } from '../structures.js';

const IN = 1 / 12, d2r = Math.PI / 180;
export const CAN = { s0: 3.35, s1: 8.7000, hw: 0.98 };
/** canopy suction (LEZ-56-100 and its latch, hinge and catch): average and peak pressure coefficients over a bubble
 *  canopy. No published Long-EZ canopy pressure survey: these are typed from memory (bubble canopies run Cp about −0.4
 *  to −0.7 averaged over the plan, peaking near −1.0 at the crown) and carried as BOUNDs; every check quotes the
 *  coefficient at which its margin reaches zero. */
export const CP = { avg: 0.6, peak: 1.0, why: 'typed from memory, no Long-EZ pressure survey: bubble canopies average Cp −0.4 to −0.7 over the plan, peak ≈ −1.0 at the crown' };
export const cpBound = (cp, ms, what = 'average') => `BOUND: ${what} Cp ${(-cp).toFixed(2)}, ${CP.why}; MS stays ≥ 0 to Cp ${(-cp * (1 + ms)).toFixed(2)}`;
/** canopy plan area (ft²) and the suction force at V (kt, lb limit) for a pressure coefficient */
export const canopyArea = () => (CAN.s1 - CAN.s0) * 2 * (CAN.hw - 0.05);
export const suction = (V, cp = CP.avg) => cp * 0.5 * 0.002377 * (V * 1.6878) ** 2 * canopyArea();
/** canopy sill on the fuselage section (same definition as the GLB build): |y| = opening half-width */
export function canopySill(s, sg = 1) {
  const f = fusAt(s), w = f.w / 2, zc = (f.top + f.bot) / 2, h = (f.top - f.bot) / 2, ohw = Math.min(FUS_SHAPE.canopyHalfW, f.w / 2 - 0.02) - 0.03;
  let tS = Math.acos(Math.min(1, Math.max(0, ohw / w) ** 1.3)); tS = Math.min(Math.max(tS, 12 * d2r), 45 * d2r);
  return [s, sg * w * Math.cos(tS) ** FUS_SHAPE.side, zc + h * Math.sin(tS) ** FUS_SHAPE.top];
}

export const CL = (() => {
  const st = [4.3333, 5.3333, 7.3333];                                   // hook stations FS 52 / 64 / 88 (re-layout 2026-11-20; plans: forward hook FS 44, but the model's longeron band there is 1 in below the rod line, so FLAGGED), mid, aft of the front seat back
  const sills = st.map((s) => canopySill(s, -1)), zSill = Math.min(...sills.map((q) => q[2]));
  const zT = zSill - 0.12;                                         // roller / throat line, 1.4 in below the sill (rod under the longeron top)
  const yH = -0.915, yR = -0.880;                                  // hook plate (on the longeron inner face), latch rod axis
  const hook = { t: 0.125, throatH: 0.40, depth: 0.96, jaw: 0.36, ramp: 0.04 };   // in: 4130 plate, throat, draw-down ramp
  const roller = { od: 0.375, axle: 4 };                           // SAE 841 bronze flanged bushing on an AN4 axle
  const rod = { od: 0.375, w: 0.035 };                             // latch rod, 4130 tube (3/8 in as Cozy builders note)
  const stroke = 0.10;                                             // ft (1.2 in): roller clears the upper jaw by 0.13 in unlatched, lands on the lower jaw's lead-in
  // pivot and toggle in the s–z plane at the rod's y; crank r, link L; handle lever 4.5 in
  const P = [st[0] + 0.32, zT + 0.20], r = 0.75 * IN, lever = 4.5 * IN, beta = 5;   // over-centre degrees; the pivot sits above the sill so its square-drive shaft exits through the left canopy rail (outside release, LEZ-52-150)
  const sC0 = P[0] - 0.30;                                         // link clevis on the rod, locked
  const dx = sC0 - P[0], dz = zT - P[1], d0 = Math.hypot(dx, dz), cb = Math.cos(beta * d2r);
  const L = -r * cb + Math.sqrt(r * r * cb * cb - r * r + d0 * d0);
  const aDC = Math.atan2(dz, dx);                                  // dead centre (extended): crank pointing at the clevis
  const aLock = aDC + beta * d2r;                                  // 5° past centre, onto the stop
  const B = (a) => [P[0] + r * Math.cos(a), P[1] + r * Math.sin(a)];
  const sC = (a) => { const b = B(a), h = b[1] - zT; return b[0] - Math.sqrt(Math.max(L * L - h * h, 0)); };
  const xLock = sC(aLock);
  let aOpen = aLock; while (sC(aOpen) - xLock < stroke && aOpen > aLock - 170 * d2r) aOpen -= 0.25 * d2r;   // opening lifts the handle
  const leverOff = Math.PI - aLock;                                // handle lies forward along the rail when locked
  return { st, sills, zSill, zT, yH, yR, hook, roller, rod, stroke, P, r, L, lever, beta, aDC, aLock, aOpen, xLock, B, sC, leverOff,
    travelDeg: (aLock - aOpen) / d2r, catchS: 3.8333, switchS: st[0] - 0.16, doorS: P[0] };
})();
/** latch pose for unlock fraction f (0 locked … 1 unlocked): handle angle, rod displacement (aft +), pins B and C */
export function latchPose(f) {
  const a = CL.aLock + (CL.aOpen - CL.aLock) * Math.min(1, Math.max(0, f)), b = CL.B(a), x = CL.sC(a) - CL.xLock;
  return { a, rot: a - CL.aLock, x, B: b, C: [CL.sC(a), CL.zT] };
}
/** rod axial position vs crank angle (for the toggle check): derivative ds/dα by central difference */
export function toggleRate(a) { const h = 1e-4; return (CL.sC(a + h) - CL.sC(a - h)) / (2 * h); }
