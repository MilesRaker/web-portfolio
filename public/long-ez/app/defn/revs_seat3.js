// Seat on the belly, landing brake aft (design change DC-008, 2026-11-22; owner: "Move the seat as low as possible ... Move the
// flap to get the seat 3 inches lower"). Applied once to the merged DEFS (release.js) after the seat-2 batch. Plain text, no live
// values. Notional.
const DATE = '2026-11-22';
const next = (r) => String.fromCharCode((r || 'A').charCodeAt(0) + 1);
const WHY = 'The pilot sat on a sandwich pan at WL 28.5, raised over the landing brake\'s actuator under the seat; the canopy check (claude/canopy-check.md) found the seat, not the canopy, short of head room';
export const REVS_SEAT3 = {
  'LEZ-53-170': ['3 in lower; actuator hard point', `${WHY}. The seat back drops 3 in with the seat (foot WL 25.3 on the belly's inner skin, was 28.3); its top edge, the knee, is now WL 39.8, below the sill. The leg openings are 9.5 in tall (was 6.5) so their tops stay where they were. A hard point in the aft face at the centre line takes the landing-brake actuator's anchor bracket (LEZ-27-171).`],
  'LEZ-53-171': ['3 in lower with the seat back', 'The upper panel and headrest drop 3 in with the seat back (knee WL 39.8, top edge WL 43.8, headrest apex WL 51.3); below the sill the panel is 24 in wide on the shell.'],
  'LEZ-25-100': ['Front pan replaced by a liner on the belly', `${WHY}. The front sandwich pan, its webs and the thigh-support plate are replaced by a 4-ply 6781 liner bonded to the belly's inner skin from FS 41.5 to the seat back's foot; its top at the seat point is WL 25.3 (the seat surface 3.2 in lower). The pilot's 6 g on the belly needs an HT101 core insert in the shell under the liner (cab-floorF; LEZ-53-150). The rear pan is unchanged and now sizes the sandwich.`],
  'LEZ-25-120': ['Cushion contoured to the belly', 'The front cushion is shaped to the belly\'s curve under a flat top 2 in above the liner at the seat point (the seat point 3.2 in lower); the lower back pad is 13.5 in wide (was 14.5), clear of the left raceway behind the seat back.'],
  'LEZ-25-130': ['Lap anchors lower', 'The lap-belt anchors follow the lower seat: WL 27.4 (was 28.0), at the wall, outboard of the hips.'],
  'LEZ-25-150': ['Carpet on the thigh liner', 'The thigh-support carpet lies on the new liner, contoured to the belly, FS 41.5–44.'],
  'LEZ-27-170': ['Moved 12.75 in aft', 'The panel moves from FS 52–68 to FS 64.75–80.75 (BL ±6, 16 in long, unchanged), out from under the pilot so the seat can sit on the belly; owner decision after the pitch estimate (about 125 in·lb more nose-down with it open at 80 kt, like 0.09 in of forward CG). The horn is now a bracket 2.56 in from the hinge at 25° up from the panel, just aft of the hinge.'],
  'LEZ-27-171': ['Upright behind the seat back', 'The actuator now stands almost upright behind the front seat back, anchored on a bracket 0.75 in off a hard point in its aft face (FS 66.3, WL 32.8) and pushing the horn down to open: 2.85 in of the 3 in stroke, 131 lb peak against 169 lb rated (was anchored on a keel bracket under the pilot\'s seat).'],
  'LEZ-27-172': ['Rerouted behind the seat back', 'The harness leaves the left power raceway at FS 69.5 and runs inboard behind the seat back to the actuator\'s motor end (was down the side wall and under the pilot\'s seat).'],
  'LEZ-53-150': ['Brake opening aft; core insert under the seat', 'The landing-brake opening moves to FS 64.75–80.75 (was 52–68), its doublers with it. Under the pilot, who now sits on the belly, the shell core is HT101 instead of HT61 over FS 44–57, BL ±8 (cab-floorF, about +0.1 lb, not yet in this part\'s mass).'],
  'LEZ-34-110': ['Blade forward of the brake', 'The transponder blade moves from FS 81 (now over the brake opening) to FS 61.5, behind the front seat back\'s foot, with its ground plane FS 58.75–64.25, 0.5 in clear of the opening.'],
  'LEZ-34-111': ['Coax down behind the seat back', 'The transponder coax leaves the right raceway at FS 69 and drops behind the front seat back, inboard above the primer lines, to the blade at FS 61.5 (was down at FS 44.9 and along the belly under the pilot).'],
};
export function applySeat3(DEFS) {
  for (const [pn, [short, change]] of Object.entries(REVS_SEAT3)) { const d = DEFS[pn]?.def; if (!d || (d.revs || []).some((r) => r.date === DATE && r.phase === 'seat-3')) continue;
    const rev = next([d.rev, ...(d.revs || []).map((r) => r.rev)].filter(Boolean).sort().at(-1)); d.rev = rev; d.revs = [...(d.revs || []), { rev, date: DATE, short, change, phase: 'seat-3' }]; }
}
