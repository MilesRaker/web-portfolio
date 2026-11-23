// Block H: shared pieces of the definition records (LEZ-74-*, -76-*, -77-*): a record skeleton and the DEFS entry for
// a part whose solid is built from primitives by cad/g_prims.py (block G's generic tool) in the aircraft frame.
import { paramHash } from './util.js';
import { primsExpect, massOfGroups, groupVols } from './g_prims.js';

export const DATE = '2026-11-18';
export const fx = (x, n = 2) => (Number.isFinite(x) ? x.toFixed(n) : String(x));
export const rev0 = (change) => [{ rev: 'A', date: DATE, short: 'Initial definition', change }];
export const massFrom = (params, rho) => Object.entries(groupVols(params.prims)).reduce((a, [g, v]) => a + v * rho[g], 0);
/** the DEFS entry: solid in the aircraft frame in place; mass per item = solid mass / per */
export const primEntry = (def, solid, params, rho, per = 1) => ({ def, solid, params, hash: paramHash, expect: (p, m) => primsExpect(p, m), massOf: (m) => massOfGroups(rho)(m) / per, place: () => [{ sx: 1, x: 0, y: 0, z: 0 }] });
export const near = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));
/** common record fields with sensible defaults */
export function rec(o) {
  return { status: 'released', rev: 'A', effectivity: 'One per aircraft', datums: [], tolerances: { general: 'Route ±1/4 in to the defined points', breakEdges: '—' }, drawingNotes: [], generalNote: '', na: {}, hardware: [], hardwareNote: '', rules: [], interfaces: [], tooling: { needed: false, text: 'None beyond hand tools.' }, ...o };
}
