// LEZ-71-223 lower engine-mount bracket: a stock 6061-T6 equal angle on the firewall's aft face that cantilevers the
// lower engine pick-up loads up into the centre-section spar. Every field of the definition standard is filled from the
// numbers the bracket sizing in wp6 uses (BRK); the CadQuery solid (cad/mount_bracket.py) and the drawing sheet are built
// from the same numbers and re-checked by the release audit. Notional: public data and this model's own analysis.
import { GEO, CS_FIT, fusAt } from '../structures.js';
import { MOUNT } from '../parts/wp1_powerplant.js';
import { BRK, AN_SHEAR, AN_TENS } from '../parts/wp6_engine_install.js';
import { HARD } from '../parts/wp15_cs_spar.js';
import { r4, want } from './util.js';
import { insideFus } from '../systems.js';
import { bracketToEngine, LEGB_TRIM } from '../parts/wpG1_engine.js';

/** the numbers that define the solid, inches: x across leg A from the bolt line (+ toward the free, outboard edge),
 *  y aft from the firewall face, z up from the CS spar's lower face */
export function mtbParams() {
  const B = BRK;
  return { b: r4(B.sec.b), t: r4(B.sec.t), xBolt: r4(B.xBolt), zBot: r4(B.zBot), zTop: r4(B.zTop), h: r4(B.h), dP: r4(B.dP), dS: r4(B.dS), zSpar: B.zSpar.map(r4), pilot: 0.25, legB: 'outboard', zB0: r4(-B.h - (B.dP / 2 + LEGB_TRIM)) };
}
/** finished volume (in³): leg A full length less its four holes, leg B from zB0 to the top */
export function mtbVolume(p = mtbParams()) {
  return p.t * p.b * (p.zTop - p.zBot) + p.t * (p.b - p.t) * (p.zTop - p.zB0) - Math.PI * (p.dP / 2) ** 2 * p.t - 3 * Math.PI * (p.dS / 2) ** 2 * p.t;
}
/** the solid measured back against the record */
export function mtbExpect(p, m) {
  const bb = 0.002, out = [want('Leg A width (across)', p.b, m.bbox[1] - m.bbox[0], bb), want('Leg B width (aft)', p.b, m.bbox[3] - m.bbox[2], bb), want('Length', p.zTop - p.zBot, m.bbox[5] - m.bbox[4], bb),
    want('Leg thickness', p.t, m.legT ?? NaN, bb), want('Volume (in³)', mtbVolume(p), m.volume ?? NaN, 0.002), want('Leg B lower end above C', p.zB0 - p.zBot, (m.legB0 ?? NaN) - p.zBot, bb)];
  const H = [{ feat: 'pk', z: -p.h, d: p.dP }, ...p.zSpar.map((z, i) => ({ feat: `s${i + 1}`, z, d: p.dS }))];
  for (const h of H) { const g = m.holes.find((q) => q.feat === h.feat); out.push(want(`${h.feat} height`, h.z, g ? g.z : NaN), want(`${h.feat} diameter`, h.d, g ? 2 * g.r : NaN), want(`${h.feat} on the bolt line`, 0, g ? g.x : NaN)); }
  return out;
}

const P = mtbParams(), fx = (x, n = 3) => x.toFixed(n), w = BRK.worst, hp = HARD.find((h) => h.id === 'mount');
const STOCK = { 4: { pn: 1006, price: 20.99, url: 'https://zoro.com/onlinemetals-4-x-4-x-025-aluminum-angle-6061-t6-extruded-structural-1006/i/G907154827' } };
const stock = STOCK[P.b] || null, cut = Math.ceil((2 * (P.zTop - P.zBot) + 2) / 12) * 12;   // both brackets plus saw and squaring allowance, in whole feet

export const MTB_DEF = {
  pn: 'LEZ-71-223', rev: 'B', status: 'released', nha: 'LEZ-71-220', qty: 2,
  title: 'Lower engine-mount bracket',
  revs: [{ rev: 'A', date: '2026-11-17', short: 'Initial definition', change: `Initial definition. The bracket is a cantilever from the CS spar's lower face: the angle (${P.b} × ${P.b} × ${P.t} in, sized from the stock list) and the three spar bolts (AN${BRK.an}; AN5 fell short in combined shear and tension) carry the pick-up moment, so the CS spar's mount hard point no longer rests on an assumed lower attachment. The lower bushings of the mount (LEZ-71-224) turn fore-aft to bear on leg A.` },
    { rev: 'B', date: '2026-11-18', short: 'Leg B outboard, clear of the magnetos', change: `Leg B stood aft at the inboard edge (BL ±4.19–4.44) up to WL 40.0, where the magnetos on the accessory housing reach (ICD G-F1). Cutting or coping leg B above the spar's lower face does not work: in the aft-pull case the angle carries about 95 % of the root moment up to the first spar bolt, and a 4 × 2 or a flat leg A fails there (MS −0.5). Leg B now stands at the outboard edge (BL ±${fx(MOUNT.nodes.FBL[1] * 12 + P.xBolt - P.t, 2)}–${fx(MOUNT.nodes.FBL[1] * 12 + P.xBolt, 2)}), the section and its checks unchanged (both sign pairings were already taken); it starts ${LEGB_TRIM} in below the pick-up hole instead of at the bottom end, so its lower corner stays ≥ 0.6 in inside the cowl's rounded bottom corner. The heel rule now reads the distance from the bolt line to leg B's inner face against a 9/16 socket.` }],
  effectivity: 'Left and right lower engine pick-ups; the left bracket is the right mirrored (opposite hand: leg B outboard on both)',
  params: P,
  datums: [
    { id: 'A', what: 'Leg A back face: the face against the firewall\'s aft face' },
    { id: 'B', what: 'Bolt line: the axis through the pick-up and spar-bolt holes, perpendicular to the bottom end' },
    { id: 'C', what: 'Bottom end face (square cut)' },
  ],
  features: [
    { id: 'outline', kind: 'profile', label: `Cut length ${fx(P.zTop - P.zBot, 2)} in from ${P.b} × ${P.b} × ${P.t} in stock angle; ends square to the legs`, tol: 'Length ±0.03; ends square within 0.5°' },
    { id: 'legA', kind: 'leg', label: `Leg A ${P.b} in across, on the firewall; bolt line ${fx(P.xBolt, 2)} in in from its free edge`, tol: 'As extruded (AMS-QQ-A-200/8 tolerances)' },
    { id: 'legB', kind: 'leg', label: `Leg B ${P.b} in, standing aft at the outboard edge from ${fx(P.zB0 - P.zBot, 2)} above C to the top`, tol: 'As extruded; lower end cut square ±0.03' },
    { id: 'pk', kind: 'hole', d: P.dP, at: [0, -P.h], label: `Pick-up hole Ø ${fx(P.dP)} +0.003 / −0.000, ${fx(P.h, 2)} below the spar's lower face (${fx(-P.zBot - P.h, 2)} from C)`, tol: '+0.003 / −0.000', assy: true, note: `Ø ${fx(P.pilot)} pilot in the detail; drilled and reamed to size through the mount's lower bushing on the engine-mount jig` },
    ...P.zSpar.map((z, i) => ({ id: `s${i + 1}`, kind: 'hole', d: P.dS, at: [0, z], label: `Spar bolt hole ${i + 1}: Ø ${fx(P.dS)} +0.003 / −0.000, ${fx(z - P.zBot, 2)} from C`, tol: '+0.003 / −0.000', assy: true, note: `Ø ${fx(P.pilot)} pilot in the detail; drilled and reamed to size at assembly through the firewall and both CS spar webs (LEZ-57-140 mount hard point)` })),
  ],
  tolerances: { general: '.XX ±0.03  ·  .XXX ±0.010  ·  angles ±1°', holes: 'pilot positions ±0.010 from C along B; on B within 0.010', breakEdges: '0.010–0.030 all cut edges and hole edges' },
  generalNote: 'Inside fillet as extruded. Surface finish as extruded; cut ends 125 µin Ra.',
  drawingNotes: [`† Ø ${fx(P.pilot)} pilots in the detail part. Final size is drilled and reamed at assembly: spar-bolt holes through the firewall and the CS spar webs, the pick-up hole through the mount's lower bushing on the engine-mount jig.`,
    'Right bracket shown; left bracket opposite (mirror about the aircraft centre line). Leg B is outboard on both (rev B).'],
  na: { cut: 'Cut to length from stock: no flat pattern', layup: 'Metal part' },

  material: {
    spec: 'AMS-QQ-A-200/8, 6061-T6 extruded structural angle', alt: 'ASTM B221 6061-T6 extruded angle with a material test report',
    form: `${P.b} × ${P.b} × ${P.t} in equal angle, cut to length`, density: 0.098,
    allowables: [['F_tu', '38 ksi', 'MMPDS A-basis, extrusion t ≤ 0.499 in'], ['F_bru (e/D 2.0)', '88 ksi', 'MMPDS A-basis'], ['F_su', '24 ksi', 'MMPDS A-basis']],
    sectionNote: 'Section properties for a sharp-cornered angle (the extruded inside fillet is ignored, which slightly under-states the section)',
  },
  process: [
    { op: 'Machine', spec: 'Saw to length, square both ends, deburr. Drill the four Ø 0.250 pilots on the bolt line.' },
    { op: 'Edges', spec: 'Break all cut edges and hole edges 0.010–0.030 in.' },
    { op: 'Conversion coat', spec: 'MIL-DTL-5541, Type I, Class 1A, all surfaces (re-touch the reamed holes at assembly).' },
    { op: 'Prime', spec: 'MIL-PRF-23377 epoxy primer, all surfaces.' },
    { op: 'Identify', spec: 'Bag and tag with part number, revision and hand (L / R); no stamping or engraving on the part.' },
  ],

  checks: ['mtb-bend', 'mtb-pickup', 'mtb-bolts', 'cs-hp-mount'],
  rules: [
    { id: 'pk-eD', label: 'Pick-up end distance to C, e/D ≥ 2.0', v: (-P.h - P.zBot) / P.dP, min: 2 },
    { id: 'top-eD', label: 'Top spar bolt end distance, e/D ≥ 2.0', v: (P.zTop - P.zSpar.at(-1)) / P.dS, min: 2 },
    { id: 'edge', label: 'Bolt line to leg A free edge, e/D ≥ 2.0', v: P.xBolt / Math.max(P.dP, P.dS), min: 2 },
    { id: 'heel', label: 'Leg B\'s inner face clears a 9/16 socket on the bolt line (r 0.45 in, typed)', v: (P.xBolt - P.t) / 0.45, min: 1 },
    { id: 'pitch', label: 'Spar-bolt pitch ≥ 3 D in the angle (metal; the spar web bearing is checked per bolt at this pitch, 3.8 D)', v: (P.zSpar[1] - P.zSpar[0]) / P.dS, min: 3 },
    { id: 'room', label: 'Leg A fits ahead of the mount\'s lower bushing (room / t)', v: BRK.room / P.t, min: 1 },
  ],
  mass: { each: mtbVolume() * 0.098, from: 'solid volume × 0.098 lb/in³ (checked against the CadQuery solid)' },
  hardware: [],
  hardwareNote: `None on the detail part. The 3 × AN${BRK.an} spar bolts, crush tubes, MS21042L nuts and AN960 washers are hardware on the CS spar (LEZ-57-140); the AN6 pick-up bolt, nut and washers are installation hardware on the engine mount (LEZ-71-220).`,
  interfaces: [
    { id: 'I1', with: 'LEZ-57-140 CS spar mount hard point', feature: 's2', what: 'Bolt count, diameter and heights match the spar hard point; bracket at the hard point\'s BL',
      check: () => { const ok = hp && hp.n === 3 && hp.d === P.dS && hp.zIn.every((z, i) => Math.abs(z - P.zSpar[i]) < 1e-9) && Math.abs(hp.y - Math.abs(MOUNT.nodes.FBL[1])) < 1e-9; return { ok, detail: `${hp ? hp.n : 0} × Ø ${hp ? hp.d : '?'} at ${hp ? hp.zIn.join(', ') : '?'} in, BL ${hp ? (hp.y * 12).toFixed(2) : '?'}; the bracket has 3 × Ø ${P.dS} at ${P.zSpar.join(', ')}` }; } },
    { id: 'I2', with: 'Engine mount lower pick-up (LEZ-71-220 node FBL / FBR)', feature: 'pk', what: 'Pick-up hole at the mount node height and BL; leg A ahead of the node',
      check: () => { const zp = (MOUNT.nodes.FBL[2] - CS_FIT.L) * 12, ds = (MOUNT.nodes.FBL[0] - GEO.firewall) * 12; return { ok: Math.abs(zp + P.h) < 1e-3 && ds >= P.t - 1e-9, detail: `node ${zp.toFixed(3)} in from the spar's lower face (hole ${(-P.h).toFixed(3)}); node ${ds.toFixed(3)} in aft of the firewall, leg A ${P.t} in` }; } },
    { id: 'I3', with: 'Firewall (fuselage laminate)', feature: 'legA', what: 'Leg A lies flat on the firewall\'s aft face below the spar; the pick-up hole passes the firewall above the fuselage bottom',
      check: () => { const bot = CS_FIT.L * 12 + P.zBot, floor = fusAt(GEO.firewall).bot * 12, c = bot - floor; return { ok: c >= 0.5, detail: `bottom end at WL ${bot.toFixed(2)}, ${c.toFixed(2)} in above the fuselage bottom at the firewall (WL ${floor.toFixed(2)})` }; } },
    { id: 'I5', with: 'Cowl (LEZ-71-155) rounded bottom corner', feature: 'legB', what: 'Leg B\'s outboard-lower corner ≥ 0.6 in inside the OML along its length (rev B)',
      check: () => { const y = (MOUNT.nodes.FBL[1] * 12 + P.xBolt) / 12, z = (CS_FIT.L * 12 + P.zB0) / 12; let c = 9; for (let k = 0; k <= 8; k++) { const s = GEO.firewall + (P.t + (P.b - P.t) * k / 8) / 12; let lo = 0, hi = 0.25; for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; if (insideFus(s, y, z, m)) lo = m; else hi = m; } c = Math.min(c, lo * 12); } return { ok: c >= 0.6, detail: `${c.toFixed(2)} in inside the OML (≥ 0.60)` }; } },
    { id: 'I6', with: 'LEZ-71-210 engine envelope (magnetos)', feature: 'legB', what: 'Leg B clear of the engine envelope by ≥ 0.75 in (0.5 in + isolator motion)', check: () => { const c = bracketToEngine(); return { ok: c.d >= 0.75, detail: `${c.d.toFixed(2)} in to the ${c.feat}` }; } },
    { id: 'I4', with: 'AN bolts', feature: 'pk', what: 'Hole sizes equal the bolt diameters (AN6 pick-up, AN spar bolts)',
      check: () => ({ ok: P.dP === 0.375 && P.dS === BRK.an / 16, detail: `pick-up Ø ${P.dP} (AN6 ${AN_SHEAR[6]} lb shear), spar Ø ${P.dS} (AN${BRK.an} ${AN_SHEAR[BRK.an]} lb shear, ${AN_TENS[BRK.an]} lb tension)` }) },
  ],
  tooling: { needed: true, text: 'The engine-mount jig (LEZ-71-220) locates the four pick-ups: the bracket is clamped to the firewall under the spar, the spar-bolt holes are drilled and reamed through the bracket, firewall and spar from the bracket pilots, then the pick-up hole is drilled and reamed through the mount\'s lower bushing with the mount on the jig.' },
  sourcing: {
    blank: `${P.b} × ${P.b} × ${P.t} in 6061-T6 structural angle (AMS-QQ-A-200/8), one ${cut} in length for both brackets`,
    vendor: stock ? `Online Metals part ${stock.pn}` : 'Online Metals (stock angle)', url: stock ? stock.url : 'https://www.onlinemetals.com/',
    cost: stock ? stock.price * cut / 12 / 2 : null, costAsOf: '2026-11-17', perAircraft: 2, lead: 'Stock, cut to order',
    note: stock ? `Priced at the 12 in cut price ($${stock.price}, Zoro listing of Online Metals ${stock.pn}) × ${cut / 12} ft; a single ${cut} in cut is usually less per foot.` : 'Price not found',
  },
};
