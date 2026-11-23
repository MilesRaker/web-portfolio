// WPG3 — block G cowl group: LEZ-71-155 cowling (ply book 'cowl', 4 BID solid laminate), LEZ-71-120 cowl attachment
// (firewall-flange continuous hinges, split-line screws, wing-root seal), LEZ-71-230 baffles and seals (with the lower
// rear wall that carries the oil cooler) and LEZ-71-240 NACA cooling inlets. Definition frame in inches (x = BL,
// y = FS aft, z = WL up).
//  • The cowl runs from the firewall (FS 153.0) to the end of the OML table (FS 196.2, GEO.cowl.s1, ICD G-F8): one
//    trailing edge, the exit annulus round the spinner.
//  • NACA inlets (ICD G-F6): two submerged inlets on the lower cowl, one each side of the carb scoop, aft of the
//    hinge flange: they no longer straddle the firewall or run into the brackets, gascolator and fuel fitting.
//  • Checks: cowl panels under the plenum pressure (thin-laminate membrane, Δp bounded by the full ram pressure at VD),
//    the firewall hinge, the baffle panels, the cooling-inlet area (wp1's check with its assumed inputs bounded or set).
// Notional; public data only.
import { GEO, FUS_SHAPE, fusAt, registerChecks, mk, materials, effective, DEFAULT_DESIGN, psi, allowB } from '../structures.js';
import { buildPlyBook } from '../plybook.js';
import { sizing } from '../structures.js';
import { cylS, ENG } from './wp1_powerplant.js';
import { SCOOP } from './wp10_induction_gear.js';
import { layer } from './wp26_fuselage.js';
import { r4, enginePrims } from './wpG1_engine.js';
import { insideOML } from '../systems.js';

const IN = 12, FW = GEO.firewall * IN, sp = (v, e) => Math.sign(v) * Math.abs(v) ** e;
export const CWL = { plies: 4, tPly: 0.010, get t() { return this.plies * this.tPly; }, s0: GEO.cowl.s0, s1: GEO.cowl.s1 };
/** cowl stations (ft): the OML table rows and every 0.25 ft between */
export function cowlStations() {
  const brk = [CWL.s0, CWL.s1, ...GEO.fuselage.map((r) => r[0])].filter((s) => s >= CWL.s0 - 1e-9 && s <= CWL.s1 + 1e-9).sort((a, b) => a - b), out = [];
  for (let i = 0; i < brk.length - 1; i++) { if (brk[i + 1] - brk[i] < 1e-6) continue; const n = Math.max(1, Math.ceil((brk[i + 1] - brk[i]) / 0.25)); for (let k = 0; k < n; k++) out.push(brk[i] + (brk[i + 1] - brk[i]) * k / n); }
  out.push(CWL.s1); return out.map(r4);
}
/** cowl shell as loft primitives: each half of the ring per segment (closed ring: no cockpit opening aft of the firewall) */
export function cowlPrims() {
  const st = cowlStations(), o = [];
  for (let i = 0; i < st.length - 1; i++) for (const sg of [1, -1]) {
    const sec = (s) => layer(s, 0, -CWL.t, false, sg).map(([y, z]) => [r4(y), r4(s * IN), r4(z)]);
    o.push({ t: 'loft', feat: 'face', group: 'lam', secs: [sec(st[i]), sec(st[i + 1])] });
  }
  return o;
}
// the cowl's plies depend on the sizing alone (sizing(): no load-case evaluation at module load; perf)
let BK = null; export const cowlBook = () => (BK ||= buildPlyBook(sizing(DEFAULT_DESIGN)).cowl);
/** cured-laminate density from the ply book (lb/in³): ply weight over ply volume */
export function lamRho() { const b = cowlBook(); const w = b.plies.reduce((a, p) => a + p.weight * (p.qty || 1), 0), v = b.plies.reduce((a, p) => a + p.area * 144 * CWL.tPly * (p.qty || 1) * (p.plies || 1), 0); return w / v; }
/** inner-skin point of the cowl contour at station s (ft) and parameter t (rad), inches [BL, WL] */
export function contour(s, t, off = 0) {
  const f = fusAt(s), w = f.w / 2 * IN + off, h = (f.top - f.bot) / 2 * IN + off, zc = (f.top + f.bot) / 2 * IN, sn = Math.sin(t);
  return [w * sp(Math.cos(t), FUS_SHAPE.side), zc + h * sp(sn, sn < 0 ? FUS_SHAPE.belly : FUS_SHAPE.top)];
}
/** contour(s, t, off) at t = −π/2 + 2π·i/n, i = 0 … n−1: the same points, with the angle terms worked once per n and
 *  shape instead of per point (perf) */
const RING = new Map();
export function contourRing(s, n, off = 0) {
  const k = `${n}|${FUS_SHAPE.side}|${FUS_SHAPE.top}|${FUS_SHAPE.belly}`;
  let A = RING.get(k);
  if (!A) { A = []; for (let i = 0; i < n; i++) { const t = -Math.PI / 2 + 2 * Math.PI * i / n, sn = Math.sin(t); A.push([sp(Math.cos(t), FUS_SHAPE.side), sp(sn, sn < 0 ? FUS_SHAPE.belly : FUS_SHAPE.top)]); } RING.set(k, A); }
  const f = fusAt(s), w = f.w / 2 * IN + off, h = (f.top - f.bot) / 2 * IN + off, zc = (f.top + f.bot) / 2 * IN;
  return A.map(([cx, cz]) => [w * cx, zc + h * cz]);
}
/** OML bottom WL (in) at station s (ft) and BL y (in) */
export function zBelly(s, y) { const f = fusAt(s), w = f.w / 2 * IN, h = (f.top - f.bot) / 2 * IN, zc = (f.top + f.bot) / 2 * IN; return zc - h * Math.max(0, 1 - (Math.abs(y) / w) ** (2 / FUS_SHAPE.side)) ** (FUS_SHAPE.belly / 2); }
/** area (in²) inside the cowl's inner skin at station s */
export function innerArea(s) { const n = 180, p = Array.from({ length: n }, (_, i) => contour(s, -Math.PI / 2 + 2 * Math.PI * i / n, -CWL.t)); let a = 0; for (let i = 0; i < n; i++) { const [x1, y1] = p[i], [x2, y2] = p[(i + 1) % n]; a += x1 * y2 - x2 * y1; } return Math.abs(a) / 2; }

// ------------------------------------------------------------------------------------------- NACA inlets (LEZ-71-240)
export const NACA = (() => {
  const scoopEdge = Math.max(Math.abs(SCOOP.y - SCOOP.hw), Math.abs(SCOOP.y + SCOOP.hw)) * IN,   // the blister's outer edge on either side (rev B: off-centre)
    w1 = 5.0, c = r4(scoopEdge + 1.25 + w1 / 2);
  return { c, w0: 2.0, w1, x0: r4(FW + 1.75), x1: 141.5, d0: 0.3, d1: 4.1, t: 3 * 0.010, plies: 3 };
})();
export const nacaArea = () => 2 * NACA.w1 * NACA.d1;
export function nacaPrims() {
  const N = NACA, o = [];
  for (const sg of [1, -1]) {
    const c = sg * N.c, sec = (x, w, d, part) => { const zs = zBelly(x / IN, c), z = zs + d;
      if (part === 'floor') return [[c - w / 2, z], [c + w / 2, z], [c + w / 2, z + N.t], [c - w / 2, z + N.t]].map(([y, zz]) => [r4(y), r4(x), r4(zz)]);
      const e = c + part * w / 2; return [[e, zs], [e + part * N.t, zs], [e + part * N.t, z + N.t], [e, z + N.t]].map(([y, zz]) => [r4(y), r4(x), r4(zz)]); };
    for (const part of ['floor', -1, 1]) o.push({ t: 'loft', feat: part === 'floor' ? 'ramp' : 'walls', group: 'lam', secs: [sec(N.x0, N.w0, N.d0, part), sec(N.x1, N.w1, N.d1, part)] });
  }
  return o;
}

// ------------------------------------------------------------------------------------------- baffles (LEZ-71-230)
export const BAF = { engClr: 0.12, t: 0.032, seal: { t: 0.06, w: 1.5 }, flangePitch: 3.0, rearS: (cylS.LR - 0.35) * IN };
/** the baffle plates in the definition frame: the side walls along the seal line, the rear wall, the inter-cylinder
 *  deflectors (wp1's layout), the lower rear wall with the oil cooler's cut-out, and the seal strips on the side walls */
export function bafflePrims(cut) {
  const o = [], zSeal = 3.30, yIn = (s, z) => { let y = 0; while (insideAt(s, y + 0.01, z) && y < 2) y += 0.01; return y - 0.05; };
  const B = (feat, group, c, d) => o.push({ t: 'box', feat, group, c: c.map(r4), d: d.map(r4) });
  for (let s = cylS.LR - 0.35; s < cylS.RF + 0.35 - 1e-9; s += 0.25) for (const sg of [-1, 1]) {
    const y = Math.min(yIn(s, zSeal + 0.08), yIn(s + 0.25, zSeal + 0.08));
    // the wall's lower edge stops BAF.engClr above any engine feature it would cross (rocker covers, heads; ICD phase 2)
    const top = (zSeal - 0.10) * IN + 2.16, bot = Math.max((zSeal - 0.10) * IN - 2.16, wallFloor(sg * y * IN, (s + 0.125) * IN, top));
    B('side', 'al', [sg * y * IN, (s + 0.125) * IN, (top + bot) / 2], [BAF.t, 3.0, top - bot]);
    B('seal', 'rubber', [sg * (y * IN - BAF.t / 2 - BAF.seal.t / 2), (s + 0.125) * IN, (zSeal - 0.10) * IN + 2.16 - BAF.seal.w / 2 + 0.25], [BAF.seal.t, 3.0, BAF.seal.w]);   // on the wall's inboard face, 1/4 in proud of its edge
  }
  const yr = yIn(cylS.LR - 0.35, zSeal) * IN - 0.6;
  // rear wall: two pieces, crankcase side to the cowl side (one piece across would run through the crankcase; ICD phase 2)
  const yc = caseHalfAt(BAF.rearS) + BAF.engClr;
  for (const sg of [-1, 1]) B('rear', 'al', [sg * (yc + yr) / 2, BAF.rearS, (zSeal - 0.12) * IN], [yr - yc, BAF.t, 3.6]);
  // inter-cylinder deflectors, each bank between its own pair (the right bank is staggered 2.5 in aft of the left)
  for (const sg of [-1, 1]) for (const sc of sg < 0 ? [cylS.LR, cylS.LF] : [cylS.RR, cylS.RF]) B('deflector', 'al', [sg * 0.75 * IN, (sc + 0.30) * IN, (ENG.crankZ + 0.05) * IN], [4.2, BAF.t, 3.6]);
  // lower rear wall, right side, round the oil cooler's face (cut = { y0, y1, z0, z1 })
  const L = { y0: cut.y0 - 1.2, y1: cut.y1 + 1.2, z0: cut.z0 - 1.0, z1: (zSeal - 0.12) * IN - 1.8 };
  B('lowerwall', 'al', [(L.y0 + cut.y0) / 2, BAF.rearS, (L.z0 + L.z1) / 2], [cut.y0 - L.y0, BAF.t, L.z1 - L.z0]);
  B('lowerwall', 'al', [(cut.y1 + L.y1) / 2, BAF.rearS, (L.z0 + L.z1) / 2], [L.y1 - cut.y1, BAF.t, L.z1 - L.z0]);
  B('lowerwall', 'al', [(cut.y0 + cut.y1) / 2, BAF.rearS, (L.z0 + cut.z0) / 2], [cut.y1 - cut.y0, BAF.t, cut.z0 - L.z0]);
  B('lowerwall', 'al', [(cut.y0 + cut.y1) / 2, BAF.rearS, (cut.z1 + L.z1) / 2], [cut.y1 - cut.y0, BAF.t, L.z1 - cut.z1]);
  return o;
}
const insideAt = (s, y, z) => insideOML([s, y, z]);
/** engine-envelope clearance helpers for the baffles (definition frame, in) */
const ENGP = () => enginePrims().filter((p) => p.t === 'box' || p.t === 'cyl');
// distance from a point to an engine box or (capped) cylinder. The per-primitive terms (axis, length, unit axis) are
// worked once per primitive and the point terms without allocating: the same arithmetic as before (perf)
const pTerms = (g) => { if (g.t === 'box') return g; const ab = g.b.map((v, i) => v - g.a[i]), L = Math.hypot(...ab); return { t: g.t, a: g.a, r: g.r, L, e: ab.map((v) => v / L) }; };
const pDistT = (g, p) => { if (g.t === 'box') return Math.hypot(Math.max(Math.abs(p[0] - g.c[0]) - g.d[0] / 2, 0), Math.max(Math.abs(p[1] - g.c[1]) - g.d[1] / 2, 0), Math.max(Math.abs(p[2] - g.c[2]) - g.d[2] / 2, 0));
  const { a, e, L } = g, w0 = p[0] - a[0], w1 = p[1] - a[1], w2 = p[2] - a[2], ax = w0 * e[0] + w1 * e[1] + w2 * e[2];
  const rad = Math.hypot(w0 - e[0] * ax, w1 - e[1] * ax, w2 - e[2] * ax); return Math.hypot(Math.max(-ax, ax - L, 0), Math.max(rad - g.r, 0)); };
export const engClear = (pts) => { const E = ENGP().map(pTerms); let m = Infinity; for (const p of pts) for (const g of E) { const d = pDistT(g, p); if (d < m) m = d; } return m; };
/** axis-aligned bounds of an engine primitive (a cylinder's segment grown by its radius): a lower bound on pDist */
const pBox = (g) => (g.t === 'box' ? { lo: g.c.map((v, i) => v - g.d[i] / 2), hi: g.c.map((v, i) => v + g.d[i] / 2) } : { lo: g.a.map((v, i) => Math.min(v, g.b[i]) - g.r), hi: g.a.map((v, i) => Math.max(v, g.b[i]) + g.r) });
/** lowest WL at which a side-wall panel (BL x, centred at FS y, 3 in long) clears the engine by BAF.engClr up to its top.
 *  The test is engClear(panel points) ≥ BAF.engClr, decided without the full minimum: primitives whose bounds clear the
 *  panel's bounds by the rule are left out, and the first point inside the rule ends the test (perf; same answer) */
function wallFloor(x, y, top) {
  const ALL = ENGP(), E = ALL.map(pTerms), B = ALL.map(pBox);
  const clearFrom = (z0) => {
    const lo = [x, y - 1.5, Math.min(z0, top)], hi = [x, y - 1.5 + 3, Math.max(z0, top)];
    const near = E.filter((g, j) => Math.hypot(...[0, 1, 2].map((i) => Math.max(B[j].lo[i] - hi[i], 0, lo[i] - B[j].hi[i]))) < BAF.engClr + 1e-6);
    for (let i = 0; i <= 12; i++) for (let k = 0; k <= 16; k++) { const p = [x, y - 1.5 + 3 * i / 12, z0 + (top - z0) * k / 16]; for (const g of near) if (pDistT(g, p) < BAF.engClr) return false; }
    return true;
  };
  let z = top - 4.32; while (z < top - 1.0 && !clearFrom(z)) z += 0.05; return r4(z);
}
/** crankcase half-width at a station (in): the 'case' and 'acc' boxes */
const caseHalfAt = (fs) => Math.max(0, ...ENGP().filter((g) => g.t === 'box' && (g.feat === 'case' || g.feat === 'acc') && Math.abs(fs - g.c[1]) <= g.d[1] / 2).map((g) => g.d[0] / 2));

// ------------------------------------------------------------------------------------------- checks
const IN_ = (n, v, u, s = 'DERIVED') => [n, v, u, s];
const qVD = (d) => 0.5 * 0.002377 * (d.VD * 1.6878) ** 2 / 144;   // psi, VD in kt (DEFAULT_DESIGN), sea level: the most the ram can put into the plenum
export const HINGE = { pin: 0.090, leaf: 0.040, pitch: 1.0, Fbru2024: 147000 };
export function cowlLoads(d) {
  const p = qVD(d), FS = d.FS, s = 12.075, f = fusAt(s), span = f.w * IN, M = materials(effective(DEFAULT_DESIGN)), E = psi(M.BID.E1), Xt = psi(M.BID.Xt);
  const pu = FS * p, sig = Math.cbrt(E * pu * pu * span * span / (24 * CWL.t * CWL.t)), sag = pu * span * span / (8 * sig * CWL.t);   // strip, immovable edges, large deflection
  const A = (CWL.s1 - GEO.firewall) * IN * span, Lh = fusAt(GEO.firewall).w * IN * 1.4, wRun = FS * p * A / 2 / Lh, pinBrg = HINGE.pin * HINGE.leaf * HINGE.Fbru2024 / HINGE.pitch;
  return { p, pu, span, E, Xt, sig, sag, A, Lh, wRun, pinBrg, FS };
}
registerChecks('wpG3-cowl', (d, lc) => {
  if (lc.id !== 'W1-S1') return [];
  const c = cowlLoads(d), rows = [], vd = IN_('VD', d.VD, 'kt', 'DESIGN'), dp = IN_('Plenum Δp (full ram pressure at VD, sea level)', c.p, 'psi', 'DESIGN: upper bound (q at VD; an inlet recovers less)');
  const msP = c.Xt / c.sig - 1;
  rows.push(Object.assign(mk('cowl', 'cwl-press', 'Cowl panels under the plenum pressure (thin-laminate membrane)', lc, 'lower cowl, widest station', 'membrane tension', msP, {
    formula: 'strip of span L, edges held at the hinges and baffle seals:  σ³ = E·p²·L² / (24 t²);  sag f = p·L² / (8 σ t)', inputs: [vd, dp, IN_('Factor of safety', c.FS, '', 'FAR23'), IN_('Span (cowl width at FS 170)', c.span, 'in', 'GEOMETRY'), IN_('Laminate', `${CWL.plies} × 6781, ${CWL.t} in`, 'text', 'DESIGN'), IN_('E (6781)', c.E, 'psi', 'MATSYS'), IN_('Tension allowable (6781)', c.Xt, 'psi', allowB(msP, 'tensile strength'))],
    result: [['σ (ult.)', c.sig, 'psi'], ['Sag at ultimate', c.sag, 'in']] }), { sys: 'LEZ-71-155' }));
  rows.push(Object.assign(mk('cowl', 'cwa-hinge', 'Cowl-to-firewall continuous hinge under the plenum pressure at VD', lc, 'firewall flange', 'leaf bearing on the pin', c.pinBrg / c.wRun - 1, {
    formula: 'w = FS·Δp·A_upper / (2·L_hinge);  allow = d_pin·t_leaf·F_bru per knuckle', inputs: [vd, dp, IN_('Upper cowl area', c.A, 'in²', 'GEOMETRY'), IN_('Hinge length', c.Lh, 'in', 'GEOMETRY'), IN_('Pin / leaf', `${HINGE.pin} / ${HINGE.leaf} in, ${HINGE.pitch} in knuckles`, 'text', 'DESIGN (MS20257)'), IN_('2024-T3 F_bru (e/D 1.5)', HINGE.Fbru2024, 'psi', 'MMPDS (typed from the handbook table)')],
    result: [['Running load (ult.)', c.wRun, 'lb/in'], ['Allowable per in', c.pinBrg, 'lb/in']] }), { sys: 'LEZ-71-120' }));
  const sigB = 0.75 * c.pu * BAF.flangePitch ** 2 / BAF.t ** 2;
  rows.push(Object.assign(mk('cowl', 'baf-press', 'Baffle panels between their bent flanges under the plenum pressure', lc, 'side and rear walls', 'plate bending', 35000 / sigB - 1, {
    formula: 'long plate, edges simply supported:  σ = 0.75·p·b² / t²', inputs: [vd, dp, IN_('Flange pitch b', BAF.flangePitch, 'in', 'DESIGN'), IN_('Sheet t', BAF.t, 'in', 'DESIGN'), IN_('6061-T6 F_ty', 35000, 'psi', 'MMPDS 6061-T6 sheet')], result: [['σ (ult.)', sigB, 'psi']] }), { sys: 'LEZ-71-230' }));
  return rows;
});
// cooling inlet area: wp1's energy balance with its assumed inputs bounded or set as design values
export function cooling2(A = nacaArea()) {
  const P = 115, frac = 0.40, dT = 80, Vkt = 90, rho = 0.0705, eta = 0.65;
  const req = (f, e) => f * P * 42.41 / 60 / (0.24 * dT) / rho / (e * Vkt * 1.6878) * 144;
  const Areq = req(frac, eta), ms = A / Areq - 1;
  return { P, frac, dT, Vkt, rho, eta, A, Areq, ms, fracMax: frac * A / Areq, etaMin: eta * Areq / A };
}
registerChecks('wp1-cool', (d, lc) => {
  if (lc.id !== 'W1-S1') return [];
  const c = cooling2();
  return [Object.assign(mk('cowl', 'pwr-cool', 'Cooling-air inlet area, climb on a hot day', lc, 'two NACA inlets on the lower cowl', 'energy balance, inlet throat', c.ms, {
    formula: 'ṁ = f·P / (c_p ΔT);  A_req = ṁ / (ρ η V_climb);  MS = A_inlet / A_req − 1',
    inputs: [['Take-off power', c.P, 'hp', 'TCDS E-223'], ['Heat to cooling air', c.frac, '', `BOUND: typed from engine-installation rules of thumb; MS stays ≥ 0 up to ${c.fracMax.toFixed(2)}`], ['Allowed air temperature rise', c.dT, '°F', 'DESIGN'], ['Climb speed (cooling design point)', c.Vkt, 'kt', 'DESIGN'], ['Air density, 100 °F sea level', c.rho, 'lb/ft³', 'ISA+'],
      ['Inlet recovery η', c.eta, '', `BOUND: typed for a NACA submerged inlet; MS stays ≥ 0 down to ${c.etaMin.toFixed(2)}`], ['Inlet throat area (2 inlets)', c.A, 'in²', 'GEOMETRY: LEZ-71-240']],
    result: [['Required inlet area', c.Areq, 'in²']] }), { sys: 'LEZ-71-240' })];
});
