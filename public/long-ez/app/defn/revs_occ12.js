// Occupant posture model (design change DC-009, 2026-11-22; owner: "Make the pilot model more realistic, as you suggested").
// Applied once to the merged DEFS (release.js) after the seat-3 batch. Plain text, no live values. Notional.
const DATE = '2026-11-22';
const next = (r) => String.fromCharCode((r || 'A').charCodeAt(0) + 1);
export const REVS_OCC12 = {
  'LEZ-25-130': ['Straps through the new shoulder model', 'The front shoulder straps are drawn through the 95th male\'s back at shoulder height on the new torso line (FS 70.7, WL 48.5; was FS 70.6, WL 50.9): the hip point is now on the seat surface and the back rests on the headrest pads only up to the shoulders.'],
  'LEZ-25-120': ['Head clearance from the posture model', 'The head-clearance check now places the shoulder joint half a chest depth forward of the back and the head on the neck (ear over shoulder, eyes level), resting on the headrest pad when the pad is behind the back of the head (ANSUR II chest depth, head length, tragion-top of head). No change to the cushions or pads.'],
  'LEZ-25-121': ['Head clearance from the posture model', 'The rear head-clearance check uses the same posture model as the front seat (shoulder joint forward of the back, head on the neck). No change to the cushions.'],
};
export function applyOcc12(DEFS) {
  for (const [pn, [short, change]] of Object.entries(REVS_OCC12)) { const d = DEFS[pn]?.def; if (!d || (d.revs || []).some((r) => r.date === DATE && r.phase === 'occupant-12')) continue;
    const rev = next([d.rev, ...(d.revs || []).map((r) => r.rev)].filter(Boolean).sort().at(-1)); d.rev = rev; d.revs = [...(d.revs || []), { rev, date: DATE, short, change, phase: 'occupant-12' }]; }
}
