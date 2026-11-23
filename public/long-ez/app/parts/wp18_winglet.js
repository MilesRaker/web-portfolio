// WP18 — winglet LEZ-57-130: the joint to the wing tip and the part's build.
//  • The fin (upper winglet on one PVC core with the lower winglet below it) stands outboard of the wing's tip face on a
//    flox bond line. Its root moment, about the root chord, reaches the wing as a couple: a UNI strap in each inside
//    corner, one from the winglet's inboard face onto the wing's upper skin, one from the lower winglet's inboard face
//    onto the wing's lower skin, each over the wing's tip cap. The wing's caps carry that couple out to the root (the
//    wing is sized for it in the yaw cases, structures.js). Between the straps the fin root works as a short beam: root
//    caps carry the winglet caps down the lower winglet's faces to the lower strap, and a root-web doubler takes the
//    strap force across the fin.
//  • Checks: strap fibre stress at the corner, strap bond on each leg, peel at the inside corner's fillet, fin-root web.
// Every load is FAR 23 limit × FS, × 1.15 fitting factor at the joint. Notional: public data and this model's analysis.
import { GEO, registerChecks, mk, surfaceLoads, capAllowable, FIXED, psi, laminate, plyRF, allowB, surfaceGeom, wingSec, wingletSec, BASE_MAT, DEFAULT_DESIGN, size, effective, wrinkling, loadCases, plyCount, MATSYS, glassM } from '../structures.js';
import { FRAMES, afAt, registerBookExtras, plyWeight } from '../plybook.js';
import { noseGeom, ctlStations } from './wp19_ctl.js';

const FF = 1.15, TGT = 0.15, IN_ = (n, v, u, s = 'DERIVED') => [n, v, u, s];
const r4 = (x) => Math.round(x * 1e4) / 1e4;
const tU = BASE_MAT.GUD.t, tB = BASE_MAT.BID.t, tS = FIXED.skinBID * tB, H = GEO.winglet.h, HL = GEO.wingletLow.h, Y1 = GEO.wing.tipY;
const GW = surfaceGeom('wing'), GL = surfaceGeom('winglet'), COSW = Math.cos(GL.sweep);
const bid = (n) => Array.from({ length: n }, () => ({ mat: 'BID', angle: 45 }));
let ZZ = null; const Z0 = () => (ZZ ||= size(effective(DEFAULT_DESIGN)));
export const wlSized = () => Z0().winglet;

/** the joint's geometry (inches; FS from the wing tip's leading edge) */
export const WGL = (() => {
  const tip = wingSec(Y1), c = tip.c * 12, xw = GW.sec(Y1).xsp, af = afAt(FRAMES.wing, Y1, xw);
  const hU = af.yu * c, hL = -af.yl * c, depth = hU + hL;   // wing OML above / below the chord plane at the spar line
  const wl0 = wingletSec(0), cW = (wl0.le - tip.le) * 12 + GEO.winglet.spar * wl0.c * 12, bW = GL.sec(0).b / COSW;   // winglet cap, in its root plane
  const cWing = xw * c, bWing = GW.sec(Y1).b;
  const lo = Math.min(cWing - bWing / 2, cW - bW / 2), hi = Math.max(cWing + bWing / 2, cW + bW / 2);
  const b = Math.ceil((hi - lo + 0.5) * 4) / 4, x0 = (lo + hi) / 2 - b / 2;
  return { c, hU, hL, depth, cW, bW, cWing, bWing, b, x0, x1: x0 + b, Lv: 3.0, LvL: 2.5, Lh: 3.0, Lc: 3.0, R: GEO.join.filletR * 12, gap: GEO.winglet.gapIn };
})();
/** the winglet's root moment about its root chord and its root shear (limit), for a yaw case */
export function wlRoot(d, lc) { const L = surfaceLoads('winglet', d, lc); if (!L) return null; const r = L.at(0); return { M: Math.abs(r.Mx), V: Math.abs(r.V) }; }
/** strap force (ult. × fitting factor): the couple over the straps' lever arm plus half the root shear */
export const strapForce = (d, r, n) => d.FS * FF * (r.M / (WGL.depth + n * tU) + r.V / 2);
const webDepth = (n) => { const s = wingletSec(0), a = afAt(FRAMES.winglet, 0, GEO.winglet.spar); return (a.yu - a.yl) * s.c * 12 - 2 * n * tU; };
// sizing: strap plies for fibre stress at the corner, root-web plies for the fin root's shear; every yaw case
Object.assign(WGL, (() => {
  const d = effective(DEFAULT_DESIGN), M = Z0().M, cases = loadCases(d).filter((lc) => ['lateral', 'rudder'].includes(lc.type));
  const comp = capAllowable(glassM(M), FIXED.skinBID, 'XPS', true).allow, nCap = wlSized().upper.length;
  let nS = 2; while (nS < 40 && cases.some((lc) => { const r = wlRoot(d, lc); return comp / (strapForce(d, r, nS) / (nS * tU * WGL.b)) - 1 < TGT; })) nS++;
  const tauWr = wrinkling(psi(M.BID.E1), FIXED.webCore, M) * 0.8, hw = webDepth(nCap);
  let nW = wlSized().web; while (nW < 60 && cases.some((lc) => { const F = strapForce(d, wlRoot(d, lc), nS), Nxy = F / hw; return plyRF(bid(nW), [0, 0, Nxy], M).rf - 1 < TGT || tauWr / (Nxy / laminate(bid(nW), M).h) - 1 < TGT; })) nW++;
  return { nS, nW, nRoot: nCap, hw };
})());
WGL.hRoot = (WGL.hL + WGL.LvL) / 12;   // root caps and the lower strap's leg reach this far down the lower winglet (ft); LvL keeps that leg inside its chord
WGL.hTop = (WGL.hU + WGL.Lv) / 12;    // the upper strap's leg and the root-web doubler reach this far up the winglet (ft)
WGL.lenS = { U: WGL.Lv + WGL.Lh + Math.PI / 2 * (WGL.R + WGL.nS * tU / 2), L: WGL.LvL + WGL.Lh + Math.PI / 2 * (WGL.R + WGL.nS * tU / 2) };   // strap plies, leg to leg round the fillet (in)

registerChecks('wp18-winglet', (d, lc, Z, M) => {
  const r = wlRoot(d, lc); if (!r) return [];
  const n = WGL.nS, F = strapForce(d, r, n), out = [], b = WGL.b;
  const base = [IN_('Root moment about the root chord (limit)', r.M, 'inlb', 'SCHRENK'), IN_('Root shear (limit)', r.V, 'lb', 'SCHRENK'), IN_('Lever arm: wing tip depth at the spar + strap', WGL.depth + n * tU, 'in', 'GEOMETRY'), IN_('Fitting factor', FF, '', 'FAR 23.625')];
  { const CA = capAllowable(glassM(M), FIXED.skinBID, 'XPS', true), sig = F / (n * tU * b), msC = CA.allow / sig - 1, msT = psi(M.GUD.Xt) / sig - 1;
    out.push(mk('winglet', 'winglet-strap', 'Winglet-to-wing straps: 6781 0/90 at the inside corner', lc, 'wing tip, spar line', CA.mode, Math.min(msC, msT), {
      formula: 'F = FS·1.15·(M / d + V/2);  σ = F / (n·t·b);  the compressed strap wrinkles with the skin on the wing core',
      inputs: [...base, IN_('Strap', `${n} × 6781 0/90 × ${b.toFixed(2)} in`, 'text', 'SIZED'), IN_('Ply thickness', tU, 'in', 'MATSYS: NCAMP cured ply, 6781 (0.0101 in)'),
        IN_('Compression allowable', CA.allow, 'psi', `BOUND: Hoff wrinkling on the HT61 core; MS stays ≥ 0 down to × ${(1 / (1 + msC)).toFixed(2)}`), IN_('Tension allowable', psi(M.GUD.Xt), 'psi', `BOUND: MSU UD glass fibre-direction typical, hot-wet; MS stays ≥ 0 down to × ${(1 / (1 + msT)).toFixed(2)}`)],
      result: [['Strap force (ult. × 1.15)', F, 'lb'], ['σ (ult.)', sig, 'psi']] }));
  }
  { const L = Math.min(WGL.Lv, WGL.LvL, WGL.Lh), tau = F / (b * L), ils = psi(M.GUD.ILSS), ms = ils / tau - 1;
    out.push(mk('winglet', 'winglet-strapbond', 'Winglet-to-wing straps: bond on each leg', lc, 'wing tip', 'interlaminar shear', ms, {
      formula: 'τ = F / (b·L), the shorter leg', inputs: [...base, IN_('Legs (winglet / lower winglet / wing)', `${WGL.Lv} / ${WGL.LvL} / ${WGL.Lh}`, 'in', 'SIZED'), IN_('Strap width b', b, 'in', 'GEOMETRY'), IN_('Interlaminar shear allowable', ils, 'psi', allowB(ms, 'interlaminar shear strength'))],
      result: [['Strap force (ult. × 1.15)', F, 'lb'], ['τ (ult.)', tau, 'psi']] }));
  }
  { const sr = F / (b * WGL.R), all = 0.5 * psi(M.GUD.ILSS), ms = all / sr - 1;
    out.push(mk('winglet', 'winglet-corner', 'Winglet-to-wing straps: peel at the inside-corner fillet', lc, 'wing tip, fillet', 'through-thickness tension', ms, {
      formula: 'σ_r = (F / b) / R  (a strap in tension pulls off a concave radius)', inputs: [...base, IN_('Fillet radius R (flox)', WGL.R, 'in', 'GEOMETRY'), IN_('Strap width b', b, 'in', 'GEOMETRY'),
        IN_('Through-thickness tension allowable', all, 'psi', `BOUND: taken as ½ × the NCAMP 6781 SBS strength × ${MATSYS.kB} (ETW); MS stays ≥ 0 down to × ${(0.5 / (1 + ms)).toFixed(2)} of the ILSS`)],
      result: [['Strap force (ult. × 1.15)', F, 'lb'], ['σ_r (ult.)', sr, 'psi']] }));
  }
  { const nW = WGL.nW, Nxy = F / WGL.hw, rf = plyRF(bid(nW), [0, 0, Nxy], M), tauWr = wrinkling(psi(M.BID.E1), FIXED.webCore, M) * 0.8, tau = Nxy / laminate(bid(nW), M).h, msW = tauWr / tau - 1, ms = Math.min(rf.rf - 1, msW);
    out.push(mk('winglet', 'winglet-rootweb', `Fin root between the straps: web (${nW} × 6781 ±45)`, lc, 'fin root', rf.rf - 1 < msW ? `web ${rf.mode}` : 'face wrinkling under shear (0.8 × Hoff)', ms, {
      formula: 'the fin root carries the strap force across its thickness: N_xy = F / h_web;  CLT first-ply and 0.8 × Hoff wrinkling on the HT61 block',
      inputs: [...base, IN_('Web depth h (fin thickness at the spar less caps)', WGL.hw, 'in', 'MODEL'), IN_('Web plies (2 + root doubler)', nW, '', 'SIZED'),
        IN_('Spar-block core', `${FIXED.webCore}: E_c·G_c`, '', `BOUND: wrinkling stress ∝ (E_c·G_c)^⅓; MS stays ≥ 0 down to × ${(1 / (1 + Math.max(0, msW)) ** 3).toFixed(2)} of the core's E_c·G_c`), IN_('Ply strengths', '6781 (MTM45-1) typical', 'text', allowB(rf.rf - 1))],
      result: [['N_xy (ult.)', Nxy, 'lbin'], ['τ', tau, 'psi'], ['τ_cr', tauWr, 'psi']] }));
  }
  return out;
});

// ------------------------------------------------------------------------------------------- the fin's sections (the solid)
const FU = FRAMES.winglet, FLW = FRAMES.wingletLow;
export const WL_RHO = { UNI: plyWeight('GUD', 1, 1) / 144 / tU, GUD: plyWeight('GUD', 1, 1) / 144 / tU, BID: plyWeight('BID', 1, 1) / 144 / tB, PVC: BASE_MAT.PVC.rho * 62.43 / 1728 };
const toIn = (p) => [r4(p[1] * 12), r4(p[0] * 12), r4(p[2] * 12)];   // frame [FS, BL, WL] ft → [BL, FS, WL] in (the wing panel's frame)
/** 2D in-plane coordinates of a section point (FS, lateral; inches) for areas */
/** set-back balance nose fraction at fin height h (as wp19 balAt for the rudder: grows over the ramp above the rudder's lower end) */
const balFin = (h) => { const b = GEO.winglet.rudderBal || 0, a = ctlStations('rudder')[0], rp = GEO.winglet.rudderBalRamp || 0;   /* the ramp starts at the rudder's lower end (its own end gap) */ return rp > 0 ? b * Math.min(1, Math.max(0, (h - a) / rp)) : b; };
const covered = (ha, hb) => { const [a, b] = GEO.winglet.rudder, m = (ha + hb) / 2; return !!GEO.winglet.rudderBal && m > a && m < b; };
const xeAt = (ha, hb) => { const [a, b] = GEO.winglet.rudder, m = (ha + hb) / 2; return m > a && m < b ? 1 - GEO.winglet.rudderCf : 1; };
export const capsOf = (side) => wlSized()[side].map((p) => p.y1).sort((a, b) => a - b);
const nOn = (side, ha, hb) => wlSized()[side].filter((p) => p.y0 <= ha + 1e-9 && p.y1 >= hb - 1e-9).length;
/** a section of one piece at height h: OML (less the rudder cove) and, on the upper winglet, both cap bands */
function finSection(F, h, xe, n, upper, balanced = false) {
  const cove = balanced ? noseGeom(F, h, GEO.winglet.rudderCf, balFin(h), GEO.winglet.gapIn) : null;
  const s = F.sec(h), c = s.c, N = 36, cosx = (i) => xe * (1 - Math.cos(Math.PI * i / N)) / 2;
  const P = (x, o, off = 0) => { const q = F.pt(h, x, o, off); return { p3: toIn(q), p2: [(s.le + x * c) * 12, (o * c + off) * 12] }; };
  const ring = [];
  for (let i = N; i >= 0; i--) { const x = cosx(i); ring.push(P(x, afAt(F, h, x).yu)); }
  for (let i = 1; i <= N; i++) { const x = cosx(i), a = afAt(F, h, x); if (i === N && xe >= 1 - 1e-9) break; ring.push(P(x, a.yl)); }
  if (cove) {   // DC-005: concentric shroud for the rudder's set-back balance nose: skins end at the lips, the aft face is the arc R + gap
    ring.length = 0; const G = cove, xu = G.xuS, xl = G.xlS, cu = (i) => xu * (1 - Math.cos(Math.PI * i / N)) / 2, cl = (i) => xl * (1 - Math.cos(Math.PI * i / N)) / 2;
    for (let i = N; i >= 0; i--) { const x = cu(i); ring.push(P(x, afAt(F, h, x).yu)); }
    for (let i = 1; i <= N; i++) { const x = cl(i); ring.push(P(x, afAt(F, h, x).yl)); }
    const r = G.R + G.g, mid = (G.zm - G.z) / G.c, ang = (x, side) => Math.atan2(G.zAt(x, side) - G.zm, (x - G.xa) * G.c), tl = ang(xl, -1) + 2 * Math.PI, tu = ang(xu, 1), NA = 12;
    for (let i = 1; i < NA; i++) { const t = tl + (tu - tl) * i / NA; ring.push(P(G.xa + r * Math.cos(t) / G.c, mid + r * Math.sin(t) / G.c)); }
  }
  const R = { oml: ring };
  if (upper) {
    const gs = GL.sec(h), half = gs.b / COSW / 2 / 12 / c, xa = gs.xsp - half, xb = gs.xsp + half;
    for (const [k, side, nn] of [['cap_out', 1, n.upper], ['cap_in', -1, n.lower]]) {
      const o = (x) => (side > 0 ? afAt(F, h, x).yu : afAt(F, h, x).yl), d0 = tS / 12, d1 = (tS + Math.max(nn, 0.001) * tU) / 12;
      R[k] = [P(xa, o(xa), -side * d0), P(xb, o(xb), -side * d0), P(xb, o(xb), -side * d1), P(xa, o(xa), -side * d1)];
    }
  }
  return R;
}
/** span stations of each piece (ft along its own height) */
export function finStations() {
  const st = (a, b, brk) => { const s = [...new Set([a, b, ...brk.filter((y) => y > a && y < b)].map((y) => +y.toFixed(5)))].sort((p, q) => p - q), out = [s[0]];
    for (let i = 1; i < s.length; i++) { const k = Math.ceil((s[i] - out.at(-1)) * 12 / 6), a0 = out.at(-1); for (let j = 1; j <= k; j++) out.push(+(a0 + (s[i] - a0) * j / k).toFixed(5)); } return out; };
  // DC-005 review: over the rudder the fin uses the rudder's own stations (wp19 ctlStations), so the cove and the balance nose loft
  // between the same planes and cannot cross between them
  const rs = GEO.winglet.rudderBal ? ctlStations('rudder') : [];
  return { upper: st(0, H, [...GEO.winglet.rudder, ...rs, ...capsOf('upper'), ...capsOf('lower')]), lower: st(0, HL, []) };
}
const area2 = (pts) => Math.abs(pts.reduce((a, p, i) => { const q = pts[(i + 1) % pts.length]; return a + p.p2[0] * q.p2[1] - q.p2[0] * p.p2[1]; }, 0)) / 2;
/** segments with their region sections at both ends; piece 'U' (upper winglet) and 'L' (lower winglet) */
export function finSegments() {
  const S = finStations(), segs = [];
  for (const [piece, F, hs] of [['U', FU, S.upper], ['L', FLW, S.lower]]) for (let i = 0; i < hs.length - 1; i++) {
    const ha = hs[i], hb = hs[i + 1], up = piece === 'U', xe = up ? xeAt(ha, hb) : 1, n = up ? { upper: nOn('upper', ha, hb), lower: nOn('lower', ha, hb) } : {};
    const bal = up && covered(ha, hb), A = finSection(F, ha, xe, n, up, bal), B = finSection(F, hb, xe, n, up, bal);
    segs.push({ piece, ha, hb, xe, n, first: i === 0, last: i === hs.length - 2, regions: Object.fromEntries(Object.keys(A).map((k) => [k, [A[k], B[k]]])) });
  }
  return segs;
}
/** region volumes (in³): ruled lofts between parallel section planes, Simpson on vertex-interpolated mid sections */
export function finVolumes(segs = finSegments()) {
  const V = { OML: 0, UNI: 0 };
  for (const s of segs) { const L = (s.hb - s.ha) * 12;
    for (const [k, [a, b]] of Object.entries(s.regions)) { const m = a.map((p, i) => ({ p2: [(p.p2[0] + b[i].p2[0]) / 2, (p.p2[1] + b[i].p2[1]) / 2] })); V[k === 'oml' ? 'OML' : 'UNI'] += L / 6 * (area2(a) + 4 * area2(m) + area2(b)); } }
  return V;
}
/** section planes: a point is O(h) + FS·e_u + lateral·e_v (inches, the wing panel's frame), so the CAD sections are exactly planar */
const ORIGIN = { U: (h) => { const q = FU.pt(h, 0, 0); return [q[1] * 12, 0, q[2] * 12]; }, L: (h) => { const q = FLW.pt(h, 0, 0); return [q[1] * 12, 0, q[2] * 12]; } };
const CA = GEO.winglet.cant * Math.PI / 180, AXES = { U: [[0, 1, 0], [Math.cos(CA), 0, -Math.sin(CA)]], L: [[0, 1, 0], [Math.cos(CA), 0, -Math.sin(CA)]] };
export function wlParams() {
  const segs = finSegments(), rr = (a) => a.map((q) => [r4(q.p2[0]), r4(q.p2[1])]), o = (pc, h) => ORIGIN[pc](h).map((x) => +x.toFixed(9));
  return { segs: segs.map((s) => ({ piece: s.piece, ha: r4(s.ha * 12), hb: r4(s.hb * 12), keep: [s.first, s.last], O: [o(s.piece, s.ha), o(s.piece, s.hb)], regions: Object.fromEntries(Object.entries(s.regions).map(([k, [a, b]]) => [k, [rr(a), rr(b)]])) })),
    axes: Object.fromEntries(Object.entries(AXES).map(([k, v]) => [k, v.map((e) => e.map((x) => +x.toFixed(12)))])), group: { oml: 'OML', cap_out: 'UNI', cap_in: 'UNI' }, feat: { OML: 'outline', UNI: 'cap' }, n: segs.length };
}
/** a params section point back in 3D (inches) */
export const wlPoint = (P, s, end, q) => { const [eu, ev] = P.axes[s.piece], O = s.O[end]; return [0, 1, 2].map((i) => O[i] + q[0] * eu[i] + q[1] * ev[i]); };
/** laminate not in the solid's regions: skins, webs, root caps and doublers inside the OML; straps lie outside it */
export function wlShell(plies) {
  const inside = plies.filter((p) => ['skin', 'web', 'doubler'].includes(p.region)), straps = plies.filter((p) => p.region === 'strap');
  const vol = (a) => a.reduce((s, p) => s + p.area * 144 * (p.plies || 1) * BASE_MAT[p.mat].t, 0), lb = (a) => a.reduce((s, p) => s + p.weight, 0);
  return { lb: lb(inside) + lb(straps), in3: vol(inside), strapLb: lb(straps) };
}

// ------------------------------------------------------------------------------------------- ply book
registerBookExtras('winglet', (books) => {
  const b = books.winglet; if (!b) return;
  const keep = b.plies.filter((p) => !/^L-[LU]D1$/.test(p.id));   // the old root splice doubler gives way to the straps
  const last = Math.max(...b.steps.map((s) => s.step)), stepJ = last + 1;
  const tip = wingSec(Y1), xa = WGL.x0 / WGL.c, xb = WGL.x1 / WGL.c;
  const add = [];
  // root caps: carry the winglet caps down the lower winglet's faces to the lower strap; lap Lc up onto the winglet caps
  const lowC = FLW.sec(0).c * 12, rxa = (WGL.cW - WGL.bW / 2 - (FLW.sec(0).le - tip.le) * 12) / lowC, rxb = rxa + WGL.bW / lowC;
  for (const side of [-1, 1]) {
    const len = WGL.hRoot * 12 + WGL.Lc;
    add.push({ id: `L-RC${side < 0 ? 'I' : 'O'}`, mat: 'GUD', angle: 0, region: 'doubler', frame: 'wingletLow', side, span: [0, WGL.hRoot], chord: [rxa, rxb], plies: WGL.nRoot,
      area: len * WGL.bW / 144, weight: plyWeight('GUD', len * WGL.bW / 144, WGL.nRoot), step: side < 0 ? 5 : 8,
      note: `Root cap, ${side < 0 ? 'inboard' : 'outboard'} face: ${WGL.nRoot} × 6781 0/90 from ${(WGL.hRoot * 12).toFixed(1)} in down the lower winglet, lapping ${WGL.Lc} in up onto the winglet cap (shortest first, 0.5 in steps)`,
      flat: { kind: 'strip', L: len, w0: WGL.bW, w1: WGL.bW } });
  }
  // root-web doubler: wraps the spar block through the fin root, from the lower strap's end to above the upper strap's
  { const nD = WGL.nW - wlSized().web, hTot = (WGL.hTop + WGL.hRoot) * 12, a = hTot * WGL.hw / 144;
    if (nD > 0) add.push({ id: 'L-WR', mat: 'BID', angle: 45, region: 'web', side: 0, local: true, span: [0, WGL.hTop], plies: nD, area: a, weight: plyWeight('BID', a, nD), step: 2,
      note: `Fin-root web doubler: ${nD} × 6781 ±45 on the spar block, ${(WGL.hRoot * 12).toFixed(1)} in below the root to ${(WGL.hTop * 12).toFixed(1)} in above it (into the lower winglet's block)`, flat: { kind: 'strip', L: hTot, w0: WGL.hw, w1: WGL.hw } }); }
  // straps, laid at assembly after the fin is floxed to the tip face and the fillets are in
  for (const [side, nm, where] of [[1, 'U', 'winglet inboard face onto the wing upper skin'], [-1, 'L', 'lower winglet inboard face onto the wing lower skin']]) {
    const len = WGL.lenS[nm], a = len * WGL.b / 144;
    add.push({ id: `L-S${nm}`, mat: 'GUD', angle: 0, region: 'strap', frame: 'wing', side, span: [Y1 - WGL.Lh / 12, Y1], chord: [xa, xb], plies: WGL.nS, area: a, weight: plyWeight('GUD', a, WGL.nS), step: stepJ,
      note: `${side > 0 ? 'Upper' : 'Lower'} strap: ${WGL.nS} × 6781 0/90 × ${WGL.b.toFixed(2)} in, ${where}, ${nm === 'U' ? WGL.Lv : WGL.LvL} in + ${WGL.Lh} in legs round a ${WGL.R} in flox fillet (shortest first, 0.5 in steps)`,
      flat: { kind: 'strip', L: len, w0: WGL.b, w1: WGL.b } });
  }
  b.plies = [...keep, ...add].map((p, i) => ({ ...p, seq: i + 1 }));
  b.steps = [...b.steps, { step: stepJ, title: 'Bond onto the wing tip: flox the root, fillets in both inside corners, then the straps', inspect: ['Fin square to the jig cant block, bond line ≤ 1/8 in', `Strap plies tally ${WGL.nS} + ${WGL.nS}`, 'Tap test the straps and fillets'] }];
  { // core: PVC inside the skins less the caps (the record's solid regions), webs, root caps and doubler; both blocks
    const V = finVolumes(), sh = wlShell(b.plies), pvc = Math.max(0, V.OML - V.UNI - sh.in3);
    b.core = { ...b.core, volume: pvc / 1728, weight: pvc * WL_RHO.PVC, note: `HT61: upper block + lower winglet block (${(pvc / 1728).toFixed(3)} ft³)` };
  }
  b.hard = `Joint to the wing tip: ${WGL.nS} × 6781 0/90 straps (${WGL.b.toFixed(2)} in) in each inside corner, root caps ${WGL.nRoot} × 6781 0/90 each face, fin-root web ${WGL.nW} × 6781`;
});
