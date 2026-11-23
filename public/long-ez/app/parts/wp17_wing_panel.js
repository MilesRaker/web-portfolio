// WP17 — outer wing panel LEZ-57-110: the root joint and the panel's build.
//  • Root: the LWA plates (LEZ-57-142) take the place of the CS spar's clevis tails. Each wing cap splits around its plate:
//    the plies that fit run over it (WING_END in wp13), a quasi-isotropic BID pad lies under it, and the upper cap's other
//    plies run on under the pad. Three AN8 through-bolts per plate put the plate in double shear. Checks here: bearing,
//    shear-out toward the root face, net section at the outboard bolt, pad-to-cap transfer, and the cap where the plies
//    under the pad climb back out of the joint.
//  • Book: the pad replaces the old attach doublers; the panel is laid ply by ply (seqMode 'ply') with the LWA plates going
//    in between the pad and the cap plies over them.
// Every load is FAR 23 limit × FS, × 1.15 fitting factor at the joint. Notional: public data and this model's analysis.
import { GEO, FT, registerChecks, mk, surfaceLoads, capAllowable, FIXED, psi, laminate, plyRF, MATSYS, allowB, surfaceGeom, wingSec, BASE_MAT, DEFAULT_DESIGN, size, effective, scoped } from '../structures.js';
import { FRAMES, afAt } from '../plybook.js';
const r4 = (x) => Math.round(x * 1e4) / 1e4;
import { registerBookExtras, plyWeight } from '../plybook.js';
import { WING_END, LWA, LUG, ATTACH, ATT, rootLoads, fittingForces, chordIn, PLY_STEP } from './wp13_airframe_joints.js';
import { cutsVol, cutParams } from './cuts.js';
/** cuts in the panel's core (rev C: block C's tunnels, bays and the aileron cove-end relief), right panel; see cuts.js */
export const WCUTS = [];

const FF = 1.15, IN_ = (n, v, u, s = 'DERIVED') => [n, v, u, s], AN8_SHEAR = 14700;
const Y0 = GEO.wing.attachY;
export const COSL = Math.cos(surfaceGeom('wing').sweep);   // ply lengths run along the swept spar; spans are given in BL
/** joint geometry along the span (in from the wing root face): plate end, pad end (plate end + 1:10 ramp) */
export const WROOT = (() => {
  const plateEnd = LWA.u1 - LWA.uRoot, side = (J) => ({ J, padEnd: plateEnd + J.ramp * J.tPad, depth0: J.tTop - J.wrap * J.tB + 2 * J.flox + J.tail });
  return { plateEnd, upper: side(WING_END.upper), lower: side(WING_END.lower), bolts: LWA.bolts.map((u) => u - LWA.uRoot) };
})();

registerChecks('wp17-wingroot', (d, lc, Z, M) => {
  const R = rootLoads(d, lc); if (!R) return [];
  const f = fittingForces(R), FSf = d.FS * FF, P = f.pin * FSf, out = [];
  const sides = ['upper', 'lower'].map((k) => ({ k, J: WING_END[k], G: WROOT[k] }));
  const cin = (J, a) => chordIn(R, a / J.share, FSf), shareB = (J, a) => IN_('First-bolt share of the pin load', J.share, '', `BOUND: MS stays ≥ 0 up to ${(a / P).toFixed(2)}`);
  const lamTxt = (J) => `${J.nTop} × HTS40 + ${J.wrap} × 6781 skin over the plate, ${J.nPad} × 6781 pad (0/90, ±45)${J.nUnder ? `, ${J.nUnder} × HTS40 under the pad` : ''}: ${J.tTot.toFixed(3)} in`;
  // 1. bearing on the whole stack at the bolt nearest the root face
  { let w = null; for (const s of sides) { const Pb = s.J.share * P, brg = s.J.Fbru * s.J.D * s.J.tTot, bolt = 2 * AN8_SHEAR, a = Math.min(brg, bolt), ms = a / Pb - 1; if (!w || ms < w.ms) w = { ...s, Pb, brg, bolt, a, ms }; }
    out.push(mk('wing', 'wing-end-brg', 'Wing root: laminate bearing at the LWA-plate through-bolts (double shear)', lc, `${w.k} cap, BL 45 to 52`, w.brg <= w.bolt ? 'laminate bearing, whole stack' : 'AN8 double shear', w.ms, {
      formula: 'P_b = share·FS·1.15·pin;  σ_br = P_b / (D·t_stack)', inputs: [IN_('Pin resultant (limit)', f.pin, 'lb', 'DERIVED'), shareB(w.J, w.a), IN_('Bolts', `3 × AN8 (${w.J.D} in), double shear ${2 * AN8_SHEAR} lb`, 'text', 'AN standard'),
        IN_('Laminate at the bolts', lamTxt(w.J), 'text', 'SIZED'), IN_('Bearing allowable', w.J.Fbru, 'psi', allowB(w.brg / w.Pb - 1, 'compressive strength (bearing not published)')), IN_('Fitting factor', FF, '', 'FAR 23.625'), cin(w.J, w.a)],
      result: [['Bolt load (ult. × 1.15)', w.Pb, 'lb'], ['σ bearing', w.Pb / (w.J.D * w.J.tTot), 'psi']] }));
  }
  // 2. shear-out toward the root face (the cap pulls outboard, the plate holds the bolt)
  { let w = null; for (const s of sides) { const Pb = s.J.share * P, so = s.J.shearOut(WING_END.bolt1); if (!w || so.rf < w.so.rf) w = { ...s, Pb, so }; }
    out.push(mk('wing', 'wing-end-shearout', 'Wing root: shear-out between the first bolt and the root face', lc, `${w.k} cap, BL 45 to 48`, w.so.mode, w.so.rf - 1, {
      formula: 'each laminate takes P_b in proportion to its thickness;  N_xy = P / (2·(e − D/2)) on two planes;  first-ply failure (CLT)',
      inputs: [IN_('Bolt 1 to the root face e', WING_END.bolt1, 'in', 'SIZED'), IN_('Bolt D', w.J.D, 'in', 'AN standard'), IN_('Laminate', lamTxt(w.J), 'text', 'SIZED'), shareB(w.J, w.Pb * w.so.rf),
        IN_('Ply strengths', `NCAMP MTM45-1 in-plane shear (5 % strain), ETW 200 °F, × ${MATSYS.kB}`, 'text', allowB(w.so.rf - 1)), cin(w.J, w.Pb * w.so.rf)],
      result: [['Bolt load (ult. × 1.15)', w.Pb, 'lb'], ['Reserve factor', w.so.rf, '']] }));
  }
  // 3. net section at the outboard bolt, where the whole load is in the laminate; shared by axial stiffness
  { let w = null;
    for (const s of sides) { const lams = s.J.lams.map(([nm, lam]) => ({ nm, lam, L: laminate(lam, M), w: nm === 'pad' ? WING_END.bPad : WING_END.b })), EA = lams.reduce((a, x) => a + x.L.Ex * x.L.h * x.w, 0), wN = WING_END.b - s.J.D;
      let r = null; for (const x of lams) { const q = plyRF(x.lam, [P * (x.L.Ex * x.L.h * x.w / EA) / ((x.w - s.J.D) * s.J.Kh), 0, 0], M, { matrixAt: d.FS }); if (!r || q.rf < r.rf) r = { ...q, nm: x.nm }; }
      if (!w || r.rf < w.r.rf) w = { ...s, r, wN }; }
    out.push(mk('wing', 'wing-end-net', 'Wing root: cap, pad and under-plies net section at the outboard bolt', lc, `${w.k} cap, BL 52`, `${w.r.nm}: ${w.r.mode}`, w.r.rf - 1, {
      formula: 'N_x = P·(E·h·w share) / ((w − D)·K_h) on each laminate (cap and under-plies w = b, pad w = b + 2 in);  CLT ply by ply: fibre modes at ultimate, matrix modes (in-plane shear, HTS40 transverse) at limit (N / FS)',
      inputs: [IN_('Pin resultant (limit)', f.pin, 'lb', 'DERIVED'), IN_('Cap width b / pad width', `${WING_END.b} / ${WING_END.bPad}`, 'in', 'GEOMETRY'), IN_('Filled-hole factor K_h', w.J.Kh, '', `BOUND: MS stays ≥ 0 down to ${(w.J.Kh / w.r.rf).toFixed(2)}`), IN_('Ply strengths', 'HTS40 fibre (MSU) and 6781 (MTM45-1) typical', 'text', allowB(w.r.rf - 1)), IN_('Fitting factor', FF, '', 'FAR 23.625'), cin(w.J, P * w.r.rf * w.J.share)],
      result: [['Load (ult. × 1.15)', P, 'lb'], ['Reserve factor', w.r.rf, '']] }));
  }
  // 4. pad into the cap: the pad's share shears out through the cap over the full-depth overlap
  { let w = null; for (const s of sides) { const Fp = P * s.J.tPad / s.J.tTot, tau = Fp / (WING_END.b * s.J.Lov), ils = psi(M.UNI.ILSS), ms = ils / tau - 1; if (!w || ms < w.ms) w = { ...s, Fp, tau, ils, ms }; }
    out.push(mk('wing', 'wing-pad-lap', 'Wing root: pad into the cap (interlaminar shear outboard of the plate)', lc, `${w.k} cap`, 'interlaminar shear', w.ms, {
      formula: 'F_pad = P·t_pad / t_stack;  τ = F_pad / (b·L_ov), ramp plies beyond L_ov not counted',
      inputs: [IN_('Pin resultant (limit)', f.pin, 'lb', 'DERIVED'), IN_('Full-depth overlap L_ov', w.J.Lov, 'in', 'SIZED'), IN_('Width b', WING_END.b, 'in', 'GEOMETRY'), IN_('Interlaminar shear allowable', w.ils, 'psi', allowB(w.ms, 'interlaminar shear strength')), IN_('Fitting factor', FF, '', 'FAR 23.625'), cin(w.J, w.Fp * (w.ils / w.tau) / (w.J.tPad / w.J.tTot))],
      result: [['Pad load (ult. × 1.15)', w.Fp, 'lb'], ['τ', w.tau, 'psi']] }));
  }
  // 5. the cap outboard of the joint, where the upper cap's under-plies are still deeper (until they climb the pad ramp)
  { const L = surfaceLoads('wing', d, lc); if (L) { const sz = Z.wing, gm = sz.gm, CC = gm.capCore || gm.core, CA = { comp: capAllowable(M, FIXED.skinBID, CC, true), tens: capAllowable(M, FIXED.skinBID, CC, false) };
    let w = null;
    for (const s of sides) {
      const y = Y0 + s.G.padEnd / 12, r = L.at(y), sec = gm.sec(y), n = (side) => sz[side].filter((p) => p.y0 <= y && p.y1 > y).length;
      const nu = n('upper'), nl = n('lower'), dd = sec.h - (nu + nl) * M.UNI.t, drop = (s.J.nUnder / Math.max(1, s.k === 'upper' ? nu : nl)) * (s.J.tail + 2 * s.J.flox + s.J.tPad);
      const de = dd - drop, Mu = Math.abs(r.M) * d.FS, pos = r.M >= 0, comp = (s.k === 'upper') === pos, nc = s.k === 'upper' ? nu : nl;
      const sig = Mu / (de * nc * M.UNI.t * sec.b), allow = comp ? CA.comp.allow : CA.tens.allow, ms = allow / sig - 1;
      if (!w || ms < w.ms) w = { ...s, y, ms, sig, allow, de, drop, nc, comp };
    }
    out.push(mk('wing', 'wing-end-cap', 'Wing root: cap where the under-plies leave the joint (reduced lever arm)', lc, `${w.k} cap, BL ${(w.y * 12).toFixed(1)}`, w.comp ? 'cap compression' : 'cap tension', w.ms, {
      formula: 'd_eff = h − (n_u + n_l)·t − (n_under/n)·(t_plate + 2·flox + t_pad);  σ = FS·M / (d_eff·n·t·b)',
      inputs: [IN_('Station (pad end)', w.y * 12, 'in', 'GEOMETRY'), IN_('Lever-arm loss from the under-plies', w.drop, 'in', 'GEOMETRY'), IN_('Plies in the cap there', w.nc, '', 'SIZED'), IN_('Allowable', w.allow, 'psi', allowB(w.ms, w.comp ? 'compressive strength / Hoff wrinkling' : 'tensile strength'))],
      result: [['d_eff', w.de, 'in'], ['σ (ult.)', w.sig, 'psi']] }));
  } }
  return out;
});

// ------------------------------------------------------------------------------------------- panel geometry (the solid's sections)
const F = FRAMES.wing, Y1 = GEO.wing.tipY, GM = surfaceGeom('wing');
const tU = BASE_MAT.UNI.t, tB_ = BASE_MAT.BID.t, tS = FIXED.skinBID * tB_, EPS = 1e-3;
export const W_BLK = 1.0;
/** H45 cap bed (rev G): a PVC strip the cap's width under each cap stack, so the skin over the caps wrinkles on H45 (the
 *  caps' compression allowable), not on the Styrofoam, whose published minimum shear modulus is 400 psi (Panel Core 30).
 *  Depth: the wrinkle decay depth z ≈ 0.91·t_f·(E_f·E_c/G_c²)^⅓ (Allen) for the 2-BID skin on H45 minimums is about
 *  0.31 in; 0.50 in (DESIGN) covers it. The full-depth spar block sits between the two beds. */
export const W_BED = 0.5;
export const WRHO = { UNI: plyWeight('UNI', 1, 1) / 144 / tU, BID: plyWeight('BID', 1, 1) / 144 / tB_, PVC: BASE_MAT.PVC.rho * 62.43 / 1728, XPS: BASE_MAT.XPS.rho * 62.43 / 1728 };
let ZW = null; export const sized = () => (ZW ||= size(effective(DEFAULT_DESIGN)).wing);
export const caps = (side) => sized()[side].map((p) => p.y1).sort((a, b) => a - b);
const nOn = (side, ya, yb) => sized()[side].filter((p) => p.y0 <= ya + 1e-9 && p.y1 >= yb - 1e-9).length;
const xeAt = (ya, yb) => { const [a, b] = GEO.wing.aileron, m = (ya + yb) / 2; return m > a && m < b ? 1 - GEO.wing.aileronCf : 1; };
const sideJ = (side) => ({ J: WING_END[side], plateEnd: WROOT.plateEnd, fillEnd: WROOT.plateEnd + WING_END[side].nFill * PLY_STEP, padEnd: WROOT.plateEnd + WING_END[side].nPad * PLY_STEP });

/** span stations (ft BL) */
export function wingStations() {
  const brk = [Y0, Y1, ...GEO.wing.aileron, ...caps('upper'), ...caps('lower')];
  for (const k of ['upper', 'lower']) { const s = sideJ(k); brk.push(Y0 + s.plateEnd / 12, Y0 + s.fillEnd / 12, Y0 + s.padEnd / 12); }
  const st = [...new Set(brk.filter((y) => y >= Y0 - 1e-9 && y <= Y1 + 1e-9).map((y) => +y.toFixed(5)))].sort((a, b) => a - b);
  const out = [st[0]];
  for (let i = 1; i < st.length; i++) { const a = out.at(-1), b = st[i]; if ((b - a) * 12 < 0.05) continue; const k = Math.ceil((b - a) * 12 / 6); for (let j = 1; j <= k; j++) out.push(+(a + (b - a) * j / k).toFixed(5)); }
  return out;
}
/** stack depths (in, from the core surface inward) on one side at span distance u (in from the root face) */
export function stackAt(k, u, n) {
  const S = sideJ(k), J = S.J, nO = Math.min(n, J.nTop), nUd = Math.max(0, n - J.nTop), tF = J.nFill * tB_;
  const g = u <= S.plateEnd + 1e-9 ? J.tail + 2 * J.flox : u < S.fillEnd ? tF * (S.fillEnd - u) / (S.fillEnd - S.plateEnd) : 0;
  const p = u <= S.plateEnd + 1e-9 ? J.tPad : u < S.padEnd ? J.tPad * (S.padEnd - u) / (S.padEnd - S.plateEnd) : 0;
  const pocket = u <= S.plateEnd + 1e-9;
  const over = nO * tU, under = nUd * tU;
  return { over, g, p, under, pocket, D: over + g + p + under };
}
/** the region polygons of one section, for a segment's own ply counts and aileron cut; points [FS, WL] in inches */
export function section(y, seg) {
  const s = wingSec(y), c = s.c, X = (x) => (s.le + x * c) * 12, Zs = (x, side) => { const a = afAt(F, y, x); return (s.z + (side > 0 ? a.yu : a.yl) * c) * 12; };
  const N = 36, xe = seg.xe, cosx = (i) => xe * (1 - Math.cos(Math.PI * i / N)) / 2;
  const oml = [];
  for (let i = N; i >= 0; i--) oml.push([X(cosx(i)), Zs(cosx(i), 1)]);
  for (let i = 1; i <= N; i++) { const q = [X(cosx(i)), Zs(cosx(i), -1)]; if (i === N && Math.abs(q[1] - oml[0][1]) < 1e-6) break; oml.push(q); }
  const xsp = GM.sec(y).xsp, b = GM.sec(y).b, u = (y - Y0) * 12, R = {};
  const band = (side, w, d0, d1) => { const h = w / COSL / 2 / 12 / c, xa = xsp - h, xb = xsp + h, cs = (x) => Zs(x, side) - side * tS;
    if (d1 - d0 < EPS) d1 = d0 + EPS; return [[X(xa), cs(xa) - side * d0], [X(xb), cs(xb) - side * d0], [X(xb), cs(xb) - side * d1], [X(xa), cs(xa) - side * d1]]; };
  const st = {};
  for (const [k, side] of [['upper', 1], ['lower', -1]]) {
    const q = stackAt(k, u, seg.n[k]); st[k] = q;
    R[`cap_${k}`] = band(side, b, 0, seg.under[k] ? q.over : q.over + q.under);
    if (seg.under[k]) R[`under_${k}`] = band(side, b, q.over + q.g + q.p, q.D);
    if (seg.pad[k]) R[`pad_${k}`] = band(side, WING_END.bPad, q.over + q.g, q.over + q.g + q.p);
    if (seg.fill[k]) R[`fill_${k}`] = band(side, b, q.over, q.over + q.g);
    if (seg.pocket[k]) R[`pocket_${k}`] = band(side, b, q.over, q.over + q.g);
    R[`bed_${k}`] = band(side, b, q.D, q.D + W_BED);
  }
  { const h = W_BLK / COSL / 2 / 12 / c, xa = xsp - h, xb = xsp + h, up = (x) => Zs(x, 1) - tS - st.upper.D - W_BED, lo = (x) => Zs(x, -1) + tS + st.lower.D + W_BED;
    R.block = [[X(xa), up(xa)], [X(xb), up(xb)], [X(xb), lo(xb)], [X(xa), lo(xa)]]; }
  R.oml = oml;
  return R;
}
const area = (pts) => Math.abs(pts.reduce((a, p, i) => { const q = pts[(i + 1) % pts.length]; return a + p[0] * q[1] - q[0] * p[1]; }, 0)) / 2;
/** segments with their region polygons at both ends */
export function wingSegments() { return scoped('wingSegments', wingSegmentsNow); }   // shared within a memo scope (release audits; perf)
function wingSegmentsNow() {
  const st = wingStations(), segs = [];
  for (let i = 0; i < st.length - 1; i++) {
    const ya = st[i], yb = st[i + 1], ua = (ya - Y0) * 12, ub = (yb - Y0) * 12, seg = { ya, yb, xe: xeAt(ya, yb), n: {}, under: {}, pad: {}, fill: {}, pocket: {} };
    for (const k of ['upper', 'lower']) {
      const S = sideJ(k); seg.n[k] = nOn(k, ya, yb);
      const um = (ua + ub) / 2;   // flags from the segment's middle: stations sit on the breaks to within rounding
      seg.under[k] = seg.n[k] > S.J.nTop && um < Math.max(S.padEnd, S.fillEnd) ? 1 : 0;   // the under-plies stay a separate band until pad and filler have both run out
      seg.pad[k] = um < S.padEnd ? 1 : 0; seg.fill[k] = um > S.plateEnd && um < S.fillEnd ? 1 : 0; seg.pocket[k] = um < S.plateEnd ? 1 : 0;
    }
    const A = section(ya, seg), B = section(yb, seg);
    seg.regions = Object.fromEntries(Object.keys(A).map((key) => [key, [A[key], B[key]]]));
    segs.push(seg);
  }
  return segs;
}
/** region volumes (in³), by ruled-loft Simpson on the end sections */
export function wingVolumes(segs) {
  const whole = !segs; segs ||= wingSegments();
  const V = { OML: 0, UNI: 0, BID: 0, PVC: 0, pocket: 0 };
  const mat = (k) => (k === 'oml' ? 'OML' : k.startsWith('cap') || k.startsWith('under') ? 'UNI' : k.startsWith('pad') || k.startsWith('fill') ? 'BID' : k === 'block' || k.startsWith('bed') ? 'PVC' : 'pocket');
  for (const s of segs) {
    const L = (s.yb - s.ya) * 12;
    for (const [k, [a, b]] of Object.entries(s.regions)) {
      const m = a.map((p, i) => [(p[0] + b[i][0]) / 2, (p[1] + b[i][1]) / 2]);
      V[mat(k)] += L / 6 * (area(a) + 4 * area(m) + area(b));
    }
  }
  if (whole) V.OML -= cutsVol(WCUTS);
  return V;
}
/** the numbers the solid is built from */
export function wpParams() {
  const segs = wingSegments(), rr = (pts) => pts.map(([a, b]) => [r4(a), r4(b)]);
  return { segs: segs.map((s) => ({ ya: r4(s.ya * 12), yb: r4(s.yb * 12), regions: Object.fromEntries(Object.entries(s.regions).map(([k, [a, b]]) => [k, [rr(a), rr(b)]])) })), n: segs.length, ...(WCUTS.length ? { cuts: cutParams(WCUTS) } : {}) };
}
/** laminate outside the solid's regions (skins, webs, tip doubler): weight (lb) and volume (in³), from the ply list */
export function shellOf(plies) {
  const sel = plies.filter((p) => ['skin', 'web', 'doubler'].includes(p.region));
  return { lb: sel.reduce((a, p) => a + p.weight, 0), in3: sel.reduce((a, p) => a + p.area * 144 * (p.plies || 1) * BASE_MAT[p.mat].t, 0) };
}

// ------------------------------------------------------------------------------------------- ply book
const PACK = 10;
registerBookExtras('wing', (books, R) => {
  const b = books.wing; if (!b) return;
  const tB = WING_END.upper.tB, keep = b.plies.filter((p) => !/^W-[LU]D[12]$/.test(p.id));   // the old attach doublers give way to the root pad
  const bySide = (side, pred) => keep.filter((p) => p.side === side && pred(p));
  const plies = keep.filter((p) => p.region === 'web');
  const props = [];
  for (const side of [-1, 1]) {
    const k = side < 0 ? 'lower' : 'upper', J = WING_END[k], G = WROOT[k], nm = side < 0 ? 'L' : 'U';
    const caps = bySide(side, (p) => p.region === 'cap').sort((a, c) => a.capIndex - c.capIndex), capStep = caps[0] ? caps[0].step : (side < 0 ? 4 : 7);
    const under = caps.filter((p) => p.capIndex < caps.length - J.nTop), over = caps.filter((p) => p.capIndex >= caps.length - J.nTop);
    for (const p of under) { p.note = `${p.note}; runs under the root pad (BL ${(Y0 * 12).toFixed(0)} to ${((Y0 + G.padEnd / 12) * 12).toFixed(1)}) and climbs its ramp`; plies.push(p); }
    // pad: deepest (shortest) ply first; ply j = 1 lies against the plate, each deeper ply 0.1 in shorter (1:10 ramp)
    const packs = []; for (let j = J.nPad; j >= 1; j -= PACK) packs.push([Math.max(1, j - PACK + 1), j]);
    for (const [j0, j1] of packs) {
      const n = j1 - j0 + 1, jm = (j0 + j1) / 2;
      const yEnd = Y0 + (WROOT.plateEnd + (J.nPad - jm + 1) * PLY_STEP) / 12;
      plies.push({ id: `W-P${nm}${String(packs.findIndex((q) => q[0] === j0) + 1).padStart(2, '0')}`, mat: 'BID', angle: 45, region: 'pad', side, plies: n, span: [Y0, yEnd], chord: 'cap',
        depth: G.depth0 + (jm - 0.5) * tB, w: WING_END.bPad, area: (yEnd - Y0) / COSL * WING_END.bPad / 12, weight: plyWeight('BID', (yEnd - Y0) / COSL * WING_END.bPad / 12, n), step: capStep,
        note: `Root pad under the LWA plate, ${n > 1 ? `plies ${j0}–${j1}` : `ply ${j0}`} of ${J.nPad}, 0/90 and ±45 alternating; outboard ends step ${PLY_STEP} in per ply (1:10)`,
        flat: { kind: 'strip', L: (yEnd - Y0) * 12, w0: WING_END.bPad, w1: WING_END.bPad } });
    }
    // filler: fills the plate's depth outboard of its end, shortest (deepest) first, each ply 0.1 in longer (1:10)
    const fp = []; for (let k = 1; k <= J.nFill; k += PACK) fp.push([k, Math.min(J.nFill, k + PACK - 1)]);
    const fill = fp.map(([k0, k1], i) => { const n = k1 - k0 + 1, km = (k0 + k1) / 2, y1 = Y0 + (WROOT.plateEnd + k1 * PLY_STEP) / 12, yA = Y0 + WROOT.plateEnd / 12;
      return { id: `W-F${nm}${String(i + 1).padStart(2, '0')}`, mat: 'BID', angle: 45, region: 'pad', side, plies: n, span: [yA, y1], chord: 'cap', depth: J.nTop * J.tU + (J.nFill - km + 0.5) * tB, w: WING_END.b,
        area: km * PLY_STEP / 12 / COSL * WING_END.b / 12, weight: plyWeight('BID', km * PLY_STEP / 12 / COSL * WING_END.b / 12, n), step: capStep,
        note: `Filler outboard of the LWA plate end, ${n > 1 ? `plies ${k0}–${k1}` : `ply ${k0}`} of ${J.nFill}, 0/90 and ±45 alternating; ends step ${PLY_STEP} in per ply (1:10)`, flat: { kind: 'strip', L: (y1 - yA) * 12, w0: WING_END.b, w1: WING_END.b } }; });
    const plate = ATTACH[side < 0 ? 'pinL' : 'pinU'];
    props.push({ id: `lwa-${nm}`, name: `LWA plate LEZ-57-142 (${k}), floxed onto the pad`, step: capStep, after: `W-P${nm}`, dir: [0, 0, side],
      geo: [{ t: 'box', c: [plate[0], LUG.yPin + (LWA.u0 + LWA.u1) / 24, plate[2]], d: [LWA.W / 12, LWA.L / 12, LWA.t / 12], colour: 0xb7bec7 }] });
    for (const p of fill) plies.push(p);
    for (const p of over) plies.push(p);
    for (const p of bySide(side, (q) => q.region !== 'cap')) plies.push(p);
  }
  for (const p of keep.filter((q) => !q.side && q.region !== 'web')) plies.push(p);
  plies.forEach((p, i) => { p.seq = i + 1; });
  for (const pr of props) { const last = plies.filter((p) => p.id.startsWith(pr.after)).at(-1); pr.seq = (last ? last.seq : 0) + 0.5; }
  b.plies = plies; b.buildProps = props; b.seqMode = 'ply';
  { // core: the Styrofoam inside the skins less the caps, root joint and spar block (the record's solid regions); the PVC block rides with it
    const V = wingVolumes(), sh = shellOf(plies), xps = Math.max(0, V.OML - V.UNI - V.BID - V.PVC - V.pocket - sh.in3);
    b.core = { ...b.core, volume: xps / 1728, weight: xps * WRHO.XPS + V.PVC * WRHO.PVC, note: `HT61, CNC-milled in 3 blocks (${(xps / 1728).toFixed(2)} ft³); HT61 spar block ${V.PVC.toFixed(0)} in³ (weight included)` };
  }
  b.hard = `Root joint: ${WING_END.upper.nTop} / ${WING_END.lower.nTop} × HTS40 over the LWA plates (upper / lower), pads ${WING_END.upper.nPad} / ${WING_END.lower.nPad} × 6781, ${WING_END.upper.nUnder} upper-cap HTS40 under the pad; 3 × AN8 per plate, first bolt ${WING_END.bolt1.toFixed(2)} in from the root face`;
});
