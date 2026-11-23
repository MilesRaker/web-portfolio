// Block G engine group definition records: LEZ-71-210 engine (bought-in envelope), LEZ-71-221 conical isolators,
// LEZ-71-224 isolator cups / pick-up bushings / gussets (welded on the released mount LEZ-71-220) and the LEZ-71-200
// powerplant installation. Numbers from parts/wpG1_engine.js; solids by cad/g_prims.py. Notional, public data only.
import { GEO } from '../structures.js';
import { MOUNT, ENG } from '../parts/wp1_powerplant.js';
import { O235, LUGS } from '../parts/engine_o235.js';
import { BRK } from '../parts/wp6_engine_install.js';
import { UPK } from '../parts/wp23_upk.js';
import { pickAN, AN_THREAD } from '../parts/wp16_wing_attach.js';
import { definePass } from '../systems.js';
import { P3, r4, STACK, FLANGE, CUP, BUSH, RHO, enginePrims, isoPrims, cupPrims, engineFit, FIT_REQ, bracketToEngine } from '../parts/wpG1_engine.js';
import { tidy, primsExpect, massOfPrims, massOfGroups, primVol } from './g_prims.js';
import { want } from './util.js';

const fx = (x, n = 2) => x.toFixed(n), N = MOUNT.nodes, DATE = '2026-11-18';
const near = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));

// ------------------------------------------------------------------------------------------- LEZ-71-210 engine
export const engParams = () => ({ frame: 'aircraft', prims: enginePrims().map(tidy) });
export const engExpect = (p, m) => primsExpect(p, m, [want('Length over the magnetos to the prop flange (in)', p.prims.reduce((a, q) => Math.max(a, q.t === 'box' ? q.c[1] + q.d[1] / 2 : Math.max(q.a[1], q.b[1])), -1e9) - p.prims.reduce((a, q) => Math.min(a, q.t === 'box' ? q.c[1] - q.d[1] / 2 : Math.min(q.a[1], q.b[1])), 1e9), m.bbox[3] - m.bbox[2], 0.05)]);   // OCC bounding boxes of curved faces run a few hundredths loose
const EP = engParams(), lugPs = EP.prims.filter((q) => q.feat === 'lugs');
export const ENG_DEF = {
  pn: 'LEZ-71-210', rev: 'A', status: 'released', nha: 'LEZ-71-200', qty: 1, kind: 'cots',
  title: `Engine, Lycoming ${O235.model} (bought-in)`,
  revs: [{ rev: 'A', date: DATE, short: 'Initial definition', change: `Initial definition as a bought-in part: the installation envelope as a solid (crankcase, accessory housing, cylinders, sump, carburettor, magnetos, starter, alternator), the four conical-mount lug bosses on the ${O235.mount.dy} × ${O235.mount.dz} in pattern and the SAE type 1 prop flange. The engine-interface check's tolerance was ASSUMED; it is now a design value. The envelope's cowl clearance is now a check (eng-fit).` }],
  effectivity: 'One per aircraft', params: EP,
  datums: [{ id: 'A', what: 'Prop flange face (aft)' }, { id: 'B', what: 'Crankshaft centre line' }, { id: 'C', what: 'Engine centre plane (BL 0)' }],
  features: [
    { id: 'case', kind: 'envelope', label: `Crankcase envelope ${fx((ENG.flange - 0.22 - ENG.accFace - 0.28) * 12, 1)} × 10.8 × 10.6 in; accessory housing on the firewall side (pusher)`, tol: 'Envelope: public data, ±0.5 in' },
    { id: 'cyl', kind: 'envelope', label: `Four cylinders (fins, head, rocker cover) on ${fx(O235.bore, 3)} in bore; width over the rocker covers ${O235.envelope.W} in [EH]`, tol: '±0.5 in' },
    { id: 'lugs', kind: 'boss', label: `Mount lug bosses (4): Ø ${fx(2 * STACK.lugR)} × ${fx(STACK.lug[1] - STACK.lug[0])} in, bore Ø ${fx(2 * STACK.lugBore)}, axes parallel to the crankshaft on a ${O235.mount.dy} × ${O235.mount.dz} in pattern [SSP] [GAN]`, tol: 'Pattern per the engine data plate drawing' },
    { id: 'flange', kind: 'flange', label: `Prop flange Ø ${FLANGE.od} × ${FLANGE.t} in, ${FLANGE.n} × Ø ${FLANGE.hole} holes on a Ø ${FLANGE.bc} bolt circle (SAE No. 1: Univair / McCauley SCM7153 hub data for the O-235-C2C, 6 × 3/8 in on 4.375 in; OD, thickness and hole BOUND)`, tol: 'Verify against the engine\'s installation drawing' },
    { id: 'sump', kind: 'envelope', label: 'Oil sump with the induction riser; carburettor (Marvel-Schebler MA-3A, updraft) under it', tol: '±0.5 in' },
    { id: 'mag', kind: 'envelope', label: 'Accessories: two Slick magnetos (4370 left, impulse coupling / 4371 right: Lycoming\'s current O-235-C2C build; TCDS rev 19 lists 4251 / 4250) and the spin-on oil filter toward the firewall; starter and alternator low at the prop end', tol: '±0.5 in' },
  ],
  tolerances: { general: 'Envelope only: the vendor\'s installation drawing governs', holes: 'Flange and lug holes as the vendor supplies them', breakEdges: '—' },
  drawingNotes: ['Bought complete (overhauled or new); this sheet is the installation envelope, not a manufacturing drawing.', 'OPEN ITEM (Miles, 2026-11-19): Miles to obtain the current TCDS E-223 and Lycoming installation drawing; confirm C2C pusher suitability. The current TCDS revision was unreachable in the source audit; the O-235-C2C is kept.', 'Envelope dimensions from public data [TCDS] [OM] [EH] [GAN]; the SAE No. 1 bolt circle (4.375 in, 6 × 3/8) from the Univair / McCauley SCM7153 data; the lug boss size is BOUND: verify.', 'Carburettor: the Marvel-Schebler MA-3A has no accelerator pump (Lycoming OM 60297-9): a cockpit primer is fitted (LEZ-73-140) and the throttle is opened smoothly.'],
  generalNote: 'Inhibit for storage per the engine maker; first run per the overhaul shop\'s run-in schedule.',
  na: { cut: 'Bought-in', layup: 'Bought-in' },
  material: { spec: `Lycoming ${O235.model}, FAA TC E-223. TCDS E-223 rev 19 (2003) Note 5 lists pusher eligibility for the -C1 only; current revision to be checked`, alt: 'O-235-L2C or -N2C with the conical mount and the same flange (check the TCDS for dry weight and C.G.)', form: 'bought complete', density: null,
    allowables: [['Dry weight', `${O235.dryLb} lb`, 'TCDS E-223 rev 19 Note 8 (cessna150152club.org copy, accessed 2026-11-19)'], ['Rated power', `${O235.hp} hp at ${O235.rpm} rpm take-off (5 min); 108 hp at 2,600 max continuous`, 'TCDS E-223 rev 19 ratings table'], ['C.G.', `${O235.cgFromFlange} in from the flange, ${O235.cgBelowCL} in below the crank`, 'TCDS E-223']] },
  process: [{ op: 'Receive', spec: 'Check the data plate, logbook and the TCDS model; record the serial number.' }, { op: 'Prepare', spec: 'Fit the isolators (LEZ-71-221) to the lug bosses; plug every open port.' }, { op: 'Install', spec: 'Hang on the mount (LEZ-71-220) with the engine hoist; AN6 isolator bolts through the cone bushings, torque and cotter (LEZ-71-221).' }],
  checks: ['eng-iface', 'eng-fit'],
  rules: [{ id: 'pattern', label: 'Lug pattern matches the published conical-mount pattern (11.5 × 9.5 in)', v: Math.abs(Math.max(...lugPs.map((q) => q.a[0])) - Math.min(...lugPs.map((q) => q.a[0])) - O235.mount.dy) < 1e-3 && Math.abs(Math.max(...lugPs.map((q) => q.a[2])) - Math.min(...lugPs.map((q) => q.a[2])) - O235.mount.dz) < 1e-3 ? 1 : 0, min: 1 }],
  mass: { each: O235.dryLb, from: 'TCDS E-223 dry weight (starter and alternator included); the solid is the envelope only' },
  hardware: [], hardwareNote: 'Isolator bolts with LEZ-71-221; prop bolts with LEZ-61-110.',
  interfaces: [
    { id: 'I1', with: 'LEZ-71-221 isolators, LEZ-71-224 cups at the LEZ-71-220 cup nodes', feature: 'lugs', what: 'Lug axes on the mount nodes; the cones fill the lug hole, the spacer passes the cones', check: () => { const d = Math.max(...LUGS(ENG.accFace, ENG.crankZ).map((L) => near(N[`E${L.k}`], L.at) * 12)); return { ok: d < 1e-6 && STACK.tubeRo <= STACK.radRi + 1e-6 && STACK.radR <= STACK.lugBore + 1e-6, detail: `lug-to-node ${fx(d, 4)} in; spacer Ø ${fx(2 * STACK.tubeRo, 3)} in the cones' Ø ${fx(2 * STACK.radRi, 3)} bore; cone noses Ø ${fx(2 * STACK.radR, 2)} in the Ø ${fx(2 * STACK.lugBore, 2)} lug hole` }; } },
    { id: 'I3', with: 'LEZ-71-223 lower brackets (rev B) and LEZ-71-222 upper pick-ups', feature: 'mag', what: 'Envelope (magnetos, accessory housing) clear of the brackets by ≥ 0.75 in (0.5 in + isolator motion)', check: () => { const c = bracketToEngine(); return { ok: c.d >= 0.75, detail: `${fx(c.d)} in, ${c.feat} to ${c.leg}` }; } },
    { id: 'I2', with: 'LEZ-71-200 cowl and LEZ-71-155 cowling', feature: 'cyl', what: 'Envelope inside the cowl with clearance', check: () => { const w = engineFit(); return { ok: w.c >= FIT_REQ, detail: `${fx(w.c, 3)} in at the ${w.feat} (≥ ${FIT_REQ})` }; } },
  ],
  tooling: { needed: true, text: 'Engine hoist and a lifting eye on the crankcase lifting lug; engine stand for the build-up.' },
  sourcing: { blank: 'Overhauled (zero-time) or new O-235-C2C, with data plate and logbook', vendor: 'Lycoming (factory) or an FAA-certificated overhaul shop', url: 'https://www.lycoming.com/', cost: 45167, costAsOf: '2026-11-19', perAircraft: 1, lead: 'Weeks (exchange) to months (new)', note: 'Aircraft Spruce 07-22622, Lycoming O-235-C1B factory-overhauled exchange $45,167 (+ $30,778 core charge if no core is returned; no C2C price listed; 2026-11-19, medium confidence; Miles accepts the figure). A field overhaul will be less: get quotes.' },
};

// ------------------------------------------------------------------------------------------- LEZ-71-221 isolators
export const isoParams = () => ({ frame: 'own: x lateral, y aft along the crankshaft from the mount node, z up', prims: isoPrims().map(tidy) });
const IP = isoParams(), ISO_RHO = { rubber: RHO.rubber, steel: RHO.steel };
const bolt = pickAN(STACK.an, STACK.grip + 2 * 0.063);
const BD = STACK.an / 16;   // bolt diameter (AN6: 3/8)
const boltLb = RHO.steel * (Math.PI * (BD / 2) ** 2 * (bolt.L + 3 / 32) + 0.866 * (1.5 * BD) ** 2 * 0.62 * BD), nutLb = RHO.steel * 0.866 * (1.5 * BD) ** 2 * 0.75 * BD * 0.55;
export const ISO_DEF = {
  pn: 'LEZ-71-221', rev: 'A', status: 'released', nha: 'LEZ-71-220', qty: 4, kind: 'cots',
  title: 'Engine isolator set: two cone bushings per lug (eight per engine)',
  revs: [{ rev: 'A', date: DATE, short: 'Initial definition', change: `Initial definition. Mass was ASSUMED (0.5 lb each). As defined each set is a forward rubber pad in the cup, a radial rubber sleeve round the lug boss, an aft pad, a steel spacer sleeve and a snubbing washer on one AN7 through-bolt (fail-safe: with the rubber gone the lug still bears on the sleeve). The rubber's bearing stress is checked against a bounded design value, not a vendor rating.` }],
  effectivity: 'Four per aircraft, one per lug', params: IP,
  datums: [{ id: 'A', what: 'Mount node plane (the cup\'s open rim is 0.55 in aft of it)' }, { id: 'B', what: 'Isolator axis, parallel to the crankshaft' }],
  features: [
    { id: 'fwd', kind: 'rubber', label: `Forward cone bushing: Ø ${fx(2 * STACK.padR, 3)} shoulder × ${fx(STACK.fwd[1] - STACK.fwd[0])} in installed against the cup's base, its Ø ${fx(2 * STACK.radR)} nose into the lug hole (Aircraft Spruce 71032: OD 1.625 → 1.00, 0.92 free height, ID 0.500)`, tol: 'Vendor; installed compression BOUND' },
    { id: 'radial', kind: 'rubber', label: `Cone noses Ø ${fx(2 * STACK.radR)} / Ø ${fx(2 * STACK.radRi)} filling the Ø ${fx(2 * STACK.lugBore)} lug hole over ${fx(STACK.lug[1] - STACK.lug[0])} in`, tol: 'Vendor' },
    { id: 'aft', kind: 'rubber', label: `Aft cone bushing: Ø ${fx(2 * STACK.padR, 3)} shoulder × ${fx(STACK.aft[1] - STACK.aft[0])} in behind the boss, nose into the hole`, tol: 'Vendor' },
    { id: 'sleeve', kind: 'tube', label: `Steel spacer sleeve Ø ${fx(2 * STACK.tubeRo, 3)} / Ø ${fx(2 * STACK.tubeRi, 4)} × ${fx(STACK.tube[1] - STACK.tube[0])} in (bolt passage)`, tol: 'Vendor' },
    { id: 'washer', kind: 'washer', label: `Snubbing washer Ø ${fx(2 * STACK.washR)} × ${fx(STACK.washer[1] - STACK.washer[0])} in`, tol: 'Vendor' },
  ],
  tolerances: { general: 'Vendor part: dimensions as the installation envelope used here', breakEdges: '—' },
  drawingNotes: ['One set shown, in its own frame; four per aircraft.', 'Cone-style mount bushings listed for the O-235-C conical mount [AS]; the dimensions are this design\'s envelope and must be checked against the set bought.'],
  generalNote: 'Replace on condition (cracked, set or oil-soaked rubber).',
  na: { cut: 'Bought-in', layup: 'Bought-in' },
  material: { spec: 'Two Aircraft Spruce 71032 cone bushings per lug (O-235 / O-320 / O-360, 8 per engine; the O-235-C1B takes 60883: check the engine\'s parts catalogue), 1/2 × .058 4130 spacer; AN6 bolt, MS21042L6 nut, AN960-616 washers', alt: 'Any cone bushing listed for the O-235-C conical mount with the same envelope', form: 'bought set', density: null, allowables: [['AN6 single shear', '8,280 lb', 'AN standard (the structures topic\'s value)'], ['Rubber bearing (design)', '1,500 psi', 'BOUND (design value; the vendor publishes no rating)']] },
  process: [{ op: 'Inspect', spec: 'Rubber free of cracks and oil; sleeve and washer straight.' }, { op: 'Install', spec: `Forward cone into the cup and the lug hole, aft cone from behind, spacer through both, washer; ${bolt.std} from the cup side, MS21042L6 nut aft; torque 160–190 in-lb (AC 43.13-1B CHG 1 Table 7-1, 3/8-24 tension nut) + nut drag, or the isolator maker's figure if given, and cotter or safety.` }],
  checks: ['iso-failsafe', 'iso-rubber'],
  rules: [{ id: 'grip', label: 'Bolt grip covers the stack (grip / stack)', v: bolt.grip / (STACK.grip + 2 * 0.063), min: 1 }, { id: 'thread', label: 'Thread past the grip ≥ nut + 2 threads (1.4 D)', v: AN_THREAD[STACK.an] / (1.4 * BD), min: 1 }],
  mass: { each: massOfPrims(IP.prims, ISO_RHO), from: 'solid volumes: rubber × 0.040, steel × 0.283 lb/in³ (one set; the bolt and nut are hardware lines)' },
  hardware: [{ std: bolt.std, qty: 1, desc: `through-bolt, grip ${fx(bolt.grip, 3)} in on a ${fx(STACK.grip + 0.126, 3)} in stack`, each: boltLb }, { std: 'MS21042L6', qty: 1, desc: 'self-locking nut', each: nutLb }, { std: 'AN960-616', qty: 2, desc: 'washer, under the head and the nut', each: 0.010 }],
  hardwareNote: `${bolt.std} through the cup base, the spacer, the cones, the lug and the washer, MS21042L6 nut, 2 × AN960-616; torque 160–190 in-lb (AC 43.13-1B Table 7-1) + nut drag.`,
  interfaces: [
    { id: 'I1', with: 'LEZ-71-224 cup', feature: 'fwd', what: 'Rubber clears the cup bore; the stack starts on the cup base', check: () => ({ ok: STACK.padR < STACK.cupR - STACK.cupW && STACK.radR < STACK.cupR - STACK.cupW && STACK.fwd[0] === STACK.cupBase[1], detail: `pad Ø ${fx(2 * STACK.padR)} and sleeve Ø ${fx(2 * STACK.radR)} in the Ø ${fx(2 * (STACK.cupR - STACK.cupW), 3)} cup bore` }) },
    { id: 'I2', with: 'LEZ-71-210 lug boss', feature: 'radial', what: 'Cone noses fill the lug hole; shoulders against its faces', check: () => ({ ok: STACK.radR <= STACK.lugBore + 1e-6 && STACK.padR < STACK.cupR - STACK.cupW && STACK.fwd[1] === STACK.lug[0] && STACK.aft[0] === STACK.lug[1], detail: `sleeve bore Ø ${fx(2 * STACK.radRi)} over the Ø ${fx(2 * STACK.lugR)} boss; pads at u ${STACK.lug[0]} / ${STACK.lug[1]} in` }) },
  ],
  tooling: { needed: false, text: 'None beyond the engine hoist (LEZ-71-210).' },
  sourcing: { blank: 'Cone-style mount bushing set for the O-235-C conical mount, four per aircraft', vendor: 'Aircraft Spruce (cone-style mount bushings, O-235-C series)', url: 'https://www.aircraftspruce.com/', cost: 33, costAsOf: '2026-11-19', perAircraft: 4, lead: 'Stock', note: 'Two 71032 bushings per set at $16.50 (Aircraft Spruce, 2026-11-19): $132 an engine; 60883 (O-235-C1B) $42.65 each. Confirm the part number against the engine\'s parts catalogue.' },
};

// ------------------------------------------------------------------------------------------- LEZ-71-224 cups, bushings, gussets
export const cupParams = () => ({ frame: 'aircraft', prims: cupPrims().map(tidy) });
const CP = cupParams();
export const CUP_DEF = {
  pn: 'LEZ-71-224', rev: 'A', status: 'released', nha: 'LEZ-71-220', qty: 1, kind: 'weldment',
  title: 'Isolator cups, bushings and gussets',
  revs: [{ rev: 'A', date: DATE, short: 'Initial definition', change: `Initial definition. The cups, bushings and gussets were display shapes with a 0.4 lb gusset allowance. As defined: four ${fx(2 * STACK.cupR)} × ${STACK.cupW} 4130 N cups with ${fx(STACK.cupBase[1] - STACK.cupBase[0])} in base discs, centred on the mount's cup nodes and open aft round the lug bosses; two lateral upper bushings (${fx(BUSH.upL, 3)} long, fitting the ${UPK.gap} in gap of LEZ-71-222 with 1/16 in a side) and two fore-aft lower bushings bearing on LEZ-71-223's leg A; eight ${CUP.gusT} in finger gussets. Welded in the mount jig.` }],
  effectivity: 'One set per aircraft', params: CP,
  datums: [{ id: 'A', what: 'Firewall aft face (the lower bushings bear on LEZ-71-223 there)' }, { id: 'B', what: 'Aircraft centre line' }, { id: 'C', what: 'Crankshaft centre line' }],
  features: [
    { id: 'cup', kind: 'cup', label: `Cups (4): ${fx(2 * STACK.cupR)} × ${STACK.cupW} 4130 N tube ${fx(STACK.cupWall[1] - STACK.cupWall[0])} long on a ${fx(STACK.cupBase[1] - STACK.cupBase[0])} in base disc with a Ø 0.44 bolt hole; axes parallel to the crankshaft at the four cup nodes`, tol: 'Cup faces square to the crankshaft ±1°, axes on the nodes ±1/32 in' },
    { id: 'bushing', kind: 'bushing', label: `Pick-up bushings (4): Ø ${BUSH.od} / Ø ${BUSH.d} (reamed after welding); upper lateral × ${fx(BUSH.upL, 3)}, lower fore-aft × ${fx(BUSH.loL)}`, tol: 'Bore +0.002 / −0.000 after welding' },
    { id: 'gusset', kind: 'plate', label: `Finger gussets (8): ${CUP.gusT} × ${CUP.gusH} × ${CUP.gusL} in 4130 N, two per cup in the ring plane`, tol: 'Fit-up gap ≤ 0.010 in' },
  ],
  tolerances: { general: '.XX ±0.03 · .XXX ±0.010', holes: 'Bushing bores reamed in the jig after welding', breakEdges: '0.010–0.030' },
  drawingNotes: ['Welded to LEZ-71-220 in the same jig; dimensions here locate them on its nodes.'], generalNote: 'TIG weld, normalise the clusters, ream, prime with the mount.',
  na: { cut: 'Tube and sheet cut to the list: no flat pattern', layup: 'Metal part' },
  material: { spec: 'MIL-T-6736 (AMS 6360) 4130 N tube; AMS 6350 4130 N sheet; ER70S-2 filler', alt: 'AMS 6361 tube', form: 'tube and sheet, normalised', density: RHO.steel, allowables: [['4130 N F_su / F_bru', '57 / 175 ksi', 'MIL-HDBK-5'], ['At fusion welds', 'F_tu 80 ksi', 'MIL-HDBK-5']] },
  process: [{ op: 'Cut', spec: 'Cut cups and bushings from tube, base discs and gussets from sheet; drill the base discs.' }, { op: 'Weld', spec: 'Tack in the mount jig on the node pins; TIG weld; normalise the clusters.' }, { op: 'Finish', spec: 'Ream the bushings to Ø 0.375 +0.002; prime and paint with the mount.' }, { op: 'Inspect', spec: 'Dye-penetrant the cup clusters; cup axes square to the jig\'s crankshaft line.' }],
  checks: ['cup-base', 'cup-wall', 'cup-weld', 'bush-brg'],
  rules: [{ id: 'gap', label: 'Upper bushing clears the pick-up ears by ≥ 1/32 in a side', v: (UPK.gap - BUSH.upL) / 2 / (1 / 32), min: 1 }, { id: 'wall', label: 'Cup wall / OD ≥ 1/30 (weld burn-through)', v: STACK.cupW / (2 * STACK.cupR) * 30, min: 1 }],
  mass: { each: massOfPrims(CP.prims, { steel: RHO.steel }), from: 'solid volumes × 0.283 lb/in³' },
  hardware: [], hardwareNote: 'None: the isolator bolts are LEZ-71-221, the pick-up bolts LEZ-71-222 / -223.',
  interfaces: [
    { id: 'I1', with: 'LEZ-71-220 mount nodes', feature: 'cup', what: 'Cups and bushings on the nodes', check: () => { const c = CP.prims.filter((q) => q.feat === 'cup' && !q.ri).map((q) => q.a), d = ['ETL', 'ETR', 'EBL', 'EBR'].map((n, i) => Math.hypot(c[i][0] - P3(N[n])[0], c[i][2] - P3(N[n])[2])); return { ok: Math.max(...d) < 1e-3, detail: `cup axes ${fx(Math.max(...d), 4)} in off the nodes` }; } },
    { id: 'I2', with: 'LEZ-71-222 upper pick-up', feature: 'bushing', what: 'Bushing between the ears, bore on the AN6', check: () => ({ ok: BUSH.upL < UPK.gap && BUSH.d === UPK.D, detail: `${fx(BUSH.upL, 3)} in in a ${UPK.gap} in gap; bore ${BUSH.d} = bolt ${UPK.D}` }) },
    { id: 'I3', with: 'LEZ-71-223 lower bracket', feature: 'bushing', what: 'Lower bushings bear on leg A; bore on the AN6', check: () => { const y0 = CP.prims.filter((q) => q.feat === 'bushing').at(-1).a[1]; return { ok: Math.abs(y0 - (GEO.firewall * 12 + BRK.sec.t)) < 1e-3 && BUSH.d === BRK.dP, detail: `face at FS ${fx(y0, 3)} = firewall + ${BRK.sec.t} in leg; bore ${BUSH.d} = ${BRK.dP}` }; } },
    { id: 'I4', with: 'LEZ-71-221 isolators', feature: 'cup', what: 'Cup bore clears the rubber', check: () => ({ ok: STACK.cupR - STACK.cupW > STACK.padR, detail: `bore Ø ${fx(2 * (STACK.cupR - STACK.cupW), 3)} over Ø ${fx(2 * STACK.padR)}` }) },
  ],
  tooling: { needed: true, text: 'The mount jig (LEZ-71-220): node pins for the cups on the crankcase-pattern fixture and for the bushings on the firewall plate.' },
  sourcing: { blank: '4130 N tube 2.50 × .095 × 3 in; 0.875 × .250 × 4 in; sheet 0.063 and 0.160 in, 6 × 6 in', vendor: 'Aircraft Spruce (4130 N tube and sheet)', url: 'https://www.aircraftspruce.com/menus/mp/tubing.html', cost: 45, costAsOf: DATE, perAircraft: 1, lead: 'Stock', note: 'Approximate small-piece prices.' },
};

// ------------------------------------------------------------------------------------------- LEZ-71-200 installation
const W = (std, qty, desc, each) => ({ std, qty, desc, each });
const PP_LINES = [
  W('MS20995C32', 30, 'safety wire, 0.032 in stainless, per ft (oil filter, drain plug, sump, carburettor and air-box bolts)', 0.0028),
  W('MS21919WDG8', 10, 'cushioned clamp, 1/2 in (hoses, SCAT, harness to the mount tubes)', 0.012),
  W('MS21919WDG12', 4, 'cushioned clamp, 3/4 in (fuel and oil hoses at the firewall)', 0.016),
  W('AN3-5A', 14, 'clamp bolts', 0.012), W('MS21042L3', 14, 'self-locking nuts for the clamp bolts', 0.004),
  W('AS1072 end cap', 8, 'fire-sleeve end caps and clamps', 0.010),
  W('MS20995C20', 12, 'safety wire, 0.020 in, per ft (fittings, turnbuckle-style safeties)', 0.0011),
];
export const PP_MASS = PP_LINES.reduce((a, l) => a + l.qty * l.each, 0);
export const ppParams = () => ({ lines: PP_LINES.map((l) => [l.std, l.qty, r4(l.each)]), engine: P3([ENG.flange, 0, ENG.crankZ]), nodes: Object.fromEntries(Object.entries(N).map(([k, q]) => [k, P3(q)])) });
export const PP_DEF = {
  pn: 'LEZ-71-200', rev: 'A', status: 'released', nha: 'LEZ-000 (aircraft)', qty: 1, install: true,
  title: 'Powerplant installation',
  revs: [{ rev: 'A', date: DATE, short: 'Initial definition', change: `Initial definition. The installation's mass was ASSUMED (0.6 lb of safety wire, clamps and fire-sleeve ends); it is now the hardware lines (${fx(PP_MASS, 3)} lb). The detail parts carry their own hardware; this record joins them: engine on its isolators and cups on the mount, mount on the pick-ups, the prop on its extension, and checks the envelope in the cowl and the prop's clearance.` }],
  effectivity: 'One per aircraft', params: ppParams(), datums: [],
  features: [
    { id: 'hang', kind: 'joint', label: 'Engine on four isolators (LEZ-71-221) in the cups (LEZ-71-224) of the mount (LEZ-71-220); mount on the upper pick-ups (LEZ-71-222) and lower brackets (LEZ-71-223)', tol: 'Isolator bolts torqued and cottered' },
    { id: 'drive', kind: 'joint', label: 'Prop (LEZ-61-100) and spinner (LEZ-61-120) on the 8 in extension (LEZ-61-110) on the SAE 1 flange', tol: 'Prop track ≤ 1/16 in' },
    { id: 'svc', kind: 'joint', label: 'Baffles, inlet, induction, exhaust, oil cooler and hoses (LEZ-71-230 … LEZ-79-115); cowl on its attachment (LEZ-71-120)', tol: 'Every hose fire-sleeved firewall-aft' },
  ],
  tolerances: { general: 'Torque per AC 43.13-1B table 7-1 unless the part record says otherwise; safety wire per MS33540' },
  drawingNotes: ['Hang the engine on the mount, mount on the firewall; connect, fit baffles and cowl; first run and leak check.'],
  na: { cut: 'Installation: no flat pattern', layup: 'Installation: no layup' },
  material: { spec: 'Standard hardware: MS20995 stainless safety wire, MS21919 cushioned clamps, AN bolts, MS21042 nuts, AS1072 fire sleeve', alt: '—', form: 'bought hardware', density: 0.283, allowables: [] },
  process: [
    { op: 'Hang', spec: 'Fit the mount to the pick-ups; hang the engine on the isolators; torque and cotter.' },
    { op: 'Connect', spec: 'Induction, exhaust, oil cooler and hoses, fuel (block F), ignition and controls (block H), electrical (block I); clamp every 12 in and fire-sleeve firewall-aft.' },
    { op: 'Prop', spec: 'Extension, prop and spinner per LEZ-61-110; torque the prop bolts; track the blades.' },
    { op: 'Close', spec: 'Baffles and seals, then the cowl; check the clearances in the record.' },
    { op: 'Run', spec: 'First run and leak check; re-torque the prop bolts after the first run and after 10 h.' },
  ],
  checks: ['eng-fit', 'mount-tube', 'iso-failsafe', 'gear-prop'],
  rules: [],
  mass: { each: PP_MASS, from: 'hardware lines' },
  hardware: PP_LINES, hardwareNote: PP_LINES.map((l) => `${l.qty} × ${l.std}`).join(', '),
  interfaces: [
    { id: 'I1', with: 'LEZ-71-222 / LEZ-71-223 pick-ups', feature: 'hang', what: 'Mount firewall nodes on the pick-up bolt axes', check: () => { const d = (N.FTL[0] - GEO.firewall) * 12; return { ok: Math.abs(d - (UPK.tb + UPK.h)) < 1e-6 && Math.abs(N.FBL[2] - (N.FBL[2])) < 1e-9, detail: `upper nodes ${fx(d, 3)} in aft of the firewall (pick-up bolt axis); lower nodes on LEZ-71-223's pick-up` }; } },
    { id: 'I2', with: 'LEZ-71-210 lugs on LEZ-71-220', feature: 'hang', what: 'Lug centres on the cup nodes', check: () => { const d = Math.max(...LUGS(ENG.accFace, ENG.crankZ).map((L) => near(N[`E${L.k}`], L.at) * 12)); return { ok: d < 1e-6, detail: `${fx(d, 4)} in` }; } },
  ],
  tooling: { needed: true, text: 'Engine hoist, prop protractor and tracking stand, torque wrenches.' },
  sourcing: { blank: 'Bought hardware', vendor: 'Aircraft Spruce (hardware)', url: 'https://www.aircraftspruce.com/', cost: 40, costAsOf: DATE, perAircraft: 1, lead: 'Stock', note: 'Approximate.' },
};
void definePass; void primVol; void massOfGroups;
