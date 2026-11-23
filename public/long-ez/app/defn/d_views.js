// Block D drawing views (B-size sheet, 1700 × 1100 units = 17 × 11 in, so 100 units per inch at 1:1). Every number is read
// from the record or the parts module the solid is built from. Notional.
import { GEO, gearLegLength, BASE_MAT } from '../structures.js';
import { BOW, SCHED, EAR, GM, AXB, YM, S0, ZR, YC, ZAX, bowPacks, legAt, earPolys } from '../parts/wpD1_gear.js';
import { layer, FUS } from '../parts/wp26_fuselage.js';

const tU = BASE_MAT.GUD.t, f2 = (x) => x.toFixed(2), f3 = (x) => x.toFixed(3);
const pathOf = (pts, X, Z, close = true) => `M${pts.map(([a, b]) => `${X(a).toFixed(1)} ${Z(b).toFixed(1)}`).join('L')}${close ? 'Z' : ''}`;
const plies = (u) => bowPacks().reduce((a, p) => a + (p.uEnd > u + 1e-9 || p.uEnd >= 1 ? p.plies : 0), 0);

export const VIEWS_D = {
  /** LEZ-32-170 bow: front view of the right half looking aft (1:4), section at the mount (1:2), leg end looking inboard (1:2), pack table */
  'LEZ-32-170'(k, D) {
    const { L, T, hdim, vdim, leader } = k, S = 20, X = (y) => 90 + y * S, Z = (z) => 180 + (27 - z) * S, Lleg = gearLegLength() * 12;
    const us = [...Array.from({ length: 11 }, (_, i) => -1 + i / 10), ...Array.from({ length: 81 }, (_, i) => i / 80)];
    const edge = (sg) => us.map((u) => { const { p, t } = legAt(u), h = plies(Math.max(u, 0)) * tU / 2; return [p[0] - sg * t[1] * h, p[1] + sg * t[0] * h]; });
    let o = `<g data-feat="bow" class="feat"><path class="pt" d="${pathOf([...edge(1), ...edge(-1).reverse()], X, Z)}"/></g>`;
    o += `<path class="cl" style="fill:none" d="${pathOf(us.map((u) => legAt(u).p), X, Z, false)}"/>`;
    for (const p of bowPacks().filter((q) => q.uEnd < 1)) { const { p: c, t } = legAt(p.uEnd), h = plies(p.uEnd - 1e-6) * tU / 2 + 0.6; o += `<g class="dim" data-feat="bow">${L(X(c[0] - t[1] * h), Z(c[1] + t[0] * h), X(c[0] - t[1] * (h + 0.5)), Z(c[1] + t[0] * (h + 0.5)), 'ld')}</g>`; }
    const E = earPolys(); o += `<g data-feat="ear" class="feat"><path class="pt" d="${pathOf(E.strap, X, Z)}"/><path class="pt" d="${pathOf(E.filler, X, Z)}"/><circle class="pt" cx="${X(YM)}" cy="${Z(GM.ztc)}" r="${GM.r * S}"/></g>`;
    const belly = layer(GEO.gear.s, 0, -FUS.tf, false, 1).slice(0, FUS.n + 1).filter((q) => q[1] < 29.5); o += `<path class="hd" d="${pathOf(belly, X, Z, false)}"/>` + T(X(belly.at(-1)[0]) + 6, Z(belly.at(-1)[1]) + 4, 'BELLY (LEZ-53-150)', 'tq', 'start');
    o += L(X(0), Z(27) - 10, X(0), Z(3.5), 'cl') + T(X(0), Z(27) - 16, 'A (CL)', 'tq');
    const p1 = GEO.gear.p1.map((v) => v * 12), t1 = plies(1) * tU, face = p1[0] + t1 / 2;
    o += `<g data-feat="axle" class="feat">${[-1, 1].map((sz) => `<circle class="pt" cx="${X(face - t1 / 2)}" cy="${Z(ZAX + sz * AXB.b)}" r="${AXB.D / 2 * S + 1}"/>`).join('')}${L(X(face) + 4, Z(ZAX), X(YC), Z(ZAX), 'cl')}</g>` + T(X(YC) + 6, Z(ZAX) + 5, 'AXLE', 'tq', 'start');
    o += hdim('bow', X(0), X(YM), Z(ZR) + 30, Z(27) - 40, `${f2(YM)} MOUNT`) + hdim('bow', X(0), X(face), Z(p1[1]), Z(2.2), `${f2(face)} LEG FACE (CORE)`) + hdim('axle', X(0), X(YC), Z(ZAX), Z(1.0), `${f2(YC)} WHEEL CENTRE-PLANE`);
    o += vdim('bow', Z(ZR), Z(p1[1]), X(face), X(face) + 70, `${f2(ZR - p1[1])}`) + T(X(face) + 84, Z(p1[1]) + 22, `END WL ${f2(p1[1])}`, 'tq', 'start') + vdim('ear', Z(GM.ztc), Z(ZR), X(YM), X(YM) - 95, `${f2(GM.ztc - ZR)}`);
    o += leader('ear', X(YM + GM.r), Z(GM.ztc + GM.r), X(YM) + 140, Z(27) + 4, `EAR: ${EAR.ns} × 6781 0/90 OVER Ø${GM.D} TUBE, ${EAR.nw} × 6781 0/90 CLAMP WRAPS`);
    o += T(X(22), Z(1.0) + 40, 'FRONT VIEW, RIGHT HALF LOOKING AFT (LEFT OPPOSITE) · 1:5', 'vt');
    // section at the mount, 1:2
    const S2 = 50, sx = 140, sy = 880, w0 = BOW.w0, t0 = plies(0) * tU, tw = SCHED.nX * BASE_MAT.BID.t;
    o += `<g data-feat="bow" class="feat"><rect class="pt" x="${sx}" y="${sy - t0 / 2 * S2}" width="${w0 * S2}" height="${t0 * S2}"/><rect class="hd" style="fill:none" x="${sx - tw * S2}" y="${sy - (t0 / 2 + tw) * S2}" width="${(w0 + 2 * tw) * S2}" height="${(t0 + 2 * tw) * S2}"/></g>`;
    o += hdim('bow', sx, sx + w0 * S2, sy - t0 / 2 * S2, sy - t0 / 2 * S2 - 34, `${f2(w0)}`) + vdim('bow', sy - t0 / 2 * S2, sy + t0 / 2 * S2, sx + w0 * S2, sx + w0 * S2 + 34, `${f3(t0)} (${plies(0)} × 6781 0/90)`);
    o += T(40, sy + 100, `SECTION AT THE MOUNT · 1:2 · + ${SCHED.nX} × 6781 OVER-WRAP`, 'vt', 'start');
    // leg end looking inboard (FS across, WL up), 1:2
    const ex = 700, ez = 915, Xf = (dx) => ex + dx * S2, Zf = (z) => ez - (z - ZAX) * S2, w1 = BOW.w1;
    o += `<g data-feat="bow" class="feat"><path class="pt" d="M${Xf(-w1 / 2)} ${Zf(p1[1])}H${Xf(w1 / 2)}V${Zf(ZAX + 2.4)}M${Xf(-w1 / 2)} ${Zf(p1[1])}V${Zf(ZAX + 2.4)}"/></g>`;
    o += `<g data-feat="axle" class="feat">${[-1, 1].flatMap((a) => [-1, 1].map((b) => `<circle class="pt" cx="${Xf(a * AXB.a)}" cy="${Zf(ZAX + b * AXB.b)}" r="${AXB.D / 2 * S2}"/>`)).join('')}${L(Xf(-w1 / 2) - 15, Zf(ZAX), Xf(w1 / 2) + 15, Zf(ZAX), 'cl')}</g>`;
    o += hdim('axle', Xf(-AXB.a), Xf(AXB.a), Zf(ZAX + AXB.b), Zf(ZAX + 2.4) - 20, `${f2(2 * AXB.a)}`) + vdim('axle', Zf(ZAX + AXB.b), Zf(ZAX - AXB.b), Xf(w1 / 2), Xf(w1 / 2) + 40, `${f2(2 * AXB.b)}`) + hdim('bow', Xf(-w1 / 2), Xf(w1 / 2), Zf(p1[1]), Zf(p1[1]) + 30, `${f2(w1)}`);
    o += T(ex, ez + 140, `LEG END LOOKING INBOARD · 1:2 · 4 × Ø${f3(AXB.D + 0.006)} (AN${AXB.nb})`, 'vt');
    // pack table
    const rows = [['PACK TABLE (8 × 6781 0/90 EACH, LONGEST FIRST)', ''], ...bowPacks().map((p) => [`G-P${String(p.j + 1).padStart(2, '0')}`, p.uEnd >= 1 ? 'AXLE TO AXLE' : `ENDS ${(p.uEnd * Lleg).toFixed(1)} IN DOWN THE LEG`])];
    const half = Math.ceil(rows.length / 2);
    rows.forEach((r, i) => { const c = i < half ? 0 : 1, j = i < half ? i : i - half + 1; o += `<g class="dim" data-feat="bow">${T(1110 + c * 280, 650 + j * 15, r[0], i ? 'tn2' : 'tq', 'start')}${T(1160 + c * 280, 650 + j * 15, r[1], 'tn2', 'start')}</g>`; });
    return { svg: o, bottom: 150, scale: '1:5 / 1:2', notesBox: { x: 1110, top: 150, n: 66, bottom: 620 } };
  },

  /** LEZ-32-120 attachment: view looking aft at the right mount (1:1), side view looking inboard (1:2) */
  'LEZ-32-120'(k, D) {
    const { L, T, hdim, vdim, leader } = k, G = GM, S = 100, X = (y) => 120 + (y - 5.5) * S, Z = (z) => 330 + (27.6 - z) * S;
    const loc = (a, n) => [G.P[0] + a * G.a[0] + n * G.n[0], G.P[1] + a * G.a[1] + n * G.n[1]], rectL = (n0, n1) => [loc(-G.b / 2, n0), loc(G.b / 2, n0), loc(G.b / 2, n1), loc(-G.b / 2, n1)];
    const belly = layer(GEO.gear.s, 0, -FUS.tf, false, 1).slice(0, FUS.n + 1).filter((q) => q[0] > 4.5 && q[1] < 28.6), inner = layer(GEO.gear.s, -FUS.t, -FUS.t - 0.001, false, 1).slice(0, FUS.n + 1).filter((q) => q[0] > 4.5 && q[1] < 28.9);
    let o = `<path class="pt" d="${pathOf(belly, X, Z, false)}"/><path class="hd" d="${pathOf(inner, X, Z, false)}"/>` + T(X(belly.at(-1)[0]) + 8, Z(belly.at(-1)[1]) + 10, 'BELLY OML', 'tq', 'start');
    o += `<g data-feat="angle" class="feat"><path class="pt" d="${pathOf(rectL(G.tbed, G.tbed + G.tf), X, Z)}"/><path class="pt" d="${pathOf(rectL(G.tbed + G.tf, G.dc + G.e), X, Z)}"/><circle class="pt" cx="${X(YM)}" cy="${Z(G.ztc)}" r="${G.db / 2 * S}"/></g>`;
    o += `<g data-feat="tube" class="feat"><circle class="pt" cx="${X(YM)}" cy="${Z(G.ztc)}" r="${G.r * S}"/>${L(X(YM) - 70, Z(G.ztc), X(YM) + 70, Z(G.ztc), 'cl')}${L(X(YM), Z(G.ztc) - 70, X(YM), Z(G.ztc) + 70, 'cl')}</g>`;
    o += `<g data-feat="back" class="feat"><path class="pt" d="${pathOf(rectL(-G.hpT - G.tk, -G.hpT), X, Z)}"/></g>`;
    const E = earPolys(); o += `<path class="hd" d="${pathOf(E.strap, X, Z)}"/>` + `<path class="hd" d="M${X(5.5)} ${Z(ZR + G.t0 / 2)}H${X(YM)}"/>` + T(X(5.6), Z(ZR + G.t0 / 2) + 18, 'BOW + EAR (LEZ-32-170, REF)', 'tq', 'start');
    const pB = loc(0, G.tbed), pH = loc(0, G.dc), pE = loc(0, G.dc + G.e);
    o += `<g class="dim" data-feat="angle">${L(X(pB[0]), Z(pB[1]), X(pE[0]), Z(pE[1]), 'cl')}</g>`;
    o += leader('angle', X(pE[0]), Z(pE[1]), X(pE[0]) + 60, Z(pE[1]) + 40, `LEG ${G.te} THK, BOLT ${f3(G.dc - G.tbed)} FROM C, e ${f2(G.e)}`);
    o += leader('tube', X(YM - G.r * 0.7), Z(G.ztc + G.r * 0.7), X(5.6), Z(G.ztc) - 120, `Ø${G.D} × ${G.wall} 4130 N, AN${Math.round(G.db * 16)} BOLT`);
    o += leader('back', X(loc(G.b / 2, -G.hpT - G.tk)[0]), Z(loc(G.b / 2, -G.hpT - G.tk)[1]), X(5.6), Z(28.6) - 50, `STRIP ${G.b} × ${f2(G.Lk)} × ${G.tk} 6061-T6 INSIDE`);
    o += hdim('tube', X(5.5), X(YM), Z(G.ztc) + 120, Z(G.ztc) + 150, `BL ${f2(YM)}`) + vdim('tube', Z(G.ztc), Z(ZR + G.t0 / 2), X(5.5), X(5.5) - 20, `${f2(G.ztc - ZR - G.t0 / 2)}`);
    o += T(X(8), Z(23.2) + 60, 'VIEW LOOKING AFT, RIGHT MOUNT (LEFT OPPOSITE) · 1:1', 'vt');
    // side view looking inboard from the right (FS across, aft right; WL up), 1:2
    const S2 = 50, Xs = (dx) => 950 + dx * S2, Zs = (z) => 330 - (z - 24) * S2, zN = (n) => G.P[1] + n * G.n[1];
    o += `<g data-feat="tube" class="feat"><rect class="pt" x="${Xs(-G.Lt / 2)}" y="${Zs(G.ztc + G.r)}" width="${G.Lt * S2}" height="${G.D * S2}"/></g>`;
    for (const sx of [-1, 1]) { const x0 = sx * G.Lt / 2, xs = [x0, x0 + sx * G.Lf].sort((a, b) => a - b), xl = [x0, x0 + sx * G.te].sort((a, b) => a - b);
      o += `<g data-feat="angle" class="feat"><rect class="pt" x="${Xs(xs[0])}" y="${Zs(zN(G.tbed) + G.b / 2 * Math.abs(G.a[1]))}" width="${(xs[1] - xs[0]) * S2}" height="${(G.tf * Math.abs(G.n[1]) + G.b * Math.abs(G.a[1])) * S2}"/><rect class="pt" x="${Xs(xl[0])}" y="${Zs(zN(G.tbed + G.tf))}" width="${G.te * S2}" height="${(zN(G.tbed + G.tf) - zN(G.dc + G.e)) * S2}"/></g>`;
      for (const xb of [x0 + sx * (G.te + G.c1), x0 + sx * (G.te + G.c1 + G.pb)]) o += `<g data-feat="angle" class="feat">${L(Xs(xb), Zs(zN(G.tbed)) - 30, Xs(xb), Zs(zN(G.tbed + G.tf)) + 12, 'cl')}</g>`; }
    o += `<path class="hd" d="M${Xs(-BOW.w0 / 2)} ${Zs(ZR + G.t0 / 2)}H${Xs(BOW.w0 / 2)}"/>` + L(Xs(0), Zs(26.8), Xs(0), Zs(23.2), 'cl') + T(Xs(0), Zs(26.8) - 6, 'B', 'tq');
    const x1 = G.Lt / 2 + G.te + G.c1, x2 = x1 + G.pb;
    o += hdim('tube', Xs(-G.Lt / 2), Xs(G.Lt / 2), Zs(G.ztc - G.r), Zs(23.2) + 10, `${f2(G.Lt)}`) + hdim('angle', Xs(0), Xs(x1), Zs(26.6), Zs(26.6) - 40, `${f2(x1)}`) + hdim('angle', Xs(0), Xs(x2), Zs(26.6), Zs(26.6) - 75, `${f2(x2)}`) + hdim('angle', Xs(-G.Lt / 2 - G.Lf), Xs(-G.Lt / 2), Zs(26.6), Zs(26.6) - 40, `${f2(G.Lf)}`);
    o += T(Xs(0), Zs(23.2) + 75, `SIDE VIEW LOOKING INBOARD · 1:2 · 4 × Ø${f3(G.dbb + 0.006)} BASE (AN${G.nb})`, 'vt');
    return { svg: o, bottom: 150, scale: '1:1 / 1:2', notesBox: { x: 1270, top: 150, n: 47, bottom: 860 } };
  },
};
void S0;
