// LEZ-71-222 upper engine-mount pick-up fitting and backing plate: the definition record (numbers from wp23). Notional.
import { GEO, DEFAULT_DESIGN, analyse } from '../structures.js';
import { UPK } from '../parts/wp23_upk.js';
import { MOUNT } from '../parts/wp1_powerplant.js';
import { UPK_STAND, UPK_SHIFT } from '../parts/wp22_mount.js';
import { insideFus } from '../systems.js';
import { r4, want } from './util.js';
import { pickAN } from '../parts/wp16_wing_attach.js';

const fx = (x, n = 3) => x.toFixed(n), RHO = { st: 0.283, al: 0.098 };
const TFW_MAX = 0.25;   // the firewall hard point the fitting is drawn on and the bolts are gripped for (in); the sized laminate must not exceed it
const tfw = () => TFW_MAX;
export const upkParams = () => ({ B: UPK.B, tb: UPK.tb, te: UPK.te, w: UPK.w, h: r4(UPK.h), e: r4(UPK.e), gap: UPK.gap, D: UPK.D, p: UPK.p, db: UPK.db, Bk: UPK.Bk, tk: UPK.tk, tfw: tfw() });
export function upkExpect(p, m) {
  const v = m.volumes || {}, earA = p.w * (p.h + p.e) - Math.PI * (p.D / 2) ** 2, hole = Math.PI * (p.db / 2) ** 2;
  const fV = 2 * (p.w * (p.h + p.e + 0.01) - Math.PI * (p.D / 2) ** 2) * p.te + (p.B * p.B - 4 * hole) * p.tb - 2 * p.w * 0.01 * p.te, bV = (p.Bk * p.Bk - 4 * hole) * p.tk;
  void earA;
  return [want('Base plate (square)', p.B, m.bbox[1] - m.bbox[0] >= p.B - 1e-6 ? p.B : NaN, 0.002), want('Bolt axis aft of the firewall', p.tb + p.h, m.holes.find((q) => q.feat === 'pin')?.y ?? NaN, 0.002),
    want('Fitting volume (in³)', fV, v.fitting ?? NaN, 0.002), want('Backing plate volume (in³)', bV, v.back ?? NaN, 0.002), want('Ear tip aft of the firewall', p.tb + p.h + p.e, m.bbox[3], 0.002)];
}
const P = upkParams();
/** rev C: base-bolt grip from the stack (rev A/B called AN3-5A, 0.297 in grip, short of the stack at any firewall thickness) */
export const BASE_STACK = UPK.tb + TFW_MAX + UPK.tk + 0.063, BASE_AN = pickAN(UPK.nb, BASE_STACK);
/** least inset (in) of the plates' corners from the OML at the firewall, both sides */
export function plateInset() {
  const s = GEO.firewall + 1e-4, ins = (y, z) => { let lo = 0, hi = 0.25; if (!insideFus(s, y, z, 0)) return -1; for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; if (insideFus(s, y, z, m)) lo = m; else hi = m; } return lo * 12; };
  const at = (h) => Math.min(...['FTL', 'FTR'].flatMap((n) => { const q = MOUNT.nodes[n]; return [[1, 1], [1, -1], [-1, 1], [-1, -1]].map(([a, b]) => ins(q[1] + a * h / 12, q[2] + b * h / 12)); }));
  return { base: at(P.B / 2), back: at(P.Bk / 2) };
}
export const UPK_DEF = {
  pn: 'LEZ-71-222', rev: 'C', status: 'released', nha: 'LEZ-71-220', qty: 2,
  title: 'Upper engine-mount pick-up and backing plate',
  revs: [{ rev: 'A', date: '2026-11-17', short: 'Initial definition', change: `Initial definition. The fitting was a 0.090 in clevis checked only in bearing, with an assumed mass, and the mount's upper nodes sat 0.36 in off the firewall, too close for a bolt through a bushing. As defined the bolt axis stands ${UPK_STAND} in aft of the firewall (the mount's upper nodes moved with it), the ears are ${UPK.te} in 4130 N (sized by bending under the lateral reaction), the base ${UPK.tb} in with 4 × AN${UPK.nb} through the hard point into a ${UPK.tk} in 6061-T6 backing plate.` },
    { rev: 'B', date: '2026-11-18', short: 'Moved inboard and down, inside the firewall outline', change: `The base and backing plates, centred on the pick-up, stood outside the fuselage contour at their outboard-top corners (0.49 / 0.81 in outside the OML at the firewall; ICD G-F2), and a chamfer cannot take enough off without cutting through the outboard-top bolt. The fitting moves 0.5 in inboard and 1.5 in down with the mount's upper nodes (LEZ-71-220 rev B): every corner of the base is now ≥ 0.6 in inside the OML (clear of the cowl hinge-flange band) and every corner of the backing plate ≥ 0.415 in + 1/4 in inside it (inside the shell's inner face). Re-sized at the new reactions: same sheet gauges and AN${UPK.nb} bolts.` },
    { rev: 'C', date: '2026-11-18', short: 'Moved further inboard, less far down (clear of the CS spar top)', change: `Firewall integration (block A ICD): at rev B the 2.75 in backing plate on the cabin side ran 0.43 in into the CS spar's top (WL 40.09 against 40.52) and the lower base bolts stood 0.19 in above it, with no room for the nut, the washer or the firewall panel's edge bond. With the mount's upper nodes (LEZ-71-220 rev C) the fitting now sits ${UPK_SHIFT.inboard} in inboard and ${UPK_SHIFT.down} in down from the original position: the plate's lower edge is 0.06 in above the spar top, the base corners ${fx(plateInset().base)} in and the backing-plate corners ${fx(plateInset().back)} in inside the OML. Same plates and gauges; hardware AN3-10A for the 0.60 in stack through the firewall hard point.` }],
  effectivity: 'Left and right (mirror images)', params: P,
  datums: [{ id: 'A', what: 'Base face on the firewall\'s aft face' }, { id: 'B', what: 'Pick-up bolt axis (lateral)' }, { id: 'C', what: 'Fitting centre plane between the ears' }],
  features: [
    { id: 'base', kind: 'plate', label: `Base ${P.B} × ${P.B} × ${P.tb} in, 4 × Ø ${fx(P.db + 0.006)} on a ${P.p} in square for AN${UPK.nb} bolts`, tol: 'Holes ±0.005 true position to the backing plate (match-drilled)' },
    { id: 'ears', kind: 'lug', label: `Two ears ${P.te} × ${P.w} in, ${P.gap} in apart, bolt Ø ${fx(P.D)} at ${fx(P.tb + P.h)} in from A, ${fx(P.e)} in to the tip; welded to the base, full fillet`, tol: 'Bore +0.002 / −0.000 after welding' },
    { id: 'back', kind: 'plate', label: `Backing plate ${P.Bk} × ${P.Bk} × ${P.tk} in 6061-T6 on the cabin side, holes matched to the base`, tol: 'Match-drilled through the firewall' },
  ],
  tolerances: { general: '.XX ±0.03 · .XXX ±0.010', holes: 'Base holes match-drilled through the firewall and backing plate; ear bore reamed after welding', breakEdges: '0.010–0.030' },
  drawingNotes: ['Right fitting shown; left opposite.', 'Fire-proof sealant under the base.'], generalNote: 'Fitting: weld, normalise, cadmium or primer; backing plate: conversion-coated and primed.',
  na: { cut: 'Plate and sheet cut to the outline: no flat pattern needed', layup: 'Metal parts' },
  material: { spec: 'Fitting: AMS 6350 4130 N sheet; backing plate: AMS-QQ-A-250/11 6061-T6', alt: 'AMS 6345 4130 sheet', form: `${P.te} and ${P.tb} in sheet; ${P.tk} in plate`, density: null,
    allowables: [['4130 N F_tu / F_ty / F_su / F_bru (e/D 2.0)', '95 / 75 / 57 / 190 ksi', 'MIL-HDBK-5J table 2.3.1.0(c1), S-basis; F_bru 200 at t ≤ 0.188, 190 at t > 0.188 (KasperCalc transcription, accessed 2026-11-19)'], ['6061-T6 F_ty', '35 ksi', 'MMPDS']] },
  process: [{ op: 'Machine', spec: 'Cut the base and ears; drill the ear bores undersize; weld the ears to the base in a fixture.' }, { op: 'Finish', spec: 'Normalise; ream the bore; prime.' }, { op: 'Install', spec: `Match-drill through the firewall hard point and the backing plate; 4 × AN${UPK.nb} with MS21042L${UPK.nb} nuts on the cabin side; fire-proof sealant.` }],
  checks: ['upk-lug', 'upk-pin', 'upk-ear', 'upk-base', 'upk-back'],
  rules: [{ id: 'eD', label: 'Ear end distance e/D ≥ 2', v: P.e / P.D, min: 2 }, { id: 'edge', label: 'Base bolt edge distance ≥ 2D', v: (P.B - P.p) / 2 / P.db, min: 2 }, { id: 'gap', label: 'Ear gap fits the 5/8 in bushing with 0.03 in a side', v: (P.gap - 0.625) / 0.06, min: 1 }],
  mass: { each: UPK.mass, from: 'solid volumes: fitting × 0.283, backing plate × 0.098 lb/in³' },
  hardware: [{ std: BASE_AN.std, qty: 4, desc: `Base bolts through the firewall (stack ${fx(BASE_STACK)} in: base, firewall hard point at the drawn grip, backing plate, AN960; grip ${fx(BASE_AN.grip)})` }, { std: `MS21042L${UPK.nb}`, qty: 4, desc: 'Nuts, cabin side' }, { std: 'AN6-13A', qty: 1, desc: 'Pick-up bolt through the ears and the mount bushing' }, { std: 'MS21042L6', qty: 1, desc: 'Pick-up bolt nut' }],
  hardwareNote: `4 × AN${UPK.nb} base bolts with MS21042L${UPK.nb} nuts and AN960 washers; AN6 pick-up bolt in double shear with an MS21042L6 nut; torque per AC 43.13-1B table 7-1.`,
  interfaces: [
    { id: 'I1', with: 'LEZ-71-220 mount (upper nodes) and LEZ-71-224 bushing', feature: 'ears', what: 'Bolt axis at the mount node', check: () => { const d = (MOUNT.nodes.FTL[0] - GEO.firewall) * 12; return { ok: Math.abs(d - (P.tb + P.h)) < 1e-6, detail: `node ${fx(d)} in aft of the firewall, bolt at ${fx(P.tb + P.h)} in` }; } },
    { id: 'I3', with: 'Firewall outline / cowl hinge flange (LEZ-53-150, LEZ-71-120)', feature: 'base', what: 'Base corners ≥ 0.6 in, backing-plate corners ≥ 0.665 in inside the OML at the firewall (rev B)', check: () => { const c = plateInset(); return { ok: c.base >= 0.6 && c.back >= 0.665, detail: `base ${fx(c.base)} in, backing plate ${fx(c.back)} in inside the OML` }; } },
    { id: 'I2', with: 'Firewall hard point (LEZ-53-150)', feature: 'base', what: 'The sized hard-point laminate fits the drawn grip', check: () => { const t = analyse(DEFAULT_DESIGN, false).Z.fwPlies * 0.01; return { ok: t <= TFW_MAX + 1e-9, detail: `hard point ${fx(t)} in (sized), drawn and gripped for ${fx(TFW_MAX)} in` }; } },
  ],
  tooling: { needed: true, text: 'Weld fixture holding the ears square and parallel; the mount jig\'s firewall plate as the drilling template.' },
  sourcing: { blank: `4130 N sheet ${P.te} and ${P.tb} in, 3 × 6 in; 6061-T6 plate ${P.tk} in, 3 × 3 in`, vendor: 'Aircraft Spruce (4130 sheet, 6061-T6 sheet)', url: 'https://www.aircraftspruce.com/menus/mp/steelsheet.html', cost: 18.0, costAsOf: '2026-11-17', perAircraft: 2, lead: 'Stock', note: 'Approximate small-piece prices.' },
};
void RHO;

// memory-audit integration (2026-11-19): this record's new revision
import { memRev } from './revs_memaudit.js';
memRev(UPK_DEF);
