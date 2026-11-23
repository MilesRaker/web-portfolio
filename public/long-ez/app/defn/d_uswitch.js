// LEZ-32-216 position microswitch with its mounting bracket (bought-in switch), drawn in its own frame (x along the switch,
// y through it, z up from the bracket base) and placed at the three switch positions (S11–S13). Notional; switch sizes typed
// from memory (sealed basic switch, 27.8 × 10.3 × 15.9 mm, mounting holes 22.2 mm apart).
import { SW_P, SW_LB, SW_AT, SW_FRAME } from '../parts/wpD2_brakes.js';
import { QD } from '../parts/wpH1_layout.js';
const fx2 = (x) => Number(x).toFixed(2);
import { EQUIP, WIRES, partByPN } from '../systems.js';
import { openItem } from './d_icd.js';
import { primVolumes, primMass, rhoFrom } from './d_prims.js';

export const SWT_RHO = rhoFrom(SW_P, SW_LB);
export const SWT_DEF = {
  pn: 'LEZ-32-216', rev: 'B', status: 'released', nha: 'LEZ-31-150', qty: 3, kind: 'cots',
  title: 'Gear, throttle and canopy microswitch',
  revs: [{ rev: 'A', date: '2026-11-18', short: 'Initial definition', change: 'Initial definition: one sealed basic switch with a lever, on a 0.040 in 6061-T6 angle bracket, three per aircraft (S11 throttle closed, S12 nose gear not down, S13 canopy pin). Contact sense: each input to the warning unit is grounded in the alarm state (S11 C–NO made at idle; S12 C–NC made with the gear not down; S13 C–NC made with the pin out).' }, { rev: 'B', date: '2026-11-19', short: 'S11 frame on the quadrant; contact sense closed', change: 'Final integration: the S11 axis mapping (block H\'s open item, ICD h_engsys §7.5): the switch\'s own frame onto LEZ-76-100\'s mounting face (x along FS, y along BL, z up), with I6 checking the bracket footprint on the face, the base holes on H\'s 0.90 in nutplate pair, the actuator under the cam centre and its plunger across the cam plate. O1 (contact sense) is now the real check I5 (block I wired S12 / S13 on NC). No change to the solid.' }],
  effectivity: 'Three per aircraft: S11, S12, S13', params: SW_P,
  datums: [{ id: 'A', what: 'Bracket base face (on the host)' }, { id: 'B', what: 'Switch mounting-hole line' }],
  features: [
    { id: 'switch', kind: 'profile', label: 'Sealed basic switch 1.09 × 0.40 × 0.63 in with lever; 2 × Ø0.12 mounting holes 0.875 apart; screw terminals C / NO / NC (typed from memory)', tol: 'Vendor' },
    { id: 'bracket', kind: 'plate', label: '0.040 6061-T6 angle 1.30 × 0.44 × 0.80 in; 2 × Ø0.12 for the switch, 2 × Ø0.145 for #6 screws to the host', tol: 'Holes ±0.010' },
  ],
  tolerances: { general: '.XX ±0.03', holes: '±0.010', breakEdges: 'Deburr' },
  drawingNotes: ['Rig each switch on its host so it changes over within the first 1/32 in of actuator travel.'], generalNote: 'Bracket alodined.', na: { cut: 'Bracket: small bent angle, flat 1.30 × 1.24', layup: 'Not a composite part' },
  material: { spec: 'Switch: sealed basic switch Honeywell V15W class, IP67, 33 × 10.3 × 15.9 mm (Honeywell comparison sheet, accessed 2026-11-19; MS27716 is a toggle-switch spec, not a basic switch); bracket AMS-QQ-A-250/11 6061-T6 0.040', alt: 'Any sealed V3-size switch with the same holes', form: 'bought; bracket bent from sheet', density: null, allowables: [['Contact rating', '≥ 1 A at 28 VDC (warning-unit input, milliamps)', 'VENDOR (typed from memory)']] },
  process: [{ op: 'Install', spec: '2 × #4 screws switch to bracket; 2 × #6 screws bracket to the host part; rig; wire C and the stated contact.' }],
  checks: [],
  rules: [{ id: 'edge', label: 'Bracket hole edge distance ≥ 2D', v: (0.65 - 0.45) / 0.0725 / 2, min: 1 }],
  mass: { each: primMass(primVolumes(SW_P), SWT_RHO), from: 'envelope volumes × effective densities from the switch weight (typed from memory) and the bracket' },
  hardware: [{ std: 'MS51957-15', qty: 2, desc: '#4 screws, switch to bracket' }, { std: 'MS21042L04', qty: 2, desc: 'nuts' }, { std: 'MS51957-28', qty: 2, desc: '#6 screws to the host' }],
  hardwareNote: 'Per switch: 2 × #4 screws and nuts, 2 × #6 screws into the host (nutplates or nuts per the host).',
  interfaces: [...SW_AT.map((s, i) => ({ id: `I${i + 1}`, with: `${s.ref} ${s.what}: ${s.host}`, feature: 'bracket', what: 'Placed at the wiring position', check: () => { const e = EQUIP.find((q) => q.ref === s.ref); const d = e ? Math.hypot(...e.at.map((v, k) => v - s.at[k])) * 12 : NaN; return { ok: e && d < 0.01, detail: e ? `${s.ref} at FS ${(s.at[0] * 12).toFixed(1)}, BL ${(s.at[1] * 12).toFixed(1)}, WL ${(s.at[2] * 12).toFixed(1)}` : 'no equipment record' }; } })), { id: 'I4', with: 'Harnesses LEZ-24-161 / LEZ-23-125 (block I)', feature: 'switch', what: 'Each switch within 4 in of the harness that carries its wires (pigtail length)', check: () => { const segd = (p, A, B) => { const ab = B.map((x, i) => x - A[i]), L2 = ab.reduce((a, x) => a + x * x, 0), t = Math.max(0, Math.min(1, ab.reduce((a, x, i) => a + x * (p[i] - A[i]), 0) / (L2 || 1))); return Math.hypot(...p.map((x, i) => x - (A[i] + ab[i] * t))); };
    const r = SW_AT.map((sw) => { const w = WIRES.find((x) => [x.from, x.to].some((e) => e.startsWith(`${sw.ref}:`))), H = w && partByPN(w.harness); let d = Infinity; if (H) for (const g of H.geo) for (let i = 1; i < (g.pts || []).length; i++) d = Math.min(d, segd(sw.at, g.pts[i - 1], g.pts[i])); return { ref: sw.ref, h: w && w.harness, d: d * 12 }; });
    return { ok: r.every((x) => x.d <= 4), detail: r.map((x) => `${x.ref} ${x.d.toFixed(2)} in from ${x.h}`).join('; ') }; } }, { id: 'I5', with: 'Wiring LEZ-24-161 / LEZ-23-125 and the S11–S13 pin maps (block I, J)', feature: 'switch', what: 'Contact sense: S11 C–NO made at idle, S12 C–NC made with the gear not down, S13 C–NC made with the pin out; each signal wire on the declared contact, each common to GB1', check: () => { const sense = { S11: 'NO', S12: 'NC', S13: 'NC' }, rows = Object.entries(sense).map(([r, c]) => { const sig = WIRES.find((x) => [x.from, x.to].some((e) => e.startsWith(`${r}:T:N`))), com = WIRES.find((x) => [x.from, x.to].some((e) => e === `${r}:T:C`)); return { r, c, ok: !!sig && [sig.from, sig.to].includes(`${r}:T:${c}`) && !!com && [com.from, com.to].some((e) => /^GB1:/.test(e)), sig: sig?.id, com: com?.id }; });
    return { ok: rows.every((q) => q.ok), detail: rows.map((q) => `${q.r} ${q.sig} on ${q.c}, ${q.com} to GB1${q.ok ? '' : ' ✗'}`).join('; ') }; } },
  { id: 'I6', with: 'LEZ-76-100 rev B throttle quadrant: S11 mounting face, nutplates and idle cam (block H)', feature: 'bracket', what: `S11's own frame on the quadrant (frame x → FS aft, y → BL, z → WL up: SW_FRAME.S11): bracket footprint on the face, base holes on H's two nutplates ${'0.90'} in apart, actuator axis up under the cam centre and its plunger across the cam plate`, check: () => { const F = SW_FRAME.S11, s = SW_AT.find((q) => q.ref === 'S11'), o = [s.at[1] * 12, s.at[0] * 12, s.at[2] * 12], Q = QD, map = (p) => [0, 1, 2].map((i) => o[i] + F.x[i] * p[0] + F.y[i] * p[1] + F.z[i] * p[2]);
    const br = SW_P.prims.filter((p) => p.g === 'bracket'), pts = br.flatMap((p) => [-1, 1].flatMap((i) => [-1, 1].map((j) => map([p.c[0] + i * p.d[0] / 2, p.c[1] + j * p.d[1] / 2, p.c[2] - p.d[2] / 2])))), onFace = Math.min(...pts.map((q) => Math.min(q[0] - Q.shelf.bl[0], Q.shelf.bl[1] - q[0], q[1] - Q.shelf.fs[0], Q.shelf.fs[1] - q[1])));
    const base = SW_P.cuts.filter((c) => c.feat === 'base').map((c) => map(c.a)), pitch = Math.hypot(base[0][0] - base[1][0], base[0][1] - base[1][1]), zUp = F.z[2], plunger = SW_P.prims.filter((p) => p.g === 'switch').reduce((a, p) => (p.c[2] > a.c[2] ? p : a)), pl = [map([0, -plunger.d[1] / 2, 0]), map([0, plunger.d[1] / 2, 0])].map((q) => q[0]).sort((a, b) => a - b), under = Math.abs(o[1] - Q.pivot[1]);
    const ok = onFace >= 0 && Math.abs(pitch - Q.s11Holes) <= 0.01 && zUp === 1 && pl[0] <= Q.cam.bl[0] + 1e-6 && pl[1] >= Q.cam.bl[1] - 1e-6 && under <= 0.05;
    return { ok, detail: `bracket ${fx2(onFace)} in inside the face; base holes ${fx2(pitch)} in apart (H: ${Q.s11Holes}); actuator +WL, ${fx2(under)} in off the pivot's FS; plunger BL ${fx2(pl[0])}…${fx2(pl[1])} over the cam BL ${Q.cam.bl.join('…')}` }; } }],
  tooling: { needed: false, text: 'None.' },
  sourcing: { blank: '0.040 6061-T6 sheet 2 × 2 in per bracket', vendor: 'Honeywell / Omron sealed basic switch via an avionics distributor; sheet from Aircraft Spruce', url: 'https://www.aircraftspruce.com/menus/el/switches.html', cost: 24.0, costAsOf: '2026-11-18', perAircraft: 3, lead: 'Stock', note: 'Approximate, each.' },
};
