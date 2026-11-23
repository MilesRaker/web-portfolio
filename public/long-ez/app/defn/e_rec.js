// Block E record factory: the common fields of every nose-gear definition record, and the DEFS entry that ties a record to
// its primitive solid (cad/e_prims.py), parameters (wpE1 E_P), measure-back rows and mass. Notional, not for construction.
import { paramHash } from './util.js';
import { primExpect, primVolumes, primMass, eView } from './e_prims.js';
import { E_P, E_RHO, eMass, coverSkin, plateTapes } from '../parts/wpE1_nosegear.js';
import { anDash } from '../parts/wpD1_gear.js';

export const TODAY = '2026-11-18';
export const fx = (x, n = 2) => (Number.isFinite(x) ? x.toFixed(n) : String(x));
/** AN bolt for a grip (in): shank past the nut by 1.5 threads plus washer and nut */
export const an = (d, grip, extra = 0.25) => `AN${d}-${anDash(grip + extra)}A`;
const extraLb = (pn) => (pn === 'LEZ-32-205' ? coverSkin() : pn === 'LEZ-32-201' ? plateTapes().lb : 0);
/** a definition record with the block's defaults */
export function rec(o) {
  const pn = o.pn, mass = eMass(pn);
  return {
    status: 'released', rev: 'A', qty: 1, effectivity: 'One per aircraft', params: E_P[pn],
    revs: [{ rev: 'A', date: TODAY, short: 'Initial definition', change: o.change }],
    tolerances: { general: '.XX ±0.03 · .XXX ±0.010', holes: 'Bolt holes close fit (+0.003/−0); true position 0.010 to the datums', breakEdges: '0.010–0.030' },
    generalNote: o.generalNote || 'Steel parts primed; aluminium parts conversion-coated and primed; composites per the process notes.',
    rules: [], interfaces: [], drawingNotes: [], na: { cut: 'Machined, welded or bought: no flat pattern', layup: 'Not a composite part' },
    ...o,
    mass: { each: mass, from: o.massFrom || `solid volumes × densities by region (${Object.entries(E_RHO[pn]).map(([g, r]) => `${g} ${r.toFixed(4)}`).join(', ')} lb/in³)${extraLb(pn) ? ` + ${extraLb(pn).toFixed(3)} lb ${pn === 'LEZ-32-205' ? 'skin' : 'tapes'} from the solid's surfaces` : ''}` },
  };
}
/** the DEFS entry: aircraft frame (in), gear DOWN; mirrored parts placed twice */
export const entry = (def, solid, opts = {}) => ({ def, solid, params: () => E_P[def.pn], hash: paramHash, expect: (p, m) => primExpect(p, m),
  massOf: (m) => primMass(m.volumes || {}, E_RHO[def.pn]) + extraLb(def.pn), place: () => (opts.mirror ? [1, -1] : [1]).map((sx) => ({ sx, x: 0, y: 0, z: 0 })), ...(opts.laminate ? { laminate: true } : {}) });
export const view = (pn, notes = [], views) => eView(E_P[pn], { notes, ...(views ? { views } : {}) });
void primVolumes;
