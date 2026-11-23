// WPJ0 — block J layout: where the avionics, the pitot-static system, the antennas and the ELT sit, and the routes of
// J's lines and harnesses. wp4_avionics_cabin.js and wp7_wiring.js (where J's system records live) take their positions
// and routes from here, so every bulkhead and panel hole table that reads the routed lines at import time sees the same
// geometry (ICD J warning 1). This module imports nothing from the other blocks; the panel layout it matches (block B's
// CUTS in wpB3_panel.js, aft face FS 41.18) is copied as numbers and checked against B's live table by the records'
// interface checks (site/parts/wpJ1_avionics.js). Inches in the comments; the exports are model feet [FS, BL, WL].
// Vendor envelopes and data carry their sources (research of 2026-11-19, docs/blocks/j_avionics.md "Source audit"); what was
// not found in public sources (the AXIS installation drawing, connector bodies, switch bodies) stays marked BOUND. Notional,
// not for construction.
import { GEO, wingSec, FIXED, BASE_MAT, FUS_SHAPE } from '../structures.js';
import { FRAMES } from '../plybook.js';

const r4 = (x) => Math.round(x * 1e4) / 1e4;
/** inches [FS, BL, WL] → model feet */
export const F = (fs, bl, wl) => [fs / 12, bl / 12, wl / 12];
export const IN = (p) => p.map((v) => v * 12);
export const SHELL = FIXED.fuselage.coreIn + 2 * FIXED.fuselage.faceBID * BASE_MAT.BID.t;   // shell thickness (in)

// ------------------------------------------------------------------------------------------- vendor envelopes
// in: [width across, depth along the mounting axis, height] and mass (lb); src on each (accessed 2026-11-19)
const G3X = 'Garmin G3X IM 190-01115-01 rev AV';
export const ENV = {
  axis: { bezel: [11.16, 0.30, 7.44], collar: [10.20, 0.63, 6.48], can: [10.20, 2.67, 2.60], mass: 5.0, cost: 16560,
    why: 'Garmin AXIS GDU 116C: no public installation drawing (BOUND, not found: measure on receipt; the nearest published unit, the GDU 460, is 10.85 × 7.82 × 3.57 in, 4.81 lb); bezel as B\'s record, LCD collar through the cut-out 0.63 in behind the bezel face, electronics can over the upper 2.60 in only (a stated envelope the unit must meet)',
    src: 'cost: Aircraft Spruce 11-21145 (010-03001-00) $16,560 (Garmin reference $18,400 + install kit $400, AXIS Build-A-System Guide 7.2026); mass 5.0 lb BOUND (not published)' },
  // with its backup battery (Miles: kept, 2026-11-19) the G5 is 3.03 in deep, 0.58 in more than the 2.45 typed earlier
  g5: { bezel: [3.42, 0.40, 3.60], can: { d: 3.10, L: 3.03 }, mass: 1.0, cost: 2060, why: 'Garmin G5 (experimental, 010-01485-01) with the backup battery: 3 1/8 in round can 3.03 in deep (2.61 without the battery), bezel 3.42 W × 3.60 H, 1.0 lb with connector and mounting ring; 3 × #6-32 into mounting ring 115-02251-03; 9-pin J51 at the back; P and S ports 1/8-27 ANPT female',
    src: 'Garmin G5 IM 190-02072-01 rev 12, Table 2-3, sec. 3.6; cost AXIS Build-A-System Guide 7.2026 (G5 $1,660 + install kit $120 + battery $280)' },
  gsu: { box: [2.61, 4.00, 2.12], mass: 0.68, cost: 990, why: 'Garmin GSU 25C ADAHRS (part swap from the GSU 25D: Garmin pairs the GMU 11 with the 25C): 4.0 W × 2.12 H × 2.61 D in with its connector (GSU 25 table), laid with its 4.0 in side fore and aft; 0.68 lb with connectors; ports 1/8-27 ANPT female (adapters to 1/4 tube); AN3 mounting bolts, 20–25 in-lb. Connector and port faces as drawn: BOUND, confirm against the GSU 25C outline before drilling',
    src: G3X + ' Table 2-4 p. 2-33, sec. 17.4.4, Fig. 17-5; cost AXIS Build-A-System Guide 7.2026 (GSU 25C 010-01071-55 $990; LRU kit GSU 25C + GMU 11 + GTP 59, 010-04556-00, $1,860)' },
  gmu: { box: [3.78, 2.74, 0.93], mass: 0.302, cost: 410, why: 'Garmin GMU 11: 2.74 W × 3.78 D × 0.93 H in, laid with its length across (rev C: so it fits A\'s pocket), connector J111 (9-pin) on the inboard end, orientation set in the AXIS configuration; 0.302 lb with the connector kit; 4 × 6-32 × 0.500 pan-head stainless screws with #6 SS washers and nylon-lock nuts (kit 011-04349-90)',
    src: G3X + ' Table 2-4 p. 2-32, sec. 13, Table 13-3; G5 IM App. D Table D-5; cost AXIS Build-A-System Guide 7.2026 (GMU 11 $410, install kit $75)' },
  gtp: { shank: 0.375, probe: 0.25, L: 1.25, mass: 0.30, cost: 460, why: 'Garmin GTP 59 OAT probe: 3/8 in threaded shank through the skin, Ø 1/4 probe 1.25 in exposed (envelope BOUND: not found, measure on receipt); 0.3 lb including its 10 ft lead (the lead is not counted again in a harness); nut 100 ± 20 in-lb; bonded < 2.5 mΩ through a grounded metal strap',
    src: G3X + ' Table 2-4 p. 2-33, sec. 18.3; G5 MM sec. 4.3, 6.8; cost: the LRU kit share ($1,860 − $990 − $410)' },
  gtx: { box: [9.90, 6.30, 1.70], mass: 2.90, cost: 4860, why: 'Garmin GTX 45R with GPS: 6.3 W × 9.9 L × 1.7 H in with its mount and connector backshells, laid with its length across; 2.9 lb with tray, backplate and connectors; BNC (RF) and TNC (GPS)',
    src: G3X + ' Table 2-4 p. 2-33; GTX 35R/45R IM 190-01499-10 general specifications; cost AXIS Build-A-System Guide 7.2026 (010-01757-46 $4,860)' },
  ga35: { body: [3.34, 4.71, 1.00], mass: 0.52, cost: 400, why: 'Garmin GA 35S (both sites: Garmin calls for the GA 35S on the IFR AXIS and on the GTX 45R with GPS): 3.34 W × 4.71 D × 1.00 H above the mounting surface, 4 × #8-32 × 1.00 SS pan head (12–15 in-lb), single TNC, bond ≤ 2.5 mΩ, 0.52 lb',
    src: 'Garmin GA 35S IM 190-02466-00 rev 3, Table 1-4, Table 3-1; G3X IM sec. 20.5; cost AXIS Build-A-System Guide 7.2026 (GA 35S 010-02639-00 $400)' },
  blade: { base: [1.20, 3.40, 0.20], fin: [0.25, 2.40, 3.03], mass: 0.24, cost: 239, why: 'Comant CI 105 L-band blade 960–1220 MHz: base 3.4 × 1.2 in, 3.23 in tall overall, BNC, standard two-stud mount (CI-105-16 studs ≈ 0.70 in long, 1.75 in apart; gasket and template 09-05579); 0.24 lb max',
    src: 'Comant CI 105 data sheet (Cumulus Soaring copy); cost Aircraft Spruce 11-06819 (CI-105-16) $239' },
  elt: { box: [2.85, 7.75, 2.85], tray: 0.15, mass: 1.80, cost: 1196, why: 'ACK E-04: 7.750 × 2.850 × 2.850 in, 1.6 lb with battery + 0.2 lb tray (tray envelope BOUND)',
    src: 'ACK E-04C manual E-04CM rev 1.2 sec. 12; cost Aircraft Spruce 11-13590 E-04.1 kit $1,196' },
  eltRemote: { face: [1.45, 0.20, 1.05], body: [1.15, 1.00, 0.75], mass: 0.156, why: 'ACK E-04 remote switch / indicator: 2.5 oz; with the 90° connector hood it needs 1 in rear clearance (2 in with the standard connector, which would reach C\'s cable guide); face BOUND (manual Fig. 5 is an image)', src: 'ACK E-04C manual E-04CM rev 1.2 sec. 12, sec. 2' },
  whip: { L: 20.625, sweep: 20, base: [1.25, 2.6, 0.35], mass: 0.131, cost: 113.75, why: 'ACK E-04.8 whip 20.625 in, swept 20°, 250 kt (the ACK kit sheet; the manual says 260), BNC',
    src: 'ACK E-04C manual sec. 12; ACK E-04 kit sheet; cost Aircraft Spruce (E-04.8 whip related item) $113.75' },
  warn: { face: [2.90, 0.20, 0.90], body: [2.50, 1.40, 0.50], mass: 0.18, why: 'LEZ warning unit to its SCD, sized to B\'s cut-out' },
  sw: { plate: [5.30, 0.063, 1.40], body: [0.50, 0.80, 0.55], pitch: 0.6, n: 8, mass: 0.022, why: 'MS24524-type sealed miniature toggles, body 0.50 × 0.55 × 0.80 in behind a 0.063 in plate (BOUND: not found in public sources)' },
};

// ------------------------------------------------------------------------------------------- panel layout (B, copied)
export const PANEL_AFT = 41.18, PANEL_FWD = 40.75;
// rev C: the G5 hole 0.25 in higher (WL 42.25): with the battery the 3.03 in can otherwise meets C's left pedal horn (0.16 in;
// at WL 42.25: ≥ 0.33 in, hood ≥ 0.30 in). Block B ask (docs/icd/b_cockpit.md): move CUTS 'g5' to [-6.40, 42.25, 1.5625]
// integration 2026-11-19 (ICD B-S1 closed another way): at WL 42.25 the G5's bezel comes within 0.10 in of the canopy front bow
// (B's I2 rule 0.25) and its upper corner leaves the panel outline, so the hole stays at WL 42.00 and block C's left pedal horn is
// shortened from 2.8 to 2.6 in instead (LEZ-27-150): the swept horn then clears the 3.03 in can by ≥ 0.25 in
export const CUT = { axis: [-4.03, 6.27, 37.00, 43.58], g5: [-6.40, 42.00, 1.5625], warn: [-8.10, -5.50, 39.30, 39.90], elt: [7.90, 9.10, 40.60, 41.40], sw: [3.10, 8.00, 35.00, 36.00] };
const rc = (R) => [(R[0] + R[1]) / 2, (R[2] + R[3]) / 2];
export const AXIS_C = rc(CUT.axis), WARN_C = rc(CUT.warn), ELTR_C = rc(CUT.elt), SW_C = rc(CUT.sw), G5_C = [CUT.g5[0], CUT.g5[1]];
/** the AXIS's LCD collar ends 0.20 in forward of the panel's forward face, the can over the upper 2.60 in */
export const AXIS = (() => {
  const E = ENV.axis, cTop = AXIS_C[1] + E.collar[2] / 2, collarFwd = PANEL_AFT - E.collar[1], canFwd = collarFwd - E.can[1];
  return { collarFwd, canFwd, canBot: cTop - E.can[2], top: cTop, bl: [AXIS_C[0] - E.collar[0] / 2, AXIS_C[0] + E.collar[0] / 2], bot: AXIS_C[1] - E.collar[2] / 2 };
})();
/** connectors on the can's forward face (in): J1 power / CAN / RS-232, J2 audio, J3 COM BNC, J4 GPS TNC */
export const AXIS_J = { J1: [AXIS.canFwd - 0.5, 0.4, 42.4], J2: [AXIS.canFwd - 0.5, 2.4, 42.4], J3: [AXIS.canFwd - 0.5, 4.6, 42.0], J4: [AXIS.canFwd - 0.5, -1.0, 43.0] };
/** the mating plugs and backshells: 1.0 in forward of the can's face over BL −1.6..5.4, WL 41.2–43.4 (kept clear by every J line) */
export const AXIS_PLUGS = { fs: [AXIS.canFwd - 1.0, AXIS.canFwd], bl: [-1.6, 5.4], wl: [41.2, 43.4] };

// ------------------------------------------------------------------------------------------- the avionics shelf (J)
// one shelf over the pedals in the free volume FS 28.6–37.8, WL 40.85–43.6 (ICD J-H2). Rev C (2026-11-19, source audit): the
// GTX 45R's true envelope (6.3 × 9.9 in) did not fit the old FS 30.9–36.6 shelf either way round, so the shelf runs forward to
// FS 29.0 and the GTX lies across it left of centre (its length across, FS 29.3–35.6); the GSU 25C stands right of it, its
// 4.0 in side fore and aft; the pitot and static tees behind the GTX at FS 36.1
export const SHELF = { fs: [29.00, 36.60], bl: [-8.10, 8.10], bot: 40.90, core: 0.25, nBID: 1 };
SHELF.t = SHELF.core + 2 * SHELF.nBID * BASE_MAT.BID.t; SHELF.top = r4(SHELF.bot + SHELF.t);
export const GTX_AT = { fs: [29.30, 29.30 + ENV.gtx.box[1]], bl: [-6.60, -6.60 + ENV.gtx.box[0]] };   // length across
export const GSU_AT = { fs: [31.50, 31.50 + ENV.gsu.box[1]], bl: [3.90, 3.90 + ENV.gsu.box[0]] };  // 4.0 in side fore-aft, right of the GTX
export const GEA_AT = { fs: [31.55, 38.05], bl: [-5.99, -4.09], h: 5.00 };   // H's GEA 24 (rev C: 6.5 × 1.9 × 3.0 on edge, 5.0 tall with connectors; G3X IM Table 2-4)
const zOn = (h) => SHELF.top + h / 2;
export const GTX_C = [(GTX_AT.fs[0] + GTX_AT.fs[1]) / 2, (GTX_AT.bl[0] + GTX_AT.bl[1]) / 2, zOn(ENV.gtx.box[2])];
export const GSU_C = [(GSU_AT.fs[0] + GSU_AT.fs[1]) / 2, (GSU_AT.bl[0] + GSU_AT.bl[1]) / 2, zOn(ENV.gsu.box[2])];
export const GEA_C = [34.80, -5.04, 37.10];   // rev C: H's GEA 24 on edge (true envelope)   // H's GEA 24 on H's own flange shelf (wpH4 GEA24.c, copied: H's ICD H-A1 names this as wp4 EMS); checked in LEZ-31-160 I4
const gsuAft = GSU_AT.fs[1], tz = SHELF.top + 0.33;
/** pitot-static ports and tees (in) */
export const PSI = {
  adP: [gsuAft + 0.05, 4.65, 42.05], adS: [gsuAft + 0.05, 5.75, 42.05],
  bkP: [PANEL_AFT - ENV.g5.can.L - 0.05, -6.00, 42.45], bkS: [PANEL_AFT - ENV.g5.can.L - 0.05, -6.80, 41.75],
  ptIn: [36.10, -1.20, tz], ptOut1: [36.10, -1.55, tz], ptOut2: [36.10, -1.20, tz + 0.06], ptTest: [36.10, -0.85, tz],
  st1L: [36.10, -2.70, tz], st1R: [36.10, -2.40, tz], st1Out: [35.95, -2.55, tz], st2In: [35.95, -2.55, tz], st2Out1: [35.80, -2.80, tz], st2Out2: [35.95, -2.90, tz + 0.06], stTest: [35.80, -2.30, tz],
};

// ------------------------------------------------------------------------------------------- fuselage contour helpers
function shape(fs) { const T = GEO.fuselage, s = fs / 12; for (let i = 0; i < T.length - 1; i++) if (s <= T[i + 1][0]) { const u = (s - T[i][0]) / (T[i + 1][0] - T[i][0]); return { w: (T[i][1] + (T[i + 1][1] - T[i][1]) * u) * 12, top: (T[i][2] + (T[i + 1][2] - T[i][2]) * u) * 12, bot: (T[i][3] + (T[i + 1][3] - T[i][3]) * u) * 12 }; } const l = T.at(-1); return { w: l[1] * 12, top: l[2] * 12, bot: l[3] * 12 }; }
/** half-width (in) of the fuselage contour at fs, wl, offset `off` inward (0 = OML, SHELL = inner skin) */
export function halfW(fs, wl, off = 0) { const f = shape(fs), w = f.w / 2 - off, zc = (f.top + f.bot) / 2, h = (f.top - f.bot) / 2 - off, sn = Math.min(1, Math.abs(wl - zc) / h), e = wl < zc ? FUS_SHAPE.belly : FUS_SHAPE.top; const ss = sn ** (1 / e); return w * Math.max(0, 1 - ss * ss) ** (FUS_SHAPE.side / 2); }
/** top / bottom WL (in) of the contour at fs, bl, offset inward */
export function topAt(fs, bl, off = 0) { const f = shape(fs), w = f.w / 2 - off, zc = (f.top + f.bot) / 2, h = (f.top - f.bot) / 2 - off, c = Math.min(1, Math.abs(bl) / w), cc = c ** (1 / FUS_SHAPE.side); return zc + h * Math.max(0, 1 - cc * cc) ** (FUS_SHAPE.top / 2); }
export function botAt(fs, bl, off = 0) { const f = shape(fs), w = f.w / 2 - off, zc = (f.top + f.bot) / 2, h = (f.top - f.bot) / 2 - off, c = Math.min(1, Math.abs(bl) / w), cc = c ** (1 / FUS_SHAPE.side); return zc - h * Math.max(0, 1 - cc * cc) ** (FUS_SHAPE.belly / 2); }

// ------------------------------------------------------------------------------------------- antennas
// GA 35S (AXIS IFR GPS) on the aft nose deck between the canard TE (FS 30.42) and the canopy bow; GA 35 (GTX 45R) on
// the forward deck, 5.4 in ahead of the canard LE; both on the OML at BL 0 with conformed ground planes inside the skin.
// Transponder blade on the belly at FS 50, BL 4.5 (aft of the NB well, ahead of the landing-brake keel bracket, outboard
// of C's actuator); ELT whip on the turtleback at FS 139.2.
export const GA35S_AT = [35.20, 0, topAt(35.20, 0)], GA35_AT = [12.00, 0, topAt(12.00, 0)];
// rev C (2026-11-19): the ELT whip moves aft to FS 141.0, the middle of the turtleback (FS 129 face to the FS 153 firewall),
// so ACK's 24 in ground plane fits as six 12 in radials (ACK E-04C manual sec. 3) laid at 30°, 90°, 150° … from forward
// seat-3 2026-11-22: the landing brake moved aft to FS 64–80 over the old blade spot and the pilot now sits on the belly: the blade
// moves to FS 61.5, behind the front seat back's foot and ahead of the brake opening (was FS 81)
export const BLADE_AT = [61.50, 4.50, botAt(61.50, 4.50)], WHIP_AT = [115.50, 0, topAt(115.50, 0)];
/** ground planes (in): [fs0, fs1, bl0, bl1] conformed to the inner skin */
export const GP = { ga35s: [30.90, 39.50, -4.40, 4.40], ga35: [7.40, 16.60, -4.40, 4.40], blade: [58.75, 64.25, 1.25, 7.75] /* seat-3: λ/4 (2.7 in) each way of the blade, aft of the seat back's foot and ahead of the brake opening (was 76–86) */, whip: [103.60, 127.25, -10.70, 10.70] };
/** the ELT whip's plane is six radials (1 in copper tape) of ACK's 12 in, along the inner skin, at these headings from forward */
export const WHIP_RADIALS = { n: 6, L: 12.0, w: 1.0, from: 30 };

// ------------------------------------------------------------------------------------------- COM dipole in the right winglet
// centre-fed half-wave sleeve dipole in the fin's core at x/c 0.45 (aft of the fin spar at 0.30, ≥ 4.9 in ahead of the rudder
// hinge line at 0.70), from h 11.5 in to h 55.5 in, fed at h 33.5 in; ferrite choke on the coax at h 8.5–11.5 in (A1: raised 1.5 in) (typed practice)
export const DIPOLE = { x: 0.45, xTop: 0.38, h0: 11.5, hFeed: 33.5, h1: 55.5, choke: [8.5, 11.5], f: 127.0 };   // DC-005 (2026-11-21): the element slants from x/c 0.45 at its lower end to 0.38 at its top, so it stays ≥ 4 in ahead of the taller, wider rudder's hinge (65 % chord, up to h 54 in) while its lower end keeps the λ/2π keep-out from the wing tip's LSP strips
export const dipX = (hIn) => DIPOLE.x + (DIPOLE.xTop - DIPOLE.x) * Math.min(1, Math.max(0, (hIn - DIPOLE.h0) / (DIPOLE.h1 - DIPOLE.h0)));   // A1 (2026-11-21): raised 1.5 in (was h 10–54, fed at 32, choke 7–10) so the element keeps its λ/2π keep-out from the wing tip's LSP strips after the fin sweep went 37° → 27.2°
export const finPt = (hIn, x = dipX(hIn), o = 0) => IN(FRAMES.winglet.pt(hIn / 12, x, o));

// ------------------------------------------------------------------------------------------- magnetometer
// GMU 11 in the left wing forward of the spar at x/c 0.10, BL 108: the best place found (wpJ1 jmag-site); public Garmin
// guidance cannot be met in full anywhere in this wing (see the record)
export const MAG = { bl: 108.0, x: 0.10 };
export const MAG_AT = (() => { const w = wingSec(MAG.bl / 12); return [(w.le + MAG.x * w.c) * 12, -MAG.bl, GEO.wing.z * 12]; })();
const wingAt = (bl, x) => { const w = wingSec(Math.abs(bl) / 12); return [(w.le + x * w.c) * 12, bl, GEO.wing.z * 12]; };
export const MAG_SPAR_X = GEO.wing.spar;
export const MAG_WEB = [[...wingAtX(-97, 0.33)], [...wingAtX(-101, 0.19)]];
function wingAtX(bl, x) { const w = wingSec(Math.abs(bl) / 12); return [(w.le + x * w.c) * 12, bl, GEO.wing.z * 12 + 0.6]; }

// ------------------------------------------------------------------------------------------- CS spar systems tunnels (LEZ-57-140 rev G / H)
// rev G: one grommeted tunnel each side above C's rudder-cable tunnel (C's cable tunnel 9.40 → 12.60 at WL 38.60): forward
// face BL ±9.90 to the aft face BL ±12.90 at WL 39.50, Ø 0.80, so it lines up with C's wing systems conduit (SYSC in
// wpC8_cuts.js, jut-out front wall FS 153.15, BL ±12.90, WL 39.50, Ø 0.80). Since rev H (Miles, option A "swap lanes",
// 2026-11-19) it carries block I's wingtip light harness alone (both sides). rev H adds the low tunnel 'aft' each side, Ø 0.40
// at WL 35.96 (under C's rod tunnel, 0.16 in over the lower cap's inner face, 0.19 in under the jut-out's K1 bay floor):
// forward face BL ±10.40 (inside the cabin wall, BL 11.38 there) to the aft face BL ±12.10 (outboard of the firewall's
// edge, BL 11.66, and the jut-out's inboard close-out, BL 11.77), for J's COM coax (right) and GMU 11 harness (left).
// On both webs the traces stack over C's rod or cable traces, so a 2-BID doubler inside each web (both webs, BL ±9.05–14.25,
// full inner depth, beside the bracket doubler) carries the shear past the holes (cs-sys-holes); the low tunnel's traces
// stay inside it and off the governing line.
const csLo = 35.1664, csF = 123.06, csA = 127.5;
export const AFT_WL = 35.96;   // the low lane's WL through the CS spar and under the K1 bay
export const CS_TUNNELS = [{ id: 'sys', x0: 9.90, x1: 12.90, z: r4(39.50 - csLo), d: 0.80, for: 'I: wingtip light harness (both); rev H: alone' },
  { id: 'aft', x0: 10.40, x1: 12.10, z: r4(AFT_WL - csLo), d: 0.40, for: 'J: COM coax (right) / GMU 11 harness (left) (rev H, option A)' }];
export const CS_TUNNEL = CS_TUNNELS[0];
export const CS_WEB_DBL = { id: 'sys', x: 11.65, half: 2.60, n: 2 };   // BID ±45 plies inside each web over BL ±9.05–14.25
export const TUNNEL_PTS = (sg, k = 0) => { const T = CS_TUNNELS[k], z = r4(csLo + T.z); return [[csF - 0.01, sg * T.x0, z], [csA + 0.01, sg * T.x1, z]]; };
/** C's wing systems conduit (docs/blocks/c_controls.md, right side; the left is its mirror), copied: J's lines follow it */
export const SYSC_PTS = [[127.65, 12.90, 39.50], [131.80, 21.0, 39.50], [131.80, 38.0, 39.44], [131.80, 43.0, 39.42], [131.80, 45.0, 39.40], [131.90, 50.0, 39.30], [134.50, 64.0, 39.00], [165.00, 145.8, 37.00], [165.50, 149.2, 37.00]];
export const SYS_BAY = { fs: [128.80, 132.25], bl: [38.0, 43.0], wl: 38.55 };
/** the aft systems lane (Miles, option A "swap lanes", 2026-11-19): J's COM coax (right wing) and GMU 11 harness (left wing)
 *  leave C's systems conduit to the light harness alone. Right side given, [FS, BL, WL] in; the left is its mirror. From the
 *  CS spar's low tunnel (above) the lane runs under the jut-out's K1 bay (floor WL 36.35), rises over the drag fitting's arm
 *  (LEZ-57-141, top WL 36.57 at BL 25.4–27.4), runs under C's rudder conduit to a root connector bay under C's systems bay
 *  (jut-out rev C: the inline BNC / the GMU circular connector, a lower-skin cover), crosses the root face, passes under rod
 *  B (WL 37.0) and the wing's systems conduit, past the K2 bay and over link C, then runs 2.9–4.4 in aft of the systems
 *  conduit and forward of the rudder conduit to the tip (wing rev E), where the coax leaves aft for the right fin. The bay
 *  opens through the root face, so the wing-side pigtail and its connector pull out with the wing. */
export const AFTC = {
  // integration 2026-11-19 (ICD A-S3): no 1/2 × 0.035 nylon is stocked (Nylaflow 1/2 OD is 0.0625 wall, ID 0.375: 44 % fill), so the
  // conduit is 6061-T6 drawn tube 1/2 × 0.035 (ID 0.430; Aircraft Spruce 03-35800, 0.0612 lb/ft, $3.55/ft, cert AMS WW-T-700/6B;
  // aircraftspruce.com alumtube_6061t6, accessed 2026-11-19): non-magnetic beside the GMU 11, the same bore, so the GMU harness fills
  // 34 % (≤ 40 %) at ID / bundle 1.72 (≥ 1.25, AC 43.13-1B para 11-249). Bent to the lane at ≥ 3 × OD (BOUND: shop practice, typed)
  r: 0.26, conduit: '6061-T6 tube 1/2 OD × 0.035 (ID 0.430; Aircraft Spruce 03-35800)', od: 0.50, id: 0.43, lbFt: 0.0612,
  /** the CS spar's low tunnel and the jut-out's first leg under the K1 bay (front wall → BL 19.4) are lined holes, Ø 0.40 */
  liner: { r: 0.20, what: 'phenolic tube 3/8 OD × 0.025 (ID 0.325)', od: 0.375, id: 0.325 },
  jut: [[129.20, 19.40, AFT_WL], [129.50, 24.20, 37.15], [130.15, 38.80, 36.90], [130.15, 45.00, 36.90]],
  wing: [[130.15, 45.00, 36.90], [132.90, 48.20, 36.00], [135.90, 54.50, 36.90], [138.20, 62.00, 38.30], [167.05, 143.00, 37.29]],
  bay: { bl: [38.50, 45.00], fs: [128.90, 131.30], top: 37.40 },
  opening: { id: 'acc-aft', what: 'aft root connector bay (jut-out lower skin)', bl: [39.00, 44.40], fs: [129.10, 131.10], shape: 'rounded rectangle, 0.5 in corner radii', at45: true },
  /** the GMU 11 harness leaves the left lane through a grommeted side port at BL 86 */
  exitBL: 86.0,
};
/** where the lane leaves the wing: the last wing vertex on to the right fin's root at the dipole's chord station */
export const AFT_TIP = () => finPt(0, DIPOLE.x);
/** the point of the wing lane at BL `bl` (right side) */
export const aftAt = (bl) => { const W = AFTC.wing; for (let i = 1; i < W.length; i++) if (bl <= W[i][1] + 1e-9) { const a = W[i - 1], b = W[i], t = (bl - a[1]) / (b[1] - a[1]); return a.map((v, k) => r4(v + (b[k] - v) * t)); } return W.at(-1); };
/** where the GMU 11 harness leaves the left wing's aft conduit (BL 86, a grommeted side port; option A), then under C's systems
 *  conduit (the light harness, ≥ 0.5 in clear) to BL 97 aft of the spar and through the spar's shear web at about 45° in plan
 *  (BL 97 → 101) to the GMU 11 */
export const MAG_CONDUIT_EXIT = (() => { const q = aftAt(AFTC.exitBL); return [q[0], -q[1], q[2]]; })();
/** lengths (in) of the aft lane per side: liner (the CS spar's low tunnel and the jut-out's first leg) and conduit (the
 *  jut-out's lane from BL 19.4 to the root face and the panel's conduit to the tip face, on the line to the fin's root) */
export const AFT_LEN = () => { const t = TUNNEL_PTS(1, 1), W = AFTC.wing, tip = AFT_TIP(), u = (123.90 - W.at(-1)[1]) / (tip[1] - W.at(-1)[1]), end = W.at(-1).map((v, k) => v + (tip[k] - v) * u);
  const L_ = (P) => P.slice(1).reduce((a, q, i) => a + Math.hypot(...q.map((v, k) => v - P[i][k])), 0);
  return { liner: L_([t[0], t[1], AFTC.jut[0]]), conduit: L_([...AFTC.jut, ...W.slice(1), end]) }; };
/** wing-root disconnects in the aft root connector bay (in): inline BNC (COM, right) and a 4-pin + shield circular (GMU 11, left);
 *  connector bodies (typed, BOUND): BNC mated pair Ø 0.58 × 1.6, the GMU circular pair Ø 0.72 × 1.6 */
export const DISC = { com: [130.15, 41.80, 36.90], mag: [130.15, -41.80, 36.90] };
export const CONN = { com: { d: 0.58, L: 1.6, why: 'M39012 BNC plug + jack mated, coupling-nut OD and length typed from memory' }, mag: { d: 0.72, L: 1.6, why: '4-pin + shield circular plug + receptacle mated, shell OD and length typed from memory' } };

// ------------------------------------------------------------------------------------------- the pitot-static system
// pitot mast out of the nose tip on WL 34.32, its barb 0.43 in ahead of the lead's forward plate (A); the line runs
// straight through the lead to clear the removable plates' aft face before its first bend, then block E's route
// outboard of the RH NG-30 plate (BL 3.30 from FS 12 to aft of F22), inboard through F28 clear of its slot, and rises to
// the tee on the shelf. Static ports flush on the OML at FS 54.0, WL 38.60 both sides (above the raceways); each port's
// sump is the line's low point (drain plug), the lines rise to the tees.
export const PITOT_TIP_IN = [2.60, 0, 35.80];   // 1.48 in above the nose centreline so the line clears A's ballast keep-out
export const STATIC_WL = 38.60, STATIC_FS = 58.00;
export const STATIC_IN = (sg) => [STATIC_FS, sg * halfW(STATIC_FS, STATIC_WL), STATIC_WL];
export const pitotRoute = [PITOT_TIP_IN, [10.10, 2.50, 38.30], [12.00, 3.30, 38.82], [22.32, 3.30, 38.82], [24.80, 2.60, 39.02], [28.40, 1.85, 39.25], [31.60, 0.60, 39.80], [36.05, -1.00, 40.45], PSI.ptIn];   // rises through the shelf aft of the GTX (rev C)
export const staticRoute = (sg) => { const p = STATIC_IN(sg), b = sg * (halfW(STATIC_FS, STATIC_WL) - SHELL - 0.55);
  return sg < 0 ? [[p[0], b, STATIC_WL], [49.00, -9.60, 38.70], [40.4, -10.00, 38.85], [38.6, -9.90, 39.40], [37.2, -8.60, 41.30], [36.5, -5.0, 41.40], PSI.st1L]
    : [[p[0], b, STATIC_WL], [49.00, 9.60, 38.70], [40.4, 10.00, 38.85], [38.6, 9.90, 39.40], [36.6, 7.00, 41.30], [36.25, 1.0, 41.40], PSI.st1R]; };
export const psBranches = [
  [PSI.ptOut1, [36.25, 3.75, 41.80], PSI.adP], [PSI.ptOut2, [36.5, -3.6, 42.1], [37.4, -5.4, 42.35], PSI.bkP],
  [PSI.st2Out1, [36.30, 3.95, 41.95], PSI.adS], [PSI.st2Out2, [36.6, -4.2, 41.55], [37.5, -6.0, 41.7], PSI.bkS],
];

// ------------------------------------------------------------------------------------------- coax and harness routes
// heads and tails of the runs that ride wp12's raceways keep wp12's PLAN indices (head points, then the raceway, then
// the tail from PLAN.tailFrom); the dummy points between are replaced by the raceway lane
const D = [0, 0, 0];
export const ROUTES = {
  // COM coax: AXIS J3 → down inside the glareshield hood and ahead of C's pushrod guide → the RF hole (panel rev C) → raceway RF → CS spar low tunnel →
  // the aft lane → wing-root BNC → the right wing's aft conduit → the winglet's root → up the fin to the feed (PLAN head 3, tailFrom 5)
  // (option A: the low CS-spar tunnel, the aft lane under the K1 bay, the inline BNC in the aft root bay, the wing's aft conduit,
  // out of the tip aft to the fin)
  com: null,
  // transponder coax: GTX J2 → right corridor, ahead of C's pushrod guide → the RF hole (panel rev C) → raceway RF → down the wall and along the belly to the blade (head 3, tailFrom 4)
  xpdr: [[GTX_AT.fs[0] + 1.6, GTX_AT.bl[1] + 0.15, SHELF.top + 0.6], [31.00, 7.40, 41.50], [34.00, 9.40, 40.60], [38.40, 9.90, 38.70], [39.40, 10.25, 36.10], D, [69.00, 9.40, 30.00], [69.00, 6.60, 29.60], [68.00, 6.60, 26.60], [BLADE_AT[0], BLADE_AT[1], BLADE_AT[2] + SHELL + 0.25]],   // seat-3: down behind the front seat back (was down at FS 44.9 and along the belly under the pilot)
  // GPS coax for the AXIS: J4 → up to the GA 35S over the shelf
  gpsAxis: [AXIS_J.J4, [36.60, 0.0, 43.75], [GA35S_AT[0], 0, GA35S_AT[2] - SHELL - 0.05]],
  // GPS coax for the GTX: GTX J3 (forward face) → F28 inboard → F22's hole (BL 1.43, WL 40.82) → over the NG box → GA 35
  gpsXpdr: [[GTX_AT.fs[0] - 0.15, 1.60, SHELF.top + 0.75], [28.55, 1.10, 40.35], [22.40, 1.43, 40.80], [16.00, 1.10, 40.90], [GA35_AT[0], 0, GA35_AT[2] - SHELL - 0.05]],
  // ELT coax and remote: ELT J2 (aft face) → whip base; remote cable from the panel remote (head 1, tailFrom 3) to ELT J1
  eltCoax: null, eltRemote: null,
  // console harness (J): right branch from behind the right of the display through its own panel hole (panel rev C; B's
  // declared hole H-CR is no longer needed) to the stick (PTT, PLAN head 3, tailFrom 4: the tail is unchanged, so B's stick
  // slot still runs to it); left branch from outboard of the G5, down inboard of the key switch, through its own hole clear
  // of the warning unit to the jacks (head 2, tailFrom 3)
  consoleR: [[37.60, 6.70, 40.60], [38.60, 7.35, 38.60], [40.60, 7.30, 37.05], D, [46.92, 9.60, 39.60]],
  consoleL: [[38.60, -8.50, 40.50], [39.30, -8.20, 39.60], D, [89.70, -9.90, 38.00]],
  // GMU 11 harness: GSU 25D J1 (forward end) → under the shelf → P3 → raceway LS → CS spar low tunnel → the aft lane →
  // wing-root connector → the left wing's aft conduit to BL 86 → under the systems conduit → through the wing spar web at
  // BL 97–101 → the GMU 11 (head 4, tailFrom 5)
  mag: null,
};
export const ELT_FS = [105.35, 105.35 + ENV.elt.box[1]];
/** rev C: the tray rises to WL 37.90 (was 37.55) so the longer bracket clears C's roll tube under it (FS 137.8, top WL 37.38) */
export const ELT_Z = 37.90;
export const ELT_C = [(ELT_FS[0] + ELT_FS[1]) / 2, 4.80, ELT_Z + ENV.elt.box[2] / 2];
// rev C: ACK sets a 2 ft MINIMUM coax (E-04C manual sec. 3): from the ELT's aft end the coax makes a service loop forward
// outboard of the unit and back to the whip base at FS 141.0
ROUTES.eltCoax = [[ELT_FS[1] + 0.10, 5.60, 39.65], [115.10, 4.80, 41.40], [108.10, 5.20, 41.90], [106.30, 3.40, 42.50], [108.30, 1.60, 43.40], [114.10, 0.60, 44.90], [WHIP_AT[0], 0, WHIP_AT[2] - SHELL - 0.10]];
ROUTES.eltRemote = [[PANEL_AFT - ENV.eltRemote.face[1] - ENV.eltRemote.body[1] - 0.05, ELTR_C[0], ELTR_C[1] - 0.10], [39.00, 10.45, 36.90], D, D, [107.70, 6.60, 39.00], [ELT_FS[1] + 0.10, 4.60, 39.70]];
const mir = (q) => [q[0], -q[1], q[2]];
/** the aft lane for side sg: the low CS-spar tunnel, the jut-out lane with the root disconnect, the wing lane (to BL `to`) */
const aftLane = (sg, disc, to = null) => { const m = (q) => [q[0], sg * q[1], q[2]], J = AFTC.jut, W = AFTC.wing.slice(1);
  return [...TUNNEL_PTS(sg, 1), ...J.slice(0, 3).map(m), disc, m(J[3]), ...(to == null ? W : [...W.filter((q) => q[1] < to - 1e-9), aftAt(to)]).map(m)]; };
ROUTES.com = [AXIS_J.J3, [38.20, 8.90, 41.00], [39.40, 10.40, 35.90], D, D, [113.90, 9.45, 36.20], [120.90, 10.15, AFT_WL], ...aftLane(1, DISC.com), AFT_TIP(), finPt(DIPOLE.choke[0]), finPt(DIPOLE.hFeed)];
ROUTES.mag = [[GSU_AT.fs[0] - 0.20, (GSU_AT.bl[0] + GSU_AT.bl[1]) / 2, SHELF.top + 0.75], [31.00, 5.20, 40.40], [33.50, -7.60, 40.00], [39.00, -9.45, 38.00], [41.60, -9.88, 37.82], D, [112.50, -10.00, 36.60], [120.90, -10.15, AFT_WL], ...aftLane(-1, DISC.mag, AFTC.exitBL),
  ...MAG_WEB, [MAG_AT[0] + 1.6, MAG_AT[1] + 0.6, MAG_AT[2] + 0.2]];
/** segments (k joins pts[k − 1] and pts[k]) of a J route outside the named zones: the CS-spar tunnel and the gap to the
 *  jut-out's front wall; for the coax also the tip-to-fin leg and the fin */
export const ROUTE_EXT = { com: [8, 9, 18, 19, 20], mag: [9, 10] };   // mag +1: the rev C head point under the GSU 25C
/** the ELT (ACK E-04) on its bracket on LEZ-53-175's aft face: tray centre BL 4.80 (A's insert pattern centre), WL of the
 *  insert pattern 38.40 (unchanged, so A's inserts do not move) */
export const ELT_AT_IN = [ELT_C[0], 4.80, 38.40];

// ------------------------------------------------------------------------------------------- panel faces and remote positions (ft)
export const POS = {
  EFIS: F((AXIS.canFwd + PANEL_AFT) / 2, AXIS_C[0], AXIS_C[1]),
  RADIO: F(...AXIS_J.J3),
  BACKUP: F(PANEL_AFT - ENV.g5.can.L / 2, G5_C[0], G5_C[1]),
  XPDR: F(...GTX_C), ADAHRS: F(...GSU_C),
  WARN: F(PANEL_AFT - ENV.warn.body[1] / 2, WARN_C[0], WARN_C[1]),
  SWP: F(PANEL_AFT - 0.5, SW_C[0], SW_C[1]),
  RCPI: F(PANEL_AFT - ENV.eltRemote.body[1] / 2, ELTR_C[0], ELTR_C[1]),
  ELT: F(...ELT_AT_IN),
  PITOT_TIP: F(...PITOT_TIP_IN),
  MAG: F(...MAG_AT),
  ANT: { gpsAxis: F(...GA35S_AT), gpsXpdr: F(...GA35_AT), xpdr: F(...BLADE_AT), elt: F(...WHIP_AT) },
  COM_FEED: F(...finPt(DIPOLE.hFeed)),
  OAT: F(28.80, -3.00, botAt(28.80, -3.00)),
};
export const ft = (pts) => pts.map((p) => F(...p));
