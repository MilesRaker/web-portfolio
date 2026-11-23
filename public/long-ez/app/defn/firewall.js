// LEZ-53-180 firewall: the definition record (numbers from wpA3). Panels above and below the CS spar, flush with the spar's
// aft face at FS 153.00, the fire-protection layer over the whole aft face, hard points and gussets under the upper
// pick-ups, and the firewall layout (every hole and mounting position). Solid: cad/blkA_bulkhead.py; the cabin-side
// gussets and the edge tapes are added to the mass from their dimensions. u = BL, v = WL, w = FS − 153. Notional.
import { GEO, CS_FIT, BASE_MAT, MATSYS, fusOutline, analyse, DEFAULT_DESIGN } from '../structures.js';
import { PROCESS } from '../plybook.js';
import { PASS, partByPN } from '../systems.js';
import { FW, FWG, LAYOUT, UPK_FW, fwParams, fwMassOf, fwRibs, fwTape, fwLayers, FW_RHO } from '../parts/wpA3_firewall.js';
import { UPK } from '../parts/wp23_upk.js';
import { BRK } from '../parts/wp6_engine_install.js';
import { MOUNT } from '../parts/wp1_powerplant.js';
import { pickAN, AN_THREAD } from '../parts/wp16_wing_attach.js';
import { UPK_DEF } from './upper_pickup.js';
import { HARD } from '../parts/wp15_cs_spar.js';
import { flatVolumes, edgeOf, ligament, crossings, vertPlane, pip, toPlane } from '../parts/wpA0_flat.js';
import { flatExpect, buy, plyAreas, PRICE } from './blkA_common.js';
import { FW_LAYOUT as I_FWL } from '../parts/wpI0_layout.js';
import { LAM_ALLOW, LAM_SPEC, LAM_FORM, LAM_CURE, ppBuy, PP_VENDOR, PP_PRICE } from './p_common.js';

const fx = (x, n = 2) => x.toFixed(n), G = FWG, tB = BASE_MAT.BID.t, S = FW.s * 12;
export const fwParamsNow = () => fwParams();
const P = fwParams(), V = flatVolumes(P), A0 = plyAreas(P, { BID: tB }), RB = fwRibs();
const B = buy({ BID: (A0.BID || 0) + fwTape().area * FW.tape.n + RB.reduce((a, r) => a + r.bidA, 0), UNI: RB.reduce((a, r) => a + r.uniA, 0) });
const gripUPK = FW.tp + FW.steel, upkAN = pickAN(UPK.nb, UPK.tb + gripUPK + UPK.tk + 0.063), sparAN = pickAN(BRK.an, GEO.csSpar.width * 12 + FW.steel + BRK.sec.t + 2 * 0.063), pickAN6 = pickAN(6, FW.tp + FW.steel + BRK.sec.t + 2 * 0.063);
/** grip of an AN bolt from its part number (wp16 rule: nominal = dash + 3/32 in, less the thread) */
const gripOf = (std) => { const m = /^AN(\d+)-(\d+)A$/.exec(std); const n = +m[1], c = +m[2], L = Math.floor(c / 10) + (c % 10) / 8; return L + 3 / 32 - AN_THREAD[n]; };
const lay = LAYOUT.map((L) => { const h = G.holes.filter((q) => q.id === L.id); return { ...L, h }; });
/** where each layout item is today in the systems model (pass-through or the item's own geometry), for the movers */
const today = (L) => { const ps = PASS.find((q) => (L.id === 'power' && q.id === 'fw-power') || (L.id === 'cables' && q.id === 'fw-cables') || (L.id === 'fuel' && q.id === 'fw-fuel')); if (ps) return toPlane(vertPlane(FW.s), ps.at);
  const p = partByPN(L.pn);
  // integration 2026-11-19: a line item (the primer's bulkhead unions) is where its first path crosses the firewall plane
  if (L.kind === 'fit' && L.id === 'primer' && p) { const g = p.geo.find((q) => q.t === 'path' && q.pts.some((x) => x[0] < FW.s) && q.pts.some((x) => x[0] > FW.s)); if (g) { const i = g.pts.findIndex((x, k) => k && (x[0] - FW.s) * (g.pts[k - 1][0] - FW.s) <= 0), a = g.pts[i - 1], b = g.pts[i], t = (FW.s - a[0]) / (b[0] - a[0]); return toPlane(vertPlane(FW.s), a.map((v, k) => v + (b[k] - v) * t)); } }
  const g = p && p.geo.find((q) => q.t === 'box' || q.t === 'cyl'); return g ? toPlane(vertPlane(FW.s), g.c || g.a) : null; };
const keepouts = () => [...G.win.map((R) => ({ R, what: 'fitting window' })), ...G.ribs.map((r) => ({ R: [r.u - r.t / 2 - FW.keep, r.u + r.t / 2 + FW.keep, r.v0 - 1, r.v1], what: 'gusset' })), { R: [-99, 99, CS_FIT.L * 12 - FW.keep, CS_FIT.U * 12 + FW.keep], what: 'spar band' }];
const clearOf = (h) => keepouts().every((k) => h.u + h.r <= k.R[0] || h.u - h.r >= k.R[1] || h.v + h.r <= k.R[2] || h.v - h.r >= k.R[3]);
export const FW_DEF = {
  pn: 'LEZ-53-180', rev: 'B', status: 'released', nha: 'LEZ-53-150', qty: 1, kind: 'laminate',
  title: 'Firewall',
  solidText: 'CadQuery solid: the panels and the fire layer extruded layer by layer (faces, core, hard points, inserts, paper, CRES sheet, patches), holes cut through; the gussets are dimensioned in the record',
  templates: 'Outline templates for both panels and the fire layer with every hole; the pick-up hard-point drill guide (from the mount jig)',
  revs: [{ rev: 'A', date: '2026-11-18', short: 'Initial definition', change: `Initial definition. The firewall had no thickness, no outline and no fire layer: every firewall-aft part was drawn from FS 153.00 with the firewall taken as 0, 0.05, ≤ 0.25 or 0.50 in. As defined (coordinator decision M-1): FS 153.00 is the aft face everywhere; ${fx(FW.tp, 4)} in sandwich panels (2 BID on 3/16 in H45) above and below the CS spar lie forward of it, the spar's aft face is the firewall across its depth; ${FW.paper} in ceramic paper under ${FW.steel} in CRES sheet aft of it, with CRES patches and no paper under the fittings. Hard points (solid BID) under the pick-ups, with two cabin-side gussets each (fw-hp, fw-rib); the shell's side-panel hard point F-D3 is removed (M-5). The record fixes the layout of every pass-through and firewall item clear of the brackets, pick-ups, gussets and spar band (M-3, G-F3).` },
    { rev: 'B', date: '2026-11-18', short: 'Follows the released pick-ups; layout re-placed', change: `Integration with block G (ICD phase 2). The upper pick-up hard points, windows and gussets now follow LEZ-71-222 rev C, centred on the mount node (BL ±${fx(Math.abs(MOUNT.nodes.FTL[1]) * 12)}, WL ${fx(MOUNT.nodes.FTL[2] * 12)}); the base offset rev A proposed is withdrawn. At G's rev B node (WL 41.46) the cabin-side backing plate ran 0.43 in into the CS spar's top, so the mount moved to rev C (1.0 in down, 1.5 in inboard of the original). The starter contactor, ground block and overvoltage relay move between the inboard gussets. Region volumes count overlapping windows once (record and solid agreed to 2–3 % only). I5 lists the F/H/I movers as open items; I3, I4 and I7 check the released fittings, grips and the cowl hinge band.` }],
  effectivity: 'One per aircraft', params: P, holeNames: G.holes.map((h) => h.what),
  datums: [{ id: 'A', what: `Aft face, FS ${fx(S)} (= the CS spar's aft face)` }, { id: 'B', what: 'Centre line, BL 0' }, { id: 'C', what: `CS spar upper face, WL ${fx(CS_FIT.U * 12, 3)}` }],
  features: [
    { id: 'outline', kind: 'profile', label: `Upper panel: the shell's inner contour at FS 153 above WL ${fx(CS_FIT.U * 12)}; lower panel: below WL ${fx(CS_FIT.L * 12)}; ${fx(2 * G.wIn)} in wide; edges flox-bonded to the spar's faces`, tol: 'Contour ±1/32 in; aft faces flush with the spar ±1/32 in' },
    { id: 'face', kind: 'layup', label: `${FW.faceBID} × 6781 0/90 each face on ${FW.coreIn} in Divinycell HT61 (${fx(FW.tp, 4)} in), forward of A`, tol: 'Debulked; no bridging or porosity' },
    { id: 'hp', kind: 'layup', label: `Hard points: solid 6781 in place of the core, ${fx(UPK.B + 2 * FW.hpMargin)} in wide under each upper pick-up base (centre BL ±${fx(Math.abs(MOUNT.nodes.FTL[1]) * 12 + UPK_FW.du)}, WL ${fx(MOUNT.nodes.FTL[2] * 12 + UPK_FW.dv)}) and 2 × 2 in at each lower pick-up`, tol: 'Edges ±0.25 in' },
    { id: 'rib', kind: 'layup', label: `Gussets (cabin side), two per upper pick-up at BL ${[...new Set(G.ribs.map((r) => fx(Math.abs(r.u))))].join(' / ')}: ${FW.rib.core} in HT61, ${FW.rib.depth} in deep fore-aft, ${FW.rib.webBID} × 6781 webs, ${FW.ribCap} × 6781 0/90 × ${FW.rib.capW} in cap on the forward edge, lapped ${FW.rib.lap} in onto the spar top`, tol: 'Square to the panel ±1°' },
    { id: 'fire', kind: 'layup', label: `Fire layer: ${FW.paper} in ceramic-fibre paper under ${FW.steel} in CRES (321 or 304) sheet over the whole aft face to ${FW.fireOff} in inside the OML; no paper under the fittings (CRES patch on the structure, fire sealant round)`, tol: 'Sheet joints lapped ≥ 1/2 in' },
    { id: 'equip', kind: 'hole', label: `Firewall layout: ${LAYOUT.length} items (table) in flox inserts or fire-sealed fittings`, tol: '±0.03 in to the layout template' },
    { id: 'upk', kind: 'hole', label: `Upper pick-up base bolts 8 × Ø ${fx(2 * G.holes.find((h) => h.id === 'upk').r, 3)} on a ${UPK.p} in square, match-drilled with LEZ-71-222`, tol: 'Through the mount-jig guide', assy: true },
    { id: 'brk', kind: 'hole', label: 'Lower bracket pick-up and spar bolts (the spar bolts through the fire layer only)', tol: 'Match-drilled with LEZ-71-223', assy: true },
  ],
  tolerances: { general: '.X ±0.06 · .XX ±0.03 · contour ±1/32', flatness: 'Aft face flat within 1/16 in across the panels and spar', holes: 'Layout holes ±0.03 in; structural holes match-drilled', breakEdges: 'All cut edges sealed with flox' },
  drawingNotes: ['Viewed from aft (BL + to the right). Dashed: hard points, fitting windows, gussets (cabin side).', 'Fire protection notional: CRES ≥ 0.015 in (titanium ≥ 0.016) is in the FAR 23.1191(h) list of firewall materials accepted without test (14 CFR Part 23, 2011 ed., confirmed 2026-11-19); fireproof test 2,000 ± 150 °F for 15 min per AC 20-135A (2025-09-29), which refers to SAE AS6826 for pass/fail. Ceramic paper density from the Fiberfrax 970J vendor data, heavy end.', 'Firewall-aft equipment no deeper than 2.5 in aft of A over the accessory case (magnetos, block G).'],
  generalNote: 'Cured laminate tap-tested; every pass-through fire-sealed.', na: {},
  material: { spec: '6781 S2-glass (caps 6781 laid 0/90), MTM45-1 prepreg (NCAMP), Divinycell HT61 3/16 and 3/8 in, flox; ceramic-fibre paper 1/8 in; CRES 321 sheet 0.016 in; fire sealant', alt: 'Titanium sheet 0.016 in for the CRES (same list, typed from memory)', form: `${LAM_FORM()}`, density: null,
    allowables: [...LAM_ALLOW(false), ['Paper / CRES densities', `${fx(FW_RHO.PAPER, 4)} / ${FW_RHO.SS} lb/in³`, 'Paper: Fiberfrax 970J 10.1–13.4 lb/ft³, heavy end (Aircraft Spruce 05-02679 Q&A, accessed 2026-11-19); CRES: systems DENSITY (mass only)']] },
  process: [
    { op: 'Layup', spec: 'Panels flat on the table: forward face, core with the hard-point 6781 packs and insert pockets potted, aft face. Bag and cure on the NCAMP M cycle (250 ± 10 °F, 4–6 h, ≥ 28 inHg; no post-cure), the part whole in the oven; witness coupon. Cut to the templates.' },
    { op: 'Install', spec: `Bond the panels edge-on to the CS spar's faces (flox), aft faces flush with the spar; ${FW.tape.n} × 6781 × ${2 * FW.tape.lap} in tapes to the shell and the spar, both faces. Build the gussets in place on the cabin side.` },
    { op: 'Fire layer', spec: 'Drill the layout; bond the ceramic paper; fit the CRES sheet and the patches under the fittings; fire sealant at every edge and pass-through.' },
    { op: 'Inspect', spec: 'Tap test; flatness of the aft face; every pass-through sealed.' },
  ],
  checks: ['fw-hp', 'fw-rib', 'fw-tape', 'fw-equip', 'fus-engine', 'fw-slab'],
  rules: [
    { id: 'edge', label: 'Every panel hole ≥ 0.25 in from the panel outline (in)', v: Math.min(...G.holes.filter((h) => G.panels.some((q) => pip([h.u, h.v], q))).map((h) => edgeOf(h, G.panels))), min: 0.25 },
    { id: 'lig', label: 'Ligament between holes ≥ 0.25 in (in)', v: ligament(G.holes), min: 0.25 },
    { id: 'keep', label: 'Layout items clear of the fitting windows, gussets and spar band (count of clashes, 0 required → v = −clashes)', v: -lay.flatMap((L) => L.h).filter((h) => !clearOf(h)).length, min: 0 },
    { id: 'hpfus', label: 'Upper hard point at least as thick as the laminate fus-engine bears on (in)', v: FW.tp - analyse(DEFAULT_DESIGN, false).Z.fwPlies * tB, min: 0 },
    { id: 'steel', label: 'CRES sheet ≥ 0.015 in (FAR 23.1191 list, typed from memory) (in)', v: FW.steel, min: 0.015 },
  ],
  mass: { each: fwMassOf({ ...V }), from: 'layer volumes × density (6781, HT61, flox, paper, CRES) plus the edge tapes and the gussets from their dimensions; checked against the solid' },
  hardware: LAYOUT.filter((L) => L.kind === 'equip').map((L) => ({ std: 'AN970-3', qty: L.pts.length, desc: `large-area washers, cabin face, ${L.pn}` })), hardwareNote: `Firewall items bolt with AN3 bolts through flox inserts, AN970-3 washers on the cabin face (bolts and nuts are the items' owners'). Grips: LEZ-71-222 base bolts ${upkAN.std} (base ${UPK.tb} + firewall ${fx(gripUPK, 4)} + backing plate ${UPK.tk} + washer); CS spar mount bolts ${sparAN.std} (spar ${fx(GEO.csSpar.width * 12)} + patch ${FW.steel} + leg ${BRK.sec.t} + 2 washers); lower pick-up ${pickAN6.std}.`,
  layout: lay.map((L) => ({ id: L.id, pn: L.pn, block: L.blk, what: L.what, holes: L.h.map((h) => [h.u, h.v, 2 * h.r]), today: today(L) })),
  interfaces: [
    { id: 'I1', with: 'LEZ-57-140 CS spar', feature: 'outline', what: 'Panel edges on the spar\'s upper and lower faces; aft faces flush at FS 153', check: () => { const up = Math.min(...G.upper.map((q) => q[1])), lo = Math.max(...G.lower.map((q) => q[1])); return { ok: Math.abs(up - CS_FIT.U * 12) < 1e-6 && Math.abs(lo - CS_FIT.L * 12) < 1e-6 && Math.abs((GEO.csSpar.s + GEO.csSpar.width / 2) - FW.s) < 1e-9, detail: `panels end at WL ${fx(up, 3)} / ${fx(lo, 3)}; spar faces ${fx(CS_FIT.U * 12, 3)} / ${fx(CS_FIT.L * 12, 3)}; spar aft face FS ${fx((GEO.csSpar.s + GEO.csSpar.width / 2) * 12)}` }; } },
    { id: 'I2', with: 'LEZ-53-150 fuselage shell', feature: 'outline', what: 'Panels on the shell\'s inner contour; shell hard point F-D3 removed', check: () => ({ ok: Math.abs(G.wIn - Math.max(...G.ring.map((q) => q[0]))) < 1e-9, detail: `half-width ${fx(G.wIn, 3)} in at the inner contour` }) },
    { id: 'I3', with: 'LEZ-71-222 upper pick-ups rev C (block G, released)', feature: 'upk', what: 'Base pattern centred on the node as G draws it; firewall at the base ≤ the drawn grip; G\'s base bolts cover the stack; the cabin-side backing plate clears the spar top', check: () => {
      const nd = { u: Math.abs(MOUNT.nodes.FTL[1]) * 12, v: MOUNT.nodes.FTL[2] * 12 }, h = G.holes.filter((q) => q.id === 'upk' && q.u > 0), cu = h.reduce((a, q) => a + q.u, 0) / h.length, cv = h.reduce((a, q) => a + q.v, 0) / h.length;
      const std = UPK_DEF.hardware[0].std, grip = gripOf(std), stack = UPK.tb + gripUPK + UPK.tk + 0.063, clr = nd.v - UPK.Bk / 2 - CS_FIT.U * 12;
      const ok = Math.hypot(cu - nd.u, cv - nd.v) < 1e-3 && gripUPK <= FW.TFW_MAX + 1e-9 && grip >= stack - 1e-9 && grip - stack <= 0.125 && clr >= 0.06 - 1e-9;
      return { ok, detail: `pattern centre BL ±${fx(cu)} WL ${fx(cv)}, node BL ±${fx(nd.u)} WL ${fx(nd.v)}; firewall at the base ${fx(gripUPK, 4)} in (≤ ${FW.TFW_MAX}); ${std} grip ${fx(grip, 3)} for the ${fx(stack, 3)} in stack; backing plate ${fx(clr, 3)} in above the spar top (≥ 0.06)` }; } },
    { id: 'I4', with: 'LEZ-71-223 lower brackets rev B and the CS spar mount hard point (released)', feature: 'brk', what: 'Leg A on the CRES patch keeps its released room; pick-up and spar holes at the bracket\'s; the spar\'s mount-bolt grip is the real stack', check: () => {
      const left = BRK.room - BRK.sec.t - FW.steel, hm = HARD.find((x) => x.id === 'mount'), stack = GEO.csSpar.width * 12 + FW.steel + BRK.sec.t + 0.125, holesOk = [1, -1].every((sg) => [MOUNT.nodes.FBL[2] * 12, ...BRK.zSpar.map((z) => CS_FIT.L * 12 + z)].every((v) => G.holes.some((q) => q.id === 'brk' && Math.abs(q.u - sg * Math.abs(MOUNT.nodes.FBL[1]) * 12) < 1e-3 && Math.abs(q.v - v) < 1e-3)));
      return { ok: left >= 0 && holesOk && Math.abs(hm.grip - stack) < 1e-6, detail: `room ${fx(BRK.room, 3)} − leg ${BRK.sec.t} − patch ${FW.steel} = ${fx(left, 3)} in; 8 bracket holes at the bracket's; spar bolts ${hm.hw.bolt} for a ${fx(stack, 3)} in stack (spar ${fx(GEO.csSpar.width * 12)} + patch + leg + 2 washers; the spar's grip ${fx(hm.grip, 3)})` }; } },
    { id: 'I5', with: 'Pass-throughs and firewall items (blocks F, H, I)', feature: 'equip', what: 'Every item on its layout hole: the item at the first layout point, or (block I\'s equipment, mounted between its holes) its mounting holes equal the layout points (wpI0 FW_LAYOUT, which its records check)', check: () => { const onI = (L) => { const h = I_FWL[L.id]; return Array.isArray(h) && h.length === L.pts.length && h.every((q, i) => Math.hypot(q[0] - L.pts[i][0], q[1] - L.pts[i][1]) <= 0.01); };
      const mv = lay.map((L) => ({ L, t: today(L) })).filter(({ L, t }) => !onI(L) && (!t || Math.hypot(t.u - L.pts[0][0], t.v - L.pts[0][1]) > 0.05));
      return { ok: !mv.length, detail: `${LAYOUT.length} items: ${LAYOUT.filter((L) => onI(L)).map((L) => `${L.pn} (block ${L.blk}) holes on the layout`).join(', ')}; the rest at their layout points` + (mv.length ? '; OFF: ' : '') +  `${LAYOUT.length} items on the layout; ${mv.length} to move: ${mv.map(({ L, t }) => `${L.pn} (block ${L.blk}) ${t ? `from BL ${fx(t.u)} WL ${fx(t.v)}` : '(no geometry yet)'} to ${L.pts.map(([u, v]) => `BL ${fx(u)} WL ${fx(v)}`).join(' + ')}${L.kind === 'pass' || L.kind === 'fit' ? ` (Ø ${fx(2 * L.r)})` : ' (AN3)'}`).join('; ')}` }; } },
    { id: 'I7', with: 'LEZ-71-120 cowl hinge flange band (block G, merged)', feature: 'equip', what: 'Every firewall hole clear of the hinge-flange band (0.6 in inside the OML at FS 153)', check: () => {
      const o = fusOutline(FW.s, 720, 0).pts.map(([y, z]) => [y * 12, z * 12]), d = (h) => Math.min(...o.map((a, k) => { const b = o[(k + 1) % o.length], dx = b[0] - a[0], dy = b[1] - a[1], t = Math.max(0, Math.min(1, ((h.u - a[0]) * dx + (h.v - a[1]) * dy) / (dx * dx + dy * dy || 1))); return Math.hypot(h.u - a[0] - t * dx, h.v - a[1] - t * dy); })) - h.r;
      const m = G.holes.reduce((a, h) => { const x = d(h); return x < a.x ? { x, h } : a; }, { x: Infinity, h: null });
      return { ok: m.x >= 0.6, detail: `closest hole ${m.h.what.split(' ')[0]} at BL ${fx(m.h.u)} WL ${fx(m.h.v)}: ${fx(m.x, 3)} in inside the OML (band 0.6 in)` }; } },
    { id: 'I8', with: 'LEZ-28-155 fuel bulkhead union (block F, FM-9)', feature: 'equip', what: 'Each fire-sealed bulkhead fitting clamps a hard stack: CRES patch window and flox insert ≥ the nut pad round the hole', check: () => {
      const fits = G.holes.filter((h) => h.kind === 'fit'), inR = (h, Rs) => Rs.some((R) => h.u - h.r - FW.fitPad >= R[0] - 1e-6 && h.u + h.r + FW.fitPad <= R[1] + 1e-6 && h.v - h.r - FW.fitPad >= R[2] - 1e-6 && h.v + h.r + FW.fitPad <= R[3] + 1e-6), bad = fits.filter((h) => !inR(h, G.fitWin) || !inR(h, G.ins));
      return { ok: fits.length > 0 && !bad.length, detail: `${fits.length} fitting hole(s): patch window and flox insert ${FW.fitPad} in round each; clamped stack ${fx(FW.tp + FW.steel, 4)} in (as the mount fittings)${bad.length ? `; not hard under: ${bad.map((h) => h.what).join(', ')}` : ''}` }; } },
    { id: 'I6', with: 'Fire protection (FAR 23.1191)', feature: 'fire', what: 'The fire layer covers both panels and the spar band', check: () => { const ok = G.panels.every((q) => q.every((p) => pip(p, G.fire))); return { ok, detail: `CRES ${FW.steel} in over ${FW.paper} in paper to ${FW.fireOff} in inside the OML` }; } },
  ],
  tooling: { needed: true, text: 'Outline templates for both panels and the fire layer with the layout; the mount jig\'s firewall plate as the drill guide for the pick-up and bracket holes; gusset templates.' },
  sourcing: { blank: `${B.bid} yd 6781, ${B.uni} yd 6781 0/90 (50 in, +15 %); 1 sheet 3/16 in and offcut 3/8 in HT61; ceramic paper 1/8 in × 2 × 3 ft; CRES 0.016 in sheet 2 × 3 ft; fire sealant`, vendor: PP_VENDOR.vendor, url: PP_VENDOR.url,
    cost: +(B.cost + PRICE.H45sheet316 + PRICE.fiberfrax + PRICE.ss016 + PRICE.flox / 2).toFixed(2), costAsOf: '2026-11-18', perAircraft: 1, lead: 'Stock items', note: 'Prices approximate, prepreg / HT proxies (p_common PP_PRICE, BOUND).' },
};
void fwLayers; void crossings;
