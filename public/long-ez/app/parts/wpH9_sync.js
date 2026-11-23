// WPH9 — block H: point the system records (display, clash, routing and mass geometry, ports, passes, equipment and the
// wire list) at the block H definition: the runs of wpH2_runs.js, the firewall layout positions (block A), the engine
// rev B features, the engine maker's magneto and cylinder names (coordinator decisions 1, 2, 7). Runs after block G's
// modules (blk_h is imported after blk_g). Notional.
import { GEO } from '../structures.js';
import { partByPN, definePass, defineEquipment, defineWires, EQUIP, WIRES, bendRule, zoneOf } from '../systems.js';
import { inBlister } from './wpG4_systems.js';
import { FT, ptsOf, arc } from './wpH0_route.js';
import { wireLength } from './wp7_wiring.js';
import { spanRule } from './wp12_routing.js';
import { LEADS } from './wp6_engine_install.js';
import * as LY from './wpH1_layout.js';
import { RUNS } from './wpH2_runs.js';

/** a run as a system path (ft); supports and bend radius for the routing audit (wp12 `routingAudit`) */
function sysPath(r, extra = {}) {
  const pts = ptsOf(r).map(FT), g = { t: 'path', pts, dIn: r.od, massPerFt: 0, cls: r.cls, ...(r.shield ? { shield: true } : {}), ...extra };
  const s = arc(ptsOf(r)); if (spanRule(g)) g.supports = r.nodes.map((n, i) => (n.clamp || i === 0 || i === r.nodes.length - 1 ? s[i] / 12 : null)).filter((v) => v != null);
  const R = r.cls === 'cable' ? r.bendMin : bendRule(g); if (R) { g.bendRule = R / 12; g.bendR = (r.cls === 'cable' ? LY.CABLE.R : 1.25 * R) / 12; }
  // segments inside block G's carb-scoop blister (LEZ-71-250, an OML part) are inside the aircraft but in no ZONES entry:
  // listed as extSeg for the zone test only, after checking each sample against the blister (ICD H-O1)
  const inB = (q) => { const P = [q[1] * 12, q[0] * 12, q[2] * 12]; return !zoneOf(q) && inBlister(P, 0); }, ext = [];
  for (let i = 1; i < pts.length; i++) { const A = pts[i - 1], B = pts[i], n = Math.max(1, Math.ceil(Math.hypot(...B.map((v, k) => v - A[k])) / 0.05)); let any = false, all = true; for (let k = 0; k <= n; k++) { const q = A.map((v, j) => v + (B[j] - v) * k / n); if (!zoneOf(q)) { any = true; if (!inB(q)) all = false; } } if (any && all) ext.push(i); }
  if (ext.length) g.extSeg = [...(g.extSeg || []), ...ext];
  return g;
}
const pig = (a, b) => ({ t: 'path', pts: [FT(a), FT(b)], dIn: 0.12, massPerFt: 0 });   // probe / connector pigtail: not a route (no class)
const K = LY;

// ------------------------------------------------------------------------------------------- passes (block A's layout)
definePass([
  { id: 'fw-cables', at: FT([K.GROMMET.c[0], GEO.firewall * 12, K.GROMMET.c[1]]), r: K.GROMMET.r / 12, what: 'Engine-control cables (LEZ-76-110): fire-sealed silicone boot on a stainless flange, Ø 1.75', fireproof: true },
  // the shared power boot of block A's layout (LEZ-80-110 etc.); block I moves `fw-power` here and absorbs this entry
  { id: 'fw-boot-h', at: FT([K.BOOT.c[0], GEO.firewall * 12, K.BOOT.c[1]]), r: K.BOOT.r / 12, what: 'Power boot (block A layout, Ø 3.00): block H\'s P-leads and GEA 24 harness; shared with block I', fireproof: true },
]);

// ------------------------------------------------------------------------------------------- routes
{ const p = partByPN('LEZ-74-100'), g0 = p.geo.find((q) => q.t === 'path'), r = RUNS['LEZ-74-100'][0], g = sysPath(r, { raceway: g0.raceway, rwSpan: r.rw });
  // round body (rev 2026-11-19); integration: its front 1.15 in (where it seats on the panel's forward face) as a square envelope
  // Ø-wide (conservative), the rest round, so a line-style scan of the panel slab does not read the flat seat as a 1.1 in ball
  const f0 = K.KEYSW.face - K.KEYSW.panelT - K.KEYSW.seat, fb = 1.15, D = K.KEYSW.body.d;
  p.geo = [{ t: 'box', c: FT([K.KEYSW.c[0], f0 - fb / 2, K.KEYSW.c[1]]), d: [fb / 12, D / 12, D / 12] },
    { t: 'cyl', a: FT([K.KEYSW.c[0], f0 - fb, K.KEYSW.c[1]]), b: FT([K.KEYSW.c[0], f0 - K.KEYSW.body.L, K.KEYSW.c[1]]), r: D / 24 }, g]; }
{ const p = partByPN('LEZ-77-100'), g0 = p.geo.find((q) => q.t === 'path'), r = RUNS['LEZ-77-100'][0];
  p.geo = [p.geo.find((q) => q.t === 'box'), sysPath(r, { raceway: g0.raceway, rwSpan: r.rw })]; }
partByPN('LEZ-74-130').geo = RUNS['LEZ-74-130'].map((r) => sysPath(r));
{ const p = partByPN('LEZ-74-110'); p.geo = RUNS['LEZ-74-110'].map((r) => sysPath(r, { colour: 0x3c4fa0 })); }
partByPN('LEZ-76-110').geo = RUNS['LEZ-76-110'].map((r) => sysPath(r));
partByPN('LEZ-77-110').geo = [...RUNS['LEZ-77-110'].map((r) => sysPath(r)),
  ...['LF', 'RF', 'LR', 'RR'].flatMap((k) => [pig(K.PK(k), K.TC(k)), pig(K.PK(k), K.TE(k))]), pig(K.E2, [-1.80, 134.13, 32.16]), pig(K.E2, K.TACH.b)];
partByPN('LEZ-77-111').geo = [...RUNS['LEZ-77-111'].map((r) => sysPath(r)), ...Object.keys(K.MANI.ports).map((k) => pig([2.90, 128.20, 37.30], K.XD_TOP(k))), pig([K.FFT_AT[0], K.FFT_AT[1], 31.45], [K.FFT_AT[0], K.FFT_AT[1], K.FFT_AT[2] + K.FFT.h / 2])];
{ const p = partByPN('LEZ-77-121'); p.geo = RUNS['LEZ-77-121'].map((r, i) => { const k = Object.keys(K.LINE_CORNERS)[i]; return sysPath(r, { massPerFt: 0, ends: [`LEZ-77-120:${k}`, `LEZ-71-210:${K.LINE_PORTS[k]}`], endFit: ['-3 swivel on the AN822-3D elbow', k === 'OIL-P' ? '-3 swivel, AN816-3D with a 0.040 in restrictor' : '-3 swivel'] }); }); }

// ------------------------------------------------------------------------------------------- ports
{ const e = partByPN('LEZ-71-210'); e.ports['OIL-P'].at = FT(K.ENG_PORTS['OIL-P']); e.ports.MAP.at = FT(K.ENG_PORTS.MAP); e.ports.MAP.fit = 'AN816-3D in the intake riser boss, right side (rev B)'; }
{ const m = partByPN('LEZ-77-120'); for (const k of Object.keys(m.ports)) m.ports[k].at = FT(K.MANI_PORT(k)); }

// ------------------------------------------------------------------------------------------- equipment: engine maker's names, rev B positions
const at = (ref) => EQUIP.find((e) => e.ref === ref);
for (const [side, M] of Object.entries(K.MAGS)) { const e = at(M.ref); if (e) { e.name = M.name; e.at = FT(K.CAP(M.sg)); e.side = side; } }
const cylNo = K.CYL_NO, plugRef = (n, top) => `SP${n}${top ? 'T' : 'B'}`;
void LEADS;
// re-key the plugs, CHT and EGT probes by Lycoming cylinder number
for (let i = EQUIP.length - 1; i >= 0; i--) if (/^(SP\d[TB]|TC\d|TE\d)$/.test(EQUIP[i].ref)) EQUIP.splice(i, 1);
defineEquipment([
  ...['LF', 'RF', 'LR', 'RR'].flatMap((k) => [true, false].map((top) => ({ ref: plugRef(cylNo[k], top), pn: 'LEZ-74-120', name: `Spark plug, cyl ${cylNo[k]} ${top ? 'top' : 'bottom'}`, at: FT(K.PLUG_AT(k, top).p), conns: { T: { type: 'plug terminal', pins: { 1: 'HV' } } } }))),
  ...[1, 2, 3, 4].map((n) => ({ ref: `TC${n}`, pn: 'LEZ-77-110', name: `CHT probe, cyl ${n} (type J bayonet)`, at: FT(K.TC(K.CYL_OF[n])), conns: { T: { type: 'thermocouple leads', pins: { '+': 'J +', '-': 'J −' } } } })),
  ...[1, 2, 3, 4].map((n) => ({ ref: `TE${n}`, pn: 'LEZ-77-110', name: `EGT probe, cyl ${n} (type K clamp-on)`, at: FT(K.TE(K.CYL_OF[n])), conns: { T: { type: 'thermocouple leads', pins: { '+': 'K +', '-': 'K −' } } } })),
]);
{ const e = at('TS1'); if (e) e.at = FT(K.TACH.b); }
{ const e = at('E1'); if (e) e.at = FT(K.GND_STUD.b); }   // case ground stud (rev B); block I re-ends the strap here
for (const [ref, k] of [['OP1', 'OIL-P'], ['FP1', 'FUEL-P'], ['MP1', 'MAP']]) { const e = at(ref); if (e) e.at = FT(K.XD_TOP(k)); }
{ const e = at('FT1'); if (e) e.at = FT([K.FFT_AT[0], K.FFT_AT[1], K.FFT_AT[2] + K.FFT.h / 2]); }
{ const e = at('S1'); e.at = FT(K.KEY_TERM); e.name = 'Magneto / start key switch (OFF-R-L-BOTH-START, grounding terminal)'; e.conns.T.pins = { BAT: '+14 V IN', L: 'L MAG (engine left, impulse)', R: 'R MAG (engine right)', S: 'START', G: 'MAG GROUND (OFF / START)' }; }
partByPN('LEZ-74-100').faces = [{ draw: 'key', c: [K.KEYSW.face / 12, K.KEYSW.c[0] / 12, K.KEYSW.c[1] / 12], w: 0.16, h: 0.16 }];

// ------------------------------------------------------------------------------------------- wires: magneto names, tower order, key-switch ground
const W = [], wire = (id, awg, from, to, sig, harness, more = {}) => { const x = { id, awg, from, to, sig, harness, spec: more.spec || `M22759/16-${awg}-9`, ...more }; x.len = wireLength(x); W.push(x); };
const PLEAD = 'M27500-18TG1T14 (shielded, 18 AWG); shield grounded at the magneto end only';
wire('K1A18', 18, 'S1:T:L', `${K.MAGS.L.ref}:P:P`, 'left magneto P-lead (engine left, impulse)', ['LEZ-74-100', 'LEZ-74-130'], { spec: PLEAD });
wire('K2A18', 18, 'S1:T:R', `${K.MAGS.R.ref}:P:P`, 'right magneto P-lead (engine right)', ['LEZ-74-100', 'LEZ-74-130'], { spec: PLEAD });
{ const gb = at('GB1'), tab = Object.entries(gb.conns.J.pins).find(([, v]) => v === 'SPARE'); gb.conns.J.pins[tab[0]] = 'GND'; wire('N40A18', 18, 'S1:T:G', `GB1:J:${tab[0]}`, 'key switch magneto ground', 'LEZ-74-100'); }
for (let i = WIRES.length - 1; i >= 0; i--) if (/^K[234]\d$/.test(WIRES[i].id)) WIRES.splice(i, 1);
for (const [side, M] of Object.entries(K.MAGS)) {
  const m = M.ref === 'MG1' ? 1 : 2, fires = K.FIRES[side], order = K.FIRING.map((n) => fires.find(([c]) => c === n));   // towers in firing order 1-3-2-4
  order.forEach(([n, top], i) => wire(`K${10 + m * 10 + i + 1}`, 0, `${M.ref}:T:${i + 1}`, `${plugRef(n, top)}:T:1`, `ignition, cyl ${n} ${top ? 'top' : 'bottom'} (${side} magneto tower ${i + 1})`, 'LEZ-74-110', { spec: 'ignition lead, 7 mm silicone, shielded', hv: true }));
}
// the CHT / EGT and transducer wires keep their ids and pins; their lengths follow the new routes
for (const x of WIRES) if ([].concat(x.harness).some((h) => /^LEZ-7[47]-1/.test(h))) x.len = wireLength(x);
defineWires(W);
void FT;
