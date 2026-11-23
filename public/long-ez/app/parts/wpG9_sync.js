// WPG9 — block G: bring the system records (display, clash and mass geometry) in line with the definition records, so
// the 3D view, the routing checks and the mass roll-up read the same parts the sheets define (ICD G-F2, G-F5, G-F7).
// Runs after every block G module. The engine keeps its richer display shape (engine_o235.js); its ports move.
import { GEO, CS_FIT } from '../structures.js';
import { partByPN, TRACES } from '../systems.js';
import { MOUNT } from './wp1_powerplant.js';
import { BRK } from './wp6_engine_install.js';
import { UPK } from './wp23_upk.js';
import { bracketBoxes, LEGB_TRIM } from './wpG1_engine.js';
import { OIL_PORTS, COOLER_PORTS, HOSES, HOSE, HEAT_PORT, muffPrims, AB, scoopEnvelope } from './wpG4_systems.js';
import { SCOOP } from './wp10_induction_gear.js';
import * as E from '../defn/g_engine.js';
import * as P from '../defn/g_prop.js';
import * as R from '../defn/g_rest.js';
import { MTB_DEF } from '../defn/mount_bracket.js';
import { bindExhaust } from './wpG2_prop.js';
import { exhExits } from './wpG4_systems.js';
// hooks the checks read (prop-clear: the exhaust exits; the prop records: the cowl exit and its area), bound when the parts
// load (moved from site/defn/blocks/g_powerplant.js, final integration): the explorer and the audit see the same checks
bindExhaust(exhExits); P.bindCowl(R.cowlExitClear); P.bindExit(R.exitArea);

const ft = (q) => [q[1] / 12, q[0] / 12, q[2] / 12];
/** a definition primitive (in, [BL, FS, WL]) as a system display primitive (ft, [FS, BL, WL]) */
function toSys(p) {
  if (p.t === 'box') return { t: 'box', c: ft(p.c), d: [p.d[1] / 12, p.d[0] / 12, p.d[2] / 12] };
  if (p.t === 'cyl') return { t: 'cyl', a: ft(p.a), b: ft(p.b), r: p.r / 12 };
  if (p.t === 'cone') return { t: 'cyl', a: ft(p.a), b: ft(p.b), r: Math.max(p.r1, p.r2) / 12 };
  if (p.t === 'loft') return { t: 'loft', secs: p.secs.map((s) => s.map(ft)) };
  return null;
}
const hw = (d) => (d.hardware || []).reduce((a, l) => a + (l.qty || 0) * (l.each || 0), 0);
const SYNC = [
  ['LEZ-71-221', E.ISO_DEF, null, (d) => d.mass.each + hw(d)], ['LEZ-71-224', E.CUP_DEF, E.cupParams], ['LEZ-71-200', E.PP_DEF, null],
  ['LEZ-61-100', P.PROP_DEF, P.propParams, (d) => d.mass.each + hw(d)], ['LEZ-61-110', P.EXT_DEF, P.extParams, (d) => d.mass.each + hw(d)], ['LEZ-61-120', P.SPIN_DEF, P.spinParams, (d) => d.mass.each + hw(d)],
  ['LEZ-71-120', R.CA_DEF, null], ['LEZ-71-230', R.BAF_DEF, R.bafParams, (d) => d.mass.each + hw(d)], ['LEZ-71-240', R.NACA_DEF, R.nacaParams], ['LEZ-71-250', R.SCOOP_DEF, null, (d) => d.mass.each + hw(d)] /* keeps wp10's envelope boxes: they extend the OML for the fit checks */,
  ['LEZ-71-251', R.ABX_DEF, R.abxParams, (d) => d.mass.each + hw(d)], ['LEZ-71-252', R.FLT_DEF, R.fltParams], ['LEZ-78-100', R.EXH_DEF, null, (d) => d.mass.each + hw(d)], ['LEZ-78-110', R.MUFF_DEF, null, (d) => d.mass.each + hw(d)],
  ['LEZ-79-100', R.OIL_DEF, null], ['LEZ-79-110', R.OLC_DEF, R.olcParams, (d) => d.mass.each + hw(d)], ['LEZ-79-115', R.OLH_DEF, null, (d) => d.mass.each + hw(d)],
];
for (const [pn, d, params, massFn] of SYNC) {
  const p = partByPN(pn); if (!p) continue;
  p.massEach = +((massFn ? massFn(d) : d.mass.each)).toFixed(4); delete p.extraMass;
  p.src = { ...p.src, mass: `GEOMETRY: the definition record (${pn} rev ${d.rev})` };
  if (params) { const g = params().prims.map(toSys).filter(Boolean); if (g.length) p.geo = g; }
}
// names that changed with the definition
partByPN('LEZ-61-100').name = `Propeller, fixed-pitch wood, ${(2 * GEO.prop.r * 12).toFixed(0)} in`;
partByPN('LEZ-79-110').name = 'Oil cooler, 9-row (lower rear baffle wall, right; engine-mounted)';
partByPN('LEZ-79-110').blurb = 'Cooler on the right lower rear baffle wall over a cut-out, so lower-plenum air passes forward through it into the accessory bay; carried by the engine on a doubler frame and a strap to the crankcase.';
partByPN('LEZ-71-240').name = 'Cooling inlets, NACA submerged (L/R, lower cowl)';
partByPN('LEZ-71-240').inlet = { area: R.NACA_DEF ? 2 * 5.0 * 4.1 : 40 };
// everything carried by the engine sits on the mount; the inlets and the scoop belong to the cowl
for (const pn of ['LEZ-71-251', 'LEZ-71-252', 'LEZ-79-110', 'LEZ-79-115', 'LEZ-78-110', 'LEZ-71-224']) { const p = partByPN(pn); if (p) p.onMount = true; }
for (const pn of ['LEZ-71-240', 'LEZ-71-250']) { const p = partByPN(pn); if (p) p.onMount = false; }
// ports and routes: engine oil-cooler ports on the crankcase side, cooler ports on its inboard face, straight hoses
{ const e = partByPN('LEZ-71-210'); e.ports['OIL-OUT'].at = ft(OIL_PORTS.OUT); e.ports['OIL-RTN'].at = ft(OIL_PORTS.RTN); e.ports['OIL-OUT'].fit = 'AN816-8D nipple, crankcase right side'; e.ports['OIL-RTN'].fit = 'AN816-8D nipple, crankcase right side'; }
{ const c = partByPN('LEZ-79-110'); c.ports.IN.at = ft(COOLER_PORTS.IN); c.ports.OUT.at = ft(COOLER_PORTS.OUT); c.ports.IN.fit = 'AN816-8D, inboard face'; c.ports.OUT.fit = 'AN816-8D, inboard face'; }
{ const h = partByPN('LEZ-79-115'); h.geo = HOSES().map((x) => ({ t: 'path', pts: x.pts.map(ft), dIn: HOSE.od, massPerFt: 0, cls: 'oil', ends: [x.from, x.to], endFit: ['-8 swivel, straight', '-8 swivel, straight'] })); }
{ const a = partByPN('LEZ-71-251'); a.ports['HEAT-IN'].at = ft(HEAT_PORT); }
// scoop rev B (ICD G-O1): the blister's interior as stacked boxes (the OML envelope for containment and routing), the ram
// inlet at the mouth and the air box's ram opening at its front wall
{ const sc = partByPN('LEZ-71-250'), ab = partByPN('LEZ-71-251'), yc = (AB.x0 + AB.x1) / 2, ram = [yc, AB.y0, (AB.floors[0][2] + 23.4) / 2];
  sc.geo = scoopEnvelope().map((b) => ({ t: 'box', c: ft(b.c), d: [b.d[1] / 12, b.d[0] / 12, b.d[2] / 12] }));
  sc.ports['RAM-IN'].at = [SCOOP.s0, SCOOP.y, ft([0, 0, scoopEnvelope.mouthZ()])[2]]; sc.ports['RAM-OUT'].at = ft(ram); ab.ports['RAM-IN'].at = ft(ram); }
{ const m = partByPN('LEZ-78-110'), mp = muffPrims(), sc = mp.filter((q) => q.feat === 'scat'), pts = [sc[0].a, ...sc.map((q) => q.b)].map(ft);
  m.geo = [toSys(mp[0]), { t: 'path', pts, dIn: 2.0, massPerFt: 0, cls: 'air', extSeg: [pts.length - 1] /* the last run is inside the scoop blister (OML envelope, not a cabin / bay zone) */, ends: ['LEZ-78-110:MUFF-OUT', 'LEZ-71-251:HEAT-IN'], endFit: ['hose clamp', 'hose clamp'] }];
  m.ports['MUFF-OUT'].at = pts[0]; m.ports['MUFF-IN'].at = ft(mp[0].b); }
void TRACES;
// upper pick-ups and lower brackets as the released records draw them (rev B)
{ const p = partByPN('LEZ-71-222'), FW = GEO.firewall;
  p.geo = ['FTL', 'FTR'].flatMap((n) => { const q = MOUNT.nodes[n], o = Math.sign(q[1]);
    return [{ t: 'box', c: [FW + UPK.tb / 24, q[1], q[2]], d: [UPK.tb / 12, UPK.B / 12, UPK.B / 12], colour: 0x9aa3ad },
      ...[-1, 1].map((sd) => ({ t: 'box', c: [FW + (UPK.tb + (UPK.h + UPK.e) / 2) / 12, q[1] + sd * (UPK.gap / 2 + UPK.te / 2) / 12, q[2]], d: [(UPK.h + UPK.e) / 12, UPK.te / 12, UPK.w / 12], colour: 0x9aa3ad })),
      { t: 'box', c: [FW - (0.25 + UPK.tk / 2) / 12, q[1], q[2]], d: [UPK.tk / 12, UPK.Bk / 12, UPK.Bk / 12], colour: 0xc9ced6, mat: '6061' },
      { t: 'cyl', a: [q[0], q[1] - o * 0.06, q[2]], b: [q[0], q[1] + o * 0.06, q[2]], r: UPK.D / 24, colour: 0x2d2d2d }]; }); }
{ const p = partByPN('LEZ-71-223'), zL = CS_FIT.L;
  p.geo = [...bracketBoxes().map((b) => ({ t: 'box', c: ft(b.lo.map((v, i) => (v + b.hi[i]) / 2)), d: [(b.hi[1] - b.lo[1]) / 12, (b.hi[0] - b.lo[0]) / 12, (b.hi[2] - b.lo[2]) / 12], colour: 0xc9ced6 })),
    ...['FBL', 'FBR'].flatMap((n) => { const y = MOUNT.nodes[n][1]; return [{ t: 'cyl', a: [GEO.firewall - 0.05, y, MOUNT.nodes[n][2]], b: [GEO.firewall + BRK.sec.t / 12 + 0.12, y, MOUNT.nodes[n][2]], r: BRK.dP / 24, mat: 'steel', colour: 0x2d2d2d },
      ...BRK.zSpar.map((zi) => ({ t: 'cyl', a: [GEO.csSpar.s - GEO.csSpar.width / 2 - 0.02, y, zL + zi / 12], b: [GEO.firewall + BRK.sec.t / 12 + 0.04, y, zL + zi / 12], r: BRK.dS / 24, mat: 'steel', colour: 0x8c96a3 }))]; })];
  p.massEach = +MTB_DEF.mass.each.toFixed(3);
  p.blurb = (p.blurb || '').replace('Leg B stands aft at the inboard edge (clear of the fuselage\'s rounded bottom corner)', `Leg B stands aft at the outboard edge from ${LEGB_TRIM} in below the pick-up hole (rev B, clear of the magnetos)`); }
