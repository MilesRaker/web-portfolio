// WPC2 — block C solids as primitives: every part of LEZ-27-1xx (but the landing-brake panel, lofted) is built by
// cad/c_prims.py from a list of tubes, rods and oriented boxes with through holes, in the solid frame (inches; x = BL,
// y = FS, z = WL; the right side for L/R parts, mirrored at BL 0). The volumes are exact for these primitives, so the
// record's mass and the solid's agree by construction and the audit measures each one back. The system records' display
// geometry is taken from the same primitives. Notional.
import { L, SZ, ARM, LB, harnessPts, rudRoute, CABLE, CONDUIT, MAT, V, SP, ROD_END, TERM } from './wpC1_controls.js';
import { partByPN, insideOML } from '../systems.js';

const { add, sub, mul, norm, len, cross } = V;
const r4 = (x) => Math.round(x * 1e4) / 1e4, R = (p) => p.map(r4);
const X = [1, 0, 0], Y = [0, 1, 0], Z = [0, 0, 1];
/** prims: tube / rod between two points; obox: centre, unit axes (local u, v, w in the solid frame), sizes, holes along a local axis */
export const tube = (g, a, b, od, w) => ({ t: 'tube', g, a: R(SP(a)), b: R(SP(b)), od, w });
export const rod = (g, a, b, d) => ({ t: 'rod', g, a: R(SP(a)), b: R(SP(b)), d });
/** oriented box from aircraft-frame centre c; ax = local axes in the aircraft frame [FS, BL, WL]; d = sizes along them; holes { ax, at (aircraft point), r } */
export function obox(g, c, ax, d, holes = []) {
  const axS = ax.map((a) => R(norm(SP(a)))), cs = SP(c);
  return { t: 'obox', g, c: R(cs), ax: axS, d: d.map(r4), holes: holes.map((h) => { const p = sub(SP(h.at), cs), loc = axS.map((a) => r4(a[0] * p[0] + a[1] * p[1] + a[2] * p[2])); return { ax: h.ax, p: loc.filter((_, i) => i !== h.ax), r: r4(h.r) }; }) };
}
export const box = (g, c, d, holes = []) => obox(g, c, [[1, 0, 0], [0, 1, 0], [0, 0, 1]], d, holes);   // d = [dFS, dBL, dWL]; hole ax 0 FS, 1 BL, 2 WL
/** bar from p to q (aircraft frame) of width w and thickness t; the thickness axis is tAx (unit, ⟂ to p→q) */
export function bar(g, p, q, w, t, tAx, holes = [], ext = 0.4) {
  const u = norm(sub(q, p)), n = norm(tAx), v = norm(cross(n, u)), L_ = len(sub(q, p)) + 2 * ext, c = mul(add(p, q), 0.5);
  return obox(g, c, [u, v, n], [L_, w, t], holes.map((h) => ({ ...h, ax: 2 })));
}
export function primVol(p) {
  if (p.t === 'tube') { const L_ = len(sub(p.b, p.a)); return Math.PI * ((p.od / 2) ** 2 - (p.od / 2 - p.w) ** 2) * L_; }
  if (p.t === 'rod') return Math.PI * (p.d / 2) ** 2 * len(sub(p.b, p.a));
  return p.d[0] * p.d[1] * p.d[2] - p.holes.reduce((s, h) => s + Math.PI * h.r * h.r * p.d[h.ax], 0);
}
export const groupVols = (prims) => prims.reduce((o, p) => { o[p.g] = (o[p.g] || 0) + primVol(p); return o; }, {});
export const massOfVols = (vols, rho) => Object.entries(vols).reduce((s, [g, v]) => s + v * rho[g], 0);
const B3 = 0.0938, B4 = 0.125;   // AN3 / AN4 hole radii (0.1875 / 0.25 in, +0.003 ream ignored)

// ------------------------------------------------------------------------------------------- the parts
const ROLL = () => norm(sub(L.R1, L.G1)), dn = (p) => add(p, [0, 0, -1]);
export const PRIMS = {
  'LEZ-27-110': () => { const G = L.G1, [od, w] = SZ.stick, t = SZ.tFork, fc = [(G[0] + L.PA1[0]) / 2, G[1], (G[2] + L.PA1[2]) / 2 - 0.7];
    return { rho: { stick: MAT['4130'].rho, fork: MAT['4130'].rho, yoke: MAT['6061'].rho, bearing: MAT['6061'].rho, grip: MAT.uhmw.rho }, prims: [
      tube('stick', add(G, mul(L.stickDir, 1.0)), add(G, mul(L.stickDir, ARM.grip + 1.0)), od, w), tube('grip', add(G, mul(L.stickDir, ARM.grip - 2.0)), add(G, mul(L.stickDir, ARM.grip + 1.0)), od + 0.2, 0.1),
      ...[-1, 1].map((s) => box('fork', [fc[0], G[1] + s * (0.5 + t / 2), fc[2]], [1.4, t, 5.0], [{ ax: 1, at: G, r: B4 }, { ax: 1, at: L.PA1, r: B3 }])),
      box('yoke', G, [1.25, 0.875, 1.25], [{ ax: 1, at: G, r: B4 }]),
      box('bearing', add(G, [2.5, 0, 0]), [0.75, 2.0, 2.0], [{ ax: 0, at: add(G, [2.5, 0, 0]), r: SZ.rollTube[0] / 2 + 0.03 }, ...[-1, 1].map((s) => ({ ax: 1, at: add(G, [2.5, 0, s * 0.75]), r: B3 }))]) ] }; },
  'LEZ-27-111': () => { const G = L.G2, [od, w] = SZ.stick, t = SZ.tFork, [lo, lw] = SZ.rearLink, mid = mul(add(L.PA1, L.PA2), 0.5), u = norm(sub(L.PA2, L.PA1)), fc = [(G[0] + L.PA2[0]) / 2, G[1], (G[2] + L.PA2[2]) / 2 - 0.7];
    return { rho: { stick: MAT['4130'].rho, fork: MAT['4130'].rho, yoke: MAT['6061'].rho, link: MAT['2024'].rho, guide: MAT.uhmw.rho, grip: MAT.uhmw.rho, pin: MAT['4130'].rho }, prims: [
      tube('stick', add(G, mul(L.stickDir, 1.0)), add(G, mul(L.stickDir, ARM.gripR + 1.0)), od, w), tube('grip', add(G, mul(L.stickDir, ARM.gripR - 2.0)), add(G, mul(L.stickDir, ARM.gripR + 1.0)), od + 0.2, 0.1),
      ...[-1, 1].map((s) => box('fork', [fc[0], G[1] + s * (0.5 + t / 2), fc[2]], [1.4, t, 5.0], [{ ax: 1, at: G, r: B4 }, { ax: 1, at: L.PA2, r: B3 }])),
      box('yoke', G, [1.25, 0.875, 1.25], [{ ax: 1, at: G, r: B4 }]), rod('pin', add(G, [0, 0, 1.3]), add(G, [0, 0, 1.3]).map((v, i) => v + [0, 1.5, 0][i]), 0.1875),
      tube('link', add(L.PA1, mul(u, 0.9)), sub(L.PA2, mul(u, 0.9)), lo, lw), box('guide', mid, [1.0, 1.5, 1.5], [{ ax: 0, at: mid, r: lo / 2 + 0.15 }]) ] }; },
  'LEZ-27-120': () => { const [od, w] = SZ.pitchRod, u = norm(sub(L.PA1, L.PB)), a = add(L.PB, mul(u, 0.9)), b = sub(L.PA1, mul(u, 0.9)), n = SZ.pitchGuides;
    const gs = Array.from({ length: n }, (_, i) => add(L.PB, mul(sub(L.PA1, L.PB), (i + 1) / (n + 1))));
    return { rho: { rod: MAT['2024'].rho, plug: MAT['4130'].rho, guide: MAT.uhmw.rho }, prims: [tube('rod', a, b, od, w), rod('plug', a, add(a, mul(u, 1.0)), od - 2 * w - 0.002), rod('plug', sub(b, mul(u, 1.0)), b, od - 2 * w - 0.002),
      ...gs.map((g) => box('guide', g, [1.0, 1.5, 1.5], [{ ax: 0, at: g, r: od / 2 + 0.15 }]))] }; },
  'LEZ-27-130': () => { const T = L.T0, [od, w] = SZ.tubeE, bl = L.tube.bl, tp = (y) => [T[0], y, T[2]];
    const ps = [tube('tube', tp(-bl), tp(bl), od, w),
      obox('bellcrank', [(T[0] + L.PB[0]) / 2, L.bcBL, (T[2] - od / 2 + L.PB[2] - 0.45) / 2], [X, Y, Z], [1.0, SZ.tBC, T[2] - od / 2 - L.PB[2] + 0.45], [{ ax: 1, at: L.PB, r: B3 }]),
      ...[-1, 1].map((s) => box('bearing', tp(s * L.tube.bearBL), [1.25, 0.75, 1.25], [{ ax: 1, at: tp(s * L.tube.bearBL), r: od / 2 + 0.01 }]))];
    for (const s of [-1, 1]) { const tip = [L.driveTip[0], s * L.tube.armBL, L.driveTip[2]], root = tp(s * L.tube.armBL), hole = [L.hornE[0], s * (L.blE - 0.25 + 0.0), L.hornE[2]], lk = [L.driveTip[0], s * (L.tube.armBL + 0.13), L.driveTip[2]], lh = [L.hornE[0], s * (L.tube.armBL + 0.13), L.hornE[2]];
      ps.push(bar('drive', add(root, mul(norm(sub(tip, root)), od / 2)), tip, 0.75, SZ.tDrive, Y, [{ at: tip, r: B3 }], 0.35), bar('link', lk, lh, 0.5, 0.125, Y, [{ at: lk, r: B3 }, { at: lh, r: B3 }], 0.3)); void hole; }
    return { rho: { tube: MAT['4130'].rho, bellcrank: MAT['4130'].rho, drive: MAT['4130'].rho, link: MAT['4130'].rho, bearing: MAT.uhmw.rho }, prims: ps }; },
  'LEZ-27-135': () => { const T = L.T0, B = SZ.bal, [b0, b1] = L.wBL, d = Math.sqrt(4 * B.mw / MAT.lead.rho / Math.PI / (b1 - b0 - 0.38)), W = L.wE;
    return { rho: { slug: MAT.lead.rho, arm: MAT['4130'].rho, bolt: MAT['4130'].rho }, slugD: d, prims: [rod('slug', [W[0], b0 + 0.19, W[2]], [W[0], b1 - 0.19, W[2]], d),
      ...[b0, b1].map((y) => bar('arm', [T[0], y, T[2]], [W[0], y, W[2]], 0.75, 0.19, Y, [{ at: [T[0], y, T[2]], r: SZ.tubeE[0] / 2 }, { at: [W[0], y, W[2]], r: B3 }], 0.55)),
      rod('bolt', [W[0], b0 - 0.3, W[2]], [W[0], b0 + 0.19 - 0.001, W[2]], 0.1875)] }; },
  'LEZ-27-140': () => { const [od, w] = SZ.rollTube, ax = ROLL(), a = add(L.G1, mul(ax, 0.63)), b = L.R1, mid = add(L.G1, mul(ax, (94.5 - L.G1[0]) / ax[0]));
    const crankN = norm(cross(ax, [0, 1, 0]));
    return { rho: { tube: MAT['4130'].rho, crank: MAT['4130'].rho, link: MAT['2024'].rho, bearing: MAT.uhmw.rho }, prims: [tube('tube', a, b, od, w),
      bar('crank', add(L.R1, [0, 0, -od / 2]), L.CT, 0.75, SZ.tCrank, ax, [{ at: L.CT, r: B3 }], 0.35),
      tube('link', add(L.CT, [0, -0.9, 0]), add(L.IT, [0, 0.9, 0]), 0.5, 0.035), box('bearing', mid, [0.75, 2.0, 2.0], [{ ax: 0, at: mid, r: od / 2 + 0.03 }])] }; },
  'LEZ-27-141': () => { const P = L.PT, t = SZ.tBeam, SL = [L.SR[0], -L.SR[1], L.SR[2]], hub = 0.75, arm = (q) => bar('beam', add(P, mul(norm(sub(q, P)), hub)), q, 1.5, t, Z, [{ at: q, r: B3 }], 0.4);
    const brk = (s) => box('bracket', [(P[0] + hub + 3.06 / 2 + 0.6) / 1 + 0.0 - 0.0, 0, P[2] + s * (t / 2 + 0.125)], [2.5, 2.0, 0.25], [{ ax: 2, at: add(P, [0.5 + 0.0, 0, 0]), r: 0.0 }].filter((h) => h.r > 0));
    void brk;
    return { rho: { beam: MAT['6061'].rho, hub: MAT['6061'].rho, bracket: MAT['6061'].rho }, prims: [arm(L.SR), arm(SL), arm(L.IT), box('hub', P, [1.5, 1.5, t], [{ ax: 2, at: P, r: B4 }]),
      ...[-1, 1].map((s) => box('bracket', [P[0] + 1.53 - 0.0 + 0.0, 0, P[2] + s * (t / 2 + 0.125 + 0.01)], [(123.06 - P[0]) + 1.0, 2.0, 0.25], [{ ax: 2, at: P, r: B4 }]))] }; },
  'LEZ-27-142': () => { const [od, w] = SZ.ailRod, cut = (a, b, e = 0.9) => { const u = norm(sub(b, a)); return [add(a, mul(u, e)), sub(b, mul(u, e))]; };
    const [a1, a2] = cut(L.SR, L.K1a), [b1, b2] = cut(L.K1b, L.K2d), [c1, c2] = cut(L.K2c, L.hornA), disc = [L.K1b[0], L.disc, L.WLA];
    const gB = Array.from({ length: SZ.guidesB }, (_, i) => add(L.K1b, mul(sub(L.K2d, L.K1b), (i + 1) / (SZ.guidesB + 1))));
    const bell = (Q, p, q) => [box('bellcrank', Q, [1.25, 1.25, SZ.tK], [{ ax: 2, at: Q, r: B4 }]), ...[p, q].map((e) => bar('bellcrank', add(Q, mul(norm(sub(e, Q)), 0.625)), e, 1.0, SZ.tK, Z, [{ at: e, r: B3 }], 0.4)), box('mount', add(Q, [0, 0, -(SZ.tK / 2 + 0.75)]), [1.5, 1.5, 1.25], [{ ax: 2, at: Q, r: B4 }])];
    return { rho: { rod: MAT['2024'].rho, sleeve: MAT['2024'].rho, guide: MAT.uhmw.rho, bellcrank: MAT['6061'].rho, mount: MAT['6061'].rho }, prims: [tube('rod', a1, a2, od, w),
      tube('rod', b1, add(disc, [0, -1.6, 0]), od, w), tube('rod', add(disc, [0, 1.6, 0]), b2, od, w), tube('sleeve', add(disc, [0, -1.5, 0]), add(disc, [0, 1.5, 0]), od + 0.07, 0.035), rod('sleeve', add(disc, [0, -1.6, 0]), add(disc, [0, 1.6, 0]), od + 0.0 - 2 * w - 0.002),
      tube('rod', c1, c2, od, w), ...gB.map((g) => box('guide', g, [1.5, 1.0, 1.5], [{ ax: 1, at: g, r: od / 2 + 0.15 }])), ...bell(L.Q1, L.K1a, L.K1b), ...bell(L.Q2, L.K2c, L.K2d)] }; },
  'LEZ-27-150': () => { const P = L.ped, [od, w] = SZ.pedTube, [ao, aw] = SZ.pedArm, ps = [tube('crosstube', [P.s, -P.halfSpan, P.z], [P.s, P.halfSpan, P.z], od, w)];
    for (const s of [-1, 1]) ps.push(box('bracket', [P.s, s * (P.halfSpan + 0.2), P.z - 0.5], [1.5, 0.25, 2.5], [{ ax: 1, at: [P.s, 0, P.z], r: od / 2 + 0.005 }]));
    for (const s of [-1, 1]) { const y = s * P.y, piv = [P.s, y, P.z], pad = [35.64, y, P.z - ARM.pedalPad];
      ps.push(tube('sleeve', [P.s, y - 0.75, P.z], [P.s, y + 0.75, P.z], od + 0.25, 0.065), tube('arm', add(piv, mul(norm(sub(pad, piv)), od / 2 + 0.13)), add(pad, [0, 0, 0.6]), ao, aw),
        box('pad', [35.55, y, 32.4], [0.19, 3.0, 2.6]), box('toe', [35.45, y, 34.5], [0.19, 3.0, 2.4]),
        bar('toetab', [L.toeHinge[0], y, L.toeHinge[2]], [L.mcRod[0], y, L.mcRod[2]], 0.75, SZ.tToe, Y, [{ at: [L.toeHinge[0], y, L.toeHinge[2]], r: B3 }, { at: [L.mcRod[0], y, L.mcRod[2]], r: B3 }], 0.35),
        bar('mcear', add(piv, mul(norm(sub([L.mcBody[0], y, L.mcBody[2]], piv)), (od + 0.25) / 2)), [L.mcBody[0], y, L.mcBody[2]], 0.75, 0.125, Y, [{ at: [L.mcBody[0], y, L.mcBody[2]], r: B3 }], 0.35),
        bar('horn', [P.s, s * L.cableHorn[1], P.z + (od + 0.25) / 2], [P.s, s * L.cableHorn[1], L.cableHorn[2]], SZ.hornW, SZ.tHorn, Y, [{ at: [P.s, s * L.cableHorn[1], L.cableHorn[2]], r: TERM.forkPin / 2 }], SZ.hornE)); }
    return { rho: { crosstube: MAT['4130'].rho, bracket: MAT['6061'].rho, sleeve: MAT['4130'].rho, arm: MAT['4130'].rho, pad: MAT['6061'].rho, toe: MAT['6061'].rho, toetab: MAT['4130'].rho, mcear: MAT['4130'].rho, horn: MAT['4130'].rho }, prims: ps }; },
  'LEZ-27-151': () => { const pts = rudRoute(1), ps = [], rc = CABLE.lbPerFt / 12 / (Math.PI * (CABLE.d / 2) ** 2);   // rope weight per length on the drawn diameter (DC-005 review: was the 1/8 in radius)
    for (let i = 1; i < pts.length; i++) ps.push(tube('conduit', pts[i - 1], pts[i], CONDUIT.od, (CONDUIT.od - CONDUIT.id) / 2), rod('cable', pts[i - 1], pts[i], CABLE.d));
    return { rho: { conduit: MAT.nylon.rho, cable: rc }, prims: ps }; },
  'LEZ-27-160': () => { const G = L.G1, ps = [...[-1, 1].map((s) => box('pitchstop', [L.PA1[0] + s * 1.0, G[1], L.PA1[2] + 0.2], [0.5, 0.75, 0.75], [{ ax: 1, at: [L.PA1[0] + s * 1.0, G[1], L.PA1[2] + 0.2], r: B4 }])),
      box('rollcollar', add(G, [1.6, 0, 0]), [0.5, 1.6, 1.6], [{ ax: 0, at: add(G, [1.6, 0, 0]), r: SZ.rollTube[0] / 2 }]), ...[-1, 1].map((s) => box('rollstop', add(G, [1.6, s * 1.25, -1.0]), [0.5, 0.5, 0.75], [{ ax: 2, at: add(G, [1.6, s * 1.25, -1.0]), r: B4 }])),
      ...[-1, 1].map((s) => box('pedalstop', [34.9, s * L.ped.y, 31.6], [0.75, 1.0, 0.75], [{ ax: 0, at: [34.9, s * L.ped.y, 31.6], r: B4 }]))];
    return { rho: { pitchstop: MAT['6061'].rho, rollcollar: MAT['4130'].rho, rollstop: MAT['6061'].rho, pedalstop: MAT['6061'].rho }, prims: ps }; },
  'LEZ-27-165': () => { const u = norm(sub(L.trimClamp, L.trimLow)), a = add(L.trimLow, mul(u, 0.6)), b = sub(L.trimClamp, mul(u, 0.6)), mid = mul(add(a, b), 0.5);
    return { rho: { lever: MAT['6061'].rho, guide: MAT.uhmw.rho, cartridge: MAT['2024'].rho, spring: MAT['4130'].rho, clamp: MAT['6061'].rho }, prims: [
      bar('lever', L.trimLow, L.trimTop, 0.75, 0.19, Y, [{ at: L.trimPiv, r: B3 }, { at: L.trimLow, r: B3 }], 0.4), box('guide', add(L.trimPiv, [0, 0.0, 2.0]), [4.0, 0.6, 0.5]),
      tube('cartridge', a, mid, 0.625, 0.035), rod('spring', mid, b, 0.19), box('clamp', L.trimClamp, [0.5, 1.0, 1.0], [{ ax: 0, at: L.trimClamp, r: SZ.rearLink[0] / 2 }])] }; },
  'LEZ-27-171': () => { const B = LB(), A = B.A, H = [B.horn[0], 0, B.horn[2]], u = norm(sub(H, A)), body = 1.25, Lb = B.retracted - 2.1;
    const e1 = add(A, mul(u, 0.55)), e2 = add(e1, mul(u, Lb)), r1 = e2, r2 = sub(H, mul(u, 0.55));
    return { rho: { body: 2.0 / (Math.PI * (body / 2) ** 2 * Lb), rod: MAT['4130'].rho, clevis: MAT['6061'].rho, bracket: MAT['6061'].rho }, prims: [rod('body', e1, e2, body), rod('rod', r1, r2, 0.5),
      bar('clevis', A, e1, 0.75, 0.5, Y, [{ at: A, r: B3 }], 0.35), bar('clevis', r2, H, 0.6, 0.4, Y, [{ at: H, r: B3 }], 0.35), box('bracket', add(A, [0, 0, -0.55]), [1.5, 1.5, 0.3], [{ ax: 2, at: add(A, [0, 0, -0.55]), r: B3 }])] }; },
  'LEZ-27-172': () => { const p = harnessPts(), ps = [], rho = 0.02 / 12 / (Math.PI * 0.125 ** 2);
    for (let i = 1; i < p.length; i++) ps.push(rod('bundle', p[i - 1], p[i], 0.25));
    return { rho: { bundle: rho }, prims: ps }; },
};
export const solidOf = (pn) => PRIMS[pn]();
export function partMassOf(pn) { const s = solidOf(pn); return massOfVols(groupVols(s.prims), s.rho); }

// ------------------------------------------------------------------------------------------- system display geometry and masses
const LR = { 'LEZ-27-135': 2, 'LEZ-27-142': 2, 'LEZ-27-151': 2 };
const toGeo = (p, sg = 1, ext = false) => {
  const f = (q) => [q[1] / 12, sg * q[0] / 12, q[2] / 12];   // solid → model ft [FS, BL, WL]
  if (p.t === 'tube' || p.t === 'rod') return { t: 'cyl', a: f(p.a), b: f(p.b), r: (p.od || p.d) / 24, ...(p.w ? { wall: p.w } : {}), ...(ext ? { external: true } : {}) };
  const ext3 = [0, 1, 2].map((i) => p.ax.reduce((s, a, k) => s + Math.abs(a[i]) * p.d[k], 0));
  return { t: 'box', c: f(p.c), d: [ext3[1] / 12, ext3[0] / 12, ext3[2] / 12], ...(ext ? { external: true } : {}) };
};
const inOML = (q, sg) => { const g = toGeo(q, sg); const pts = g.t === 'cyl' ? [g.a, g.b] : [-1, 1].flatMap((i) => [-1, 1].flatMap((j) => [-1, 1].map((k) => [g.c[0] + i * g.d[0] / 2, g.c[1] + j * g.d[1] / 2, g.c[2] + k * g.d[2] / 2]))); return pts.every((q2) => insideOML(q2)); };
for (const pn of Object.keys(PRIMS)) {
  const p = partByPN(pn); if (!p) continue;
  const s = solidOf(pn), m = massOfVols(groupVols(s.prims), s.rho), keepPaths = p.geo.filter((g) => g.t === 'path');
  const disp = ['LEZ-27-120', 'LEZ-27-142', 'LEZ-27-151', 'LEZ-27-172'].includes(pn) ? s.prims.filter((q) => q.t === 'obox') : s.prims.filter((q) => !(pn === 'LEZ-27-140' && q.g === 'tube'));
  const under = pn === 'LEZ-27-130' || pn === 'LEZ-27-135', canopy = pn === 'LEZ-27-111' || pn === 'LEZ-27-110';   // under the canard root / above the sill under the canopy
  const geo = [...keepPaths, ...disp.flatMap((q) => (LR[pn] ? [1, -1] : [1]).map((sg) => toGeo(q, sg, (under || (canopy && ['stick', 'grip'].includes(q.g))) && !inOML(q, sg))))];
  p.geo = geo; p.massEach = +m.toFixed(4); p.src = { ...p.src, mass: `GEOMETRY: the definition solid (${pn})` }; if (LR[pn]) p.qty = LR[pn];
}
void ROD_END; void dn; void cross;
