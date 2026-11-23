// Block B drawing views (site/defn/sheet.js VIEWS signature: (k, D) → { svg, bottom, scale, notesBox }). Every number is
// read from the record's parameters or its sizing module. Sheet units: 100 per inch at 1:1. Notional.
import { CANF, CAP, canSection, canStations, ohwIn, crownR } from '../parts/wpB1_canopy.js';
import { HINGE } from '../parts/wp4_avionics_cabin.js';
import { CL } from '../parts/canopy_layout.js';

const d2 = (x) => x.toFixed(2).replace(/^0\./, '.').replace(/^-0\./, '-.');
const poly = (pts, X, Y) => `M${pts.map((q) => `${X(q[0]).toFixed(1)} ${Y(q[1]).toFixed(1)}`).join('L')}Z`;
/** a hardware / data table: rows of cells, column widths; returns svg */
export function table(k, x0, y0, title, cw, rows, feat = 'outline') {
  const { L, T } = k, rh = 21, W = cw.reduce((a, b) => a + b, 0);
  let o = `<rect class="bd" x="${x0}" y="${y0}" width="${W}" height="${rh * rows.length + 34}"/>${T(x0 + W / 2, y0 + 20, title, 'tq')}`;
  rows.forEach((r, i) => { let x = x0 + 8; const y = y0 + 50 + i * rh; o += `<g class="dim" data-feat="${r.feat || feat}">${r.cells.map((c, j) => { const s = T(x, y, String(c), i ? 'tn2' : 'tq', 'start'); x += cw[j]; return s; }).join('')}</g>`; if (!i) o += L(x0, y + 6, x0 + W, y + 6, 'bd'); });
  return o;
}

export const VIEWS_B = {
  /** LEZ-56-100 canopy: section at mid length (1:4) and side elevation with the stations (1:16) */
  'LEZ-56-100'(k, D) {
    const { L, T, hdim, vdim, leader } = k, C = crownR(), s = C.s, R = canSection(s, false), S = 20, cx = 370, zr = 42;
    const X = (y) => cx + y * S, Y = (z) => 560 - (z - zr) * S;
    let o = '';
    for (const [key, P] of Object.entries(R)) { const f = key === 'bubble' ? 'bubble' : /^cap/.test(key) ? 'cap' : 'frame'; o += `<g data-feat="${f}" class="feat"><path class="pt" d="${poly(P, X, Y)}"/></g>`; }
    const sill = R.fo_r[0], top = canSection(s, false).bubble[CANF.nB / 2];
    o += L(X(0), Y(C.top) - 30, X(0), Y(sill[1]) + 40, 'cl') + T(X(0) + 8, Y(sill[1]) + 30, 'CL (A)', 'tx', 'start');
    o += hdim('edge', X(-ohwIn(s)), X(ohwIn(s)), Y(sill[1]), Y(sill[1]) + 90, `${d2(2 * ohwIn(s))} AT THE SILLS`);
    o += vdim('bubble', Y(top[1]), Y(sill[1]), X(-ohwIn(s)), X(-ohwIn(s)) - 40, `${d2(C.top - sill[1])}`);
    o += leader('bubble', X(-3), Y(canSection(s, false).bubble[Math.round(CANF.nB * 0.62)][1]), X(-6), Y(C.top) - 40, `${CANF.acrylic} ACRYLIC, R${d2(C.R)} CROWN`);
    o += leader('frame', X(R.core_r[2][0]), Y(R.core_r[2][1]), X(13), Y(sill[1]) - 60, `RAIL ${CANF.railH} ARC:`) + T(X(13) + 46, Y(sill[1]) - 37, `${CANF.faceBID} × 6781 / ${CANF.coreIn} HT61 / ${CANF.faceBID} × 6781`, 'tx', 'start');
    o += leader('cap', X(R.capT_r[0][0]), Y(R.capT_r[0][1]), X(13), Y(sill[1]) - 130, `${CAP.n} × 6781 0/90 × ${CANF.capW} CAPS`);
    o += T(cx, Y(sill[1]) + 135, `SECTION AT FS ${(s * 12).toFixed(1)}, LOOKING FORWARD · 1:5`, 'vt');
    // side elevation 1:16 (6.25 units / in): the crown line, the sill, the bows, hinge span and hooks
    const S2 = 6.25, ox = 830, oz = 330, XF = (fs) => ox + (fs - CANF.bow0[0] * 12) * S2, ZF = (z) => oz - (z - 40) * S2 * 1.0, st = canStations();
    const crown = st.map((x) => [x * 12, canSection(x, x < CANF.bow0[1] || x > CANF.bow1[0])[x < CANF.bow0[1] || x > CANF.bow1[0] ? 'fo' : 'bubble'].reduce((m, q) => Math.max(m, q[1]), -1e9)]);
    const sl = st.map((x) => [x * 12, canSection(x, false).fo_r[0][1]]);
    o += `<g data-feat="bubble" class="feat"><path class="pt" d="M${crown.map((q) => `${XF(q[0]).toFixed(1)} ${ZF(q[1]).toFixed(1)}`).join('L')}L${[...sl].reverse().map((q) => `${XF(q[0]).toFixed(1)} ${ZF(q[1]).toFixed(1)}`).join('L')}Z"/></g>`;
    for (const b of [CANF.bow0, CANF.bow1]) o += `<g data-feat="frame" class="feat">${L(XF(b[0] * 12), ZF(40), XF(b[0] * 12), ZF(57), 'hd')}${L(XF(b[1] * 12), ZF(40), XF(b[1] * 12), ZF(57), 'hd')}</g>`;
    o += `<g data-feat="edge" class="feat">${L(XF(HINGE[0][0] * 12), ZF(HINGE[0][2] * 12) + 14, XF(HINGE[1][0] * 12), ZF(HINGE[1][2] * 12) + 14, 'ln')}</g>` + T((XF(HINGE[0][0] * 12) + XF(HINGE[1][0] * 12)) / 2, ZF(HINGE[0][2] * 12) + 34, 'HINGE (R SILL)', 'tq');
    CL.st.forEach((h) => { o += `<g data-feat="edge" class="feat">${L(XF(h * 12), ZF(40) + 40, XF(h * 12), ZF(40) + 54)}</g>`; });
    o += hdim('frame', XF(CANF.bow0[0] * 12), XF(CANF.bow1[1] * 12), ZF(40) + 60, ZF(40) + 110, `${d2((CANF.bow1[1] - CANF.bow0[0]) * 12)} (FS ${(CANF.bow0[0] * 12).toFixed(1)}–${(CANF.bow1[1] * 12).toFixed(1)})`);
    o += hdim('frame', XF(CANF.bow0[0] * 12), XF(CANF.bow0[1] * 12), ZF(57), ZF(57) - 30, d2((CANF.bow0[1] - CANF.bow0[0]) * 12));
    o += hdim('frame', XF(CANF.bow1[0] * 12), XF(CANF.bow1[1] * 12), ZF(57), ZF(57) - 30, d2((CANF.bow1[1] - CANF.bow1[0]) * 12));
    o += hdim('edge', XF(HINGE[0][0] * 12), XF(HINGE[1][0] * 12), ZF(40) + 60, ZF(40) + 150, `HINGE ${d2((HINGE[1][0] - HINGE[0][0]) * 12)}`);
    o += T(ox + 260, ZF(40) + 235, 'SIDE ELEVATION (RIGHT), HOOK STATIONS TICKED · 1:16', 'vt');
    return { svg: o, bottom: 760, scale: '1:5 / 1:16', notesBox: { x: 40, top: 760, n: 128, bottom: 1072 } };
  },
};

// ------------------------------------------------------------------------------------------- generic primitive views
import { bboxOf } from './blkB_prims.js';
/** project a primitive list onto a view plane: 'side' (FS → right, WL up, looking from the right), 'front' (BL → right,
 *  WL up, looking forward), 'plan' (BL → right, FS down); each primitive drawn as its outline, lit by its group's feature */
const AX = { side: [1, 2], front: [0, 2], plan: [0, 1] };
export function primsView(k, prims, feat, plane, S, ox, oy, title, opt = {}) {
  const { L, T, hdim, vdim } = k, [iu, iv] = AX[plane], b = bboxOf(prims), u0 = b[2 * iu], v1 = plane === 'plan' ? b[2 * iv] : b[2 * iv + 1];
  const U = (u) => ox + (u - u0) * S, V = (v) => (plane === 'plan' ? oy + (v - v1) * S : oy - (v - v1) * S);
  let o = '';
  for (const m of prims) {
    const f = feat[m.g] || m.g;
    if (m.k === 'sph') { o += `<g data-feat="${f}" class="feat"><circle class="pt" cx="${U(m.c[iu]).toFixed(1)}" cy="${V(m.c[iv]).toFixed(1)}" r="${(m.r * S).toFixed(1)}"/></g>`; continue; }
    if (m.k === 'cyl') { const a = [m.a[iu], m.a[iv]], c = [m.b[iu], m.b[iv]], d = [c[0] - a[0], c[1] - a[1]], l = Math.hypot(...d);
      if (l < 1e-6) { o += `<g data-feat="${f}" class="feat"><circle class="pt" cx="${U(a[0]).toFixed(1)}" cy="${V(a[1]).toFixed(1)}" r="${(m.r * S).toFixed(1)}"/></g>`; continue; }
      const n = [-d[1] / l * m.r, d[0] / l * m.r], P = [[a[0] + n[0], a[1] + n[1]], [c[0] + n[0], c[1] + n[1]], [c[0] - n[0], c[1] - n[1]], [a[0] - n[0], a[1] - n[1]]];
      o += `<g data-feat="${f}" class="feat"><path class="pt" d="M${P.map((q) => `${U(q[0]).toFixed(1)} ${V(q[1]).toFixed(1)}`).join('L')}Z"/></g>`; continue; }
    if (m.k === 'ext' && 'xyz'.indexOf(m.ax) === 3 - iu - iv) { o += `<g data-feat="${f}" class="feat"><path class="pt" d="M${m.pts.map((q) => `${U(q[0]).toFixed(1)} ${V(q[1]).toFixed(1)}`).join('L')}Z"/>${(m.holes || []).map((h) => (h.r ? `<circle class="pt" cx="${U(h.c[0]).toFixed(1)}" cy="${V(h.c[1]).toFixed(1)}" r="${(h.r * S).toFixed(1)}"/>` : `<path class="pt" d="M${h.pts.map((q) => `${U(q[0]).toFixed(1)} ${V(q[1]).toFixed(1)}`).join('L')}Z"/>`)).join('')}</g>`; continue; }
    const q = bboxOf([m]); o += `<g data-feat="${f}" class="feat"><rect class="pt" x="${Math.min(U(q[2 * iu]), U(q[2 * iu + 1])).toFixed(1)}" y="${Math.min(V(q[2 * iv]), V(q[2 * iv + 1])).toFixed(1)}" width="${(Math.abs(q[2 * iu + 1] - q[2 * iu]) * S).toFixed(1)}" height="${(Math.abs(q[2 * iv + 1] - q[2 * iv]) * S).toFixed(1)}"/></g>`;
  }
  const uA = U(b[2 * iu]), uB = U(b[2 * iu + 1]), vA = V(b[2 * iv]), vB = V(b[2 * iv + 1]), top = Math.min(vA, vB), bot = Math.max(vA, vB), df = opt.feat || Object.values(feat)[0];
  if (!opt.noDims) {
    o += hdim(df, uA, uB, bot, bot + 40, `${(b[2 * iu + 1] - b[2 * iu]).toFixed(2)}${opt.uLabel ? ` ${opt.uLabel}` : ''}`);
    o += vdim(df, top, bot, uB, uB + 40, `${(b[2 * iv + 1] - b[2 * iv]).toFixed(2)}`);
  }
  o += T((uA + uB) / 2, bot + 82, title, 'vt');
  return { svg: o, box: [uA, top, uB, bot] };
}
/** a sheet of one to three projections at one scale plus a feature table */
export function primsSheet(views, scaleLabel, tableRows, opts = {}) {
  return (k, D) => {
    const p = D.params(), feat = p.feat || {};
    let o = '';
    for (const v of views) o += primsView(k, p.prims, feat, v.plane, v.S, v.x, v.y, v.title, { feat: D.def.features[0].id, ...v }).svg;
    if (tableRows) o += table(k, opts.tx ?? 1000, opts.ty ?? 140, opts.tt || 'FEATURES', opts.cw || [90, 560], [{ cells: ['ID', 'FEATURE'] }, ...tableRows(D).map((r) => ({ feat: r[0], cells: r }))]);
    return { svg: o, bottom: opts.bottom ?? 700, scale: scaleLabel, notesBox: { x: 40, top: opts.bottom ?? 700, n: 128, bottom: 1072 } };
  };
}
const wrapRows = (D, n = 70) => D.def.features.flatMap((f) => { const w = f.label.split(' '), out = []; let line = ''; for (const x of w) { if ((line + ' ' + x).trim().length > n) { out.push(line.trim()); line = x; } else line += ' ' + x; } if (line.trim()) out.push(line.trim()); return out.map((l, i) => [i ? '' : f.id, l]); });
export { wrapRows };
Object.assign(VIEWS_B, {
  'LEZ-56-110': primsSheet([{ plane: 'side', S: 25, x: 80, y: 220, title: 'SIDE ELEVATION, FROM OUTBOARD · 1:4', uLabel: '(FS 68.0–96.0)' }, { plane: 'front', S: 200, x: 300, y: 380, title: 'END VIEW, LOOKING FORWARD · 2:1' }],
    '1:4 / 2:1', (D) => wrapRows(D), { tx: 900, ty: 420, bottom: 760 }),
  'LEZ-56-120': primsSheet([{ plane: 'front', S: 50, x: 120, y: 200, title: 'VIEW LOOKING FORWARD (CLOSED) · 1:2' }, { plane: 'side', S: 50, x: 640, y: 200, title: 'SIDE VIEW FROM INBOARD · 1:2' }],
    '1:2', (D) => wrapRows(D, 60), { tx: 960, ty: 140, cw: [90, 500], bottom: 760 }),
  'LEZ-56-130': primsSheet([{ plane: 'front', S: 20, x: 140, y: 120, title: 'VIEW LOOKING FORWARD, TAUT AT 80° · 1:5' }],
    '1:5', (D) => wrapRows(D, 60), { tx: 960, ty: 140, cw: [90, 500], bottom: 820 }),
});
/** an installation sheet: the hardware table and the record's features (rigging) as a second table */
export function installSheet(title2) {
  return (k, D) => {
    const d = D.def, rows = [{ cells: ['FN', 'PART', 'QTY', 'DESCRIPTION'] }, ...d.hardware.map((l, i) => ({ cells: [i + 1, l.std.length > 28 ? l.std.slice(0, 27) + '…' : l.std, l.qty, l.desc.length > 60 ? l.desc.slice(0, 59) + '…' : l.desc] }))];
    let o = table(k, 60, 130, `HARDWARE (QTY ${d.qty} PER AIRCRAFT)`, [50, 270, 50, 560], rows);
    const y2 = 130 + 21 * rows.length + 80;
    o += table(k, 60, y2, title2, [90, 840], [{ cells: ['ID', 'REQUIREMENT'] }, ...wrapRows(D, 105).map((r) => ({ feat: r[0] || 'rig', cells: r }))]);
    o += table(k, 1040, y2, 'DETAIL PARTS SHOWN', [140, 460], [{ cells: ['PN', ''] }, ...D.shows.map((pn) => ({ cells: [pn, ''] }))]);
    return { svg: o, bottom: 760, scale: 'NONE (TABLES)', notesBox: { x: 40, top: 760, n: 128, bottom: 1072 } };
  };
}
Object.assign(VIEWS_B, {
  'LEZ-52-110': primsSheet([{ plane: 'side', S: 50, x: 120, y: 200, title: 'SIDE VIEW FROM INBOARD, LOCKED · 1:2' }, { plane: 'front', S: 50, x: 640, y: 200, title: 'VIEW LOOKING FORWARD · 1:2' }], '1:2', (D) => wrapRows(D, 60), { tx: 960, ty: 420, cw: [90, 500], bottom: 760 }),
  'LEZ-52-120': primsSheet([{ plane: 'side', S: 6.25, x: 80, y: 260, title: 'SIDE VIEW FROM INBOARD, LOCKED · 1:16' }, { plane: 'front', S: 50, x: 480, y: 420, title: 'VIEW LOOKING FORWARD · 1:2' }], '1:16 / 1:2', (D) => wrapRows(D, 60), { tx: 960, ty: 420, cw: [90, 500], bottom: 760 }),
  'LEZ-52-130': primsSheet([{ plane: 'side', S: 100, x: 80, y: 200, title: 'HOOK 1 FROM INBOARD · 1:1' }, { plane: 'plan', S: 100, x: 640, y: 150, title: 'PLAN · 1:1' }], '1:1', (D) => wrapRows(D, 60), { tx: 960, ty: 420, cw: [90, 500], bottom: 780 }),
  'LEZ-52-140': primsSheet([{ plane: 'front', S: 100, x: 200, y: 200, title: 'VIEW LOOKING FORWARD · 1:1' }, { plane: 'side', S: 100, x: 560, y: 200, title: 'SIDE VIEW · 1:1' }], '1:1', (D) => wrapRows(D, 60), { tx: 960, ty: 420, cw: [90, 500], bottom: 760 }),
  'LEZ-52-150': primsSheet([{ plane: 'side', S: 200, x: 200, y: 220, title: 'FROM OUTBOARD · 2:1' }, { plane: 'front', S: 200, x: 640, y: 220, title: 'SECTION LOOKING FORWARD · 2:1' }], '2:1', (D) => wrapRows(D, 60), { tx: 960, ty: 420, cw: [90, 500], bottom: 760 }),
  'LEZ-52-100': installSheet('RIGGING AND INSPECTION'),
});
import { PNL, PANEL, CUTS, HOLES, CRANK, DECLARED } from '../parts/wpB3_panel.js';
import { cutSize, cutCentre } from './blkB_panel.js';
VIEWS_B['LEZ-31-100'] = (k, D) => {
  const { L, T, hdim, vdim } = k, S = 25, ox = 380, oz = 470, X = (y) => ox + y * S, Z = (z) => oz - (z - 33) * S;
  let o = `<g data-feat="panel" class="feat"><path class="pt" d="${poly(PANEL.pts, X, Z)}"/></g>`;
  for (const C of CUTS) { const c = cutCentre(C);
    o += `<g data-feat="${C.id}" class="feat">${C.rect ? `<rect class="pt" x="${X(C.rect[0])}" y="${Z(C.rect[3])}" width="${(C.rect[1] - C.rect[0]) * S}" height="${(C.rect[3] - C.rect[2]) * S}"/>` : `<circle class="pt" cx="${X(C.circ[0])}" cy="${Z(C.circ[1])}" r="${C.circ[2] * S}"/>`}</g>`;
    o += `<g class="dim" data-feat="${C.id}">${T(X(c[0]), Z(c[1]) + 5, C.id.toUpperCase(), 'tq')}</g>`; }
  for (const h of HOLES.holes) o += `<g data-feat="pass" class="feat"><circle class="pt" cx="${X(h.y).toFixed(1)}" cy="${Z(h.z).toFixed(1)}" r="${(h.r * S).toFixed(1)}"/>${L(X(h.y) - h.r * S - 5, Z(h.z), X(h.y) + h.r * S + 5, Z(h.z), 'cl')}</g>`;
  // rev C: each hole's ID beside it, the first spot (above, below, outboard, inboard) clear of every hole, cut-out and label
  { const boxes = [...HOLES.holes.map((h) => [X(h.y) - h.r * S, X(h.y) + h.r * S, Z(h.z) - h.r * S, Z(h.z) + h.r * S]), ...CUTS.map((C) => (C.rect ? [X(C.rect[0]), X(C.rect[1]), Z(C.rect[3]), Z(C.rect[2])] : [X(C.circ[0] - C.circ[2]), X(C.circ[0] + C.circ[2]), Z(C.circ[1] + C.circ[2]), Z(C.circ[1] - C.circ[2])]))], hit = (b) => boxes.some((q) => b[0] < q[1] && b[1] > q[0] && b[2] < q[3] && b[3] > q[2]);
    let lab = '';
    for (const h of HOLES.holes) { const x = X(h.y), z = Z(h.z), R = h.r * S, w = 7 * h.id.length + 4, sg = Math.sign(h.y) || 1;
      const cand = [[x, z - R - 4], [x, z + R + 12], [x + sg * (R + 4 + w / 2), z + 4], [x - sg * (R + 4 + w / 2), z + 4], [x + sg * (R + w / 2), z - R - 6], [x - sg * (R + w / 2), z + R + 14]];
      const p = cand.find(([cx, cz]) => !hit([cx - w / 2, cx + w / 2, cz - 10, cz + 1])) || cand[0];
      boxes.push([p[0] - w / 2, p[0] + w / 2, p[1] - 10, p[1] + 1]); lab += T(p[0], p[1], h.id, 'tn2'); }
    o += `<g class="dim" data-feat="pass">${lab}</g>`; }
  o += `<g data-feat="pass" class="feat"><circle class="hd" cx="${X(CRANK.c[0])}" cy="${Z(CRANK.c[1])}" r="${CRANK.sweep * S}" fill="none"/></g>`;
  o += L(X(0), Z(PANEL.top) - 20, X(0), Z(33) + 20, 'cl');
  const yS = PANEL.ySill;
  o += hdim('panel', X(-yS), X(yS), Z(33), Z(33) + 50, `${(2 * yS).toFixed(2)} AT WL ${PANEL.zSill.toFixed(2)} (SILLS)`);
  o += vdim('panel', Z(PANEL.top), Z(33), X(yS), X(yS) + 40, `${(PANEL.top - 33).toFixed(2)}`);
  o += T(ox, Z(33) + 110, `AFT FACE (FS ${PNL.aft.toFixed(2)}), LOOKING FORWARD · 1:4 · CRANK SWEEP DASHED`, 'vt');
  const rows = [{ cells: ['ID', 'SIZE', 'CENTRE BL, WL', 'FITS'] }, ...CUTS.map((C) => { const c = cutCentre(C); return { feat: C.id, cells: [C.id.toUpperCase(), cutSize(C), `${c[0].toFixed(2)}, ${c[1].toFixed(2)}`, C.pn] }; })];
  o += table(k, 800, 140, 'CUT-OUTS (THE LAYOUT; EQUIPMENT MATCHES IT)', [70, 140, 160, 130], rows);
  const hr = [{ cells: ['ID', 'Ø', 'BL, WL', 'FOR'] }, ...HOLES.holes.map((h) => ({ feat: 'pass', cells: [h.id, (2 * h.r).toFixed(3), `${h.y.toFixed(2)}, ${h.z.toFixed(2)}`, h.what.length > 34 ? h.what.slice(0, 33) + '…' : h.what] }))];
  o += table(k, 800, 380, DECLARED.length ? `PASS-THROUGH HOLES (${DECLARED.map((d) => d.id).join(', ')} DECLARED FOR RE-ROUTES)` : 'PASS-THROUGH HOLES (EACH OVER ITS LINES\' SWEPT FOOTPRINT, REV C)', [70, 70, 130, 340], hr);
  return { svg: o, bottom: 760, scale: '1:4', notesBox: { x: 40, top: 760, n: 128, bottom: 1072 } };
};
Object.assign(VIEWS_B, {
  'LEZ-25-100': primsSheet([{ plane: 'side', S: 6.25, x: 80, y: 260, title: 'SIDE VIEW · 1:16' }, { plane: 'plan', S: 6.25, x: 640, y: 140, title: 'PLAN (FWD UP) · 1:16' }], '1:16', (D) => wrapRows(D, 60), { tx: 960, ty: 420, cw: [90, 500], bottom: 820 }),
  'LEZ-25-110': primsSheet([{ plane: 'plan', S: 12.5, x: 120, y: 150, title: 'PLAN (FWD UP) · 1:8' }], '1:8', (D) => wrapRows(D, 60), { tx: 960, ty: 140, cw: [90, 500], bottom: 820 }),
  'LEZ-25-120': primsSheet([{ plane: 'side', S: 12.5, x: 100, y: 160, title: 'SIDE VIEW · 1:8' }, { plane: 'front', S: 12.5, x: 520, y: 160, title: 'VIEW LOOKING FORWARD · 1:8' }], '1:8', (D) => wrapRows(D, 60), { tx: 960, ty: 420, cw: [90, 500], bottom: 820 }),
  'LEZ-25-121': primsSheet([{ plane: 'side', S: 12.5, x: 100, y: 160, title: 'SIDE VIEW · 1:8' }, { plane: 'front', S: 12.5, x: 560, y: 160, title: 'VIEW LOOKING FORWARD · 1:8' }], '1:8', (D) => wrapRows(D, 60), { tx: 960, ty: 420, cw: [90, 500], bottom: 820 }),
  'LEZ-25-130': primsSheet([{ plane: 'side', S: 12.5, x: 100, y: 160, title: 'SIDE VIEW, FRONT SET · 1:8' }, { plane: 'front', S: 12.5, x: 520, y: 160, title: 'VIEW LOOKING FORWARD · 1:8' }], '1:8', (D) => wrapRows(D, 60), { tx: 960, ty: 420, cw: [90, 500], bottom: 820 }),
  'LEZ-25-140': primsSheet([{ plane: 'plan', S: 12.5, x: 120, y: 150, title: 'PLAN (FWD UP) · 1:8' }, { plane: 'side', S: 12.5, x: 520, y: 150, title: 'SIDE VIEW · 1:8' }], '1:8', (D) => wrapRows(D, 60), { tx: 960, ty: 420, cw: [90, 500], bottom: 820 }),
  'LEZ-25-150': primsSheet([{ plane: 'front', S: 12.5, x: 140, y: 150, title: 'VIEW LOOKING FORWARD · 1:8' }], '1:8', (D) => wrapRows(D, 60), { tx: 960, ty: 140, cw: [90, 500], bottom: 820 }),
});
