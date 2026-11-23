// DC-005 (2026-11-21, after the second and third reviews): the rudder's set-back balance made buildable.
//  - loft clearance between the rudder's balance nose and the fin's shroud (shared stations), and the 3-D end clearance about the
//    true hinge axis (it leans ≈ 20° in the fin's section planes)
//  - three hinge brackets on the axis: a 6061-T6 tongue from the fin into a notch in the rudder's nose, the hinge bolt along the axis
//    in double shear through a clevis on the rudder's hinge web (a continuous hinge cannot cross the rotating nose; end pivot pins
//    would cantilever and could not be fitted)
//  - the cable/horn notch in the fin lip, the wiper seals, the ply-book extras
//  - flutter / mass balance
import { GEO, FIXED, registerChecks, mk, psi, allowB } from '../structures.js';
import { FRAMES, afAt, registerBookExtras, plyWeight } from '../plybook.js';
import { ctlSection, ctlStations, CTLS, noseGeom, balAt, hingeLoad, ctlVolume, ctlShell, CTL_RHO } from './wp19_ctl.js';
import { finSegments, finVolumes, wlShell, WL_RHO } from './wp18_winglet.js';
import { LINK, MAT, AN, CABLE, RUD } from './wpC1_controls.js';
import { RD_HORN } from './wpA6_rudder.js';
import { RSTOP } from './wpA8_tip.js';

const FU = FRAMES.winglet, IN_ = (n, v, u, s = 'DERIVED') => [n, v, u, s], TGT = 0.15, tB = 0.0101, D2R = Math.PI / 180;
const inPoly = (P, poly) => { let w = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > P[1]) !== (yj > P[1]) && P[0] < (xj - xi) * (P[1] - yi) / (yj - yi) + xi) w = !w; } return w; };
const segDist = (P, A, B) => { const dx = B[0] - A[0], dy = B[1] - A[1], L2 = dx * dx + dy * dy, t = L2 ? Math.max(0, Math.min(1, ((P[0] - A[0]) * dx + (P[1] - A[1]) * dy) / L2)) : 0; return Math.hypot(P[0] - A[0] - t * dx, P[1] - A[1] - t * dy); };
const polyDist = (P, poly) => { let d = Infinity; for (let i = 0; i < poly.length; i++) d = Math.min(d, segDist(P, poly[i], poly[(i + 1) % poly.length])); return d; };
const lerp = (A, B, t) => A.map((p, i) => [p[0] + (B[i][0] - p[0]) * t, p[1] + (B[i][1] - p[1]) * t]);
const span = () => { const C = CTLS.rudder, [a, b] = GEO.winglet.rudder; return [a + (C.endGapLo ?? C.endGap) / 12, b - (C.endGapHi ?? C.endGap) / 12]; };

// ------------------------------------------------------------------------------------------- loft and end clearances
/** least clearance (in; negative = overlap) between the rudder's loft and the fin's loft over the rudder span, sampled at
 *  fractions of every fin segment (both lofts are ruled between matching vertices, as the CAD builds them) */
export function balLoftClearance(nT = 8) {
  const rs = ctlStations('rudder'), RS = rs.map((h) => ctlSection('rudder', h).pts);
  const rudAt = (h) => { if (h < rs[0] - 1e-9 || h > rs.at(-1) + 1e-9) return null; const i = rs.findIndex((y) => y >= h - 1e-9); if (i <= 0) return RS[0]; return lerp(RS[i - 1], RS[i], (h - rs[i - 1]) / (rs[i] - rs[i - 1])); };
  let worst = { clr: Infinity, h: null }, n = 0;
  for (const sg of finSegments()) {
    if (sg.piece !== 'U') continue; const [fa, fb] = sg.regions.oml, za = FU.pt(sg.ha, 0, 0)[2] * 12, zb = FU.pt(sg.hb, 0, 0)[2] * 12;
    const FA = fa.map((q) => [q.p2[0], q.p2[1] + za]), FB = fb.map((q) => [q.p2[0], q.p2[1] + zb]);
    for (let k = 0; k <= nT; k++) { const t = k / nT, h = sg.ha + (sg.hb - sg.ha) * t, rp = rudAt(h); if (!rp) continue; n++; const fp = lerp(FA, FB, t);
      for (const q of rp) { const d = polyDist(q, fp), c = inPoly(q, fp) ? -d : d; if (c < worst.clr) worst = { clr: c, h: h * 12 }; }
      for (const q of fp) if (inPoly(q, rp)) { const c = -polyDist(q, rp); if (c < worst.clr) worst = { clr: c, h: h * 12 }; } }
  }
  return { ...worst, samples: n };
}
/** fin-section geometry helpers (frame ft → in) */
const LE0 = () => FU.pt(0, 0, 0), NH = () => { const a = LE0(), d = FU.pt(1, 0, 0), v = [0, d[1] - a[1], d[2] - a[2]], L = Math.hypot(...v); return v.map((x) => x / L); };
const E2 = () => { const a = LE0(), b = FU.pt(0, 0, 0, 1), v = [0, 1, 2].map((i) => b[i] - a[i]), L = Math.hypot(...v); return v.map((x) => x / L); };
/** a rudder section point (X, Z in the ctlSection frame, in) at station h → 3-D [FS, BL, WL] in */
export const rud3 = (h, X, Z) => { const s = FU.sec(h), c = s.c, z = FU.pt(h, 0, 0)[2]; return FU.pt(h, X / 12 / c - s.le / c, (Z / 12 - z) / c).map((v) => v * 12); };
/** a 3-D point (in) → its fin height h (ft), chord fraction x and lateral offset v (ft) */
export function finCoords(Q) { const q = Q.map((v) => v / 12), a = LE0(), nh = NH(), e2 = E2(), h = (q[1] - a[1]) * nh[1] + (q[2] - a[2]) * nh[2], o = FU.pt(h, 0, 0), s = FU.sec(h);
  return { h, x: (q[0] - o[0]) / s.c, v: [0, 1, 2].reduce((acc, i) => acc + (q[i] - o[i]) * e2[i], 0), c: s.c }; }
/** least clearance (in) between the rudder's end faces and the fin's material above and below the cove over 0–travel, rotating about
 *  the true 3-D hinge axis (RUD.rot); a rotated point counts only where it lies inside the fin's full section at its own height */
export function endClearance(step = 1, only = null) {
  const st = ctlStations('rudder'), [h0, h1] = GEO.winglet.rudder;
  const inFin = (Q) => { const f = finCoords(Q); if (f.x < 0 || f.x > 1) return { h: f.h, inside: false }; const a = afAt(FU, f.h, f.x); return { h: f.h, inside: f.v <= a.yu * f.c && f.v >= a.yl * f.c }; };
  const ring = (h) => { const P = ctlSection('rudder', h).pts, out = []; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; for (let k = 0; k < 4; k++) out.push(rud3(h, a[0] + (b[0] - a[0]) * k / 4, a[1] + (b[1] - a[1]) * k / 4)); } return out; };
  const R = { top: Infinity, bot: Infinity, thTop: 0, thBot: 0 }, rt = ring(st.at(-1)), rb = ring(st[0]);
  for (let th = only ?? 0; th <= (only ?? CTLS.rudder.travel()) + 1e-9; th += step) {
    for (const p of rt) { const f = inFin(RUD.rot(p, th)); if (f.inside) { const cl = (h1 - f.h) * 12; if (cl < R.top) { R.top = cl; R.thTop = th; } } }
    for (const p of rb) { const f = inFin(RUD.rot(p, th)); if (f.inside) { const cl = (f.h - h0) * 12; if (cl < R.bot) { R.bot = cl; R.thBot = th; } } } }
  return R;
}

// ------------------------------------------------------------------------------------------- hinges
/** 14 CFR 23.657(a) (text before Amdt 23-64): a non-standard bearing hinge takes a factor of safety ≥ 6.67 on the ultimate bearing strength of
 *  the softest bearing material; applied to the limit load at the rotating surfaces (clevis plates and tongue lug on the hinge bolt) */
export const HINGE_BRG = 6.67;
/** 14 CFR 23.393(b): loads parallel to the hinge line, K = 24 for vertical surfaces, × the surface weight (limit) */
export const K_HINGELINE = 24;
export const RHINGE = {
  notch: 2.5,   // in along the span: room to fit the hinge bolt along the axis from below the clevis
  brackets: [
    { id: 'bot', at: (a, b) => a + 3.5 / 12, bolt: 4, clevisT: 0.160, tongue: { t: 0.25, w: 1.2 }, finBolt: 4, washer: 1.0, washerStd: 'AN970-4' },
    { id: 'mid', at: (a, b) => (a + b) / 2, bolt: 3, clevisT: 0.090, tongue: { t: 0.25, w: 1.0 }, finBolt: 3, washer: 0.875, washerStd: 'AN970-3' },
    { id: 'top', at: (a, b) => b - 2.0 / 12, bolt: 3, clevisT: 0.090, tongue: { t: 0.25, w: 0.75 }, finBolt: 3, washer: 0.875, washerStd: 'AN970-3' }],
  thrust: 'bot', float: 0.03,   // the bottom bracket takes the hinge-line load (shimmed to 0.005 in); the mid and top tongues float 0.03 in each side
  pitch: 1.25, clevisBoltPitch: 0.6, clevisWasher: 0.4375 /* AN960-10 */, flox: 0.02,
  wiper: { mat: 'PET (Mylar) 0.010 in', w: 0.5, note: 'bonded to both fin lips, bearing lightly on the nose to seal the gap as in the sealed-gap balance data; the balance factor carries an allowance for imperfect sealing' },
  fork: { body: 0.40, len: 1.60 },   // BOUND: MS20667-6 body Ø and pin-to-swage-end length, to confirm on the part
};
export const xWeb = (h) => FIXED.ctl.rudderXsp * ctlSection('rudder', h).chord;
/** per-bracket geometry: height, tongue length (shroud face to axis), rudder depth, fin depth at the shroud face, web offset */
export function brackets() {
  const [a, b] = span();
  return RHINGE.brackets.map((B) => { const h = B.at(a, b), G = noseGeom(FU, h, GEO.winglet.rudderCf, balAt('rudder', h), GEO.winglet.gapIn), s = FU.sec(h), xw = G.xa - (G.R + G.g) / s.c, af = afAt(FU, h, Math.max(0.02, xw));
    return { ...B, h, Lt: (G.R + G.g) * 12, depth: ctlSection('rudder', h).depth, finDepth: (af.yu - af.yl) * s.c * 12, xWeb: xWeb(h), D: AN[B.bolt].d }; });
}
export const hingeH = () => { const B = brackets(); return { bot: B[0].h, mid: B[1].h, top: B[2].h }; };

/** reactions of a beam on three supports (ft positions xs) with overhangs, under a distributed load q(x) (lb/in, x in ft) and point loads
 *  [{x, P}] (one direction): simply supported between the outer two, the middle reaction from zero deflection there (flexibility) */
function beam3(xs, [a, b], q, pts) {
  const N = 600, dx = (b - a) / N, X = Array.from({ length: N + 1 }, (_, i) => a + i * dx), [xA, xB, xC] = xs;
  const solve = (qq, pp) => {   // simply supported at A, C: reactions, moment and deflection (EI = 1) at xB
    let F = 0, Mc = 0; for (let i = 0; i < N; i++) { const xm = X[i] + dx / 2, f = qq(xm) * dx * 12; F += f; Mc += f * (xC - xm); } for (const p of pp) { F += p.P; Mc += p.P * (xC - p.x); }
    const RA = Mc / (xC - xA), RC = F - RA, M = X.map((x) => { let m = 0; if (x > xA) m += RA * (x - xA) * 12; if (x > xC) m += RC * (x - xC) * 12; for (let i = 0; i < N; i++) { const xm = X[i] + dx / 2; if (xm < x) m -= qq(xm) * dx * 12 * (x - xm) * 12; } for (const p of pp) if (p.x < x) m -= p.P * (x - p.x) * 12; return m; });
    // deflection: integrate M twice, then fix y(A) = y(C) = 0
    const th = [0], y = [0]; for (let i = 1; i <= N; i++) { th.push(th[i - 1] + (M[i - 1] + M[i]) / 2 * dx * 12); y.push(y[i - 1] + (th[i - 1] + th[i]) / 2 * dx * 12); }
    const at = (arr, x) => { const k = Math.min(N - 1, Math.max(0, Math.floor((x - a) / dx))), t = (x - X[k]) / dx; return arr[k] + (arr[k + 1] - arr[k]) * t; };
    const yA = at(y, xA), yC = at(y, xC), yB = at(y, xB) - (yA + (yC - yA) * (xB - xA) / (xC - xA));
    return { RA, RC, yB };
  };
  const L = solve(q, pts), U = solve(() => 0, [{ x: xB, P: 1 }]), RB = L.yB / U.yB;   // the middle support pushes back RB
  const W = solve(() => 0, [{ x: xB, P: -RB }]);
  return [L.RA + W.RA, RB, L.RC + W.RC];
}
/** bracket reactions (lb, ult., magnitude in the section plane) over the cases:
 *  A: hinge-line air load w·(1 + overhang share) along the rudder's normal, with the cable at its design tension at the horn, θ 0–travel;
 *  B: at full travel against the rudder stop (no air): the cable and the stop force on the horn (vector sum) */
export function hingeReactions(d) {
  const B = brackets(), [a, b] = span(), xs = B.map((k) => k.h), hl = hingeLoad('rudder', d), bal = GEO.winglet.rudderBal || 0, w = hl.w * (1 + bal), wq = () => w;
  const Hn = CTLS.rudder.horn, arm = Hn.armAxis, rc = RSTOP.rcFrac * arm, hH = RD_HORN.h, Tc = d.FS * LINK.cable;
  const sec = ctlSection('rudder', hH), ax = sec.balance.axis, z0 = FU.pt(hH, 0, 0)[2] * 12, Vax = ax[1] - z0, P = [RUD.P[0], 0];
  const dirs = (th) => { const t = th * D2R, tip = [ax[0] - arm * Math.sin(t), Vax + arm * Math.cos(t)], uc0 = [P[0] - tip[0], P[1] - tip[1]], L = Math.hypot(...uc0), uc = uc0.map((v) => v / L);
    const av = [-Math.sin(t), Math.cos(t)], armEff = Math.abs(av[0] * uc[1] - av[1] * uc[0]) * arm; return { uc, us: [Math.cos(t), Math.sin(t)], un: [Math.sin(t), -Math.cos(t)], armEff }; };
  const worst = [0, 0, 0], tag = ['', '', ''];
  const run = (label, qx, qv, px, pv) => { const Rx = beam3(xs, [a, b], qx, px), Rv = beam3(xs, [a, b], qv, pv); for (let i = 0; i < 3; i++) { const R = Math.hypot(Rx[i], Rv[i]); if (R > worst[i]) { worst[i] = R; tag[i] = label; } } };
  for (let th = 0; th <= CTLS.rudder.travel() + 1e-9; th += 5) { const D = dirs(th);
    run(`air + cable at ${th}°`, () => w * D.un[0], () => w * D.un[1], [{ x: hH, P: Tc * D.uc[0] }], [{ x: hH, P: Tc * D.uc[1] }]); }
  { const th = CTLS.rudder.travel(), D = dirs(th), Fs = Tc * D.armEff / rc;
    run(`cable into the rudder stop at ${th}°`, () => 0, () => 0, [{ x: hH, P: Tc * D.uc[0] + Fs * D.us[0] }], [{ x: hH, P: Tc * D.uc[1] + Fs * D.us[1] }]); }
  return { w, wBase: hl.w, Tc, R: worst, cases: tag, xs };
}
/** sized plies: fin doublers each face under each bracket's lateral bolts, rudder clevis pads on the hinge web */
export function hingePlies(d, M) {
  const B = brackets(), R = hingeReactions(d).R, P = RHINGE, skin = 2, web = FIXED.ctl.hingeWebBID;
  return B.map((k, i) => { const Pu = R[i], Ff = Pu / 2 + Pu * k.Lt / P.pitch;   // fin base: the tongue's moment at the shroud face over the bolt pair
    let nFin = 0; while (nFin < 30 && Math.min(psi(M.BID.S) * Math.PI * k.washer * (skin + nFin) * tB, psi(M.BID.Fbru) * AN[k.finBolt].d * 2 * (skin + nFin) * tB) / Ff - 1 < TGT) nFin++;
    const Fb = Pu / 4, Ft = Pu * k.xWeb / P.clevisBoltPitch / 2;   // clevis bolts: shear share and the moment couple on the web
    let nPad = 0; while (nPad < 30 && Math.min(psi(M.BID.Fbru) * AN[3].d * (web + nPad) * tB / Fb, psi(M.BID.S) * Math.PI * P.clevisWasher * (web + nPad) * tB / Ft) - 1 < TGT) nPad++;
    const baseV = k.finDepth - 2 * (skin + nFin) * tB - 2 * P.flox;
    return { id: k.id, P: Pu, Ff, nFin, Fb, Ft, nPad, baseV }; });
}
registerChecks('wpAB-rudbal', (d, lc, Z, M) => {
  if (lc.type !== 'rudder') return [];
  const H = hingeReactions(d), B = brackets(), PL = hingePlies(d, M), m6 = MAT['6061'], lim = (P) => P / d.FS, Wr = rudderMassProps().M, Fax = d.FS * K_HINGELINE * Wr, out = [];
  // rudder side: hinge bolts, clevis plates (rotating bearing), clevis to the hinge web, hinge-line load on a clevis plate
  { const terms = []; B.forEach((k, i) => { const P = H.R[i], pl = PL[i], web = FIXED.ctl.hingeWebBID;
      terms.push([`${k.id}: AN${k.bolt} hinge bolt double shear`, 2 * AN[k.bolt].s / P - 1], [`${k.id}: clevis on the hinge bolt (23.657, 6.67 × limit)`, m6.Fbru * k.D * k.clevisT * 2 / (HINGE_BRG * lim(P)) - 1],
        [`${k.id}: clevis bolts bearing on the hinge web + pad`, psi(M.BID.Fbru) * AN[3].d * (web + pl.nPad) * tB / pl.Fb - 1], [`${k.id}: clevis bolts pull-through on the web + pad`, psi(M.BID.S) * Math.PI * RHINGE.clevisWasher * (web + pl.nPad) * tB / pl.Ft - 1]); });
    { const kb = B[0]; terms.push([`${kb.id} (thrust bracket): hinge-line load (23.393, K = 24) on one clevis plate, bending (0.75 in wide)`, m6.Fty * 0.75 * kb.clevisT ** 2 / 6 / (Fax * kb.xWeb) - 1]); }   // the bottom bracket is shimmed close; mid and top float 0.03 in along the span
    const w = terms.reduce((a, t) => (t[1] < a[1] ? t : a));
    out.push(mk('rudder', 'rudder-hinge', 'Rudder hinges: three brackets on the axis, rudder side (set-back balance, DC-005)', lc, `brackets at h ${B.map((k) => (k.h * 12).toFixed(2)).join(' / ')} in`, w[0], w[1], {
      formula: 'reactions of the rudder as a beam on the three brackets (flexibility), per direction in the section plane, magnitude: case A air load w·(1 + overhang) along the rudder normal + cable at its design tension at the horn, θ 0–30°; case B cable into the rudder stop at 30° (vector sum); rotating bearings at 6.67 × limit (14 CFR 23.657(a)); hinge-line load 24 × W (23.393(b))',
      inputs: [IN_('Hinge-line load w (ult.), incl. the overhang share', H.w, 'lb/in', `wp19 hingeLoad ${H.wBase.toFixed(2)} lb/in (C_N = 1 at VD, BOUND) × (1 + ${GEO.winglet.rudderBal})`), IN_('Cable design tension (ult.)', H.Tc, 'lb', 'LEZ-27-151 (LINK.cable × FS)'),
        IN_('Brackets (bolt / clevis plates)', B.map((k) => `${k.id} AN${k.bolt} / 2 × ${k.clevisT} in`).join('; '), 'text', 'DESIGN'), IN_('AN shank shear', `${AN[3].s} / ${AN[4].s}`, 'lb', 'AN standard (MIL-HDBK-5J 2.3.1.0(c2))'),
        IN_('Clevis pads on the hinge web', PL.map((p) => `${p.id} ${p.nPad}`).join(', '), 'plies', 'SIZED'), IN_('6061-T6 bearing / yield', `${m6.Fbru} / ${m6.Fty}`, 'psi', m6.spec), IN_('BID bearing / in-plane shear', `${psi(M.BID.Fbru).toFixed(0)} / ${psi(M.BID.S).toFixed(0)}`, 'psi', allowB(w[1]))],
      result: [...B.map((k, i) => [`${k.id} bracket (ult.), ${H.cases[i]}`, H.R[i], 'lb']), ['Hinge-line load (ult.)', Fax, 'lb'], ...terms.map(([n, v]) => [`MS ${n}`, v, ''])] }));
  }
  // fin side: tongues (bending at the shroud face, lug bearing, end distance to the web), base blocks (bolts on the skins, fit)
  { const terms = []; B.forEach((k, i) => { const P = H.R[i], pl = PL[i], T = k.tongue, sb = P * k.Lt * 6 / (T.t * T.w ** 2);
      terms.push([`${k.id}: tongue bending at the shroud face`, m6.Fty / sb - 1], [`${k.id}: tongue lug on the hinge bolt (23.657)`, m6.Fbru * k.D * T.t / (HINGE_BRG * lim(P)) - 1],
        [`${k.id}: tongue end (1.5 D) + 0.06 in short of the hinge web`, (k.xWeb - 0.06) / (1.5 * k.D) - 1], [`${k.id}: base bolts on the fin skins + doubler`, Math.min(psi(M.BID.S) * Math.PI * k.washer * (2 + pl.nFin) * tB, psi(M.BID.Fbru) * AN[k.finBolt].d * 2 * (2 + pl.nFin) * tB) / pl.Ff - 1],
        [`${k.id}: base block fits between the skins (≥ 0.5 in)`, pl.baseV / 0.5 - 1]); });
    const w = terms.reduce((a, t) => (t[1] < a[1] ? t : a));
    out.push(Object.assign(mk('winglet', 'fin-hinge', 'Rudder hinge brackets in the fin: tongues and base blocks', lc, 'fin, rudder cove', w[0], w[1], {
      formula: 'tongue σ = 6·P·L_t/(t·w²) at the shroud face; lug at 6.67 × limit; base block F = P/2 + P·L_t/pitch per lateral bolt, the lesser of pull-through τ = F/(π·D_w·t) and bearing; the block between the skins and doublers',
      inputs: [IN_('Tongues (t × w, L_t)', B.map((k) => `${k.id} ${k.tongue.t} × ${k.tongue.w}, ${k.Lt.toFixed(2)} in`).join('; '), 'text', 'DESIGN'), IN_('Base bolt pairs', `${RHINGE.pitch} in apart; ${B.map((k) => `${k.id} AN${k.finBolt} + ${k.washerStd}`).join(', ')}`, 'text', 'DESIGN'),
        IN_('Fin hinge doublers, each face', PL.map((p) => `${p.id} ${p.nFin}`).join(', '), 'plies', 'SIZED')],
      result: [...PL.map((p) => [`${p.id}: base bolt force (ult.)`, p.Ff, 'lb']), ...PL.map((p) => [`${p.id}: room for the base block`, p.baseV, 'in']), ...terms.map(([n, v]) => [`MS ${n}`, v, ''])] }), { sys: 'LEZ-57-130' }));
  }
  { const C = balLoftClearance(8), need = 0.03, ms = C.clr / need - 1;
    out.push(Object.assign(mk('winglet', 'bal-loft', 'Rudder balance nose to fin shroud: least clearance between the lofts', lc, `h ${C.h?.toFixed(2)} in`, 'clearance', ms, {
      formula: 'both ruled lofts sampled at 8 fractions of every segment (shared stations); least distance between the polygons, negative = overlap; required ≥ half the 0.06 in nominal gap',
      inputs: [IN_('Nominal gap', GEO.winglet.gapIn, 'in', 'DESIGN'), IN_('Samples', C.samples, '', 'DERIVED')], result: [['Least clearance', C.clr, 'in']] }), { sys: 'LEZ-57-130' }));
  }
  { const E = endClearance(1), need = 0.03, ms = Math.min(E.top, E.bot) / need - 1, C = CTLS.rudder;
    out.push(mk('rudder', 'rud-endgap', 'Rudder end faces to the fin above and below the cove over 0–30°, about the true 3-D hinge axis', lc, 'rudder ends', E.top < E.bot ? 'top end' : 'bottom end', ms, {
      formula: 'end-face points rotated about the hinge axis (it leans ≈ 20° in the fin\'s section planes, so the ends move along h); clearance to the cove end planes where the point lies inside the fin\'s full section',
      inputs: [IN_('End gaps (bottom / top)', `${C.endGapLo} / ${C.endGapHi}`, 'in', 'DESIGN (sized here)'), IN_('Required', need, 'in', 'DESIGN')], result: [['Top end, least', E.top, 'in'], ['at', E.thTop, '°'], ['Bottom end, least', E.bot, 'in'], ['at', E.thBot, '°']] }));
  }
  return out;
});

// ------------------------------------------------------------------------------------------- the cable's notch in the fin lip
/** the swept volume of the horn (with its fairing) and the cable's fork end through 0–30° about the true 3-D axis, against the fin's
 *  outboard skin: the notch through the skin (FS and h range) so both pass with ≥ 0.06 in; inside the skin the cable runs in a core
 *  relief channel from the pulley (reported as the depth it needs) */
export function finNotch() {
  const h0 = RD_HORN.h, sc = ctlSection('rudder', h0), ax = sc.balance.axis, z0 = FU.pt(h0, 0, 0)[2] * 12, Vax = ax[1] - z0, Hn = CTLS.rudder.horn, arm = Hn.armAxis, clr = 0.06;
  const G = noseGeom(FU, h0, GEO.winglet.rudderCf, balAt('rudder', h0), GEO.winglet.gapIn), s = FU.sec(h0), lipX = (s.le + G.xuS * s.c) * 12, fair = 0.10;
  const pts0 = [];   // horn plate (both faces) + fairing shell, at neutral, in the horn's section (X, Z)
  for (let r = 0; r <= arm + 0.25 + fair; r += 0.04) for (let q = -Hn.w / 2; q <= Hn.w / 2 + 1e-9; q += 0.0625) for (const dz of [-(Hn.t / 2 + fair), 0, Hn.t / 2 + fair]) pts0.push({ X: ax[0] + q, Z: ax[1] + r, dh: dz / 12 });
  let fs0 = Infinity, hLo = Infinity, hHi = -Infinity, deep = 0, n = 0;
  const test = (Q) => { const f = finCoords(Q); if (f.x < 0 || f.x > 1) return; const xIn = f.x * f.c * 12 + FU.pt(f.h, 0, 0)[0] * 12, a = afAt(FU, f.h, f.x), vs = a.yu * f.c * 12, v = f.v * 12;
    if (xIn < lipX && v < vs + clr && v > 0) { n++; fs0 = Math.min(fs0, xIn - clr); hLo = Math.min(hLo, f.h * 12 - clr); hHi = Math.max(hHi, f.h * 12 + clr); deep = Math.max(deep, vs - v + clr); } };
  for (let deg = 0; deg <= CTLS.rudder.travel() + 1e-9; deg += 2) {
    for (const p of pts0) test(RUD.rot(rud3(h0 + p.dh, p.X, p.Z), deg));
    const tip = RUD.rot(RD_HORN.at.map((v) => v * 12), deg), dv = [RUD.P[0] - tip[0], RUD.P[1] - tip[1], RUD.P[2] - tip[2]], L = Math.hypot(...dv), u = dv.map((v) => v / L);
    for (let t = 0; t <= Math.min(RHINGE.fork.len, L); t += 0.04) for (const o of [-1, 0, 1]) { const c = [tip[0] + u[0] * t, tip[1] + u[1] * t, tip[2] + u[2] * t + o * RHINGE.fork.body / 2]; test(c); } }
  return { h: h0 * 12, lipX, fs: [fs0, lipX], len: lipX - fs0, hRange: [hLo, hHi], width: hHi - hLo, relief: deep, hits: n };
}

// ------------------------------------------------------------------------------------------- rudder ply book: the nose, clevis pads, notch edges
/** nose surface per side (ft²): the part of each section's perimeter ahead of the hinge axis, over the span */
export function noseArea() {
  const st = ctlStations('rudder'); let A = 0;
  const per = (h) => { const s = ctlSection('rudder', h), ax = s.balance.axis, P = s.pts; let L = 0; for (let i = 0; i < P.length; i++) { const a = P[i], q = P[(i + 1) % P.length]; if ((a[0] + q[0]) / 2 < ax[0]) L += Math.hypot(q[0] - a[0], q[1] - a[1]); } return L; };
  for (let i = 0; i < st.length - 1; i++) A += (st[i + 1] - st[i]) * 12 * (per(st[i]) + per(st[i + 1])) / 2;
  return A / 2 / 144;
}
export const NOSE_PLIES = () => FIXED.ctl.rudderSkinBID + FIXED.ctl.rudderDblBID;   // the skin and the hinge doubler both wrap the nose
registerBookExtras('rudder-balance', (books, R) => {   // own key: the registry replaces by key, and 'rudder' is wpA6's
  const b = books.rudder; if (!b || !(CTLS.rudder.balance && CTLS.rudder.balance())) return;
  const [a, bb] = span(), An = noseArea(), n = NOSE_PLIES(), next = () => b.plies.length + 1, PL = hingePlies(R.d, R.M), BR = brackets();
  for (const side of [-1, 1]) b.plies.push({ id: `R-N${side < 0 ? 'L' : 'U'}`, mat: 'BID', angle: 45, region: 'skin', side, span: [a, bb], plies: n, area: An, weight: plyWeight('BID', An, n), step: side < 0 ? 3 : 5, seq: next(),
    note: `DC-005 balance nose, ${side < 0 ? 'inboard' : 'outboard'} half: the skin and the hinge doubler carried round the nose (${n} × 6781 ±45), lapping 1 in onto the other side at the nose tip`, flat: { kind: 'strip', L: (bb - a) * 12, w0: An * 144 / ((bb - a) * 12), w1: An * 144 / ((bb - a) * 12) } });
  BR.forEach((k, i) => { const np = PL[i].nPad, w = RHINGE.notch + 1.0, ht = k.depth * 0.9;
    b.plies.push({ id: `R-C${i + 1}`, mat: 'BID', angle: 45, region: 'doubler', side: 0, local: true, span: [k.h - w / 24, k.h + w / 24], chord: [0, 0.15], plies: np, area: w * ht / 144, weight: plyWeight('BID', w * ht / 144, np), step: 2, seq: next(),
      note: `Clevis pad (${k.id} bracket): ${np} × 6781 ±45 on the hinge web, ${w} in along the span, under the clevis's 4 × AN3 bolts; the ${RHINGE.notch} in nose notch's edges closed with 2 × 6781`, flat: { kind: 'strip', L: w, w0: ht, w1: ht } }); });
  const V = ctlVolume('rudder'), sh = ctlShell(b.plies), core = Math.max(0, V - sh.in3);
  b.core = { ...b.core, volume: core / 1728, weight: core * CTL_RHO(b.core.mat), note: `HT61, CNC-milled to the parent's aft contour, nose included (${(core / 1728).toFixed(3)} ft³ from the part's sections)` };
});

// ------------------------------------------------------------------------------------------- winglet ply book: hinge doublers and the notch edges
registerBookExtras('winglet-rudder-hinge', (books, R) => {   // own key: 'winglet' is wp18's
  const b = books.winglet; if (!b || !GEO.winglet.rudderBal) return;
  const PL = hingePlies(R.d, R.M), next = () => b.plies.length + 1, xa = 1 - GEO.winglet.rudderCf;
  brackets().forEach((k, i) => { const n = PL[i].nFin, h0 = k.h - 1.25 / 12, h1 = k.h + 1.25 / 12, ar = 2.5 * 2.0 / 144;
    for (const side of [-1, 1]) b.plies.push({ id: `L-H${i + 1}${side < 0 ? 'I' : 'O'}`, mat: 'BID', angle: 45, region: 'doubler', side, local: true, span: [h0, h1], chord: [xa - 0.2, xa - 0.05], plies: n, area: ar, weight: plyWeight('BID', ar, n), step: side < 0 ? 5 : 8, seq: next(),
      note: `DC-005 rudder hinge doubler (${k.id} bracket): ${n} × 6781 ±45 each face, 2.5 × 2 in under the ${k.washerStd} washers`, flat: { kind: 'strip', L: 2.5, w0: 2.0, w1: 2.0 } }); });
  const N = finNotch(), a = (N.width + 2) * (N.len + 2) / 144; b.plies.push({ id: 'L-HN', mat: 'BID', angle: 45, region: 'doubler', side: 1, local: true, span: [N.hRange[0] / 12, N.hRange[1] / 12], chord: [xa - 0.1, xa], plies: 2, area: a, weight: plyWeight('BID', a, 2), step: 8, seq: next(),
    note: 'DC-005 cable/horn notch in the outboard lip: 2 × 6781 ±45 closing its edges, 1 in round', flat: { kind: 'strip', L: N.len + 2, w0: N.width + 2, w1: N.width + 2 } });
  { const V = finVolumes(), sh = wlShell(b.plies), pvc = Math.max(0, V.OML - V.UNI - sh.in3); b.core = { ...b.core, volume: pvc / 1728, weight: pvc * WL_RHO.PVC }; }   // as wp18, with the doublers in
});

// ------------------------------------------------------------------------------------------- flutter / mass balance
/** hardware carried by the rudder: lb, x (in, aft of the axis +), z (in) */
export const rudHW = () => [...brackets().map((k) => [`${k.id} clevis: 2 × 6061-T6 ${k.clevisT} in plates + 4 × AN3 + hinge-bolt nut side`, 2 * k.clevisT * 0.75 * (k.xWeb + 0.5) * MAT['6061'].rho + 0.05, k.xWeb / 2, 0]),
  ['Horn 6061-T6 (on the axis, outboard)', 0.040, 0, 0.8], ['Horn fairing (glass)', 0.012, 0, 1.0], ['Return-spring eye', 0.010, 1.0, 0]];
/** rudder mass properties about its hinge axis, per side, from the sections and the ply schedule (skin aft of 35 %, skin + doubler forward and
 *  round the nose, the hinge web at xWeb, HT61 core less the shell) plus the hinge hardware; x positive aft of the axis (in) */
export function rudderMassProps() {
  const C = FIXED.ctl, aw = plyWeight('BID', 1, 1) / 144, rhoC = CTL_RHO('PVC'), st = ctlStations('rudder');
  let M = 0, S = 0, I = 0; const add = (m, x, z) => { M += m; S += m * x; I += m * (x * x + z * z); };
  for (let i = 0; i < st.length - 1; i++) { const L = (st[i + 1] - st[i]) * 12;
    for (const h of [st[i], st[i + 1]]) { const s = ctlSection('rudder', h), ax = s.balance.axis, P = s.pts, ch = s.chord, w = L / 2, xw = xWeb(h); let per = 0;
      for (let k = 0; k < P.length; k++) { const a = P[k], q = P[(k + 1) % P.length], Ls = Math.hypot(q[0] - a[0], q[1] - a[1]), x = (a[0] + q[0]) / 2 - ax[0], z = (a[1] + q[1]) / 2 - ax[1]; per += Ls;
        const n = x < 0.35 * ch ? C.rudderSkinBID + C.rudderDblBID : C.rudderSkinBID; add(aw * n * Ls * w, x, z); }
      add(aw * C.hingeWebBID * s.depth * w, xw, 0);
      let A = 0, cx = 0, iz = 0; for (let k = 0; k < P.length; k++) { const a = [P[k][0] - ax[0], P[k][1] - ax[1]], q = [P[(k + 1) % P.length][0] - ax[0], P[(k + 1) % P.length][1] - ax[1]], cr = a[0] * q[1] - q[0] * a[1]; A += cr / 2; cx += (a[0] + q[0]) * cr / 6; iz += (a[0] ** 2 + a[0] * q[0] + q[0] ** 2 + a[1] ** 2 + a[1] * q[1] + q[1] ** 2) * cr / 12; }
      const sg = Math.sign(A) || 1, Ac = A * sg, kc = Math.max(0, 1 - per * 2 * tB / Ac);   // core less a mean 2-ply shell
      M += rhoC * Ac * kc * w; S += rhoC * cx * sg * kc * w; I += rhoC * iz * sg * kc * w; } }
  for (const [, m, x, z] of rudHW()) add(m, x, z);
  // ballast provision: a Ø 0.6 in lead-rod pocket on the nose circle's centre over the full-balance span, less the bracket notches; the lead
  // needed is S over the pocket's length-weighted mean arm
  const [a] = span(), ramp = (GEO.winglet.rudderBalRamp || 0), BR = brackets(); let Lp = 0, mom = 0;
  for (let i = 0; i < st.length - 1; i++) { const y0 = st[i], y1 = st[i + 1]; if (y0 < a + ramp - 1e-9) continue; const ym = (y0 + y1) / 2;
    const cut = BR.reduce((c, k) => c + Math.max(0, Math.min(y1, k.h + RHINGE.notch / 24) - Math.max(y0, k.h - RHINGE.notch / 24)), 0), len = ((y1 - y0) - cut) * 12;
    const G = noseGeom(FU, ym, GEO.winglet.rudderCf, balAt('rudder', ym), 0); Lp += len; mom += len * (G.R - G.rn) * 12; }
  const xl = -mom / Lp, lead100 = S / -xl;
  return { M, S, I, cg: S / M, xLead: xl, lead100, lead50: lead100 / 2, pocketLen: Lp, pocket: `${Lp.toFixed(1)} in of Ø 0.6 in lead-rod pocket on the nose's centre line over the full-balance span (the bracket notches excluded)` };
}
registerChecks('wpAB-flutter', (d, lc) => {
  if (lc.type !== 'rudder') return [];
  const P = rudderMassProps(), cap = P.pocketLen * Math.PI * 0.3 ** 2 * MAT.lead.rho, ms = cap / P.lead100 - 1;
  return [mk('rudder', 'rud-massbal', 'Rudder mass balance: static unbalance, inertia, and the nose ballast provision', lc, 'hinge axis', 'ballast pocket holds 100 % static balance', ms, {
    formula: 'S = Σ m·x, I = Σ m·(x²+z²) about the hinge axis from the sections and the ply schedule plus the hinge hardware; lead for 100 % static balance = S / x̄_lead (length-weighted over the pocket); capacity = L·π·0.3²·ρ_lead',
    inputs: [IN_('Ply schedule', `skin ${FIXED.ctl.rudderSkinBID} ply aft of 35 %, ${FIXED.ctl.rudderSkinBID + FIXED.ctl.rudderDblBID} forward and round the nose; web ${FIXED.ctl.hingeWebBID} at ${FIXED.ctl.rudderXsp} c aft of the axis`, 'text', 'SIZED (DC-005)'),
      IN_('Lead arm ahead of the axis (pocket mean)', -P.xLead, 'in', 'GEOMETRY (the nose semicircle\'s centre)'), IN_('Criteria', '14 CFR 23.629(d) simplified criteria do not apply (winglet rudder, unconventional tail); AC 23.629-1B gives no rudder static-balance number; Report 45 K/I charts not read', 'text', 'AC 23.629-1B (faa.gov, 2004); Report 45 (DTIC ADA955270)'),
      IN_('Disposition', 'no ballast fitted: 100 % balance would add the lead below at each wing tip, aft of the wing\'s torsion axis (a wing-flutter driver); clearance by analysis + ground vibration test + flight flutter test (R-STR-8r), ballast fitted only if those call for it', 'text', 'DESIGN')],
    result: [['Rudder mass with hardware (per side)', P.M, 'lb'], ['Static unbalance (aft +)', P.S, 'lb·in'], ['CG aft of the axis', P.cg, 'in'], ['Inertia about the axis', P.I, 'lb·in²'], ['Lead for 100 % static balance', P.lead100, 'lb'], ['Pocket capacity', cap, 'lb']] })];
});
