// Block A shared pieces for flat-part definition records (cad/blkA_bulkhead.py solids): the measure-back rows, the
// material prices and the cloth / resin quantities. Prices typed from memory of the vendor's catalogue (approximate).
import { PROCESS } from '../plybook.js';
import { BASE_MAT } from '../structures.js';
import { flatVolumes } from '../parts/wpA0_flat.js';
import { want } from './util.js';
import { ppBuy, PP_PRICE } from './p_common.js';

// block P: the laminate and core prices are the prepreg / HT proxies of p_common (BOUND); the H45 / L285 keys stay for the records' sums (L285 now 0)
export const PRICE = { BID: PP_PRICE.fab, UNI: PP_PRICE.cf, H45sheet38: +(PP_PRICE.coreFt2Qtr * 8 * 1.5).toFixed(2), H45sheet316: +(PP_PRICE.coreFt2Qtr * 8 * 0.75).toFixed(2), L285gal: 0, H287qt: 0, flox: 14.50, lead: 2.93 /* RotoMetals 5 lb pure lead ingot $14.67 (sale; regular $3.20/lb), accessed 2026-11-19 */, ss016: 58.0, fiberfrax: 32.0 };
/** solid against the record: in-plane extents (u, v), every layer volume, the hole count */
export function flatExpect(p, m) {
  const V = flatVolumes(p), mv = m.volumes || {}, all = Object.values(p.polys).flat(2), us = all.map((q) => q[0]), vs = all.map((q) => q[1]);
  return [want('Width, in-plane u (in)', Math.max(...us) - Math.min(...us), m.bbox[1] - m.bbox[0], 0.002), want('Height, in-plane v (in)', Math.max(...vs) - Math.min(...vs), m.bbox[5] - m.bbox[4], 0.002),
    ...p.layers.map((l) => want(`${l.name} volume (in³)`, V[l.name], mv[l.name] ?? NaN, Math.max(0.005, V[l.name] * 0.003))), want('Holes', p.holes.length, (m.holes || []).length, 0)];
}
/** prepreg (yd, 50 in roll, +15 %) for a laminate area in in² by role (block P: MTM45-1 prepreg, no resin to mix; proxy prices, BOUND) */
export function buy(areaIn2) {
  const b = ppBuy({ UNI: (areaIn2.UNI || 0) / 144, GUD: (areaIn2.GUD || 0) / 144, BID: (areaIn2.BID || 0) / 144 });
  return { bid: b.gl, uni: b.cf, gal: 0, cost: b.cost, text: b.text };
}
/** ply areas (in², each ply counted) of the laminate layers of a flat part: layer volume / ply thickness */
export const plyAreas = (p, tply) => { const V = flatVolumes(p), A = {}; for (const l of p.layers) if (tply[l.mat]) A[l.mat] = (A[l.mat] || 0) + V[l.name] / tply[l.mat]; return A; };
