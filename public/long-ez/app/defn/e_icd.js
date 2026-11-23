// Block E interface checks: each returns { ok, detail } and reads the partners' own symbols (released records, A's ballast,
// B's panel cut-outs, D's switch, the routes), never retyped numbers. Inches. Notional.
import { NG, KIN, DOOR, SWF, NOSE_SW, strutPt, B_at, C_at, d2r } from '../parts/ng_layout.js';
import { SIZING } from '../parts/ng_sizing.js';
import { DISC, E, PLATE, plateBot, skinZ, F22_FWD, NG6, DSTOP, USTOP, NG3, HOUSING, SHELF, WHEEL, FORK, LINK, FINGER, E_P, secIn, SP, SW_WIRE } from '../parts/wpE1_nosegear.js';
import { F22G } from '../parts/wp25_f22.js';
import { NB, NBG } from '../parts/wpA5_ballast.js';
import { CUTS, cutDist } from '../parts/wpB3_panel.js';
import { SW_P } from '../parts/wpD2_brakes.js';
import { routes } from '../systems.js';

const fx = (x, n = 2) => (Number.isFinite(x) ? x.toFixed(n) : String(x));
const IN = 12, SZ = SIZING.pick;
const inPoly = (q, P) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const a = P[i], b = P[j]; if ((a[1] > q[1]) !== (b[1] > q[1]) && q[0] < (b[0] - a[0]) * (q[1] - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
const segDist = (p, a, b) => { const d = [b[0] - a[0], b[1] - a[1]], L2 = d[0] ** 2 + d[1] ** 2, t = L2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * d[0] + (p[1] - a[1]) * d[1]) / L2)) : 0; return Math.hypot(p[0] - a[0] - t * d[0], p[1] - a[1] - t * d[1]); };
/** signed distance from a 2D point to a polygon (+ outside) */
const polyDist = (p, P) => { let m = Infinity; for (let i = 0; i < P.length; i++) m = Math.min(m, segDist(p, P[i], P[(i + 1) % P.length])); return inPoly(p, P) ? -m : m; };
const ok = (c, detail) => ({ ok: !!c, detail });

// ---------------------------------------------------------------- F22 (LEZ-53-160)
export const plateOnF22 = () => { const aft = PLATE.s1, gap = F22_FWD - aft, land = E.plate.yi - F22G.halfW, bot = plateBot(aft), low = F22G.lowAt(E.plate.yo);
  return ok(gap >= 0.02 && gap <= 0.06 && land >= 0.10 && bot >= low - 0.02, `aft edge FS ${fx(aft, 3)}, ${fx(gap, 3)} in flox to F22's doubler face FS ${fx(F22_FWD, 4)}; land outside the notch ${fx(land, 3)} in; bottom WL ${fx(bot)} vs F22 edge ${fx(low)} at BL ${fx(E.plate.yo)}`); };
export const landClear = () => { const hs = F22G.holes.filter((h) => Math.abs(h.y) + h.r > E.plate.yi - 0.10 && Math.abs(h.y) - h.r < E.plate.yo + 0.10 && h.z < 39.6 + 0.25 && h.z > plateBot(PLATE.s1));
  return ok(!hs.length, hs.length ? `holes on the plate land: ${hs.map((h) => `${h.what} BL ${fx(h.y)} WL ${fx(h.z)}`).join('; ')}` : `no F22 pass-through within 0.10 in of the RH or LH plate land (the 1 in BID tapes are notched round any hole beside it) (BL ${fx(E.plate.yi)}–${fx(E.plate.yo)})`); };
export const throughF22 = (pn, y, z, r) => { const h = F22G.holes.find((q) => Math.hypot(q.y - y, q.z - z) + r <= q.r + 1e-6);
  return ok(!!h, h ? `${pn} at BL ${fx(y)}, WL ${fx(z)} (r ${fx(r, 3)}) inside F22 hole Ø${fx(2 * h.r, 3)} at BL ${fx(h.y)}, WL ${fx(h.z)} (radial ${fx(h.r - r - Math.hypot(h.y - y, h.z - z), 3)})` : `${pn} has no F22 hole at BL ${fx(y)}, WL ${fx(z)}`); };
// ---------------------------------------------------------------- the shell (LEZ-53-150)
export const plateOnSkin = () => { let m = Infinity, w = 0; for (let f = PLATE.s0; f <= PLATE.s1; f += 0.5) { const d = plateBot(f) - (skinZ(f, E.plate.yo) + E.tsh), d2 = plateBot(f) - (skinZ(f, E.plate.yi) + E.tsh); m = Math.min(m, d, d2); w = Math.max(w, d, d2); }
  return ok(m >= 0 && w <= 0.15, `plate bottom ${fx(m, 3)}–${fx(w, 3)} in above the inner skin at BL ${fx(E.plate.yi)} and ${fx(E.plate.yo)} (flox bed)`); };
export const discsInside = () => { const yo = E.plate.yo + 0.25, O = E.O; let m = Infinity; for (let k = 0; k < 36; k++) { const f = O[1] + DISC.r * Math.cos(k * Math.PI / 18), z = Math.max(O[2] + DISC.r * Math.sin(k * Math.PI / 18), DISC.flat()); m = Math.min(m, z - (skinZ(f, yo) + E.tsh)); }
  return ok(m >= 0.05, `NG-8 disc (flatted at WL ${fx(DISC.flat())}) ≥ ${fx(m, 3)} in above the inner skin under its outer face, BL ${fx(yo)}`); };
// ---------------------------------------------------------------- block A: ballast (LEZ-08-100/105)
export const sweptNG6 = () => { let fmin = Infinity; for (let p = NG.phi0; p <= NG.phi1 + 1e-9; p += 0.5) for (const u of [NG6.u0, 0.10]) for (const n of [NG6.lip[0], -NG6.n, NG6.n]) fmin = Math.min(fmin, SP(u, n, 0, p)[1]);
  for (const u of DSTOP.bar.u) for (const n of DSTOP.bar.n) fmin = Math.min(fmin, SP(u, n, 0, NG.phi0)[1]); return fmin; };
export const ballastClear = () => { const aft = NB.s * IN + NB.t / 2, f = Math.min(sweptNG6(), SWEEP().fwd.f), floorGap = NB.floor - PLATE.cap, slabEnd = NBG.p0 !== undefined ? NB.s * IN + NB.t / 2 + NBG.p0 + NBG.plateL : 9.79;
  return ok(f - aft >= 0.25 && floorGap >= 0.10 && PLATE.sCap >= slabEnd, `swept NG-6 and down-stop forward edge FS ${fx(f)} vs ballast bulkhead aft face ${fx(aft)} (${fx(f - aft)} in); plate top WL ${fx(PLATE.cap)} under the lead floor WL ${fx(NB.floor)} forward of FS ${fx(PLATE.sCap)} (lead ends FS ${fx(slabEnd)})`); };
// ---------------------------------------------------------------- the stops: clear through the swing, in contact at the end
const bodyPts = () => { const o = []; for (let u = NG6.u0; u <= NG6.u1; u += 0.05) o.push([u, -NG6.n], [u, NG6.n]); for (let n = -NG6.n; n <= NG6.n; n += 0.05) o.push([NG6.u0, n], [NG6.u1, n]);
  for (let u = NG6.u0; u <= 0.10; u += 0.05) o.push([u, NG6.lip[0]]); for (let n = NG6.lip[0]; n <= NG6.lip[1]; n += 0.05) o.push([NG6.u0, n], [0.10, n]);
  for (let u = 0.6; u <= E.Ls; u += 0.1) { const t = secIn(u).t / 2; o.push([u, t], [u, -t]); } for (let u = NG3.u0; u <= NG3.u1; u += 0.05) { const t = secIn(u).t / 2 + NG3.wall; o.push([u, t], [u, -t]); }
  for (let u = NG3.ear[0]; u <= NG3.ear[1]; u += 0.05) o.push([u, E.cn + 0.40]); return o; };
const stopPoly = (S, phi) => { const q = (u, n) => { const p = SP(u, n, 0, phi); return [p[1], p[2]]; }; return [q(S.u[0], S.n[0]), q(S.u[1], S.n[0]), q(S.u[1], S.n[1]), q(S.u[0], S.n[1])]; };
export function stopSweep(S, phiS) {
  const polys = [stopPoly(S.pad, phiS), stopPoly(S.bar, phiS)], pts = bodyPts(); let clear = Infinity, at = 0, pen = Infinity;
  for (let p = NG.phi0; p <= NG.phi1 + 1e-9; p += 0.25) { if (Math.abs(p - phiS) < 0.5) continue; for (const [u, n] of pts) { const w = SP(u, n, 0, p); if (Math.min(...polys.map((P) => polyDist([w[1], w[2]], P))) < 0) pen = Math.min(pen, p); } if (Math.abs(p - phiS) < 5.0) continue; for (const [u, n] of pts) { const w = SP(u, n, 0, p), d = Math.min(...polys.map((P) => polyDist([w[1], w[2]], P))); if (d < clear) { clear = d; at = p; } } }
  let contact = Infinity; for (const [u, n] of pts) { const w = SP(u, n, 0, phiS); contact = Math.min(contact, polyDist([w[1], w[2]], polys[0])); }
  return { clear, at, contact, pen };
}
export const stopCheck = (which) => { const S = which === 'down' ? DSTOP : USTOP, phi = which === 'down' ? NG.phi0 : NG.phi1, r = stopSweep(S, phi);
  return ok(r.clear >= 0.05 && Math.abs(r.contact) <= 0.01 && r.pen === Infinity, `${which}-stop: no penetration anywhere in the swing; ≥ ${fx(r.clear, 3)} in from the strut, NG-6 and NG-3 once 5° off it (closest at ${fx(r.at, 1)}°; the gap opens from contact); in contact (${fx(r.contact, 3)} in) at ${fx(phi, 1)}°`); };
// the spring link (capsule r 0.55) against both stop bars through the stroke
export const linkVsStops = () => { const polys = [stopPoly(DSTOP.bar, NG.phi0), stopPoly(USTOP.bar, NG.phi1), stopPoly(USTOP.pad, NG.phi1)]; let m = Infinity;
  for (const r of KIN.rows) { const B = B_at(r.a), C = C_at(r.phi), b = [B[0] * IN, B[2] * IN], c = [C[0] * IN, C[2] * IN]; for (const P of polys) for (const v of P) m = Math.min(m, segDist(v, b, c) - LINK.cartR); }
  return ok(m >= 0.10, `spring link (r ${LINK.cartR}) to the stop bars and pads ≥ ${fx(m, 3)} in over the stroke (corner sampling)`); };
// ---------------------------------------------------------------- S12 (LEZ-32-216) and its finger (LEZ-32-212)
const swBox = (only) => { const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity], at = [NOSE_SW[1] * IN, NOSE_SW[0] * IN, NOSE_SW[2] * IN];   // own x → BL, y → FS, z → WL
  for (const p of SW_P.prims.filter((q, i) => !only || only.includes(i))) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], at[k] + p.c[k] - p.d[k] / 2); hi[k] = Math.max(hi[k], at[k] + p.c[k] + p.d[k] / 2); } return { lo, hi, at }; };
export const s12Sense = () => { const lever = swBox().at[2] + SW_P.prims[1].c[2] + SW_P.prims[1].d[2] / 2, f0 = FINGER(), r = SWF.rod * IN, press = lever - (f0[1] - r), crit = KIN.ad + KIN.dir * 2.0, f1 = SWF.at(crit), rel = (f1[1] * IN - r) - lever, dc = KIN.ad + KIN.dir * NG.beta, f2 = SWF.at(dc), relDC = (f2[1] * IN - r) - lever;
  return ok(press >= 1 / 32 - 1e-6 && rel >= 1 / 32 && relDC > rel, `DOWN: finger ${fx(press, 3)} in into the lever (C–NO made, C–NC open); 2° of crank (1/4 turn of the panel crank) off DOWN it is ${fx(rel, 3)} in clear and ${fx(relDC, 3)} in at dead centre (${NG.beta}°): released, C–NC made, whenever the gear is not locked down`); };
export const s12Clear = () => { const bx = [0, 2, 3].map((i) => swBox([i])), { lo } = swBox(), r = SWF.rod * IN; let m = Infinity;
  for (const row of KIN.rows) { if (Math.abs(row.a - KIN.ad) < 1.4) continue; const f = SWF.at(row.a), q = [f[0] * IN, f[1] * IN]; for (const b of bx) { const dx = Math.max(b.lo[1] - q[0], 0, q[0] - b.hi[1]), dz = Math.max(b.lo[2] - q[1], 0, q[1] - b.hi[2]); m = Math.min(m, Math.hypot(dx, dz) - r); } }
  // integration 2026-11-19: the Ø 1.75 cartridge of the die-spring stack is wider than the switch's lateral offset, so the link is
  // judged in 3D: the cartridge (and the clevis ears) swept over every crank row, against the switch box (was a lateral-offset test)
  const { hi } = swBox(), boxD = (q) => Math.hypot(...[0, 1, 2].map((k) => Math.max(lo[k] - q[k], 0, q[k] - hi[k])));
  let lat = Infinity; for (const row of KIN.rows) { const B = B_at(row.a), C = C_at(row.phi), b = [B[1] * IN, B[0] * IN, B[2] * IN], c = [C[1] * IN, C[0] * IN, C[2] * IN], L = Math.hypot(...b.map((v, k) => c[k] - v));
    for (let i = 0; i <= 48; i++) { const s = i / 48 * LINK.cart[1], q = b.map((v, k) => v + (c[k] - v) * s / L); lat = Math.min(lat, boxD(q) - (s < LINK.clev ? Math.hypot(LINK.clevY[1], LINK.clevW / 2) : s < LINK.cart[0] ? LINK.neckR : LINK.cartR)); } }
  return ok(m >= 0.03 && lat >= 0.10, `finger clear of the switch and bracket ≥ ${fx(m, 3)} in once off DOWN; switch BL ${fx(lo[0])}–${fx(hi[0])}: the spring link's clevis, neck (r ${LINK.neckR}) and cartridge (r ${LINK.cartR}) swept over the stroke ${fx(lat, 3)} in from it`); };
export const s12Host = () => { const { lo, at } = swBox(), base = SW_P.cuts.filter((c) => c.feat === 'base').map((c) => [at[0] + c.a[0], at[1] + c.a[1]]), sc = SHELF.screws.map((y) => [y, SHELF.screwF]), d = Math.max(...base.map((b, i) => Math.hypot(b[0] - sc[i][0], b[1] - sc[i][1])));
  return ok(Math.abs(lo[2] - SHELF.z) < 1e-3 && d < 1e-3, `bracket base WL ${fx(lo[2], 3)} on the shelf top WL ${fx(SHELF.z, 3)}; 2 × #6-32 tapped holes in the shelf at the bracket's holes (${fx(d, 4)} in)`); };
// ---------------------------------------------------------------- routes through the NG-30 plates
export const routesVsPlate = () => { const bad = [], y0 = E.plate.yi, y1 = E.plate.yo, P = PLATE.pts;
  for (const r of routes()) { const pts = r.pts || []; for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i]; for (let k = 0; k <= 40; k++) { const t = k / 40, s = (a[0] + t * (b[0] - a[0])) * IN, y = Math.abs(a[1] + t * (b[1] - a[1])) * IN, z = (a[2] + t * (b[2] - a[2])) * IN, rr = (r.dIn || 0.25) / 2;
    if (y + rr > y0 && y - rr < y1 && inPoly([s, z], P) && !inPoly([s, z], PLATE.lhole) && Math.hypot(s - SW_WIRE[0], z - SW_WIRE[1]) > 0.75) { bad.push(`${r.pn || r.part || r.id || r.name} at FS ${fx(s)}, BL ${fx(y)}, WL ${fx(z)}`); break; } } } }
  return ok(!bad.length, bad.length ? `inside the plate: ${[...new Set(bad)].slice(0, 4).join('; ')}` : `no routed line inside either plate; the S12 harness passes the RH plate in a Ø0.50 grommet at FS ${fx(SW_WIRE[0])}, WL ${fx(SW_WIRE[1])}`); };
// ---------------------------------------------------------------- block B: the crank sweep against the panel cut-outs (LEZ-31-100)
export const crankSweep = () => { const c = [NG.crank[1] * IN, NG.crank[2] * IN], R = NG.crankR * IN + 0.30, d = CUTS.map((C) => [C.id, cutDist(c, C) - R]), m = d.reduce((a, b) => (b[1] < a[1] ? b : a));
  return ok(m[1] >= 0.25, `knob sweep R ${fx(R)} (arm ${fx(NG.crankR * IN)} + knob 0.30) about BL ${fx(c[0])}, WL ${fx(c[1])} clears every LEZ-31-100 cut-out by ≥ ${fx(m[1])} in (closest: ${m[0]})`); };
export const flagWindow = () => { const C = CUTS.find((q) => q.id === 'flag'); return ok(C && C.pn === 'LEZ-32-214', C ? `flag behind the LEZ-31-100 window BL ${C.rect[0]}…${C.rect[1]}, WL ${C.rect[2]}…${C.rect[3]}` : 'no flag window'); };
// ---------------------------------------------------------------- inside the block
export const hubInFork = () => { const inner = E.FY - SZ.leg.b / 2, g = inner - WHEEL.hubY; return ok(g >= 0.05 && E.FY + SZ.leg.b / 2 + 0.45 > inner, `hub ±${fx(WHEEL.hubY)} between the axle bosses' inner faces ±${fx(inner, 3)}: ${fx(g, 3)} in each side for the AN960-1016 spacer washers`); };
export const tyreInFork = () => { const g = E.FY - SZ.leg.b / 2 - NG.tyreW * IN / 2, crown = Math.hypot(E.crownU - (E.Ls + NG.drop * IN), NG.trail * IN) - NG.R * IN - FORK.crownR; return ok(g >= 0.06 && crown >= 0.25, `tyre to fork legs ${fx(g, 3)} in each side; crown tube ${fx(crown)} in above the tyre`); };
export const housingSeat = () => { const g = E.plate.yi - HOUSING.y[1]; return ok(g > 0 && g <= 0.06, `housing mounting face BL ${fx(HOUSING.y[1])} on the RH plate inner face ${fx(E.plate.yi)} with a ${fx(g, 3)} in shim; 4 × AN4 into tapped bosses`); };
void strutPt; void DOOR; void d2r; void E_P;

// ================================================================ interface agent (phase 2): swept-body checks on the definition solids
import { DR } from '../parts/wpE1_nosegear.js';
import { F28, F28G } from '../parts/wpA1_f28.js';
import { NOSE_SLOT } from '../parts/wpE2_shell.js';
import { WELL, belly } from '../parts/wp11_nose_gear.js';
import { f22Layers } from '../parts/wp25_f22.js';
import { CNA } from '../parts/wp24_canard.js';
import { GEO } from '../structures.js';
import { partByPN, WIRES, equipByRef } from '../systems.js';
/** sample points on a definition primitive (in, aircraft frame) */
export function primSamples(p) {
  const o = [], lerp = (a, b, t) => a.map((x, i) => x + (b[i] - x) * t);
  if (p.t === 'loft') { for (let i = 0; i < p.secs.length; i++) { const s = p.secs[i]; for (let k = 0; k < s.length; k++) { const a = s[k], b = s[(k + 1) % s.length]; for (let t = 0; t < 1; t += 0.2) o.push(lerp(a, b, t)); } if (i) for (let f = 0.1; f < 1; f += 0.1) for (const [k, q] of s.entries()) o.push(lerp(p.secs[i - 1][k], q, f)); } }
  else if (p.t === 'box') { for (let i = 0; i <= 6; i++) for (let j = 0; j <= 6; j++) for (let k = 0; k <= 6; k++) { if (![i, j, k].some((q) => q === 0 || q === 6)) continue; o.push([0, 1, 2].map((m) => p.c[m] + ([i, j, k][m] / 6 - 0.5) * p.d[m])); } }
  else if (p.t === 'cyl') { const ax = p.b.map((x, i) => x - p.a[i]), L = Math.hypot(...ax) || 1e-9, u = ax.map((x) => x / L), t1 = Math.abs(u[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0], cr = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    let v = cr(u, t1); const lv = Math.hypot(...v); v = v.map((x) => x / lv); const w = cr(u, v), nL = Math.max(2, Math.ceil(L / 0.1));
    for (let i = 0; i <= nL; i++) { const c = lerp(p.a, p.b, i / nL); for (let j = 0; j < 24; j++) { const t = j / 24 * 2 * Math.PI; o.push(c.map((x, k) => x + p.r * (Math.cos(t) * v[k] + Math.sin(t) * w[k]))); } } }
  else if (p.t === 'xpoly') { const oth = [0, 1, 2].filter((k) => k !== p.ax); for (let n = 0; n <= 4; n++) { const e = p.e[0] + (p.e[1] - p.e[0]) * n / 4; for (let k = 0; k < p.pts.length; k++) { const a = p.pts[k], b = p.pts[(k + 1) % p.pts.length]; for (let t = 0; t < 1; t += 0.1) { const q = lerp(a, b, t), x = [0, 0, 0]; x[oth[0]] = q[0]; x[oth[1]] = q[1]; x[p.ax] = e; o.push(x); } } } }
  else if (p.t === 'torus') { const oth = [0, 1, 2].filter((k) => k !== p.ax); for (let i = 0; i < 48; i++) for (let j = 0; j < 12; j++) { const a = i / 48 * 2 * Math.PI, b = j / 12 * 2 * Math.PI, rr = p.R + p.r * Math.cos(b), x = [...p.c]; x[oth[0]] += rr * Math.cos(a); x[oth[1]] += rr * Math.sin(a); x[p.ax] += p.r * Math.sin(b); o.push(x); } }
  return o;
}
const SKIN = new Map();
/** OML height (in) on a 0.25 × 0.1 in grid (skinZ is the exact march; the swept checks need many points) */
const skinAt = (f, y) => { const i = Math.round(f * 4), j = Math.round(Math.abs(y) * 10), k = i * 1000 + j; if (!SKIN.has(k)) SKIN.set(k, skinZ(i / 4, j / 10)); return SKIN.get(k); };
const dCyl = (q, p) => { const ab = p.b.map((x, i) => x - p.a[i]), L2 = ab.reduce((s, x) => s + x * x, 0), t = Math.max(0, Math.min(1, q.reduce((s, x, i) => s + (x - p.a[i]) * ab[i], 0) / L2)); return Math.hypot(...q.map((x, i) => x - p.a[i] - ab[i] * t)) - p.r; };
const dBox = (q, lo, hi) => { const d = q.map((x, i) => Math.max(lo[i] - x, 0, x - hi[i])); const o = Math.hypot(...d); return o > 0 ? o : -Math.min(...q.map((x, i) => Math.min(x - lo[i], hi[i] - x))); };
/** the right door, open: its samples rotated about the torque-tube axis, as a box */
const openDoorBox = () => { const tube = E_P['LEZ-32-231'].prims.find((p) => p.g === 'tube'), z0 = (f) => tube.a[2] + (tube.b[2] - tube.a[2]) * (f - tube.a[1]) / (tube.b[1] - tube.a[1]), a = -DOOR.openDeg * d2r, y0 = tube.a[0];
  const P = E_P['LEZ-32-230'].prims.flatMap(primSamples).map((q) => { const dy = q[0] - y0, dz = q[2] - z0(q[1]); return [y0 + dy * Math.cos(a) + dz * Math.sin(a), q[1], z0(q[1]) - dy * Math.sin(a) + dz * Math.cos(a)]; });
  return { lo: [0, 1, 2].map((k) => Math.min(...P.map((q) => q[k]))), hi: [0, 1, 2].map((k) => Math.max(...P.map((q) => q[k]))) }; };
export const STRUT_BODY = ['LEZ-32-200', 'LEZ-32-203', 'LEZ-32-204', 'LEZ-32-205', 'LEZ-32-206', 'LEZ-32-207'];
const rotO = (q, dphi) => { const d = dphi * d2r, s = q[1] - E.O[1], z = q[2] - E.O[2]; return [q[0], E.O[1] + s * Math.cos(d) - z * Math.sin(d), E.O[2] + s * Math.sin(d) + z * Math.cos(d)]; };
let SW = null;
/** one pass over the swing (0.5° steps) of every strut-body primitive: notch, opening, plate, hinge-hardware and forward clearances */
export function SWEEP() {
  if (SW) return SW;
  const planes = [{ id: 'F22', s: GEO.F22 * IN, t: F22G.t, hw: F22G.halfW, top: F22G.chanTop }, { id: 'F28', s: F28.s * IN, t: F28.t, hw: F28G.halfW, top: F28G.chanTop }];
  const hw231 = E_P['LEZ-32-231'].prims.filter((p) => p.t === 'cyl' || p.t === 'box'), cables = E_P['LEZ-32-232'].prims.filter((p) => (p.g === 'cable' || p.g === 'fairlead') && p.a[0] > 0 && Math.max(p.a[1], p.b[1]) > 28), door = openDoorBox();
  const out = { notch: {}, slot: {}, plate: {}, hinge: {}, fwd: { f: Infinity } };
  const keep = (o, k, c, x, phi) => { if (!o[k] || c < o[k].c) o[k] = { c, x: x.map((v) => +v.toFixed(2)), phi }; };
  const pts = STRUT_BODY.flatMap((pn) => E_P[pn].prims.flatMap((p) => primSamples(p).map((q) => ({ k: `${pn}:${p.g}`, q }))));
  for (let phi = NG.phi0; phi <= NG.phi1 + 1e-9; phi += 0.5) for (const { k, q } of pts) {
    const x = rotO(q, phi - NG.phi0), y = Math.abs(x[0]), f = x[1], low = x[2] < belly(f / IN) * IN + 1.5, inSkin = !low || x[2] > skinAt(f, y);
    if (!inSkin) continue;
    if (f < out.fwd.f) out.fwd = { f, k, phi };
    for (const P of planes) if (Math.abs(f - P.s) <= P.t / 2) keep(out.notch, `${P.id} ${k}`, Math.min(P.hw - y, P.top - x[2]), x, phi);
    if (low && f >= NOSE_SLOT.s0 * IN && f <= NOSE_SLOT.s1 * IN && x[2] < skinAt(f, y) + E.tsh + 0.02) keep(out.slot, k, NOSE_SLOT.hw(f / IN) - y, x, phi);
    if (f > NG.box[0] * IN && f < F22_FWD) keep(out.plate, k, E.plate.yi - y, x, phi);
    if (f > 28.5 && y > 1.2 && x[2] < 27.5) { const xr = [y, f, x[2]];
      for (const p of hw231) keep(out.hinge, `${k} ↔ 231:${p.g}`, p.t === 'cyl' ? dCyl(xr, p) : dBox(xr, p.c.map((v, i) => v - p.d[i] / 2), p.c.map((v, i) => v + p.d[i] / 2)), x, phi);
      for (const p of cables) keep(out.hinge, `${k} ↔ 232:${p.g}`, dCyl(xr, p), x, phi);
      if (phi < NG.phi1 - NG.dwell * 0) keep(out.hinge, `${k} ↔ 230 open door`, dBox(xr, door.lo, door.hi), x, phi); } }
  return (SW = out);
}
const worst = (o) => Object.entries(o).reduce((a, b) => (!a || b[1].c < a[1].c ? b : a), null);
const at = (w) => (w ? `${w[0]} ${fx(w[1].c, 3)} in at BL ${w[1].x[0]}, FS ${w[1].x[1]}, WL ${w[1].x[2]} (${fx(w[1].phi, 1)}°)` : 'none');
/** the swept body of the named parts through the F22 and F28 notches (≥ 0.25 in) and inside the nose opening (≥ 1/16 in) */
export const sweepCheck = (pns = STRUT_BODY) => { const S = SWEEP(), f = (o) => Object.fromEntries(Object.entries(o).filter(([k]) => pns.some((pn) => k.includes(pn)))), n = worst(f(S.notch)), s = worst(f(S.slot));
  return ok((!n || n[1].c >= 0.25) && (!s || s[1].c >= 1 / 16), `swept ${fx(NG.phi0, 0)}→${fx(NG.phi1, 1)}°: notch (F22 ±${fx(F22G.halfW)} / F28 ±${fx(F28G.halfW)} to WL ${fx(F22G.chanTop)}) closest ${at(n)}; opening (LEZ-53-150 rev F cut) closest ${at(s)}`); };
/** fork, axle and wheel against the door tubes, brackets, spring, horn, cables and the open doors (≥ 1/8 in) */
export const hingeSweep = () => { const w = worst(SWEEP().hinge); return ok(w && w[1].c >= 0.125, `swept fork / wheel to the door hardware and the open door, closest ${at(w)}`); };
export const sweptForward = () => SWEEP().fwd;
/** LEZ-32-231 brackets: outer face on the well wall's inner face, the bushing inside the bracket */
export const bracketsOnWall = () => { const B = E_P['LEZ-32-231'].prims.filter((p) => p.g === 'bracket'), o = B.map((p) => p.c[0] + p.d[0] / 2 - WELL.halfW * IN), inner = Math.min(...B.map((p) => DOOR.hingeY * IN - DR.bushR - (p.c[0] - p.d[0] / 2)));
  return ok(o.every((v) => Math.abs(v) < 1e-3) && inner >= 0.02, `bracket outer faces on the wall's inner face BL ${fx(WELL.halfW * IN)} (${o.map((v) => fx(v, 3)).join(', ')}); inner face BL ${fx(DR.brkY)}, ${fx(inner, 3)} in of bracket inboard of the Ø${fx(2 * DR.bushR, 4)} bushing`); };
/** door notches against the brackets' FS spans */
export const doorNotches = () => { const D = E_P['LEZ-32-230'].prims, outer = D.filter((p) => Math.max(...p.secs[0].map((q) => q[0])) > DR.notchY + 0.01), spans = outer.map((p) => [p.secs[0][0][1], p.secs.at(-1)[0][1]]);
  let m = Infinity; for (const [g0, g1] of DR.brk) for (const [a, b] of spans) { if (b < g0 || a > g1) m = Math.min(m, a > g1 ? a - g1 : g0 - b); else m = -1; }
  return ok(m >= 0.05 - 1e-6, `door outer strips FS ${spans.map(([a, b]) => `${fx(a)}–${fx(b)}`).join(', ')}; brackets ${DR.brk.map(([a, b]) => `${fx(a)}–${fx(b)}`).join(', ')}; ≥ ${fx(m, 3)} in clear`); };
/** door outer edge 1/8 ± 1/32 inside the shell cut */
export const doorToCut = () => { const D = E_P['LEZ-32-230'].prims, yo = Math.max(...D.flatMap((p) => p.secs.flatMap((s) => s.map((q) => q[0])))), g = [DOOR.s0, DOOR.s1].map((s) => NOSE_SLOT.hw(s) - yo);
  return ok(g.every((v) => Math.abs(v - 0.125) <= 1 / 32 + 1e-6), `door outer edge BL ${fx(yo, 3)}; cut ±${fx(NOSE_SLOT.hw(DOOR.s0), 3)} → gap ${g.map((v) => fx(v, 3)).join(' / ')} in (1/8 ± 1/32)`); };
/** the shell cut no wider than the channel / well inner faces at any station, and the walls on the inner skin */
export const wellOnCut = () => { let m = Infinity, w = ''; for (let f = 22.25; f <= WELL.s1 * IN; f += 0.25) { const face = (f >= WELL.s0 * IN ? WELL.halfW : WELL.chan.halfW) * IN, d = face - NOSE_SLOT.hw(f / IN); if (d < m) { m = d; w = fx(f); } }
  let b = 0; for (const p of E_P['LEZ-32-220'].prims.filter((q) => q.t === 'xpoly' && q.ax === 0 && (q.g === 'well' || q.g === 'chan') && Math.abs(q.e[1] - q.e[0]) < 0.1)) { const y = Math.max(Math.abs(p.e[0]), Math.abs(p.e[1])); for (const [f, z] of p.pts) if (z < 32 && f > 22.3 && f < WELL.s1 * IN - 0.05) { const zb = skinZ(f, y) + E.tsh; if (z < zb + 0.5) b = Math.max(b, Math.abs(z - zb)); } }
  return ok(m >= -1e-6 && b <= 0.02, `shell cut inside the channel / well inner faces by ≥ ${fx(m, 3)} in (closest FS ${w}); wall feet on the inner skin within ${fx(b, 3)} in`); };
/** bumper base on the OML across its width */
export const bumperOnSkin = () => { const P = E_P['LEZ-32-225'].prims.find((p) => p.g === 'base'); let m = 0; for (const [f, z] of P.pts.slice(0, Math.ceil(P.pts.length / 2))) for (const y of [0, 0.4, 0.8]) m = Math.max(m, Math.abs(z - skinZ(f, y)));
  return ok(m <= 0.06, `base top on the OML at BL 0 / 0.4 / 0.8 within ${fx(m, 3)} in (bonded with flox, ≤ 1/16 in bed)`); };
/** canard F22 tab leg against the NG-30 plates on F22's forward face */
export const tabClear = () => { const t0 = GEO.canard.attachY * IN - CNA.w / 2, g = t0 - E.plate.yo; return ok(g >= 0.25, `canard tab BL ${fx(t0)}–${fx(t0 + CNA.w)} on F22's forward face, ${fx(g)} in outboard of the plates (BL ${fx(E.plate.yo)})`); };
/** F22's forward face as wpE1 types it = the face of F22's own layer stack */
export const f22Face = () => { const L = f22Layers(0), f = Math.min(...L.map((l) => l.y0)); return ok(Math.abs(f - F22_FWD) < 1e-4, `F22_FWD ${fx(F22_FWD, 4)} = F22 forward face (f22Layers, ${FIXED_NG()} BID doubler) ${fx(f, 4)}`); };
const FIXED_NG = () => f22Layers(0).filter((l) => l.name === 'ngF').length ? 'with its nose-gear' : 'no';
/** door cables through F22 at their own crossing */
export const cablesThroughF22 = () => { const C = E_P['LEZ-32-232'].prims.filter((p) => p.g === 'cable' && (p.a[1] - 22) * (p.b[1] - 22) < 0), r = C.map((p) => { const u = (22 - p.a[1]) / (p.b[1] - p.a[1]); return throughF22('door cable', p.a[0] + u * (p.b[0] - p.a[0]), p.a[2] + u * (p.b[2] - p.a[2]), p.r); });
  return ok(C.length === 2 && r.every((q) => q.ok), r.map((q) => q.detail).join('; ')); };
// ---------------------------------------------------------------- open items (owned by other or unfinished blocks): recorded, not failed
const open = (id, owner, what, now) => ({ id, with: owner, feature: 'open', what: `OPEN (${owner}): ${what}`, open: true, check: () => ({ ok: true, detail: `OPEN item, owner ${owner}: ${what}${now ? ` — today: ${now()}` : ''}` }) });
const OPEN_S12_SENSE0 = open('O1', 'I (LEZ-24-161 wiring)', 'S12 is made C–NO at DOWN and released (C–NC) whenever the gear is not locked down; the warning input must be grounded in the alarm state, so W4A22 goes to S12:T:NC and EQUIP S12 needs its NC pin', () => { const w = WIRES.find((x) => /^S12:/.test(x.to) && /A9/.test(x.from)); return `${w ? `${w.id} ${w.from} → ${w.to}` : 'no warning wire'}; S12 pins ${Object.keys(equipByRef('S12')?.conns?.T?.pins || {}).join('/')}`; });
const boxOf = (pn) => { const g = (partByPN(pn)?.geo || []).find((q) => q.t === 'box'); return g ? { lo: [g.c[1] - g.d[1] / 2, g.c[0] - g.d[0] / 2, g.c[2] - g.d[2] / 2].map((v) => v * IN), hi: [g.c[1] + g.d[1] / 2, g.c[0] + g.d[0] / 2, g.c[2] + g.d[2] / 2].map((v) => v * IN) } : null; };
const OPEN_BATTERY0 = open('O1', 'I (LEZ-24-110 battery)', 'the battery box must clear the LH door cam and follower (LEZ-32-232) by ≥ 0.25 in: move it aft or outboard', () => { const b = boxOf('LEZ-24-110'); if (!b) return 'no battery box'; let m = -9; for (const p of E_P['LEZ-32-232'].prims) for (const q of primSamples(p)) { const x = [-Math.abs(q[0]), q[1], q[2]]; m = Math.max(m, -dBox(x, b.lo, b.hi)); } return `LH door drive ${fx(m, 3)} in into the battery box (FS ${fx(b.lo[1])}–${fx(b.hi[1])}, BL ${fx(b.lo[0])}–${fx(b.hi[0])})`; });
const OPEN_FAIRLEAD0 = open('O2', 'A (LEZ-53-165 F28)', 'the door-cable fairleads sit in F28: F28 needs Ø0.50 fairlead holes (grommet seats) at the cable crossings instead of the cable clearance holes', () => { const p = E_P['LEZ-32-232'].prims.find((q) => q.g === 'fairlead'), aft = F28.s * IN + F28.t / 2, h = F28G.holes.find((q) => /32-232/.test(q.what) && q.u > 0); return `fairlead FS ${fx(Math.min(p.a[1], p.b[1]))}–${fx(Math.max(p.a[1], p.b[1]))} (r ${fx(p.r)}), ${fx(aft - Math.min(p.a[1], p.b[1]), 3)} in into F28's aft face FS ${fx(aft, 3)}; F28 hole r ${h ? fx(h.r, 3) : '—'} at BL ${h ? fx(h.u) : '—'}, WL ${h ? fx(h.v) : '—'}`; });
const OPEN_WORM_GROMMET0 = open('O1', 'A (LEZ-53-165 F28)', 'the worm shaft turns in F28\'s hole: a grommet or bushing needs ≥ 1/8 in radial (hole Ø ≥ 0.56 with a grommet)', () => { const h = F28G.holes.find((q) => /32-211/.test(q.what)), s = E_P['LEZ-32-211'].prims.find((q) => q.g === 'shaft' && q.b[1] > F28.s * IN); return h && s ? `hole r ${fx(h.r, 3)} on the shaft r ${fx(s.r, 4)}: ${fx(h.r - s.r, 3)} in radial` : 'no hole'; });
const OPEN_DISPLAY0 = open('O1', 'J (LEZ-31-110 and the panel units)', 'the unit faces J draws on FS 41.18 differ from B\'s LEZ-31-100 cut-outs (the crank sweep is checked against B\'s cut-outs, I1); the AXIS box must clear the crank shaft by ≥ 0.25 in', () => { const b = boxOf('LEZ-31-110'); if (!b) return 'no AXIS box'; let m = Infinity; for (const p of [...E_P['LEZ-32-214'].prims, ...E_P['LEZ-32-211'].prims]) for (const q of primSamples(p)) m = Math.min(m, dBox(q, b.lo, b.hi)); return `crank / worm shaft ${fx(m, 3)} in from the AXIS box (FS ${fx(b.lo[1])}–${fx(b.hi[1])}, WL ≥ ${fx(b.lo[2])})`; });

// final integration (2026-11-19): the open items above are met by their owners' changes; each is now a real check with the same
// measurement (ids kept so the records' interface lists are unchanged)
const realOf = (o, what, test) => ({ ...o, feature: o.feature === 'open' ? 'route' : o.feature, what, open: false, check: () => { const r = test(); return { ok: r.ok, detail: r.detail }; } });
/** the worm shaft through F22 at its own crossing (from the solid) */
export const wormThroughF22 = () => { const p = E_P['LEZ-32-211'].prims.find((q) => q.g === 'shaft' && (q.a[1] - 22) * (q.b[1] - 22) < 0); if (!p) return ok(false, 'no shaft crossing FS 22'); const u = (22 - p.a[1]) / (p.b[1] - p.a[1]); return throughF22('worm shaft', p.a[0] + u * (p.b[0] - p.a[0]), p.a[2] + u * (p.b[2] - p.a[2]), p.r); };

export const OPEN_S12_SENSE = realOf(OPEN_S12_SENSE0, 'S12 is made C–NO at DOWN and released (C–NC) whenever the gear is not locked down: block I\'s W4A22 on S12:T:NC (alarm grounded), S12 with its NC pin', () => { const w = WIRES.find((x) => /^S12:/.test(x.to) && /A9/.test(x.from)), pins = Object.keys(equipByRef('S12')?.conns?.T?.pins || {}); return { ok: !!w && w.to === 'S12:T:NC' && pins.includes('NC'), detail: `${w ? `${w.id} ${w.from} → ${w.to}` : 'no warning wire'}; S12 pins ${pins.join('/')}` }; });
export const OPEN_BATTERY = realOf(OPEN_BATTERY0, 'The battery box (block I LEZ-24-110) clears the LH door cam and follower by ≥ 0.25 in', () => { const b = boxOf('LEZ-24-110'); if (!b) return { ok: false, detail: 'no battery box' }; let m = -9; for (const p of E_P['LEZ-32-232'].prims) for (const q of primSamples(p)) { const x = [-Math.abs(q[0]), q[1], q[2]]; m = Math.max(m, -dBox(x, b.lo, b.hi)); } return { ok: m <= -0.25, detail: `LH door drive ${fx(-m, 3)} in clear of the battery box (FS ${fx(b.lo[1])}–${fx(b.hi[1])}, BL ${fx(b.lo[0])}–${fx(b.hi[0])})` }; });
export const OPEN_FAIRLEAD = realOf(OPEN_FAIRLEAD0, 'Each door-cable fairlead seats in a hole in F28 (block A LEZ-53-165 rev D): hole ≥ the fairlead body', () => { const p = E_P['LEZ-32-232'].prims.find((q) => q.g === 'fairlead'), h = F28G.holes.filter((q) => /32-232/.test(q.what) && q.kind === 'pass'); return { ok: h.length >= 2 && h.every((q) => q.r >= p.r + 0.005), detail: `fairlead r ${fx(p.r)}; F28 seats r ${h.map((q) => fx(q.r, 3)).join(' / ')} at BL ${h.map((q) => fx(q.u)).join(' / ')}` }; });
export const OPEN_WORM_GROMMET = realOf(OPEN_WORM_GROMMET0, 'The worm shaft turns in a grommet in F28: hole − shaft ≥ 1/8 in radial', () => { const h = F28G.holes.find((q) => /32-211/.test(q.what)), sh = E_P['LEZ-32-211'].prims.find((q) => q.g === 'shaft' && q.b[1] > F28.s * IN); return { ok: !!h && !!sh && h.r - sh.r >= 0.125 - 1e-9, detail: h && sh ? `hole r ${fx(h.r, 3)} on the shaft r ${fx(sh.r, 4)}: ${fx(h.r - sh.r, 3)} in radial (MS35489 grommet)` : 'no hole' }; });
export const OPEN_DISPLAY = realOf(OPEN_DISPLAY0, 'The AXIS box (block J LEZ-31-110) clears the crank and worm shaft by ≥ 0.25 in (the crank sweep is checked against B\'s cut-outs, I1)', () => { const b = boxOf('LEZ-31-110'); if (!b) return { ok: false, detail: 'no AXIS box' }; let m = Infinity; for (const p of [...E_P['LEZ-32-214'].prims, ...E_P['LEZ-32-211'].prims]) for (const q of primSamples(p)) m = Math.min(m, dBox(q, b.lo, b.hi)); return { ok: m >= 0.25, detail: `crank / worm shaft ${fx(m, 3)} in from the AXIS box (FS ${fx(b.lo[1])}–${fx(b.hi[1])})` }; });
