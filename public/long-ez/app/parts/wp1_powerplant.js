// WP1 — powerplant (ATA 61, 71, 73, 76, 78, 79) and fuel (ATA 28).
// Notional, from public data: Lycoming O-235 class engine, fixed-pitch wood prop, updraft cooling from the belly
// NACA inlet, strake tanks feeding a selector valve and an electric boost pump. Every number not from a public
// source is marked ASSUMED in the part record or check trace. Not for construction.
import { GEO, FT, registerChecks, mk, wingSec } from '../structures.js';
import { FRAMES, afAt } from '../plybook.js';
import { defineParts, defineGraph, definePass, defineKeepouts, defineReqs, adoptMass, partMass, partByPN, PARTS, ZONES, insideFus, clashCheck, V3, insideOML } from '../systems.js';

const { add, sub, mul, dot, len } = V3;
import { O235, LUGS, engineGeo, distToPrim } from './engine_o235.js';
import { strakeVolumes } from './wp21_strake.js';
import { fuelLayout, fuelPrims, massEachF, ftOf, inOf, TUBE, HOSE6, outletSweep } from './wpF0_layout.js';
const FW = GEO.firewall, SRC_ENG = 'Lycoming O-235 published installation data (public spec sheets; verify against the current installation manual)';

// ------------------------------------------------------------------------------------------- engine layout
// pusher: the prop flange faces aft, the accessory case faces the firewall
// an 8 in prop extension (EZ practice; Rutan reported 6 and 8 in extensions in service) moves the engine 6 in forward of
// the short-extension position, putting its CG back near the original estimate and shortening the mount
export const PROP_EXT = 8 / 12;
const FLANGE = GEO.prop.s - 0.08 - PROP_EXT;
export const ENG = { flange: FLANGE, crankZ: GEO.prop.z, accFace: FLANGE - O235.envelope.L / 12, hp: O235.hp, rpm: O235.rpm, cylR: 0.26 };
export const cylS = { LR: ENG.flange - 19.0 / 12, RR: ENG.flange - 16.5 / 12, LF: ENG.flange - 9.5 / 12, RF: ENG.flange - 7.0 / 12 };
// O-235 envelope in pieces (public spec dimensions; layout notional): pusher, so the prop end is aft and the accessory
// case faces the firewall. Starter and alternator sit low at the prop end; magnetos, oil filter and fuel pump on the
// accessory case; four mount bosses on the accessory-end corners of the crankcase take the conical isolators.
const F_ = ENG.flange, A_ = ENG.accFace, C_ = ENG.crankZ;
export const PLUG = (k, sg, top) => [cylS[k] + (top ? 0.06 : -0.12), sg * (top ? 1.12 : 1.10), C_ + (top ? 0.27 : -0.22)];
export const EXH_PORT = (k, sg) => [cylS[k] + 0.08, sg * 1.02, C_ - 0.30];
export const MAG = (sg) => ({ a: [A_ + 0.02, sg * 0.24, C_ + 0.30], b: [A_ - 0.30, sg * 0.36, C_ + 0.36], cap: [A_ - 0.12, sg * 0.30, C_ + 0.47] });
export const STARTER_PT = [F_ - 0.55, -0.42, C_ - 0.24], ALT_PT = [F_ - 0.55, 0.42, C_ - 0.24];
// the engine's shape and interfaces: parts/engine_o235.js (sourced O-235-C2C data)
export const ENGINE_GEO = engineGeo({ F: F_, A: A_, C: C_, cylS, MAG, PLUG, EXH: EXH_PORT, STARTER: STARTER_PT, ALT: ALT_PT });
// cooling baffles: side walls hugging the cowl 0.6 in inside the skin at the seal line, a rear wall behind the rear
// cylinders, and inter-cylinder deflectors; the silicone seal strip closes the gap to the cowl
function bafflePlates() {
  const zSeal = 3.30, out = [], yIn = (s, z) => { let y = 0; while (insideOML([s, y + 0.01, z]) && y < 2) y += 0.01; return y - 0.05; };
  for (let s = cylS.LR - 0.35; s < cylS.RF + 0.35; s += 0.25) for (const sg of [-1, 1]) {
    const y = Math.min(yIn(s, zSeal + 0.08), yIn(s + 0.25, zSeal + 0.08));
    out.push({ t: 'box', c: [s + 0.125, sg * y, zSeal - 0.10], d: [0.25, 0.012, 0.36], op: 0.5, colour: 0xb8c0c8 });
  }
  out.push({ t: 'box', c: [cylS.LR - 0.35, 0, zSeal - 0.12], d: [0.012, 2 * yIn(cylS.LR - 0.35, zSeal) - 0.05, 0.30], op: 0.5, colour: 0xb8c0c8 }); // rear wall (firewall side)
  for (const sc of [cylS.LR, cylS.LF]) for (const sg of [-1, 1]) out.push({ t: 'box', c: [sc + 0.30, sg * 0.75, ENG.crankZ + 0.05], d: [0.012, 0.35, 0.30], op: 0.5, colour: 0xb8c0c8 }); // inter-cylinder deflectors
  return out;
}
// engine-mount truss: four firewall pick-ups (the existing firewall hard-points) to the four conical-mount pads
const yF = 0.62, yFt = 0.52, yE = O235.mount.dy / 24, zE = O235.mount.dz / 24, sE = ENG.accFace + 0.20;   // engine pick-ups on the conical lug pattern [GAN] // upper pick-ups 1.2 in further inboard: the firewall's top corners are rounded
export const MOUNT = {
  nodes: {
    FTL: [FW + 0.03, yFt, ENG.crankZ + GEO.engine.boltSpanZ / 2], FTR: [FW + 0.03, -yFt, ENG.crankZ + GEO.engine.boltSpanZ / 2],
    FBL: [FW + 0.03, yF, ENG.crankZ - GEO.engine.boltSpanZ / 2], FBR: [FW + 0.03, -yF, ENG.crankZ - GEO.engine.boltSpanZ / 2],
    ETL: [sE, yE, ENG.crankZ + zE], ETR: [sE, -yE, ENG.crankZ + zE], EBL: [sE, yE, ENG.crankZ - zE], EBR: [sE, -yE, ENG.crankZ - zE],
  },
  // [a, b, OD in, wall in]  longerons 3/4 × .049, diagonals and ring 5/8 × .035 (ASSUMED, typical 4130 mount sizes)
  members: [
    ['FTL', 'ETL', 0.75, 0.049], ['FTR', 'ETR', 0.75, 0.049], ['FBL', 'EBL', 0.75, 0.049], ['FBR', 'EBR', 0.75, 0.049],
    ['FTL', 'EBL', 0.625, 0.035], ['FBR', 'ETR', 0.625, 0.035], ['FTR', 'ETL', 0.625, 0.035], ['FBL', 'EBR', 0.625, 0.035],
    ['ETL', 'ETR', 0.625, 0.035], ['EBL', 'EBR', 0.625, 0.035], ['ETL', 'EBL', 0.625, 0.035], ['ETR', 'EBR', 0.625, 0.035],   // no ring diagonal: in the cup plane it crossed the accessory housing (ICD G phase 2); the four triangulated faces keep the truss stable
  ],
};
const MOUNT_GEO = { t: 'frame', nodes: MOUNT.nodes, members: MOUNT.members, mat: '4130' };

// ------------------------------------------------------------------------------------------- fuel layout (block F, wpF0_layout.js)
// The tank, the outlet station, the cabin and firewall-aft routes and every fuel part's primitives come from wpF0 (inches),
// sized on the released strake cavity. The routes live here so that block A's bulkhead holes follow them (ICD FM-16).
export const TANK_GAL = strakeVolumes().cavity / 231;
const VALVE = [8.175, 0, 2.38], FFT = [10.295, 0.33, 2.40], CARB = [ENG.accFace + 0.27, 0.10, 2.10];
// fluid ports (model frame, ft): every line starts and ends exactly on one of these
export const PORT = {
  fftIn: [FFT[0] - 0.95 / 12, FFT[1], FFT[2]], fftOut: [FFT[0] + 0.95 / 12, FFT[1], FFT[2]],   /* EI FT-60 ports 0.95 in each side (1.90 in long; was 0.72) */
  fpIn: [ENG.accFace - 0.18, 0.25, ENG.crankZ - 0.32], fpOut: [ENG.accFace - 0.09, 0.25, ENG.crankZ - 0.39],
  carbIn: [ENG.accFace + 0.27, 0.16, 2.22], carbPt: [ENG.accFace + 0.20, 0.16, 2.28],
  oilOut: [ENG.accFace, 0.40, 3.08], oilRtn: [ENG.accFace, 0.40, 2.92], oilP: [ENG.accFace - 0.02, 0.30, ENG.crankZ - 0.10], map: [ENG.accFace + 0.45, -0.25, ENG.crankZ - 0.45],
  coolerIn: [11.025, 0.72, 3.12], coolerOut: [11.025, 0.74, 2.95],
  maniFuel: [FW + 0.07, 0.45, 2.50], maniOil: [FW + 0.07, 0.52, 2.60], maniMap: [FW + 0.07, 0.59, 2.50],
};
export const FL = fuelLayout({ fpIn: inOf(PORT.fpIn), fpOut: inOf(PORT.fpOut), carbIn: inOf(PORT.carbIn), carbPt: inOf(PORT.carbPt) }, { in: inOf(PORT.fftIn), out: inOf(PORT.fftOut) }, TANK_GAL);
export const FPRIMS = fuelPrims(FL);
Object.assign(PORT, { valveOut: ftOf(FL.valveOut), bhFwd: ftOf(FL.UNION.fwd), bhAft: ftOf(FL.UNION.aft), gascIn: ftOf(FL.gasc.in), gascOut: ftOf(FL.gasc.out), gascDrain: ftOf(FL.gasc.drainTip),
  pumpIn: ftOf(FL.PUMP.a), pumpOut: ftOf(FL.PUMP.b) });
const SD = (sg) => (sg < 0 ? 'L' : 'R'), MXi = (q, sg) => [sg * q[0], q[1], q[2]];
/** a definition primitive (in, [BL, FS, WL]) as a system display primitive (ft, [FS, BL, WL]) */
const toSysF = (q) => (q.t === 'box' ? { t: 'box', c: ftOf(q.c), d: [q.d[1] / 12, q.d[0] / 12, q.d[2] / 12] } : { t: 'cyl', a: ftOf(q.a), b: ftOf(q.b), r: q.r / 12 });
const sysGeo = (pn, keep = () => true) => FPRIMS[pn].filter(keep).map(toSysF);
const pathF = (pts, od, w, ends, endFit, extra = {}) => ({ t: 'path', pts: pts.map(ftOf), dIn: od, ...(w ? { wallIn: w } : { massPerFt: 0 }), cls: 'fuel', ends, endFit, ...extra });
const mEach = (pn) => +massEachF(pn, FPRIMS[pn]).toFixed(4);
// stacks run aft below the cylinders outboard of the starter and alternator (prop end, low), then sweep inboard behind them
// to the exits (ICD G phase 2: the straight runs to BL ±2–5 at WL 30 went through the starter, the alternator and the case);
// the rear stacks run inboard of the front stacks' port drops and take the inner exits, the front stacks the outer ones
export const EXH_RUN = { rear: 8.3 / 12, front: 10.2 / 12, sAft: 161.20 / 12, sTurn: 162.90 / 12, zRun: 2.50, zFront: 31.0 / 12, zTurn: 30.2 / 12 };
const exhaustPath = (s, sg, yExit, rear) => { const R = EXH_RUN, y = rear ? R.rear : R.front;
  return [[s + 0.08, sg * 1.02, ENG.crankZ - 0.30], [s + 0.16, sg * 0.92, 2.55], ...(rear ? [[s + 0.38, sg * y, R.zRun]] : []), [R.sAft, sg * y, rear ? R.zRun : R.zFront], [R.sTurn, sg * yExit, R.zTurn], [ENG.flange + 0.10, sg * yExit * 1.05, 2.22]]; };
const cable = (dy, endZ) => [[4.1195, -0.80 + dy, 3.08], [4.2855, -0.82 + dy, 2.62], [8.275, -0.82 + dy, 2.52], [10.425, -0.58 + dy, 2.55], [10.825, -0.50 + dy, 2.55], [CARB[0] - 0.40, -0.30 + dy, 2.40], [CARB[0] - 0.12, -0.12 + dy, 2.36], [CARB[0] - 0.10, -0.12 + dy, endZ]];
void VALVE;

// ------------------------------------------------------------------------------------------- parts
const COMMON = { massItem: 'engine' };
const S1 = (title, inspect) => ({ title, inspect });
defineParts([
  // ---- ATA 71 powerplant
  { ...COMMON, pn: 'LEZ-71-200', name: 'Powerplant installation', kind: 'install', ata: 71, massEach: 0.6, geo: [{ t: 'box', c: [FW + 0.02, 0, ENG.crankZ], d: [0.02, 0.4, 0.4] }],
    blurb: 'Top-level assembly for everything firewall-aft: engine, mount, propeller, cooling, induction, exhaust, oil and engine controls. Mass 0.6 lb is the safety wire, clamps and fire-sleeve ends not itemised elsewhere.',
    steps: [S1('Hang the engine on the mount, mount on the firewall', ['Mount bolts torqued, cotter-pinned']), S1('Connect fuel, oil, controls; fit baffles and cowl', ['Control travel full and free', 'Every hose fire-sleeved firewall-aft']), S1('First run and leak check', ['No leaks at 2 runs', 'Oil pressure and CHT in limits'])],
    src: { mass: 'ASSUMED' } },
  { ...COMMON, pn: 'LEZ-71-210', name: `Engine, Lycoming ${O235.model}, ${O235.hp} hp (conical mounts)`, kind: 'cots', ata: 71, nha: 'LEZ-71-200', massEach: O235.dryLb, cg: [ENG.flange - O235.cgFromFlange / 12, -O235.cgLeft / 12, ENG.crankZ - O235.cgBelowCL / 12], geo: ENGINE_GEO, fit: 'cowl', onMount: true,
    ports: { 'FP-IN': { at: PORT.fpIn, kind: 'fuel', fit: 'AN816-6D nipple (pump inlet)' }, 'FP-OUT': { at: PORT.fpOut, kind: 'fuel', fit: 'AN816-6D nipple (pump outlet)' }, 'CARB-IN': { at: PORT.carbIn, kind: 'fuel', fit: 'AN824-6D tee on carb inlet' }, 'CARB-PT': { at: PORT.carbPt, kind: 'fuel', fit: 'AN919-4D reducer on the tee branch' },
      'OIL-OUT': { at: PORT.oilOut, kind: 'oil', fit: 'AN822-8D elbow, cooler-out port' }, 'OIL-RTN': { at: PORT.oilRtn, kind: 'oil', fit: 'AN822-8D elbow, cooler-return port' }, 'OIL-P': { at: PORT.oilP, kind: 'oil', fit: 'AN816-4D, gallery pressure port' }, MAP: { at: PORT.map, kind: 'air', fit: 'AN816-3D, intake riser port' } },
    flow: [['FP-IN', 'FP-OUT'], ['CARB-IN', 'CARB-PT'], ['OIL-OUT', 'OIL-RTN'], ['OIL-RTN', 'OIL-P']],
    material: 'COTS', std: `Lycoming ${O235.model} (FAA TC E-223; eligible for pusher installation)`,
    blurb: 'Four-cylinder, direct-drive, horizontally opposed, wet-sump, air-cooled, carburetted (updraft MA-3A under the sump), two Slick magnetos on the accessory housing, starter and belt-driven alternator at the prop end, plunger-driven diaphragm fuel pump. Installed backwards (pusher): the accessory housing faces the firewall. Hung on four conical isolators on lugs at the accessory-end corners of the crankcase, mounts parallel to the crankshaft. Interfaces (mount lugs, prop flange, fuel and oil ports, magneto P-leads, starter and alternator studs, ground stud, plugs, CHT / EGT bosses) are checked against the wiring and plumbing in eng-iface.',
    props: [['Model', `${O235.model}: ${O235.hp} hp at ${O235.rpm} rpm, ${O235.dispCuIn} cu in, ${O235.bore} × ${O235.stroke} in, CR ${O235.cr}, firing ${O235.firing} [TCDS] [OM]`], ['Dry weight / C.G.', `${O235.dryLb} lb; ${O235.cgFromFlange} in from the prop flange, ${O235.cgBelowCL} in below and ${O235.cgLeft} in left of the crankshaft [TCDS]`],
      ['Envelope', `${O235.envelope.L} L × ${O235.envelope.W} W × ≈ ${O235.envelope.H} H in (bracketed by the WWII O-235 and IO-233 published envelopes [EH]; verify)`], ['Mounts', `${O235.mount.kind}, pads ${O235.mount.dy} × ${O235.mount.dz} in [SSP] [GAN]; cone-style isolators [AS]`],
      ['Prop flange', `${O235.propFlange}; FS ${(ENG.flange * 12).toFixed(1)} (8 in extension to the prop)`], ['Magnetos / carburettor', `${O235.mags.join(', ')}; ${O235.carb} [TCDS] [OM]`], ['Cylinders', O235.cylNo],
      ...O235.drives.map(([n, r, d]) => [`Drive: ${n}`, `${r}, ${d} facing the pad [OM]`]), ['Oil', `${O235.oilQt} US qt [OM]`]],
    notes: ['Dry weight includes starter and alternator. Builders who delete the starter save about 17 lb (public builder reports).'], src: { mass: SRC_ENG, dims: SRC_ENG } },
  { ...COMMON, pn: 'LEZ-71-220', name: 'Engine mount, welded 4130 tube', kind: 'weldment', ata: 71, nha: 'LEZ-71-200', material: '4130', geo: [MOUNT_GEO], extraMass: 0.6, onMount: true,
    blurb: 'Four firewall pick-ups (the existing firewall hard-points) to the four conical-mount pads on the crankcase: four longerons, four diagonals and a four-tube ring (rev C: no ring diagonal). Sized against FAR 23.361/.363/.371 engine loads.',
    interfaces: [{ id: 'mount-fw', name: 'Engine mount → firewall hard-points', host: 'fuselage', at: [FW, 0, ENG.crankZ], n: 4, d: GEO.engine.boltD, kind: 'bolt', where: 'firewall, 4 × AN6', note: 'Bearing in the firewall is the existing fus-engine check' }],
    steps: [S1('Cut and fish-mouth tubes to the full-size jig drawing', ['Fit-up gaps ≤ 0.010 in']), S1('Tack in the jig, then TIG weld; normalise welds', ['No undercut, full penetration at every cluster']), S1('Ream bushings in the jig; prime inside (linseed oil) and out', ['Pick-up positions within ±1/32 in of the jig', 'Tubes drained and oiled'])],
    props: [['Tube sizes', '3/4 × .049 longerons; 5/8 × .035 diagonals and ring (ASSUMED)'], ['Weld allowable', '80 ksi tension at welds, per AC 43.13-1B practice (ASSUMED)']],
    src: { geometry: 'ASSUMED, typical conical mount', loads: 'FAR 23.361, 23.363, 23.371 (yardstick; verify sections against eCFR)' } },
  { ...COMMON, pn: 'LEZ-71-221', name: 'Vibration isolators, conical (set of 4)', kind: 'cots', ata: 71, nha: 'LEZ-71-220', qty: 4, massEach: 0.5, onMount: true, geo: Object.entries(MOUNT.nodes).filter(([k]) => k[0] === 'E').map(([, c]) => ({ t: 'cyl', a: [c[0] - 0.04, c[1], c[2]], b: [c[0] + 0.04, c[1], c[2]], r: 0.09 })), src: { mass: 'ASSUMED' } },
  { ...COMMON, pn: 'LEZ-71-230', name: 'Cylinder baffles and plenum seals', kind: 'machined', ata: 71, nha: 'LEZ-71-200', material: '6061', massEach: 3.5, onMount: true,
    geo: bafflePlates(),
    blurb: '0.032 in aluminium baffles around the cylinders, sealed to the cowl with silicone-fabric strip so cooling air must pass through the fins (updraft: in from the belly inlet, up through the cylinders, out aft).',
    steps: [S1('Cut and bend baffles to the engine, fit seals', ['Seals lie with the airflow, no gaps at the cowl'])], src: { mass: 'ASSUMED' } },
  { ...COMMON, pn: 'LEZ-71-240', name: 'Cooling inlet, NACA submerged duct', kind: 'laminate', ata: 71, nha: 'LEZ-71-200', massEach: 1.4, meshes: /^NACAInlet$/, geo: [{ t: 'box', c: [10.875, 0, 2.30], d: [1.2, 0.80, 0.16] }],
    blurb: 'Submerged NACA ramp on the belly feeding the lower plenum. Throat 9.5 × 4.2 in (40 in², ASSUMED).', inlet: { area: 40 },
    steps: [S1('Lay up 3 BID over a foam ramp plug; bond into the lower cowl', ['Ramp walls sharp, lips radiused 1/4 in'])], src: { mass: 'ASSUMED', area: 'ASSUMED' } },
  { ...COMMON, pn: 'LEZ-71-250', oml: true /* cowl-belly scoop bulge: its envelope is part of the OML */, name: 'Carb air scoop and filtered air box', kind: 'laminate', ata: 71, nha: 'LEZ-71-200', massEach: 2.0, fit: 'scoop', geo: [{ t: 'box', c: [CARB[0] - 0.05, 0, 2.05], d: [0.80, 0.50, 0.44] }],
    ports: { 'RAM-IN': { at: [CARB[0] - 0.45, 0, 1.95], kind: 'air', open: true }, 'HEAT-IN': { at: [CARB[0] + 0.15, -0.18, 2.10], kind: 'air', fit: '2 in SCAT flange, hose clamp' } },
    blurb: 'Ram-air scoop under the lower cowl into an air box with a foam filter and a carb-heat flapper. The updraft carburettor hangs below the sump, so the scoop is a bulge on the cowl belly.',
    steps: [S1('Lay up scoop over a foam plug; fit air box and flapper', ['Flapper closes fully both ways', 'Filter sealed to the box'])], src: { mass: 'ASSUMED' } },
  // ---- ATA 61 propeller
  { ...COMMON, pn: 'LEZ-61-100', external: true /* propeller */, name: 'Propeller, fixed-pitch wood, 57 in', kind: 'cots', ata: 61, massEach: 9.0, onMount: true, meshes: /^Prop(_Blades)?$/, geo: [{ t: 'cyl', a: [GEO.prop.s - 0.08, 0, GEO.prop.z], b: [GEO.prop.s + 0.08, 0, GEO.prop.z], r: 0.25 }],
    blurb: 'Two-blade laminated wood pusher prop with a leading-edge erosion strip. Bolted through the spinner backplate and extension with a crush plate; bolt torque re-checked after the first hours.', props: [['Diameter', `${(GEO.prop.r * 24).toFixed(0)} in`], ['Hub', `FS ${(GEO.prop.s * 12).toFixed(1)}`]], src: { mass: 'DEFINED: LEZ-61-100 record (57 in, GEO.prop.r)' } },
  { ...COMMON, pn: 'LEZ-61-110', external: true /* prop extension, aft of the cowl */, name: 'Prop extension, 6061-T6, 8 in', kind: 'machined', ata: 61, nha: 'LEZ-61-100', material: '6061', massEach: 3.6, blurb: 'Hollow 6061-T6 extension with drive lugs. Moves the engine 6 in forward of a short-extension installation, so the mount is shorter and the engine CG sits near the original estimate. Buy a type with service history on EZs; balance checked with the prop.', onMount: true, geo: [{ t: 'cyl', a: [ENG.flange, 0, GEO.prop.z], b: [GEO.prop.s - 0.08, 0, GEO.prop.z], r: 0.17 }],
    steps: [S1('Machine from bar; drill bolt pattern to the flange', ['Face run-out ≤ 0.002 in', 'Bolt-hole true position ±0.003 in'])], src: { mass: 'ASSUMED' } },
  { ...COMMON, pn: 'LEZ-61-120', external: true /* spinner */, name: 'Spinner and backplates', kind: 'cots', ata: 61, nha: 'LEZ-61-100', massEach: 2.0, onMount: true, geo: [{ t: 'cyl', a: [14.225, 0, GEO.prop.z], b: [14.675, 0, GEO.prop.z], r: 0.20 }], src: { mass: 'ASSUMED' } },
  // ---- ATA 78 exhaust
  { ...COMMON, pn: 'LEZ-78-100', name: 'Exhaust stacks, 4 × 1.5 in stainless', kind: 'weldment', ata: 78, material: 'stainless', extraMass: 1.6, onMount: true,
    geo: [['LR', -1, 0.16], ['LF', -1, 0.42], ['RR', 1, 0.16], ['RF', 1, 0.42]].map(([k, sg, ye]) => { const pts = exhaustPath(cylS[k], sg, ye, k[1] === 'R'); return { t: 'path', pts, dIn: 1.5, wallIn: 0.035, cls: 'exhaust', extSeg: [pts.length - 1] }; }),
    blurb: 'One straight stack per cylinder, out through the lower cowl just ahead of the exit. The left-rear stack carries the carb-heat muff.',
    steps: [S1('Cut and bend 321 stainless, weld flanges', ['Flange flat after welding']), S1('Hang on the engine; check cowl clearance', ['≥ 1 in to the cowl except at the exit sleeve', '≥ 6 in to fuel and wiring'])],
    src: { mass: 'GEOMETRY + 1.6 lb flanges and hardware (ASSUMED)' } },
  { ...COMMON, pn: 'LEZ-78-110', name: 'Carb-heat muff and SCAT duct', kind: 'machined', ata: 78, nha: 'LEZ-78-100', material: 'stainless', massEach: 1.0,
    geo: [{ t: 'cyl', a: [cylS.LR + 0.25, -0.9, 2.53], b: [cylS.LR + 0.55, -0.82, 2.52], r: 0.09 }, { t: 'path', pts: [[cylS.LR + 0.55, -0.80, 2.55], [CARB[0] + 0.45, -0.55, 2.42], [CARB[0] + 0.20, -0.22, 2.36], [CARB[0] + 0.15, -0.18, 2.10]], dIn: 2.0, massPerFt: 0.12, cls: 'air', extSeg: [3], ends: ['LEZ-78-110:MUFF-OUT', 'LEZ-71-250:HEAT-IN'], endFit: ['hose clamp', 'hose clamp'] }],
    ports: { 'MUFF-IN': { at: [cylS.LR + 0.25, -0.90, 2.53], kind: 'air', open: true }, 'MUFF-OUT': { at: [cylS.LR + 0.55, -0.80, 2.55], kind: 'air', fit: '2 in SCAT spigot' } },
    steps: [S1('Roll muff shroud around the stack; clamp; route SCAT to the air box', ['SCAT clear of the stacks by ≥ 1 in'])], src: { mass: 'ASSUMED' } },
  // ---- ATA 79 oil
  { ...COMMON, pn: 'LEZ-79-100', name: 'Oil, 6 US qt', kind: 'install', ata: 79, massEach: 11.3, onMount: true, geo: [{ t: 'box', c: [ENG.flange - 1.70, 0, 2.43], d: [1.1, 0.7, 0.24] }], steps: [S1('Fill to 6 qt with ashless-dispersant oil; check after the first run', ['Dipstick at full mark, no leaks'])], src: { mass: '6 qt × 1.875 lb/qt' } },
  { ...COMMON, pn: 'LEZ-79-110', name: 'Oil cooler, 9-row (firewall, right side)', kind: 'cots', ata: 79, massEach: 2.5, onMount: true,
    geo: [{ t: 'box', c: [10.925, 0.82, 3.05], d: [0.20, 0.30, 0.40] }],
    ports: { IN: { at: PORT.coolerIn, kind: 'oil', fit: 'AN822-8D elbow' }, OUT: { at: PORT.coolerOut, kind: 'oil', fit: 'AN822-8D elbow' } }, flow: [['IN', 'OUT']],
    scd: { spec: 'Aviation oil cooler, 9 rows, -8 (1/2 in) ports, ≥ 30,000 BTU/h at 30 lb/min air; envelope 2.4 × 3.6 × 4.8 in', envelope: [2.4, 3.6, 4.8] },
    blurb: 'Cooler on the firewall\'s right side, outboard of the mount tubes; baffle-plenum air through it.', src: { mass: 'ASSUMED' } },
  { ...COMMON, pn: 'LEZ-79-115', name: 'Oil cooler hoses (-8, fire-sleeved)', kind: 'line', ata: 79, nha: 'LEZ-79-110', massEach: 1.1, onMount: true, material: 'hose -8, AS1072 fire sleeve',
    geo: [{ t: 'path', pts: [PORT.oilOut, [11.175, 0.60, 3.12], PORT.coolerIn], dIn: 0.6, massPerFt: 0, cls: 'oil', ends: ['LEZ-71-210:OIL-OUT', 'LEZ-79-110:IN'], endFit: ['-8 swivel, 90°', '-8 swivel, straight'] },
      { t: 'path', pts: [PORT.coolerOut, [11.275, 0.60, 2.93], PORT.oilRtn], dIn: 0.6, massPerFt: 0, cls: 'oil', ends: ['LEZ-79-110:OUT', 'LEZ-71-210:OIL-RTN'], endFit: ['-8 swivel, straight', '-8 swivel, 90°'] }],
    steps: [S1('Make up hoses to the hose drawing; fire sleeve; pressure-test', ['Proof 300 psi, no leaks', 'No chafe points; ≥ 6 in from exhaust'])], src: { mass: 'ASSUMED' } },
  // ---- ATA 73 engine fuel (block F: geometry from wpF0_layout.js)
  { ...COMMON, pn: 'LEZ-73-100', name: 'Gascolator on an offset firewall bracket', kind: 'cots', ata: 73, nha: 'LEZ-28-100', massEach: mEach('LEZ-73-100'), geo: sysGeo('LEZ-73-100'),
    ports: { IN: { at: PORT.gascIn, kind: 'fuel', fit: 'AN822-6D elbow from the union (outboard face of the head)' }, OUT: { at: PORT.gascOut, kind: 'fuel', fit: 'AN822-6D elbow (inboard face)' }, RISER: { at: ftOf(FL.riser.at(-1)), kind: 'fuel', fit: 'AN833-6D bulkhead elbow in the riser clip on the bracket, tube side (rev 2026-11-19)' }, HOSE: { at: ftOf(FL.riser.at(-1)), kind: 'fuel', fit: 'AN833-6D bulkhead elbow, hose side' }, DRAIN: { at: PORT.gascDrain, kind: 'fuel', open: true, fit: 'push-type drain at the lower cowl skin' } }, flow: [['IN', 'OUT'], ['RISER', 'HOSE']],
    scd: { spec: 'Andair GAS375-M firewall gascolator (Aircraft Spruce 05-29551, accessed 2026-11-19): 97.5 mm overall, 43 mm wide, 152 g; the envelope here is larger (conservative); -6 ports; steel or anodised bowl with fire-resistant seal, -6 ports, 80-mesh screen, push-type quick drain with extension; steel or anodised bowl with fire-resistant seal (no plain aluminium bowl); head ≤ 2.0 × 2.0 × 1.0 in, bowl ≤ Ø 2.0 × 2.5 in', envelope: [2.0, 2.0, 3.5] },
    blurb: 'Gascolator head on a shelf bracket bolted to the firewall at block A\'s layout bolts (BL 1.60 / 3.20, WL 28.20); the body sits inboard at BL 1.10 so it clears the mount diagonal FBL–EBR. Its bowl is the low point of the engine-side fuel system; the drain stem reaches the lower cowl skin.',
    src: { mass: 'GEOMETRY + vendor mass typed from memory (LEZ-73-100 record)' } },
  { ...COMMON, pn: 'LEZ-73-110', name: 'Fuel hoses firewall-aft (fire-sleeved -6), carb tee and reducer', kind: 'line', ata: 73, nha: 'LEZ-28-100', massEach: mEach('LEZ-73-110'),
    material: 'PTFE hose -6, AS1072 fire sleeve',
    geo: [pathF(FL.riser, TUBE.feed.od, TUBE.feed.w, ['LEZ-73-100:OUT', 'LEZ-73-100:RISER'], ['AN822-6D elbow', 'AN833-6D bulkhead elbow on the riser clip']), pathF(FL.hose1, HOSE6.od, 0, ['LEZ-73-100:HOSE', 'LEZ-71-210:FP-IN'], ['-6 swivel, 90°', '-6 swivel, 90°'], { shield: true }), pathF(FL.hose2, HOSE6.od, 0, ['LEZ-71-210:FP-OUT', 'LEZ-71-210:CARB-IN'], ['-6 swivel, 90°', '-6 swivel, straight'], { shield: true })],
    hardware: [{ std: 'AN824-6D', qty: 1, desc: 'tee on the carburettor inlet', each: 0.06 }, { std: 'AN919-4D', qty: 1, desc: 'reducer on the tee branch (fuel-pressure line, block H)', each: 0.02 }],
    steps: [S1('Make up hoses to the hose drawing; fire sleeve; proof-test', ['Proof 1.5 × the engine pump\'s maximum pressure, no leaks', '≥ 6 in from exhaust; ≥ 0.5 in from every mount tube', 'Gascolator-to-pump hose: arc with ≥ 0.5 in slack over the chord (isolator motion)'])], src: { mass: 'GEOMETRY (LEZ-73-110 record)' } },
  // ---- ATA 76 engine controls
  { ...COMMON, pn: 'LEZ-76-100', name: 'Throttle quadrant (throttle, mixture)', kind: 'mechanism', ata: 76, massEach: 1.2, meshes: /^ThrottleQuadrant$/, geo: [{ t: 'box', c: [4.0827, -0.82, 3.12], d: [0.4, 0.12, 0.2] }],
    blurb: 'Left-console quadrant with friction lock. Full throttle forward.', steps: [S1('Assemble; set friction', ['Full travel both levers', 'Friction holds at cruise'])], src: { mass: 'ASSUMED' } },
  { ...COMMON, pn: 'LEZ-76-110', name: 'Engine control cables (throttle, mixture, carb heat)', kind: 'cable', ata: 76, massEach: 1.8,
    geo: [{ t: 'path', pts: cable(0, 2.18), dIn: 0.25, massPerFt: 0, cls: 'cable', extSeg: [7] }, { t: 'path', pts: cable(0.05, 2.12), dIn: 0.25, massPerFt: 0, cls: 'cable', extSeg: [7] }, { t: 'path', pts: [...cable(0.10, 2.0).slice(0, 6), [CARB[0] - 0.20, -0.10, 2.36], [CARB[0] - 0.15, -0.08, 2.05]], dIn: 0.25, massPerFt: 0, cls: 'cable', extSeg: [7] }],
    blurb: 'Push-pull cables in conduit along the left side, through the firewall at a fire-sealed bulkhead fitting, clamped at the carb and air box.',
    steps: [S1('Route and clamp every 18 in; seal the firewall fitting', ['Full stop-to-stop at the carb with cushion at both ends', 'No bend radius below 6 in'])], src: { mass: 'ASSUMED' } },
  // ---- ATA 28 fuel (block F: geometry from wpF0_layout.js; FL = the layout in inches)
  { ...COMMON, pn: 'LEZ-28-100', name: 'Fuel system installation', kind: 'install', ata: 28, massEach: 0.30, geo: [{ t: 'box', c: ftOf(FL.VALVE), d: [0.02, 0.02, 0.02] }],
    blurb: 'Two integral strake tanks (LEZ-57-180), each with a root-rib outlet into a cabin-side well with a finger strainer and a belly quick-drain, a vent from the inboard bay\'s high point, a flush filler and a sight gauge, feeding a left/right/off selector on the centre line aft of the rear seat bulkhead, an electric boost pump, the fuel-flow transducer, the firewall union, the gascolator, the engine-driven pump and the carburettor.',
    steps: [S1('Flow test at the carb inlet, each tank, boost pump only, flowmeter blocked', ['≥ 125 % of take-off flow (FAR 23.955(c))']), S1('Unusable-fuel test at the worst attitude', ['Record unusable per tank (FAR 23.959)'])], src: { mass: 'LEZ-28-100 record (hardware lines)' } },
  { ...COMMON, pn: 'LEZ-28-110', name: 'Tank outlet: root-rib passage, finger strainer, cabin-side well and outlet fitting (L/R)', kind: 'machined', ata: 28, nha: 'LEZ-28-100', material: 'glass / aluminium / brass', qty: 2, massEach: mEach('LEZ-28-110'),
    geo: sysGeo('LEZ-28-110'),
    ports: Object.fromEntries([-1, 1].flatMap((sg) => [[`OUT-${SD(sg)}`, { at: ftOf(MXi(FL.sump.outlet, sg)), kind: 'fuel', fit: 'AN816-6D nipple in the well\'s boss' }], [`DRAIN-${SD(sg)}`, { at: ftOf(MXi(FL.sump.drainPt, sg)), kind: 'fuel', fit: '1/8 NPT × AN816-3D' }]])),
    flow: [['OUT-L', 'DRAIN-L'], ['OUT-R', 'DRAIN-R']],
    blurb: 'A 1/2 in tube potted through the root rib R1, the strake-joint wedge and the shell side wall drains the tank\'s floor at the root (the sill) into a glass well bonded to the cabin side of the shell; a finger strainer covers the tank end. The outlet fitting and the drain leave the well low down. The station is the one with the least worst-case unusable fuel on the released cavity.',
    steps: [S1('Pot the passage tube with flox through R1, the wedge conduit and the shell; bond the well; fit the strainer before closing the tank', ['Passage invert flush with the tank floor', 'Well leak-free at 2 psi with the tank'])], src: { mass: 'GEOMETRY (LEZ-28-110 record)' } },
  { ...COMMON, pn: 'LEZ-28-120', name: 'Fuel feed lines, tanks to selector (3/8 × .035 5052-O)', kind: 'line', ata: 28, nha: 'LEZ-28-100', material: 'aluminium', massEach: mEach('LEZ-28-120'),
    geo: [-1, 1].map((sg) => pathF(FL.feed(sg), TUBE.feed.od, TUBE.feed.w, [`LEZ-28-110:OUT-${SD(sg)}`, `LEZ-28-130:IN-${SD(sg)}`], ['AN818-6D / AN819-6D', 'AN818-6D / AN819-6D'])),
    steps: [S1('Bend and flare; clamp at the drawing stations', ['Flares inspected', 'Falls continuously from the well to the selector'])], src: { mass: 'GEOMETRY' } },
  { ...COMMON, pn: 'LEZ-28-130', name: 'Fuel selector valve (L / R / OFF) on a floor bracket', kind: 'cots', ata: 28, nha: 'LEZ-28-100', massEach: mEach('LEZ-28-130'), geo: sysGeo('LEZ-28-130'),
    ports: { 'IN-L': { at: ftOf(FL.valveIn(-1)), kind: 'fuel', fit: 'AN816-6D' }, 'IN-R': { at: ftOf(FL.valveIn(1)), kind: 'fuel', fit: 'AN816-6D' }, OUT: { at: PORT.valveOut, kind: 'fuel', fit: 'AN816-6D' } }, flow: [['IN-L', 'OUT'], ['IN-R', 'OUT']],
    scd: { spec: 'Fuel selector, LEFT / RIGHT / OFF, 1/4 NPT ports, positive detents, OFF guarded by a lift-to-turn stop; ≤ 0.3 psi drop at 15 gph; envelope 2.2 × 2.2 × 1.5 in', envelope: [2.2, 2.2, 1.5] },
    blurb: 'On the centre line aft of the rear seat bulkhead, on a bracket to the belly, below the tank outlets so the lines fall to it. Its stem carries the remote drive LEZ-28-135, which brings the selection to a knob beside the pilot\'s left hip (FAR 23.995).', src: { mass: 'LEZ-28-130 record' } },
  { ...COMMON, pn: 'LEZ-28-135', name: 'Fuel selector remote drive: right-angle drives, torque tube, universal joint, knob at the pilot\'s left hip', kind: 'mechanism', ata: 28, nha: 'LEZ-28-130', material: '6061', massEach: mEach('LEZ-28-135'),
    geo: [...sysGeo('LEZ-28-135', (q) => !['tube', 'shaft'].includes(q.feat)),
      ...[[FL.drive.cross[0], FL.drive.cross[1]], [FL.drive.side[0], FL.drive.side[1]], [FL.drive.shaft[0], FL.drive.shaft[1]]].map((pts) => ({ t: 'path', pts: pts.map(ftOf), dIn: 0.5, massPerFt: 0, cls: 'pushrod' }))],
    scd: { spec: 'Right-angle drives (2): 1:1 bevel, 1/2 in tube sockets, ≥ 300 in·lb ultimate, backlash ≤ 2°; universal joint 1/2 in bore, ≥ 300 in·lb ultimate, ≤ 30° working angle; knob Ø 2.0 with pointer and L / R / OFF placard (OFF lift-to-turn stays at the valve detent)', envelope: [1.5, 1.5, 1.5] },
    blurb: 'Brings the selector (FS 136.6, centre line) to the pilot (FAR 23.995): a right-angle drive on the valve stem turns the drive outboard, a second turns it forward, and a 1/2 × .049 6061 torque tube runs along the left side above H\'s engine-control cables, through the rear seat bulkhead and the front seat back\'s left leg opening, to a universal joint and a short shaft up to a knob beside the pilot\'s left hip under the aft end of the left armrest. Nylon bearings on wall brackets support it.',
    steps: [S1('Bond the bearing brackets to the side wall; fit the drives, tube, joint and knob; pin every joint (AN3 through-bolts)', ['Knob pointer agrees with the valve position in all three detents', 'Free play at the knob ≤ 5°', 'OFF needs the lift-to-turn motion'])], src: { mass: 'LEZ-28-135 record' } },
  { ...COMMON, pn: 'LEZ-28-140', name: 'Electric boost pump', kind: 'cots', ata: 28, nha: 'LEZ-28-100', massEach: mEach('LEZ-28-140'), geo: sysGeo('LEZ-28-140'),
    ports: { IN: { at: PORT.pumpIn, kind: 'fuel', fit: 'AN816-6D (3/8 tube × 1/4 NPT)' }, OUT: { at: PORT.pumpOut, kind: 'fuel', fit: 'AN816-6D (3/8 tube × 1/4 NPT)' } }, flow: [['IN', 'OUT']],
    scd: { spec: 'Facet 40106 solid-state pump (12 V): 4.0 psi minimum / 7.0 psi maximum, 32 gph, 36 in dry lift; 1/8-27 NPT internal ports with AN816-6-2D adapters; under 3 in in any direction (Facet ratings via Aircraft Spruce, accessed 2026-11-19). Note: the maker states its pumps are not intended for aircraft use (Miles accepted the Facet pump, 2026-11-19). Current draw ≤ 2.5 A and bypass when off BOUND', envelope: [3.0, 3.0, 3.0] },
    props: [['Pump curve (typed from memory, bounded in fuel-flow)', '4.0 psi dead-head, 32 gph free flow']], src: { mass: 'LEZ-28-140 record' } },
  { ...COMMON, pn: 'LEZ-28-150', name: 'Fuel line, selector to firewall (3/8 × .035 5052-O)', kind: 'line', ata: 28, nha: 'LEZ-28-100', material: 'aluminium', massEach: mEach('LEZ-28-150'),
    geo: [pathF(FL.vToPump, TUBE.feed.od, TUBE.feed.w, ['LEZ-28-130:OUT', 'LEZ-28-140:IN'], ['AN818-6D / AN819-6D', 'AN818-6D / AN819-6D']),
      pathF(FL.pToFft, TUBE.feed.od, TUBE.feed.w, ['LEZ-28-140:OUT', 'LEZ-77-130:IN'], ['AN818-6D / AN819-6D', 'AN818-6D / AN819-6D']),
      pathF(FL.fftToFw, TUBE.feed.od, TUBE.feed.w, ['LEZ-77-130:OUT', 'LEZ-28-155:FWD'], ['AN818-6D / AN819-6D', 'AN818-6D / AN819-6D'])],
    steps: [S1('Bend, flare, clamp; union at the firewall', ['Firewall union steel, fire-sealed'])], src: { mass: 'GEOMETRY' } },
  { ...COMMON, pn: 'LEZ-28-160', name: 'Tank vents (L/R, 1/4 × .035 5052-O)', kind: 'line', ata: 28, nha: 'LEZ-28-100', material: 'aluminium', qty: 2, massEach: mEach('LEZ-28-160'),
    geo: [-1, 1].map((sg) => pathF(FL.vent.pts.map((q) => MXi(q, sg)), TUBE.vent.od, TUBE.vent.w, [`LEZ-28-165:TANK-${SD(sg)}`, `LEZ-28-165:OUT-${SD(sg)}`], ['open pick-up, 0.35 in under the inner skin', 'scarfed 45° forward, open'], { extSeg: [3, 4] })),
    blurb: 'Pick-up near the tank\'s high point (top of the inboard bay), down through the bay to a bulkhead union in the strake\'s lower skin, out 1/2 in below it scarfed forward.', vent: true,
    steps: [S1('Install before the upper skin; blow through after closure', ['Open end scarfed forward', 'Falls continuously from the pick-up to the outlet'])], src: { mass: 'GEOMETRY' } },
  { ...COMMON, pn: 'LEZ-28-170', name: 'Filler caps and necks (L/R)', kind: 'cots', ata: 28, nha: 'LEZ-28-100', qty: 2, massEach: mEach('LEZ-28-170'), geo: sysGeo('LEZ-28-170'),
    blurb: 'Flush locking caps in the strake\'s upper skin over the inboard bay\'s centre, clear of the baffle R2; the neck reaches down so that 2 % of the tank stays above it as expansion space.', src: { mass: 'LEZ-28-170 record' } },
  { ...COMMON, pn: 'LEZ-28-180', name: 'Sump quick-drains, flush in the belly (L/R)', kind: 'cots', ata: 28, nha: 'LEZ-28-100', qty: 2, massEach: mEach('LEZ-28-180'), geo: sysGeo('LEZ-28-180'),
    ports: Object.fromEntries([-1, 1].flatMap((sg) => { const q = FL.QD(sg); return [[`IN-${SD(sg)}`, { at: ftOf(q.top), kind: 'fuel', fit: '1/8 NPT × AN816-3D' }], [`OUT-${SD(sg)}`, { at: ftOf(q.face), kind: 'fuel', open: true, fit: 'flush poppet at the skin' }]]; })),
    flow: [['IN-L', 'OUT-L'], ['IN-R', 'OUT-R']], src: { mass: 'LEZ-28-180 record' } },
  { ...COMMON, pn: 'LEZ-28-185', name: 'Sump drain lines (L/R, 3/16 × .028 5052-O)', kind: 'line', ata: 28, nha: 'LEZ-28-100', material: 'aluminium', qty: 2, massEach: mEach('LEZ-28-185'),
    geo: [-1, 1].map((sg) => pathF(FL.drainLine(sg), TUBE.drain.od, TUBE.drain.w, [`LEZ-28-110:DRAIN-${SD(sg)}`, `LEZ-28-180:IN-${SD(sg)}`], ['AN818-3D / AN819-3D', 'AN818-3D / AN819-3D'])),
    steps: [S1('Bend and flare; clamp', ['Falls continuously from the well to the drain (no trap)', 'Drain sample clear at the belly'])], src: { mass: 'GEOMETRY' } },
  { ...COMMON, pn: 'LEZ-28-190', name: 'Fuel sight gauges (L/R)', kind: 'cots', ata: 28, nha: 'LEZ-28-100', qty: 2, massEach: mEach('LEZ-28-190'), geo: sysGeo('LEZ-28-190'),
    blurb: 'A clear fuel-resistant tube on the cabin side of each strake at FS 100, beside and just aft of the pilot\'s shoulder, on two fittings potted through the shell, the wedge and R1 into the inboard bay (floor and ullage). Calibrated in US gallons by filling in 2 gal steps.', src: { mass: 'LEZ-28-190 record' } },
  { ...COMMON, pn: 'LEZ-28-155', name: 'Firewall fuel bulkhead union (steel)', kind: 'cots', ata: 28, nha: 'LEZ-28-100', massEach: mEach('LEZ-28-155'), std: 'AN832-6 bulkhead union (steel) + AN924-6 nut',
    geo: sysGeo('LEZ-28-155'), ports: { FWD: { at: PORT.bhFwd, kind: 'fuel', fit: 'AN832-6 cabin end' }, AFT: { at: PORT.bhAft, kind: 'fuel', fit: 'AN832-6 engine end' } }, flow: [['FWD', 'AFT']],
    mates: [['LEZ-28-155:AFT', 'LEZ-73-100:IN']], src: { mass: 'LEZ-28-155 record' } },
  { ...COMMON, pn: 'LEZ-28-165', name: 'Tank vent fittings (L/R): lower-skin bulkhead union', kind: 'cots', ata: 28, nha: 'LEZ-28-160', qty: 2, massEach: mEach('LEZ-28-165'), std: 'AN832-4D bulkhead union + AN924-4D nut (in the strake\'s lower-skin insert)',
    geo: sysGeo('LEZ-28-165'),
    ports: Object.fromEntries([-1, 1].flatMap((sg) => { const v = FL.vent.pts; return [[`TANK-${SD(sg)}`, { at: ftOf(MXi(v[0], sg)), kind: 'fuel', open: true, fit: 'open pick-up' }], [`OUT-${SD(sg)}`, { at: ftOf(MXi(v.at(-1), sg)), kind: 'fuel', open: true, fit: 'scarfed outlet' }]]; })), src: { mass: 'LEZ-28-165 record' } },
  { ...COMMON, pn: 'LEZ-77-130', name: 'Fuel-flow transducer (cabin, after the boost pump)', kind: 'cots', ata: 77, massEach: 0.25, geo: [{ t: 'box', c: FFT, d: [0.12, 0.10, 0.10] }],
    ports: { IN: { at: PORT.fftIn, kind: 'fuel', fit: 'AN816-6D (1/4 NPT)' }, OUT: { at: PORT.fftOut, kind: 'fuel', fit: 'AN816-6D (1/4 NPT)' } }, flow: [['IN', 'OUT']],
    scd: { spec: 'Turbine fuel-flow transducer, 0.6–70 gph, ~30,000 pulses/gal, 8–16 V, 3-wire (+V, signal, ground); 1/4 NPT; mount with ports horizontal, wires up', envelope: [1.4, 1.2, 1.2] },
    blurb: 'In the cabin between the boost pump and the firewall fitting, wires up, so it sees every gallon the engine burns and stays out of the engine-bay heat.', src: { mass: 'ASSUMED' } },
  { ...COMMON, pn: 'LEZ-77-120', name: 'Firewall sensor manifold (fuel P, oil P, MAP transducers)', kind: 'machined', ata: 77, material: '6061', massEach: 0.45, onMount: false,
    geo: [{ t: 'box', c: [FW + 0.04, 0.52, 2.55], d: [0.04, 0.22, 0.14] }],
    ports: { 'FUEL-P': { at: PORT.maniFuel, kind: 'fuel', fit: 'AN816-3D' }, 'OIL-P': { at: PORT.maniOil, kind: 'oil', fit: 'AN816-3D' }, MAP: { at: PORT.maniMap, kind: 'air', fit: 'AN816-3D' } },
    blurb: 'Machined block on the firewall\'s aft face carrying the three pressure transducers, so they are isolated from engine vibration and fed by small fire-sleeved hoses.',
    steps: [S1('Machine and drill ports to the drawing; mount on the firewall with AN3 bolts', ['Ports 1/8 NPT, deburred', 'Leak check each port at 1.5 × max pressure'])], src: { mass: 'GEOMETRY-based estimate' } },
  { ...COMMON, pn: 'LEZ-77-121', name: 'Sensor lines (-3 hose, fire-sleeved): fuel P, oil P, MAP', kind: 'line', ata: 77, nha: 'LEZ-77-120', massEach: 0.5, material: 'hose -3, AS1072 fire sleeve',
    geo: [{ t: 'path', pts: [PORT.carbPt, [10.975, 0.42, 2.46], PORT.maniFuel], dIn: 0.375, massPerFt: 0, cls: 'fuel', ends: ['LEZ-71-210:CARB-PT', 'LEZ-77-120:FUEL-P'], endFit: ['-3 swivel', '-3 swivel'] },
      { t: 'path', pts: [PORT.oilP, [10.875, 0.45, 2.75], PORT.maniOil], dIn: 0.375, massPerFt: 0, cls: 'oil', ends: ['LEZ-71-210:OIL-P', 'LEZ-77-120:OIL-P'], endFit: ['-3 swivel, restrictor', '-3 swivel'] },
      { t: 'path', pts: [PORT.map, [ENG.accFace + 0.20, -0.20, 2.45], [10.975, 0.30, 2.42], PORT.maniMap], dIn: 0.375, massPerFt: 0, cls: 'air', ends: ['LEZ-71-210:MAP', 'LEZ-77-120:MAP'], endFit: ['-3 swivel', '-3 swivel'] }],
    steps: [S1('Make up hoses to length; fire sleeve; restrictor in the oil-pressure line', ['Leak check at 1.5 × max pressure', 'No hose within 6 in of exhaust'])], src: { mass: 'ASSUMED' } },
]);

// fire-sealed pass-throughs
definePass([
  { id: 'fw-fuel', at: ftOf([FL.UNION.bl, FW * 12, FL.UNION.wl]), r: 0.29 / 12, what: 'Fuel, steel bulkhead union AN832-6 at block A\'s layout hole, fire-sealed', fireproof: true },
  { id: 'fw-cables', at: [FW, -0.45, 2.55], r: 0.10, what: 'Engine-control cables, fire-sealed grommet', fireproof: true },
]);
defineKeepouts([
  { id: 'ko-prop', t: 'cyl', a: [GEO.prop.s - 0.3, 0, GEO.prop.z], b: [GEO.prop.s + 0.3, 0, GEO.prop.z], r: GEO.prop.r + 0.1, why: 'propeller disc', owner: 'LEZ-61-100', applies: (c) => c !== 'exhaust' },
  { id: 'ko-gascolator', t: 'sphere', c: ftOf([FL.gasc.c[0], FL.gasc.c[1], FL.gasc.bowlBot - 0.6]), r: 0.08, why: 'gascolator drain access', owner: 'LEZ-73-100', applies: (c) => c !== 'fuel' },
]);

// ------------------------------------------------------------------------------------------- wing-root TE relief
function insidePrim(g, p, clr) {
  if (g.t === 'box') return [0, 1, 2].every((i) => Math.abs(p[i] - g.c[i]) <= g.d[i] / 2 + clr);
  if (g.t === 'cyl') { const ab = sub(g.b, g.a), t = dot(sub(p, g.a), ab) / dot(ab, ab); return t >= -clr / len(ab) && t <= 1 + clr / len(ab) && len(sub(p, add(g.a, mul(ab, Math.min(1, Math.max(0, t)))))) <= g.r + clr; }
  return false;
}
/** wing-root surface points (upper, camber, lower; aft 30 % of chord, inboard of BL 18) that the engine envelope
 *  plus ½ in clearance would occupy: the relief to trim from each root trailing edge */
export function wingRelief() {
  // the wing root beside the engine is the jut-out (FRAMES.wingRoot), which exists only outside the cowl skin
  const F = FRAMES.wingRoot, hits = [];
  // each engine primitive's bounds grown by its radius and the 0.04 clearance (+1e-9): no point outside them is inside
  // the primitive, so insidePrim runs only on points within (perf; the same hits)
  const ENG_BB = ENGINE_GEO.map((g) => { const e = (g.t === 'box' ? 0 : g.r || 0) + 0.04 + 1e-9;
    if (g.t === 'box') return { lo: g.c.map((v, i) => v - g.d[i] / 2 - e), hi: g.c.map((v, i) => v + g.d[i] / 2 + e) };
    if (g.t === 'cyl') return { lo: g.a.map((v, i) => Math.min(v, g.b[i]) - e), hi: g.a.map((v, i) => Math.max(v, g.b[i]) + e) };
    return { lo: [Infinity, Infinity, Infinity], hi: [-Infinity, -Infinity, -Infinity] }; });
  for (let y = F.span[0]; y <= 2.0; y += 0.02) for (let x = 0.0; x <= 1.0001; x += 0.01) for (const o of ['u', 'c', 'l']) {
    const xx = Math.min(x, 0.999), af = afAt(F, y, xx), off = o === 'u' ? af.yu : o === 'l' ? af.yl : 0, p = F.pt(y, xx, off);
    if (insideFus(p[0], p[1], p[2], -GEO.join.cowlGap)) continue;
    for (const sg of [-1, 1]) { const q = [p[0], sg * p[1], p[2]]; if (ENG_BB.some((B, j) => q[0] >= B.lo[0] && q[0] <= B.hi[0] && q[1] >= B.lo[1] && q[1] <= B.hi[1] && q[2] >= B.lo[2] && q[2] <= B.hi[2] && insidePrim(ENGINE_GEO[j], q, 0.04))) hits.push(q); }
  }
  if (!hits.length) return null;
  const box = (sg) => { const h = hits.filter((q) => Math.sign(q[1]) === sg), lo = [0, 1, 2].map((i) => Math.min(...h.map((q) => q[i]))), hi = [0, 1, 2].map((i) => Math.max(...h.map((q) => q[i])));
    return { t: 'box', c: lo.map((v, i) => (v + hi[i]) / 2), d: lo.map((v, i) => Math.max(hi[i] - v, 0.03) + 0.02), relief: true }; };
  return { boxes: [box(-1), box(1)], n: hits.length };
}
{
  const wr = wingRelief();
  if (wr) {
    const b = wr.boxes[1], dims = `${(b.d[0] * 12).toFixed(1)} in chordwise × ${(b.d[1] * 12).toFixed(1)} in spanwise`;
    defineParts([{ ...COMMON, pn: 'LEZ-57-115', name: 'Wing-root trailing-edge relief and close-out (L/R)', kind: 'laminate', ata: 57, nha: 'LEZ-71-200', qty: 2, massEach: 0.15, geo: wr.boxes,
      blurb: `The rear cylinders sit beside the last inches of each wing-root trailing edge, inside the cowl cheeks. That corner (${dims}, from the engine-fit sweep with ½ in clearance) is trimmed and closed out with 2 BID; the cowl cheeks fair over it.`,
      steps: [S1('Trim the root TE corner to the template; close out with 2 BID; flox the corners', ['≥ 1/2 in to the cylinder head', 'Trim stays inboard of the aileron'])], src: { size: 'Engine-fit sweep (wingRelief)' } }]);
  }
}

// ------------------------------------------------------------------------------------------- mass on the mount
export function mountMass() {
  let m = 0, c = [0, 0, 0];
  for (const p of PARTS.filter((q) => q.onMount)) { const pm = partMass(p); m += pm.m; c = add(c, mul(pm.c, pm.m)); }
  return { m, c: mul(c, 1 / m) };
}
// the firewall hard-point check (fus-engine) now uses the defined mass hung on the mount
{ const mm = mountMass(); GEO.engine.weight = Math.round(mm.m); GEO.engine.s = mm.c[0]; }

// ------------------------------------------------------------------------------------------- engine-mount truss
function solve(A, b) { // Gaussian elimination with partial pivoting (small dense systems)
  const n = b.length, M = A.map((r, i) => [...r, b[i]]);
  for (let k = 0; k < n; k++) {
    let p = k; for (let i = k + 1; i < n; i++) if (Math.abs(M[i][k]) > Math.abs(M[p][k])) p = i;
    [M[k], M[p]] = [M[p], M[k]];
    for (let i = k + 1; i < n; i++) { const f = M[i][k] / M[k][k]; for (let j = k; j <= n; j++) M[i][j] -= f * M[k][j]; }
  }
  const x = Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) { let s = M[i][n]; for (let j = i + 1; j < n; j++) s -= M[i][j] * x[j]; x[i] = s / M[i][i]; }
  return x;
}
const E_STEEL = 29.0e6, FTU_WELD = 80000, FCY = 75000;
/** member axial forces (lb, + tension) for a force F (lb) and moment Mo (in·lb) at the mass centre */
export function mountForces(F, Mo, cgFt) {
  const N = MOUNT.nodes, free = Object.keys(N).filter((k) => k[0] === 'E'), idx = Object.fromEntries(free.map((k, i) => [k, i]));
  const X = (k) => mul(N[k], 12), nd = free.length * 3, K = Array.from({ length: nd }, () => Array(nd).fill(0)), f = Array(nd).fill(0);
  const mem = MOUNT.members.map(([a, b, od, w]) => { const A = Math.PI * ((od / 2) ** 2 - (od / 2 - w) ** 2), d = sub(X(b), X(a)), L = len(d); return { a, b, od, w, A, L, e: mul(d, 1 / L), r: Math.sqrt(((od / 2) ** 2 + (od / 2 - w) ** 2) / 4) * 2 / 2 }; });
  for (const m of mem) {
    const k = E_STEEL * m.A / m.L;
    for (const [p, sp] of [[m.a, -1], [m.b, 1]]) for (const [q, sq] of [[m.a, -1], [m.b, 1]]) {
      if (idx[p] == null || idx[q] == null) continue;
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) K[idx[p] * 3 + i][idx[q] * 3 + j] += sp * sq * k * m.e[i] * m.e[j];
    }
  }
  // rigid engine: force at the cg + moment, shared to the pads as f_i = F/n + Ω × r_i with J Ω = M_total
  const pads = free.map((k) => X(k)), c0 = mul(pads.reduce((a, p) => add(a, p), [0, 0, 0]), 1 / pads.length), cg = mul(cgFt, 12);
  const crs = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const Mt = add(Mo, crs(sub(cg, c0), F)), J = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (const p of pads) { const r = sub(p, c0), r2 = dot(r, r); for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) J[i][j] += (i === j ? r2 : 0) - r[i] * r[j]; }
  const Om = solve(J, Mt);
  pads.forEach((p, i) => { const fi = add(mul(F, 1 / pads.length), crs(Om, sub(p, c0))); for (let k = 0; k < 3; k++) f[i * 3 + k] = fi[k]; });
  const u = solve(K, f), U = (k) => (idx[k] == null ? [0, 0, 0] : u.slice(idx[k] * 3, idx[k] * 3 + 3));
  return mem.map((m) => ({ ...m, P: E_STEEL * m.A / m.L * dot(sub(U(m.b), U(m.a)), m.e) }));
}
function allowable(m, P) {
  if (P >= 0) return { Pa: FTU_WELD * m.A, mode: 'tension at the weld' };
  const ro = m.od / 2, ri = ro - m.w, rho = Math.sqrt((ro * ro + ri * ri) / 4), sl = m.L / rho, slc = Math.sqrt(2 * Math.PI ** 2 * E_STEEL / FCY);
  const scr = sl < slc ? FCY - (FCY ** 2 / (4 * Math.PI ** 2 * E_STEEL)) * sl * sl : Math.PI ** 2 * E_STEEL / (sl * sl);
  return { Pa: Math.min(scr, FTU_WELD) * m.A, mode: sl < slc ? `column (Johnson), L/ρ ${sl.toFixed(0)}` : `column (Euler), L/ρ ${sl.toFixed(0)}`, sl };
}
/** engine-mount load combinations for a load case (FAR 23.361/.363/.371 and emergency landing), limit loads */
export function mountCombos(d, lc) {
  if (!['sym', 'lateral', 'emergency'].includes(lc.type)) return null;
  const mm = mountMass(), W = mm.m, emer = lc.type === 'emergency', FS = emer ? (d.KD ?? 1) : d.FS;
  const Q = 2 * 5252 * ENG.hp / ENG.rpm * 12;                           // 23.361: mean take-off torque × 2 (four cylinders), in·lb
  const Mg = GEO.engine.inertiaIp * (ENG.rpm * 2 * Math.PI / 60) * 1.0 * 12; // 23.371: 1 rad/s pitch, in·lb
  const combos = emer ? [{ F: [-lc.n * W, 0, 0], M: [0, 0, 0], tag: `${lc.n} g forward (ultimate)` }]
    : lc.type === 'lateral' ? [1, -1].map((sg) => ({ F: [0, sg * W * d.n1 / 3, -W], M: [0, 0, 0], tag: `side ${(d.n1 / 3).toFixed(2)} g (23.363) + 1 g` }))
      : [1, -1].flatMap((sq) => [1, -1].map((sm) => ({ F: [-d.thrust, 0, -lc.n * W], M: [sq * Q, 0, sm * Mg], tag: `n ${lc.n.toFixed(2)} + thrust + torque ×2 ${sq > 0 ? '+' : '−'} + gyro ${sm > 0 ? '+' : '−'}` })));
  return { mm, W, emer, FS, Q, Mg, combos };
}
registerChecks('wp1-mount', (d, lc) => {
  const mc = mountCombos(d, lc);
  if (!mc) return [];
  const { mm, W, FS, Q, Mg, combos } = mc;
  let worst = null;
  for (const c of combos) for (const m of mountForces(c.F, c.M, mm.c)) {
    const al = allowable(m, m.P), ms = al.Pa / (FS * Math.abs(m.P) + 1e-9) - 1;
    if (!worst || ms < worst.ms) worst = { ms, m, al, c };
  }
  const { m, al, c } = worst;
  const r = mk('fuselage', 'mount-tube', 'Engine mount: critical tube', lc, `${m.a}–${m.b}, ${m.od} × ${m.w}`, al.mode, worst.ms, {
    formula: 'Space-truss stiffness solve (firewall pick-ups fixed, rigid engine on 4 pads); tension P_a = F_tu,weld·A; compression Johnson/Euler column, pinned ends',
    inputs: [['Mass on the mount', W, 'lb', 'DEFINED PARTS'], ['Mass-centre station', mm.c[0] * 12, 'in', 'DEFINED PARTS'], ['Load combination', c.tag, 'text', 'FAR23'], ['Limit torque (2 × mean, 4 cyl.)', Q, 'inlb', 'FAR23'], ['Gyroscopic moment, 1 rad/s', Mg, 'inlb', 'FAR23'], ['Thrust', d.thrust, 'lb', 'ASSUMED'], ['Tube', `${m.od} × ${m.w} 4130, L ${m.L.toFixed(1)} in`, 'text', 'ASSUMED'], ['F_tu at welds / F_cy', '80 / 75 ksi', 'text', 'ASSUMED']],
    result: [['Member load (limit)', m.P, 'lb'], ['Factor of safety', FS, ''], ['Allowable', al.Pa, 'lb']],
  });
  r.sys = 'LEZ-71-220';
  return [r];
});

// fuel flow, pressure, quantity, venting, drains and separations: block F (wpF1_fuel.js)

// ------------------------------------------------------------------------------------------- cooling (climb, hot day)
export function cooling() {
  const P = ENG.hp, frac = 0.40, dT = 80, Vkt = 90, rho = 0.0705, eta = 0.65, A = partByPN('LEZ-71-240').inlet.area;
  const mdot = frac * P * 42.41 / 60 / (0.24 * dT), Vol = mdot / rho, Veff = eta * Vkt * 1.6878, Areq = Vol / Veff * 144;
  return { P, frac, dT, Vkt, rho, eta, A, mdot, Areq };
}
registerChecks('wp1-cool', (d, lc) => {
  if (lc.id !== 'W1-S1') return [];
  const c = cooling();
  const r = mk('cowl', 'pwr-cool', 'Cooling-air inlet area, climb on a hot day', lc, 'belly NACA inlet', 'energy balance, inlet throat', c.A / c.Areq - 1, {
    formula: 'ṁ = f·P / (c_p ΔT);  A_req = ṁ / (ρ η V_climb);  MS = A_inlet / A_req − 1',
    inputs: [['Take-off power', c.P, 'hp', 'PUBLIC'], ['Heat to cooling air', c.frac, '', 'ASSUMED'], ['Allowed air temperature rise', c.dT, '°F', 'ASSUMED'], ['Climb speed', c.Vkt, 'kt', 'ASSUMED'], ['Air density, 100 °F sea level', c.rho, 'lb/ft³', 'ISA+'], ['Inlet recovery η', c.eta, '', 'ASSUMED'], ['Inlet throat area', c.A, 'in²', 'ASSUMED']],
    result: [['Cooling-air mass flow', c.mdot, 'lb/s'], ['Required inlet area', c.Areq, 'in²']],
  });
  r.sys = 'LEZ-71-240';
  return [r];
});

// ------------------------------------------------------------------------------------------- engine fit
function samples(g) {
  const out = [];
  if (g.t === 'box') { for (const i of [-1, 0, 1]) for (const j of [-1, 0, 1]) for (const k of [-1, 0, 1]) out.push([g.c[0] + i * g.d[0] / 2, g.c[1] + j * g.d[1] / 2, g.c[2] + k * g.d[2] / 2]); }
  if (g.t === 'cyl') {
    const ax = sub(g.b, g.a), L = len(ax), e = mul(ax, 1 / L), u = Math.abs(e[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
    const n1 = (() => { const t = sub(u, mul(e, dot(u, e))); return mul(t, 1 / len(t)); })(), n2 = [e[1] * n1[2] - e[2] * n1[1], e[2] * n1[0] - e[0] * n1[2], e[0] * n1[1] - e[1] * n1[0]];
    for (const t of [0, 0.5, 1]) for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6; out.push(add(add(g.a, mul(ax, t)), add(mul(n1, g.r * Math.cos(a)), mul(n2, g.r * Math.sin(a))))); }
  }
  if (g.t === 'loft') for (const sec of g.secs) out.push(...sec);
  if (g.t === 'path') out.push(...g.pts);
  return out;
}
/** inside the wing grown by a clearance (ft) all round */
function inWing(s, y, z, clr) {
  const F = FRAMES.wing, ay = Math.abs(y), [a, b] = F.span;
  if (ay < Math.min(a, b) || ay > Math.max(a, b)) return false;
  const sec = F.sec(ay), x = (s - sec.le) / sec.c;
  if (x < -clr / sec.c || x > 1 + clr / sec.c) return false;
  const xc = Math.min(Math.max(x, 0.001), 0.999), af = afAt(F, ay, xc), mid = F.pt(ay, xc, 0)[2], o = (z - mid) / sec.c;
  return o < af.yu + clr / sec.c && o > af.yl - clr / sec.c;
}
export function engineFit() {
  const reliefs = PARTS.flatMap((p) => p.geo.filter((g) => g.relief)), inBox = (b, p) => [0, 1, 2].every((i) => Math.abs(p[i] - b.c[i]) <= b.d[i] / 2 + 1e-6);
  const scoopBoxes = partByPN('LEZ-71-250').geo.filter((g) => g.t === 'box'), issues = [];
  const inScoop = (x) => scoopBoxes.some((b) => inBox(b, x));
  let nPts = 0, nRelief = 0;
  for (const p of PARTS.filter((q) => q.fit)) for (const g of p.geo) for (const x of samples(g)) {
    nPts++;
    const inCowl = x[0] > FW + 0.08 && insideFus(x[0], x[1], x[2], 0.04);
    if (!inCowl && !(p.fit === 'scoop' && inScoop(x)) && !(p.fit === 'cowl' && inScoop(x) && x[2] < 2.3)) issues.push(`${p.name}: point FS ${(x[0] * 12).toFixed(0)} BL ${(x[1] * 12).toFixed(0)} WL ${(x[2] * 12).toFixed(0)} outside the cowl (½ in clearance)`);
    if (inWing(x[0], x[1], x[2], 0.0)) { if (reliefs.some((b) => inBox(b, x))) nRelief++; else issues.push(`${p.name}: point FS ${(x[0] * 12).toFixed(0)} BL ${(x[1] * 12).toFixed(0)} inside the wing root`); }
  }
  return { ok: issues.length === 0, nPts, nRelief, issues };
}

// ------------------------------------------------------------------------------------------- schematics
defineGraph('fuel', {
  title: 'Fuel system (ATA 28 / 73)',
  nodes: [
    { id: 'LV', label: 'Vent', sub: 'strake belly', col: 0, row: 0, pn: 'LEZ-28-160' },
    { id: 'LT', label: 'Left strake tank', sub: 'integral, 2 bays', col: 0, row: 1 },
    { id: 'LS', label: 'Sump & strainer', sub: 'drain', col: 1, row: 1, pn: 'LEZ-28-110' },
    { id: 'RT', label: 'Right strake tank', sub: 'integral, 2 bays', col: 0, row: 3 },
    { id: 'RS', label: 'Sump & strainer', sub: 'drain', col: 1, row: 3, pn: 'LEZ-28-110' },
    { id: 'RV', label: 'Vent', sub: 'strake belly', col: 0, row: 4, pn: 'LEZ-28-160' },
    { id: 'V', label: 'Selector valve', sub: 'L / R / OFF', col: 2, row: 2, pn: 'LEZ-28-130' },
    { id: 'BP', label: 'Boost pump', sub: 'electric', col: 3, row: 2, pn: 'LEZ-28-140' },
    { id: 'FW', label: 'Firewall fitting', sub: 'fire-sealed', col: 4, row: 2, pn: 'LEZ-28-150' },
    { id: 'G', label: 'Gascolator', sub: 'drain', col: 5, row: 2, pn: 'LEZ-73-100' },
    { id: 'EP', label: 'Engine pump', sub: 'diaphragm', col: 6, row: 2, pn: 'LEZ-71-210' },
    { id: 'C', label: 'Carburettor', sub: 'updraft', col: 7, row: 2, pn: 'LEZ-71-210' },
  ],
  edges: [{ a: 'LV', b: 'LT', cls: 'air', label: 'vent' }, { a: 'RT', b: 'RV', cls: 'air', label: 'vent' }, { a: 'LT', b: 'LS', cls: 'fuel' }, { a: 'RT', b: 'RS', cls: 'fuel' },
    { a: 'LS', b: 'V', cls: 'fuel', label: '3/8 line' }, { a: 'RS', b: 'V', cls: 'fuel', label: '3/8 line' }, { a: 'V', b: 'BP', cls: 'fuel' }, { a: 'BP', b: 'FW', cls: 'fuel' }, { a: 'FW', b: 'G', cls: 'fuel', label: '-6 hose' }, { a: 'G', b: 'EP', cls: 'fuel' }, { a: 'EP', b: 'C', cls: 'fuel' }],
});
defineGraph('powerplant', {
  title: 'Powerplant: air, induction, exhaust, oil, controls (ATA 61 / 71 / 76 / 78 / 79)',
  nodes: [
    { id: 'N', label: 'NACA inlet', sub: 'belly, 40 in²', col: 0, row: 0, pn: 'LEZ-71-240' },
    { id: 'B', label: 'Baffles & plenum', sub: 'updraft', col: 1, row: 0, pn: 'LEZ-71-230' },
    { id: 'CY', label: 'Cylinders', sub: '4, air-cooled', col: 2, row: 0, pn: 'LEZ-71-210' },
    { id: 'X', label: 'Cowl exit', sub: 'annulus at spinner', col: 3, row: 0 },
    { id: 'OC', label: 'Oil cooler', sub: 'firewall', col: 4, row: 0, pn: 'LEZ-79-110' },
    { id: 'S', label: 'Carb air scoop', sub: 'ram air', col: 0, row: 1, pn: 'LEZ-71-250' },
    { id: 'AB', label: 'Air box & filter', sub: 'carb-heat flapper', col: 1, row: 1, pn: 'LEZ-71-250' },
    { id: 'C', label: 'Carburettor', col: 2, row: 1, pn: 'LEZ-71-210' },
    { id: 'E', label: 'Engine', sub: '118 hp', col: 3, row: 1, pn: 'LEZ-71-210' },
    { id: 'EX', label: 'Exhaust stacks', sub: '4 × 1.5 in', col: 4, row: 1, pn: 'LEZ-78-100' },
    { id: 'Q', label: 'Throttle quadrant', sub: 'left console', col: 0, row: 2, pn: 'LEZ-76-100' },
    { id: 'CB', label: 'Control cables', sub: 'throttle, mixture, heat', col: 1, row: 2, pn: 'LEZ-76-110' },
    { id: 'P', label: 'Propeller', sub: '57 in wood', col: 4, row: 2, pn: 'LEZ-61-100' },
    { id: 'HM', label: 'Carb-heat muff', col: 3, row: 2, pn: 'LEZ-78-110' },
  ],
  edges: [{ a: 'N', b: 'B', cls: 'air' }, { a: 'B', b: 'CY', cls: 'air' }, { a: 'CY', b: 'X', cls: 'air' }, { a: 'S', b: 'AB', cls: 'air' }, { a: 'AB', b: 'C', cls: 'air' }, { a: 'C', b: 'E', cls: 'air', label: 'mixture' },
    { a: 'E', b: 'EX', cls: 'mech', label: 'exhaust' }, { a: 'E', b: 'OC', cls: 'oil', label: 'oil loop' }, { a: 'Q', b: 'CB', cls: 'mech' }, { a: 'CB', b: 'C', cls: 'mech', label: 'throttle / mixture' }, { a: 'E', b: 'P', cls: 'mech', label: 'flange' }, { a: 'EX', b: 'HM', cls: 'air' }, { a: 'HM', b: 'AB', cls: 'air', label: 'carb heat' }],
});

// ------------------------------------------------------------------------------------------- requirements closed by WP1
const exhaustClear = () => clashCheck().filter((c) => /exhaust|firewall/.test(c.detail) || c.kind === 'firewall');
defineReqs([
  { id: 'R-STR-5', checks: /^fus-engine$|^mount-tube$/, closed: true },
  { id: 'R-PWR-1', checks: /^pwr-cool$/, closed: true, verify: () => ({ ok: !!partByPN('LEZ-78-110'), detail: 'carb heat: muff on the left-rear stack, flapper in the air box' }) },
  { id: 'R-PWR-2', closed: true, verify: () => { const c = exhaustClear(); return { ok: !c.length, detail: c.length ? c.map((x) => x.detail).join('; ') : 'exhaust ≥ 6 in from fuel; every firewall crossing fire-sealed' }; } },
  { id: 'R-PWR-3', ref: '23.901 / 23.1193', title: 'Engine installation fits the cowl with clearance and clears the structure', method: 'analysis', wp: 'WP1', closed: true,
    verify: () => { const f = engineFit(); return { ok: f.ok, detail: f.ok ? `${f.nPts} envelope points inside the cowl with ½ in clearance${wingRelief() ? '; wing-root TE trimmed where the rear cylinders pass (LEZ-57-115)' : '; clear of the wing roots'}` : f.issues.slice(0, 3).join('; ') }; } },
  { id: 'R-FUEL-1', checks: /^fuel-(flow|grav|qty)$/, closed: true, verify: () => { const b = outletSweep(TANK_GAL).best; return { ok: b.worst < 4.0, detail: `outlet through R1 at FS ${b.fs.toFixed(1)}, sill WL ${b.sill[2].toFixed(2)}; unusable ≤ ${b.worst.toFixed(2)} gal/tank over −3…+10° pitch on the released cavity (estimate; confirm by test)` }; } },
  { id: 'R-FUEL-2', checks: /^strake-tank$/, closed: true, verify: () => ({ ok: PARTS.some((p) => p.vent && p.qty === 2), detail: 'each tank vented from its high point, scarfed forward' }) },
]);

adoptMass(['engine']);

// ------------------------------------------------------------------------------------------- engine interfaces
/** every electrical and fluid interface on the engine lands on the engine's geometry, and the mount pick-ups sit on its
 *  conical lugs: the wiring (wp7), plumbing (ports) and mount (MOUNT) are checked against the O-235 shape */
export function engineInterfaces() {
  const G = ENGINE_GEO, dist = (p, geo = G) => Math.min(...geo.map((g) => distToPrim(g, p))), rows = [];
  const EXH = (partByPN('LEZ-78-100')?.geo || []).flatMap((g) => (g.t === 'path' ? g.pts.slice(1).map((q, i) => ({ t: 'cyl', a: g.pts[i], b: q, r: (g.dIn || 1.5) / 24 })) : [g]));
  // engine-mounted equipment (the firewall sensor manifold, LEZ-77-120, is plumbed by sensor lines and is not on the engine)
  for (const e of EQUIP_REF()) {
    if (!e.at || !['LEZ-71-210', 'LEZ-74-120', 'LEZ-77-110'].includes(e.pn)) continue;
    const onExh = /EGT/.test(e.name);
    rows.push({ what: `${e.ref} ${e.name}${onExh ? ' (exhaust riser)' : ''}`, kind: 'electrical', d: dist(e.at, onExh ? EXH : G) * 12 });
  }
  for (const [k, q] of Object.entries(partByPN('LEZ-71-210').ports || {})) rows.push({ what: `port ${k}`, kind: q.kind, d: dist(q.at) * 12 });
  for (const L of LUGS(A_, C_)) { const n = MOUNT.nodes[`E${L.k}`]; rows.push({ what: `mount pick-up E${L.k} → lug ${L.k}`, kind: 'mount', d: Math.hypot(...n.map((v, i) => v - L.at[i])) * 12 }); }
  const worst = rows.reduce((a, r) => (r.d > a.d ? r : a), { d: 0 });
  return { rows, worst, tol: 0.6 };
}
let EQUIP_REF = () => [];
export const bindEquip = (f) => { EQUIP_REF = f; };
registerChecks('wp1-iface', (d, lc) => {
  if (lc.id !== 'W1-S1') return [];
  const E = engineInterfaces(), r = mk('fuselage', 'eng-iface', `Engine interfaces land on the ${O235.model}: wiring terminals, sensor bosses, ports and mount lugs`, lc, E.worst.what || 'engine', 'interface position', E.tol / Math.max(E.worst.d, 1e-3) - 1, {
    formula: 'd = distance from each wiring endpoint / port / mount pick-up to the nearest engine primitive (0 on or inside);  MS = 0.6 in / d_max − 1',
    inputs: [['Interfaces checked', E.rows.length, '', 'MODEL'], ['Tolerance', E.tol, 'in', 'ASSUMED']],
    result: E.rows.map((q) => [`${q.what} (${q.kind})`, q.d, 'in']) });
  r.sys = 'LEZ-71-210'; return [r];
});
