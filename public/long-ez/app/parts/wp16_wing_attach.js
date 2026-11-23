// WP16 — wing-attach installation LEZ-57-145: the hardware that joins each wing to the CS spar (two vertical spar-end pins
// through the clevis blocks and LWA plates, and the vertical drag bolt through the drag / torsion fitting and the wing
// angle), with grips picked from the measured stack-ups, washers, torques and safetying. The detail parts carry the
// solids (LEZ-57-142, -143, -141, -144); this module carries the stack-ups the installation record checks.
// Notional: public data and this model's own analysis. Not for construction.
import { defineParts } from '../systems.js';
import { ATT, ATTACH, CLV, LWA, LUG, pinGeo } from './wp13_airframe_joints.js';
import { DRG, DRAG_ANGLE_T, DANG } from './wp15_cs_spar.js';

const S1 = (title, inspect) => ({ title, inspect });
const STEEL = 0.283;   // lb/in³
// AN standard bolts: grip = code length + 3/32 − th, with th the thread term below (the formula is kept; th is set so it gives
// the catalogue grip). 2026-11-19: AN3 / AN4 / AN6 th 0.469 / 0.531 / 0.656 (the old values over-stated the grip by 0.047 in),
// AN5 / AN7 0.531 / 0.656, AN8 0.781 confirmed; AN10 0.953 BOUND (not found in public sources). src 'DLA Troop Support fastener
// catalog, AN3–AN6 (dla.mil, accessed 2026-11-19)'; AN6 'Aircraft Spruce Canada catalogue p. 26049' and AN7 'Boeing Distribution
// AN7-35' (accessed 2026-11-19). Actual length: AN3 / AN4 code + 1/32 in, AN5–AN8 code + 3/32 in (DLA). AN960 washers: id, od, t
// (AN960-1016 OD 1.188: src 'Aircraft Spruce AN960 flat washers page, accessed 2026-11-19'); -L light washers t 0.032.
export const AN_THREAD = { 3: 0.469, 4: 0.531, 5: 0.531, 6: 0.656, 7: 0.656, 8: 0.781, 10: 0.953 };
export const AN_LEN_ADD = { 3: 1 / 32, 4: 1 / 32, 5: 3 / 32, 6: 3 / 32, 7: 3 / 32, 8: 3 / 32, 10: 3 / 32 };
export const AN960 = { 4: { id: 0.265, od: 0.5, t: 0.063 }, 10: { id: 0.64, od: 1.188, t: 0.063 } };
export const AN960_L = 0.032;   // AN960-xL light washer thickness (in)
/** AC 43.13-1B CHG 1 para 7-37: combined washer height under one bolt ≤ 1/8 in (two regular AN960 = 0.126 in, at the line) */
export const WASHER_MAX = 0.126;
// AC 43.13-1B CHG 1 table 7-1, fine-thread steel bolts with tension-type nuts, in-lb; AN8 (1/2-20) 480–690 (the 450–500 row
// is 7/16-20). src 'FAA AC 43.13-1B CHG 1 chapter 7, table 7-1 (faa.gov, accessed 2026-11-19)'
export const TORQUE = { 4: [50, 70], 5: [100, 140], 6: [160, 190], 8: [480, 690], 10: [1100, 1300] };
/** the shortest AN dash code whose grip covers the stack */
export function pickAN(n, stack) {
  const th = AN_THREAD[n];
  for (let e = 4; e < 80; e++) { const code = Math.floor(e / 8) * 10 + (e % 8), L = e / 8, grip = L + 3 / 32 - th; if (grip >= stack - 1e-9) return { n, dash: `${code}A`, std: `AN${n}-${code}A`, L, grip, nominal: L + (AN_LEN_ADD[n] ?? 3 / 32), over: grip - stack }; }
  return null;
}
/** bolt and washers for a clamped stack s0 (in, no washers): a washer under the head and one under the nut, each regular
 *  (0.063) or light (0.032), combined ≤ WASHER_MAX; the shank must pass the head washer and the stack, and stand no more than
 *  1/16 in past the nut washer. Shortest bolt, then the lightest washers. */
export function fitAN(n, s0) {
  const W = [['', 0.063], ['L', AN960_L]];
  for (let k = 0; k < 6; k++) { const b0 = pickAN(n, s0 + AN960_L), b = k ? pickAN(n, b0.grip + 0.001 + (k - 1) * 0.125) : b0; if (!b) break;
    const opts = [];
    for (const [h, th] of W) for (const [u, tn] of W) { const w = th + tn; if (w > WASHER_MAX + 1e-9) continue; const run = b.grip - (th + s0 + tn); if (b.grip >= th + s0 - 1e-9 && run <= 1 / 16 + 1e-9) opts.push({ head: h, nut: u, th, tn, w, run }); }
    if (opts.length) { const o = opts.sort((a, c) => a.w - c.w)[0]; return { ...b, stack: s0 + o.w, over: b.grip - s0 - o.w, wash: o }; } }
  return null;
}
const boltMass = (d, L, n) => STEEL * (Math.PI * (d / 2) ** 2 * (L + (AN_LEN_ADD[n] ?? 3 / 32)) + 0.866 * (1.5 * d) ** 2 * 0.62 * d);
const nutMass = (d) => STEEL * 0.866 * (1.5 * d) ** 2 * 0.75 * d * 0.55;   // light self-locking hex, bore and chamfers out
const washerMass = (w) => STEEL * Math.PI / 4 * (w.od ** 2 - w.id ** 2) * w.t;

export const INSTALL = (() => {
  const nP = ATT.pin, dP = nP / 16, wP = AN960[nP], nD = ATT.drag, dD = nD / 16, wD = AN960[nD];
  const pin0 = CLV.H, drag0 = DRG.ta + DRAG_ANGLE_T + DANG.below;   // lug, angle leg, then doubler, skin and flox bed to the OML
  const pin = fitAN(nP, pin0), drag = fitAN(nD, drag0), pinStack = pin.stack, dragStack = drag.stack;   // 2026-11-19: washers ≤ 1/8 in combined (AC 43.13-1B 7-37)
  const xP = 0, xD = 0;
  const wTxt = (o) => `AN960${o.head ? '-L (light)' : ''} under the head, AN960${o.nut ? '-L (light)' : ''} under the nut (${o.w.toFixed(3)} in, ≤ 1/8)`;
  const lines = [
    { id: 'pin', std: pin.std, qty: 2, desc: `spar-end pin, vertical, through the clevis tangs and the LWA plate; head in a flush skin recess, nut into the spar-end bay; grip ${pin.grip.toFixed(3)} in on a ${pinStack.toFixed(3)} in stack`, each: boltMass(dP, pin.L, nP), torque: TORQUE[nP], an: nP },
    { id: 'pin-nut', std: `MS21042L${nP}`, qty: 2, desc: 'self-locking nut, in the spar-end bay', each: nutMass(dP) },
    { id: 'pin-w', std: `AN960-${nP}16 / -${nP}16L`, qty: 2 * 2, desc: `washers: ${wTxt(pin.wash)}`, each: (washerMass(wP) * (pin.wash.th + pin.wash.tn)) / (2 * wP.t) },
    { id: 'drag', std: drag.std, qty: 1, desc: `drag bolt, vertical, head down in a flush recess in the jut-out's lower skin, through skin, doubler, the wing angle (LEZ-57-144) and the fitting lug (LEZ-57-141); grip ${drag.grip.toFixed(3)} in on a ${dragStack.toFixed(3)} in stack`, each: boltMass(dD, drag.L, nD), torque: TORQUE[nD], an: nD },
    { id: 'drag-nut', std: `MS21042L${nD}`, qty: 1, desc: 'self-locking nut, on the lug, reached from the root pocket', each: nutMass(dD) },
    { id: 'drag-w', std: `AN960-${nD}16 / -${nD}16L`, qty: 2, desc: `washers: ${wTxt(drag.wash)}`, each: (washerMass(wD) * (drag.wash.th + drag.wash.tn)) / (2 * wD.t) },
  ];
  const mass = lines.reduce((a, l) => a + l.qty * l.each, 0);
  return { pin, drag, pinStack, dragStack, wP, wD, lines, mass, dP, dD, xP, xD };
})();

defineParts([{ pn: 'LEZ-57-145', kind: 'install', massItem: 'wings', name: `Wing-attach installation (L/R): AN${ATT.pin} spar-end pins and AN${ATT.drag} drag bolt`, ata: 57, qty: 2, material: 'AN steel hardware, cadmium plated',
  massEach: +INSTALL.mass.toFixed(3),
  geo: [-1, 1].flatMap((sg) => [pinGeo(ATTACH.pinU, sg, ATT.pin / 16), pinGeo(ATTACH.pinL, sg, ATT.pin / 16)]),
  hardware: INSTALL.lines.map((l) => ({ std: l.std, qty: l.qty, desc: l.desc + (l.torque ? `; torque ${l.torque[0]}–${l.torque[1]} in-lb` : '') })),
  props: [['Pin couple depth', `${ATTACH.h.toFixed(2)} in`], ['Pin stack', `clevis ${CLV.H.toFixed(3)} in (2 × ${CLV.tT} tangs around a ${LWA.t} in plate with ${LUG.gap} in gaps) + washers`], ['Drag-bolt stack', `lug ${DRG.ta} + angle leg ${DRAG_ANGLE_T} + skin, doubler and flox bed ${DANG.below.toFixed(2)} in + washers`]],
  blurb: `The three bolts that hold each wing [LP] [CZ]. Two vertical AN${ATT.pin} pins at the CS spar end, upper and lower, ${ATTACH.h.toFixed(1)} in apart, each through a clevis block (LEZ-57-143) and the LWA plate (LEZ-57-142) between its tangs, in double shear; and the vertical AN${ATT.drag} drag bolt behind the spar through the drag / torsion fitting (LEZ-57-141) and the wing's angle (LEZ-57-144), in single shear. Grips are picked from the stack-ups; torques per AC 43.13-1B.`,
  steps: [S1('Fit the wings to the spar on the jig; drill and ream the pin holes through clevis and LWA plate together', ['Pins a light push fit, reamed to the bolt', 'Shim ≤ 0.070 in between tang and plate [CZ]', 'Wing incidence and dihedral to the jig before drilling']),
    S1('Torque, safety, paint the depressions', ['Nut torque per AC 43.13-1B table 7-1', 'Corrosion: alodine + epoxy primer on all 2024 [LP]'])],
  src: { mass: 'GEOMETRY: steel volumes of the hardware lines (LEZ-57-145 record)', design: '[LP] [CZ] + LEZ sizing' } }]);
