// Block F definition records: the fuel system, LEZ-28-100…190 and LEZ-73-100/110. Geometry from parts/wpF0_layout.js
// (through wp1's FL / FPRIMS), checks in parts/wpF1_fuel.js; solids by cad/g_prims.py from the same primitives.
// Inches, frame [BL, FS, WL]. Notional, public data only; vendor sizes, masses, prices and ratings are typed from memory
// and say so (BOUNDs in the checks).
import { GEO, FIXED } from '../structures.js';
import { PASS, partByPN, equipByRef } from '../systems.js';
import { FL, FPRIMS, PORT, MOUNT } from '../parts/wp1_powerplant.js';
import { REACH, reachTo, backFace, backV } from '../parts/wpB4_cabin.js';
const seatBackFS = (wl) => backFace(backV(wl))[0];
import { RHO, VENDOR, QTY, massEachF, groupVolsF, R1, BAYS, cavFloor, cavTop, omlLow, omlTop, hwAt, bellyAt, SHELL_T, TUBE, HOSE6, WELL, VALVE_ENV, PUMP_ENV, GASC_ENV, inOf, pathLen, minRadius } from '../parts/wpF0_layout.js';
import { FD, quantity, takeoffGph, INSTALL_LINES, PUMP_CONN, separations, hoseState, unusableCG, selState, SEL } from '../parts/wpF1_fuel.js';
import { DRIVE } from '../parts/wpF0_layout.js';
import { PRM, prmLen, prmSlack, prmReach, NOZ_R } from '../parts/wpF9_primer.js';
import { FWG } from '../parts/wpA3_firewall.js';
import { RB, RBG } from '../parts/wpA2_rearbhd.js';
import { SBP, SBG } from '../parts/wpA4_seatback.js';
import { crossings, vertPlane, pip } from '../parts/wpA0_flat.js';
import { OIL } from '../parts/wpG4_systems.js';
import { LAYOUT, FW } from '../parts/wpA3_firewall.js';
import { tidy } from './g_prims.js';

const fx = (x, n = 2) => x.toFixed(n), DATE = '2026-11-18';
const rev0 = (change) => [{ rev: 'A', date: DATE, short: 'Initial definition', change }];
const SPRUCE = { vendor: 'Aircraft Spruce (catalogue items; typed from memory)', url: 'https://www.aircraftspruce.com/', costAsOf: DATE, lead: 'Stock' };
const dist = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));
const sepTo = (mine, re) => { const r = separations().filter((x) => x.mine === mine && re.test(x.other)); return r.length ? r.reduce((a, b) => (b.m < a.m ? b : a)) : null; };
const sepOk = (mine, re, need) => () => { const w = sepTo(mine, re); return { ok: !w || w.d >= need - 1e-9, detail: w ? `${w.other}: ${fx(w.d)} in (≥ ${need})` : 'nothing within 6 in' }; };
/** an interface owned by an unfinished block (or a fix in flight): reported on the sheet, never failing (ICD phase 2) */
const openIf = (fn) => () => { const r = fn(); return { ok: true, detail: `${r.met ? 'met' : 'OPEN'}: ${r.detail}` }; };
const sepOpen = (mine, re, need) => openIf(() => { const w = sepTo(mine, re); return { met: !w || w.d >= need - 1e-9, detail: w ? `${w.other}: ${fx(w.d)} in (≥ ${need})` : 'nothing within 6 in' }; });
export const fParams = (pn) => () => ({ frame: 'aircraft', prims: FPRIMS[pn].map(tidy) });
export const fMassOf = (pn) => (m) => (Object.entries(m.volumes || {}).reduce((a, [g, v]) => a + v * (RHO[g] ?? NaN), 0) + (VENDOR[pn] || 0)) / (QTY[pn] || 1);
const MASS = (pn, from) => ({ each: massEachF(pn, FPRIMS[pn]), from });
const noFlat = { cut: 'Bought-in or bent tube: no flat pattern', layup: 'Metal / bought-in part' };
const tubeMat = (od, w) => ({ spec: `5052-O aluminium tube ${od} × ${w} (AMS 4069 / WW-T-700/4), AN818 / AN819 fittings, 37° flares`, alt: '3003-O tube of the same size', form: 'tube, bent and flared', density: RHO.al, allowables: [['5052-O burst (typed from memory)', '≥ 1,500 psi for these sizes', 'BOUND: system pressure ≤ 8 psi']] });
const S = FL.sump, q = () => FIXED.fuelQty;

// ------------------------------------------------------------------------------------------- LEZ-28-100 installation
const IL = INSTALL_LINES();
export const INST_DEF = {
  pn: 'LEZ-28-100', rev: 'A', status: 'released', nha: 'LEZ-000 (aircraft)', qty: 1, install: true, kind: 'install',
  title: 'Fuel system installation',
  revs: rev0(`Initial definition. The system records sized the sump on a sampled tank (31.6 gal) with a well under the strake floor, ran the feed lines aft and back forward under the rear seat cushion, put the union and gascolator on the lower bracket's leg A and the drains over the gear mount, and had the flow pump curve and carb pressure as ASSUMED. As defined: outlets through R1 on the released cavity (${fx(q().V)} gal; unusable ${fx(q().un)} gal per tank at the worst attitude; ${q().placard} gal usable per tank on the placard), the selector and boost pump aft of the rear seat bulkhead, the union at block A's layout hole, the gascolator on an offset bracket, the engine hose looped for the isolator motion, flush drains aft of the gear fairing. Flow, gravity, pressure, quantity, vent, drain, support, separation and hose checks.`),
  effectivity: 'One per aircraft', params: { lines: IL.length },
  datums: [{ id: 'A', what: 'Firewall aft face, FS 153.0' }, { id: 'B', what: 'Centre line' }, { id: 'C', what: 'Static ground plane (WL 0)' }],
  features: [
    { id: 'route', kind: 'route', label: `Each tank: R1 outlet at FS ${fx(S.FSo, 1)} → well → 3/8 line → selector (FS ${fx(FL.VALVE[1], 1)}, BL 0) → boost pump → flow transducer (H) → union (BL 2.40, WL 30.60) → gascolator → engine pump → carburettor`, tol: 'Per the part drawings' },
    { id: 'qty', kind: 'note', label: `Capacity ${fx(q().V)} gal per tank (released cavity), 2 % expansion space under the filler necks, unusable ${fx(q().un)} gal per tank (worst of −3 / 0 / +3 / +10°), usable ${fx(q().usable)} → placard ${q().placard} US gal per tank, ${2 * q().placard} total (${q().totalUsableLb} lb)`, tol: 'Confirm unusable by test (FAR 23.959)' },
    { id: 'wb', kind: 'note', label: `Unusable fuel ${fx(q().unusableLb, 1)} lb is empty weight (FS ${fx(unusableCG()[1], 1)}, level attitude); fuel load in the W&B is the usable fuel only`, tol: '—' },
  ],
  tolerances: { general: 'Per the part drawings' }, drawingNotes: ['Flow test with the flowmeter blocked (23.955(a)); leak check every joint at 1.5 × the boost pump dead-head.', 'Separations: exhaust 6 in, ignition and power 2 in, RF / signal 1 in, mount tubes 0.5 in at the hoses, anything else 0.25 in.'], generalNote: 'Placards at each filler and at the selector.',
  na: { cut: 'Installation', layup: 'Installation' },
  material: { spec: 'Per the part drawings; Avgas 100LL (ASTM D910)', alt: '—', form: 'installation', density: null, allowables: [] },
  process: [{ op: 'Install', spec: 'Fit the parts to the drawings; clamp at the drawing stations; seal the firewall union with fire sealant.' }, { op: 'Test', spec: 'Integral tank pressure test per 23.965(a)(2) at the tank-press test pressure (1.95 psi: 1.10 × 1.73 psi, landing case, 6.08 lb/gal, full to the cap), after the 23.965(c) vibration test (25 h, ≥ 1/32 in total displacement, 2/3 full of water, 2,520 cpm = 0.9 × 2,800 rpm unless a critical frequency governs), with the access covers fitted (CFR 2010 text, govinfo); system leak check; flow test each tank, boost pump only, at the carb inlet ≥ 125 % take-off flow; unusable-fuel test at the worst attitude.' }],
  checks: ['fuel-flow', 'fuel-grav', 'fuel-press', 'fuel-qty', 'tank-press', 'tank-access', 'tank-adj'], rules: [],
  mass: { each: IL.reduce((a, l) => a + l.qty * l.each, 0), from: 'hardware lines (consumables); the unusable fuel is carried in the weight and balance' },
  hardware: IL, hardwareNote: 'Sealants and placards; clamps are in LEZ-20-100; the unusable fuel is empty weight in the W&B (FIXED.unusableFuel).',
  interfaces: [
    { id: 'I1', with: 'Weight and balance (wp5) and the placard (wp8)', feature: 'qty', what: 'Fuel load = usable; placard = usable rounded down', check: () => ({ ok: FIXED.fuelMaxLb === q().totalUsableLb && q().usable >= q().placard, detail: `${q().totalUsableLb} lb usable (2 × ${q().placard} gal), unusable ${fx(q().unusableLb, 1)} lb in empty weight` }) },
    { id: 'I3', with: 'G: LEZ-79-100 oil-qty (fuel for the endurance)', feature: 'qty', what: 'G\'s oil check uses the usable fuel (open item for G)', check: openIf(() => ({ met: OIL.gal <= 2 * q().placard, detail: `oil-qty takes ${OIL.gal} gal; usable is ${2 * q().placard} gal (G to take FIXED.fuelQty)` })) },
    { id: 'I4', with: 'G: LEZ-71-250 carb scoop blister', feature: 'route', what: 'Carb tee and hose 2 inside the scoop envelope declared as the blister (open item for G)', check: openIf(() => ({ met: false, detail: 'the tee and the last 1.6 in of hose 2 lie in the scoop\'s envelope boxes (fuel-sep mates them); G to declare that region the carb blister, outside the induction air path' })) },
    { id: 'I5', with: 'G: LEZ-71-155 lower cowl', feature: 'route', what: 'Ø 0.5 hole for the gascolator drain extension (open item for G)', check: openIf(() => ({ met: false, detail: `drain tip BL ${fx(FL.gasc.drainTip[0])}, FS ${fx(FL.gasc.drainTip[1], 1)}, WL ${fx(FL.gasc.drainTip[2])} at the cowl skin; no hole in LEZ-71-155 yet` })) },
    { id: 'I6', with: 'H: LEZ-77-130 flow transducer', feature: 'route', what: 'No water trap at the transducer, or a drain on it (open item for H)', check: openIf(() => ({ met: FL.fft.out[2] >= FL.UNION.wl, detail: `transducer ${fx(FL.UNION.wl - FL.fft.out[2])} in below the union: H to raise it or add a drain` })) },
    { id: 'I7', with: 'I / J / H raceways (LEZ-20, -23, -24, -25-162, -33, -74, -77, -80)', feature: 'route', what: 'Gauges and wells clear of the raceways by the class rules (open items for I / J / H)', check: openIf(() => { const o = separations().filter((r) => !r.released && r.m < 0 && /LEZ-28-1[19]0/.test(r.mine)); return { met: !o.length, detail: o.length ? o.map((r) => `${r.mine} ↔ ${r.other} (${r.block}) ${fx(r.d)} / ${r.need}`).join('; ') : 'all clear' }; }) },
    { id: 'I2', with: 'LEZ-77-130 flow transducer (H)', feature: 'route', what: 'Lines end on its ports', check: () => { const r = partByPN('LEZ-28-150').geo; return { ok: dist(inOf(r[1].pts.at(-1)), inOf(PORT.fftIn)) < 1e-3 && dist(inOf(r[2].pts[0]), inOf(PORT.fftOut)) < 1e-3, detail: `IN / OUT at FS ${fx(inOf(PORT.fftIn)[1], 1)} / ${fx(inOf(PORT.fftOut)[1], 1)}` }; } },
  ],
  tooling: { needed: false, text: 'Tube bender and 37° flaring tool; hose-assembly tooling.' },
  sourcing: { blank: 'Sealants, placards', ...SPRUCE, cost: 30, perAircraft: 1, note: 'Approximate.' },
};

// ------------------------------------------------------------------------------------------- record factory for the parts
function rec(o) {
  return { status: 'released', rev: 'A', qty: QTY[o.pn] || 1, nha: 'LEZ-28-100', effectivity: (QTY[o.pn] || 1) === 2 ? 'Left and right (mirror images); both drawn' : 'One per aircraft',
    params: fParams(o.pn)(), datums: [{ id: 'A', what: 'Aircraft frame: BL (+ right), FS (aft), WL (up from the static ground plane)' }], tolerances: { general: '±1/16 in on positions; bends to the drawing ±1/8 in' },
    drawingNotes: [], generalNote: 'Fuel-resistant seals; safety-wire or lock every B-nut per AC 43.13.', na: noFlat, rules: [], hardware: [], tooling: { needed: false, text: 'None.' }, ...o };
}

// ------------------------------------------------------------------------------------------- LEZ-28-110 tank outlet and well
export const SUMP_DEF = rec({
  pn: 'LEZ-28-110', kind: 'machined', title: 'Tank outlet, strainer and well (L/R)',
  revs: rev0(`Initial definition. The sump was a well under the strake floor on a sampled tank (FM-1/2) with no passage through R1, the wedge or the shell (FM-4). As defined: a 1/2 × .035 tube potted through R1, the wedge conduit and the shell at FS ${fx(S.FSo, 1)}, its bore invert on the cavity floor (the sill, WL ${fx(S.zs)}), dropping 35° into a glass well hung low on the cabin side of the shell so it passes under C's rudder cable; finger strainer over the tank end; AN816-6D outlet and 1/8 NPT drain low in the well.`),
  features: [
    { id: 'pass', kind: 'tube', label: `Passage 1/2 × .035 5052 from R1's tank face (BL ${fx(R1.out, 3)}, WL ${fx(S.passA[2])}) to the well (BL ${fx(S.passB[0])}, WL ${fx(S.passB[2])}) at FS ${fx(S.FSo, 1)}; bore invert = sill WL ${fx(S.zs)}`, tol: 'Invert flush with the tank floor ±0.03' },
    { id: 'strainer', kind: 'screen', label: 'Finger strainer Ø 0.44 × 1.25 in, 8–16 mesh brass (FAR 23.977, typed), over the passage\'s tank end', tol: 'Vendor' },
    { id: 'well', kind: 'layup', label: `Well ${WELL.w} × ${WELL.L} in, WL ${fx(S.wBot)}–${fx(S.wTop)}, 2 × 6781 (0.06 in) walls bonded to the shell's inner face (BL ${fx(S.wIn)})`, tol: '±1/16 in' },
    { id: 'outlet', kind: 'boss', label: `Outlet boss with AN816-6D at BL ${fx(S.outlet[0])}, WL ${fx(S.outlet[2])}`, tol: '±0.03' },
    { id: 'drain', kind: 'boss', label: `Drain boss 1/8 NPT at the well bottom (BL ${fx(S.drainPt[0])}, FS ${fx(S.drainPt[1], 1)})`, tol: '±0.03' },
  ],
  drawingNotes: ['Right side drawn and shown with the left (mirror).', 'Passage potted in flox through R1 and the shell; through the strake joint wedge in its sealed conduit (LEZ-57-150 rev B).'],
  material: { spec: 'Well: 6781 / MTM45-1 (fuel-resistant); passage 5052-O 1/2 × .035; strainer brass screen; bosses 6061-T6', alt: '—', form: 'layup and machined bosses', density: null, allowables: [['Glass laminate density', `${RHO.glass} lb/in³`, 'typed (mass only)']] },
  process: [{ op: 'Make', spec: 'Lay up the well on a foam mould; machine and bond the bosses.' }, { op: 'Install', spec: 'Pot the passage tube through R1, the wedge conduit and the shell before the strake\'s lower skin is closed; bond the well over it; fit the strainer from the tank side.' }, { op: 'Test', spec: 'Leak check with the tank at 2 psi.' }],
  checks: ['fuel-qty', 'fuel-drain', 'fuel-sep'],
  mass: MASS('LEZ-28-110', 'solid volumes × density (glass, aluminium, brass), per side'),
  hardwareNote: 'AN816-6D nipple and the 1/8 NPT × AN816-3D are bought with the part.',
  interfaces: [
    { id: 'I1', with: 'LEZ-57-180 R1 (rev B passage)', feature: 'pass', what: 'Passage invert on the cavity floor at R1', check: () => { const z = cavFloor(R1.out, S.FSo); return { ok: Math.abs(S.passA[2] - (TUBE.pass.od / 2 - TUBE.pass.w) - z) < 0.01, detail: `invert ${fx(S.passA[2] - (TUBE.pass.od / 2 - TUBE.pass.w), 3)} / floor ${fx(z, 3)}` }; } },
    { id: 'I2', with: 'LEZ-53-150 shell side wall (rev E hole)', feature: 'well', what: 'Well bonded to the inner face, inside the cabin', check: () => { const w = hwAt(S.FSo, (S.wBot + S.wTop) / 2, SHELL_T); return { ok: Math.abs(w - S.wIn) < 0.15, detail: `inner face BL ${fx(w)} / well face ${fx(S.wIn)}` }; } },
    { id: 'I3', with: 'LEZ-27-151 rudder cable (C)', feature: 'pass', what: '≥ 0.25 in', check: sepOk('LEZ-28-110', /LEZ-27-151/, 0.25) },
  ],
  tooling: { needed: true, text: 'Foam well mould; passage drill guide through R1 / wedge / shell.' },
  sourcing: { blank: '1/2 × .035 5052 tube 6 in, finger strainer, 6061 bar for bosses, 6781', ...SPRUCE, cost: 45, perAircraft: 2, note: 'Approximate; typed from memory.' },
});

// ------------------------------------------------------------------------------------------- lines
const lineRec = (pn, title, od, w, feats, extra) => rec({ pn, kind: 'line', title, material: tubeMat(od, w), process: [{ op: 'Bend', spec: 'Bend to the drawing (radius ≥ 3 × OD); 37° flares; AN818 nuts / AN819 sleeves.' }, { op: 'Install', spec: 'Clamp at the drawing stations (MS21919WDG, in LEZ-20-100); torque the B-nuts; leak check.' }],
  mass: MASS(pn, 'solid volumes × 0.098 lb/in³'), hardwareNote: 'AN818 nuts and AN819 sleeves at each end (bought with the tube).', features: feats, ...extra });
const ends = (pn, i) => partByPN(pn).geo.filter((g) => g.t === 'path')[i];
const onPorts = (pn) => () => { const bad = []; for (const g of partByPN(pn).geo.filter((x) => x.t === 'path')) g.ends.forEach((r, k) => { if (!r) return; const [p, id] = r.split(':'), port = partByPN(p)?.ports?.[id]; if (!port || dist(inOf(port.at), inOf(k ? g.pts.at(-1) : g.pts[0])) > 0.01) bad.push(r); }); return { ok: !bad.length, detail: bad.length ? `off: ${bad.join(', ')}` : 'every end on its port' }; };
const falls = (pts) => Math.min(...pts.slice(1).map((p, i) => pts[i][2] - p[2]));
export const FEED_DEF = lineRec('LEZ-28-120', 'Fuel feed lines, tanks to selector (L/R)', TUBE.feed.od, TUBE.feed.w,
  [{ id: 'feedR', kind: 'tube', label: `Right: 3/8 × .035 from the well outlet to the selector IN-R, ${fx(pathLen(FL.feed(1)), 1)} in, falling all the way`, tol: '±1/8 in' }, { id: 'feedL', kind: 'tube', label: 'Left: mirror image', tol: '±1/8 in' }],
  { revs: rev0('Initial definition. The lines ran aft to FS 140 and back forward under the rear seat cushion through LEZ-53-175 (FM-15, F120-8). As defined: short runs aft of the rear seat bulkhead from the well outlets to the selector, falling continuously; nothing crosses FS 130.2.'),
    checks: ['fuel-flow', 'fuel-support', 'fuel-sep'], rules: [{ id: 'fall', label: 'Line falls from the well to the selector (smallest drop between points, in)', v: falls(FL.feed(1)), min: 0 }],
    interfaces: [{ id: 'I1', with: 'LEZ-28-110 / LEZ-28-130 ports', feature: 'feedR', what: 'Ends on the ports', check: onPorts('LEZ-28-120') },
      { id: 'I2', with: 'LEZ-53-175 rear seat bulkhead (A)', feature: 'feedR', what: 'No crossing of FS 130.2 (no hole needed)', check: () => ({ ok: FL.feed(1).every((p) => p[1] > 104.91 + 0.3), detail: `forward-most FS ${fx(Math.min(...FL.feed(1).map((p) => p[1])), 1)}` }) },
      { id: 'I3', with: 'B rear seat and floor, D gear mount, H cables', feature: 'feedR', what: '≥ 0.25 in', check: sepOk('LEZ-28-120', /LEZ-25|LEZ-32|LEZ-76/, 0.25) }],
    sourcing: { blank: '3/8 × .035 5052-O tube 3 ft, 4 × AN818-6D / AN819-6D', ...SPRUCE, cost: 30, perAircraft: 1, note: 'Approximate.' } });
export const L150_DEF = lineRec('LEZ-28-150', 'Fuel line, selector to firewall', TUBE.feed.od, TUBE.feed.w,
  [{ id: 'run1', kind: 'tube', label: `Selector OUT → boost pump IN, ${fx(pathLen(FL.vToPump), 1)} in`, tol: '±1/8 in' }, { id: 'run2', kind: 'tube', label: `Pump OUT → flow transducer IN (H), ${fx(pathLen(FL.pToFft), 1)} in`, tol: '±1/8 in' }, { id: 'run3', kind: 'tube', label: `Transducer OUT → firewall union (BL 2.40, WL 30.60), ${fx(pathLen(FL.fftToFw), 1)} in`, tol: '±1/8 in' }],
  { revs: rev0('Initial definition. The line crossed LEZ-53-175 low in the cabin and ended at a union inside the lower bracket\'s leg A (FM-8). As defined: aft of the rear seat bulkhead, under the CS spar, to the union at block A\'s layout hole.'),
    checks: ['fuel-flow', 'fuel-support', 'fuel-sep'], rules: [],
    interfaces: [{ id: 'I1', with: 'LEZ-28-130, LEZ-28-140, LEZ-77-130 (H), LEZ-28-155 ports', feature: 'run1', what: 'Ends on the ports', check: onPorts('LEZ-28-150') },
      { id: 'I2', with: 'LEZ-57-140 CS spar (A)', feature: 'run3', what: 'Under the spar\'s lower face by ≥ 0.25 in', check: () => { const zs = 35.17, top = Math.max(...[...FL.pToFft, ...FL.fftToFw].map((p) => p[2])) + TUBE.feed.od / 2; return { ok: top <= zs - 0.25, detail: `top WL ${fx(top)} (spar lower face ${zs})` }; } },
      { id: 'I3', with: 'LEZ-71-223 leg A (G)', feature: 'run3', what: '≥ 0.25 in', check: sepOk('LEZ-28-150', /LEZ-71-223/, 0.25) }],
    drawingNotes: ['The flow transducer (block H) sits below the union: its own drain / water check is H\'s item.'],
    sourcing: { blank: '3/8 × .035 5052-O tube 3 ft, 6 × AN818-6D / AN819-6D', ...SPRUCE, cost: 30, perAircraft: 1, note: 'Approximate.' } });
export const VENT_DEF = lineRec('LEZ-28-160', 'Tank vents (L/R)', TUBE.vent.od, TUBE.vent.w,
  [{ id: 'ventR', kind: 'tube', label: `Pick-up 0.35 in under the inboard bay's top at BL ${fx(FL.vent.pick[0], 1)}, FS ${fx(FL.vent.pick[1], 1)}, WL ${fx(FL.vent.pick[2])}; down through the bay to the lower-skin union at FS ${fx(FL.vent.fsOut, 1)}; out 0.5 in below the skin, scarfed 45° forward`, tol: '±1/8 in' }, { id: 'ventL', kind: 'tube', label: 'Left: mirror image', tol: '±1/8 in' }],
  { revs: rev0('Initial definition. The pick-up was mid-cavity in the outboard bay, 1.6 in under that bay\'s high point, with the union on no wall (FM-6). As defined: the pick-up at the tank\'s high region (inboard bay top), chosen for the most ullage at 98 % full in level and cruise attitudes; union in a solid insert in the lower skin (LEZ-57-180 rev B); the outer bays vent through air holes at the tops of R2 / R3.'),
    checks: ['fuel-vent', 'fuel-support'], rules: [{ id: 'fall', label: 'Vent falls from the pick-up to the outlet (smallest drop, in)', v: falls(FL.vent.pts), min: 0 }],
    drawingNotes: ['At −3° and +10° with a full tank the pick-up is in fuel: the vent may pass fuel overboard until the level drops (see fuel-vent).'],
    interfaces: [{ id: 'I1', with: 'LEZ-57-180 cavity', feature: 'ventR', what: 'Pick-up 0.35 in under the inner skin', check: () => { const t = cavTop(FL.vent.pick[0], FL.vent.pick[1]); return { ok: Math.abs(t - FL.vent.pick[2] - 0.35) < 0.01, detail: `cavity top ${fx(t)}` }; } },
      { id: 'I2', with: 'LEZ-28-165 lower-skin union', feature: 'ventR', what: 'Crosses the skin at the union', check: () => ({ ok: FL.vent.pts[3][1] === FL.vent.fsOut && FL.vent.pts[3][2] < FL.vent.zSkin, detail: `FS ${fx(FL.vent.fsOut, 1)}, skin WL ${fx(FL.vent.zSkin)}` }) }],
    sourcing: { blank: '1/4 × .035 5052-O tube 2 ft', ...SPRUCE, cost: 12, perAircraft: 1, note: 'Approximate.' } });
export const DRL_DEF = lineRec('LEZ-28-185', 'Sump drain lines (L/R)', TUBE.drain.od, TUBE.drain.w,
  [{ id: 'drainR', kind: 'tube', label: `3/16 × .028 from the well's drain boss inboard above H's engine-control cables, then down to the flush drain at FS ${fx(FL.QD(1).face[1], 1)}, BL ±${fx(FL.QD(1).face[0], 1)}`, tol: '±1/8 in' }, { id: 'drainL', kind: 'tube', label: 'Left: mirror image', tol: '±1/8 in' }],
  { revs: rev0('Initial definition. The drain ended 0.85 in above the belly over the gear mount (FM-12) and passed 0.5 in from the engine-control cables. As defined: from the well bottom over the cables to a flush drain aft of the gear fairing.'),
    checks: ['fuel-drain', 'fuel-support', 'fuel-sep'], rules: [{ id: 'fall', label: 'Falls from the well to the drain (smallest drop, in)', v: falls(FL.drainLine(1)), min: 0 }],
    interfaces: [{ id: 'I1', with: 'LEZ-28-110 / LEZ-28-180 ports', feature: 'drainR', what: 'Ends on the ports', check: onPorts('LEZ-28-185') }, { id: 'I2', with: 'LEZ-76-110 cables (H), LEZ-32-312 brake lines (D)', feature: 'drainR', what: '≥ 0.25 in', check: sepOk('LEZ-28-185', /LEZ-76-110|LEZ-32-312/, 0.25) }],
    sourcing: { blank: '3/16 × .028 5052-O tube 2 ft, 4 × AN818-3D / AN819-3D', ...SPRUCE, cost: 12, perAircraft: 1, note: 'Approximate.' } });

// ------------------------------------------------------------------------------------------- bought-in parts
const cots = (o) => rec({ kind: 'cots', na: { cut: 'Bought-in', layup: 'Bought-in' }, tolerances: { general: 'Vendor part; position ±1/16 in' }, ...o });
export const VALVE_DEF = cots({ pn: 'LEZ-28-130', rev: 'B', title: 'Fuel selector valve and bracket',
  revs: [...rev0(`Initial definition. The valve sat 0.42 in from the rear cushion under the rear occupant (FM-15) with pilot reach ASSUMED. As defined: on the centre line aft of the rear seat bulkhead (FS ${fx(FL.VALVE[1], 1)}, WL ${fx(FL.VALVE[2])}) below the tank outlets, on a 0.09 in 6061 bracket to the belly. The handle is not within the pilot's reach here: a remote drive to the cockpit is an open item (block B).`),
    { rev: 'B', date: DATE, short: 'Remote drive (FAR 23.995)', change: 'Interface review: the handle at FS 136.6 on the centre line could not be reached by the pilot. The handle is removed; the valve stem carries the right-angle drive of the remote drive LEZ-28-135, whose knob sits beside the pilot\'s left hip. Valve position, ports and bracket unchanged.' }],
  features: [{ id: 'body', kind: 'envelope', label: `Valve ${VALVE_ENV.bl} × ${VALVE_ENV.fs} × ${VALVE_ENV.wl} in (SCD, typed): IN-L / IN-R at BL ±${fx(VALVE_ENV.bl / 2, 2)}, OUT aft`, tol: 'Vendor envelope' }, { id: 'handle', kind: 'envelope', label: 'Stem up, coupled to LEZ-28-135\'s right-angle drive (handle removed); lift-to-turn OFF guard at the valve detent', tol: 'Vendor' }, { id: 'bracket', kind: 'sheet', label: '0.09 in 6061-T6 bracket: plate under the valve, two legs to the belly (flox-bonded feet)', tol: '±0.03' }],
  material: { spec: 'Bought-in valve (SCD); bracket 6061-T6 0.09', alt: 'Any valve meeting the SCD', form: 'bought; sheet bracket', density: null, allowables: [['Valve mass', `${VENDOR['LEZ-28-130']} lb`, 'typed from memory']] },
  process: [{ op: 'Install', spec: 'Bond the bracket feet to the belly (flox, 2 × 6781 tapes); bolt the valve (4 × AN3); check detents and OFF guard.' }],
  checks: ['fuel-flow', 'fuel-sep'], mass: MASS('LEZ-28-130', `vendor ${VENDOR['LEZ-28-130']} lb (typed) + bracket solid × 0.098`),
  hardware: [{ std: 'AN3-5A', qty: 4, desc: 'valve to bracket', each: 0.012 }], hardwareNote: '4 × AN3-5A with MS21042L3 nuts.',
  interfaces: [{ id: 'I1', with: 'LEZ-53-175 rear seat bulkhead (A)', feature: 'body', what: 'Aft of its aft face by ≥ 0.5 in', check: () => { const f = FL.VALVE[1] - VALVE_ENV.fs / 2; return { ok: f >= 104.91 + 0.5, detail: `valve forward face FS ${fx(f, 1)}` }; } },
    { id: 'I2', with: 'LEZ-32-120 gear mount (D), B seats', feature: 'body', what: '≥ 0.25 in', check: sepOk('LEZ-28-130', /LEZ-32|LEZ-25/, 0.25) },
    { id: 'I3', with: 'LEZ-28-135 remote drive', feature: 'handle', what: 'Right-angle drive seated on the stem, on its axis', check: () => { const D = FL.drive, b = D.RA1[2] - DRIVE.ra / 2; return { ok: Math.abs(b - D.stemTop) < 1e-3 && Math.hypot(D.RA1[0] - FL.VALVE[0], D.RA1[1] - FL.VALVE[1]) < 1e-3, detail: `drive base WL ${fx(b)}, valve top WL ${fx(D.stemTop)}` }; } }],
  sourcing: { blank: 'Andair FS20X2F fuel selector, LEFT / RIGHT / OFF, 90° between, female ports (05-29505)', ...SPRUCE, cost: 716, perAircraft: 1, note: 'Andair FS20X2F $716 (Aircraft Spruce, accessed 2026-11-19); McFarlane $663.48. The lever top button must be raised to select OFF.' } });
const DV = FL.drive;
/** where the drive crosses a plane: in-plane u, v (in) of the system record's paths */
const driveCross = (P) => crossings(P).filter((c) => c.pn === 'LEZ-28-135');
export const DRIVE_DEF = rec({ pn: 'LEZ-28-135', nha: 'LEZ-28-130', kind: 'mechanism', title: 'Fuel selector remote drive',
  revs: rev0(`Initial definition (ICD phase 2, FAR 23.995 typed from memory): the selector at FS ${fx(FL.VALVE[1], 1)} on the centre line is out of the pilot's reach. Right-angle drive on the valve stem, ${fx(DV.cross[0][0] - DV.cross[1][0], 1)} in cross tube outboard, second right-angle drive, ${fx(DV.side[0][1] - DV.side[1][1], 1)} in torque tube forward along the left side above H's engine-control cables, through LEZ-53-175 and the front seat back's left leg opening, universal joint at FS ${fx(DV.J1[1], 1)} (${fx(DV.ujAngle, 1)}°), shaft up to a Ø ${DRIVE.knob.d} knob at FS ${fx(DV.H[1], 1)}, BL ${fx(DV.H[0], 1)}, WL ${fx(DV.H[2], 1)} beside the pilot's left hip under the aft end of the left armrest.`),
  features: [
    { id: 'ra', kind: 'envelope', label: `Right-angle drives ${DRIVE.ra} in cubes (SCD, typed): on the valve stem (WL ${fx(DV.stemTop)}) and at BL ${fx(DV.RA2[0], 1)}, FS ${fx(DV.RA2[1], 1)}, WL ${fx(DV.RA2[2], 1)}`, tol: 'Vendor envelope' },
    { id: 'tube', kind: 'tube', label: `6061-T6 ${DRIVE.tube.od} × ${DRIVE.tube.w} tube: cross ${fx(DV.cross[0][0] - DV.cross[1][0], 1)} in at WL ${fx(DRIVE.z, 1)}; side ${fx(Math.hypot(...DV.side[0].map((v, i) => v - DV.side[1][i])), 1)} in, FS ${fx(DV.side[0][1], 1)} → ${fx(DV.side[1][1], 1)}, BL ${fx(DRIVE.y, 1)}, WL ${fx(DV.side[0][2], 1)} → ${fx(DV.side[1][2], 1)}`, tol: '±1/16 in on positions' },
    { id: 'uj', kind: 'envelope', label: `Universal joint at FS ${fx(DV.J1[1], 1)}, BL ${fx(DV.J1[0], 1)}, WL ${fx(DV.J1[2], 1)}; working angle ${fx(DV.ujAngle, 1)}°`, tol: 'Vendor' },
    { id: 'knob', kind: 'envelope', label: `Knob Ø ${DRIVE.knob.d} at FS ${fx(DV.H[1], 1)}, BL ${fx(DV.H[0], 1)}, WL ${fx(DV.H[2], 1)}, pointer and L / R / OFF placard`, tol: 'Vendor' },
    { id: 'bearing', kind: 'block', label: `Nylon bearings at FS ${DV.brgs.map((b) => fx(b.c[1], 1)).join(', ')} on 0.09 in 6061 wall brackets (under C's rudder cable at the side bearings, over it at the knob)`, tol: '±1/16 in' },
  ],
  drawingNotes: ['Pin every joint with AN3 bolts through tube and socket; safety the knob set screw.', 'The tube passes the front seat back through its left leg opening (no hole) and LEZ-53-175 through a grommet hole.'],
  material: { spec: 'Tube 6061-T6 1/2 × .049 (AMS 4083); bearings nylon (UHMW); brackets 6061-T6 0.09; drives, joint and knob bought-in (SCD)', alt: '4130 1/2 × .035 tube', form: 'tube, block, sheet; bought', density: RHO.al,
    allowables: [['6061-T6 shear ultimate', `${SEL.Fsu} psi`, 'BOUND (fuel-sel), typed'], ['Drive / joint rating', `${SEL.rating} in·lb ultimate`, 'BOUND (fuel-sel), typed'], ['Vendor masses', `${fx(VENDOR['LEZ-28-135'], 2)} lb (2 drives, joint, knob)`, 'typed from memory']] },
  process: [{ op: 'Make', spec: 'Cut and drill the tubes; bend and drill the brackets.' }, { op: 'Install', spec: 'Bond the brackets to the side wall (flox, 2 × 6781 tapes); fit drives, tubes, joint and knob; pin with AN3; set the knob pointer on the valve detents.' }, { op: 'Test', spec: 'Each detent felt at the knob; pointer within 5° of the valve; OFF needs the lift-to-turn.' }],
  checks: ['fuel-sel', 'fuel-sep'],
  rules: [{ id: 'uj', label: `Universal joint working angle ≤ ${DRIVE.ujMax}° (ratio)`, v: DRIVE.ujMax / DV.ujAngle, min: 1 },
    { id: 'reach', label: `Knob within the pilot's left-hand reach from the shoulder (block B's occupant OCC; ${REACH.p5f} in 5th-percentile female, typed BOUND) (ratio)`, v: REACH.p5f / reachTo(DV.H).d, min: 1 }, { id: 'seat', label: 'Knob forward of the front seat back\'s forward face at its WL (in)', v: seatBackFS(DV.H[2]) - DV.H[1] - DRIVE.knob.d / 2, min: 1 }],
  mass: MASS('LEZ-28-135', `solid volumes × density + vendor ${fx(VENDOR['LEZ-28-135'], 2)} lb (typed)`),
  hardware: [{ std: 'AN3-6A', qty: 6, desc: 'joint pins through tube and sockets', each: 0.013 }, { std: 'MS21042L3', qty: 6, desc: 'nuts', each: 0.003 }],
  hardwareNote: '6 × AN3-6A pins with MS21042L3 nuts; knob set screw safetied.',
  interfaces: [
    { id: 'I1', with: 'LEZ-28-130 valve stem', feature: 'ra', what: 'Right-angle drive on the stem', check: () => ({ ok: Math.abs(DV.RA1[2] - DRIVE.ra / 2 - DV.stemTop) < 1e-3, detail: `base WL ${fx(DV.RA1[2] - DRIVE.ra / 2)} on the stem at WL ${fx(DV.stemTop)}` }) },
    { id: 'I2', with: 'LEZ-53-175 rear seat bulkhead (A)', feature: 'tube', what: 'Its crossing of FS 130.2 has a grommet hole in the bulkhead', check: () => { const c = driveCross(vertPlane(RB.s)), miss = c.filter((x) => !RBG.pass.some((h) => Math.hypot(h.u - x.u, h.v - x.v) + x.r <= h.r + 1e-3)); return { ok: c.length > 0 && !miss.length, detail: c.map((x) => `BL ${fx(x.u)}, WL ${fx(x.v)} r ${fx(x.r, 3)}${miss.includes(x) ? ' (no hole)' : ''}`).join('; ') || 'no crossing' }; } },
    { id: 'I3', with: 'LEZ-53-170 front seat back (A)', feature: 'tube', what: 'Crosses through the left leg opening (no hole needed)', check: () => { const c = driveCross(SBP); return { ok: c.length > 0 && c.every((x) => !pip([x.u, x.v], SBG.pts)), detail: c.map((x) => `u ${fx(x.u)}, v ${fx(x.v)}`).join('; ') }; } },
    { id: 'I4', with: 'B cockpit: cushions, floor, consoles, armrests, canopy latch', feature: 'knob', what: '≥ 0.25 in', check: sepOk('LEZ-28-135', /LEZ-25|LEZ-52|LEZ-56/, 0.25) },
    { id: 'I5', with: 'C controls: rudder cable LEZ-27-151, roll tube and bellcrank', feature: 'bearing', what: '≥ 0.25 in', check: sepOk('LEZ-28-135', /LEZ-27/, 0.25) },
    { id: 'I6', with: 'B: the pilot\'s reach envelope', feature: 'knob', what: 'Knob within the seated pilot\'s left-hand reach (open item for B)', check: openIf(() => ({ met: false, detail: `knob FS ${fx(DV.H[1], 1)}, BL ${fx(DV.H[0], 1)}, WL ${fx(DV.H[2], 1)}: ${fx(Math.hypot(DV.H[0] + 9.84, DV.H[1] - 71.0, DV.H[2] - 37.44), 1)} in from the throttle; B to confirm with its occupant model and add the placard in the console trim` })) },
    { id: 'I7', with: 'H / I / J lines (engine controls, raceways)', feature: 'tube', what: '≥ 0.25 in (open items for H / I / J)', check: sepOpen('LEZ-28-135', /LEZ-(76|77|74|20|23|24|33|80|25-16)/, 0.25) },
  ],
  tooling: { needed: false, text: 'Drill jig for the pin holes.' },
  sourcing: { blank: '1/2 × .049 6061-T6 tube 6 ft; 2 right-angle drives; 1 universal joint 1/2 in; knob; UHMW block; 0.09 6061 sheet', ...SPRUCE, cost: 260, perAircraft: 1, note: 'Vendor classes and prices typed from memory.' } });
export const PUMP_DEF = cots({ pn: 'LEZ-28-140', title: 'Electric boost pump',
  revs: rev0('Initial definition. The SCD said 1/8 NPT ports against AN816-6D fittings (FM-18) and the pump curve was ASSUMED. As defined: 1/4 NPT ports (AN816-6D), the pump curve a BOUND in fuel-flow, on stainless clamps and a 6061 bracket to the belly; I\'s connector M1 and the harness end moved onto it (F140-1).'),
  features: [{ id: 'body', kind: 'envelope', label: `Ø ${PUMP_ENV.d} × ${PUMP_ENV.L} in along FS (Facet: < 3 in any direction) at BL ${fx(FL.PUMP.a[0], 2)}, WL ${fx(FL.PUMP.a[2], 2)}; IN forward, OUT aft; connector on top`, tol: 'Vendor envelope' }, { id: 'bracket', kind: 'sheet', label: 'Two 0.03 in stainless clamp bands on a 0.09 in 6061 plate with two legs to the belly', tol: '±0.03' }],
  material: { spec: 'Facet 40106 solid-state pump (SCD; maker: not intended for aircraft use, accepted by Miles 2026-11-19), 1/8-27 NPT ports with AN816-6-2D adapters; clamps 321 SS; bracket 6061-T6', alt: '—', form: 'bought; sheet', density: null, allowables: [['Pump mass', `${VENDOR['LEZ-28-140']} lb`, 'typed from memory'], ['Pump curve', `${FD.pump.p0} psi / ${FD.pump.Qmax} gph`, 'BOUND (fuel-flow)']] },
  process: [{ op: 'Install', spec: 'Bond the bracket; clamp the pump; connect M1 (2-pin Deutsch DT).' }],
  checks: ['fuel-flow', 'fuel-press', 'fuel-sep'], mass: MASS('LEZ-28-140', `vendor ${VENDOR['LEZ-28-140']} lb (typed) + clamps and bracket solid`),
  hardware: [{ std: 'AN3-4A', qty: 4, desc: 'clamp bands to plate', each: 0.011 }], hardwareNote: '4 × AN3-4A with MS21042L3 nuts.',
  interfaces: [{ id: 'I1', with: 'I: EQUIP M1 connector and LEZ-24-160 harness end', feature: 'body', what: 'M1 at the pump connector', check: () => { const m = equipByRef('M1'); return { ok: !!m && dist(inOf(m.at), PUMP_CONN) < 0.01, detail: `M1 at BL ${fx(PUMP_CONN[0])}, FS ${fx(PUMP_CONN[1], 1)}, WL ${fx(PUMP_CONN[2])}` }; } },
    { id: 'I2', with: 'LEZ-57-140 CS spar (A)', feature: 'body', what: 'Forward of the spar face (FS 148.56)', check: () => ({ ok: FL.PUMP.b[1] <= 123.06 - 0.5, detail: `aft end FS ${fx(FL.PUMP.b[1], 1)}` }) }],
  sourcing: { blank: 'Facet 40106 solid-state pump, 4.0–7.0 psi, 32 gph, 1/8-27 NPT internal ports with AN816-6-2D adapters', ...SPRUCE, cost: 82.75, perAircraft: 1, note: 'Facet 40105 price $82.75 (Aircraft Spruce, accessed 2026-11-19); the 40106 price was not obtained (same family). Miles accepted the Facet pump (2026-11-19); the maker states its pumps are not for aircraft use.' } });
const U = FL.UNION, stack = FW.tp + FW.steel, GRIP = 0.375;
export const UNION_DEF = cots({ pn: 'LEZ-28-155', title: 'Firewall fuel bulkhead union (steel)', std: 'AN832-6 bulkhead union (steel) + AN924-6 nut',
  revs: rev0('Initial definition. The union was at BL 3.96, WL 28.80, 0.25 in inside the lower bracket\'s leg A (FM-8), over the ceramic paper and foam (FM-9). As defined: at block A\'s layout hole BL 2.40, WL 30.60 (Ø 0.58), clamping the panel and the CRES patch over a flox insert (A adds the window and insert); fire sealant round it.'),
  features: [{ id: 'union', kind: 'fitting', label: `AN832-6 steel through the firewall at BL ${U.bl}, WL ${U.wl}; AN924-6 nut on the aft face`, tol: 'Hole per LEZ-53-180 layout' }, { id: 'nut', kind: 'fitting', label: 'AN924-6 jam nut, fire sealant under it', tol: '—' }],
  material: { spec: 'AN832-6 / AN924-6 carbon steel, cadmium-plated (fire-resistant)', alt: 'Stainless AN832-6', form: 'bought', density: RHO.steel, allowables: [['AN832-6 grip (bulkhead thread length)', `${GRIP} in`, `BOUND: typed from memory; the stack needs ${fx(stack, 4)} in`]] },
  process: [{ op: 'Install', spec: 'Through the layout hole; nut on the aft face over the CRES patch; fire sealant; torque per AC 43.13.' }],
  checks: ['fuel-flow'], rules: [{ id: 'grip', label: `AN832-6 grip / stack (panel ${fx(FW.tp, 4)} + CRES patch ${FW.steel})`, v: GRIP / stack, min: 1 }],
  mass: MASS('LEZ-28-155', 'solid volumes × 0.284 lb/in³'), hardwareNote: 'AN924-6 nut with the union.',
  interfaces: [{ id: 'I1', with: 'LEZ-53-180 firewall layout (A)', feature: 'union', what: 'Axis on the layout hole', check: () => { const L = LAYOUT.find((x) => x.id === 'fuel'); return { ok: Math.hypot(L.pts[0][0] - U.bl, L.pts[0][1] - U.wl) < 0.01 && Math.abs(L.r - 0.29) < 0.01, detail: `layout BL ${L.pts[0][0]}, WL ${L.pts[0][1]}, Ø ${fx(2 * L.r)}` }; } },
    { id: 'I2', with: 'PASS fw-fuel', feature: 'union', what: 'Fire-sealed pass-through at the union', check: () => { const p = PASS.find((x) => x.id === 'fw-fuel'), c = inOf(p.at); return { ok: Math.hypot(c[0] - U.bl, c[2] - U.wl) < 0.01 && Math.abs(p.r * 12 - LAYOUT.find((x) => x.id === 'fuel').r) < 1e-3, detail: `BL ${fx(c[0])}, WL ${fx(c[2])}, r ${fx(p.r * 12)}` }; } },
    { id: 'I4', with: 'LEZ-53-180 fire layer at the union (A)', feature: 'union', what: 'CRES patch window and flox insert at the hole (no paper or foam under the nut); grip ≥ the stack', check: () => { const inR = (R) => U.bl > R[0] && U.bl < R[1] && U.wl > R[2] && U.wl < R[3], win = FWG.fitWin, ins = (FWG.ins || []).some(inR);
      if (!win) return { ok: true, detail: `OPEN (A): LEZ-53-180 has no fitting window yet; the nut would clamp ${fx(FW.tp + FW.paper + FW.steel, 4)} in over paper and foam; with A's window ${fx(stack, 4)} in vs grip ${GRIP} in` };
      const w = win.some(inR), st = FW.tp + (w ? FW.steel : FW.paper + FW.steel); return { ok: w && ins && st <= GRIP, detail: `window ${w ? 'yes' : 'NO'}, insert ${ins ? 'yes' : 'NO'}; stack ${fx(st, 4)} in vs grip ${GRIP} in` }; } },
    { id: 'I3', with: 'LEZ-73-100 gascolator inlet', feature: 'union', what: 'AN822-6D elbow joins the union to the inlet (≤ 0.375 in)', check: () => { const g = dist(U.aft, FL.gasc.in); return { ok: g <= 0.375, detail: `${fx(g)} in` }; } }],
  sourcing: { blank: 'AN832-6 steel + AN924-6', ...SPRUCE, cost: 14, perAircraft: 1, note: 'Approximate.' } });
export const VFIT_DEF = cots({ pn: 'LEZ-28-165', nha: 'LEZ-28-160', title: 'Tank vent skin fittings (L/R)', std: 'AN832-4D bulkhead union + AN924-4D nut',
  revs: rev0('Initial definition. The union was drawn mid-cavity on no wall (FM-6). As defined: through the strake\'s lower skin in a solid insert (LEZ-57-180 rev B), nut inside the tank, the vent tube\'s scarfed outlet below.'),
  features: [{ id: 'union', kind: 'fitting', label: `AN832-4D through the lower skin at BL ±${fx(FL.vent.pick[0], 1)}, FS ${fx(FL.vent.fsOut, 1)} (skin WL ${fx(FL.vent.zSkin)}–${fx(FL.vent.zIn)})`, tol: '±1/16 in' }, { id: 'nut', kind: 'fitting', label: 'AN924-4D nut inside the tank, sealed', tol: '—' }],
  material: { spec: 'AN832-4D / AN924-4D aluminium', alt: '—', form: 'bought', density: RHO.al, allowables: [] },
  process: [{ op: 'Install', spec: 'In the lower-skin insert before the skin is closed; fuel-resistant sealant.' }], checks: ['fuel-vent'],
  mass: MASS('LEZ-28-165', 'solid volumes × 0.098, per side'), hardwareNote: 'Nut with the union.',
  interfaces: [{ id: 'I1', with: 'LEZ-57-180 lower skin insert (rev B)', feature: 'union', what: 'Union spans the skin', check: () => ({ ok: FL.vent.zIn > FL.vent.zSkin && Math.abs(omlLow(FL.vent.pick[0], FL.vent.fsOut) - FL.vent.zSkin) < 1e-6, detail: `skin ${fx(FL.vent.zSkin)}–${fx(FL.vent.zIn)}` }) }],
  sourcing: { blank: '2 × AN832-4D, 2 × AN924-4D', ...SPRUCE, cost: 10, perAircraft: 1, note: 'Approximate.' } });
const F_ = FL.filler;
export const CAP_DEF = cots({ pn: 'LEZ-28-170', title: 'Filler caps and necks (L/R)',
  revs: rev0(`Initial definition. The neck cut baffle R2 and the cap sat 0.25 in under the OML (FM-5). As defined: at the inboard bay's centre (BL ±${fx(F_.bl, 2)}, FS ${F_.fs}), flush with the upper OML, the neck reaching down to WL ${fx(F_.zNeck)} so 2 % of the tank stays above it.`),
  features: [{ id: 'cap', kind: 'fitting', label: `Flush locking cap Ø ${F_.capD} in, top WL ${fx(F_.zTop)} (OML ${fx(F_.zOml)})`, tol: 'Flush −0.03/+0' }, { id: 'neck', kind: 'fitting', label: `Neck Ø ${F_.neckD} in to WL ${fx(F_.zNeck)} (expansion space)`, tol: '±0.03' }],
  drawingNotes: [`Placard at each filler: AVGAS 100LL — ${q().placard} US GAL USABLE.`],
  material: { spec: 'Bought-in flush locking cap and aluminium neck', alt: '—', form: 'bought', density: RHO.al, allowables: [] },
  process: [{ op: 'Install', spec: 'Pot the neck ring in the upper-skin solid insert (LEZ-57-180 rev B); chain the cap.' }], checks: ['fuel-qty'],
  mass: MASS('LEZ-28-170', 'solid volumes × 0.098, per side'), hardwareNote: 'Cap chain and O-ring with the cap.',
  interfaces: [{ id: 'I1', with: 'LEZ-57-180 ribs R1 / R2', feature: 'neck', what: 'Neck ≥ 0.5 in from every rib face', check: () => ({ ok: F_.ribGap >= 0.5, detail: `${fx(F_.ribGap)} in` }) },
    { id: 'I2', with: 'LEZ-57-180 upper skin', feature: 'cap', what: 'Flush with the skin at its rim (0–0.03 in under); the skin crowns over the cap', check: () => ({ ok: F_.zRim - F_.zTop <= 0.03 && F_.zTop <= F_.zRim, detail: `${fx(F_.zRim - F_.zTop, 3)} in under the rim; skin crown ${fx(F_.zOml - F_.zRim, 3)} in over the Ø ${F_.capD} cap` }) }],
  sourcing: { blank: 'Usher UD-3-F flush cap with flat adaptor (05-01061): 2 in opening, 3-3/4 in ring, 0.375 lb', ...SPRUCE, cost: 109.85, perAircraft: 2, note: 'UD-3-F $109.85; contoured adaptor 05-01062 $114.85 (Aircraft Spruce, accessed 2026-11-19).' } });
export const QDR_DEF = cots({ pn: 'LEZ-28-180', title: 'Sump quick-drains, flush (L/R)',
  revs: rev0('Initial definition. The poppet was 0.85 in above the belly over the gear mount tube (FM-12). As defined: flush poppets in the belly at FS 139.4, BL ±6.5, aft of the gear fairing, ≥ 1 in from the brake union.'),
  features: [{ id: 'drain', kind: 'fitting', label: `Body Ø 0.6 × 1.3 in, poppet face flush at WL ${fx(FL.QD(1).face[2])} (OML ${fx(FL.QD(1).oml)})`, tol: 'Flush ±0.03' }],
  material: { spec: 'Bought-in flush quick-drain, brass body', alt: '—', form: 'bought', density: RHO.brass, allowables: [] },
  process: [{ op: 'Install', spec: 'Through a potted insert in the belly (LEZ-53-150 rev E); 1/8 NPT with fuel-resistant sealant.' }], checks: ['fuel-drain'],
  mass: MASS('LEZ-28-180', 'solid volumes × 0.307, per side'), hardwareNote: '—',
  interfaces: [{ id: 'I1', with: 'LEZ-53-150 belly (rev E)', feature: 'drain', what: 'Poppet flush with the belly at its rim (0–0.03 in inside)', check: () => { const d = FL.QD(1); return { ok: d.face[2] - d.rim >= 0 && d.face[2] - d.rim <= 0.03, detail: `${fx(d.face[2] - d.rim, 3)} in inside the rim; belly curvature ${fx(d.rim - d.oml, 3)} in across the Ø 0.6 face` }; } },
    { id: 'I2', with: 'LEZ-32-120 / -170 fairing, LEZ-32-312 union (D)', feature: 'drain', what: 'Aft of FS 137.8; ≥ 1 in from the brake union (FS 136.5, BL ±10.4)', check: () => { const d = FL.QD(1).face, u = Math.hypot(d[0] - 10.4, d[1] - 111.0); return { ok: d[1] >= 112.3 && u - 0.3 >= 1, detail: `FS ${fx(d[1], 1)}; ${fx(u - 0.3)} in to the union` }; } }],
  sourcing: { blank: 'Saf-Air SA18 (= F391-18) flush quick-drain, 1/8 NPT (05-00970)', ...SPRUCE, cost: 63.85, perAircraft: 2, note: 'SA18 $63.85 (Aircraft Spruce, accessed 2026-11-19); CAV-110 is the push type and protrudes.' } });
const G_ = FL.gauge;
export const GAUGE_DEF = cots({ pn: 'LEZ-28-190', title: 'Fuel sight gauges (L/R)',
  revs: rev0(`Initial definition. The gauge was inside the dry wedge, outboard of the shell (FM-7). As defined: a clear tube on the cabin side at FS ${G_.fs}, beside and just aft of the pilot's shoulder, on two fittings through the shell, the wedge (sealed conduits) and R1 at WL ${fx(G_.zLo)} (floor) and ${fx(G_.zHi)} (ullage).`),
  features: [{ id: 'tube', kind: 'tube', label: `Clear fuel-resistant tube 3/8 × 1/16 at BL ±${fx(G_.x)}, WL ${fx(G_.zLo)}–${fx(G_.zHi)}`, tol: '±1/16 in' }, { id: 'fitting', kind: 'fitting', label: 'Two AN832-4 fittings potted through R1, the wedge conduit and the shell', tol: '±0.03' }],
  drawingNotes: ['Calibrate in US gallons by filling in 2 gal steps; mark the unusable level.', 'Separation to I / J raceways at the side wall is an open item (fuel-sep).'],
  material: { spec: 'Fuel-resistant clear tube (fluoropolymer), AN832-4 fittings', alt: '—', form: 'bought', density: RHO.nylon, allowables: [] },
  process: [{ op: 'Install', spec: 'Pot the fittings before closing the strake; fit the tube and its guard.' }], checks: ['fuel-sep'],
  mass: MASS('LEZ-28-190', 'solid volumes × density, per side'), hardwareNote: '—',
  interfaces: [{ id: 'I1', with: 'LEZ-57-180 R1 bosses (rev B)', feature: 'fitting', what: 'Fittings inside the cavity\'s height at R1', check: () => { const lo = cavFloor(R1.out, G_.fs), hi = cavTop(R1.out, G_.fs); return { ok: G_.zLo > lo && G_.zHi < hi, detail: `cavity ${fx(lo)}–${fx(hi)}` }; } },
    { id: 'I2', with: 'LEZ-53-150 side wall (rev E holes)', feature: 'tube', what: 'Tube inside the cabin', check: () => ({ ok: G_.x < G_.wIn, detail: `tube BL ${fx(G_.x)} / inner face ${fx(G_.wIn)}` }) }],
  sourcing: { blank: '2 ft clear fuel tube, 4 × AN832-4', ...SPRUCE, cost: 40, perAircraft: 1, note: 'Approximate.' } });
const GA = FL.gasc;
export const GASC_DEF = cots({ pn: 'LEZ-73-100', title: 'Gascolator on an offset firewall bracket',
  revs: rev0('Initial definition. The gascolator was in the mount diagonal FBL–EBR (−0.11 in) and on leg A (FM-8, FM-10). As defined: on a shelf bracket bolted to block A\'s layout bolts (BL 1.60 / 3.20, WL 28.20) with the body at BL 1.10, clear of FBL–EBR by ≥ 0.5 in; drain stem to the lower cowl skin.'),
  features: [{ id: 'head', kind: 'envelope', label: `Head ${GASC_ENV.head.join(' × ')} in at BL ${GA.c[0]}, FS ${fx(GA.c[1], 2)}, WL ${GA.c[2]}; IN outboard (from the union), OUT inboard`, tol: 'Vendor envelope' }, { id: 'bowl', kind: 'envelope', label: `Bowl Ø ${GASC_ENV.bowlD} × ${GASC_ENV.bowlH} in to WL ${fx(GA.bowlBot)}`, tol: 'Vendor' },
    { id: 'plate', kind: 'sheet', label: '0.09 in 6061-T6 plate on the firewall, 2 × AN3 at the layout (BL 1.60 / 3.20, WL 28.20)', tol: '±0.03; bolts per the layout' }, { id: 'drain', kind: 'tube', label: `Drain extension to the cowl skin at WL ${fx(GA.drainTip[2])} (G: Ø 0.5 hole in the lower cowl)`, tol: '±1/16' },
    { id: 'shelf', kind: 'sheet', label: '0.09 in 6061-T6 shelf under the head, bowl through its hole; bent up from the plate', tol: '±0.03' }],
  material: { spec: 'Bought-in gascolator (SCD); bracket 6061-T6 0.09; drain extension stainless', alt: '—', form: 'bought; sheet', density: null, allowables: [['Gascolator mass', `${VENDOR['LEZ-73-100']} lb`, 'typed from memory']] },
  process: [{ op: 'Install', spec: 'Bolt the bracket to the layout inserts; mount the head on the shelf; elbows to the union and the hose.' }], checks: ['fuel-flow', 'fuel-drain', 'fuel-sep', 'fw-equip'],
  mass: MASS('LEZ-73-100', `vendor ${VENDOR['LEZ-73-100']} lb (typed) + bracket, bolts and drain solid`), hardware: [{ std: 'AN822-6D', qty: 2, desc: 'elbows at the inlet and outlet', each: 0.04 }], hardwareNote: '2 × AN3-5A bracket bolts (drawn) with MS21042L3 nuts; 2 × AN822-6D elbows.',
  interfaces: [{ id: 'I1', with: 'LEZ-53-180 layout (A)', feature: 'plate', what: 'Bracket bolts on the layout', check: () => { const L = LAYOUT.find((x) => x.id === 'gasc'); return { ok: L.pts.every((p, i) => Math.hypot(p[0] - GA.bolts[i][0], p[1] - GA.bolts[i][2]) < 0.01), detail: L.pts.map((p) => `${p[0]}/${p[1]}`).join(', ') }; } },
    { id: 'I2', with: 'LEZ-53-180 layout allowance', feature: 'head', what: 'Item mass ≤ the layout\'s 1.2 lb (fw-equip)', check: () => { const m = GASC_DEF.mass.each + 0.08, L = LAYOUT.find((x) => x.id === 'gasc'); return { ok: m <= L.mass, detail: `${fx(m, 3)} lb incl. elbows` }; } },
    { id: 'I3', with: 'LEZ-71-220 FBL–EBR (G)', feature: 'bowl', what: 'Body centre BL ≤ 1.2; ≥ 0.5 in to the tube', check: sepOk('LEZ-73-100', /FBL–EBR/, 0.5) },
    { id: 'I4', with: 'LEZ-71-223 legs A / B (G)', feature: 'plate', what: '≥ 0.25 in', check: sepOk('LEZ-73-100', /LEZ-71-223/, 0.25) }],
  sourcing: { blank: 'Andair GAS375-M gascolator (05-29551), 152 g without fittings', ...SPRUCE, cost: 597, perAircraft: 1, note: 'GAS375-M $597 (Aircraft Spruce, accessed 2026-11-19); the BK375 bracket is not used (own bracket). Pressure drop 0.22 psi at 20 gph (Andair data) used in fuel-flow.' } });
const H1 = () => hoseState();
export const HOSE_DEF = rec({ pn: 'LEZ-73-110', kind: 'line', title: 'Fuel hoses firewall-aft, carb tee',
  revs: rev0('Initial definition. The gascolator-to-pump hose had 0.18 in slack against ±0.25 in of engine motion and ran 0.43 in into FBL–EBR (FM-10/11); the carb tee and reducer were unowned (FM-17). As defined: -6 PTFE hoses with AS1072 sleeves; the first an arc 0.55 in longer than its chord; the AN824-6D tee and AN919-4D reducer on the carb inlet are this part\'s hardware.'),
  features: [{ id: 'hose1', kind: 'hose', label: `Gascolator OUT → engine pump FP-IN: arc, chord ${fx(len3(FL.hose1))} in, length ${fx(pathLen(FL.hose1))} in, radius ${fx(minRadius(FL.hose1))} in; 90° swivels`, tol: 'Length ±1/8 in' }, { id: 'hose2', kind: 'hose', label: `FP-OUT → carb inlet tee, ${fx(pathLen(FL.hose2))} in (engine to engine)`, tol: 'Length ±1/8 in' }, { id: 'tee', kind: 'fitting', label: 'AN824-6D tee on the carb inlet, AN919-4D reducer on the branch (H\'s fuel-pressure line)', tol: '—' }],
  material: { spec: 'Stratoflex 124-6J PTFE -6 hose with integral fire sleeve (min bend radius 4.00 in, 0.234 lb/ft; Aircraft Spruce / McFarlane, accessed 2026-11-19); 3/8 × 0.035 5052-O riser up the firewall aft face (rev 2026-11-19: the hose needs a ≥ 5.8 in chord for its 4 in radius with 0.5 in slack); AN fittings; tee and reducer steel', alt: 'MIL-DTL-8794 -6 hose with sleeve (larger bend radius)', form: 'hose assemblies', density: RHO.hose, allowables: [['Min bend radius -6 PTFE with sleeve', `${HOSE6.bendMin} in`, 'BOUND (fuel-hose)']] },
  process: [{ op: 'Make up', spec: 'Cut, fit ends, fire-sleeve, proof-test 1.5 × engine pump maximum.' }, { op: 'Install', spec: 'Form hose 1 as an arc clear of FBL–EBR; check the slack with the engine moved ±1/4 in.' }],
  checks: ['fuel-hose', 'fuel-sep', 'fuel-flow'], mass: MASS('LEZ-73-110', `solid volumes: hose ${RHO.hose} lb/in³ (0.234 lb/ft smeared, 124-6J), riser 5052, tee steel`),
  hardware: partByPN('LEZ-73-110').hardware, hardwareNote: 'AN824-6D tee, AN919-4D reducer; hose ends with the assemblies.',
  interfaces: [{ id: 'I1', with: 'LEZ-71-210 FP-IN / FP-OUT / CARB-IN (G)', feature: 'hose1', what: 'Ends on the engine ports', check: onPorts('LEZ-73-110') }, { id: 'I2', with: 'Engine motion ±0.25 in (G)', feature: 'hose1', what: 'Slack ≥ 0.5 in', check: () => { const h = H1(); return { ok: h.slack >= 0.5, detail: `${fx(h.slack)} in` }; } },
    { id: 'I3', with: 'LEZ-78-100 exhaust (G)', feature: 'hose2', what: '≥ 6 in', check: sepOk('LEZ-73-110', /LEZ-78-100/, 6) }],
  tooling: { needed: false, text: 'Hose-assembly tooling.' },
  sourcing: { blank: 'Stratoflex 124-6J hose (integral fire sleeve) 1.5 ft, 4 ends; 3/8 × 0.035 5052-O riser 1 ft, AN822-6D, AN833-6D; AN824-6D, AN919-4D', ...SPRUCE, cost: 180, perAircraft: 1, lead: 'Days (made to order)', note: 'BOUND (approximate): hose and ends not itemised.' } });

// ------------------------------------------------------------------------------------------- LEZ-73-130 engine primer (integration 2026-11-19, Miles)
const PL = prmLen(), PFT = (PL.supply + PL.delivery + PL.cyl) / 12;
export const PRIMER_DEF = rec({ pn: 'LEZ-73-130', kind: 'line', title: 'Engine primer system',
  revs: [{ rev: 'A', date: '2026-11-19', short: 'Initial definition', change: `Initial definition (Miles, 2026-11-19: add a primer; the MA-3A has no accelerator pump and Lycoming notes an airframe primer may be required, memaudit engine eng-carb). An ACS 05-19920 plunger under the right console's aft end (knob FS ${fx(PRM.pump.knob[1][1], 1)}, BL ${fx(PRM.pump.a[0], 1)}, WL ${fx(PRM.pump.a[2], 1)}), a supply line from the GAS375 primer port, a delivery line through a 1 psi brass check valve, firewall bulkhead unions at BL 2.9 / 3.6, WL 31.6 / 32.0, an AN824-2D tee on the engine side and AN4022-1 nozzles in the right-bank intake pipes (cylinders 1 and 3); 1/8 × 0.030 copper throughout, fire-sleeved aft of the firewall.`, phase: 'integ' }],
  features: [
    { id: 'pump', kind: 'profile', label: `ACS Engine Primer 05-19920 (model 10920): plunger with lock, 3-5/8 in overall, 3.5 oz, side ports 5/16-24 SAE compression (61SM-02 nuts); body Ø ${2 * PRM.pump.r} envelope (BOUND: not published); on a 0.063 6061-T6 bracket under the right console top's inboard lip (2 × #8 screws), knob aft at FS ${fx(PRM.pump.knob[1][1], 1)}`, tol: '±1/16 in' },
    { id: 'valve', kind: 'fitting', label: 'Check valve 1/8 FNPT brass piston, 1 psi cracking, 500 psi (Zoro Select CHK BRS 215-2F2F-B), vertical in the delivery line below the pump, flow down; AN780-2 adapters each end', tol: 'Arrow down' },
    { id: 'lines', kind: 'tube', label: `Copper 1/8 × 0.030 (Aircraft Spruce 03-40900): supply ${fx(PL.supply, 1)} in, delivery ${fx(PL.delivery, 1)} in, branches ${fx(PL.cyl, 1)} in; AN800-2 / AN805-2 primer unions at the NPT adapters and nozzles, AN818-2D / AN819-2D at the tee; aft of the firewall in AS1072 fire sleeve; MS21919 clamps at ≤ 12 in`, tol: 'Bends ≥ 3 × OD, annealed' },
    { id: 'tee', kind: 'fitting', label: `AN824-2D tee on a clip to the engine's lower right isolator cup, FS ${fx(PRM.tee.c[1], 1)}`, tol: '±1/8 in' },
    { id: 'nozzles', kind: 'fitting', label: 'AN4022-1 discharge nipples (atomising) in 1/8 NPT bosses on the forward side of the cylinder 1 and 3 intake pipes (boss position BOUND: confirm on the engine; Lycoming intake-port bosses where present)', tol: 'Torque per AC 43.13-1B, sealant on the pipe threads' },
  ],
  drawingNotes: ['Placard at the knob: "PRIMER — PUSH IN AND LOCK" (an unlocked plunger can siphon into the induction: vendor review note).', `Within ${NOZ_R} in of each nozzle the line is fire-sleeved metal clamped to the intake pipe; the 6 in exhaust and 2 in ignition separations apply everywhere else.`],
  material: { spec: 'Copper tube 1/8 × 0.030 (Aircraft Spruce 03-40900); brass AN780-2 / AN800-2 / AN805-2 / AN4022-1; steel AN824-2D, AN818-2D / AN819-2D, AN832-2D; ACS 05-19920 primer; brass check valve with Buna-N seal', alt: 'Stainless 1/8 tube for the engine-side runs', form: 'tube, bent and flared; bought-in plunger, valve and fittings', density: RHO.cu,
    allowables: [['Copper F_tu (annealed)', `${PRM.cuFtu} psi`, 'BOUND (handbook value, typed)'], ['Check valve rating', '500 psi, 1 psi cracking', 'VENDOR: zoro.com G1818424 (accessed 2026-11-19)']] },
  process: [{ op: 'Make', spec: 'Bend the lines to the drawing, anneal the bends, flare the tee ends; fit the unions.' }, { op: 'Install', spec: 'Pump through its bracket; bulkhead unions in the firewall with fire sealant; clamp at ≤ 12 in; fire sleeve aft of the firewall.' }, { op: 'Test', spec: 'Proof 75 psi (1.5 × 50 psi), no leak; three strokes deliver at both nozzles; with the plunger unlocked, no flow past the check valve under the tank head.' }],
  checks: ['prm-sys', 'fuel-sep'],
  rules: [{ id: 'reach', label: `Knob within the 5th-percentile female's reach from B's right shoulder (${REACH.p5f} in) (ratio)`, v: REACH.p5f / prmReach().d, min: 1 }, { id: 'slack', label: 'Engine-side delivery slack, firewall → tee (in)', v: prmSlack().slack, min: 0.5 }],
  mass: { each: massEachF('LEZ-73-130', FPRIMS['LEZ-73-130']) + (VENDOR['LEZ-73-130'] || 0), from: `copper lines ${RHO.cu} lb/in³ over the solid (BOUND density) + vendor masses: pump 3.5 oz (ACS), valve, tee, nozzles and unions (BOUND)` },
  hardware: partByPN('LEZ-73-130').hardware, hardwareNote: 'Adapters, unions, tee and nozzles as listed; 2 × AN832-2D bulkhead unions in the firewall; clamps.',
  interfaces: [
    { id: 'I1', with: 'LEZ-73-100 gascolator PRIMER port (GAS375 1/8 NPT)', feature: 'lines', what: 'Supply starts on the port; every line end on its port (pump, valve, tee, nozzles)', check: onPorts('LEZ-73-130') },
    { id: 'I2', with: 'LEZ-78-100 exhaust (G)', feature: 'lines', what: `≥ 6 in outside the ${NOZ_R} in nozzle terminations`, check: sepOk('LEZ-73-130', /LEZ-78-100/, 6) },
    { id: 'I3', with: 'LEZ-71-220 mount tubes (G)', feature: 'lines', what: '≥ 0.5 in', check: sepOk('LEZ-73-130', /LEZ-71-220/, 0.5) },
    { id: 'I4', with: 'LEZ-24-160 / LEZ-74-110 power and ignition (I, H)', feature: 'lines', what: '≥ 2 in', check: sepOk('LEZ-73-130', /LEZ-(24-160|80-110|74-110)/, 2) },
    { id: 'I5', with: 'LEZ-25-110 right console and B\'s occupant', feature: 'pump', what: 'Knob within the 5th-percentile female reach from the right shoulder', check: () => { const r = prmReach(); return { ok: r.d <= REACH.p5f, detail: `${fx(r.d, 1)} in from B's right shoulder (FS ${fx(r.sh[1], 1)}, BL ${fx(r.sh[0], 1)}, WL ${fx(r.sh[2], 1)}); reach ${REACH.p5f} in` }; } }],
  tooling: { needed: false, text: 'Tube bender, flaring tool (37°).' },
  sourcing: { blank: `ACS 05-19920 primer; check valve; ${Math.ceil(PFT)} ft copper 1/8 × 0.030; AN780-2 ×3, AN800-2 ×5, AN805-2 ×5, AN4022-1 ×2, AN824-2D, AN818-2D ×3, AN819-2D ×3, AN832-2D ×2; AS1072 sleeve`, vendor: 'Aircraft Spruce (primer 05-19920 $267.00, tube 03-40900 $3.75/ft, AN780-2 $7.85, AN800-2 $1.85, AN805-2 $2.40, AN4022-1 $64.85, AN824-2D $32.90, AN818-2D $1.53, AN819-2D $1.10); Zoro (check valve $20.59)', url: 'https://www.aircraftspruce.com/catalog/hapages/primerfittings.php', cost: +(267 + 20.59 + Math.ceil(PFT) * 3.75 + 3 * 7.85 + 5 * 1.85 + 5 * 2.40 + 2 * 64.85 + 32.90 + 3 * 1.53 + 3 * 1.10 + 2 * 15 /* AN832-2D BOUND */).toFixed(2), costAsOf: '2026-11-19', perAircraft: 1, lead: 'Stock', note: 'Prices from the vendor pages (accessed 2026-11-19); AN832-2D bulkhead unions and the fire sleeve BOUND (not on the fetched pages).' } });
function len3(p) { return Math.hypot(...p.at(-1).map((v, i) => v - p[0][i])); }

export const F_DEFS = { INST_DEF, SUMP_DEF, FEED_DEF, VALVE_DEF, DRIVE_DEF, PUMP_DEF, L150_DEF, UNION_DEF, VENT_DEF, VFIT_DEF, CAP_DEF, QDR_DEF, DRL_DEF, GAUGE_DEF, GASC_DEF, HOSE_DEF, PRIMER_DEF };
void GEO; void MOUNT; void groupVolsF; void omlTop; void bellyAt; void BAYS; void takeoffGph;

// ------------------------------------------------------------------------------------------- final integration (2026-11-19)
// Block F's open items, closed by their owners' changes; each becomes a real check reading the owner's record or model.
import { DEFS as _DEFS } from './release.js';
import { oilFuelGal } from '../parts/wpG4_systems.js';
const _real = (rec, id, o) => { const k = rec.interfaces.findIndex((f) => f.id === id); if (k >= 0) rec.interfaces[k] = { ...rec.interfaces[k], ...o }; };
const _ifc = (pn, id) => _DEFS[pn]?.def?.interfaces?.find((f) => f.id === id);
_real(INST_DEF, 'I3', { what: 'G\'s oil-qty takes the usable fuel (2 × the placarded quantity, FIXED.fuelQty)', check: () => { const g = oilFuelGal(), u = 2 * q().placard; return { ok: g === u, detail: `oil-qty takes ${g} gal; usable ${u} gal` }; } });
_real(INST_DEF, 'I4', { what: 'Carb tee and hose 2 in the region G declares the carb blister: ≥ 0.25 in from the scoop, air box, filter and SCAT (G\'s LEZ-71-250 I2)', check: () => { const f = _ifc('LEZ-71-250', 'I2'); if (!f) return { ok: false, detail: 'no LEZ-71-250 I2' }; const r = f.check(); return { ok: r.ok, detail: `LEZ-71-250 I2: ${r.detail}` }; } });
_real(INST_DEF, 'I5', { what: 'Ø 0.5 hole in the lower cowl at the gascolator drain stem (G\'s LEZ-71-155 rev C feature drain, check I4)', check: () => { const d = _DEFS['LEZ-71-155']?.def, f = _ifc('LEZ-71-155', 'I4'), has = !!d?.features.find((x) => x.id === 'drain'); const r = f ? f.check() : { ok: false, detail: 'no LEZ-71-155 I4' }; return { ok: has && r.ok, detail: `LEZ-71-155 rev ${d?.rev} drain hole ${has ? 'defined' : 'MISSING'}; I4: ${r.detail}` }; } });
_real(INST_DEF, 'I6', { what: 'The transducer\'s water trap is drained: H\'s inlet drain tee on LEZ-77-130 (it sits below the union)', check: () => { const h = (_DEFS['LEZ-77-130']?.def?.hardware || []).find((l) => /drain tee/.test(l.desc)); return { ok: !!h, detail: h ? `${h.std}: ${h.desc} (transducer ${fx(FL.UNION.wl - FL.fft.out[2])} in below the union)` : 'no drain tee on LEZ-77-130' }; } });
_real(INST_DEF, 'I7', { what: 'Gauges and wells clear of the raceways by the class rules (fuel|signal, fuel|rf 1 in; fuel|power 2 in)', check: () => { const o = separations().filter((r) => !r.released && r.m < 0 && /LEZ-28-1[19]0/.test(r.mine)); return { ok: !o.length, detail: o.length ? o.map((r) => `${r.mine} ↔ ${r.other} (${r.block}) ${fx(r.d)} / ${r.need}`).join('; ') : (() => { const w = separations().filter((r) => /LEZ-28-1[19]0/.test(r.mine)).sort((a, b) => a.m - b.m)[0]; return w ? `closest ${w.mine} ↔ ${w.other} ${fx(w.d)} in (rule ${w.need})` : 'all clear'; })() }; } });
_real(DRIVE_DEF, 'I6', { what: 'Knob within the seated pilot\'s left-hand reach (block B\'s occupant, reach BOUND) and B\'s position placard on it (LEZ-25-110 rev C)', check: () => { const r = reachTo(DV.H), b = _DEFS['LEZ-25-110']?.def?.features.find((x) => x.id === 'selplacard'); return { ok: r.d <= REACH.p5f && !!b, detail: `knob ${fx(r.d, 1)} in from the left shoulder (reach ${REACH.p5f} in, typed); placard ${b ? 'on the console' : 'MISSING'}` }; } });
_real(DRIVE_DEF, 'I7', { what: '≥ 0.25 in from block H / I / J lines (engine controls, raceways)', check: sepOk('LEZ-28-135', /LEZ-(76|77|74|20|23|24|33|80|25-16)/, 0.25) });
DRIVE_DEF.rev = 'B';
DRIVE_DEF.revs = [...DRIVE_DEF.revs, { rev: 'B', date: '2026-11-19', short: 'Knob aft and lower, clear of the engine-control cables', change: `Final integration: the knob at FS 84.0, WL 33.8 sat across block H's throttle and mixture cables where they drop from the quadrant (0.85 in into them; I7 was an open item). It moves 5.0 in aft and 0.5 in down to FS ${fx(DV.H[1], 1)}, WL ${fx(DV.H[2], 1)} (BL ${fx(DV.H[0], 1)}), 0.48 in clear of the cables and of block I's power raceway, still forward of the seat back and under the left armrest; the shaft is shorter and the universal joint ${fx(DV.ujAngle, 1)}°. The reach is now from block B's occupant model (rule reach; I6), and B's placard is in the console trim.` }];
