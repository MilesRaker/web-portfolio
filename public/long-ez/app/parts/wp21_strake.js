// WP21 — strake LEZ-57-180 (the fuel tank): its sections, the tank cavity and the ply book. The strake runs from the
// fuselage side (the root rib's face, at the fuselage's widest under the strake) to the end rib facing the wing root
// across the joint gap, and from its leading edge to the CS spar's forward face, the tank's aft wall. Aft of that the
// skins drop their core and lap the spar caps: LEZ-57-151. The shell is a PVC sandwich (2 BID ±45 outside, 1 BID 0/90
// inside); four ribs (root, two baffles, end) split the tank into three bays. Checks are in structures.js (strake-tank,
// strake-fwd). Sections are taken in constant-BL planes. Notional.
import { GEO, FIXED, BASE_MAT, strakeSec } from '../structures.js';
import { registerBookExtras, plyWeight } from '../plybook.js';
import { omlAt as _oml } from '../structures.js';
import { partByPN } from '../systems.js';

const r4 = (x) => Math.round(x * 1e4) / 1e4, tB = BASE_MAT.BID.t, F = FIXED.strake, g = GEO.strake;
export const STK = (() => {
  const tr = F.coreIn + 2 * F.ribBID * tB, tsh = F.coreIn + (F.faceBID + F.innerBID) * tB;
  const yR = g.yRoot * 12, yE = (GEO.join.y - GEO.join.gap) * 12, aft = (GEO.csSpar.s - GEO.csSpar.width / 2) * 12;
  return { tr, tsh, yR, yE, aft, ribs: g.ribs.map((y) => y * 12) };
})();
const N = 30;
/** outer mould line at BL y (in): upper aft → LE → lower aft, as [FS, WL] */
function omlPts(y) {
  const q = strakeSec(y / 12), xa = (STK.aft / 12 - q.le) / q.c, P = (x, side) => { const a = q.af(x); return [(q.le + x * q.c) * 12, (q.z + (side > 0 ? a.yu : a.yl) * q.c) * 12]; };
  const xs = Array.from({ length: N + 1 }, (_, i) => xa * (1 - Math.cos(Math.PI / 2 * (N - i) / N)));   // xa → 0, dense at the LE
  return [...xs.map((x) => P(x, 1)), ...xs.slice(0, -1).reverse().map((x) => P(x, -1))];
}
/** the tank cavity at BL y: the OML offset inward by the shell along the normals, closed by the spar face */
function cavityPts(y) {
  const o = omlPts(y), n = o.length, out = [];
  for (let i = 0; i < n; i++) {
    if (i === 0 || i === n - 1) { out.push(null); continue; }
    const a = o[i - 1], b = o[i + 1], tx = b[0] - a[0], tz = b[1] - a[1], L = Math.hypot(tx, tz), nx = -tz / L, nz = tx / L;   // inward normal (the ring runs upper aft → LE → lower aft)
    out.push([o[i][0] + nx * STK.tsh, o[i][1] + nz * STK.tsh]);
  }
  out[0] = [STK.aft, out[1][1] + (o[0][1] - o[1][1])]; out[n - 1] = [STK.aft, out[n - 2][1] + (o[n - 1][1] - o[n - 2][1])];
  return out.map((p) => [Math.min(p[0], STK.aft), p[1]]);
}
export const strakeSection = (y, cav) => (cav ? { oml: omlPts(y), cavity: cavityPts(y) } : { oml: omlPts(y) });
export function strakeStations() {
  const S = STK, brk = [S.yR, S.yE, S.yR + S.tr, S.yE - S.tr, ...S.ribs.slice(1, -1).flatMap((c) => [c - S.tr / 2, c + S.tr / 2])].sort((a, b) => a - b), out = [brk[0]];
  for (let i = 1; i < brk.length; i++) { const a = out.at(-1), k = Math.max(1, Math.ceil((brk[i] - a) / 2.5)); for (let j = 1; j <= k; j++) out.push(+(a + (brk[i] - a) * j / k).toFixed(5)); }
  return out;
}
const inRib = (y) => STK.ribs.some((c, i) => (i === 0 ? y < STK.yR + STK.tr : i === STK.ribs.length - 1 ? y > STK.yE - STK.tr : Math.abs(y - c) < STK.tr / 2));
export function strakeSegments() {
  const st = strakeStations(), segs = [];
  for (let i = 0; i < st.length - 1; i++) { const a = st[i], b = st[i + 1], cav = !inRib((a + b) / 2), A = strakeSection(a, cav), B = strakeSection(b, cav);
    segs.push({ a, b, first: i === 0, last: i === st.length - 2, regions: Object.fromEntries(Object.keys(A).map((k) => [k, [A[k], B[k]]])) }); }
  return segs;
}
const area2 = (p) => Math.abs(p.reduce((s, q, i) => { const r = p[(i + 1) % p.length]; return s + q[0] * r[1] - r[0] * q[1]; }, 0)) / 2;
export function strakeVolumes(segs = strakeSegments()) {
  const V = { OML: 0, cavity: 0 };
  for (const s of segs) for (const [k, [A, B]] of Object.entries(s.regions)) { const m = A.map((p, i) => [(p[0] + B[i][0]) / 2, (p[1] + B[i][1]) / 2]); V[k === 'oml' ? 'OML' : 'cavity'] += (s.b - s.a) / 6 * (area2(A) + 4 * area2(m) + area2(B)); }
  return V;
}
export function strakeParams() {
  const segs = strakeSegments(), rr = (a) => a.map(([u, v]) => [r4(u), r4(v)]);
  return { segs: segs.map((s) => ({ piece: 'S', ha: r4(s.a), hb: r4(s.b), keep: [s.first, s.last], O: [[r4(s.a), 0, 0], [r4(s.b), 0, 0]], regions: Object.fromEntries(Object.entries(s.regions).map(([k, [A, B]]) => [k, [rr(A), rr(B)]])) })),
    axes: { S: [[0, 1, 0], [0, 0, 1]] }, group: { oml: 'OML', cavity: 'cavity' }, feat: { OML: 'outline', cavity: 'cavity' }, n: segs.length };
}
/** skin arc lengths at BL y (in): upper and lower, LE to the spar face */
const arcs = (y) => { const o = omlPts(y), h = o.length >> 1; let u = 0, l = 0; for (let i = 1; i <= h; i++) u += Math.hypot(o[i][0] - o[i - 1][0], o[i][1] - o[i - 1][1]); for (let i = h + 1; i < o.length; i++) l += Math.hypot(o[i][0] - o[i - 1][0], o[i][1] - o[i - 1][1]); return { u, l }; };
export const STRAKE_RHO = { PVC: BASE_MAT[F.core].rho * 62.43 / 1728 };
export function strakeBidIn3(plies) { return plies.reduce((a, p) => a + p.area * 144 * (p.plies || 1) * BASE_MAT[p.mat].t, 0); }

// ------------------------------------------------------------------------------------------- ply book: trimmed to the spar face, inner face 0/90, ribs and core from the sections
registerBookExtras('strake', (books) => {
  const b = books.strake; if (!b) return;
  const st = strakeStations(), S = STK; let au = 0, al = 0;
  for (let i = 0; i < st.length - 1; i++) { const m = (st[i] + st[i + 1]) / 2, a = arcs(m), dy = st[i + 1] - st[i]; au += a.u * dy; al += a.l * dy; }
  for (const p of b.plies) {
    if (p.region === 'skin') { const A = (p.side > 0 ? au : al) / 144; p.span = [S.yR / 12, S.yE / 12]; p.area = A; if (p.inner) { p.angle = F.innerAngle; p.note = `${p.side > 0 ? 'Upper' : 'Lower'} skin, tank-side face: 6781 0/90 (fibres spanwise), fuel-resistant epoxy`; } p.weight = plyWeight(p.mat, A, p.plies || 1); p.note = `${p.note}; LE to the CS spar's forward face (LEZ-57-151 laps the caps)`; }
    if (p.region === 'rib') { const A = area2(cavityPts(p.y * 12)) / 144; p.area = A; p.weight = plyWeight(p.mat, A, p.plies || 1); p.flat = { kind: 'poly', pts: cavityPts(p.y * 12).map(([u, v]) => [u - S.aft + 60, v - 36]) }; }
  }
  const V = strakeVolumes(), bidIn3 = strakeBidIn3(b.plies), pvc = Math.max(0, V.OML - V.cavity - bidIn3);
  b.core = { ...b.core, volume: pvc / 1728, weight: pvc * STRAKE_RHO.PVC, note: `${F.coreIn} in HT61 sandwich skins and rib cores (${(pvc / 1728).toFixed(3)} ft³); the tank is hollow (${(V.cavity / 231).toFixed(1)} US gal inside the shell)` };
  b.hard = `Tank: ${STK.ribs.length} ribs, ${STK.ribs.length - 1} bays of ${((STK.ribs[1] - STK.ribs[0]) - STK.tr).toFixed(1)} in clear; shell ${F.faceBID} × 6781 ±45 / ${F.coreIn} in HT61 / ${F.innerBID} × 6781 0/90`;
});

// ------------------------------------------------------------------------------------------- LEZ-57-151: the strake skins over the CS spar caps
// Aft of the tank wall the strake's skins drop their core and lap the spar caps in 3 BID with flox, from 1 in onto the
// strake's outer skin to the spar's aft face (flush there: the wing's jut-out stands 0.15 in off it). Inside the tank a
// flox corner and a 2-ply BID tape seal the aft wall to each skin.
export const LAP = (() => { const n = 3, t = n * tB, s0 = STK.aft, s1 = GEO.firewall * 12, onto = 1.0, tape = { n: 2, w: 2.0 };
  return { n, t, s0, s1, onto, tape, cap: s1 - s0 }; })();
const lapBand = (y, side) => { const k = 8, pts = [], sAt = (i) => LAP.s0 + (LAP.s1 - LAP.s0) * i / k, z = (s) => { const o = _oml(s / 12, y / 12); return (side > 0 ? o.up : o.lo) * 12; };
  for (let i = 0; i <= k; i++) pts.push([sAt(i), z(sAt(i))]); for (let i = k; i >= 0; i--) pts.push([sAt(i), z(sAt(i)) - side * LAP.t]); return pts; };
export function lapStations() { const k = Math.ceil((STK.yE - STK.yR) / 4); return Array.from({ length: k + 1 }, (_, i) => +(STK.yR + (STK.yE - STK.yR) * i / k).toFixed(5)); }
export function lapVolumes() { const st = lapStations(); let V = 0; for (let i = 0; i < st.length - 1; i++) for (const sd of [1, -1]) { const A = lapBand(st[i], sd), B = lapBand(st[i + 1], sd), m = A.map((p, j) => [(p[0] + B[j][0]) / 2, (p[1] + B[j][1]) / 2]); V += (st[i + 1] - st[i]) / 6 * (area2(A) + 4 * area2(m) + area2(B)); } return { BID: V }; }
export function lapParams() {
  const st = lapStations(), rr = (a) => a.map(([u, v]) => [r4(u), r4(v)]);
  return { segs: st.slice(0, -1).map((y, i) => ({ piece: 'S', ha: r4(y), hb: r4(st[i + 1]), keep: [i === 0, i === st.length - 2], O: [[r4(y), 0, 0], [r4(st[i + 1]), 0, 0]], regions: { lap_u: [rr(lapBand(y, 1)), rr(lapBand(st[i + 1], 1))], lap_l: [rr(lapBand(y, -1)), rr(lapBand(st[i + 1], -1))] } })),
    axes: { S: [[0, 1, 0], [0, 0, 1]] }, group: { lap_u: 'BID', lap_l: 'BID' }, feat: { BID: 'lap' }, n: st.length - 1 };
}
/** the plies outside the solid: the 1 in onto the strake skin, and the aft-wall tapes inside the tank (lb) */
export function lapExtras() { const span = STK.yE - STK.yR, onto = 2 * LAP.onto * span * LAP.n, tapes = 2 * LAP.tape.w * span * LAP.tape.n;
  return [{ what: `Lap onto the strake's outer skin, ${LAP.onto} in, upper and lower`, a: onto, lb: plyWeight('BID', onto / 144, 1) }, { what: `Aft-wall tapes inside the tank, ${LAP.tape.n} × 6781 × ${LAP.tape.w} in, upper and lower corners`, a: tapes, lb: plyWeight('BID', tapes / 144, 1) }]; }
export const LAP_RHO = plyWeight('BID', 1, 1) / 144 / tB;
export const lapMassOf = (v) => (v.BID ?? 0) * LAP_RHO + lapExtras().reduce((a, l) => a + l.lb, 0);
{ const p = partByPN('LEZ-57-151'); if (p) { p.massEach = +lapMassOf(lapVolumes()).toFixed(3); p.src = { ...p.src, mass: 'GEOMETRY: the definition solid (LEZ-57-151)' }; } }

// ------------------------------------------------------------------------------------------- integral tank, 23.965(a)(2)
// Miles (2026-11-19): the strakes are integral fuel tanks, so pre-amendment-64 14 CFR 23.965(a)(2) applies: the tank structure must take
// the pressure developed at the maximum limit acceleration with a full tank, together with the critical limit structural loads. The
// pressure here (computed in this block; block F's value in docs/icd/f_fuel.md is to be reconciled with it at merge): full tank, fuel at
// 6.08 lb/US gal, the head the whole tank depth at the root (cavity, 0.9 × the section depth) under the limit load factor of the case
// (+4.4 / −1.76 g), plus the ram of a forward-facing vent at VD. Each is checked at FS 1.5 with the structural load of the same case.
import { registerChecks, mk, materials, laminate, plyRF, wrinkling, psi, strakeBays, surfaceLoads, CS_FIT, DEFAULT_DESIGN, allowB } from '../structures.js';
export const TANK = { rhoLbGal: 6.08, rho: 6.08 / 231, src: 'FAA-H-8083-25 / block F: avgas 6.08 lb/US gal (the coordinator\'s 23.965 value)', rule: '14 CFR 23.965(a)(2), pre-amendment 64 (2011 ed., govinfo.gov)' };
/** head (in) and limit pressure (psi) at load factor n */
export const tankHead = () => { const q = strakeSec(g.rootY); return q.tc * q.c * 12 * 0.9; };
export const tankP = (n, d = DEFAULT_DESIGN) => { const qD = 0.5 * 0.002377 * (d.VD * 1.6878) ** 2 / 144; return { head: tankHead(), qD, p: TANK.rho * tankHead() * Math.abs(n) + qD }; };
const IN2 = (n, v, u, s = 'DERIVED') => [n, v, u, s], bidS = (n, a = 45) => Array.from({ length: n }, () => ({ mat: 'BID', angle: a }));
registerChecks('wp21-tank', (d, lc, Z, M) => {
  if (!['sym', 'roll', 'canard'].includes(lc.type) || !lc.n) return [];
  // integration 2026-11-19 (ICD f_fuel F-S1 / a_airframe A-M6): block F's full-tank field governs at landing, 1.73 psi (3.0 g with the
  // 0.25 drag reaction, at the inboard leading-edge lower skin). Every case now takes the larger of this block's case pressure and F's
  // governing field (an envelope: F's landing peak paired with each case's structural load, conservative)
  const FF_ = FIXED.tankField?.(), P0 = tankP(lc.n, d), P = FF_ && FF_.w.p > P0.p ? { ...P0, p: FF_.w.p, from: `block F ${FF_.w.id} field ${FF_.w.p.toFixed(2)} psi` } : { ...P0, from: 'this case (head + vent ram)' };
  const out = [], pU = P.p * d.FS, inner = bidS(F.innerBID, F.innerAngle), fo = laminate(bidS(F.faceBID), M), fi = laminate(inner, M), dd = F.coreIn + (fo.h + fi.h) / 2;
  // skins between ribs: pressure bending (outer face tension, inner compression at mid-bay) + the strake's lift carried as skin membrane
  const b = Math.max(...strakeBays()) * 12, Mb = pU * b * b / 8, Np = Mb / dd, tau = pU * b / 2 / dd;
  const ac = lc.ac, Fs = (1 - ac.shareC) * ac.W / 2 * lc.n * 0.18, arm = (STK.yE - STK.yR) / 2, q = strakeSec(g.rootY), hR = q.tc * q.c * 12, cR = (STK.aft / 12 - q.le) * 12;
  const Ms = Math.abs(Fs) * arm * d.FS, Nm = Ms / (hR * cR), up = lc.n > 0;   // upper skin in compression for +g (lower in tension), shared by face thickness
  const sh = (L) => L.h / (fo.h + fi.h), oN = Np + (up ? -1 : 1) * Nm * sh(fo), iN = -Np + (up ? -1 : 1) * Nm * sh(fi);
  const ro = plyRF(bidS(F.faceBID), [oN, 0, 0], M), ri = plyRF(inner, [iN, 0, 0], M), wrI = iN < 0 ? wrinkling(fi.Ex, F.core, M) / (-iN / fi.h) : Infinity, wrO = oN < 0 ? wrinkling(fo.Ex, F.core, M) / (-oN / fo.h) : Infinity, core = psi(M[F.core].tau) / tau;
  const modes = [[`outer face ${ro.mode}`, ro.rf], [`inner face ${ri.mode}`, ri.rf], ['inner face wrinkling', wrI], ['outer face wrinkling', wrO], ['core shear', core]], w = modes.reduce((a, m) => (m[1] < a[1] ? m : a));
  out.push(mk('strake', 'strake-tank-comb', 'Integral tank skins: 23.965(a)(2) full-tank pressure at the limit load factor with the strake\'s lift load (combined)', lc, 'tank bay between ribs, root', w[0], w[1] - 1, {
    formula: 'p = max(ρ·h·|n| + q_D, p_F) (limit, full tank; p_F block F\'s governing field, landing 3.0 g + 0.25 drag);  M = FS·p·b²/8, N_p = M/d on the faces;  strake lift F = 0.18·(1 − share_c)·W/2·n at half the strake span: N_m = FS·F·arm/(h_root·c_root), shared by face thickness;  CLT first ply, Hoff wrinkling, core shear FS·p·b/(2d)',
    inputs: [IN2('Rule', TANK.rule, 'text', 'FAR23'), IN2('Fuel density', TANK.rhoLbGal, 'lb/gal', TANK.src), IN2('Head (full tank, root depth × 0.9)', P.head, 'in', 'MODEL'), IN2('Load factor', lc.n, 'g', 'FAR23'), IN2('Vent ram q_D', P.qD, 'psi', 'DERIVED'), IN2('Limit pressure (governing: ' + P.from + ')', P.p, 'psi', 'DERIVED: max of this case and block F\'s governing full-tank field (wpF1 tankPressure, docs/icd/f_fuel.md F-S1)'),
      IN2('Widest bay b', b, 'in', 'MODEL'), IN2('Strake lift share', 0.18, '', 'BOUND: as cs-cap (public-data estimate of the strake / inboard share)'), IN2('Root depth / chord', `${hR.toFixed(2)} / ${cR.toFixed(1)}`, 'in', 'MODEL'),
      IN2('Core shear allowable', psi(M[F.core].tau), 'psi', 'Diab Divinycell HT61 minimum 0.46 MPa × hot-wet (accessed 2026-11-19)'), IN2('Ply strengths', '6781 (MTM45-1) typical', 'text', allowB(w[1] - 1))],
    result: [['p (ult.)', pU, 'psi'], ['N pressure', Np, 'lb/in'], ['N lift membrane', Nm, 'lb/in'], ['τ core', tau, 'psi']] }));
  // end rib (outboard, the tank's closing wall at the joint): full-tank pressure on a sandwich strip spanning the tank depth
  { const rib = laminate(bidS(F.ribBID), M), dR = F.coreIn + rib.h, hT = P.head, Mr = pU * hT * hT / 8, Nr = Mr / dR, tR = pU * hT / 2 / dR;
    const rT = plyRF(bidS(F.ribBID), [Nr, 0, 0], M), wr = wrinkling(rib.Ex, F.core, M) / (Nr / rib.h), cr = psi(M[F.core].tau) / tR, wm = [['face', rT.rf], ['face wrinkling', wr], ['core shear', cr]].reduce((a, m) => (m[1] < a[1] ? m : a));
    out.push(mk('strake', 'strake-rib-p', 'Integral tank end rib: 23.965(a)(2) full-tank pressure (sandwich strip over the tank depth)', lc, 'end rib, joint side', wm[0], wm[1] - 1, {
      formula: 'M = FS·p·h²/8 per inch (simply supported by the skins);  N = M/d;  τ = FS·p·h/(2d);  the end rib carries no other structural load in this model (the wing root rib across the gap takes the joint)',
      inputs: [IN2('Limit pressure', P.p, 'psi', 'DERIVED'), IN2('Span (tank depth)', hT, 'in', 'MODEL'), IN2('Rib', `${F.ribBID} × 6781 ±45 each face on ${F.coreIn} in ${F.core}`, 'text', 'SIZED')], result: [['N face', Nr, 'lb/in'], ['τ core', tR, 'psi']] })); }
  // CS spar forward face (the tank's aft wall): web shear from the wing (limit × FS) with the full-tank pressure on the foam-filled box
  { const L = surfaceLoads('wing', d, lc); if (L) { const r = L.at(GEO.wing.attachY), hS = CS_FIT.depth * 12, Nxy = Math.abs(r.V) * d.FS / 2 / hS, web = plyRF(bidS(Z.csWeb), [0, -pU * 0, Nxy], M);
    const crush = psi(M.PVC.sc) * (M._env?.fcore ?? 1) / pU, wm = [[`web ${web.mode}`, web.rf], ['HT61 core compression under the pressure', crush]].reduce((a, m) => (m[1] < a[1] ? m : a));
    out.push(mk('csSpar', 'cs-tank-wall', 'CS spar forward face as the tank\'s aft wall: wing shear in the web with the 23.965(a)(2) full-tank pressure on the HT61-filled box', lc, 'forward web, BL ±12.6 to ±45', wm[0], wm[1] - 1, {
      formula: 'N_xy = FS·V/(2h) (limit wing shear, both webs);  the pressure bears on the web over the HT61 core that fills the box: σ_c = FS·p ≤ σ_c,HT61 (no web bending span)',
      inputs: [IN2('Attach shear V (limit)', r.V, 'lb', 'SCHRENK'), IN2('Depth h', hS, 'in', 'MODEL'), IN2('Limit pressure', P.p, 'psi', 'DERIVED'), IN2('HT61 compression', psi(M.PVC.sc), 'psi', 'Diab Divinycell H technical data June 2020 rev19, HT61 minimum 0.50 MPa (accessed 2026-11-19)')],
      result: [['N_xy (ult.)', Nxy, 'lb/in'], ['p (ult.)', pU, 'psi']] })); } }
  return out;
});
