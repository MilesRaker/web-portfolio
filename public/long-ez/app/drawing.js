// drawing.js — drafting-style SVG sheets: ply flat-pattern drawings and dimensioned roll cut layouts.
// Conventions: ASME Y14.5-style unidirectional dimensions, dual units (primary [secondary]),
// extension lines with a gap from the object, filled arrowheads, datum feature symbols, a ply
// orientation rosette, phantom lines for splice bands, a title block and a dash-number table.
import { piecePoly, splitToFit, rot, bbox, PROCESS, plyPN, PN_BASE } from './plybook.js';

const IN2MM = 25.4;
const xmlEsc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const f2 = (v) => (Math.abs(v) < 0.005 ? '0.00' : v.toFixed(2));
/** dual dimension text: inches [mm] in US mode, mm [inches] in SI mode */
export function dimText(inches, units = 'US') {
  return units === 'SI' ? `${(inches * IN2MM).toFixed(1)} [${f2(inches)}]` : `${f2(inches)} [${(inches * IN2MM).toFixed(1)}]`;
}
const tw = (t, size) => String(t).length * size * 0.6; // monospace width estimate

class Sheet {
  constructor(w, h) { this.w = w; this.h = h; this.o = []; }
  add(s) { this.o.push(s); return this; }
  line(x1, y1, x2, y2, cls = 'thin', extra = '') { return this.add(`<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" class="${cls}" ${extra}/>`); }
  poly(pts, cls = 'obj', extra = '') { return this.add(`<polygon points="${pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')}" class="${cls}" ${extra}/>`); }
  rect(x, y, w, h, cls = 'thin', extra = '') { return this.add(`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" class="${cls}" ${extra}/>`); }
  text(x, y, t, { size = 10, anchor = 'middle', rot: r = 0, cls = '', weight = 400, bg = false, base = 'middle' } = {}) {
    const tr = r ? ` transform="rotate(${r} ${x.toFixed(1)} ${y.toFixed(1)})"` : '';
    if (bg) {
      const w = tw(t, size) + 6, h = size + 4, x0 = anchor === 'middle' ? x - w / 2 : anchor === 'end' ? x - w + 3 : x - 3;
      this.add(`<rect x="${x0.toFixed(1)}" y="${(y - h / 2).toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" class="tbg"${tr}/>`);
    }
    return this.add(`<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-size="${size}" text-anchor="${anchor}" dominant-baseline="${base}" font-weight="${weight}" class="${cls}"${tr}>${xmlEsc(t)}</text>`);
  }
  /** horizontal dimension between x1 and x2; extension lines start a gap away from the object points */
  dimH(x1, y1, x2, y2, yd, label) {
    const g = 3, ov = 4, dirA = Math.sign(yd - y1) || 1, dirB = Math.sign(yd - y2) || 1;
    this.line(x1, y1 + g * dirA, x1, yd + ov * dirA, 'ext');
    this.line(x2, y2 + g * dirB, x2, yd + ov * dirB, 'ext');
    const span = Math.abs(x2 - x1), w = tw(label, 10) + 8;
    if (span > w + 24) {
      this.line(x1, yd, x2, yd, 'dim', 'marker-start="url(#ar)" marker-end="url(#ar)"');
      this.text((x1 + x2) / 2, yd, label, { bg: true });
    } else { // arrows outside, text beside
      const a = Math.min(x1, x2), b = Math.max(x1, x2);
      this.line(a - 16, yd, a, yd, 'dim', 'marker-end="url(#ar)"').line(b + 16, yd, b, yd, 'dim', 'marker-end="url(#ar)"').line(a, yd, b, yd, 'dim');
      this.text(b + 20, yd, label, { anchor: 'start', bg: true });
    }
  }
  /** vertical dimension (unidirectional: text stays horizontal) */
  dimV(x1, y1, x2, y2, xd, label, side = 'auto') {
    const g = 3, ov = 4, dirA = Math.sign(xd - x1) || 1, dirB = Math.sign(xd - x2) || 1;
    this.line(x1 + g * dirA, y1, xd + ov * dirA, y1, 'ext');
    this.line(x2 + g * dirB, y2, xd + ov * dirB, y2, 'ext');
    const span = Math.abs(y2 - y1);
    if (span > 26) {
      this.line(xd, y1, xd, y2, 'dim', 'marker-start="url(#ar)" marker-end="url(#ar)"');
      this.text(xd, (y1 + y2) / 2, label, { bg: true });
    } else {
      const a = Math.min(y1, y2), b = Math.max(y1, y2), right = side === 'right' || (side === 'auto' && dirA > 0);
      this.line(xd, a - 16, xd, a, 'dim', 'marker-end="url(#ar)"').line(xd, b + 16, xd, b, 'dim', 'marker-end="url(#ar)"').line(xd, a, xd, b, 'dim');
      this.text(xd + (right ? 8 : -8), b + 14, label, { anchor: right ? 'start' : 'end', bg: true });
    }
  }
  leader(x, y, tx, ty, label, size = 9.5) {
    const sh = tx > x ? 14 : -14;
    this.line(tx, ty, x, y, 'dim', 'marker-end="url(#ar)"').line(tx, ty, tx + sh, ty, 'dim');
    this.text(tx + sh + (sh > 0 ? 3 : -3), ty, label, { anchor: sh > 0 ? 'start' : 'end', size });
  }
  /** datum feature symbol: filled triangle on the feature, boxed letter offset by (dx, dy) */
  datum(x, y, letter, dx, dy) {
    const bx = x + dx, by = y + dy, n = Math.hypot(dx, dy) || 1, ux = dx / n, uy = dy / n, px = -uy, py = ux;
    this.add(`<polygon points="${x + px * 5},${y + py * 5} ${x - px * 5},${y - py * 5} ${x + ux * 8},${y + uy * 8}" class="fill"/>`);
    this.line(x + ux * 8, y + uy * 8, bx - ux * 9, by - uy * 9, 'thin');
    this.rect(bx - 9, by - 9, 18, 18, 'thick');
    this.text(bx, by + 0.5, letter, { size: 12, weight: 700 });
  }
  balloon(x, y, t, size = 8.5) { this.add(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${Math.max(7, tw(t, size) / 2 + 3).toFixed(1)}" class="balloon"/>`); this.text(x, y + 0.5, t, { size }); }
  svg(extraStyle = '') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${this.w} ${this.h}" width="${this.w}" height="${this.h}" class="dwg">
<defs><marker id="ar" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="9" markerHeight="9" markerUnits="userSpaceOnUse" orient="auto-start-reverse"><path d="M0,1.6 L10,5 L0,8.4 z" fill="#111"/></marker>
<pattern id="hatch" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke="#c0392b" stroke-width="0.8"/></pattern></defs>
<style>
.dwg text{font-family:"Osifont","ISOCPEUR","Consolas","Courier New",monospace;fill:#111;text-transform:uppercase}
.obj{fill:none;stroke:#111;stroke-width:1.7;stroke-linejoin:round}.objf{stroke:#111;stroke-width:1.7;stroke-linejoin:round}
.thin{fill:none;stroke:#111;stroke-width:.7}.thick{fill:#fff;stroke:#111;stroke-width:1.4}.border{fill:none;stroke:#111;stroke-width:2.2}
.ext{stroke:#111;stroke-width:.6}.dim{stroke:#111;stroke-width:.6;fill:none}.fill{fill:#111}
.ctr{stroke:#111;stroke-width:.6;stroke-dasharray:22 4 4 4;fill:none}.ph{stroke:#1f5fa8;stroke-width:.9;stroke-dasharray:14 3 3 3 3 3;fill:none}
.hid{stroke:#111;stroke-width:.7;stroke-dasharray:6 4;fill:none}.tbg{fill:#fff;stroke:none}.balloon{fill:#fff;stroke:#111;stroke-width:.8}
.sel{fill:#f2a93b55;stroke:#c76b00;stroke-width:1.6}.ovl{fill:url(#hatch);stroke:none}.red{fill:#c0392b!important}.redl{stroke:#c0392b;fill:none;stroke-width:1.4}
.blue{fill:#1f5fa8!important}.pc{stroke:#111;stroke-width:.5}.pc:hover{stroke:#c76b00;stroke-width:2;cursor:pointer}${extraStyle}
</style>
<rect x="0" y="0" width="${this.w}" height="${this.h}" fill="#fff"/>
${this.o.join('\n')}
</svg>`;
  }
}

/** Douglas-Peucker simplification to pick the dimensioned key points of a long outline */
function simplify(pts, tol) {
  if (pts.length < 4) return pts.map((_, i) => i);
  const keep = new Set([0, pts.length - 1]);
  const rec = (a, b) => {
    const [x1, y1] = pts[a], [x2, y2] = pts[b], L = Math.hypot(x2 - x1, y2 - y1) || 1;
    let dmax = 0, k = -1;
    for (let i = a + 1; i < b; i++) { const d = Math.abs((x2 - x1) * (y1 - pts[i][1]) - (x1 - pts[i][0]) * (y2 - y1)) / L; if (d > dmax) { dmax = d; k = i; } }
    if (dmax > tol && k > 0) { keep.add(k); rec(a, k); rec(k, b); }
  };
  // closed outline: split at the point farthest from the first
  let far = 0, dm = 0;
  pts.forEach((p, i) => { const d = Math.hypot(p[0] - pts[0][0], p[1] - pts[0][1]); if (d > dm) { dm = d; far = i; } });
  keep.add(far); rec(0, far); rec(far, pts.length - 1);
  return [...keep].sort((a, b) => a - b);
}

function borderAndZones(S, M) {
  S.rect(M, M, S.w - 2 * M, S.h - 2 * M, 'border');
  S.rect(M - 12, M - 12, S.w - 2 * M + 24, S.h - 2 * M + 24, 'thin');
  const nx = 8, ny = 4, letters = 'DCBA';
  for (let i = 0; i < nx; i++) {
    const x = M + (S.w - 2 * M) * (i + 0.5) / nx, lab = String(nx - i);
    S.text(x, M - 6, lab, { size: 8 }).text(x, S.h - M + 6, lab, { size: 8 });
    if (i) { const xx = M + (S.w - 2 * M) * i / nx; S.line(xx, M - 12, xx, M, 'thin').line(xx, S.h - M, xx, S.h - M + 12, 'thin'); }
  }
  for (let j = 0; j < ny; j++) {
    const y = M + (S.h - 2 * M) * (j + 0.5) / ny;
    S.text(M - 6, y, letters[j], { size: 8 }).text(S.w - M + 6, y, letters[j], { size: 8 });
    if (j) { const yy = M + (S.h - 2 * M) * j / ny; S.line(M - 12, yy, M, yy, 'thin').line(S.w - M, yy, S.w - M + 12, yy, 'thin'); }
  }
}

function titleBlock(S, x, y, w, rows) {
  // rows: [[ [label, value, weight, frac], ...], height]
  let yy = y;
  for (const [cells, h] of rows) {
    let xx = x;
    for (const [lab, val, wt = 400, frac = 1 / cells.length, size = 10] of cells) {
      const cw = w * frac;
      S.rect(xx, yy, cw, h, 'thin');
      if (lab) S.text(xx + 3, yy + 6, lab, { size: 6.5, anchor: 'start' });
      S.text(xx + (lab ? 5 : cw / 2), yy + h / 2 + (lab ? 4 : 0), val, { size, anchor: lab ? 'start' : 'middle', weight: wt });
      xx += cw;
    }
    yy += h;
  }
  S.rect(x, y, w, yy - y, 'border');
  return yy;
}

/** fibre orientation rosette: 0° = pattern +X; the warp (and fill, for BID) of this ply drawn bold */
function rosette(S, cx, cy, mat, cutAngle) {
  const R = 30;
  S.add(`<circle cx="${cx}" cy="${cy}" r="${R + 6}" class="thin"/>`);
  for (const a of [0, 45, 90, -45]) {
    const t = -a * Math.PI / 180, x = cx + R * Math.cos(t), y = cy + R * Math.sin(t);
    S.line(cx, cy, x, y, 'thin', 'stroke-dasharray="2 2"');
    S.text(cx + (R + 16) * Math.cos(t), cy + (R + 16) * Math.sin(t), `${a === -45 ? '-45' : a === 0 ? '0' : a === 90 ? '90' : '+45'}°`, { size: 7.5 });
  }
  // warp in the pattern frame is the roll +X turned back by the cutting angle
  const dirs = mat === 'BID' ? [-cutAngle, 90 - cutAngle] : [-cutAngle];
  dirs.forEach((a, i) => { const t = -a * Math.PI / 180; S.line(cx - R * Math.cos(t), cy - R * Math.sin(t), cx + R * Math.cos(t), cy + R * Math.sin(t), 'dim', `marker-end="url(#ar)" stroke-width="${i ? 1.2 : 2}"`); });
  S.text(cx, cy + R + 18, mat === 'BID' ? 'PLY ROSETTE ±45°' : 'PLY ROSETTE 0°', { size: 7.5, weight: 700 });
  S.text(cx, cy + R + 27, mat === 'BID' ? 'BOLD = WARP · THIN = FILL' : 'ARROW = FIBRE (WARP)', { size: 6.5 });
}

/**
 * Ply flat-pattern drawing.
 * ctx: { part, book, ply, ext, units, version, date, mat, selectedPN, pieces }
 */
export function plyDrawingSVG(ctx) {
  const { part, book, ply, units = 'US', version = '', date = '', mat, selectedPN, pieces = [] } = ctx;
  const W = 1224, H = 792, M = 24, S = new Sheet(W, H);
  borderAndZones(S, M);
  const poly = piecePoly(ply.flat), isPoly = ply.flat.kind === 'poly', isStrip = ply.flat.kind === 'strip';
  const cutAngle = ply.mat === 'BID' ? 45 : 0;
  const bb = bbox(poly), Lp = bb.w, Hp = bb.h;
  // ------------------------------------------------ layout zones
  const TBw = 470, TBh = 176, TBx = W - M - TBw, TBy = H - M - TBh;
  const tableW = isPoly ? 230 : 0;
  const A = { x0: M + 120, x1: W - M - 110 - tableW - (isPoly ? 20 : 0), y0: M + 128, y1: TBy - 150 };
  // ------------------------------------------------ scale (exaggerate thin strips, flagged NTS)
  const s = Math.min((A.x1 - A.x0) / Lp, (A.y1 - A.y0) / Hp);
  let sx = s, sy = s, exag = 1;
  if (Hp * s < 110) { sy = Math.min((A.y1 - A.y0), 110) / Hp; exag = sy / sx; }
  const ox = (A.x0 + A.x1) / 2 - Lp * sx / 2, oyB = (A.y0 + A.y1) / 2 + Hp * sy / 2; // screen of (bb.x0, bb.y0)
  const P = ([x, y]) => [ox + (x - bb.x0) * sx, oyB - (y - bb.y0) * sy];
  const scr = poly.map(P);

  // ------------------------------------------------ splice bands (phantom) & selected piece
  const split = splitToFit(poly, cutAngle, PROCESS.rollWidth), bands = split.segs.map((sg) => rot(sg, -cutAngle));
  const selBand = pieces.find((p) => p.pn === selectedPN);
  if (bands.length > 1) {
    for (let i = 0; i + 1 < bands.length; i++) { // overlap zone between band i and i+1 (hatched)
      const r = rot(poly, cutAngle), rb = bbox(r), ov = PROCESS.spliceOverlap, W0 = PROCESS.rollWidth;
      const yA = rb.y0 + (i + 1) * (W0 - ov), yB = yA + ov, big = 4 * (rb.w + rb.h);
      const strip = [[rb.x0 - big, yA], [rb.x0 + big, yA], [rb.x0 + big, yB], [rb.x0 - big, yB]];
      const clipped = clipPoly(rot(poly, cutAngle), strip);
      if (clipped.length >= 3) S.poly(rot(clipped, -cutAngle).map(P), 'ovl');
    }
  }
  if (selBand && bands[selBand.band]) S.poly(bands[selBand.band].map(P), 'sel');
  bands.forEach((b, i) => {
    if (bands.length > 1) S.poly(b.map(P), 'ph');
  });
  // the pattern outline (object line)
  S.poly(scr, 'obj');
  // centreline for symmetric strips
  if (isStrip) {
    const [xa, ya] = P([bb.x0, 0]), [xb] = P([bb.x0 + Lp, 0]);
    S.line(xa - 26, ya, xb + 26, ya, 'ctr');
    S.text(xb + 34, ya, '℄', { size: 13, anchor: 'start' });
  }
  // band letters
  if (bands.length > 1) bands.forEach((b, i) => {
    const c = b.reduce((a, p) => [a[0] + p[0] / b.length, a[1] + p[1] / b.length], [0, 0]), [cx, cy] = P(c);
    S.balloon(cx, cy, `BAND ${String.fromCharCode(65 + i)}`, 8);
  });
  const yTop = Math.min(...scr.map((p) => p[1]));
  if (bands.length > 1) {
    const r = rot(poly, cutAngle), rb = bbox(r), yA = rb.y0 + (PROCESS.rollWidth - PROCESS.spliceOverlap) + PROCESS.spliceOverlap / 2;
    // find a point on the first splice line inside the outline for the leader
    let lo = Infinity, hi = -Infinity; // where the splice line crosses the outline (rotated frame)
    r.forEach((a, j) => { const b = r[(j + 1) % r.length]; if ((a[1] - yA) * (b[1] - yA) <= 0 && a[1] !== b[1]) { const x = a[0] + (b[0] - a[0]) * (yA - a[1]) / (b[1] - a[1]); lo = Math.min(lo, x); hi = Math.max(hi, x); } });
    const inside = rot([[lo < Infinity ? (lo + hi) / 2 : rb.x0 + rb.w / 2, yA]], -cutAngle)[0], [lx, ly] = P(inside);
    S.leader(lx, ly, Math.min(lx + 70, A.x1 + 20), Math.max(M + 100, yTop - 34), `${dimText(PROCESS.spliceOverlap, units)} SPLICE OVERLAP (TYP)`, 8.5);
  }

  // ------------------------------------------------ dimensions
  const yBelow = Math.max(...scr.map((p) => p[1]));
  const yAbove = Math.min(...scr.map((p) => p[1]));
  const [xL] = P([bb.x0, 0]), [xR] = P([bb.x0 + Lp, 0]);
  if (!isPoly) {
    const f = ply.flat, w0 = f.w0, w1 = f.w1;
    // overall length
    const [b0x, b0y] = P(poly[0]), [b1x, b1y] = P(poly[1]);
    S.dimH(b0x, b0y, b1x, b1y, yBelow + 44, dimText(f.L, units));
    // end widths
    const [, t0y] = P(poly[3]), [, t1y] = P(poly[2]);
    S.dimV(xL, b0y, xL, t0y, xL - 58, dimText(w0, units), 'left');
    S.dimV(xR, b1y, xR, t1y, xR + 58, dimText(w1, units), 'right');
    if (isStrip && Math.abs(w0 - w1) > 0.01) S.text((xL + xR) / 2, yAbove - 22, `TAPERED STRIP · SYMMETRIC ABOUT ℄`, { size: 8.5 });
    if (!isStrip && Math.abs(w0 - w1) > 0.01) {
      const ang = Math.atan2(w1 - w0, f.L) * 180 / Math.PI, [mx, my] = P([f.L / 2, (w0 + w1) / 2]);
      S.leader(mx, my, mx - 60, Math.max(M + 100, yTop - 30), `TAPERED EDGE ${Math.abs(ang).toFixed(2)}° ${ang < 0 ? 'CONVERGING' : 'DIVERGING'} (REF)`, 8.5);
    }
    // datums
    if (isStrip) { S.datum(xL, (b0y + t0y) / 2, 'B', -34, 22); const [, cym] = P([0, 0]); S.datum(xR + 18, cym, 'A', 0, 30); }
    else { const [dx, dy] = P([Lp * 0.25, 0]); S.datum(dx, dy, 'A', 0, 30); S.datum(xL, (b0y + t0y) / 2, 'B', -34, -26); }
  } else {
    // overall envelope
    S.dimH(xL, Math.max(...scr.filter((p) => Math.abs(p[0] - xL) < 1).map((p) => p[1])), xR, Math.max(...scr.filter((p) => Math.abs(p[0] - xR) < 1).map((p) => p[1])), yBelow + 44, dimText(Lp, units));
    S.dimV(xR, yBelow, xR, yAbove, xR + 58, dimText(Hp, units), 'right');
    // key points: balloons + coordinate table (datum A: Y=0 line, datum B: X=0 = forward end)
    let tol = 0.15, idx = simplify(poly, tol);
    while (idx.length > 22 && tol < 6) { tol *= 1.4; idx = simplify(poly, tol); }
    const [, yz] = P([0, 0]);
    S.line(xL - 20, yz, xR + 20, yz, 'ctr'); S.text(xL - 24, yz, 'Y=0', { size: 8, anchor: 'end' });
    S.datum(xL, yz - 40, 'B', -34, 0);
    S.datum(xR + 14, yz, 'A', 0, 30);
    idx.forEach((i, k) => {
      const [x, y] = scr[i], cx = (bb.x0 + Lp / 2), out = poly[i][0] < cx ? -1 : 1, up = poly[i][1] > bb.y0 + Hp / 2 ? -1 : 1;
      S.add(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="1.8" class="fill"/>`);
      S.balloon(x + out * 11, y + up * 11, String(k + 1), 7.5);
    });
    // table
    const tx = W - M - tableW - 8, ty = M + 172, rh = 15;
    S.rect(tx, ty, tableW, rh, 'thick'); S.text(tx + tableW / 2, ty + rh / 2, 'OUTLINE KEY POINTS', { size: 8.5, weight: 700 });
    const cols = [40, 95, 95];
    let yy = ty + rh;
    S.rect(tx, yy, tableW, rh, 'thin');
    ['PT', 'X', 'Y'].forEach((h, j) => S.text(tx + cols.slice(0, j).reduce((a, b) => a + b, 0) + cols[j] / 2, yy + rh / 2, h, { size: 8, weight: 700 }));
    yy += rh;
    for (const [k, i] of idx.entries()) {
      S.rect(tx, yy, tableW, rh, 'thin');
      const [px, py] = poly[i], vals = [String(k + 1), units === 'SI' ? (px * IN2MM).toFixed(1) : f2(px), units === 'SI' ? (py * IN2MM).toFixed(1) : f2(py)];
      vals.forEach((v, j) => S.text(tx + cols.slice(0, j).reduce((a, b) => a + b, 0) + cols[j] / 2, yy + rh / 2, v, { size: 8 }));
      yy += rh;
    }
    S.text(tx + tableW / 2, yy + 9, `${units === 'SI' ? 'MM' : 'INCHES'} FROM DATUMS B (X) / A (Y)`, { size: 7 });
    S.text(tx + tableW / 2, yy + 19, `FULL ${poly.length}-PT OUTLINE IN DIGITAL PATTERN`, { size: 7 });
  }
  // reference: overall cut envelope of each band (for kitting)
  // ------------------------------------------------ header items: stamp, view title, rosette
  S.rect(M + 14, M + 14, 250, 40, 'redl');
  S.text(M + 139, M + 28, 'NOTIONAL — NOT FOR CONSTRUCTION', { size: 10, weight: 700, cls: 'red' });
  S.text(M + 139, M + 43, 'PUBLIC-DATA STUDY · NOT FROM RUTAN PLANS', { size: 7.5, cls: 'red' });
  S.text(W / 2 - 40, M + 30, `FLAT PATTERN — ${ply.id}`, { size: 15, weight: 700 });
  S.text(W / 2 - 40, M + 48, exag > 1.05 ? `VIEW NOT TO SCALE · WIDTH EXAGGERATED ×${exag.toFixed(1)} · DIMENSIONS ARE TRUE` : 'VIEW LOOKING DOWN ON TOOL SIDE OF PLY', { size: 8.5, cls: exag > 1.05 ? 'blue' : '' });
  rosette(S, W - M - 70, M + 66, ply.mat, cutAngle);

  // ------------------------------------------------ dash-number table
  const nLayer = ply.plies || 1, copies = book.count * (ply.qty || 1), nb = bands.length;
  const dTx = TBx, dTy = TBy - 24 - 18 * (copies + 1) - 6;
  const dashRows = [];
  for (let c = 0; c < copies; c++) {
    const lay = nLayer > 1 ? `.01–.${String(nLayer).padStart(2, '0')}` : '', bnd = nb > 1 ? `A–${String.fromCharCode(64 + nb)}` : '';
    dashRows.push([`-${c + 1}${bnd ? '(' + bnd + ')' : ''}`, `${plyPN(part, ply.id)}${lay}-${c + 1}${bnd ? '*' : ''}`, copies > 1 ? (c ? 'RH · OPPOSITE (MIRROR)' : 'LH · AS SHOWN') : 'AS SHOWN', nLayer * nb]);
  }
  S.rect(dTx, dTy, TBw, 18, 'thick'); S.text(dTx + TBw / 2, dTy + 9, 'DASH NUMBERS / PIECES CUT', { size: 8.5, weight: 700 });
  const dc = [60, 210, 150, 50];
  let dy = dTy + 18;
  S.rect(dTx, dy, TBw, 18, 'thin');
  ['DASH', 'PIECE PART NUMBER', 'DESCRIPTION', 'QTY'].forEach((h, j) => S.text(dTx + dc.slice(0, j).reduce((a, b) => a + b, 0) + dc[j] / 2, dy + 9, h, { size: 7.5, weight: 700 }));
  dy += 18;
  for (const r of dashRows) {
    S.rect(dTx, dy, TBw, 18, 'thin');
    r.forEach((v, j) => S.text(dTx + dc.slice(0, j).reduce((a, b) => a + b, 0) + dc[j] / 2, dy + 9, String(v), { size: 8 }));
    dy += 18;
  }
  for (let j = 1; j < dc.length; j++) { const x = dTx + dc.slice(0, j).reduce((a, b) => a + b, 0); S.line(x, dTy + 18, x, dy, 'thin'); }
  if (nb > 1) S.text(dTx + 4, dy + 8, `* SUFFIX BAND LETTER A–${String.fromCharCode(64 + nb)} (ROLL-WIDTH BANDS)`, { size: 7, anchor: 'start' });

  // ------------------------------------------------ notes
  const area1 = Math.abs(poly.reduce((a, p, i) => { const q = poly[(i + 1) % poly.length]; return a + p[0] * q[1] - q[0] * p[1]; }, 0)) / 2;
  const notes = [
    `INTERPRET DRAWING PER ASME Y14.5-2018. DIMENSIONS IN ${units === 'SI' ? 'MILLIMETRES [INCHES]' : 'INCHES [MILLIMETRES]'}.`,
    `UNLESS OTHERWISE SPECIFIED: CUT EDGE ±0.12 [±3], FIBRE ANGLE ±3° TO DATUM A.`,
    `MATERIAL: MTM45-1 / ${mat.label.toUpperCase()} PREPREG (NCAMP), CURED PLY ${mat.t} IN; KEEP FROZEN ≤ 0 °F, LOG OUT-TIME. CUT ${ply.mat === 'BID' ? 'ON 45° BIAS TO ROLL (CLOTH WARP AT -45° TO DATUM A)' : 'WITH FIBRES PARALLEL TO DATUM A (ROLL WARP)'}.`,
    `${isStrip ? 'DATUM A = PLY CENTRELINE. ' : isPoly ? 'DATUM A = Y=0 REFERENCE LINE. ' : 'DATUM A = STRAIGHT (REFERENCE) EDGE. '}DATUM B = ${isPoly ? 'FORWARD' : 'ROOT / START'} END OF PLY.`,
    copies > 1 ? `-1 SHOWN; -2 IS OPPOSITE (MIRROR IMAGE). CUT BIAS PLIES OF -2 FROM THE REVERSED CLOTH FACE.` : `ONE PER AIRCRAFT${nLayer > 1 ? ` PER LAYER (${nLayer} LAYERS, SUFFIX .01–.${String(nLayer).padStart(2, '0')})` : ''}.`,
    nb > 1 ? `CUT IN ${nb} ROLL-WIDTH BANDS (${PROCESS.rollWidth.toFixed(0)} IN ROLL). SPLICE ${f2(PROCESS.spliceOverlap)} MIN OVERLAP; STAGGER SPLICES ≥ ${f2(PROCESS.spliceStagger)} FROM ADJACENT PLIES.` : `CUT IN ONE PIECE — NO SPLICES PERMITTED.`,
    `LOCATION: ${String(ctx.ext).toUpperCase()}. LAYUP STEP ${ply.step}, SEQUENCE ${ply.seq}. ${String(ply.note).toUpperCase()}.`,
    `PATTERN DEVELOPED FROM 3D SURFACE (AIRFOIL ARC LENGTH × SPAN). NET AREA ${units === 'SI' ? `${(area1 * 645.16 / 1e4).toFixed(1)} CM²` : `${area1.toFixed(1)} IN²`} PER PIECE. MARK P/N ON CARRIER PAPER.`,
  ];
  const nX = M + 10, nY = TBy - 4;
  S.text(nX, nY, 'NOTES:', { size: 10, weight: 700, anchor: 'start' });
  notes.forEach((n, i) => {
    const words = n.split(' '), lines = [];
    let cur = '';
    for (const w of words) { if (tw(`${cur} ${w}`, 8.2) > TBx - nX - 40) { lines.push(cur); cur = w; } else cur = cur ? `${cur} ${w}` : w; }
    lines.push(cur);
    notes[i] = lines;
  });
  let ny = nY + 14;
  notes.forEach((ls, i) => { ls.forEach((l, j) => { S.text(nX + 4, ny, j ? '' : `${i + 1}.`, { size: 8.2, anchor: 'start' }); S.text(nX + 22, ny, l, { size: 8.2, anchor: 'start' }); ny += 11; }); });

  // ------------------------------------------------ title block
  const scaleTxt = exag > 1.05 ? 'NTS' : `1:${(72 / s).toFixed(1)} (B)`;
  titleBlock(S, TBx, TBy, TBw, [
    [[['', 'LONG-EZ NOTIONAL STRUCTURE STUDY', 700, 1, 11]], 22],
    [[['TITLE', `PLY ${ply.id} — ${book.name}`.toUpperCase(), 700, 1, 10]], 26],
    [[['', String(ply.note).toUpperCase().slice(0, 62), 400, 1, 8.5]], 18],
    [[['SIZE', 'B', 700, 0.1], ['DWG NO.', plyPN(part, ply.id), 700, 0.6, 11], ['REV', '—', 700, 0.12], ['SHEET', '1 OF 1', 400, 0.18]], 28],
    [[['MATERIAL', `MTM45-1 / ${mat.label}`, 400, 0.3, 9], ['ORIENT', ply.mat === 'BID' ? '±45°' : `${ply.angle}°`, 400, 0.17, 9], ['QTY/A/C', String(nLayer * copies), 400, 0.18, 9], ['WT/ROW', `${ply.weight.toFixed(3)} LB`, 400, 0.35, 9]], 26],
    [[['SCALE', scaleTxt, 400, 0.22, 9], ['CONFIG', version, 400, 0.3, 9], ['DRAWN', 'AUTO-GEN', 400, 0.22, 9], ['DATE', date, 400, 0.26, 9]], 26],
    [[['ASSY', `LEZ-${PN_BASE[part]} ${book.name}`.toUpperCase(), 400, 1, 9]], 30],
  ]);
  return S.svg();
}

/** clip polygon `subj` to convex polygon `clipP` (Sutherland-Hodgman) */
function clipPoly(subj, clipP) {
  let out = subj;
  for (let i = 0; i < clipP.length; i++) {
    const A = clipP[i], B = clipP[(i + 1) % clipP.length], inp = out; out = [];
    const side = (p) => (B[0] - A[0]) * (p[1] - A[1]) - (B[1] - A[1]) * (p[0] - A[0]);
    for (let j = 0; j < inp.length; j++) {
      const P = inp[j], Q = inp[(j + 1) % inp.length], sp = side(P), sq = side(Q);
      if (sp >= 0) out.push(P);
      if ((sp >= 0) !== (sq >= 0)) { const t = sp / (sp - sq); out.push([P[0] + (Q[0] - P[0]) * t, P[1] + (Q[1] - P[1]) * t]); }
    }
    if (!out.length) break;
  }
  return out;
}

/**
 * Dimensioned roll cut layout. N = nest result for one material.
 * opts: { mat, order, pal, books, units, k (px per inch) }
 */
export function rollSVG(N, opts) {
  const { mat, order, pal, books, units = 'US', k = 4 } = opts, Wr = PROCESS.rollWidth;
  const L0 = 170, T0 = 96, B0 = 92, R0 = 70;
  const Wd = Math.ceil(L0 + N.length * k + R0), Hd = Math.ceil(T0 + Wr * k + B0), S = new Sheet(Wd, Hd);
  const X = (x) => L0 + x * k, Y = (y) => T0 + y * k;
  // roll body
  S.rect(X(0), Y(0), N.length * k, Wr * k, 'thin', 'style="fill:#f6f3ea"');
  S.line(X(0), Y(0), X(N.length), Y(0), 'obj').line(X(0), Y(Wr), X(N.length), Y(Wr), 'obj');
  S.line(X(0), Y(0) - 6, X(0), Y(Wr) + 6, 'obj');
  // pieces
  for (const p of N.pieces) {
    const pts = p.pts.map(([x, y]) => [X(p.x + x), Y(p.y + y)]);
    S.add(`<polygon points="${pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')}" fill="${pal[order.indexOf(p.part)]}" fill-opacity=".55" class="pc" data-ply="${xmlEsc(p.ply)}" data-part="${p.part}" data-pn="${xmlEsc(p.pn)}"><title>${xmlEsc(p.pn)} · ${xmlEsc(books[p.part].name)} · ${dimText(p.w, units)} × ${dimText(p.h, units)}</title></polygon>`);
  }
  // part-number labels, run along each piece's longest edge and sized to fit
  for (const p of N.pieces) {
    const pts = p.pts.map(([x, y]) => [X(p.x + x), Y(p.y + y)]);
    let best = 0, ang = 0;
    pts.forEach((a, i) => { const b = pts[(i + 1) % pts.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L > best) { best = L; ang = Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI; } });
    if (ang > 90) ang -= 180; if (ang <= -90) ang += 180;
    if (Math.abs(ang - 90) < 1e-6) ang = -90;
    const thick = p.area * k * k / Math.max(best, 1), cx = pts.reduce((a, q) => a + q[0], 0) / pts.length, cy = pts.reduce((a, q) => a + q[1], 0) / pts.length;
    const fit = (t) => Math.min(8, thick * 0.62, best * 0.8 / (t.length * 0.6));
    let t = p.pn, size = fit(t);
    if (size < 3.5) { t = p.pn.replace(/^LEZ-/, ''); size = fit(t); }
    if (size < 3.5) continue;
    S.add(`<text x="${cx.toFixed(1)}" y="${cy.toFixed(1)}" font-size="${size.toFixed(1)}" text-anchor="middle" dominant-baseline="middle" style="pointer-events:none"${Math.abs(ang) > 0.5 ? ` transform="rotate(${ang.toFixed(1)} ${cx.toFixed(1)} ${cy.toFixed(1)})"` : ''}>${xmlEsc(t)}</text>`);
  }
  // ordinate dimensions from the roll datum (cut-start of each piece), along the top
  const xs = [...new Set(N.pieces.map((p) => +p.x.toFixed(2)))].sort((a, b) => a - b);
  let last = -1e9;
  S.text(X(0), T0 - 70, units === 'SI' ? 'ORDINATE MM FROM ROLL DATUM' : 'ORDINATE IN FROM ROLL DATUM', { size: 7, anchor: 'start' });
  for (const x of xs) {
    if (X(x) - last < 11) continue;
    last = X(x);
    S.line(X(x), Y(0) - 3, X(x), Y(0) - 20, 'ext');
    S.text(X(x), Y(0) - 24, units === 'SI' ? (x * IN2MM).toFixed(0) : f2(x), { size: 7.5, anchor: 'start', rot: -90 });
  }
  // datum
  S.datum(X(0), Y(Wr * 0.82), 'A', -30, 0);
  S.text(X(0) - 30, Y(Wr * 0.82) + 18, 'ROLL DATUM', { size: 7 }).text(X(0) - 30, Y(Wr * 0.82) + 27, '(CUT SQUARE)', { size: 7 });
  // roll width
  S.dimV(X(0), Y(0), X(0), Y(Wr), X(0) - 100, dimText(Wr, units));
  S.text(X(0) - 100, Y(0) - 12, 'ROLL WIDTH', { size: 7 });
  // selvage + warp notes, repeated every ~1500 px
  for (let x = 0; x < N.length * k; x += 1500) {
    S.text(X(0) + x + 60, Y(0) + 7, 'SELVAGE', { size: 6.5, anchor: 'start' });
    S.text(X(0) + x + 60, Y(Wr) - 7, 'SELVAGE', { size: 6.5, anchor: 'start' });
    S.line(X(0) + x + 120, Y(0) - 52, X(0) + x + 190, Y(0) - 52, 'dim', 'marker-end="url(#ar)"');
    S.text(X(0) + x + 196, Y(0) - 52, `WARP · ${mat} ${mat === 'BID' ? 'PIECES CUT ON 45° BIAS' : 'FIBRES ALONG ROLL'}`, { size: 7, anchor: 'start' });
  }
  // yard scale
  const yS = Y(Wr) + 16;
  S.line(X(0), yS, X(N.length), yS, 'thin');
  for (let x = 0; x <= N.length + 1e-6; x += 12) {
    const yd = Math.abs(x / 36 - Math.round(x / 36)) < 1e-6;
    S.line(X(x), yS, X(x), yS + (yd ? 9 : 4), 'thin');
    if (yd && x > 0) S.text(X(x), yS + 16, `${Math.round(x / 36)} YD`, { size: 7 });
  }
  // overall length used
  const yD = Y(Wr) + 58, lab = `${dimText(N.length, units)} ROLL USED (${N.yards.toFixed(1)} YD) · UTILISATION ${(N.utilisation * 100).toFixed(0)} %`;
  S.line(X(0), Y(Wr) + 3, X(0), yD + 4, 'ext').line(X(N.length), Y(Wr) + 3, X(N.length), yD + 4, 'ext');
  S.line(X(0), yD, X(N.length), yD, 'dim', 'marker-start="url(#ar)" marker-end="url(#ar)"');
  for (let x = 280; x < N.length * k - 200; x += 2400) S.text(X(0) + x, yD, lab, { bg: true, size: 9 });
  S.text(X(N.length) + 6, yD - 10, f2(N.length), { size: 7.5, anchor: 'start' });
  return S.svg('.dwg text{text-transform:none}');
}

/** cut list rows sorted along the roll */
export function cutList(N, books, units = 'US') {
  const u = (v) => (units === 'SI' ? (v * IN2MM).toFixed(1) : v.toFixed(2));
  return [...N.pieces].sort((a, b) => a.x - b.x || a.y - b.y).map((p) => ({
    pn: p.pn, ply: p.ply, part: p.part, assy: books[p.part].name, band: p.nBand > 1 ? String.fromCharCode(65 + p.band) : '—',
    x: u(p.x), y: u(p.y), l: u(p.w), w: u(p.h), area: units === 'SI' ? (p.area * 6.4516).toFixed(1) : p.area.toFixed(1),
  }));
}
