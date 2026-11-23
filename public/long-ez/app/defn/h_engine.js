// LEZ-71-210 rev B (block H, coordinator decision 2): the minimal revision of block G's engine record. Block G's record
// object is revised in place (the record, its DEFS entry, its solid file and its sheet stay block G's); the envelope
// corrections and the added features come from parts/wpH1_layout.js through the ENGINE_FEATURES hook in
// wpG1_engine.js `enginePrims()`. Notional; positions approximate and typed from memory, marked.
import { ENG_DEF, engParams } from './g_engine.js';
import { enginePrims } from '../parts/wpG1_engine.js';
import * as R from '../parts/wpH0_route.js';
import * as LY from '../parts/wpH1_layout.js';
import { engineInterfacesB, IFACE_TOL } from '../parts/wpH3_checks.js';
import { fx, DATE } from './h_common.js';

const tubeClear = () => { const M = R.OBST.mount(); let w = { d: Infinity }; for (const p of enginePrims()) { if (p.feat === 'lugs') continue; const c = p.t === 'cyl' ? R.clearTo([p.a, p.b], p.r, M) : { d: Math.min(...M.map((m) => R.clearTo([m.a, m.b], m.r, [p]).d)), at: M[0].feat }; if (c.d < w.d) w = { d: c.d, feat: p.feat, at: c.at }; } return w; };
ENG_DEF.rev = 'B';
ENG_DEF.revs = [...ENG_DEF.revs.filter((r) => r.rev !== 'B'), { rev: 'B', date: DATE, short: 'Arms, caps, terminals, bosses (block H)', change: `Block H's minimal revision (coordinator decision 2): throttle and mixture arms on the carburettor's left side, the magnetos' harness caps and P-lead terminal posts, the tach drive pick-up pad, the oil-pressure boss, the engine-driven fuel pump envelope, the MAP boss on the sump's right side and the case ground stud E1 (block G's G-O6; block I lands the strap) added as features; the magnetos 1.0 in lower and 0.3 in inboard and the accessory housing ${LY.REVB.accH} in high and ${LY.REVB.accW} in wide (was 9.6 × 9.6) so every feature stands ≥ 0.5 in from every mount tube (G-O2). eng-iface now measures against this solid (H-F15). All positions approximate, typed from memory: the Lycoming installation drawing governs.` }];
ENG_DEF.params = engParams();
const have = new Set(ENG_DEF.features.map((f) => f.id));
for (const f of [
  { id: 'carb', kind: 'lever', label: `Carburettor (MA-3A) with the throttle arm (R ${LY.CARB_ARMS.throttle.r} in, ${LY.CARB_ARMS.throttle.travel}°, BL ${LY.CARB_ARMS.throttle.bl}) and the mixture arm (R ${LY.CARB_ARMS.mixture.r} in, ${LY.CARB_ARMS.mixture.travel}°, BL ${LY.CARB_ARMS.mixture.bl}) on its left side; Ø 0.19 rod-end holes (typed from memory)`, tol: 'Approximate: verify on the carburettor' },
  { id: 'acc', kind: 'envelope', label: `Accessory housing ${LY.REVB.accH} in high; tach drive pad with the Hall pick-up, oil-pressure boss (AN816-3D), engine-driven fuel pump (block F's FP-IN / FP-OUT)`, tol: 'Approximate' },
  { id: 'ground', kind: 'boss', label: 'Case ground stud E1, 1/4-28, on the accessory housing top (typed from memory; block I)', tol: 'Approximate' },
]) if (!have.has(f.id)) ENG_DEF.features.push(f);
{ const m = ENG_DEF.features.find((f) => f.id === 'mag'); if (m && !/harness cap/.test(m.label)) m.label += `; magnetos (engine-left = aircraft right, impulse coupling; rev B 1.0 in lower) with harness caps on top and P-lead terminal posts outboard`; }
for (const i of [
  { id: 'I4', with: 'LEZ-71-220 mount tubes (block G, G-O2)', feature: 'acc', what: 'Every envelope feature ≥ 0.5 in from every mount tube; housing ≤ 8.64 in high', check: () => { const w = tubeClear(); return { ok: w.d >= 0.5 && LY.REVB.accH <= 8.64, detail: `${fx(w.d)} in (${w.feat} to ${w.at}); housing ${LY.REVB.accH} in` }; } },
  { id: 'I5', with: 'Block H runs and block F / I ports', feature: 'carb', what: `Every interface point on the solid within ${IFACE_TOL} in (eng-iface)`, check: () => { const E = engineInterfacesB(); return { ok: E.worst.d <= IFACE_TOL, detail: `${E.rows.length} points, worst ${fx(E.worst.d)} in (${E.worst.what})` }; } },
]) { const k = ENG_DEF.interfaces.findIndex((q) => q.id === i.id); if (k >= 0) ENG_DEF.interfaces[k] = i; else ENG_DEF.interfaces.push(i); }
ENG_DEF.drawingNotes = [...ENG_DEF.drawingNotes.filter((n) => !/rev B/.test(n)), 'Rev B features (arms, caps, terminals, pads, bosses, ground stud) are approximate positions for the installation: verify each against the Lycoming installation drawing and the accessory makers\' data before brackets are made.'];
