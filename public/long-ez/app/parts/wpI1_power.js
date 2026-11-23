// WPI1 — block I electrical analysis and definition geometry (runs after every other module has loaded its routes).
//  • Wire data (AC 43.13-1B ch. 11 values typed from memory, marked BOUND with the margin they leave), the load budget
//    (DESIGN allocations the owning blocks hold their equipment to), wire lengths re-measured along the routed harnesses.
//  • Checks: elec-load, elec-ess, elec-vdrop, elec-wire, elec-amp, elec-coord, elec-start, elec-k, elec-gnd, elec-slack,
//    elec-emc, elec-mag, batt-hold, sup-span-i, sup-bend-i (registered over wp7's 'wp7-elec').
//  • Definition solids as primitives (cad/d_prims.py): vendor envelopes with their mounting features, harnesses swept
//    along their routes as cylinders per segment, and the system records' display and mass brought in line with them.
// Inches, definition frame [BL, FS, WL]. Notional; not for construction.
import { GEO, registerChecks, mk, psi, allowB } from '../structures.js';
import { LOAD, PASS, PARTS, EQUIP, WIRES, partByPN, pinOf, routes, defineReqs, defineKeepouts, insideFus, insideOML, KEEPOUTS } from '../systems.js';
import * as LY from './wpI0_layout.js';
import { AFT_LEN, AFTC } from './wpJ0_layout.js';
import { wireLength } from './wp7_wiring.js';
import { routingAudit, CLAMPS, RACEWAYS, spanRule } from './wp12_routing.js';
import { mountPrims, exhaustPrims, muffPrims } from './wpG4_systems.js';
import { cupPrims, bracketBoxes, enginePrims } from './wpG1_engine.js';
import { primVolumes, primMass } from '../defn/d_prims.js';
import { STARTER_PT, ALT_PT } from './wp1_powerplant.js';

export const r4 = (x) => Math.round(x * 1e4) / 1e4;
const sub = (a, b) => a.map((v, i) => v - b[i]), add = (a, b) => a.map((v, i) => v + b[i]), mul = (a, k) => a.map((v) => v * k), dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], len = (a) => Math.hypot(...a);
/** model ft [s, y, z] → definition in [BL, FS, WL] */
export const IN = (q) => [r4(q[1] * 12), r4(q[0] * 12), r4(q[2] * 12)];
export const TODAY = '2026-11-19';
export const fx = (x, n = 2) => (Number.isFinite(x) ? x.toFixed(n) : String(x));

// ------------------------------------------------------------------------------------------- wire data (copper, M22759/16)
/** AWG: [Ω/1000 ft at 20 °C, lb/ft with insulation, single wire in free air A, max circuit breaker A, max fuse A, OD in].
 *  Resistance, mass and OD: SAE AS22759/16 maxima for tin-coated stranded copper (src: Glenair M22759/16 data sheet,
 *  glenair.com, accessed 2026-11-19; the same tin-plated resistances as AC 43.13-1B Table 11-9). Protector chart (cols 3, 4):
 *  AC 43.13-1B CHG 1 Table 11-3 p. 11-15 (src: faasafety.gov copy of ch. 11, accessed 2026-11-19), all 22 values confirmed.
 *  Free-air ratings (col 2): single wire in free air, 60 °C rise over 40 °C ambient (src: Raychem (TE) Wire and Cable Technical
 *  Reference, p. 10-59 current-carrying capacity, accessed 2026-11-19; second research pass): 16–10 AWG are 4–14 % below the
 *  values typed earlier, the rest above. */
export const AWG = {
  22: [16.2, 0.00368, 10, 5, 5, 0.052], 20: [9.88, 0.00536, 13, 7.5, 5, 0.060], 18: [6.23, 0.00789, 17.5, 10, 10, 0.071], 16: [4.81, 0.00995, 20, 15, 10, 0.079],
  14: [3.06, 0.0149, 28, 20, 15, 0.093], 12: [2.02, 0.0226, 37.5, 30, 20, 0.114], 10: [1.26, 0.0351, 53, 40, 30, 0.139], 8: [0.701, 0.0635, 78, 50, 50, 0.199],
  6: [0.445, 0.0999, 105, 80, 70, 0.250], 4: [0.280, 0.157, 142, 100, 70, 0.312], 2: [0.183, 0.245, 196, 125, 100, 0.388],
  /** 1/0 (redesign 2026-11-19, the long cranking runs P1B0 / N1A0): DERIVED from the cited 2 AWG maxima by the AWG law (two
   *  gauges: area × 1.2610² = 1.590; resistance ÷ 1.590, mass × 1.590, OD × 1.261, the last two conservative); ratings and
   *  protector columns not used (the starter cables are unprotected by practice); confirm against the AS22759/16 1/0 row */
  '1/0': [0.1151, 0.3896, 0, 0, 0, 0.489],
};
/** source strings (compact citations: the research findings of 2026-11-19, docs/blocks/i_electrical.md) */
export const CITE = {
  glenair: 'src: Glenair M22759/16 data sheet, SAE AS22759/16 maxima (glenair.com, accessed 2026-11-19)',
  ac11: 'src: FAA AC 43.13-1B CHG 1 ch. 11 (faasafety.gov copy, accessed 2026-11-19)',
  mil5088: 'src: MIL-W-5088L bundle derating table (transcription, gist.github.com/depwl9992; matches both AC 43.13-1B para 11-69 worked examples; accessed 2026-11-19)',
  odyssey: 'src: EnerSys ODYSSEY ODS-AGM16L (PC680) data sheet and product guide AMER-EN-PG-ODY-0826 (enersys.com, accessed 2026-11-19)',
  skytec: 'src: Aircraft Spruce, Sky-Tec Flyweight starters page (current draw 125–220 A at 11 V; aircraftspruce.com, accessed 2026-11-19)',
  stsM12: 'src: Aircraft Spruce, Sky-Tec STS-M12 / Lamar STS-A12 master solenoid (150 A continuous, 300 A inrush, ≈ 0.92 lb; aircraftspruce.com, accessed 2026-11-19)',
  stsS12: 'src: Aircraft Spruce, Lamar STS-S12 starter solenoid 07-03562 (300 A, coil 2.9 A, ≈ 1.0 lb; aircraftspruce.com, accessed 2026-11-19)',
  bcL40: 'src: Aircraft Spruce, B&C L-40 alternator (40 A; aircraftspruce.com, accessed 2026-11-19)',
  lr3: 'src: B&C LR3E-14 (07-06742) product page ≈ 9 oz, and LR3D-14 manual LR3D-TM rev IR (field < 4 A, 5 A field breaker; aircraftspruce.com, accessed 2026-11-19)',
  pulsar: 'src: Aircraft Spruce 11-15280, AeroLEDs Pulsar 660 experimental pair 14 V (0.65 A average, 4.9 A peak; accessed 2026-11-19)',
  pulsarNSP: 'src: AeroLEDs Pulsar NSP data sheet 01-1280-C-12 rev A (6.6 oz; aircraftspruce.com, accessed 2026-11-19)',
  sunspot: 'src: AeroLEDs SunSpot 36 HX/LX installation instructions 0003-0004 rev G (3.2 A, 10.1 oz; accessed 2026-11-19)',
  klixon: 'src: Aircraft Spruce, Klixon 7277 breakers (0.445 in mounting hole) and 2027 catalogue p. 640 (7274-2 28 g max; accessed 2026-11-19)',
  ms35489: 'src: MS35489 grommet dimension table (O-Rings USA distributor sheet, accessed 2026-11-19)',
  bcGB: 'src: Aircraft Spruce, B&C ground blocks GB24 (24 tabs, 5/16 in stud; accessed 2026-11-19)',
  wr70: 'src: White-Rodgers Type 70/71 data R-4003C (Aircraft Spruce 11-03161; studs 5/16-24, coil #10-32; accessed 2026-11-19)',
  nec: 'src: NEC Chapter 9 Table 1 as reproduced in PDHonline course E276 (40 % over 2 conductors; accessed 2026-11-19)',
  zeus: 'src: Zeus nylon 12 material sheet V1R3, ASTM D792 1.01–1.06 g/cc (heavier end; zeusinc.com, accessed 2026-11-19)',
  phenolic: 'src: Plastics International, LE phenolic SG 1.34 (plasticsintl.com, accessed 2026-11-19)',
};
export const SRC = {
  awg: 'AC 43.13-1B CHG 1 Table 11-3 protector chart (confirmed), Table 11-9 tin-plated resistance; free-air ratings Raychem (TE) technical reference p. 10-59 — ' + 'src: Glenair M22759/16 data sheet; FAA AC 43.13-1B CHG 1 ch. 11 (faasafety.gov copy), accessed 2026-11-19',
  vdrop: 'AC 43.13-1B CHG 1 Table 11-6 (allowable drop, 14 V system): 0.5 V continuous, 1.0 V intermittent — src: FAA AC 43.13-1B CHG 1 ch. 11 (faasafety.gov copy, accessed 2026-11-19)',
  budget: 'DESIGN: load budget held by the owning block (≤ the maker\'s maximum; owner confirms)',
};
/** bundle derating, AC 43.13-1B Fig. 11-5, the 20 % bundle-loading curve (every block I bundle is below 20 % loaded),
 *  tabulated from MIL-W-5088L and interpolated linearly; held at the curve's last value 0.5075 beyond 41 wires (the figure
 *  stops there). src: MIL-W-5088L table (transcription; matches AC 43.13-1B para 11-69 examples: 0.52 at 35 wires), accessed 2026-11-19 */
export const K_BUNDLE = [[1, 1.00], [2, 0.9675], [5, 0.875], [10, 0.755], [15, 0.67], [20, 0.615], [25, 0.575], [30, 0.545], [35, 0.5225], [41, 0.5075]];
export const kBundle = (n) => { const N = Math.max(1, n), T = K_BUNDLE; if (N >= T.at(-1)[0]) return T.at(-1)[1];
  for (let i = 1; i < T.length; i++) if (N <= T[i][0]) { const [a, ka] = T[i - 1], [b, kb] = T[i]; return ka + (kb - ka) * (N - a) / (b - a); } return T.at(-1)[1]; };
/** altitude derating at the service ceiling: AC 43.13-1B Fig. 11-6 (0.91 at 20,000 ft in the AC's examples; 0.90 used,
 *  slightly conservative). src: FAA AC 43.13-1B CHG 1 ch. 11 para 11-68/11-69 examples (faasafety.gov copy, accessed 2026-11-19) */
export const K_ALT = 0.90;
/** resistance at conductor temperature (copper +0.393 %/°C, NBS Handbook 100 Table 5 α20, confirmed 2026-11-19; 40 °C rise case) */
export const K_HOT = 1 + 0.00393 * 40;

// ------------------------------------------------------------------------------------------- loads (DESIGN budget)
/** continuous / peak current per load, with its owner; the essential-bus set is what the battery carries after an
 *  alternator failure (master off, ESS ALT on) */
export const LOADS = {
  A1: { I: 3.0, peak: 6.0, owner: 'J', what: 'AXIS GDU 116C incl. COM receive (transmit peak)' }, A2: { I: 0.2, owner: 'J', what: 'GSU 25C ADAHRS', src: 'src: Garmin G3X IM 190-01115-01 rev AV Table 2-2 (0.2 A at 14 V; static.garmin.com, accessed 2026-11-19)' }, A3: { I: 0.43, owner: 'H', what: 'GEA 24 EIS', src: 'src: Garmin G3X IM 190-01115-01 rev AV Table 2-2 (0.43 A max at 14 V; accessed 2026-11-19)' },
  A5: { I: 1.3, owner: 'J', what: 'GTX 45R transponder', src: 'src: Garmin GTX 35R/45R IM 190-01499-10 rev 1, general specifications (1.30 A max at 14 V; accessed 2026-11-19)' }, A7: { I: 0.76, owner: 'J', what: 'G5 standby (battery charging)', src: 'src: Garmin G5 IM 190-02072-01 rev 12 Table 2-1 (0.760 A max with battery; accessed 2026-11-19)' }, A10: { I: 0.1, owner: 'J', what: 'GMU 11', src: 'src: Garmin G3X IM 190-01115-01 rev AV Table 2-2 (confirmed; accessed 2026-11-19)' }, A9: { I: 0.1, owner: 'J', what: 'warning unit' },
  M1: { I: 2.5, owner: 'F', what: 'boost pump (F\'s SCD maximum)' }, M2: { I: 4.0, peak: 6.0, int: true, owner: 'C', what: 'landing-brake actuator (stall 6 A)' },
  // AeroLEDs Pulsar 660: 0.65 A average, 4.9 A flash peak at 14 V (the page does not say per light or per pair: taken per light)
  DS1: { I: 0.65, peak: 4.9, owner: 'I', what: 'left wingtip light, AeroLEDs Pulsar 660 (position + strobe 0.65 A average, 4.9 A flash peak)', src: CITE.pulsar }, DS2: { I: 0.65, peak: 4.9, owner: 'I', what: 'right wingtip light, AeroLEDs Pulsar 660', src: CITE.pulsar },
  DS3: { I: 3.2, owner: 'I', what: 'landing light, AeroLEDs SunSpot 36LX (45 W)', src: CITE.sunspot }, FIELD: { I: 4.0, owner: 'I', what: 'alternator field (LR3 limit: < 4 A; conservative end of the range)', src: CITE.lr3 }, K1C: { I: 0.8, owner: 'I', what: 'master contactor coil (continuous duty)', src: CITE.stsM12 },
};
export const ESS = ['A1', 'A2', 'A3', 'A5', 'A7', 'A10', 'A9', 'M1'];
export const ALT = { rating: 40, src: 'B&C L-40 40 A — ' + CITE.bcL40 };
export const BATTERY = { ah: 16, peukert: 1.10, age: 0.80, depth: 0.80, ocv: 12.6, rint: 0.012, mass: 15.4,
  src: 'Odyssey PC680 (ODS-AGM16L): 16 Ah, 15.4 lb, OCV 12.6 V confirmed; R_int 12 mΩ BOUND (data sheet 7 mΩ fully charged at 20 °C; 12 mΩ the conservative end for a cold or part-charged battery); Peukert 1.10 BOUND (not published) — ' + CITE.odyssey };
/** cranking current: the conservative end of Sky-Tec's 125–220 A range (the O-235 figure to be confirmed by the starter maker) */
export const START = { I: 220, vmin: 8.0, src: 'Sky-Tec 149-12LS class lightweight starter, 220 A (conservative end of 125–220 A) — ' + CITE.skytec + '; minimum cranking voltage 8.0 V BOUND (not published; ask the maker)' };
/** master contactor (part swap 2026-11-19: ≥ 100 A required; the White-Rodgers Type 70 is only 80 A continuous) */
export const CONTACTOR = { k1: { cont: 150, part: 'Sky-Tec STS-M12 (Lamar STS-A12 class)', src: 'Sky-Tec STS-M12 150 A continuous — ' + CITE.stsM12 }, k2: { int: 300, part: 'Lamar STS-S12', src: 'Lamar STS-S12 300 A — ' + CITE.stsS12 }, drop: 0.0015 };

// ------------------------------------------------------------------------------------------- wire lengths and harness masses (after routing)
export const MY_H = ['LEZ-24-160', 'LEZ-24-161', 'LEZ-24-162', 'LEZ-24-165', 'LEZ-80-110', 'LEZ-33-110'];
const hOf = (x) => [].concat(x.harness);
export const myWires = () => WIRES.filter((x) => hOf(x).some((h) => MY_H.includes(h)));
for (const x of myWires()) x.len = wireLength(x);
/** shield terminations (EMC): every shielded wire states where its shield is grounded */
for (const x of WIRES) if (/M27500|shielded/.test(x.spec || '') && !x.shieldGnd) {
  const s = x.sig || '';
  x.shieldGnd = /CAN/.test(s) ? 'both ends, at each unit\'s connector backshell (Garmin practice, typed; the installation manual governs)'
    : /mic|phone|PTT|audio|tone/i.test(s) ? 'AXIS end only (audio: single-point at the audio panel)' : /OAT/.test(s) ? 'GSU 25C end only' : /RS-232/.test(s) ? 'AXIS end only'
      : /P-lead|magneto/i.test(s) ? 'magneto end (block H)' : /ELT/.test(s) ? 'ELT end (maker\'s cable)' : 'source end';
}
const lbft = (x) => (x.coax ? 0.05 /* RG-400 spec maximum (MIL-DTL-17/128B) */ : x.hv ? 0.03 : (x.spec || '').startsWith('thermocouple') ? 0.012 : (x.spec || '').startsWith('M27500') ? 0.016 : /braid/.test(x.spec || '') ? 0.20 : AWG[x.awg]?.[1] || 0.01);
/** harness mass from its wires (+15 % terminals, sleeves, ties, lugs), each wire shared over its harnesses */
export const harnessLb = (pn) => myWires().filter((x) => hOf(x).includes(pn)).reduce((a, x) => a + x.len * lbft(x) / hOf(x).length, 0) * 1.15;

// ------------------------------------------------------------------------------------------- geometry kit (in)
export const pathsOf = (pn) => (partByPN(pn)?.geo || []).filter((g) => g.t === 'path').map((g) => ({ ...g, P: g.pts.map(IN) }));
const segPt = (p, a, b) => { const ab = sub(b, a), L2 = dot(ab, ab), t = L2 ? Math.max(0, Math.min(1, dot(sub(p, a), ab) / L2)) : 0; return add(a, mul(ab, t)); };
/** distance from a point to a primitive's surface (box, finite cylinder, sphere), negative inside */
export function dPrim(p, g) {
  if (g.lo) return boxD(p, g.lo, g.hi);
  if (g.t === 'box' || g.t === 'obox') return boxD(p, g.c.map((v, i) => v - g.d[i] / 2), g.c.map((v, i) => v + g.d[i] / 2));
  if (g.t === 'cyl') { const ab = sub(g.b, g.a), L = len(ab), e = mul(ab, 1 / (L || 1)), u = dot(sub(p, g.a), e), rad = len(sub(sub(p, g.a), mul(e, u))), dr = rad - g.r, du = Math.max(-u, u - L);
    return dr > 0 && du > 0 ? Math.hypot(dr, du) : Math.max(dr, du); }
  if (g.t === 'sphere') return len(sub(p, g.c)) - g.r;
  return Infinity;
}
function boxD(p, lo, hi) { const q = [0, 1, 2].map((i) => Math.max(lo[i] - p[i], p[i] - hi[i])); const o = Math.hypot(...q.map((v) => Math.max(v, 0))); return o > 0 ? o : Math.max(...q); }
/** sample a polyline every ~0.25 in: [{ p, s (arc length), seg }] */
export function samples(P, step = 0.25) { const out = []; let acc = 0; for (let i = 1; i < P.length; i++) { const L = len(sub(P[i], P[i - 1])), n = Math.max(1, Math.ceil(L / step)); for (let k = 0; k <= n; k++) out.push({ p: add(P[i - 1], mul(sub(P[i], P[i - 1]), k / n)), s: acc + L * k / n, seg: i }); acc += L; } return out; }
/** least clearance (in) from a run of diameter d to a set of primitives, ignoring samples within `skip(sample)` */
export function runClear(P, d, prims, skip = () => false) { let w = { c: Infinity }; for (const q of samples(P)) { if (skip(q)) continue; for (const g of prims) { const c = dPrim(q.p, g) - d / 2; if (c < w.c) w = { c, at: q.p, what: g.feat || g.what || g.t }; } } return w; }
const polyLen = (P) => P.reduce((a, q, i) => a + (i ? len(sub(q, P[i - 1])) : 0), 0);
export const ENGINE_TERM = { starter: IN(STARTER_PT), alt: IN(ALT_PT) };
/** block G's definition primitives on the engine side (mount tubes, cups, brackets, engine envelope, exhaust, muff) */
export const G_OBST = () => ({ mount: [...mountPrims(), ...cupPrims()], brk: bracketBoxes().map((b) => ({ ...b, feat: `LEZ-71-223 ${b.feat}` })), eng: enginePrims().filter((g) => g.feat !== 'carb'), exh: [...exhaustPrims(), ...muffPrims()] });
/** the CS spar envelope (no line inside except through a declared tunnel) */
export const SPAR_BOX = () => ({ lo: [-GEO.csSpar.halfSpan * 12, (GEO.csSpar.s - GEO.csSpar.width / 2) * 12, 35.17], hi: [GEO.csSpar.halfSpan * 12, (GEO.csSpar.s + GEO.csSpar.width / 2) * 12, 40.52] });

// ------------------------------------------------------------------------------------------- electrical calculations
export const R_ = (x) => (AWG[x.awg] ? AWG[x.awg][0] / 1000 * x.len * K_HOT : 0);
/** voltage drop at each load: supply + return wires tagged with the load */
export function vdrops() {
  return Object.entries(LOADS).filter(([ref]) => EQUIP.some((e) => e.ref === ref)).map(([ref, L]) => {
    const ws = WIRES.filter((x) => x.load === ref), dv = ws.reduce((a, x) => a + L.I * R_(x), 0), dvp = ws.reduce((a, x) => a + (L.peak || L.I) * R_(x), 0);
    const ms = Math.min(0.5 / (dv || 1e-9), (L.peak ? 1.0 / (dvp || 1e-9) : Infinity)) - 1;
    return { ref, L, ws, dv, dvp, ms };
  }).filter((r) => r.ws.length);
}
/** the protector feeding each wire: a breaker on CB1/CB2's CB connector, otherwise a fuse (blade fuse block, ANL, ATC) */
const protOf = (x) => (/^CB[12]:CB:/.test(x.from) || /^CB[12]:CB:/.test(x.to) ? 'CB' : 'FUSE');
/** every protected wire against the AC 43.13-1B protector chart for its gauge */
export function wireProt() { return myWires().filter((x) => x.cb && AWG[x.awg]).map((x) => { const k = protOf(x), max = AWG[x.awg][k === 'CB' ? 3 : 4]; return { x, k, max, ms: max / x.cb - 1 }; }); }
/** conductor count of the bundle a harness wire rides in: its harnesses' wires plus the raceway-mates' */
export function bundleN(x) {
  const hs = hOf(x), mates = new Set(hs);
  for (const rw of Object.values(RACEWAYS)) if (rw.members.some((m) => hs.includes(m.pn))) rw.members.forEach((m) => mates.add(m.pn));
  return WIRES.filter((w) => hOf(w).some((h) => mates.has(h))).length;
}
/** load current against the derated ampacity of each loaded wire */
export function ampacity() {
  const cur = (x) => (x.load && LOADS[x.load] ? LOADS[x.load].I : /^P[23][A-C]\d/.test(x.id) ? ALT.rating : /^P[56][A-C]\d/.test(x.id) ? ESS.reduce((a, r) => a + LOADS[r].I, 0) : 0);
  return myWires().filter((x) => AWG[x.awg] && cur(x) > 0 && !/^(P1|N1|N2)/.test(x.id)).map((x) => { const n = bundleN(x), k = kBundle(n), Ia = AWG[x.awg][2] * k * K_ALT, I = cur(x); return { x, n, k, Ia, I, ms: Ia / I - 1 }; });
}
/** protector coordination: no nuisance trip (≥ 1.25 × continuous, ≥ peak for intermittent) and selectivity (upstream ≥ 2 × the
 *  largest downstream device: rule of thumb for thermal breakers and blade fuses, typed) */
export function coordination() {
  const rows = [], dev = (ref, conn, pin) => { const p = pinOf(`${ref}:${conn}:${pin}`); return p ? parseFloat(p.name.split(' ').pop()) : NaN; };
  const feeds = [['CB1', 'FZ', 1, ['A1'], 'AXIS B'], ['CB2', 'FZ', 1, ['A1'], 'AXIS A'], ['CB2', 'CB', 1, ['A1'], 'AXIS COM', 'peak'], ['CB2', 'FZ', 2, ['A2'], 'ADAHRS'], ['CB2', 'FZ', 3, ['A3'], 'EIS'],
    ['CB2', 'CB', 2, ['A5'], 'XPDR'], ['CB2', 'FZ', 4, ['A10'], 'GMU'], ['CB2', 'FZ', 5, ['A7'], 'G5'], ['CB2', 'FZ', 6, ['A9'], 'WARN'], ['CB2', 'CB', 3, ['M1'], 'BOOST'], ['CB1', 'CB', 2, ['M2'], 'LDG BRK', 'peak'],
    ['CB1', 'CB', 3, ['DS1', 'DS2'], 'STROBES', 'half'], ['CB1', 'FZ', 2, ['DS1', 'DS2'], 'POS', 'half'], ['CB1', 'FZ', 3, ['DS3'], 'LDG LT'], ['CB1', 'CB', 1, ['FIELD'], 'ALT FIELD']];
  for (const [ref, conn, pin, loads, name, mode] of feeds) { const r = dev(ref, conn, pin), I = loads.reduce((a, l) => a + (mode === 'peak' ? (LOADS[l].peak || LOADS[l].I) : LOADS[l].I) * (mode === 'half' ? 0.5 : 1), 0), need = mode === 'peak' ? I : 1.25 * I;
    rows.push({ what: `${name} ${r} A vs ${mode === 'peak' ? 'peak' : '1.25 × continuous'} ${fx(need)} A`, ms: r / need - 1 }); }
  const essI = ESS.reduce((a, l) => a + LOADS[l].I, 0), maxEss = Math.max(...Object.values(pinOf('CB2:CB:1').e.conns.CB.pins).concat(Object.values(pinOf('CB2:FZ:1').e.conns.FZ.pins)).map((n) => parseFloat(String(n).split(' ').pop()) || 0));
  const essFeed = dev('CB1', 'FZ', 5), essAlt = EQUIP.find((e) => e.ref === 'F3').cb, main = EQUIP.find((e) => e.ref === 'F1').cb, maxMain = Math.max(...Object.values(pinOf('CB1:CB:1').e.conns.CB.pins).concat(Object.values(pinOf('CB1:FZ:1').e.conns.FZ.pins)).map((n) => parseFloat(String(n).split(' ').pop()) || 0));
  rows.push({ what: `ESS FEED ${essFeed} A vs 1.25 × essential load ${fx(1.25 * essI)} A`, ms: essFeed / (1.25 * essI) - 1 }, { what: `ESS ALT ${essAlt} A vs 1.25 × essential load`, ms: essAlt / (1.25 * essI) - 1 },
    { what: `selectivity ESS FEED ${essFeed} A ≥ 2 × largest essential device ${maxEss} A`, ms: essFeed / (2 * maxEss) - 1 }, { what: `selectivity ESS ALT ${essAlt} A ≥ 2 × ${maxEss} A`, ms: essAlt / (2 * maxEss) - 1 },
    { what: `selectivity main feed ANL ${main} A ≥ 2 × largest main-bus device ${maxMain} A`, ms: main / (2 * maxMain) - 1 }, { what: `diode D1 30 A vs 1.25 × essential load (B&C 221-201 rating BOUND: not found in public sources)`, ms: 30 / (1.25 * essI) - 1 });
  return rows;
}
/** cranking: battery + loop resistance of the 2 AWG circuit, both contactors and the strap */
export function cranking() {
  const ws = ['P1A2', 'P1B0', 'P1C2', 'N1A0'].map((id) => WIRES.find((x) => x.id === id)), strap = WIRES.find((x) => x.id === 'N2A2');
  const Rc = ws.reduce((a, x) => a + R_(x), 0) + strap.len * 0.156 / 1000 * K_HOT + 2 * CONTACTOR.drop + 8 * 0.0001, V = BATTERY.ocv - START.I * (BATTERY.rint + Rc);
  return { ws, strap, Rc, V, drop: START.I * Rc, ms: V / START.vmin - 1, Imax: (BATTERY.ocv - START.vmin) / (BATTERY.rint + Rc) };
}
/** single-point ground: every return reaches BT1 − through GB1 or GB2 (star), the engine only through the strap at E1 */
export function grounds() {
  const bad = [], gnd = (a) => /^GB[12]:/.test(a);
  const at = (x, re) => re.test(x.from) || re.test(x.to), toBatt = WIRES.filter((x) => at(x, /^BT1:T:NEG/)).map((x) => x.id), engine = WIRES.filter((x) => at(x, /^E1:/));
  if (!toBatt.includes('N1A0') || !toBatt.includes('N3A8') || toBatt.length !== 2) bad.push(`battery − has ${toBatt.join(', ')} (want N1A0 to GB2 and N3A8 to GB1 only)`);
  if (engine.length !== 1 || engine[0].id !== 'N2A2') bad.push(`engine ground wires: ${engine.map((x) => x.id).join(', ')}`);
  const rets = WIRES.filter((x) => /^N/.test(x.id) && !['N1A0', 'N2A2', 'N3A8'].includes(x.id) && hOf(x).some((h) => MY_H.includes(h) || h === 'LEZ-74-100'));
  const num = (x) => x.id.match(/^N\d+/)[0];   // a return through a disconnect continues as the same circuit number (N11B → P331 → N11A → GB1)
  for (const x of rets) if (!gnd(x.to) && !gnd(x.from) && !rets.some((y) => y !== x && num(y) === num(x) && (gnd(y.to) || gnd(y.from)))) bad.push(`${x.id} does not reach a ground block`);
  const GB2n = WIRES.filter((x) => /^GB2:/.test(x.to) || /^GB2:/.test(x.from)).length, GB1n = WIRES.filter((x) => /^GB1:/.test(x.to) || /^GB1:/.test(x.from)).length;
  return { bad, GB1n, GB2n, rets: rets.length };
}
/** engine-motion slack of every run bridging the firewall and the engine: developed length − chord between the last
 *  airframe support and the first engine support (G's isolator motion ±0.25 in each axis: BOUND) */
export const MOTION = Math.sqrt(3) * 0.25;
export function slacks() {
  const runs = [['LEZ-80-110 starter cable (K2 → service bow → first engine clamp, FS 165)', LY.R_STARTER, 0, 3], ['LEZ-24-160 B-lead (firewall clamp → first engine clamp)', LY.R_PWR_FW, 2, 4], ['LEZ-24-165 strap (GB2 → E1)', LY.R_STRAP, 0, LY.R_STRAP.length - 1]];
  return runs.map(([what, P, i0, i1]) => { const Q = P.slice(i0, i1 + 1), dev = polyLen(Q), ch = len(sub(Q.at(-1), Q[0])); return { what, dev, ch, slack: dev - ch, ms: (dev - ch) / 0.5 - 1 }; });
}
/** GMU 11 disturbance from current-carrying runs within 48 in: pair (dipole) field μ0·I·s/(2π r²), no credit for the
 *  twist; allowance BOUND 0.25 µT (≈ 0.6° of heading in a 24 µT horizontal field, typed) */
export const MAG = { allow: 0.25, s: 0.15, src: 'BOUND: 0.25 µT at the magnetometer (≈ 0.6° heading error in a 24 µT horizontal field; typed, J to confirm against the GMU 11 manual)' };
export function magField() {
  const A = EQUIP.find((e) => e.ref === 'A10'); if (!A) return null; const g = IN(A.at), rows = [];
  for (const [pn, I] of [['LEZ-33-110', (LOADS.DS1.peak + 0.5)], ['LEZ-24-160', 0], ['LEZ-80-110', 0]]) for (const r of pathsOf(pn)) { const w = runClear(r.P, 0, [{ t: 'sphere', c: g, r: 0 }]); if (w.c < 48 && I > 0) rows.push({ pn, r: w.c, I, B: 2e-7 * I * (MAG.s * 0.0254) / (w.c * 0.0254) ** 2 * 1e6 }); }
  const B = rows.reduce((a, q) => a + q.B, 0); return { at: g, rows, B, ms: MAG.allow / (B || 1e-9) - 1 };
}
/** EMC segregation: block I power bundles against every signal run outside the shared passes; a run that crosses at
 *  ≥ 60° needs only a 0.25 in crossing gap (AS50881-style practice, typed), a run alongside needs 1.0 in */
export const SEG = { along: 1.0, twisted: 0.5, cross: 0.25, angle: 60, src: 'DESIGN: public practice (AS50881 / AC 43.13-1B ch. 11 segregation: power and signal apart, crossings at right angles), values typed from memory' };
/** power runs whose every circuit is a twisted supply/return group (net current ≈ 0, small loop): half the alongside gap */
export const TWISTED = ['LEZ-33-110'];
export function segregation() {
  const pw = ['LEZ-80-110', 'LEZ-24-160', 'LEZ-33-110'], sig = routes().filter((r) => r.cls === 'signal' && !/^LEZ-(24-161|74-100)/.test(r.part));   // 74-100 P-leads are shielded sources, not victims
  // shared pass, where the runs are segregated by lane and need only the crossing gap: the boot approach (FS 141.5, where
  // block H's P-leads and GEA harness leave raceway LS, to the boot: they cross the power runs into their boot lanes); the
  // engine bay is block H's (its runs are open there: excluded). Since option A (Miles, 2026-11-19) no signal run shares the
  // light harness's spar tunnel or wing conduit, so the CS spar, the jut-outs and the wings are checked like the cabin, with
  // no exemption: J's GMU 11 harness keeps 0.5 in alongside the twisted triad (0.25 in where it crosses at ≥ 60°)
  const wing = (p) => Math.abs(p[0]) > 12.5 && p[1] > 127.40;
  const bay = (p) => p[1] > 128.00 && !wing(p), shared = (p) => p[1] > 116.00 && p[1] <= 128.00 && p[2] < 35.2 && p[0] > -11 && p[0] < 3;
  let w = { m: Infinity }; const cosA = Math.cos(SEG.angle * Math.PI / 180);
  for (const pn of pw) for (const r of pathsOf(pn)) for (const s of sig) { const S = s.pts.map(IN); const prims = []; for (let i = 1; i < S.length; i++) prims.push({ t: 'cyl', a: S[i - 1], b: S[i], r: (s.dIn || 0.25) / 2, what: s.part });
    for (const q of samples(r.P, 0.5)) { if (bay(q.p)) continue; const u = sub(r.P[q.seg], r.P[q.seg - 1]);
      for (const g of prims) { const c = dPrim(q.p, g) - r.dIn / 2; if (c > 3) continue; const v = sub(g.b, g.a), cs = Math.abs(dot(u, v)) / (len(u) * len(v) || 1), inBoot = Math.abs(q.p[1] - 127.5) <= 0.7 && Math.hypot(q.p[0] - LY.BOOT.c[0], q.p[2] - LY.BOOT.c[1]) <= LY.BOOT.r + 0.5, req = inBoot ? 0 : cs <= cosA || shared(q.p) ? SEG.cross : TWISTED.includes(pn) ? SEG.twisted : SEG.along, m = inBoot ? (c >= 0 ? 9 : -1) : c / req - 1;
        if (m < w.m) w = { m, c, req, at: q.p, what: `${pn} ↔ ${g.what}`, cross: req === SEG.cross }; } } }
  const shields = myWires().filter((x) => /M27500|shielded/.test(x.spec || '')), noTerm = shields.filter((x) => !x.shieldGnd);
  return { w, shields: shields.length, noTerm, ms: Math.min(w.m, noTerm.length ? -1 : 9) };
}

// ------------------------------------------------------------------------------------------- checks
const I_ = (n, v, u, s = 'DERIVED') => [n, v, u, s];
registerChecks('wp7-elec', (d, lc, Z, M) => {
  const out = [], tag = (r, sys = 'LEZ-24-100') => { r.sys = sys; out.push(r); };
  if (lc.type === 'emergency') {   // battery hold-down: items of mass (typed FAR 23.561 factors)
    const W = BATTERY.mass + 1.4, n = 18, per = W * n / 4, D = 0.60, t = 0.375, Pa = psi(M.FLOX.shear) * Math.PI * D * t, ms = Pa / per - 1;
    tag(mk('fuselage', 'batt-hold', 'Battery hold-down: straps to 4 × AN3 in flox inserts in the shelf (items of mass, 18 g forward)', lc, 'battery shelf, LEZ-24-110', 'flox insert shear-out', ms, {
      formula: 'P = (m_battery + m_box)·n / 4 bolts;  P_allow = τ_flox·π·D_insert·t_core', inputs: [I_('Battery mass', BATTERY.mass, 'lb', BATTERY.src), I_('Box, lid, straps', 1.4, 'lb', 'GEOMETRY (rounded up from the solid)'), I_('Load factor', n, 'g', 'FAR23: 23.561(b)(3)(ii) 18 g forward, items of mass — src: 14 CFR Part 23 (1-1-11 edition, pre-Amdt 23-64), govinfo, accessed 2026-11-19'),
        I_('Insert', `Ø ${D} × ${t} in flox in 3/8 H45`, 'text', 'DESIGN'), I_('Flox shear', psi(M.FLOX.shear), 'psi', allowB(ms, 'flox (resin) shear'))], result: [['P per bolt (ult.)', per, 'lb'], ['P_allow', Pa, 'lb']] }), 'LEZ-24-110');
    return out;
  }
  if (lc.id !== 'W1-S1') return [];
  // alternator capacity
  { const cont = Object.entries(LOADS).filter(([, L]) => !L.int), Ic = cont.reduce((a, [, L]) => a + L.I, 0);
    tag(mk('fuselage', 'elec-load', 'Alternator capacity against the continuous load', lc, 'main + essential bus', '80 % alternator loading', 0.8 * ALT.rating / Ic - 1, {
      formula: 'MS = 0.8 · I_alt / Σ I_continuous − 1 (80 % loading, FAR 23.1351 yardstick)', inputs: [I_('Alternator rating', ALT.rating, 'A', ALT.src), ...cont.map(([k, L]) => I_(`${k} ${L.what}`, L.I, 'A', L.src ? `DESIGN budget from the vendor figure — ${L.src}` : L.owner === 'I' ? 'DESIGN: block I equipment' : SRC.budget))], result: [['Continuous load', Ic, 'A']] }), 'LEZ-24-150'); }
  // essential bus endurance
  { const Ie = ESS.reduce((a, r) => a + LOADS[r].I, 0), Ce = BATTERY.ah * Math.pow(BATTERY.ah / (20 * Ie), BATTERY.peukert - 1), t = Ce * BATTERY.age * BATTERY.depth / Ie;
    tag(mk('fuselage', 'elec-ess', 'Essential bus on the battery after an alternator failure', lc, 'essential bus (master off, ESS ALT on)', 'endurance ≥ 30 min', t / 0.5 - 1, {
      formula: 'C_eff = C20·(C20 / 20·I)^(k−1) (Peukert);  t = C_eff · age · depth / I_ess;  MS = t / 0.5 h − 1', inputs: [I_('Battery C20', BATTERY.ah, 'Ah', BATTERY.src), I_('Peukert exponent (AGM)', BATTERY.peukert, '', 'BOUND: AGM typical 1.05–1.15 (not published for the PC680; not found in public sources)'), I_('Age / usable depth', `${BATTERY.age} / ${BATTERY.depth}`, 'text', 'DESIGN'), I_('Required endurance', 30, 'min', 'FAR23: 23.1353(h) 30 min after loss of the primary generating system — src: 14 CFR Part 23 (2011 edition, pre-Amdt 23-64), govinfo, accessed 2026-11-19'),
        ...ESS.map((r) => I_(`${r} ${LOADS[r].what}`, LOADS[r].I, 'A', LOADS[r].src ? `DESIGN budget from the vendor figure — ${LOADS[r].src}` : SRC.budget))], result: [['Essential load', Ie, 'A'], ['Effective capacity', Ce, 'Ah'], ['Endurance', t * 60, 'min']] }), 'LEZ-24-110'); }
  // voltage drop
  { const v = vdrops().sort((a, b) => a.ms - b.ms), g = v[0];
    tag(mk('fuselage', 'elec-vdrop', 'Voltage drop at every load (supply + return, hot copper)', lc, `${g.ref} ${g.L.what}`, 'drop ≤ the AC 43.13 allowance', g.ms, {
      formula: 'ΔV = I · Σ R_AWG(20 °C) · (1 + 0.00393·40) · L over the load\'s supply and return wires;  MS = min(0.5 V / ΔV_cont, 1.0 V / ΔV_peak) − 1', inputs: [I_('Allowance', '0.5 V continuous, 1.0 V intermittent / peak', 'text', SRC.vdrop), I_('Copper resistance', 'M22759/16 tin-coated maxima (AS22759/16)', 'text', CITE.glenair),
        ...v.map((r) => I_(`${r.ref}: ${r.L.I} A (${r.L.peak || r.L.I} A peak) on ${r.ws.map((x) => `${x.id} ${x.awg} AWG ${fx(x.len, 1)} ft`).join(' + ')}`, r.dv, 'V', 'ROUTED'))], result: [['Worst drop (continuous)', g.dv, 'V'], ['Worst drop (peak)', g.dvp, 'V']] }), 'LEZ-24-161'); }
  // protector chart
  { const p = wireProt().sort((a, b) => a.ms - b.ms), g = p[0];
    tag(mk('fuselage', 'elec-wire', 'Every protected wire within the protector chart for its gauge', lc, `${g.x.id} ${g.x.sig}`, 'wire protected before it overheats', g.ms, {
      formula: 'MS = I_max(AWG, breaker | fuse) / I_protector − 1, minimum over every protected block I wire (FAR 23.1357; starter cables and ≤ 6 in contactor jumpers unprotected by practice)', inputs: [I_('Protector chart', 'AC 43.13-1B Table 11-3', 'text', SRC.awg), ...p.slice(0, 14).map((r) => I_(`${r.x.id} ${r.x.awg} AWG on a ${r.x.cb} A ${r.k === 'CB' ? 'breaker' : 'fuse'} (chart ${r.max} A)`, r.ms, 'MS', 'DESIGN'))], result: [['Governing wire', `${g.x.id} ${g.x.awg} AWG`, 'text']] }), 'LEZ-24-130'); }
  // ampacity
  { const a = ampacity().sort((p, q) => p.ms - q.ms), g = a[0];
    tag(mk('fuselage', 'elec-amp', 'Load current within each wire\'s derated ampacity (bundle and altitude)', lc, `${g.x.id} ${g.x.sig}`, 'derated ampacity', g.ms, {
      formula: 'I_allow = I_free-air(AWG) · k_bundle(N, 20 % loading, Fig. 11-5 table) · k_altitude;  MS = I_allow / I_load − 1', inputs: [I_('Free-air ratings', 'Raychem table, single wire, 60 °C rise over 40 °C', 'text', `src: Raychem (TE) Wire and Cable Technical Reference p. 10-59 (accessed 2026-11-19); MS stays ≥ 0 down to ${fx(1 / (1 + g.ms) * 100, 0)} % of the rating`), I_('Bundle derating k(N)', 'AC 43.13-1B Fig. 11-5 20 % curve, tabulated (MIL-W-5088L), held at 0.5075 beyond 41 wires', 'text', CITE.mil5088), I_('Altitude derating', K_ALT, '', 'AC 43.13-1B Fig. 11-6 (0.91 at 20,000 ft in the AC examples; 0.90 used) — ' + CITE.ac11),
        ...a.slice(0, 10).map((r) => I_(`${r.x.id} ${r.x.awg} AWG, ${r.I} A in a ${r.n}-wire bundle`, r.Ia, 'A', 'ROUTED'))], result: [['Governing', `${g.x.id}: ${fx(g.I, 1)} A of ${fx(g.Ia, 1)} A`, 'text']] }), 'LEZ-24-160'); }
  // coordination
  { const c = coordination().sort((a, b) => a.ms - b.ms), g = c[0];
    tag(mk('fuselage', 'elec-coord', 'Breaker and fuse coordination: no nuisance trip, upstream selectivity', lc, g.what, 'coordination', g.ms, {
      formula: 'protector ≥ 1.25 × continuous load (≥ peak for motors and transmitters);  upstream ≥ 2 × the largest downstream device (thermal breakers and blade fuses: DESIGN rule of thumb)', inputs: [I_('Selectivity ratio', 2, '', 'DESIGN: 2 : 1 for thermal devices (practice; AC 43.13-1B gives only the 80 % rule, no public source found)'), ...c.map((r) => I_(r.what, r.ms, 'MS', 'DESIGN'))], result: [] }), 'LEZ-24-130'); }
  // cranking
  { const k = cranking();
    tag(mk('fuselage', 'elec-start', 'Starter terminal voltage while cranking (nose battery, 1/0 AWG long runs, 2 AWG jumpers)', lc, 'battery → K1 → K2 → starter; case → strap → GB2 → battery −', 'terminal voltage ≥ the starter minimum', k.ms, {
      formula: 'V = OCV − I_crank · (R_int + Σ R_cable(hot) + 2 contactor drops + 8 lugs)', inputs: [I_('Cranking current', START.I, 'A', START.src), I_('Battery OCV / R_int', `${BATTERY.ocv} V / ${BATTERY.rint * 1000} mΩ`, 'text', BATTERY.src), I_('Contactor contact drop', CONTACTOR.drop * 1000, 'mΩ', 'BOUND: not published by White-Rodgers, Lamar or Sky-Tec; measure the millivolt drop on receipt'), I_('Lug and stud joints', 0.1, 'mΩ each', 'BOUND: crimped lug typical (not found in public sources; AC 43.13-1B 11-189 bond jumper ≤ 3 mΩ)'),
        ...k.ws.map((x) => I_(`${x.id} ${x.awg} AWG`, x.len, 'ft', 'ROUTED')), I_('N2A2 strap', k.strap.len, 'ft', 'ROUTED'), I_('Starter minimum', START.vmin, 'V', START.src)],
      result: [['Loop resistance', k.Rc * 1000, 'mΩ'], ['Cable drop', k.drop, 'V'], ['Starter voltage', k.V, 'V'], ['Cranking current for MS = 0', k.Imax, 'A']] }), 'LEZ-80-110'); }
  // contactors
  { const k1 = CONTACTOR.k1.cont / (ALT.rating + 10) - 1, k2 = CONTACTOR.k2.int / START.I - 1;
    tag(mk('fuselage', 'elec-k', 'Contactor ratings: master continuous, starter intermittent', lc, k1 < k2 ? 'K1 master' : 'K2 starter', 'contact rating', Math.min(k1, k2), {
      formula: 'K1: I_cont = alternator + 10 A battery recharge;  K2: I_crank;  MS = rating / I − 1', inputs: [I_('K1 continuous rating', CONTACTOR.k1.cont, 'A', CONTACTOR.k1.src), I_('K2 intermittent rating', CONTACTOR.k2.int, 'A', CONTACTOR.k2.src), I_('Alternator', ALT.rating, 'A', ALT.src), I_('Cranking current', START.I, 'A', START.src)],
      result: [['K1 MS', k1, ''], ['K2 MS', k2, '']] }), 'LEZ-80-100'); }
  // grounds
  { const g = grounds();
    tag(mk('fuselage', 'elec-gnd', 'Single-point grounding: star at the battery − post, engine only through the strap at E1', lc, 'GB1 (cabin), GB2 (firewall), E1', 'ground topology', g.bad.length ? -1 : 1, {
      formula: 'every block I return lands on GB1 or GB2; each block reaches BT1 − by one cable; the engine case only by N2A2 at E1 (G-O6); MS = 1 when all hold, −1 otherwise', inputs: [I_('Rule', 'AeroElectric-style single-point ground for a composite airframe', 'text', 'DESIGN'), I_('Returns checked', g.rets, '', 'MODEL'), I_('GB1 / GB2 wires', `${g.GB1n} / ${g.GB2n}`, 'text', 'MODEL')], result: [['Faults', g.bad.join('; ') || 'none', 'text']] }), 'LEZ-24-140'); }
  // slack
  { const s = slacks().sort((a, b) => a.ms - b.ms), g = s[0];
    tag(mk('fuselage', 'elec-slack', 'Engine-motion slack on every run bridging the firewall and the engine', lc, g.what, 'slack ≥ 0.5 in', g.ms, {
      formula: 'slack = developed length − chord between the last airframe support and the first engine support;  MS = slack / 0.5 in − 1 (≥ the isolator excursion √3 · 0.25 = 0.43 in)', inputs: [I_('Isolator excursion', 0.25, 'in each axis', 'BOUND: block G LEZ-71-210 isolator excursion (not published for the cone bushings; measure on receipt)'), ...s.map((r) => I_(r.what, r.slack, 'in', 'GEOMETRY'))], result: [['Least slack', g.slack, 'in']] }), 'LEZ-24-165'); }
  // EMC
  { const e = segregation();
    tag(mk('fuselage', 'elec-emc', 'EMC: power bundles apart from signal runs outside shared passes; every shield termination stated', lc, e.w.what || '—', 'segregation', e.ms, {
      formula: 'least surface distance d between a block I power run and any signal run ahead of the firewall and in the jut-outs and wings;  required 1.0 in alongside (0.5 in for a run whose every circuit is a twisted supply/return group: LEZ-33-110), 0.25 in where the runs cross at ≥ 60° or share the lane-segregated boot approach (FS 141.5–153 where blocks H and I leave their raceways for the boot); inside the boot and its clamp (FS 152.3–153.7) the runs only must not interfere; the CS spar, jut-outs and wings are checked like the cabin (option A: the light harness alone in its tunnel and conduit, no exemption);  MS = d / required − 1;  −1 if any shield termination is unstated', inputs: [I_('Power / signal separation alongside', SEG.along, 'in', SEG.src), I_('Twisted supply/return groups alongside', SEG.twisted, 'in', 'DESIGN: twisting cancels the pair field (block J to confirm for the GMU 11 CAN harness)'), I_('Crossing gap at ≥ 60°', SEG.cross, 'in', SEG.src), I_('Shielded block I wires', e.shields, '', 'MODEL'), I_('Without a stated termination', e.noTerm.length, '', 'MODEL')], result: [['Governing', `${fx(e.w.c)} in against ${e.w.req} in (${e.w.cross ? 'crossing' : 'alongside'})`, 'text']] }), 'LEZ-24-161'); }
  // magnetometer
  { const g = magField(); if (g) tag(mk('fuselage', 'elec-mag', 'Magnetometer disturbance from the wingtip light harness', lc, 'GMU 11 in the left wing', 'field at the sensor', g.ms, {
      formula: 'B = μ0·I·s / (2π r²) for a supply/return pair at spacing s (no credit for the twist);  MS = B_allow / ΣB − 1', inputs: [I_('Allowance', MAG.allow, 'µT', MAG.src), I_('Conductor spacing in the triad', MAG.s, 'in', 'DESIGN'), ...g.rows.map((r) => I_(`${r.pn} at ${fx(r.r, 1)} in, ${r.I} A peak`, r.B, 'µT', 'ROUTED'))], result: [['Field', g.B, 'µT']] }), 'LEZ-33-110'); }
  // supports (block I runs and the raceways' bundle clamps)
  { const a = routingAudit(), mine = (x) => /^LEZ-(24-16|80-110|33-110)/.test(x.run), sp = a.spans.filter(mine), bn = a.bends.filter(mine);
    const ws = sp.reduce((x, q) => (q.span / q.rule > x.span / x.rule ? q : x), { span: 0, rule: 1 }), wb = bn.reduce((x, q) => (q.ratio < x.ratio ? q : x), { ratio: 9 });
    tag(mk('fuselage', 'sup-span-i', 'Support spacing on every block I run (cushion clamps, raceway clamps, connectors)', lc, ws.name || '—', 'support span', ws.rule / ws.span - 1, {
      formula: 'MS = allowed span / longest unsupported span − 1 (fittings, connectors and clamps count as supports)', inputs: [I_('Wire bundle span', 18, 'in', 'DESIGN: 18 in; AC 43.13-1B CHG 1 para 11-96a and 11-146 allow 24 in — ' + CITE.ac11), I_('Runs checked', sp.length, '', 'MODEL'), I_('Clamps', CLAMPS.length, '', 'MODEL')], result: [['Worst run', ws.run || '—', 'text'], ['Longest span', ws.span, 'in']] }), 'LEZ-20-100');
    tag(mk('fuselage', 'sup-bend-i', 'Bend radius on every block I run (terminations excluded)', lc, wb.name || '—', 'bend radius', wb.ratio - 1, {
      formula: 'filleted route, radius limited by half the shorter leg;  MS = r_achieved / r_required − 1;  r_required 10 × OD (AC 43.13-1B CHG 1 para 11-117; terminations: 3 × OD where suitably supported per para 11-96aa, 11-117 (CHG 1) says 6 × OD at breakouts; Miles decided 2026-11-19 that 3 × OD at connector boots (11-96aa) governs)', inputs: [I_('Rule', '10 × OD bundles; terminations and supported boot bends 3 × OD (11-96aa)', 'text', 'DESIGN: AC 43.13-1B CHG 1 para 11-117 / 11-96aa — ' + CITE.ac11), I_('Runs checked', bn.length, '', 'MODEL')], result: [['Worst run', wb.run || '—', 'text'], ['Achieved / required', wb.ratio, '']] }), 'LEZ-20-100'); }
  return out;
});
defineReqs([{ id: 'R-ELEC-1', checks: /^elec-(load|vdrop|wire|ess)$/, closed: true }, { id: 'R-ELEC-2', ref: 'AC 43.13-1B ch. 11 (practice)', title: 'Electrical power: ampacity, coordination, cranking, grounding, engine slack, EMC, magnetometer', checks: /^elec-(amp|coord|start|k|gnd|slack|emc|mag)$/, method: 'analysis', closed: true }]);

// ------------------------------------------------------------------------------------------- definition primitives (in)
const bx = (g, lo, hi) => ({ g, t: 'box', c: lo.map((v, i) => r4((v + hi[i]) / 2)), d: lo.map((v, i) => r4(hi[i] - v)) });
const cy = (g, a, b, r) => ({ g, t: 'cyl', a: a.map(r4), b: b.map(r4), r: r4(r) });
const cut = (feat, a, b, r, into) => ({ feat, a: a.map(r4), b: b.map(r4), r: r4(r), into });
/** a run swept as one cylinder per segment (group g) */
export const sweep = (P, d, g) => P.slice(1).map((q, i) => cy(g, P[i], q, d / 2)).filter((p) => len(sub(p.b, p.a)) > 1e-3);
export const P_ = {};
// battery, box and lid, two hold-down straps with their feet, terminals, shelf with its four inserts, vent to the belly
/** the shell's inner face below a point (WL, in): where the vent tube meets the belly fitting (shell hole for block A) */
export const shellBelow = (bl, fs, wl) => { let z = wl; while (z > 0 && insideFus(fs / 12, bl / 12, (z - 0.05) / 12, (GEO_SHELL + 0.01) / 12)) z -= 0.05; return r4(z); };
const GEO_SHELL = 0.415;
LY.BAT.vent[1][2] = shellBelow(LY.BAT.vent[1][0], LY.BAT.vent[1][1], LY.BAT.vent[1][2]);
{ const B = LY.BAT, lo = B.box.lo, hi = B.box.hi, w = B.wall, prims = [];
  prims.push(bx('battery', add(lo, [w, w, w]), [hi[0] - w, hi[1] - w, lo[2] + w + B.H]));
  prims.push(bx('box', lo, [hi[0], hi[1], lo[2] + w]), bx('box', [lo[0], lo[1], lo[2] + w], [lo[0] + w, hi[1], hi[2] - w]), bx('box', [hi[0] - w, lo[1], lo[2] + w], [hi[0], hi[1], hi[2] - w]),
    bx('box', [lo[0] + w, lo[1], lo[2] + w], [hi[0] - w, lo[1] + w, hi[2] - w]), bx('box', [lo[0] + w, hi[1] - w, lo[2] + w], [hi[0] - w, hi[1], hi[2] - w]), bx('box', [lo[0], lo[1], hi[2] - w], [hi[0], hi[1], hi[2]]));
  const st = 0.05, sw = 0.75, sh = B.shelf;
  for (const f of B.straps) prims.push(bx('strap', [lo[0] - st, f, hi[2]], [hi[0] + st, f + sw, hi[2] + st]), bx('strap', [lo[0] - st, f, lo[2]], [lo[0], f + sw, hi[2]]), bx('strap', [hi[0], f, lo[2]], [hi[0] + st, f + sw, hi[2]]));
  for (const t of [B.pos, B.neg]) prims.push(cy('terminal', [t[0], t[1], hi[2]], [t[0], t[1], t[2]], 0.20));
  const si = prims.length; prims.push(bx('shelf', sh.lo, sh.hi)); prims.push(cy('vent', B.vent[0], B.vent[1], 0.125));
  const ins = B.inserts;
  const cuts = ins.map(([b, f]) => cut('insert', [b, f, sh.lo[2]], [b, f, sh.hi[2]], 0.0955, [si]));
  for (const [b, f] of ins) cuts.push(cut('floor', [b, f, lo[2]], [b, f, lo[2] + w], 0.0955, [1]));   // through the box floor (prim 1)
  cuts.push(cut('vent', [B.vent[1][0], B.vent[1][1], sh.lo[2]], [B.vent[1][0], B.vent[1][1], sh.hi[2]], 0.14, [si]));
  P_.battery = { prims, cuts, inserts: ins };
}
// master contactor, main-feed ANL, ESS ALT fuse, wall bracket
{ const K = LY.K1, x0 = K.c[0] - K.L / 2, x1 = K.c[0] + K.L / 2, prims = [cy('contactor', [x0, K.c[1], K.c[2]], [x1, K.c[1], K.c[2]], K.r), ...Object.values(K.studs).map((s) => cy('stud', [x1, s[1], s[2]], [s[0] + 0.25, s[1], s[2]], 0.156))];
  const bi = prims.length; prims.push(bx('bracket', [x0 - 0.063, K.c[1] - 1.3, K.c[2] - 1.1], [x0, K.c[1] + 1.3, K.c[2] + 1.1]));
  const F = LY.F1, f3 = LY.F3; prims.push(bx('anl', F.c.map((v, i) => v - F.d[i] / 2), F.c.map((v, i) => v + F.d[i] / 2)), bx('fuse', f3.c.map((v, i) => v - f3.d[i] / 2), f3.c.map((v, i) => v + f3.d[i] / 2)));
  const cuts = [-0.95, 0.95].map((dz) => cut('mount', [x0 - 0.10, K.c[1], K.c[2] + dz], [x0 + 0.03, K.c[1], K.c[2] + dz], 0.097, [bi]));
  P_.master = { prims, cuts };
}
// breaker sub-panel at block B's cut-out, bus module on the left side wall
{ const C = LY.CBP, f0 = C.fsFace - C.plate.t, prims = [bx('subpanel', [C.plate.c[0] - C.plate.w / 2, f0, C.plate.c[1] - C.plate.h / 2], [C.plate.c[0] + C.plate.w / 2, C.fsFace, C.plate.c[1] + C.plate.h / 2])], cuts = [];
  for (const b of C.cols) for (const z of C.rows) { prims.push(cy('breaker', [b, f0, z], [b, f0 - C.body.L, z], C.body.r)); cuts.push(cut('bushing', [b, f0 - 0.02, z], [b, C.fsFace + 0.02, z], 0.2225, [0])); }   // Klixon 7277 mounting hole Ø 0.445 (src: Aircraft Spruce Klixon 7277 page, accessed 2026-11-19)
  for (const [db, dz] of [[-1.2, -1.15], [1.2, -1.15], [-1.2, 1.15], [1.2, 1.15]]) cuts.push(cut('screw', [C.plate.c[0] + db, f0 - 0.02, C.plate.c[1] + dz], [C.plate.c[0] + db, C.fsFace + 0.02, C.plate.c[1] + dz], 0.0825, [0]));
  const M = LY.MOD, pl = M.plate, pi = prims.length; prims.push(bx('module', [pl.bl - pl.t, pl.fs[0], pl.wl[0]], [pl.bl, pl.fs[1], pl.wl[1]]));
  for (const k of ['FB1', 'FB2', 'F2', 'D1', 'busM']) { const q = M[k]; prims.push(bx(k === 'busM' ? 'busbar' : k === 'F2' ? 'anl' : k === 'D1' ? 'diode' : 'fuseblock', q.c.map((v, i) => v - q.d[i] / 2), q.c.map((v, i) => v + q.d[i] / 2))); }
  for (const f of [pl.fs[0] + 0.5, pl.fs[1] - 0.5]) for (const z of [pl.wl[0] + 0.4, pl.wl[1] - 0.4]) { prims.push(cy('standoff', [pl.bl - pl.t, f, z], [pl.bl - pl.t - 0.38, f, z], 0.19)); cuts.push(cut('screw', [pl.bl - pl.t - 0.02, f, z], [pl.bl + 0.02, f, z], 0.0825, [pi])); }
  P_.bus = { prims, cuts };
}
// ground blocks: GB1 on the bus module, GB2 on the firewall at the layout holes
{ const G1 = LY.MOD.GB1, G2 = LY.GB2, prims = [bx('gb1', G1.c.map((v, i) => v - G1.d[i] / 2), G1.c.map((v, i) => v + G1.d[i] / 2)), cy('stud', [G1.c[0] + G1.d[0] / 2, G1.c[1], G1.c[2]], [G1.c[0] + G1.d[0] / 2 + 0.5, G1.c[1], G1.c[2]], 0.156)];   // B&C GB24 5/16 in stud
  const gi = prims.length; prims.push(bx('gb2', G2.c.map((v, i) => v - G2.d[i] / 2), G2.c.map((v, i) => v + G2.d[i] / 2)), cy('stud', [G2.stud[0], G2.c[1] + G2.d[1] / 2, G2.stud[2]], [G2.stud[0], G2.stud[1] + 0.3, G2.stud[2]], 0.156));
  const cuts = LY.FW_LAYOUT.gnd.map(([b, z]) => cut('mount', [b, G2.c[1] - G2.d[1] / 2 - 0.02, z], [b, G2.c[1] + G2.d[1] / 2 + 0.02, z], 0.0955, [gi]));
  P_.ground = { prims, cuts };
}
// regulator / OV relay on the firewall
{ const V = LY.VR1, lo = V.c.map((v, i) => v - V.d[i] / 2), hi = V.c.map((v, i) => v + V.d[i] / 2), prims = [bx('flange', [lo[0] - 0.35, lo[1], lo[2] + 0.3], [hi[0] + 0.35, lo[1] + 0.09, hi[2] - 0.3]), bx('body', [lo[0], lo[1] + 0.09, lo[2]], hi), bx('connector', [V.conn[0] - 0.6, hi[1], V.conn[2] - 0.25], [V.conn[0] + 0.6, hi[1] + 0.35, V.conn[2] + 0.25])];
  P_.vr = { prims, cuts: LY.FW_LAYOUT.ovr.map(([b, z]) => cut('mount', [b, lo[1] - 0.02, z], [b, lo[1] + 0.11, z], 0.0955, [0])) };
}
// starter contactor on its angle bracket (vertical can, studs on top)
{ const K = LY.K2, prims = [cy('contactor', [K.c[0], K.c[1], K.h[0]], [K.c[0], K.c[1], K.h[1]], K.r), ...Object.values(K.studs).map((s) => cy('stud', [s[0], s[1], K.h[1]], s, 0.156))];
  const fi = prims.length; prims.push(bx('bracket', [-2.45, 127.5, K.h[0] - 0.09], [-0.15, 127.59, 42.10]), bx('bracket', [-2.45, 127.59, K.h[0] - 0.09], [-0.15, K.c[1] + K.r, K.h[0]]));
  P_.k2 = { prims, cuts: LY.FW_LAYOUT.start.map(([b, z]) => cut('mount', [b, 127.48, z], [b, 127.61, z], 0.0955, [fi])) };
}
// wingtip lights in the tip close-outs (both), landing light behind the nose window
{ const L = LY.TIP_LIGHT, prims = []; for (const sg of [-1, 1]) { const x = [sg * L.lo[0], sg * L.hi[0]].sort((a, b) => a - b); prims.push(bx('light', [x[0], L.lo[1] + 0.3, L.lo[2]], [x[1], L.hi[1], L.hi[2]]), bx('lens', [x[0], L.lo[1], L.lo[2] + 0.1], [x[1], L.lo[1] + 0.3, L.hi[2] - 0.1])); }
  P_.tips = { prims, cuts: [] }; }
{ P_.ldg = { prims: [bx('light', [-0.90, 4.95, 31.30], [0.90, 6.00, 32.55]), bx('lens', [-0.96, 4.80, 31.20], [0.96, 4.95, 32.64])], cuts: [] }; }
// harnesses and cables swept along their routes (one cylinder per segment at the bundle diameter)
export const harnessP = (pn) => ({ prims: pathsOf(pn).flatMap((r) => sweep(r.P, r.dIn ?? 0.25, 'bundle')), cuts: [] });
for (const pn of MY_H) P_[pn] = harnessP(pn);

// ------------------------------------------------------------------------------------------- masses (vendor weights on the envelopes)
/** lb/in³: material handbook values and effective densities that put a vendor weight on its envelope. G-10 0.0686 (1.90 g/cc,
 *  heavy end; MakeItFrom gives 1.8); nylon 0.0383 (nylon 12, heavier end of 1.01–1.06 g/cc: Zeus V1R3, accessed 2026-11-19); the
 *  metals and polycarbonate are the materials topic's (BOUND); sandwich and tube are derived effective values */
export const DENS = { G10: 0.0686, al: 0.098, cu: 0.323, brass: 0.307, ss: 0.289, nylon: 0.0383, pc: 0.043, sandwich: 0.0077, tube: 0.0197 };
const eff = (P, g, lb) => lb / (primVolumes(P)[g] || 1);
/** vendor weights (lb). Sourced 2026-11-19 (docs/blocks/i_electrical.md): battery 15.4 (Odyssey guide), k1 0.92 (STS-M12 / STS-A12
 *  Q&A), breaker 0.062 (Klixon 7274-2, 28 g max), vr 0.56 (LR3E-14 ≈ 9 oz), k2 1.0 (STS-S12), tip 0.41 (Pulsar NSP 6.6 oz, the heavier
 *  end of 0.24–0.41), ldg 0.63 (SunSpot 36LX 10.1 oz). BOUND (not found in public sources): anl, atc, fuseblocks, diode, gb1, gb2, vrConn */
export const VENDOR = { battery: 15.4, k1: 0.92, anl: 0.14, atc: 0.04, breaker: 0.062, fuseblocks: 0.27, diode: 0.12, gb1: 0.09, gb2: 0.22, vr: 0.56, vrConn: 0.03, k2: 1.0, tip: 0.41, ldg: 0.63 };
export const RHO = {
  battery: { battery: eff(P_.battery, 'battery', VENDOR.battery), box: DENS.G10, strap: DENS.al, terminal: DENS.brass, shelf: DENS.sandwich, vent: DENS.tube },
  master: { contactor: eff(P_.master, 'contactor', VENDOR.k1), stud: DENS.brass, bracket: DENS.al, anl: eff(P_.master, 'anl', VENDOR.anl), fuse: eff(P_.master, 'fuse', VENDOR.atc) },
  bus: { subpanel: DENS.al, breaker: eff(P_.bus, 'breaker', 6 * VENDOR.breaker), module: DENS.G10, fuseblock: eff(P_.bus, 'fuseblock', VENDOR.fuseblocks), anl: eff(P_.bus, 'anl', VENDOR.anl), diode: eff(P_.bus, 'diode', VENDOR.diode), busbar: DENS.cu, standoff: DENS.nylon },
  ground: { gb1: eff(P_.ground, 'gb1', VENDOR.gb1), gb2: eff(P_.ground, 'gb2', VENDOR.gb2), stud: DENS.brass },
  vr: { flange: DENS.al, body: eff(P_.vr, 'body', VENDOR.vr), connector: eff(P_.vr, 'connector', VENDOR.vrConn) },
  k2: { contactor: eff(P_.k2, 'contactor', VENDOR.k2), stud: DENS.brass, bracket: DENS.ss },
  tips: { light: eff(P_.tips, 'light', 2 * VENDOR.tip), lens: DENS.pc },
  ldg: { light: eff(P_.ldg, 'light', VENDOR.ldg), lens: DENS.pc },
};
for (const pn of MY_H) RHO[pn] = { bundle: harnessLb(pn) / (primVolumes(P_[pn]).bundle || 1) };
/** per-aircraft-set solids carrying both sides (lights, light harnesses): the record's mass is each */
export const PER_SET = { tips: 2, 'LEZ-33-110': 2 };
export const KEY = { 'LEZ-24-110': 'battery', 'LEZ-24-120': 'master', 'LEZ-24-130': 'bus', 'LEZ-24-140': 'ground', 'LEZ-24-150': 'vr', 'LEZ-80-100': 'k2', 'LEZ-33-100': 'tips', 'LEZ-33-120': 'ldg',
  'LEZ-24-160': 'LEZ-24-160', 'LEZ-24-161': 'LEZ-24-161', 'LEZ-24-162': 'LEZ-24-162', 'LEZ-24-165': 'LEZ-24-165', 'LEZ-80-110': 'LEZ-80-110', 'LEZ-33-110': 'LEZ-33-110' };
export const massEachOf = (k, V = primVolumes(P_[k])) => primMass(V, RHO[k]) / (PER_SET[k] || 1);

// ------------------------------------------------------------------------------------------- installation hardware (typed each-masses, lb)
/** engine-side cushion clamps on the starter cable and the B-lead: each on an angle bracket under a crankcase bolt */
export const ENG_CLAMPS = [['starter', [-1.00, 139.50, 41.85]], ['starter', [-1.00, 150.50, 41.85]], ['starter', [-5.90, 160.10, 40.00]], ['B-lead', [1.60, 139.50, 41.85]], ['B-lead', [1.20, 150.50, 41.85]], ['B-lead', [4.60, 160.85, 40.00]]];
export const INSTALL_HW = [
  { std: 'Firewall boot: 0.016 CRES flange plate Ø 3.5 (boot Ø 3.00, firewall rev C) with a fire-sealed silicone grommet, 5 lanes', qty: 1, each: 0.12, desc: 'power boot at A\'s layout hole (BL −2.20, WL 33.10, Ø 2.50), shared with block H\'s P-leads and GEA harness' },
  { std: '3M Fire Barrier 2000+ sealant, 10 oz', qty: 0.2, each: 0.70, desc: 'boot and grommet seal (fire side)' },
  { std: 'AE102 fire sleeve (2 AWG / 6 AWG sizes), per ft', qty: 4, each: 0.07, desc: 'starter cable and B-lead, firewall to the engine clamps' },
  { std: 'MS21919WDG10', qty: ENG_CLAMPS.length, each: 0.007, desc: 'engine-side cushion clamps (starter cable, B-lead)' },
  { std: 'Clamp bracket, 0.040 CRES angle under a crankcase bolt', qty: ENG_CLAMPS.length, each: 0.015, desc: 'engine-side clamp mounts under block G\'s case bolts (wpG1 CASE_BOLTS: top parting-flange and nose-section bolts; positions typed, verify on the engine)' },
  { std: 'Start relay K3, 12 V SPST-NO 30 A (ISO 280 automotive class), on K2\'s bracket', qty: 1, each: 0.06, desc: 'drives the STS-S12 coil (2.9 A) from the key\'s 2 A START contact (rev 2026-11-19; rating and mass BOUND, not researched)' },
  { std: 'AN3-5A', qty: 6, each: 0.012, desc: 'firewall bolts: K2 bracket, GB2, VR1 (A\'s layout holes)' },
  { std: 'MS21042L3', qty: 6, each: 0.003, desc: 'firewall nuts' }, { std: 'NAS1149F0363P', qty: 12, each: 0.001, desc: 'firewall washers' },
  { std: 'AN3-4A', qty: 4, each: 0.011, desc: 'battery box floor to the shelf inserts' },
  { std: 'NAS1832-3-2', qty: 6, each: 0.006, desc: 'potted inserts: 4 in the battery shelf, 2 in the K1 wall pad' },
  { std: 'MS27039C1-08', qty: 10, each: 0.002, desc: 'screws: K1 bracket, module standoffs, F1 holder, breaker sub-panel' },
  { std: 'Cable ties, lacing cord and labels (lot)', qty: 1, each: 0.08, desc: 'harness dressing and circuit labels at both wire ends' },
  // final integration: the shell's installation features for this block (LEZ-53-150 rev J I10 / I11)
  { std: 'Battery vent bulkhead drain fitting, 1/4 in tube, with flox potting', qty: 1, each: 0.015, desc: 'belly drain at the vent (shell rev J, I10)' },
  { std: 'G-10 wall pad 0.063 × 2.6 × 3.1 in, flox bed', qty: 1, each: 0.035, desc: 'master contactor bracket pad on the left side wall (shell rev J, I11)' },
  { std: 'NAS1832-3 insert, potted Ø 0.60', qty: 2, each: 0.006, desc: 'K1 bracket AN3s into the pad (shell rev J, I11)' },
];
const CL_EACH = { 3: 0.003, 4: 0.004, 5: 0.004, 6: 0.005, 8: 0.006, 10: 0.007, 12: 0.009, 14: 0.010, 16: 0.012, 20: 0.015, 24: 0.018 };   // MS21919WDG by dash (BOUND: not found in public sources; second research pass running)
const clEach = (d) => CL_EACH[d] ?? 0.004 + 0.0006 * d;
/** option A: the aft lane's conduit (both sides: jut-out lane from BL 19.4, wing panel to the tip face) and the liners of its
 *  short lined legs (CS spar low tunnel, the jut-out's leg under the K1 bay), bonded in as each part is built; nylon 12 at
 *  0.0383 (Zeus V1R3, heavier end) and LE phenolic at 0.0484 lb/in³ (SG 1.34, Plastics International; accessed 2026-11-19), and
 *  the GMU 11 side-port grommet (left) */
export const AFT_NYLON = 0.0383, AFT_PHENOLIC = 0.0484;
const AFT_HW = (() => { const L_ = AFT_LEN(), ft = (x) => Math.round(2 * x / 12 * 100) / 100, a = (q) => Math.PI / 4 * (q.od ** 2 - q.id ** 2);
  return [{ std: `${AFTC.conduit} (aft systems conduit)`, qty: ft(L_.conduit), each: AFTC.lbFt /* vendor weight per ft (Aircraft Spruce, accessed 2026-11-19) */, desc: `aft systems lane conduit, both sides (ft; ${(ft(L_.conduit) / 2).toFixed(2)} ft a side)` },
    { std: 'Phenolic tube 3/8 OD × 0.025 (aft lane liner)', qty: ft(L_.liner), each: r4(a(AFTC.liner) * 12 * AFT_PHENOLIC), desc: `CS spar low tunnel and the jut-out leg under the K1 bay, both sides (ft)` },
    { std: 'MS35489-10 grommet (5/16 ID, 3/4 panel hole, 1/16 grip)', qty: 1, each: 0.002, desc: 'GMU 11 harness side port, left wing BL 86 (dimensions confirmed, mass BOUND) — ' + CITE.ms35489 },
    // final integration: block A's left-wing GMU 11 features (LEZ-57-110 rev F, wpA9; the panel is drawn right-hand) and C's
    // light-harness side ports (both panels), carried here for the mass model
    { std: 'Phenolic tube 3/8 OD × 0.025 (GMU 11 branch liner)', qty: 0.22, each: r4(a(AFTC.liner) * 12 * AFT_PHENOLIC), desc: 'left wing branch tunnel, side port → spar web → pocket (ft; LEZ-57-110 rev F LH)' },
    { std: 'MS35489-11 grommet (3/8 ID, 5/8 panel hole, 1/16 grip; -40 for 1/8, -69 for 3/16)', qty: 2, each: 0.002, desc: 'left wing spar-web crossing, each web face: passes the 3/8 OD liner (part swap 2026-11-19: the -7 is 1/4 ID and cannot; A to open the web hole to 5/8: ICD ask, docs/icd/a_airframe.md; mass BOUND) — ' + CITE.ms35489 },
    { std: 'GMU 11 pocket cover 0.032 2024-T3 with 2-ply BID ring doubler', qty: 1, each: 0.06, desc: 'left wing lower skin (LEZ-57-110 rev F LH; doubler typed 0.103 lb/ft² per ply)' },
    { std: 'K1000-08 nutplate + NAS1352-08 316 CRES screw', qty: 10, each: 0.005, desc: 'GMU 11 pocket cover, non-magnetic screws (LEZ-57-110 rev F LH)' },
    { std: 'MS35489-4 grommet (3/16 ID, 5/16 panel hole, 1/16 grip)', qty: 2, each: 0.001, desc: 'systems-conduit side port at the last bend, each wing (LEZ-57-110 rev F; dimensions confirmed, mass BOUND)' }]; })();
/** wire and line supports: wp12's clamp list with typed each-masses (clamp, screw, nutplate, bonded G-10 standoff) */
export const SUPPORT_HW = (ext) => {
  const cs = CLAMPS.filter((c) => !!c.ext === ext), by = {}; for (const c of cs) by[c.dash] = (by[c.dash] || 0) + 1;
  return [...Object.entries(by).sort((a, b) => a[0] - b[0]).map(([d, n]) => ({ std: `MS21919WDG${d}`, qty: n, each: clEach(+d), desc: `cushion clamp, ${d}/16 in ID` })),
    { std: 'MS27039C1-06', qty: cs.length, each: 0.0015, desc: 'clamp screw' }, ...(ext ? [{ std: 'G-10 tab 0.75 × 1.0 × 0.0625, bonded (flox)', qty: cs.length, each: 0.0021, desc: 'clip tab on the gear leg / wing-root skin' }]
      : [{ std: 'MS21047L3', qty: cs.length, each: 0.002, desc: 'nutplate on the standoff' }, { std: 'G-10 standoff 0.75 × 0.75 × 0.5, bonded (flox)', qty: cs.length, each: 0.0028, desc: 'raceway / run standoff' }, ...AFT_HW])];
};
export const hwMass = (L) => L.reduce((a, l) => a + l.qty * l.each, 0);

// ------------------------------------------------------------------------------------------- system records follow the definition
for (const [pn, k] of Object.entries(KEY)) { const p = partByPN(pn); if (!p) continue; p.massEach = r4(massEachOf(k)); p.src = { ...(p.src || {}), mass: `DEFINED: ${pn} definition record (envelope solid × vendor weights / wire list)` }; }
{ const p = partByPN('LEZ-24-100'); p.massEach = r4(hwMass(INSTALL_HW)); p.src = { ...(p.src || {}), mass: 'DEFINED: LEZ-24-100 installation hardware lines' }; }
/** ko-battery = the box + 0.09 in (ICD I-R9); wp5 defines it after this module, so it is reset once everything has loaded */
const koBattery = () => { const B = LY.BAT.box, m = 0.09; defineKeepouts([{ ...(KEEPOUTS.find((k) => k.id === 'ko-battery') || { id: 'ko-battery', t: 'box', why: 'battery', owner: 'LEZ-24-110', applies: (c) => c !== 'power' }), c: [(B.lo[1] + B.hi[1]) / 24, (B.lo[0] + B.hi[0]) / 24, (B.lo[2] + B.hi[2]) / 24], d: [(B.hi[1] - B.lo[1] + 2 * m) / 12, (B.hi[0] - B.lo[0] + 2 * m) / 12, (B.hi[2] - B.lo[2] + 2 * m) / 12] }]); };
LOAD.after.push(koBattery);
/** block H's `fw-boot-h` and this block's `fw-power` are the same boot (A's layout hole); both entries stay (H's records name theirs) */
{ const f = PASS.find((q) => q.id === 'fw-power'); if (f) f.what = 'Power boot (block A layout, Ø 3.00, fire-sealed): block I starter and ground cables and the B-lead / field bundle; block H P-leads and GEA 24 harness (the same boot as H\'s fw-boot-h entry, which H\'s records name)'; }
const syncSupports = () => { for (const [pn, ext] of [['LEZ-20-100', false], ['LEZ-20-110', true]]) { const p = partByPN(pn); p.hardware = SUPPORT_HW(ext).map(({ std, qty, desc }) => ({ std, qty, desc })); p.massEach = r4(hwMass(SUPPORT_HW(ext))); p.src = { ...(p.src || {}), mass: `DEFINED: ${pn} support hardware lines` }; } };
syncSupports(); LOAD.after.push(syncSupports);   // after wp12 rebuilds its clamps on the final routes
