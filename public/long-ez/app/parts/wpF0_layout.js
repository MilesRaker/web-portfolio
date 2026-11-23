// WPF0 — block F (fuel system) layout, loaded by wp1_powerplant.js before every block module, so the bulkhead holes that
// block A generates from the routed lines follow these routes (ICD FM-16). Everything here is in inches in the definition
// frame [BL, FS, WL] (+BL = aircraft right); `ftOf` turns a point into the system frame [FS, BL, WL] / 12.
//  • Tank: the released strake cavity (LEZ-57-180, wp21 strakeSection(y, true).cavity), not the zone sample (FM-1).
//    A cell grid over the three bays gives the unusable fuel below the outlet sill at each attitude of the sweep, the
//    expansion space under the filler neck and the vent pick-up's ullage.
//  • Outlet: one per tank, through the root rib R1 at the cavity floor (the sill) into a glass well bonded to the cabin
//    side of the shell; the station is the one with the least worst-case unusable fuel over the attitude sweep (FM-2).
//  • Cabin runs aft of the rear seat bulkhead (FS 130.2): wells → selector (centre line) → boost pump → H's flow
//    transducer → firewall union at block A's layout hole (BL 2.40, WL 30.60). Nothing crosses FS 28, 97.2 or 130.2.
//  • Firewall aft: the gascolator on an offset bracket (bolts on A's layout, body at BL ≤ 1.2, FM-10), a looped -6 hose
//    to the engine pump with slack for the isolator motion (FM-11), the engine-to-carb hose with the tee and reducer (FM-17).
//  • Drains: flush poppets in the belly aft of the gear fairing (FS ≥ 138.8, FM-12).
// Notional. Positions of COTS envelopes and their ports are typed from memory where marked in the records.
import { GEO, fusAt } from '../structures.js';
import { insideFus } from '../systems.js';
import { STK, strakeSection } from './wp21_strake.js';

export const r4 = (x) => Math.round(x * 1e4) / 1e4;
export const T3 = (q) => q.map(r4);
export const ftOf = (q) => [q[1] / 12, q[0] / 12, q[2] / 12];
export const inOf = (q) => [q[1] * 12, q[0] * 12, q[2] * 12];
const add = (a, b) => a.map((v, i) => v + b[i]), sub = (a, b) => a.map((v, i) => v - b[i]), mul = (a, k) => a.map((v) => v * k), len = (a) => Math.hypot(...a);
const MX = (q, sg) => [sg * q[0], q[1], q[2]];

// ------------------------------------------------------------------------------------------- shell and strake helpers
export const SHELL_T = 0.415;
/** half-width (in) of the shell surface offset `t` in inward from the OML, at FS / WL (in) */
export function hwAt(fs, wl, t = 0) { let lo = 0, hi = 30; if (!insideFus(fs / 12, 0, wl / 12, t / 12)) return 0; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (insideFus(fs / 12, m / 12, wl / 12, t / 12)) lo = m; else hi = m; } return lo; }
/** belly WL (in) of the OML (t = 0) or the shell's inner face (t = 0.415) at BL / FS (in) */
export function bellyAt(bl, fs, t = 0) { const f = fusAt(fs / 12); let lo = f.bot * 12 - 1, hi = (f.bot + f.top) * 6; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (insideFus(fs / 12, bl / 12, m / 12, t / 12)) hi = m; else lo = m; } return hi; }
const polyAt = (poly, x, lowest) => { let best = lowest ? Infinity : -Infinity; for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length]; if ((a[0] - x) * (b[0] - x) <= 0 && a[0] !== b[0]) { const z = a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]); best = lowest ? Math.min(best, z) : Math.max(best, z); } } return best; };
/** cavity floor / top WL (in) at BL / FS (in), from the released strake section */
export const cavFloor = (bl, fs) => polyAt(strakeSection(Math.abs(bl), true).cavity, fs, true);
export const cavTop = (bl, fs) => polyAt(strakeSection(Math.abs(bl), true).cavity, fs, false);
/** strake OML lower / upper WL (in) at BL / FS */
export const omlLow = (bl, fs) => polyAt(strakeSection(Math.abs(bl)).oml, fs, true);
export const omlTop = (bl, fs) => polyAt(strakeSection(Math.abs(bl)).oml, fs, false);
export const R1 = { inb: STK.yR, out: STK.yR + STK.tr };    // root rib: outer (wedge) face BL 12.96, tank face 13.375
export const BAYS = [[STK.yR + STK.tr, STK.ribs[1] - STK.tr / 2], [STK.ribs[1] + STK.tr / 2, STK.ribs[2] - STK.tr / 2], [STK.ribs[2] + STK.tr / 2, STK.yE - STK.tr]];

// ------------------------------------------------------------------------------------------- tank cell grid
const pip = (p, poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
export const GRID_D = 0.4;
let CELLS = null;
/** cells [BL, FS, WL] inside the cavity of the three bays (right tank), and the gal per cell scaled to the released volume */
export function tankCells(Vgal) {
  if (CELLS) return CELLS;
  const d = GRID_D, pts = [];
  for (const [a, b] of BAYS) for (let y = a + d / 2; y < b; y += d) { const P = strakeSection(y, true).cavity, xs = P.map((q) => q[0]), zs = P.map((q) => q[1]);
    for (let x = Math.min(...xs) + d / 2; x < Math.max(...xs); x += d) for (let z = Math.min(...zs) + d / 2; z < Math.max(...zs); z += d) if (pip([x, z], P)) pts.push([y, x, z]); }
  const raw = pts.length * d ** 3 / 231;
  CELLS = { pts, raw, galPer: (Vgal ?? raw) / pts.length };
  return CELLS;
}
/** attitudes of the sweep: pitch (deg, nose up +) — cruise descent, level, cruise, climb at V_y (DESIGN, typed range) */
export const PITCH = [-3, 0, 3, 10];
export const hOf = (q, deg) => { const th = deg * Math.PI / 180; return -q[1] * Math.sin(th) + q[2] * Math.cos(th); };   // height in the gravity frame (FS aft, so nose-up lowers the aft end)
/** hOf of every cell at one attitude, ascending (the same values; worked once per cell list and attitude, perf) */
const H_SORTED = new Map();
const hSorted = (pts, deg) => { let m = H_SORTED.get(pts); if (!m) H_SORTED.set(pts, (m = new Map())); let H = m.get(deg);
  if (!H) { const th = deg * Math.PI / 180, sn = Math.sin(th), cs = Math.cos(th); H = Float64Array.from(pts, (q) => -q[1] * sn + q[2] * cs).sort(); m.set(deg, H); } return H; };
/** the cells below the sill: counted on the sorted heights (the same count as testing every cell; perf) */
export function unusableAt(sill, deg, V) { const C = tankCells(V), h0 = hOf(sill, deg), H = hSorted(C.pts, deg); let lo = 0, hi = H.length; while (lo < hi) { const m = (lo + hi) >> 1; if (H[m] < h0) lo = m + 1; else hi = m; } return lo * C.galPer; }

// ------------------------------------------------------------------------------------------- outlet station (FM-2)
const OUT_FS = Array.from({ length: 29 }, (_, i) => 100.50 + 0.5 * i);   // FS 126–140: inside the cabin aft of the rear seat bulkhead (≥ FS 131.5 for the well) and forward of the spar
let SWEEP = null;
export function outletSweep(V) {
  if (SWEEP) return SWEEP;
  const cand = OUT_FS.map((fs) => { const sill = [R1.out, fs, cavFloor(R1.out, fs)], u = PITCH.map((a) => unusableAt(sill, a, V)); return { fs, sill, u, worst: Math.max(...u) }; })
    .filter((c) => c.fs >= 106.50);   // the well (± 1.2 in) clear of the rear seat bulkhead's aft face (FS 130.41) by ≥ 0.4 in
  cand.sort((a, b) => a.worst - b.worst);
  SWEEP = { best: cand[0], cand: cand.sort((a, b) => a.fs - b.fs) };
  return SWEEP;
}

// ------------------------------------------------------------------------------------------- sizes (in)
export const TUBE = { feed: { od: 0.375, w: 0.035 }, vent: { od: 0.25, w: 0.035 }, drain: { od: 0.1875, w: 0.028 }, gauge: { od: 0.375, w: 0.0625 }, pass: { od: 0.5, w: 0.035 } };
export const HOSE6 = { od: 0.69, id: 0.31, bendMin: 4.0 };     // Stratoflex 124-6J PTFE with integral fire sleeve: min bend radius 4.00 in, 0.234 lb/ft (Aircraft Spruce / McFarlane, accessed 2026-11-19); OD / ID BOUND
export const WELL = { t: 0.06, w: 1.2, L: 2.4, z0: 31.80, top: 33.25 };
export const VALVE_ENV = { bl: 2.2, fs: 2.2, wl: 1.5 }, PUMP_ENV = { d: 3.0, L: 4.0 }, GASC_ENV = { head: [2.0, 2.0, 1.0], bowlD: 2.0, bowlH: 2.5 };

// ------------------------------------------------------------------------------------------- the layout
let L = null;
/** the whole layout; `eng` = the engine's fuel ports in inches { fpIn, fpOut, carbIn, carbPt }; `fft` = H's flow transducer ports { in, out } */
export function fuelLayout(eng, fft, V) {
  if (L) return L;
  const S = outletSweep(V).best, FSo = S.fs, zs = S.sill[2];
  // ---- sump (right; left mirrored)
  const wIn = hwAt(FSo, 34.0, SHELL_T), wOut = hwAt(FSo, 34.0, 0);   // shell inner face / OML at the well
  // the well hangs low on the wall so the passage passes under C's rudder cable (LEZ-27-151), which climbs the wall here
  const wTop = WELL.top, wBot = WELL.z0, wx0 = wIn - WELL.w;          // well: inboard face wx0 … shell inner face wIn
  const passA = [R1.out, FSo, zs + TUBE.pass.od / 2 - TUBE.pass.w], passB = [wIn - 0.35, FSo, wTop - 0.30];   // bore invert at the sill; ~35° down through R1, the wedge and the shell
  const outlet = [wx0 - 0.55, FSo, wBot + 0.40], drainPt = [wIn - 0.55, FSo + 0.6, wBot - 0.40];
  const sump = { FSo, zs, sill: S.sill, wIn, wOut, wTop, wBot, wx0, passA, passB, outlet, drainPt, gapWedge: R1.inb - hwAt(FSo, passA[2], 0) };
  // ---- selector valve (centre line, aft of the rear seat bulkhead) and boost pump
  const VALVE = [0, 111.10, 31.70];
  const valveIn = (sg) => [sg * VALVE_ENV.bl / 2, VALVE[1], VALVE[2]], valveOut = [0, VALVE[1] + VALVE_ENV.fs / 2, VALVE[2]];
  const PUMP = { a: [1.20, 115.10, 31.10], b: [1.20, 115.10 + PUMP_ENV.L, 31.10] };   // rev 2026-11-19: Facet 40106 3 in cube (Ø 3.0 envelope) + the AN816-6-2D adapters = 4.0 in port to port
  // ---- firewall: union (block A's layout), gascolator on the offset bracket
  const FWs = GEO.firewall * 12, fire = FWs + 0.125 + 0.016;   // aft face of the fire layer (A: FW.paper + FW.steel)
  const UNION = { bl: 2.40, wl: 30.60, fwd: [2.40, FWs - 0.2275 - 0.02, 30.60], aft: [2.40, fire + 0.62, 30.60] };
  const hd = GASC_ENV.head, GC = [1.10, fire + 0.32 + hd[1] / 2, 30.55];   // head centre: body at BL 1.10 (≤ 1.2, FM-10), 0.32 in off the CRES
  const gasc = { c: GC, headTop: GC[2] + hd[2] / 2, headBot: GC[2] - hd[2] / 2, bowlBot: GC[2] - hd[2] / 2 - GASC_ENV.bowlH,
    in: [GC[0] + hd[0] / 2, UNION.aft[1] + 0.08, 30.60], out: [GC[0] - hd[0] / 2, GC[1] + 0.35, 30.55], bolts: [[1.60, FWs, 28.20], [3.20, FWs, 28.20]] };
  gasc.drainTip = [GC[0], GC[1], bellyAt(GC[0], GC[1], 0) + 0.03];   // drain stem to the cowl skin (G: Ø 0.5 hole in the lower cowl)
  // ---- cabin routes
  const feed = (sg) => { const o = MX(outlet, sg), i = valveIn(sg); return [o, [sg * (o[0] * sg - 1.0), FSo + 0.3, o[2] - 0.05], [sg * 6.0, (FSo + VALVE[1]) / 2 + 0.6, (o[2] + i[2]) / 2 + 0.05], [sg * 2.6, VALVE[1], i[2] + 0.02], i].map(T3); };
  const vToPump = [valveOut, [0.2, VALVE[1] + 2.0, VALVE[2] - 0.15], [1.0, PUMP.a[1] - 1.0, PUMP.a[2] + 0.02], PUMP.a].map(T3);
  const pToFft = [PUMP.b, [1.6, PUMP.b[1] + 1.0, PUMP.b[2] - 0.2], [3.4, fft.in[1] - 1.0, fft.in[2] + 0.1], fft.in].map(T3);
  const fftToFw = [fft.out, [fft.out[0], fft.out[1] + 0.8, fft.out[2] + 0.05], [2.40, UNION.fwd[1] - 0.9, 30.55], UNION.fwd].map(T3);
  // ---- drains: flush poppets aft of the gear fairing (FS ≥ 138.8), BL ±6.5
  const QD = (sg) => { const bl = 6.5, fs = 113.90, zo = Math.max(...Array.from({ length: 16 }, (_, k) => bellyAt(bl + 0.3 * Math.cos(k * Math.PI / 8), fs + 0.3 * Math.sin(k * Math.PI / 8), 0))); return { face: [sg * bl, fs, zo + 0.01], top: [sg * bl, fs, zo + 1.30], oml: bellyAt(bl, fs, 0), rim: zo }; };
    // the drain crosses H's engine-control cables (left side, WL ≈ 30.4) above them, then drops inboard of them
  const drainLine = (sg) => { const d = MX(drainPt, sg), q = QD(sg); return [d, [sg * 9.0, FSo + 1.4, d[2] - 0.20], [sg * 6.2, 111.1, d[2] - 0.45], [sg * 5.7, 113.1, q.top[2] + 1.0], q.top].map(T3); };
  // ---- vent: pick-up near the tank's high point (inboard bay top), down through the bay to a union in the lower skin
  const vent = ventLayout(V);
  // ---- filler: inboard bay centre, clear of R2; cap flush with the upper OML
  const filler = fillerLayout(V, vent);
  // ---- sight gauges: on the cabin side at FS 100, beside and just aft of the pilot's shoulder
  const gauge = gaugeLayout();
  // ---- engine-side hoses
  // rev 2026-11-19 (124-6J bend radius 4.0 in): a rigid 3/8 × 0.035 riser from the gascolator outlet up the firewall's aft face
  // to RISER.top, so the hose spans ≥ 5.8 in to the engine pump and arcs at ≥ 4.4 in radius with the 0.5 in slack
  const riser = loopHose(gasc.out, [-0.55, 0.0, 0.835], RISER.top, [0, 0, -1], RISER.k[0], RISER.k[1], 10);
  const hose1 = arcHose(RISER.top, eng.fpIn, HOSE1.slack, HOSE1.bulge);
  const hose2 = [eng.fpOut, [eng.fpOut[0] + 0.6, eng.fpOut[1] + 1.32, eng.fpOut[2] - 1.68], [eng.carbIn[0] + 0.48, eng.carbIn[1] - 1.2, eng.carbIn[2] + 0.96], eng.carbIn].map(T3);
  const drive = driveLayout(VALVE);
  L = { sump, VALVE, valveIn, valveOut, PUMP, UNION, gasc, fire, FWs, feed, vToPump, pToFft, fftToFw, QD, drainLine, vent, filler, gauge, hose1, hose2, riser, eng, fft, drive };
  return L;
}

/** the gascolator-to-engine-pump hose: a circular arc between the ports, `slack` in longer than the chord, bowed toward
 *  `bulge` (a direction, projected square to the chord); 90° swivel ends take the arc's end tangents */
export const HOSE1 = { slack: 0.55, bulge: [-0.3, 0.0, 1.0] };
export const RISER = { top: [7.0, 129.50, 36.0], k: [1.2, 1.2] };
export function arcHose(a, b, slack, bulge, n = 14) {
  const c = len(sub(b, a)), e = mul(sub(b, a), 1 / c), bp = sub(bulge, mul(e, bulge.reduce((s, v, i) => s + v * e[i], 0))), nrm = mul(bp, 1 / len(bp)), Lh = c + slack;
  let lo = 1e-4, hi = Math.PI * 1.9; for (let i = 0; i < 60; i++) { const th = (lo + hi) / 2; if (th / (2 * Math.sin(th / 2)) < Lh / c) lo = th; else hi = th; }
  const th = (lo + hi) / 2, R = c / (2 * Math.sin(th / 2)), mid = mul(add(a, b), 0.5), ctr = sub(mid, mul(nrm, R * Math.cos(th / 2))), out = [];
  for (let i = 0; i <= n; i++) { const phi = -th / 2 + th * i / n; out.push(T3(add(ctr, add(mul(e, R * Math.sin(phi)), mul(nrm, R * Math.cos(phi)))))); }
  return out;
}
/** a hose from port a (leaving along da) to port b (arriving along −db... db is the direction it leaves b), as a cubic
 *  Bézier with handles ka, kb (in), sampled in 12 steps */
export function loopHose(a, da, b, db, ka, kb, n = 12) {
  const u = mul(da, 1 / len(da)), w = mul(db, 1 / len(db)), P1 = add(a, mul(u, ka)), P2 = add(b, mul(w, kb)), out = [];
  for (let i = 0; i <= n; i++) { const t = i / n, s = 1 - t; out.push(T3([0, 1, 2].map((k) => s * s * s * a[k] + 3 * s * s * t * P1[k] + 3 * s * t * t * P2[k] + t * t * t * b[k]))); }
  return out;
}
/** smallest radius of curvature along a sampled polyline (circumradius of consecutive triples), in */
export function minRadius(pts) { let m = Infinity; for (let i = 1; i < pts.length - 1; i++) { const a = len(sub(pts[i], pts[i - 1])), b = len(sub(pts[i + 1], pts[i])), c = len(sub(pts[i + 1], pts[i - 1])), s = (a + b + c) / 2, A = Math.sqrt(Math.max(0, s * (s - a) * (s - b) * (s - c))); if (A > 1e-9) m = Math.min(m, a * b * c / (4 * A)); } return m; }
export const pathLen = (pts) => pts.slice(1).reduce((s, q, i) => s + len(sub(q, pts[i])), 0);

let VENT = null;
function ventLayout(V) {
  if (VENT) return VENT;
  // candidates: 0.35 in under the cavity top in the inboard bay; keep the one with the most ullage above the 98 %-full surface over the sweep
  const C = tankCells(V), cand = [];
  for (let bl = 14.0; bl <= 22.0; bl += 0.5) for (let fs = 82.50; fs <= 114.50; fs += 0.5) { const zt = cavTop(bl, fs); if (!Number.isFinite(zt)) continue; cand.push([bl, fs, zt - 0.35]); }
  const nFull = Math.round(C.pts.length * 0.98), surf = Object.fromEntries(PITCH.map((a) => { const hs = hSorted(C.pts, a); return [a, hs[nFull - 1]]; }));
  const margins = (q) => PITCH.map((a) => hOf(q, a) - surf[a]);
  const score = (m) => Math.min(m[1], m[2]) + 0.01 * Math.min(...m);   // in air at level and cruise (governs); the extremes second
  const best = cand.map((q) => ({ q, m: margins(q) })).sort((x, y) => score(y.m) - score(x.m))[0];
  const pick = T3(best.q), fsOut = pick[1] + 1.2, zSkin = omlLow(pick[0], fsOut), zIn = cavFloor(pick[0], fsOut);
  const pts = [pick, [pick[0], pick[1] + 0.6, pick[2] - 1.2], [pick[0], fsOut, zIn + 0.6], [pick[0], fsOut, zSkin - 0.20], [pick[0], fsOut - 0.15, zSkin - 0.70]].map(T3);
  VENT = { pick, margins: best.m, fsOut, zSkin, zIn, pts, insert: [pick[0], fsOut, (zSkin + zIn) / 2] };
  return VENT;
}
function fillerLayout(V, vent) {
  const bl = (BAYS[0][0] + BAYS[0][1]) / 2, fs = 94.50, zTop = omlTop(bl, fs), C = tankCells(V);
  // the neck reaches down so that ≥ 2 % of the tank stays above its lower end when filled to it (level): the expansion space
  const zs = C.pts.map((p) => p[2]).sort((a, b) => b - a), zNeck = zs[Math.ceil(C.pts.length * 0.021)];
  const rim = Math.min(...Array.from({ length: 16 }, (_, k) => omlTop(bl + 1.5 * Math.cos(k * Math.PI / 8), fs + 1.5 * Math.sin(k * Math.PI / 8))));
  return { bl, fs, zTop: Math.min(zTop, rim) - 0.01, zOml: zTop, zRim: rim, zNeck, capD: 3.75, neckD: 2.0, ribGap: Math.min(bl - BAYS[0][0], BAYS[0][1] - bl) - 1.0, ventGap: Math.hypot(bl - vent.pick[0], fs - vent.pick[1]) };
}
function gaugeLayout() {
  const fs = 74.50, zLo = cavFloor(R1.out, fs) + 0.30, zHi = cavTop(R1.out, fs) - 0.45, wIn = hwAt(fs, (zLo + zHi) / 2, SHELL_T), x = wIn - 0.45;
  return { fs, zLo, zHi, wIn, x, gapLo: R1.inb - hwAt(fs, zLo, 0), gapHi: R1.inb - hwAt(fs, zHi, 0) };
}
void ftOf;

// ------------------------------------------------------------------------------------------- selector remote drive (FAR 23.995)
/** LEZ-28-135: the selector stays on the centre line aft of the rear seat bulkhead; a right-angle drive on its stem turns
 *  the drive outboard, a second one forward, and a torque tube runs forward along the left side above H's engine-control
 *  cables, through LEZ-53-175 and the front seat back's left leg opening (no hole there) to a universal joint, then up to a
 *  knob beside the pilot's left hip under the aft end of the left armrest. Inches [BL, FS, WL]; DESIGN positions. */
export const DRIVE = { tube: { od: 0.5, w: 0.049 }, ra: 1.5, uj: { r: 0.42, L: 1.6 }, knob: { d: 1.5 /* seat-1 2026-11-22, was 2.0: fits between the cables and the wiring lane under the armrest */, t: 0.6 }, brg: [0.9, 1.0, 0.9], y: -8.9, z: 33.4,
  // integration 2026-11-19 (ICD B-M1): FS ≥ 94.5 at WL 33.3 puts the knob 2 in behind the front seat back's forward face (F's own
  // seat rule, LEZ-28-135 I3), so the knob moves 1.3 in aft only, to FS 90.3 at the same BL / WL, 1.2 in + its radius ahead of the
  // face; with the seats 2.0 in lower (Miles) it is 21.7 in from B's 50th-male shoulder, inside the 5th-percentile female's 22.6 in
  // reach (ANSUR II). Higher positions bring the knob bearing's wall bracket within 0.25 in of C's rudder cable. The universal
  // joint follows by the same offset, so the shaft keeps its line through the leg opening
  // seat-1 2026-11-22: with the seat 6 in forward the knob's old spot (FS 64.8) is behind the seat back, and the wall beside the
  // pilot's new hip (FS 56–67) carries the throttle and mixture cables' S-drop under both left raceways. The knob moves to FS 61.0,
  // BL -9.6, WL 35.75, Ø 1.5 (was FS 64.8, BL -9.3, WL 33.3, Ø 2.0): above the cables, under the signal raceway, against the wall
  // so neither raceway steps inboard into the back pad. The joint goes 0.3 in outboard (BL -9.2) to clear the power feed at FS 70.
  // OPEN: the power raceway passes 0.17 in under the knob (rule 0.25); see the seat-1 revision
  J1: [-9.2, 70.80, 32.00], H: [-9.6, 61.00, 35.75], brgFS: [98.50, 84.50], ujMax: 30 };
export function driveLayout(VALVE) {
  const D = DRIVE, a = D.ra, top = VALVE[2] + VALVE_ENV.wl / 2, RA1 = [0, VALVE[1], top + a / 2], RA2 = [D.y, VALVE[1], D.z];
  const crossA = [-a / 2, VALVE[1], D.z], crossB = [D.y + a / 2, VALVE[1], D.z], sideA = [D.y, VALVE[1] - a / 2, D.z];
  const u = (p, q) => { const d = sub(q, p); return mul(d, 1 / len(d)); }, dS = u(sideA, D.J1), dH = u(D.J1, D.H);
  const sideB = sub(D.J1, mul(dS, D.uj.L / 2)), shaftA = add(D.J1, mul(dH, D.uj.L / 2)), knobA = D.H, knobB = add(D.H, mul(dH, D.knob.t));
  const ujAngle = Math.acos(Math.min(1, dS.reduce((s, v, i) => s + v * dH[i], 0))) * 180 / Math.PI;
  const onSide = (fs) => { const t = (fs - sideA[1]) / (D.J1[1] - sideA[1]); return add(sideA, mul(sub(D.J1, sideA), t)); };
  // wall brackets pass under C's rudder cable (BL −11.6, WL 33.0) at the side bearings and over it at the knob's bearing
  const brgs = [...D.brgFS.map(onSide).map((c) => [c, -1]), [add(D.H, mul(dH, -1.2)), 1]].map(([c, up]) => ({ c: T3(c), up, wall: -hwAt(c[1], c[2], SHELL_T) }));
  const at130 = onSide(104.7);
  return { RA1: T3(RA1), RA2: T3(RA2), cross: [T3(crossA), T3(crossB)], side: [T3(sideA), T3(sideB)], shaft: [T3(shaftA), T3(D.H)], knob: [T3(knobA), T3(knobB)], J1: T3(D.J1), H: T3(D.H), dS, dH, ujAngle, brgs, at130: T3(at130),
    length: len(sub(crossB, crossA)) + len(sub(sideB, sideA)) + len(sub(D.H, shaftA)), stemTop: top };
}

// ------------------------------------------------------------------------------------------- primitives per part (in)
// The definition records' params and solids (cad/g_prims.py), the drawings and the system records' display geometry all
// come from these. Groups are material groups for the mass; `env` is a bought-in envelope (mass from the vendor's figure).
export const RHO = { al: 0.098, steel: 0.284, ss: 0.289, brass: 0.307, glass: 0.0686, nylon: 0.041, hose: 0.0653, env: 0 };   // hose smeared: 0.234 lb/ft (124-6J) over the 0.69 / 0.31 annulus
const cylP = (feat, group, a, b, r, ri = 0, extra = {}) => ({ t: 'cyl', feat, group, a: T3(a), b: T3(b), r: r4(r), ...(ri ? { ri: r4(ri) } : {}), ...extra });
const boxP = (feat, group, c, d, extra = {}) => ({ t: 'box', feat, group, c: T3(c), d: T3(d), ...extra });
export const tubeP = (pts, od, w, feat, group = 'al') => pts.slice(1).map((b, i) => cylP(feat, group, pts[i], b, od / 2, od / 2 - w));
const SIDES = [1, -1];
export function fuelPrims(L) {
  const S = L.sump, W = WELL.t, P = {};
  P['LEZ-28-110'] = SIDES.flatMap((sg) => { const X = (q) => MX(q, sg), xc = (S.wx0 + S.wIn) / 2, f0 = S.FSo - WELL.L / 2, f1 = S.FSo + WELL.L / 2;
    return [boxP('well', 'glass', X([xc, S.FSo, S.wBot + W / 2]), [WELL.w, WELL.L, W]), boxP('well', 'glass', X([xc, S.FSo, S.wTop - W / 2]), [WELL.w, WELL.L, W]),
      boxP('well', 'glass', X([S.wx0 + W / 2, S.FSo, (S.wBot + S.wTop) / 2]), [W, WELL.L, S.wTop - S.wBot - 2 * W]),
      ...[f0 + W / 2, f1 - W / 2].map((fs) => boxP('well', 'glass', X([xc, fs, (S.wBot + S.wTop) / 2]), [WELL.w - W, W, S.wTop - S.wBot - 2 * W])),
      cylP('pass', 'al', X(S.passA), X(S.passB), TUBE.pass.od / 2, TUBE.pass.od / 2 - TUBE.pass.w),
      cylP('strainer', 'brass', X([R1.out + 1.25, S.FSo, S.passA[2] + 0.03]), X(S.passA), 0.22, 0.20),
      cylP('outlet', 'al', X([S.wx0, S.FSo, S.outlet[2]]), X(S.outlet), 0.28, 0.125), cylP('drain', 'al', X([S.drainPt[0], S.drainPt[1], S.wBot]), X(S.drainPt), 0.2, 0.07)]; });
  P['LEZ-28-120'] = SIDES.flatMap((sg) => tubeP(L.feed(sg), TUBE.feed.od, TUBE.feed.w, sg > 0 ? 'feedR' : 'feedL'));
  { const V = L.VALVE, e = VALVE_ENV, zb = bellyAt(0, V[1], SHELL_T), top = V[2] - e.wl / 2 - 0.09;
    P['LEZ-28-130'] = [boxP('body', 'env', V, [e.bl, e.fs, e.wl]), cylP('stem', 'steel', [0, V[1], V[2] + e.wl / 2], [0, V[1], V[2] + e.wl / 2 + 0.12], 0.19),
      boxP('bracket', 'al', [0, V[1], top + 0.045], [e.bl + 0.6, e.fs, 0.09]), ...[-1, 1].map((k) => boxP('bracket', 'al', [k * (e.bl / 2 + 0.255), V[1], (zb + top) / 2], [0.09, e.fs, top - zb]))]; }
  { const Pm = L.PUMP, r = PUMP_ENV.d / 2, zb = bellyAt(Pm.a[0], Pm.a[1] + 2, SHELL_T), zc = Pm.a[2];
    { const D = L.drive, a = DRIVE.ra, T = DRIVE.tube;
    P['LEZ-28-135'] = [boxP('ra1', 'env', D.RA1, [a, a, a]), boxP('ra2', 'env', D.RA2, [a, a, a]),
      cylP('tube', 'al', D.cross[0], D.cross[1], T.od / 2, T.od / 2 - T.w), cylP('tube', 'al', D.side[0], D.side[1], T.od / 2, T.od / 2 - T.w), cylP('shaft', 'al', D.shaft[0], D.shaft[1], T.od / 2, T.od / 2 - T.w),
      cylP('uj', 'env', D.side[1], D.shaft[0], DRIVE.uj.r), cylP('knob', 'env', D.knob[0], D.knob[1], DRIVE.knob.d / 2),
      ...D.brgs.flatMap((b) => [boxP('bearing', 'nylon', b.c, DRIVE.brg, { holes: [{ ax: 1, u: b.c[0], v: b.c[2], r: T.od / 2 + 0.01 }] }),
        boxP('bracket', 'al', [(b.c[0] - DRIVE.brg[0] / 2 + b.wall) / 2, b.c[1], b.c[2] + b.up * (DRIVE.brg[2] / 2 + 0.045)], [Math.abs(b.wall - (b.c[0] - DRIVE.brg[0] / 2)), DRIVE.brg[1], 0.09])])]; }
  P['LEZ-28-140'] = [cylP('body', 'env', Pm.a, Pm.b, r), ...[0.8, 3.2].map((k) => cylP('bracket', 'ss', [Pm.a[0], Pm.a[1] + k - 0.25, zc], [Pm.a[0], Pm.a[1] + k + 0.25, zc], r + 0.03, r)),
      boxP('bracket', 'al', [Pm.a[0], Pm.a[1] + 2, zc - r - 0.075], [1.8, 3.4, 0.09]), ...[-1, 1].map((k) => boxP('bracket', 'al', [Pm.a[0] + k * 0.855, Pm.a[1] + 2, (zb + zc - r - 0.12) / 2], [0.09, 3.4, zc - r - 0.12 - zb]))]; }
  P['LEZ-28-150'] = [...tubeP(L.vToPump, TUBE.feed.od, TUBE.feed.w, 'run1'), ...tubeP(L.pToFft, TUBE.feed.od, TUBE.feed.w, 'run2'), ...tubeP(L.fftToFw, TUBE.feed.od, TUBE.feed.w, 'run3')];
  { const U = L.UNION; P['LEZ-28-155'] = [cylP('union', 'steel', [U.bl, U.fwd[1], U.wl], [U.bl, U.aft[1], U.wl], 0.28, 0.16), cylP('nut', 'steel', [U.bl, L.fire, U.wl], [U.bl, L.fire + 0.25, U.wl], 0.42, 0.29)]; }
  P['LEZ-28-160'] = SIDES.flatMap((sg) => tubeP(L.vent.pts.map((q) => MX(q, sg)), TUBE.vent.od, TUBE.vent.w, sg > 0 ? 'ventR' : 'ventL'));
  P['LEZ-28-165'] = SIDES.flatMap((sg) => { const v = L.vent, X = (q) => MX(q, sg); return [cylP('union', 'al', X([v.pick[0], v.fsOut, v.zIn + 0.25]), X([v.pick[0], v.fsOut, v.zSkin + 0.03]), 0.22, 0.10), cylP('nut', 'al', X([v.pick[0], v.fsOut, v.zIn + 0.25]), X([v.pick[0], v.fsOut, v.zIn + 0.45]), 0.33, 0.22)]; });
  // rev 2026-11-19: Usher UD-3-F (cap top Ø 2-5/16, ring Ø 3-3/4, 0.375 lb each: vendor mass, the solids as envelopes); the ring
  // top follows the crown, 0.01 in under the lowest OML point on its edge
  P['LEZ-28-170'] = SIDES.flatMap((sg) => { const f = L.filler, X = (q) => MX(q, sg), rr = f.capD / 2, ringTop = Math.min(f.zTop, ...[0, 1, 2, 3, 4, 5, 6, 7].map((k) => omlTop(f.bl + rr * Math.cos(k * Math.PI / 4), f.fs + rr * Math.sin(k * Math.PI / 4)))) - 0.01;
    return [cylP('cap', 'env', X([f.bl, f.fs, f.zTop - 0.30]), X([f.bl, f.fs, f.zTop]), 2.3125 / 2, f.neckD / 2 - 0.1), cylP('ring', 'env', X([f.bl, f.fs, ringTop - 0.10]), X([f.bl, f.fs, ringTop]), rr, 2.3125 / 2),
      cylP('neck', 'env', X([f.bl, f.fs, f.zNeck]), X([f.bl, f.fs, f.zTop - 0.30]), f.neckD / 2, f.neckD / 2 - 0.06)]; });
  P['LEZ-28-180'] = SIDES.map((sg) => { const q = L.QD(sg); return cylP('drain', 'brass', q.face, q.top, 0.30, 0.12); });
  P['LEZ-28-185'] = SIDES.flatMap((sg) => tubeP(L.drainLine(sg), TUBE.drain.od, TUBE.drain.w, sg > 0 ? 'drainR' : 'drainL'));
  P['LEZ-28-190'] = SIDES.flatMap((sg) => { const g = L.gauge, X = (q) => MX(q, sg); return [cylP('tube', 'nylon', X([g.x, g.fs, g.zLo]), X([g.x, g.fs, g.zHi]), TUBE.gauge.od / 2, TUBE.gauge.od / 2 - TUBE.gauge.w),
    ...[g.zLo, g.zHi].map((z) => cylP('fitting', 'al', X([g.x, g.fs, z]), X([R1.out, g.fs, z]), 0.22, 0.11))]; });
  { const G = L.gasc, hd = GASC_ENV.head, FWs = L.FWs, f = L.fire, plate = [0.90, 3.90, 27.60, 30.05 - 0.09];
    P['LEZ-73-100'] = [cylP('plate', 'steel', [1.60, FWs, 28.20], [1.60, f + 0.25, 28.20], 0.095), cylP('plate', 'steel', [3.20, FWs, 28.20], [3.20, f + 0.25, 28.20], 0.095),
      boxP('plate', 'al', [(plate[0] + plate[1]) / 2, f + 0.045, (plate[2] + plate[3]) / 2], [plate[1] - plate[0], 0.09, plate[3] - plate[2]], { holes: [{ ax: 1, u: 1.60, v: 28.20, r: 0.0955 }, { ax: 1, u: 3.20, v: 28.20, r: 0.0955 }] }),
      boxP('shelf', 'al', [(0.0 + 2.3) / 2, (f + G.c[1] + hd[1] / 2 + 0.15) / 2, G.headBot - 0.045], [2.3, G.c[1] + hd[1] / 2 + 0.15 - f, 0.09], { holes: [{ ax: 2, u: G.c[0], v: G.c[1], r: GASC_ENV.bowlD / 2 + 0.05 }] }),
      boxP('head', 'env', G.c, hd), cylP('bowl', 'env', [G.c[0], G.c[1], G.headBot], [G.c[0], G.c[1], G.bowlBot], GASC_ENV.bowlD / 2),
      cylP('drain', 'steel', [G.c[0], G.c[1], G.bowlBot], G.drainTip, 0.19, 0.09)]; }
  P['LEZ-73-110'] = [...tubeP(L.riser, TUBE.feed.od, TUBE.feed.w, 'riser', 'al'), ...tubeP(L.hose1, HOSE6.od, (HOSE6.od - HOSE6.id) / 2, 'hose1', 'hose'), ...tubeP(L.hose2, HOSE6.od, (HOSE6.od - HOSE6.id) / 2, 'hose2', 'hose'),
    cylP('tee', 'steel', [L.eng.carbIn[0], L.eng.carbIn[1], L.eng.carbIn[2]], [L.eng.carbIn[0], L.eng.carbIn[1] - 0.9, L.eng.carbIn[2]], 0.30, 0.16)];
  return P;
}
/** vendor masses (lb, per item, typed from memory) of the bought-in envelopes */
export const VENDOR = { 'LEZ-28-135': 2 * 0.30 + 0.08 + 0.06, 'LEZ-28-130': 0.70, 'LEZ-28-140': 1.10, 'LEZ-73-100': 0.335, 'LEZ-28-170': 2 * 0.375 };   // GAS375 152 g without fittings (Andair, accessed 2026-11-19); Facet pump 1.10 BOUND
export const QTY = { 'LEZ-28-110': 2, 'LEZ-28-160': 2, 'LEZ-28-165': 2, 'LEZ-28-170': 2, 'LEZ-28-180': 2, 'LEZ-28-185': 2, 'LEZ-28-190': 2 };
export function groupVolsF(prims) { const g = {}; for (const p of prims) { let v; if (p.t === 'box') v = p.d[0] * p.d[1] * p.d[2] - (p.holes || []).reduce((a, h) => a + Math.PI * h.r * h.r * p.d[h.ax], 0); else { const Lq = len(sub(p.b, p.a)); v = Math.PI * (p.r * p.r - (p.ri || 0) ** 2) * Lq; } g[p.group] = (g[p.group] || 0) + v; } return g; }
/** mass per item (lb): solid groups × density, plus the vendor's mass for bought-in envelopes, over the quantity drawn */
export const massEachF = (pn, prims) => (Object.entries(groupVolsF(prims)).reduce((a, [g, v]) => a + v * RHO[g], 0) + (VENDOR[pn] || 0) * (pn === 'LEZ-73-100' || pn === 'LEZ-28-170' || pn === 'LEZ-28-130' || pn === 'LEZ-28-135' || pn === 'LEZ-28-140' ? 1 : 0)) / (QTY[pn] || 1);
