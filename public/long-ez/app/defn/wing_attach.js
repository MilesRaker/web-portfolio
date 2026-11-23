// LEZ-57-145 wing-attach installation: an installation record (no solid of its own: the detail parts carry theirs).
// It defines the hardware that joins each wing to the CS spar: the two spar-end pins and the drag bolt, their grips
// from the stack-ups, washers, torques and safetying, and checks them against the detail parts' holes and thicknesses.
// Notional: public data and this model's own analysis. Not for construction.
import { ATT, ATTACH, CLV, LWA, LUG, AN_SHEAR, AN_TENS } from '../parts/wp13_airframe_joints.js';
import { DRG, DRAG_ANGLE_T, DANG } from '../parts/wp15_cs_spar.js';
import { INSTALL, AN_THREAD, TORQUE, WASHER_MAX } from '../parts/wp16_wing_attach.js';
import { r4 } from './util.js';

export function waParams() {
  const I = INSTALL;
  return { pin: I.pin.std, drag: I.drag.std, pinStack: r4(I.pinStack), dragStack: r4(I.dragStack), pinGrip: r4(I.pin.grip), dragGrip: r4(I.drag.grip), dP: I.dP, dD: I.dD, mass: r4(I.mass), tT: CLV.tT, plate: LWA.t, gap: LUG.gap, lug: DRG.ta, leg: DRAG_ANGLE_T, below: DANG.below, w: I.wP.t };
}
const I = INSTALL, fx = (x, n = 3) => x.toFixed(n);
const PRICE = { pin: { each: 6.43, vendor: 'Military Fasteners (AN10 bolts; AN10-13A page metadata price, out of stock, no date: ask for a quote)', url: 'https://military-fasteners.com/bolts/machine+bolts/AN10-13A' } };   // src 'Military Fasteners AN10-13A page (accessed 2026-11-19)'

export const WA_DEF = {
  pn: 'LEZ-57-145', rev: 'B', status: 'released', nha: 'LEZ-000 (aircraft)', qty: 2, install: true,
  title: 'Wing-attach installation',
  revs: [{ rev: 'A', date: '2026-11-17', short: 'Initial definition', change: `Initial definition. The installation now carries only its own hardware: the two AN${ATT.pin} spar-end pins and the AN${ATT.drag} drag bolt (moved here from the drag fitting), with grips picked from the stack-ups, washers and torques. The LWA-plate bolts into the wing caps are wing-panel hardware (LEZ-57-110); the clevis-block bolts are CS-spar hardware (LEZ-57-140).` }, { rev: 'B', date: '2026-11-17', short: 'Longer drag bolt, through the skin', change: `The drag bolt now passes the jut-out's lower skin and the angle's doubler, head in a flush recess, as defined with the angle (LEZ-57-144): ${I.drag.std} on a ${fx(I.dragStack)} in stack.` }],
  effectivity: 'Left and right wing roots',
  params: waParams(),
  datums: [],
  features: [
    { id: 'pin', kind: 'joint', label: `Spar-end joints (2 per side): ${I.pin.std} through clevis block LEZ-57-143 and LWA plate LEZ-57-142; stack ${fx(I.pinStack)} in, grip ${fx(I.pin.grip)} in`, tol: 'Holes reamed together at assembly: light push fit' },
    { id: 'drag', kind: 'joint', label: `Third bolt (1 per side): ${I.drag.std} through the jut-out skin, the wing angle LEZ-57-144 and the fitting lug LEZ-57-141; stack ${fx(I.dragStack)} in, grip ${fx(I.drag.grip)} in`, tol: 'Hole drilled and reamed through both at assembly, wing pinned' },
  ],
  tolerances: { general: 'Torque per AC 43.13-1B table 7-1 (dry, cadmium-plated threads); self-locking nuts: at least 2 threads past the locking insert' },
  drawingNotes: ['Install the wing on the jig at incidence and dihedral before drilling; ream the pin holes through clevis and plate together.', 'Shim between tang and plate ≤ 0.070 in [CZ]; no shim under the drag-bolt lug.'],
  na: { cut: 'Installation: no flat pattern', layup: 'Installation: no layup' },
  material: {
    spec: 'AN standard bolts (alloy steel, 125 ksi minimum tensile, cadmium plated), MS21042L self-locking nuts, AN960 washers', alt: 'NAS close-tolerance bolts of the same diameter if the reamed fit is lost',
    form: 'bought hardware', density: 0.283,
    allowables: [[`AN${ATT.pin} single shear`, `${AN_SHEAR[ATT.pin].toLocaleString()} lb`, 'AN standard'], [`AN${ATT.drag} single shear / tension`, `${AN_SHEAR[ATT.drag].toLocaleString()} / ${AN_TENS[ATT.drag].toLocaleString()} lb`, 'AN standard']],
  },
  process: [
    { op: 'Prepare', spec: 'Holes reamed, deburred, conversion-coated and primed on the detail parts; shank and threads clean and dry.' },
    { op: 'Install', spec: 'Pins head outward in the skin recess (up on the upper pin, down on the lower), nuts into the spar-end bay; drag bolt head down. Washer under every head and nut; extra washer under the nut where the grip runs long.' },
    { op: 'Torque', spec: `AN${ATT.pin}: ${TORQUE[ATT.pin][0]}–${TORQUE[ATT.pin][1]} in-lb; AN${ATT.drag}: ${TORQUE[ATT.drag][0]}–${TORQUE[ATT.drag][1]} in-lb (AC 43.13-1B table 7-1), torque on the nut.` },
    { op: 'Safety', spec: 'Self-locking nuts; check running torque on every reinstallation and replace a nut that runs on by hand.' },
    { op: 'Seal', spec: 'Paint the pin-head depressions; seal the drag-bolt access in the root pocket.' },
  ],
  checks: ['wing-attach', 'wing-attach-drag'],
  rules: [
    { id: 'pin-grip', label: 'Pin grip covers the stack (grip / stack)', v: I.pin.grip / I.pinStack, min: 1 },
    { id: 'pin-run', label: 'Pin: shank stands ≤ 1/16 in past the stack and its washers; washers ≤ 1/8 in combined (AC 43.13-1B 7-37)', v: Math.min((1 / 16) / Math.max(1e-9, I.pin.over), WASHER_MAX / I.pin.wash.w), min: 1 },
    { id: 'drag-grip', label: 'Drag-bolt grip covers the stack (grip / stack)', v: I.drag.grip / I.dragStack, min: 1 },
    { id: 'drag-run', label: 'Drag bolt: shank stands ≤ 1/16 in past the stack and its washers; washers ≤ 1/8 in combined (AC 43.13-1B 7-37)', v: Math.min((1 / 16) / Math.max(1e-9, I.drag.over), WASHER_MAX / I.drag.wash.w), min: 1 },
    { id: 'thread', label: 'Thread past the grip ≥ 1.4 D for the nut and two threads (pin)', v: AN_THREAD[ATT.pin] / (1.4 * I.dP), min: 1 },
  ],
  mass: { each: I.mass, from: 'hardware lines: steel volumes × 0.283 lb/in³, per side' },
  hardware: I.lines,
  hardwareNote: I.lines.map((l) => `${l.qty} × ${l.std}${l.torque ? ` (${l.torque[0]}–${l.torque[1]} in-lb)` : ''}`).join(', ') + ' per side',
  interfaces: [
    { id: 'I1', with: 'LEZ-57-143 clevis block and LEZ-57-142 LWA plate', feature: 'pin', what: 'Pin diameter equals both holes; the stack is the clevis height',
      check: () => ({ ok: CLV.D === I.dP && LWA.D === I.dP && Math.abs(CLV.H - (2 * CLV.tT + CLV.slot)) < 1e-9, detail: `pin Ø ${I.dP}, clevis Ø ${CLV.D}, plate Ø ${LWA.D}; clevis ${CLV.H.toFixed(3)} in = 2 × ${CLV.tT} + ${CLV.slot.toFixed(3)} slot (plate ${LWA.t} + 2 × ${LUG.gap} gap)` }) },
    { id: 'I2', with: 'LEZ-57-141 drag fitting and LEZ-57-144 wing angle', feature: 'drag', what: 'Drag-bolt diameter equals the lug hole; stack is lug + angle leg',
      check: () => ({ ok: DRG.Dd === I.dD && Math.abs(I.dragStack - (DRG.ta + DRAG_ANGLE_T + DANG.below + I.drag.wash.w)) < 1e-9, detail: `bolt Ø ${I.dD}, lug Ø ${DRG.Dd}; lug ${DRG.ta} + angle ${DRAG_ANGLE_T} + skin/doubler/flox ${DANG.below.toFixed(2)} + washers ${I.drag.wash.w.toFixed(3)} (≤ 1/8)` }) },
    { id: 'I3', with: 'Spar-end bay (pin nuts)', feature: 'pin', what: 'Pin nut and thread end stay inside the spar end, clear of the opposite skin',
      check: () => { const room = ATTACH.h - CLV.H, need = I.pin.L + 3 / 32 - I.pin.grip + I.wP.t; return { ok: 2 * need <= room, detail: `both nuts point into the bay: 2 × ${need.toFixed(2)} in of thread, washer and nut in the ${room.toFixed(2)} in between the upper and lower clevis` }; } },
  ],
  tooling: { needed: true, text: 'Wing-attach jig: holds each wing at incidence and dihedral against the CS spar while the pin holes are reamed through clevis and plate together and the drag-bolt hole through lug and angle.' },
  sourcing: {
    blank: 'Bought hardware: AN bolts, MS21042L nuts, AN960 washers',
    vendor: PRICE.pin.vendor, url: PRICE.pin.url,
    cost: 2 * PRICE.pin.each, costAsOf: '2026-11-17', perAircraft: 2, lead: 'Stock (lead time not stated)',
    note: `Priced on the two ${I.pin.std} pins per side at the listed short-AN10 price ($${PRICE.pin.each}); the nuts, washers and the AN${ATT.drag} drag bolt are a few dollars more and not priced here.`,
  },
};

// memory-audit integration (2026-11-19): this record's new revision
import { memRev } from './revs_memaudit.js';
memRev(WA_DEF);
