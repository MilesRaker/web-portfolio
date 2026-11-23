// Lycoming O-235-C2C as installed (pusher): sourced data and the engine's shape, built around its mechanical and
// electrical interfaces. Public sources only:
//  [TCDS]  FAA Type Certificate Data Sheet E-223 (public domain): displacement, bore × stroke, dry weight, C.G. location
//          (from the prop flange and the crankshaft centreline), prop flange type, magnetos, carburettor, pusher eligibility.
//  [OM]    Lycoming O-235 / O-290 Operator's Manual 60297-9 (manufacturer's public manual): firing order, cylinder
//          numbering, accessory drive ratios and rotation, magneto and carburettor models, oil capacity. Its installation
//          drawings (figs 7-1 to 7-3) are images not reproduced in the public text, so pad positions below are approximate.
//  [SSP]   Lycoming SSP-110 (mount-type definitions: conical = mounts parallel to the crankshaft).
//  [GAN]   General Aviation News, engines column: conical mounts on the O-235-C, pad pattern 11½ in side to side × 9½ in
//          top to bottom.
//  [EH]    Lycoming envelope data via enginehistory.org (WWII O-235: 30.1 L × 32.3 W × 25.2 H in) and the Lycoming IO-233
//          spec sheet (27.0 × 31.9 × 20.6 in): the O-235-C2C envelope used here (29.05 × 32.0 × ≈ 22.6) sits between them.
//  [AS]    Aircraft Spruce cone-style mount bushings listed for the O-235-C1/-C2A/-C2C (COTS isolators).
// Everything not in a source is marked ASSUMED in the part record. Verify against the current Lycoming installation drawing.
const IN = 1 / 12;
export const O235 = {
  model: 'O-235-C2C', hp: 115, rpm: 2800, dryLb: 244, dispCuIn: 233.3, bore: 4.375, stroke: 3.875, cr: 6.75, firing: '1-3-2-4',
  cgFromFlange: 14.75, cgBelowCL: 1.13, cgLeft: 0.20,                                   // [TCDS]
  propFlange: 'integral, SAE Type 1 (AS-127-1, modified)', mags: ['Slick 4251 (left)', 'Slick 4250 (right)'], carb: 'Marvel-Schebler MA-3A (updraft)', oilQt: 6,
  cylNo: 'viewed from the accessory end: 1 front right, 2 front left, 3 rear right, 4 rear left (front = prop end)',      // [OM]
  drives: [['Starter', '13.556:1', 'CCW'], ['Generator / alternator', '1.910:1 (gen) · 3.250:1 (alt)', 'CW'], ['Vacuum pump', '1.300:1', 'CCW'], ['Tachometer', '0.500:1', 'CW'],
    ['Magnetos', '1.000:1', 'CW'], ['Fuel pump', '0.500:1', 'plunger'], ['AN drive', '1.000:1', 'CCW']],                 // [OM], rotation facing the pad
  mount: { kind: 'conical (parallel to the crankshaft)', dy: 11.5, dz: 9.5 },             // [SSP] [GAN] in
  envelope: { L: 29.05, W: 32.0, H: 22.6 },                                               // [EH] in
};
const GREY = 0x8d969f, DARK = 0x3a3f45, ROCK = 0x3f6fa8, FIN = 0x6b7580, MAGC = 0xa8382c;

/** mount lugs: four bosses on the accessory-end corners of the crankcase, on the conical pattern */
export const LUGS = (A, C) => [-1, 1].flatMap((sy) => [-1, 1].map((sz) => ({ k: `${sz > 0 ? 'T' : 'B'}${sy > 0 ? 'L' : 'R'}`, at: [A + 0.20, sy * O235.mount.dy / 24, C + sz * O235.mount.dz / 24] })));

/** the engine as primitives. P: { F (prop flange s), A (accessory face s), C (crank z), cylS, MAG, PLUG, EXH, STARTER, ALT } */
export function engineGeo(P) {
  const { F, A, C, cylS } = P, o = [];
  // crankcase: chamfered box section lofted from the accessory housing to the nose case
  const cc = (s, w, h, ch) => [[s, w, C + h - ch], [s, w - ch, C + h], [s, -w + ch, C + h], [s, -w, C + h - ch], [s, -w, C - h + ch], [s, -w + ch, C - h], [s, w - ch, C - h], [s, w, C - h + ch]];
  o.push({ t: 'loft', secs: [cc(A + 0.28, 0.43, 0.42, 0.10), cc(F - 0.30, 0.45, 0.44, 0.12), cc(F - 0.22, 0.36, 0.36, 0.10)], colour: GREY });
  o.push({ t: 'cyl', a: [F - 0.22, 0, C], b: [F - 0.06, 0, C], r: 0.27, colour: GREY });                                  // nose case
  o.push({ t: 'cyl', a: [F - 0.13, 0, C], b: [F - 0.09, 0, C], r: 0.52, colour: DARK });                                   // starter ring gear (on the prop-flange support)
  o.push({ t: 'cyl', a: [F - 0.09, 0, C], b: [F - 0.06, 0, C], r: 0.30, colour: DARK });                                   // alternator drive pulley
  o.push({ t: 'cyl', a: [F - 0.06, 0, C], b: [F, 0, C], r: 0.26, colour: GREY });                                         // integral prop flange (SAE 1)
  for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; o.push({ t: 'cyl', a: [F - 0.005, 0.18 * Math.cos(a), C + 0.18 * Math.sin(a)], b: [F + 0.04, 0.18 * Math.cos(a), C + 0.18 * Math.sin(a)], r: 0.022, mat: 'steel', colour: 0xc9ced6 }); } // flange drive bushings / bolts
  // accessory housing (faces the firewall in a pusher) with its drive pads
  o.push({ t: 'loft', secs: [cc(A, 0.40, 0.40, 0.12), cc(A + 0.28, 0.43, 0.42, 0.10)], colour: GREY });
  o.push({ t: 'cyl', a: [A, -0.10, C - 0.25], b: [A - 0.06, -0.10, C - 0.25], r: 0.05, colour: DARK });                    // tach drive pad (0.5:1, CW [OM]); the Hall pick-up threads onto it
  o.push({ t: 'cyl', a: [A, -0.24, C - 0.28], b: [A - 0.02, -0.24, C - 0.28], r: 0.10, colour: DARK });                    // vacuum / AN pad (covered)
  // mount lugs and conical isolators
  for (const L of LUGS(A, C)) { o.push({ t: 'cyl', a: [L.at[0] - 0.08, L.at[1], L.at[2]], b: [L.at[0] + 0.08, L.at[1], L.at[2]], r: 0.055, colour: DARK, lug: L.k });
    o.push({ t: 'cyl', a: [L.at[0] - 0.14, L.at[1], L.at[2]], b: [L.at[0] - 0.08, L.at[1], L.at[2]], r: 0.075, mat: 'rubber', colour: 0x222222 }); }
  // oil sump with the induction riser; updraft MA-3A carburettor at the accessory end
  o.push({ t: 'loft', secs: [cc(A + 0.38, 0.33, 0.13, 0.06).map(([s, y, z]) => [s, y, z - 0.55]), cc(A + 1.50, 0.30, 0.11, 0.06).map(([s, y, z]) => [s, y, z - 0.52])], colour: GREY });
  o.push({ t: 'box', c: [A + 0.27, 0, 2.18], d: [0.30, 0.30, 0.26], colour: 0x6f7a86 });
  // cylinders: finned barrel, finned head, rocker cover at the outboard end; plugs top and bottom; intake tube from the sump
  const cylinder = (s, sg) => {
    o.push({ t: 'cyl', a: [s, sg * 0.45, C], b: [s, sg * 0.88, C], r: 0.205, colour: FIN });
    for (let i = 0; i < 9; i++) { const y = 0.50 + i * 0.042; o.push({ t: 'cyl', a: [s, sg * y, C], b: [s, sg * (y + 0.012), C], r: 0.29, colour: FIN }); }
    o.push({ t: 'box', c: [s, sg * 1.05, C], d: [0.40, 0.34, 0.46], colour: 0x7a8490 });
    for (let i = 0; i < 5; i++) { const y = 0.92 + i * 0.06; o.push({ t: 'box', c: [s, sg * y, C], d: [0.50, 0.012, 0.56], colour: FIN }); }
    o.push({ t: 'box', c: [s, sg * 1.275, C + 0.02], d: [0.36, 0.115, 0.30], colour: ROCK });
    for (const top of [true, false]) { const p = P.PLUG(cylFor(s, sg, cylS), sg, top); o.push({ t: 'cyl', a: p, b: [p[0], p[1] - sg * 0.04, p[2] + (top ? -0.02 : 0.02)], r: 0.035, mat: 'steel', colour: 0xd9dde2 }); }
    o.push({ t: 'path', pts: [[s - 0.06, sg * 0.40, C - 0.50], [s - 0.07, sg * 0.70, C - 0.40], [s - 0.08, sg * 0.95, C - 0.28]], dIn: 1.5, drawR: 1.0, massPerFt: 0, colour: GREY });   // intake tube
  };
  for (const [k, s] of Object.entries(cylS)) cylinder(s, k[0] === 'L' ? -1 : 1);
  // magnetos (Slick 4251 / 4250) on the accessory housing, distribution caps and P-lead terminals
  for (const sg of [-1, 1]) { const m = P.MAG(sg); o.push({ t: 'cyl', a: m.a, b: m.b, r: 0.13, colour: MAGC }); o.push({ t: 'cyl', a: [m.cap[0], m.cap[1], m.cap[2] - 0.08], b: m.cap, r: 0.07, colour: 0x2b2b2b }); }
  o.push({ t: 'cyl', a: [A, 0, C + 0.05], b: [A - 0.28, 0, C + 0.05], r: 0.08, colour: 0xc9962c });                      // spin-on oil filter
  o.push({ t: 'cyl', a: [A, 0.25, C - 0.32], b: [A - 0.18, 0.25, C - 0.32], r: 0.07, colour: DARK });                       // diaphragm fuel pump (plunger driven)
  // starter at the prop end, lower left, pinion on the ring gear; alternator lower right on a belt from the ring-gear pulley
  o.push({ t: 'cyl', a: [F - 0.20, P.STARTER[1], P.STARTER[2] - 0.18], b: [F - 0.80, P.STARTER[1], P.STARTER[2] - 0.18], r: 0.15, colour: DARK });
  o.push({ t: 'cyl', a: [F - 0.13, P.STARTER[1], P.STARTER[2] - 0.18], b: [F - 0.20, P.STARTER[1], P.STARTER[2] - 0.18], r: 0.06, mat: 'steel', colour: 0xc9ced6 });   // pinion / Bendix
  o.push({ t: 'cyl', a: [F - 0.24, P.ALT[1], P.ALT[2] - 0.18], b: [F - 0.74, P.ALT[1], P.ALT[2] - 0.18], r: 0.17, colour: DARK });
  o.push({ t: 'cyl', a: [F - 0.09, P.ALT[1], P.ALT[2] - 0.18], b: [F - 0.06, P.ALT[1], P.ALT[2] - 0.18], r: 0.11, colour: DARK });     // alternator pulley
  o.push({ t: 'path', pts: [[F - 0.075, 0.18, C - 0.24], [F - 0.075, P.ALT[1] - 0.05, P.ALT[2] - 0.28], [F - 0.075, P.ALT[1] + 0.08, P.ALT[2] - 0.08], [F - 0.075, 0.30, C - 0.02]], dIn: 0.5, drawR: 0.05, massPerFt: 0, colour: 0x111111 });  // V-belt
  // terminals: starter + stud, alternator B+ stud and field faston, engine ground stud (crankcase, lower left)
  o.push({ t: 'cyl', a: P.STARTER, b: [P.STARTER[0], P.STARTER[1], P.STARTER[2] - 0.05], r: 0.02, mat: 'brass', colour: 0xc9a227 });
  o.push({ t: 'cyl', a: P.ALT, b: [P.ALT[0], P.ALT[1], P.ALT[2] - 0.05], r: 0.02, mat: 'brass', colour: 0xc9a227 });
  o.push({ t: 'cyl', a: [A + 0.40, -0.45, C - 0.30], b: [A + 0.40, -0.50, C - 0.30], r: 0.02, mat: 'brass', colour: 0xc9a227 });
  return o;
}
const cylFor = (s, sg, cylS) => Object.keys(cylS).find((k) => Math.abs(cylS[k] - s) < 1e-9 && (k[0] === 'L') === (sg < 0));
/** distance from a point to a primitive's surface envelope (0 inside) — interface checks */
export function distToPrim(g, p) {
  const sub = (a, b) => a.map((v, i) => v - b[i]), dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], len = (a) => Math.hypot(...a);
  if (g.t === 'box') return len([0, 1, 2].map((i) => Math.max(Math.abs(p[i] - g.c[i]) - g.d[i] / 2, 0)));
  if (g.t === 'cyl') { const ab = sub(g.b, g.a), L2 = dot(ab, ab), t = Math.max(0, Math.min(1, dot(sub(p, g.a), ab) / L2)), q = g.a.map((v, i) => v + ab[i] * t); return Math.max(len(sub(p, q)) - g.r, 0); }
  if (g.t === 'loft') { const all = g.secs.flat(), lo = [0, 1, 2].map((i) => Math.min(...all.map((q) => q[i]))), hi = [0, 1, 2].map((i) => Math.max(...all.map((q) => q[i]))); return len([0, 1, 2].map((i) => Math.max(lo[i] - p[i], p[i] - hi[i], 0))); }
  return Infinity;
}
void IN;
