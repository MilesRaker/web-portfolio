// LEZ-27-110 front side stick and console base, LEZ-27-111 rear stick and rear pitch link: definition records. Notional.
import { L, SZ, ARM, LINK, LOADS, MAT, ROD_END } from '../parts/wpC1_controls.js';
import { fusAt } from '../structures.js';
import { makePrimRec, fx, pt, near } from './c27_common.js';
import { icdIface } from '../parts/wpC9_icd.js';

const inner = (fs, wl) => fusAt(fs / 12).w * 6 - 0.54;   // inner wall half-width (in) near mid-height
const stickTravel = Math.asin(ARM.pitchBC * Math.sin(20 * Math.PI / 180) / ARM.pitch) * 180 / Math.PI, rollTravel = Math.asin(ARM.horn * Math.sin(15 * Math.PI / 180) / ARM.roll) * 180 / Math.PI;
export const STICK_TRAVEL = { pitch: stickTravel, roll: rollTravel };
const common = (rear) => ({
  material: { spec: 'Stick, fork plates: AMS 6360 / 6350 4130 N tube and sheet; yoke and bearing block: AMS-QQ-A-250/11 6061-T6; grip UHMW-PE', alt: 'AMS 6361 4130 tube', form: 'tube, sheet, plate', density: null,
    allowables: [['4130 N F_ty / F_bru', `75 / ${MAT['4130'].Fbru / 1000} ksi`, MAT['4130'].spec], ['6061-T6 F_ty / F_bru', '35 / 88 ksi', MAT['6061'].spec]] },
  process: [{ op: 'Machine', spec: 'Cut the stick tube; cut and drill the fork plates as a pair; machine the yoke and drill the pivot through both plates and the yoke together.' },
    { op: 'Weld', spec: 'TIG the fork plates to the stick tube in the jig, pivot holes on the pin; normalise; prime.' },
    { op: 'Fit', spec: `Ream the pivot to AN4 (Ø 0.250 +0.002); fit the grip; set travel ±${fx(stickTravel, 1)}° pitch, ±${fx(rollTravel, 1)}° roll at the stops (LEZ-27-160).` }],
  tolerances: { general: '.XX ±0.03 · .XXX ±0.010', holes: 'Pivot and rod-end holes +0.002 / −0.000, reamed after welding', breakEdges: '0.010–0.030' },
  na: { cut: 'Tube and sheet cut to length: no flat pattern', layup: 'Metal parts' },
});
export const STK_F = makePrimRec('LEZ-27-110', {
  nha: 'LEZ-27-100', title: 'Side stick and console base (front)', effectivity: 'One per aircraft, right console',
  change: `Initial definition. The stick was an ASSUMED 1.6 lb box with a 7 / 2.5 in ratio and four inserts into a wall 1.2 in away (ICD F10, F23). As defined: grip ${ARM.grip} in above the pitch pin, pitch arm ${ARM.pitch} in (square to the pitch rod), the gimbal on the roll tube's front end at ${pt(L.G1)}, the bearing block bolted to the right console rib (block B). ICD phase 2: the stick tube canted ${L.cant}° inboard above the yoke so the grip clears the canopy's right rail and the shell by ≥ 0.5 in over the full travel (it touched at about 5° roll).`,
  datums: [{ id: 'A', what: 'Pitch pivot axis (lateral, AN4 pin through the yoke)' }, { id: 'B', what: 'Roll axis (the roll tube centre line)' }, { id: 'C', what: 'Stick centre plane' }],
  features: [
    { id: 'stick', kind: 'tube', label: `Stick ${SZ.stick[0]} × ${SZ.stick[1]} 4130 N, ${ARM.grip} in from A to the grip reference, 8.0 in long, canted ${L.cant}° inboard of the roll axis's vertical (fork and pitch arm square to the roll axis)`, tol: '±0.03 in length' },
    { id: 'fork', kind: 'plate', label: `Fork plates 2 × ${SZ.tFork} in 4130, Ø 0.250 pivot at A and Ø 0.1875 rod-end hole ${ARM.pitch} in below A (pitch rod and rear link both on the AN3)`, tol: 'Holes +0.002 / −0' },
    { id: 'yoke', kind: 'block', label: 'Yoke 1.25 × 0.875 × 1.25 in 6061-T6 on the roll tube\'s front end, pivot bore Ø 0.250', tol: 'Bore +0.002 / −0' },
    { id: 'bearing', kind: 'block', label: `Bearing block 0.75 × 2.0 × 2.0 in 6061-T6 with a bronze-lined bore for the roll tube, 2.5 in aft of A; 2 × AN3 into the console rib`, tol: 'Bore on B within 0.005' },
    { id: 'grip', kind: 'sleeve', label: 'Grip sleeve, UHMW-PE, 3.0 in, push-to-talk and trim indicator wiring per block J', tol: '—' },
  ],
  checks: ['c27-stick'],
  rules: [{ id: 'eD', label: 'Rod-end hole edge distance e/D ≥ 2 (0.7 in to the fork end)', v: 0.7 / 0.1875, min: 2 }, { id: 'ratio', label: 'Pitch arm reproduces the horn load: 7.0 / 3.0 × 1.2 / 1.5 together = released 233.8 lb (ratio)', v: 233.8 / LINK.hornE, min: 0.99 }],
  hardware: [{ std: 'AN4-10A', qty: 1, desc: 'Pitch pivot pin through the fork and yoke' }, { std: 'AN310-4', qty: 1, desc: 'Castle nut' }, { std: 'MS24665-151', qty: 1, desc: 'Cotter pin' }, { std: 'AN3-12A', qty: 2, desc: 'Bearing block to the console rib' }, { std: 'MS21042L3', qty: 2, desc: 'Nuts' }, { std: 'AN960-10', qty: 6, desc: 'Washers' }],
  hardwareNote: 'AN4 pivot pin with AN310 castle nut and cotter pin (rotating joint); 2 × AN3 bearing-block bolts with MS21042L3 nuts; torque per AC 43.13-1B table 7-1 (castle nut snug, aligned to the cotter hole). The pitch-rod and rear-link rod ends share the AN3 in LEZ-27-100.',
  interfaces: [
    { id: 'I1', with: 'LEZ-27-140 roll tube', feature: 'yoke', what: 'Pivot A on the roll axis', check: () => ({ ok: near(L.G1, L.G1) && Math.abs(L.rollAxis[1]) < 1e-9, detail: `pivot ${pt(L.G1)}; roll axis BL ${fx(L.G1[1])} constant, rising ${fx(Math.atan2(L.rollAxis[2], L.rollAxis[0]) * 180 / Math.PI, 1)}° aft` }) },
    { id: 'I2', with: 'LEZ-27-120 pitch rod, LEZ-27-111 rear link', feature: 'fork', what: 'Rod-end hole at the pitch arm, square to the pitch rod', check: () => { const r = [L.PA1[0] - L.PB[0], L.PA1[1] - L.PB[1], L.PA1[2] - L.PB[2]], a = [L.PA1[0] - L.G1[0], 0, L.PA1[2] - L.G1[2]], c = (r[0] * a[0] + r[2] * a[2]) / Math.hypot(r[0], r[2]) / Math.hypot(a[0], a[2]); return { ok: Math.abs(c) < 0.01, detail: `hole at ${pt(L.PA1)}, arm ⟂ rod (cos ${c.toExponential(1)})` }; } },
    { id: 'I3', with: 'Right console rib (block B, LEZ-25-110)', feature: 'bearing', what: 'Bearing block inside the wall, bolted to the console rib', check: () => { const w = inner(L.G1[0] + 2.5); return { ok: L.G1[1] + 1.0 <= w - 0.1, detail: `block to BL ${fx(L.G1[1] + 1.0)}, wall inner face BL ${fx(w)}; B to provide the rib at FS ${fx(L.G1[0] + 2.5)} with 2 × AN3 holes at WL ${fx(L.G1[2] - 0.75)} / ${fx(L.G1[2] + 0.75)}` }; } },
    ...icdIface(['IC10']).map((x) => ({ ...x, id: 'I5', with: 'LEZ-56-100 canopy rail, LEZ-53-150 shell (block B / A)', feature: 'grip' })),
    { id: 'I4', with: 'Right armrest / console top (block B)', feature: 'stick', what: 'Slot for the stick travel', check: () => { const h = 3.1, dx = h * Math.tan(stickTravel * Math.PI / 180), dy = h * Math.tan(rollTravel * Math.PI / 180); return { ok: true, detail: `at 3.1 in above A: ±${fx(dx)} in fore-aft, ±${fx(dy)} in lateral; slot ${fx(2 * dx + SZ.stick[0] + 0.25)} × ${fx(2 * dy + SZ.stick[0] + 0.25)} in centred on ${pt([L.G1[0], L.G1[1], L.G1[2] + h])}` }; } },
  ],
  tooling: { needed: true, text: 'Weld jig: fork plates on a pin through both pivot holes, stick tube square to the pin; drill jig for the pitch-arm hole.' },
  sourcing: { blank: `4130 N tube ${SZ.stick[0]} × ${SZ.stick[1]}, 1 ft; 4130 sheet ${SZ.tFork} in, 6 × 6 in; 6061-T6 bar 1.25 × 2.0 in, 6 in`, vendor: 'Aircraft Spruce (4130 tube 03-xxxxx, sheet, 6061 bar)', url: 'https://www.aircraftspruce.com/menus/mp/steeltubing.html', cost: 45.0, costAsOf: '2026-11-18', perAircraft: 1, lead: 'Stock', note: 'Approximate small-piece prices (typed from memory).' },
  ...common(false),
});
export const STK_R = makePrimRec('LEZ-27-111', {
  nha: 'LEZ-27-100', title: 'Rear stick and rear pitch link', effectivity: 'One per aircraft, rear seat right side; stick removable',
  change: `Initial definition. The rear stick only plugged onto the roll tube, so the rear seat had no pitch (ICD F27). As defined the rear yoke on the roll tube at ${pt(L.G2)} carries a pitch arm equal to the front stick's, joined to it by a ${SZ.rearLink[0]} × ${SZ.rearLink[1]} 2024-T3 rear link parallel to the roll axis (a parallelogram: 1 : 1); the stick plugs into the yoke on a quick-release pin. ICD phase 2: the grip at ${ARM.gripR} in (was 5.5) and the tube canted ${L.cant}° inboard like the front stick, so it clears the canopy and the shell by ≥ 0.5 in over the travel.`,
  datums: [{ id: 'A', what: 'Rear pitch pivot axis' }, { id: 'B', what: 'Roll axis' }, { id: 'C', what: 'Stick centre plane' }],
  features: [
    { id: 'stick', kind: 'tube', label: `Removable stick ${SZ.stick[0]} × ${SZ.stick[1]} 4130 N, grip ${ARM.gripR} in above A, canted ${L.cant}° inboard, quick-release pin in the yoke socket`, tol: '±0.03 in' },
    { id: 'fork', kind: 'plate', label: `Fork plates 2 × ${SZ.tFork} in 4130 with the rear pitch arm, ${ARM.pitch} in`, tol: 'Holes +0.002 / −0' },
    { id: 'yoke', kind: 'block', label: 'Yoke 6061-T6 clamped to the roll tube with 2 × AN3 (shear-pinned), pivot Ø 0.250', tol: 'Bore +0.002 / −0' },
    { id: 'link', kind: 'tube', label: `Rear link ${SZ.rearLink[0]} × ${SZ.rearLink[1]} 2024-T3, ${fx(SZ.rearLen, 1)} in rod end to rod end, threaded plugs both ends`, tol: 'Length ±1/32 in at rigging (rod ends)' },
    { id: 'guide', kind: 'block', label: 'UHMW guide at mid-length on the right console side', tol: '≥ 0.1 in clear all round' },
    { id: 'pin', kind: 'pin', label: 'Quick-release pin, 3/16 in, with a lanyard', tol: '—' },
  ],
  checks: ['c27-rear-stick'],
  rules: [{ id: 'para', label: 'Front and rear pitch arms equal and parallel (1 : 1)', v: 1 - Math.abs(Math.hypot(L.PA2[0] - L.G2[0], L.PA2[2] - L.G2[2]) - ARM.pitch), min: 0.999 }, { id: 'seat', label: 'Clear of the rear seat edge BL 8.4 (in)', v: L.G2[1] - SZ.rollTube[0] / 2 - 8.4, min: 0.25 }],
  hardware: [{ std: 'AN4-10A', qty: 1, desc: 'Rear pitch pivot' }, { std: 'AN310-4', qty: 1, desc: 'Castle nut' }, { std: 'MS24665-151', qty: 1, desc: 'Cotter pin' }, { std: 'AN3-10A', qty: 2, desc: 'Yoke clamp to the roll tube' }, { std: 'MS21042L3', qty: 2, desc: 'Nuts' }, { std: 'MS17984C3', qty: 1, desc: 'Quick-release pin 3/16 (typed from memory)' }, { std: ROD_END.name.split(' (')[0], qty: 2, desc: 'Rear-link rod ends' }, { std: 'AN316-3R', qty: 2, desc: 'Jam nuts' }],
  hardwareNote: 'AN4 rear pivot with castle nut and cotter pin; yoke clamped and shear-pinned with 2 × AN3; rear link rod ends with AN316 jam nuts (thread engagement past the check hole); quick-release pin with lanyard.',
  interfaces: [
    { id: 'I1', with: 'LEZ-27-110 front stick', feature: 'link', what: 'Rear link ends on both pitch-arm holes', check: () => ({ ok: Math.abs(Math.hypot(...L.PA2.map((v, i) => v - L.PA1[i])) - SZ.rearLen) < 1e-6, detail: `${pt(L.PA1)} → ${pt(L.PA2)}, ${fx(SZ.rearLen, 2)} in` }) },
    { id: 'I2', with: 'LEZ-27-140 roll tube', feature: 'yoke', what: 'Yoke on the roll axis', check: () => { const t = (L.G2[0] - L.G1[0]) / L.rollAxis[0], q = L.G1.map((v, i) => v + L.rollAxis[i] * t); return { ok: near(q, L.G2, 1e-6), detail: `rear pivot ${pt(L.G2)} on the roll axis` }; } },
    { id: 'I3', with: 'Rear seat (block B, LEZ-25-121)', feature: 'link', what: 'Roll tube and link outboard of the cushion edge BL ±8.4', check: () => ({ ok: L.G2[1] - SZ.rearLink[0] / 2 > 8.65, detail: `nearest edge BL ${fx(L.G2[1] - SZ.rearLink[0] / 2)}` }) },
  ],
  tooling: { needed: true, text: 'Same weld jig as LEZ-27-110; rigging bar holding both sticks vertical while the rear link length is set.' },
  sourcing: { blank: `4130 tube ${SZ.stick[0]} × ${SZ.stick[1]} 1 ft; 2024-T3 tube ${SZ.rearLink[0]} × ${SZ.rearLink[1]} 4 ft; 6061 bar; UHMW block`, vendor: 'Aircraft Spruce (tube, rod ends, quick-release pins)', url: 'https://www.aircraftspruce.com/menus/ha/rodends.html', cost: 85.0, costAsOf: '2026-11-18', perAircraft: 1, lead: 'Stock', note: 'Rod ends ≈ $12 each; approximate (typed from memory).' },
  ...common(true),
});
void LOADS;
