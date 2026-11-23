// LEZ-27-150 rudder/brake pedals, LEZ-27-151 rudder cables, LEZ-27-160 stops, LEZ-27-165 pitch trim. Notional.
import { L, SZ, ARM, LINK, MAT, CABLE, CONDUIT, TERM, rudRoute, RR, V } from '../parts/wpC1_controls.js';
import { RSTOP, rudStopLoads } from '../parts/wpA8_tip.js';
import { STICK_TRAVEL } from './c27_sticks.js';
import { ctlSection, ctlStations } from '../parts/wp19_ctl.js';
import { KEEPOUTS, insideFus } from '../systems.js';
import { fusAt, DEFAULT_DESIGN } from '../structures.js';
const DEFAULT_RUD = () => DEFAULT_DESIGN.rudderDeg;
import { icdIface } from '../parts/wpC9_icd.js';
import { makePrimRec, fx, pt } from './c27_common.js';
import { toeLever, BRK } from '../parts/wpD2_brakes.js';
/** toe travel and stop (rev C, final integration; block D open item LEZ-32-311 O1): an adjustable AN3 stop screw on the
 *  pedal arm bears on the toe plate and ends the toe travel at a rod stroke 0.10 in past the stroke that makes full
 *  pressure (lining wear and rigging: DESIGN), short of the cylinder's available stroke (SCD) by ≥ 0.10 in */
export const TOE_STOP = (() => { const k = toeLever(), rod = BRK.stroke + 0.10, th = rod / k.arm; return { rod, deg: th * 180 / Math.PI, pad: th * k.pad, arm: k.arm, padArm: k.pad, screw: 'AN3 stop screw with MS21042L3 jam nut (adjustable ±0.06 in at the plate)' }; })();

const metalNA = { cut: 'Tube, sheet and plate cut to the drawing: no flat pattern', layup: 'Metal parts' }, TOL = { general: '.XX ±0.03 · .XXX ±0.010', holes: 'Pivot and rod-end holes +0.002 / −0.000', breakEdges: '0.010–0.030' };
const inKO = (p) => KEEPOUTS.some((k) => k.t === 'box' && [0, 1, 2].every((i) => Math.abs(p[i] / 12 - k.c[i]) <= k.d[i] / 2));
export const PED = makePrimRec('LEZ-27-150', {
  more: [{ rev: 'B', date: '2026-11-19', short: 'MC clevises 0.50 in forward', change: 'Block J interface (ICD J-R3): the MC anchor ear reached FS 40.73 at WL 36.1–37.7, BL ±4.3, inside B\'s AXIS cut-out and 0.0 in from J\'s AXIS LCD collar at neutral, and over the push it swept J\'s switch row (−0.07 in). Block D\'s master cylinder, the rod clevis on the toe tab and the body ear move 0.50 in forward with it (rod eye FS 34.90, body eye FS 39.78); the toe hinge follows (3.0 in square to the cylinder axis). Arms, ratios and loads are unchanged; the ear now ends 0.97 in ahead of the panel and clears the AXIS and the switch row by ≥ 0.27 in over 0–11.4° of pedal.' }, { rev: 'C', date: '2026-11-19', short: 'Toe travel and stop', change: `Final integration (block D's open item LEZ-32-311 O1): an adjustable AN3 stop screw on each pedal arm bears on the toe plate and ends the toe travel at ${fx(TOE_STOP.deg, 1)}° (${fx(TOE_STOP.pad, 2)} in at the toe pad, ${fx(TOE_STOP.rod, 2)} in of MC rod stroke): ${fx(TOE_STOP.rod - BRK.stroke, 2)} in past the ${BRK.stroke} in that makes full pressure and ${fx(BRK.strokeAvail - TOE_STOP.rod, 2)} in short of the cylinder's available ${BRK.strokeAvail.toFixed(2)} in (LEZ-32-311 rev D SCD), so the stop, not the cylinder, takes the pilot's push. Check I5.` }],
  nha: 'LEZ-27-100', title: 'Rudder/brake pedals', effectivity: 'One set per aircraft, front seat',
  change: `Initial definition. The pedals were two ASSUMED boxes; the master cylinders sat 2.1 in below them on structure, so rudder travel would have braked (ICD F25, block D D311-1/-2). As defined: hung pedals on a ${SZ.pedTube[0]} × ${SZ.pedTube[1]} 4130 cross tube at FS ${L.ped.s}, WL ${L.ped.z}; pad ${ARM.pedalPad} in below the pivot, cable horn ${ARM.pedalHorn} in above; a toe plate hinged on the pedal with a ${ARM.toeTab} in tab pushes the master cylinder, whose body clevis is on an ear of the pedal sleeve, so the MC moves with the pedal.`,
  datums: [{ id: 'A', what: 'Pedal pivot axis (cross-tube centre line)' }, { id: 'B', what: 'Aircraft centre line' }, { id: 'C', what: 'Pedal centre plane BL ±' + fx(L.ped.y, 2) }],
  features: [
    { id: 'crosstube', kind: 'tube', label: `Cross tube ${SZ.pedTube[0]} × ${SZ.pedTube[1]} 4130 N, BL ±${L.ped.halfSpan}, in end brackets on the side walls`, tol: 'Straight within 1/32' },
    { id: 'sleeve', kind: 'tube', label: `Pedal sleeves ${SZ.pedTube[0] + 0.25} × 0.065 4130, 1.5 in, bronze-bushed on the cross tube`, tol: 'End play ≤ 0.010' },
    { id: 'arm', kind: 'tube', label: `Pedal arms ${SZ.pedArm[0]} × ${SZ.pedArm[1]} 4130 to the pad`, tol: '±0.03' },
    { id: 'pad', kind: 'plate', label: 'Heel pad 3.0 × 2.6 in 6061-T6', tol: '—' },
    { id: 'toe', kind: 'plate', label: `Toe plate 3.0 × 2.4 in 6061-T6 hinged at ${pt(L.toeHinge)}`, tol: '—' },
    { id: 'toestop', kind: 'block', label: `Rev C: toe stop, ${TOE_STOP.screw} on the pedal arm under the toe plate; set at ${fx(TOE_STOP.deg, 1)}° of toe travel (${fx(TOE_STOP.pad, 2)} in at the pad, ${fx(TOE_STOP.rod, 2)} in of MC rod stroke)`, tol: 'Set at rigging to the rod stroke ±0.03 in' },
    { id: 'toetab', kind: 'plate', label: `Toe tab ${SZ.tToe} in 4130, ${ARM.toeTab} in aft of the toe hinge to the MC rod clevis at ${pt(L.mcRod)}`, tol: 'Hole ±0.010' },
    { id: 'mcear', kind: 'plate', label: `MC anchor ear on the sleeve, body clevis at ${pt(L.mcBody)} (the MC rides with the pedal)`, tol: 'Hole ±0.010' },
    { id: 'horn', kind: 'plate', label: `Cable horn ${SZ.tHorn} × ${SZ.hornW} in 4130 (fits the ${TERM.forkStd} jaw, ${TERM.forkJaw} in), ${ARM.pedalHorn} in above A at BL ±${fx(L.cableHorn[1], 2)}; cable pin hole Ø ${TERM.forkPin}, ${SZ.hornE} in from the end`, tol: 'Hole ±0.010' },
    { id: 'bracket', kind: 'block', label: 'End brackets 6061-T6 bonded to the side-wall hard points (LEZ-53-150 rev B)', tol: '—' },
  ],
  checks: ['c27-pedal'], rules: [{ id: 'mc', label: 'MC length change over full rudder (in): both clevises on the pedal', v: 0, min: 0 }, { id: 'eD', label: 'Horn cable-pin hole e/D ≥ 1.4 (end capped by the G5 sweep clearance; shear-out and bearing in c27-pedal)', v: SZ.hornE / TERM.forkPin, min: 1.4 }, { id: 'jaw', label: 'Horn fits the fork-end jaw (jaw / horn ≥ 1.02)', v: TERM.forkJaw / SZ.tHorn, min: 1.02 }],
  hardware: [{ std: 'AN3-6A', qty: 4, desc: 'MC clevis bolts (rod and body)' }, { std: 'AN310-3', qty: 4, desc: 'Castle nuts' }, { std: 'MS24665-132', qty: 4, desc: 'Cotter pins' }, { std: 'AN3-5A', qty: 2, desc: 'Toe-plate hinge bolts' }, { std: 'AN3-10A', qty: 2, desc: 'Toe stop screws (rev C), with MS21042L3 jam nuts' }, { std: 'AN3-12A', qty: 4, desc: 'End-bracket bolts' }, { std: 'MS21042L3', qty: 6, desc: 'Nuts' }, { std: 'AN960-10', qty: 16, desc: 'Washers' }],
  hardwareNote: 'MC rod and body clevises on AN3 with castle nuts and cotter pins; toe hinge AN3; end brackets 2 × AN3 each into the side-wall hard points.', na: metalNA, tolerances: TOL,
  material: { spec: 'AMS 6360 4130 N tube, AMS 6350 sheet; AMS-QQ-A-250/11 6061-T6 plates and brackets', alt: '—', form: 'tube, sheet, plate', density: null, allowables: [['4130 N F_ty / F_bru', `75 / ${MAT['4130'].Fbru / 1000} ksi`, MAT['4130'].spec], ['6061-T6 F_ty', '35 ksi', MAT['6061'].spec]] },
  process: [{ op: 'Weld', spec: 'Sleeve, arm, MC ear and horn welded in the pedal jig; normalise; prime.' }, { op: 'Install', spec: 'Cross tube through the brackets and sleeves; MCs (LEZ-32-311) on their clevises; brake lines with a -3 hose loop at each MC.' }, { op: 'Inspect', spec: `Pedals square at neutral; full rudder (${fx(LINK.pedalDeg, 1)}° pedal) without brake application; firm toe brake.` }],
  interfaces: [
    ...icdIface(['IC9']).map((x) => ({ ...x, id: 'I1', with: 'LEZ-32-311 master cylinders (block D)', feature: 'mcear' })),
    { id: 'I2', with: 'LEZ-27-151 rudder cable', feature: 'horn', what: 'Cable fork end on the horn', check: () => ({ ok: rudRoute(1)[0].every((v, i) => Math.abs(v - L.cableHorn[i]) < 1e-9), detail: `${pt(L.cableHorn)}; ${fx(LINK.cable, 0)} lb limit` }) },
    { id: 'I3', with: 'Nose-gear keep-outs (block E)', feature: 'crosstube', what: 'Pedals clear of the NG box, channel and well', check: () => { const pts = [[L.ped.s, 0, L.ped.z], [35.6, L.ped.y, 32.4], [35.6, -L.ped.y, 32.4], L.mcBody, L.mcRod]; const bad = pts.filter(inKO); return { ok: !bad.length, detail: bad.length ? `inside a keep-out at ${pt(bad[0])}` : 'clear of every keep-out' }; } },
    { id: 'I5', with: 'LEZ-32-311 master cylinder stroke (block D, rev D SCD)', feature: 'toestop', what: 'The toe stop ends the travel ≥ 0.05 in past the rod stroke that makes full pressure and ≥ 0.10 in short of the cylinder\'s available stroke; toe-pad travel ≤ 0.75 in (DESIGN, ankle travel)', check: () => { const T = TOE_STOP, a = T.rod - BRK.stroke, b = BRK.strokeAvail - T.rod; return { ok: a >= 0.05 - 1e-9 && b >= 0.10 - 1e-9 && T.pad <= 0.75, detail: `stop at ${fx(T.deg, 1)}° (tab arm ${fx(T.arm, 3)} in, pad ${T.padArm} in): rod ${fx(T.rod, 2)} in, ${fx(a, 2)} past full pressure (${BRK.stroke}), ${fx(b, 2)} short of the ${BRK.strokeAvail.toFixed(2)} in available; ${fx(T.pad, 2)} in at the toe pad` }; } },
    { id: 'I4', with: 'LEZ-53-150 side walls (rev B hard points)', feature: 'bracket', what: 'Brackets inside the shell', check: () => { const w = fusAt(L.ped.s / 12).w * 6 - 0.45; return { ok: L.ped.halfSpan + 0.35 <= w, detail: `bracket to BL ±${fx(L.ped.halfSpan + 0.33)}, inner face ±${fx(w)}` }; } },
  ],
  tooling: { needed: true, text: 'Pedal weld jig (sleeve, arm, ear and horn positions); cross-tube drilling template for the brackets.' },
  sourcing: { blank: `4130 N tube ${SZ.pedTube[0]} × ${SZ.pedTube[1]} 2 ft, 1.25 × 0.065 1 ft, ${SZ.pedArm[0]} × ${SZ.pedArm[1]} 1 ft; 4130 sheet; 6061-T6 plate`, vendor: 'Aircraft Spruce', url: 'https://www.aircraftspruce.com/menus/mp/steeltubing.html', cost: 70.0, costAsOf: '2026-11-18', perAircraft: 1, lead: 'Stock', note: 'Approximate (typed from memory).' },
});
const route = rudRoute(1), bends = route.slice(1, -2).map((p, i) => { const a = V.norm(V.sub(p, route[i])), b = V.norm(V.sub(route[i + 2], p)); return Math.acos(Math.max(-1, Math.min(1, V.dot(a, b)))) * 180 / Math.PI; });
const routeLen = route.slice(1).reduce((s, p, i) => s + V.len(V.sub(p, route[i])), 0);
export const CAB = makePrimRec('LEZ-27-151', {
  nha: 'LEZ-27-100', qty: 2, title: 'Rudder cables in conduit (L/R)', effectivity: 'Left and right (mirror); right shown',
  change: `Initial definition. The cable ran through the front stick, crossed the aileron rod, passed the CS spar's drag bolts and the strake tank (ICD F1–F5). As defined it leaves the pedal horn, runs along the side wall at BL ${fx(route[RR.wall][1], 1)}, WL ${fx(route[RR.wall][2], 1)}, enters the CS spar corridor at ${pt(route[RR.fwd])} and leaves at ${pt(route[RR.aft])}, 1.6 in above rod A, then follows the old wing run; ICD phase 2: after the panel it climbs over the pitch rod (it passed through it at FS 42), and at the tip it leaves the conduit at a fairlead in the tip close-out, turns on a pulley in the fin 3.0 in ahead of block A's rudder horn and ends on the horn's cable hole at ${pt(route.at(-1))}; ${CABLE.name} in ${CONDUIT.name}, ${fx(routeLen, 1)} in.`,
  datums: [{ id: 'A', what: 'Cable route (conduit centre line)' }],
  features: [
    { id: 'cable', kind: 'cable', label: `${CABLE.name}, ${fx(routeLen, 1)} in, ${TERM.forkStd} fork ends, ${TERM.tbStd} turnbuckle at the pedal end`, tol: 'Length at rigging; tension 15–25 lb' },
    { id: 'conduit', kind: 'conduit', label: `${CONDUIT.name}, clamped every 18 in, bends ≥ 6 in radius (largest corner ${fx(Math.max(...bends), 0)}°)`, tol: 'No kinks' },
  ],
  checks: ['c27-rud-cable'], rules: [{ id: 'size', label: 'Cable diameter ≥ 1/8 in (23.689)', v: CABLE.d / 0.125, min: 1 }, { id: 'bend', label: 'Largest route corner ≤ 60° (laid on a 6 in radius)', v: 60 / Math.max(...bends), min: 1 }],
  hardware: [{ std: TERM.forkStd, qty: 2, desc: 'Swaged fork ends for 3/16 in cable, 4,200 lb, 5/16 pin (per side; DC-005: was the 1/8 in -4)' }, { std: TERM.tbStd, qty: 1, desc: 'Turnbuckle body for 3/16 in cable, 5/16-24, 4,600 lb (DC-005: was the B5S)' }, { std: TERM.tbEnd, qty: 1, desc: 'Turnbuckle swaged terminal (short), 3/16 in, 4,200 lb; RH or LH to suit the body end (DC-005)' }, { std: TERM.clip, qty: 2, desc: 'Turnbuckle clips for the B6S (short) body, per MS21251M Table I' }, { std: 'MS21919WDG4', qty: 16, desc: 'Cushion clamps for the conduit' }, { std: 'MS20220-2', qty: 1, desc: 'Cable pulley in the fin root, 3.005 in OD, 0.3125 bore, 1,680 lb, for 1/8–3/16 in cable, on block A\'s hard point (rev B: was AN210-1A, a 1/16–3/32 in cable pulley)' }, { std: 'AN3 bolt + 6061 spacer', qty: 1, desc: 'Cable guard pin across the pulley bracket, ≤ 1/16 in from the rim (rev B: the old line named MS24566-1B, which is a pulley, not a guard pin)' }, { std: 'Phenolic fairlead, 1/4 in bore', qty: 1, desc: 'At the wing tip close-out (conduit end)' }],
  hardwareNote: `Per side: two ${TERM.forkStd} swaged fork ends (Ø ${TERM.forkPin} pins), an ${TERM.tbStd} turnbuckle (${TERM.tbEnd} terminal) with ${TERM.clip} clips at the pedal, the MS20220-2 fin pulley (rated for 1/8–3/16 in cable) with an AN3 guard pin, cushion clamps every 18 in; proof-load each swage to 60 % of break.`, na: { cut: 'Cable cut to length: no flat pattern', layup: 'Not a composite part' }, tolerances: { general: 'Length ±1/4 in before rigging' },
  material: { spec: `${CABLE.name}; ${CONDUIT.name}`, alt: 'Galvanised carbon-steel 7×19 3/16 in (4,200 lb)', form: 'cable, conduit', density: null, allowables: [['Cable break', `${CABLE.brk} lb`, 'MIL-DTL-83420 table I (emilspec.com mirror, accessed 2026-11-19)'], ['Fork end MS20667-6', '4,200 lb', 'Aircraft Spruce 2026 catalogue p. 137 (accessed 2026-11-21)'], ['Turnbuckle MS21251-B6S', '4,600 lb', 'MS21251M Table I (faa.gov/media/28696); Lexco (accessed 2026-11-21)'], ['Terminal MS21260-S6RH/LH', '4,200 lb', 'Aircraft Spruce MS21260 page (accessed 2026-11-21)'], ['Pulley MS20220-2 (1/8–3/16 in cable)', '1,680 lb', 'Aircraft Spruce pulleys page Cat270143 (accessed 2026-11-21)']] },
  process: [{ op: 'Swage', spec: 'Swage the fork ends with the go/no-go gauge; proof-load 60 % of break.' }, { op: 'Install', spec: 'Conduit laid in before the jut-out and wing are closed; cable pulled through; tension set at the turnbuckle; clips fitted.' }],
  interfaces: [
    { id: 'I1', with: 'LEZ-57-140 CS spar (rev C holes)', feature: 'conduit', what: 'Conduit holes in the spar corridor, below rod A', check: () => ({ ok: route[RR.fwd][1] <= 11.4 && route[RR.aft][1] >= 12.5 && Math.abs(route[RR.fwd][2] - L.WLA) >= 1.2, detail: `${pt(route[RR.fwd])} → ${pt(route[RR.aft])}, Ø ${fx(CONDUIT.od + 0.125, 4)} grommeted holes, ${fx(route[RR.fwd][2] - L.WLA, 2)} in above rod A` }) },
    { id: 'I2', with: 'Front stick, trim, canopy latch keep-out', feature: 'conduit', what: 'Clear of the stick base and the left-side keep-outs', check: () => { const left = rudRoute(-1), bad = [...route, ...left].filter(inKO); const st = Math.hypot(route[RR.wall][1] - L.G1[1], route[RR.wall][2] - (L.G1[2] - 3)); return { ok: !bad.length && st > 0.8, detail: `${bad.length ? `in a keep-out at ${pt(bad[0])}` : 'no keep-out'}; ${fx(st, 2)} in from the stick's pitch arm line` }; } },
    ...icdIface(['IC8']).map((x) => ({ ...x, id: 'I3', with: 'LEZ-55-193 rudder horn (block A)', feature: 'cable' })),
    { id: 'I4', with: 'Fuselage interior', feature: 'conduit', what: 'Cabin run inside the shell', check: () => { const bad = route.slice(1, 5).filter((p) => !insideFus(p[0] / 12, p[1] / 12, p[2] / 12)); return { ok: !bad.length, detail: bad.length ? `outside at ${pt(bad[0])}` : 'inside the shell to the spar' }; } },
  ],
  tooling: { needed: true, text: 'Hand swager and go/no-go gauge; cable tensiometer.' },
  sourcing: { blank: `${fx(routeLen / 12 + 2, 0)} ft cable and conduit per side`, vendor: 'Aircraft Spruce (MIL-DTL-83420 cable, PTFE-lined conduit, MS20667, turnbuckles)', url: 'https://www.aircraftspruce.com/menus/ha/cable.html', cost: 75.0, costAsOf: '2026-11-18', perAircraft: 2, lead: 'Stock', note: 'Approximate (typed from memory).' },
});
const ailC = (() => { const st = ctlStations('aileron'); return [st[0], st.at(-1)].map((y) => { const s = ctlSection('aileron', y); return { c: Math.atan(s.bev / s.depth) * 180 / Math.PI, tol: Math.asin(1 / 16 / s.chord) * 180 / Math.PI }; }).reduce((a, b) => (b.c - b.tol < a.c - a.tol ? b : a)); })();
const elevTol = (() => { const s = ctlSection('elevator', ctlStations('elevator')[0]); return Math.asin(1 / 16 / s.chord) * 180 / Math.PI; })();
const elevContact = (() => { const s = ctlSection('elevator', ctlStations('elevator')[0]); return Math.atan(s.bev / s.depth) * 180 / Math.PI; })();
export const STOPS = makePrimRec('LEZ-27-160', {
  nha: 'LEZ-27-100', title: 'Control stops (pitch, roll, rudder pedals)', effectivity: 'One set per aircraft',
  change: `Initial definition. The stops were one ASSUMED box with no angles (ICD F25 / §1). As defined: pitch stops either side of the stick's pitch arm (±${fx(STICK_TRAVEL.pitch, 2)}° stick = ±20° elevator), a roll collar on the roll tube with two stop bolts (±${fx(STICK_TRAVEL.roll, 2)}° = ±15° aileron), and a stop block behind each pedal pad (${fx(LINK.pedalDeg, 1)}° pedal = 25° rudder); all adjustable, set after rigging, safety-wired.`,
  datums: [{ id: 'A', what: 'Front stick pivot (LEZ-27-110 A)' }, { id: 'B', what: 'Pedal pivot (LEZ-27-150 A)' }],
  features: [
    { id: 'pitchstop', kind: 'block', label: 'Pitch stop blocks 2 × 6061-T6 with AN4 stop bolts ±1.0 in fore and aft of the pitch-arm hole', tol: 'Set at rigging ±0.25°' },
    { id: 'rollcollar', kind: 'block', label: 'Roll collar 4130, pinned to the roll tube 1.6 in aft of A, with a stop lug', tol: '—' },
    { id: 'rollstop', kind: 'block', label: 'Roll stop blocks 2 × 6061-T6 on the bearing block, AN4 stop bolts', tol: 'Set at rigging ±0.25°' },
    { id: 'pedalstop', kind: 'block', label: `Pedal stop blocks 2 × 6061-T6 on the floor, AN4 stop bolts (neutral and full). DC-005: the full stop is set at ${fx(LINK.pedalDeg, 1)}° pedal, beyond the ${fx(LINK.rudLink.pedalDeg0, 1)}° that strokes the cable to full rudder unloaded, so the pedal takes up the cable's stretch at the crosswind-approach load with no balance relief (k_bal = 1) plus 1°. At zero airspeed the rudder meets its own stop first and the pedal reaches its stop at about ${fx(rudStopLoads().Fped0, 0)} lb (cable ${fx(rudStopLoads().T0, 0)} lb)`, tol: 'Set at rigging ±0.25°' },
    { id: 'rudderstop', kind: 'block', label: `DC-005: rudder full-travel stops (block A hardware on LEZ-57-130, check rud-stop): ${RSTOP.block} on each fin's lower hard point, 2 × AN3 into flox-potted NAS1832C3 inserts; the horn meets the bumper at ${DEFAULT_RUD()}° outward. Shimmed at rigging (${RSTOP.shim})`, tol: 'Set at rigging to full travel +0 / −0.5°' },
  ],
  checks: ['c27-stops'],
  rules: [{ id: 'elev', label: `Elevator stop 20° + rigging ${fx(elevTol, 2)}° below the bevel contact ${fx(elevContact, 2)}°`, v: elevContact / (20 + elevTol), min: 1 }, { id: 'ail', label: `Aileron stop 15° + ${fx(ailC.tol, 2)}° below the bevel contact ${fx(ailC.c, 2)}° (worse end)`, v: ailC.c / (15 + ailC.tol), min: 1 }],
  hardware: [{ std: 'AN4-10A', qty: 6, desc: 'Stop bolts' }, { std: 'AN316-4R', qty: 6, desc: 'Jam nuts' }, { std: 'MS20995C32', qty: 1, desc: 'Safety wire, 0.032 in (ft)' }],
  hardwareNote: 'Six AN4 stop bolts with AN316 jam nuts, safety-wired after rigging (23.675).', na: metalNA, tolerances: TOL,
  material: { spec: 'AMS-QQ-A-250/11 6061-T6 bar; AMS 6350 4130 collar', alt: '—', form: 'bar', density: null, allowables: [['6061-T6 F_bru', '88 ksi', MAT['6061'].spec]] },
  process: [{ op: 'Machine', spec: 'Blocks and collar from bar; tap for the stop bolts.' }, { op: 'Rig', spec: 'Set each stop at the surface travel with the rigging bar; jam and safety-wire.' }],
  interfaces: icdIface(['IC4']).map((x) => ({ ...x, id: 'I1', with: 'LEZ-55-192 / LEZ-57-191 / LEZ-55-193 travel', feature: 'pitchstop' })),
  tooling: { needed: false, text: 'Rigging bar and protractor (LEZ-27-100).' },
  sourcing: { blank: '6061-T6 bar 1 × 1 in, 12 in; 4130 bar', vendor: 'Aircraft Spruce', url: 'https://www.aircraftspruce.com/menus/mp/alumbar.html', cost: 20.0, costAsOf: '2026-11-18', perAircraft: 1, lead: 'Stock', note: 'Approximate.' },
});
export const TRIM = makePrimRec('LEZ-27-165', {
  nha: 'LEZ-27-100', title: 'Pitch trim: lever, friction guide, spring cartridge', effectivity: 'One per aircraft, right console',
  change: `Initial definition. The lever was on the left console, 18.9 in from the pitch rod and inside the canopy-latch keep-out (ICD F17, F18). As defined it is on the right console at ${pt(L.trimPiv)}; its 1.5 in lower arm sets the preload of a spring cartridge clamped to the rear pitch link at ${pt(L.trimClamp)}.`,
  datums: [{ id: 'A', what: 'Lever pivot' }],
  features: [
    { id: 'lever', kind: 'plate', label: '6061-T6 lever 0.19 × 0.75 in: 3.0 in handle above A, 1.5 in arm below', tol: '—' },
    { id: 'guide', kind: 'block', label: 'Friction guide UHMW 4.0 in slot on the console top (block B cut-out), holds 3 lb', tol: '—' },
    { id: 'cartridge', kind: 'tube', label: '0.625 × 0.035 2024-T3 cartridge body with a ±15 lb spring (bottoms at full travel)', tol: '—' },
    { id: 'spring', kind: 'rod', label: 'Cartridge rod 0.19 in 4130', tol: '—' },
    { id: 'clamp', kind: 'block', label: 'Clamp 6061-T6 on the rear pitch link', tol: '—' },
  ],
  checks: ['c27-trim'], rules: [{ id: 'side', label: 'Lever outboard of the roll tube (clear, in)', v: L.trimPiv[1] - 0.1 - (L.G1[1] + SZ.rollTube[0] / 2), min: 0.25 }],
  hardware: [{ std: 'AN3-7A', qty: 2, desc: 'Lever pivot, cartridge eye' }, { std: 'AN310-3', qty: 2, desc: 'Castle nuts' }, { std: 'MS24665-132', qty: 2, desc: 'Cotter pins' }, { std: 'AN3-5A', qty: 1, desc: 'Clamp bolt' }, { std: 'MS21042L3', qty: 1, desc: 'Nut' }],
  hardwareNote: 'AN3 pivot and cartridge eye with castle nuts and cotter pins; clamp bolt with MS21042L3.', na: metalNA, tolerances: TOL,
  material: { spec: 'AMS-QQ-A-250/11 6061-T6; WW-T-700/3 2024-T3 tube; music-wire spring', alt: '—', form: 'sheet, tube', density: null, allowables: [['6061-T6 F_ty', '35 ksi', MAT['6061'].spec]] },
  process: [{ op: 'Assemble', spec: 'Cartridge set neutral with the lever mid-slot.' }, { op: 'Flight test', spec: 'Trims Vx to Vne hands-off; lever holds against 3 lb.' }],
  interfaces: [{ id: 'I1', with: 'LEZ-27-111 rear link; right console (block B)', feature: 'clamp', what: 'Clamp on the link; slot in the console', check: () => ({ ok: L.trimClamp[0] > L.PA1[0] && L.trimClamp[0] < L.PA2[0], detail: `clamp ${pt(L.trimClamp)}; console slot 0.25 × 4.0 in at FS ${fx(L.trimPiv[0] - 2)}–${fx(L.trimPiv[0] + 2)}, BL ${fx(L.trimPiv[1])}` }) }],
  tooling: { needed: false, text: 'None.' },
  sourcing: { blank: '6061-T6 sheet 0.19 in; 2024-T3 tube 0.625 × 0.035, 6 in; spring', vendor: 'Aircraft Spruce', url: 'https://www.aircraftspruce.com/', cost: 35.0, costAsOf: '2026-11-18', perAircraft: 1, lead: 'Stock', note: 'Approximate.' },
});
