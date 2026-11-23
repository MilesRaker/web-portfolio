// LEZ-32-312 brake line, right one drawn (left the mirror): 3/16 × .028 5052-O tube in the cabin along the lower side
// corner, a bulkhead fitting through the belly outboard of the gear angles, -3 hose clamped down the bow's aft face to the
// caliper. Solid: each run a hollow cylinder plus its fluid (cad/d_prims.py). Notional.
import { LINE, LINE_P, LINE_RHO, BRK } from '../parts/wpD2_brakes.js';
import { GM, YM, BOW, SCHED, wAt, legAt } from '../parts/wpD1_gear.js';
import { S0, YC } from '../parts/wpD1_gear.js';
import { TYRE } from '../parts/wp10_induction_gear.js';
import { partByPN } from '../systems.js';
import { primVolumes, primMass } from './d_prims.js';
import { BRAKE_P, SHIELD_P, STACK, EXIT } from '../parts/wpD2_brakes.js';
import { FAIR, LEGPAD } from '../parts/wpD1_gear.js';
import { openItem, boxDist, cylBLDist } from './d_icd.js';
import { RBG } from '../parts/wpA2_rearbhd.js';
import { HOSE_NOTCH } from '../parts/wpD2_brakes.js';
import { BRK_UNION } from './fuselage.js';
import { DEFS as _DEFS } from './release.js';
const ZAXL = 0.54 * 12;
/** clearance (in) from the line's centre to the brake stack and the leg end, every segment but the last (which ends on the caliper port) */
function stackClear() {
  const boxes = [...BRAKE_P.prims.filter((q) => q.t === 'box').map((q) => ({ g: q.g, c: q.c, d: q.d })), ...SHIELD_P.prims.map((q) => ({ g: 'shield', c: q.c, d: q.d })),
    { g: 'leg-end pad', c: [BOW.legFace - LEGPAD.fMax / 2, S0, (LEGPAD.z0 + LEGPAD.z1) / 2], d: [LEGPAD.fMax, LEGPAD.w, LEGPAD.z1 - LEGPAD.z0] }];
  const P = LINE.pts.map(([fs, bl, wl]) => [bl, fs, wl]); let w = { c: 1e9 };
  for (let i = 1; i < P.length; i++) for (let k = 0; k <= 40; k++) { const L = Math.hypot(...P[i].map((v, j) => v - P[i - 1][j])), last = i === P.length - 1, t = k / 40 * (last ? Math.max(0, 1 - 0.5 / L) : 1), p = P[i - 1].map((v, j) => v + (P[i][j] - v) * t), r = (i >= LINE.iHose + 1 ? LINE.hose.od : LINE.tube.od) / 2;
    for (const b of boxes) { if (last && b.g === 'caliper') continue; const c = boxDist(p, b) - r; if (c < w.c) w = { c, g: b.g, p }; }
    const c = cylBLDist(p, STACK.disc0, STACK.disc1, S0, ZAXL, STACK.discR) - r; if (c < w.c) w = { c, g: 'disc', p }; }
  return w;
}
/** where the line crosses an FS plane (in), or null */
const crossAt = (fs) => { for (let i = 1; i < LINE.pts.length; i++) { const a = LINE.pts[i - 1], b = LINE.pts[i]; if ((a[0] - fs) * (b[0] - fs) < 0) { const t = (fs - a[0]) / (b[0] - a[0]); return [a[1] + t * (b[1] - a[1]), a[2] + t * (b[2] - a[2])]; } } return null; };

const fx = (x, n = 2) => x.toFixed(n), V = primVolumes(LINE_P), seg = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));
const Lt = LINE.pts.slice(0, LINE.iHose + 1).reduce((a, p, i, A) => a + (i ? seg(p, A[i - 1]) : 0), 0), Lh = LINE.pts.slice(LINE.iHose).reduce((a, p, i, A) => a + (i ? seg(p, A[i - 1]) : 0), 0);
const legPts = LINE.pts.slice(LINE.iHose + 1, -2);
export const LIN_DEF = {
  pn: 'LEZ-32-312', rev: 'B', status: 'released', nha: 'LEZ-32-310', qty: 2, kind: 'line',
  title: 'Brake line',
  revs: [{ rev: 'A', date: '2026-11-18', short: 'Initial definition', change: `Initial definition. The old route ran through both seat pans, inside the bow laminate and through the tyre. As defined the tube runs along the cabin's lower side corner 3.2 in above the bottom, leaves through a bulkhead fitting in the belly at FS ${fx(LINE.pts[LINE.iHose - 1][0])}, BL ${fx(LINE.pts[LINE.iHose - 1][1])} (outboard of the gear angles, under the fairing), and the -3 hose runs down the bow's aft face to the caliper inlet from above.` }, { rev: 'B', date: '2026-11-19', short: 'Start follows the cylinder', change: 'The tube starts at the master cylinder outlet, which LEZ-32-311 rev C moved 0.50 in forward (ICD J-R3, block J). The first leg to the side wall is 0.50 in longer; the rest of the route is unchanged.' }],
  effectivity: 'Left and right (the left is the mirror)', params: LINE_P,
  datums: [{ id: 'A', what: 'Master-cylinder outlet' }, { id: 'B', what: 'Caliper inlet' }],
  features: [
    { id: 'tube', kind: 'tube', label: `3/16 × .028 5052-O tube, ${fx(Lt, 1)} in developed, flared 37° (AN818-3D / AN819-3D), bends R ≥ 3/4 in`, tol: 'Bend positions ±1/4 in' },
    { id: 'hose', kind: 'tube', label: `-3 hose (MIL-H-8794-3 class, typed from memory), ${fx(Lh, 1)} in, P-clamped every 6 in to the bow's aft face`, tol: 'Clamps clear of the drops' },
    { id: 'fluid', kind: 'profile', label: 'MIL-PRF-5606 fill', tol: '—' },
  ],
  tolerances: { general: 'Route ±1/4 in to the defined points', holes: '—', breakEdges: '—' },
  drawingNotes: ['Route points in the record (FS, BL, WL); left side mirror.', 'Grommet through the rear-seat bulkhead (block A) and the bulkhead fitting in the belly (this record).'], generalNote: 'Pressure test at 1.5 × the maximum line pressure; no leaks.',
  na: { cut: 'Tube cut to the developed length: no flat pattern', layup: 'Not a composite part' },
  material: { spec: '5052-O aluminium tube 3/16 × .028 (WW-T-700/4); -3 hose MIL-H-8794 class with swivel ends; MIL-PRF-5606', alt: 'Nylon brake tube in the cabin', form: 'tube and hose', density: null,
    allowables: [['5052-O F_tu', '28 ksi', 'MMPDS-typical'], ['-3 hose rated working pressure', `${BRK.hoseWork} psi`, 'VENDOR (typed from memory)']] },
  process: [{ op: 'Form', spec: 'Bend the tube on the aircraft to the route points; flare; fit the bulkhead fitting in the belly and the grommet at the seat bulkhead.' }, { op: 'Install', spec: 'Hose from the belly fitting down the aft face, P-clamps on bonded nutplates every 6 in; bleed; pressure test.' }],
  checks: ['brk-line'],
  rules: [{ id: 'bow', label: 'Hose clear of the bow\'s aft face (in)', v: Math.min(...legPts.map((p) => { const u = (() => { let best = 0, d = 1e9; for (let i = 0; i <= 100; i++) { const q = legAt(i / 100).p, dd = Math.hypot(q[0] - p[1], q[1] - p[2]); if (dd < d) { d = dd; best = i / 100; } } return best; })(); return p[0] - (S0 + wAt(u) / 2 + SCHED.nX * 0.01) - LINE.hose.od / 2; })), min: 0.05 },
    { id: 'tyre', label: 'Line ≥ 0.5 in from the grown tyre', v: Math.min(...LINE.pts.map((p) => (p[1] > YC - 10 ? (YC - TYRE.width / 2 * 1.034) - p[1] - LINE.hose.od / 2 : 9))), min: 0.5 },
    { id: 'gm', label: 'Belly exit ≥ 0.5 in outboard of the gear angles', v: Math.min(LINE.pts[LINE.iHose - 1][1] - (GM.P[0] + Math.abs(GM.a[0]) * GM.b / 2), LINE.pts[LINE.iHose - 1][0] - (S0 + GM.Lt / 2 + GM.Lf)), min: 0.5 }],
  mass: { each: primMass(V, LINE_RHO), from: 'tube and hose wall volumes × density (hose 0.10 lb/ft, typed from memory) plus the fluid' },
  hardware: [{ std: 'AN818-3D', qty: 2, desc: 'B-nuts' }, { std: 'AN819-3D', qty: 2, desc: 'sleeves' }, { std: 'AN832-3D', qty: 1, desc: 'bulkhead union through the belly' }, { std: 'MS21919WDG3', qty: 12, desc: 'P-clamps (cabin and leg)' }],
  hardwareNote: 'AN818-3D / AN819-3D flares at the MC and the bulkhead union; -3 hose swivel at the caliper; P-clamps every 12 in in the cabin, 6 in on the leg.',
  interfaces: [
    { id: 'I1', with: 'LEZ-32-311 / LEZ-32-310 ports', feature: 'tube', what: 'Ends on the ports', check: () => { const r = partByPN('LEZ-32-312').geo[1].pts, a = partByPN('LEZ-32-311').ports['OUT-R'].at, b = partByPN('LEZ-32-310').ports['IN-R'].at, d = (p, q) => Math.hypot(...p.map((v, i) => v - q[i])) * 12; return { ok: d(r[0], a) < 0.05 && d(r.at(-1), b) < 0.1, detail: `${fx(d(r[0], a))} / ${fx(d(r.at(-1), b))} in` }; } },
    { id: 'I2', with: 'LEZ-32-170 bow', feature: 'hose', what: 'Down the aft face, outside the laminate', check: () => ({ ok: legPts.every((p) => p[0] > S0 + BOW.w1 / 2), detail: `hose FS ${fx(Math.min(...legPts.map((p) => p[0])))}+` }) },
    { id: 'I3', with: 'Seats (block B) and the seat bulkhead (block A)', feature: 'tube', what: 'Along the side corner, outboard of the seat pans', check: () => { const c = LINE.pts.slice(2, LINE.iHose - 1), m = Math.min(...c.map((p) => p[1])); return { ok: m > 10.0, detail: `cabin run at BL ≥ ${fx(m)} (seat pans ±9.9, GLB), WL ${fx(c[0][2])}–${fx(c.at(-1)[2])}; seat-bulkhead grommet for A` }; } },
    { id: 'I4', with: 'LEZ-32-310 brake stack, LEZ-32-315 shield, LEZ-32-170 leg end', feature: 'hose', what: 'Hose ≥ 0.1 in clear of the leg end, shield, flange, torque plate, disc and caliper (the last 0.5 in is the end fitting on the caliper port)', check: () => { const w = stackClear(); return { ok: w.c >= 0.1, detail: `${fx(w.c)} in from the ${w.g} at BL ${fx(w.p[0])}, FS ${fx(w.p[1])}, WL ${fx(w.p[2])}` }; } },
    { id: 'O1', with: 'LEZ-53-175 rear-seat bulkhead (block A, rev B)', feature: 'tube', what: 'Where the tube crosses FS 130.2 it lies in one of A\'s foot slots (or a pass hole) by ≥ its radius + 1/16 in (grommet strip)', check: () => { const c = crossAt(104.7), r = LINE.tube.od / 2 + 1 / 16; if (!c) return { ok: false, detail: 'no crossing' }; const u = c[0], v = c[1], sl = (RBG.slots || []).find((s) => u - r >= s.R[0] && u + r <= s.R[1] && v - r >= s.R[2] && v + r <= s.R[3]), h = (RBG.pass || []).find((q) => Math.hypot(q.u - u, q.v - v) + r <= q.r);
      return { ok: !!(sl || h), detail: `tube crosses at BL ${fx(u)}, WL ${fx(v)}: ${sl ? `in A's foot slot BL ${fx(sl.R[0])}…${fx(sl.R[1])}, WL ${fx(sl.R[2])}–${fx(sl.R[3])}` : h ? `in A's hole r ${fx(h.r)}` : 'NOT in a slot or hole'}` }; } },
    { id: 'O2', with: 'LEZ-53-150 shell rev H (block A): AN832-3D union hole and potting', feature: 'tube', what: 'A\'s union hole and potting at the line\'s exit (shell I9)', check: () => { const f = _DEFS['LEZ-53-150']?.def?.interfaces.find((q) => q.id === 'I9'), r = f ? f.check() : { ok: false, detail: 'no shell I9' }; return { ok: r.ok && Math.abs(BRK_UNION.s - EXIT.s) < 1e-6 && Math.abs(BRK_UNION.y - EXIT.y) < 1e-6, detail: `union FS ${fx(BRK_UNION.s)}, BL ±${fx(BRK_UNION.y)}, Ø ${BRK_UNION.hole}, potting Ø ${BRK_UNION.pot}; shell I9: ${r.detail}` }; } },
    { id: 'O3', with: 'LEZ-32-120 rev B fairing half (block D)', feature: 'hose', what: 'The -3 hose leaves the fairing half through its edge notch (≥ 0.06 in round the hose)', check: () => { const n = HOSE_NOTCH; if (!n) return { ok: false, detail: 'no crossing of the fairing face' }; const y = Math.abs(n.at[1]), inF = n.at[0] >= n.fs[0] && n.at[0] <= n.fs[1] && y <= n.edge; return { ok: inF && n.w >= LINE.hose.od + 0.12 - 1e-9 && n.edge - y >= 0 && y - LINE.hose.od / 2 - 0.06 >= n.edge - 1.0, detail: `hose crosses the fairing's lower face at FS ${fx(n.at[0])}, BL ±${fx(y)} (${fx(n.edge - y)} in inside its edge): notch ${fx(n.w)} wide, open to the edge` }; } },
  ],
  tooling: { needed: false, text: 'Tube bender and 37° flaring tool.' },
  sourcing: { blank: `${fx(Lt / 12 * 1.2, 1)} ft 3/16 × .028 5052-O; ${fx(Lh / 12 * 1.1, 1)} ft -3 hose with ends`, vendor: 'Aircraft Spruce (5052-O tube, AN fittings, -3 hose assemblies)', url: 'https://www.aircraftspruce.com/menus/ha/aluminumtube.html', cost: 85.0, costAsOf: '2026-11-18', perAircraft: 2, lead: 'Stock; hose made to length', note: 'Approximate, per side. -3 hose: Aeroquip 303-3 bulk $14.85/ft, ends extra (Aircraft Spruce, accessed 2026-11-19).' },
};
void YM;
