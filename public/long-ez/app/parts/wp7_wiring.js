// Electrical wiring at pin level: every LRU and device has a reference designator, named connectors and a pin map;
// every wire runs from REF:CONN:PIN to REF:CONN:PIN with gauge, spec, harness and a length measured along the routed
// harness. Wire IDs follow the AS50881 / MIL-W-5088 pattern (function letter, circuit number, segment letter, gauge).
// Avionics are Garmin (AXIS GDU 116C, GSU 25C, GMU 11, GTP 59, GEA 24, G5, GTX 45R) plus an ACK E-04 ELT. The pin numbers
// are the LEZ interface definition (signal names follow the Garmin functions); the Garmin installation manuals govern the
// real connector pin-outs, so each connector sheet says to confirm against them before a harness is built.
import { GEO, registerChecks, mk, wingSec } from '../structures.js';
import { defineParts, defineEquipment, defineWires, EQUIP, WIRES, partByPN, pinOf, V3, PARTS } from '../systems.js';
import { ENG, STARTER_PT, ALT_PT, MAG, PLUG, PORT, bindEquip } from './wp1_powerplant.js';
bindEquip(() => EQUIP);
import { BATT, MASTER, GND_CABIN, STARTER_K } from './wp3_electrical.js';
import { EFIS, RADIO, XPDR, ADAHRS, EMS, BACKUP, ANT, ELT_AT, RCPI_AT, CANOPY_SW } from './wp4_avionics_cabin.js';
import { POS, ft, ROUTES, ROUTE_EXT, ENV, SW_C, WARN_C } from './wpJ0_layout.js';
import { LEADS, E0, MAG_TERM } from './wp6_engine_install.js';
import { NOSE_SW } from './ng_layout.js';
import * as LY from './wpI0_layout.js';

const { add, sub, mul, dot, len } = V3;
const S1 = (title, inspect) => ({ title, inspect });
const FW = GEO.firewall, A_ = ENG.accFace, C_ = ENG.crankZ;


// ------------------------------------------------------------------------------------------- wire data
/** Ω/1000 ft at 20 °C and lb/ft: SAE AS22759/16 tin-coated maxima (src: Glenair M22759/16 data sheet, accessed 2026-11-19);
 *  bundled continuous rating A: AC 43.13-1B CHG 1 Table 11-9 p. 11-23, 150 °C column (70 °C ambient, large bundle, 20 % loading,
 *  60,000 ft; src: faasafety.gov copy of ch. 11, accessed 2026-11-19). Block I's checks (wpI1) use their own derated ratings. */
export const AWG = {
  22: [16.2, 0.00368, 5], 20: [9.88, 0.00536, 7], 18: [6.23, 0.00789, 9], 16: [4.81, 0.00995, 11], 14: [3.06, 0.0149, 14],
  12: [2.02, 0.0226, 19], 10: [1.26, 0.0351, 26], 8: [0.701, 0.0635, 57], 6: [0.445, 0.0999, 76], 4: [0.280, 0.157, 103], 2: [0.183, 0.245, 141],
  '1/0': [0.1151, 0.3896, 141],   // DERIVED from 2 AWG by the AWG law (wpI1); rating held at the 2 AWG value (conservative)
};
const SPEC = { wire: (g) => `M22759/16-${g}-9`, pair: 'M27500-22TG2T14 (shielded twisted pair, 22 AWG)', tc: (t) => `thermocouple extension, type ${t}, 20 AWG, glass/PTFE`, coax: 'RG-400 (M17/128)', hv: 'ignition lead, 7 mm silicone, shielded', plead: 'M27500-18TG1T14 (shielded, 18 AWG)' };

// ------------------------------------------------------------------------------------------- new parts: panel items, harness routes
const SWP = POS.SWP, WARN = POS.WARN, KEY = [3.36, -0.80, 3.20];   // switch panel and warning unit on block B's cut-outs (J layout); the key switch is H's
const SW_AT = (k) => [SWP[0], (SW_C[0] + (k - 3.5) * ENV.sw.pitch) / 12, SWP[2]];   // block I: toggles S2…S9 at J's pitch across the cut-out
const JACK_F = [4.2548, -0.8458, 3.20] /* J: BL -10.15, outboard of H's engine-control cables under the console */, JACK_R = [7.475, -0.825, 3.20] /* J: rear jacks above the left power raceway */, STICK_SW = [3.9167, 0.80, 3.55], THR_SW = [4.0827, -0.82, 3.05];
const tipMag = POS.MAG;   // GMU 11 in the left wing (J layout, jmag-site)
// block I harness routes (wpI0_layout.js): panel trunk forward of the panel units, breaker leads, S13 lead; forward harness to the landing light
const panelRun = LY.R_PANEL.map(LY.F), cbRun = LY.R_CB.map(LY.F), fwdRun = LY.R_FWD.map(LY.F);
const s13Run = [...LY.R_S13.head, [-10.4, 48.00, 37.4], [-10.4, 42.60, 37.4], ...LY.R_S13.tail].map(LY.F);   // through raceway LS
// gear-not-down switch lead: from the switch beside the NG-64 arm, out through the right NG-30 plate, aft outboard of the NB well to the warning unit
const ngSwRun = LY.R_NGSW.map(LY.F);   // second vertex derived from NOSE_SW (E-I-2)
const consoleR = ft(ROUTES.consoleR), consoleL = ft(ROUTES.consoleL);   // J layout: each branch through its own panel hole (panel rev C)
const lbRun = [[3.30, -0.20, 3.10], [3.6667, -0.30, 2.40], [5.7167, -0.05, 2.30]];
const magRun = ft(ROUTES.mag);   // J layout: CS spar low tunnel (LEZ-57-140 rev H), the aft lane and root connector (option A), wing spar web at BL 97–101
const strapRun = LY.R_STRAP.map(LY.F);
const fftBranch = [[10.175, -0.55, 2.80], [10.225, 0.0, 2.75], [10.295, 0.33, 2.62]];
const maniBranch = [E0, [10.725, 0.0, 2.95], [10.695, 0.52, 2.72]];
const H = (pn, name, ata, paths, extra = {}) => ({ pn, name, kind: 'harness', ata, massItem: 'elec', massEach: 0, geo: paths.map((pts, i) => ({ t: 'path', pts, dIn: 0.25, massPerFt: 0, cls: extra.cls || 'signal', shield: extra.shield, extSeg: (extra.ext || [])[i] || [] })),
  steps: [S1('Build on the harness board from the wire list; lace and label both ends', ['Continuity and ≥ 10 MΩ insulation on every wire', 'Every wire ID sleeve matches the wire list'])], src: { mass: 'Wire list × gauge mass' }, ...extra.p });
defineParts([
  { pn: 'LEZ-31-140', name: 'Switch panel (master, alternator field, essential alternate, boost pump, lights, landing brake)', kind: 'mechanism', ata: 31, nha: 'LEZ-31-100', massItem: 'panel', massEach: 0.6,
    faces: [{ draw: 'switches', c: [3.432, SWP[1], SWP[2]], w: ENV.sw.plate[0] / 12, h: ENV.sw.plate[2] / 12, labels: ['MASTER', 'ALT FLD', 'ESS ALT', 'BOOST', 'POS', 'STROBE', 'LDG LT', 'LDG BRK'], guard: [2] }],
    geo: [{ t: 'box', c: SWP, d: [0.10, 0.62, 0.10] }], blurb: 'Toggle row under the display; MASTER and ALT FIELD split, ESS ALT guarded, landing-brake switch centre-off momentary.',
    hardware: [{ std: 'MS35058-22 (SPST toggle)', qty: 6, desc: 'toggles S2–S8' }, { std: 'MS35059-24 (DPDT, centre-off momentary)', qty: 1, desc: 'S9 landing brake' }, { std: 'MS25224-1 (switch guard)', qty: 1, desc: 'guard on S4 ESS ALT' }],
    steps: [S1('Fit switches to the panel cut-outs; label per the panel drawing', ['Every switch labelled', 'Guard closes over ESS ALT'])], src: { mass: 'Handbook' } },
  { pn: 'LEZ-31-150', name: 'Warning unit: gear, canopy and alternator annunciators with warning tone', kind: 'cots', ata: 31, nha: 'LEZ-31-100', massItem: 'panel', massEach: 0.3,
    faces: [{ draw: 'annun', c: [3.432, WARN[1], WARN[2]], w: ENV.warn.face[0] / 12, h: ENV.warn.face[2] / 12, items: [['GEAR', '#d43b2c'], ['CANOPY', '#d43b2c'], ['ALT LOW', '#e0a020']] }],
    geo: [{ t: 'box', c: WARN, d: [0.15, 0.25, 0.10] }], scd: { spec: '14 V warning unit: three annunciators (GEAR red, CANOPY red, ALT LOW amber), audio tone to the AXIS audio panel; GEAR = throttle closed AND gear not down; ≤ 0.2 A; DB-9 connector', envelope: [1.8, 3.0, 1.4] }, src: { mass: 'ASSUMED' } },
  { pn: 'LEZ-31-122', name: 'Garmin GMU 11 magnetometer (left wing)', kind: 'cots', ata: 31, nha: 'LEZ-31-120', massItem: 'panel', massEach: 0.15,
    geo: [{ t: 'box', c: tipMag, d: [0.12, 0.08, 0.05] }], std: 'Garmin GMU 11 magnetometer on the Garmin CAN bus (end of bus, terminated); mount ≥ 3 ft from steel and current-carrying wires, level within 1°, non-magnetic hardware', src: { mass: 'ASSUMED' } },
  { pn: 'LEZ-31-124', name: 'Garmin GTP 59 OAT probe (under the nose, shaded)', kind: 'cots', ata: 31, nha: 'LEZ-31-120', massItem: 'panel', massEach: 0.1,
    geo: [{ t: 'cyl', a: [2.40, -0.25, 2.25], b: [2.40, -0.25, 2.15], r: 0.02, external: true }], std: 'Garmin GTP 59 OAT probe, wired to the GSU 25C', src: { mass: 'ASSUMED' } },
  { pn: 'LEZ-23-120', name: 'Headset jacks (front and rear) and stick PTT switch', kind: 'cots', ata: 23, nha: 'LEZ-31-110', massItem: 'panel', massEach: 0.25, std: 'PJ-068 mic jacks (2), PJ-055B phone jacks (2), MS25089-1 push switch (PTT)',
    geo: [{ t: 'box', c: JACK_F, d: [0.1, 0.06, 0.1] }, { t: 'box', c: JACK_R, d: [0.1, 0.06, 0.1] }, { t: 'sphere', c: STICK_SW, r: 0.03 }], src: { mass: 'Handbook' } },
  { pn: 'LEZ-32-216', name: 'Gear, throttle and canopy microswitches', kind: 'cots', ata: 32, massItem: 'nose', massEach: 0.1, std: 'MS27716-22-1 (sealed precision switch) × 3',
    geo: [{ t: 'box', c: NOSE_SW, d: [0.06, 0.04, 0.04] }, { t: 'box', c: THR_SW, d: [0.06, 0.04, 0.04] }, { t: 'box', c: CANOPY_SW, d: [0.06, 0.04, 0.04] }], src: { mass: 'Handbook' } },
  H('LEZ-24-161', 'Panel harness (bus, switches, avionics, data and audio behind the panel; breaker leads; gear-switch and canopy-switch leads)', 24, [panelRun, ngSwRun, cbRun, s13Run], { p: { nha: 'LEZ-24-100' } }),
  H('LEZ-24-162', 'Forward harness (battery and master to the bus module; landing light)', 24, [fwdRun], { cls: 'power', p: { nha: 'LEZ-24-100' } }),
  H('LEZ-24-165', 'Engine ground strap', 24, [strapRun], { cls: 'power', p: { nha: 'LEZ-24-140' } }),
  H('LEZ-23-125', 'Console harness (PTT, headset jacks, throttle switch)', 23, [consoleR, consoleL], { p: { nha: 'LEZ-31-110' } }),
  H('LEZ-27-172', 'Landing-brake actuator harness', 27, [lbRun], { cls: 'power', p: { nha: 'LEZ-27-171' } }),
  H('LEZ-31-121', 'Magnetometer harness (CAN and power to the GMU 11 in the left wing)', 31, [magRun], { ext: [[...ROUTE_EXT.mag]], p: { nha: 'LEZ-31-120' } }),
  H('LEZ-77-111', 'Engine-monitor branches: fuel-flow transducer (cabin), firewall sensor manifold', 77, [fftBranch, maniBranch], { p: { nha: 'LEZ-77-100' } }),
]);

// ------------------------------------------------------------------------------------------- equipment (reference designators, connectors, pins)
const T = (pins, more = {}) => ({ type: 'terminal studs', stud: true, pins, ...more });
const C = (type, n, named) => { const pins = {}; for (let i = 1; i <= n; i++) pins[i] = named[i] ?? 'SPARE'; return { type, pins }; };
const tabs = (n) => C('faston tab block', n, {});
const sw = (at, pn, ref, pins = { 1: 'IN', 2: 'OUT' }) => ({ ref, pn, at, name: `switch ${ref}`, conns: { T: { type: 'screw terminals', stud: true, maxLugs: 2, pins } } });
const cyls = ['LR', 'RR', 'LF', 'RF'];
const cylNo = { LR: 1, RR: 2, LF: 3, RF: 4 };
defineEquipment([
  // ---- block I power equipment at the layout (wpI0_layout.js). Protection: six pull-able breakers in block B's 'cb'
  //      cut-out (CB pins), every other circuit on a blade-fuse block on the bus module (FZ pins); prot = 'CB' | 'FUSE'
  { ref: 'BT1', pn: 'LEZ-24-110', name: 'Battery', at: LY.F(LY.BAT.pos), conns: { T: T({ POS: '+14 V', NEG: 'GND' }) } },
  { ref: 'K1', pn: 'LEZ-24-120', name: 'Master contactor', at: LY.F(LY.K1.c), conns: { T: T({ A1: 'BATTERY', A2: 'LOAD' }), C: { type: 'coil tabs', pins: { X1: 'COIL +', X2: 'COIL − (master switch)' } } } },
  { ref: 'F3', pn: 'LEZ-24-120', name: 'ESS ALT fuse 20 A (on the master contactor\'s battery stud)', at: LY.F(LY.F3.c), conns: { T: { type: 'fuse holder', pins: { 1: 'LINE', 2: 'LOAD' } } }, cb: 20, prot: 'FUSE' },
  { ref: 'F1', pn: 'LEZ-24-120', name: 'Main feed ANL 60 A (at the master contactor)', at: LY.F(LY.F1.c), conns: { T: T({ 1: 'IN', 2: 'OUT' }) }, cb: 60, prot: 'FUSE' },
  { ref: 'F2', pn: 'LEZ-24-130', name: 'Alternator B-lead ANL 50 A (bus end)', at: LY.F(LY.MOD.F2.c), conns: { T: T({ 1: 'IN', 2: 'OUT' }) }, cb: 50, prot: 'FUSE' },
  { ref: 'CB1', pn: 'LEZ-24-130', name: 'Main bus: panel breakers and fuse block FB1', at: LY.F(LY.MOD.FB1.c), bus: 'main', conns: { BUS: T({ B: 'MAIN BUS' }, { maxLugs: 3 }),
    CB: { type: 'push-pull breaker load terminals (panel)', prot: 'CB', pins: { 1: 'ALT FIELD 5A', 2: 'LDG BRAKE 7.5A', 3: 'STROBES 5A' } },
    FZ: { type: 'ATC blade-fuse block outputs (FB1)', prot: 'FUSE', pins: { 1: 'AXIS B 5A', 2: 'POS LTS 5A', 3: 'LDG LT 5A', 4: 'START/IGN 5A', 5: 'ESS FEED 20A', 6: 'START RLY 5A' } } } },
  { ref: 'CB2', pn: 'LEZ-24-130', name: 'Essential bus: panel breakers and fuse block FB2', at: LY.F(LY.MOD.FB2.c), bus: 'ess', conns: { BUS: T({ B: 'ESS BUS' }, { maxLugs: 2 }),
    CB: { type: 'push-pull breaker load terminals (panel)', prot: 'CB', pins: { 1: 'AXIS COM 7.5A', 2: 'XPDR 3A', 3: 'BOOST PUMP 5A' } },
    FZ: { type: 'ATC blade-fuse block outputs (FB2)', prot: 'FUSE', pins: { 1: 'AXIS A 5A', 2: 'ADAHRS 2A', 3: 'EIS 2A', 4: 'GMU 1A', 5: 'G5 2A', 6: 'WARN 1A', 7: 'SPARE', 8: 'SPARE', 9: 'SPARE', 10: 'SPARE' } } } },
  { ref: 'D1', pn: 'LEZ-24-130', name: 'Essential-bus feed diode (Schottky, 30 A)', at: LY.F(LY.MOD.D1.c), conns: { T: T({ A: 'ANODE (main)', K: 'CATHODE (ess)' }) } },
  { ref: 'GB1', pn: 'LEZ-24-140', name: 'Cabin ground block (avionics and cabin returns)', at: GND_CABIN, conns: { MAIN: T({ M: 'GND STUD' }), J: tabs(30) } },
  { ref: 'GB2', pn: 'LEZ-24-140', name: 'Firewall ground block (engine strap, battery −)', at: LY.F(LY.GB2.stud), conns: { MAIN: T({ M: 'GND STUD' }), J: tabs(8) } },
  { ref: 'VR1', pn: 'LEZ-24-150', name: 'Regulator / overvoltage relay', at: LY.F(LY.VR1.conn), conns: { J1: C('D-sub 9 (M24308)', 9, { 1: 'BUS IN (ALT FIELD sw)', 2: 'FIELD OUT', 3: 'GND', 4: 'ALT LOW OUT' }) } },
  { ref: 'K2', pn: 'LEZ-80-100', name: 'Starter contactor', at: LY.F(LY.K2.coil), conns: { T: T({ A1: 'BATTERY', A2: 'STARTER' }), C: { type: 'coil tabs', pins: { X1: 'COIL (START)', X2: 'COIL GND' } } } },
  // rev 2026-11-19: start relay K3 on K2's bracket. The STS-S12's coil draws 2.9 A and the ACS A-510-2 key switch's START contact
  // is rated 2 A inductive, so the key drives K3's coil and K3's contact feeds K2's coil from the START/IGN fuse (5 A ≥ 1.25 × 2.9 A)
  { ref: 'K3', pn: 'LEZ-80-100', name: 'Start relay (12 V, SPST-NO)', at: LY.F([LY.K2.coil[0] + 0.9, LY.K2.coil[1], LY.K2.coil[2]]), conns: { C: { type: 'relay tabs (ISO 280)', pins: { X1: 'COIL (START)', X2: 'COIL GND', 30: 'FEED (START/IGN)', 87: 'TO K2 COIL' } } } },
  { ref: 'E1', pn: 'LEZ-71-210', name: 'Engine case ground stud (LEZ-71-210 rev B feature, block H)', at: LY.F(LY.E1), conns: { G: T({ CASE: 'CASE GROUND' }) } },
  { ref: 'B1', pn: 'LEZ-71-210', name: 'Starter motor', at: STARTER_PT, conns: { T: T({ POS: 'STARTER +' }) } },
  { ref: 'G1', pn: 'LEZ-71-210', name: 'Alternator 40 A', at: ALT_PT, conns: { T: T({ B: 'B+ OUT' }), F: { type: 'faston', pins: { F: 'FIELD' } } } },
  ...[-1, 1].map((sg, i) => ({ ref: `MG${i + 1}`, pn: 'LEZ-71-210', name: `${sg < 0 ? 'Left' : 'Right'} magneto`, at: MAG(sg).cap, conns: { P: { type: 'P-lead terminal', pins: { P: 'P-LEAD' } }, T: { type: 'distributor towers', pins: { 1: 'TOWER 1', 2: 'TOWER 2', 3: 'TOWER 3', 4: 'TOWER 4' } } } })),
  ...LEADS.map((l) => ({ ref: `SP${cylNo[l.k]}${l.top ? 'T' : 'B'}`, pn: 'LEZ-74-120', name: `Spark plug, cyl ${cylNo[l.k]} ${l.top ? 'top' : 'bottom'}`, at: PLUG(l.k, l.sg, l.top), conns: { T: { type: 'plug terminal', pins: { 1: 'HV' } } } })),
  { ref: 'S1', pn: 'LEZ-74-100', name: 'Ignition / start key switch', at: KEY, conns: { T: T({ BAT: '+14 V IN', L: 'L MAG', R: 'R MAG', S: 'START', GRD: 'GROUND (grounds the P-leads in OFF)' }) } },
  sw(SW_AT(0), 'LEZ-31-140', 'S2', { 1: 'GND', 2: 'K1 COIL −' }), sw(SW_AT(1), 'LEZ-31-140', 'S3'), sw(SW_AT(2), 'LEZ-31-140', 'S4'), sw(SW_AT(3), 'LEZ-31-140', 'S5'),
  sw(SW_AT(4), 'LEZ-31-140', 'S6'), sw(SW_AT(5), 'LEZ-31-140', 'S7'), sw(SW_AT(6), 'LEZ-31-140', 'S8'),
  { ref: 'S9', pn: 'LEZ-31-140', name: 'Landing-brake switch (reversing)', at: SW_AT(7), conns: { T: { type: 'screw terminals', stud: true, maxLugs: 1, pins: { 1: '+14 V IN', 2: 'GND IN', 3: 'MOTOR A', 4: 'MOTOR B' } } } },
  { ref: 'S10', pn: 'LEZ-23-120', name: 'PTT switch (stick)', at: STICK_SW, conns: { T: { type: 'solder lugs', pins: { 1: 'PTT', 2: 'GND' } } } },
  { ref: 'S11', pn: 'LEZ-32-216', name: 'Throttle-closed switch', at: THR_SW, conns: { T: { type: 'screw terminals', pins: { C: 'COM', NO: 'NORMALLY OPEN (made at idle)', NC: 'SPARE (normally closed)' } } } },
  { ref: 'S12', pn: 'LEZ-32-216', name: 'Nose gear not-down switch', at: NOSE_SW, conns: { T: { type: 'screw terminals', pins: { C: 'COM', NO: 'SPARE (normally open)', NC: 'NORMALLY CLOSED (made with the gear not down)' } } } },
  { ref: 'S13', pn: 'LEZ-32-216', name: 'Canopy pin switch', at: CANOPY_SW, conns: { T: { type: 'screw terminals', pins: { C: 'COM', NO: 'SPARE (normally open)', NC: 'NORMALLY CLOSED (made with the pin out)' } } } },
  { ref: 'A9', pn: 'LEZ-31-150', name: 'Warning unit', at: WARN, load: 0.1, bus: 'ess', conns: { J1: C('D-sub 9 (M24308)', 9, { 1: '+14 V', 2: 'GND', 3: 'GEAR NOT DOWN IN', 4: 'THROTTLE CLOSED IN', 5: 'CANOPY IN', 6: 'AUDIO OUT', 7: 'AUDIO GND', 8: 'ALT LOW IN' }) } },
  { ref: 'M1', pn: 'LEZ-28-140', name: 'Boost pump', at: [9.875, 0.25, 2.35], load: 2.5, bus: 'ess', conns: { J1: { type: '2-pin Deutsch DT', pins: { 1: '+14 V', 2: 'GND' } } } },
  { ref: 'M2', pn: 'LEZ-27-171', name: 'Landing-brake actuator', at: LY.F([-0.80, 42.40, 27.40]) /* block C's harness connector */, load: 4.0, duty: 'int', conns: { J1: { type: '2-pin Deutsch DT', pins: { 1: 'MOTOR A', 2: 'MOTOR B' } } } },
  ...[-1, 1].map((sg, i) => ({ ref: `DS${i + 1}`, pn: 'LEZ-33-100', name: `${sg < 0 ? 'Left' : 'Right'} wingtip light`, at: LY.F([sg * 148.35, LY.TIP_LIGHT.hi[1], 36.60]), load: 1.2, peak: 3.5, conns: { J1: { type: '3-pin Molex', pins: { 1: 'POSITION +', 2: 'STROBE +', 3: 'GND' } } } })),
  ...[-1, 1].map((sg, i) => ({ ref: `P33${i + 1}`, pn: 'LEZ-33-110', name: `${sg < 0 ? 'Left' : 'Right'} wing-root disconnect (wingtip lights)`, at: LY.F([sg * LY.ROOT.bl, LY.ROOT.fs, LY.ROOT.wl]), conns: { P: { type: '3-pin Deutsch DT plug (fuselage side)', pins: { 1: 'POSITION +', 2: 'STROBE +', 3: 'GND' } }, J: { type: '3-pin Deutsch DT receptacle (wing side)', pins: { 1: 'POSITION +', 2: 'STROBE +', 3: 'GND' } } } })),
  { ref: 'DS3', pn: 'LEZ-33-120', name: 'Landing light', at: LY.F([-0.60, 6.00, 31.92]) /* connector on the light's aft face */, load: 2.0, conns: { J1: { type: '2-pin Deutsch DT', pins: { 1: '+14 V', 2: 'GND' } } } },
  { ref: 'A1', pn: 'LEZ-31-110', name: 'AXIS GDU 116C', at: EFIS, load: 3.0, peak: 6.0, bus: 'ess', conns: {
    J1: C('D-sub (main, per the AXIS installation manual)', 37, { 1: '+14 V A', 2: '+14 V B', 3: 'GND', 4: 'GND', 5: 'RS-232 TX1 (to GTX 45R)', 6: 'RS-232 RX1 (from GTX 45R)', 9: 'CAN H (terminated)', 10: 'CAN L (terminated)', 13: 'RS-232 GND 1', 16: '+14 V COM', 17: 'COM GND' }),
    J2: C('D-sub HD (audio panel, per the AXIS installation manual)', 44, { 1: 'PILOT MIC', 2: 'PILOT MIC GND', 3: 'PILOT PHONE L', 4: 'PILOT PHONE R', 5: 'PILOT PHONE GND', 6: 'COPILOT MIC', 7: 'COPILOT MIC GND', 8: 'COPILOT PHONE L', 9: 'COPILOT PHONE R', 10: 'COPILOT PHONE GND', 11: 'PILOT PTT', 12: 'PTT GND', 13: 'ALERT IN 1 (GTX 45R)', 14: 'ALERT IN 1 GND', 15: 'ALERT IN 2 (warning unit)', 16: 'ALERT IN 2 GND' }),
    J3: { type: 'BNC (COM RF)', pins: { C: 'COM RF' } }, J4: { type: 'TNC (GPS RF, antenna bias supplied)', pins: { C: 'GPS RF' } } } },
  { ref: 'A2', pn: 'LEZ-31-120', name: 'GSU 25C ADAHRS', at: ADAHRS, load: 0.3, bus: 'ess', conns: { J1: C('D-sub (per the GSU 25C installation manual)', 25, { 1: '+14 V', 2: 'GND', 3: 'CAN H IN', 4: 'CAN L IN', 5: 'CAN H OUT', 6: 'CAN L OUT', 7: 'OAT HI', 8: 'OAT LO', 9: 'OAT SHIELD' }) } },
  { ref: 'A10', pn: 'LEZ-31-122', name: 'GMU 11 magnetometer', at: tipMag, load: 0.1, bus: 'ess', conns: { J1: C('D-sub 9 (per the GMU 11 installation manual)', 9, { 1: '+14 V', 2: 'GND', 3: 'CAN H (terminated)', 4: 'CAN L (terminated)' }) } },
  { ref: 'TP1', pn: 'LEZ-31-124', name: 'GTP 59 OAT probe', at: [2.40, -0.25, 2.25], conns: { P: { type: 'pigtail', pins: { 1: 'OAT HI', 2: 'OAT LO', 3: 'SHIELD' } } } },
  { ref: 'A3', pn: 'LEZ-77-100', name: 'GEA 24 EIS', at: EMS, load: 0.3, bus: 'ess', conns: {
    J1: C('D-sub (sensor inputs, per the GEA 24 installation manual)', 37, Object.fromEntries([...[1, 2, 3, 4].flatMap((k) => [[2 * k - 1, `CHT${k} +`], [2 * k, `CHT${k} −`]]), ...[1, 2, 3, 4].flatMap((k) => [[7 + 2 * k, `EGT${k} +`], [8 + 2 * k, `EGT${k} −`]]),
      [17, 'OIL T SIG'], [18, 'OIL T GND'], [19, 'OIL P +5 V'], [20, 'OIL P SIG'], [21, 'OIL P GND'], [22, 'FUEL P +5 V'], [23, 'FUEL P SIG'], [24, 'FUEL P GND'], [25, 'MAP +5 V'], [26, 'MAP SIG'], [27, 'MAP GND'], [28, 'FF +12 V'], [29, 'FF SIG'], [30, 'FF GND'], [31, 'TACH +12 V'], [32, 'TACH SIG'], [33, 'TACH GND']])),
    J2: C('D-sub 9 (power and CAN)', 9, { 1: '+14 V', 2: 'GND', 3: 'CAN H IN', 4: 'CAN L IN', 5: 'CAN H OUT', 6: 'CAN L OUT' }) } },
  ...[1, 2, 3, 4].map((k) => ({ ref: `TC${k}`, pn: 'LEZ-77-110', name: `CHT probe ${k} (type J)`, at: add(PLUG(cyls[k - 1], cyls[k - 1][0] === 'L' ? -1 : 1, false), [0, 0, -0.06]), conns: { T: { type: 'thermocouple leads', pins: { '+': 'J +', '-': 'J −' } } } })),
  ...[1, 2, 3, 4].map((k) => ({ ref: `TE${k}`, pn: 'LEZ-77-110', name: `EGT probe ${k} (type K)`, at: (() => { const kk = cyls[k - 1], sg = kk[0] === 'L' ? -1 : 1; return [ENG.flange - ({ LR: 19, RR: 16.5, LF: 9.5, RF: 7 }[kk]) / 12 + 0.18, sg * 0.97, C_ - 0.42]; })(), conns: { T: { type: 'thermocouple leads', pins: { '+': 'K +', '-': 'K −' } } } })),
  { ref: 'OT1', pn: 'LEZ-77-110', name: 'Oil-temperature sender', at: [A_ + 0.02, -0.15, C_ - 0.30], conns: { T: { type: 'screw terminal + case', pins: { 1: 'SIG', 2: 'GND' } } } },
  { ref: 'TS1', pn: 'LEZ-77-110', name: 'Tach pick-up (Hall)', at: [A_ - 0.05, -0.10, C_ - 0.25], conns: { J1: { type: '3-pin Deutsch DT', pins: { 1: '+12 V', 2: 'SIG', 3: 'GND' } } } },
  ...[['OP1', 'Oil-pressure transducer', 0.52], ['FP1', 'Fuel-pressure transducer', 0.45], ['MP1', 'Manifold-pressure transducer', 0.59]].map(([ref, name, y]) => ({ ref, pn: 'LEZ-77-120', name, at: [FW + 0.08, y, 2.66], conns: { J1: { type: '3-pin Packard', pins: { 1: '+5 V', 2: 'SIG', 3: 'GND' } } } })),
  { ref: 'FT1', pn: 'LEZ-77-130', name: 'Fuel-flow transducer', at: [10.295, 0.33, 2.52], conns: { J1: { type: '3-pin Molex', pins: { 1: '+12 V', 2: 'SIG', 3: 'GND' } } } },
  ...[['J101', 'Pilot mic jack', JACK_F, { TIP: 'MIC', RING: 'SPARE', SLEEVE: 'MIC GND' }], ['J102', 'Pilot phone jack', JACK_F, { TIP: 'PHONE L', RING: 'PHONE R', SLEEVE: 'PHONE GND' }], ['J103', 'Rear mic jack', JACK_R, { TIP: 'MIC', RING: 'SPARE', SLEEVE: 'MIC GND' }], ['J104', 'Rear phone jack', JACK_R, { TIP: 'PHONE L', RING: 'PHONE R', SLEEVE: 'PHONE GND' }]]
    .map(([ref, name, at, pins]) => ({ ref, pn: 'LEZ-23-120', name, at, conns: { T: { type: 'jack lugs', pins } } })),
  { ref: 'AN1', pn: 'LEZ-23-110', name: 'COM antenna (right winglet, sleeve dipole feed)', at: POS.COM_FEED, conns: { J1: { type: 'BNC', pins: { C: 'RF' } } } },
  { ref: 'A5', pn: 'LEZ-34-100', name: 'GTX 45R transponder', at: XPDR, load: 1.2, bus: 'ess', conns: { J1: C('D-sub (per the GTX 45R installation manual)', 25, { 1: '+14 V', 2: 'GND', 3: 'RS-232 RX1 (from AXIS)', 4: 'RS-232 TX1 (to AXIS)', 6: 'RS-232 GND 1', 7: 'AUDIO OUT (traffic)', 8: 'AUDIO GND' }),
    J2: { type: 'BNC (transponder / ADS-B RF)', pins: { C: 'XPDR RF' } }, J3: { type: 'TNC (GPS RF, antenna bias supplied)', pins: { C: 'GPS RF' } } } },
  { ref: 'AN2', pn: 'LEZ-34-110', name: 'Transponder / ADS-B blade (belly)', at: ANT.xpdr, conns: { J1: { type: 'BNC', pins: { C: 'RF' } } } },
  { ref: 'AN3', pn: 'LEZ-34-114', name: 'GA 35S WAAS antenna (AXIS)', at: ANT.gpsAxis, conns: { J1: { type: 'TNC', pins: { C: 'RF' } } } },
  { ref: 'AN4', pn: 'LEZ-34-112', name: 'GA 35S GPS antenna (GTX 45R)', at: ANT.gpsXpdr, conns: { J1: { type: 'TNC', pins: { C: 'RF' } } } },
  { ref: 'A7', pn: 'LEZ-31-130', name: 'G5 standby', at: BACKUP, load: 0.6, bus: 'ess', conns: { J1: C('D-sub (per the G5 installation manual)', 15, { 1: '+14 V', 2: 'GND', 3: 'CAN H IN', 4: 'CAN L IN', 5: 'CAN H OUT', 6: 'CAN L OUT' }) } },
  { ref: 'A11', pn: 'LEZ-25-160', name: 'ACK E-04 ELT', at: ELT_AT, conns: { J1: { type: '4-pin DIN (remote)', pins: { 1: 'REMOTE SWITCH', 2: 'REMOTE LED', 3: 'REMOTE BUZZER', 4: 'REMOTE GND' } }, J2: { type: 'BNC (antenna)', pins: { C: 'RF' } } } },
  { ref: 'A12', pn: 'LEZ-25-160', name: 'ELT remote switch / indicator', at: RCPI_AT, conns: { J1: { type: '4-pin DIN', pins: { 1: 'SWITCH', 2: 'LED', 3: 'BUZZER', 4: 'GND' } } } },
  { ref: 'AN5', pn: 'LEZ-25-161', name: 'ELT whip antenna', at: ANT.elt, conns: { J1: { type: 'BNC', pins: { C: 'RF' } } } },
]);

// panel faces for parts defined in other packages (breaker legends come from the breaker pin names)
{ const lbl = (ref) => Object.values(EQUIP.find((e) => e.ref === ref).conns.CB.pins).map((n) => { const m = n.match(/^(.*?)\s*([\d.]+)A$/); return m ? [m[1].replace('BOOST PUMP', 'BOOST').replace('AXIS COM', 'COM').replace('ALT FIELD', 'ALT FLD').replace('START/IGN', 'START').replace('LDG BRAKE', 'LDG BRK'), m[2]] : ['—', '']; });
  partByPN('LEZ-24-130').faces = [{ draw: 'breakers', c: [3.432, LY.CBP.plate.c[0] / 12, LY.CBP.plate.c[1] / 12], w: 2.20 / 12, h: 2.10 / 12, rows: [{ title: 'MAIN BUS', items: lbl('CB1') }, { title: 'ESSENTIAL BUS', items: lbl('CB2') }] }];
  partByPN('LEZ-74-100').faces = [{ draw: 'key', c: [3.432, KEY[1], KEY[2]], w: 0.16, h: 0.16 }];
  /* gear position flag face: defined on LEZ-32-210 in wp11 */ }

// ------------------------------------------------------------------------------------------- wires
const W = [];
let gTab = { GB1: 0, GB2: 0 };
const gnd = (b) => `${b}:J:${++gTab[b]}`;
const w = (id, awg, from, to, sig, harness, more = {}) => W.push({ id, awg, from, to, sig, harness, spec: more.spec || SPEC.wire(awg), ...more });
const pair = (id, a1, b1, a2, b2, sig, h) => { w(`${id}A22`, 22, a1, b1, `${sig} +`, h, { spec: SPEC.pair }); w(`${id}B22`, 22, a2, b2, `${sig} −`, h, { spec: SPEC.pair }); };
// power distribution (block I). Protection per AC 43.13-1B Table 11-3 (typed from memory; elec-wire); starter circuit
// unprotected (starter cables are exempt in practice, typed); contactor coil circuits limited by the coil.
w('P1A2', 2, 'BT1:T:POS', 'K1:T:A1', 'BATTERY + to master', 'LEZ-24-162');
// the two long cranking runs are 1/0 (was 2 AWG; 2026-11-19): elec-start with the 220 A conservative cranking current
w('P1B0', '1/0', 'K1:T:A2', 'K2:T:A1', 'master to starter contactor', 'LEZ-80-110', { shield: 'fire sleeve aft of the firewall', spec: 'M22759/16 1/0 AWG (dash per the AS22759/16 slash sheet)' });
w('P1C2', 2, 'K2:T:A2', 'B1:T:POS', 'starter', 'LEZ-80-110', { shield: 'fire sleeve + heat shield' });
w('N1A0', '1/0', 'BT1:T:NEG', 'GB2:MAIN:M', 'battery − to firewall ground', 'LEZ-80-110', { spec: 'M22759/16 1/0 AWG (dash per the AS22759/16 slash sheet)' });
w('N2A2', 2, 'E1:G:CASE', 'GB2:MAIN:M', 'engine ground strap', 'LEZ-24-165', { spec: 'tinned copper braid, 2 AWG equivalent, lugs both ends' });
w('N3A8', 8, 'GB1:MAIN:M', 'BT1:T:NEG', 'cabin ground block to battery −', 'LEZ-24-162');
w('P2A6', 6, 'K1:T:A2', 'F1:T:1', 'main feed jumper (≤ 6 in, contactor stud to ANL)', 'LEZ-24-162', { jumper: true });
w('P2B6', 6, 'F1:T:2', 'CB1:BUS:B', 'main feed to bus', 'LEZ-24-162', { cb: 60 });
w('P3A6', 6, 'G1:T:B', 'F2:T:1', 'alternator B-lead', 'LEZ-24-160', { shield: 'fire sleeve', cb: 50 });
w('P3B6', 6, 'F2:T:2', 'CB1:BUS:B', 'alternator to bus', 'LEZ-24-161', { cb: 50 });
w('P4A18', 18, 'CB1:CB:1', 'S3:T:1', 'ALT FIELD', 'LEZ-24-161', { cb: 5 });
w('P4B18', 18, 'S3:T:2', 'VR1:J1:1', 'ALT FIELD switched', ['LEZ-24-161', 'LEZ-24-160'], { cb: 5 });
w('P4C18', 18, 'VR1:J1:2', 'G1:F:F', 'field', 'LEZ-24-160', { cb: 5, shield: 'fire sleeve' });
w('N4A18', 18, 'VR1:J1:3', gnd('GB2'), 'regulator ground', 'LEZ-24-160');
w('W1A22', 22, 'VR1:J1:4', 'A9:J1:8', 'ALT LOW', ['LEZ-24-160', 'LEZ-24-161']);
w('P5A10', 10, 'CB1:FZ:5', 'D1:T:A', 'ESS FEED', 'LEZ-24-161', { cb: 20 });
w('P5B10', 10, 'D1:T:K', 'CB2:BUS:B', 'ESS FEED via diode', 'LEZ-24-161', { cb: 20 });
w('P6A10', 10, 'K1:T:A1', 'F3:T:1', 'ESS ALT jumper (≤ 6 in, battery stud to fuse)', 'LEZ-24-162', { jumper: true });
w('P6B10', 10, 'F3:T:2', 'S4:T:1', 'ESS ALT fused', ['LEZ-24-162', 'LEZ-24-161'], { cb: 20 });
w('P6C10', 10, 'S4:T:2', 'CB2:BUS:B', 'ESS ALT switched', 'LEZ-24-161', { cb: 20 });
w('P7A20', 20, 'S2:T:2', 'K1:C:X2', 'MASTER (coil −)', ['LEZ-24-161', 'LEZ-24-162'], { coil: true });
w('N7A20', 20, 'S2:T:1', gnd('GB1'), 'MASTER switch ground', 'LEZ-24-161');
w('P7B20', 20, 'K1:C:X1', 'K1:T:A1', 'master coil + jumper', 'LEZ-24-162', { coil: true });
w('P8A18', 18, 'CB1:FZ:4', 'S1:T:BAT', 'START/IGN', 'LEZ-24-161', { cb: 5 });
w('P8B20', 20, 'S1:T:S', 'K3:C:X1', 'START (to the start relay coil)', 'LEZ-74-100', { coil: true });
w('N8B20', 20, 'K3:C:X2', gnd('GB2'), 'start relay coil ground', 'LEZ-24-160');
w('P8C18', 18, 'CB1:FZ:6', 'K3:C:30', 'start relay feed (START RLY 5 A fuse)', 'LEZ-24-160', { cb: 5 });
w('P8D18', 18, 'K3:C:87', 'K2:C:X1', 'starter contactor coil (from the start relay)', 'LEZ-24-160', { coil: true });
w('N8A20', 20, 'K2:C:X2', gnd('GB2'), 'starter contactor coil ground', 'LEZ-24-160');
// loads
w('Q1A20', 20, 'CB2:CB:3', 'S5:T:1', 'BOOST PUMP', 'LEZ-24-161', { cb: 5 });
w('Q1B16', 16, 'S5:T:2', 'M1:J1:1', 'BOOST PUMP switched', ['LEZ-24-161', 'LEZ-24-160'], { cb: 5, load: 'M1' });
w('N9A16', 16, 'M1:J1:2', gnd('GB1'), 'boost pump ground', 'LEZ-24-160', { load: 'M1' });
w('C1A16', 16, 'CB1:CB:2', 'S9:T:1', 'LDG BRAKE', 'LEZ-24-161', { cb: 7.5 });
w('N10A16', 16, 'S9:T:2', gnd('GB1'), 'LDG BRAKE switch ground', 'LEZ-24-161', { load: 'M2' });
w('C1B16', 16, 'S9:T:3', 'M2:J1:1', 'LDG BRAKE motor A', 'LEZ-27-172', { cb: 7.5, load: 'M2' });
w('C1C16', 16, 'S9:T:4', 'M2:J1:2', 'LDG BRAKE motor B', 'LEZ-27-172', { cb: 7.5, load: 'M2' });
// tip-light supply 14 AWG (was 16; 2026-11-19): the Pulsar 660's 4.9 A flash peak over the ≈ 51 ft loop took 16 AWG past the
// AC 43.13-1B Table 11-6 1.0 V intermittent drop (elec-vdrop)
const TRIAD = 'M22759/16-14-9, twisted triad (supply, strobe, return; ≈ 6 twists per ft)';
w('L1A18', 18, 'CB1:FZ:2', 'S6:T:1', 'POS LTS', 'LEZ-24-161', { cb: 5 });
w('L2A18', 18, 'CB1:CB:3', 'S7:T:1', 'STROBES', 'LEZ-24-161', { cb: 5 });
[['1', 'B', 'DS1', 'left'], ['2', 'C', 'DS2', 'right']].forEach(([k, seg, ds, side]) => {
  const P = `P33${k}`, n = k === '1' ? 'N11' : 'N12', wseg = k === '1' ? 'D' : 'E';
  w(`L1${seg}14`, 14, 'S6:T:2', `${P}:P:1`, `POS LT ${side}`, ['LEZ-24-161', 'LEZ-33-110'], { cb: 5, load: ds, spec: TRIAD, twisted: true });
  w(`L2${seg}14`, 14, 'S7:T:2', `${P}:P:2`, `STROBE ${side}`, ['LEZ-24-161', 'LEZ-33-110'], { cb: 5, spec: TRIAD, twisted: true });
  w(`${n}A14`, 14, `${P}:P:3`, gnd('GB1'), `${side} tip ground`, 'LEZ-33-110', { load: ds, spec: TRIAD, twisted: true });
  w(`L1${wseg}14`, 14, `${P}:J:1`, `${ds}:J1:1`, `POS LT ${side} (wing)`, 'LEZ-33-110', { cb: 5, load: ds, spec: TRIAD, twisted: true });
  w(`L2${wseg}14`, 14, `${P}:J:2`, `${ds}:J1:2`, `STROBE ${side} (wing)`, 'LEZ-33-110', { cb: 5, spec: TRIAD, twisted: true });
  w(`${n}B14`, 14, `${P}:J:3`, `${ds}:J1:3`, `${side} tip ground (wing)`, 'LEZ-33-110', { load: ds, spec: TRIAD, twisted: true });
});
w('L3A18', 18, 'CB1:FZ:3', 'S8:T:1', 'LDG LT', 'LEZ-24-161', { cb: 5 });
w('L3B18', 18, 'S8:T:2', 'DS3:J1:1', 'LDG LT switched', ['LEZ-24-161', 'LEZ-24-162'], { cb: 5, load: 'DS3' });
w('N13A18', 18, 'DS3:J1:2', gnd('GB1'), 'landing light ground', 'LEZ-24-162', { load: 'DS3' });
// warnings: each input grounded in the alarm state (S11 C–NO at idle; S12, S13 C–NC; block D's contact sense)
w('W2A20', 20, 'CB2:FZ:6', 'A9:J1:1', 'WARN power', 'LEZ-24-161', { cb: 1, load: 'A9' });
w('N14A20', 20, 'A9:J1:2', gnd('GB1'), 'WARN ground', 'LEZ-24-161', { load: 'A9' });
w('W3A22', 22, 'A9:J1:4', 'S11:T:NO', 'THROTTLE CLOSED', 'LEZ-23-125');
w('N16A22', 22, 'S11:T:C', gnd('GB1'), 'throttle switch common', 'LEZ-23-125');
w('W4A22', 22, 'A9:J1:3', 'S12:T:NC', 'GEAR NOT DOWN', 'LEZ-24-161');
w('N15A22', 22, 'S12:T:C', gnd('GB1'), 'gear switch common', 'LEZ-24-161');
w('W5A22', 22, 'A9:J1:5', 'S13:T:NC', 'CANOPY', 'LEZ-24-161');
w('N17A22', 22, 'S13:T:C', gnd('GB1'), 'canopy switch common', 'LEZ-24-161');
pair('R10', 'A9:J1:6', 'A1:J2:15', 'A9:J1:7', 'A1:J2:16', 'warning tone', 'LEZ-24-161');
// avionics power and grounds
const pwr = (id, awg, src, ref, ppin, gpin, sig, h = 'LEZ-24-161', tagLoad = true) => { const c = parseFloat(pinOf(src)?.name.split(' ').pop()) || 5; w(id, awg, src, `${ref}:${ppin}`, sig, h, { cb: c, ...(tagLoad ? { load: ref } : {}) }); w(`N${id.slice(1)}`, awg, `${ref}:${gpin}`, gnd('GB1'), `${sig} ground`, h, tagLoad ? { load: ref } : {}); };
pwr('P20A18', 18, 'CB1:FZ:1', 'A1', 'J1:2', 'J1:4', 'AXIS B (main bus)', 'LEZ-24-161', false);   // final integration: J's ask (AXIS A on the essential bus, B on the main)
pwr('P21A18', 18, 'CB2:FZ:1', 'A1', 'J1:1', 'J1:3', 'AXIS A (essential bus)', 'LEZ-24-161', false);
pwr('P24A18', 18, 'CB2:CB:1', 'A1', 'J1:16', 'J1:17', 'AXIS COM (transmit peak)');
pwr('P22A22', 22, 'CB2:FZ:2', 'A2', 'J1:1', 'J1:2', 'ADAHRS');
pwr('P23A22', 22, 'CB2:FZ:3', 'A3', 'J2:1', 'J2:2', 'EIS');
pwr('P25A20', 20, 'CB2:CB:2', 'A5', 'J1:1', 'J1:2', 'XPDR');
pwr('P26A22', 22, 'CB2:FZ:4', 'A10', 'J1:1', 'J1:2', 'GMU 11', ['LEZ-24-161', 'LEZ-31-121']);
pwr('P27A22', 22, 'CB2:FZ:5', 'A7', 'J1:1', 'J1:2', 'G5');
// Garmin CAN bus, one linear run: AXIS (terminated) → G5 → GEA 24 → GSU 25C → GMU 11 (terminated)
pair('D1', 'A1:J1:9', 'A7:J1:3', 'A1:J1:10', 'A7:J1:4', 'CAN AXIS–G5', 'LEZ-24-161');
pair('D2', 'A7:J1:5', 'A3:J2:3', 'A7:J1:6', 'A3:J2:4', 'CAN G5–GEA 24', 'LEZ-24-161');
pair('D3', 'A3:J2:5', 'A2:J1:3', 'A3:J2:6', 'A2:J1:4', 'CAN GEA 24–GSU 25C', 'LEZ-24-161');
pair('D9', 'A2:J1:5', 'A10:J1:3', 'A2:J1:6', 'A10:J1:4', 'CAN GSU 25C–GMU 11', ['LEZ-24-161', 'LEZ-31-121']);
pair('D10', 'A2:J1:7', 'TP1:P:1', 'A2:J1:8', 'TP1:P:2', 'OAT', 'LEZ-24-161');
w('D10C22', 22, 'A2:J1:9', 'TP1:P:3', 'OAT shield', 'LEZ-24-161', { spec: SPEC.pair });
// AXIS ↔ GTX 45R: control, altitude, ADS-B In traffic and weather
pair('D4', 'A1:J1:5', 'A5:J1:3', 'A1:J1:13', 'A5:J1:6', 'RS-232 AXIS→GTX', 'LEZ-24-161');
w('D5A22', 22, 'A5:J1:4', 'A1:J1:6', 'RS-232 GTX→AXIS', 'LEZ-24-161', { spec: SPEC.pair });
// audio panel (inside the AXIS): headsets, PTT, alert inputs
pair('R3', 'A5:J1:7', 'A1:J2:13', 'A5:J1:8', 'A1:J2:14', 'GTX traffic audio', 'LEZ-24-161');
pair('R5', 'S10:T:1', 'A1:J2:11', 'S10:T:2', 'A1:J2:12', 'stick PTT', ['LEZ-23-125', 'LEZ-24-161']);
pair('R6', 'A1:J2:1', 'J101:T:TIP', 'A1:J2:2', 'J101:T:SLEEVE', 'pilot mic', ['LEZ-24-161', 'LEZ-23-125']);
pair('R7', 'A1:J2:3', 'J102:T:TIP', 'A1:J2:5', 'J102:T:SLEEVE', 'pilot phone L', ['LEZ-24-161', 'LEZ-23-125']);
w('R7C22', 22, 'A1:J2:4', 'J102:T:RING', 'pilot phone R', ['LEZ-24-161', 'LEZ-23-125'], { spec: SPEC.pair });
pair('R8', 'A1:J2:6', 'J103:T:TIP', 'A1:J2:7', 'J103:T:SLEEVE', 'rear mic', ['LEZ-24-161', 'LEZ-23-125']);
pair('R9', 'A1:J2:8', 'J104:T:TIP', 'A1:J2:10', 'J104:T:SLEEVE', 'rear phone L', ['LEZ-24-161', 'LEZ-23-125']);
w('R9C22', 22, 'A1:J2:9', 'J104:T:RING', 'rear phone R', ['LEZ-24-161', 'LEZ-23-125'], { spec: SPEC.pair });
// ELT remote (maker's 4-conductor cable)
['SWITCH', 'LED', 'BUZZER', 'GND'].forEach((sig, i) => w(`R${30 + i}22`, 22, `A11:J1:${i + 1}`, `A12:J1:${i + 1}`, `ELT remote ${sig.toLowerCase()}`, 'LEZ-25-162', { spec: 'ACK E-04.10.5 remote cable (4-conductor, shielded)' }));
// RF (RG-400 throughout)
w('R20', 0, 'A1:J3:C', 'AN1:J1:C', 'COM RF', 'LEZ-23-110', { spec: SPEC.coax, coax: true, rf: { f: 127, kind: 'com' } });
w('R21', 0, 'A5:J2:C', 'AN2:J1:C', 'XPDR / ADS-B RF', 'LEZ-34-111', { spec: SPEC.coax, coax: true, rf: { f: 1090, kind: 'xpdr' } });
w('R22', 0, 'A1:J4:C', 'AN3:J1:C', 'GPS RF (AXIS)', 'LEZ-34-111', { spec: SPEC.coax, coax: true, rf: { f: 1575, kind: 'gps' } });
w('R23', 0, 'A5:J3:C', 'AN4:J1:C', 'GPS RF (GTX 45R)', 'LEZ-34-111', { spec: SPEC.coax, coax: true, rf: { f: 1575, kind: 'gps' } });
w('R24', 0, 'A11:J2:C', 'AN5:J1:C', 'ELT RF', 'LEZ-25-162', { spec: SPEC.coax, coax: true, rf: { f: 406, kind: 'elt' } });
// ignition
w('K1A18', 18, 'S1:T:L', 'MG1:P:P', 'left magneto P-lead', ['LEZ-74-100', 'LEZ-74-130'], { spec: SPEC.plead });
w('K2A18', 18, 'S1:T:R', 'MG2:P:P', 'right magneto P-lead', ['LEZ-74-100', 'LEZ-74-130'], { spec: SPEC.plead });
const tower = { 1: 0, 2: 0 };
for (const l of LEADS) { const m = l.mag < 0 ? 1 : 2, sp = `SP${cylNo[l.k]}${l.top ? 'T' : 'B'}`; w(`K${10 + m * 10 + (++tower[m])}`, 0, `MG${m}:T:${tower[m]}`, `${sp}:T:1`, `ignition, cyl ${cylNo[l.k]} ${l.top ? 'top' : 'bottom'}`, 'LEZ-74-110', { spec: SPEC.hv, hv: true }); }
// engine instruments
for (let k = 1; k <= 4; k++) {
  w(`E${k}A20`, 20, `A3:J1:${2 * k - 1}`, `TC${k}:T:+`, `CHT${k} +`, ['LEZ-77-100', 'LEZ-77-110'], { spec: SPEC.tc('J') }); w(`E${k}B20`, 20, `A3:J1:${2 * k}`, `TC${k}:T:-`, `CHT${k} −`, ['LEZ-77-100', 'LEZ-77-110'], { spec: SPEC.tc('J') });
  w(`E${k + 4}A20`, 20, `A3:J1:${7 + 2 * k}`, `TE${k}:T:+`, `EGT${k} +`, ['LEZ-77-100', 'LEZ-77-110'], { spec: SPEC.tc('K') }); w(`E${k + 4}B20`, 20, `A3:J1:${8 + 2 * k}`, `TE${k}:T:-`, `EGT${k} −`, ['LEZ-77-100', 'LEZ-77-110'], { spec: SPEC.tc('K') });
}
w('E9A22', 22, 'A3:J1:17', 'OT1:T:1', 'oil temp', ['LEZ-77-100', 'LEZ-77-110']); w('E9B22', 22, 'A3:J1:18', 'OT1:T:2', 'oil temp return', ['LEZ-77-100', 'LEZ-77-110']);
const tri = (n, pins, ref, sig, h) => pins.forEach((p, i) => w(`E${n}${'ABC'[i]}22`, 22, `A3:J1:${p}`, `${ref}:J1:${i + 1}`, `${sig} ${['supply', 'signal', 'return'][i]}`, h));
tri(10, [19, 20, 21], 'OP1', 'oil pressure', ['LEZ-77-100', 'LEZ-77-111']);
tri(11, [22, 23, 24], 'FP1', 'fuel pressure', ['LEZ-77-100', 'LEZ-77-111']);
tri(12, [25, 26, 27], 'MP1', 'manifold pressure', ['LEZ-77-100', 'LEZ-77-111']);
tri(13, [28, 29, 30], 'FT1', 'fuel flow', ['LEZ-77-100', 'LEZ-77-111']);
tri(14, [31, 32, 33], 'TS1', 'tach', ['LEZ-77-100', 'LEZ-77-110']);

// ------------------------------------------------------------------------------------------- wire lengths along the harness routes
const harnessPaths = (pn) => (partByPN(pn)?.geo || []).filter((g) => g.t === 'path').map((g) => g.pts);
function proj(poly, p) { // nearest point on a polyline: { d, s (arc length) }
  let best = { d: Infinity, s: 0 }, acc = 0;
  for (let i = 1; i < poly.length; i++) {
    const a = poly[i - 1], b = poly[i], ab = sub(b, a), L = len(ab), t = L ? Math.max(0, Math.min(1, dot(sub(p, a), ab) / (L * L))) : 0, q = add(a, mul(ab, t)), d = len(sub(p, q));
    if (d < best.d) best = { d, s: acc + t * L };
    acc += L;
  }
  return best;
}
/** length = drop from each end onto the route + run along the route (+ 0.5 ft service loops); multi-harness wires chain */
export function wireLength(wi) {
  const A = pinOf(wi.from), B = pinOf(wi.to);
  if (!A || !B) return 0;
  const hs = [].concat(wi.harness), pa = A.e.at, pb = B.e.at;
  if (hs.length === 1) {
    const paths = harnessPaths(hs[0]);
    if (!paths.length) return len(sub(pa, pb)) * 1.25 + 0.5;
    let best = Infinity;
    for (const poly of paths) { const x = proj(poly, pa), y = proj(poly, pb); best = Math.min(best, x.d + y.d + Math.abs(x.s - y.s)); }
    return best + 0.5;
  }
  // chain: from end → first harness → … → last harness → to end, hopping at the nearest points between harnesses
  let L = 0, cur = pa;
  hs.forEach((h, i) => {
    const paths = harnessPaths(h), target = i === hs.length - 1 ? pb : null;
    let best = { cost: Infinity };
    for (const poly of paths) {
      const x = proj(poly, cur), ends = [poly[0], poly[poly.length - 1]];
      const exit = target ? proj(poly, target) : null, exitPt = target ? null : ends.reduce((e, q) => (len(sub(q, cur)) > len(sub(e, cur)) ? q : e));
      const y = target ? exit : proj(poly, exitPt), cost = x.d + Math.abs(x.s - y.s) + (target ? exit.d : 0);
      if (cost < best.cost) best = { cost, next: exitPt };
    }
    L += best.cost; if (best.next) cur = best.next;
  });
  return L + 0.5;
}
for (const x of W) x.len = wireLength(x);
defineWires(W);
// harness masses from their wires
for (const p of PARTS.filter((q) => q.kind === 'harness' || q.kind === 'cable')) {
  const mine = WIRES.filter((x) => [].concat(x.harness)[0] === p.pn || [].concat(x.harness).includes(p.pn));
  if (!mine.length || p.massEachFixed) continue;
  const m = mine.reduce((a, x) => { const share = 1 / [].concat(x.harness).length; return a + share * x.len * (x.coax ? 0.05 /* RG-400 spec maximum, MIL-DTL-17/128B */ : x.hv ? 0.03 : x.spec.startsWith('thermocouple') ? 0.012 : x.spec.startsWith('M27500') ? 0.016 : AWG[x.awg]?.[1] || 0.01); }, 0);
  p.massEach = +(m * 1.15 / p.qty).toFixed(3); // +15 % terminals, sleeves, ties, clamps
}
// mark unused ground-block tabs as spares
for (const b of ['GB1', 'GB2']) { const e = EQUIP.find((x) => x.ref === b); for (const [k] of Object.entries(e.conns.J.pins)) if (Number(k) > gTab[b]) e.conns.J.pins[k] = 'SPARE'; else e.conns.J.pins[k] = 'GND'; }

// ------------------------------------------------------------------------------------------- electrical checks from the wire list
const R_ = (x) => (AWG[x.awg] ? AWG[x.awg][0] / 1000 * x.len : 0);
export function loads() {
  return EQUIP.filter((e) => e.load).map((e) => {
    const ws = WIRES.filter((x) => x.load === e.ref), I = e.peak || e.load, dv = ws.reduce((a, x) => a + I * R_(x), 0);
    return { e, ws, I, dv, lim: e.duty === 'int' ? 1.0 : 0.5 };
  });
}
registerChecks('wp7-elec', (d, lc) => {
  if (lc.id !== 'W1-S1') return [];
  const out = [], tag = (r) => { r.sys = 'LEZ-24-100'; out.push(r); };
  const L = loads(), cont = L.filter((x) => x.e.duty !== 'int'), Ic = cont.reduce((a, x) => a + x.e.load, 0) + 3.0 + 0.6, alt = partByPN('LEZ-24-150').alt;
  tag(mk('fuselage', 'elec-load', 'Alternator capacity vs continuous load', lc, 'main + essential bus', 'load analysis from the equipment list', 0.8 * alt / Ic - 1, {
    formula: 'MS = 0.8 · I_alt / Σ I_continuous − 1  (80 % alternator loading, FAR 23.1351 yardstick)',
    inputs: [['Alternator rating', alt, 'A', 'ASSUMED'], ['Field + contactor coil', 3.6, 'A', 'ASSUMED'], ...cont.map((x) => [`${x.e.ref} ${x.e.name}`, x.e.load, 'A', 'ASSUMED'])], result: [['Continuous load', Ic, 'A']] }));
  const vd = L.filter((x) => x.ws.length).sort((a, b) => b.dv / b.lim - a.dv / a.lim)[0];
  tag(mk('fuselage', 'elec-vdrop', 'Worst load voltage drop (supply + return wires)', lc, `${vd.e.ref} ${vd.e.name}`, vd.e.duty === 'int' ? 'intermittent limit' : 'continuous limit', vd.lim / vd.dv - 1, {
    formula: 'ΔV = I · Σ(R_AWG · L) over the supply and return wires of the load;  MS = ΔV_allow / ΔV − 1',
    inputs: [['Current', vd.I, 'A', 'ASSUMED'], ...vd.ws.map((x) => [`${x.id} ${x.awg} AWG`, x.len, 'ft', 'ROUTED']), ['Allowed drop (14 V)', vd.lim, 'V', 'AC 43.13']], result: [['Drop', vd.dv, 'V']] }));
  const prot = WIRES.filter((x) => x.cb && AWG[x.awg]).map((x) => ({ x, ms: AWG[x.awg][2] / x.cb - 1 })).sort((a, b) => a.ms - b.ms)[0];
  tag(mk('fuselage', 'elec-wire', 'Every protected wire rated above its breaker or fuse', lc, `${prot.x.id} ${prot.x.sig}`, 'bundled ampacity ≥ protection', prot.ms, {
    formula: 'MS = I_wire,bundled / I_breaker − 1 (minimum over every protected wire; FAR 23.1357)',
    inputs: [['Protection', prot.x.cb, 'A', 'DESIGN'], ['Wire', `${prot.x.awg} AWG`, 'text', 'DESIGN'], ['Bundled rating', AWG[prot.x.awg][2], 'A', 'ASSUMED']], result: [] }));
  const ess = L.filter((x) => x.e.bus === 'ess' && x.e.duty !== 'int'), Ie = ess.reduce((a, x) => a + x.e.load, 0), ah = partByPN('LEZ-24-110').ah, hrs = ah * 0.8 * 0.8 / Ie;
  tag(mk('fuselage', 'elec-ess', 'Essential bus on battery after alternator failure', lc, 'essential bus', 'endurance ≥ 30 min', hrs / 0.5 - 1, {
    formula: 't = Ah · 0.8 (age) · 0.8 (depth) / I_ess;  MS = t / 0.5 h − 1', inputs: [['Battery', ah, 'Ah', 'ASSUMED'], ...ess.map((x) => [`${x.e.ref} ${x.e.name}`, x.e.load, 'A', 'ASSUMED'])], result: [['Essential load', Ie, 'A'], ['Endurance', hrs * 60, 'min']] }));
  return out;
});

// ------------------------------------------------------------------------------------------- RF: coax loss budget and antenna separation
// RG-400 attenuation, dB per 100 ft: MIL-DTL-17/128B amd 2 Fig. 2 spec maxima (1575 and 2000 MHz log-interpolated between 1 and
// 3 GHz; src: repeater-builder.com mirror, accessed 2026-11-19); log-log interpolation; 0.1 dB per mated connector.
const RG400 = [[100, 4.5], [400, 10.5], [1000, 17.0], [1575, 23.7], [2000, 28.2]];
export const coaxDB = (f, ft) => { let i = 1; while (i < RG400.length - 1 && RG400[i][0] < f) i++; const [[f0, a0], [f1, a1]] = [RG400[i - 1], RG400[i]], a = Math.exp(Math.log(a0) + (Math.log(a1) - Math.log(a0)) * (Math.log(f) - Math.log(f0)) / (Math.log(f1) - Math.log(f0))); return a * ft / 100 + 0.2; };
// loss allowances: xpdr 1.5 dB DESIGN (Garmin GTX 35R/45R IM 190-01499-10 allows 2.0); elt 2.0 dB at 406 MHz (ACK E-04C manual
// E-04CM rev 1.2 sec. 3, confirmed); com 3.0 and gps 4.0 BOUND (not found in the Garmin manuals; accessed 2026-11-19)
export const RF_LIMIT = { com: 3.0, xpdr: 1.5, gps: 4.0, elt: 2.0 };
// minimum antenna-to-antenna spacing, inches: gps|gps 12, gps|xpdr 24 (GA 35S IM 190-02466-00 rev 3 sec. 2), com|gps 24 (G3X IM
// 190-01115-01 rev AV 20.4.2), elt|gps 48 and com|elt 36 (ACK E-04C manual sec. 3), elt|xpdr 36 (ACK E-04 pre-installation
// checklist); com|xpdr 24 BOUND (not found in the GTX manual text retrieved); all accessed 2026-11-19
export const ANT_SEP = { 'gps|gps': 12, 'com|gps': 24, 'elt|gps': 48, 'gps|xpdr': 24, 'com|elt': 36, 'com|xpdr': 24, 'elt|xpdr': 36 };   // keys in sorted order, as the lookup builds them (ICD J-F16)
const antKind = { AN1: 'com', AN2: 'xpdr', AN3: 'gps', AN4: 'gps', AN5: 'elt' };
registerChecks('wp7-rf', (d, lc) => {
  if (lc.id !== 'W1-S1') return [];
  const out = [];
  const runs = WIRES.filter((x) => x.rf).map((x) => ({ x, dB: coaxDB(x.rf.f, x.len), lim: RF_LIMIT[x.rf.kind] })).map((r) => ({ ...r, ms: r.lim / r.dB - 1 })).sort((a, b) => a.ms - b.ms);
  const g = runs[0];
  const r1 = mk('fuselage', 'rf-loss', 'Coax loss within each receiver / transmitter budget', lc, `${g.x.id} ${g.x.sig}`, 'RG-400 loss vs allowance', g.ms, {
    formula: 'loss = α(f) · L / 100 + 0.1 dB per connector;  MS = allowance / loss − 1 (minimum over every RF run)',
    inputs: runs.map((r) => [`${r.x.id} ${r.x.sig}: ${r.x.len.toFixed(1)} ft at ${r.x.rf.f} MHz, allowance ${r.lim} dB`, r.dB, 'dB', 'ROUTED / ASSUMED']), result: [['Governing loss', g.dB, 'dB']] });
  r1.sys = 'LEZ-34-111'; out.push(r1);
  const ants = EQUIP.filter((e) => antKind[e.ref]), pairs = [];
  for (let i = 0; i < ants.length; i++) for (let j = i + 1; j < ants.length; j++) {
    const a = ants[i], b = ants[j], k = [antKind[a.ref], antKind[b.ref]].sort().join('|'), req = ANT_SEP[k];
    if (req) { const dIn = len(sub(a.at, b.at)) * 12; pairs.push({ a, b, k, req, dIn, ms: dIn / req - 1 }); }
  }
  pairs.sort((x, y) => x.ms - y.ms);
  const s0 = pairs[0];
  const r2 = mk('fuselage', 'rf-sep', 'Antenna separation (GPS from GPS, transmitters and the ELT)', lc, `${s0.a.ref}–${s0.b.ref}`, 'distance ≥ rule', s0.ms, {
    formula: 'MS = distance / required spacing − 1 (minimum over every antenna pair with a rule)',
    inputs: pairs.map((x) => [`${x.a.ref} ${x.a.name} ↔ ${x.b.ref} ${x.b.name} (${x.k} rule ${x.req} in)`, x.dIn, 'in', 'GEOMETRY / ASSUMED']), result: [['Governing spacing', s0.dIn, 'in']] });
  r2.sys = 'LEZ-34-111'; out.push(r2);
  return out;
});
