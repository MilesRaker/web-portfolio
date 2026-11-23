// Block H definition records, ATA 76 engine controls: LEZ-76-100 throttle quadrant (throttle, mixture) with the
// carb-heat control head and the S11 mounting face, LEZ-76-110 the three push-pull cables. Notional; vendor data typed
// from memory are marked.
import { partByPN, EQUIP, PASS, KEEPOUTS } from '../systems.js';
import { CONSOLE_CUTS } from '../parts/wpB4_cabin.js';
import { SW_AT } from '../parts/wpD2_brakes.js';
import { ARM } from '../parts/wpG4_systems.js';
import { ptsOf, fwCrossing, P3, pathLen } from '../parts/wpH0_route.js';
import * as LY from '../parts/wpH1_layout.js';
import { RUNS } from '../parts/wpH2_runs.js';
import { travel, grommetRoom } from '../parts/wpH3_checks.js';
import * as PR from '../parts/wpH4_prims.js';
import { fx, rev0, rec, massFrom, near } from './h_common.js';

const Q = LY.QD;
// ------------------------------------------------------------------------------------------- LEZ-76-100
const QP = PR.quadParams();
const knobs = () => ['throttle', 'mixture'].map((k) => ({ k, bl: Q[k].knob.bl, d: Q[k].knob.d }));
export const QUAD_DEF = rec({
  pn: 'LEZ-76-100', nha: 'LEZ-25-110', qty: 1, kind: 'mechanism', title: 'Throttle quadrant and carb-heat control',
  revs: rev0(`Initial definition. The quadrant was a placeholder box with no levers, no carb-heat control, no mounting for S11 and no cam (H-F8, F9). As defined: two 6061-T6 side plates hung under the left console's cut-out, the throttle and mixture levers on one AN4 pivot with a friction knob, cable arms ${LY.LEVER.throttle} / ${LY.LEVER.mixture} in below the pivot (sized from the carburettor arms' strokes plus 1/16 in cushion each end over a ${Q.sweep}° sweep), the conduit anchor plate aft, a shelf with 2 × 6-32 nutplates 0.90 in apart for S11 and a cam plate on the throttle that closes S11 C–NO at idle, and the carb-heat push-pull head at the forward end of the cut-out (knob up = cold, FAR 23.779 sense typed from memory). Knobs inboard of the canopy-latch keep-out.`),
  params: QP, datums: [{ id: 'A', what: `Pivot axis (BL), FS ${Q.pivot[1]}, WL ${Q.pivot[2]}` }, { id: 'B', what: 'Outboard side plate inner face' }],
  features: [
    { id: 'plates', kind: 'plate', label: `Side plates 0.125 (outboard) and 0.090 (inboard) 6061-T6, FS ${Q.plate.fs.join('–')}, WL ${Q.plate.wl.join('–')}, Ø 0.257 pivot holes`, tol: 'Pivot holes ±0.002' },
    { id: 'aft', kind: 'plate', label: 'Conduit anchor plate 0.25 6061-T6 with 2 × Ø 0.38 conduit holes (jam nuts)', tol: '±0.01' },
    { id: 'shelf', kind: 'plate', label: 'S11 mounting face 0.25 6061-T6; 2 × 6-32 nutplates on 0.90 in (block D\'s LEZ-32-216 bracket)', tol: 'Holes ±0.010; face flat 0.005' },
    { id: 'throttle', kind: 'lever', label: `Throttle lever 0.19 × 0.60 6061-T6; cable arm ${LY.LEVER.throttle} in below the pivot (10-32 rod end); knob at ${Q.throttle.knob.r} in; forward = open`, tol: 'Arm radius ±0.01' },
    { id: 'mixture', kind: 'lever', label: `Mixture lever 0.16 × 0.60, arm ${LY.LEVER.mixture} in, cranked knob inboard at BL ${Q.mixture.knob.bl}; forward = rich`, tol: 'Arm radius ±0.01' },
    { id: 'cam', kind: 'cam', label: `Cam plate keyed to the throttle: base R ${Q.cam.r0}, lobe R ${Q.cam.r1} over the last ${Q.cam.lobe}° at idle; S11 changes over in the first 1/32 in`, tol: 'Rig on assembly' },
    { id: 'pivot', kind: 'bolt', label: 'AN4 pivot with Belleville and fibre friction washers', tol: '—' },
    { id: 'friction', kind: 'knob', label: 'Knurled friction nut on the pivot, outboard of the outboard plate (reached through the cut-out)', tol: '—' },
    { id: 'knobs', kind: 'knob', label: 'Knobs: throttle Ø 0.85 (round, black), mixture Ø 0.70 (red, fluted) per FAR 23.781 shapes (typed from memory)', tol: '—' },
    { id: 'heat', kind: 'control', label: `Carb-heat push-pull head, vertical at FS ${Q.heat.fs}, BL ${Q.heat.bl}, knob ${Q.heat.knob.d} in; up = COLD, down = HOT; stop collar at ${fx(LY.HEAT_STOP(), 2)} in`, tol: 'Stops rigged at the air box' },
  ],
  tolerances: { general: '.XX ±0.03, .XXX ±0.010', holes: 'Pivot Ø 0.257 +0.002', breakEdges: '0.010–0.030' },
  drawingNotes: ['Rig the lever stops so each carburettor stop is met 1/16 in (cable) before the quadrant stop.', 'Block B cuts the console top to the cut-out (FS 68.3–75.1, BL −10.7…−9.0); the housing hangs from two angles under it.'],
  generalNote: 'Alodine and prime; levers anodised black.',
  na: { cut: 'Plates cut from sheet / plate', layup: 'Not a composite part' },
  material: { spec: 'AMS-QQ-A-250/11 6061-T6 plate 0.125 / 0.19 / 0.25; AN4 bolt; phenolic knobs; push-pull control head (typed: ACS / McFarlane light-duty)', alt: '2024-T3 plate', form: 'plate', density: 0.098, allowables: [['6061-T6 F_tu / F_bru', '42 / 88 ksi', 'MMPDS (typed from the handbook table)']] },
  process: [{ op: 'Cut', spec: 'Cut and drill the plates as a stack; ream the pivot holes.' }, { op: 'Assemble', spec: 'Levers, friction washers and cam on the AN4; set the friction; fit S11 on its face (block D) and rig the cam.' }, { op: 'Install', spec: 'Hang under the console cut-out on two angles with 4 × #10 screws into nutplates; anchor the conduits; rig.' }],
  checks: ['thq-lever', 'ctl-travel'],
  rules: [{ id: 'latch', label: 'Knobs and levers inboard of the canopy-latch keep-out (BL −9.96) by ≥ 0.05 in', v: Math.min(...knobs().map((k) => (k.bl - k.d / 2) - LY.CONSOLE.latch.bl), Q.throttle.bl - Q.throttle.t / 2 - LY.CONSOLE.latch.bl, Q.heat.bl - Q.heat.knob.d / 2 - LY.CONSOLE.latch.bl) / 0.05, min: 1 },
    { id: 'edge', label: 'Pivot hole edge distance in the side plates ≥ 1.0 D (lightly loaded, DESIGN)', v: (Q.plate.wl[1] - Q.pivot[2]) / Q.piv.d, min: 1 },
    { id: 'rod', label: 'Rod swing off the conduit axis ≤ 15° at the arms', v: 15 / Math.max(...travel().map((t) => t.ang)), min: 1 }],
  mass: { each: massFrom(QP, PR.QUAD_RHO), from: 'solid volumes × 0.098 (6061), 0.283 (steel), 0.048 (phenolic) lb/in³' },
  hardware: [{ std: 'AN4-15A', qty: 1, desc: 'pivot', each: 0.035 }, { std: 'Knurled friction nut, 1/4-28 with nylon insert', qty: 1, desc: 'friction (outboard)', each: 0.01 }, { std: 'MS24693C screws + MS21047L3 nutplates', qty: 4, desc: '#10 to the console angles', each: 0.008 }, { std: 'MS21047L06', qty: 2, desc: '6-32 nutplates for S11', each: 0.002 }],
  hardwareNote: 'AN4 pivot; 4 × #10 to the console; 2 × 6-32 nutplates for S11.',
  interfaces: [
    { id: 'I1', with: 'LEZ-25-110 left console (block B) throttle cut-out', feature: 'plates', what: 'Housing centre and every lever inside the cut-out', check: () => { const c = CONSOLE_CUTS.left.find((q) => q.id === 'throttle'), g = partByPN('LEZ-76-100').geo[0].c, b = g[1] * 12, f = g[0] * 12, ok = b > c.bl[0] && b < c.bl[1] && f > c.fs[0] && f < c.fs[1] && [Q.throttle, Q.mixture].every((L) => L.bl - L.t / 2 > c.bl[0] && L.bl + L.t / 2 < c.bl[1]) && Q.heat.fs - 0.22 >= c.fs[0]; return { ok, detail: `housing at FS ${fx(f, 1)}, BL ${fx(b)}; levers BL ${Q.throttle.bl}, ${Q.mixture.bl}; heat head FS ${Q.heat.fs}` }; } },
    { id: 'I2', with: 'LEZ-32-216 S11 (block D)', feature: 'shelf', what: 'S11 on the mounting face; holes 0.90 apart under its bracket; cam closes C–NO at idle', check: () => { const s = SW_AT.find((q) => q.ref === 'S11'), p = [s.at[1] * 12, s.at[0] * 12, s.at[2] * 12], e = EQUIP.find((q) => q.ref === 'S11'); return { ok: Math.abs(p[2] - Q.shelf.wl[1]) < 0.01 && p[0] > Q.shelf.bl[0] && p[0] < Q.shelf.bl[1] && !!e && Q.cam.r1 > Q.pivot[2] - (p[2] + 0.67), detail: `S11 bracket base WL ${fx(p[2])} on the face WL ${Q.shelf.wl[1]}; lobe R ${Q.cam.r1} reaches the actuator at ${fx(Q.pivot[2] - p[2] - 0.67)} in below the pivot` }; } },
    { id: 'I3', with: 'LEZ-76-110 cables', feature: 'aft', what: 'Conduit heads on the lever attach arcs', check: () => { const d = ['throttle', 'mixture'].map((k, i) => near(ptsOf(RUNS['LEZ-76-110'][i])[0], LY.QHEAD[k])); return { ok: Math.max(...d) < 0.01, detail: `heads ${d.map((x) => fx(x, 3)).join(' / ')} in` }; } },
    { id: 'I4', with: 'LEZ-52-100 canopy latch keep-out (block B)', feature: 'knobs', what: 'Inboard of BL −9.96 above WL 39.43', check: () => { const m = Math.min(...knobs().map((k) => k.bl - k.d / 2)); return { ok: m > LY.CONSOLE.latch.bl, detail: `outboard-most knob edge BL ${fx(m)}; ${KEEPOUTS.length} keep-outs in the model` }; } },
  ],
  tooling: { needed: true, text: 'Drill jig for the plate stack (pivot and anchor holes); rigging gauge for the 1/16 in cushion.' },
  sourcing: { blank: '6061-T6 plate 0.125 × 6 × 8, 0.25 × 2 × 4, 0.19 × 2 × 12; knobs; push-pull head', vendor: 'Aircraft Spruce (6061 plate, knobs, push-pull controls)', url: 'https://www.aircraftspruce.com/', cost: 120, costAsOf: '2026-11-18', perAircraft: 1, lead: 'Stock', note: 'Approximate, typed from memory.' },
});

// ------------------------------------------------------------------------------------------- LEZ-76-110
const CP = PR.cableParams();
export const CABLE_DEF = rec({
  pn: 'LEZ-76-110', nha: 'LEZ-76-100', qty: 1, kind: 'cable', title: 'Engine control cables',
  revs: rev0(`Initial definition. The cables crossed the firewall through left leg A, ended inside the carburettor box, missed the air-box arm by 3.44 in and bent far tighter than 6 in (H-F1, F5, F6, F7). As defined: three light-duty push-pull cables from the quadrant along the left floor, through block A's rear-bulkhead hole, through a fire-sealed silicone boot at block A's grommet position (BL ${LY.GROMMET.c[0]}, WL ${LY.GROMMET.c[1]}), clamped to the airframe at FS 144.5 and to a bracket on the carburettor; rod ends on the throttle and mixture arms (rev B) and on the air box's carb-heat arm at BL ${fx(ARM()[0])}, FS ${fx(ARM()[1], 1)}, WL ${fx(ARM()[2], 1)} (G-F4). Every bend ≥ 6 in; the firewall-to-carburettor span carries the ±0.25 in engine motion.`),
  params: CP, datums: [{ id: 'A', what: 'Conduit heads on the quadrant' }, { id: 'B', what: 'Conduit end clamps on the carburettor bracket' }],
  features: [
    { id: 'throttle', kind: 'cable', label: `Throttle: ${fx(pathLen(ptsOf(RUNS['LEZ-76-110'][0])), 1)} in conduit, 10-32 rod end, friction at the quadrant`, tol: 'Length ±1/4 in' },
    { id: 'mixture', kind: 'cable', label: `Mixture: ${fx(pathLen(ptsOf(RUNS['LEZ-76-110'][1])), 1)} in conduit, 10-32 rod end`, tol: 'Length ±1/4 in' },
    { id: 'heat', kind: 'cable', label: `Carb heat: ${fx(pathLen(ptsOf(RUNS['LEZ-76-110'][2])), 1)} in conduit, plain, rod end at 30° down onto the air-box arm`, tol: 'Length ±1/4 in' },
    { id: 'bracket', kind: 'bracket', label: 'Conduit bracket on the carburettor\'s left flange bolts with three clamp blocks', tol: 'Rig on assembly' },
  ],
  drawingNotes: ['Fire sleeve (AS1072) over every conduit aft of the firewall.', 'Clamp every 18 in or less in the cabin; no clamp between FS 144.5 and the carburettor bracket (the motion loop).', 'Crossings moved: the firewall (block A layout grommet), the rear bulkhead FS 130.2 (through A\'s existing hole, BL −9.04 / −8.64 / −8.24, WL 30.32), the seat back (FS ≈ 91, leg openings).'],
  generalNote: 'Rig full stop to stop at the carburettor with 1/16 in cushion at both ends.',
  na: { cut: 'Bought made to length', layup: 'Not a composite part' },
  material: { spec: 'ACS A-920 push-pull control: 0.25 in OD conduit, 0.078 in inner, 10-32 rod ends, ±4° rod-end swivel, 5 in minimum bend (Aircraft Spruce A-920 page, accessed 2026-11-19); AS1072 fire sleeve', alt: 'Cablecraft light-duty', form: 'bought made to length', density: null, allowables: [['Minimum bend radius', `${LY.CABLE.bendMin} in (typed, wp8 std)`, 'VENDOR'], ['Inner wire in conduit', '110 lb ult. (typed)', 'VENDOR']] },
  process: [{ op: 'Route', spec: 'Lay the conduits; clamp at the defined stations; fire boot at the firewall.' }, { op: 'Rig', spec: 'Rod ends on the arms with AN3 and cotter; set the stops; check the cushion.' }],
  checks: ['ctl-route', 'ctl-travel', 'ctl-load'],
  mass: { each: massFrom(CP, PR.CABLE_RHO), from: `conduit at ${PR.CABLE_LBFT} lb/ft (typed) and the bracket over the solid` },
  hardware: [{ std: 'MS21919WDG4', qty: 18, desc: 'cushion clamps', each: 0.005 }, { std: 'AN3-5A + MS21042L3 + MS24665 cotter', qty: 3, desc: 'rod ends to the arms', each: 0.016 }, { std: 'AN3-4A + MS21042L3', qty: 2, desc: 'bracket to the carburettor flange', each: 0.015 }],
  hardwareNote: '18 clamps; 3 rod-end bolts; 2 bracket bolts.',
  interfaces: [
    { id: 'I1', with: 'LEZ-71-251 air box carb-heat arm (block G, G-F4)', feature: 'heat', what: 'Rod end on the arm at COLD (≤ 0.1 in)', check: () => { const c = LY.CEND.heat, t = LY.armTip(c.arm, -45, LY.HEAT_MID), d = near(t, ARM()); return { ok: d <= 0.1, detail: `${fx(d, 3)} in from BL ${fx(ARM()[0])}, FS ${fx(ARM()[1])}, WL ${fx(ARM()[2])}` }; } },
    { id: 'I2', with: 'LEZ-71-210 rev B throttle and mixture arms', feature: 'throttle', what: 'Arm tip at mid travel on the conduit axis within half the arc\'s sagitta', check: () => { const d = ['throttle', 'mixture'].map((k) => { const c = LY.CEND[k], t = LY.armTip(c.arm, 0), v = t.map((x, i) => x - c.E[i]), s = v[0] * c.u[0] + v[1] * c.u[1] + v[2] * c.u[2], lat = Math.hypot(...v.map((x, i) => x - s * c.u[i])), sag = c.arm.r * (1 - Math.cos(c.arm.travel / 2 * Math.PI / 180)); return { lat, sag }; }); return { ok: d.every((x) => x.lat <= x.sag / 2 + 0.01), detail: d.map((x) => `${fx(x.lat, 3)} (≤ ${fx(x.sag / 2, 3)})`).join(' / ') + ' in' }; } },
    { id: 'I3', with: 'LEZ-53-180 firewall grommet (block A layout)', feature: 'throttle', what: 'Every crossing in the Ø 1.75 boot with ≥ 0.25 in radial room', check: () => { const x = RUNS['LEZ-76-110'].map((r) => fwCrossing(ptsOf(r))), d = x.map((q) => Math.hypot(q[0] - LY.GROMMET.c[0], q[1] - LY.GROMMET.c[1])), ps = PASS.find((p) => p.id === 'fw-cables'); return { ok: Math.max(...d) + LY.CABLE.od / 2 <= LY.GROMMET.r - 0.25 + 1e-3 && ps && Math.abs(ps.at[1] * 12 - LY.GROMMET.c[0]) < 1e-6, detail: `${d.map((v) => fx(v)).join(' / ')} in from the centre; room ${fx(grommetRoom())} in` }; } },
    { id: 'I4', with: 'LEZ-53-175 rear bulkhead hole (block A)', feature: 'mixture', what: 'All three through A\'s existing hole (BL −8.64, WL 30.32, r 0.875)', check: () => { const x = RUNS['LEZ-76-110'].map((r) => { const p = ptsOf(r); for (let i = 1; i < p.length; i++) if ((p[i - 1][1] - 104.7) * (p[i][1] - 104.7) < 0) { const t = (104.7 - p[i - 1][1]) / (p[i][1] - p[i - 1][1]); return [p[i - 1][0] + t * (p[i][0] - p[i - 1][0]), p[i - 1][2] + t * (p[i][2] - p[i - 1][2])]; } return [99, 99]; }), d = x.map((q) => Math.hypot(q[0] + 8.64, q[1] - 30.32) + 0.25); return { ok: d.every((v) => v <= 0.875), detail: d.map((v) => fx(v)).join(' / ') }; } },
  ],
  tooling: { needed: false, text: 'Rigging gauge (1/16 in) at the carburettor.' },
  sourcing: { blank: 'Three push-pull controls made to the lengths in the features', vendor: 'Aircraft Spruce (ACS A-920)', url: 'https://www.aircraftspruce.com/', cost: 500, costAsOf: '2026-11-19', perAircraft: 1, lead: '1–2 weeks (made to length)', note: 'At least 3 × 72 in at $166.75 (Aircraft Spruce A-920, accessed 2026-11-19); the 9 ft runs cost more: order each thread-to-thread from the model run lengths.' },
});
void P3;
