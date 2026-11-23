// WPS1 — directional (yaw) stability and control of the airframe: the winglets / rudders against the fuselage and the
// pusher propeller (option study 2026-11-21, winglet LE sweep 37° → 27.16° from OVERALL). Three checks on the winglet
// (LEZ-57-130), registered once, on the W1 rudder case W1-Y1 (the matrix's directional case; the numbers do not depend on
// the case's speed or load factor, so one row per check):
//  • yaw-cnb: static directional stability Cnβ = Cnβ_V + Cnβ_F + Cnβ_P (per rad) against a light-aircraft yardstick
//    0.0010 /deg (FAR 23.177(a)(1) asks only Cnβ > 0).
//  • yaw-cndr: rudder power Cnδr (one rudder, outward) — full rudder alone holds the steady-heading sideslip of the
//    FAR 23.233(a) 0.2 VSO crosswind at the 1.3 VSO approach speed: Cnδr·δr,max ≥ Cnβ·β_xw.
//  • yaw-cnr: yaw damping Cnr (both fins) against the same expression at the lower end of the vertical-tail-volume band
//    that gives well-behaved yaw damping (MIT 16.01 design rules, Vv = 0.02 … 0.05).
// Method (per rad; model stations ft = plans FS / 12): winglet planform S_v = h(cr+ct)/2 per fin, MAC c̄ = ⅔(cr+ct−cr·ct/(cr+ct)) at
// h̄ = h/3·(cr+2ct)/(cr+ct), x_V = wingletSec(h̄).le + c̄/4, l_v = x_V − x_cg; a_v = 2.4 /rad (the model's winglet lift slope,
// structures.js surfaceLoading), η(1+dσ/dβ) = 1; Cnβ_V = 2·a_v·S_v·l_v/(S·b); fuselage Cnβ_F = −1.3·Vol/(S·b)·mean(h/w) (Raymer),
// Vol = Σ π/4·w·h·ds, s = 0.2 … 14.2 ft; pusher prop Cnβ_P = 0.12·π·r_p²·(s_prop − x_cg)/(S·b); Cnδr = K_b·CLδ(E)·(a_v/2π)·S_v·l_v/(S·b),
// CLδ = 2(π − θ + sin θ), cos θ = 2E − 1 (structures.js flap()); Cnr = −2·2·a_v·S_v·l_v²/(S·b²). CG: the reference loading (pilot 200, pax 170,
// fuel 312, bag 25 lb on the current mass model; ≈ FS 102.7, near the 103 in aft limit, the critical end for Cnβ).
// Sources: FAR 23.177, 23.233 (pre-amendment 64); Raymer (fuselage Cnβ, historical Cnβ); MIT 16.01 design rules; Raymer /
// Roskam homebuilt Vv (Scholz, HAW Hamburg tail-sizing note).
// 2026-11-21: flap() corrected to the thin-airfoil form (was θ = acos(1 − 2E), τ 0.92 for E 0.30; now 0.66). Notional.
import { GEO, registerChecks, mk, fusAt, wingletSec, aircraft, weightCase, WEIGHT_CASES, flap, rudderKb } from '../structures.js';

const D2R = Math.PI / 180;
const IN_ = (n, v, u, s = 'DERIVED') => [n, v, u, s];
/** the reference loading the option study used (lb) */
export const YAW_REF = { set: { pilot: 200, pax: 170, fuel: 312, bag: 25 } };
/** yardsticks: Cnβ ≥ 0.0010 /deg; 0.2 VSO crosswind at 1.3 VSO; Vv ≥ 0.02 for yaw damping */
export const YAW_REQ = { cnbPerDeg: 0.0010, xw: 0.2, vApp: 1.3, vvMin: 0.02 };
const SRC = {
  cnb: 'BOUND: 0.0010 /deg (0.057 /rad), the light-aircraft Cnβ yardstick read from Raymer, Aircraft Design: A Conceptual Approach, Fig. 16.20 (historical Cnβ; cf. computationaldesignlab.github.io/aircraft-design/lat_stability/yaw_derivative.html, accessed 2026-11-21) — not checked against an open copy; FAR 23.177(a)(1) requires only Cnβ > 0',
  xw: 'FAR 23.233(a) (pre-amdt 64): 90° crosswind component demonstrated safe for take-off and landing, not less than 0.2 VSO (risingup.com/fars/info/part23-233-FAR.shtml, accessed 2026-11-21)',
  vApp: 'BOUND: approach at 1.3 VSO (cf. FAR 23.73 reference landing approach speed, not re-checked here); steady-heading sideslip held on rudder alone (aileron adverse yaw, which helps, not counted)',
  vv: 'BOUND: MIT 16.01 design rules (web.mit.edu/16.unified/www/SPRING/systems/Lab_Notes/desrules.pdf): Vv = Sv·lv/(S·b) of well-behaved aircraft 0.02 … 0.05, the fin\'s main job yaw damping; lower end taken. Homebuilt means: Raymer 0.040, Roskam 0.036 (Scholz, HAW Hamburg AERO_TN_TailSizing, Table 2.4)',
};

/** the directional derivatives (per rad) at the reference loading (or a given weight case) */
export function yawStability(d, wcIn = YAW_REF) {
  const wc = weightCase(d, { id: 'REF', label: 'Reference loading', ...wcIn }), A = aircraft(d, WEIGHT_CASES[0]), S = A.S, b = A.b, Sb = S * b, cg = wc.cg;
  const g = GEO.winglet, av = 2.4, eta = 1;
  const Sv = g.h * (g.cr + g.ct) / 2, mac = 2 / 3 * (g.cr + g.ct - g.cr * g.ct / (g.cr + g.ct)), hb = g.h / 3 * (g.cr + 2 * g.ct) / (g.cr + g.ct);
  const xV = wingletSec(hb).le + 0.25 * mac, lv = xV - cg;
  const cnbV = 2 * av * eta * Sv * lv / Sb;
  let vol = 0, hw = 0, n = 0; const ds = 0.05;
  for (let i = 0; ; i++) { const s = 0.2 + i * ds; if (s > 14.2 + 1e-9) break; const f = fusAt(s), h = f.top - f.bot; vol += Math.PI / 4 * f.w * h * ds; hw += h / f.w; n++; }
  const hwm = hw / n, cnbF = -1.3 * vol / Sb * hwm;
  const cnbP = 0.12 * Math.PI * GEO.prop.r ** 2 * (GEO.prop.s - cg) / Sb;
  const cnb = cnbV + cnbF + cnbP;
  const E = g.rudderCf, th = Math.acos(2 * E - 1), CLd = flap(E).CLd;   // structures.js flap(), corrected 2026-11-21
  const cndr = rudderKb() * CLd * (av / (2 * Math.PI)) * Sv * lv / Sb;   // span factor follows the rudder span (0.55 for h 0.25–3.0 ft)
  const CLdStd = CLd, cndrStd = cndr;   // the flap() correction made the two the same
  const cnr = -2 * 2 * av * Sv * lv * lv / (Sb * b);
  const Vv = 2 * Sv * lv / Sb;
  // requirements
  const cnbReq = YAW_REQ.cnbPerDeg / D2R;
  const dr = d.rudderDeg * D2R, betaXw = Math.atan(YAW_REQ.xw / YAW_REQ.vApp), cndrReq = cnb * betaXw / dr, betaMax = cndr * dr / cnb;
  const VsKt = aircraft(d, wc).Vs, xwMaxKt = YAW_REQ.vApp * VsKt * Math.tan(betaMax);
  const cnrReq = -2 * av * YAW_REQ.vvMin * lv / b;
  return { cg, W: wc.W, S, b, Sv, mac, hb, xV, lv, av, eta, cnbV, vol, hwm, cnbF, cnbP, cnb, E, theta: th, CLd, cndr, CLdStd, cndrStd, cnr, Vv,
    cnbReq, betaXw, cndrReq, betaMax, VsKt, xwMaxKt, cnrReq,
    ms: { cnb: cnb / cnbReq - 1, cndr: cndr / cndrReq - 1, cnr: cnr / cnrReq - 1 } };
}

registerChecks('wpS1-yaw', (d, lc) => {
  if (lc.id !== 'W1-Y1') return [];
  const Y = yawStability(d), at = `fin MAC ¼-chord FS ${(Y.xV * 12).toFixed(1)}, CG FS ${(Y.cg * 12).toFixed(1)}`;
  const geo = [IN_('Fin height h, root / tip chord', `${GEO.winglet.h} ft, ${GEO.winglet.cr} / ${GEO.winglet.ct} ft`, 'text', 'GEOMETRY (GEO.winglet)'), IN_('Winglet LE sweep', GEO.winglet.sweepLE, '°', 'GEOMETRY (GEO.winglet.sweepLE, from OVERALL 201.4 in)'),
    IN_('S_v per fin = h(cr+ct)/2', Y.Sv, 'ft²', 'DERIVED'), IN_('Fin MAC c̄, at h̄', `${Y.mac.toFixed(3)} ft at ${Y.hb.toFixed(3)} ft`, 'text', 'DERIVED'),
    IN_('CG (reference loading 200/170/312/25 lb)', Y.cg * 12, 'in FS', 'MODEL (weightCase on the mass model)'), IN_('Tail arm l_v = x_V − x_cg', Y.lv, 'ft', 'DERIVED'),
    IN_('S (wing + canard), b', `${Y.S.toFixed(2)} ft², ${Y.b} ft`, 'text', 'MODEL (structures.js aircraft())'), IN_('a_v (winglet lift slope)', Y.av, '/rad', 'MODEL (structures.js surfaceLoading)'),
    IN_('η(1 + dσ/dβ)', Y.eta, '', 'BOUND: fins at the wing tips in the free stream; sidewash and q-ratio taken as 1')];
  const sys = { sys: 'LEZ-57-130' };
  return [
    Object.assign(mk('winglet', 'yaw-cnb', 'Static directional stability Cnβ (winglets + fuselage + pusher prop)', lc, at, 'Cnβ ≥ 0.0010 /deg', Y.ms.cnb, {
      formula: 'Cnβ = 2·a_v·S_v·l_v/(S·b) − 1.3·Vol/(S·b)·mean(h/w) + 0.12·π·r_p²·(s_p − x_cg)/(S·b)  (per rad);  MS = Cnβ / Cnβ_req − 1',
      inputs: [...geo, IN_('Fuselage volume Σ π/4·w·h·ds (FS 2.4 … 170.4)', Y.vol, 'ft³', 'GEOMETRY (GEO.fuselage OML table)'), IN_('mean(h/w)', Y.hwm, '', 'GEOMETRY (GEO.fuselage)'),
        IN_('Fuselage factor −1.3', -1.3, '', 'BOUND: Raymer fuselage Cnβ estimate −1.3·Vol/(S·b)·(D_f/W_f), Aircraft Design: A Conceptual Approach §16'),
        IN_('Prop radius, station', `${GEO.prop.r} ft, FS ${(GEO.prop.s * 12).toFixed(1)}`, 'text', 'GEOMETRY (GEO.prop, block G LEZ-61-100)'), IN_('Prop normal-force slope on the disc', 0.12, '/rad', 'BOUND: pusher-disc normal-force slope 0.12 /rad on πr² (option study)'),
        IN_('Required Cnβ', Y.cnbReq, '/rad', SRC.cnb)],
      result: [['Cnβ_V (two fins)', Y.cnbV, '/rad'], ['Cnβ_F', Y.cnbF, '/rad'], ['Cnβ_P', Y.cnbP, '/rad'], ['Cnβ', Y.cnb, '/rad'], ['Cnβ', Y.cnb * D2R, '/deg'], ['Cnβ_req', Y.cnbReq, '/rad']] }), sys),
    Object.assign(mk('winglet', 'yaw-cndr', 'Rudder power Cnδr (one rudder, outward) for the FAR 23.233 crosswind', lc, at, 'Cnδr·δr ≥ Cnβ·β_xw', Y.ms.cndr, {
      formula: 'Cnδr = K_b·CLδ(E)·(a_v/2π)·S_v·l_v/(S·b), CLδ = 2(π − θ + sin θ), cos θ = 2E − 1; K_b = rudder span factor;  β_xw = atan(0.2 VSO / 1.3 VSO);  Cnδr_req = Cnβ·β_xw/δr,max;  MS = Cnδr / Cnδr_req − 1',
      inputs: [...geo, IN_('Rudder chord ratio E', Y.E, '', 'GEOMETRY (GEO.winglet.rudderCf)'), IN_('Rudder span factor K_b', rudderKb(), '', 'MODEL (structures.js rudderKb(): the fin\'s Schrenk lift share over the rudder span, scaled to the 0.55 used for h 0.25–3.0 ft)'),
        IN_('Full rudder δr,max (outward)', d.rudderDeg, '°', 'DESIGN (DEFAULT_DESIGN.rudderDeg)'), IN_('Cnβ (yaw-cnb)', Y.cnb, '/rad', 'DERIVED (yaw-cnb)'),
        IN_('Crosswind component', `${YAW_REQ.xw} VSO`, 'text', SRC.xw), IN_('Approach speed', `${YAW_REQ.vApp} VSO`, 'text', SRC.vApp)],
      result: [['CLδ', Y.CLd, '/rad'], ['Cnδr', Y.cndr, '/rad'], ['β_xw', Y.betaXw / D2R, '°'], ['Cnδr_req', Y.cndrReq, '/rad'], ['β held by full rudder', Y.betaMax / D2R, '°'], ['0.2 VSO (VSO at the reference loading)', YAW_REQ.xw * Y.VsKt, 'kt'], ['Crosswind on rudder alone at 1.3 VSO', Y.xwMaxKt, 'kt']] }), sys),
    Object.assign(mk('winglet', 'yaw-cnr', 'Yaw damping Cnr (both fins)', lc, at, 'Cnr ≤ −2·a_v·Vv_min·l_v/b', Y.ms.cnr, {
      formula: 'Cnr = −2·2·a_v·S_v·l_v²/(S·b²) = −2·a_v·Vv·l_v/b, Vv = 2·S_v·l_v/(S·b);  Cnr_req = −2·a_v·0.02·l_v/b;  MS = Cnr / Cnr_req − 1 = Vv/0.02 − 1',
      inputs: [...geo, IN_('Vv_min', YAW_REQ.vvMin, '', SRC.vv)],
      result: [['Vv (two fins)', Y.Vv, ''], ['Cnr', Y.cnr, '/rad'], ['Cnr_req', Y.cnrReq, '/rad']] }), sys),
  ];
});
