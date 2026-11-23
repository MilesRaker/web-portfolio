// Block g_powerplant: definition records and drawing views for this block's parts. Owned by the block's agent.
// DEFS entries have the same shape as site/defn/release.js; VIEWS entries the same signature as site/defn/sheet.js (k, D).
import { paramHash } from '../util.js';
import { srcAudit } from '../src_audit.js';
import { primsExpect, massOfGroups } from '../g_prims.js';
import { primView } from '../g_views.js';
import { MOUNT } from '../../parts/wp1_powerplant.js';
import { RHO, enginePrims, cupPrims } from '../../parts/wpG1_engine.js';
import { WOOD, AL_BAR, bindExhaust, extPrims, propPrims, spinPrims } from '../../parts/wpG2_prop.js';
import { exhExits, SCAT_RHO, HOSE, FOAM, exhaustPrims, coolerPrims } from '../../parts/wpG4_systems.js';
import { lamRho, cowlBook } from '../../parts/wpG3_cowl.js';
import { ENG_DEF, engParams, engExpect, ISO_DEF, isoParams, CUP_DEF, cupParams, PP_DEF, ppParams } from '../g_engine.js';
import { PROP_DEF, propParams, EXT_DEF, extParams, SPIN_DEF, spinParams, bindCowl, bindExit } from '../g_prop.js';
import * as GR from '../g_rest.js';
import { gSolidClashes, flangeBand, NOTCHES, NOTCH_MAX, BAND, clearance } from '../g_icd.js';
import { FL, FPRIMS } from '../../parts/wp1_powerplant.js';
import { scoopRing as _sr } from '../../parts/wpG4_systems.js';
import { SCOOP } from '../../parts/wp10_induction_gear.js';
import { enginePrims as engP, cupPrims as cupP } from '../../parts/wpG1_engine.js';
import { HEAT_ARM_G, inBlister as inBl } from '../../parts/wpG4_systems.js';
import { CARB_ARMS, armTip, CABLE_CORNERS, CABLE, HEAT_END } from '../../parts/wpH1_layout.js';
import { solidRef } from '../solid_ref.js';
import { fusAt } from '../../structures.js';
import { insideFus as insideFusG } from '../../systems.js';
import { CWL } from '../../parts/wpG3_cowl.js';
const CWL_T = () => CWL.t;   // solids by reference: meshes load on demand
const ENG210_SOLID = solidRef('g_engine', 'ENG210_SOLID');
const ISO_SOLID = solidRef('g_isolator', 'ISO_SOLID');
const CUP_SOLID = solidRef('g_cups', 'CUP_SOLID');
const PROP_SOLID = solidRef('g_prop', 'PROP_SOLID');
const PEXT_SOLID = solidRef('g_pext', 'PEXT_SOLID');
const SPIN_SOLID = solidRef('g_spinner', 'SPIN_SOLID');
const COWL_SOLID = solidRef('g_cowl', 'COWL_SOLID');
const BAF_SOLID = solidRef('g_baffles', 'BAF_SOLID');
const NACA_SOLID = solidRef('g_naca', 'NACA_SOLID');
const SCOOP_SOLID = solidRef('g_scoop', 'SCOOP_SOLID');
const ABX_SOLID = solidRef('g_airbox', 'ABX_SOLID');
const FLT_SOLID = solidRef('g_filter', 'FLT_SOLID');
const EXH_SOLID = solidRef('g_exhaust', 'EXH_SOLID');
const MUFF_SOLID = solidRef('g_muff', 'MUFF_SOLID');
const OLC_SOLID = solidRef('g_cooler', 'OLC_SOLID');
const OLH_SOLID = solidRef('g_hoses', 'OLH_SOLID');

// the exhaust-exit, cowl-exit and exit-area hooks are bound in parts/wpG9_sync.js (at parts load, so the app and the audit agree)
void bindExhaust; void bindCowl; void bindExit;
const AC = [{ sx: 1, x: 0, y: 0, z: 0 }];   // solids built in the aircraft frame, in place
const nodes = (ks) => ks.map((k) => { const q = MOUNT.nodes[k]; return { sx: 1, x: q[1], y: q[0], z: q[2] }; });
const hwMass = (d) => () => d.hardware.reduce((a, l) => a + l.qty * l.each, 0);
const PE = (p, m) => primsExpect(p, m);
const LAM = lamRho(), AL = 0.098, SS = 0.289;
const prim = (def, solid, params, rho, extra = {}) => ({ def, solid, params, hash: paramHash, expect: PE, massOf: massOfGroups(rho), place: () => AC, ...extra });

export const DEFS = {
  'LEZ-71-200': { def: PP_DEF, solid: null, install: true, params: ppParams, hash: paramHash, shows: ['LEZ-71-210', 'LEZ-71-224', 'LEZ-71-221', 'LEZ-71-220'], massOf: hwMass(PP_DEF) },
  'LEZ-71-210': { def: ENG_DEF, solid: ENG210_SOLID, params: engParams, hash: paramHash, expect: engExpect, massOf: (m) => (m.volume > 0 ? ENG_DEF.mass.each : 0), place: () => AC },
  'LEZ-71-221': prim(ISO_DEF, ISO_SOLID, isoParams, { rubber: RHO.rubber, steel: RHO.steel }, { place: () => nodes(['ETL', 'ETR', 'EBL', 'EBR']) }),
  'LEZ-71-224': prim(CUP_DEF, CUP_SOLID, cupParams, { steel: RHO.steel }),
  'LEZ-61-100': prim(PROP_DEF, PROP_SOLID, propParams, { wood: WOOD.rho, al: AL_BAR.rho }),
  'LEZ-61-110': prim(EXT_DEF, PEXT_SOLID, extParams, { al: AL_BAR.rho, steel: RHO.steel }),
  'LEZ-61-120': prim(SPIN_DEF, SPIN_SOLID, spinParams, { al: AL_BAR.rho }),
  'LEZ-71-155': prim(GR.COWL_DEF, COWL_SOLID, GR.cowlParams, { lam: LAM }, { book: 'cowl', laminate: true, massBook: GR.cowlBookMass }),
  'LEZ-71-120': { def: GR.CA_DEF, solid: null, install: true, params: GR.caParams, hash: paramHash, shows: ['LEZ-71-155'], massOf: hwMass(GR.CA_DEF) },
  'LEZ-71-230': prim(GR.BAF_DEF, BAF_SOLID, GR.bafParams, { al: AL, rubber: 0.045 }),
  'LEZ-71-240': prim(GR.NACA_DEF, NACA_SOLID, GR.nacaParams, { lam: LAM }, { laminate: true }),
  'LEZ-71-250': prim(GR.SCOOP_DEF, SCOOP_SOLID, GR.scpParams, { lam: LAM }, { laminate: true }),
  'LEZ-71-251': prim(GR.ABX_DEF, ABX_SOLID, GR.abxParams, { al: AL, steel: RHO.steel }),
  'LEZ-71-252': prim(GR.FLT_DEF, FLT_SOLID, GR.fltParams, { foam: FOAM.rho }),
  'LEZ-78-100': prim(GR.EXH_DEF, EXH_SOLID, GR.exhParams, { ss: SS }),
  'LEZ-78-110': prim(GR.MUFF_DEF, MUFF_SOLID, GR.muffParams, { ss: SS, scat: SCAT_RHO }),
  'LEZ-79-100': { def: GR.OIL_DEF, solid: null, install: true, params: GR.oilParams, hash: paramHash, shows: ['LEZ-71-210'], massOf: hwMass(GR.OIL_DEF) },
  'LEZ-79-110': { def: GR.OLC_DEF, solid: OLC_SOLID, params: GR.olcParams, hash: paramHash, expect: PE, massOf: GR.olcMass, place: () => AC },
  'LEZ-79-115': prim(GR.OLH_DEF, OLH_SOLID, GR.olhParams, { hose: HOSE.rho }),
};
// source audit 2026-11-19: one new rev per changed part (docs/blocks/*.md "Source audit")
srcAudit(DEFS, {
"LEZ-71-210": [
"Source audit: flange, magnetos, TCDS wording, cost",
"Crankshaft flange per SAE No. 1 (AS127): 4.375 in bolt circle, 6 × 3/8 in AN6 (was 4.75 / 7/16, typed). Magnetos per the current Lycoming build page: Slick 4370 / 4371 (TCDS rev 19 lists 4251 / 4250). Pusher wording: TCDS E-223 rev 19 (2003) Note 5 lists pusher eligibility for the -C1 only; the current revision is to be checked (open item for Miles). Carburettor MA-3A has no accelerator pump: primer LEZ-73-140 added. Exchange cost $45,167 (pass 2). Sources in docs/blocks/g_powerplant.md \"Source audit\"."
],
"LEZ-71-221": [
"Source audit: cone bushings, AN6 through-bolts, cost",
"Isolators per the O-235-C conical-mount bushings (Aircraft Spruce 71032 / 60883): 8 per engine, 0.50 in bore with a spacer tube; through-bolts AN6 (was AN7); cost 16.50 × 8 (was 95 per set × 4)."
],
"LEZ-61-100": [
"Source audit: AN6 prop bolts, torque",
"Prop bolts AN6 on the SAE No. 1 4.375 in circle with MS21042L6 / AN960-616; wood-prop bolt torque 175–225 in-lb and crank-bolt torque 160–190 in-lb per Sensenich (were typed)."
],
"LEZ-61-110": [
"Source audit: re-drilled to SAE No. 1, body Ø 3.00",
"Both flanges re-drilled to the SAE No. 1 circle (4.375 in, 6 × Ø 0.390 for AN6; was 4.75 in). The body goes from Ø 3.25 / 2.75 to Ø 3.00 / 2.50 so the bolt heads keep 0.30 in socket room (rule head now ≥ 1); pext-body MS +6.33, pext-bolts +20.7, prop-drive +0.43."
],
"LEZ-71-251": [
"Carb-heat conduit bracket re-angled for the A-920 swivel",
"The conduit end on the box front-left corner stands 1.5 in back from the arm and the cable axis is 18° (was 0°), so the rod-end swing stays inside the A-920 ±4° swivel over the 90° arm travel (heat 3.30°)."
],
"LEZ-78-100": [
"Source audit: cost alternative",
"Shop-built stacks kept ($220 material, BOUND); the ACS Long-EZ exhaust 33804 ($2,599) listed as the bought alternative."
],
"LEZ-79-100": [
"Source audit: oil endurance paired by power setting",
"Oil consumption and fuel burn now come from the same Lycoming OM 60297-9 p. 3-7 row (rated 10.7 gph / 0.52 qt/h, 75 % 7.3 / 0.29, 65 % 5.8 / 0.25); the worst row governs (oil-qty MS +0.79, was +0.42 with an unpaired 0.006 lb/bhp·h at 115 hp and 6 gph). Minimum quantity 2 qt BOUND."
],
"LEZ-79-110": [
"Source audit: Aero-Classics 8000074",
"Cooler named: Aero-Classics 8000074 9-row (8.14 × 5.33 × 3.62 in, 3/8 NPT ports with -8 adapters, PMA); cost 573 (was 450, typed). Heat rating not published: 30,000 BTU/h BOUND."
],
"LEZ-79-115": [
"Source audit: Stratoflex 111-8 hose",
"-8 hose per Stratoflex 111-8: ID 0.406, OD 0.77 bare, 0.26 lb/ft, 2,000 psi; smeared density 0.033 lb/in³ (was 0.010); $18.85/ft."
]
});
void cowlBook;

// ------------------------------------------------------------------------------------------- ICD phase-2 interface checks
/** every block G definition solid's primitives (definition frame, in), keyed by part number and feature */
const gPrims = () => Object.entries(DEFS).flatMap(([pn, d]) => { if (!d.params || d.install) return []; const P = d.params(); return (P.prims || []).map((p) => ({ pn, feat: p.feat || p.t, p })); });
const fx2 = (v) => v.toFixed(2);
PP_DEF.interfaces.push({ id: 'I3', with: 'Every block G solid, LEZ-71-220 tubes, LEZ-71-222, LEZ-71-223 (ICD phase 2)', feature: 'hang', what: 'No two solids interpenetrate by more than 0.02 in, except the declared mates; open items (ICD G-O1 induction, G-O2 engine envelope rev B) listed',
  check: () => { const c = gSolidClashes(gPrims()); return { ok: c.fail.length === 0, detail: `${c.n} primitives; ${c.fail.length ? 'clashes: ' + c.fail.map((h) => `${h.a} × ${h.b} ${fx2(h.d)} in`).join('; ') : 'no clash'}${c.open.length ? `; OPEN (not counted): ${c.open.map((h) => `${h.a} × ${h.b} ${fx2(h.d)} in`).join('; ')}` : ''}` }; } });
// ------------------------------------------------------------------------------------------- the blister region (scoop rev B, ICD G-O1)
const primsOf = (pn) => DEFS[pn].params().prims;
const blister = () => ['LEZ-71-250', 'LEZ-71-251', 'LEZ-71-252'].flatMap(primsOf).concat(primsOf('LEZ-78-110').filter((p) => p.feat === 'scat'));
const fTee = () => (FPRIMS['LEZ-73-110'] || []).filter((p) => p.feat === 'tee' || p.feat === 'hose2' || /hose2/.test(p.feat || ''));
GR.SCOOP_DEF.interfaces.push(
  { id: 'I2', with: 'LEZ-73-110 carb tee and engine-to-carb hose (block F)', feature: 'shell', what: 'Tee and hose ≥ 0.25 in from the scoop shell, the air box, the filter and the SCAT',
    check: () => { const T = fTee(); if (!T.length) return { ok: false, detail: 'block F tee / hose primitives not found' }; const c = clearance(T, blister()); return { ok: c.d >= 0.25, detail: `${fx2(c.d)} in (${c.a} to ${c.b}); ${T.length} F primitives` }; } },
  { id: 'I3', with: 'LEZ-73-100 gascolator drain hole in the lower cowl (block F, Ø 0.5)', feature: 'shell', what: 'Drain hole ≥ 0.5 in outside the scoop outline (mouth lip and edges) at the cowl skin',
    check: () => { const q = FL.gasc.drainTip, S = SCOOP, n = 60, edge = []; for (let i = 0; i <= n; i++) { const s = S.s0 + (S.s1 - S.s0) * i / n, r = _sr(s, 0, 41); edge.push(r[0], r[r.length - 1]); } edge.push(..._sr(S.s0, 0, 41));
      const d = Math.min(...edge.map((p) => Math.hypot(p[0] - q[0], p[1] - q[1]))) - 0.25, inside = q[1] > S.s0 * 12; return { ok: !inside && d >= 0.5, detail: `drain at BL ${fx2(q[0])}, FS ${fx2(q[1])}: ${fx2(d)} in from the scoop outline${inside ? ' (inside it)' : ''}` }; } });
GR.MUFF_DEF.interfaces.push({ id: 'I2', with: 'LEZ-71-210 sump, carburettor, crankcase; LEZ-71-224 cups', feature: 'scat', what: 'SCAT ≥ 0.25 in from the sump, carburettor, crankcase and cups',
  check: () => { const sc = primsOf('LEZ-78-110').filter((p) => p.feat === 'scat'), E = engP().filter((p) => ['sump', 'carb', 'case', 'acc'].includes(p.feat)).concat(cupP()); const c = clearance(sc, E); return { ok: c.d >= 0.25, detail: `${fx2(c.d)} in to the ${c.b}` }; } });
GR.ABX_DEF.interfaces.push({ id: 'I2', with: 'LEZ-71-210 carburettor envelope', feature: 'box', what: 'Box below the carb flange; walls and lid ≥ 0.10 in, filter, flapper, spigot and arm ≥ 0.25 in from the carburettor envelope (adapter excepted)',
  check: () => { const carb = engP().filter((p) => p.feat === 'carb'), P = primsOf('LEZ-71-251').filter((p) => p.feat !== 'adapter'), big = P.filter((p) => p.feat === 'box' || p.feat === 'lid'), small = P.filter((p) => !(p.feat === 'box' || p.feat === 'lid')).concat(primsOf('LEZ-71-252'));
    const a = clearance(big, carb), b = clearance(small, carb); return { ok: a.d >= 0.10 && b.d >= 0.25, detail: `walls / lid ${fx2(a.d)} in (${a.a}); filter, flapper, spigot, arm ${fx2(b.d)} in (${b.a})` }; } });
// H-O1 (coordinator's decision 2026-11-19): SCAT and spigot ≥ 1 in from block H's carburettor arms, their rods' sweeps and
// their conduits; the carb-heat arm with its axis and travel, reached by a straight cable from the blister's front
const segPts = (a, b, n = 12) => Array.from({ length: n + 1 }, (_, i) => a.map((v, j) => v + (b[j] - v) * i / n));
const hArms = () => Object.values(CARB_ARMS).flatMap((A) => Array.from({ length: 15 }, (_, i) => -A.travel / 2 + A.travel * i / 14).flatMap((d) => segPts(A.pivot, armTip(A, d))));
const hConduits = () => ['throttle', 'mixture'].flatMap((k) => { const P = CABLE_CORNERS[k].pts.slice(-3); return P.slice(1).flatMap((q, i) => segPts(P[i], q, 24)); });
const ptClear = (pts, prims, r) => clearance(pts.map((p) => ({ t: 'box', feat: 'pt', c: p, d: [2 * r, 2 * r, 2 * r] })), prims);
GR.MUFF_DEF.interfaces.push({ id: 'I3', with: 'LEZ-71-210 rev B carburettor arms, their rod sweeps; block H\'s throttle and mixture conduits (H-O1)', feature: 'scat', what: 'SCAT and heat spigot ≥ 1 in from the arms over their travel and from the conduits',
  check: () => { const S = [...primsOf('LEZ-78-110').filter((p) => p.feat === 'scat'), ...primsOf('LEZ-71-251').filter((p) => p.feat === 'spigot')], a = ptClear(hArms(), S, 0.10), c = ptClear(hConduits(), S, CABLE.od / 2);
    return { ok: a.d >= 1.0 && c.d >= 1.0, detail: `arm sweeps ${fx2(a.d)} in (${a.b}), conduits ${fx2(c.d)} in (${c.b})` }; } });
GR.ABX_DEF.interfaces.push({ id: 'I3', with: 'LEZ-76-110 carb-heat cable (block H, H-O1)', feature: 'arm', what: `Arm on a BL pin at FS ${fx2(HEAT_ARM_G.pivot[1])}, WL ${fx2(HEAT_ARM_G.pivot[2])}, R ${HEAT_ARM_G.r} in, ${HEAT_ARM_G.travel}° (COLD tip aft, HOT forward); the straight cable from the conduit end to the tip over the whole travel ≥ 0.25 in from every other block G solid, ≥ 1 in from the SCAT and 0.25 in inside the blister`,
  check: () => { const H = HEAT_ARM_G, line = [-45, -22.5, 0, 22.5, 45].flatMap((d) => segPts(H.conduitEnd, H.at(d), 16));
    const others = Object.keys(DEFS).filter((pn) => DEFS[pn].params && !DEFS[pn].install && pn !== 'LEZ-71-250').flatMap((pn) => primsOf(pn).filter((p) => (p.t === 'box' || p.t === 'cyl' || p.t === 'loft') && !(pn === 'LEZ-71-251' && (p.feat === 'arm' || p.feat === 'bracket' || p.feat === 'flapper'))));
    const scat = primsOf('LEZ-78-110').filter((p) => p.feat === 'scat'), o = ptClear(line, others, CABLE.inner / 2), sc = ptClear(line, scat, CABLE.inner / 2);
    const inside = Math.min(...line.map((q) => { let lo = -1, hi = 2; for (let k = 0; k < 20; k++) { const m = (lo + hi) / 2; if (inBl(q, m)) lo = m; else hi = m; } return lo; }));
    return { ok: o.d >= 0.25 && sc.d >= 1.0 && inside >= 0.25, detail: `cable line ${fx2(o.d)} in from ${o.b}, ${fx2(sc.d)} in from the SCAT, ${fx2(inside)} in inside the blister; stroke ${fx2(H.cold[1] - H.hot[1])} in` }; } });
GR.ABX_DEF.interfaces.push({ id: 'I4', with: 'LEZ-76-110 carb-heat conduit end fitting (block H, wpH1 HEAT_END)', feature: 'arm', what: 'The conduit-end bracket holds H\'s end fitting: the end point and the 25° axis are H\'s (≤ 0.01 in, ≤ 0.5°), the fitting\'s hole ≥ 0.15 in inside the tab',
  check: () => { const H = HEAT_ARM_G, E = HEAT_END.E, d = Math.hypot(...H.conduitEnd.map((v, i) => v - E[i])), ang = Math.acos(Math.min(1, Math.abs(H.cableDir.reduce((a, v, i) => a + v * HEAT_END.u[i], 0)) / Math.hypot(...H.cableDir))) * 180 / Math.PI;
    const tab = primsOf('LEZ-71-251').filter((p) => p.feat === 'bracket' && p.holes && p.holes.length)[0], m = tab ? Math.min(E[0] - (tab.c[0] - tab.d[0] / 2), tab.c[0] + tab.d[0] / 2 - E[0], E[2] - (tab.c[2] - tab.d[2] / 2), tab.c[2] + tab.d[2] / 2 - E[2]) - tab.holes[0].r : -1;
    return { ok: d <= 0.01 && ang <= 0.5 && m >= 0.15, detail: `bracket end ${H.conduitEnd.map((v) => fx2(v)).join(', ')} vs H's ${E.map((v) => fx2(v)).join(', ')} (${fx2(d)} in); axis ${fx2(ang)}° off H's 25° down; hole ${fx2(m)} in inside the tab` }; } });
GR.ABX_DEF.rev = 'D';
GR.ABX_DEF.revs = [...GR.ABX_DEF.revs, { rev: 'D', date: '2026-11-19', short: 'Conduit-end bracket at H\'s end', change: 'Final integration (block H open item, ICD h_engsys §7.5–7.6): the conduit-end bracket moves from FS 160.20, WL 23.30 (0.40 in from the blister skin, unreachable by a conduit with a 6 in bend) to block H\'s end fitting at BL −4.60, FS 162.50, WL 24.75 on the left wall\'s top edge, axis 25° down: a 0.063 tab beside the wall with the fitting through it and a foot riveted to the wall\'s outer face. I4 checks the end against H\'s HEAT_END; I3 re-runs the cable line from the new end.' }];
// final integration (block F open item LEZ-28-100 I5): the gascolator drain hole in the lower cowl, drilled at assembly
export const COWL_DRAIN = { d: 0.50, stem: 0.38 };
GR.COWL_DEF.features.push({ id: 'drain', kind: 'hole', label: `Rev C: Ø ${COWL_DRAIN.d} hole in the lower cowl for the gascolator drain stem (LEZ-73-100, Ø ${COWL_DRAIN.stem}) at BL ${fx2(FL.gasc.drainTip[0])}, FS ${fx2(FL.gasc.drainTip[1])}, edge sealed with resin; drilled at assembly on the stem with the cowl closed`, tol: '±0.06 in on the stem', assy: true });
GR.COWL_DEF.interfaces.push({ id: 'I4', with: 'LEZ-73-100 gascolator drain stem (block F)', feature: 'drain', what: 'The stem passes the hole with ≥ 0.05 in radial room; its tip at the cowl skin (within the laminate ± 0.1 in); hole edge ≥ 2 D from the firewall hinge line', check: () => { const q = FL.gasc.drainTip, room = (COWL_DRAIN.d - COWL_DRAIN.stem) / 2, oml = (() => { const f = fusAt(q[1] / 12); let lo = f.bot * 12 - 1, hi = (f.bot + f.top) * 6; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (insideFusG(q[1] / 12, q[0] / 12, m / 12, 0)) hi = m; else lo = m; } return hi; })(), tip = q[2] - oml, edge = q[1] - 127.5 - COWL_DRAIN.d / 2;
  return { ok: room >= 0.05 && tip >= -0.1 && tip <= CWL_T() + 0.1 && edge >= 2 * COWL_DRAIN.d, detail: `radial room ${fx2(room)} in; tip ${fx2(tip)} in above the OML (laminate ${fx2(CWL_T())} in); ${fx2(edge)} in aft of the hinge line` }; } });
GR.COWL_DEF.rev = 'C';
GR.COWL_DEF.revs = [...GR.COWL_DEF.revs, { rev: 'C', date: '2026-11-19', short: 'Gascolator drain hole', change: `Final integration (block F's open item LEZ-28-100 I5): a Ø ${COWL_DRAIN.d} hole in the lower cowl at the gascolator drain stem (BL ${fx2(FL.gasc.drainTip[0])}, FS ${fx2(FL.gasc.drainTip[1])}), drilled at assembly, 0.91 in outside the scoop outline (LEZ-71-250 I3). Check I4. No change to the laminate or the solid.` }];
GR.CA_DEF.features.push({ id: 'notch', kind: 'cut', label: `Flange notches: the firewall leg cut away ${NOTCHES.map((n) => `${n.id} BL ${n.bl.join('…')}, WL ${n.wl.join('…')}`).join('; ')} (${NOTCHES[0].what.replace(/^round the left /, 'round each ')}); the hinge leaf runs on across each notch`, tol: '±0.06' });
GR.CA_DEF.interfaces.push({ id: 'I2', with: 'LEZ-71-222 bases, LEZ-71-223 legs A (firewall aft face)', feature: 'notch', what: `Fittings clear of the flange band (${BAND} in inside the OML) except inside a declared notch; notches ≤ ${NOTCH_MAX} in`,
  check: () => { const f = flangeBand(); return { ok: f.bad.length === 0 && f.span <= NOTCH_MAX, detail: f.bad.length ? `inside the band outside a notch: ${[...new Set(f.bad.map((b) => b.what))].join(', ')} (min ${fx2(Math.min(...f.bad.map((b) => b.d)))} in)` : `${f.inNotch.length ? `${[...new Set(f.inNotch.map((b) => `${b.what} in ${b.nt}`))].join(', ')} (min ${fx2(Math.min(...f.inNotch.map((b) => b.d)))} in)` : 'no fitting in the band'}; longest notch ${fx2(f.span)} in` }; } });

const SIDE = { u: [1, 1], v: [2, 1] }, PLAN = { u: [1, 1], v: [0, 1] }, FRONT = { u: [0, -1], v: [2, 1] };
const two = (a, b) => primView({ views: [{ title: a[0], ...a[1] }, { title: b[0], ...b[1] }], frame: 'aircraft' });
export const VIEWS = {
  'LEZ-71-210': two(['SIDE ELEVATION, FWD ←', SIDE], ['PLAN, FWD ←', PLAN]),
  'LEZ-71-221': primView({ views: [{ title: 'SECTION ON THE AXIS, FWD ←', u: [1, 1], v: [2, 1] }, { title: 'END VIEW, LOOKING FORWARD', u: [0, -1], v: [2, 1] }], frame: 'own' }),
  'LEZ-71-224': two(['SIDE ELEVATION, FWD ←', SIDE], ['VIEW LOOKING FORWARD', FRONT]),
  'LEZ-71-200': primView({ prims: () => [...enginePrims(), ...cupPrims(), ...extPrims(), ...spinPrims(), ...propPrims().filter((p) => p.feat !== 'blade'), ...exhaustPrims(), ...coolerPrims()], views: [{ title: 'SIDE ELEVATION, FWD ← (BLADES NOT SHOWN)', ...SIDE, area: [70, 120, 1080, 470] }], frame: 'aircraft' }),
  'LEZ-61-100': two(['SIDE ELEVATION, FWD ←', SIDE], ['VIEW LOOKING FORWARD', FRONT]),
  'LEZ-61-110': two(['SIDE ELEVATION, FWD ←', SIDE], ['VIEW LOOKING FORWARD', FRONT]),
  'LEZ-61-120': two(['SIDE ELEVATION, FWD ←', SIDE], ['VIEW LOOKING FORWARD', FRONT]),
  'LEZ-71-155': two(['SIDE ELEVATION, FWD ←', SIDE], ['PLAN, FWD ←', PLAN]),
  'LEZ-71-120': primView({ prims: () => GR.cowlParams().prims, views: [{ title: 'COWL WITH THE HINGE LINE AT A, SIDE, FWD ←', ...SIDE, area: [70, 120, 1080, 470] }], frame: 'aircraft' }),
  'LEZ-71-230': two(['SIDE ELEVATION, FWD ←', SIDE], ['VIEW LOOKING FORWARD', FRONT]),
  'LEZ-71-240': two(['SIDE ELEVATION, FWD ←', SIDE], ['VIEW LOOKING FORWARD', FRONT]),
  'LEZ-71-250': two(['SIDE ELEVATION, FWD ←', SIDE], ['VIEW LOOKING FORWARD', FRONT]),
  'LEZ-71-251': two(['SIDE ELEVATION, FWD ←', SIDE], ['PLAN, FWD ←', PLAN]),
  'LEZ-71-252': two(['SIDE ELEVATION, FWD ←', SIDE], ['PLAN, FWD ←', PLAN]),
  'LEZ-78-100': two(['SIDE ELEVATION, FWD ←', SIDE], ['PLAN, FWD ←', PLAN]),
  'LEZ-78-110': two(['SIDE ELEVATION, FWD ←', SIDE], ['PLAN, FWD ←', PLAN]),
  'LEZ-79-100': primView({ prims: () => enginePrims().filter((p) => p.feat === 'sump' || p.feat === 'case'), views: [{ title: 'SUMP ON THE ENGINE, SIDE, FWD ←', ...SIDE, area: [70, 120, 1080, 470] }], frame: 'aircraft' }),
  'LEZ-79-110': two(['SIDE ELEVATION, FWD ←', SIDE], ['VIEW LOOKING FORWARD', FRONT]),
  'LEZ-79-115': two(['PLAN, FWD ←', PLAN], ['VIEW LOOKING FORWARD', FRONT]),
};
