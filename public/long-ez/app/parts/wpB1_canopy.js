// WPB1 — canopy LEZ-56-100: a one-piece acrylic bubble bonded into a BID / PVC frame. The frame's outer surface is the
// fuselage section between the sills raised by the same smooth bump the airframe build uses (zero height and slope at
// both ends, zero at the sills), so the closed canopy continues the outer mould line; its edges lie on the shell's cut
// (LEZ-53-150: the opening half-width plane at each station, the nose-deck face at FS 40.2, the turtleback face at
// FS 129). Front and aft bows are frame all round; between them two side rails carry the bubble, with UNI caps sized
// for the left rail's overhang forward of the first latch hook. This file gives the sections (each layer of each region
// as a polygon in the FS plane), the solid's parameters, its exact volumes, mass and CG, and the canopy checks:
//  • can-bubble: acrylic membrane stress under peak suction at V_D (crown radius from the section);
//  • can-bond: the bubble's bond into the frame under the average suction;
//  • can-rail: left-rail bending between and beyond the hooks (the right rail is on the continuous hinge).
// Notional.
import { GEO, FUS_SHAPE, fusAt, BASE_MAT, registerChecks, mk, psi, allowB, effective, materials, DEFAULT_DESIGN } from '../structures.js';
import { plyWeight } from '../plybook.js';
import { partByPN } from '../systems.js';
import { CL, CP, cpBound, suction, canopySill } from './canopy_layout.js';
import { HINGE, STRUT } from './wp4_avionics_cabin.js';

const r4 = (x) => Math.round(x * 1e4) / 1e4, tB = BASE_MAT.BID.t, tU = BASE_MAT.GUD.t, TGT = 0.15, IN_ = (n, v, u, s = 'DERIVED') => [n, v, u, s];
const sp = (v, e) => Math.sign(v) * Math.abs(v) ** e;
// re-layout 2026-11-20 (canopy refit): the Long-EZ owner's handbook cockpit heights, front 36 in and rear 35 in (0.91 / 0.89 m,
// inner floor to canopy inner surface), met at the occupants' head stations (FS 78 / 102.5) by a bump that ramps up over the
// front 30 % of the opening, stays at full height and closes over the last 2 % on the aft bow, which stands on the rear seat
// bulkhead (the turtleback face, FS 104.4). Was a sin² bump 0.70 ft high (airframe/dims.py CANOPY_RISE), 31.4 in.
const OPEN = [GEO.canopy[0] + 0.02, GEO.canopy[1] - 0.02], RISE = 13.1, BUMP = { a: 0.30, b: 0.02, q: 0.75 };
export const CANF = { coreIn: 0.375, faceBID: 2, bow0: [GEO.canopy[0], 3.55], bow1: [8.55, GEO.canopy[1]], railH: 2.5, capW: 1.0, acrylic: 0.125, bondW: 1.0, n: 8, nB: 24 };
CANF.tf = CANF.faceBID * tB; CANF.t = CANF.coreIn + 2 * CANF.tf;

/** the fuselage contour (as wp26): station s (ft), parameter t, offset off (in, + out) → [BL, WL] in */
function yz(s, t, off) {
  const f = fusAt(s), w = f.w / 2 * 12 + off, h = (f.top - f.bot) / 2 * 12 + off, zc = (f.top + f.bot) / 2 * 12, sn = Math.sin(t);
  return [w * sp(Math.cos(t), FUS_SHAPE.side), zc + h * sp(sn, sn < 0 ? FUS_SHAPE.belly : FUS_SHAPE.top)];
}
/** opening half-width (in) and the parameter where a layer at offset off reaches it (the shell's cut plane) */
export const ohwIn = (s) => (Math.min(FUS_SHAPE.canopyHalfW, fusAt(s).w / 2 - 0.02) - 0.03) * 12;
export function tCut(s, off) { const w = fusAt(s).w / 2 * 12 + off; return Math.acos(Math.min(1, (ohwIn(s) / w) ** (1 / FUS_SHAPE.side))); }
const bump = (s) => { const u = (s - OPEN[0]) / (OPEN[1] - OPEN[0]); return u <= 0 || u >= 1 ? 0 : RISE * (u < BUMP.a ? Math.sin(Math.PI / 2 * u / BUMP.a) ** BUMP.q : u > 1 - BUMP.b ? Math.cos(Math.PI / 2 * (u - 1 + BUMP.b) / BUMP.b) ** 0.5 : 1); };
/** the canopy surface at offset off (in, − inward): the contour raised by the bump, weighted to zero at the sills */
export function canPt(s, t, off = 0) {
  const ts = tCut(s, 0), sl = Math.sin(ts), g = Math.max(0, Math.min(1, (Math.sin(t) - sl) / (1 - sl))) ** 1.3, [y, z] = yz(s, t, off);
  return [y, z + bump(s) * g];
}
const arc = (s, off, a, b, n) => Array.from({ length: n + 1 }, (_, i) => canPt(s, a + (b - a) * i / n, off));
/** parameter where the outer surface's arc length from the right sill reaches L (in) */
function tAt(s, L) { let t = tCut(s, 0), p = canPt(s, t), acc = 0; const dt = 0.002; while (acc < L) { t += dt; const q = canPt(s, t); acc += Math.hypot(q[0] - p[0], q[1] - p[1]); p = q; } return t; }
const band = (s, o1, o2, a1, b1, a2, b2, n) => [...arc(s, o1, a1, b1, n), ...arc(s, o2, a2, b2, n).reverse()].map(([y, z]) => [r4(y), r4(z)]);
const mirror = (P) => P.map(([y, z]) => [-y, z]).reverse();   // left side: mirrored, same winding
const LAYERS = () => ({ fo: [0, -CANF.tf], core: [-CANF.tf, -CANF.tf - CANF.coreIn], fi: [-CANF.tf - CANF.coreIn, -CANF.t] });
/** a section's regions: bows are frame all round; between the bows, rails (layers + UNI caps) each side and the bubble */
export function canSection(s, bow) {
  const R = {}, L = LAYERS(), n = CANF.n, nb = CANF.nB;
  if (bow) { for (const [k, [o1, o2]] of Object.entries(L)) R[k] = band(s, o1, o2, tCut(s, o1), Math.PI - tCut(s, o1), tCut(s, o2), Math.PI - tCut(s, o2), nb); return R; }
  const tR = tAt(s, CANF.railH), tCb = tAt(s, CANF.capW), tCt = tAt(s, CANF.railH - CANF.capW), cap = CAP.n * tU;
  for (const [k, [o1, o2]] of Object.entries(L)) { const P = band(s, o1, o2, tCut(s, o1), tR, tCut(s, o2), tR, n); R[`${k}_r`] = P; R[`${k}_l`] = mirror(P); }
  if (cap > 0) for (const [k, a, b] of [['capB', null, tCb], ['capT', tCt, tR]]) { const a0 = a ?? tCut(s, -CANF.t), a1 = a ?? tCut(s, -CANF.t - cap); const P = band(s, -CANF.t, -CANF.t - cap, a0, b, a1, b, n); R[`${k}_r`] = P; R[`${k}_l`] = mirror(P); }
  R.bubble = band(s, 0, -CANF.acrylic, tR, Math.PI - tR, tR, Math.PI - tR, nb);
  return R;
}
export const GROUP = { fo_r: 'face', fo_l: 'face', fi_r: 'face', fi_l: 'face', fo: 'face', fi: 'face', core_r: 'core', core_l: 'core', core: 'core', capB_r: 'cap', capB_l: 'cap', capT_r: 'cap', capT_l: 'cap', bubble: 'acrylic' };
/** stations (ft): the bows, and every 0.25 ft between */
export function canStations() {
  const brk = [CANF.bow0[0], CANF.bow0[1], CANF.bow1[0], CANF.bow1[1]], out = [];
  for (let i = 0; i < 3; i++) { const n = Math.max(1, Math.ceil((brk[i + 1] - brk[i]) / 0.25)); for (let k = 0; k < n; k++) out.push(brk[i] + (brk[i + 1] - brk[i]) * k / n); }
  out.push(brk[3]); return out.map(r4);
}
const pieceOf = (m) => (m < CANF.bow0[1] ? 'front' : m > CANF.bow1[0] ? 'aft' : 'mid');

// ------------------------------------------------------------------------------------------- frame cap sizing
/** left rail as a beam carrying half the average suction: cantilevered forward of the first hook to the front bow and
 *  aft of the last to the aft bow (the bows' tie to the hinge ignored), continuous over the hooks between. Caps of n UNI
 *  on the inner face at the rail's foot and top; the BID faces and the bubble are ignored in bending (conservative). */
export const CAP = { n: 0 };
export function railState(d, M, n = CAP.n) {
  const st = CL.st.map((x) => x * 12), L = (CANF.bow1[1] - CANF.bow0[0]) * 12, w = suction(d.VD) / 2 / L;
  const a = st[0] - CANF.bow0[0] * 12, b = CANF.bow1[1] * 12 - st.at(-1), span = Math.max(...st.slice(1).map((x, i) => x - st[i]));
  const Mc = w * Math.max(a, b) ** 2 / 2, Ms = w * span ** 2 / 8, Mu = Math.max(Mc, Ms) * d.FS;
  const h = CANF.railH - CANF.capW, A = n * tU * CANF.capW, sig = A > 0 ? Mu / (A * h) : Infinity, Xc = psi(M.GUD.Xc);
  return { w, a, b, span, Mc, Ms, Mu, h, A, sig, Xc, ms: Xc / sig - 1 };
}
{ const d = effective(DEFAULT_DESIGN), M = materials(d); for (let k = 1; k <= 20; k++) { CAP.n = k; if (railState(d, M).ms >= TGT) break; } }

// ------------------------------------------------------------------------------------------- solid parameters, volumes, mass
export function canParams() {
  const st = canStations(), segs = [];
  for (let i = 0; i < st.length - 1; i++) {
    const sa = st[i], sb = st[i + 1], piece = pieceOf((sa + sb) / 2), bow = piece !== 'mid', A = canSection(sa, bow), B = canSection(sb, bow), regions = {};
    for (const k of Object.keys(A)) regions[k] = [A[k], B[k]];
    const prev = i > 0 ? pieceOf((st[i - 1] + sa) / 2) : null, next = i < st.length - 2 ? pieceOf((sb + st[i + 2]) / 2) : null;
    segs.push({ piece, ha: sa, hb: sb, keep: [prev !== piece, next !== piece], O: [[0, r4(sa * 12), 0], [0, r4(sb * 12), 0]], regions });
  }
  const axes = Object.fromEntries(['front', 'mid', 'aft'].map((p) => [p, [[1, 0, 0], [0, 0, 1]]]));
  return { segs, axes, group: GROUP, feat: { face: 'frame', core: 'frame', cap: 'cap', acrylic: 'bubble' }, n: segs.length, capUNI: CAP.n };
}
const area = (p) => Math.abs(p.reduce((a, q, i) => { const r = p[(i + 1) % p.length]; return a + q[0] * r[1] - r[0] * q[1]; }, 0)) / 2;
const cen = (p) => { let A = 0, cy = 0, cz = 0; p.forEach((q, i) => { const r = p[(i + 1) % p.length], c = q[0] * r[1] - r[0] * q[1]; A += c; cy += (q[0] + r[0]) * c; cz += (q[1] + r[1]) * c; }); return [cy / (3 * A), cz / (3 * A)]; };
/** ruled-loft volumes by group (in³), exact (Simpson on the vertex-interpolated mid section), and the CG (FS, BL, WL) */
export function canVolumes() {
  const P = canParams(), V = { face: 0, core: 0, cap: 0, acrylic: 0 };
  for (const s of P.segs) { const L = (s.hb - s.ha) * 12; for (const [k, [a, b]] of Object.entries(s.regions)) { const m = a.map((q, i) => [(q[0] + b[i][0]) / 2, (q[1] + b[i][1]) / 2]); V[P.group[k]] += L / 6 * (area(a) + 4 * area(m) + area(b)); } }
  return V;
}
export const CAN_RHO = { face: plyWeight('BID', 1, 1) / 144 / tB, cap: plyWeight('GUD', 1, 1) / 144 / tU, core: BASE_MAT.PVC.rho * 62.43 / 1728, acrylic: 0.0430 };
export const canMassOf = (v) => Object.entries(CAN_RHO).reduce((a, [g, r]) => a + (v[g] ?? 0) * r, 0);
export function canCG() {
  const P = canParams(); let W = 0, mf = 0, mz = 0;
  for (const s of P.segs) { const L = (s.hb - s.ha) * 12, fm = (s.ha + s.hb) / 2 * 12; for (const [k, [a, b]] of Object.entries(s.regions)) { const r = CAN_RHO[P.group[k]], w = (area(a) + area(b)) / 2 * L * r, c = cen(a.map((q, i) => [(q[0] + b[i][0]) / 2, (q[1] + b[i][1]) / 2])); W += w; mf += w * fm; mz += w * c[1]; } }
  return { W, fs: mf / W, wl: mz / W };
}
export const CANV = canVolumes(), CAN_MASS = canMassOf(CANV), CAN_CG = canCG();
// the system record and the strut check take the defined mass and CG (the hinge pin is on the outer sill corner)
/** the hinge line (LEZ-56-110, wp4 HINGE: the outer right sill corner, FS 68–96) at station s (ft) */
export const hingeAt = (s) => { const [a, b] = HINGE, u = (s - a[0]) / (b[0] - a[0]); return a.map((v, i) => v + (b[i] - v) * u); };
{ const p = partByPN('LEZ-56-100'); if (p) { p.massEach = +CAN_MASS.toFixed(3); p.canopy = { mass: +CAN_MASS.toFixed(3), cgAbove: +(CAN_CG.wl / 12 - hingeAt(CAN_CG.fs / 12)[2]).toFixed(4), src: 'GEOMETRY: LEZ-56-100 definition solid (mass and CG)' }; p.src = { ...p.src, mass: 'GEOMETRY: the definition solid (LEZ-56-100)' }; } }

// ------------------------------------------------------------------------------------------- strut and check-cable geometry
/** the shell's inner wall (offset −FUS.t) at station s (ft) and WL z (in): its BL (in), right side */
export function wallAt(s, z, off = -CANF.t) { let lo = -Math.PI / 2 + 0.05, hi = tCut(s, off); for (let i = 0; i < 50; i++) { const m = (lo + hi) / 2; if (yz(s, m, off)[1] < z) lo = m; else hi = m; } return yz(s, lo, off)[0]; }
/** strut (LEZ-56-120): fixed ball stud on a wall bracket 5 in below the sill, moving stud on a bracket bonded to the right
 *  rail's inner face reaching 3.8 in inboard; both at FS 92, aft of the right armrest. Offsets (ft) from the hinge line at s,
 *  lateral (− inboard) and up. Check cable (LEZ-56-130): from the aft bow's left corner (the free side, which rises 22 in
 *  when open) to a bracket in the left longeron band at FS 127; folded along the aft bow under a bungee when closed. */
export const STRUT_DEF = (() => { const s = 66.5 / 12, h = hingeAt(s), zf = h[2] * 12 - 5.0, stud = 0.40; return { s, fixed: [(wallAt(s, zf) - stud) / 12 - h[1], -5.0 / 12], move: [-0.32, 0.10], stud, zf }; })();
Object.assign(STRUT, { s: STRUT_DEF.s, fixed: STRUT_DEF.fixed, move: STRUT_DEF.move });
{ const p = partByPN('LEZ-56-120'), h = hingeAt(STRUT.s); if (p) p.geo = [{ t: 'cyl', a: [STRUT.s, h[1] + STRUT.fixed[0], h[2] + STRUT.fixed[1]], b: [STRUT.s, h[1] + STRUT.move[0], h[2] + STRUT.move[1]], r: 0.03 }]; }
export const CABLE = (() => { const s = 103.4 / 12, q = canPt(s, Math.PI - tCut(s, -CANF.t) - 0.12, -CANF.t), bw = bandAt(s), zw = (bw.low + bw.top) / 2;
  const wall = [s, -(wallAt(s, zw) - 0.35) / 12, zw / 12], frame = [s, q[0] / 12, q[1] / 12], h = hingeAt(s);
  // at 80° open (rotation about the hinge, lifting the inboard side): the frame end's position, the cable length and its lever about the hinge
  const th = STRUT.openDeg * Math.PI / 180, rel = [frame[1] - h[1], frame[2] - h[2]], o = [h[1] + rel[0] * Math.cos(th) + rel[1] * Math.sin(th), h[2] - rel[0] * Math.sin(th) + rel[1] * Math.cos(th)];
  const u = [o[0] - wall[1], o[1] - wall[2]], L = Math.hypot(...u), lever = Math.abs((h[1] - wall[1]) * u[1] - (h[2] - wall[2]) * u[0]) / L;
  const Lc = Math.hypot(frame[1] - wall[1], frame[2] - wall[2]);
  return { s, wall, frame, open: [s, ...o], L: L * 12, Lclosed: Lc * 12, lever: lever * 12 }; })();


// ------------------------------------------------------------------------------------------- checks
/** the bubble's crown radius at its widest section: circle through the crown and the points 4 in either side */
export function crownR() {
  const s = (CANF.bow0[1] + CANF.bow1[0]) / 2, a = canPt(s, Math.PI / 2), tL = (t) => { let lo = 0.3, hi = Math.PI / 2; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (canPt(s, m)[0] > 4) lo = m; else hi = m; } return lo; };
  const b = canPt(s, tL()), c = [-b[0], b[1]], sag = a[1] - b[1];
  return { s, R: (b[0] ** 2 + sag ** 2) / (2 * sag), half: b[0], sag, top: a[1] }; void c;
}
export const ACRYLIC = { craze: 1500, why: 'BOUND: long-term (crazing) design stress for cast / stretched acrylic, typed from memory (≈ 1,500 psi; short-term tensile ≈ 9,000–10,000 psi)' };
registerChecks('wpB1-canopy', (d, lc, Z, M) => {
  if (lc.id !== 'W1-S1') return [];
  const out = [], q = 0.5 * 0.002377 * (d.VD * 1.6878) ** 2 / 144, C = crownR();
  { const p = CP.peak * q * d.FS, sig = p * C.R / CANF.acrylic, ms = ACRYLIC.craze / sig - 1;
    out.push(Object.assign(mk('fuselage', 'can-bubble', 'Canopy bubble: acrylic membrane under peak suction at V_D', lc, `crown, FS ${(C.s * 12).toFixed(0)}`, 'acrylic membrane (long-term)', ms, {
      formula: 'p = |Cp_peak|·q_D × FS;  σ = p·R / t (cylindrical membrane, crown radius R from the section)', inputs: [IN_('V_D', d.VD, 'kt', 'MODEL'), IN_('Peak suction Cp', -CP.peak, '', cpBound(CP.peak, ms, 'peak')),
        IN_('Crown radius R', C.R, 'in', 'GEOMETRY'), IN_('Acrylic thickness', CANF.acrylic, 'in', 'DESIGN'), IN_('Allowable', ACRYLIC.craze, 'psi', ACRYLIC.why)],
      result: [['p (ult.)', p, 'psi'], ['σ', sig, 'psi']] }), { sys: 'LEZ-56-100' })); }
  { const F = suction(d.VD) * d.FS, per = 2 * (CANF.bow1[0] - CANF.bow0[1]) * 12 + 2 * 2 * ohwIn(6.5) * 1.15, tau = F / (per * CANF.bondW), all = 0.5 * psi(M.FLOX.shear), ms = all / tau - 1;
    out.push(Object.assign(mk('fuselage', 'can-bond', 'Canopy bubble bond into the frame (flox + 2 × 6781 over the edge)', lc, 'bubble perimeter', 'bond shear', ms, {
      formula: 'τ = FS·F_suction / (perimeter × bond width): the whole average suction on the bubble edge', inputs: [IN_('V_D', d.VD, 'kt', 'MODEL'), IN_('Average suction Cp', -CP.avg, '', cpBound(CP.avg, ms)),
        IN_('Bond perimeter (rails + bows, arc × 1.15)', per, 'in', 'GEOMETRY'), IN_('Bond width', CANF.bondW, 'in', 'DESIGN'), IN_('Flox on scuffed acrylic', all, 'psi', 'BOUND: half the published resin (flox) shear, typed from memory for epoxy on scuffed acrylic; no coupon test')],
      result: [['Suction (ult.)', F, 'lb'], ['τ', tau, 'psi']] }), { sys: 'LEZ-56-100' })); }
  { const r = railState(d, M);
    out.push(Object.assign(mk('fuselage', 'can-rail', `Canopy left rail between and beyond the hooks (${CAP.n} × 6781 0/90 caps)`, lc, `left rail, ${r.Mc >= r.Ms ? 'forward of the first hook' : 'between hooks'}`, '6781 0/90 cap compression', r.ms, {
      formula: 'w = (F/2)/L_rail;  M = max(w·a²/2, w·ℓ²/8) × FS;  σ = M / (A_cap·h)', inputs: [IN_('Average suction Cp', -CP.avg, '', cpBound(CP.avg, r.ms)), IN_('Overhang a / bay ℓ', `${Math.max(r.a, r.b).toFixed(1)} / ${r.span.toFixed(1)} in`, 'text', 'GEOMETRY'),
        IN_('Caps', `${CAP.n} × 6781 0/90 × ${CANF.capW} in at the foot and top of the ${CANF.railH} in rail`, 'text', 'SIZED'), IN_('6781 0/90 compression', r.Xc, 'psi', allowB(r.ms, 'compression'))],
      result: [['w (limit)', r.w, 'lb/in'], ['M (ult.)', r.Mu, 'in·lb'], ['σ cap', r.sig, 'psi']] }), { sys: 'LEZ-56-100' })); }
  return out;
});

// ------------------------------------------------------------------------------------------- the longeron band
/** the top longeron band on the inner wall (14 UNI × 1.75 in down the side arc from the sill, LEZ-53-150): the WL of
 *  its upper (inner sill) and lower edges at station s (ft), and the wall BL at a WL inside it; every block-B fastener
 *  into the shell goes into this band (potted nutplates, fitted from inside) */
export function bandAt(s) {
  const off = -CANF.t, t1 = tCut(s, off); let t = t1, p = yz(s, t, off), acc = 0;
  while (acc < 1.75) { t -= 0.002; const q = yz(s, t, off); acc += Math.hypot(q[0] - p[0], q[1] - p[1]); p = q; }
  return { top: yz(s, t1, off)[1], low: p[1], yTop: yz(s, t1, off)[0], yLow: p[0] };
}
export const inBand = (s, z, m = 0.15) => { const b = bandAt(s); return z >= b.low + m && z <= b.top - m; };
/** |BL| (in) of the canopy surface at offset off on the right side at station s (ft) and WL z (in), up the rail */
export function surfY(s, z, off = 0) { let lo = tCut(s, off), hi = Math.PI / 2; for (let i = 0; i < 50; i++) { const m = (lo + hi) / 2; if (canPt(s, m, off)[1] < z) lo = m; else hi = m; } return canPt(s, lo, off)[0]; }
