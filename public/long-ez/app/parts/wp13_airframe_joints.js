// WP13 — strake / wing / engine-section junction: how the three are joined.
//  • Wing to CS spar: three bolts per wing, as on the Long-EZ (two at the spar end, one inboard-lower) [LP] [CZ]. Here each
//    spar-end joint is a double-shear clevis: a 2024-T351 clevis block on the CS spar end, a 2024-T351 LWA plate lying flat
//    under the wing root spar cap (through-bolted to it), and a vertical AN bolt through plate and clevis tangs. The third bolt is a vertical drag / torsion link between a bracket on
//    the CS spar aft face and an angle in the wing-root jut-out. Sizes come from the iteration below (LEZ-sized, not plans
//    values; the plans and the builder's drawings govern a real airplane).
//  • Strake: skins bonded to the fuselage sides with flox and 2-ply BID tapes inside and out and a 3/4 in micro fillet;
//    skins lapped over the CS spar caps (the tank's aft wall is the spar's forward face) [EP]; end rib closed out with a
//    0.15 in gap to the wing root rib and a closed-cell foam seal, so the wing LE can flex without touching [CZ].
//  • Engine section: upper and lower cowls hinge-pinned to the firewall flange with continuous hinges [EZ practice, RV
//    practice]; a silicone seal strip on the cowl edge bears on the wing-root jut-out (0.12 in gap).
// Every load is FAR 23 limit × FS; fittings carry the FAR 23.625 fitting factor 1.15. Notional: not for construction.
import { GEO, BASE_MAT, FIXED, FT, registerChecks, mk, loadCases, surfaceLoads, DEFAULT_DESIGN, size, effective, DROP_FROM, ROOT_MIN, surfaceGeom, wingSec, strakeSec, wingRootSec, CS_FIT, fusAt, fusOutline, omlAt, materials, laminate, plyRF, psi, allowB } from '../structures.js';
import { defineParts, defineReqs, defineKeepouts, anBolt } from '../systems.js';
import { plyWeight } from '../plybook.js';

const S1 = (title, inspect) => ({ title, inspect });
const IN = 1 / 12, FF = 1.15, TGT = 0.15;
// AN bolt allowables (lb): single shear (MS20 table for alloy steel bolts, 125 ksi Fsu) and ultimate tension
// AN4 single shear 75 ksi × π/4 × 0.250² = 3,682 lb (src 'MIL-HDBK-5J table 2.3.1.0(c2) 125 ksi column, Fsu 75 ksi (files.engineering.com excerpt, accessed 2026-11-19)', derived)
export const AN_SHEAR = { 4: 3682, 5: 5750, 6: 8280, 7: 11250, 8: 14700, 9: 18700, 10: 23000 };
export const AN_TENS = { 4: 4080, 5: 6500, 6: 9450, 7: 12750, 8: 16400, 9: 20800, 10: 25600 };
// psi, 2024-T351 plate (e/D 2.0) A-basis: Fbru 117 (0.5–1.0 in; 119 at 0.25–0.499) and Fsu 38 ksi (0.25–0.499 in; 37 at 0.5–1.0): src 'MIL-HDBK-5H CN1
// table 3.2.3.0(b1), METU AE462 copy (accessed 2026-11-19)'; 6061-T6 extrusion Fbru (e/D 2.0) 82 ksi A-basis: src 'MIL-HDBK-5J table 3.6.2.0(g) (KasperCalc transcription, accessed 2026-11-19)'
const AL = { fbru2024: 117000, fsu2024: 38000, ftu2024: 64000, fbru6061: 82000 };
const FLOX = 1800, BID = { Fs: 13000, t: BASE_MAT.BID.t };   // psi; flox lap-shear allowable (ASSUMED), BID ±45 in-plane shear and ply t

// ------------------------------------------------------------------------------------------- geometry
const CS = GEO.csSpar, YJ = GEO.join.y, zU = CS_FIT.U, zL = CS_FIT.L;   // spar cap outer faces at the end
// LWA lug: a flat plate in the cap plane (W fore-aft × t vertical) whose inboard end is the lug; the clevis tangs lie above
// and below it, so the plate mid-plane depth from the skin face is set by the upper tang (skin inner face + tang + gap +
// t/2) or by the wing cap above the plate (cap + flox + t/2), whichever is deeper.
export const LUG = { W: 2.0, gap: 0.03, skin: 0.04, cap: 0.45, flox: 0.03, Kt: 0.75, eD: 2, bolt: 0.5, pitch: 4, bolt1: 1.0, yPin: YJ - 0.12 };   // yPin: the tang's outboard edge distance (2D) ends short of the 0.15 in joint gap
const midDepth = (t, tT) => Math.max(LUG.skin + tT + LUG.gap + t / 2, LUG.cap + LUG.flox + t / 2);   // in
export const ATTACH = {
  pinU: [CS.s, LUG.yPin, 0], pinL: [CS.s, LUG.yPin, 0], depth: 0,
  // aft of the spanwise runs that pass behind the spar (rudder conduit, wingtip and magnetometer harnesses); a low bracket
  // along the bottom skin reaches it from the spar face underneath them
  drag: [GEO.firewall + 0.50, 2.20, 0]   /* BL 26: the clear band from a sweep of every route, both sides */, dragZ: [0, 0],
};
{ const lo = omlAt(ATTACH.drag[0], ATTACH.drag[1]).lo + 0.025; ATTACH.drag[2] = lo + 0.05; ATTACH.dragZ = [lo - 0.012, lo + 0.17]; ATTACH.zLo = lo; }   // on the local lower skin
function setPins(p) { ATTACH.depth = p; ATTACH.pinU[2] = zU - p * IN; ATTACH.pinL[2] = zL + p * IN; ATTACH.h = (ATTACH.pinU[2] - ATTACH.pinL[2]) * 12; }   // h: in, pin couple depth
ATTACH.arm = (ATTACH.drag[0] - CS.s) * 12;                                 // in, spar pins to the drag bolt (fore-aft)
ATTACH.armY = (LUG.yPin - ATTACH.drag[1]) * 12;                            // in, spanwise offset

// ------------------------------------------------------------------------------------------- root loads
/** limit loads at the wing root (BL join.y): vertical shear V, bending Mx, torsion T; chordwise (drag) load ASSUMED
 *  ±0.15 V acting at 40 % of the panel span (gives the drag moment about the root) */
export const CHORD = { k: 0.15, at: 0.4 };   // chordwise load k·|V| at this fraction of the panel span: carried as a BOUND
export function rootLoads(d, lc, k = CHORD.k) {
  const L = surfaceLoads('wing', d, lc); if (!L) return null;
  const r = L.at(YJ), Fx = k * Math.abs(r.V), arm = CHORD.at * (GEO.wing.tipY - YJ) * 12;
  return { V: r.V, Mx: r.Mx, T: r.T, Fx, Md: Fx * arm };
}
/** bolt and fitting forces (limit) from the root loads */
export function fittingForces(R) {
  const Pc = Math.abs(R.Mx) / ATTACH.h;                       // cap couple → spanwise shear on each spar pin
  const R3 = Math.abs(R.T) / ATTACH.arm;                       // torsion → vertical couple: drag bolt vs spar pins
  const Fy3 = R.Md / ATTACH.arm;                               // drag moment → spanwise couple: drag bolt vs spar pins
  const pin = Math.hypot(Pc + Fy3 / 2, (Math.abs(R.V) + R3) / 2);
  const drag = { shear: Math.hypot(R.Fx, Fy3), tension: R3 };
  return { Pc, R3, Fy3, pin, drag };
}
/** the chordwise (drag) load is ASSUMED at 0.15 V: the largest ratio k for which a joint with this ultimate allowable
 *  still shows MS ≥ 0, so the assumption is carried as a bound rather than a guess */
export function chordBound(R, allow, FSf) {
  const P = allow / FSf, arm = 0.4 * (GEO.wing.tipY - YJ) * 12, Pc = Math.abs(R.Mx) / ATTACH.h, Vt = (Math.abs(R.V) + Math.abs(R.T) / ATTACH.arm) / 2;
  if (P <= Vt) return 0;
  const Fy3 = 2 * (Math.sqrt(P * P - Vt * Vt) - Pc); return Math.max(0, Fy3 * ATTACH.arm / (Math.abs(R.V) * arm));
}
export const chordIn = (R, allow, FSf) => ['Chordwise load ratio (× V at 40 % of the panel span)', 0.15, '', `BOUND: MS stays ≥ 0 up to ${chordBound(R, allow, FSf).toFixed(2)}`];
// ------------------------------------------------------------------------------------------- sizing iteration
const PLATES = [0.25, 0.3125, 0.375, 0.4375, 0.5, 0.625];
function sizeAttach(d = DEFAULT_DESIGN) {
  let worst = null;
  for (const lc of loadCases(d)) { const R = rootLoads(d, lc); if (!R) continue; const f = fittingForces(R); if (!worst || f.pin > worst.f.pin) worst = { lc: lc.id, R, f }; }
  let wd = null;
  for (const lc of loadCases(d)) { const R = rootLoads(d, lc); if (!R) continue; const f = fittingForces(R); const u = Math.hypot(f.drag.shear, f.drag.tension); if (!wd || u > wd.u) wd = { lc: lc.id, R, f, u }; }
  const Pu = worst.f.pin * d.FS * FF * (1 + TGT), net = (D, t) => (LUG.W - D) * t * AL.ftu2024 * LUG.Kt;
  // pin sizes the installation (wp16) has sourced hardware for (thread term, AN960 washers, torque): AN10 only among the sizes
  // that can carry the root pin. 2026-11-21 (flap() fix): the lower aileron loads would pick AN9, which has no sourced
  // washer / thread / torque data in the model, so the pin stays AN10 (stronger; plates and tangs re-size around it)
  const PIN_OK = [10], pin = +Object.keys(AN_SHEAR).filter((k) => PIN_OK.includes(+k)).find((k) => 2 * AN_SHEAR[k] >= Pu);
  if (!Number.isFinite(pin)) throw new Error(`sizeAttach: no pin size in ${PIN_OK.map((n) => 'AN' + n).join(', ')} carries ${Pu.toFixed(0)} lb in double shear (add the hardware data for a larger size to wp16)`);
  const D_ = pin / 16, plate = PLATES.find((t) => D_ * t * AL.fbru2024 >= Pu && net(D_, t) >= Pu) || PLATES.at(-1), tang = PLATES.find((t) => 2 * D_ * t * AL.fbru2024 >= Pu && net(D_, 2 * t) >= Pu) || PLATES.at(-1);
  const ds = wd.f.drag.shear * d.FS * FF * (1 + TGT), dt = wd.f.drag.tension * d.FS * FF * (1 + TGT);
  const drag = +Object.keys(AN_SHEAR).find((k) => Math.hypot(ds / AN_SHEAR[k], dt / AN_TENS[k]) <= 1);   // single shear: the bracket's lug laps the wing angle
  const hOld = (zU - zL) * 12 - 2 * 0.55, Pold = worst.f.pin * d.FS * FF * ATTACH.h / hOld;   // iteration 3's pin load (≈, cap couple scaled to its depth)
  const log = [
    { it: 1, desc: 'Model as first drawn: 3 × 1/2 in bolts per cap into the laminate, no defined wing-root fittings', note: 'no load path at the root rib; strake overlapped the wing' },
    { it: 2, desc: 'Public layout (3 bolts per wing): 1/2 in pins in 1/4 in LWA plates', ms: (0.5 * 0.25 * AL.fbru2024) / Pold - 1 },
    { it: 3, desc: 'Fore-aft AN9 pins 0.55 in inside the skin through 5/8 in vertical LWA plates 1.02 in deep, sized for pin shear and bearing only', ms: Math.min(2 * AN_SHEAR[9], 0.5625 * 0.625 * AL.fbru2024) / Pold - 1 },
    { it: 4, desc: 'Pilot definition pass (LEZ-57-142) added lug net tension: that plate failed it around its 0.5625 in hole', ms: (1.02 - 0.5625) * 0.625 * AL.ftu2024 * LUG.Kt / Pold - 1 },
    { it: 5, desc: `Lugs moved into the cap plane: ${LUG.W} in wide plates, vertical AN${pin} pins, LWA plate ${plate} in and tangs 2 × ${tang} in sized for bearing and net tension; pin depth ${ATTACH.depth.toFixed(2)} in, drag bolt AN${drag}`, ms: Math.min(2 * AN_SHEAR[pin], D_ * plate * AL.fbru2024, net(D_, plate)) / (worst.f.pin * d.FS * FF) - 1 },
  ];
  return { pin, plate, tang, drag, worst, wd, log, Pu };
}
// pin depth depends on the plate and tang thickness, and the loads on the depth: iterate to a fixed point
export const ATT = (() => { let p = midDepth(0.625, 0.3125), a = null;
  for (let k = 0; k < 8; k++) { setPins(p); a = sizeAttach(); const p2 = midDepth(a.plate, a.tang); if (Math.abs(p2 - p) < 1e-9) break; p = p2; }
  return a; })();

// ------------------------------------------------------------------------------------------- wing-root jut-out (mass)
/** planform, skin and core of the jut-out: the wing panel's inboard extension aft of the CS spar, root rib to the cowl side */
export const JUT = (() => {
  let area = 0, volCore = 0; const dy = 0.02;
  for (let y = 1.0; y < YJ; y += dy) { const q = wingRootSec(y + dy / 2, GEO.join.gap); let a = 0, v = 0; const ds = q.c / 40;
    for (let k = 0; k < 40; k++) { const s = q.le + (k + 0.5) * ds, f = fusAt(s); if (Math.abs(y + dy / 2) < f.w / 2 + GEO.join.cowlGap) continue; const m = omlAt(s, y + dy / 2); if (!m) continue; a += ds; v += ds * (m.up - m.lo); }
    area += a * dy; volCore += v * dy; }
  const skinLb = 2 * area * 2 * 0.104, coreLb = volCore * 2.0, closeLb = 0.25;   // 2 BID top and bottom; 2 lb/ft³ Styrofoam; root and front close-outs
  return { area, volCore, mass: skinLb + coreLb + closeLb, skinLb, coreLb };
})();

// ------------------------------------------------------------------------------------------- parts
const COMMON = { kind: 'machined', massItem: 'wings' };
const sgs = [-1, 1], by = (sg, y) => sg * y;
/** gap seal (LEZ-57-152): a 1/4 in weatherstrip whose centre line runs this far (ft) inside the skin */
export const SEAL = { inset: 0.20 / 12, dIn: 0.25, y: YJ + GEO.join.gap / 2 };   // centre 0.20 in inside the skin: a 1/4 in strip clears the skin (0.026) and the LWA lugs
// ------------------------------------------------------------------------------------------- root joint (LEZ-57-152)
/** the two close-out ribs facing each other across the joint gap and the seal strip between them (inches, lb) */
export const RJ = (() => {
  const sect = (F, xs) => { const n = 60, pts = []; for (let i = 0; i <= n; i++) { const s = xs[0] + (xs[1] - xs[0]) * i / n, m = F(s); if (m) pts.push([s, m.up, m.lo]); } let a = 0, per = 0;
    for (let i = 1; i < pts.length; i++) { const ds = (pts[i][0] - pts[i - 1][0]) * 12; a += ds * ((pts[i][1] - pts[i][2]) + (pts[i - 1][1] - pts[i - 1][2])) / 2 * 12; per += Math.hypot(ds, (pts[i][1] - pts[i - 1][1]) * 12) + Math.hypot(ds, (pts[i][2] - pts[i - 1][2]) * 12); }
    return { a, per, pts }; };
  const q = strakeSec(YJ), w = wingSec(YJ), yS = YJ - GEO.join.gap;
  const end = sect((s) => omlAt(s, yS), [q.le + 1e-4, GEO.firewall - 1e-4]);                         // strake end rib: the strake section, LE to the CS spar
  const root = sect((s) => { const x = (s - w.le) / w.c; if (x < 0 || x > 1) return null; return omlAt(s, YJ + 1e-6); }, [w.le + 1e-4, GEO.firewall - 1e-4]);   // wing root rib: LE to the spar's aft face
  const bid2 = (a) => plyWeight('BID', a / 144, 2);   // 2 plies, lb
  const seal = { w: 0.25, t: 0.25, rho: 9.0 / 1728 };   // closed-cell neoprene sponge strip 1/4 × 1/4 in, ~9 lb/ft³
  const sealL = end.per * 0.98;
  const lines = [
    { std: '6781, 2 plies ±45', qty: 1, each: +bid2(root.a).toFixed(3), desc: `Wing root rib close-out: the panel section at BL ${(YJ * 12).toFixed(1)}, LE to the CS spar aft face, ${root.a.toFixed(1)} in², recessed 0.7 in at the skins` },
    { std: 'Closed-cell neoprene sponge strip 1/4 × 1/4 in, adhesive-backed', qty: 1, each: +(sealL * seal.w * seal.t * seal.rho).toFixed(3), desc: `Gap seal on the strake end rib, ${sealL.toFixed(1)} in round the section, ${(SEAL.inset * 12).toFixed(2)} in inside the skin` },
  ];
  return { end, root, seal, sealL, lines, mass: lines.reduce((a, l) => a + l.qty * l.each, 0), yS };
})();
const SEAL_INSET_IN = 0.18;   // y: centred in the strake-end / wing-root gap
// CS spar end (LEZ-57-140), inches. The clevis tail lies under the CS spar cap, so the cap splits around it at the spar
// end: the outer cap plies run over the tail to the clevis web face, a quasi-isotropic BID pad (0/90 and ±45 alternating) lies under the tail, and the cap bolts
// take the tail in double shear between the two. A BID filler block, stepped 1:10, fills the space between the pad and
// the cap inboard of the tail end and carries the pad's share up into the cap. The cap plies the moment no longer needs
// drop off inboard (wp15_cs_spar.js), so only as many plies reach the end as fit over the tail.
//  • first-bolt share: three bolts in a row between a metal tail and a laminate of about the same axial stiffness put
//    about 40 % of the load on each end bolt (carried as a bound in the checks)
//  • shear-out is checked on e − D/2 with the laminate's own ply strengths (plyRF), the bearing on the whole stack
export const SPAR_PLATES = [0.25, 0.3125, 0.375, 0.4375, 0.5, 0.625];
/** a laminate end bolted to a fitting plate with 3 × AN8 in double shear: the cap splits around the plate. nTop UNI (plus
 *  the skin / wrap) run over it, a quasi-isotropic BID pad lies under it, and (wing roots) the cap plies that do not fit
 *  over the plate run on under the pad. Sizes the pad for bearing and the first bolt's distance from the laminate end for
 *  shear-out. b: cap width (in); nCap: cap plies at the end; skin: BID plies over the cap. */
export function endJoint({ b, nCap = 0, skin = 2, nPadMin = 2, tMin = 0 }) {
  const d = DEFAULT_DESIGN, M = materials(d), tU = M.UNI.t, tB = M.BID.t, flox = LUG.flox, wrap = skin, nB = 3;
  const Pu = ATT.worst.f.pin * d.FS * FF, share = 0.40, D = LUG.bolt, Fbru = psi(M.UNI.Fbru);
  // the plate: thinnest standard plate that carries the pin load in bolt bearing and net section and keeps its top
  // under the cap room LUG.cap (+ bond line)
  const tMax = 2 * (ATTACH.depth - LUG.cap - flox), netT = (t) => (LUG.W - D) * t * AL.ftu2024 * LUG.Kt;
  // tMin (2026-11-21): the plate is one part with two sizings (the pin lug, ATT.plate; the cap bolts, here): it takes the thicker
  if (tMin > tMax + 1e-6) throw new Error(`endJoint: the plate must be ≥ ${tMin} in (lug sizing) but only ${tMax.toFixed(4)} in fits under the cap at the pin depth`);   // review 2026-11-21: fail loudly, not fall back thinner
  const tail = SPAR_PLATES.find((t) => t >= tMin - 1e-9 && t <= tMax + 1e-9 && nB * D * t * AL.fbru2024 >= Pu * (1 + TGT) && netT(t) >= Pu * (1 + TGT)) || SPAR_PLATES.filter((t) => t <= tMax + 1e-9).at(-1);
  const room = ATTACH.depth - tail / 2 - flox, nTop = Math.min(nCap || Infinity, Math.floor((room - wrap * tB) / tU + 1e-9));
  const stack = (nU, nBd) => [...Array.from({ length: nU }, () => ({ mat: 'UNI', angle: 0 })), ...Array.from({ length: nBd }, () => ({ mat: 'BID', angle: 45 }))];
  const top = stack(nTop, wrap), tTop = laminate(top, M).h, nUnder = Math.max(0, nCap - nTop), under = stack(nUnder, 0), tUnder = nUnder ? laminate(under, M).h : 0;
  const Pb = share * Pu, brgMS = (n) => Fbru * D * (tTop + n * tB + tUnder) / Pb - 1;
  let nPad = nPadMin; while (brgMS(nPad) < TGT && nPad < 200) nPad += 1;
  const qi = (n) => Array.from({ length: n }, (_, i) => ({ mat: 'BID', angle: i % 2 ? 45 : 0 }));   // pad and filler alternate 0/90 and ±45 (quasi-isotropic)
  const pad = qi(nPad), tPad = laminate(pad, M).h, tTot = tTop + tPad + tUnder;
  const lams = [['cap over the plate', top, tTop], ['pad', pad, tPad], ...(nUnder ? [['cap under the pad', under, tUnder]] : [])];
  const shearOut = (e) => { const L = e - D / 2; let w = null;
    for (const [nm, lam, t] of lams) { const r = plyRF(lam, [0, 0, Pb * t / tTot / (2 * L)], M); if (!w || r.rf < w.rf) w = { rf: r.rf, mode: `shear-out of the ${nm} (${r.mode})`, lam: nm }; }
    return w; };
  let bolt1 = 1.0; while (shearOut(bolt1).rf - 1 < TGT && bolt1 < 6) bolt1 += 0.25;
  const rise = tail + 2 * flox, nFill = Math.round(rise / tB), ramp = 10;
  const Fpad = Pu * tPad / tTot, ils = psi(M.UNI.ILSS), Lov = Math.ceil(Fpad * (1 + TGT) / (b * ils) * 2) / 2;
  return { tU, tB, flox, wrap, Pu, share, D, b, Fbru, tail, tMax, room, nTop, top, tTop, nUnder, under, tUnder, nPad, pad, tPad, tTot, lams, bolt1, rise, nFill, ramp, Lov, Fpad, Kh: 0.75, nB, shearOut, brgMS, M, qi };
}
export const SPAR_END = (() => {
  const J = endJoint({ b: GEO.csSpar.cap }), tU = J.tU, tB = J.tB;
  const log = [
    { it: 1, desc: 'As first modelled: 32 × HTS40 cap plies plus a 50-ply 6781 doubler in bearing at the bolts, single shear', note: `${(32 * tU + 56 * tB).toFixed(3)} in of laminate where ${J.room.toFixed(3)} in fits over the clevis tail` },
    { it: 2, desc: `Split cap: ${J.nTop} × HTS40 over the tail, ${J.nPad} × 6781 pad under it, tail in double shear; bolt 1 at 1.0 in from the clevis web (as clevis rev A)`, ms: J.shearOut(1.0).rf - 1 },
    { it: 3, desc: `Bolt 1 moved to ${J.bolt1.toFixed(2)} in from the clevis web for laminate shear-out (clevis rev B at 2.25 in on typical allowables, rev C at 2.50 in on MTM45-1 × 0.8); quasi-isotropic pad; pad-to-cap overlap ${J.Lov.toFixed(1)} in`, ms: J.shearOut(J.bolt1).rf - 1 },
  ];
  return { ...J, log };
})();
// Wing root (LEZ-57-110): the same joint on the wing side. The LWA plate takes the place of the clevis tail: the wing's
// upper and lower caps split around it the same way, and the cap plies that do not fit over the plate run on under the pad.
export const WING_END = (() => {
  // both caps carry at least the plies that fill the room over the LWA plate to the root (2026-11-19: the thinner 7715 caps
  // no longer fill it, and the plate must lie at the pin depth, I2); the extra plies drop off past the joint
  { const y = GEO.wing.attachY; ROOT_MIN.wing = endJoint({ b: surfaceGeom('wing').sec(y).b, skin: FIXED.skinBID, tMin: ATT.plate }).nTop; }
  const Z = size(effective(DEFAULT_DESIGN)), y = GEO.wing.attachY, b = Z.wing.gm.sec(y).b;
  const n = (side) => Z.wing[side].filter((p) => p.y0 <= y + 1e-9 && p.y1 > y).length;
  // net section at the outboard bolt (the wing-end-net check in wp17: each laminate on its E·h·w share, pad b + 2 in wide; fibre
  // modes at ultimate, matrix modes at limit):
  // the pad grows past its bearing size until the net section holds the sizing reserve too (2026-11-19, thinner 7715 caps)
  const netRF = (J) => { const lams = J.lams.map(([nm, lam]) => ({ lam, L: laminate(lam, J.M), w: nm === 'pad' ? b + 2 : b })), EA = lams.reduce((a, x) => a + x.L.Ex * x.L.h * x.w, 0);
    return Math.min(...lams.map((x) => plyRF(x.lam, [J.Pu * (x.L.Ex * x.L.h * x.w / EA) / ((x.w - J.D) * J.Kh), 0, 0], J.M, { matrixAt: DEFAULT_DESIGN.FS }).rf)); };
  const sized = (nCap) => { let J = endJoint({ b, nCap, skin: FIXED.skinBID, tMin: ATT.plate }); while (netRF(J) < 1 + TGT && J.nPad < 200) J = endJoint({ b, nCap, skin: FIXED.skinBID, nPadMin: J.nPad + 1, tMin: ATT.plate }); return J; };
  const upper = sized(n('upper')), lower = sized(n('lower'));
  const bolt1 = Math.max(upper.bolt1, lower.bolt1);
  return { upper, lower, b, bPad: b + 2, bolt1, nU: n('upper'), nL: n('lower') };   // the pad runs 1 in past the cap each side
})();
/** pad / filler ramp: each BID ply steps this far past the one below (1:10 on the 7725 cured ply, 0.0113 in) */
export const PLY_STEP = +(WING_END.upper.ramp * WING_END.upper.tB).toFixed(4);
LUG.bolt1 = WING_END.bolt1;   // the LWA plate's first bolt from the wing root face (rev D: laminate shear-out)
{ // no cap ply may drop off inside the root joint: past the pad and the filler, plus 1 in
  const J = WING_END, plateEnd = LUG.bolt1 + 2 * LUG.pitch * LUG.bolt + LUG.eD * LUG.bolt, end = Math.max(...['upper', 'lower'].map((k) => plateEnd + PLY_STEP * Math.max(J[k].nPad, J[k].nFill)));
  DROP_FROM.wing = GEO.wing.attachY + (end + 1) / 12; }
// LWA plate, detail LEZ-57-142 (inches): u spanwise outboard from the pin centre, w fore-aft about the pin axis, v depth.
// One part number serves all four positions (upper and lower, L/R): the plan is symmetric about its centre line.
export const LWA = (() => {
  const D = ATT.pin / 16, e = LUG.eD * D, uRoot = (YJ - LUG.yPin) * 12, dB = LUG.bolt;
  const bolts = [0, 1, 2].map((i) => uRoot + LUG.bolt1 + i * LUG.pitch * dB);
  const u0 = -e, u1 = bolts.at(-1) + LUG.eD * dB, t = ATT.plate, W = LUG.W, rIn = 0.50, rOut = 0.25;
  const area = (u1 - u0) * W - Math.PI * (D / 2) ** 2 - bolts.length * Math.PI * (dB / 2) ** 2 - 2 * (1 - Math.PI / 4) * (rIn ** 2 + rOut ** 2);
  return { D, e, t, W, u0, u1, L: u1 - u0, bolts, dBolt: dB, rIn, rOut, uRoot, area, vol: area * t, mass: area * t * 0.1003, depth: ATTACH.depth };
})();
// Clevis block, detail LEZ-57-143 (inches): u spanwise outboard from the pin centre (tangs outboard, tail inboard), w fore-aft,
// v up from the bottom face. The tangs straddle the LWA plate; a web closes the slot; a tail the thickness of the plate runs
// inboard under the CS spar cap and is through-bolted to it, so the load path is cap → bolts → tail → web → tangs → pin.
// Symmetric top to bottom and side to side: one part number for all four positions.
export const CLV = (() => {
  const D = ATT.pin / 16, tT = ATT.tang, tP = ATT.plate, g = LUG.gap, W = LUG.W, dB = LUG.bolt;
  const e = LUG.eD * D, slotIn = LWA.e + 0.10, web = 0.75, H = tP + 2 * (g + tT), slot = tP + 2 * g;
  const uSlot = -slotIn, uWeb = uSlot - web;
  const bolts = [0, 1, 2].map((i) => uWeb - SPAR_END.bolt1 - i * LUG.pitch * dB);   // bolt 1 set by the spar cap's shear-out (SPAR_END)
  const u0 = bolts.at(-1) - LUG.eD * dB, u1 = e;
  const tMax = SPAR_END.tMax, tail = SPAR_END.tail;
  const rSlot = 0.06, rTail = 0.25, rTang = 0.50, rEnd = 0.25, k = 1 - Math.PI / 4;
  const side = 2 * tT * (u1 - uSlot) + H * web + tail * (uWeb - u0) + 2 * k * rSlot ** 2 + 2 * k * rTail ** 2;   // side profile area
  const vol = side * W - Math.PI * (D / 2) ** 2 * 2 * tT - bolts.length * Math.PI * (dB / 2) ** 2 * tail - 4 * k * rTang ** 2 * tT - 2 * k * rEnd ** 2 * tail;
  return { D, e, tT, tP, g, W, dB, H, slot, slotIn, web, uSlot, uWeb, bolts, u0, u1, L: u1 - u0, tail, tMax, rSlot, rTail, rTang, rEnd, vol, mass: vol * 0.1003 };
})();
/** Huth (1986) fastener flexibility for the spar-end pin: C = ((t1 + t2)/(2d))^a · (b/n) · (1/(t1·E1) + 1/(n·t2·E2) + 1/(2·t1·Eb) + 1/(2·n·t2·Eb)) */
export const HUTH = (() => { const d = ATT.pin / 16, t1 = LWA.t, t2 = CLV.tT, E = 10.7e6 /* 2024-T351 plate ≥ 0.25 in, MIL-HDBK-5H CN1 table 3.2.3.0(b1) */, Eb = 29e6, n = 2;
  const C = ((t1 + t2) / (2 * d)) ** (2 / 3) * (3.0 / n) * (1 / (t1 * E) + 1 / (n * t2 * E) + 1 / (2 * t1 * Eb) + 1 / (2 * n * t2 * Eb)); return { C, k: 1 / C }; })();
export const pinGeo = (p, sg, D, up) => { const h = (ATT.plate / 2 + LUG.gap + ATT.tang) / 12; void up; return { t: 'cyl', a: [p[0], by(sg, p[1]), p[2] - h], b: [p[0], by(sg, p[1]), p[2] + h], r: D / 24, mat: 'steel', colour: 0x8c96a3 }; };
const clevis = (p, sg) => {   // LEZ-57-143 clevis block, display stand-in: tangs, web and tail
  const y = (u) => LUG.yPin + u / 12, z = p[2], W = CLV.W / 12, tT = CLV.tT / 12, off = (CLV.slot + CLV.tT) / 24, c = { mat: '2024', colour: 0x9aa4ae };
  return [...[-1, 1].map((k) => ({ t: 'box', c: [p[0], by(sg, (y(CLV.u1) + y(CLV.uSlot)) / 2), z + k * off], d: [W, (CLV.u1 - CLV.uSlot) / 12, tT], ...c })),
    { t: 'box', c: [p[0], by(sg, (y(CLV.uSlot) + y(CLV.uWeb)) / 2), z], d: [W, CLV.web / 12, CLV.H / 12], ...c },
    { t: 'box', c: [p[0], by(sg, (y(CLV.uWeb) + y(CLV.u0)) / 2), z], d: [W, (CLV.uWeb - CLV.u0) / 12, CLV.tail / 12], ...c }];
};
const lwa = (p, sg) => ({ t: 'box', c: [p[0], by(sg, LUG.yPin + (LWA.u0 + LWA.u1) / 24), p[2]], d: [LWA.W / 12, LWA.L / 12, LWA.t / 12], mat: '2024', colour: 0xb7bec7, feature: 'LEZ-57-142' });
const vol = (g) => g.d[0] * g.d[1] * g.d[2] * 1728;
defineParts([
  { pn: 'LEZ-57-116', name: 'Wing-root jut-out: the wing panel\'s inboard extension aft of the CS spar (L/R)', kind: 'laminate', ata: 57, massItem: 'wings', qty: 2, meshes: /^Wing_[LR]_Root$/, oml: true,
    massEach: +JUT.mass.toFixed(2), geo: [{ t: 'box', c: [GEO.firewall + 1.0, 2.4, GEO.wing.z], d: [0.4, 0.4, 0.05], draw: false }],
    props: [['Planform (each)', `${JUT.area.toFixed(2)} ft² from the root rib to the cowl side`], ['Construction', '2 × 6781 top and bottom on CNC-milled HT61, 2 × 6781 front wall (faces the CS spar, 0.15 in gap) and inboard close-out'], ['Mass', `skins ${JUT.skinLb.toFixed(2)} lb + core ${JUT.coreLb.toFixed(2)} lb + close-outs 0.25 lb`]],
    blurb: 'Behind the CS spar the wing root runs inboard to the cowl side: the Long-EZ wing\'s inboard cores (whose trailing edge is kinked to suit the cowl) [EC]. It is part of the removable wing panel, so its front wall stands 0.15 in off the spar\'s aft face and its inboard end 0.12 in off the cowl, where the cowl\'s seal strip bears on it. The third wing bolt sits in it.',
    steps: [S1('CNC-mill the inboard cores with the panel; close out the front wall and inboard end with 2 × 6781', ['Front wall square to the spar line', 'Inboard end follows the cowl template, 0.12 ± 0.04 in'])], src: { mass: 'COMPUTED (area × 2 × 6781 ×2 + core volume)', design: '[EC] [CZ]' } },
  // LEZ-57-145 (the wing-attach installation: pins, drag bolt, nuts, washers, torques) is defined in wp16 with its record
  { ...COMMON, pn: 'LEZ-57-142', nha: 'LEZ-57-110', name: `LWA plate: wing spar-end lug, ${LWA.W} × ${LWA.L.toFixed(2)} × ${LWA.t} in 2024-T351 (upper and lower, L/R)`, ata: 57, qty: 4, material: '2024-T351 plate',
    massEach: +LWA.mass.toFixed(3), geo: sgs.flatMap((sg) => [lwa(ATTACH.pinU, sg), lwa(ATTACH.pinL, sg)]),
    hardware: [], definition: 'LWA',
    props: [['Plan', `${LWA.W} in wide × ${LWA.L.toFixed(2)} in long × ${LWA.t} in thick; pin hole Ø ${LWA.D} in at ${LWA.e} in (2D) from the lug end; 3 × Ø ${LWA.dBolt} in bolt holes at ${LUG.pitch * LWA.dBolt} in pitch`], ['Position', `mid-plane ${ATTACH.depth.toFixed(3)} in inside the skin face; lug end ${(LWA.uRoot + LWA.e).toFixed(2)} in inboard of the wing root`]],
    blurb: 'The wing half of each spar-end joint: a flat 2024-T351 plate lying under the wing root spar cap, through-bolted to it with three AN8 bolts, whose inboard end is a lug that runs across the 0.15 in joint gap into the clevis on the CS spar end. One part number serves all four positions. This is the pilot of the build-ready definition: every field of the part definition standard is filled in for it.',
    steps: [S1('Machine from plate; chem-film and prime except the bond face', ['Grain along the span (L)', 'Pilot holes only; final holes are match-drilled at assembly'])], src: { mass: 'COMPUTED (plan area × t × 0.1003 lb/in³)', design: 'LEZ sizing (wp13)' } },
  { ...COMMON, pn: 'LEZ-57-143', nha: 'LEZ-57-140', name: `Clevis block: CS spar-end fork, ${CLV.L.toFixed(2)} × ${CLV.W} × ${CLV.H.toFixed(3)} in 2024-T351 (upper and lower, L/R)`, ata: 57, qty: 4, material: '2024-T351 plate',
    massEach: +CLV.mass.toFixed(3), geo: sgs.flatMap((sg) => [...clevis(ATTACH.pinU, sg), ...clevis(ATTACH.pinL, sg)]),
    hardware: [], definition: 'CLV',
    props: [['Fork', `two ${CLV.tT} in tangs around a ${CLV.slot.toFixed(3)} in slot ${CLV.slotIn.toFixed(2)} in deep; pin hole Ø ${CLV.D} in at ${CLV.e} in (2D) from the tang ends`], ['Tail', `${CLV.tail} in thick, ${(CLV.uWeb - CLV.u0).toFixed(2)} in long under the CS spar cap; 3 × Ø ${CLV.dB} in bolt holes at ${LUG.pitch * CLV.dB} in pitch`], ['Web', `${CLV.web} in across the slot root`]],
    blurb: 'The CS spar half of each spar-end joint: a machined fork whose two tangs straddle the LWA plate (LEZ-57-142) and carry the pin in double shear. A web closes the slot, and a tail the thickness of the LWA plate runs inboard under the CS spar cap, through-bolted to it with three AN8 bolts. One part number serves all four positions; it is the second part of the build-ready definition.',
    steps: [S1('Machine from plate; chem-film and prime except the tail bond face', ['Grain along the length (L)', 'Pilot holes only; final holes are match-drilled at assembly'])], src: { mass: 'COMPUTED (side profile × width × 0.1003 lb/in³)', design: 'LEZ sizing (wp13)' } },
  // LEZ-57-144 (the wing drag angle in the jut-out) is defined in wp15 with its sizing and checks
  { pn: 'LEZ-57-150', name: 'Strake-to-fuselage joint: flox, 2-ply 6781 tapes inside and out, 3/4 in micro fillet (L/R)', kind: 'laminate', ata: 57, massItem: 'fus', qty: 2,
    massEach: +(2 * 2 * (strakeSec(GEO.strake.rootY).c * 12) * 2 * BID.t * 0.065 + 0.25).toFixed(2),
    geo: sgs.flatMap((sg) => { const q = strakeSec(GEO.strake.rootY), o = []; for (let s = q.le + 0.25; s < GEO.firewall - 0.1; s += 0.5) { const m = omlAt(s, GEO.strake.rootY); if (!m) continue;
      o.push({ t: 'box', c: [s, by(sg, fusAt(s).w / 2 - 0.03), (m.up + m.lo) / 2], d: [0.48, 0.015, Math.max(0.02, (m.up - m.lo) * 0.6)], mat: 'glass', colour: 0xc9d6e3, op: 0.5, external: true /* the bond line is the skin joint itself */ }); } return o; }),
    blurb: 'The strake top and bottom skins meet the fuselage side (which is the tank\'s inboard wall) in flox, with 2-ply 6781 tapes over the corner inside the tank and outside, and a 3/4 in radius micro fillet faired outside (the contour the 3D model shows) [LP-adjacent builder logs, EP]. The fuel-proof inside tapes are wetted out with fuel-resistant epoxy.',
    steps: [S1('Flox the skins to the fuselage side; tape inside (through the tank access) and outside; fillet', ['No voids along the bond (tap test)', 'Tank leak test 1/4 psi, 24 h, before closing [LP]'])], src: { mass: 'COMPUTED (tape area)', design: '[EP] builder practice' } },
  { pn: 'LEZ-57-151', name: 'Strake-to-CS spar lap: skins over the spar caps (3 × 6781, no core), tank aft wall on the spar face (L/R)', kind: 'laminate', ata: 57, massItem: 'fus', qty: 2, massEach: 0.45,
    geo: sgs.flatMap((sg) => [CS_FIT.U, CS_FIT.L].map((z) => ({ t: 'box', c: [CS.s, by(sg, (1.1 + YJ) / 2), z + (z > CS.z ? -0.004 : 0.004)], d: [CS.width + 0.10, YJ - 1.15, 0.006], mat: 'glass', colour: 0xc9d6e3, op: 0.5 }))),
    blurb: 'The strake skins drop their core over the CS spar and lap the spar caps in 3 × 6781 with flox, 1 in past each face; the tank\'s aft wall is the spar\'s forward face, sealed with a flox corner and a 6781 tape. The strake is "installed over the taper" of the spar [CZ]; the spar depth here is fitted to the strake contour (CS_FIT).',
    steps: [S1('Sand the spar caps; flox and lay the lap; peel ply', ['Lap ≥ 1 in past each spar face', 'Spar cap surface not sanded into the HTS40'])], src: { mass: 'ASSUMED', design: '[CZ] [LP]' } },
  { pn: 'LEZ-57-152', name: 'Strake end rib, wing root rib and gap seal (closed-cell foam tape), L/R', kind: 'install', ata: 57, massItem: 'wings', qty: 2, massEach: +RJ.mass.toFixed(3),
    geo: sgs.map((sg) => { const q = strakeSec(YJ), up = [], lo = [];
      for (let i = 1; i <= 16; i++) { const s = q.le + q.c * (0.02 + 0.96 * i / 16), m = omlAt(s, SEAL.y); if (!m) continue; up.push([s, by(sg, SEAL.y), m.up - SEAL.inset]); lo.push([s, by(sg, SEAL.y), m.lo + SEAL.inset]); /* near the skin, clear of the LWA lugs that cross the gap */ }
      return { t: 'path', pts: [...up, ...lo.reverse()], dIn: 0.25, drawR: 0.12, massPerFt: 0, mat: 'rubber', colour: 0x2a2a2a }; }),
    std: 'Closed-cell neoprene sponge strip, 1/4 × 1/4 in, adhesive-backed (LEZ-57-152)',
    props: [['Gap', `${(GEO.join.gap * 12).toFixed(2)} in strake end rib to wing root rib; ${(GEO.join.gap * 12).toFixed(2)} in jut-out front wall to the CS spar aft face`]],
    blurb: `A butt joint, not plug-and-socket [CZ]: the strake end rib (2 × 6781 close-out) and the wing root rib face each other ${(GEO.join.gap * 12).toFixed(2)} in apart so the wing LE can flex in flight without touching the strake; the wing root has a 0.7 in recess for the skin flange [CZ]. A compressible foam strip on the strake rib seals the gap. join-gap checks that limit-load motion at the root leaves clearance.`,
    steps: [S1('Fit wings; set the gap with 0.15 in shims; close out the end rib', ['Gap 0.15 ± 0.03 in all round', 'Seal compressed ≤ 50 % at installation'])], src: { mass: 'COMPUTED: the record\'s lines (LEZ-57-152)', design: '[CZ]' } },
  { pn: 'LEZ-71-120', name: 'Cowl attachment: continuous hinges at the firewall flange, cowl split-line hinges, cowl-to-wing-root seal', kind: 'install', ata: 71, massItem: 'engine', qty: 1, massEach: 0.9, material: '2024-T3 / 302 SS pin',
    geo: (() => { const o = fusOutline(GEO.firewall + 0.03, 48, -0.03), zc = (o.f.top + o.f.bot) / 2, pts = o.pts.map(([y, z]) => [GEO.firewall + 0.03, y, z]);
      const upper = pts.filter((p) => p[2] >= zc).sort((a, b) => a[1] - b[1]), lower = pts.filter((p) => p[2] < zc).sort((a, b) => a[1] - b[1]);
      return [upper, lower].map((pp) => ({ t: 'path', pts: pp, dIn: 0.25, drawR: 0.12, massPerFt: 0, mat: '2024', colour: 0x9aa4ae })); })(),
    std: 'MS20257-type continuous (piano) hinge, 0.040 in 2024-T3 leaves, 0.090 in stainless pin; silicone-rubber baffle seal strip at the wing root',
    hardware: [{ std: 'MS20257 continuous hinge', qty: 4, desc: 'firewall flange to upper and lower cowl (L/R halves of each)' }, { std: 'MS20470AD4 rivets / flox', qty: 140, desc: 'hinge leaves to the firewall flange and floxed into the cowl laminate' }, { std: 'AN3-5A + MS21047 nutplates', qty: 8, desc: 'cowl split line at the sides, aft of the hinges' }],
    blurb: 'Upper and lower cowls hang on continuous hinges riveted to a 2024 flange around the firewall and floxed into the cowl laminates; the pins pull out forward through the strake-to-cowl corner [builder practice]. The split line is screwed into nutplates. Where the cowl side meets the wing-root jut-out the cowl edge carries a silicone seal strip bearing on the root (0.12 in gap) so plenum air does not leak around the wing root.',
    steps: [S1('Rivet hinge leaves to the firewall flange; flox mating leaves into the cowls with the cowl clecoed in place', ['Pins slide in by hand', 'Cowl gap to the wing root 0.12 ± 0.04 in all along'])], src: { mass: 'ASSUMED', design: 'builder practice (cowl hinges)' } },
]);

// fittings are keep-outs for every route (wrench and bolt-removal room included)
defineKeepouts(sgs.flatMap((sg) => [
  { id: `ko-wattach-${sg}`, t: 'box', c: [CS.s, by(sg, YJ - 0.12), CS.z], d: [0.42, 0.50, CS_FIT.depth + 0.02], why: 'wing attach pins, clevis and LWA plates (pins remove vertically through the skin recesses)', owner: 'LEZ-57-145', applies: () => true },
  ...[ATTACH.pinU, ATTACH.pinL].map((p, k) => ({ id: `ko-lwa-${k ? 'lo' : 'up'}-${sg}`, t: 'box', c: [CS.s, by(sg, LUG.yPin + (LWA.u0 + LWA.u1) / 24), p[2]], d: [LWA.W / 12 + 0.02, LWA.L / 12 + 0.02, LWA.t / 12 + 0.02], why: 'LWA plate and its through-bolts', owner: 'LEZ-57-142', applies: () => true })),
  ...[ATTACH.pinU, ATTACH.pinL].map((p, k) => ({ id: `ko-clv-${k ? 'lo' : 'up'}-${sg}`, t: 'box', c: [CS.s, by(sg, LUG.yPin + (CLV.u0 + CLV.u1) / 24), p[2]], d: [CLV.W / 12 + 0.02, CLV.L / 12 + 0.02, CLV.H / 12 + 0.02], why: 'clevis block and its through-bolts', owner: 'LEZ-57-143', applies: () => true })),
  // FS extent: the bolt's nut and washer (Ø 0.5) + 0.2 in forward, the lug end (0.5 in aft of the bolt) and the drag angle's leg B behind it + 0.45 in aft (ICD c_controls §8: was ±1.2 in, which took in block C's rod B on FS 157.9)
  { id: `ko-wdrag-${sg}`, t: 'box', c: [ATTACH.drag[0] + 0.375 / 12, by(sg, ATTACH.drag[1]), (ATTACH.dragZ[0] + ATTACH.dragZ[1]) / 2 + 0.02], d: [1.65 / 12, 0.28, ATTACH.dragZ[1] - ATTACH.dragZ[0] + 0.06], why: 'wing drag fitting and vertical bolt', owner: 'LEZ-57-141', applies: () => true },
  { id: `ko-wdragarm-${sg}`, t: 'box', c: [(GEO.firewall + ATTACH.drag[0]) / 2, by(sg, ATTACH.drag[1]), (zL + ATTACH.zLo) / 2 + 0.035], d: [ATTACH.drag[0] - GEO.firewall, 0.22, Math.abs(ATTACH.zLo - zL) + 0.07], why: 'wing drag fitting bracket arm', owner: 'LEZ-57-141', applies: () => true },
]));

// ------------------------------------------------------------------------------------------- checks
const IN_ = (n, v, u, s = 'DERIVED') => [n, v, u, s];
registerChecks('wp13', (d, lc, Z, M) => {
  const out = [], R = rootLoads(d, lc);
  if (R) {
    const f = fittingForces(R), FSf = d.FS * FF, D_ = ATT.pin / 16;
    const net = (t) => (LUG.W - D_) * t * AL.ftu2024 * LUG.Kt;
    const pinAllow = 2 * AN_SHEAR[ATT.pin], lugAllow = Math.min(D_ * ATT.plate * AL.fbru2024, net(ATT.plate)), tangAllow = Math.min(2 * D_ * ATT.tang * AL.fbru2024, net(2 * ATT.tang));
    const ms = Math.min(pinAllow, lugAllow, tangAllow) / (f.pin * FSf) - 1, mode = pinAllow <= Math.min(lugAllow, tangAllow) ? `AN${ATT.pin} double shear` : lugAllow <= tangAllow ? 'LWA plate bearing / net tension' : 'clevis tang bearing / net tension';
    out.push(Object.assign(mk('wing', 'wing-attach', `Wing attach spar-end pins (AN${ATT.pin}), LWA plate and clevis`, lc, 'BL ±45, CS spar end', mode, ms, {
      formula: 'P_cap = Mx/h;  pin = √((P_cap + F_y3/2)² + ((V + R3)/2)²);  MS = min(2·P_s, min(D·t·F_bru, K·(W−D)·t·F_tu) for the plate and the two tangs) / (FS·1.15·pin) − 1 (FAR 23.625 fitting factor)',
      inputs: [IN_('Root bending Mx (limit)', R.Mx, 'inlb', 'SCHRENK'), IN_('Root shear V (limit)', R.V, 'lb', 'SCHRENK'), IN_('Root torsion T (limit)', R.T, 'inlb', 'SCHRENK'), IN_('Pin couple depth h', ATTACH.h, 'in', 'GEOMETRY'),
        IN_('Pin', `AN${ATT.pin} (${D_} in), single shear ${AN_SHEAR[ATT.pin]} lb`, 'text', 'AN standard'), IN_('LWA plate / tangs', `${ATT.plate} in / 2 × ${ATT.tang} in 2024, F_bru ${AL.fbru2024 / 1000} ksi`, 'text', 'MMPDS-typical'), IN_('Fitting factor', FF, '', 'FAR 23.625'), chordIn(R, Math.min(pinAllow, lugAllow, tangAllow), FSf)],
      result: [['Cap couple (limit)', f.Pc, 'lb'], ['Pin resultant (limit)', f.pin, 'lb'], ...ATT.log.map((r) => [`Iteration ${r.it}: ${r.desc}`, r.ms != null ? r.ms.toFixed(2) : r.note, 'text'])] }), { sys: 'LEZ-57-145' }));
    // LWA plate detail checks (LEZ-57-142): lug, through-bolt bearing, net section at the inboard bolt (edge distances and
    // pitch are design rules in its definition record, checked by the release audit)
    { const P = f.pin * FSf, t = LWA.t, brg = D_ * t * AL.fbru2024, nt = net(t), lugA = Math.min(brg, nt);
      const K_ = IN_('Lug net-tension efficiency K', LUG.Kt, '', 'BOUND: below the published 2024-T351 lug efficiency curves at W/D ' + (LUG.W / D_).toFixed(1));
      const geoIn = [IN_('Plate width W', LUG.W, 'in', 'GEOMETRY'), IN_('Plate thickness t', t, 'in', 'SIZED'), IN_('Pin hole D', D_, 'in', 'AN standard')];
      out.push(Object.assign(mk('wing', 'lwa-lug', 'LWA plate lug: bearing and net tension at the pin', lc, 'BL ±44, lug end', brg <= nt ? 'lug bearing (e/D = 2)' : 'lug net tension', lugA / P - 1, {
        formula: 'P = FS·1.15·pin;  allow = min(D·t·F_bru(e/D 2), K·(W − D)·t·F_tu)', inputs: [IN_('Pin resultant (limit)', f.pin, 'lb', 'DERIVED'), ...geoIn, K_, IN_('F_bru (e/D 2) / F_tu', `${AL.fbru2024 / 1000} / ${AL.ftu2024 / 1000} ksi`, 'text', 'MMPDS-typical'), IN_('Fitting factor', FF, '', 'FAR 23.625'), chordIn(R, lugA, FSf)],
        result: [['Pin load (ult. × 1.15)', P, 'lb'], ['Bearing allowable', brg, 'lb'], ['Net-tension allowable', nt, 'lb']] }), { sys: 'LEZ-57-142' }));
      const bb = LWA.bolts.length * LWA.dBolt * t * AL.fbru2024, nb = (LUG.W - LWA.dBolt) * t * AL.ftu2024 * LUG.Kt;
      out.push(Object.assign(mk('wing', 'lwa-bolts', 'LWA plate at the cap through-bolts: bearing and net section at the inboard bolt', lc, 'BL ±46 to ±50', bb <= nb ? 'bolt bearing in the plate' : 'net section at bolt 1', Math.min(bb, nb) / P - 1, {
        formula: 'allow = min(n·d·t·F_bru, K·(W − d)·t·F_tu): the whole pin load passes the inboard bolt section', inputs: [IN_('Bolts', `${LWA.bolts.length} × AN8 (${LWA.dBolt} in)`, 'text', 'AN standard'), ...geoIn.slice(0, 2), K_, IN_('F_bru / F_tu', `${AL.fbru2024 / 1000} / ${AL.ftu2024 / 1000} ksi`, 'text', 'MMPDS-typical'), chordIn(R, Math.min(bb, nb), FSf)],
        result: [['Load (ult. × 1.15)', P, 'lb'], ['Bearing allowable', bb, 'lb'], ['Net-section allowable', nb, 'lb']] }), { sys: 'LEZ-57-142' }));
      // clevis block detail checks (LEZ-57-143): tangs, the web between the tangs and the tail, the tail at the cap bolts
      const C = CLV, tb = 2 * C.D * C.tT * AL.fbru2024, tn = (LUG.W - C.D) * 2 * C.tT * AL.ftu2024 * LUG.Kt, tA = Math.min(tb, tn);
      const cin = [IN_('Width W', C.W, 'in', 'GEOMETRY'), IN_('Tang thickness t_T', C.tT, 'in', 'SIZED'), IN_('Pin hole D', C.D, 'in', 'AN standard')];
      out.push(Object.assign(mk('wing', 'clv-tangs', 'Clevis tangs: bearing and net tension at the pin', lc, 'BL ±44, tang ends', tb <= tn ? 'tang bearing (e/D = 2)' : 'tang net tension', tA / P - 1, {
        formula: 'allow = min(2·D·t_T·F_bru(e/D 2), K·(W − D)·2·t_T·F_tu)', inputs: [IN_('Pin resultant (limit)', f.pin, 'lb', 'DERIVED'), ...cin, K_, IN_('F_bru (e/D 2) / F_tu', `${AL.fbru2024 / 1000} / ${AL.ftu2024 / 1000} ksi`, 'text', 'MMPDS-typical'), IN_('Fitting factor', FF, '', 'FAR 23.625'), chordIn(R, tA, FSf)],
        result: [['Pin load (ult. × 1.15)', P, 'lb'], ['Bearing allowable', tb, 'lb'], ['Net-tension allowable', tn, 'lb']] }), { sys: 'LEZ-57-143' }));
      const wA = 2 * C.web * C.W * AL.fsu2024;
      out.push(Object.assign(mk('wing', 'clv-web', 'Clevis web: each tang\'s half load turning into the tail (shear on the horizontal planes)', lc, 'BL ±43, slot root', 'web shear', wA / P - 1, {
        formula: 'each tang carries P/2 into the web; it turns to the tail level across a horizontal plane of web × W:  allow = 2·web·W·F_su', inputs: [IN_('Web length', C.web, 'in', 'GEOMETRY'), IN_('Width W', C.W, 'in', 'GEOMETRY'), IN_('F_su', `${AL.fsu2024 / 1000} ksi`, 'text', 'MMPDS-typical'), IN_('Fitting factor', FF, '', 'FAR 23.625'), chordIn(R, wA, FSf)],
        result: [['Pin load (ult. × 1.15)', P, 'lb'], ['Shear allowable', wA, 'lb']] }), { sys: 'LEZ-57-143' }));
      const cb = C.bolts.length * C.dB * C.tail * AL.fbru2024, cn = (LUG.W - C.dB) * C.tail * AL.ftu2024 * LUG.Kt;
      out.push(Object.assign(mk('wing', 'clv-tail', 'Clevis tail at the CS cap through-bolts: bearing and net section at the bolt next to the web', lc, 'BL ±36 to ±41', cb <= cn ? 'bolt bearing in the tail' : 'net section at bolt 1', Math.min(cb, cn) / P - 1, {
        formula: 'allow = min(n·d·t·F_bru, K·(W − d)·t·F_tu): the whole pin load passes the section at the bolt next to the web', inputs: [IN_('Bolts', `${C.bolts.length} × AN8 (${C.dB} in)`, 'text', 'AN standard'), IN_('Width W', C.W, 'in', 'GEOMETRY'), IN_('Tail thickness', C.tail, 'in', 'SIZED'), K_, IN_('F_bru / F_tu', `${AL.fbru2024 / 1000} / ${AL.ftu2024 / 1000} ksi`, 'text', 'MMPDS-typical'), chordIn(R, Math.min(cb, cn), FSf)],
        result: [['Load (ult. × 1.15)', P, 'lb'], ['Bearing allowable', cb, 'lb'], ['Net-section allowable', cn, 'lb']] }), { sys: 'LEZ-57-143' }));
    }
    // the third bolt (wing-attach-drag) is checked with the drag / torsion fitting LEZ-57-141 in wp15
    // gap: spanwise closure of the strake-end / wing-root gap at limit load (bolt clearance + joint compliance + rotation)
    const kJ = HUTH.k, lever = ATTACH.h / 2 + ATTACH.depth, gapIn = GEO.join.gap * 12, slop = 0.003;
    const rot = 2 * (slop + f.Pc / kJ) / ATTACH.h, close = rot * lever, slopMax = gapIn * ATTACH.h / (2 * lever) - f.Pc / kJ;
    out.push(Object.assign(mk('wing', 'join-gap', 'Strake end rib to wing root rib: gap left at limit load', lc, 'BL ±45', 'root rotation and joint compliance', (GEO.join.gap * 12) / close - 1, {
      formula: 'θ = 2·(slop + P_cap/k)/h (root rib rotates about the mid-depth as one pin stretches and the other closes);  closure = θ·(h/2 + edge);  MS = gap / closure − 1',
      inputs: [IN_('Gap', gapIn, 'in', 'DESIGN [CZ]'), IN_('Pin clearance (reamed, holes +0.003 / −0.000)', slop, 'in', `BOUND: MS stays ≥ 0 up to ${slopMax.toFixed(4)} in`), IN_('Joint stiffness k (per pin, double shear)', kJ, 'lb/in', `Huth (1986) fastener flexibility, bolted metallic (a = 2/3, b = 3.0, n = 2): plate ${LWA.t} in, tangs ${CLV.tT} in 2024 (10.5 Msi), AN${ATT.pin} steel (29 Msi)`), IN_('Rib face extent from the root mid-depth', lever, 'in', 'GEOMETRY')],
      result: [['Closure (limit)', close, 'in']] }), { sys: 'LEZ-57-152' }));
  }
  if (lc.type === 'sym' && lc.n > 0) {
    // strake root bond: strake lift + fuel inertia per side shared between top and bottom tapes along the root
    const q = strakeSec(GEO.strake.rootY), Vs = (1 - lc.ac.shareC) * lc.ac.W / 2 * lc.n * 0.18 + 156 * lc.n;
    { // LEZ-57-150 (block A): the tank's root length and the cavity's own fuel (FIXED.strakeFuel, wpA7); flox lap as the resin's ILSS
      const SF = FIXED.strakeFuel, fuel = SF ? SF.lb : 156, Lr = SF ? SF.Lr : q.c * 12, Vj = (1 - lc.ac.shareC) * lc.ac.W / 2 * lc.n * 0.18 + fuel * lc.n;
      const qRun = Vj * d.FS / (2 * Lr), tape = 2 * BID.t * BID.Fs, ils = psi(M.UNI.ILSS), bond = 2.0 * ils, ms = Math.min(tape, bond) / qRun - 1;
      const shareMax = 0.18 * Math.max(0, (Math.min(tape, bond) * 2 * Lr / d.FS - fuel * lc.n) / Math.max(1e-9, Vj - fuel * lc.n));
      out.push(Object.assign(mk('strake', 'join-strake-fus', 'Strake-to-fuselage bond (flox + 2 × 6781 tapes, top and bottom)', lc, 'strake root', qRun > Math.min(tape, bond) ? 'tape shear' : 'bond shear', ms, {
        formula: 'q = FS·(L_strake + W_fuel·n) / (2·L_root);  allow = min(2 × 6781 shear, 2 in flox lap × τ)',
        inputs: [IN_('Strake lift share (× the wing-side lift)', 0.18, '', `BOUND: MS stays ≥ 0 up to ${shareMax.toFixed(2)}`), IN_('Fuel per side', fuel, 'lb', SF ? 'MODEL: the strake cavity (strakeVolumes) × 6.0 lb/US gal' : 'MODEL'), IN_('Root bond length, LE to the tank wall', Lr, 'in', 'GEOMETRY'),
          IN_('6781 shear (±45, per ply)', BID.Fs, 'psi', `BOUND: typed from memory; MS stays ≥ 0 down to ${(qRun / (2 * BID.t)).toFixed(0)} psi`), IN_('Flox lap shear', ils, 'psi', allowB(bond / qRun - 1, 'interlaminar shear strength, taken for the flox bond'))],
        result: [['Running load (ult.)', qRun, 'lb/in']] }), { sys: 'LEZ-57-150' }));
    }
    { const Ls = (YJ - GEO.join.gap - GEO.strake.yRoot) * 12, qS = Vs * d.FS / (2 * Ls), Lc = GEO.csSpar.width * 12, ils = psi(M.UNI.ILSS), tau = qS / Lc, ms = ils / tau - 1;
      const shareMax = 0.18 * Math.max(0, (ils * Lc * 2 * Ls / d.FS - 156 * lc.n) / Math.max(1e-9, Vs - 156 * lc.n));
      out.push(Object.assign(mk('strake', 'join-strake-spar', 'Strake skins lapped on the CS spar caps (3 × 6781, flox bed, over the cap width)', lc, 'CS spar caps, upper and lower', 'lap shear', ms, {
        formula: 'q = FS·(L_strake + W_fuel·n) / (2·L_span) per lap;  τ = q / L_lap (the cap width)', inputs: [IN_('Strake lift share (× the wing-side lift)', 0.18, '', `BOUND: MS stays ≥ 0 up to ${shareMax.toFixed(2)}`), IN_('Fuel per side', 156, 'lb', 'MODEL (26 US gal × 6.0 lb/gal)'),
          IN_('Lap span', Ls, 'in', 'GEOMETRY'), IN_('Lap length (spar cap width)', Lc, 'in', 'GEOMETRY'), IN_('Lap bond allowable', ils, 'psi', allowB(ms, 'interlaminar shear strength, taken for the flox bond'))],
        result: [['Running load (ult.)', qS, 'lb/in'], ['τ', tau, 'psi']] }), { sys: 'LEZ-57-151' })); }
  }
  if (lc.id === 'W1-S1') {
    // cowl hinge: plenum overpressure on the upper cowl at VD, reacted half by the firewall hinge
    const q = 0.5 * 0.002377 * (d.VD * 1.6878) ** 2 / 144, dp = 0.8 * q, A = (GEO.cowl.s1 - GEO.firewall) * 12 * fusAt(14.2).w * 12, Lh = fusAt(GEO.firewall).w * 12 * 1.4;
    const w = dp * A / 2 / Lh * d.FS, pinBear = 0.090 * 0.040 * AL.fbru2024 / 1.0 /* per knuckle, 1 knuckle per in */;
    out.push(Object.assign(mk('fuselage', 'cowl-hinge', 'Cowl-to-firewall continuous hinge under plenum pressure at VD', lc, 'firewall flange', 'leaf bearing on the pin', pinBear / w - 1, {
      formula: 'Δp = 0.8·q(VD);  w = FS·Δp·A/(2·L_hinge);  allow = d_pin·t_leaf·F_bru per knuckle (1 per in)',
      inputs: [IN_('VD', d.VD, 'mph', 'DESIGN'), IN_('Plenum Δp', dp, 'psi', 'ASSUMED 0.8 q'), IN_('Upper cowl area', A, 'in2', 'GEOMETRY'), IN_('Hinge length', Lh, 'in', 'GEOMETRY')],
      result: [['Running load (ult.)', w, 'lb/in'], ['Allowable per in', pinBear, 'lb/in']] }), { sys: 'LEZ-71-120' }));
  }
  return out;
});

defineReqs([
  { id: 'R-JOIN-1', ref: '23.607 / 23.611 / 23.625', title: 'Wing, strake and cowl joints: fasteners and fittings carry ultimate loads × 1.15 fitting factor; the wing removes with three bolts; gaps stay open at limit load', checks: /^(wing-attach|lwa-lug|lwa-bolts|clv-tangs|clv-web|clv-tail|wing-attach-drag|join-gap|join-strake-fus|join-strake-spar|cowl-hinge)$/, method: 'analysis', closed: true },
]);
void FIXED; void FT; void wingSec;
