// WPB3 — instrument panel and glareshield LEZ-31-100: the panel bulkhead at FS 40.9–41.2, a PVC sandwich bonded below
// the sills to the shell's inner contour with BID tapes; above the sills (inside the canopy opening) it stands 0.25 in
// under the canopy's front bow, held by the glareshield hood, which runs forward under the nose deck and is bonded to
// it on a flox bed. The panel layout (cut-outs and pass-through holes) is block B's: the avionics and electrical blocks
// match their equipment to it. Every line the model routes through the panel plane gets a declared hole outside the
// cut-outs, or is listed as a re-route ask with its owner and a declared hole for it. Checks: pnl-bend (panel strip at
// 9 g forward under the equipment's inertia), pnl-tape (tapes and hood bond), pnl-mount (display screws in potted
// inserts). Inches; x = BL, y = FS, z = WL. Notional.
import { GEO, FUS_SHAPE, fusAt, BASE_MAT, registerChecks, mk, psi, allowB, plyRF, effective, materials, DEFAULT_DESIGN } from '../structures.js';
import { plyWeight } from '../plybook.js';
import { PARTS, partByPN } from '../systems.js';
import { NG } from './ng_layout.js';
import { canPt, tCut, CANF, ohwIn } from './wpB1_canopy.js';
import { HINGE } from './wp4_avionics_cabin.js';
import './wpC2_prims.js';   // block C's lines take their final routes before the pass-through holes are laid out from them
import { lazyGeo, vertPlane } from './wpA0_flat.js';
import { slabPasses, footHole, enclose, slabAudit, touches, slabRow } from './slab_pass.js';
import { LOAD } from '../systems.js';

const r4 = (x) => Math.round(x * 1e4) / 1e4, tB = BASE_MAT.BID.t, IN_ = (n, v, u, s = 'DERIVED') => [n, v, u, s], TGT = 0.15;
const sp = (v, e) => Math.sign(v) * Math.abs(v) ** e;
export const PNL = { aft: 3.432 * 12, coreIn: 0.375, faceBID: 3, bot: 33.0, bowGap: 0.25, hoodGap: 0.45, hoodCore: 0.25, hoodBID: 1, hoodFwd: 38.7, tape: { n: 2, lap: 1.0 } };
PNL.t = PNL.coreIn + 2 * PNL.faceBID * tB; PNL.fwd = PNL.aft - PNL.t; PNL.s = (PNL.aft + PNL.fwd) / 24; PNL.hoodT = PNL.hoodCore + 2 * PNL.hoodBID * tB;
const yz = (s, t, off) => { const f = fusAt(s), w = f.w / 2 * 12 + off, h = (f.top - f.bot) / 2 * 12 + off, zc = (f.top + f.bot) / 2 * 12, sn = Math.sin(t); return [w * sp(Math.cos(t), FUS_SHAPE.side), zc + h * sp(sn, sn < 0 ? FUS_SHAPE.belly : FUS_SHAPE.top)]; };
const tAtZ = (s, off, z, lo, hi) => { for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (yz(s, m, off)[1] < z) lo = m; else hi = m; } return lo; };
const SHELL_T = CANF.t;   // = the shell's thickness (LEZ-53-150)
/** the outline at the panel's mid-plane (right half, from the bottom cut up to the crown; mirrored for the left) */
export const PANEL = (() => {
  const s = PNL.s, oIn = -SHELL_T, oUp = -(SHELL_T + PNL.bowGap), tS = tCut(s, oIn), zS = yz(s, tS, oIn)[1], n = 14, right = [];
  const t0 = tAtZ(s, oIn, PNL.bot, -Math.PI / 2, tS);
  for (let i = 0; i <= n; i++) right.push(yz(s, t0 + (tS - t0) * i / n, oIn));
  const tU = tAtZ(s, oUp, zS, 0, Math.PI / 2);
  for (let i = 0; i <= 2 * n; i++) right.push(yz(s, tU + (Math.PI / 2 - tU) * i / (2 * n), oUp));
  const pts = [...right, ...right.slice(0, -1).reverse().map(([y, z]) => [-y, z])].map(([y, z]) => [r4(y), r4(z)]);
  return { pts, zSill: zS, ySill: yz(s, tS, oIn)[0], top: yz(s, Math.PI / 2, oUp)[1] };
})();
/** the glareshield hood: a band 0.25 in under the bow / deck, from sill height over the top, FS 38.7 to the panel */
export const HOOD = (() => {
  const s = PNL.s, oA = -(SHELL_T + PNL.hoodGap), oB = oA - PNL.hoodT, n = 24, zS = PANEL.zSill;
  const tA = tAtZ(s, oA, zS, 0, Math.PI / 2), tBb = tAtZ(s, oB, zS, 0, Math.PI / 2);
  const outer = Array.from({ length: n + 1 }, (_, i) => yz(s, tA + (Math.PI - 2 * tA) * i / n, oA)), inner = Array.from({ length: n + 1 }, (_, i) => yz(s, tBb + (Math.PI - 2 * tBb) * i / n, oB)).reverse();
  return { pts: [...outer, ...inner].map(([y, z]) => [r4(y), r4(z)]), u0: PNL.hoodFwd, u1: PNL.fwd };
})();

// ------------------------------------------------------------------------------------------- layout (aft face, BL / WL in)
/** cut-outs: rect [y0, y1, z0, z1] or circle [y, z, r]; `fits` is the equipment (PN) and what was typed or taken from public data */
export const CUTS = [
  { id: 'axis', pn: 'LEZ-31-110', rect: [-4.03, 6.27, 37.00, 43.58], what: 'Garmin AXIS GDU 116C 11.6 in display', src: 'bezel 11.16 × 7.44 in as the J record; cut-out 0.43 in a side inside it (typed: G3X Touch practice, confirm with the AXIS installation manual)' },
  { id: 'g5', pn: 'LEZ-31-130', circ: [-6.40, 42.00, 1.5625], what: 'Garmin G5 standby', src: '3 1/8 in standard instrument hole (public); stays at WL 42.00 (integration 2026-11-19, ICD B-S1: WL 42.25 puts the bezel 0.10 in under the canopy bow; the 3.03 in can with its battery clears the left pedal horn because block C shortens the horn to 2.6 in)' },
  { id: 'warn', pn: 'LEZ-31-150', rect: [-8.10, -5.50, 39.30, 39.90], what: 'Warning unit annunciator strip (GEAR, CANOPY, ALT LOW)', src: 'LEZ size' },
  { id: 'key', pn: 'LEZ-74-100', circ: [-9.55, 40.25, 0.4375], what: 'Ignition / start key switch', src: 'ACS A-510-2: 7/8 in notched panel hole (Aircraft Spruce 11-03170 page, accessed 2026-11-19; ICD B-S2); centre BL −9.55, WL 40.25 (0.10 in below block H\'s WL 40.35 so the larger hole keeps 0.5 in inside the panel outline and the body 0.25 in from the warning unit)' },
  { id: 'elt', pn: 'LEZ-25-160', rect: [7.90, 9.10, 40.60, 41.40], what: 'ELT remote (ACK E-04)', src: 'typed from memory, confirm with the ACK remote drawing' },
  { id: 'sw', pn: 'LEZ-31-140', rect: [3.10, 8.00, 35.00, 36.00], what: 'Switch sub-panel: 8 toggles at 0.6 in', src: 'LEZ size' },
  { id: 'cb', pn: 'LEZ-24-130', rect: [-10.60, -8.30, 33.60, 35.80], what: 'Breaker sub-panel: 6 push-pull breakers, 2 rows', src: 'LEZ size (3/8 in breaker bushings at 0.75 in)' },
  { id: 'flag', pn: 'LEZ-32-214', rect: [-2.20, -1.30, 34.20, 34.80], what: 'Gear DOWN flag window', src: 'LEZ size' },
];
/** declared holes for lines that must re-route (owner, reason) */
export const DECLARED_ALL = [
  { id: 'H-PR', c: [8.20, 37.40], r: 0.625, owner: 'C (LEZ-27-120 pitch pushrod)', why: 'the rod crosses the plane inside the AXIS cut-out today (BL 5.4, WL 38.9); re-route through this hole, below and outboard of the display' },
  { id: 'H-CR', c: [7.10, 37.10], r: 0.25, owner: 'J (LEZ-23-125 console harness, right branch)', why: 'crosses 0.4 in from the AXIS cut-out today (BL 6.6, WL 38.2); re-route through this hole' },
];
export const CRANK = { c: [NG.crank[1] * 12, NG.crank[2] * 12], r: 0.375, sweep: NG.crankR * 12 };
const inRect = (q, R, m = 0) => q[0] > R[0] - m && q[0] < R[1] + m && q[1] > R[2] - m && q[1] < R[3] + m;
const rectDist = (q, R) => { const dx = Math.max(R[0] - q[0], 0, q[0] - R[1]), dz = Math.max(R[2] - q[1], 0, q[1] - R[3]); return Math.hypot(dx, dz); };
export const cutDist = (q, C) => (C.rect ? rectDist(q, C.rect) : Math.max(0, Math.hypot(q[0] - C.circ[0], q[1] - C.circ[1]) - C.circ[2]));
/** the panel's slab for the pass-through kit (slab_pass.js): u = BL, v = WL, w = FS (in) */
export const PLANE = vertPlane(0);
/** lines left out of the hole table: the panel's own stand-ins, and the gear crank shaft (its flange bearing, CRANK) */
const SKIP = new Set(['LEZ-31-100', 'LEZ-32-214']);
/** the clearance (in) a line keeps from the panel's material all round, through the whole thickness: rods 1/8; push-rods
 *  3/16 radial (they move along their axis); lines of 1/2 in OD and over 1/4 in; other lines 1/8 in (grommet) */
export const clrOf = (c) => (c.t === 'cyl' ? 0.125 : c.cls === 'pushrod' ? 0.1875 : 2 * c.r >= 0.5 ? 0.25 : 0.125);
/** the webs a pass-through keeps: 0.5 in to every cut-out and to the outline (the bonded edge's tapes, the bottom cut), 0.25 in between holes */
export const WEB = { cut: 0.5, edge: 0.5, lig: 0.25 };
/** every routed line (path or rod) through the panel's slab FS fwd–aft that reaches into its outline or comes within its
 *  clearance of the edge (a line passing under the bottom cut is checked too): one pass per
 *  crossing, sampled along its length through the thickness (raw route and drawn fillet; terminations excluded) */
export function lines() { return slabPasses(PLANE, PNL.fwd, PNL.aft, (pn) => SKIP.has(pn)).filter((c) => !c.end && touches(c, [PANEL.pts], clrOf(c))); }
/** every routed line crossing the panel's mid-plane inside its outline (the rev B table's basis, kept for the views and asks) */
export function crossings() {
  const out = [], X = PNL.s;
  for (const p of PARTS) for (const g of p.geo || []) { const P = g.pts || (g.t === 'cyl' && g.a && g.b ? [g.a, g.b] : null); if (!P) continue;
    for (let i = 0; i < P.length - 1; i++) { const a = P[i], b = P[i + 1]; if ((a[0] - X) * (b[0] - X) >= 0) continue; const u = (X - a[0]) / (b[0] - a[0]), y = (a[1] + u * (b[1] - a[1])) * 12, z = (a[2] + u * (b[2] - a[2])) * 12;
      if (z < PNL.bot || !insidePoly([y, z], PANEL.pts)) continue;
      out.push({ pn: p.pn, y, z, d: g.dIn ?? (g.r ? g.r * 24 : 0.25), kind: g.t, cls: g.cls }); } }
  return out;
}
export function insidePoly(q, P) { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const a = P[i], b = P[j]; if ((a[1] > q[1]) !== (b[1] > q[1]) && q[0] < (b[0] - a[0]) * (q[1] - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; }
const segD = (q, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], u = Math.max(0, Math.min(1, ((q[0] - a[0]) * dx + (q[1] - a[1]) * dy) / (dx * dx + dy * dy || 1))); return Math.hypot(q[0] - a[0] - u * dx, q[1] - a[1] - u * dy); };
export const edgeDist = (q) => Math.min(...PANEL.pts.map((a, i) => segD(q, a, PANEL.pts[(i + 1) % PANEL.pts.length])));
/** rev C: pass-through holes sized from each line's swept footprint through the whole slab (the tube's circle at both
 *  faces and between, plus its radius and clearance), not from its mid-plane crossing alone. A footprint hole that keeps
 *  its webs (WEB) is a pass hole; holes closer than the ligament merge into one grommeted hole round the bundle (the
 *  least circle over all their footprints); a line whose hole cannot keep its webs (too near a cut-out or the outline, or
 *  grazing the edge) is a re-route ask and keeps no hole. Built lazily and rebuilt once every parts module has loaded
 *  (wpA0's lazyGeo), so lines defined or re-routed by later modules (H's runs in wpH9, LOAD.after) are all in it. */
export const HOLES = lazyGeo(() => {
  const raw = [], asks = [];
  const legal = (h) => { const q = [h.u, h.v], cut = CUTS.find((C) => cutDist(q, C) < h.r + WEB.cut); return cut ? `the ${cut.id} cut-out` : !insidePoly(q, PANEL.pts) || edgeDist(q) - h.r < WEB.edge ? 'the outline' : null; };
  for (const c of lines()) {
    const clr = clrOf(c), h = footHole(c, clr), inP = c.samples.some((s) => insidePoly([s.u, s.v], PANEL.pts)), why = inP ? legal(h) : 'the edge (grazes it)';
    if (why) asks.push({ pn: c.pn, gi: c.gi, y: h.u, z: h.v, r: h.r, why, cut: why.match(/the (\w+) cut-out/)?.[1] }); else raw.push({ ...h, pn: c.pn, mem: [{ c, clr }] });
  }
  // clusters: holes closer than the ligament become one grommeted hole round every member's footprint (repeat until none crowd)
  let G = raw;
  for (let again = true; again;) { again = false;
    outer: for (let i = 0; i < G.length; i++) for (let j = i + 1; j < G.length; j++) if (Math.hypot(G[i].u - G[j].u, G[i].v - G[j].v) - G[i].r - G[j].r < WEB.lig) {
      const mem = [...G[i].mem, ...G[j].mem], e = enclose(mem.flatMap((m) => m.c.samples.map((s) => ({ u: s.u, v: s.v, R: s.rr + m.clr }))));
      G[i] = { u: e.u, v: e.v, r: Math.ceil((e.r - 1e-9) * 32) / 32, mem }; G.splice(j, 1); again = true; break outer; } }
  const hs = [];
  for (const g of G) { const why = legal(g), pns = [...new Set(g.mem.map((m) => m.c.pn))];
    if (why) { for (const m of g.mem) asks.push({ pn: m.c.pn, gi: m.c.gi, y: g.u, z: g.v, r: g.r, why: `${why} (merged hole)` }); continue; }
    hs.push({ kind: 'pass', y: r4(g.u), z: r4(g.v), r: g.r, what: pns.join(', '), pns, drift: Math.max(...g.mem.map((m) => footHole(m.c, 0).drift)) }); }
  hs.sort((p, q) => q.z - p.z || p.y - q.y).forEach((h, i) => { h.id = `P${i + 1}`; });
  for (const d of DECLARED_ALL.filter((q) => asks.some((a) => q.owner.includes(a.pn)))) hs.push({ id: d.id, kind: 'declared', y: d.c[0], z: d.c[1], r: d.r, what: d.owner });
  hs.push({ id: 'CRANK', kind: 'crank', y: r4(CRANK.c[0]), z: r4(CRANK.c[1]), r: CRANK.r, what: 'LEZ-32-214 gear crank shaft (flange bearing)' });
  return { holes: hs, asks };
});
/** lines owned by blocks not started yet (I electrical, J avionics): their crossings are laid out here but their spacing is
 *  theirs to fix, so a hole made only of their lines that crowds another is an ask, not a failure of this panel */
export const OPEN_OWNER = (pn) => (/^LEZ-(20|24|33|80)-/.test(pn) ? 'I' : /^LEZ-(23|34)-|^LEZ-31-1(1|2|3|4|5)\d|^LEZ-25-16\d/.test(pn) ? 'J' : null);
export const openOnly = (h) => h.kind === 'pass' && (h.pns || []).every((pn) => OPEN_OWNER(pn));
/** declared holes still needed: those whose owner has a line the panel cannot give a legal hole today */
export const DECLARED = lazyGeo(() => DECLARED_ALL.filter((q) => HOLES.asks.some((a) => q.owner.includes(a.pn))));
/** the openings a line may use: the pass, declared and crank holes (the equipment cut-outs are filled by their equipment) */
export const openings = () => HOLES.holes.map((h) => ({ u: h.y, v: h.z, r: h.r }));
/** rev C slab check: every line sampled through the panel's thickness keeps its clearance from the web, rim and edge */
export const panelSlab = () => slabAudit(lines(), [PANEL.pts], openings(), clrOf);
/** the glareshield hood (FS hoodFwd to the panel's forward face): no line runs through it (it has no openings) */
export const hoodLines = () => slabPasses(PLANE, HOOD.u0, HOOD.u1, (pn) => SKIP.has(pn)).filter((c) => !c.end && touches(c, [HOOD.pts], clrOf(c)));
export const hoodSlab = () => slabAudit(hoodLines(), [HOOD.pts], [], clrOf);
/** live audit of the hole table against every line through the panel now: each line clear of the material in a hole
 *  (or a declared hole for its owner when it is an ask); and every pass hole still carries a line */
export function passAudit() {
  const X = lines(), rows = panelSlab(), bad = [], used = new Set(), op = HOLES.holes.filter((h) => h.kind === 'pass');
  for (const r of rows) if (r.margin < 0 && !(HOLES.asks.some((a) => a.pn === r.pn) && DECLARED.some((d) => d.owner.includes(r.pn)))) bad.push(`${r.pn} at BL ${r.u.toFixed(2)}, WL ${r.v.toFixed(2)}, FS ${r.w.toFixed(2)} (${(-r.margin).toFixed(2)} in into the material)`);
  for (const c of X) for (const h of op) if (c.samples.some((s) => Math.hypot(s.u - h.y, s.v - h.z) < h.r)) used.add(h.id);
  const idle = op.filter((q) => !used.has(q.id)).map((q) => q.id);
  return { ok: !bad.length && !idle.length, n: X.length, bad, idle };
}

// ------------------------------------------------------------------------------------------- solid parameters, volumes, mass
const holeOf = (C) => (C.rect ? { pts: [[C.rect[0], C.rect[2]], [C.rect[1], C.rect[2]], [C.rect[1], C.rect[3]], [C.rect[0], C.rect[3]]] } : { c: [C.circ[0], C.circ[1]], r: C.circ[2] });
export function panelParams() {
  const holes = [...CUTS.map(holeOf), ...HOLES.holes.map((h) => ({ c: [h.y, h.z], r: h.r }))], tf = PNL.faceBID * tB, ex = (g, u0, u1) => ({ k: 'ext', g, ax: 'y', u0: r4(u0), u1: r4(u1), pts: PANEL.pts, holes });
  const prims = [ex('face', PNL.fwd, PNL.fwd + tf), ex('core', PNL.fwd + tf, PNL.aft - tf), ex('face', PNL.aft - tf, PNL.aft),
    { k: 'ext', g: 'hood', ax: 'y', u0: r4(HOOD.u0), u1: r4(HOOD.u1), pts: HOOD.pts }];
  return { prims, feat: { face: 'panel', core: 'panel', hood: 'hood' }, holes: [...CUTS.map((C) => ({ feat: C.id, x: C.rect ? (C.rect[0] + C.rect[1]) / 2 : C.circ[0], y: C.rect ? (C.rect[2] + C.rect[3]) / 2 : C.circ[1], r: C.rect ? 0 : C.circ[2] })), ...HOLES.holes.map((h) => ({ feat: h.kind, x: h.y, y: h.z, r: h.r }))] };
}
const RHO_BID = plyWeight('BID', 1, 1) / 144 / tB, RHO_PVC = BASE_MAT.PVC.rho * 62.43 / 1728;
// the hood: 1 BID each face on 1/4 in PVC; its volume as one group at the sandwich's mean density
export const PNL_RHO = { face: RHO_BID, core: RHO_PVC, hood: (2 * PNL.hoodBID * tB * RHO_BID + PNL.hoodCore * RHO_PVC) / PNL.hoodT };
export const panelArea = () => { const p = panelParams().prims[0]; const A = (q) => Math.abs(q.reduce((a, r, i) => { const s = q[(i + 1) % q.length]; return a + r[0] * s[1] - s[0] * r[1]; }, 0)) / 2; return A(p.pts) - p.holes.reduce((a, h) => a + (h.r ? Math.PI * h.r * h.r : A(h.pts)), 0); };

// ------------------------------------------------------------------------------------------- checks
/** equipment on the panel: masses from their records (the panel carries them at 9 g forward) */
const ON_PANEL = ['LEZ-31-110', 'LEZ-31-130', 'LEZ-31-140', 'LEZ-31-150', 'LEZ-25-160'];
export const eqMass = () => ON_PANEL.reduce((a, pn) => a + (pn === 'LEZ-25-160' ? 0.1 : partByPN(pn)?.massEach || 0), 0) + 0.6 /* breakers, key switch, crank flag: allowance */;
export const panelMass = (vols) => Object.entries(PNL_RHO).reduce((a, [g, r]) => a + (vols[g] || 0) * r, 0);
/** the least net vertical depth of the panel across the display's width (the outline's height less every cut-out and
 *  hole the vertical line crosses), the section that carries the bending at mid-span */
export function netWidth() {
  const A = CUTS[0].rect; let m = Infinity;
  for (let y = A[0]; y <= A[1] + 1e-9; y += (A[1] - A[0]) / 40) {
    let zt = -Infinity; for (let i = 0; i < PANEL.pts.length; i++) { const a = PANEL.pts[i], b = PANEL.pts[(i + 1) % PANEL.pts.length]; if ((a[0] - y) * (b[0] - y) <= 0 && a[0] !== b[0]) zt = Math.max(zt, a[1] + (y - a[0]) / (b[0] - a[0]) * (b[1] - a[1])); }
    let h = zt - PNL.bot;
    for (const C of CUTS) { if (C.rect && y >= C.rect[0] && y <= C.rect[1]) h -= C.rect[3] - C.rect[2]; else if (C.circ && Math.abs(y - C.circ[0]) < C.circ[2]) h -= 2 * Math.sqrt(C.circ[2] ** 2 - (y - C.circ[0]) ** 2); }
    for (const H of HOLES.holes) if (Math.abs(y - H.y) < H.r) h -= 2 * Math.sqrt(H.r ** 2 - (y - H.y) ** 2);
    m = Math.min(m, h);
  }
  return m;
}
/** the tapes below the sills (both sides, both faces) and the hood's bond to the deck */
export const tapeLen = () => { let L = 0; const P = PANEL.pts; for (let i = 0; i < P.length - 1; i++) { const a = P[i], b = P[i + 1]; if (a[1] <= PANEL.zSill + 1e-6 && b[1] <= PANEL.zSill + 1e-6 && a[1] > PNL.bot + 1e-6 && b[1] > PNL.bot + 1e-6) L += Math.hypot(b[0] - a[0], b[1] - a[1]); } return L; };
export const hoodBond = () => { const P = HOOD.pts.slice(0, HOOD.pts.length / 2); let L = 0; for (let i = 0; i < P.length - 1; i++) L += Math.hypot(P[i + 1][0] - P[i][0], P[i + 1][1] - P[i][1]); return L * (GEO.canopy[0] * 12 - PNL.hoodFwd); };
const tri = (n) => Array.from({ length: n }, () => ({ mat: 'BID', angle: 45 }));
registerChecks('wpB3-panel', (d, lc, Z, M) => {
  if (lc.type !== 'emergency') return [];
  const out = [], n = lc.n * (d.KD ?? 1), W = eqMass(), Wp = 2.0, P = n * (W + Wp);
  // panel as a strip spanning between the side tapes, the load as a uniform pressure; the net width at the display is the
  // strips above and below the AXIS cut-out (the rest of the panel is ignored: conservative)
  { const A = CUTS[0].rect, span = 2 * PANEL.ySill, wNet = netWidth(), M_ = P * span / 8, dd = PNL.coreIn + PNL.faceBID * tB, N = M_ / (dd * wNet);
    const rf = plyRF(tri(PNL.faceBID), [N, 0, 0], M), tau = P / 2 / (dd * wNet), msC = psi(M.PVC.tau) / tau - 1, ms = Math.min(rf.rf - 1, msC);
    out.push(Object.assign(mk('fuselage', 'pnl-bend', 'Instrument panel at 9 g forward: strip bending across the display', lc, 'strips above and below the AXIS cut-out', rf.rf - 1 < msC ? `face ${rf.mode}` : 'core shear', ms, {
      formula: 'P = n·(W_equipment + W_panel);  M = P·span/8 (pinned at the tapes);  N = M/(d·w_net);  τ = (P/2)/(d·w_net)',
      inputs: [IN_('Load factor (ultimate, forward)', lc.n, 'g', 'FAR23 23.561'), IN_('Equipment on the panel', W, 'lb', 'GEOMETRY: the equipment records\' masses (+0.6 lb breakers, key, flag)'), IN_('Panel and hood', Wp, 'lb', 'GEOMETRY (rounded up from the solid)'),
        IN_('Span between the tapes', span, 'in', 'GEOMETRY'), IN_('Least net depth across the display (outline less cut-outs and holes)', wNet, 'in', 'GEOMETRY'), IN_('Sandwich', `${PNL.faceBID} × 6781 each face on ${PNL.coreIn} in HT61`, 'text', 'DESIGN'), IN_('Core shear', psi(M.PVC.tau), 'psi', `BOUND: HT61 datasheet-typical; MS stays ≥ 0 down to ${tau.toFixed(0)} psi`)],
      result: [['P (ult.)', P, 'lb'], ['N face', N, 'lb/in'], ['τ core', tau, 'psi']] }), { sys: 'LEZ-31-100' })); }
  { const L = tapeLen(), Ah = hoodBond(), qt = P / (2 * PNL.tape.lap * L + Ah), ils = psi(M.GUD.ILSS), ms = ils / qt - 1;
    out.push(Object.assign(mk('fuselage', 'pnl-tape', `Panel tapes to the shell (${PNL.tape.n} × 6781 each face below the sills) and the hood's bond to the deck`, lc, 'panel perimeter below the sills, hood under the deck', 'bond shear', ms, {
      formula: 'τ = P / (2 faces · lap · L_tapes + A_hood)', inputs: [IN_('Load (ult.)', P, 'lb', 'DERIVED'), IN_('Taped edge below the sills', L, 'in', 'GEOMETRY'), IN_('Tape lap', PNL.tape.lap, 'in', 'DESIGN'), IN_('Hood bond area (flox bed under the deck)', Ah, 'in²', 'GEOMETRY'), IN_('Bond allowable', ils, 'psi', allowB(ms, 'interlaminar shear strength'))],
      result: [['τ', qt, 'psi']] }), { sys: 'LEZ-31-100' })); }
  { const Wd = partByPN('LEZ-31-110')?.massEach || 5, Pd = n * Wd * 1.15, per = Pd / 4, ins = psi(M.FLOX.shear) * Math.PI * 0.5 * PNL.t, ms = Math.min(ins / per, 1050 / per) - 1;
    out.push(Object.assign(mk('fuselage', 'pnl-mount', 'Display mounting screws in potted inserts at 9 g forward', lc, 'AXIS cut-out, 4 screws', ins < 1050 ? 'potted insert shear-out' : 'screw shear', ms, {
      formula: 'P = n·W_display × 1.15 fitting factor, over 4 screws;  insert = τ_flox·π·D·t_panel', inputs: [IN_('Display mass', Wd, 'lb', 'GEOMETRY: LEZ-31-110 record'), IN_('Screws', '4 × #8-32 into MS21047 nutplates in Ø 0.5 in flox inserts', 'text', 'DESIGN'),
        IN_('#8 screw shear', 1050, 'lb', 'BOUND: #8-32 alloy screw single shear with the threads in the shear plane, the conservative end (≈ 1,050 lb; 1,580–1,600 lb on the full 0.164 shank at 75–76 ksi: Pegasus Auto Racing catalogue p. 96, accessed 2026-11-19)'), IN_('Flox shear', psi(M.FLOX.shear), 'psi', allowB(ms, 'resin shear (flox)'))],
      result: [['Per screw (ult.)', per, 'lb'], ['Insert allowable', ins, 'lb']] }), { sys: 'LEZ-31-100' })); }
  return out;
});
/** rev C: the panel's slab check (every line through the panel's thickness, and none through the glareshield hood) */
export const panelSlabAll = () => { const rows = [...panelSlab().map((r) => ({ ...r, slab: 'panel' })), ...hoodSlab().map((r) => ({ ...r, slab: 'hood' }))].sort((a, b) => a.ms - b.ms); return { rows, worst: rows[0] || null, n: rows.length }; };
registerChecks('wpB3-panel-slab', (d, lc) => (lc.id !== 'W1-S1' ? [] : [slabRow(mk, lc, 'pnl-slab', 'Instrument panel and hood: every line through the thickness clear of the web, rim and bonded edge', 'LEZ-31-100', panelSlabAll(),
  { slab: `panel FS ${PNL.fwd.toFixed(2)}–${PNL.aft.toFixed(2)} (pass holes, webs 0.5 in to the cut-outs and the outline); hood FS ${HOOD.u0}–${HOOD.u1.toFixed(2)} (no openings)`, clr: 'rods 1/8, push-rods 3/16, lines ≥ 1/2 in OD 1/4, other lines 1/8 in' })]));
{ const p = partByPN('LEZ-31-100'); if (p) { p.blurb = 'Panel bulkhead (HT61 sandwich) bonded below the sills to the shell and held above them by the glareshield hood under the nose deck; cut for the 11.6 in AXIS display, the G5, the annunciator strip, switch and breaker sub-panels, key switch, ELT remote and gear flag, with grommeted holes for every line through it. No radio stack.'; p.steps = [{ title: 'Lay up flat, cut to the template, pot the nutplate inserts; bond in with tapes and the hood', inspect: ['Every cut-out and hole edge-sealed', 'Hood 0.25 in under the canopy bow'] }]; } }
void effective; void materials; void DEFAULT_DESIGN; void TGT; void canPt; void ohwIn; void HINGE; void inRect;
import { groupVols as gV, massFrom as mF } from '../defn/blkB_prims.js';
const pnlMassSync = () => { const p = partByPN('LEZ-31-100'); if (p) p.massEach = +mF(gV(panelParams().prims), PNL_RHO).toFixed(4); };
LOAD.after.push(pnlMassSync);   // rev C: the hole table is rebuilt on the final routes
{ const p = partByPN('LEZ-31-100'); if (p) { p.massEach = +mF(gV(panelParams().prims), PNL_RHO).toFixed(4); p.src = { ...p.src, mass: 'GEOMETRY: the definition solid (LEZ-31-100)' }; p.geo = [{ t: 'box', c: [PNL.s, 0, (PNL.bot + PANEL.zSill) / 24], d: [PNL.t / 12, 2 * (PANEL.ySill - 0.3) / 12, (PANEL.zSill - PNL.bot) / 12], draw: false }, { t: 'box', c: [PNL.s, 0, (PANEL.zSill + PANEL.top - 1.5) / 24], d: [PNL.t / 12, 8 / 12, (PANEL.top - 1.5 - PANEL.zSill) / 12], draw: false }]; } }   // display stand-ins inside the outline (the solid is the true shape)
