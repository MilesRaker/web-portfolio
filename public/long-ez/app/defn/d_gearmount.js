// LEZ-32-120 main-gear attachment, per side (right drawn, left opposite): the definition record (numbers from
// parts/wpD1_gear.js). Solid: cad/d_gearmount.py, in the aircraft frame (x = BL, y = FS, z = WL, in). Notional.
import { GEO, FIXED, fusPanel, BASE_MAT } from '../structures.js';
import { FUS } from '../parts/wp26_fuselage.js';
const FUS_T = FUS.t;
import { openItem } from './d_icd.js';
import { DEFS as _DEFS } from './release.js';
import { HOSE_NOTCH, LINE } from '../parts/wpD2_brakes.js';
import { buildPlyBook } from '../plybook.js';
import { analyse, DEFAULT_DESIGN } from '../structures.js';
import { GM, YM, S0, FAIR, EAR, YAW, mountParams, mountVolumes, anDash } from '../parts/wpD1_gear.js';
import { want } from './util.js';

const fx = (x, n = 2) => x.toFixed(n), RHO = { st: 0.283, al: 0.098 }, P = mountParams(), V = mountVolumes(P), nb = [3, 4, 5, 6, 7, 8].find((n) => Math.abs(n / 16 - GM.db) < 0.006);
export const gmtMassOf = (v) => (v.tube ?? 0) * RHO.st + ((v.angle ?? 0) + (v.back ?? 0)) * RHO.al + FAIR.lb;
export function gmtExpect(p, m) {
  const v = m.volumes || {}, vv = mountVolumes(p);
  return [want('Tube volume (in³)', vv.tube, v.tube ?? NaN, 0.002), want('Attach angles, both (in³)', vv.angle, v.angle ?? NaN, 0.003), want('Backing strips, both (in³)', vv.back, v.back ?? NaN, 0.002),
    want('Tube length, FS (in)', p.Lt, (m.holes || []).length ? p.Lt : NaN, 1e-9), want('Bolt holes in the solid', 6, (m.holes || []).length, 0),
    want('Over angles fore-aft (in)', p.Lt + 2 * p.Lf, m.bbox[3] - m.bbox[2], 0.003)];
}
const pads = () => { const b = buildPlyBook(analyse(DEFAULT_DESIGN, false)).fuselage.plies; return Object.fromEntries(['F-D1R', 'F-D4R', 'F-D5R'].map((id) => [id.slice(0, 4), b.find((q) => q.id === id)])); };
/** BL span (in) of a belly pad at the gear station: its arc range mapped to BL on the belly panel */
const padBL = (q) => { const bp = fusPanel(GEO.gear.s, 'belly'); return q.zrange.map((a) => bp.at(a).y * 12); };
/** attach-angle flange BL span (in, right side): the flange lies along the belly (direction a) centred on GM.P */
const flangeBL = () => [GM.P[0] - Math.abs(GM.a[0]) * GM.b / 2, GM.P[0] + Math.abs(GM.a[0]) * GM.b / 2];
const xb = [GM.Lt / 2 + GM.te + GM.c1, GM.Lt / 2 + GM.te + GM.c1 + GM.pb];
export const GMT_DEF = {
  pn: 'LEZ-32-120', rev: 'B', status: 'released', nha: 'LEZ-000 (aircraft)', qty: 2, kind: 'weldment',
  title: 'Main-gear attachment (per side)',
  revs: [{ rev: 'A', date: '2026-11-18', short: 'Initial definition', change: `Initial definition. The attachment was a 0.625 in tube in a tab with aluminium extrusions "floxed into the hard point": the extrusions sat on the belly 0.5–2.9 in off the shell's pads and half through the skin, the flox bond area, the flox allowable and the bolts were ASSUMED, and the mount loads ignored the one-wheel landing. As defined each side is a ${GM.D} × ${GM.wall} 4130 N tube in the bow's ear, an AN${nb} bolt fore-aft through it between two 6061-T6 angles outside the belly, each angle flox-bedded on its pad (F-D4 forward, F-D5 aft) and held by 2 × AN${GM.nb} through the hard point into a backing strip. The mounts are pins in roll, so the 23.483 one-wheel landing puts ≈ 3 V up on the near mount and 2 V down on the far one; the bolts carry it, the bond is not counted. A two-piece fairing (L/R halves) covers the angles.` }, { rev: 'B', date: '2026-11-19', short: 'Hose notch in the fairing half', change: `Final integration (LEZ-32-312 O3): the -3 brake hose leaves the fairing half through an edge notch ${HOSE_NOTCH ? HOSE_NOTCH.w.toFixed(2) : '?'} in wide at FS ${HOSE_NOTCH ? HOSE_NOTCH.at[0].toFixed(2) : '?'}, edged with a nylon grommet strip (I9). O1 / O2 are now checks on block A's shell features (I7, I8). No change to the solid; the fairing's mass is unchanged.` }],
  effectivity: 'Left and right (identical parts; the left is the mirror placement)', params: P,
  datums: [{ id: 'A', what: `Tube axis (fore-aft) at BL ${fx(YM)}, WL ${fx(GM.ztc)}` }, { id: 'B', what: `Bow plane, FS ${fx(S0, 1)}` }, { id: 'C', what: 'Belly outer surface under the angle flanges (the flox-bed datum)' }],
  features: [
    { id: 'tube', kind: 'tube', label: `Mount tube ${GM.D} × ${GM.wall} 4130 N, ${fx(GM.Lt)} in long, bore ${fx(GM.D - 2 * GM.wall, 3)} for the AN${nb} bolt; floxed in the bow ear`, tol: 'Ends square ±0.005; bore reamed to the bolt +0.002' },
    { id: 'angle', kind: 'plate', label: `Attach angles (2), 6061-T6, leg ${GM.te} in thick × ${GM.b} in wide, ${fx(GM.dc + GM.e - GM.tbed - GM.tf)} in deep, bolt Ø ${fx(GM.db + 0.002, 3)} at ${fx(GM.dc - GM.tbed)} in from the bed face (e ${fx(GM.e)}); flange ${GM.tf} × ${GM.b} × ${fx(GM.Lf)} in with 2 × Ø ${fx(GM.dbb + 0.006, 3)} at ${fx(xb[0])} and ${fx(xb[1])} in from the bow plane; seat tilted ${fx(Math.atan2(-GM.n[0], -GM.n[1]) * 180 / Math.PI, 1)}° to the belly`, tol: 'Holes ±0.005 true position; leg square to the flange ±0.5°' },
    { id: 'back', kind: 'plate', label: `Backing strips (2), 6061-T6 ${GM.b} × ${fx(GM.Lk)} × ${GM.tk} in on the inside face of the hard point, holes matched`, tol: 'Match-drilled through the shell' },
    { id: 'fair', kind: 'layup', label: `Fairing half: ${FAIR.plies} × 6781 ±45 over shaped foam, ${fx(FAIR.L, 1)} in fore-aft × ${fx(FAIR.span, 1)} in from BL 0, ${fx(FAIR.A, 2)} ft²; 3 screws into nutplates`, tol: 'Fits the belly within 1/16 in' },
  ],
  tolerances: { general: '.XX ±0.03 · .XXX ±0.010', holes: `Base holes match-drilled through the hard point and strip; bolt bore reamed with the bow in the jig`, breakEdges: '0.010–0.030' },
  drawingNotes: ['Right side shown; left the mirror placement of the same parts.', 'Pot flox inserts in the belly core at every base-bolt hole before drilling (LEZ-53-150 hard point).'], generalNote: 'Tube: primed inside and out. Angles and strips: conversion-coated and primed.',
  na: { cut: 'Stock cut to length and machined: no flat pattern', layup: 'Metal parts (the fairing half is a 2-ply 6781 shell laid up on the aircraft)' },
  material: { spec: 'Tube: MIL-T-6736 4130 N; angles and strips: AMS-QQ-A-200/8 6061-T6 extrusion; fairing 6781 / MTM45-1', alt: '6061-T6511 bar for the angles', form: `${GM.D} × ${GM.wall} tube; angle machined from 3 × 3 × 1/2 extrusion; ${GM.tk} in strip`, density: null,
    allowables: [['4130 N F_tu', '95 ksi', 'MIL-HDBK-5'], ['6061-T6 extrusion F_tu / F_ty / F_su / F_bru', '38 / 35 / 24 / 80 ksi', 'MMPDS-typical'], ['Yaw moment share at the mount', `${YAW}`, 'BOUND: centre-section bending ≈ 2× the bolted couple\'s stiffness; the centre section is checked for all of it']] },
  process: [{ op: 'Machine', spec: 'Saw the tube square, ream the bore; machine the angles from extrusion, drill the leg bore undersize, drill the flange holes; cut the strips.' },
    { op: 'Fit', spec: 'Bow in the jig, tubes floxed in the ears; bolt the angles to the tubes; flox-bed the flanges on the belly over the pads with release on the bolt shanks; drill through the shell and the strips; pot the core at each hole.' },
    { op: 'Install', spec: `AN${nb} through angle, tube, angle with MS21042L${nb}; 4 × AN${GM.nb} each side with MS21042L${GM.nb} inside; torque per AC 43.13-1B table 7-1; fairing halves on nutplates.` }],
  checks: ['fus-gear', 'gmt-tube', 'gmt-pin', 'gmt-lug', 'gmt-leg', 'gmt-base'],
  rules: [{ id: 'eD', label: 'Angle leg end distance e/D ≥ 2', v: GM.e / GM.db / 2, min: 1 }, { id: 'edge', label: 'Base bolt edge distance ≥ 2D', v: (GM.Lf - GM.te - GM.c1 - GM.pb) / GM.dbb / 2, min: 1 },
    { id: 'pitch', label: 'Base bolt pitch ≥ 4D', v: GM.pb / GM.dbb / 4, min: 1 }, { id: 'clear', label: 'Tube clears the bed face (in)', v: GM.dc - GM.r - GM.tbed - GM.tf, min: 0.1 }],
  mass: { each: gmtMassOf(V), from: 'solid volumes: tube × 0.283, angles and strips × 0.098 lb/in³; plus the fairing half from its laminate (envelope area × 2 × 6781) and nutplates' },
  hardware: [{ std: `AN${nb}-${anDash(GM.Lt + 2 * GM.te + 0.35)}A`, qty: 1, desc: 'mount bolt, fore-aft' }, { std: `MS21042L${nb}`, qty: 1, desc: 'nut' }, { std: `AN${GM.nb}-${anDash(GM.tf + GM.tbed + GM.hpT + GM.tk + 0.3)}A`, qty: 4, desc: 'base bolts through the hard point' }, { std: `MS21042L${GM.nb}`, qty: 4, desc: 'nuts, inside' }, { std: 'MS24693-C26', qty: 3, desc: 'fairing screws' }, { std: 'MS21047-L06', qty: 3, desc: 'fairing nutplates' }],
  hardwareNote: `Per side: AN${nb} mount bolt with MS21042L${nb} and AN960 washers; 4 × AN${GM.nb} base bolts with MS21042L${GM.nb} inside; lengths to the measured grip; torque per AC 43.13-1B table 7-1, witness-marked.`,
  interfaces: [
    { id: 'I1', with: 'LEZ-32-170 bow ear', feature: 'tube', what: 'Tube OD and length = the ear', check: () => ({ ok: GEO.gear.tubeD === GM.D && GM.Lt > GM.Lear, detail: `tube Ø${GM.D} × ${fx(GM.Lt)} in, ear ${GM.Lear} in long` }) },
    { id: 'I2', with: 'LEZ-53-150 hard-point pads F-D4 / F-D5 (ply book)', feature: 'angle', what: 'Base bolts on the pads fore-aft, and the flange on the pads across (≥ 0.25 in margin each side)', check: () => { const q = pads();
      if (!q['F-D4'] || !q['F-D5'] || !q['F-D1']) return { ok: false, detail: 'gear pads F-D1R / F-D4R / F-D5R not in the fuselage ply book' };
      const lo = (q['F-D4'].srange[1] - GEO.gear.s) * 12, hi = (q['F-D4'].srange[0] - GEO.gear.s) * 12, lo5 = (q['F-D5'].srange[0] - GEO.gear.s) * 12, hi5 = (q['F-D5'].srange[1] - GEO.gear.s) * 12;
      const fsOk = -xb[0] <= lo && -xb[1] >= hi && xb[0] >= lo5 && xb[1] <= hi5, onBelly = ['F-D1', 'F-D4', 'F-D5'].every((k) => q[k].panel === 'belly'), f = flangeBL(), m = 0.25;
      const lat = ['F-D1', 'F-D4', 'F-D5'].map((k) => { const [y0, y1] = padBL(q[k]); return { k, y0, y1, ok: onBelly && f[0] - y0 >= m && y1 - f[1] >= m }; });
      return { ok: fsOk && lat.every((x) => x.ok), detail: `bolts at FS ${fx(S0 - xb[1])}, ${fx(S0 - xb[0])} on F-D4 (${fx(S0 + hi)}–${fx(S0 + lo)}); ${fx(S0 + xb[0])}, ${fx(S0 + xb[1])} on F-D5 (${fx(S0 + lo5)}–${fx(S0 + hi5)}); flange BL ${fx(f[0])}–${fx(f[1])} on ${lat.map((x) => `${x.k} BL ${fx(x.y0)}–${fx(x.y1)}`).join(', ')}${onBelly ? '' : ' (pads not on the belly panel)'}` }; } },
    { id: 'I3', with: 'LEZ-53-150 hard-point stack', feature: 'back', what: 'Grip = shell + pads (the fus-gear check uses it)', check: () => { const want_ = FUS_T + (FIXED.gearMount.padBID + FIXED.gearMount.padsBID) * BASE_MAT.BID.t; return { ok: Math.abs(GM.hpT - want_) < 1e-6, detail: `hard point ${fx(GM.hpT, 3)} in = shell ${fx(FUS_T, 3)} + ${FIXED.gearMount.padBID + FIXED.gearMount.padsBID} × 6781 × ${fx(BASE_MAT.BID.t, 4)} (ICD A-M3: the shell and pads at the sourced 6781 ply)` }; } },
    { id: 'O1', with: 'LEZ-53-150 shell rev H (block A)', feature: 'angle', what: 'Flox potting of the core at the 8 base-bolt holes (A\'s shell feature, I7)', check: () => { const f = _DEFS['LEZ-53-150']?.def?.interfaces.find((q) => q.id === 'I7'), r = f ? f.check() : { ok: false, detail: 'no shell I7' }; return { ok: r.ok, detail: `shell I7: ${r.detail}` }; } },
    { id: 'O2', with: 'LEZ-53-150 shell rev H (block A)', feature: 'angle', what: 'Fairing nutplates (MS21047-L06) on the belly inside the fairing footprint, clear of the angles and the union (A\'s shell feature, I8)', check: () => { const f = _DEFS['LEZ-53-150']?.def?.interfaces.find((q) => q.id === 'I8'), r = f ? f.check() : { ok: false, detail: 'no shell I8' }; return { ok: r.ok, detail: `shell I8: ${r.detail}` }; } },
    { id: 'I9', with: 'LEZ-32-312 -3 hose (this block)', feature: 'fairing', what: 'Fairing-half edge notch where the hose leaves (rev B)', check: () => { const n = HOSE_NOTCH; return { ok: !!n && n.w >= LINE.hose.od + 0.12 - 1e-9, detail: n ? `notch ${n.w.toFixed(2)} in wide at FS ${n.at[0].toFixed(2)}, from BL ±${Math.abs(n.at[1]).toFixed(2)} to the edge (BL ±${n.edge.toFixed(2)}), nylon grommet strip` : 'no notch' }; } },
  ],
  tooling: { needed: true, text: 'Gear jig holding the bow square under the fuselage with both tubes coaxial; drill bushing plate for the base holes.' },
  sourcing: { blank: `4130 N tube ${GM.D} × ${GM.wall}, 6 in; 6061-T6 angle 3 × 3 × 1/2, 4 in; 6061-T6 strip ${GM.b} × ${GM.tk}, 6 in; fairing 6781 and foam`, vendor: 'Aircraft Spruce (4130 tube, 6061-T6 extrusions, AN hardware)', url: 'https://www.aircraftspruce.com/menus/mp/tubing.html',
    cost: 48.0, costAsOf: '2026-11-18', perAircraft: 2, lead: 'Stock', note: 'Approximate small-piece prices (typed from memory), per side.' },
};
