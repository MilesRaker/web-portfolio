// Block C (flight controls) definition-record factory: one record per part from a compact spec, the solid from
// cad/c_prims.py (primitives in parts/wpC2_prims.js), measured back primitive by primitive. Inches; x = BL, y = FS, z = WL.
// Notional: public data and this model's own analysis; allowables and vendor ratings typed from memory are marked.
import { solidOf, groupVols, massOfVols } from '../parts/wpC2_prims.js';
import { paramHash, want } from './util.js';

export const DATE = '2026-11-18';
export const MEMNOTE = 'Allowables (MIL-HDBK-5 / MMPDS), AN ratings, rod-end, cable and actuator ratings and prices were typed from memory: confirm each against the current handbook, standard or datasheet before use.';
export function primParams(pn) { const s = solidOf(pn); return { prims: s.prims, rho: s.rho }; }
export function primExpect(p, m) {
  const V = groupVols(p.prims), out = Object.entries(V).map(([g, v]) => want(`${g} volume (in³)`, v, m.volumes?.[g] ?? NaN, Math.max(1e-3, v * 0.002)));
  out.push(want('Primitives built', p.prims.length, m.n ?? NaN, 0), want('Holes', p.prims.reduce((s, q) => s + (q.holes || []).length, 0), (m.holes || []).length, 0), want('Holes measured open at their centres', p.prims.reduce((s, q) => s + (q.holes || []).length, 0), (m.holes || []).filter((h) => h.open).length, 0));
  return out;
}
export const primMass = (p, m) => massOfVols(m.volumes || {}, p.rho);
/** a record for a primitive-built part; spec carries the definition fields; the mass is the primitives' */
export function makePrimRec(pn, spec) {
  const p = primParams(pn), mass = massOfVols(groupVols(p.prims), p.rho);
  const def = { pn, rev: 'A', status: 'released', qty: 1, revs: [{ rev: 'A', date: DATE, short: 'Initial definition', change: spec.change }], na: {}, generalNote: '', drawingNotes: [], ...spec,
    mass: { each: mass, from: 'solid volumes by primitive × density per material' }, params: p };
  def.drawingNotes = [...(def.drawingNotes || []), MEMNOTE];
  delete def.change;
  if (spec.more) { def.revs.push(...spec.more); def.rev = spec.more.at(-1).rev; delete def.more; }   // later revisions
  return { def, params: () => primParams(pn), expect: primExpect, massOf: (m) => primMass(primParams(pn), m), hash: paramHash };
}
export const fx = (x, n = 2) => Number(x).toFixed(n);
export const pt = (p) => `FS ${fx(p[0], 2)}, BL ${fx(p[1], 2)}, WL ${fx(p[2], 2)}`;
export const near = (a, b, tol = 0.01) => Math.hypot(...a.map((v, i) => v - b[i])) <= tol;
