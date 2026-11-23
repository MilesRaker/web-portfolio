// Block G propeller group definition records: LEZ-61-100 propeller (bought-in wood, 57 in), LEZ-61-110 prop extension
// (6061-T6, 8 in) and LEZ-61-120 spinner. Numbers from parts/wpG2_prop.js; solids by cad/g_prims.py. Notional.
import { GEO } from '../structures.js';
import { ENG } from '../parts/wp1_powerplant.js';
import { FLANGE, RHO } from '../parts/wpG1_engine.js';
import { PX, AL_BAR, WOOD, extPrims, propPrims, spinPrims, propInertia, groundClear, discClear, FAR925 } from '../parts/wpG2_prop.js';
import { pickAN } from '../parts/wp16_wing_attach.js';
import { tidy, primsExpect, massOfPrims } from './g_prims.js';

const fx = (x, n = 2) => x.toFixed(n), DATE = '2026-11-18';
const D6 = 3 / 8;   // AN6 / MS21042L6 (SAE No. 1 bolts)
const boltLb = (L) => RHO.steel * (Math.PI * (D6 / 2) ** 2 * (L + 3 / 32) + 0.866 * (1.5 * D6) ** 2 * 0.62 * D6), nutLb = RHO.steel * 0.866 * (1.5 * D6) ** 2 * 0.75 * D6 * 0.55;

// ------------------------------------------------------------------------------------------- LEZ-61-100 propeller
export const propParams = () => ({ frame: 'aircraft', prims: propPrims().map(tidy) });
const PP = propParams(), PROP_RHO = { wood: WOOD.rho, al: AL_BAR.rho };
const propStack = PX.blk.t + PX.crush.t + PX.hub.L + PX.bp.t + PX.ext.flT, propBolt = pickAN(6, propStack + 2 * 0.063);
const PI_ = propInertia();
export const PROP_DEF = {
  pn: 'LEZ-61-100', rev: 'A', status: 'released', nha: 'LEZ-71-200', qty: 1, kind: 'cots',
  title: `Propeller, fixed-pitch wood, ${fx(2 * PX.blade.tipR, 0)} in (bought-in)`,
  revs: [{ rev: 'A', date: DATE, short: 'Initial definition, 57 in', change: `Initial definition. The 62 in prop left 4.74 in to the ground, short of the 7 in FAR 23.925(a)(1) yardstick for nose-wheel aircraft (ICD G-F9). The diameter is now ${fx(2 * PX.blade.tipR, 0)} in (tip ${fx(groundClear().c)} in above the ground); mass was ASSUMED (9 lb), now the envelope × wood density. Hub ${PX.hub.L} in thick on six 4130 drive bushings, a ${PX.crush.t} in crush plate and six AN7 bolts.` }],
  effectivity: 'One per aircraft', params: PP,
  datums: [{ id: 'A', what: 'Hub forward face (on the spinner backplate)' }, { id: 'B', what: 'Crankshaft centre line' }],
  features: [
    { id: 'hub', kind: 'hub', label: `Hub ${PX.hub.w} × ${PX.hub.w} × ${PX.hub.L} in, six Ø ${2 * PX.bush.ro} bores on the Ø ${PX.bc} circle for the drive bushings and AN6 bolts (SAE No. 1)`, tol: 'Bores per the prop maker, matched to the extension' },
    { id: 'blade', kind: 'envelope', label: `Two blades, root ${PX.blade.rootC} × ${PX.blade.rootT} in at r ${PX.blade.rootZ}, tip ${PX.blade.tipC} × ${PX.blade.tipT} in at r ${PX.blade.tipR} (envelope; twist and airfoil the maker's)`, tol: 'Track ≤ 1/16 in' },
    { id: 'crush', kind: 'plate', label: `Crush plate Ø ${2 * PX.crush.r} × ${PX.crush.t} in 6061-T6 under the bolt heads`, tol: '±0.010' },
  ],
  tolerances: { general: 'Bought-in: the maker\'s drawing governs; envelope only', breakEdges: '—' },
  drawingNotes: [`Blade centre plane at FS ${fx(PX.yBp + PX.hub.L / 2)}, ${fx(PX.yBp + PX.hub.L / 2 - GEO.prop.s * 12)} in aft of the model's prop station; the clearance checks use the blade envelope.`, 'Pitch to be set by the prop maker for the O-235-C2C at 2,800 rpm on a Long-EZ pusher (static and cruise rpm to the maker\'s figures).'],
  generalNote: 'Prop bolts 175–225 in-lb plus the self-locking nut\'s drag (AN6; Sensenich WOOD-CF-REV-B Table 1); re-torque after the first flight, after 25 h, every 50 h and on big seasonal changes; tips track within 1/16 in (Sensenich: 1/8). A front (crush) plate, Aircraft Spruce 10351 SAE 1, is required with a wood prop.',
  na: { cut: 'Bought-in', layup: 'Bought-in' },
  material: { spec: `Laminated hard-maple or birch wood propeller with a leading-edge erosion strip; ${WOOD.spec}`, alt: 'Composite fixed-pitch pusher prop of the same diameter and hub', form: 'bought complete', density: WOOD.rho,
    allowables: [['Wood density', '0.0243 lb/in³', 'typed from memory'], ['Wood bearing on the bushings', '1,500 psi', 'BOUND (design value)']] },
  process: [{ op: 'Receive', spec: 'Check diameter, pitch marking, balance; no splits or delamination.' }, { op: 'Install', spec: `Backplate, hub over the bushings, crush plate, spinner bulkhead; ${propBolt.std} × 6 with safety-wired or self-locking nuts; torque 175–225 in-lb + nut drag (Sensenich WOOD-CF-REV-B Table 1), evenly in a star pattern.` }, { op: 'Track', spec: 'Track the tips to ≤ 1/16 in; balance dynamically if a balancer is available.' }],
  checks: ['prop-ground', 'prop-clear', 'prop-drive', 'gear-prop'],
  rules: [{ id: 'grip', label: 'Prop bolt grip covers the stack', v: propBolt.grip / (propStack + 0.126), min: 1 }, { id: 'tip', label: `Tip ground clearance ≥ ${FAR925} in (FAR 23.925(a)(1) yardstick, typed)`, v: groundClear().c / FAR925, min: 1 }],
  mass: { each: massOfPrims(PP.prims, PROP_RHO), from: `solid volumes: wood × ${WOOD.rho}, crush plate × ${AL_BAR.rho} lb/in³ (polar moment ${fx(PI_.Ip, 3)} slug·ft² from the same envelope)` },
  hardware: [{ std: propBolt.std, qty: 6, desc: `prop bolt through the bulkhead, crush plate, hub, backplate and the extension's aft flange; grip ${fx(propBolt.grip, 3)} in on ${fx(propStack, 3)} in`, each: boltLb(propBolt.L) }, { std: 'MS21042L6', qty: 6, desc: 'nut, inside the extension between its flanges', each: nutLb }, { std: 'AN960-616', qty: 12, desc: 'washer, head and nut', each: 0.010 }],
  hardwareNote: `6 × ${propBolt.std}, MS21042L6, AN960-616; 175–225 in-lb + nut drag (Sensenich), re-check after the first flight and at 25 h.`,
  interfaces: [
    { id: 'I1', with: 'LEZ-61-110 extension aft flange', feature: 'hub', what: 'Hub bores on the bushing circle; bushings engage the hub', check: () => ({ ok: PX.bush.proj > 0 && PX.bc === FLANGE.bc, detail: `${PX.n} bores on Ø ${PX.bc}; bushings ${PX.bush.proj} in into the hub` }) },
    { id: 'I2', with: 'Ground (static, level) and LEZ-32 main gear', feature: 'blade', what: `Tip clearance ≥ ${FAR925} in`, check: () => { const g = groundClear(); return { ok: g.c >= FAR925, detail: `${fx(g.c)} in; strike at ${fx(g.rot, 1)}° rotation about the mains` }; } },
    { id: 'I3', with: 'Wing root trailing edges (LEZ-57-110 / -116)', feature: 'blade', what: 'Disc ≥ 4 in aft of the trailing edges', check: () => { const c = discClear(); return { ok: c.te >= 4, detail: `${fx(c.te)} in` }; } },
  ],
  tooling: { needed: true, text: 'Prop tracking stand and a torque wrench; a dynamic balancer at the first run if available.' },
  sourcing: { blank: `Wood pusher prop, ${fx(2 * PX.blade.tipR, 0)} in diameter, pitch to suit, SAE 1 hub on a ${PX.bc} in bolt circle with ${2 * PX.bush.ro} in bushing bores`, vendor: 'A custom wood-prop maker serving EZ pushers (maker not researched: quote required)', url: 'https://www.aircraftspruce.com/', cost: 948, costAsOf: DATE, perAircraft: 1, lead: 'Weeks (made to order)', note: 'Prop $900 BOUND (not found: get a quote; the maker sets pitch for the engine and airframe) + the SAE 1 front (crush) plate Aircraft Spruce 10351 $47.95 (2026-11-19).' },
};

// ------------------------------------------------------------------------------------------- LEZ-61-110 extension
export const extParams = () => ({ frame: 'aircraft', prims: extPrims().map(tidy) });
const EP = extParams(), EXT_RHO = { al: AL_BAR.rho, steel: RHO.steel };
const crankStack = PX.ext.flT + FLANGE.t, crankBolt = pickAN(6, crankStack + 2 * 0.063);
export const EXT_DEF = {
  pn: 'LEZ-61-110', rev: 'A', status: 'released', nha: 'LEZ-61-100', qty: 1,
  title: 'Prop extension, 8 in',
  revs: [{ rev: 'A', date: DATE, short: 'Initial definition', change: `Initial definition. Mass was ASSUMED (3.6 lb). As defined: 6061-T6 from bar, Ø ${2 * PX.ext.flR} × ${PX.ext.flT} in flanges, Ø ${2 * PX.ext.bodyR} × Ø ${2 * PX.ext.boreR} body, ${PX.ext.L} in face to face, six pressed-in 4130 drive bushings in the aft flange; checked in torsion (2 × mean torque), bending (gyroscopic and the prop's inertia), at the drive and at the prop bolts. The SAE 1 bolt circle (${FLANGE.bc} in) is typed from memory (the old engine drawing used 4.32 in): verify before drilling.` }],
  effectivity: 'One per aircraft', params: EP,
  datums: [{ id: 'A', what: 'Forward flange face (on the crank flange)' }, { id: 'B', what: 'Spigot / bore axis (crankshaft line)' }, { id: 'C', what: 'Bolt-hole clocking' }],
  features: [
    { id: 'fwd', kind: 'flange', label: `Forward flange Ø ${2 * PX.ext.flR} × ${PX.ext.flT}, ${PX.n} × Ø ${FLANGE.hole} on Ø ${PX.bc}`, tol: 'Holes ⌖ Ø0.003 A B C; face run-out ≤ 0.002' },
    { id: 'body', kind: 'tube', label: `Body Ø ${2 * PX.ext.bodyR} / Ø ${2 * PX.ext.boreR}, ${fx(PX.ext.L - 2 * PX.ext.flT)} long`, tol: '±0.005' },
    { id: 'aft', kind: 'flange', label: `Aft flange Ø ${2 * PX.ext.flR} × ${PX.ext.flT}, ${PX.n} × Ø ${2 * PX.bush.ro} bushing bores on Ø ${PX.bc}`, tol: 'Faces parallel within 0.002; bores ⌖ Ø0.003 A B C' },
    { id: 'bush', kind: 'bushing', label: `Drive bushings (6) 4130 N Ø ${2 * PX.bush.ro} / Ø ${2 * PX.bush.ri}, pressed ${PX.bush.inFl} in, standing ${fx(PX.bp.t + PX.bush.proj)} proud`, tol: 'Interference 0.001–0.002' },
  ],
  tolerances: { general: '.XX ±0.01 · .XXX ±0.003', holes: 'Machined in one set-up with both flanges', breakEdges: '0.010–0.020' },
  drawingNotes: ['Machine both flange faces and the bolt holes in one set-up; balance with the prop.', 'Natural frequency of the extension with the prop not analysed here: run-up survey for vibration before flight.'],
  generalNote: 'Anodise (MIL-A-8625 type II) after machining; press the bushings after anodising.',
  na: { cut: 'Machined from bar', layup: 'Metal part' },
  material: { spec: 'AMS-QQ-A-225/8 6061-T6 bar; bushings 4130 N tube', alt: '2024-T351 bar (higher strength, lower corrosion resistance)', form: `Ø 6 in bar × ${PX.ext.L + 0.25} in`, density: AL_BAR.rho,
    allowables: [['6061-T6 bar F_tu / F_ty / F_su / F_bru', '42 / 35 / 27 / 88 ksi', AL_BAR.spec], ['4130 N F_su', '57 ksi', 'MIL-HDBK-5']] },
  process: [{ op: 'Machine', spec: 'Turn, bore and face; drill and ream the bolt holes and bushing bores in one set-up.' }, { op: 'Finish', spec: 'Anodise type II; press in the bushings.' }, { op: 'Install', spec: `${crankBolt.std} × 6 to the crank flange, torque per AC 43.13-1B Table 7-1 (3/8-24 tension nut: 160–190 in-lb + nut drag; check the extension maker's figure); safety.` }, { op: 'Inspect', spec: 'Run-out at the aft flange ≤ 0.003 in TIR on the engine.' }],
  checks: ['pext-body', 'pext-drive', 'pext-bolts'],
  rules: [{ id: 'edge', label: 'Flange edge distance to the bolt holes e/D ≥ 1.5', v: (PX.ext.flR - PX.bc / 2) / (1.5 * FLANGE.hole), min: 1 }, { id: 'head', label: 'Bolt heads clear the body (socket room ≥ 0.3 in)', v: (PX.bc / 2 - PX.ext.bodyR - 0.375) / 0.3, min: 1 }],
  mass: { each: massOfPrims(EP.prims, EXT_RHO), from: 'solid volumes: 6061-T6 × 0.098, bushings × 0.283 lb/in³' },
  hardware: [{ std: crankBolt.std, qty: 6, desc: 'extension to the crank flange', each: boltLb(crankBolt.L) }, { std: 'MS21042L6', qty: 6, desc: 'nut', each: nutLb }],
  hardwareNote: `6 × ${crankBolt.std} with MS21042L6 nuts to the SAE No. 1 crank flange (4.375 in circle); the prop bolts are LEZ-61-100's.`,
  interfaces: [
    { id: 'I1', with: 'LEZ-71-210 crank flange (SAE 1)', feature: 'fwd', what: 'Bolt circle and count match the engine flange', check: () => ({ ok: PX.bc === FLANGE.bc && PX.n === FLANGE.n && Math.abs(PX.y0 - ENG.flange * 12) < 1e-3, detail: `${PX.n} × Ø ${FLANGE.hole} on Ø ${PX.bc} (engine ${FLANGE.n} on Ø ${FLANGE.bc}); face at FS ${fx(PX.y0)}` }) },
    { id: 'I2', with: 'LEZ-61-120 backplate and LEZ-61-100 hub', feature: 'aft', what: 'Aft face at the backplate; bushings through it into the hub', check: () => ({ ok: Math.abs(PX.y1 + PX.bp.t - PX.yBp) < 1e-9, detail: `aft face FS ${fx(PX.y1)}, backplate to ${fx(PX.yBp)}` }) },
    { id: 'I3', with: 'LEZ-71-155 cowl exit', feature: 'body', what: 'Flanges inside the cowl\'s aft opening', check: () => { const c = cowlExitClear(); return { ok: c >= 0.5, detail: `${fx(c)} in` }; } },
  ],
  tooling: { needed: true, text: 'Lathe with a fixture plate for the bolt circle; arbor press for the bushings.' },
  sourcing: { blank: `6061-T6 round bar Ø 6 × ${PX.ext.L + 0.5} in; 4130 N tube 0.75 × 0.156 wall × 6 in`, vendor: 'Online Metals (bar), Aircraft Spruce (4130 tube)', url: 'https://www.onlinemetals.com/', cost: 120, costAsOf: DATE, perAircraft: 1, lead: 'Stock', note: 'Material only (approximate); machining by a shop. EZ-specific extensions are also sold made-up.' },
};
/** the extension's flanges inside the cowl's aft opening (in): least inset of the flange rim from the OML, less the skin */
let cowlExitClear = () => 9;
export const bindCowl = (f) => { cowlExitClear = f; };

// ------------------------------------------------------------------------------------------- LEZ-61-120 spinner
export const spinParams = () => ({ frame: 'aircraft', prims: spinPrims().map(tidy) });
const SP = spinParams();
export const SPIN_DEF = {
  pn: 'LEZ-61-120', rev: 'A', status: 'released', nha: 'LEZ-61-100', qty: 1, kind: 'cots',
  title: `Spinner, Ø ${2 * PX.spin.r} in, with backplate and bulkhead`,
  revs: [{ rev: 'A', date: DATE, short: 'Initial definition', change: `Initial definition. The spinner was Ø 4.8 in, smaller than the prop hub, and its backplate overlapped the extension (ICD G-F8). As defined: Ø ${2 * PX.spin.r} in spun shell over the ${PX.hub.w} in hub, backplate clamped between the extension and the hub, aft bulkhead under the crush plate, both in the prop-bolt stack.` }],
  effectivity: 'One per aircraft', params: SP,
  datums: [{ id: 'A', what: 'Backplate forward face (on the extension)' }, { id: 'B', what: 'Crankshaft line' }],
  features: [
    { id: 'shell', kind: 'shell', label: `Shell ${PX.spin.w} in, Ø ${2 * PX.spin.r} cylinder to FS ${fx(PX.spin.cylEnd)}, cone to a Ø ${2 * PX.spin.tipR} nose at FS ${fx(PX.spin.tip)}; blade cut-outs trimmed to the prop`, tol: 'Run-out ≤ 1/32 in' },
    { id: 'backplate', kind: 'plate', label: `Backplate Ø ${2 * PX.bp.r} × ${PX.bp.t}, six Ø ${2 * PX.bush.ro} bores`, tol: '±0.005' },
    { id: 'bulkhead', kind: 'plate', label: `Aft bulkhead Ø ${2 * PX.blk.r} × ${PX.blk.t}, six bolt holes`, tol: '±0.005' },
  ],
  tolerances: { general: 'Vendor part trimmed at installation', breakEdges: 'Cut-out edges smooth, no cracks' },
  drawingNotes: ['Trim the blade cut-outs with the prop installed, 1/8 in clear all round.'], generalNote: 'Screws to the backplate and bulkhead per the vendor.',
  na: { cut: 'Bought-in', layup: 'Bought-in' },
  material: { spec: '6061-T6 / 3003 spun aluminium shell 0.040 in; 6061-T6 backplate and bulkhead 0.090 in', alt: 'Glass spinner of the same envelope', form: 'bought, trimmed', density: AL_BAR.rho, allowables: [] },
  process: [{ op: 'Fit', spec: 'Backplate on the extension under the hub, bulkhead under the crush plate; trim the cut-outs; screw the shell on.' }],
  checks: [],
  rules: [{ id: 'hub', label: 'Shell bore clears the hub corners in the hub\'s plane (shell inner Ø ≥ hub width)', v: 2 * (PX.spin.r - PX.spin.w) / PX.hub.w, min: 1 }],
  mass: { each: massOfPrims(SP.prims, { al: AL_BAR.rho }), from: 'solid volumes × 0.098 lb/in³' },
  hardware: [{ std: 'MS24693C screws + MS21047 nutplates', qty: 12, desc: 'shell to backplate and bulkhead', each: 0.004 }], hardwareNote: '12 × #8 screws into nutplates on the backplate and bulkhead.',
  interfaces: [
    { id: 'I1', with: 'LEZ-61-100 hub / LEZ-61-110 aft flange', feature: 'backplate', what: 'Backplate and bulkhead in the prop-bolt stack', check: () => ({ ok: Math.abs(PX.yBp - PX.y1 - PX.bp.t) < 1e-9 && Math.abs(PX.yBk - PX.yCr - PX.blk.t) < 1e-9, detail: `backplate FS ${fx(PX.y1)}–${fx(PX.yBp)}, bulkhead ${fx(PX.yCr)}–${fx(PX.yBk)}` }) },
    { id: 'I2', with: 'LEZ-71-155 cowl exit', feature: 'shell', what: 'Exit annulus round the spinner ≥ 1.5 × the cooling inlets', check: () => { const a = exitArea(); return { ok: a.ok, detail: a.detail }; } },
  ],
  tooling: { needed: false, text: 'None beyond the prop installation.' },
  sourcing: { blank: `Spinner Ø ${2 * PX.spin.r} in for a pusher, with backplate and bulkhead`, vendor: 'Aircraft Spruce (aluminium spinners; typed from memory)', url: 'https://www.aircraftspruce.com/', cost: 180, costAsOf: DATE, perAircraft: 1, lead: 'Stock', note: 'Approximate; a pusher spinner may need a custom backplate for the bolt circle.' },
};
let exitArea = () => ({ ok: true, detail: '' });
export const bindExit = (f) => { exitArea = f; };
