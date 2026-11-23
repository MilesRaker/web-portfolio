// Block A drawing views for flat parts (bulkheads, firewall, ballast blocks): the part in its plane (u across, v up) with
// its regions, holes and overall dimensions, the stack through the thickness, and the hole table. Every number is read
// from the record's params (the numbers the solid is built from). The sheet is 1700 units for 17 in: 100 units per inch
// at 1:1, so the scale label is the true one.
const SCALES = [[100, '1:1'], [50, '1:2'], [100 / 3, '1:3'], [25, '1:4'], [20, '1:5'], [100 / 6, '1:6'], [12.5, '1:8'], [10, '1:10']];
const SEC = [[800, '8:1'], [400, '4:1'], [200, '2:1'], [100, '1:1'], [50, '1:2']];
const pick = (fit, list) => list.find(([s]) => s <= fit) || list.at(-1);
/** opts: title (view title), uLabel / vLabel, names (hole id → label), extra(k, X, Z) → svg, note (text under the view) */
export function flatView(opts = {}) {
  return (k, D) => {
    const { L, T, hdim, vdim } = k, P = D.params(), polys = Object.values(P.polys).flat(), all = polys.flat();
    const u0 = Math.min(...all.map((q) => q[0])), u1 = Math.max(...all.map((q) => q[0])), v0 = Math.min(...all.map((q) => q[1])), v1 = Math.max(...all.map((q) => q[1]));
    const [S, lab] = pick(Math.min(680 / (u1 - u0), 520 / (v1 - v0)), SCALES), cx = 60 + 340 - (u0 + u1) / 2 * S, top = 170;
    const X = (u) => cx + u * S, Z = (v) => top + (v1 - v) * S, path = (a) => `M${a.map((q) => `${X(q[0]).toFixed(1)} ${Z(q[1]).toFixed(1)}`).join('L')}Z`;
    let o = '';
    const main = P.polys[P.layers.find((l) => !l.reg)?.ol || Object.keys(P.polys)[0]];
    for (const [name, ps] of Object.entries(P.polys)) o += `<g data-feat="outline" class="feat">${ps.map((a) => `<path class="${ps === main ? 'pt' : 'hd'}" d="${path(a)}"/>`).join('')}</g>${void name || ''}`;
    for (const [rk, rs] of Object.entries({ ...P.regs, ...Object.fromEntries(Object.entries(P.cuts).map(([a, b]) => [`cut-${a}`, b])) })) {
      const feat = (P.layers.find((l) => l.reg === rk || `cut-${l.cut}` === rk) || {}).feat || 'outline';
      o += `<g data-feat="${feat}" class="feat">${rs.map((R) => { const a = Math.max(R[0], u0 - 0.2), b = Math.min(R[1], u1 + 0.2), c = Math.max(R[2], v0 - 0.2), d = Math.min(R[3], v1 + 0.2); return b > a && d > c ? `<rect class="hd" style="fill:none" x="${X(a).toFixed(1)}" y="${Z(d).toFixed(1)}" width="${((b - a) * S).toFixed(1)}" height="${((d - c) * S).toFixed(1)}"/>` : ''; }).join('')}</g>`;
    }
    P.holes.forEach((h, i) => { const r = Math.max(h.r * S, 1.5); o += `<g data-feat="${h.id}" class="feat"><circle class="pt" cx="${X(h.u).toFixed(1)}" cy="${Z(h.v).toFixed(1)}" r="${r.toFixed(1)}"/>${L(X(h.u) - r - 5, Z(h.v), X(h.u) + r + 5, Z(h.v), 'cl')}${L(X(h.u), Z(h.v) - r - 5, X(h.u), Z(h.v) + r + 5, 'cl')}${P.holes.length <= 40 ? T(X(h.u) + r + 3, Z(h.v) - r - 1, `H${i + 1}`, 'tn2', 'start') : ''}</g>`; });
    o += L(X(0), Z(v1) - 24, X(0), Z(v0) + 24, 'cl') + T(X(0), Z(v1) - 30, opts.cl || 'B (CL)', 'tq');
    o += hdim('outline', X(u0), X(u1), Z(v1), Z(v1) - 52, (u1 - u0).toFixed(2)) + vdim('outline', Z(v1), Z(v0), X(u1), X(u1) + 46, (v1 - v0).toFixed(2));
    if (opts.extra) o += opts.extra(k, X, Z, S, P);
    o += T(X((u0 + u1) / 2), Z(v0) + 62, `${opts.title || 'VIEW FROM AFT'} · ${lab}`, 'vt');
    // stack through the thickness at the thickest point (w across, to the right), layer by layer
    const ws = P.layers.flatMap((l) => [l.w0, l.w1]), w0 = Math.min(...ws), w1 = Math.max(...ws), [S2, lab2] = pick(300 / (w1 - w0), SEC), sx = 900, sy = 190, Hs = 150;
    P.layers.forEach((l) => { const x = sx + (l.w0 - w0) * S2, w = Math.max((l.w1 - l.w0) * S2, 0.8), h = l.reg ? Hs * 0.6 : Hs; o += `<g data-feat="${l.feat}" class="feat"><rect class="${l.mat === 'PVC' || l.mat === 'LEAD' ? 'pt' : 'hd'}" style="fill:none" x="${x.toFixed(1)}" y="${sy + (Hs - h) / 2}" width="${w.toFixed(1)}" height="${h}"/></g>`; });
    o += T(sx + (w1 - w0) * S2 / 2, sy + Hs + 30, `STACK THROUGH THE THICKNESS · ${lab2}`, 'vt') + T(sx - 8, sy + Hs / 2, opts.wLabel || '← FWD', 'tq', 'end');
    P.layers.forEach((l, i) => { o += T(sx - 40, sy + Hs + 56 + i * 15, `${l.name.toUpperCase().padEnd(9)} ${l.mat.padEnd(6)} ${(l.w1 - l.w0).toFixed(3)} IN  w ${l.w0.toFixed(3)} → ${l.w1.toFixed(3)}${l.reg ? ` (${l.reg})` : l.cut ? ` (less ${l.cut})` : ''}`, 'tn2', 'start'); });
    // hole table, two columns
    const rows = P.holes.map((h, i) => [`H${i + 1}`, (opts.names && opts.names(h, i)) || (D.def.holeNames && D.def.holeNames[i]) || h.id.toUpperCase(), h.u.toFixed(2), h.v.toFixed(2), (2 * h.r).toFixed(3)]), per = 22, y0 = 770;
    o += T(40, y0 - 18, `HOLE TABLE (${opts.uLabel || 'BL'}, ${opts.vLabel || 'WL'}, Ø)`, 'tq', 'start');
    rows.forEach((r, i) => { const c = Math.floor(i / per), x = 40 + c * 520, y = y0 + (i % per) * 13.5; if (c > 1) return; o += `<g class="dim" data-feat="${P.holes[i].id}">${T(x, y, r[0], 'tn2', 'start')}${T(x + 40, y, String(r[1]).slice(0, 31), 'tn2', 'start')}${T(x + 380, y, r[2], 'tn2', 'end')}${T(x + 440, y, r[3], 'tn2', 'end')}${T(x + 500, y, r[4], 'tn2', 'end')}</g>`; });
    if (rows.length > 2 * per) o += T(40, y0 + per * 13.5 + 4, `… ${rows.length - 2 * per} more holes in the record's params`, 'tn2', 'start');
    if (opts.note) o += T(900, 140, opts.note, 'tq', 'start');
    return { svg: o, bottom: 150, scale: `${lab} / ${lab2}`, notesBox: { x: 1240, top: 150, n: 50, bottom: 860 } };
  };
}
