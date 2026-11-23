// Block I interface control, phase 2 (final integration, 2026-11-19): every block I interface checked against the merged
// tree, as real checks appended to the block's records (docs/icd/i_electrical.md §I-P2). Consumers' power feeds and
// breakers (blocks B, C, F, G, H, J and I's own), their grounds, the K1 / K2 bays (block A's jut-out and wing, C's cuts),
// the harness routes through other blocks' cuts (C's systems conduit, J's aft lane, the CS spar tunnel, the firewall
// pass-throughs), the masses in the mass model; and the block's open items, now closed by their owners' changes.
// Inches, definition frame [BL, FS, WL]. Notional; not for construction.
import { WIRES, EQUIP, pinOf, partByPN, partMass, PASS, ADOPTED, PARTS } from '../systems.js';
import { MASS_ITEMS } from '../structures.js';
import * as LY from '../parts/wpI0_layout.js';
import { AWG, LOADS, MY_H, pathsOf, runClear, dPrim, magField, MAG, ENG_CLAMPS, SUPPORT_HW, AFT_NYLON, CITE, cranking } from '../parts/wpI1_power.js';
import { CLAMPS, CONDUITS, MOUTH } from '../parts/wp12_routing.js';
import { WCUTS } from '../parts/wp17_wing_panel.js';
import { JCUTS } from '../parts/wp20_jutout.js';
import { SYSC } from '../parts/wpC8_cuts.js';
import { AFTC, AFT_LEN, CS_TUNNELS, TUNNEL_PTS } from '../parts/wpJ0_layout.js';
import { CASE_BOLTS, enginePrims } from '../parts/wpG1_engine.js';
import { DEFS } from './release.js';
import { fx, at3 } from './i_common.js';
import { BAT_DEF, MAS_DEF, BUS_DEF, GND_DEF, VR_DEF, K2_DEF, TIP_DEF, LDG_DEF, PWR_DEF, PNLH_DEF, FWDH_DEF, STRAP_DEF, CAB_DEF, TIPH_DEF, INST_DEF, SUP_DEF, CLIP_DEF } from './i_defs.js';
import { ENG_DEF } from './g_engine.js';

const DATE = '2026-11-19';
const via = (pn, id) => { const f = DEFS[pn]?.def?.interfaces.find((q) => q.id === id); if (!f) return { ok: false, detail: `${pn} ${id}: no such interface` }; const r = f.check(); return { ok: r.ok, detail: `${pn} rev ${DEFS[pn].def.rev} ${id}: ${r.detail}` }; };
const put = (def, ifc) => { const k = def.interfaces.findIndex((q) => q.id === ifc.id); if (k >= 0) def.interfaces[k] = ifc; else def.interfaces.push(ifc); };
const rev = (def, r, short, change) => { def.revs = [...def.revs, { rev: r, date: DATE, short, change }]; def.rev = r; };

// ------------------------------------------------------------------------------------------- feeds
/** which block owns a consumer (by the PN of its equipment record) */
const OWNER = (pn) => (/^LEZ-(31-1|34-|23-|25-16)/.test(pn) ? 'J' : /^LEZ-(74|76|77)-/.test(pn) ? 'H' : /^LEZ-(71|61|78|79)-/.test(pn) ? 'G' : /^LEZ-27-/.test(pn) ? 'C' : /^LEZ-28-/.test(pn) ? 'F' : /^LEZ-32-2[0-3]/.test(pn) ? 'E' : /^LEZ-32-/.test(pn) ? 'D' : /^LEZ-(24|33|80)-/.test(pn) ? 'I' : /^LEZ-(25|31-100|52|56)/.test(pn) ? 'B' : '?');
/** how current passes through a device on its way to a consumer: output pin → input pin */
const THRU = { S3: { 'T:2': 'T:1' }, S4: { 'T:2': 'T:1' }, S5: { 'T:2': 'T:1' }, S6: { 'T:2': 'T:1' }, S7: { 'T:2': 'T:1' }, S8: { 'T:2': 'T:1' }, S9: { 'T:3': 'T:1', 'T:4': 'T:1' }, S1: { 'T:S': 'T:BAT' }, K3: { 'C:87': 'C:30' },
  P331: { 'J:1': 'P:1', 'J:2': 'P:2', 'J:3': 'P:3' }, P332: { 'J:1': 'P:1', 'J:2': 'P:2', 'J:3': 'P:3' }, VR1: { 'J1:2': 'J1:1' }, D1: { 'T:K': 'T:A' }, F1: { 'T:2': 'T:1' }, F2: { 'T:2': 'T:1' }, F3: { 'T:2': 'T:1' }, K1: { 'T:A2': 'T:A1' }, K2: { 'T:A2': 'T:A1' } };
/** the consumers and their supply pins (every powered piece of equipment; the sensors are fed by the GEA 24, the ELT by its own battery) */
export const CONSUMERS = [['A1', 'J1:1', 'A1'], ['A1', 'J1:2', 'A1'], ['A1', 'J1:16', 'A1'], ['A2', 'J1:1', 'A2'], ['A3', 'J2:1', 'A3'], ['A5', 'J1:1', 'A5'], ['A7', 'J1:1', 'A7'], ['A9', 'J1:1', 'A9'], ['A10', 'J1:1', 'A10'],
  ['M1', 'J1:1', 'M1'], ['M2', 'J1:1', 'M2'], ['M2', 'J1:2', 'M2'], ['DS1', 'J1:1', 'DS1'], ['DS1', 'J1:2', 'DS1'], ['DS2', 'J1:1', 'DS2'], ['DS2', 'J1:2', 'DS2'], ['DS3', 'J1:1', 'DS3'], ['G1', 'F:F', 'FIELD'], ['K2', 'C:X1', null], ['B1', 'T:POS', null]];
const isProt = (pin) => /^CB[12]:(CB|FZ):\d+$/.test(pin);
const rating = (pin) => parseFloat(String(pinOf(pin)?.name || '').split(' ').pop());
/** trace a supply pin back through switches, connectors and the regulator to its protector (or to the battery for the
 *  starter circuit, unprotected by practice): the wires on the way and the protector */
export function traceFeed(pin) {
  const path = []; let p = pin;
  for (let k = 0; k < 12; k++) {
    const w = WIRES.find((x) => x.to === p) || WIRES.find((x) => x.from === p && !isProt(x.to) && x.to !== pin); if (!w) return { path, prot: null, end: p };
    const src = w.to === p ? w.from : w.to; path.push(w);
    if (isProt(src)) return { path, prot: src, end: src };
    if (/^BT1:T:POS$/.test(src)) return { path, prot: null, end: src, battery: true };
    const [ref, c, n] = src.split(':'), nx = THRU[ref]?.[`${c}:${n}`]; if (!nx) return { path, prot: null, end: src };
    p = `${ref}:${nx}`;
  }
  return { path, prot: null, end: p };
}
const chartOK = (w, prot) => { const a = AWG[w.awg]; if (!a) return true; const kind = /:CB:/.test(prot) ? 3 : 4; return a[kind] >= rating(prot) - 1e-9; };
export function feeds() {
  return CONSUMERS.map(([ref, pin, load]) => { const e = EQUIP.find((q) => q.ref === ref), t = traceFeed(`${ref}:${pin}`), L = load ? LOADS[load] : null, r = t.prot ? rating(t.prot) : null, need = L ? (L.int || /COM/.test(pinOf(t.prot || '')?.name || '') ? (L.peak || L.I) : L.I) : 0;
    const share = t.prot ? CONSUMERS.filter(([rf, pn2]) => traceFeed(`${rf}:${pn2}`).prot === t.prot).map(([rf]) => rf) : [];
    const I = t.prot && /POS|STROBE/.test(pinOf(t.prot)?.name || '') ? [...new Set(share)].reduce((a, rf) => a + LOADS[rf].I * 0.5, 0) : need;
    const unprot = !t.prot && t.battery && (ref === 'B1');   // the starter circuit: unprotected by practice (FAR 23.1357 note in elec-wire)
    const ok = (!!t.prot && r >= I - 1e-9 && t.path.every((w) => chartOK(w, t.prot))) || unprot;
    return { ref, pin, owner: OWNER(e?.pn || ''), pn: e?.pn, prot: t.prot, r, I, wires: t.path.map((w) => w.id), ok, unprot };
  });
}

// ------------------------------------------------------------------------------------------- grounds
/** the consumers' return pins and where each lands (through the wing-root connectors as the same circuit) */
const RETURNS = [['A1', 'J1:3'], ['A1', 'J1:4'], ['A1', 'J1:17'], ['A2', 'J1:2'], ['A3', 'J2:2'], ['A5', 'J1:2'], ['A7', 'J1:2'], ['A9', 'J1:2'], ['A10', 'J1:2'], ['M1', 'J1:2'], ['DS1', 'J1:3'], ['DS2', 'J1:3'], ['DS3', 'J1:2'], ['VR1', 'J1:3'], ['K2', 'C:X2'], ['S1', 'T:G'], ['S2', 'T:1'], ['S9', 'T:2']];
const RET_THRU = { P331: { 'J:3': 'P:3' }, P332: { 'J:3': 'P:3' } };
export function returns() {
  return RETURNS.map(([ref, pin]) => { let p = `${ref}:${pin}`; const hops = [];
    for (let k = 0; k < 4; k++) { const w = WIRES.find((x) => (x.from === p || x.to === p) && !hops.includes(x.id)); if (!w) break; hops.push(w.id); const o = w.from === p ? w.to : w.from;
      if (/^GB[12]:/.test(o)) return { ref, pin, gb: o.split(':')[0], hops, ok: true };
      const [r2, c, n] = o.split(':'), nx = RET_THRU[r2]?.[`${c}:${n}`]; if (!nx) break; p = `${r2}:${nx}`; }
    return { ref, pin, gb: null, hops, ok: false }; });
}

// ------------------------------------------------------------------------------------------- K1 / K2 bays
const cutPrim = (c) => (c.k === 'cyl' ? { t: 'cyl', a: c.a, b: c.b, r: c.r, what: c.id } : { lo: c.lo, hi: c.hi, what: c.id });
const BAYS = () => [...JCUTS.filter((c) => c.id === 'k1-bay'), ...WCUTS.filter((c) => /^k2-/.test(c.id))].map(cutPrim);
/** a run point mirrored into the right-hand cut frame */
const mirror = (P) => P.map((q) => [Math.abs(q[0]), q[1], q[2]]);

// ------------------------------------------------------------------------------------------- routes through the cut registry
/** distance (in) from a point to the nearest of a set of cut cylinders' axes, less nothing (axis distance) */
const axisD = (q, cyls) => Math.min(...cyls.map((c) => dPrim(q, { t: 'cyl', a: c.a, b: c.b, r: 0 })));

// ------------------------------------------------------------------------------------------- the interfaces
put(BUS_DEF, { id: 'I6', with: 'Every powered consumer of blocks B, C, F, G, H, J and I (pin list, wp7)', feature: 'fuseblock', what: 'Each supply pin traces through its switches and connectors to one breaker or fuse on CB1 / CB2 (the starter circuit excepted, by practice); the protector ≥ the consumer\'s budget current (peak for motors and the transmitter; half the lights each on the shared position / strobe circuits); every wire on the way within the protector chart for its gauge',
  check: () => { const F = feeds(), bad = F.filter((q) => !q.ok), by = {}; for (const q of F) (by[q.owner] ||= []).push(q);
    return { ok: !bad.length && F.length === CONSUMERS.length, detail: `${F.length} supply pins: ${Object.entries(by).map(([o, L]) => `${o}: ${[...new Set(L.map((q) => q.ref))].join(', ')}`).join('; ')}${bad.length ? `; FAIL ${bad.map((q) => `${q.ref}:${q.pin} ${q.prot || 'no protector'}`).join(', ')}` : ''}; e.g. ${F.filter((q) => q.prot).slice(0, 4).map((q) => `${q.ref} ${q.prot} ${q.r} A ≥ ${fx(q.I, 1)} A (${q.wires.join(' → ')})`).join('; ')}; B1 starter by K2 (unprotected, practice)` }; } });
put(BUS_DEF, { id: 'I7', with: 'Block B: the breaker cut-out and the key switch (LEZ-31-100); block H: S1 (LEZ-74-100)', feature: 'breaker', what: 'B\'s consumers are hosts only (no powered item of block B): its cut-out takes the six breakers (I1) and its key-switch hole takes H\'s S1, fed from START/IGN (FB1-4, 5 A) and starting K2 through the start relay K3 (coil from S1 START, contact from FB1-6, 5 A) (rev 2026-11-19: the key START contact is rated 2 A, the STS-S12 coil draws 2.9 A)', check: () => { const s1 = traceFeed('S1:T:BAT'), k2 = traceFeed('K2:C:X1'), cb = via('LEZ-24-130', 'I1');
    return { ok: s1.prot === 'CB1:FZ:4' && k2.prot === 'CB1:FZ:6' && cb.ok && via('LEZ-31-100', 'I7').ok, detail: `S1 BAT ← ${s1.prot} (${s1.path.map((w) => w.id).join(' → ')}); K2 coil ← K3 start relay (coil from S1 START) ← ${k2.prot}; ${cb.detail.slice(0, 120)}; key spot-face: ${via('LEZ-31-100', 'I7').detail.slice(0, 100)}` }; } });
rev(BUS_DEF, 'B', 'AXIS A on the essential bus, B on the main (J\'s ask); feeds checked', 'Final integration: block J asked for the AXIS GDU 116C\'s power input A on the essential bus and B on the main bus; the two fuse positions swap their labels (FB2:1 AXIS A, FB1:1 AXIS B) and wires P21A18 / P20A18 land on J1:1 / J1:2 (no wire or length change). I6 traces every consumer\'s supply to its protector; I7 records block B as host only.');

put(GND_DEF, { id: 'I5', with: 'Every consumer\'s return (blocks C, F, G, H, J and I)', feature: 'gb1', what: 'Each return pin lands on GB1 or GB2 (through the wing-root connectors as the same circuit); the engine-mounted starter, alternator and magneto cases return only through the strap at E1 (N2A2)', check: () => { const R = returns(), bad = R.filter((q) => !q.ok), e = WIRES.filter((x) => /^E1:/.test(x.from) || /^E1:/.test(x.to));
    return { ok: !bad.length && e.length === 1 && e[0].id === 'N2A2', detail: `${R.length} returns: GB1 ${R.filter((q) => q.gb === 'GB1').length}, GB2 ${R.filter((q) => q.gb === 'GB2').length}${bad.length ? `; NOT GROUNDED ${bad.map((q) => `${q.ref}:${q.pin}`).join(', ')}` : ''}; engine case by ${e.map((x) => x.id).join(', ')} at E1; key-switch magneto ground ${WIRES.find((x) => x.from === 'S1:T:G')?.id} to GB1` }; } });

put(MAS_DEF, { id: 'I5', with: 'LEZ-53-150 rev J wall pad and inserts (block A)', feature: 'bracket', what: 'The bracket\'s AN3s in A\'s potted inserts in the G-10 wall pad (shell I11)', check: () => via('LEZ-53-150', 'I11') });
MAS_DEF.interfaces = MAS_DEF.interfaces.filter((q) => q.id !== 'O1');
put(BAT_DEF, { id: 'I8', with: 'LEZ-53-150 rev J belly drain (block A)', feature: 'vent', what: 'The vent tube ends at A\'s drain hole on the shell\'s inner face (shell I10); the shelf\'s tape lands on the side wall (I3)', check: () => { const a = via('LEZ-53-150', 'I10'), b = BAT_DEF.interfaces.find((q) => q.id === 'I3').check(); return { ok: a.ok && b.ok, detail: `${a.detail}; shelf: ${b.detail}` }; } });
BAT_DEF.interfaces = BAT_DEF.interfaces.filter((q) => q.id !== 'O1');
rev(MAS_DEF, 'B', 'Wall pad on the shell', 'Final integration: O1 closed by block A\'s LEZ-53-150 rev J wall pad and potted inserts (I5).');
rev(BAT_DEF, 'B', 'Belly drain on the shell', 'Final integration: O1 closed by block A\'s LEZ-53-150 rev J belly drain hole (I8).');

put(K2_DEF, { id: 'I4', with: 'LEZ-53-180 firewall layout \'start\' (block A rev B; owner label I)', feature: 'bracket', what: 'A\'s layout names block I as the starter contactor\'s owner and its holes are K2\'s (firewall I5 real)', check: () => { const r = via('LEZ-53-180', 'I5'), lab = DEFS['LEZ-53-180']?.def?.layout?.find((L) => L.id === 'start'); return { ok: r.ok && lab?.block === 'I', detail: `layout 'start' owner ${lab?.block}; ${r.detail.slice(0, 160)}` }; } });

// harness through the K1 / K2 bays and the cut registry
put(TIPH_DEF, { id: 'I6', with: 'LEZ-57-110 rev F side port at the systems conduit\'s last bend (C\'s cut, block A record)', feature: 'bundle', what: 'Each harness leaves the conduit at the lined side port and runs ≤ 6 in to its light (wing I9)', check: () => via('LEZ-57-110', 'I9') });
TIPH_DEF.interfaces = TIPH_DEF.interfaces.filter((q) => q.id !== 'O1');
put(TIPH_DEF, { id: 'I7', with: 'LEZ-57-116 K1 bay, LEZ-57-110 K2 bay (block A parts; C\'s cuts and bellcranks LEZ-27-141 / -142)', feature: 'bundle', what: 'The harness ≥ 0.15 in from the K1 and K2 bays\' volumes and from the bellcranks and rods that move in them', check: () => { const B = BAYS(), M = ['LEZ-27-141', 'LEZ-27-142'].flatMap((pn) => (partByPN(pn)?.geo || []).filter((g) => g.t !== 'path').map((g) => (g.t === 'box' ? { t: 'box', c: [g.c[1] * 12, g.c[0] * 12, g.c[2] * 12], d: [g.d[1] * 12, g.d[0] * 12, g.d[2] * 12], what: pn } : g.t === 'cyl' ? { t: 'cyl', a: [g.a[1] * 12, g.a[0] * 12, g.a[2] * 12], b: [g.b[1] * 12, g.b[0] * 12, g.b[2] * 12], r: g.r * 12, what: pn } : null)).filter(Boolean));
    const w = Math.min(...pathsOf('LEZ-33-110').map((r) => runClear(mirror(r.P), r.dIn, B).c)), m = Math.min(...pathsOf('LEZ-33-110').map((r) => runClear(r.P, r.dIn, M).c));
    return { ok: w >= 0.15 && m >= 0.15, detail: `bays ${B.map((b) => b.what).join(', ')}: ${fx(w)} in; bellcranks and rods ${fx(m)} in (≥ 0.15)` }; } });
put(TIPH_DEF, { id: 'I8', with: 'The cut registry (wpC8: JCUTS sys-1/2/3, WCUTS sys-*), LEZ-57-140 rev H systems tunnel', feature: 'bundle', what: 'Every sample of the harness in the CS spar, the jut-out and the wing (outside the connector bay and past the side port) inside a measured conduit cut: axis offset + bundle radius ≤ the cut\'s radius', check: () => { const cyls = [...JCUTS, ...WCUTS].filter((c) => c.k === 'cyl' && /^sys-/.test(c.id)), T = CS_TUNNELS[0], cs = { a: [T.x0, 123.06, 35.1664 + T.z], b: [T.x1, 127.5, 35.1664 + T.z], r: T.d / 2 };
    let w = 0, n = 0; for (const r of pathsOf('LEZ-33-110')) for (let i = 1; i < r.P.length; i++) for (let k = 0; k <= 8; k++) { const p = r.P[i - 1].map((v, j) => v + (r.P[i][j] - v) * k / 8), q = [Math.abs(p[0]), p[1], p[2]];
      if (q[0] < 9.95 || q[1] < 122.9 || q[0] > 145.7 || (q[0] >= SYSC.bay.bl[0] && q[0] <= SYSC.bay.bl[1] && q[1] >= SYSC.bay.fs[0] && q[1] <= SYSC.bay.fs[1])) continue; n++;
      const inCS = q[1] <= 127.5 + 1e-6 && q[0] <= T.x1 + 1e-6, d = inCS ? dPrim(q, { t: 'cyl', a: cs.a, b: cs.b, r: 0 }) - cs.r : Math.min(...cyls.map((c) => dPrim(q, { t: 'cyl', a: c.a, b: c.b, r: 0 }) - c.r)); w = Math.max(w, d + r.dIn / 2); }
    return { ok: n > 50 && w <= 1e-6, detail: `${n} samples in the tunnel and the conduit cuts: worst offset + radius − bore ${fx(w, 3)} in (≤ 0)` }; } });

put(INST_DEF, { id: 'I5', with: 'The mass model (systems massRollup: adopted items)', feature: 'install', what: 'Every block I part is in an adopted mass item, its system mass = the record\'s each × qty within 0.5 %, its CG from its own geometry', check: () => { const rows = MY_PNS.map((pn) => { const p = partByPN(pn), d = DEFS[pn]?.def, m = partMass(p), want = (d?.mass?.each ?? NaN) * (d?.qty || 1); return { pn, item: p.massItem, adopted: ADOPTED.has(p.massItem) && MASS_ITEMS.some(([id]) => id === p.massItem), m: m.m, want, ok: ADOPTED.has(p.massItem) && Math.abs(m.m - want) <= 0.005 * want + 1e-6 && !p.cg }; });
    const bad = rows.filter((q) => !q.ok), tot = rows.reduce((a, q) => a + q.m, 0); return { ok: !bad.length, detail: `${rows.length} parts, ${fx(tot, 2)} lb in items ${[...new Set(rows.map((q) => q.item))].join(', ')}${bad.length ? `; OFF ${bad.map((q) => `${q.pn} ${fx(q.m, 3)} vs ${fx(q.want, 3)}${q.adopted ? '' : ' (item not adopted)'}`).join(', ')}` : '; all within 0.5 %'}` }; } });
put(INST_DEF, { id: 'I6', with: 'LEZ-53-180 firewall pass-throughs (block A layout, PASS)', feature: 'install', what: 'Every block I run that crosses FS 153 inside the firewall\'s outline does so in a declared pass-through (the power boot, in its lane); the light harness crosses outside it, in the CS spar tunnel and the jut-out', check: () => { const rows = []; let ok = true;
    for (const pn of MY_H) for (const [i, r] of pathsOf(pn).entries()) for (let k = 1; k < r.P.length; k++) { const a = r.P[k - 1], b = r.P[k]; if ((a[1] - 127.5) * (b[1] - 127.5) > 0 || a[1] === b[1]) continue; const t = (127.5 - a[1]) / (b[1] - a[1]), p = a.map((v, j) => v + (b[j] - v) * t);
      const inBoot = Math.hypot(p[0] - LY.BOOT.c[0], p[2] - LY.BOOT.c[1]) + r.dIn / 2 <= LY.BOOT.r + 1e-6, outside = Math.abs(p[0]) >= 11.66, pass = PASS.find((q) => q.id === 'fw-power'); ok = ok && (inBoot && !!pass || outside); rows.push(`${pn}#${i} ${inBoot ? 'boot' : outside ? `outside (BL ${fx(p[0])})` : `AT BL ${fx(p[0])}, WL ${fx(p[2])}`}`); }
    return { ok: ok && rows.length > 0, detail: rows.join('; ') }; } });
put(INST_DEF, { id: 'I7', with: 'H: LEZ-74-100 key-switch magneto ground', feature: 'install', what: 'H\'s N40A18 (S1:T:G → GB1) is the key-switch magneto ground, in the star; no N5A18 of this block\'s', check: () => { const h = WIRES.find((x) => x.id === 'N40A18'), old = WIRES.find((x) => x.id === 'N5A18'); return { ok: !!h && h.from === 'S1:T:G' && /^GB1:/.test(h.to) && !old, detail: `${h ? `${h.id} ${h.from} → ${h.to}` : 'N40A18 missing'}${old ? '; N5A18 still present' : ''}` }; } });
put(INST_DEF, { id: 'I8', with: 'G: LEZ-71-210 crankcase bolts (wpG1 CASE_BOLTS; positions typed)', feature: 'install', what: 'Each of the six engine-side clamp brackets on a case bolt ≤ 2.0 in away (0.040 CRES angle reach, DESIGN), the bolt on the case envelope', check: () => { const env = enginePrims().filter((p) => ['case', 'nose'].includes(p.feat)), rows = ENG_CLAMPS.map(([w, p]) => { const b = CASE_BOLTS.map((q) => ({ q, d: Math.hypot(...p.map((v, i) => v - q.at[i])) })).sort((x, y) => x.d - y.d)[0], on = Math.min(...env.map((g) => Math.abs(dPrim(b.q.at, g)))); return { w, p, b, on }; });
    return { ok: rows.every((r) => r.b.d <= 2.0 && r.on <= 0.6), detail: rows.map((r) => `${r.w} clamp FS ${fx(r.p[1], 1)} on ${r.b.q.id} (${fx(r.b.d)} in; bolt ${fx(r.on)} in off the case)`).join('; ') + ' — bolt positions typed on the approximate envelope: verify on the engine' }; } });
put(INST_DEF, { id: 'I9', with: 'J: LEZ-31-122 GMU 11 allowance; the AXIS A / B bus split', feature: 'install', what: 'This block\'s 0.25 µT allowance is within J\'s heading-error bound (rev B, 1°) in a 24 µT horizontal field, and the AXIS\'s two power inputs are on different buses (A essential, B main, as J asks)', check: () => { const deg = MAG.allow / 24 * 180 / Math.PI, a = traceFeed('A1:J1:1').prot, b = traceFeed('A1:J1:2').prot; return { ok: deg <= 1.0 && /^CB2:/.test(a) && /^CB1:/.test(b), detail: `0.25 µT ≈ ${fx(deg, 2)}° of heading (J's bound 1°; field ${fx(magField().B, 3)} µT); AXIS A ← ${a} (essential), B ← ${b} (main)` }; } });
INST_DEF.interfaces = INST_DEF.interfaces.filter((q) => !/^O[1-3]$/.test(q.id));
rev(INST_DEF, 'B', 'Interface phase 2: feeds, grounds, mass model, pass-throughs; open items closed', 'Final integration (block I interface phase 2, docs/icd/i_electrical.md §I-P2): I5 mass model, I6 firewall pass-throughs, I7 H\'s key-switch ground (O1), I8 the engine-side clamp brackets on block G\'s case bolts (O2; bolt positions typed on the approximate envelope), I9 J\'s GMU allowance and the AXIS bus split (O3). Hardware lines: the shell\'s battery drain fitting, the K1 wall pad and its inserts.');

put(SUP_DEF, { id: 'I4', with: 'J\'s aft lane (wpJ0 AFTC, AFT_LEN): conduit and liner hardware', feature: 'install', what: 'The aft lane\'s conduit and liner lines are the lane\'s own lengths (both sides); its bore holds the GMU harness (0.25 in) at ≤ 40 % fill (DESIGN, the NEC Ch. 9 Table 1 over-2-conductor figure, stricter than the aircraft rule) and with ID ≥ 1.25 × the bundle (AC 43.13-1B para 11-249, the aircraft rule)', check: () => { const L = AFT_LEN(), hw = SUPPORT_HW(false), c = hw.find((l) => /aft systems conduit/.test(l.std)), li = hw.find((l) => /aft lane liner/.test(l.std)), ft = (x) => Math.round(2 * x / 12 * 100) / 100, fill = (0.25 / AFTC.id) ** 2, k = AFTC.id / 0.25;
    return { ok: !!c && !!li && Math.abs(c.qty - ft(L.conduit)) < 0.011 && Math.abs(li.qty - ft(L.liner)) < 0.011 && fill <= 0.40 && k >= 1.25, detail: `conduit ${c?.qty} ft (lane ${fx(2 * L.conduit / 12)} ft), liner ${li?.qty} ft (lane ${fx(2 * L.liner / 12)} ft), nylon ${AFT_NYLON} lb/in³ (liner and the other nylon); aft conduit 6061-T6 ${AFTC.lbFt} lb/ft; GMU harness fill ${fx(100 * fill, 0)} % (≤ 40 %: ${CITE.nec}); ID / bundle ${fx(k)} (≥ 1.25: AC 43.13-1B CHG 1 para 11-249 p. 11-101 — ${CITE.ac11})` }; } });
put(SUP_DEF, { id: 'I5', with: 'Conduits and lined tunnels (wp12 CONDUITS: C\'s systems conduit, J\'s aft lane, the CS spar tunnel, A\'s left GMU branch)', feature: 'install', what: 'No clamp inside a conduit (its length is supported by the conduit); every conduit mouth that opens into free run is supported: a clamp within 1.5 in outside it, or the run\'s next support ≤ 6 in away', check: () => { const rows = []; let inside = 0, unsup = [];
    for (const p of PARTS) for (const [i, g] of p.geo.filter((q) => q.t === 'path' && q.cls).entries()) { const cd = g.conduits || []; if (!cd.length) continue; const S = [...(g.supports || [])].sort((a, b) => a - b), L = g.supports ? Math.max(...g.supports) : 0;
      const cl = CLAMPS.filter((c) => c.run === `${p.pn}#${i}`);
      for (const c of cl) { let best = Infinity, dd = 0; for (let k = 1; k < g.pts.length; k++) { const a = g.pts[k - 1], b = g.pts[k], ab = b.map((v, j) => v - a[j]), L2 = ab.reduce((x, v) => x + v * v, 0), t = Math.max(0, Math.min(1, ab.reduce((x, v, j) => x + v * (c.at[j] - a[j]), 0) / (L2 || 1))), dist = Math.hypot(...c.at.map((v, j) => v - a[j] - ab[j] * t)); if (dist < best) { best = dist; dd = g.pts.slice(0, k).reduce((x, q, j) => x + (j ? Math.hypot(...q.map((v, m) => v - g.pts[j - 1][m])) : 0), 0) + Math.sqrt(L2) * t; } } if (cd.some(([a, b]) => dd > a + 1e-4 && dd < b - 1e-4)) inside++; }
      for (const [a, b] of cd) for (const [m, dir] of [[a, -1], [b, 1]]) { if (m <= 1e-6 || m >= L - 1e-6) continue; if (cd.some(([a2, b2]) => (dir > 0 ? Math.abs(a2 - m) < 0.1 / 12 : Math.abs(b2 - m) < 0.1 / 12))) continue; const nx = dir > 0 ? S.find((s) => s > m + 1e-6) : [...S].reverse().find((s) => s < m - 1e-6); const gap = nx == null ? 0 : Math.abs(nx - m) * 12; if (gap > Math.max(MOUTH.free, 1.5) + 1e-6) unsup.push(`${p.pn}#${i} at ${fx(m * 12, 1)} in (${fx(gap, 1)} in)`); }
      rows.push(`${p.pn}#${i}: ${cd.length} conduit span(s), ${fx(cd.reduce((x, [a, b]) => x + (b - a) * 12, 0), 0)} in`); }
    return { ok: !inside && !unsup.length && rows.length > 0, detail: `${rows.join('; ')}; clamps inside a conduit: ${inside}${unsup.length ? `; UNSUPPORTED mouths ${unsup.join(', ')}` : '; every mouth supported'} (${CONDUITS.length} conduits registered)` }; } });

const MY_PNS = ['LEZ-24-110', 'LEZ-24-120', 'LEZ-24-130', 'LEZ-24-140', 'LEZ-24-150', 'LEZ-80-100', 'LEZ-33-100', 'LEZ-33-120', 'LEZ-24-160', 'LEZ-24-161', 'LEZ-24-162', 'LEZ-24-165', 'LEZ-80-110', 'LEZ-33-110', 'LEZ-24-100', 'LEZ-20-100', 'LEZ-20-110'];

// ------------------------------------------------------------------------------------------- block G's crankcase bolts (LEZ-71-210 feature; the engine record is G's, revised by H to rev B)
if (!ENG_DEF.features.some((f) => f.id === 'casebolts')) {
  ENG_DEF.features.push({ id: 'casebolts', kind: 'hole', label: `Rev C: crankcase bolts that carry block I's engine-side clamp brackets: ${CASE_BOLTS.map((b) => `${b.id} (BL ${fx(b.at[0])}, FS ${fx(b.at[1])}, WL ${fx(b.at[2])}, ${b.what})`).join('; ')}. Positions typed from memory on the approximate envelope (BOUND): verify against the Lycoming installation drawing before the brackets are made`, tol: 'Bracket slotted ±0.25 in' });
  rev(ENG_DEF, 'C', 'Crankcase bolts for the clamp brackets', 'Final integration (block I open item LEZ-24-100 O2): the case bolts under the six engine-side clamp brackets named on the envelope (feature casebolts; positions typed, BOUND), checked by LEZ-24-100 I8. No change to the solid.');
}
// ------------------------------------------------------------------------------------------- source audit, 2026-11-19
// Values typed from memory replaced by the research findings (docs/blocks/i_electrical.md, "Source audit"); one rev per changed part
const nxt = (def) => String.fromCharCode(def.rev.charCodeAt(0) + 1);
const audit = (def, short, change) => rev(def, nxt(def), short, change);
audit(BAT_DEF, 'Sourced data; M6 terminals', 'Source audit (2026-11-19): Odyssey PC680 / ODS-AGM16L data cited (16 Ah, 15.4 lb, 12.6 V; R_int 12 mΩ and Peukert stay BOUND); the terminals are M6 female receptacles (50 in-lb max), not 3/8 in studs, so the cables take M6 bolts; cost $237 (was $190). Envelope kept (1–4 % large).');
audit(MAS_DEF, 'Part swap: STS-M12 150 A master contactor', 'Source audit (2026-11-19): K1 is named, a Sky-Tec STS-M12 (Lamar STS-A12 class) at 150 A continuous / 300 A inrush, against the ≥ 100 A requirement (the common White-Rodgers Type 70 is 80 A and does not qualify); mass 0.92 lb (was 0.60); elec-k now governed by K2 at +0.36; cost $160.');
audit(BUS_DEF, 'Klixon 7277-2, Ø 0.445 holes', 'Source audit (2026-11-19): the breakers are Klixon 7277-2 (MS3320 was a wrong cross-reference: the MIL part is MS26574); their panel hole is Ø 0.445 plus a 0.125 anti-rotation hole (was a 3/8 bushing cut): the bushings still fall inside B\'s cut-out (I1); breaker mass 0.062 lb (was 0.055); cost about $300.');
audit(GND_DEF, 'B&C GB24, 5/16 stud', 'Source audit (2026-11-19): GB1 named as the B&C GB24 (24 tabs, 5/16 in stud; no 20-tab block is listed): the stud is 5/16 in (was 1/4). The GB24\'s 1-3/8 × 3-1/2 in footprint is larger than the drawn envelope: the module re-layout is open (docs/blocks/i_electrical.md). Cost $130 for two.');
audit(VR_DEF, 'B&C LR3E-14 named, 0.56 lb', 'Source audit (2026-11-19): VR1 is the B&C LR3E-14 (07-06742): 0.56 lb (was 0.30), crowbar 16.25 V, field < 4 A with a 5 A field breaker; the field load is now the 4.0 A conservative end (elec-coord ALT FIELD 5 A against 1.25 × 4.0 A: MS 0.00). Cost $385.');
audit(K2_DEF, 'Lamar STS-S12 named, 1.0 lb', 'Source audit (2026-11-19): K2 is the Lamar STS-S12 (300 A, coil 2.9 A): 1.0 lb (was 0.55); cranking current now 220 A (the conservative end of Sky-Tec\'s 125–220 A): K2 MS +0.36. Cost $164.');
audit(TIP_DEF, 'AeroLEDs Pulsar 660 named', 'Source audit (2026-11-19): the lights are AeroLEDs Pulsar 660 (experimental, non-TSO; Suntail is AeroLEDs\' tail light): 0.65 A average, 4.9 A flash peak (was 1.2 / 3.5), 0.41 lb each (was 0.30); the supply triad goes to 14 AWG (LEZ-33-110). Cost $1,000 the pair.');
audit(LDG_DEF, 'AeroLEDs SunSpot 36LX named', 'Source audit (2026-11-19): SunSpot 36LX, 3.2 A (was 2.0), 0.63 lb (was 0.45); the 5 A LDG LT fuse still covers it (1.25 × 3.2 = 4.0 A). Cost $615 (the current 36-4509-H; the 36LX price was not found).');
for (const d of [PWR_DEF, PNLH_DEF, FWDH_DEF, STRAP_DEF]) audit(d, 'Tinned M22759/16 data', 'Source audit (2026-11-19): wire resistance, mass and OD are the AS22759/16 tin-plated maxima (Glenair data sheet): resistance +0 to +27 %, mass −18 to −39 %; protector chart AC 43.13-1B Table 11-3 confirmed; bundle derating from the Fig. 11-5 table (floor 0.5075).');
audit(CAB_DEF, 'Redesign: 1/0 AWG cabin runs', `Source audit (2026-11-19): with the cranking current at 220 A (the conservative end of 125–220 A) and tinned resistances, the 2 AWG loop left the starter at 7.77 V (elec-start −0.03). The two long cabin runs (P1B0 battery → K2, N1A0 battery − → GB2) are now 1/0 AWG (bundle Ø 0.49, route radii 1.3 × 10 × OD); P1A2 and P1C2 stay 2 AWG. elec-start +${fx(cranking().ms)}; the ground run's F22 crossing moved 0.2 in to keep F22's ligament at 0.26 in; the LP raceway came down 0.06 in (elec-emc).`);
audit(TIPH_DEF, 'Redesign: 14 AWG triad', 'Source audit (2026-11-19): the Pulsar 660\'s 4.9 A flash peak over the ≈ 51 ft loop took the 16 AWG triad to 1.41 V against the AC 43.13-1B Table 11-6 1.0 V intermittent allowance (elec-vdrop −0.29). The triad is now M22759/16-14 (0.093 OD: the twisted triad still fits the 0.20 in bundle): elec-vdrop +0.12.');
audit(INST_DEF, 'Sourced hardware text', 'Source audit (2026-11-19): AC 43.13-1B citations corrected (voltage drop Table 11-6, not 11-2; supports 11-96a / 11-146); hardware each-masses not found in public sources stay BOUND.');
audit(SUP_DEF, 'Conduit rule sources; grommet swap', 'Source audit (2026-11-19): the 40 % fill rule is cited to NEC Ch. 9 Table 1 and the AC 43.13-1B para 11-249 ID ≥ 1.25 × bundle check is added (I4); nylon 0.0383 and phenolic 0.0484 lb/in³ (sourced); the left spar-web grommet is an MS35489-11 (3/8 ID, 5/8 hole), which passes the 3/8 liner (the -7 is 1/4 ID and cannot): A to open the web hole (ICD ask). The 1/2 × 0.035 nylon tube is not a stock Nylaflow size (BOUND; see the docs).');
audit(CLIP_DEF, 'Hardware masses BOUND', 'Source audit (2026-11-19): cushion-clamp each-masses were not found in public sources: BOUND, second research pass running.');
void axisD; void TUNNEL_PTS; void at3;
