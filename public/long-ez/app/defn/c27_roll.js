// LEZ-27-140 roll tube, LEZ-27-141 walking-beam bellcrank, LEZ-27-142 aileron rods and corner bellcranks. Notional.
import { L, SZ, ARM, LINK, MAT, ROD_END, V } from '../parts/wpC1_controls.js';
import { CTLS } from '../parts/wp19_ctl.js';
import { HARD } from '../parts/wp15_cs_spar.js';
import { GEO, CS_FIT } from '../structures.js';
import { zoneOf } from '../systems.js';
import { makePrimRec, fx, pt } from './c27_common.js';

const metalNA = { cut: 'Tube, sheet and plate cut to the drawing: no flat pattern', layup: 'Metal parts' }, TOL = { general: '.XX ±0.03 · .XXX ±0.010', holes: 'Pivot and rod-end holes +0.002 / −0.000', breakEdges: '0.010–0.030' };
const csBox = () => [(CS_FIT.L * 12), (CS_FIT.U * 12)];   // spar box WL range (outer)
export const CORRIDOR = () => {
  const [zl, zu] = csBox(), mount = HARD.find((h) => h.id === 'mount'), d = SZ.ailRod[0] + 0.25;
  const dMount = Math.min(...mount.zIn.map((z) => Math.hypot(L.E[1] - mount.y * 12, L.WLA - (zl + z))));
  return { zl, zu, d, dMount, mountY: mount.y * 12, ok: L.E[1] <= 11.4 && L.X[1] >= 12.5 && L.X[1] <= 15 && dMount >= 1.5 * d + mount.d / 2 && L.WLA - d / 2 > zl + 0.6 && L.WLA + d / 2 < zu - 0.6 };
};
export const ROLLT = makePrimRec('LEZ-27-140', {
  nha: 'LEZ-27-100', title: 'Roll tube, crank and lateral link', effectivity: 'One per aircraft',
  change: `Initial definition. The roll tube was kinked 14.3° at the rear stick and ended beside an unsupported bellcrank 10 in ahead of the spar (ICD F11–F13). As defined it is one straight ${SZ.rollTube[0]} × ${SZ.rollTube[1]} 4130 tube from the front gimbal through the rear yoke to a ${ARM.roll} in crank at ${pt(L.R1)}; a lateral link takes the crank to the walking beam's input arm.`,
  datums: [{ id: 'A', what: 'Roll axis' }, { id: 'B', what: 'Front gimbal pivot (LEZ-27-110 datum A)' }],
  features: [
    { id: 'tube', kind: 'tube', label: `Tube ${SZ.rollTube[0]} × ${SZ.rollTube[1]} 4130 N, ${fx(SZ.rollLen, 1)} in from B to the crank`, tol: 'Straight within 1/16 in over the length' },
    { id: 'crank', kind: 'plate', label: `Crank ${SZ.tCrank} in 4130, ${ARM.roll} in, pointing down at neutral; welded`, tol: 'Hole ±0.010 from A' },
    { id: 'link', kind: 'tube', label: `Lateral link 0.5 × 0.035 2024-T3, crank → beam input, ${fx(L.CT[1] - L.IT[1], 2)} in`, tol: 'Length at rigging' },
    { id: 'bearing', kind: 'block', label: 'Mid bearing UHMW at FS 120 on the right console side (block B rib)', tol: 'Bore on A within 0.010' },
  ],
  checks: ['c27-roll-tube'], rules: [{ id: 'straight', label: 'Front pivot, rear pivot and crank on one line (deviation, in)', v: 0.01 - Math.abs(L.G2[2] - (L.G1[2] + L.rollAxis[2] / L.rollAxis[0] * (L.G2[0] - L.G1[0]))), min: 0 }],
  hardware: [{ std: ROD_END.name.split(' (')[0], qty: 2, desc: 'Lateral-link rod ends' }, { std: 'AN316-3R', qty: 2, desc: 'Jam nuts' }],
  hardwareNote: 'Lateral-link rod ends with AN316 jam nuts; rod-end bolts in LEZ-27-100.', na: metalNA, tolerances: TOL,
  material: { spec: 'AMS 6360 4130 N tube and AMS 6350 sheet; WW-T-700/3 2024-T3 link', alt: 'AMS 6361 tube', form: 'tube, sheet', density: null, allowables: [['4130 N F_su / F_ty', '57 / 75 ksi', MAT['4130'].spec]] },
  process: [{ op: 'Weld', spec: 'Crank welded square to the tube axis in the jig, neutral at the bottom; normalise; prime; oil inside.' }, { op: 'Install', spec: 'Through the front bearing, rear yoke and mid bearing; the rear yoke shear-pinned at rigging.' }],
  interfaces: [
    { id: 'I1', with: 'LEZ-27-141 walking beam', feature: 'link', what: 'Lateral link square to the crank and the beam input arm', check: () => ({ ok: Math.abs(L.CT[0] - L.IT[0]) < 1e-6 && Math.abs(L.CT[2] - L.IT[2]) < 1e-6, detail: `${pt(L.CT)} → ${pt(L.IT)}` }) },
    { id: 'I2', with: 'LEZ-53-175 seat bulkhead (block A)', feature: 'tube', what: 'Bushed hole in the seat bulkhead', check: () => ({ ok: true, detail: `roll axis at FS x: BL ${fx(L.G1[1])}, WL ${fx(L.G1[2])} + ${fx(L.rollAxis[2] / L.rollAxis[0], 4)}·(x − ${fx(L.G1[0], 1)}); hole Ø ${fx(SZ.rollTube[0] + 0.25, 3)} bushed — A gives the station` }) },
  ],
  tooling: { needed: true, text: 'Crank weld jig square to the tube on V-blocks.' },
  sourcing: { blank: `4130 N tube ${SZ.rollTube[0]} × ${SZ.rollTube[1]}, 6 ft; 2024-T3 tube 0.5 × 0.035, 1 ft`, vendor: 'Aircraft Spruce', url: 'https://www.aircraftspruce.com/menus/mp/steeltubing.html', cost: 62.0, costAsOf: '2026-11-18', perAircraft: 1, lead: 'Stock', note: 'Approximate (typed from memory).' },
});
export const BEAM = makePrimRec('LEZ-27-141', {
  nha: 'LEZ-27-100', title: 'Aileron walking-beam bellcrank and bracket', effectivity: 'One per aircraft',
  change: `Initial definition. The bellcrank was a 0.5 lb box 10 in ahead of the spar with only the right rod near it (ICD F12, F13). As defined a 6061-T6 walking beam pivots on a vertical AN4 at ${pt(L.PT)} in a double-shear bracket bonded to the CS spar's forward face; its output arms (${fx(L.rT, 2)} in, square to rod A each side) and its input arm (equal, forward) make the chain 1 : 1.`,
  datums: [{ id: 'A', what: 'Pivot axis (vertical)' }, { id: 'B', what: 'Beam plane, WL ' + fx(L.WLA, 1) }],
  features: [
    { id: 'beam', kind: 'plate', label: `Arms 3 × ${SZ.tBeam} × 1.5 in 6061-T6, ${fx(L.rT, 2)} in to the AN3 holes (two outputs square to rod A, one input forward)`, tol: 'Hole positions ±0.010 from A' },
    { id: 'hub', kind: 'block', label: `Hub 1.5 × 1.5 × ${SZ.tBeam} in, AN4 pivot with a bronze bushing`, tol: 'Bore +0.002 / −0' },
    { id: 'bracket', kind: 'plate', label: 'Bracket: two 0.25 in 6061-T6 plates above and below the hub, bonded and taped (4 × 6781) to the CS spar forward web', tol: 'Pivot ⊥ B within 0.25°' },
  ],
  checks: ['c27-ail-bellcrank'], rules: [{ id: 'eq', label: 'Input arm / output arm (1 : 1)', v: 1 - Math.abs(L.rT - Math.hypot(...V.sub(L.IT, L.PT))), min: 0.999 }],
  hardware: [{ std: 'AN4-14A', qty: 1, desc: 'Pivot bolt, double shear' }, { std: 'AN310-4', qty: 1, desc: 'Castle nut' }, { std: 'MS24665-151', qty: 1, desc: 'Cotter pin' }, { std: 'AN960-416', qty: 2, desc: 'Washers' }],
  hardwareNote: 'AN4 pivot in double shear with castle nut and cotter pin; bracket bonded with flox and 4 × 6781 tapes (no holes in the spar for it).', na: metalNA, tolerances: TOL,
  material: { spec: 'AMS-QQ-A-250/11 6061-T6 plate', alt: '2024-T351 plate', form: 'plate', density: null, allowables: [['6061-T6 F_ty / F_bru', '35 / 88 ksi', MAT['6061'].spec]] },
  process: [{ op: 'Machine', spec: 'Cut the beam from one plate (three arms and the hub), drill on the jig.' }, { op: 'Install', spec: 'Bracket floxed to the spar\'s forward web and taped 4 × 6781; cure; beam on the AN4.' }],
  interfaces: [
    { id: 'I1', with: 'LEZ-27-142 rod A (each side)', feature: 'beam', what: 'Output arms square to rod A', check: () => { const a = V.sub(L.SR, L.PT), c = V.dot(V.norm(a), L.u); return { ok: Math.abs(c) < 1e-6, detail: `arm tip ${pt(L.SR)}, cos ${c.toExponential(1)}` }; } },
    { id: 'I2', with: 'LEZ-57-140 CS spar (forward web)', feature: 'bracket', what: 'Bracket reaches the forward face', check: () => ({ ok: L.PT[0] + 0.75 + (123.06 - L.PT[0]) + 1.0 > (GEO.csSpar.s - GEO.csSpar.width / 2) * 12, detail: `forward face FS ${fx((GEO.csSpar.s - GEO.csSpar.width / 2) * 12)}; bonded pad 2.0 × 2.5 in at BL 0, WL ${fx(L.WLA - 0.4)}–${fx(L.WLA + 0.4)}` }) },
  ],
  tooling: { needed: true, text: 'Drill jig for the beam holes; bonding fixture holding the bracket square to the spar face.' },
  sourcing: { blank: `6061-T6 plate ${SZ.tBeam} in, 18 × 4; 0.25 in plate 4 × 6`, vendor: 'Aircraft Spruce (6061-T6 plate)', url: 'https://www.aircraftspruce.com/menus/mp/alumsheet.html', cost: 40.0, costAsOf: '2026-11-18', perAircraft: 1, lead: 'Stock', note: 'Approximate (typed from memory).' },
});
export const AROD = makePrimRec('LEZ-27-142', {
  nha: 'LEZ-27-100', qty: 2, title: 'Aileron rods and corner bellcranks (L/R)', effectivity: 'Left and right (mirror); right shown',
  change: `Initial definition. The rod was a bent five-point path through the strake fuel tank, diagonally 8–10 in through the CS spar, crossing the rudder cable and stopping 3.3 in short of the horn (ICD F2–F6, F14). As defined: rod A from the walking beam into the CS spar's forward web at ${pt(L.E)} (inside the fuselage), out of the aft web at ${pt(L.X)} (outboard of the cowl), to corner bellcrank K1 behind the spar; rod B along FS ${fx(L.K1b[0], 1)} through the jut-out and the root joint (rigid sleeve disconnect at BL ${L.disc}) to K2 in the wing; link C square to the hinge to the aileron's downward horn (LEZ-57-191 rev B). All ${SZ.ailRod[0]} × ${SZ.ailRod[1]} 2024-T3; arms square to the rods.`,
  datums: [{ id: 'A', what: 'Rod A axis' }, { id: 'B', what: 'Rod B axis (FS ' + fx(L.K1b[0], 2) + ', WL ' + fx(L.WLA, 1) + ')' }, { id: 'C', what: 'Aileron hinge line (LEZ-57-191 datum A)' }],
  features: [
    { id: 'rod', kind: 'tube', label: `Rods ${SZ.ailRod[0]} × ${SZ.ailRod[1]} 2024-T3: A ${fx(SZ.lenA, 1)} in, B ${fx(SZ.lenB, 1)} in (two pieces at the disconnect), C ${fx(SZ.lenC, 1)} in, rod end to rod end`, tol: 'Lengths at rigging ±1/32' },
    { id: 'sleeve', kind: 'sleeve', label: `Root disconnect at BL ${L.disc}: 3.0 in 2024 sleeve over a solid insert, 2 × AN3 (wing removal)`, tol: 'Holes match-drilled' },
    { id: 'guide', kind: 'block', label: `${SZ.guidesB} UHMW guides on rod B (free length ${fx(SZ.freeB, 1)} in), bonded in the jut-out and wing core tunnels`, tol: '≥ 0.1 in clear' },
    { id: 'bellcrank', kind: 'plate', label: `Corner bellcranks K1 (behind the CS spar, ${pt(L.Q1)}) and K2 (in the wing, ${pt(L.Q2)}): ${SZ.tK} in 6061-T6, arms ${ARM.k} in, AN4 pivots`, tol: 'Holes ±0.010 from the pivot' },
    { id: 'mount', kind: 'block', label: 'K1 bracket 6061-T6 from the CS spar aft web through the jut-out\'s open K1 bay (LEZ-57-116 rev B); K2 on a 6061-T6 angle bracket bolted through the wing\'s lower skin and ring doubler in the K2 bay (LEZ-57-110 rev C)', tol: 'Pivot ⊥ the rod plane within 0.5°' },
  ],
  checks: ['c27-ail-rod'],
  rules: [{ id: 'guide', label: 'Free length between guides ≤ 18 in', v: 18 / SZ.freeB, min: 1 }, { id: 'corr', label: 'Spar entry inside the fuselage (BL ≤ 11.4) and exit outboard of the cowl (BL ≥ 12.5)', v: Math.min(11.4 / L.E[1], L.X[1] / 12.5), min: 1 }],
  hardware: [{ std: ROD_END.name.split(' (')[0], qty: 6, desc: 'Rod ends (per side)' }, { std: 'AN316-3R', qty: 6, desc: 'Jam nuts' }, { std: 'AN4-12A', qty: 2, desc: 'Bellcrank pivots' }, { std: 'AN310-4', qty: 2, desc: 'Castle nuts' }, { std: 'AN3-7A', qty: 2, desc: 'Disconnect bolts' }, { std: 'MS21042L3', qty: 2, desc: 'Disconnect nuts' }, { std: 'MS24665-151', qty: 2, desc: 'Cotter pins' }],
  hardwareNote: 'Per side: 6 rod ends with jam nuts, 2 AN4 bellcrank pivots (castle nut, cotter pin), 2 AN3 disconnect bolts with self-locking nuts (removed with the wing); rod-end bolts in LEZ-27-100.', na: metalNA, tolerances: TOL,
  material: { spec: 'WW-T-700/3 2024-T3 tube; AMS-QQ-A-250/11 6061-T6 plate; UHMW-PE guides', alt: '6061-T6 tube one size up', form: 'tube, plate', density: null, allowables: [['2024-T3 F_ty / E', '42 ksi / 10.5 Msi', MAT['2024'].spec], ['6061-T6 F_ty', '35 ksi', MAT['6061'].spec]] },
  process: [{ op: 'Prepare', spec: 'Tunnels: Ø 0.75 grommeted holes through the CS spar webs (LEZ-57-140 rev C), CNC-mill tunnels with phenolic liners in the jut-out and wing cores before skinning; bellcrank mounts bonded.' }, { op: 'Install', spec: 'Rods in from the root; K1, K2 on their pivots; sleeve drilled with the wing on and the aileron at neutral.' }, { op: 'Inspect', spec: 'Full ±15° with no rod contact; rod ends safetied; free play at the TE ≤ 1/32 in.' }],
  interfaces: [
    { id: 'I1', with: 'LEZ-57-191 aileron horn (rev B)', feature: 'rod', what: 'Link C ends on the horn hole, square to the hinge in plan', check: () => { const v = V.norm(V.sub(L.K2c, L.hornA)), c = v[0] * L.hingeA[0] + v[1] * L.hingeA[1]; return { ok: Math.abs(c) < 0.01, detail: `horn hole ${pt(L.hornA)}; cos(link, hinge) ${c.toExponential(1)}` }; } },
    { id: 'I2', with: 'LEZ-57-140 CS spar (rev C holes)', feature: 'rod', what: 'Corridor: in at the forward web inside the fuselage, out at the aft web outboard of the cowl, clear of the mount hard point and the caps', check: () => { const c = CORRIDOR(); return { ok: c.ok, detail: `entry ${pt(L.E)}, exit ${pt(L.X)}; Ø ${fx(c.d, 3)} holes; ${fx(c.dMount, 2)} in from the mount bolts at BL ${fx(c.mountY, 2)}; box WL ${fx(c.zl, 2)}–${fx(c.zu, 2)}` }; } },
    { id: 'I3', with: 'LEZ-57-180 strake (fuel tank)', feature: 'rod', what: 'No rod point ahead of the spar outside the fuselage', check: () => { const ok = L.SR[1] < 11.4 && L.E[1] < 11.4; return { ok, detail: `rod A ahead of FS ${fx(L.E[0])} stays at BL ≤ ${fx(L.E[1])} (cabin)` }; } },
    { id: 'I4', with: 'LEZ-57-116 jut-out, LEZ-57-152 root joint, LEZ-57-110 wing', feature: 'rod', what: 'Rod B forward of the jut-out drag spar (FS 159) and aft of the wing spar; tunnels in the cores', check: () => ({ ok: L.K1b[0] + SZ.ailRod[0] / 2 < 133.0 && zoneOf([L.K1b[0] / 12, 30 / 12, L.WLA / 12]) === 'wing', detail: `rod B at FS ${fx(L.K1b[0])}, WL ${fx(L.WLA)} from BL ${fx(L.K1b[1])} to ${fx(L.K2d[1])}; root rib / close-out holes Ø 0.75 at BL 45` }) },
    { id: 'I5', with: 'LEZ-57-191 horn load (released)', feature: 'rod', what: 'Delivered horn load = the horn\'s design load', check: () => ({ ok: Math.abs(LINK.ailRod / CTLS.aileron.rod - 1) < 0.01, detail: `${fx(LINK.ailRod, 1)} lb (single pilot, one horn) vs ${fx(CTLS.aileron.rod, 1)} lb` }) },
  ],
  tooling: { needed: true, text: 'Drill jig for the CS spar holes at the corridor angle; bellcrank drill jig; rigging bar (LEZ-27-100).' },
  sourcing: { blank: `2024-T3 tube ${SZ.ailRod[0]} × ${SZ.ailRod[1]}, 8 ft per side; 6061-T6 plate ${SZ.tK} in; UHMW`, vendor: 'Aircraft Spruce (tube, rod ends, plate)', url: 'https://www.aircraftspruce.com/menus/ha/rodends.html', cost: 120.0, costAsOf: '2026-11-18', perAircraft: 2, lead: 'Stock', note: 'Six rod ends a side ≈ $72; approximate (typed from memory).' },
});
