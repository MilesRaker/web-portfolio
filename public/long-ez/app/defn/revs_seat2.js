// Upper seat back and headrest to builders' photos, small-pilot cushion (design change DC-007, 2026-11-22; owner: "Small pilots
// will use cushions. ... Redesign the head rest and upper portion of the seat to match images of the seats you have found.").
// Applied once to the merged DEFS (release.js) after the seat-1 batch. Plain text, no live values. LEZ-53-171 is new (its own
// rev A). Notional.
const DATE = '2026-11-22';
const next = (r) => String.fromCharCode((r || 'A').charCodeAt(0) + 1);
export const REVS_SEAT2 = {
  'LEZ-53-170': ['Ends at the knee; anchors to LEZ-53-171', 'Builders\' front seats (longezpush.com Ch. 26) slope about 20.5 in up from the floor, then stand vertical for about 4 in under the headrest. The reclined back now ends at that knee, 20.5 in up the slope (top edge WL 42.8 at FS 71.8, was WL 46.7 at FS 75.7); the vertical top section, the shoulder-harness anchors and the headrest are the new LEZ-53-171, standing on this edge. The anchor check f170-sh now carries LEZ-53-171\'s strap load through the solid band to the sill.'],
  'LEZ-25-120': ['Upper and headrest pads; small-pilot cushion', 'The back pads follow the new seat top: the lower pad on the reclined back up to the knee, an upper pad 9.5 in wide on LEZ-53-171\'s vertical face between the shoulder straps, and two headrest pads 0.9 in thick on the round-topped headrest, split at mid-height (as builders trim and split them: longezpush.com Ch. 26); the old headrest roll is gone. Small pilots use a removable 2 in back cushion (owner decision), which brings the 5th-percentile female within reach of the stick, throttle, mixture and key.'],
  'LEZ-25-130': ['Shoulder straps to LEZ-53-171', 'The front shoulder straps end on the anchors now on LEZ-53-171, BL ±5.5 (was ±3.5), 0.75 in under its top edge at WL 46.0, beside the upper pad.'],
};
export function applySeat2(DEFS) {
  for (const [pn, [short, change]] of Object.entries(REVS_SEAT2)) { const d = DEFS[pn]?.def; if (!d || (d.revs || []).some((r) => r.date === DATE && r.phase === 'seat-2')) continue;
    const rev = next([d.rev, ...(d.revs || []).map((r) => r.rev)].filter(Boolean).sort().at(-1)); d.rev = rev; d.revs = [...(d.revs || []), { rev, date: DATE, short, change, phase: 'seat-2' }]; }
}
