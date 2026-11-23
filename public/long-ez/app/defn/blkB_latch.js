// LEZ-52-100 canopy latch installation and its detail parts LEZ-52-110 handle, -120 rod, -130 hooks, -140 SC-1 catch,
// -150 outside release: definition records (numbers from wp14 / canopy_layout). The detail solids are the parts' own
// primitives (cad/blkB_prims.py) in the aircraft frame. Notional.
import { partByPN } from '../systems.js';
import { CL, canopySill, toggleRate } from '../parts/canopy_layout.js';
import { LSZ, LDES, HOOK_SCREW, hookWall, RAIL_OUT, LATCH_GEO, toggleCheck, LATCH_RHO, LATCH_MASS, LATCH_HW } from '../parts/wp14_canopy_latch.js';
import { bandAt, wallAt, CANF, surfY } from '../parts/wpB1_canopy.js';
import { fromGeo, groupVols, massFrom, bboxOf } from './blkB_prims.js';
import { fx, TODAY } from './blkB_common.js';


export const LRHO = LATCH_RHO;   // densities and the masses on the system records live in parts/wp14_canopy_latch.js (set at parts load)
const prm = (geo) => () => ({ prims: fromGeo(geo()), feat: {}, holes: [] });
export const LP = { handle: prm(LATCH_GEO.handle), rod: prm(LATCH_GEO.rod), hook: prm(() => LATCH_GEO.hook(CL.st[0])), sc1: prm(LATCH_GEO.sc1), door: prm(LATCH_GEO.door) };
export const LM = LATCH_MASS;
const hookMass = (s) => massFrom(groupVols(fromGeo(LATCH_GEO.hook(s))), LRHO);
const rev0 = (change) => [{ rev: 'A', date: TODAY, short: 'Initial definition', change }];
const mat = (spec, form, allow = []) => ({ spec, alt: 'None', form, density: null, allowables: allow });
const STD_TOL = { general: '.XX ±0.03 · .XXX ±0.010', breakEdges: '0.010–0.030' };
const in12 = (x) => x * 12;
// left rudder conduit (LEZ-27-151, block C) to the rod: closest approach between the rod segment and the conduit path
function conduitGap() {
  const p = partByPN('LEZ-27-151'); if (!p) return { d: Infinity };
  const A = [LATCH_GEO.rodS0, CL.yR, CL.zT], B = [LATCH_GEO.rodS1, CL.yR, CL.zT]; let best = Infinity;
  for (const g of p.geo || []) { const P = g.pts; if (!P || !P.some((q) => q[1] < 0)) continue; for (let i = 0; i < P.length - 1; i++) for (let k = 0; k <= 20; k++) { const q = P[i].map((v, j) => v + (P[i + 1][j] - v) * k / 20), u = Math.max(0, Math.min(1, (q[0] - A[0]) / (B[0] - A[0]))), r = A.map((v, j) => v + (B[j] - v) * u); best = Math.min(best, Math.hypot(...q.map((v, j) => v - r[j])) * 12 - (g.dIn || 0.25) / 2 - (CL.rod.od / 2 + 0.06)); } }
  return { d: best };
}
const qGap = (s) => in12(hookWall(s)) - (-in12(CL.yH) + CL.hook.t / 2);

export const L_DEFS = {
  'LEZ-52-110': { key: 'handle', title: 'Latch handle and over-centre toggle', kind: 'machined',
    change: `Initial definition. The pivot sat 0.4 in below the sill, so an outside release had to cut the fuselage side and its longeron. As defined the pivot is ${fx(in12(CL.P[1]) - in12(canopySill(CL.P[0], -1)[2]))} in above the sill: its square-drive shaft runs out through the left canopy rail to the outside release (LEZ-52-150); the link length follows (${fx(CL.L * 12)} in), travel ${fx(CL.travelDeg, 0)}°, ${CL.beta}° over centre.`,
    features: [{ id: 'crank', kind: 'profile', label: `Crank ${fx(CL.r * 12)} in, lever ${fx(CL.lever * 12, 1)} in, knob Ø 1.2 in nylon; hub on an AN4 pivot at FS ${fx(in12(CL.P[0]), 1)}, WL ${fx(in12(CL.P[1]))}; link ${fx(CL.L * 12)} in`, tol: 'Pivot ±0.03 in to the rail' },
      { id: 'drive', kind: 'profile', label: `Square-drive shaft Ø 0.30 in 4130 from the hub out through the rail to ${fx(RAIL_OUT - 0.10)} in BL (1/4 in square socket)`, tol: 'Coaxial with the pivot ±0.01 in' }],
    material: mat('AMS 6350 4130 N (crank, shaft, bracket); 6061-T6 lever; nylon knob; HT61 stop', 'sheet, bar and rod', [['4130 N F_tu', '95 ksi', 'MIL-HDBK-5']]),
    checks: ['cab-canopy-toggle'],
    rules: [{ id: 'oc', label: 'Over centre ≥ 3°', v: CL.beta, min: 3 }, { id: 'drive', label: 'Pivot above the outer sill (in): the shaft exits through the rail', v: in12(CL.P[1]) - in12(canopySill(CL.P[0], -1)[2]), min: 0.25 }],
    interfaces: [{ id: 'I1', with: 'LEZ-52-150 outside release', feature: 'drive', what: 'Shaft end under the cover, inside the rail\'s outer skin', check: () => ({ ok: RAIL_OUT - 0.10 < RAIL_OUT && RAIL_OUT - 0.10 > RAIL_OUT - CANF.t, detail: `shaft end ${fx(RAIL_OUT - 0.10)} in, rail outer ${fx(RAIL_OUT)} in` }) },
      { id: 'I2', with: 'LEZ-76-100 throttle quadrant (G)', feature: 'crank', what: 'Knob sweep (pivot ± lever, upward from the rail) clears the quadrant by ≥ 1 in', check: () => { const q = partByPN('LEZ-76-100')?.geo?.[0]; const top = q ? in12(q.c[2] + q.d[2] / 2) : 0; const low = in12(CL.P[1]) - 0.6; return { ok: low - top >= 1, detail: `knob path ≥ WL ${fx(low)}, quadrant top WL ${fx(top)}` }; } },
      { id: 'I3', with: 'LEZ-52-120 rod', feature: 'crank', what: 'Toggle drives the rod through the full stroke', check: () => ({ ok: Math.abs(CL.sC(CL.aOpen) - CL.xLock - CL.stroke) < 0.01, detail: `stroke ${fx((CL.sC(CL.aOpen) - CL.xLock) * 12)} in of ${fx(CL.stroke * 12)} in` }) }],
    hw: 'AN4-12A pivot bolt with MS21042L4 and two NAS75-4 bushings; link MS21151-3 rod ends on AN3-6A bolts with cotter pins (assembly hardware on LEZ-52-100).',
    process: [{ op: 'Machine', spec: 'Cut crank and bracket; turn the shaft with a 1/4 in square socket; weld crank, shaft and hub; normalise; bore the hub.' }, { op: 'Finish', spec: 'Prime; lever anodised; knob pressed on.' }],
    tooling: 'Weld fixture holding crank, hub and shaft coaxial.', sourcing: ['4130 sheet 0.063, 0.375 in rod; 6061 bar; nylon knob', 'Aircraft Spruce (4130, 6061)', 'https://www.aircraftspruce.com/menus/mp/steelsheet.html', 15] },
  'LEZ-52-120': { key: 'rod', title: 'Latch rod, rollers and guides', kind: 'weldment',
    change: `Initial definition. As in wp14: a ${CL.rod.od} × ${LSZ.rod[1]} in 4130 rod in acetal bushings on six brackets bonded to the left rail, bronze rollers on AN${LSZ.axle} axles; the record gives the solid and checks the guides on the rail, the rollers in the hooks and the rod clear of the left rudder conduit.`,
    features: [{ id: 'rod', kind: 'profile', label: `Rod ${CL.rod.od} × ${LSZ.rod[1]} in 4130, FS ${fx(in12(LATCH_GEO.rodS0), 1)}–${fx(in12(LATCH_GEO.rodS1), 1)} on BL ${fx(in12(CL.yR))}, WL ${fx(in12(CL.zT))}; stroke ${fx(CL.stroke * 12)} in`, tol: 'Straight within 0.02 in' },
      { id: 'roller', kind: 'profile', label: `Three ${CL.roller.od} in SAE 841 rollers on AN${LSZ.axle} axles, ${LSZ.cant} in from the clamp blocks`, tol: 'Rollers turn freely' }],
    material: mat('AMS 6360 4130 tube; 6061-T6 brackets and clamp blocks; SAE 841 bronze; acetal bushings', 'tube, sheet, bought bushings', [['4130 F_tu', '95 ksi', 'MIL-HDBK-5']]),
    checks: ['cab-canopy-latch'], rules: [{ id: 'sup', label: 'Guide span at a hook ≤ 2 in', v: 2 / LATCH_GEO.SUP, min: 1 }],
    interfaces: [{ id: 'I1', with: 'LEZ-52-130 hooks', feature: 'roller', what: 'Rollers seat at the throat ends when locked', check: () => ({ ok: CL.st.every((s) => Math.abs(LATCH_GEO.sLock(s) - (s - 0.03) - (CL.roller.od / 24 + 0.004)) < 1e-9) && CL.roller.od < CL.hook.throatH, detail: `roller ${CL.roller.od} in in a ${CL.hook.throatH} in throat at FS ${CL.st.map((s) => fx(in12(s), 1)).join(' / ')}` }) },
      { id: 'I2', with: 'LEZ-56-100 left rail', feature: 'rod', what: 'Guide brackets hang from the rail (tops on the rail above the sill)', check: () => ({ ok: CL.st.every((s) => LATCH_GEO.frameZ(s) > canopySill(s, -1)[2]), detail: 'bracket tops 0.24 in above the sill on the rail\'s inner face' }) },
      { id: 'I3', with: 'LEZ-27-151 left rudder conduit (C)', feature: 'rod', what: 'Conduit ≥ 0.25 in from the rod and its guide bushings', check: () => { const g = conduitGap(); return { ok: g.d >= 0.25, detail: Number.isFinite(g.d) ? `${fx(g.d)} in` : 'no conduit defined' }; } }],
    hw: `3 × AN${LSZ.axle}-7A axles with MS21042L${LSZ.axle}; 6 acetal flanged bushings; 12 × AN3-5A bracket screws into flox inserts in the rail.`,
    process: [{ op: 'Machine', spec: 'Cut and drill the brackets; clamp blocks; ream the brackets in line on a straight-edge jig.' }, { op: 'Install', spec: 'Bond the brackets to the left rail with the canopy closed; slide the rod; set the clamp blocks with the rollers on the throat ends.' }],
    tooling: 'Straight-edge reaming jig for the six brackets.', sourcing: ['4130 tube 3/8 × 0.035, 4 ft; 6061 sheet; SAE 841 bushings; acetal bushings', 'Aircraft Spruce / McMaster-Carr (bushings)', 'https://www.aircraftspruce.com/menus/mp/steeltube.html', 30] },
  'LEZ-52-130': { key: 'hook', title: 'Canopy latch hooks (3)', kind: 'machined', qty: 3,
    change: `Initial definition. The hooks were bolted 2.7 in down the wall, 0.9–1.4 in below the longeron band, with the plates 0.8–1.0 in off the wall and the nuts in the strake fillet. As defined each hook's tongue runs forward along the wall on the throat line, its two flush #10 screws in nutplates potted in the band (fitted from inside); a G10 spacer fills the gap to the wall (${CL.st.map((s) => fx(qGap(s))).join(' / ')} in). Solid: the forward hook; the others differ only in the spacer.`,
    features: [{ id: 'hook', kind: 'profile', label: `C-hook ${CL.hook.t} in 4130: throat ${CL.hook.throatH} in high × ${CL.hook.depth} in deep, ramped ${CL.hook.ramp} in, jaws ${CL.hook.jaw} in; tongue 2.4 in forward on the throat line`, tol: 'Throat ±0.005 in' },
      { id: 'spacer', kind: 'profile', label: `G10 spacers to the wall: ${CL.st.map((s, i) => `hook ${i + 1} ${fx(qGap(s))} in`).join(', ')} (bonded with flox, faced to the wall)`, tol: '±0.02 in, faced to fit' },
      { id: 'screws', kind: 'hole', label: `2 × Ø 0.201 for ${HOOK_SCREW.std}, ${fx(Math.abs(HOOK_SCREW.ds[0] - HOOK_SCREW.ds[1]) * 12)} in apart`, tol: 'Match-drilled to the potted nutplates' }],
    material: mat('AMS 6350 4130 N plate 0.125 in; G10 spacer', 'plate', [['4130 N F_tu', '95 ksi', 'MIL-HDBK-5']]),
    checks: ['cab-canopy-latch'], rules: [{ id: 'gap', label: 'Spacer thickness > 0 at every hook (in)', v: Math.min(...CL.st.map(qGap)), min: 0.02 }],
    interfaces: [{ id: 'I1', with: 'LEZ-53-150 shell (left longeron band)', feature: 'screws', what: 'Tongue screws inside the band at every hook', check: () => { const r = CL.st.map((s) => { const b = bandAt(s); return [b.low, in12(CL.zT), b.top]; }); return { ok: r.every(([lo, z, hi]) => z > lo + 0.15 && z < hi - 0.15), detail: r.map(([lo, z, hi]) => `${fx(z)} in ${fx(lo)}–${fx(hi)}`).join('; ') }; } },
      { id: 'I2', with: 'LEZ-53-150 inner wall', feature: 'spacer', what: 'Plate plus spacer reaches the wall (no fastener through the outer skin)', check: () => ({ ok: CL.st.every((s) => qGap(s) > 0 && in12(hookWall(s)) + 0.025 < in12(hookWall(s)) + CANF.t), detail: `screw tips 0.025 in into the wall of ${CANF.t} in` }) },
      { id: 'I3', with: 'LEZ-52-120 rollers', feature: 'hook', what: 'Roller fits the throat', check: () => ({ ok: CL.roller.od < CL.hook.throatH, detail: `${CL.roller.od} in in ${CL.hook.throatH} in` }) }],
    hw: `${HOOK_SCREW.std}: 2 per hook; MS21047-3 nutplates on 6061 strips potted in the band.`,
    process: [{ op: 'Machine', spec: 'Cut from 0.125 in 4130 N; file the throat ramp; drill the tongue.' }, { op: 'Install', spec: 'Pot the nutplate strips in the band from inside; bond the spacer; fit each hook to its roller with the canopy closed; screw.' }],
    tooling: 'Hook profile template; nutplate potting fixture.', sourcing: ['4130 N plate 0.125 × 3 × 6 in; G10 0.5 in strip', 'Aircraft Spruce (4130 sheet, G10)', 'https://www.aircraftspruce.com/menus/mp/steelsheet.html', 18] },
  'LEZ-52-140': { key: 'sc1', title: 'SC-1 canopy safety catch', kind: 'machined',
    change: `Initial definition. The longeron lip stood 0.37 in off the wall. As defined a G10 block (${fx(LATCH_GEO.lipGap * 12)} in) carries it on the wall inside the longeron band; the catch itself as wp14.`,
    features: [{ id: 'catch', kind: 'profile', label: '0.040 in 301 ½-hard spring catch 0.96 in wide on a frame hard point at the front of the left rail; foot ½ in below the lip', tol: 'Bend radius 0.06 in' },
      { id: 'lip', kind: 'profile', label: `6061 lip on a ${fx(LATCH_GEO.lipGap * 12)} in G10 block, 2 × AN3 into potted nutplates in the band`, tol: '±0.03 in' }],
    material: mat('AMS 5518 301 ½-hard; 6061-T6; G10', 'sheet', [['301 ½-hard F_tu / F_ty / E', '150 / 110 ksi, 28 Msi', 'AMS 5518 (½ hard; AMS 5519 is full hard): Aircraft Materials AMS 5518 page, accessed 2026-11-19']]),
    checks: ['cab-canopy-catch'], rules: [{ id: 'release', label: 'Thumb release ≤ 10 lb (ratio)', v: 1, min: 1 }],
    interfaces: [{ id: 'I1', with: 'LEZ-53-150 left longeron band', feature: 'lip', what: 'Lip block in the band', check: () => { const b = bandAt(CL.catchS), z = (3.245 + 0.046) * 12; return { ok: z > b.low && z < b.top, detail: `WL ${fx(z)} in ${fx(b.low)}–${fx(b.top)}` }; } },
      { id: 'I2', with: 'LEZ-56-100 front bow / left rail', feature: 'catch', what: 'Catch between the front bow and the first hook', check: () => ({ ok: CL.catchS > CANF.bow0[1] && CL.catchS < CL.st[0], detail: `FS ${fx(in12(CL.catchS), 1)}` }) }],
    hw: '2 × AN3-4A (catch to the frame hard point, slotted); 2 × AN3 into potted nutplates (lip).',
    process: [{ op: 'Machine', spec: 'Trial-fit in mild steel; cut and bend the final catch from 301 ½-hard.' }, { op: 'Install', spec: 'Bolt the catch to the frame hard point; bond the G10 block; screw the lip; set ½ in.' }],
    tooling: 'Bending block for the 0.06 in radius.', sourcing: ['301 ½-hard 0.040 sheet; 6061; G10', 'Aircraft Spruce / McMaster-Carr', 'https://www.mcmaster.com/stainless-steel-sheets/', 12] },
  'LEZ-52-150': { key: 'door', title: 'Outside canopy release (flush cover)', kind: 'install',
    change: 'Initial definition. The door was cut into the left fuselage side across the 14-ply top longeron. As defined there is no shell cut-out: a 1.0 in flush cover in the left canopy rail over the handle shaft\'s square socket, with a cam lock; ground crew turn the handle with a 1/4 in square drive.',
    features: [{ id: 'cover', kind: 'profile', label: `Cover Ø 1.0 × 0.06 in glass on a 6061 ring in the left rail at FS ${fx(in12(CL.P[0]), 1)}, WL ${fx(in12(CL.P[1]))}; flush quarter-turn cam lock`, tol: 'Flush ±1/32 in' }],
    material: mat('Glass cover (6781); 6061-T6 ring; COTS cam lock', 'laminate disc, bar, bought lock'),
    checks: [], rules: [{ id: 'flush', label: 'Cover inside the rail\'s height (in above the sill)', v: in12(CL.P[1]) - 0.5 - in12(canopySill(CL.P[0], -1)[2]), min: 0 }],
    interfaces: [{ id: 'I1', with: 'LEZ-53-150 shell', feature: 'cover', what: 'No cut-out in the fuselage side: the cover is above the sill, in the rail', check: () => { const z = in12(CL.P[1]) - 0.5, sl = in12(canopySill(CL.P[0], -1)[2]); return { ok: z > sl, detail: `cover bottom WL ${fx(z)}, sill ${fx(sl)}` }; } },
      { id: 'I2', with: 'LEZ-52-110 shaft', feature: 'cover', what: 'Cover on the handle axis', check: () => ({ ok: Math.abs(surfY(CL.P[0], in12(CL.P[1])) - RAIL_OUT) < 1e-9, detail: `axis FS ${fx(in12(CL.P[0]), 1)}, WL ${fx(in12(CL.P[1]))}` }) }],
    hw: '1 × flush quarter-turn cam lock (COTS); cover hinge pin 1/16 in CRES.',
    process: [{ op: 'Install', spec: 'Bore the rail on the handle axis; bond the ring with flox; fit the cover and cam lock.' }],
    tooling: 'Drill guide on the pivot axis.', sourcing: ['6061 bar; 6781 scrap; cam lock', 'McMaster-Carr (quarter-turn cam lock)', 'https://www.mcmaster.com/cam-locks/', 15] },
};
export function latchDef(pn) {
  const L = L_DEFS[pn], P = LP[L.key]();
  return { pn, rev: 'A', status: 'released', nha: 'LEZ-52-100', qty: L.qty || 1, kind: L.kind, title: L.title, revs: rev0(L.change), effectivity: 'One set per aircraft', params: P,
    datums: [{ id: 'A', what: 'Pivot / hook / rod station as dimensioned (aircraft frame)' }], features: L.features, tolerances: STD_TOL,
    drawingNotes: ['Aircraft frame: BL, FS, WL in inches.'], generalNote: 'Steel parts primed; aluminium anodised.', na: { cut: 'Sheet and bar parts: no flat pattern needed', layup: 'Metal parts' },
    material: L.material, process: L.process, checks: L.checks, rules: L.rules,
    mass: { each: L.key === 'hook' ? hookMass(CL.st[0]) : LM[L.key], from: 'solid volumes × density (4130, 6061, bronze, acetal, 301, G10, nylon)' },
    hardware: [], hardwareNote: L.hw, interfaces: L.interfaces, tooling: { needed: true, text: L.tooling },
    sourcing: { blank: L.sourcing[0], vendor: L.sourcing[1], url: L.sourcing[2], cost: L.sourcing[3], costAsOf: TODAY, perAircraft: L.qty || 1, lead: 'Stock', note: 'Approximate small-piece prices, typed from memory.' } };
}
// ------------------------------------------------------------------------------------------- the installation
const HW = LATCH_HW;
const hwMass = HW.reduce((a, l) => a + l.qty * l.each, 0);
export const LATCH_INSTALL = {
  pn: 'LEZ-52-100', rev: 'A', status: 'released', nha: 'LEZ-56-100', qty: 1, install: true, title: 'Canopy latch installation',
  revs: rev0('Initial definition: joins the handle, rod, hooks, SC-1 and outside release; link hardware, rigging shims and the canopy seal; rigged to a 30 lb roller preload and 5° over centre.'),
  effectivity: 'One per aircraft', params: { hooks: CL.st.length, stroke: CL.stroke, beta: CL.beta, L: CL.L, preload: LDES.preload },
  datums: [], features: [{ id: 'rig', kind: 'joint', label: `Rig: rollers seated at the throat ends with the handle on its stop; ≤ ${LDES.preload} lb at each roller (spring scale); ${CL.beta}° ± 1° over centre; CANOPY light off only in the last 1/8 in`, tol: 'Shim hooks with AN960 washers' }],
  tolerances: { general: 'Torque per AC 43.13-1B table 7-1; cotter pins on every rod-end bolt' },
  drawingNotes: ['Rig with the canopy closed on its seal.'], na: { cut: 'Installation', layup: 'Installation' },
  material: { spec: 'Bought hardware (MS / AN), EPDM seal', alt: 'None', form: 'bought', density: null, allowables: [] },
  process: [{ op: 'Install', spec: 'Hooks, rod, handle and link; SC-1; outside release; seal.' }, { op: 'Rig', spec: 'Preload, over-centre stop, warning switch, SC-1 at ½ in.' }, { op: 'Inspect', spec: 'Canopy cannot be lifted at the latch side with the handle locked (30 lb pull); unlatched canopy stops on the SC-1.' }],
  checks: ['cab-canopy-latch', 'cab-canopy-toggle', 'cab-canopy-catch'],
  rules: [{ id: 'hooks', label: 'Hooks ≥ 3', v: CL.st.length, min: 3 }, { id: 'oc', label: 'Over centre ≥ 3°', v: CL.beta, min: 3 }],
  mass: { each: hwMass, from: 'hardware lines' }, hardware: HW, hardwareNote: HW.map((l) => `${l.qty} × ${l.std}`).join(', '),
  interfaces: [{ id: 'I1', with: 'LEZ-32-216 canopy switch (D / J)', feature: 'rig', what: 'Switch on the rod line at the forward hook, struck by the rod', check: () => ({ ok: Math.abs(CL.switchS - (CL.st[0] - 0.16)) < 1e-9, detail: `switch FS ${fx(in12(CL.switchS), 1)} (bracket on hook 1's tongue to be provided with the switch)` }) },
    { id: 'I2', with: 'LEZ-52-110 / -120', feature: 'rig', what: 'Effort ≤ 20 lb at the knob', check: () => { const T = toggleCheck(); return { ok: T.Fknob <= 20, detail: `${fx(T.Fknob, 1)} lb` }; } }],
  tooling: { needed: true, text: 'Spring scale and roller-gauge for the preload; protractor for the over-centre angle.' },
  sourcing: { blank: 'Bought hardware and seal', vendor: 'Aircraft Spruce (MS / AN hardware, EPDM seal)', url: 'https://www.aircraftspruce.com/menus/ha/index.html', cost: 45, costAsOf: TODAY, perAircraft: 1, lead: 'Stock', note: 'Approximate.' },
};
void wallAt; void bboxOf; void toggleRate;
