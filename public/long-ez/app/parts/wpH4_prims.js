// WPH4 — block H solids as primitives for cad/g_prims.py (boxes with holes, tubes), in the definition frame (aircraft,
// inches, in place), and the per-group densities each record's mass comes from. Runs are tubes swept segment by segment
// along their routes (wpH2_runs.js). Bought-in items are envelopes at the vendor's weight (typed from memory, marked).
// Notional.
import { tidy, groupVols } from '../defn/g_prims.js';
import { ptsOf, runPrims, T3, r4 } from './wpH0_route.js';
import * as LY from './wpH1_layout.js';
import { RUNS } from './wpH2_runs.js';

const box = (feat, group, c, d, holes) => ({ t: 'box', feat, group, c: T3(c), d: T3(d), ...(holes ? { holes } : {}) });
const cyl = (feat, group, a, b, r, ri) => ({ t: 'cyl', feat, group, a: T3(a), b: T3(b), r: r4(r), ...(ri ? { ri: r4(ri) } : {}) });
const runTubes = (pn, feat, group, idx) => RUNS[pn].filter((_, i) => !idx || idx.includes(i)).flatMap((r) => runPrims(ptsOf(r), r.od / 2, 0, typeof feat === 'function' ? feat(r) : feat, group));
const AL = 0.098, ST = 0.283;
/** effective density (lb/in³) that puts a typed weight per foot on a run's tube */
const perFt = (lbFt, od) => lbFt / (Math.PI * (od / 2) ** 2 * 12);
/** effective density for a typed item weight over closed-form envelope volumes */
export const effRho = (prims, group, lb) => lb / groupVols(prims)[group];
const P = (prims) => ({ frame: 'aircraft', prims: prims.map(tidy) });

// ------------------------------------------------------------------------------------------- LEZ-74-100 key switch and cabin harness
export const KEY_LB = { body: LY.KEYSW.lb, harnessLbFt: 2 * 0.016 + 0.0078 + 0.011 };   // switch (typed); 2 × M27500-18 + 20 + 18 AWG (wp7 table)
export function keyPrims() {
  const K = LY.KEYSW, [y, z] = K.c, f0 = K.face - K.panelT - K.seat, o = [];
  o.push(cyl('switch', 'switch', [y, f0 - K.body.L, z], [y, f0, z], K.body.d / 2));
  o.push(cyl('bushing', 'switch', [y, f0, z], [y, K.face + 0.12, z], K.bushing.d / 2));
  o.push(cyl('bushing', 'switch', [y, K.face, z], [y, K.face + 0.12, z], 0.55, K.bushing.d / 2));   // panel nut / bezel
  o.push(...runTubes('LEZ-74-100', 'harness', 'harness'));
  return o;
}
export const keyParams = () => P(keyPrims());
export const KEY_RHO = () => { const p = keyPrims(); return { switch: effRho(p, 'switch', KEY_LB.body), harness: perFt(KEY_LB.harnessLbFt, 0.25) }; };

// ------------------------------------------------------------------------------------------- LEZ-74-110 ignition harness, LEZ-74-120 plugs, LEZ-74-130 P-leads
export const LEAD_LBFT = 0.030;          // 5 mm shielded lead (ACS 12304-33 Slick-type harness); lb/ft BOUND (not published)
export const harnessParams = () => P(runTubes('LEZ-74-110', (r) => (r.top ? 'top' : 'bottom'), 'lead'));
export const HARNESS_RHO = { lead: perFt(LEAD_LBFT, 0.30) };
export function plugPrims() {
  const o = [], G = LY.PLUG;
  for (const k of ['LF', 'RF', 'LR', 'RR']) for (const top of [true, false]) { const { p, e } = LY.PLUG_AT(k, top), at = (s) => p.map((v, i) => v + e[i] * s);
    o.push(cyl('thread', 'plug', at(-G.reach), at(0), G.threadR), cyl('hex', 'plug', at(0), at(G.hexL), G.hex / 2), cyl('body', 'plug', at(G.hexL), at(G.hexL + G.bodyL), G.bodyR)); }
  return o;
}
export const plugParams = () => P(plugPrims());
export const PLUG_RHO = () => ({ plug: effRho(plugPrims(), 'plug', 8 * LY.PLUG.lb) });
export const PLEAD_LBFT = 2 * 0.016 * 0.5 + 0.004;   // each run carries one P-lead (0.016 lb/ft) + sleeve (typed)
export const pleadParams = () => P(runTubes('LEZ-74-130', (r) => (/left/.test(r.name) ? 'left' : 'right'), 'lead'));
export const PLEAD_RHO = { lead: perFt(0.020, LY.PLEAD.od) };

// ------------------------------------------------------------------------------------------- LEZ-76-100 throttle quadrant
export function quadPrims() {
  const Q = LY.QD, o = [], t = Q.plate.t, fs = Q.plate.fs, wl = Q.plate.wl, cF = (fs[0] + fs[1]) / 2, cW = (wl[0] + wl[1]) / 2, pv = Q.pivot;
  for (const pl of [Q.plateO, Q.plateI]) o.push(box('plates', 'al', [(pl[0] + pl[1]) / 2, cF, cW], [pl[1] - pl[0], fs[1] - fs[0], wl[1] - wl[0]], [{ ax: 0, u: pv[1], v: pv[2], r: 0.128 }]));
  const A = Q.aft; o.push(box('aft', 'al', [(A.bl[0] + A.bl[1]) / 2, (A.fs[0] + A.fs[1]) / 2, (A.wl[0] + A.wl[1]) / 2], [A.bl[1] - A.bl[0], A.fs[1] - A.fs[0], A.wl[1] - A.wl[0]],
    ['throttle', 'mixture'].map((k) => ({ ax: 1, u: LY.QHEAD[k][0], v: LY.QHEAD[k][2], r: 0.19 }))));
  const S = Q.shelf; o.push(box('shelf', 'al', [(S.bl[0] + S.bl[1]) / 2, (S.fs[0] + S.fs[1]) / 2, (S.wl[0] + S.wl[1]) / 2], [S.bl[1] - S.bl[0], S.fs[1] - S.fs[0], S.wl[1] - S.wl[0]],
    [-1, 1].map((sg) => ({ ax: 2, u: Q.s11[0], v: Q.s11[1] + sg * Q.s11Holes / 2, r: 0.0675 }))));   // 2 × 6-32 nutplate holes 0.90 apart under S11's bracket
  o.push(cyl('pivot', 'steel', [Q.plateO[0] - 0.05, pv[1], pv[2]], [Q.plateI[1] + 0.02, pv[1], pv[2]], Q.piv.d / 2));
  o.push(cyl('friction', 'knob', [Q.plateO[0] - 0.40, pv[1], pv[2]], [Q.plateO[0] - 0.05, pv[1], pv[2]], 0.40));   // knurled friction nut, outboard, inside the cut-out's BL range
  o.push(cyl('cam', 'al', [Q.cam.bl[0], pv[1], pv[2]], [Q.cam.bl[1], pv[1], pv[2]], Q.cam.r0));   // base circle; the lobe (r1) is cut on the idle sector
  for (const k of ['throttle', 'mixture']) { const L = Q[k], r = LY.LEVER[k], top = pv[2] + L.knob.r;
    o.push(box(k, 'al', [L.bl, pv[1], (pv[2] - r - 0.25 + top - 0.5) / 2], [L.t, 0.60, top - 0.5 - (pv[2] - r - 0.25)], [{ ax: 0, u: pv[1], v: pv[2], r: 0.128 }]));
    if (Math.abs(L.knob.bl - L.bl) > 0.05) o.push(box(k, 'al', [(L.bl + L.knob.bl) / 2, pv[1], top - 0.40], [Math.abs(L.knob.bl - L.bl) + L.t, 0.40, 0.25]));
    o.push(cyl('knobs', 'knob', [L.knob.bl, pv[1], top - L.knob.h / 2], [L.knob.bl, pv[1], top + L.knob.h / 2], L.knob.d / 2)); }
  const H = Q.heat; o.push(cyl('heat', 'steel', [H.bl, H.fs, H.head[0]], [H.bl, H.fs, H.head[1]], 0.22), cyl('heat', 'knob', [H.bl, H.fs, H.knob.z - H.knob.h / 2], [H.bl, H.fs, H.knob.z + H.knob.h / 2], H.knob.d / 2));
  o.push(box('heat', 'al', [H.bl, (H.fs + Q.plate.fs[0]) / 2 + 0.05, H.head[1] - 0.6], [0.5, Q.plate.fs[0] - H.fs + 0.4, 0.09]));   // head bracket off the forward edge of the plates
  return o;
}
export const quadParams = () => P(quadPrims());
export const QUAD_RHO = { al: AL, steel: ST, knob: 0.048 };

// ------------------------------------------------------------------------------------------- LEZ-76-110 control cables
export const CABLE_LBFT = 0.055;          // ACS A-920 0.25 in conduit with its 0.078 in inner; lb/ft BOUND (not published)
export function cablePrims() {
  const o = runTubes('LEZ-76-110', (r) => r.name.split(' ')[0], 'cable');
  for (const [k, c] of Object.entries(LY.CEND)) o.push(box('bracket', 'al', [c.E[0], c.E[1] - 0.25, c.E[2] - 0.25], [0.6, 0.5, 0.12]));   // conduit clamp blocks on the carburettor bracket
  o.push(box('bracket', 'al', [-2.25, 134.40, 25.75], [1.6, 0.9, 0.063]));                                 // bracket base on the carburettor's left flange bolts
  return o;
}
export const cableParams = () => P(cablePrims());
export const CABLE_RHO = { cable: perFt(CABLE_LBFT, LY.CABLE.od), al: AL };

// ------------------------------------------------------------------------------------------- LEZ-77-100 GEA 24 and its harness
/** Garmin GEA 24: 6.5 W × 1.9 H × 3.0 D in (5.0 with its connectors), 0.71 lb unit, 1.6 lb with the connector kit, 0.43 A at
 *  14 V; four connectors J241–J244 (9-pin network / power, 50-pin, 25-pin thermocouple, 37-pin) on one 6.5 × 1.9 face (src:
 *  Garmin G3X IM 190-01115-01 rev AV Table 2-4, §7.1, Table 2-2; accessed 2026-11-19; was 3.15 × 5.10 × 1.55, 0.45 + 0.55 lb
 *  typed). Rev C: stood on edge on its flange shelf, the 6.5 in side fore and aft, 1.9 in across, connectors up (2.0 in for the
 *  plugs and backshells) under J's shelf. Harness lb/ft BOUND */
export const GEA24 = { c: [-5.04, 34.80, 37.10], d: [1.90, 6.50, 3.00], lb: 0.71, conn: 2.0, connLb: 0.89, harnessLbFt: 0.20 };
export const GEA_FLANGE_TOP = 36.75;   // rev B (ICD J-R3): was the shelf + 1.2 in, WL 37.03, 0.02 in under the AXIS LCD collar (WL 37.05)
export function geaPrims() {
  const G = GEA24, o = [box('unit', 'unit', G.c, G.d)];
  o.push(box('conn', 'conn', [G.c[0], G.c[1], G.c[2] + G.d[2] / 2 + G.conn / 2], [1.6, 5.6, G.conn]));      // J241–J244 plugs and backshells on the top face (rev C)
  o.push(box('shelf', 'al', [G.c[0], G.c[1] + 0.9, G.c[2] - G.d[2] / 2 - 0.0315], [G.d[0] + 0.6, G.d[1] + 4.4, 0.063], [-1, 1].flatMap((sx) => [-1, 1].map((sy) => ({ ax: 2, u: G.c[0] + sx * (G.d[0] / 2 - 0.3), v: G.c[1] + sy * (G.d[1] / 2 - 0.4), r: 0.0825 })))));
  { const fb = G.c[2] - G.d[2] / 2; o.push(box('shelf', 'al', [G.c[0], 40.749 - 0.0315, (fb + GEA_FLANGE_TOP) / 2], [G.d[0] + 0.6, 0.063, GEA_FLANGE_TOP - fb])); }   // flange on the panel's forward face (2 × #8 nutplates, block B); rev B: top at WL 36.75, 0.30 in under J's AXIS collar
  o.push(...runTubes('LEZ-77-100', 'harness', 'harness'));
  return o;
}
export const geaParams = () => P(geaPrims());
export const GEA_RHO = () => { const p = geaPrims(); return { unit: effRho(p, 'unit', GEA24.lb), conn: effRho(p, 'conn', GEA24.connLb), al: AL, harness: perFt(GEA24.harnessLbFt, 0.35) }; };

// ------------------------------------------------------------------------------------------- LEZ-77-110 sensors and branches, LEZ-77-111 branches
export const PROBE_LB = { cht: 0.06, egt: 0.08, oilT: 0.10, tach: 0.12 };   // typed from memory
export function sensorPrims() {
  const o = runTubes('LEZ-77-110', (r) => (/trunk/i.test(r.name) ? 'trunk' : /oil/.test(r.name) ? 'trunk' : 'branch'), 'wire');
  for (const k of ['LF', 'RF', 'LR', 'RR']) { const c = LY.TC(k), e = LY.TE(k);
    o.push(cyl('cht', 'cht', c, [c[0], c[1], c[2] - 0.9], 0.20), cyl('egt', 'egt', [e[0], e[1] - 0.4, e[2] - 0.8], [e[0], e[1] + 0.4, e[2] - 0.8], 0.25)); }
  o.push(cyl('oilt', 'oilt', [-1.80, 133.89, 32.16], [-1.80, 133.10, 32.16], 0.35), cyl('tach', 'tach', LY.TACH.b, [LY.TACH.b[0], LY.TACH.b[1] - 0.9, LY.TACH.b[2]], 0.30));
  return o;
}
export const sensorParams = () => P(sensorPrims());
export const SENSOR_RHO = () => { const p = sensorPrims(), gv = groupVols(p); return { wire: perFt(0.045, 0.22), cht: 4 * PROBE_LB.cht / gv.cht, egt: 4 * PROBE_LB.egt / gv.egt, oilt: PROBE_LB.oilT / gv.oilt, tach: PROBE_LB.tach / gv.tach }; };
export const branchParams = () => P(runTubes('LEZ-77-111', (r) => (/fuel-flow/.test(r.name) ? 'fft' : 'manifold'), 'wire'));
export const BRANCH_RHO = { wire: perFt(0.040, 0.25) };

// ------------------------------------------------------------------------------------------- LEZ-77-120 manifold, LEZ-77-121 lines, LEZ-77-130 fuel-flow transducer
export const XD_LB = 0.09, ELBOW_LB = 0.015;   // typed
export function maniPrims() {
  const M = LY.MANI, o = [], c = [(M.bl[0] + M.bl[1]) / 2, M.mid, (M.wl[0] + M.wl[1]) / 2];
  o.push(box('block', 'al', c, [M.bl[1] - M.bl[0], M.depth, M.wl[1] - M.wl[0]], LY.MANI_HOLES.map(([u, v]) => ({ ax: 1, u, v, r: 0.0955 }))));
  for (const [k, x] of Object.entries(M.ports)) { o.push(cyl('xd', 'xd', [x, M.mid, M.wl[1]], [x, M.mid, M.wl[1] + M.xd.L], M.xd.d / 2), cyl('xd', 'xd', [x, M.mid, M.wl[1] + M.xd.L], [x, M.mid, M.wl[1] + M.xd.L + M.xd.conn], 0.30));
    const pt = LY.MANI_PORT(k); o.push(cyl('elbow', 'steel', [x, M.mid, M.wl[0]], [x, M.mid, pt[2]], 0.17), cyl('elbow', 'steel', [x, M.mid, pt[2]], pt, 0.17)); }
  return o;
}
export const maniParams = () => P(maniPrims());
export const MANI_RHO = () => { const p = maniPrims(), gv = groupVols(p); return { al: AL, xd: 3 * XD_LB / gv.xd, steel: 3 * ELBOW_LB / gv.steel }; };
export const lineParams = () => P(runTubes('LEZ-77-121', (r) => r.name.split(' ')[0].toLowerCase(), 'hose'));
export const LINE_RHO = { hose: perFt(LY.HOSE3.lbFt, LY.HOSE3.od) };
export function fftPrims() {
  const F = LY.FFT, c = LY.FFT_AT, o = [box('body', 'body', c, [F.w, F.L, F.h])];
  for (const s of [-1, 1]) o.push(cyl('ports', 'body', [c[0], c[1] + s * F.L / 2, c[2]], [c[0], c[1] + s * (F.L / 2 + 0.30), c[2]], 0.22));
  o.push(cyl('drain', 'body', [c[0], c[1] - F.L / 2 - 0.15, c[2]], [c[0], c[1] - F.L / 2 - 0.15, c[2] - 0.95], 0.15));   // AN917 tee on the inlet with a quick drain down (block F: the transducer sits 1.8 in below the union)
  o.push(box('bracket', 'al', [c[0], c[1], c[2] - F.h / 2 - 0.0315], [F.w + 0.8, F.L - 0.2, 0.063], [-1, 1].map((s) => ({ ax: 2, u: c[0] + s * (F.w / 2 + 0.22), v: c[1], r: 0.0825 }))));
  return o;
}
export const fftParams = () => P(fftPrims());
export const FFT_RHO = () => { const p = fftPrims(); return { body: effRho(p, 'body', LY.FFT.lb), al: AL }; };
