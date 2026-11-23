// WP3 — electrical power (ATA 24), starting (80), ignition switching (74). 14 V, single alternator, battery in the
// nose for balance, main bus + essential bus behind the panel, single-point grounds (composite airframe: every
// return is a wire). Pin-level wire list for power circuits. Notional; FAR 23 / AC 43.13-1B yardsticks.
import { GEO, registerChecks, mk } from '../structures.js';
import { defineParts, defineGraph, definePass, defineReqs, adoptMass, partByPN, pathLength, V3 } from '../systems.js';
import { ENG, STARTER_PT, ALT_PT } from './wp1_powerplant.js';

const { sub, len } = V3;
const S1 = (title, inspect) => ({ title, inspect });
const EL = { massItem: 'elec' };
const FW = GEO.firewall;

// ------------------------------------------------------------------------------------------- layout (model frame, ft)
// positions and routes are block I's layout (wpI0_layout.js, inches); these are the model-frame points other modules use
import * as LY from './wpI0_layout.js';
const F = LY.F;
export const BATT = F(LY.BAT.c), MASTER = F(LY.K1.c), BUS = F(LY.MOD.busM.c), ESS = F(LY.MOD.FB2.c), GND_CABIN = F(LY.MOD.GB1.c);
export const STARTER_K = F(LY.K2.c), GND_FW = F(LY.GB2.c), STARTER = STARTER_PT, ALT = ALT_PT;
/** a raceway run: head points, two placeholders the routing pass replaces with the raceway lane, tail points */
const rw = (head, tail) => [...head.map(F), F([head.at(-1)[0], 46.02, head.at(-1)[2]]), F([tail[0][0], 104.50, tail[0][2]]), ...tail.map(F)];
export const RUNS = {
  start: rw(LY.R_START.head, LY.R_START.tail), gnd: rw(LY.R_GND.head, LY.R_GND.tail), startFw: LY.R_START_FW.map(F), starter: LY.R_STARTER.map(F), gndFw: LY.R_GND_FW.map(F),
  pwr: rw(LY.R_PWR.head, LY.R_PWR.tail), pump: rw(LY.R_PUMP.head, LY.R_PUMP.tail), pwrFw: LY.R_PWR_FW.map(F),
};
/** where each raceway run's head ends and its tail starts (for the routing plan in wp12) */
const plan = (R) => [R.head.length, R.head.length + 2];
export const RUN_PLAN = { start: plan(LY.R_START), gnd: plan(LY.R_GND), pwr: plan(LY.R_PWR), pump: plan(LY.R_PUMP), s13: plan(LY.R_S13) };
void ENG; void pathLength;

// (the wire table is wp7's AWG: AS22759/16 maxima, AC 43.13-1B Table 11-9; this module's unused copy was removed 2026-11-19)
// the pin-level wire list, loads and electrical checks live in wp7_wiring.js

// ------------------------------------------------------------------------------------------- parts
defineParts([
  { ...EL, pn: 'LEZ-24-100', name: 'Electrical power installation', kind: 'install', ata: 24, massEach: 0.8, geo: [{ t: 'box', c: BUS, d: [0.02, 0.02, 0.02], draw: false }],
    blurb: '14 V system. The battery lives in the nose for balance (it is the cheapest forward mass in the airplane); the price is about 13 ft of heavy starter and ground cable. A diode-fed essential bus keeps the EFIS, radio, transponder, boost pump and gear warning alive on the battery if the alternator or main bus fails.',
    steps: [S1('Continuity and insulation test of every wire against the wire list', ['Every wire labelled at both ends with its circuit ID', 'No ground loops: every return lands on a ground block']), S1('Load test on the ground with the engine running', ['Bus voltage 13.8–14.4 V at full load', 'Essential bus stays up with the master off and ESS ALT on'])],
    src: { mass: 'ASSUMED (terminals, labels, ties, clamps)' } },
  { ...EL, pn: 'LEZ-24-110', name: 'Battery, 12 V AGM, 16 Ah, in the nose', kind: 'cots', ata: 24, nha: 'LEZ-24-100', massEach: 15.4, geo: [{ t: 'box', c: BATT, d: [0, 1, 2].map((k) => (LY.BAT.box.hi[[1, 0, 2][k]] - LY.BAT.box.lo[[1, 0, 2][k]]) / 12) }],
    blurb: 'Sealed AGM in a vented box on a glassed shelf ahead of the canard bulkhead (F-22), outboard of the left NG-30 plate. 16 Ah gives the essential bus well over 30 minutes after an alternator failure.', ah: 16,
    interfaces: [{ id: 'batt-shelf', name: 'Battery hold-down → shelf inserts (shelf taped to the nose side wall)', host: 'fuselage', at: BATT, n: 4, d: 0.19, kind: 'insert', insertD: 0.60, embed: 0.375, tHost: 0.415, src: 'DESIGN: LEZ-24-110 shelf, 4 × AN3 into NAS1832-3 inserts potted Ø 0.60 × 0.375 in flox in 3/8 H45 / 2 BID',
      load: () => ({ F: [18 * 16.8, 0, 0], ult: true, note: 'battery, box and straps (16.8 lb) at 18 g forward (FAR 23.561(b)(3)(ii) items of mass; 14 CFR Part 23, 1-1-11 edition, accessed 2026-11-19), ultimate × KD' }) }],
    steps: [S1('Build the box and shelf; fit hold-down', ['Box vent overboard', 'Battery cannot move with 9 g forward on the hold-down'])], src: { mass: 'Typical 16 Ah AGM spec (ASSUMED)' } },
  { ...EL, pn: 'LEZ-24-120', name: 'Master contactor and battery fuses', kind: 'cots', ata: 24, nha: 'LEZ-24-100', massEach: 0.7, geo: [{ t: 'cyl', a: F([LY.K1.c[0] - LY.K1.L / 2, LY.K1.c[1], LY.K1.c[2]]), b: F([LY.K1.c[0] + LY.K1.L / 2, LY.K1.c[1], LY.K1.c[2]]), r: LY.K1.r / 12 }], src: { mass: 'ASSUMED' } },
  { ...EL, pn: 'LEZ-24-130', name: 'Main bus, essential bus, breakers, diode, ANL fuses (panel back)', kind: 'cots', ata: 24, nha: 'LEZ-24-100', massEach: 1.6, geo: [{ t: 'box', c: F([LY.MOD.plate.bl + 0.7, (LY.MOD.plate.fs[0] + LY.MOD.plate.fs[1]) / 2, (LY.MOD.plate.wl[0] + LY.MOD.plate.wl[1]) / 2]), d: [(LY.MOD.plate.fs[1] - LY.MOD.plate.fs[0]) / 12, 1.4 / 12, (LY.MOD.plate.wl[1] - LY.MOD.plate.wl[0]) / 12] }],
    blurb: 'Two fuse/breaker blocks behind the left panel. The essential bus is fed from the main bus through a Schottky diode and, by switch, straight from the battery.', src: { mass: 'ASSUMED' } },
  { ...EL, pn: 'LEZ-24-140', name: 'Ground blocks (cabin, firewall) and engine strap', kind: 'cots', ata: 24, nha: 'LEZ-24-100', massEach: 0.6, geo: [{ t: 'box', c: GND_FW, d: [LY.GB2.d[1] / 12, LY.GB2.d[0] / 12, LY.GB2.d[2] / 12] }, { t: 'box', c: GND_CABIN, d: [LY.MOD.GB1.d[1] / 12, LY.MOD.GB1.d[0] / 12, LY.MOD.GB1.d[2] / 12] }],
    blurb: 'Composite airframe, so no structure carries current: every return wire lands on one of two ground blocks, joined by the 1/0 AWG ground cable; the engine is strapped to the firewall block.', src: { mass: 'ASSUMED' } },
  { ...EL, pn: 'LEZ-24-150', name: 'Alternator 40 A (on the engine) and overvoltage relay', kind: 'cots', ata: 24, nha: 'LEZ-24-100', massEach: 0.4, geo: [{ t: 'box', c: F(LY.VR1.c), d: [LY.VR1.d[1] / 12, LY.VR1.d[0] / 12, LY.VR1.d[2] / 12] }],
    blurb: 'The alternator\'s own weight is in the engine record; this is the external regulator / overvoltage relay on the firewall.', alt: 40, src: { mass: 'ASSUMED' } },
  { ...EL, pn: 'LEZ-80-100', name: 'Starter contactor (firewall)', kind: 'cots', ata: 80, nha: 'LEZ-24-100', massEach: 0.7, geo: [{ t: 'cyl', a: F([LY.K2.c[0], LY.K2.c[1], LY.K2.h[0]]), b: F([LY.K2.c[0], LY.K2.c[1], LY.K2.h[1]]), r: LY.K2.r / 12 }], src: { mass: 'ASSUMED' } },
  { ...EL, pn: 'LEZ-80-110', name: 'Starter and ground cables, 1/0 AWG cabin runs, 2 AWG starter lead (nose to engine)', kind: 'harness', ata: 80, nha: 'LEZ-24-100', massEach: 0, // set from the wire list (wp7)
    geo: [{ t: 'path', pts: RUNS.start, dIn: 0.49, massPerFt: 0, cls: 'power' }, { t: 'path', pts: RUNS.gnd, dIn: 0.49, massPerFt: 0, cls: 'power' },
      { t: 'path', pts: RUNS.startFw, dIn: 0.49, massPerFt: 0, cls: 'power', shield: true }, { t: 'path', pts: RUNS.starter, dIn: 0.42, massPerFt: 0, cls: 'power', shield: true }, { t: 'path', pts: RUNS.gndFw, dIn: 0.49, massPerFt: 0, cls: 'power' }],
    blurb: 'The cost of a nose battery: about 13 ft each of 1/0 AWG positive and ground (upsized from 2 AWG for the 220 A cranking current). Firewall-aft, the positive runs up over the crankcase and down beside the nose case to the starter at the prop end, in fire sleeve with a heat shield where it passes the left exhaust stacks. Clamped on cushioned P-clamps at ≤ 18 in along the left side (AC 43.13-1B 11-96a allows 24 in), through the firewall in a fire-sealed boot.',
    steps: [S1('Crimp lugs with the hydraulic die; heat-shrink; label', ['Pull test every lug', 'Boot sealed at the firewall'])], src: { mass: 'Wire list × gauge mass' } },
  { ...EL, pn: 'LEZ-24-160', name: 'Power harness (all other circuits, pin-level wire list)', kind: 'harness', ata: 24, nha: 'LEZ-24-100',
    massEach: 0, // set from the wire list (wp7)
    geo: [{ t: 'path', pts: RUNS.pwr, dIn: 0.36, massPerFt: 0, cls: 'power' }, { t: 'path', pts: RUNS.pump, dIn: 0.20, massPerFt: 0, cls: 'power' }, { t: 'path', pts: RUNS.pwrFw, dIn: 0.36, massPerFt: 0, cls: 'power', shield: true }],
    // wire list: see the harness drawing (generated from WIRES)
    steps: [S1('Build on a harness board from the wire list; lace; label both ends', ['Every wire matches its ID, gauge and pin', 'Bundles ≥ 2 in from fuel lines, ≥ 6 in from exhaust'])], src: { mass: 'Wire list × gauge mass (ASSUMED)' } },
  { ...EL, pn: 'LEZ-74-100', name: 'Ignition / start key switch and shielded P-leads', kind: 'harness', ata: 74, nha: 'LEZ-24-100', massEach: 0.9,
    geo: [{ t: 'path', pts: [F([-10.30, 40.20, 37.35]), F([-9.6, 46.02, 37.1]), ...LY.R_PLEAD_TAIL.map(F)], dIn: 0.25, massPerFt: 0, cls: 'signal' }],   // head: the panel rev C node at BL −10.30, WL 37.35 (square through the LS bundle hole); block I's trunk tail into the boot's P-lead lane (block H to confirm)
    blurb: 'OFF-R-L-BOTH-START key switch; shielded 18 AWG P-leads to both magnetos, shields grounded at the magneto end only.',
    steps: [S1('Install key switch; terminate P-leads at the magnetos', ['Mag drop check: each magneto grounds in its key position', 'Hot-mag check at idle: engine stops in OFF'])], src: { mass: 'ASSUMED' } },
]);
definePass([{ id: 'fw-power', at: F([LY.BOOT.c[0], LY.FS_FW, LY.BOOT.c[1]]), r: LY.BOOT.r / 12, what: 'Power boot (block A layout): starter, ground, B-lead, field, P-leads and the engine-monitor harness, fire-sealed', fireproof: true }]);

// ------------------------------------------------------------------------------------------- schematic
defineGraph('electrical', {
  title: 'Electrical power (ATA 24 / 74 / 80)',
  nodes: [
    { id: 'B', label: 'Battery 16 Ah', sub: 'nose', col: 0, row: 1, pn: 'LEZ-24-110' },
    { id: 'K1', label: 'Master contactor', col: 1, row: 1, pn: 'LEZ-24-120' },
    { id: 'K2', label: 'Starter contactor', sub: 'firewall', col: 2, row: 0, pn: 'LEZ-80-100' },
    { id: 'ST', label: 'Starter', col: 3, row: 0, pn: 'LEZ-80-110' },
    { id: 'MB', label: 'Main bus', sub: 'panel back', col: 2, row: 1, pn: 'LEZ-24-130' },
    { id: 'ALT', label: 'Alternator 40 A', sub: 'B-lead, ANL 50 A', col: 3, row: 1, pn: 'LEZ-24-150' },
    { id: 'EB', label: 'Essential bus', sub: 'diode + battery alt.', col: 2, row: 2, pn: 'LEZ-24-130' },
    { id: 'EL', label: 'EFIS, COM, XPDR', sub: 'pump, gear warning', col: 3, row: 2, pn: 'LEZ-24-160' },
    { id: 'ML', label: 'Lights, landing brake', sub: 'intercom', col: 4, row: 1, pn: 'LEZ-24-160' },
    { id: 'G', label: 'Ground blocks', sub: 'cabin + firewall', col: 0, row: 2, pn: 'LEZ-24-140' },
  ],
  edges: [{ a: 'B', b: 'K1', cls: 'power' }, { a: 'K1', b: 'K2', cls: 'power', label: '2 AWG' }, { a: 'K2', b: 'ST', cls: 'power' }, { a: 'K1', b: 'MB', cls: 'power', label: '8 AWG' },
    { a: 'ALT', b: 'MB', cls: 'power' }, { a: 'MB', b: 'EB', cls: 'power', label: 'diode' }, { a: 'B', b: 'EB', cls: 'power', label: 'ESS ALT' }, { a: 'EB', b: 'EL', cls: 'power' }, { a: 'MB', b: 'ML', cls: 'power' }, { a: 'B', b: 'G', cls: 'ground' }],
});
defineReqs([{ id: 'R-ELEC-1', checks: /^elec-(load|vdrop|wire|ess)$/, closed: true }]);
adoptMass(['elec']);
void sub; void len;
