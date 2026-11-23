// WPC8 — the openings block C's aileron chain and rudder conduit need in released parts that no block owns (ICD
// docs/icd/c_controls.md §8): LEZ-57-110 wing panel rev C, LEZ-57-116 jut-out rev B, LEZ-55-120 canard rev D (LEZ-57-152 rev
// C carries an interface check only: the tunnels cross the root aft of its close-out). The cuts go into each part's
// registry (cuts.js) before the records are built, so the solids, volumes and masses carry them; the checks here are the
// clearances of every cut from the structure it passes (caps, spar blocks, skins) and the lower-skin access openings.
// Solid frame, inches: x = BL, y = FS, z = WL; right side. Notional.
import { plyWeight } from '../plybook.js';
import { registerConduit } from './wp12_routing.js';
import { GEO, FIXED, BASE_MAT, registerChecks, mk, plyRF, psi, allowB, surfaceLoads, surfaceGeom, effective, materials, DEFAULT_DESIGN } from '../structures.js';
import { CTLS, ctlSection, ctlStations } from './wp19_ctl.js';
import { L, LINK, SZ, ROD_END, rudRoute, V, CONDUIT } from './wpC1_controls.js';
import { WCUTS, wingSegments, section } from './wp17_wing_panel.js';
import { JCUTS, JS, jutStations, jutSection, jutInboard, JEXTRA } from './wp20_jutout.js';
import { CCUTS, cnSegments } from './wp24_canard.js';
import { cutVol } from './cuts.js';
import { AFTC, AFT_TIP, TUNNEL_PTS, CS_TUNNELS, CONN, DISC } from './wpJ0_layout.js';   // option A: J's aft systems lane (wing rev E, jut-out rev C)

const { sub, add, mul, len, norm } = V, r4 = (x) => Math.round(x * 1e4) / 1e4, tB = BASE_MAT.BID.t, tS = FIXED.skinBID * tB, TGT = 0.15;
const YJ = GEO.join.y * 12, YT = GEO.wing.tipY * 12, FSB = L.K1b[0], WLA = L.WLA, FS_ = 1.5;
export const RT = { rod: SZ.ailRod[0] / 2 + 0.0625, cond: r4(CONDUIT.od / 2 + 0.0625) };   // tunnel radii: rod B and link C slide axially (1/16 in radial, phenolic-lined); conduit tunnel 1/16 in radial over CONDUIT.od (DC-005 review: was a fixed Ø 0.375, 0.031 in radial over the 3/16 in conduit)
const P = (p) => [p[1], p[0], p[2]];   // [FS, BL, WL] → solid frame [BL, FS, WL]
const along = (a, b, key, v) => { const u = (v - a[key]) / (b[key] - a[key]); return a.map((x, i) => x + (b[i] - x) * u); };

// ------------------------------------------------------------------------------------------- wing panel (rev C)
const wSeg = (y) => { const s = wingSegments(), f = y / 12; return s.find((q) => f >= q.ya - 1e-9 && f <= q.yb + 1e-9) || s.at(-1); };
const wSec = (y) => section(y / 12, wSeg(y));
const zOn = (poly, x) => { const z = []; for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length]; if ((a[0] - x) * (b[0] - x) <= 0 && a[0] !== b[0]) z.push(a[1] + (x - a[0]) / (b[0] - a[0]) * (b[1] - a[1])); } return z.length ? [Math.min(...z), Math.max(...z)] : [NaN, NaN]; };
/** the highest lower-skin inner face over a footprint (BL × FS), so a bay floor sits on the skin */
const floorOver = (bl, fs) => { let m = -Infinity; for (let i = 0; i <= 6; i++) for (let j = 0; j <= 6; j++) { const y = bl[0] + (bl[1] - bl[0]) * i / 6, x = fs[0] + (fs[1] - fs[0]) * j / 6; m = Math.max(m, zOn(wSec(y).oml, x)[0]); } return r4(m + tS + 0.01); };
/** the lowest upper-skin inner face over a footprint, so a bay's roof sits under the skin (its access cover) */
const ceilOver = (bl, fs) => { let m = Infinity; for (let i = 0; i <= 6; i++) for (let j = 0; j <= 6; j++) { const y = bl[0] + (bl[1] - bl[0]) * i / 6, x = fs[0] + (fs[1] - fs[0]) * j / 6; m = Math.min(m, zOn(wSec(y).oml, x)[1]); } return r4(m - tS - 0.01); };
export const WG = (() => {
  const K2d = L.K2d, Q2 = L.Q2, K2c = L.K2c, top = WLA + 0.75;
  // bay A round the rod-B end (K2d), clear above the lower cap; bay B round the pivot and the link-C arm, its floor on the lower skin (bracket, access)
  const fsAB = r4(Q2[0] - 0.7), bayA = { bl: [r4(K2d[1] - 0.6), r4(K2d[1] + 0.75)], fs: [r4(K2d[0] - 0.45), fsAB], floor: r4(WLA - 0.75) }, bayB = { bl: [bayA.bl[0], r4(K2c[1] + 0.6)], fs: [fsAB, r4(K2c[0] + 0.45)] };
  const disc = { bl: [r4(L.disc - 0.9), r4(L.disc + 0.9)], fs: [r4(FSB - 0.6), r4(FSB + 0.6)] };
  const cove = ctlSection('aileron', ctlStations('aileron')[0]), coveFS = r4(L.pinA[0] - CTLS.aileron.gap);   // the wing's cove face (the aileron hinge face less the gap)
  const relief = { bl: [L.relA[0], r4(L.pinA[1] + CTLS.aileron.horn.t + 0.06)], fs: [r4(L.hornA[0] - 0.7), coveFS], wl: [r4(L.hornA[2] - 0.4), r4(L.hornA[2] + 1.1)] };
  const r = rudRoute(1), iT = r.length - 3;
  void cove;
  return { bayA, bayB, disc, relief, top, coveFS, cond: r.slice(0, iT + 1), iT, P2: r[iT + 1],
    access: [{ id: 'acc-k2', what: 'K2 bay', bl: [r4(bayB.bl[0] + 0.2), r4(bayB.bl[1] - 0.2)], fs: [r4(bayB.fs[0] + 0.15), r4(bayB.fs[1] - 0.15)], shape: 'rounded rectangle, 0.5 in corner radii' }, { id: 'acc-disc', what: 'rod-B disconnect', d: 1.5, at: [L.disc, FSB] } ] };
})();
// the spanwise systems conduit (coordinator, 2026-11-19): block I's wingtip-light harness LEZ-33-110 (both wings), block J's
// GMU 11 harness LEZ-31-121 (left) and COM coax LEZ-23-110 (right) in one 3/4 OD × 0.035 nylon conduit (ID 0.68), in a
// Ø 0.80 tunnel: from the jut-out's front wall (where J's CS-spar systems tunnel, rev F, comes out) above the K1 bay and the
// rudder conduit, along FS 157.3 to the root, through a connector bay at BL 46–50 (the root disconnects: I's light
// connector, J's GMU 4-pin + shield and an inline BNC, reached through an upper-skin cover), then outboard just aft of
// the wing spar block, over the rod-B disconnect and the K2 bay, to the tip close-out. Right side given, left mirrored.
// Option A ("swap lanes", Miles, 2026-11-19): the conduit and its bay now carry the light harness alone; J's lines have
// their own aft lane (AFTC below, from J's layout).
export const SYSC = { r: 0.40, conduit: '3/4 OD × 0.035 nylon conduit (ID 0.68)', lines: ['LEZ-33-110 wingtip light harness (I), both wings (alone since option A)'],
  jut: [[r4(S0J()), 12.9, 39.5], [131.80, 21.0, 39.5], [131.80, 38.0, 39.44], [131.80, 43.0, 39.42], [131.80, YJ, 39.4]],
  wing: [[131.80, YJ, 39.4], [131.90, 50.0, 39.3], [134.50, 64.0, 39.0], [165.00, 145.8, 37.0], [165.50, 149.2, 37.0]],
  bay: { bl: [38.0, 43.0], fs: [128.80, 132.25] }, opening: { id: 'acc-sys', what: 'systems connector bay (jut-out upper skin)', bl: [38.4, 42.6], fs: [129.00, 131.25], shape: 'rounded rectangle, 0.5 in corner radii', at45: true } };
function S0J() { return jutStations()[0]; }
{ const W = WG, flr = (b) => floorOver(b.bl, b.fs);
  W.bayA.wl = [W.bayA.floor, W.top]; W.bayB.wl = [flr(W.bayB), W.top]; W.disc.wl = [flr(W.disc), r4(WLA + 0.55)];
  const box = (id, feat, b) => ({ id, feat, k: 'box', lo: [b.bl[0], b.fs[0], b.wl[0]], hi: [b.bl[1], b.fs[1], b.wl[1]] });
  const cyl = (id, feat, a, b, r, ext = [0, 0]) => ({ id, feat, k: 'cyl', a: P(a), b: P(b), r, ext });
  // rod B: root face → disconnect void → K2 bay
  WCUTS.push(cyl('rodB-1', 'tunnel', [FSB, YJ, WLA], [FSB, W.disc.bl[0], WLA], RT.rod, [2.0, 0]), box('disc', 'access', W.disc), cyl('rodB-2', 'tunnel', [FSB, W.disc.bl[1], WLA], [FSB, W.bayA.bl[0], WLA], RT.rod),
    box('k2-a', 'bay', W.bayA), box('k2-b', 'bay', W.bayB), cyl('linkC', 'tunnel', L.K2c, L.hornA, RT.rod), box('relief', 'relief', W.relief));
  // conduit: from the root face to the tip close-out (the fairlead at T, then out through the tip face toward the fin pulley)
  const c = W.cond, i0 = c.findIndex((q, i) => i > 0 && q[1] > YJ && c[i - 1][1] <= YJ), a0 = along(c[i0 - 1], c[i0], 1, YJ);
  const pts = [a0, ...c.slice(i0)];
  pts.slice(1).forEach((q, k) => WCUTS.push(cyl(`cond-${k + 1}`, 'tunnel', pts[k], q, RT.cond, [k === 0 ? 2.0 : 0, 0])));
  const tip = along(c.at(-1), W.P2, 1, YT); WCUTS.push(cyl(`cond-${pts.length}`, 'tunnel', c.at(-1), tip, RT.cond, [0, 2.0]));
  // systems conduit (its connector bay is in the jut-out)
  const sw = SYSC.wing; sw.slice(1).forEach((q, k) => WCUTS.push(cyl(`sys-${k + 1}`, 'tunnel', sw[k], q, SYSC.r, [k === 0 ? 2.0 : 0, 0])));
  WCUTS.push(cyl(`sys-${sw.length}`, 'tunnel', sw.at(-1), along(sw.at(-1), add(sw.at(-1), [0.4, 1, 0]), 1, YT), SYSC.r, [0, 2.0]));
  // rev E (option A): the aft systems conduit, root face → tip face on the line to the right fin's root (both panels: the
  // left one carries the GMU 11 harness to BL 86, the right the COM coax to the fin)
  const aw = AFTC.wing; aw.slice(1).forEach((q, k) => WCUTS.push(cyl(`aft-${k + 1}`, 'tunnel', aw[k], q, AFTC.r, [k === 0 ? 2.0 : 0, 0])));
  WCUTS.push(cyl(`aft-${aw.length}`, 'tunnel', aw.at(-1), along(aw.at(-1), AFT_TIP(), 1, YT), AFTC.r, [0, 2.0]));
}

// ------------------------------------------------------------------------------------------- jut-out (rev B)
const S0 = jutStations()[0];
/** the lowest upper-skin inner face of the jut-out over a footprint (BL × FS) */
/** the highest lower-skin inner face of the jut-out over a footprint (BL × FS), so a bay's floor sits on the skin */
const floorJ = (bl, fs) => { let m = -Infinity; for (let i = 0; i <= 6; i++) for (let j = 0; j <= 6; j++) { const y = bl[0] + (bl[1] - bl[0]) * i / 6, x = fs[0] + (fs[1] - fs[0]) * j / 6; m = Math.max(m, zOn(jutSection(x, {}).oml, Math.min(y, YJ - 1e-6))[0]); } return r4(m + tS + 0.01); };
const ceilJ = (bl, fs) => { let m = Infinity; for (let i = 0; i <= 6; i++) for (let j = 0; j <= 6; j++) { const y = bl[0] + (bl[1] - bl[0]) * i / 6, x = fs[0] + (fs[1] - fs[0]) * j / 6; m = Math.min(m, zOn(jutSection(x, {}).oml, y)[1]); } return r4(m - tS - 0.01); };
export const JG = (() => {
  const pts = [L.X, L.K1a, L.Q1, L.K1b], blMax = r4(Math.max(...pts.map((p) => p[1])) + 0.7), fsMax = r4(Math.max(...pts.map((p) => p[0])) + 0.45);
  const y0min = Math.min(...jutStations().filter((s) => s <= fsMax + 1).map(jutInboard));
  return { bay: { bl: [r4(y0min - 0.5), blMax], fs: [r4(S0), fsMax], wl: [r4(WLA - 0.65), r4(WLA + 0.65)] } };
})();
/** the K1 bay's volume inside the jut-out: it runs out through the inboard close-out (open), whose line is linear in FS between stations */
const bayVolJ = () => { const b = JG.bay, st = jutStations(); let v = 0;
  for (let i = 0; i < st.length - 1; i++) { const a = Math.max(st[i], b.fs[0]), c = Math.min(st[i + 1], b.fs[1]); if (c <= a) continue;
    const y = (s) => jutInboard(st[i]) + (jutInboard(st[i + 1]) - jutInboard(st[i])) * (s - st[i]) / (st[i + 1] - st[i]); v += (c - a) * ((b.bl[1] - y(a)) + (b.bl[1] - y(c))) / 2; }
  return v * (b.wl[1] - b.wl[0]); };
{ const b = JG.bay, cyl = (id, feat, a, c, r, ext = [0, 0]) => ({ id, feat, k: 'cyl', a: P(a), b: P(c), r, ext });
  JCUTS.push({ id: 'k1-bay', feat: 'bay', k: 'clip', lo: [b.bl[0], b.fs[0], b.wl[0]], hi: [b.bl[1], b.fs[1], b.wl[1]], get vol() { return bayVolJ(); } });
  JCUTS.push(cyl('rodB', 'tunnel', [FSB, b.bl[1], WLA], [FSB, YJ, WLA], RT.rod, [0, 2.0]));
  const r = rudRoute(1), iF = r.findIndex((q) => q[0] > S0 - 1e-9 && q[1] > 11), a0 = along(r[iF - 1], r[iF], 0, S0), iE = r.findIndex((q) => q[1] > YJ), e = along(r[iE - 1], r[iE], 1, YJ);
  const pts = [a0, ...r.slice(iF, iE), e];
  pts.slice(1).forEach((q, k) => JCUTS.push(cyl(`cond-${k + 1}`, 'tunnel', pts[k], q, RT.cond, [k === 0 ? 2.0 : 0, k === pts.length - 2 ? 2.0 : 0])));
  const sj = SYSC.jut, sb = SYSC.bay; sb.wl = [38.55, ceilJ(sb.bl, sb.fs)];
  JCUTS.push(cyl('sys-1', 'tunnel', sj[0], sj[1], SYSC.r, [2.0, 0]), cyl('sys-2', 'tunnel', sj[1], sj[2], SYSC.r), { id: 'sys-bay', feat: 'bay', k: 'box', lo: [sb.bl[0], sb.fs[0], sb.wl[0]], hi: [sb.bl[1], sb.fs[1], sb.wl[1]] }, cyl('sys-3', 'tunnel', sj[3], sj[4], SYSC.r, [0, 2.0]));
  // rev C (option A): the aft lane from the front wall (on the line from the CS spar's low tunnel) under the K1 bay, over the
  // drag fitting's arm and under the rudder conduit to the aft root connector bay, which opens through the root face; its
  // floor is the lower skin (the access opening and cover below it)
  const aj = AFTC.jut, t0 = TUNNEL_PTS(1, 1)[1], af = along(t0, aj[0], 0, S0), ab = AFTC.bay;
  ab.wl = [floorJ(ab.bl, ab.fs), ab.top];
  JCUTS.push(cyl('aft-1', 'tunnel', af, aj[0], AFTC.liner.r, [2.0, 0]), cyl('aft-2', 'tunnel', aj[0], aj[1], AFTC.r), cyl('aft-3', 'tunnel', aj[1], aj[2], AFTC.r),
    { id: 'aft-bay', feat: 'bay', k: 'box', lo: [ab.bl[0], ab.fs[0], ab.wl[0]], hi: [ab.bl[1], ab.fs[1], ab.wl[1]] });
  // final integration: the conduits as supports for the routing pass (wp12 CONDUITS: no clamps inside them; mouths supported)
  registerConduit({ id: 'sysc-jut', what: 'C\'s systems conduit, jut-out (front wall → connector bay)', pts: [sj[0], sj[1], sj[2]], r: SYSC.r, mirror: true });
  registerConduit({ id: 'sysc-wing', what: 'C\'s systems conduit, jut-out bay → wing tip', pts: [sj[3], ...SYSC.wing.slice(1)], r: SYSC.r, mirror: true });
  registerConduit({ id: 'aft-jut', what: 'aft lane: CS spar low tunnel, jut-out liner and conduit to the aft root bay', pts: [...TUNNEL_PTS(1, 1), af, ...aj.slice(0, 3)], r: AFTC.r, mirror: true });
  registerConduit({ id: 'aft-wing', what: 'aft lane: wing aft conduit, root face → tip face', pts: [...AFTC.wing, along(AFTC.wing.at(-1), AFT_TIP(), 1, YT)], r: AFTC.r, mirror: true });
}

// ------------------------------------------------------------------------------------------- canard (rev D): the cove-lip relief
const clipArea = (poly, R) => { // Sutherland–Hodgman against the rectangle [x0, x1] × [z0, z1], then the area
  let out = poly; const edges = [[(p) => p[0] >= R[0], 0, R[0]], [(p) => p[0] <= R[1], 0, R[1]], [(p) => p[1] >= R[2], 1, R[2]], [(p) => p[1] <= R[3], 1, R[3]]];
  for (const [inside, k, v] of edges) { const inp = out; out = []; for (let i = 0; i < inp.length; i++) { const a = inp[i], b = inp[(i + 1) % inp.length], ia = inside(a), ib = inside(b);
    if (ia) out.push(a); if (ia !== ib) { const u = (v - a[k]) / (b[k] - a[k]); out.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]); } } if (!out.length) return 0; }
  return Math.abs(out.reduce((s, p, i) => { const q = out[(i + 1) % out.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0)) / 2; };
export const CG = (() => {
  const st = ctlStations('elevator'), se = ctlSection('elevator', st[0]), pin = se.pts[25], cove = GEO.canard.elevator[0] * 12;
  return { bl: [r4(cove), r4(cove + 0.30)], fs: [r4(pin[0] - 0.06 - 0.30), r4(pin[0] - 0.06)], wl: [r4(pin[1] - 0.40), r4(pin[1] + 0.30)], pin };
})();
{ const c = CG, seg = cnSegments().find((s) => c.bl[0] / 12 >= s.a - 1e-9 && c.bl[1] / 12 <= s.b + 1e-9) || cnSegments().find((s) => (c.bl[0] + c.bl[1]) / 24 >= s.a - 1e-9 && (c.bl[0] + c.bl[1]) / 24 <= s.b + 1e-9), R = [c.fs[0], c.fs[1], c.wl[0], c.wl[1]];
  const A = clipArea(seg.regions.oml[0], R), B = clipArea(seg.regions.oml[1], R);   // constant-chord canard: the segment is prismatic, A = B
  CCUTS.push({ id: 'lip', feat: 'relief', k: 'clip', lo: [c.bl[0], c.fs[0], c.wl[0]], hi: [c.bl[1], c.fs[1], c.wl[1]], vol: (A + B) / 2 * (c.bl[1] - c.bl[0]) }); CG.areas = [A, B]; }

// ------------------------------------------------------------------------------------------- clearance rules (cuts vs structure)
/** sample the surface of a cut (solid frame) and return points [FS, BL, WL] */
const cutPts = (c) => { const o = [];
  if (c.k === 'cyl') { const a = [c.a[1], c.a[0], c.a[2]], b = [c.b[1], c.b[0], c.b[2]], u = norm(sub(b, a)), n1 = norm(Math.abs(u[2]) < 0.9 ? [u[1], -u[0], 0] : [1, 0, 0]), n2 = [u[1] * n1[2] - u[2] * n1[1], u[2] * n1[0] - u[0] * n1[2], u[0] * n1[1] - u[1] * n1[0]];
    for (let i = 0; i <= 10; i++) for (let k = 0; k < 12; k++) { const t = 2 * Math.PI * k / 12, q = add(add(a, mul(sub(b, a), i / 10)), add(mul(n1, c.r * Math.cos(t)), mul(n2, c.r * Math.sin(t)))); o.push(q); } }
  else for (let i = 0; i <= 4; i++) for (let j = 0; j <= 4; j++) for (let k = 0; k <= 4; k++) o.push([c.lo[1] + (c.hi[1] - c.lo[1]) * j / 4, c.lo[0] + (c.hi[0] - c.lo[0]) * i / 4, c.lo[2] + (c.hi[2] - c.lo[2]) * k / 4]);
  return o; };
const inPoly = (x, z, poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, zi] = poly[i], [xj, zj] = poly[j]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) c = !c; } return c; };
const polyDist = (x, z, poly) => { let m = Infinity; for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length], dx = b[0] - a[0], dz = b[1] - a[1], u = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1))); m = Math.min(m, Math.hypot(x - a[0] - u * dx, z - a[1] - u * dz)); } return inPoly(x, z, poly) ? -m : m; };
/** least clearance (in) of the wing cuts from every structural region and from the skins' inner faces (skins: OML − tS) */
export function wingClear() { let m = { d: Infinity }; for (const c of WCUTS) { if (c.feat === 'relief') continue;
  for (const q of cutPts(c)) { if (q[1] < YJ + 1e-6 || q[1] > YT - 1e-6) continue; const y = q[1], R = wSec(y);
    for (const [k, poly] of Object.entries(R)) { const zz = k === 'oml' ? zOn(poly, q[0]) : null, d = k === 'oml' ? (Number.isNaN(zz[0]) ? Infinity : Math.min(zz[1] - q[2], q[2] - zz[0]) - tS) : polyDist(q[0], q[2], poly); if (k === 'oml' && (((c.id === 'disc' || c.id === 'k2-b') && q[2] < c.lo[2] + 1e-6) || (c.id === 'sys-bay' && q[2] > c.hi[2] - 1e-6))) continue; if (d < m.d) m = { d, k, c: c.id, q }; } } } return m; }
/** final integration: the same clearance for a given list of cuts (right-panel frame, BL > 0), with an optional
 *  skip(cut, region, point) for intended crossings (the left panel's GMU 11 branch through the spar web at its grommet) */
export function wingClearOf(cuts, skip = () => false) { let m = { d: Infinity }; for (const c of cuts) for (const q of cutPts(c)) { if (q[1] < YJ + 1e-6 || q[1] > YT - 1e-6) continue; const R = wSec(q[1]);
  for (const [k, poly] of Object.entries(R)) { if (skip(c, k, q)) continue; const zz = k === 'oml' ? zOn(poly, q[0]) : null, d = k === 'oml' ? (Number.isNaN(zz[0]) ? Infinity : Math.min(zz[1] - q[2], q[2] - zz[0]) - tS) : polyDist(q[0], q[2], poly); if (d < m.d) m = { d, k, c: c.id, q }; } } return m; }
/** the wing section's regions at BL y (in): oml, cap_upper / cap_lower, block (the spar block under the web), as polygons (FS, WL) */
export const wingRegions = (y) => wSec(y);
/** the lower skin's inner face (WL, in) at (BL, FS) */
export const wingFloor = (bl, fs) => r4(zOn(wSec(bl).oml, fs)[0] + tS);
export const wingCeil = (bl, fs) => r4(zOn(wSec(bl).oml, fs)[1] - tS);
export const cutDist = (a, b) => cutD(a, b);
export function jutClear() { let m = { d: Infinity }; for (const c of JCUTS) for (const q of cutPts(c)) { if (q[0] < S0 + 1e-6 || q[1] > YJ - 1e-6 || (c.id === 'sys-bay' && q[2] > c.hi[2] - 1e-6) || (c.id === 'aft-bay' && q[2] < c.lo[2] + 1e-6)) continue; const R = jutSection(q[0], { cap: Math.abs(q[0] - JS.sB) < JS.b / 2, blk: Math.abs(q[0] - JS.sB) < JS.wBlk / 2 });
  for (const [k, poly] of Object.entries(R)) { if (k === 'oml' && q[1] <= jutInboard(q[0]) + 1e-6) continue; const zz = k === 'oml' ? zOn(poly, q[1]) : null, d = k === 'oml' ? (q[1] < jutInboard(q[0]) + 0.02 || Number.isNaN(zz[0]) ? Infinity : Math.min(zz[1] - q[2], q[2] - zz[0]) - tS) : polyDist(q[1], q[2], poly); if (d < m.d) m = { d, k, c: c.id, q }; } } return m; }

// ------------------------------------------------------------------------------------------- the lower-skin openings (wing)
/** skin shear flow at a station from the wing torque, the opening as a hole in shear (K_t 4, the doubler carrying it with the skin) */
export const ACC = { nD: 2, ring: 1.0 };   // ring doublers: BID ±45 plies each face of the opening, width (in)
const accRows = (d, lc, M) => { const Lw = surfaceLoads('wing', d, lc); if (!Lw) return [];
  const GM = surfaceGeom('wing'), out = [], bid = (k) => Array.from({ length: k }, () => ({ mat: 'BID', angle: 45 }));
  for (const a of [...WG.access, SYSC.opening, AFTC.opening, ...EXTRA_OPENINGS]) { const y = a.at45 ? YJ : a.at ? a.at[0] : (a.bl[0] + a.bl[1]) / 2, s = GM.sec(y / 12), A = 0.685 * s.h * s.c * 12, T = Math.abs(Lw.at(y / 12).T), q = d.FS * T / (2 * A), Kt = 4.0;
    const rf = plyRF(bid(FIXED.skinBID + ACC.nD), [0, 0, Kt * q], M);
    out.push({ a, y, q, Kt, rf, A, T }); }
  return out; };
/** further lower-skin openings in the wing's shear cell, at |BL| (final integration: the left panel's GMU 11 cover, block A) */
export const EXTRA_OPENINGS = [];
/** the K2 bracket on the lower skin: 4 × AN3 with AN970 washers (Ø 0.875) through skin + a BID pad, bolt rows 2.0 in apart */
export const K2B = { D: 0.1875, washer: 0.875, couple: 2.0, h: 2.25 };
function k2Bracket(d, M, n) { const P = 2 * LINK.ailRod, t = (FIXED.skinBID + n) * tB, Fb = psi(M.BID.Fbru), brg = Fb / (1.15 * d.FS * P / 4 / (K2B.D * t)) - 1;
  const Mo = P * K2B.h, Pt = Mo / K2B.couple / 2, ils = psi(M.GUD.ILSS), pull = ils / (1.15 * d.FS * Pt / (Math.PI * K2B.washer * t)) - 1; return { P, t, n, brg, pull, Mo, Pt, ils, Fb }; }
/** the K2 pad: BID plies over the skin under the bracket, sized for bearing and pull-through at the sizing reserve */
export const K2PAD = (() => { const d = effective(DEFAULT_DESIGN), M = materials(d); let n = 2; while (n < 30) { const k = k2Bracket(d, M, n); if (Math.min(k.brg, k.pull) >= TGT) break; n++; } return { n, w: 3.0, l: 3.5 }; })();
registerChecks('wpC8-access', (d, lc, Z, M) => {
  const rows = accRows(d, lc, M); if (!rows.length) return [];
  const w = rows.reduce((a, r) => (r.rf.rf < a.rf.rf ? r : a));
  const K = k2Bracket(d, M, K2PAD.n);
  const ms = Math.min(w.rf.rf - 1, K.brg, K.pull);
  const row = mk('wing', 'wing-access', 'Wing lower-skin openings (K2 bay, rod-B disconnect) and the K2 bracket (rev C)', lc, `BL ${w.y.toFixed(1)}, aft of the spar`, ms === K.brg ? 'K2 bracket bolt bearing' : ms === K.pull ? 'K2 bracket bolt pull-through' : `skin + doubler ${w.rf.mode}`, ms, {
    formula: 'q = FS·T / (2·A_cell), A_cell = 0.685·h·c;  at the opening N_xy = K_t·q (K_t 4, open hole in shear) on skin + ring doubler, CLT first-ply;  K2 bracket: 4 × AN3 through skin + K2 pad, P = 2·P_rod × 1.15, bearing P/4/(D·t), pull-through (P·h)/couple/2 on an AN970 washer (Ø 0.875)',
    inputs: [['Wing torque at the opening (limit)', w.T, 'inlb', 'SCHRENK'], ['Cell area', w.A, 'in2', 'MODEL'], ['Stress concentration K_t', w.Kt, '', 'BOUND: 4 is the open circular hole in pure shear; the rounded opening and its ring doubler are lower'], ['Skin + ring doubler', `${FIXED.skinBID} + ${ACC.nD} × 6781 ±45, ring ${ACC.ring} in wide`, 'text', 'SIZED'],
      ['K2 pivot reaction (limit)', K.P, 'lb', 'DERIVED: 2 × LEZ-27-142 rod load'], ['K2 pad', `${K.n} × 6781 ±45 over the ${FIXED.skinBID} × 6781 skin, ${K2PAD.w} × ${K2PAD.l} in; pivot ${K2B.h} in above the skin, bolt rows ${K2B.couple} in apart`, 'text', 'SIZED'], ['Bearing allowable', K.Fb, 'psi', allowB(K.brg, 'compressive strength (bearing not published)')], ['Pull-through allowable (ILSS)', K.ils, 'psi', allowB(K.pull, 'interlaminar shear strength')], ['Fitting factor', 1.15, '', 'FAR 23.625'], ['Factor of safety', d.FS, '', 'FAR23 (23.303)']],
    result: [['q (ult.)', w.q, 'lbin'], ['N_xy at the edge (ult.)', w.Kt * w.q, 'lbin'], ['Bracket moment (limit)', K.Mo, 'inlb']] });
  row.sys = 'LEZ-57-110'; return [row];
});

// ------------------------------------------------------------------------------------------- what the records show
const fq = (q) => `FS ${r4(q[0])}, BL ${r4(q[1])}, WL ${r4(q[2])}`;
export const CUTS_TXT = {
  /** rev E (wing) / rev C (jut-out): the aft systems lane (option A) */
  wingAft: () => `aft systems conduit Ø ${2 * AFTC.r} (${AFTC.conduit}) from the root face (${fq(AFTC.wing[0])}) under rod B (${fq(AFTC.wing[1])}), past the K2 bay and over link C (${fq(AFTC.wing[3])}) to ${fq(AFTC.wing.at(-1))} and out through the tip face on the line to the right fin's root (${fq(AFT_TIP())}); between C's systems conduit and the rudder conduit, ≥ 2.6 in from the light harness's axis. Left panel: the GMU 11 harness leaves it at BL ${AFTC.exitBL} through a grommeted side port; right panel: the COM coax to the fin`,
  jutAft: () => { const b = JCUTS.find((c) => c.id === 'aft-bay'), o = AFTC.opening; return `aft lane from the front wall (on the CS spar's low tunnel, ${fq(TUNNEL_PTS(1, 1)[1])}): a lined hole Ø ${2 * AFTC.liner.r} (${AFTC.liner.what}) under the K1 bay to BL ${AFTC.jut[0][1]}, then a tunnel Ø ${2 * AFTC.r} (${AFTC.conduit}) over the drag fitting's arm and under the rudder conduit; through ${AFTC.jut.slice(0, 3).map(fq).join(', ')}; aft root connector bay BL ${b.lo[0]}–${b.hi[0]} (open through the root face), FS ${b.lo[1]}–${b.hi[1]}, WL ${b.lo[2]}–${b.hi[2]} (the inline BNC, right; the GMU 11 circular connector, left), floor on the lower skin, reached through a ${r4(o.bl[1] - o.bl[0])} × ${r4(o.fs[1] - o.fs[0])} in lower-skin opening with a ${ACC.nD}-ply ring doubler and a cover on nutplates`; },
  wing: () => { const W = WG; return { tunnels: `Tunnels in the core, phenolic-lined: rod B Ø ${r4(2 * RT.rod)} on FS ${r4(FSB)}, WL ${WLA} from the root face to the K2 bay (through the disconnect void BL ${W.disc.bl[0]}–${W.disc.bl[1]}); link C Ø ${r4(2 * RT.rod)} from the bay to the cove-end relief; rudder conduit Ø ${2 * RT.cond} from the root face (FS ${r4(along(rudRoute(1)[rudRoute(1).findIndex((q) => q[1] > YJ) - 1], rudRoute(1)[rudRoute(1).findIndex((q) => q[1] > YJ)], 1, YJ)[0])}) to the tip close-out fairlead; systems conduit Ø ${2 * SYSC.r} (${SYSC.conduit}) from the root face (FS ${SYSC.wing[0][0]}, WL ${SYSC.wing[0][2]}) just aft of the spar block, over the rod-B disconnect and the K2 bay, to the tip close-out (FS ${SYSC.wing.at(-1)[0]}, WL ${SYSC.wing.at(-1)[2]})`,
    bay: `K2 bay BL ${W.bayA.bl[0]}–${W.bayB.bl[1]}, FS ${W.bayA.fs[0]}–${W.bayB.fs[1]}, floor on the lower skin, top WL ${W.top}; K2 on an AN4 pivot in a 6061-T6 angle bracket on the lower skin, 4 × AN3 with AN970 washers through the skin and a ${K2PAD.n}-ply 6781 ±45 pad ${K2PAD.w} × ${K2PAD.l} in`,
    access: `Lower-skin openings: K2 bay ${r4(W.access[0].bl[1] - W.access[0].bl[0])} × ${r4(W.access[0].fs[1] - W.access[0].fs[0])} in (0.5 in corner radii) and Ø ${W.access[1].d} at the rod-B disconnect (BL ${L.disc}); ${ACC.nD} × 6781 ±45 ring doublers ${ACC.ring} in wide; 0.032 2024-T3 covers on K1000-08 nutplates`,
    relief: `Cove-end relief at the aileron horn: BL ${W.relief.bl[0]}–${W.relief.bl[1]}, FS ${W.relief.fs[0]}–${W.relief.fs[1]}, WL ${W.relief.wl[0]}–${W.relief.wl[1]}, the cove-end close-out laid into it` }; },
  jut: () => `K1 bay BL ${JG.bay.bl[0]}–${JG.bay.bl[1]} (open through the inboard close-out), FS ${JG.bay.fs[0]}–${JG.bay.fs[1]} (open through the front wall for the K1 bracket on the CS spar), WL ${JG.bay.wl[0]}–${JG.bay.wl[1]}; rod-B tunnel Ø ${r4(2 * RT.rod)} on FS ${r4(FSB)}, WL ${WLA} to the root face; conduit tunnel Ø ${2 * RT.cond} from the front wall to the root face; systems conduit tunnel Ø ${2 * SYSC.r} from the front wall at BL ${SYSC.jut[0][1]}, WL ${SYSC.jut[0][2]} (J's CS-spar systems tunnel exit) along FS ${SYSC.jut[1][0]} to the root face, through the systems connector bay BL ${SYSC.bay.bl[0]}–${SYSC.bay.bl[1]}, FS ${SYSC.bay.fs[0]}–${SYSC.bay.fs[1]}, WL ${SYSC.bay.wl[0]} to the upper skin (root disconnects for the light harness, the GMU 11 harness and the COM coax; ${r4(SYSC.opening.bl[1] - SYSC.opening.bl[0])} × ${r4(SYSC.opening.fs[1] - SYSC.opening.fs[0])} in upper-skin opening with a ${ACC.nD}-ply ring doubler and a cover on nutplates)`,
  canard: () => `Cove-lip relief for the elevator horn root: BL ±${CG.bl[0]}–${CG.bl[1]}, FS ${CG.fs[0]}–${CG.fs[1]} (0.30 in into the lip ahead of the cove face), WL ${CG.wl[0]}–${CG.wl[1]} through the lower skin; edges sealed with flox`,
};
export const ACC_LB = () => { const W = WG, rect = (q) => 2 * ((q.bl[1] - q.bl[0]) + (q.fs[1] - q.fs[0]) + 4 * ACC.ring) * ACC.ring, ringA = rect(W.access[0]) + Math.PI * (W.access[1].d + ACC.ring) * ACC.ring;
  const cov = (q) => (q.bl[1] - q.bl[0] + 1) * (q.fs[1] - q.fs[0] + 1), dbl = ringA / 144 * plyWeight('BID', 1, 1) * ACC.nD, covers = (cov(W.access[0]) + (W.access[1].d + 1) ** 2) * 0.032 * 0.100, hw = 14 * 0.004 + 4 * 0.012 + 4 * 0.010, bracket = 0.10 + K2PAD.n * K2PAD.w * K2PAD.l / 144 * plyWeight('BID', 1, 1), conduit = 0.012 * 210 / 12 * 2 * 0;
  void conduit;
  return { dbl, covers, hw, bracket, lb: dbl + covers + hw + bracket }; };
void cutVol; void ROD_END; void len;
/** the cove-end relief's margin to the skins' inner faces (in), at its four plan corners */
export function reliefClear() { const R = WG.relief; let m = Infinity; for (const y of R.bl) for (const x of R.fs) { const z = zOn(wSec(Math.min(Math.max(y, YJ), YT)).oml, x); m = Math.min(m, z[1] - tS - R.wl[1], R.wl[0] - (z[0] + tS)); } return m; }
/** the disconnect opening's edge to the jut-out drag-spar caps' lap on the panel skins (BL 45 to 45 + L_ov, FS s_B ± b/2) */
export function lapClear() { const a = WG.access[1], r = a.d / 2 + ACC.ring; const dBL = a.at[0] - r - (YJ + JS.Lov), dFS = (JS.sB - JS.b / 2) - (a.at[1] + r); return Math.max(dBL, dFS); }
/** the canard lip relief: share of the elevator's hinge-leaf bond on the canard it removes, and its margin to the caps (in) */
export function lipRule() { const st = ctlStations('elevator'), L0 = (st.at(-1) - st[0]) * 12, cut = Math.max(0, CG.bl[1] - st[0] * 12); return { kept: 1 - cut / L0, cut }; }

/** the systems conduit's least clearance (in) to block C's other cuts (rod B, rudder conduit, K1 / K2 bays, link C, the
 *  disconnect void) in the wing and the jut-out; its connector bay's to them; rule ≥ 0.25 in for the tunnel, 0.10 for the bay */
const segD = (p1, q1, p2, q2) => { const d1 = sub(q1, p1), d2 = sub(q2, p2), r = sub(p1, p2), a = d1.reduce((s_, v) => s_ + v * v, 0), e = d2.reduce((s_, v) => s_ + v * v, 0), f = d2.reduce((s_, v, i) => s_ + v * r[i], 0); let s_, t;
  const c = d1.reduce((x, v, i) => x + v * r[i], 0), b = d1.reduce((x, v, i) => x + v * d2[i], 0), den = a * e - b * b; s_ = den > 1e-12 ? Math.min(1, Math.max(0, (b * f - c * e) / den)) : 0; t = (b * s_ + f) / e;
  if (t < 0) { t = 0; s_ = Math.min(1, Math.max(0, -c / a)); } else if (t > 1) { t = 1; s_ = Math.min(1, Math.max(0, (b - c) / a)); } return len(sub(add(p1, mul(d1, s_)), add(p2, mul(d2, t)))); };
const boxD = (p, c) => Math.hypot(...[0, 1, 2].map((i) => Math.max(c.lo[i] - p[i], 0, p[i] - c.hi[i])));
const cutD = (a, b) => { if (a.k === 'cyl' && b.k === 'cyl') return segD(a.a, a.b, b.a, b.b) - a.r - b.r; const [cy, bx] = a.k === 'cyl' ? [a, b] : [b, a]; if (cy.k !== 'cyl') return Math.max(...[0, 1, 2].map((i) => Math.max(a.lo[i] - b.hi[i], b.lo[i] - a.hi[i]))); let m = Infinity; for (let k = 0; k <= 40; k++) m = Math.min(m, boxD(add(cy.a, mul(sub(cy.b, cy.a), k / 40)), bx)); return m - cy.r; };
export function sysClear() { let t = { d: Infinity }, b = { d: Infinity };
  for (const L_ of [WCUTS, JCUTS]) for (const c of L_.filter((x) => x.id.startsWith('sys'))) for (const o of L_.filter((x) => !x.id.startsWith('sys'))) { const d = cutD(c, o), w = c.id === 'sys-bay' ? b : t; if (d < w.d) Object.assign(w, { d, a: c.id, b: o.id }); }
  return { tunnel: t, bay: b }; }
/** the aft lane (option A): least clearance (in) of its tunnels and bay to every other cut in the wing and the jut-out
 *  (C's rod B, link C, rudder conduit, K1 / K2 bays, the disconnect void, the systems conduit and its bay); rule ≥ 0.15 in */
export const AFT_RULE = 0.15;
export function aftClear() { let w = { d: Infinity };
  for (const L_ of [WCUTS, JCUTS]) for (const c of L_.filter((x) => x.id.startsWith('aft'))) for (const o of L_.filter((x) => !x.id.startsWith('aft'))) { const d = cutD(c, o); if (d < w.d) w = { d, a: c.id, b: o.id }; }
  return w; }
/** the drag fitting's arm (LEZ-57-141, on the CS spar's aft face at BL 26.4, along the jut-out's lower skin to FS 159.5) and
 *  the aft lane over it: least clearance (in); rule ≥ 0.25 in (a moving-free bought part: J's rule for partner parts) */
export function aftArm(drg) { const x0 = JS.yB - drg.Wa / 2, x1 = JS.yB + drg.Wa / 2, z1 = 35.1664 + drg.zA + drg.ta, f1 = 127.5 + drg.yEnd;
  const box = { lo: [x0, 127.5, 35.1664 + drg.zA], hi: [x1, f1, z1] }; let m = Infinity;
  for (const c of JCUTS.filter((x) => x.id.startsWith('aft') && x.k === 'cyl')) m = Math.min(m, cutD(c, { k: 'box', ...box }));
  return { d: m, box }; }
/** the root disconnects in the aft root bay: each connector body (CONN, typed) inside the bay by ≥ 0.10 in, and the bay's
 *  root-face opening passes it with ≥ 0.10 in all round (the wing-side pigtail and its connector pull out with the wing) */
export function aftBayFit() { const b = JCUTS.find((c) => c.id === 'aft-bay'), out = [];
  for (const k of ['com', 'mag']) { const p = DISC[k], c = CONN[k], y = Math.abs(p[1]), r = c.d / 2;
    const inside = Math.min(p[0] - r - b.lo[1], b.hi[1] - p[0] - r, p[2] - r - b.lo[2], b.hi[2] - p[2] - r, y - c.L / 2 - b.lo[0], b.hi[0] - (y + c.L / 2));
    const pass = Math.min((b.hi[1] - b.lo[1]) - c.d, (b.hi[2] - b.lo[2]) - c.d) / 2; out.push({ k, inside, pass, d: c.d }); }
  return out; }
/** the aft conduit's bore: the run's cable (RG-400 0.195 / the GMU harness 0.25, typed) fills ≤ 40 % of the conduit's bore area
 *  (practice, typed); the BNC is not pulled through it (crimped at the root after the pull). The short lined legs (the CS
 *  spar's low tunnel, the jut-out's leg under the K1 bay) pass the cable with ≥ 0.06 in diametral clearance (typed) */
export const aftFill = (dIn) => (dIn / AFTC.id) ** 2;
export const aftLinerGap = (dIn) => AFTC.liner.id - dIn;
/** distance (in) from the GMU 11 (block J's LEZ-31-122, left wing) to the left systems conduit and to block C's left lines */
export function gmuGap(gmu) { if (!gmu) return null; const g = [-gmu[1], gmu[0], gmu[2]].map((v) => v * 12), m = (c) => { if (c.k !== 'cyl') return boxD(g, c); let d = Infinity; for (let k = 0; k <= 40; k++) d = Math.min(d, len(sub(add(c.a, mul(sub(c.b, c.a), k / 40)), g))); return d - c.r; };
  const sys = Math.min(...WCUTS.filter((c) => c.id.startsWith('sys-')).map(m)), cond = Math.min(...WCUTS.filter((c) => c.id.startsWith('cond-')).map(m)); return { sys, cond, at: g }; }
/** the jut-out's systems opening: ring doubler, cover and fasteners (lb) */
const openLb = (q, n) => { const ring = 2 * ((q.bl[1] - q.bl[0]) + (q.fs[1] - q.fs[0]) + 4 * ACC.ring) * ACC.ring; return ring / 144 * 0.103 * ACC.nD + (q.bl[1] - q.bl[0] + 1) * (q.fs[1] - q.fs[0] + 1) * 0.032 * 0.100 + n * 0.004; };
/** the jut-out's openings (C's systems bay, upper skin; rev C: the aft root bay, lower skin): ring doublers, covers and fasteners (lb) */
export const JACC_LB = () => { const sys = openLb(SYSC.opening, 10), aft = openLb(AFTC.opening, 10); return { sys, aft, lb: sys + aft }; };
JEXTRA.lb = JACC_LB().lb;
