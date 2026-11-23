// LEZ-08-100 fixed nose ballast, LEZ-08-105 nose ballast bulkhead (its host), LEZ-08-110 removable ballast plates: the
// definition records (numbers from wpA5). All three are built by cad/blkA_bulkhead.py in the vertical plane of the
// bulkhead at FS 6.87 (u = BL, v = WL, w = FS − 6.87): the lead pieces are cut to the shell's inner contour at their
// narrow ends and split into ½ in layers so every line through them gets a short straight hole. Notional.
import { FIXED, BASE_MAT, MATSYS } from '../structures.js';
import { PROCESS } from '../plybook.js';
import { KEEPOUTS } from '../systems.js';
import { NB, NBG, BALLAST, LEAD, FB_CG, RP_CG, nbParams, nbMassOf, nbTape, fbParams, fbMassOf, rpParams, rpMassOf, fbLayers } from '../parts/wpA5_ballast.js';
import { pickAN } from '../parts/wp16_wing_attach.js';
import { flatVolumes, edgeOf, ligament, crossings, vertPlane, pip } from '../parts/wpA0_flat.js';
import { buy, plyAreas, PRICE } from './blkA_common.js';
import { LAM_ALLOW, LAM_SPEC, LAM_FORM, LAM_CURE, ppBuy, PP_VENDOR, PP_PRICE } from './p_common.js';

const fx = (x, n = 2) => x.toFixed(n), tB = BASE_MAT.BID.t, S = NB.s * 12;
const leadLen = () => -NBG.blockFwd + NB.steel + NB.t + NBG.slabL + NB.steel;   // front plate to aft plate
const boltAN = pickAN(NB.bolt.an, leadLen() + 2 * 0.063), lb = (m) => `${fx(m, 2)} lb`;
const ngBox = () => KEEPOUTS.find((k) => k.id === 'ko-ng-box'), door = () => KEEPOUTS.find((k) => k.id === 'ko-ng-door-drive-R');
const common = { status: 'released', rev: 'A', revDate: '2026-11-18' };
// ------------------------------------------------------------------------------------------- LEZ-08-105 bulkhead
const PB = nbParams(), VB = flatVolumes(PB), BB = buy({ BID: (plyAreas(PB, { BID: tB }).BID || 0) + nbTape().area * NB.tape.n });
export const NB_DEF = {
  pn: 'LEZ-08-105', rev: 'A', status: common.status, nha: 'LEZ-53-150', qty: 1, kind: 'laminate', title: 'Nose ballast bulkhead',
  solidText: 'CadQuery solid: the outline extruded layer by layer (core, hard points, faces), holes cut through', templates: 'One outline template with the bolt pattern',
  revs: [{ rev: 'A', date: common.revDate, short: 'Initial definition', change: `New part (coordinator M-17): the fixed ballast had no host ("through the nose bulkhead"; none existed) and its inserts were in mid-air. A ${fx(NB.t, 3)} in PVC sandwich at FS ${fx(S)}, just ahead of the nose-gear box, with solid-BID hard points where the side slabs bear; every ballast piece bears on it in a forward crash (ballast-bhd).` }],
  effectivity: 'One per aircraft', params: PB, holeNames: PB.holes.map((h, i) => (h.id === 'bolt' ? `ballast bolt AN${NB.bolt.an}` : ['pitot / static', 'forward harness'][i - 4] || 'pass')),
  datums: [{ id: 'A', what: `Forward face, FS ${fx(S - NB.t / 2, 3)}` }, { id: 'B', what: 'Centre line, BL 0' }, { id: 'C', what: `Floor of the ballast, WL ${NB.floor}` }],
  features: [
    { id: 'outline', kind: 'profile', label: `The shell's inner contour at FS ${fx(S)}, ${fx(2 * Math.max(...NBG.bh.map((q) => q[0])))} in wide`, tol: 'Contour ±1/32 in' },
    { id: 'face', kind: 'layup', label: `${NB.faceBID} × 6781 0/90 each face on ${NB.coreIn} in HT61`, tol: 'Wet-out' },
    { id: 'hp', kind: 'layup', label: `Solid 6781 hard points BL ±${NB.slabU[0] - 0.5}…${NB.slabU[1] + 0.5} above WL ${NB.floor - 0.5} (the slabs' footprints + ½ in)`, tol: 'Edges ±0.25 in' },
    { id: 'bolt', kind: 'hole', label: `4 × Ø ${fx(2 * PB.holes[0].r, 3)} ballast bolts at BL ±${NB.bolt.pts[0][0]}, WL ${NB.bolt.pts[0][1]} / ${NB.bolt.pts[2][1]}`, tol: 'Match-drilled with the lead', assy: true },
    { id: 'pass', kind: 'hole', label: 'Pass-through holes for the lines through FS 6.87 (pitot / static, forward harness)', tol: '±0.06 in' },
  ],
  tolerances: { general: '.X ±0.06 · .XX ±0.03 · contour ±1/32', flatness: 'Flat within 1/32 in', holes: 'Bolts match-drilled', breakEdges: 'Edges sealed with flox' },
  drawingNotes: ['Viewed from aft (BL + to the right).'], generalNote: 'Tap-tested.', na: {},
  material: { spec: '6781 S2-glass, MTM45-1 prepreg (NCAMP), Divinycell HT61 3/8 in', alt: 'None', form: `${LAM_FORM()}`, density: null, allowables: [...LAM_ALLOW(false)] },
  process: [{ op: 'Layup', spec: 'Flat: forward face, core with the hard-point 6781 packs, aft face; cure on the M cycle (250 ± 10 °F, 4–6 h, no post-cure); cut to the template.' }, { op: 'Install', spec: `At FS ${fx(S)} in the nose; flox fillets; ${NB.tape.n} × 6781 × ${2 * NB.tape.lap} in tapes both faces.` }, { op: 'Inspect', spec: 'Tap test; square to the centre line.' }],
  checks: ['ballast-bhd', 'ballast-slab'],
  rules: [{ id: 'edge', label: 'Every hole ≥ 0.25 in from the outline (in)', v: Math.min(...PB.holes.map((h) => edgeOf(h, [NBG.bh]))), min: 0.25 }, { id: 'lig', label: 'Ligament ≥ 0.25 in (in)', v: ligament(PB.holes), min: 0.25 }],
  mass: { each: nbMassOf({ ...VB }), from: 'layer volumes × density plus the tapes; checked against the solid' },
  hardware: [], hardwareNote: `None on the detail part: the ${boltAN.std} bolts are LEZ-08-100's.`,
  interfaces: [
    { id: 'I1', with: 'LEZ-53-150 fuselage shell', feature: 'outline', what: 'On the shell\'s inner contour', check: () => ({ ok: Math.abs(NB.tsh - (FIXED.fuselage.coreIn + 2 * FIXED.fuselage.faceBID * tB)) < 1e-9, detail: `offset ${fx(NB.tsh, 3)} in` }) },
    { id: 'I2', with: 'Nose-gear box keep-out ko-ng-box (block E)', feature: 'outline', what: 'Aft face ahead of the nose-gear box', check: () => { const k = ngBox(), f = (k.c[0] - k.d[0] / 2) * 12; return { ok: S + NB.t / 2 <= f, detail: `aft face FS ${fx(S + NB.t / 2)}, box from FS ${fx(f)}` }; } },
    { id: 'I3', with: 'Lines through FS 6.87', feature: 'pass', what: 'Every crossing has a hole', check: () => { const all = crossings(vertPlane(NB.s)).filter((c) => pip([c.u, c.v], NBG.bh)), miss = all.filter((c) => !PB.holes.some((h) => h.id === 'pass' && Math.hypot(h.u - c.u, h.v - c.v) + c.r <= h.r + 1e-3)); return { ok: !miss.length, detail: `${all.length} crossings` }; } },
  ],
  tooling: { needed: true, text: 'Outline template with the bolt pattern (shared with the lead castings).' },
  sourcing: { blank: `${BB.bid} yd 6781; 3/8 in HT61 offcut`, vendor: PP_VENDOR.vendor, url: PP_VENDOR.url, cost: +(BB.cost + 6).toFixed(2), costAsOf: '2026-11-18', perAircraft: 1, lead: 'Stock', note: 'Approximate; offcuts from the bulkhead sheets.' },
};
// ------------------------------------------------------------------------------------------- LEZ-08-100 fixed ballast
const PF = fbParams(), VF = flatVolumes(PF), steelV = fbLayers().filter((l) => l.mat === 'STEEL').reduce((a, l) => a + VF[l.name], 0), leadV = fbLayers().filter((l) => l.mat === 'LEAD').reduce((a, l) => a + VF[l.name], 0);
const castExpect = (p, m) => { const V = flatVolumes(p), mv = m.volumes || {}, sum = (f) => p.layers.filter(f).reduce((a, l) => a + (V[l.name] ?? 0), 0), msum = (f) => p.layers.filter(f).reduce((a, l) => a + (mv[l.name] ?? NaN), 0), want = (what, w, got, tol) => ({ what, want: w, got, tol, ok: Math.abs(w - got) <= tol });
  const all = Object.values(p.polys).flat(2), us = all.map((q) => q[0]), vs = all.map((q) => q[1]);
  return [want('Width, BL (in)', Math.max(...us) - Math.min(...us), m.bbox[1] - m.bbox[0], 0.002), want('Height, WL (in)', Math.max(...vs) - Math.min(...vs), m.bbox[5] - m.bbox[4], 0.002), want('Length, FS (in)', Math.max(...p.layers.map((l) => l.w1)) - Math.min(...p.layers.map((l) => l.w0)), m.bbox[3] - m.bbox[2], 0.002),
    want('Lead volume (in³)', sum((l) => l.mat === 'LEAD'), msum((l) => l.mat === 'LEAD'), Math.max(0.01, sum((l) => l.mat === 'LEAD') * 0.002)), want('Steel volume (in³)', sum((l) => l.mat === 'STEEL'), msum((l) => l.mat === 'STEEL'), 0.01), want('Holes', p.holes.length, (m.holes || []).length, 0)]; };
export const ballastExpect = castExpect;
export const FB_DEF = {
  pn: 'LEZ-08-100', rev: 'B', status: common.status, nha: 'LEZ-08-105', qty: 1, kind: 'machined', title: 'Fixed nose ballast (lead)',
  solidText: 'CadQuery solid: the forward block in ½ in steps cut to the nose contour, the side slabs, the 4130 plates; bolt, pin and pass holes', templates: 'Casting patterns: the step outlines and the slab outline',
  revs: [{ rev: 'A', date: '2026-11-17', short: 'System record', change: 'A 60 lb lead block bolted "through the nose bulkhead", drawn as a 44 in³ box (18 lb of lead).' },
    { rev: 'B', date: common.revDate, short: 'Defined; host bulkhead', change: `60 lb of lead is ${fx(BALLAST.fixed / LEAD, 0)} in³; the nose ahead of the nose-gear box holds about ${fx(NBG.Vb, 0)} in³ above WL ${NB.floor} (landing light and nose-gear parts below). As defined: a forward block cast to the nose contour (${lb(NBG.Vb * LEAD)} gross) and two side slabs aft of the new nose ballast bulkhead LEZ-08-105 (FS ${fx(S)}), clamped by 4 × ${boltAN.std} between ${NB.steel} in 4130 plates; lines through it get short straight holes. Centroid FS ${fx(FB_CG.s * 12)} (was 5.52). Check ballast-bolt; the bulkhead takes ballast-bhd.` }],
  effectivity: 'One per aircraft', params: PF, holeNames: PF.holes.map((h) => (h.id === 'bolt' ? `ballast bolt AN${NB.bolt.an}` : h.id === 'pin' ? 'ball-lock pin receptacle' : 'line hole')),
  datums: [{ id: 'A', what: `The bulkhead's forward face, FS ${fx(S - NB.t / 2, 3)}` }, { id: 'B', what: 'Centre line' }, { id: 'C', what: `Floor, WL ${NB.floor}` }],
  features: [
    { id: 'block', kind: 'casting', label: `Forward block: ${NBG.steps.length} steps of ${NB.step} in from FS ${fx(S - NB.t / 2)} to FS ${fx(S + NBG.blockFwd)}, each the shell's inner contour less ${NB.clr} in at its forward end, above WL ${NB.floor}`, tol: '±0.03 in' },
    { id: 'slab', kind: 'casting', label: `Side slabs: BL ±${NB.slabU[0]}…${NB.slabU[1]} above WL ${NB.floor}, ${fx(NBG.slabL, 3)} in long aft of the bulkhead`, tol: '±0.03 in' },
    { id: 'plate', kind: 'plate', label: `4130 N plates ${NB.steel} in, forward of the block and aft of the slabs`, tol: '±0.03 in' },
    { id: 'bolt', kind: 'hole', label: `4 bolt holes Ø ${fx(2 * PF.holes[0].r, 3)}`, tol: 'Drilled through the bulkhead template', assy: true },
  ],
  tolerances: { general: '.XX ±0.03', holes: 'Bolt holes through the template', breakEdges: 'Cast edges deburred; lead painted (sealed)' },
  drawingNotes: ['Lead castings sealed with epoxy primer (handling).', 'Weigh before installing: 60.0 ± 0.5 lb total.'], generalNote: 'Notional.', na: { cut: 'Cast parts', layup: 'Not a composite part' },
  material: { spec: 'Lead (soft, cast), 4130 N sheet (AMS 6350) plates', alt: 'Lead shot in epoxy (lower density: longer slabs)', form: 'Cast in a plaster or steel mould', density: LEAD, allowables: [['Lead density', `${LEAD} lb/in³`, 'Handbook value typed from memory'], ['4130 N F_ty', '75 ksi', 'MIL-HDBK-5']] },
  process: [{ op: 'Cast', spec: 'Cast the block and slabs to the patterns; drill the bolt and line holes; seal.' }, { op: 'Install', spec: `Block forward, slabs aft of LEZ-08-105, 4130 plates outside; 4 × ${boltAN.std} with MS21042L${NB.bolt.an} nuts and AN960 washers, torque 100–140 in-lb (AC 43.13-1B), safety-wired heads.` }, { op: 'Inspect', spec: 'Weigh; re-weigh the aircraft; amend the W&B.' }],
  checks: ['ballast-bolt'],
  rules: [{ id: 'mass', label: 'Lead + plates within 0.5 lb of the loading sweep\'s 60 lb (lb margin)', v: 0.5 - Math.abs(fbMassOf(VF) - BALLAST.fixed), min: 0 }, { id: 'fwd', label: 'Block forward end aft of the shell\'s start (FS 1.8) (in)', v: S + NBG.blockFwd - NB.steel - 1.8, min: 0.5 }],
  mass: { each: fbMassOf({ ...VF }), from: `lead ${fx(leadV, 1)} in³ × ${LEAD} + 4130 ${fx(steelV, 2)} in³ × 0.284; checked against the solid` },
  hardware: [{ std: boltAN.std, qty: 4, each: 0.06, desc: 'Ballast through-bolts' }, { std: `MS21042L${NB.bolt.an}`, qty: 4, each: 0.01, desc: 'Nuts' }, { std: `AN960-${NB.bolt.an}16`, qty: 8, each: 0.004, desc: 'Washers' }],
  hardwareNote: `4 × ${boltAN.std} (grip ${fx(boltAN.grip, 3)} in over a ${fx(leadLen(), 3)} in stack), MS21042L${NB.bolt.an} nuts, AN960 washers; torque 100–140 in-lb (AC 43.13-1B table 7-1).`,
  interfaces: [
    { id: 'I1', with: 'LEZ-08-105 nose ballast bulkhead', feature: 'bolt', what: 'Bolt pattern matches the bulkhead\'s', check: () => { const a = PF.holes.filter((h) => h.id === 'bolt'), b = PB.holes.filter((h) => h.id === 'bolt'); return { ok: a.length === 4 && a.every((h, i) => Math.hypot(h.u - b[i].u, h.v - b[i].v) < 1e-6), detail: '4 bolts on the same pattern' }; } },
    { id: 'I2', with: 'Nose-gear box (block E)', feature: 'slab', what: 'Slabs clear of the nose-gear box and the door drives', check: () => { const k = ngBox(), d = door(), boxHalf = k.d[1] / 2 * 12, dF = (d.c[0] - d.d[0] / 2) * 12, end = S + NBG.slab0 + NBG.slabL + NB.steel; return { ok: NB.slabU[0] >= boxHalf + 0.2 && end < dF, detail: `slabs from BL ±${NB.slabU[0]} (box ±${fx(boxHalf)}); slab plates end FS ${fx(end)}, door drive from FS ${fx(dF)}` }; } },
    { id: 'I3', with: 'W&B (wp5 loading sweep)', feature: 'block', what: 'Centroid used by the empty-weight CG', check: () => ({ ok: Math.abs(BALLAST.s - FB_CG.s) < 1e-9, detail: `FS ${fx(FB_CG.s * 12)}` }) },
  ],
  tooling: { needed: true, text: 'Casting patterns (step and slab outlines); the bulkhead drilling template.' },
  sourcing: { blank: `${fx(fbMassOf(VF) * 1.1, 0)} lb lead; 4130 N ${NB.steel} in sheet 6 × 6 in`, vendor: 'Rotometals (lead ingot) / Aircraft Spruce (4130 sheet, AN hardware)', url: 'https://www.aircraftspruce.com/menus/mp/steelsheet.html', cost: +(fbMassOf(VF) * 1.1 * PRICE.lead + 18).toFixed(2), costAsOf: '2026-11-18', perAircraft: 1, lead: 'Stock', note: 'Lead ≈ $4.50/lb, typed from memory.' },
};
// ------------------------------------------------------------------------------------------- LEZ-08-110 removable plates
const PR = rpParams(), VR = flatVolumes(PR);
export const RP_DEF = {
  pn: 'LEZ-08-110', rev: 'C', status: common.status, nha: 'LEZ-08-100', qty: 2, kind: 'machined', title: 'Removable ballast plate (lead, 10 lb)',
  solidText: 'CadQuery solid: both plates (one each side), cast to the slab section, with the pin and line holes', templates: 'The slab casting pattern',
  revs: [{ rev: 'A', date: '2026-11-17', short: 'System record', change: '2 × 10 lb plates "pinned to the fixed block", drawn as 5.4 in³ (2 lb of lead).' },
    { rev: 'B', date: common.revDate, short: 'Defined', change: `Cast to the side slabs' section, ${fx(NBG.plateL, 3)} in thick, one each side aft of the slab plates on two Ø 1/4 ball-lock pins; centroid FS ${fx(RP_CG.s * 12)} (was 3.6): the loading sweep now uses the plates' own arm.` },
    { rev: 'C', date: '2026-11-18', short: 'Pitot hole moved (block E)', change: 'The pitot-static line (LEZ-34-130) now turns outboard at FS 9 to pass outboard of the RH NG-30 plate (block E): its line hole in the right plate moves outboard with it. Mass and arm unchanged within the casting tolerance.' }],
  effectivity: 'Two per aircraft (left and right); both drawn', params: PR, holeNames: PR.holes.map((h) => (h.id === 'pin' ? 'ball-lock pin Ø 1/4' : 'line hole')),
  datums: [{ id: 'A', what: `Forward face on the slab plate, FS ${fx(S + NBG.p0, 3)}` }, { id: 'B', what: 'Centre line' }, { id: 'C', what: `Floor, WL ${NB.floor}` }],
  features: [{ id: 'plate', kind: 'casting', label: `BL ±${NB.slabU[0]}…${NB.slabU[1]} above WL ${NB.floor}, ${fx(NBG.plateL, 3)} in thick; 10 lb stamped`, tol: '±0.03 in' }, { id: 'pin', kind: 'hole', label: 'Ball-lock pin hole Ø 0.256 at BL ±2.9, WL 35.3', tol: 'Through the slab plate template' }],
  tolerances: { general: '.XX ±0.03', holes: 'Through the template', breakEdges: 'Deburred; sealed' }, drawingNotes: ['Stamp weight and P/N on the aft face.'], generalNote: 'Notional.', na: { cut: 'Cast part', layup: 'Not a composite part' },
  material: { spec: 'Lead (soft, cast)', alt: 'None', form: 'Cast', density: LEAD, allowables: [['Lead density', `${LEAD} lb/in³`, 'Handbook value typed from memory']] },
  process: [{ op: 'Cast', spec: `Cast to the slab pattern; drill; seal; weigh ${BALLAST.plate.toFixed(1)} ± 0.2 lb.` }, { op: 'Install', spec: 'On the slab plate; two ball-lock pins; per the front-seat placard.' }],
  checks: ['ballast-pin'],
  rules: [{ id: 'mass', label: 'Each plate within 0.2 lb of 10 lb (lb margin)', v: 0.2 - Math.abs(rpMassOf(VR) - BALLAST.plate), min: 0 }],
  mass: { each: rpMassOf({ ...VR }), from: 'lead volume (both plates) × density / 2; checked against the solid' },
  hardware: [{ std: 'Ball-lock pin Ø 1/4, 17-4 PH, with lanyard', qty: 2, each: 0.03, desc: 'Retaining pins (vendor P/N to be chosen; rating BOUND in ballast-pin)' }], hardwareNote: 'Two Ø 1/4 ball-lock pins per plate with lanyards; the receptacles are the holes in the slab plate.',
  interfaces: [{ id: 'I1', with: 'LEZ-08-100 slab plates', feature: 'pin', what: 'Pin holes on the slab plate\'s', check: () => { const a = PR.holes.filter((h) => h.id === 'pin'), b = PF.holes.filter((h) => h.id === 'pin'); return { ok: a.length === 2 && a.every((h, i) => Math.hypot(h.u - b[i].u, h.v - b[i].v) < 1e-6), detail: '2 pins each side' }; } },
    { id: 'I2', with: 'W&B placard', feature: 'plate', what: 'Arm used by the loading sweep', check: () => ({ ok: Math.abs(BALLAST.sPlate - RP_CG.s) < 1e-9, detail: `FS ${fx(RP_CG.s * 12)}` }) }],
  tooling: { needed: true, text: 'The slab casting pattern and drill template.' },
  sourcing: { blank: '22 lb lead', vendor: 'Rotometals (lead ingot)', url: 'https://www.rotometals.com/', cost: +(22 * PRICE.lead / 2 + 25).toFixed(2), costAsOf: '2026-11-18', perAircraft: 2, lead: 'Stock', note: 'Lead ≈ $4.50/lb and ball-lock pins ≈ $12 each, typed from memory.' },
};
