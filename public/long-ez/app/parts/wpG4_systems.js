// WPG4 — block G induction, exhaust and oil: LEZ-71-250 carb air scoop (laminate), LEZ-71-251 air box with the carb-heat
// flapper, LEZ-71-252 filter, LEZ-78-100 exhaust stacks, LEZ-78-110 carb-heat muff and SCAT, LEZ-79-100 oil,
// LEZ-79-110 oil cooler (on the lower rear baffle wall, engine-mounted, ICD G-F7) and LEZ-79-115 cooler hoses (re-routed
// clear of the mount, ICD G-F5). Definition frame in inches (x = BL, y = FS aft, z = WL up).
// The scoop, air box and filter numbers mirror wp10 (SCOOP, AB, FILTER; the scoop mirrors airframe/build.py SC).
// Notional; values typed from memory are BOUNDs or say so.
import { GEO, fusAt, registerChecks, mk, aircraft, WEIGHT_CASES, DEFAULT_DESIGN, effective, FIXED } from '../structures.js';
import { partByPN, SEP } from '../systems.js';
import { ENG, MOUNT } from './wp1_powerplant.js';
import { SCOOP, scoopDims } from './wp10_induction_gear.js';
import { O235 } from './engine_o235.js';
import { r4, P3, RHO, cupPrims, enginePrims } from './wpG1_engine.js';
import { pathPrims } from '../defn/g_prims.js';
import { contour, zBelly, CWL, BAF, nacaArea } from './wpG3_cowl.js';

const IN = 12, sub = (a, b) => a.map((v, i) => v - b[i]), add = (a, b) => a.map((v, i) => v + b[i]), mul = (a, k) => a.map((v) => v * k), dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], len = (a) => Math.hypot(...a);
const T3 = (q) => q.map(r4);
// mirrors of wp10's constants (ft)
const CARB_S = ENG.accFace + 0.27;
/** air box rev B (inches, [BL, FS, WL]): entirely below the carburettor flange (WL 24.48). Floor in three steps under the
 *  inclined filter, so it follows the blister's rising forward face; ram air enters the front below the filter, filtered
 *  air rises to the throat; the heat spigot and the carb-heat arm sit in the lid left of the carburettor (ICD G-O1). */
export const AB = { x0: -4.20, x1: 1.40, y0: 134.5, y1: 142.5, lid: 24.48, floors: [[134.5, 136.1, 22.40], [136.1, 138.1, 21.60], [138.1, 140.9, 21.20], [140.9, 142.5, 21.80]] };   // rev D (last step up where the blister tapers): aft wall at FS 168.0 for the spigot aft of the carb arms' sweeps (H-O1)
/** filter rev B: 5.4 × 5.48 × 0.96 in (29.6 in², ≥ the old 29.0), inclined 25° aft end down, front-top edge under the lid */
const FILTER = { L: 5.4, W: 5.48, T: 0.96, pitch: 25, top: [134.95, 24.40], y: (AB.x0 + AB.x1) / 2 };
FILTER.len = FILTER.L / 12; FILTER.w = FILTER.W / 12;   // ft, for the induction check's face area
/** the heat port (BL, FS, WL in): the 2 in spigot sits inside the box's left half (wp10 had it 0.4 in past the side wall) */
/** the 2 in heat spigot stands up from the lid left of the carburettor; the SCAT ends on its top (= LEZ-71-251 HEAT-IN) */
export const SPIGOT = { x: -3.1, y: 141.1, h: 1.0, r: 1.0 };   // rev D: ≥ 1 in aft of the rev B carb arms' rod sweeps and conduits (H-O1)
export const HEAT_PORT = [SPIGOT.x, SPIGOT.y, r4(AB.lid + SPIGOT.h)];
/** the carb-heat control arm on the lid aft of the spigot: its top is where block H's cable lands (ICD G-O3) */
/** carb-heat arm rev D (H-O1): a crank on the flapper pin. The pin runs along BL under the lid at the heat port's forward
 *  edge and out through the box's left wall; the arm hangs below it in the plane BL −4.60 and swings fore and aft, so the
 *  cable comes straight aft from its conduit end on a bracket at the box's front-left corner. COLD: tip aft (flapper seals
 *  the heat port); HOT: tip forward (cable pulled; flapper down, ram air shut off, heated air in). Travel 90°, ±45° about
 *  straight down. */
export const HEAT_ARM_G = (() => { const pivot = [-4.60, 139.90, 24.30], r = 1.00, travel = 90, at = (deg) => { const a = deg * Math.PI / 180; return [pivot[0], r4(pivot[1] + r * Math.sin(a)), r4(pivot[2] - r * Math.cos(a))]; };
  return { axis: 'BL', pivot, r, travel, plane: pivot[0], mid: at(0), cold: at(45), hot: at(-45), at, conduitEnd: [pivot[0], r4(137.00 - 1.5 * Math.cos(18 * Math.PI / 180)), r4(24.45 + 1.5 * Math.sin(18 * Math.PI / 180))], conduitDown: 18, cableDir: [0, r4(Math.cos(18 * Math.PI / 180)), r4(-Math.sin(18 * Math.PI / 180))], /* rev 2026-11-19 (block H): 18° axis, 1.5 in back, for the A-920's ±4° swivel */ pinIn: SPIGOT.x + 1.08 }; })();   // rev D: the conduit-end bracket at block H's end (BL −4.60, FS 162.50, WL 24.75, axis 25° down: ICD H §7.6), on the left wall's top edge
export const ARM_AT = HEAT_ARM_G.cold;   // kept for block H's I1 (rod end on the arm at COLD)
export const SHEET = { box: 0.040, glass2: 2 * 0.010 };

// ------------------------------------------------------------------------------------------- scoop (LEZ-71-250)
// scoopDims: wp10 (the one law for the scoop, = airframe/build.py)
/** the blister's lower-half ring at s (ft), scaled; inches [BL, FS, WL] (= airframe/build.py scoop_ring) */
export function scoopRing(s, off = 0, n = 16) { const [hw, d] = scoopDims(s), zb = fusAt(s).bot, out = [];
  for (let i = 0; i < n; i++) { const th = Math.PI + Math.PI * i / (n - 1), c = Math.cos(th), sn = Math.sin(th); const yy = SCOOP.y + (hw - off) * Math.sign(c) * Math.abs(c) ** 0.8, zz = zb + 0.06 + (d + 0.06 - off) * Math.sign(sn) * Math.abs(sn) ** 0.8; out.push([yy * IN, s * IN, zz * IN]); }
  return out; }
export const SCP = { n: 10, t: SHEET.glass2 };
/** the blister's interior as boxes (in, [BL, FS, WL]) for the systems' OML envelope: per station band, layers each as wide
 *  as the inner ring at the layer's lower edge, from the blister's inner bottom up to the cowl line */
export function scoopEnvelope() {
  // the OML (outer skin) per 0.34 in band and thin layer, each box as wide as the wider of its two stations at the layer's
  // upper edge: a slight over-approximation used for the systems' containment; LEZ-71-250 I1 checks the true inner skin
  const o = [], n = 96, L = 24, s0 = SCOOP.s0, s1 = SCOOP.s1 - 0.02;
  for (let i = 0; i < n; i++) {
    const a = s0 + (s1 - s0) * i / n, b = s0 + (s1 - s0) * (i + 1) / n, rings = [scoopRing(a, 0, 121), scoopRing(b, 0, 121)];
    const top = Math.max(fusAt(a).bot, fusAt(b).bot) * IN + 0.05, bot = Math.min(...rings.map((r) => Math.min(...r.map((q) => q[2])))) + 1e-3;
    for (let k = 0; k < L; k++) { const z0 = bot + (top - bot) * k / L, z1 = bot + (top - bot) * (k + 1) / L;
      const span = rings.map((r) => blisterSpan(r, Math.min(z1, top - 0.06))).filter(Boolean);   // the layer's upper edge: each box covers its layer if (!span.length) continue;
      const y0 = Math.min(...span.map((x) => x[0])), y1 = Math.max(...span.map((x) => x[1])); if (y1 - y0 < 0.1) continue;
      o.push({ c: [(y0 + y1) / 2, (a + b) / 2 * IN, (z0 + z1) / 2], d: [y1 - y0, (b - a) * IN, z1 - z0] }); }
  }
  return o;
}
/** the ring's BL span at height z (in): where the lower-half polyline crosses z on each side */
export function blisterSpan(r, z) {
  const xs = []; for (let i = 1; i < r.length; i++) { const p = r[i - 1], q = r[i]; if ((p[2] - z) * (q[2] - z) <= 0 && p[2] !== q[2]) xs.push(p[0] + (q[0] - p[0]) * (z - p[2]) / (q[2] - p[2])); }
  return xs.length >= 2 ? [Math.min(...xs), Math.max(...xs)] : null;
}
/** inside the blister's inner skin by at least m (in)? point [BL, FS, WL] */
export function inBlister(p, m = 0) {
  const s = p[1] / IN; if (s < SCOOP.s0 || s > SCOOP.s1) return false; if (p[2] >= fusAt(s).bot * IN) return true;
  const sp = blisterSpan(scoopRing(s, SCP.t / IN, 121), p[2] - m); return !!sp && p[0] >= sp[0] + m && p[0] <= sp[1] - m;
}
scoopEnvelope.mouthZ = () => { const r = scoopRing(SCOOP.s0, SCP.t / IN, 41); return (Math.min(...r.map((q) => q[2])) + fusAt(SCOOP.s0).bot * IN) / 2; };
export function scoopPrims() {
  const o = [], st = Array.from({ length: SCP.n + 1 }, (_, i) => SCOOP.s0 + (SCOOP.s1 - 0.02 - SCOOP.s0) * i / SCP.n);
  for (let i = 0; i < SCP.n; i++) { const sec = (s) => T3s([...scoopRing(s), ...scoopRing(s, SCP.t / IN).reverse()]); o.push({ t: 'loft', feat: 'shell', group: 'lam', secs: [sec(st[i]), sec(st[i + 1])] }); }
  return o;
}
const T3s = (pts) => pts.map(T3);
/** ram inlet opening below the cowl skin (in²): the blister's ring area at the inlet station below the skin line */
export function scoopInlet() { const r = scoopRing(SCOOP.s0, SCP.t / IN, 120), zs = fusAt(SCOOP.s0).bot * IN; let a = 0; for (let i = 1; i < r.length; i++) { const dy = r[i][0] - r[i - 1][0], z = (r[i][2] + r[i - 1][2]) / 2; a += Math.max(0, zs - z) * Math.abs(dy); } return a; }

// ------------------------------------------------------------------------------------------- air box (LEZ-71-251), filter (LEZ-71-252)
export function airboxPrims() {
  const t = SHEET.box, o = [], B = (feat, c, d, extra = {}) => o.push({ t: 'box', feat, group: 'al', c: T3(c), d: T3(d), ...extra });
  const { x0, x1, y0, y1, lid } = AB, xc = (x0 + x1) / 2, w = x1 - x0;
  AB.floors.forEach(([a, b, z], k) => B('box', [xc, (a + b) / 2, z - t / 2], [w, b - a, t], k === AB.floors.length - 1 ? { holes: [{ ax: 2, u: xc, v: b - 0.5, r: 0.18 }] } : {}));   // stepped floor, drain at the low aft corner
  AB.floors.slice(0, -1).forEach(([, b, z], k) => { const z2 = AB.floors[k + 1][2]; B('box', [xc, b, (z + z2) / 2 - t / 2], [w, t, Math.abs(z - z2)]); });   // risers between the steps (up or down)
  for (const x of [x0 + t / 2, x1 - t / 2]) for (const [a, b, z] of AB.floors) B('box', [x, (a + b) / 2, (z - t + lid) / 2], [t, b - a, lid - z + t]);   // side walls, stepped with the floor
  B('box', [xc, y1 - t / 2, (AB.floors.at(-1)[2] + lid) / 2], [w - 2 * t, t, lid - AB.floors.at(-1)[2]]);            // aft wall
  B('box', [xc, y0 + t / 2, (FILTER.top[1] - 1.0 + lid) / 2], [w - 2 * t, t, lid - (FILTER.top[1] - 1.0)]);          // front wall above the ram opening
  B('lid', [xc, (y0 + y1) / 2, lid - t / 2], [w, y1 - y0, t], { holes: [{ ax: 2, u: 0, v: CARB_S * IN, r: 0.875 }, { ax: 2, u: SPIGOT.x, v: SPIGOT.y, r: SPIGOT.r }] });
  B('adapter', [0, CARB_S * IN, 2.045 * IN], [3.6, 3.6, 0.125], { holes: [{ ax: 2, u: 0, v: CARB_S * IN, r: 0.875 }] });
  o.push({ t: 'cyl', feat: 'spigot', group: 'al', a: T3([SPIGOT.x, SPIGOT.y, lid]), b: T3(HEAT_PORT), r: SPIGOT.r, ri: SPIGOT.r - t });
  B('flapper', [SPIGOT.x, SPIGOT.y, lid - t - 0.06], [2.16, 2.16, 0.063]);   // door under the port, hinged at its forward edge on the pin
  const H = HEAT_ARM_G;
  o.push({ t: 'cyl', feat: 'flapper', group: 'steel', a: T3([H.plane + 0.10, H.pivot[1], H.pivot[2]]), b: T3([H.pinIn, H.pivot[1], H.pivot[2]]), r: 0.094 });   // flapper pin along BL, out through the left wall
  B('arm', [H.plane, H.pivot[1], H.pivot[2] - H.r / 2], [0.19, 0.36, H.r + 0.18]);   // carb-heat crank on the pin, hanging down (mid travel)
  // rev D: conduit-end bracket at block H's end fitting: a 0.063 tab normal to FS beside the left wall, the fitting through
  // its hole at the end point, and a foot riveted to the wall's outer face below the lid edge
  const E = H.conduitEnd; B('bracket', [r4((x0 - 0.75 + x0) / 2), E[1], r4(E[2] - 0.10)], [0.75, 0.063, 0.90], { holes: [{ ax: 1, u: E[0], v: E[2], r: 0.19 }] });
  B('bracket', [r4(x0 - 0.0315), E[1] + 0.30, r4((lid - 0.70 + lid) / 2)], [0.063, 0.70, 0.70]);
  return o;
}
/** the carb-heat arm's tip at COLD, where block H's cable end attaches (rev D: from HEAT_ARM_G, not the lid) */
export const ARM = () => HEAT_ARM_G.cold;
/** the filter element as a loft between its two side faces (planes of constant BL), pitched aft-end-down */
export function filterPrims() {
  const F = FILTER, pc = F.pitch * Math.PI / 180, e = [Math.cos(pc), -Math.sin(pc)], nrm = [Math.sin(pc), Math.cos(pc)];   // (FS, WL) along the element and normal to its top face
  const c = [F.top[0] + F.L / 2 * e[0] - F.T / 2 * nrm[0], F.top[1] + F.L / 2 * e[1] - F.T / 2 * nrm[1]];
  const face = (x) => [[-F.L / 2, -F.T / 2], [F.L / 2, -F.T / 2], [F.L / 2, F.T / 2], [-F.L / 2, F.T / 2]].map(([u, v]) => T3([x, c[0] + u * e[0] + v * nrm[0], c[1] + u * e[1] + v * nrm[1]]));
  return [{ t: 'loft', feat: 'element', group: 'foam', secs: [face(F.y - F.W / 2), face(F.y + F.W / 2)] }];
}
export const FOAM = { rho: 0.004, ratedCfm: 200 };   // oiled reticulated foam with a light frame (lb/in³), rated flow: typed from memory

// ------------------------------------------------------------------------------------------- exhaust (LEZ-78-100), muff + SCAT (LEZ-78-110)
const SRC_EXH = (partByPN('LEZ-78-100')?.geo || []).filter((g) => g.t === 'path').map((g) => g.pts.map((q) => P3(q)));
const SRC_MUFF = partByPN('LEZ-78-110')?.geo.find((g) => g.t === 'path')?.pts.map((q) => P3(q)) || [];
export const EXH = { od: 1.5, w: 0.035, fl: { t: 0.25, L: 2.4, W: 1.6, stud: 0.3125 / 2, pitch: 1.75 }, paths: SRC_EXH, exitSeg: 'last' };   // the exit segment is each stack's last (ICD G phase 2: the runs have 4 or 5 segments)
export function exhaustPrims() {
  const o = [];
  for (const pts of EXH.paths) {
    o.push(...pathPrims(pts, EXH.od / 2, EXH.od / 2 - EXH.w, 'stack', 'ss'));
    const p = pts[0]; o.push({ t: 'box', feat: 'flange', group: 'ss', c: T3([p[0], p[1], p[2] + EXH.fl.t / 2]), d: [EXH.fl.W, EXH.fl.L, EXH.fl.t], holes: [-1, 1].map((k) => ({ ax: 2, u: r4(p[0]), v: r4(p[1] + k * EXH.fl.pitch / 2), r: EXH.fl.stud + 0.01 })) });
  }
  return o;
}
export const exhExits = () => EXH.paths.map((pts) => pts.at(-1));
/** SCAT waypoints between the muff and the heat spigot (in): clear of the sump, the carburettor, the cups and the stacks */
export const SCAT_PATH = [[-6.5, 147.90, 28.8], [-5.6, 144.00, 28.3], [-5.3, 142.80, 27.1]];   // rev D: comes down aft of the carb arms onto the spigot (H-O1)
export const MUFF = { gap: 0.25, w: 0.032, L: 12.0, at: 0.1, h: 35 };
const lrStack = () => EXH.paths.reduce((a, p) => (p[0][0] < 0 && (!a || p[0][1] < a[0][1]) ? p : a), null);   // left-rear: lowest FS on −BL
/** the muff sits on the left-rear stack's longest run before the exit */
const muffSeg = (P) => { let k = 2; for (let i = 2; i < P.length - 1; i++) if (len(sub(P[i], P[i - 1])) > len(sub(P[k], P[k - 1]))) k = i; return k; };
export function muffPrims() {
  const P = lrStack(), li = muffSeg(P), a = P[li - 1], b = P[li], e = mul(sub(b, a), 1 / len(sub(b, a))), p0 = add(a, mul(e, MUFF.at * len(sub(b, a)))), p1 = add(p0, mul(e, MUFF.L)), ri = EXH.od / 2 + MUFF.gap;
  // rev B: from the muff's forward (outlet) end inboard under the left-rear cylinder, forward outboard of the sump, round
  // the sump's front and down beside the carburettor into the blister, onto the heat spigot (ICD G-O1)
  const scat = [p0.map((v, i) => v + [1.8, 0, -0.5][i]), ...SCAT_PATH, HEAT_PORT];   // the outlet spigot on the shroud's inboard-lower side (clear of the crankcase and the stack)
  return [{ t: 'cyl', feat: 'muff', group: 'ss', a: T3(p0), b: T3(p1), r: r4(ri + MUFF.w), ri: r4(ri) }, ...pathPrims(scat, 1.06, 1.0, 'scat', 'scat')];
}
export const SCAT_RHO = 0.12 / 12 / (Math.PI * (1.06 ** 2 - 1.0 ** 2));   // 0.12 lb/ft of 2 in SCAT (typed) over the drawn wall

// ------------------------------------------------------------------------------------------- oil cooler (LEZ-79-110), hoses (LEZ-79-115)
/** Aero-Classics 8000074 9-row: 8.14 W × 5.33 H × 3.62 D in, 3/8 NPT ports (-8 AN adapters), PMA, 400 psig test (Aircraft Spruce, accessed
 *  2026-11-19); the envelope here is smaller (BOUND: re-fit on receipt); dry 2.5 lb and 30,000 BTU/h BOUND (not published) */
export const COOLER = { y0: 7.5, x: [BAF.rearS - BAF.t / 2 - 2.4, BAF.rearS - BAF.t / 2], z: [29.0, 33.8], W: 3.6, dryLb: 2.5, ratedBtu: 30000 };
COOLER.y1 = COOLER.y0 + COOLER.W;
export const CUT = { y0: COOLER.y0 + 0.3, y1: COOLER.y1 - 0.3, z0: COOLER.z[0] + 0.3, z1: COOLER.z[1] - 0.3 };
export const COOLER_PORTS = { IN: [COOLER.y0, 138.00, 33.0], OUT: [COOLER.y0, 139.30, 33.0] };   // on the inboard face
export function coolerPrims() {
  const C = COOLER, o = [];
  o.push({ t: 'box', feat: 'core', group: 'core', c: T3([(C.y0 + C.y1) / 2, (C.x[0] + C.x[1]) / 2, (C.z[0] + C.z[1]) / 2]), d: [C.W, C.x[1] - C.x[0], C.z[1] - C.z[0]] });
  // bracket: 0.063 doubler frame on the wall's forward face round the cut-out, and a strap from the cooler's top to the crankcase side
  const t = 0.063, Bx = (feat, c, d) => o.push({ t: 'box', feat, group: 'al', c: T3(c), d: T3(d) }), ya = BAF.rearS + BAF.t / 2 + t / 2;
  for (const z of [C.z[1] + 0.5, C.z[0] - 0.5]) Bx('bracket', [(C.y0 + C.y1) / 2, ya, z], [C.W + 0.6, t, 1.0]);   // doubler bands on the wall's aft face
  Bx('bracket', [(5.4 + C.y0) / 2, (C.x[0] + C.x[1]) / 2, C.z[1] + t / 2], [C.y0 - 5.4, 1.0, t]);                  // strap to the crankcase side
  return o;
}
/** -8 oil hose: Stratoflex 111-8, ID 0.406, OD 0.77 bare, 0.26 lb/ft bare, 2,000 psi, −65 to +250 °F (Aircraft Spruce 111 table, accessed
 *  2026-11-19); fire sleeve to OD 1.0 (BOUND); smeared density so 1 ft ≈ 0.26 + 0.07 (sleeve, BOUND) lb */
export const HOSE = { od: 1.0, id: 0.406, rho: 0.033 };
/** the engine's oil-cooler ports, on the crankcase's right side behind the mount ring (ICD G-F5, G-F7): the hoses run
 *  straight outboard into the cooler's inboard face, clear of the ring tube, the cups and the isolators (positions
 *  approximate: the engine's installation drawing governs) */
export const OIL_PORTS = { OUT: [5.4, 138.00, 33.0], RTN: [5.4, 139.30, 33.0] };
export const HOSES = () => {
  const I = COOLER_PORTS.IN, O = COOLER_PORTS.OUT;
  return [
    { name: 'engine to cooler', from: 'LEZ-71-210:OIL-OUT', to: 'LEZ-79-110:IN', pts: [OIL_PORTS.OUT, I].map(T3) },
    { name: 'cooler to engine', from: 'LEZ-79-110:OUT', to: 'LEZ-71-210:OIL-RTN', pts: [O, OIL_PORTS.RTN].map(T3) },
  ];
};
export const hosePrims = () => HOSES().flatMap((h, i) => pathPrims(h.pts, HOSE.od / 2, HOSE.id / 2, i ? 'return' : 'supply', 'hose'));

// ------------------------------------------------------------------------------------------- clearances
function segDist(p1, q1, p2, q2) { const d1 = sub(q1, p1), d2 = sub(q2, p2), r = sub(p1, p2), a = dot(d1, d1), e = dot(d2, d2), f = dot(d2, r); let s, t;
  if (a < 1e-12) { s = 0; t = Math.min(1, Math.max(0, f / e)); } else { const c = dot(d1, r); if (e < 1e-12) { t = 0; s = Math.min(1, Math.max(0, -c / a)); } else { const b = dot(d1, d2), den = a * e - b * b; s = den > 1e-12 ? Math.min(1, Math.max(0, (b * f - c * e) / den)) : 0; t = (b * s + f) / e; if (t < 0) { t = 0; s = Math.min(1, Math.max(0, -c / a)); } else if (t > 1) { t = 1; s = Math.min(1, Math.max(0, (b - c) / a)); } } }
  return len(sub(add(p1, mul(d1, s)), add(p2, mul(d2, t)))); }
const boxD = (q, p) => len([0, 1, 2].map((i) => Math.max(Math.abs(q[i] - p.c[i]) - p.d[i] / 2, 0)));
/** clearance (in) between a polyline of radius r and a set of primitives (boxes sampled along the line, cylinders exact) */
export function lineClear(pts, r, prims) {
  let w = Infinity, at = null;
  for (let i = 1; i < pts.length; i++) for (const p of prims) {
    let d;
    if (p.t === 'cyl' || p.t === 'cone') d = segDist(pts[i - 1], pts[i], p.a, p.b) - (p.r ?? Math.max(p.r1, p.r2));
    else if (p.t === 'box') { d = Infinity; const n = Math.ceil(len(sub(pts[i], pts[i - 1])) / 0.1); for (let k = 0; k <= n; k++) d = Math.min(d, boxD(add(pts[i - 1], mul(sub(pts[i], pts[i - 1]), k / n)), p)); }
    else continue;
    d -= r; if (d < w) { w = d; at = p.feat; }
  }
  return { d: w, at };
}
export const mountPrims = () => MOUNT.members.map(([a, b, od]) => ({ t: 'cyl', feat: `${a}–${b}`, a: P3(MOUNT.nodes[a]), b: P3(MOUNT.nodes[b]), r: od / 2 }));
/** stack clearance to the cowl's inner skin outside the exit segment (in) */
export function exhCowl() {
  let w = { d: Infinity };
  EXH.paths.forEach((pts, j) => { for (let i = 1; i < pts.length; i++) { if (i === pts.length - 1) continue; const n = Math.ceil(len(sub(pts[i], pts[i - 1])) / 0.25); for (let k = 0; k <= n; k++) { const q = add(pts[i - 1], mul(sub(pts[i], pts[i - 1]), k / n)); const d = innerDist(q) - EXH.od / 2; if (d < w.d) w = { d, j, q }; } } });
  return w;
}
/** distance (in) from a point inside the cowl to its inner skin, in the station plane */
function innerDist(q) { const s = q[1] / IN; let best = Infinity; for (let i = 0; i < 360; i++) { const [y, z] = contour(s, -Math.PI / 2 + 2 * Math.PI * i / 360, -CWL.t); best = Math.min(best, Math.hypot(y - q[0], z - q[2])); } return best; }
const routeLines = (re) => (partByPN ? [] : []).concat(...['LEZ-73-110', 'LEZ-28-150', 'LEZ-77-121'].map((pn) => (partByPN(pn)?.geo || []).filter((g) => g.t === 'path' && re.test(g.cls)).map((g) => ({ pts: g.pts.map(P3), r: (g.dIn || 0.5) / 2, pn }))));
export function exhSeparation() {
  const stacks = exhaustPrims().filter((p) => p.feat === 'stack'), rows = [];
  const fuel = routeLines(/fuel|oil/), hoses = HOSES().map((h) => ({ pts: h.pts, r: HOSE.od / 2, pn: 'LEZ-79-115' }));
  let f = { d: Infinity }; for (const L of [...fuel, ...hoses]) { const c = lineClear(L.pts, L.r, stacks); if (c.d < f.d) f = { d: c.d, pn: L.pn }; }
  const sc = muffPrims().filter((p) => p.feat === 'scat'), scatPts = [sc[0].a, ...sc.map((p) => p.b)];
  const lr = lrStack(), onLR = (q) => lr.some((x) => Math.abs(x[0] - q[0]) < 1e-3 && Math.abs(x[1] - q[1]) < 1e-3 && Math.abs(x[2] - q[2]) < 1e-3), others = exhaustPrims().filter((p) => p.feat === 'stack' && !onLR(p.a));
  const s = lineClear(scatPts, 1.06, others);
  rows.push(f, s); return { fuel: f, scat: s };
}

// ------------------------------------------------------------------------------------------- checks
const IN_ = (n, v, u, s = 'DERIVED') => [n, v, u, s];
export function induction(d) {
  const ac = aircraft(d, WEIGHT_CASES[0]), Vy = 1.4 * ac.Vs * 1.6878, Q = O235.dispCuIn * O235.rpm / 2 * 0.85 / 1728, F = FILTER;
  const fArea = F.len * F.w * 144, Ain = scoopInlet(), Areq = Q / 60 / (0.7 * Vy) * 144, Aalt = Math.PI * 2.0 ** 2 / 4, bore = 1.75, Acarb = Math.PI * bore ** 2 / 4;
  const terms = [['filter flow vs rating', FOAM.ratedCfm / Q - 1], ['ram inlet capture at climb', Ain / Areq - 1], ['alternate (heat) air area vs carb bore', Aalt / Acarb - 1]].sort((a, b) => a[1] - b[1]);
  return { Q, fArea, Ain, Areq, Aalt, Acarb, bore, Vy, terms, etaMax: 0.85 * Math.min(FOAM.ratedCfm / Q, Ain / Areq), boreMax: 2.0 };
}
// ------------------------------------------------------------------------------------------- scoop rev B: ground line, drag
/** the blister's outer bottom points (in, [BL, FS, WL]) along its length */
export const scoopBottom = () => Array.from({ length: 41 }, (_, i) => { const s = SCOOP.s0 + (SCOOP.s1 - SCOOP.s0) * i / 40, r = scoopRing(s, 0, 41); return r.reduce((a, q) => (q[2] < a[2] ? q : a)); });
/** height (in) of a point above the ground line after a nose-up rotation θ (rad) about the main-wheel contact (FS, z = 0) */
const rotZ = (q, th) => { const sm = GEO.gear.s * IN; return q[2] * Math.cos(th) - (q[1] - sm) * Math.sin(th); };
export function scoopGround() {
  const tip = [0, GEO.prop.s * IN, (GEO.prop.z - GEO.prop.r) * IN], th = Math.atan2(tip[2], tip[1] - GEO.gear.s * IN), B = scoopBottom();
  const lo = (t) => B.reduce((a, q) => { const h = rotZ(q, t); return h < a.h ? { h, q } : a; }, { h: Infinity });
  const level = lo(0), strike = lo(th), path = Array.from({ length: 21 }, (_, i) => th * i / 20).map((t) => lo(t).h - rotZ(tip, t));   // blister above the prop tip all the way up
  return { th, deg: th * 180 / Math.PI, level, strike, above: Math.min(...path), tipLevel: tip[2], req: 3.0 };
}
export const SCOOP_A = { hw: 0.36, d: 0.30 };   // rev A blister at its peak (ft), for the drag increment
export const DRAG = { cd: 0.25, share: 0.03, etaP: 0.80, power: 0.75 };   // Cd on the added frontal area (typed, BOUND), allowance 3 % of cruise drag (DESIGN: the accepted cost of the owner's deeper-scoop decision, ICD G-O1), cruise power and prop efficiency (typed)
export function scoopDrag(d) {
  // frontal area below the cowl line: the ring is a super-ellipse (exponent 2.5) of half-width hw and depth d + 0.06 ft about zb + 0.06 ft; take the part below zb
  const below = (hw, dd) => { const n = 600; let a = 0; for (let i = 0; i < n; i++) { const y = -hw + 2 * hw * (i + 0.5) / n, u = Math.abs(y / hw), z = 0.06 - (dd + 0.06) * (1 - u ** 2.5) ** (1 / 2.5); a += Math.max(0, -z) * 2 * hw / n; } return a * 144; };
  const A1 = below(SCOOP.hw, SCOOP.d), A0 = below(SCOOP_A.hw, SCOOP_A.d), dA = A1 - A0, V = d.VC * 1.6878, q = 0.5 * 0.002377 * V * V;
  const D = DRAG.power * O235.hp * 550 * DRAG.etaP / V, dD = q * DRAG.cd * dA / 144, ms = DRAG.share * D / dD - 1;
  return { A1, A0, dA, q, D, dD, ms, cdMax: DRAG.cd * (1 + ms) };
}
// G-O8 (final integration): separation rules from the exhaust for the route classes that had none (systems SEP; block H added
// signal|exhaust). Wiring / line practice near exhaust (AC 43.13-1B, typed from memory): 6 in, 1 in for fire-sleeved or
// shielded runs (the clash audit's SHIELDED_EXHAUST rule). air|exhaust is left out on purpose: the SCAT (LEZ-78-110) starts
// on the muff it is heated by; its distance from the stacks it does not heat is block G's own exh-clear (≥ 1 in).
for (const [k, v] of Object.entries({ 'cable|exhaust': 6, 'oil|exhaust': 6, 'pushrod|exhaust': 2, 'brake|exhaust': 6, 'pitot|exhaust': 6, 'rf|exhaust': 6 })) if (SEP[k] == null) SEP[k] = v;
/** oil consumption and fuel burn paired by power setting, both from Lycoming OM 60297-9 (5th ed.) p. 3-7, O-235-C (accessed
 *  2026-11-19): rated 115 hp 10.7 gph / 0.52 qt/h; 75 % 7.3 / 0.29; 65 % 5.8 / 0.25 (was 0.006 lb/bhp·h at 115 hp against a 6 gph
 *  cruise burn: unpaired). minQt BOUND */
export const OIL_ROWS = [['rated (115 hp, 2,800 rpm)', 10.7, 0.52], ['75 %', 7.3, 0.29], ['65 %', 5.8, 0.25]];
export const OIL = { qt: 6, lbQt: 1.875, minQt: 2.0, cons: 0.006, gal: 52, gph: 6.0, fracOil: 0.06 };
/** usable fuel for the oil endurance: block F's placarded usable quantity (2 × 23 gal), read at check time (wpF1 sets it);
 *  the old 52 gal (2 × 26 gal strakes, gross) only if block F has not loaded */
export const oilFuelGal = () => (FIXED.fuelQty ? 2 * FIXED.fuelQty.placard : OIL.gal);
registerChecks('wpG4', (d, lc) => {
  const rows = [], tag = (r, sys) => { r.sys = sys; rows.push(r); };
  if (lc.id === 'W1-S1') {
    const I = induction(d);
    tag(mk('fuselage', 'ind-air', 'Induction air: filter flow, ram inlet size, alternate air area', lc, 'carb scoop, air box, filter', I.terms[0][0], I.terms[0][1], {
      formula: 'Q = V_disp·rpm/2·η_v;  filter: MS = Q_rated/Q − 1;  inlet: A_req = Q/(0.7·V_y);  alternate air: A_SCAT ≥ A_carb bore (§23.1091 / 23.1093 yardstick)',
      inputs: [['Displacement × rpm', `${O235.dispCuIn} in³ × ${O235.rpm}`, 'text', 'TCDS E-223'], ['Volumetric efficiency η_v', 0.85, '', `BOUND: typed; MS stays ≥ 0 up to ${I.etaMax.toFixed(2)}`], ['Induction airflow', I.Q, 'cfm', 'DERIVED'], ['Filter face area', I.fArea, 'in²', 'GEOMETRY'],
        ['Filter rated flow', FOAM.ratedCfm, 'cfm', `BOUND: vendor rating typed from memory; MS stays ≥ 0 down to ${I.Q.toFixed(0)} cfm`], ['Inlet opening', I.Ain, 'in²', 'GEOMETRY: LEZ-71-250'], ['Ram recovery to the filter face (rev B: same mouth, longer diffuser, mouth → filter area ratio ' + (I.fArea / I.Ain).toFixed(1) + ')', 0.7, '', `BOUND: typed; MS stays ≥ 0 down to ${(0.7 * I.Areq / I.Ain).toFixed(2)}`], ['V_y ≈ 1.4 V_s', I.Vy / 1.6878, 'kt', 'MODEL'], ['Carb bore (MA-3 class)', I.bore, 'in', `BOUND: typed; MS stays ≥ 0 up to a ${I.boreMax.toFixed(2)} in bore`], ['Alternate-air duct', 2.0, 'in', 'DESIGN']],
      result: [['Required inlet area', I.Areq, 'in²'], ['Alternate / carb area', `${I.Aalt.toFixed(2)} / ${I.Acarb.toFixed(2)} in²`, 'text']] }), 'LEZ-71-251');
    // exhaust clearances
    const c = exhCowl(), sep = exhSeparation();
    const ms = Math.min(c.d / 1.0, sep.fuel.d / 6.0, sep.scat.d / 1.0) - 1;
    tag(mk('cowl', 'exh-clear', 'Exhaust stacks: clearance to the cowl, to fuel and oil runs and to the SCAT', lc, ms === c.d - 1 ? 'cowl inner skin' : sep.fuel.d / 6 < sep.scat.d ? `${sep.fuel.pn}` : 'SCAT', 'clearance', ms, {
      formula: 'cowl: stack surface to the inner skin ≥ 1 in outside the exit segment;  fuel/oil runs ≥ 6 in;  SCAT ≥ 1 in from the stacks it does not heat', inputs: [IN_('Cowl clearance required', 1.0, 'in', 'DESIGN'), IN_('Fuel / oil separation', 6.0, 'in', 'DESIGN (the model\'s fuel|exhaust rule)'), IN_('Stack OD', EXH.od, 'in', 'DESIGN')],
      result: [['To the cowl', c.d, 'in'], ['To fuel / oil', sep.fuel.d, 'in'], ['SCAT to other stacks', sep.scat.d, 'in']] }), 'LEZ-78-100');
    // carb heat
    const mAir = induction(d).Q * 0.75 * 0.0765 / 60, need = mAir * 0.24 * 90 * 3600, Am = Math.PI * EXH.od * MUFF.L / 144, h = MUFF.h, dT = 900, have = h * Am * dT, hMin = need / (Am * dT);
    tag(mk('cowl', 'muff-heat', 'Carb heat: temperature rise from the muff at 75 % power', lc, 'left-rear stack muff', 'heat transfer', have / need - 1, {
      formula: 'need = ṁ·c_p·90 °F (ṁ at 75 % power);  have = h·A_stack under the muff·(T_stack − T_air)', inputs: [IN_('Required rise', 90, '°F', 'FAR23: 23.1101 yardstick for venturi carburettors (typed from memory)'), IN_('Stack area under the muff', Am, 'ft²', 'GEOMETRY'), IN_('Stack-to-air temperature difference', dT, '°F', 'DESIGN'), IN_('Film coefficient h (forced flow in the shroud)', h, 'BTU/h·ft²·°F', `BOUND: typed; MS stays ≥ 0 down to h = ${hMin.toFixed(1)}`)],
      result: [['Need', need, 'BTU/h'], ['Have', have, 'BTU/h']] }), 'LEZ-78-110');
    // oil
    const gal = oilFuelGal(), usable = OIL.qt - OIL.minQt, rows = OIL_ROWS.map(([n, gph, qph]) => ({ n, gph, qph, end: gal / gph, used: qph * gal / gph })), wo = rows.reduce((a, q) => (q.used > a.used ? q : a)), end = wo.end, used = wo.used;
    tag(mk('fuselage', 'oil-qty', 'Oil quantity for the fuel endurance, burn and consumption paired at each OM power setting', lc, 'sump', `usable vs consumed (${wo.n})`, usable / used - 1, {
      formula: 'for each OM row: endurance = fuel / burn;  consumed = oil rate × endurance;  MS = (sump − minimum) / max consumed − 1', inputs: [IN_('Fuel (usable)', gal, 'US gal', FIXED.fuelQty ? 'MODEL: block F usable fuel, 2 × the placarded 23 gal (FIXED.fuelQty)' : 'MODEL (2 × 26 gal strakes)'),
        ...rows.map((q) => IN_(`${q.n}: ${q.gph} gph, ${q.qph} qt/h`, q.used, 'qt', 'Lycoming OM 60297-9 p. 3-7 (O-235-C operating conditions table; accessed 2026-11-19)')), IN_('Sump capacity', OIL.qt, 'qt', 'Lycoming OM 60297-9 (O-235-C sump 6 qt)'), IN_('Minimum safe quantity', OIL.minQt, 'qt', `BOUND: not found in public sources; MS stays ≥ 0 up to ${(OIL.qt - used).toFixed(1)} qt`)],
      result: [['Endurance', end, 'h'], ['Consumed', used, 'qt'], ['Usable', usable, 'qt']] }), 'LEZ-79-100');
    const rej = OIL.fracOil * O235.hp * 2544, msC = COOLER.ratedBtu / rej - 1;
    tag(mk('fuselage', 'olc-heat', 'Oil cooler: heat rejection at take-off power vs rating', lc, 'oil cooler', 'heat rejection', msC, {
      formula: 'Q_oil = f_oil·P;  MS = Q_rated / Q_oil − 1', inputs: [IN_('Take-off power', O235.hp, 'hp', 'TCDS E-223'), IN_('Fraction of power to the oil', OIL.fracOil, '', `BOUND: typed; MS stays ≥ 0 up to ${(OIL.fracOil * (1 + msC)).toFixed(3)}`), IN_('Cooler rating at 30 lb/min air', COOLER.ratedBtu, 'BTU/h', `BOUND: vendor class typed from memory; MS stays ≥ 0 down to ${rej.toFixed(0)} BTU/h`)],
      result: [['Q_oil', rej, 'BTU/h']] }), 'LEZ-79-110');
    // hoses
    const mp = [...mountPrims(), ...cupPrims()], hs = HOSES().map((h) => lineClear(h.pts, HOSE.od / 2, mp)), w = hs.reduce((a, b) => (b.d < a.d ? b : a));
    const eng = HOSES().map((h) => lineClear(h.pts.slice(1, -1), HOSE.od / 2, enginePrims().filter((p) => ['mag', 'case', 'acc', 'filter'].includes(p.feat)))).reduce((a, b) => (b.d < a.d ? b : a));
    const bend = Math.min(...HOSES().flatMap((h) => h.pts.slice(1, -1).map((p, i) => { const a = h.pts[i], c = h.pts[i + 2], u = mul(sub(a, p), 1 / len(sub(a, p))), v = mul(sub(c, p), 1 / len(sub(c, p))), th = Math.acos(Math.max(-1, Math.min(1, dot(u, v)))), half = (Math.PI - th) / 2; return Math.min(len(sub(a, p)), len(sub(c, p))) / 2 / Math.max(Math.tan(half), 1e-6); })));
    const msH = Math.min(w.d / 0.25, eng.d / 0.25, bend / 4.0) - 1;
    tag(mk('fuselage', 'olh-clear', 'Oil cooler hoses: clear of the mount, cups and engine; bend radius', lc, w.d / 0.25 < bend / 4 ? `near ${w.at}` : 'tightest bend', 'clearance / bend radius', msH, {
      formula: 'tube-to-hose distance − radii ≥ 0.25 in;  largest radius each bend fits between its neighbouring legs ≥ min bend radius', inputs: [IN_('Clearance required', 0.25, 'in', 'DESIGN (ICD G-F5)'), IN_('Minimum bend radius, -8 hose', 4.0, 'in', 'BOUND: typed for -8 fire-sleeved hose (SAE J1527 class)'), IN_('Hose OD over the sleeve', HOSE.od, 'in', 'DESIGN')],
      result: [['To the mount / cups', w.d, 'in'], ['To the engine envelope (away from the ports)', Number.isFinite(eng.d) ? eng.d : 'straight from the port', Number.isFinite(eng.d) ? 'in' : 'text'], ['Tightest available bend radius', Number.isFinite(bend) ? bend : 'straight runs, no bends', Number.isFinite(bend) ? 'in' : 'text']] }), 'LEZ-79-115');
  }
  if (['sym', 'emergency'].includes(lc.type)) {
    const n = Math.abs(lc.type === 'emergency' ? lc.n : lc.n * d.FS), mC = COOLER.dryLb + 0.6, Pc = mC * n, boltC = Pc / 4, msCm = 2126 / Math.max(boltC, 1) - 1;
    tag(mk('fuselage', 'olc-mount', 'Oil cooler mount: 4 × AN3 to the doubler frame under the inertia load', lc, 'cooler bracket', 'bolt shear', msCm, {
      formula: 'P = (m_cooler + oil)·n_ult, shared by 4 bolts', inputs: [IN_('Cooler + oil', mC, 'lb', 'VENDOR mass typed + 0.6 lb oil'), IN_('Ultimate load factor', n, '', lc.type === 'emergency' ? 'FAR23 emergency' : 'FAR23 × FS'), IN_('AN3 single shear', 2126, 'lb', 'AN standard')], result: [['Per bolt', boltC, 'lb']] }), 'LEZ-79-110');
    const mS = 0.35, L = 4.0, M = mS * n * L, Z = Math.PI / 32 * (EXH.od ** 4 - (EXH.od - 2 * EXH.w) ** 4) / EXH.od, sig = M / Z, Fy = 12000;
    tag(mk('fuselage', 'exh-hang', 'Exhaust stack: bending at the flange under the inertia load, hot', lc, 'stack root at the flange', 'bending', Fy / sig - 1, {
      formula: 'M = W_stack·n·ℓ;  σ = M / Z', inputs: [IN_('Stack mass beyond the flange', mS, 'lb', 'GEOMETRY (≈ the solid\'s per-stack mass)'), IN_('Lever', L, 'in', 'GEOMETRY'), IN_('Ultimate load factor', n, '', lc.type === 'emergency' ? 'FAR23 emergency' : 'FAR23 × FS'), IN_('321 SS F_ty at 1,500 °F', Fy, 'psi', `BOUND: typed; MS stays ≥ 0 down to ${sig.toFixed(0)} psi`)], result: [['σ', sig, 'psi']] }), 'LEZ-78-100');
    const mB = 1.6, Pb = mB * n / 4, msB = 2126 / Pb - 1;
    tag(mk('fuselage', 'abx-flange', 'Air box to carburettor flange: 4 × AN3 under the inertia load', lc, 'carb flange', 'bolt shear', msB, {
      formula: 'P = (box + filter + flapper)·n_ult / 4', inputs: [IN_('Box + filter', mB, 'lb', 'GEOMETRY (the records\' solids)'), IN_('Ultimate load factor', n, '', lc.type === 'emergency' ? 'FAR23 emergency' : 'FAR23 × FS'), IN_('AN3 single shear', 2126, 'lb', 'AN standard')], result: [['Per bolt', Pb, 'lb']] }), 'LEZ-71-251');
  }
  if (lc.id === 'W1-S1') {
    const g = scoopGround(), m = Math.min(g.strike.h / g.req, g.level.h / g.req, g.above > 0 ? 1e9 : 0) - 1;
    tag(mk('cowl', 'scp-ground', 'Carb scoop blister: above the ground line at level and in a nose-high rotation to prop strike', lc, `blister bottom FS ${g.strike.q[1].toFixed(1)}`, 'ground clearance', m, {
      formula: 'h(θ) = z·cos θ − (FS − FS_main)·sin θ about the main-wheel contact;  θ_strike from the prop tip;  MS = min(h_blister(θ_strike), h_blister(0)) / h_req − 1, and the blister above the prop tip for every θ ≤ θ_strike',
      inputs: [IN_('Main-wheel contact FS', GEO.gear.s * IN, 'in', 'MODEL'), IN_('Prop tip at level', g.tipLevel, 'in', 'GEOMETRY: LEZ-61-100'), IN_('Prop-strike rotation', g.deg, 'deg', 'GEOMETRY'), IN_('Required clearance', g.req, 'in', 'DESIGN')],
      result: [['Blister bottom at level', g.level.h, 'in'], ['Blister bottom at the strike rotation', g.strike.h, 'in'], ['Blister above the prop tip (worst θ)', g.above, 'in']] }), 'LEZ-71-250');
    const dr = scoopDrag(d);
    tag(mk('cowl', 'scp-drag', 'Carb scoop blister rev B: drag increment at cruise against its allowance', lc, 'blister frontal area', 'drag increment', dr.ms, {
      formula: 'ΔD = q(V_C)·C_D·ΔA (frontal area below the cowl line, rev B − rev A);  cruise drag D = P_cruise·η_p / V_C;  MS = 3 % · D / ΔD − 1;  speed cost ΔV/V ≈ ΔD / (3·D) at constant power',
      inputs: [IN_('V_C', d.VC, 'kt', 'DESIGN'), IN_('Added frontal area ΔA', dr.dA, 'in²', 'GEOMETRY: LEZ-71-250 rev B − rev A'), IN_('C_D on the added area (faired blister, aft taper ≤ 25°)', DRAG.cd, '', `BOUND: typed from memory; MS stays ≥ 0 up to ${dr.cdMax.toFixed(2)}`), IN_('Cruise power / prop efficiency', `${DRAG.power} × ${O235.hp} hp / ${DRAG.etaP}`, 'text', 'BOUND: typed (cruise drag only scales the allowance)'), IN_('Allowance', DRAG.share, '', 'DESIGN: 3 % of cruise drag (owner accepted a deeper scoop, ICD G-O1)')],
      result: [['Frontal area rev A / rev B', `${dr.A0.toFixed(1)} / ${dr.A1.toFixed(1)} in²`, 'text'], ['ΔD at V_C', dr.dD, 'lb'], ['Cruise drag', dr.D, 'lb'], ['ΔD / D', dr.dD / dr.D, ''], ['Speed cost at V_C', d.VC * dr.dD / dr.D / 3, 'kt']] }), 'LEZ-71-250');
  }
  return rows;
});
void nacaArea; void zBelly; void effective; void DEFAULT_DESIGN; void GEO;
