// Block E — nose gear definition geometry (LEZ-32-200 … -232): the primitive solids of every part (cad/e_prims.py), in
// inches in the aircraft frame (x = BL, y = FS, z = WL), gear DOWN, all drawn from the layout (ng_layout.js), the sizing
// (ng_sizing.js) and the airframe sections (wp11). Also the checks the definition adds (clamps, stops, caster head, hinge
// side couple, plate bonds, crank stop) and the mass of every system record from its solid. Notional, not for construction.
import { registerChecks, mk, GEO, FIXED } from '../structures.js';
import { partByPN, firstInsideOML, marchHeights, defineKeepouts } from '../systems.js';
import { NG, KIN, F22, PANEL, DOOR, SWF, NOSE_SW, strutPt, axleAt, C_at, B_at, camFrac, doorAxisZ, hornTip, d2r } from './ng_layout.js';
import { SIZING, MAT, AN_SHEAR, TGT, noseLoads, profAt, cases, strutMoments, linkForce, hingeMoment } from './ng_sizing.js';
import { belly, WELL } from './wp11_nose_gear.js';

const SZ = SIZING.pick, P0 = NG.phi0, IN = 12;
export const r4 = (x) => Math.round(x * 1e4) / 1e4, r9 = (x) => Math.round(x * 1e9) / 1e9;
const R9 = (p) => p.map(r9);
const R4 = (p) => p.map(r4);
export const M = (q) => R9([q[1] * IN, q[0] * IN, q[2] * IN]);   // unrounded (1e-9): loft sections stay planar for OCC                       // model ft [s, y, z] → [BL, FS, WL] in
export const SP = (u, n = 0, y = 0, phi = P0) => M(strutPt(phi, u / IN, n / IN, y / IN));   // strut frame (in) → aircraft (in)
export const secIn = (u) => { const q = profAt(SZ.strut, u / IN); return { t: q.t, b: q.b }; };
const rect = (u, n0, n1, y0, y1, phi = P0) => [SP(u, n0, y0, phi), SP(u, n1, y0, phi), SP(u, n1, y1, phi), SP(u, n0, y1, phi)];
const sbox = (g, u0, u1, n0, n1, y0, y1, phi = P0) => ({ g, t: 'loft', secs: [rect(u0, n0, n1, y0, y1, phi), rect(u1, n0, n1, y0, y1, phi)] });
const box = (g, lo, hi) => ({ g, t: 'box', c: lo.map((v, i) => r4((v + hi[i]) / 2)), d: lo.map((v, i) => r4(hi[i] - v)) });
const cyl = (g, a, b, r, ri) => ({ g, t: 'cyl', a: R4(a), b: R4(b), r: r4(r), ...(ri ? { ri: r4(ri) } : {}) });
const xp = (g, ax, pts, e0, e1, holes) => ({ g, t: 'xpoly', ax, pts: pts.map(R4), e: [r4(e0), r4(e1)], ...(holes && holes.length ? { holes: holes.map((h) => h.map(R4)) } : {}) });
const hole = (feat, a, b, r, into) => ({ feat, a: R4(a), b: R4(b), r: r4(r), into });
const circ = (c, r, n = 24) => Array.from({ length: n }, (_, k) => [c[0] + r * Math.cos(2 * Math.PI * k / n), c[1] + r * Math.sin(2 * Math.PI * k / n)]);
export const D = { an3: 0.0955, an4: 0.1285, an6: 0.1885, an10: 0.3135, n6: 0.0695 };   // hole radii: close-fit AN3 / AN4 / AN6 / AN10, #6-32 tap drill

// ------------------------------------------------------------------------------------------- datums (in)
export const E = (() => {
  const O = M(NG.O), A = M(NG.A), Ls = NG.Ls * IN, c = NG.c * IN, cn = NG.cn * IN, crownU = Ls + NG.crownIn, AX = M(axleAt(P0));
  return { O, A, Ls, c, cn, crownU, AX, FY: SZ.FY * IN, plate: { yi: NG.plateY * IN, yo: (NG.plateY + NG.plateT) * IN, face: 0.04 },
    wormZ: NG.wormZ * IN, wormY: NG.wormY * IN, WR: NG.worm.N * NG.worm.lead / Math.PI / 2, tsh: FIXED.fuselage.coreIn + 2 * FIXED.fuselage.faceBID * 0.01, flox: 0.03 };
})();
/** OML height (in) at FS f, BL y (in): first point inside going up */
const _sk = new Map();
const SK_Z = marchHeights(1.8, 0.0005, 4), SK_LO = SK_Z.slice(0, -1);   // the march's heights (ft): z = 1.8, += 0.0005 while < 4
/** (the first of those heights inside the OML, found by firstInsideOML instead of testing each in turn: the same z; perf) */
export function skinZ(f, y) { const k = `${Math.round(f * 20)}:${Math.round(y * 20)}`; if (!_sk.has(k)) { const i = firstInsideOML(f / IN, y / IN, SK_LO); _sk.set(k, (i >= 0 ? SK_Z[i] : SK_Z.at(-1)) * IN); } return _sk.get(k); }
/** NG-30 plate bottom (in): on the shell's inner skin at the plate's outer face + flox */
export const plateBot = (f) => skinZ(f, E.plate.yo) + E.tsh + E.flox;

// ------------------------------------------------------------------------------------------- NG-30 plate profile (FS, WL in)
// F22 forward face with its nose-gear doubler (wp25_f22 f22Layers ngF): FS 21.7447 with the sourced 7725 ply (integration 2026-11-19,
// ICD A-M2; was 21.7625). It cannot be read live: F22's doubler count is sized in wp25_f22 from this module's NG-30 plate, which is
// placed from this face, so the converged value is restated here and LEZ-32-201 I9 (f22Face) holds it equal to f22Layers within 1e-4 in.
export const F22_FWD = 21.7620;   // block P (2026-11-19): with the 6781 cured ply (0.0101 in; was 21.7447 with the 7725 ply)
export const PLATE = (() => {
  const s0 = NG.box[0] * IN, s1 = F22_FWD - E.flox, cap = 32.85, sCap = 10.15, pts = [];
  for (let f = s0 + 0.4; f < s1 - 0.1; f += 0.96) pts.push([f, plateBot(f)]);
  pts.push([s1, plateBot(s1)], [s1, 39.6], [15.6, 39.6], [12.6, 38.64], [sCap, top0(sCap)], [sCap, cap], [s0, cap], [s0, plateBot(s0) + 0.6]);
  function top0(f) { return 37.2 + (f - 8.64) / (12.6 - 8.64) * (38.64 - 37.2); }
  const lhole = [[15.6, 33.2], [19.44, 33.2], [19.44, 35.76], [16.32, 36.72]];
  const bot = (f) => plateBot(f) + 0.15, strip = (f0, f1, top) => { const q = []; for (let f = f0; f <= f1 + 1e-9; f += (f1 - f0) / 6) q.push([f, bot(f)]); return [...q, [f1, top], [f0, top]]; };
  const hp1 = strip(7.6, 11.2, 32.7), hp2 = [[10.25, 33.25], [15.45, 33.25], [15.45, 38.0], [12.6, 38.39], [sCap + 0.1, Math.min(top0(sCap) - 0.25, 37.4)]];
  const hp3 = strip(16.2, 19.0, 32.9);
  return { pts, lhole, hp1, hp2, hp3, cap, sCap, s0, s1, top0 };
})();

// ------------------------------------------------------------------------------------------- the parts' primitives
const st = SZ.strut.map((q) => q.u * IN);
const osec = (u, grow = 0) => { const { t, b } = secIn(u), h = t / 2 + grow, w = b / 2 + grow, c = Math.min(0.12, h * 0.4, w * 0.4);
  return [[h, w - c], [h - c, w], [-h + c, w], [-h, w - c], [-h, -w + c], [-h + c, -w], [h - c, -w], [h, -w + c]].map(([n, y]) => SP(u, n, y)); };
const latHole = (feat, u, n, w, into, r = D.an4) => hole(feat, SP(u, n, -w), SP(u, n, w), r, into);
/** NG-8 disc: Ø2.0, flatted at the bottom 0.06 in above the inner skin under its outer face */
export const DISC = { r: 0.82, bc: 0.52, flat: () => { let z = -Infinity; for (let f = E.O[1] - 0.82; f <= E.O[1] + 0.82; f += 0.1) z = Math.max(z, skinZ(f, E.plate.yo + 0.25) + E.tsh + 0.06); return z; } };
export const BOLTS = { ng6: [0.95, 1.95], ng3: [E.c - 0.45, E.c + 0.45], ng4: E.Ls - 0.75 };
export const NG6 = { u0: -0.70, u1: 2.6, n: 0.8, yi: 0.53, yo: 0.68, bossR: 0.375, bossRi: 0.1875, bossY: E.plate.yi - 0.05, lip: [-1.15, -0.80], band: [1.5, 2.6] };
export const DSTOP = { pad: { u: [-0.95, NG6.u0], n: [-1.30, -0.75], y: 0.68 }, bar: { u: [-1.55, -0.95], n: [-1.30, -0.70], y: E.plate.yi - 0.01 } };
const tU = (u) => secIn(u).t / 2;
export const USTOP = { pad: { u: [8.0, 9.5], n: [tU(8.0), tU(8.0) + 0.25], y: 0.68 }, bar: { u: [8.0, 9.5], n: [tU(8.0) + 0.25, tU(8.0) + 0.75], y: E.plate.yi - 0.01 } };
export const NG3 = { u0: E.c - 0.85, u1: E.c + 0.85, t: SZ.ear.t, wall: 0.08, gap: 0.5, ear: [E.c - 0.55, E.c + 0.55] };
export const NG4 = { L: 1.5, wall: 0.065, plate: 0.19, spR: 0.5625, spRi: 0.4425 };
export const FORK = { damper: [0.19, 0.31], dampR: 0.95, bossR: 0.78, bossRi: 0.60, crownR: 0.4375, crownRi: 0.3795, axBossR: 0.6 };
export const ARM = { hubR: 0.54, hubY: 0.225, w0: SZ.arm.w, w1: SZ.arm.w * 0.75, t: SZ.arm.t, eyeR: 0.38, tab: { f: [13.48, 13.73], z: [34.3, 34.9], y: [0.125, 0.28] } };
export const HOUSING = { f: [11.5, 15.35], y: [0.30, 2.24], z: [35.0, 38.15], bolts: [[E.A[1] - 1.55, 35.4], [E.A[1] + 1.55, 35.4], [E.A[1] - 1.55, 37.7], [E.A[1] + 1.55, 37.7]], lug: { f: [13.73, 14.13], y: [0.13, 0.60], z: [34.2, 35.0] } };
const LV = DOOR.lever;
export const SHELF = { f: [NOSE_SW[0] * IN - 0.4, NOSE_SW[0] * IN + 0.4], z: NOSE_SW[2] * IN - 0.04, t: 0.063, y0: 0.80, leg: 0.95, bolts: [NOSE_SW[0] * IN - 0.2, NOSE_SW[0] * IN + 0.2], screws: [-0.45, 0.45].map((x) => NOSE_SW[1] * IN + x), screwF: NOSE_SW[0] * IN - 0.02 };

function strutP() {   // LEZ-32-200
  const prims = [{ g: 'strut', t: 'loft', secs: st.map((u) => osec(u)) }];
  const cuts = [...BOLTS.ng6.map((u) => latHole('ng6', u, 0, 1.0, [0])), ...BOLTS.ng3.map((u) => latHole('ng3', u, 0, 1.0, [0])), latHole('ng4', BOLTS.ng4, 0, 1.0, [0])];
  return { prims, cuts };
}
function plateP() {   // LEZ-32-201, right plate (left is its mirror; the gearbox, shelf and harness holes are drilled on the right only)
  const { yi, yo, face } = E.plate, P = PLATE, prims = [xp('face', 0, P.pts, yi, yi + face, [P.lhole]), xp('core', 0, P.pts, yi + face, yo - face, [P.lhole, P.hp1, P.hp2, P.hp3]),
    xp('face', 0, P.pts, yo - face, yo, [P.lhole]), xp('hp', 0, P.hp1, yi + face, yo - face), xp('hp', 0, P.hp2, yi + face, yo - face), xp('hp', 0, P.hp3, yi + face, yo - face)];
  // the S12 shelf: 0.063 6061 angle on the inner face, horizontal leg under the switch bracket
  const S = SHELF; prims.push(box('shelf', [S.y0, S.f[0], S.z - S.t], [yi, S.f[1], S.z]), box('shelf', [yi - S.t, S.f[0], S.z - S.leg], [yi, S.f[1], S.z - S.t]));
  const thru = (feat, f, z, r, into = [0, 1, 2, 3, 4, 5]) => hole(feat, [yi - 0.1, f, z], [yo + 0.1, f, z], r, into);
  const O = E.O, A = E.A, cuts = [thru('hinge', O[1], O[2], D.an4), ...Array.from({ length: 6 }, (_, k) => thru('disc', O[1] + DISC.bc * Math.cos(k * Math.PI / 3), O[2] + DISC.bc * Math.sin(k * Math.PI / 3), D.an3)),
    thru('bearing', A[1], A[2], 0.5625), ...HOUSING.bolts.map(([f, z]) => thru('gearbox', f, z, D.an4)), thru('pivot', LV.pivot[0] * IN, LV.pivot[1] * IN, D.an3),
    thru('dstop', ...barAt(DSTOP, P0), D.an3), thru('ustop', ...barAt(USTOP, NG.phi1), D.an3), ...S.bolts.map((f) => hole('shelf', [yi - 0.2, f, S.z - 0.55], [yo + 0.1, f, S.z - 0.55], D.an3, [0, 1, 2, 3, 4, 5, 7])),
    ...S.screws.map((y) => hole('screw', [y, S.screwF, S.z - S.t - 0.05], [y, S.screwF, S.z + 0.01], D.n6, [6])), thru('grommet', ...SW_WIRE, 0.25)];
  return { prims, cuts };
}
/** a stop bar's centre (FS, WL) in the aircraft frame at angle phi */
function barAt(S, phi) { const p = SP((S.bar.u[0] + S.bar.u[1]) / 2, (S.bar.n[0] + S.bar.n[1]) / 2, 0, phi); return [p[1], p[2]]; }
/** where the S12 harness (wp7 route 1, switch → BL 3.24) crosses the RH plate's mid-plane (FS, WL) */
export const SW_WIRE = (() => { const a = NOSE_SW.map((v) => v * IN), b = [a[0], 0.27 * IN, 2.62 * IN], y = (E.plate.yi + E.plate.yo) / 2, f = (y - a[1]) / (b[1] - a[1]); return [r4(a[0] + f * (b[0] - a[0])), r4(a[2] + f * (b[2] - a[2]))]; })();
function hingeP() {   // LEZ-32-202
  const O = E.O, yo = E.plate.yo, prims = [], cuts = [];
  const zf = DISC.flat(), dp = circ([O[1], O[2]], DISC.r, 48).map(([f, z]) => [f, Math.max(z, zf)]);
  for (const sg of [1, -1]) prims.push(xp('disc', 0, dp, sg > 0 ? yo : -yo - 0.25, sg > 0 ? yo + 0.25 : -yo, [circ([O[1], O[2]], D.an4, 16)]));
  prims.push(cyl('bolt', [-(yo + 0.45), O[1], O[2]], [yo + 0.45, O[1], O[2]], 0.125));
  const S = DSTOP; prims.push(sbox('stop', S.bar.u[0], S.bar.u[1], S.bar.n[0], S.bar.n[1], -S.bar.y, S.bar.y), sbox('pad', S.pad.u[0], S.pad.u[1], S.pad.n[0], S.pad.n[1], -S.pad.y, S.pad.y));
  [0, 1].forEach((i) => { const sg = i ? -1 : 1; for (let k = 0; k < 6; k++) { const f = O[1] + DISC.bc * Math.cos(k * Math.PI / 3), z = O[2] + DISC.bc * Math.sin(k * Math.PI / 3); cuts.push(hole('disc', [sg * (yo - 0.05), f, z], [sg * (yo + 0.3), f, z], D.an3, [i])); } });
  const [bf, bz] = barAt(S, P0); for (const sg of [1, -1]) cuts.push(hole('tap', [sg * (S.bar.y - 0.6), bf, bz], [sg * S.bar.y, bf, bz], 0.08, [3]));
  return { prims, cuts };
}
function ng6P() {   // LEZ-32-203
  const G = NG6, prims = [sbox('cheek', G.u0, G.u1, -G.n, G.n, G.yi, G.yo), sbox('cheek', G.u0, G.u1, -G.n, G.n, -G.yo, -G.yi),
    cyl('boss', [-G.bossY, E.O[1], E.O[2]], [G.bossY, E.O[1], E.O[2]], G.bossR, G.bossRi), sbox('lip', G.u0, 0.10, G.lip[0], G.lip[1], -G.yo, G.yo),
    sbox('band', G.band[0], G.band[1], 0.51, 0.66, -G.yi, G.yi), sbox('band', G.band[0], G.band[1], -0.66, -0.51, -G.yi, G.yi)];
  const cuts = [hole('boss', [-0.8, E.O[1], E.O[2]], [0.8, E.O[1], E.O[2]], G.bossR, [0, 1]), ...BOLTS.ng6.map((u) => latHole('clamp', u, 0, 0.8, [0, 1]))];
  return { prims, cuts };
}
const facePlates = (g, u0, us, w) => { const s = (n0f, n1f, y0f, y1f) => ({ g, t: 'loft', secs: us.map((u) => { const { t, b } = secIn(u); return rect(u, n0f(t), n1f(t), y0f(b), y1f(b)); }) });
  return [s((t) => -t / 2 - w, (t) => -t / 2, (b) => -b / 2, (b) => b / 2), s((t) => t / 2, (t) => t / 2 + w, (b) => -b / 2, (b) => b / 2),
    s((t) => -t / 2 - w, (t) => t / 2 + w, (b) => b / 2, (b) => b / 2 + w), s((t) => -t / 2 - w, (t) => t / 2 + w, (b) => -b / 2 - w, (b) => -b / 2)]; };
function ng34P() {   // LEZ-32-204
  const G = NG3, prims = [...facePlates('ng3', G.u0, [G.u0, E.c, G.u1], G.wall)];
  const tc = secIn(E.c).t; for (const sg of [1, -1]) prims.push(sbox('ear', G.ear[0], G.ear[1], tc / 2 + G.wall, E.cn + 0.40, sg > 0 ? G.gap / 2 : -G.gap / 2 - G.t, sg > 0 ? G.gap / 2 + G.t : -G.gap / 2));
  const H = NG4, u0 = E.Ls - H.L; prims.push(...facePlates('ng4', u0, [u0, E.Ls], H.wall));
  const tt = secIn(E.Ls); prims.push(sbox('ng4', E.Ls, E.Ls + H.plate, -tt.t / 2 - H.wall, tt.t / 2 + H.wall, -tt.b / 2 - H.wall, tt.b / 2 + H.wall));
  prims.push(cyl('spindle', SP(E.Ls + H.plate), SP(E.crownU - FORK.crownR - 0.02), H.spR, H.spRi));
  const cuts = [...BOLTS.ng3.map((u) => latHole('ng3', u, 0, 1.0, [2, 3])), hole('pin', SP(E.c, E.cn, -0.6), SP(E.c, E.cn, 0.6), D.an4, [4, 5]), latHole('ng4', BOLTS.ng4, 0, 1.0, [8, 9])];
  return { prims, cuts };
}
export const legAxis = (sg) => { const c = SP(E.crownU, 0, sg * E.FY), a = [sg * E.FY, E.AX[1], E.AX[2]], d = [0, a[1] - c[1], a[2] - c[2]], L = Math.hypot(d[1], d[2]); return { c, a, e: [0, d[1] / L, d[2] / L], L }; };
function forkP() {   // LEZ-32-206
  const F = FORK, prims = [cyl('damper', SP(E.Ls + F.damper[0]), SP(E.Ls + F.damper[1]), F.dampR, FORK.bossRi), cyl('boss', SP(E.Ls + F.damper[1]), SP(E.crownU - F.crownR), F.bossR, F.bossRi)];
  const hw = SZ.leg.b / 2; prims.push(cyl('crown', SP(E.crownU, 0, -(E.FY + hw)), SP(E.crownU, 0, E.FY + hw), F.crownR, F.crownRi));
  const oval = (p, e, h, b) => { const nn = [0, -e[2], e[1]]; return Array.from({ length: 32 }, (_, k) => { const a = k / 32 * 2 * Math.PI, u = Math.cos(a) * h / 2, v = Math.sin(a) * b / 2; return R9([p[0] + v, p[1] + nn[1] * u, p[2] + nn[2] * u]); }); };
  for (const sg of [1, -1]) { const { c, a, e } = legAxis(sg), p0 = c.map((v, i) => v + e[i] * F.crownR), p1 = a.map((v, i) => v - e[i] * F.axBossR), h = SZ.leg.h, b = SZ.leg.b, w = SZ.leg.w;
    prims.push({ g: 'leg', t: 'loft', secs: [oval(p0, e, h, b), oval(p1, e, h, b)], inner: [oval(p0, e, h - 2 * w, b - 2 * w), oval(p1, e, h - 2 * w, b - 2 * w)] });
    prims.push(cyl('axboss', [sg * (E.FY - hw), E.AX[1], E.AX[2]], [sg * (E.FY + hw), E.AX[1], E.AX[2]], F.axBossR, D.an10)); }
  // axle: a 5/8 in pin flush with the axle bosses' outer faces (an AN10 bolt's head and nut reached ±2.23 in, through the door
  // torque tubes' path at ±2.01 as the wheel rises through the opening), held by an AN3 cross-bolt through each boss
  prims.push(cyl('axle', [-(E.FY + hw), E.AX[1], E.AX[2]], [E.FY + hw, E.AX[1], E.AX[2]], 0.3125));
  const xb = [1, -1].map((sg) => hole('xbolt', [sg * E.FY, E.AX[1] - F.axBossR - 0.05, E.AX[2]], [sg * E.FY, E.AX[1] + F.axBossR + 0.05, E.AX[2]], D.an3, [sg > 0 ? 4 : 6, 7]));
  return { prims, cuts: [hole('retainer', SP(E.crownU - F.crownR - 0.05), SP(E.crownU + F.crownR + 0.05), D.an6, [2]), ...xb] };
}
export const WHEEL = { tyreR: 3.0, tyreR2: 1.4,   // rev 2026-11-19: Azusa 280/250-4 OD 8.8 × 2.8 in (Aircraft Spruce 06-01287, accessed 2026-11-19)
  rimR: 2.25, rimRi: 0.85, rim: [0.1, 1.2], hubR: 0.85, hubY: 1.35, lb: { tyre: 1.6, rim: 1.0, hub: 0.4 } };
function wheelP() {   // LEZ-32-207
  const W = WHEEL, X = E.AX, prims = [{ g: 'tyre', t: 'torus', c: R4(X), ax: 0, R: W.tyreR, r: W.tyreR2 }];
  for (const sg of [1, -1]) prims.push(cyl('rim', [sg * W.rim[0], X[1], X[2]], [sg * W.rim[1], X[1], X[2]], W.rimR, W.rimRi));
  prims.push(cyl('hub', [-W.hubY, X[1], X[2]], [W.hubY, X[1], X[2]], W.hubR, D.an10));
  return { prims, cuts: [] };
}
export const GEARBOX_LB = { housing: 1.1 };
function gearboxP() {   // LEZ-32-210
  const H = HOUSING, prims = [box('housing', [H.y[0], H.f[0], H.z[0]], [H.y[1], H.f[1], H.z[1]]), box('lug', [H.lug.y[0], H.lug.f[0], H.lug.z[0]], [H.lug.y[1], H.lug.f[1], H.lug.z[1]])];
  const cuts = [hole('shaft', [H.y[0], E.A[1], E.A[2]], [H.y[1], E.A[1], E.A[2]], 0.27, [0]), hole('worm', [E.wormY, H.f[0], E.wormZ], [E.wormY, H.f[1], E.wormZ], 0.17, [0]),
    ...H.bolts.map(([f, z]) => hole('tap', [H.y[1] - 0.6, f, z], [H.y[1], f, z], 0.1065, [0]))];
  return { prims, cuts };
}
const UJ = M(NG.ujoint), CR = M(NG.crank);
function wormP() {   // LEZ-32-211
  const y = E.wormY, z = E.wormZ, f0 = E.A[1] - 1.44, f1 = E.A[1] + 1.44;
  return { prims: [cyl('worm', [y, f0, z], [y, f1, z], NG.worm.pitchD / 2), cyl('shaft', [y, HOUSING.f[0] - 0.1, z], [y, f0, z], 0.15625), cyl('shaft', [y, f1, z], [UJ[0], UJ[1] - 0.7, UJ[2]], 0.15625)], cuts: [] };
}
export const FINGER = () => { const p = SWF.at(KIN.ad); return [p[0] * IN, p[1] * IN]; };
function crossP() {   // LEZ-32-212
  const A = E.A, prims = [cyl('wheel', [0.60, A[1], A[2]], [1.08, A[1], A[2]], E.WR + 0.1, 0.2505), cyl('shaft', [-(DOOR.camY * IN + 0.28), A[1], A[2]], [DOOR.camY * IN + 0.28, A[1], A[2]], 0.25)];
  prims.push(cyl('arm', [-ARM.hubY, A[1], A[2]], [ARM.hubY, A[1], A[2]], ARM.hubR, 0.2505));
  const Bp = M(B_at(KIN.ad)), u = [0, Bp[1] - A[1], Bp[2] - A[2]], L = Math.hypot(u[1], u[2]), e = [0, u[1] / L, u[2] / L], nn = [0, -e[2], e[1]];
  const sec = (d, w) => { const c = [0, A[1] + e[1] * d, A[2] + e[2] * d]; return [[ARM.t / 2, c[1] + nn[1] * w / 2, c[2] + nn[2] * w / 2], [ARM.t / 2, c[1] - nn[1] * w / 2, c[2] - nn[2] * w / 2], [-ARM.t / 2, c[1] - nn[1] * w / 2, c[2] - nn[2] * w / 2], [-ARM.t / 2, c[1] + nn[1] * w / 2, c[2] + nn[2] * w / 2]].map(R9); };
  prims.push({ g: 'arm', t: 'loft', secs: [sec(ARM.hubR, ARM.w0), sec(L - ARM.eyeR, ARM.w1)] }, cyl('arm', [-ARM.t / 2, Bp[1], Bp[2]], [ARM.t / 2, Bp[1], Bp[2]], ARM.eyeR, D.an4));
  const T = ARM.tab; prims.push(box('arm', [T.y[0], T.f[0], T.z[0]], [T.y[1], T.f[1], T.z[1]]));
  // S12 finger: hub beside the NG-64 hub, a radial plate to the finger rod
  const fy = SWF.armY.map((v) => v * IN), Fp = FINGER(), fd = [0, Fp[0] - A[1], Fp[1] - A[2]], fl = Math.hypot(fd[1], fd[2]), fe = [0, fd[1] / fl, fd[2] / fl], fn = [0, -fe[2], fe[1]];
  prims.push(cyl('finger', [fy[0], A[1], A[2]], [-ARM.hubY, A[1], A[2]], 0.45, 0.2505));
  const fsec = (d) => { const c = [A[1] + fe[1] * d, A[2] + fe[2] * d]; return [[fy[1], c[0] + fn[1] * 0.25, c[1] + fn[2] * 0.25], [fy[1], c[0] - fn[1] * 0.25, c[1] - fn[2] * 0.25], [fy[0], c[0] - fn[1] * 0.25, c[1] - fn[2] * 0.25], [fy[0], c[0] + fn[1] * 0.25, c[1] + fn[2] * 0.25]].map(R9); };
  prims.push({ g: 'finger', t: 'loft', secs: [fsec(0.45), fsec(fl - SWF.rod * IN)] }, cyl('finger', [fy[0], Fp[0], Fp[1]], [SWF.y1 * IN, Fp[0], Fp[1]], SWF.rod * IN));
  return { prims, cuts: [] };
}
export const LINK = { clev: 0.9, clevY: [0.135, 0.26], clevW: 0.76, cart: [2.5, 6.1] /* integration 2026-11-19: 1.5 in further from the NG-64 eye, where the wide cartridge clears S12 over the stroke; a Ø 0.80 neck from the clevis */, neckR: 0.40, cartR: 0.875, cartRi: 0.81 /* integration 2026-11-19: 1.75 × 0.065 4130 for the Ø 40 mm spring stack */, spring: [3.1, 5.1], springR: 0.787, springRi: 0.197 /* 40 mm hole outer spring over the nested 20 mm spring on its Ø 10 mm guide */, rodR: SZ.rod.od / 2, rodRi: SZ.rod.od / 2 - SZ.rod.w, endR: 0.375, endY: 0.14, shank: 1.2, shankR: 0.19,
  lb: { spring: 0.95 /* BOUND: both die springs (McMaster lists no weight), wire volume estimate */ } };
function linkP() {   // LEZ-32-213, at DOWN
  const B = M(B_at(KIN.ad)), C = M(C_at(P0)), d = [0, C[1] - B[1], C[2] - B[2]], L = Math.hypot(d[1], d[2]), e = [0, d[1] / L, d[2] / L], at = (s, y = 0) => [y, B[1] + e[1] * s, B[2] + e[2] * s], nn = [0, -e[2], e[1]], K = LINK, prims = [];
  for (const sg of [1, -1]) { const y0 = sg * K.clevY[0], y1 = sg * K.clevY[1]; const r = (s, w) => [[y1, B[1] + e[1] * s + nn[1] * w, B[2] + e[2] * s + nn[2] * w], [y1, B[1] + e[1] * s - nn[1] * w, B[2] + e[2] * s - nn[2] * w], [y0, B[1] + e[1] * s - nn[1] * w, B[2] + e[2] * s - nn[2] * w], [y0, B[1] + e[1] * s + nn[1] * w, B[2] + e[2] * s + nn[2] * w]].map(R9);
    prims.push({ g: 'clevis', t: 'loft', secs: [r(-K.clevW / 2, K.clevW / 2), r(K.clev, K.clevW / 2)] }); }
  prims.push(cyl('clevis', at(K.clev), at(K.cart[0]), K.neckR), cyl('cartridge', at(K.cart[0]), at(K.cart[1]), K.cartR, K.cartRi), cyl('spring', at(K.spring[0]), at(K.spring[1]), K.springR, K.springRi),
    cyl('rod', at(K.cart[1]), at(L - K.shank), K.rodR, K.rodRi), cyl('rodend', at(L - K.shank), at(L - K.endR), K.shankR), cyl('rodend', [-K.endY, C[1], C[2]], [K.endY, C[1], C[2]], K.endR, D.an4));
  return { prims, cuts: [hole('pin', [-0.4, B[1], B[2]], [0.4, B[1], B[2]], D.an4, [0, 1])], L };
}
function crankP() {   // LEZ-32-214
  const d = [CR[0] - UJ[0], CR[1] - UJ[1], CR[2] - UJ[2]], L = Math.hypot(...d), e = d.map((v) => v / L), at = (s) => UJ.map((v, i) => v + e[i] * s);
  const prims = [cyl('ujoint', [UJ[0], UJ[1] - 0.7, UJ[2]], UJ, 0.375, 0.16), cyl('ujoint', UJ, at(0.7), 0.375, 0.16), cyl('shaft', at(0.7), [CR[0], CR[1] + 0.40, CR[2]], 0.15625)];
  const k = CR[1] + 0.40, R = NG.crankR * IN; prims.push(cyl('crank', [CR[0], k, CR[2]], [CR[0], k + 0.36, CR[2]], 0.3, 0.16), box('crank', [CR[0] - 0.19, k + 0.36, CR[2] - R], [CR[0] + 0.19, k + 0.6, CR[2]]), cyl('knob', [CR[0], k + 0.6, CR[2] - R], [CR[0], k + 1.8, CR[2] - R], 0.3));
  // position indicator: travelling-nut guide on the panel's forward face and the flag behind B's window
  prims.push(box('flag', [FLAG.win[0] - 0.1, FLAG.f[0], FLAG.win[2] - 0.15], [CR[0] - 0.35, FLAG.f[1], FLAG.win[3] + 0.15]));
  return { prims, cuts: [] };
}
export const FLAG = { win: [-2.20, -1.30, 34.20, 34.80], f: [40.05, 40.30] };
function wellP() {   // LEZ-32-220
  const W = WELL, s0 = W.s0 * IN, s1 = W.s1 * IN, hw = W.halfW * IN, t = 0.03, ch = W.chan, cHw = ch.halfW * IN, cTop = ch.top * IN, f22 = 22.0 + 0.25;
  const ceil = W.ceil.map(([s, z]) => [s * IN, z * IN]), wallBot = (f, y) => skinZ(f, y) + E.tsh;
  const side = (y, f0, f1, top) => { const q = []; for (let f = f0; f <= f1 + 1e-9; f += (f1 - f0) / 8) q.push([f, wallBot(f, y + t)]); return [...q, ...top]; };
  const wellTop = [...ceil.filter(([f]) => f > s0 && f < s1).reverse(), [s0, ceil[0][1]]].map(([f, z]) => [f, z + t]); wellTop.unshift([s1, ceil.at(-1)[1] + t]);
  const prims = [];
  for (const sg of [1, -1]) { const e0 = sg > 0 ? hw : -hw - t, e1 = sg > 0 ? hw + t : -hw; prims.push(xp('well', 0, side(hw, s0, s1, wellTop), e0, e1));
    const c0 = sg > 0 ? cHw : -cHw - t, c1 = sg > 0 ? cHw + t : -cHw; prims.push(xp('chan', 0, side(cHw, f22, s0, [[s0, cTop + t], [f22, cTop + t]]), c0, c1)); }
  const band = [...ceil.map(([f, z]) => [f, z]), ...ceil.slice().reverse().map(([f, z]) => [f, z + t])].filter(([f]) => f >= s0 - 1e-6 && f <= s1 + 1e-6);
  prims.push(xp('well', 0, band, -hw, hw), box('chan', [-cHw, f22, cTop], [cHw, s0 - t, cTop + t]));
  prims.push(xp('well', 1, [[-hw, cTop], [-cHw, cTop], [cHw, cTop], [hw, cTop], [hw, ceil[0][1]], [-hw, ceil[0][1]]], s0 - t, s0));
  return { prims, cuts: [] };
}
function bumperP() {   // LEZ-32-225
  const f0 = 3.6, f1 = 6.48, n = 6, line = (dz) => Array.from({ length: n + 1 }, (_, k) => { const f = f0 + (f1 - f0) * k / n; return [f, skinZ(f, 0.72) + dz]; });
  const base = [...line(0), ...line(-0.125).reverse()], skid = [...line(-0.125), ...line(-0.625).reverse()];
  const prims = [xp('base', 0, base, -0.8, 0.8), xp('skid', 0, skid, -0.72, 0.72)];
  const cuts = [-0.4, 0.4].flatMap((y) => [4.2, 5.9].map((f) => { const z = skinZ(f, 0.72); return hole('screw', [y, f, z - 0.7], [y, f, z + 0.05], 0.095, [0, 1]); }));
  return { prims, cuts };
}
function upstopP() {   // LEZ-32-226 (at the stowed angle)
  const S = USTOP, p = NG.phi1, prims = [sbox('stop', S.bar.u[0], S.bar.u[1], S.bar.n[0], S.bar.n[1], -S.bar.y, S.bar.y, p), sbox('pad', S.pad.u[0], S.pad.u[1], S.pad.n[0], S.pad.n[1], -S.pad.y, S.pad.y, p)];
  const [bf, bz] = barAt(S, p); return { prims, cuts: [1, -1].map((sg) => hole('tap', [sg * (S.bar.y - 0.6), bf, bz], [sg * S.bar.y, bf, bz], 0.08, [0])) };
}
// ---- doors: the right door (left mirrored); notched at the middle and aft hinge brackets
// brackets: the middle one aft of the band the fork legs and axle bosses sweep past the hinge line (FS 29–35.5); inner face at
// BL 1.92 (bushing wall) so the forward one, which must stay by the horn, clears the swept fork legs (e_icd hingeSweep)
// 2026-11-22: thin-wall bushings (1/4 × 5/16 in sintered bronze, wall 0.031, was Ø0.375 OD) let the brackets' inner faces move 0.03 in
// outboard (BL 1.92 → 1.95) with the same 0.028 in of bracket inboard of the bushing: the swept fork legs then clear by ≥ 0.125 in (was 0.112)
export const DR = { t: DOOR.t * IN, notchY: 1.80, brk: [[DOOR.quadS * IN + 0.15, DOOR.quadS * IN + 0.57], [36.0, 36.42], [39.75, 40.17]], brkY: 1.95, bushR: 0.15625, spring: [36.52, 37.32], gap: 0.05 };
const doorZ = (f) => belly(f / IN) * IN + 0.006;
function doorP() {   // LEZ-32-230
  const f0 = DOOR.s0 * IN, f1 = DOOR.s1 * IN, yi = DOOR.yIn * IN, yo = DOOR.yOut * IN, t = DR.t;
  const secAt = (f, a, b) => [[b, f, doorZ(f)], [a, f, doorZ(f)], [a, f, doorZ(f) + t], [b, f, doorZ(f) + t]].map(R9);
  const loft = (fa, fb, a, b) => ({ g: 'door', t: 'loft', secs: Array.from({ length: 5 }, (_, k) => secAt(fa + (fb - fa) * k / 4, a, b)) });
  const n1 = DR.brk[1], n2 = DR.brk[2];
  return { prims: [loft(f0, f1, yi, DR.notchY), loft(f0, n1[0] - DR.gap, DR.notchY, yo), loft(n1[1] + DR.gap, n2[0] - DR.gap, DR.notchY, yo)], cuts: [] };
}
function hingeTubeP() {   // LEZ-32-231, right side
  const y = DOOR.hingeY * IN, a = [y, DOOR.quadS * IN, doorAxisZ(DOOR.quadS) * IN], b = [y, DOOR.s1 * IN, doorAxisZ(DOOR.s1) * IN], ht = hornTip(0);
  const prims = [cyl('tube', a, b, DOOR.tubeR * IN, DOOR.tubeR * IN - 0.035), cyl('horn', [y, a[1], a[2] + DOOR.tubeR * IN], [Math.abs(ht[1]) * IN, a[1], ht[2] * IN], 0.0625),
    cyl('spring', [y, DR.spring[0], doorAxisZ(DR.spring[0] / IN) * IN], [y, DR.spring[1], doorAxisZ(DR.spring[1] / IN) * IN], 0.26, DOOR.tubeR * IN + 0.01)];   // anchored to the middle bracket
  const cuts = [];
  DR.brk.forEach(([g0, g1], i) => { const z = doorAxisZ((g0 + g1) / 2 / IN) * IN; prims.push(box('bracket', [DR.brkY, g0, z - 0.25], [WELL.halfW * IN, g1, z + 0.35])); cuts.push({ ...hole('bush', [y, g0 - 0.05, z], [y, g1 + 0.05, z], DR.bushR, [3 + i]), partial: true }); });
  return { prims, cuts };
}
function doorDriveP() {   // LEZ-32-232, both sides
  const A = E.A, y = DOOR.camY * IN, rc = LV.rollerAt, prims = [], cuts = [];
  const th = Math.atan2(rc[1] - NG.A[2], rc[0] - NG.A[0]);   // roller direction from A (world)
  const prof = Array.from({ length: 72 }, (_, k) => { const ph = k / 72 * 2 * Math.PI;   // body angle at DOWN; the cam turns with the crank angle a
    let best = 0; for (const r of KIN.rows) { const bodyAt = th - (r.a - KIN.ad) * d2r; if (Math.abs(Math.atan2(Math.sin(bodyAt - ph), Math.cos(bodyAt - ph))) < Math.PI / 72) best = Math.max(best, camFrac(r.a)); }
    const R = DOOR.camR * IN + DOOR.lift * IN * best; return [A[1] + R * Math.cos(ph), A[2] + R * Math.sin(ph)]; });
  for (const sg of [1, -1]) { const yc = sg * y, i0 = prims.length;
    prims.push(xp('cam', 0, prof, yc - 0.144, yc + 0.144));
    cuts.push(hole('bore', [yc - 0.2, A[1], A[2]], [yc + 0.2, A[1], A[2]], 0.2505, [i0]));
    const pv = [yc, LV.pivot[0] * IN, LV.pivot[1] * IN], ro = [yc, rc[0] * IN, rc[1] * IN], tip = [yc, LV.tip[0] * IN, LV.tip[1] * IN];
    prims.push(cyl('follower', pv, ro, 0.12), cyl('follower', pv, tip, 0.12), cyl('roller', [yc - 0.12, ro[1], ro[2]], [yc + 0.12, ro[1], ro[2]], 0.24, 0.0955),
      cyl('pivot', [sg * E.plate.yo, pv[1], pv[2]], [yc + sg * 0.25, pv[1], pv[2]], 0.0938));
    const fl = [yc, DOOR.fairlead[0] * IN, DOOR.fairlead[1] * IN], ht = hornTip(0, sg).map((v) => v * IN), hornP = [ht[1], ht[0], ht[2]];
    prims.push(cyl('fairlead', [yc, fl[1] - 0.25, fl[2]], [yc, fl[1] + 0.25, fl[2]], 0.24, 0.05), cyl('cable', tip, [yc, fl[1] - 0.25, fl[2]], 1 / 32), cyl('cable', [yc, fl[1] + 0.25, fl[2]], hornP, 1 / 32)); }
  return { prims, cuts };
}
export const E_P = { 'LEZ-32-200': strutP(), 'LEZ-32-201': plateP(), 'LEZ-32-202': hingeP(), 'LEZ-32-203': ng6P(), 'LEZ-32-204': ng34P(), 'LEZ-32-205': null, 'LEZ-32-206': forkP(), 'LEZ-32-207': wheelP(),
  'LEZ-32-210': gearboxP(), 'LEZ-32-211': wormP(), 'LEZ-32-212': crossP(), 'LEZ-32-213': linkP(), 'LEZ-32-214': crankP(), 'LEZ-32-220': wellP(), 'LEZ-32-225': bumperP(), 'LEZ-32-226': upstopP(),
  'LEZ-32-230': doorP(), 'LEZ-32-231': hingeTubeP(), 'LEZ-32-232': doorDriveP() };
{ // strut cover: foam fairing on the strut's forward face, depth to the skin line in the stowed pose, width inside the slot
  const n = 12, u0 = 0.18 * IN, u1 = E.Ls - 0.24, slot = (f) => { const t = [[7.44, 1.14], [9.6, 1.32], [12, 1.524], [14.4, 1.728], [16.8, 1.812], [19.2, 1.896], [21.96, 2.004], [24, 2.076], [26.4, 2.16], [29.04, 2.256]]; if (f <= t[0][0]) return t[0][1]; for (let i = 1; i < t.length; i++) if (f <= t[i][0]) return t[i - 1][1] + (t[i][1] - t[i - 1][1]) * (f - t[i - 1][0]) / (t[i][0] - t[i - 1][0]); return t.at(-1)[1]; };
  const dims = (u) => { const { t } = secIn(u), p = SP(u, -t / 2, 0, NG.phi1); return { t, depth: Math.max(0.05, p[2] - skinZ(p[1], 0) - 0.05), W: 2 * Math.min(slot(p[1]) - 0.1875, DOOR.hingeY * IN - 0.3) }; };
  const secs = Array.from({ length: n + 1 }, (_, i) => { const u = u0 + (u1 - u0) * i / n, q = dims(u); return rect(u, -q.t / 2 - q.depth, -q.t / 2, -q.W / 2, q.W / 2); });
  E_P['LEZ-32-205'] = { prims: [{ g: 'cover', t: 'loft', secs }], cuts: [] };
}

// ------------------------------------------------------------------------------------------- densities (lb/in³)
export const RHO = { s2: MAT.sglass.rho * 1.05, a6061: 0.098, st: 0.283, bid: 0.065, pvc: 0.0036, hp: 0.060, uret: 0.043, rubber: 0.045, bronze: 0.32, nylon: 0.041, foam: 0.0018 };
export const E_RHO = {
  'LEZ-32-200': { strut: RHO.s2 }, 'LEZ-32-201': { face: RHO.bid, core: RHO.pvc, hp: RHO.hp, shelf: RHO.a6061 }, 'LEZ-32-202': { disc: RHO.a6061, bolt: RHO.st, stop: RHO.a6061, pad: RHO.uret },
  'LEZ-32-203': { cheek: RHO.a6061, boss: RHO.a6061, lip: RHO.a6061, band: RHO.a6061 }, 'LEZ-32-204': { ng3: RHO.st, ear: RHO.st, ng4: RHO.st, spindle: RHO.st },
  'LEZ-32-205': { cover: RHO.foam }, 'LEZ-32-206': { damper: RHO.bronze, boss: RHO.st, crown: RHO.st, leg: RHO.st, axboss: RHO.st, axle: RHO.st }, 'LEZ-32-210': { lug: RHO.a6061 },
  'LEZ-32-211': { worm: RHO.st, shaft: RHO.st }, 'LEZ-32-212': { wheel: RHO.bronze, shaft: RHO.st, arm: RHO.st, finger: RHO.st }, 'LEZ-32-213': { clevis: RHO.st, cartridge: RHO.st, spring: RHO.st, rod: RHO.st, rodend: RHO.st },
  'LEZ-32-214': { ujoint: RHO.st, shaft: RHO.st, crank: RHO.a6061, knob: RHO.nylon, flag: RHO.a6061 * 0.3 }, 'LEZ-32-220': { well: RHO.bid, chan: RHO.bid }, 'LEZ-32-225': { base: RHO.a6061, skid: RHO.rubber },
  'LEZ-32-226': { stop: RHO.a6061, pad: RHO.uret }, 'LEZ-32-230': { door: 4 * 0.0135 * RHO.bid / DR.t + RHO.pvc * (DR.t - 4 * 0.0135) / DR.t }, 'LEZ-32-231': { tube: RHO.st, horn: RHO.st, spring: RHO.st * 0.35, bracket: RHO.a6061 },
  'LEZ-32-232': { cam: RHO.a6061, follower: RHO.st, roller: RHO.st, pivot: RHO.st, fairlead: RHO.nylon, cable: RHO.st * 0.6 },
};
// strut cover skin (2 BID over the foam, area from the loft's faces), and the NG-30 tapes onto F22 and the belly (4 BID, 1 in lap each side)
const quadA = (a, b, c) => { const u = a.map((v, i) => b[i] - v), w = a.map((v, i) => c[i] - v); return Math.hypot(u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]) / 2; };
export const coverSkin = () => { const s = E_P['LEZ-32-205'].prims[0].secs; let A = 0; for (let i = 1; i < s.length; i++) for (let k = 0; k < 4; k++) { const p = s[i - 1][k], q = s[i - 1][(k + 1) % 4], r = s[i][(k + 1) % 4], w = s[i][k]; A += quadA(p, q, r) + quadA(p, r, w); } return A * 2 * 0.0135 * RHO.bid; };
export const plateTapes = () => { const h = 39.6 - plateBot(PLATE.s1), L = PLATE.s1 - PLATE.s0, A = (h + L) * 2 * 2 * 1.0; return { area: A, lb: A * 4 * 0.0135 * RHO.bid, h, L }; };

// ------------------------------------------------------------------------------------------- checks the definition adds
const BOUND_TR = 'BOUND: UD glass/epoxy transverse bearing 20 ksi (typed from memory, conservative for S-glass; MS ≥ 0 down to ';
registerChecks('wpE1', (d, lc) => {
  if (lc.id !== 'W1-S1') return [];
  const out = [], tag = (r, pn) => { r.sys = pn; out.push(r); }, n = noseLoads(d), FS = d.FS, CS = cases(n), Ro = Math.max(...CS.map((k) => Math.hypot(...k.RO))), pmax = Math.max(...CS.map((k) => Math.abs(k.P)));
  const Htop = E.O[2] - (E.AX[2] - NG.R * IN), Mlat = n.S * Htop;   // side load × hinge height above the ground, in·lb (limit)
  // NG-6: cheek bearing couple on the strut faces (lateral moment), clamp bolts (hinge reaction, bond not counted), bushing bearing
  { const Lc = NG6.u1 - (E.O[2] - E.O[2]) - 0.54, tf = secIn(1.5).t, p = 6 * FS * Mlat / (tf * Lc * Lc), Fbr = 20000, bolts = 2 * 2 * AN_SHEAR[4], msB = bolts / (FS * Ro) - 1, msP = Fbr / p - 1, gl = FS * Ro / 2 / (2 * 0.25 * 1.0), msG = 60000 / gl - 1;
    tag(mk('fuselage', 'ngear-ng6', 'NG-6 clamp: cheek bearing on the strut (side load), 2 × AN4 clamp bolts (hinge reaction), bolt bearing in the S-glass', lc, 'strut top in NG-6', msP < msB ? 'transverse bearing, S-glass' : 'bolt shear', Math.min(msP, msB, msG), {
      formula: 'M = S·h (side load × hinge height);  p = 6·FS·M / (t·L²) bearing couple over the clamp length;  bolts 2 × 2 planes × P_s ≥ FS·R_hinge;  bolt bearing FS·R/2 / (2·d·b) along the fibres',
      inputs: [['Side load S (23.499c)', n.S, 'lb', 'FAR23'], ['Hinge height above ground', Htop, 'in', 'GEOMETRY'], ['Clamp length on the strut', Lc, 'in', 'DESIGN'], ['Strut depth in the clamp', tf, 'in', 'SIZED'],
        ['Transverse bearing allowable', Fbr, 'psi', BOUND_TR + `${p.toFixed(0)} psi)`], ['Bearing along the fibres (bolt)', 60000, 'psi', `BOUND: UD S-glass/epoxy pin bearing (typed from memory); MS ≥ 0 down to ${gl.toFixed(0)} psi`], ['AN4 single shear', AN_SHEAR[4], 'lb', 'AN standard']],
      result: [['Lateral moment at the hinge (limit)', Mlat, 'in·lb'], ['Cheek bearing (ult.)', p, 'psi'], ['Hinge reaction (limit)', Ro, 'lb'], ['Bolt bearing (ult.)', gl, 'psi']] }), 'LEZ-32-203'); }
  // hinge: side couple across the plates on the bolt planes, NG-8 disc bolts, hard-point bearing
  { const span = 2 * (E.plate.yi + E.plate.yo) / 2, worst = Math.max(...CS.map((k) => Math.hypot(...k.RO) / 2 + k.S * Htop / span)), Vb = FS * worst, ms1 = AN_SHEAR[4] / Vb - 1, ms2 = 6 * AN_SHEAR[3] / Vb - 1, hp = Vb / (0.25 * (E.plate.yo - E.plate.yi)), ms3 = 30000 / hp - 1, disc = Vb / (0.25 * 0.25), ms4 = MAT.a6061.Fbru / disc - 1;
    tag(mk('fuselage', 'ngear-hinge-lat', 'Hinge with the side couple: AN4 per shear plane, 6 × AN3 NG-8 disc bolts, hard-point and disc bearing', lc, 'NG-8 / NG-30 each side', 'bolt shear per plane', Math.min(ms1, ms2, ms3, ms4), {
      formula: 'per side V = R/2 + S·h / span (the side moment as a couple across the plates);  AN4 single shear;  6 × AN3 in the disc;  NG-30 hard point bearing V/(d·t);  disc bearing V/(d·0.25)',
      inputs: [['Plate mid-plane span', span, 'in', 'GEOMETRY'], ['Hard-point bearing allowable (BID/flox)', 30000, 'psi', `BOUND: BID/epoxy pin bearing (typed from memory); MS ≥ 0 down to ${hp.toFixed(0)} psi`], ['AN3 / AN4 single shear', `${AN_SHEAR[3]} / ${AN_SHEAR[4]}`, 'lb', 'AN standard'], ['6061-T6 F_bru', MAT.a6061.Fbru, 'psi', 'MMPDS-typical']],
      result: [['Worst side shear (ult.)', Vb, 'lb'], ['Hard-point bearing (ult.)', hp, 'psi']] }), 'LEZ-32-202'); }
  // NG-30 plates: bonded edges (F22 and belly) under the whole nose-gear load, tapes only
  { const T = plateTapes(), P = Math.hypot(n.V, n.D) * FS, A = 2 * 2 * (T.h + T.L) * 1.0, tau = P / A, Fs = 1500, ms = Fs / tau - 1;
    tag(mk('fuselage', 'ngear-ng30', 'NG-30 plates: 4-ply BID tapes onto F22 and the belly carry the whole nose-gear load (bond under the plate edges not counted)', lc, 'NG-30 edges', 'tape lap shear', ms, {
      formula: 'τ = FS·√(V² + D²) / (2 plates × 2 faces × (h_F22 + L_belly) × 1 in lap)',
      inputs: [['Plate height on F22', T.h, 'in', 'GEOMETRY'], ['Plate length on the belly', T.L, 'in', 'GEOMETRY'], ['Tape lap shear allowable', Fs, 'psi', `BOUND: secondary-bond BID tape lap shear, MGS L285 (typed from memory, × 0.8 hot-wet); MS ≥ 0 down to ${tau.toFixed(0)} psi`]],
      result: [['Tape shear (ult.)', tau, 'psi']] }), 'LEZ-32-201'); }
  // NG-3: two lateral AN4 through the strut at the deepest station; strut net section there
  { const u = BOLTS.ng3[0] / IN, { Mfa, Mlat: Ml, Nax } = strutMoments(n, u), q = secIn(u * IN), dh = 0.257, Ifa = q.b * (q.t ** 3 - dh ** 3) / 12, Zfa = Ifa / (q.t / 2), Zlat = (q.t - dh) * q.b * q.b / 6, An = (q.t - dh) * q.b, k = 0.9;
    const s = FS * Math.max(Mfa / (k * Zfa), Ml / (k * Zlat)) + FS * Nax / An, ms1 = MAT.sglass.F / s - 1, axial = pmax * 0.93, br = FS * axial / (2 * dh * q.b), ms2 = 60000 / br - 1;
    tag(mk('fuselage', 'ngear-ng3bolt', 'NG-3 attachment: 2 × AN4 through the strut (bearing along the fibres) and the strut net section at the bolt holes', lc, `strut ${(u * IN).toFixed(2)} in below the hinge`, ms1 < ms2 ? 'net section, S-glass' : 'bolt bearing', Math.min(ms1, ms2), {
      formula: 'σ = FS·(max(M_fa/Z_fa,net, M_lat/Z_lat,net)/0.9 + N/A_net), lateral Ø0.257 holes at the fore-aft centre;  bearing FS·0.93·P_link / (2·d·b)',
      inputs: [['Flexure allowable (UD S-glass/epoxy)', MAT.sglass.F, 'psi', `BOUND: S-glass UD flexure ≥ 150 ksi typical, 100 ksi after knock-downs (typed from memory); MS ≥ 0 down to ${s.toFixed(0)} psi`], ['Bearing along the fibres', 60000, 'psi', `BOUND: pin bearing (typed from memory); MS ≥ 0 down to ${br.toFixed(0)} psi`], ['Section at the bolts', `${q.t.toFixed(3)} × ${q.b.toFixed(3)} in`, 'text', 'SIZED']],
      result: [['Net-section stress (ult.)', s, 'psi'], ['Bolt bearing (ult.)', br, 'psi']] }), 'LEZ-32-204'); }
  // caster head: NG-4 spindle bending at its root, fork boss bushings, NG-4 socket bearing on the strut
  { const root = SP(E.Ls + NG4.plate), g = [E.AX[1], E.AX[2] - NG.R * IN], arm = root[2] - g[1], Mc = Math.max(...CS.map((k) => Math.hypot(k.Fs * arm + k.Fz * NG.trail * IN, k.S * arm))), Zs = Math.PI * (NG4.spR ** 4 - NG4.spRi ** 4) / (4 * NG4.spR), s = FS * Mc / Zs, ms1 = 90000 / s - 1;
    const Lb = E.crownU - FORK.crownR - (E.Ls + FORK.damper[1]), Fb = FS * Mc / Lb, br = Fb / (2 * NG4.spR * 0.5), ms2 = 30000 / br - 1, tt = secIn(E.Ls), pS = 6 * FS * Mc / (tt.t * NG4.L ** 2), ms3 = 20000 / pS - 1;
    tag(mk('fuselage', 'ngear-caster', 'Caster head: NG-4 spindle bending, fork boss bushings, NG-4 socket bearing on the strut tip', lc, 'fork head', 'spindle bending', Math.min(ms1, ms2, ms3), {
      formula: 'M = √((D·h)² + (S·h)²), h = spindle root to ground;  σ = FS·M/Z (4130 tube);  bushing couple FS·M/L_boss on 0.5 in each;  socket couple 6·FS·M/(t·L²) on the strut',
      inputs: [['Spindle', `${2 * NG4.spR} × ${(NG4.spR - NG4.spRi).toFixed(2)} 4130`, 'text', 'DESIGN'], ['4130 N F_tu', 90000, 'psi', 'MMPDS-typical'], ['Bronze bushing bearing', 30000, 'psi', `BOUND: SAE 660 bronze static bearing (typed from memory); MS ≥ 0 down to ${br.toFixed(0)} psi`], ['Transverse bearing on the strut', 20000, 'psi', BOUND_TR + `${pS.toFixed(0)} psi)`]],
      result: [['Moment at the spindle root (limit)', Mc, 'in·lb'], ['Spindle stress (ult.)', s, 'psi'], ['Bushing bearing (ult.)', br, 'psi'], ['Socket bearing (ult.)', pS, 'psi']] }), 'LEZ-32-204'); }
  // crank stop: the over-centre torque at DOWN on the housing lug
  { const rB = NG.r * IN, T = FS * pmax * rB * Math.sin((NG.beta + 1) * d2r), rT = Math.hypot((ARM.tab.f[0] + ARM.tab.f[1]) / 2 - E.A[1], (ARM.tab.z[0] + ARM.tab.z[1]) / 2 - E.A[2]), F = T / rT, Aa = (ARM.tab.y[1] - HOUSING.lug.y[0]) * (ARM.tab.z[1] - ARM.tab.z[0]), br = F / Aa, ms1 = 56000 / br - 1, ms2 = 2 * AN_SHEAR[3] / F - 1;
    tag(mk('fuselage', 'ngear-cstop', 'Crank stop at DOWN: NG-64 tab on the gearbox lug (over-centre torque under the aft load), lug bolts', lc, 'NG-64 tab / housing lug', 'bearing, 6061', Math.min(ms1, ms2), {
      formula: 'T = FS·P_link·r·sin(β + 1°);  F = T / r_tab;  bearing F / A_contact (6061 F_bry);  2 × AN3 lug bolts single shear',
      inputs: [['Link force (limit)', pmax, 'lb', 'MODEL'], ['Over-centre + rigging', NG.beta + 1, 'deg', 'DESIGN'], ['6061-T6 F_bry', 56000, 'psi', 'MMPDS-typical']], result: [['Stop torque (ult.)', T, 'in·lb'], ['Tab force (ult.)', F, 'lb'], ['Bearing (ult.)', br, 'psi']] }), 'LEZ-32-210'); }
  // down-stop: forward load beyond the link's preload (the stop has no gap), and the up-stop under the up-lock and 6 g
  { const fwd = CS.find((k) => /forward/.test(k.id)), Mf = Math.abs(fwd.M) * IN, armL = Mf / Math.abs(fwd.P), carry = NG.spring.k * NG.spring.pre * armL, rS = Math.abs((DSTOP.pad.n[0] + DSTOP.pad.n[1]) / 2), F = Math.max(0, FS * Mf - carry) / rS;
    const ms1 = 2 * AN_SHEAR[3] / Math.max(F, 1) - 1, br = F / ((DSTOP.pad.n[1] - DSTOP.pad.n[0]) * 2 * DSTOP.pad.y), ms2 = 3000 / Math.max(br, 1) - 1;
    tag(mk('fuselage', 'ngear-dstop', 'Down-stop: forward ground load beyond the spring-link preload, on the pad and the 2 × AN3 bar bolts', lc, 'NG-6 lip / down-stop', 'pad bearing', Math.min(ms1, ms2), {
      formula: 'F_stop = (FS·|M_fwd| − F_pre·arm_link) / r_stop (the stop has no gap: the link holds to its preload, the stop takes the rest);  pad bearing on urethane;  bar bolts single shear',
      inputs: [['Forward case hinge moment (23.499b, limit)', Mf, 'in·lb', 'FAR23'], ['Spring preload', NG.spring.k * NG.spring.pre, 'lb', 'DESIGN'], ['Urethane pad bearing', 3000, 'psi', `BOUND: 90A urethane, compression at 25 % strain (typed from memory); MS ≥ 0 down to ${br.toFixed(0)} psi`]],
      result: [['Stop force (ult.)', F, 'lb'], ['Pad bearing (ult.)', br, 'psi']] }), 'LEZ-32-202'); }
  { const Fpre = NG.spring.k * (NG.spring.pre + NG.uplockIn / IN * 0 + NG.uplockIn), Pul = Fpre, Cup = M(C_at(NG.phi1)), Bup = M(B_at(KIN.au)), e = [Cup[1] - Bup[1], Cup[2] - Bup[2]], L = Math.hypot(...e), rC = [Cup[1] - E.O[1], Cup[2] - E.O[2]], Mlk = Math.abs(rC[0] * e[1] / L - rC[1] * e[0] / L) * Pul;
    const Wg = 7.0, Mg = 6 * Wg * 17.0 / FS, rP = (USTOP.pad.u[0] + USTOP.pad.u[1]) / 2, F = (Mlk + FS * Mg) / rP, br = F / ((USTOP.pad.u[1] - USTOP.pad.u[0]) * 2 * USTOP.pad.y), ms = Math.min(3000 / br, 2 * AN_SHEAR[3] / F) - 1;
    tag(mk('fuselage', 'ngear-ustop', 'Up-stop: the up-lock spring squeeze plus 6 g ultimate on the stowed gear, on the pad and its 2 × AN3', lc, 'up-stop pad', 'pad bearing', ms, {
      formula: 'F = (P_uplock·arm_link + FS·n·W·r_cg) / r_pad;  pad bearing on urethane;  bar bolts single shear',
      inputs: [['Up-lock link force', Pul, 'lb', 'DESIGN'], ['Stowed load factor (ult. with FS)', 6, 'g', 'BOUND: 23.337 + 23.341 limit 4.4 g at most with gusts; 6 g ultimate used'], ['Swinging weight × CG arm', `${Wg} lb × 17.0 in`, 'text', 'BOUND: ≥ the defined parts (≈ 6.6 lb at 15 in)'], ['Urethane pad bearing', 3000, 'psi', `BOUND: 90A urethane (typed from memory); MS ≥ 0 down to ${br.toFixed(0)} psi`]],
      result: [['Pad force (ult.)', F, 'lb'], ['Pad bearing', br, 'psi']] }), 'LEZ-32-226'); }
  // nose bumper: parked kneeling on the skid (crank up, nose down), the forward-CG gross weight, 2 g bump on the ramp
  { const sB = 5.04 / IN, F = n.W * (GEO.gear.s - n.cg) / (GEO.gear.s - sB), Fu = FS * 2 * F, A = 2.88 * 1.44, br = Fu / A, ms = 500 / br - 1;
    tag(mk('fuselage', 'ngear-bumper', 'Nose bumper: parked kneeling at gross weight, 2 g ramp bump, on the skid and its inserts', lc, 'nose skid', 'skid bearing', ms, {
      formula: 'F = W·(s_main − cg)/(s_main − s_bumper);  FS·2·F on the skid area',
      inputs: [['Gross weight, forward CG', n.W, 'lb', 'MODEL'], ['Ramp bump factor', 2, 'g', 'BOUND: parked and taxied kneeling, typed; MS ≥ 0 up to ' + (2 * (ms + 1)).toFixed(1) + ' g'], ['Neoprene bearing', 500, 'psi', 'BOUND: 70A neoprene pad (typed from memory)']],
      result: [['Nose load parked', F, 'lb'], ['Skid bearing (ult.)', br, 'psi']] }), 'LEZ-32-225'); }
  return out;
});

// ------------------------------------------------------------------------------------------- system records: masses from the solids
import { primVolumes, primMass } from '../defn/e_prims.js';
export const E_FIXED_LB = { 'LEZ-32-205': () => coverSkin(), 'LEZ-32-201': () => plateTapes().lb, 'LEZ-32-210': () => GEARBOX_LB.housing, 'LEZ-32-207': () => 0 };
export const WHEEL_RHO = Object.fromEntries(Object.entries(WHEEL.lb).map(([g, m]) => [g, m / primVolumes(E_P['LEZ-32-207'])[g]]));
E_RHO['LEZ-32-207'] = WHEEL_RHO;
E_RHO['LEZ-32-210'].housing = GEARBOX_LB.housing / primVolumes(E_P['LEZ-32-210']).housing;
export const eMass = (pn, V = primVolumes(E_P[pn])) => primMass(V, E_RHO[pn]) + (pn === 'LEZ-32-205' ? coverSkin() : pn === 'LEZ-32-201' ? plateTapes().lb : 0);
for (const pn of Object.keys(E_P)) { const p = partByPN(pn); if (p) { p.massEach = +eMass(pn).toFixed(3); p.src = { ...(p.src || {}), mass: `GEOMETRY: the definition solid (${pn})` }; } }
// keep-out of the swing: from the NG-6 sweep forward edge and the S12 switch outboard of the link
defineKeepouts([]);
void GEO; void C_at; void linkForce; void hingeMoment; void TGT; void PANEL; void F22;
