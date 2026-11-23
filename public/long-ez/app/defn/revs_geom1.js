// Small geometry fixes from the 2026-11-22 review of the parts not passing validation (owner: "work the small geometry tweaks").
// Applied once to the merged DEFS (release.js) after the rudder-balance batch. Notional.
const DATE = '2026-11-22';
const next = (r) => String.fromCharCode((r || 'A').charCodeAt(0) + 1);
export const REVS_GEOM1 = {
  'LEZ-56-110': ['Pin raised 0.035 in on a shim', 'Interface I1 (LEZ-56-100, the right rail edge): opening through 0–80°, the canopy frame\'s rail edge dipped 0.027 in past the shell\'s cut. The pin axis is raised from 0.02 to 0.055 in above the outer sill corner on a 0.035 in shim strip under the sill leaf (0.03 in is the least that clears; the canopy\'s sill land stays within its 1/16 in build-up); the edge now swings clear of the cut.'],
  'LEZ-25-110': ['Left console top lowered 0.10 in', 'Rule: the left console top stood 0.19 in under the canopy latch hook tongues (≥ 0.25 required). The left console top is lowered from WL 39.25 to WL 39.15, giving 0.29 in; the throttle quadrant below it still clears.'],
  'LEZ-32-231': ['Thin-wall bushings; brackets 0.03 in outboard', 'Interface I2 (the swept nose fork and wheel): at 76.5° of retraction the fork legs passed 0.112 in from the forward bracket\'s inner face (≥ 0.125 required), and the bracket could not move outboard round its Ø0.375 bushing. The three NAS75-4 bushings become 1/4 × 5/16 × 3/8 in SAE 841 sintered-bronze sleeves (0.031 in wall), and the brackets\' inner faces move from BL 1.92 to 1.95, keeping 0.028 in of bracket inboard of the bushing; the legs now clear by 0.142 in.'],
};
export function applyGeom1(DEFS) {
  for (const [pn, [short, change]] of Object.entries(REVS_GEOM1)) { const d = DEFS[pn]?.def; if (!d || (d.revs || []).some((r) => r.date === DATE && r.phase === 'geom-1')) continue;
    const rev = next([d.rev, ...(d.revs || []).map((r) => r.rev)].filter(Boolean).sort().at(-1)); d.rev = rev; d.revs = [...(d.revs || []), { rev, date: DATE, short, change, phase: 'geom-1' }]; }
}
