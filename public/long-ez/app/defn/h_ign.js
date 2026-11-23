// Block H definition records, ATA 74 ignition: LEZ-74-100 key switch and cabin P-lead harness, LEZ-74-110 ignition
// harness, LEZ-74-120 spark plugs, LEZ-74-130 magneto P-leads. Geometry from parts/wpH1_layout.js and wpH2_runs.js;
// solids by cad/g_prims.py. Notional; vendor data typed from memory are marked.
import { partByPN, EQUIP, WIRES, PASS } from '../systems.js';
import { CUTS } from '../parts/wpB3_panel.js';
import { ptsOf, fwCrossing, P3, pathLen } from '../parts/wpH0_route.js';
import * as LY from '../parts/wpH1_layout.js';
import { RUNS } from '../parts/wpH2_runs.js';
import * as PR from '../parts/wpH4_prims.js';
import { fx, rev0, rec, massFrom, near } from './h_common.js';

const wire = (id) => WIRES.find((w) => w.id === id);
const inBoot = (pn, i) => { const q = fwCrossing(ptsOf(RUNS[pn][i])), d = Math.hypot(q[0] - LY.BOOT.c[0], q[1] - LY.BOOT.c[1]) + RUNS[pn][i].od / 2; return { ok: d <= LY.BOOT.r - 0.25, detail: `crosses FS 153 at BL ${fx(q[0])}, WL ${fx(q[1])}: ${fx(d)} in from the boot centre (Ø ${2 * LY.BOOT.r}, ≥ 1/4 in to its edge)` }; };
const runLen = (pn) => RUNS[pn].reduce((a, r) => a + pathLen(ptsOf(r)), 0);

// ------------------------------------------------------------------------------------------- LEZ-74-100
const KP = PR.keyParams(), keyCut = () => CUTS.find((c) => c.id === 'key');
export const KEY_DEF = rec({
  pn: 'LEZ-74-100', nha: 'LEZ-24-100', qty: 1, kind: 'cots', title: 'Key switch and cabin P-lead harness',
  revs: rev0(`Initial definition. The switch had no ground terminal (H-F11), sat 0.11 in from the left rudder conduit and its harness head was 2.24 in from it (H-F10, F12); the P-leads crossed the firewall through left leg A. As defined: an OFF-R-L-BOTH-START magneto switch with a grounding terminal G wired to the cabin ground block, on block B's panel cut-out (BL ${LY.KEYSW.c[0]}, WL ${LY.KEYSW.c[1]}); the harness leaves the left signal raceway at FS 141.8, drops under the centre-section spar and passes the firewall in block A's power boot. L and R follow the engine maker's names: L is the engine-left (impulse) magneto on the aircraft's right.`),
  params: KP, datums: [{ id: 'A', what: 'Panel aft face, FS 41.18' }, { id: 'B', what: 'Key axis (block B cut-out centre)' }],
  features: [
    { id: 'switch', kind: 'envelope', label: `Switch body Ø ${LY.KEYSW.body.d} × ${LY.KEYSW.body.L} in behind the panel; terminals BAT, L, R, S, G on its forward end (ACS A-510-2, ACS 11-03170: 2.28 in long, 2.23 in widest, 7/8 in notched hole, 0.209 lb; Aircraft Spruce, accessed 2026-11-19)`, tol: 'Vendor' },
    { id: 'bushing', kind: 'boss', label: `Threaded bushing Ø ${LY.KEYSW.bushing.d}, ${LY.KEYSW.bushing.grip} in grip; bezel nut on the panel face; panel counterbored Ø ${LY.KEYSW.spot.d} × ${LY.KEYSW.spot.depth} deep from the aft (pilot) face (block B)`, tol: 'Spot-face ±0.010 deep' },
    { id: 'harness', kind: 'harness', label: `Harness: 2 × M27500-18TG1T14 P-leads, P8B20 START, N40A18 ground; ${fx(runLen('LEZ-74-100'), 0)} in from the switch to the boot clamp`, tol: 'Route ±1/4 in' },
  ],
  tolerances: { general: 'Route ±1/4 in; key axis on the cut-out ±0.02 in', breakEdges: '—' },
  drawingNotes: ['P-lead shields floated (trimmed and sleeved) at the switch; grounded at the magneto end only (LEZ-74-130).', 'Switch positions OFF-R-L-BOTH-START: OFF grounds both P-leads to G; START grounds the right magneto (no impulse coupling) and energises S.', 'Crossings moved: the firewall at the power boot (block A layout); FS 130.2, the seat back and the panel unchanged.'],
  generalNote: 'Mag check: each position grounds the named magneto; hot-mag check at idle (engine stops in OFF).',
  na: { cut: 'Bought-in switch; harness made on the board', layup: 'Not a composite part' },
  material: { spec: 'Magneto / start switch, ACS A-510-2 (11-03170) with a ground terminal, START contact 2 A (drives the start relay K3), 7/8 in notched panel hole (Aircraft Spruce, accessed 2026-11-19; max panel thickness not stated: BOUND); M27500-18TG1T14 shielded wire, M22759/16 wire, MS25036 ring terminals', alt: 'Any magneto / start switch with OFF-R-L-BOTH-START and a G terminal', form: 'bought switch, harness built to the wire list', density: null, allowables: [['START contacts', '10 A (typed)', 'VENDOR'], ['Magneto contacts', '3 A (typed)', 'VENDOR']] },
  process: [{ op: 'Harness', spec: 'Build on the board from the wire list (K1A18, K2A18, P8B20, N40A18); lace; label both ends.' }, { op: 'Install', spec: 'Switch through the 7/8 in notched hole from behind, body on the forward face, bezel nut in the pilot-face counterbore, bezel nut torqued per the vendor; route along raceway LS; clamp every 18 in or less; boot at the firewall.' }],
  checks: ['ign-route', 'key-sw'],
  mass: { each: massFrom(KP, PR.KEY_RHO()), from: `switch ${LY.KEYSW.lb} lb (Aircraft Spruce 11-03170, accessed 2026-11-19) + the harness at ${fx(PR.KEY_LB.harnessLbFt, 3)} lb/ft over the solid` },
  hardware: [{ std: 'MS25036-153', qty: 6, desc: 'ring terminals at the switch', each: 0.001 }, { std: 'MS21919WDG4', qty: 8, desc: 'cushion clamps (tail, below the spar)', each: 0.006 }],
  hardwareNote: 'Ring terminals at the switch; clamps on the raceway (LEZ-20-100) and 8 on the tail below the spar.',
  interfaces: [
    { id: 'I1', with: 'LEZ-31-100 panel (block B) key cut-out', feature: 'bushing', what: 'Key on the cut-out; bushing grip ≥ the panel at the spot-face', check: () => { const c = keyCut(), d = Math.hypot(c.circ[0] - LY.KEYSW.c[0], c.circ[1] - LY.KEYSW.c[1]), t = LY.KEYSW.panelT - LY.KEYSW.spot.depth; return { ok: d < 0.02 && LY.KEYSW.bushing.d / 2 <= c.circ[2] && t <= LY.KEYSW.bushing.grip, detail: `axis ${fx(d, 3)} in from B's Ø ${fx(2 * c.circ[2])} cut-out; panel ${fx(LY.KEYSW.panelT, 3)} in less a ${LY.KEYSW.spot.depth} in pilot-face counterbore = ${fx(t, 3)} in ≤ ${LY.KEYSW.bushing.grip} grip` }; } },
    { id: 'I2', with: 'LEZ-24-140 cabin ground block (block I)', feature: 'switch', what: 'G terminal wired: OFF grounds both P-leads', check: () => { const w = wire('N40A18'); return { ok: !!w && /^GB1:J:/.test(w.to), detail: w ? `${w.id} ${w.from} → ${w.to}, ${fx(w.len, 1)} ft` : 'no ground wire' }; } },
    { id: 'I3', with: 'LEZ-71-210 magnetos (engine maker\'s names)', feature: 'harness', what: 'L to the engine-left (impulse) magneto, R to the right', check: () => { const a = wire('K1A18'), b = wire('K2A18'); return { ok: a?.to.startsWith(`${LY.MAGS.L.ref}:`) && b?.to.startsWith(`${LY.MAGS.R.ref}:`), detail: `S1:L → ${a?.to} (${EQUIP.find((e) => e.ref === LY.MAGS.L.ref)?.name}); S1:R → ${b?.to}` }; } },
    { id: 'I4', with: 'LEZ-53-180 firewall power boot (blocks A, I)', feature: 'harness', what: 'Crossing inside the boot', check: () => inBoot('LEZ-74-100', 0) },
    { id: 'I5', with: 'LEZ-27-151 left rudder conduit (block C)', feature: 'switch', what: 'Switch body clear of the conduit by ≥ 0.25 in', check: () => { const g = partByPN('LEZ-27-151')?.geo.find((q) => q.t === 'path'); if (!g) return { ok: true, detail: 'no conduit record' }; const pts = g.pts.map(P3), k = [LY.KEYSW.c[0], LY.KEY_TERM[1], LY.KEYSW.c[1]]; let d = Infinity; for (const p of pts) d = Math.min(d, Math.hypot(p[0] - k[0], p[2] - k[2]) - LY.KEYSW.body.d / 2); return { ok: d >= 0.25, detail: `${fx(d)} in (BL / WL, at the conduit's route points)` }; } },
  ],
  sourcing: { blank: 'Switch; 12 ft M27500-18TG1T14, 10 ft M22759/16-20 and -18', vendor: 'Aircraft Spruce (ACS A-510-2 key switch, M27500 wire)', url: 'https://www.aircraftspruce.com/', cost: 256, costAsOf: '2026-11-19', perAircraft: 1, lead: 'Stock', note: 'Prices approximate, typed from memory.' },
});

// ------------------------------------------------------------------------------------------- LEZ-74-110
const HP = PR.harnessParams();
export const HARN_DEF = rec({
  pn: 'LEZ-74-110', nha: 'LEZ-71-200', qty: 1, kind: 'harness', title: 'Ignition harness, 8 shielded leads',
  revs: rev0(`Initial definition. The lead origins were 0.6 in off the released magneto envelope (H-F2). As defined: eight shielded leads from the rev B harness caps (LEZ-71-210) to the plugs, towers in the firing order ${LY.FIRING.join('-')}; the left magneto fires the tops of 1 and 3 and the bottoms of 2 and 4, the right the rest (engine maker's names).`),
  params: HP, datums: [{ id: 'A', what: 'Magneto harness caps (LEZ-71-210 rev B)' }],
  features: [
    { id: 'top', kind: 'harness', label: 'Top-plug leads (4): cap → bracket over the crankcase → down between the cylinders; fire sleeve over the last 8 in', tol: 'Route ±1/4 in' },
    { id: 'bottom', kind: 'harness', label: 'Bottom-plug leads (4): approach the plugs from below and ahead, 1.25 in or more from the flanges and stacks, fire-sleeved', tol: 'Route ±1/4 in' },
  ],
  drawingNotes: [`Towers: each magneto's tower 1–4 fires cylinders in the order ${LY.FIRING.join('-')} (typed from memory: the harness maker's drawing governs).`, 'Clamp at every route point; no lead on a fin or a rocker cover.'],
  generalNote: 'Harness tester: no leakage on any lead; time both magnetos to the data plate.',
  na: { cut: 'Bought harness, made to length', layup: 'Not a composite part' },
  material: { spec: 'ACS 12304-33 (mfr 08-17287) Slick-type O-235 harness: 5 mm shielded wire, two caps, eight leads, 5/8-24 plug terminals, fits Slick 4370 / 4371 (Aircraft Spruce, accessed 2026-11-19; not FAA-approved, acceptable for amateur-built; 30 kV rating not found: BOUND); AS1072 fire sleeve', alt: 'Factory harness for the O-235 with these lengths', form: 'bought harness', density: null, allowables: [['Lead rating', '30 kV (typed)', 'VENDOR']] },
  process: [{ op: 'Install', spec: 'Fit the caps on the magnetos; route the leads on the clamps; lead nuts 5/8-24 to 80–90 in-lb (Lycoming SI 1042AI, accessed 2026-11-19).' }],
  checks: ['ign-route'],
  mass: { each: massFrom(HP, PR.HARNESS_RHO), from: `leads at ${PR.LEAD_LBFT} lb/ft (typed) over the solid` },
  hardware: [{ std: 'MS21919WDG5', qty: 20, desc: 'cushion clamps on the engine', each: 0.006 }, { std: 'AS1072 fire sleeve', qty: 8, desc: '8 in over each lead end', each: 0.01 }], hardwareNote: '20 cushion clamps; fire sleeve on every lead end.',
  interfaces: [
    { id: 'I1', with: 'LEZ-71-210 magneto caps and LEZ-74-120 plugs', feature: 'top', what: 'Each lead from its magneto\'s cap to its plug', check: () => { const rs = RUNS['LEZ-74-110']; const bad = rs.filter((r) => near(ptsOf(r)[0], LY.CAP(r.mag)) > 0.01 || near(ptsOf(r).at(-1), LY.PLUG_AT(r.k, r.top).p) > 0.6); return { ok: !bad.length, detail: `${rs.length} leads; ${bad.length} off` }; } },
    { id: 'I2', with: 'LEZ-71-210 magnetos: towers in the firing order', feature: 'top', what: 'Tower k fires the k-th cylinder of 1-3-2-4', check: () => { const ok = Object.entries(LY.MAGS).every(([s, M]) => [1, 2, 3, 4].every((t) => { const w = WIRES.find((x) => x.from === `${M.ref}:T:${t}`), n = LY.FIRING[t - 1]; return w && w.to.startsWith(`SP${n}`); })); return { ok, detail: 'MG1 / MG2 towers 1–4 → cylinders 1, 3, 2, 4' }; } },
  ],
  sourcing: { blank: 'Harness set for an O-235 (four-cylinder, 18 mm plugs)', vendor: 'Aircraft Spruce (Champion / Slick ignition harness)', url: 'https://www.aircraftspruce.com/', cost: 199.85, costAsOf: '2026-11-19', perAircraft: 1, lead: 'Stock', note: 'Typed from memory.' },
});

// ------------------------------------------------------------------------------------------- LEZ-74-120
const SP = PR.plugParams();
export const PLUG_DEF = rec({
  pn: 'LEZ-74-120', nha: 'LEZ-74-110', qty: 8, kind: 'cots', title: 'Spark plug, 18 mm', effectivity: 'Eight per aircraft (two per cylinder)',
  revs: rev0('Initial definition: eight 18 mm massive-electrode plugs from the engine maker\'s approved list, on the cylinder envelope at the model\'s plug points, named by cylinder (1–4, Lycoming).'),
  params: SP, datums: [{ id: 'A', what: 'Plug seat on the cylinder head' }],
  features: [{ id: 'thread', kind: 'thread', label: `18 mm × 1.5 thread, ${LY.PLUG.reach} in reach`, tol: 'Vendor' }, { id: 'hex', kind: 'hex', label: `${LY.PLUG.hex} in hex`, tol: 'Vendor' }, { id: 'body', kind: 'envelope', label: `Insulator and 5/8-24 terminal well, Ø ${2 * LY.PLUG.bodyR} × ${LY.PLUG.bodyL} in`, tol: 'Vendor' }],
  tolerances: { general: 'Vendor part; gap per the operator\'s manual', breakEdges: '—' },
  drawingNotes: ['Heat range and gap per Lycoming SI 1042AI (approved plugs; REM37BY / REM38E, accessed 2026-11-19).', 'Torque 420 in-lb (35 ft-lb) with anti-seize on the threads; lead nuts 80–90 in-lb (Lycoming SI 1042AI, accessed 2026-11-19).'],
  na: { cut: 'Bought-in', layup: 'Bought-in' },
  material: { spec: 'Aviation spark plug, 18 mm, massive electrode (Champion REM37BY, Lycoming SI 1042AI approved list, accessed 2026-11-19)', alt: 'Tempest UREM37BY', form: 'bought', density: null, allowables: [['Weight', `${LY.PLUG.lb} lb each (conservative end; SkyGeek shipping weight, accessed 2026-11-19)`, 'VENDOR']] },
  process: [{ op: 'Install', spec: 'New gasket; anti-seize on the thread; torque 420 in-lb; lead nut 80–90 in-lb (SI 1042AI).' }],
  checks: [],
  mass: { each: massFrom(SP, PR.PLUG_RHO()) / 8, from: `envelope at ${LY.PLUG.lb} lb each (conservative end of the vendor shipping weight, accessed 2026-11-19)` },
  hardware: [{ std: 'Copper plug gasket (18 mm)', qty: 8, desc: 'one per plug', each: 0.005 }], hardwareNote: 'One gasket per plug.',
  interfaces: [{ id: 'I1', with: 'LEZ-71-210 cylinders, LEZ-74-110 leads', feature: 'thread', what: 'Seat on the head; equipment SPnT / SPnB at the seat', check: () => { const bad = ['LF', 'RF', 'LR', 'RR'].flatMap((k) => [true, false].filter((top) => { const e = EQUIP.find((q) => q.ref === `SP${LY.CYL_NO[k]}${top ? 'T' : 'B'}`); return !e || near(P3(e.at), LY.PLUG_AT(k, top).p) > 0.01; })); return { ok: !bad.length, detail: `8 plugs; ${bad.length} off their seats` }; } }],
  sourcing: { blank: '8 plugs', vendor: 'Aircraft Spruce (Champion REM37BY)', url: 'https://www.aircraftspruce.com/', cost: 42.5, costAsOf: '2026-11-19', perAircraft: 8, lead: 'Stock', note: 'Each; $41.65 each in a box of 12 (Aircraft Spruce REM37BY, accessed 2026-11-19).' },
});

// ------------------------------------------------------------------------------------------- LEZ-74-130
const PP = PR.pleadParams();
export const PLEAD_DEF = rec({
  pn: 'LEZ-74-130', nha: 'LEZ-74-100', qty: 1, kind: 'harness', title: 'Magneto P-leads, firewall to magnetos',
  revs: rev0('Initial definition. The terminals were 0.25 in off the released magneto envelope and the leads left the cabin harness aft of the firewall (H-F2, F22). As defined: from the boot clamp on the firewall to the rev B P-lead terminal posts on each magneto, with a service loop for the engine motion and a clamp on each magneto flange; shields grounded at the magneto end only.'),
  params: PP, datums: [{ id: 'A', what: 'Boot clamp, FS 153.7' }, { id: 'B', what: 'Magneto P-lead terminal posts (LEZ-71-210 rev B)' }],
  features: [{ id: 'left', kind: 'harness', label: 'Left magneto (engine left, aircraft right) P-lead: across forward of the filter, outboard of the magneto, up to its terminal', tol: 'Route ±1/4 in' }, { id: 'right', kind: 'harness', label: 'Right magneto P-lead: outboard along the left bracket, up to its terminal', tol: 'Route ±1/4 in' }],
  drawingNotes: ['Shield pigtail under the terminal\'s ground screw at the magneto; shield floated at the panel end (LEZ-74-100).', 'Service loop between the boot clamp and the magneto clamp; nothing tied across it.'],
  na: { cut: 'Made to length from the wire', layup: 'Not a composite part' },
  material: { spec: 'M27500-18TG1T14 shielded wire; magneto P-lead terminal (typed: Slick spring-and-ferrule)', alt: '—', form: 'wire', density: null, allowables: [] },
  process: [{ op: 'Terminate', spec: 'Ferrule and spring at the terminal; shield to the ground screw; continuity and insulation test.' }],
  checks: ['ign-route'],
  mass: { each: massFrom(PP, PR.PLEAD_RHO), from: 'wire and sleeve at 0.020 lb/ft (typed) over the solid' },
  hardware: [{ std: 'MS21919WDG3', qty: 4, desc: 'cushion clamps (magneto flanges, bracket)', each: 0.005 }], hardwareNote: '4 cushion clamps.',
  interfaces: [
    { id: 'I1', with: 'LEZ-71-210 rev B P-lead terminals', feature: 'left', what: 'Each lead ends on its terminal post', check: () => { const d = [1, -1].map((sg, i) => near(ptsOf(RUNS['LEZ-74-130'][i]).at(-1), LY.PTERM(sg).b)); return { ok: Math.max(...d) < 0.01, detail: `${d.map((x) => fx(x, 3)).join(' / ')} in` }; } },
    { id: 'I2', with: 'LEZ-74-100 harness (shielding)', feature: 'right', what: 'Shield grounded at the magneto end only', check: () => { const ok = ['K1A18', 'K2A18'].every((id) => /magneto end only/.test(wire(id)?.spec || '')); return { ok, detail: 'K1A18, K2A18 M27500 shield: magneto end' }; } },
    { id: 'I3', with: 'LEZ-53-180 power boot', feature: 'left', what: 'Starts at the boot clamp aft of the boot', check: () => { const p = ptsOf(RUNS['LEZ-74-130'][0])[0], q = ptsOf(RUNS['LEZ-74-100'][0]).at(-1); return { ok: near(p, q) < 0.01 && !!PASS.find((x) => x.id === 'fw-boot-h'), detail: `boot clamp at BL ${fx(p[0])}, FS ${fx(p[1])}, WL ${fx(p[2])}` }; } },
  ],
  sourcing: { blank: '3 ft M27500-18TG1T14; 2 P-lead terminal kits', vendor: 'Aircraft Spruce', url: 'https://www.aircraftspruce.com/', cost: 40, costAsOf: '2026-11-18', perAircraft: 1, lead: 'Stock', note: 'Typed from memory.' },
});
