// sysdrawing.js — generated drawings for system parts: tube / hose bend data (XYZ and LRA), harness wire lists with
// pin-to-pin connections, weldment cut lists and jig coordinates, dimensioned primitives for machined / laminate
// parts, and source-control sheets (envelope, ports, connector pinouts) for bought-in items. Units: inches,
// aircraft coordinates FS / BL / WL (model frame). Every sheet is marked notional, not for construction.
import { PARTS, EQUIP, WIRES, ATA, partByPN, partMass, hardwareOf, pinOf, portOf, V3 } from './systems.js';

const { sub, len, dot } = V3;
const IN = (v) => v.map((x) => x * 12);
const f = (x, n = 2) => (Number.isFinite(x) ? x.toFixed(n) : '—');
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const W = 1100, M = 24, LINE = 15;

/** simple SVG table; returns { svg, h } */
function table(x, y, cols, rows, title) {
  const tw = cols.reduce((a, c) => a + c.w, 0);
  let s = title ? `<text x="${x}" y="${y - 6}" class="th">${esc(title)}</text>` : '';
  s += `<rect x="${x}" y="${y}" width="${tw}" height="${LINE * (rows.length + 1) + 4}" class="tb"/>`;
  let cx = x;
  for (const c of cols) { s += `<text x="${cx + 4}" y="${y + 12}" class="hd">${esc(c.h)}</text>`; cx += c.w; }
  s += `<line x1="${x}" y1="${y + LINE + 1}" x2="${x + tw}" y2="${y + LINE + 1}" class="tl"/>`;
  rows.forEach((r, i) => {
    let cx2 = x; const yy = y + LINE * (i + 2);
    for (const [k, c] of cols.entries()) { const v = String(r[k] ?? ''), max = Math.floor((c.w - 6) / 6.1); s += `<text x="${cx2 + 4}" y="${yy}" class="td">${esc(v.length > max ? `${v.slice(0, max - 1)}…` : v)}</text>`; cx2 += c.w; }
  });
  return { svg: s, h: LINE * (rows.length + 1) + 4 };
}
/** orthographic view of point sets / segments in two aircraft axes, scaled into a box; returns svg */
function view(x, y, w, h, title, items, ax) {
  const pts = items.flatMap((it) => it.pts.map((p) => [p[ax[0]] * 12, p[ax[1]] * 12]));
  if (!pts.length) return '';
  const lo = [Math.min(...pts.map((p) => p[0])), Math.min(...pts.map((p) => p[1]))], hi = [Math.max(...pts.map((p) => p[0])), Math.max(...pts.map((p) => p[1]))];
  const span = [Math.max(hi[0] - lo[0], 1), Math.max(hi[1] - lo[1], 1)], k = Math.min((w - 70) / span[0], (h - 50) / span[1]);
  const X = (p) => x + 40 + (p[0] - lo[0]) * k, Y = (p) => y + h - 30 - (p[1] - lo[1]) * k;
  const name = ['FS', 'BL', 'WL'];
  let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" class="vw"/><text x="${x + 6}" y="${y + 14}" class="th">${esc(title)}</text>`;
  for (const it of items) {
    const P = it.pts.map((p) => [p[ax[0]] * 12, p[ax[1]] * 12]);
    if (it.kind === 'box') { const [a, b] = P; s += `<rect x="${Math.min(X(a), X(b))}" y="${Math.min(Y(a), Y(b))}" width="${Math.abs(X(b) - X(a))}" height="${Math.abs(Y(b) - Y(a))}" class="sh"/>`; }
    else s += `<polyline points="${P.map((p) => `${X(p).toFixed(1)},${Y(p).toFixed(1)}`).join(' ')}" class="${it.kind === 'tube' ? 'tu' : 'sh'}"/>`;
    if (it.labels) P.forEach((p, i) => { s += `<circle cx="${X(p)}" cy="${Y(p)}" r="2.2" class="nd"/><text x="${X(p) + 4}" y="${Y(p) - 4}" class="lb">${esc(it.labels[i])}</text>`; });
  }
  // overall extents
  s += `<line x1="${X(lo)}" y1="${y + h - 14}" x2="${X(hi)}" y2="${y + h - 14}" class="dm" marker-start="url(#ar)" marker-end="url(#ar)"/><text x="${(X(lo) + X(hi)) / 2}" y="${y + h - 17}" class="dt" text-anchor="middle">${f(span[0])} (${name[ax[0]]} ${f(lo[0], 1)}–${f(hi[0], 1)})</text>`;
  s += `<line x1="${x + 18}" y1="${Y(lo)}" x2="${x + 18}" y2="${Y(hi)}" class="dm" marker-start="url(#ar)" marker-end="url(#ar)"/><text x="${x + 14}" y="${(Y(lo) + Y(hi)) / 2}" class="dt" transform="rotate(-90 ${x + 14} ${(Y(lo) + Y(hi)) / 2})" text-anchor="middle">${f(span[1])} (${name[ax[1]]} ${f(lo[1], 1)}–${f(hi[1], 1)})</text>`;
  return s;
}
/** bend data for a polyline: XYZ points, straight lengths, bend angles, rotations (LRA) and developed length */
export function bendData(pts, odIn, clrFactor = 3) {
  const P = pts.map(IN), CLR = clrFactor * odIn, segs = [], bends = [];
  for (let i = 1; i < P.length; i++) segs.push(sub(P[i], P[i - 1]));
  for (let i = 1; i < segs.length; i++) {
    const a = segs[i - 1], b = segs[i], c = Math.min(1, Math.max(-1, dot(a, b) / (len(a) * len(b)))), A = Math.acos(c);
    let R = 0;
    if (i > 1) { const n0 = cross(segs[i - 2], a), n1 = cross(a, b); if (len(n0) > 1e-6 && len(n1) > 1e-6) { R = Math.acos(Math.min(1, Math.max(-1, dot(n0, n1) / (len(n0) * len(n1))))); if (dot(cross(n0, n1), a) < 0) R = -R; } }
    bends.push({ A: A * 180 / Math.PI, R: R * 180 / Math.PI, tan: CLR * Math.tan(A / 2), arc: CLR * A });
  }
  const straights = segs.map((s, i) => len(s) - (i > 0 ? bends[i - 1].tan : 0) - (i < bends.length ? bends[i].tan : 0));
  const dev = straights.reduce((a, b) => a + b, 0) + bends.reduce((a, b) => a + b.arc, 0);
  return { P, segs, bends, straights, dev, CLR };
}
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

function primItems(p) {
  const out = [];
  for (const g of p.geo) {
    if (g.t === 'box') out.push({ kind: 'box', pts: [[g.c[0] - g.d[0] / 2, g.c[1] - g.d[1] / 2, g.c[2] - g.d[2] / 2], [g.c[0] + g.d[0] / 2, g.c[1] + g.d[1] / 2, g.c[2] + g.d[2] / 2]] });
    else if (g.t === 'cyl') out.push({ kind: 'line', pts: [g.a, g.b] });
    else if (g.t === 'sphere') out.push({ kind: 'line', pts: [g.c, g.c] });
    else if (g.t === 'frame') for (const [a, b] of g.members) out.push({ kind: 'line', pts: [g.nodes[a], g.nodes[b]] });
    else if (g.t === 'path') out.push({ kind: 'tube', pts: g.pts });
    else if (g.t === 'obox') { const q = (g.pitch || 0) * Math.PI / 180, ax = [Math.sin(q) * g.d[2] / 2, 0, Math.cos(q) * g.d[2] / 2]; out.push({ kind: 'line', pts: [[g.c[0] - ax[0], g.c[1], g.c[2] - ax[2]], [g.c[0] + ax[0], g.c[1], g.c[2] + ax[2]]] }); }
    else if (g.t === 'loft') for (let k = 0; k < g.secs[0].length; k++) out.push({ kind: 'tube', pts: g.secs.map((q) => q[k]) });
    else if (g.t === 'xpoly') { const y = (g.y0 + g.y1) / 2; out.push({ kind: 'tube', pts: [...g.pts, g.pts[0]].map(([s, z]) => [s, y, z]) }); }
    else if (g.t === 'torus' || g.t === 'gear') { const r = g.t === 'torus' ? g.R + g.r : g.rp, ax = g.axis, a = Math.abs(ax[1]) > 0.9 ? [[1, 0, 0], [0, 0, 1]] : Math.abs(ax[0]) > 0.9 ? [[0, 1, 0], [0, 0, 1]] : [[1, 0, 0], [0, 1, 0]]; out.push({ kind: 'tube', pts: Array.from({ length: 25 }, (_, k) => { const t = k / 24 * 2 * Math.PI; return [0, 1, 2].map((i) => g.c[i] + r * (Math.cos(t) * a[0][i] + Math.sin(t) * a[1][i])); }) }); }
  }
  return out;
}
function primRows(p) {
  const rows = [];
  p.geo.forEach((g, i) => {
    const n = `${i + 1}`, c = (v) => IN(v).map((x) => f(x, 1)).join(' / ');
    if (g.t === 'box') rows.push([n, 'block / plate', `${f(g.d[0] * 12)} × ${f(g.d[1] * 12)} × ${f(g.d[2] * 12)}`, c(g.c), g.mat || p.material || '']);
    else if (g.t === 'cyl') rows.push([n, g.wall ? 'tube' : 'cylinder', `Ø ${f(g.r * 24)}${g.wall ? ` × ${g.wall} wall` : ''} × ${f(len(sub(g.b, g.a)) * 12)} long`, `${c(g.a)} → ${c(g.b)}`, g.mat || p.material || '']);
    else if (g.t === 'sphere') rows.push([n, 'fitting', `Ø ${f(g.r * 24)}`, c(g.c), p.material || '']);
    else if (g.t === 'obox') rows.push([n, `inclined block, axis ${f(-(g.pitch || 0), 1)}° from vertical`, `${f(g.d[0] * 12)} × ${f(g.d[1] * 12)} × ${f(g.d[2] * 12)} long`, c(g.c), g.mat || p.material || '']);
    else if (g.t === 'torus') rows.push([n, 'tyre / ring', `Ø ${f((g.R + g.r) * 24)} × ${f(g.r * 24)} section`, c(g.c), g.mat || p.material || '']);
    else if (g.t === 'gear') rows.push([n, `gear, ${g.teeth} teeth`, `pitch Ø ${f(g.rp * 24)} × ${f(g.w * 12)} face`, c(g.c), g.mat || p.material || '']);
    else if (g.t === 'xpoly') rows.push([n, `profiled plate, ${g.pts.length}-point outline${(g.holes || []).length ? `, ${g.holes.length} lightening holes` : ''}`, `${f((g.y1 - g.y0) * 12)} thick`, `BL ${f((g.y0 + g.y1) * 6)}`, g.mat || p.material || '']);
    else if (g.t === 'loft') rows.push([n, 'lofted section (outline)', `${g.secs.length} sections, ${f(len(sub(g.secs.at(-1)[0], g.secs[0][0])) * 12)} long`, `${c(g.secs[0][0])} → ${c(g.secs.at(-1)[0])}`, g.mat || p.material || '']);
    else if (g.t === 'frame') rows.push([n, 'welded frame', `${g.members.length} tubes, see cut list`, '', g.mat || '']);
    else if (g.t === 'path') rows.push([n, g.cls ? `${g.cls} run` : 'run', `Ø ${g.dIn}${g.wallIn ? ` × ${g.wallIn}` : ''}, ${f(len(sub(g.pts[g.pts.length - 1], g.pts[0])) * 12)} end-to-end`, `${c(g.pts[0])} → ${c(g.pts[g.pts.length - 1])}`, p.material || '']);
  });
  return rows;
}
function frame(p, body, h, kindLabel) {
  const mm = partMass(p), tb = 290, y0 = h - 120;
  const css = `<style>.th{font:600 12px Inter,Arial;fill:#111}.hd{font:600 10px Inter,Arial;fill:#111}.td{font:10px ui-monospace,Menlo,monospace;fill:#111}.tb{fill:none;stroke:#111;stroke-width:.8}.tl{stroke:#111;stroke-width:.6}.vw{fill:none;stroke:#999;stroke-width:.6}.sh{fill:#e9eef4;stroke:#223;stroke-width:1}.tu{fill:none;stroke:#1f5fa8;stroke-width:2.2}.nd{fill:#c0392b}.lb{font:9px ui-monospace,monospace;fill:#c0392b}.dm{stroke:#444;stroke-width:.7}.dt{font:9px Inter,Arial;fill:#333}.nt{font:10px Inter,Arial;fill:#111}.big{font:700 15px Inter,Arial;fill:#111}.warn{font:700 10px Inter,Arial;fill:#b03a2e}</style>`;
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${h}" width="${W}" height="${h}" style="background:#fff">${css}<defs><marker id="ar" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#444"/></marker></defs>`;
  s += `<rect x="8" y="8" width="${W - 16}" height="${h - 16}" fill="none" stroke="#111" stroke-width="1.4"/>`;
  s += body;
  // title block
  const x0 = W - 8 - tb * 1.6;
  s += `<rect x="${x0}" y="${y0}" width="${tb * 1.6}" height="112" fill="#fff" stroke="#111"/>`;
  s += `<text x="${x0 + 8}" y="${y0 + 18}" class="big">${esc(p.pn)}  REV A</text><text x="${x0 + 8}" y="${y0 + 34}" class="nt">${esc(p.name.slice(0, 80))}</text>`;
  s += `<text x="${x0 + 8}" y="${y0 + 50}" class="nt">${esc(kindLabel)} · ATA ${p.ata} ${esc(ATA[p.ata] || '')} · QTY/AC ${p.qty}${p.nha ? ` · NHA ${p.nha}` : ''}</text>`;
  s += `<text x="${x0 + 8}" y="${y0 + 66}" class="nt">MATERIAL / SPEC: ${esc((p.std || p.material || (p.scd ? 'per this source-control drawing' : '—')).slice(0, 88))}</text>`;
  s += `<text x="${x0 + 8}" y="${y0 + 82}" class="nt">MASS ${f(mm.m / p.qty, 2)} lb each (${esc(String(mm.from).slice(0, 28))}) · UNITS in · FS / BL / WL model frame · SCALE NTS</text>`;
  s += `<text x="${x0 + 8}" y="${y0 + 100}" class="warn">NOTIONAL — PUBLIC-DATA DESIGN STUDY — NOT FOR CONSTRUCTION</text>`;
  return `${s}</svg>`;
}
function notes(x, y, list) { return list.map((n, i) => `<text x="${x}" y="${y + i * 14}" class="nt">${i + 1}. ${esc(n)}</text>`).join(''); }

// ------------------------------------------------------------------------------------------- sheets by kind
function lineSheet(p) {
  let body = '', y = 40;
  const runs = p.geo.filter((g) => g.t === 'path');
  body += view(M, y, 520, 230, 'PLAN (FS × BL)', runs.map((g, i) => ({ kind: 'tube', pts: g.pts, labels: g.pts.map((_, k) => `${i + 1}.${k}`) })), [0, 1]);
  body += view(M + 540, y, 520, 230, 'ELEVATION (FS × WL)', runs.map((g, i) => ({ kind: 'tube', pts: g.pts, labels: g.pts.map((_, k) => `${i + 1}.${k}`) })), [0, 2]);
  y += 260;
  runs.forEach((g, i) => {
    const hose = /hose/i.test(p.material || '') || !g.wallIn, bd = bendData(g.pts, g.dIn, hose ? 4 : 3);
    const ends = (g.ends || []).map((r) => { const q = portOf(r); return `${r}${q && q.fit ? ` (${q.fit})` : ''}`; });
    const rowsX = bd.P.map((q, k) => [`${i + 1}.${k}`, f(q[0]), f(q[1]), f(q[2]), k === 0 ? 'START' : k === bd.P.length - 1 ? 'END' : `bend ${k}`]);
    const t1 = table(M, y + 16, [{ h: 'Point', w: 50 }, { h: 'FS', w: 70 }, { h: 'BL', w: 70 }, { h: 'WL', w: 70 }, { h: '', w: 60 }], rowsX, `RUN ${i + 1} — ${hose ? `hose Ø${g.dIn} in` : `tube ${g.dIn} × ${g.wallIn} in`} — XYZ (in)`);
    const rowsL = bd.straights.map((L, k) => [`${k + 1}`, f(L), k < bd.bends.length ? f(bd.bends[k].R, 1) : '—', k < bd.bends.length ? f(bd.bends[k].A, 1) : '—']);
    const t2 = table(M + 340, y + 16, [{ h: 'Seg', w: 40 }, { h: 'L straight', w: 80 }, { h: 'Rot °', w: 60 }, { h: 'Bend °', w: 60 }], rowsL, `LRA, CLR ${f(bd.CLR)} in`);
    const t3 = table(M + 600, y + 16, [{ h: 'End', w: 40 }, { h: 'Port and fitting', w: 300 }, { h: 'End fitting on the line', w: 130 }], ends.map((e, k) => [k ? 'B' : 'A', e, (g.endFit || [])[k] || '']), `ENDS — developed length ${f(bd.dev)} in`);
    body += t1.svg + t2.svg + t3.svg; y += Math.max(t1.h, t2.h, t3.h) + 40;
  });
  body += notes(M, y + 10, [
    `Material: ${p.material || 'per title block'}${/hose/i.test(p.material || '') ? '; hose assemblies built and proof-tested to the hose maker\'s data' : '; 5052-O tube, single 37° flares (AN), no flats > 10 % of OD'}.`,
    'Bend radius not less than the CLR stated; no bend within 1.5 × OD of a flare or fitting.',
    'Support with MS21919 cushioned clamps at ≤ 12 in spacing (tube) / ≤ 18 in (hose); ≥ 1/4 in clear of structure, ≥ 2 in from wiring, ≥ 6 in from exhaust.',
    'Pressure-test the installed line at 1.5 × maximum operating pressure; no leaks.',
  ]);
  return frame(p, body, y + 190, 'TUBE / HOSE ASSEMBLY');
}
function harnessSheet(p) {
  const wires = WIRES.filter((x) => [].concat(x.harness).includes(p.pn));
  let body = '', y = 40;
  const runs = p.geo.filter((g) => g.t === 'path');
  if (runs.length) {
    body += view(M, y, 520, 200, 'ROUTE PLAN (FS × BL)', runs.map((g) => ({ kind: 'tube', pts: g.pts, labels: g.pts.map((_, k) => `${k}`) })), [0, 1]);
    body += view(M + 540, y, 520, 200, 'ROUTE ELEVATION (FS × WL)', runs.map((g) => ({ kind: 'tube', pts: g.pts, labels: g.pts.map((_, k) => `${k}`) })), [0, 2]);
    y += 230;
  }
  const rows = wires.map((x) => { const a = pinOf(x.from), b = pinOf(x.to); return [x.id, x.awg ? `${x.awg}` : '—', x.spec, `${x.from} ${a ? a.name : '?'}`, `${x.to} ${b ? b.name : '?'}`, f(x.len, 1), x.cb ? `${x.cb} A` : '']; });
  const t = table(M, y + 16, [{ h: 'Wire ID', w: 70 }, { h: 'AWG', w: 36 }, { h: 'Spec', w: 190 }, { h: 'From (REF:CONN:PIN signal)', w: 290 }, { h: 'To (REF:CONN:PIN signal)', w: 290 }, { h: 'L ft', w: 44 }, { h: 'Prot.', w: 50 }], rows, `WIRE LIST — ${wires.length} wires`);
  body += t.svg; y += t.h + 40;
  const conns = [...new Set(wires.flatMap((x) => [x.from, x.to]).map((a) => a.split(':').slice(0, 2).join(':')))].sort();
  const crow = conns.map((c) => { const [ref, cn] = c.split(':'), e = EQUIP.find((q) => q.ref === ref); return [c, e ? e.name : '?', e ? e.conns[cn].type : '?', e ? e.pn : '']; });
  const t2 = table(M, y + 16, [{ h: 'Connector', w: 110 }, { h: 'Equipment', w: 300 }, { h: 'Connector type', w: 260 }, { h: 'Part', w: 110 }], crow, 'CONNECTORS AND TERMINATIONS');
  body += t2.svg; y += t2.h + 40;
  body += notes(M, y + 10, [
    'Wire identification per AS50881: ID sleeve at each end and every 15 in; function letters P power, N ground, Q fuel, C control, L lighting, W warning, R radio / audio, D data, E engine instrument, K ignition.',
    'Lengths are measured along the routed harness plus 6 in service loops; cut 3 in long and trim at installation.',
    'Crimp contacts and lugs with calibrated tools; pull-test 1 in 20; solder only on the jack lugs; heat-shrink every splice-free termination.',
    'Shield drains grounded at one end only (AXIS / GSU 25D end); thermocouple extension wire of the matching type, no copper splices.',
    'Bundles laced or tied every 6 in; MS21919 cushioned clamps ≤ 18 in; ≥ 2 in from fuel lines and coax, ≥ 6 in from exhaust unless fire-sleeved and shielded.',
  ]);
  return frame(p, body, y + 210, 'WIRE HARNESS');
}
function cableSheet(p) {
  let body = '', y = 40;
  const runs = p.geo.filter((g) => g.t === 'path');
  body += view(M, y, 520, 220, 'PLAN (FS × BL)', runs.map((g, i) => ({ kind: 'tube', pts: g.pts, labels: g.pts.map((_, k) => `${i + 1}.${k}`) })), [0, 1]);
  body += view(M + 540, y, 520, 220, 'ELEVATION (FS × WL)', runs.map((g, i) => ({ kind: 'tube', pts: g.pts, labels: g.pts.map((_, k) => `${i + 1}.${k}`) })), [0, 2]);
  y += 250;
  const rows = runs.map((g, i) => [`${i + 1}`, f(V3.len(sub(g.pts[g.pts.length - 1], g.pts[0])) * 12), f(g.pts.reduce((a, q, k) => a + (k ? V3.len(sub(q, g.pts[k - 1])) : 0), 0) * 12), g.cls]);
  const t = table(M, y + 16, [{ h: 'Run', w: 50 }, { h: 'End-to-end in', w: 110 }, { h: 'Routed length in', w: 120 }, { h: 'Class', w: 80 }], rows, 'CABLE RUNS');
  body += t.svg; y += t.h + 40;
  body += notes(M, y + 10, [`Cable / conduit: ${p.std || '—'}.`, 'Order or fabricate to the routed length plus end adjustment; check full stop-to-stop travel with cushion at both ends after installation.', 'No bend tighter than the maker\'s minimum radius; clamp every 18 in; no contact with structure through the full control travel.']);
  return frame(p, body, y + 180, 'CABLE ASSEMBLY');
}
function fabSheet(p) {
  let body = '', y = 40;
  const items = primItems(p);
  body += view(M, y, 340, 230, 'PLAN (FS × BL)', items, [0, 1]) + view(M + 360, y, 340, 230, 'SIDE (FS × WL)', items, [0, 2]) + view(M + 720, y, 340, 230, 'FRONT (BL × WL)', items, [1, 2]);
  y += 260;
  const t = table(M, y + 16, [{ h: 'Item', w: 40 }, { h: 'Feature', w: 120 }, { h: 'Size (in)', w: 300 }, { h: 'Location FS / BL / WL (in)', w: 420 }, { h: 'Material', w: 160 }], primRows(p), 'DIMENSIONED FEATURES');
  body += t.svg; y += t.h + 40;
  const fr = p.geo.find((g) => g.t === 'frame');
  if (fr) {
    const cut = fr.members.map(([a, b, od, w], i) => [`${i + 1}`, `${a}–${b}`, `${od} × ${w}`, f(len(sub(fr.nodes[b], fr.nodes[a])) * 12)]);
    const t2 = table(M, y + 16, [{ h: 'Tube', w: 40 }, { h: 'Nodes', w: 90 }, { h: 'OD × wall', w: 100 }, { h: 'Length c-c', w: 90 }], cut, 'CUT LIST (fish-mouth to fit; lengths node to node)');
    const jig = Object.entries(fr.nodes).map(([k, v]) => [k, ...IN(v).map((x) => f(x))]);
    const t3 = table(M + 360, y + 16, [{ h: 'Node', w: 60 }, { h: 'FS', w: 80 }, { h: 'BL', w: 80 }, { h: 'WL', w: 80 }], jig, 'JIG POINTS');
    body += t2.svg + t3.svg; y += Math.max(t2.h, t3.h) + 40;
  }
  if (p.ports) {
    const t4 = table(M, y + 16, [{ h: 'Port', w: 90 }, { h: 'Kind', w: 60 }, { h: 'FS / BL / WL', w: 260 }, { h: 'Fitting', w: 380 }], Object.entries(p.ports).map(([k, q]) => [k, q.kind, IN(q.at).map((x) => f(x)).join(' / '), q.fit || (q.open ? 'open' : '')]), 'PORTS');
    body += t4.svg; y += t4.h + 40;
  }
  const hw = hardwareOf(p);
  if (hw.length) { const t5 = table(M, y + 16, [{ h: 'Qty', w: 40 }, { h: 'Part number', w: 200 }, { h: 'Description', w: 460 }], hw.map((h) => [h.qty, h.std, h.desc]), 'HARDWARE'); body += t5.svg; y += t5.h + 40; }
  const st = (p.steps || []).flatMap((s) => [s.title || s, ...(s.inspect || []).map((x) => `  inspect: ${x}`)]);
  body += notes(M, y + 10, [`Material: ${p.material || (p.kind === 'laminate' ? 'E-glass BID / UNI with epoxy over foam core per the ply-book practice' : 'per title block')}. Break sharp edges 0.02 in; tolerances ±0.03 in unless stated.`, ...st].slice(0, 12));
  return frame(p, body, y + 200, p.kind === 'weldment' ? 'WELDMENT' : p.kind === 'laminate' ? 'LAMINATE PART' : p.kind === 'install' ? 'INSTALLATION' : p.kind === 'mechanism' ? 'ASSEMBLY' : 'MACHINED PART');
}
function cotsSheet(p) {
  let body = '', y = 40;
  const eq = EQUIP.filter((e) => e.pn === p.pn);
  body += `<text x="${M}" y="${y + 6}" class="big">${p.scd ? 'SOURCE-CONTROL DRAWING' : 'STANDARD / VENDOR PART'}</text>`;
  const spec = p.scd ? p.scd.spec : p.std;
  const words = String(spec || '').split(' '); const lines = []; let cur = '';
  for (const w of words) { if ((cur + w).length > 150) { lines.push(cur); cur = ''; } cur += `${w} `; } lines.push(cur);
  body += lines.map((l, i) => `<text x="${M}" y="${y + 28 + i * 14}" class="nt">${esc(l)}</text>`).join(''); y += 40 + lines.length * 14;
  if (p.scd && p.scd.envelope) {
    const [a, b, c] = p.scd.envelope, k = Math.min(140 / Math.max(a, b, c), 30);
    body += `<rect x="${M + 20}" y="${y + 10}" width="${a * k}" height="${c * k}" class="sh"/><text x="${M + 20 + a * k / 2}" y="${y + 6}" class="dt" text-anchor="middle">${a} in</text><text x="${M + 14}" y="${y + 10 + c * k / 2}" class="dt" text-anchor="end">${c} in</text>`;
    body += `<rect x="${M + 60 + a * k}" y="${y + 10}" width="${b * k}" height="${c * k}" class="sh"/><text x="${M + 60 + a * k + b * k / 2}" y="${y + 6}" class="dt" text-anchor="middle">${b} in</text><text x="${M + 20}" y="${y + c * k + 30}" class="dt">ENVELOPE (max), side and end views</text>`;
    y += c * k + 50;
  }
  if (p.ports) { const t = table(M, y + 16, [{ h: 'Port', w: 90 }, { h: 'Kind', w: 60 }, { h: 'FS / BL / WL', w: 260 }, { h: 'Fitting', w: 360 }], Object.entries(p.ports).map(([k, q]) => [k, q.kind, IN(q.at).map((x) => f(x)).join(' / '), q.fit || (q.open ? 'open' : '')]), 'FLUID INTERFACE'); body += t.svg; y += t.h + 40; }
  for (const e of eq) for (const [cn, c] of Object.entries(e.conns)) {
    const rows = Object.entries(c.pins).map(([pin, name]) => { const ws = WIRES.filter((x) => x.from === `${e.ref}:${cn}:${pin}` || x.to === `${e.ref}:${cn}:${pin}`); return [pin, name, ws.map((x) => `${x.id} → ${x.from === `${e.ref}:${cn}:${pin}` ? x.to : x.from}`).join('; ')]; });
    const t = table(M, y + 16, [{ h: 'Pin', w: 50 }, { h: 'Signal', w: 240 }, { h: 'Wire → other end', w: 500 }], rows, `${e.ref}:${cn} — ${e.name} — ${c.type}`);
    body += t.svg; y += t.h + 40;
  }
  body += notes(M, y + 10, [p.scd ? 'Any item meeting this specification, envelope and interface may be used; record the vendor and part number on the W&B and equipment list.' : 'Procure to the standard / vendor number shown; record serial numbers where applicable.', 'Pinouts are the LEZ interface-control definition; confirm against the vendor installation manual before building the harness.']);
  return frame(p, body, y + 180, p.scd ? 'SOURCE-CONTROL DRAWING' : 'STANDARD PART');
}
export function partDrawingSVG(pn) {
  const p = partByPN(pn);
  if (!p) return '';
  if (p.kind === 'line') return lineSheet(p);
  if (p.kind === 'harness') return harnessSheet(p);
  if (p.kind === 'cable') return WIRES.some((x) => [].concat(x.harness).includes(p.pn)) ? harnessSheet(p) : cableSheet(p);
  if (p.kind === 'cots') return cotsSheet(p);
  return fabSheet(p);
}
export const drawingKinds = () => PARTS.map((p) => p.pn);
