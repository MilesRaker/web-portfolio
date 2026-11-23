// LEZ-27-100 flight-control installation: hardware at every rod-end joint, the rigging table, and the openings the
// control lines need in other parts (the interface list block owners work from). No solid of its own. Notional.
import { L, SZ, ARM, LINK, LB, rudRoute, RR } from '../parts/wpC1_controls.js';
import { STICK_TRAVEL } from './c27_sticks.js';
import { CORRIDOR } from './c27_roll.js';
import { GEO } from '../structures.js';
import { ICD_C, icdIface, openIface, TRAVEL } from '../parts/wpC9_icd.js';
import { r4 } from './util.js';
import { fx, pt, DATE, MEMNOTE } from './c27_common.js';
import { DEFS as _DEFS } from './release.js';
import { CTLS } from '../parts/wp19_ctl.js';
import { CS_TUNNELS } from '../parts/wpJ0_layout.js';
import { SYSC } from '../parts/wpC8_cuts.js';
import { magField } from '../parts/wpI1_power.js';
import { toeLever, BRK } from '../parts/wpD2_brakes.js';
// final integration (2026-11-19): the open items O1–O8 are met by their owners' revisions; each is now a real check on the
// owner's record or model (the item text kept as the 'what', the owner in 'with')
const _via = (pn, id) => { const f = _DEFS[pn]?.def?.interfaces.find((q) => q.id === id); if (!f) return { ok: false, detail: `${pn} ${id}: none` }; const r = f.check(); return { ok: r.ok, detail: `${pn} ${id}: ${r.detail.slice(0, 160)}` }; };
const _all = (...rs) => ({ ok: rs.every((r) => r.ok), detail: rs.map((r) => r.detail).join('; ') });
const CLOSE = [
  () => ({ ok: CTLS.rudder.rod >= Math.round(LINK.cable), detail: `A's rudder horn sized for ${CTLS.rudder.rod} lb ≥ ${fx(LINK.cable, 1)} lb delivered (to the pound; the horn keeps its +15 % reserve) (the horn arm and the pad travel are the rigging's: stick / pedal travel is Miles's)` }),
  () => _via('LEZ-57-130', 'I4'),
  () => _all(_via('LEZ-53-165', 'I5'), _via('LEZ-53-170', 'I3'), _via('LEZ-53-175', 'I3')),
  () => _via('LEZ-25-110', 'I3'),
  () => { const T = CS_TUNNELS[0], z = 35.1664 + T.z; return { ok: Math.abs(T.x1 - SYSC.jut[0][1]) < 1e-6 && Math.abs(z - SYSC.jut[0][2]) < 1e-3 && T.d >= 2 * SYSC.r - 1e-9, detail: `LEZ-57-140 rev H systems tunnel out of the aft face at BL ±${T.x1}, WL ${fx(z)}, Ø ${T.d} on C's conduit start (BL ±${SYSC.jut[0][1]}, WL ${SYSC.jut[0][2]})` }; },
  () => _via('LEZ-33-110', 'I5'),
  () => { const g = magField(); return { ok: !!g && g.ms >= 0, detail: g ? `J's rev B rule (heading error) and I's field: ${fx(g.B, 3)} µT at the GMU 11, MS ${fx(g.ms, 2)}` : 'no GMU' }; },
  () => { const k = toeLever(); return { ok: k.apply > 0 && BRK.type === 'pull', detail: `toe press lengthens the cylinder; D's LEZ-32-311 is pull-to-apply (rev B); ratio ${fx(k.ratio, 3)}` }; },
];
const closedIface = () => openIface().map((o, i) => (CLOSE[i] ? { ...o, feature: 'icd', open: false, what: o.what.replace(/^OPEN \([^)]*\): /, ''), check: CLOSE[i] } : o));

const J = 17;   // rotating AN3 rod-end joints: pitch arm, bellcrank, crank, beam ×3, K1 ×4, K2 ×4, aileron horns ×2, rear arm
const lines = [
  { id: 'bolt', std: 'AN3-7A', qty: J, each: 0.0114, desc: 'Rod-end bolts at every rotating joint (steel volume from the DLA AN3 dimensions × 0.283 lb/in³, accessed 2026-11-19)' },
  { id: 'nut', std: 'AN310-3', qty: J, each: 0.0040, desc: 'Castle nuts' },
  { id: 'cotter', std: 'MS24665-132', qty: J, each: 0.0005, desc: 'Cotter pins' },
  { id: 'wash', std: 'AN960-10', qty: 2 * J, each: 0.0021, desc: 'Washers, under head and nut (π/4 (0.438² − 0.203²) × 0.063 × 0.283 lb, AN960-10 dimensions from the Aircraft Spruce AN960 page, accessed 2026-11-19)' },
  { id: 'cbolt', std: 'AN3-6A', qty: 4, each: 0.0101, desc: 'Cable fork-end bolts (pedal horns; rudder horns per block A)' },
  { id: 'cnut', std: 'AN310-3', qty: 4, each: 0.0040, desc: 'Castle nuts, cable fork ends' },
  { id: 'ccot', std: 'MS24665-132', qty: 4, each: 0.0005, desc: 'Cotter pins, cable fork ends' },
  { id: 'wire', std: 'MS20995C32', qty: 6, each: 0.0010, desc: 'Safety wire (ft): stops, turnbuckles' },
];
const rig = () => [
  ['Elevator', '±20°', `±${fx(STICK_TRAVEL.pitch, 2)}° stick (grip ±${fx(ARM.grip * Math.sin(STICK_TRAVEL.pitch * Math.PI / 180), 2)} in)`, `pitch rod ±${fx(ARM.pitchBC * Math.sin(20 * Math.PI / 180), 3)} in`],
  ['Aileron', '±15°', `±${fx(STICK_TRAVEL.roll, 2)}° stick about its ${L.cant}° inboard cant (grip ±${fx(ARM.grip * Math.sin(STICK_TRAVEL.roll * Math.PI / 180), 2)} in)`, `rods ±${fx(ARM.horn * Math.sin(15 * Math.PI / 180), 3)} in`],
  ['Rudder', `0 / +${fx(TRAVEL.rudder, 0)}° out (rudder stop)`, `${fx(LINK.rudLink.pedalDeg0, 1)}° pedal to the rudder stop, pedal stop at ${fx(TRAVEL.pedal, 1)}° (pad ${fx(ARM.pedalPad * Math.sin(TRAVEL.pedal * Math.PI / 180), 2)} in)`, `cable ${fx(LINK.rudLink.pedalDeg0 > 0 ? LINK.hornEff * Math.sin(LINK.rudLink.pedalDeg0 * Math.PI / 180) : 0, 3)} in to the rudder stop`],
  ['Landing brake', '0 / 70°', 'switch S9', `actuator ${fx(LB().need, 2)} in`],
];
export const OPENINGS = () => { const c = CORRIDOR(), r = rudRoute(1); return [
  ['LEZ-53-150 shell (C rev B)', `torque tube Ø ${fx(SZ.tubeE[0] + 0.125, 3)} at FS ${fx(L.T0[0])}, WL ${fx(L.T0[2])}, both sides; landing-brake opening; keel and pedal hard points`],
  ['LEZ-57-140 CS spar (C rev C)', `rod A Ø ${fx(c.d, 3)}: ${pt(L.E)} → ${pt(L.X)}; conduit Ø 0.375: ${pt(r[RR.fwd])} → ${pt(r[RR.aft])}; both sides`],
  ['LEZ-53-165 F28 (block A)', `pitch rod Ø ${fx(SZ.pitchRod[0] + 0.75, 3)} near BL 9, WL 39.5`],
  ['LEZ-53-175 seat bulkhead (block A)', `roll tube (bushed) and both rudder conduits along BL ±${fx(r[RR.wall][1], 1)}, WL ${fx(r[RR.wall][2], 1)}`],
  ['Panel bulkhead FS 40.5 (block B)', 'pitch rod near BL 9.5 WL 37.6; rudder conduits near BL ±7.8 WL 38.1'],
  ['LEZ-57-116 rev B / -110 rev C / -152 rev C (wing)', `rod B tunnel at FS ${fx(L.K1b[0], 1)}, WL ${fx(L.WLA, 1)}; K1 bay; K2 bay and bracket; disconnect opening at BL ${L.disc}; conduit tunnel; link-C tunnel and cove-end relief (in the parts)`],
  ['LEZ-55-120 rev D canard', 'cove-lip relief 0.30 in at BL 13.80–14.10 for the elevator horn root (in the part)'],
]; };
export function ciParams() { return { lines: lines.map((l) => [l.std, l.qty, l.each]), rig: rig().map((r) => r.join('|')), corridor: [L.E, L.X].map((p) => p.map(r4)) }; }
export const CI_DEF = {
  pn: 'LEZ-27-100', rev: 'A', status: 'released', nha: 'LEZ-000 (aircraft)', qty: 1, install: true, title: 'Flight-control installation',
  revs: [{ rev: 'A', date: DATE, short: 'Initial definition', change: `Initial definition. An ASSUMED 0.4 lb with bent rods, a 1:1 elevator ratio that did not hold, no rear-seat pitch and lines through the fuel tank (ICD F1–F27). As defined: the rotating joints' hardware, the rigging table, the CS spar corridor and the openings other parts carry; loads per 23.395 / 23.397 / 23.399, joints at the 23.693 factor.` }],
  effectivity: 'One per aircraft', params: ciParams(), datums: [],
  features: [
    { id: 'joints', kind: 'joint', label: `${J} rotating rod-end joints on AN3 bolts with castle nuts and cotter pins; rod ends with jam nuts, thread past the check hole`, tol: 'Free play at each TE ≤ 1/32 in' },
    { id: 'rig', kind: 'rigging', label: rig().map((r) => `${r[0]} ${r[1]}`).join('; '), tol: 'Throws ±1/16 in at the TE' },
  ],
  tolerances: { general: 'Castle nuts snug then to the next cotter slot (AC 43.13-1B); no self-locking nut on a rotating joint' },
  drawingNotes: ['Rig with the rigging bar holding both sticks neutral; set rod lengths, then the stops (LEZ-27-160).', 'Duplicate inspection of every rod end, castle nut, cotter pin and turnbuckle clip.', MEMNOTE],
  na: { cut: 'Installation: no flat pattern', layup: 'Installation: no layup' },
  material: { spec: 'AN standard bolts (cadmium-plated alloy steel), AN310 castle nuts, MS24665 cotter pins, AN960 washers', alt: 'NAS6203 close-tolerance bolts', form: 'bought hardware', density: 0.283, allowables: [['AN3 single shear', '2,126 lb', 'Fsu 75 ksi × π/4 × 0.190²: MIL-HDBK-5J table 2.3.1.0(c2), 125 ksi column (files.engineering.com excerpt, accessed 2026-11-19), derived']] },
  process: [{ op: 'Rig', spec: 'Sticks and pedals neutral on the rigging bar; rod lengths set; stops set and safety-wired; cable tension 15–25 lb.' }, { op: 'Inspect', spec: 'Full travel each axis with no contact; free play ≤ 1/32 in; duplicate inspection signed.' }],
  checks: ['c27-joints'],
  rules: [{ id: 'cotter', label: 'Every rotating joint castle-nutted and cotter-pinned (cotters / joints)', v: lines.find((l) => l.id === 'cotter').qty / J, min: 1 }],
  mass: { each: lines.reduce((a, l) => a + l.qty * l.each, 0), from: 'hardware lines (unit masses typed from memory)' },
  hardware: lines, hardwareNote: lines.map((l) => `${l.qty} × ${l.std}`).join(', '),
  interfaces: [
    ...icdIface(['IC9']).map((x) => ({ ...x, id: 'I1', with: 'LEZ-32-311 master cylinders (block D)', feature: 'joints' })),
    { id: 'I2', with: 'Openings in other parts', feature: 'rig', what: 'Every crossing named with its position and size', check: () => ({ ok: CORRIDOR().ok, detail: OPENINGS().map((o) => `${o[0]}: ${o[1]}`).join(' | ') }) },
    { id: 'I3', with: 'Firewall LEZ-53-180', feature: 'joints', what: 'No control line through the firewall', check: () => ({ ok: L.X[0] <= GEO.firewall * 12 + 1e-6 && L.X[1] > 11.66, detail: `the corridor leaves the spar at BL ${fx(L.X[1])}, outboard of the cowl (BL 11.66)` }) },
    ...icdIface(ICD_C.map((c) => c.id).filter((id) => id !== 'IC9')), ...closedIface(),
  ],
  tooling: { needed: true, text: 'Rigging bar clamping both sticks and the pedals at neutral; travel boards for each surface; cable tensiometer.' },
  sourcing: { blank: 'Bought hardware', vendor: 'Aircraft Spruce (AN hardware)', url: 'https://www.aircraftspruce.com/menus/ha/anbolts.html', cost: 30.0, costAsOf: '2026-11-18', perAircraft: 1, lead: 'Stock', note: 'Approximate.' },
  rigTable: rig,
};
