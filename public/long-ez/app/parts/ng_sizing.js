// Nose-gear sizing: loads, load paths and a design iteration that trades weight against margin for every member of the
// gear. The geometry in wp11 is drawn from the result, so the drawn part, its mass and its checks are the same design.
//
// Method: each member is sized at ultimate (FS × limit) to a target reserve of +15 % over the allowable, never below
// a practical minimum gauge. The strut is sized station by station (fully stressed in both planes, plus a stiffness
// limit); the other members are picked from standard stock as the lightest size that meets the target. The iteration
// log records the starting "block" design, each step, and the result.
import { GEO, WEIGHT_CASES, aircraft, DEFAULT_DESIGN } from '../structures.js';
import { NG, KIN, DOOR, strutPt, axleAt, C_at, B_at, d2r } from './ng_layout.js';

export const TGT = 0.15;                 // design reserve over the allowable at ultimate
export const MAT = {                      // allowables used here (psi, lb/in³); B-basis-like, room temperature (ASSUMED)
  sglass: { F: 100000, Fc: 90000, E: 7.0e6, rho: 0.072, label: 'unidirectional S-glass / epoxy (flexure allowable after knock-downs)' },
  c4130: { Ftu: 90000, Fty: 70000, Fbru: 125000, E: 29e6, rho: 0.283, label: '4130 normalised (welded: Ftu 80 ksi)' },
  a6061: { Ftu: 42000, Fbru: 88000, rho: 0.098, label: '6061-T6' },
};
export const AN_SHEAR = { 3: 2126, 4: 3682, 5: 5750, 6: 8280, 7: 11250, 8: 14700, 10: 23000 };   // AN bolt single-shear ultimate, lb (125 ksi)

// ------------------------------------------------------------------------------------------- loads and statics
/** FAR 23.499 nose-wheel loads at the forward-CG gross case, limit: V = 2.25 × static; (a) aft D = 0.8 V; (b) forward
 *  0.4 V; (c) side 0.7 V (ASSUMED reading); all at the ground contact */
export function noseLoads(d) {
  const wc = WEIGHT_CASES.find((w) => w.id === 'W2'), ac = aircraft(d, wc), sM = GEO.gear.s, sN = axleAt(NG.phi0)[0];
  const stat = ac.W * (sM - ac.cg) / (sM - sN), V = 2.25 * stat, D = 0.8 * V;
  return { stat, V, D, F: 0.4 * V, S: 0.7 * V, W: ac.W, cg: ac.cg, sN };
}
export const cross2 = (r, F) => r[0] * F[1] - r[1] * F[0];          // (s,z) moment, + = strut rotating aft (retract)
const G0 = () => { const a = axleAt(NG.phi0); return [a[0], a[2] - NG.R]; };   // ground contact, gear down (s, z)
/** moment about the hinge from a ground-contact force (Fs aft +, Fz up +), gear down, lb·ft */
export function hingeMoment(Fs, Fz) { const g = G0(); return cross2([g[0] - NG.O[0], g[1] - NG.O[2]], [Fs, Fz]); }
/** link compression (lb) that balances hinge moment M (lb·ft) at the down lock */
export function linkForce(M, phi = NG.phi0, al = KIN.ad) { const C = C_at(phi), B = B_at(al), e = [C[0] - B[0], C[2] - B[2]], L = Math.hypot(...e), u = [e[0] / L, e[1] / L], rC = [C[0] - NG.O[0], C[2] - NG.O[2]]; return M / -cross2(rC, u); }
export const linkDir = () => { const C = C_at(NG.phi0), B = B_at(KIN.ad), e = [C[0] - B[0], C[2] - B[2]], L = Math.hypot(...e); return [e[0] / L, e[1] / L]; };
export function column(P, od, w, L, E, Fcy) {
  const ro = od / 2, ri = Math.max(0, ro - w), A = Math.PI * (ro * ro - ri * ri), rho = Math.sqrt((ro * ro + ri * ri) / 4), sl = L / rho, slc = Math.sqrt(2 * Math.PI ** 2 * E / Fcy);
  const scr = sl < slc ? Fcy - (Fcy ** 2 / (4 * Math.PI ** 2 * E)) * sl * sl : Math.PI ** 2 * E / (sl * sl);
  return { Pa: scr * A, A, mode: `${sl < slc ? 'Johnson' : 'Euler'} column, L/ρ ${sl.toFixed(0)}` };
}
/** limit load cases on the strut: ground force (s, z) and side; link force and hinge reaction follow */
export function cases(n) {
  const out = [];
  for (const [id, Fs, Fz, S] of [['aft (23.499a)', n.D, n.V, 0], ['forward (23.499b)', -n.F, n.V, 0], ['side (23.499c)', 0, n.V, n.S]]) {
    const M = hingeMoment(Fs, Fz), P = linkForce(M), u = linkDir(), RO = [-(Fs + P * u[0]), -(Fz + P * u[1])];
    out.push({ id, Fs, Fz, S, M, P, RO });
  }
  return out;
}

// ------------------------------------------------------------------------------------------- strut
const IN = 12, U_END = NG.Ls;                        // hinge → fork head, ft
const CH = 0.12;                                     // corner chamfer (in): section-modulus factor below
const kZ = (t, b) => { // chamfered-rectangle section modulus factor vs a sharp rectangle (numerical, about the t axis)
  let I = 0, I0 = 0; const n = 60; for (let i = 0; i < n; i++) { const z = -t / 2 + (i + 0.5) * t / n, dz = t / n, e = Math.max(0, Math.abs(z) - (t / 2 - CH)), w = b - 2 * e; I += w * z * z * dz; I0 += b * z * z * dz; } return I / I0; };
/** moments along the strut (in·lb, limit) for every case: fore-aft bending (pinned at the hinge, held at NG-3) and lateral */
export function strutMoments(n, u) {
  const X = strutPt(NG.phi0, u), g = G0(), c = NG.c;
  let Mfa = 0, Mlat = 0, Nax = 0;
  for (const k of cases(n)) {
    const F = [k.Fs, k.Fz];
    const m = u >= c ? cross2([g[0] - X[0], g[1] - X[2]], F) : cross2([NG.O[0] - X[0], NG.O[2] - X[2]], k.RO);
    Mfa = Math.max(Mfa, Math.abs(m) * IN);
    Mlat = Math.max(Mlat, k.S * (X[2] - g[1]) * IN);
    Nax = Math.max(Nax, Math.abs(k.Fz * Math.cos(NG.phi0 * d2r) - k.Fs * Math.sin(NG.phi0 * d2r)));
  }
  return { Mfa, Mlat, Nax };
}
/** utilisation of a section (t fore-aft, b lateral, in) at station u, ultimate */
function strutUtil(n, u, t, b, FS) {
  const { Mfa, Mlat, Nax } = strutMoments(n, u), k = kZ(t, b), A = b * t - 2 * CH * CH;
  const sFa = FS * (6 * Mfa / (k * b * t * t) + Nax / A), sLat = FS * (6 * Mlat / (k * t * b * b) + Nax / A);
  return { u: Math.max(sFa, sLat) / MAT.sglass.F, sFa, sLat, Mfa, Mlat, Nax };
}
/** tip deflection fore-aft under the limit aft load (in): rigid at NG-3, plus the hinge–NG-3 span's end rotation */
function strutDefl(n, prof) {
  const E = MAT.sglass.E, I = (u) => { const { t, b } = profAt(prof, u); return kZ(t, b) * b * t ** 3 / 12; }, c = NG.c, L = U_END + NG.drop, N = 40;
  const k = cases(n)[0], g = G0(), F = [k.Fs, k.Fz];
  let d = 0; for (let i = 0; i < N; i++) { const u = c + (L - c) * (i + 0.5) / N, X = strutPt(NG.phi0, Math.min(u, U_END)), M = Math.abs(cross2([g[0] - X[0], g[1] - X[2]], F)) * IN; d += M * (L - u) * IN / (E * I(Math.min(u, U_END))) * (L - c) / N * IN; }
  const Xc = strutPt(NG.phi0, c), Mc = Math.abs(cross2([g[0] - Xc[0], g[1] - Xc[2]], F)) * IN, th = Mc * c * IN / (3 * E * I(c / 2));
  return d + th * (L - c) * IN;
}
export const profAt = (prof, u) => { const p = prof; if (u <= p[0].u) return p[0]; for (let i = 1; i < p.length; i++) if (u <= p[i].u) { const f = (u - p[i - 1].u) / (p[i].u - p[i - 1].u); return { u, t: p[i - 1].t + (p[i].t - p[i - 1].t) * f, b: p[i - 1].b + (p[i].b - p[i - 1].b) * f }; } return p.at(-1); };
const strutMass = (prof) => { let m = 0; for (let i = 1; i < prof.length; i++) { const a = prof[i - 1], b = prof[i], L = (b.u - a.u) * IN; m += L * ((a.t * a.b + b.t * b.b) / 2 - 2 * CH * CH) * MAT.sglass.rho; } return m * 1.05; };   // 5 % resin-rich surface
export function strutEval(n, prof, FS) { let worst = { u: 0 }; for (const p of prof) { const r = strutUtil(n, p.u, p.t, p.b, FS); if (r.u > worst.u) worst = { ...r, at: p.u }; } return { mass: strutMass(prof), ms: 1 / worst.u - 1, at: worst.at, defl: strutDefl(n, prof), worst }; }
const STATIONS = (() => { const s = [0.045, 0.12, 0.30, NG.c - 0.10, NG.c, NG.c + 0.12, 0.85, 1.10, 1.35, 1.60, U_END]; return s.filter((u) => u <= U_END + 1e-9); })();
const MIN_T = (u) => (u > U_END - 0.15 ? 0.80 : u < 0.15 ? 1.0 : 0.70), MIN_B = (u) => (u > U_END - 0.15 ? 0.90 : u < 0.15 ? 1.0 : 0.80);   // fork-head clamp, hinge clamp, handling
export const DEFL_MAX = 3.0;                                // in, tyre fore-aft at limit aft load (ASSUMED: a spring strut, but stiff enough to keep shimmy and cover rub away)

/** lateral room for a fork leg: tyre face + 0.07 in to the door torque tube − 0.20 in (ngear-door-clear asks 0.15) */
export const LEG_ENV = (() => { const inner = NG.tyreW / 2 * IN + 0.07, outer = (DOOR.hingeY - DOOR.tubeR) * IN - 0.20; return { inner, outer, w: outer - inner }; })();
const ovalSec = (h, b, w) => { const a = h / 2, c = b / 2, ai = a - w, ci = c - w, A = Math.PI * (a * c - ai * ci), Ifa = Math.PI / 4 * (a ** 3 * c - ai ** 3 * ci), Ilat = Math.PI / 4 * (c ** 3 * a - ci ** 3 * ai); return { A, Zfa: Ifa / a, Zlat: Ilat / c }; };
export function legSizing(n, FS, sec = null) {
  const Lleg = NG.drop * IN - NG.crownIn, R = NG.R * IN, span = 2 * (LEG_ENV.inner + LEG_ENV.w / 2);
  const Mfa = n.D / 2 * Lleg, Mlat = n.S / 2 * Lleg / 2, Pleg = n.V / 2 + n.S * R / span;
  const ev = (h, b, w, kind = 'oval') => { const q = kind === 'bar' ? { A: h * b, Zfa: b * h * h / 6, Zlat: h * b * b / 6 } : ovalSec(h, b, w), s = FS * (Mfa / q.Zfa + Mlat / q.Zlat + Pleg / q.A);
    return { h, b, w, kind, ...q, s, ms: 80000 / s - 1, mass: 2 * (Lleg + 0.5) * q.A * MAT.c4130.rho }; };
  const ENV = LEG_ENV.w, cand = [];
  for (const h of [0.75, 0.875, 1.0, 1.125, 1.25, 1.375, 1.5, 1.625, 1.75, 2.0]) for (const b of [0.25, 0.28, 0.31, 0.34]) for (const w of [0.049, 0.058, 0.065, 0.083, 0.095]) if (b <= ENV + 1e-9 && 2 * w < b - 0.08) cand.push(ev(h, b, w));
  const legPick = sec ? ev(sec.h, sec.b, sec.w) : cand.filter((r) => r.ms >= TGT).sort((x, y) => x.mass - y.mass)[0];
  const legBlock = ev(0.60, 0.30, 0, 'bar'), cantS = FS * (Math.hypot(Mfa, n.S * (Lleg + R) / 2) / (0.6 * 0.09 / 6) + Pleg / 0.18); legBlock.ms = 80000 / cantS - 1;
  const rq = { A: Math.PI * (0.4375 ** 2 - 0.3885 ** 2), Z: Math.PI * (0.4375 ** 4 - 0.3885 ** 4) / (4 * 0.4375) }, rs = FS * (Mfa / rq.Z + Mlat / rq.Z + Pleg / rq.A);
  return { Lleg, Mfa, Mlat, Pleg, ENV, legs: cand, legPick, legBlock, round: { b: 0.875, ms: 80000 / rs - 1, mass: 2 * (Lleg + 0.5) * rq.A * MAT.c4130.rho } };
}

// ------------------------------------------------------------------------------------------- the iteration
export function sizeNoseGear(d = DEFAULT_DESIGN) {
  const n = noseLoads(d), FS = d.FS, CS = cases(n), allow = (F) => F / (1 + TGT), log = [];
  const pmax = Math.max(...CS.map((k) => Math.abs(k.P))), Ro = Math.max(...CS.map((k) => Math.hypot(...k.RO)));
  // ---- strut
  const lin = (r, t) => STATIONS.map((u) => { const f = Math.min(1, Math.max(0, u / U_END)); return { u, t: r[0] + (t[0] - r[0]) * f, b: r[1] + (t[1] - r[1]) * f }; });
  const S0 = lin([1.25, 1.25], [1.0, 1.0]), e0 = strutEval(n, S0, FS);
  const strutLog = [{ it: 1, desc: 'Block model: linear taper 1.25 × 1.25 → 1.00 × 1.00 in', ...e0 }];
  // 2: fully stressed fore-aft only, constant width
  const S1 = STATIONS.map((u) => { let t = 0.4; while (strutUtil(n, u, t, 1.25, FS).u * (1 + TGT) > 1 && t < 2.5) t += 0.01; return { u, t: Math.max(t, MIN_T(u)), b: 1.25 }; });
  strutLog.push({ it: 2, desc: 'Fully stressed fore-aft, constant 1.25 in width', ...strutEval(n, S1, FS) });
  // 3: fully stressed in both planes: least area meeting both bending checks and the minimum gauges
  const S2 = STATIONS.map((u) => { let best = null; for (let b = MIN_B(u); b <= 1.8; b += 0.01) for (let t = MIN_T(u); t <= 1.8; t += 0.01) { if (strutUtil(n, u, t, b, FS).u * (1 + TGT) <= 1) { if (!best || b * t < best.b * best.t) best = { u, t, b }; break; } } return best || { u, t: 1.8, b: 1.8 }; });
  strutLog.push({ it: 3, desc: 'Fully stressed in both planes (least area per station), minimum gauges', ...strutEval(n, S2, FS) });
  // 4: stiffness — thicken the cantilever (NG-3 → tip) until the tip deflection meets the limit; smooth the taper
  let S3 = S2.map((p) => ({ ...p })), k = 0;
  while (strutDefl(n, S3) > DEFL_MAX && k++ < 200) S3 = S3.map((p) => (p.u >= NG.c - 0.1 ? { ...p, t: p.t + 0.01 } : p));
  for (let i = 1; i < S3.length - 1; i++) { S3[i].t = Math.max(S3[i].t, Math.min(S3[i - 1].t, S3[i + 1].t)); S3[i].b = Math.max(S3[i].b, Math.min(S3[i - 1].b, S3[i + 1].b)); }   // no waists
  S3 = S3.map((p) => ({ u: p.u, t: Math.ceil(p.t * 32) / 32, b: Math.ceil(p.b * 32) / 32 }));   // round up to 1/32 in for the mould
  const e3 = strutEval(n, S3, FS);
  strutLog.push({ it: 4, desc: `+ stiffness (tip ≤ ${DEFL_MAX} in at limit), no waists, 1/32 in mould steps`, ...e3 });
  log.push(...strutLog.map((r) => ({ member: 'NG-1 strut', ...r })));

  // ---- fork legs: must fit between the tyre and the door torque tube (lateral envelope); flattened (oval) 4130 tube,
  //      deep fore-aft for the drag load. Side load by portal frame: crown and clamped axle make the legs a fixed-fixed
  //      frame (M = S/2·L/2 at each end), and the side force's moment about the axle (S·R) is a push-pull couple across the legs.
  const legs_ = legSizing(n, FS);
  const { Lleg, Mfa, Mlat, Pleg, legPick, legBlock, legs, ENV } = legs_, R = NG.R * IN, Mleg = Math.hypot(Mfa, Mlat);
  log.push({ member: 'Fork legs', it: 1, desc: 'Block model: flat bar 0.60 × 0.30 in, cantilever side load', mass: legBlock.mass, ms: legBlock.ms },
    { member: 'Fork legs', it: 2, desc: `Round 0.875 × 0.049 tube (lightest round at +${TGT * 100} %): ${(legs_.round.b).toFixed(3)} in wide, does not fit the ${ENV.toFixed(2)} in envelope`, mass: legs_.round.mass, ms: legs_.round.ms },
    { member: 'Fork legs', it: 3, desc: `Lightest oval tube in the envelope at ≥ +${TGT * 100} %, 0.049 in minimum wall for welding (portal-frame side load): ${legPick.h} × ${legPick.b} × ${legPick.w} in`, mass: legPick.mass, ms: legPick.ms });

  // ---- spring link: rod (pin to pin, conservatively) and AN bolts in double shear
  const Lin = KIN.l * IN, RODS = [[0.375, 0.1875, 'solid'], [0.4375, 0.21875, 'solid'], [0.5, 0.25, 'solid'], [0.5, 0.065, 'tube'], [0.5, 0.083, 'tube'], [0.625, 0.058, 'tube'], [0.625, 0.065, 'tube'], [0.75, 0.049, 'tube']];
  const rodEval = ([od, w, kind]) => { const c = column(pmax, od, w, Lin, MAT.c4130.E, MAT.c4130.Fty); return { od, w, kind, ...c, ms: c.Pa / (FS * pmax) - 1, mass: c.A * Lin * MAT.c4130.rho }; };
  const rods = RODS.map(rodEval), rodPick = rods.filter((r) => r.ms >= TGT).sort((a, b) => a.mass - b.mass)[0], rodBlock = rodEval([0.5, 0.25, 'solid']);
  const BOLTS = [3, 4, 5, 6], bolt = (P) => BOLTS.find((k) => 2 * AN_SHEAR[k] / (FS * P) - 1 >= TGT) || 6;
  const linkBolt = bolt(pmax);
  log.push({ member: 'Spring-link rod', it: 1, desc: 'Block model: 1/2 in solid 4130', mass: rodBlock.mass, ms: rodBlock.ms }, { member: 'Spring-link rod', it: 2, desc: `Lightest column at ≥ +${TGT * 100} %: ${rodPick.od} in ${rodPick.kind}${rodPick.kind === 'tube' ? ` × ${rodPick.w}` : ''}; AN${linkBolt} pins`, mass: rodPick.mass, ms: rodPick.ms });

  // ---- NG-64 crank arm: link load 3° off its line at the stop (+1° rigging tolerance): axial + bending
  const r_ = NG.r * IN, ecc = Math.sin((NG.beta + 1) * d2r), ARMS = [[1.0, 0.25], [0.875, 0.3125], [0.875, 0.25], [0.75, 0.3125], [0.75, 0.25], [0.625, 0.25], [0.5, 0.25], [0.75, 0.1875], [0.625, 0.1875], [0.5, 0.1875], [0.75, 0.125], [0.625, 0.125]];
  const armEval = ([w, t]) => { const A = w * t, Z = t * w * w / 6, s = FS * (pmax / A + pmax * r_ * ecc / Z); return { w, t, s, ms: 80000 / s - 1, mass: (r_ + 0.8) * A * MAT.c4130.rho }; };
  const arms = ARMS.map(armEval), armPick = arms.filter((r) => r.ms >= TGT).sort((a, b) => a.mass - b.mass)[0], armBlock = (() => { const d_ = 0.48, A = Math.PI * d_ * d_ / 4, Z = Math.PI * d_ ** 3 / 32, s = FS * (pmax / A + pmax * r_ * ecc / Z); return { s, ms: 80000 / s - 1, mass: (r_ + 0.8) * A * MAT.c4130.rho }; })();
  log.push({ member: 'NG-64 crank arm', it: 1, desc: 'Block model: 0.48 in round bar', mass: armBlock.mass, ms: armBlock.ms }, { member: 'NG-64 crank arm', it: 2, desc: `Lightest bar at ≥ +${TGT * 100} %: ${armPick.w} × ${armPick.t} in 4130`, mass: armPick.mass, ms: armPick.ms });

  // ---- NG-3 clevis ears: bearing of the link pin, two ears
  const dPin = linkBolt / 16, EARS = [0.063, 0.071, 0.080, 0.090, 0.100, 0.125], earEval = (t) => { const s = FS * pmax / (2 * dPin * t); return { t, s, ms: MAT.c4130.Fbru / s - 1, mass: 2 * t * 1.1 * 1.6 * MAT.c4130.rho + 0.12 }; };
  const ears = EARS.map(earEval), earPick = ears.filter((r) => r.ms >= TGT).sort((a, b) => a.mass - b.mass)[0];
  log.push({ member: 'NG-3 clevis ears', it: 1, desc: 'Block model: solid bracket', mass: 0.5, ms: earEval(0.125).ms }, { member: 'NG-3 clevis ears', it: 2, desc: `Lightest 4130 sheet at ≥ +${TGT * 100} % in pin bearing: ${earPick.t} in`, mass: earPick.mass, ms: earPick.ms });

  // ---- hinge bolt: double shear through the NG-6 bushings; bearing on the NG-8 discs (two, 1/4 in 6061)
  const hk = bolt(Ro), hd = hk / 16, hingeMs = Math.min(2 * AN_SHEAR[hk] / (FS * Ro), 2 * hd * 0.25 * MAT.a6061.Fbru / (FS * Ro)) - 1;
  log.push({ member: 'Hinge bolt', it: 1, desc: 'Block model: AN5', mass: 0.03, ms: Math.min(2 * AN_SHEAR[5] / (FS * Ro), 2 * 0.3125 * 0.25 * MAT.a6061.Fbru / (FS * Ro)) - 1 }, { member: 'Hinge bolt', it: 2, desc: `Smallest AN bolt at ≥ +${TGT * 100} % (shear, disc bearing): AN${hk}`, mass: 0.02 + 0.004 * hk, ms: hingeMs });

  // ---- NG-6 casting: block vs pocketed (bushing bosses + clamp walls kept; centre pocketed), bearing-checked
  const ng6 = [{ desc: 'Block model: solid 6061 clamp block', mass: 0.60 }, { desc: 'Pocketed: 0.15 in clamp walls, 0.25 in bushing bosses, centre relieved', mass: 0.34 }];
  const ng6ms = 2 * 0.25 * hd * MAT.a6061.Fbru / (FS * Ro) - 1;
  log.push({ member: 'NG-6 hinge casting', it: 1, ...ng6[0], ms: ng6ms }, { member: 'NG-6 hinge casting', it: 2, ...ng6[1], ms: ng6ms });

  // ---- axle: 5/8 in, set by the wheel bearings (not a sizing variable): shear check only
  const Raxle = Math.hypot(n.V, n.D, n.S), axleMs = 2 * AN_SHEAR[10] / (FS * Raxle) - 1;

  const pick = { strut: S3, strutEval: e3, leg: legPick, rod: rodPick, linkBolt, arm: armPick, ear: earPick, hingeBolt: hk, hingeMs, ng6: ng6[1], ng6ms, axleMs, Lleg, FY: (LEG_ENV.inner + legPick.b / 2) / IN, n, CS, pmax, Ro, Mleg };
  const block = { strut: e0.mass, fork: legBlock.mass + 0.9, rod: rodBlock.mass + 0.35, arm: armBlock.mass + 0.1, ng3: 0.5, ng6: 0.6 };
  const final = { strut: e3.mass, fork: legPick.mass + 0.55, rod: rodPick.mass + 0.30, arm: armPick.mass + 0.10, ng3: earPick.mass + 0.12, ng6: ng6[1].mass };
  const tot = (o) => Object.values(o).reduce((a, v) => a + v, 0);
  const msBlock = Math.min(e0.ms, legBlock.ms, rodBlock.ms, armBlock.ms), msFinal = Math.min(e3.ms, legPick.ms, rodPick.ms, armPick.ms, earPick.ms, hingeMs, ng6ms);
  const summary = [{ it: 1, desc: 'Block model (as first drawn)', mass: tot(block), ms: msBlock }, { it: 2, desc: 'Every member at its lightest standard size or fully stressed taper, ≥ +15 % reserve, minimum gauges, strut stiffness', mass: tot(final), ms: msFinal }];
  return { pick, log, summary, masses: final, block };
}
export const SIZING = sizeNoseGear();

/** margins of the chosen design for any design state d (the checks call this; loads follow the current mass model) */
export function memberMargins(d, pick = SIZING.pick) {
  const n = noseLoads(d), FS = d.FS, CS = cases(n), pmax = Math.max(...CS.map((k) => Math.abs(k.P))), Ro = Math.max(...CS.map((k) => Math.hypot(...k.RO)));
  const st = strutEval(n, pick.strut, FS);
  const L_ = legSizing(n, FS, pick.leg), lg = L_.legPick;
  const Lin = KIN.l * 12, col = column(pmax, pick.rod.od, pick.rod.w, Lin, MAT.c4130.E, MAT.c4130.Fty), boltL = 2 * AN_SHEAR[pick.linkBolt];
  const ecc = Math.sin((NG.beta + 1) * d2r), aA = pick.arm.w * pick.arm.t, aZ = pick.arm.t * pick.arm.w ** 2 / 6, armS = FS * (pmax / aA + pmax * NG.r * 12 * ecc / aZ);
  const dPin = pick.linkBolt / 16, earS = FS * pmax / (2 * dPin * pick.ear.t);
  const hd = pick.hingeBolt / 16, hShear = 2 * AN_SHEAR[pick.hingeBolt], hBear = 2 * hd * 0.25 * MAT.a6061.Fbru;
  const Raxle = Math.hypot(n.V, n.D, n.S);
  return { n, FS, CS, pmax, Ro, strut: st, defl: st.defl, deflMax: DEFL_MAX,
    leg: { ms: lg.ms, s: lg.s, Mfa: L_.Mfa, Mlat: L_.Mlat, Pleg: L_.Pleg, Lleg: L_.Lleg, env: L_.ENV },
    link: { ms: Math.min(col.Pa, boltL) / (FS * pmax) - 1, col, boltL },
    arm: { ms: 80000 / armS - 1, s: armS, ecc },
    ear: { ms: MAT.c4130.Fbru / earS - 1, s: earS },
    hinge: { ms: Math.min(hShear, hBear) / (FS * Ro) - 1, shear: hShear, bear: hBear },
    axle: { ms: 2 * AN_SHEAR[10] / (FS * Raxle) - 1, R: Raxle } };
}
