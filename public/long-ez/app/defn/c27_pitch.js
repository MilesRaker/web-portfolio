// LEZ-27-120 pitch rod, LEZ-27-130 elevator torque tube / bellcrank / drive links, LEZ-27-135 balance weights. Notional.
import { L, SZ, ARM, LINK, MAT, ROD_END, V } from '../parts/wpC1_controls.js';
import { solidOf } from '../parts/wpC2_prims.js';
import { CTLS } from '../parts/wp19_ctl.js';
import { GEO, fusAt } from '../structures.js';
import { FRAMES, afAt } from '../plybook.js';
import { makePrimRec, fx, pt, near } from './c27_common.js';
import { icdIface, balanceCheck } from '../parts/wpC9_icd.js';
import { ELV } from './ctl_surface.js';

const D2R = Math.PI / 180, G = GEO.canard;
/** canard lower surface WL (in) at FS fs, BL bl */
export const canardLow = (fs, bl) => { const y = Math.abs(bl) / 12, x = (fs / 12 - G.le) / G.c, a = afAt(FRAMES.canard, y, x); return (FRAMES.canard.pt(y, 0, 0)[2] + a.yl * G.c) * 12; };
const rot = (p, c, th) => { const t = th * D2R, dx = p[0] - c[0], dz = p[2] - c[2]; return [c[0] + dx * Math.cos(t) - dz * Math.sin(t), p[1], c[2] + dx * Math.sin(t) + dz * Math.cos(t)]; };
const along = (a, b, x) => { const u = V.norm(V.sub(b, a)); return V.add(a, V.mul(u, (x - a[0]) / u[0])); };
const metal = (what) => ({ spec: what, alt: 'AMS 6361 4130 tube; 2024-T3 per WW-T-700/3', form: 'tube, sheet', density: null,
  allowables: [['4130 N F_su / F_ty / F_bru', `57 / 75 / ${MAT['4130'].Fbru / 1000} ksi`, MAT['4130'].spec], ['2024-T3 tube F_ty / E', '42 ksi / 10.5 Msi', MAT['2024'].spec]] });
const metalNA = { cut: 'Tube and sheet cut to length: no flat pattern', layup: 'Metal parts' };
const TOL = { general: '.XX ±0.03 · .XXX ±0.010', holes: 'Rod-end and pivot holes +0.002 / −0.000', breakEdges: '0.010–0.030' };

export const PROD = makePrimRec('LEZ-27-120', {
  nha: 'LEZ-27-100', title: 'Pitch rod', effectivity: 'One per aircraft',
  change: `Initial definition. The rod was a bent four-point path (no pushrod can bend) through the leg space and the panel at BL 5.4, ending behind F28, with ASSUMED tube and guides. As defined it is straight, ${fx(SZ.pitchLen, 1)} in rod end to rod end along the right wall from the stick's pitch arm to the torque-tube bellcrank, ${SZ.pitchRod[0]} × ${SZ.pitchRod[1]} 2024-T3 sized for the pilots together (23.399(b)), ${SZ.pitchGuides} UHMW guides.`,
  datums: [{ id: 'A', what: 'Rod axis between the rod-end centres' }, { id: 'B', what: 'Forward rod-end centre (bellcrank)' }],
  features: [
    { id: 'rod', kind: 'tube', label: `Tube ${SZ.pitchRod[0]} × ${SZ.pitchRod[1]} 2024-T3, ${fx(SZ.pitchLen - 1.8, 2)} in; rod ends ${pt(L.PB)} → ${pt(L.PA1)}`, tol: 'Straight within 1/32 in; length set at rigging ±1/32' },
    { id: 'plug', kind: 'plug', label: 'Threaded end plugs 4130, 1.0 in, 4 × AN470AD4 each end, 10-32 tapped for the rod ends', tol: 'Thread engagement ≥ 0.375 in (check hole)' },
    { id: 'guide', kind: 'block', label: `${SZ.pitchGuides} UHMW guides at the thirds, bonded to the right side wall (free length ${fx(SZ.pitchFree, 1)} in)`, tol: '≥ 0.1 in clear all round, full travel' },
  ],
  checks: ['c27-pitch-rod'], rules: [{ id: 'guide', label: 'Free length between guides ≤ 20 in', v: 20 / SZ.pitchFree, min: 1 }],
  hardware: [{ std: ROD_END.name.split(' (')[0], qty: 2, desc: 'Rod ends (male, 10-32)' }, { std: 'AN316-3R', qty: 2, desc: 'Jam nuts' }, { std: 'AN470AD4-6', qty: 8, desc: 'End-plug rivets' }],
  hardwareNote: '2 rod ends with AN316-3R jam nuts, 8 AN470AD4 rivets; rod-end bolts in LEZ-27-100.', na: metalNA, tolerances: TOL,
  material: metal('WW-T-700/3 2024-T3 drawn tube; 4130 end plugs; UHMW-PE guides'),
  process: [{ op: 'Cut', spec: 'Cut the tube; drill and rivet the end plugs; alodine and prime inside and out.' }, { op: 'Install', spec: 'Guides bonded (flox) to the side wall at the thirds; rod in, rod ends set to the rigging length; jam nuts torqued and witness-marked.' }],
  interfaces: [
    ...icdIface(['IC3']).map((x) => ({ ...x, id: 'I1', with: 'LEZ-27-110 stick, LEZ-27-130 bellcrank', feature: 'rod' })),
    { id: 'I2', with: 'LEZ-53-165 F28 (block A)', feature: 'rod', what: 'Hole in F28 for the rod with its travel', check: () => { const p = along(L.PB, L.PA1, GEO.F28 * 12), w = fusAt(GEO.F28).w * 6 - 0.54; return { ok: p[1] + SZ.pitchRod[0] / 2 < w && p[2] < canardLow(GEO.F28 * 12, p[1]) - 0.5, detail: `crosses FS ${fx(GEO.F28 * 12, 1)} at BL ${fx(p[1])}, WL ${fx(p[2])}: hole Ø ${fx(SZ.pitchRod[0] + 0.75)} (rod ±${fx(ARM.pitchBC * Math.sin(20 * D2R))} in axial, arc ±0.05 in) — A to cut` }; } },
    { id: 'I3', with: 'Instrument-panel bulkhead (block B, FS 40.5)', feature: 'rod', what: 'Hole in the panel bulkhead', check: () => { const p = along(L.PB, L.PA1, 40.5); return { ok: p[1] > 8.4, detail: `crosses FS 40.5 at BL ${fx(p[1])}, WL ${fx(p[2])} (outboard of the panel box BL ±8.4): hole Ø ${fx(SZ.pitchRod[0] + 0.5)} — B to cut` }; } },
  ],
  tooling: { needed: false, text: 'None beyond the rigging bar (LEZ-27-100).' },
  sourcing: { blank: `2024-T3 tube ${SZ.pitchRod[0]} × ${SZ.pitchRod[1]}, 4 ft; 4130 rod 1/2 in, 3 in; UHMW block`, vendor: 'Aircraft Spruce (2024-T3 tube, rod ends, rivets)', url: 'https://www.aircraftspruce.com/menus/mp/alumtube.html', cost: 48.0, costAsOf: '2026-11-18', perAircraft: 1, lead: 'Stock', note: 'Approximate (typed from memory).' },
});

const tubeTop = () => L.T0[2] + SZ.tubeE[0] / 2;
export const TT = makePrimRec('LEZ-27-130', {
  nha: 'LEZ-27-100', title: 'Elevator torque tube, bellcrank and drive links', effectivity: 'One per aircraft',
  change: `Initial definition. The tube stopped at BL ±7.2, sat inside the canard 0.2 in above the hinge pin, and its 3.66 in bellcrank arm against the 1.5 in horn made the horn load 570 lb (ICD F7–F9). As defined the ${SZ.tubeE[0]} × ${SZ.tubeE[1]} 4130 tube runs below the canard at ${pt([L.T0[0], 0, L.T0[2]])}, out through the fuselage sides (LEZ-53-150 rev B holes) to BL ±${fx(L.tube.bl)}; a ${ARM.horn} in drive arm parallel to each horn and a 1.30 in link square to it make a parallelogram (1 : 1); the pitch bellcrank arm is ${ARM.pitchBC} in.`,
  datums: [{ id: 'A', what: 'Torque-tube axis (lateral)' }, { id: 'B', what: 'Aircraft centre line' }, { id: 'C', what: 'Drive-arm plane at BL +13.36' }],
  features: [
    { id: 'tube', kind: 'tube', label: `Tube ${SZ.tubeE[0]} × ${SZ.tubeE[1]} 4130 N, BL ±${fx(L.tube.bl)}, axis FS ${fx(L.T0[0])} WL ${fx(L.T0[2])}`, tol: 'Straight within 0.010 in' },
    { id: 'bellcrank', kind: 'plate', label: `Pitch bellcrank arm ${SZ.tBC} in 4130 at BL ${fx(L.bcBL)}, ${ARM.pitchBC} in to the AN3 hole, square to the pitch rod; welded`, tol: 'Hole +0.002 / −0, ±0.010 true position from A' },
    { id: 'drive', kind: 'plate', label: `Drive arms 2 × ${SZ.tDrive} in 4130 at BL ±${fx(L.tube.armBL)}, ${ARM.horn} in at 45° forward-down, parallel to the horns; welded`, tol: 'Arm angle ±0.25° to the horn (jig)' },
    { id: 'link', kind: 'plate', label: `Drive links 2 × 0.125 × 0.5 in 4130, 1.30 in hole to hole, horn hole ↔ drive-arm hole`, tol: 'Hole centres ±0.005' },
    { id: 'bearing', kind: 'block', label: `UHMW bearing blocks at BL ±${fx(L.tube.bearBL)} on the fuselage side walls (bonded)`, tol: 'Bore on A within 0.010' },
  ],
  checks: ['c27-torque-tube'],
  rules: [{ id: 'canard', label: 'Tube top below the canard lower surface (in)', v: canardLow(L.T0[0], 9) - tubeTop(), min: 0.25 }, { id: 'F28', label: 'Tube aft of F22 and forward of F28 (min clear, in)', v: Math.min(L.T0[0] - SZ.tubeE[0] / 2 - (GEO.F22 * 12 + 0.25), GEO.F28 * 12 - 0.25 - (L.T0[0] + SZ.tubeE[0] / 2)), min: 0.25 }],
  hardware: [{ std: 'AN3-6A', qty: 4, desc: 'Link bolts (drive arm, horn hole)' }, { std: 'AN310-3', qty: 4, desc: 'Castle nuts' }, { std: 'MS24665-132', qty: 4, desc: 'Cotter pins' }, { std: 'AN960-10', qty: 8, desc: 'Washers' }],
  hardwareNote: '4 × AN3 link bolts with AN310-3 castle nuts and cotter pins (rotating joints); the pitch-rod rod-end bolt is in LEZ-27-100.', na: metalNA, tolerances: TOL,
  material: metal('AMS 6360 4130 N tube; AMS 6350 4130 sheet arms and links; UHMW-PE bearings'),
  process: [{ op: 'Weld', spec: 'Tube in the jig with both horn-hole dummies; arms TIG-welded parallel to the horns; normalise; prime.' }, { op: 'Install', spec: 'Slide through the fuselage-side holes and bearings; links on the horns with the canard on; set elevator neutral with the rod.' }, { op: 'Inspect', spec: 'Both elevators within 1/16 in at the trailing edge with the tube clamped; ±20° without contact with the canard.' }],
  interfaces: [
    { id: 'I1', with: 'LEZ-55-192 elevator horns (rev B)', feature: 'link', what: 'Parallelogram: link = pin → tube axis, square to the horn', check: () => { const d = V.sub(L.pinE, [L.T0[0], L.pinE[1], L.T0[2]]), h = V.sub(L.hornE, L.pinE), c = (d[0] * h[0] + d[2] * h[2]) / Math.hypot(d[0], d[2]) / Math.hypot(h[0], h[2]); return { ok: Math.abs(c) < 0.01, detail: `horn hole ${pt(L.hornE)}; link ${fx(Math.hypot(d[0], d[2]))} in, cos(link, horn) ${c.toExponential(1)}` }; } },
    { id: 'I2', with: 'LEZ-55-120 canard (released)', feature: 'drive', what: 'Nothing above the canard lower surface − 0.1 in over ±20°', check: () => { let m = Infinity; for (let th = -20; th <= 20; th += 2) { const h = rot(L.hornE, L.pinE, th), d = rot(L.driveTip, [L.T0[0], 0, L.T0[2]], th); m = Math.min(m, canardLow(h[0], 13.6) - (h[2] + 0.30), canardLow(d[0], 13.3) - (d[2] + 0.30)); } m = Math.min(m, canardLow(L.T0[0], 13.5) - tubeTop()); return { ok: m >= 0.1, detail: `least clearance ${fx(m)} in (horn hole and drive tip with 0.30 in for the link eye, tube top); the horn root needs the cove-lip relief in LEZ-55-192 rev B` }; } },
    { id: 'I3', with: 'LEZ-55-192 horn load (released)', feature: 'drive', what: 'Delivered horn load ≤ the horn\'s design load', check: () => ({ ok: LINK.hornE <= CTLS.elevator.rod * 1.01, detail: `${fx(LINK.hornE, 1)} lb (pilots together, shared) vs ${fx(CTLS.elevator.rod, 1)} lb` }) },
    { id: 'I4', with: 'LEZ-53-150 fuselage shell (rev B)', feature: 'tube', what: 'Side-wall holes for the tube', check: () => { const w = fusAt(L.T0[0] / 12).w * 6; return { ok: L.tube.bl > w + 0.5, detail: `tube leaves the shell at BL ±${fx(w)}, FS ${fx(L.T0[0])}, WL ${fx(L.T0[2])}: Ø ${fx(SZ.tubeE[0] + 0.125, 3)} holes with UHMW grommets` }; } },
  ],
  tooling: { needed: true, text: 'Weld jig: tube on V-blocks, the two horn-hole dummies at the hinge-pin geometry, bellcrank arm set square to the rod line.' },
  sourcing: { blank: `4130 N tube ${SZ.tubeE[0]} × ${SZ.tubeE[1]}, 3 ft; 4130 sheet 0.125 in, 6 × 6; UHMW block`, vendor: 'Aircraft Spruce (4130 tube, sheet)', url: 'https://www.aircraftspruce.com/menus/mp/steeltubing.html', cost: 38.0, costAsOf: '2026-11-18', perAircraft: 1, lead: 'Stock', note: 'Approximate (typed from memory).' },
});

const B = SZ.bal;
export const BAL = makePrimRec('LEZ-27-135', {
  nha: 'LEZ-27-130', qty: 2, title: 'Elevator balance weights (L/R)', effectivity: 'Left and right (mirror); right shown',
  change: `Initial definition. The weights sat inside the canard foam 0.82 in ahead of the hinge, giving 0.90 lb·in against ≈ 2.64 needed (ICD F16). As defined each is a ${fx(B.mw, 2)} lb lead slug on two 4130 arms clamped to the torque tube, ${ARM.wElev} in forward of its axis inside the fuselage (BL ${L.wBL[0]}–${L.wBL[1]}), for ${fx(B.mw * ARM.wElev, 2)} lb·in against the painted elevator's ${fx(B.M, 2)} lb·in; trimmed at the balance check.`,
  datums: [{ id: 'A', what: 'Torque-tube axis' }, { id: 'B', what: 'Slug axis, 3.0 in forward of A' }],
  features: [
    { id: 'slug', kind: 'weight', label: `Lead slug Ø ${fx(solidOf('LEZ-27-135').slugD, 3)} × ${fx(L.wBL[1] - L.wBL[0] - 0.38, 2)} in, ${fx(B.mw, 3)} lb, AN3 through-bolt`, tol: 'Trim by drilling to balance' },
    { id: 'arm', kind: 'plate', label: `Arms 2 × 0.19 × 0.75 in 4130, clamped on the tube (split bore, AN3 pinch bolt)`, tol: 'Arm angle ±1°' },
    { id: 'bolt', kind: 'pin', label: 'AN3 through-bolt and pinch bolts', tol: '—' },
  ],
  checks: ['c27-balance'], rules: [{ id: 'bal', label: 'Weight moment / elevator moment (both about their axes, 1 : 1)', v: B.mw * ARM.wElev / B.M, min: 1 }],
  hardware: [{ std: 'AN3-30A', qty: 1, desc: 'Slug through-bolt' }, { std: 'AN3-7A', qty: 2, desc: 'Arm pinch bolts' }, { std: 'MS21042L3', qty: 3, desc: 'Nuts' }, { std: 'AN960-10', qty: 6, desc: 'Washers' }],
  hardwareNote: 'AN3 slug bolt and two AN3 pinch bolts with MS21042L3 nuts; torque 20–25 in-lb; safety-wire the pinch bolts.', na: { cut: 'Cast and turned: no flat pattern', layup: 'Metal parts' }, tolerances: TOL,
  material: { spec: 'Lead (chemical, cast); arms AMS 6350 4130 sheet', alt: 'Tungsten alloy slug of the same moment', form: 'cast slug, sheet', density: null, allowables: [['4130 N F_ty', '75 ksi', MAT['4130'].spec], ['Lead', '0.41 lb/in³', MAT.lead.spec]] },
  process: [{ op: 'Cast', spec: 'Cast the slug oversize in a steel tube mould; turn; drill for the AN3.' }, { op: 'Balance', spec: 'Painted elevators, horns and links fitted; tube free; drill lead from the slug until the elevator TE does not drop from level (static balance per side).' }],
  interfaces: [
    { id: 'I1', with: 'LEZ-55-192 elevator (released)', feature: 'slug', what: 'Static balance about the pin from the released sections; section mass agrees with the released record', check: () => balanceCheck(ELV.def.mass.each) },
    { id: 'I2', with: 'LEZ-53-160 F22, LEZ-55-120 canard', feature: 'slug', what: 'Slug clear of F22 and below the canard', check: () => { const r = solidOf('LEZ-27-135').slugD / 2, f = L.wE[0] - r - (GEO.F22 * 12 + 0.25), c = canardLow(L.wE[0], L.wBL[1]) - (L.wE[2] + r); return { ok: f >= 0.25 && c >= 0.1, detail: `${fx(f)} in aft of F22's aft face, ${fx(c)} in below the canard` }; } },
  ],
  tooling: { needed: true, text: 'Slug mould (steel tube, end plugs); knife-edge balance stand for the elevator.' },
  sourcing: { blank: `Lead ${fx(B.mw * 1.2, 1)} lb; 4130 sheet 0.19 in, 4 × 4`, vendor: 'Rotometals (lead ingot); Aircraft Spruce (4130 sheet)', url: 'https://www.rotometals.com/', cost: 12.0, costAsOf: '2026-11-18', perAircraft: 2, lead: 'Stock', note: 'Approximate (typed from memory).' },
});
void near;
