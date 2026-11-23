// Block I definition records: electrical power, lighting, harnesses and supports (17 parts). Geometry from
// parts/wpI0_layout.js, analysis and primitives from parts/wpI1_power.js; COTS envelopes and harness sweeps built by
// cad/d_prims.py. Vendor and AC values carry their source (research of 2026-11-19, docs/blocks/i_electrical.md); what was not
// found in public sources is a BOUND (in the check rows) or says so. Notional; not for construction.
import { GEO } from '../structures.js';
import { EQUIP, WIRES, KEEPOUTS, insideFus, insideOML, clashCheck, partByPN, pinOf, PASS } from '../systems.js';
import * as LY from '../parts/wpI0_layout.js';
import { P_, RHO, VENDOR, DENS, massEachOf, KEY, PER_SET, IN, dPrim, pathsOf, G_OBST, SPAR_BOX, ENGINE_TERM, INSTALL_HW, SUPPORT_HW, hwMass, ENG_CLAMPS, LOADS, BATTERY, START, ALT, CONTACTOR, AWG, CITE, harnessLb, coordination, slacks, magField, shellBelow } from '../parts/wpI1_power.js';
import { CLAMPS, RACEWAYS } from '../parts/wp12_routing.js';
import { LAYOUT as FWL } from '../parts/wpA3_firewall.js';
import { CUTS as PNL_CUTS, PNL } from '../parts/wpB3_panel.js';
import { SW_WIRE } from '../parts/wpE1_nosegear.js';
import { SYSC } from '../parts/wpC8_cuts.js';
import { GND_STUD } from '../parts/wpH1_layout.js';
import { primVolumes } from './d_prims.js';
import { DATE, fx, rev0, open, geoIn, koIn, clear, runClear, at3, viaRecord, wireList, equipIn, len, sub } from './i_common.js';

const SHELL = 0.415;
/** room (in) from a point to the shell's inner face (bisection on insideFus) */
const room = (p) => { let lo = -2, hi = 6; for (let k = 0; k < 36; k++) { const m = (lo + hi) / 2; if (insideFus(p[1] / 12, p[0] / 12, p[2] / 12, m / 12)) lo = m; else hi = m; } return lo - SHELL; };
const minRoom = (prims) => { let w = { r: Infinity }; for (const g of prims) for (const p of [-1, 1].flatMap((i) => [-1, 1].flatMap((j) => [-1, 1].map((k) => g.c.map((v, n) => v + [i, j, k][n] * g.d[n] / 2))))) { const r = room(p); if (r < w.r) w = { r, p }; } return w; };
const boxOf = (q) => ({ t: 'box', c: q.c, d: q.d });
const prim = (k, groups) => P_[k].prims.filter((g) => !groups || groups.includes(g.g));
const near = (a, b, tol = 0.011) => Math.hypot(...a.map((v, i) => v - b[i])) <= tol;
const layoutPts = (id) => FWL.find((L) => L.id === id).pts;
const holesAt = (id, mine) => { const a = layoutPts(id), d = Math.max(...mine.map((p, i) => Math.hypot(p[0] - a[i][0], p[1] - a[i][1]))); return { ok: a.length === mine.length && d <= 0.01, detail: `A's layout '${id}' at ${a.map((q) => `(${fx(q[0])}, ${fx(q[1])})`).join(', ')}; ours ${mine.map((q) => `(${fx(q[0])}, ${fx(q[1])})`).join(', ')}; off by ${fx(d, 3)} in` }; };
const clr = (need, A, B, what) => { const w = clear(A, B); return { ok: w.c >= need, detail: `${what}: ${fx(w.c)} in (≥ ${need}) at ${at3(w.at)}${w.what ? ` (${w.what})` : ''}` }; };
const MS_ = (x) => `${x >= 0 ? '+' : ''}${fx(x)}`;
const mat = (spec, form, allowables = [], alt = 'Any part meeting the source control drawing (SCD) in the record') => ({ spec, alt, form, density: null, allowables });
const cotsNA = { cut: 'Bought in', layup: 'Bought in' };
const cotsTol = { general: 'Vendor drawing governs; position ±0.06 in', holes: 'Mounting holes per the vendor; host holes per block A', breakEdges: '—' };
const src = (vendor, cost, note = 'Price approximate: not found in public sources (BOUND; second research pass running).', url = 'https://www.aircraftspruce.com/', lead = 'Stock') => ({ vendor, url, cost, costAsOf: DATE, lead, note });
const mass = (k, from) => ({ each: massEachOf(k), from });
const vol = (k) => primVolumes(P_[k]);
const myRun = (pn, i) => pathsOf(pn)[i];
// crossings of the declared bulkheads and the panel, by the owner's own record checks
const CROSS = [['LEZ-53-160', 'I5', 'F22'], ['LEZ-53-165', 'I5', 'F28'], ['LEZ-53-170', 'I3', 'front seat back'], ['LEZ-53-175', 'I3', 'rear seat bulkhead'], ['LEZ-08-105', 'I3', 'ballast bulkhead'], ['LEZ-31-100', 'I4', 'instrument panel']];
const crossIfc = (pn, which = CROSS.map((c) => c[2])) => ({ id: 'IX', with: 'A\'s bulkheads and B\'s panel', feature: 'bundle', what: `Every crossing of ${which.join(', ')} through a declared hole (the owner's own pass-through checks), the firewall only in the boot`, check: () => {
  const rs = CROSS.filter((c) => which.includes(c[2])).map(([p, id]) => viaRecord(p, id, pn)), fw = clashCheck().filter((c) => c.part === pn);
  return { ok: rs.every((r) => r.ok) && !fw.length, detail: `${rs.map((r) => r.detail.split(':')[0] + (r.ok ? ' ✓' : ' ✗')).join('; ')}; firewall / zones / keep-outs: ${fw.length ? fw.map((c) => c.detail).join('; ') : 'clear'}` }; } });
const wiresIfc = (pn) => ({ id: 'IW', with: 'Equipment of blocks H, I, J (pin list)', feature: 'bundle', what: 'Every wire of the harness from a defined pin to a defined pin (wire list in the view)', check: () => wireList(pn) });
/** engine-side clearances of a run (G-O4, ICD engine side) */
function engineIfc(pn, runs) {
  return { id: 'IE', with: 'LEZ-71-220 mount, LEZ-71-223 brackets, LEZ-71-210 engine, LEZ-78-100 exhaust (block G)', feature: 'bundle', what: 'Mount tubes and cups ≥ 0.25 in, brackets ≥ 0.25 in, cylinders ≥ 0.25 in (the lug and its boot on the stud, the last 1.0 in, excepted), exhaust and muff ≥ 1.0 in (shielded, fire-sleeved); the crankcase envelope is entered only on the last leg onto the terminal', check: () => {
    const O = G_OBST(), rows = []; let ok = true;
    for (const [P, d, nm] of runs) { const L = P.reduce((a, q, i) => a + (i ? len(sub(q, P[i - 1])) : 0), 0), lastLeg = len(sub(P.at(-1), P.at(-2)));
      const m = runClear(P, d, O.mount), b = runClear(P, d, O.brk), c = runClear(P, d, O.eng.filter((g) => g.feat === 'cyl'), (q) => L - q.s < 1.0), e = runClear(P, d, O.exh),
        k = runClear(P, d, O.eng.filter((g) => !['cyl', 'starter', 'alt'].includes(g.feat)), (q) => L - q.s < lastLeg + 0.01);
      ok = ok && m.c >= 0.25 && b.c >= 0.25 && c.c >= 0.25 && e.c >= 1.0 && k.c >= 0;
      rows.push(`${nm}: mount ${fx(m.c)}, brackets ${fx(b.c)}, cylinders ${fx(c.c)}, exhaust ${fx(e.c)}, case ${fx(k.c)} in`); }
    return { ok, detail: rows.join('; ') }; } };
}
/** every run of a harness through the firewall boot in its own lane */
const bootIfc = (pn) => ({ id: 'IB', with: 'LEZ-53-180 firewall power boot (block A layout)', feature: 'bundle', what: 'Each run crossing FS 153 does so inside the boot (Ø 3.00, firewall rev C) in its lane', check: () => {
  const rows = []; let ok = true;
  for (const [i, r] of pathsOf(pn).entries()) for (let k = 1; k < r.P.length; k++) { const a = r.P[k - 1], b = r.P[k]; if ((a[1] - 127.5) * (b[1] - 127.5) > 0 || a[1] === b[1]) continue; const t = (127.5 - a[1]) / (b[1] - a[1]), p = a.map((v, j) => v + (b[j] - v) * t), off = Math.hypot(p[0] - LY.BOOT.c[0], p[2] - LY.BOOT.c[1]) + r.dIn / 2;
    ok = ok && off <= LY.BOOT.r; rows.push(`#${i} at BL ${fx(p[0])}, WL ${fx(p[2])}: ${fx(off)} of ${LY.BOOT.r} in`); }
  return { ok: ok && rows.length > 0, detail: rows.join('; ') || 'no crossing' }; } });

// ============================================================================================ LEZ-24-110 battery
export const BAT_P = { prims: P_.battery.prims, cuts: P_.battery.cuts };
export const BAT_DEF = {
  pn: 'LEZ-24-110', rev: 'A', status: 'released', nha: 'LEZ-24-100', qty: 1, kind: 'cots',
  title: 'Battery 12 V 16 Ah, box and shelf',
  revs: rev0(`Initial definition. The ICD found the box 0.17 in into the LH door cam and 0.34 in into the drive, with no shelf, no vent hole and no host for the inserts (I-R9, I-F10, I-F11). The box now sits ${fx(-LY.BAT.inb)} in outboard of the centre line (inboard face ${fx(clear(prim('battery', ['box', 'strap']), geoIn('LEZ-32-232')).c)} in from the cam) and ${fx(32.40 - LY.BAT.wl0)} in lower (WL ${fx(LY.BAT.wl0)}–${fx(LY.BAT.box.hi[2])}), which clears the shell at the forward-top corner without the chamfer the ICD offered; it stands on a 3/8 HT61 / 2 × 6781 shelf taped to the side wall below the door drive, its floor bolted to four potted inserts, two straps round the box over the lid and a vent tube to a belly drain; the shelf's inboard edge stays flush with the box, 0.34 in outboard of the door cable.`),
  effectivity: 'One per aircraft', params: BAT_P,
  datums: [{ id: 'A', what: `Box inboard face, BL ${fx(LY.BAT.inb)}` }, { id: 'B', what: `Box aft face, FS ${fx(LY.BAT.aft)} (0.20 in ahead of F22)` }, { id: 'C', what: `Shelf top, WL ${fx(LY.BAT.wl0)}` }],
  features: [
    { id: 'battery', kind: 'envelope', label: `Odyssey PC680 (ODS-AGM16L) AGM envelope ${LY.BAT.L} × ${LY.BAT.W} × ${LY.BAT.H} in (maker 182 × 77 × 162 mm, 168 mm max: the envelope is 1–4 % large, conservative), terminals up at the aft end (+ inboard, − outboard)`, tol: 'Vendor' },
    { id: 'box', kind: 'sheet', label: `G-10 box ${LY.BAT.wall} in wall, lid with the two terminal studs through it`, tol: '±0.03' },
    { id: 'strap', kind: 'sheet', label: `Two 6061-T6 straps 0.75 × ${0.05} in round the box over the lid at FS ${LY.BAT.straps.map((f) => fx(f + 0.375)).join(' / ')}, riveted to the box walls`, tol: '±0.03' },
    { id: 'shelf', kind: 'layup', label: `Shelf 3/8 HT61 with 2 × 6781 each face, BL ${fx(LY.BAT.shelf.lo[0])}…${fx(LY.BAT.shelf.hi[0])}, FS ${fx(LY.BAT.shelf.lo[1])}–${fx(LY.BAT.shelf.hi[1])}; outboard edge taped to the side wall (2 × 6781, 1 in laps); 4 × NAS1832-3 inserts potted Ø 0.60 in flox under the box floor (box bolted through its floor, AN3)`, tol: '±0.06' },
    { id: 'vent', kind: 'profile', label: `Vent: 1/4 × 0.035 nylon tube from the box spigot down outside the outboard wall, through the shelf to a belly drain at BL ${fx(LY.BAT.vent[1][0])}, FS ${fx(LY.BAT.vent[1][1])} (shell hole for block A)`, tol: '±0.12' },
    { id: 'terminal', kind: 'envelope', label: 'Terminals: M6 female threaded receptacles (50 in-lb max), M6 bolts through the 1/0 and 2 AWG lugs (M6 / 1/4 in holes); + at the aft inboard corner, − at the aft outboard corner (the drawn cylinders are the bolt heads and lug stacks)', tol: 'Vendor' },
  ],
  tolerances: cotsTol, drawingNotes: ['Torque the M6 terminal bolts to ≤ 50 in-lb (Odyssey product guide); boot both terminals.', 'Charge at the maker\'s AGM voltage only (the regulator setting, LEZ-24-150).'], generalNote: 'Shelf laid up in place on the side wall over peel ply.',
  na: cotsNA,
  material: mat('Sealed AGM battery (Odyssey PC680 / ODS-AGM16L: 12 V, 16 Ah at the 20 h rate, non-spillable; the box vent is a DESIGN choice for a cell failure); G-10 box; 6061-T6 0.050 straps; 3/8 Divinycell HT61 / 2 × 6781 shelf; nylon vent tube', 'battery bought; box, straps, shelf made',
    [['C20 capacity', `${BATTERY.ah} Ah`, BATTERY.src], ['Mass', `${VENDOR.battery} lb`, CITE.odyssey], ['Box G-10 density', `${DENS.G10} lb/in³`, 'BOUND: 1.90 g/cc, the heavy end (MakeItFrom NEMA G-10 1.8 g/cc, accessed 2026-11-19)'], ['Shelf sandwich (effective)', `${DENS.sandwich} lb/in³`, 'DERIVED: HT61 + 4 × 6781 effective density']]),
  process: [{ op: 'Shelf', spec: 'Lay the shelf up on the side wall over a foam block; tape its outboard edge to the wall; pot the four inserts.' }, { op: 'Box', spec: 'Bond and rivet the G-10 box; fit the vent spigot and the lid.' }, { op: 'Install', spec: 'Box on the shelf, 4 × AN3 through its floor into the inserts; battery in, lid on, straps tight; vent tube to the belly fitting; cables on the studs.' }],
  checks: ['elec-ess', 'batt-hold', 'elec-start', 'if-batt-shelf'],
  rules: [{ id: 'shell', label: 'Box room to the shell inner face ≥ 0.25 in', v: minRoom(prim('battery', ['box'])).r, min: 0.25 }],
  mass: mass('battery', `battery ${VENDOR.battery} lb (Odyssey product guide) + the box, straps, shelf and vent volumes × the densities in the material block`),
  interfaces: [
    { id: 'I1', with: 'LEZ-32-232 LH door drive (block E)', feature: 'box', what: 'Box and straps ≥ 0.25 in from the cam disc, follower and cable (ICD I-R9)', check: () => clr(0.25, prim('battery', ['box', 'strap', 'terminal']), geoIn('LEZ-32-232'), 'door drive') },
    { id: 'I2', with: 'ko-ng-door-drive-L (block E keep-out)', feature: 'box', what: 'Box, straps, shelf and vent outside the door-drive sweep keep-out', check: () => clr(0, P_.battery.prims, [koIn('ko-ng-door-drive-L')], 'keep-out') },
    { id: 'I3', with: 'LEZ-53-150 fuselage shell (block A)', feature: 'box', what: 'Box ≥ 0.25 in inside the shell inner face; shelf edge on the wall (0–0.35 in for the tape)', check: () => { const b = minRoom(prim('battery', ['box'])), s = minRoom(prim('battery', ['shelf'])); return { ok: b.r >= 0.25 && s.r >= -0.01 && s.r <= 0.35, detail: `box ${fx(b.r)} in at ${at3(b.p)}; shelf outboard edge ${fx(s.r)} in from the inner face at ${at3(s.p)}` }; } },
    { id: 'I4', with: 'LEZ-32-201 NG-30 plates (E), LEZ-08-100 / -110 ballast (A)', feature: 'shelf', what: 'Shelf, box and vent ≥ 0.25 in from the NG-30 plates and the ballast', check: () => clr(0.25, P_.battery.prims, [...geoIn('LEZ-32-201'), ...geoIn('LEZ-08-100'), ...geoIn('LEZ-08-110')], 'plates and ballast') },
    { id: 'I5', with: 'LEZ-53-160 F22 (block A)', feature: 'box', what: 'Box aft face ahead of F22\'s forward face', check: () => { const f22 = GEO.F22 * 12 - 0.375 / 2 - 2 * 3 * 0.0101; return { ok: LY.BAT.aft <= f22 - 0.1, detail: `box aft face FS ${fx(LY.BAT.aft)}, F22 forward face ≈ FS ${fx(f22)} (core and 3 × 6781): ${fx(f22 - LY.BAT.aft)} in` }; } },
    { id: 'I6', with: 'ko-battery (this block, for other routes)', feature: 'box', what: 'The keep-out covers the box', check: () => { const k = koIn('ko-battery'), lo = LY.BAT.box.lo, hi = LY.BAT.box.hi, m = Math.min(...[0, 1, 2].flatMap((i) => [lo[i] - (k.c[i] - k.d[i] / 2), k.c[i] + k.d[i] / 2 - hi[i]])); return { ok: m >= 0, detail: `keep-out margin over the box ${fx(m)} in` }; } },
    { id: 'I7', with: 'LEZ-24-160 / -162 / LEZ-80-110 cables', feature: 'terminal', what: 'The battery cables and the + feed land on the studs', check: () => { const ws = WIRES.filter((x) => /^BT1:/.test(x.from) || /^BT1:/.test(x.to)), e = equipIn('BT1'); return { ok: ws.length >= 3 && near(e, LY.BAT.pos), detail: `${ws.map((x) => x.id).join(', ')} on BT1 (+ stud at ${at3(e)})` }; } },
    open('O1', 'A (LEZ-53-150 shell)', `belly drain hole Ø 0.31 at BL ${fx(LY.BAT.vent[1][0])}, FS ${fx(LY.BAT.vent[1][1])} for the vent fitting, and the shelf\'s tape lands on the side wall FS ${fx(LY.BAT.shelf.lo[1])}–${fx(LY.BAT.shelf.hi[1])}`),
  ],
  tooling: { needed: true, text: 'A foam block cut to the side-wall contour supports the shelf while it cures in place.' },
  sourcing: { blank: 'PC680-class AGM; 1 sq ft G-10 0.050; 6061-T6 0.050 strip; HT61 and 6781 offcuts', ...src('Odyssey ODS-AGM16L (Aircraft Spruce 11-02233), Aircraft Spruce (G-10, inserts, tube)', 237, 'Battery $217.00 (Aircraft Spruce, 2026-11-19, medium confidence) + materials about $20 (BOUND, not researched); hold-down bracket 11-01853 $39.85 if bought instead of made.', 'https://www.aircraftspruce.com/catalog/elpages/odysseydry.php'), perAircraft: 1 },
};

// ============================================================================================ LEZ-24-120 master contactor and fuses
export const MAS_P = { prims: P_.master.prims, cuts: P_.master.cuts };
export const MAS_DEF = {
  pn: 'LEZ-24-120', rev: 'A', status: 'released', nha: 'LEZ-24-100', qty: 1, kind: 'cots',
  title: 'Master contactor K1, fuses F1 / F3',
  revs: rev0(`Initial definition. K1 floated 0.58 in aft of F22 with no host and F3 sat between the NG-30 plates inside the nose-gear box (ICD I-F11). K1 now hangs on an angle bracket on a potted pad on the left side wall aft of F22 (FS ${fx(LY.K1.c[1])}), F1 (ANL ${EQUIP.find((e) => e.ref === 'F1').cb} A) beside it and F3 (ATC ${EQUIP.find((e) => e.ref === 'F3').cb} A in-line) on the battery + feed outboard of the door drive.`),
  effectivity: 'One per aircraft', params: MAS_P,
  datums: [{ id: 'A', what: `Bracket face on the wall pad, BL ${fx(LY.K1.c[0] - LY.K1.L / 2 - 0.063)}` }, { id: 'B', what: `Can axis, FS ${fx(LY.K1.c[1])}, WL ${fx(LY.K1.c[2])}` }],
  features: [
    { id: 'contactor', kind: 'envelope', label: `Sky-Tec STS-M12 continuous-duty master contactor (150 A continuous, 300 A inrush) Ø ${fx(2 * LY.K1.r)} × ${LY.K1.L} in, axis along BL, studs 5/16 in inboard (A1 battery, A2 load); coil from the master switch`, tol: 'Vendor' },
    { id: 'bracket', kind: 'sheet', label: '6061-T6 0.063 angle, 2 × #10 to the can flange, 2 × AN3 to the wall-pad inserts', tol: '±0.03' },
    { id: 'anl', kind: 'envelope', label: `F1 ANL ${EQUIP.find((e) => e.ref === 'F1').cb} A in its holder (main feed to the bus module)`, tol: 'Vendor' },
    { id: 'fuse', kind: 'envelope', label: `F3 ATC ${EQUIP.find((e) => e.ref === 'F3').cb} A in-line holder (ESS ALT feed, battery side of K1)`, tol: 'Vendor' },
  ],
  tolerances: cotsTol, drawingNotes: ['Coil diode across the coil terminals (the contactor\'s, or a 1N4005 if none).', 'Boot both studs.'], na: cotsNA,
  material: mat('Sky-Tec STS-M12 (Lamar STS-A12 class) continuous-duty 12 V master contactor, 150 A continuous (requirement ≥ 100 A; the White-Rodgers Type 70 is only 80 A and does not qualify); ANL fuse and holder; ATC fuse and in-line holder; 6061-T6 0.063 bracket', 'bought; bracket made', [['K1 rating', `${CONTACTOR.k1.cont} A continuous`, CONTACTOR.k1.src], ['K1 mass', `${VENDOR.k1} lb`, CITE.stsM12], ['Stud size', '5/16-24 main, #10-32 coil', CITE.wr70 + ' (Type 70/71 class; confirm on the STS-M12)']], 'Any continuous-duty contactor ≥ 100 A continuous'),
  process: [{ op: 'Install', spec: 'Pot the two wall-pad inserts; bolt the bracket; mount K1, F1 and F3; connect per the wire list.' }],
  checks: ['elec-k', 'elec-coord'], rules: [],
  mass: mass('master', `vendor weights K1 ${VENDOR.k1} (sourced), ANL ${VENDOR.anl}, ATC ${VENDOR.atc} lb (BOUND, not found) on their envelopes; bracket and studs at handbook densities`),
  interfaces: [
    { id: 'I1', with: 'LEZ-53-150 side wall (block A)', feature: 'bracket', what: 'Bracket on the wall pad (gap to the shell inner face 0–0.35 in, filled with the potted pad)', check: () => { const w = minRoom(prim('master', ['bracket'])); return { ok: w.r >= -0.01 && w.r <= 0.35, detail: `bracket ${fx(w.r)} in from the inner face at ${at3(w.p)}` }; } },
    { id: 'I2', with: 'ko-ng-box nose-gear box (E)', feature: 'fuse', what: 'F3, F1 and K1 outside the nose-gear box keep-out by ≥ 0.25 in (F3 no longer between the plates)', check: () => clr(0.25, P_.master.prims, [koIn('ko-ng-box'), koIn('ko-ng-door-drive-L')], 'nose-gear box') },
    { id: 'I3', with: 'LEZ-24-110 battery, LEZ-53-160 F22', feature: 'contactor', what: 'K1 and F1 aft of F22 by ≥ 0.25 in; F3 ≥ 0.25 in from the battery box', check: () => { const f22a = GEO.F22 * 12 + 0.375 / 2 + 3 * 0.0101 * 2, k = LY.K1.c[1] - LY.K1.r, f = clear(prim('master', ['fuse']), prim('battery', ['box', 'strap'])); return { ok: k - f22a >= 0.25 && f.c >= 0.25, detail: `K1 forward edge FS ${fx(k)}, F22 aft face ≈ ${fx(f22a)}: ${fx(k - f22a)} in; F3 to the box ${fx(f.c)} in` }; } },
    { id: 'I4', with: 'Wire list (LEZ-24-160 / -162, LEZ-80-110)', feature: 'contactor', what: 'Cables land on K1 A1 / A2 and the coil', check: () => { const ws = WIRES.filter((x) => /^K1:/.test(x.from) || /^K1:/.test(x.to)); return { ok: ws.length >= 4, detail: `${ws.map((x) => `${x.id}→${/^K1:/.test(x.from) ? x.from : x.to}`).join(', ')}` }; } },
    open('O1', 'A (LEZ-53-150 side wall)', `two potted inserts (or a bonded G-10 pad) on the left side wall at BL ${fx(LY.K1.c[0] - LY.K1.L / 2 - 0.063)}, FS ${fx(LY.K1.c[1])}, WL ${fx(LY.K1.c[2] - 0.95)} / ${fx(LY.K1.c[2] + 0.95)}`),
  ],
  tooling: { needed: false, text: 'None.' },
  sourcing: { blank: 'Bought: master contactor, ANL holder and fuse, ATC in-line holder', ...src('Aircraft Spruce (Sky-Tec STS-M12 master contactor, ANL, ATC holder)', 160, 'STS-M24 (24 V) listed at $159.75 (Aircraft Spruce, 2026-11-19); the 12 V price is not shown; ANL and ATC holder prices not found (BOUND).', 'https://www.aircraftspruce.com/catalog/eppages/skytec07-03565.php'), perAircraft: 1 },
};

// ============================================================================================ LEZ-24-130 buses, breakers, diode, ANL
const pins = (ref, conn) => Object.entries(EQUIP.find((e) => e.ref === ref).conns[conn].pins);
const CIRCUITS = () => ['CB1', 'CB2'].flatMap((ref) => ['CB', 'FZ'].flatMap((c) => pins(ref, c).filter(([, n]) => !/^SPARE/.test(n)).map(([p, n]) => ({ ref, c, p, n }))));
export const BUS_P = { prims: P_.bus.prims, cuts: P_.bus.cuts };
export const BUS_DEF = {
  pn: 'LEZ-24-130', rev: 'A', status: 'released', nha: 'LEZ-24-100', qty: 1, kind: 'cots',
  title: 'Bus module and breaker sub-panel',
  revs: rev0(`Initial definition. Block J listed 17 protected circuits against B's 6-breaker cut-out (J-F17). B's LEZ-31-100 cut-out is kept unchanged: the six circuits a pilot may need to pull or reset in flight (alternator field, landing brake, strobes, AXIS COM, transponder, boost pump) are push-pull breakers on a sub-panel behind it; the other ${CIRCUITS().length - 6} are ATC blade fuses in two fuse blocks (main FB1, essential FB2) on a G-10 module on the left side wall forward of the panel, with the main bus bar, the essential feed diode D1, the bus-end ANL F2 and the cabin ground block GB1. AXIS A is on the main bus, AXIS B on the essential bus. The old "MAG 1A" fuse is the GMU 11 feed.`),
  effectivity: 'One per aircraft', params: BUS_P,
  datums: [{ id: 'A', what: `Sub-panel aft face on the panel's forward face, FS ${fx(LY.CBP.fsFace)}` }, { id: 'B', what: `Module plate on its standoffs, BL ${fx(LY.MOD.plate.bl)}` }],
  features: [
    { id: 'breaker', kind: 'envelope', label: `6 push-pull breakers (Klixon 7277-2, Ø 0.445 mounting hole + 0.125 anti-rotation hole) in 2 rows × 3 at BL ${LY.CBP.cols.join(' / ')}, WL ${LY.CBP.rows.join(' / ')}: CB1 ${pins('CB1', 'CB').map(([, n]) => n).join(', ')}; CB2 ${pins('CB2', 'CB').map(([, n]) => n).join(', ')}`, tol: 'Bushing holes ±0.01' },
    { id: 'subpanel', kind: 'sheet', label: `Sub-panel 6061-T6 ${LY.CBP.plate.t} × ${LY.CBP.plate.w} × ${LY.CBP.plate.h} in on 4 × #8 through B's cut-out flange`, tol: '±0.03' },
    { id: 'module', kind: 'sheet', label: `G-10 module plate ${LY.MOD.plate.t} in, FS ${LY.MOD.plate.fs.join('–')}, WL ${LY.MOD.plate.wl.join('–')}, on 4 nylon standoffs bonded to the wall`, tol: '±0.03' },
    { id: 'fuseblock', kind: 'envelope', label: `FB1 main (CB1 FZ: ${pins('CB1', 'FZ').map(([, n]) => n).join(', ')}); FB2 essential (CB2 FZ: ${pins('CB2', 'FZ').map(([, n]) => n).join(', ')})`, tol: 'Vendor' },
    { id: 'diode', kind: 'envelope', label: 'D1 essential feed diode (Schottky, ≥ 30 A, on its heat sink)', tol: 'Vendor' },
    { id: 'anl', kind: 'envelope', label: `F2 bus-end ANL ${EQUIP.find((e) => e.ref === 'F2')?.cb ?? 50} A (B-lead protection at the bus)`, tol: 'Vendor' },
    { id: 'busbar', kind: 'profile', label: 'Main bus bar, copper 0.25 × 0.5', tol: '±0.03' },
  ],
  tolerances: cotsTol, drawingNotes: ['Label every breaker and fuse position with its circuit (as the feature list).', 'Spare fuse positions are left empty with their labels.'], na: cotsNA,
  material: mat('Push-pull thermal breakers (Klixon 7277-2, the commercial grade of the 7274-2; MS26574 is the 7274 MIL part); ATC blade-fuse blocks; Schottky diode on a heat sink; ANL holder; copper bus bar; G-10 and 6061-T6 plate; nylon standoffs', 'bought; plates made',
    [['Breaker mass', `${VENDOR.breaker} lb each`, CITE.klixon], ['Fuse blocks', `${VENDOR.fuseblocks} lb (both)`, 'BOUND: not found in public sources'], ['Diode rating', '30 A', 'BOUND: B&C 221-201 rating not found in public sources']]),
  process: [{ op: 'Module', spec: 'Bond the standoffs to the wall with flox; screw the plate; mount FB1, FB2, D1, F2, bus bar and GB1.' }, { op: 'Sub-panel', spec: 'Mount the six breakers; screw the sub-panel to the panel through B\'s cut-out.' }],
  checks: ['elec-coord', 'elec-wire'], rules: [{ id: 'cut', label: 'Breakers in the cut-out (count)', v: 6, min: 6 }],
  mass: mass('bus', 'vendor weights (breakers sourced; fuse blocks, diode, ANL BOUND) on their envelopes; plates, bar and standoffs at handbook densities'),
  interfaces: [
    { id: 'I1', with: 'LEZ-31-100 panel cut-out \'cb\' (block B)', feature: 'breaker', what: 'Every breaker bushing inside B\'s cut-out; the sub-panel on the panel\'s forward face', check: () => { const c = PNL_CUTS.find((q) => q.id === 'cb').rect, b = 0.2225, ok = LY.CBP.cols.every((x) => x - b >= c[0] && x + b <= c[1]) && LY.CBP.rows.every((z) => z - b >= c[2] && z + b <= c[3]), g = PNL.fwd - LY.CBP.fsFace;
      return { ok: ok && Math.abs(g) <= 0.01, detail: `bushings BL ${fx(Math.min(...LY.CBP.cols) - b)}…${fx(Math.max(...LY.CBP.cols) + b)}, WL ${fx(Math.min(...LY.CBP.rows) - b)}–${fx(Math.max(...LY.CBP.rows) + b)} in cut-out [${c.join(', ')}]; sub-panel to the panel face ${fx(g, 3)} in` }; } },
    { id: 'I2', with: 'LEZ-31-110 AXIS GDU 116C envelope (block J)', feature: 'module', what: 'Module, breakers and sub-panel out of the AXIS envelope by ≥ 0.25 in (it reaches forward to FS 38.03)', check: () => clr(0.25, P_.bus.prims, geoIn('LEZ-31-110'), 'AXIS envelope') },
    { id: 'I3', with: 'Block J circuit list (J-F17)', feature: 'fuseblock', what: 'Every protected circuit has a breaker or fuse position, and each feeds a wire', check: () => { const C = CIRCUITS(), fed = C.filter((c) => WIRES.some((x) => x.from === `${c.ref}:${c.c}:${c.p}`)); return { ok: fed.length === C.length && C.length >= 17, detail: `${C.length} circuits: ${C.filter((c) => c.c === 'CB').length} breakers, ${C.filter((c) => c.c === 'FZ').length} fuses; ${fed.length} feed a wire; GMU 11 feed on CB2:FZ:4 (${pinOf('CB2:FZ:4')?.name})` }; } },
    { id: 'I4', with: 'LEZ-53-150 side wall (block A)', feature: 'module', what: 'Standoffs reach the wall (0–0.6 in from the shell inner face) and the plate stays ≥ 0.25 in inside', check: () => { const so = minRoom(P_.bus.prims.filter((g) => g.g === 'standoff').map((g) => ({ c: g.b, d: [0.02, 0.02, 0.02] }))), pl = minRoom(prim('bus', ['module'])); return { ok: so.r >= -0.01 && so.r <= 0.6 && pl.r >= 0.25, detail: `standoff ends ${fx(so.r)} in from the inner face; plate ${fx(pl.r)} in` }; } },
    { id: 'I5', with: 'LEZ-27-150 pedals, LEZ-27-1xx controls (block C)', feature: 'module', what: 'Module and breakers ≥ 0.25 in from C\'s pedal and control envelopes', check: () => clr(0.25, P_.bus.prims, ['LEZ-27-150', 'LEZ-27-110', 'LEZ-27-120'].flatMap((p) => geoIn(p)), 'controls') },
  ],
  tooling: { needed: false, text: 'None.' },
  sourcing: { blank: 'Bought: 6 breakers, 2 ATC fuse blocks, diode, ANL; G-10 and 6061 sheet', ...src('Aircraft Spruce (Klixon 7277-2 breakers, B&C 221-201 diode, ATC fuse blocks, ANL)', 300, '6 × 7277-2 at $29.95–31.60 = $190 + diode $33.75 (Aircraft Spruce, 2026-11-19); fuse blocks and ANL not found (BOUND): about $300 total.', 'https://aircraftspruce.com/catalog/elpages/klixon7277.php'), perAircraft: 1 },
};

// ============================================================================================ LEZ-24-140 ground blocks
export const GND_P = { prims: P_.ground.prims, cuts: P_.ground.cuts };
export const GND_DEF = {
  pn: 'LEZ-24-140', rev: 'A', status: 'released', nha: 'LEZ-24-100', qty: 1, kind: 'cots',
  title: 'Ground blocks GB1 and GB2',
  revs: rev0(`Initial definition: a single-point (star) ground at the battery − post (ICD G-O6). GB1 on the bus module collects every cabin return and goes to BT1 − by N3A8; GB2 on the firewall (A's layout holes) collects the firewall-aft returns, the key switch's P-lead ground and the engine strap, and goes to BT1 − by the 2 AWG ground cable. The engine case is grounded only through LEZ-24-165 to E1 on the accessory housing.`),
  effectivity: 'One per aircraft', params: GND_P,
  datums: [{ id: 'A', what: 'GB2 base on the firewall aft face, FS 153.0' }],
  features: [
    { id: 'gb1', kind: 'envelope', label: `GB1: tab ground block on the module, 5/16 in stud for N3A8 (envelope ${LY.MOD.GB1.d.join(' × ')} in; no 20-tab B&C block is listed: the B&C GB24, 24 tabs, 1-3/8 × 3-1/2 in, 5/16 stud, is the named part and the module re-layout for its larger footprint is open)`, tol: 'Vendor' },
    { id: 'gb2', kind: 'envelope', label: `GB2: brass ground block ${LY.GB2.d.join(' × ')} in on 2 × AN3 at A's 'gnd' holes, stud 5/16 in aft (2 AWG ground cable, strap, returns)`, tol: 'Vendor' },
  ],
  tolerances: cotsTol, drawingNotes: ['Bare-metal contact under GB2 is not needed (composite firewall): every ground is a wire to the block.'], na: cotsNA,
  material: mat('B&C GB24 tab ground block (cabin); brass ground block with stud (firewall)', 'bought', [['Masses', `GB1 ${VENDOR.gb1}, GB2 ${VENDOR.gb2} lb`, 'BOUND: not found in public sources'], ['GB24', '24 tabs, 1-3/8 × 3-1/2 in, 5/16 in stud', CITE.bcGB]]),
  process: [{ op: 'Install', spec: 'GB1 on the module; GB2 bolted through the firewall (A\'s holes) with fire-sealant under the base.' }],
  checks: ['elec-gnd'], rules: [],
  mass: mass('ground', 'vendor weights (BOUND) on the envelopes; studs at brass density'),
  interfaces: [
    { id: 'I1', with: 'LEZ-53-180 firewall layout \'gnd\' (block A)', feature: 'gb2', what: 'GB2 holes on A\'s layout', check: () => holesAt('gnd', LY.FW_LAYOUT.gnd) },
    { id: 'I2', with: 'LEZ-71-210 rev B ground stud E1 (blocks G / H, wpH1 GND_STUD)', feature: 'gb2', what: 'The strap lands on block H\'s E1 stud (tip within 0.01 in), on the accessory housing', check: () => { const t = GND_STUD.b, d = Math.hypot(...t.map((v, i) => v - LY.E1[i])), e = LY.R_STRAP.at(-1); return { ok: d <= 0.01 && near(e, LY.E1), detail: `E1 stud tip ${at3(t)} (base WL ${fx(GND_STUD.a[2])}); strap end ${at3(e)}` }; } },
    { id: 'I3', with: 'LEZ-24-130 bus module', feature: 'gb1', what: 'GB1 on the module plate face', check: () => { const g = LY.MOD.GB1, f = g.c[0] - g.d[0] / 2; return { ok: Math.abs(f - LY.MOD.plate.bl) <= 0.31, detail: `GB1 base BL ${fx(f)}, plate face BL ${fx(LY.MOD.plate.bl)}` }; } },
    { id: 'I4', with: 'K2, VR1 and the mount (blocks G, I)', feature: 'gb2', what: 'GB2 ≥ 0.25 in from K2 and the mount, ≥ 0.1 in from VR1', check: () => { const a = clear(prim('ground', ['gb2', 'stud']), [...P_.k2.prims.filter((g) => g.g !== 'bracket'), ...G_OBST().mount, ...G_OBST().brk.map(boxOfLoHi)]), b = clear(prim('ground', ['gb2']), P_.vr.prims); return { ok: a.c >= 0.25 && b.c >= 0.1, detail: `K2 / mount ${fx(a.c)} in (${a.what}); VR1 ${fx(b.c)} in` }; } },
  ],
  tooling: { needed: false, text: 'None.' },
  sourcing: { blank: 'Bought: tab ground block, brass firewall ground block', ...src('Aircraft Spruce / B&C (GB24 ground blocks)', 130, 'B&C GB24 $65.00 each, two (Aircraft Spruce, 2026-11-19); the GB24/24 firewall kit is $119.75.', 'https://www.aircraftspruce.com/catalog/elpages/elecsystem07-03463-6.php'), perAircraft: 1 },
};
function boxOfLoHi(b) { return { t: 'box', c: b.lo.map((v, i) => (v + b.hi[i]) / 2), d: b.lo.map((v, i) => b.hi[i] - v), what: b.feat }; }

// ============================================================================================ LEZ-24-150 regulator / OV relay
export const VR_P = { prims: P_.vr.prims, cuts: P_.vr.cuts };
export const VR_DEF = {
  pn: 'LEZ-24-150', rev: 'A', status: 'released', nha: 'LEZ-24-100', qty: 1, kind: 'cots',
  title: 'Regulator / OV relay VR1',
  revs: rev0(`Initial definition. VR1 moves to A's 'ovr' layout holes on the firewall aft face (FS 153, BL ${LY.FW_LAYOUT.ovr.map((q) => fx(q[0])).join(' / ')}), clear of the mount brackets' keep-outs. The ${ALT.rating} A alternator is part of the engine (block G LEZ-71-210); its B+ lead is LEZ-24-160.`),
  effectivity: 'One per aircraft', params: VR_P,
  datums: [{ id: 'A', what: 'Flange on the firewall aft face, FS 153.0' }],
  features: [{ id: 'body', kind: 'envelope', label: `Solid-state regulator with crowbar OV protection ${LY.VR1.d.join(' × ')} in, connector aft`, tol: 'Vendor' }, { id: 'flange', kind: 'sheet', label: '2 × AN3 at A\'s \'ovr\' holes', tol: '±0.01' }],
  tolerances: cotsTol, drawingNotes: ['Set the regulator to the battery maker\'s AGM charge voltage.'], na: cotsNA,
  material: mat(`B&C LR3E-14 linear regulator (07-06742; earlier LR3C / LR3D) with integral overvoltage crowbar (16.25 ± 0.25 V trip, preset 14.4 V, low-voltage warning ≈ 12.7 V) for the ${ALT.rating} A L-40 (field < 4 A, 5 A field breaker); experimental only`, 'bought', [['Alternator', `${ALT.rating} A`, ALT.src], ['Mass', `${VENDOR.vr} lb`, CITE.lr3]]),
  process: [{ op: 'Install', spec: 'Bolt through the firewall at A\'s holes with fire-sealant; connect the field, sense and ALT LOW leads.' }],
  checks: ['elec-load'], rules: [],
  mass: mass('vr', 'vendor weight (LR3E-14 ≈ 9 oz) on the envelope; flange at aluminium density'),
  interfaces: [
    { id: 'I1', with: 'LEZ-53-180 firewall layout \'ovr\' (block A)', feature: 'flange', what: 'Mount holes on A\'s layout', check: () => holesAt('ovr', LY.FW_LAYOUT.ovr) },
    { id: 'I2', with: 'LEZ-71-220 mount, LEZ-71-223 brackets (block G)', feature: 'body', what: '≥ 0.25 in from the mount tubes and cups and the brackets', check: () => clr(0.25, P_.vr.prims, [...G_OBST().mount, ...G_OBST().brk.map(boxOfLoHi)], 'mount and brackets') },
    { id: 'I3', with: 'LEZ-71-210 alternator B+ (block G)', feature: 'body', what: 'The B-lead ends on the alternator\'s B+ terminal', check: () => { const e = LY.R_PWR_FW.at(-1); return { ok: near(e, ENGINE_TERM.alt), detail: `B-lead end ${at3(e)}, B+ ${at3(ENGINE_TERM.alt)}` }; } },
  ],
  tooling: { needed: false, text: 'None.' },
  sourcing: { blank: 'Bought: regulator with OV protection', ...src('Aircraft Spruce 07-06742 (B&C LR3E-14)', 385, '$385.00 each (Aircraft Spruce, 2026-11-19).', 'https://www.aircraftspruce.com/catalog/eppages/lr3reg14.php'), perAircraft: 1 },
};

// ============================================================================================ LEZ-80-100 starter contactor
export const K2_P = { prims: P_.k2.prims, cuts: P_.k2.cuts };
export const K2_DEF = {
  pn: 'LEZ-80-100', rev: 'A', status: 'released', nha: 'LEZ-24-100', qty: 1, kind: 'cots',
  title: 'Starter contactor K2 (firewall)',
  revs: rev0(`Initial definition. K2 moves from leg A of the lower bracket to A's 'start' layout holes (BL ${LY.FW_LAYOUT.start.map((q) => fx(q[0])).join(' / ')}, WL ${fx(LY.FW_LAYOUT.start[0][1])}) on a CRES angle, can vertical, studs up; the starter cable leaves A2 in a service bow to the first engine clamp.`),
  effectivity: 'One per aircraft', params: K2_P,
  datums: [{ id: 'A', what: 'Bracket on the firewall aft face, FS 153.0' }],
  features: [{ id: 'contactor', kind: 'envelope', label: `Intermittent-duty starter contactor Ø ${fx(2 * LY.K2.r)} × ${fx(LY.K2.h[1] - LY.K2.h[0])} in, studs A1 (battery) / A2 (starter) on top, coil from the key switch START`, tol: 'Vendor' }, { id: 'bracket', kind: 'sheet', label: '0.040 CRES angle, 2 × AN3 through the firewall at A\'s holes, 2 × #10 to the can', tol: '±0.03' }],
  tolerances: cotsTol, drawingNotes: ['Boot both studs; fire-sleeve the cables from the boot.'], na: cotsNA,
  material: mat('Lamar STS-S12 intermittent-duty 12 V starter solenoid (07-03562; 300 A, coil 2.9 A on the 5 A START / IGN fuse); 0.040 CRES 304 angle', 'bought; bracket made', [['Rating', `${CONTACTOR.k2.int} A intermittent`, CONTACTOR.k2.src], ['Mass', `${VENDOR.k2} lb`, CITE.stsS12]]),
  process: [{ op: 'Install', spec: 'Bolt the bracket through the firewall (A\'s holes) with fire-sealant; mount K2; connect.' }],
  checks: ['elec-k', 'elec-start'], rules: [],
  mass: mass('k2', 'vendor weight (STS-S12 ≈ 1 lb) on the envelope; studs brass, bracket stainless'),
  interfaces: [
    { id: 'I1', with: 'LEZ-53-180 firewall layout \'start\' (block A)', feature: 'bracket', what: 'Bracket holes on A\'s layout (not on leg A)', check: () => holesAt('start', LY.FW_LAYOUT.start) },
    { id: 'I2', with: 'LEZ-71-220 mount, LEZ-71-223 brackets (block G)', feature: 'contactor', what: '≥ 0.25 in from the mount tubes, cups and the brackets\' keep-outs', check: () => clr(0.25, P_.k2.prims, [...G_OBST().mount, ...G_OBST().brk.map(boxOfLoHi)], 'mount and brackets') },
    { id: 'I3', with: 'LEZ-80-110 cables', feature: 'contactor', what: 'The battery cable ends on A1 and the starter cable leaves A2', check: () => ({ ok: near(LY.R_START_FW.at(-1), LY.K2.studs.A1) && near(LY.R_STARTER[0], LY.K2.studs.A2), detail: `A1 ${at3(LY.K2.studs.A1)}, A2 ${at3(LY.K2.studs.A2)}` }) },
  ],
  tooling: { needed: false, text: 'None.' },
  sourcing: { blank: 'Bought: starter contactor', ...src('Aircraft Spruce 07-03562 (Lamar STS-S12)', 164, 'STS-S24 (24 V) listed at $163.75 (Aircraft Spruce, 2026-11-19); the 12 V price is not shown (low confidence).', 'https://www.aircraftspruce.com/catalog/eppages/sts-12s24s.php'), perAircraft: 1 },
};

// ============================================================================================ LEZ-33-100 wingtip lights, LEZ-33-120 landing light
export const TIP_P = { prims: P_.tips.prims, cuts: [] };
export const TIP_DEF = {
  pn: 'LEZ-33-100', rev: 'A', status: 'released', nha: 'LEZ-33-110', qty: 2, kind: 'cots',
  title: 'Wingtip position / strobe lights',
  revs: rev0(`Initial definition. The lights move inside the wing-tip close-outs (I-R10) behind a lens in the tip face, BL ±${fx(LY.TIP_LIGHT.lo[0])}–${fx(LY.TIP_LIGHT.hi[0])}, FS ${fx(LY.TIP_LIGHT.lo[1])}–${fx(LY.TIP_LIGHT.hi[1])}; each fed by its harness through the wing conduit and a root disconnect.`),
  effectivity: 'Left and right (one set)', params: TIP_P,
  datums: [{ id: 'A', what: 'Lens on the tip close-out face' }],
  features: [{ id: 'light', kind: 'envelope', label: 'Combination LED position (forward), strobe and white tail light, 3-wire (position, strobe, ground)', tol: 'Vendor' }, { id: 'lens', kind: 'envelope', label: 'Polycarbonate lens, flush with the tip face', tol: '±0.03' }],
  tolerances: cotsTol, drawingNotes: ['Aim per FAR 23.1385–23.1401 dihedral angles (the light\'s own certification).'], na: cotsNA,
  material: mat('AeroLEDs Pulsar 660 combination LED wingtip light (experimental pair 14 V, MFR 01-1380-C-12, non-TSO; a certified version is listed separately); polycarbonate lens', 'bought', [['Current', `${LOADS.DS1.I} A average, ${LOADS.DS1.peak} A flash peak (taken per light)`, CITE.pulsar], ['Mass', `${VENDOR.tip} lb each (heavier end of 0.24–0.41 lb)`, CITE.pulsarNSP]]),
  process: [{ op: 'Install', spec: 'Bond the mounting ring into the tip close-out; mount the light; plug the harness.' }],
  checks: ['elec-vdrop', 'elec-mag'], rules: [],
  mass: { each: massEachOf('tips'), from: 'vendor weight (Pulsar NSP 6.6 oz) on the envelope; both lights in one solid, mass each = half' },
  interfaces: [
    { id: 'I1', with: 'LEZ-57-130 wing tip / close-out (block A)', feature: 'light', what: 'Both lights inside the OML', check: () => { const out = P_.tips.prims.filter((g) => g.g === 'light').flatMap((g) => [-1, 1].flatMap((i) => [-1, 1].flatMap((j) => [-1, 1].map((k) => g.c.map((v, n) => v + [i, j, k][n] * g.d[n] / 2 * 0.98))))).filter((p) => !insideOML([p[1] / 12, p[0] / 12, p[2] / 12])); return { ok: !out.length, detail: out.length ? `${out.length} corners outside the OML, e.g. ${at3(out[0])}` : 'every corner of both lights inside the OML' }; } },
    { id: 'I2', with: 'LEZ-33-110 harness', feature: 'light', what: 'Each harness ends at its light\'s connector face', check: () => { const ends = pathsOf('LEZ-33-110').map((r) => r.P.at(-1)), ls = P_.tips.prims.filter((g) => g.g === 'light'), d = ends.map((e) => Math.min(...ls.map((g) => Math.abs(dPrim(e, g))))); return { ok: d.every((v) => v <= 0.15), detail: `ends ${d.map((v) => fx(v)).join(' / ')} in from the light faces` }; } },
  ],
  tooling: { needed: false, text: 'None.' },
  sourcing: { blank: 'Bought: a pair of combination LED wingtip lights', ...src('Aircraft Spruce 11-15280 (AeroLEDs Pulsar 660 experimental pair 14 V)', 1000, 'Pair $1,000.00 (Aircraft Spruce, 2026-11-19); left only $500.', 'https://www.aircraftspruce.com/catalog/pnpages/11-15280.php'), perAircraft: 1 },
};
export const LDG_P = { prims: P_.ldg.prims, cuts: [] };
export const LDG_DEF = {
  pn: 'LEZ-33-120', rev: 'A', status: 'released', nha: 'LEZ-24-100', qty: 1, kind: 'cots',
  title: 'Landing light, LED, in the nose',
  revs: rev0('Initial definition. The light\'s connector DS3 moves onto the light (the old equipment point was 1.5 in away) and its lead runs below the removable ballast plates and through A\'s ballast-bulkhead hole (I-R9).'),
  effectivity: 'One per aircraft', params: LDG_P, datums: [{ id: 'A', what: 'Lens behind the nose window' }],
  features: [{ id: 'light', kind: 'envelope', label: 'PAR-36 LED landing light, 14 V, 2-wire, behind the nose window', tol: 'Vendor' }, { id: 'lens', kind: 'envelope', label: 'Front lens', tol: 'Vendor' }],
  tolerances: cotsTol, drawingNotes: ['Aim 3° down from the cruise attitude.'], na: cotsNA,
  material: mat('AeroLEDs SunSpot 36LX PAR-36 LED landing light (45 W, 9–40 V)', 'bought', [['Current', `${LOADS.DS3.I} A`, CITE.sunspot], ['Mass', `${VENDOR.ldg} lb`, CITE.sunspot]], 'AeroLEDs SunSpot 36-4509-H (75 W, 5.4 A, 0.70 lb: needs a 7.5 A fuse)'),
  process: [{ op: 'Install', spec: 'Bracket to the nose bulkhead; aim; plug the lead.' }],
  checks: ['elec-vdrop'], rules: [],
  mass: mass('ldg', 'vendor weight (SunSpot 36LX 10.1 oz) on the envelope'),
  interfaces: [
    { id: 'I1', with: 'LEZ-53-150 nose shell (block A)', feature: 'light', what: 'Inside the OML', check: () => { const g = P_.ldg.prims[0], ok = [-1, 1].every((i) => [-1, 1].every((k) => insideOML([(g.c[1]) / 12, (g.c[0] + i * g.d[0] / 2) / 12, (g.c[2] + k * g.d[2] / 2) / 12]))); return { ok, detail: `light ${at3(g.c)} ${ok ? 'inside' : 'OUTSIDE'} the OML` }; } },
    { id: 'I2', with: 'LEZ-08-100 / -110 ballast (A)', feature: 'light', what: '≥ 0.25 in from the ballast', check: () => clr(0.25, P_.ldg.prims, [...geoIn('LEZ-08-100'), ...geoIn('LEZ-08-110')], 'ballast') },
    { id: 'I3', with: 'LEZ-24-162 forward harness', feature: 'light', what: 'DS3 (the lead\'s end) on the light', check: () => { const e = equipIn('DS3'), d = dPrim(e, P_.ldg.prims[0]); return { ok: d <= 0.15, detail: `DS3 at ${at3(e)}, ${fx(d)} in from the light` }; } },
  ],
  tooling: { needed: false, text: 'None.' },
  sourcing: { blank: 'Bought: PAR-36 LED landing light', ...src('Aircraft Spruce (AeroLEDs SunSpot 36 series)', 615, 'The 36LX price was not found (it may no longer be listed); the current SunSpot 36-4509-H is $615.00 (Aircraft Spruce, 2026-11-19, low confidence).', 'https://www.aircraftspruce.com/catalog/elpages/sunspot36_4000.php'), perAircraft: 1 },
};

// ============================================================================================ harnesses and cables
const wireRows = (pn) => WIRES.filter((x) => [].concat(x.harness).includes(pn));
const harnessMat = (pn, extra = '') => mat(`M22759/16 tin-plated copper wire (ETFE), M27500 shielded cable where marked, AS81824 / MS25036 terminals, SAE AS50881 dressing${extra}`, `${wireRows(pn).length} wires, cut to the routed lengths (wire list)`,
  [['Wire data', 'M22759/16 tin-plated maxima; AC 43.13-1B Table 11-3 protector chart; free-air ratings BOUND (elec-amp / elec-wire)', CITE.glenair + '; ' + CITE.ac11], ['Mass', `${fx(harnessLb(pn), 3)} lb per set from the wire list (lb/ft by gauge, AS22759/16 maxima) + 15 % terminals and dressing (BOUND)`, CITE.glenair]], 'Equivalent MIL-spec wire of the same gauge');
const harnessProc = [{ op: 'Cut', spec: 'Cut each wire to the wire-list length + 3 in service loop; mark the circuit ID at both ends every 15 in.' }, { op: 'Form', spec: 'Lay up on the harness board to the route; lace every 4 in; sleeve at bulkheads.' }, { op: 'Terminate', spec: 'Crimp with the calibrated tool; heat-shrink; shield terminations as the wire list.' }, { op: 'Test', spec: 'Continuity and insulation (500 V) of every wire against the wire list.' }];
const H = (pn, title, revText, checks, ifcs, extra = {}) => ({
  pn, rev: extra.revs ? extra.revs.at(-1).rev : 'A', status: 'released', nha: partByPN(pn)?.nha || 'LEZ-24-100', qty: partByPN(pn)?.qty || 1, kind: 'harness', title, revs: [...rev0(revText), ...(extra.revs || [])],
  effectivity: extra.effectivity || 'One per aircraft', params: { prims: P_[pn].prims, cuts: [] },
  datums: [{ id: 'A', what: 'Harness board laid to the routed path (the swept solid)' }],
  features: [{ id: 'bundle', kind: 'profile', label: `${pathsOf(pn).length} run(s), ${wireRows(pn).length} wires; bundle Ø ${[...new Set(pathsOf(pn).map((r) => r.dIn))].join(' / ')} in swept along the route`, tol: 'Route ±0.25 in between clamps' }],
  tolerances: { general: 'Wire lengths +3 / −0 in; terminations per AS50881', breakEdges: '—' }, drawingNotes: extra.notes || [], na: { cut: 'Wire cut to the list', layup: 'Harness' },
  material: harnessMat(pn, extra.mat || ''), process: harnessProc, checks, rules: extra.rules || [],
  mass: { each: massEachOf(KEY[pn]), from: `swept bundle × the effective density that puts the wire-list mass on it${PER_SET[KEY[pn]] ? ' (both sides in one solid; mass each = half)' : ''}` },
  interfaces: [wiresIfc(pn), ...ifcs],
  tooling: { needed: true, text: 'Harness board laid out from the route (view projections) with the breakouts and clamp stations.' },
  sourcing: { blank: `${wireRows(pn).length} wires (M22759/16, M27500), terminals, lacing`, ...src('Aircraft Spruce / Steinair (M22759 wire, M27500, terminals)', extra.cost || 120), perAircraft: 1 },
});

const H_RUNS = ['LEZ-74-130', 'LEZ-77-110', 'LEZ-77-111', 'LEZ-74-110', 'LEZ-77-100', 'LEZ-74-100'];
const ifcH = { id: 'I4', with: 'Block H runs aft of the firewall (P-leads, GEA trunk and branches, HT leads)', feature: 'install', what: 'Every block I run ≥ 0.125 in from block H\'s runs aft of the boot clamp zone (FS > 154.1, within 0.4 in of H\'s boot clamp at FS 153.70 the runs leave the clamp together)', check: () => { const B = H_RUNS.flatMap((p) => geoIn(p)); const rows = [[LY.R_START_FW, 0.49, 'battery cable'], [LY.R_GND_FW, 0.49, 'ground cable'], [LY.R_STARTER, 0.42, 'starter cable'], [LY.R_PWR_FW, 0.36, 'B-lead'], [LY.R_STRAP, 0.25, 'strap']].map(([P, d, n]) => [n, runClear(P, d, B, (q) => q.p[1] <= 128.6)]);
  return { ok: rows.every(([, w]) => w.c >= 0.125), detail: rows.map(([n, w]) => `${n} ${fx(w.c)} in (${w.what})`).join('; ') }; } };
const hCables = (pn) => ({ id: 'IH', with: 'LEZ-76-110 engine-control cables (block H)', feature: 'bundle', what: 'Cabin runs ≥ 0.25 in from H\'s throttle, mixture and carb-heat cables where they drop down the left wall (FS 79–86)', check: () => { const B = geoIn('LEZ-76-110'), w = Math.min(...pathsOf(pn).map((r) => runClear(r.P, r.dIn, B, (q) => q.p[1] > 114.5).c)); return { ok: w >= 0.25, detail: `${fx(w)} in` }; } });
const startRuns = () => [[LY.R_STARTER, 0.42, 'starter cable'], [LY.R_GND_FW, 0.49, 'ground cable'], [LY.R_START_FW, 0.49, 'battery cable (firewall)']];
export const PWR_DEF = H('LEZ-24-160', 'Power harness (feeds, B-lead, pump)',
  'Initial definition. The cabin run leaves the bus module under the panel\'s bottom edge (no panel hole), joins raceway LP (now WL 35.04), leaves it at FS 124 through the rear seat bulkhead, passes the left sump above F\'s feed, under the CS spar into its boot lane; aft of the firewall the B-lead and field leads climb between K2 and VR1, cross the crankcase under the HT leads and drop between the right front cylinder and the ring gear to the alternator (G-O4 clearances, fire-sleeved). The boost-pump lead runs at 2.5 A to F\'s pump.',
  ['elec-amp', 'elec-wire', 'elec-vdrop', 'elec-slack'],
  [bootIfc('LEZ-24-160'), engineIfc('LEZ-24-160', [[LY.R_PWR_FW, 0.36, 'B-lead']]), crossIfc('LEZ-24-160', ['rear seat bulkhead', 'instrument panel']),
    { id: 'I1', with: 'LEZ-28-1xx fuel parts (block F)', feature: 'bundle', what: 'Power runs ≥ 2 in from fuel parts (SEP fuel|power), except the pump lead at its pigtail', check: () => { const F = ['LEZ-28-110', 'LEZ-28-120', 'LEZ-28-130', 'LEZ-28-150', 'LEZ-28-185', 'LEZ-28-190'].flatMap((p) => geoIn(p)); const w = Math.min(...pathsOf('LEZ-24-160').filter((r, i) => i !== 1).map((r) => runClear(r.P, r.dIn, F).c)); return { ok: w >= 2.0, detail: `cabin run and B-lead ${fx(w)} in from the fuel parts` }; } },
    { id: 'I2', with: 'LEZ-28-140 boost pump (block F)', feature: 'bundle', what: 'Pump lead ends at the pump\'s pigtail (M1)', check: () => { const e = pathsOf('LEZ-24-160')[1].P.at(-1), m = equipIn('M1'), d = Math.hypot(...e.map((v, i) => v - m[i])); return { ok: d <= 2.5, detail: `pump lead end ${at3(e)}, M1 ${at3(m)}: ${fx(d)} in (pigtail)` }; } },
    hCables('LEZ-24-160'),
  ], { cost: 160 });
export const PNLH_DEF = H('LEZ-24-161', 'Panel harness',
  `Initial definition. The trunk runs at FS 36.9, WL 40.3, under the edge of J's avionics shelf and forward of the AXIS connectors, with the right riser inboard of the pitch rod and under J's right static line; the S12 lead leaves the RH NG-30 plate through E's grommet and is wired C–NC (alarm closed with the gear not down), S13 likewise from latch hook 1 through raceway LS, S11 C–NO (closed at idle).`,
  ['elec-vdrop', 'elec-wire', 'elec-emc'],
  [crossIfc('LEZ-24-161', ['F22', 'F28', 'instrument panel']),
    { id: 'I1', with: 'LEZ-31-110 AXIS, LEZ-31-160 shelf with the GTX 45R and GSU 25D, LEZ-34-130 pitot-static (block J)', feature: 'bundle', what: 'Trunk ≥ 0.25 in from J\'s units, shelf and pitot-static lines behind the panel', check: () => { const B = ['LEZ-31-110', 'LEZ-31-160', 'LEZ-31-120', 'LEZ-34-100', 'LEZ-31-130', 'LEZ-34-130'].flatMap((p) => geoIn(p)), w = runClear(pathsOf('LEZ-24-161')[0].P, 0.25, B); return { ok: w.c >= 0.25, detail: `${fx(w.c)} in (${w.what}) at ${at3(w.at)}` }; } },
    { id: 'I2', with: 'LEZ-32-201 RH NG-30 plate grommet (block E)', feature: 'bundle', what: 'The S12 lead\'s first segment crosses the plate\'s mid-plane at E\'s SW_WIRE grommet', check: () => { const a = LY.R_NGSW[0], b = LY.R_NGSW[1], y = 2.49, t = (y - a[0]) / (b[0] - a[0]), p = a.map((v, i) => v + (b[i] - v) * t);
      return { ok: Math.abs(p[1] - SW_WIRE[0]) <= 0.01 && Math.abs(p[2] - SW_WIRE[1]) <= 0.01, detail: `crosses BL ${y} at FS ${fx(p[1])}, WL ${fx(p[2])}; grommet FS ${fx(SW_WIRE[0])}, WL ${fx(SW_WIRE[1])}` }; } },
    { id: 'I3', with: 'LEZ-32-216 switches S11 / S12 / S13 (block D)', feature: 'bundle', what: 'Contact sense: S11 C–NO (closed at idle), S12 and S13 C–NC (closed in the alarm state)', check: () => { const w = (s) => WIRES.find((x) => x.to.startsWith(`${s}:T:N`)), a = w('S11'), b = w('S12'), c = w('S13'); return { ok: a?.to === 'S11:T:NO' && b?.to === 'S12:T:NC' && c?.to === 'S13:T:NC', detail: `${a?.id} → ${a?.to}; ${b?.id} → ${b?.to}; ${c?.id} → ${c?.to}` }; } },
    { id: 'I4', with: 'LEZ-25-1xx seats and consoles (block B)', feature: 'bundle', what: 'Right signal raceway clamps at BL ≥ 10.5 alongside the front seat back (FS 60–95)', check: () => { const cs = CLAMPS.filter((c) => c.raceway === 'RS' && c.at[0] * 12 >= 46.02 && c.at[0] * 12 <= 69.5), m = Math.min(...cs.map((c) => c.at[1] * 12)); return { ok: !cs.length || m >= 10.5, detail: cs.length ? `${cs.length} RS clamps, innermost BL ${fx(m)}` : 'no RS clamp alongside the seat back (final integration, panel rev C: the ELT remote rides the RF bundle; RS carries only the PTT branch, forward of FS 64)' }; } },
  ], { cost: 220, notes: ['Gear and canopy warning leads: alarm = input grounded; S12 and S13 on their NC contacts, S11 on NO.'] });
export const FWDH_DEF = H('LEZ-24-162', 'Forward harness (battery, landing light)',
  'Initial definition. From the bus module forward through F28 and F22 to F1, K1 and the battery + post, over the battery outboard of the door drive and the ballast, under the slabs through A\'s ballast-bulkhead hole to the landing light; nothing through the removable plates (I-R9).',
  ['elec-vdrop', 'elec-wire'],
  [crossIfc('LEZ-24-162', ['F22', 'F28', 'ballast bulkhead']),
    { id: 'I1', with: 'LEZ-08-110 removable plates, LEZ-08-100 slabs (block A)', feature: 'bundle', what: 'Lead ≥ 0.25 in from the ballast (nothing through a removable plate)', check: () => { const w = runClear(LY.R_FWD, 0.25, [...geoIn('LEZ-08-110'), ...geoIn('LEZ-08-100')]); return { ok: w.c >= 0.25, detail: `${fx(w.c)} in at ${at3(w.at)}` }; } },
    { id: 'I2', with: 'LEZ-32-232 door drive, ko-ng-door-drive-L (block E)', feature: 'bundle', what: '≥ 0.25 in from the door drive and outside its keep-out', check: () => { const a = runClear(LY.R_FWD, 0.25, geoIn('LEZ-32-232')), b = runClear(LY.R_FWD, 0.25, [koIn('ko-ng-door-drive-L')]); return { ok: a.c >= 0.25 && b.c >= 0, detail: `door drive ${fx(a.c)} in, keep-out ${fx(b.c)} in` }; } },
  ], { cost: 60 });
export const STRAP_DEF = H('LEZ-24-165', 'Engine ground strap (GB2 to E1)',
  'Initial definition: tinned-copper braid with crimped lugs from the GB2 stud over the top mount diagonal and the left magneto to the E1 stud on the accessory housing, with engine-motion slack (G-O6).',
  ['elec-gnd', 'elec-slack', 'elec-start'],
  [{ id: 'I1', with: 'LEZ-24-140 GB2, E1 on LEZ-71-210 (G / H)', feature: 'bundle', what: 'Ends on the GB2 stud and on E1', check: () => ({ ok: near(LY.R_STRAP[0], LY.GB2.stud) && near(LY.R_STRAP.at(-1), LY.E1), detail: `${at3(LY.R_STRAP[0])} → ${at3(LY.R_STRAP.at(-1))}` }) },
    engineIfc('LEZ-24-165', [[LY.R_STRAP, 0.25, 'strap']])],
  { mat: '; tinned copper braid ≥ 2 AWG equivalent', cost: 25 });
export const CAB_DEF = H('LEZ-80-110', 'Starter and ground cables, 2 AWG',
  'Initial definition. Battery + post → K1 → down the wall → raceway LP → the rear seat bulkhead → past the left sump ≥ 2 in → under the CS spar into the boot; battery − → GB2. Aft of the firewall: up outboard of K2 to A1; A2 → service bow over the strap → over the crankcase under the HT leads → down between the left front cylinder and the ring gear onto the starter. Mount tubes ≥ 0.25 in (G-O4).',
  ['elec-start', 'elec-slack', 'elec-emc'],
  [bootIfc('LEZ-80-110'), engineIfc('LEZ-80-110', startRuns()), crossIfc('LEZ-80-110', ['rear seat bulkhead', 'instrument panel']),
    { id: 'I1', with: 'LEZ-28-110 left sump well (block F)', feature: 'bundle', what: 'Starter and ground cables ≥ 2 in from the sump and fuel lines', check: () => { const F = ['LEZ-28-110', 'LEZ-28-120', 'LEZ-28-150', 'LEZ-28-185'].flatMap((p) => geoIn(p)), w = Math.min(...pathsOf('LEZ-80-110').map((r) => runClear(r.P, r.dIn, F).c)); return { ok: w >= 2.0, detail: `${fx(w)} in from the fuel parts` }; } },
    { id: 'I2', with: 'LEZ-71-210 starter (block G)', feature: 'bundle', what: 'The starter cable ends on the starter terminal', check: () => ({ ok: near(LY.R_STARTER.at(-1), ENGINE_TERM.starter), detail: `${at3(LY.R_STARTER.at(-1))} on ${at3(ENGINE_TERM.starter)}` }) },
    hCables('LEZ-80-110'),
  ], { mat: '; 1/0 AWG (cabin runs) and 2 AWG (jumpers, starter lead) M22759/16 (welding-cable flexibility is not used: AC 43.13 aircraft wire)', cost: 140 });
export const TIPH_DEF = H('LEZ-33-110', 'Wingtip light harness, L and R',
  `Initial definition. Each side: twisted triad (position, strobe, ground) from the bus module through raceway LP, aft of the rear seat bulkhead, outboard of the baggage shelf into J's CS-spar systems tunnel, then C's systems conduit (wpC8 SYSC) through the jut-out to the root disconnect P331 / P332 in C's connector bay, along the wing conduit and out at its last bend to the light in the tip close-out (I-R10, J-F1).`,
  ['elec-vdrop', 'elec-mag', 'elec-emc', 'sup-bend-i'],
  [crossIfc('LEZ-33-110', ['rear seat bulkhead', 'instrument panel']),
    { id: 'I1', with: 'J\'s CS-spar systems tunnel (LEZ-57-140 rev G)', feature: 'bundle', what: 'Inside the spar only in the tunnel bore (Ø 0.80): offset + radius ≤ 0.40 in', check: () => { const S = SPAR_BOX(), ax = (p, sg) => { const a = [sg * LY.TUNNEL.fwd[0], LY.TUNNEL.fwd[1], LY.TUNNEL.fwd[2]], b = [sg * LY.TUNNEL.aft[0], LY.TUNNEL.aft[1], LY.TUNNEL.aft[2]]; return dPrim(p, { t: 'cyl', a, b, r: 0 }); };
      let w = 0; for (const r of pathsOf('LEZ-33-110')) { const sg = Math.sign(r.P.at(-1)[0]); for (let k = 0; k <= 400; k++) { const L = r.P, i = Math.min(L.length - 2, Math.floor(k / 400 * (L.length - 1))), t = k / 400 * (L.length - 1) - i, p = L[i].map((v, j) => v + (L[i + 1][j] - v) * t); if (p.every((v, j) => v > S.lo[j] && v < S.hi[j])) w = Math.max(w, ax(p, sg) + r.dIn / 2); } }
      return { ok: w <= LY.TUNNEL.d / 2, detail: `worst offset + radius in the spar ${fx(w)} in (bore ${LY.TUNNEL.d})` }; } },
    { id: 'I2', with: 'C\'s systems conduit (wpC8_cuts SYSC) and connector bay', feature: 'bundle', what: 'From the jut-out front wall to the conduit\'s last bend the run follows SYSC\'s polyline (≤ r − d/2); the disconnect in the bay', check: () => { const poly = [...SYSC.jut, ...SYSC.wing.slice(1)].map((q) => [q[1], q[0], q[2]]); let w = 0;
      for (const r of pathsOf('LEZ-33-110')) for (const p of r.P) { const a = Math.abs(p[0]); if (a < 12.9 || a > 145.9 || (a >= SYSC.bay.bl[0] && a <= SYSC.bay.bl[1] && p[1] >= SYSC.bay.fs[0] && p[1] <= SYSC.bay.fs[1])) continue; let d = Infinity; for (let k = 1; k < poly.length; k++) d = Math.min(d, dPrim([a, p[1], p[2]], { t: 'cyl', a: poly[k - 1], b: poly[k], r: 0 })); w = Math.max(w, d + r.dIn / 2); }
      const R = LY.ROOT, inBay = R.bl >= SYSC.bay.bl[0] && R.bl <= SYSC.bay.bl[1] && R.fs >= SYSC.bay.fs[0] && R.fs <= SYSC.bay.fs[1];
      return { ok: w <= SYSC.r && inBay, detail: `worst offset + radius ${fx(w)} in (conduit r ${SYSC.r}); disconnect at BL ±${R.bl}, FS ${R.fs} ${inBay ? 'in' : 'OUTSIDE'} the bay` }; } },
    { id: 'I5', with: 'J\'s COM coax and GMU 11 harness (LEZ-23-110 / -31-121, the aft lane)', feature: 'bundle', what: 'Option A: alone in the tunnel and C\'s conduit; the coax ≥ 2 in clear (power|rf) and the GMU harness ≥ 0.5 in clear (twisted triad alongside) everywhere, no exemption', check: () => { const J = ['LEZ-23-110', 'LEZ-31-121'].flatMap((p) => geoIn(p).filter((g) => g.t === 'cyl').map((g) => ({ ...g, pn: p }))), w = { com: Infinity, mag: Infinity };
      for (const r of pathsOf('LEZ-33-110')) for (const q of ['LEZ-23-110', 'LEZ-31-121']) { const c = runClear(r.P, r.dIn, J.filter((g) => g.pn === q)).c; w[q === 'LEZ-23-110' ? 'com' : 'mag'] = Math.min(w[q === 'LEZ-23-110' ? 'com' : 'mag'], c); }
      return { ok: w.com >= 2 && w.mag >= 0.5, detail: `COM coax ${fx(w.com)} in (≥ 2), GMU 11 harness ${fx(w.mag)} in (≥ 0.5)` }; } },
    { id: 'I3', with: 'LEZ-31-122 GMU 11 (block J)', feature: 'bundle', what: 'Field at the magnetometer within the allowance (elec-mag), with the harness in C\'s conduit', check: () => { const g = magField(), d = Math.min(...g.rows.map((r) => r.r)); return { ok: g.ms >= 0, detail: `${fx(g.B, 3)} µT (allow 0.25); nearest run ${fx(d, 1)} in` }; } },
    { id: 'I4', with: 'Other blocks\' parts (A wedge and tip, C bellcrank and conduit tunnels)', feature: 'bundle', what: '≥ 0.15 in from every other part\'s primitives outside the declared passes', check: () => { const B = ['LEZ-57-116', 'LEZ-25-140', 'LEZ-27-141', 'LEZ-27-142', 'LEZ-27-151', 'LEZ-57-130', 'LEZ-57-110'].flatMap((p) => geoIn(p)), w = Math.min(...pathsOf('LEZ-33-110').map((r) => runClear(r.P, r.dIn, B, (q) => Math.abs(q.p[0]) > 12.8 && Math.abs(q.p[0]) < 146).c)); return { ok: w >= 0.15, detail: `${fx(w)} in` }; } },
    open('O1', 'C (wpC8 SYSC)', 'a lined side port at the conduit\'s last bend (FS 190.5, BL ±145.8) where the harness leaves for the light'),
  ], { effectivity: 'Left and right (one set)', cost: 90, revs: [{ rev: 'B', date: '2026-11-19', short: 'Alone in the tunnel and conduit (option A)', change: 'Miles\'s decision (option A, "swap lanes"): J\'s COM coax and GMU 11 harness leave the CS-spar systems tunnel and C\'s systems conduit for their own aft lane (LEZ-57-140 rev H, LEZ-57-116 rev C, LEZ-57-110 rev E), so this harness runs alone in both, now on their axis (it sat 0.24 in above it beside J\'s runs); root disconnect P331 / P332 unchanged in C\'s bay. The 2 in power|rf and 0.5 in twisted-triad rules pass unmodified, with no exemption for the tunnel or the conduit (elec-emc, jemc-seg, the clash audit; I5).' }] });

// ============================================================================================ installations
const ifcFirewall = { id: 'I1', with: 'LEZ-53-180 firewall layout (block A rev B)', feature: 'install', what: 'Power boot, K2, GB2 and VR1 at A\'s layout positions (not on leg A)', check: () => {
  const p = FWL.find((L) => L.id === 'power'), b = Math.hypot(p.pts[0][0] - LY.BOOT.c[0], p.pts[0][1] - LY.BOOT.c[1]), r = [holesAt('start', LY.FW_LAYOUT.start), holesAt('gnd', LY.FW_LAYOUT.gnd), holesAt('ovr', LY.FW_LAYOUT.ovr)], pass = PASS.find((q) => q.id === 'fw-power');
  return { ok: b <= 0.01 && Math.abs(p.r - LY.BOOT.r) <= 0.001 && r.every((x) => x.ok) && !!pass, detail: `boot at (${fx(LY.BOOT.c[0])}, ${fx(LY.BOOT.c[1])}) r ${LY.BOOT.r} vs A (${p.pts[0].join(', ')}) r ${p.r}; K2 / GB2 / VR1 ${r.map((x) => (x.ok ? 'on' : 'OFF')).join(' / ')} the layout; pass 'fw-power' ${pass ? 'declared' : 'MISSING'}` }; } };
const ifcSpar = { id: 'I2', with: 'LEZ-57-140 CS spar (block J tunnel)', feature: 'install', what: 'No block I run inside the CS spar except in the declared systems tunnel', check: () => { const S = SPAR_BOX(), bad = [];
  for (const pn of ['LEZ-24-160', 'LEZ-24-161', 'LEZ-24-162', 'LEZ-24-165', 'LEZ-80-110']) for (const r of pathsOf(pn)) for (let i = 1; i < r.P.length; i++) for (let k = 0; k <= 20; k++) { const p = r.P[i - 1].map((v, j) => v + (r.P[i][j] - v) * k / 20); if (p.every((v, j) => v > S.lo[j] - r.dIn / 2 && v < S.hi[j] + r.dIn / 2) && p[2] > S.lo[2] - r.dIn / 2) { bad.push(`${pn} at ${at3(p)}`); break; } }
  return { ok: !bad.length, detail: bad.length ? bad.slice(0, 3).join('; ') : 'power and panel runs pass under the spar (WL < 35.17); the light harness only in the tunnel (LEZ-33-110 I1)' }; } };
const ifcIgn = { id: 'I3', with: 'LEZ-74-110 HT leads (block H)', feature: 'install', what: 'Engine-side power runs ≥ 0.5 in from the HT leads', check: () => { const B = geoIn('LEZ-74-110'), w = Math.min(...[LY.R_STARTER, LY.R_PWR_FW].map((P) => runClear(P, 0.42, B).c)); return { ok: w >= 0.5, detail: `${fx(w)} in` }; } };
export const INST_DEF = {
  pn: 'LEZ-24-100', rev: 'A', status: 'released', nha: 'LEZ-000 (aircraft)', qty: 1, install: true,
  title: 'Electrical power installation',
  revs: rev0('Initial definition. Mass was ASSUMED (0.8 lb, terminals, labels, ties, clamps); now the installation hardware lines: the firewall power boot at A\'s layout hole (shared with H\'s P-leads and GEA harness, G-O7), fire sleeve, the engine-side clamp mounts, firewall and shelf fasteners, inserts and dressing. Single-point ground at the battery − post with the engine grounded at E1 (G-O6).'),
  effectivity: 'One per aircraft', params: { lines: INSTALL_HW.map((l) => [l.std, l.qty, l.each]) }, datums: [],
  features: [{ id: 'install', kind: 'joint', label: `14 V single-bus system with an essential bus: ${EQUIP.filter((e) => /^(BT1|K1|K2|F1|F2|F3|D1|CB1|CB2|GB1|GB2|VR1)$/.test(e.ref)).length} power items, ${WIRES.filter((x) => ['LEZ-24-160', 'LEZ-24-161', 'LEZ-24-162', 'LEZ-24-165', 'LEZ-80-110', 'LEZ-33-110'].some((h) => [].concat(x.harness).includes(h))).length} block I wires`, tol: 'Wire list governs' }],
  tolerances: { general: 'Torque per AC 43.13-1B; terminals per AS50881' }, drawingNotes: [`Engine-side clamps at ${ENG_CLAMPS.map(([w, p]) => `${w} FS ${fx(p[1], 1)}`).join(', ')} on angle brackets under crankcase bolts (block G to confirm).`, 'Fire sleeve from the boot to the first engine clamp on the starter cable and the B-lead.'],
  na: { cut: 'Installation', layup: 'Installation' },
  material: { spec: 'Installation hardware: AN / MS / NAS fasteners, CRES boot plate, AE102 fire sleeve, 3M Fire Barrier sealant', alt: '—', form: 'bought hardware', density: null, allowables: [['Hardware each-masses', 'per line', 'BOUND: not found in public sources (second research pass running)']] },
  process: [{ op: 'Firewall', spec: 'Fit the boot, K2, GB2 and VR1 at A\'s layout holes with fire-sealant.' }, { op: 'Cabin', spec: 'Shelf and battery, K1, bus module, sub-panel; lay the harnesses in the raceways; clamp.' }, { op: 'Engine', spec: 'Clamp brackets under the crankcase bolts; starter cable and B-lead in fire sleeve with their service bows; strap to E1.' }, { op: 'Test', spec: 'Continuity, insulation, bus voltages; essential bus with the master off and ESS ALT on.' }],
  checks: ['elec-load', 'elec-ess', 'elec-emc'], rules: [],
  mass: { each: hwMass(INSTALL_HW), from: 'hardware lines' }, hardware: INSTALL_HW, hardwareNote: INSTALL_HW.map((l) => `${l.qty} × ${l.std}`).join('; '),
  interfaces: [ifcFirewall, ifcSpar, ifcIgn, ifcH,
    open('O1', 'H', 'key-switch magneto ground: H\'s N40A18 (S1:T:G to GB1) is adopted in place of this block\'s N5A18 (to GB2); keep it in the star ground'),
    open('O2', 'G', 'confirm the crankcase bolts for the six engine-side clamp brackets'),
    open('O3', 'J', 'confirm the GMU 11 allowance and the AXIS A / B bus split (the COM coax shares nothing with the light harness since option A: closed)'),
  ],
  tooling: { needed: false, text: 'None beyond the harness boards (harness records).' },
  sourcing: { blank: 'Bought hardware', ...src('Aircraft Spruce (AN / MS hardware, fire sleeve, sealant, CRES sheet)', 120), perAircraft: 1 },
};
const supLines = (ext) => SUPPORT_HW(ext);
export const SUP_DEF = {
  pn: 'LEZ-20-100', rev: 'B', status: 'released', nha: 'LEZ-000 (aircraft)', qty: 1, install: true,
  title: 'Wire and line supports (inside)',
  revs: [...rev0(`Initial definition. Mass was ASSUMED (0.006 lb a clamp). Now the hardware lines by dash size with clamp, screw, nutplate and standoff. The right raceway clamp at FS 87.6 now sits at BL ≥ 10.5 (B's ask); LP is at WL 35.04, LS at WL 37.44.`),
    { rev: 'B', date: '2026-11-19', short: 'Aft-lane conduit; brake-line span', change: 'Option A (Miles): the aft systems lane\'s nylon conduit (both sides: CS spar low tunnel, jut-out lane, wing panels) and the GMU 11 side-port grommet are hardware lines here, with their mass (nylon density typed). A clamp slid off a bulkhead plane no longer leaves a span over the rule: an extra clamp goes into that span (block D\'s brake lines at the panel, 9.73 in against 9 in; R-ROUTE-1).' }],
  effectivity: 'One set per aircraft', params: { lines: supLines(false).map((l) => [l.std, l.qty, l.each]) }, datums: [],
  features: [{ id: 'install', kind: 'joint', label: `${CLAMPS.filter((c) => !c.ext).length} clamps: raceways ${Object.values(RACEWAYS).map((r) => `${r.name} WL ${fx(r.z * 12, 2)}`).join(', ')}; individual runs at ≤ 0.9 × their span rule`, tol: 'Clamp station ±1 in' }],
  tolerances: { general: 'Clamp spacing ≤ the span rule; clamps snug on the bundle with the cushion' }, drawingNotes: ['Clamp stations as the routed model (wp12 CLAMPS).'], na: { cut: 'Installation', layup: 'Installation' },
  material: { spec: 'MS21919WDG cushion clamps (nitrile), MS27039 screws, MS21047 nutplates on bonded G-10 standoffs', alt: 'Equivalent cushion clamps', form: 'bought hardware', density: null, allowables: [['Each-masses', 'per line', 'BOUND: not found in public sources (second research pass running)']] },
  process: [{ op: 'Standoffs', spec: 'Bond the G-10 standoffs with flox at the clamp stations; fit nutplates.' }, { op: 'Clamp', spec: 'Lay the bundles; clamp.' }],
  checks: ['sup-span-i', 'sup-bend-i'], rules: [],
  mass: { each: hwMass(supLines(false)), from: 'hardware lines' }, hardware: supLines(false), hardwareNote: supLines(false).map((l) => `${l.qty} × ${l.std}`).join('; '),
  interfaces: [
    { id: 'I1', with: 'Every routed run', feature: 'install', what: 'Each run clamp sits on its run (≤ 0.01 in from the polyline)', check: () => { const bad = CLAMPS.filter((c) => c.run && !c.ext).filter((c) => { const [pn, i] = c.run.split('#'), g = partByPN(pn)?.geo.filter((q) => q.t === 'path' && q.cls)[+i]; if (!g) return true; const P = g.pts.map(IN), p = IN(c.at); let d = Infinity; for (let k = 1; k < P.length; k++) d = Math.min(d, dPrim(p, { t: 'cyl', a: P[k - 1], b: P[k], r: 0 })); return d > 0.01; }); return { ok: !bad.length, detail: `${CLAMPS.filter((c) => c.run && !c.ext).length} run clamps${bad.length ? `; OFF ${bad.length}` : ', all on their runs'}` }; } },
    { id: 'I2', with: 'LEZ-25-110 / -120 seats and consoles (block B)', feature: 'install', what: 'RS clamps at BL ≥ 10.5 alongside the front seat back (B\'s ask)', check: () => PNLH_DEF.interfaces.find((f) => f.id === 'I4').check() },
    { id: 'I3', with: 'LEZ-53-150 shell', feature: 'install', what: 'Every inside clamp inside the shell', check: () => { const out = CLAMPS.filter((c) => !c.ext && !insideFus(c.at[0], c.at[1], c.at[2], 0) && !insideOML(c.at)); return { ok: !out.length, detail: out.length ? `${out.length} outside, e.g. ${at3(IN(out[0].at))}` : 'all inside' }; } },
  ],
  tooling: { needed: false, text: 'None.' },
  sourcing: { blank: 'Bought hardware', ...src('Aircraft Spruce (MS21919 clamps, nutplates, G-10)', 260), perAircraft: 1 },
};
export const CLIP_DEF = {
  pn: 'LEZ-20-110', rev: 'A', status: 'released', nha: 'LEZ-000 (aircraft)', qty: 1, install: true,
  title: 'Line clips outside the skin',
  revs: rev0('Initial definition. Mass was ASSUMED; now the hardware lines (clamp, screw, bonded G-10 tab).'),
  effectivity: 'One set per aircraft', params: { lines: supLines(true).map((l) => [l.std, l.qty, l.each]) }, datums: [],
  features: [{ id: 'install', kind: 'joint', label: `${CLAMPS.filter((c) => c.ext).length} clips on the runs' external segments`, tol: 'Clip station ±1 in' }],
  tolerances: { general: 'Clip spacing ≤ the span rule' }, drawingNotes: [], na: { cut: 'Installation', layup: 'Installation' },
  material: { spec: 'MS21919WDG cushion clamps on bonded G-10 tabs, MS27039 screws', alt: '—', form: 'bought hardware', density: null, allowables: [['Each-masses', 'per line', 'BOUND: not found in public sources (second research pass running)']] },
  process: [{ op: 'Tabs', spec: 'Bond the tabs with flox at the clip stations.' }, { op: 'Clip', spec: 'Clip the lines.' }],
  checks: ['sup-span-i'], rules: [],
  mass: { each: hwMass(supLines(true)), from: 'hardware lines' }, hardware: supLines(true), hardwareNote: supLines(true).map((l) => `${l.qty} × ${l.std}`).join('; '),
  interfaces: [{ id: 'I1', with: 'External run segments (blocks D, I, J)', feature: 'install', what: 'Each clip on an external run segment', check: () => { const cs = CLAMPS.filter((c) => c.ext), bad = cs.filter((c) => !c.run); return { ok: cs.length > 0 && !bad.length, detail: `${cs.length} clips on ${[...new Set(cs.map((c) => c.run.split('#')[0]))].join(', ')}` }; } }],
  tooling: { needed: false, text: 'None.' },
  sourcing: { blank: 'Bought hardware', ...src('Aircraft Spruce (MS21919 clamps)', 25), perAircraft: 1 },
};
export { KEY, RHO };
