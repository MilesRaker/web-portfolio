// Block G: a drawing view for parts built from primitives (cad/g_prims.py). Each view is an orthographic projection of
// the record's primitives on two of the frame's axes, at a standard scale chosen to fit (100 sheet units per inch at
// 1:1), with the overall dimensions and any the record asks for, feature balloons on the first view and a feature table.
// Everything is drawn from the record's params, so the sheet shows the same numbers the solid is built from. Notional.
import { primsBox } from './g_prims.js';

const SCALES = [1, 2, 4, 5, 8, 10, 16, 20, 24, 32, 48, 64];
const AX = ['BL', 'FS', 'WL'];
const sub = (a, b) => a.map((v, i) => v - b[i]), len = (a) => Math.hypot(...a);
const fmt = (x) => (Math.abs(x) >= 10 ? x.toFixed(2) : x.toFixed(3)).replace(/^0\./, '.');
const wrap = (s, n) => { const w = String(s).split(' '), out = []; let line = ''; for (const x of w) { if ((line + ' ' + x).trim().length > n) { out.push(line.trim()); line = x; } else line += ' ' + x; } if (line.trim()) out.push(line.trim()); return out; };

/** opts: { views: [{ title, u: [axis, sign], v: [axis, sign], area?: [x, y, w, h], only?: (prim) => bool }],
 *          dims?: (p) => [{ view, dir: 'h' | 'v', feat, a, b, text, off }], table?: true, frame?: 'aircraft' | text } */
export function primView(opts) {
  return (k, D) => {
    const { L, T, hdim, vdim } = k, p = D.params(), d = D.def, n = opts.views.length, ALL = opts.prims ? opts.prims(p, D) : p.prims;
    const areas = opts.views.map((v, i) => v.area || (n === 1 ? [70, 120, 1080, 500] : n === 2 ? [70 + i * 580, 120, 520, 480] : [60 + i * 390, 130, 340, 460]));
    let o = '', scales = [];
    const feats = d.features.map((f) => f.id);
    const fitScale = (i) => { const v = opts.views[i], pr = ALL.filter(v.only || (() => true)), b = primsBox(pr), [iu] = v.u, [iv] = v.v, [, , w, h] = areas[i];
      return SCALES.find((s) => (b[2 * iu + 1] - b[2 * iu]) * 100 / s <= w - 90 && (b[2 * iv + 1] - b[2 * iv]) * 100 / s <= h - 90) || SCALES.at(-1); };
    const views = opts.views.map((v, i) => {
      const prims = ALL.filter(v.only || (() => true)), bb = primsBox(prims), [iu, su] = v.u, [iv, sv] = v.v;
      const ur = [bb[2 * iu], bb[2 * iu + 1]], vr = [bb[2 * iv], bb[2 * iv + 1]], [x0, y0, w, h] = areas[i];
      const nS = Math.max(...opts.views.map((_, j) => fitScale(j))), S = 100 / nS;   // one scale for every view on the sheet
      const uc = (ur[0] + ur[1]) / 2, vc = (vr[0] + vr[1]) / 2, cx = x0 + (w - 60) / 2, cy = y0 + (h - 60) / 2;
      const X = (q) => cx + su * (q[iu] - uc) * S, Y = (q) => cy - sv * (q[iv] - vc) * S;
      scales.push(`1:${nS}`);
      return { v, prims, bb, iu, iv, su, sv, S, nS, X, Y, ur, vr, x0, y0, w, h, uc, vc, cx, cy };
    });
    for (const V of views) {
      const { X, Y, iu, iv, S } = V, P2 = (q) => [X(q), Y(q)];
      for (const q of V.prims) {
        let s = '';
        if (q.t === 'box') {
          const lo = q.c.map((c, j) => c - q.d[j] / 2), hi = q.c.map((c, j) => c + q.d[j] / 2), a = P2(lo), b = P2(hi);
          s += `<rect class="pt" x="${Math.min(a[0], b[0]).toFixed(1)}" y="${Math.min(a[1], b[1]).toFixed(1)}" width="${Math.abs(b[0] - a[0]).toFixed(1)}" height="${Math.abs(b[1] - a[1]).toFixed(1)}"/>`;
          for (const hl of q.holes || []) { const rest = [0, 1, 2].filter((j) => j !== hl.ax), c = [...q.c]; c[rest[0]] = hl.u; c[rest[1]] = hl.v;
            if (hl.ax !== iu && hl.ax !== iv) s += `<circle class="pt" cx="${X(c).toFixed(1)}" cy="${Y(c).toFixed(1)}" r="${Math.max(1.5, hl.r * S).toFixed(1)}"/>`;
            else { const e = [...c], f = [...c]; e[hl.ax] = lo[hl.ax]; f[hl.ax] = hi[hl.ax]; s += L(X(e).toFixed(1), Y(e).toFixed(1), X(f).toFixed(1), Y(f).toFixed(1), 'cl'); } }
        } else if (q.t === 'loft') {
          for (const sec of q.secs) s += `<path class="pt" d="M${sec.map((r) => P2(r).map((x) => x.toFixed(1)).join(' ')).join('L')}Z"/>`;
          const m = q.secs[0].length, st = Math.max(1, Math.floor(m / 4));
          for (let j = 0; j < m; j += st) { const a = P2(q.secs[0][j]), b = P2(q.secs[1][j]); s += L(a[0].toFixed(1), a[1].toFixed(1), b[0].toFixed(1), b[1].toFixed(1), 'ln'); }
        } else {
          const A = P2(q.a), B = P2(q.b), ra = (q.t === 'cone' ? q.r1 : q.r) * S, rb = (q.t === 'cone' ? q.r2 : q.r) * S, dd = sub(B, A), Lp = len(dd);
          if (Lp < 0.5) {   // axis normal to the view: the end circles, bore and axial holes
            s += `<circle class="pt" cx="${A[0].toFixed(1)}" cy="${A[1].toFixed(1)}" r="${Math.max(ra, rb).toFixed(1)}"/>`;
            if (q.ri) s += `<circle class="pt" cx="${A[0].toFixed(1)}" cy="${A[1].toFixed(1)}" r="${(q.ri * S).toFixed(1)}"/>`;
            if (q.t === 'cone' && Math.min(ra, rb) > 1) s += `<circle class="pt" cx="${A[0].toFixed(1)}" cy="${A[1].toFixed(1)}" r="${Math.min(ra, rb).toFixed(1)}"/>`;
            for (const hl of q.holes || []) s += `<circle class="pt" cx="${X(hl.p).toFixed(1)}" cy="${Y(hl.p).toFixed(1)}" r="${Math.max(1.5, hl.r * S).toFixed(1)}"/>`;
          } else {
            const nx = -dd[1] / Lp, ny = dd[0] / Lp, f = Math.sqrt(Math.max(0, 1 - ((q.b[3 - iu - iv] - q.a[3 - iu - iv]) / len(sub(q.b, q.a))) ** 2));
            const pts = [[A[0] + nx * ra, A[1] + ny * ra], [B[0] + nx * rb, B[1] + ny * rb], [B[0] - nx * rb, B[1] - ny * rb], [A[0] - nx * ra, A[1] - ny * ra]];
            void f; s += `<path class="pt" d="M${pts.map((r) => r.map((x) => x.toFixed(1)).join(' ')).join('L')}Z"/>` + L(A[0].toFixed(1), A[1].toFixed(1), B[0].toFixed(1), B[1].toFixed(1), 'cl');
            if (q.ri) for (const sg of [1, -1]) s += L((A[0] + sg * nx * q.ri * S).toFixed(1), (A[1] + sg * ny * q.ri * S).toFixed(1), (B[0] + sg * nx * q.ri * S).toFixed(1), (B[1] + sg * ny * q.ri * S).toFixed(1), 'hd');
          }
        }
        o += `<g data-feat="${q.feat}" class="feat">${s}</g>`;
      }
      // overall dimensions
      const bx = [X([V.bb[0], V.bb[2], V.bb[4]]), X([V.bb[1], V.bb[3], V.bb[5]])], by = [Y([V.bb[0], V.bb[2], V.bb[4]]), Y([V.bb[1], V.bb[3], V.bb[5]])];
      const xl = Math.min(...bx), xr = Math.max(...bx), yt = Math.min(...by), yb = Math.max(...by), f0 = V.v.feat || feats[0];
      o += hdim(f0, xl, xr, yb, yb + 34, fmt(V.ur[1] - V.ur[0])) + vdim(f0, yt, yb, xr, xr + 30, fmt(V.vr[1] - V.vr[0]));
      o += T((xl + xr) / 2, yb + 76, `${V.v.title} · 1:${V.nS}`, 'vt');
      o += T((xl + xr) / 2, yb + 96, `${AX[V.iu]} ${V.su > 0 ? '→' : '←'} · ${AX[V.iv]} ${V.sv > 0 ? '↑' : '↓'}${opts.frame === 'own' ? ' (OWN FRAME)' : ''}`, 'tq');
      V.box = { xl, xr, yt, yb };
    }
    // extra dimensions (model coordinates along the view's axes)
    for (const x of (opts.dims ? opts.dims(p) : [])) {
      const V = views[x.view], q0 = [0, 0, 0];
      if (x.dir === 'h') { const a = [...q0], b = [...q0]; a[V.iu] = x.a; b[V.iu] = x.b; const y = V.box.yt - (x.off || 30); o += hdim(x.feat, V.X(a), V.X(b), V.box.yt, y, x.text); }
      else { const a = [...q0], b = [...q0]; a[V.iv] = x.a; b[V.iv] = x.b; const xx = V.box.xl - (x.off || 30); o += vdim(x.feat, V.Y(a), V.Y(b), V.box.xl, xx, x.text); }
    }
    // feature balloons on the first view, and the feature table
    const V0 = views[0];
    d.features.forEach((f, i) => {
      const ps = V0.prims.filter((q) => q.feat === f.id); if (!ps.length) return;
      const b = primsBox(ps), c = [(b[0] + b[1]) / 2, (b[2] + b[3]) / 2, (b[4] + b[5]) / 2], x = V0.X(c), y = V0.Y(c), bx = x + 26 + (i % 3) * 6, byy = y - 26 - (i % 2) * 10;
      o += `<g class="dim" data-feat="${f.id}">${L(x.toFixed(1), y.toFixed(1), bx.toFixed(1), byy.toFixed(1), 'ld')}<circle class="fcf" cx="${bx.toFixed(1)}" cy="${byy.toFixed(1)}" r="11"/>${T(bx.toFixed(1), (byy + 5).toFixed(1), String(i + 1), 'tq')}</g>`;
    });
    let ty = 690;
    o += T(40, ty - 22, 'FEATURES', 'vt', 'start');
    d.features.forEach((f, i) => { const lines = wrap(`${i + 1}  ${f.label}${f.tol ? ` [${f.tol}]` : ''}`, 128); lines.forEach((ln, j) => { if (ty < 1068) o += `<g class="dim" data-feat="${f.id}">${T(j ? 66 : 40, ty, ln, 'tn2', 'start')}</g>`; ty += 15; }); ty += 2; });
    if (D.install) { ty += 8; o += T(40, ty, 'HARDWARE', 'vt', 'start'); ty += 20;
      for (const l of d.hardware) { for (const [j, ln] of wrap(`${l.qty} × ${l.std}  ${l.desc}${l.torque ? `; ${l.torque[0]}–${l.torque[1]} in-lb` : ''}`, 128).entries()) { if (ty < 1068) o += T(j ? 66 : 40, ty, ln, 'tn2', 'start'); ty += 15; } } }
    return { svg: o, bottom: 150, scale: [...new Set(scales)].join(' / '), notesBox: { x: 1240, top: 150, n: 50, bottom: 860 } };
  };
}
