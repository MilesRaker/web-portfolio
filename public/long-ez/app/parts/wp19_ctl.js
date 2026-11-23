// WP19 — control surfaces: LEZ-57-191 aileron and LEZ-55-192 elevator, the parts and their hinge lines.
//  • Each surface fills its parent's cove: its sections are the parent's own airfoil from the hinge line (plus the hinge
//    gap) to the trailing edge, cut at the span ends by an end gap. A continuous MS20257-P3 piano hinge runs along the
//    hinge side's skin; the opposite corner of the hinge face is bevelled so full travel clears the cove by the gap.
//  • A 6061-T6 horn, through-bolted on a BID pad at the inboard end of the hinge-face web, takes the control rod.
//  • Checks: hinge line under the surface's normal force (pin shear, leaf bearing, leaf bond), the horn (bolt bearing in
//    the pad, horn bending). The torsion check is in structures.js (controlChecks).
// Every load is FAR 23 limit × FS. Notional: public data and this model's analysis.
import { GEO, registerChecks, mk, FIXED, psi, allowB, BASE_MAT, CTL, DEFAULT_DESIGN } from '../structures.js';
import { FRAMES, afAt, registerBookExtras, plyWeight } from '../plybook.js';

const TGT = 0.15, IN_ = (n, v, u, s = 'DERIVED') => [n, v, u, s], r4 = (x) => Math.round(x * 1e4) / 1e4, D2R = Math.PI / 180;
const tB = BASE_MAT.BID.t;
/** MS20257-P3 continuous hinge (anodised aluminium leaves, CRES pin): 1.25 in open width, leaves 0.044–0.056 in, Ø 0.090 pin, 0.5 in knuckles */
export const HINGE = { std: 'MS20257-P3', open: 1.25, t: 0.044, pin: 0.090, knuckle: 0.5, leafBond: 0.45, lbPerIn: 0.0062 };
/** per surface: parent frame, hinge side (+1 upper skin, −1 lower), travel, gaps, horn; the rod load at the horn (limit, lb) */
export const CTLS = {
  aileron: { pn: 'LEZ-57-191', parent: 'wing', hinge: 1, travel: () => DEFAULT_DESIGN.aileronDeg, gap: 0.06, endGap: 0.06, rod: 67 * 7 / 2.5, rodSrc: 'LEZ-27-142: 67 lb pilot roll force (FAR 23.397) × 7.0 in grip / 2.5 in roll crank, 1 : 1 bellcranks, all into one horn',
    horn: { arm: 1.5, w: 1.25, t: 0.125, bolt: 3, nPad: 0, hornY: 'inboard' } },
  elevator: { pn: 'LEZ-55-192', parent: 'canard', hinge: -1, travel: () => DEFAULT_DESIGN.elevDeg, gap: 0.06, endGap: 0.06, rod: 167 * 7 / 2.5 / 2, rodSrc: 'LEZ-27-120 / -130: pilots together (FAR 23.399(b), 2 × 0.75 × 167 lb) × 7.0 / 3.0 stick × 1.2 / 1.5 bellcrank to horn, half to each elevator',
    horn: { arm: 1.5, w: 1.25, t: 0.125, bolt: 3, nPad: 0, hornY: 'inboard' } },
};
const span = (id) => { const [a, b] = CTL[id].span(), C = CTLS[id]; return [a + (C.endGapLo ?? C.endGap) / 12, b - (C.endGapHi ?? C.endGap) / 12]; };
const P0 = (id) => FRAMES[CTLS[id].parent];
/** set-back (overhang) balance about a hinge axis at mid-depth: the NACA blunt nose (the contour carried forward to a shoulder, then a
 *  semicircle of the local half depth) with its tip R ahead of the axis, and the parent's concentric shroud (radius R + gap). Shared by the
 *  control surface (ctlSection) and the parent's cove (wp18). b = overhang / control chord; R never less than 1.02 × the half depth (a rounded
 *  hinge face). Lips: where the shroud meets the skins. */
export function noseGeom(F, y, cf, b, gapIn) {
  const s = F.sec(y), c = s.c, z = F.pt(y, 0, 0)[2], xa = 1 - cf;
  const zAt = (x, side) => { const a = afAt(F, y, x); return z + (side > 0 ? a.yu : a.yl) * c; };
  const zm = (zAt(xa, 1) + zAt(xa, -1)) / 2, hd = (zAt(xa, 1) - zAt(xa, -1)) / 2, R = Math.max(b * cf * c, hd * 1.02), g = gapIn / 12;
  const meet = (side, r) => { let lo = Math.max(0, xa - 1.6 * r / c), hi = xa; for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2, d = Math.hypot((xa - m) * c, zAt(m, side) - zm); if (d > r) lo = m; else hi = m; } return (lo + hi) / 2; };
  // DC-005 (sourced nose): the NACA "blunt" overhang nose (ARR WR L-301 / L-355): the airfoil contour carried forward to a shoulder, then
  // a semicircle of the local half depth; its tip is R ahead of the axis, so the swept envelope (and the shroud, R + gap) is unchanged
  let xs = xa, rn = hd; for (let i = 0; i < 3; i++) { const half = (zAt(xs, 1) - zAt(xs, -1)) / 2; rn = Math.min(half, R); xs = xa - (R - rn) / c; }
  const zms = (zAt(xs, 1) + zAt(xs, -1)) / 2;
  return { s, c, z, xa, zm, hd, R, g, zAt, xs, rn, zms, xu: meet(1, R), xl: meet(-1, R), xuS: meet(1, R + g), xlS: meet(-1, R + g) };
}
/** nose fraction at span y: full above the ramp, growing from the rounded hinge face at the lower end (rudder) */
export function balAt(id, y) {
  const b = CTLS[id].balance ? CTLS[id].balance() : 0; if (!b) return 0;
  const [a] = span(id), ramp = CTLS[id].balRamp ? CTLS[id].balRamp() : 0; return ramp > 0 ? b * Math.min(1, Math.max(0, (y - a) / ramp)) : b;
}
/** section of the surface at span y: 2D points (FS, WL) in inches, hinge face bevelled for travel (or a balance nose) */
export function ctlSection(id, y) {
  const C = CTLS[id], F = P0(id), s = F.sec(y), c = s.c, z = (F.pt(y, 0, 0)[2]), cf = CTL[id].cf(), xh = 1 - cf;
  if (C.balance && C.balance()) return balSection(id, y, C, F, cf);
  const zAt = (x, side) => { const a = afAt(F, y, x); return z + (side > 0 ? a.yu : a.yl) * c; };
  const xg = xh + C.gap / 12 / c, depth = (zAt(xg, 1) - zAt(xg, -1)) * 12, bev = depth * Math.tan(C.travel() * D2R) + C.gap;
  const xH = xg, xB = xg + bev / 12 / c;   // hinge-side corner at the gap, the other corner set back by the bevel
  const N = 24, pts = [], hs = C.hinge;
  const x0 = { [hs]: xH, [-hs]: xB };
  const run = (side, rev) => { const a = x0[side], out = []; for (let i = 0; i <= N; i++) { const u = (1 - Math.cos(Math.PI * i / N)) / 2, x = a + (1 - a) * u; out.push([(s.le + x * c) * 12, zAt(x, side) * 12]); } return rev ? out.reverse() : out; };
  const up = run(1, true), lo = run(-1, false);   // upper TE → hinge face, then lower hinge face → TE
  lo.pop();   // the trailing edge point is shared through the closing edge
  pts.push(...up, ...lo);
  return { pts, xH, xB, depth, bev, chord: (1 - xH) * c * 12 };
}
function balSection(id, y, C, F, cf) {
  const G = noseGeom(F, y, cf, balAt(id, y), 0), { s, c, xa, zm, R, zAt } = G, N = 24, NA = 16;
  const run = (side, a, rev) => { const out = []; for (let i = 0; i <= N; i++) { const u = (1 - Math.cos(Math.PI * i / N)) / 2, x = a + (1 - a) * u; out.push([(s.le + x * c) * 12, zAt(x, side) * 12]); } return rev ? out.reverse() : out; };
  const up = run(1, G.xs, true), lo = run(-1, G.xs, false); lo.pop();
  // the semicircular nose about (x_s, mid-depth there), from the upper shoulder round the front to the lower shoulder
  const cx = s.le + G.xs * c, tu = Math.atan2(zAt(G.xs, 1) - G.zms, 0), tl = Math.atan2(zAt(G.xs, -1) - G.zms, 0) + 2 * Math.PI, arc = [];
  for (let i = 1; i < NA; i++) { const t = tu + (tl - tu) * i / NA; arc.push([(cx + G.rn * Math.cos(t)) * 12, (G.zms + G.rn * Math.sin(t)) * 12]); }
  const pts = [...up, ...arc, ...lo], depth = (zAt(xa, 1) - zAt(xa, -1)) * 12, axis = [(s.le + xa * c) * 12, zm * 12];
  // travel: rotate the surface about the axis (outward = toward the non-hinge skin) until a point enters the parent's material
  // (inside the airfoil envelope, forward of the axis and outside the shroud radius R + gap)
  const gIn = C.gap, sg = -C.hinge, inParent = ([X, Z]) => { const xf = (X / 12 - s.le) / c; if (xf <= 0 || xf >= xa) return false; const zi = Z / 12; if (zi > zAt(xf, 1) || zi < zAt(xf, -1)) return false; return Math.hypot(X - axis[0], Z - axis[1]) >= (R * 12 + gIn) - 1e-6; };
  // DC-005 review: the parent's lip corners (and its shroud) can enter the rotated surface between two of its vertices, so both
  // directions are tested (the old routine tested the surface's vertices only and read 58° where the true contact is near 48°)
  const Gs = noseGeom(F, y, cf, balAt(id, y), gIn), lipPts = [[(s.le + Gs.xuS * c) * 12, zAt(Gs.xuS, 1) * 12], [(s.le + Gs.xlS * c) * 12, zAt(Gs.xlS, -1) * 12]];
  const skinPt = (x, side) => { const xc = Math.max(0.02, x); return [(s.le + xc * c) * 12, zAt(xc, side) * 12]; };
  for (let i = 1; i <= 8; i++) lipPts.push(skinPt(Gs.xuS - 0.01 * i, 1), skinPt(Gs.xlS - 0.01 * i, -1));   // the parent's skins just ahead of the lips
  const inPoly = (P, poly) => { let w = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > P[1]) !== (yj > P[1]) && P[0] < (xj - xi) * (P[1] - yi) / (yj - yi) + xi) w = !w; } return w; };
  let contact = 90; for (let d = 0.25; d <= 90; d += 0.25) { const t = sg * d * D2R, cs = Math.cos(t), sn = Math.sin(t), rot = pts.map(([X, Z]) => [axis[0] + (X - axis[0]) * cs - (Z - axis[1]) * sn, axis[1] + (X - axis[0]) * sn + (Z - axis[1]) * cs]);
    if (rot.some(inParent) || lipPts.some((q) => inPoly(q, rot))) { contact = d - 0.25; break; } }
  return { pts, xH: xa, xB: xa, depth, bev: 0, chord: cf * c * 12, contact, balance: { b: balAt(id, y), R: R * 12, xn: xa - R / c, axis, mid: (zm - G.z) / c } };
}
/** DC-005 review: on a balanced surface the stations are shared with the parent's cove (wp18 finStations) so the two ruled lofts
 *  match: breakpoints at the span ends, the ramp end and the knee where the nose radius changes form (b·c_f·c = 1.02 × half depth),
 *  1 in apart over the ramp, ≤ 6 in elsewhere */
export function balBreaks(id) {
  const C = CTLS[id]; if (!(C.balance && C.balance())) return [];
  const [a, b] = span(id), ramp = C.balRamp ? C.balRamp() : 0, F = P0(id), cf = CTL[id].cf(), out = [a, b];
  if (ramp > 0) { const e = Math.min(b, a + ramp); out.push(e);
    const f = (y) => { const G = noseGeom(F, y, cf, balAt(id, y), 0); return balAt(id, y) * cf * G.c - 1.02 * G.hd; };
    if (f(a + 1e-6) < 0 && f(e) > 0) { let lo = a + 1e-6, hi = e; for (let i = 0; i < 50; i++) { const m = (lo + hi) / 2; if (f(m) > 0) hi = m; else lo = m; } out.push((lo + hi) / 2); } }
  return [...new Set(out.map((y) => +y.toFixed(5)))].sort((p, q) => p - q);
}
export function ctlStations(id) {
  const [a, b] = span(id), C = CTLS[id];
  if (!(C.balance && C.balance())) { const k = Math.ceil((b - a) * 12 / 6); return Array.from({ length: k + 1 }, (_, i) => +(a + (b - a) * i / k).toFixed(5)); }
  const br = balBreaks(id), ramp = C.balRamp ? C.balRamp() : 0, out = [br[0]];
  for (let i = 1; i < br.length; i++) { const a0 = out.at(-1), inRamp = br[i] <= a + ramp + 1e-9, k = Math.ceil((br[i] - a0) * 12 / (inRamp ? 1 : 6)); for (let j = 1; j <= k; j++) out.push(+(a0 + (br[i] - a0) * j / k).toFixed(5)); }
  return out;
}
const area2 = (p) => Math.abs(p.reduce((a, q, i) => { const r = p[(i + 1) % p.length]; return a + q[0] * r[1] - r[0] * q[1]; }, 0)) / 2;
export function ctlVolume(id) {
  const st = ctlStations(id); let V = 0;
  for (let i = 0; i < st.length - 1; i++) { const A = ctlSection(id, st[i]).pts, B = ctlSection(id, st[i + 1]).pts, m = A.map((p, j) => [(p[0] + B[j][0]) / 2, (p[1] + B[j][1]) / 2]); V += (st[i + 1] - st[i]) * 12 / 6 * (area2(A) + 4 * area2(m) + area2(B)); }
  return V;
}
export function ctlParams(id) {
  const st = ctlStations(id), rr = (a) => a.map(([u, v]) => [r4(u), r4(v)]);
  return { segs: st.slice(0, -1).map((y, i) => ({ piece: 'S', ha: r4(y * 12), hb: r4(st[i + 1] * 12), keep: [i === 0, i === st.length - 2], O: [[r4(y * 12), 0, 0], [r4(st[i + 1] * 12), 0, 0]],
    regions: { oml: [rr(ctlSection(id, y).pts), rr(ctlSection(id, st[i + 1]).pts)] } })), axes: { S: [[0, 1, 0], [0, 0, 1]] }, group: { oml: 'OML' }, feat: { OML: 'outline' }, n: st.length - 1 };
}
/** hinge-line numbers: length, normal force per inch (ult., at C_N = 1 and VD) */
export function hingeLoad(id, d) {
  const [a, b] = span(id), L = (b - a) * 12, cf = ctlSection(id, (a + b) / 2).chord, q = 0.5 * 0.002377 * (d.VD * 1.6878) ** 2 / 144;
  return { L, cf, q, w: d.FS * q * 1.0 * cf };
}
/** horn pad: plies needed for bolt bearing at the target reserve */
const padFor = (id, M, FS) => { const h = CTLS[id].horn, D = h.bolt / 16, P = FS * CTLS[id].rod; let n = 2; while (n < 40 && psi(M.BID.Fbru) / (P / (2 * D * n * tB)) - 1 < TGT) n++; return n; };

registerChecks('wp19-ctl', (d, lc, Z, M) => {
  const out = [];
  for (const [id, C] of Object.entries(CTLS)) {
    if (lc.type !== CTL[id].lc) continue;
    if (C.balance && C.balance()) { /* DC-005: discrete hinges on the axis, rows from wpAB (rudder-hinge, fin-hinge) */ } else {
    const H = HINGE, h = hingeLoad(id, d), F = h.w * H.knuckle;   // one knuckle's share
    const Apin = Math.PI * H.pin ** 2 / 4, tauP = F / Apin, brg = F / (H.pin * H.t), bond = h.w / H.leafBond;
    const pinAll = 0.55 * 75000, leafAll = 1.5 * 31000, bondAll = psi(M.GUD.ILSS);   // CRES wire F_su as 0.55 × F_tu; 5052-H34 bearing as 1.5 × F_tu
    const rows = [['pin shear', pinAll / tauP - 1], ['leaf bearing', leafAll / brg - 1], ['leaf bond', bondAll / bond - 1]], w = rows.reduce((a, r) => (r[1] < a[1] ? r : a));
    const cnMax = 1 + w[1];
    out.push(mk(id, `${id}-hinge`, `${id[0].toUpperCase() + id.slice(1)} hinge line (${H.std}, continuous)`, lc, `hinge line, ${h.L.toFixed(1)} in`, w[0], w[1], {
      formula: 'w = FS·q_D·C_N·c_f per inch;  each 0.5 in knuckle takes w·0.5: pin shear, leaf bearing on the pin;  leaf bond w / b_bond',
      inputs: [IN_('Dynamic pressure at VD', h.q, 'psi', 'DERIVED'), IN_('Normal-force coefficient C_N', 1.0, '', `BOUND: MS stays ≥ 0 up to C_N = ${cnMax.toFixed(1)}`), IN_('Surface chord c_f', h.cf, 'in', 'GEOMETRY'),
        IN_('Hinge', `${H.std}: Ø ${H.pin} pin, ${H.t}–0.056 in leaves, ${H.knuckle} in knuckles`, 'text', 'MS20257 (Boeing Distribution / Guden listings)'),
        IN_('Pin shear allowable', pinAll, 'psi', `BOUND: CRES wire taken at 75 ksi F_tu; MS stays ≥ 0 down to ${(tauP / 1000).toFixed(1)} ksi shear`), IN_('Leaf bearing allowable', leafAll, 'psi', `BOUND: 5052-H34 at 1.5 × 31 ksi; MS stays ≥ 0 down to ${(brg / 1000).toFixed(1)} ksi`),
        IN_('Leaf bond width', H.leafBond, 'in', 'GEOMETRY'), IN_('Bond allowable (ILSS)', bondAll, 'psi', allowB(bondAll / bond - 1, 'interlaminar shear strength'))],
      result: [['w (ult.)', h.w, 'lb/in'], ['τ pin', tauP, 'psi'], ['σ bearing', brg, 'psi'], ['τ bond', bond, 'psi']] }));
    }
    // horn: the rod load at its arm, two bolts in the pad
    const hn = C.horn, D = hn.bolt / 16, nP = padFor(id, M, d.FS), P = d.FS * C.rod, sbr = P / (2 * D * nP * tB), msB = psi(M.BID.Fbru) / sbr - 1;
    const Mh = P * hn.arm, sb = 6 * Mh / (hn.t * hn.w ** 2), msH = 35000 / sb - 1, ms = Math.min(msB, msH);
    out.push(mk(id, `${id}-horn`, `${id[0].toUpperCase() + id.slice(1)} horn: pad bearing and horn bending`, lc, 'inboard end, hinge-face web', msB < msH ? 'pad bearing' : 'horn bending', ms, {
      formula: 'P = FS·rod load;  σ_br = P / (2·D·t_pad);  σ_b = 6·P·a / (t·w²) at the bolt line',
      inputs: [IN_('Rod load (limit)', C.rod, 'lb', `FAR23: ${C.rodSrc}`), IN_('Horn', `6061-T6 ${hn.t} × ${hn.w} in, arm ${hn.arm} in`, 'text', 'SIZED'), IN_('Bolts', `2 × AN${hn.bolt} (Ø ${D})`, 'text', 'AN standard'),
        IN_('Pad', `${nP} × 6781`, 'text', 'SIZED'), IN_('Pad bearing allowable', psi(M.BID.Fbru), 'psi', allowB(msB, 'compressive strength (bearing not published)')), IN_('Horn F_ty', 35000, 'psi', 'MMPDS 6061-T6 sheet, A-basis')],
      result: [['P (ult.)', P, 'lb'], ['σ bearing', sbr, 'psi'], ['σ horn', sb, 'psi']] }));
  }
  return out;
});
export const padPlies = (id, M, FS) => padFor(id, M, FS);

// ------------------------------------------------------------------------------------------- ply book: true core, horn pad
export const CTL_RHO = (core) => BASE_MAT[core].rho * 62.43 / 1728;
export function ctlShell(plies) { const sel = plies.filter((p) => ['skin', 'web', 'doubler'].includes(p.region)); return { lb: sel.reduce((a, p) => a + p.weight, 0), in3: sel.reduce((a, p) => a + p.area * 144 * (p.plies || 1) * BASE_MAT[p.mat].t, 0) }; }
for (const id of Object.keys(CTLS)) registerBookExtras(id, (books, R) => {
  const b = books[id]; if (!b) return;
  const C = CTLS[id], [a] = span(id), nP = padFor(id, R.M, R.d.FS), pw = 2.0, ph = ctlSection(id, a).depth * 0.8;
  b.plies.push({ id: `${b.plies[0].id[0]}-HP`, mat: 'BID', angle: 45, region: 'doubler', side: -1, local: true, span: [a, a + pw / 12], chord: [0, 0.15], plies: nP, area: pw * ph / 144, weight: plyWeight('BID', pw * ph / 144, nP), step: 2, seq: b.plies.length + 1,
    note: `Horn pad: ${nP} × 6781 ±45 on the hinge-face web at the inboard end, ${pw} in wide, under the horn's two AN${C.horn.bolt} bolts`, flat: { kind: 'strip', L: pw, w0: ph, w1: ph } });
  const V = ctlVolume(id), sh = ctlShell(b.plies), core = Math.max(0, V - sh.in3);
  b.core = { ...b.core, volume: core / 1728, weight: core * CTL_RHO(b.core.mat), note: `${b.core.note} (${(core / 1728).toFixed(3)} ft³ from the part's sections)` };
});
