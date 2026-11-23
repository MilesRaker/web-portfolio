// Final integration fix (Miles's report: "wire routes still collide with the instrument panel", LEZ-31-100 rev C): the
// revisions it makes to the other parts' records. The flat parts' pass-through holes are now sized from each line's swept
// footprint through the whole thickness, with a slab check on each record; the lines that could not get a legal hole in the
// panel were re-routed by their owners' route definitions. Applied once to the merged DEFS (release.js). Notional.
const DATE = '2026-11-19';
const next = (r) => String.fromCharCode((r || 'A').charCodeAt(0) + 1);
const HOLES = 'Pass-through holes sized from each line\'s swept footprint through the whole thickness (the tube at both faces and between, its radius and clearance), not from the mid-plane crossing alone, and built after every parts module has loaded (lines re-routed later are in the table)';
export const REVS = {
  'LEZ-53-160': ['Holes from the swept footprint', `${HOLES}. The starter and ground cables (2 AWG) ran 0.35 in into the laminate (their Ø 0.75 hole held one of the two); they and the forward harness now pass in one Ø 3.00 grommeted hole, 0.26 in clear of the lower canard bolt. New check f22-slab.`],
  'LEZ-53-165': ['Holes from the swept footprint', `${HOLES}; the canopy-switch, forward-harness, cable and pitot-static holes grow 1/16–1/8 in. New check f28-slab.`],
  'LEZ-53-175': ['Holes from the swept footprint', `${HOLES}. The rudder conduits (C) now run off the wall from FS 126 / 127, so they pass in holes rather than edge slots; the ELT remote rides the RF bundle and shares the coax hole. New check f175-slab.`],
  'LEZ-53-170': ['Holes from the swept footprint', `${HOLES}. The seat back is reclined, so every line drifts 0.25–0.5 in through it: the power and signal bundles share one hole, the roll tube keeps its own, and the right leg opening is widened over the rear stick's footprint (it ran 0.30 in into the laminate). New check f170-slab.`],
  'LEZ-53-180': ['Power boot Ø 3.00', 'The power boot grows from Ø 2.50 to Ø 3.00 at the same centre: the starter and ground cables approach it at an angle and their swept footprints reached 0.05 in into the panel. Block I\'s FW_LAYOUT copy follows. New check fw-slab (every line through the panel and fire layers clear of the material in its hole).'],
  'LEZ-08-105': ['Holes from the swept footprint', `${HOLES}; the forward harness, which ran 0.58 in into the laminate with no hole, gets one. New check ballast-slab.`],
  'LEZ-27-151': ['Panel crossing and wall run', 'The first leg is re-aimed so each conduit crosses the panel at BL ±7.7 / 7.9, WL 38.1 / 38.3 in its own hole (rev B: through the web beside the pitch rod and the console harness); the wall run ends at FS 126 (right) / 127 (left) so the conduits pass the rear seat bulkhead in holes, not edge slots. Horn arm, cable load and pedal travel re-derived.'],
  'LEZ-27-150': ['Cable leg re-aimed', 'The rudder cable\'s first leg (LEZ-27-151 rev B) leaves the horn in a new direction: the horn\'s effective arm, the cable load and the pedal travel are re-derived; no change to the pedal parts.'],
  'LEZ-74-100': ['Panel crossing', 'The P-leads\' first node moves to BL −10.30, WL 37.35 just ahead of the panel, so the run crosses it square in the left signal bundle hole (rev B: diagonally through the web beside the rudder cable).'],
  'LEZ-77-100': ['Panel crossing', 'A node at FS 40.0 (BL −10.0, WL 37.1) ahead of the panel: the harness crosses it square in the left signal bundle hole instead of diagonally from the shelf.'],
  'LEZ-24-160': ['Under the panel edge', 'The cabin heads rise aft of FS 44.5 (was 43.0), so both paths stay ≥ 1/8 in under the panel\'s bottom cut through its whole thickness (they grazed it by up to 0.22 in).'],
  'LEZ-80-110': ['Under the panel edge', 'The starter cable\'s head rises aft of FS 44.0 (was 43.0) and stays ≥ 1/8 in under the panel\'s bottom cut through its whole thickness; both cables pass F22 in the enlarged shared hole and the firewall in the Ø 3.00 boot.'],
  'LEZ-33-110': ['Under the panel edge', 'The head rises aft of FS 44.5 (was 43.0): ≥ 1/8 in under the panel\'s bottom cut through its whole thickness (it grazed the edge).'],
  'LEZ-24-161': ['Panel crossing', 'The canopy-switch lead gets a node at FS 40.3 so it crosses the panel square in the left signal bundle hole.'],
  'LEZ-24-162': ['F22 crossing', 'The corner at F22 moves to BL −5.30, WL 37.10: the harness passes F22 with the starter and ground cables, clear of the lower canard bolt.'],
  'LEZ-23-110': ['Panel crossing, hood', 'Head nodes at FS 38.2 (BL 8.90, WL 41.0) and FS 39.4 (BL 10.40, WL 35.3): clear of the glareshield hood (the coax ran 0.20 in into it) and of C\'s pitch-rod guide; crosses the panel square in the RF hole.'],
  'LEZ-34-111': ['Panel crossing', 'Transponder head nodes at FS 38.4 (BL 9.90) and FS 39.4 (BL 10.25, WL 35.5): clear of the hood and the pitch-rod guide; crosses the panel square in the RF hole (rev A: 0.40 in from the outline).'],
  'LEZ-25-162': ['RF bundle', 'The ELT remote cable rides the RF bundle (was the RS signal raceway), from a node at FS 39.0 (BL 10.45, WL 36.3): it crosses the panel in the RF hole (rev A: through the web 0.30 in deep) and passes the seat back with the coax, clear of C\'s roll tube.'],
  'LEZ-23-125': ['Panel crossings', 'Right branch: node at FS 40.6 (BL 7.30, WL 37.05), its own pass hole (B\'s declared H-CR is no longer needed). Left branch: node at FS 39.3 (BL −8.20, WL 39.6), its own hole clear of the warning unit (rev A: through the web 0.32 in deep).'],
  'LEZ-31-121': ['Panel crossing', 'Nodes at FS 39.0 (BL −9.90, WL 38.0) and FS 41.6: the harness crosses the panel square in the left signal bundle hole.'],
  'LEZ-34-130': ['Panel crossing, hood', 'The static lines\' nodes move to FS 40.4 (BL ±10.0, WL 38.85) and FS 38.6 (BL ±9.9, WL 39.4): they cross the panel square in their own holes 0.70 in inside the outline (rev A: 0.10 in into the rim), under the key switch and clear of the glareshield hood; still rising to the instruments.'],
};
export function applyRevs(DEFS) {
  for (const [pn, [short, change]] of Object.entries(REVS)) { const d = DEFS[pn]?.def; if (!d || (d.revs || []).some((r) => r.date === DATE && r.short === short)) continue;
    const rev = next([d.rev, ...(d.revs || []).map((r) => r.rev)].filter(Boolean).sort().at(-1)); d.rev = rev; d.revs = [...(d.revs || []), { rev, date: DATE, short, change }]; }
}
