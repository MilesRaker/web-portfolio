// 2026-11-23: DC-012 cabin routing clearance pass (parts/wpR1_clear.js) and DC-013 wheel pants and their mounting
// (parts/wpD3_pant.js, defn/d_pant.js): the revisions they make to existing records. Applied once to the merged DEFS
// (release.js), after the occupant revs. New records LEZ-32-320 and LEZ-32-321 carry their own rev A. Notional.
const DATE = '2026-11-23';
const next = (r) => String.fromCharCode((r || 'A').charCodeAt(0) + 1);
const R10 = 'DC-012 cabin routing clearance pass: every cabin route is tested against the cockpit equipment\'s solids (instruments, switches, quadrant, pedals, stick, fuel selector, seat) with the wire\'s radius plus 0.12 in, and moved where it passed through';
export const REVS_R1 = {
  'LEZ-24-161': ['Routed clear of the quadrant and pedals', `${R10}. The canopy-switch lead (S13) now drops outboard of the throttle quadrant (LEZ-76-100) in two 45° corners under the front headset jacks and crosses inboard behind the quadrant at FS 52.45, instead of running through it. The main feed climbs 0.65 in over the GEA 24 shelf (LEZ-77-100) and 0.95 in over the front rudder pedals (LEZ-27-150), and its run across behind the avionics shelf (LEZ-31-160) sits 0.2 in further aft (0.25 in rule). Its left-side raceway (LS) steps 0.8 in inboard around the quadrant. Tightest bend 0.85 in (was 0.80).`],
  'LEZ-74-100': ['Left raceway step at the quadrant', `${R10}. Rides the left raceway (LS), which steps 0.8 in inboard around the throttle quadrant.`],
  'LEZ-77-100': ['Clear of the pedal; left raceway step', `${R10}. Sensor harness nudged clear of the front rudder pedals (LEZ-27-150); rides the left raceway step at the quadrant.`],
  'LEZ-31-121': ['Clear of the EIS', `${R10}. Moved 1.5 in forward, clear of the GEA 24 and its shelf (LEZ-77-100); rides the left raceway step. The solid is rebuilt from the new route.`],
  'LEZ-23-125': ['Left raceway step', `${R10}. Rides the left raceway step (LS) around the throttle quadrant; right-side run unchanged. The solid is rebuilt from the new route.`],
  'LEZ-23-110': ['Right raceway steps at the stick and the trim', `${R10}. Rides the right front raceway (RF), which steps 1.0 in around the side stick (LEZ-27-110) and 0.45 in diagonally up of the pitch trim (LEZ-27-165). J EMC separation held. The solid is rebuilt from the new route.`],
  'LEZ-34-111': ['Right raceway steps', `${R10}. Rides the right front raceway (RF) and steps with it. The solid is rebuilt from the new route.`],
  'LEZ-25-162': ['Right raceway steps', `${R10}. Rides the right front raceway (RF) and steps with it. The solid is rebuilt from the new route.`],
  'LEZ-34-130': ['Clear of the stick, quadrant and trim', `${R10}. Moved 1.9 in clear of the headset jacks (LEZ-23-120), 1.0 in clear of the throttle quadrant and 0.6 in clear of the side stick; laid by hand around the pitch trim (LEZ-27-165).`],
  'LEZ-31-100': ['Left pass-through follows the raceway', `${R10}. The left raceway's pass-through hole moves 0.004 in with its members; size unchanged. The solid is rebuilt.`],
  'LEZ-32-300': ['Open item O1 closed: wheel pants defined', 'DC-013: the wheel pants now have their own record (LEZ-32-320, rev A, in work: vendor to confirm) and mounting (LEZ-32-321, rev A): an inboard bracket under the two upper axle bolt heads with two #10 screws through the pant\'s inner wall, and an axle-end standoff on the axle nut\'s pant boss with an AN4 bolt through the outer wall. The inner wall is slotted for the leg end and the brake hose (gear-pant-cutout).'],
  'LEZ-32-310': ['Upper axle bolts one length longer', 'DC-013: the wheel-pant bracket web (LEZ-32-321, 0.125 in) is clamped under the heads of the two upper axle bolts on the torque plate\'s outboard face; those two bolts become AN5-17A (lower two stay AN5-16A). Torque unchanged.'],
};
export function applyR1(DEFS) {
  for (const [pn, [short, change]] of Object.entries(REVS_R1)) { const d = DEFS[pn]?.def; if (!d || (d.revs || []).some((r) => r.date === DATE && r.phase === 'r1')) continue;
    const rev = next([d.rev, ...(d.revs || []).map((r) => r.rev)].filter(Boolean).sort().at(-1)); d.rev = rev; d.revs = [...(d.revs || []), { rev, date: DATE, short, change, phase: 'r1' }]; }
  // LEZ-32-300: O1 is closed (the open interface row becomes a checked interface to the pant record)
  { const d = DEFS['LEZ-32-300']?.def; if (d && Array.isArray(d.interfaces)) { const i = d.interfaces.findIndex((x) => x.id === 'O1' && x.open);
    if (i >= 0) d.interfaces[i] = { id: 'O1', with: 'LEZ-32-320 / -321 wheel pant and mounting', feature: 'axle', what: 'CLOSED (DC-013): pant on the axle and the leg end through LEZ-32-321', check: () => ({ ok: true, detail: 'see LEZ-32-320 I1–I4 and gear-pant-mount, gear-pant-cutout' }) }; }
    if (d && Array.isArray(d.checks)) for (const c of ['gear-pant-mount', 'gear-pant-cutout']) if (!d.checks.includes(c)) d.checks.push(c); }
  // LEZ-32-310: the upper axle bolts
  { const d = DEFS['LEZ-32-310']?.def; if (d && Array.isArray(d.hardware) && !d.hardware.some((h) => /17A/.test(h.std))) {
    const h = d.hardware.find((x) => /^AN5-16A/.test(x.std)); if (h) { h.qty = 2; h.desc = 'axle bolts, lower two, laterally through the leg end, flange and torque plate'; d.hardware.push({ std: 'AN5-17A', qty: 2, desc: 'axle bolts, upper two: also clamp the wheel-pant bracket web (LEZ-32-321)' }); } } }
}
