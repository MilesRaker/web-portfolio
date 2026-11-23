// WPC1 — block C flight controls (ATA 27): the layout, linkage ratios, member sizing and checks of LEZ-27-100 … -172.
//  • Layout (inches; points [FS, BL, WL]; the right side is given, L/R parts mirror at BL 0):
//    pitch — front side stick on a gimbal at the roll tube's front end (grip 7.0 in above the pitch pin, pitch arm 3.0 in
//    below it) → straight pitch rod forward along the right wall → a 1.2 in bellcrank arm on the elevator torque tube,
//    which runs across the nose below the canard (FS 26.8, WL 40.9), out through the fuselage sides and under the canard
//    root to BL ±13.4, where a 1.5 in drive arm and a parallelogram link work each elevator's horn (rev B: the rod-end
//    hole 1.5 in from the hinge pin, 45° forward-down, below the canard). Balance weights ride forward-pointing arms on
//    the tube inside the fuselage. The rear stick drives the front stick's pitch arm through a parallel rear pitch link.
//    roll — the roll tube runs straight from the front stick through the rear stick to a 2.5 in crank at FS 136.8; a
//    lateral link turns the centre walking-beam bellcrank (vertical pivot at BL 0 on a bracket off the CS spar's forward
//    face); its arms drive rod A each side through the CS spar core (in at the forward web inside the fuselage, out at
//    the aft web outboard of the cowl), a corner bellcrank K1 behind the spar turns rod B outboard along FS 157, a
//    second bellcrank K2 in the wing turns it into link C, which meets the aileron's downward horn (rev B) square to the
//    hinge. Every arm is set square to its rod at neutral, so the ratios are exact.
//    rudder — hung pedals on a cross tube at FS 37.4; a 2.8 in horn above the pivot pulls each cable aft along the side
//    wall, through the same CS spar corridor (in conduit) and out the wing to the rudder. The toe of each pedal is
//    hinged and pushes its master cylinder (LEZ-32-311), whose body is anchored on the pedal so rudder travel does not
//    brake.
//  • Loads: 14 CFR 23.395 / 23.397(b) / 23.399 (pre-amendment 23-64 text, typed from memory): pilot maximum forces 167 lb
//    pitch, 67 lb roll (stick), 200 lb rudder; dual control in opposition max(0.75 × 23.395, 23.397 minimum) and
//    together 2 × 0.75 × 23.395 downstream of the junction. Conventions: roll — single pilot reacted at one horn (a jam
//    on the other side), pilots together shared by both ailerons; pitch — shared by the two elevators as the released
//    horn assumed, the torque tube carrying the whole torque on one side. Joints with angular motion take the 23.693
//    special factor 3.33 on bearing; the 23.659 mass-balance load factors (24 g / 12 g) apply to the weights.
// Every check is at FS 1.5 (limit × 1.5) with the sizing reserve TGT. Notional; not for construction.
import { GEO, BASE_MAT, fusAt, DEFAULT_DESIGN, registerChecks, mk, CTL, CS_FIT, surfaceLoads, plyRF, laminate, wrinkling, psi, wingletSec, aircraft, effective, WEIGHT_CASES, FIXED } from '../structures.js';
import { FRAMES, afAt } from '../plybook.js';
import { partByPN, defineReqs, defineGraph } from '../systems.js';
import { CTLS, HINGE, ctlSection, ctlStations } from './wp19_ctl.js';
import { FUS } from './wp26_fuselage.js';
import { RD_HORN } from './wpA6_rudder.js';
import { yawStability } from './wpS1_yaw.js';
import { SBP, SB } from './wpA4_seatback.js';

export const TGT = 0.15;
const r4 = (x) => Math.round(x * 1e4) / 1e4, D2R = Math.PI / 180;
const add = (a, b) => a.map((v, i) => v + b[i]), sub = (a, b) => a.map((v, i) => v - b[i]), mul = (a, k) => a.map((v) => v * k);
const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0), len = (a) => Math.hypot(...a), norm = (a) => mul(a, 1 / (len(a) || 1));
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const V = { add, sub, mul, dot, len, norm, cross };
const IN_ = (n, v, u, s = 'DERIVED') => [n, v, u, s];

// ------------------------------------------------------------------------------------------- materials (typed from memory)
// MIL-HDBK-5 / MMPDS typical values, typed from memory: check against the current handbook before use (record notes).
export const MAT = {
  '4130': { rho: 0.283, Ftu: 95000, Fty: 75000, Fsu: 57000, Fbru: 200000, E: 29.0e6, spec: 'MIL-HDBK-5J table 2.3.1.0(c1), 4130 N tube/sheet t ≤ 0.188, S-basis, Fbru e/D 2.0 (KasperCalc transcription, accessed 2026-11-19)' },
  '2024': { rho: 0.100, Ftu: 64000, Fty: 42000, Fsu: 39000, Fbru: 122000, E: 10.5e6, spec: 'MIL-HDBK-5J table 3.2.3.0(g), 2024-T3 drawn tube, wall 0.018–0.500 in, A-basis, Fbru e/D 2.0 (KasperCalc transcription, accessed 2026-11-19)' },
  '6061': { rho: 0.098, Ftu: 42000, Fty: 35000, Fsu: 27000, Fbru: 88000, E: 9.9e6, spec: 'MMPDS 6061-T6 sheet/plate (typed from memory)' },
  lead: { rho: 0.410, spec: 'Lead, chemical (0.41 lb/in³)' }, uhmw: { rho: 0.034, spec: 'UHMW-PE (0.034 lb/in³)' }, nylon: { rho: 0.041, spec: 'Nylon 6/6 (0.041 lb/in³)' },
  bid: { rho: 0.0627, spec: '6781 / MTM45-1 cured, 1/(0.60/2.50 + 0.40/1.19) = 1.74 g/cm³ (derived from the HexForce handbook density appendix, accessed 2026-11-19)' }, pvc: { rho: 0.048 * 62.43 / 1728, spec: 'Divinycell HT61 (45 kg/m³)' },
};
// single shear ultimate, lb: Fsu 75 ksi × π/4 × d² on the AN shank (AN3 0.190 in): MIL-HDBK-5J table 2.3.1.0(c2), 125 ksi column (files.engineering.com excerpt, accessed 2026-11-19), derived
export const AN = { 3: { d: 0.1875, s: 2126 }, 4: { d: 0.25, s: 3682 }, 5: { d: 0.3125, s: 5750 }, 6: { d: 0.375, s: 8280 } };   // single shear ultimate, lb (AN standard)
/** rod-end bearing, 3/16 bore, 10-32 shank (Aurora CM-3 / MM-3 class): radial ultimate typed from memory → a bound */
// Aurora (Timken) rod ends, 3/16 bore, 10-32: MM-3 male precision 1,169 lb ultimate radial static (governs), CM-3 male economy 1,204 lb, CW-3 female
// economy 2,079 lb; ball width 0.312, head Ø 0.625, CM-3 base-to-centre 1.250, thread 0.750 (CW-3 1.062 / 0.500). src 'Aurora (Timken) MM/MB and CM/CB
// male rod ends, general purpose (cad.timken.com, accessed 2026-11-19)'. Industrial (non-aviation) series; ratings without grease fittings.
// ball 0.5: the ball OD, BOUND (not a published figure); mass BOUND (not found in public sources).
export const ROD_END = { name: 'Aurora MM-3 (male, precision) / CM-3 (male, economy) rod-end bearing, 3/16 bore, 10-32 (female 10-32 would be CW-3 / MW-3)', ult: 1169, w: 0.312, ball: 0.5, head: 0.625, baseToC: 1.250, thread: 0.750, mass: 0.03 };
export const CABLE = { name: 'MIL-DTL-83420 Type I Comp. B (CRES) 3/16 in 7×19', brk: 3700, lbPerFt: 0.065, d: 0.1875, area: 0.0184,
  AE: { lo: 190000, hi: 217000 } };   // DC-005 (sourced 2026-11-21): M83420/2-008, 3,700 lb (Lexco Cable catalogue); 6.5 lb/100 ft (Lexco) → metallic area ≈ 0.0184 in² (derived:
// weight / steel density); axial stiffness AE: hi 217,000 lb from the Loos & Co. elastic-stretch formula (G = 0.0000162 for 7×19 302/304, blog.loosco.com),
// lo 190,000 lb from S3i (E = 47.5 kN/mm² on the gross area, s3i.co.uk wire-rope technical); the low value sets the pedal stop (more stretch), the
// high value the stop loads (more force). Constructional stretch (< 1 %) is taken out by the 60 % proof load before installation (Loos).
/** cable terminals (DC-005, 2026-11-21: 3/16 in; were the 1/8 in MS20667-4 / MS21251-B5S): fork end MS20667-6, turnbuckle MS21251-B6S with
 *  MS21260-S6 terminals and MS21256-2 clips */
export const TERM = { fork: 4200, tb: 4600, term: 4200, forkStd: 'MS20667-6', forkPin: 0.3125, forkJaw: 0.260, tbStd: 'MS21251-B6S', tbEnd: 'MS21260-S6RH / -S6LH', clip: 'MS21256-1' };
// DC-005 (sourced 2026-11-21): MS20667-6 fork end, 3/16 in cable, 4,200 lb, pin hole 0.313, jaw 0.260, 5/16-24 (Aircraft Spruce 2026 catalogue p. 137);
// MS21251-B6S turnbuckle body 4,600 lb, 5/16-24, L 2.250, clip MS21256-1 (MS21251M Table I, faa.gov/media/28696; Lexco) — the -2 clip goes with the
// long B6L body; MS21260-S6RH / -S6LH short terminals, 3/16 in cable, 5/16-24, 4,200 lb (Aircraft Spruce MS21260 page)
/** set-back balance hinge-moment factor k = C_hδ(balanced)/C_hδ(plain), NACA blunt nose, sealed gap, each against its own test's plain flap where
 *  available: 0.80 at 0.20 c_f (Ames, ARR WR L-301, 1941: an 18–25 % slope reduction, the conservative end), 0.28 at 0.35 c_f (Ames & Eastman, ARR L-355,
 *  1941: −0.0033 against the plain flap's −0.0120); linear between the points; then the bracket notches (BAL_NOTCH of the span unbalanced) and × 1.1
 *  for the thicker flap section (t/c_f 0.24 against 0.18) and imperfect wiper sealing (allowance, DESIGN) */
export const BAL_DATA = [[0, 1], [0.20, 0.80], [0.35, 0.28]], BAL_ALLOW = 1.1, BAL_NOTCH = 3 * 2.5 / 50.6;
export function balFactor(b) { if (!b) return 1; const D = BAL_DATA; let k = D.at(-1)[1]; for (let i = 1; i < D.length; i++) if (b <= D[i][0]) { const [x0, y0] = D[i - 1], [x1, y1] = D[i]; k = y0 + (y1 - y0) * (b - x0) / (x1 - x0); break; }
  const kn = 1 - (1 - k) * (1 - BAL_NOTCH); return Math.min(1, kn * BAL_ALLOW); }
export const CONDUIT = { name: 'PTFE tubing 5/16 in OD × 1/4 in ID × 0.031 in wall (Parker 101-0312031-NT-50), cable threaded before swaging', od: 0.3125, id: 0.25, bendR: 2.25 };   // DC-005 (sourced 2026-11-21): Parker 101-0312031-NT-50, 1/4 ID × 5/16 OD, 0.031 wall, bend radius 2 1/4 in (Zoro G9535429); the Long-EZ's Nylaflow tops out at 1/4 × 0.190 in (Aircraft Spruce 05-00115), line-to-line with 3/16 in cable
export const SPECIAL = 3.33;   // FAR 23.693 bearing factor on joints with angular motion (not ball/roller)
export const FS_ = DEFAULT_DESIGN.FS;
export const TUBES = [[0.375, 0.035], [0.5, 0.035], [0.5, 0.049], [0.625, 0.035], [0.625, 0.049], [0.75, 0.035], [0.75, 0.049], [0.875, 0.035], [0.875, 0.049], [1.0, 0.035], [1.0, 0.049], [1.0, 0.065], [1.125, 0.058], [1.25, 0.058], [1.25, 0.065]];
const tA = (od, w) => Math.PI * ((od / 2) ** 2 - (od / 2 - w) ** 2);
const tI = (od, w) => Math.PI / 64 * (od ** 4 - (od - 2 * w) ** 4);
const tJ = (od, w) => 2 * tI(od, w);
/** pinned column between supports L (in): Johnson below the transition slenderness, Euler above; returns ult allowable P (lb) */
export function column(od, w, L, m) {
  const ro = od / 2, ri = ro - w, A = tA(od, w), rho = Math.sqrt((ro * ro + ri * ri) / 4), sl = L / rho, slc = Math.sqrt(2 * Math.PI ** 2 * m.E / m.Fty);
  const s = sl < slc ? m.Fty - (m.Fty ** 2 / (4 * Math.PI ** 2 * m.E)) * sl * sl : Math.PI ** 2 * m.E / (sl * sl);
  return { P: s * A, sl, mode: sl < slc ? 'Johnson column' : 'Euler column' };
}
/** lightest tube from TUBES meeting all of fn(od, w) ≥ TGT (fn returns the lowest MS), not smaller than minOD */
function pickTube(fn, mat, minOD = 0) {
  for (const [od, w] of [...TUBES].sort((a, b) => tA(...a) - tA(...b))) if (od >= minOD && fn(od, w) >= TGT) return [od, w];
  return TUBES.at(-1);
}

// ------------------------------------------------------------------------------------------- loads (FAR 23, limit)
export const PILOT = {
  pitch: { max: 167, min: 100 }, roll: { max: 67, min: 40 }, rudder: { max: 200, min: 150 },
  src: '14 CFR 23.397(b) (pre-amendment 23-64), stick: elevator 167 / 100 lb, aileron 67 / 40 lb; rudder 200 / 150 lb (typed from memory)',
};
const opp = (k) => Math.max(0.75 * PILOT[k].max, PILOT[k].min), tog = (k) => 2 * 0.75 * PILOT[k].max;
export const LOADS = {
  pitch: { single: PILOT.pitch.max, opp: opp('pitch'), together: tog('pitch') }, roll: { single: PILOT.roll.max, opp: opp('roll'), together: tog('roll') },
  rudder: PILOT.rudder.max, toe: PILOT.rudder.max, trim: (R) => Math.min(150, Math.max(50, (1 + R) / 3 * 50)),
};

// ------------------------------------------------------------------------------------------- layout
const CSF = (GEO.csSpar.s - GEO.csSpar.width / 2) * 12, CSA = (GEO.csSpar.s + GEO.csSpar.width / 2) * 12;
export const ARM = { grip: 7.0, gripR: 4.0, pitch: 3.0, roll: 2.5, pitchBC: 1.2, horn: 1.5, k: 2.5, pedalPad: 5.6, pedalHorn: 2.6 /* integration 2026-11-19 (ICD B-S1): 2.8 → 2.6 in so the swept left horn clears J's 3.03 in G5 can (with its battery) by ≥ 0.25 in at WL 42.0 */, toePad: 2.0, toeTab: 3.0, wElev: 3.0 };
export const L = (() => {
  const o = {};
  // ---- elevator: hinge pin at the inboard end (lower skin), horn rev B, torque tube below the canard
  const ste = ctlStations('elevator'), se = ctlSection('elevator', ste[0]), pinE = se.pts[CTLS.elevator.hinge > 0 ? 24 : 25];
  o.blE = r4(ste[0] * 12); o.pinE = [pinE[0], o.blE, pinE[1]];
  const s45 = Math.SQRT1_2;
  o.hornE = add(o.pinE, [-ARM.horn * s45, -0.25 - (o.blE - o.blE), -ARM.horn * s45]);          // rod-end hole, 0.25 in inboard of the horn plate
  o.hornE[1] = o.blE - 0.25;
  o.T0 = add([o.pinE[0], 0, o.pinE[2]], [1.3 * s45, 0, -1.3 * s45]);                               // tube axis (FS, -, WL)
  o.tube = { od: 0.75, bl: 13.55, armBL: 13.36, bearBL: 9.2 };
  o.driveTip = [o.T0[0] - ARM.horn * s45, o.tube.armBL, o.T0[2] - ARM.horn * s45];                // drive arm ∥ horn
  // ---- stick and roll axis
  o.G1 = [47.00, 10.0, 35.5];
  // the stick leans inboard at neutral (ICD phase 2: the grip met the right canopy rail at about 5° roll); its fork,
  // yoke and pitch arm stay square to the roll axis, only the tube above the yoke is canted
  o.cant = 16; o.stickDir = [0, -Math.sin(o.cant * D2R), Math.cos(o.cant * D2R)];
  o.grip = add(o.G1, mul(o.stickDir, ARM.grip));
  o.bcBL = 9.0;
  // pitch rod: arms square to the rod (iterate)
  let PB = [o.T0[0], o.bcBL, o.T0[2] - ARM.pitchBC], PA = add(o.G1, [0, 0, -ARM.pitch]);
  for (let k = 0; k < 6; k++) {
    const r = norm(sub(PA, PB)), rz = norm([r[0], 0, r[2]]);
    const dn = [rz[2], 0, -rz[0]];                                                                  // perpendicular in the FS-WL plane, pointing down
    const db = dn[2] < 0 ? dn : mul(dn, -1);
    PB = [o.T0[0] + ARM.pitchBC * db[0], o.bcBL, o.T0[2] + ARM.pitchBC * db[2]];
    PA = [o.G1[0] + ARM.pitch * db[0], o.G1[1], o.G1[2] + ARM.pitch * db[2]];
  }
  o.PB = PB.map(r4); o.PA1 = PA.map(r4); o.armDir = norm(sub(PA, o.G1));
  // ---- aileron chain
  o.WLA = 37.0;
  o.E = [CSF, 10.9, o.WLA]; o.X = [CSA, 13.6, o.WLA]; o.u = norm(sub(o.X, o.E));
  o.PT = [120.00, 0, o.WLA];
  const t = dot(sub(o.PT, o.E), o.u); o.SR = add(o.E, mul(o.u, t)); o.rT = len(sub(o.PT, o.SR));
  o.IT = add(o.PT, [-o.rT, 0, 0]); o.CT = [o.IT[0], o.G1[1], o.WLA]; o.R1 = [o.IT[0], o.G1[1], o.WLA + ARM.roll];
  o.rollAxis = norm(sub(o.R1, o.G1));
  // rod B on FS 157.9: aft of the wing spar block out to K2 (was 3.0 along rod A → FS 156.8, inside the block at BL 60)
  o.K1a = add(o.X, mul(o.u, 4.33)); const n1 = [-o.u[1], o.u[0], 0]; o.Q1 = add(o.K1a, mul(n1, ARM.k)); o.K1b = add(o.Q1, [ARM.k, 0, 0]);
  const sta = ctlStations('aileron'), sa = ctlSection('aileron', sta[0]), sb = ctlSection('aileron', sta.at(-1)), hi = CTLS.aileron.hinge > 0 ? 24 : 25;
  o.blA = r4(sta[0] * 12); o.pinA = [sa.pts[hi][0], o.blA, sa.pts[hi][1]]; const pinB = [sb.pts[hi][0], sta.at(-1) * 12, sb.pts[hi][1]];
  o.hingeA = norm(sub(pinB, o.pinA));
  o.hornA = [o.pinA[0] - 0.30, o.blA - 0.25, o.pinA[2] - ARM.horn];                                // horn rev B: straight down from the pin
  o.relA = [r4(o.hornA[1] - ROD_END.w / 2 - 0.125), r4(GEO.wing.aileron[0] * 12)];                   // the wing's cove-end relief (BL) round the rod end
  const hp = norm([o.hingeA[0], o.hingeA[1], 0]), v = [-hp[1], hp[0], 0];                         // link C: square to the hinge in plan, forward-outboard
  o.vC = v;
  let best = null;
  for (const m of [[-v[1], v[0], 0], [v[1], -v[0], 0]]) {
    const LC = (o.K1b[0] + ARM.k - o.hornA[0] - ARM.k * m[0]) / v[0];
    if (LC <= 0) continue; const K2c = add(o.hornA, mul(v, LC)); K2c[2] = o.WLA; const Q2 = add(K2c, mul(m, ARM.k));
    if (!best || Q2[1] < best.Q2[1]) best = { LC, K2c, Q2, m };
  }
  Object.assign(o, { K2c: best.K2c, Q2: best.Q2 }); o.K2d = [o.K1b[0], o.Q2[1], o.WLA]; o.disc = 53.25;   // outboard of the jut-out drag-spar caps' lap (BL 45–51) so the lower-skin access hole misses it (was 46.5)
  // ---- rear stick, rear pitch link, trim
  const tR = (84.30 - o.G1[0]) / o.rollAxis[0]; o.G2 = add(o.G1, mul(o.rollAxis, tR));
  o.PA2 = add(o.G2, sub(o.PA1, o.G1));
  o.trimPiv = [55.20, 11.0, 37.0]; o.trimLow = add(o.trimPiv, [0, 0, -1.5]); o.trimTop = add(o.trimPiv, [0, 0, 3.0]);
  const ut = (70.0 - o.PA1[0]) / (o.PA2[0] - o.PA1[0]); o.trimClamp = add(o.PA1, mul(sub(o.PA2, o.PA1), ut));
  // ---- pedals
  o.ped = { s: 37.44, z: 37.44, y: 4.32, halfSpan: 10.5, tube: [1.0, 0.049] };
  // master cylinder (LEZ-32-311, block D): its rod eye and body eye as block D places them (MC_GEO in wpD2, BL/FS/WL there;
  // the ICD check R-ICD-C compares them); the toe tab is square to the MC axis, ARM.toeTab below-aft of the rod eye
  o.mcRod = [34.9000, o.ped.y, 35.5]; o.mcBody = [39.7845, o.ped.y, 36.5685];   // rev B: MC and its clevises 0.50 in forward (ICD J-R3: the ear cleared B's AXIS collar and J's switch row by < 0.25 in over the pedal travel)
  { const u = norm([o.mcBody[0] - o.mcRod[0], o.mcBody[2] - o.mcRod[2]]), n = [-u[1], u[0]]; o.toeHinge = [r4(o.mcRod[0] - ARM.toeTab * n[0]), o.ped.y, r4(o.mcRod[2] - ARM.toeTab * n[1])]; }
  o.cableHorn = [o.ped.s, o.ped.y + 1.0, o.ped.z + ARM.pedalHorn];
  // ---- landing brake (belly panel FS 62–80, BL ±6, hinge at its forward edge), actuator under the floor
  o.lb = { s0: r4(FUS.cut.s0 * 12), s1: r4(FUS.cut.s1 * 12), hw: FUS.cut.hw, gap: 0.06, open: 70, Vlb: 80, CN: 1.0, anchor: [66.0, 0, 33.0] /* seat-3: found on the seat back by LB() */ };
  return o;
})();
/** the rudder cable's end at block A's rudder horn (LEZ-55-193, RD_HORN): a fairlead in the wing tip close-out (T),
 *  a pulley in the fin 3.0 in ahead of the horn at its height on the fin mid-plane (P), then straight aft to the horn's
 *  cable hole (H). The rudder's full-travel stroke at the cable comes from rotating H about the hinge pin axis. */
export const RUD = (() => {
  const F = FRAMES.winglet, st = ctlStations('rudder'), pin = (h) => { const sc = ctlSection('rudder', h); return F.pt(h, sc.xH, sc.balance ? sc.balance.mid : afAt(F, h, sc.xH).yl).map((v) => v * 12); };   // DC-005: set-back hinge axis at mid-depth
  const p0 = pin(st[0]), ax = norm(sub(pin(st.at(-1)), p0)), H = RD_HORN.at.map((v) => r4(v * 12)), ca = GEO.winglet.cant * D2R;
  const P = [r4(H[0] - 3.0), r4(GEO.winglet.y0 * 12 + (H[2] - GEO.wing.z * 12) * Math.tan(ca)), H[2]], T = [r4(H[0] - 3.0 - 0.37), 149.2, 37.2];   // fairlead 0.37 in forward of the fin pulley, as laid out (FS 172.70 with the horn at 176.07); DC-005 (2026-11-21): follows the wider rudder's horn forward
  const rot = (p, th) => { const v = sub(p, p0), c = Math.cos(th), s_ = Math.sin(th); return add(p0, add(add(mul(v, c), mul(cross(ax, v), s_)), mul(ax, dot(ax, v) * (1 - c)))); };
  const d = norm(sub(P, H)), arm = dot(ax, cross(sub(H, p0), d)), sg = arm > 0 ? 1 : -1, th = DEFAULT_DESIGN.rudderDeg * D2R;
  const stroke = len(sub(P, H)) - len(sub(P, rot(H, sg * th)));
  return { tail: [T, P, H], T, P, H, p0, ax, arm: Math.abs(arm), stroke, rot: (q, deg) => rot(q, sg * deg * D2R), pulley: 2 };   // pulley: index from the end of the route (P)
})();
/** route point indices: the side-wall run, the CS spar forward and aft faces, the pulley (from the end) */
export const RR = { wall: 4, fwd: 7, aft: 8 };
/** right rudder cable route (points), entry and exit through the CS spar corridor */
export function rudRoute(sg = 1) {
  // after the panel the conduit climbs over the pitch rod (it ran through it at FS 42) and drops to the side wall. Final
  // integration (panel LEZ-31-100 rev C): the first leg is aimed so each conduit crosses the panel in its own hole (right BL
  // 7.89, WL 38.30; left BL −7.68, WL 38.11, clear of the warning unit); the wall run ends at FS 126 / 127 so the conduits
  // pass the rear seat bulkhead (FS 130.2) in holes rather than edge slots
  const d0 = sub(sg > 0 ? [42.0, 8.65, 38.05] /* DC-005: 0.32 in higher so the thicker 3/16 in conduit keeps its own panel hole clear of J's console bundle (was 37.73) */ : [42.0, 8.37, 37.48], L.cableHorn), A1 = add(L.cableHorn, mul(d0, (41.3 - L.cableHorn[0]) / d0[0])).map(r4);
  const p = [L.cableHorn, A1, [42.6, 9.6, 38.1], [45.0, 11.2, 37.0], [50.0, 11.6, 33.0], [sg > 0 ? 100.50 : 101.50, 11.6, 33.0], [120.50, 9.4, 38.6], [CSF, 9.4, 38.6], [CSA, 12.6, 38.6], [129.50, 20.0, 38.6], [130.50, 44.4, 38.1], [134.70, 46.8, 37.3] /* DC-005: 0.1 in higher so the thicker conduit keeps 0.25 in over the aileron rod (were 38.0 / 37.2) */, [142.50, 54.0, 36.2], [170.70, 145.8, 36.6], ...RUD.tail];
  return p.map((q) => [q[0], sg * q[1], q[2]]);
}
export const ft = (p) => [p[0] / 12, p[1] / 12, p[2] / 12];   // model frame (ft) for the system geometry
export const SP = (p) => [p[1], p[0], p[2]];                  // solid frame: x = BL, y = FS, z = WL

// ------------------------------------------------------------------------------------------- linkage loads (limit, lb / in-lb)
export const LINK = (() => {
  const P = LOADS.pitch, R = LOADS.roll, k = ARM.grip / ARM.pitch;
  const pitchRod = { single: P.single * k, together: P.together * k, opp: P.opp * k };
  const tubeT = pitchRod.together * ARM.pitchBC;                                                  // torque into the tube, together
  const hornE = tubeT / 2 / ARM.horn;                                                             // per elevator (shared)
  const rollT = { single: R.single * ARM.grip, together: R.together * ARM.grip, opp: R.opp * ARM.grip };
  const ailRod = Math.max(rollT.single / ARM.roll, rollT.together / ARM.roll / 2);                // jam: all to one side; together: shared
  const rearLink = Math.max(P.single * ARM.gripR, P.opp * ARM.grip) / ARM.pitch;                  // rear pilot alone on the shorter rear stick, or the front pilot in opposition
  // the cable leaves the pedal horn toward the next route point, not square to the horn: its moment arm about the pedal
  // axis (BL) is the horn length × the cable direction's FS component
  const r0 = rudRoute(1), dC = norm(sub(r0[1], r0[0])), hornEff = Math.abs((r0[0][2] - L.ped.z) * dC[0] - (r0[0][0] - L.ped.s) * dC[2]);
  const pedal = LOADS.rudder, cable = pedal * ARM.pedalPad / hornEff, mc = LOADS.toe * ARM.toePad / ARM.toeTab;
  // rudder linkage under load (DC-005 review, 2026-11-21): the rudder horn's effective arm through the travel (the cable
  // must not approach dead centre), the cable tension and pedal force that hold full rudder at the crosswind approach
  // (1.3 VSO, FAR 23.233 / 23.143), and the cable's elastic stretch at that tension, which the pedal must take up too
  // computed on access, so it uses the live mass model (VSO), not the estimate in force when this module loads
  const rudLinkNow = () => {
  const full = DEFAULT_DESIGN.rudderDeg, sAt = (deg) => len(sub(RUD.P, RUD.H)) - len(sub(RUD.P, RUD.rot(RUD.H, deg)));
  const armAt = (deg) => (sAt(deg + 0.05) - sAt(deg - 0.05)) / (0.1 * D2R);
  let armMin = Infinity; for (let a = 0; a <= full + 1e-9; a += 0.5) armMin = Math.min(armMin, armAt(a));
  const g = GEO.winglet; let I2 = 0; for (let h = g.rudder[0]; h < g.rudder[1] - 1e-9; h += 0.01) { const cr = wingletSec(h + 0.005).c * g.rudderCf; I2 += cr * cr * 0.01; }   // ∫ c_r² dh, ft³
  const VsKt = yawStability(effective(DEFAULT_DESIGN)).VsKt,   // the same VSO as the crosswind check (wpS1 yaw-cndr)
    qApp = 0.5 * 0.0023769 * (1.3 * VsKt * 1.68781) ** 2;
  // set-back balance (DC-005): hinge moment × k_bal from the NACA sealed-gap data (balFactor), b = overhang / rudder chord; used for the pedal force
  // and the reach check's stretch, not for the pedal stop (tUnbal, k = 1) or the stop loads
  const bal = GEO.winglet.rudderBal || 0, kBal = balFactor(bal);
  const ChFull = FIXED.ctl.Ch * full / 25 * kBal, hmApp = ChFull * qApp * I2 * 12;                               // in·lb; C_h 0.5 at 25° (the model's design coefficient), scaled with travel (BOUND)
  const armFull = armAt(full), tApp = hmApp / armFull, fApp = tApp * hornEff / ARM.pedalPad;
  const rr = rudRoute(1); let Lc   /* DC-005 review fix: rudRoute already ends with RUD.tail (was counted twice, +5 %) */ = 0; for (let i = 1; i < rr.length; i++) Lc += len(sub(rr[i], rr[i - 1]));
  const CAB = { A: CABLE.area, E: CABLE.AE.lo / CABLE.area, Ehi: CABLE.AE.hi / CABLE.area }, stretch = tApp * Lc / (CAB.E * CAB.A);   // sourced AE (CABLE.AE): the low bound for stretch
  const pedalDeg0 = Math.asin(RUD.stroke / hornEff) * 180 / Math.PI;                                       // unloaded: pedal travel that strokes the cable through full rudder
  // DC-005: the rudder's travel is limited by stops on the rudder (at full travel); the pedal stops sit beyond, set to take up the
  // cable's stretch under the approach load plus 1° (so the rudder reaches its own stop in the crosswind case)
  // DC-005 review fix: the pedal stop is set from the UNBALANCED stretch (k_bal = 1), so full rudder is reached in the crosswind
  // case even if the set-back balance gives none of its BOUND relief; with the balance working the rudder simply meets its own stop sooner
  const tUnbal = FIXED.ctl.Ch * full / 25 * qApp * I2 * 12 / armFull, stretchUnbal = tUnbal * Lc / (CAB.E * CAB.A);
  const pedalDeg = Math.asin(Math.min(1, (RUD.stroke + stretchUnbal) / hornEff)) * 180 / Math.PI + 1.0;
  // under the approach load the cable stretches, so at the pedal stop the rudder reaches less than full travel: solve
  // stroke(δ) + stretch(T(δ)) = stroke(full), with T(δ) = C_h(δ)·q·∫c_r²dh / arm(δ) and C_h ∝ δ
  const stretchAt = (deg, A = CAB.A) => (FIXED.ctl.Ch * deg / 25 * kBal) * qApp * I2 * 12 / Math.max(armAt(deg), 1e-3) * Lc / (CAB.E * A);
  const sStop = hornEff * Math.sin(pedalDeg * D2R);   // cable stroke at the pedal stop
  const reach = (A = CAB.A) => { let lo = 0, hi = full; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (sAt(m) + stretchAt(m, A) < sStop) lo = m; else hi = m; } return lo; };   // capped at full travel by the rudder's stop
  const reachDeg = reach(), reachBy = {};
  return { full, arm0: armAt(0), armFull, armMin, I2, VsKt, qApp, ChFull, kBal, bal, hmApp, tApp, fApp, Lc, stretch, tUnbal, stretchUnbal, CAB, pedalDeg0, pedalDeg, sStop, reachDeg, reachBy };
  };
  return { pitchRod, tubeT, hornE, rollT, ailRod, rearLink, pedal, cable, mc, kPitch: k, hornEff, get pedalDeg() { return rudLinkNow().pedalDeg; }, get rudLink() { return rudLinkNow(); } };
})();

// ------------------------------------------------------------------------------------------- sizing
const ms = (allow, load) => allow / (FS_ * load) - 1;
const seg = (a, b) => len(sub(b, a));
export const SZ = (() => {
  const o = {};
  // pitch rod: 2024-T3, guides so the free length ≤ 20 in
  o.pitchLen = seg(L.PB, L.PA1); o.pitchGuides = Math.max(0, Math.ceil(o.pitchLen / 20) - 1); o.pitchFree = o.pitchLen / (o.pitchGuides + 1);
  o.pitchRod = pickTube((od, w) => ms(column(od, w, o.pitchFree, MAT['2024']).P, LINK.pitchRod.together), MAT['2024'], 0.625);
  o.rearLen = seg(L.PA1, L.PA2); o.rearGuides = 1; o.rearFree = o.rearLen / 2;
  o.rearLink = pickTube((od, w) => ms(column(od, w, o.rearFree, MAT['2024']).P, LINK.rearLink), MAT['2024'], 0.5);
  // torque tube (4130): whole torque on one side; τ = T r / J
  o.tubeE = pickTube((od, w) => ms(MAT['4130'].Fsu * tJ(od, w) / (od / 2), LINK.tubeT), MAT['4130'], 0.75);
  // roll tube (4130): together torque
  o.rollLen = seg(L.G1, L.R1);
  o.rollTube = pickTube((od, w) => ms(MAT['4130'].Fsu * tJ(od, w) / (od / 2), LINK.rollT.together), MAT['4130'], 0.625);
  // aileron rods (2024): A (no guide), B (guides ≤ 18 in), C
  o.lenA = seg(L.SR, L.K1a); o.lenB = Math.abs(L.K2d[1] - L.K1b[1]); o.guidesB = Math.ceil(o.lenB / 18) - 1; o.freeB = o.lenB / (o.guidesB + 1); o.lenC = seg(L.hornA, L.K2c);
  o.guidesC = o.lenC > 18 ? 1 : 0; o.freeC = o.lenC / (o.guidesC + 1);
  o.ailRod = pickTube((od, w) => Math.min(...[o.lenA, o.freeB, o.freeC].map((Lf) => ms(column(od, w, Lf, MAT['2024']).P, LINK.ailRod))), MAT['2024'], 0.5);
  // sticks (4130): bending at the fork root, grip force × (grip arm − fork)
  o.stick = pickTube((od, w) => ms(MAT['4130'].Fty * tI(od, w) / (od / 2), PILOT.pitch.max * (ARM.grip - 1.0)), MAT['4130'], 0.625);
  // pedal cross tube (4130): pivot reaction × overhang between bracket and pedal
  o.pedTube = pickTube((od, w) => ms(MAT['4130'].Fty * tI(od, w) / (od / 2), (LINK.cable - LINK.pedal) * (L.ped.halfSpan - L.ped.y)), MAT['4130'], 0.875);
  o.pedArm = pickTube((od, w) => ms(MAT['4130'].Fty * tI(od, w) / (od / 2), LINK.pedal * ARM.pedalPad), MAT['4130'], 0.625);
  // plates: bellcrank / arm thickness from bending, M = P·arm at the hub edge; width 1.0 in unless noted
  const plate = (M, w, m) => { for (const t of [0.125, 0.16, 0.19, 0.25, 0.313, 0.375, 0.5]) if (ms(m.Fty * t * w * w / 6, M) >= TGT) return t; return 0.5; };
  o.plate = plate;
  o.tBC = plate(LINK.pitchRod.together * (ARM.pitchBC - 0.4), 1.0, MAT['4130']);       // pitch bellcrank arm (welded to the tube)
  o.tDrive = plate(LINK.hornE * (ARM.horn - 0.4), 1.0, MAT['4130']);
  o.tBeam = plate(LINK.ailRod * (L.rT - 0.6), 1.5, MAT['6061']);                       // walking beam, 1.5 in deep
  o.tK = plate(LINK.ailRod * (ARM.k - 0.5), 1.0, MAT['6061']);
  o.tCrank = plate(LINK.rollT.together / ARM.roll * (ARM.roll - 0.4), 1.0, MAT['4130']);
  o.tFork = plate(PILOT.pitch.max * ARM.grip / 2 / 1.0, 1.0, MAT['4130']);              // two fork plates, M per plate over a 1 in deep section
  o.tToe = plate(LINK.mc * (ARM.toeTab - 0.3), 0.75, MAT['4130']);
  // DC-005 review: the pedal horn goes into the MS20667-6 jaw (0.260 in), so its thickness is capped below the jaw and the width grows
  // instead (was 0.75 in wide, 0.313 in thick, which did not fit the fork)
  o.hornW = 0.75; for (const w of [0.75, 0.875, 1.0, 1.125, 1.25]) { o.hornW = w; if (plate(LINK.cable * (ARM.pedalHorn - 0.5), w, MAT['4130']) < TERM.forkJaw - 0.005) break; }
  o.tHorn = plate(LINK.cable * (ARM.pedalHorn - 0.5), o.hornW, MAT['4130']);
  o.hornE = 0.45;   // DC-005 review: end distance past the 5/16 cable-pin hole (e/D 1.44); capped so the swept horn keeps 0.25 in from J's G5 (LEZ-31-130); substantiated by the lug shear-out and bearing terms in c27-pedal
  // balance: the elevator's static moment about the pin from its own sections (shell at the perimeter centroid, core at the area centroid)
  o.bal = elevBalance();
  return o;
})();
/** elevator static moment about its hinge pin (lb·in) and the weight it needs, from the sections and the fixed plies */
export function elevBalance() {
  const st = ctlStations('elevator'), tBID = BASE_MAT.BID.t, nSk = 2 * 2, rhoB = MAT.bid.rho, rhoC = MAT.pvc.rho;
  let mS = 0, mC = 0, xS = 0, xC = 0;
  for (let i = 0; i < st.length - 1; i++) {
    const y = (st[i] + st[i + 1]) / 2, s = ctlSection('elevator', y), pts = s.pts, dy = (st[i + 1] - st[i]) * 12, pin = pts[CTLS.elevator.hinge > 0 ? 24 : 25];
    let A = 0, cx = 0, P = 0, px = 0;
    for (let k = 0; k < pts.length; k++) { const a = pts[k], b = pts[(k + 1) % pts.length], cr = a[0] * b[1] - b[0] * a[1]; A += cr; cx += (a[0] + b[0]) * cr; const l = Math.hypot(b[0] - a[0], b[1] - a[1]); P += l; px += (a[0] + b[0]) / 2 * l; }
    A = Math.abs(A / 2); cx = Math.abs(cx / 6 / (A || 1)) ; const ac = cx, pc = px / P;
    const ms_ = P * dy * nSk / 2 * tBID * rhoB * 1.0 + 0.35 * s.chord * dy * 2 * 2 * tBID * rhoB, mc_ = Math.max(0, A - P * 2 * tBID) * dy * rhoC;   // skins 2 BID each side + 2 BID hinge doublers each side over 35 %
    mS += ms_; xS += ms_ * (pc - pin[0]); mC += mc_; xC += mc_ * (ac - pin[0]);
  }
  const span = (st.at(-1) - st[0]) * 12, leaf = HINGE.lbPerIn * span, horn = 0.125 * 1.25 * 2.5 * MAT['6061'].rho;
  const finish = 0.15, m = (mS + mC) * (1 + finish) + leaf + horn, M = (xS + xC) * (1 + finish) + horn * (-0.6);
  const need = 1.20 * M;                                                    // DESIGN: 20 % over, lead trimmed off at the balance check
  return { m, M, x: M / m, need, mw: need / ARM.wElev, finish };
}
L.wE = add(L.T0, [-ARM.wElev, 0, 0]);   // balance weight centre: straight forward of the tube axis
L.wBL = [5.0, 8.0];                       // weight span on each side (inside the fuselage, between the centre and the bellcrank)

// ------------------------------------------------------------------------------------------- checks
const row = (rows, lc, pn, id, title, where, modes, formula, inputs, result) => {
  const w = modes.reduce((a, m) => (m[1] < a[1] ? m : a));
  const r = mk('controls', id, title, lc, where, w[0], w[1], { formula, inputs, result }); r.sys = pn; rows.push(r); return r;
};
const BOUNDms = (what, allow, need) => `BOUND: ${what}; MS stays ≥ 0 down to ${need.toFixed(0)}`;
export function checkRows(lc) {
  const out = [], f = FS_, M4 = MAT['4130'], M2 = MAT['2024'], M6 = MAT['6061'];
  const far = IN_('Factor of safety', f, '', 'FAR23 (23.303)');
  const pilot = (k) => IN_(`Pilot force, ${k}`, PILOT[k].max, 'lb', `FAR23: ${PILOT.src}`);
  const rodEnd = (P) => ['rod-end radial', ms(ROD_END.ult, P)];
  const reIn = (P) => IN_('Rod-end radial ultimate', ROD_END.ult, 'lb', BOUNDms(`${ROD_END.name}, rating typed from memory`, ROD_END.ult, f * P));
  const brg = (P, D, t, m) => ['bolt bearing (23.693 × 3.33)', m.Fbru * D * t / (f * SPECIAL * P) - 1];
  const spIn = IN_('Special factor, joints with angular motion', SPECIAL, '', 'FAR23 (23.693)');
  // ---- -110 front stick
  { const [od, w] = SZ.stick, Mb = PILOT.pitch.max * (ARM.grip - 1.0), sb = Mb * (od / 2) / tI(od, w);
    const pin = AN[4], Ppiv = PILOT.pitch.max * (ARM.grip + ARM.pitch) / ARM.pitch;   // fork reaction at the pivot pin
    row(out, lc, 'LEZ-27-110', 'c27-stick', 'Front side stick: tube bending, pitch pivot pin and fork bearing', 'stick base, FS 67.8', [['stick tube bending', M4.Fty / (f * sb) - 1], ['pivot pin double shear', 2 * pin.s / (f * Ppiv) - 1], brg(Ppiv / 2, pin.d, SZ.tFork, M4)],
      'M = F·(a_grip − 1.0);  σ = M·c/I;  pin: P = F·(a_grip + a_arm)/a_arm on two planes;  fork bearing per plate P/2 × 3.33', [pilot('pitch'), far, spIn, IN_('Stick tube', `${od} × ${w} 4130 N`, 'text', 'SIZED'), IN_('Grip / pitch arm', `${ARM.grip} / ${ARM.pitch}`, 'in', 'DESIGN'), IN_('Pivot pin', 'AN4', 'text', 'AN standard'), IN_('Fork plates', `2 × ${SZ.tFork} in 4130`, 'text', 'SIZED'), IN_('4130 F_ty / F_bru', `${M4.Fty} / ${M4.Fbru}`, 'psi', M4.spec)],
      [['M (limit)', Mb, 'inlb'], ['σ (limit)', sb, 'psi'], ['Pivot reaction (limit)', Ppiv, 'lb']]); }
  // ---- -111 rear stick and rear pitch link
  { const [od, w] = SZ.stick, Mb = PILOT.pitch.max * (ARM.gripR - 1.0), sb = Mb * (od / 2) / tI(od, w), [lo, lw] = SZ.rearLink, c = column(lo, lw, SZ.rearFree, M2), qr = AN[3];
    row(out, lc, 'LEZ-27-111', 'c27-rear-stick', 'Rear stick: tube bending, quick-release pin, rear pitch link column', 'rear stick, FS 109.8', [['stick tube bending', M4.Fty / (f * sb) - 1], ['quick-release pin double shear', 2 * qr.s / (f * Mb / 1.0) - 1], [c.mode + ' (rear link)', ms(c.P, LINK.rearLink)], rodEnd(LINK.rearLink)],
      `rear grip ${ARM.gripR} in above its pivot;  socket: M reacted by the pin on a 1.0 in couple;  rear link P = max(F·${ARM.gripR}, F_opp·${ARM.grip})/a_arm (rear pilot alone, or opposition 23.399(a))`, [pilot('pitch'), IN_('Rear grip arm', ARM.gripR, 'in', 'DESIGN'), far, IN_('Opposition force each pilot', LOADS.pitch.opp, 'lb', 'FAR23 (23.399(a))'), IN_('Rear link', `${lo} × ${lw} 2024-T3, ${SZ.rearLen.toFixed(1)} in, guide at mid-length`, 'text', 'SIZED'), IN_('Quick-release pin', 'AN3-size, 3/16 in', 'text', 'AN standard'), reIn(LINK.rearLink), IN_('2024-T3 F_ty / E', `${M2.Fty} / ${M2.E}`, 'psi', M2.spec)],
      [['Rear link (limit)', LINK.rearLink, 'lb'], ['Column allowable (ult.)', c.P, 'lb']]); }
  // ---- -120 pitch rod
  { const [od, w] = SZ.pitchRod, c = column(od, w, SZ.pitchFree, M2), P = LINK.pitchRod.together, riv = 4 * 368;   /* MS20470AD4 368 lb, AC 43.13-1B table 4-8 (one value everywhere) */
    row(out, lc, 'LEZ-27-120', 'c27-pitch-rod', 'Pitch rod: column between guides, rod ends, end-plug rivets (pilots together)', 'stick → torque-tube bellcrank', [[c.mode, ms(c.P, P)], rodEnd(P), ['4 × AN470AD4 rivets, single shear', ms(riv, P)]],
      'P = 2 × 0.75 × F_max × a_grip / a_arm (23.399(b), downstream of the rear link);  column pinned between guides', [pilot('pitch'), IN_('Pilots together, each', 0.75 * PILOT.pitch.max, 'lb', 'FAR23 (23.399(b))'), far, IN_('Stick ratio', LINK.kPitch, '', 'DESIGN: 7.0 / 3.0 in'), IN_('Tube', `${od} × ${w} 2024-T3`, 'text', 'SIZED'), IN_('Free length between guides', SZ.pitchFree, 'in', 'DESIGN'), reIn(P), IN_('AN470AD4 single shear', 388, 'lb', 'MIL-HDBK-5 (2117-T3, typed from memory)'), IN_('2024-T3 F_ty / E', `${M2.Fty} / ${M2.E}`, 'psi', M2.spec)],
      [['Rod load (limit)', P, 'lb'], ['Column allowable (ult.)', c.P, 'lb'], ['Rod length', SZ.pitchLen, 'in']]); }
  // ---- -130 torque tube, bellcrank, drive arms, links
  { const [od, w] = SZ.tubeE, T = LINK.tubeT, tau = T * (od / 2) / tJ(od, w), b3 = AN[3];
    row(out, lc, 'LEZ-27-130', 'c27-torque-tube', 'Elevator torque tube: torsion, bellcrank and drive-arm bending, link bolts', 'FS 26.8, BL ±13.4', [['tube torsion', M4.Fsu / (f * tau) - 1],
      ['bellcrank arm bending', M4.Fty * SZ.tBC / 6 / (f * LINK.pitchRod.together * (ARM.pitchBC - 0.4)) - 1], ['drive arm bending', M4.Fty * SZ.tDrive / 6 / (f * LINK.hornE * (ARM.horn - 0.4)) - 1], brg(LINK.hornE, b3.d, SZ.tDrive, M4), ['link bolt single shear', ms(b3.s, LINK.hornE)]],
      'T = P_rod·a_bc (pilots together), all on one side;  τ = T·r/J;  arms M = P·(a − 0.4) on a 1.0 in deep section;  horn link P = T/2/a_horn', [pilot('pitch'), far, spIn, IN_('Bellcrank / horn arms', `${ARM.pitchBC} / ${ARM.horn}`, 'in', 'DESIGN'), IN_('Tube', `${od} × ${w} 4130 N`, 'text', 'SIZED'), IN_('Arms', `bellcrank ${SZ.tBC} in, drive ${SZ.tDrive} in 4130`, 'text', 'SIZED'), IN_('4130 F_su / F_ty / F_bru', `${M4.Fsu} / ${M4.Fty} / ${M4.Fbru}`, 'psi', M4.spec)],
      [['Torque (limit)', T, 'inlb'], ['τ (limit)', tau, 'psi'], ['Horn link load (limit)', LINK.hornE, 'lb']]); }
  // ---- -135 balance weights (23.659: 24 g normal, 12 g fore-aft and along the hinge)
  { const B = SZ.bal, Mn = 24 * B.mw * ARM.wElev, t = 0.19, wd = 0.75, sb = 6 * Mn / (t * wd * wd), clamp = 2 * AN[3].s, Pc = Math.hypot(24, 12, 12) * B.mw;
    row(out, lc, 'LEZ-27-135', 'c27-balance', 'Elevator balance weights: arm bending and clamp bolts under 24 g / 12 g', 'FS 23.8, BL ±5–8', [['arm bending (24 g)', M4.Fty / (f * sb) - 1], ['clamp bolts shear', ms(clamp, Pc)], ['balance moment provided / needed', B.mw * ARM.wElev / B.M - 1]],
      'M = 24·m_w·a_w;  σ = 6M/(t·w²) (strap edgewise to the 24 g load);  bolts: |(24, 12, 12)|·m_w;  static balance m_w·a_w ≥ elevator moment about the pin', [IN_('Load factors', '24 g normal, 12 g fore-aft, 12 g along the hinge', 'text', 'FAR23 (23.659, typed from memory)'), far, IN_('Weight each', B.mw, 'lb', 'SIZED'), IN_('Arm', ARM.wElev, 'in', 'DESIGN'),
        IN_('Elevator static moment (incl. 15 % finish, hinge leaf, horn)', B.M, 'lbin', 'GEOMETRY: the released sections, fixed plies'), IN_('Arm strap', `${wd} × ${t} 4130`, 'text', 'DESIGN'), IN_('4130 F_ty', M4.Fty, 'psi', M4.spec)],
      [['Elevator moment', B.M, 'lbin'], ['Weight moment', B.mw * ARM.wElev, 'lbin'], ['σ arm (limit)', sb, 'psi']]); }
  // ---- -140 roll tube
  { const [od, w] = SZ.rollTube, T = LINK.rollT.together, tau = T * (od / 2) / tJ(od, w), Pl = T / ARM.roll;
    row(out, lc, 'LEZ-27-140', 'c27-roll-tube', 'Roll tube: torsion, aft crank bending, lateral link', 'FS 67.8 → 136.8', [['tube torsion', M4.Fsu / (f * tau) - 1], ['crank bending', M4.Fty * SZ.tCrank / 6 / (f * Pl * (ARM.roll - 0.4)) - 1], rodEnd(Pl)],
      'T = 2 × 0.75 × F_roll × a_grip (23.399(b));  τ = T·r/J;  crank P = T/a_crank', [pilot('roll'), far, IN_('Tube', `${od} × ${w} 4130 N, ${SZ.rollLen.toFixed(1)} in`, 'text', 'SIZED'), IN_('Crank arm', ARM.roll, 'in', 'DESIGN'), reIn(Pl), IN_('4130 F_su / F_ty', `${M4.Fsu} / ${M4.Fty}`, 'psi', M4.spec)],
      [['Torque (limit)', T, 'inlb'], ['τ (limit)', tau, 'psi'], ['Link load (limit)', Pl, 'lb']]); }
  // ---- -141 walking beam
  { const P = LINK.ailRod, Mb = P * (L.rT - 0.6), sb = 6 * Mb / (SZ.tBeam * 1.5 * 1.5), pv = AN[4], Ppiv = 2 * P;
    row(out, lc, 'LEZ-27-141', 'c27-ail-bellcrank', 'Aileron walking-beam bellcrank: arm bending, pivot bolt, bracket', 'FS 145.5, BL 0', [['beam arm bending', M6.Fty / (f * sb) - 1], ['pivot bolt double shear', 2 * pv.s / (f * Ppiv) - 1], brg(Ppiv / 2, pv.d, SZ.tBeam, M6)],
      'M = P·(r − 0.6) at the hub, 1.5 in deep;  pivot: input + output reactions', [pilot('roll'), far, spIn, IN_('Arms', L.rT, 'in', 'GEOMETRY: square to rod A through the spar corridor'), IN_('Beam', `${SZ.tBeam} × 1.5 in 6061-T6`, 'text', 'SIZED'), IN_('6061-T6 F_ty / F_bru', `${M6.Fty} / ${M6.Fbru}`, 'psi', M6.spec)],
      [['Rod load (limit)', P, 'lb'], ['σ (limit)', sb, 'psi']]); }
  // ---- -142 aileron rods, K1, K2
  { const [od, w] = SZ.ailRod, P = LINK.ailRod, cs = [['rod A', SZ.lenA], ['rod B', SZ.freeB], ['link C', SZ.freeC]].map(([n, Lf]) => { const c = column(od, w, Lf, M2); return [`${n} ${c.mode}`, ms(c.P, P)]; });
    const Mk = P * (ARM.k - 0.5), sk = 6 * Mk / (SZ.tK * 1.0), disc = 2 * AN[3].s;
    row(out, lc, 'LEZ-27-142', 'c27-ail-rod', 'Aileron rods A, B, C, corner bellcranks K1 / K2, root disconnect', 'bellcrank → aileron horn', [...cs, rodEnd(P), ['K1/K2 arm bending', M6.Fty / (f * sk) - 1], ['disconnect sleeve, 2 × AN3 double shear', ms(2 * disc, P)]],
      'P = F_roll·a_grip / a_crank, all into one horn (jam; 23.395(a)(2)); pilots together shared;  each rod pinned at its ends (B and C between guides)', [pilot('roll'), far, IN_('Tube', `${od} × ${w} 2024-T3`, 'text', 'SIZED'), IN_('Rod lengths A / B free / C free', `${SZ.lenA.toFixed(1)} / ${SZ.freeB.toFixed(1)} / ${SZ.freeC.toFixed(1)}`, 'in', 'GEOMETRY'), IN_('Bellcrank arms', ARM.k, 'in', 'DESIGN'), reIn(P), IN_('2024-T3 F_ty / E', `${M2.Fty} / ${M2.E}`, 'psi', M2.spec), IN_('6061-T6 F_ty', M6.Fty, 'psi', M6.spec)],
      [['Rod load (limit)', P, 'lb']]); }
  // ---- -150 pedals
  { const [od, w] = SZ.pedTube, Mt = (LINK.cable - LINK.pedal) * (L.ped.halfSpan - L.ped.y), st = Mt * (od / 2) / tI(od, w), [ao, aw] = SZ.pedArm, sa = LINK.pedal * ARM.pedalPad * (ao / 2) / tI(ao, aw);
    const sh = LINK.cable * (ARM.pedalHorn - 0.5) * 6 / (SZ.hornW * SZ.hornW * SZ.tHorn), stoe = LINK.mc * (ARM.toeTab - 0.3) * 6 / (0.75 * 0.75 * SZ.tToe);
    row(out, lc, 'LEZ-27-150', 'c27-pedal', 'Rudder/brake pedals: cross tube, pedal arm, cable horn, toe tab and MC anchor', 'FS 37.4, BL ±4.3', [['cross tube bending', M4.Fty / (f * st) - 1], ['pedal arm bending', M4.Fty / (f * sa) - 1], ['cable horn bending', M4.Fty / (f * sh) - 1], ['cable horn lug shear-out (5/16 pin)', M4.Fsu * 2 * (SZ.hornE - TERM.forkPin / 2) * SZ.tHorn / (f * LINK.cable) - 1], brg(LINK.cable, TERM.forkPin, SZ.tHorn, M4), ['toe tab bending', M4.Fty / (f * stoe) - 1], brg(LINK.mc, AN[3].d, SZ.tToe, M4)],
      'cable T = F·a_pad/a_horn;  pivot reaction T − F;  toe: MC rod P = F_toe·a_pad/a_tab', [pilot('rudder'), IN_('Toe (brake) force', LOADS.toe, 'lb', 'FAR23 (23.405 / 23.397(b) rudder value)'), far, spIn, IN_('Arms pad / horn / toe pad / tab', `${ARM.pedalPad} / ${ARM.pedalHorn} / ${ARM.toePad} / ${ARM.toeTab}`, 'in', 'DESIGN'), IN_('Cross tube / arm', `${od} × ${w} / ${ao} × ${aw} 4130 N`, 'text', 'SIZED'), IN_('4130 F_ty / F_bru', `${M4.Fty} / ${M4.Fbru}`, 'psi', M4.spec)],
      [['Cable tension (limit)', LINK.cable, 'lb'], ['MC rod load (limit)', LINK.mc, 'lb']]); }
  // ---- -151 cable
  { const T = LINK.cable;
    row(out, lc, 'LEZ-27-151', 'c27-rud-cable', 'Rudder cable tension (pedal ratio) and terminals', 'pedal horn → rudder horn', [['cable break', ms(CABLE.brk, T)], [`${TERM.forkStd} fork end (${TERM.fork.toLocaleString('en-US')} lb)`, ms(TERM.fork, T)], [`${TERM.tbStd} turnbuckle (${TERM.tb.toLocaleString('en-US')} lb)`, ms(TERM.tb, T)], [`${TERM.tbEnd} terminal (${TERM.term.toLocaleString('en-US')} lb)`, ms(TERM.term, T)]],
      'T = F_pedal·a_pad/a_horn,eff (the cable leaves the horn at an angle);  MS = T_break/(FS·T) − 1;  FAR 23.689: ≥ 1/8 in cable (3/16 in fitted, DC-005)', [pilot('rudder'), far, IN_('Pedal ratio', ARM.pedalPad / LINK.hornEff, '', `GEOMETRY: ${ARM.pedalPad} in pad / ${LINK.hornEff.toFixed(3)} in effective horn (${ARM.pedalHorn} in horn × the cable's FS component)`), IN_('Cable', CABLE.name, 'text', 'FAR23 (23.689)'), IN_('Breaking strength', CABLE.brk, 'lb', 'M83420/2-008, 3/16 in 7×19 CRES 3,700 lb (Lexco Cable catalogue, accessed 2026-11-21)'), IN_(`Fork end ${TERM.forkStd}`, TERM.fork, 'lb', 'MS20667-6 (3/16 in) 4,200 lb, pin 0.313, jaw 0.260 (Aircraft Spruce 2026 catalogue p. 137, accessed 2026-11-21)'), IN_(`Turnbuckle ${TERM.tbStd}`, TERM.tb, 'lb', 'MS21251-B6S (3/16 in, 5/16-24) 4,600 lb, clip MS21256-1 (MS21251M Table I, faa.gov/media/28696; Lexco, accessed 2026-11-21)')],
      [['Tension (limit)', T, 'lb']]); }
  // ---- rudder linkage under load (DC-005 review): no dead centre, pedal force at the crosswind approach
  { const R_ = LINK.rudLink;
    row(out, lc, 'LEZ-55-193', 'rud-arm', 'Rudder horn effective arm through the travel (no dead centre)', 'horn → fin pulley', [['least arm / arm at neutral ≥ 0.5', R_.armMin / R_.arm0 / 0.5 - 1]],
      'arm(δ) = d(stroke)/dδ from the horn point rotated about the hinge axis against the fixed fin pulley;  MS = (arm_min/arm₀)/0.5 − 1', [IN_('Full travel', R_.full, '°', 'DESIGN (DEFAULT_DESIGN.rudderDeg)'), IN_('Arm at neutral', R_.arm0, 'in', 'GEOMETRY'), IN_('Least ratio allowed', 0.5, '', 'DESIGN: the arm may fall to half its neutral value at full travel, so the pedal-force curve stays usable and well clear of dead centre')],
      [['Arm at full travel', R_.armFull, 'in'], ['Least arm over the travel', R_.armMin, 'in']]);
    row(out, lc, 'LEZ-55-193', 'rud-force', 'Pedal force to hold full rudder at the crosswind approach', '1.3 VSO, full travel', [['FAR 23.143 temporary rudder force 150 lb', 150 / R_.fApp - 1]],
      'HM = C_h(δ)·q·∫c_r²dh;  T = HM/arm(δ_full);  F_pedal = T·a_horn,eff/a_pad;  MS = 150/F − 1', [IN_('C_h at full travel', R_.ChFull, '', `BOUND: the model\'s control-surface coefficient 0.5 (structures.js FIXED.ctl.Ch) at 25°, scaled with travel, × k_bal ${R_.kBal.toFixed(3)} for the set-back balance (overhang ${R_.bal} c_f, NACA blunt nose, sealed gap: 0.80 at 0.20 c_f (ARR WR L-301) and 0.28 at 0.35 c_f (ARR L-355), linear, the bracket notches unbalanced, × ${BAL_ALLOW} allowance)`), IN_('q at 1.3 VSO', R_.qApp, 'psf', `DERIVED: VSO ${R_.VsKt.toFixed(1)} kt (the yaw-cndr reference loading)`), IN_('∫c_r² dh', R_.I2, 'ft³', 'GEOMETRY (rudder chord over its span)'), IN_('Horn arm at full travel', R_.armFull, 'in', 'GEOMETRY'), IN_('Pedal pad / effective pedal horn', ARM.pedalPad / LINK.hornEff, '', 'GEOMETRY'), IN_('Limit', 150, 'lb', 'FAR23 (23.143(c)) temporary rudder force')],
      [['Hinge moment', R_.hmApp, 'in·lb'], ['Cable tension', R_.tApp, 'lb'], ['Pedal force', R_.fApp, 'lb'], ['Cable stretch at that tension', R_.stretch, 'in'], ['Pedal travel to the stop (unloaded)', R_.pedalDeg0, '°']]); }
  { const R_ = LINK.rudLink, Y = yawStability(effective(DEFAULT_DESIGN)), bReach = Y.cndr * R_.reachDeg * D2R / Y.cnb, xw = 1.3 * Y.VsKt * Math.tan(bReach), need = 0.2 * Y.VsKt;
    row(out, lc, 'LEZ-55-193', 'rud-reach', 'Rudder reached at the pedal stop under the crosswind-approach load (cable stretch), and the crosswind it holds', 'pedal stop, 1.3 VSO', [['crosswind held at the reachable rudder ≥ 0.2 VSO', Math.tan(bReach) / Math.tan(Y.betaXw) - 1]],
      'stroke(δ) + T(δ)·L/(E·A) = stroke(δ_full) at the pedal stop;  β = Cnδr·δ_reach/Cnβ;  MS = tan β / tan β_xw − 1', [IN_('Cable run, pedal to horn', R_.Lc, 'in', 'GEOMETRY (rudRoute + fin tail)'), IN_('Cable axial stiffness AE (low bound, sets the stop)', CABLE.AE.lo, 'lb', 'S3i wire-rope technical data, E 47.5 kN/mm² on the gross area (s3i.co.uk, accessed 2026-11-21); Loos formula gives 217,000 lb'), IN_('Full rudder travel', R_.full, '°', 'DESIGN')],
      [['Rudder reached under load (rudder stop at full travel)', R_.reachDeg, '°'], ['Crosswind held', xw, 'kt'], ['Needed (0.2 VSO)', need, 'kt'], ['Pedal stop (unloaded full rudder / with stretch)', `${R_.pedalDeg0.toFixed(1)}° / ${R_.pedalDeg.toFixed(1)}°`, '']]); }
  // ---- -160 stops
  { const Pp = LOADS.pitch.together * ARM.grip / ARM.pitch, Pr = LOADS.roll.together * ARM.grip / 1.5, Pd = LINK.pedal, b4 = AN[4], t = 0.25;
    row(out, lc, 'LEZ-27-160', 'c27-stops', 'Control stops: pitch (pitch arm), roll (collar lug), rudder (pedal)', 'stick base, pedals', [['pitch stop bolt shear', ms(b4.s, Pp)], ['roll stop bolt shear', ms(b4.s, Pr)], ['pedal stop bolt shear', ms(b4.s, Pd)], ['stop block bearing (6061)', MAT['6061'].Fbru * b4.d * t / (f * Pp) - 1]],
      '23.675(c): stops take the control-system design loads; pitch at the 3.0 in arm, roll at a 1.5 in collar lug, pedal at the pad', [pilot('pitch'), pilot('roll'), pilot('rudder'), IN_('Pilots together', '2 × 0.75 × F_max', 'text', 'FAR23 (23.399(b))'), far, IN_('Stop bolts', 'AN4 in single shear', 'text', 'AN standard'), IN_('Stop block', '0.25 in 6061-T6', 'text', 'DESIGN')],
      [['Pitch stop (limit)', Pp, 'lb'], ['Roll stop (limit)', Pr, 'lb']]); }
  // ---- -165 trim
  { const Fl = LOADS.trim(3.0), Pc = Fl * 3.0 / 1.5, t = 0.19, sb = 6 * Fl * 3.0 / (t * 0.75 * 0.75), [co, cw] = [0.625, 0.035], c = column(co, cw, 6.7, M2);
    row(out, lc, 'LEZ-27-165', 'c27-trim', 'Pitch trim: lever bending, cartridge column (bottomed), pivot', 'right console, FS 76', [['lever bending', MAT['6061'].Fty / (f * sb) - 1], [c.mode + ' (cartridge bottomed)', ms(c.P, Pc)], ['pivot bolt single shear', ms(AN[3].s, Pc + Fl)]],
      'Lever force (1 + R)/3 × 50 lb, 50 ≤ F ≤ 150, R = 3.0 in (DESIGN: the Part 25 §25.405 crank rule; Part 23 gives no formula);  the cartridge bottomed passes F·3.0/1.5', [IN_('Lever force', Fl, 'lb', 'DESIGN: the (1 + R)/3 × 50 lb crank / lever rule of the transport-category table (Part 25 §25.405); pre-amendment-64 §23.405 only requires the maximum force a pilot is likely to apply (14 CFR Part 23, 2011 ed., govinfo.gov, accessed 2026-11-19)'), far, IN_('Lever', `0.75 × ${t} 6061-T6, 3.0 in handle, 1.5 in arm`, 'text', 'DESIGN'), IN_('Cartridge', `${co} × ${cw} 2024-T3 body`, 'text', 'DESIGN'), IN_('6061-T6 F_ty', MAT['6061'].Fty, 'psi', MAT['6061'].spec)],
      [['Cartridge (limit)', Pc, 'lb']]); }
  // ---- -170 / -171 landing brake
  { const B = LB(), q = B.q, w = q * B.CN, Lc = B.cant, Mpp = w * Lc * Lc / 2, d = B.tCore + 3 * BASE_MAT.BID.t, Nf = Mpp / d, fall = 18000, tau = w * Lc / d, pad = B.F * 1.0;
    row(out, lc, 'LEZ-27-170', 'c27-lb-panel', 'Landing-brake panel: sandwich bending and core shear aft of the horn, hinge', `belly, FS ${L.lb.s0}–${L.lb.s1}`, [['face stress (6781 ±45)', ms(fall * 3 * BASE_MAT.BID.t, Nf)], ['core shear (HT61)', ms(67 * 1.0, tau)], ['hinge (MS20257-P3 pin shear)', ms(B.hingeAllow, w * B.len / 2 * B.width / B.width)]],
      'p = q·C_N at the placard speed; the panel cantilevers from the horn line: M = p·L²/2 per inch;  N = M/d;  τ = p·L/d', [IN_('Placard speed', B.V, 'kt', 'DESIGN'), IN_('Normal-force coefficient C_N', B.CN, '', `BOUND: flat plate normal to the flow ≈ 1.2 (typed from memory); MS stays ≥ 0 up to ${(B.CN * (1 + Math.min(ms(fall * 3 * 0.010, Nf), ms(80, tau)))).toFixed(2)}`), far,
        IN_('Faces', '3 × 6781 ±45 each side', 'text', 'SIZED'), IN_('Core', `${B.tCore} in HT61`, 'text', 'SIZED'), IN_('Face allowable', fall, 'psi', 'BOUND: 6781 ±45 face ≈ 2 × τ12 = 18 ksi (7781 prepreg, RTD: NIAR/NCAMP CAM-RP-2023-010, wichita.edu, accessed 2026-11-19), not the old 0.75 × 33 ksi (typed from memory)'), IN_('HT61 shear', 80, 'psi', 'BOUND: Divinycell HT61 datasheet-typical 80 psi (typed from memory)')],
      [['p (limit)', w, 'psi'], ['N face (limit)', Nf, 'lbin'], ['τ core (limit)', tau, 'psi']]);
    row(out, lc, 'LEZ-27-171', 'c27-lb-actuator', 'Landing-brake actuator: force over the stroke at the placard speed; stroke', 'FS 62–94', [['rated force / worst required', B.rated / B.F - 1], ['stroke available / needed', B.stroke / B.need - 1]],
      'F(θ) = q·S·C_N(θ)·(c/2) / arm(θ), θ = 0 … 70°, C_N(θ) = min(C_N, 2π·sin θ);  stroke = L(70°) − L(0)', [IN_('Placard speed', B.V, 'kt', 'DESIGN'), IN_('Panel', `${B.len} × ${B.width} in`, 'in', 'DESIGN'), IN_('Normal-force coefficient C_N', B.CN, '', 'BOUND: flat-plate value, reached from the thin-plate slope 2π·sin θ (typed from memory)'), IN_('Actuator rating', B.rated, 'lb', BOUNDms('Progressive Automations PA-14 class, 150 lb option, typed from memory', B.rated, B.F)), IN_('Stroke / retracted length', `${B.stroke} / ${B.retracted}`, 'in', 'BOUND: PA-14 3 in model, typed from memory')],
      [['Worst force (limit)', B.F, 'lb'], ['At', B.thF, 'deg'], ['Stroke needed', B.need, 'in']]);
    const I = 4.0, R16 = 4.016e-3, Lh = B.harnessLen / 12 * 2, dv = I * R16 * Lh;
    row(out, lc, 'LEZ-27-172', 'c27-lb-harness', 'Landing-brake harness: voltage drop at running current; breaker vs wire', 'S9 → M2', [['voltage drop (≤ 0.5 V)', 0.5 / dv - 1], ['16 AWG rating (≥ 7.5 A breaker)', 13 / 7.5 - 1]],
      'ΔV = I·R′·2L (both conductors)', [IN_('Running current', I, 'A', 'SCD LEZ-27-171'), IN_('16 AWG resistance', R16, 'ohm/ft', 'BOUND: copper 4.016 Ω/1000 ft at 20 °C (typed from memory)'), IN_('Harness length', B.harnessLen, 'in', 'GEOMETRY'), IN_('16 AWG M22759 bundled rating', 13, 'A', 'BOUND: AC 43.13-1B ch. 11 chart (typed from memory)'), IN_('Breaker', 7.5, 'A', 'wp7 wire list')],
      [['ΔV', dv, 'V']]); }
  // ---- -100 joints: every rod-end bolt in its lug with the special factor
  { const js = [['stick pitch arm', LINK.pitchRod.together, SZ.tFork], ['pitch bellcrank', LINK.pitchRod.together, SZ.tBC], ['elevator drive link', LINK.hornE, SZ.tDrive], ['roll crank', LINK.rollT.together / ARM.roll, SZ.tCrank], ['walking beam', LINK.ailRod, SZ.tBeam], ['K1 / K2', LINK.ailRod, SZ.tK], ['toe tab', LINK.mc, SZ.tToe]];
    const modes = js.map(([n, P, t]) => { const m = /beam|K1/.test(n) ? MAT['6061'] : M4; return [`${n} bearing`, m.Fbru * AN[3].d * t / (f * SPECIAL * P) - 1]; });
    row(out, lc, 'LEZ-27-100', 'c27-joints', 'Control-system joints: AN3 rod-end bolts in their lugs (23.693, × 3.33)', 'every rod-end joint', modes,
      'σ_br = FS·3.33·P / (D·t) against F_bru of the softest lug material', [far, spIn, IN_('Bolts', 'AN3 (Ø 0.1875)', 'text', 'AN standard'), IN_('4130 / 6061 F_bru', `${M4.Fbru} / ${MAT['6061'].Fbru}`, 'psi', `${M4.spec}; ${MAT['6061'].spec}`)], js.map(([n, P]) => [n, P, 'lb'])); }
  return out;
}
registerChecks('wpC1', (d, lc) => (lc.id === 'W1-S1' ? checkRows(lc) : []));
/** CS spar pass-throughs for the controls (LEZ-57-140 rev C): x0 at the forward face, x1 at the aft face, z above the lower face */
export function CS_PASS() { const zl = CS_FIT.L * 12, r = rudRoute(1); return [{ id: 'rod', x0: r4(L.E[1]), x1: r4(L.X[1]), z: r4(L.WLA - zl), d: r4(SZ.ailRod[0] + 0.25) }, { id: 'cable', x0: r4(r[RR.fwd][1]), x1: r4(r[RR.aft][1]), z: r4(r[RR.fwd][2] - zl), d: r4(CONDUIT.od + 0.125) /* DC-005: hole follows the conduit (was 0.375 for the 0.25 in conduit) */ }]; }
/** CS spar shear webs at the pass-throughs: the web net of the holes (both webs pierced at the same BL) */
registerChecks('wpC1-cs', (d, lc, Z, M) => {
  const Ld = surfaceLoads('wing', d, lc); if (!Ld) return [];
  const r = Ld.at(GEO.wing.attachY), h = GEO.csSpar.depthFt * 12, P_ = CS_PASS(), wd = GEO.csSpar.width * 12;
  // the largest total hole height in any vertical line of either web (holes overlap in BL when their elliptical traces do)
  let dh = 0; for (const k of ['x0', 'x1']) for (const a of P_) { let s_ = 0; for (const b of P_) { const ea = a.d / 2 / Math.cos(Math.atan2(Math.abs(a.x1 - a.x0), wd)), eb = b.d / 2 / Math.cos(Math.atan2(Math.abs(b.x1 - b.x0), wd)); if (Math.abs(a[k] - b[k]) < ea + eb) s_ += b.d; } dh = Math.max(dh, s_); }
  const Nxy = Math.abs(r.V) * d.FS / 2 / (h - dh), bidS = (k) => Array.from({ length: k }, () => ({ mat: 'BID', angle: 45 })), web = plyRF(bidS(Z.csWeb), [0, 0, Nxy], M), wl = laminate(bidS(Z.csWeb), M), tauWr = wrinkling(psi(M.BID.E1), 'PVC', M) * 0.8;
  const msW = web.rf - 1, msB = tauWr / (Nxy / wl.h) - 1, ms_ = Math.min(msW, msB);
  const row = mk('csSpar', 'cs-ctl-holes', 'CS spar webs net of the control pass-throughs (rev C)', lc, `BL ±${fx2(L.E[1])}–${fx2(L.X[1])}`, msW < msB ? `web ${web.mode}` : 'face wrinkling under shear', ms_, {
    formula: 'Nxy = FS·V / (2·(h − Σd)), Σd the largest total hole height in one vertical line of either web;  CLT first-ply on the ±45 webs;  wrinkling 0.8 · 0.5 (E·Ec·Gc)^⅓',
    inputs: [['Attach shear V (limit)', r.V, 'lb', 'SCHRENK'], ['Depth h', h, 'in', 'MODEL'], ['Holes', CS_PASS().map((q) => `${q.id} Ø ${q.d}`).join(', '), 'text', 'DESIGN'], ['Webs', `${Z.csWeb} × 6781 ±45 × 2`, 'text', 'SIZED']],
    result: [['Nxy net (ult.)', Nxy, 'lbin'], ['τ wrinkling allowable', tauWr, 'psi']] });
  row.sys = 'LEZ-57-140'; return [row];
});
const fx2 = (x) => x.toFixed(2);

// ------------------------------------------------------------------------------------------- landing brake geometry
let LBC = null;
const FUS_BOT = (fs) => fusAt(fs / 12).bot * 12;
export function LB() {
  if (LBC) return LBC;
  const g = L.lb, len_ = g.s1 - g.s0, width = 2 * g.hw, q = 0.5 * 0.002377 * (g.Vlb * 1.6878) ** 2 / 144, S = len_ * width, HM = q * S * g.CN * len_ / 2;
  // seat-3 2026-11-22: the brake moved 12 in aft (FS 64–80) out from under the pilot, who now sits on the belly. The horn is a
  // bracket on the panel just aft of the hinge (25° up from the panel), and the actuator stands almost upright above it, its
  // anchor on a hard point in the front seat back's aft face (LEZ-53-170), pushing the horn down to open (was a horn 35° forward
  // of vertical pushed aft by an actuator on a keel bracket under the pilot's seat)
  const H = [g.s0, +(FUS_BOT(g.s0) + 0.03).toFixed(3)], ang = 25 * D2R, ACT = { stroke: 3.0, retracted: 7.13, rated: 169 };   // Progressive Automations PA-01 (supersedes PA-14, same mounting): 3 in stroke, retracted stroke + 4.13 in, 169 lb option, 1.8 lb, 12 VDC rating (progressiveautomations.com, accessed 2026-11-19)
  let A = [g.anchor[0], g.anchor[2]];
  const at = (a, th) => { const t = th * D2R, x = a * Math.cos(ang), z = a * Math.sin(ang); return [H[0] + x * Math.cos(t) + z * Math.sin(t), H[1] - x * Math.sin(t) + z * Math.cos(t)]; };
  const geo = (a) => { let F = 0, thF = 0; for (let th = 0; th <= g.open + 1e-9; th += 1) { const P = at(a, th), r = [P[0] - H[0], P[1] - H[1]], u = norm([A[0] - P[0], A[1] - P[1]]), arm = Math.abs(r[0] * u[1] - r[1] * u[0]), cn = Math.min(1, 2 * Math.PI * Math.sin(th * D2R)), f = HM * cn / arm; if (f > F) { F = f; thF = th; } }
    const L0 = Math.hypot(A[0] - at(a, 0)[0], A[1] - at(a, 0)[1]), L1 = Math.hypot(A[0] - at(a, g.open)[0], A[1] - at(a, g.open)[1]); return { F, thF, need: L1 - L0, L0, L1 }; };
  // the anchor: on the seat back's aft face at the retracted length from the horn (upper intersection)
  const aft = (P0) => { const h = SB.t / 2 + 0.75 /* the bracket stands the clevis pin 0.75 in off the aft face */, o = [SBP.o[0] * 12 + h * SBP.en[0], SBP.o[2] * 12 + h * SBP.en[2]], e = [SBP.ev[0], SBP.ev[2]], d = [o[0] - P0[0], o[1] - P0[1]];
    const b = d[0] * e[0] + d[1] * e[1], c = d[0] * d[0] + d[1] * d[1] - ACT.retracted ** 2, v = -b + Math.sqrt(Math.max(0, b * b - c)); return [r4(o[0] + v * e[0]), r4(o[1] + v * e[1])]; };
  let a = 1.0;
  for (a = 1.0; a < 6; a += 0.01) { A = aft(at(a, 0)); if (geo(a).need >= 0.95 * ACT.stroke) break; }   // stroke used 95 %
  g.anchor = [A[0], 0, A[1]];
  const G = geo(a), harness = harnessPts();
  let hl = 0; for (let i = 1; i < harness.length; i++) hl += len(sub(harness[i], harness[i - 1]));
  const hp = at(a, 0); LBC = { ...G, a: r4(a), q, CN: g.CN, V: g.Vlb, len: len_, width, S, HM, cant: len_, tCore: 0.25, rated: ACT.rated, stroke: ACT.stroke, retracted: ACT.retracted, hingeAllow: 0.55 * 75000 * Math.PI * 0.09 ** 2 / 4 * (len_ / 0.5), harnessLen: hl,
    horn: [r4(hp[0]), 0, r4(hp[1])], hinge: H, ang: 125, A: g.anchor, at };
  return LBC;
}
export function harnessPts() { return [[39.6, -2.9, 35.70], [42.0, -2.9, 36.20],   // LEZ-27-172 rev B: 0.20 in lower through the panel (ICD J-R3: it ran 0.15 in under the AXIS bezel)
   [69.50, -8.8, 33.0], [67.40, -0.8, 33.5]]; }   // seat-3: to the actuator's motor end on the seat back's aft face (was under the pilot's seat, FS 42.4)

// ------------------------------------------------------------------------------------------- system records follow the definition
export const SYSGEO = {};
{
  const path = (pts, dIn, extra = {}) => ({ t: 'path', pts: pts.map(ft), dIn, cls: 'pushrod', ...extra });
  const set = (pn, o) => { const p = partByPN(pn); if (p) Object.assign(p, o); };
  const rl = (sg) => [[L.SR[0], sg * L.SR[1], L.SR[2]], [L.E[0], sg * L.E[1], L.E[2]], [L.X[0], sg * L.X[1], L.X[2]], [L.K1a[0], sg * L.K1a[1], L.K1a[2]]];
  const rb = (sg) => [[L.K1b[0], sg * L.K1b[1], L.WLA], [L.K2d[0], sg * L.K2d[1], L.WLA]];
  const rc = (sg) => [[L.K2c[0], sg * L.K2c[1], L.K2c[2]], [L.hornA[0], sg * L.hornA[1], L.hornA[2]]];
  set('LEZ-27-120', { geo: [path([L.PB, L.PA1], SZ.pitchRod[0], { wallIn: SZ.pitchRod[1] })], name: `Pitch rod, torque-tube bellcrank to stick (${SZ.pitchRod[0]} × ${SZ.pitchRod[1]} 2024-T3)` });
  set('LEZ-27-140', { geo: [path([L.G1, L.R1], SZ.rollTube[0], { wallIn: SZ.rollTube[1] })], name: `Roll tube, front stick through the rear stick to the roll crank (${SZ.rollTube[0]} × ${SZ.rollTube[1]} 4130)` });
  set('LEZ-27-142', { name: 'Aileron rods A / B / C and corner bellcranks K1 / K2 (L/R)', geo: [-1, 1].flatMap((sg) => [path(rl(sg), SZ.ailRod[0], { wallIn: SZ.ailRod[1], extSeg: [1, 2, 3] }), path(rb(sg), SZ.ailRod[0], { wallIn: SZ.ailRod[1], extSeg: [1] }), path(rc(sg), SZ.ailRod[0], { wallIn: SZ.ailRod[1], extSeg: [1] })]) });
  set('LEZ-27-151', { geo: [-1, 1].map((sg) => ({ t: 'path', pts: rudRoute(sg).map(ft), dIn: CONDUIT.od, massPerFt: CABLE.lbPerFt + 0.02, cls: 'cable', extSeg: Array.from({ length: rudRoute(1).length - RR.fwd }, (_, i) => RR.fwd + i) })) });
  set('LEZ-27-172', { geo: [{ t: 'path', pts: harnessPts().map(ft), dIn: 0.25, massPerFt: 0, cls: 'power', extSeg: [] }] });
}
defineReqs([
  { id: 'R-STR-10', checks: /^c27-(pitch-rod|ail-rod|rud-cable|stick|rear-stick|torque-tube|roll-tube|ail-bellcrank|pedal|joints|trim)$/, closed: true },
  { id: 'R-CTL-1', checks: /^c27-(rud-cable|stops)$/, closed: true, verify: () => ({ ok: !!partByPN('LEZ-27-160'), detail: 'stops at the stick base (pitch, roll), the pedals and on the rudders; 3/16 in CRES cables in conduit' }) },
]);
defineGraph('controls', {
  title: 'Flight controls (ATA 27)',
  nodes: [
    { id: 'ST', label: 'Side stick', sub: 'front, right console', col: 0, row: 1, pn: 'LEZ-27-110' }, { id: 'RS', label: 'Rear stick', sub: 'rear link, roll tube', col: 0, row: 0, pn: 'LEZ-27-111' },
    { id: 'PR', label: 'Pitch rod', sub: `${SZ.pitchRod[0]} in 2024`, col: 1, row: 0, pn: 'LEZ-27-120' }, { id: 'EB', label: 'Elevator torque tube', sub: 'below the canard', col: 2, row: 0, pn: 'LEZ-27-130' },
    { id: 'EL', label: 'Elevators', sub: 'balance on the tube', col: 3, row: 0, pn: 'LEZ-27-135' }, { id: 'RT', label: 'Roll tube', sub: 'to the roll crank', col: 1, row: 1, pn: 'LEZ-27-140' },
    { id: 'RB', label: 'Walking beam', sub: 'CS spar face', col: 2, row: 1, pn: 'LEZ-27-141' }, { id: 'AL', label: 'Ailerons', sub: 'rods A / B / C', col: 3, row: 1, pn: 'LEZ-27-142' },
    { id: 'PD', label: 'Pedals', sub: 'front only', col: 0, row: 2, pn: 'LEZ-27-150' }, { id: 'RC', label: 'Rudder cables', sub: '3/16 in, conduit', col: 1, row: 2, pn: 'LEZ-27-151' },
    { id: 'RU', label: 'Rudders', sub: 'outward only', col: 3, row: 2 }, { id: 'MC', label: 'Master cylinders', sub: 'on the pedals', col: 1, row: 3, pn: 'LEZ-32-311' }, { id: 'BR', label: 'Wheel brakes', sub: 'L/R', col: 3, row: 3, pn: 'LEZ-32-310' },
  ],
  edges: [{ a: 'RS', b: 'ST', cls: 'mech', label: 'rear link' }, { a: 'ST', b: 'PR', cls: 'mech', label: 'pitch' }, { a: 'PR', b: 'EB', cls: 'mech' }, { a: 'EB', b: 'EL', cls: 'mech' }, { a: 'ST', b: 'RT', cls: 'mech', label: 'roll' }, { a: 'RT', b: 'RB', cls: 'mech' }, { a: 'RB', b: 'AL', cls: 'mech' },
    { a: 'PD', b: 'RC', cls: 'mech' }, { a: 'RC', b: 'RU', cls: 'mech' }, { a: 'PD', b: 'MC', cls: 'mech' }, { a: 'MC', b: 'BR', cls: 'brake', label: 'brake lines' }],
});
void CTL; void FRAMES; void afAt;
