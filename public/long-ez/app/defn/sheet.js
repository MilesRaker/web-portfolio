// Drawing sheets for parts with a definition record: B-size, third-angle, inches. Every number is read from the record
// (the same numbers the CadQuery solid is built from and measured against), and every dimension is tagged with the
// feature it locates (data-feat), so the explorer can light the feature on the solid when a dimension is hovered.
// The views are drawn per part (VIEWS); the frame, notes, revision block and title block are shared.
import { defOf } from './release.js';
import { VIEWS as V_A } from './blocks/a_airframe.js';
import { VIEWS as V_B } from './blocks/b_cockpit.js';
import { VIEWS as V_C } from './blocks/c_controls.js';
import { VIEWS as V_D } from './blocks/d_maingear.js';
import { VIEWS as V_E } from './blocks/e_nosegear.js';
import { VIEWS as V_F } from './blocks/f_fuel.js';
import { VIEWS as V_G } from './blocks/g_powerplant.js';
import { VIEWS as V_H } from './blocks/h_engsys.js';
import { VIEWS as V_I } from './blocks/i_electrical.js';
import { VIEWS as V_J } from './blocks/j_avionics.js';
import { VIEWS as V_P } from './blocks/p_prepreg.js';

import { coreTemplate, WP_BLOCKS } from './wing_panel.js';
import { GEO, FIXED, wingSec, surfaceGeom, analyse, DEFAULT_DESIGN } from '../structures.js';
import { WROOT, caps } from '../parts/wp17_wing_panel.js';
import { WING_END, LWA, LUG, RJ, SEAL, ATTACH } from '../parts/wp13_airframe_joints.js';
import { WGL, wlSized, capsOf } from '../parts/wp18_winglet.js';
import { FRAMES } from '../plybook.js';
import { CTLS, HINGE, ctlSection, ctlStations } from '../parts/wp19_ctl.js';
import { JS as JSP, jutStations, jutSection } from '../parts/wp20_jutout.js';
import { DANG } from '../parts/wp15_cs_spar.js';
import { csCoreTemplates } from './cs_spar.js';
import { STK, strakeSection, LAP, lapParams } from '../parts/wp21_strake.js';
import { MOUNT_SIZING } from '../parts/wp22_mount.js';
import { CNA, cnCaps } from '../parts/wp24_canard.js';
import { strakeSec } from '../structures.js';
import { F22G, HP, f22Regions } from '../parts/wp25_f22.js';
import { FUS, layer, fusStations } from '../parts/wp26_fuselage.js';
import { fusAt } from '../structures.js';
import { NG } from '../parts/ng_layout.js';

const chunk = (a, n) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const d3 = (x) => x.toFixed(3).replace(/^0\./, '.').replace(/^-0\./, '-.');
const d2 = (x) => x.toFixed(2).replace(/^0\./, '.');
const d4 = (x) => x.toFixed(4).replace(/^0\./, '.');

/** drawing primitives in sheet units */
function kit() {
  const L = (x1, y1, x2, y2, cls = 'ln') => `<line class="${cls}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
  const T = (x, y, s, cls = 'tx', anchor = 'middle') => `<text class="${cls}" x="${x}" y="${y}" text-anchor="${anchor}">${esc(s)}</text>`;
  const arrow = (x, y, dir) => { const a = dir * 14; return `<path class="ar" d="M${x} ${y}L${x + a} ${y - 4}L${x + a} ${y + 4}Z"/>`; };
  const arrowV = (x, y, dir) => { const a = dir * 14; return `<path class="ar" d="M${x} ${y}L${x - 4} ${y + a}L${x + 4} ${y + a}Z"/>`; };
  /** horizontal dimension x1 → x2 with its line at y; extension lines start at y0 (above or below the line) */
  const hdim = (feat, x1, x2, y0, y, text) => { const s = y < y0 ? -1 : 1; return `<g class="dim" data-feat="${feat}">${L(x1, y0 + s * 6, x1, y + s * 8, 'ex')}${L(x2, y0 + s * 6, x2, y + s * 8, 'ex')}${L(x1, y, x2, y, 'dl')}${arrow(x1, y, 1)}${arrow(x2, y, -1)}${T((x1 + x2) / 2, y - 7, text)}</g>`; };
  /** vertical dimension y1 → y2 with its line at x; extension lines from x0; text right of the line (or left when x < x0) */
  const vdim = (feat, y1, y2, x0, x, text) => { const s = x < x0 ? -1 : 1;
    return `<g class="dim" data-feat="${feat}">${L(x0 + s * 6, y1, x + s * 8, y1, 'ex')}${L(x0 + s * 6, y2, x + s * 8, y2, 'ex')}${L(x, y1, x, y2, 'dl')}${arrowV(x, y1, 1)}${arrowV(x, y2, -1)}${T(x + s * 14, (y1 + y2) / 2 + 5, text, 'tx', s > 0 ? 'start' : 'end')}</g>`; };
  const fcf = (x, y, cells) => { let w = 0, s = ''; for (const c of cells) { const cw = 16 + c.length * 9.5; s += `<rect class="fcf" x="${x + w}" y="${y - 17}" width="${cw}" height="24"/>${T(x + w + cw / 2, y, c)}`; w += cw; } return s; };
  const datum = (x, y, letter) => `<g class="datum">${L(x, y, x, y - 22)}<path class="ar" d="M${x - 7} ${y}L${x + 7} ${y}L${x} ${y + 10}Z"/><rect class="fcf" x="${x - 13}" y="${y - 48}" width="26" height="26"/>${T(x, y - 29, letter)}</g>`;
  /** datum symbol hanging under a feature control frame that starts at (fx, fy) */
  const datumOnFcf = (feat, fx, fy, letter) => `<g class="datum" data-feat="${feat}">${L(fx + 20, fy + 7, fx + 20, fy + 26)}<path class="ar" d="M${fx + 13} ${fy + 7}L${fx + 27} ${fy + 7}L${fx + 20} ${fy + 17}Z"/><rect class="fcf" x="${fx + 7}" y="${fy + 26}" width="26" height="26"/>${T(fx + 20, fy + 45, letter)}</g>`;
  /** leader from a feature (x0, y0) to a shoulder at (x1, y1), callout text, optional control frame under it */
  const leader = (feat, x0, y0, x1, y1, text, cells) => `<g class="dim" data-feat="${feat}">${L(x0, y0, x1, y1, 'ld')}${L(x1, y1, x1 + 40, y1, 'ld')}${T(x1 + 46, y1 + 5, text, 'tx', 'start')}${cells ? fcf(x1 + 46, y1 + 37, cells) : ''}</g>`;
  return { L, T, arrow, hdim, vdim, fcf, datum, datumOnFcf, leader };
}

/** rounded-rectangle outline (plan of a plate): corner radii rl at the left end, rr at the right end */
const rrect = (x1, y1, x2, y2, rl, rr) => `M${x1 + rl} ${y1}H${x2 - rr}A${rr} ${rr} 0 0 1 ${x2} ${y1 + rr}V${y2 - rr}A${rr} ${rr} 0 0 1 ${x2 - rr} ${y2}H${x1 + rl}A${rl} ${rl} 0 0 1 ${x1} ${y2 - rl}V${y1 + rl}A${rl} ${rl} 0 0 1 ${x1 + rl} ${y1}Z`;
const holeMarks = (k, X, Yc, S, holes) => holes.map((h) => `<g data-feat="${h.id}" class="feat"><circle class="pt" cx="${X(h.u)}" cy="${Yc}" r="${h.r * S}"/>${k.L(X(h.u) - h.r * S - 10, Yc, X(h.u) + h.r * S + 10, Yc, 'cl')}${k.L(X(h.u), Yc - h.r * S - 10, X(h.u), Yc + h.r * S + 10, 'cl')}</g>`).join('');


/** control surface (aileron, elevator): plan with the hinge line and horn (1:10), section at the inboard end (1:2) */
function ctlView(id) {
  return (k, D) => {
    const { L, T, hdim, vdim, leader } = k, C = CTLS[id], st = ctlStations(id), a = st[0], b = st.at(-1), sA = ctlSection(id, a), sB = ctlSection(id, b);
    const fs0 = Math.min(sA.pts[0][0], ...sA.pts.map((q) => q[0])), S = 10, X = (y) => 120 + (y - a) * 12 * S, Yp = (fs) => 200 + (fs - fs0) * S;
    const fr = (s) => Math.min(...s.pts.map((q) => q[0])), te = (s) => Math.max(...s.pts.map((q) => q[0]));
    let o = `<g data-feat="outline" class="feat"><path class="pt" d="M${X(a)} ${Yp(fr(sA))}L${X(b)} ${Yp(fr(sB))}L${X(b)} ${Yp(te(sB))}L${X(a)} ${Yp(te(sA))}Z"/></g>`;
    const hx = (s) => s.pts.find((q, i) => i === (C.hinge > 0 ? 24 : 25))[0];
    o += `<g data-feat="hinge" class="feat">${L(X(a), Yp(hx(sA)), X(b), Yp(hx(sB)), 'hd')}</g>` + T(X(b) + 10, Yp(hx(sB)) + 5, 'A', 'tx', 'start') + T(X(a) - 8, Yp(te(sA)) + 24, 'B', 'tx', 'end');
    o += `<g data-feat="horn" class="feat"><rect class="pt" x="${X(a) + 4}" y="${Yp(fr(sA)) - C.horn.arm * S}" width="${C.horn.t * S * 4}" height="${(C.horn.arm + 1.0) * S}"/></g>`;
    o += leader('horn', X(a) + 6, Yp(fr(sA)) - C.horn.arm * S, X(a) + 60, Yp(fr(sA)) - 50, `HORN ${C.horn.t} × ${C.horn.w} 6061-T6, 2 × AN${C.horn.bolt}`);
    o += hdim('outline', X(a), X(b), Yp(te(sA)), Yp(te(sA)) + 46, `${((b - a) * 12).toFixed(2)} (BL ${(a * 12).toFixed(2)}–${(b * 12).toFixed(2)})`);
    o += vdim('outline', Yp(fr(sA)), Yp(te(sA)), X(a), X(a) - 30, `${(te(sA) - fr(sA)).toFixed(2)}`) + vdim('outline', Yp(fr(sB)), Yp(te(sB)), X(b), X(b) + 30, `${(te(sB) - fr(sB)).toFixed(2)}`);
    o += leader('hinge', X((a + b) / 2), Yp((hx(sA) + hx(sB)) / 2), X((a + b) / 2) + 40, Yp(fr(sA)) - 70, `${HINGE.std} CONTINUOUS, ${C.hinge > 0 ? 'UPPER' : 'LOWER'} SKIN`);
    o += T((X(a) + X(b)) / 2, Yp(te(sA)) + 110, `PLAN, RIGHT ${id.toUpperCase()} (LEFT OPPOSITE), FWD ↑ · 1:10`, 'vt');
    // section at the inboard end, 1:2
    const S2 = 50, ox = 160, oy = 640, x0 = fr(sA), zc = sA.pts.reduce((s, q) => s + q[1], 0) / sA.pts.length;
    const P = (q) => `${ox + (q[0] - x0) * S2} ${oy - (q[1] - zc) * S2}`;
    o += `<g data-feat="outline" class="feat"><path class="pt" d="M${sA.pts.map(P).join('L')}Z"/></g>`;
    const top = sA.pts.reduce((m, q) => (q[1] > m[1] ? q : m)), hq = sA.pts[C.hinge > 0 ? 24 : 25], bq = sA.pts[C.hinge > 0 ? 25 : 24];
    o += `<g data-feat="hinge" class="feat"><circle class="pt" cx="${ox + (hq[0] - x0) * S2}" cy="${oy - (hq[1] - zc) * S2 - C.hinge * 4}" r="${HINGE.pin / 2 * S2 + 2}"/></g>`;
    o += `<g data-feat="bevel" class="feat">${L(ox + (hq[0] - x0) * S2, oy - (bq[1] - zc) * S2, ox + (bq[0] - x0) * S2, oy - (bq[1] - zc) * S2, 'hd')}</g>`;
    o += hdim('bevel', ox + (hq[0] - x0) * S2, ox + (bq[0] - x0) * S2, oy - (bq[1] - zc) * S2, oy - (bq[1] - zc) * S2 + C.hinge * 44, `${sA.bev.toFixed(2)} BEVEL`);
    o += vdim('outline', oy - (Math.max(hq[1], bq[1]) - zc) * S2, oy - (Math.min(hq[1], bq[1]) - zc) * S2, ox, ox - 40, `${sA.depth.toFixed(2)}`);
    o += hdim('outline', ox + (hq[0] - x0) * S2, ox + (te(sA) - x0) * S2, oy - (top[1] - zc) * S2, oy - (top[1] - zc) * S2 - 40, `${sA.chord.toFixed(2)}`);
    o += T(Math.max(ox + (te(sA) - x0) * S2 / 2, 380), oy + 120, `SECTION AT B (TEMPLATE T1), LOOKING OUTBOARD · 1:2 · ±${C.travel()}° TRAVEL`, 'vt');
    return { svg: o, bottom: 150, scale: '1:10 / 1:2', notesBox: { x: 1000, top: 150, n: 76, bottom: 860 } };
  };
}

// ======================================================================== per-part views: { svg, bottom, scale }
const VIEWS = {
  /** LEZ-57-142 LWA plate: plan and edge view, 1:1 */
  'LEZ-57-142'(k, D) {
    const { L, T, hdim, vdim, fcf, datum, datumOnFcf, leader } = k, p = D.params(), S = 100;
    const X = (u) => 260 + (u - p.u0) * S, Yc = 410, Yw = (w) => Yc - w * S;   // the bolt ordinates stack up under the revision block
    const yT = Yc + p.W / 2 * S + 175, yB = yT + p.t * S;
    const xi = X(p.u0), xo = X(p.u1), yTop = Yw(p.W / 2), yBot = Yw(-p.W / 2), ri = p.rIn * S, ro = p.rOut * S, xB = X(0);
    const holes = [{ id: 'pin', u: 0, r: p.D / 2 }, ...p.bolts.map((u, i) => ({ id: `b${i + 1}`, u, r: p.dB / 2 }))];
    let o = `<g data-feat="outline" class="feat"><path class="pt" d="${rrect(xi, yTop, xo, yBot, ri, ro)}"/></g>` + holeMarks(k, X, Yc, S, holes);
    o += L(xi - 30, Yc, xo + 30, Yc, 'cl') + T(xi - 40, Yc + 6, 'CL C', 'tx', 'end') + T((xi + xo) / 2, yBot + 90, 'PLAN', 'vt');
    const rows = [yTop - 40, yTop - 78, yTop - 116, yTop - 154];
    o += hdim('outline', xi, xB, yTop, rows[0], d2(-p.u0));
    p.bolts.forEach((u, i) => { o += hdim(`b${i + 1}`, xB, X(u), yTop, rows[i], d2(u)); });
    o += hdim('outline', xB, xo, yTop, rows[3], d2(p.u1));
    o += hdim('outline', xi, xo, yBot, yBot + 54, d2(p.L));
    o += vdim('outline', yTop, yBot, xo, xo + 80, `${d3(p.W)} ±.005`);
    o += leader('pin', xB + p.D / 2 * S * 0.7, Yc + p.D / 2 * S * 0.7, xB + 70, yBot + 110, `Ø${d3(p.D)} +.002 / −.000 †`, ['⊥', 'Ø.002', 'A']);
    o += datumOnFcf('pin', xB + 116, yBot + 147, 'B');
    const xb2 = X(p.bolts[1]);
    o += leader('b1 b2 b3', xb2 + p.dB / 2 * S * 0.7, Yc + p.dB / 2 * S * 0.7, xb2 + 60, yBot + 110, `3× Ø${d3(p.dB)} +.003 / −.000 †`, ['⌖', 'Ø.010', 'A', 'B', 'C']);
    o += `<g class="dim" data-feat="outline">${L(xi + ri * 0.3, yTop + ri * 0.3, xi - 50, yTop - 30, 'ld')}${T(xi - 54, yTop - 34, `2× R${d2(p.rIn)}`, 'tx', 'end')}</g><g class="dim" data-feat="outline">${L(xo - ro * 0.3, yBot - ro * 0.3, xo + 26, yBot + 30, 'ld')}${T(xo + 30, yBot + 44, `2× R${d2(p.rOut)}`, 'tx', 'start')}</g>`;
    o += `<g data-feat="thick" class="feat"><rect class="pt" x="${xi}" y="${yT}" width="${xo - xi}" height="${yB - yT}"/></g>`;
    for (const h of holes) o += `<g data-feat="${h.id}" class="feat">${L(X(h.u - h.r), yT, X(h.u - h.r), yB, 'hd')}${L(X(h.u + h.r), yT, X(h.u + h.r), yB, 'hd')}${L(X(h.u), yT - 12, X(h.u), yB + 12, 'cl')}</g>`;
    o += vdim('thick', yT, yB, xo, xo + 70, `${d3(p.t)} ±.005`);
    o += datum(xi + 60, yT, 'A');
    o += `<g class="dim" data-feat="thick">${L(xo - 250, yT, xo - 250, yT - 30, 'ld')}${fcf(xo - 300, yT - 36, ['⏥', '.005'])}</g>`;
    o += T((xi + xo) / 2, yB + 44, 'EDGE VIEW (bond face A up)', 'vt');
    return { svg: o, bottom: yB + 86, scale: '1:1' };
  },

  /** LEZ-57-143 clevis block: plan above the side profile (third angle), 3:4 */
  'LEZ-57-143'(k, D) {
    const { L, T, hdim, vdim, fcf, datum, datumOnFcf, leader } = k, p = D.params(), S = 75;
    const X = (u) => 330 + (u - p.u0) * S, Yc = 280, Yw = (w) => Yc - w * S;
    const yTop = Yw(p.W / 2), yBot = Yw(-p.W / 2), xi = X(p.u0), xo = X(p.u1), xB = X(0);
    const base = 615, V = (v) => base - v * S, vm = p.H / 2, tTop = V(vm + p.tail / 2), tBot = V(vm - p.tail / 2);
    const holes = [{ id: 'pin', u: 0, r: p.D / 2 }, ...p.bolts.map((u, i) => ({ id: `b${i + 1}`, u, r: p.dB / 2 }))];
    // ---- plan (from above): outline, the step down to the tail at the web, the slot bottom hidden under the top tang
    let o = `<g data-feat="outline" class="feat"><path class="pt" d="${rrect(xi, yTop, xo, yBot, p.rEnd * S, p.rTang * S)}"/></g>`;
    o += `<g data-feat="tail" class="feat">${L(X(p.uWeb), yTop, X(p.uWeb), yBot)}</g><g data-feat="slot" class="feat">${L(X(p.uSlot), yTop, X(p.uSlot), yBot, 'hd')}</g>`;
    o += holeMarks(k, X, Yc, S, holes);
    o += L(xi - 30, Yc, xo + 30, Yc, 'cl') + T(xi - 40, Yc + 6, 'CL C', 'tx', 'end') + T((xi + xo) / 2, yBot + 34, 'PLAN', 'vt');
    const rows = [yTop - 30, yTop - 62, yTop - 94];
    p.bolts.forEach((u, i) => { o += hdim(`b${i + 1}`, X(u), xB, yTop, rows[i], d2(-u)); });
    o += vdim('outline', yTop, yBot, xo, xo + 60, `${d3(p.W)} ±.005`);
    o += leader('pin', xB + p.D / 2 * S * 0.7, Yc - p.D / 2 * S * 0.7, xB + 60, yTop - 80, `Ø${d3(p.D)} +.002 / −.000 † THRU BOTH TANGS`, ['⊥', 'Ø.002', 'A']);
    o += datumOnFcf('pin', xB + 106, yTop - 43, 'B');
    o += leader('b1 b2 b3', X(p.bolts[1]) + p.dB / 2 * S * 0.7, Yc + p.dB / 2 * S * 0.7, X(p.bolts[1]) + 50, yBot + 60, `3× Ø${d3(p.dB)} +.003 / −.000 †`, ['⌖', 'Ø.010', 'A', 'B', 'C']);
    o += `<g class="dim" data-feat="outline">${L(xo - p.rTang * S * 0.3, yBot - p.rTang * S * 0.3, xo + 30, yBot + 22, 'ld')}${T(xo + 34, yBot + 27, `4× R${d2(p.rTang)}`, 'tx', 'start')}</g>`;
    o += `<g class="dim" data-feat="outline">${L(xi + p.rEnd * S * 0.3, yBot - p.rEnd * S * 0.3, xi - 30, yBot + 26, 'ld')}${T(xi - 34, yBot + 31, `2× R${d2(p.rEnd)}`, 'tx', 'end')}</g>`;
    // ---- side profile (looking aft): tangs, slot, web, tail; holes hidden
    const r1 = p.rSlot * S, r2 = p.rTail * S, xS = X(p.uSlot), xW = X(p.uWeb);
    const prof = `M${xi} ${tBot}H${xW - r2}A${r2} ${r2} 0 0 1 ${xW} ${tBot + r2}V${V(0)}H${xo}V${V(p.tT)}H${xS + r1}A${r1} ${r1} 0 0 1 ${xS} ${V(p.tT) - r1}V${V(p.H - p.tT) + r1}A${r1} ${r1} 0 0 1 ${xS + r1} ${V(p.H - p.tT)}H${xo}V${V(p.H)}H${xW}V${tTop - r2}A${r2} ${r2} 0 0 1 ${xW - r2} ${tTop}H${xi}Z`;
    o += `<g data-feat="outline" class="feat"><path class="pt" d="${prof}"/></g>`;
    o += `<g data-feat="pin" class="feat">${[-1, 1].map((s) => L(X(s * p.D / 2), V(0), X(s * p.D / 2), V(p.tT), 'hd') + L(X(s * p.D / 2), V(p.H - p.tT), X(s * p.D / 2), V(p.H), 'hd')).join('')}${L(xB, V(p.H) - 12, xB, V(0) + 12, 'cl')}</g>`;
    p.bolts.forEach((u, i) => { o += `<g data-feat="b${i + 1}" class="feat">${[-1, 1].map((s) => L(X(u + s * p.dB / 2), tTop, X(u + s * p.dB / 2), tBot, 'hd')).join('')}${L(X(u), tTop - 12, X(u), tBot + 12, 'cl')}</g>`; });
    o += L(xi - 20, V(vm), xo + 30, V(vm), 'cl');
    o += vdim('slot', V(p.H - p.tT), V(p.tT), xo, xo + 50, `${d3(p.slot)} +.005 / −.000`);
    o += vdim('outline', V(p.H), V(p.H - p.tT), xo, xo + 50, `${d4(p.tT)} 2×`).replace(/(<text[^>]*y=")([\d.]+)/, (m, a, y) => a + (+y - 14));
    o += vdim('thick', V(p.H), V(0), xo, xo + 300, `${d3(p.H)} ±.005`);
    o += vdim('tail', tTop, tBot, xi, xi - 50, `${d3(p.tail)} ±.005`);
    o += datum(X((p.bolts[0] + p.bolts[1]) / 2), tTop, 'A');
    o += `<g class="dim" data-feat="tail">${L(X((p.bolts[1] + p.bolts[2]) / 2), tTop, X((p.bolts[1] + p.bolts[2]) / 2), tTop - 30, 'ld')}${fcf(X((p.bolts[1] + p.bolts[2]) / 2) - 40, tTop - 36, ['⏥', '.005'])}</g>`;
    o += `<g class="dim" data-feat="slot">${L(xS + r1 * 0.3, V(p.H - p.tT) - r1 * 0.3, xS + 120, V(p.H) - 30, 'ld')}${T(xS + 124, V(p.H) - 34, `2× R${d2(p.rSlot)}`, 'tx', 'start')}</g>`;
    o += `<g class="dim" data-feat="tail">${L(xW - r2 * 0.3, tTop - r2 * 0.3, xW - 40, V(p.H) - 30, 'ld')}${T(xW - 44, V(p.H) - 34, `2× R${d2(p.rTail)}`, 'tx', 'end')}</g>`;
    // horizontal dims below the profile, all from datum B (the pin axis)
    const yb = [base + 44, base + 82, base + 120, base + 158];
    o += hdim('outline', xB, xo, base, yb[0], d2(p.u1));
    o += hdim('slot', xS, xB, base, yb[0], d2(-p.uSlot));
    o += hdim('tail', xW, xB, base, yb[1], d2(-p.uWeb));
    o += hdim('outline', xi, xB, base, yb[2], d2(-p.u0));
    o += hdim('outline', xi, xo, base, yb[3], d2(p.L));
    o += T((xi + xo) / 2, base + 196, 'SIDE PROFILE (looking aft; tail bond face A up)', 'vt');
    return { svg: o, bottom: base + 226, scale: '3:4' };
  },

  /** LEZ-57-140 CS spar: half elevation (symmetric about C) 1:4, section A–A at the clevis tail 1:2, ply and hole tables */
  'LEZ-57-140'(k, D) {
    const { L, T, hdim, vdim, datum } = k, p = D.params(), S = 25;
    const X = (x) => 110 + x * S, base = 335, Z = (z) => base - z * S, tw = p.wrap * p.tB;
    const ord = (feat, x, y0, y1, text) => `<g class="dim" data-feat="${feat}">${L(X(x), y0, X(x), y1, 'ex')}${T(X(x), y1 + (y1 < y0 ? -6 : 16), text, 'tx')}</g>`;
    const tag = (feat, x, y, t) => `<g class="dim" data-feat="${feat}"><circle class="fcf" cx="${x}" cy="${y}" r="11"/>${T(x, y + 5, t, 'tq')}</g>`;
    let o = `<g data-feat="outline" class="feat"><rect class="pt" x="${X(0)}" y="${Z(p.H)}" width="${p.L / 2 * S}" height="${p.H * S}"/></g>`;
    o += L(X(0), Z(p.H) - 70, X(0), base + 130, 'cl') + T(X(0) - 8, Z(p.H) - 76, 'C (CL, BL 0)', 'tx', 'start');
    // caps: bands at their full thickness; drop stations marked on the band
    const tc = (p.N * p.tU + tw) * S, te = (p.nEnd * p.tU + tw) * S;
    const eLast = p.ends.length ? p.ends.at(-1) : 0;   // block P: with HTS40 caps every ply may reach the end (no drops)
    o += `<g data-feat="cap" class="feat"><path class="pt" d="M${X(0)} ${Z(p.H) + tc}H${X(eLast)}V${Z(p.H) + te}H${X(p.xWeb)}"/><path class="pt" d="M${X(0)} ${base - tc}H${X(eLast)}V${base - te}H${X(p.xWeb)}"/>${p.ends.map((e) => L(X(e), Z(p.H), X(e), Z(p.H) + tc, 'ln') + L(X(e), base, X(e), base - tc, 'ln')).join('')}</g>`;
    // hard points (the 1:10 steps drawn as their envelope) and clevis pockets (hidden)
    const hp = (up) => { const z = (dd) => (up ? Z(p.H - dd) : Z(dd)), dTop = p.padBot - (p.nPad + p.nFill) * p.tB, dPad = p.padBot - p.nPad * p.tB;
      return `<path class="pt" d="M${X(p.xWeb)} ${z(p.padBot)}H${X(p.hpIn[0])}L${X(p.hpIn.at(-1))} ${z(dTop)}H${X(p.xTail)}V${z(dPad)}H${X(p.xWeb)}Z"/>`; };
    o += `<g data-feat="hp" class="feat">${hp(true)}${hp(false)}</g>`;
    const pk = (up) => { const z = (dd) => (up ? Z(p.H - dd) : Z(dd)), a = p.pinDepth - p.cH / 2, b = p.pinDepth + p.cH / 2, ta = p.pinDepth - p.cTail / 2, tb = p.pinDepth + p.cTail / 2, xp = (u) => X(p.pin + u);
      return `<path class="hd" d="M${xp(p.uWeb)} ${z(a)}H${xp(p.u1)}V${z(b)}H${xp(p.uWeb)}V${z(tb)}H${xp(p.u0)}V${z(ta)}H${xp(p.uWeb)}Z"/>`; };
    o += `<g data-feat="pocket" class="feat">${pk(true)}${pk(false)}</g>`;
    o += `<g data-feat="pin" class="feat">${L(X(p.pin), Z(p.H) - 14, X(p.pin), base + 14, 'cl')}</g>`;
    o += `<g data-feat="bolt" class="feat">${p.bolts.map((x) => L(X(x), Z(p.H) - 10, X(x), base + 10, 'cl')).join('')}</g>`;
    for (const h of p.hard) o += `<g data-feat="hp-${h.id}" class="feat">${h.cols.flatMap((c) => h.z.map((z) => `<circle class="pt" cx="${X(h.x + c)}" cy="${Z(z)}" r="${h.d / 2 * S}"/>`)).join('')}</g>`;
    const m = p.hard.find((h) => h.id === 'mount'), g = p.hard.find((h) => h.id === 'drag');
    o += tag('hp-mount', X(m.x) + 26, Z(m.z[2]) - 4, 'M') + tag('hp-drag', X(g.x + g.cols[1]) + 26, Z(g.z[1]) - 4, 'D') + tag('bolt', X(p.bolts[1]) + 4, Z(p.H / 2), 'B') + tag('pin', X(p.pin) + 22, Z(p.H / 2), 'P');
    o += `<g class="dim" data-feat="hp">${T(X(10.5), Z(p.H / 2) + 5, 'HARD POINT ×4, 1:10 STEPS →', 'tq', 'start')}</g>`;
    // ordinate dimensions from C: drop-offs above, everything else below
    o += T(X(0) - 12, Z(p.H) - 30, '0', 'tx', 'end');
    p.ends.forEach((e, i) => { o += ord('cap', e, Z(p.H) - 4, Z(p.H) - 30, d2(e)) + T(X(e), Z(p.H) - 52, `${i + 1}`, 'tq'); });
    if (p.ends.length) o += T(X(p.ends.at(-1)) + 40, Z(p.H) - 52, `← CAP PLIES 1–${p.ends.length} END (S-LC / S-UC)`, 'tq', 'start');
    const rowsB = [[m.x, 'hp-mount'], [p.hpIn.at(-1), 'hp'], [p.xTail, 'hp'], [p.xWeb, 'cap'], [p.L / 2, 'outline']], rowsC = [[g.x + g.cols[0], 'hp-drag'], [p.bolts[2], 'bolt'], [p.bolts[0], 'bolt']], rowsD = [[g.x + g.cols[1], 'hp-drag'], [p.bolts[1], 'bolt'], [p.pin, 'pin']];
    [[rowsB, base + 34], [rowsC, base + 62], [rowsD, base + 90]].forEach(([r, y]) => r.forEach(([x, f]) => { o += ord(f, x, base + 4, y, d2(x)); }));
    o += vdim('outline', Z(p.H), base, X(p.L / 2), X(p.L / 2) + 60, d3(p.H));
    o += datum(X(4), base, 'A');
    const xa = X(p.bolts[1]) - 14;
    o += `<g class="dim" data-feat="bolt">${L(xa, Z(p.H) - 30, xa, Z(p.H) - 4, 'ld')}${L(xa, base + 4, xa, base + 24, 'ld')}${T(xa - 6, Z(p.H) - 14, 'A', 'vt', 'end')}${T(xa - 6, base + 22, 'A', 'vt', 'end')}</g>`;
    o += T(X(p.L / 4), base + 128, 'HALF ELEVATION, LOOKING AFT (SYMMETRIC ABOUT C) · 1:4', 'vt');
    // ---- section A–A at bolt 2, 1:2
    const S2 = 50, sx = (y) => 230 + y * S2, sy0 = 520, sz = (dd) => sy0 + dd * S2, Wh = p.Wd / 2;
    let q = `<g data-feat="outline" class="feat"><rect class="pt" x="${sx(-Wh)}" y="${sz(0)}" width="${p.Wd * S2}" height="${p.H * S2}"/><rect class="ln" x="${sx(-Wh + tw)}" y="${sz(tw)}" width="${(p.Wd - 2 * tw) * S2}" height="${(p.H - 2 * tw) * S2}"/></g>`;
    q += `<g data-feat="cap" class="feat"><rect class="pt" x="${sx(-p.capW / 2)}" y="${sz(tw)}" width="${p.capW * S2}" height="${p.nEnd * p.tU * S2}"/><rect class="pt" x="${sx(-p.capW / 2)}" y="${sz(p.H - tw - p.nEnd * p.tU)}" width="${p.capW * S2}" height="${p.nEnd * p.tU * S2}"/></g>`;
    q += `<g data-feat="pocket" class="feat">${[p.pinDepth, p.H - p.pinDepth].map((c) => `<rect class="pt" x="${sx(-p.cW / 2)}" y="${sz(c - p.cTail / 2)}" width="${p.cW * S2}" height="${p.cTail * S2}"/>`).join('')}</g>`;
    q += `<g data-feat="hp" class="feat">${[p.padBot - p.nPad * p.tB, p.H - p.padBot].map((a) => `<rect class="pt" x="${sx(-p.capW / 2)}" y="${sz(a)}" width="${p.capW * S2}" height="${p.nPad * p.tB * S2}"/>`).join('')}</g>`;
    q += `<g data-feat="bolt" class="feat">${L(sx(0), sz(0) - 16, sx(0), sz(p.H) + 16, 'cl')}${[-1, 1].map((s_) => L(sx(s_ * p.dB / 2), sz(0), sx(s_ * p.dB / 2), sz(p.H), 'hd')).join('')}</g>`;
    q += vdim('cap', sz(0), sz(tw + p.nEnd * p.tU), sx(Wh), sx(Wh) + 34, `${d3(tw + p.nEnd * p.tU)} CAP`);
    q += vdim('pocket', sz(p.pinDepth - p.cTail / 2), sz(p.pinDepth + p.cTail / 2), sx(Wh), sx(Wh) + 34, `${d3(p.cTail)} TAIL`);
    q += vdim('hp', sz(p.padBot - p.nPad * p.tB), sz(p.padBot), sx(Wh), sx(Wh) + 34, `${d3(p.nPad * p.tB)} PAD`);
    q += vdim('outline', sz(0), sz(p.H), sx(-Wh), sx(-Wh) - 40, d3(p.H));
    q += hdim('outline', sx(-Wh), sx(Wh), sz(p.H), sz(p.H) + 36, d2(p.Wd));
    q += hdim('cap', sx(-p.capW / 2), sx(p.capW / 2), sz(0), sz(0) - 24, d2(p.capW));
    q += T(sx(0), sz(p.H) + 80, 'SECTION A–A · 1:2', 'vt') + T(sx(0), sz(p.H) + 100, `${p.nEnd} × HTS40 + ${p.wrap} × 6781 over the tail;`, 'tq') + T(sx(0), sz(p.H) + 118, 'crush tube between the pads', 'tq');
    // ---- ply table and hole table
    const tx0 = 1080, cw = [150, 52, 56, 262, 60], rh = 19;
    const table = (y0, title, rows) => { let t = `<rect class="bd" x="${tx0}" y="${y0 - 30}" width="${cw.reduce((a, b) => a + b, 0)}" height="${rh * rows.length + 34}"/>${T(tx0 + 290, y0 - 12, title, 'tq')}`;
      rows.forEach((r, i) => { let x = tx0 + 8; const y = y0 + 12 + i * rh; t += `<g class="dim" data-feat="${r[5] || 'outline'}">${r.slice(0, 5).map((c, j_) => { const s_ = T(x, y, c, i ? 'tn2' : 'tq', 'start'); x += cw[j_]; return s_; }).join('')}</g>`; if (!i) t += L(tx0, y + 5, tx0 + 580, y + 5, 'bd'); });
      return t; };
    const pid = (n) => String(n).padStart(2, '0');
    let t = table(492, 'PLY TABLE (LAY ORDER: SHORTEST FIRST)', [['PLY', 'MATL', 'ORIENT', 'EXTENT, BL', 'QTY', ''],
      [`S-FW1–${p.web} S-AW1–${p.web}`, 'BID', '±45', `±${d2(p.L / 2)}`, `${2 * p.web}`, 'outline'],
      ...p.ends.map((e, i) => [`S-LC${pid(i + 1)} S-UC${pid(i + 1)}`, 'UNI', '0', `±${d2(e)}`, '2', 'cap']),
      [`S-LC${pid(p.ends.length + 1)}–${p.N} S-UC…`, 'UNI', '0', `±${d2(p.xWeb)}`, `${2 * p.nEnd}`, 'cap'],
      [`PAD j = 1–${p.nPad}`, 'BID', '±45', `${d2(p.hpIn[0])} − .10(j−1) TO ${d2(p.xWeb)}`, `${4 * p.nPad}`, 'hp'],
      [`FILLER j = ${p.nPad + 1}–${p.nPad + p.nFill}`, 'BID', '±45', `${d2(p.hpIn[p.nPad])} − .10(j−${p.nPad + 1}) TO ${d2(p.xTail)}`, `${4 * p.nFill}`, 'hp'],
      [`S-X1–${p.wrap}`, 'BID', '±45', `±${d2(p.L / 2)} (WRAP)`, `${p.wrap}`, 'outline']]);
    t += table(776, 'HOLE TABLE († DRILLED AFTER CURE)', [['HOLE', 'Ø', 'AXIS', 'BL (±) · ABOVE A', 'QTY', ''],
      ['P PIN ACCESS', d3(p.pinD), 'VERT', `${d2(p.pin)} · WRAP ONLY`, '4', 'pin'],
      ['B THROUGH-BOLT', d3(p.dB), 'VERT', `${p.bolts.map(d2).join(' / ')} · THRU`, `${2 * p.bolts.length}`, 'bolt'],
      ['M MOUNT', d4(m.d), 'F-A', `${d2(m.x)} · ${m.z.map(d2).join(' / ')}`, `${2 * m.z.length}`, 'hp-mount'],
      ['D DRAG', d3(g.d), 'F-A', `${d2(g.x + g.cols[0])}, ${d2(g.x + g.cols[1])} · ${g.z.map(d2).join(' / ')}`, `${4 * g.z.length}`, 'hp-drag']]);
    // ---- CNC core templates T1–T4 (sections looking outboard, 1:6), the core step table and the core cut list (2026-11-20)
    const CT = csCoreTemplates(p), S6 = 100 / 6, cw6 = CT.wIn * S6;
    let u = '';
    CT.sec.forEach((c, i) => {
      const gx = 1374 + (i % 2) * 146, gy = 186 + Math.floor(i / 2) * 128, cx = gx + cw6 / 2, xx = (v) => cx + v * S6, zz = (dd) => gy + dd * S6, hw = CT.capW / 2;
      u += `<g data-feat="core" class="feat"><path class="pt" d="M${xx(-CT.wIn / 2)} ${zz(0)}H${xx(-hw)}V${zz(c.uT)}H${xx(hw)}V${zz(0)}H${xx(CT.wIn / 2)}V${zz(CT.hIn)}H${xx(hw)}V${zz(CT.hIn - c.lT)}H${xx(-hw)}V${zz(CT.hIn)}H${xx(-CT.wIn / 2)}Z"/>`;
      for (const k of c.pockets) for (const [a, b] of [[k.d[0], k.d[1]], [CT.hIn - k.d[1], CT.hIn - k.d[0]]]) u += `<rect class="pt" x="${xx(-k.w / 2)}" y="${zz(a)}" width="${k.w * S6}" height="${(b - a) * S6}"/>`;
      u += `</g>` + T(gx, gy - 8, `${c.id} · ${c.span}`, 'tn2', 'start');
      const lab = [`U ${d3(c.uT)}`, `L ${d3(c.lT)}`, ...c.pockets.flatMap((k) => [`${k.what} ${d3(k.d[0])}`, `–${d3(k.d[1])}`])];
      lab.forEach((l, j) => { u += `<g class="dim" data-feat="core">${T(gx + cw6 + 6, gy + 10 + j * 14, l, 'tn2', 'start')}</g>`; });
    });
    u += T(1520, 426, `CORE TEMPLATES T1–T4 · 1:6 · BL (±)`, 'tq') + T(1520, 442, `CORE ${d3(CT.wIn)} × ${d3(CT.hIn)}; DEPTHS FROM`, 'tq') + T(1520, 456, 'THE CORE FACE, BOTH FACES', 'tq');
    // step table between the ply and hole tables
    const st0 = 642, rs = 16.5, scw = [66, 128, 246, 140];
    u += `<rect class="bd" x="${tx0}" y="${st0 - 28}" width="580" height="${rs * (CT.steps.length + 1) + 28}"/>${T(tx0 + 290, st0 - 12, 'CORE STEP TABLE (BL ±; DEPTH FROM THE CORE FACE)', 'tq')}`;
    [['TPL', 'BL (±)', 'CUT', 'DEPTH'], ...CT.steps.map((r) => [r.id, r.bl, r.what, r.depth])].forEach((r, i) => { let x = tx0 + 8; const y = st0 + 10 + i * rs;
      u += `<g class="dim" data-feat="core">${r.map((c, j) => { const s_ = T(x, y, c, i ? 'tn2' : 'tq', 'start'); x += scw[j]; return s_; }).join('')}</g>`; if (!i) u += L(tx0, y + 4, tx0 + 580, y + 4, 'bd'); });
    // core cut list under section A–A
    const cl0 = 958, ccw = [92, 176, 184];
    u += `<rect class="bd" x="34" y="${cl0 - 30}" width="456" height="${19 * (CT.cut.length * 2 + 1) + 34}"/>${T(262, cl0 - 12, 'CORE CUT LIST (HT61; STOCK SIZES BY QUOTE)', 'tq')}`;
    [['BLOCK', 'FINISHED (IN)', 'STOCK'], ...CT.cut.flatMap((r) => [[r.id, r.fin, r.stock[0]], [`QTY ${r.qty}`, r.what, r.stock[1]]])].forEach((r, i) => { let x = 42; const y = cl0 + 12 + i * 19;
      u += `<g class="dim" data-feat="core">${r.map((c, j) => { const s_ = T(x, y, c, i ? 'tn2' : 'tq', 'start'); x += ccw[j]; return s_; }).join('')}</g>`; if (!i) u += L(34, y + 5, 490, y + 5, 'bd'); });
    return { svg: o + q + t + u, bottom: 530, scale: '1:4 / 1:2', notesBox: { x: 500, top: 530, n: 69, bottom: 1072 },
      notesShort: { Handling: 'MTM45-1 from the freezer per the record (thaw sealed, out-time log, debulk every 3–4 plies).', Cure: 'NCAMP M cycle per the record: 250 ± 10 °F for 4–6 h at ≥ 28 inHg, cool under vacuum, no post-cure; witness coupons with the part.' } };
  },
  /** LEZ-71-223 lower mount bracket: front elevation (looking forward, right bracket) and section A–A, both 1:2 */
  'LEZ-71-223'(k, D) {
    const { L, T, hdim, vdim, datum, leader } = k, p = D.params(), S = 50;
    const x0 = p.xBolt - p.b, X = (x) => 330 + (x - x0) * S, Z = (z) => 170 + (p.zTop - z) * S;
    const xh = X(x0), xf = X(p.xBolt), out = p.legB === 'outboard', xs = out ? X(p.xBolt - p.t) : X(x0 + p.t), xb = X(0), yt = Z(p.zTop), yc = Z(p.zBot), yB0 = Z(p.zB0 ?? p.zBot);   // rev B: leg B at the outboard edge from zB0 up
    const holes = [{ id: 'pk', z: -p.h, r: p.dP / 2 }, ...p.zSpar.map((z, i) => ({ id: `s${i + 1}`, z, r: p.dS / 2 }))];
    let o = `<g data-feat="outline" class="feat"><rect class="pt" x="${xh}" y="${yt}" width="${xf - xh}" height="${yc - yt}"/></g>`;
    o += `<g data-feat="legB" class="feat">${L(xs, yt, xs, yB0, 'ln')}${out ? L(xs, yB0, xf, yB0, 'ln') : ''}</g>`;
    if (out) o += vdim('legB', yB0, yc, xh, xh - 40, d2(p.zB0 - p.zBot));
    for (const h of holes) o += `<g data-feat="${h.id}" class="feat"><circle class="pt" cx="${xb}" cy="${Z(h.z)}" r="${h.r * S}"/>${L(xb - h.r * S - 9, Z(h.z), xb + h.r * S + 9, Z(h.z), 'cl')}</g>`;
    o += L(xb, yt - 22, xb, yc + 22, 'cl') + T(xb, yt - 62, 'B', 'tx');
    o += L(xh - 20, Z(0), xf + 20, Z(0), 'cl') + T(xh - 24, Z(0) - 6, 'SPAR LOWER FACE', 'tq', 'end');
    // ordinates from C (the bottom end)
    const ord = [['pk', -p.h], ['s1', p.zSpar[0]], ['s2', p.zSpar[1]], ['s3', p.zSpar[2]], ['outline', p.zTop]];
    ord.forEach(([f, z], i) => { o += vdim(f, Z(z), yc, xf, xf + 60 + 72 * i, `${d2(z - p.zBot)}`); });
    o += hdim('legA', xb, xf, yt, yt - 30, d2(p.xBolt));
    o += hdim('outline', xh, xf, yc, yc + 84, d2(p.b)) + (out ? hdim('legB', xs, xf, yB0, yc + 84, '') + T(xf + 8, yc + 118, `${d3(p.t)} LEG B`, 'tq', 'end') : hdim('legB', xh, xs, yc, yc + 84, '') + T(xh - 8, yc + 118, `${d3(p.t)} LEG B`, 'tq', 'start'));
    const xc = xh + 70;   // datum C on the bottom end
    o += `<g class="datum">${L(xc, yc, xc, yc + 22)}<path class="ar" d="M${xc - 7} ${yc}L${xc + 7} ${yc}L${xc} ${yc - 10}Z"/><rect class="fcf" x="${xc - 13}" y="${yc + 22}" width="26" height="26"/>${T(xc, yc + 41, 'C')}</g>`;
    o += leader('s1 s2 s3', xb - p.dS / 2 * S * 0.7, Z(p.zSpar[2]) - p.dS / 2 * S * 0.7, 40, Z(p.zSpar[2]) - 30, `3× Ø${d3(p.dS)} +.003/−.000 †`, ['⌖', 'Ø.010', 'A', 'C', 'B']);
    o += leader('pk', xb - p.dP / 2 * S * 0.7, Z(-p.h) - p.dP / 2 * S * 0.7, 40, Z(-p.h) - 80, `Ø${d3(p.dP)} +.003/−.000 †`, ['⌖', 'Ø.010', 'A', 'C', 'B']);
    o += T(xh - 6, yt - 8, 'INBD', 'tq', 'end') + T(xf + 6, yt - 8, 'OUTBD', 'tq', 'start');
    const ya = (Z(p.zSpar[0]) + Z(0)) / 2;
    o += `<g class="dim">${L(xh - 30, ya, xf + 30, ya, 'cl')}${T(xh - 36, ya + 6, 'A', 'vt', 'end')}${T(xf + 36, ya + 6, 'A', 'vt', 'start')}</g>`;
    o += T((xh + xf) / 2 + 60, yc + 156, 'FRONT ELEVATION, LOOKING FORWARD (RIGHT BRACKET)', 'vt');
    // section A–A: x across (inboard left), y aft (down), firewall face A on top
    const U = (x) => 1060 + (x - x0) * S, V = (y) => 200 + y * S;
    const sec = out ? [[x0, 0], [p.xBolt, 0], [p.xBolt, p.b], [p.xBolt - p.t, p.b], [p.xBolt - p.t, p.t], [x0, p.t]] : [[x0, 0], [p.xBolt, 0], [p.xBolt, p.t], [x0 + p.t, p.t], [x0 + p.t, p.b], [x0, p.b]];
    o += `<g data-feat="outline" class="feat"><path class="pt" d="M${sec.map(([x, y]) => `${U(x)} ${V(y)}`).join('L')}Z"/></g>`;
    for (let x = U(x0) + 14; x < U(p.xBolt) - 4; x += 16) o += L(x, V(p.t), Math.min(x + 12, U(p.xBolt)), V(0), 'ex');
    const xl = out ? p.xBolt - p.t : x0; for (let y = V(p.t) + 14; y < V(p.b) - 2; y += 16) o += L(U(xl), y, U(xl + p.t), y - p.t * S, 'ex');
    o += L(U(0), V(0) - 20, U(0), V(p.t) + 20, 'cl') + T(U(0), V(0) - 26, 'B', 'tx');
    o += hdim('outline', U(x0), U(p.xBolt), V(0), V(0) - 70, d2(p.b)) + vdim('outline', V(0), V(p.b), out ? U(p.xBolt) : U(x0), out ? U(p.xBolt) + 50 : U(x0) - 50, d2(p.b));
    o += vdim('legA', V(0), V(p.t), out ? U(x0) : U(p.xBolt), out ? U(x0) - 110 : U(p.xBolt) + 40, d3(p.t)) + hdim('legB', U(xl), U(xl + p.t), V(p.b), V(p.b) + 36, d3(p.t));
    o += datum(U(x0) + 90, V(0), 'A');
    o += T(U(x0) + 30, V(p.b) - 30, 'INBD ←  ↓ AFT', 'tq', 'start');
    o += T(U(x0) + 100, V(p.b) + 90, 'SECTION A–A', 'vt') + T(U(x0) + 100, V(p.b) + 112, 'SHARP-CORNER SECTION SHOWN', 'tq');
    return { svg: o, bottom: 570, scale: '1:2', notesBox: { x: 960, top: 570, n: 78, bottom: 870 } };
  },
  /** LEZ-57-141 drag / torsion fitting: plan above the side elevation (third angle), 1:1 */
  'LEZ-57-141'(k, D) {
    const { L, T, hdim, vdim, datum, leader } = k, p = D.params(), S = 100;
    const X = (y) => 300 + y * S, H = p.zTop - p.zA, Wl = p.Wl, Wa = p.Wa;
    // ---- plan (looking down): x spanwise up the page (+ outboard)
    const Yp = (x) => 270 - x * S, wAt = (y) => Wa + (Wl - Wa) * y / p.yB;
    let o = `<g data-feat="outline" class="feat"><path class="pt" d="M${X(0)} ${Yp(p.Wf / 2)}H${X(p.tf)}V${Yp(wAt(p.tf) / 2)}L${X(p.yB)} ${Yp(Wl / 2)}H${X(p.yEnd)}V${Yp(-Wl / 2)}H${X(p.yB)}L${X(p.tf)} ${Yp(-wAt(p.tf) / 2)}V${Yp(-p.Wf / 2)}H${X(0)}Z"/></g>`;
    o += `<g data-feat="drag" class="feat"><circle class="pt" cx="${X(p.yB)}" cy="${Yp(0)}" r="${p.Dd / 2 * S}"/></g>`;
    p.cols.forEach((x, j) => { o += `<g data-feat="f${j + 1} f${j + 1 + p.cols.length}" class="feat">${L(X(0), Yp(x - p.dB / 2), X(p.tf), Yp(x - p.dB / 2), 'hd')}${L(X(0), Yp(x + p.dB / 2), X(p.tf), Yp(x + p.dB / 2), 'hd')}${L(X(0) - 12, Yp(x), X(p.tf) + 12, Yp(x), 'cl')}</g>`; });
    o += L(X(0) - 30, Yp(0), X(p.yEnd) + 30, Yp(0), 'cl') + T(X(p.yEnd) + 36, Yp(0) + 5, 'C', 'tx', 'start');
    o += vdim('outline', Yp(p.Wf / 2), Yp(-p.Wf / 2), X(0), X(0) - 50, d2(p.Wf));
    o += vdim('f1 f2', Yp(p.cols[1]), Yp(p.cols[0]), X(0), X(0) - 120, d2(p.cols[1] - p.cols[0]));
    o += vdim('outline', Yp(Wl / 2), Yp(-Wl / 2), X(p.yEnd), X(p.yEnd) + 60, d2(Wl));
    o += `<g class="dim" data-feat="outline">${L(X(p.tf + 0.6), Yp(wAt(p.tf + 0.6) / 2), X(p.tf + 1.0), Yp(Wa / 2) - 40, 'ld')}${T(X(p.tf + 1.0) + 6, Yp(Wa / 2) - 44, `${d2(Wa)} AT A, TAPER TO ${d2(Wl)} AT THE BOLT`, 'tq', 'start')}</g>`;
    o += T(X(p.yEnd / 2), Yp(-p.Wf / 2) + 44, 'PLAN', 'vt');
    // ---- side elevation (looking inboard): y aft to the right, z up
    const Z = (z) => 520 + (p.zTop - z) * S, zt = p.zA + p.ta, rr = p.r * S;
    o += `<g data-feat="outline" class="feat"><path class="pt" d="M${X(0)} ${Z(p.zA)}H${X(p.yEnd)}V${Z(zt)}H${X(p.tf + p.r)}A${rr} ${rr} 0 0 1 ${X(p.tf)} ${Z(zt + p.r)}V${Z(p.zTop)}H${X(0)}Z"/></g>`;
    o += `<g data-feat="drag" class="feat">${L(X(p.yB - p.Dd / 2), Z(p.zA), X(p.yB - p.Dd / 2), Z(zt), 'hd')}${L(X(p.yB + p.Dd / 2), Z(p.zA), X(p.yB + p.Dd / 2), Z(zt), 'hd')}${L(X(p.yB), Z(p.zA) + 16, X(p.yB), Z(zt) - 16, 'cl')}</g>`;
    p.zR.forEach((z, i) => { o += `<g data-feat="f${i * p.cols.length + 1} f${i * p.cols.length + 2}" class="feat">${L(X(0), Z(z - p.dB / 2), X(p.tf), Z(z - p.dB / 2), 'hd')}${L(X(0), Z(z + p.dB / 2), X(p.tf), Z(z + p.dB / 2), 'hd')}${L(X(0) - 12, Z(z), X(p.tf) + 12, Z(z), 'cl')}</g>`; });
    o += vdim('outline', Z(p.zTop), Z(p.zA), X(0), X(0) - 50, d2(H));
    p.zR.forEach((z, i) => { o += vdim(`f${i * p.cols.length + 1}`, Z(z), Z(p.zA), X(0), X(0) - 120 - 70 * i, d2(z - p.zA)); });
    o += vdim('arm', Z(zt), Z(p.zA), X(p.yEnd), X(p.yEnd) + 50, d3(p.ta));
    o += hdim('flange', X(0), X(p.tf), Z(p.zTop), Z(p.zTop) - 34, d3(p.tf));
    o += hdim('drag', X(0), X(p.yB), Z(p.zA), Z(p.zA) + 50, d2(p.yB)) + hdim('outline', X(0), X(p.yEnd), Z(p.zA), Z(p.zA) + 96, d2(p.yEnd));
    o += `<g class="dim" data-feat="fillet">${L(X(p.tf + p.r * 0.3), Z(zt + p.r * 0.3), X(p.tf + 0.9), Z(zt + 0.9), 'ld')}${T(X(p.tf + 0.9) + 6, Z(zt + 0.9) - 4, `R${d2(p.r)} (MACHINED)`, 'tq', 'start')}</g>`;
    o += datum(X(0) - 1, Z(p.zA + H * 0.72), 'A').replace('<g class="datum">', `<g class="datum" transform="rotate(-90 ${X(0)} ${Z(p.zA + H * 0.72)})">`);
    o += `<g class="datum">${L(X(p.yB + 0.9), Z(p.zA), X(p.yB + 0.9), Z(p.zA) + 22)}<path class="ar" d="M${X(p.yB + 0.9) - 7} ${Z(p.zA)}L${X(p.yB + 0.9) + 7} ${Z(p.zA)}L${X(p.yB + 0.9)} ${Z(p.zA) - 10}Z"/><rect class="fcf" x="${X(p.yB + 0.9) - 13}" y="${Z(p.zA) + 22}" width="26" height="26"/>${T(X(p.yB + 0.9), Z(p.zA) + 41, 'B')}</g>`;
    o += leader('drag', X(p.yB) - 4, Z(zt) - 4, X(p.yB) - 300, Z(zt) - 90, `Ø${d3(p.Dd)} +.003/−.000 †`, ['⌖', 'Ø.010', 'A', 'B', 'C']);
    o += leader('f1 f2 f3 f4', X(p.tf) + 6, Z(p.zR[1]), X(p.tf) + 120, Z(p.zR[1]) - 60, `4× Ø${d3(p.dB)} +.003/−.000 †`, ['⌖', 'Ø.010', 'A', 'B', 'C']);
    o += T(X(p.yEnd / 2), Z(p.zA) + 140, 'SIDE ELEVATION, LOOKING INBOARD (RIGHT FITTING)', 'vt');
    return { svg: o, bottom: 480, scale: '1:1', notesBox: { x: 1070, top: 480, n: 72, bottom: 870 } };
  },
  /** LEZ-57-145 wing-attach installation: the two joint stack-ups (sections, 1:1) and the hardware table */
  'LEZ-57-145'(k, D) {
    const { L, T, vdim, leader } = k, d = D.def, p = D.params(), S = 100;
    // a stack-up: layers top to bottom, the bolt drawn through them with head on top (headUp) or below
    const stack = (x0, y0, title, layers, dB, headUp, feat) => {
      let o = '', y = y0; const tot = layers.reduce((a, l) => a + l.t, 0), hH = 0.62 * dB, nH = 0.75 * dB, hw = 0.75 * dB;
      const top = headUp ? hH : nH + 0.25 * dB, bot = headUp ? nH + 0.25 * dB : hH;
      o += `<g data-feat="${feat}" class="feat"><rect class="pt" x="${x0 - dB / 2 * S}" y="${y0 - top * S}" width="${dB * S}" height="${(top + tot + bot) * S}"/>`;
      const cap = (yy, h, w) => `<rect class="pt" x="${x0 - w * S}" y="${yy}" width="${2 * w * S}" height="${h * S}"/>`;
      o += headUp ? cap(y0 - hH * S, hH, hw) : cap(y0 - (nH + 0.25 * dB) * S, nH, hw);
      o += '</g>';
      let ly = -1e9; const lx = x0 + 1.25 * S;
      for (const l of layers) {
        const w = l.w / 2 * S, yl = Math.max(y + l.t * S / 2 + 5, ly + 17); ly = yl;
        o += `<g data-feat="${l.feat || 'outline'}" class="feat"><rect class="pt" x="${x0 - w}" y="${y}" width="${w - dB / 2 * S}" height="${l.t * S}"/><rect class="pt" x="${x0 + dB / 2 * S}" y="${y}" width="${w - dB / 2 * S}" height="${l.t * S}"/></g>`;
        o += L(x0 + w + 2, y + l.t * S / 2, lx - 4, yl - 5, 'ld') + T(lx, yl, `${l.name}  ${d3(l.t)}`, 'tq', 'start'); y += l.t * S;
      }
      o += `<g data-feat="${feat}" class="feat">${headUp ? cap(y, nH, hw) : cap(y, hH, hw)}</g>`;
      o += L(x0, y0 - top * S - 16, x0, y + bot * S + 16, 'cl');
      o += vdim(feat, y0, y, x0 - 1.4 * S, x0 - 1.4 * S - 30, `STACK ${d3(tot)}`);
      o += T(x0, y + bot * S + 60, title, 'vt');
      return o;
    };
    const w = p.w, I = D.def.hardware, pinL = I.find((l) => l.id === 'pin'), drL = I.find((l) => l.id === 'drag');
    const nwP = I.find((l) => l.id === 'pin-w').qty / 2 - 1, nwD = I.find((l) => l.id === 'drag-w').qty - 1;
    let o = stack(330, 230, 'SPAR-END PIN (UPPER SHOWN) · SECTION, WIDTHS SCHEMATIC', [{ name: 'WASHER AN960 (HEAD)', t: w, w: 1.25, feat: 'pin' }, { name: 'UPPER TANG LEZ-57-143', t: p.tT, w: 2.0 },
      { name: 'GAP', t: p.gap, w: 2.0, feat: 'pin' }, { name: 'LWA PLATE LEZ-57-142', t: p.plate, w: 2.0 }, { name: 'GAP', t: p.gap, w: 2.0, feat: 'pin' }, { name: 'LOWER TANG LEZ-57-143', t: p.tT, w: 2.0 },
      { name: `${nwP} × WASHER AN960 (NUT)`, t: nwP * w, w: 1.25, feat: 'pin' }], p.dP, true, 'pin');
    o += stack(330, 720, 'THIRD BOLT (HEAD DOWN) · SECTION, WIDTHS SCHEMATIC', [
      { name: `${nwD} × WASHER AN960 (NUT)`, t: nwD * w, w: 0.5, feat: 'drag' }, { name: 'LUG LEZ-57-141', t: p.lug, w: 1.0 }, { name: 'ANGLE LEG LEZ-57-144', t: p.leg, w: 1.6 }, { name: 'DOUBLER, SKIN, FLOX BED LEZ-57-116', t: p.below, w: 2.4 }, { name: 'WASHER AN960 (HEAD, IN RECESS)', t: w, w: 0.5, feat: 'drag' }], p.dD, false, 'drag');
    o += leader('pin', 330 + p.dP / 2 * S, 230 - 0.62 * p.dP * S / 2, 520, 150, `${pinL.std} · ${pinL.torque[0]}–${pinL.torque[1]} IN-LB`);
    o += leader('drag', 330 + p.dD / 2 * S, 720 - 40, 520, 640, `${drL.std} · ${drL.torque[0]}–${drL.torque[1]} IN-LB`);
    // ---- hardware table
    const tx0 = 930, cw = [40, 150, 50, 450], rh = 22, rows = [['FN', 'PART', 'QTY', 'DESCRIPTION (PER SIDE)'], ...I.map((l, i) => [`${i + 1}`, l.std, `${l.qty}`, l.desc.length > 60 ? l.desc.slice(0, 57) + '…' : l.desc, l.id.split('-')[0]])];
    o += `<rect class="bd" x="${tx0}" y="${130}" width="${cw.reduce((a, b) => a + b, 0)}" height="${rh * rows.length + 36}"/>${T(tx0 + 345, 150, 'HARDWARE (PER SIDE; QTY 2 PER AIRCRAFT)', 'tq')}`;
    rows.forEach((r, i) => { let x = tx0 + 8; const y = 180 + i * rh; o += `<g class="dim" data-feat="${r[4] || 'outline'}">${r.slice(0, 4).map((c, j) => { const s_ = T(x, y, c, i ? 'tn2' : 'tq', 'start'); x += cw[j]; return s_; }).join('')}</g>`; if (!i) o += L(tx0, y + 6, tx0 + 690, y + 6, 'bd'); });
    return { svg: o, bottom: 480, scale: '1:1', notesBox: { x: 930, top: 480, n: 86, bottom: 870 } };
  },
  /** LEZ-57-110 outer wing panel: planform (1:16) with the cap drop-offs and the root joint, hot-wire templates (1:8), drop table */
  'LEZ-57-110'(k, D) {
    const { L, T, hdim, vdim, leader } = k, d = D.def, g = GEO.wing, Y0 = g.attachY, Y1 = g.tipY, GM = surfaceGeom('wing');
    const S = 100 / 16, sec = (y) => wingSec(y), x0 = 104, fs0 = sec(Y0).le * 12;
    const X = (y) => x0 + (y - Y0) * 12 * S, Yp = (fs) => 130 + (fs - fs0) * S;   // BL across, FS down (aft)
    const le = (y) => sec(y).le * 12, te = (y) => (sec(y).le + sec(y).c) * 12, hinge = (y) => (sec(y).le + (1 - g.aileronCf) * sec(y).c) * 12, spar = (y) => (sec(y).le + GM.sec(y).xsp * sec(y).c) * 12;
    const [a0, a1] = g.aileron;
    let o = `<g data-feat="outline" class="feat"><path class="pt" d="M${X(Y0)} ${Yp(le(Y0))}L${X(Y1)} ${Yp(le(Y1))}L${X(Y1)} ${Yp(te(Y1))}L${X(a1)} ${Yp(te(a1))}L${X(a1)} ${Yp(hinge(a1))}L${X(a0)} ${Yp(hinge(a0))}L${X(a0)} ${Yp(te(a0))}L${X(Y0)} ${Yp(te(Y0))}Z"/></g>`;
    o += `<path class="hd" d="M${X(a0)} ${Yp(te(a0))}L${X(a1)} ${Yp(te(a1))}"/>` + T((X(a0) + X(a1)) / 2, Yp(te((a0 + a1) / 2)) + 22, 'AILERON LEZ-57-191 (REF)', 'tq');
    o += L(X(Y0) - 14, Yp(spar(Y0)), X(Y1) + 14, Yp(spar(Y1)), 'cl') + T(X(Y1) + 18, Yp(spar(Y1)) + 5, 'B', 'tx', 'start');
    // cap drop stations: upper ticks ahead of the spar line, lower ticks behind it
    for (const [side, dir] of [['upper', -1], ['lower', 1]]) for (const y of caps(side).filter((q) => q < Y1 - 1e-6)) o += `<g class="dim" data-feat="cap">${L(X(y), Yp(spar(y)), X(y), Yp(spar(y)) + dir * 9, 'ld')}</g>`;
    o += T(X(Y0) + 300, Yp(spar(Y0 + 2.4)) - 16, 'UPPER CAP DROPS', 'tq', 'start') + T(X(Y0) + 300, Yp(spar(Y0 + 2.4)) + 24, 'LOWER CAP DROPS', 'tq', 'start');
    // root joint: LWA plate (2 in) and the pads
    const sp0 = spar(Y0), plate = WROOT.plateEnd, pe = Math.max(WROOT.upper.padEnd, WROOT.lower.padEnd);
    o += `<g data-feat="pocket" class="feat"><rect class="pt" x="${X(Y0) - LWA.uRoot * S - LWA.e * S}" y="${Yp(sp0) - LWA.W / 2 * S}" width="${(LWA.uRoot + LWA.e + plate) * S}" height="${LWA.W * S}"/></g>`;
    o += `<g data-feat="hp" class="feat"><path class="hd" d="M${X(Y0)} ${Yp(sp0) - WING_END.bPad / 2 * S}h${pe * S}v${WING_END.bPad * S}h${-pe * S}Z"/></g>`;
    o += leader('hp', X(Y0) + pe * S * 0.8, Yp(sp0) - WING_END.bPad / 2 * S, X(Y0) + 120, Yp(le(Y0)) - 30, `ROOT PAD ${WING_END.upper.nPad}/${WING_END.lower.nPad} × 6781 TO ${pe.toFixed(1)} IN · LWA PLATE`);
    // core blocks (template stations)
    WP_BLOCKS.forEach((y, i) => { o += L(X(y), Yp(le(y)) - 20, X(y), Yp(te(y)) + 10, 'cl') + T(X(y), Yp(le(y)) - 26, `T${i + 1}`, 'tx'); });
    o += hdim('outline', X(Y0), X(Y1), Yp(te(Y0)) + 30, Yp(te(Y1)) + 60, `${((Y1 - Y0) * 12).toFixed(1)} (BL ${(Y0 * 12).toFixed(1)}–${(Y1 * 12).toFixed(1)})`);
    o += vdim('outline', Yp(le(Y0)), Yp(te(Y0)), X(Y0), X(Y0) - 24, `${(sec(Y0).c * 12).toFixed(1)}`);
    o += vdim('outline', Yp(le(Y1)), Yp(te(Y1)), X(Y1), X(Y1) + 24, `${(sec(Y1).c * 12).toFixed(1)}`);
    o += T(X(Y0) + 20, Yp(le(Y0)) + 14, 'A (ROOT FACE)', 'tq', 'start');
    o += T((X(Y0) + X(Y1)) / 2, Yp(te(Y1)) + 100, 'PLANFORM, RIGHT PANEL (LEFT OPPOSITE) · 1:16', 'vt');
    // hot-wire templates, 1:8, LE aligned
    const S2 = 100 / 10, tx = 1000;
    WP_BLOCKS.forEach((y, i) => {
      const t = coreTemplate(y), ty = 175 + i * 98, lx = t.oml.reduce((a, p) => Math.min(a, p[0]), Infinity), mz = t.oml.reduce((a, p) => a + p[1], 0) / t.oml.length;
      const pt = (p) => `${tx + (p[0] - lx) * S2} ${ty - (p[1] - mz) * S2}`, poly = (a) => `M${a.map(pt).join('L')}Z`;
      o += `<g data-feat="outline" class="feat"><path class="pt" d="${poly(t.oml)}"/></g><g data-feat="cap" class="feat"><path class="pt" d="${poly(t.cap_upper)}"/><path class="pt" d="${poly(t.cap_lower)}"/></g><g data-feat="block" class="feat"><path class="hd" d="${poly(t.block)}"/></g>`;
      o += T(tx - 12, ty + 5, `T${i + 1}`, 'tx', 'end') + T(tx + t.c * S2 + 12, ty - 8, `BL ${(y * 12).toFixed(1)} · C ${t.c.toFixed(1)}${t.xe < 1 ? ' (COVE)' : ''}`, 'tq', 'start') + T(tx + t.c * S2 + 12, ty + 10, `TROUGH U ${t.troughU.toFixed(3)} · L ${t.troughL.toFixed(3)}`, 'tq', 'start');
    });
    o += T(tx + 300, 540, 'HOT-WIRE TEMPLATES T1–T4 · 1:10 · OML LESS 0.020 IN SKIN', 'vt');
    // cap schedule
    const fxy = (a) => a.map((q) => (q * 12).toFixed(1)), up = fxy(caps('upper').filter((q) => q < Y1 - 1e-6)), lo = fxy(caps('lower').filter((q) => q < Y1 - 1e-6));
    const rows = [['CAP SCHEDULE (BL OF EACH PLY END, SHORTEST FIRST)', ''], [`UPPER ${caps('upper').length} × HTS40:`, ''], ...chunk(up, 12).map((c) => ['', c.join('  ')]), [`LOWER ${caps('lower').length} × HTS40:`, ''], ...chunk(lo, 12).map((c) => ['', c.join('  ')]), [`${caps('upper').filter((q) => q >= Y1 - 1e-6).length} + ${caps('lower').filter((q) => q >= Y1 - 1e-6).length} RUN TO THE TIP (BL ${(Y1 * 12).toFixed(1)})`, '']];
    rows.forEach((r, i) => { o += `<g class="dim" data-feat="cap">${T(40, 712 + i * 16, r[0], i ? 'tn2' : 'tq', 'start')}${T(140, 712 + i * 16, r[1], 'tn2', 'start')}</g>`; });
    return { svg: o, bottom: 594, scale: '1:16 / 1:10', notesBox: { x: 800, top: 594, n: 104, bottom: 870 } };
  },
  /** LEZ-57-130 winglet: elevation in the fin's plane (1:16) with caps and drops, root section through the straps (1:2.5), cap schedule */
  'LEZ-57-130'(k, D) {
    const { L, T, hdim, vdim, leader } = k, g = GEO.winglet, gl = GEO.wingletLow, tip = wingSec(GEO.wing.tipY), FU = FRAMES.winglet, FL = FRAMES.wingletLow;
    const S = 100 / 16, X = (fs) => 130 + fs * S, Yh = (h) => 530 - h * S;   // FS from the tip LE across, h (in, along the fin) up; the lower winglet below
    const le = (F, h) => (F.sec(h).le - tip.le) * 12, te = (F, h) => le(F, h) + F.sec(h).c * 12;
    const H = g.h * 12, HL = gl.h * 12, [r0, r1] = g.rudder.map((x) => x * 12), xh = (h) => le(FU, h / 12) + (1 - g.rudderCf) * FU.sec(h / 12).c * 12;
    let o = `<g data-feat="outline" class="feat"><path class="pt" d="M${X(le(FU, 0))} ${Yh(0)}L${X(le(FU, g.h))} ${Yh(H)}L${X(te(FU, g.h))} ${Yh(H)}L${X(te(FU, r1 / 12))} ${Yh(r1)}L${X(xh(r1))} ${Yh(r1)}L${X(xh(r0))} ${Yh(r0)}L${X(te(FU, r0 / 12))} ${Yh(r0)}L${X(te(FU, 0))} ${Yh(0)}Z"/>`;
    o += `<path class="pt" d="M${X(le(FL, 0))} ${Yh(0)}L${X(te(FL, 0))} ${Yh(0)}L${X(te(FL, gl.h))} ${Yh(-HL)}L${X(le(FL, gl.h))} ${Yh(-HL)}Z"/></g>`;
    o += `<path class="hd" d="M${X(te(FU, r0 / 12))} ${Yh(r0)}L${X(te(FU, r1 / 12))} ${Yh(r1)}"/>` + T(X(te(FU, 1.7)) + 12, Yh(20.4), 'RUDDER LEZ-55-193 (REF)', 'tq', 'start');
    const sp = (h) => le(FU, h / 12) + g.spar * FU.sec(h / 12).c * 12;
    o += L(X(sp(-6)), Yh(-6), X(sp(H + 4)), Yh(H + 4), 'cl') + T(X(sp(-6)) - 8, Yh(-6) + 6, 'C', 'tx', 'end');
    o += L(X(-6), Yh(0), X(te(FU, 0) + 8), Yh(0), 'cl') + T(X(-8), Yh(0) + 5, 'A', 'tx', 'end');
    for (const [side, dir] of [['upper', 1], ['lower', -1]]) for (const h of capsOf(side).filter((q) => q < g.h - 1e-6)) o += `<g class="dim" data-feat="cap">${L(X(sp(h * 12)), Yh(h * 12), X(sp(h * 12)) + dir * 10, Yh(h * 12), 'ld')}</g>`;
    o += `<g data-feat="root" class="feat"><path class="hd" d="M${X(sp(0) - WGL.bW / 2)} ${Yh(WGL.Lc)}h${WGL.bW * S}V${Yh(-WGL.hRoot * 12)}h${-WGL.bW * S}Z"/></g>`;
    o += `<g class="dim" data-feat="root">${T(X(le(FL, 0.15)) - 10, Yh(-WGL.hRoot * 12) + 16, 'ROOT CAPS', 'tq', 'end')}</g>`;
    o += `<g data-feat="strap" class="feat"><path class="hd" d="M${X(WGL.x0)} ${Yh(WGL.hU + WGL.Lv)}H${X(WGL.x1)}V${Yh(-WGL.hL - WGL.LvL)}H${X(WGL.x0)}Z"/></g>`;
    o += vdim('outline', Yh(0), Yh(H), X(te(FU, g.h)), X(te(FU, g.h)) + 40, `${H.toFixed(1)} (h)`) + vdim('outline', Yh(-HL), Yh(0), X(te(FL, 0)), X(te(FL, 0)) + 40, `${HL.toFixed(1)}`);
    o += hdim('outline', X(le(FU, 0)), X(te(FU, 0)), Yh(-HL), Yh(-HL) + 40, `${(g.cr * 12).toFixed(1)} ROOT`) + hdim('outline', X(le(FU, g.h)), X(te(FU, g.h)), Yh(H), Yh(H) - 30, `${(g.ct * 12).toFixed(1)} TIP`);
    o += T(X(le(FU, 3.3)) - 12, Yh(39.6), `${g.sweepLE}° LE`, 'tq', 'end');
    o += T(X(30), Yh(-HL) + 100, `ELEVATION, LOOKING INBOARD · CANT ${g.cant}° · 1:16`, 'vt');
    // root section through the straps, looking aft (BL across, WL up), 1:2.5
    const S2 = 40, bx = 900, by = 320, Xs = (bl) => bx + bl * S2, Ys = (wl) => by - wl * S2;   // origin: tip face at the chord plane
    const n = WGL.nS, ts = n * 0.013, R = WGL.R, gp = WGL.gap, fw = 2.3, top = WGL.hU + WGL.Lv + 0.5, bot = -WGL.hL - WGL.LvL - 0.5;
    o += `<g data-feat="outline" class="feat"><path class="ln" d="M${Xs(-4.2)} ${Ys(WGL.hU)}H${Xs(0)}V${Ys(-WGL.hL)}H${Xs(-4.2)}"/></g>`;
    o += `<g data-feat="outline" class="feat"><path class="pt" d="M${Xs(gp)} ${Ys(top)}V${Ys(bot)}M${Xs(gp + fw)} ${Ys(top)}V${Ys(bot)}"/></g>`;
    const strapU = `M${Xs(gp - ts)} ${Ys(WGL.hU + WGL.Lv)}V${Ys(WGL.hU + R)}A${R * S2} ${R * S2} 0 0 1 ${Xs(gp - ts - R)} ${Ys(WGL.hU + ts)}H${Xs(-WGL.Lh)}`;
    const strapL = `M${Xs(gp - ts)} ${Ys(-WGL.hL - WGL.LvL)}V${Ys(-WGL.hL - R)}A${R * S2} ${R * S2} 0 0 0 ${Xs(gp - ts - R)} ${Ys(-WGL.hL - ts)}H${Xs(-WGL.Lh)}`;
    o += `<g data-feat="strap" class="feat"><path class="pt" d="${strapU}"/><path class="pt" d="${strapL}"/></g>`;
    o += L(Xs(-4.4), Ys(0), Xs(gp + fw + 0.4), Ys(0), 'cl') + T(Xs(gp + fw + 0.5), Ys(0) + 5, 'A', 'tx', 'start') + T(Xs(0) - 6, Ys(-WGL.hL) + 22, 'B', 'tx', 'end');
    o += vdim('strap', Ys(WGL.hU + WGL.Lv), Ys(WGL.hU), Xs(gp + fw), Xs(gp + fw) + 30, `${WGL.Lv.toFixed(1)}`) + vdim('strap', Ys(-WGL.hL), Ys(-WGL.hL - WGL.LvL), Xs(gp + fw), Xs(gp + fw) + 30, `${WGL.LvL.toFixed(1)}`);
    o += hdim('strap', Xs(-WGL.Lh), Xs(0), Ys(WGL.hU), Ys(WGL.hU + WGL.Lv) - 10, `${WGL.Lh.toFixed(1)}`);
    o += vdim('outline', Ys(WGL.hU), Ys(-WGL.hL), Xs(-4.2), Xs(-4.2) - 30, `${WGL.depth.toFixed(2)}`);
    o += leader('strap', Xs(gp - ts - R * 0.3), Ys(WGL.hU + R * 0.3), Xs(gp + fw) + 90, Ys(WGL.hU + 1.2), `${n} × 6781 0/90 × ${WGL.b.toFixed(2)} · R${R.toFixed(2)} FLOX`);
    o += leader('bond', Xs(gp / 2), Ys(-WGL.hL * 0.5), Xs(gp + fw) + 90, Ys(-WGL.hL * 0.5) + 20, `FLOX ${gp.toFixed(2)} AT A`);
    o += T(Xs(-0.6), Ys(bot) + 44, 'SECTION THROUGH THE STRAPS, LOOKING AFT · 1:2.5', 'vt');
    o += T(Xs(-4.1), Ys(WGL.hU) - 8, 'WING', 'tq', 'start') + T(Xs(gp + fw / 2), Ys(top) - 8, 'FIN', 'tq');
    // cap schedule
    const fxh = (a) => a.filter((q) => q < g.h - 1e-6).map((q) => (q * 12).toFixed(1)), Zc = wlSized();
    const rows = [['CAP SCHEDULE (h OF EACH PLY END, SHORTEST FIRST)', ''], [`OUTBOARD ${Zc.upper.length} × 6781 0/90:`, fxh(capsOf('upper')).join('  ')], [`INBOARD ${Zc.lower.length} × 6781 0/90:`, fxh(capsOf('lower')).join('  ')],
      [`${Zc.upper.filter((p) => p.y1 >= g.h - 1e-6).length} + ${Zc.lower.filter((p) => p.y1 >= g.h - 1e-6).length} RUN TO THE TIP (h ${H.toFixed(1)})`, '']];
    rows.push(['DROPS TICKED ON LINE C: OUTBOARD →, INBOARD ←', ''], [`ROOT CAPS ${WGL.nRoot} × 6781 0/90 EACH FACE, h ${(WGL.Lc).toFixed(1)} TO −${(WGL.hRoot * 12).toFixed(1)}`, ''], [`FIN-ROOT WEB ${WGL.nW} × 6781, h ${(WGL.hTop * 12).toFixed(1)} TO −${(WGL.hRoot * 12).toFixed(1)}`, '']);
    rows.forEach((r, i) => { o += `<g class="dim" data-feat="${i > 5 ? 'root' : 'cap'}">${T(1100, 640 + i * 18, r[0], i ? 'tn2' : 'tq', 'start')}${T(1280, 640 + i * 18, r[1], 'tn2', 'start')}</g>`; });
    return { svg: o, bottom: 750, scale: '1:16 / 1:2.5' };
  },
  /** LEZ-57-144 wing drag angle: plan above the side elevation (third angle), 2:1 */
  'LEZ-57-144'(k, D) {
    const { L, T, hdim, vdim, datum, leader } = k, p = D.params(), S = 100, y0 = p.yh - p.b;
    const X = (y) => 480 + (y - y0) * S;
    // plan: x spanwise up the page
    const Yp = (x) => 380 - x * S;
    let o = `<g data-feat="outline" class="feat"><rect class="pt" x="${X(y0)}" y="${Yp(p.L / 2)}" width="${p.b * S}" height="${p.L * S}"/></g>`;
    o += `<g data-feat="legB" class="feat">${L(X(p.yh - p.t), Yp(p.L / 2), X(p.yh - p.t), Yp(-p.L / 2), 'ln')}</g>`;
    o += `<g data-feat="drag" class="feat"><circle class="pt" cx="${X(0)}" cy="${Yp(0)}" r="${p.D / 2 * S}"/></g>`;
    o += L(X(0), Yp(p.L / 2) - 20, X(0), Yp(-p.L / 2) + 20, 'cl') + L(X(y0) - 20, Yp(0), X(p.yh) + 20, Yp(0), 'cl') + T(X(p.yh) + 26, Yp(0) + 5, 'C', 'tx', 'start');
    o += vdim('outline', Yp(p.L / 2), Yp(-p.L / 2), X(y0), X(y0) - 60, d2(p.L));
    o += hdim('legA', X(y0), X(0), Yp(p.L / 2), Yp(p.L / 2) - 40, d2(p.eF)) + hdim('outline', X(y0), X(p.yh), Yp(p.L / 2), Yp(p.L / 2) - 84, d2(p.b));
    o += leader('drag', X(0) + p.D / 2 * S * 0.7, Yp(0) - p.D / 2 * S * 0.7, X(p.yh) + 90, Yp(0) - 110, `Ø${d3(p.D)} +.003/−.000 †`, ['⌖', 'Ø.010', 'A', 'B', 'C']);
    o += T(X(y0 + p.b / 2), Yp(-p.L / 2) + 50, 'PLAN (FWD ←)', 'vt');
    // side elevation: y aft to the right, z up
    const Z = (z) => 790 - z * S;
    o += `<g data-feat="outline" class="feat"><path class="pt" d="M${X(y0)} ${Z(0)}H${X(p.yh)}V${Z(p.b)}H${X(p.yh - p.t)}V${Z(p.t)}H${X(y0)}Z"/></g>`;
    o += `<g data-feat="drag" class="feat">${L(X(-p.D / 2), Z(0), X(-p.D / 2), Z(p.t), 'hd')}${L(X(p.D / 2), Z(0), X(p.D / 2), Z(p.t), 'hd')}${L(X(0), Z(0) + 14, X(0), Z(p.t) - 14, 'cl')}</g>`;
    o += vdim('legB', Z(p.b), Z(0), X(p.yh), X(p.yh) + 60, d2(p.b)) + vdim('legA', Z(p.t), Z(0), X(y0), X(y0) - 50, d3(p.t)) + hdim('legB', X(p.yh - p.t), X(p.yh), Z(p.b), Z(p.b) - 36, d3(p.t));
    o += hdim('drag', X(0), X(p.yh - p.t), Z(0), Z(0) + 50, d2(p.yh - p.t));
    const dA = X(y0 + 0.3), dBy = Z(p.b * 0.6), dBx = X(p.yh - p.t);
    o += `<g class="datum">${L(dA, Z(0), dA, Z(0) + 22)}<path class="ar" d="M${dA - 7} ${Z(0)}L${dA + 7} ${Z(0)}L${dA} ${Z(0) - 10}Z"/><rect class="fcf" x="${dA - 13}" y="${Z(0) + 22}" width="26" height="26"/>${T(dA, Z(0) + 41, 'A')}</g>`;
    o += `<g class="datum">${L(dBx, dBy, dBx - 22, dBy)}<path class="ar" d="M${dBx} ${dBy - 7}L${dBx} ${dBy + 7}L${dBx + 10} ${dBy}Z"/><rect class="fcf" x="${dBx - 48}" y="${dBy - 13}" width="26" height="26"/>${T(dBx - 35, dBy + 6, 'B')}</g>`;
    o += T(X(y0 + p.b / 2), Z(0) + 100, 'SIDE ELEVATION, LOOKING INBOARD (RIGHT ANGLE) · 1:1', 'vt');
    return { svg: o, bottom: 560, scale: '1:1', notesBox: { x: 1000, top: 520, n: 76, bottom: 870 } };
  },
};

VIEWS['LEZ-57-191'] = ctlView('aileron');
VIEWS['LEZ-55-192'] = ctlView('elevator');

/** LEZ-57-116 jut-out: plan (BL across, FS down, 1:4) with the drag spar and the angle; section on C (1:2) */
VIEWS['LEZ-57-116'] = (k, D) => {
  const { L, T, hdim, vdim, leader } = k, J = JSP, st = jutStations(), YJ = GEO.join.y * 12, S = 12.5, X = (bl) => 140 + (bl - 10) * S, Yp = (fs) => 180 + (fs - st[0]) * S;
  const ins = st.map((s) => { const o = jutSection(s, {}).oml; return [o[0][0], s]; }), aft = st.at(-1);
  let o = `<g data-feat="outline" class="feat"><path class="pt" d="M${X(ins[0][0])} ${Yp(st[0])}H${X(YJ)}V${Yp(aft)}${ins.slice().reverse().map(([bl, s]) => `L${X(bl)} ${Yp(s)}`).join('')}Z"/></g>`;
  o += `<g data-feat="spar" class="feat"><path class="hd" d="M${X(J.yLo0)} ${Yp(J.sB - J.b / 2)}H${X(YJ + J.Lov)}V${Yp(J.sB + J.b / 2)}H${X(J.yLo0)}Z"/><rect class="pt" x="${X(J.yA)}" y="${Yp(J.sB - J.wBlk / 2)}" width="${(YJ - J.yA) * S}" height="${J.wBlk * S}"/></g>`;
  o += `<g data-feat="pocket" class="feat"><rect class="pt" x="${X(J.yB - DANG.L / 2)}" y="${Yp(J.sB + DANG.yh - DANG.b)}" width="${DANG.L * S}" height="${DANG.b * S}"/></g>`;
  o += `<g data-feat="drag" class="feat"><circle class="pt" cx="${X(J.yB)}" cy="${Yp(J.sB)}" r="${ATT_D() / 2 * S + 2}"/></g>`;
  o += L(X(J.yLo0) - 30, Yp(J.sB), X(YJ + J.Lov) + 20, Yp(J.sB), 'cl') + T(X(YJ + J.Lov) + 26, Yp(J.sB) + 5, 'C', 'tx', 'start') + L(X(YJ), Yp(st[0]) - 30, X(YJ), Yp(aft) + 20, 'cl') + T(X(YJ), Yp(st[0]) - 36, 'A (ROOT FACE)', 'tq') + T(X(ins[0][0]) - 8, Yp(st[0]) + 5, 'B', 'tx', 'end');
  o += hdim('outline', X(ins[0][0]), X(YJ), Yp(st[0]), Yp(st[0]) - 50, `${(YJ - ins[0][0]).toFixed(2)} AT B`) + vdim('outline', Yp(st[0]), Yp(aft), X(YJ), X(YJ) + 150, `${(aft - st[0]).toFixed(2)}`);
  o += vdim('spar', Yp(st[0]), Yp(J.sB), X(YJ + J.Lov), X(YJ + J.Lov) + 40, `${(J.sB - st[0]).toFixed(2)}`) + hdim('drag', X(J.yB), X(YJ), Yp(aft), Yp(aft) + 40, `${J.arm.toFixed(2)}`);
  o += leader('spar', X((J.yA + YJ) / 2), Yp(J.sB + J.b / 2), X(YJ) - 120, Yp(J.sB) + 90, `DRAG SPAR ${J.n} × HTS40 × ${J.b} · ${J.nW} × 6781 WEBS · ${J.wBlk} HT61`);
  o += leader('pocket', X(J.yB - DANG.L / 2), Yp(J.sB + DANG.yh), X(J.yB) - 20, Yp(J.sB) + 150, 'LEZ-57-144 IN ROOT POCKET');
  o += T(X(28), Yp(aft) + 90, 'PLAN, RIGHT JUT-OUT (LEFT OPPOSITE), FWD ↑ · 1:8', 'vt');
  // section on C, BL across, WL up, 1:2
  const sec = jutSection(J.sB, { cap: true, blk: true }), S2 = 100 / 6, ox = 140, oy = 800, zc = 36;
  const P = (q) => `${ox + (q[0] - 10) * S2} ${oy - (q[1] - zc) * S2}`;
  o += `<g data-feat="outline" class="feat"><path class="pt" d="M${sec.oml.map(P).join('L')}Z"/></g><g data-feat="spar" class="feat"><path class="pt" d="M${sec.cap_u.map(P).join('L')}Z"/><path class="pt" d="M${sec.cap_l.map(P).join('L')}Z"/><path class="hd" d="M${sec.block.map(P).join('L')}Z"/></g>`;
  const hu = sec.oml.find((q) => Math.abs(q[0] - YJ) < 1e-6), hl = sec.oml.slice().reverse().find((q) => Math.abs(q[0] - YJ) < 1e-6);
  o += vdim('outline', oy - (hu[1] - zc) * S2, oy - (hl[1] - zc) * S2, ox + (YJ - 10) * S2, ox + (YJ - 10) * S2 + 40, `${(hu[1] - hl[1]).toFixed(2)}`);
  o += T(ox + (YJ - 10) * S2 * 0.5, oy + 100, 'SECTION ON C, LOOKING AFT · 1:6', 'vt');
  return { svg: o, bottom: 150, scale: '1:8 / 1:6', notesBox: { x: 1000, top: 150, n: 76, bottom: 860 } };
};
const ATT_D = () => 0.25;

/** LEZ-57-152 root joint: the two close-outs (looking inboard, 1:2) with the seal line, and a section across the gap (4:1) */
VIEWS['LEZ-57-152'] = (k, D) => {
  const { L, T, hdim, vdim, leader } = k, S = 50, s0 = RJ.end.pts[0][0], X = (s) => 120 + (s - s0) * 12 * S, Z = (z) => 430 - (z - GEO.wing.z) * 12 * S;
  const poly = (pts) => `M${pts.map((p) => `${X(p[0])} ${Z(p[1])}`).join('L')}${pts.slice().reverse().map((p) => `L${X(p[0])} ${Z(p[2])}`).join('')}Z`;
  let o = `<g data-feat="end" class="feat"><path class="pt" d="${poly(RJ.end.pts)}"/></g><g data-feat="root" class="feat"><path class="hd" d="${poly(RJ.root.pts)}"/></g>`;
  const ins = SEAL.inset;
  o += `<g data-feat="seal" class="feat"><path class="ld" d="M${RJ.end.pts.map((p) => `${X(p[0])} ${Z(p[1] - ins)}`).join('L')}M${RJ.end.pts.map((p) => `${X(p[0])} ${Z(p[2] + ins)}`).join('L')}"/></g>`;
  const a = RJ.end.pts, sf = a.at(-1)[0];
  o += hdim('end', X(a[0][0]), X(sf), Z(Math.max(...a.map((p) => p[1]))), Z(Math.max(...a.map((p) => p[1]))) - 40, `${((sf - a[0][0]) * 12).toFixed(2)} TO THE CS SPAR`);
  o += leader('seal', X(a[30][0]), Z(a[30][1] - ins), X(a[30][0]) + 60, Z(a[30][1]) + 70, `SEAL ${RJ.seal.t} × ${RJ.seal.w} SPONGE, ${(ins * 12).toFixed(2)} IN INSIDE THE SKIN`);
  o += leader('root', X(a[40][0]), Z(a[40][2]), X(a[40][0]) + 40, Z(a[40][2]) + 90, 'WING ROOT RIB (DASHED), 2 × 6781');
  o += T(X((a[0][0] + sf) / 2), Z(Math.min(...a.map((p) => p[2]))) + 150, 'STRAKE END RIB, LOOKING INBOARD · 1:2', 'vt');
  // section across the gap at mid-chord, 4:1
  const S2 = 400, gx = 1000, gy = 560, gap = GEO.join.gap * 12, t2 = 0.026;
  o += `<g data-feat="end" class="feat"><rect class="pt" x="${gx - 60}" y="${gy - 140}" width="${60 - t2 * S2}" height="280"/><rect class="pt" x="${gx - t2 * S2}" y="${gy - 140}" width="${t2 * S2}" height="280"/></g>`;
  o += `<g data-feat="root" class="feat"><rect class="pt" x="${gx + gap * S2}" y="${gy - 140}" width="${t2 * S2}" height="280"/><rect class="pt" x="${gx + gap * S2 + t2 * S2}" y="${gy - 140}" width="60" height="280"/></g>`;
  o += `<g data-feat="seal" class="feat"><rect class="pt" x="${gx}" y="${gy - 140 + ins * 12 * S2 - RJ.seal.w / 2 * S2}" width="${gap * S2}" height="${RJ.seal.w * S2}"/></g>`;
  o += hdim('seal', gx, gx + gap * S2, gy + 140, gy + 180, `${gap.toFixed(2)} GAP`);
  o += T(gx - 30, gy + 215, 'STRAKE', 'tq', 'end') + T(gx + gap * S2 + 40, gy + 215, 'WING', 'tq', 'start') + T(gx - 200, gy + 255, 'SECTION ACROSS THE GAP AT THE SKIN · 4:1', 'vt');
  return { svg: o, bottom: 150, scale: '1:2 / 4:1', notesBox: { x: 1240, top: 150, n: 54, bottom: 860 } };
};

/** LEZ-57-180 strake: plan (BL across, FS down, 1:10) with the ribs; rib templates T1–T4 with the cavity (1:10) */
VIEWS['LEZ-57-180'] = (k, D) => {
  const { L, T, hdim, vdim, leader } = k, S = 10, fs0 = strakeSec(STK.yR / 12).le * 12, X = (bl) => 120 + (bl - 10) * S, Yp = (fs) => 120 + (fs - fs0) * S;
  const ys = Array.from({ length: 25 }, (_, i) => STK.yR + (STK.yE - STK.yR) * i / 24), le = (y) => strakeSec(y / 12).le * 12;
  let o = `<g data-feat="outline" class="feat"><path class="pt" d="M${ys.map((y) => `${X(y)} ${Yp(le(y))}`).join('L')}L${X(STK.yE)} ${Yp(STK.aft)}L${X(STK.yR)} ${Yp(STK.aft)}Z"/></g>`;
  STK.ribs.forEach((y, i) => { o += `<g data-feat="ribs" class="feat">${L(X(y), Yp(le(y)) - 10, X(y), Yp(STK.aft) + 10, 'cl')}</g>` + T(X(y), Yp(STK.aft) + 28, `R${i + 1}`, 'tq'); });
  o += T(X(STK.yR) - 8, Yp(STK.aft) + 5, 'A', 'tx', 'end') + T(X(STK.yE) + 10, Yp(STK.aft) + 5, 'B', 'tx', 'start');
  o += hdim('outline', X(STK.yR), X(STK.yE), Yp(STK.aft), Yp(STK.aft) + 60, `${(STK.yE - STK.yR).toFixed(2)} (BL ${STK.yR.toFixed(2)}–${STK.yE.toFixed(2)})`);
  o += vdim('outline', Yp(le(STK.yR)), Yp(STK.aft), X(STK.yR), X(STK.yR) - 30, `${(STK.aft - le(STK.yR)).toFixed(1)}`);
  o += hdim('ribs', X(STK.ribs[1]), X(STK.ribs[2]), Yp(le(STK.ribs[2])), Yp(le(STK.ribs[1])) - 40, `${(STK.ribs[2] - STK.ribs[1]).toFixed(2)} RIB PITCH`);
  o += T(X(28), Yp(STK.aft) + 110, 'PLAN, RIGHT STRAKE (LEFT OPPOSITE), FWD ↑ · 1:10', 'vt');
  // rib templates, LE left, 1:10
  const tx = 560;
  STK.ribs.forEach((y, i) => { const sct = strakeSection(y + (i === 0 ? 0.01 : i === STK.ribs.length - 1 ? -0.01 : 0), true), x0 = Math.min(...sct.oml.map((p) => p[0])), ty = 160 + i * 95;
    const pth = (a) => `M${a.map((p) => `${tx + (p[0] - x0) * S} ${ty - (p[1] - 36.6) * S}`).join('L')}Z`;
    o += `<g data-feat="outline" class="feat"><path class="pt" d="${pth(sct.oml)}"/></g><g data-feat="cavity" class="feat"><path class="hd" d="${pth(sct.cavity)}"/></g>` + T(tx - 10, ty + 5, `T${i + 1}`, 'tx', 'end') + T(tx + (STK.aft - x0) * S + 10, ty, `BL ${y.toFixed(1)}`, 'tq', 'start'); });
  o += T(tx + 170, 530, 'RIB TEMPLATES T1–T4 (CAVITY DASHED) · 1:10', 'vt');
  return { svg: o, bottom: 440, scale: '1:10', notesBox: { x: 1000, top: 440, n: 72, bottom: 870 } };
};

/** LEZ-57-151 lap: section at mid-span through the spar (FS across, WL up, 2:1) */
VIEWS['LEZ-57-151'] = (k, D) => {
  const { L, T, hdim, vdim, leader } = k, P = lapParams(), sg = P.segs[Math.floor(P.segs.length / 2)], S = 100, x0 = LAP.s0 - 2, X = (fs) => 200 + (fs - x0) * S, zc = sg.regions.lap_u[0][0][1], Z = (z) => 300 - (z - zc) * S;
  const pth = (a) => `M${a.map((p) => `${X(p[0])} ${Z(p[1])}`).join('L')}Z`, lo = sg.regions.lap_l[0], up = sg.regions.lap_u[0];
  let o = `<g data-feat="lap" class="feat"><path class="pt" d="${pth(up)}"/><path class="pt" d="${pth(lo)}"/></g>`;
  const zL = lo[0][1];
  o += `<path class="hd" d="M${X(LAP.s0)} ${Z(zc) + 8}V${Z(zL) - 8}M${X(LAP.s1)} ${Z(zc) + 8}V${Z(zL) - 8}"/>` + T((X(LAP.s0) + X(LAP.s1)) / 2, (Z(zc) + Z(zL)) / 2, 'CS SPAR (LEZ-57-140)', 'tq');
  o += `<g data-feat="lap" class="feat">${L(X(LAP.s0 - LAP.onto), Z(zc) - 6, X(LAP.s0), Z(zc) - 6, 'hd')}</g>` + T(X(LAP.s0 - 1.3), Z(zc) - 16, 'STRAKE', 'tq', 'end');
  o += hdim('lap', X(LAP.s0), X(LAP.s1), Z(zc), Z(zc) - 60, `${LAP.cap.toFixed(2)} (A TO B)`) + hdim('lap', X(LAP.s0 - LAP.onto), X(LAP.s0), Z(zc), Z(zc) - 60, `${LAP.onto.toFixed(2)}`);
  o += T(X(LAP.s0) - 8, Z(zL) + 30, 'A', 'tx', 'end') + T(X(LAP.s1) + 8, Z(zL) + 30, 'B', 'tx', 'start');
  o += leader('tape', X(LAP.s0) - 4, Z(zL) - 10, X(LAP.s0) - 160, Z(zL) + 60, `TANK TAPES ${LAP.tape.n} × 6781 × ${LAP.tape.w}`);
  o += T(X(LAP.s0 + 2), Z(zL) + 110, `SECTION AT BL ${sg.ha.toFixed(1)}, LOOKING OUTBOARD · 1:2`, 'vt');
  return { svg: o, bottom: 150, scale: '1:2', notesBox: { x: 900, top: 150, n: 80, bottom: 860 } };
};

/** LEZ-71-220 engine mount: side elevation and plan of the truss (1:4), cut list */
VIEWS['LEZ-71-220'] = (k, D) => {
  const { L, T, hdim, vdim } = k, p = D.params(), N = p.nodes, S = 100 / 6, fs0 = Math.min(...Object.values(N).map((q) => q[1]));
  const side = (q) => [160 + (q[1] - fs0) * S, 420 - (q[2] - N.FBL[2]) * S], plan = (q) => [160 + (q[1] - fs0) * S, 700 - q[0] * S];
  let o = '';
  for (const [view, f] of [['side', side], ['plan', plan]]) for (const [a, b, od, w, g] of p.members) { const A = f(N[a]), B = f(N[b]); o += `<g data-feat="${g}" class="feat">${L(A[0], A[1], B[0], B[1], 'pt')}</g>`; }
  for (const [nm, q] of Object.entries(N)) { const A = side(q), B = plan(q); o += `<circle class="pt" cx="${A[0]}" cy="${A[1]}" r="4"/><circle class="pt" cx="${B[0]}" cy="${B[1]}" r="4"/>` + T(A[0] + 8, A[1] - 6, nm, 'tq', 'start'); }
  o += L(side(N.FTL)[0], 150, side(N.FTL)[0], 450, 'cl') + T(side(N.FTL)[0], 142, 'A (FIREWALL)', 'tq');
  o += hdim('longeron', side(N.FBL)[0], side(N.EBL)[0], side(N.EBL)[1], side(N.EBL)[1] + 50, `${(N.EBL[1] - N.FBL[1]).toFixed(2)}`) + vdim('ring', side(N.ETL)[1], side(N.EBL)[1], side(N.ETL)[0], side(N.ETL)[0] + 40, `${(N.ETL[2] - N.EBL[2]).toFixed(2)}`);
  o += vdim('ring', plan(N.ETL)[1], plan(N.ETR)[1], plan(N.ETL)[0], plan(N.ETL)[0] + 40, `${(N.ETL[0] - N.ETR[0]).toFixed(2)}`) + vdim('longeron', plan(N.FBL)[1], plan(N.FBR)[1], plan(N.FBL)[0], plan(N.FBL)[0] - 40, `${(N.FBL[0] - N.FBR[0]).toFixed(2)}`);
  o += T(300, 500, 'SIDE ELEVATION, LOOKING INBOARD FROM THE LEFT · 1:6', 'vt') + L(140, 700, 520, 700, 'cl') + T(300, 860, 'PLAN, FWD ←, LOOKING DOWN · 1:6', 'vt');
  const rows = MOUNT_SIZING.cut.map((t) => [t.id, `${t.a}–${t.b}`, `${t.od} × ${t.w}`, t.L.toFixed(2), t.group]);
  o += T(760, 130, 'CUT LIST (NODE TO NODE; FISH-MOUTH TO THE JIG)', 'tq', 'start');
  rows.forEach((r, i) => { o += `<g class="dim" data-feat="${r[4]}">${r.map((c, j) => T(760 + [0, 60, 170, 290, 360][j], 152 + i * 17, c, 'tn2', 'start')).join('')}</g>`; });
  return { svg: o, bottom: 150, scale: '1:6', notesBox: { x: 1240, top: 150, n: 54, bottom: 860 } };
};

/** LEZ-71-222 upper pick-up: front view (looking forward, 2:1) and top view with the backing plate (2:1) */
VIEWS['LEZ-71-222'] = (k, D) => {
  const { L, T, hdim, vdim, leader } = k, p = D.params(), S = 100;
  // front view: x lateral across, z up; base square, ear edges, base holes
  const fx0 = 400, fz0 = 330, X = (x) => fx0 + x * S, Z = (z) => fz0 - z * S;
  let o = `<g data-feat="base" class="feat"><rect class="pt" x="${X(-p.B / 2)}" y="${Z(p.B / 2)}" width="${p.B * S}" height="${p.B * S}"/>${[-1, 1].flatMap((a) => [-1, 1].map((b) => `<circle class="pt" cx="${X(a * p.p / 2)}" cy="${Z(b * p.p / 2)}" r="${p.db / 2 * S}"/>`)).join('')}</g>`;
  o += `<g data-feat="ears" class="feat">${[-1, 1].map((sd) => { const x0 = sd > 0 ? p.gap / 2 : -p.gap / 2 - p.te; return `<rect class="pt" x="${X(x0)}" y="${Z(p.w / 2)}" width="${p.te * S}" height="${p.w * S}"/>`; }).join('')}</g>`;
  o += hdim('base', X(-p.B / 2), X(p.B / 2), Z(p.B / 2), Z(p.B / 2) - 40, `${p.B.toFixed(2)}`) + hdim('base', X(-p.p / 2), X(p.p / 2), Z(-p.B / 2), Z(-p.B / 2) + 40, `${p.p.toFixed(2)}`) + hdim('ears', X(-p.gap / 2), X(p.gap / 2), Z(p.w / 2), Z(p.B / 2) - 80, `${p.gap.toFixed(3)} GAP`);
  o += leader('base', X(p.p / 2) + 6, Z(p.p / 2) - 6, X(p.B / 2) + 40, Z(p.B / 2) - 20, `4 × Ø${(p.db + 0.006).toFixed(3)}`);
  o += T(fx0, Z(-p.B / 2) + 110, 'VIEW ON A, LOOKING FORWARD (RIGHT FITTING) · 1:1', 'vt');
  // top view: x lateral across, y aft down; base, ears, backing plate behind the firewall
  const ty0 = 620, Y = (y) => ty0 + y * S;
  o += `<g data-feat="base" class="feat"><rect class="pt" x="${X(-p.B / 2)}" y="${Y(0)}" width="${p.B * S}" height="${p.tb * S}"/></g>`;
  o += `<g data-feat="ears" class="feat">${[-1, 1].map((sd) => { const x0 = sd > 0 ? p.gap / 2 : -p.gap / 2 - p.te; return `<rect class="pt" x="${X(x0)}" y="${Y(p.tb)}" width="${p.te * S}" height="${(p.h + p.e) * S}"/>`; }).join('')}${L(X(-p.gap / 2 - p.te - 0.2), Y(p.tb + p.h), X(p.gap / 2 + p.te + 0.2), Y(p.tb + p.h), 'cl')}</g>`;
  o += `<g data-feat="back" class="feat"><rect class="pt" x="${X(-p.Bk / 2)}" y="${Y(-p.tfw - p.tk)}" width="${p.Bk * S}" height="${p.tk * S}"/></g><path class="hd" d="M${X(-p.Bk / 2 - 0.3)} ${Y(-p.tfw)}H${X(p.Bk / 2 + 0.3)}M${X(-p.Bk / 2 - 0.3)} ${Y(0)}H${X(p.Bk / 2 + 0.3)}"/>`;
  o += vdim('ears', Y(0), Y(p.tb + p.h), X(p.B / 2), X(p.B / 2) + 40, `${(p.tb + p.h).toFixed(3)} TO B`) + vdim('ears', Y(p.tb + p.h), Y(p.tb + p.h + p.e), X(p.B / 2), X(p.B / 2) + 120, `${p.e.toFixed(3)}`);
  o += T(X(-p.Bk / 2) - 10, Y(-p.tfw / 2) + 5, 'FIREWALL', 'tq', 'end') + T(X(-p.B / 2) - 10, Y(0) + 5, 'A', 'tx', 'end');
  o += T(fx0, Y(p.tb + p.h + p.e) + 70, 'TOP VIEW, AFT ↓ · 1:1', 'vt');
  return { svg: o, bottom: 150, scale: '1:1', notesBox: { x: 1000, top: 150, n: 72, bottom: 860 } };
};

/** LEZ-55-120 canard: half planform (BL across, FS down, 1:8), template section with the caps (1:2), cap schedule */
VIEWS['LEZ-55-120'] = (k, D) => {
  const { L, T, hdim, vdim, leader } = k, G = GEO.canard, S = 12.5, X = (bl) => 120 + bl * S, Yp = (fs) => 150 + (fs - G.le * 12) * S;
  const le = G.le * 12, te = (G.le + G.c) * 12, hn = (G.le + (1 - G.elevCf) * G.c) * 12, sp = (G.le + G.spar * G.c) * 12, [e0, e1] = G.elevator.map((y) => y * 12), H = G.semi * 12;
  let o = `<g data-feat="outline" class="feat"><path class="pt" d="M${X(0)} ${Yp(le)}H${X(H)}V${Yp(te)}H${X(e1)}V${Yp(hn)}H${X(e0)}V${Yp(te)}H${X(0)}"/></g>` + `<path class="hd" d="M${X(e0)} ${Yp(te)}H${X(e1)}"/>` + T((X(e0) + X(e1)) / 2, Yp(te) + 22, 'ELEVATOR LEZ-55-192 (REF)', 'tq');
  o += L(X(0) - 10, Yp(sp), X(H) + 14, Yp(sp), 'cl') + T(X(H) + 18, Yp(sp) + 5, 'B', 'tx', 'start') + L(X(0), Yp(le) - 20, X(0), Yp(te) + 20, 'cl') + T(X(0), Yp(le) - 26, 'A (CL)', 'tq');
  for (const [side, dir] of [['upper', -1], ['lower', 1]]) for (const y of cnCaps(side).filter((q) => q < G.semi - 1e-6)) o += `<g class="dim" data-feat="cap">${L(X(y * 12), Yp(sp), X(y * 12), Yp(sp) + dir * 8, 'ld')}</g>`;
  const ya = G.attachY * 12;
  o += `<g data-feat="tab" class="feat"><rect class="pt" x="${X(ya - CNA.w / 2)}" y="${Yp(GEO.F22 * 12 - CNA.Lf)}" width="${CNA.w * S}" height="${CNA.Lf * S}"/><rect class="pt" x="${X(ya - CNA.w / 2)}" y="${Yp(GEO.F28 * 12 - CNA.Lf)}" width="${CNA.w * S}" height="${CNA.Lf * S}"/></g>` + leader('attach', X(ya) + 4, Yp(GEO.F22 * 12) + 4, X(ya) + 40, Yp(te) + 60, `TABS: F22 ${CNA.nT} × 6781, ${CNA.nb} × AN${CNA.an}; F28 PIN AN${CNA.pin}`);
  o += hdim('outline', X(0), X(H), Yp(le), Yp(le) - 40, `${H.toFixed(1)} (HALF SPAN)`) + vdim('outline', Yp(le), Yp(te), X(H), X(H) + 40, `${(G.c * 12).toFixed(2)}`);
  o += T(X(H / 2), Yp(te) + 110, 'PLANFORM, RIGHT HALF (LEFT OPPOSITE), FWD ↑ · 1:8', 'vt');
  // template section at BL 0 with the caps, 1:2
  const S2 = 50, ox = 140, oy = 560, P = D.params(), sg = P.segs[0], pth = (a) => `M${a.map((q) => `${ox + (q[0] - le) * S2} ${oy - (q[1] - G.z * 12) * S2}`).join('L')}Z`;
  o += `<g data-feat="outline" class="feat"><path class="pt" d="${pth(sg.regions.oml[0])}"/></g><g data-feat="cap" class="feat"><path class="pt" d="${pth(sg.regions.cap_u[0])}"/><path class="pt" d="${pth(sg.regions.cap_l[0])}"/></g>`;
  o += T(ox + G.c * 12 * S2 / 2, oy + 100, 'TEMPLATE T1 (CONSTANT CHORD) WITH THE CAP TROUGHS AT BL 0 · 1:2', 'vt');
  const fxy = (a) => a.filter((q) => q < G.semi - 1e-6).map((q) => (q * 12).toFixed(1)), Z = analyse(DEFAULT_DESIGN, false).Z.canard;
  const rows = [['CAP SCHEDULE (±BL OF EACH PLY END, SHORTEST FIRST)', ''], [`UPPER ${Z.upper.length} × HTS40:`, ''], ...chunk(fxy(cnCaps('upper')), 12).map((c) => ['', c.join('  ')]), [`LOWER ${Z.lower.length} × HTS40:`, ''], ...chunk(fxy(cnCaps('lower')), 12).map((c) => ['', c.join('  ')]), ['3 + 3 RUN TO THE TIPS', '']];
  rows.forEach((r, i) => { o += `<g class="dim" data-feat="cap">${T(40, 730 + i * 16, r[0], i ? 'tn2' : 'tq', 'start')}${T(150, 730 + i * 16, r[1], 'tn2', 'start')}</g>`; });
  return { svg: o, bottom: 150, scale: '1:8 / 1:2', notesBox: { x: 1240, top: 150, n: 54, bottom: 860 } };
};

/** LEZ-53-160 F22: view from aft (BL across, + right; WL up, 1:2), the stack section at the hard point (4:1), hole table */
VIEWS['LEZ-53-160'] = (k, D) => {
  const { L, T, hdim, vdim, leader } = k, G = F22G, S = 100 / 3, zb = Math.min(...G.pts.map((q) => q[1])), X = (y) => 470 + y * S, Z = (z) => 150 + (G.zTop - z) * S + 40, R = f22Regions(), P = D.params();
  const path = (a) => `M${a.map((q) => `${X(q[0]).toFixed(1)} ${Z(q[1]).toFixed(1)}`).join('L')}Z`, rect = (r, cls) => { const y0 = Math.max(r[0], -G.wIn), y1 = Math.min(r[1], G.wIn), z1 = Math.min(r[3], G.zTop); return `<rect class="${cls}" style="fill:none" x="${X(y0)}" y="${Z(z1)}" width="${(y1 - y0) * S}" height="${(z1 - r[2]) * S}"/>`; };
  let o = `<defs><clipPath id="f22c"><path d="${path(G.pts)}"/></clipPath></defs>`;
  o += `<g data-feat="outline" class="feat"><path class="pt" d="${path(G.pts)}"/></g>`;
  o += `<g data-feat="ng" class="feat" clip-path="url(#f22c)">${R.ng.map((r) => rect(r, 'hd')).join('')}</g><g data-feat="hp" class="feat" clip-path="url(#f22c)">${R.hpB.map((r) => rect(r, 'hd')).join('')}${R.hpU.map((r) => rect(r, 'hd')).join('')}</g>`;
  P.holes.forEach((h, i) => { o += `<g data-feat="${h.id}" class="feat"><circle class="pt" cx="${X(h.y)}" cy="${Z(h.z)}" r="${Math.max(h.r * S, 1.5)}"/>${L(X(h.y) - h.r * S - 6, Z(h.z), X(h.y) + h.r * S + 6, Z(h.z), 'cl')}${L(X(h.y), Z(h.z) - h.r * S - 6, X(h.y), Z(h.z) + h.r * S + 6, 'cl')}${h.id === 'pass' ? T(X(h.y) + h.r * S + 4, Z(h.z) - h.r * S - 2, `H${i + 1}`, 'tn2', 'start') : ''}</g>`; });
  o += L(X(0), Z(G.zTop) - 30, X(0), Z(zb) + 30, 'cl') + T(X(0), Z(G.zTop) - 36, 'B (CL)', 'tq') + L(X(-G.wIn) - 20, Z(G.zTop), X(-G.wIn) - 4, Z(G.zTop), 'ld') + T(X(-G.wIn) - 24, Z(G.zTop) + 5, 'C', 'tx', 'end');
  o += hdim('outline', X(-G.wIn), X(G.wIn), Z(G.zTop), Z(G.zTop) - 70, `${(2 * G.wIn).toFixed(2)}`) + vdim('outline', Z(G.zTop), Z(zb), X(G.wIn), X(G.wIn) + 50, `${(G.zTop - zb).toFixed(2)}`);
  o += hdim('outline', X(-G.halfW), X(G.halfW), Z(G.chanTop), Z(zb) + 50, `${(2 * G.halfW).toFixed(2)} NOTCH`) + vdim('outline', Z(G.chanTop), Z(zb), X(-G.halfW), X(-G.wIn) - 60, `${(G.chanTop - zb).toFixed(2)}`);
  const ya = GEO.canard.attachY * 12, b0 = P.holes.find((h) => h.id === 'bolt' && h.y > 0);
  o += leader('bolt', X(ya) + 4, Z(b0.z) - 4, X(ya) + 60, Z(G.zTop) - 30, `4 × Ø${(2 * b0.r).toFixed(3)} CANARD BOLTS`) + leader('hp', X(ya + HP.w / 2) - 4, Z(G.zTop - HP.h) + 4, X(G.wIn) + 90, Z(G.zTop) + 20, 'HARD POINT, AFT FACE');
  o += leader('ng', X(-NG.plateY * 12 - 2), Z(zb + 6), 40, Z(zb) + 45, `NG DOUBLER ${FIXED_F22().ngDbl} × 6781 EACH FACE`, null);
  o += `<path class="hd" d="M${X(NG.plateY * 12)} ${Z(zb + 0.2)}V${Z(39.6)}M${X(-NG.plateY * 12)} ${Z(zb + 0.2)}V${Z(39.6)}"/>` + T(X(NG.plateY * 12) + 4, Z(39.6) - 6, 'NG-30 (REF)', 'tq', 'start');
  o += T(X(0), Z(zb) + 100, 'VIEW FROM AFT (BL + RIGHT) · 1:3', 'vt');
  // section through the hard point, FS across (fwd left), 4:1
  const S2 = 400, sx = 950, sz = 620, Fx = (fs) => sx + (fs - 22) * S2;
  for (const l of P.layers) { const [y0, y1] = [l.y0, l.y1]; o += `<g data-feat="${l.reg || (l.name === 'core' ? 'face' : 'face')}" class="feat"><rect class="${l.name === 'core' ? 'pt' : 'hd'}" style="fill:none" x="${Fx(y0)}" y="${sz}" width="${(y1 - y0) * S2}" height="${l.reg === 'hpB' || l.reg === 'hpU' ? 80 : 130}"/></g>`; }
  o += T(Fx(22), sz + 160, 'STACK AT THE HARD POINT, FS ACROSS · 4:1', 'vt') + T(Fx(22) - 40, sz + 60, '← FWD', 'tq', 'end');
  P.layers.forEach((l, i) => { o += T(sx - 150, sz + 190 + i * 16, `${l.name.toUpperCase().padEnd(6)} ${l.mat.padEnd(4)} ${(l.y1 - l.y0).toFixed(3)} IN`, 'tn2', 'start'); });
  // hole table
  const rows = P.holes.map((h, i) => [`H${i + 1}`, h.id === 'bolt' ? 'CANARD BOLT' : G.holes[i].what, h.y.toFixed(2), h.z.toFixed(2), (2 * h.r).toFixed(3)]);
  o += T(40, 810, 'HOLE TABLE (BL, WL, Ø)', 'tq', 'start');
  rows.forEach((r, i) => { o += `<g class="dim" data-feat="${P.holes[i].id}">${T(40, 828 + i * 15, r[0], 'tn2', 'start')}${T(80, 828 + i * 15, r[1].slice(0, 40), 'tn2', 'start')}${T(420, 828 + i * 15, r[2], 'tn2', 'end')}${T(480, 828 + i * 15, r[3], 'tn2', 'end')}${T(540, 828 + i * 15, r[4], 'tn2', 'end')}</g>`; });
  return { svg: o, bottom: 150, scale: '1:3 / 4:1', notesBox: { x: 1240, top: 150, n: 54, bottom: 860 } };
};
const FIXED_F22 = () => FIXED.F22;

/** LEZ-53-150 fuselage shell: side view and half plan (FS across, 1:16), sections at F22, mid-cockpit and the firewall (1:8) */
VIEWS['LEZ-53-150'] = (k, D) => {
  const { L, T, hdim, vdim } = k, S = 100 / 16, st = fusStations(), X = (fs) => 110 + (fs - FUS.s0 * 12) * S, Zs = (wl) => 330 - (wl - 30) * S, Yp = (bl) => 560 + bl * S;
  const top = (s) => { const f = fusAt(s), open = s > FUS.C0 && s < FUS.C1; return open ? layer(s, 0, -FUS.t, true, 1)[FUS.n][1] : f.top * 12; }, bot = (s) => fusAt(s).bot * 12, hw = (s) => fusAt(s).w * 6;
  const prof = (fn, M) => st.map((s) => `${X(s * 12).toFixed(1)} ${M(fn(s)).toFixed(1)}`).join('L');
  let o = `<g data-feat="core" class="feat"><path class="pt" d="M${prof(top, Zs)}L${prof(bot, Zs).split('L').reverse().join('L')}Z"/></g>`;
  o += `<g data-feat="core" class="feat"><path class="pt" d="M${prof(hw, (v) => Yp(-v))}L${X(FUS.s1 * 12)} ${Yp(0)}L${X(FUS.s0 * 12)} ${Yp(0)}Z"/></g>`;
  for (const [nm, fs] of [['F22', GEO.F22 * 12], ['C0', FUS.C0 * 12], ['C1', FUS.C1 * 12], ['B', FUS.s1 * 12]]) o += L(X(fs), Zs(fusAt(fs / 12).top * 12) - 14, X(fs), Yp(0) + 10, 'cl') + T(X(fs), Zs(fusAt(fs / 12).top * 12) - 20, nm, 'tq');
  o += L(X(FUS.s0 * 12) - 20, Yp(0), X(FUS.s1 * 12) + 20, Yp(0), 'cl') + T(X(FUS.s1 * 12) + 26, Yp(0) + 5, 'A', 'tx', 'start');
  o += hdim('core', X(FUS.s0 * 12), X(FUS.s1 * 12), Zs(fusAt(FUS.s1).top * 12), Zs(42) - 40, `${((FUS.s1 - FUS.s0) * 12).toFixed(1)}`) + hdim('core', X(FUS.C0 * 12), X(FUS.C1 * 12), Zs(40), Zs(42) - 70, `${((FUS.C1 - FUS.C0) * 12).toFixed(1)} COCKPIT OPENING`);
  o += T(X(80), Zs(fusAt(6.5).bot * 12) + 30, 'SIDE VIEW, FWD ←  · 1:16', 'vt') + T(X(80), Yp(0) + 30, 'PLAN, RIGHT HALF (LEFT OPPOSITE) · 1:16', 'vt');
  // sections, 1:8
  const S2 = 12.5;
  [[GEO.F22, 'F22'], [6.5, 'COCKPIT'], [FUS.s1 - 0.01, 'FIREWALL']].forEach(([s, nm], i) => {
    const open = s > FUS.C0 && s < FUS.C1, f = fusAt(s), cx = 200 + i * 360, cz = 770, zc = (f.top + f.bot) * 6;
    const P = (a) => `M${a.map(([y, z]) => `${(cx + y * S2).toFixed(1)} ${(cz - (z - zc) * S2).toFixed(1)}`).join('L')}Z`;
    for (const sg of [1, -1]) o += `<g data-feat="core" class="feat"><path class="pt" d="${P(layer(s, 0, -FUS.t, open, sg))}"/></g>`;
    o += T(cx, cz + (zc - f.bot * 12) * S2 + 40, `${nm}, FS ${(s * 12).toFixed(1)} · 1:8`, 'vt') + T(cx, cz + (zc - f.bot * 12) * S2 + 60, `${(f.w * 12).toFixed(2)} WIDE × ${((f.top - f.bot) * 12).toFixed(2)} HIGH`, 'tq');
  });
  return { svg: o, bottom: 150, scale: '1:16 / 1:8', notesBox: { x: 1240, top: 150, n: 54, bottom: 860 } };
};

Object.assign(VIEWS, V_A, V_B, V_C, V_D, V_E, V_F, V_G, V_H, V_I, V_J, V_P);   // block views

export function sheetSVG(pn) {
  const D = defOf(pn); if (!D || !VIEWS[pn]) return null;
  const k = kit(), { L, T } = k, d = D.def;
  const v = VIEWS[pn](k, D);
  let o = `<rect class="paper" x="0" y="0" width="1700" height="1100"/><rect class="bd" x="20" y="20" width="1660" height="1060"/>`;
  o += T(40, 52, 'NOTIONAL — NOT FOR CONSTRUCTION. Public data and this model\'s own analysis only.', 'stamp', 'start');
  o += T(40, 78, `THIRD-ANGLE PROJECTION · DIMENSIONS IN INCHES · SCALE ${v.scale} ON A 17 × 11 SHEET`, 'tq', 'start');
  o += v.svg;

  // ---------------------------------------------------------------- notes
  const notes = [
    `MATERIAL: ${d.material.spec}; ${d.material.form}.`,
    `MAKE FROM: ${d.sourcing.blank}.`,
    ...d.process.filter((x) => x.op !== 'Machine').map((x) => `${x.op.toUpperCase()}: ${(v.notesShort && v.notesShort[x.op]) || x.spec}`),   // notesShort: a view may cite a long shared process step in brief (the record keeps it whole)
    `UNLESS NOTED: ${d.tolerances.general}.${d.generalNote ? ` ${d.generalNote}` : ' Surface finish 125 µin Ra.'}`,
    ...(d.drawingNotes || []),
    `MASS: ${d.mass.each.toFixed(d.mass.each > 10 ? 2 : 3)} lb each, from the ${D.install ? 'hardware lines' : 'solid'}. QTY ${d.qty} per aircraft.`,
    ...(d.holds && d.holds.length ? [`RELEASE HELD: ${d.holds.join('; ')}.`] : []),
  ];
  const wrap = (s, n) => { const w = s.split(' '), out = []; let line = ''; for (const x of w) { if ((line + ' ' + x).trim().length > n) { out.push(line.trim()); line = x; } else line += ' ' + x; } if (line.trim()) out.push(line.trim()); return out; };
  const nb = v.notesBox, room = 1072 - v.bottom, one = nb ? true : notes.reduce((a, n) => a + wrap(n, 104).length * 17 + 3, 0) <= room;
  const cols = nb ? [{ x: nb.x, n: nb.n }] : one ? [{ x: 40, n: 104 }] : [{ x: 40, n: 60 }, { x: 560, n: 60 }], lh = nb ? 15 : one ? 17 : 15, per = Math.ceil(notes.length / cols.length);
  // notes in the right-hand column start below the revision block (it grows with the revisions)
  const nRev = Math.min(d.revs.length, 4), top0 = nb && nb.x >= 1100 ? Math.max(v.bottom, 20 + 36 + 22 * nRev + 46) : v.bottom;
  o += T(cols[0].x, top0 - 24, 'NOTES', 'vt', 'start');
  cols.forEach((c, ci) => { let ny = top0;
    notes.slice(ci * per, (ci + 1) * per).forEach((n, i0) => { const i = ci * per + i0; wrap(n, c.n).forEach((ln, j) => { o += T(c.x + (j ? 32 : 0), ny, j ? ln : `${i + 1}.  ${ln}`, one && !nb ? 'tn' : 'tn2', 'start'); ny += lh; }); ny += 3; }); });

  // ---------------------------------------------------------------- revision block
  // at most four rows (the block grew into the views on parts with many revisions): the earlier ones on one row, the record has them all
  const revRows = d.revs.length > 4 ? [{ rev: `${d.revs[0].rev}–${d.revs.at(-4).rev}`, date: '', short: 'earlier revisions: see the record' }, ...d.revs.slice(-3)] : d.revs;
  o += `<rect class="bd" x="1180" y="20" width="500" height="${36 + 22 * revRows.length}"/>${T(1430, 40, 'REVISIONS', 'tq')}${L(1180, 48, 1680, 48, 'bd')}`;
  revRows.forEach((r, i) => { o += T(1196, 68 + 22 * i, r.rev, 'tn', 'start') + T(1226, 68 + 22 * i, r.date, 'tn', 'start') + T(1330, 68 + 22 * i, r.short, 'tn', 'start'); });

  // ---------------------------------------------------------------- title block
  const tb = [1080, 880, 600, 200];
  o += `<rect class="bd" x="${tb[0]}" y="${tb[1]}" width="${tb[2]}" height="${tb[3]}"/>`;
  o += L(tb[0], tb[1] + 60, tb[0] + tb[2], tb[1] + 60, 'bd') + L(tb[0], tb[1] + 120, tb[0] + tb[2], tb[1] + 120, 'bd') + L(tb[0] + 330, tb[1] + 120, tb[0] + 330, tb[1] + 200, 'bd') + L(tb[0] + 250, tb[1] + 120, tb[0] + 250, tb[1] + 200, 'bd');
  o += T(tb[0] + 14, tb[1] + 22, 'LONG-EZ EXPLORER · BUILD-READY DEFINITION', 'tq', 'start') + T(tb[0] + 14, tb[1] + 48, 'NOTIONAL — NOT FOR CONSTRUCTION', 'stamp', 'start');
  o += T(tb[0] + 14, tb[1] + 82, 'TITLE', 'tq', 'start') + T(tb[0] + 14, tb[1] + 108, d.title.toUpperCase(), 'tt', 'start');
  o += T(tb[0] + 14, tb[1] + 142, 'PART NUMBER', 'tq', 'start') + T(tb[0] + 14, tb[1] + 178, d.pn, 'tpn', 'start');
  o += T(tb[0] + 262, tb[1] + 142, 'REV', 'tq', 'start') + T(tb[0] + 290, tb[1] + 178, d.rev, 'tpn', 'middle');
  o += T(tb[0] + 344, tb[1] + 142, `NHA ${d.nha}`, 'tq', 'start') + T(tb[0] + 344, tb[1] + 164, `SCALE ${v.scale} · SHEET 1 OF 1`, 'tq', 'start') + T(tb[0] + 344, tb[1] + 186, `MODEL ${D.solid ? D.solid.hash : D.hash(D.params())}`, 'tq', 'start');

  // styles are scoped to .sheet: an inline <style> applies to the whole page
  return `<svg class="sheet" viewBox="0 0 1700 1100" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(`${d.pn} ${d.title} drawing sheet`)}"><style>
.sheet .paper{fill:#fbfaf6}.sheet .bd{fill:none;stroke:#1d2430;stroke-width:2}.sheet .ln,.sheet .pt{fill:none;stroke:#1d2430;stroke-width:2.4}.sheet .ex,.sheet .dl,.sheet .ld{stroke:#1d2430;stroke-width:1.1;fill:none}
.sheet .cl{stroke:#1d2430;stroke-width:1;stroke-dasharray:22 5 4 5}.sheet path.hd{fill:none}.sheet .hd{stroke:#1d2430;stroke-width:1.2;stroke-dasharray:8 6}.sheet .ar{fill:#1d2430}.sheet .fcf{fill:#fbfaf6;stroke:#1d2430;stroke-width:1.2}
.sheet text{font-family:ui-monospace,Menlo,Consolas,monospace;fill:#1d2430}.sheet .tx{font-size:17px}.sheet .tn{font-size:15px}.sheet .tn2{font-size:13px}.sheet .tq{font-size:13px;letter-spacing:.06em}.sheet .vt{font-size:16px;font-weight:600;letter-spacing:.1em}
.sheet .tt{font-size:20px;font-weight:600}.sheet .tpn{font-size:30px;font-weight:700}.sheet .stamp{font-size:15px;font-weight:700;fill:#a3361f}
.sheet .hl .pt,.sheet .hl .ln,.sheet .hl .dl,.sheet .hl .ex,.sheet .hl .ld,.sheet .hl .hd{stroke:#e8892c;stroke-width:3}.sheet .hl .ar{fill:#e8892c}.sheet .hl text{fill:#b85a0e}.sheet [data-feat]{cursor:pointer}.sheet .feat circle.pt{pointer-events:all}.sheet g.dim text{pointer-events:bounding-box}
</style>${o}</svg>`;
}
