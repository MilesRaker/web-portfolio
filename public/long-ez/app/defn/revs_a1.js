// Overall length, option A1 (decision 2026-11-21: the plans' 201.4 in overall length runs from the nose tip to the winglet /
// rudder trailing edge; the nose tip stays at FS 0): the revisions it makes to the records. The winglet LE sweep is derived
// from OVERALL in structures.js (37° → 27.16°, TE FS 215.3 → 201.4); the rudder, its horn, the rudder cable's fin pulley and
// fairlead and the COM element follow from the winglet frame. Applied once to the merged DEFS (release.js), after the
// occupant revs. Study: project doc claude/length-options.md. Notional.
const DATE = '2026-11-21';
const next = (r) => String.fromCharCode((r || 'A').charCodeAt(0) + 1);
const WHY = 'Overall length (option A1): the plans\' 201.4 in (OM dimensions table) runs from the nose tip to the winglet trailing edge; the winglet LE sweep is now derived from it (structures.js OVERALL, nose tip FS 0) and goes from 37° to 27.16°, moving the fin tip trailing edge from FS 215.3 to 201.4';
export const REVS_A1 = {
  'LEZ-27-150': ['Pedal travel for full rudder 12.0°', `${WHY}. The rudder needs 0.404 in of cable for 25° (was 0.377 in), so the pedal travel to full rudder grows from 11.2° to 12.0°. The pedal geometry is unchanged; the pedal sweep checks hold.`],
  'LEZ-27-160': ['Pedal stops at 12.0°', `${WHY}. The pedal stops move with the pedal travel for full rudder: 11.2° → 12.0° (cable stroke 0.377 → 0.404 in).`],
  'LEZ-27-100': ['Shows the revised rudder cable', `${WHY}. The installation shows LEZ-27-151 rev E (fin pulley 0.98 in forward) and the 12.0° pedal stops (LEZ-27-160); nothing else changes.`],
  'LEZ-57-130': ['Sweep 27.16° for the overall length', `${WHY}. Same chords, height, cant and airfoil; the fin is sheared forward by h·(tan 27.16° − tan 37°), 13.9 in at the tip. Caps re-size 11 → 10 plies 6781 per side (winglet-cap MS 0.175; root web MS 0.183). The COM dipole channel (right fin) moves up 1.5 in to h 11.5–55.5 in (see LEZ-23-110). New directional-stability checks yaw-cnb and yaw-cnr (parts/wpS1_yaw.js, requirement R-STR-yaw). The solid is rebuilt.`],
  'LEZ-55-193': ['Follows the winglet sweep', `${WHY}. The rudder keeps its chord fraction and span; it moves with the fin. The horn's cable point moves from FS 177.05 to 176.07 (BL and WL unchanged); horn MS unchanged (0.186). The solid is rebuilt.`],
  'LEZ-27-151': ['Fin pulley follows the horn', `${WHY}. The pulley in the fin moves 0.98 in forward with the rudder horn (FS 174.05 → 173.07). C's fairlead point stays at FS 172.70; the cable's skin crossings move 0.1 in (winglet root face FS 172.89 → 172.75, wing tip close-out 172.84 → 172.74), and the pulley now sits only 0.37 in aft of the fairlead. The cable now wraps the pulley more (resultant factor 1.09 → 1.28): tip-pulley MS 1.40 → 1.04. Cable stroke for 25° rudder 0.377 → 0.404 in, pedal travel 11.2° → 12.0°. The solid is rebuilt.`],
  'LEZ-57-110': ['Tip fairlead hole on the new cable line', `${WHY}. The rudder cable's hole in the tip close-out moves 0.1 in forward with the cable line (FS 172.84 → 172.74; LEZ-27-151). Planform unchanged. The solid is rebuilt.`],
  'LEZ-23-110': ['Element raised 1.5 in', `${WHY}. With the fin less swept the element's lower end came 0.5 in inside its λ/2π keep-out (14.79 in at 127 MHz) from the wing tip's LSP strips (rf-keepout MS −0.036). The element is raised 1.5 in: h 11.5–55.5 in, feed h 33.5 in, ferrite choke h 8.5–11.5 in (rf-keepout MS 0.054). The I4 check now reads the rudder horn's computed position. The routed coax shortens slightly (32.8 → 32.6 ft: the fin moved forward more than the feed rose; jrf-com MS 7.83 → 7.85); the solid is rebuilt.`],
};
export function applyA1(DEFS) {
  for (const [pn, [short, change]] of Object.entries(REVS_A1)) { const d = DEFS[pn]?.def; if (!d || (d.revs || []).some((r) => r.date === DATE && r.short === short)) continue;
    const rev = next([d.rev, ...(d.revs || []).map((r) => r.rev)].filter(Boolean).sort().at(-1)); d.rev = rev; d.revs = [...(d.revs || []), { rev, date: DATE, short, change, phase: 'a1' }]; }
  // directional stability rows (parts/wpS1_yaw.js) on the winglet record; yaw-cndr stays on requirement R-STR-yaw only (open finding)
  { const d = DEFS['LEZ-57-130']?.def; if (d && Array.isArray(d.checks)) for (const c of ['yaw-cnb', 'yaw-cnr']) if (!d.checks.includes(c)) d.checks.push(c); }
}
