// Block D: envelope solids built from primitives (cad/d_prims.py) — volumes, bounding box and the drawing view, all from
// the same primitive list the CadQuery script builds. Inches. Notional.
import { want } from './util.js';

const sub = (a, b) => a.map((v, i) => v - b[i]), len = (a) => Math.hypot(...a);
const pv = (p) => (p.t === 'cyl' ? Math.PI * (p.r ** 2 - (p.ri || 0) ** 2) * len(sub(p.b, p.a)) : p.d[0] * p.d[1] * p.d[2]);
/** length of a hole's axis segment (extended 0.05 in each way, as the CadQuery cut) inside an axis-aligned box */
function inBox(h, p) {
  const u = sub(h.b, h.a).map((v) => v / len(sub(h.b, h.a))), a = h.a.map((v, i) => v - u[i] * 0.05), b = h.b.map((v, i) => v + u[i] * 0.05);
  let t0 = 0, t1 = 1;
  for (let k = 0; k < 3; k++) { const lo = p.c[k] - p.d[k] / 2, hi = p.c[k] + p.d[k] / 2, da = b[k] - a[k];
    if (Math.abs(da) < 1e-12) { if (a[k] < lo || a[k] > hi) return 0; continue; }
    let s0 = (lo - a[k]) / da, s1 = (hi - a[k]) / da; if (s0 > s1) [s0, s1] = [s1, s0]; t0 = Math.max(t0, s0); t1 = Math.min(t1, s1); }
  return Math.max(0, t1 - t0) * len(sub(b, a));
}
export function primVolumes(P) {
  const V = {};
  P.prims.forEach((p) => { V[p.g] = (V[p.g] || 0) + pv(p); });
  for (const h of P.cuts || []) for (const i of h.into) { const p = P.prims[i]; V[p.g] -= Math.PI * h.r ** 2 * inBox(h, p); }
  return V;
}
export function primBox(P) {
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (const p of P.prims) {
    if (p.t === 'box') for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], p.c[k] - p.d[k] / 2); hi[k] = Math.max(hi[k], p.c[k] + p.d[k] / 2); }
    else { const d = sub(p.b, p.a), L = len(d); for (let k = 0; k < 3; k++) { const e = p.r * Math.sqrt(Math.max(0, 1 - (d[k] / L) ** 2)); lo[k] = Math.min(lo[k], p.a[k] - e, p.b[k] - e); hi[k] = Math.max(hi[k], p.a[k] + e, p.b[k] + e); } }
  }
  return [lo[0], hi[0], lo[1], hi[1], lo[2], hi[2]];
}
export function primExpect(P, m, names = {}) {
  const V = primVolumes(P), mv = m.volumes || {}, B = primBox(P);
  return [...Object.entries(V).map(([g, v]) => want(`${names[g] || g} volume (in³)`, v, mv[g] ?? NaN, Math.max(0.002, v * 0.001))),
    ...['x (BL)', 'y (FS)', 'z (WL)'].map((ax, k) => want(`Envelope ${ax} (in)`, B[2 * k + 1] - B[2 * k], m.bbox[2 * k + 1] - m.bbox[2 * k], 0.003)), want('Holes', (P.cuts || []).length, (m.holes || []).length, 0)];
}
export const primMass = (V, rho) => Object.entries(V).reduce((a, [g, v]) => a + v * (rho[g] || 0), 0);
/** densities that put the vendor's mass split on the envelope volumes (effective, not material, densities) */
export const rhoFrom = (P, lb) => { const V = primVolumes(P); return Object.fromEntries(Object.entries(lb).map(([g, m]) => [g, m / V[g]])); };

const SCALES = [[4, '4:1'], [2, '2:1'], [1, '1:1'], [0.5, '1:2'], [0.25, '1:4'], [0.2, '1:5'], [0.125, '1:8'], [0.1, '1:10'], [1 / 16, '1:16'], [0.05, '1:20'], [0.025, '1:40']];
/** generic sheet view: front (x across, z up) and side (y across, z up) projections of the primitives, overall dimensions,
 *  hole centre lines and callouts. opts: { titles: [front, side], notes: [[text, feat]], flipY } */
export function primView(P, opts = {}) {
  return (k) => {
    const { L, T, hdim, vdim } = k, B = primBox(P), wF = B[1] - B[0], wS = B[3] - B[2], h = B[5] - B[4];
    const sc = SCALES.find(([s]) => wF * s * 100 <= 470 && wS * s * 100 <= 470 && h * s * 100 <= 520) || SCALES.at(-1), S = sc[0] * 100;
    const view = (ox, oz, ax, title) => {   // ax: 0 = front (x), 1 = side (y)
      const X = (q) => ox + (q[ax] - B[2 * ax]) * S, Z = (q) => oz - (q[2] - B[4]) * S; let o = '';
      P.prims.forEach((p) => {
        if (p.t === 'box') { const a = [...p.c], lo = a.map((v, i) => v - p.d[i] / 2), hi = a.map((v, i) => v + p.d[i] / 2); o += `<g data-feat="${p.g}" class="feat"><rect class="pt" x="${X(lo)}" y="${Z(hi)}" width="${p.d[ax] * S}" height="${p.d[2] * S}"/></g>`; return; }
        const d = sub(p.b, p.a), u2 = [d[ax], d[2]], l2 = Math.hypot(...u2);
        if (l2 < 1e-6 * len(d)) { o += `<g data-feat="${p.g}" class="feat"><circle class="pt" cx="${X(p.a)}" cy="${Z(p.a)}" r="${p.r * S}"/>${p.ri ? `<circle class="pt" cx="${X(p.a)}" cy="${Z(p.a)}" r="${p.ri * S}"/>` : ''}</g>`; return; }
        const n = [-u2[1] / l2 * p.r, u2[0] / l2 * p.r], A = [X(p.a), Z(p.a)], Bq = [X(p.b), Z(p.b)], nn = [n[0] * S, -n[1] * S];
        o += `<g data-feat="${p.g}" class="feat"><path class="pt" d="M${A[0] + nn[0]} ${A[1] + nn[1]}L${Bq[0] + nn[0]} ${Bq[1] + nn[1]}L${Bq[0] - nn[0]} ${Bq[1] - nn[1]}L${A[0] - nn[0]} ${A[1] - nn[1]}Z"/></g>`;
      });
      for (const c of P.cuts || []) { const d = sub(c.b, c.a), along = Math.hypot(d[ax], d[2]) > 1e-6 * len(d); const g = P.prims[c.into[0]].g;
        o += along ? `<g data-feat="${g}" class="feat">${L(X(c.a), Z(c.a), X(c.b), Z(c.b), 'cl')}</g>` : `<g data-feat="${g}" class="feat"><circle class="pt" cx="${X(c.a)}" cy="${Z(c.a)}" r="${c.r * S}"/></g>`; }
      const lo = [B[0], B[2], B[4]], hi = [B[1], B[3], B[5]], g0 = P.prims[0].g;
      o += hdim(g0, X(lo), X(hi), Z(lo), Z(lo) + 40, `${(hi[ax] - lo[ax]).toFixed(2)}`) + vdim(g0, Z(hi), Z(lo), X(hi), X(hi) + 40, `${(hi[2] - lo[2]).toFixed(2)}`);
      o += T(Math.max(40, X(lo)), Z(lo) + 100, `${title} · ${sc[1]}`, 'vt', 'start');
      return o;
    };
    let o = view(80, 640, 0, (opts.titles || [])[0] || 'FRONT VIEW, LOOKING AFT (BL ACROSS)') + view(660, 640, 1, (opts.titles || [])[1] || 'SIDE VIEW, LOOKING INBOARD (FS ACROSS)');
    (opts.notes || []).forEach(([t, f], i) => { o += `<g class="dim" data-feat="${f}">${T(80, 820 + i * 17, t, 'tn2', 'start')}</g>`; });
    return { svg: o, bottom: 150, scale: sc[1], notesBox: { x: 1250, top: 150, n: 50, bottom: 860 } };
  };
}
