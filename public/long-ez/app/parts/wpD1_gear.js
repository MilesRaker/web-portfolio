// WPD1 — main landing gear, block D: the one-piece bow LEZ-32-170 and its attachment LEZ-32-120. Notional.
//  • Bow: solid UNI E-glass packs on a fixed centre-line (GEO.gear, gearLeg). The leg end is vertical, its outboard face at
//    BL ±39.9 inboard of the brake stack (LEZ-32-310), so the axle flange bolts laterally through it. The ply schedule is
//    fully stressed along the leg in bending and in torsion (the ±45 BID over-wrap shares the torque by stiffness), at the
//    +15 % reserve, under FAR 23.479 (level landing, drag 0.25 V), 23.485 (side load 0.33 W out / 0.5 W in), 23.493 (braked
//    roll, drag 0.8 V at the ground) and 23.483 (one-wheel landing, for the mounts). Root plies also carry gear-bend and the
//    prop-clearance stiffness check (gear-prop) in structures.js, which read this schedule through FIXED.gearSectionFn.
//  • Attachment: per side a 4130 N tube in a UNI ear on the bow, an AN bolt fore-aft through the tube and two 6061-T6 angles
//    outside the belly (forward and aft of the bow), each held by two AN bolts through the shell's hard-point pads (F-D4 /
//    F-D5) into a backing strip inside. The mounts are pins about the fore-aft axis, so the roll moment of the wheel loads
//    becomes a vertical couple across the two mounts (23.483 one-wheel landing: near mount ≈ 3 V up, far mount ≈ 2 V down).
// Inches unless noted; aircraft axes x = FS (aft), y = BL (right), z = WL (up).
import { GEO, FIXED, registerChecks, mk, psi, allowB, materials, effective, DEFAULT_DESIGN, loadCases, gearLeg, gearLegLength, BASE_MAT, laminate, plyRF } from '../structures.js';
import { registerBookExtras, plyWeight, PROCESS } from '../plybook.js';
import { partByPN } from '../systems.js';
import { layer, FUS } from './wp26_fuselage.js';

export const anDash = (L) => { const e = Math.ceil(L * 8 - 1e-6), w = Math.floor(e / 8), r = e % 8; return `${w ? w : ''}${r}`; };   // AN bolt length code: inches then eighths
const TGT = 0.15, FF = 1.15, IN_ = (n, v, u, s = 'DERIVED') => [n, v, u, s], r4 = (x) => Math.round(x * 1e4) / 1e4;
const g = GEO.gear, tU = BASE_MAT.GUD.t, tB = BASE_MAT.BID.t;
export const YM = g.mountY * 12, ZR = g.rootZ * 12, YC = g.track / 2 * 12, S0 = g.s * 12, ZAX = g.axleZ * 12;
const bid = (n) => Array.from({ length: n }, () => ({ mat: 'BID', angle: 45 }));
// single shear Fsu 75 ksi × π/4 d² (integration 2026-11-19, ICD A-M5; memaudit hwregs: AN3 2,126, AN4 3,682 lb); tension as typed (BOUND)
const ANs = (n) => Math.floor(75000 * Math.PI / 4 * (n / 16) ** 2), AN = { 3: { s: ANs(3), t: 2210 }, 4: { s: ANs(4), t: 4080 }, 5: { s: ANs(5), t: 6500 }, 6: { s: ANs(6), t: 10100 }, 7: { s: ANs(7), t: 13600 }, 8: { s: ANs(8), t: 18500 } };   // single shear / tension ultimate, lb (AN standard)
const ST = { Ftu: 95000, Fty: 75000, rho: 0.283, spec: 'MIL-HDBK-5, 4130 N tube (MIL-T-6736)' };
const AL = { Ftu: 38000, Fty: 35000, Fsu: 24000, Fbru: 80000, rho: 0.098, spec: 'MMPDS-typical 6061-T6 extrusion (AMS-QQ-A-200/8): F_tu 38, F_ty 35, F_su 24, F_bru (e/D 2) 80 ksi' };

// ------------------------------------------------------------------------------------------- bow geometry
export const BOW = { w0: 4.5, w1: 3.5, pack: 8, ramp: 0.25, legFace: 39.9 };   // w: fore-aft width, DESIGN (w1 holds the axle bolt pattern)
export const wAt = (u) => BOW.w0 + (BOW.w1 - BOW.w0) * Math.max(0, Math.min(1, u));
const LLEG = () => gearLegLength() * 12;
/** centre-line point (in) and unit tangent in the bow plane (y, z) at leg fraction u */
export function legAt(u) {
  if (u < 0) return { p: [YM * (1 + u), ZR], t: [1, 0] };   // centre section, u ∈ [−1, 0) from BL 0 to the mount
  const p = gearLeg(u).map((v) => v * 12), a = gearLeg(Math.max(0, u - 1e-4)), b = gearLeg(Math.min(1, u + 1e-4)), L = Math.hypot(b[0] - a[0], b[1] - a[1]);
  return { p, t: [(b[0] - a[0]) / L, (b[1] - a[1]) / L] };
}
/** wheel force sets (limit, lb) on the right wheel at the ground contact (BL YC, WL 0): V up, D aft, S outboard */
export function wheelSets(d, lc) {
  if (lc.type !== 'ground') return [];
  const W = lc.ac.W;
  if (lc.ground === 'level') { const V = 0.5 * W * (lc.n - 0.667); return [{ tag: 'level landing (23.479)', V, D: 0.25 * V, S: 0 }]; }
  if (lc.ground === 'side') { const V = 0.5 * W * 1.33; return [{ tag: 'side load, 0.33 W outboard (23.485)', V, D: 0, S: 0.33 * W }, { tag: 'side load, 0.5 W inboard (23.485)', V, D: 0, S: -0.5 * W }]; }
  const V = 0.5 * W * 1.33; return [{ tag: 'braked roll, μ 0.8 (23.493)', V, D: 0.8 * V, S: 0 }];
}
/** internal loads at leg station u from one wheel force set: in-plane moment Mx, out-of-plane Mn, torque T, axial N, shears */
export function legLoads(F, u) {
  const { p, t } = legAt(u), ry = YC - p[0], rz = 0 - p[1];
  const Mx = ry * F.V - rz * F.S, My = rz * F.D, Mz = -ry * F.D;
  return { Mx, T: My * t[0] + Mz * t[1], Mn: -My * t[1] + Mz * t[0], N: F.S * t[0] + F.V * t[1], Vn: -F.S * t[1] + F.V * t[0], Vx: F.D };
}
const Jrect = (b, c) => { if (c > b) [b, c] = [c, b]; return b * c ** 3 * (1 / 3 - 0.21 * (c / b) * (1 - c ** 4 / (12 * b ** 4))); };
const tauRect = (T, b, c) => { if (c > b) [b, c] = [c, b]; return T * (3 * b + 1.8 * c) / (b * b * c * c); };   // Roark, max shear at the middle of the long side
/** ultimate state of a section (w × t core, nX-ply ±45 BID over-wrap) under one force set */
export function legState(F, u, w, t, nX, M, FS) { const S = bid(nX); return legStateWith(legLoads(F, u), S, laminate(S, M), w, t, nX, M, FS); }
/** legState with the leg loads, the wrap's ply stack and its laminate given (the sizing loop works them once per station
 *  and wrap count: the same values; perf) */
function legStateWith(L, S, sk, w, t, nX, M, FS) {
  const Xc = psi(M.GUD.Xc), Sa = psi(M.GUD.S), G12 = psi(M.GUD.G12);
  const sig = FS * (Math.abs(L.Mx) * 6 / (w * t * t) + Math.abs(L.Mn) * 6 / (t * w * w) + Math.abs(L.N) / (w * t));
  const ts = sk.h, A = (w + ts) * (t + ts), per = 2 * (w + t + 2 * ts), GJs = 4 * A * A * sk.Gxy * ts / per, GJc = G12 * Jrect(w, t);
  const T = Math.abs(L.T) * FS, Tc = T * GJc / (GJc + GJs), tau = tauRect(Tc, w, t) + 1.5 * FS * Math.max(Math.abs(L.Vx), Math.abs(L.Vn)) / (w * t), q = (T - Tc) / (2 * A);
  const rf = plyRF(S, [0, 0, q], M);
  return { L, sig, msB: Xc / sig - 1, T, Tc, tau, msC: Sa / tau - 1, q, rfS: rf.rf, msS: rf.rf - 1, skMode: rf.mode, share: GJc / (GJc + GJs) };
}

// ------------------------------------------------------------------------------------------- ply schedule (sized at the default design)
const UG = Array.from({ length: 49 }, (_, i) => i / 48);
export const GEAR_SIZE_W = 1420;   // lb, DESIGN (block P): the bow's sizing weight
// block P: the 6781 0/90 bow is sized to the 10 % end of the 10–15 % reserve band: at 15 % it is 0.08 in thicker and its centre
// section would come within 0.25 in of the belly (I4)
const TGT_BOW = 0.10;
function sizeSchedule() {
  // block P (2026-11-19): sized at a 1420 lb gross-case weight (DESIGN), above the heaviest gross case of the defined mass model
  // (W1 ≈ 1402 lb after the prepreg conversion moved the empty CG aft and raised the loading adjustment), so the bow's margin does
  // not depend on the mass-model state at module load (the solid's params must not)
  const d = effective(DEFAULT_DESIGN), M = materials(d), sets = loadCases(d).flatMap((lc) => wheelSets(d, lc.ac ? { ...lc, ac: { ...lc.ac, W: Math.max(lc.ac.W, GEAR_SIZE_W) } } : lc));
  const req = (u, nX) => { const S = bid(nX), sk = laminate(S, M), Ls = sets.map((F) => legLoads(F, u));
    for (let n = 8; n < 400; n++) { const t = n * tU; if (Ls.every((L) => { const s = legStateWith(L, S, sk, wAt(u), t, nX, M, d.FS); return s.msB >= TGT_BOW && s.msC >= TGT_BOW && s.msS >= TGT_BOW; })) return n; } return 400; };
  let best = null;
  for (let nX = 4; nX <= 16; nX += 2) {
    const n = UG.map((u) => req(u, nX)), mono = n.map((_, i) => Math.max(...n.slice(i)));
    const vol = mono.reduce((a, m, i) => a + (i ? m * tU * wAt(UG[i]) * LLEG() / 48 : 0), 0) + YM * BOW.w0 * mono[0] * tU;
    const wrap = nX * tB * 2 * (YM + LLEG()) * 2 * (BOW.w0 + mono[0] * tU) * 0.75;   // rough over-wrap volume (lower perimeter outboard)
    const m = vol * 0.072 + wrap * 0.062;
    if (!best || m < best.m) best = { nX, mono, m };
  }
  return { nX: best.nX, mono: best.mono, root: Math.ceil(best.mono[0] / BOW.pack) * BOW.pack };
}
export const SCHED = sizeSchedule();
FIXED.gearPliesMin = SCHED.root;
const monoAt = (u) => { const i = Math.min(48, Math.max(0, Math.ceil(u * 48 - 1e-9))); return SCHED.mono[i]; };
const PACKS = new Map();
/** the packs for k root plies: target n(u) = max(fully stressed, k × the stiffness taper); a pack ends where the target falls
 *  below the plies under it (on the 1/48 grid, outboard: conservative); drops staggered ≥ 1 in by moving the longer pack out */
export function packsFor(k) {
  if (PACKS.has(k)) return PACKS.get(k);
  const target = (u) => Math.max(monoAt(u), k * (1 - (1 - g.taper) * u)), nP = Math.ceil(k / BOW.pack), out = [];
  for (let j = 0; j < nP; j++) { const below = j * BOW.pack, i = UG.findIndex((u) => u > 0 && target(u) <= below + 1e-9); out.push({ j, plies: Math.min(BOW.pack, k - below), uEnd: i < 0 ? 1 : UG[i] }); }
  const du = 1 / LLEG();
  for (let j = out.length - 2; j >= 0; j--) if (out[j].uEnd < 1 && out[j].uEnd - out[j + 1].uEnd < du) out[j].uEnd = Math.min(1, out[j + 1].uEnd + du);
  PACKS.set(k, out); return out;
}
const pliesAt = (packs, u, incl = false) => packs.reduce((a, p) => a + ((incl ? p.uEnd >= u - 1e-9 : p.uEnd > u + 1e-9) || p.uEnd >= 1 ? p.plies : 0), 0);
FIXED.gearSectionFn = (Z, M, u) => ({ w: wAt(u), t: pliesAt(packsFor(Z.gearPlies), u) * M.GUD.t });
FIXED.gearSource = { w: 'DESIGN: 4.5 in at the mounts tapering to 3.5 in at the axle (holds the axle bolt pattern)' };
export const bowPacks = () => packsFor(FIXED.gearPliesMin);   // the default design: the solid and the record are built on this

// ------------------------------------------------------------------------------------------- the ear and the attachment (LEZ-32-120)
export const EAR = { ns: 12, f: 0.20, Lfl: 1.5, nw: 6, Lw: 1.5 };   // strap plies, filler under the tube, strap flange each side, clamp-wrap plies and width
const BELLY = (() => { const L = layer(g.s, 0, -FUS.tf, false, 1), n = FUS.n + 1; return L.slice(0, n).map((q) => [q[0], q[1]]); })();   // OML at the gear station, BL 0 → side
function closestOnBelly(H) {
  let best = null;
  for (let i = 0; i < BELLY.length - 1; i++) { const a = BELLY[i], b = BELLY[i + 1], ab = [b[0] - a[0], b[1] - a[1]], L2 = ab[0] ** 2 + ab[1] ** 2, s = Math.max(0, Math.min(1, ((H[0] - a[0]) * ab[0] + (H[1] - a[1]) * ab[1]) / L2)), p = [a[0] + s * ab[0], a[1] + s * ab[1]], dd = Math.hypot(H[0] - p[0], H[1] - p[1]);
    if (!best || dd < best.d) best = { p, d: dd, tan: [ab[0] / Math.sqrt(L2), ab[1] / Math.sqrt(L2)] }; }
  return best;
}
const TUBES = [[0.625, 0.125], [0.75, 0.125], [0.75, 0.188], [0.875, 0.125], [0.875, 0.188], [1.0, 0.188], [1.0, 0.25]];   // 4130 N OD × wall
const BOLT_FOR = (id) => [3, 4, 5, 6, 7, 8].find((n) => Math.abs(n / 16 - id) < 0.006);
/** bow top surface WL at BL y near the mount (right side) */
export function bowTop(y, t0) {
  if (y <= YM) return ZR + t0 / 2;
  let a = 0, b = 0.3; const q = (u) => { const { p, t } = legAt(u); return [p[0] - t[1] * t0 / 2, p[1] + t[0] * t0 / 2]; };
  for (let i = 0; i < 50; i++) { const m = (a + b) / 2; if (q(m)[0] < y) a = m; else b = m; }
  return q((a + b) / 2)[1];
}
function mountGeo(tube, te, b, nb) {
  const t0 = bowPacks().reduce((a, p) => a + p.plies, 0) * tU, [D, wall] = tube, r = D / 2, Lt = BOW.w0 + 2 * 0.06, ztc = bowTop(YM, t0) + EAR.f + r;
  const c = closestOnBelly([YM, ztc]), n = [(YM - c.p[0]) / c.d, (ztc - c.p[1]) / c.d], tbed = 0.03, tf = te, db = BOLT_FOR(D - 2 * wall) / 16, e = Math.max(2 * db, 0.5) + 0.05;
  const nb_ = nb, dbb = nb_ / 16, c1 = 0.6, pb = Math.max(4 * dbb, 0.75), eb = 2 * dbb + 0.05, Lf = te + c1 + pb + eb, hpT = FUS.t + (FIXED.gearMount.padBID + FIXED.gearMount.padsBID) * tB;
  return { D, wall, r, Lt, ztc, t0, P: c.p, n, a: [-n[1], n[0]], dc: c.d, tbed, tf, te, b, db, e, h: c.d - tbed - tf, nb: nb_, dbb, c1, pb, eb, Lf, hpT, tk: 0.125, bk: b, Lk: pb + 2 * eb, Ls: Lt + te, Lear: BOW.w0 };
}
/** share of each leg's yaw moment (braking drag × lateral arm) taken by its mount's fore-aft angle couple; the rest goes round
 *  the centre section in strong-axis bending (gear-bend, gear-leg take all of it there). Estimate: centre section 2EI/L ≈ 9e6 in·lb/rad
 *  in single curvature against the angles' bolt couple (L_s/2)²·2·k_bolt ≈ 4e6 with hole clearance taken up first */
export const YAW = 0.35;
/** per-mount reactions on the bow (limit), for every wheel combination of the case; mirrored to the right side */
export function mountCombos(d, lc, zt = GM.ztc) {
  const sets = wheelSets(d, lc); if (!sets.length) return [];
  const out = [];
  const solve = (tag, wR, wL) => {   // wR, wL: force sets on the right / left wheel (null = off the ground); S outboard on each side
    const F = [[wR, 1], [wL, -1]].filter(([w]) => w).map(([w, sg]) => ({ sg, Fx: w.D, Fy: sg * w.S, Fz: w.V }));
    const sFz = F.reduce((a, f) => a + f.Fz, 0), sFy = F.reduce((a, f) => a + f.Fy, 0), mx = F.reduce((a, f) => a + f.sg * YC * f.Fz + zt * f.Fy, 0);
    const RzR = (-sFz - mx / YM) / 2, RzL = (-sFz + mx / YM) / 2;
    for (const [sg, Rz] of [[1, RzR], [-1, RzL]]) {
      const own = F.find((f) => f.sg === sg), D = own ? own.Fx : 0;
      // right-side frame: mirror the left mount (y → −y)
      out.push({ tag: `${tag}, ${sg > 0 ? 'right' : 'left'} mount`, Rx: -D, Ry: -sFy * sg, Rz, My: zt * D, Mz: YAW * (YC - YM) * D });
    }
  };
  for (const w of sets) {
    solve(w.tag, w, w.S ? { ...w, S: w.S > 0 ? -0.5 / 0.33 * w.S : -0.33 / 0.5 * w.S } : w);   // 23.485: the other wheel carries the other side load, same direction
    if (lc.ground === 'level') { solve('one-wheel landing (23.483), right wheel', w, null); }
  }
  return out;
}
/** loads on one fitting leg (ult × fitting factor), in the right fitting's local axes: a along the belly, n out of it */
export function legForces(c, G, fu) {
  const out = [];
  for (const [nm, sz] of [['forward', 1], ['aft', -1]]) {
    const fy = -(c.Ry / 2 - sz * c.Mz / G.Ls) * fu, fz = -(c.Rz / 2 + sz * c.My / G.Ls) * fu, fx = Math.abs(c.Rx) * fu;
    out.push({ leg: nm, fy, fz, fx, fa: fy * G.a[0] + fz * G.a[1], fn: fy * G.n[0] + fz * G.n[1], P: Math.hypot(fy, fz) });
  }
  return out;
}
function fitState(c, G, fu, M) {
  const L = legForces(c, G, fu), Pm = Math.hypot(c.Ry, c.Rz) * fu, Mc = Math.hypot(c.My, c.Mz) * fu;
  const It = Math.PI / 64 * (G.D ** 4 - (G.D - 2 * G.wall) ** 4), Ib = Math.PI / 64 * G.db ** 4, Mt = Pm * (2 * G.Ls - G.Lear) / 8 + Mc * (G.Ls - G.Lear) / (2 * G.Ls), sT = Mt * G.D / 2 / (It + Ib);
  const lugA = Math.min(G.db * G.te * AL.Fbru, 2 * (G.e - G.db / 2) * G.te * AL.Fsu, (G.b - G.db) * G.te * AL.Ftu * 0.75);
  let w = { tube: AL.Ftu, pin: 9, lug: 9, leg: 9, base: 9, hp: 9 }, det = {};
  w.tube = ST.Ftu / sT - 1; det.tube = { Mt, sT };
  for (const f of L) {
    const pin = AN[BOLT_FOR(G.db) || 6].s / f.P - 1, lug = lugA / f.P - 1;
    const sL = 6 * f.fx * G.h / (G.b * G.te ** 2) + 6 * Math.abs(f.fa) * G.h / (G.te * G.b ** 2) + Math.abs(f.fn) / (G.b * G.te), leg = AL.Ftu / sL - 1;
    const Tb = 1.3 * Math.max(f.fn, 0) / 2 + f.fx * G.h / (2 * (G.te + G.c1)) + Math.abs(f.fa) * G.h / G.b, Vb = Math.hypot(f.fx, f.fa) / 2, bA = AN[G.nb], base = 1 / Math.hypot(Vb / bA.s, Tb / bA.t) - 1;
    const tHP = (4 + FIXED.gearMount.padBID + FIXED.gearMount.padsBID) * M.BID.t, brg = Vb / (G.dbb * tHP), push = Math.max(-f.fn, 0) / (G.b * G.Lf), pull = 2 * Tb / (G.bk * G.Lk);
    const hp = Math.min(psi(M.BID.Fbru) / brg, psi(M.BID.Yc) / Math.max(push, pull, 1e-6)) - 1;
    const keep = (k, ms, x) => { if (ms < w[k]) { w[k] = ms; det[k] = x; } };
    keep('pin', pin, { f }); keep('lug', lug, { f, lugA }); keep('leg', leg, { f, sL }); keep('base', base, { f, Tb, Vb }); keep('hp', hp, { f, brg, push, pull, tHP });
  }
  return { ms: w, det, L };
}
/** size the attachment: lightest tube, then the lightest angle leg and base bolts, at the +15 % reserve over every case */
export const GM = (() => {
  const d = effective(DEFAULT_DESIGN), M = materials(d), fu = d.FS * FF, lcs = loadCases(d).filter((lc) => lc.type === 'ground');
  let pick = null;
  for (const tube of TUBES) { if (!BOLT_FOR(tube[0] - 2 * tube[1])) continue;
    for (const te of [0.25, 0.3125, 0.375, 0.5]) for (const b of [1.5, 2.0, 2.5]) for (const nb of [4, 5]) {
      const G = mountGeo(tube, te, b, nb);
      const ok = lcs.every((lc) => mountCombos(d, lc, G.ztc).every((c) => Math.min(...Object.values(fitState(c, G, fu, M).ms)) >= TGT)); if (!ok) continue;
      const v = Math.PI / 4 * (tube[0] ** 2 - (tube[0] - 2 * tube[1]) ** 2) * G.Lt * ST.rho + 2 * (G.Lf * b * G.tf + te * b * (G.dc + G.e - G.tbed - G.tf)) * AL.rho + nb * 0.01;
      if (!pick || v < pick.v) pick = { ...G, v };
    } }
  if (!pick && typeof process !== 'undefined' && process.env.GMDBG) { const G = mountGeo(TUBES.at(-1), 0.5, 2.5, 5); for (const lc of lcs) for (const c of mountCombos(d, lc, G.ztc)) { const f = fitState(c, G, fu, M); console.log(c.tag, JSON.stringify(Object.fromEntries(Object.entries(f.ms).map(([k, v]) => [k, +v.toFixed(2)])))); } console.log(JSON.stringify(G)); }
  if (!pick) throw new Error('LEZ-32-120: no attachment meets the reserve');
  return pick;
})();

// structures.js hook: the bow ear (gear-tab, LEZ-32-170) and the shell hard point under the base bolts (fus-gear, LEZ-32-120)
FIXED.gearAttach = (d, lc, Z, M) => {
  if (!GM) return [];
  const fu = d.FS * FF, cs = mountCombos(d, lc); if (!cs.length) return [];
  const G = GM, ts = EAR.ns * M.GUD.t, tw = EAR.nw * M.GUD.t, Fbru = psi(M.GUD.Fbru), Xt = psi(M.GUD.Xt), ils = psi(M.GUD.ILSS);
  let wt = null, wf = null;
  for (const c of cs) {
    const P = Math.hypot(c.Ry, c.Rz) * fu, up = Math.max(c.Rz, 0) * fu, brg = P / (G.D * G.Lear), sS = up / (2 * G.Lear * ts), sW = up / (4 * EAR.Lw * tw), tau = Math.abs(c.Ry) * fu / (G.Lear * (G.D + 2 * ts + 2 * EAR.Lfl));
    const modes = [['ear bearing on the tube', Fbru / brg - 1], ['strap tension (bow pulled down)', Xt / Math.max(sS, 1e-6) - 1], ['clamp wraps (bow pulled down)', Xt / Math.max(sW, 1e-6) - 1], ['ear base shear', ils / tau - 1]].sort((a, b) => a[1] - b[1]);
    if (!wt || modes[0][1] < wt.ms) wt = { ms: modes[0][1], mode: modes[0][0], c, P, up, brg, sS, sW, tau };
    const f = fitState(c, G, fu, M); if (!wf || f.ms.hp < wf.ms) wf = { ms: f.ms.hp, c, ...f.det.hp };
  }
  const base = (x) => [IN_('Wheel loads', x.c.tag, 'text', 'FAR23'), IN_('Mount reaction R_y, R_z, M_y, M_z (limit)', `${x.c.Ry.toFixed(0)}, ${x.c.Rz.toFixed(0)} lb; ${x.c.My.toFixed(0)}, ${x.c.Mz.toFixed(0)} in·lb`, 'text', 'DERIVED: bow statics, pins at the mounts'), IN_('Fitting factor', FF, '', 'FAR 23.625')];
  return [
    Object.assign(mk('gear', 'gear-tab', `Gear bow ear at the mount: 6781 0/90 strap over the ${G.D} in tube, clamp wraps`, lc, `ear, BL ±${YM.toFixed(2)}`, wt.mode, wt.ms, {
      formula: 'P = FS·1.15·|R|;  σ_br = P/(D·L_ear);  strap σ = P_up/(2·L_ear·t_s);  wraps σ = P_up/(4·L_w·t_w);  τ = R_y/(L_ear·(D + 2t_s + 2L_fl))',
      inputs: [...base(wt), IN_('Ear', `${EAR.ns} × 6781 0/90 strap over the tube, ${EAR.Lfl} in flanges, ${EAR.nw} × 6781 0/90 clamp wraps ${EAR.Lw} in wide each side`, 'text', 'SIZED'), IN_('Tube OD', G.D, 'in', 'LEZ-32-120 (SIZED)'), IN_('Ear length (bow width)', G.Lear, 'in', 'DESIGN'),
        IN_('6781 0/90 bearing', Fbru, 'psi', allowB(wt.ms, 'compressive strength (bearing not published)')), IN_('6781 0/90 tension', Xt, 'psi', allowB(wt.ms, 'UD tension')), IN_('Interlaminar shear', ils, 'psi', allowB(wt.ms, 'interlaminar shear'))],
      result: [['P (ult. × 1.15)', wt.P, 'lb'], ['σ bearing', wt.brg, 'psi'], ['σ strap', wt.sS, 'psi'], ['σ wraps', wt.sW, 'psi'], ['τ ear base', wt.tau, 'psi']] }), { sys: 'LEZ-32-170' }),
    Object.assign(mk('fuselage', 'fus-gear', 'Main-gear attach angles: base bolts in the belly hard point, flange bearing and backing strip', lc, 'gear mount, belly at the F-D4 / F-D5 pads', 'laminate bearing / through-thickness compression', wf.ms, {
      formula: 'per angle: V_b = √(F_x² + F_a²)/2, σ_br = V_b/(d·t_hp);  push σ = F_n,in/(b·L_f);  pull σ = 2T_b/(b·L_k) on the backing strip;  against F_bru and Y_c (6781)',
      inputs: [...base(wf), IN_('Hard point', `${FUS.t.toFixed(3)} in shell (faces 2 + 2 × 6781, core replaced by flox under the bolts) + F-D1 ${FIXED.gearMount.padBID} × 6781 + F-D4/F-D5 ${FIXED.gearMount.padsBID} × 6781`, 'text', 'LEZ-53-150 ply book (SIZED)'),
        IN_('Base bolts', `2 × AN${G.nb} per angle, ${G.pb.toFixed(2)} in pitch`, 'text', 'LEZ-32-120 (SIZED)'), IN_('Flange', `${G.b} × ${G.Lf.toFixed(2)} in`, 'text', 'LEZ-32-120 (SIZED)'), IN_('Backing strip', `${G.bk} × ${G.Lk.toFixed(2)} × ${G.tk} in 6061-T6`, 'text', 'LEZ-32-120 (SIZED)'),
        IN_('6781 bearing', psi(M.BID.Fbru), 'psi', allowB(wf.ms, 'compressive strength (bearing not published)')), IN_('6781 through-thickness compression', psi(M.BID.Yc), 'psi', allowB(wf.ms, '6781 transverse compression, taken through the thickness'))],
      result: [['Bolt shear (ult.)', wf.f.fx && Math.hypot(wf.f.fx, wf.f.fa) / 2, 'lb'], ['σ bearing', wf.brg, 'psi'], ['σ push (flange)', wf.push, 'psi'], ['σ pull (strip)', wf.pull, 'psi']] }), { sys: 'LEZ-32-120' }),
  ];
};

// ------------------------------------------------------------------------------------------- the leg-end axle pad
/** the axle flange of LEZ-32-310 seats on the leg end over FS ±FLANGE.hy, WL ZAX ± FLANGE.hz (in) */
export const FLANGE = { hy: 1.4, hz: 1.6 };
/** the leg curves into its vertical end, so its outboard face falls away from the flat flange face (BL legFace) going up:
 *  a BID build-up moulded flat against the leg-end insert fills it (ICD D170-9). fill(z) = legFace − leg outer face (wrap incl.) */
export const LEGPAD = (() => {
  const packs = bowPacks(), wrap = SCHED.nX * tB, z0 = g.p1[1] * 12, z1 = ZAX + FLANGE.hz, N = 64;
  const face = (z) => { let lo = 0.5, hi = 1; for (let i = 0; i < 50; i++) { const m = (lo + hi) / 2; if (legAt(m).p[1] > z) lo = m; else hi = m; } const u = (lo + hi) / 2, q = legAt(u); return q.p[0] + Math.abs(q.t[1]) * (pliesAt(packs, u, true) * tU / 2 + wrap); };
  const zs = Array.from({ length: N + 1 }, (_, i) => z0 + (z1 - z0) * i / N), fill = zs.map((z) => BOW.legFace - face(z));
  const fMax = Math.max(...fill), fMin = Math.min(...fill), n = Math.max(1, Math.ceil((fMax - 0.005) / tB)), w = BOW.w1;
  const lenAt = (k) => zs.slice(1).reduce((a, z, i) => a + ((fill[i] + fill[i + 1]) / 2 > (k - 1) * tB ? z - zs[i] : 0), 0);   // WL length ply k covers
  const area = Array.from({ length: n }, (_, k) => w * lenAt(k + 1)), mean = area.reduce((a, b) => a + b, 0) / n;
  return { z0, z1, w, fill, zs, fMax, fMin, n, mean, plyAreas: area, face };
})();

// ------------------------------------------------------------------------------------------- the axle bolt group at the leg end
export const AXB = (() => {
  const d = effective(DEFAULT_DESIGN), M = materials(d), sets = loadCases(d).flatMap((lc) => wheelSets(d, lc)), fu = d.FS * FF, t1 = pliesAt(bowPacks(), 1) * tU;
  for (const nb of [4, 5, 6]) for (const a of [0.75, 1.0]) for (const b of [1.0, 1.25, 1.5]) {
    const D = nb / 16; if (BOW.w1 / 2 - a < 2 * D) continue; if (ZAX - b - 2 * D < g.p1[1] * 12 - 1e-6) continue;
    const st = sets.map((F) => axleState(F, { nb, D, a, b, t: t1 }, fu, M)); if (st.every((s) => s.ms >= TGT)) return { nb, D, a, b, t: t1 };
  }
  throw new Error('LEZ-32-170: no axle bolt group meets the reserve');
})();
export function axleState(F, A, fu, M) {
  const ry = YC - BOW.legFace, rz = -ZAX, Fx = F.D * fu, Fy = F.S * fu, Fz = F.V * fu;
  const Mx = ry * Fz - rz * Fy, My = rz * Fx, Mz = -ry * Fx, rb = Math.hypot(A.a, A.b);
  const V = Math.hypot(Fx, Fz) / 4 + Math.abs(My) / (4 * rb), T = Math.max(Fy, 0) / 4 + Math.abs(Mx) / (4 * A.b) + Math.abs(Mz) / (4 * A.a), an = AN[A.nb];
  const inter = 1 / Math.hypot(V / an.s, T / an.t) - 1, brg = V / (A.D * A.t), msB = psi(M.GUD.Fbru) / brg - 1;
  return { V, T, Mx, My, Mz, inter, brg, msB, ms: Math.min(inter, msB) };
}

// ------------------------------------------------------------------------------------------- bow and attachment checks
registerChecks('wpD1-gear', (d, lc, Z, M) => {
  const sets = wheelSets(d, lc); if (!sets.length) return [];
  const packs = packsFor(Z.gearPlies), nX = SCHED.nX, us = [-0.5, ...UG.filter((u) => u < 0.999)];
  let wb = null, wt = null;
  for (const F of sets) for (const u of us) { const t = pliesAt(packs, Math.max(u, 0)) * M.GUD.t, w = wAt(u), s = legState(F, Math.max(u, 0), w, t, nX, M, d.FS);
    if (!wb || s.msB < wb.s.msB) wb = { s, F, u, w, t }; const mt = Math.min(s.msC, s.msS); if (!wt || mt < wt.ms) wt = { ms: mt, s, F, u, w, t }; }
  const fin = (x) => [IN_('Wheel loads (limit): V, D, S', `${x.F.V.toFixed(0)}, ${x.F.D.toFixed(0)}, ${x.F.S.toFixed(0)} lb — ${x.F.tag}`, 'text', 'FAR23'), IN_('Station', x.u < 0 ? 'centre section' : `${(x.u * 100).toFixed(0)} % of the leg`, 'text', 'GEOMETRY'), IN_('Section w × t (core)', `${x.w.toFixed(2)} × ${x.t.toFixed(3)} in`, 'text', 'SIZED'), IN_('Width taper', `${BOW.w0} → ${BOW.w1} in`, 'text', 'DESIGN')];
  const out = [];
  out.push(Object.assign(mk('gear', 'gear-leg', 'Gear leg bending along the bow (6781 0/90 compression), every station', lc, wb.u < 0 ? 'centre section' : `leg ${(wb.u * 100).toFixed(0)} %`, 'fibre compression', wb.s.msB, {
    formula: 'M = r × F from the ground contact;  σ = FS·(6|M_x|/(w t²) + 6|M_n|/(t w²) + |N|/(w t))  (in-plane, fore-aft and axial)',
    inputs: [...fin(wb), IN_('6781 0/90 compression', psi(M.GUD.Xc), 'psi', allowB(wb.s.msB, 'UD compression (MSU, scaled)'))],
    result: [['M_x (limit)', wb.s.L.Mx, 'inlb'], ['M_n (limit)', wb.s.L.Mn, 'inlb'], ['σ (ult.)', wb.s.sig, 'psi']] }), { sys: 'LEZ-32-170' }));
  out.push(Object.assign(mk('gear', 'gear-tors', `Gear leg torsion: 6781 0/90 core shear and the ${nX}-ply ±45 × 6781 over-wrap`, lc, wt.u < 0 ? 'centre section' : `leg ${(wt.u * 100).toFixed(0)} %`, wt.s.msC < wt.s.msS ? 'core in-plane shear' : `over-wrap ${wt.s.skMode}`, wt.ms, {
    formula: 'T = (r × F)·t̂;  shared by GJ: core G₁₂·J(w,t), wrap 4A²·G_xy·t_s/perimeter;  τ_core = T_c(3w + 1.8t)/(w²t²) + 1.5·FS·V/(w t);  wrap N_xy = T_s/(2A), CLT first ply',
    inputs: [...fin(wt), IN_('Over-wrap', `${nX} × 6781 ±45, axle to axle`, 'text', 'SIZED'), IN_('6781 0/90 shear (in-plane, taken at the ILSS)', psi(M.GUD.S), 'psi', allowB(wt.s.msC, 'interlaminar shear')), IN_('6781 0/90 G₁₂', psi(M.GUD.G12), 'psi', 'MSU')],
    result: [['Torque (ult.)', wt.s.T, 'inlb'], ['Core share', wt.s.share, ''], ['τ core (ult.)', wt.s.tau, 'psi'], ['Wrap N_xy', wt.s.q, 'lbin']] }), { sys: 'LEZ-32-170' }));
  { const A = { ...AXB, t: pliesAt(packs, 1) * M.GUD.t }, st = sets.map((F) => ({ F, s: axleState(F, A, d.FS * FF, M) })), w = st.reduce((a, b) => (b.s.ms < a.s.ms ? b : a));
    out.push(Object.assign(mk('gear', 'gear-axle', `Axle flange to the leg end: 4 × AN${A.nb} through the leg, shear + tension and laminate bearing`, lc, `leg end, BL ±${BOW.legFace}`, w.s.inter < w.s.msB ? 'bolt shear + tension' : 'leg bearing', w.s.ms, {
      formula: 'forces at the ground contact moved to the bolt group: V_b = |F_x,z|/4 + |M_y|/(4ρ);  T_b = F_y⁺/4 + |M_x|/(4b) + |M_z|/(4a);  (V/V_a)² + (T/T_a)² ≤ 1;  σ_br = V_b/(D·t_end)',
      inputs: [IN_('Wheel loads (limit): V, D, S', `${w.F.V.toFixed(0)}, ${w.F.D.toFixed(0)}, ${w.F.S.toFixed(0)} lb — ${w.F.tag}`, 'text', 'FAR23'), IN_('Bolt pattern', `±${A.a} in fore-aft × ±${A.b} in about the axle`, 'text', 'SIZED'), IN_('Leg face to the wheel centre-plane', YC - BOW.legFace, 'in', 'GEOMETRY'), IN_('Axle height', ZAX, 'in', 'GEOMETRY'),
        IN_(`AN${A.nb}`, `${AN[A.nb].s} lb shear, ${AN[A.nb].t} lb tension`, 'text', 'AN standard'), IN_('Leg end thickness', A.t, 'in', 'SIZED'), IN_('6781 0/90 bearing', psi(M.GUD.Fbru), 'psi', allowB(w.s.msB, 'compressive strength (bearing not published)')), IN_('Fitting factor', FF, '', 'FAR 23.625')],
      result: [['Bolt shear (ult.)', w.s.V, 'lb'], ['Bolt tension (ult.)', w.s.T, 'lb'], ['σ bearing', w.s.brg, 'psi']] }), { sys: 'LEZ-32-170' })); }
  // the attachment itself
  const cs = mountCombos(d, lc), fu = d.FS * FF, G = GM, W = {};
  for (const c of cs) { const f = fitState(c, G, fu, M); for (const k of ['tube', 'pin', 'lug', 'leg', 'base']) if (!W[k] || f.ms[k] < W[k].ms) W[k] = { ms: f.ms[k], c, x: f.det[k] }; }
  const base = (x) => [IN_('Wheel loads', x.c.tag, 'text', 'FAR23'), IN_('Mount reaction R_x, R_y, R_z (limit)', `${x.c.Rx.toFixed(0)}, ${x.c.Ry.toFixed(0)}, ${x.c.Rz.toFixed(0)} lb`, 'text', 'DERIVED: bow statics, pins at the mounts'), IN_('Mount moments M_y, M_z (limit)', `${x.c.My.toFixed(0)}, ${x.c.Mz.toFixed(0)} in·lb`, 'text', 'DERIVED'), IN_('Factor of safety × fitting factor', fu, '', 'FAR 23.303 / 23.625')];
  const fit = IN_('Attachment', `${G.D} × ${G.wall} 4130 N tube ${G.Lt.toFixed(2)} in long, AN${BOLT_FOR(G.db)} through it; 6061-T6 angles, leg ${G.te} in × ${G.b} in, ${G.h.toFixed(2)} in from the flange to the bolt; base 2 × AN${G.nb} each`, 'text', 'SIZED');
  const row = (id, title, mode, k, formula, result, extra = []) => Object.assign(mk('gear', id, title, lc, 'main-gear mount', mode, W[k].ms, { formula, inputs: [...base(W[k]), fit, ...extra], result }), { sys: 'LEZ-32-120' });
  out.push(row('gmt-tube', 'Gear mount tube: bending between the angle legs (tube + bolt)', 'tube bending', 'tube', 'M = P(2L_s − L_ear)/8 + |M_y,z|(L_s − L_ear)/(2L_s);  σ = M·D/2 / (I_tube + I_bolt)', [['M (ult.)', W.tube.x.Mt, 'inlb'], ['σ (ult.)', W.tube.x.sT, 'psi']], [IN_('4130 N F_tu', ST.Ftu, 'psi', ST.spec)]));
  out.push(row('gmt-pin', `Gear mount bolt AN${BOLT_FOR(G.db)}: shear at each angle leg`, 'bolt shear', 'pin', 'leg loads R/2 ± M/L_s on the two shear planes', [['Leg load (ult.)', W.pin.x.f.P, 'lb']], [IN_(`AN${BOLT_FOR(G.db)} single shear`, AN[BOLT_FOR(G.db)].s, 'lb', 'AN standard')]));
  out.push(row('gmt-lug', 'Gear attach angle leg at the bolt: bearing, shear-out, net tension', 'lug', 'lug', 'allow = min(D·t·F_bru, 2(e − D/2)·t·F_su, 0.75·(b − D)·t·F_tu)', [['Leg load (ult.)', W.lug.x.f.P, 'lb'], ['Allowable', W.lug.x.lugA, 'lb']], [IN_('6061-T6 extrusion', 'F_tu 38, F_su 24, F_bru 80 ksi', 'text', AL.spec), IN_('End distance e', G.e, 'in', 'GEOMETRY')]));
  out.push(row('gmt-leg', 'Gear attach angle leg bending (fore-aft and along the belly) + direct', 'leg bending', 'leg', 'σ = 6F_x·h/(b t²) + 6|F_a|·h/(t b²) + |F_n|/(b t);  one angle takes all of F_x', [['σ (ult.)', W.leg.x.sL, 'psi']], [IN_('6061-T6 F_tu', AL.Ftu, 'psi', AL.spec)]));
  out.push(row('gmt-base', `Gear attach angle base bolts (2 × AN${G.nb}): tension and shear`, 'combined shear and tension', 'base', 'T = 1.3·F_n⁺/2 + F_x·h/(2(t + c₁)) + |F_a|·h/b;  V = √(F_x² + F_a²)/2;  (V/V_a)² + (T/T_a)² ≤ 1', [['Bolt tension (ult.)', W.base.x.Tb, 'lb'], ['Bolt shear (ult.)', W.base.x.Vb, 'lb']], [IN_(`AN${G.nb}`, `${AN[G.nb].s} lb shear, ${AN[G.nb].t} lb tension`, 'text', 'AN standard')]));
  return out;
});

// ------------------------------------------------------------------------------------------- ply book: the schedule, over-wrap, ear and wraps
export const BOW_RHO = { UNI: plyWeight('GUD', 1, 1) / 144 / tU, GUD: plyWeight('GUD', 1, 1) / 144 / tU, BID: plyWeight('BID', 1, 1) / 144 / tB };
const integ = (a, b, f, N = 60) => { let s = 0; for (let i = 0; i < N; i++) { const x = a + (b - a) * (i + 0.5) / N; s += f(x) * (b - a) / N; } return s; };
const stripPoly = (halfL, wf) => { const xs = Array.from({ length: 41 }, (_, i) => -halfL + 2 * halfL * i / 40); return { kind: 'poly', pts: [...xs.map((x) => [x + halfL, wf(x) / 2]), ...xs.reverse().map((x) => [x + halfL, -wf(x) / 2])] }; };
export function earPolys(G = GM) {
  const t0 = G.t0, r = G.r, ts = EAR.ns * tU, zc = G.ztc, top = (y) => bowTop(y, t0), N = 12, arc = (R, a0, a1) => Array.from({ length: N + 1 }, (_, i) => { const a = a0 + (a1 - a0) * i / N; return [YM + R * Math.cos(a), zc + R * Math.sin(a)]; });
  const yi = YM - r - ts - EAR.Lfl, yo = YM + r + ts + EAR.Lfl, samp = (y0, y1, off = 0) => Array.from({ length: 7 }, (_, i) => { const y = y0 + (y1 - y0) * i / 6; return [y, top(y) + off]; });
  const strap = [...samp(yi, yi, 0).slice(0, 1), ...samp(yi, YM - r - ts, ts), [YM - r - ts, zc], ...arc(r + ts, Math.PI, 0).slice(1), ...samp(YM + r + ts, yo, ts), [yo, top(yo)], ...samp(yo, YM + r, 0).slice(1), [YM + r, zc], ...arc(r, 0, Math.PI).slice(1), ...samp(YM - r, yi, 0).slice(0, -1)];
  const filler = [...samp(YM - r, YM + r, 0), [YM + r, zc], ...arc(r, 0, -Math.PI).slice(1, -1), [YM - r, zc]];
  return { strap: strap.map(([y, z]) => [r4(y), r4(z)]), filler: filler.map(([y, z]) => [r4(y), r4(z)]) };
}
export const area2 = (p) => Math.abs(p.reduce((s, q, i) => { const n = p[(i + 1) % p.length]; return s + q[0] * n[1] - n[0] * q[1]; }, 0)) / 2;
registerBookExtras('gear', (books) => {
  const b = books.gear; if (!b) return;
  const packs = bowPacks(), Lleg = LLEG(), Lc = YM, nP = packs.length, plies = [];
  let seq = 0;
  for (const p of packs) { const half = Lc + Lleg * p.uEnd, A = 2 * (Lc * BOW.w0 + integ(0, p.uEnd, (u) => wAt(u) * Lleg)) / 144;
    plies.push({ seq: ++seq, id: `G-P${String(p.j + 1).padStart(2, '0')}`, mat: 'GUD', angle: 0, region: 'pack', plies: p.plies, u: [0, p.uEnd], packIndex: p.j, packCount: nP, area: A, note: `${p.plies} plies 6781 0/90, ${p.uEnd >= 1 ? 'axle to axle' : `drops at ${(p.uEnd * 100).toFixed(0)} % of each leg (${(Lleg * p.uEnd).toFixed(1)} in from the mount)`}`, step: 2,
      flat: stripPoly(half, (x) => wAt((Math.abs(x) - Lc) / Lleg)) }); }
  const tAt = (u) => pliesAt(packs, u) * tU, per = (u) => 2 * (wAt(u) + tAt(u)) + 1.0;
  for (let k = 1; k <= SCHED.nX; k++) { const A = 2 * (Lc * per(0) + integ(0, 1, (u) => per(u) * Lleg)) / 144;
    plies.push({ seq: ++seq, id: `G-X${k}`, mat: 'BID', angle: 45, region: 'wrap', plies: 1, u: [0, 1], area: A, note: 'Torsion over-wrap ±45, axle to axle, 1 in overlap on the aft face', step: 3, flat: stripPoly(Lc + Lleg, (x) => per((Math.abs(x) - Lc) / Lleg)) }); }
  const E = earPolys(), vS = area2(E.strap) * GM.Lear, vF = area2(E.filler) * GM.Lear, ts = EAR.ns * tU, Ls = vS / (GM.Lear * ts);
  plies.push({ seq: ++seq, id: 'G-T1', mat: 'GUD', angle: 0, region: 'tab', plies: EAR.ns, qty: 2, u: [0, 0], area: Ls * GM.Lear / 144, note: `Ear strap: ${EAR.ns} × 6781 0/90 looped over the ${GM.D} in steel tube, ${EAR.Lfl} in flanges on the bow top (one ear each side)`, step: 4, flat: { kind: 'strip', L: Ls, w0: GM.Lear, w1: GM.Lear } });
  plies.push({ seq: ++seq, id: 'G-T2', mat: 'GUD', angle: 0, region: 'tab', plies: 1, qty: 2, u: [0, 0], area: vF / tU / 144, note: 'Ear filler: 6781 0/90 strips folded under the tube inside the strap (one each side)', step: 4, flat: { kind: 'strip', L: vF / tU / GM.Lear, w0: GM.Lear, w1: GM.Lear } });
  const pw = 2 * (BOW.w0 + tAt(0)) + 1.0;
  plies.push({ seq: ++seq, id: 'G-T3', mat: 'GUD', angle: 0, region: 'tab', plies: EAR.nw, qty: 4, u: [0, 0], area: EAR.Lw * pw / 144, note: `Clamp wraps: ${EAR.nw} × 6781 0/90 round the bow over each strap flange (inboard and outboard of each ear)`, step: 4, flat: { kind: 'strip', L: pw, w0: EAR.Lw, w1: EAR.Lw } });
  plies.push({ seq: ++seq, id: 'G-T4', mat: 'BID', angle: 45, region: 'pad', plies: LEGPAD.n, qty: 2, u: [1, 1], area: LEGPAD.mean / 144, note: `Leg-end axle pad: ${LEGPAD.n} × 6781 ±45 stepped (largest first), moulded flat against the leg-end insert at BL ±${BOW.legFace}, WL ${LEGPAD.z0.toFixed(2)}–${LEGPAD.z1.toFixed(2)} × ${LEGPAD.w} in; fills ${LEGPAD.fMin.toFixed(3)}–${LEGPAD.fMax.toFixed(3)} in under the axle flange (one each leg)`, step: 3, flat: { kind: 'strip', L: LEGPAD.w, w0: LEGPAD.mean / LEGPAD.w, w1: LEGPAD.mean / LEGPAD.w } });
  for (const p of plies) p.weight = plyWeight(p.mat, p.area, p.plies);
  b.plies = plies;
  b.blurb = `One-piece solid 6781 0/90 S2-glass bow, ${packs[0] ? FIXED.gearPliesMin : ''} plies at the mounts in ${nP} packs that drop toward both axles, with a ${SCHED.nX}-ply ±45 × 6781 over-wrap for torsion. The straight centre section crosses under the belly at FS ${S0.toFixed(1)}; the legs curve down to vertical ends at BL ±${BOW.legFace}, inboard of the brakes, where the axles bolt through. At each mount a 6781 0/90 ear on the bow top carries a ${GM.D} in 4130 tube; an AN${BOLT_FOR(GM.db)} bolt runs fore-aft through it between two 6061-T6 angles bolted to the belly hard points (LEZ-32-120).`;
  b.steps = [
    { step: 1, title: 'Wax and release both mold halves; set the leg-end inserts (flat axle pads)', inspect: ['Release film continuous', `Leg-end inserts at BL ±${BOW.legFace}`] },
    { step: 2, title: 'Lay the 6781 0/90 packs axle to axle, longest first, alternate halves; drops toward both axles per the pack table', inspect: ['Pack weight tally against the schedule', 'Fibres straight along the bow', 'Drop stations ±0.25 in, staggered ≥ 1 in'] },
    { step: 3, title: `Close and clamp the mold, cure, demold; ${SCHED.nX} × 6781 over-wraps ±45 axle to axle; leg-end pads G-T4 (${LEGPAD.n} stepped 6781) pressed flat against the insert; cure (M cycle)`, inspect: [PROCESS.postCure, 'Over-wrap overlaps on the aft face, staggered', 'Leg-end pad flat within 0.01 in over the axle-flange footprint (straight-edge and feeler)'] },
    { step: 4, title: 'Ears: flox the tubes on the bow top at BL ±8.64 in the jig, fold the filler, loop the straps, lay the clamp wraps; cure', inspect: ['Tube axes fore-aft and coaxial side to side within 0.03 in', 'Strap wraps the tube fully; wraps cover the flanges'] },
    { step: 5, title: 'Drill the axle bolt holes through the leg ends with the axle flange as the guide; bolt the bow to the attach angles', inspect: ['Toe and camber with the fuselage level (shim the axles)', 'Weigh bow: within ±5 %'] },
  ];
  b.hard = `Ears at BL ±${YM.toFixed(2)} carrying ${GM.D} × ${GM.wall} 4130 tubes; axle bolt groups 4 × AN${AXB.nb} at the leg ends`;
});
GEO.gear.tubeD = GM.D; GEO.gear.tabL = GM.Lear; GEO.gear.boltD = GM.db; GEO.gear.boltsPerSide = 1;
GEO.gear.attachText = `2 ears · ${GM.D} in 4130 tubes · AN${BOLT_FOR(GM.db)} fore-aft between 6061-T6 angles on the belly hard points (4 × AN${GM.nb} each side)`;

// ------------------------------------------------------------------------------------------- solid (right half; mirrored)
/** quads along the bow: centre section and leg, with a short ramp at each pack drop */
export function bowStations() {
  const packs = bowPacks(), Lleg = LLEG(), out = [];
  for (const u of [-1, -0.5, 0]) out.push({ u, n: pliesAt(packs, 0) });
  const drops = [...new Set(packs.filter((p) => p.uEnd < 1).map((p) => p.uEnd))].sort((a, b) => a - b), dr = BOW.ramp / Lleg;
  const reg = Array.from({ length: 40 }, (_, i) => (i + 1) / 40).filter((u) => drops.every((x) => u < x - 1e-6 || u > x + dr + 0.25 / Lleg));
  for (const u of reg) out.push({ u, n: pliesAt(packs, u) });
  for (const x of drops) { out.push({ u: x, n: pliesAt(packs, x, true) }); const xa = Math.min(1, x + dr); out.push({ u: xa, n: pliesAt(packs, xa) }); }
  return out.sort((a, b) => a.u - b.u).filter((s, i, a) => i === 0 || s.u > a[i - 1].u + 1e-9);
}
export function bowQuad(u, n) {
  const { p, t } = legAt(u), w = wAt(u), h = n * tU / 2, nn = [-t[1], t[0]];
  return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([ex, en]) => [r4(p[0] + en * h * nn[0]), r4(S0 + ex * w / 2), r4(p[1] + en * h * nn[1])]);
}
export function bowParams() {
  const st = bowStations(), segs = [];
  for (let i = 0; i < st.length - 1; i++) segs.push({ piece: 'S', ha: st[i].u, hb: st[i + 1].u, keep: [false, i === st.length - 2], regions: { uni: [bowQuad(st[i].u, st[i].n), bowQuad(st[i + 1].u, st[i + 1].n)] } });
  const E = earPolys(), at = (pts, x) => pts.map(([y, z]) => [y, r4(S0 + x), z]);
  segs.push({ piece: 'E', ha: -GM.Lear / 2, hb: GM.Lear / 2, keep: [true, true], regions: { ear_s: [at(E.strap, -GM.Lear / 2), at(E.strap, GM.Lear / 2)], ear_f: [at(E.filler, -GM.Lear / 2), at(E.filler, GM.Lear / 2)] } });
  return deepR4({ segs, group: { uni: 'UNI', ear_s: 'EAR', ear_f: 'EAR' }, feat: { UNI: 'bow', EAR: 'ear' }, solidGroups: ['EAR'], n: segs.length, nX: SCHED.nX, packs: bowPacks().map((p) => [p.plies, r4(p.uEnd)]) });
}
/** every number rounded to 1e-4 in: the station and section values come through trig and pow, whose last bits differ between
 *  JS engines (Chrome and node hashed the unrounded params differently); rounded, the parameter hash is platform-stable */
const deepR4 = (v) => (typeof v === 'number' ? r4(v) : Array.isArray(v) ? v.map(deepR4) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, deepR4(x)])) : v);
/** exact volume of a ruled loft between two quads/polygons (divergence theorem; bilinear sides by 2 × 2 Gauss) */
export function ruledVolume(A, B) {
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cap = (P) => { let s = [0, 0, 0]; for (let i = 0; i < P.length; i++) { const c = cross(P[i], P[(i + 1) % P.length]); s = [s[0] + c[0] / 2, s[1] + c[1] / 2, s[2] + c[2] / 2]; } return dot(P[0], s); };
  let V = cap(B) - cap(A); const gp = [0.5 - 0.5 / Math.sqrt(3), 0.5 + 0.5 / Math.sqrt(3)];
  for (let i = 0; i < A.length; i++) { const a0 = A[i], a1 = A[(i + 1) % A.length], b0 = B[i], b1 = B[(i + 1) % B.length];
    for (const s of gp) for (const t of gp) { const P = [0, 1, 2].map((k) => (1 - t) * ((1 - s) * a0[k] + s * a1[k]) + t * ((1 - s) * b0[k] + s * b1[k])), Ps = [0, 1, 2].map((k) => (1 - t) * (a1[k] - a0[k]) + t * (b1[k] - b0[k])), Pt = [0, 1, 2].map((k) => (1 - s) * (b0[k] - a0[k]) + s * (b1[k] - a1[k])); V += dot(P, cross(Ps, Pt)) / 4; } }
  return Math.abs(V) / 3;
}
export function bowVolumes(P = bowParams()) { const V = { UNI: 0, EAR: 0 }; for (const s of P.segs) for (const [k, [a, b]] of Object.entries(s.regions)) V[P.group[k]] += ruledVolume(a, b); return V; }

// ------------------------------------------------------------------------------------------- the attachment solid (right side; mirrored)
export function mountParams() {
  const G = GM, R = (x) => r4(x);
  return { D: G.D, wall: G.wall, Lt: R(G.Lt), axis: [R(YM), R(S0), R(G.ztc)], O: [R(G.P[0]), R(S0), R(G.P[1])], n: [R(G.n[0]), 0, R(G.n[1])], a: [R(G.a[0]), 0, R(G.a[1])],
    tbed: G.tbed, tf: G.tf, te: G.te, b: G.b, dc: R(G.dc), e: R(G.e), db: R(G.db + 0.002), Lf: R(G.Lf), c1: G.c1, pb: R(G.pb), dbb: R(G.dbb + 0.006), hpT: R(G.hpT), tk: G.tk, Lk: R(G.Lk) };
}
export function mountVolumes(p = mountParams()) {
  const tube = Math.PI / 4 * (p.D ** 2 - (p.D - 2 * p.wall) ** 2) * p.Lt;
  const ang = p.Lf * p.b * p.tf + p.te * p.b * (p.dc + p.e - p.tbed - p.tf) - Math.PI * (p.db / 2) ** 2 * p.te - 2 * Math.PI * (p.dbb / 2) ** 2 * p.tf;
  const back = p.b * p.Lk * p.tk - 2 * Math.PI * (p.dbb / 2) ** 2 * p.tk;
  return { tube, angle: 2 * ang, back: 2 * back };
}
export const FAIR = (() => {   // fairing half (2 BID, laid up on the aircraft over shaped foam, removable): area from its envelope
  const L = 2 * (GM.Lt / 2 + GM.te + GM.Lf) + 1.0, span = YM + GM.b / 2 + 1.5, hF = Math.max(1, GM.ztc - (ZR + GM.t0 / 2) + GM.e);
  const A = (2 * L * hF + L * span + span * hF * 2) / 144;   // fore and aft faces, bottom, ends
  return { L, span, hF, A, plies: 2, lb: plyWeight('BID', A, 2) + 6 * 0.006 };
})();

// ------------------------------------------------------------------------------------------- system records: the attachment and the brake line route
{ const p = partByPN('LEZ-32-120');
  if (p) Object.assign(p, { name: 'Main-gear attachment, per side: 4130 mount tube, forward and aft 6061-T6 attach angles, backing strips; fairing half', qty: 2, ata: 32, material: '6061',
    geo: [1, -1].flatMap((sg) => { const G = GM, y = sg * YM / 12, s = g.s, zt = G.ztc / 12; return [
      { t: 'cyl', a: [s - G.Lt / 24, y, zt], b: [s + G.Lt / 24, y, zt], r: G.D / 24, wall: G.wall / 12 },
      ...[-1, 1].map((fa) => ({ t: 'box', c: [s + fa * (G.Lt / 2 + G.Lf / 2) / 12, sg * (G.P[0] + G.n[0] * (G.dc / 2)) / 12, (G.P[1] + G.n[1] * G.dc / 2) / 12], d: [G.Lf / 12, G.b / 12, G.dc / 12], mat: '6061' }))]; }).concat([{ t: 'box', c: [g.s, 0, 2.02], d: [FAIR.L / 12, 2 * FAIR.span / 12, 0.12], colour: 0xe8e8e4, op: 0.0 }]),
    hardware: [{ std: `AN${BOLT_FOR(GM.db)}-${anDash(GM.Lt + 2 * GM.te + 0.35)}A`, qty: 1, desc: 'mount bolt fore-aft through angle, tube, angle (double shear)' }, { std: `MS21042L${BOLT_FOR(GM.db)}`, qty: 1, desc: 'self-locking nut' }, { std: `AN960-${BOLT_FOR(GM.db) * 100 + 16}`, qty: 2, desc: 'washer' },
      { std: `AN${GM.nb}-${anDash(GM.tf + GM.tbed + GM.hpT + GM.tk + 0.3)}A`, qty: 4, desc: 'base bolts through the angle flanges, belly hard point and backing strip' }, { std: `MS21042L${GM.nb}`, qty: 4, desc: 'self-locking nut (inside)' }, { std: `AN960-${GM.nb * 100 + 16}`, qty: 8, desc: 'washer' },
      { std: 'MS24693-C26', qty: 6, desc: 'fairing screws into MS21047-L06 nutplates on the angles and belly' }],
    blurb: 'How the bow hangs on the fuselage. At each mount a 4130 tube lies fore-aft in the bow\'s 6781 0/90 ear; one AN bolt runs through the forward attach angle, the tube and the aft angle (double shear). The angles sit outside the belly under the fairing, flox-bedded on the shell\'s gear hard points (F-D4 forward, F-D5 aft) and held by two AN bolts each through the hard point into a backing strip inside. The mount is a pin about the fore-aft axis: the bow\'s centre section carries the roll moment. A two-piece fairing (L/R halves, 2 × 6781) covers the angles and is screwed on so the bolts stay inspectable.',
    steps: [{ title: 'Pot flox inserts in the belly core at the base-bolt holes; flox-bed the angles on the hard points with the bow bolted in the jig; drill through the backing strips', inspect: ['Bow square to the centre line ±0.1°', 'Bed thickness 0.02–0.06 in', 'All bolts torqued and witness-marked'] }, { title: 'Lay up the fairing halves on the aircraft over foam blocks; fit nutplates', inspect: ['Each half comes off with 3 screws'] }],
    src: { mass: 'GEOMETRY: the definition solid (LEZ-32-120)' } }); }
