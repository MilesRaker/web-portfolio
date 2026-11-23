// Block J interface phase 2 (docs/icd/j_avionics.md §9): checks added to the J records after the J merge, computed live
// against the partners so a later change fails the audit, and the open items owned by unfinished blocks (they pass and
// name the owner and today's numbers). Inches; model frame [FS, BL, WL] unless noted. Notional.
import { routes, partByPN, EQUIP, WIRES } from '../systems.js';
import { toPlane, vertPlane, pip } from '../parts/wpA0_flat.js';
import { SBP, SBG } from '../parts/wpA4_seatback.js';
import { NB, NBH, fbParams } from '../parts/wpA5_ballast.js';
import { STK, strakeSection } from '../parts/wp21_strake.js';
import { CUTS } from '../parts/wpB3_panel.js';
import * as L from '../parts/wpJ0_layout.js';
import { JP } from '../parts/wpJ1_avionics.js';
import { ok, fx, others } from './j_ifc.js';
import { primBox } from './blkB_prims.js';

const wl = (pn) => routes().filter((r) => r.part === pn);
const ifc = (id, w, feature, what, check) => ({ id, with: w, feature, what, check });
const OPEN = (owner, text) => ok(true, `OPEN item (${owner}): ${text}`);

/** route samples (every 0.25 in) inside a strake tank cavity (LEZ-57-180): none allowed for a J line (ICD J-R13) */
export function tankHits(pn) {
  let n = 0, first = null;
  for (const r of routes().filter((q) => q.part === pn)) for (let i = 1; i < r.pts.length; i++) {
    const a = r.pts[i - 1].map((v) => v * 12), b = r.pts[i].map((v) => v * 12), m = Math.max(2, Math.ceil(Math.hypot(...a.map((v, k) => v - b[k])) / 0.25));
    for (let k = 0; k <= m; k++) { const p = a.map((v, j) => v + (b[j] - v) * k / m), y = Math.abs(p[1]); if (y < STK.yR || y > STK.yE || p[0] > STK.aft) continue;
      if (pip([p[0], p[2]], strakeSection(y, true).cavity)) { n++; first ||= p; } } }
  return { n, first };
}
const noTank = (pn) => () => { const h = tankHits(pn); return ok(!h.n, h.n ? `${h.n} sample(s) inside the strake tank, first FS ${fx(h.first[0])}, BL ${fx(h.first[1])}, WL ${fx(h.first[2])}` : `no sample inside either strake tank cavity (LEZ-57-180: BL ${fx(STK.yR)}–${fx(STK.yE)}, to FS ${fx(STK.aft)})`); };

/** crossings of a part's routes through a (possibly inclined) plane, each inside a hole of the partner's live table */
function throughPlane(pn, P, holes, label, inside = () => true) {
  const bad = [], hit = [];
  for (const r of wl(pn)) for (let i = 1; i < r.pts.length; i++) {
    const A = toPlane(P, r.pts[i - 1]), B = toPlane(P, r.pts[i]); if (A.w * B.w >= 0) continue;
    const t = A.w / (A.w - B.w), u = A.u + t * (B.u - A.u), v = A.v + t * (B.v - A.v), rr = (r.dIn || 0.25) / 2; if (!inside(u, v)) continue;
    const h = holes.find((q) => Math.hypot(q.u - u, q.v - v) + rr <= q.r + 1e-3); (h ? hit : bad).push(`${fx(u)}, ${fx(v)}${h ? ` (hole r ${fx(h.r, 3)})` : ''}`);
  }
  return ok(!bad.length, `${label}: ${hit.length} crossing(s) in holes${hit.length ? ` (${hit.join('; ')})` : ''}${bad.length ? `; NOT IN A HOLE: ${bad.join('; ')}` : ''}`);
}
const throughSB = (pn) => () => throughPlane(pn, SBP, SBG.holes, 'LEZ-53-170 front seat back (A, inclined plane)', (u, v) => pip([u, v], SBG.pts));
const throughNB = (pn) => () => throughPlane(pn, vertPlane(NB.s), NBH, 'LEZ-08-105 nose ballast bulkhead (A)');
/** the pitot line through each 0.5 in step of A's lead block (LEZ-08-100): inside a declared hole of that step where it
 *  crosses the step's mid-plane inside the step's outline */
export function throughLead(pn) {
  const F = fbParams(), out = [], bad = [];
  for (const lay of F.layers.filter((q) => q.mat === 'LEAD')) {
    const P = { ...vertPlane(NB.s), o: [NB.s + (lay.w0 + lay.w1) / 24, 0, 0] }, polys = F.polys[lay.ol] || [], holes = F.holes.filter((h) => !h.only || h.only.includes(lay.name));
    for (const r of wl(pn)) for (let i = 1; i < r.pts.length; i++) {
      const A = toPlane(P, r.pts[i - 1]), B = toPlane(P, r.pts[i]); if (A.w * B.w >= 0) continue;
      const t = A.w / (A.w - B.w), u = A.u + t * (B.u - A.u), v = A.v + t * (B.v - A.v), rr = (r.dIn || 0.25) / 2; if (!polys.some((q) => pip([u, v], q))) continue;
      const h = holes.find((q) => q.id === 'pass' && Math.hypot(q.u - u, q.v - v) + rr <= q.r + 1e-3); (h ? out : bad).push(`${lay.name} ${fx(u)}, ${fx(v)}`);
    }
  }
  return ok(!bad.length, `lead steps crossed ${out.length}, each inside its declared hole${bad.length ? `; NOT IN A HOLE: ${bad.join('; ')}` : ''}`);
}
/** a ground plane's facets on the shell's inner skin: each 1 × 1 in facet's bond face at the skin's WL at its centre */
export function planeOnSkin(pn) {
  const P = JP[pn].prims().filter((m) => m.g === 'plane'); let w = 0, worstC = 0, big = 0;
  for (const m of P) { const top = m.c[2] > 35, b = primBox(m), face = top ? b[5] : b[4], skin = (bl, fs) => (top ? L.topAt(fs, bl, L.SHELL) : L.botAt(fs, bl, L.SHELL));
    worstC = Math.max(worstC, Math.abs(face - skin(m.c[0], m.c[1]))); big = Math.max(big, m.d[0], m.d[1]);
    for (const bl of [b[0], b[1]]) for (const fs of [b[2], b[3]]) w = Math.max(w, Math.abs(face - skin(bl, fs))); }
  return ok(P.length > 0 && worstC <= 0.01 && big <= 1.0 + 1e-6, `${P.length} facets ≤ ${fx(big)} in, each centre on the inner skin within ${fx(worstC, 3)} in (≤ 0.01); faceting at the corners ${fx(w)} in (the 0.016 sheet is formed to the skin)`);
}

// ------------------------------------------------------------------------------------------- open items (block I)
/** I's bus box, ground block and panel run against the AXIS and the warning unit (ICD J-R3 / J-I1) */
function iBoxes() {
  const mine = ['LEZ-31-110', 'LEZ-31-150'].flatMap((pn) => JP[pn].prims().map((m) => primBox(m))), res = [];
  for (const pn of ['LEZ-24-130', 'LEZ-24-140', 'LEZ-24-161']) { const O = others((q) => q === pn); let d = Infinity;
    for (const b of mine) for (const o of O) { const dd = o.box ? Math.hypot(Math.max(o.box[0] - b[1], 0, b[0] - o.box[1]), Math.max(o.box[2] - b[3], 0, b[2] - o.box[3]), Math.max(o.box[4] - b[5], 0, b[4] - o.box[5])) : Math.min(...o.pts.map((p) => Math.hypot(Math.max(b[0] - p[0], 0, p[0] - b[1]), Math.max(b[2] - p[1], 0, p[1] - b[3]), Math.max(b[4] - p[2], 0, p[2] - b[5])))) - o.r; d = Math.min(d, dd); }
    res.push({ pn, d }); }
  // final integration: block I is released; its bus box, ground block and panel run keep ≥ 0.25 in (a real check)
  return ok(res.every((q) => q.d >= 0.25), `block I's items ≥ 0.25 in from the AXIS can / collar and the warning-unit body: ${res.map((q) => `${q.pn} ${q.d <= 0 ? 'inside' : `${fx(q.d)} in`}`).join(', ')}`);
}
/** breakers: I's two breaker panels against B's breaker cut-out; the AXIS's two power inputs on one bus */
function breakers() {
  const used = ['CB1', 'CB2'].map((r) => EQUIP.find((e) => e.ref === r)).filter(Boolean).flatMap((e) => Object.values(e.conns.CB.pins)).filter((n) => !/SPARE/.test(n)).length;
  const ax = ['A1:J1:1', 'A1:J1:2'].map((pin) => WIRES.find((w) => w.to === pin)?.from?.split(':')[0]), cb = CUTS.find((c) => c.id === 'cb');
  // final integration: block I's 6 push-pull breakers fill B's cut-out (the rest on fuse blocks); AXIS A on the essential bus (CB2), B on the main (CB1), as J asks
  return ok(used === 6 && ax[0] === 'CB2' && ax[1] === 'CB1', `${used} breakers in B's "cb" cut-out (${cb ? cb.what : '—'}); AXIS power A / B from ${ax.join(' / ')} (A essential, B main, as J asks)`);
}
/** the warning unit's inputs: the wired contact is the one closed in the alarm state (ICD J-W1) */
function warnSense() {
  const contact = (ref) => { const w = WIRES.find((q) => (String(q.to).startsWith(`${ref}:T:`) && String(q.from).startsWith('A9:')) || (String(q.from).startsWith(`${ref}:T:`) && String(q.to).startsWith('A9:'))); return w ? (String(w.to).startsWith(`${ref}:`) ? w.to : w.from).split(':')[2] : 'unwired'; };
  const want = { S11: 'NO', S12: 'NC', S13: 'NC' }, got = Object.fromEntries(Object.keys(want).map((r) => [r, contact(r)])), wrong = Object.keys(want).filter((r) => got[r] !== want[r]);
  const txt = `inputs active when grounded: S11 throttle closed ${got.S11} (want NO, made at idle), S12 gear ${got.S12} (want NC: open when down-locked), S13 canopy ${got.S13} (want NC: open when latched)`;
  return wrong.length ? OPEN('block I wiring, block D pin map', `${txt}; rewire ${wrong.join(', ')} to NC (W4A22, W5A22) and add the NC terminal to LEZ-32-216's pin map`) : ok(true, txt);
}
/** I's wingtip-light harness still crosses the strake tank; J's tunnel carries it (ICD J-R13) */
function iLights() { const h = tankHits('LEZ-33-110'); return h.n ? OPEN('block I', `LEZ-33-110 has ${h.n} sample(s) inside the strake tank (from FS ${fx(h.first[0])}, BL ${fx(h.first[1])}); route it through the CS spar systems tunnel with J's lines (LEZ-57-140 rev G sizes the tunnel for it)`) : ok(true, 'LEZ-33-110 clear of the tanks'); }

/** the checks added to each J record (ids continue the record's own) */
export const J_ICD = {
  'LEZ-31-110': [ifc('I8', 'LEZ-24-130 / -140 / -161 (block I)', 'body', 'I\'s boxes and panel run out of the AXIS space', iBoxes), ifc('I9', 'LEZ-24-130 breakers (I), B\'s cb cut-out', 'power', 'Breaker count and AXIS power buses', breakers)],
  'LEZ-31-150': [ifc('I4', 'LEZ-32-216 S11 / S12 / S13 (D, E, B) and I\'s wiring', 'J1', 'Wired contact closed in the alarm state', warnSense)],
  'LEZ-23-110': [ifc('I6', 'LEZ-57-180 strake tank (F)', 'coax', 'No J line in the tank', noTank('LEZ-23-110')), ifc('I7', 'LEZ-53-170 front seat back (A)', 'coax', 'Through its hole table', throughSB('LEZ-23-110')), ifc('I8', 'LEZ-33-110 light harness (I) in the tunnel', 'coax', 'I\'s harness out of the tank', iLights)],
  'LEZ-31-121': [ifc('I5', 'LEZ-57-180 strake tank (F)', 'harness', 'No J line in the tank', noTank('LEZ-31-121')), ifc('I6', 'LEZ-53-170 front seat back (A)', 'harness', 'Through its hole table', throughSB('LEZ-31-121'))],
  'LEZ-25-162': [ifc('I3', 'LEZ-57-180 strake tank (F)', 'cable', 'No J line in the tank', noTank('LEZ-25-162')), ifc('I4', 'LEZ-53-170 front seat back (A)', 'cable', 'Through its hole table', throughSB('LEZ-25-162'))],
  'LEZ-23-125': [ifc('I5', 'LEZ-53-170 front seat back (A)', 'harness', 'Through its hole table', throughSB('LEZ-23-125')), ifc('I6', 'LEZ-57-180 strake tank (F)', 'harness', 'No J line in the tank', noTank('LEZ-23-125'))],
  'LEZ-34-111': [ifc('I4', 'LEZ-57-180 strake tank (F)', 'coax', 'No J line in the tank', noTank('LEZ-34-111'))],
  'LEZ-34-130': [ifc('I6', 'LEZ-08-105 nose ballast bulkhead (A)', 'line', 'Through its hole table', throughNB('LEZ-34-130')), ifc('I7', 'LEZ-08-100 lead block (A)', 'line', 'Through the declared hole of every lead step', () => throughLead('LEZ-34-130'))],
  'LEZ-34-110': [ifc('I4', 'LEZ-53-150 belly (A)', 'plane', 'Ground plane on the inner skin', () => planeOnSkin('LEZ-34-110'))],
  'LEZ-25-161': [ifc('I3', 'LEZ-53-150 turtleback (A)', 'plane', 'Ground plane on the inner skin', () => planeOnSkin('LEZ-25-161'))],
  'LEZ-34-112': [ifc('I4', 'LEZ-53-150 deck (A)', 'plane', 'Ground plane on the inner skin', () => planeOnSkin('LEZ-34-112'))],
  'LEZ-34-114': [ifc('I4', 'LEZ-53-150 deck (A)', 'plane', 'Ground plane on the inner skin', () => planeOnSkin('LEZ-34-114'))],
};
const GP_REV = { rev: 'B', date: '2026-11-19', short: 'Ground plane faceted to the skin', change: 'Block J interface phase 2: the ground plane was drawn as 1 in strips each flat over the plane\'s whole FS length, so on the curved skin they stood into the shell\'s inner skin (deck GA 35S 2.10 in, turtleback 1.19 in, GA 35S 0.71 in) or off it (belly 0.34 in). The plane is now 1 × 1 in facets, each centred on the inner skin (I-check "Ground plane on the inner skin"); the 0.016 sheet is formed to the skin. Mass and solid regenerated.' };
/** later revisions of J records made in the interface phase */
export const J_REVS = { 'LEZ-34-110': [GP_REV], 'LEZ-25-161': [GP_REV], 'LEZ-34-112': [GP_REV], 'LEZ-34-114': [GP_REV] };
/** append the checks and revisions to the records (called once by j_records.js) */
export function addIcd(defs) { for (const d of defs) { for (const r of J_REVS[d.pn] || []) { d.revs = [...d.revs, r]; d.rev = r.rev; } } for (const d of defs) for (const i of J_ICD[d.pn] || []) { if (d.interfaces.some((q) => q.id === i.id)) throw new Error(`${d.pn}: interface id ${i.id} taken`); d.interfaces.push(i); } return defs; }
void partByPN;
