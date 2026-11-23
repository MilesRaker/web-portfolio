// WP15 — centre-section spar (LEZ-57-140): the box beam behind the rear seat that carries both wing root moments and
// the strake lift, with the clevis blocks (LEZ-57-143) built into its ends.
//  • Caps: UNI, sized at the centre line by structures.js (cs-cap). Plies the moment no longer needs drop off toward the
//    ends, shortest first against the core, at least 1 in apart and 1 in past the station where they stop being needed,
//    so only as many reach the end as fit over the clevis tail (SPAR_END in wp13).
//  • Ends: the cap splits around the clevis tail. The outer plies run over it to the clevis web face; a quasi-isotropic BID pad lies
//    under it; a BID filler block fills the space inboard of the tail end. Pad and filler are laid bottom-first in a
//    pocket in the core, each ply 0.1 in longer than the one below (a 1:10 ramp), and carry the pad's share of the bolt
//    load up into the cap. Three AN8 through-bolts per end pass the upper cap, upper tail, upper pad, a crush tube, the
//    lower pad, lower tail and lower cap: the tails are in double shear.
//  • Laminate allowables are typical wet-layup E-glass values knocked down for 140 °F wet (materials()): they are
//    carried as ASSUMED until published allowables for the chosen epoxy are in, so the release audit holds the spar.
// Every load is FAR 23 limit × FS, × 1.15 fitting factor at the fittings. Notional: not for construction.
import { ENV, GEO, FT, FIXED, registerChecks, mk, surfaceLoads, loadCases, DEFAULT_DESIGN, CS_FIT, materials, laminate, plyRF, psi, capAllowable, BASE_MAT, MATSYS, allowB } from '../structures.js';
import { registerBookExtras, plyWeight, PROCESS } from '../plybook.js';
import { LUG, CLV, SPAR_END, ATTACH, ATT, rootLoads, fittingForces, chordIn, CHORD, AN_SHEAR, AN_TENS } from './wp13_airframe_joints.js';
import { MOUNT } from './wp1_powerplant.js';
import { pickupReactions, BRK, bracketCase } from './wp6_engine_install.js';
import { anBolt, defineParts, partByPN } from '../systems.js';

const CS = GEO.csSpar, YJ = GEO.join.y, FF = 1.15, TGT_ = 0.15, AN8_SHEAR = 14700;
const E = SPAR_END, inch = 1 / 12;
const IN_ = (n, v, u, s = 'DERIVED') => [n, v, u, s], S1_ = (title, inspect) => ({ title, inspect });
// laminate strengths: MGS L285 published typical values × kB (structures.js MATSYS), hot-wet; for a strength-governed
// check the margin scales with kB, so the bound is the kB at which MS reaches 0
const ALLOWF = (ms, what = 'strength') => `BOUND: NCAMP MTM45-1 MH ${what} × ${MATSYS.kB} (mean × 0.8 × 0.9, M cycle), ETW 200 °F; MS stays ≥ 0 down to × ${(MATSYS.kB / (1 + ms)).toFixed(2)}`;

// ------------------------------------------------------------------------------------------- geometry (ft, BL from the CL)
export const SPAR = (() => {
  const yPin = LUG.yPin, yWeb = yPin + CLV.uWeb / 12, yTail = yPin + CLV.u0 / 12, boltsY = CLV.bolts.map((u) => yPin + u / 12);
  const step = E.tB * E.ramp / 12;                                   // ft, 1:10 ramp: each ply 0.1 in past the one below
  const nHP = E.nPad + E.nFill, yIn = (j) => yTail - E.Lov * inch - (j - 1) * step;   // hard-point ply j (1 = bottom) inboard end
  const depth = { capOut: 0, capIn: E.room, tailTop: E.room, tailBot: E.room + E.flox + E.tail, padTop: E.room + 2 * E.flox + E.tail, padBot: E.room + 2 * E.flox + E.tail + E.tPad };  // in, from the cap outer face
  const tube = (zU() - zL()) * 12 - 2 * depth.padBot;                // in, crush tube between the pads
  return { yPin, yWeb, yTail, boltsY, step, nHP, yIn, yHP0: yIn(nHP), depth, tube, h: CS_FIT.depth * 12, b: CS.cap, width: CS.width * 12 };
})();
// the lower cap's build-ups (plies the end joint needs over the clevis tail beyond the moment's need) stand 1 in apart from 1 in
// inboard of the hard point toward the centre line, inboard ends at least 0.5 in from it: the rest run full length (the sizing floor)
FIXED.csCapLMin = E.nTop - (Math.floor((SPAR.yHP0 * 12 - 1 - 0.5) / 1) + 1);
function zU() { return CS_FIT.U; }
function zL() { return CS_FIT.L; }

// ------------------------------------------------------------------------------------------- cap moment and drop schedule
/** signed ultimate cap moment at BL y (ft) for one case (+: upper cap in compression): root moment carried in, root shear ×
 *  arm, strake lift spread evenly */
function capMomentS(d, lc, y) {
  const L = surfaceLoads('wing', d, lc); if (!L) return null;
  const r = L.at(YJ), inb = (1 - lc.ac.shareC) * lc.ac.W / 2 * lc.n * 0.18 * (YJ / 2) * FT;
  return (r.Mx + r.V * (YJ - y) * FT + inb * ((YJ - y) / YJ) ** 2) * d.FS;
}
function capMoment(d, lc, y) { const m = capMomentS(d, lc, y); return m == null ? null : Math.abs(m); }
/** cap centroid separation for nU upper and nL lower plies (in) */
const ddOf = (nU, nL, M) => SPAR.h - (nU + nL) / 2 * M.UNI.t - 6 * M.BID.t;
const capCap = (n, nO, M, allow) => allow * ddOf(n, nO, M) * n * M.UNI.t * SPAR.b;   // moment a cap of n plies can carry against nO in the other (inlb)
const SCHED = new WeakMap();
/** ply ends (ft, BL). Upper cap: plies 1..D drop (1 shortest, laid first against the core), the rest run to the clevis web
 *  face. Lower cap (2026-11-19, asymmetric): NL plies run full length; when NL is fewer than the end joint needs over the
 *  clevis tail (nEnd), the extra plies are build-ups from the clevis web face inboard, their inboard ends 1 in apart and ≥ 1 in
 *  inboard of the hard point (starts). need: plies the moment needs at y, compression or tension, each cap. */
export function capSchedule(d, Z) {
  let c = SCHED.get(d); if (c && c.N === Z.csCap && c.lower.NL === (Z.csCapL ?? Z.csCap)) return c;
  const M = materials(d), allow = capAllowable(M, 3, 'PVC', true).allow, tens = capAllowable(M, 3, 'PVC', false).allow, N = Z.csCap, NL = Z.csCapL ?? N, nEnd = Math.min(E.nTop, N), cases = loadCases(d);
  const dy = 0.01, ys = []; for (let y = 0; y <= SPAR.yWeb + 1e-9; y += dy) ys.push(+y.toFixed(4));
  const needOf = (sideUp, nOther) => ys.map((y, i) => { let n = 1;
    for (const lc of cases) { const m = capMomentS(d, lc, y); if (m == null) continue; const comp = sideUp ? m >= 0 : m < 0, a = comp ? allow : tens, no = typeof nOther === 'function' ? nOther(y, i) : nOther;
      while (n < 300 && capCap(n, no, M, a) < Math.abs(m) * (1 + d.msTarget)) n += 1; }
    return n; });
  // lower build-ups first (they do not depend on the upper cap): the upper cap's need then takes the lower plies actually there
  const nEndL = E.nTop, startsL = [];
  if (NL < nEndL) for (let j = 1; j <= nEndL - NL; j++) { const s0 = SPAR.yHP0 - inch - (j - 1) * inch; if (s0 < 0.5 * inch - 1e-9) throw new Error(`CS spar lower build-up ${j} would cross the centre line (csCapLMin)`); startsL.push(+s0.toFixed(6)); }
  const nLpre = (y) => NL + startsL.filter((s) => s <= y + 1e-9).length;
  const need = needOf(true, NL < nEndL ? nLpre : Math.max(NL, E.nTop));
  const ends = [];
  for (let j = 1; j <= N - nEnd; j++) {
    let k = ys.length - 1; while (k > 0 && need[k - 1] <= N - j) k -= 1;    // smallest y beyond which N − j plies suffice
    let e = ys[k] + inch; if (ends.length) e = Math.max(e, ends.at(-1) + inch);
    ends.push(+e.toFixed(4));
  }
  const nAt = (y) => N - ends.filter((e) => e < y - 1e-9).length;
  // lower cap
  const endsL = [];
  if (NL >= nEndL) { const needL = needOf(false, (y) => nAt(y)); for (let j = 1; j <= NL - nEndL; j++) { let k = ys.length - 1; while (k > 0 && needL[k - 1] <= NL - j) k -= 1; let e = ys[k] + inch; if (endsL.length) e = Math.max(e, endsL.at(-1) + inch); endsL.push(+e.toFixed(4)); } }
  const nAtL = (y) => NL + startsL.filter((s) => s <= y + 1e-9).length - endsL.filter((e) => e < y - 1e-9).length;
  const needL = needOf(false, (y) => nAt(y));
  c = { N, nEnd, ends, need: ys.map((y, i) => [y, need[i]]), nAt, allow, tens, lower: { NL, nEnd: nEndL, ends: endsL, starts: startsL, need: ys.map((y, i) => [y, needL[i]]), nAt: nAtL, nMax: Math.max(NL, nEndL) } };
  SCHED.set(d, c); return c;
}

// ------------------------------------------------------------------------------------------- checks
registerChecks('wp15', (d, lc, Z, M) => {
  const out = [], R = rootLoads(d, lc); if (!R) return out;
  const S = capSchedule(d, Z), f = fittingForces(R), FSf = d.FS * FF, P = f.pin * FSf, Pb = E.share * P;
  // 1. cap along the span with the drop-off schedule (centre line is cs-cap in structures.js)
  { let worst = null;
    for (let y = 0.05; y <= SPAR.yTail + 1e-9; y += 0.01) { const m = capMomentS(d, lc, y), nU = S.nAt(y), nL = S.lower.nAt(y), pos = m >= 0;
      for (const [side, n, no, comp] of [['upper', nU, nL, pos], ['lower', nL, nU, !pos]]) { const a = comp ? S.allow : S.tens, ms = capCap(n, no, M, a) / Math.abs(m) - 1; if (!worst || ms < worst.ms) worst = { y, n, no, m: Math.abs(m), ms, side, comp, a }; } }
    out.push(mk('csSpar', 'cs-cap-span', 'CS spar caps along the span with the ply drop-offs', lc, `BL ${(worst.y * 12).toFixed(1)}, ${worst.side} cap`, worst.comp ? 'cap compression (crushing / wrinkling on HT61)' : 'cap tension (fibre)', worst.ms, {
      formula: 'M(y) = FS·(Mx_root + V_root·(y_j − y) + M_strake·((y_j − y)/y_j)²);  d = h − (n_u + n_l)·t/2 − 6·t_BID;  σ = M / (d·n(y)·t·b), each cap in compression or tension',
      inputs: [IN_('Upper cap: plies at the centre line / to the end', `${S.N} / ${S.nEnd}`, 'text', 'SIZED'), IN_('Upper drop stations (BL, in)', S.ends.map((e) => (e * 12).toFixed(1)).join(', '), 'text', 'SIZED'),
        IN_('Lower cap: plies at the centre line / to the end', `${S.lower.NL} / ${S.lower.nEnd}`, 'text', 'SIZED'), IN_('Lower build-up inboard ends (BL, in)', S.lower.starts.map((e) => (e * 12).toFixed(1)).join(', ') || '—', 'text', 'SIZED'),
        IN_('Cap width b', SPAR.b, 'in', 'GEOMETRY'), IN_('Depth h', SPAR.h, 'in', 'MODEL'), IN_(worst.comp ? 'Cap compression allowable' : 'Cap tension allowable', worst.a, 'psi', worst.comp ? `BOUND: NCAMP HTS40 mean × ${MATSYS.kB} (M cycle), ETW 200 °F; ${/wrinkl/.test(capAllowable(M, 3, 'PVC', true).mode) ? 'skin wrinkling governs (modulus, not strength); ' : ''}MS stays ≥ 0 down to × ${(1 / (1 + worst.ms)).toFixed(2)}` : `BOUND: MSU UD glass fibre-direction typical, hot-wet; MS stays ≥ 0 down to × ${(1 / (1 + worst.ms)).toFixed(2)}`)],
      result: [['Station', worst.y * 12, 'in'], ['Plies there', worst.n, ''], ['M (ult.)', worst.m, 'inlb']] }));
  }
  // 2. end: bearing on the whole stack (tail in double shear) and the bolts
  const cin = (a) => chordIn(R, a / E.share, FSf), shareB = (a) => IN_('First-bolt share of the pin load', E.share, '', `BOUND: MS stays ≥ 0 up to ${(a / P).toFixed(2)}`);
  { const brg = E.Fbru * E.D * E.tTot, bolt = 2 * AN8_SHEAR, a = Math.min(brg, bolt);
    out.push(mk('csSpar', 'cs-end-brg', 'CS spar end: laminate bearing at the cap through-bolts (double shear)', lc, 'BL ±35 to ±39, bolt next to the clevis web', brg <= bolt ? 'laminate bearing, cap + pad' : 'AN8 double shear', a / Pb - 1, {
      formula: 'P_b = share·FS·1.15·pin;  σ_br = P_b / (D·(t_cap + t_pad))', inputs: [IN_('Pin resultant (limit)', f.pin, 'lb', 'DERIVED'), shareB(a), IN_('Bolts', `3 × AN8 (${E.D} in), double shear ${2 * AN8_SHEAR} lb`, 'text', 'AN standard'),
        IN_('Cap over the tail', `${E.nTop} × HTS40 + ${E.wrap} × 6781 wrap, ${E.tTop.toFixed(3)} in`, 'text', 'SIZED'), IN_('Pad under the tail', `${E.nPad} × 6781, 0/90 and ±45 alternating, ${E.tPad.toFixed(3)} in`, 'text', 'SIZED'), IN_('Bearing allowable', E.Fbru, 'psi', ALLOWF(brg / Pb - 1, 'compressive strength (bearing not published)')), IN_('Fitting factor', FF, '', 'FAR 23.625'), cin(a)],
      result: [['Bolt load (ult. × 1.15)', Pb, 'lb'], ['σ bearing', Pb / (E.D * E.tTot), 'psi']] }));
  }
  // 3. end: shear-out toward the cap end (the tension cap pulls the bolt toward the clevis web), each laminate on its share
  { const e = E.bolt1, L = e - E.D / 2, top = plyRF(E.top, [0, 0, Pb * E.tTop / E.tTot / (2 * L)], M), pad = plyRF(E.pad, [0, 0, Pb * E.tPad / E.tTot / (2 * L)], M), rf = Math.min(top.rf, pad.rf);
    out.push(mk('csSpar', 'cs-end-shearout', 'CS spar end: shear-out of the cap and pad between the first bolt and the clevis web', lc, 'BL ±39 to ±41', top.rf <= pad.rf ? `cap ${top.mode}` : `pad ${pad.mode}`, rf - 1, {
      formula: 'each laminate takes P_b in proportion to its thickness;  N_xy = P / (2·(e − D/2)) on two planes;  first-ply failure (CLT)',
      inputs: [IN_('Bolt 1 to the clevis web e', e, 'in', 'SIZED'), IN_('Bolt D', E.D, 'in', 'AN standard'), shareB(Pb * rf), IN_('Ply strengths', `NCAMP MTM45-1 in-plane shear (5 % strain), ETW 200 °F, × ${MATSYS.kB}`, 'text', ALLOWF(rf - 1)), cin(Pb * rf / E.share)],
      result: [['Bolt load (ult. × 1.15)', Pb, 'lb'], ['RF cap over the tail', top.rf, ''], ['RF pad', pad.rf, '']] }));
  }
  // 4. end: net section at the bolt farthest from the clevis web, where the whole load passes; shared by axial stiffness
  { const Lt = laminate(E.top, M), Lp = laminate(E.pad, M), kt = Lt.Ex * Lt.h / (Lt.Ex * Lt.h + Lp.Ex * Lp.h), w = SPAR.b - E.D;
    const rt = plyRF(E.top, [P * kt / (w * E.Kh), 0, 0], M, { matrixAt: d.FS }), rp = plyRF(E.pad, [P * (1 - kt) / (w * E.Kh), 0, 0], M, { matrixAt: d.FS }), rf = Math.min(rt.rf, rp.rf);
    out.push(mk('csSpar', 'cs-end-net', 'CS spar end: cap and pad net section at the bolt farthest from the clevis web', lc, 'BL ±35', rt.rf <= rp.rf ? `cap ${rt.mode}` : `pad ${rp.mode}`, rf - 1, {
      formula: 'N_x = P·(EA share) / ((b − D)·K_h) on each laminate;  CLT ply by ply: fibre modes at ultimate, matrix modes (in-plane shear, HTS40 transverse) at limit (N / FS)',
      inputs: [IN_('Pin resultant (limit)', f.pin, 'lb', 'DERIVED'), IN_('Width b − D', w, 'in', 'GEOMETRY'), IN_('Cap share by axial stiffness', kt, '', 'DERIVED'), IN_('Filled-hole factor K_h', E.Kh, '', `BOUND: MS stays ≥ 0 down to ${(E.Kh / rf).toFixed(2)}`), IN_('Ply strengths', `HTS40 fibre (MSU) and 6781 (MTM45-1) typical, × ${MATSYS.kB} (M cycle), ETW compression`, 'text', ALLOWF(rf - 1)), IN_('Fitting factor', FF, '', 'FAR 23.625'), cin(P * rf)],
      result: [['Load (ult. × 1.15)', P, 'lb'], ['RF cap', rt.rf, ''], ['RF pad', rp.rf, '']] }));
  }
  // 5. pad-to-cap load transfer: the pad's share shears up through the filler into the cap over the full-depth overlap
  { const Fp = P * E.tPad / E.tTot, tau = Fp / (SPAR.b * E.Lov), ils = psi(M.UNI.ILSS);
    out.push(mk('csSpar', 'cs-pad-lap', 'CS spar end: pad and filler into the cap (interlaminar shear inboard of the tail end)', lc, 'BL ±33', 'interlaminar shear', ils / tau - 1, {
      formula: 'F_pad = P·t_pad / (t_cap + t_pad);  τ = F_pad / (b·L_ov), ramp plies beyond L_ov not counted',
      inputs: [IN_('Pin resultant (limit)', f.pin, 'lb', 'DERIVED'), IN_('Full-depth overlap L_ov', E.Lov, 'in', 'SIZED'), IN_('Width b', SPAR.b, 'in', 'GEOMETRY'), IN_('Interlaminar shear allowable', ils, 'psi', ALLOWF(ils / tau - 1)), IN_('Fitting factor', FF, '', 'FAR 23.625'), cin(Fp * (ils / tau) / (E.tPad / E.tTot))],
      result: [['Pad load (ult. × 1.15)', Fp, 'lb'], ['τ', tau, 'psi']] }));
  }
  return out;
});

// ------------------------------------------------------------------------------------------- hard points for bolted parts
// Brackets that bolt to the spar use fore-aft through-bolts through both webs (and the firewall, where it is bonded to the
// aft face), an aluminium crush tube through the core at each bolt, and BID doublers on both webs sized for bearing.
// zIn: bolt heights above the box's lower outer face (in); cols: spanwise offsets (in) from the bracket's BL.
const AN_TENS_ = { 5: 6500, 6: 9450 };
/** drag-bracket bolt heights (in above the lower face): the lower row 0.15 in clear of the end hard point's top at the
 *  bracket's outboard bolt edge (rounded up to 0.05 in, never below 1.4), the upper row 1.5 in above it */
function dragZ() {
  const x = ATTACH.drag[1] + (0.75 + 0.375 / 2) / 12;   // ft, outboard bolt edge
  const j = Array.from({ length: SPAR.nHP }, (_, i) => i + 1).find((k) => SPAR.yIn(k) <= x);
  const top = j ? SPAR.depth.padBot - (j - 1) * E.tB : 0, z1 = Math.max(1.4, Math.ceil((top + 0.15 + 0.375 / 2) * 20) / 20);
  return [z1, +(z1 + 1.5).toFixed(2)];
}
/** what the firewall (LEZ-53-180) puts between leg A and the spar's aft face: its CRES patch, 0.016 in (was a 0.50 in allowance) */
export const FW_PATCH = 0.016;
export const HARD = [
  { id: 'mount', part: 'LEZ-71-223', name: 'Lower engine-mount bracket', y: MOUNT.nodes.FBL[1], an: BRK.an, d: BRK.dS, zIn: BRK.zSpar, cols: [0], fw: true, perBolt: true,
    note: 'the bracket is a cantilever from the spar: each bolt takes its share of the pick-up load and of its moment' },
  { id: 'drag', part: 'LEZ-57-141', name: 'Wing drag / torsion fitting', y: ATTACH.drag[1], an: 6, d: 0.375, zIn: dragZ(), cols: [-0.75, 0.75], fw: false, perBolt: true,
    note: 'bolts above the end hard-point filler, which reaches inboard to BL ' + (SPAR.yHP0 * 12).toFixed(1) },
].map((h) => ({ ...h, n: h.zIn.length * h.cols.length, grip: SPAR.width + 0.25 + (h.fw ? FW_PATCH : 0) + 0.125, tube: SPAR.width - 2 * 0.06 }));
for (const h of HARD) h.hw = anBolt(h.d, h.grip);
/** limit load into the spar at a hard point for one case: { F (lb, resultant), axial (lb, along the bolts), ult, note } */
function hardLoad(h, d, lc) {
  if (h.id === 'mount') { const w = bracketCase(d, lc); if (!w) return null;   // per bolt, already ultimate × 1.15 (wp6 bracket statics)
    return { F: w.st.shMax, axial: w.st.tMax, ult: 1, note: 'worst spar bolt of the lower engine-mount bracket (LEZ-71-223 statics)' }; }
  const w = dragCase(d, lc); if (!w) return null;   // per bolt, ultimate × 1.15 (drag-fitting statics below)
  return { F: w.st.shMax, axial: w.st.tMax, ult: 1, note: 'worst flange bolt of the drag / torsion fitting (LEZ-57-141 statics)', R: w.R };
}

// ------------------------------------------------------------------------------------------- drag / torsion fitting LEZ-57-141
// A machined 2024-T351 L: a flange on the spar's aft face, through-bolted (2 × 2 AN6 fore-aft) to the spar's drag hard
// point, and an arm running aft along the lower skin to a lug that laps over the wing's drag angle (LEZ-57-144) on the
// vertical drag bolt. The bolt takes the chordwise load F_x and the drag moment's spanwise couple F_y in shear and the
// torsion couple R3 in tension; the arm carries them back to the flange in bending (both axes) and axial load; the
// flange bolts take them in shear (direct plus the in-plane moment) and tension (pull-off plus the arm moments, the
// flange pivoting on whichever edge is in compression). Inches, frame: x spanwise from the fitting's centre line
// (+ outboard), y aft from the spar's aft face, z up from the spar's lower face.
// ------------------------------------------------------------------------------------------- wing drag angle LEZ-57-144
// The wing half of the third bolt: a stock 6061-T6 equal angle in the jut-out's root pocket. Leg A lies on the lower skin
// (floxed onto a BID doubler laid into the skin) under the fitting's lug; leg B stands up aft of the lug's end and is
// floxed and taped to the pocket's aft wall. The drag bolt passes the lug, leg A, the doubler and the skin, head in a flush
// recess. Leg A takes the bolt's in-plane load in bearing and puts it into the skin through the bond; the torsion couple
// lifts leg A, which bends about its heel. Inches; frame x spanwise (+ outboard) from the bolt, y aft, z up from leg A's
// underside. Loads ultimate × 1.15.
// 6061-T6 extrusion A-basis: Ftu 38, Fbru (e/D 2.0) 82 ksi (was 88, the B-basis value); Fsu kept at 24 ksi (Aluminum Association 1968 minimum, below
// the handbook 26: conservative). src 'MIL-HDBK-5J table 3.6.2.0(g), AMS-QQ-A-200/8, t ≤ 1.000 in (KasperCalc transcription, accessed 2026-11-19)'
const AL61 = { Ftu: 38000, Fbru: 82000, Fsu: 24000, rho: 0.098, spec: 'AMS-QQ-A-200/8 (6061-T6 extruded angle), MIL-HDBK-5J table 3.6.2.0(g) A-basis (KasperCalc transcription, accessed 2026-11-19); Fsu 24 ksi conservative' };
const DANG_ANGLES = [[1.5, 0.125], [1.5, 0.1875], [2, 0.125], [1.5, 0.25], [2, 0.1875], [2, 0.25]];   // stock 6061-T6 equal angles
/** the angle's state for ultimate × 1.15 in-plane load P and lift Fz */
function dangState(P, Fz, g, M) {
  const D = g.D, t = g.t, brg = AL61.Fbru * D * t, so = 2 * (g.eF - D / 2) * t * AL61.Fsu, net = (g.L - D) * t * AL61.Ftu * 0.75;
  const lever = g.yh - t / 2, bend = 6 * Fz * lever / (g.L * t * t), bondA = P / (g.L * (g.b - t)), bondB = Fz / (g.L * (g.b - t));
  const sk = laminate(g.skin, M), N = P / (g.L + 2 * g.margin), rf = plyRF(g.skin, [N, 0, 0], M);
  const bondAllow = psi(M.UNI.ILSS);
  return { brg, so, net, lug: Math.min(brg, so, net), bend, bondA, bondB, bondAllow, N, skinRF: rf.rf, skinMode: rf.mode, skinT: sk.h,
    ms: { brg: Math.min(brg, so, net) / P - 1, bend: AL61.Ftu / bend - 1, bond: bondAllow / Math.max(bondA, bondB) - 1, skin: rf.rf - 1 } };
}
const dangGeo = (b, t, nD) => { const D = ATT.drag / 16, clr = 0.1, yh = 2 * D + clr + t;   // heel aft of the lug's end (2 D aft of the bolt) with clearance
  const skin = [...Array.from({ length: 2 }, () => ({ mat: 'BID', angle: 45 })), ...Array.from({ length: nD }, () => ({ mat: 'BID', angle: 0 }))];
  return { b, t, D, yh, eF: b - yh, L: 3.0, nD, skin, margin: 2.0, below: (ATTACH.zLo - omlAt_lo()) * 12 }; };
const omlAt_lo = () => ATTACH.zLo - 0.025;   // ATTACH.zLo is the lower OML + 0.025 ft at the drag bolt (wp13)
export const DANG = (() => {
  const d = DEFAULT_DESIGN, M = materials(d), cases = [];
  for (const lc of loadCases(d)) { const R = rootLoads(d, lc); if (!R) continue; const f = fittingForces(R), k = d.FS * FF; cases.push({ P: Math.hypot(R.Fx, f.Fy3) * k, Fz: Math.abs(f.R3) * k }); }
  const worst = (g) => Math.min(...cases.map((c) => Math.min(...Object.values(dangState(c.P, c.Fz, g, M).ms))));
  let pick = null;
  for (const [b, t] of DANG_ANGLES) for (const L of [2, 2.5, 3, 4]) for (let nD = 2; nD <= 12; nD += 2) {
    const g = { ...dangGeo(b, t, nD), L }; if (g.eF < 2 * g.D) continue; const ms = worst(g), v = L * t * (2 * b - t) + nD * BASE_MAT.BID.t * (L + 2 * g.margin) * (b + 2 * g.margin);
    if (ms >= TGT_ && (!pick || v < pick.v)) pick = { ...g, ms, v };
  }
  return { ...pick, mat: AL61, mass: (pick.L * pick.t * (2 * pick.b - pick.t) - Math.PI * (pick.D / 2) ** 2 * pick.t) * AL61.rho,
    dblArea: (pick.L + 2 * pick.margin) * (pick.b + 2 * pick.margin), M };
})();
export const DRAG_ANGLE_T = DANG.t;   // the wing angle's leg under the fitting's lug (in)
const AL24 = { Ftu: 64000, Fsu: 38000, Fbru: 117000, rho: 0.1003, Kt: 0.75, spec: 'AMS-QQ-A-250/4 2024-T351 plate, A-basis: Ftu 64, Fsu 38 (0.25–0.499 in), Fbru 117 ksi (e/D 2.0): MIL-HDBK-5H CN1 table 3.2.3.0(b1), METU AE462 copy (accessed 2026-11-19)' };
const dragGeo = (ta, Wa, tf, Wl = Wa) => {   // Wa: arm width at the flange, tapering straight to Wl at the drag bolt
  const h = HARD.find((q) => q.id === 'drag'), Dd = ATT.drag / 16, dB = h.d, zA = (ATTACH.zLo - CS_FIT.L) * 12 + DRAG_ANGLE_T, yB = (ATTACH.drag[0] - (CS.s + CS.width / 2)) * 12;
  const zR = h.zIn, cols = h.cols, Wf = 2 * Math.max(...cols) + 4 * dB, zTop = zR.at(-1) + 2 * dB;
  return { ta, Wa, Wl, tf, Dd, dB, zA, yB, zR, cols, Wf, zTop, yEnd: yB + 2 * Dd, r: 0.25, zLoad: zA + ta / 2 };
};
/** ultimate × 1.15 state of the fitting for limit bolt loads Fx (fore-aft), Fy (spanwise), Fz (vertical) at factor k */
function dragState(F, k, g) {
  const Fx = Math.abs(F[0]) * k, Fy = Math.abs(F[1]) * k, Fz = Math.abs(F[2]) * k;
  let arm = 0;   // arm: both bending axes + axial, at stations from the flange face (+ fillet) to the lug
  for (let i = 0; i <= 20; i++) { const y = g.tf + g.r + (g.yB - g.Dd - g.tf - g.r) * i / 20, W = g.Wa + (g.Wl - g.Wa) * y / g.yB, L = g.yB - y;
    arm = Math.max(arm, 6 * Fz * L / (W * g.ta ** 2) + 6 * Fy * L / (g.ta * W ** 2) + Fx / (W * g.ta)); }
  const M1 = Fz * g.yB, M2 = Fy * g.yB;                                                                     // into the flange about x and about z
  const fl = 6 * M1 / (g.Wf * g.tf ** 2) + 6 * M2 / (g.tf * g.Wf ** 2) + Fx / (g.Wf * g.tf);                  // flange just above the corner
  const P = Math.hypot(Fx, Fy), brg = g.Dd * g.ta * AL24.Fbru, net = (g.Wl - g.Dd) * g.ta * AL24.Ftu * AL24.Kt, so = 2 * (g.yEnd - g.yB - g.Dd / 2) * g.ta * AL24.Fsu;
  // flange bolts: (x, z) pattern; in-plane F_y (x) and F_z (z) at the arm's mid-plane, moment about the group centroid
  const B = g.zR.flatMap((z) => g.cols.map((x) => ({ x, z }))), n = B.length, zc = B.reduce((a, b) => a + b.z, 0) / n, J = B.reduce((a, b) => a + b.x ** 2 + (b.z - zc) ** 2, 0);
  let shMax = 0, tMax = 0, comb = 0;
  for (const sy of [-1, 1]) for (const sz of [-1, 1]) for (const sx of [-1, 1]) {
    const fy = sy * Fy, fz = sz * Fz, Mt = -fy * (g.zLoad - zc);                                             // in-plane torque about y
    const m1 = fz * g.yB, m2 = fy * g.yB, pull = sx > 0 ? Fx : 0;                                          // aft pull loads the bolts; a forward push bears on the spar
    const zp = m1 > 0 ? g.zA : g.zTop, xp = m2 > 0 ? -g.Wf / 2 : g.Wf / 2;                                   // pivot edges in compression
    const dz = B.map((b) => Math.abs(b.z - zp)), dx = B.map((b) => Math.abs(b.x - xp)), Sz = dz.reduce((a, v) => a + v * v, 0), Sx = dx.reduce((a, v) => a + v * v, 0);
    B.forEach((b, i) => {
      const vx = fy / n - Mt * (b.z - zc) / J, vz = fz / n + Mt * b.x / J, sh = Math.hypot(vx, vz);
      const te = pull / n + Math.abs(m1) * dz[i] / Sz + Math.abs(m2) * dx[i] / Sx;
      shMax = Math.max(shMax, sh); tMax = Math.max(tMax, te); comb = Math.max(comb, Math.hypot(sh / AN_SHEAR[6], te / AN_TENS[6]));
    });
  }
  const bolt = Math.hypot(P / AN_SHEAR[ATT.drag], Fz / AN_TENS[ATT.drag]);                                  // drag bolt, single shear
  return { Fx, Fy, Fz, arm, fl, P, brg, net, so, lug: Math.min(brg, net, so), shMax, tMax, comb, bolt,
    ms: { arm: AL24.Ftu / arm - 1, flange: AL24.Ftu / fl - 1, lug: Math.min(brg, net, so) / P - 1, bolts: 1 / comb - 1, dbolt: 1 / bolt - 1 } };
}
const dragLoads = (R) => { const f = fittingForces(R); return [R.Fx, f.Fy3, f.R3]; };
export function dragVolume(g) {   // in³: flange + arm + inside-corner fillet − holes
  return g.Wf * g.tf * (g.zTop - g.zA) + g.ta * ((g.Wa + g.Wl) / 2 * g.yB - (g.Wa + (g.Wl - g.Wa) * g.tf / g.yB + g.Wa) / 2 * g.tf + g.Wl * (g.yEnd - g.yB)) + (1 - Math.PI / 4) * g.r ** 2 * (g.Wa + (g.Wl - g.Wa) * (g.tf + g.r) / g.yB)
    - Math.PI * (g.Dd / 2) ** 2 * g.ta - g.zR.length * g.cols.length * Math.PI * (g.dB / 2) ** 2 * g.tf;
}
export const DRG = (() => {
  const d = DEFAULT_DESIGN, cases = [], hd = HARD.find((q) => q.id === 'drag');
  for (const lc of loadCases(d)) { const R = rootLoads(d, lc); if (R) cases.push({ lc: lc.id, F: dragLoads(R), k: d.FS * FF }); }
  const T = [0.25, 0.3125, 0.375, 0.5, 0.625, 0.75], W = [1.5, 2.0, 2.5, 3.0], WL = [1.0, 1.25, 1.5];
  const worst = (g, keys) => Math.min(...cases.map((c) => { const st = dragState(c.F, c.k, g); return Math.min(...keys.map((k) => st.ms[k])); }));
  // 1: arm and lug (independent of the flange)
  let arm = []; for (const ta of T) for (const Wa of W) for (const Wl of WL) { if (Wl > Wa) continue; const g = dragGeo(ta, Wa, 0.5, Wl); if (Wa > g.Wf + 1e-9) continue; arm.push({ g, ms: worst(g, ['arm', 'lug']), v: dragVolume(g) }); }
  const a = arm.filter((o) => o.ms >= TGT_).sort((x, y) => x.v - y.v)[0] || arm.sort((x, y) => y.ms - x.ms)[0];
  // 2: flange bolt rows, the lower one with a washer clear above the arm's corner fillet (moves the spar's drag hard point up)
  const z0 = dragZ()[0], need = Math.ceil((a.g.zA + a.g.ta + a.g.r + hd.d) * 20) / 20, z1 = Math.max(z0, need);
  hd.zIn = [z1, +(z1 + 1.5).toFixed(2)];
  // 3: flange thickness for the flange section and the bolts
  const fl = T.map((tf) => { const g = dragGeo(a.g.ta, a.g.Wa, tf, a.g.Wl); return { g, ms: worst(g, ['arm', 'lug', 'flange', 'bolts']), v: dragVolume(g) }; });
  const pick = fl.filter((o) => o.ms >= TGT_).sort((x, y) => x.v - y.v)[0] || fl.sort((x, y) => y.ms - x.ms)[0];
  return { ...pick.g, mat: AL24, ms: pick.ms, vol: pick.v, mass: pick.v * AL24.rho, rowsRaised: z1 > z0 ? +(z1 - z0).toFixed(2) : 0 };
})();
{ // the part: stand-in boxes for the systems view (the definition solid replaces them), hardware on the fitting
  const g = DRG, zL = CS_FIT.L, fw = CS.s + CS.width / 2, k = 1 / 12, y0 = ATTACH.drag[1];
  defineParts([{ pn: 'LEZ-57-141', nha: 'LEZ-57-145', kind: 'machined', massItem: 'wings', name: `Wing attach drag / torsion fitting (third bolt, L/R), AN${ATT.drag}`, ata: 57, qty: 2, material: '2024-T351', massEach: +g.mass.toFixed(3),
    geo: [-1, 1].flatMap((sg) => [
      { t: 'box', c: [fw + g.tf * k / 2, sg * y0, zL + (g.zA + g.zTop) * k / 2], d: [g.tf * k, g.Wf * k, (g.zTop - g.zA) * k], mat: '2024', colour: 0x9aa4ae },
      { t: 'box', c: [fw + g.yEnd * k / 2, sg * y0, zL + (g.zA + g.ta / 2) * k], d: [g.yEnd * k, (g.Wa + g.Wl) / 2 * k, g.ta * k], mat: '2024', colour: 0x9aa4ae },
      { t: 'cyl', a: [fw + g.yB * k, sg * y0, ATTACH.zLo - 0.012], b: [fw + g.yB * k, sg * y0, zL + (g.zA + g.ta) * k + 0.03], r: g.Dd / 24, mat: 'steel', colour: 0x8c96a3 }]),
    hardware: [],
    hardwareNote: 'None on the detail: the drag bolt is installation hardware on LEZ-57-145; the 2 × 2 AN6 flange bolts, crush tubes, nuts and washers are hardware on the CS spar (LEZ-57-140, drag hard point).',
    props: [['Arm', `${g.Wa} → ${g.Wl} in wide × ${g.ta} in, drag bolt ${g.yB.toFixed(2)} in aft of the spar face`], ['Flange', `${g.Wf.toFixed(2)} × ${g.tf} in, 2 × 2 AN6 to the spar`], ['Loads', 'torsion as a vertical couple with the spar pins, drag moment as a spanwise couple, chordwise load along the arm']],
    blurb: `The third bolt [CZ]: a machined 2024-T351 L bolted to the CS spar's aft face (2 × 2 AN6 through the spar's drag hard point) whose arm runs aft ${g.yB.toFixed(1)} in along the lower skin, under the routes that pass behind the spar, to a lug that laps over the wing's drag angle (LEZ-57-144) on a vertical AN${ATT.drag}. Reached from the root pocket [LP]. It reacts the wing's torsion and drag moment against the spar pins.`,
    steps: [S1_('Fit with the wing pinned; drill the drag bolt through the lug and the wing angle together', ['Wing seats on the spar pins without preload from the drag fitting', 'Lug flat on the angle leg: no gap over 0.005 in before torque'])],
    src: { mass: 'GEOMETRY: the definition solid (LEZ-57-141)', design: '[LP] [CZ] + LEZ sizing (wp15)' } }]);
}
/** worst state for one load case (lowest MS over every item), with the root loads */
export function dragCase(d, lc, k = CHORD.k) {
  const R = rootLoads(d, lc, k); if (!R) return null;
  const st = dragState(dragLoads(R), d.FS * FF, DRG); return { R, st, min: Math.min(...Object.values(st.ms)) };
}
/** the largest chordwise-load ratio k for which an item's MS stays ≥ 0 in this case */
function kBound(d, lc, item) {
  const ms = typeof item === 'function' ? item : (k) => dragCase(d, lc, k).st.ms[item];
  if (ms(0) < 0) return 0; if (ms(3) >= 0) return 3;
  let a = 0, b = 3; for (let i = 0; i < 40; i++) { const m = (a + b) / 2; if (ms(m) >= 0) a = m; else b = m; } return a;
}
const kText = (k) => `BOUND: MS stays ≥ 0 up to ${k >= 3 ? '≥ 3' : k.toFixed(2)} (the load at ${Math.round(CHORD.at * 100)} % of the panel span)`;
const CHORD_IN = (d, lc, item) => IN_('Chordwise load ratio (× |V|)', CHORD.k, '', kText(kBound(d, lc, item)));
registerChecks('wp15-dangle', (d, lc) => {
  const w = dragCase(d, lc); if (!w) return [];
  const g = DANG, M = g.M, at = (k) => { const c = dragCase(d, lc, k); return dangState(c.st.P, c.st.Fz, g, M); }, st = at(CHORD.k), out = [];
  const base = [IN_('Drag-bolt load in plane / lift (ult. × 1.15)', `${st && w.st.P.toFixed(0)} / ${w.st.Fz.toFixed(0)}`, 'lb', 'DERIVED'), IN_('Angle', `${g.b} × ${g.b} × ${g.t} in, ${g.L} in long`, 'text', 'SIZED')];
  const row = (id, title, mode, key, formula, extra, result) => out.push(Object.assign(mk('wing', id, title, lc, 'jut-out root pocket, BL ±26.4', mode, st.ms[key], {
    formula, inputs: [...base, ...extra, IN_('Chordwise load ratio (× |V|)', CHORD.k, '', kText(kBound(d, lc, (k) => at(k).ms[key])))], result }), { sys: 'LEZ-57-144' }));
  const mat = IN_('6061-T6 F_tu / F_su / F_bru', `${AL61.Ftu / 1000} / ${AL61.Fsu / 1000} / ${AL61.Fbru / 1000} ksi`, 'text', AL61.spec);
  row('dang-lug', 'Wing drag angle: leg A at the drag bolt', st.lug === st.brg ? 'bearing' : st.lug === st.so ? 'shear-out (forward edge)' : 'net section', 'brg',
    'allow = min(F_bru·D·t, 2·(e − D/2)·t·F_su, 0.75·(L − D)·t·F_tu)', [mat, IN_('Bolt to forward edge e', g.eF, 'in', 'GEOMETRY')], [['Bearing', st.brg, 'lb'], ['Shear-out', st.so, 'lb'], ['Net section', st.net, 'lb']]);
  row('dang-bend', 'Wing drag angle: leg A bending about the heel (torsion lift)', 'bending', 'bend', 'σ = 6·F_z·(y_heel − t/2) / (L·t²)', [mat, IN_('Bolt to heel', g.yh, 'in', 'GEOMETRY')], [['σ (ult.)', st.bend, 'psi']]);
  row('dang-bond', 'Wing drag angle: flox bond of leg A to the doubler, leg B to the pocket wall', 'bond shear', 'bond', 'τ_A = P / (L·(b − t)),  τ_B = F_z / (L·(b − t))',
    [IN_('Bond allowable', st.bondAllow, 'psi', allowB(st.ms.bond, 'interlaminar shear strength, taken for the flox bond line'))], [['τ leg A', st.bondA, 'psi'], ['τ leg B', st.bondB, 'psi']]);
  row('dang-skin', 'Wing drag angle: jut-out lower skin and doubler under the angle', st.skinMode, 'skin', 'N_x = P / (L + 2·margin) through 2 × 6781 ±45 skin + n 6781 0/90 doubler;  first-ply failure (CLT)',
    [IN_('Doubler', `${g.nD} × 6781 0/90, ${g.margin} in past the angle all round`, 'text', 'SIZED'), IN_('Ply strengths', 'MTM45-1 typical', 'text', allowB(st.ms.skin))], [['N_x (ult.)', st.N, 'lb/in'], ['Reserve factor', st.skinRF, '']]);
  return out;
});
{ // the angle (stand-in boxes for the systems view; the definition solid replaces them) and its doubler in the jut-out
  const g = DANG, k = 1 / 12, z0 = ATTACH.zLo, s0 = ATTACH.drag[0], y0 = ATTACH.drag[1];
  defineParts([{ pn: 'LEZ-57-144', nha: 'LEZ-57-110', kind: 'machined', massItem: 'wings', name: `Wing drag-bolt angle, ${g.b} × ${g.b} × ${g.t} in 6061-T6, in the jut-out root pocket (L/R)`, ata: 57, qty: 2, material: '6061-T6', massEach: +g.mass.toFixed(3),
    geo: [-1, 1].flatMap((sg) => [
      { t: 'box', c: [s0 + (g.yh - g.b) * k / 2 + 0 * k, sg * y0, z0 + g.t * k / 2], d: [g.b * k, g.L * k, g.t * k], mat: '6061', colour: 0xb7bec7 },
      { t: 'box', c: [s0 + (g.yh - g.t / 2) * k, sg * y0, z0 + g.b * k / 2], d: [g.t * k, g.L * k, g.b * k], mat: '6061', colour: 0xb7bec7 }]),
    hardware: [], hardwareNote: 'None: the drag bolt is installation hardware on LEZ-57-145.',
    props: [['Angle', `${g.b} × ${g.b} × ${g.t} in, ${g.L} in long, leg A forward under the lug, leg B ${g.yh.toFixed(2)} in aft of the bolt`], ['Jut-out doubler', `${g.nD} × 6781 0/90, ${(g.L + 2 * g.margin).toFixed(1)} × ${(g.b + 2 * g.margin).toFixed(1)} in, laid into the lower skin under the angle`]],
    blurb: `The wing half of the third bolt [CZ]: a stock 6061-T6 angle floxed into the wing-root jut-out's root pocket. Leg A lies on a ${g.nD}-ply 6781 doubler on the lower skin under the drag / torsion fitting's lug (LEZ-57-141); leg B stands up aft of the lug's end, floxed and taped to the pocket's aft wall. The vertical AN${ATT.drag} drag bolt passes the lug, leg A, the doubler and the skin.`,
    steps: [S1_('Flox and glass into the jut-out with the wing on the jig', ['Leg flat on the lower skin, bond line void-free (tap test)'])],
    src: { mass: 'GEOMETRY: the definition solid (LEZ-57-144)', design: '[LP] [CZ] + LEZ sizing (wp15)' } }]);
  const jut = partByPN('LEZ-57-116');
  if (jut) { const lb = g.nD * plyWeight('BID', g.dblArea / 144, 1); jut.props.push(['Drag-angle doubler', `${g.nD} × 6781 0/90 under LEZ-57-144, ${(g.L + 2 * g.margin).toFixed(1)} × ${(g.b + 2 * g.margin).toFixed(1)} in (${lb.toFixed(2)} lb, included)`]); jut.massEach = +(jut.massEach + lb).toFixed(2); }
}
registerChecks('wp15-drag', (d, lc) => {
  const w = dragCase(d, lc); if (!w) return [];
  const g = DRG, st = w.st, out = [], fx = (v) => v.toFixed(3);
  const base = [IN_('Drag-bolt loads F_x, F_y, F_z (limit)', `${w.R.Fx.toFixed(0)}, ${(st.Fy / (d.FS * FF)).toFixed(0)}, ${(st.Fz / (d.FS * FF)).toFixed(0)}`, 'lb', 'DERIVED'), IN_('Factor', `${d.FS} × ${FF}`, '', 'FAR23 × FAR 23.625')];
  const geo = IN_('Fitting', `arm ${g.Wa} → ${g.Wl} wide × ${g.ta} in, flange ${fx(g.Wf)} × ${g.tf} in, drag bolt ${fx(g.yB)} in aft of the flange face`, 'text', 'SIZED');
  const mat = IN_('2024-T351 F_tu / F_su / F_bru', `${AL24.Ftu / 1000} / ${AL24.Fsu / 1000} / ${AL24.Fbru / 1000} ksi`, 'text', AL24.spec);
  const row = (id, title, mode, ms, formula, result, extra = []) => out.push(Object.assign(mk('wing', id, title, lc, 'BL ±26.4, behind the CS spar', mode, ms, { formula, inputs: [...base, CHORD_IN(d, lc, id === 'wing-attach-drag' ? 'dbolt' : id.slice(4)), geo, ...extra, mat], result }), { sys: 'LEZ-57-141' }));
  row('drg-arm', 'Drag / torsion fitting: arm root, bending and axial', 'bending (both axes) + axial', st.ms.arm, 'σ = 6·F_z·L/(W·t²) + 6·F_y·L/(t·W²) + F_x/(W·t) at stations along the tapered arm, L = distance to the drag bolt', [['σ (ult.)', st.arm, 'psi']]);
  row('drg-flange', 'Drag / torsion fitting: flange above the corner', 'bending (both axes) + axial', st.ms.flange, 'σ = 6·F_z·y_B/(W_f·t_f²) + 6·F_y·y_B/(t_f·W_f²) + F_x/(W_f·t_f)', [['σ (ult.)', st.fl, 'psi']]);
  row('drg-lug', 'Drag / torsion fitting: lug at the drag bolt', st.lug === st.brg ? 'bearing' : st.lug === st.net ? 'net section' : 'shear-out', st.ms.lug, 'P = √(F_x² + F_y²);  allow = min(D·t·F_bru, K·(W − D)·t·F_tu, 2·(e − D/2)·t·F_su)', [['P (ult.)', st.P, 'lb'], ['Bearing', st.brg, 'lb'], ['Net section', st.net, 'lb'], ['Shear-out', st.so, 'lb']]);
  row('drg-bolts', `Drag / torsion fitting: flange bolts (${g.zR.length * g.cols.length} × AN6), shear and tension`, 'combined shear and tension', st.ms.bolts, 'shear: direct + in-plane moment about the group;  tension: pull-off + F_z·y_B and F_y·y_B, pivoting on the compressed flange edge;  (R_s² + R_t²)^½ ≤ 1',
    [['Max bolt shear (ult.)', st.shMax, 'lb'], ['Max bolt tension (ult.)', st.tMax, 'lb']], [IN_('AN6', `${AN_SHEAR[6]} lb shear, ${AN_TENS[6]} lb tension`, 'text', 'AN standard')]);
  row('wing-attach-drag', `Wing attach third bolt (AN${ATT.drag}): single shear + torsion tension`, 'combined shear + tension', st.ms.dbolt, 'shear √(F_x² + F_y²) (single shear, the lug laps the wing angle);  tension F_z;  (V/V_a)² + (P/P_a)² ≤ 1',
    [['Shear (ult. × 1.15)', st.P, 'lb'], ['Tension (ult. × 1.15)', st.Fz, 'lb']], [IN_(`AN${ATT.drag}`, `${AN_SHEAR[ATT.drag]} lb shear, ${AN_TENS[ATT.drag]} lb tension`, 'text', 'AN standard'), IN_('Arm, spar pins to the drag bolt', ATTACH.arm, 'in', 'GEOMETRY')]);
  return out;
});

const SIZEHP = new Map();
/** doubler plies per web: fewest BID plies that carry the worst case in bearing with the joint reserve */
export function hardDoubler(h, d, Z, M) {
  const k = `${h.id}|${Z.csWeb}`; if (SIZEHP.has(k)) return SIZEHP.get(k);
  let worst = 0; for (const lc of loadCases(d)) { const L = hardLoad(h, d, lc); if (L) worst = Math.max(worst, L.F * L.ult); }
  let n = 0; while (n < 60 && psi(M.BID.Fbru) * (h.perBolt ? 1 : h.n) * h.d * 2 * (Z.csWeb + n) * M.BID.t < worst * 1.15) n += 1;
  SIZEHP.set(k, n); return n;
}
registerChecks('wp15-hp', (d, lc, Z, M) => {
  const out = [];
  for (const h of HARD) {
    const L = hardLoad(h, d, lc); if (!L) continue;
    const nb = h.perBolt ? 1 : h.n, nD = hardDoubler(h, d, Z, M), t = 2 * (Z.csWeb + nD) * M.BID.t, P = L.F * L.ult, brg = psi(M.BID.Fbru) * nb * h.d * t, ten = nb * AN_TENS_[h.an], Pa = L.axial * L.ult;
    const ms = Math.min(brg / P, Pa ? ten / Pa : Infinity) - 1;
    const inputs = [IN_(h.perBolt ? 'Worst bolt shear (ult. × 1.15)' : 'Load at the bracket (limit)', L.F, 'lb', 'DERIVED'), IN_(h.perBolt ? 'Worst bolt tension (ult. × 1.15)' : 'Axial load, along the bolts (limit)', L.axial, 'lb', 'DERIVED'), IN_('Through-bolts', `${h.n} × AN${h.an} (${h.d} in), ${h.hw.bolt}`, 'text', 'AN standard'),
      IN_('Webs at the hard point', `2 × (${Z.csWeb} + ${nD}) 6781 = ${t.toFixed(3)} in`, 'text', 'SIZED'), IN_('Bearing allowable', psi(M.BID.Fbru), 'psi', ALLOWF(brg / P - 1, 'compressive strength (bearing not published)'))];
    if (h.id === 'mount') inputs.push(IN_('Bolt loads', 'per bolt, from the bracket cantilever statics (pick-up 6.6 in below the spar)', 'text', 'DERIVED'));
    else inputs.push(IN_('Bolt loads', 'per bolt, from the drag / torsion fitting statics (LEZ-57-141)', 'text', 'DERIVED'),
      CHORD_IN(d, lc, (k) => { const w = dragCase(d, lc, k); return Math.min(brg / w.st.shMax, ten / Math.max(1e-9, w.st.tMax)) - 1; }));
    out.push(Object.assign(mk('csSpar', `cs-hp-${h.id}`, `CS spar hard point: ${h.name} through-bolts in the webs`, lc, `BL ±${(h.y * 12).toFixed(1)}`, brg / P <= (Pa ? ten / Pa : Infinity) ? 'web bearing (both webs)' : 'bolt tension', ms, {
      formula: 'σ_br = FS·F / (n·d·t_webs);  axial load in bolt tension', inputs, result: [['Load (ult.)', P, 'lb'], ['σ bearing', P / (h.n * h.d * t), 'psi']] }), { sys: h.part }));
  }
  return out;
});

// ------------------------------------------------------------------------------------------- ply book
const PACK = 10;
registerBookExtras('csSpar', (books, R) => {
  const b = books.csSpar; if (!b) return;
  const Z = R.Z, S = capSchedule(R.d, Z);
  const keep = b.plies.filter((p) => p.region === 'web' || p.region === 'skin' || p.iface);
  const plies = keep.filter((p) => p.region === 'web');
  for (const h of HARD) { const n = hardDoubler(h, R.d, Z, R.M); if (!n) continue; const half = (Math.max(...h.cols.map(Math.abs)) + 1.5 * h.d + 1.0) / 12;
    for (const sg of [-1, 1]) for (const face of [-1, 1]) plies.push({ id: `S-W${h.id === 'mount' ? 'M' : 'D'}${sg < 0 ? 'L' : 'R'}${face < 0 ? 'F' : 'A'}`, mat: 'BID', angle: 45, region: 'web', side: face, plies: n, span: sg < 0 ? [-h.y - half, -h.y + half] : [h.y - half, h.y + half], area: 2 * half * CS.depthFt, weight: plyWeight('BID', 2 * half * CS.depthFt, n), note: `Web doubler at the ${h.name.toLowerCase()} through-bolts (${h.part})`, step: 2, local: true, flat: { kind: 'strip', L: 24 * half, w0: CS.depthFt * 12, w1: CS.depthFt * 12 } }); }
  const add = (p) => plies.push({ plies: 1, ...p, weight: plyWeight(p.mat, p.area, p.plies || 1) });
  for (const side of [-1, 1]) {
    const nm = side < 0 ? 'L' : 'U', step = side < 0 ? 3 : 5;
    // hard points: pad then filler, left and right, in packs of up to 10 plies
    const packs = []; for (const [a, b] of [[1, E.nPad], [E.nPad + 1, SPAR.nHP]]) for (let j = a; j <= b; j += PACK) packs.push([j, Math.min(j + PACK - 1, b)]);   // packs never straddle pad and filler
    for (const sg of [-1, 1]) for (const [j0, j1] of packs) {
      const n = j1 - j0 + 1, filler = j0 > E.nPad;
      const yOut = filler ? SPAR.yTail : SPAR.yWeb, yI = SPAR.yIn(j0), len = yOut - (yI + SPAR.yIn(j1)) / 2;
      const dMid = SPAR.depth.padBot - ((j0 - 1) + n / 2) * E.tB;   // in from the cap outer face (pad ply 1 is the deepest)
      add({ id: `S-H${nm}${sg < 0 ? 'L' : 'R'}${String(packs.findIndex((q) => q[0] === j0) + 1).padStart(2, '0')}`, mat: 'BID', angle: 45, region: 'pad', side, plies: n,
        span: sg < 0 ? [-yOut, -yI] : [yI, yOut], depth: dMid, w: SPAR.b, area: len * SPAR.b * inch, hard: { j0, j1, filler },
        note: `${filler ? 'Filler block' : 'Pad under the clevis tail'}, ${j1 > j0 ? `plies ${j0}–${j1}` : `ply ${j0}`} of ${SPAR.nHP}, 0/90 and ±45 alternating; inboard ends step 0.1 in per ply from BL ${(yI * 12).toFixed(1)}`, step,
        flat: { kind: 'strip', L: len * 12, w0: SPAR.b, w1: SPAR.b } });
    }
    const C = side > 0 ? { n: S.N, ends: S.ends, starts: [] } : { n: S.lower.NL, ends: S.lower.ends, starts: S.lower.starts }, nTot = C.n + C.starts.length;
    let k = 0;
    for (let j = 0; j < C.n; j++) {
      k += 1; const drop = j < C.ends.length, len = drop ? C.ends[j] : SPAR.yWeb;
      add({ id: `S-${nm}C${String(k).padStart(2, '0')}`, mat: 'UNI', angle: 0, region: 'cap', side, span: [-len, len], capIndex: k - 1, capCount: nTot, area: 2 * len * CS.cap * inch,
        note: drop ? `Cap, drops at BL ±${(len * 12).toFixed(1)} (moment)` : `Cap, full length to the clevis web faces (BL ±${(len * 12).toFixed(1)})`, step: step + 1,
        flat: { kind: 'strip', L: 2 * len * 12, w0: CS.cap, w1: CS.cap } });
    }
    for (const s0 of C.starts) for (const sg of [-1, 1]) {   // lower build-ups: one each end, clevis web face inboard to s0
      k += sg > 0 ? 0 : 1; const len = SPAR.yWeb - s0;
      add({ id: `S-${nm}B${String(k - C.n).padStart(2, '0')}${sg < 0 ? 'L' : 'R'}`, mat: 'UNI', angle: 0, region: 'cap', side, span: sg < 0 ? [-SPAR.yWeb, -s0] : [s0, SPAR.yWeb], capIndex: k - 1, capCount: nTot, area: len * CS.cap * inch,
        note: `Cap build-up for the end joint, clevis web face to BL ${sg < 0 ? '−' : '+'}${(s0 * 12).toFixed(1)} (the end needs ${S.lower.nEnd} plies over the clevis tail)`, step: step + 1,
        flat: { kind: 'strip', L: len * 12, w0: CS.cap, w1: CS.cap } });
    }
  }
  for (const p of keep.filter((q) => q.region === 'skin' || q.iface)) plies.push({ ...p, step: 7 });
  plies.forEach((p, i) => { p.seq = i + 1; });
  b.plies = plies;
  b.blurb = 'Box beam through the fuselage behind the rear seat. Takes both wing root moments plus the strake lift; the clevis blocks are built into its ends, where the cap splits around each clevis tail over a 6781 hard point.';
  { // core: the interior inside the wrap and webs, less caps, hard points and the four clevis pockets (in³ → ft³)
    const tw = E.wrap * E.tB, Hin = SPAR.h - 2 * tw, wIn = SPAR.width - 2 * tw - 2 * Z.csWeb * E.tB, sum = (a) => a.reduce((x, y) => x + y, 0);
    const capV = CS.cap * E.tU * (sum(S.ends.map((e) => 2 * e * 12)) + S.nEnd * 2 * SPAR.yWeb * 12) / 2
      + CS.cap * E.tU * (sum(S.lower.ends.map((e) => 2 * e * 12)) + (S.lower.NL - S.lower.ends.length) * 2 * SPAR.yWeb * 12 + sum(S.lower.starts.map((s0) => 2 * (SPAR.yWeb - s0) * 12))) / 2;   // mean of the two caps (the core loses both)
    const hpV = CS.cap * E.tB * sum(Array.from({ length: SPAR.nHP }, (_, i) => ((i < E.nPad ? SPAR.yWeb : SPAR.yTail) - SPAR.yIn(i + 1)) * 12));
    const pocket = CLV.W * (CLV.H * (CLV.u1 - CLV.uWeb) + CLV.tail * (CLV.uWeb - CLV.u0));
    const v = (2 * CS.halfSpan * 12 * wIn * Hin - 2 * capV - 4 * hpV - 4 * pocket) / 1728;
    b.core = { ...b.core, volume: v, weight: v * BASE_MAT.PVC.rho * 62.43, note: 'Divinycell HT61 blocks, bonded; pocketed for the hard points and clevis blocks' };
  }
  // build animation: plies go on one at a time; the clevis blocks are floxed in between pad and filler; the through-bolts
  // go in after cure; the layup jig stays put while the spar is turned on it
  b.seqMode = 'ply';
  b.jig = { L: 2 * CS.halfSpan + 0.6, w: 1.1, t: 0.06, gap: 0.004 };
  { const props = [], by = (sg, y) => sg * y, firstFill = (side, sg) => plies.find((q) => q.region === 'pad' && q.side === side && Math.sign(q.span[0] + q.span[1]) === sg && q.hard.filler);
    for (const [side, pin, step] of [[-1, ATTACH.pinL, 3], [1, ATTACH.pinU, 5]]) for (const sg of [-1, 1]) {
      const y = (u) => LUG.yPin + u / 12, z = pin[2], W = CLV.W / 12, tT = CLV.tT / 12, off = (CLV.slot + CLV.tT) / 24, c = 0x9aa4ae;
      props.push({ id: `clevis-${side < 0 ? 'lo' : 'up'}-${sg < 0 ? 'L' : 'R'}`, name: `Clevis block LEZ-57-143, ${side < 0 ? 'lower' : 'upper'} ${sg < 0 ? 'left' : 'right'}, floxed onto the pad`, step, seq: firstFill(side, sg).seq - 0.5, dir: [0, 0, side], travel: 1.0,
        geo: [...[-1, 1].map((k) => ({ t: 'box', c: [CS.s, by(sg, (y(CLV.u1) + y(CLV.uSlot)) / 2), z + k * off], d: [W, (CLV.u1 - CLV.uSlot) / 12, tT], colour: c })),
          { t: 'box', c: [CS.s, by(sg, (y(CLV.uSlot) + y(CLV.uWeb)) / 2), z], d: [W, CLV.web / 12, CLV.H / 12], colour: c },
          { t: 'box', c: [CS.s, by(sg, (y(CLV.uWeb) + y(CLV.u0)) / 2), z], d: [W, (CLV.uWeb - CLV.u0) / 12, CLV.tail / 12], colour: c }] });
    }
    const last = Math.max(...plies.map((q) => q.seq)), zL = CS_FIT.L, zU = CS_FIT.U, x0 = CS.s - CS.width / 2 - 0.04, x1 = CS.s + CS.width / 2 + 0.06;
    props.push({ id: 'bolts-clevis', name: `${2 * CLV.bolts.length} AN8 through-bolts on crush tubes, through both clevis tails`, step: 7, seq: last + 1, dir: [0, 0, 1], travel: 0.8,
      geo: [-1, 1].flatMap((sg) => SPAR.boltsY.map((y) => ({ t: 'cyl', a: [CS.s, sg * y, zL - 0.03], b: [CS.s, sg * y, zU + 0.03], r: CLV.dB / 24 }))) });
    for (const [k, h] of HARD.entries()) props.push({ id: `bolts-${h.id}`, name: `${2 * h.n} AN${h.an} through-bolts, ${h.name.toLowerCase()} (${h.part})`, step: 7, seq: last + 2 + k, dir: [1, 0, 0], travel: 0.8,
      geo: [-1, 1].flatMap((sg) => h.cols.flatMap((c) => h.zIn.map((zi) => { const z = zL + zi / 12, y = sg * (h.y + c / 12); return { t: 'cyl', a: [x0, y, z], b: [x1, y, z], r: h.d / 24 }; }))) });
    b.buildProps = props;
  }
  b.hard = { nPad: E.nPad, nFill: E.nFill, Lov: E.Lov, ramp: E.ramp, yTail: SPAR.yTail, yWeb: SPAR.yWeb, depth: SPAR.depth };
  b.steps = [
    { step: 1, title: 'Bond HT61 core blocks on the jig board; machine the hard-point pockets and the cap drop-off steps from the templates', inspect: ['Straight within 1/32 in over the length', 'Pocket floors step 0.1 in per ply (1:10)'] },
    { step: 2, title: 'Shear webs, front and aft', inspect: ['Ply count, debulk'] },
    { step: 3, title: 'Lower hard points: pad plies, shortest first; flox the lower clevis tails onto the pads, located on the jig end-plate pins; filler block', inspect: ['Ply count tally per pack', 'Clevis pin holes on the end-plate pins'] },
    { step: 4, title: 'Lower cap (shortest first)', inspect: ['Ply count tally', 'Stagger ≥ 1 in at the drop-offs'] },
    { step: 5, title: 'Turn the jig; upper hard points and clevis tails as step 3', inspect: ['Ply count tally per pack', 'Clevis pin holes on the end-plate pins'] },
    { step: 6, title: 'Upper cap', inspect: ['Ply count tally'] },
    { step: 7, title: 'Overall wrap; bag and cure (M cycle); drill the through-bolt holes, fit the crush tubes and bolts', inspect: [PROCESS.postCure, 'Fitting holes drilled through end-plate guides', 'Weigh: within ±5 % of predicted'] },
  ];
  b.tool.items = [...new Set([...b.tool.items, 'Core templates: hard-point pockets and drop-off steps', 'Through-bolt drill guides (end plates)'])];
});
