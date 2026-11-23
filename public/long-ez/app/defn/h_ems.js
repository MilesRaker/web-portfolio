// Block H definition records, ATA 77 engine indicating: LEZ-77-100 Garmin GEA 24 with its shelf and cabin harness,
// LEZ-77-110 engine sensors and the harness trunks and branches, LEZ-77-111 branches to the manifold and the fuel-flow
// transducer, LEZ-77-120 firewall sensor manifold, LEZ-77-121 sensor lines, LEZ-77-130 fuel-flow transducer.
// Notional; vendor data typed from memory are marked.
import { partByPN, EQUIP, WIRES } from '../systems.js';
import { LAYOUT } from '../parts/wpA3_firewall.js';
import { ptsOf, fwCrossing, P3, pathLen } from '../parts/wpH0_route.js';
import * as LY from '../parts/wpH1_layout.js';
import { RUNS } from '../parts/wpH2_runs.js';
import { SENSORS, HOSE_RATE, MANI_MASS } from '../parts/wpH3_checks.js';
import * as PR from '../parts/wpH4_prims.js';
import { fx, rev0, rec, massFrom, near } from './h_common.js';

const inBoot = (pn, i) => { const q = fwCrossing(ptsOf(RUNS[pn][i])), d = Math.hypot(q[0] - LY.BOOT.c[0], q[1] - LY.BOOT.c[1]) + RUNS[pn][i].od / 2; return { ok: d <= LY.BOOT.r - 0.25, detail: `BL ${fx(q[0])}, WL ${fx(q[1])}: ${fx(d)} in from the boot centre (Ø ${2 * LY.BOOT.r})` }; };
const ends = (pn, i) => ptsOf(RUNS[pn][i]);

// ------------------------------------------------------------------------------------------- LEZ-77-100
const GP = PR.geaParams();
export const GEA_DEF = rec({
  pn: 'LEZ-77-100', nha: 'LEZ-31-100', qty: 1, kind: 'cots', title: 'GEA 24 engine interface and harness',
  revs: rev0('Initial definition. The 2.2 lb "unit + probes + harness" overlapped the sensor, branch, manifold and line records (H-F16), the unit had no shelf (H-F21) and the harness crossed the firewall through left leg A. As defined: the GEA 24 (envelope and weight typed) on a 0.063 6061-T6 shelf flanged to the panel\'s forward face, its sensor harness down raceway LS, under the centre-section spar and through block A\'s power boot to the break at FS 153.7; the probes, branches, manifold and lines are their own records.').concat([{ rev: 'B', date: '2026-11-19', short: 'Panel flange lowered', change: 'Block J interface: the shelf flange on the panel\'s forward face stood to WL 37.03, 0.02 in under the AXIS LCD collar (bottom WL 37.05, BL −3.98 inboard; ICD J-R3). Its top is now WL 36.75 (flange 0.93 in tall, the two #8 screws unchanged); clearance to the collar 0.30 in.' }]),
  params: GP, datums: [{ id: 'A', what: 'Panel forward face, FS 40.75' }, { id: 'B', what: 'Shelf top face' }],
  features: [
    { id: 'unit', kind: 'envelope', label: `GEA 24 ${PR.GEA24.d.join(' × ')} in, ${PR.GEA24.lb} lb; four connectors J241–J244 (9-pin network / power, 50-pin misc, 25-pin thermocouple, 37-pin misc; Garmin G3X IM 190-01115-01 rev AV §23.4, accessed 2026-11-19)`, tol: 'Vendor' },
    { id: 'shelf', kind: 'sheet', label: '0.063 6061-T6 shelf with 4 × Ø 0.165 for #8 screws to the unit, flanged to the panel with 2 × #8 into nutplates (block B)', tol: '±0.03' },
    { id: 'harness', kind: 'harness', label: `Sensor harness to the boot break, ${fx(pathLen(ends('LEZ-77-100', 0)), 0)} in`, tol: 'Route ±1/4 in' },
  ],
  drawingNotes: ['CAN: mid-bus between the G5 and the GSU 25D (no terminator), wires D2 / D3 (block J).', 'Power from CB2:3 EIS 2 A (essential bus, block I).', 'Crossings moved: the firewall (power boot); the panel, the seat back and FS 130.2 unchanged.'],
  generalNote: 'Configure the GEA 24 sensor types and limits on the GDU (block J).',
  na: { cut: 'Bought-in unit; shelf flat pattern 4.4 × 10.7 in', layup: 'Not a composite part' },
  material: { spec: 'Garmin GEA 24, 010-01042-00 (unit only 011-02848-00, connector kit 011-02886-00; GEA 24B 010-02770-00 is the current alternative; Garmin G3X IM 190-01115-01 rev AV); shelf AMS-QQ-A-250/11 6061-T6 0.063; harness M27500 / thermocouple extension per the wire list', alt: '—', form: 'bought unit, sheet shelf', density: null, allowables: [['Unit weight', `${PR.GEA24.lb} lb (typed)`, 'VENDOR']] },
  process: [{ op: 'Shelf', spec: 'Cut and bend; nutplates for the unit; bolt to the panel flange.' }, { op: 'Install', spec: 'Unit on the shelf; harness on raceway LS; boot at the firewall; break at FS 153.7 clamped to the firewall.' }],
  checks: ['ems-route', 'ems-range'],
  mass: { each: massFrom(GP, PR.GEA_RHO()), from: `unit ${PR.GEA24.lb} lb (Garmin G3X IM 190-01115-01 rev AV), connector backshells BOUND, shelf × 0.098, harness ${PR.GEA24.harnessLbFt} lb/ft (typed) over the solid` },
  hardware: [{ std: 'MS51958-63 + MS21047L08', qty: 4, desc: '#8 screws and nutplates, unit to the shelf', each: 0.004 }, { std: 'MS51958-63 + MS21047L08', qty: 2, desc: 'shelf flange to the panel (block B nutplates)', each: 0.004 }],
  hardwareNote: '6 × #8 screws and nutplates.',
  interfaces: [
    { id: 'I1', with: 'LEZ-53-180 power boot (blocks A, I)', feature: 'harness', what: 'Crossing inside the boot', check: () => inBoot('LEZ-77-100', 0) },
    { id: 'I2', with: 'LEZ-31-110 GDU 116C and the CAN bus (block J)', feature: 'unit', what: 'CAN in and out wired (D2, D3)', check: () => { const ok = ['D2A22', 'D3A22'].every((id) => WIRES.some((w) => w.id === id)); const o = WIRES.find((w) => w.id === 'D1A22'), g = WIRES.find((w) => w.id === 'D9A22'), order = ok && o?.from.startsWith('A1:') && o?.to.startsWith('A7:') && g?.from.startsWith('A2:') && g?.to.startsWith('A10:'); return { ok: !!order, detail: `CAN AXIS → G5 (D1) → GEA 24 (D2 J2:3/4) → GSU 25D (D3 J2:5/6) → GMU 11 (D9): the order J agreed (docs/blocks/j_avionics.md)` }; } },
    { id: 'I3', with: 'LEZ-31-100 panel (block B)', feature: 'shelf', what: 'Shelf flange on the panel\'s forward face', check: () => ({ ok: Math.abs(GP.prims.find((p) => p.feat === 'shelf' && p.d[1] < 0.1).c[1] + 0.0315 - 40.749) < 1e-3, detail: 'flange at FS 40.75 (B to add 2 × #8 nutplates)' }) },
  ],
  sourcing: { blank: 'GEA 24 with connector kit; 0.063 6061-T6 sheet 6 × 12', vendor: 'Garmin dealer (GEA 24 010-01042-00)', url: 'https://www.garmin.com/', cost: 1188, costAsOf: '2026-11-19', perAircraft: 1, lead: 'Stock', note: 'Aircraft Spruce G3X Touch worksheet, accessed 2026-11-19.' },
});

// ------------------------------------------------------------------------------------------- LEZ-77-110
const SNP = PR.sensorParams();
export const SNS_DEF = rec({
  pn: 'LEZ-77-110', nha: 'LEZ-77-100', qty: 1, kind: 'harness', title: 'Engine sensors and harness branches',
  revs: rev0('Initial definition. The branches ran through the rear stacks, the muff, the SCAT and the ETR–EBR mount tube, and the harness break floated between the firewall and the engine (H-F13, F14). As defined: from the break on the firewall, a trunk with a service loop to a clamp on the accessory housing top and a branch with a loop to a clamp on the accessory face; four branches over the crankcase and down outboard of the stacks, muff and SCAT to each cylinder\'s probe break; CHT bayonets under the bottom plugs, EGT clamps on the risers, named by Lycoming cylinder number.'),
  params: SNP, datums: [{ id: 'A', what: 'Harness break at the firewall, FS 153.7' }],
  features: [
    { id: 'trunk', kind: 'harness', label: 'Trunks (CHT / EGT trunk to the accessory-housing clamp; oil-T / tach branch to the accessory-face clamp), shielded, fire-sleeved', tol: 'Route ±1/4 in' },
    { id: 'branch', kind: 'harness', label: 'Four cylinder branches (J and K pairs), fire-sleeved; probe pigtails ≤ 8 in', tol: 'Route ±1/4 in' },
    { id: 'cht', kind: 'probe', label: 'CHT probes, type K, 3/8-24 threaded (Alcor 86253 / Garmin 494-70000-00; type J also supported) in each cylinder\'s CHT well (Garmin G3X IM 190-01115-01 rev AV)', tol: 'Vendor' },
    { id: 'egt', kind: 'probe', label: 'EGT clamp-on probes, type K, 2.2 in aft of each flange on the riser', tol: 'Same distance on every stack ±1/8 in' },
    { id: 'oilt', kind: 'probe', label: 'Oil-temperature sender in the accessory housing', tol: 'Vendor' },
    { id: 'tach', kind: 'probe', label: 'Hall tach pick-up on the tach drive (rev B pad)', tol: 'Vendor' },
  ],
  drawingNotes: ['Channels: CHTn / EGTn = Lycoming cylinder n (1 right front … 4 left rear, front = prop end).', 'Every branch ≥ 1 in from the stacks, muff and SCAT except the probe pigtails.'],
  generalNote: 'EMS reads all four CHT and EGT in the right order on the first run.',
  na: { cut: 'Harness made on the board', layup: 'Not a composite part' },
  material: { spec: 'Type J / K thermocouple extension 20 AWG glass / PTFE; M27500 shielded for the tach and oil T; AS1072 fire sleeve; probes from the GEA 24 sensor kit (Table 21-2: GPT 150G oil P, 30 psia MAP, FT-60, 4 CHT, 4 EGT, oil-T RTD, shunt; Garmin G3X IM 190-01115-01 rev AV)', alt: '—', form: 'harness and bought probes', density: null, allowables: SENSORS.slice(0, 4).map((s) => [s.what, `to ${fx(s.top, 0)} ${s.u} (typed)`, 'VENDOR']) },
  process: [{ op: 'Install', spec: 'Probes to the engine maker\'s torques; branches on cushion clamps to the engine; service loops left free.' }],
  checks: ['ems-route', 'ems-range'],
  mass: { each: massFrom(SNP, PR.SENSOR_RHO()), from: 'wire 0.045 lb/ft and the probes at typed vendor weights over the solid' },
  hardware: [{ std: 'MS21919WDG4', qty: 24, desc: 'cushion clamps on the engine', each: 0.005 }], hardwareNote: '24 cushion clamps.',
  interfaces: [
    { id: 'I1', with: 'LEZ-71-210 rev B probe bosses, sender and tach pad', feature: 'cht', what: 'Each probe on its feature (equipment points)', check: () => { const bad = [1, 2, 3, 4].filter((n) => near(P3(EQUIP.find((e) => e.ref === `TC${n}`).at), LY.TC(LY.CYL_OF[n])) > 0.01); const ts = near(P3(EQUIP.find((e) => e.ref === 'TS1').at), LY.TACH.b); return { ok: !bad.length && ts < 0.01, detail: `TC1–4 on the bottom-plug bosses, TS1 on the tach pad${bad.length ? `; off: ${bad.join(', ')}` : ''}` }; } },
    { id: 'I2', with: 'LEZ-77-100 harness break', feature: 'trunk', what: 'Trunks start at the break on the firewall', check: () => { const d = [0, 1].map((i) => near(ends('LEZ-77-110', i)[0], ends('LEZ-77-100', 0).at(-1))); return { ok: Math.max(...d) < 0.01, detail: `${d.map((x) => fx(x, 3)).join(' / ')} in` }; } },
  ],
  sourcing: { blank: 'Garmin sensor kit (4 CHT, 4 EGT, oil T, oil P, MAP, FT-60, shunt) + carb fuel-P sensor + UMA T1A9-1 tach sensor; 30 ft K extension', vendor: 'Garmin dealer (GEA 24 sensor kit)', url: 'https://www.garmin.com/', cost: 1180 + 384 + 149.75 - 485, costAsOf: '2026-11-19', perAircraft: 1, lead: 'Stock', note: 'Kit $1,180 (Aircraft Spruce G3X Touch worksheet, accessed 2026-11-19), less its FT-60 (costed on LEZ-77-130); the kit has no fuel-P or RPM sensor: carb fuel-P 0–15 psig $384 and UMA T1A9-1 $149.75 added (same source). The oil-P and MAP transducers come in the kit; LEZ-77-120 carries the block and fittings.' },
});

// ------------------------------------------------------------------------------------------- LEZ-77-111
const BP = PR.branchParams();
export const BRN_DEF = rec({
  pn: 'LEZ-77-111', nha: 'LEZ-77-100', qty: 1, kind: 'harness', title: 'Branches to the manifold and flow sensor',
  revs: rev0('Initial definition. The manifold branch ran back from the floating break (H-F14). As defined: the manifold branch from the firewall break across the firewall to the three transducer connectors (no engine motion), the fuel-flow branch from the cabin harness tail to the transducer\'s connector.'),
  params: BP, datums: [],
  features: [{ id: 'manifold', kind: 'harness', label: 'Manifold branch: three 3-wire transducer leads', tol: 'Route ±1/4 in' }, { id: 'fft', kind: 'harness', label: 'Fuel-flow branch: 3-wire to the transducer, above the fuel line by ≥ 1 in', tol: 'Route ±1/4 in' }],
  na: { cut: 'Harness', layup: 'Not a composite part' },
  material: { spec: 'M27500-22 three-conductor shielded (typed)', alt: '—', form: 'harness', density: null, allowables: [] },
  process: [{ op: 'Install', spec: 'Connectors to the transducers; clamp to the firewall face and the cabin floor.' }],
  checks: ['ems-route'],
  mass: { each: massFrom(BP, PR.BRANCH_RHO), from: 'wire 0.040 lb/ft (typed) over the solid' },
  hardware: [{ std: 'MS21919WDG3', qty: 4, desc: 'cushion clamps', each: 0.005 }], hardwareNote: '4 clamps.',
  interfaces: [{ id: 'I1', with: 'LEZ-77-120 transducers and LEZ-77-130', feature: 'manifold', what: 'Branches end above their connectors', check: () => { const m = ends('LEZ-77-111', 1).at(-1), f = ends('LEZ-77-111', 0).at(-1); return { ok: Math.abs(m[2] - LY.XD_TOP('OIL-P')[2]) < 1.0 && near([f[0], f[1]], [LY.FFT_AT[0], LY.FFT_AT[1]]) < 0.01, detail: `manifold branch end WL ${fx(m[2])}; FFT branch over the transducer` }; } }],
  sourcing: { blank: '6 ft three-conductor shielded wire', vendor: 'Aircraft Spruce', url: 'https://www.aircraftspruce.com/', cost: 30, costAsOf: '2026-11-18', perAircraft: 1, lead: 'Stock', note: 'Typed.' },
});

// ------------------------------------------------------------------------------------------- LEZ-77-120
const MP = PR.maniParams(), MANI_LB = massFrom(MP, PR.MANI_RHO());
MANI_MASS.lb = MANI_LB;
export const MANI_DEF = rec({
  pn: 'LEZ-77-120', nha: 'LEZ-77-100', qty: 1, kind: 'machined', title: 'Firewall sensor manifold',
  revs: rev0(`Initial definition. The manifold sat on the right lower bracket's leg A (H-F1). As defined: a ${fx(LY.MANI.bl[1] - LY.MANI.bl[0])} × ${LY.MANI.depth} × ${fx(LY.MANI.wl[1] - LY.MANI.wl[0])} in 6061-T6 block on block A's two AN3 holes (BL 1.40 / 3.40, WL 33.40) through flox inserts, three transducers on its top face (connectors up), the -3 hoses from AN822-3D elbows on its bottom face; ${fx(MANI_LB, 3)} lb installed (≤ 0.6 lb allowance).`),
  params: MP, datums: [{ id: 'A', what: 'Mounting face on the fire layer (FS 153.14)' }, { id: 'B', what: 'AN3 hole line, WL 33.40' }],
  features: [
    { id: 'block', kind: 'block', label: 'Block with 2 × Ø 0.191 AN3 holes and three 1/8-27 NPT ports top and bottom joined by Ø 0.125 drillings', tol: 'Holes ±0.005 to the firewall layout' },
    { id: 'xd', kind: 'envelope', label: `Transducers Ø ${LY.MANI.xd.d} × ${LY.MANI.xd.L} in + connector: MAP 0–30 psia, fuel 0–15 psig, oil 0–150 psi (GPT 150G) (Garmin G3X IM 190-01115-01 rev AV)`, tol: 'Vendor' },
    { id: 'elbow', kind: 'fitting', label: 'AN822-3D elbows, outlets aft', tol: 'Clocked aft ±10°' },
  ],
  tolerances: { general: '.XX ±0.03, .XXX ±0.005', holes: 'AN3 holes on the firewall pattern ±0.005', breakEdges: '0.010' },
  drawingNotes: ['Leak test each port at 1.5 × its maximum pressure.'], generalNote: 'Anodise.',
  na: { cut: 'Machined from bar', layup: 'Not a composite part' },
  material: { spec: 'AMS-QQ-A-225/8 6061-T6 bar; transducers per the GEA 24 list (Garmin G3X IM 190-01115-01 rev AV); AN822-3D steel elbows', alt: '2024-T351 bar', form: 'bar', density: 0.098, allowables: [['6061-T6 F_tu', '42 ksi', 'MMPDS (typed)']] },
  process: [{ op: 'Machine', spec: 'Mill the block; drill and tap the ports; drill the AN3 holes to the firewall template.' }, { op: 'Install', spec: '2 × AN3 through the firewall inserts with AN970 washers on the cabin side; transducers with thread sealant; elbows clocked aft.' }],
  checks: ['mani-bolt', 'ems-range'],
  rules: [{ id: 'mass', label: 'Installed mass ≤ the firewall layout\'s 0.6 lb allowance', v: 0.6 / MANI_LB, min: 1 }],
  mass: { each: MANI_LB, from: 'block × 0.098, transducers and elbows at typed vendor weights over the solid' },
  hardware: [{ std: 'AN3-6A', qty: 2, desc: 'through the firewall inserts', each: 0.014 }, { std: 'AN970-3', qty: 2, desc: 'cabin-side washers', each: 0.004 }, { std: 'MS21042L3', qty: 2, desc: 'nuts', each: 0.004 }],
  hardwareNote: '2 × AN3-6A, AN970-3 cabin side, MS21042L3.',
  interfaces: [
    { id: 'I1', with: 'LEZ-53-180 firewall layout (block A): mani', feature: 'block', what: 'AN3 holes on the layout\'s holes', check: () => { const L = LAYOUT.find((q) => q.id === 'mani'), d = Math.max(...L.pts.map((p, i) => Math.hypot(p[0] - LY.MANI_HOLES[i][0], p[1] - LY.MANI_HOLES[i][1]))); return { ok: d < 1e-6, detail: `holes at ${L.pts.map((p) => p.join(' / ')).join(', ')}; allowance ${L.mass} lb vs ${fx(MANI_LB, 3)}` }; } },
    { id: 'I2', with: 'LEZ-77-121 lines', feature: 'elbow', what: 'Line ends on the elbows', check: () => { const d = ['FUEL-P', 'MAP', 'OIL-P'].map((k, i) => near(ends('LEZ-77-121', i)[0], LY.MANI_PORT(k))); return { ok: Math.max(...d) < 0.01, detail: `${d.map((x) => fx(x, 3)).join(' / ')} in` }; } },
  ],
  tooling: { needed: true, text: 'Firewall hole template (block A) as the drill guide for the AN3 holes.' },
  sourcing: { blank: '6061-T6 bar 1 × 1 × 4; three transducers; three AN822-3D', vendor: 'Garmin dealer (transducers), Aircraft Spruce (bar, fittings)', url: 'https://www.aircraftspruce.com/', cost: 80, costAsOf: '2026-11-19', perAircraft: 1, lead: 'Stock', note: 'Bar and fittings only: the three transducers are costed in LEZ-77-110 (kit + fuel-P). Bar and fittings BOUND.' },
});

// ------------------------------------------------------------------------------------------- LEZ-77-121
const LP = PR.lineParams();
export const LINE_DEF = rec({
  pn: 'LEZ-77-121', nha: 'LEZ-77-120', qty: 1, kind: 'line', title: 'Sensor lines, -3 hose',
  revs: rev0('Initial definition. The lines ran 0.34 in from the mount tubes to the old manifold position. As defined: three -3 hoses from the manifold\'s elbows to the engine: fuel pressure from block F\'s tee at the carburettor inlet (F owns the tee), oil pressure from the accessory-housing boss with a 0.040 in restrictor, MAP from the intake riser boss on the sump\'s right side (rev B); each with a service loop for the engine motion.'),
  params: LP, datums: [],
  features: [{ id: 'fuel-p', kind: 'tube', label: 'Fuel-P line, -3 hose', tol: 'Length ±1/4 in' }, { id: 'map', kind: 'tube', label: 'MAP line, -3 hose', tol: 'Length ±1/4 in' }, { id: 'oil-p', kind: 'tube', label: 'Oil-P line, -3 hose, restrictor at the engine end', tol: 'Length ±1/4 in' }],
  drawingNotes: ['AS1072 fire sleeve full length; ends clamped; no clamp across the service loop.'], generalNote: 'Pressure test 1.5 × maximum; no leaks.',
  na: { cut: 'Made to length', layup: 'Not a composite part' },
  material: { spec: '-3 hose Aeroquip 303-3 class, 3,000 psi, 0.120 lb/ft (Aircraft Spruce, accessed 2026-11-19), swivel ends; AS1072 fire sleeve', alt: '—', form: 'hose', density: null, allowables: [['Working pressure', `${HOSE_RATE.work} psi (303-3 data, accessed 2026-11-19)`, 'VENDOR']] },
  process: [{ op: 'Make up', spec: 'Cut, fit the ends, proof test, sleeve.' }],
  checks: ['sns-line'],
  mass: { each: massFrom(LP, PR.LINE_RHO), from: `${LY.HOSE3.lbFt} lb/ft (303-3, accessed 2026-11-19; sleeve BOUND) over the solid` },
  hardware: [{ std: 'AN816-3D', qty: 3, desc: 'engine-end nipples', each: 0.01 }, { std: 'MS21919WDG5', qty: 3, desc: 'end clamps', each: 0.006 }], hardwareNote: '3 nipples, 3 clamps.',
  interfaces: [{ id: 'I1', with: 'LEZ-71-210 ports and block F\'s tee', feature: 'fuel-p', what: 'Engine ends on the ports', check: () => { const d = ['CARB-PT', 'MAP', 'OIL-P'].map((k, i) => near(ends('LEZ-77-121', i).at(-1), LY.ENG_PORTS[k])); return { ok: Math.max(...d) < 0.01, detail: `${d.map((x) => fx(x, 3)).join(' / ')} in (CARB-PT is block F's tee)` }; } }],
  sourcing: { blank: '4 ft -3 hose, 6 ends, 4 ft fire sleeve', vendor: 'Aircraft Spruce (Aeroquip / Stratoflex -3 hose)', url: 'https://www.aircraftspruce.com/', cost: 150, costAsOf: '2026-11-18', perAircraft: 1, lead: 'Made to length', note: 'Typed.' },
});

// ------------------------------------------------------------------------------------------- LEZ-77-130
const FP = PR.fftParams();
export const FFT_DEF = rec({
  pn: 'LEZ-77-130', nha: 'LEZ-77-100', qty: 1, kind: 'cots', title: 'Fuel-flow transducer and bracket',
  revs: rev0('Initial definition. The transducer had no host (H-F19). As defined: the turbine transducer (envelope and data typed) on a 0.063 6061-T6 bracket with 2 × #8 into nutplates on a G-10 standoff bonded to the floor; ports horizontal, connector up; block F\'s lines end on its ports. It sits 1.8 in below the firewall union, so its inlet carries a tee with a quick drain at the low point (block F\'s open item).'),
  params: FP, datums: [{ id: 'A', what: 'Port axis' }],
  features: [{ id: 'body', kind: 'envelope', label: `Transducer ${LY.FFT.L} × ${LY.FFT.w} × ${LY.FFT.h} in, 0.6–70 gph (EI FT-60; Garmin G3X IM 190-01115-01 rev AV; envelope from the FT-60 data, accessed 2026-11-19)`, tol: 'Vendor' }, { id: 'ports', kind: 'port', label: '1/4 NPT in and out with AN816-6D nipples, flow arrow aft', tol: '—' }, { id: 'bracket', kind: 'sheet', label: '0.063 6061-T6 bracket, 2 × Ø 0.165', tol: '±0.03' }, { id: 'drain', kind: 'fitting', label: 'AN917-1D tee on the inlet with a flush quick drain pointing down: the transducer is the low point of the run to the union (block F)', tol: '—' }],
  drawingNotes: ['Mount with the ports horizontal and the wires up (vendor).'],
  na: { cut: 'Bought-in; bracket from sheet', layup: 'Not a composite part' },
  material: { spec: 'Turbine fuel-flow transducer EI FT-60 (Red Cube), GEA 24 compatible (Garmin G3X IM 190-01115-01 rev AV)', alt: '—', form: 'bought', density: null, allowables: [['Range', '0.6–70 gph', 'VENDOR (Garmin G3X IM 190-01115-01 rev AV)']] },
  process: [{ op: 'Install', spec: 'Bracket on the bonded standoff; transducer with thread sealant on the nipples; F connects its lines.' }],
  checks: ['ems-range'],
  mass: { each: massFrom(FP, PR.FFT_RHO()), from: `transducer ${LY.FFT.lb} lb (FT-60 data, accessed 2026-11-19) and the bracket over the solid` },
  hardware: [{ std: 'MS51958-63 + MS21047L08', qty: 2, desc: '#8 to the standoff nutplates', each: 0.004 }, { std: 'AN816-6D', qty: 2, desc: 'nipples', each: 0.02 }, { std: 'AN917-1D + CCR-1000 class quick drain (typed)', qty: 1, desc: 'inlet drain tee', each: 0.03 }], hardwareNote: '2 × #8; 2 nipples; inlet drain tee.',
  interfaces: [{ id: 'I1', with: 'LEZ-28-150 fuel lines (block F)', feature: 'ports', what: 'Ports where F\'s lines end', check: () => { const p = partByPN('LEZ-77-130').ports; const d = [near(P3(p.IN.at), [LY.FFT_AT[0], LY.FFT_AT[1] - LY.FFT.port, LY.FFT_AT[2]]), near(P3(p.OUT.at), [LY.FFT_AT[0], LY.FFT_AT[1] + LY.FFT.port, LY.FFT_AT[2]])]; return { ok: Math.max(...d) < 0.01, detail: `IN / OUT ${d.map((x) => fx(x, 3)).join(' / ')} in (F re-ends FEED_FW at the moved union)` }; } }],
  sourcing: { blank: 'Transducer; 0.063 6061-T6 3 × 3', vendor: 'Garmin dealer (fuel-flow transducer kit)', url: 'https://www.garmin.com/', cost: 485, costAsOf: '2026-11-19', perAircraft: 1, lead: 'Stock', note: 'Aircraft Spruce G3X Touch worksheet, accessed 2026-11-19 ($428 direct from EI).' },
});
