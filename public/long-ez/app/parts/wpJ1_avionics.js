// WPJ1 — block J: the solids of every J part (vendor envelopes with their mounting features, harnesses and lines swept
// along their routes, the avionics shelf), their masses, the system records' geometry and mass taken from them, and the
// J checks: equipment mounting at the FAR 23.561 factors, the ELT mount at the TSO crash load, the shelf, RF link budgets
// per antenna, antenna spacing and ground planes, the Garmin CAN bus, the magnetometer site, pitot-static lag, drains and
// port symmetry, and EMC segregation. Solids are primitives for cad/blkB_prims.py (aircraft frame, in: x = BL, y = FS,
// z = WL). Vendor values carry their sources (research of 2026-11-19); what was not found stays a BOUND. Notional, not for construction.
import { GEO, registerChecks, mk, psi, allowB, BASE_MAT, FIXED, surfaceLoads, plyRF, laminate, wrinkling } from '../structures.js';
import { CS_PASS } from './wpC1_controls.js';
import { csParams } from '../defn/cs_spar.js';
import { plyWeight } from '../plybook.js';
import { PARTS, WIRES, EQUIP, partByPN, routes, defineParts } from '../systems.js';
import { groupVols, massFrom, tidy, RHO } from '../defn/blkB_prims.js';
import * as L from './wpJ0_layout.js';
import { LOADS } from './wpI1_power.js';

const r4 = (x) => Math.round(x * 1e4) / 1e4, IN_ = (n, v, u, s) => [n, v, u, s], TGT = 0.15;
export const P3 = (q) => [q[1], q[0], q[2]];   // [FS, BL, WL] in → prims frame [BL, FS, WL]
const P3ft = (q) => [q[1] * 12, q[0] * 12, q[2] * 12];
const box = (g, x0, x1, y0, y1, z0, z1) => ({ k: 'box', g, c: [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], d: [x1 - x0, y1 - y0, z1 - z0] });
const boxFS = (g, fs, bl, wl) => box(g, bl[0], bl[1], fs[0], fs[1], wl[0], wl[1]);   // ranges in [FS], [BL], [WL]
const cyl = (g, a, b, r, ri) => ({ k: 'cyl', g, a: P3(a), b: P3(b), r, ...(ri ? { ri } : {}) });
/** a route (ft, [FS, BL, WL]) as solid rods (or tubes) per segment, inches */
export const sweep = (g, pts, d, ri = 0) => pts.slice(1).map((q, i) => ({ k: 'cyl', g, a: P3ft(pts[i]), b: P3ft(q), r: d / 2, ...(ri ? { ri } : {}) })).filter((m) => Math.hypot(m.a[0] - m.b[0], m.a[1] - m.b[1], m.a[2] - m.b[2]) > 1e-3);
const routeOf = (pn, i) => routes().filter((r) => r.part === pn)[i];
const E = L.ENV, A = L.AXIS, PA = L.PANEL_AFT;

// ------------------------------------------------------------------------------------------- panel equipment
export function axisPrims() {
  const b = E.axis.bezel, c = L.AXIS_C, o = [];
  o.push(boxFS('unit', [PA, PA + b[1]], [c[0] - b[0] / 2, c[0] + b[0] / 2], [c[1] - b[2] / 2, c[1] + b[2] / 2]));
  o.push(boxFS('unit', [A.collarFwd, PA], A.bl, [A.bot, A.top]));
  o.push(boxFS('unit', [A.canFwd, A.collarFwd], A.bl, [A.canBot, A.top]));
  for (const k of ['J1', 'J2']) { const j = L.AXIS_J[k]; o.push(boxFS('conn', [j[0] - 0.5, j[0] + 0.5], [j[1] - 0.9, j[1] + 0.9], [j[2] - 0.35, j[2] + 0.35])); }
  for (const k of ['J3', 'J4']) { const j = L.AXIS_J[k]; o.push(cyl('conn', [j[0] - 0.5, j[1], j[2]], [j[0] + 0.5, j[1], j[2]], 0.29)); }
  return tidy(o);
}
export function g5Prims() {
  const b = E.g5.bezel, c = L.G5_C, can = E.g5.can;
  return tidy([boxFS('unit', [PA, PA + b[1]], [c[0] - b[0] / 2, c[0] + b[0] / 2], [c[1] - b[2] / 2, c[1] + b[2] / 2]),
    cyl('unit', [PA - can.L, c[0], c[1]], [PA, c[0], c[1]], can.d / 2),
    boxFS('conn', [PA - can.L - 0.45, PA - can.L], [c[0] - 0.5, c[0] + 0.5], [c[1] - 1.05, c[1] - 0.35])]);   // J51 9-pin D-sub with a low-profile 90° backshell, 0.45 in (rev C; BOUND, size the backshell on receipt)
}
export function warnPrims() { const f = E.warn.face, b = E.warn.body, c = L.WARN_C;
  return tidy([boxFS('unit', [PA, PA + f[1]], [c[0] - f[0] / 2, c[0] + f[0] / 2], [c[1] - f[2] / 2, c[1] + f[2] / 2]), boxFS('unit', [PA - b[1], PA], [c[0] - b[0] / 2, c[0] + b[0] / 2], [c[1] - b[2] / 2, c[1] + b[2] / 2])]); }
export const SW_X = Array.from({ length: E.sw.n }, (_, i) => r4(L.SW_C[0] + (i - (E.sw.n - 1) / 2) * E.sw.pitch));
export function swPrims() { const p = E.sw.plate, b = E.sw.body, c = L.SW_C, o = [boxFS('plate', [PA, PA + p[1]], [c[0] - p[0] / 2, c[0] + p[0] / 2], [c[1] - p[2] / 2, c[1] + p[2] / 2])];
  for (const x of SW_X) { o.push(boxFS('switch', [PA - b[1], PA - 0.43], [x - b[0] / 2, x + b[0] / 2], [c[1] - b[2] / 2, c[1] + b[2] / 2])); o.push(cyl('switch', [PA - 0.43, x, c[1]], [PA + 0.40, x, c[1]], 0.2344)); o.push(cyl('switch', [PA + 0.40, x, c[1]], [PA + 0.95, x, c[1] + 0.10], 0.06)); }
  return tidy(o); }
export function eltRemotePrims() { const f = E.eltRemote.face, b = E.eltRemote.body, c = L.ELTR_C;
  return [boxFS('remote', [PA, PA + f[1]], [c[0] - f[0] / 2, c[0] + f[0] / 2], [c[1] - f[2] / 2, c[1] + f[2] / 2]), boxFS('remote', [PA - b[1], PA], [c[0] - b[0] / 2, c[0] + b[0] / 2], [c[1] - b[2] / 2, c[1] + b[2] / 2])]; }

// ------------------------------------------------------------------------------------------- the shelf and the remote units
/** the shelf outline at its mid-plane: the inner wall less 0.12 in (flox gap) each side, from FS 30.9 to 36.6, cut to ±8.1 */
export const shelfPoly = () => { const z = L.SHELF.bot + L.SHELF.t / 2, n = 6, pts = [];
  for (let i = 0; i <= n; i++) { const fs = L.SHELF.fs[0] + (L.SHELF.fs[1] - L.SHELF.fs[0]) * i / n; pts.push([r4(Math.min(L.SHELF.bl[1], L.halfW(fs, z, L.SHELL) - 0.12)), r4(fs)]); }
  return [...pts, ...pts.slice().reverse().map(([y, s]) => [-y, s])]; };
/** holes where lines pass through the shelf (generated from the routes crossing its mid-plane inside the outline) */
export function shelfHoles() {
  const z = (L.SHELF.bot + L.SHELF.t / 2) / 12, poly = shelfPoly(), out = [];
  const inside = (q) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a[1] > q[1]) !== (b[1] > q[1]) && q[0] < (b[0] - a[0]) * (q[1] - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
  for (const r of routes()) for (let i = 1; i < r.pts.length; i++) { const a = r.pts[i - 1], b = r.pts[i]; if ((a[2] - z) * (b[2] - z) >= 0) continue; const t = (z - a[2]) / (b[2] - a[2]), q = [(a[1] + t * (b[1] - a[1])) * 12, (a[0] + t * (b[0] - a[0])) * 12]; if (inside(q)) out.push({ c: q.map(r4), r: r4(Math.ceil(((r.dIn || 0.25) / 2 + 0.125) * 16) / 16), pn: r.part }); }
  return out;
}
export function shelfPrims() {
  const S = L.SHELF, tf = S.nBID * BASE_MAT.BID.t, pts = shelfPoly(), holes = shelfHoles().map((h) => ({ c: h.c, r: h.r }));
  const ex = (g, u0, u1) => ({ k: 'ext', g, ax: 'z', u0: r4(u0), u1: r4(u1), pts, holes });
  const o = [ex('face', S.bot, S.bot + tf), ex('core', S.bot + tf, S.top - tf), ex('face', S.top - tf, S.top)];
  for (const sg of [-1, 1]) { const y = sg * (Math.min(...pts.filter((q) => q[0] > 0).map((q) => q[0]))); o.push(boxFS('tape', [S.fs[0] + 0.3, S.fs[1] - 0.3], sg > 0 ? [y - 1.0, y] : [y, y + 1.0], [S.top, S.top + 2 * tf])); }
  return tidy(o);
}
export function gtxPrims() { const b = E.gtx.box, z0 = L.SHELF.top; return tidy([boxFS('unit', L.GTX_AT.fs, L.GTX_AT.bl, [z0 + 0.06, z0 + b[2]]), boxFS('rack', L.GTX_AT.fs, L.GTX_AT.bl, [z0, z0 + 0.06]),
  cyl('conn', [L.GTX_AT.fs[0] + 1.6, L.GTX_AT.bl[1], z0 + 0.6], [L.GTX_AT.fs[0] + 1.6, L.GTX_AT.bl[1] + 0.6, z0 + 0.6], 0.29), cyl('conn', [L.GTX_AT.fs[0] - 0.6, 1.6, z0 + 0.75], [L.GTX_AT.fs[0], 1.6, z0 + 0.75], 0.29)]); }
export function gsuPrims() { const b = E.gsu.box, z0 = L.SHELF.top; return tidy([boxFS('unit', L.GSU_AT.fs, L.GSU_AT.bl, [z0, z0 + b[2]]), boxFS('conn', [L.GSU_AT.fs[0] - 0.6, L.GSU_AT.fs[0]], [L.GSU_AT.bl[0] + 0.4, L.GSU_AT.bl[1] - 0.4], [z0 + 0.5, z0 + 1.1]),
  ...[L.PSI.adP, L.PSI.adS].map((p) => cyl('port', [L.GSU_AT.fs[1], p[1], p[2]], [L.GSU_AT.fs[1] + 0.25, p[1], p[2]], 0.15))]); }

// ------------------------------------------------------------------------------------------- remote sensors and antennas
export const GMU_BRKT = { t: 0.040, w: 3.8, l: 2.9 };   // 2024-T3 0.040 base 3.8 × 2.9 in under the 3.78 × 2.74 in GMU 11 (rev C; was 3.6 × 2.6, shorter than the unit), on a G10 pad in the core pocket; Garmin asks only for rigid, non-magnetic structure (G5 IM App. D.4); the nearest published figure is 0.040 in minimum for the GMU 44 platform (Garmin 190-01051-00 rev D p. 1-51)
export function gmuPrims() { const b = E.gmu.box, c = L.MAG_AT, z0 = c[2] - b[2] / 2;
  return tidy([boxFS('unit', [c[0] - b[1] / 2, c[0] + b[1] / 2], [c[1] - b[0] / 2, c[1] + b[0] / 2], [z0, z0 + b[2]]), boxFS('al', [c[0] - GMU_BRKT.l / 2, c[0] + GMU_BRKT.l / 2], [c[1] - GMU_BRKT.w / 2, c[1] + GMU_BRKT.w / 2], [z0 - GMU_BRKT.t, z0])]); }
export function gtpPrims() { const o = L.POS.OAT.map((v) => v * 12), g = E.gtp; return tidy([cyl('unit', [o[0], o[1], o[2] + L.SHELL + 0.25], [o[0], o[1], o[2]], g.shank / 2), cyl('unit', [o[0], o[1], o[2]], [o[0], o[1], o[2] - g.L], g.probe / 2), cyl('nut', [o[0], o[1], o[2] + L.SHELL], [o[0], o[1], o[2] + L.SHELL + 0.20], 0.28, 0.19)]); }
/** a ground plane conformed to the inner skin: strips 1 in wide along FS, each at the skin's local WL (top or belly) */
// (ICD phase 2: the strips were flat over the plane's whole FS length, so on the sloping deck and turtleback they stood up
// to 2.1 in into the skin or 0.3 in off it; they are now 1 × 1 in facets, each at the skin's WL at its centre)
export const GP_STEP = 1.0;
function plane(g, R, side, t = 0.016) { const o = []; for (let f = R[0]; f < R[1] - 1e-9; f += GP_STEP) for (let y = R[2]; y < R[3] - 1e-9; y += GP_STEP) { const f1 = Math.min(R[1], f + GP_STEP), y1 = Math.min(R[3], y + GP_STEP), ym = (y + y1) / 2, fm = (f + f1) / 2, z = side > 0 ? L.topAt(fm, ym, L.SHELL) : L.botAt(fm, ym, L.SHELL);
  o.push(boxFS(g, [f, f1], [y, y1], side > 0 ? [z - t, z] : [z, z + t])); } return o; }
export function ga35Prims(which) { const at = which === 'S' ? L.GA35S_AT : L.GA35_AT, b = E.ga35.body, R = which === 'S' ? L.GP.ga35s : L.GP.ga35;
  return tidy([boxFS('unit', [at[0] - b[1] / 2, at[0] + b[1] / 2], [at[1] - b[0] / 2, at[1] + b[0] / 2], [at[2], at[2] + b[2]]), cyl('conn', [at[0], 0, at[2]], [at[0], 0, at[2] - L.SHELL - 0.6], 0.29), ...plane('plane', R, 1)]); }
export function bladePrims() { const at = L.BLADE_AT, b = E.blade;
  return tidy([boxFS('unit', [at[0] - b.base[1] / 2, at[0] + b.base[1] / 2], [at[1] - b.base[0] / 2, at[1] + b.base[0] / 2], [at[2] - b.base[2], at[2]]), boxFS('unit', [at[0] - b.fin[1] / 2, at[0] + b.fin[1] / 2], [at[1] - b.fin[0] / 2, at[1] + b.fin[0] / 2], [at[2] - b.base[2] - b.fin[2], at[2] - b.base[2]]),
    cyl('conn', [at[0], at[1], at[2]], [at[0], at[1], at[2] + L.SHELL + 0.7], 0.29), ...plane('plane', L.GP.blade, -1)]); }
/** a radial strip on the inner skin (top): from the base along heading h (deg from forward, plan) for along-skin length Ls,
 *  as 1 in × w facets at the skin's WL; returns the facets and the along-skin length reached inside the bounds R */
export function radial(at, h, Ls, w, R, t = 0.003) { const o = [], u = [Math.cos(h * Math.PI / 180), Math.sin(h * Math.PI / 180)]; let f = at[0], y = at[1], z = L.topAt(f, y, L.SHELL), run = 0;
  while (run < Ls - 1e-9) { const st = Math.min(0.25, Ls - run), f1 = f + u[0] * st, y1 = y + u[1] * st; if (f1 < R[0] || f1 > R[1] || y1 < R[2] || y1 > R[3]) break; const z1 = L.topAt(f1, y1, L.SHELL), ds = Math.hypot(f1 - f, y1 - y, z1 - z);
    if (run + ds > Ls + 1e-9) break; o.push({ f0: f, f1, y0: y, y1, z: (z + z1) / 2 }); run += ds; f = f1; y = y1; z = z1; }
  const facets = []; for (let i = 0; i < o.length; i += 2) { const q = o.slice(i, i + 2), w2 = Math.min(w, 0.95 - 0.5 * Math.abs(u[0]) - 0.5 * Math.abs(u[1])), fs = [Math.min(...q.map((k) => Math.min(k.f0, k.f1))), Math.max(...q.map((k) => Math.max(k.f0, k.f1)))], ys = [Math.min(...q.map((k) => Math.min(k.y0, k.y1))), Math.max(...q.map((k) => Math.max(k.y0, k.y1)))], zm = L.topAt((fs[0] + fs[1]) / 2, (ys[0] + ys[1]) / 2, L.SHELL);
    const df = Math.abs(u[1]) * w2 / 2, dy = Math.abs(u[0]) * w2 / 2; facets.push(boxFS('plane', [fs[0] - df, fs[1] + df], [ys[0] - dy, ys[1] + dy], [zm - t, zm])); }
  return { facets, reach: run }; }
export const whipRadials = () => { const W = L.WHIP_RADIALS; return Array.from({ length: W.n }, (_, i) => radial(L.WHIP_AT, W.from + i * 360 / W.n, W.L + 0.5, W.w, L.GP.whip)); };
export function whipPrims() { const at = L.WHIP_AT, w = E.whip, s = w.sweep * Math.PI / 180;
  return tidy([boxFS('unit', [at[0] - w.base[1] / 2, at[0] + w.base[1] / 2], [-w.base[0] / 2, w.base[0] / 2], [at[2], at[2] + w.base[2]]), cyl('unit', [at[0], 0, at[2] + w.base[2]], [at[0] + w.L * Math.sin(s), 0, at[2] + w.base[2] + w.L * Math.cos(s)], 0.09),
    cyl('conn', [at[0], 0, at[2]], [at[0], 0, at[2] - L.SHELL - 0.7], 0.29), ...whipRadials().flatMap((r) => r.facets)]); }
/** ELT on its tray on a 6061 angle bracket screwed to A's four inserts on LEZ-53-175's aft face (FS 130.2 + 0.21) */
export const ELT_BRKT = { t: 0.25, leg: 2.6, w: 3.4, shelfL: 8.0, face: 104.7 + 0.215 };   // rev C: shelf leg 8.0 in under the 7.75 in ELT, 0.25 in thick (DO-204 stiffness)
export function eltPrims() { const b = E.elt.box, c = L.ELT_C, K = ELT_BRKT, Z = L.ELT_Z, z0 = Z - K.t;
  return tidy([boxFS('unit', L.ELT_FS, [c[1] - b[0] / 2, c[1] + b[0] / 2], [Z + E.elt.tray, Z + b[2]]), boxFS('tray', L.ELT_FS, [c[1] - b[0] / 2, c[1] + b[0] / 2], [Z, Z + E.elt.tray]),
    boxFS('al', [K.face, K.face + K.t], [c[1] - K.w / 2, c[1] + K.w / 2], [z0, z0 + K.leg + K.t]), boxFS('al', [K.face, K.face + K.shelfL], [c[1] - K.w / 2, c[1] + K.w / 2], [z0, z0 + K.t]), ...eltRemotePrims()]); }

// ------------------------------------------------------------------------------------------- the COM dipole, lines and harnesses
export function dipolePrims() { const D = L.DIPOLE, r = 0.022;   // copper foil 0.5 × 0.003 in as a rod of equal section
  return [cyl('cu', L.finPt(D.h0), L.finPt(D.hFeed - 0.25), r), cyl('cu', L.finPt(D.hFeed + 0.25), L.finPt(D.h1), r), cyl('ferrite', L.finPt(D.choke[0]), L.finPt(D.choke[1]), 0.22, 0.10)]; }
const RG400 = { od: 0.195, lbft: 0.05 };   // RG-400 OD 0.195 ± 0.005 in and 0.05 lb/ft maximum (MIL-DTL-17/128B amd 2, repeater-builder.com mirror, accessed 2026-11-19)
export const coaxPrims = (pn, idx, g = 'coax') => idx.flatMap((i) => sweep(g, routeOf(pn, i).pts, RG400.od));
export const NYLON = { od: 0.25, wall: 0.030, rho: RHO.nylon };   // Nylaflow 1/4 in standard wall, ID 0.190 (0.030 wall), 1000 psi (Aircraft Spruce 05-00115, accessed 2026-11-19)
export function linePrims() { return tidy(routes().filter((r) => r.part === 'LEZ-34-130').flatMap((r) => sweep('tube', r.pts, NYLON.od, NYLON.od / 2 - NYLON.wall))); }
export function harnessPrims(pn) { return tidy(routes().filter((r) => r.part === pn).flatMap((r) => sweep('bundle', r.pts, r.dIn || 0.25))); }

// ------------------------------------------------------------------------------------------- pitot mast, static ports, tees, jacks
export function pitotPrims() { const t = L.PITOT_TIP_IN; return tidy([cyl('al', [-4.2, 0, t[2]], [t[0] - 0.8, 0, t[2]], 0.25, 0.09), cyl('al', [t[0] - 0.8, 0, t[2]], t, 0.125), cyl('brass', t, [t[0] + 0.15, 0, t[2]], 0.16)]); }
export function staticPrims() { const o = []; for (const sg of [-1, 1]) { const p = L.STATIC_IN(sg), b = L.staticRoute(sg)[0];
  o.push(cyl('al', p, [p[0], sg * (Math.abs(p[1]) - L.SHELL), p[2]], 0.25), cyl('al', [p[0], sg * (Math.abs(p[1]) - L.SHELL), p[2]], b, 0.30), cyl('al', [b[0], b[1], b[2]], [b[0], b[1], b[2] - 0.9], 0.20)); } return tidy(o); }
export function teePrims() { const T = L.PSI, o = [];
  for (const [a, b] of [[T.ptIn, T.ptTest], [T.st1L, T.st1R], [T.st2In, T.stTest]]) o.push(cyl('brass', [a[0], a[1], a[2]], [b[0], b[1] + (b[1] === a[1] ? 0.01 : 0), b[2]], 0.19));
  return tidy(o); }
const jackAt = (ref) => EQUIP.find((e) => e.ref === ref)?.at.map((v) => v * 12);
export function jackPrims() { const o = []; for (const ref of ['J101', 'J102', 'J103', 'J104']) { const p = jackAt(ref), dy = /10[13]/.test(ref) ? -0.35 : 0.35; o.push(cyl('jack', [p[0] + dy, p[1], p[2] + 0.4], [p[0] + dy, p[1], p[2] - 0.8], 0.25)); }
  const s = EQUIP.find((e) => e.ref === 'S10').at.map((v) => v * 12); o.push(cyl('jack', s, [s[0] - 0.6, s[1], s[2]], 0.19)); return tidy(o); }

// ------------------------------------------------------------------------------------------- the masses
export const VENDOR = { 'LEZ-31-110': E.axis.mass, 'LEZ-31-130': E.g5.mass, 'LEZ-31-120': E.gsu.mass, 'LEZ-31-122': E.gmu.mass, 'LEZ-31-124': E.gtp.mass, 'LEZ-34-100': E.gtx.mass, 'LEZ-34-112': E.ga35.mass, 'LEZ-34-114': E.ga35.mass + 0.03, 'LEZ-34-110': E.blade.mass, 'LEZ-25-161': E.whip.mass, 'LEZ-25-160': E.elt.mass, 'LEZ-31-150': E.warn.mass };
/** density of a vendor group: the vendor's mass (typed) over the envelope's volume, so the solid carries the vendor mass */
export const effRho = (prims, g, m) => m / (groupVols(prims)[g] || 1);
const AL = RHO.al, CU = 0.323, FERR = 0.18, BRASS = 0.307, PVC = BASE_MAT.PVC.rho * 62.43 / 1728, BID_RHO = plyWeight('BID', 1, 1) / 144 / BASE_MAT.BID.t;
const wireMass = (pn) => partByPN(pn)?.massEach || 0;   // the wire list (wp7) × 1.15 for terminals and ties
export const JP = {};   // pn → { prims(), rho, feat }
const def = (pn, prims, rho, feat) => { JP[pn] = { prims, rho, feat }; };
def('LEZ-31-110', axisPrims, () => ({ unit: effRho(axisPrims(), 'unit', E.axis.mass - 0.25), conn: 0.25 / (groupVols(axisPrims()).conn || 1) }), { unit: 'body', conn: 'conn' });
def('LEZ-31-130', g5Prims, () => ({ unit: effRho(g5Prims(), 'unit', E.g5.mass - 0.06), conn: 0.06 / groupVols(g5Prims()).conn }), { unit: 'body', conn: 'conn' });
def('LEZ-31-150', warnPrims, () => ({ unit: effRho(warnPrims(), 'unit', E.warn.mass) }), { unit: 'body' });
def('LEZ-31-140', swPrims, () => ({ plate: AL, switch: 8 * E.sw.mass / groupVols(swPrims()).switch }), { plate: 'plate', switch: 'switch' });
def('LEZ-31-120', gsuPrims, () => ({ unit: effRho(gsuPrims(), 'unit', E.gsu.mass - 0.05), conn: 0.04 / groupVols(gsuPrims()).conn, port: BRASS }), { unit: 'body', conn: 'conn', port: 'port' });
def('LEZ-34-100', gtxPrims, () => ({ unit: effRho(gtxPrims(), 'unit', E.gtx.mass - 0.25), rack: AL, conn: 0.06 / groupVols(gtxPrims()).conn }), { unit: 'body', rack: 'rack', conn: 'conn' });
def('LEZ-31-122', gmuPrims, () => ({ unit: effRho(gmuPrims(), 'unit', E.gmu.mass), al: 0.100 }), { unit: 'body', al: 'bracket' });
def('LEZ-31-124', gtpPrims, () => ({ unit: effRho(gtpPrims(), 'unit', E.gtp.mass), nut: 0.286 }), { unit: 'body', nut: 'nut' });
def('LEZ-34-112', () => ga35Prims('F'), () => ({ unit: effRho(ga35Prims('F'), 'unit', E.ga35.mass), conn: BRASS * 0.5, plane: AL }), { unit: 'body', conn: 'conn', plane: 'plane' });
def('LEZ-34-114', () => ga35Prims('S'), () => ({ unit: effRho(ga35Prims('S'), 'unit', E.ga35.mass + 0.03), conn: BRASS * 0.5, plane: AL }), { unit: 'body', conn: 'conn', plane: 'plane' });
def('LEZ-34-110', bladePrims, () => ({ unit: effRho(bladePrims(), 'unit', E.blade.mass), conn: BRASS * 0.5, plane: AL }), { unit: 'body', conn: 'conn', plane: 'plane' });
def('LEZ-25-161', whipPrims, () => ({ unit: effRho(whipPrims(), 'unit', E.whip.mass), conn: BRASS * 0.5, plane: CU }), { unit: 'whip', conn: 'conn', plane: 'plane' });
def('LEZ-25-160', eltPrims, () => ({ unit: effRho(eltPrims(), 'unit', 1.6), tray: 0.2 / groupVols(eltPrims()).tray, al: AL, remote: E.eltRemote.mass / groupVols(eltPrims()).remote }), { unit: 'elt', tray: 'tray', al: 'bracket', remote: 'remote' });
def('LEZ-31-160', shelfPrims, () => ({ face: BID_RHO, core: PVC, tape: BID_RHO }), { face: 'shelf', core: 'shelf', tape: 'tape' });
def('LEZ-34-120', pitotPrims, () => ({ al: AL, brass: BRASS }), { al: 'mast', brass: 'barb' });
def('LEZ-34-130', linePrims, () => ({ tube: NYLON.rho }), { tube: 'line' });
def('LEZ-34-132', staticPrims, () => ({ al: AL }), { al: 'port' });
def('LEZ-34-135', teePrims, () => ({ brass: BRASS }), { brass: 'tee' });
def('LEZ-23-120', jackPrims, () => ({ jack: 0.25 / groupVols(jackPrims()).jack }), { jack: 'jack' });
const harn = (pn, coaxIdx = null, extra = () => []) => {
  const pr = () => { const rs = routes().filter((r) => r.part === pn); return tidy([...rs.flatMap((r, i) => sweep(coaxIdx && coaxIdx.includes(i) ? 'coax' : 'bundle', r.pts, coaxIdx && coaxIdx.includes(i) ? RG400.od : (r.dIn || 0.25))), ...extra()]); };
  def(pn, pr, () => { const v = groupVols(pr()), mx = extra().length ? massFrom(groupVols(extra()), { cu: CU, ferrite: FERR, conn: BRASS * 0.5 }) : 0, lin = (v.coax || 0) + (v.bundle || 0), k = (wireMass(pn) - mx) / lin;
    return { coax: k, bundle: k, cu: CU, ferrite: FERR, conn: BRASS * 0.5 }; }, { coax: 'coax', bundle: 'harness', cu: 'element', ferrite: 'choke', conn: 'conn' }); };
const discPrim = (p, r) => [cyl('conn', [p[0], p[1] - 0.8, p[2]], [p[0], p[1] + 0.8, p[2]], r)];
harn('LEZ-34-111', [0, 1, 2]);
harn('LEZ-23-110', [0], () => [...dipolePrims(), ...discPrim(L.DISC.com, 0.29)]);
harn('LEZ-25-162', [0]);
harn('LEZ-23-125');
harn('LEZ-31-121', null, () => discPrim(L.DISC.mag, 0.36));
export const jParams = (pn) => { const D = JP[pn], prims = D.prims(); return { prims, feat: D.feat, holes: pn === 'LEZ-31-160' ? shelfHoles().map((h) => ({ feat: 'hole', x: h.c[0], y: h.c[1], r: h.r })) : [] }; };
export const jRho = (pn) => JP[pn].rho();
export const jMass = (pn) => massFrom(groupVols(JP[pn].prims()), jRho(pn));

// ------------------------------------------------------------------------------------------- the shelf as a system part
defineParts([{ pn: 'LEZ-31-160', name: 'Avionics shelf over the pedals (GTX 45R, GSU 25C, GEA 24, pitot-static tees)', kind: 'laminate', ata: 31, nha: 'LEZ-31-100', massItem: 'panel', massEach: 0.5,
  geo: [{ t: 'box', c: [(L.SHELF.fs[0] + L.SHELF.fs[1]) / 24, 0, (L.SHELF.bot + L.SHELF.top) / 24], d: [(L.SHELF.fs[1] - L.SHELF.fs[0]) / 12, 16.2 / 12, L.SHELF.t / 12] }],
  blurb: 'A flat 1 × 6781 / 1/4 in HT61 / 1 × 6781 shelf across the nose under the deck, above the pedals and their horns, taped to the shell inner wall both sides: it carries the transponder, the ADAHRS, the engine interface and the pitot-static tees, reached through the display cut-out.',
  steps: [{ title: 'Lay up flat, cut to the template with the line holes; tape to the inner wall with 2 × 6781 each side; pot the unit inserts', inspect: ['Shelf level within 0.5° (the GSU 25C sits on it)', 'Every line hole grommeted'] }], src: { mass: 'GEOMETRY: the definition solid (LEZ-31-160)' } }]);

// ------------------------------------------------------------------------------------------- system records follow the solids
const ftBox = (m) => ({ t: 'box', c: [m.c[1] / 12, m.c[0] / 12, m.c[2] / 12], d: [m.d[1] / 12, m.d[0] / 12, m.d[2] / 12] });
const ftCyl = (m) => ({ t: 'cyl', a: [m.a[1] / 12, m.a[0] / 12, m.a[2] / 12], b: [m.b[1] / 12, m.b[0] / 12, m.b[2] / 12], r: m.r / 12 });
const disp = (pn, ext = false) => JP[pn].prims().filter((m) => m.k === 'box' || m.k === 'cyl').map((m) => ({ ...(m.k === 'box' ? ftBox(m) : ftCyl(m)), ...(ext ? { external: true } : {}) }));
for (const pn of Object.keys(JP)) { const p = partByPN(pn); if (!p) continue; p.massEach = +(jMass(pn) / (p.qty || 1)).toFixed(4); p.src = { ...p.src, mass: `GEOMETRY: the definition solid (${pn})` }; }
// display geometry of the bought-in units = their envelopes (paths stay the routes); antennas, the OAT probe, the mast and the static ports marked external where they stand on or outside the OML
for (const [pn, ext] of [['LEZ-31-110', false], ['LEZ-31-130', false], ['LEZ-31-150', false], ['LEZ-31-140', false], ['LEZ-31-120', false], ['LEZ-34-100', false], ['LEZ-31-122', false], ['LEZ-31-124', true], ['LEZ-34-112', true], ['LEZ-34-114', true], ['LEZ-34-110', true], ['LEZ-25-161', true], ['LEZ-34-132', true], ['LEZ-34-135', false]]) {
  const p = partByPN(pn); if (!p) continue; const keep = p.geo.filter((g) => g.t === 'path'), g = disp(pn, ext).filter((q) => !(q.t === 'cyl' && (pn === 'LEZ-31-130' || pn === 'LEZ-31-140')));   // rods through the panel plane would read as lines to B's hole table
  if (pn === 'LEZ-31-130') g.push({ t: 'box', c: [(PA - E.g5.can.L / 2) / 12, L.G5_C[0] / 12, L.G5_C[1] / 12], d: [E.g5.can.L / 12, 3.0 / 12, 3.0 / 12] });   // the can as a box for the 3D view (the solid is round)
  p.geo = [...g, ...keep];
}
{ const p = partByPN('LEZ-25-160'); if (p) p.geo = disp('LEZ-25-160'); }
{ const p = partByPN('LEZ-34-120'); if (p) p.geo = [{ t: 'cyl', a: [-4.2 / 12, 0, L.PITOT_TIP_IN[2] / 12], b: L.POS.PITOT_TIP, r: 0.25 / 12 }]; }
for (const pn of ['LEZ-23-110']) { const p = partByPN(pn); if (p) p.geo = [...p.geo.filter((g) => g.t === 'path'), ...dipolePrims().map(ftCyl).map((q) => ({ ...q, external: true }))]; }
{ const p = partByPN('LEZ-31-130'); if (p) { p.faces = [{ draw: 'g5', c: [3.432, L.G5_C[0] / 12, L.G5_C[1] / 12], w: E.g5.bezel[0] / 12, h: E.g5.bezel[2] / 12 }]; } }
{ const p = partByPN('LEZ-31-110'); if (p) p.faces = [{ draw: 'axis', c: [3.432, L.AXIS_C[0] / 12, L.AXIS_C[1] / 12], w: E.axis.bezel[0] / 12, h: E.axis.bezel[2] / 12 }]; }
{ const p = partByPN('LEZ-25-160'); if (p) p.faces = [{ draw: 'elt', c: [3.432, L.ELTR_C[0] / 12, L.ELTR_C[1] / 12], w: E.eltRemote.face[0] / 12, h: E.eltRemote.face[2] / 12 }]; }

// ------------------------------------------------------------------------------------------- checks
const B = (v, why) => `BOUND: ${why}`;
const row = (pn, id, name, lc, where, mode, ms, formula, inputs, result) => Object.assign(mk('fuselage', id, name, lc, where, mode, ms, { formula, inputs, result }), { sys: pn });
/** equipment mounting: n fasteners in single shear under the item's inertia at the FAR 23.561 factors (items of mass, the
 *  forward factor 18 g typed from memory) with the 1.15 fitting factor; the insert or nutplate shear-out in the host */
export const MOUNT = {
  'LEZ-31-110': { n: 4, scr: '#8-32 into MS21047 nutplates in the panel\'s flox hard edge', Ps: 1300, host: 'panel flox edge', Ph: () => psi(1) * 0 + 0 },
};
const FAC = { fwd: 18.0, up: 3.0, side: 4.5, down: 6.0 };   // FAR 23.561(b)(3) items of mass 18 / 4.5 / 3 g, (b)(2)(iv) 6 g down (14 CFR Part 23, 1-1-11 edition, pre-Amdt 23-64, confirmed 2026-11-19; ASTM F3083-23a 4.1.2.3 the same)
const SCREW = { '#4': 450, '#6': 800, '#8': 1300, '#10': 2000 };   // alloy-steel machine screw single shear: BOUND (range; AC 43.13-1B ch. 4 Table 4-9 notes checked, values kept, second research pass)
export const MOUNTS = [
  { pn: 'LEZ-31-130', id: 'jm-g5', w: () => jMass('LEZ-31-130'), n: 3, scr: '#6', host: { kind: 'nut', D: 0.25, t: 0.43 }, what: 'G5: 3 × #6-32 pan head into its mounting ring 115-02251-03 (G5 IM sec. 3.6)' },
  { pn: 'LEZ-31-150', id: 'jm-warn', w: () => jMass('LEZ-31-150'), n: 2, scr: '#4', host: { kind: 'nut', D: 0.20, t: 0.43 }, what: 'warning unit: 2 × #4-40 into nutplates' },
  { pn: 'LEZ-31-140', id: 'jm-sw', w: () => jMass('LEZ-31-140'), n: 4, scr: '#6', host: { kind: 'nut', D: 0.25, t: 0.43 }, what: 'switch sub-panel: 4 × #6-32 into nutplates (the toggles\' bushing nuts clamp the plate)' },
  { pn: 'LEZ-34-100', id: 'jm-gtx', w: () => jMass('LEZ-34-100'), n: 4, scr: '#8', host: { kind: 'insert', D: 0.50, t: L.SHELF.t }, what: 'GTX 45R mount: 4 × #8-32 into Ø 0.5 flox-potted inserts in the shelf (fastener size BOUND: GTX 45R outline not read)' },
  { pn: 'LEZ-31-120', id: 'jm-gsu', w: () => jMass('LEZ-31-120'), n: 4, scr: '#10', host: { kind: 'insert', D: 0.50, t: L.SHELF.t }, what: 'GSU 25C: 4 × AN3-7A (#10), 20–25 in-lb, into Ø 0.5 flox-potted inserts in the shelf (G3X IM Fig. 17-5 notes)' },
  { pn: 'LEZ-31-122', id: 'jm-gmu', w: () => jMass('LEZ-31-122'), n: 4, scr: '#6', host: { kind: 'insert', D: 0.50, t: 0.50 }, what: 'GMU 11: 4 × 6-32 × 0.500 pan-head 300-series stainless (non-magnetic, Garmin kit 011-04349-90) into flox inserts in the G10 pocket base' },
  { pn: 'LEZ-34-112', id: 'jm-ga35', w: () => jMass('LEZ-34-112'), n: 4, scr: '#8', host: { kind: 'nut', D: 0.25, t: L.SHELL }, what: 'GA 35S (forward, for the GTX): 4 × #8-32 × 1.00 SS pan head through the deck into nutplates on a 2-ply doubler (GA 35S IM Table 3-1)' },
  { pn: 'LEZ-34-114', id: 'jm-ga35s', w: () => jMass('LEZ-34-114'), n: 4, scr: '#8', host: { kind: 'nut', D: 0.25, t: L.SHELL }, what: 'GA 35S (aft, for the AXIS): 4 × #8-32 × 1.00 SS pan head through the deck into nutplates on a 2-ply doubler (GA 35S IM Table 3-1)' },
];
const FLOX_TAU = (M) => psi(M.FLOX.shear);
function mountRows(lc, M) {
  const out = [];
  for (const m of MOUNTS) { const W = m.w(), P = W * Math.hypot(FAC.fwd, FAC.side) * 1.15, per = P / m.n, Ps = SCREW[m.scr], Ph = FLOX_TAU(M) * Math.PI * m.host.D * m.host.t, ms = Math.min(Ps, Ph) / per - 1;
    out.push(row(m.pn, m.id, `Mounting at the FAR 23.561 items-of-mass factors: ${m.what}`, lc, m.pn, Ps < Ph ? 'screw shear' : 'insert / nutplate shear-out', ms,
      'P = W·√(n_fwd² + n_side²)·1.15 shared by n fasteners;  P_allow = min(screw single shear, τ_flox·π·D·t)',
      [IN_('Unit mass (from the solid; vendor mass typed)', W, 'lb', 'GEOMETRY: the definition solid'), IN_('Forward / side factor', `${FAC.fwd} / ${FAC.side}`, 'g', 'FAR23: 23.561(b)(3) items of mass (14 CFR Part 23, 1-1-11 edition, govinfo, accessed 2026-11-19)'),
        IN_('Fitting factor', 1.15, '', 'FAR23 23.625'), IN_('Fasteners', `${m.n} × ${m.scr}`, 'text', 'DESIGN'), IN_(`${m.scr} screw single shear`, Ps, 'lb', B(0, 'alloy-steel machine screw (not found in public sources: the AC 43.13-1B Table 4-9 notes checked, values kept)')), IN_('Flox shear', FLOX_TAU(M), 'psi', allowB(ms, 'resin shear (flox)'))],
      [['Per fastener (ult.)', per, 'lb'], ['Allowable', Math.min(Ps, Ph), 'lb']])); }
  return out;
}
/** the ELT mount at the crash load of its TSO (typed): 100 g static in each direction on the tray, bracket and the four inserts */
export const ELT_G = 100;
function eltRow(lc, M) {
  const W = jMass('LEZ-25-160') - E.eltRemote.mass, P = W * ELT_G, K = ELT_BRKT, arm = L.ELT_Z + E.elt.box[2] / 2 - (L.ELT_Z - K.t), Mb = P * arm, Z = K.w * K.t ** 2 / 6, s = Mb / Z, Fty = 35000, msB = Fty / s - 1;
  const lever = 1.5, Pt = Mb / lever / 2, ins = FLOX_TAU(M) * Math.PI * 0.375 * 0.375, msI = ins / Math.max(Pt, P / 4) - 1, Ps = SCREW['#10'], msS = Ps / (P / 4) - 1;
  // DO-204 3.1.8: ≤ 0.1 in local deflection under 100 lb in the most flexible direction: the shelf leg as a cantilever from the bulkhead face to the ELT's CG
  const Lc = (L.ELT_FS[0] + L.ELT_FS[1]) / 2 - K.face, Ish = K.w * K.t ** 3 / 12, dS = 100 * Lc ** 3 / (3 * 10.0e6 * Ish), msD = 0.1 / dS - 1, ms = Math.min(msB, msI, msS, msD);
  return row('LEZ-25-160', 'jelt-mount', 'ELT tray and bracket at the TSO crash load (100 g each direction)', lc, 'LEZ-53-175 aft face, 4 inserts', ms === msB ? 'bracket leg bending' : ms === msI ? 'insert shear-out (A\'s inserts)' : ms === msD ? 'DO-204 mount stiffness' : 'screw shear', ms,
    'P = W·100 g;  bracket leg (vertical, on the bulkhead): M = P·h_cg, σ = M / (w·t²/6);  screws P/4;  insert pull-out M/(2·lever) on two inserts;  stiffness δ = 100 lb · L³ / (3·E·I) of the shelf leg ≤ 0.1 in (DO-204)',
    [IN_('ELT, tray and bracket', W, 'lb', 'GEOMETRY: the definition solid (ACK mass typed)'), IN_('Crash load', ELT_G, 'g', 'RTCA DO-182 sec. 6.2.2.b: ELT weight × 100 through its CG, ± along all three axes (cited on the ACR/Artex C406-2 manual installation page, accessed 2026-11-19)'),
      IN_('Bracket 6061-T6 leg', `${K.w} × ${K.t} in`, 'text', 'DESIGN'), IN_('6061-T6 F_ty', Fty, 'psi', 'BOUND: MIL-HDBK-5 (materials topic)'), IN_('CG height above the shelf leg', arm, 'in', 'GEOMETRY'),
      IN_('Insert NAS1832C3 Ø 0.375 in 3/8 core', ins, 'lb', allowB(msI, 'resin shear (flox)')), IN_('#10-32 single shear', Ps, 'lb', B(0, 'alloy-steel machine screw, not found in public sources')), IN_('DO-204 stiffness: deflection under 100 lb, most flexible direction', dS, 'in', 'RTCA DO-204 sec. 3.1.8 / ACK E-04C manual sec. 2: ≤ 0.1 in under 100 lb (E 6061 10.0e6 psi, materials topic)')],
    [['P (ult.)', P, 'lb'], ['σ leg', s, 'psi'], ['insert load', Math.max(Pt, P / 4), 'lb'], ['deflection at 100 lb', dS, 'in']]);
}
/** the shelf: a strip spanning between the wall tapes under the units' inertia at 6 g down (+18 g forward in its plane) */
function shelfRow(lc, M) {
  const W = ['LEZ-34-100', 'LEZ-31-120', 'LEZ-34-135'].reduce((a, pn) => a + jMass(pn), 0) + 2.2, span = 2 * L.halfW(33.7, 41.0, L.SHELL), wid = L.SHELF.fs[1] - L.SHELF.fs[0];
  const P = W * FAC.down * 1.15, Mb = P * span / 8, d = L.SHELF.core + L.SHELF.nBID * BASE_MAT.BID.t, N = Mb / (d * wid), sF = N / (L.SHELF.nBID * BASE_MAT.BID.t), Xc = psi(M.BID.Xc), msF = Xc / sF - 1;
  const tau = P / 2 / (d * wid), msC = psi(M.PVC.tau) / tau - 1, Pf = W * FAC.fwd * 1.15, tape = 2 * 2 * 1.0 * (wid - 0.6), qt = Math.max(Pf, P) / tape, msT = psi(M.GUD.ILSS) / qt - 1, ms = Math.min(msF, msC, msT);
  return row('LEZ-31-160', 'jm-shelf', 'Avionics shelf: strip bending and core shear at 6 g down, wall tapes at 18 g forward', lc, 'shelf FS 30.9–36.6', ms === msF ? 'face compression' : ms === msC ? 'core shear' : 'tape shear', ms,
    'P = W·n·1.15;  M = P·span/8 (pinned at the wall tapes);  N = M/(d·w);  τ_core = P/2/(d·w);  tape q = P_fwd / (2 sides · 2 faces · lap · length)',
    [IN_('Units on the shelf (GTX, GSU, tees + GEA 24 allowance 2.2 lb; the GEA 24 is 1.6 lb with connectors, G3X IM Table 2-4)', W, 'lb', 'GEOMETRY: J solids; DESIGN allowance for H\'s unit'), IN_('Down / forward factor', `${FAC.down} / ${FAC.fwd}`, 'g', 'FAR23: 23.561(b)(2)(iv) / (b)(3) (1-1-11 edition)'), IN_('Span between the wall tapes', span, 'in', 'GEOMETRY'),
      IN_('Sandwich', `${L.SHELF.nBID} × 6781 each face on ${L.SHELF.core} in HT61`, 'text', 'DESIGN'), IN_('6781 compression', Xc, 'psi', allowB(msF)), IN_('HT61 core shear', psi(M.PVC.tau), 'psi', `BOUND: HT61 datasheet-typical; MS stays ≥ 0 down to ${tau.toFixed(0)} psi`), IN_('Tape bond (ILSS)', psi(M.GUD.ILSS), 'psi', allowB(msT, 'interlaminar shear strength'))],
    [['M', Mb, 'lb·in'], ['σ face', sF, 'psi'], ['τ core', tau, 'psi'], ['tape q', qt, 'psi']]);
}

// ---- RF: per-antenna link budgets (typed vendor and standards values as BOUNDs; physics stated)
const RG400_DB = [[100, 4.5], [400, 10.5], [1000, 17.0], [1575, 23.7], [2000, 28.2]];   // dB/100 ft, MIL-DTL-17/128B amd 2 Fig. 2 spec maxima (1575 / 2000 log-interpolated; repeater-builder.com mirror, accessed 2026-11-19)
export const rgDB = (f) => { let i = 1; while (i < RG400_DB.length - 1 && RG400_DB[i][0] < f) i++; const [[f0, a0], [f1, a1]] = [RG400_DB[i - 1], RG400_DB[i]]; return Math.exp(Math.log(a0) + (Math.log(a1) - Math.log(a0)) * (Math.log(f) - Math.log(f0)) / (Math.log(f1) - Math.log(f0))); };
/** rev C: the ELT coax (R24) is the routed coax path itself (connector at the ELT's aft face to the whip base, service loop
 *  included) + 3 in for the two BNC terminations, not the wire list's projection from the unit's centre */
{ const w = WIRES.find((x) => x.id === 'R24'), r = routes().find((q) => q.part === 'LEZ-25-162'); if (w && r) w.len = r.pts.slice(1).reduce((a, q, i) => a + Math.hypot(...q.map((v, k) => v - r.pts[i][k])), 0) + 0.25; }
const CONN_DB = 0.1;   // per mated connector pair: BOUND (range; Amphenol RF TNC catalogue p. 123 checked, value kept, second research pass)
export const runLoss = (id, nConn) => { const w = WIRES.find((x) => x.id === id); const f = w.rf.f; return { w, f, len: w.len, dB: rgDB(f) * w.len / 100 + nConn * CONN_DB }; };
const dB = (x) => 10 * Math.log10(x), lin = (x) => 10 ** (x / 10);
export const RF = {
  com: { P: 10, f: 127, Gant: -2.0, rng: 60, Ggnd: 0, Lgnd: 2.0, sens: -101, fade: 10, nConn: 4 },
  xpdr: { Pmin: 198, Pant: 125, nConn: 2 },
  gps: { S: -128.5, Gant: -4.0, NFlna: 2.5, Glna: 16.0, NFrx: 8.0, req: 33.0, netMin: 14.0, nConn: 2 },
  // rev C: the conservative 35 dBm (3.16 W) end of C/S T.001's 35–39 dBm; the installed VSWR is held to ≤ 1.3:1 at 406 MHz (integration; was 1.5:1) (acceptance
  // test, LEZ-25-161), a 0.18 dB mismatch loss (was a 1.0 dB allowance)
  // integration 2026-11-19 (thin margin): the acceptance VSWR tightens to ≤ 1.3:1 (Γ 0.130, mismatch −10·log(1 − Γ²) = 0.074 dB)
  elt: { P: 3.16, Gant: -2.0, vswr: 1.3, get mis() { const G = (this.vswr - 1) / (this.vswr + 1); return -10 * Math.log10(1 - G * G); }, req: 32.0, nConn: 2 },
};
function rfRows(lc) {
  const out = [];
  { const c = RF.com, r = runLoss('R20', c.nConn), fspl = 20 * Math.log10(c.rng * 1.852) + 20 * Math.log10(c.f) + 32.44, Prx = 10 * Math.log10(c.P * 1000) - r.dB + c.Gant - fspl + c.Ggnd - c.Lgnd, M = Prx - c.sens, ms = lin(M - c.fade) - 1;
    out.push(row('LEZ-23-110', 'jrf-com', `COM link: 10 W through ${r.len.toFixed(1)} ft of RG-400 to the winglet dipole, ${c.rng} nm air-to-ground`, lc, 'AXIS COM → dipole → ground station', 'link margin over a 10 dB fade allowance', ms,
      'P_rx = P_tx − L_coax + G_ant − FSPL(d, f) + G_gnd − L_gnd;  FSPL = 20 log d_km + 20 log f_MHz + 32.44;  margin = P_rx − sensitivity;  MS = 10^((margin − fade)/10) − 1',
      [IN_('AXIS COM transmitter', c.P, 'W', 'Garmin AXIS Pilot\'s Guide for Experimental Aircraft 190-031xx (GDU 116B/C/NC 10 W; accessed 2026-11-19)'), IN_(`Coax R20 ${r.len.toFixed(1)} ft at ${c.f} MHz + ${c.nConn} connectors (incl. the wing-root BNC)`, r.dB, 'dB', 'RG-400 MIL-DTL-17/128B spec maximum attenuation; length ROUTED'),
        IN_('Installed dipole gain', c.Gant, 'dBi', B(0, 'half-wave dipole 2.15 dBi less ≈ 4 dB for the fin and the rudder nearby (typed estimate)')), IN_('Range', c.rng, 'nm', 'DESIGN'), IN_('Ground station antenna / cable', `${c.Ggnd} dBi / ${c.Lgnd} dB`, 'text', B(0, 'typical, typed')),
        IN_('Receiver sensitivity', c.sens, 'dBm', B(0, 'range: the AXIS figure is not public; the GTR 20 gives −107 dBm (G3X IM Table 19-5); −101 kept, the conservative end')), IN_('Fade allowance', c.fade, 'dB', 'DESIGN')],
      [['FSPL', fspl, 'dB'], ['P_rx', Prx, 'dBm'], ['Margin', M, 'dB']])); }
  { const c = RF.xpdr, r = runLoss('R21', c.nConn), Pa = c.Pmin * lin(-r.dB), ms = Pa / c.Pant - 1;
    out.push(row('LEZ-34-110', 'jrf-xpdr', `Transponder / 1090ES: power at the blade after ${r.len.toFixed(1)} ft of RG-400`, lc, 'GTX 45R → blade', 'power at the antenna end', ms,
      'P_ant = P_tx,min · 10^(−L/10);  MS = P_ant / P_required − 1', [IN_('GTX 45R minimum transmitter power', c.Pmin, 'W', 'Garmin GTX 35R/45R IM 190-01499-10 rev 1, general specifications (accessed 2026-11-19)'), IN_(`Coax R21 ${r.len.toFixed(1)} ft at 1090 MHz + ${c.nConn} connectors`, r.dB, 'dB', 'RG-400 MIL-DTL-17/128B spec maximum; length ROUTED'), IN_('Required at the antenna (class 1)', c.Pant, 'W', 'Garmin GTX 35R/45R IM: 125 W at the antenna (confirmed 2026-11-19)')],
      [['P at the antenna', Pa, 'W']])); }
  for (const [id, pn, what] of [['R22', 'LEZ-34-114', 'GA 35S → AXIS'], ['R23', 'LEZ-34-112', 'GA 35 → GTX 45R']]) { const c = RF.gps, r = runLoss(id, c.nConn), Lc = lin(r.dB), F = lin(c.NFlna) + (Lc * lin(c.NFrx) - 1) / lin(c.Glna), NF = dB(F), CN0 = c.S + c.Gant + 174 - NF, net = c.Glna - r.dB;
    const ms = Math.min(lin(CN0 - c.req) - 1, lin(net - c.netMin) - 1);
    out.push(row(pn, `jrf-gps-${pn === 'LEZ-34-114' ? 'axis' : 'gtx'}`, `GPS L1 link: C/N0 at 5° elevation through ${r.len.toFixed(1)} ft of RG-400 (${what})`, lc, what, CN0 - c.req < net - c.netMin ? 'C/N0 vs tracking threshold' : 'net LNA gain at the receiver', ms,
      'NF_sys = 10 log(F_lna + (L·F_rx − 1)/G_lna) (Friis);  C/N0 = S_min + G_ant + 174 − NF_sys;  net gain = G_lna − L;  MS = min(10^((C/N0 − req)/10), 10^((net − min)/10)) − 1',
      [IN_('Minimum L1 C/A signal', c.S, 'dBm', 'IS-GPS-200N sec. 3.3.1.6, Table 3-Va (−128.5 dBm, confirmed 2026-11-19)'), IN_('Antenna gain at 5° elevation', c.Gant, 'dBic', B(0, 'GA 35S pattern not published (not found)')), IN_('LNA noise figure / gain', `${c.NFlna} / ${c.Glna}`, 'dB', B(0, 'NF 2.5 dB max (GA 35/36/37 instructions 190-00848-00 rev B); gain the 16 dB low end of the G3X IM Table 20-3 16–25 dB window (range)')),
        IN_(`Coax ${id} ${r.len.toFixed(1)} ft at 1575 MHz + ${c.nConn} connectors`, r.dB, 'dB', 'RG-400 MIL-DTL-17/128B spec maximum (log-interpolated); length ROUTED'), IN_('Receiver noise figure', c.NFrx, 'dB', B(0, 'estimate, not found in public sources')), IN_('Required C/N0 (SBAS tracking)', c.req, 'dB-Hz', B(0, 'design value, not found in public sources')), IN_('Minimum net gain at the receiver', c.netMin, 'dB', B(0, 'not found: G3X IM Table 20-3 is the antenna-gain window, no net figure'))],
      [['NF system', NF, 'dB'], ['C/N0', CN0, 'dB-Hz'], ['Net gain', net, 'dB']])); }
  { const c = RF.elt, r = runLoss('R24', c.nConn), EIRP = 10 * Math.log10(c.P * 1000) - r.dB - c.mis + c.Gant, ms = lin(EIRP - c.req) - 1;
    out.push(row('LEZ-25-161', 'jrf-elt', `ELT 406 MHz EIRP through ${r.len.toFixed(1)} ft of RG-400 and the turtleback whip`, lc, 'ELT → whip', 'EIRP vs the beacon minimum', ms,
      'EIRP = P_tx − L_coax − L_mismatch + G_ant;  MS = 10^((EIRP − EIRP_min)/10) − 1', [IN_('ELT 406 MHz output', c.P, 'W', 'C/S T.001 issue 4 rev 7 sec. 2.3.2: 35–39 dBm into 50 Ω, the 35 dBm low end (ACK E-04C measured 37.3 dBm); accessed 2026-11-19'), IN_(`Coax R24 ${r.len.toFixed(1)} ft at 406 MHz + ${c.nConn} connectors`, r.dB, 'dB', 'RG-400 MIL-DTL-17/128B spec maximum; length ROUTED (≥ 2 ft, ACK)'),
        IN_('Mismatch loss', c.mis, 'dB', `DESIGN: installed VSWR ≤ ${c.vswr}:1 at 406 MHz (acceptance test); −10·log(1 − Γ²)`), IN_('Whip gain on its ground plane', c.Gant, 'dBi', B(0, 'estimate, not found in public sources')), IN_('Minimum EIRP', c.req, 'dBm', 'C/S T.001 sec. 2.3 (antenna characteristics; confirmed 2026-11-19)')], [['EIRP', EIRP, 'dBm']])); }
  // ground planes: each monopole's plane reaches λ/4 from the base in every direction (physics); the GPS patches need an 8 in
  // plane (Garmin G3X IM 190-01115-01 rev AV sec. 20.4.5: reach 4.0 in; the GA 35S TSO manual's 7.5 in beyond the perimeter is
  // not adopted, Miles 2026-11-19); the ELT whip ACK's 24 in on a non-conductive surface (E-04C manual sec. 3: reach 12 in, six
  // radials). Reach across BL is measured along the conformed skin (the plane follows it), along FS in plan.
  { const lam = (f) => 11803 / f, skinBL = (at, bl, side) => { let a = 0; const n = 200, y0 = at[1]; for (let k = 1; k <= n; k++) { const ya = y0 + (bl - y0) * (k - 1) / n, yb = y0 + (bl - y0) * k / n, za = side > 0 ? L.topAt(at[0], ya, L.SHELL) : L.botAt(at[0], ya, L.SHELL), zb = side > 0 ? L.topAt(at[0], yb, L.SHELL) : L.botAt(at[0], yb, L.SHELL); a += Math.hypot(yb - ya, zb - za); } return a; };
    const G = [['LEZ-34-110', 'jrf-gp-blade', 'blade', L.BLADE_AT, L.GP.blade, -1, lam(1090) / 4, 'DESIGN: λ/4 at 1090 MHz (λ = c/f)'], ['LEZ-34-114', 'jrf-gp-ga35s', 'GA 35S (aft, AXIS)', L.GA35S_AT, L.GP.ga35s, 1, 4.0, 'half of an 8 in plane — src: Garmin G3X IM 190-01115-01 rev AV sec. 20.4.5 p. 20-9 (accessed 2026-11-19)'], ['LEZ-34-112', 'jrf-gp-ga35', 'GA 35S (forward, GTX)', L.GA35_AT, L.GP.ga35, 1, 4.0, 'half of an 8 in plane — src: Garmin G3X IM 190-01115-01 rev AV sec. 20.4.5 p. 20-9 (accessed 2026-11-19)']];
    for (const [pn, id, n, at, R, side, req, why] of G) { const reach = Math.min(at[0] - R[0], R[1] - at[0], skinBL(at, R[2], side), skinBL(at, R[3], side)), ms = reach / req - 1;
      out.push(row(pn, id, `Ground plane of the ${n}: least reach from the base`, lc, n, 'plane reach', ms, 'reach = min distance from the base to the plane edge (across BL along the skin);  MS = reach / required − 1', [IN_('Plane', `FS ${R[0]}–${R[1]}, BL ${R[2]}–${R[3]}`, 'text', 'DESIGN'), IN_('Required reach', req, 'in', why)], [['Reach', reach, 'in']])); }
    const W = L.WHIP_RADIALS, rr = whipRadials(), reach = Math.min(...rr.map((r) => r.reach)), ms = Math.min(reach / W.L - 1, 9);
    out.push(row('LEZ-25-161', 'jrf-gp-whip', 'Ground plane of the ELT whip: six 12 in radials along the turtleback skin', lc, 'ELT whip', 'radial length', ms, 'each radial marched along the inner skin from the base at its heading inside the turtleback (FS 129.1 face to the firewall\'s forward face, BL ±10.7);  MS = least radial length / 12 in − 1',
      [IN_('Radials', `${W.n} × ${W.w} in copper tape at ${Array.from({ length: W.n }, (_, i) => W.from + i * 360 / W.n).join(' / ')}° from forward`, 'text', 'DESIGN'), IN_('Required length', W.L, 'in', 'ACK E-04C manual E-04CM rev 1.2 sec. 3: 24 in diameter on a non-conductive surface, e.g. six 12 in radials (accessed 2026-11-19)'), ...rr.map((r, i) => IN_(`radial ${i + 1}`, r.reach, 'in', 'GEOMETRY'))], [['Least radial', reach, 'in']])); }
  // antenna separation: GA 35S IM 190-02466-00 rev 3 sec. 2 (gps|gps 12, gps|xpdr 24), G3X IM 20.4.2 (com|gps 24), ACK E-04C manual
  // sec. 3 (elt|gps 48, com|elt 36), ACK E-04 pre-installation checklist (elt|xpdr 36); com|xpdr 24 DESIGN (not in the GTX text read)
  { const S = { 'gps|gps': [12, 'GPS to GPS (GA 35S IM sec. 2)'], 'com|gps': [24, 'COM to GPS (G3X IM 20.4.2)'], 'elt|gps': [48, 'ELT to GPS (ACK E-04C sec. 3)'], 'gps|xpdr': [24, 'transponder to GPS (GA 35S IM sec. 2)'], 'com|elt': [36, 'COM to ELT (ACK E-04C sec. 3)'], 'com|xpdr': [24, 'DESIGN (not found in the GTX text)'], 'elt|xpdr': [36, 'ELT to transponder (ACK E-04 checklist)'] };
    const ants = [['GA 35S (aft)', 'gps', L.GA35S_AT], ['GA 35S (forward)', 'gps', L.GA35_AT], ['blade', 'xpdr', L.BLADE_AT], ['ELT whip', 'elt', L.WHIP_AT], ['COM feed', 'com', L.finPt(L.DIPOLE.hFeed)]], pairs = [];
    for (let i = 0; i < ants.length; i++) for (let j = i + 1; j < ants.length; j++) { const k = [ants[i][1], ants[j][1]].sort().join('|'), d = Math.hypot(...ants[i][2].map((v, q) => v - ants[j][2][q])); pairs.push({ n: `${ants[i][0]} ↔ ${ants[j][0]}`, k, d, req: S[k][0], ms: d / S[k][0] - 1 }); }
    pairs.sort((a, b) => a.ms - b.ms);
    out.push(row('LEZ-34-114', 'jrf-sep', 'Antenna separation, every pair (GPS from GPS, transmitters and the ELT)', lc, pairs[0].n, 'distance ≥ rule', pairs[0].ms, 'MS = min over every pair (distance / rule) − 1 (every pair has a rule)',
      pairs.map((p) => IN_(`${p.n} (${p.k}, rule ${p.req} in)`, p.d, 'in', S[p.k][1] + ' (accessed 2026-11-19)')), [['Governing spacing', pairs[0].d, 'in']])); }
  return out;
}
// ---- Garmin CAN bus: one linear bus, terminated at its two physical ends, length and timing
export const CAN = { rate: 250e3, Lmax: 20, stub: 0.3, vf: 0.66, tTx: 255e-9, sample: 0.75 };   // Lmax 20 m end to end and stubs ≤ 0.3 m (G3X IM 190-01115-01 rev AV sec. 2.3.1.3.1, 2.3.1.3.5; accessed 2026-11-19); rate, vf, tTx BOUND (not found)
function canRow(lc) {
  const seg = ['D1', 'D2', 'D3', 'D9'].map((id) => WIRES.find((w) => w.id === `${id}A22`)), L_ = seg.reduce((a, w) => a + w.len, 0) * 0.3048, nodes = ['A1', 'A7', 'A3', 'A2', 'A10'];
  const term = nodes.filter((r) => Object.values(EQUIP.find((e) => e.ref === r)?.conns || {}).some((c) => Object.values(c.pins || {}).some((n) => /terminated/i.test(n))));
  const ends = term.length === 2 && term.includes('A1') && term.includes('A10'), tLoop = 2 * (L_ / (3e8 * CAN.vf) + CAN.tTx), tBit = CAN.sample / CAN.rate, ms = Math.min(CAN.Lmax / L_ - 1, tBit / tLoop - 1, ends ? 9 : -1);
  return row('LEZ-31-121', 'jcan-bus', 'Garmin CAN bus: linear, terminated at both ends, length and loop delay', lc, 'AXIS → G5 → GEA 24 → GSU 25C → GMU 11', ends ? 'bus length' : 'termination', ms,
    'one bus, daisy-chained at each connector (stubs ≈ 0); terminated exactly at its two physical ends;  loop delay 2·(L/(c·v_f) + t_transceiver) < the sample point (0.75 bit);  MS = min(L_max / L, t_sample / t_loop) − 1',
    [IN_('Bus segments D1, D2, D3, D9 (routed)', L_, 'm', 'ROUTED: the wire list'), IN_('Terminated nodes', term.join(', '), 'text', 'MODEL: pin names'), IN_('Bit rate', CAN.rate / 1e3, 'kbit/s', B(0, 'not stated in the G3X IM text read')),
      IN_('Bus length limit', CAN.Lmax, 'm', 'Garmin G3X IM 190-01115-01 rev AV sec. 2.3.1.3.1: 20 m (66 ft) end to end; stubs ≤ 0.3 m, daisy-chained at the connectors (accessed 2026-11-19)'), IN_('Cable velocity factor', CAN.vf, '', B(0, 'M27500 twisted pair, not found')), IN_('Transceiver loop delay', CAN.tTx * 1e9, 'ns', B(0, 'ISO 11898 transceiver typical, not found'))],
    [['Bus length', L_, 'm'], ['Loop delay', tLoop * 1e9, 'ns'], ['Sample point', tBit * 1e9, 'ns']]);
}
// ---- magnetometer site: distances to the published Garmin table (G3X installation manual, GMU 44 table 3-7; the GMU 11 pages
// give no numbers: "as far as possible", shielded conductors, a location survey) and the predicted heading error
/** the GMU 11's published distances (G3X IM 190-01115-01 rev AV sec. 13.4, Table 13-4; G5 IM Table D-6), in: the four
 *  rows the model had and the four it lacked (rev C) */
export const GMU_TABLE = [['electrical conductors > 100 mA', 36], ['ferromagnetic material < 1 kg (control cables)', 36], ['ferromagnetic structure > 1 kg (landing gear, engine)', 98.4], ['electrical devices > 100 mA', 36],
  ['electric motors and relays, incl. servos', 118.1], ['electrical devices < 100 mA', 23.6], ['other magnetometers', 23.6], ['electrical conductors < 100 mA', 15.7]];
export const MAGP = { BH: 24.0, chi: 0.02, pair: 0.10, Istrobe: 3.0, lim: 1.0, sFwd: 1.0, sAft: 3.0, Iign: 0.1,
  limSrc: 'DESIGN: 1° heading-error bound, stricter than Garmin: Garmin publishes no degree figure for a site (the magnetic-interference survey is pass/fail, G3X IM 190-01115-01 sec. 31; 190-01051-00 sec. 2.6), and the post-install compass swing accepts each of 12 headings within ±6° (G5 MM 190-01112-11 sec. 7.6); the site is proven by the survey before the pocket is cut' };
/** the field at the GMU 11 from every current-carrying run (I2 of LEZ-31-122, rev B): each run is a supply/return pair,
 *  each straight segment a finite pair (Biot–Savart of a finite line, differentiated across the pair spacing s, worst
 *  orientation), summed by magnitude. Currents (BOUND): the wingtip-light triad at its position + strobe flash peak; every
 *  other power run at the lesser of its circuit protection and every block I load on at once (block I's load budget);
 *  ignition HT leads and magneto P-leads 0.1 A (no steady current in flight). Spacing (BOUND): the twisted light triad
 *  MAGP.pair; untwisted runs ahead of the firewall sFwd (returns wired in the same bundle to the star ground: composite
 *  airframe, no structure return); aft of the firewall sAft (the alternator and starter returns through the engine
 *  and the strap). µT. */
export function magRuns() {
  const G = L.MAG_AT, Iall = Object.values(LOADS).reduce((a, x) => a + x.I, 0), out = [];
  const pairB = (A, Bp, I, s) => { const ab = Bp.map((v, i) => v - A[i]), Lg = Math.hypot(...ab); if (Lg < 1e-6) return 0; const u = ab.map((v) => v / Lg), ag = G.map((v, i) => v - A[i]), t = ag.reduce((a, v, i) => a + v * u[i], 0), r = Math.max(1e-3, Math.hypot(...ag.map((v, i) => v - t * u[i])));
    const f = (rr) => ((Lg - t) / Math.hypot(Lg - t, rr) + t / Math.hypot(t, rr)) / rr, h = 1e-3 * r; return 1e-7 * I * s * Math.abs((f(r + h) - f(r - h)) / (2 * h)) / 0.0254 * 1e6; };   // µ0/4π; inches → metres
  for (const r of routes().filter((q) => q.cls === 'power' || q.cls === 'ign' || q.part === 'LEZ-74-100')) {
    const P = r.pts.map((p) => p.map((v) => v * 12)), prot = Math.max(0, ...WIRES.filter((w) => [].concat(w.harness).includes(r.part)).map((w) => w.cb || 0));
    const light = r.part === 'LEZ-33-110', I = light ? LOADS.DS1.peak + 0.5 : r.cls === 'ign' || r.part === 'LEZ-74-100' ? MAGP.Iign : Math.min(prot || Infinity, Iall);
    let Bsum = 0, d = Infinity; for (let i = 1; i < P.length; i++) { const s = light ? MAGP.pair : (P[i][0] + P[i - 1][0]) / 2 > 127.50 ? MAGP.sAft : MAGP.sFwd; Bsum += pairB(P[i - 1], P[i], I, s);
      const ab = P[i].map((v, k) => v - P[i - 1][k]), L2 = ab.reduce((a, v) => a + v * v, 0), t = Math.max(0, Math.min(1, G.reduce((a, v, k) => a + (v - P[i - 1][k]) * ab[k], 0) / (L2 || 1))); d = Math.min(d, Math.hypot(...G.map((v, k) => v - P[i - 1][k] - t * ab[k]))); }
    out.push({ part: r.part, i: r.i, I, d, B: Bsum });
  }
  return { runs: out.sort((a, b) => b.B - a.B), Iall, B: out.reduce((a, x) => a + x.B, 0) };
}
export function magSite() {
  const g = L.MAG_AT.map((v) => v / 12), segD = (p, a, b) => { const ab = b.map((v, i) => v - a[i]), ap = p.map((v, i) => v - a[i]), L2 = ab.reduce((s, v) => s + v * v, 0), t = Math.max(0, Math.min(1, ap.reduce((s, v, i) => s + v * ab[i], 0) / (L2 || 1))); return Math.hypot(...p.map((v, i) => v - a[i] - t * ab[i])); };
  const pathD = (pts) => { let m = Infinity; for (let i = 1; i < pts.length; i++) m = Math.min(m, segD(g, pts[i - 1], pts[i])); return m * 12; };
  const rt = (pn, k) => (routes().filter((r) => r.part === pn).map((r) => pathD(r.pts)).sort((a, b) => a - b)[k ?? 0]);
  const near = { light: rt('LEZ-33-110'), cable: rt('LEZ-27-151'), conduit: null };
  const geoD = (pn) => Math.min(...(partByPN(pn)?.geo || []).filter((q) => q.t === 'box' || q.t === 'cyl').map((q) => q.t === 'box' ? Math.hypot(...g.map((v, i) => Math.max(0, Math.abs(v - q.c[i]) - q.d[i] / 2))) * 12 : Math.max(0, segD(g, q.a, q.b) - q.r) * 12));
  const big = { engine: geoD('LEZ-71-210'), maingear: Math.min(geoD('LEZ-32-300'), geoD('LEZ-32-310'), geoD('LEZ-32-120')), light: geoD('LEZ-33-100'), rodB: rt('LEZ-27-142') };
  // heading error: twisted supply and return of the light circuit (pair field), the moving CRES rudder cable (induced dipole)
  const mu0 = 4e-7 * Math.PI, rL = near.light * 0.0254, Bl = mu0 * MAGP.Istrobe * MAGP.pair * 0.0254 / (2 * Math.PI * rL * rL) * 1e6;
  const rc = near.cable * 0.0254, Vc = Math.PI * (0.0625 * 0.0254) ** 2 * 0.6, Bc = mu0 / (4 * Math.PI) * 2 * MAGP.chi * (MAGP.BH * 1e-6 / mu0) * Vc / rc ** 3 * 1e6;
  const err = (Bl + Bc) / MAGP.BH * 180 / Math.PI;
  // rev B (I2): every current-carrying run, finite segments, plus the cable
  const all = magRuns(), errAll = (all.B + Bc) / MAGP.BH * 180 / Math.PI;
  return { near, big, Bl, Bc, err, all, errAll };
}
function magRow(lc) {
  const s = magSite(), ms = MAGP.lim / s.errAll - 1, top = s.all.runs.slice(0, 4);
  return row('LEZ-31-122', 'jmag-site', 'GMU 11 site: heading error from every current-carrying run and the moving ferrous parts near it', lc, `left wing BL ${L.MAG.bl}, x/c ${L.MAG.x}`, 'heading error', ms,
    'every current-carrying run a supply/return pair, each straight segment a finite pair: B = µ0·I·s/(4π)·|∂/∂r [(cos α₁ − cos α₂)/r]| (Biot–Savart of a finite line across the spacing s, worst orientation), summed by magnitude over all segments and runs; induced dipole of the CRES rudder cable B = µ0/(4π)·2·χ·H·V / r³;  δ = (ΣB_runs + B_cable) / B_H;  MS = δ_limit / δ − 1. The published distances (table) are listed and NOT met in this wing; the site is proven by Garmin\'s survey before the pocket is cut.',
    [IN_('Light harness (nearest)', s.near.light, 'in', 'ROUTED'), IN_('Rudder cable (nearest)', s.near.cable, 'in', 'ROUTED'), IN_('Engine / main gear / tip light / aileron rod B', `${s.big.engine.toFixed(0)} / ${s.big.maingear.toFixed(0)} / ${s.big.light.toFixed(0)} / ${s.big.rodB.toFixed(0)}`, 'in', 'GEOMETRY'),
      ...GMU_TABLE.map(([n, d]) => IN_(`Published spacing: ${n}`, d, 'in', 'Garmin G3X IM 190-01115-01 rev AV Table 13-4 (GMU 11; listed, not met in this wing: the survey governs)')),
      IN_('Current-carrying runs', s.all.runs.length, '', 'ROUTED'), ...top.map((q) => IN_(`${q.part} path ${q.i}: ${q.I.toFixed(1)} A, nearest ${q.d.toFixed(1)} in`, q.B, 'µT', 'ROUTED')),
      IN_('Light current (position + strobe flash peak, triad twisted)', LOADS.DS1.peak + 0.5, 'A', B(0, 'block I load budget, LED strobe peak typed')), IN_('Other power runs: every block I load on at once, capped by the run\'s protection', s.all.Iall, 'A', B(0, 'block I load budget (typed vendor currents)')),
      IN_('Ignition and P-lead runs', MAGP.Iign, 'A', B(0, 'no steady current in flight, typed')), IN_('Pair spacing: light triad / untwisted ahead of the firewall / aft of it', `${MAGP.pair} / ${MAGP.sFwd} / ${MAGP.sAft}`, 'in', B(0, 'returns wired in the same bundle (no structure return); alternator and starter returns through the engine and strap, typed')),
      IN_('CRES 7×19 susceptibility', MAGP.chi, '', B(0, 'cold-worked 302/304 austenitic, not found (sources show it may be unconservative)')),
      IN_('Horizontal earth field (southern California)', MAGP.BH, 'µT', B(0, 'not found (the NOAA calculator was not reachable)')), IN_('Heading error limit', MAGP.lim, 'deg', MAGP.limSrc)],
    [['B, all runs', s.all.B, 'µT'], ['B light (nearest path, infinite pair)', s.Bl, 'µT'], ['B cable', s.Bc, 'µT'], ['Heading error', s.errAll, 'deg']]);
}
// ---- pitot-static: lag, drains at the low points, port symmetry
export const PSP = { mu: 1.80e-5, p: 69700, Vins: 25e-6, id: NYLON.od - 2 * NYLON.wall, lagMax: 0.5 };
export const psRuns = () => routes().filter((r) => r.part === 'LEZ-34-130');
function psRows(lc) {
  const out = [], R = psRuns(), len = (r) => r.pts.slice(1).reduce((a, q, i) => a + Math.hypot(...q.map((v, k) => v - r.pts[i][k])), 0) * 0.3048;
  const st = R[3], lag = (Lm) => 128 * PSP.mu * Lm * PSP.Vins / (Math.PI * (PSP.id * 0.0254) ** 4 * PSP.p), Lst = Math.max(len(R[3]), len(R[4])) + Math.max(len(R[5]), len(R[6])), Lpt = len(R[0]) + Math.max(len(R[1]), len(R[2])), tl = Math.max(lag(Lst), lag(Lpt));
  out.push(row('LEZ-34-130', 'jps-lag', 'Pitot-static lag: the longest port-to-instrument run (laminar, Poiseuille)', lc, Lst > Lpt ? 'static, port to G5' : 'pitot, mast to G5', 'time constant', PSP.lagMax / tl - 1,
    'τ = 128·µ·L·V / (π·d⁴·p) (laminar flow into the instrument volume V)', [IN_('Longest static run', Lst, 'm', 'ROUTED'), IN_('Longest pitot run', Lpt, 'm', 'ROUTED'), IN_('Tube bore', PSP.id, 'in', 'Nylaflow 1/4 in standard wall, ID 0.190 (Aircraft Spruce 05-00115)'), IN_('Instrument volume', PSP.Vins * 1e6, 'cm³', B(0, 'GSU 25C + G5 + tees, not published by Garmin')), IN_('Static pressure (10,000 ft)', PSP.p, 'Pa', 'ISA'), IN_('Air viscosity', PSP.mu, 'Pa·s', 'handbook'), IN_('Lag limit', PSP.lagMax, 's', 'DESIGN')], [['τ', tl, 's']]));
  // drains: walking each run from its low end (mast, port sump) the WL never falls by more than 0.02 in; tee test ports capped
  let worst = 1, at = '';
  R.forEach((r, k) => { for (let i = 1; i < r.pts.length; i++) { const dz = (r.pts[i][2] - r.pts[i - 1][2]) * 12; if (dz < -0.02) { worst = -1; at = `run ${k} segment ${i}`; } } });
  out.push(row('LEZ-34-130', 'jps-drain', 'Pitot-static drains at the low points: every run rises from its drained end (mast drain hole, port sumps) to the instruments', lc, at || 'all runs', 'rising lines', worst,
    'for each run, WL(i) ≥ WL(i−1) − 0.02 in walking from the drained end; MS = 1 if all rise, −1 otherwise', [IN_('Runs', R.length, '', 'ROUTED'), IN_('Drains', 'pitot mast drain hole; a drain plug at each static port sump; capped test ports on the tees', 'text', 'DESIGN')], [['Falling segments', worst < 0 ? 1 : 0, '']]));
  const l = L.STATIC_IN(-1), rr = L.STATIC_IN(1), asym = Math.max(Math.abs(l[0] - rr[0]), Math.abs(l[2] - rr[2]), Math.abs(Math.abs(l[1]) - Math.abs(rr[1])), 1e-3);
  out.push(row('LEZ-34-132', 'jps-sym', 'Static ports symmetric left and right (sideslip errors cancel in the tee)', lc, `FS ${l[0]}, WL ${l[2]}`, 'asymmetry', Math.min(9, 0.01 / asym - 1), 'MS = 0.01 in / max(|ΔFS|, |ΔWL|, |Δ|BL||) − 1 (capped at 9)', [IN_('Ports', `BL ±${Math.abs(l[1]).toFixed(3)} on the OML`, 'text', 'GEOMETRY')], [['Asymmetry', asym, 'in']]));
  return out;
}
// ---- EMC: J's sensitive runs (audio, CAN, ELT remote, coax) from power and ignition
export const EMC = { power: 0.5, ign: 2.0, plead: 0 };
function emcRow(lc) {
  const R = routes(), mine = R.filter((r) => ['LEZ-23-125', 'LEZ-31-121', 'LEZ-25-162', 'LEZ-23-110', 'LEZ-34-111'].includes(r.part)), noisy = R.filter((r) => r.cls === 'power' || r.cls === 'ign' || r.part === 'LEZ-74-100');   // LEZ-74-100 carries the shielded magneto P-leads
  // 11 × 11 samples per segment pair (the same points and arithmetic as before, without allocating; perf)
  const sd = (p1, q1, p2, q2) => { let m = Infinity; for (let k = 0; k <= 10; k++) { const x0 = p1[0] + (q1[0] - p1[0]) * k / 10, x1 = p1[1] + (q1[1] - p1[1]) * k / 10, x2 = p1[2] + (q1[2] - p1[2]) * k / 10;
    for (let j = 0; j <= 10; j++) { const h = Math.hypot(x0 - (p2[0] + (q2[0] - p2[0]) * j / 10), x1 - (p2[1] + (q2[1] - p2[1]) * j / 10), x2 - (p2[2] + (q2[2] - p2[2]) * j / 10)); if (h < m) m = h; } } return m; };
  // lower bounds from axis-aligned bounds, less a rounding allowance: pairs that cannot lower the minimum are skipped (perf)
  const bb = (pts) => [0, 1, 2].map((i) => [Math.min(...pts.map((q) => q[i])), Math.max(...pts.map((q) => q[i]))]);
  const bbD = (A, B) => Math.hypot(...[0, 1, 2].map((i) => Math.max(A[i][0] - B[i][1], 0, B[i][0] - A[i][1]))) - 1e-9;
  const msOf = (c, need) => (need > 0 ? c / need - 1 : (c >= -0.005 ? 1 : -1));
  let w = { ms: 9 };
  for (const a of mine) for (const b of noisy) { const need = b.part === 'LEZ-74-100' ? EMC.plead : EMC[b.cls === 'ign' ? 'ign' : 'power'], rr = ((a.dIn || 0.25) + (b.dIn || 0.25)) / 2;
    if (a.pts.length > 1 && b.pts.length > 1 && msOf(bbD(bb(a.pts), bb(b.pts)) * 12 - rr, need) >= w.ms) continue;
    let d = Infinity; for (let i = 1; i < a.pts.length; i++) for (let j = 1; j < b.pts.length; j++) { if (bbD(bb([a.pts[i - 1], a.pts[i]]), bb([b.pts[j - 1], b.pts[j]])) >= d) continue; d = Math.min(d, sd(a.pts[i - 1], a.pts[i], b.pts[j - 1], b.pts[j])); }
    const c = d * 12 - rr, ms = msOf(c, need); /* shielded P-leads: their own lane, not touching */ if (ms < w.ms) w = { ms, a: a.part, b: b.part, c, need }; }
  return row('LEZ-23-125', 'jemc-seg', 'EMC segregation: J audio, CAN, ELT remote and coax runs from power and ignition runs', lc, w.a ? `${w.a} ↔ ${w.b}` : '—', 'clearance', Math.min(9, w.ms),
    'clear = least distance between the runs less their radii;  MS = min(clear / rule) − 1 (shielded J pairs and RG-400; the 2 in power|rf rule is also enforced by the clash audit)',
    [IN_('J runs × noisy runs', `${mine.length} × ${noisy.length}`, 'text', 'ROUTED'), IN_('Rule: shielded signal from unshielded power / ignition HV / shielded P-leads (own lane)', `${EMC.power} / ${EMC.ign} / ${EMC.plead}`, 'in', 'DESIGN: AC 43.13-1B segregation practice (separate bundles; the numbers are a design choice)')], [['Least clearance', w.c ?? 0, 'in']]);
}
registerChecks('wpJ1', (d, lc, Z, M) => (lc.id !== 'W1-S1' ? [] : [...mountRows(lc, M), eltRow(lc, M), shelfRow(lc, M), ...rfRows(lc), canRow(lc), magRow(lc), ...psRows(lc), emcRow(lc)]));

// ---- CS spar rev G: the webs net of every pass-through (C's rod and cable tunnels and J's systems tunnel), C's method
// restated with all three holes, and the ligament from the systems tunnel to the upper cap's inner face
export const CS_LIG = 0.125;   // in, least web ligament from a pass-through to a cap (practice, typed: no public rule found)
registerChecks('wpJ1-cs', (d, lc, Z, M) => {
  const Ld = surfaceLoads('wing', d, lc); if (!Ld) return [];
  const r = Ld.at(GEO.wing.attachY), h = GEO.csSpar.depthFt * 12, wd = GEO.csSpar.width * 12, P_ = [...CS_PASS(), ...L.CS_TUNNELS], cp = csParams();
  // every vertical line of either web: Σd of the hole traces it cuts (exact intervals) and the plies there (web + doubler)
  const tr = (q, k) => { const e = q.d / 2 / Math.cos(Math.atan2(Math.abs(q.x1 - q.x0), wd)); return [q[k] - e, q[k] + e]; }, D = L.CS_WEB_DBL;
  let w0 = null; for (const k of ['x0', 'x1']) for (let x = 8; x <= 16; x += 0.01) { const sd = P_.filter((q) => { const t = tr(q, k); return x >= t[0] && x <= t[1]; }).reduce((a, q) => a + q.d, 0); if (!sd) continue;
    const n = Z.csWeb + (Math.abs(x - D.x) <= D.half ? D.n : 0), f = (h - sd) * n; if (!w0 || f < w0.f) w0 = { f, sd, n, x, k }; }
  const dh = w0.sd, nW = w0.n;
  const Nxy = Math.abs(r.V) * d.FS / 2 / (h - dh), bidS = (k) => Array.from({ length: k }, () => ({ mat: 'BID', angle: 45 })), web = plyRF(bidS(nW), [0, 0, Nxy], M), wl = laminate(bidS(nW), M), tauWr = wrinkling(psi(M.BID.E1), 'PVC', M) * 0.8;
  // ligaments from every J tunnel to both caps' inner faces (rev H: the low tunnel sits over the lower cap), full cap stack (no drop-off credit)
  // ICD A-M1 (integration 2026-11-19): LEZ-57-140 rev I has asymmetric caps, so each ligament reads its own cap's ply count where
  // the tunnel crosses each web (x0 forward web, x1 aft web): the upper cap N less the plies dropped inboard of the hole's inboard
  // edge (ends < BL − d/2); the lower cap NL plus the build-ups reaching the hole's outboard edge (startsL ≤ BL + d/2), at most nEndL
  const nUp = (x, t) => (cp.N - (cp.ends || []).filter((e) => e < x - t.d / 2).length), nLo = (x, t) => Math.min(cp.nEndL ?? cp.N, (cp.NL ?? cp.N) + (cp.startsL || []).filter((s) => s <= x + t.d / 2).length - (cp.endsL || []).filter((e) => e < x - t.d / 2).length);
  const ligs = L.CS_TUNNELS.flatMap((t) => [t.x0, t.x1].flatMap((x) => { const nu = nUp(x, t), nl = nLo(x, t);
    return [{ t, x, v: (cp.H - nu * cp.tU - cp.wrap * cp.tB) - (t.z + t.d / 2), cap: 'upper', n: nu }, { t, x, v: (t.z - t.d / 2) - (nl * cp.tU + cp.wrap * cp.tB), cap: 'lower', n: nl }]; })),
    lw = ligs.reduce((a, q) => (q.v < a.v ? q : a)), lig = lw.v, msL = lig / CS_LIG - 1;
  const msW = web.rf - 1, msB = tauWr / (Nxy / wl.h) - 1, ms_ = Math.min(msW, msB, msL);
  const R_ = mk('csSpar', 'cs-sys-holes', 'CS spar webs net of every pass-through (rev H: C\'s rod and cable tunnels + J\'s systems tunnel and low tunnel)', lc, `BL ±${L.CS_TUNNEL.x0}–${L.CS_TUNNEL.x1}`, ms_ === msL ? `${lw.t.id} tunnel ligament to the ${lw.cap} cap` : msW < msB ? `web ${web.mode}` : 'face wrinkling under shear', ms_, {
    formula: 'Nxy = FS·V / (2·(h − Σd)) on the governing vertical line of either web, Σd the hole traces that line cuts (all four tunnels, elliptical traces d/2·sec θ) and the plies there (web + rev G doubler);  CLT first-ply on the ±45 plies;  wrinkling 0.8 · 0.5 (E·Ec·Gc)^⅓;  ligament = cap inner face − tunnel edge ≥ 0.125 in, each J tunnel to both caps at each web crossing, with the cap\'s own ply count there (ICD A-M1)',
    inputs: [['Attach shear V (limit)', r.V, 'lb', 'SCHRENK'], ['Depth h', h, 'in', 'MODEL'], ['Holes', P_.map((q) => `${q.id} Ø ${q.d}`).join(', '), 'text', 'DESIGN'], ['Webs', `${Z.csWeb} × 6781 ±45 × 2`, 'text', 'SIZED'], ['Doubler over the tunnels (rev G)', `${D.n} × 6781 ±45 inside each web, BL ±${D.x - D.half}–${D.x + D.half}`, 'text', 'DESIGN'], ['Least ligament', CS_LIG, 'in', 'BOUND: shop practice for a grommeted hole near a cap, typed (no public rule found)']],
    result: [['Governing line', `${w0.k === 'x0' ? 'forward' : 'aft'} web, BL ${w0.x.toFixed(2)}, ${nW} plies`, 'text'], ['Σd in that line', dh, 'in'], ['Nxy net (ult.)', Nxy, 'lbin'], ['τ wrinkling allowable', tauWr, 'psi'], [`Least ligament (${lw.t.id} tunnel at BL ${lw.x}, ${lw.cap} cap, ${lw.n} plies)`, lig, 'in']] });
  R_.sys = 'LEZ-57-140'; return [R_];
});
export { FAC, SCREW, RG400, B };
void FIXED; void GEO; void TGT; void MOUNT;
