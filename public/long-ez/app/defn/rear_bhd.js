// LEZ-53-175 rear seat bulkhead: the definition record (numbers from wpA2). A flat PVC sandwich at FS 130.2 cut to the
// shell's inner contour under the turtledeck, its foot notched clear of the main-gear extrusions, a hole or foot slot for
// every line through FS 130.2, ELT tray inserts on the aft face. Solid: cad/blkA_bulkhead.py. u = BL, v = WL, w = FS − 130.2.
// Notional.
import { GEO, FIXED, BASE_MAT, MATSYS } from '../structures.js';
import { PROCESS } from '../plybook.js';
import { PARTS } from '../systems.js';
import { RB, RBG, rbParams, rbMassOf, rbTape } from '../parts/wpA2_rearbhd.js';
import { RHO } from '../parts/wpA1_f28.js';
import { ELT_AT } from '../parts/wp4_avionics_cabin.js';
import { OCCS, REAR_ANCH, rearStrap, strapDeg, ACROMION, HARNESS_OPEN } from '../parts/wpB4_cabin.js';
import { flatVolumes, edgeOf, ligament, crossings, vertPlane, pip, toPlane, innerRing } from '../parts/wpA0_flat.js';
import { flatExpect, buy, plyAreas, PRICE } from './blkA_common.js';
import { LAM_ALLOW, LAM_SPEC, LAM_FORM, LAM_CURE, ppBuy, PP_VENDOR, PP_PRICE } from './p_common.js';

const fx = (x, n = 2) => x.toFixed(n), G = RBG, tB = BASE_MAT.BID.t;
export const rbParamsNow = () => rbParams();
const P = rbParams(), V = flatVolumes(P), A0 = plyAreas(P, { BID: tB }), B = buy({ BID: (A0.BID || 0) + rbTape().area * RB.tape.n });
const inSlot = (c) => G.slots.some((s) => c.u > s.R[0] && c.u < s.R[1] && c.v > s.R[2] && c.v < s.R[3]);
const extr = () => PARTS.filter((q) => q.pn === 'LEZ-32-120').flatMap((p) => p.geo.filter((g) => g.t === 'box' && Math.abs(g.c[0] - RB.s) < g.d[0] / 2 && g.d[1] * 12 < 6));
export const RB_DEF = {
  pn: 'LEZ-53-175', rev: 'B', status: 'released', nha: 'LEZ-53-150', qty: 1, kind: 'laminate',
  title: 'Rear seat bulkhead (FS 130.2)',
  solidText: 'CadQuery solid: the outline extruded layer by layer (core, flox inserts, faces), holes cut through',
  templates: 'One full-size outline template with the hole and slot positions',
  revs: [{ rev: 'A', date: '2026-11-18', short: 'Initial definition', change: `Initial definition. The rear seat-back station (FS 130.2) was drawn in the 3D model and listed in the jig, with no part, no holes and its foot over the main-gear extrusions. As defined: the shell's inner contour at FS 130.2 (closed under the turtledeck), the foot notched ${RB.gearClr} in clear of both LEZ-32-120 extrusions (no load path into the gear mount), ${G.pass.length} pass-through holes and ${G.slots.length} foot slots (brake lines) from the routed lines, ELT tray inserts; ${RB.faceBID} BID 0/90 faces on ${RB.coreIn} in H45 sized by f175-back.` },
    { rev: 'B', date: '2026-11-18', short: 'Follows block D', change: `Integration with block D (ICD phase 2): the brake lines LEZ-32-312 now run in the cabin-side corner (crossing at BL ±10.48, WL 29.23): their foot slots moved there; the gear's bonded extrusions are gone (4130 mount tubes in the belly), so the foot has no gear notches and I2 checks every LEZ-32-120 item crossing FS 130.2 against the outline. Block A's flat parts now load after blocks B, C, D and G, so their holes follow the merged routes: the roll tube LEZ-27-140 (bushed, block C) and the two rudder conduits LEZ-27-151 have holes. A baggage access opening from WL ${RB.bag.v0} to the top edge, BL ${RB.bag.u0} to ${RB.bag.u1}, opens the shelf behind the bulkhead (block B, LEZ-25-140).` }],
  effectivity: 'One per aircraft', params: P, holeNames: G.holes.map((h) => h.what),
  datums: [{ id: 'A', what: `Forward face of the core, FS ${fx(RB.s * 12 - RB.coreIn / 2, 3)}` }, { id: 'B', what: 'Centre line, BL 0' }, { id: 'C', what: `Bottom of the outline, WL ${fx(G.zBot)} (on the belly)` }],
  features: [
    { id: 'outline', kind: 'profile', label: `The shell's inner contour at FS 130.2 (OML less ${fx(RB.tsh, 3)} in), ${fx(2 * G.wIn)} × ${fx(G.zTop - G.zBot)} in; notches ${G.notches.map((R) => `BL ${fx(R[0])}…${fx(R[1])} to WL ${fx(R[3])}`).join(', ')} over the gear extrusions; baggage access opening BL ${fx(RB.bag.u0)} to ${fx(RB.bag.u1)} from WL ${fx(RB.bag.v0)} to the top edge (shelf LEZ-25-140, block B); foot slots for ${G.slots.map((s) => s.what).join(', ')}`, tol: 'Contour ±1/32 in to the template' },
    { id: 'face', kind: 'layup', label: `${RB.faceBID} × 6781 0/90 each face on ${RB.coreIn} in Divinycell HT61`, tol: 'Debulked; no bridging or porosity' },
    { id: 'elt', kind: 'hole', label: `ELT tray: ${RB.elt.n} × ${RB.elt.std} flox-potted inserts on a ${RB.elt.du} × ${RB.elt.dv} in pattern at BL ${fx(toPlane(vertPlane(RB.s), ELT_AT).u)}, WL ${fx(toPlane(vertPlane(RB.s), ELT_AT).v)} (aft face)`, tol: '±0.03 in to the tray template' },
    { id: 'pass', kind: 'hole', label: `${G.pass.length} pass-through holes (hole table) with grommets; the left raceway in one Ø ${fx(2 * Math.max(...G.pass.map((h) => h.r)))} hole; the roll tube LEZ-27-140 in a flanged acetal bushing (block C's hardware) in its hole; the rudder conduits LEZ-27-151 in grommets; edge slots for the brake lines LEZ-32-312`, tol: '±0.06 in position' },
  ],
  tolerances: { general: '.X ±0.06 · .XX ±0.03 · contour ±1/32', flatness: 'Flat within 1/16 in across the panel', holes: 'Pass-throughs ±0.06 in', breakEdges: 'All cut edges, notches and holes sealed with flox or resin' },
  drawingNotes: ['Viewed from aft (BL + to the right).', 'Notches over the gear extrusions: soft closed-cell foam seal, no flox (no load path into the gear mount).', 'The rear shoulder harness does not anchor here (CS spar top, block B).'], generalNote: 'Cured laminate tap-tested; every hole edge sealed.', na: {},
  material: { spec: '6781 S2-glass, MTM45-1 prepreg (NCAMP), Divinycell HT61 sheet, flox, NAS1832 inserts', alt: 'None', form: `${LAM_FORM()}, flat on the table`, density: null,
    allowables: [...LAM_ALLOW(false), ['HT61 core shear', 'datasheet-typical', 'BOUND (see f175-back)'], ['Flox density', `${RHO.FLOX} lb/in³`, 'Typed from memory (mass only)']] },
  process: [
    { op: 'Layup', spec: 'Flat on the table: forward face on the HT61 sheet; pot the insert pockets in flox; aft face. Bag and cure on the NCAMP M cycle (250 ± 10 °F, 4–6 h, ≥ 28 inHg; no post-cure), the part whole in the oven; witness coupon.' },
    { op: 'Cut', spec: 'To the template: outline, gear notches, foot slots and holes; seal every edge.' },
    { op: 'Install', spec: `In the fuselage jig at FS 130.2, square to the centre line; flox fillets; ${RB.tape.n} × 6781 × ${2 * RB.tape.lap} in tapes both faces all round (not across the gear notches).` },
    { op: 'Inspect', spec: 'Tap test; notch clearance to the extrusions; hole positions.' },
  ],
  checks: ['f175-back', 'f175-tape', 'f175-elt', 'f175-slab'],
  // integration 2026-11-19 (Miles): the rear shoulder-harness anchors at the top of the rear seat back (REAR_ANCH, B); the strap angle
  // from each ANSUR II occupant's shoulder, worst governing: it fails for every occupant (open decision for Miles, O1)
  rules: [{ id: 'strapR', label: `Rear shoulder strap no more than 5° below horizontal from the shoulder, worst ANSUR II occupant (${Object.entries(OCCS.rear).map(([k, sh]) => `${k} ${strapDeg(sh, [REAR_ANCH.fs, REAR_ANCH.wl]).toFixed(1)}°`).join(', ')}) (AC 21-34, faa.gov, accessed 2026-11-19) (5 − deg)`, v: 5 - rearStrap().deg, min: 0 }, { id: 'edge', label: 'Every hole ≥ 0.25 in from the outline (in)', v: Math.min(...G.holes.map((h) => edgeOf(h, [G.pts]))), min: 0.25 }, { id: 'lig', label: 'Ligament between holes ≥ 0.25 in (in)', v: ligament(G.holes), min: 0.25 }],
  mass: { each: rbMassOf({ ...V }), from: 'layer volumes × density (HT61, 6781, flox) plus the installation tapes; checked against the solid' },
  hardware: [{ std: RB.elt.std, qty: RB.elt.n, desc: 'ELT tray inserts, potted in flox (the tray and its screws are block J\'s)' }], hardwareNote: `${RB.elt.n} × ${RB.elt.std} potted inserts for the ELT tray; grommets in the pass-through holes are the line owners'.`,
  interfaces: [
    { id: 'O1', with: 'Miles (open decision, 2026-11-19)', feature: 'outline', what: 'OPEN: shoulder-harness arrangement (rear seat)', open: true, check: () => ({ ok: true, detail: `OPEN ITEM: ${HARNESS_OPEN} Rear anchors at BL ±${REAR_ANCH.u}, WL ${REAR_ANCH.wl} on the forward face (FS ${REAR_ANCH.fs.toFixed(2)}); their hard points are to be sized with the arrangement Miles decides. Shoulders from ${ACROMION.src}: ${Object.entries(OCCS.rear).map(([k, q]) => `${k} WL ${q[1].toFixed(1)}`).join(', ')}. Confirm at the seated mock-up fit check.` }) },
    { id: 'I1', with: 'LEZ-53-150 fuselage shell', feature: 'outline', what: 'Outline is the shell\'s inner contour (closed under the turtledeck)', check: () => { const t = FIXED.fuselage.coreIn + 2 * FIXED.fuselage.faceBID * tB; return { ok: Math.abs(t - RB.tsh) < 1e-9 && RB.s * 12 - RB.t / 2 > GEO.canopy[1] * 12, detail: `offset ${fx(RB.tsh, 3)} in; forward face FS ${fx(RB.s * 12 - RB.t / 2)} aft of the canopy's end FS ${fx(GEO.canopy[1] * 12)} (the aft bow lands on the turtleback, block B)` }; } },
    // block D (merged) replaced the bonded extrusions by 4130 mount tubes in the belly: the check now takes every LEZ-32-120
    // item crossing FS 130.2 (boxes and tube axes) and requires it to stay outside the outline by the notch clearance
    { id: 'I2', with: 'LEZ-32-120 main-gear attachment (block D, merged)', feature: 'outline', what: 'Every gear-attach item crossing FS 130.2 is outside the outline by ≥ the clearance (notched where it reaches in)', check: () => {
      const P = vertPlane(RB.s), segD = (p, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy || 1))); return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy); };
      const dOut = (u, v) => Math.min(...G.pts.map((a, k) => segD([u, v], a, G.pts[(k + 1) % G.pts.length])));
      const tubes = crossings(P).filter((c) => c.pn === 'LEZ-32-120').map((c) => ({ u: c.u, v: c.v, what: `tube at BL ${fx(c.u)} WL ${fx(c.v)}`, clr: pip([c.u, c.v], G.pts) ? -1 : dOut(c.u, c.v) - (c.r - 1 / 16) }));
      const boxes = PARTS.filter((q) => q.pn === 'LEZ-32-120').flatMap((p) => p.geo.filter((g) => g.t === 'box' && Math.abs(g.c[0] - RB.s) < g.d[0] / 2)).map((g) => { const c = toPlane(P, g.c), R = [c.u - g.d[1] * 6, c.u + g.d[1] * 6, c.v - g.d[2] * 6, c.v + g.d[2] * 6];
        const inside = G.pts.some((q) => q[0] > R[0] && q[0] < R[1] && q[1] > R[2] && q[1] < R[3]); return { u: c.u, v: c.v, what: `box BL ${fx(R[0])}…${fx(R[1])} WL ${fx(R[2])}…${fx(R[3])}`, clr: inside ? -1 : Math.min(...G.pts.map((q) => Math.max(R[0] - q[0], q[0] - R[1], R[2] - q[1], q[1] - R[3]))) }; });
      // items in the cabin (centre inside the shell's inner contour) keep the notch clearance; items in or under the belly
      // skin only have to stay out of the outline (the shell lies between)
      const ring = innerRing(RB.s, RB.tsh), need = (x) => (pip([x.u, x.v], ring) ? RB.gearClr : 0);
      const all = [...tubes, ...boxes], bad = all.filter((x) => x.clr < need(x) - 1e-6), w = all.reduce((a, b) => (b.clr < a.clr ? b : a), { clr: Infinity, what: 'none' });
      return { ok: !bad.length, detail: `${all.length} gear-attach items cross FS 130.2, ${all.filter((x) => need(x) > 0).length} in the cabin; closest ${w.what}, ${fx(w.clr, 3)} in outside the outline${bad.length ? `; too close: ${bad.map((x) => x.what).join(', ')}` : ''}` }; } },
    { id: 'I3', with: 'Lines routed through FS 130.2', feature: 'pass', what: 'Every crossing has a hole or a foot slot', check: () => { const all = crossings(vertPlane(RB.s)).filter((c) => pip([c.u, c.v], G.pts) || inSlot(c)), miss = all.filter((c) => !inSlot(c) && !G.pass.some((h) => Math.hypot(h.u - c.u, h.v - c.v) + c.r <= h.r + 1e-3)); return { ok: !miss.length, detail: `${all.length} crossings: ${G.pass.length} holes, ${G.slots.length} foot slots${miss.length ? `; missing ${miss.map((m) => m.pn).join(', ')}` : ''}` }; } },
    { id: 'I4', with: 'LEZ-25-160 ELT (block J)', feature: 'elt', what: 'Tray inserts centred on the ELT\'s BL and WL', check: () => { const c = toPlane(vertPlane(RB.s), ELT_AT), m = G.elt.reduce((a, h) => [a[0] + h.u / 4, a[1] + h.v / 4], [0, 0]); return { ok: Math.hypot(m[0] - c.u, m[1] - c.v) < 0.01, detail: `pattern centre BL ${fx(m[0])} WL ${fx(m[1])}; ELT BL ${fx(c.u)} WL ${fx(c.v)}` }; } },
  ],
  tooling: { needed: true, text: 'Full-size outline template with the hole centres, notches and slots; insert drill guide; fuselage jig station at FS 130.2.' },
  sourcing: { blank: `${B.bid} yd 6781 (50 in, +15 %); 1 sheet 3/8 in HT61; 4 × ${RB.elt.std}`, vendor: PP_VENDOR.vendor, url: PP_VENDOR.url,
    cost: +(B.cost + PRICE.H45sheet38 + PRICE.flox / 4 + 4 * 2.5).toFixed(2), costAsOf: '2026-11-18', perAircraft: 1, lead: 'Stock items', note: 'Prices approximate, prepreg / HT proxies (p_common PP_PRICE, BOUND) (inserts ≈ $2.50 each).' },
};
