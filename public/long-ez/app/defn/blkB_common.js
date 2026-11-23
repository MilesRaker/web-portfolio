// Block B: shared pieces of the definition records. Notional.
import { want } from './util.js';
import { groupVols, bboxOf, primsExpect, massFrom } from './blkB_prims.js';

export const fx = (x, n = 2) => x.toFixed(n);
export const TODAY = '2026-11-18';
/** a record built from primitives (cad/blkB_prims.py): the DEFS entry pieces; rho maps each group to lb/in³ */
export function primsEntry(def, solid, params, rho, extra = {}) {
  return { def, solid, params, expect: (p, m) => primsExpect(p, m), massOf: (m) => massFrom(m.volumes || {}, rho), place: () => [{ sx: 1, x: 0, y: 0, z: 0 }], ...extra };
}
export const massOfParams = (params, rho) => massFrom(groupVols(params().prims), rho);
export const sizeOf = (params) => { const b = bboxOf(params().prims); return [b[1] - b[0], b[3] - b[2], b[5] - b[4]]; };
export { want };
