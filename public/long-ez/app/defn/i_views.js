// Block I drawing views: envelope projections for the bought-in parts, harness projections with the wire list, and the
// installations (firewall face and the hardware table; support stations). Signature (k, D) as site/defn/sheet.js.
import { primView } from './d_prims.js';
import { WIRES, pinOf } from '../systems.js';
import * as LY from '../parts/wpI0_layout.js';
import { CLAMPS } from '../parts/wp12_routing.js';
import { P_ } from '../parts/wpI1_power.js';

const fx = (x, n = 2) => (Number.isFinite(x) ? x.toFixed(n) : '—');
/** a primitive view with a compact wire table under it (up to 4 columns) */
const harnessView = (pn, opts) => (k, D) => {
  const v = primView(P_[pn], { ...opts, notes: [] })(k, D), { T, L } = k, ws = WIRES.filter((x) => [].concat(x.harness).includes(pn));
  const cols = 3, per = Math.ceil(ws.length / cols), lh = Math.min(14, Math.floor(300 / Math.max(1, per))), y0 = 785;
  let o = T(40, y0 - 14, `WIRE LIST (${ws.length} WIRES): ID · AWG · FROM → TO · FT — SWEPT ALONG THE ROUTED PATH, CLAMPS PER LEZ-20-100`, 'tn2', 'start') + L(40, y0 - 8, 870, y0 - 8, 'bd');
  ws.forEach((x, i) => { const c = Math.floor(i / per), r = i % per, end = (a) => a.replace(/:T:/, ':');
    o += T(40 + c * 280, y0 + 4 + r * lh, `${x.id} ${x.awg ?? '—'} ${end(x.from)}→${end(x.to)} ${fx(x.len, 1)}`.slice(0, 38), 'tn2', 'start'); });
  return { ...v, svg: v.svg + `<g class="dim" data-feat="bundle">${o}</g>`, bottom: v.bottom };
};
/** hardware table (std, qty, each, description) at (x, y) */
const hwTable = (k, lines, x, y, w = 1000) => { const { T, L } = k; let o = T(x, y - 14, 'HARDWARE', 'vt', 'start') + L(x, y - 8, x + w, y - 8, 'bd');
  lines.forEach((l, i) => { const yy = y + 6 + i * 16; o += T(x, yy, String(l.qty), 'tn2', 'start') + T(x + 40, yy, l.std.slice(0, 40), 'tn2', 'start') + T(x + 380, yy, `${fx(l.each, 4)} lb`, 'tn2', 'start') + T(x + 460, yy, l.desc.slice(0, 50), 'tn2', 'start'); }); return o; };
/** LEZ-24-100: the firewall's aft face (BL across, WL up, 1:2) with the boot, its lanes and the firewall items */
const instView = (k, D) => {
  const { T, L, hdim } = k, S = 25, X = (bl) => 420 + bl * S, Z = (wl) => 560 - (wl - 31) * S;
  let o = `<g data-feat="install" class="feat"><circle class="pt" cx="${X(LY.BOOT.c[0])}" cy="${Z(LY.BOOT.c[1])}" r="${LY.BOOT.r * S}"/></g>`;
  for (const [nm, q] of Object.entries(LY.BOOT.lanes)) { o += `<g data-feat="install" class="feat"><circle class="pt" cx="${X(LY.BOOT.c[0] + q[0])}" cy="${Z(LY.BOOT.c[1] + q[1])}" r="${0.18 * S}"/></g>` ; }
  o += T(X(-6), Z(31.2), `LANES: ${Object.keys(LY.BOOT.lanes).map((n) => n.replace('LEZ-', '')).join(', ')}`, 'tn2', 'start');
  const rect = (c, d, lab) => `<g data-feat="install" class="feat"><rect class="pt" x="${X(c[0] - d[0] / 2)}" y="${Z(c[2] + d[2] / 2)}" width="${d[0] * S}" height="${d[2] * S}"/></g>` + T(X(c[0]), Z(c[2] + d[2] / 2) - 8, lab, 'tq');
  o += rect([LY.K2.c[0], 0, LY.K2.c[2]], [2 * LY.K2.r, 0, LY.K2.h[1] - LY.K2.h[0]], 'K2') + rect(LY.GB2.c, LY.GB2.d, 'GB2') + rect(LY.VR1.c, LY.VR1.d, 'VR1');
  for (const [b, z] of [...LY.FW_LAYOUT.start, ...LY.FW_LAYOUT.gnd, ...LY.FW_LAYOUT.ovr]) o += `<g data-feat="install" class="feat"><circle class="pt" cx="${X(b)}" cy="${Z(z)}" r="${0.0955 * S}"/></g>`;
  o += L(X(0), Z(31), X(0), Z(45), 'cl') + T(X(0), Z(45) - 6, 'BL 0', 'tq');
  o += hdim('install', X(LY.BOOT.c[0] - LY.BOOT.r), X(LY.BOOT.c[0] + LY.BOOT.r), Z(LY.BOOT.c[1] - LY.BOOT.r), Z(LY.BOOT.c[1] - LY.BOOT.r) + 40, `Ø ${fx(2 * LY.BOOT.r)} BOOT AT BL ${fx(LY.BOOT.c[0])}, WL ${fx(LY.BOOT.c[1])}`);
  o += T(40, 640, 'FIREWALL AFT FACE, LOOKING FORWARD · 1:4 (BOOT LANES, K2, GB2, VR1 ON BLOCK A\'S LAYOUT HOLES)', 'vt', 'start');
  o += hwTable(k, D.def.hardware, 40, 700, 840);
  return { svg: o, bottom: 150, scale: '1:4', notesBox: { x: 1180, top: 150, n: 56, bottom: 860 } };
};
/** supports: clamp stations in side view (FS across, WL up, 1:24) and the hardware table */
const supView = (ext) => (k, D) => {
  const { T } = k, S = 3.2, X = (fs) => 60 + fs * S * (ext ? 1 : 1), Z = (wl) => 480 - (wl - 20) * S * 4;
  let o = '';
  for (const c of CLAMPS.filter((q) => !!q.ext === ext)) o += `<g data-feat="install" class="feat"><circle class="pt" cx="${fx(X(c.at[0] * 12), 1)}" cy="${fx(Z(c.at[2] * 12), 1)}" r="3"/></g>`;
  o += T(400, 560, `${ext ? 'CLIPS' : 'CLAMPS'} IN SIDE VIEW (FS ACROSS 0–200, WL UP; WL × 4) · ${CLAMPS.filter((q) => !!q.ext === ext).length} STATIONS`, 'vt');
  o += hwTable(k, D.def.hardware, 40, 640, 840);
  return { svg: o, bottom: 150, scale: 'NTS', notesBox: { x: 1180, top: 150, n: 56, bottom: 860 } };
};
const N = (t, f) => [[t, f]];
export const VIEWS_I = {
  'LEZ-24-110': primView(P_.battery, { notes: N('PC680-CLASS AGM IN A G-10 BOX BOLTED TO 4 POTTED INSERTS IN THE SHELF; 2 STRAPS ROUND THE BOX; VENT TO THE BELLY DRAIN (BLOCK A HOLE)', 'box') }),
  'LEZ-24-120': primView(P_.master, { notes: N('K1 ON A 0.063 ANGLE TO THE WALL PAD; F1 ANL MAIN FEED; F3 ATC ESS ALT FEED', 'contactor') }),
  'LEZ-24-130': primView(P_.bus, { notes: N('6 BREAKERS ON THE SUB-PANEL IN BLOCK B\'S CUT-OUT; FB1 / FB2 FUSE BLOCKS, D1, F2 AND THE BUS BAR ON THE WALL MODULE', 'breaker') }),
  'LEZ-24-140': primView(P_.ground, { notes: N('GB1 ON THE BUS MODULE; GB2 ON THE FIREWALL AT BLOCK A\'S \'GND\' HOLES', 'gb2') }),
  'LEZ-24-150': primView(P_.vr, { notes: N('REGULATOR / OV RELAY ON BLOCK A\'S \'OVR\' HOLES, CONNECTOR AFT', 'body') }),
  'LEZ-80-100': primView(P_.k2, { notes: N('STARTER CONTACTOR ON A CRES ANGLE AT BLOCK A\'S \'START\' HOLES; STUDS UP', 'contactor') }),
  'LEZ-33-100': primView(P_.tips, { titles: ['BOTH LIGHTS, LOOKING AFT (BL ACROSS)', 'SIDE VIEW (FS ACROSS)'], notes: N('LIGHTS INSIDE THE TIP CLOSE-OUTS, LENS FLUSH WITH THE TIP FACE', 'light') }),
  'LEZ-33-120': primView(P_.ldg, { notes: N('PAR-36 LED BEHIND THE NOSE WINDOW', 'light') }),
  ...Object.fromEntries(['LEZ-24-160', 'LEZ-24-161', 'LEZ-24-162', 'LEZ-24-165', 'LEZ-80-110', 'LEZ-33-110'].map((pn) => [pn, harnessView(pn, { titles: ['ROUTE, LOOKING AFT (BL ACROSS)', 'ROUTE, LOOKING INBOARD (FS ACROSS)'], notes: N('SWEPT ALONG THE ROUTED PATH; CLAMP STATIONS PER LEZ-20-100', 'bundle') })])),
  'LEZ-24-100': instView, 'LEZ-20-100': supView(false), 'LEZ-20-110': supView(true),
};
void pinOf;
