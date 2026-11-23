// LEZ-57-140 centre-section spar: the first composite part through the build-ready definition. The record is filled in
// from the numbers the sizing uses (structures.js cs-cap, wp13 SPAR_END, wp15 drop-off schedule and hard points); the
// CadQuery solid (cad/cs_spar.py) is built from the same numbers, region by region (caps, hard points, webs and wrap,
// core), and measured back by the release audit. Notional: public data and this model's own analysis. Not for construction.
import { GEO, CS_FIT, DEFAULT_DESIGN, BASE_MAT, MATSYS, analyse, effective, size } from '../structures.js';
import { CLV, LUG, ATTACH, ATT, SPAR_END } from '../parts/wp13_airframe_joints.js';
import { SPAR, HARD, capSchedule, hardDoubler } from '../parts/wp15_cs_spar.js';
import { plyWeight, PROCESS, buildPlyBook } from '../plybook.js';
import { bookMass } from '../systems.js';
import { r4, paramHash, want } from './util.js';
import { CS_PASS } from '../parts/wpC1_controls.js';
import { CS_TUNNELS, CS_WEB_DBL } from '../parts/wpJ0_layout.js';

const E = SPAR_END, CS = GEO.csSpar;
let RZ = null, RA = null;
const sized = () => (RZ ||= (() => { const d = effective(DEFAULT_DESIGN), Z = size(d); return { d, Z, M: Z.M }; })());
/** lb/in³ of a cured ply and of the core */
const rho = { UNI: plyWeight('UNI', 1, 1) / 144 / BASE_MAT.UNI.t, BID: plyWeight('BID', 1, 1) / 144 / BASE_MAT.BID.t, PVC: BASE_MAT.PVC.rho * 62.43 / 1728 };

/** the numbers that define the solid, in inches: x = BL (from the centre line), y fore-aft (+ aft, from the spar's mid
 *  plane), z up from the box's lower outer face */
export function csParams() {
  const R = sized(), S = capSchedule(R.d, R.Z), tU = E.tU, tB = E.tB, yI = (j) => r4(SPAR.yIn(j) * 12);
  const pinU = r4(LUG.yPin * 12);
  return {
    L: r4(2 * CS.halfSpan * 12), Wd: r4(CS.width * 12), H: r4(CS_FIT.depth * 12), capW: CS.cap, tU, tB, wrap: E.wrap, web: R.Z.csWeb,
    N: S.N, nEnd: S.nEnd, ends: S.ends.map((e) => r4(e * 12)), xWeb: r4(SPAR.yWeb * 12), xTail: r4(SPAR.yTail * 12),
    // rev I (2026-11-19): the lower cap on its own count; build-ups from the clevis web face inboard to startsL for the end joint
    NL: S.lower.NL, nEndL: S.lower.nEnd, endsL: S.lower.ends.map((e) => r4(e * 12)), startsL: S.lower.starts.map((e) => r4(e * 12)),
    nPad: E.nPad, nFill: E.nFill, padBot: r4(SPAR.depth.padBot), hpIn: Array.from({ length: SPAR.nHP }, (_, i) => yI(i + 1)),
    // clevis pocket (the clevis blocks are bonded in: the spar's own solid leaves their envelope open)
    pin: pinU, pinD: r4(CLV.D), pinDepth: r4(ATTACH.depth), cH: r4(CLV.H), cTail: r4(CLV.tail), cW: CLV.W, uWeb: r4(CLV.uWeb), u0: r4(CLV.u0), u1: r4(CLV.u1),
    bolts: CLV.bolts.map((u) => r4(pinU + u)), dB: CLV.dB,
    hard: HARD.map((h) => ({ id: h.id, x: r4(h.y * 12), cols: h.cols, z: h.zIn, d: h.d })),
    // BID web doublers at the bracket hard points, inside each web (both webs, both sides of the aircraft)
    webDbl: HARD.map((h) => ({ id: h.id, x: r4(h.y * 12), half: r4(Math.max(...h.cols.map(Math.abs)) + 1.5 * h.d + 1.0), n: hardDoubler(h, R.d, R.Z, R.M) })).filter((w) => w.n > 0).concat([CS_WEB_DBL]),   // rev G: J's doubler over the stacked pass-through traces on the aft web
    // control pass-throughs (rev C, block C): diagonal tunnels from the forward face (x0) to the aft face (x1), z above A
    pass: [...CS_PASS(), ...CS_TUNNELS.map(({ id, x0, x1, z, d }) => ({ id, x0, x1, z, d }))],   // rev G: J's systems tunnel (block J, ICD J-F1); rev H: the low tunnel (option A)
    rho: { UNI: r4(rho.UNI * 1e4) / 1e4, BID: r4(rho.BID * 1e4) / 1e4, PVC: r4(rho.PVC * 1e6) / 1e6 },
  };
}
/** analytic volumes per region (in³), for the record's mass and the check against the solid */
export function csVolumes(p) {
  const hole = (d, t) => Math.PI * (d / 2) ** 2 * t;
  const nB = p.bolts.length * 2;                                            // through-bolt holes, both ends
  const sum = (a) => a.reduce((x, y) => x + y, 0), endsL = p.endsL || [], startsL = p.startsL || [], NL = p.NL ?? p.N, nEndL = p.nEndL ?? p.nEnd;
  const capGU = p.capW * p.tU * (sum(p.ends.map((e) => 2 * e)) + p.nEnd * 2 * p.xWeb);
  const capGL = p.capW * p.tU * (sum(endsL.map((e) => 2 * e)) + (NL - endsL.length) * 2 * p.xWeb + sum(startsL.map((x) => 2 * (p.xWeb - x))));
  const capOne = capGU - nB * hole(p.dB, p.nEnd * p.tU), capLow = capGL - nB * hole(p.dB, nEndL * p.tU);
  const hpOne = p.capW * p.tB * p.hpIn.reduce((a, x, j) => a + ((j < p.nPad ? p.xWeb : p.xTail) - x), 0) - p.bolts.length * hole(p.dB, p.nPad * p.tB);
  const tw = p.wrap * p.tB, tWeb = p.web * p.tB, Hin = p.H - 2 * tw;
  const vertHoles = 2 * 2 * hole(p.pinD, tw) + 2 * nB * hole(p.dB, tw), sideHoles = p.hard.reduce((a, h) => a + 2 * h.z.length * h.cols.length * 2 * hole(h.d, tw + tWeb), 0);
  const bid = 2 * p.L * p.Wd * tw + 2 * p.L * Hin * tw + 2 * p.L * Hin * tWeb - vertHoles - sideHoles;
  // core: the interior inside webs and wrap, less caps, hard points, clevis pockets and the holes through it
  const wIn = p.Wd - 2 * tw - 2 * tWeb, hpG = p.capW * p.tB * p.hpIn.reduce((a, x, j) => a + ((j < p.nPad ? p.xWeb : p.xTail) - x), 0);
  const pocket = p.cW * (p.cH * (p.u1 - p.uWeb) + p.cTail * (p.uWeb - p.u0));
  const capT = p.nEnd * p.tU + tw, gapTop = (p.pinDepth - p.cTail / 2) - capT, gapBot = (p.padBot - p.nPad * p.tB) - (p.pinDepth + p.cTail / 2);
  const coreHoles = nB * hole(p.dB, p.H - 2 * p.padBot + 2 * (gapTop + gapBot)) + 4 * hole(p.pinD, p.pinDepth - p.cH / 2 - tw) + p.hard.reduce((a, h) => a + 2 * h.z.length * h.cols.length * hole(h.d, wIn), 0);
  const PVC = p.L * wIn * Hin - capGU - capGL - 4 * hpG - 4 * pocket - coreHoles;
  // web doublers: n BID plies inside each web over ±half of the bracket's BL, full inner depth, less the bolt holes
  const dbl = (p.webDbl || []).reduce((a, w) => { const h = p.hard.find((x) => x.id === w.id), nh = h ? h.z.length * h.cols.length : 0; return a + 2 * 2 * (w.n * p.tB * (2 * w.half * Hin - (h ? nh * Math.PI * (h.d / 2) ** 2 : 0))); }, 0);
  const dblCore = (p.webDbl || []).reduce((a, w) => { const h = p.hard.find((x) => x.id === w.id), nh = h ? h.z.length * h.cols.length : 0; return a + 2 * 2 * w.n * p.tB * 2 * w.half * Hin - (h ? 2 * nh * hole(h.d, 2 * w.n * p.tB) : 0); }, 0);
  // control pass-throughs: a cylinder crossing a fore-aft slab of thickness t at angle θ to the normal removes π r² t / cos θ
  const pv = (p.pass || []).reduce((a, q) => { const c = p.Wd / Math.hypot(q.x1 - q.x0, p.Wd), A = Math.PI * (q.d / 2) ** 2 / c; return { bid: a.bid + 2 * A * (2 * tw + 2 * tWeb), pvc: a.pvc + 2 * A * wIn }; }, { bid: 0, pvc: 0 });
  // rev G: a pass-through whose web trace lies inside a doubler also cuts the doubler's plies (and so cuts less core)
  const ov = (p.pass || []).reduce((a, q) => { const c = p.Wd / Math.hypot(q.x1 - q.x0, p.Wd), A = Math.PI * (q.d / 2) ** 2 / c, e = q.d / 2 / c;
    return a + [q.x0, q.x1].reduce((b, x) => b + (p.webDbl || []).filter((w) => Math.abs(x - w.x) + e <= w.half).reduce((s, w) => s + A * w.n * p.tB, 0), 0); }, 0);
  return { UNI: capOne + capLow, BID: bid + 4 * hpOne + dbl - pv.bid - 2 * ov, PVC: PVC - dblCore - pv.pvc + 2 * ov, cap: capOne, capLow, hp: hpOne, dbl };
}
/** the solid measured back against the record */
export function csExpect(p, m) {
  const out = [want('Length', p.L, m.bbox[1] - m.bbox[0], 0.002), want('Width', p.Wd, m.bbox[3] - m.bbox[2], 0.002), want('Depth', p.H, m.bbox[5] - m.bbox[4], 0.002)];
  const V = csVolumes(p), mv = m.volumes || {};
  out.push(want('HTS40 cap volume (in³)', V.UNI, mv.UNI ?? NaN, V.UNI * 0.002), want('6781 volume: webs, wrap, hard points (in³)', V.BID, mv.BID ?? NaN, V.BID * 0.002), want('HT61 core volume (in³)', V.PVC, mv.PVC ?? NaN, V.PVC * 0.005));
  const ends = (m.capEnds || []).slice().sort((a, b) => a - b);
  // the solid's cap steps: upper drop-offs, lower drop-offs and build-up inboard ends, and the clevis web faces (rev I)
  const steps = [...new Set([...p.ends.map((e) => ['upper drop', e]), ...(p.endsL || []).map((e) => ['lower drop', e]), ...(p.startsL || []).map((e) => ['lower build-up start', e]), ['cap ends (clevis web faces)', p.xWeb]].map((q) => JSON.stringify(q)))].map((q) => JSON.parse(q)).sort((a, b) => a[1] - b[1]);
  steps.forEach(([what, e], i) => out.push(want(`Cap step ${i + 1} (${what}), BL`, e, ends[i] ?? NaN, 0.002)));
  if (ends.length > steps.length) out.push(want('Cap steps in the solid', steps.length, ends.length, 0));
  out.push(want('Hard point inboard end, BL', p.hpIn.at(-1), m.hpIn ?? NaN, 0.002));
  const hs = m.holes || [], grp = (f) => hs.filter((h) => h.feat === f);
  const sets = [['pin', 4, p.pinD], ['bolt', 2 * p.bolts.length, p.dB], ...p.hard.map((h) => [`hp-${h.id}`, 2 * h.z.length * h.cols.length, h.d])];
  if ((p.pass || []).length) for (const q of p.pass) { const g = grp(`pass-${q.id}`); out.push(want(`pass-${q.id} tunnels: count`, 2, g.length, 0), want(`pass-${q.id} tunnels: diameter`, q.d, g.length ? Math.max(...g.map((h) => 2 * h.r)) : NaN, 0.001)); }
  for (const [f, n, d] of sets) { const g = grp(f); out.push(want(`${f} holes: count`, n, g.length, 0), want(`${f} holes: diameter`, d, g.length ? Math.max(...g.map((h) => 2 * h.r)) : NaN, 0.001)); }
  for (const [i, x] of p.bolts.entries()) { const g = grp('bolt').find((h) => Math.abs(h.x - x) < 0.01); out.push(want(`Bolt ${i + 1} position, BL`, x, g ? g.x : NaN, 0.002)); }
  return out;
}

/** CNC core templates (2026-11-20): the core's cross-sections where its cut changes, the step table along the span and the
 *  core cut list, all from the solid's own numbers (cad/cs_spar.py: core = inside the wrap and webs, less the caps, the
 *  hard points, the clevis pockets). Depths from the core face (the spar's outer face less the wrap); BL outboard of C, both ends */
export function csCoreTemplates(p) {
  const tw = p.wrap * p.tB, tWeb = p.web * p.tB, wIn = p.Wd - 2 * tw - 2 * tWeb, hIn = p.H - 2 * tw, r3 = (x) => Math.round(x * 1000) / 1000;
  const f2 = (x) => x.toFixed(2), d3 = (x) => x.toFixed(3).replace(/^0\./, '.'), d4 = (x) => x.toFixed(4).replace(/^0\./, '.');
  const startsL = p.startsL || [], NL = p.NL ?? p.N, nEndL = p.nEndL ?? p.nEnd, nHP = p.hpIn.length;
  const plyL = (x) => nEndL - startsL.filter((s) => s > x + 1e-9).length, dU = r3(p.N * p.tU), dL = (x) => r3(plyL(x) * p.tU);
  const hpTop = r3(p.padBot - nHP * p.tB - tw), hpBot = r3(p.padBot - tw), padTop = r3(p.padBot - p.nPad * p.tB - tw);
  const tail = [r3(p.pinDepth - p.cTail / 2 - tw), r3(p.pinDepth + p.cTail / 2 - tw)], head = [r3(p.pinDepth - p.cH / 2 - tw), r3(p.pinDepth + p.cH / 2 - tw)];
  const x0 = p.pin + p.u0, xW = p.pin + p.uWeb, x1 = p.pin + p.u1, s0 = startsL.length ? Math.min(...startsL) : 0, s1 = startsL.length ? Math.max(...startsL) : 0;
  // sections: troughs (capW wide, from both faces), and pockets inside the core (w wide, depth range, mirrored top and bottom)
  const sec = [
    { id: 'T1', at: 0, span: `0–${f2(s0)}`, uT: dU, lT: dL(0), pockets: [] },
    { id: 'T2', at: s1, span: `${f2(s1)}–${f2(p.hpIn.at(-1))}`, uT: dU, lT: dL(s1 + 0.01), pockets: [] },
    { id: 'T3', at: p.hpIn[0], span: `${f2(p.hpIn[0])}–${f2(x0)}`, uT: dU, lT: dL(p.hpIn[0]), pockets: [{ w: p.capW, d: [hpTop, hpBot], what: 'HP' }] },
    { id: 'T4', at: p.bolts[0], span: `${f2(x0)}–${f2(xW)}`, uT: dU, lT: dL(p.bolts[0]), pockets: [{ w: p.cW, d: tail, what: 'TAIL' }, { w: p.capW, d: [padTop, hpBot], what: 'PAD' }] },
  ];
  const steps = [
    { id: 'T1→T2', bl: `${f2(s0)} → ${f2(s1)}`, what: `L TROUGH +${d4(p.tU)} PER ${d3(startsL.length > 1 ? startsL[0] - startsL[1] : 1)}`, depth: `${d3(dL(0))} → ${d3(dL(s1 + 0.01))}`, n: startsL.length },
    { id: 'T2→T3', bl: `${f2(p.hpIn.at(-1))} → ${f2(p.hpIn[0])}`, what: `HP FLOOR 1:${((p.hpIn[0] - p.hpIn[1]) / p.tB).toFixed(0)}, +${d4(p.tB)} PER ${d3(p.hpIn[0] - p.hpIn[1])}`, depth: `${d3(hpTop + p.tB)} → ${d3(hpBot)}`, n: nHP - 1 },
    { id: 'T4', bl: `${f2(x0)} → ${f2(xW)}`, what: `TAIL POCKET ${f2(p.cW)} W`, depth: `${d3(tail[0])} – ${d3(tail[1])}`, n: 1 },
    { id: 'T4', bl: `${f2(x0)} → ${f2(xW)}`, what: `PAD POCKET ${f2(p.capW)} W`, depth: `${d3(padTop)} – ${d3(hpBot)}`, n: 1 },
    { id: 'HEAD', bl: `${f2(xW)} → ${f2(x1)}`, what: `HEAD POCKET ${f2(p.cW)} W, OPEN END`, depth: `${d3(head[0])} – ${d3(head[1])}`, n: 1 },
  ];
  // core cut list: two half-blocks from three bonded 2 in slabs (stock thickness BOUND: confirm in the Diab quote), and the
  // upper cover strips that close the hard-point pockets under the upper cap (the lower cap sits on the filler directly)
  const cover = r3(hpTop - dU), cut = [
    { id: 'CB-1, CB-2', qty: 2, what: `HALF, BL 0 → ±${f2(p.L / 2)}`, fin: `${f2(p.L / 2)} × ${d3(wIn)} × ${d3(hIn)}`, stock: ['3 × 2.00 HT61 SLABS', `${f2(p.L / 2 + 0.25)} × ${f2(wIn + 0.16)}, FM 300-2`] },
    ...(cover > 0.01 ? [{ id: 'CS-1', qty: 2, what: `COVER ±${f2(p.hpIn.at(-1))}→±${f2(xW)}`, fin: `${f2(xW - p.hpIn.at(-1))} × ${f2(p.capW)} × ${d3(cover)}`, stock: ['HT61 OFFCUT', 'FROM THE CB SLABS'] }] : []),
  ];
  return { tw, wIn: r3(wIn), hIn: r3(hIn), capW: p.capW, sec, steps, cut, cover };
}

const P = csParams(), V = csVolumes(P), fx = (x, n = 2) => x.toFixed(n);
export const csMassOf = (vol) => (vol.UNI ?? 0) * P.rho.UNI + (vol.BID ?? 0) * P.rho.BID + (vol.PVC ?? 0) * P.rho.PVC;
const bookM = () => { RA ||= analyse(DEFAULT_DESIGN, false); return bookMass(buildPlyBook(RA).csSpar); };
const yd = (vin3, t) => vin3 / t / 144 / 12.5 * 1.15;   // linear yards of 38 in cloth (9.5 ft² a yard), +15 % cutting waste
const cloth = { UNI: Math.ceil(yd(V.UNI, P.tU)), BID: Math.ceil(yd(V.BID, P.tB)) };
const PRICE = { UNI: PP_PRICE.cf, BID: PP_PRICE.fab, foam2: +(PP_PRICE.coreFt2Qtr * 8 * 8).toFixed(2), foam34: +(PP_PRICE.coreFt2Qtr * 8 * 3).toFixed(2), L285gal: 0, H287qt: 0 };
// resin: the laminate is 60 % glass by weight; L285 mixes 100 : 40 with H287 by weight (≈ 10 lb a gallon of resin); +30 % waste
const resinLb = (V.UNI * P.rho.UNI + V.BID * P.rho.BID) * (1 - PROCESS.fibreWeightFraction), resinGal = resinLb / 1.4 / 10 * 1.3;

export const CS_DEF = {
  pn: 'LEZ-57-140', rev: 'H', status: 'released', nha: 'LEZ-000 (aircraft)', qty: 1, kind: 'laminate',
  // defined in full; release held until these are in (every other release item passes)
  holds: [],
  title: 'Centre-section spar',
  templates: 'T1–T4 (CNC core sections: lower-cap build-up, hard-point ramp, clevis-tail pocket), the core step table and the core cut list',
  revs: [{ rev: 'A', date: '2026-11-17', short: 'Initial definition', change: `Initial definition. The definition pass found the old 32-ply cap and 50-ply doubler (0.98 in) could not fit over the clevis tails (${fx(E.room, 3)} in): the cap now splits around each tail over a BID pad and filler, ${P.N - P.nEnd} cap plies drop off with the moment, and the clevis bolts moved inboard for laminate shear-out (clevis rev B). The engine-mount brackets now reach the spar (through-bolted hard points), and the part number it shared with the wing-attach assembly went to that assembly (LEZ-57-145).` }, { rev: 'B', date: '2026-11-17', short: 'Drag hard-point bolts 0.25 in higher', change: `The drag / torsion fitting (LEZ-57-141 rev B) sits on the new 1/4 in wing drag angle: its flange bolt rows, and so the spar's drag hard-point holes, move up to ${HARD.find((h) => h.id === 'drag').zIn.map((z) => z.toFixed(2)).join(' / ')} in above the lower face (were 1.80 / 3.30). Web doublers re-sized for the per-bolt loads.` }, { rev: 'C', date: '2026-11-18', short: 'Mount hard-point doubler re-sized', change: `The engine mount's upper pick-ups moved 0.5 in inboard and 1.5 in down (LEZ-71-220 / -222 rev B, block G) and the lower brackets' reactions changed with them: the mount hard point's web doubler re-sizes to ${(P.webDbl.find((w) => w.id === 'mount') || { n: '?' }).n} BID a side (was 10).` }, { rev: 'D', date: '2026-11-18', short: 'Control pass-throughs', change: `Block C (flight controls) route the aileron rods and rudder conduits through the spar: in at the forward web inside the fuselage, out at the aft web outboard of the cowl, clear of the tank and the engine bay. Added each side a Ø ${P.pass[0].d} tunnel for rod A (BL ${P.pass[0].x0} → ${P.pass[0].x1}, ${P.pass[0].z} in above A) and a Ø ${P.pass[1].d} tunnel for the conduit (BL ${P.pass[1].x0} → ${P.pass[1].x1}, ${P.pass[1].z} in above A), grommeted, and the web shear check net of them (cs-ctl-holes).` }, { rev: 'E', date: '2026-11-18', short: 'Mount hard-point web doubler 9 → 8 BID', change: 'Consequence of the engine mount rev C (ring diagonal deleted, ICD G phase 2): the lower pick-up reactions change and the mount hard point\'s web doubler re-sizes from 9 to 8 BID a side. Solid rebuilt; no other change.' },
    { rev: 'F', date: '2026-11-18', short: 'Mount-bracket bolt grip', change: `Hardware only (block A ICD, M-1): the lower-bracket through-bolts carried a 0.50 in firewall allowance in their grip; the firewall (LEZ-53-180) puts only its 0.016 in CRES patch between leg A and the spar's aft face, so the bolts are ${HARD.find((h) => h.id === 'mount').hw.bolt} (was AN6-57A, whose shank would have stood about 0.5 in past the nut face).` },
    { rev: 'G', date: '2026-11-18', short: 'Systems tunnel', change: `Block J (ICD J-F1): no line may cross the strake tank, so a grommeted systems tunnel each side carries the COM coax (right), the GMU 11 harness (left) and I's wingtip light harness (both) through the core on C's corridor: Ø ${CS_TUNNELS[0].d} from the forward face at BL ±${CS_TUNNELS[0].x0} to the aft face at BL ±${CS_TUNNELS[0].x1}, ${CS_TUNNELS[0].z} in above A (WL 39.50), in line with C's wing systems conduit (FS 153.15, BL ±12.90, WL 39.50, Ø 0.80); clear of C's rod and cable tunnels and the hard points; webs checked net of every hole (cs-sys-holes).` }, { rev: 'H', date: '2026-11-19', short: 'Low systems tunnel', change: `Miles's decision (option A, "swap lanes"): the wingtip light harness keeps the rev G tunnel alone (both sides); J's COM coax (right) and GMU 11 harness (left) move to a new low tunnel each side, Ø ${CS_TUNNELS[1].d} (phenolic-lined, 3/8 OD × 0.025) from the forward face at BL ±${CS_TUNNELS[1].x0} (inside the cabin wall) to the aft face at BL ±${CS_TUNNELS[1].x1} (outboard of the firewall's edge), ${CS_TUNNELS[1].z} in above A (WL ${fx(35.1664 + CS_TUNNELS[1].z)}), under C's rod tunnel and over the lower cap, in line with the jut-out's aft lane under the K1 bay. Its web traces stay inside the rev G doubler and off the governing line; cs-sys-holes now also checks every J tunnel's ligament to the lower cap (${fx(CS_TUNNELS[1].z - CS_TUNNELS[1].d / 2 - (P.N * P.tU + P.wrap * P.tB), 3)} in, rule 0.125). The solid carries the new pair of tunnels; mass less their core.` }],
  effectivity: 'One per aircraft',
  params: P,
  datums: [
    { id: 'A', what: 'Lower outer face of the box (the jig board)' },
    { id: 'B', what: 'Aft outer face (bonded to the firewall)' },
    { id: 'C', what: 'Aircraft centre line, BL 0' },
  ],
  features: [
    { id: 'outline', kind: 'profile', label: `Box ${fx(P.L, 1)} × ${fx(P.Wd)} × ${fx(P.H, 3)} in (BL ±${fx(P.L / 2, 1)})`, tol: 'Length ±0.06, width and depth ±0.03; straight within 1/32 in over the length' },
    { id: 'cap', kind: 'layup', label: `Upper cap: ${P.N} × HTS40 × ${P.capW} in at the centre line; plies 1–${P.N - P.nEnd} drop at BL ±${P.ends.map((e) => fx(e, 1)).join(', ±')}; plies ${P.N - P.nEnd + 1}–${P.N} run to BL ±${fx(P.xWeb, 2)} (clevis web faces). Lower cap: ${P.NL} × HTS40 full length${P.startsL.length ? `, plus ${P.startsL.length} build-up plies each end from the clevis web face inboard to BL ±${P.startsL.map((e) => fx(e, 1)).join(', ±')} (the end joint takes ${P.nEndL} over the clevis tail)` : ''}${P.endsL.length ? `; plies 1–${P.endsL.length} drop at BL ±${P.endsL.map((e) => fx(e, 1)).join(', ±')}` : ''}`, tol: 'Ply ends ±0.25 in; stagger ≥ 1 in' },
    { id: 'hp', kind: 'layup', label: `Hard points ×4: ${P.nPad} × 6781 pad under each clevis tail, ${P.nFill} × 6781 filler inboard of it; inboard ends step 0.10 in per ply (1:${E.ramp}) to BL ±${fx(P.hpIn.at(-1), 1)}`, tol: 'Ply ends ±0.10 in' },
    { id: 'pocket', kind: 'pocket', label: `Clevis pockets ×4 for LEZ-57-143 (tail ${P.cTail} in under ${fx(E.room, 3)} in of cap and wrap), pin axes at BL ±${fx(P.pin, 2)}`, tol: 'Located by the jig end-plate pins' },
    { id: 'pin', kind: 'hole', label: `Pin access holes ×4, Ø ${fx(P.pinD, 3)} through the wrap at BL ±${fx(P.pin, 2)}`, tol: 'On the clevis bore within 0.010', assy: true },
    { id: 'bolt', kind: 'hole', label: `Through-bolt holes ×${2 * P.bolts.length}, Ø ${fx(P.dB, 3)} +0.003/−0 vertical at BL ±${P.bolts.map((x) => fx(x, 2)).join(', ±')}`, tol: '+0.003 / −0.000, ⊥ A within 0.005', assy: true },
    ...P.pass.map((q) => ({ id: `pass-${q.id}`, kind: 'hole', label: `Control pass-through (${q.id === 'rod' ? 'aileron rod A' : q.id === 'cable' ? 'rudder conduit' : q.id === 'aft' ? 'rev H low systems tunnel: COM coax right, GMU 11 harness left; on the jut-out\'s aft lane' : 'systems tunnel: wingtip light harness alone (both sides, rev H); on C\'s wing systems conduit'}) ×2, Ø ${fx(q.d, 3)} from the forward face at BL ±${fx(q.x0)} to the aft face at BL ±${fx(q.x1)}, ${fx(q.z)} in above A; nylon grommet both faces`, tol: '±0.03 position; drilled after cure on the angle jig', assy: true })),
    ...HARD.map((h) => ({ id: `hp-${h.id}`, kind: 'hole', label: `${h.name} holes ×${2 * h.n}, Ø ${fx(h.d, 4)} fore-aft at BL ±${fx(h.y * 12, 2)}${h.cols.length > 1 ? ` ± ${h.cols[1]}` : ''}, ${h.zIn.join(' / ')} in above A`, tol: '+0.003 / −0.000, ⊥ B within 0.010', assy: true })),
  ],
  tolerances: { general: '.X ±0.06  ·  .XX ±0.03  ·  .XXX ±0.010  ·  ply ends ±0.25', flatness: 'Straight within 1/32 in over the length (A and B)', holes: 'Drilled through the jig end-plate and side drill guides', breakEdges: 'Sand cut laminate edges smooth; seal with resin' },
  drawingNotes: ['† Holes drilled after cure through the jig guides; the clevis blocks are bonded in at layup and their holes finished through the laminate.', 'Ply IDs and lengths per the ply table; S-LCxx lower cap, S-UCxx upper cap, S-HLLxx etc. hard-point packs (lower/upper, left/right).'],
  generalNote: 'Cured laminate: no dry spots, voids or delaminations (tap test); edges sealed.',
  na: {},

  material: {
    spec: LAM_SPEC(true),
    alt: 'None: the cloth styles and the core set the ply thickness and weight the sizing uses', form: `${LAM_FORM()}`, density: null,
    allowables: [...LAM_ALLOW(true),
      ['HTS40 compression (hot-wet, BVID, design)', `${(capSchedule(sized().d, sized().Z).allow / 1000).toFixed(1)} ksi`, 'DERIVED'], ['Bearing (hot-wet, design)', `${(E.Fbru / 1000).toFixed(1)} ksi`, 'DERIVED: at the published compressive strength (bearing not published)'], ['Interlaminar shear (hot-wet, design)', `${(sized().M.UNI.ILSS * 145.04).toFixed(0)} psi`, 'DERIVED'], ['HT61 core (minimum)', 'E 45, G 12, τ 0.46, σc 0.50 MPa', 'Diab Divinycell H technical data, June 2020 rev19 (SI), HT61 minimum values (boatbuildercentral.com copy, accessed 2026-11-19)']],
  },
  process: [
    { op: 'Core', spec: 'Half-blocks CB-1/2 bonded from HT61 slabs (FM 300-2); CNC-mill the lower-trough steps and the hard-point, tail and head pockets to templates T1–T4 and the core step table; cover strips CS-1 over the upper hard points.' },
    { op: 'Layup', spec: 'Webs, lower hard points and clevis tails (floxed, on the end-plate pins), lower cap shortest ply first; turn; upper side the same; overall wrap. Ply counts tallied on the traveler.' },
    { op: 'Handling', spec: PROCESS.layup },
    { op: 'Cure', spec: `${PROCESS.cure}. ${PROCESS.postCure}.` },
    { op: 'Drill', spec: 'Through-bolt, pin access and hard-point holes through the jig guides; crush tubes bonded in with flox; bolts installed and torqued per the hardware list.' },
    { op: 'Inspect', spec: 'Tap test every hard point and drop-off; weigh within ±5 % of the record; straightness on the jig board.' },
  ],

  checks: ['cs-cap', 'cs-cap-span', 'cs-web', 'cs-webbuck', 'cs-end-brg', 'cs-end-shearout', 'cs-end-net', 'cs-pad-lap', 'cs-hp-mount', 'cs-hp-drag', 'cs-ctl-holes', 'cs-sys-holes', 'cs-tank-wall'],
  rules: [
    { id: 'stagger', label: 'Drop-off and build-up stagger ≥ 1.0 in', v: Math.min(...[P.ends, P.endsL, [...P.startsL].sort((a, b) => a - b)].filter((a) => a.length > 1).flatMap((a) => a.slice(1).map((e, i) => e - a[i]))), min: 1 },
    { id: 'drop-clear', label: 'Last drop-off or build-up end ≥ 1 in inboard of the hard points (in)', v: P.hpIn.at(-1) - Math.max(...P.ends, ...P.endsL, ...P.startsL), min: 1 },
    { id: 'ramp', label: 'Hard-point ramp ≤ 1:10 (run per rise)', v: SPAR.step * 12 / P.tB, min: 10 },
    { id: 'room', label: 'Cap and wrap over the clevis tail fit the room (room / stack)', v: E.room / (P.nEnd * P.tU + P.wrap * P.tB), min: 1 },
    { id: 'eD', label: 'Laminate end distance at bolt 1, e/D ≥ 3', v: E.bolt1 / E.D, min: 3 },
    { id: 'pitch', label: 'Through-bolt pitch ≥ 4D', v: LUG.pitch, min: 4 },
    { id: 'side', label: 'Through-bolt side distance in the cap (b/2)/D ≥ 2.5', v: P.capW / 2 / P.dB, min: 2.5 },
    // rev I: the lowest hole against the lower cap's plies over the hole's BL span (the most of them), the highest against the upper cap's
    ...P.hard.map((h) => { const xs = h.cols.map((c) => h.x + c), nLo = Math.max(...xs.map((x) => P.NL + P.startsL.filter((s0) => s0 <= x + h.d / 2).length - P.endsL.filter((e) => e < x - h.d / 2).length)),
      nUp = Math.max(...xs.map((x) => P.nEnd + P.ends.filter((e) => e > x - h.d / 2).length)), lo = (Math.min(...h.z) - h.d / 2 - (nLo * P.tU + P.wrap * P.tB)) / h.d, up = ((P.H - nUp * P.tU - P.wrap * P.tB) - (Math.max(...h.z) + h.d / 2)) / h.d;
      return { id: `edge-${h.id}`, label: `${h.id === 'mount' ? 'Mount' : 'Drag'} hard-point holes clear the caps by ≥ 1.5 D (lower ${nLo}, upper ${nUp} plies there)`, v: Math.min(lo, up), min: 1.5 }; }),
  ],
  mass: { each: V.UNI * P.rho.UNI + V.BID * P.rho.BID + V.PVC * P.rho.PVC, from: 'region volumes (HTS40, 6781, HT61) × cured-ply and core densities, checked against the solid and against the ply book' },
  hardware: [],
  hardwareNote: `Through-bolts: ${2 * P.bolts.length} × ${HARD.length ? '' : ''}AN8 at the clevis tails, ${HARD.map((h) => `${2 * h.n} × AN${h.an} (${h.part})`).join(', ')}; 6061-T6 crush tubes at every bolt; MS21042L nuts, AN960 washers. Torque per AC 43.13-1B Table 7-1, low end.`,
  interfaces: [
    { id: 'I1', with: 'LEZ-57-143 clevis blocks (×4)', feature: 'pocket', what: 'Tail under the cap with the cap and wrap fitting the room; bolt pattern and diameter match the clevis',
      check: () => { const room = E.room - (P.nEnd * P.tU + P.wrap * P.tB), e = CLV.uWeb - CLV.bolts[0]; return { ok: room >= -1e-9 && Math.abs(e - E.bolt1) < 1e-9 && CLV.dB === P.dB && CLV.tail === P.cTail, detail: `${room.toFixed(4)} in to spare over the tail; bolt 1 ${e.toFixed(2)} in from the web (spar ${E.bolt1.toFixed(2)}); Ø ${CLV.dB} / ${P.dB}` }; } },
    { id: 'I2', with: 'LEZ-57-145 wing-attach pins', feature: 'pin', what: 'Pin access holes coaxial with the clevis bores and at least the pin diameter',
      check: () => ({ ok: Math.abs(P.pin - LUG.yPin * 12) < 1e-3 && P.pinD >= ATT.pin / 16 - 1e-9, detail: `BL ±${P.pin.toFixed(2)}, Ø ${P.pinD} for AN${ATT.pin}` }) },
    ...HARD.map((h, i) => ({ id: `I${3 + i}`, with: `${h.part} ${h.name.toLowerCase()}`, feature: `hp-${h.id}`, what: 'Bolt count and diameter match the bracket; holes clear the caps and the end hard points',
      check: () => { const x = h.y * 12 + Math.max(...h.cols) + h.d / 2, j = P.hpIn.findIndex((v) => v <= x), hpBot = j < 0 ? 0 : P.padBot - j * P.tB, edge = Math.min(...h.zIn) - h.d / 2, clr = edge - hpBot;
        const ok = clr >= 0.1 && h.n === (h.id === 'mount' ? 3 : 4);
        return { ok, detail: `${h.n} × Ø ${h.d} at BL ±${(h.y * 12).toFixed(1)}; ${j < 0 ? 'inboard of the end hard points' : `${clr.toFixed(2)} in clear of the hard point below`}; ${h.note}` }; } })),
    { id: `I${3 + HARD.length}`, with: 'Firewall (bonded to the aft face)', feature: 'outline', what: 'Aft face on the firewall station',
      check: () => { const aft = CS.s + CS.width / 2; return { ok: Math.abs(aft - GEO.firewall) < 1e-6, detail: `aft face FS ${(aft * 12).toFixed(2)}, firewall FS ${(GEO.firewall * 12).toFixed(2)}` }; } },
    { id: `I${4 + HARD.length}`, with: 'Strake skins (lapped over the caps)', feature: 'outline', what: 'Box depth leaves the strake skin and a 0.03 in bond line inside the strake contour',
      check: () => ({ ok: CS_FIT.clr * 12 >= 0.03 - 1e-9, detail: `${(CS_FIT.skin * 12).toFixed(3)} in skin + ${(CS_FIT.clr * 12).toFixed(3)} in bond line at the tightest station (BL ${(CS_FIT.at.y * 12).toFixed(1)})` }) },
  ],
  tooling: { needed: true, text: 'CS-spar layup jig: a straight, level board with end plates that locate the four clevis blocks on their pin bores and carry the through-bolt drill guides; side drill guides for the mount and drag hard points; core templates for the hard-point pockets and drop-off steps.' },
  sourcing: {
    blank: `${cloth.UNI} yd MTM45-1 / HTS40, ${cloth.BID} yd MTM45-1 / 6781 (50 in, +15 % waste); one 2 × 24 × 48 in and one 3/4 × 32 × 24 in HT61 sheet`,
    vendor: PP_VENDOR.vendor, url: PP_VENDOR.url,
    cost: cloth.UNI * PRICE.UNI + cloth.BID * PRICE.BID + PRICE.foam2 + PRICE.foam34 + resinGal * (PRICE.L285gal + 2 * PRICE.H287qt), costAsOf: '2026-11-17', perAircraft: 1,
    lead: 'Stock items', note: `Prepreg $${PRICE.UNI}/yd HTS40, $${PRICE.BID}/yd 6781; HT61 2 in sheet $${PRICE.foam2}, 3/4 in $${PRICE.foam34}; prepreg and HT61 at the public proxies (p_common PP_PRICE: by quote, BOUND); no resin to mix. Flox fill and hardware not included.`,
  },
};
export const csBookMass = bookM;
export { rho as CS_RHO };
export const csHash = () => paramHash(csParams());

// memory-audit integration (2026-11-19): this record's new revision
import { memRev } from './revs_memaudit.js';
import { LAM_ALLOW, LAM_SPEC, LAM_FORM, LAM_CURE, ppBuy, PP_VENDOR, PP_PRICE } from './p_common.js';
memRev(CS_DEF);
