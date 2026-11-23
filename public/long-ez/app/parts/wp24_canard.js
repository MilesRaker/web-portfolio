// WP24 — canard LEZ-55-120: the attach to the fuselage and the part's sections. One piece tip to tip, it sits in the
// fuselage top between F22 and F28, its lower surface on the bulkheads' top edges. At BL ±attachY a BID tab bonded under
// the spar hangs down on F22's forward face and takes fore-aft AN bolts into the F22 hard point; a smaller tab at F28
// takes an AN pin that, with the F22 bolts, reacts the root torque. Checks: tab bearing and bolt shear at F22, the tab's
// bond to the canard, its net section between the bolts, the F28 pin.
// Sections are taken in BL planes (half span, mirrored). Notional.
import { GEO, FIXED, registerChecks, mk, surfaceLoads, surfaceGeom, psi, allowB, BASE_MAT, DEFAULT_DESIGN, effective, loadCases, materials, size } from '../structures.js';
import { cutsVol, cutParams } from './cuts.js';
import { FRAMES, afAt, registerBookExtras, plyWeight } from '../plybook.js';

const FF = 1.15, TGT = 0.15, IN_ = (n, v, u, s = 'DERIVED') => [n, v, u, s], r4 = (x) => Math.round(x * 1e4) / 1e4;
const tU = BASE_MAT.UNI.t, tB = BASE_MAT.BID.t, tS = FIXED.skinBID * tB, G = GEO.canard, GM = surfaceGeom('canard');
const AN = { 3: 2126, 4: 3682, 5: 5750, 6: 8280 };   // single shear, Fsu 75 ksi × π/4 d² (MIL-HDBK-5J 125 ksi column, derived; accessed 2026-11-19)
let ZZ = null; const Zc = () => (ZZ ||= size(effective(DEFAULT_DESIGN)));
const arm = (GEO.F28 - GEO.F22) * 12;
const loadAt = (d, lc) => { const L = surfaceLoads('canard', d, lc); if (!L) return null; const r = L.at(0); return { V: Math.abs(r.V), T: Math.abs(r.T) }; };
/** the attach: bolts per side, AN size, tab plies; tab geometry (in): flange bonded under the canard, leg down F22's face */
export const CNA = (() => {
  const d = effective(DEFAULT_DESIGN), M = materials(d), Fbru = psi(M.BID.Fbru), ils = psi(M.UNI.ILSS), cs = loadCases(d).map((lc) => loadAt(d, lc)).filter(Boolean);
  const geo = { w: 2.0, Lf: 1.5, pitch: 2.5, edge: 0.75 };   // w: the tab must sit inside the shell under the canard (inner wall at BL ±6.6 there)
  let pick = null;
  for (const an of [4, 5]) for (const nb of [1, 2]) for (let nT = 6; nT <= 40; nT += 2) {
    const D = an / 16, t = nT * tB, ok = cs.every((c) => { const P = d.FS * FF * (c.V + c.T / arm); return Fbru / (P / (nb * D * t)) - 1 >= TGT && AN[an] * nb / P - 1 >= TGT && ils / (P / (geo.Lf * geo.w)) - 1 >= TGT && psi(M.BID.Xt) * 0.5 / (P / ((geo.w - D) * t)) - 1 >= TGT; });
    if (ok) { const v = nb * an + nT; if (!pick || v < pick.v) pick = { an, nb, nT, D, v }; break; }
  }
  FIXED.canardAttach.nb = pick.nb; FIXED.canardAttach.an = pick.an;
  const hT = geo.edge + (pick.nb - 1) * geo.pitch + 2 * pick.D;   // leg depth below the canard: top bolt 0.75 in down, e = 2D under the last
  return { ...pick, ...geo, hT, pin: 4, arm, nP: 6 };
})();

registerChecks('wp24-canard', (d, lc, Z, M) => {
  const c = loadAt(d, lc); if (!c) return [];
  const g = CNA, P = d.FS * FF * (c.V + c.T / arm), t = g.nT * tB, Fbru = psi(M.BID.Fbru), sbr = P / (g.nb * g.D * t), msB = Fbru / sbr - 1, msS = AN[g.an] * g.nb / P - 1;
  const tauB = P / (g.Lf * g.w), ils = psi(M.UNI.ILSS), msBond = ils / tauB - 1, sNet = P / ((g.w - g.D) * t), msNet = psi(M.BID.Xt) * 0.5 / sNet - 1;
  const Fp = d.FS * FF * c.T / arm, tp = g.nP * tB, pinBr = Fp / (g.pin / 16 * tp), msP = Math.min(Fbru / pinBr, AN[g.pin] / Math.max(Fp, 1e-9)) - 1;
  const base = [IN_('Root shear per side V (limit)', c.V, 'lb', 'SCHRENK'), IN_('Root torque per side T (limit)', c.T, 'inlb', 'TAS'), IN_('Arm F22 → F28', arm, 'in', 'GEOMETRY'), IN_('Fitting factor', FF, '', 'FAR 23.625')];
  const tab = IN_('F22 tab', `${g.nT} × 6781 ±45, ${g.w} in wide, flange ${g.Lf} in under the canard, leg ${g.hT.toFixed(2)} in down F22`, 'text', 'SIZED');
  const modes = [['tab bearing', msB], ['bolt single shear', msS], ['tab bond to the canard', msBond], ['tab net section', msNet]], w = modes.reduce((a, m) => (m[1] < a[1] ? m : a));
  return [
    mk('canard', 'canard-attach', `Canard attach at F22: tab, ${g.nb} × AN${g.an} fore-aft into the F22 hard point`, lc, `BL ±${(G.attachY * 12).toFixed(1)}, F22`, w[0], w[1], {
      formula: 'P = FS·1.15·(V + T/arm) per side;  σ_br = P / (n·D·t);  bolt single shear n·V_a;  τ_bond = P / (L_f·w);  σ_net = P / ((w − D)·t) against ½ X_t (±45)',
      inputs: [...base, tab, IN_('Bolts', `${g.nb} × AN${g.an}`, 'text', 'SIZED'), IN_('Bearing allowable', Fbru, 'psi', allowB(msB, 'compressive strength (bearing not published)')), IN_(`AN${g.an} single shear`, AN[g.an], 'lb', 'AN standard'),
        IN_('Bond allowable', ils, 'psi', allowB(msBond, 'interlaminar shear strength')), IN_('Net-section allowable (½ X_t for ±45 × 6781)', psi(M.BID.Xt) * 0.5, 'psi', allowB(msNet, '6781 tension strength'))],
      result: [['P (ult. × 1.15)', P, 'lb'], ['σ bearing', sbr, 'psi'], ['τ bond', tauB, 'psi'], ['σ net', sNet, 'psi']] }),
    mk('canard', 'canard-pin', `Canard torque pin at F28 (AN${g.pin}): bearing in the F28 tab and pin shear`, lc, `BL ±${(G.attachY * 12).toFixed(1)}, F28`, 'tab bearing / pin shear', msP, {
      formula: 'F = FS·1.15·T / arm (the couple with the F22 bolts);  σ_br = F / (D·t)', inputs: [...base, IN_('F28 tab', `${g.nP} × 6781`, 'text', 'SIZED'), IN_(`AN${g.pin} single shear`, AN[g.pin], 'lb', 'AN standard')],
      result: [['F (ult. × 1.15)', Fp, 'lb'], ['σ bearing', pinBr, 'psi']] }),
  ];
});

// ------------------------------------------------------------------------------------------- sections (the solid): right half, BL planes
const F = FRAMES.canard;
export const CN_RHO = { UNI: plyWeight('UNI', 1, 1) / 144 / tU, PVC: BASE_MAT.PVC.rho * 62.43 / 1728 };
const sized = () => Zc().canard;
export const cnCaps = (side) => sized()[side].map((p) => p.y1).sort((a, b) => a - b);
const nOn = (side, a, b) => sized()[side].filter((p) => p.y0 <= a + 1e-9 && p.y1 >= b - 1e-9).length;
const xeAt = (a, b) => { const [e0, e1] = G.elevator, m = (a + b) / 2; return m > e0 && m < e1 ? 1 - G.elevCf : 1; };
function cnSection(y, xe, n) {
  const c = G.c * 12, X = (x) => (G.le + x * G.c) * 12, Zs = (x, s) => { const a = afAt(F, y, x); return (G.z + (s > 0 ? a.yu : a.yl) * G.c) * 12; }, N = 36, cx = (i) => xe * (1 - Math.cos(Math.PI * i / N)) / 2;
  const oml = []; for (let i = N; i >= 0; i--) oml.push([X(cx(i)), Zs(cx(i), 1)]); for (let i = 1; i <= N; i++) { if (i === N && xe >= 1 - 1e-9) break; oml.push([X(cx(i)), Zs(cx(i), -1)]); }
  const s = GM.sec(y), h = s.b / 2 / 12 / G.c, xa = G.spar - h, xb = G.spar + h, R = { oml };
  for (const [k, side, nn] of [['cap_u', 1, n.upper], ['cap_l', -1, n.lower]]) { const z = (x, dd) => Zs(x, side) - side * dd; R[k] = [[X(xa), z(xa, tS)], [X(xb), z(xb, tS)], [X(xb), z(xb, tS + Math.max(nn, 0.001) * tU)], [X(xa), z(xa, tS + Math.max(nn, 0.001) * tU)]]; }
  void c; return R;
}
export function cnStations() {
  const brk = [0, G.semi, ...G.elevator, ...cnCaps('upper'), ...cnCaps('lower')].filter((y) => y >= 0 && y <= G.semi).map((y) => +y.toFixed(5));
  const st = [...new Set(brk)].sort((a, b) => a - b), out = [st[0]];
  for (let i = 1; i < st.length; i++) { const a = out.at(-1); if ((st[i] - a) * 12 < 0.05) continue; const k = Math.ceil((st[i] - a) * 12 / 6); for (let j = 1; j <= k; j++) out.push(+(a + (st[i] - a) * j / k).toFixed(5)); }
  return out;
}
const area2 = (p) => Math.abs(p.reduce((s, q, i) => { const r = p[(i + 1) % p.length]; return s + q[0] * r[1] - r[0] * q[1]; }, 0)) / 2;
export function cnSegments() { const st = cnStations(), out = []; for (let i = 0; i < st.length - 1; i++) { const a = st[i], b = st[i + 1], n = { upper: nOn('upper', a, b), lower: nOn('lower', a, b) }, xe = xeAt(a, b), A = cnSection(a, xe, n), B = cnSection(b, xe, n); out.push({ a, b, first: i === 0, last: i === st.length - 2, regions: Object.fromEntries(Object.keys(A).map((k) => [k, [A[k], B[k]]])) }); } return out; }
export const CCUTS = [];   // cuts in the canard (rev D: the elevator horn's cove-lip relief), right half; see cuts.js
export { cnSection };
export function cnVolumes(segs) { const whole = !segs; segs ||= cnSegments(); const V = { OML: 0, UNI: 0 }; for (const s of segs) for (const [k, [A, B]] of Object.entries(s.regions)) { const m = A.map((p, i) => [(p[0] + B[i][0]) / 2, (p[1] + B[i][1]) / 2]); V[k === 'oml' ? 'OML' : 'UNI'] += (s.b - s.a) * 12 / 6 * (area2(A) + 4 * area2(m) + area2(B)); } if (whole) V.OML -= cutsVol(CCUTS); return V; }
export function cnParams() {
  const segs = cnSegments(), rr = (a) => a.map(([u, v]) => [r4(u), r4(v)]);
  return { segs: segs.map((s) => ({ piece: 'S', ha: r4(s.a * 12), hb: r4(s.b * 12), keep: [false, s.last], O: [[r4(s.a * 12), 0, 0], [r4(s.b * 12), 0, 0]], regions: Object.fromEntries(Object.entries(s.regions).map(([k, [A, B]]) => [k, [rr(A), rr(B)]])) })),
    axes: { S: [[0, 1, 0], [0, 0, 1]] }, group: { oml: 'OML', cap_u: 'UNI', cap_l: 'UNI' }, feat: { OML: 'outline', UNI: 'cap' }, n: segs.length, ...(CCUTS.length ? { cuts: cutParams(CCUTS) } : {}) };
}
/** laminate outside the solid's regions (whole canard): skins, webs, the attach doublers */
export function cnShell(plies) { const sel = plies.filter((p) => ['skin', 'web', 'doubler'].includes(p.region)); return { lb: sel.reduce((a, p) => a + p.weight, 0), in3: sel.reduce((a, p) => a + p.area * 144 * (p.plies || 1) * BASE_MAT[p.mat].t, 0) }; }

registerBookExtras('canard', (books) => {
  const b = books.canard; if (!b) return;
  const keep = b.plies.filter((p) => !/^C-[LU]D1[RL]$/.test(p.id)), add = [];   // the skin doublers give way to the attach tabs
  const xF22 = (GEO.F22 - G.le) / G.c, xF28 = (GEO.F28 - G.le) / G.c, half = 1.5 / 12 / G.c;
  for (const sg of [1, -1]) {
    const yA = sg * G.attachY - CNA.w / 24, yB = sg * G.attachY + CNA.w / 24, a = CNA.w * (CNA.Lf + CNA.hT) / 144, ap = CNA.w * (CNA.Lf + 1.5) / 144;
    add.push({ id: `C-TA${sg > 0 ? 'R' : 'L'}`, mat: 'BID', angle: 45, region: 'doubler', side: -1, local: true, span: [Math.min(yA, yB), Math.max(yA, yB)], chord: [xF22 - half, xF22], plies: CNA.nT, area: a, weight: plyWeight('BID', a, CNA.nT), step: 6,
      note: `F22 attach tab, ${CNA.nT} × 6781 ±45: ${CNA.Lf} in flange floxed under the canard, ${CNA.hT.toFixed(2)} in leg down F22's forward face, ${CNA.w} in wide, ${CNA.nb} × AN${CNA.an}`, flat: { kind: 'strip', L: CNA.Lf + CNA.hT, w0: CNA.w, w1: CNA.w } });
    add.push({ id: `C-TP${sg > 0 ? 'R' : 'L'}`, mat: 'BID', angle: 45, region: 'doubler', side: -1, local: true, span: [Math.min(yA, yB), Math.max(yA, yB)], chord: [xF28 - half, xF28], plies: CNA.nP, area: ap, weight: plyWeight('BID', ap, CNA.nP), step: 6,
      note: `F28 pin tab, ${CNA.nP} × 6781: flange under the canard, 1.5 in leg down F28's forward face, AN${CNA.pin} pin`, flat: { kind: 'strip', L: CNA.Lf + 1.5, w0: CNA.w, w1: CNA.w } });
  }
  b.plies = [...keep, ...add].map((p, i) => ({ ...p, seq: i + 1 }));
  const V = cnVolumes(), sh = cnShell(b.plies), pvc = Math.max(0, 2 * (V.OML - V.UNI) - sh.in3 + add.reduce((a2, p) => a2 + p.area * 144 * p.plies * tB, 0));   // tabs hang outside the OML
  b.core = { ...b.core, volume: pvc / 1728, weight: pvc * CN_RHO.PVC, note: `HT61 tip to tip (${(pvc / 1728).toFixed(3)} ft³ from the sections), spar block included` };
  b.hard = `Attach: ${CNA.nT}-ply 6781 tabs under the spar at F22, ${CNA.nb} × AN${CNA.an} a side fore-aft into the F22 hard point; ${CNA.nP}-ply tabs at F28 with AN${CNA.pin} pins`;
});
