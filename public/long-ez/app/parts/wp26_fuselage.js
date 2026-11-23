// WP26 — fuselage shell LEZ-53-150: the urethane-foam sandwich from the nose-cone joint (FS 1.8) to the firewall, on the
// model's super-ellipse contour, open over the cockpit between the canopy stations. This file gives the shell's sections
// (each half of the ring as one polygon: outer face, core, inner face), the solid's parameters and volumes, the book's core
// from those volumes, and the sources for the shell checks in structures.js:
//  • fus-engine: the firewall hard point carries the upper pick-ups' base bolts (wp23) — the old four-bolt engine attach
//    with an assumed engine weight and bolt is replaced by the bolts' own shear from the mount truss reactions;
//  • fus-belt: the anchor layout is the design's, the flox allowable a bound on the published resin value;
//  • fus-shear: the core thickness is a design value.
// Notional.
import { GEO, FIXED, FUS_SHAPE, fusAt, BASE_MAT, psi, allowB } from '../structures.js';
import { registerBookExtras } from '../plybook.js';
import { pickupReactions } from './wp6_engine_install.js';
import { UPK, upkState } from './wp23_upk.js';

const r4 = (x) => Math.round(x * 1e4) / 1e4, tB = BASE_MAT.BID.t, FZ = FIXED.fuselage;
export const FUS = (() => {
  const tf = FZ.faceBID * tB, c = FZ.coreIn;
  // rev B (block C): the landing-brake opening in the belly, FS 62–78, BL ±6, with a UNI edge doubler along each side
  return { s0: 0.15, s1: GEO.firewall, tf, c, t: c + 2 * tf, n: 16, C0: GEO.canopy[0], C1: GEO.canopy[1], cut: { s0: 64.75 / 12, s1: 80.75 / 12 /* seat-3 2026-11-22: 12.75 in aft, out from under the pilot and aft of the transponder blade's ground plane (was FS 52–68) */, hw: 6.0, dblUNI: 6, dblW: 1.5, dblRun: 3.0 } };
})();
const sp = (v, e) => Math.sign(v) * Math.abs(v) ** e;
/** a point on the contour at station s (ft), parameter t, offset off (in, + out); returns [BL, WL] in inches */
function yz(s, t, off) {
  const f = fusAt(s), w = f.w / 2 * 12 + off, h = (f.top - f.bot) / 2 * 12 + off, zc = (f.top + f.bot) / 2 * 12, sn = Math.sin(t);
  return [w * sp(Math.cos(t), FUS_SHAPE.side), zc + h * sp(sn, sn < 0 ? FUS_SHAPE.belly : FUS_SHAPE.top)];
}
/** the end of the right half's arc: the top centre (closed) or the cockpit sill (open), where the layer reaches the
 *  opening half-width, so every layer ends on the same vertical plane */
function tEnd(s, off, open) {
  if (!open) return Math.PI / 2;
  const f = fusAt(s), ohw = (Math.min(FUS_SHAPE.canopyHalfW, f.w / 2 - 0.02) - 0.03) * 12, w = f.w / 2 * 12 + off;
  return Math.acos(Math.min(1, (ohw / w) ** (1 / FUS_SHAPE.side)));
}
/** the start of the right half's arc: the bottom centre, or the belly opening's edge (BL = cut.hw) where the layer is cut */
function tStart(s, off, cut) {
  if (!cut) return -Math.PI / 2;
  const w = fusAt(s).w / 2 * 12 + off;
  return -Math.PI / 2 + Math.asin(Math.min(1, (FUS.cut.hw / w) ** (1 / FUS_SHAPE.side)));
}
/** half-ring layer between offsets oOut > oIn (in), right half (sg = 1) or left (sg = −1), as a 2D polygon (BL, WL); cut: open over the belly opening */
export function layer(s, oOut, oIn, open, sg, cut = false) {
  const n = FUS.n, a = [], b = [], tO = tEnd(s, oOut, open), tI = tEnd(s, oIn, open), sO = tStart(s, oOut, cut), sI = tStart(s, oIn, cut);
  for (let i = 0; i <= n; i++) { const u = i / n; a.push(yz(s, sO + u * (tO - sO), oOut)); b.push(yz(s, sI + u * (tI - sI), oIn)); }
  return [...a, ...b.reverse()].map(([y, z]) => [r4(sg * y), r4(z)]);
}
const LAYERS = () => ({ fo: [0, -FUS.tf], core: [-FUS.tf, -FUS.tf - FUS.c], fi: [-FUS.tf - FUS.c, -FUS.t] });
/** stations (ft): the contour table's, the canopy and F22, and every 0.25 ft between */
export function fusStations() {
  const brk = [FUS.s0, FUS.s1, FUS.C0, FUS.C1, GEO.F22, FUS.cut.s0, FUS.cut.s1, ...GEO.fuselage.map((r) => r[0])].filter((s) => s >= FUS.s0 && s <= FUS.s1).sort((a, b) => a - b);
  const out = [];
  for (let i = 0; i < brk.length - 1; i++) { if (brk[i + 1] - brk[i] < 1e-6) continue; const n = Math.max(1, Math.ceil((brk[i + 1] - brk[i]) / 0.25)); for (let k = 0; k < n; k++) out.push(brk[i] + (brk[i + 1] - brk[i]) * k / n); }
  out.push(FUS.s1);
  return out.map(r4);
}
const pieceOf = (sa, sb) => { const m = (sa + sb) / 2; return m < GEO.F22 ? 'nose' : m < FUS.C0 ? 'fdeck' : m > FUS.cut.s0 && m < FUS.cut.s1 ? 'brake' : m < FUS.C1 ? 'cockpit' : 'aft'; };
export function fusParams() {
  const st = fusStations(), segs = [], L = LAYERS();
  for (let i = 0; i < st.length - 1; i++) {
    const sa = st[i], sb = st[i + 1], piece = pieceOf(sa, sb), open = piece === 'cockpit' || piece === 'brake', cut = piece === 'brake', regions = {};
    for (const [k, [o1, o2]] of Object.entries(L)) for (const sg of [1, -1]) regions[`${k}_${sg > 0 ? 'r' : 'l'}`] = [layer(sa, o1, o2, open, sg, cut), layer(sb, o1, o2, open, sg, cut)];
    const prev = i > 0 ? pieceOf(st[i - 1], sa) : null, next = i < st.length - 2 ? pieceOf(sb, st[i + 2]) : null;
    segs.push({ piece, ha: sa, hb: sb, keep: [prev !== piece, next !== piece], O: [[0, r4(sa * 12), 0], [0, r4(sb * 12), 0]], regions });
  }
  const axes = Object.fromEntries(['nose', 'fdeck', 'cockpit', 'brake', 'aft'].map((p) => [p, [[1, 0, 0], [0, 0, 1]]]));
  const group = {}; for (const k of Object.keys(L)) for (const h of ['r', 'l']) group[`${k}_${h}`] = k === 'core' ? 'core' : 'face';
  return { segs, axes, group, feat: { face: 'face', core: 'core' }, n: segs.length };
}
const area = (p) => Math.abs(p.reduce((a, q, i) => { const r = p[(i + 1) % p.length]; return a + q[0] * r[1] - r[0] * q[1]; }, 0)) / 2;
/** ruled-loft volumes by group (in³): Simpson on the vertex-interpolated mid section, exact for a ruled loft */
export function fusVolumes() {
  const P = fusParams(), V = { core: 0, face: 0 };
  for (const s of P.segs) { const L = (s.hb - s.ha) * 12; for (const [k, [a, b]] of Object.entries(s.regions)) { const m = a.map((q, i) => [(q[0] + b[i][0]) / 2, (q[1] + b[i][1]) / 2]); V[P.group[k]] += L / 6 * (area(a) + 4 * area(m) + area(b)); } }
  return V;
}
export const FUS_RHO = { PU: BASE_MAT.PU.rho * 62.43 / 1728 };

// ------------------------------------------------------------------------------------------- check sources
/** fus-engine: the firewall hard point under the upper pick-ups' base bolts, bearing from each bolt's shear */
FIXED.engineAttach = (d, lc) => {
  const r = pickupReactions(d, lc); if (!r) return null;
  let w = null;
  for (const o of r.out) for (const n of ['FTL', 'FTR']) if (o.R[n]) { const s = upkState(o.R[n], r.FS, UPK); if (!w || s.sMax > w.V) w = { V: s.sMax, n, R: o.R[n] }; }
  if (!w) return null;
  return { P: w.V, D: UPK.db, where: `${w.n} base bolts (${UPK.nb === 3 ? 'AN3' : `AN${UPK.nb}`})`, inputs: [['Mount truss reaction at the node (limit)', Math.hypot(...w.R), 'lb', 'wp6 pickupReactions (mount truss)'], ['Base bolts', `4 × AN${UPK.nb} on a ${UPK.p} in square`, 'text', 'LEZ-71-222 (SIZED)']] };
};
FIXED.beltSource = { points: 'DESIGN: two lap-belt and two shoulder anchors', insert: 'DESIGN', flox: (ms) => allowB(ms, 'flox (resin) shear') };
FIXED.coreSource = 'DESIGN';
/** rev B: the belly opening for the landing brake drops the belly laminate within ±hw from the bending section; a UNI
 *  doubler along each edge (dblUNI plies × dblW, running dblRun past each end) puts part of it back */
FIXED.fusCut = (s, yIn) => s > FUS.cut.s0 && s < FUS.cut.s1 && Math.abs(yIn) < FUS.cut.hw;
FIXED.fusCutEdge = (s, M) => { const c = FUS.cut; if (s < c.s0 - c.dblRun / 12 || s > c.s1 + c.dblRun / 12) return null; const f = fusAt(s), w = f.w / 2 * 12, zEdge = (f.top - f.bot) / 2 * 12 * (1 - (1 - (c.hw / w) ** (1 / FUS_SHAPE.side) ** 2) ** (FUS_SHAPE.belly / 2)); return { ea: 2 * psi(M.GUD.E1) * c.dblUNI * M.GUD.t * c.dblW, z: Math.max(0, zEdge) }; };

// ------------------------------------------------------------------------------------------- ply book: core from the solid
registerBookExtras('fuselage', (books) => {
  const b = books.fuselage; if (!b) return;
  const V = fusVolumes(), lon = b.plies.filter((p) => p.region === 'longeron').reduce((a, p) => a + p.area * 144 * (p.qty || 1) * (p.plies || 1) * BASE_MAT.GUD.t, 0), core = Math.max(0, V.core - lon);
  // rev B: UNI edge doublers along the landing-brake opening (both edges), and BID pads at the control hard points
  const c = FUS.cut, Lc = (c.s1 - c.s0) * 12 + 2 * c.dblRun, areaD = Lc * c.dblW / 144;
  b.plies.push({ seq: b.plies.length + 1, plies: c.dblUNI, qty: 2, id: 'F-D9', mat: 'GUD', angle: 0, region: 'doubler', panel: 'belly', side: 1, srange: [c.s0 - c.dblRun / 12, c.s1 + c.dblRun / 12], zrange: [0, c.dblW / 12], area: areaD,
    note: `Landing-brake opening edge doubler, ${c.dblUNI} × 6781 0/90 × ${c.dblW} in each side, ${c.dblRun} in past each end (rev B)`, step: 4, flat: { kind: 'strip', L: Lc, w0: c.dblW, w1: c.dblW }, weight: c.dblUNI * 2 * areaD * 0.1099537 });
  const pads = [['F-D10', 'Pedal cross-tube bracket pads (2), keel actuator-bracket pad', 3, 3, 3.0, 3.0], ['F-D11', 'Elevator torque-tube bearing pads and grommets (2)', 3, 2, 2.5, 2.5]];
  for (const [id, note, n, q, w0, l] of pads) b.plies.push({ seq: b.plies.length + 1, plies: n, qty: q, id, mat: 'BID', angle: 45, region: 'doubler', panel: 'side', side: 1, srange: [3.0, 3.3], zrange: [0, w0 / 12], area: w0 * l / 144, note: `${note} (rev B)`, step: 4, flat: { kind: 'strip', L: l, w0, w1: w0 }, weight: n * q * w0 * l / 144 * 0.1030093 });
  b.core = { ...b.core, volume: core / 1728, weight: core * FUS_RHO.PU, note: `${FZ.coreIn} in HT61 foam, ${(core / 1728).toFixed(2)} ft³ from the shell's sections (FS ${(FUS.s0 * 12).toFixed(1)} to the firewall), less the longeron recesses` };
});
void psi;
