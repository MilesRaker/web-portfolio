// LEZ-32-320 main wheel pant (bought-in, trimmed) and LEZ-32-321 its mounting (machined), right side drawn; the left is the
// mirror placement. DC-013 (2026-11-23): closes LEZ-32-300 open item O1 (the pants had no part number, mass or mounting).
// Solids: primitives (parts/wpD3_pant.js), built and measured by tools/pant_solids.py (trimesh + manifold3d). Notional.
import { PANT_P, PANT_LB, BRKT_P, BRKT_RHO, PNT, PBK, pantMount } from '../parts/wpD3_pant.js';
import { AXB, BOW, S0, ZAX } from '../parts/wpD1_gear.js';
import { STACK } from '../parts/wpD2_brakes.js';
import { DEFAULT_DESIGN } from '../structures.js';
import { primVolumes, primMass, rhoFrom } from './d_prims.js';

const fx = (x, n = 2) => x.toFixed(n);
export const PNT_RHO = rhoFrom(PANT_P, PANT_LB);
const DATE = '2026-11-23';

export const PNT_DEF = {
  pn: 'LEZ-32-320', rev: 'A', status: 'in work', nha: 'LEZ-32-300', qty: 2, kind: 'cots',
  title: 'Main wheel pant',
  revs: [{ rev: 'A', date: DATE, short: 'Initial definition (DC-013)', change: `Initial definition, closing LEZ-32-300 open item O1. A bought-in pre-moulded glass pant for the 5.00-5 tyre (the airframe model's PANT shape: ${fx(PNT.len[1] - PNT.len[0], 1)} in long, inner faces of the walls at BL ${PNT.wallIn} and ${PNT.wallOut}), trimmed: the tyre slot; a slot in the inner wall from its top edge down to WL ${PNT.cut.wl[0]}, FS ${PNT.cut.fs[0]}–${PNT.cut.fs[1]}, because the leg end comes down through the plane of that wall; two #10 holes either side of the slot onto LEZ-32-321's feet; an AN4 hard-point in the outer wall onto the axle-end standoff. It rides on the leg end and the axle, so it moves with the wheel.` }],
  effectivity: 'Left and right (mirror)', params: PANT_P,
  datums: [{ id: 'A', what: `Axle centre line, FS ${fx(S0, 1)}, WL ${fx(ZAX)}` }, { id: 'B', what: `Inner wall, BL ${PNT.wallIn}` }],
  features: [
    { id: 'shell', kind: 'profile', label: `Pre-moulded glass shell, envelope FS ${PNT.len[0]}–${PNT.len[1]}, WL ${PNT.wl[0]}–${PNT.wl[1]}, BL ${fx(PNT.wallIn - PNT.t)}–${fx(PNT.wallOut + PNT.t)}; wall ${PNT.t} in`, tol: 'Vendor mould' },
    { id: 'slot', kind: 'cut', label: `Leg slot in the inner wall: FS ${PNT.cut.fs[0]}–${PNT.cut.fs[1]}, from WL ${PNT.cut.wl[0]} up through the top edge (leg end + 1/4 in; hose ≥ 1/8 in from the aft edge); edge sealed with a split rubber gap seal`, tol: '±0.06' },
    { id: 'holes', kind: 'hole', label: `2 × Ø0.201 at FS ${PBK.screwFs.join(' and ')}, WL ${PBK.screwWl} through the inner wall (match-drilled through LEZ-32-321's feet); Ø0.257 AN4 hole on the axle line in the outer wall with a flox hard-point and 1 BID doubler inside`, tol: 'Match-drilled' },
  ],
  tolerances: { general: '±0.06 trim lines', holes: 'Match-drilled on the aircraft', breakEdges: 'Sand and seal the trimmed edges' },
  drawingNotes: ['Right shown; left mirror.', 'Trim on the aircraft with the wheel on and the gear on the ground: tyre-to-shell running clearance ≥ 3/4 in (gear-pant-clear).'], generalNote: 'Paint inside white; drain hole at the lowest point aft of the tyre.',
  na: { cut: 'Bought-in moulding: the trim lines are on the drawing', layup: 'Bought-in moulding (vendor layup)' },
  material: { spec: 'Pre-moulded E-glass / epoxy wheel pant for a 5.00-5 tyre (Long-EZ type), vendor layup', alt: 'Shop-made: 2 BID over a foam plug, cut off and finished (adds layup and cut fields)', form: 'moulding', density: null,
    allowables: [['Glass bearing at the screws', '40 ksi', 'BOUND: conservative E-glass/epoxy'], ['Effective density of the envelope', `${PNT_RHO.shell.toFixed(5)} lb/in³`, 'DERIVED from the vendor weight (BOUND, typed)']] },
  process: [{ op: 'Trim', spec: 'Tyre slot and the leg slot to the drawing; fit on the aircraft, gear on the ground, check the tyre turns free.' }, { op: 'Install', spec: 'Slide on from outboard; 2 × NAS1352-3 into the nutplates on LEZ-32-321 (20 in·lb); AN4 through the outer hard-point into the standoff (50 in·lb); gap seal on the slot edges.' }],
  checks: ['gear-pant-clear', 'gear-pant-heat', 'gear-pant-mount', 'gear-pant-cutout'],
  rules: [{ id: 'slot', label: 'Leg slot clear of the leg end (in)', v: Math.min(S0 - BOW.w1 / 2 - PNT.cut.fs[0], PNT.cut.fs[1] - S0 - BOW.w1 / 2), min: 0.25 }],
  mass: { each: primMass(primVolumes(PANT_P), PNT_RHO), from: 'envelope volume × effective density set from the vendor weight (BOUND, typed)' },
  hardware: [{ std: 'NAS1352-3-8P', qty: 2, desc: '#10 socket-head screws, inboard, into the bracket nutplates' }, { std: 'AN960-10L', qty: 2, desc: 'washers under the screw heads' }, { std: 'AN4-5A', qty: 1, desc: 'outboard bolt into the axle-end standoff' }, { std: 'AN970-4', qty: 1, desc: 'large-area washer on the outer hard-point' }],
  hardwareNote: 'Screws 20 in·lb, AN4 50 in·lb (AC 43.13-1B table 7-1, low end for a composite hard-point); safety the AN4 with a drilled head or thread locker per the vendor.',
  interfaces: [
    { id: 'I1', with: 'LEZ-32-321 bracket feet', feature: 'holes', what: 'Screw holes on the feet\'s nutplates, inside the inner wall', check: () => ({ ok: PBK.screwFs.every((f) => f < PNT.cut.fs[0] - 0.5 || f > PNT.cut.fs[1] + 0.5) && Math.abs(BRKT_P.prims[3].c[0] - BRKT_P.prims[3].d[0] / 2 - PNT.wallIn) < 1e-6, detail: `screws at FS ${PBK.screwFs.join(', ')} outside the slot; feet on BL ${PNT.wallIn}` }) },
    { id: 'I2', with: 'LEZ-32-321 axle-end standoff', feature: 'holes', what: 'Standoff end on the outer wall\'s inner face, on the axle line', check: () => ({ ok: Math.abs(PBK.so.bl[1] - PNT.wallOut) < 1e-6, detail: `standoff to BL ${PBK.so.bl[1]}, wall BL ${PNT.wallOut}` }) },
    { id: 'I3', with: 'LEZ-32-170 leg end and LEZ-32-312 hose', feature: 'slot', what: 'Leg and hose inside the slot with the gaps', check: () => { const g = Math.min(S0 - BOW.w1 / 2 - PNT.cut.fs[0], PNT.cut.fs[1] - S0 - BOW.w1 / 2); const h = PNT.cut.hoseAt; const hg = h ? Math.min(h[0] - PNT.cut.hoseR - PNT.cut.fs[0], PNT.cut.fs[1] - h[0] - PNT.cut.hoseR) : 0; return { ok: g >= 0.25 - 1e-9 && hg >= 0.125, detail: `leg ${fx(g)} in each side; hose ${fx(hg)} in from the slot edge` }; } },
    { id: 'I4', with: 'LEZ-32-300 tyre', feature: 'shell', what: 'Running clearance (gear-pant-clear)', check: () => ({ ok: true, detail: 'see gear-pant-clear' }) },
  ],
  tooling: { needed: false, text: 'None: the bracket feet are the drill guide for the inboard holes.' },
  sourcing: { blank: '—', vendor: 'Pre-moulded Long-EZ 500 × 5 wheel pants: candidate Aero Composites (project note claude/open-items.md: about $520 the set, ≈ 2.5 lb each; not yet confirmed here); or shop-made', url: '', cost: null, costAsOf: null, perAircraft: 2, lead: 'TBD', note: 'Open: vendor, part number, mass and price to be confirmed (this is why the record is in work).' },
};

const P = BRKT_P.prims, M = pantMount(DEFAULT_DESIGN);
export const PBK_DEF = {
  pn: 'LEZ-32-321', rev: 'A', status: 'released', nha: 'LEZ-32-320', qty: 2, kind: 'machined',
  title: 'Wheel-pant mounting',
  revs: [{ rev: 'A', date: DATE, short: 'Initial definition (DC-013)', change: `Initial definition. Inboard: a ${PBK.t} in 6061-T6 bracket whose web (FS ${PBK.web.fs.join('–')}, WL ${PBK.web.wl.join('–')}) is clamped under the heads of the two upper axle bolts on the torque plate's outboard face (BL ${PBK.web.bl[0]}); arms run inboard fore and aft of the leg end and the heat shield to feet on the pant's inner wall (BL ${PNT.wallIn}) carrying MS21047L3 nutplates. Outboard: a Ø${2 * PBK.so.r} 6061-T6 standoff from the axle nut's pant boss (BL ${PBK.so.bl[0]}) to the outer wall (BL ${PBK.so.bl[1]}), tapped 1/4-28.` }],
  effectivity: 'Left and right (mirror)', params: BRKT_P,
  datums: [{ id: 'A', what: `Torque plate outboard face, BL ${STACK.x3}` }, { id: 'B', what: `Axle centre, FS ${fx(S0, 1)}, WL ${fx(ZAX)}` }],
  features: [
    { id: 'bracket', kind: 'plate', label: `0.125 6061-T6, bent: web ${fx(PBK.web.fs[1] - PBK.web.fs[0])} × ${fx(PBK.web.wl[1] - PBK.web.wl[0])} with 2 × Ø${fx(AXB.D + 0.006, 3)} on FS ±${AXB.a} at WL ${fx(ZAX + AXB.b)} (B + ${AXB.b}); arms ${fx(PBK.web.bl[1] - PNT.wallIn)} inboard; feet ${fx(PBK.web.fs[0] - PBK.footFs[0])} long with Ø0.196 at FS ${PBK.screwFs.join(' / ')}`, tol: 'Bends R 0.19 (1.5 t); holes ±0.005' },
    { id: 'standoff', kind: 'turned', label: `Ø${2 * PBK.so.r} × ${fx(PBK.so.bl[1] - PBK.so.bl[0])} 6061-T6, 3/8-24 stud on the axle nut's pant boss, outer end tapped 1/4-28 × 0.6 deep`, tol: '±0.005 on length' },
  ],
  tolerances: { general: '.XX ±0.02', holes: '±0.005', breakEdges: 'Deburr, R 0.02' },
  drawingNotes: ['Right shown; left mirror.', 'Upper two axle bolts one length longer than the lower two (the web is under their heads).'], generalNote: 'Alodine 1201 and prime.',
  na: { cut: 'Flat pattern from the bend table (sheet part)', layup: 'Metal part' },
  material: { spec: 'AMS-QQ-A-250/11 6061-T6 sheet 0.125; AMS-QQ-A-225/8 6061-T6 bar Ø0.75', alt: '2024-T3 sheet', form: 'sheet, bar', density: BRKT_RHO.bracket, allowables: [['6061-T6 F_tu / F_bru', '42 / 88 ksi', 'MMPDS-typical']] },
  process: [{ op: 'Machine', spec: 'Shear and drill flat; bend; turn the standoff, tap 1/4-28.' }, { op: 'Install', spec: 'Web under the upper axle bolt heads (washer under the head); nutplates riveted on the feet (MS20426AD3); standoff on the axle nut.' }],
  checks: ['gear-pant-mount'],
  rules: [{ id: 'arm', label: 'Arms clear the heat shield fore and aft (in)', v: Math.min(108.25 - (PBK.web.fs[0] + PBK.t), PBK.web.fs[1] - PBK.t - 112.75), min: 0.1 }, { id: 'mount', label: 'Mount margin (gear-pant-mount)', v: M.ms, min: 0 }],
  mass: { each: primMass(primVolumes(BRKT_P), BRKT_RHO), from: 'solid volume × 0.098 lb/in³ (6061)' },
  hardware: [{ std: 'MS21047L3', qty: 2, desc: 'nutplates on the feet' }, { std: 'MS20426AD3-4', qty: 4, desc: 'nutplate rivets' }, { std: `AN${AXB.nb} (upper axle bolts, +1 length)`, qty: 2, desc: 'the LEZ-32-310 upper axle bolts, one length longer, clamp the web' }],
  hardwareNote: 'The web adds 0.125 in to the upper two axle bolts\' grip: those two are one dash length longer (LEZ-32-310 rev B); torque unchanged.',
  interfaces: [
    { id: 'I1', with: 'LEZ-32-310 upper axle bolts', feature: 'bracket', what: 'Web holes on the two upper bolts of the axle pattern', check: () => { const want = [-1, 1].map((a) => [S0 + a * AXB.a, ZAX + AXB.b]); const ok = BRKT_P.cuts.filter((c) => c.feat === 'axle').every((c, i) => Math.abs(c.a[1] - want[i][0]) < 1e-6 && Math.abs(c.a[2] - want[i][1]) < 1e-6) && Math.abs(P[0].c[0] - P[0].d[0] / 2 - STACK.x3) < 1e-6; return { ok, detail: `holes at FS ${want.map((w) => fx(w[0])).join(', ')}, WL ${fx(ZAX + AXB.b)}; web on BL ${STACK.x3}` }; } },
    { id: 'I2', with: 'LEZ-32-320 inner wall', feature: 'bracket', what: 'Feet on the wall, outside the leg slot', check: () => ({ ok: PBK.screwFs.every((f) => f < PNT.cut.fs[0] - 0.5 || f > PNT.cut.fs[1] + 0.5), detail: `screws FS ${PBK.screwFs.join(', ')}; slot FS ${PNT.cut.fs.join('–')}` }) },
    { id: 'I3', with: 'LEZ-32-300 axle nut (pant boss)', feature: 'standoff', what: 'Standoff on the axle end', check: () => ({ ok: Math.abs(PBK.so.bl[0] - STACK.axleEnd) < 1e-6, detail: `from BL ${PBK.so.bl[0]} (axle end)` }) },
  ],
  tooling: { needed: false, text: 'None: the axle flange is the drill guide for the web holes.' },
  sourcing: { blank: '0.125 × 6 × 12 6061-T6 sheet; Ø0.75 × 3 6061-T6 bar', vendor: 'Aircraft Spruce (6061-T6 sheet and bar)', url: 'https://www.aircraftspruce.com/menus/mp/aluminumsheet.html', cost: 18.0, costAsOf: DATE, perAircraft: 2, lead: 'Stock', note: 'Approximate.' },
};
