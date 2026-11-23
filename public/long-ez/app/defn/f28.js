// LEZ-53-165 bulkhead F28: the definition record (numbers from wpA1). A flat PVC sandwich at FS 28 cut to the fuselage's
// inner contour, its top edge under the canard, notched for the strut channel, a hole for the pitch rod, with the
// canard's torque-pin hard points and a hole for every line through FS 28. Solid: cad/blkA_bulkhead.py. Inches; frame
// u = BL, v = WL, w = FS − 28. Notional.
import { GEO, FIXED, BASE_MAT, MATSYS, DEFAULT_DESIGN, analyse } from '../structures.js';
import { PROCESS } from '../plybook.js';
import { KEEPOUTS, partByPN } from '../systems.js';
import { PITCH_HOLE, WORM, FAIRLEAD, F28, F28G, F28HP, f28Params, f28Layers, f28MassOf, f28Tape, zCanardLo, RHO } from '../parts/wpA1_f28.js';
import { CNA } from '../parts/wp24_canard.js';
import { CN_PIN } from './canard.js';
import { WELL } from '../parts/wp11_nose_gear.js';
import { fitAN } from '../parts/wp16_wing_attach.js';
import { flatVolumes, edgeOf, ligament, crossings, vertPlane, pip } from '../parts/wpA0_flat.js';
import { flatExpect, buy, plyAreas, PRICE } from './blkA_common.js';
import { LAM_ALLOW, LAM_SPEC, LAM_FORM, LAM_CURE, ppBuy, PP_VENDOR, PP_PRICE } from './p_common.js';

const fx = (x, n = 2) => x.toFixed(n), G = F28G, CG = GEO.canard, tB = BASE_MAT.BID.t;
export const f28ParamsNow = () => f28Params();
export const f28Expect = flatExpect;
const P = f28Params(), V = flatVolumes(P), pass = G.pass, tPin = F28.t + F28.hpBID * tB, pinAN = fitAN(CNA.pin, CNA.nP * tB + tPin), pinStack = pinAN.stack;   // 2026-11-19: corrected AN grip terms; washers ≤ 1/8 in (wp16 fitAN)
const B = buy({ ...plyAreas(P, { BID: tB }), BID: (plyAreas(P, { BID: tB }).BID || 0) + f28Tape().area * F28.tape.n });
export const F28_DEF = {
  pn: 'LEZ-53-165', rev: 'D', status: 'released', nha: 'LEZ-53-150', qty: 1, kind: 'laminate',
  title: 'Bulkhead F28 (canard aft bulkhead)',
  solidText: 'CadQuery solid: the outline extruded layer by layer through the thickness (core, flox inserts, faces, hard points), holes cut through',
  templates: 'One full-size outline template with the hole positions; the pin drill guide (from the canard tab)',
  revs: [{ rev: 'A', date: '2026-11-18', short: 'Initial definition', change: `Initial definition. F28 existed only as a station (GEO.F28) and a jig position; the canard's F28 tabs and AN${CNA.pin} pins had no hole height and no bearing check on the F28 side. As defined: the shell's inner contour at FS 28 cut ${F28.gap} in under the canard, the strut-channel notch, a slot 1.38 in wide from WL 37.75 for the pitch bellcrank arm and rod end (block C), the pins at WL ${fx(G.pins[0].v)} (${F28.pinDown} in under the canard, mid-leg of the tab), ${F28.hpBID} BID hard points and flox inserts, ${pass.length} pass-through holes from the routed lines; checks f28-pin, f28-shear, f28-tape.` },
    { rev: 'B', date: '2026-11-18', short: 'Pitch-rod hole', change: `Integration with block C (ICD phase 2): C moved the pitch bellcrank to BL ±9 forward of F28 and runs the pitch rod LEZ-27-120 through F28 at BL ${fx(crossings(vertPlane(F28.s)).find((q) => q.pn === PITCH_HOLE.pn)?.u ?? 0)}; the rev A top slot at BL 2.5–3.9 is gone and the rod gets C's Ø ${PITCH_HOLE.d} in clearance (an edge slot where it comes within 1/4 in of the outline). The pitot / static and coax lines now have their own holes. Block A's flat parts load after blocks B, C, D and G.` },
    { rev: 'C', date: '2026-11-18', short: 'Block E items', change: 'Integration with block E (ICD phase 2): #6 screw holes for the two nylon door-cable fairleads bonded on the aft face (LEZ-32-232), and the worm drive shaft LEZ-32-211 in a grommet hole. Holes are generated from the live routes once all parts have loaded.' }, { rev: 'D', date: '2026-11-19', short: 'Fairlead seats; worm grommet', change: 'Final integration (block E open items LEZ-32-232 O2, LEZ-32-211 O1): the door-cable holes become Ø 0.50 seats for the nylon fairleads, which stood 0.15 in into the aft face over Ø 0.25 clearance holes; their #6 screws move to 0.6 in outboard of the cable (ligament). The worm-shaft hole keeps its Ø 0.625 grommet seat (0.156 in radial over the shaft, ≥ 1/8 in). Holes generated from the routes as before.' }],
  effectivity: 'One per aircraft', params: P, holeNames: G.holes.map((h) => (h.id === 'pin' ? `CANARD TORQUE PIN AN${CNA.pin}` : h.what)),
  datums: [{ id: 'A', what: `Forward face of the core, FS ${fx(F28.s * 12 - F28.coreIn / 2, 3)}` }, { id: 'B', what: 'Centre line, BL 0' }, { id: 'C', what: `Top edge, WL ${fx(G.zTop)} (under the canard)` }],
  features: [
    { id: 'outline', kind: 'profile', label: `The shell's inner contour at FS 28 (OML less ${fx(F28.tsh, 3)} in), ${fx(2 * G.wIn)} in wide; top cut level at WL ${fx(G.zTop)}, ${F28.gap} in under the canard's lower surface; strut notch ${fx(2 * G.halfW)} in wide to WL ${fx(G.chanTop)}${G.slots.length ? `; edge slots for ${G.slots.map((q) => q.what).join(', ')}` : ''}`, tol: 'Contour ±1/32 in to the template' },
    { id: 'face', kind: 'layup', label: `${F28.faceBID} × 6781 ±45 each face on ${F28.coreIn} in Divinycell HT61; ${fx(G.A, 0)} in² gross`, tol: 'Debulked; no bridging or porosity' },
    { id: 'hp', kind: 'layup', label: `Hard points at BL ±${fx(CG.attachY * 12, 1)} on the aft face: ${F28.hpBID} × 6781 ${F28.hp.w} × ${F28.hp.h} in down from C`, tol: 'Edges ±0.25 in' },
    { id: 'pin', kind: 'hole', label: `Torque pins 2 × Ø ${fx(2 * G.pins[0].r, 3)} at BL ±${fx(CG.attachY * 12, 1)}, WL ${fx(G.pins[0].v)}, in ${F28.insert} in square flox inserts through the core`, tol: 'Drilled through the canard tab with the guide', assy: true },
    { id: 'pass', kind: 'hole', label: `${pass.length} pass-through holes (hole table), flox-sealed, grommets where a line chafes; the pitch rod in a Ø ${fx(PITCH_HOLE.d, 3)} clearance hole (block C)`, tol: '±0.06 in position' },
  ],
  tolerances: { general: '.X ±0.06 · .XX ±0.03 · contour ±1/32', flatness: 'Flat within 1/16 in across the panel', holes: 'Pass-throughs ±0.06 in; pins through the guide', breakEdges: 'All cut edges, the slot and the holes sealed with flox or resin' },
  drawingNotes: ['Flat panel; viewed from aft (BL + to the right).', 'Slot and notch edges radiused 1/8 in, sealed.'], generalNote: 'Cured laminate tap-tested; every hole edge sealed.', na: {},
  material: { spec: '6781 S2-glass, MTM45-1 prepreg (NCAMP), Divinycell HT61 3/8 in sheet, flox inserts', alt: 'None', form: `${LAM_FORM()}, flat on the table`, density: null,
    allowables: [...LAM_ALLOW(false), ['Flox density', `${RHO.FLOX} lb/in³`, 'Typed from memory (mass only)']] },
  process: [
    { op: 'Layup', spec: 'Flat on the table: forward face on the HT61 sheet; cut the insert pockets and pot flox; aft face and the hard points. Bag and cure on the NCAMP M cycle (250 ± 10 °F, 4–6 h, ≥ 28 inHg; no post-cure), the part whole in the oven; witness coupon.' },
    { op: 'Cut', spec: 'To the template: outline, notch and holes; seal every edge.' },
    { op: 'Install', spec: `In the fuselage jig at FS 28, square to the centre line; flox fillets; ${F28.tape.n} × 6781 × ${2 * F28.tape.lap} in tapes both faces all round. Drill the pins through the canard tabs when the canard is fitted.` },
    { op: 'Inspect', spec: 'Tap test; top edge to the canard template; hole positions.' },
  ],
  checks: ['f28-pin', 'f28-shear', 'f28-tape', 'f28-slab'],
  rules: [{ id: 'edge', label: 'Every hole ≥ 0.25 in from the outline (in)', v: Math.min(...G.holes.map((h) => edgeOf(h, [G.pts]))), min: 0.25 }, { id: 'lig', label: 'Ligament between holes ≥ 0.25 in (in)', v: ligament(G.holes), min: 0.25 },
    { id: 'eD', label: 'Pin e/D to the top edge ≥ 2', v: (G.zTop - G.pins[0].v) / (CNA.pin / 16), min: 2 }, { id: 'grip', label: `F28 at the pin within the AN${CNA.pin}-10A grip (0.487 in max) (in)`, v: 0.487 - tPin, min: 0 }],
  mass: { each: f28MassOf({ ...V }), from: 'layer volumes × density (HT61, 6781, flox) plus the installation tapes; checked against the solid' },
  hardware: [], hardwareNote: `None on the detail part: the ${pinAN.std} torque pins (grip ${fx(pinAN.grip, 3)} in over a ${fx(pinStack, 3)} in stack: tab, F28 hard point, washers), nuts and washers are hardware on the canard (LEZ-55-120).`,
  interfaces: [
    { id: 'I1', with: 'LEZ-55-120 canard', feature: 'outline', what: 'Top edge under the canard\'s lower surface with a flox gap', check: () => { const z = Math.min(zCanardLo(F28.s * 12 - F28.env), zCanardLo(F28.s * 12), zCanardLo(F28.s * 12 + F28.env)); return { ok: Math.abs(z - G.zTop - F28.gap) < 1e-6, detail: `canard ${fx(z, 3)} in, top edge ${fx(G.zTop, 3)} in` }; } },
    { id: 'I2', with: 'LEZ-55-120 canard F28 tabs and pins', feature: 'pin', what: `Pin at BL ±attachY, ${F28.pinDown} in under the canard, inside the 1.5 in tab leg; the canard's ${pinAN.std} grip covers the stack`, check: () => { const ok = G.pins.every((h) => Math.abs(Math.abs(h.u) - CG.attachY * 12) < 1e-6 && h.v > zCanardLo(F28.s * 12) - 1.5 + 2 * CNA.pin / 16) && pinAN.std === CN_PIN().std && pinAN.over <= 1 / 16 + 1e-9; return { ok, detail: `pins BL ±${fx(CG.attachY * 12, 1)} WL ${fx(G.pins[0].v)}; stack ${fx(pinStack, 3)} in, ${pinAN.std} grip ${fx(pinAN.grip, 3)} in` }; } },
    { id: 'I3', with: 'LEZ-32-220 strut channel (block E)', feature: 'outline', what: 'Notch clears the channel and its keep-out', check: () => { const k = KEEPOUTS.find((q) => q.id === 'ko-ng-chan'), kw = k ? k.d[1] / 2 * 12 : 0, kt = k ? (k.c[2] + k.d[2] / 2) * 12 : 0; return { ok: G.halfW > WELL.chan.halfW * 12 && G.chanTop > WELL.chan.top * 12, detail: `notch ±${fx(G.halfW)} to WL ${fx(G.chanTop)}; channel ±${fx(WELL.chan.halfW * 12)} to WL ${fx(WELL.chan.top * 12)} (keep-out ±${fx(kw)} to ${fx(kt)}: E to trim it to the channel)` }; } },
    { id: 'I4', with: 'LEZ-53-150 fuselage shell', feature: 'outline', what: 'Outline is the shell\'s inner contour', check: () => { const t = FIXED.fuselage.coreIn + 2 * FIXED.fuselage.faceBID * tB; return { ok: Math.abs(t - F28.tsh) < 1e-9, detail: `shell ${fx(t, 3)} in, F28 offset ${fx(F28.tsh, 3)} in; half-width ${fx(G.wIn, 3)} in` }; } },
    { id: 'I5', with: 'Lines routed through FS 28', feature: 'pass', what: 'Every crossing has a hole or an edge slot, or runs through the notch', check: () => { const all = crossings(vertPlane(F28.s)), inS = (c) => G.slots.some((q) => c.u > q.R[0] && c.u < q.R[1] && c.v > q.R[2] && c.v < q.R[3]), miss = all.filter((c) => pip([c.u, c.v], G.pts) && !inS(c) && !pass.some((h) => Math.hypot(h.u - c.u, h.v - c.v) + Math.min(c.r, h.r) <= h.r + 1e-3)); return { ok: !miss.length, detail: `${all.length} crossings: ${pass.length} holes, ${G.slots.length} edge slots${miss.length ? `; missing ${miss.map((m) => m.pn).join(', ')}` : ''}` }; } },
    { id: 'I7', with: 'LEZ-32-232 door-cable fairleads and LEZ-32-211 worm shaft (block E, merged)', feature: 'pass', what: 'A #6 screw hole beside each fairlead bonded on the aft face; the worm shaft in a grommet hole', check: () => {
      const fls = (partByPN('LEZ-32-232')?.geo || []).filter((g) => g.t === 'sphere' && Math.abs(g.c[0] * 12 - (F28.s * 12 + F28.t / 2)) < 0.5), okF = fls.length === 2 && fls.every((g) => G.fl.some((h) => Math.hypot(h.u - g.c[1] * 12, h.v - g.c[2] * 12) <= FAIRLEAD.off + 0.01));
      const w = crossings(vertPlane(F28.s)).find((c) => c.pn === WORM.pn), wh = w && pass.find((h) => Math.hypot(h.u - w.u, h.v - w.v) <= h.r), okW = !!wh && wh.r >= (w.r - 1 / 16) + WORM.grommet - 1e-6;
      return { ok: okF && okW, detail: `${G.fl.length} #6 fairlead screw holes at ${G.fl.map((h) => `BL ${fx(h.u)} WL ${fx(h.v)}`).join(', ')}; worm shaft in a Ø ${wh ? fx(2 * wh.r, 3) : '—'} grommet hole` }; } },
    { id: 'I6', with: 'LEZ-27-120 pitch rod and LEZ-27-130 bellcrank (block C, merged)', feature: 'pass', what: 'The pitch rod passes in a hole at least block C\'s Ø 1.375 in; the bellcrank and torque tube stay ≥ 1/8 in forward of F28', check: () => {
      const c = crossings(vertPlane(F28.s)).find((q) => q.pn === PITCH_HOLE.pn), h = c && (pass.find((q) => Math.hypot(q.u - c.u, q.v - c.v) <= q.r) || G.slots.filter((q) => c.u > q.R[0] && c.u < q.R[1] && c.v > q.R[2] && c.v < q.R[3]).map((q) => ({ r: Math.min(q.R[1] - q.R[0], q.R[3] - q.R[2]) / 2, slot: true }))[0]);
      const fwd = F28.s * 12 - F28.t / 2, bc = partByPN('LEZ-27-130'), aft = Math.max(...(bc?.geo || []).map((g) => (g.c ? (g.c[0] + g.d[0] / 2) * 12 : Math.max(g.a[0], g.b[0]) * 12 + (g.r || 0) * 12)));
      return { ok: !!c && !!h && 2 * h.r >= PITCH_HOLE.d - 1e-6 && fwd - aft >= 0.125, detail: c ? `rod at BL ${fx(c.u)} WL ${fx(c.v)} in a Ø ${h ? fx(2 * h.r, 3) : '—'} ${h?.slot ? 'edge slot' : 'hole'} (C asks ${PITCH_HOLE.d}); bellcrank / tube aft end FS ${fx(aft)}, F28 forward face FS ${fx(fwd)}` : 'no pitch-rod crossing' }; } },
  ],
  tooling: { needed: true, text: 'Full-size outline template with the hole centres and the slot; the pin drill guide; fuselage jig station at FS 28.' },
  sourcing: { blank: `${B.bid} yd 6781 (50 in, +15 %); 1 sheet 3/8 in HT61; flox`, vendor: PP_VENDOR.vendor, url: PP_VENDOR.url,
    cost: +(B.cost + PRICE.H45sheet38 + PRICE.flox / 4).toFixed(2), costAsOf: '2026-11-18', perAircraft: 1, lead: 'Stock items', note: 'Prices approximate, prepreg / HT proxies (p_common PP_PRICE, BOUND); prepreg and HT61 by quote (proxy prices, p_common PP_PRICE, BOUND).' },
};
void F28HP; void f28Layers; void DEFAULT_DESIGN; void analyse;
