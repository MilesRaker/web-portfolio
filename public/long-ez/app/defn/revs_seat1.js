// Front seat to the plans (design change DC-006, 2026-11-22; owner: "make the seat match the plans as much as possible ...
// 6 in forward and 45°"). Applied once to the merged DEFS (release.js) after the geometry-fix batch. Plain text, no live values. Notional.
const DATE = '2026-11-22';
const next = (r) => String.fromCharCode((r || 'A').charCodeAt(0) + 1);
const WHY = 'The occupant sat at FS 65.6 against the plans\' pilot weight-and-balance arm of 59 in, and the seat back was reclined 42° against the plans\' 45° to the floor';
export const REVS_SEAT1 = {
  'LEZ-53-170': ['Seat back 6 in forward at 45°', `${WHY}. The seat back's foot moves from FS 63.3 to FS 57.3 and the recline from 42° to 45°; the top edge stays at WL 46.7 and is now at FS 75.7 (was 79.8). The outline, pass-through holes, shoulder-harness anchors and installation gauge follow the new plane. The 50th-percentile male's seat point is now at FS 59.8.`],
  'LEZ-25-100': ['Pan and thigh ramp 6 in forward', `${WHY}. The front pan's leading edge moves from FS 50 to FS 44 (its aft edge follows the seat back, now FS 56.2), keeping a 12 in pan. The thigh support moves from FS 44–50 to FS 41.5–44, just aft of the panel, and rises at the plans' 30° front ramp to WL 29.9 (was a 22° ramp to WL 31.0).`],
  'LEZ-25-120': ['Cushion follows the pan', `${WHY}. The front seat cushion follows the pan, FS 44–56.0 (was FS 50–62.3); the back pad follows the seat back at 45°.`],
  'LEZ-25-110': ['Inboard edges 0.1 in outboard', 'With the seat 6 in forward the 95th-percentile male\'s thigh rises beside the hip, where the consoles stand: the leg came 0.44 in from the console inboard edges (≥ 0.5 in required). Both inboard edges move from BL ±8.6 to BL ±8.7, giving 0.54 in.'],
  'LEZ-25-130': ['Lap anchors 6 in forward', `${WHY}. The lap-belt hard points move with the seat from FS 62.5 to FS 56.5; the shoulder anchors follow the seat back.`],
  'LEZ-25-150': ['Thigh-ramp carpet follows the ramp', 'The carpet on the thigh support follows the ramp to FS 41.5–44 (seat moved 6 in forward, LEZ-25-100).'],
  'LEZ-28-135': ['Knob forward with the seat; Ø 1.5', 'With the seat 6 in forward the knob\'s old spot (FS 64.8, WL 33.3) fell behind the seat back, and the wall beside the pilot\'s new hip carries the throttle and mixture cables\' drop under both left raceways. The knob moves to FS 61.0, BL −9.6, WL 35.75 and shrinks from Ø 2.0 to Ø 1.5 in, above the cables and under the signal raceway; the universal joint moves 0.3 in outboard (BL −9.2) to clear the power feed at FS 70. Open item: the left power raceway passes 0.17 in under the knob (rule 0.25 in); a clamp holding the bundle down at FS 61 is the expected fix.'],
  'LEZ-53-175': ['Selector shaft hole follows the shaft', 'The fuel selector drive\'s universal joint moved 0.3 in outboard (LEZ-28-135, seat moved 6 in forward); the shaft\'s pass-through hole follows it.'],
  'LEZ-24-160': ['Re-routed past the moved selector knob', 'The left power raceway re-steps along the wall past the fuel selector knob\'s new position (LEZ-28-135, seat moved 6 in forward).'],
  'LEZ-33-110': ['Re-routed past the moved selector knob', 'The left power raceway re-steps along the wall past the fuel selector knob\'s new position (LEZ-28-135, seat moved 6 in forward).'],
  'LEZ-80-110': ['Re-routed past the moved selector knob', 'The left power raceway re-steps along the wall past the fuel selector knob\'s new position (LEZ-28-135, seat moved 6 in forward); it passes 0.17 in under the knob (open item on LEZ-28-135).'],
};
export function applySeat1(DEFS) {
  for (const [pn, [short, change]] of Object.entries(REVS_SEAT1)) { const d = DEFS[pn]?.def; if (!d || (d.revs || []).some((r) => r.date === DATE && r.phase === 'seat-1')) continue;
    const rev = next([d.rev, ...(d.revs || []).map((r) => r.rev)].filter(Boolean).sort().at(-1)); d.rev = rev; d.revs = [...(d.revs || []), { rev, date: DATE, short, change, phase: 'seat-1' }]; }
}
