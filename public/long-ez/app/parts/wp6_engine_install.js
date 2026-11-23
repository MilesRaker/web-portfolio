// Engine installation detail: mount brackets (firewall fittings, lower extrusions to the centre-section spar,
// isolator cups) with pick-up checks, and the engine-side wiring (ignition harness, P-leads, sensor branches).
// Builds on WP1 (engine, mount truss) and WP3 (power). Notional; public builder descriptions and FAR 23 yardsticks.
import { GEO, registerChecks, mk, loadCases, DEFAULT_DESIGN, CS_FIT } from '../structures.js';
import { defineParts, defineGraph, V3 } from '../systems.js';
import { ENG, MOUNT, cylS, PLUG, EXH_PORT, MAG, mountCombos, mountForces } from './wp1_powerplant.js';

const { add, sub, mul, len } = V3;
const S1 = (title, inspect) => ({ title, inspect });
const EN = { massItem: 'engine' };
const FW = GEO.firewall, A_ = ENG.accFace, C_ = ENG.crankZ, N = MOUNT.nodes;

// ------------------------------------------------------------------------------------------- pick-up reactions
/** limit reaction (lb) at each firewall pick-up for every combination of a load case */
export function pickupReactions(d, lc) {
  const mc = mountCombos(d, lc);
  if (!mc) return null;
  const out = [];
  for (const c of mc.combos) {
    const R = {};
    for (const m of mountForces(c.F, c.M, mc.mm.c)) for (const [n, sgn] of [[m.a, 1], [m.b, -1]]) if (n[0] === 'F') R[n] = add(R[n] || [0, 0, 0], mul(m.e, -sgn * m.P));
    out.push({ c, R });
  }
  return { ...mc, out };
}
const BOLT_AN6 = 8280, BOLT_AN7 = 11250; // single-shear ultimate, lb (alloy-steel AN bolts, AN standard values)
const FITTING = { t: 0.090, Fbru: 175000, D: 0.375 };    // 4130 fitting plate, bearing at e/D 2
const EXTRUSION = { get t() { return BRK.sec.t; }, Fbru: 82000 /* 6061-T6 extrusion A-basis, MIL-HDBK-5J table 3.6.2.0(g) (memaudit materials; integration 2026-11-19, ICD A-M4; was 88 ksi, the B-basis value) */, D: 0.375 };    // 6061-T6 angle leg (LEZ-71-223, sized in BRK below)

// ------------------------------------------------------------------------------------------- lower mount bracket LEZ-71-223
// A 6061-T6 equal angle on the firewall's aft face. Its firewall leg is through-bolted to the CS spar (3 × AN5 fore-aft,
// the spar hard point in wp15) and carries the lower pick-up bolt (AN6, fore-aft) at its foot, 6.6 in below the spar: the
// bracket is a cantilever from the spar's lower face. The outstanding leg tapers from full width at the spar to 0.5 in at
// the pick-up so it clears the mount's isolator cup. Inches unless noted; loads ultimate × 1.15 fitting factor.
const FF = 1.15, TGT = 0.15, AL6 = { Ftu: 38000, Fbru: 82000, rho: 0.098, spec: 'AMS-QQ-A-200/8 (6061-T6 extruded angle), A-basis, t ≤ 0.499 in; F_bru 82 ksi per MIL-HDBK-5J table 3.6.2.0(g) (integration 2026-11-19, ICD A-M4; was 88)' };
export const AN_SHEAR = { 5: 5750, 6: 8280 }, AN_TENS = { 5: 6500, 6: 9450 };   // single-shear and tensile ultimate, lb (alloy-steel AN bolts)
/** sharp-cornered equal angle, heel at the origin, leg A along +u, leg B along +v: area, centroid, I_uu, I_vv, I_uv, corners */
export function angleSec(b, t) {
  const R = [[b, t, b / 2, t / 2], [t, b - t, t / 2, t + (b - t) / 2]];                 // [width u, height v, centre u, centre v]
  const A = R.reduce((a, r) => a + r[0] * r[1], 0), uc = R.reduce((a, r) => a + r[0] * r[1] * r[2], 0) / A, vc = R.reduce((a, r) => a + r[0] * r[1] * r[3], 0) / A;
  const Iu = R.reduce((a, r) => a + r[0] * r[1] ** 3 / 12 + r[0] * r[1] * (r[3] - vc) ** 2, 0);   // ∫v² dA (stress varying with v)
  const Iv = R.reduce((a, r) => a + r[1] * r[0] ** 3 / 12 + r[0] * r[1] * (r[2] - uc) ** 2, 0);   // ∫u² dA
  const Iuv = R.reduce((a, r) => a + r[0] * r[1] * (r[2] - uc) * (r[3] - vc), 0);
  const pts = [[0, 0], [b, 0], [b, t], [t, b], [0, b]].map(([u, v]) => [u - uc, v - vc]);
  const Imin = (Iu + Iv) / 2 - Math.hypot((Iu - Iv) / 2, Iuv);
  return { b, t, A, xb: uc, I: Iu, Iuv, Imin, pts, c: b - uc };
}
/** extreme bending stress for stress-resultant moments Mu = ∫σu dA and Mv = ∫σv dA (unsymmetric bending, σ = a·u + b·v) */
function angleBend(sec, Mu, Mv) {
  const Iuu = sec.I, Ivv = sec.I, det = Iuu * Ivv - sec.Iuv ** 2;   // equal legs: ∫u² = ∫v²
  const a = (Mu * Iuu - Mv * sec.Iuv) / det, b = (Mv * Ivv - Mu * sec.Iuv) / det;
  return Math.max(...sec.pts.map(([u, v]) => Math.abs(a * u + b * v)));
}
// stock 6061-T6 structural equal angles (Online Metals list); 5/16 is not a stock thickness and 3/8 does not fit ahead of the bushing
const ANGLES = [[2, 0.25], [2.5, 0.25], [3, 0.25], [4, 0.25], [2, 0.375], [2.5, 0.375], [3, 0.375], [4, 0.375]].map(([b, t]) => angleSec(b, t)).sort((a, c) => a.A - c.A);
/** per-bracket ultimate loads and stresses for one pick-up reaction R (limit, [Fs, Fy, Fz]) at factor FS.
 *  Leg A (along BL, u) lies on the firewall's aft face; leg B (fore-aft, v) stands aft at the outboard edge.
 *  The angle is a cantilever from the spar's lower face, h above the pick-up. */
function bracketState(R, FS, g) {
  const k = FS * FF, [Fs, Fy, Fz] = R.map((x) => x * k), sec = g.sec, aFs = Math.abs(Fs), aFy = Math.abs(Fy), aFz = Math.abs(Fz);
  const sig = Math.max(angleBend(sec, aFy * g.h, aFs * g.h), angleBend(sec, aFy * g.h, -aFs * g.h)) + aFz / sec.A;   // both sign pairings
  const M = Math.hypot(Fs, Fy) * g.h, pkS = Math.hypot(Fy, Fz), pkT = aFs;                // pick-up AN6, fore-aft: F_s is its tension
  // spar bolts (fore-aft): in-plane F_y, F_z direct plus the moment of F_y about the group centroid (bolts in a vertical line)
  const r = g.zSpar.map((z) => z - g.zc), Sr2 = r.reduce((a, x) => a + x * x, 0);
  const sh = r.map((ri) => Math.hypot(aFy / 3 + aFy * (g.zc + g.h) * Math.abs(ri) / Sr2 * Math.sign(ri || 1), aFz / 3)).map((x, i) => Math.max(x, Math.hypot(aFy / 3 - aFy * (g.zc + g.h) * r[i] / Sr2, aFz / 3)));
  // tension from F_s · lever: pushed forward the angle pivots on the spar's lower edge, pulled aft on its own top end
  const fwd = g.zSpar.map((z) => z), aft = g.zSpar.map((z) => g.zTop - z), Sf = fwd.reduce((a, x) => a + x * x, 0), Sa = aft.reduce((a, x) => a + x * x, 0);
  const tF = fwd.map((x) => aFs * g.h * x / Sf), tA = aft.map((x) => aFs * (g.h + g.zTop) * x / Sa);
  const ten = g.zSpar.map((_, i) => Math.max(tF[i], tA[i]));
  return { Fs, Fy, Fz, M, sig, pkS, pkT, sh, ten, shMax: Math.max(...sh), tMax: Math.max(...ten),
    comb: Math.max(...g.zSpar.map((_, i) => Math.hypot(sh[i] / AN_SHEAR[g.an], ten[i] / AN_TENS[g.an]))) };
}
export const BRK = (() => {
  const zL = CS_FIT.L, zp = N.FBL[2], h = (zL - zp) * 12, zSpar = [1.25, 2.68, 4.11], zc = zSpar.reduce((a, x) => a + x, 0) / 3;
  const d = DEFAULT_DESIGN, rs = [], dP = 0.375;
  for (const lc of loadCases(d)) { const r = pickupReactions(d, lc); if (!r) continue; for (const o of r.out) for (const n of ['FBL', 'FBR']) if (o.R[n]) rs.push({ R: o.R[n], FS: r.FS, lc: lc.id, n, c: o.c.tag }); }
  const geo = (sec, an) => ({ sec, h, zSpar, zc, zp, an, zTop: zSpar.at(-1) + 2 * (an === 6 ? 0.375 : 0.3125) });
  const worst = (sec, an) => { let w = null; for (const x of rs) { const st = bracketState(x.R, x.FS, geo(sec, an)), ms = Math.min(AL6.Ftu / st.sig, 1 / st.comb) - 1; if (!w || ms < w.ms) w = { ...x, st, ms }; } return w; };
  const room = (N.FBL[0] - FW) * 12;                        // leg A must sit between the firewall and the mount's lower bushing
  let sec = null, an = 5;
  for (const a of [5, 6]) { sec = ANGLES.find((x) => x.t <= room + 1e-9 && worst(x, a).ms >= TGT); if (sec) { an = a; break; } }
  sec = sec || ANGLES.at(-1);
  const g = geo(sec, an), dS = an === 6 ? 0.375 : 0.3125, xBolt = 2 * dP;   // bolt line 2D in from leg A's outboard (free) edge; the heel and leg B are inboard, clear of the fuselage's rounded bottom corner
  return { sec, h, zSpar, zc, zp, zL, an, dP, dS, xBolt, zBot: -h - 2 * dP, zTop: g.zTop, L: g.zTop + h + 2 * dP, taper: { at: -h, w: 2 * dP + 0.25 }, mat: AL6, rs, worst: worst(sec, an), room,
    log: ANGLES.filter((a) => a.t <= room + 1e-9).map((a) => ({ desc: `${a.b} × ${a.b} × ${a.t} in angle`, ms5: worst(a, 5).ms, ms6: worst(a, 6).ms })) };
})();
const fxIn = (v) => (Math.abs(v * 16 - Math.round(v * 16)) < 1e-6 ? ({ 0.25: '1/4', 0.3125: '5/16', 0.375: '3/8', 0.5: '1/2' }[v] || String(+v.toFixed(3))) : String(+v.toFixed(2)));
/** finished bracket: both legs full length, less the pick-up and three spar-bolt holes in leg A (in³, lb) */
export function bracketVolume(B = BRK) { const s = B.sec; return s.t * s.b * B.L + s.t * (s.b - s.t) * B.L - Math.PI * (B.dP / 2) ** 2 * s.t - 3 * Math.PI * (B.dS / 2) ** 2 * s.t; }
const BRK_MASS = +(bracketVolume() * AL6.rho).toFixed(3);
/** worst pick-up for one load case, with the bracket's state */
export function bracketCase(d, lc) {
  const r = pickupReactions(d, lc); if (!r) return null; let w = null;
  for (const o of r.out) for (const n of ['FBL', 'FBR']) { if (!o.R[n]) continue; const st = bracketState(o.R[n], r.FS, BRK), sc = Math.max(st.sig / AL6.Ftu, st.comb); if (!w || sc > w.sc) w = { sc, n, R: o.R[n], FS: r.FS, st, c: o.c, emer: r.emer }; continue;
    if (!w) w = { n, R: o.R[n], FS: r.FS, st, c: o.c, emer: r.emer }; }
  return w;
}
registerChecks('wp6-bracket', (d, lc) => {
  const w = bracketCase(d, lc); if (!w) return [];
  const B = BRK, st = w.st, sec = B.sec, src = (v) => ['Load combination', w.c.tag, 'text', 'FAR23'];
  const Rin = [['Pick-up reaction F_s, F_y, F_z (limit)', w.R.map((x) => x.toFixed(0)).join(', '), 'lb', 'DERIVED'], ['Factor of safety', w.FS, '', w.emer ? 'KD' : 'FAR23'], ['Fitting factor', FF, '', 'FAR 23.625']];
  const rows = [];
  rows.push(mk('fuselage', 'mtb-bend', 'Lower engine-mount bracket: angle bending at the spar\'s lower face', lc, `${w.n}, root`, 'unsymmetric bending (both axes) plus axial', AL6.Ftu / st.sig - 1, {
    formula: 'M_u = F_y·h, M_v = F_s·h;  σ = a·u + b·v from [I_uu I_uv; I_uv I_vv]·[a b] = [M_u M_v], worst corner, both sign pairs;  + F_z / A  (6061-T6, F_tu)', inputs: [src(), ...Rin, ['Angle', `${sec.b} × ${sec.b} × ${sec.t} in`, 'text', 'SIZED'], ['Lever h, pick-up below the spar', B.h, 'in', 'GEOMETRY'], ['F_tu', AL6.Ftu, 'psi', AL6.spec]],
    result: [['|M| (ult.)', st.M, 'inlb'], ['σ', st.sig, 'psi'], ['I_uu = I_vv', sec.I, 'in4'], ['I_uv', sec.Iuv, 'in4']] }));
  const brg = AL6.Fbru * B.dP * sec.t, pkMs = Math.min(Math.min(brg, AN_SHEAR[6]) / st.pkS, AN_TENS[6] / Math.max(1, st.pkT)) - 1;
  rows.push(mk('fuselage', 'mtb-pickup', 'Lower engine-mount bracket: pick-up bolt (AN6) and angle bearing', lc, w.n, brg < AN_SHEAR[6] ? 'angle bearing' : 'AN6 shear', pkMs, {
    formula: 'shear √(F_y² + F_z²) vs min(F_bru·D·t, AN6 single shear);  F_s in AN6 tension', inputs: [src(), ...Rin, ['AN6', `${AN_SHEAR[6]} lb shear, ${AN_TENS[6]} lb tension`, 'text', 'AN standard'], ['F_bru (e/D 2)', AL6.Fbru, 'psi', AL6.spec]],
    result: [['Shear (ult.)', st.pkS, 'lb'], ['Tension (ult.)', st.pkT, 'lb'], ['Bearing allowable', brg, 'lb']] }));
  const an = B.an;
  rows.push(mk('fuselage', 'mtb-bolts', `Lower engine-mount bracket: spar bolts (3 × AN${an}), shear and tension`, lc, w.n, 'combined shear and tension', 1 / st.comb - 1, {
    formula: 'shear: F/3 plus the moment of F_y about the bolt group;  tension: F_s·h, pivoting on the spar\'s lower edge (pushed forward) or the angle\'s top end (pulled aft);  (R_s² + R_t²)^½ ≤ 1 per bolt',
    inputs: [src(), ...Rin, ['Bolt heights above the spar\'s lower face', B.zSpar.join(', '), 'in', 'GEOMETRY'], ['Angle top end above the spar\'s lower face', B.zTop, 'in', 'GEOMETRY'], [`AN${an}`, `${AN_SHEAR[an]} lb shear, ${AN_TENS[an]} lb tension`, 'text', 'AN standard']],
    result: [['Max bolt shear (ult.)', st.shMax, 'lb'], ['Max bolt tension (ult.)', st.tMax, 'lb'], ['Interaction (worst bolt)', st.comb, '']] }));
  for (const r of rows) r.sys = 'LEZ-71-223';
  return rows;
});

// ------------------------------------------------------------------------------------------- engine-side routes
export const MAG_TERM = (sg) => [MAG(sg).b[0] - 0.02, MAG(sg).b[1], MAG(sg).b[2]];
const PASS_IGN = [FW + 0.05, -0.45, 2.95];
const pLeads = [
  [PASS_IGN, [A_ - 0.45, -0.36, C_ + 0.25], MAG_TERM(-1)],
  [PASS_IGN, [A_ - 0.45, -0.36, C_ + 0.25], [A_ - 0.45, 0.30, C_ + 0.25], MAG_TERM(1)],
];
const GAP = { '-1': (cylS.LR + cylS.LF) / 2, 1: (cylS.RR + cylS.RF) / 2 }; // between the two cylinders of a bank
// left magneto fires the right-bank top plugs and the left-bank bottom plugs; right magneto the reverse
const ignLead = (magSg, k, sg, top) => {
  const cap = MAG(magSg).cap, br = [A_ + 0.30, magSg * 0.30, C_ + 0.62], p = PLUG(k, sg, top), s = cylS[k];
  if (top) return [cap, br, [s - 0.05, sg * 0.40, C_ + 0.60], [s + 0.02, sg * 0.95, C_ + 0.44], p];
  if (k[1] === 'R') { const f = A_ + 0.55; return [cap, br, [f, sg * 0.55, C_ + 0.40], [f, sg * 1.02, C_ - 0.05], [f, sg * 1.02, C_ - 0.30], p]; } // rear cylinders: from ahead
  const g = GAP[sg];
  return [cap, br, [g, sg * 0.40, C_ + 0.55], [g, sg * 0.70, C_ + 0.10], [g, sg * 1.02, C_ - 0.05], [g + 0.08, sg * 1.05, C_ - 0.28], p];   // one sweep down to the plug (lead bend ≥ 6 × OD)
};
export const LEADS = [];
for (const k of ['LR', 'LF', 'RR', 'RF']) { const sg = k[0] === 'L' ? -1 : 1; LEADS.push({ k, sg, top: true, mag: -sg }, { k, sg, top: false, mag: sg }); }
// engine-monitor branches from the harness end behind the accessory case
export const E0 = [A_ - 0.25, -0.45, C_ - 0.05];
const cht = (k, sg) => add(PLUG(k, sg, false), [0, 0, -0.06]), egt = (k, sg) => add(EXH_PORT(k, sg), [0.10, -sg * 0.05, -0.12]);
const sensorRuns = [
  ...['LR', 'LF'].map((k) => [E0, [GAP[-1] - 0.05, -0.55, C_ - 0.36], [cylS[k] - 0.14, -0.84, C_ - 0.40], cht(k, -1), egt(k, -1)]),
  ...['RR', 'RF'].map((k) => [E0, [A_ - 0.30, 0.0, C_ + 0.72], [A_ + 0.40, 0.42, C_ + 0.66], [GAP[1] + 0.05, 0.42, C_ + 0.58], [GAP[1] + 0.05, 0.53, C_ + 0.05], [GAP[1] + 0.05, 0.56, C_ - 0.36], [cylS[k] - 0.14, 0.84, C_ - 0.40], cht(k, 1), egt(k, 1)]),
  [E0, [A_ - 0.10, -0.25, C_ - 0.30], [A_ + 0.02, -0.15, C_ - 0.30]],   // oil temperature / pressure, tach pick-up on the accessory case
];

// ------------------------------------------------------------------------------------------- parts
defineParts([
  { ...EN, pn: 'LEZ-71-222', name: 'Upper mount pick-up fittings and firewall backing plates (L/R)', kind: 'machined', ata: 71, nha: 'LEZ-71-220', material: '4130', qty: 2, massEach: 0.55,
    geo: ['FTL', 'FTR'].flatMap((n) => [
      { t: 'box', c: [FW + 0.04, N[n][1], N[n][2] - 0.01], d: [0.08, 0.10, 0.10], colour: 0x9aa3ad },
      { t: 'box', c: [FW - 0.02, N[n][1] - Math.sign(N[n][1]) * 0.06, N[n][2] - 0.08], d: [0.02, 0.20, 0.20], colour: 0xc9ced6, mat: '6061' }, // backing plate offset inboard and down, clear of the rounded corner
      { t: 'cyl', a: [FW - 0.05, N[n][1], N[n][2]], b: [FW + 0.10, N[n][1], N[n][2]], r: 0.016, colour: 0x2d2d2d }]),
    blurb: '0.090 in 4130 clevis fittings on the firewall\'s aft face at the two upper hard-points, bolted through (AN6) to 1/8 in 6061 backing plates on the cabin side that spread the load into the glassed hard-point. The mount\'s upper bushings bolt into the clevises.',
    steps: [S1('Match-drill fittings and backing plates through the firewall hard-points', ['Holes 0.375 +0.002/−0 in, fitting edge distance ≥ 2D']), S1('Bolt with fire-proof sealant under the fittings', ['AN6 torqued, cotter-pinned', 'Firewall seal intact'])],
    src: { mass: 'GEOMETRY-based estimate (ASSUMED)' } },
  { ...EN, pn: 'LEZ-71-223', name: 'Lower engine-mount brackets, centre-section spar to the lower pick-ups (L/R)', kind: 'machined', ata: 71, nha: 'LEZ-71-220', material: '6061', qty: 2, massEach: BRK_MASS,
    geo: ['FBL', 'FBR'].flatMap((n) => {   // angle on the firewall's aft face: leg A on the firewall, leg B standing aft at its inboard edge
      const y = N[n][1], o = Math.sign(y), B = BRK, t = B.sec.t / 12, bw = B.sec.b / 12, zL = CS_FIT.L, z0 = zL + B.zBot / 12, z1 = zL + B.zTop / 12, zm = (z0 + z1) / 2;
      const yA = y + o * (B.xBolt / 12 - bw / 2), yB = y + o * (B.xBolt / 12 - bw + t / 2);
      return [{ t: 'box', c: [FW + t / 2, yA, zm], d: [t, bw, z1 - z0], colour: 0xc9ced6 },
        { t: 'box', c: [FW + t + (bw - t) / 2, yB, zm], d: [bw - t, t, z1 - z0], colour: 0xc9ced6 },
        { t: 'cyl', a: [FW - 0.05, y, N[n][2]], b: [FW + t + 0.12, y, N[n][2]], r: B.dP / 24, mat: 'steel', colour: 0x2d2d2d },
        ...B.zSpar.map((zi) => { const z = zL + zi / 12; return { t: 'cyl', a: [GEO.csSpar.s - GEO.csSpar.width / 2 - 0.02, y, z], b: [FW + t + 0.04, y, z], r: B.dS / 24, mat: 'steel', colour: 0x8c96a3 }; })];
    }),
    blurb: `${fxIn(BRK.sec.b)} × ${fxIn(BRK.sec.b)} × ${fxIn(BRK.sec.t)} in 6061-T6 extruded angles on the firewall's aft face, one each side. Leg A lies on the firewall and is through-bolted (3 × AN${BRK.an} fore-aft, through the firewall and both spar webs, on crush tubes) to the centre-section spar's mount hard point; it carries on down ${fxIn(BRK.h)} in below the spar to the lower engine pick-up, an AN6 fore-aft through the mount's lower bushing, the angle and the firewall. Leg B stands aft at the inboard edge (clear of the fuselage's rounded bottom corner) and is what makes the angle stiff enough to cantilever the pick-up loads up into the spar: the lower mount loads go into the spar, not the firewall sandwich (the arrangement Long-EZ builders describe).`,
    interfaces: [{ id: 'mount-lower', name: `Lower mount bracket → centre-section spar (3 AN${BRK.an} through-bolts; checked as cs-hp-mount)`, host: 'csSpar', at: [FW, 0, GEO.csSpar.z], n: 3, d: BRK.dS, kind: 'bolt', tHost: GEO.csSpar.width * 12 + 0.75 }],
    steps: [S1('Cut and drill extrusions to the template; fit to the spar and longeron', ['Pick-up holes match the mount jig ±1/32 in', 'Firewall pass-through sealed']), S1(`Bolt to the spar (3 × AN${BRK.an} each)`, ['Torqued, cotter-pinned'])],
    src: { mass: 'GEOMETRY: the definition solid (LEZ-71-223)', arrangement: 'Public Long-EZ builder logs: angle from the CS spar down the firewall forms the lower engine mounts' } },
  { ...EN, pn: 'LEZ-71-224', name: 'Isolator cups, pick-up bushings and gussets (welded to the mount)', kind: 'weldment', ata: 71, nha: 'LEZ-71-220', material: '4130', extraMass: 0.4,
    geo: [...['ETL', 'ETR', 'EBL', 'EBR'].map((n) => ({ t: 'cyl', a: [N[n][0] - 0.07, N[n][1], N[n][2]], b: [N[n][0] + 0.05, N[n][1], N[n][2]], r: 0.12, wall: 0.065, colour: 0x6f7a86 })),
      ...['FTL', 'FTR'].map((n) => { const o = Math.sign(N[n][1]); return { t: 'cyl', a: [N[n][0], N[n][1] - o * 0.08, N[n][2]], b: [N[n][0], N[n][1] + o * 0.03, N[n][2]], r: 0.04, wall: 0.12, colour: 0x6f7a86 }; }), // bushings stand inboard of the pick-up so the outer face stays inside the cowl line
      ...['FBL', 'FBR'].map((n) => ({ t: 'cyl', a: [FW + BRK.sec.t / 12 + 0.002, N[n][1], N[n][2]], b: [FW + BRK.sec.t / 12 + 0.09, N[n][1], N[n][2]], r: 0.04, wall: 0.12, colour: 0x6f7a86 }))], // lower bushings fore-aft: their faces bear on the bracket's leg A
    blurb: 'Conical-mount cups at the four engine bosses (each takes a front and rear isolator half, AN7 through-bolt) and cross-bushings at the four firewall pick-ups; finger gussets at each cup cluster.', onMount: true,
    steps: [S1('Weld cups and bushings in the mount jig', ['Cup faces square to the crankshaft ±1°', 'Bushing bores reamed after welding'])], src: { mass: 'GEOMETRY + 0.4 lb gussets' } },
  { ...EN, pn: 'LEZ-74-110', name: 'Ignition harness, 8 shielded leads', kind: 'harness', ata: 74, massEach: 1.6, onMount: true,
    geo: LEADS.map((l) => ({ t: 'path', pts: ignLead(l.mag, l.k, l.sg, l.top), dIn: 0.30, massPerFt: 0, cls: 'ign', shield: true, colour: 0x3c4fa0 })),
    blurb: 'Each magneto fires one plug in every cylinder (left magneto: right-bank tops and left-bank bottoms; right magneto the reverse), so either one keeps all four cylinders firing. Leads run in a bracket over the crankcase, then down between the cylinders; the bottom leads approach from below and ahead, away from the exhaust ports.',
    steps: [S1('Fit harness brackets; route and clamp leads', ['No lead touches a rocker cover, fin or the exhaust', 'Lead ends ≥ 1 in from exhaust with fire sleeve']), S1('Timing and harness test', ['Both magnetos timed to the data plate', 'Harness tester: no leakage on any lead'])],
    src: { mass: 'ASSUMED' } },
  { ...EN, pn: 'LEZ-74-120', name: 'Spark plugs (8)', kind: 'cots', ata: 74, qty: 8, massEach: 0.12, onMount: true,
    geo: LEADS.map((l) => { const p = PLUG(l.k, l.sg, l.top); return { t: 'cyl', a: p, b: [p[0], p[1] + l.sg * 0.07, p[2] + (l.top ? 0.05 : -0.05)], r: 0.035, colour: 0xe8e8e8 }; }), src: { mass: 'ASSUMED' } },
  { ...EN, pn: 'LEZ-74-130', name: 'Magneto P-leads, shielded (firewall to magnetos)', kind: 'harness', ata: 74, nha: 'LEZ-74-100', massEach: 0.25,
    geo: pLeads.map((pts) => ({ t: 'path', pts, dIn: 0.20, massPerFt: 0, cls: 'signal' })),
    blurb: 'Continue the key-switch P-leads from the firewall boot to each magneto\'s P-lead terminal; shields grounded at the magneto end only.',
    steps: [S1('Terminate at the magnetos', ['Grounding check: each magneto off in its key position'])], src: { mass: 'ASSUMED' } },
  { ...EN, pn: 'LEZ-77-110', name: 'Engine sensors and harness branches (4 CHT, 4 EGT, oil T/P, tach)', kind: 'harness', ata: 77, nha: 'LEZ-77-100', massEach: 1.2, onMount: true,
    geo: sensorRuns.map((pts, i) => ({ t: 'path', pts, dIn: 0.22, massPerFt: 0, cls: 'signal', shield: i < 4 })),
    blurb: 'Bayonet CHT probes under each bottom plug, clamp-on EGT probes 2 in below each exhaust flange, oil temperature and pressure and the tach pick-up on the accessory case. Left-bank branches run under the cylinders; right-bank branches cross over the crankcase and drop between the right cylinders.',
    steps: [S1('Install probes; route branches in fire-sleeve; clamp to the engine', ['EMS reads all four CHT/EGT in the right order', 'No branch on a hot surface'])], src: { mass: 'ASSUMED' } },
]);

// ------------------------------------------------------------------------------------------- pick-up checks
registerChecks('wp6-pickups', (d, lc) => {
  const r = pickupReactions(d, lc);
  if (!r) return [];
  let worst = null;
  for (const o of r.out) for (const [n, R] of Object.entries(o.R)) {
    if (n[1] === 'T') continue;   // the upper pick-ups (LEZ-71-222) are checked in detail in wp23
    const upper = n[1] === 'T', P = len(R), bolt = upper ? BOLT_AN6 : BOLT_AN6, f = upper ? FITTING : EXTRUSION, brg = f.Fbru * f.D * f.t, Pa = Math.min(bolt, brg);
    const ms = Pa / (r.FS * P) - 1;
    if (!worst || ms < worst.ms) worst = { ms, n, P, Pa, bolt, brg, upper, c: o.c, f };
  }
  const w = worst, row = mk('fuselage', 'mount-pickup', 'Engine-mount pick-ups: bolt shear and fitting bearing', lc, `${w.n} (${w.upper ? 'firewall fitting' : 'lower extrusion'})`, w.bolt < w.brg ? 'bolt shear' : 'fitting bearing', w.ms, {
    formula: 'Reactions from the mount truss solve;  P_allow = min(bolt single shear, F_bru · D · t);  MS = P_allow / (FS · |R|) − 1',
    inputs: [['Load combination', w.c.tag, 'text', 'FAR23'], ['Bolt', 'AN6, 8,280 lb single shear', 'text', 'AN standard'], ['Fitting', w.upper ? '4130, 0.090 in, F_bru 175 ksi' : `6061-T6 angle, ${BRK.sec.t} in, F_bru 88 ksi`, 'text', w.upper ? 'MMPDS (4130 sheet, normalized), e/D 2' : AL6.spec], ['Factor of safety', r.FS, '', r.emer ? 'KD' : 'FAR23 × KD']],
    result: [['Pick-up reaction (limit)', w.P, 'lb'], ['Bolt allowable', w.bolt, 'lb'], ['Bearing allowable', w.brg, 'lb']] });
  row.sys = w.upper ? 'LEZ-71-222' : 'LEZ-71-223';
  return [row];
});

// ------------------------------------------------------------------------------------------- schematic
defineGraph('engine-install', {
  title: 'Engine mounting and engine wiring',
  nodes: [
    { id: 'CS', label: 'Centre-section spar', sub: 'aft face', col: 0, row: 0 },
    { id: 'LX', label: 'Lower extrusions', sub: 'through the firewall', col: 1, row: 0, pn: 'LEZ-71-223' },
    { id: 'FW', label: 'Firewall fittings', sub: 'upper, backing plates', col: 1, row: 1, pn: 'LEZ-71-222' },
    { id: 'MT', label: 'Mount weldment', sub: '12 tubes, cups', col: 2, row: 0, pn: 'LEZ-71-220' },
    { id: 'IS', label: 'Conical isolators', sub: '4 bosses', col: 3, row: 0, pn: 'LEZ-71-221' },
    { id: 'EN', label: 'Engine', col: 4, row: 0, pn: 'LEZ-71-210' },
    { id: 'KY', label: 'Key switch', col: 1, row: 2, pn: 'LEZ-74-100' },
    { id: 'MG', label: 'Magnetos L/R', sub: 'accessory case', col: 2, row: 2, pn: 'LEZ-74-130' },
    { id: 'PL', label: 'Spark plugs ×8', sub: 'top + bottom', col: 3, row: 2, pn: 'LEZ-74-120' },
    { id: 'EM', label: 'Engine monitor', col: 1, row: 3, pn: 'LEZ-77-100' },
    { id: 'SN', label: 'CHT / EGT / oil / tach', col: 3, row: 3, pn: 'LEZ-77-110' },
    { id: 'ST', label: 'Starter / alternator', sub: 'prop end, low', col: 4, row: 2, pn: 'LEZ-80-110' },
  ],
  edges: [{ a: 'CS', b: 'LX', cls: 'mech' }, { a: 'LX', b: 'MT', cls: 'mech', label: 'lower pick-ups' }, { a: 'FW', b: 'MT', cls: 'mech', label: 'upper pick-ups' }, { a: 'MT', b: 'IS', cls: 'mech' }, { a: 'IS', b: 'EN', cls: 'mech' },
    { a: 'KY', b: 'MG', cls: 'signal', label: 'P-leads' }, { a: 'MG', b: 'PL', cls: 'signal', label: 'ignition harness' }, { a: 'EM', b: 'SN', cls: 'signal' }, { a: 'EN', b: 'ST', cls: 'power' }],
});
void sub;

// ------------------------------------------------------------------------------------------- end-to-end fluid traces
import { defineTraces } from '../systems.js';
defineTraces([
  ...['L', 'R'].map((sd) => ({ sys: 'ATA 28 Fuel', name: `Fuel, ${sd === 'L' ? 'left' : 'right'} tank to carburettor`, from: `LEZ-28-110:OUT-${sd}`, to: 'LEZ-71-210:CARB-IN' })),
  { sys: 'ATA 28 Fuel', name: 'Fuel pressure tap to transducer', from: 'LEZ-71-210:CARB-PT', to: 'LEZ-77-120:FUEL-P' },
  ...['L', 'R'].map((sd) => ({ sys: 'ATA 28 Fuel', name: `Vent, ${sd} tank to atmosphere`, from: `LEZ-28-165:TANK-${sd}`, to: `LEZ-28-165:OUT-${sd}` })),
  { sys: 'ATA 79 Oil', name: 'Oil, engine through cooler and back', from: 'LEZ-71-210:OIL-OUT', to: 'LEZ-71-210:OIL-RTN' },
  { sys: 'ATA 79 Oil', name: 'Oil pressure to transducer', from: 'LEZ-71-210:OIL-P', to: 'LEZ-77-120:OIL-P' },
  { sys: 'ATA 77 Engine indicating', name: 'Manifold pressure to transducer', from: 'LEZ-71-210:MAP', to: 'LEZ-77-120:MAP' },
  ...['L', 'R'].map((sd) => ({ sys: 'ATA 32 Landing gear', name: `Brake, ${sd} master cylinder to caliper`, from: `LEZ-32-311:OUT-${sd}`, to: `LEZ-32-310:IN-${sd}` })),
  { sys: 'ATA 34 Navigation', name: 'Pitot to ADAHRS', from: 'LEZ-34-120:P', to: 'LEZ-31-120:P' },
  { sys: 'ATA 34 Navigation', name: 'Pitot to backup display', from: 'LEZ-34-120:P', to: 'LEZ-31-130:P' },
  { sys: 'ATA 34 Navigation', name: 'Left static port to ADAHRS', from: 'LEZ-34-132:SP-L', to: 'LEZ-31-120:S' },
  { sys: 'ATA 34 Navigation', name: 'Right static port to backup display', from: 'LEZ-34-132:SP-R', to: 'LEZ-31-130:S' },
  { sys: 'ATA 30 Ice protection', name: 'Carb heat, muff to air box', from: 'LEZ-78-110:MUFF-OUT', to: 'LEZ-71-250:HEAT-IN' },
]);
