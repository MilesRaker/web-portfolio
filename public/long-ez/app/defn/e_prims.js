// Block E: solids built from primitives (cad/e_prims.py): boxes, cylinders (optionally hollow), ruled lofts through
// parallel polygons (optionally hollow), extruded polygons with holes, and a torus. Volumes, bounding box, the measure-back
// rows and the drawing views all come from the same primitive list the CadQuery script builds. Inches, aircraft frame
// (x = BL, y = FS, z = WL). Notional.
import { want } from './util.js';

const sub = (a, b) => a.map((v, i) => v - b[i]), add = (a, b) => a.map((v, i) => v + b[i]), mul = (a, s) => a.map((v) => v * s), dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], len = (a) => Math.hypot(...a), unit = (a) => mul(a, 1 / len(a));
const newell = (P) => { const n = [0, 0, 0]; for (let i = 0; i < P.length; i++) { const p = P[i], q = P[(i + 1) % P.length]; n[0] += (p[1] - q[1]) * (p[2] + q[2]); n[1] += (p[2] - q[2]) * (p[0] + q[0]); n[2] += (p[0] - q[0]) * (p[1] + q[1]); } return n; };
const area3 = (P) => len(newell(P)) / 2, cen = (P) => mul(P.reduce((a, p) => add(a, p), [0, 0, 0]), 1 / P.length);
const area2 = (P) => { let a = 0; for (let i = 0; i < P.length; i++) { const p = P[i], q = P[(i + 1) % P.length]; a += p[0] * q[1] - q[0] * p[1]; } return Math.abs(a) / 2; };
/** ruled loft through parallel sections: Simpson per segment is exact (section area is quadratic along the loft) */
function loftVol(secs) {
  let v = 0;
  for (let i = 1; i < secs.length; i++) { const a = secs[i - 1], b = secs[i], n = unit(newell(a)), h = Math.abs(dot(sub(cen(b), cen(a)), n)), m = a.map((p, k) => mul(add(p, b[k]), 0.5)); v += h / 6 * (area3(a) + 4 * area3(m) + area3(b)); }
  return v;
}
const others = (ax) => [0, 1, 2].filter((k) => k !== ax);
export function primVol(p) {
  if (p.t === 'box') return p.d[0] * p.d[1] * p.d[2];
  if (p.t === 'cyl') return Math.PI * (p.r ** 2 - (p.ri || 0) ** 2) * len(sub(p.b, p.a));
  if (p.t === 'loft') return loftVol(p.secs) - (p.inner ? loftVol(p.inner) : 0);
  if (p.t === 'xpoly') return (area2(p.pts) - (p.holes || []).reduce((a, h) => a + area2(h), 0)) * Math.abs(p.e[1] - p.e[0]);
  if (p.t === 'torus') return 2 * Math.PI ** 2 * p.R * p.r ** 2;
  throw new Error(p.t);
}
// ---------------------------------------------------------------- inclusion (for the holes' cut volumes)
const inPoly2 = (q, P) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const a = P[i], b = P[j]; if ((a[1] > q[1]) !== (b[1] > q[1]) && q[0] < (b[0] - a[0]) * (q[1] - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
// the loft's frame depends on its sections alone: within one hole's sampling it is worked once per section list, not
// per sample point (perf); outside cutVol it is worked afresh each call
let FRAME = null;
const loftFrame = (secs) => { let F = FRAME && FRAME.get(secs); if (!F) { const n = unit(newell(secs[0])), e1 = unit(sub(secs[0][1], secs[0][0])), e2 = cross(n, e1), h0 = dot(secs[0][0], n), hs = secs.map((s) => dot(cen(s), n) - h0);
  F = { n, e1, e2, h0, hs, sg: Math.sign(hs.at(-1) - hs[0]) }; if (FRAME) FRAME.set(secs, F); } return F; };
function inLoft(x, secs) {
  const { n, e1, e2, h0, hs, sg } = loftFrame(secs), hx = dot(x, n) - h0;
  for (let i = 1; i < secs.length; i++) { const a = hs[i - 1] * sg, b = hs[i] * sg, h = hx * sg; if (h < a - 1e-12 || h > b + 1e-12) continue;
    const f = b > a ? (h - a) / (b - a) : 0, P = secs[i - 1].map((p, k) => add(p, mul(sub(secs[i][k], p), f))).map((p) => [dot(p, e1), dot(p, e2)]);
    return inPoly2([dot(x, e1), dot(x, e2)], P); }
  return false;
}
function inside(x, p) {
  if (p.t === 'box') return [0, 1, 2].every((k) => Math.abs(x[k] - p.c[k]) <= p.d[k] / 2);
  if (p.t === 'cyl') { const d = sub(p.b, p.a), L = len(d), u = mul(d, 1 / L), s = dot(sub(x, p.a), u); if (s < 0 || s > L) return false; const r = len(sub(sub(x, p.a), mul(u, s))); return r <= p.r && r >= (p.ri || 0); }
  if (p.t === 'loft') return inLoft(x, p.secs) && !(p.inner && inLoft(x, p.inner));
  if (p.t === 'xpoly') { const [lo, hi] = [Math.min(...p.e), Math.max(...p.e)]; if (x[p.ax] < lo || x[p.ax] > hi) return false; const o = others(p.ax), q = [x[o[0]], x[o[1]]]; return inPoly2(q, p.pts) && !(p.holes || []).some((h) => inPoly2(q, h)); }
  return false;
}
/** volume a cylindrical hole (extended 0.05 in each way, as the CadQuery cut) takes out of a primitive: r² π × chord */
function cutVol(h, p) { FRAME = new Map(); try { return cutVolNow(h, p); } finally { FRAME = null; } }
/** inside(x, p) for one primitive, its own terms worked once and the point terms without allocating: the same
 *  arithmetic, test by test, as inside() (perf: the holes' cut volumes sample up to 138 240 points a primitive) */
function insider(p) {
  if (p.t === 'box') { const c = p.c, d = p.d; return (x) => Math.abs(x[0] - c[0]) <= d[0] / 2 && Math.abs(x[1] - c[1]) <= d[1] / 2 && Math.abs(x[2] - c[2]) <= d[2] / 2; }
  if (p.t === 'cyl') { const a = p.a, d = sub(p.b, p.a), L = len(d), u = mul(d, 1 / L), ri = p.ri || 0;
    return (x) => { const w0 = x[0] - a[0], w1 = x[1] - a[1], w2 = x[2] - a[2], s = w0 * u[0] + w1 * u[1] + w2 * u[2]; if (s < 0 || s > L) return false; const r = Math.hypot(w0 - u[0] * s, w1 - u[1] * s, w2 - u[2] * s); return r <= p.r && r >= ri; }; }
  if (p.t === 'loft') { const A = loftTest(p.secs), B = p.inner ? loftTest(p.inner) : null; return (x) => A(x) && !(B && B(x)); }
  return (x) => inside(x, p);
}
function loftTest(secs) {
  const { n, e1, e2, h0, hs, sg } = loftFrame(secs), m = Math.max(...secs.map((q) => q.length)), PX = new Float64Array(m), PY = new Float64Array(m);
  return (x) => {
    const hx = x[0] * n[0] + x[1] * n[1] + x[2] * n[2] - h0;
    for (let i = 1; i < secs.length; i++) { const a = hs[i - 1] * sg, b = hs[i] * sg, h = hx * sg; if (h < a - 1e-12 || h > b + 1e-12) continue;
      const f = b > a ? (h - a) / (b - a) : 0, S0 = secs[i - 1], S1 = secs[i], k = S0.length;
      for (let j = 0; j < k; j++) { const p = S0[j], q = S1[j], v0 = p[0] + (q[0] - p[0]) * f, v1 = p[1] + (q[1] - p[1]) * f, v2 = p[2] + (q[2] - p[2]) * f; PX[j] = v0 * e1[0] + v1 * e1[1] + v2 * e1[2]; PY[j] = v0 * e2[0] + v1 * e2[1] + v2 * e2[2]; }
      const qx = x[0] * e1[0] + x[1] * e1[1] + x[2] * e1[2], qy = x[0] * e2[0] + x[1] * e2[1] + x[2] * e2[2]; let c = false;
      for (let r = 0, t = k - 1; r < k; t = r++) if ((PY[r] > qy) !== (PY[t] > qy) && qx < (PX[t] - PX[r]) * (qy - PY[r]) / (PY[t] - PY[r]) + PX[r]) c = !c;
      return c; }
    return false;
  };
}
function cutVolNow(h, p) {
  const u = unit(sub(h.b, h.a)), a = sub(h.a, mul(u, 0.05)), L = len(sub(h.b, h.a)) + 0.1, IN_ = insider(p), x = [0, 0, 0];
  if (!h.partial) { const N = 4000; let n = 0; for (let i = 0; i < N; i++) { const s = L * (i + 0.5) / N; x[0] = a[0] + u[0] * s; x[1] = a[1] + u[1] * s; x[2] = a[2] + u[2] * s; if (IN_(x)) n++; } return Math.PI * h.r ** 2 * L * n / N; }
  // a hole that breaks out of the part: sample its whole section (polar rings of equal area) along the axis
  const e1 = unit(cross(u, Math.abs(u[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0])), e2 = cross(u, e1), NR = 24, NT = 48, NL = 120; let n = 0;
  for (let i = 0; i < NR; i++) { const r = h.r * Math.sqrt((i + 0.5) / NR); for (let j = 0; j < NT; j++) { const t = 2 * Math.PI * (j + 0.5) / NT, rc = r * Math.cos(t), rs = r * Math.sin(t);
    const b0 = a[0] + (e1[0] * rc + e2[0] * rs), b1 = a[1] + (e1[1] * rc + e2[1] * rs), b2 = a[2] + (e1[2] * rc + e2[2] * rs);
    for (let k = 0; k < NL; k++) { const s = L * (k + 0.5) / NL; x[0] = b0 + u[0] * s; x[1] = b1 + u[1] * s; x[2] = b2 + u[2] * s; if (IN_(x)) n++; } } }
  return Math.PI * h.r ** 2 * L * n / (NR * NT * NL);
}
/** group volumes of a primitive list; memoised on the list's content (the hole sampling is the costly part; perf) */
const VOLS = new Map();
export function primVolumes(P) {
  const key = JSON.stringify([P.prims, P.cuts || []]);
  let V = VOLS.get(key); if (!V) { V = primVolumesNow(P); VOLS.set(key, V); }
  return { ...V };
}
function primVolumesNow(P) {
  const V = {};
  P.prims.forEach((p) => { V[p.g] = (V[p.g] || 0) + primVol(p); });
  for (const h of P.cuts || []) for (const i of h.into) { const p = P.prims[i]; V[p.g] -= cutVol(h, p); }
  return V;
}
// ---------------------------------------------------------------- bounding box
function primPts(p) {
  if (p.t === 'box') { const o = []; for (const a of [-1, 1]) for (const b of [-1, 1]) for (const c of [-1, 1]) o.push([p.c[0] + a * p.d[0] / 2, p.c[1] + b * p.d[1] / 2, p.c[2] + c * p.d[2] / 2]); return o; }
  if (p.t === 'loft') return p.secs.flat();
  if (p.t === 'xpoly') { const o = others(p.ax); return p.e.flatMap((e) => p.pts.map((q) => { const x = [0, 0, 0]; x[o[0]] = q[0]; x[o[1]] = q[1]; x[p.ax] = e; return x; })); }
  return null;
}
export function primBox(P) {
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity], grow = (x, e = [0, 0, 0]) => { for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], x[k] - e[k]); hi[k] = Math.max(hi[k], x[k] + e[k]); } };
  for (const p of P.prims) {
    const pts = primPts(p); if (pts) { pts.forEach((x) => grow(x)); continue; }
    if (p.t === 'cyl') { const d = sub(p.b, p.a), L = len(d), e = [0, 1, 2].map((k) => p.r * Math.sqrt(Math.max(0, 1 - (d[k] / L) ** 2))); grow(p.a, e); grow(p.b, e); }
    if (p.t === 'torus') { const e = [0, 1, 2].map((k) => (k === p.ax ? p.r : p.R + p.r)); grow(p.c, e); }
  }
  return [lo[0], hi[0], lo[1], hi[1], lo[2], hi[2]];
}
/** measure-back rows: every group's volume, the overall envelope and the hole count */
export function primExpect(P, m, names = {}) {
  const V = primVolumes(P), mv = m.volumes || {}, B = primBox(P);
  return [...Object.entries(V).map(([g, v]) => want(`${names[g] || g} volume (in³)`, v, mv[g] ?? NaN, Math.max(0.003, v * 0.0015))),
    ...['x (BL)', 'y (FS)', 'z (WL)'].map((ax, k) => want(`Envelope ${ax} (in)`, B[2 * k + 1] - B[2 * k], m.bbox[2 * k + 1] - m.bbox[2 * k], 0.004)), want('Holes', (P.cuts || []).length, (m.holes || []).length, 0)];
}
export const primMass = (V, rho) => Object.entries(V).reduce((a, [g, v]) => a + v * (rho[g] ?? 0), 0);
export const rhoFrom = (P, lb) => { const V = primVolumes(P); return Object.fromEntries(Object.entries(lb).map(([g, m]) => [g, m / V[g]])); };

// ---------------------------------------------------------------- drawing views
const SCALES = [[2, '2:1'], [1, '1:1'], [0.5, '1:2'], [0.25, '1:4'], [0.2, '1:5'], [0.125, '1:8'], [0.1, '1:10'], [1 / 16, '1:16'], [0.05, '1:20']];
const AXN = ['BL', 'FS', 'WL'];
/** two projections side by side (default: looking aft, x across; looking inboard, FS across), z (WL) up; overall dimensions,
 *  hole circles and centre lines. opts: { views: [{ h: axis index across, title }], notes: [[text, feat]], dims: [[view, axis, a, b, label, feat]] } */
export function eView(P, opts = {}) {
  return (k) => {
    const { L, T, hdim, vdim } = k, B = primBox(P), views = opts.views || [{ h: 0, title: 'VIEW LOOKING AFT (BL ACROSS)' }, { h: 1, title: 'VIEW LOOKING INBOARD (FS ACROSS)' }];
    const w = (ax) => B[2 * ax + 1] - B[2 * ax], ht = w(2);
    const sc = SCALES.find(([s]) => views.every((v) => w(v.h) * s * 100 <= 440) && ht * s * 100 <= 500) || SCALES.at(-1), S = sc[0] * 100;
    const view = (ox, oz, v) => {
      const h = v.h, d = 3 - h - 2 + (h === 0 ? 1 : 0), dv = [0, 1, 2].find((q) => q !== h && q !== 2);   // dv: the viewing direction
      const X = (q) => ox + (q[h] - B[2 * h]) * S, Z = (q) => oz - (q[2] - B[4]) * S, pth = (pts) => `M${pts.map((q) => `${X(q).toFixed(1)} ${Z(q).toFixed(1)}`).join('L')}Z`;
      let o = ''; void d;
      P.prims.forEach((p) => {
        let s = '';
        if (p.t === 'box') { const lo = p.c.map((c, i) => c - p.d[i] / 2), hi = p.c.map((c, i) => c + p.d[i] / 2); s = `<rect class="pt" x="${X(lo)}" y="${Z(hi)}" width="${p.d[h] * S}" height="${p.d[2] * S}"/>`; }
        else if (p.t === 'cyl') { const dd = sub(p.b, p.a), u2 = [dd[h], dd[2]], l2 = Math.hypot(...u2);
          if (l2 < 1e-6 * len(dd)) s = `<circle class="pt" cx="${X(p.a)}" cy="${Z(p.a)}" r="${p.r * S}"/>${p.ri ? `<circle class="pt" cx="${X(p.a)}" cy="${Z(p.a)}" r="${p.ri * S}"/>` : ''}`;
          else { const nn = [-u2[1] / l2 * p.r * S, -u2[0] / l2 * p.r * S], A = [X(p.a), Z(p.a)], Bq = [X(p.b), Z(p.b)]; s = `<path class="pt" d="M${A[0] + nn[0]} ${A[1] + nn[1]}L${Bq[0] + nn[0]} ${Bq[1] + nn[1]}L${Bq[0] - nn[0]} ${Bq[1] - nn[1]}L${A[0] - nn[0]} ${A[1] - nn[1]}Z"/>`; } }
        else if (p.t === 'loft') { const secs = p.secs; s = secs.map((q) => `<path class="pt" d="${pth(q)}"/>`).join('');
          for (let i = 1; i < secs.length; i++) secs[i].forEach((q, j) => { s += L(X(secs[i - 1][j]).toFixed(1), Z(secs[i - 1][j]).toFixed(1), X(q).toFixed(1), Z(q).toFixed(1), 'ex'); }); }
        else if (p.t === 'xpoly') { const pts = primPts(p);
          if (p.ax === dv) { const lift = (q) => { const x = [0, 0, 0], ot = others(p.ax); x[ot[0]] = q[0]; x[ot[1]] = q[1]; x[p.ax] = p.e[0]; return x; }; s = `<path class="pt" d="${pth(p.pts.map(lift))}${(p.holes || []).map((hh) => pth(hh.map(lift))).join('')}"/>`; }
          else { const xs = pts.map((q) => X(q)), zs = pts.map((q) => Z(q)); s = `<rect class="pt" x="${Math.min(...xs)}" y="${Math.min(...zs)}" width="${Math.max(...xs) - Math.min(...xs)}" height="${Math.max(...zs) - Math.min(...zs)}"/>`; } }
        else if (p.t === 'torus') { if (p.ax === dv) s = `<circle class="pt" cx="${X(p.c)}" cy="${Z(p.c)}" r="${(p.R + p.r) * S}"/><circle class="pt" cx="${X(p.c)}" cy="${Z(p.c)}" r="${(p.R - p.r) * S}"/>`;
          else { const rx = (p.ax === h ? p.r : p.R + p.r) * S, rz = (p.R + p.r) * S; s = `<rect class="pt" x="${X(p.c) - rx}" y="${Z(p.c) - rz}" width="${2 * rx}" height="${2 * rz}" rx="${Math.min(rx, rz) * 0.9}"/>`; } }
        o += `<g data-feat="${p.g}" class="feat">${s}</g>`;
      });
      for (const c of P.cuts || []) { const dd = sub(c.b, c.a), along = Math.hypot(dd[h], dd[2]) > 1e-6 * len(dd), g = c.feat;
        o += along ? `<g data-feat="${g}" class="feat">${L(X(c.a), Z(c.a), X(c.b), Z(c.b), 'cl')}</g>` : `<g data-feat="${g}" class="feat"><circle class="pt" cx="${X(c.a)}" cy="${Z(c.a)}" r="${Math.max(c.r * S, 1.5)}"/></g>`; }
      const lo = [B[0], B[2], B[4]], hi = [B[1], B[3], B[5]], g0 = P.prims[0].g;
      o += hdim(g0, X(lo), X(hi), Z(lo), Z(lo) + 40, `${(hi[h] - lo[h]).toFixed(2)}`) + vdim(g0, Z(hi), Z(lo), X(hi), X(hi) + 40, `${(hi[2] - lo[2]).toFixed(2)}`);
      o += T(ox, Z(lo) + 100, `${v.title} · ${sc[1]}`, 'vt', 'start');
      o += T(ox, Z(lo) + 120, `${AXN[h]} ${lo[h].toFixed(2)} TO ${hi[h].toFixed(2)} · WL ${lo[2].toFixed(2)} TO ${hi[2].toFixed(2)}`, 'tn2', 'start');
      return o;
    };
    let o = view(80, 640, views[0]) + (views[1] ? view(640, 640, views[1]) : '');
    (opts.notes || []).forEach(([t, f], i) => { o += `<g class="dim" data-feat="${f}">${T(80, 800 + i * 17, t, 'tn2', 'start')}</g>`; });
    return { svg: o, bottom: 150, scale: sc[1], notesBox: { x: 1250, top: 150, n: 50, bottom: 860 } };
  };
}
