// Long-EZ structural demonstrator, v2.
// Laminate theory, weight/CG cases, flight + ground + emergency load cases, ply sizing, margins of
// safety with a full calculation trace for every check, aeroelastic estimates, validation helpers.
// Units: lb, in, psi internally; geometry tables in ft (s = station aft of nose, y = lateral, z = height).
// NOTIONAL design built from public dimensions and typical material data. Not for construction.

export const FT = 12;
const MPA = 145.038;
const G = 32.174;
const RHO0 = 0.0023769;
const KT = 1.68781;
const D2R = Math.PI / 180;
export const psi = (mpa) => mpa * MPA;
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

// ------------------------------------------------------------------ sources (for traces and the report)
export const SOURCES = {
  POH: 'Long-EZ Owners Manual / POH (gross weight, dimensions, cockpit layout)',
  MSU: 'Samborsky, Mandell & Agastra, Montana State Univ., glass/epoxy UD static properties',
  FAR23: '14 CFR Part 23 (utility-category load factors, gust, landing, emergency-landing rules)',
  HOFF: 'Hoff-Mautner face-wrinkling formula, 0.5 (Ef·Ec·Gc)^1/3',
  CLT: 'Classical laminate theory, max-stress first-ply failure',
  BEAM: 'Engineering beam theory / Bredt-Batho thin-wall torsion',
  SCHRENK: "Schrenk's spanwise lift approximation",
  TAS: 'Thin-airfoil theory (flap effectiveness)',
  MODEL: "This project's 3D model geometry (photo- and builder-derived)",
  ASSUMED: 'Engineering assumption for this demonstration (no public source)',
  SIZED: 'Sized by this tool',
  DERIVED: 'Derived in this calculation',
};

// ------------------------------------------------------------------ materials and environment
// Laminate system (Miles, 2026-11-19, block P): Solvay (Cytec) MTM45-1 out-of-autoclave prepreg, NCAMP-qualified (NMS 451), co-cured on
// Divinycell HT cores on the NCAMP M cycle (250 ± 10 °F, 4–6 h, ≥ 28 inHg, no free-standing post-cure; NPS 81451 Rev D sec 4.4.2).
// Every value below comes from /home/claude/wt/memaudit/prepreg.json (ids in brackets) and is cited by its NCAMP / Diab document.
//
// Ply roles. Stacks and ply books name a ply by its ROLE, and BASE_MAT resolves each role to a prepreg:
//   'UNI' — the unidirectional cap ply: MTM45-1 / HTS40 (12K HTS5631) carbon unitape (the wing, canard and CS spar caps, the
//           wing-root build-ups and wherever carbon pays off structurally);
//   'GUD' — the glass cap ply of the all-glass parts (winglets, strakes, antenna keep-out zones, bulkhead doublers, gear bow):
//           MTM45-1 / 6781 S2-glass fabric laid 0/90 (no glass unitape is NCAMP-qualified on MTM45-1);
//   'BID' — the woven fabric ply (skins, webs, faces; usually on the bias): MTM45-1 / 6781 S2-glass 8HS;
//   'XPS', 'PU', 'PVC' — the core roles (lifting-surface blocks, fuselage shell, bulkheads / spar blocks): CNC-milled Divinycell
//           HT at the lowest density that passes (HT61 on every part: it passes wherever the retired cores did, see coreChoice()).
// The retired wet-layup system (MGS L285 / H287, 7715 / 7725 E-glass, Styrofoam, FR-3703, H45) is kept in WET_MAT for repair notes
// only; nothing in the sizing reads it.
//
// Allowables (Miles, 2026-11-19). NCAMP B-basis values exist only on the MH cycle (250 °F + 350 °F free-standing post-cure), which
// the cores cannot take (293 °F processing limit). The M cycle is an equivalency cycle with no B-basis, so until the M-cycle coupon
// programme is done every strength is the NCAMP MH value × a reduction, carried as a BOUND:
//   7781: B-basis × 0.9 (M cycle versus MH);   6781, HTS40, AS4 PW: mean × 0.8 (no B-basis public) × 0.9 (M versus MH) = × 0.72.
// Moduli are NCAMP means (no reduction): the lowest of tension / compression (and warp / fill for fabrics) in each environment, never
// above the RTD value. Design environment ETW = 200 °F wet after 160 °F / 85 % RH conditioning (NCAMP), which covers the 140 °F
// service target; the cores' 176 °F continuous limit is checked separately (core-svc).
// TEST REQUIREMENT (before flight): an M-cycle equivalency and allowables coupon programme to DOT/FAA/AR-03/19 on this material,
// cycle and the builder's process, with witness coupons from every part's cure (see MATSYS.tests).
const KSI = 6.89476, MSI = 6894.76;   // ksi → MPa, Msi → MPa (BASE_MAT is in MPa)
const NCAMP = {
  hts40: 'NCAMP CAM-RP-2009-010 Rev B, MTM45-1 / 12K HTS5631 (HTS40) unitape MPDR, Tables 2-1 / 2-2, normalized means (wichita.edu, accessed 2026-11-19)',
  s6781: 'NCAMP CAM-RP-2009-001 Rev C, MTM45-1 / 6781 S2-glass MPDR, Tables 2-1 / 2-2, normalized means (wichita.edu, accessed 2026-11-19)',
  e7781: 'NCAMP NCP-RP-2009-009 Rev A, MTM45-1 / 7781 E-glass SAR, Tables 3-1, 3-4, 5-14, B-basis (wichita.edu, 2018-09-24, accessed 2026-11-19)',
  e7781spec: 'NCAMP NMS 451/4 Rev D, MTM45-1 / 7781 detail specification, Tables 1 and 3 (wichita.edu, 2021-08-18, accessed 2026-11-19)',
  diabHT: 'Diab Divinycell HT technical data, IMP units, rev14, mechanical properties at 73.4 °F, minimum values (diabgroup.com, 2020-06, accessed 2026-11-19)',
  nps: 'NCAMP NPS 81451 Rev D, fabrication of NMS 451 panels, sec 4.3–4.4 (wichita.edu, 2022-09-23, accessed 2026-11-19)',
  nms: 'NCAMP NMS 451 Rev A, MTM45-1 base material specification, sec 1.2 and 3.6.2 (wichita.edu, accessed 2026-11-19)',
};
export const MATSYS = {
  name: 'Solvay MTM45-1 out-of-autoclave prepreg (NCAMP NMS 451): HTS40 carbon unitape, 6781 S2-glass, Divinycell HT cores',
  short: 'MTM45-1 prepreg (NCAMP), M cycle',
  // allowable reduction per material (the BOUND above); kB is the one the sizing materials (6781, HTS40) carry
  kA: { HTS40: 0.72, S6781: 0.72, E7781: 0.90 }, kB: 0.72,
  kAWhy: { HTS40: 'NCAMP MH mean × 0.8 (no public B-basis: SAR NCP-RP-2009-008 blocked) × 0.9 (M cycle versus MH)', S6781: 'NCAMP MH mean × 0.8 (no public B-basis: SAR NCP-RP-2009-001 blocked) × 0.9 (M cycle versus MH)', E7781: 'NCAMP MH B-basis × 0.9 (M cycle versus MH)' },
  src: `${NCAMP.hts40}; ${NCAMP.s6781}; ${NCAMP.e7781}`,
  // M cycle: the only NPS 81451 cycle whose peak (260 °F) stays below the cores' 293 °F processing limit [cure-M, core-cycle-fit]
  cure: { cycle: 'NCAMP M cycle', ramp: '1–5.5 °F/min', dwell: '250 ± 10 °F for 4–6 h', vac: 28, peakF: 260, post: 'none (no free-standing post-cure)',
    bag: 'bag leak check ≤ 5 inHg loss in 5 min after pulling 27 inHg (NPS 81451 sec 4.3.1)', oven: 'Oven size is not a constraint (Miles, 2026-11-19: large ovens available): every structural composite part, whole',
    src: `${NCAMP.nps}: M cycle sec 4.4.2, vacuum ≥ 28 inHg sec 4.3 step 4` },
  // handling [out-life, store-life]: out-time 10 days at shop temperature (12 days if a tack test passes), storage ≤ 0 °F for 12 months
  outDays: 10, outDaysTack: 12, storeMonths: 12, storeF: 0, handSrc: `${NCAMP.nms}: storage sec 3.6.2.1.1 / 3.6.2.1.3, out-time sec 3.6.2.2`,
  // M-cycle Tg is not public [cure-tg-LHM not_found]: MH wet Tg 320 °F (7781), 341.9 °F (6781), 332.6 °F (HTS40). Without the 350 °F
  // post-cure the M-cycle Tg is lower: BOUND wet Tg 200 °F (the NCAMP ETW test temperature, which the equivalency report must support),
  // to be measured by the coupon programme (DMA, ASTM D7028) before flight.
  Tg: { wetF: 200, MH: { E7781: [356, 320], S6781: [391.5, 341.9], HTS40: [397.4, 332.6] }, src: 'BOUND: M-cycle wet Tg not public (NCAMP LH/M equivalency reports blocked); MH Tg dry / wet from the NCAMP MPDRs / SAR (wichita.edu, accessed 2026-11-19)' },
  // service: the 140 °F target (white or light finish on every external composite surface; confirm by a skin-temperature survey)
  serviceMaxF: 140, etwF: 200, svcSrc: `${NCAMP.nms}: structural use to 250 °F; ETW at 200 °F wet after 160 °F / 85 % RH (ASTM D5229 Proc. C)`,
  // cores [HT-proc, HT-svc]: processing ≤ 293 °F, continuous service −325 to +176 °F
  core: { procF: 293, svcF: 176, src: `${NCAMP.diabHT}: processing ≤ 293 °F (time-, pressure- and process-dependent: confirm with Diab Technical Services), continuous −325 to +176 °F` },
  // adhesive [adh-fm300-2, adh-fm309]: FM 300-2 (250 °F cure, made for co-cure) for core bonds and secondary bonds, or co-cure without
  // film where NCAMP or Diab practice allows; FM 309-1 (350 °F) is incompatible with the cores
  adhesive: { name: 'Solvay FM 300-2 film adhesive (250 °F cure)', cureF: 250, src: 'FM 300-2M product page (e-aircraftsupply.com, accessed 2026-11-19): 250 °F cure, co-cure and secondary bonding; FM 309-1 cures at 350 °F (pccomposites.com listing, accessed 2026-11-19): not used' },
  tests: 'M-cycle equivalency and allowables coupon programme to DOT/FAA/AR-03/19 (material, M cycle and the builder\'s process; Tg by DMA; FM 300-2 flatwise tension on Divinycell HT), and witness coupons from every part\'s cure, before flight',
};
export const cToF = (c) => c * 9 / 5 + 32;
/** hot-wet operating limit (°F) and its margin over the structure's maximum service temperature, both as rises above 59 °F (ISA sea level) */
export const hotWet = () => { const mol = MATSYS.Tg.wetF - 50, svc = MATSYS.serviceMaxF; return { mol, svc, ms: (mol - 59) / (svc - 59) - 1 }; };
/** core temperature margins: cure peak vs the processing limit, service target vs the continuous limit (rises above 59 °F) */
export const coreTemps = () => { const c = MATSYS.core, pk = MATSYS.cure.peakF, sv = MATSYS.serviceMaxF; return { proc: (c.procF - 59) / (pk - 59) - 1, svc: (c.svcF - 59) / (sv - 59) - 1, pk, sv, c }; };
/** ply material from NCAMP values: r = RTD, w = ETW (ksi / Msi), each { E, E2, G12, nu12, Xt, Xc, Yt, Yc, S, ILSS, Fbru } */
const ply = (o, r, w) => {
  const cv = (q) => ({ E1: q.E * MSI, E2: q.E2 * MSI, G12: q.G12 * MSI, nu12: q.nu12, Xt: q.Xt * KSI, Xc: q.Xc * KSI, Yt: q.Yt * KSI, Yc: q.Yc * KSI, S: q.S * KSI, ILSS: q.ILSS * KSI, Fbru: q.Fbru * KSI });
  return { kind: 'ply', ...o, ...cv(r), etw: cv(w), areal: o.t * o.rhoG * 0.0361273 * 144 };   // areal: cured lb/ft² per ply
};
const HT = (g, rhoPcf, E, Gc, tau, sc, ft) => ({ label: `HT${g}`, name: `Divinycell HT${g} cross-linked PVC foam, ${rhoPcf} lb/ft³, CNC-milled`, kind: 'core', color: '#b58ad6', rho: +(rhoPcf / 62.43).toFixed(5), rhoPcf, E, Gc, tau, sc, ft, grade: `HT${g}`,
  src: `${NCAMP.diabHT}, HT${g} column (MPa minimums; E is the minimum compressive modulus)` });
// Divinycell HT grades [HT61 … HT251]: min. compressive modulus, shear modulus, shear, compression and tension strength (MPa)
export const CORES = { HT61: HT(61, 4.1, 58.0, 18.0, 0.75, 0.85, 1.5), HT81: HT(81, 5.0, 90.0, 22.0, 1.0, 1.2, 2.2), HT101: HT(101, 6.2, 115.0, 28.0, 1.4, 1.65, 2.5), HT131: HT(131, 8.1, 145.0, 40.0, 1.9, 2.4, 3.5), HT251: HT(251, 15.6, 350.0, 81.0, 3.9, 6.1, 8.0) };
// HTS40 unitape [HTS40-*]: RTD and ETW (200 °F wet) means; t 0.0055 in [HTS40-phys], cured density 1.51–1.53 g/cm³ (the heavy end for mass).
// E2 and Yt / Yc in ETW are not reported: BOUND as RTD × the ETW/RTD ratio of the same report's G12 (0.70) and SBS (0.583).
const HTS40_R = { E: 17.02, E2: 1.04, G12: 0.57, nu12: 0.35, Xt: 310.72, Xc: 193.3, Yt: 4.56, Yc: 17.36, S: 10.18, ILSS: 14.52, Fbru: 102.47 };
const HTS40_W = { E: 17.02, E2: +(1.04 * 0.40 / 0.57).toFixed(3), G12: 0.40, nu12: 0.326, Xt: 310.72, Xc: 176.28, Yt: +(4.56 * 8.47 / 14.52).toFixed(3), Yc: +(17.36 * 8.47 / 14.52).toFixed(3), S: 5.84, ILSS: 8.47, Fbru: 91.67 };
// 6781 S2-glass [6781-*]: the lower of warp / fill and tension / compression in each environment; t 0.0101 in, 1.78–1.80 g/cm³ [6781-phys]
const S6781_R = { E: 4.02, E2: 4.02, G12: 0.55, nu12: 0.138, Xt: 80.5, Xc: 69.07, Yt: 80.5, Yc: 69.07, S: 9.16, ILSS: 9.79, Fbru: 82.73 };
const S6781_W = { E: 3.77, E2: 3.77, G12: 0.34, nu12: 0.116, Xt: 57.22, Xc: 47.86, Yt: 57.22, Yc: 47.86, S: 5.64, ILSS: 6.58, Fbru: 63.82 };
// 7781 E-glass [7781-*]: B-basis where reported (fill compression RTD and in-plane shear RTD at 5 % strain are not: the elevated-dry fill
// compression B 53.34 and the 0.2 %-offset shear B 4.56 ksi stand in, both lower); nu12 0.12 (the low end of the 0.119–0.153 range)
const E7781_R = { E: 3.33, E2: 3.33, G12: 0.54, nu12: 0.12, Xt: 53.01, Xc: 53.34, Yt: 53.01, Yc: 53.34, S: 4.56, ILSS: 9.89, Fbru: 55.12 };
const E7781_W = { E: 3.05, E2: 3.05, G12: 0.34, nu12: 0.12, Xt: 34.17, Xc: 35.27, Yt: 34.17, Yc: 35.27, S: 4.62, ILSS: 4.57, Fbru: 40.18 };
export const BASE_MAT = {
  UNI: ply({ label: 'HTS40', name: 'MTM45-1 / HTS40 (12K HTS5631) carbon unitape, NCAMP, 0.0055 in cured ply', color: '#5a6270', t: 0.0055, rhoG: 1.53, fibre: 'carbon', key: 'HTS40',
    src: `${NCAMP.hts40}; bearing at 250 °F wet (ETW2) stands in for 200 °F; E2, Yt, Yc in ETW BOUND (ratios of G12 and SBS)` }, HTS40_R, HTS40_W),
  GUD: ply({ label: '6781 0/90', name: 'MTM45-1 / 6781 S2-glass 8HS fabric laid 0/90 (glass cap ply), NCAMP, 0.0101 in cured ply', color: '#e8c873', t: 0.0101, rhoG: 1.80, fibre: 'glass', key: 'S6781',
    src: `${NCAMP.s6781}; bearing at 250 °F wet (ETW2) stands in for 200 °F` }, S6781_R, S6781_W),
  BID: ply({ label: '6781', name: 'MTM45-1 / 6781 S2-glass 8HS fabric, NCAMP, 0.0101 in cured ply', color: '#cfe0f0', t: 0.0101, rhoG: 1.80, fibre: 'glass', key: 'S6781',
    src: `${NCAMP.s6781}; bearing at 250 °F wet (ETW2) stands in for 200 °F` }, S6781_R, S6781_W),
  // 7781 E-glass: the B-basis alternate fabric. Not used: its cured density is not public [7781-vf-rho not_found], so it cannot be
  // shown lighter than 6781 (the nominal 293 g/m² fabric at 35 wt % resin gives 1.78 g/cm³, 2 % lighter per ply, but ± 3 % resin and
  // ± 18 g/m² cover both ways), and its design allowables (B × 0.9) sit 8–25 % below 6781's (mean × 0.72) in Xt, Xc, ILSS and bearing.
  E7781: ply({ label: '7781', name: 'MTM45-1 / 7781 E-glass 8HS fabric, NCAMP B-basis (alternate, not used)', color: '#d8e6c8', t: 0.0100, rhoG: 1.775, fibre: 'glass', key: 'E7781', alternate: true,
    src: `${NCAMP.e7781}; CPT and resin content ${NCAMP.e7781spec}; density derived (293 g/m² fabric at 35 wt % resin), not published` }, E7781_R, E7781_W),
  // core roles: Divinycell HT61 (lowest density that passes, every part; coreChoice() below shows it against the next grade)
  XPS: { ...CORES.HT61, label: 'HT61', name: 'Divinycell HT61, 4.1 lb/ft³, CNC-milled (lifting-surface and control-surface cores)', color: '#7fb0e6' },
  PU: { ...CORES.HT61, label: 'HT61', name: 'Divinycell HT61, 4.1 lb/ft³, CNC-milled (fuselage shell core)', color: '#e2b35a' },
  PVC: { ...CORES.HT61, label: 'HT61', name: 'Divinycell HT61, 4.1 lb/ft³, CNC-milled (bulkheads, spar blocks, cap beds)' },
  ...CORES,
  // flox potting of inserts and hard-points: a secondary operation after the cure (room-temperature epoxy + cotton flock), outside the
  // cured laminate; its value and hot-wet factor are those of the retired system (BOUND)
  FLOX: { label: 'Flox', name: 'Epoxy + cotton flock potting (inserts, hard-points; potted after the cure)', kind: 'adhesive', shear: 13.8 },
};
/** the retired wet-layup system (repair notes only; nothing in the sizing reads it). src: block A memory audit, 2026-11-19 */
export const WET_MAT = {
  UNI: { label: 'UNI (wet)', name: 'Hexcel 7715 E-glass UD, MGS L285 / H287 wet layup', t: 0.0094, fabric: 7.3, E1: 33.5e3, Xt: 838, Xc: 523, ILSS: 42 },
  BID: { label: 'BID (wet)', name: 'Hexcel 7725 E-glass bidirectional, MGS L285 / H287 wet layup', t: 0.0113, fabric: 8.8, E1: 18.6e3, Xt: 428, Xc: 381, ILSS: 42 },
  XPS: { label: 'Styrofoam', name: 'Styrofoam Panel Core 30', rho: 0.032 }, PU: { label: 'FR-3703', name: 'LAST-A-FOAM FR-3703', rho: 0.048 }, PVC: { label: 'H45', name: 'Divinycell H45', rho: 0.048 },
  note: 'Retired from the airframe (Miles, 2026-11-19): MTM45-1 prepreg replaces the wet layup. Kept for repair notes only (a field repair of a prepreg part is a separate, qualified process: not defined here).',
};
// environment: RTD (the base values) or ETW (each ply material's etw block); cores keep a hot-wet knock-down (fcore: BOUND, Diab
// publishes 73.4 °F values only; the cores are used to the 140 °F service target, below their 176 °F continuous limit)
export const ENV = {
  RTD: { label: 'Room temperature, dry', fcore: 1, fflox: 1 },
  ETW: { label: 'Elevated temperature (200 °F), wet (NCAMP ETW)', fcore: 0.75, fflox: 0.48,
    note: 'NCAMP ETW: 200 °F after 160 °F / 85 % RH to equilibrium (ASTM D5229 Proc. C); it covers the 140 °F service target. Cores × 0.75 and flox × 0.48 hot-wet: BOUND (not found in public sources).' },
};
export const BVID_KD = 0.80; // compression-after-impact knock-down for barely visible impact damage (assumed)
const PLY_KEYS = ['UNI', 'GUD', 'BID', 'E7781'], CORE_KEYS = ['XPS', 'PU', 'PVC', ...Object.keys(CORES)];

/** effective material table for a design: environment, damage tolerance, the M-cycle allowable reduction, and multipliers d.k for studies */
export function materials(d) {
  const e = ENV[d.env] || ENV.RTD, k = d.k || {}, bv = d.bvid ? BVID_KD : 1;
  const M = JSON.parse(JSON.stringify(BASE_MAT));
  for (const key of PLY_KEYS) {
    const m = M[key];
    if (d.env === 'ETW') Object.assign(m, m.etw);
    m.E1 *= (k.E1 || 1); m.G12 *= (k.G12 || 1);
    m.Xt *= (k.Xt || 1); m.Xc *= bv * (k.Xc || 1); m.Yc *= bv; m.S *= (k.S || 1);
    const kA = d.kB ?? MATSYS.kA[m.key] ?? MATSYS.kB;   // NCAMP MH → M-cycle design value (BOUND)
    for (const f of ['Xt', 'Yt', 'Xc', 'Yc', 'S', 'ILSS', 'Fbru']) m[f] *= kA;
    m.t *= (k.t || 1); m.kA = kA;
  }
  for (const key of CORE_KEYS) {
    const m = M[key];
    m.E *= e.fcore * (k.coreE || 1); m.Gc *= e.fcore * (k.coreG || 1); m.tau *= e.fcore; m.ft *= e.fcore; m.sc *= e.fcore;
  }
  M.FLOX.shear *= e.fflox;
  M._bv = bv; M._env = e; M._kB = d.kB ?? MATSYS.kB;
  return M;
}
/** the same table with the cap role resolved to the glass cap ply (all-glass parts: winglets, strakes, antenna zones, flat parts) */
const GLASSM = new WeakMap();
export function glassM(M) { let g = GLASSM.get(M); if (!g) { g = { ...M, UNI: M.GUD, _glass: true }; GLASSM.set(M, g); } return g; }
export const MAT = BASE_MAT;

// ------------------------------------------------------------------ classical laminate theory
function Qmat(m) {
  const E1 = psi(m.E1), E2 = psi(m.E2), G12 = psi(m.G12), n12 = m.nu12, n21 = n12 * E2 / E1, d = 1 - n12 * n21;
  return [[E1 / d, n12 * E2 / d, 0], [n12 * E2 / d, E2 / d, 0], [0, 0, G12]];
}
function Qbar(Q, deg) {
  const t = deg * D2R, c = Math.cos(t), s = Math.sin(t);
  const Q11 = Q[0][0], Q12 = Q[0][1], Q22 = Q[1][1], Q66 = Q[2][2];
  const c2 = c * c, s2 = s * s, c4 = c2 * c2, s4 = s2 * s2, cs = c * s;
  const a = Q11 * c4 + 2 * (Q12 + 2 * Q66) * s2 * c2 + Q22 * s4;
  const b = (Q11 + Q22 - 4 * Q66) * s2 * c2 + Q12 * (s4 + c4);
  const e = (Q11 - Q12 - 2 * Q66) * c2 * cs + (Q12 - Q22 + 2 * Q66) * s2 * cs;
  const f = Q11 * s4 + 2 * (Q12 + 2 * Q66) * s2 * c2 + Q22 * c4;
  const g = (Q11 - Q12 - 2 * Q66) * s2 * cs + (Q12 - Q22 + 2 * Q66) * c2 * cs;
  const h = (Q11 + Q22 - 2 * Q12 - 2 * Q66) * s2 * c2 + Q66 * (s4 + c4);
  return [[a, b, e], [b, f, g], [e, g, h]];
}
function inv3(a) {
  const [[a0, a1, a2], [b0, b1, b2], [c0, c1, c2]] = a;
  const d = a0 * (b1 * c2 - b2 * c1) - a1 * (b0 * c2 - b2 * c0) + a2 * (b0 * c1 - b1 * c0);
  return [
    [(b1 * c2 - b2 * c1) / d, (a2 * c1 - a1 * c2) / d, (a1 * b2 - a2 * b1) / d],
    [(b2 * c0 - b0 * c2) / d, (a0 * c2 - a2 * c0) / d, (a2 * b0 - a0 * b2) / d],
    [(b0 * c1 - b1 * c0) / d, (a1 * c0 - a0 * c1) / d, (a0 * b1 - a1 * b0) / d],
  ];
}
const mv3 = (m, v) => m.map((r) => r[0] * v[0] + r[1] * v[1] + r[2] * v[2]);

/** stack [{mat, angle}] -> A, B, D and effective in-plane constants (z from the stack mid-plane) */
const LAMC = new WeakMap();
export function laminate(stack, M = BASE_MAT) {
  let cache = LAMC.get(M);
  if (!cache) { cache = new Map(); LAMC.set(M, cache); }
  const key = stack.map((p) => p.mat + p.angle).join(',');
  let hit = cache.get(key);
  if (!hit) { hit = laminateRaw(stack, M); cache.set(key, hit); }
  return hit;
}
function laminateRaw(stack, M) {
  const A = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], B = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], Dm = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  const h = stack.reduce((a, p) => a + M[p.mat].t, 0);
  if (!h) return null;
  let z = -h / 2;
  for (const p of stack) {
    const m = M[p.mat], Qb = Qbar(Qmat(m), p.angle), z1 = z + m.t;
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
      A[i][j] += Qb[i][j] * (z1 - z); B[i][j] += Qb[i][j] * (z1 * z1 - z * z) / 2; Dm[i][j] += Qb[i][j] * (z1 ** 3 - z ** 3) / 3;
    }
    z = z1;
  }
  const a = inv3(A), Amax = Math.max(Math.abs(A[0][0]), 1);
  return {
    A, B, D: Dm, a, h, Ex: 1 / (h * a[0][0]), Ey: 1 / (h * a[1][1]), Gxy: 1 / (h * a[2][2]), nuxy: -a[0][1] / a[0][0],
    balanced: Math.abs(A[0][2]) / Amax < 1e-6 && Math.abs(A[1][2]) / Amax < 1e-6,
    symmetric: Math.max(...B.flat().map(Math.abs)) / (Amax * h) < 1e-6,
  };
}
/** first-ply reserve factor, max stress in ply axes, for in-plane resultants N=[Nx,Ny,Nxy] lb/in */
/** opt.matrixAt: N is ultimate, and matrix modes (UNI transverse, any in-plane shear) are judged at N / matrixAt (limit,
 *  matrixAt = FS): no matrix cracking at limit load, no fibre failure at ultimate (used for the bolted-joint net sections,
 *  where a ±45 cover ply cracking first is not the joint's failure; 2026-11-19, hot-wet shear knock-down 0.48) */
export function plyRF(stack, N, M, opt = {}) {
  const L = laminate(stack, M), e = mv3(L.a, N), kM = opt.matrixAt || 1;
  let rf = Infinity, mode = '';
  for (const p of stack) {
    const m = M[p.mat], t = p.angle * D2R, c = Math.cos(t), s = Math.sin(t);
    const e1 = e[0] * c * c + e[1] * s * s + e[2] * c * s;
    const e2 = e[0] * s * s + e[1] * c * c - e[2] * c * s;
    const g12 = 2 * (e[1] - e[0]) * c * s + e[2] * (c * c - s * s);
    const Q = Qmat(m);
    const s1 = Q[0][0] * e1 + Q[0][1] * e2, s2 = Q[0][1] * e1 + Q[1][1] * e2, t12 = Q[2][2] * g12;
    const lim = kM > 1 ? ' (at limit)' : '', kT = p.mat === 'UNI' ? kM : 1;   // woven BID: the transverse direction is fibre too
    const cand = [
      [s1 >= 0 ? psi(m.Xt) / Math.max(s1, 1e-9) : psi(m.Xc) / -s1, s1 >= 0 ? 'fibre tension' : 'fibre compression'],
      [kT * (s2 >= 0 ? psi(m.Yt) / Math.max(s2, 1e-9) : psi(m.Yc) / -s2), (s2 >= 0 ? 'transverse tension' : 'transverse compression') + (kT > 1 ? lim : '')],
      [kM * psi(m.S) / Math.max(Math.abs(t12), 1e-9), 'in-plane shear' + lim],
    ];
    for (const [r, md] of cand) if (r < rf) { rf = r; mode = `${p.mat} ${md}`; }
  }
  return { rf, mode, strain: e };
}
export function wrinkling(Ef, core, M) { return 0.5 * Math.cbrt(Ef * psi(M[core].E) * psi(M[core].Gc)); }
const bid = (n) => Array.from({ length: n }, () => ({ mat: 'BID', angle: 45 }));

// ------------------------------------------------------------------ geometry (ft), from the 3D model
// Re-layout to the plans' stations (2026-11-20, claude/plans-stations.md). Anchored on the plans' FS frame: instrument panel
// front face FS 40 (OM datum) and wing root LE FS 113.9 (OM p.37, the W&B reference). The nose (canard, F22, F28, panel)
// already sat in that frame; the wing, CS spar, strakes, firewall, engine group and loft aft of FS 66 move forward
// RELAYOUT.shiftIn. The main gear is set to the plans' FS 110.5 (OM: 'must be at FS 110.5 ± 1'). FLAGGED: the firewall
// lands at FS 127.5, 2.5 in aft of the plans' 125 (the wing root chord / sweep are not yet sourced); strake front and canopy
// aft edge moved with the aft group (ESTIMATE, not sourced).
export const RELAYOUT = { date: '2026-11-20', a1: 'winglet LE sweep derived from OVERALL (2026-11-21)', shiftIn: 25.5, anchor: 'WRLE FS 113.9 (OM p.37)', flags: ['firewall FS 127.5 vs plans 125 (wing planform unverified)', 'strake front FS 51.9 ESTIMATE', 'canopy aft edge FS 103.5 ESTIMATE', 'front seat back foot ESTIMATE'] };
export const GEO = {
  wing: { rootY: 1.10, tipY: 12.45, attachY: 3.75, rootLE: 8.4250, cr: 4.10, ct: 2.30, sweepLE: 22, z: 3.05, tc: 0.14, m: 0.03, spar: 0.30, cap: [3.0, 1.5], aileron: [4.9, 9.7], aileronCf: 0.24 },
  canard: { semi: 5.9, le: 1.45, c: 1.085, z: 3.52, tc: 0.15, spar: 0.30, cap: [2.5, 1.5], attachY: 5 / 12, elevator: [1.15, 5.75], elevCf: 0.35 },
  winglet: { h: 4.82, cr: 2.30, ct: 1.25, sweepLE: 37 /* replaced below: derived from OVERALL (A1, 2026-11-21) */, cant: 5.6, tc: 0.09, spar: 0.30, cap: [1.75, 1.0], rudder: [0.25, 4.5], rudderCf: 0.35, rudderBal: 0.25 /* DC-005 linkage (2026-11-21): set-back hinge, blunt circular nose 25 % of the rudder chord ahead of the hinge axis (NACA ARR L-380: sealed-gap overhang keeps a plain flap's lift effectiveness; 0.495 c_f overbalanced) */, rudderBalRamp: 0.5 /* ft above the rudder's lower end over which the nose grows from a rounded hinge face (the horn and cable sit at the lower end) */, gapIn: 0.06 /* DC-005 (2026-11-21): rudder h 0.25–3.0 → 0.25–4.5 ft, chord 30 → 35 % (claude/rudder-trade.md R6) */ },
  // CS spar: box beam on the wing spar line; depth and centre height are fitted inside the strake / wing-root skin below (csFit)
  csSpar: { halfSpan: 3.75, depthFt: 0.52, s: 10.4400, z: 3.05, cap: 4.25, width: 0.37 },   // cap 4.25 in (rev I, 2026-11-19; was 4.0): nearly the box's inner width   // aft face on the firewall; the wing spar line meets its centre line at the root (GEO.wing.spar below)
  fuselage: [
    [0.0, 0.0, 2.86, 2.86], [0.12, 0.38, 3.0, 2.7], [0.45, 0.78, 3.2, 2.52], [1.2, 1.38, 3.5, 2.3], [2.4, 1.8, 3.76, 2.16],
    [3.6, 2.02, 3.92, 2.1], [5.5, 2.12, 4.0, 2.05], [5.8750, 2.16, 4.0, 2.02], [7.8750, 2.1, 3.96, 2.03], [9.3750, 2.02, 3.88, 2.07],
    [10.6750, 1.94, 3.74, 2.16],
    // engine compartment (WP1): cowl flares over the O-235 cylinders and wraps the wing roots; open exit annulus aft
    [11.2750, 2.56, 3.78, 2.18], [11.6250, 2.84, 3.78, 2.20], [12.0750, 2.84, 3.78, 2.22], [13.2750, 2.86, 3.72, 2.26], [13.8750, 2.40, 3.58, 2.38], [14.2250, 1.60, 3.36, 2.60],
  ],
  canopy: [3.35, 8.7000],   // re-layout 2026-11-20 (canopy refit): aft edge FS 104.4, the aft bow closing on the rear seat bulkhead (the turtleback face)
  F22: 22 / 12, F28: 28 / 12, firewall: 10.6250, // the firewall is bonded to the CS spar aft face (csSpar.s + width/2), as on the Long-EZ
  // strake / wing / cowl junction: the strake ends at the CS spar aft face (= firewall); the outer wing panel's root rib sits at
  // join.y with a gap to the strake end rib; aft of the spar the wing root runs inboard to the cowl side (the inboard 'jut-out')
  join: { y: 3.75, gap: 0.15 / 12, cowlGap: 0.12 / 12, filletR: 0.75 / 12 },
  // one-piece main gear bow: straight centre section under the fuselage belly between the two mounts,
  // legs curving down to the axles. Each mount: UNI tab glassed onto the bow carrying a 5/8 in steel tube;
  // AN6 bolts run fore-aft through aluminium extrusions floxed into the fuselage bottom corners.
  gear: { s: 110.5 / 12, track: 7.4, rootY: 0.72, mountY: 0.72, rootZ: 1.93, axleZ: 0.54, /* static loaded radius of the 5.00-5 at the static main load (wp10) */ w: [4.5, 3.5], taper: 0.52, T0: [2.0, -0.55],
    // leg end (LEZ-32-170 rev A): vertical, its outboard face at BL ±39.9 inboard of the brake stack, ending at WL 4.75 below the axle so the axle flange bolts laterally through it
    p1: [39.15 / 12, 4.75 / 12] /* integration 2026-11-19 (ICD A-M3): leg end 0.10 in inboard (was 39.25) so the thicker sourced-ply leg end and its over-wrap stay inboard of the BL 39.9 brake-stack face */, T1: [0, -4.0],
    // hard-point pads (LEZ-53-150 F-D1 / F-D4 / F-D5) on the belly, centred under the attach-angle flanges of LEZ-32-120 (DESIGN; the -120 record checks the flanges land on them)
    padY: 8.0 / 12,
    tubeD: 0.625, tabL: 2.5, boltD: 0.375, boltsPerSide: 2, extrusionBond: 4.5 },
  strake: { frontS: 4.3250, rootY: 1.05, outY: 3.75, zOff: 0, thick0: 1.15, ribs: [1.10, 2.40, 3.70] },   // ribs reset below: root rib on the fuselage side, end rib at the joint gap
  wingletLow: { h: 0.95, c: [2.3, 0.9], tc: 0.09 },   // root chord = the wing tip chord: the fin root covers the whole tip face (LEZ-57-130)
  cowl: { s0: 10.6250, s1: 14.2250 },   // trailing edge at the end of the OML table (block G, ICD G-F8)
  prop: { s: 14.3250, z: 2.98, r: 2.375 },   // 57 in prop (block G LEZ-61-100, ICD G-F9; was 62 in)
  engine: { s: 12.2750, weight: 250, boltSpanZ: 1.2, boltD: 0.375, inertiaIp: 1.5, rpm: 2700 },
};
// the wing spar line meets the CS spar's centre line at the root joint (the LWA plates lie on it under the wing caps):
// constant fraction of chord, set from the root section
// block P (2026-11-19): the wing's HTS40 caps end short of the tip so no carbon lies inside the COM dipole's reactive near field
// (rf-keepout, parts/wpP1): the carbon plies that reach the end stop at cf, staggered inboard 1 in apart; 6781 glass tip caps
// (laid 0/90) run from g0 (lap in inboard of the last carbon drop) to the tip, sized in size() (wing tipG)
GEO.wing.glassTip = { cf: GEO.wing.tipY - 6 / 12, lap: 2.0, nMax: 4 };
GEO.wing.glassTip.g0 = GEO.wing.glassTip.cf - ((GEO.wing.glassTip.nMax - 1) * 1.0 + GEO.wing.glassTip.lap) / 12;
{ const g = GEO.wing, le = g.rootLE + (g.attachY - g.rootY) * Math.tan(g.sweepLE * Math.PI / 180), c = g.cr + (g.ct - g.cr) * (g.attachY - g.rootY) / (g.tipY - g.rootY);
  g.spar = +((GEO.csSpar.s - le) / c).toFixed(4); }
// the winglet stands outboard of the wing's tip face: its inboard face at the root (h = 0, the wing chord plane) clears the
// tip face by the bond line gapIn; y0 is the BL of the fin's mid-plane at the root (ft)
{ const g = GEO.winglet, ca = g.cant * D2R; let yt = 0; for (let i = 0; i <= 400; i++) { const x = i / 400; yt = Math.max(yt, 5 * g.tc * (0.2969 * Math.sqrt(x) - 0.126 * x - 0.3516 * x * x + 0.2843 * x ** 3 - 0.1015 * x ** 4)); }
  g.y0 = +(GEO.wing.tipY + g.gapIn / 12 + yt * g.cr * Math.cos(ca)).toFixed(5); }
// A1 (2026-11-21): the plans' overall length (OM dimensions table, 201.4 in, grade A) runs from the nose tip to the winglet /
// rudder trailing edge at the fin tip. The winglet LE sweep is derived so that TE = nose tip + 201.4 in; the wing planform
// is unchanged. The nose tip stays at FS 0 (user decision 2026-11-21; plans value not sourced, grade C), giving ≈ 27.2°
// (was 37°, which put the TE at FS 215.3). Change OVERALL.noseTipFS when a plans value is found and the fin follows.
export const OVERALL = { lenIn: 201.4, noseTipFS: 0, src: 'OM dimensions table (overall length 201.4 in); nose tip FS 0 by decision (2026-11-21)' };
{ const w = GEO.wing, g = GEO.winglet, tipLE = w.rootLE + (w.tipY - w.rootY) * Math.tan(w.sweepLE * D2R), te = (OVERALL.noseTipFS + OVERALL.lenIn) / 12;
  g.sweepLE = +(Math.atan((te - tipLE - 0.05 - g.ct) / g.h) / D2R).toFixed(4); }
export function fusAt(s) {
  const T = GEO.fuselage;
  for (let i = 0; i < T.length - 1; i++) if (s <= T[i + 1][0]) {
    const u = (s - T[i][0]) / (T[i + 1][0] - T[i][0]);
    return { w: lerp(T[i][1], T[i + 1][1], u), top: lerp(T[i][2], T[i + 1][2], u), bot: lerp(T[i][3], T[i + 1][3], u) };
  }
  const l = T[T.length - 1];
  return { w: l[1], top: l[2], bot: l[3] };
}
export function wingSec(y) {
  const g = GEO.wing, t = clamp((y - g.rootY) / (g.tipY - g.rootY), 0, 1);
  return { le: g.rootLE + (Math.max(y, g.rootY) - g.rootY) * Math.tan(g.sweepLE * D2R), c: lerp(g.cr, g.ct, t), z: g.z, tc: g.tc };
}
export function wingletSec(h) {
  const g = GEO.winglet, tip = wingSec(GEO.wing.tipY);
  return { le: tip.le + 0.05 + h * Math.tan(g.sweepLE * D2R), c: lerp(g.cr, g.ct, h / g.h), tc: g.tc };
}

// ------------------------------------------------------------------ design inputs and fixed layups
export const DEFAULT_DESIGN = {
  W: 1325, n1: 4.4, n2: -1.76, VC: 140, VD: 175, UdeC: 50, UdeD: 25, CLmax: 1.30, CLmaxNeg: -0.75,
  FS: 1.5, KD: 1.0, msTarget: 0.10, nLand: 3.0, env: 'ETW', bvid: true,
  aileronDeg: 15, elevDeg: 20, rudderDeg: 30 /* DC-005: 25 → 30° outward */, canardCLmax: 1.4, emergencyFwd: 9.0, thrust: 450,
};
export const FIXED = {
  skinBID: 2, webBID: 3, wingletWebBID: 2,
  csSpar: { webBID: 4 }, csWebMin: 3,   // csWebMin (block P): each CS spar web ≥ 3 plies 6781, for C's control pass-throughs (cs-ctl-holes, wpC1)
  // block P: on HT61 the shell's faces wrinkle far later than on FR-3703, so the 30-ply longerons and 6 belly plies re-size: 3 × 6781 0/90
  // longerons (fus-bend MS 0.23 with the 2 belly plies kept as a keel minimum, DESIGN)
  fuselage: { faceBID: 2, coreIn: 0.375, longeronPlies: 3, longeronW: 1.75, bottomUNI: 2 },
  F22: { faceBID: 3, coreIn: 0.375, doublerUNI: 4, boltD: 0.25 },
  strake: { faceBID: 2 /* block P: 2 × 6781 outside (was 3 × 7725; strake-tank MS 0.68) */, innerBID: 1, innerAngle: 0, coreIn: 0.375, core: 'PVC', ribBID: 2, fuelDensity: 6.0 / 231, testPsi: 2.0 },
  ctl: { skinBID: 2, hingeWebBID: 2, Ch: 0.5, rudderSkinBID: 1, rudderDblBID: 3, rudderXsp: 0.085 },   // DC-005 mass balance: the rudder carries 1 skin ply aft of 35 % (3-ply hinge doubler forward), cutting its static unbalance ≈ 30 %; its hinge web sits 8.5 % of its chord aft of the axis (≥ 0.47 in) so the hinge brackets' tongue ends clear it (DC-005 review 2)
  cowl: { BID: 4 },
  gearMount: { tabUNI: 12, padBID: 6, padsBID: 15 },
  attach: { boltD: 0.5, boltsPerCap: 3, doublerUNI: 4 },
  webCore: 'PVC',
  canardAttach: { nb: 2, an: 4 },   // set by the canard's attach sizing (parts/wp24_canard.js)
  belts: { insertD: 1.0, embed: 0.5, points: 4, occupant: 215 },
  overlap: { skinLE: 1.0, wingletSplice: 3.0, dropStagger: 1.0 },
};
{ const F = FIXED.strake, g = GEO.strake, tr = (F.coreIn + 2 * F.ribBID * BASE_MAT.BID.t) / 12; let yR = 0; for (let s = g.frontS; s <= GEO.csSpar.s; s += 0.05) yR = Math.max(yR, fusAt(s).w / 2); g.yRoot = +yR.toFixed(5);   // the root rib's face: the fuselage side at its widest under the strake
  const a = g.yRoot + tr / 2, b = GEO.join.y - GEO.join.gap - tr / 2; g.ribs = [0, 1, 2, 3].map((i) => +(a + (b - a) * i / 3).toFixed(5)); }   // rib centre lines: root rib, two baffles, end rib (LEZ-57-180)

// ------------------------------------------------------------------ mass breakdown, weight/CG cases
// Station frame: model FS = published Long-EZ FS + WB.datumIn (fitted to the published pilot, rear-seat and fuel arms;
// see WB). Payload arms are the published values moved into the model frame.
export const WB = {
  datumIn: 0,                                   // model FS = plans FS (re-layout 2026-11-20; was 20, a fit to the payload arms)
  cgLimPub: [97, 103],                          // published CG range, in (rear limit later changed from 104 to 103)
  trimS: 50 / 12,                               // station of the mass still to be defined (nose gear, battery, avionics, panel, canopy), ft
  src: 'Published Long-EZ W&B: pilot arm 59 in, rear seat 103 in, fuel 104 in, CG 97–103 in, main axles FS 110.5 (CanardZone, builder logs)',
};
export const cgLim = () => WB.cgLimPub.map((x) => (x + WB.datumIn) / 12); // ft, model frame
const pub = (inch) => (inch + WB.datumIn) / 12;
export const MASS_ITEMS = [
  ['pilot', 'Pilot', 200, pub(59)], ['pax', 'Passenger', 170, pub(103)], ['fuel', 'Fuel, 52 gal (strakes)', 312, pub(104)], ['bag', 'Baggage (rear seat / strakes)', 25, pub(103)],
  ['nosebag', 'Nose compartment', 0, 1.25], ['engine', 'Engine, prop, accessories', 290, 12.2750], ['nose', 'Avionics, nose gear (battery moved to elec)', 40, 2.3], ['elec', 'Electrical power', 0, 3.0],
  ['panel', 'Instruments & panel', 20, 3.5], ['fus', 'Fuselage, strakes, CS spar, firewall', 135, 7.4750], ['wings', 'Wings & winglets (2)', 74, 11.4750],
  ['canard', 'Canard & elevators', 18, 1.9], ['controls', 'Flight controls', 0, 4.8750], ['cabin', 'Canopy, seats, interior', 0, 4.8750], ['ballast', 'Fixed nose ballast', 0, 0.62], ['gear', 'Main gear & wheels', 26, 110.5 / 12],
];
/** structural weight cases sit on the CG envelope (forward, mid, aft limit). Fuel and an "unallocated forward mass"
 *  at WB.trimS are solved so each case lands on its CG; the unallocated mass is what the defined parts still lack. */
export const WEIGHT_CASES = [
  { id: 'W1', label: 'Gross, mid CG', set: {}, gross: true, cgPub: 100 },
  { id: 'W2', label: 'Gross, forward CG', set: { pilot: 240, pax: 130, bag: 0, nosebag: 25 }, gross: true, cgPub: 97 },
  { id: 'W3', label: 'Gross, aft CG', set: { pilot: 140, pax: 230 }, gross: true, cgPub: 103 },
  { id: 'W4', label: 'Light: solo pilot, 10 gal', set: { pilot: 170, pax: 0, fuel: 60, bag: 0 }, cgPub: 100 },
];
const PAYLOAD = ['pilot', 'pax', 'fuel', 'bag', 'nosebag'];
void PAYLOAD;
// mass model: the estimate list above until defined parts take items over (systems.js massRollup → setMassModel)
let MASS_MODEL = null;
export function setMassModel(items) { MASS_MODEL = items; }
export const massItems = () => MASS_MODEL || MASS_ITEMS;
// extra strength checks registered by system parts (interfaces, mounts, lines…): fn(d, lc, Z, M) → rows
const EXTRA_CHECKS = [];
export function registerChecks(key, fn) { const i = EXTRA_CHECKS.findIndex((e) => e.key === key); if (i >= 0) EXTRA_CHECKS[i].fn = fn; else EXTRA_CHECKS.push({ key, fn }); }
export function weightCase(d, wc) {
  const items = massItems().map(([id, name, w, s]) => ({ id, name, w: wc.set[id] ?? w, s }));
  const sum = (f) => items.reduce((a, m) => a + f(m), 0);
  let trim = 0, cgShort = 0;
  if (wc.cgPub != null) {
    const cgT = pub(wc.cgPub), sT = WB.trimS, fuel = items.find((i) => i.id === 'fuel'), fuelMax = 312;
    if (wc.gross) { // fuel and trim mass fill the case to gross weight at the target CG
      const o = items.filter((i) => i !== fuel), Wo = o.reduce((a, m) => a + m.w, 0), Mo = o.reduce((a, m) => a + m.w * m.s, 0);
      trim = (d.W * cgT - Mo - (d.W - Wo) * fuel.s) / (sT - fuel.s);
      fuel.w = d.W - Wo - Math.max(trim, 0);
      if (fuel.w > fuelMax) fuel.w = fuelMax;
      if (fuel.w < 0) fuel.w = 0;
      if (trim < 0) trim = 0; else trim = (cgT * (Wo + fuel.w) - (Mo + fuel.w * fuel.s)) / (sT - cgT);
      trim = Math.max(trim, 0);
    } else {
      const W0 = sum((m) => m.w), M0 = sum((m) => m.w * m.s);
      trim = Math.max(0, (W0 * cgT - M0) / (sT - cgT));
    }
    if (trim > 0) items.push({ id: 'trim', name: 'Loading adjustment to reach the case CG', w: trim, s: WB.trimS });
    const W1 = sum((m) => m.w), cg1 = sum((m) => m.w * m.s) / W1;
    cgShort = (cg1 - cgT) * 12;
  }
  const W = sum((m) => m.w), cg = sum((m) => m.w * m.s) / W;
  return { ...wc, items, W, cg, trim, cgShort };
}

// ------------------------------------------------------------------ aircraft aero and envelope (per weight case)
let _acW = null;
function wingSystemAC() {
  if (_acW) return _acW;
  let num = 0, den = 0;
  for (let y = 0; y <= GEO.wing.tipY; y += 0.05) {
    const s = wingSec(y);
    num += (s.le + 0.25 * s.c) * s.c; den += s.c;
    if (y > GEO.wing.rootY && y < GEO.wing.attachY) {
      const u = (y - GEO.wing.rootY) / (GEO.wing.attachY - GEO.wing.rootY);
      const sle = lerp(6.45, s.le, Math.pow(u, 0.85)), sc = s.le - sle;
      num += (sle + 0.25 * sc) * sc * 0.6; den += sc * 0.6;
    }
  }
  _acW = num / den;
  return _acW;
}
export function aircraft(d, wcIn) {
  const wc = wcIn.items ? wcIn : weightCase(d, wcIn);
  const Sw = 81.99, Sc = 12.8, S = Sw + Sc, b = 26.08, W = wc.W;
  const ac = wingSystemAC(), acC = GEO.canard.le + 0.25 * GEO.canard.c;
  const shareC = (ac - wc.cg) / (ac - acC);
  const AR = b * b / Sw, a = 2 * Math.PI * AR / (2 + Math.sqrt(AR * AR + 4));
  const mac = 3.29, WS = W / S, mu = 2 * WS / (RHO0 * mac * a * G), Kg = 0.88 * mu / (5.3 + mu);
  const Vs = Math.sqrt(2 * W / (RHO0 * S * d.CLmax)) / KT, VsNeg = Math.sqrt(2 * W / (RHO0 * S * -d.CLmaxNeg)) / KT;
  return { wc, S, Sw, Sc, b, W, cg: wc.cg, ac, acC, shareC, AR, a, Kg, mu, WS, Vs, VsNeg, VA: Vs * Math.sqrt(d.n1), gust: (V, Ude) => Kg * Ude * V * a / (498 * WS) };
}
const udeAt = (d, V) => (V <= d.VC ? d.UdeC : lerp(d.UdeC, d.UdeD, (V - d.VC) / (d.VD - d.VC)));
export function envelope(d, wc = WEIGHT_CASES[0]) {
  const ac = aircraft(d, wc);
  const nPos = (V) => Math.min(Math.max(d.n1, 1 + ac.gust(V, udeAt(d, V))), (V / ac.Vs) ** 2);
  const nNegLim = (V) => (V <= d.VC ? d.n2 : lerp(d.n2, 0, (V - d.VC) / (d.VD - d.VC)));
  const nNeg = (V) => Math.max(Math.min(nNegLim(V), 1 - ac.gust(V, udeAt(d, V))), -((V / ac.VsNeg) ** 2));
  const top = [], bot = [];
  for (let V = 0; V <= d.VD + 1e-6; V += d.VD / 160) { top.push([V, nPos(V)]); bot.push([V, nNeg(V)]); }
  const corners = [
    ['S1', 'VA, +n manoeuvre', ac.VA, d.n1], ['S2', 'VC, +gust / +n', d.VC, nPos(d.VC)], ['S3', 'VD, +n', d.VD, nPos(d.VD)],
    ['S4', 'VC, −gust / −n', d.VC, nNeg(d.VC)], ['S5', 'VD, −n', d.VD, nNeg(d.VD)],
  ];
  return { ac, top, bot, nPos, nNeg, corners, nMax: Math.max(...top.map((p) => p[1])), nMin: Math.min(...bot.map((p) => p[1])) };
}

// ------------------------------------------------------------------ load cases
export function loadCases(d) {
  const out = [];
  for (const wc0 of WEIGHT_CASES) {
    const env = envelope(d, wc0), ac = env.ac;
    for (const [id, label, V, n] of env.corners) out.push({ id: `${wc0.id}-${id}`, wc: wc0.id, type: 'sym', label: `${wc0.label} · ${label}`, short: label, V, n, ac });
    const nr = (2 / 3) * d.n1;
    out.push({ id: `${wc0.id}-R1`, wc: wc0.id, type: 'roll', label: `${wc0.label} · Rolling pull-out at VA, full aileron`, short: 'Roll, VA', V: ac.VA, n: nr, aileron: d.aileronDeg, ac });
    out.push({ id: `${wc0.id}-R2`, wc: wc0.id, type: 'roll', label: `${wc0.label} · Rolling pull-out at VC, ⅓ aileron`, short: 'Roll, VC', V: d.VC, n: nr, aileron: d.aileronDeg / 3, ac });
    out.push({ id: `${wc0.id}-P1`, wc: wc0.id, type: 'canard', label: `${wc0.label} · Abrupt pitch-up at VA (canard at CLmax, full elevator)`, short: 'Pitch-up, VA', V: ac.VA, n: d.n1, elev: d.elevDeg, ac });
    if (wc0.id === 'W1' || wc0.id === 'W4') {
      // wl: the sign of the winglet's root moment as the wing tip feels it (+1: winglet load inboard, tip-up on the wing).
      // A side gust loads one winglet inboard and the other outboard, so each gust case appears for both wings.
      out.push({ id: `${wc0.id}-Y1`, wc: wc0.id, type: 'rudder', label: `${wc0.label} · Full outward rudder at VA`, short: 'Rudder, VA', V: ac.VA, n: 1, rudder: d.rudderDeg, wl: 1, ac });
      out.push({ id: `${wc0.id}-Y2`, wc: wc0.id, type: 'lateral', label: `${wc0.label} · Lateral gust at VC`, short: 'Lat. gust, VC', V: d.VC, n: 1, wl: 1, ac });
      out.push({ id: `${wc0.id}-Y3`, wc: wc0.id, type: 'lateral', label: `${wc0.label} · Lateral gust at VD`, short: 'Lat. gust, VD', V: d.VD, n: 1, wl: 1, ac });
      out.push({ id: `${wc0.id}-Y4`, wc: wc0.id, type: 'lateral', label: `${wc0.label} · Lateral gust at VC, the other wing (winglet load outboard)`, short: 'Lat. gust, VC, other wing', V: d.VC, n: 1, wl: -1, ac });
      out.push({ id: `${wc0.id}-Y5`, wc: wc0.id, type: 'lateral', label: `${wc0.label} · Lateral gust at VD, the other wing (winglet load outboard)`, short: 'Lat. gust, VD, other wing', V: d.VD, n: 1, wl: -1, ac });
    }
  }
  const ac1 = aircraft(d, WEIGHT_CASES[0]);
  out.push({ id: 'G1', wc: 'W1', type: 'ground', ground: 'level', label: `Ground · Level landing, ${d.nLand} g (wing lift ⅔ W)`, short: 'Level landing', V: 0, n: d.nLand, ac: ac1 });
  out.push({ id: 'G2', wc: 'W1', type: 'ground', ground: 'side', label: 'Ground · Side load (1.33 g vertical, 0.33 W outward)', short: 'Side load', V: 0, n: 1.33, ac: ac1 });
  out.push({ id: 'G3', wc: 'W1', type: 'ground', ground: 'braked', label: 'Ground · Braked roll (1.33 g, drag 0.8 × vertical)', short: 'Braked roll', V: 0, n: 1.33, ac: ac1 });
  out.push({ id: 'E1', wc: 'W1', type: 'emergency', label: `Emergency landing · ${d.emergencyFwd} g forward (ultimate)`, short: 'Emergency fwd', V: 0, n: d.emergencyFwd, ac: ac1 });
  return out;
}

// ------------------------------------------------------------------ spanwise aero loads
function schrenk(semi, chordAt, N = 200) {
  const ys = [], ls = [];
  let area = 0;
  for (let i = 0; i <= N; i++) { const y = semi * i / N; ys.push(y); area += chordAt(y) * semi / N; }
  const cE = (y) => (4 * area / (Math.PI * semi)) * Math.sqrt(Math.max(0, 1 - (y / semi) ** 2));
  let tot = 0;
  for (const y of ys) { const l = 0.5 * (chordAt(y) + cE(y)); ls.push(l); tot += l * semi / N; }
  return { ys, ls: ls.map((l) => l / tot), dy: semi / N };
}
const SCH = {
  wing: schrenk(GEO.wing.tipY, (y) => wingSec(Math.max(y, GEO.wing.rootY)).c),
  canard: schrenk(GEO.canard.semi, () => GEO.canard.c),
  winglet: schrenk(GEO.winglet.h, (h) => wingletSec(h).c),
};
const at = (sch, y) => sch.ls[clamp(Math.round(y / sch.dy), 0, sch.ls.length - 1)];
// thin-airfoil flap: hinge at x = c(1 − E) ⇒ cos θ_h = 2E − 1 (Glauert); C_Lδ = 2(π − θ_h + sin θ_h), C_Mδ(c/4) = −½ sin θ_h (1 − cos θ_h).
// Fixed 2026-11-21: was θ = acos(1 − 2E), the supplement, which overstated C_Lδ (E 0.30: τ 0.92 vs 0.66) and understated C_Mδ ≈ 2.3×.
export function flap(E) { const th = Math.acos(2 * E - 1); return { CLd: 2 * (Math.PI - th + Math.sin(th)), CMd: -0.5 * Math.sin(th) * (1 - Math.cos(th)) }; }

const MASSES_STRUCT = { wingPanel: 37, canard: 18 };
function wingPanelArea() { let a = 0; for (let y = GEO.wing.attachY; y <= GEO.wing.tipY; y += 0.05) a += wingSec(y).c * 0.05; return a; }
const WPA = wingPanelArea();

/** distributed lift (net of inertia, lb/ft) and torque (lb·ft/ft about the spar line) for a surface in a case */
function surfaceLoading(kind, d, lc) {
  const q = 0.5 * RHO0 * (lc.V * KT) ** 2, ac = lc.ac;
  if (kind === 'wing') {
    const g = GEO.wing, semi = (1 - ac.shareC) * ac.W / 2 * lc.n;
    const f = flap(g.aileronCf), a3 = ac.a / (2 * Math.PI), dA = (lc.aileron || 0) * D2R;
    const inAil = (y) => dA && y >= g.aileron[0] && y <= g.aileron[1];
    return {
      q,
      lift: (y) => {
        let l = at(SCH.wing, y) * semi;
        if (inAil(y)) l += q * wingSec(y).c * f.CLd * a3 * dA;
        return l - (y > g.attachY ? MASSES_STRUCT.wingPanel * wingSec(y).c / WPA * lc.n : 0);
      },
      torque: (y) => {
        const s = wingSec(y);
        let t = q * s.c * s.c * -0.06 + at(SCH.wing, y) * semi * (g.spar - 0.25) * s.c;
        if (inAil(y)) t += q * s.c * s.c * f.CMd * a3 * dA;
        return t;
      },
    };
  }
  if (kind === 'canard') {
    const g = GEO.canard;
    let semi = ac.shareC * ac.W / 2 * lc.n;
    if (lc.type === 'canard') semi = Math.max(semi, q * ac.Sc * d.canardCLmax / 2);
    const f = flap(g.elevCf), dE = (lc.elev || 0) * D2R;
    return {
      q,
      lift: (y) => at(SCH.canard, y) * semi - MASSES_STRUCT.canard / 2 / g.semi * lc.n,
      torque: (y) => {
        let t = q * g.c * g.c * -0.06 + at(SCH.canard, y) * semi * (g.spar - 0.25) * g.c;
        if (dE && y >= g.elevator[0] && y <= g.elevator[1]) t += q * g.c * g.c * f.CMd * dE;
        return t;
      },
    };
  }
  const g = GEO.winglet, S = 8.6, av = 2.4;
  let L = 0;
  if (lc.type === 'lateral') L = q * S * av * Math.min(udeAt(d, lc.V) / Math.max(lc.V * KT, 1), 0.3) * 0.8;
  if (lc.type === 'rudder') { const f = flap(g.rudderCf); L = q * S * rudderKb() * f.CLd * (av / (2 * Math.PI)) * lc.rudder * D2R; }
  return { q, lift: (h) => at(SCH.winglet, h) * L, torque: () => 0 };
}
function integrate(semi, lift, torque, sweep, N = 120) {
  const ys = [], V = [], M = [], T = [], dy = semi / N;
  for (let i = 0; i <= N; i++) ys.push(dy * i);
  V[N] = 0; M[N] = 0; T[N] = 0;
  for (let i = N - 1; i >= 0; i--) {
    const ym = ys[i] + dy / 2, q = lift(ym) * dy;
    V[i] = V[i + 1] + q; M[i] = M[i + 1] + V[i + 1] * dy + q * dy / 2; T[i] = T[i + 1] + torque(ym) * dy;
  }
  const cs = Math.cos(sweep);
  return { at: (y) => { const k = clamp(Math.round(y / dy), 0, N); return { V: V[k], M: M[k] * FT / cs, Mx: M[k] * FT, T: T[k] * FT }; } };
}
/** rudder span factor: the share of the fin's (Schrenk) lift over the rudder's span, scaled so the original rudder
 *  (h 0.25–3.0 ft, share 0.648) keeps the 0.55 the model always used (2026-11-21: was a constant, so a taller rudder got no credit) */
export function rudderKb(span = GEO.winglet.rudder) {
  const g = GEO.winglet, N = 400, H = g.h; let area = 0; for (let i = 0; i < N; i++) area += wingletSec((i + 0.5) / N * H).c * H / N;
  const l = (h) => 0.5 * (wingletSec(h).c + 4 * area / (Math.PI * H) * Math.sqrt(Math.max(0, 1 - (h / H) ** 2)));
  const share = (a, b) => { let num = 0, tot = 0; for (let i = 0; i < N; i++) { const h = (i + 0.5) / N * H, v = l(h); tot += v; if (h >= a && h <= b) num += v; } return num / tot; };
  return 0.55 * share(span[0], span[1]) / share(0.25, 3.0);
}
export function surfaceGeom(kind) {
  if (kind === 'wing') {
    const g = GEO.wing;
    return {
      y0: g.attachY, y1: g.tipY, semi: g.tipY, sweep: Math.atan(Math.tan(g.sweepLE * D2R) + g.spar * (g.ct - g.cr) / (g.tipY - g.rootY)),
      sec: (y) => { const s = wingSec(y); return { c: s.c, h: s.tc * s.c * FT, b: lerp(g.cap[0], g.cap[1], (y - g.attachY) / (g.tipY - g.attachY)), xsp: g.spar, tc: g.tc }; },
      label: 'BL', core: 'XPS', capCore: 'PVC',   // the caps lie on an HT61 cap bed (LEZ-57-110, wp17 W_BED); since block P the whole core is HT61
    };
  }
  if (kind === 'canard') {
    const g = GEO.canard;
    return { y0: 0, y1: g.semi, semi: g.semi, sweep: 0, sec: (y) => ({ c: g.c, h: g.tc * g.c * FT, b: lerp(g.cap[0], g.cap[1], y / g.semi), xsp: g.spar, tc: g.tc }), label: 'BL', core: 'PVC' };
  }
  const g = GEO.winglet;
  return {
    y0: 0, y1: g.h, semi: g.h, sweep: Math.atan(Math.tan(g.sweepLE * D2R) + g.spar * (g.ct - g.cr) / g.h),
    sec: (h) => { const s = wingletSec(h); return { c: s.c, h: s.tc * s.c * FT, b: lerp(g.cap[0], g.cap[1], h / g.h), xsp: g.spar, tc: g.tc }; },
    label: 'h', core: 'PVC', glass: true,   // all glass (block P): the COM dipole is in the right fin; the caps are 6781 laid 0/90
  };
}
const GM = { wing: surfaceGeom('wing'), canard: surfaceGeom('canard'), winglet: surfaceGeom('winglet') };
const loadCache = new WeakMap();
export function surfaceLoads(kind, d, lc) {
  if (kind === 'winglet' && !['lateral', 'rudder'].includes(lc.type)) return null;
  const yaw = ['lateral', 'rudder'].includes(lc.type);
  if (kind !== 'winglet' && !(kind === 'wing' && yaw) && ['lateral', 'rudder', 'ground', 'emergency'].includes(lc.type)) return null;
  let c = loadCache.get(lc);
  if (!c) { c = {}; loadCache.set(lc, c); }
  const key = `${kind}|${d.W}|${d.canardCLmax}|${d.UdeC}|${d.UdeD}|${d.VC}|${d.VD}|${d.rudderDeg}`;
  if (c[key]) return c[key];
  const L = surfaceLoading(kind, d, lc), gm = GM[kind], base = integrate(gm.semi, L.lift, L.torque, gm.sweep);
  if (kind === 'wing' && yaw) {   // the wing at its 1 g share, plus the winglet's root moment about its root chord as a tip moment (all of it taken in bending)
    const Mwl = (lc.wl ?? 1) * Math.abs(surfaceLoads('winglet', d, lc).at(0).Mx);   // the couple about the root chord (FS axis)
    return (c[key] = { at: (y) => { const r = base.at(y); return { ...r, M: r.M + Mwl, Mx: r.Mx + Mwl }; }, q: L.q, loading: L, tipM: Mwl });
  }
  return (c[key] = { ...base, q: L.q, loading: L });
}

// cap allowable: min(fibre strength, strain at which the ±45 BID skin wrinkles on the foam)
const CAPC = new WeakMap();
export function capAllowable(M, skinPlies, core, compression) {
  let c = CAPC.get(M);
  if (!c) { c = new Map(); CAPC.set(M, c); }
  const key = `${skinPlies}|${core}|${compression}`;
  if (!c.has(key)) c.set(key, capAllowableRaw(M, skinPlies, core, compression));
  return c.get(key);
}
function capAllowableRaw(M, skinPlies, core, compression) {
  const skin = laminate(bid(skinPlies), M);
  const sWr = wrinkling(skin.Ex, core, M), epsWr = sWr / skin.Ex, E1 = psi(M.UNI.E1);
  if (!compression) return { allow: psi(M.UNI.Xt), mode: 'cap tension (fibre)', epsWr, sWr, Eskin: skin.Ex };
  const sStrain = E1 * epsWr * M._bv;
  return sStrain < psi(M.UNI.Xc)
    ? { allow: sStrain, mode: `skin wrinkling on ${core} (strain-limited${M._bv < 1 ? ', BVID' : ''})`, epsWr: epsWr * M._bv, sWr, Eskin: skin.Ex }
    : { allow: psi(M.UNI.Xc), mode: 'cap compression (fibre)', epsWr, sWr, Eskin: skin.Ex };
}
const capArea = (n, b, M) => n * M.UNI.t * b;
const dEff = (s, nU, nL, M) => s.h - 2 * FIXED.skinBID * M.BID.t - (nU + nL) * M.UNI.t / 2;
export const plyCount = (sched, y) => sched.filter((p) => y <= p.y1 + 1e-9).length;
/** the wing's glass tip caps (block P): 6781 0/90 plies per cap from g0 to the tip, each cap sized alone (the carbon in the splice
 *  zone ignored, conservative) to the sizing reserve on every case */
function sizeGlassTip(gm, d, cases, M0, T) {
  const MG = glassM(M0), CC = gm.capCore || gm.core, comp = capAllowable(MG, FIXED.skinBID, CC, true), tens = capAllowable(MG, FIXED.skinBID, CC, false), n = { upper: 2, lower: 2 };
  for (let it = 0; it < 200; it++) { let bumped = false;
    for (const lc of cases) { const L = surfaceLoads('wing', d, lc); if (!L) continue;
      for (let y = T.g0; y <= gm.y1 + 1e-9; y += 0.02) { const s = gm.sec(y), r = L.at(y), Mu = Math.abs(r.M) * d.FS, pos = r.M >= 0, dd = dEff(s, n.upper, n.lower, MG);
        const [kc, kt] = pos ? ['upper', 'lower'] : ['lower', 'upper'];
        if (comp.allow / (Mu / (dd * capArea(n[kc], s.b, MG))) - 1 < d.msTarget) { n[kc] += 1; bumped = true; }
        if (tens.allow / (Mu / (dd * capArea(n[kt], s.b, MG))) - 1 < d.msTarget) { n[kt] += 1; bumped = true; } } }
    if (!bumped) break; }
  return { ...n, g0: T.g0, cf: T.cf, lap: T.lap, comp, tens };
}
/** cap plies and the cap material at span station y: the glass tip caps on the wing past g0, else the schedule (block P) */
export function capAt(sz, y, M) {
  if (sz.tipG && y > sz.tipG.g0 + 1e-9) return { nu: sz.tipG.upper, nl: sz.tipG.lower, M: glassM(M), glass: true };
  return { nu: plyCount(sz.upper, y), nl: plyCount(sz.lower, y), M, glass: false };
}

// ------------------------------------------------------------------ sizing (spar caps, CS spar, gear)
/** the first station (ft) at which a lifting surface's cap plies may drop off, set by a root joint (parts/wp13) */
export const DROP_FROM = {};
/** the least cap ply count a lifting surface carries at its root, set by a root joint (parts/wp13: the plies that fill the
 *  room over the LWA plate, so the plate lies at the pin depth); the extra plies drop off past DROP_FROM */
export const ROOT_MIN = {};
export function size(d) {
  const M = materials(d), cases = loadCases(d), out = { M };
  for (const kind of ['wing', 'canard', 'winglet']) {
    const gm = GM[kind], N = 60, ys = Array.from({ length: N + 1 }, (_, i) => lerp(gm.y0, gm.y1, i / N)), M = gm.glass ? glassM(out.M) : out.M;
    const comp = capAllowable(M, FIXED.skinBID, gm.capCore || gm.core, true), tens = capAllowable(M, FIXED.skinBID, gm.capCore || gm.core, false);
    const TIPG = kind === 'wing' ? GEO.wing.glassTip : null;
    const req = { upper: ys.map(() => 3), lower: ys.map(() => 3) };
    if (TIPG) ys.forEach((y, i) => { if (y > TIPG.g0 + 1e-9) req.upper[i] = req.lower[i] = 0; });
    for (const lc of cases) {
      const L = surfaceLoads(kind, d, lc);
      if (!L) continue;
      ys.forEach((y, i) => {
        if (TIPG && y > TIPG.g0 + 1e-9) return;   // glass tip zone: sized below
        const s = gm.sec(y), Mu = Math.abs(L.at(y).M) * d.FS * (1 + d.msTarget);
        const nFor = (allow) => { let k = 2; while (k < 300 && Mu / (dEff(s, k, k, M) * capArea(k, s.b, M)) > allow) k++; return k; };
        if (kind === 'winglet') { const k = nFor(comp.allow); req.upper[i] = Math.max(req.upper[i], k); req.lower[i] = Math.max(req.lower[i], k); return; }
        const pos = L.at(y).M >= 0;
        req.upper[i] = Math.max(req.upper[i], nFor(pos ? comp.allow : tens.allow));
        req.lower[i] = Math.max(req.lower[i], nFor(pos ? tens.allow : comp.allow));
      });
    }
    if (ROOT_MIN[kind]) for (const k of ['upper', 'lower']) req[k][0] = Math.max(req[k][0], ROOT_MIN[kind]);
    const st = FIXED.overlap.dropStagger / 12;
    const sched = (arr) => {
      const nMax = Math.max(...arr), plies = [];
      for (let k = 1; k <= nMax; k++) {
        let last = 0;
        for (let i = 0; i < arr.length; i++) if (arr[i] >= k) last = i;
        plies.push({ k, y0: gm.y0, y1: last === arr.length - 1 ? gm.y1 : Math.min(gm.y1, ys[last] + (ys[1] - ys[0]) + st) });
      }
      if (DROP_FROM[kind]) for (const p of plies) if (p.y1 < gm.y1 - 1e-9) p.y1 = Math.max(p.y1, DROP_FROM[kind]);   // no drop-off inside a root joint
      plies.sort((a, b) => a.y1 - b.y1);
      for (let i = 1; i < plies.length; i++) if (plies[i].y1 < gm.y1 - 1e-9 && plies[i].y1 - plies[i - 1].y1 < st) plies[i].y1 = Math.min(gm.y1, plies[i - 1].y1 + st);
      if (TIPG) { const far = plies.filter((p) => p.y1 > TIPG.g0 + 1e-9).sort((a, b) => b.y1 - a.y1);   // carbon past the glass zone's start
        if (far.length > TIPG.nMax) throw new Error(`wing: ${far.length} carbon cap plies reach the glass tip zone (≤ ${TIPG.nMax})`);
        far.forEach((p, j) => { p.y1 = TIPG.cf - j * st; }); plies.sort((a, b) => a.y1 - b.y1); }
      return plies;
    };
    // verify on the schedule itself: the check takes the actual opposite-cap count (lever arm) and the staggered ply ends,
    // so bump the stations where a cap falls short of the sizing reserve (2026-11-19, thinner 7715 plies)
    let up = sched(req.upper), lo = sched(req.lower);
    for (let it = 0; it < 40; it++) {
      let bumped = false;
      for (const lc of cases) {
        const L = surfaceLoads(kind, d, lc); if (!L) continue;
        ys.forEach((y, i) => {
          if (TIPG && y > TIPG.g0 + 1e-9) return;
          const s = gm.sec(y), r = L.at(y), nu = plyCount(up, y), nl = plyCount(lo, y), dd = dEff(s, nu, nl, M), Mu = Math.abs(r.M) * d.FS, pos = r.M >= 0 || kind === 'winglet';
          const msOf = (n, allow) => allow / (Mu / (dd * capArea(n, s.b, M))) - 1;
          const [kc, kt] = pos ? ['upper', 'lower'] : ['lower', 'upper'], nc = pos ? nu : nl, nt = pos ? nl : nu;
          if (msOf(nc, comp.allow) < d.msTarget) { req[kc][i] += 1; bumped = true; }
          if (kind !== 'winglet' && msOf(nt, tens.allow) < d.msTarget) { req[kt][i] += 1; bumped = true; }
          if (kind === 'winglet') req.lower[i] = req.upper[i] = Math.max(req.upper[i], req.lower[i]);
        });
      }
      if (!bumped) break;
      up = sched(req.upper); lo = sched(req.lower);
    }
    out[kind] = { kind, gm, ys, req, upper: up, lower: lo, comp, tens, web: 2 };
    if (TIPG) out[kind].tipG = sizeGlassTip(gm, d, cases, out.M, TIPG);
  }
  out.attachBID = 4; out.csWeb = 2; out.fwPlies = 6; out.f22Dbl = 4;
  // CS spar caps (2026-11-19, asymmetric): the upper cap is sized in compression for +g, the lower cap for −g compression and
  // +g tension; each failing cap gets a ply until both hold the reserve
  out.csCap = 4; out.csCapL = Math.max(4, FIXED.csCapLMin || 0);   // csCapLMin: the lower plies the end joint's build-ups cannot supply (wp15)
  for (let it = 0; it < 600; it++) {
    let bump = null;
    for (const lc of cases) for (const c of csSparCheck(d, lc, out, M)) if (c.id === 'cs-cap') for (const [side, ms] of c.trace.capMS) if (ms < d.msTarget) bump = bump || side;
    if (!bump) break;
    if (bump === 'upper') out.csCap += 1; else out.csCapL += 1;
  }
  // webs and hard-point doublers: scale ply counts from the current reserve, then re-check
  const keyOf = { 'wing-web': ['wing', 'web'], 'wing-webbuck': ['wing', 'web'], 'canard-web': ['canard', 'web'], 'canard-webbuck': ['canard', 'web'],
    'winglet-web': ['winglet', 'web'], 'winglet-webbuck': ['winglet', 'web'], 'cs-web': [null, 'csWeb'], 'cs-webbuck': [null, 'csWeb'],
    'fus-engine': [null, 'fwPlies'], 'f22-bearing': [null, 'f22Dbl'] };
  for (let it = 0; it < 8; it++) {
    const need = {};
    for (const lc of cases) {
      const rows = [...liftingChecks('wing', d, lc, out, M, true), ...liftingChecks('canard', d, lc, out, M, true), ...liftingChecks('winglet', d, lc, out, M, true), ...csSparCheck(d, lc, out, M), ...fuselageChecks(d, lc, out, M, true), ...F22Checks(d, lc, out, M)];
      for (const r of rows) {
        const k = keyOf[r.id];
        if (!k) continue;
        const tag = `${k[0]}|${k[1]}`, cur = k[0] ? out[k[0]][k[1]] : out[k[1]];
        let want;
        if (r.trace && r.trace.tSize) { // bearing: extra thickness goes into BID doubler plies
          const tReq = r.trace.tSize * (1 + d.msTarget) / Math.max(1 + r.ms, 0.02);
          want = Math.max(2, cur + Math.ceil((tReq - r.trace.tSize) / M.BID.t - 1e-9));
        } else want = Math.max(2, Math.ceil(cur * (1 + d.msTarget) / Math.max(1 + r.ms, 0.02) - 1e-9));
        if (r.ms < d.msTarget) want = Math.max(want, cur + 1);
        need[tag] = Math.max(need[tag] || 0, want);
      }
    }
    let changed = false;
    for (const [tag, v] of Object.entries(need)) {
      const [a, b] = tag.split('|');
      const obj = a !== 'null' ? out[a] : out;
      if (obj[b] !== v) { obj[b] = v; changed = true; }
    }
    if (!changed) break;
  }
  if (FIXED.csWebMin) out.csWeb = Math.max(out.csWeb, FIXED.csWebMin);   // block P: the control pass-throughs need a third web ply (cs-ctl-holes)
  out.gearPlies = 60;
  const ground = cases.filter((c) => c.type === 'ground');
  for (let k = FIXED.gearPliesMin || 60; k < 400; k++) { out.gearPlies = k; if (ground.every((lc) => gearChecks(d, lc, out, M).every((c) => !['gear-bend', 'gear-ils', 'gear-prop'].includes(c.id) || c.ms >= d.msTarget))) break; }
  return out;
}

// ------------------------------------------------------------------ check helpers
export function mk(part, id, name, lc, where, mode, ms, trace) {
  return { part, id, name, case: lc.id, caseLabel: lc.label, short: lc.short, V: lc.V, n: lc.n, where, mode, ms, trace };
}
const I = (name, v, unit, src = 'DERIVED') => [name, v, unit, src];
// laminate strength inputs: NCAMP MTM45-1 MH values × kB (0.72, M cycle); for a strength-governed check the margin scales with kB
export const allowB = (ms, what = 'strength') => `BOUND: NCAMP MTM45-1 MH ${what} × ${MATSYS.kB} (mean × 0.8 × 0.9, M cycle), ETW 200 °F; MS stays ≥ 0 down to × ${(MATSYS.kB / (1 + ms)).toFixed(2)}`;
const PLY_T = (m) => `MATSYS: NCAMP cured ply thickness, ${BASE_MAT[m].label} (${BASE_MAT[m].t} in)`;

function liftingChecks(kind, d, lc, Z, M, quick = false) {
  const L = surfaceLoads(kind, d, lc);
  if (!L) return [];
  const sz = Z[kind], gm = sz.gm, P = { wing: 'Wing', canard: 'Canard', winglet: 'Winglet' }[kind];
  if (gm.glass) M = glassM(M);
  const CC = gm.capCore || gm.core, CA = { comp: capAllowable(M, FIXED.skinBID, CC, true), tens: capAllowable(M, FIXED.skinBID, CC, false) };
  const webStack = bid(sz.web), webL = laminate(webStack, M), tauWr = wrinkling(psi(M.BID.E1), FIXED.webCore, M) * 0.8;
  let wc = null, ww = null, wb = null, wsk = null, wd = null;
  const CAG = sz.tipG ? { comp: sz.tipG.comp, tens: sz.tipG.tens } : null;   // the wing's glass tip caps (block P)
  for (let i = 0; i < sz.ys.length - 1; i += 2) {
    const y = sz.ys[i], s = gm.sec(y), r = L.at(y);
    const ca = capAt(sz, y, M), MC = ca.M, CX = ca.glass ? CAG : CA, nu = ca.nu, nl = ca.nl, dd = dEff(s, nu, nl, MC);
    const Mu = Math.abs(r.M) * d.FS, pos = r.M >= 0 || kind === 'winglet', nc = pos ? nu : nl, nt = pos ? nl : nu;
    const sC = Mu / (dd * capArea(nc, s.b, MC)), sT = Mu / (dd * capArea(nt, s.b, MC));
    const msC = CX.comp.allow / sC - 1, msT = CX.tens.allow / sT - 1, ms = Math.min(msC, msT);
    if (!wc || ms < wc.ms) wc = { ms, y, s, r, nc, nt, dd, sC, sT, msC, msT, glass: ca.glass, CX, t: MC.UNI.t };
    const hw = s.h - (nu + nl) * MC.UNI.t, Vu = Math.abs(r.V) * d.FS, Nxy = Vu / hw;
    const web = plyRF(webStack, [0, 0, Nxy], M);
    if (!ww || web.rf - 1 < ww.ms) ww = { ms: web.rf - 1, y, Vu, hw, Nxy, mode: web.mode };
    const tau = Nxy / webL.h;
    if (!wb || tauWr / tau - 1 < wb.ms) wb = { ms: tauWr / tau - 1, y, tau, Vu, hw };
    if (kind !== 'winglet' && !quick) {
      const A = 0.685 * s.h * s.c * FT, Tu = Math.abs(r.T) * d.FS, qf = Tu / (2 * A);
      const sk = plyRF(bid(FIXED.skinBID), [0, 0, qf], M);
      if (!wsk || sk.rf - 1 < wsk.ms) wsk = { ms: sk.rf - 1, y, Tu, A, qf, mode: sk.mode };
    }
  }
  if (!quick) for (const side of ['upper', 'lower']) for (const p of sz[side]) {
    if (p.y1 >= gm.y1 - 1e-6 || (sz.tipG && p.y1 > sz.tipG.g0)) continue;   // the carbon ends inside the glass splice: wing-tipsplice
    const y = p.y1, s = gm.sec(y), r = L.at(y), nu = plyCount(sz.upper, y) + 1, nl = plyCount(sz.lower, y) + 1;
    const sig = Math.abs(r.M) * d.FS / (dEff(s, nu, nl, M) * capArea(side === 'upper' ? nu : nl, s.b, M));
    const tau = 2.5 * sig * M.UNI.t / FIXED.overlap.dropStagger, ms = psi(M.UNI.ILSS) / tau - 1;
    if (!wd || ms < wd.ms) wd = { ms, y, sig, tau, side };
  }
  const where = (y) => `${gm.label} ${y.toFixed(2)} ft`, c = wc, out = [];
  out.push(mk(kind, `${kind}-cap`, `${P} spar caps`, lc, where(c.y), `${c.glass ? 'glass tip cap: ' : ''}${c.msC < c.msT ? c.CX.comp.mode : c.CX.tens.mode}`, c.ms, {
    formula: 'σ = FS·M / (d · n·t·b);  MS = F_allow / σ − 1',
    inputs: [I('Limit bending moment M', Math.abs(c.r.M), 'inlb', 'SCHRENK'), I('Factor of safety FS (1.5 × design factor)', d.FS, '', 'FAR23 × KD'), I('Moment arm d (cap centroids)', c.dd, 'in', 'MODEL'),
      I('Cap width b', c.s.b, 'in', 'GEOMETRY'), I('Plies, compression cap', c.nc, '', 'SIZED'), I('Plies, tension cap', c.nt, '', 'SIZED'), I('Ply thickness t', c.t, 'in', PLY_T(c.glass ? 'GUD' : (M._glass ? 'GUD' : 'UNI'))),
      I('Compression allowable', c.CX.comp.allow, 'psi', c.CX.comp.mode.startsWith('skin') ? `BOUND: Hoff wrinkling on the ${CC} ${CC !== gm.core ? 'cap bed' : 'core'}; MS stays ≥ 0 down to × ${(1 / (1 + c.msC)).toFixed(2)}` : allowB(c.msC, 'compressive strength')), I('Tension allowable', c.CX.tens.allow, 'psi', allowB(c.msT, 'fibre-direction tension strength'))],
    result: [['σ compression (ult.)', c.sC, 'psi'], ['σ tension (ult.)', c.sT, 'psi'], ['MS compression', c.msC, ''], ['MS tension', c.msT, '']],
  }));
  out.push(mk(kind, `${kind}-web`, `${P} shear web (${sz.web} × 6781 ±45)`, lc, where(ww.y), `web ${ww.mode}`, ww.ms, {
    formula: 'Nxy = FS·V / h_web;  CLT first-ply max-stress on the ±45 6781 web',
    inputs: [I('Limit shear V', ww.Vu / d.FS, 'lb', 'SCHRENK'), I('Web depth h', ww.hw, 'in', 'MODEL'), I('Web plies', sz.web, '', 'SIZED')],
    result: [['Nxy (ult.)', ww.Nxy, 'lbin'], ['Reserve factor', ww.ms + 1, '']],
  }));
  out.push(mk(kind, `${kind}-webbuck`, `${P} web shear wrinkling on the HT61 spar block`, lc, where(wb.y), 'face wrinkling under shear (0.8 × Hoff, fibre-aligned)', wb.ms, {
    formula: 'τ_cr = 0.8 · 0.5 (E_fibre·E_c·G_c)^⅓ (±45 fibres align with the principal stresses);  τ = FS·V / (h·t_web)',
    inputs: [I('Limit shear V', wb.Vu / d.FS, 'lb', 'SCHRENK'), I('Web depth h', wb.hw, 'in', 'MODEL'), I('Web plies', sz.web, '', 'SIZED'), I('Spar-block core', `${FIXED.webCore}: E_c·G_c`, '', `BOUND: wrinkling stress ∝ (E_c·G_c)^⅓; MS stays ≥ 0 down to × ${(1 / (1 + wb.ms) ** 3).toFixed(2)} of the core's E_c·G_c`)],
    result: [['τ (ult.)', wb.tau, 'psi'], ['τ_cr', tauWr, 'psi']],
  }));
  if (wsk) out.push(mk(kind, `${kind}-torsion`, `${P} skin torsion (${FIXED.skinBID} × 6781 ±45)`, lc, where(wsk.y), `skin ${wsk.mode}`, wsk.ms, {
    formula: 'q = FS·T / (2·A_cell);  A_cell ≈ 0.685·t·c;  CLT first-ply on the skin',
    inputs: [I('Limit torque T', wsk.Tu / d.FS, 'inlb', 'TAS'), I('Enclosed area A', wsk.A, 'in2', 'MODEL')],
    result: [['Shear flow q (ult.)', wsk.qf, 'lbin'], ['Reserve factor', wsk.ms + 1, '']],
  }));
  if (wd) out.push(mk(kind, `${kind}-drop`, `${P} ply-drop interlaminar shear`, lc, where(wd.y), `${wd.side} cap drop, ILSS`, wd.ms, {
    formula: 'τ = Kt · σ_cap · t_ply / L_stagger;  Kt = 2.5',
    inputs: [I('Cap stress at drop (ult.)', wd.sig, 'psi', 'DERIVED'), I('Ply thickness', M.UNI.t, 'in', PLY_T('UNI')), I('Stagger length', FIXED.overlap.dropStagger, 'in', 'GEOMETRY'), I('ILSS allowable', psi(M.UNI.ILSS), 'psi', allowB(wd.ms, 'interlaminar shear strength'))],
    result: [['τ interlaminar (ult.)', wd.tau, 'psi']],
  }));
  const pSuc = L.q * 3 / 144 * d.FS, allowFT = psi(M[gm.core].ft);
  out.push(mk(kind, `${kind}-core`, `${P} core flatwise tension (LE suction)`, lc, 'leading edge', 'foam flatwise tension', allowFT / Math.max(pSuc, 1e-6) - 1, {
    formula: 'p = FS · q · |Cp_min|;  Cp_min = −3',
    inputs: [I('Dynamic pressure q', L.q / 144, 'psi', 'DERIVED'), I('Foam flatwise tension allowable', allowFT, 'psi', `BOUND: Divinycell HT61 minimum × 0.75 hot-wet; MS stays ≥ 0 down to ${pSuc.toFixed(3)} psi (${(pSuc / allowFT).toFixed(2)} × the value used)`)],
    result: [['Suction pressure (ult.)', pSuc, 'psi']],
  }));
  if (kind === 'wing') {
    // the root joint (cap split around the LWA plate, pad, bolts) is checked as wing-end-* in parts/wp17_wing_panel.js
    const y0 = GEO.wing.attachY, r = L.at(y0), s = gm.sec(y0);
    const T0 = Math.abs(r.T) * d.FS, A0 = 0.685 * s.h * s.c * FT, tauB = T0 / (2 * A0) / FIXED.overlap.skinLE;
    out.push(mk(kind, 'wing-lebond', 'Wing LE skin overlap bond (torsion)', lc, 'BL 3.75', 'bond shear', psi(M.UNI.ILSS) / Math.max(tauB, 1e-6) - 1, {
      formula: 'τ = (FS·T / 2A) / L_overlap', inputs: [I('Limit torque', T0 / d.FS, 'inlb', 'TAS'), I('Overlap length', FIXED.overlap.skinLE, 'in', 'GEOMETRY'), I('Bond allowable (ILSS)', psi(M.UNI.ILSS), 'psi', allowB(psi(M.UNI.ILSS) / Math.max(tauB, 1e-6) - 1, 'interlaminar shear strength'))], result: [['τ bond (ult.)', tauB, 'psi']],
    }));
  }
  if (kind === 'wing' && sz.tipG && !quick) {   // block P: the carbon-to-glass cap splice inside the glass tip zone (lap shear on the weaker ILSS)
    const T = sz.tipG, MG = glassM(M), y = T.g0, s = gm.sec(y), r = L.at(y), nu = plyCount(sz.upper, y), nl = plyCount(sz.lower, y), dd = dEff(s, nu, nl, M), F = Math.abs(r.M) * d.FS / dd;
    const tau = F / (s.b * T.lap), all = Math.min(psi(M.UNI.ILSS), psi(MG.UNI.ILSS)), ms = all / tau - 1;
    out.push(mk(kind, 'wing-tipsplice', 'Wing cap splice, HTS40 carbon to the 6781 glass tip caps (COM keep-out)', lc, where(y), 'lap shear, interlaminar', ms, {
      formula: 'F = FS·M / d at the splice start;  τ = F / (b · L_lap);  allowable: the lower SBS of HTS40 and 6781',
      inputs: [I('Limit bending moment at the splice', Math.abs(r.M), 'inlb', 'SCHRENK'), I('Lap length', T.lap, 'in', 'DESIGN'), I('Cap width b', s.b, 'in', 'GEOMETRY'), I('Carbon plies at the splice (upper / lower)', `${nu} / ${nl}`, 'text', 'SIZED'),
        I('Glass tip plies (upper / lower)', `${T.upper} / ${T.lower}`, 'text', 'SIZED'), I('Interlaminar allowable', all, 'psi', allowB(ms, 'short-beam shear strength'))],
      result: [['Cap force (ult.)', F, 'lb'], ['τ (ult.)', tau, 'psi']] }));
  }
  // the winglet-to-wing joint (straps over the tip, fin-root web) is checked as winglet-strap* in parts/wp18_winglet.js
  return out;
}

function csSparCheck(d, lc, Z, M, nU = Z.csCap, nL = Z.csCapL ?? nU) {
  const L = surfaceLoads('wing', d, lc);
  if (!L) return [];
  const g = GEO.wing, r = L.at(g.attachY);
  const Mx = r.Mx + r.V * g.attachY * FT;
  const inb = (1 - lc.ac.shareC) * lc.ac.W / 2 * lc.n * 0.18 * (g.attachY / 2) * FT;
  const Ms = (Mx + inb) * d.FS, Mu = Math.abs(Ms), h = GEO.csSpar.depthFt * FT, b = GEO.csSpar.cap;
  const comp = capAllowable(M, 3, 'PVC', true), tens = capAllowable(M, 3, 'PVC', false);
  // +M: upper cap in compression, lower in tension (and the reverse for −M); d between the two caps' centroids
  const pos = Ms >= 0, nC = pos ? nU : nL, nT = pos ? nL : nU, capPlies = nC;
  const dd = h - (nU + nL) / 2 * M.UNI.t - 6 * M.BID.t, sig = Mu / (dd * capArea(nC, b, M)), sigT = Mu / (dd * capArea(nT, b, M));
  const msC = comp.allow / sig - 1, msT = tens.allow / sigT - 1, ms = Math.min(msC, msT);
  const capMS = [[pos ? 'upper' : 'lower', msC], [pos ? 'lower' : 'upper', msT]];
  // the strake/inboard lift share is a public-data estimate: carry the largest share that still leaves MS ≥ 0
  const inbBound = inb ? 0.18 * Math.max(0, (comp.allow * dd * capArea(capPlies, b, M) / d.FS - Math.abs(Mx)) / Math.abs(inb)) : Infinity;
  const Nxy = Math.abs(r.V) * d.FS / h / 2;
  const web = plyRF(bid(Z.csWeb), [0, 0, Nxy], M);
  const webL = laminate(bid(Z.csWeb), M), tauWr = wrinkling(psi(M.BID.E1), 'PVC', M) * 0.8;
  return [
    mk('csSpar', 'cs-cap', 'CS spar caps (centreline)', lc, 'BL 0', msC <= msT ? `${pos ? 'upper' : 'lower'} cap: ${comp.mode}` : `${pos ? 'lower' : 'upper'} cap: ${tens.mode}`, ms, {
      formula: 'M_CL = Mx_attach + V_attach·y_attach + M_strake;  d = h − (n_u + n_l)·t/2 − 6·t_6781;  σ = FS·M_CL / (d·n·t·b) on the compression and the tension cap',
      inputs: [I('Attach moment Mx (limit)', r.Mx, 'inlb', 'SCHRENK'), I('Attach shear V (limit)', r.V, 'lb', 'SCHRENK'), I('Strake/inboard lift (fraction of the wing-side lift, at half the CS half-span)', 0.18, '', `BOUND: MS stays ≥ 0 up to ${inbBound.toFixed(2)}`), I('Strake/inboard lift moment', inb, 'inlb', 'DERIVED'), I('Depth h', h, 'in', 'MODEL'), I('Cap width b', b, 'in', 'GEOMETRY'), I('Upper cap plies (centre line)', nU, '', 'SIZED'), I('Lower cap plies (centre line)', nL, '', 'SIZED'),
        I('Tension allowable', tens.allow, 'psi', allowB(msT, 'HTS40 fibre-direction tension strength'))],
      result: [['M_CL (ult.)', Mu, 'inlb'], ['σ compression cap (ult.)', sig, 'psi'], ['σ tension cap (ult.)', sigT, 'psi'], ['Compression allowable', comp.allow, 'psi']], capMS,
    }),
    mk('csSpar', 'cs-web', `CS spar shear webs (${Z.csWeb} × 6781 ±45, ×2)`, lc, 'BL 3.75', `web ${web.mode}`, web.rf - 1, {
      formula: 'Nxy = FS·V / (2·h)', inputs: [I('Attach shear V (limit)', r.V, 'lb', 'SCHRENK'), I('Depth h', h, 'in', 'MODEL')], result: [['Nxy (ult.)', Nxy, 'lbin']],
    }),
    mk('csSpar', 'cs-webbuck', 'CS spar web shear wrinkling on HT61', lc, 'BL 3.75', 'face wrinkling under shear', tauWr / (Nxy / webL.h) - 1, {
      formula: 'τ_cr = 0.8 · 0.5 (E·Ec·Gc)^⅓', inputs: [I('Web τ (ult.)', Nxy / webL.h, 'psi', 'DERIVED')], result: [['τ_cr', tauWr, 'psi']],
    }),
  ];
}

export function fuselageMoments(d, lc) {
  const ac = lc.ac, items = ac.wc.items.filter((m) => !['wings', 'canard'].includes(m.id));
  const Lc = ac.shareC * ac.W * lc.n, Lw = (1 - ac.shareC) * ac.W * lc.n;
  const pts = items.map((m) => [-m.w * lc.n, m.s]).concat([[Lc - 18 * lc.n, ac.acC], [Lw - 74 * lc.n, ac.ac]]);
  const res = [];
  for (let s = 0.2; s < 15.8; s += 0.1) {
    let M = 0, V = 0;
    for (const [F, x] of pts) if (x < s) { M += F * (s - x); V += F; }
    res.push({ s, M: M * FT, V });
  }
  return res;
}
const FSC = new WeakMap();
export function fuselageSection(s, M) {
  let c = FSC.get(M);
  if (!c) { c = new Map(); FSC.set(M, c); }
  const key = Math.round(s * 100);
  if (!c.has(key)) c.set(key, fuselageSectionRaw(s, M));
  return c.get(key);
}
/** Fuselage cross-section outline — the same super-ellipse the 3D model is lofted with (build.py fus_pts):
 *  boxy sides (exponent 2/2.6), rounded turtledeck (2/2.2), flat belly (2/3.2). Returns points in ft
 *  (y lateral, z vertical) with their parameter t, plus the cockpit-opening half-width and the sill
 *  (top-longeron) location where the side panels meet the turtledeck / cockpit opening. */
export const FUS_SHAPE = { side: 2 / 2.6, top: 2 / 2.2, belly: 2 / 3.2, canopyHalfW: 0.98 };
export function fusOutline(s, n = 96, off = 0) {
  const f = fusAt(s), w = f.w / 2 + off, zc = (f.top + f.bot) / 2, h = (f.top - f.bot) / 2 + off, pts = [];
  const sp = (v, e) => Math.sign(v) * Math.abs(v) ** e;
  for (let i = 0; i < n; i++) {
    const t = -Math.PI / 2 + 2 * Math.PI * i / n, c = Math.cos(t), sn = Math.sin(t);
    pts.push([w * sp(c, FUS_SHAPE.side), zc + h * sp(sn, sn < 0 ? FUS_SHAPE.belly : FUS_SHAPE.top), t]);
  }
  const ohw = Math.min(FUS_SHAPE.canopyHalfW, f.w / 2 - 0.02) - 0.03;
  const tS = Math.acos(Math.min(1, (ohw / Math.max(w, 1e-6)) ** (1 / FUS_SHAPE.side)));
  const sill = [ohw, zc + h * Math.sin(tS) ** FUS_SHAPE.top];
  return { pts, ohw, sill, f, zc, h, w, open: s > GEO.canopy[0] && s < GEO.canopy[1] };
}
/** Fuselage side panel on the true contour: the part of the outline between the belly edge (sin t = −0.6)
 *  and the cockpit sill / top longeron. Points are addressed by arc length a (ft) measured up the panel
 *  from the belly edge, with an offset along the outward normal (ft, +out). y is for the right-hand side. */
const FSIDE = new Map();
/** kind: 'side' (right-hand side panel; mirror y for the left), 'belly' (across the bottom, left to right),
 *  'deck' (across the top between the sills: forward deck / turtledeck). Arc length a runs from the lower
 *  edge of a side panel upward, and from the left edge across belly and deck. */
export function fusPanel(s, kind = 'side') {
  const key = `${kind}${Math.round(s * 1000)}`;
  if (FSIDE.has(key)) return FSIDE.get(key);
  const f = fusAt(s), w = f.w / 2, zc = (f.top + f.bot) / 2, h = (f.top - f.bot) / 2;
  const sp = (v, e) => Math.sign(v) * Math.abs(v) ** e;
  const yz = (t) => { const c = Math.cos(t), sn = Math.sin(t); return [w * sp(c, FUS_SHAPE.side), zc + h * sp(sn, sn < 0 ? FUS_SHAPE.belly : FUS_SHAPE.top)]; };
  const ohw = Math.min(FUS_SHAPE.canopyHalfW, f.w / 2 - 0.02) - 0.03;
  const tB = Math.asin(-0.6), tS = Math.acos(Math.min(1, (ohw / Math.max(w, 1e-6)) ** (1 / FUS_SHAPE.side)));
  const [tLo, tHi] = kind === 'belly' ? [Math.PI - tB, 2 * Math.PI + tB] : kind === 'deck' ? [Math.PI - tS, tS]
    : kind === 'ring' ? [-Math.PI / 2, 1.5 * Math.PI] : kind === 'upper' ? [Math.PI, 0] : kind === 'lower' ? [Math.PI, 2 * Math.PI] : [tB, tS];
  const N = 48, ts = [], arcs = [0];
  let prev = yz(tLo);
  for (let i = 0; i <= N; i++) { const t = tLo + (tHi - tLo) * i / N, q = yz(t); ts.push(t); if (i) arcs.push(arcs[i - 1] + Math.hypot(q[0] - prev[0], q[1] - prev[1])); prev = q; }
  const arc = arcs[N], dir = Math.sign(tHi - tLo);
  const tAt = (a) => { a = clamp(a, 0, arc); let i = 1; while (i < N && arcs[i] < a) i++; const u = (a - arcs[i - 1]) / Math.max(arcs[i] - arcs[i - 1], 1e-9); return ts[i - 1] + (ts[i] - ts[i - 1]) * u; };
  const at = (a, off = 0) => {
    const t = tAt(a), [y, z] = yz(t), [y2, z2] = yz(t + 1e-4), dy = y2 - y, dz = z2 - z, L = Math.hypot(dy, dz) || 1;
    const ny = dz / L, nz = -dy / L; // outward normal (outline runs counter-clockwise in t)
    return { y: y + ny * off, z: z + nz * off, ny, nz };
  };
  void dir;
  const r = { s, f, kind, arc, tLo, tHi, at, zLo: yz(tLo)[1], zHi: yz(tHi)[1] };
  FSIDE.set(key, r);
  return r;
}
export const fusSide = (s) => fusPanel(s, 'side');
/** region of the shell at parameter t: belly (sandwich + UNI), side panel, turtledeck, or cockpit opening */
export function fusRegion(o, y, t) {
  const sn = Math.sin(t);
  if (sn > 0 && Math.abs(y) < o.ohw) return o.open ? 'open' : 'top';
  if (sn < -0.6) return 'bottom';
  return 'side';
}
function fuselageSectionRaw(s, M0) {
  const M = glassM(M0), F = FIXED.fuselage, o = fusOutline(s, 192), zb = o.f.bot;
  const faces = laminate(bid(F.faceBID), M), Ef = faces.Ex, E1 = psi(M.UNI.E1), tf = 2 * faces.h;
  // thin-walled shell integrated round the perimeter (inches, z from the bottom of the fuselage)
  let EA = 0, EAz = 0, segs = [], zs = [];
  for (let i = 0; i < o.pts.length; i++) {
    const a = o.pts[i], b = o.pts[(i + 1) % o.pts.length], tm = (a[2] + (b[2] < a[2] ? b[2] + 2 * Math.PI : b[2])) / 2;
    const ym = (a[0] + b[0]) / 2 * FT, zm = ((a[1] + b[1]) / 2 - zb) * FT, ds = Math.hypot(b[0] - a[0], b[1] - a[1]) * FT, dz = Math.abs(b[1] - a[1]) * FT;
    const reg = fusRegion(o, ym / FT, tm);
    if (reg === 'open') continue;
    if (reg === 'bottom' && FIXED.fusCut && FIXED.fusCut(s, ym)) continue;   // belly opening (LEZ-53-150 rev B, hook set in wp26)
    const k = Ef * tf + (reg === 'bottom' ? E1 * F.bottomUNI * M.UNI.t : 0), ea = k * ds;
    segs.push({ ea, z: zm, own: ea * dz * dz / 12 }); EA += ea; EAz += ea * zm;
    if (reg === 'side') zs.push(zm - dz / 2, zm + dz / 2);
  }
  const zL = (o.sill[1] - zb) * FT, eaL = 2 * E1 * capArea(F.longeronPlies, F.longeronW, M);
  EA += eaL; EAz += eaL * zL;
  const ce = FIXED.fusCutEdge ? FIXED.fusCutEdge(s, M) : null; if (ce) { EA += ce.ea; EAz += ce.ea * ce.z; segs.push({ ea: ce.ea, z: ce.z, own: 0 }); }   // opening edge doublers
  const zc = EAz / EA;
  const EI = segs.reduce((a, g) => a + g.own + g.ea * (g.z - zc) ** 2, 0) + eaL * (zL - zc) ** 2;
  const H = (o.f.top - o.f.bot) * FT, Hs = Math.max(...zs) - Math.min(...zs);
  return { H, Hs, Wd: o.f.w * FT, open: o.open, zc, zL, EI, EA, Ef, E1, faces, ohw: o.ohw * FT };
}
function fuselageChecks(d, lc, Z, M, quick = false) {
  const out = [], MG = glassM(M);   // all-glass shell (block P): longerons and belly plies are 6781 laid 0/90
  if (!quick && ['sym', 'roll', 'canard'].includes(lc.type)) {
    const comp = capAllowable(MG, FIXED.fuselage.faceBID, 'PU', true), tens = capAllowable(MG, FIXED.fuselage.faceBID, 'PU', false);
    let w = null, ws = null;
    for (const { s, M: Mb, V } of fuselageMoments(d, lc)) {
      if (s < GEO.F28 || s > GEO.firewall) continue;
      const sec = fuselageSection(s, M), Mu = Math.abs(Mb) * d.FS, top = Mb >= 0;
      const sTop = sec.E1 * Mu * (sec.zL - sec.zc) / sec.EI, sBot = sec.E1 * Mu * sec.zc / sec.EI;
      const msTop = (top ? comp.allow : tens.allow) / sTop - 1, msBot = (top ? tens.allow : comp.allow) / sBot - 1, ms = Math.min(msTop, msBot);
      if (!w || ms < w.ms) w = { ms, s, Mb, sec, sTop, sBot, msTop, msBot };
      const Nxy = Math.abs(V) * d.FS / (2 * sec.Hs), sh = plyRF(bid(FIXED.fuselage.faceBID * 2), [0, 0, Nxy], M);
      const tfc = sec.faces.h, dC = FIXED.fuselage.coreIn + tfc, Dsw = sec.faces.Ex * tfc * dC * dC / 2, Ncr = 5.35 * Math.PI ** 2 * Dsw / sec.Hs ** 2;
      const msS = Math.min(sh.rf - 1, Ncr / Math.max(Nxy, 1e-6) - 1);
      if (!ws || msS < ws.ms) ws = { ms: msS, s, V, Nxy, Ncr, rf: sh.rf, mode: sh.rf - 1 < Ncr / Nxy - 1 ? `face ${sh.mode}` : 'sandwich panel shear buckling' };
    }
    out.push(mk('fuselage', 'fus-bend', `Fuselage bending (${FIXED.fuselage.longeronPlies}-ply 6781 0/90 top longerons, open cockpit)`, lc, `FS ${(w.s * 12).toFixed(0)}`, w.msTop < w.msBot ? 'top longeron, strain-limited' : 'bottom laminate', w.ms, {
      formula: 'ε = FS·M·y / EI (modulus-weighted thin shell round the super-ellipse outline);  σ = E1·ε',
      inputs: [I('Limit bending moment M', Math.abs(w.Mb), 'inlb', 'BEAM'), I('Section EI', w.sec.EI, 'lbin2', 'MODEL'), I('Neutral axis above fuselage bottom', w.sec.zc, 'in', 'DERIVED'), I('Top longeron (sill) height', w.sec.zL, 'in', 'MODEL'), I('Section height', w.sec.H, 'in', 'MODEL'), I('Open (cockpit) section', w.sec.open ? 'yes' : 'no', '', 'MODEL')],
      result: [['σ top longeron (ult.)', w.sTop, 'psi'], ['σ bottom (ult.)', w.sBot, 'psi']],
    }));
    out.push(mk('fuselage', 'fus-shear', 'Fuselage side panel shear (faces + panel buckling)', lc, `FS ${(ws.s * 12).toFixed(0)}`, ws.mode, ws.ms, {
      formula: 'Nxy = FS·V / (2·h_side);  N_cr = 5.35 π² D / h_side²,  D = E_f·t_f·d² / 2',
      inputs: [I('Limit shear V', Math.abs(ws.V), 'lb', 'BEAM'), I('Core thickness', FIXED.fuselage.coreIn, 'in', FIXED.coreSource || 'ASSUMED')],
      result: [['Nxy (ult.)', ws.Nxy, 'lbin'], ['N_cr', ws.Ncr, 'lbin'], ['Face reserve factor', ws.rf, '']],
    }));
  }
  const EA = ['sym', 'roll', 'canard', 'emergency'].includes(lc.type) && FIXED.engineAttach ? FIXED.engineAttach(d, lc) : null;
  if (EA) {
    const tL = Z.fwPlies * M.BID.t, sBr = EA.P / (EA.D * tL);
    out.push(mk('fuselage', 'fus-engine', 'Firewall hard point under the upper pick-ups (base-bolt bearing)', lc, `firewall, ${EA.where}`, 'laminate bearing', psi(M.BID.Fbru) / sBr - 1, {
      formula: 'V = the worst base bolt\'s shear from the mount reaction (LEZ-71-222);  σ_br = V / (D·t_hard point)',
      inputs: [...EA.inputs.map((q) => I(...q)), I('Bolt diameter', EA.D, 'in', 'LEZ-71-222 (SIZED)'), I('Hard-point 6781 plies', Z.fwPlies, '', 'SIZED'), I('Hard-point laminate', tL, 'in', 'SIZED')],
      result: [['Bolt shear (ult.)', EA.P, 'lb'], ['σ bearing', sBr, 'psi']],
    }));
  } else if (!FIXED.engineAttach && ['sym', 'roll', 'canard', 'emergency'].includes(lc.type)) {
    const e = GEO.engine, emer = lc.type === 'emergency';
    const Fv = emer ? 0 : Math.abs(lc.n) * e.weight * d.FS, Fx = emer ? lc.n * e.weight * (d.KD ?? 1) : d.thrust * d.FS;
    const Mg = emer ? 0 : e.inertiaIp * (e.rpm * 2 * Math.PI / 60) * 1.0 * FT * d.FS;
    const Pbolt = Math.hypot(Fv / 4, Fx / 4) + (Fv * 1.5 * FT + Mg) / (e.boltSpanZ * FT) / 2;
    const tL = Z.fwPlies * M.BID.t, sBr = Pbolt / (e.boltD * tL);
    out.push(mk('fuselage', 'fus-engine', 'Engine-mount attach bearing (firewall hard-points)', lc, 'firewall, 4 bolts', emer ? 'emergency forward load, bearing' : 'inertia + thrust + gyroscopic, bearing', psi(M.BID.Fbru) / sBr - 1, {
      formula: 'P = √((Fv/4)² + (Fx/4)²) + (Fv·arm + M_gyro) / (2·s_z);  σ_br = P / (D·t)',
      inputs: [I('Engine + prop weight', e.weight, 'lb', 'ASSUMED'), I('Load factor', lc.n, 'g', emer ? 'FAR23' : 'DERIVED'), I('Thrust', emer ? 0 : d.thrust, 'lb', 'ASSUMED'), I('Gyroscopic moment (limit)', emer ? 0 : Mg / d.FS, 'inlb', 'FAR23'), I('Bolt diameter', e.boltD, 'in', 'ASSUMED'), I('Hard-point 6781 plies', Z.fwPlies, '', 'SIZED'), I('Hard-point laminate', tL, 'in', 'SIZED')],
      result: [['Max bolt load', Pbolt, 'lb'], ['σ bearing', sBr, 'psi']],
    }));
  }
  if (lc.type === 'emergency') {
    const B = FIXED.belts, P = lc.n * (d.KD ?? 1) * B.occupant / B.points, Pa = psi(M.FLOX.shear) * Math.PI * B.insertD * B.embed, BS = FIXED.beltSource;
    out.push(mk('fuselage', 'fus-belt', 'Seat-belt hard-point insert pull-out', lc, 'belt anchors', 'flox potting shear-out', Pa / P - 1, {
      formula: 'P = n·W_occ / n_points;  P_allow = τ_flox · π · D · L',
      inputs: [I('Load factor (ultimate)', lc.n, 'g', 'FAR23'), I('Occupant weight', B.occupant, 'lb', 'FAR23'), I('Anchor points', B.points, '', BS ? BS.points : 'ASSUMED'), I('Insert diameter', B.insertD, 'in', BS ? BS.insert : 'ASSUMED'), I('Embedment', B.embed, 'in', BS ? BS.insert : 'ASSUMED'), I('Flox shear allowable', psi(M.FLOX.shear), 'psi', BS ? BS.flox(Pa / P - 1) : 'ASSUMED')],
      result: [['Load per anchor', P, 'lb'], ['Pull-out allowable', Pa, 'lb']],
    }));
  }
  return out;
}

function F22Checks(d, lc, Z, M0) {
  const M = glassM(M0);   // all-glass bulkhead (block P): the doubler plies are 6781 laid 0/90
  if (!['sym', 'roll', 'canard'].includes(lc.type)) return [];
  const L = surfaceLoads('canard', d, lc), F = FIXED.F22, P = Math.abs(L.at(0).V) * 2 * d.FS;
  const f = fusAt(GEO.F22), h = F.geo ? F.geo.h : (f.top - f.bot) * FT * 0.8, span = f.w * FT, V = P / 2, a = F.geo ? F.geo.a : span / 2 - GEO.canard.attachY * FT;
  const sh = plyRF(bid(F.faceBID * 2), [0, 0, V / h], M);
  const sB = V * a / (h * h / 6) / (F.faceBID * 2 * M.BID.t), msB = psi(M.BID.Xc) / Math.max(sB, 1) - 1;
  const CA = FIXED.canardAttach, tD = (F.faceBID * 2 + Z.f22Dbl) * M.BID.t + F.doublerUNI * M.UNI.t, sBr = (P / 2) / (CA.nb * CA.an / 16 * tD);
  return [
    mk('F22', 'f22-shear', `F22 panel shear and bending (${F.faceBID} × 6781 each face)`, lc, 'beside canard attach', sh.rf - 1 < msB ? `face ${sh.mode}` : 'face bending', Math.min(sh.rf - 1, msB), {
      formula: 'Deep beam between fuselage sides: V = P/2, M = V·a;  Nxy = V/h',
      inputs: [I('Canard root shear ×2 (limit)', P / d.FS, 'lb', 'SCHRENK'), I('Bulkhead depth h at the attach', h, 'in', F.geo ? 'GEOMETRY' : 'MODEL'), I('Arm a', a, 'in', F.geo ? 'GEOMETRY' : 'MODEL')],
      result: [['Nxy (ult.)', V / h, 'lbin'], ['Face bending σ (ult.)', sB, 'psi']],
    }),
    mk('F22', 'f22-bearing', 'F22 canard-bolt bearing (hard-point doubler)', lc, 'canard bolts', 'laminate bearing', psi(M.UNI.Fbru) / sBr - 1, { tSize: tD,
      formula: 'σ_br = (P/2) / (n·D · t_doubler)', inputs: [I('Canard bolts each side', `${CA.nb} × AN${CA.an}`, 'text', 'LEZ-55-120 attach (SIZED)'), I('Doubler 6781 plies', Z.f22Dbl, '', 'SIZED'), I('Doubler stack t', tD, 'in', 'SIZED')], result: [['σ bearing (ult.)', sBr, 'psi']],
    }),
  ];
}

/** gear bow centre-line in the bow plane (y lateral, z up, ft). u ∈ [0,1] along one leg (0 = mount, 1 = axle). */
export function gearLeg(u) {
  const g = GEO.gear, p0 = [g.mountY, g.rootZ], p1 = g.p1 || [g.track / 2 - 0.08, g.axleZ + 0.32];
  const h00 = 2 * u ** 3 - 3 * u ** 2 + 1, h10 = u ** 3 - 2 * u ** 2 + u, h01 = -2 * u ** 3 + 3 * u ** 2, h11 = u ** 3 - u ** 2;
  return [0, 1].map((i) => h00 * p0[i] + h10 * g.T0[i] + h01 * p1[i] + h11 * g.T1[i]);
}
let GLEN = null;
export function gearLegLength() { // ft, arc length of one leg
  if (GLEN) return GLEN;
  let L = 0, pr = gearLeg(0);
  for (let i = 1; i <= 80; i++) { const q = gearLeg(i / 80); L += Math.hypot(q[0] - pr[0], q[1] - pr[1]); pr = q; }
  return (GLEN = L);
}
/** whole bow, v ∈ [−1, 1]: |v| ≤ vc is the straight centre section between the mounts; ±1 are the axles */
export function gearBow(v) {
  const g = GEO.gear, vc = g.mountY / (g.mountY + gearLegLength()), a = Math.abs(v), sg = v < 0 ? -1 : 1;
  if (a <= vc) return { s: g.s, y: sg * g.mountY * a / vc, z: g.rootZ, u: -1 + a / vc, centre: true };
  const u = (a - vc) / (1 - vc), [y, z] = gearLeg(u);
  return { s: g.s, y: sg * y, z, u, centre: false };
}
export const gearBowVc = () => GEO.gear.mountY / (GEO.gear.mountY + gearLegLength());
/** NACA 4-digit ordinates (chord units): the wing, strake and wing root use the same section as the 3D model */
export function naca(x, tc, m = GEO.wing.m, p = 0.4) {
  x = clamp(x, 0, 1);
  const yt = 5 * tc * (0.2969 * Math.sqrt(x) - 0.126 * x - 0.3516 * x * x + 0.2843 * x ** 3 - 0.1015 * x ** 4);
  const yc = x < p ? m / (p * p) * (2 * p * x - x * x) : m / ((1 - p) ** 2) * (1 - 2 * p + 2 * p * x - x * x);
  return { yu: yc + yt, yl: yc - yt, yc, yt };
}
/** strake section at BL y (same construction as the 3D model). The strake is the forward part of the wing section, from the
 *  LE to the CS spar aft face (= firewall), stretched forward about that face so its LE sweeps from the front of the strake to
 *  the wing LE. Thickness is the wing's, so at the outboard end (join.y) the strake end rib is exactly the wing root's
 *  forward contour and the aft face matches the wing-root jut-out behind it. af(x): ordinates in strake chord units. */
const STRAKE_MEMO = new Map();   // strakeSec is pure in y and is called hundreds of thousands of times by the tank sweeps
export function strakeSec(y) {
  const key = Math.round(y * 1e6), hit = STRAKE_MEMO.get(key); if (hit) return hit;
  const v = strakeSecCalc(y); if (STRAKE_MEMO.size > 20000) STRAKE_MEMO.clear(); STRAKE_MEMO.set(key, v); return v;
}
function strakeSecCalc(y) {
  const g = GEO.strake, u = clamp((y - g.rootY) / (g.outY - g.rootY), 0, 1), w = wingSec(y), sA = GEO.firewall;
  const le = lerp(g.frontS, w.le, u ** 0.85), c = sA - le, fStar = (sA - w.le) / w.c, k = w.c / c;
  // fuel bay: inboard the strake is thickened forward of the aft wall (scale mu0 at the root, 1 at the aft wall and at the end rib)
  const mu0 = lerp(g.thick0, 1, u), sc = (x) => 1 + (mu0 - 1) * (1 - x * x);
  const af = (x) => { const a = naca(fStar * x, w.tc), f = k * sc(x); return { yu: a.yu * f, yl: a.yl * f, yc: a.yc * f, yt: a.yt * f }; };
  let tmax = 0; for (let i = 1; i <= 40; i++) tmax = Math.max(tmax, 2 * af(i / 40).yt);
  return { le, c, tc: tmax, mu0, z: GEO.wing.z + g.zOff, u, fStar, af, wing: w };
}
/** wing-root jut-out at BL y (inboard of join.y): the wing section from the CS spar aft face (+ gap) to the trailing edge */
export function wingRootSec(y, gap = 0) {   // gap: the 3D model leaves join.gap at the spar face; the OML frame closes it (sealed seam)
  const w = wingSec(y), le = GEO.firewall + gap, c = w.le + w.c - le, x0 = (le - w.le) / w.c, k = w.c / c;
  const af = (x) => { const a = naca(x0 + x * (1 - x0), w.tc); return { yu: a.yu * k, yl: a.yl * k, yc: a.yc * k, yt: a.yt * k }; };
  return { le, c, z: GEO.wing.z, x0, af, wing: w };
}
/** OML upper / lower surface heights (ft) of the strake or wing root at (s, y); null outside */
export function omlAt(s, y) {
  y = Math.abs(y);
  if (y > GEO.join.y + 1e-9) { const w = wingSec(y), x = (s - w.le) / w.c; if (x < 0 || x > 1) return null; const a = naca(x, w.tc); return { up: w.z + a.yu * w.c, lo: w.z + a.yl * w.c }; }
  if (s <= GEO.firewall) { const q = strakeSec(y), x = (s - q.le) / q.c; if (x < 0 || x > 1) return null; const a = q.af(x); return { up: q.z + a.yu * q.c, lo: q.z + a.yl * q.c }; }
  const r = wingRootSec(y), x = (s - r.le) / r.c; if (x < 0 || x > 1) return null; const a = r.af(x); return { up: r.z + a.yu * r.c, lo: r.z + a.yl * r.c };
}
/** CS spar fitted inside the skins: box depth and centre height from the thinnest OML station over both faces, fuselage side
 *  to the wing root (the plans template the spar ends to the wing root at the "jut-out" [LP]) */
export const CS_FIT = (() => {
  const cs = GEO.csSpar, skin = 0.035 / 12, clr = 0.03 / 12;   // strake skin over the spar caps (3 BID, no core) + bond line
  let U = Infinity, L = -Infinity, at = null;
  for (let y = 1.05; y <= GEO.join.y + 1e-9; y += 0.05) for (const s of [cs.s - cs.width / 2, cs.s, cs.s + cs.width / 2 - 1e-6]) {
    const o = omlAt(s, y); if (!o) continue;
    if (o.up - skin - clr < U) { U = o.up - skin - clr; at = { s, y, side: 'upper' }; }
    if (o.lo + skin + clr > L) { L = o.lo + skin + clr; }
  }
  return { depth: U - L, z: (U + L) / 2, U, L, at, skin, clr };
})();
GEO.csSpar.depthFt = +CS_FIT.depth.toFixed(4); GEO.csSpar.z = +CS_FIT.z.toFixed(4);
/** control surface: chord fraction cf at the trailing edge of its parent */
export const CTL = {
  aileron: { parent: 'wing', span: () => GEO.wing.aileron, cf: () => GEO.wing.aileronCf, lc: 'roll' },
  elevator: { parent: 'canard', span: () => GEO.canard.elevator, cf: () => GEO.canard.elevCf, lc: 'sym' },
  rudder: { parent: 'winglet', span: () => GEO.winglet.rudder, cf: () => GEO.winglet.rudderCf, lc: 'rudder' },
};
export function gearSection(Z, M0, u) {
  const M = glassM(M0);   // the gear bow is glass (6781 laid 0/90; block P)
  if (FIXED.gearSectionFn) return FIXED.gearSectionFn(Z, M, Math.max(0, u));   // the bow's own ply schedule (LEZ-32-170, parts/wpD1_gear.js)
  const g = GEO.gear, t0 = Z.gearPlies * M.UNI.t;
  u = Math.max(0, u); // centre section (u < 0) = root section
  return { w: lerp(g.w[0], g.w[1], u), t: lerp(t0, t0 * g.taper, u) };
}
/** strake tank bays (ft): clear spans between the rib faces (ribs: GEO.strake.ribs, each coreIn + 2·ribBID thick) */
export function strakeBays() { const F = FIXED.strake, g = GEO.strake, tr = (F.coreIn + 2 * F.ribBID * BASE_MAT.BID.t) / 12; return g.ribs.slice(1).map((y, i) => y - g.ribs[i] - tr); }
function strakeChecks(d, lc, Z, M) {
  const F = FIXED.strake, g = GEO.strake;
  const inner = Array.from({ length: F.innerBID }, () => ({ mat: 'BID', angle: F.innerAngle })), fo = laminate(bid(F.faceBID), M), fi = laminate(inner, M), dd = F.coreIn + (fo.h + fi.h) / 2;
  if (lc.type === 'emergency') {   // 9 g forward (ultimate): the fuel bears on the strake's leading edge; hoop membrane on the LE radius
    const q = strakeSec(g.rootY), L = (GEO.csSpar.s - GEO.csSpar.width / 2 - q.le) * FT, p = F.fuelDensity * L * lc.n, R = 1.1019 * q.tc ** 2 * q.c * FT;
    const N = p * R, rf = plyRF([...bid(F.faceBID), ...inner], [0, N, 0], M);
    return [mk('strake', 'strake-fwd', 'Fuel-tank leading edge under the emergency forward load (hoop membrane)', lc, 'strake root, leading edge', `faces ${rf.mode}`, rf.rf - 1, {
      formula: 'p = ρ_fuel · L_tank · n (ultimate, no FS);  N = p · R_LE;  CLT first-ply on both faces together',
      inputs: [I('Fuel density (avgas 6.0 lb/US gal)', F.fuelDensity, 'lb/in3', 'FAA-H-8083-25 (avgas 6.0 lb/gal)'), I('Tank length, LE to the CS spar', L, 'in', 'MODEL'), I('Forward load factor (ultimate)', lc.n, 'g', 'FAR 23.561'), I('LE radius', R, 'in', 'GEOMETRY'), I('Faces', `${F.faceBID} + ${F.innerBID} BID`, '', 'SIZED')],
      result: [['p (ult.)', p, 'psi'], ['N hoop', N, 'lb/in']] })];
  }
  if (lc.type !== 'sym' || lc.n <= 0) return [];
  const h = strakeSec(g.rootY).tc * strakeSec(g.rootY).c * FT * 0.9, qD = 0.5 * 0.002377 * (d.VD * 1.6878) ** 2 / 144; // fuel head, in; ram on the forward-facing vent at VD
  const pF = F.fuelDensity * h * lc.n + qD, p = Math.max(pF, F.testPsi) * d.FS, b = Math.max(...strakeBays()) * FT;
  const Mb = p * b * b / 8, N = Mb / dd, tau = p * b / 2 / dd;
  const out = plyRF(bid(F.faceBID), [N, 0, 0], M), inn = plyRF(inner, [-N, 0, 0], M), wr = wrinkling(fi.Ex, F.core, M) / (N / fi.h), core = psi(M[F.core].tau) / tau;
  const modes = [['outer face tension', out.rf], [`inner face ${inn.mode}`, inn.rf], ['inner face wrinkling', wr], ['core shear', core]], w = modes.reduce((a, m) => (m[1] < a[1] ? m : a));
  return [mk('strake', 'strake-tank', 'Fuel-tank skin between ribs under fuel head and vent ram (sandwich bending + core shear)', lc, 'tank bay between ribs', w[0], w[1] - 1, {
    formula: 'p = FS·max(ρ_fuel·h·n + q_D, p_test);  M = p·b²/8;  N = M/d on each face (outer tension, inner compression);  τ_core = p·b/(2d)',
    inputs: [I('Load factor', lc.n, 'g', 'DERIVED'), I('Fuel head h', h, 'in', 'MODEL'), I('Fuel density (avgas 6.0 lb/US gal)', F.fuelDensity, 'lb/in3', 'FAA-H-8083-25 (avgas 6.0 lb/gal)'), I('Vent ram (forward-facing vent, q at VD)', qD, 'psi', 'DERIVED'),
      I('Tank test pressure', F.testPsi, 'psi', 'FAR 23.965(a)(3), nonmetallic tank with walls supported by the structure'), I('Widest bay, clear span b', b, 'in', 'MODEL'),
      I('Faces', `${F.faceBID} × 6781 ±45 out, ${F.innerBID} × 6781 0/90 in`, '', 'SIZED'), I('Core', `${F.coreIn} in ${F.core}`, '', 'SIZED'), I('Core shear allowable', psi(M[F.core].tau), 'psi', `BOUND: Divinycell HT61 minimum × 0.75 hot-wet; MS stays ≥ 0 down to ${tau.toFixed(0)} psi`)],
    result: [['Pressure (ult.)', p, 'psi'], ['N face', N, 'lb/in'], ['τ core', tau, 'psi']],
  })];
}
function controlChecks(d, lc, Z, M) {
  const out = [], C = FIXED.ctl, q = 0.5 * 0.002377 * (d.VD * 1.6878) ** 2 / 144; // psi at VD
  for (const [id, c] of Object.entries(CTL)) {
    if (lc.type !== c.lc) continue;
    const [a, b] = c.span(), cf = c.cf(), ym = (a + b) / 2;
    const par = id === 'aileron' ? wingSec(ym) : id === 'elevator' ? { c: GEO.canard.c, tc: GEO.canard.tc } : { c: wingletSec(ym).c, tc: GEO.winglet.tc };
    const tc = par.tc ?? GEO.wing.tc, cIn = par.c * FT, cs = cf * cIn, S = (b - a) * FT * cs;
    let A = 0; // enclosed area of the control-surface section, in²
    for (let i = 0; i < 40; i++) { const x = 1 - cf + cf * (i + 0.5) / 40, af = 5 * tc * (0.2969 * Math.sqrt(x) - 0.126 * x - 0.3516 * x * x + 0.2843 * x ** 3 - 0.1015 * x ** 4); A += 2 * af * cIn * cs / 40; }
    const nSk = id === 'rudder' ? C.rudderSkinBID : C.skinBID;   // DC-005: the rudder's thinnest skin (aft of the hinge doubler), conservatively over the whole cell
    const T = d.FS * q * C.Ch * S * cs, flow = T / (2 * A), t = nSk * M.BID.t, tau = flow / t, sk = plyRF(bid(nSk), [0, 0, flow], M);   // ±45 skin: shear is carried by the fibres
    out.push(mk(id, `${id}-torsion`, `${id[0].toUpperCase() + id.slice(1)} torsion: skin shear from hinge moment at VD`, lc, `mid-span ${ym.toFixed(2)} ft`, `skin shear (${sk.mode})`, sk.rf - 1, {
      formula: 'T = FS·q_D·C_h·S·c;  q = T/(2A);  τ = q/t;  ±45 6781 skin under N_xy = q, first-ply failure (CLT)',
      inputs: [I('Dynamic pressure at VD', q, 'psi', 'DERIVED'), I('Hinge-moment coefficient C_h', C.Ch, '', `BOUND: MS stays ≥ 0 up to C_h = ${(C.Ch * sk.rf).toFixed(2)}`), I('Surface area S', S, 'in2', 'MODEL'), I('Chord c', cs, 'in', 'MODEL'), I('Enclosed area A', A, 'in2', 'MODEL'), I('Skin', `${nSk} BID ±45`, '', 'SIZED')],
      result: [['Hinge moment T (ult.)', T, 'inlb'], ['Shear flow q', flow, 'lbin'], ['τ skin', tau, 'psi']],
    }));
  }
  return out;
}
function gearChecks(d, lc, Z, M0) {
  if (lc.type !== 'ground') return [];
  const M = glassM(M0);   // glass bow (6781 laid 0/90; block P)
  const g = GEO.gear, W = lc.ac.W;
  let Vg, side = 0, drag;
  if (lc.ground === 'level') { Vg = 0.5 * W * (lc.n - 0.667); drag = 0.25 * Vg; } else if (lc.ground === 'side') { Vg = 0.5 * W * 1.33; side = 0.33 * W; drag = 0; } else { Vg = 0.5 * W * 1.33; drag = 0.8 * Vg; }
  const arm = (g.track / 2 - g.mountY) * FT, drop = g.rootZ * FT, Lleg = gearLegLength() * FT;
  const s0 = gearSection(Z, M, 0), Iw = (w, t) => w * t ** 3 / 12;
  const Mv = (Vg * arm + side * drop) * d.FS, Md = drag * Lleg * d.FS;
  const sig = Mv * (s0.t / 2) / Iw(s0.w, s0.t) + Md * (s0.w / 2) / Iw(s0.t, s0.w);
  const tauI = 1.5 * Math.hypot(Vg, side) * d.FS / (s0.w * s0.t);
  const E = psi(M.UNI.E1);
  let defl = 0;
  for (let i = 0; i < 60; i++) { const x = (i + 0.5) / 60 * Lleg, ss = gearSection(Z, M, x / Lleg); defl += Vg * (Lleg - x) ** 2 / (E * Iw(ss.w, ss.t)) * Lleg / 60; }
  const clear0 = (GEO.prop.z - GEO.prop.r) * FT, clear = clear0 - defl;
  const out = [mk('gear', 'gear-bend', 'Gear bow bending at the mounts (6781 0/90 compression)', lc, 'mount / centre section', 'fibre compression', psi(M.UNI.Xc) / sig - 1, {
    formula: 'σ = FS·(V·arm + S·h)·(t/2)/I_weak + FS·D·L·(w/2)/I_strong',
    inputs: [I('Vertical reaction V (limit)', Vg, 'lb', 'FAR23'), I('Side load S (limit)', side, 'lb', 'FAR23'), I('Drag D (limit)', drag, 'lb', 'FAR23'), I('Lateral arm', arm, 'in', 'MODEL'), I('Root width w', s0.w, 'in', (FIXED.gearSource && FIXED.gearSource.w) || 'ASSUMED'), I('Root thickness t', s0.t, 'in', 'SIZED'), I('Root plies', Z.gearPlies, '', 'SIZED')],
    result: [['σ (ult.)', sig, 'psi'], ['Allowable Xc', psi(M.UNI.Xc), 'psi']],
  }), mk('gear', 'gear-ils', 'Gear leg interlaminar shear', lc, 'leg root', 'ILSS', psi(M.UNI.ILSS) / tauI - 1, {
    formula: 'τ = 1.5 · FS · V / (w·t)', inputs: [I('Resultant shear (limit)', Math.hypot(Vg, side), 'lb', 'FAR23')], result: [['τ (ult.)', tauI, 'psi']],
  })];
  // mounts: the attachment's own checks when it is defined (LEZ-32-120, parts/wpD1_gear.js), else the old tab and bond estimate
  if (FIXED.gearAttach) out.push(...FIXED.gearAttach(d, lc, Z, M));
  else {
  // mounts: tab bearing on the steel tube, and the extrusions' flox bond into the fuselage hard-point
  const GM = FIXED.gearMount, Rm = Math.hypot(Vg, side, drag) * d.FS, brg = Rm / (g.tubeD * g.tabL);
  out.push(mk('gear', 'gear-tab', 'Gear mount tab bearing on the steel tube', lc, 'mount tab (each side)', 'bearing', psi(M.BID.Fbru) / brg - 1, {
    formula: 'R = FS·√(V² + S² + D²);  σ_br = R / (D_tube · L_tab)',
    inputs: [I('Vertical reaction V (limit)', Vg, 'lb', 'FAR23'), I('Side load S (limit)', side, 'lb', 'FAR23'), I('Drag D (limit)', drag, 'lb', 'FAR23'), I('Steel tube OD', g.tubeD, 'in', 'ASSUMED'), I('Tab length along the tube', g.tabL, 'in', 'ASSUMED'), I('Tab UNI straps', GM.tabUNI, '', 'ASSUMED')],
    result: [['Mount reaction R (ult.)', Rm, 'lb'], ['σ bearing', brg, 'psi'], ['Allowable', psi(M.BID.Fbru), 'psi']],
  }));
  const tauB = Rm / (2 * g.extrusionBond), tauBolt = Rm / (g.boltsPerSide * 2 * Math.PI * g.boltD ** 2 / 4);
  out.push(mk('fuselage', 'fus-gear', 'Main-gear extrusions: flox bond into the fuselage hard-point', lc, 'gear mount, fuselage bottom corners', 'flox shear (bolts checked too)', Math.min(psi(M.FLOX.shear) / tauB, 75000 / tauBolt) - 1, {
    formula: 'τ_bond = R / (2 extrusions · A_bond);  τ_bolt = R / (n_bolts · 2 planes · πd²/4) vs 75 ksi',
    inputs: [I('Mount reaction R (ult.)', Rm, 'lb', 'DERIVED'), I('Bond area per extrusion', g.extrusionBond, 'in2', 'ASSUMED'), I('Flox shear allowable', psi(M.FLOX.shear), 'psi', 'ASSUMED'), I('Bolts per side (AN6, double shear)', g.boltsPerSide, '', 'ASSUMED'), I('Hard-point pad', `${GM.padBID} + ${GM.padsBID} BID`, '', 'ASSUMED')],
    result: [['τ bond', tauB, 'psi'], ['τ bolt', tauBolt, 'psi']],
  }));
  }
  if (lc.ground === 'level') out.push(mk('gear', 'gear-prop', 'Prop tip ground clearance at limit landing (stiffness)', lc, 'pusher prop tip', 'stiffness requirement', clear0 / Math.max(defl, 1e-6) - 1, {
    formula: 'δ = ∫ V (L−x)² / (E·I(x)) dx;  margin = static clearance / δ − 1',
    inputs: [I('Static prop tip clearance', clear0, 'in', 'MODEL'), I('Limit vertical reaction', Vg, 'lb', 'FAR23'), I('E1 (6781, the lower of warp / fill)', E, 'psi', 'NCAMP CAM-RP-2009-001 Rev C (6781 MPDR), ETW mean')],
    result: [['Axle deflection δ (limit)', defl, 'in'], ['Clearance left at limit', clear, 'in']],
  }));
  return out;
}

// ------------------------------------------------------------------ aeroelastic estimates (wing, canard)
export function aeroelastic(d, Z, M) {
  const res = {}, skin = laminate(bid(FIXED.skinBID), M), Gs = skin.Gxy, ts = skin.h, E1 = psi(M.UNI.E1);
  const vOf = (qPsi) => Math.sqrt(2 * qPsi * 144 / RHO0) / KT;
  for (const kind of ['wing', 'canard']) {
    const sz = Z[kind], gm = sz.gm, N = 40, L = (gm.y1 - gm.y0) * FT / Math.cos(gm.sweep);
    let GJ = 0, EI = 0, c = 0, eArm = 0;
    for (let i = 0; i < N; i++) {
      const y = lerp(gm.y0, gm.y1, (i + 0.5) / N), s = gm.sec(y), cI = s.c * FT, A = 0.685 * s.h * cI, per = 2.04 * cI;
      GJ += 4 * A * A * Gs * ts / per / N;
      const ca = capAt(sz, y, M), MC = ca.M, nu = ca.nu, nl = ca.nl, Au = nu * MC.UNI.t * s.b, Al = nl * MC.UNI.t * s.b, dd = dEff(s, nu, nl, MC);
      EI += psi(MC.UNI.E1) * (Au * Al / (Au + Al)) * dd * dd / N;
      c += cI / N; eArm += (s.xsp - 0.25) * cI / N;
    }
    const a = 5.0, qDiv = (Math.PI ** 2 / 4) * GJ / (eArm * c * a * L * L);
    const mass = (kind === 'wing' ? MASSES_STRUCT.wingPanel : MASSES_STRUCT.canard / 2) / 386.1, m = mass / L, Ip = m * (0.25 * c) ** 2;
    const fb = (1.875 ** 2 / (2 * Math.PI)) * Math.sqrt(EI / (m * L ** 4)), ft = (1 / (4 * L)) * Math.sqrt(GJ / Ip);
    const r = { GJ, EI, L, c, eArm, qDiv, Vdiv: vOf(qDiv), fb, ft, ratio: ft / fb };
    if (kind === 'wing') { const f = flap(GEO.wing.aileronCf), CLd = f.CLd * (a / (2 * Math.PI)); r.qRev = (Math.PI ** 2 / 4) * GJ / (L * L) * CLd / (c * c * -f.CMd * a); r.Vrev = vOf(r.qRev); }
    if (kind === 'canard') {
      const lc = { id: 'AERO', type: 'sym', V: d.VD, n: envelope(d).nPos(d.VD), ac: aircraft(d, WEIGHT_CASES[0]) }, Ld = surfaceLoads('canard', d, lc);
      let tw = 0;
      const dy = (gm.y1 - gm.y0) / N;
      for (let i = 0; i < N; i++) tw += Math.abs(Ld.at(gm.y0 + (i + 0.5) * dy).T) / GJ * dy * FT;
      r.tipTwistDeg = tw / D2R;
    }
    res[kind] = r;
  }
  return res;
}
function aeroChecks(d, Z, M) {
  const A = aeroelastic(d, Z, M), V12 = 1.2 * d.VD, lc = { id: 'AERO', label: 'Aeroelastic (speed / stiffness requirements)', short: 'Aeroelastic', V: d.VD, n: 0 }, out = [];
  for (const kind of ['wing', 'canard']) {
    const a = A[kind], P = kind === 'wing' ? 'Wing' : 'Canard';
    out.push(mk(kind, `${kind}-div`, `${P} torsional divergence speed ≥ 1.2 VD`, lc, 'whole surface', 'stiffness requirement (sweep ignored, conservative)', a.Vdiv / V12 - 1, {
      formula: 'q_D = (π²/4)·GJ / (e·c·a·L²);  margin = V_div / (1.2·VD) − 1',
      inputs: [I('Torsional stiffness GJ (mean)', a.GJ, 'lbin2', 'BEAM'), I('AC-to-spar arm e', a.eArm, 'in', 'MODEL'), I('Mean chord c', a.c, 'in', 'MODEL'), I('Structural span L', a.L, 'in', 'MODEL'), I('Lift slope a', 5.0, '/rad', `BOUND: V_div ∝ a^−½; MS stays ≥ 0 up to a = ${(5.0 * (a.Vdiv / V12) ** 2).toFixed(1)} /rad`)],
      result: [['Divergence speed', a.Vdiv, 'kt'], ['Requirement', V12, 'kt']],
    }));
    out.push(mk(kind, `${kind}-freq`, `${P} torsion/bending frequency ratio ≥ 2 (flutter indicator)`, lc, 'whole surface', 'frequency separation (indicator only)', a.ratio / 2 - 1, {
      formula: 'f_b = (1.875²/2π)√(EI/mL⁴);  f_t = (1/4L)√(GJ/I_p)', inputs: [I('EI (mean)', a.EI, 'lbin2', 'BEAM'), I('GJ (mean)', a.GJ, 'lbin2', 'BEAM')], result: [['Bending f1', a.fb, 'Hz'], ['Torsion f1', a.ft, 'Hz'], ['Ratio', a.ratio, '']],
    }));
  }
  out.push(mk('wing', 'wing-rev', 'Aileron reversal speed ≥ 1.2 VD', lc, 'aileron span', 'stiffness requirement', A.wing.Vrev / V12 - 1, {
    formula: 'q_R = (π²/4)(GJ/L²)·C_Lδ / (c²·|C_Mδ|·a)  (typical section)', inputs: [I('GJ (mean)', A.wing.GJ, 'lbin2', 'BEAM'), I('Aileron chord ratio', GEO.wing.aileronCf, '', 'MODEL')], result: [['Reversal speed', A.wing.Vrev, 'kt']],
  }));
  out.push(mk('canard', 'canard-twist', 'Canard tip twist at VD ≤ 1.0° (pitch-trim stiffness)', lc, 'canard tip', 'stiffness requirement', 1.0 / Math.max(A.canard.tipTwistDeg, 1e-6) - 1, {
    formula: 'θ_tip = ∫ T / GJ dy (limit, VD)', inputs: [I('GJ (mean)', A.canard.GJ, 'lbin2', 'BEAM'), I('Requirement', 1.0, 'deg', 'DESIGN: pitch-trim stiffness')], result: [['Tip twist', A.canard.tipTwistDeg, 'deg']],
  }));
  return { checks: out, A };
}

// ------------------------------------------------------------------ evaluation
export function evaluate(d, Z) { const it = evaluateSteps(d, Z); let r = it.next(); while (!r.done) r = it.next(); return r.value; }
/** evaluate() in steps: it yields after each load case's built-in checks and after each registered check set, so a
 *  caller can spread the analysis over several tasks (analyseAsync); the checks run in the same order either way */
export function* evaluateSteps(d, Z) {
  const M = materials(d), cases = loadCases(d), rows = [];
  for (const lc of cases) {
    rows.push(...liftingChecks('wing', d, lc, Z, M), ...liftingChecks('canard', d, lc, Z, M), ...liftingChecks('winglet', d, lc, Z, M), ...csSparCheck(d, lc, Z, M), ...fuselageChecks(d, lc, Z, M), ...F22Checks(d, lc, Z, M), ...gearChecks(d, lc, Z, M), ...strakeChecks(d, lc, Z, M), ...controlChecks(d, lc, Z, M));
    yield;
    for (let i = 0, n = EXTRA_CHECKS.length; i < n; i++) if (i in EXTRA_CHECKS) { rows.push(...EXTRA_CHECKS[i].fn(d, lc, Z, M)); yield; }   // as flatMap visits them
  }
  const aero = aeroChecks(d, Z, M);
  rows.push(...aero.checks);
  { const h = hotWet(), lc = { id: 'HW', label: 'Hot-wet operating limit (temperature requirement)', short: 'Hot-wet', V: 0, n: 0 };
    rows.push(mk('laminate', 'lam-hotwet', 'Laminate hot-wet operating limit: maximum service temperature ≤ wet Tg − 50 °F (MTM45-1, M cycle)', lc, 'every structural laminate', 'temperature requirement (margin on the rise above 59 °F)', h.ms, {
      formula: 'T_MOL = Tg_wet − 50 °F;  MS = (T_MOL − 59) / (T_service − 59) − 1',
      inputs: [I('Wet (conditioned) Tg, M cycle (no post-cure)', MATSYS.Tg.wetF, '°F', `${MATSYS.Tg.src}; MH wet Tg 320–342 °F; MS stays ≥ 0 down to ${(MATSYS.serviceMaxF + 50).toFixed(0)} °F`), I('Operating-limit rule', 50, '°F below wet Tg', 'CompositesWorld, Environmental testing of composites (after CMH-17 Vol 1 sec 6.6.3), accessed 2026-11-19'),
        I('Maximum service temperature of the structure', h.svc, '°F', 'DESIGN: the 140 °F target (Miles, 2026-11-19); white or light finish on external composite surfaces; BOUND (confirm by a skin-temperature survey)')],
      result: [['T_MOL', h.mol, '°F'], ['Design environment (NCAMP ETW)', MATSYS.etwF, '°F']] })); }
  { const c = coreTemps(), lc = { id: 'CT', label: 'Core temperature limits (process and service)', short: 'Core temperature', V: 0, n: 0 };
    rows.push(mk('laminate', 'core-proc', 'Core processing temperature: the M-cycle cure peak ≤ the Divinycell HT processing limit', lc, 'every sandwich part (co-cured on HT)', 'temperature requirement (margin on the rise above 59 °F)', c.proc, {
      formula: 'MS = (T_proc,max − 59) / (T_cure,peak − 59) − 1;  T_peak = 250 + 10 °F (the M-cycle dwell tolerance)',
      inputs: [I('Cure peak, M cycle', c.pk, '°F', MATSYS.cure.src), I('Core processing limit', c.c.procF, '°F', MATSYS.core.src)],
      result: [['Margin', c.c.procF - c.pk, '°F']] }));
    rows.push(mk('laminate', 'core-svc', 'Core service temperature: the 140 °F service target ≤ the Divinycell HT continuous limit (176 °F)', lc, 'every sandwich part', 'temperature requirement (margin on the rise above 59 °F)', c.svc, {
      formula: 'MS = (T_core,cont − 59) / (T_service − 59) − 1',
      inputs: [I('Core continuous service limit', c.c.svcF, '°F', MATSYS.core.src), I('Maximum service temperature of the structure', c.sv, '°F', 'DESIGN: the 140 °F target (Miles, 2026-11-19); BOUND (skin-temperature survey)')],
      result: [['Margin', c.c.svcF - c.sv, '°F'], ['Laminate allowables taken at (ETW)', MATSYS.etwF, '°F']] })); }
  const governing = {};
  for (const r of rows) if (!governing[r.id] || r.ms < governing[r.id].ms) governing[r.id] = r;
  return { M, cases, rows, governing, minMS: Math.min(...rows.map((r) => r.ms)), aero: aero.A };
}
export function vnGrid(d, Z, wc = WEIGHT_CASES[0], NV = 30, NN = 20) {
  const M = materials(d), env = envelope(d, wc), grid = [];
  for (let i = 1; i <= NV; i++) {
    const V = d.VD * i / NV, nT = env.nPos(V), nB = env.nNeg(V);
    for (let j = 0; j <= NN; j++) {
      let n = lerp(nB, nT, j / NN);
      if (Math.abs(n) < 0.05) n = n < 0 ? -0.05 : 0.05;
      const lc = { id: 'grid', label: 'grid', type: 'sym', V, n, ac: env.ac };
      const cs = [...liftingChecks('wing', d, lc, Z, M), ...liftingChecks('canard', d, lc, Z, M), ...csSparCheck(d, lc, Z, M), ...fuselageChecks(d, lc, Z, M), ...F22Checks(d, lc, Z, M)];
      let min = cs[0];
      for (const c of cs) if (c.ms < min.ms) min = c;
      grid.push({ V, n, ms: min.ms, crit: min.name, part: min.part });
    }
  }
  return { env, grid };
}
/** effective design: FS = FAR ultimate factor × design factor KD (every part built to KD × ultimate);
 *  emergency-landing loads, already ultimate, take KD alone */
export function effective(design) {
  if (design._eff) return design;
  const d = { ...design, _eff: true, FSu: design.FS, KD: design.KD ?? 1 };
  d.FS = d.FSu * d.KD;
  return d;
}
/** the sizing alone, in the shape of an analysis without its check rows: enough for buildPlyBook, whose plies, weights and
 *  masses come from the sizing (Z, d, M) only; rows and aero feed nothing but display rows (perf: the mass model's first
 *  pass and the cowl's laminate density need no load-case evaluation) */
export function sizing(design = DEFAULT_DESIGN) {
  const d = effective(design);
  return { d, Z: size(d), M: materials(d), rows: [], governing: {}, aero: {}, sizingOnly: true };
}
/** analyses memoised by design object while a scope is open (withAnalysisMemo): for read-only work such as release
 *  audits, sheets and readiness, during which nothing the analysis reads can change, so every analyse(design) in the scope
 *  returns what the first returned. Outside a scope every call analyses afresh (perf) */
let MEMO = null;
const memoKey = (design, withGrid) => `${withGrid ? 1 : 0}|${MASS_MODEL ? 'mm' : '-'}`;
export function withAnalysisMemo(fn) { const outer = MEMO; MEMO = MEMO || new Map(); try { return fn(); } finally { MEMO = outer; } }
export async function withAnalysisMemoAsync(fn) { const outer = MEMO; MEMO = MEMO || new Map(); try { return await fn(); } finally { MEMO = outer; } }
/** a read-only geometry result shared within an open memo scope (computed afresh outside one); key names the function */
export function scoped(key, fn) { if (!MEMO) return fn(); const k = `fn:${key}`; if (!MEMO.has(k)) MEMO.set(k, fn()); return MEMO.get(k); }
export function analyse(design = DEFAULT_DESIGN, withGrid = true) {
  if (MEMO) { let m = MEMO.get(design); if (!m) MEMO.set(design, (m = new Map())); const k = memoKey(design, withGrid), mm = MASS_MODEL;
    const hit = m.get(k); if (hit && hit.mm === mm) return hit.r;
    const r = analyseNow(design, withGrid); m.set(k, { r, mm }); return r; }
  return analyseNow(design, withGrid);
}
/** analyse(design, false) spread over tasks: pause() between steps once a step has run for budget ms (the explorer's
 *  boot, so no single task holds the page). The same result as analyse(design, false) */
export async function analyseAsync(design = DEFAULT_DESIGN, pause = () => new Promise((r) => setTimeout(r, 0)), budget = 40) {
  const d = effective(design), Z = size(d), it = evaluateSteps(d, Z);
  const slice = typeof budget === 'function' ? budget : () => budget;   // budget: ms per slice, or a function giving it (the app shortens it while the user orbits)
  let t = performance.now(), r = it.next();
  while (!r.done) { if (performance.now() - t > slice()) { await pause(); t = performance.now(); } r = it.next(); }
  return { d, Z, ...r.value, env: envelope(d), grid: null };
}
function analyseNow(design, withGrid) {
  const d = effective(design), Z = size(d), ev = evaluate(d, Z);
  if (!withGrid) return { d, Z, ...ev, env: envelope(d), grid: null };
  const vn = vnGrid(d, Z);
  return { d, Z, ...ev, env: vn.env, grid: vn.grid };
}

// ------------------------------------------------------------------ spanwise results (plots, colouring)
export function spanwise(kind, d, Z, lc) {
  const M0 = materials(d), M = M0;
  if (['wing', 'canard', 'winglet'].includes(kind)) {
    const L = surfaceLoads(kind, d, lc), sz = Z[kind], gm = sz.gm, rows = [], M = gm.glass ? glassM(M0) : M0;
    const CC = gm.capCore || gm.core, CA = { comp: capAllowable(M, FIXED.skinBID, CC, true), tens: capAllowable(M, FIXED.skinBID, CC, false) };
    for (let i = 0; i <= 60; i++) {
      const y = lerp(gm.y0, gm.y1, i / 60), s = gm.sec(y), ca = capAt(sz, y, M), MC = ca.M, CX = ca.glass ? { comp: sz.tipG.comp, tens: sz.tipG.tens } : CA, nu = ca.nu, nl = ca.nl, dd = dEff(s, nu, nl, MC);
      const r = L ? L.at(y) : { V: 0, M: 0, T: 0 }, pos = r.M >= 0 || kind === 'winglet';
      const nc = pos ? nu : nl, nt = pos ? nl : nu, Mu = Math.abs(r.M) * d.FS;
      const ms = L && Mu > 0 ? Math.min(CX.comp.allow / (Mu / (dd * capArea(nc, s.b, MC))) - 1, CX.tens.allow / (Mu / (dd * capArea(nt, s.b, MC))) - 1) : Infinity;
      rows.push({ y, V: r.V, M: r.M, T: r.T, nu, nl, ru: sz.req.upper[i], rl: sz.req.lower[i], ms, eps: Math.abs(r.M) / (dd * capArea(nc, s.b, MC)) / psi(MC.UNI.E1) });
    }
    return { unit: gm.label, rows, y0: gm.y0, y1: gm.y1 };
  }
  if (kind === 'fuselage') {
    if (!['sym', 'roll', 'canard'].includes(lc.type)) return { rows: [] };
    const comp = capAllowable(M, FIXED.fuselage.faceBID, 'PU', true);
    return {
      unit: 'FS', y0: GEO.F22, y1: GEO.firewall,
      rows: fuselageMoments(d, lc).filter((r) => r.s >= GEO.F22 && r.s <= GEO.firewall).map((r) => {
        const sec = fuselageSection(r.s, M), eps = Math.abs(r.M) * (sec.zL - sec.zc) / sec.EI;
        return { y: r.s, V: r.V, M: r.M, T: 0, eps, ms: eps > 0 ? comp.allow / (sec.E1 * eps * d.FS) - 1 : Infinity, nu: FIXED.fuselage.longeronPlies };
      }),
    };
  }
  if (kind === 'csSpar') {
    const L = surfaceLoads('wing', d, lc);
    if (!L) return { rows: [] };
    const r = L.at(GEO.wing.attachY), rows = [], comp = capAllowable(M, 3, 'PVC', true);
    for (let i = 0; i <= 30; i++) {
      const y = GEO.wing.attachY * i / 30, Mx = r.Mx + r.V * (GEO.wing.attachY - y) * FT;
      const nL = Z.csCapL ?? Z.csCap, nC = Mx >= 0 ? Z.csCap : nL, h = GEO.csSpar.depthFt * FT, dd = h - (Z.csCap + nL) / 2 * M.UNI.t - 6 * M.BID.t, sig = Math.abs(Mx) * d.FS / (dd * capArea(nC, GEO.csSpar.cap, M));
      rows.push({ y, V: r.V, M: Mx, T: 0, eps: sig / d.FS / psi(M.UNI.E1), ms: comp.allow / sig - 1, nu: Z.csCap, nl: nL });
    }
    return { unit: 'BL', rows, y0: 0, y1: GEO.wing.attachY };
  }
  if (kind === 'gear') {
    const g = GEO.gear, W = lc.ac.W, Vg = lc.type === 'ground' ? 0.5 * W * (lc.ground === 'level' ? lc.n - 0.667 : 1.33) : 0;
    const arm = (g.track / 2 - g.mountY) * FT, rows = [];
    for (let i = 0; i <= 30; i++) {
      const u = i / 30, s = gearSection(Z, M, u), Mv = Vg * arm * (1 - u), sig = Mv * (s.t / 2) / (s.w * s.t ** 3 / 12);
      rows.push({ y: u, V: Vg, M: Mv, T: 0, eps: sig / psi(M.UNI.E1), ms: Vg && sig > 0 ? psi(M.UNI.Xc) / (sig * d.FS) - 1 : Infinity, nu: Math.round(s.t / M.UNI.t) });
    }
    return { unit: 'leg fraction', rows, y0: 0, y1: 1 };
  }
  return { rows: [] };
}

// ------------------------------------------------------------------ validation helpers
/** Euler-Bernoulli beam finite elements (2-node, 4 dof) vs the direct integration used by the checks */
export function beamFE(kind, d, Z, lc, Ne = 60) {
  const sz = Z[kind], gm = sz.gm, M = gm.glass ? glassM(materials(d)) : materials(d), L = surfaceLoads(kind, d, lc), surf = L.loading;
  const len = (gm.y1 - gm.y0) * FT / Math.cos(gm.sweep), le = len / Ne, ndof = 2 * (Ne + 1);
  const K = Array.from({ length: ndof }, () => new Float64Array(ndof)), F = new Float64Array(ndof), E1 = psi(M.UNI.E1);
  const EIat = (y) => { const s = gm.sec(y), ca = capAt(sz, y, M), MC = ca.M, Au = ca.nu * MC.UNI.t * s.b, Al = ca.nl * MC.UNI.t * s.b, dd = dEff(s, ca.nu, ca.nl, MC); return psi(MC.UNI.E1) * (Au * Al / (Au + Al)) * dd * dd; };
  // outboard load of the surface beyond the structural root, per inch of beam
  const wAt = (y) => surf.lift(y) / FT;
  let Mroot = 0;
  for (let e = 0; e < Ne; e++) {
    const y = lerp(gm.y0, gm.y1, (e + 0.5) / Ne), k = EIat(y) / le ** 3;
    const ke = [[12, 6 * le, -12, 6 * le], [6 * le, 4 * le * le, -6 * le, 2 * le * le], [-12, -6 * le, 12, -6 * le], [6 * le, 2 * le * le, -6 * le, 4 * le * le]];
    const idx = [2 * e, 2 * e + 1, 2 * e + 2, 2 * e + 3];
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) K[idx[i]][idx[j]] += k * ke[i][j];
    const w = wAt(y) * Math.cos(gm.sweep), fe = [w * le / 2, w * le * le / 12, w * le / 2, -w * le * le / 12];
    for (let i = 0; i < 4; i++) F[idx[i]] += fe[i];
    Mroot += w * le * (e + 0.5) * le;
  }
  const n = ndof - 2, A = Array.from({ length: n }, (_, i) => Float64Array.from(K[i + 2].slice(2))), b = Float64Array.from(F.slice(2));
  for (let i = 0; i < n; i++) {
    for (let r = i + 1; r < Math.min(n, i + 4); r++) { const f = A[r][i] / A[i][i]; if (!f) continue; for (let c = i; c < Math.min(n, i + 4); c++) A[r][c] -= f * A[i][c]; b[r] -= f * b[i]; }
  }
  const x = new Float64Array(n);
  for (let i = n - 1; i >= 0; i--) { let s = b[i]; for (let c = i + 1; c < Math.min(n, i + 4); c++) s -= A[i][c] * x[c]; x[i] = s / A[i][i]; }
  // direct: double integration of M/EI along the beam
  let th = 0, wv = 0;
  const N = 120, dy = len / N, curv = (i) => { const y = lerp(gm.y0, gm.y1, i / N); return L.at(y).M / EIat(y); };
  for (let i = 1; i <= N; i++) { th += (curv(i - 1) + curv(i)) / 2 * dy; wv += th * dy; }
  return { tipFE: x[n - 2], tipDirect: wv, MrootFE: Mroot, MrootDirect: L.at(gm.y0).M, Ne, len };
}
export function handCalcWing(d, lc) {
  const g = GEO.wing, ac = lc.ac;
  let A = 0, Ay = 0, Atot = 0;
  for (let y = 0; y <= g.tipY; y += 0.01) { const c = wingSec(Math.max(y, g.rootY)).c; Atot += c * 0.01; if (y >= g.attachY) { A += c * 0.01; Ay += c * y * 0.01; } }
  const semi = (1 - ac.shareC) * ac.W / 2 * lc.n, Lout = semi * A / Atot, ybar = Ay / A;
  const Mhand = (Lout - MASSES_STRUCT.wingPanel * lc.n) * (ybar - g.attachY) * FT / Math.cos(GM.wing.sweep);
  return { Lout, ybar, Mhand, areaFrac: A / Atot, semi };
}
export const SENS_PARAMS = [
  ['W', 'Gross weight', 'd'], ['n1', 'Limit load factor', 'd'], ['VC', 'Design cruise speed VC', 'd'], ['UdeC', 'Gust velocity at VC', 'd'],
  ['E1', 'UNI modulus E1', 'k'], ['Xc', 'UNI compression strength', 'k'], ['coreG', 'Foam shear modulus', 'k'], ['coreE', 'Foam modulus', 'k'], ['t', 'Cured ply thickness', 'k'],
];
export function sensitivity(d, Z, frac = 0.10) {
  const base = evaluate(d, Z).minMS, out = [];
  for (const [key, label, where] of SENS_PARAMS) {
    const run = (f) => { const dd = { ...d, k: { ...(d.k || {}) } }; if (where === 'd') dd[key] = d[key] * f; else dd.k[key] = (dd.k[key] || 1) * f; return evaluate(dd, Z).minMS; };
    out.push({ key, label, lo: run(1 - frac), hi: run(1 + frac) });
  }
  return { base, rows: out.sort((a, b) => Math.abs(b.hi - b.lo) - Math.abs(a.hi - a.lo)) };
}
export function mcSample(d, Z, rand) {
  const nrm = () => { let u = 0, v = 0; while (!u) u = rand(); while (!v) v = rand(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const k = { Xc: 1 + 0.08 * nrm(), Xt: 1 + 0.08 * nrm(), S: 1 + 0.08 * nrm(), E1: 1 + 0.05 * nrm(), G12: 1 + 0.05 * nrm(), coreE: 1 + 0.10 * nrm(), coreG: 1 + 0.10 * nrm(), t: 1 + 0.04 * nrm() };
  return evaluate({ ...d, W: d.W * (1 + 0.02 * nrm()), k }, Z).minMS;
}
