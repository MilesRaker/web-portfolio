// WPB2 — canopy hardware: hinge LEZ-56-110, gas strut LEZ-56-120, check cable LEZ-56-130. Their solids (vendor envelopes
// with the mounting features) as primitives in the aircraft frame (in: x = BL, y = FS, z = WL), the masses from them,
// and the geometry the interfaces check. Notional; vendor dimensions typed from memory where marked.
import { partByPN } from '../systems.js';
import { HINGE, STRUT } from './wp4_avionics_cabin.js';
import { hingeAt, wallAt, bandAt, CABLE, STRUT_DEF, ohwIn } from './wpB1_canopy.js';
import { groupVols, massFrom, tidy, RHO } from '../defn/blkB_prims.js';

const P3 = (q) => [q[1] * 12, q[0] * 12, q[2] * 12];   // model ft [FS, BL, WL] → aircraft in [BL, FS, WL]

// ------------------------------------------------------------------------------------------- hinge
/** MS20001-type piano hinge cut to the straight sill span: 0.063 in pin, knuckle OD 3/16 in (typed from memory), two
 *  0.040 in 2024-T3 leaves 0.75 in deep hanging down in the joint (each in a 0.045 in relief of its edge face), in four
 *  7 in segments along the slightly inclined pin line. The knuckle is centred on the outer sill corner. */
export const HG = { pin: 0.063, od: 0.1875, leaf: 0.040, depth: 0.75, seg: 4, rho: { pin: RHO.steel, al2024: 0.100 } };
export function hingePrims() {
  const a = P3(HINGE[0]), b = P3(HINGE[1]), out = [{ k: 'cyl', g: 'pin', a, b, r: HG.pin / 2 }, { k: 'cyl', g: 'al2024', a, b, r: HG.od / 2, ri: HG.pin / 2 + 0.002 }];
  for (let i = 0; i < HG.seg; i++) {
    const s0 = a[1] + (b[1] - a[1]) * i / HG.seg, s1 = a[1] + (b[1] - a[1]) * (i + 1) / HG.seg, zc = (a[2] + (b[2] - a[2]) * (i + 0.5) / HG.seg) - HG.od / 2 - HG.depth / 2;
    for (const [y0, y1] of [[a[0] - 0.005 - HG.leaf, a[0] - 0.005], [a[0] + 0.005, a[0] + 0.005 + HG.leaf]]) out.push({ k: 'box', g: 'al2024', c: [(y0 + y1) / 2, (s0 + s1) / 2, zc], d: [y1 - y0, s1 - s0, HG.depth] });
  }
  return tidy(out);
}
export const hingeParams = () => ({ prims: hingePrims(), feat: { pin: 'pin', al2024: 'leaf' }, holes: [] });
export const HINGE_MASS = massFrom(groupVols(hingePrims()), { pin: HG.rho.pin, al2024: HG.rho.al2024 });

// ------------------------------------------------------------------------------------------- strut
/** gas spring: 18 mm body, 8 mm rod, 10 mm ball sockets (typed from memory: common industrial sizes); a 6061 wall bracket
 *  bonded to the right wall with its two screws in the longeron band; a 6061 arm bonded and screwed to the right rail's
 *  inner face carrying the moving ball stud. Drawn closed (canopy shut). */
export const GS = { body: 0.709, rod: 0.315, ball: 0.394, ext: 9.5, comp: 7.5, rating: 150, vendor: 'McMaster-Carr gas spring, 9.5 in extended / 7.5 in compressed, 10 mm ball-socket ends, force to the check (typed from memory: catalogue sizes, not a quoted part number)' };
export function strutGeo() {
  const h = hingeAt(STRUT.s), f = [STRUT.s, h[1] + STRUT.fixed[0], h[2] + STRUT.fixed[1]], m = [STRUT.s, h[1] + STRUT.move[0], h[2] + STRUT.move[1]];
  const F = P3(f), M = P3(m), u = [M[0] - F[0], M[1] - F[1], M[2] - F[2]], L = Math.hypot(...u), e = u.map((x) => x / L), bodyL = GS.comp - 2.2;
  const at = (d) => F.map((v, i) => v + e[i] * d), b = bandAt(STRUT.s), wallY = wallAt(STRUT.s, (b.low + b.top) / 2);
  return { F, M, L, e, at, bodyL, b, wallY };
}
export function strutPrims() {
  const g = strutGeo(), { F, M, at, b } = g, plateY = wallAt(STRUT.s, F[2]) - 0.045, top = b.top - 0.2, bot = F[2] - 0.6;
  return tidy([
    { k: 'cyl', g: 'steel', a: at(1.1), b: at(1.1 + g.bodyL), r: GS.body / 2, ri: GS.body / 2 - 0.04 },     // body (tube wall + gas)
    { k: 'cyl', g: 'steel', a: at(1.1 + g.bodyL), b: at(g.L - 1.1), r: GS.rod / 2 },                     // rod
    { k: 'sph', g: 'steel', c: F, r: GS.ball / 2 }, { k: 'sph', g: 'steel', c: M, r: GS.ball / 2 },     // ball studs
    { k: 'cyl', g: 'steel', a: F, b: at(1.1), r: 0.25 }, { k: 'cyl', g: 'steel', a: M, b: at(g.L - 1.1), r: 0.25 },   // socket ends
    { k: 'box', g: 'al', c: [plateY, F[1], (top + bot) / 2], d: [0.09, 1.5, top - bot] },              // wall bracket plate (bonded; screws in the band)
    { k: 'cyl', g: 'steel', a: [plateY - 0.045, F[1], F[2]], b: [F[0], F[1], F[2]], r: 0.16 },          // fixed stud standoff
    { k: 'box', g: 'al', c: [(M[0] + ohwIn(STRUT.s) - 0.55) / 2, M[1], M[2]], d: [ohwIn(STRUT.s) - 0.55 - M[0], 0.75, 0.19] },   // moving arm to the rail
  ]);
}
export const strutParams = () => ({ prims: strutPrims(), feat: { steel: 'strut', al: 'bracket' }, holes: [] });
export const STRUT_MASS = massFrom(groupVols(strutPrims()), { steel: RHO.steel, al: RHO.al });

// ------------------------------------------------------------------------------------------- check cable
/** 1/16 in 7×19 CRES cable, drawn taut at the 80° stop (the closed canopy folds it along the aft bow under a bungee);
 *  thimble eyes and swaged sleeves at both ends; a 6061 tab bonded to the left wall with its screw in the band. The
 *  strand's metal fill is about 0.78 of its circle (typed from memory). */
export const CC = { d: 0.0625, fill: 0.71 /* 0.75 lb/100 ft ÷ (0.286 × π/4 × 0.0625²): MIL-DTL-83420 table I (emilspec.com mirror, accessed 2026-11-19), derived */, sleeve: [0.30, 0.16] };
export function cablePrims() {
  const W = P3(CABLE.wall), O = P3(CABLE.open), u = [O[0] - W[0], O[1] - W[1], O[2] - W[2]], L = Math.hypot(...u), e = u.map((x) => x / L), at = (d) => W.map((v, i) => v + e[i] * d);
  return tidy([
    { k: 'cyl', g: 'cable', a: W, b: O, r: CC.d / 2 },
    { k: 'cyl', g: 'cres', a: at(0.35), b: at(0.35 + CC.sleeve[0]), r: CC.sleeve[1] / 2, ri: CC.d / 2 }, { k: 'cyl', g: 'cres', a: at(L - 0.35 - CC.sleeve[0]), b: at(L - 0.35), r: CC.sleeve[1] / 2, ri: CC.d / 2 },
    { k: 'box', g: 'al', c: [W[0] - 0.05 - 0.045, W[1], W[2]], d: [0.09, 0.75, 1.2] },
  ]);
}
export const cableParams = () => ({ prims: cablePrims(), feat: { cable: 'cable', cres: 'sleeve', al: 'tab' }, holes: [] });
export const CABLE_MASS = massFrom(groupVols(cablePrims()), { cable: RHO.cres * CC.fill, cres: RHO.cres, al: RHO.al });

// the system records take the defined masses; the hinge knuckle stands half proud of the OML on the sill corner
{ const h = partByPN('LEZ-56-110'); if (h) { h.massEach = +HINGE_MASS.toFixed(4); h.external = true; h.geo = [{ t: 'cyl', a: HINGE[0], b: HINGE[1], r: HG.od / 24 }]; h.src = { ...h.src, mass: 'GEOMETRY: the definition solid (LEZ-56-110)' }; h.std = 'MS20001 piano hinge (0.063 in pin, 0.040 in 2024-T3 leaves) cut to 28 in, FS 68–96; frame leaf riveted (MS20470AD4) and sill leaf screwed (AN525-832 into potted nutplates in the longeron band)'; } }
{ const p = partByPN('LEZ-56-120'); if (p) { p.massEach = +STRUT_MASS.toFixed(4); p.src = { ...p.src, mass: 'GEOMETRY: the definition solid (LEZ-56-120)' }; } }
{ const p = partByPN('LEZ-56-130'); if (p) { p.massEach = +CABLE_MASS.toFixed(4); p.src = { ...p.src, mass: 'GEOMETRY: the definition solid (LEZ-56-130)' }; } }
void STRUT_DEF;
