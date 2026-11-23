// WP10 — induction air and main wheels.
//  • Carb air: a faired scoop blister under the lower cowl with a ram inlet, a filtered air box under the updraft
//    carburettor and a carb-heat (alternate air) flapper fed from the exhaust muff. Sized by pwr-induction.
//  • Main wheels: Goodyear 5.00-5 tyre on a Matco W51LT wheel and internal-caliper brake, inside a wheel pant that clears
//    the tyre grown for temperature and speed (gear-pant-clear), with brake heat checked (gear-pant-heat), tyre speed and
//    load ratings (gear-tyre-speed, gear-tyre-load).
// The scoop and pant shapes mirror airframe/build.py (SC) and airframe/dims.py (PANT); keep them in step.
import { GEO, registerChecks, mk, aircraft, WEIGHT_CASES } from '../structures.js';
import { defineParts, defineReqs, defineTraces, partByPN, TRACES } from '../systems.js';
import { ENG } from './wp1_powerplant.js';
import { WHEEL, DISC } from './wp2_controls_gear.js';

const S1 = (title, inspect) => ({ title, inspect });
const SHIELD_Y = (GEO.gear.track / 2 * 12 - 39.925) / 12; // brake heat shield face, inboard of the wheel centre (ft): LEZ-32-315 under the axle flange on the leg end (block D)
const deg = Math.PI / 180;

// ------------------------------------------------------------------------------------------- induction geometry
// rev B (ICD G-O1, owner's decision 2026-11-18): deeper and longer so the air box and the 200 cfm filter fit below the carb
// flange; centred 1.4 in left so the heat spigot and SCAT pass beside the carburettor; full depth FS 164.0–166.2, then a
// gentle taper (≤ 25°) back into the cowl lines. peak / hold are fractions of s0 → s1. = build.py SC
export const SCOOP = { s0: 130.1 / 12, s1: 162.9 / 12, y: -1.4 / 12, hw0: 0.19, hw: 0.42, d0: 0.14, d: 0.52, peak: (138.5 - 130.1) / 32.8, hold: (140.7 - 130.1) / 32.8 };
/** half-width and depth (ft) of the blister at station s (ft): sine rise to the peak, hold, cosine taper (= build.py scoop_dims) */
export function scoopDims(s) {
  const S = SCOOP, u = (s - S.s0) / (S.s1 - S.s0);
  if (u < S.peak) { const k = Math.sin(Math.max(u, 0) / S.peak * Math.PI / 2); return [S.hw0 + (S.hw - S.hw0) * k, S.d0 + (S.d - S.d0) * k]; }
  if (u < S.hold) return [S.hw, S.d];
  const k = 0.5 * (1 + Math.cos(Math.PI * Math.min(1, (u - S.hold) / (1 - S.hold)))); return [Math.max(S.hw * k ** 0.5, 0.02), Math.max(S.d * k, 0.005)];
}
const CARB_S = ENG.accFace + 0.27, CARB_AIR = [CARB_S, 0.0, 2.04];
const AB = { s0: 11.355, s1: 11.695, y: SCOOP.y, half: 0.18, zf: 2.00, zt: 2.19 };                 // air box (inside the blister)
const PORT = { ramIn: [SCOOP.s0, SCOOP.y, 2.06], ramOut: [AB.s0, SCOOP.y, 2.06], heatIn: [11.575, -0.08, 2.26], carbOut: CARB_AIR };
const FILTER = { c: [11.415, SCOOP.y, 2.10], len: 0.56, w: 0.36, t: 0.08, pitch: 25, ratedCfm: 200 }; // pitch: aft end lower
/** opening area of the scoop inlet below the cowl skin (in²), from the same section law as the build */
function inletArea() {
  const n = 2.5, top = 0.06, N = 400; let a = 0;
  for (let i = 0; i < N; i++) { const y = -SCOOP.hw0 + 2 * SCOOP.hw0 * (i + 0.5) / N, z = top - (SCOOP.d0 + top) * (1 - Math.abs(y / SCOOP.hw0) ** n) ** (1 / n); a += Math.max(0, -z) * 2 * SCOOP.hw0 / N; }
  return a * 144;
}

// ------------------------------------------------------------------------------------------- induction parts
Object.assign(partByPN('LEZ-71-250'), {
  name: 'Carb air scoop: faired blister under the lower cowl with a ram inlet', kind: 'laminate', meshes: /^CarbScoop$/, oml: true, massEach: 1.2,
  geo: [{ t: 'box', c: [11.215, SCOOP.y, 2.12], d: [0.24, 0.40, 0.18] }, { t: 'box', c: [11.495, SCOOP.y, 2.08], d: [0.36, 0.52, 0.30] }, { t: 'box', c: [11.795, SCOOP.y, 2.09], d: [0.28, 0.48, 0.26] }, { t: 'box', c: [12.025, SCOOP.y, 2.14], d: [0.20, 0.34, 0.14] }], // interior envelope (the blister itself is the airframe model's CarbScoop)
  ports: { 'RAM-IN': { at: PORT.ramIn, kind: 'air', open: true, fit: 'rolled inlet lip' }, 'RAM-OUT': { at: PORT.ramOut, kind: 'air', fit: 'bonded flange to the air box' } },
  flow: [['RAM-IN', 'RAM-OUT']], mates: [['LEZ-71-250:RAM-OUT', 'LEZ-71-251:RAM-IN']],
  blurb: 'A faired blister on the lower cowl, just aft of the NACA cooling inlet: forward-facing ram inlet with a rolled lip, swelling over the air box under the updraft carburettor and tapering to nothing aft. 2 × 6781 over a foam plug, flanged to the lower cowl with screws so it comes off with the cowl.',
  steps: [S1('Shape a foam plug on the lower cowl; lay up 2 × 6781; trim the inlet and roll the lip', ['Inlet lip radius ≥ 1/4 in, no sharp edge', 'Blister flush with the cowl at the flanges'])], src: { mass: 'ASSUMED' },
});
defineParts([
  { pn: 'LEZ-71-251', name: 'Filtered air box with carb-heat (alternate air) flapper valve', kind: 'machined', ata: 71, nha: 'LEZ-71-200', massItem: 'engine', material: '6061', massEach: 1.4,
    geo: [
      { t: 'box', c: [(AB.s0 + AB.s1) / 2, AB.y, AB.zf], d: [AB.s1 - AB.s0, 2 * AB.half, 0.012] },                                      // floor
      ...[-1, 1].map((sg) => ({ t: 'box', c: [(AB.s0 + AB.s1) / 2, AB.y + sg * AB.half, (AB.zf + AB.zt) / 2], d: [AB.s1 - AB.s0, 0.012, AB.zt - AB.zf] })), // side walls
      { t: 'box', c: [AB.s1, AB.y, (AB.zf + AB.zt) / 2], d: [0.012, 2 * AB.half, AB.zt - AB.zf] },                                       // aft wall
      { t: 'box', c: [CARB_S, 0.0, 2.045], d: [0.30, 0.30, 0.015], colour: 0x9aa3ad },                                                   // carb flange adapter
      { t: 'box', c: [(AB.s0 + AB.s1) / 2 + 0.08, AB.y - 0.09, AB.zt], d: [0.26, 0.22, 0.012] },                                        // lid, left half (carb flange takes the rest)
      { t: 'cyl', a: [PORT.heatIn[0], PORT.heatIn[1], AB.zt], b: PORT.heatIn, r: 0.085, colour: 0xb8c0c8 },                              // SCAT spigot (2 in), up through the cowl floor
      { t: 'box', c: [PORT.heatIn[0], PORT.heatIn[1], AB.zt - 0.015], d: [0.18, 0.18, 0.01], colour: 0xc9962c },                       // flapper door, COLD (closes the heat port)
      { t: 'cyl', a: [PORT.heatIn[0] - 0.10, PORT.heatIn[1] - 0.09, AB.zt - 0.015], b: [PORT.heatIn[0] - 0.10, PORT.heatIn[1] + 0.09, AB.zt - 0.015], r: 0.008, colour: 0x2d2d2d }, // flapper hinge pin
      { t: 'box', c: [PORT.heatIn[0] - 0.10, PORT.heatIn[1] - 0.10, AB.zt + 0.02], d: [0.02, 0.03, 0.06], colour: 0x2d2d2d },                     // control arm (carb-heat cable)
      { t: 'cyl', a: [11.725, AB.y, AB.zf], b: [11.725, AB.y, AB.zf - 0.01], r: 0.015 }],                                                  // drain hole grommet
    ports: { 'RAM-IN': { at: PORT.ramIn.map((v, i) => (i ? v : AB.s0)), kind: 'air', fit: 'flange from the scoop' }, 'HEAT-IN': { at: PORT.heatIn, kind: 'air', fit: '2 in SCAT spigot, hose clamp' }, 'CARB-OUT': { at: PORT.carbOut, kind: 'air', fit: 'carburettor flange, 4 × AN3 + gasket' } },
    flow: [['RAM-IN', 'CARB-OUT'], ['HEAT-IN', 'CARB-OUT']], mates: [['LEZ-71-251:CARB-OUT', 'LEZ-71-210:CARB-AIR']],
    hardware: [{ std: 'AN3-5A', qty: 4, desc: 'bolt, air box to carburettor flange' }, { std: 'MS21042L3', qty: 4, desc: 'self-locking nut' }, { std: 'AN960-10', qty: 8, desc: 'washer' }, { std: 'MS20470AD4', qty: 60, desc: 'rivet, box seams' }],
    blurb: 'Riveted 0.040 6061 box bolted to the carburettor flange. Ram air from the scoop passes the inclined filter into the box and up into the carb throat. The flapper under the heat port in the lid is the carb-heat valve: COLD (as drawn) it seals the heat port; HOT it swings down across the box, shutting off filtered ram air and admitting heated, unfiltered air from the exhaust muff through the 2 in SCAT spigot. Because HOT bypasses the filter, it is also the alternate air source if the filter ices or clogs. A drain hole at the low corner.',
    steps: [S1('Cut, bend and rivet the box; fit the flapper on its hinge pin with a positive over-centre stop at each end', ['Flapper seals each port to a 0.003 in feeler gauge', 'Full travel COLD to HOT with the panel knob, cushion at both ends']), S1('Bolt to the carburettor with a new gasket; safety the bolts', ['No air leak around the filter frame (light test)'])], src: { mass: 'ASSUMED' } },
  { pn: 'LEZ-71-252', name: 'Induction air filter element', kind: 'cots', ata: 71, nha: 'LEZ-71-251', massItem: 'engine', massEach: 0.2,
    geo: [{ t: 'obox', c: FILTER.c, d: [FILTER.len, FILTER.w, FILTER.t], pitch: FILTER.pitch, colour: 0xc8483a }],
    scd: { spec: `Aircraft induction air filter, flame-retardant oiled Divinycell HT61 in an aluminium frame with a gasket; ${(FILTER.len * 12).toFixed(1)} × ${(FILTER.w * 12).toFixed(1)} × ${(FILTER.t * 12).toFixed(1)} in, rated ≥ ${FILTER.ratedCfm} cfm at ≤ 1.5 in H₂O clean; inclined ${FILTER.pitch}° in the air box so ice and water shed downstream`, envelope: [FILTER.len * 12, FILTER.w * 12, FILTER.t * 12] },
    src: { mass: 'ASSUMED' } },
  { pn: 'LEZ-32-315', name: 'Brake heat shields in the wheel pants (L/R)', kind: 'machined', ata: 32, nha: 'LEZ-32-310', material: 'stainless', qty: 2, external: true,
    geo: [-1, 1].map((sg) => { const w = WHEEL(sg); return { t: 'box', c: [w[0], w[1] - sg * SHIELD_Y, w[2] + 0.03], d: [0.40, 0.006, 0.34] }; }),
    blurb: '0.016 in stainless sheet riveted on stand-offs off the inside of each pant (4.6 in inboard of the wheel centre), facing the brake disc, with a ceramic-fibre blanket behind it; keeps the pant laminate below its service temperature after a hard stop.',
    steps: [S1('Form, rivet on stand-offs to the pant inner skin', ['Clears the disc and caliper by ≥ 1 in through full wheel rotation'])], src: { mass: 'GEOMETRY' } },
]);
// engine carburettor air inlet port; NACA cooling inlet moved forward 0.4 ft to give the scoop clean belly
Object.assign(partByPN('LEZ-71-210').ports, { 'CARB-AIR': { at: CARB_AIR, kind: 'air', fit: 'carburettor air inlet flange (4 × AN3)' } });
partByPN('LEZ-71-240').geo = [{ t: 'box', c: [10.475, 0, 2.30], d: [1.2, 0.80, 0.16] }];
// carb-heat duct now ends on the air box spigot
{ const m = partByPN('LEZ-78-110'), run = m.geo.find((g) => g.t === 'path');
  run.pts = [run.pts[0], run.pts[1], [11.725, -0.30, 2.42], [PORT.heatIn[0] + 0.04, -0.10, 2.36], PORT.heatIn]; run.ends = ['LEZ-78-110:MUFF-OUT', 'LEZ-71-251:HEAT-IN']; run.extSeg = []; }
for (const t of TRACES) if (t.to === 'LEZ-71-250:HEAT-IN') t.to = 'LEZ-71-210:CARB-AIR';
defineTraces([{ sys: 'ATA 71 Powerplant', name: 'Induction air, ram inlet through the filter to the carburettor', from: 'LEZ-71-250:RAM-IN', to: 'LEZ-71-210:CARB-AIR' }]);

// ------------------------------------------------------------------------------------------- tyre, pant, brake data
export const TYRE = { // Goodyear Flight Special II 5.00-5 6-ply, 505C61-8
  odMax: 14.2, odMin: 13.65, width: 4.95, slr: 5.7, ratedLoad: 1285, ratedPsi: 50, ratedMph: 120, maxBraking: 1860,
  service: { psi: 30, T0: 59 },                       // service inflation for ~600 lb static (reduced in proportion to load: ASSUMED 30 psi)
  growth: { speedAtRated: 0.03, perPsi: 0.0008, loadedWidth: 1.10 }, // ASSUMED: bias-ply centrifugal growth, pressure growth, loaded bulge
};
export const PANT = { L0: 1.0, L1: 1.60, UP: 0.72, DN: 0.38, HW: 0.44, SLOT_HW: 0.30, CLR: 0.75 / 12 }; // = airframe/dims.py PANT
const pantT = (dx) => { const u = (dx + PANT.L0) / (PANT.L0 + PANT.L1); if (u <= 0 || u >= 1) return 0; const a = 0.4; return u < a ? Math.sqrt(1 - ((a - u) / a) ** 2) : (0.5 * (1 + Math.cos(Math.PI * (u - a) / (1 - a)))) ** 0.85; };
/** tyre growth (fraction of size) at a tyre temperature (°F) and road speed (mph): centrifugal + pressure */
export function tyreGrowth(T, mph) {
  const g = TYRE.growth, p = (TYRE.service.psi + 14.7) * (T + 460) / (TYRE.service.T0 + 460) - 14.7;
  return { g: g.speedAtRated * (mph / TYRE.ratedMph) ** 2 + g.perPsi * (p - TYRE.service.psi), psi: p };
}
/** minimum radial / side clearance (ft) between the pant and the tyre grown by g */
function pantClear(g) {
  const R = TYRE.odMax / 24 * (1 + g), hw = TYRE.width / 24 * (1 + g); let c = 9;
  for (let i = 0; i <= 80; i++) { const dx = -R + 2 * R * i / 80, t = pantT(dx); c = Math.min(c, PANT.UP * t - Math.sqrt(Math.max(R * R - dx * dx, 0))); if (Math.abs(dx) < 0.9 * R) c = Math.min(c, PANT.HW * t - hw); }
  return c;
}
const ftlb = (W, kt) => 0.5 * (W / 32.174) * (kt * 1.6878) ** 2;

registerChecks('wp10', (d, lc) => {
  if (lc.id !== 'W1-S1') return [];
  const out = [], tag = (r, sys) => { r.sys = sys; out.push(r); };
  const ac = aircraft(d, WEIGHT_CASES[0]), Vs = ac.Vs, Vlof = 1.15 * Vs, Vgnd = Vlof + 10, mph = Vgnd * 1.1508;
  // ---- induction
  { const Q = 235 * 2800 / 2 * 0.85 / 1728, A = FILTER.len * FILTER.w, fv = Q / A, Ain = inletArea(), Vy = 1.4 * Vs * 1.6878, Areq = Q / 60 / (0.7 * Vy) * 144;
    const Aalt = Math.PI * 2.0 ** 2 / 4, Acarb = Math.PI * 1.75 ** 2 / 4;
    const terms = [['filter flow vs rating', FILTER.ratedCfm / Q - 1], ['ram inlet capture at climb', Ain / Areq - 1], ['alternate (heat) air area vs carb bore', Aalt / Acarb - 1]].sort((a, b) => a[1] - b[1]);
    tag(mk('fuselage', 'pwr-induction', 'Induction air: filter flow, ram inlet size, alternate air area', lc, 'carb scoop and air box', terms[0][0], terms[0][1], {
      formula: 'Q = V_disp·rpm/2·η_v;  filter: MS = Q_rated/Q − 1;  inlet: A_req = Q/(0.7·V_y) (inlet velocity ratio ≤ 0.7);  alternate air: A_SCAT ≥ A_carb bore (§23.1091 / 23.1093 yardstick)',
      inputs: [['Displacement × rpm × η_v', '235 in³ × 2,800 / 2 × 0.85', 'text', 'ASSUMED'], ['Induction airflow', Q, 'cfm', 'DERIVED'], ['Filter face area', A * 144, 'in²', 'GEOMETRY'], ['Face velocity', fv, 'fpm', 'DERIVED'],
        ['Filter rated flow', FILTER.ratedCfm, 'cfm', 'ASSUMED'], ['Inlet opening', Ain, 'in²', 'GEOMETRY'], ['V_y (≈ 1.4 V_s)', Vy / 1.6878, 'kt', 'ASSUMED'], ['Carb bore (MA-3 class)', 1.75, 'in', 'ASSUMED'], ['Alternate-air duct', 2.0, 'in', 'DESIGN']],
      result: [['Required inlet area', Areq, 'in²'], ['Alternate / carb area', `${Aalt.toFixed(2)} / ${Acarb.toFixed(2)} in²`, 'text']] }), 'LEZ-71-251'); }
  // ---- tyre speed and load
  tag(mk('gear', 'gear-tyre-speed', 'Main tyre speed rating', lc, 'Goodyear 5.00-5 6-ply', 'rated speed', TYRE.ratedMph / mph - 1, {
    formula: 'V_ground,max = 1.15 V_s (lift-off) + 10 kt tailwind;  MS = V_rated / V_ground − 1',
    inputs: [['Stall speed (gross)', Vs, 'kt', 'MODEL'], ['Lift-off', Vlof, 'kt', `BOUND: 1.15 V_s; MS stays ≥ 0 up to ${(TYRE.ratedMph / 1.1508).toFixed(0)} kt ground speed`], ['Tailwind allowance', 10, 'kt', `BOUND: MS stays ≥ 0 with ${(TYRE.ratedMph / 1.1508 - Vlof).toFixed(0)} kt of tailwind`], ['Tyre rated speed', TYRE.ratedMph, 'mph', 'VENDOR']], result: [['Max ground speed', mph, 'mph']] }), 'LEZ-32-300');
  { const sN = 2.55, sM = GEO.gear.s; let Wm = 0, wc0 = null;
    for (const wc of WEIGHT_CASES) { const a = aircraft(d, wc), m = a.W * (a.cg - sN) / (sM - sN) / 2; if (m > Wm) { Wm = m; wc0 = wc; } }
    const brk = Wm * 1.0, r = TYRE.odMax / 2 - (TYRE.odMax / 2 - TYRE.slr) * Wm / TYRE.ratedLoad;
    tag(mk('gear', 'gear-tyre-load', 'Main tyre static and braking load vs rating', lc, `per main tyre, ${wc0.id}`, 'rated load', Math.min(TYRE.ratedLoad / Wm, TYRE.maxBraking / brk) - 1, {
      formula: 'W_main = W·(x_cg − x_nose)/(x_main − x_nose)/2;  MS = min(rated / static, max braking / braking) − 1;  loaded radius = R − (R − SLR)·W/W_rated',
      inputs: [['Static load per main', Wm, 'lb', 'MODEL'], ['Rated load', TYRE.ratedLoad, 'lb', 'VENDOR'], ['Max braking load', TYRE.maxBraking, 'lb', 'VENDOR'], ['Static loaded radius at rated load', TYRE.slr, 'in', 'VENDOR']],
      result: [['Loaded radius at static load (axle height)', r, 'in'], ['Model axle height', GEO.gear.axleZ * 12, 'in']] }), 'LEZ-32-300'); }
  // ---- pant clearance: cold soak, standard day, hot tyre after braking; at rest and at maximum ground speed
  { const cases = [[-40, 0], [59, 0], [59, mph], [120, mph], [250, 0], [250, mph]].map(([T, v]) => { const g = tyreGrowth(T, v); return { T, v, ...g, c: pantClear(g.g) }; });
    const worst = cases.reduce((a, b) => (b.c < a.c ? b : a)), slotNeed = TYRE.width * TYRE.growth.loadedWidth * (1 + Math.max(...cases.map((c) => c.g))) / 24 + 0.5 / 12;
    const ms = Math.min(worst.c / PANT.CLR, PANT.SLOT_HW / slotNeed) - 1;
    tag(mk('gear', 'gear-pant-clear', 'Wheel pant clears the tyre: hot, cold, at speed; slot clears the loaded tyre', lc, `worst: ${worst.T} °F at ${worst.v.toFixed(0)} mph`, 'running clearance ≥ 3/4 in', ms, {
      formula: 'growth = 0.03·(V/V_rated)² + 0.0008/psi·Δp;  p_hot = (p₀ + 14.7)·T/T₀ − 14.7;  clearance = min over the tyre profile of (pant − grown tyre);  slot ≥ ½·1.10·width + ½ in',
      inputs: [...cases.map((c) => [`${c.T} °F, ${c.v.toFixed(0)} mph: ${c.psi.toFixed(1)} psi, growth ${(c.g * 100).toFixed(2)} %`, c.c * 12, 'in', 'DERIVED']), ['Tyre OD / width (max inflated)', `${TYRE.odMax} / ${TYRE.width} in`, 'text', 'VENDOR'], ['Required running clearance', PANT.CLR * 12, 'in', 'DESIGN'], ['Slot half-width', PANT.SLOT_HW * 12, 'in', 'GEOMETRY']],
      result: [['Minimum clearance', worst.c * 12, 'in'], ['Slot half-width needed', slotNeed * 12, 'in']] }), 'LEZ-32-300'); }
  // ---- brake energy into the disc after a normal stop; disc-to-pant gap with the heat shield
  { const W = ac.W, Vland = 1.2 * Vs, Eall = ftlb(W, Vland), Ebrake = 0.6 * Eall / 2, mDisc = 1.0, cp = 0.11, dT = 0.8 * Ebrake / 778 / (mDisc * cp), Tpk = 100 + dT;
    const gapShield = SHIELD_Y - 0.003 - (DISC.offset + DISC.t / 2);
    const ms = Math.min(1000 / Tpk, gapShield / (1.0 / 12)) - 1;
    tag(mk('gear', 'gear-pant-heat', 'Brake heat: disc temperature after a normal stop; disc-to-shield gap', lc, 'each main brake', Tpk > 0 && 1000 / Tpk < gapShield / (1 / 12) ? 'disc temperature' : 'disc-to-shield gap', ms, {
      formula: 'E = ½·m·(1.2 V_s)²;  60 % to the brakes, 80 % of that into the disc;  ΔT = E_disc / (m_disc·c_p);  gap ≥ 1 in from the disc face to the heat shield',
      inputs: [['Landing weight (gross)', W, 'lb', 'MODEL'], ['Touchdown 1.2 V_s', Vland, 'kt', 'MODEL'], ['Disc mass, steel', mDisc, 'lb', `BOUND: LEZ-32-310 disc (typed from memory); MS on temperature stays ≥ 0 down to ${(0.8 * Ebrake / 778 / cp / 900).toFixed(2)} lb`], ['c_p steel', cp, 'BTU/lb°F', 'HANDBOOK'], ['Disc temperature limit', 1000, '°F', 'BOUND: steel disc and lining service limit (typed from memory), well under the 1,300 °F of carbon-steel tempering'], ['Heat shield inboard of the wheel centre', SHIELD_Y * 12, 'in', 'GEOMETRY'], ['Disc offset inboard', DISC.offset * 12, 'in', 'LEZ-32-310 envelope (GEOMETRY)']],
      result: [['Energy per brake', Ebrake, 'ftlb'], ['Peak disc temperature', Tpk, '°F'], ['Disc face to shield', gapShield * 12, 'in']] }), 'LEZ-32-310'); }
  return out;
});

defineReqs([
  { id: 'R-PWR-2', ref: '23.1091 / 23.1093 / 23.1105', title: 'Induction air: filtered ram air, adequate inlet, alternate (heated) air that bypasses the filter', checks: /^pwr-induction$/, method: 'analysis', closed: true },
  { id: 'R-GEAR-3', ref: '23.733 / 23.735 / TSO-C62', title: 'Tyre speed and load within rating; brakes within kinetic-energy rating; pants clear the tyre in all conditions', checks: /^gear-(tyre-speed|tyre-load|pant-clear|pant-heat|brake-ke)$/, method: 'analysis', closed: true },
]);
