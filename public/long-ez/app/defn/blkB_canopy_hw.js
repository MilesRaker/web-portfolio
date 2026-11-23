// LEZ-56-110 canopy hinge, LEZ-56-120 gas strut, LEZ-56-130 check cable: definition records (numbers from wpB1 / wpB2).
// Bought-in parts with their mounting features; solids of the vendor envelopes (cad/blkB_prims.py). Notional.
import { partByPN } from '../systems.js';
import { HINGE, STRUT, canopyStrut } from '../parts/wp4_avionics_cabin.js';
import { HFIX, LDES } from '../parts/wp14_canopy_latch.js';
import { hingeAt, bandAt, canSection, ohwIn, CABLE, CANF } from '../parts/wpB1_canopy.js';
import { canopySill } from '../parts/canopy_layout.js';
import { HG, hingeParams, HINGE_MASS, GS, strutGeo, strutParams, STRUT_MASS, CC, cableParams, CABLE_MASS } from '../parts/wpB2_canopy_hw.js';
import { RHO } from './blkB_prims.js';
import { fx, TODAY, primsEntry } from './blkB_common.js';

const rev0 = (change) => [{ rev: 'A', date: TODAY, short: 'Initial definition', change }];
const span = () => (HINGE[1][0] - HINGE[0][0]) * 12;
/** the right rail's edge (outer corner and inner end) swung 0–80° about the pin: no point enters the shell (outboard of
 *  the cut plane and below the outer sill); returns the worst intrusion (in, ≤ 0 is clear) */
export function swingIntrusion() {
  let worst = -Infinity;
  for (let fs = HINGE[0][0] * 12; fs <= HINGE[1][0] * 12 + 1e-9; fs += 4) {
    const s = fs / 12, R = canSection(s, false), h = hingeAt(s).map((v, i) => (i ? v * 12 : v)), sill = canopySill(s, 1)[2] * 12, ohw = ohwIn(s);
    for (const q of [R.fo_r[0], R.fi_r[R.fi_r.length - 1], R.core_r[R.core_r.length - 1]]) for (let d = 0; d <= 80; d += 2) {
      const th = d * Math.PI / 180, yr = q[0] - h[1], zr = q[1] - h[2], y = h[1] + yr * Math.cos(th) + zr * Math.sin(th), z = h[2] - yr * Math.sin(th) + zr * Math.cos(th);
      if (z < sill - 1e-6) worst = Math.max(worst, y - ohw);
    }
  }
  return worst;
}
const leafScrewZ = () => hingeAt((HINGE[0][0] + HINGE[1][0]) / 2)[2] * 12 - HG.od / 2 - HG.depth / 2;

export const HNG_DEF = {
  pn: 'LEZ-56-110', rev: 'A', status: 'released', nha: 'LEZ-56-100', qty: 1, kind: 'cots',
  title: 'Canopy hinge (piano hinge, right sill)',
  revs: rev0(`Initial definition. The hinge was a full-length chord 0.5 in inside the skin while the sill rises 2.4 in between its ends, so it could not sit on the sill and the frame edge would have dug into the shell's cut when opening. As defined it is ${fx(span(), 1)} in long over FS ${fx(HINGE[0][0] * 12, 1)}–${fx(HINGE[1][0] * 12, 1)}, where the sill is straight within 1/16 in, with the pin on the outer sill corner: every point of the frame edge swings inboard.`),
  effectivity: 'One per aircraft', params: hingeParams(),
  datums: [{ id: 'A', what: 'Pin axis on the outer right sill corner' }, { id: 'B', what: `Forward end, FS ${fx(HINGE[0][0] * 12, 1)}` }],
  features: [
    { id: 'pin', kind: 'profile', label: `Pin Ø ${HG.pin} in, knuckle OD ${HG.od} in, ${fx(span(), 2)} in long on the outer sill corner (knuckle ${fx(HG.od / 2, 3)} in proud, faired with a rub strip)`, tol: 'Pin line straight within 1/32 in' },
    { id: 'leaf', kind: 'profile', label: `Leaves ${HG.leaf} in 2024-T3 × ${HG.depth} in deep, hanging down in the joint, each in a 0.045 in relief of its edge face; frame leaf riveted MS20470AD4 at ${HFIX.rivetP} in, sill leaf AN525-832 at ${HFIX.screwP} in into nutplates potted in the longeron band`, tol: 'Holes ±0.03 in' },
  ],
  tolerances: { general: '.XX ±0.03', breakEdges: 'Cut ends deburred and alodined' },
  drawingNotes: ['Cut from MS20001 stock; the pin staked at both ends.', 'Fit with the canopy closed on the seal, pin line on a straight-edge along the sill land.'], generalNote: 'Bought-in: vendor dimensions typed from memory (MS20001 pin and knuckle sizes).',
  na: { cut: 'Bought-in, cut to length', layup: 'Metal part' },
  material: { spec: 'MS20001 continuous hinge, 2024-T3 leaves, steel pin', alt: 'AN257 hinge of the same gauge', form: 'Bought hinge stock cut to length', density: null,
    allowables: [['2024-T3 bearing (e/D 1.5)', '104 ksi', 'MIL-HDBK-5H CN1 table 3.2.3.0(b1), 2024-T3 sheet 0.010–0.128 in, A-basis (METU AE462 copy, accessed 2026-11-19); the knuckles have short edge distance, so the e/D 1.5 column'], ['MS20470AD4 single shear', `${HFIX.rivetSs} lb`, 'AC 43.13-1B ch. 4 table 4-8, 2117-T (AD) 30 ksi on the 1/8 in shank (RAANZ mirror, accessed 2026-11-19)']] },
  process: [{ op: 'Install', spec: `Rivet the frame leaf to the rail edge (flox hard edge) at ${HFIX.rivetP} in; screw the sill leaf into the potted nutplates at ${HFIX.screwP} in; stake the pin.` }, { op: 'Inspect', spec: 'Canopy swings 0–80° without binding; edge clears the shell all the way; seal compressed evenly when closed.' }],
  checks: ['cab-canopy-hinge'],
  rules: [{ id: 'proud', label: 'Knuckle proud of the OML ≤ 0.1 in (0.1 − proud ≥ 0)', v: 0.1 - HG.od / 2, min: 0 }],
  mass: { each: HINGE_MASS, from: 'solid volumes: pin × 0.283, knuckle and leaves × 0.100 lb/in³' },
  hardware: [], hardwareNote: `${Math.floor(span() / HFIX.rivetP) + 1} × MS20470AD4 rivets (frame leaf); ${Math.floor(span() / HFIX.screwP) + 1} × AN525-832 screws into MS21047 nutplates potted in the right longeron band.`,
  interfaces: [
    { id: 'I1', with: 'LEZ-56-100 canopy (right rail edge)', feature: 'pin', what: 'The rail edge swings clear of the shell\'s cut through 0–80°', check: () => { const w = swingIntrusion(); return { ok: w <= 1e-6, detail: `worst ${fx(w, 3)} in (≤ 0 clear)` }; } },
    { id: 'I2', with: 'LEZ-53-150 shell (longeron band)', feature: 'leaf', what: 'Sill-leaf screws in the longeron band (inner sill to 1.75 in down the arc)', check: () => { const z = leafScrewZ(), b = bandAt((HINGE[0][0] + HINGE[1][0]) / 2), sill = canopySill((HINGE[0][0] + HINGE[1][0]) / 2, 1)[2] * 12; return { ok: z < sill && z > b.low, detail: `screws WL ${fx(z)}; band WL ${fx(b.low)}–${fx(sill)}` }; } },
    { id: 'I3', with: 'LEZ-56-120 strut', feature: 'pin', what: 'Strut station inside the hinge span', check: () => ({ ok: STRUT.s > HINGE[0][0] && STRUT.s < HINGE[1][0], detail: `strut FS ${fx(STRUT.s * 12, 1)}, hinge FS ${fx(HINGE[0][0] * 12, 1)}–${fx(HINGE[1][0] * 12, 1)}` }) },
  ],
  tooling: { needed: false, text: 'None: fitted with the canopy closed, pin line to a straight-edge.' },
  sourcing: { blank: `MS20001 hinge, 0.040 × 1.5 in open, ${Math.ceil(span() / 12)} ft`, vendor: 'Aircraft Spruce (MS20001 piano hinge)', url: 'https://www.aircraftspruce.com/catalog/hapages/ms20001.php', cost: 4.5 * Math.ceil(span() / 12), costAsOf: TODAY, perAircraft: 1, lead: 'Stock', note: 'Price per foot ≈ $4.50 typed from memory, not quoted.' },
};

const SC = () => canopyStrut();
export const STR_DEF = {
  pn: 'LEZ-56-120', rev: 'A', status: 'released', nha: 'LEZ-56-100', qty: 1, kind: 'cots',
  title: 'Canopy gas strut and brackets (right side)',
  revs: rev0(`Initial definition. The strut's fixed end stood 2.8 in off the wall inside the right armrest and was placed from the hinge's forward end, with an assumed canopy weight. As defined it sits at FS ${fx(STRUT.s * 12, 1)} (aft of the armrest), its fixed stud on a wall bracket screwed into the longeron band, its moving stud on an arm bonded to the right rail; the force comes from the check on the defined canopy mass.`),
  effectivity: 'One per aircraft', params: strutParams(),
  datums: [{ id: 'A', what: 'Fixed ball-stud centre' }, { id: 'B', what: 'Strut axis' }],
  features: [
    { id: 'strut', kind: 'profile', label: `Gas spring ${GS.comp} in compressed / ${GS.ext} in extended, ${GS.body} in body, ${GS.rod} in rod, 10 mm ball sockets; force ${SC().F} lb nominal (cab-canopy-strut)`, tol: 'Force ±10 %' },
    { id: 'bracket', kind: 'profile', label: 'Wall bracket 0.09 × 1.5 in 6061, bonded, 2 × #10 screws into potted nutplates in the band; moving arm 0.19 × 0.75 in 6061 bonded and screwed to the right rail', tol: 'Stud centres ±0.06 in' },
  ],
  tolerances: { general: '.XX ±0.03 · .X ±0.06', breakEdges: '0.01–0.03' },
  drawingNotes: ['Shown closed. Rod end up (the canopy arm).'], generalNote: 'Bought-in gas spring; brackets machined.',
  na: { cut: 'Brackets cut from sheet: no flat pattern', layup: 'Not a composite part' },
  material: { spec: 'Gas spring (vendor); 6061-T6 brackets', alt: 'Equivalent gas spring with ball-socket ends', form: 'Bought; sheet and bar', density: null, allowables: [['End-stop rating', `≥ ${GS.rating} lb tension`, 'vendor (typed from memory)']] },
  process: [{ op: 'Install', spec: 'Bond the wall bracket on the right wall and screw it into the band; bond and screw the arm to the rail; snap the sockets on with the canopy at 80° open.' }, { op: 'Inspect', spec: 'Unlatched canopy stays down; opens with ≤ 15 lb at the left rail; holds at 80°.' }],
  checks: ['cab-canopy-strut'],
  rules: [{ id: 'comp', label: 'Compressed length ≤ the closed stud spacing (in)', v: SC().L0 * 12 - GS.comp, min: 0 }, { id: 'ext', label: 'Extended length ≥ the stud spacing at 80° (in)', v: GS.ext - SC().L1 * 12, min: 0 }],
  mass: { each: STRUT_MASS, from: 'solid volumes: steel × 0.283, 6061 × 0.098 lb/in³' },
  hardware: [], hardwareNote: '2 × #10-32 flush screws (wall bracket) into potted MS21047 nutplates in the band; 2 × #10-32 (arm to rail) into flox inserts; 10 mm ball studs supplied with the spring.',
  interfaces: [
    { id: 'I1', with: 'LEZ-53-150 shell (longeron band)', feature: 'bracket', what: 'Wall bracket screws in the band', check: () => { const g = strutGeo(); return { ok: g.b.top - g.b.low > 0.6, detail: `band WL ${fx(g.b.low)}–${fx(g.b.top)} at FS ${fx(STRUT.s * 12, 1)}; screws at mid-band` }; } },
    { id: 'I2', with: 'LEZ-25-110 right armrest', feature: 'strut', what: 'Strut aft of the right armrest', check: () => { const a = partByPN('LEZ-25-110'), e = Math.max(...(a?.geo || []).filter((g) => g.c && g.c[1] > 0).map((g) => g.c[0] + g.d[0] / 2)); return { ok: STRUT.s * 12 - GS.body > e * 12, detail: `armrest ends FS ${fx(e * 12, 1)}, strut FS ${fx(STRUT.s * 12, 1)}` }; } },
    { id: 'I3', with: 'LEZ-56-130 check cable', feature: 'strut', what: 'The cable is the stop: the spring is not at full extension at 80°', check: () => ({ ok: GS.ext > SC().L1 * 12, detail: `spacing at 80° ${fx(SC().L1 * 12)} in, spring extends to ${GS.ext} in` }) },
  ],
  tooling: { needed: false, text: 'None: brackets set with the canopy held at 80°.' },
  sourcing: { blank: 'Gas spring with 10 mm ball sockets; 6061 sheet 0.09 and bar 0.19 × 0.75 in', vendor: GS.vendor, url: 'https://www.mcmaster.com/gas-springs/', cost: 35, costAsOf: TODAY, perAircraft: 1, lead: 'Stock', note: 'Price ≈ $35 typed from memory.' },
};

export const CBL_DEF = {
  pn: 'LEZ-56-130', rev: 'A', status: 'released', nha: 'LEZ-56-100', qty: 1, kind: 'install',
  title: 'Canopy check cable (open stop)',
  revs: rev0(`Initial definition. The cable ran on the right side 0.9 ft from the hinge; at 80° its line passes close to the pin and it could not stop the canopy. As defined it runs from the aft bow's left corner (the free side) to a tab in the left longeron band at FS ${fx(CABLE.s * 12, 1)}: ${fx(CABLE.L, 1)} in long, ${fx(CABLE.lever, 1)} in from the hinge at 80°; a 40 kt ground gust is a placard limit.`),
  effectivity: 'One per aircraft', params: cableParams(),
  datums: [{ id: 'A', what: 'Wall-tab thimble centre' }],
  features: [
    { id: 'cable', kind: 'profile', label: `1/16 in 7×19 CRES, ${fx(CABLE.L, 2)} in between thimble centres (taut at 80° open), folded along the aft bow under a bungee when closed`, tol: '±1/8 in, set at 80°' },
    { id: 'tab', kind: 'profile', label: '6061 tab 0.09 × 0.75 × 1.2 in bonded to the left wall, #10 screw into a potted nutplate in the band; the frame end on a flox insert in the aft bow', tol: '±0.06 in' },
  ],
  tolerances: { general: '.XX ±0.03' }, drawingNotes: ['Drawn taut at the 80° stop.'], generalNote: 'Swaged sleeves per the swaging tool maker; go/no-go gauge each sleeve.',
  na: { cut: 'Cable cut to length', layup: 'Not a composite part' },
  material: { spec: 'MIL-DTL-83420 1/16 in 7×19 corrosion-resistant cable, AN100 thimbles, oval swaged sleeves', alt: 'None', form: 'Bought cable and fittings', density: null, allowables: [['Cable break', '480 lb', 'MIL-DTL-83420']] },
  process: [{ op: 'Install', spec: 'Fit the tab and the bow insert; hold the canopy at 80°; swage to length; bungee the loop to the bow.' }, { op: 'Inspect', spec: 'Cable taut at the stop, strut not bottomed; loop clears the occupant and the hinge closed.' }],
  checks: ['cab-canopy-strap'],
  rules: [{ id: 'lever', label: 'Lever about the hinge at 80° ≥ 6 in', v: CABLE.lever, min: 6 }],
  mass: { each: CABLE_MASS, from: `solid volumes: cable × 0.286 × ${CC.fill} fill, sleeves CRES, tab 6061` },
  hardware: [{ std: 'MIL-DTL-83420 1/16 in 7×19 CRES', qty: 1, each: CABLE_MASS - 0.0, desc: `cable assembly, ${fx(CABLE.L, 1)} in, with thimbles and sleeves` }],
  hardwareNote: '2 × AN100-C2 thimbles, 2 × oval swaged sleeves, 1 × #10-32 screw into a potted nutplate, 1 × AN3 into the bow insert.',
  interfaces: [
    { id: 'I1', with: 'LEZ-53-150 shell (left longeron band)', feature: 'tab', what: 'Wall tab in the band', check: () => { const b = bandAt(CABLE.s), z = CABLE.wall[2] * 12; return { ok: z > b.low && z < b.top, detail: `tab WL ${fx(z)}; band ${fx(b.low)}–${fx(b.top)}` }; } },
    { id: 'I2', with: 'LEZ-56-100 aft bow', feature: 'cable', what: 'Frame end on the aft bow', check: () => ({ ok: CABLE.s >= CANF.bow1[0] && CABLE.s <= CANF.bow1[1], detail: `FS ${fx(CABLE.s * 12, 1)}, bow ${fx(CANF.bow1[0] * 12, 1)}–${fx(CANF.bow1[1] * 12, 1)}` }) },
  ],
  tooling: { needed: false, text: 'Hand swaging tool and go/no-go gauge.' },
  sourcing: { blank: '1/16 in 7×19 CRES cable 3 ft, 2 thimbles, 2 sleeves', vendor: 'Aircraft Spruce (MIL-DTL-83420 cable, AN100 thimbles, Nicopress sleeves)', url: 'https://www.aircraftspruce.com/menus/ha/cablescontrol.html', cost: 12, costAsOf: TODAY, perAircraft: 1, lead: 'Stock', note: 'Approximate, typed from memory.' },
};
void LDES; void RHO;
export const HW_RHO = { hinge: { pin: HG.rho.pin, al2024: HG.rho.al2024 }, strut: { steel: RHO.steel, al: RHO.al }, cable: { cable: RHO.cres * CC.fill, cres: RHO.cres, al: RHO.al } };
export { primsEntry };
