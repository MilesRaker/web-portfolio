// WP25 — bulkhead F22 LEZ-53-160: the canard bulkhead at FS 22, a flat PVC sandwich (3 BID each face) fitted inside the
// fuselage shell and taped to it. Its top edge carries the canard's lower surface; the canard's tabs bolt to its forward
// face at BL ±attachY; the NG-30 nose-gear plates are bonded to its forward face; the nose-gear strut retracts through the
// notch in its bottom; and every line the model routes through FS 22 gets a hole.
//  • Outline: the fuselage's inner contour at FS 22 (the shell less its thickness), cut level at the canard's lower
//    surface, with the strut notch. Holes: the canard bolts and the pass-throughs found in the model.
//  • Checks: nose-gear loads (out-of-plane drag between the fuselage sides, in-plane vertical), the tapes to the shell.
//    The canard deep-beam and bolt-bearing checks stay in structures.js, fed this outline through FIXED.F22.geo.
// Notional.
import { GEO, FIXED, registerChecks, mk, psi, plyRF, allowB, BASE_MAT, fusOutline, surfaceLoads, effective, DEFAULT_DESIGN, materials } from '../structures.js';
import { FRAMES, afAt, registerBookExtras, plyWeight, PROCESS } from '../plybook.js';
import { PARTS, LOAD } from '../systems.js';
import { partPasses, footHole, enclose, slabWorst, slabRow } from './slab_pass.js';
import { vertPlane } from './wpA0_flat.js';
import { CNA } from './wp24_canard.js';
import { NG } from './ng_layout.js';
import { noseLoads } from './ng_sizing.js';
import { WELL, belly } from './wp11_nose_gear.js';
import { plateBot, PLATE } from './wpE1_nosegear.js';

const TGT = 0.15, IN_ = (n, v, u, s = 'DERIVED') => [n, v, u, s], r4 = (x) => Math.round(x * 1e4) / 1e4, tB = BASE_MAT.BID.t;
const F2 = FIXED.F22, FZ = FIXED.fuselage, S22 = GEO.F22 * 12, ENV = 0.375;
/** clearance all round a line's footprint through F22 (in): grommeted lines 1/8 (hole ≥ Ø 3/4), rods and cables 1/8 */
export const F22_CLR = () => 0.125;   // half the thickness envelope the top edge is cut for (in)
const bid = (n) => Array.from({ length: n }, () => ({ mat: 'BID', angle: 45 }));
export const F22G = (() => {
  const tsh = FZ.coreIn + 2 * FZ.faceBID * tB, t = F2.coreIn + 2 * F2.faceBID * tB;
  const G = GEO.canard, zl = (fs) => { const x = (fs / 12 - G.le) / G.c, a = afAt(FRAMES.canard, G.attachY, x); return (G.z + a.yl * G.c) * 12; };
  const zTop = Math.min(zl(S22 - ENV), zl(S22), zl(S22 + ENV)) - 0.03;   // 0.03 in flox under the canard, across the doubled thickness
  const o = fusOutline(GEO.F22, 360, -tsh / 12), ring = o.pts.map(([y, z]) => [y * 12, z * 12]);   // from the bottom centre, up the right side, over, down the left
  const halfW = WELL.chan.halfW * 12 + 0.125, chanTop = WELL.chan.top * 12 + 0.25;   // strut channel plus clearance
  // clip the ring to z ≤ zTop (crossings interpolated), then step the bottom over the strut notch
  const clip = [];
  for (let i = 0; i < ring.length; i++) { const p = ring[i], q = ring[(i + 1) % ring.length];
    if (p[1] <= zTop) clip.push(p);
    if ((p[1] - zTop) * (q[1] - zTop) < 0) { const u = (zTop - p[1]) / (q[1] - p[1]); clip.push([p[0] + u * (q[0] - p[0]), zTop]); } }
  const lowAt = (y) => { let lo = null; for (let i = 0; i < ring.length - 1; i++) { const p = ring[i], q = ring[i + 1]; if (p[1] > o.zc * 12 || (p[0] - y) * (q[0] - y) > 0 || p[0] === q[0]) continue; const u = (y - p[0]) / (q[0] - p[0]), z = p[1] + u * (q[1] - p[1]); if (lo === null || z < lo) lo = z; } return lo; };
  const body = clip.filter(([y, z]) => !(Math.abs(y) < halfW && z < o.zc * 12));
  const pts = [[halfW, lowAt(halfW)], ...body, [-halfW, lowAt(-halfW)], [-halfW, chanTop], [halfW, chanTop]];
  // holes: canard bolts, then every routed line through F22's thickness outside the notch, each sized from its swept
  // footprint (rev: final integration, LEZ-31-100 rev C fix), merged when they crowd. Built on first use and rebuilt once
  // every parts module has loaded (lines defined or re-routed later are in it).
  const ptsR = pts.map(([y, z]) => [r4(y), r4(z)]), area2 = (p) => Math.abs(p.reduce((s, q, i) => { const r = p[(i + 1) % p.length]; return s + q[0] * r[1] - r[0] * q[1]; }, 0)) / 2;
  let built = null, final = false;
  const build = () => {
    const holes = [];
    for (const sg of [1, -1]) for (let i = 0; i < CNA.nb; i++) holes.push({ kind: 'bolt', y: sg * G.attachY * 12, z: zTop + 0.03 - CNA.edge - i * CNA.pitch, r: Math.round((CNA.D + 0.006) / 2 * 1e4) / 1e4, what: `canard bolt AN${CNA.an}` });
    const raw = [], hw = t / 2;
    for (const c of partPasses(vertPlane(GEO.F22), -hw, hw, [ptsR], F22_CLR)) {
      if (c.samples.every((s) => Math.abs(s.u) < halfW && s.v < chanTop)) continue;   // through the strut notch
      const h = footHole(c, F22_CLR(c), 1 / 16, c.t === 'cyl' ? 0 : 0.375);
      raw.push({ kind: 'pass', y: h.u, z: h.v, r: h.r, what: c.pn, pass: c, clr: h.r - (footHole(c, 0).r) });
    }
    // crowding holes merge into one round every member's footprint and clearance (repeat until none crowd)
    let G2 = raw.map((h) => ({ ...h, mem: [h] }));
    for (let again = true; again;) { again = false;
      outer: for (let i = 0; i < G2.length; i++) for (let j = i + 1; j < G2.length; j++) if (Math.hypot(G2[i].y - G2[j].y, G2[i].z - G2[j].z) < G2[i].r + G2[j].r + 0.25) {
        const mem = [...G2[i].mem, ...G2[j].mem], e = enclose(mem.map((m) => ({ u: m.y, v: m.z, R: m.r })));   // over the members' own footprint holes
        G2[i] = { kind: 'pass', y: e.u, z: e.v, r: Math.ceil(Math.max(e.r, ...mem.map((m) => (m.pass.t === 'cyl' ? 0 : 0.375))) * 16 - 1e-9) / 16, what: [...new Set(mem.map((m) => m.what))].join(', '), mem }; G2.splice(j, 1); again = true; break outer; } }
    for (const g of G2) holes.push({ kind: 'pass', y: g.y, z: g.z, r: g.r, what: g.what });
    holes.forEach((h) => { if (h.kind === 'pass') h.r = Math.ceil(h.r * 16 - 1e-9) / 16; h.y = r4(h.y); h.z = r4(h.z); });
    return { holes, raw: raw.map(({ pass, ...h }) => ({ ...h, r: Math.ceil(h.r * 16 - 1e-9) / 16 })), A: area2(pts) - holes.reduce((s, h) => s + Math.PI * h.r * h.r, 0) };
  };
  const get = () => { if (!built || (!final && LOAD.done)) { built = build(); final = LOAD.done; } return built; };
  const depthAt = (y) => zTop - lowAt(y), wIn = o.w * 12;
  const geo = { h: depthAt(G.attachY * 12), a: wIn - G.attachY * 12 };
  F2.geo = geo;
  const perim = pts.reduce((s, q, i) => s + Math.hypot(pts[(i + 1) % pts.length][0] - q[0], pts[(i + 1) % pts.length][1] - q[1]), 0);
  return { pts: ptsR, get holes() { return get().holes; }, get raw() { return get().raw; }, get A() { return get().A; }, t, tsh, zTop, halfW, chanTop, depthAt, lowAt, wIn, geo, perim };
})();
/** hard-point doubler footprint at each canard bolt pair (in): 3 × (bolt span + 2 in) */
export const HP = { w: CNA.w + 1.0, h: CNA.edge + (CNA.nb - 1) * CNA.pitch + 1.5 };
export const F22_RHO = { PVC: BASE_MAT.PVC.rho * 62.43 / 1728 };
export const TAPE = { n: 2, lap: 1.0 };   // F22 to the shell: 2 BID tapes each face, 1 in onto each

// ------------------------------------------------------------------------------------------- nose-gear doubler
/** the NG-30 plates' drag: F22 as a one-way strip h_p tall from each plate line out to the fuselage side (conservative:
 *  the plates' belly bond and two-way action are ignored). Sized: BID doubler plies on each face over that strip. */
const ngStrip = (d, M, nD) => {
  const n = noseLoads(d), D = n.D * d.FS, yp = (NG.plateY + NG.plateT / 2) * 12, hp = 39.6 - plateBot(PLATE.s1),   // the NG-30 plate's height on F22 (LEZ-32-201: bottom on the inner skin at the plate BL)
    span = F22G.wIn - yp, dd = F2.coreIn + (F2.faceBID + nD) * tB;
  const Mb = (D / 2) / hp * span, N = Mb / dd, rf = plyRF(bid(F2.faceBID + nD), [N, 0, 0], M), tau = (D / 2) / hp / dd;
  return { nl: n, yp, hp, span, dd, N, rf, tau, msF: rf.rf - 1, msC: psi(M.PVC.tau) / tau - 1 };
};
export const NGD = (() => { const d = effective(DEFAULT_DESIGN), M = materials(d); for (let k = 0; k <= 12; k++) { const r = ngStrip(d, M, k); if (r.msF >= TGT && r.msC >= TGT) return { n: k, ...r }; } return { n: 12, ...ngStrip(d, M, 12) }; })();
F2.ngDbl = NGD.n;

// ------------------------------------------------------------------------------------------- checks
registerChecks('wp25-f22', (d, lc, Z, M) => {
  if (lc.type !== 'ground') return [];
  const out = [], { nl: n, yp, hp, span, N, rf, tau, msF, msC } = ngStrip(d, M, F2.ngDbl), core = psi(M.PVC.tau);
  out.push(Object.assign(mk('F22', 'f22-ng', 'F22 under the nose-gear drag (plate bending between the fuselage sides)', lc, `NG-30 plate lines, BL ±${yp.toFixed(2)}`, msF < msC ? `face ${rf.mode}` : 'core shear', Math.min(msF, msC), {
    formula: 'the NG-30 plates put D/2 each on F22 over their height h_p; one-way strip to the side (belly bond and two-way action ignored): M = (D/2)/h_p · (w/2 − y_p);  N = M/d;  τ_core = (D/2)/h_p / d',
    inputs: [IN_('Nose-gear drag D (limit)', n.D, 'lb', 'FAR 23.499 (0.8 × V)'), IN_('NG-30 plate height on F22 h_p', hp, 'in', 'GEOMETRY'), IN_('Plate line to the side', span, 'in', 'GEOMETRY'), IN_('Faces / core', `${F2.faceBID} × 6781 + ${F2.ngDbl} × 6781 doubler each face / ${F2.coreIn} in HT61`, 'text', 'SIZED'),
      IN_('Core shear allowable', core, 'psi', `BOUND: HT61 datasheet-typical; MS stays ≥ 0 down to ${tau.toFixed(0)} psi`)], result: [['N face (ult.)', N, 'lb/in'], ['τ core', tau, 'psi']] }), { sys: 'LEZ-53-160' }));
  return out;
});
// tapes to the shell: the canard lift (flight) or the nose-gear loads (ground), shared along the bonded perimeter
registerChecks('wp25-f22-tape', (d, lc, Z, M) => {
  const G = F22G, ground = lc.type === 'ground';
  if (!ground && !['sym', 'roll', 'canard'].includes(lc.type)) return [];
  let P, src;
  if (ground) { const n = noseLoads(d); P = Math.hypot(n.V, n.D) * d.FS; src = ['Nose-gear √(V² + D²) (limit)', Math.hypot(n.V, n.D), 'lb', 'FAR 23.499']; }
  else { const L = surfaceLoads('canard', d, lc); P = Math.abs(L.at(0).V) * 2 * d.FS; src = ['Canard root shear ×2 (limit)', P / d.FS, 'lb', 'SCHRENK']; }
  const q = P / G.perim, tauT = q / (2 * TAPE.lap), ils = psi(M.GUD.ILSS), msT = ils / tauT - 1;
  return [Object.assign(mk('F22', 'f22-tape', `F22 to the fuselage shell (${TAPE.n} × 6781 tapes each face)`, lc, 'bulkhead perimeter', 'tape lap shear', msT, {
    formula: 'q = P / perimeter;  τ = q / (2 faces × lap)', inputs: [IN_(...src), IN_('Bonded perimeter', G.perim, 'in', 'GEOMETRY'), IN_('Tape lap', TAPE.lap, 'in', 'SIZED'), IN_('Bond allowable', ils, 'psi', allowB(msT, 'interlaminar shear strength'))],
    result: [['q (ult.)', q, 'lb/in'], ['τ', tauT, 'psi']] }), { sys: 'LEZ-53-160' })];
});


// ------------------------------------------------------------------------------------------- ply book: true areas and core
registerBookExtras('F22', (books) => {
  const b = books.F22; if (!b) return;
  const G = F22G, A = G.A / 144, tapeA = G.perim * 2 * TAPE.lap * 2 / 144;
  for (const p of b.plies) {
    if (p.region === 'face') { p.area = A; p.weight = plyWeight(p.mat, A, p.plies || 1); p.flat = { kind: 'poly', pts: G.pts.map(([y, z]) => [y, z - G.zTop]) }; }
    if (p.region === 'doubler') { const k = p.mat === 'GUD' ? 'hpU' : 'hpB', a = f22Area(k) / 144, w = p.mat === 'GUD' ? HP.w / 2 : HP.w; p.area = a; p.weight = plyWeight(p.mat, a, p.plies || 1); p.step = 3; p.note = `${p.note}: ${w} × ${HP.h.toFixed(2)} in round each canard bolt pair, on the aft face`; p.flat = { kind: 'strip', L: w, w0: HP.h, w1: HP.h }; }
  }
  if (F2.ngDbl) { const aN = f22Area('ng') / 144; for (const sd of [-1, 1]) b.plies.push({ id: `B-N${sd < 0 ? 'F' : 'A'}`, mat: 'BID', angle: 45, region: 'ngDoubler', side: sd, plies: F2.ngDbl, area: aN, weight: plyWeight('BID', aN, F2.ngDbl), step: sd < 0 ? 1 : 3,
    note: `Nose-gear doubler, ${sd < 0 ? 'forward' : 'aft'} face: ${F2.ngDbl} × 6781 from each NG-30 plate (BL ±${(NG.plateY * 12).toFixed(2)}) out to the side, full height`, flat: { kind: 'strip', L: G.wIn - NG.plateY * 12, w0: G.depthAt(G.wIn / 2), w1: G.depthAt(G.wIn / 2) } }); }
  b.plies.push({ id: 'B-T', mat: 'BID', angle: 45, region: 'tape', side: 0, plies: TAPE.n, area: tapeA / 2, weight: plyWeight('BID', tapeA / 2, TAPE.n), step: 4, seq: b.plies.length + 1, note: `Tapes to the shell: ${TAPE.n} × 6781 × ${2 * TAPE.lap} in, both faces, all round (at installation)`, flat: { kind: 'strip', L: G.perim, w0: 2 * TAPE.lap, w1: 2 * TAPE.lap } });
  b.steps = [{ step: 1, title: 'Lay up the forward face and its nose-gear doubler flat', inspect: ['Wet-out'] }, { step: 2, title: 'Pot flox inserts at the bolt and pass-through holes', inspect: ['Insert positions against the drill guide'] },
    { step: 3, title: 'Lay up the aft face, its nose-gear doubler and the hard-point doublers; cure; cut to template', inspect: [PROCESS.postCure, 'Outline within ±1/32 in', 'Holes edge-sealed with flox'] },
    { step: 4, title: 'Install in the fuselage jig at FS 22; flox fillets; tape both faces to the shell', inspect: ['Square to the centre-line ±0.25°', 'Top edge to the canard template'] }];
  const core = G.A * F2.coreIn;
  b.core = { ...b.core, volume: core / 1728, weight: core * F22_RHO.PVC, note: `${F2.coreIn} in HT61 sheet, ${G.A.toFixed(0)} in² net of the notch and ${G.holes.length} holes` };
  b.blurb = 'HT61-foam sandwich bulkhead at fuselage station 22. The canard sits on its top edge and its tabs bolt to the forward face; the NG-30 nose-gear plates are bonded to the forward face and the strut retracts through the notch in its bottom.';
});
void TGT;

// ------------------------------------------------------------------------------------------- solid parameters
/** Sutherland–Hodgman: the (possibly concave) outline clipped to an axis-aligned rectangle [y0, y1, z0, z1] */
function clipRect(poly, [y0, y1, z0, z1]) {
  let out = poly;
  const edges = [[(p) => p[0] >= y0, (a, b) => { const u = (y0 - a[0]) / (b[0] - a[0]); return [y0, a[1] + u * (b[1] - a[1])]; }], [(p) => p[0] <= y1, (a, b) => { const u = (y1 - a[0]) / (b[0] - a[0]); return [y1, a[1] + u * (b[1] - a[1])]; }],
    [(p) => p[1] >= z0, (a, b) => { const u = (z0 - a[1]) / (b[1] - a[1]); return [a[0] + u * (b[0] - a[0]), z0]; }], [(p) => p[1] <= z1, (a, b) => { const u = (z1 - a[1]) / (b[1] - a[1]); return [a[0] + u * (b[0] - a[0]), z1]; }]];
  for (const [inside, cut] of edges) { const src = out; out = []; for (let i = 0; i < src.length; i++) { const a = src[i], b = src[(i + 1) % src.length]; if (inside(b)) { if (!inside(a)) out.push(cut(a, b)); out.push(b); } else if (inside(a)) out.push(cut(a, b)); } if (!out.length) break; }
  return out;
}
const polyArea = (p) => Math.abs(p.reduce((s, q, i) => { const r = p[(i + 1) % p.length]; return s + q[0] * r[1] - r[0] * q[1]; }, 0)) / 2;
/** the doubler regions (in): nose-gear doublers from each NG-30 plate's inner face to the side, full height (so the canard
 *  tab and the hard-point doublers lie flat on them); hard-point BID and UNI round each canard bolt pair */
export function f22Regions() {
  const G = F22G, ya = GEO.canard.attachY * 12, y0 = NG.plateY * 12, big = G.wIn + 1;
  return { ng: [[y0, big, 0, G.zTop + 1], [-big, -y0, 0, G.zTop + 1]],
    hpB: [1, -1].map((sg) => [sg * ya - HP.w / 2, sg * ya + HP.w / 2, G.zTop - HP.h, G.zTop + 1]), hpU: [1, -1].map((sg) => [sg * ya - HP.w / 4, sg * ya + HP.w / 4, G.zTop - HP.h, G.zTop + 1]) };
}
/** net area of a region (in²): the outline clipped to its rectangles, less the holes whose centres fall inside them */
export function f22Area(key) {
  const G = F22G; if (!key) return G.A;
  // each hole's part inside the region (a hole straddling the region's edge counts its overlap, as the CAD cut does)
  const circ = (h) => Array.from({ length: 256 }, (_, i) => [h.y + h.r * Math.cos(Math.PI * i / 128), h.z + h.r * Math.sin(Math.PI * i / 128)]);
  return f22Regions()[key].reduce((s, R) => s + polyArea(clipRect(G.pts, R)) - G.holes.reduce((a, h) => a + (h.y + h.r <= R[0] || h.y - h.r >= R[1] || h.z + h.r <= R[2] || h.z - h.r >= R[3] ? 0 : polyArea(clipRect(circ(h), R))), 0), 0);
}
/** the stack through the thickness, forward to aft (FS, in): core, faces, nose-gear doublers both sides, hard points aft */
export function f22Layers(nHP) {
  const c = F2.coreIn, tf = F2.faceBID * tB, tn = F2.ngDbl * tB, tH = nHP * tB, tU = F2.doublerUNI * BASE_MAT.GUD.t, a = S22 - c / 2, b = S22 + c / 2, L = [];
  L.push({ name: 'core', mat: 'PVC', y0: a, y1: b, reg: null }, { name: 'faceF', mat: 'BID', y0: a - tf, y1: a, reg: null }, { name: 'faceA', mat: 'BID', y0: b, y1: b + tf, reg: null });
  if (tn) L.push({ name: 'ngF', mat: 'BID', y0: a - tf - tn, y1: a - tf, reg: 'ng' }, { name: 'ngA', mat: 'BID', y0: b + tf, y1: b + tf + tn, reg: 'ng' });
  L.push({ name: 'hpB', mat: 'BID', y0: b + tf + tn, y1: b + tf + tn + tH, reg: 'hpB' }, { name: 'hpU', mat: 'GUD', y0: b + tf + tn + tH, y1: b + tf + tn + tH + tU, reg: 'hpU' });
  return L.map((l) => ({ ...l, y0: r4(l.y0), y1: r4(l.y1) }));
}
export const f22Params = (nHP) => ({ pts: F22G.pts, holes: F22G.holes.map((h, i) => ({ id: h.kind === 'bolt' ? 'bolt' : 'pass', n: i, y: h.y, z: h.z, r: h.r })), layers: f22Layers(nHP), regs: f22Regions() });
export const f22Volumes = (nHP) => Object.fromEntries(f22Layers(nHP).map((l) => [l.name, f22Area(l.reg) * (l.y1 - l.y0)]));
export const F22_RHO_LAM = { BID: plyWeight('BID', 1, 1) / 144 / tB, GUD: plyWeight('GUD', 1, 1) / 144 / BASE_MAT.GUD.t, PVC: F22_RHO.PVC };

/** the F22 slab check: every line through F22's thickness keeps 1/8 in from the laminate in its hole (the canard bolts are fits) */
export const f22Slab = () => { const hw = F22G.t / 2, op = F22G.holes.map((h) => ({ u: h.y, v: h.z, r: h.r })), fit = F22G.holes.filter((h) => h.kind === 'bolt').map((h) => ({ u: h.y, v: h.z, r: h.r }));
  return slabWorst(vertPlane(GEO.F22), [{ name: 'F22', w0: -hw, w1: hw, outlines: [F22G.pts], openings: op, fitted: fit }], F22_CLR); };
registerChecks('wp25-f22-slab', (d, lc) => (lc.id !== 'W1-S1' ? [] : [slabRow(mk, lc, 'f22-slab', 'F22: every line through the thickness clear of the laminate in its hole', 'LEZ-53-160', f22Slab(), { slab: `FS ${(S22 - F22G.t / 2).toFixed(2)}–${(S22 + F22G.t / 2).toFixed(2)} (faces and core)`, clr: '1/8 in all round (grommeted lines in holes ≥ Ø 3/4)' })]));
