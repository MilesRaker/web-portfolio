// WPF9 — engine primer system LEZ-73-130 (integration 2026-11-19, Miles's decision: the MA-3A carburettor has no accelerator
// pump and Lycoming notes that an airframe primer may be required; memaudit engine eng-carb). A manual plunger primer under the
// right console's aft end, beside the pilot's right hip; a supply line from the gascolator's primer port, a delivery line through
// a spring check valve to the firewall, a tee on the engine side and two discharge nozzles in the right-bank intake pipes, cylinders
// 1 and 3. All lines 1/8 in copper with AN800 / AN805 primer unions; the engine-side runs fire-sleeved.
// Inches in the definition frame [BL, FS, WL] (wpF0); the system part's geometry is in feet [FS, BL, WL].
// Sources (accessed 2026-11-19; values not published are BOUND and say so):
//   pump      ACS Engine Primer 05-19920 (mfr model 10920; formerly Gerdes): 3-5/8 in overall, 3.5 oz, ports 5/16-24 SAE compression
//             with 61SM-02 nuts, panel up to about 3/4 in, $267.00, experimental use (aircraftspruce.com/catalog/pnpages/05-19920.php);
//             output per stroke and body diameter not published (BOUND: Ø 1.0 envelope)
//   valve     Zoro Select CHK BRS 215-2F2F-B 1/8 in FNPT brass piston check valve: Buna-N seal, 1 psi cracking, 500 psi, −20…180 °F,
//             1.38 in long, 9/16 hex, $20.59 (zoro.com G1818424); fuel service not stated by the seller (BOUND: Buna-N is a fuel
//             elastomer; confirm with the maker)
//   fittings  AN780-2 brass 1/8 NPT × 5/16-32 ($7.85), AN800-2 union cone ($1.85), AN805-2 union nut ($2.40), AN4022-1 discharge
//             nipple 1/8 NPT × 5/16-32 with its atomiser ($64.85), AN824-2D tee ($32.90), AN818-2D nut ($1.53), AN819-2D sleeve ($1.10)
//             (aircraftspruce.com/catalog/hapages/primerfittings.php and /pnpages/AN780-2.php)
//   tube      copper 1/8 × 0.030, Aircraft Spruce 03-40900, $3.75/ft (primerfittings page)
//   port      Andair GAS375 gascolator: 1/8 NPT port on the body, "a filtered supply to the primer pump" (Andair GAS01 rev 3;
//             Aircraft Spruce catalogue p. 167)
// Notional; not for construction.
import { registerChecks, mk, FIXED, GEO } from '../structures.js';
import { defineParts, partByPN, definePass } from '../systems.js';
import { FL, FPRIMS } from './wp1_powerplant.js';
import { RHO, VENDOR, T3, ftOf, tubeP, massEachF } from './wpF0_layout.js';
import { reachTo, REACH } from './wpB4_cabin.js';

const IN_ = (n, v, u, s = 'DERIVED') => [n, v, u, s], len = (a) => Math.hypot(...a), sub = (a, b) => a.map((v, i) => v - b[i]);
RHO.cu = 0.323;   // lb/in³, copper (BOUND: handbook value, typed)
export const PRM = {
  pump: { a: [7.4, 58.20, 37.4], b: [7.4, 61.50, 37.4], r: 0.50, knob: [[7.4, 61.50, 37.4], [7.4, 62.10, 37.4]], knobR: 0.50, lb: 3.5 / 16, cost: 267.00, pn: 'ACS 05-19920 (model 10920)' },
  valve: { a: [9.0, 59.70, 35.3], b: [9.0, 59.70, 33.92], r: 0.33, lb: 0.10 /* BOUND: not listed; brass envelope */, cost: 20.59 },
  tee: { c: [4.9, 133.80, 29.6], d: [0.6, 0.6, 0.6], lb: 0.04 /* BOUND */ },
  tube: { od: 0.125, w: 0.030, costFt: 3.75, sleeveOd: 0.40 /* AS1072 fire sleeve over the engine-side runs, envelope BOUND */ },
  port: [1.1, 129.96, 30.8],   // GAS375 primer port on the head's aft face (location on the body BOUND: the sheet shows a body port)
  // AN4022-1 nozzles in 1/8 NPT bosses on the induction sump's right face at the roots of the cylinder 3 (nearer the firewall) and 1
  // intake pipes; both on the right bank so no line crosses the mount's lower X or the carb-heat side (boss position BOUND: confirm on
  // the engine and its parts catalogue)
  nozzles: { C3: [3.84, 145.70, 29.9], C1: [3.84, 151.50, 29.9] },   // in the induction sump's right face at the cylinder 3 and 1 intake-pipe roots, pointing outboard
  tip: 0.25,
  fw: { fwd: 126.90, aft: 128.20 },
  pTest: 50,   // psi: BOUND, the most a hand plunger develops (typed); the lines are proof-tested to 1.5 × this
  cuFtu: 30000,   // psi: annealed copper tube (BOUND, typed)
};
const P = PRM, N = P.nozzles, TIP = (q) => [q[0] + P.tip, q[1], q[2]], PORT_AT = (q) => [q[0] + 0.2, q[1], q[2]];
/** the supply line: gascolator primer port → firewall → aft cabin → under the right console → pump inlet (on the pump's outboard side) */
export const SUPPLY = [P.port, [2.2, 130.50, 31.0], [2.6, 129.50, 31.3], [2.9, P.fw.aft, 31.6], [2.9, P.fw.fwd, 31.6], [6.9, 125.00, 31.6], [7.5, 114.50, 29.6], [9.4, 106.00, 28.8], [9.2, 94.50, 28.3], [9.0, 66.50, 27.8], [9.0, 58.70, 27.8], [9.0, 58.70, 36.2], [7.6, 58.70, 36.6], [7.4, 58.70, 36.9]];
/** the delivery line: pump outlet → check valve (vertical, in the line) → down and aft beside the supply → firewall → slack loop → tee */
export const DELIVERY = [[7.4, 59.70, 36.9], [7.6, 59.70, 36.6], [9.0, 59.70, 36.2], P.valve.a, P.valve.b, [9.0, 59.70, 28.6], [9.6, 60.70, 27.8], [9.6, 66.50, 27.8], [9.6, 94.50, 28.3], [9.9, 106.00, 29.3], [7.9, 114.50, 30.1], [7.4, 125.00, 31.6], [3.6, P.fw.fwd, 32.0], [3.6, P.fw.aft, 32.0], [5.6, 130.00, 31.6], [5.4, 131.70, 30.4], P.tee.c];
export const TO_3 = [P.tee.c, [5.4, 135.10, 29.1], [5.4, 140.50, 29.1], [4.6, 144.70, 29.3], PORT_AT(N.C3)];
export const TO_1 = [P.tee.c, [5.8, 135.10, 28.9], [5.8, 140.50, 28.9], [4.2, 145.50, 28.4], [4.2, 150.70, 29.9], PORT_AT(N.C1)];

/** developed length of a run (in) */
export const runLen = (pts) => pts.slice(1).reduce((a, q, i) => a + len(sub(q, pts[i])), 0);
export const prmLen = () => ({ supply: runLen(SUPPLY), delivery: runLen(DELIVERY.slice(0, 4)) + runLen(DELIVERY.slice(4)), cyl: runLen(TO_3) + runLen(TO_1) });
/** engine-side slack: the delivery from the firewall's aft face to the engine-mounted tee, against its chord (engine motion) */
export const prmSlack = () => { const k = DELIVERY.findIndex((q) => q[1] === P.fw.aft && q[0] === 3.6), seg = DELIVERY.slice(k); return { L: runLen(seg), chord: len(sub(seg.at(-1), seg[0])), slack: runLen(seg) - len(sub(seg.at(-1), seg[0])) }; };

// ------------------------------------------------------------------------------------------- primitives (solid, mass) and the system part
const cyl = (feat, group, a, b, r, extra = {}) => ({ t: 'cyl', feat, group, a: T3(a), b: T3(b), r: +r.toFixed(4), ...extra });
const box = (feat, group, c, d) => ({ t: 'box', feat, group, c: T3(c), d: T3(d) });
export function primerPrims() {
  const t = P.tube, line = (pts, feat) => tubeP(pts, t.od, t.w, feat, 'cu');
  const valveFree = (pts) => { const i = pts.indexOf(P.valve.a); return i < 0 ? [pts] : [pts.slice(0, i + 1), pts.slice(i + 1)]; };
  return [
    cyl('pump', 'env', P.pump.a, P.pump.b, P.pump.r), cyl('pump', 'env', ...P.pump.knob, P.pump.knobR),
    cyl('valve', 'env', P.valve.a, P.valve.b, P.valve.r),
    box('tee', 'env', P.tee.c, P.tee.d),
    ...Object.values(N).map((q) => cyl('nozzle', 'env', q, TIP(q), 0.22)),
    ...line(SUPPLY, 'supply'), ...valveFree(DELIVERY.slice(0, 4)).flatMap((q) => (q.length > 1 ? line(q, 'delivery') : [])), ...line(DELIVERY.slice(4), 'delivery'),
    ...line(TO_3, 'branch'), ...line(TO_1, 'branch'),
  ];
}
FPRIMS['LEZ-73-130'] = primerPrims();
// vendor masses (the envelopes carry no density): pump 3.5 oz, valve, tee, 2 nozzles + 8 union cones / nuts / adapters (BOUND 0.01 lb each)
VENDOR['LEZ-73-130'] = +(P.pump.lb + P.valve.lb + P.tee.lb + 2 * 0.03 + 14 * 0.01).toFixed(4);
const geoPath = (pts, extra = {}) => ({ t: 'path', pts: pts.map(ftOf), dIn: P.tube.od, wallIn: P.tube.w, cls: 'fuel', ...extra });
const geoCyl = (a, b, r) => ({ t: 'cyl', a: ftOf(a), b: ftOf(b), r: r / 12 });
export const PRIMER_PART = {
  pn: 'LEZ-73-130', name: 'Engine primer system (cockpit plunger, check valve, lines, nozzles to cylinders 1 and 3)', kind: 'line', ata: 73, nha: 'LEZ-28-100', massItem: 'engine',
  material: 'copper tube 1/8 × 0.030; brass AN primer unions; ACS 05-19920 plunger; brass check valve',
  geo: [geoCyl(P.pump.a, P.pump.b, P.pump.r), geoCyl(...P.pump.knob, P.pump.knobR), geoCyl(P.valve.a, P.valve.b, P.valve.r), { t: 'box', c: ftOf(P.tee.c), d: [P.tee.d[1] / 12, P.tee.d[0] / 12, P.tee.d[2] / 12] },
    ...Object.values(N).map((q) => geoCyl(q, TIP(q), 0.22)),
    geoPath(SUPPLY, { ends: ['LEZ-73-100:PRIMER', 'LEZ-73-130:IN'], endFit: ['AN780-2 adapter, AN805-2 / AN800-2', '61SM-02 nut (vendor)'] }),
    geoPath(DELIVERY.slice(0, 4), { ends: ['LEZ-73-130:OUT', 'LEZ-73-130:CV-IN'], endFit: ['61SM-02 nut (vendor)', 'AN780-2 adapter'] }),
    geoPath(DELIVERY.slice(4), { ends: ['LEZ-73-130:CV-OUT', 'LEZ-73-130:TEE'], endFit: ['AN780-2 adapter', 'AN818-2D / AN819-2D'], shield: true }),
    geoPath(TO_3, { ends: ['LEZ-73-130:TEE-3', 'LEZ-71-210:PRIMER-3'], endFit: ['AN818-2D / AN819-2D', 'AN805-2 / AN800-2 on AN4022-1'], shield: true }),
    geoPath(TO_1, { ends: ['LEZ-73-130:TEE-1', 'LEZ-71-210:PRIMER-1'], endFit: ['AN818-2D / AN819-2D', 'AN805-2 / AN800-2 on AN4022-1'], shield: true })],
  ports: { IN: { at: ftOf([7.4, 58.70, 36.9]), kind: 'fuel', fit: '5/16-24 SAE compression, 61SM-02 nut (underside port)' }, OUT: { at: ftOf([7.4, 59.70, 36.9]), kind: 'fuel', fit: '5/16-24 SAE compression, 61SM-02 nut (underside port)' },
    'CV-IN': { at: ftOf(P.valve.a), kind: 'fuel', fit: '1/8 FNPT, AN780-2' }, 'CV-OUT': { at: ftOf(P.valve.b), kind: 'fuel', fit: '1/8 FNPT, AN780-2' }, TEE: { at: ftOf(P.tee.c), kind: 'fuel', fit: 'AN824-2D run (inlet)' }, 'TEE-3': { at: ftOf(P.tee.c), kind: 'fuel', fit: 'AN824-2D branch to cylinder 3' }, 'TEE-1': { at: ftOf(P.tee.c), kind: 'fuel', fit: 'AN824-2D run to cylinder 1' } },
  hardware: [{ std: 'AN780-2', qty: 3, desc: '1/8 NPT × 5/16-32 brass adapters (gascolator port, check valve in and out)', each: 0.01 }, { std: 'AN800-2', qty: 5, desc: 'union cones', each: 0.005 }, { std: 'AN805-2', qty: 5, desc: 'union nuts', each: 0.01 },
    { std: 'AN4022-1', qty: 2, desc: 'primer discharge nipples (nozzles), cylinders 1 and 3', each: 0.03 }, { std: 'AN824-2D', qty: 1, desc: 'tee on the engine side', each: 0.04 }, { std: 'AN818-2D', qty: 3, desc: 'tee nuts', each: 0.005 }, { std: 'AN819-2D', qty: 3, desc: 'tee sleeves', each: 0.002 },
    { std: 'AN832-2D', qty: 2, desc: 'firewall bulkhead unions with AN924-2D nuts (BOUND: not on the fetched catalogue pages; any -2 steel bulkhead union)', each: 0.03 }, { std: 'MS21919WDG2', qty: 12, desc: 'cushion clamps at ≤ 12 in', each: 0.004 }],
  steps: [{ title: 'Bend the copper lines to the drawing, anneal the bends, make up the unions; fire-sleeve the engine-side runs', inspect: ['Proof test 1.5 × 50 psi, no leak', 'Engine side ≥ 0.5 in slack firewall → tee', 'Placard: PRIMER — IN AND LOCKED'] }],
  src: { mass: 'GEOMETRY + vendor masses (LEZ-73-130 record)' },
  blurb: 'Manual plunger primer under the right console\'s aft end, a supply line from the gascolator\'s primer port, a delivery line through a 1 psi spring check valve (no gravity siphon through an unlocked plunger) to two discharge nozzles in the intake pipes of cylinders 1 and 3 (right bank).',
};
PRIMER_PART.massEach = +(massEachF('LEZ-73-130', FPRIMS['LEZ-73-130']) + VENDOR['LEZ-73-130']).toFixed(4);
defineParts([PRIMER_PART]);
definePass([{ id: 'fw-primer-s', at: ftOf([2.9, GEO.firewall * 12, 31.6]), r: 0.21 / 12, what: 'Primer supply, steel bulkhead union AN832-2D at block A\'s layout hole, fire-sealed', fireproof: true },
  { id: 'fw-primer-d', at: ftOf([3.6, GEO.firewall * 12, 32.0]), r: 0.21 / 12, what: 'Primer delivery, steel bulkhead union AN832-2D at block A\'s layout hole, fire-sealed', fireproof: true }]);
{ const g = partByPN('LEZ-73-100'), e = partByPN('LEZ-71-210');
  if (g) g.ports.PRIMER = { at: ftOf(P.port), kind: 'fuel', fit: 'GAS375 1/8 NPT primer port (Andair GAS01 rev 3), AN780-2 adapter' };
  if (e) { e.ports['PRIMER-3'] = { at: ftOf(PORT_AT(N.C3)), kind: 'fuel', fit: 'AN4022-1 nozzle in the cylinder 3 sump primer boss at the intake-pipe root, 1/8 NPT (position BOUND); its 5/16-32 end' }; e.ports['PRIMER-1'] = { at: ftOf(PORT_AT(N.C1)), kind: 'fuel', fit: 'AN4022-1 nozzle in the cylinder 1 sump primer boss at the intake-pipe root, 1/8 NPT (position BOUND); its 5/16-32 end' }; } }
// the nozzles sit on the engine at the intake ports, beside the exhaust ports, the bottom plug leads and the cylinder fins: the
// last 3.5 in at each is metal tube in its fire sleeve, clamped to the intake pipe (installation practice: DESIGN), so the
// exhaust 6 in, ignition 2 in and part 0.25 in rules give way there (wpF1 separations, FIXED.fuelMates / fuelHotExempt)
export const NOZ_R = 6.5;
FIXED.fuelMates = [...(FIXED.fuelMates || []), ...Object.values(N).flatMap((q) => ['LEZ-71-210', 'LEZ-74-110', 'LEZ-78-100'].map((pn) => [pn, q, NOZ_R]))];
FIXED.fuelHotExempt = [...(FIXED.fuelHotExempt || []), ...Object.values(N).map((q) => ({ pn: 'LEZ-73-130', at: q, r: NOZ_R }))];

// ------------------------------------------------------------------------------------------- checks
export const prmReach = () => reachTo([P.pump.knob[1][0], P.pump.knob[1][1], P.pump.knob[1][2]], 1);
registerChecks('wpF9-primer', (d, lc) => {
  if (lc.id !== 'W1-S1') return [];
  const t = P.tube, burst = 2 * P.cuFtu * t.w / t.od, pU = d.FS * P.pTest, msT = burst / pU - 1, msV = 500 / pU - 1, s = prmSlack(), msS = s.slack / 0.5 - 1, R = prmReach(), msR = REACH.p5f / R.d - 1;
  const terms = [['copper line burst', msT], ['check valve rating', msV], ['engine-side slack', msS], ['knob reach (5th-pct female)', msR]].sort((a, b) => a[1] - b[1]);
  return [Object.assign(mk('fuselage', 'prm-sys', 'Primer system: line burst and check-valve rating at FS × the hand-plunger pressure, engine-motion slack, knob reach', lc, 'LEZ-73-130', terms[0][0], terms[0][1], {
    formula: 'burst = 2·F_tu·t/D vs FS·p;  valve 500 psi vs FS·p;  slack = L − chord (firewall → tee) vs 2 × 0.25 in;  knob within the 5th-percentile female reach from B\'s right shoulder;  MS = min − 1',
    inputs: [IN_('Hand plunger pressure', P.pTest, 'psi', 'BOUND: typed (the ACS 05-19920 page gives no output data)'), IN_('Factor of safety', d.FS, '', 'FAR23 23.303'), IN_('Copper F_tu (annealed)', P.cuFtu, 'psi', 'BOUND: handbook value, typed'),
      IN_('Tube', `${t.od} × ${t.w}`, 'in', 'VENDOR: Aircraft Spruce 03-40900 (accessed 2026-11-19)'), IN_('Check valve rating', 500, 'psi', 'VENDOR: Zoro Select CHK BRS 215-2F2F-B (zoro.com, accessed 2026-11-19)'),
      IN_('Engine motion at the engine end', 0.25, 'in', 'BOUND: block G isolator excursion (as fuel-hose)'), IN_('Reach, 5th-percentile female', REACH.p5f, 'in', REACH.src)],
    result: [['Burst', burst, 'psi'], ['Slack', s.slack, 'in'], ['Knob to the right shoulder', R.d, 'in'], ...terms.map(([k, m]) => [k, m, 'MS'])] }), { sys: 'LEZ-73-130' })];
});
