// WP4 — avionics (ATA 23, 31, 34), lights (33), engine indicating (77), cabin (25) and canopy (52/56).
// Garmin suite: AXIS GDU 116C (PFD / MFD / EIS, IFR WAAS GPS, 10 W COM, 4-place audio panel), GSU 25C ADAHRS with
// GMU 11 and GTP 59, GEA 24 EIS, G5 standby, GTX 45R (Mode S, 1090ES Out, dual-link In, internal WAAS GPS); ACK E-04
// ELT; pitot-static, LED position / strobe lights, canopy with latch warning, seats, harnesses and baggage restraint. Notional; FAR 23 yardsticks.
import { GEO, registerChecks, mk, psi, allowB, wingSec, fusAt, FUS_SHAPE } from '../structures.js';
import { defineParts, defineGraph, defineReqs, adoptMass, partByPN } from '../systems.js';
import { ENG } from './wp1_powerplant.js';

const S1 = (title, inspect) => ({ title, inspect });
const PNL = { massItem: 'panel' }, CAB = { massItem: 'cabin' };
const PANEL_S = 40.5 / 12, FW = GEO.firewall;
import { CAN, CL, canopySill } from './canopy_layout.js';
import * as LYI from './wpI0_layout.js';
export { canopySill };
// latch pins on the left sill, hinge on the right sill; gas strut on the right side (anchors relative to the hinge line)
// latch: three hooks on the left longeron, detailed in wp14 (canopy_layout.js); the warning switch sits at the forward hook
export const LATCH_S = CL.st, CANOPY_SW = [CL.switchS, CL.yR, CL.zT - 0.045];
/** pin height above the outer sill corner (in): 0.055 (2026-11-22, was 0.02): at 0.02 the rail edge dipped 0.027 in past the shell's cut
 *  while opening (I1); 0.035 in more on a shim strip under the sill leaf clears it (0.03 in is the least that does), and the canopy's
 *  straight sill land stays within its 1/16 in build-up (LEZ-56-100) */
export const HINGE_RAISE = 0.055;
export const HINGE = [47.12 / 12, 70.5 / 12].map((s) => { const q = canopySill(s, 1); return [q[0], q[1], q[2] + HINGE_RAISE / 12]; }); // LEZ-56-110: pin on the outer right sill corner over FS 68–96, where the sill is straight (the frame edge swings clear of the shell's cut)
export const STRUT = { s: 4.875, fixed: [-0.10, -0.42], move: [-0.32, 0.10], openDeg: 80 }; // (lateral inboard −, up +) ft from the hinge; canopy-frame anchor at θ = 0

// ------------------------------------------------------------------------------------------- layout
// positions and J's routes come from block J's layout (wpJ0_layout.js): faces on block B's panel cut-outs, the remote
// units on J's shelf over the pedals, the pitot-static system, antennas and the ELT (RADIO is the AXIS COM connector)
import { POS, ft, PSI, pitotRoute, staticRoute, psBranches, ROUTES, ROUTE_EXT, GEA_C, STATIC_IN, PITOT_TIP_IN } from './wpJ0_layout.js';
export const { EFIS, RADIO, BACKUP, XPDR, ADAHRS } = POS;
export const EMS = [GEA_C[0] / 12, GEA_C[1] / 12, GEA_C[2] / 12];   // H's GEA 24 (its own shelf below J's; wpH4 GEA24)
export const PITOT_TIP = POS.PITOT_TIP, STATIC = (sg) => STATIC_IN(sg).map((v) => v / 12);
const PS = Object.fromEntries(Object.entries(PSI).map(([k, v]) => [k, v.map((x) => x / 12)]));
PS.ptDrain = PS.ptTest; PS.stDrain = PS.stTest;   // the tees' capped ports are the leak-test points (the drains are at the low points: mast and port sumps)
const pitotLine = ft(pitotRoute);
const PS_RUNS = [
  { pts: pitotLine, ends: ['LEZ-34-120:P', 'LEZ-34-135:PT-IN'], ext: [1] },
  { pts: ft(psBranches[0]), ends: ['LEZ-34-135:PT-OUT1', 'LEZ-31-120:P'] },
  { pts: ft(psBranches[1]), ends: ['LEZ-34-135:PT-OUT2', 'LEZ-31-130:P'] },
  ...[-1, 1].map((sg) => ({ pts: ft(staticRoute(sg)), ends: [`LEZ-34-132:SP-${sg < 0 ? 'L' : 'R'}`, `LEZ-34-135:ST1-${sg < 0 ? 'L' : 'R'}`] })),
  { pts: ft(psBranches[2]), ends: ['LEZ-34-135:ST2-OUT1', 'LEZ-31-120:S'] },
  { pts: ft(psBranches[3]), ends: ['LEZ-34-135:ST2-OUT2', 'LEZ-31-130:S'] },
];
const tip = (sg, x, dz = 0) => { const w = wingSec(12.15); return [w.le + x * w.c, sg * 12.15, GEO.wing.z + dz]; };
// light power: block I's harness (wpI0_layout.js), through J's spar tunnel and C's systems conduit; COM coax per block J
// block I: wingtip light harness route and the light in the tip close-out (wpI0_layout.js: through the systems tunnel, root disconnect)
const lightRun = (sg) => [...LYI.R_TIP_HEAD.map(LYI.F), LYI.F([-10.3, 46.02, 35.0]), LYI.F([-10.3, 104.50, 35.0]), ...LYI.R_TIP_TAIL(sg).map(LYI.F)];
const tipLight = (sg) => { const L = LYI.TIP_LIGHT, c = L.lo.map((v, i) => (v + L.hi[i]) / 2); return { t: 'box', c: LYI.F([sg * c[0], c[1], c[2]]), d: [(L.hi[1] - L.lo[1]) / 12, (L.hi[0] - L.lo[0]) / 12, (L.hi[2] - L.lo[2]) / 12] }; };
const coaxRun = ft(ROUTES.com);
export const ANT = POS.ANT;
export const ELT_AT = POS.ELT, RCPI_AT = POS.RCPI;
const gpsAxisCoax = ft(ROUTES.gpsAxis), gpsXpdrCoax = ft(ROUTES.gpsXpdr), xpdrCoax = ft(ROUTES.xpdr), eltCoax = ft(ROUTES.eltCoax), eltRemote = ft(ROUTES.eltRemote);
void PITOT_TIP_IN;
const emsRun = [[EMS[0], EMS[1], EMS[2] - 0.05], [40.00 / 12, -10.00 / 12, 37.10 / 12], [3.6, -0.62, 2.85], [8.275, -0.80, 2.80], [10.375, -0.55, 2.80], [FW + 0.05, -0.45, 2.92], [ENG.accFace - 0.25, -0.45, ENG.crankZ - 0.05]];

// ------------------------------------------------------------------------------------------- parts
defineParts([
  // ---- panel and avionics (ATA 31 / 34 / 23 / 77)
  { ...PNL, pn: 'LEZ-31-100', name: 'Instrument panel and glareshield', kind: 'laminate', ata: 31, massEach: 2.4, meshes: /^InstrumentPanel$/, geo: [{ t: 'box', c: [PANEL_S, 0, 3.30], d: [0.04, 1.4, 0.60] }],
    blurb: 'Removable 2-BID-over-foam panel on the panel bulkhead, cut for the 11.6 in AXIS display, the G5, the ELT remote, switches, breakers and the gear crank; no radio stack (COM, audio and the transponder are remote or inside the AXIS).',
    steps: [S1('Lay up, cut instrument holes to the panel drawing, fit nutplates', ['Panel removes with 8 screws', 'Every cut-out deburred and edge-sealed'])], src: { mass: 'ASSUMED' } },
  { ...PNL, pn: 'LEZ-31-110', name: 'Garmin AXIS GDU 116C 11.6 in display: PFD / MFD / EIS, IFR WAAS GPS, 10 W COM, 4-place audio panel', kind: 'cots', ata: 31, nha: 'LEZ-31-100', massEach: 5.0,
    geo: [{ t: 'box', c: EFIS, d: [0.24, 0.93, 0.62] }], faces: [{ draw: 'axis', c: [3.432, EFIS[1], EFIS[2]], w: 0.93, h: 0.62 }],
    blurb: 'One display does the flight instruments, map, engine page, IFR GPS navigator, COM radio and intercom, so there is no radio stack. Mounts through the panel left of centre; COM coax to the winglet dipole, GPS coax to a GA 35S on the nose deck.',
    std: 'Garmin AXIS GDU 116C, 11.6 in landscape (Garmin 010-03001-00 TSO unit; Aircraft Spruce 11-21145 experimental listing). Requires a GA 35S WAAS antenna and a VHF COM antenna. Pin assignments in this model are the LEZ interface definition: build the harness to the Garmin AXIS installation manual.',
    src: { mass: 'ASSUMED (G3X GDU 460 is 4.6 lb without the integrated GPS / COM / audio)', product: 'Garmin AXIS announcement, 8 Jul 2026; Garmin AXIS pilot\'s guide 190-03123-21' } },
  { ...PNL, pn: 'LEZ-31-120', name: 'Garmin GSU 25C ADAHRS (with GMU 11 magnetometer and GTP 59 OAT probe)', kind: 'cots', ata: 31, nha: 'LEZ-31-100', massEach: 0.6, geo: [{ t: 'box', c: ADAHRS, d: [0.35, 0.25, 0.15] }],
    ports: { P: { at: PS.adP, kind: 'pitot', fit: '1/8-27 ANPT female + 1/8 NPT × 1/4 tube compression adapter (G3X IM 17.4.4)' }, S: { at: PS.adS, kind: 'pitot', fit: '1/8-27 ANPT female + 1/8 NPT × 1/4 tube compression adapter (G3X IM 17.4.4)' } },
    std: 'Garmin GSU 25C ADAHRS on the Garmin CAN bus; pitot and static ports (AOA port capped: the Long-EZ keeps its nose pitot, no GAP 26)',
    blurb: 'Air-data and attitude unit forward of the panel, right of the NB wheel well under the transponder, plumbed to pitot and static; on the CAN bus between the GEA 24 and the GMU 11 magnetometer in the left wing.', src: { mass: 'ASSUMED' } },
  { ...PNL, pn: 'LEZ-31-130', name: 'Garmin G5 standby instrument with backup battery', kind: 'cots', ata: 31, nha: 'LEZ-31-100', massEach: 1.25, ports: { P: { at: PS.bkP, kind: 'pitot', fit: '1/8 NPT barb' }, S: { at: PS.bkS, kind: 'pitot', fit: '1/8 NPT barb' } }, geo: [{ t: 'box', c: BACKUP, d: [0.25, 0.30, 0.30] }], faces: [{ draw: 'g5', c: [3.432, BACKUP[1], BACKUP[2]], w: 0.29, h: 0.29 }],
    std: 'Garmin G5 (experimental) with the optional backup battery; own pitot and static ports; on the Garmin CAN bus; 3 1/8 in round cut-out', src: { mass: 'ASSUMED' } },
  { ...PNL, pn: 'LEZ-77-100', name: 'Garmin GEA 24 engine interface and sensors (CHT, EGT, oil P/T, fuel P/flow, tach, MAP)', kind: 'cots', ata: 77, massEach: 2.2, geo: [{ t: 'box', c: EMS, d: [0.30, 0.20, 0.12] }, { t: 'path', pts: emsRun, dIn: 0.35, massPerFt: 0, cls: 'signal' }],
    std: 'Garmin GEA 24 EIS adapter on the Garmin CAN bus; probes and transducers from the GEA 24 compatible-sensor list (type J CHT, type K EGT, 0–150 psi oil, 0–30 psi fuel, 0–30 inHg MAP)',
    blurb: 'Engine interface box behind the panel; its pages show on the AXIS. Sensor harness down the left side to the firewall pass-through and out to the probes.', src: { mass: 'ASSUMED (unit + probes + harness)' } },
  { ...PNL, pn: 'LEZ-23-110', name: 'COM antenna in the right winglet, and coax', kind: 'cable', ata: 23, massEach: 1.4, geo: [{ t: 'path', pts: coaxRun, dIn: 0.20, massPerFt: 0, cls: 'rf', extSeg: [...ROUTE_EXT.com] }],
    blurb: 'Composite skins are transparent to RF, so the COM antenna is a dipole laid up inside the right winglet; RG-400 coax from the AXIS COM connector out along the right side and the wing, aft of the spar.', steps: [S1('Lay up the dipole inside the winglet before closing; route and clamp coax', ['VSWR < 2:1 across 118–137 MHz', 'Coax bend radius ≥ 10 × diameter'])], src: { mass: 'ASSUMED' } },
  { ...PNL, pn: 'LEZ-34-100', name: 'Garmin GTX 45R remote transponder: Mode S, 1090ES ADS-B Out, dual-link ADS-B In, internal WAAS GPS', kind: 'cots', ata: 34, massEach: 2.0, geo: [{ t: 'box', c: XPDR, d: [0.40, 0.30, 0.15] }],
    blurb: 'Remote-mounted behind the panel and controlled from the AXIS (squawk, traffic, FIS-B weather). Its own WAAS GPS (GA 35S antenna) is the ADS-B position source; one belly blade serves transponder and ADS-B In.', adsb: true,
    std: 'Garmin GTX 45R with GPS, experimental (010-01757-46): Mode S ES transponder, 1090ES ADS-B Out, 978 / 1090 ADS-B In, internal WAAS GPS position source for 14 CFR 91.227', src: { mass: 'ASSUMED' } },
  { ...PNL, pn: 'LEZ-34-110', name: 'Transponder / ADS-B antenna (belly blade) on a ground plane', kind: 'cots', ata: 34, nha: 'LEZ-34-100', massEach: 0.5, geo: [{ t: 'box', c: ANT.xpdr, d: [0.20, 0.06, 0.25], external: true /* blade below the belly */ }, { t: 'box', c: [ANT.xpdr[0], 0.05, 2.18], d: [1.0, 0.85, 0.01], colour: 0x9aa3ad, op: 0.3 }],
    std: 'Comant CI 105 L-band blade (960–1220 MHz), BNC, or an equivalent the GTX 45R installation manual lists; 12 × 12 in 0.032 2024-T3 ground plane bonded inside the belly skin', src: { mass: 'Handbook' },
    steps: [S1('Bond the ground plane inside the belly; mount the blade through it, vertical within 2°', ['Ground plane to blade base ≤ 2.5 mΩ', 'VSWR ≤ 1.5:1 at 1030 / 1090 MHz'])] },
  { ...PNL, pn: 'LEZ-34-112', name: 'Garmin GA 35S GPS antenna for the GTX 45R (nose deck, forward)', kind: 'cots', ata: 34, nha: 'LEZ-34-100', massEach: 0.6, geo: [{ t: 'box', c: ANT.gpsXpdr, d: [0.39, 0.29, 0.05] }, { t: 'box', c: [ANT.gpsXpdr[0], 0, ANT.gpsXpdr[2] - 0.05], d: [0.50, 0.50, 0.01], colour: 0x9aa3ad, op: 0.3 }],
    std: 'Garmin GA 35S WAAS GPS antenna (010-02639-00), 4 × #8-32, TNC; ≥ 8 in ground plane inside the deck (G3X IM 20.4.5)', src: { mass: 'ASSUMED' },
    steps: [S1('Mount on the nose top deck, level within 5°, 12 in from the GA 35S', ['Clear view of the sky above 5° elevation in level attitude', 'Ground plane bonded'])] },
  { ...PNL, pn: 'LEZ-34-114', name: 'Garmin GA 35S WAAS antenna for the AXIS IFR GPS (nose deck, aft)', kind: 'cots', ata: 34, nha: 'LEZ-31-110', massEach: 0.6, geo: [{ t: 'box', c: ANT.gpsAxis, d: [0.39, 0.29, 0.05] }, { t: 'box', c: [ANT.gpsAxis[0], 0, ANT.gpsAxis[2] - 0.04], d: [0.67, 0.67, 0.01], colour: 0x9aa3ad, op: 0.3 }],
    std: 'Garmin GA 35S WAAS antenna (installation manual 190-02466-00), TNC; required by the IFR AXIS variants; 8 in square ground plane inside the deck', src: { mass: 'ASSUMED' },
    steps: [S1('Mount on the nose top deck ahead of the canopy, level within 5°', ['Sky view above 5° elevation', '≥ 2 ft from the COM and ELT antennas'])] },
  { ...PNL, pn: 'LEZ-34-111', name: 'Antenna coax: transponder, GPS (AXIS), GPS (GTX 45R)', kind: 'harness', ata: 34, nha: 'LEZ-34-100', massItem: 'panel', massEach: 0,
    geo: [xpdrCoax, gpsAxisCoax, gpsXpdrCoax].map((pts) => ({ t: 'path', pts, dIn: 0.20, massPerFt: 0, cls: 'rf', extSeg: [pts.length - 1] })),   // the last segment reaches the antenna connector at the skin
    steps: [S1('Cut RG-400 to the routed length, fit M39012 connectors with the maker\'s crimp tooling; clamp every 12 in', ['Each run swept for loss / VSWR after installation', 'No coax bend tighter than 10 × OD'])], src: { mass: 'Wire list × coax mass' } },
  { ...CAB, pn: 'LEZ-25-160', name: 'ELT, 406 / 121.5 MHz (ACK E-04) with panel remote switch', kind: 'cots', ata: 25, massEach: 1.9, geo: [{ t: 'box', c: ELT_AT, d: [0.45, 0.25, 0.20] }, { t: 'box', c: RCPI_AT, d: [0.08, 0.12, 0.08] }], faces: [{ draw: 'elt', c: [3.432, RCPI_AT[1], RCPI_AT[2]], w: 0.12, h: 0.10 }],
    std: 'ACK Technologies E-04 121.5 / 406 MHz ELT, tray and straps, remote control E-04.5.1 on the panel, plug-in audible alert; registered with NOAA (14 CFR 91.207)', elt: true,
    blurb: 'Mounted on the bulkhead behind the rear seat with its long axis fore-and-aft, close to its antenna; remote ON / ARM / TEST switch and indicator on the panel.', src: { mass: 'ACK data: ELT and battery 1.6 lb, tray and straps 0.2 lb; remote and alert ASSUMED' },
    steps: [S1('Fit the tray to the bulkhead with the arrow forward; strap the ELT; connect remote cable and antenna coax', ['Tray carries 100 g without yielding (maker\'s test)', 'Self-test passes; 406 registration current'])] },
  { ...CAB, pn: 'LEZ-25-161', name: 'ELT whip antenna on the turtleback (ACK E-04.8)', kind: 'cots', ata: 25, nha: 'LEZ-25-160', massEach: 0.3, external: true,
    geo: [{ t: 'cyl', a: ANT.elt, b: [ANT.elt[0] + 0.55, 0, ANT.elt[2] + 1.55], r: 0.015 }, { t: 'box', c: [ANT.elt[0], 0, ANT.elt[2] - 0.05], d: [0.67, 0.50, 0.01], colour: 0x9aa3ad, op: 0.3 }],
    std: 'ACK E-04.8 whip, 20.625 in swept 20°, 250 kt (ACK kit sheet); BNC; six 12 in copper-tape radials inside the turtleback skin (ACK: 24 in plane on a non-conductive surface)', src: { mass: 'ACK data 2.1 oz + doubler and plane' } },
  { ...CAB, pn: 'LEZ-25-162', name: 'ELT coax and remote cable', kind: 'harness', ata: 25, nha: 'LEZ-25-160', massEach: 0,
    geo: [{ t: 'path', pts: eltCoax, dIn: 0.20, massPerFt: 0, cls: 'rf', extSeg: [eltCoax.length - 1] }, { t: 'path', pts: eltRemote, dIn: 0.20, massPerFt: 0, cls: 'signal' }],
    steps: [S1('Route the remote cable down the left side with the console harness; coax short and direct to the antenna', ['Remote ON / ARM / TEST functions checked', 'Coax ≥ 2 ft (ACK minimum), loss ≤ 2 dB at 406 MHz'])], src: { mass: 'Wire list × gauge mass' } },
  { ...PNL, pn: 'LEZ-34-120', external: true /* pitot mast */, name: 'Pitot tube (nose)', kind: 'machined', ata: 34, massEach: 0.3, meshes: /^Pitot$/, geo: [{ t: 'cyl', a: [-0.35, 0, PITOT_TIP[2]], b: PITOT_TIP, r: 0.02 }], material: '6061', ports: { P: { at: PITOT_TIP, kind: 'pitot', fit: '1/4 in barb, drain hole aft of the tip' } }, steps: [S1('Bond the pitot mast into the nose tip, aligned with the waterline', ['Tube within 1° of the flight path at cruise'])], src: { mass: 'ASSUMED' } },
  { ...PNL, pn: 'LEZ-34-130', name: 'Pitot and static lines, flush static ports L/R teed', kind: 'line', ata: 34, massEach: 0.5,
    material: '1/4 in nylon tube (SAE J844 type B)',
    geo: PS_RUNS.map((r) => ({ t: 'path', pts: r.pts, dIn: 0.25, massPerFt: 0, cls: 'pitot', extSeg: r.ext || [], ends: r.ends, endFit: ['1/4 in tube nut + sleeve', '1/4 in tube nut + sleeve'] })),
    blurb: 'Static ports flush on both fuselage sides ahead of the canopy, teed so sideslip errors cancel. Pitot from the nose tube. Drain loops at the low points.',
    steps: [S1('Install lines with drain tees at the low points', ['Static leak test: ≤ 100 ft loss in 1 min at 1,000 ft above field (14 CFR 23.1325(b)(2)(i))']), S1('Calibrate airspeed in flight (GPS box method)', ['Error table recorded in the POH'])], src: { mass: 'ASSUMED' } },
  { ...PNL, pn: 'LEZ-34-132', name: 'Flush static ports (L/R)', kind: 'machined', ata: 34, nha: 'LEZ-34-130', material: '6061', qty: 2, massEach: 0.03,
    geo: [-1, 1].map((sg) => ({ t: 'cyl', a: STATIC(sg), b: ft(staticRoute(sg))[0], r: 0.03 })),
    ports: { 'SP-L': { at: ft(staticRoute(-1))[0], kind: 'pitot', fit: '1/4 in barb' }, 'SP-R': { at: ft(staticRoute(1))[0], kind: 'pitot', fit: '1/4 in barb' } },
    blurb: 'Turned button with a 1/16 in hole, bonded flush in the fuselage side; the face is not painted over.', steps: [S1('Turn to the drawing; bond flush ±0.005 in', ['Hole clear and sharp-edged', 'Face flush with the skin'])], src: { mass: 'Handbook' } },
  { ...PNL, pn: 'LEZ-34-135', name: 'Pitot and static tees with drains', kind: 'cots', ata: 34, nha: 'LEZ-34-130', massEach: 0.10, std: 'Poly-Flo 1/4 in compression tee (pitot); compression tee × 2 (static, close-coupled); capped test ports (AN824 flare tees do not seal on nylon)',
    geo: [{ t: 'sphere', c: PS.ptIn, r: 0.03 }, { t: 'sphere', c: PS.st1Out, r: 0.03 }, { t: 'sphere', c: PS.st2Out1, r: 0.03 }],
    ports: { 'PT-IN': { at: PS.ptIn, kind: 'pitot' }, 'PT-OUT1': { at: PS.ptOut1, kind: 'pitot' }, 'PT-OUT2': { at: PS.ptOut2, kind: 'pitot' }, 'PT-DRAIN': { at: PS.ptDrain, kind: 'pitot', open: true },
      'ST1-L': { at: PS.st1L, kind: 'pitot' }, 'ST1-R': { at: PS.st1R, kind: 'pitot' }, 'ST1-OUT': { at: PS.st1Out, kind: 'pitot' }, 'ST2-IN': { at: PS.st2In, kind: 'pitot' }, 'ST2-OUT1': { at: PS.st2Out1, kind: 'pitot' }, 'ST2-OUT2': { at: PS.st2Out2, kind: 'pitot' }, 'ST-DRAIN': { at: PS.stDrain, kind: 'pitot', open: true } },
    flow: [['PT-IN', 'PT-OUT1'], ['PT-IN', 'PT-OUT2'], ['ST1-L', 'ST1-OUT'], ['ST1-R', 'ST1-OUT'], ['ST2-IN', 'ST2-OUT1'], ['ST2-IN', 'ST2-OUT2']], mates: [['LEZ-34-135:ST1-OUT', 'LEZ-34-135:ST2-IN']], src: { mass: 'Handbook' } },
  // ---- lights (ATA 33)
  { ...PNL, pn: 'LEZ-33-100', external: true /* wingtip lights */, name: 'Position / strobe LED combo lights, wingtips (L red, R green, aft white)', kind: 'cots', ata: 33, qty: 2, massEach: 0.4, meshes: /^NavLights$/,
    geo: [-1, 1].map(tipLight),
    blurb: 'Combination position / anti-collision units on each wingtip covering the forward and aft sectors (FAR 23.1385–23.1401 yardstick, per the unit maker\'s data).', lights: true, src: { mass: 'ASSUMED' } },
  { ...PNL, pn: 'LEZ-33-110', name: 'Wingtip light harness (16 AWG, circuit P204)', kind: 'harness', ata: 33, qty: 2, massEach: 0.9,
    geo: [-1, 1].map((sg) => { const H = LYI.R_TIP_HEAD.length + 2; return { t: 'path', pts: lightRun(sg), dIn: 0.20, massPerFt: 0, cls: 'power', extSeg: LYI.tunnelSegs(LYI.R_TIP_TAIL(sg)).map((k) => H + k) }; }), steps: [S1('Pull the pair through conduit with the rudder cable; terminate at the tip', ['Continuity and ≥ 10 MΩ insulation', 'Clamped clear of the cable and the coax'])], src: { mass: '16 AWG pair, 16.5 ft each side' } },
  { ...PNL, pn: 'LEZ-33-120', name: 'Landing light, LED, in the nose', kind: 'cots', ata: 33, massEach: 0.6, geo: [{ t: 'box', c: [0.45, 0, 2.66], d: [0.10, 0.16, 0.12] }], src: { mass: 'ASSUMED' } },
  // ---- canopy (ATA 52 / 56)
  { ...CAB, pn: 'LEZ-56-100', name: 'Canopy: acrylic bubble in a glass frame, faired to the fuselage OML, right-side hinge', kind: 'laminate', ata: 56, massEach: 21.0, meshes: /^Canopy$/, oml: true,
    geo: LATCH_S.map((ls) => ({ t: 'box', c: [ls, 0, canopySill(ls)[2] + 0.30], d: [0.2, 1.6, 0.05] })),
    blurb: 'One-piece acrylic bubble over both cockpits, bonded into a BID frame whose outer surface is the fuselage section raised by a smooth bump: zero height and zero slope where it meets the nose deck and the turtleback, zero at the sills, so the closed canopy continues the outer mould line without a step. Piano hinge along the right sill; gas strut assists opening and holds it at 80°; a check cable is the open stop (LEZ-56-130). Latched by three hooks on the left longeron (LEZ-52-100).',
    canopy: { mass: 21.0, cgAbove: 0.45 },
    steps: [S1('Trim the bubble; bond into the frame with flexible adhesive', ['No stress crazing at the bond line', 'Closed canopy flush with the fuselage at the sills and both ends ±1/16 in'])], src: { mass: 'ASSUMED (1/8 in acrylic over ≈ 19 ft²)' } },
  { ...CAB, pn: 'LEZ-56-110', name: 'Canopy hinge: piano hinge along the right sill', kind: 'cots', ata: 56, nha: 'LEZ-56-100', massEach: 0.6, meshes: /^CanopyHinge$/,
    geo: [{ t: 'cyl', a: HINGE[0], b: HINGE[1], r: 0.02 }], std: 'MS20001-6 piano hinge, 2024-T3, 1.5 in open width, 0.063 in pin; riveted to the frame with MS20470AD4 and flox-potted to the sill longeron with AN525 screws into nutplates', src: { mass: 'Handbook (≈ 0.08 lb/ft)' } },
  { ...CAB, pn: 'LEZ-56-120', name: 'Canopy gas strut with end fittings (right side)', kind: 'cots', ata: 56, nha: 'LEZ-56-100', massEach: 0.5, anim: 'canopy-strut',
    geo: [{ t: 'cyl', a: [STRUT.s, HINGE[0][1] + STRUT.fixed[0], HINGE[0][2] + STRUT.fixed[1]], b: [STRUT.s, HINGE[0][1] + STRUT.move[0], HINGE[0][2] + STRUT.move[1]], r: 0.03 }],
    scd: { spec: 'Gas spring, 45 lb nominal extended force (canopy-strut check), progressive ≤ 30 %, 10 mm ball-socket ends, stroke ≥ the geometry stroke, internal end stop rated ≥ 150 lb tension; bracket on the right side wall, ball stud on the canopy frame', envelope: [12, 0.9, 0.9] }, src: { mass: 'ASSUMED' } },
  // ---- cabin (ATA 25)
  { ...CAB, pn: 'LEZ-25-100', name: 'Cockpit interior: floor pans, consoles, thigh supports', kind: 'laminate', ata: 25, massEach: 6.0, meshes: /^CockpitTub$/, geo: [{ t: 'box', c: [4.4392, 0, 2.32], d: [6.0, 1.4, 0.05] }],
    steps: [S1('Lay up 1 BID over foam; bond in', ['No sharp edges where hands or feet go'])], src: { mass: 'ASSUMED' } },
  { ...CAB, pn: 'LEZ-25-110', name: 'Armrests and side consoles', kind: 'laminate', ata: 25, massEach: 2.6, meshes: /^Armrests$/, geo: [-1, 1].map((sg) => ({ t: 'box', c: [4.5007, sg * 0.82, 3.20], d: [2.6, 0.2, 0.12] })), steps: [S1('Lay up 1 BID over foam; bond to the fuselage sides', ['Stick and throttle clear through full travel'])], src: { mass: 'ASSUMED' } },
  { ...CAB, pn: 'LEZ-25-120', name: 'Front seat cushions and headrest', kind: 'install', ata: 25, massEach: 3.5, meshes: /^FrontSeat$/, geo: [{ t: 'box', c: [4.675, 0, 2.55], d: [1.3, 1.2, 0.3] }],
    blurb: 'Foam cushions on the structural seat back; fire-retardant upholstery (self-extinguishing, FAR 23.853 yardstick).', fr: true, steps: [S1('Cut foam, cover in fire-retardant fabric; fit', ['Fabric certificate on file (burn test)'])], src: { mass: 'ASSUMED' } },
  { ...CAB, pn: 'LEZ-25-121', name: 'Rear seat cushions', kind: 'install', ata: 25, massEach: 3.0, meshes: /^RearSeat$/, geo: [{ t: 'box', c: [7.475, 0, 2.40], d: [1.15, 1.4, 0.3] }], fr: true, steps: [S1('Cut foam, cover in fire-retardant fabric; fit', ['Fabric certificate on file (burn test)'])], src: { mass: 'ASSUMED' } },
  { ...CAB, pn: 'LEZ-25-130', name: 'Restraint harnesses, front 4-point and rear 4-point', kind: 'cots', ata: 25, hide3D: true, qty: 2, massEach: 1.9, geo: [{ t: 'box', c: [4.775, 0, 3.0], d: [0.1, 0.8, 0.1] }, { t: 'box', c: [7.875, 0, 3.0], d: [0.1, 0.9, 0.1] }],
    blurb: 'Shoulder harness and lap belt in each seat, anchored to the flox-potted hard-points checked by fus-belt.', src: { mass: 'ASSUMED' } },
  { ...CAB, pn: 'LEZ-25-140', name: 'Baggage net and tie-downs (rear seat sides / strake bins)', kind: 'install', ata: 25, massEach: 0.6, geo: [{ t: 'box', c: [8.175, 0.75, 2.8], d: [0.8, 0.05, 0.4] }],
    tie: { n: 4, insertD: 0.75, embed: 0.5, bag: 25 },
    blurb: 'Cargo net on four flox-potted inserts; holds the placarded 25 lb at 9 g forward (FAR 23.561 / 23.787 yardstick).', steps: [S1('Flox the four inserts; fit net; placard 25 lb', ['Proof load 50 lb on each insert'])], src: { mass: 'ASSUMED' } },
  { ...CAB, pn: 'LEZ-25-150', name: 'Upholstery, sound and cabin vent', kind: 'install', ata: 25, massEach: 3.0, geo: [-1, 1].map((sg) => ({ t: 'box', c: [4.3777, sg * 0.90, 2.95], d: [5.4, 0.02, 0.70] })), hide3D: true /* side liners and floor carpet: mass only (the cockpit tub shows the finished interior) */, fr: true, steps: [S1('Fit upholstery panels and the cabin vent', ['Fabric certificate on file', 'Vent closes fully'])], src: { mass: 'ASSUMED' } },
]);

// ------------------------------------------------------------------------------------------- canopy strut
const rotOpen = ([y, z], th) => [y * Math.cos(th) + z * Math.sin(th), -y * Math.sin(th) + z * Math.cos(th)]; // opening lifts the inboard (−y) side
/** moments about the right-sill hinge (lb·ft), positive = closing; strut force picked as the largest that still keeps
 *  ≥ 8 lb·ft closing moment when closed (so the unlatched canopy stays down), rounded down to 5 lb */
export function canopyStrut() {
  const P = partByPN('LEZ-56-100'), W = P.canopy.mass, s = STRUT.s, sill0 = canopySill(s, 1), sillL = canopySill(s, -1);
  const span = sill0[1] - sillL[1], cg = [-(span / 2), P.canopy.cgAbove], arm = span;
  const Mw = (th) => { const [y, z] = rotOpen(cg, th); return W * -y; }; // weight acts down at lateral offset y (−y inboard closes)
  const Ms = (F, th) => { const A = STRUT.fixed, B = rotOpen(STRUT.move, th), u = [B[0] - A[0], B[1] - A[1]], L = Math.hypot(...u); return { M: -F * (B[0] * u[1] - B[1] * u[0]) / L, L }; }; // opening is clockwise in (y, z) for a right-side hinge
  const ths = Array.from({ length: 81 }, (_, i) => i * Math.PI / 180);
  const net = (F) => ths.map((th) => Mw(th) - Ms(F, th).M);
  let F = 5; while (F < 400 && net(F + 5)[0] >= 8) F += 5;
  const n = net(F), M0 = n[0], push = Math.max(...n.map((m) => m / arm)), Mopen = -n[80];
  const terms = [{ mode: 'push to open ≤ 15 lb', ms: 15 / Math.max(push, 1e-6) - 1 }, { mode: 'stays shut when unlatched (≥ 6 lb·ft)', ms: M0 / 6 - 1 }, { mode: 'holds open at the 80° stop', ms: Mopen > 0 ? Mopen / 1.0 - 1 : -1 }];
  const gov = terms.sort((a, b) => a.ms - b.ms)[0];
  return { W, cg, F, arm, M0, push, Mopen, L0: Ms(F, 0).L, L1: Ms(F, ths[80]).L, gov, ms: gov.ms };
}

// ------------------------------------------------------------------------------------------- checks
registerChecks('wp4', (d, lc, Z, M) => {
  if (lc.id !== 'W1-S1') return [];
  const out = [], P = partByPN('LEZ-56-100');
  // canopy gas strut: canopy stays shut when unlatched, opens with a light push, holds itself open at the stop
  { const C = canopyStrut(), r = mk('fuselage', 'cab-canopy-strut', 'Canopy strut: stays shut unlatched, push to open ≤ 15 lb, holds open', lc, 'right sill hinge, 0–80°', C.gov.mode, C.ms, {
      formula: 'M_w(θ) = W·(y_cg cosθ − z_cg sinθ);  M_s(θ) = F·(r_h × û_strut);  push = max(M_w − M_s)/arm;  MS = min(15 lb / push, M_net(0) / 6 lb·ft, M_open(80°) / 1 lb·ft) − 1',
      inputs: [['Canopy weight', C.W, 'lb', P.canopy.src || 'ASSUMED'], ['CG from hinge (inboard, up)', `${(C.cg[0] * 12).toFixed(1)} / ${(C.cg[1] * 12).toFixed(1)} in`, 'text', 'GEOMETRY'], ['Strut force (selected)', C.F, 'lb', 'DESIGN'],
        ['Strut length closed / open', `${(C.L0 * 12).toFixed(1)} / ${(C.L1 * 12).toFixed(1)} in`, 'text', 'GEOMETRY'], ['Push arm (left frame)', C.arm * 12, 'in', 'GEOMETRY']],
      result: [['Net closing moment, closed', C.M0, 'lb·ft'], ['Peak push to open', C.push, 'lb'], ['Net opening moment at 80°', C.Mopen, 'lb·ft']] });
    r.sys = 'LEZ-56-120'; out.push(r); }
  // baggage restraint
  { const T = partByPN('LEZ-25-140').tie, P = 9 * T.bag * (d.KD ?? 1), Pa = psi(M.FLOX.shear) * Math.PI * T.insertD * T.embed * T.n;
    const r = mk('fuselage', 'cab-baggage', 'Baggage net tie-downs at 9 g forward', lc, 'rear-seat baggage', 'flox insert shear-out', Pa / P - 1, {
      formula: 'P = 9 · W_bag · KD (ultimate × design factor);  P_allow = n · τ_flox · π · D · L',
      inputs: [['Placarded baggage', T.bag, 'lb', T.src ? 'DESIGN: placard' : 'ASSUMED'], ['Inserts', T.n, '', T.src ? 'DESIGN' : 'ASSUMED'], ['Insert D × embed', `${T.insertD} × ${T.embed} in`, 'text', T.src ? 'DESIGN' : 'ASSUMED'], ['Flox shear', psi(M.FLOX.shear), 'psi', T.src ? allowB(Pa / P - 1, 'resin shear (flox)') : 'ASSUMED']],
      result: [['Ultimate load', P, 'lb'], ['Allowable', Pa, 'lb']] });
    r.sys = 'LEZ-25-140'; out.push(r); }
  return out;
});

// ------------------------------------------------------------------------------------------- schematics
defineGraph('avionics', {
  title: 'Avionics, air data, antennas and lights (ATA 23 / 25 / 31 / 33 / 34 / 77)',
  nodes: [
    { id: 'PT', label: 'Pitot', sub: 'nose', col: 0, row: 0, pn: 'LEZ-34-120' },
    { id: 'SP', label: 'Static ports', sub: 'L/R teed', col: 0, row: 1, pn: 'LEZ-34-130' },
    { id: 'AD', label: 'GSU 25C ADAHRS', sub: 'GMU 11 · GTP 59', col: 1, row: 0, pn: 'LEZ-31-120' },
    { id: 'BK', label: 'G5 standby', sub: 'backup battery', col: 1, row: 1, pn: 'LEZ-31-130' },
    { id: 'EM', label: 'GEA 24 EIS', sub: 'probes on the engine', col: 1, row: 2, pn: 'LEZ-77-100' },
    { id: 'EF', label: 'AXIS GDU 116C', sub: 'PFD·MFD·GPS·COM·audio', col: 2, row: 1, pn: 'LEZ-31-110' },
    { id: 'XP', label: 'GTX 45R', sub: '1090ES Out · In · GPS', col: 3, row: 2, pn: 'LEZ-34-100' },
    { id: 'G1', label: 'GA 35S', sub: 'nose deck', col: 3, row: 0, pn: 'LEZ-34-114' },
    { id: 'AN', label: 'COM dipole', sub: 'right winglet', col: 3, row: 1, pn: 'LEZ-23-110' },
    { id: 'G2', label: 'GA 35S', sub: 'nose deck', col: 4, row: 1, pn: 'LEZ-34-112' },
    { id: 'XA', label: 'L-band blade', sub: 'belly', col: 4, row: 2, pn: 'LEZ-34-110' },
    { id: 'EL', label: 'ELT E-04', sub: 'whip on turtleback', col: 4, row: 0, pn: 'LEZ-25-160' },
    { id: 'LT', label: 'Wingtip lights', sub: 'position + strobe', col: 0, row: 2, pn: 'LEZ-33-100' },
  ],
  edges: [{ a: 'PT', b: 'AD', cls: 'pitot' }, { a: 'SP', b: 'AD', cls: 'pitot' }, { a: 'AD', b: 'EF', cls: 'signal', label: 'CAN' }, { a: 'BK', b: 'EF', cls: 'signal', label: 'CAN' }, { a: 'EM', b: 'EF', cls: 'signal', label: 'CAN' },
    { a: 'EF', b: 'XP', cls: 'signal', label: 'RS-232' }, { a: 'EF', b: 'G1', cls: 'rf' }, { a: 'EF', b: 'AN', cls: 'rf' }, { a: 'XP', b: 'G2', cls: 'rf' }, { a: 'XP', b: 'XA', cls: 'rf' }],
})

// ------------------------------------------------------------------------------------------- requirements closed by WP4
defineReqs([
  { id: 'R-AV-1', closed: true, verify: () => ({ ok: !!partByPN('LEZ-34-130'), detail: 'flush static ports both sides, teed; drain tees; leak test and in-flight calibration in the process steps' }) },
  { id: 'R-AV-2', closed: true, verify: () => ({ ok: !!partByPN('LEZ-33-100')?.lights, detail: 'combination position / strobe units on both wingtips; 16 AWG circuit P204 (ΔV within limit)' }) },
  { id: 'R-AV-3', closed: true, verify: () => ({ ok: !!partByPN('LEZ-34-100')?.adsb, detail: 'GTX 45R 1090ES ADS-B Out with its internal WAAS GPS position source (GA 35S antenna)' }) },
  { id: 'R-AV-4', ref: '91.207', title: 'Emergency locator transmitter installed', method: 'inspection', closed: true, verify: () => ({ ok: !!partByPN('LEZ-25-160')?.elt, detail: 'ACK E-04 406 / 121.5 MHz ELT aft, whip on the turtleback, remote on the panel' }) },
  { id: 'R-AV-5', ref: 'install manuals / AC 43.13-2B', title: 'Antenna installation: coax loss within budget, GPS antennas separated from each other and from transmitting antennas', checks: /^rf-(loss|sep)$/, method: 'analysis', closed: true },
  { id: 'R-CAB-1', checks: /^cab-canopy-strut$/, closed: true, verify: () => { const L = partByPN('LEZ-52-100').latch; return { ok: L.overCentreDeg >= 3 && L.hooks >= 3, detail: `${L.hooks}-hook latch, toggle ${L.overCentreDeg}° over centre (cannot back-drive); SC-1 safety catch; push-up opening with the strut; CANOPY annunciator and tone until the rod is home (detail: R-CAB-3, wp14)` }; } },
  { id: 'R-CAB-2', checks: /^cab-baggage$/, closed: true, verify: () => ({ ok: ['LEZ-25-120', 'LEZ-25-121', 'LEZ-25-150'].every((pn) => partByPN(pn)?.fr), detail: 'self-extinguishing upholstery and cushions; baggage netted and placarded' }) },
]);
adoptMass(['nose', 'panel', 'cabin']);
