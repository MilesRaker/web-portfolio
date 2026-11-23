// WPH3 — block H checks. Every run of block H (wpH2_runs.js) is checked for its bend radius, support spacing, the
// engine-motion slack of the span that bridges the firewall and the engine, clearance to the released structure
// (mount tubes, cups, brackets, pick-ups: 0.25 in, ICD G-F5), to the exhaust, muff and SCAT (1 in for shielded or
// fire-sleeved runs, the clashCheck rule; coordinator decision 5 adds `signal|exhaust`) and to the cowl's inner skin.
// The engine controls are checked for travel (stroke to the carburettor / air-box stops with cushion), push-pull load,
// the quadrant's lever and mounting; the engine monitor for its sensor ranges; the manifold, switch and lines for their
// loads and ratings. `eng-iface` is re-registered to measure every engine-side interface against the released solid
// (LEZ-71-210 rev B, H-F15). Values typed from memory are BOUNDs with the value at which MS reaches zero. Notional.
import { registerChecks, mk } from '../structures.js';
import { SEP, partByPN, EQUIP } from '../systems.js';
import { O235, LUGS } from './engine_o235.js';
import { ENG, MOUNT } from './wp1_powerplant.js';
import { enginePrims } from './wpG1_engine.js';
import * as R from './wpH0_route.js';
import * as LY from './wpH1_layout.js';
import { RUNS } from './wpH2_runs.js';

SEP['signal|exhaust'] = 6;   // AC 43.13-1B practice for wiring near exhaust (typed from memory); shielded / fire-sleeved runs 1 in (the clashCheck rule)
const IN_ = (n, v, u, s = 'DERIVED') => [n, v, u, s];
const fx = (x, n = 2) => (Number.isFinite(x) ? x.toFixed(n) : String(x));
const HOT = () => [...R.OBST.exhaust(), ...R.OBST.scat()];
const EXTRA = () => LY.maniEnvelope();

/** every route term of one run: [term, MS, detail] */
export function routeTerms(r, o = {}) {
  o = { self: r.self, ...o };
  const pts = R.ptsOf(r), out = [], i0 = Math.max(1, pts.findIndex((p) => p[1] > R.FW_IN + 0.2)), bay = pts.some((p) => p[1] > R.FW_IN + 0.2);
  const t = r.raw ? (() => { const c = R.corners(pts).filter((q) => q.i > 1 && q.i < pts.length - 2); return c.length ? c.reduce((a, q) => (q.R < a.R ? q : a)) : { R: Infinity }; })() : R.tightest(r);
  out.push(['bend', t.R / r.bendMin - 1, `tightest bend R ${fx(t.R)} in (min ${r.bendMin})`]);
  const sp = R.maxSpan(r); out.push(['span', r.span / Math.max(sp.span, 1e-6) - 1, `longest unsupported span ${fx(sp.span, 1)} in (≤ ${r.span})`]);
  const b = R.bridge(r);
  if (b) { out.push(['slack', b.excess / R.ENG_MOTION.vec - 1, `bridging span ${fx(b.L, 1)} in: ${fx(b.excess)} in longer than its chord (≥ ${fx(R.ENG_MOTION.vec)} in: ±${R.ENG_MOTION.each} in on each axis)`]);
    out.push(['bend in motion', b.Rnet / r.bendMin - 1, `formed bend ${fx(b.R0)} in less the motion's curvature 6δ/L² → ${fx(b.Rnet)} in (min ${r.bendMin})`]); }
  if (bay) {
    const [ia, ib] = R.trimIdx(pts, o.trimA ?? 0.8, o.trimB ?? 0.8);
    const s = R.clearTo(pts, r.od / 2, [...R.structure(), ...(o.self ? [] : EXTRA())], Math.max(i0, ia), ib); out.push(['structure', s.d / R.CLR.mount - 1, `${fx(s.d)} in to ${s.at} (≥ ${R.CLR.mount})`]);
    const need = r.shield ? R.CLR.hot : 6, h = R.clearTo(pts, r.od / 2, HOT(), i0); out.push(['exhaust', h.d / need - 1, `${fx(h.d)} in to ${h.at} (≥ ${need}${r.shield ? ', fire-sleeved / shielded' : ''})`]);
    const c = R.cowlClear(pts.slice(i0 - 1), r.od / 2); out.push(['cowl', c.d / R.CLR.cowl - 1, `${fx(c.d)} in to the cowl skin (≥ ${R.CLR.cowl})`]);
    const e = R.clearTo(pts, r.od / 2, enginePrims(), Math.max(i0, ia), ib); out.push(['engine', (e.d + r.od / 2) / 0.05, `centre line ${fx(e.d + r.od / 2)} in outside the engine envelope (${e.at})`]);
  }
  return out;
}
const worst = (terms) => terms.reduce((a, q) => (q[1] < a[1] ? q : a));
function routeCheck(id, title, pns, lc, extraTerms = []) {
  const rows = pns.flatMap((pn) => RUNS[pn].map((r) => { const t = routeTerms(r); return { pn, r, t, w: worst(t) }; }));
  const all = [...rows.map((x) => ({ ...x, ms: x.w[1] })), ...extraTerms.map((e) => ({ pn: e.pn, r: { name: e.name }, w: [e.term, e.ms, e.detail], ms: e.ms }))];
  const g = all.reduce((a, q) => (q.ms < a.ms ? q : a));
  const row = mk('fuselage', id, title, lc, `${g.pn} ${g.r.name}`, g.w[0], g.ms, {
    formula: 'bend: fillet radius each corner allows ≥ the run\'s minimum;  span ≤ the support rule;  slack: developed − chord ≥ δ and 1/(1/R₀ + 6δ/L²) ≥ R_min over the firewall-to-engine span;  clearances surface to surface',
    inputs: [IN_('Engine motion δ at the accessory end', R.ENG_MOTION.each, 'in', 'BOUND: block G, LEZ-71-210 (typed from memory; MS of the slack terms scales with it)'), IN_('Clearance to the mount and brackets', R.CLR.mount, 'in', 'DESIGN (ICD G-F5)'), IN_('Exhaust, muff, SCAT (shielded / fire-sleeved)', R.CLR.hot, 'in', 'DESIGN (clashCheck rule for shielded runs)'), IN_('Cowl inner skin', R.CLR.cowl, 'in', 'DESIGN (block G FIT_REQ)'),
      ...pns.flatMap((pn) => RUNS[pn].map((r) => IN_(`${pn} ${r.name}: OD / min bend / span rule`, `${r.od} / ${r.bendMin} / ${r.span} in`, 'text', r.cls === 'cable' ? 'ACS A-920 push-pull: 5 in minimum bend recommended, never < 3 (Aircraft Spruce Q&A, accessed 2026-11-19)' : 'DESIGN: AC 43.13-1B practice (wire 10 × OD, shielded leads 6 × OD, hose per the hose rule)')))],
    result: all.map((x) => [`${x.pn} ${x.r.name}: ${x.w[0]}`, `${fx(x.ms)} (${x.w[2]})`, 'text']) });
  row.sys = pns[0]; return row;
}

// ------------------------------------------------------------------------------------------- engine controls
export const CTL = { knobF: LY.QD.knobForce, FS: 1.5, cableUlt: 110, rodD: LY.CABLE.rod, rodE: 29e6, rodEndUlt: 2500, strokeRated: { lever: 3.0, knob: 2.0 }, angMax: LY.CABLE.swivel,
  al: { Ftu: 42000, Fty: 35000, Fbru: 88000, spec: 'MMPDS 6061-T6 plate (typed from the handbook table)' }, an4: { Fsu: 3682 /* AN4 single shear, Fsu 75 ksi × π/4 × 0.25² (integration 2026-11-19, ICD A-M5; 4,080 was the tension value) */ }, n10: { Pt: 1450, Ps: 1150 } };
export const travel = () => ['throttle', 'mixture', 'heat'].map((k) => {
  const s = LY.STROKE[k], q = k === 'heat' ? null : LY.LEVER[k], qs = k === 'heat' ? LY.HEAT_STOP() : 2 * q * Math.sin(LY.QD.sweep / 2 * Math.PI / 180), cushion = (qs - s.stroke) / 2;
  return { k, arm: s.stroke, quad: qs, cushion, rated: k === 'heat' ? CTL.strokeRated.knob : CTL.strokeRated.lever, ang: s.ang, rodMin: s.rodMin, r: q }; });
export const loads = () => travel().map((t) => { const ratio = t.k === 'heat' ? 1 : LY.QD[t.k].knob.r / t.r, P = CTL.knobF * ratio * CTL.FS, Lr = t.rodMin + t.arm, I = Math.PI * CTL.rodD ** 4 / 64, Pcr = Math.PI ** 2 * CTL.rodE * I / Lr ** 2;
  return { ...t, ratio, P, Pcr, Lr, ms: Math.min(CTL.cableUlt / P, Pcr / P, CTL.rodEndUlt / P) - 1 }; });
registerChecks('wpH3-ctl', (d, lc) => {
  if (lc.id !== 'W1-S1') return [];
  const out = [], T = travel(), L = loads();
  const tv = T.map((t) => ({ t, ms: Math.min(t.cushion / LY.CUSHION, t.rated / t.quad, CTL.angMax / t.ang) - 1 })), w = tv.reduce((a, q) => (q.ms < a.ms ? q : a));
  out.push(Object.assign(mk('fuselage', 'ctl-travel', 'Engine controls: stroke to the carburettor and air-box stops with cushion at both ends', lc, `${w.t.k}`, CTL.angMax / w.t.ang <= Math.min(w.t.cushion / LY.CUSHION, w.t.rated / w.t.quad) ? 'conduit swivel' : w.t.cushion / LY.CUSHION < w.t.rated / w.t.quad ? 'cushion' : 'rated stroke', w.ms, {
    formula: 'arm stroke = tip travel between its stops projected on the conduit axis;  quadrant stroke = 2·r·sin(sweep/2) (lever) or the knob\'s stroke;  cushion = (quadrant − arm)/2 ≥ 1/16 in;  quadrant stroke ≤ the cable\'s rated stroke;  rod swing off the conduit axis ≤ the A-920 swivel (±4°)',
    inputs: [IN_('Lever sweep', LY.QD.sweep, '°', 'DESIGN'), IN_('Cushion each end', LY.CUSHION, 'in', 'DESIGN'), IN_('Conduit-end swivel', CTL.angMax, '°', 'ACS A-920 push-pull control: 8° total, 4° up / 4° down (Aircraft Spruce Q&A, accessed 2026-11-19)'),
      IN_('Throttle arm (MA-3A, approximate)', `R ${LY.CARB_ARMS.throttle.r} in, ${LY.CARB_ARMS.throttle.travel}°`, 'text', `BOUND: typed from memory; the lever radius is sized from it (verify on the carburettor)`), IN_('Mixture arm (approximate)', `R ${LY.CARB_ARMS.mixture.r} in, ${LY.CARB_ARMS.mixture.travel}°`, 'text', 'BOUND: typed from memory; the lever radius is sized from it'),
      IN_('Carb-heat arm (LEZ-71-251)', `R ${LY.HEAT_ARM.r} in, ${LY.HEAT_ARM.travel}° COLD to HOT`, 'text', 'GEOMETRY: block G arm; 90° travel DESIGN'), IN_('Rated stroke, lever cable / knob cable', `${CTL.strokeRated.lever} / ${CTL.strokeRated.knob}`, 'in', `BOUND: typed vendor class; MS ≥ 0 down to ${fx(Math.max(...T.filter((t) => t.k !== 'heat').map((t) => t.quad)))} / ${fx(T.find((t) => t.k === 'heat').quad)} in`)],
    result: T.map((t) => [`${t.k}`, `arm ${fx(t.arm, 3)} in, quadrant ${fx(t.quad, 3)} in${t.r ? ` (lever r ${t.r})` : ''}, cushion ${fx(t.cushion, 3)} in, rod swing ${fx(t.ang, 1)}°`, 'text']) }), { sys: 'LEZ-76-110' }));
  const wl = L.reduce((a, q) => (q.ms < a.ms ? q : a));
  out.push(Object.assign(mk('fuselage', 'ctl-load', 'Engine controls: push-pull load at the stop (pilot force on the knob)', lc, wl.k, 'cable / rod buckling / rod end', wl.ms, {
    formula: 'P = F_knob · R_knob / r_lever · FS;  inner wire in its conduit ≤ its rating;  exposed rod Euler buckling P_cr = π²EI/L² (pinned);  10-32 rod-end thread',
    inputs: [IN_('Pilot force on a knob (limit)', CTL.knobF, 'lb', 'DESIGN (engine controls have no FAR 23.397 value; 15 lb chosen)'), IN_('Factor of safety', CTL.FS, '', 'FAR23 23.303'), IN_('Inner wire in conduit, ultimate', CTL.cableUlt, 'lb', `BOUND: typed vendor class (light-duty push-pull); MS ≥ 0 down to ${fx(Math.max(...L.map((q) => q.P)), 0)} lb`),
      IN_('Rod Ø / E', `${CTL.rodD} in / ${CTL.rodE / 1e6} Msi`, 'text', 'BOUND: typed (steel rod)'), IN_('10-32 rod end, ultimate', CTL.rodEndUlt, 'lb', 'BOUND: typed (steel, tensile area 0.020 in²)')],
    result: L.map((q) => [`${q.k}`, `ratio ${fx(q.ratio)}, P ${fx(q.P, 1)} lb, rod ${fx(q.Lr)} in P_cr ${fx(q.Pcr, 0)} lb`, 'text']) }), { sys: 'LEZ-76-110' }));
  // quadrant: lever at the hub, pivot bearing, mounting screws
  const Mk = CTL.knobF * LY.QD.throttle.knob.r * CTL.FS, b = 0.75, t = LY.QD.throttle.t, sig = 6 * Mk / (t * b * b), Fl = CTL.knobF * CTL.FS * (1 + LY.QD.throttle.knob.r / LY.LEVER.throttle), brg = Fl / 2 / (CTL.al.Fbru * 0.25 * LY.QD.plate.t), sh = Fl / CTL.an4.Fsu;
  const Mm = CTL.knobF * CTL.FS * (LY.QD.throttle.knob.r + (LY.QD.pivot[2] - LY.QD.plate.wl[0])), arm = LY.QD.plate.fs[1] - LY.QD.plate.fs[0], Pt = Mm / arm / 2, scr = Pt / CTL.n10.Pt;
  const msQ = Math.min(CTL.al.Ftu / sig, 1 / brg, 1 / sh, 1 / scr) - 1, mode = [['lever bending', CTL.al.Ftu / sig], ['plate bearing', 1 / brg], ['pivot shear', 1 / sh], ['mount screws', 1 / scr]].reduce((a, q) => (q[1] < a[1] ? q : a))[0];
  out.push(Object.assign(mk('fuselage', 'thq-lever', 'Throttle quadrant: lever at the hub, pivot and mounting under the pilot force', lc, 'throttle lever', mode, msQ, {
    formula: 'M = F·R_knob·FS on a 0.75 in deep bar: σ = 6M/(t·b²);  pivot reaction F(1 + R_knob/r) shared by two 0.125 plates in bearing on the AN4;  mounting: moment about the base edge / plate length on 2 screws in tension',
    inputs: [IN_('Knob force (limit)', CTL.knobF, 'lb', 'DESIGN'), IN_('Knob radius', LY.QD.throttle.knob.r, 'in', 'DESIGN'), IN_('Lever bar', `${t} × ${b} in 6061-T6`, 'text', 'SIZED'), IN_('6061-T6 F_tu / F_bru', `${CTL.al.Ftu} / ${CTL.al.Fbru}`, 'psi', CTL.al.spec), IN_('AN4 single shear', CTL.an4.Fsu, 'lb', 'AN standard'), IN_('#10 screw tension (ult.)', CTL.n10.Pt, 'lb', 'BOUND: typed (MS24693 class into nutplates)')],
    result: [['σ lever', sig, 'psi'], ['Pivot reaction (ult.)', Fl, 'lb'], ['Screw tension (ult.)', Pt, 'lb']] }), { sys: 'LEZ-76-100' }));
  out.push(routeCheck('ctl-route', 'Engine-control cables: bend radius (≥ 6 in), supports, engine-motion slack, clearances', ['LEZ-76-110'], lc, [{ pn: 'LEZ-76-110', name: 'grommet', term: 'boot room', ms: grommetRoom() / R.ENG_MOTION.each - 1, detail: `${fx(grommetRoom())} in radial room in the Ø ${2 * LY.GROMMET.r} boot (≥ ${R.ENG_MOTION.each})` }]));
  return out;
});
export const grommetRoom = () => Math.min(...Object.values(LY.GROMMET.at).map((q) => LY.GROMMET.r - Math.hypot(q[0] - LY.GROMMET.c[0], q[1] - LY.GROMMET.c[1]) - LY.CABLE.od / 2));

// ------------------------------------------------------------------------------------------- ignition and engine monitor routes, sensor lines
registerChecks('wpH3-routes', (d, lc) => {
  if (lc.id !== 'W1-S1') return [];
  return [routeCheck('ign-route', 'Ignition: leads, P-leads and the key-switch harness: bends, supports, slack, exhaust and structure', ['LEZ-74-110', 'LEZ-74-130', 'LEZ-74-100'], lc),
    routeCheck('ems-route', 'Engine monitor: harness, trunks and probe branches: bends, supports, slack, exhaust, muff, SCAT and structure', ['LEZ-77-100', 'LEZ-77-110', 'LEZ-77-111'], lc),
    lineCheck(lc)];
});
export const HOSE_RATE = { work: 3000, oilMax: 100, fuelMax: 8, burstF: 4 };   // -3 hose 3,000 psi (Aeroquip 303-3, Aircraft Spruce, confirmed); O-235-C start and warm-up 100 psi (Lycoming OM 60297-9 p. 3-7)
function lineCheck(lc) {
  const r = routeCheck('sns-line', 'Sensor lines (-3 hose, fire-sleeved): bend, slack, clearances and pressure rating', ['LEZ-77-121'], lc, [{ pn: 'LEZ-77-121', name: 'hose', term: 'pressure', ms: HOSE_RATE.work / HOSE_RATE.oilMax - 1, detail: `working ${HOSE_RATE.work} psi vs oil ${HOSE_RATE.oilMax} psi` }]);
  r.trace.inputs.push(IN_('-3 hose working pressure', HOSE_RATE.work, 'psi', 'Aeroquip 303-3 (MIL-DTL-8794): 3,000 psi (Aircraft Spruce 303-3, accessed 2026-11-19; confirmed in the second pass)'), IN_('Oil pressure, maximum (start and warm-up)', HOSE_RATE.oilMax, 'psi', 'Lycoming OM 60297-9 p. 3-7, O-235-C: 100 psi start and warm-up (accessed 2026-11-19)'));
  return r;
}

// ------------------------------------------------------------------------------------------- sensor ranges (GEA 24 and its sensors)
/** sensor range vs the engine's limit (typed from memory: operator's manual and the GEA 24 sensor list govern) */
export const SENSORS = [
  { what: 'CHT, type K, 3/8-24 threaded (Alcor 86253 / Garmin 494-70000-00)', top: 900, lim: 500, u: '°F', src: 'CHT limit 500 °F (O-235; BOUND, the OM table governs)' },
  { what: 'EGT, type K clamp-on', top: 2000, lim: 1650, u: '°F', src: 'EGT ≈ 1,650 °F peak (typed)' },
  { what: 'Oil temperature sender', top: 300, lim: 245, u: '°F', src: 'oil 245 °F limit (typed)' },
  { what: 'Oil pressure 0–150 psi (GPT 150G)', top: 150, lim: 100, u: 'psi', src: 'O-235-C start and warm-up 100 psi (Lycoming OM 60297-9 p. 3-7; max 90, idle 25)' },
  { what: 'Fuel pressure 0–15 psig (GPT 15G / Kavlico P4055-5020-2: Garmin lists no 0–30 psi sensor)', top: 15, lim: 8, u: 'psi', src: 'carburettor inlet ≤ 8.0 psi (TCDS E-223 rev 19 Note 2)' },
  { what: 'Manifold pressure 0–30 psia', top: 30 * 2.036, lim: 30.5, u: 'inHg', src: 'MAP ≤ ambient at sea level, 30.5 inHg (typed)' },
  { what: 'Tach (UMA T1A9-1 in the magneto vent port)', top: 4000, lim: O235.rpm, u: 'rpm', src: `TCDS E-223 ${O235.rpm} rpm` },
  { what: 'Fuel flow 0.6–70 gph (EI FT-60)', top: 70, lim: 0.6 * O235.hp / 6.0, u: 'gph', src: 'take-off flow 0.6 lb/hp·h × hp / 6 lb/gal = 11.5 gph, conservative over the OM\'s 10.7 gph at rated (OM 60297-9 p. 3-7)' },
];
registerChecks('wpH3-ems', (d, lc) => {
  if (lc.id !== 'W1-S1') return [];
  const rows = SENSORS.map((s) => ({ ...s, ms: s.top / (1.1 * s.lim) - 1 })), w = rows.reduce((a, q) => (q.ms < a.ms ? q : a));
  return [Object.assign(mk('fuselage', 'ems-range', 'Engine monitor: each sensor\'s range covers its engine limit with 10 % over', lc, w.what, 'range', w.ms, {
    formula: 'MS = range top / (1.1 × engine limit) − 1 (minimum over every sensor)',
    inputs: rows.map((s) => IN_(`${s.what}: top ${fx(s.top, 1)} ${s.u}`, s.lim, s.u, `${s.src}; sensor range from the G3X IM 190-01115-01 rev AV Table 21-1 (accessed 2026-11-19)`)),
    result: rows.map((s) => [s.what, s.ms, '']) }), { sys: 'LEZ-77-100' })];
});

// ------------------------------------------------------------------------------------------- manifold, key switch
export const MANI_MASS = { lb: null };
export const KEY_RATE = { start: 2, startLoad: 0.25, mag: 3, magLoad: 0.5 };   // ACS A-510-2: START 2 A inductive at 12 V (Aircraft Spruce 11-03170); magneto contact rating BOUND (not published)
registerChecks('wpH3-misc', (d, lc) => {
  const out = [];
  if (lc.type === 'emergency') {
    const m = MANI_MASS.lb ?? 0.6, P = m * 18 / 2, ms = 2126 / P - 1;   // AN3 single shear 2,126 lb (Fsu 75 ksi × π/4 × 0.19²; ICD A-M5, was 2,210)
    out.push(Object.assign(mk('fuselage', 'mani-bolt', 'Sensor manifold: 2 × AN3 to the firewall under the items-of-mass load (18 g)', lc, 'manifold bolts', 'bolt shear', ms, {
      formula: 'P = m·18 g / 2 bolts', inputs: [IN_('Manifold, transducers and hose ends', m, 'lb', 'GEOMETRY: the record\'s solid + vendor masses'), IN_('Load factor', 18, 'g', 'FAR 23.561(b)(3) (typed from memory)'), IN_('AN3 single shear', 2126, 'lb', 'AN standard')], result: [['P per bolt', P, 'lb']] }), { sys: 'LEZ-77-120' }));
  }
  if (lc.id === 'W1-S1') {
    const ms = Math.min(KEY_RATE.start / KEY_RATE.startLoad, KEY_RATE.mag / KEY_RATE.magLoad) - 1;
    out.push(Object.assign(mk('fuselage', 'key-sw', 'Key switch: contact ratings vs the starter-contactor coil and the magneto primary', lc, 'S1', 'contact rating', ms, {
      formula: 'MS = min(rating / load) − 1', inputs: [IN_('START contact rating', KEY_RATE.start, 'A', 'ACS A-510-2: 2 A inductive at 12 V through BAT and S (Aircraft Spruce 11-03170, accessed 2026-11-19)'), IN_('Start relay K3 coil (the STS-S12\'s 2.9 A coil is on K3\'s contact, not the key)', KEY_RATE.startLoad, 'A', 'BOUND: 12 V automotive relay coil, not researched'), IN_('Magneto contacts', KEY_RATE.mag, 'A', 'BOUND: not published for the A-510-2'), IN_('Magneto primary to ground', KEY_RATE.magLoad, 'A', 'BOUND: not found')], result: [] }), { sys: 'LEZ-74-100' }));
  }
  return out;
});

// ------------------------------------------------------------------------------------------- engine interfaces against the released solid (H-F15)
export const IFACE_TOL = 0.25;
export function engineInterfacesB() {
  const P = enginePrims(), EXH = R.OBST.exhaust().filter((p) => /stack/.test(p.feat)), d = (q, set) => Math.max(0, R.clearTo([q, q.map((v) => v + 1e-6)], 0, set).d), rows = [];
  for (const e of EQUIP) { if (!['LEZ-71-210', 'LEZ-74-120', 'LEZ-77-110'].includes(e.pn) || !e.at) continue; const q = R.P3(e.at), egt = /EGT/.test(e.name); rows.push({ what: `${e.ref} ${e.name}`, kind: 'electrical', d: d(q, egt ? EXH : P) }); }
  for (const [k, q] of Object.entries(partByPN('LEZ-71-210').ports || {})) rows.push({ what: `port ${k}`, kind: q.kind, d: d(R.P3(q.at), P) });
  for (const c of ['throttle', 'mixture']) rows.push({ what: `${c} arm hole (cable rod end at mid travel)`, kind: 'mechanical', d: d(LY.armTip(LY.CARB_ARMS[c], 0), P) });
  for (const L of LUGS(ENG.accFace, ENG.crankZ)) { const n = MOUNT.nodes[`E${L.k}`]; rows.push({ what: `mount pick-up E${L.k} → lug ${L.k}`, kind: 'mount', d: Math.hypot(...n.map((v, i) => v - L.at[i])) * 12 }); }
  return { rows, worst: rows.reduce((a, r) => (r.d > a.d ? r : a), { d: 0 }), tol: IFACE_TOL };
}
registerChecks('wp1-iface', (d, lc) => {
  if (lc.id !== 'W1-S1') return [];
  const E = engineInterfacesB(), r = mk('fuselage', 'eng-iface', `Engine interfaces land on the ${O235.model} (LEZ-71-210 rev B solid): terminals, caps, probes, ports, arms and lugs`, lc, E.worst.what || 'engine', 'interface position', E.tol / Math.max(E.worst.d, 1e-3) - 1, {
    formula: 'd = distance from each interface point to the released solid\'s primitives (0 on or inside; EGT probes to the stacks);  MS = tol / d_max − 1',
    inputs: [['Interfaces checked', E.rows.length, '', 'MODEL'], ['Tolerance', E.tol, 'in', 'DESIGN: an interface stands on its feature (boss, terminal, port spot-face)']],
    result: E.rows.map((q) => [`${q.what} (${q.kind})`, q.d, 'in']) });
  r.sys = 'LEZ-71-210'; return [r];
});
