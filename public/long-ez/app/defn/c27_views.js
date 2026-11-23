// Block C drawing views: a generic two-view projection of the primitive solids (side and plan, auto-scaled to a standard
// scale), a feature table, overall dimensions; the landing-brake panel; the installation's rigging and openings tables.
// Sheet units: 1700 for 17 in (100 per inch at 1:1). Notional.
import { LB, L } from '../parts/wpC1_controls.js';
import { lbParams } from './c27_lb.js';
import { OPENINGS } from './c27_install.js';

const SCALES = [[200, '2:1'], [100, '1:1'], [50, '1:2'], [25, '1:4'], [20, '1:5'], [12.5, '1:8'], [10, '1:10'], [6.25, '1:16'], [5, '1:20'], [4, '1:25'], [3.125, '1:32'], [2.5, '1:40'], [2, '1:50'], [1.5625, '1:64'], [1.25, '1:80'], [1, '1:100']];
const snap = (S) => SCALES.find(([s]) => s <= S) || SCALES.at(-1);
const hull = (pts) => { const p = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]), cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); const lo = [], up = [];
  for (const q of p) { while (lo.length >= 2 && cr(lo.at(-2), lo.at(-1), q) <= 0) lo.pop(); lo.push(q); } for (const q of p.reverse()) { while (up.length >= 2 && cr(up.at(-2), up.at(-1), q) <= 0) up.pop(); up.push(q); } return lo.slice(0, -1).concat(up.slice(0, -1)); };
const corners = (p) => { const out = []; for (const a of [-1, 1]) for (const b of [-1, 1]) for (const c of [-1, 1]) out.push([0, 1, 2].map((i) => p.c[i] + a * p.ax[0][i] * p.d[0] / 2 + b * p.ax[1][i] * p.d[1] / 2 + c * p.ax[2][i] * p.d[2] / 2)); return out; };
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
/** outline polygons of a primitive in view (iu, iv: solid-frame axes on the sheet's u and v) */
function shapes(p, iu, iv, iw) {
  if (p.t === 'obox') { const holes = p.holes.filter((h) => Math.abs(p.ax[h.ax][iw]) > 0.98).map((h) => { const loc = [0, 0, 0], o = [0, 1, 2].filter((i) => i !== h.ax); loc[o[0]] = h.p[0]; loc[o[1]] = h.p[1]; const g = [0, 1, 2].map((i) => p.c[i] + loc.reduce((s, v, k) => s + p.ax[k][i] * v, 0)); return { c: [g[iu], g[iv]], r: h.r }; });
    return { poly: hull(corners(p).map((q) => [q[iu], q[iv]])), holes }; }
  const r = (p.od || p.d) / 2, a = [p.a[iu], p.a[iv]], b = [p.b[iu], p.b[iv]], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy);
  if (l < 0.02) return { circle: { c: a, r }, holes: [] };
  const n = [-dy / l * r, dx / l * r];
  return { poly: [[a[0] + n[0], a[1] + n[1]], [b[0] + n[0], b[1] + n[1]], [b[0] - n[0], b[1] - n[1]], [a[0] - n[0], a[1] - n[1]]], cl: [a, b], holes: [] };
}
export function primView(pn) {
  return (k, D) => {
    const { L: Ln, T, hdim, vdim } = k, P = D.params(), d = D.def, prims = P.prims;
    const VW = [{ iu: 1, iv: 2, iw: 0, title: 'SIDE (FWD ←, WL ↑)', x0: 70, w: 500, y0: 130, h: 260 }, { iu: 0, iv: 2, iw: 1, title: 'FRONT, LOOKING AFT (BL + →)', x0: 650, w: 460, y0: 130, h: 260 },
      { iu: 1, iv: 0, iw: 2, title: 'PLAN, LOOKING DOWN (FWD ←, BL + ↑)', x0: 70, w: 1040, y0: 500, h: 200 }];
    const ext = (iu) => { const v = prims.flatMap((p) => (p.t === 'obox' ? corners(p).map((q) => q[iu]) : [p.a[iu], p.b[iu]].flatMap((x) => [x - (p.od || p.d) / 2, x + (p.od || p.d) / 2]))); return [Math.min(...v), Math.max(...v)]; };
    let o = ''; const labs = [];
    for (const v of VW) {
      const [u0, u1] = ext(v.iu), [w0, w1] = ext(v.iv), [Sc, lab] = snap(Math.min(v.w / Math.max(u1 - u0, 0.1), v.h / Math.max(w1 - w0, 0.1)));
      labs.push(lab);
      const cu = v.x0 + (v.w - (u1 - u0) * Sc) / 2, cv = v.y0 + (v.h + (w1 - w0) * Sc) / 2, X = (u) => cu + (u - u0) * Sc, Y = (w) => cv - (w - w0) * Sc;
      for (const p of prims) { const s = shapes(p, v.iu, v.iv, v.iw);
        o += `<g data-feat="${p.g}" class="feat">`;
        if (s.poly) o += `<path class="pt" d="M${s.poly.map((q) => `${X(q[0]).toFixed(1)} ${Y(q[1]).toFixed(1)}`).join('L')}Z"/>`;
        if (s.circle) o += `<circle class="pt" cx="${X(s.circle.c[0]).toFixed(1)}" cy="${Y(s.circle.c[1]).toFixed(1)}" r="${Math.max(1.2, s.circle.r * Sc).toFixed(1)}"/>`;
        if (s.cl && Sc * Math.hypot(s.cl[1][0] - s.cl[0][0], s.cl[1][1] - s.cl[0][1]) > 30) o += Ln(X(s.cl[0][0]), Y(s.cl[0][1]), X(s.cl[1][0]), Y(s.cl[1][1]), 'cl');
        for (const h of s.holes) o += `<circle class="pt" cx="${X(h.c[0]).toFixed(1)}" cy="${Y(h.c[1]).toFixed(1)}" r="${Math.max(1.2, h.r * Sc).toFixed(1)}"/>`;
        o += '</g>'; }
      const gb = Y(w0), gt = Y(w1), txt = (u1 - u0).toFixed(2), wide = (X(u1) - X(u0)) > txt.length * 10 + 20;
      o += hdim(prims[0].g, X(u0), X(u1), gb, gb + 30, wide ? txt : '') + (wide ? '' : T(X(u1) + 12, gb + 35, txt, 'tx', 'start'));
      if ((w1 - w0) * Sc > 24) o += vdim(prims[0].g, gt, gb, X(u1), X(u1) + 26, (w1 - w0).toFixed(2));
      o += T(v.x0 + v.w / 2, gb + 64, `${v.title} · ${lab}`, 'vt');
    }
    const feats = d.features.slice(0, 9), y0 = 790;
    o += T(60, y0 - 4, 'FEATURES (TAGS LIGHT THE SOLID)', 'tq', 'start');
    feats.forEach((f, i) => { const s = `${f.id.toUpperCase()}: ${f.label}`; o += `<g class="dim" data-feat="${f.id}">${T(60, y0 + 15 + i * 15, s.length > 124 ? s.slice(0, 121) + '…' : s, 'tn2', 'start')}</g>`; });
    void esc;
    return { svg: o, bottom: 150, scale: new Set(labs).size > 1 ? 'AS SHOWN' : labs[0], notesBox: { x: 1195, top: 150, n: 54, bottom: 860 } };
  };
}
export function lbView(k, D) {
  const { L: Ln, T, hdim, vdim } = k, P = lbParams(), B = LB(), g = L.lb;
  // section at the mid station, 1:2
  const s = P.segs[Math.floor(P.n / 2)], S2 = 50, cx = 560, cz = 330, zc = Math.min(...s.regions.fo[0].map((q) => q[1]));
  const path = (a) => `M${a.map((q) => `${(cx + q[0] * S2).toFixed(1)} ${(cz - (q[1] - zc) * S2).toFixed(1)}`).join('L')}Z`;
  let o = ['fo', 'core', 'fi'].map((r) => `<g data-feat="${r === 'core' ? 'core' : 'face'}" class="feat"><path class="pt" d="${path(s.regions[r][0])}"/></g>`).join('');
  const yE = g.hw - g.gap;
  o += hdim('outline', cx - yE * S2, cx + yE * S2, cz + 10, cz + 60, `${(2 * yE).toFixed(2)} (ON THE BELLY CONTOUR)`) + T(cx, cz + 110, `SECTION AT FS ${s.ha.toFixed(2)}, LOOKING FORWARD · 1:2`, 'vt');
  // side view of the panel, hinge, horn and actuator, 1:4
  const S4 = 12.5, X = (fs) => 300 + (fs - 46) * S4, Z = (wl) => 600 - (wl - 22) * S4;
  const P0 = [B.hinge[0], B.hinge[1]], open = (th) => B.at(B.a, th);
  o += `<g data-feat="outline" class="feat">${Ln(X(g.s0), Z(25.0), X(g.s1), Z(24.6))}</g>`;
  const t70 = 70 * Math.PI / 180, e = [P0[0] + (g.s1 - g.s0) * Math.cos(t70), P0[1] - (g.s1 - g.s0) * Math.sin(t70)];
  o += `<g data-feat="outline" class="feat"><path class="hd" d="M${X(P0[0])} ${Z(P0[1])}L${X(e[0])} ${Z(e[1])}"/></g>`;
  const h0 = open(0), h70 = open(70);
  o += `<g data-feat="horn" class="feat">${Ln(X(P0[0]), Z(P0[1]), X(h0[0]), Z(h0[1]))}<circle class="pt" cx="${X(h0[0])}" cy="${Z(h0[1])}" r="4"/></g>`;
  o += `<g data-feat="horn" class="feat"><path class="hd" d="M${X(P0[0])} ${Z(P0[1])}L${X(h70[0])} ${Z(h70[1])}"/></g>`;
  o += `<g data-feat="hinge" class="feat"><circle class="pt" cx="${X(P0[0])}" cy="${Z(P0[1])}" r="5"/></g>` + Ln(X(B.A[0]), Z(B.A[2]), X(h0[0]), Z(h0[1]), 'ld') + `<path class="hd" d="M${X(B.A[0])} ${Z(B.A[2])}L${X(h70[0])} ${Z(h70[1])}"/>`;
  o += T(X(B.A[0]) - 8, Z(B.A[2]) + 5, 'ANCHOR', 'tq', 'end') + T(X(P0[0]) - 12, Z(P0[1]) + 20, 'A (HINGE)', 'tq', 'end');
  o += hdim('outline', X(g.s0), X(g.s1), Z(24.6), Z(24.6) + 70, `${(g.s1 - g.s0).toFixed(2)} (FS ${g.s0}–${g.s1})`);
  o += vdim('horn', Z(h0[1]), Z(P0[1]), X(P0[0]), X(P0[0]) + 40, `${(h0[1] - P0[1]).toFixed(2)}`);
  o += T(560, 860, `SIDE, CLOSED (SOLID) AND 70° OPEN (DASHED); ACTUATOR ${B.L0.toFixed(2)} → ${B.L1.toFixed(2)} · 1:8`, 'vt');
  return { svg: o, bottom: 150, scale: 'AS SHOWN', notesBox: { x: 1195, top: 150, n: 54, bottom: 860 } };
}
export function ciView(k, D) {
  const { T, L: Ln } = k, d = D.def, rows = [['AXIS', 'SURFACE', 'CONTROL', 'LINE TRAVEL'], ...d.rigTable()];
  let o = T(60, 140, 'RIGGING TABLE (STOPS LEZ-27-160 SET AT THESE)', 'tq', 'start');
  rows.forEach((r, i) => { const y = 165 + i * 20; [0, 160, 330, 680].forEach((x, j) => { o += T(60 + x, y, r[j], i ? 'tn2' : 'tq', 'start'); }); if (!i) o += Ln(60, y + 6, 1120, y + 6, 'bd'); });
  o += T(60, 300, 'OPENINGS OTHER PARTS CARRY FOR THE CONTROLS (OWNER)', 'tq', 'start');
  const wrap = (s, n) => { const w = s.split(' '), out = []; let l = ''; for (const x of w) { if ((l + ' ' + x).trim().length > n) { out.push(l.trim()); l = x; } else l += ' ' + x; } if (l.trim()) out.push(l.trim()); return out; };
  let y = 322; for (const [who, what] of OPENINGS()) { o += `<g class="dim" data-feat="rig">${T(60, y, who, 'tn2', 'start')}`; for (const ln of wrap(what, 86)) { o += T(400, y, ln, 'tn2', 'start'); y += 15; } o += '</g>'; y += 4; }
  y += 16; o += T(60, y, 'HARDWARE (PER AIRCRAFT)', 'tq', 'start'); y += 20;
  for (const l of d.hardware) { o += `<g class="dim" data-feat="joints">${T(60, y, `${l.qty} ×`, 'tn2', 'start')}${T(110, y, l.std, 'tn2', 'start')}${T(260, y, l.desc, 'tn2', 'start')}</g>`; y += 15; }
  return { svg: o, bottom: 150, scale: 'NONE', notesBox: { x: 1195, top: 150, n: 54, bottom: 860 } };
}
