// WPA9 — block A, final integration (2026-11-19): the LEFT wing panel's own features. LEZ-57-110 is one part drawn
// right-hand (its solid and cut registry are the right panel); the left panel adds three features for block J's GMU 11
// (option A, the aft lane): the magnetometer pocket in the forward core with a lower-skin cover, the lined branch tunnel
// from the aft conduit's grommeted side port at BL −86 to the pocket, and the spar-web grommet where the branch crosses the
// spar block and webs at BL −97…−101. Geometry from J's layout (wpJ0 MAG_AT, MAG_CONDUIT_EXIT, MAG_WEB) and J's GMU 11
// envelope; clearances against the wing section's caps, spar block and skins (wpC8 wingClearOf, mirrored to the right-panel
// frame). Inches [FS, BL, WL]; solid-frame cuts are [BL, FS, WL]. Notional; not for construction.
import { MAG_AT, MAG_CONDUIT_EXIT, MAG_WEB, AFTC, ENV as J_ENV } from './wpJ0_layout.js';
import { wingClearOf, wingRegions, wingFloor, wingCeil, cutDist, EXTRA_OPENINGS, SYSC } from './wpC8_cuts.js';
import { WCUTS } from './wp17_wing_panel.js';
import { registerConduit } from './wp12_routing.js';

const r4 = (x) => Math.round(x * 1e4) / 1e4;
/** the GMU 11 as J draws it, [FS, BL, WL]: read live from J's envelope (integration 2026-11-19, ICD A-S1: the true GMU 11 body
 *  3.78 × 2.74 × 0.93 in laid across, Garmin G3X IM 190-01115-01 rev AV) and J's bracket plate (wpJ1 GMU_BRKT 3.8 × 2.9 × 0.040 in) */
const GMU_PLATE = { t: 0.040, w: 3.8, l: 2.9 };   // = wpJ1_avionics GMU_BRKT (copied: wpJ1 imports this block's modules)
export const GMU = { c: MAG_AT.map(r4), body: [J_ENV.gmu.box[1], J_ENV.gmu.box[0], J_ENV.gmu.box[2]], plate: [GMU_PLATE.l, GMU_PLATE.w, GMU_PLATE.t], clr: 0.25 };
const half = (k) => Math.max(GMU.body[k], GMU.plate[k]) / 2 + GMU.clr;
/** pocket: the forward core removed round the unit + 0.25 in, floor on the lower skin, top 0.25 in over the unit */
export const POCKET = (() => { const fs = [r4(GMU.c[0] - half(0)), r4(GMU.c[0] + half(0))], bl = [r4(GMU.c[1] - half(1)), r4(GMU.c[1] + half(1))];
  const floor = Math.max(...[fs[0], fs[1]].flatMap((x) => bl.map((y) => wingFloor(Math.abs(y), x)))), top = r4(GMU.c[2] + GMU.body[2] / 2 + GMU.clr);
  return { fs, bl, wl: [r4(floor), top] }; })();
/** lower-skin access opening (inside the pocket by 0.10 in each side; the unit and its plate pass through it), 2-ply BID
 *  ring doubler 1 in wide, 0.032 2024-T3 cover on 10 nutplates with non-magnetic (A286 / 316 CRES) screws */
export const OPENING = { id: 'acc-gmu', what: 'GMU 11 pocket cover (left wing lower skin)', fs: [r4(POCKET.fs[0] + 0.10), r4(POCKET.fs[1] - 0.10)], bl: [r4(-POCKET.bl[1] + 0.10), r4(-POCKET.bl[0] - 0.10)], shape: 'rounded rectangle, 0.5 in corner radii', screws: 10 };
/** branch tunnel: phenolic liner 3/8 OD × 0.025 (ID 0.325) in a Ø 0.40 hole: side port → under C's systems conduit → the
 *  spar web (grommet) → the pocket wall, on block J's harness route */
export const BRANCH = { r: 0.20, liner: 'phenolic tube 3/8 OD × 0.025 (ID 0.325)', pts: (() => { const P2 = MAG_WEB[1], P3 = [r4(GMU.c[0] + 1.6), r4(GMU.c[1] + 0.6), r4(GMU.c[2] + 0.2)], t = (POCKET.bl[1] - P2[1]) / (P3[1] - P2[1]);
  return [MAG_CONDUIT_EXIT.map(r4), MAG_WEB[0].map(r4), P2.map(r4), P2.map((v, k) => r4(v + (P3[k] - v) * t))]; })() };
/** the spar-web crossing: the segment MAG_WEB[0] → MAG_WEB[1] through the spar block and both webs, a Ø 0.50 hole with an
 *  MS35489 grommet each web face and a 2-ply BID ±45 patch 2 in round the hole each face (DESIGN, typed practice) */
export const WEB_HOLE = { d: 0.625 /* integration 2026-11-19 (ICD A-S2): the MS35489-11 grommet's 5/8 in hole (was 0.50) */, patch: 2.0, plies: 2, grommet: 'MS35489-11 (3/8 in ID, 5/8 in hole: passes the 3/8 liner; the -7 has a 1/4 in ID and does not), MS35489 table (oringsusa.com, accessed 2026-11-19)' };
/** the left features as cuts in the right-panel frame (BL mirrored), for the clearance rules */
const mir = (q) => [Math.abs(q[1]), q[0], q[2]];
export const LH_CUTS = [
  { id: 'gmu-pocket', feat: 'pocket', k: 'box', lo: [-POCKET.bl[1], POCKET.fs[0], POCKET.wl[0]], hi: [-POCKET.bl[0], POCKET.fs[1], POCKET.wl[1]] },
  ...BRANCH.pts.slice(1).map((q, k) => ({ id: `gmu-br-${k + 1}`, feat: 'tunnel', k: 'cyl', a: mir(BRANCH.pts[k]), b: mir(q), r: BRANCH.r })),
];
/** clearances (in): to the caps, spar block and skins (the web crossing excepted on its own segment, the pocket's floor on the
 *  skin), and to the panel's other cuts (the aft conduit excepted at the side port it leaves from) */
export function lhClear() {
  const struct = wingClearOf(LH_CUTS, (c, k, q) => (c.id === 'gmu-br-2' && k === 'block') || (c.id === 'gmu-br-2' && /cap/.test(k) && false) || (c.id === 'gmu-pocket' && k === 'oml' && q[2] < c.lo[2] + 1e-6) || (c.id === 'gmu-br-1' && k === 'oml' && false));
  let cuts = { d: Infinity }; for (const c of LH_CUTS) for (const o of WCUTS) { if (c.id === 'gmu-br-1' && o.id.startsWith('aft')) continue; const d = cutDist(c, o); if (d < cuts.d) cuts = { d, a: c.id, b: o.id }; }
  const top = Math.min(...[POCKET.fs[0], POCKET.fs[1]].flatMap((x) => POCKET.bl.map((y) => wingCeil(Math.abs(y), x)))) - POCKET.wl[1];
  return { struct, cuts, top };
}
/** the web crossing: clear depth between the caps at the crossing's BL, the hole's edge distance to each cap, hole / depth */
export function webHole() {
  const a = MAG_WEB[0], b = MAG_WEB[1], y = (Math.abs(a[1]) + Math.abs(b[1])) / 2, R = wingRegions(y), zc = (a[2] + b[2]) / 2;
  const up = Math.min(...R.cap_upper.map((p) => p[1])), lo = Math.max(...R.cap_lower.map((p) => p[1])), depth = up - lo, edge = Math.min(up - (zc + WEB_HOLE.d / 2), zc - WEB_HOLE.d / 2 - lo);
  const fs = [Math.min(...R.block.map((p) => p[0])), Math.max(...R.block.map((p) => p[0]))], t = (fs[0] + fs[1]) / 2, u = (t - a[0]) / (b[0] - a[0]), at = a.map((v, k) => v + (b[k] - v) * u);
  return { y, zc, depth, edge, ratio: WEB_HOLE.d / depth, at, fs };
}
// the branch is a conduit for the routing pass (wp12: no clamp in it; the side port and the pocket wall are its mouths)
registerConduit({ id: 'gmu-branch', what: 'left wing GMU 11 branch tunnel (side port → spar web → pocket)', pts: BRANCH.pts, r: BRANCH.r, mirror: false });
// the cover opening in the wing's shear cell (wpC8 wing-access), at |BL|
EXTRA_OPENINGS.push({ ...OPENING, bl: [Math.abs(OPENING.bl[1]), Math.abs(OPENING.bl[0])] });
void SYSC; void AFTC;
