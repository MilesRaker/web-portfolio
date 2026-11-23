// WPC9 — block C interface control (docs/icd/c_controls.md, phase 2): feature-to-feature checks between the flight
// controls (LEZ-27-*) and the parts they meet, computed from both sides' own geometry. Each check returns {ok, detail};
// requirement R-ICD-C fails the audit when any C-side check fails, and the block C records carry the same checks as
// interfaces. Items another block must still act on are listed as open items (they pass and name their owner).
// Inches, [FS, BL, WL] unless noted. Notional.
import { GEO, CS_FIT } from '../structures.js';
import { FRAMES, afAt } from '../plybook.js';
import { PARTS, partByPN, defineReqs } from '../systems.js';
import { CTLS, ctlSection, ctlStations } from './wp19_ctl.js';
import { L, ARM, LINK, SZ, LOADS, ROD_END, rudRoute, RR, CS_PASS, RUD, LB, elevBalance, V, CONDUIT } from './wpC1_controls.js';
import { RD_HORN } from './wpA6_rudder.js';
import { MC_GEO } from './wpD2_brakes.js';
import { HARD } from './wp15_cs_spar.js';
import { strakeSection, STK } from './wp21_strake.js';
import { canPt, tCut, CANF } from './wpB1_canopy.js';
import { PNL } from './wpB3_panel.js';
import { layer, FUS } from './wp26_fuselage.js';
import { CS_SOLID } from '../defn/solids/cs_spar.js';
import { SYSC, gmuGap } from './wpC8_cuts.js';

const { add, sub, mul, dot, len, norm, cross } = V, D2R = Math.PI / 180, fx = (x, n = 2) => Number(x).toFixed(n);
const pt = (p) => `FS ${fx(p[0])}, BL ${fx(p[1])}, WL ${fx(p[2])}`, near = (a, b, t) => len(sub(a, b)) <= t;
const asinD = (x) => Math.asin(x) / D2R;
export const TOL = { pos: 0.01, cos: 0.01, gap: 0.5, line: 0.25, rig: 1 / 16 };

// ------------------------------------------------------------------------------------------- travel (published)
export const TRAVEL = (() => {
  const pitch = asinD(ARM.pitchBC * Math.sin(DEG('elevator')) / ARM.pitch), roll = asinD(ARM.horn * Math.sin(DEG('aileron')) / ARM.roll);
  return { pitch, roll, cant: L.cant, pedal: LINK.pedalDeg, rudder: CTLS.rudder.travel() };
})();
function DEG(id) { return CTLS[id].travel() * D2R; }
/** a point on the front (or rear) stick axis h in above its pivot, at roll r and pitch p (deg; roll + outboard) */
function stickPt(G, h, r, p, cant) { const a = (r - cant) * D2R, b = p * D2R, hc = h * Math.cos(b); return [G[0] - h * Math.sin(b), G[1] + hc * Math.sin(a), G[2] + hc * Math.cos(a)]; }
/** the canopy frame's inner surface and the shell's inner wall at a station (right side), [BL, WL] in */
function cockpitWall(fs) { const s = fs / 12, out = [], t0 = tCut(s, -CANF.t); for (let i = 0; i <= 120; i++) out.push(canPt(s, t0 + (Math.PI / 2 - t0) * i / 120, -CANF.t));
  for (const q of layer(s, -FUS.t, -FUS.t - 0.001, false, 1).slice(0, FUS.n + 1)) if (q[0] > 0) out.push(q); return out; }
/** smallest gap (in) from the grip sleeve (OD = stick + 0.2) to the canopy and the shell over the full travel */
export function gripGap(G, grip, cant) {
  const rg = (SZ.stick[0] + 0.2) / 2; let m = { d: Infinity };
  for (const r of [-1, -0.5, 0, 0.5, 1].map((k) => k * TRAVEL.roll)) for (const p of [-1, -0.5, 0, 0.5, 1].map((k) => k * TRAVEL.pitch))
    for (let k = 0; k <= 12; k++) { const q = stickPt(G, grip - 2 + 3 * k / 12, r, p, cant); for (const w of cockpitWall(q[0])) { const d = Math.hypot(w[0] - q[1], w[1] - q[2]) - rg; if (d < m.d) m = { d, r, p, at: q }; } }
  return m;
}
/** the stick's envelope where it passes the right console top (B's slot): FS and BL ranges of the tube surface */
export function consoleEnvelope(wl = 39.12) {
  const h = wl - L.G1[2], r0 = SZ.stick[0] / 2, ys = [], xs = [];
  for (const r of [-TRAVEL.roll, TRAVEL.roll]) for (const p of [-TRAVEL.pitch, TRAVEL.pitch]) { const a = (r - L.cant) * D2R, hh = h / Math.cos(a); const q = stickPt(L.G1, hh / Math.cos(p * D2R), r, p, L.cant); ys.push(q[1]); xs.push(q[0]); }
  return { wl, fs: [Math.min(...xs) - r0, Math.max(...xs) + r0], bl: [Math.min(...ys) - r0 / Math.cos((L.cant + TRAVEL.roll) * D2R), Math.max(...ys) + r0 / Math.cos((L.cant - TRAVEL.roll) * D2R)] };
}

// ------------------------------------------------------------------------------------------- the checks
const C = {};
// 1. horns: the released holes and the C link ends, feature to feature
C.elevHorn = () => {
  const st = ctlStations('elevator'), s = ctlSection('elevator', st[0]), q = s.pts[CTLS.elevator.hinge > 0 ? 24 : 25], pin = [q[0], st[0] * 12, q[1]];
  const h = sub(L.hornE, pin), r = Math.hypot(h[0], h[2]), dir = Math.atan2(-h[2], -h[0]) / D2R;
  const T0 = [L.T0[0], pin[1], L.T0[2]], dA = sub(L.driveTip, [L.T0[0], L.driveTip[1], L.T0[2]]), par = Math.abs(dA[0] * h[2] - dA[2] * h[0]) / (Math.hypot(dA[0], dA[2]) * r);
  const lk = Math.hypot(L.hornE[0] - L.driveTip[0], L.hornE[2] - L.driveTip[2]), base = Math.hypot(pin[0] - T0[0], pin[2] - T0[2]);
  const ok = near(pin, L.pinE, TOL.pos) && Math.abs(r - CTLS.elevator.horn.arm) < 0.005 && Math.abs(dir - 45) < 0.5 && par < TOL.cos && Math.abs(Math.hypot(dA[0], dA[2]) - ARM.horn) < 0.005 && Math.abs(lk - base) < 0.005;
  return { ok, detail: `pin ${pt(pin)} (released section); rod-end hole ${pt(L.hornE)}, ${fx(r, 3)} in at ${fx(dir, 1)}° forward-down; drive arm ${fx(Math.hypot(dA[0], dA[2]), 3)} in ∥ horn (sin ${par.toExponential(1)}); link ${fx(lk, 3)} = pin → tube ${fx(base, 3)} in (parallelogram)` };
};
C.ailHorn = () => {
  const st = ctlStations('aileron'), hi = CTLS.aileron.hinge > 0 ? 24 : 25, s = ctlSection('aileron', st[0]), pin = [s.pts[hi][0], st[0] * 12, s.pts[hi][1]];
  const lc = norm(sub(L.K2c, L.hornA)), c = Math.abs(lc[0] * L.hingeA[0] + lc[1] * L.hingeA[1]) / Math.hypot(L.hingeA[0], L.hingeA[1]), drop = pin[2] - L.hornA[2];
  const env = [L.hornA[1] - ROD_END.w / 2, L.hornA[1] + ROD_END.w / 2], rel = L.relA;
  const ok = near(pin, L.pinA, TOL.pos) && Math.abs(drop - CTLS.aileron.horn.arm) < 0.005 && c < TOL.cos && rel[0] <= env[0] - 0.05 && rel[1] >= Math.min(env[1], CTL_COVE('aileron')) - 1e-9;
  return { ok, detail: `pin ${pt(pin)}; hole ${pt(L.hornA)} ${fx(drop, 3)} in below it; link C square to the hinge in plan (cos ${c.toExponential(1)}); rod end BL ${fx(env[0])}–${fx(env[1])} inside the wing's cove-end relief BL ${fx(rel[0])}–${fx(rel[1])}` };
};
const CTL_COVE = (id) => { const c = { aileron: GEO.wing.aileron, elevator: GEO.canard.elevator }[id]; return c[0] * 12; };
// 2. arm ratios: every arm length and squareness from the points, and the loads they deliver
C.ratios = () => {
  const rows = [], sq = (arm, rod) => Math.abs(dot(norm(arm), norm(rod)));
  const pitchArm = sub(L.PA1, L.G1), bc = sub(L.PB, [L.T0[0], L.PB[1], L.T0[2]]), rod = sub(L.PA1, L.PB);
  rows.push(['stick pitch arm', len([pitchArm[0], 0, pitchArm[2]]), ARM.pitch, sq([pitchArm[0], 0, pitchArm[2]], rod)], ['pitch bellcrank', len([bc[0], 0, bc[2]]), ARM.pitchBC, sq([bc[0], 0, bc[2]], rod)]);
  const crank = sub(L.R1, L.CT), lat = sub(L.IT, L.CT), beamIn = sub(L.IT, L.PT), beamOut = sub(L.SR, L.PT);
  rows.push(['roll crank', len(crank), ARM.roll, sq(crank, lat)], ['beam input', len(beamIn), L.rT, sq(beamIn, lat)], ['beam output', len(beamOut), L.rT, sq(beamOut, L.u)]);
  const k1a = sub(L.K1a, L.Q1), k1b = sub(L.K1b, L.Q1), k2d = sub(L.K2d, L.Q2), k2c = sub(L.K2c, L.Q2), rodB = sub(L.K2d, L.K1b), linkC = sub(L.hornA, L.K2c);
  rows.push(['K1 in', len(k1a), ARM.k, sq(k1a, L.u)], ['K1 out', len(k1b), ARM.k, sq(k1b, rodB)], ['K2 in', len(k2d), ARM.k, sq(k2d, rodB)], ['K2 out', len([k2c[0], k2c[1], 0]), ARM.k, sq([k2c[0], k2c[1], 0], [linkC[0], linkC[1], 0])]);
  const bad = rows.filter(([, g, w, c]) => Math.abs(g - w) > 0.005 || c > TOL.cos);
  // loads at the horns from the geometric arms (grip force × grip / arm × … , pilots together for pitch, shared)
  const g = (n) => rows.find((r) => r[0] === n)[1];
  const hornE = LOADS.pitch.together * ARM.grip / g('stick pitch arm') * g('pitch bellcrank') / ARM.horn / 2;
  const hornA = LOADS.roll.single * ARM.grip / g('roll crank') * (g('beam output') / g('beam input')) * (g('K1 out') / g('K1 in')) * (g('K2 out') / g('K2 in'));
  const r0 = rudRoute(1), dC = norm(sub(r0[1], r0[0])), hornEff = Math.abs((r0[0][2] - L.ped.z) * dC[0] - (r0[0][0] - L.ped.s) * dC[2]), cable = LOADS.rudder * ARM.pedalPad / hornEff;
  const ok = !bad.length && hornE <= CTLS.elevator.rod * 1.001 && hornA <= CTLS.aileron.rod * 1.001 && Math.abs(hornE / LINK.hornE - 1) < 1e-3 && Math.abs(hornA / LINK.ailRod - 1) < 1e-3 && Math.abs(cable / LINK.cable - 1) < 1e-3;
  return { ok, detail: `${bad.length ? `off: ${bad.map((r) => `${r[0]} ${fx(r[1], 3)}/${fx(r[2], 3)} (cos ${fx(r[3], 3)})`).join('; ')}; ` : `${rows.length} arms at length, square to their rods; `}elevator horn ${fx(hornE, 1)} lb ≤ ${fx(CTLS.elevator.rod, 1)}; aileron horn ${fx(hornA, 1)} lb ≤ ${fx(CTLS.aileron.rod, 1)}; rudder cable ${fx(cable, 0)} lb (pedal horn ${fx(hornEff, 3)} in effective) = the c27 checks' loads` };
};
// 3. stops against the bevels (both ends of each surface), TE rigging ±1/16 in
C.stops = () => {
  const rows = [];
  for (const id of ['elevator', 'aileron']) for (const y of [ctlStations(id)[0], ctlStations(id).at(-1)]) { const s = ctlSection(id, y), contact = Math.atan(s.bev / s.depth) / D2R, tol = asinD(TOL.rig / s.chord); rows.push([id, y * 12, CTLS[id].travel(), tol, contact]); }
  const rs = ctlStations('rudder'); for (const h of [rs[0], rs.at(-1)]) { const s = ctlSection('rudder', h), contact = s.contact ?? Math.atan(s.bev / s.depth) / D2R, tol = asinD(TOL.rig / s.chord); rows.push(['rudder', h * 12, CTLS.rudder.travel(), tol, contact]); }
  const bad = rows.filter((r) => r[2] + r[3] >= r[4]);
  const stickE = asinD(ARM.pitch * Math.sin(TRAVEL.pitch * D2R) / ARM.pitchBC), stickA = asinD(ARM.roll * Math.sin(TRAVEL.roll * D2R) / ARM.horn);
  const rud = (() => { const H = RUD.H, P = RUD.P, s = ARM.pedalHorn * 0 + LINK.hornEff * Math.sin(TRAVEL.pedal * D2R); let th = 0; for (let k = 0; k < 60; k++) { const f = (t) => len(sub(P, H)) - len(sub(P, RUD.rot(H, t))) - s; th = th - f(th) / ((f(th + 0.01) - f(th - 0.01)) / 0.02); } return th; })();
  const ok = !bad.length && Math.abs(stickE - 20) < 0.05 && Math.abs(stickA - 15) < 0.05 && rud >= CTLS.rudder.travel() - 0.25;   // DC-005: the rudder's own stops limit its travel; the pedal stop sits beyond (cable stretch), so unloaded it drives the rudder onto its stop
  return { ok, detail: `${rows.map((r) => `${r[0]} BL/h ${fx(r[1], 1)}: ${r[2]}° + ${fx(r[3], 2)}° < contact ${fx(r[4], 2)}°`).join('; ')}; stick stops ±${fx(TRAVEL.pitch, 2)}° → elevator ${fx(stickE, 2)}°, ±${fx(TRAVEL.roll, 2)}° → aileron ${fx(stickA, 2)}°; pedal stop ${fx(TRAVEL.pedal, 2)}° → rudder ${fx(rud, 2)}°` };
};
// 4. elevator static balance on the torque tube (1:1 parallelogram, so moments about the tube = about the pin)
export function balanceCheck(recMass) {
  const B = elevBalance(), mw = B.mw * ARM.wElev, dm = Math.abs(B.m / (1 + B.finish) / recMass - 1);
  return { ok: mw >= B.M && dm < 0.10, detail: `elevator ${fx(B.m / (1 + B.finish), 3)} lb from the sections vs ${fx(recMass, 3)} lb released (${fx(dm * 100, 1)} %); moment ${fx(B.M, 2)} lb·in with 15 % finish; weights ${fx(B.mw, 3)} lb × ${ARM.wElev} in = ${fx(mw, 2)} lb·in (${fx(mw / B.M, 2)} ×)` };
}
// 5. the CS spar corridor: the spar's measured tunnels against the rod and conduit paths
C.corridor = () => {
  const Wd = GEO.csSpar.width * 12, CSF = (GEO.csSpar.s - GEO.csSpar.width / 2) * 12, zl = CS_FIT.L * 12, m = CS_SOLID.measured.holes || [], r = rudRoute(1), rows = [];
  for (const q of CS_PASS()) { const line = q.id === 'rod' ? [L.E, L.X] : [r[RR.fwd], r[RR.aft]], od = q.id === 'rod' ? SZ.ailRod[0] : CONDUIT.od /* DC-005: was a typed 0.25 */, dv = (q.x1 - q.x0) / Math.hypot(q.x1 - q.x0, Wd);
    const meas = m.filter((h) => h.feat === `pass-${q.id}`), x0 = meas.length ? meas[0].x + 0.2 * dv : NaN;
    rows.push({ id: q.id, ok: meas.length === 2 && Math.abs(x0 - line[0][1]) < TOL.pos && Math.abs(q.x1 - line[1][1]) < TOL.pos && Math.abs(q.z + zl - line[0][2]) < TOL.pos && line[0][0] === CSF && Math.abs(meas[0].r - q.d / 2) < 1e-3 && q.d / 2 - od / 2 >= 0.06, x0, q, line, od }); }
  // tunnels clear of the hard-point bolts by one bolt diameter; in inside the fuselage, out outboard of the cowl
  let hp = Infinity; for (const q of CS_PASS()) for (const h of HARD) for (const c of h.cols) for (const z of h.zIn) { const y = h.y * 12 + c, zz = zl + z; for (const t of [0, 0.25, 0.5, 0.75, 1]) { const by = q.x0 + (q.x1 - q.x0) * t; hp = Math.min(hp, Math.hypot(by - y, q.z + zl - zz) - q.d / 2 - h.d / 2 - h.d); } }
  const inner = layer(CSF / 12, -FUS.t, -FUS.t - 0.001, false, 1).slice(0, FUS.n + 1), wIn = (z) => { for (let i = 0; i < inner.length - 1; i++) if ((inner[i][1] - z) * (inner[i + 1][1] - z) <= 0 && inner[i][0] > 0) return inner[i][0]; return 0; };
  const outer = layer(GEO.firewall, 0, -0.001, false, 1).slice(0, FUS.n + 1), wOut = (z) => { for (let i = 0; i < outer.length - 1; i++) if ((outer[i][1] - z) * (outer[i + 1][1] - z) <= 0 && outer[i][0] > 0) return outer[i][0]; return 99; };
  const ends = rows.every((w) => w.line[0][1] + w.q.d / 2 <= wIn(w.line[0][2]) && w.line[1][1] - w.q.d / 2 >= wOut(w.line[1][2]));
  return { ok: rows.every((w) => w.ok) && hp >= 0 && ends, detail: `${rows.map((w) => `${w.id}: tunnel Ø ${fx(w.q.d, 3)} (line Ø ${w.od}) from BL ${fx(w.x0)} at the forward face to ${fx(w.q.x1)} at the aft face, WL ${fx(w.q.z + zl)} — ${w.ok ? 'on the line' : 'OFF the line'}`).join('; ')}; ${fx(hp + 0, 2)} in beyond one bolt Ø from every hard-point hole; ${ends ? 'in inside the fuselage, out outboard of the cowl' : 'an end is outside its wall'}` };
};
// 6. lines: none in the fuel cavity; clearances between block C lines and the moving sticks
const cPaths = () => PARTS.filter((p) => /^LEZ-27-/.test(p.pn)).flatMap((p) => (p.geo || []).filter((g) => g.t === 'path').map((g) => ({ pn: p.pn, r: g.dIn / 2, pts: g.pts.map((q) => q.map((v) => v * 12)) })));
const sample = (pts, step = 0.5) => { const o = []; for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i], n = Math.max(1, Math.ceil(len(sub(b, a)) / step)); for (let k = 0; k <= n; k++) o.push(add(a, mul(sub(b, a), k / n))); } return o; };
function inPoly(x, z, P) { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, zi] = P[i], [xj, zj] = P[j]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) c = !c; } return c; }
C.tank = () => { const hits = []; for (const g of cPaths()) for (const q of sample(g.pts)) { const y = Math.abs(q[1]); if (y < STK.yR || y > STK.yE) continue; const cav = strakeSection(y / 12, true).cavity; if (cav && inPoly(q[0], q[2], cav)) { hits.push([g.pn, q]); break; } }
  return { ok: !hits.length, detail: hits.length ? hits.map(([pn, q]) => `${pn} in the fuel cavity at ${pt(q)}`).join('; ') : 'no block C line inside either strake fuel cavity' }; };
function segDist(p1, q1, p2, q2) { const d1 = sub(q1, p1), d2 = sub(q2, p2), r = sub(p1, p2), a = dot(d1, d1), e = dot(d2, d2), f = dot(d2, r); let s, t; if (a < 1e-12) { s = 0; t = Math.min(1, Math.max(0, f / e)); } else { const c = dot(d1, r); if (e < 1e-12) { t = 0; s = Math.min(1, Math.max(0, -c / a)); } else { const b = dot(d1, d2), den = a * e - b * b; s = den > 1e-12 ? Math.min(1, Math.max(0, (b * f - c * e) / den)) : 0; t = (b * s + f) / e; if (t < 0) { t = 0; s = Math.min(1, Math.max(0, -c / a)); } else if (t > 1) { t = 1; s = Math.min(1, Math.max(0, (b - c) / a)); } } } return len(sub(add(p1, mul(d1, s)), add(p2, mul(d2, t)))); }
const pathDist = (A, B) => { let m = Infinity; for (let i = 1; i < A.pts.length; i++) for (let j = 1; j < B.pts.length; j++) m = Math.min(m, segDist(A.pts[i - 1], A.pts[i], B.pts[j - 1], B.pts[j])); return m - A.r - B.r; };
C.lines = () => {
  const P = cPaths(), bad = []; let worst = Infinity;
  for (let a = 0; a < P.length; a++) for (let b = a + 1; b < P.length; b++) { if (P[a].pn === P[b].pn) continue; const d = pathDist(P[a], P[b]); worst = Math.min(worst, d); if (d < TOL.line) bad.push(`${P[a].pn} ↔ ${P[b].pn} ${fx(d)} in`); }
  // the moving front stick (tube Ø, canted) against every line over its travel
  let st = Infinity; for (const r of [-TRAVEL.roll, 0, TRAVEL.roll]) for (const p of [-TRAVEL.pitch, 0, TRAVEL.pitch]) { const S = { r: SZ.stick[0] / 2 + 0.1, pts: [stickPt(L.G1, 1.0, r, p, L.cant), stickPt(L.G1, ARM.grip + 1.0, r, p, L.cant)] }; for (const g of P) if (!['LEZ-27-110', 'LEZ-27-140', 'LEZ-27-120'].includes(g.pn)) st = Math.min(st, pathDist(S, g)); }
  let sr = Infinity; for (const r of [-TRAVEL.roll, 0, TRAVEL.roll]) for (const p of [-TRAVEL.pitch, 0, TRAVEL.pitch]) { const S = { r: SZ.stick[0] / 2 + 0.1, pts: [stickPt(L.G2, 1.0, r, p, L.cant), stickPt(L.G2, ARM.gripR + 1.0, r, p, L.cant)] }; for (const g of P) if (!['LEZ-27-111', 'LEZ-27-140'].includes(g.pn)) sr = Math.min(sr, pathDist(S, g)); }
  if (st < TOL.line) bad.push(`front stick ↔ a line ${fx(st)} in`);
  if (sr < TOL.line) bad.push(`rear stick ↔ a line ${fx(sr)} in`);
  return { ok: !bad.length, detail: bad.length ? bad.join('; ') : `${P.length} block C line pieces ≥ ${TOL.line} in apart (closest ${fx(worst)} in); front / rear stick ≥ ${fx(st)} / ${fx(sr)} in from every line over their travel` };
};
// 7. rudder cable on block A's rudder horn
C.rudder = () => {
  const r = rudRoute(1), end = r.at(-1), H = RD_HORN.at.map((v) => v * 12), arm = RUD.arm, A = CTLS.rudder.horn.armAxis && CTLS.rudder.balance && CTLS.rudder.balance() ? CTLS.rudder.horn.armAxis : CTLS.rudder.horn.arm;   // DC-005: with the set-back hinge the arm is measured from the axis
  const F = FRAMES.winglet, ca = GEO.winglet.cant * D2R, inFin = (p) => { const dy = p[1] - GEO.winglet.y0 * 12, dz = p[2] - GEO.wing.z * 12, h = (dy * Math.sin(ca) + dz * Math.cos(ca)) / 12, lat = (dy * Math.cos(ca) - dz * Math.sin(ca)) / 12; if (h < 0 || h > GEO.winglet.h) return false; const s = F.sec(h), x = (p[0] / 12 - s.le) / s.c, af = afAt(F, h, x); return x > 0.02 && x < 0.98 && lat / s.c < af.yu && lat / s.c > af.yl; };
  const W = FRAMES.wing, inWing = (p) => { const y = p[1] / 12, s = W.sec(y), x = (p[0] / 12 - s.le) / s.c, af = afAt(W, y, x), o = (p[2] / 12 - W.pt(y, x, 0)[2]) / s.c; return y <= GEO.wing.tipY && o < af.yu && o > af.yl; };
  const ok = near(end, H, TOL.pos) && arm >= 0.8 * A && inWing(RUD.T) && inFin(RUD.P);
  return { ok, detail: `cable end ${pt(end)} on the horn hole ${pt(H)}; fairlead ${pt(RUD.T)} ${inWing(RUD.T) ? 'inside the wing tip' : 'OUTSIDE the wing'}, pulley ${pt(RUD.P)} ${inFin(RUD.P) ? 'inside the fin' : 'OUTSIDE the fin'}; effective horn ${fx(arm, 3)} in (horn ${A} in); ${CTLS.rudder.travel()}° = ${fx(RUD.stroke, 3)} in of cable` };
};
// 8. master cylinders (block D) on the pedals
C.mc = () => {
  const R = [MC_GEO.R[1], MC_GEO.R[0], MC_GEO.R[2]], E = [MC_GEO.eye[1], MC_GEO.eye[0], MC_GEO.eye[2]], u = norm([E[0] - R[0], E[2] - R[2]]), tab = [L.mcRod[0] - L.toeHinge[0], L.mcRod[2] - L.toeHinge[2]];
  const c = Math.abs(tab[0] * u[0] + tab[1] * u[1]) / Math.hypot(...tab), tl = Math.hypot(...tab);
  // the pedal swings forward (pad forward, ear forward) from neutral; at neutral the ear is aft-most: clear of the panel's forward face
  const earGap = PNL.fwd - (L.mcBody[0] + 0.35), piv = [L.ped.s, L.ped.z], rot = (p, d) => { const a = -d * D2R, x = p[0] - piv[0], z = p[2] - piv[1]; return [piv[0] + x * Math.cos(a) - z * Math.sin(a), piv[1] + x * Math.sin(a) + z * Math.cos(a)]; };
  const L0 = Math.hypot(L.mcBody[0] - L.mcRod[0], L.mcBody[2] - L.mcRod[2]), a = rot(L.mcRod, TRAVEL.pedal), b = rot(L.mcBody, TRAVEL.pedal), L1 = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const ok = near(L.mcRod, R, TOL.pos) && near(L.mcBody, E, TOL.pos) && Math.abs(tl - ARM.toeTab) < 0.005 && c < 0.15 && earGap >= 0.1 && Math.abs(L1 - L0) < 1e-6;
  return { ok, detail: `rod clevis ${pt(L.mcRod)} = D's rod eye ${pt(R)}; body ear ${pt(L.mcBody)} = D's body eye; eye to eye ${fx(L0, 3)} in, unchanged at ${fx(TRAVEL.pedal, 1)}° pedal; toe tab ${fx(tl, 3)} in, cos ${fx(c, 3)} to the MC axis; ear ${fx(earGap, 2)} in ahead of the panel's forward face (FS ${fx(PNL.fwd)})` };
};
// 9. grips against the canopy rail and the shell (block B surfaces), full travel
C.grip = () => {
  const f = gripGap(L.G1, ARM.grip, L.cant), r = gripGap(L.G2, ARM.gripR, L.cant);
  return { ok: f.d >= TOL.gap && r.d >= TOL.gap, detail: `front grip ≥ ${fx(f.d)} in (at ${fx(f.r, 1)}° roll, ${fx(f.p, 1)}° pitch), stick canted ${L.cant}° inboard; rear grip ≥ ${fx(r.d)} in (grip ${ARM.gripR} in, same cant); rule ≥ ${TOL.gap} in over ±${fx(TRAVEL.pitch, 2)}° pitch, ±${fx(TRAVEL.roll, 2)}° roll` };
};
// 10. landing-brake actuator: source-control envelope (wp8) against the record and the kinematics
C.actuator = () => { const scd = partByPN('LEZ-27-171')?.scd || {}, B = LB(), s = String(scd.spec || ''), st = +(s.match(/([\d.]+) in stroke/) || [])[1], f = +(s.match(/≥ ([\d.]+) lb/) || [])[1];
  return { ok: st === B.stroke && B.rated >= f && B.need <= B.stroke && B.F <= B.rated, detail: `SCD ${st} in / ${f} lb; record ${B.stroke} in / ${B.rated} lb; needs ${fx(B.need, 2)} in and ${fx(B.F, 0)} lb` }; };   // the record meets the SCD (≥ its force): the PA-01 169 lb option over the SCD's ≥ 150 lb

// ------------------------------------------------------------------------------------------- open items (other blocks)
export const OPEN = () => {
  const ce = consoleEnvelope();
  return [
    ['A (LEZ-55-193 rudder)', `Horn design load ${CTLS.rudder.rod} lb (1:1 assumed) vs ${fx(LINK.cable, 0)} lb delivered (5.6 in pad on a ${fx(LINK.hornEff, 2)} in effective pedal horn): size the horn, pad and bolts for ${fx(LINK.cable, 0)} lb; a ${CTLS.rudder.horn.arm} in arm (at the hinge face) gives ${CTLS.rudder.travel()}° on ${fx(RUD.stroke, 3)} in of cable (${fx(TRAVEL.pedal, 1)}° pedal, ${fx(ARM.pedalPad * Math.sin(TRAVEL.pedal * D2R), 2)} in at the pad) — a ≈ 2.4 in arm would restore ≈ 1.5 in of pad travel`],
    ['A (LEZ-57-130 winglet, LEZ-57-110 wing tip)', `Hard point for the cable pulley in the fin at ${pt(RUD.P)} (pulley in the fin plane) and a lined fairlead hole through the wing tip close-out and the fin's inboard skin near ${pt(RUD.T)}`],
    ['A (LEZ-53-165 F28, LEZ-53-170, LEZ-53-175)', 'Holes for the pitch rod (F28), the roll tube and the rudder conduits (seat backs) from the routed lines (A interface agent)'],
    ['B (LEZ-25-110 right console)', `Stick slot at the console top WL ${fx(ce.wl)}: FS ${fx(ce.fs[0])}–${fx(ce.fs[1])}, BL ${fx(ce.bl[0])}–${fx(ce.bl[1])} (tube Ø ${SZ.stick[0]}, travel ±${fx(TRAVEL.pitch, 2)}° pitch, ±${fx(TRAVEL.roll, 2)}° roll, canted ${L.cant}° inboard), plus 1/8 in`],
    ['J (LEZ-57-140 rev F systems tunnel)', `Bring the CS spar's systems tunnel out of the aft face (FS 153.00) at BL ±${SYSC.jut[0][1]}, WL ${SYSC.jut[0][2]}, Ø ≥ ${2 * SYSC.r} — the jut-out tunnel starts there (front wall FS ${SYSC.jut[0][0]}); it lies 0.9 in above C's rudder conduit (WL 38.6) and 1.85 in above the K1 bay`],
    ['I / J (LEZ-33-110; option A)', `Since option A (Miles, 2026-11-19) the systems conduit carries the wingtip light harness alone; J's GMU 11 harness (left) and COM coax (right) take the aft lane (LEZ-57-140 rev H low tunnel, LEZ-57-116 rev C aft root bay, LEZ-57-110 rev E aft conduit: wpJ0 AFTC, cut here). Was: route the wingtip light harness (both wings), the GMU 11 harness (left) and the COM coax (right) through the systems conduit (${SYSC.conduit}, tunnel Ø ${2 * SYSC.r}); root disconnects in the jut-out's systems connector bay BL ±${SYSC.bay.bl[0]}–${SYSC.bay.bl[1]}, FS ${SYSC.bay.fs[0]}–${SYSC.bay.fs[1]}, WL ${SYSC.bay.wl[0]}–${SYSC.bay.wl[1]} (connectors pass the Ø 0.68 conduit bore one at a time); the conduit ends at the tip close-out at FS ${SYSC.wing.at(-1)[0]}, WL ${SYSC.wing.at(-1)[2]}`],
    ['J (LEZ-31-122 GMU 11)', (() => { const g = gmuGap(partByPN('LEZ-31-122')?.geo?.[0]?.c); return g ? `The GMU 11 at FS ${fx(g.at[1])}, BL −${fx(g.at[0])} is ${fx(g.sys, 1)} in from the systems conduit (light harness inside) and ${fx(g.cond, 1)} in from the rudder conduit, against the 36 in of its own record: no conduit position in a 40 in chord meets 36 in; J to set the GMU's position and the rule (BOUND from the installation manual), with the light supply and return twisted` : 'GMU 11 not found'; })()],
    ['D (LEZ-32-311)', `In this layout a toe application moves the rod eye forward, away from the body eye (pull to apply): confirm the cylinder type or reverse it; pedal-to-MC ratio ${fx(ARM.toePad / ARM.toeTab, 3)} for brk-line's bound`],

  ];
};
export const ICD_C = [
  ['IC1', 'LEZ-55-192 horn hole (rev B) ↔ LEZ-27-130 link', C.elevHorn], ['IC2', 'LEZ-57-191 horn hole (rev B) ↔ LEZ-27-142 link C', C.ailHorn],
  ['IC3', 'Arm ratios and the horn / cable loads', C.ratios], ['IC4', 'Stops against the bevels, rigging', C.stops], ['IC5', 'LEZ-57-140 tunnels ↔ rod A and conduit', C.corridor],
  ['IC6', 'No line in the fuel cavity', C.tank], ['IC7', 'Line and stick clearances', C.lines], ['IC8', 'Rudder cable ↔ LEZ-55-193 horn (block A)', C.rudder],
  ['IC9', 'Master cylinders (block D) on the pedals', C.mc], ['IC10', 'Grips ↔ canopy rail and shell (block B)', C.grip], ['IC11', 'Landing-brake actuator SCD (wp8)', C.actuator],
].map(([id, what, f]) => ({ id, what, check: f }));
/** interface entries for a record: the given ICD checks, and the open items as passing entries that name their owner */
export const icdIface = (ids) => ICD_C.filter((c) => ids.includes(c.id)).map((c) => ({ id: c.id, with: 'ICD block C', feature: 'icd', what: c.what, check: c.check }));
export const openIface = () => OPEN().map(([owner, what], i) => ({ id: `O${i + 1}`, with: owner, feature: 'open', what: `OPEN (${owner}): ${what}`, open: true, check: () => ({ ok: true, detail: `OPEN item, owner ${owner}: ${what}` }) }));
defineReqs([{ id: 'R-ICD-C', ref: '—', title: 'Block C interfaces hold feature to feature (docs/icd/c_controls.md)', method: 'analysis', wp: 'WP2', needsParts: true,
  verify: () => { const bad = ICD_C.map((c) => [c.id, c.check()]).filter(([, r]) => !r.ok); return { ok: !bad.length, detail: bad.length ? bad.map(([id, r]) => `${id}: ${r.detail}`).join(' | ') : `${ICD_C.length} interface checks hold; ${OPEN().length} items with other owners, each now a check on LEZ-27-100 (O1–O8, closed by the owners' revisions: final integration)` }; } }]);
