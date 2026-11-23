// Cuts in a laminate part's solid (tunnels, bays, reliefs): a registry per part, filled by the block that needs them
// (block C: wpC8_cuts.js), read by the part's volume and parameter functions and by cad/loft3d.py / cad/wing_panel.py.
// Solid frame, inches: x = BL, y = FS, z = WL. Kinds:
//  • cyl {a, b, r, ext: [e0, e1]}: a and b on the axis; an end on a face of the part is extended past it by e (the face
//    cuts it), so the removed volume is π r² |b − a| exactly when the axis crosses that face at a (or b);
//  • box {lo, hi}: fully inside the part, or touching its faces;
//  • clip: a box that crosses the outer mould line; its volume `vol` is the model's exact figure (given by the caller).
// The solid scripts measure each cut's intersection with the outer mould line and subtract it, cut by cut (overlapping
// cuts are counted in each: the same convention on both sides). Notional.
const r4 = (x) => Math.round(x * 1e4) / 1e4, R4 = (p) => p.map(r4);
export const cutVol = (c) => (c.vol != null ? c.vol : c.k === 'cyl' ? Math.PI * c.r ** 2 * Math.hypot(...c.b.map((v, i) => v - c.a[i])) : c.hi.reduce((s, v, i) => s * (v - c.lo[i]), 1));
export const cutsVol = (list) => list.reduce((s, c) => s + cutVol(c), 0);
export const cutParams = (list) => list.map((c) => ({ id: c.id, feat: c.feat, k: c.k === 'clip' ? 'box' : c.k, ...(c.k === 'cyl' ? { a: R4(c.a), b: R4(c.b), r: r4(c.r), ext: c.ext || [0, 0] } : { lo: R4(c.lo), hi: R4(c.hi) }), vol: r4(cutVol(c)) }));
