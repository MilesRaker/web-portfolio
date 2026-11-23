// LEZ-32-170 main gear bow: the definition record (numbers from parts/wpD1_gear.js and the ply book). The solid is the right
// half lofted along the bow (cad/d_loft.py): the UNI core by station with a short ramp at each pack drop, and the ear prism
// at the mount; mirrored for the left. Inches; x = BL, y = FS, z = WL. Notional.
import { GEO, MATSYS, DEFAULT_DESIGN, analyse, gearLegLength, fusAt, BASE_MAT } from '../structures.js';
import { PROCESS, buildPlyBook } from '../plybook.js';
import { bookMass } from '../systems.js';
import { BOW, SCHED, EAR, GM, AXB, YM, S0, ZR, YC, ZAX, bowPacks, bowParams, bowVolumes, BOW_RHO, legAt, LEGPAD, FLANGE } from '../parts/wpD1_gear.js';
import { FIXED } from '../structures.js';
import { cylBLDist } from './d_icd.js';
import { DISC } from '../parts/wp2_controls_gear.js';
import { TYRE } from '../parts/wp10_induction_gear.js';
import { want } from './util.js';
import { LAM_ALLOW, LAM_SPEC, LAM_FORM, LAM_CURE, ppBuy, PP_VENDOR, PP_PRICE } from './p_common.js';

const fx = (x, n = 2) => x.toFixed(n), tU = BASE_MAT.GUD.t;   // integration 2026-11-19 (ICD A-M3): the sourced 7715 cured ply, 0.0094 in (was 0.013 typed)
let BK = null; const book = () => (BK ||= buildPlyBook(analyse(DEFAULT_DESIGN, false)).gear);
const outside = () => book().plies.filter((p) => ['wrap', 'pad'].includes(p.region) || p.id === 'G-T3');   // over-wrap, clamp wraps and leg-end pads: not in the solid
const outLb = () => outside().reduce((a, p) => a + p.weight * (p.qty || 1), 0);
export const bowMassOf = (v) => 2 * ((v.UNI ?? 0) + (v.EAR ?? 0)) * BOW_RHO.UNI + outLb();
export const bowBookMass = () => { const m = bookMass(book()); return m.lam + m.core; };
const packs = bowPacks(), V = bowVolumes(), t0 = packs.reduce((a, p) => a + p.plies, 0) * tU, t1 = packs.filter((p) => p.uEnd >= 1).reduce((a, p) => a + p.plies, 0) * tU, earTop = GM.ztc + GM.r + EAR.ns * tU;
export function bowExpect(p, m) {
  const mv = m.volumes || {};
  return [want('Width fore-aft at the mounts (in)', BOW.w0, m.bbox[3] - m.bbox[2], 0.002), want('Leg end, WL (in)', GEO.gear.p1[1] * 12, m.bbox[4], 0.002), want('Ear top, WL (in)', earTop, m.bbox[5], 0.003),
    want('Leg outboard face (core), BL (in)', legMax, m.bbox[1], 0.003),
    want('6781 0/90 core volume, half (in³)', V.UNI, mv.UNI ?? NaN, Math.max(0.05, V.UNI * 0.001)), want('Ear volume, one ear (in³)', V.EAR, mv.EAR ?? NaN, 0.01), want('Segments lofted', p.n, m.segments ?? NaN, 0)];
}
const Lleg = gearLegLength() * 12, drops = [...new Set(packs.filter((q) => q.uEnd < 1).map((q) => q.uEnd))].sort((a, b) => a - b);
const stag = Math.min(...drops.slice(1).map((u, i) => (u - drops[i]) * Lleg));
const PRICE = { UNI: PP_PRICE.fab, BID: PP_PRICE.fab, L285gal: 0, H287qt: 0, tube: 9.0 };
const ft2 = (mat) => book().plies.filter((q) => q.mat === mat).reduce((a, q) => a + q.area * (q.qty || 1) * (q.plies || 1), 0);
const lam = () => book().plies.reduce((a, q) => a + q.weight * (q.qty || 1), 0), gal = () => lam() * (1 - PROCESS.fibreWeightFraction) / 1.4 / 10 * 1.3;
// the leg's outboard-most core face (integration 2026-11-19): the leg is not quite vertical just above its end, where the last dropped
// pack still lies, so the bbox maximum is taken over the leg (u 0.5–1), not at the end alone; the over-wrap adds tW
const secAt = (u) => FIXED.gearSectionFn({ gearPlies: FIXED.gearPliesMin }, { GUD: { t: tU } }, u).t;   // block P: the bow's plies are the glass cap role (GUD)
const legMax = Math.max(...Array.from({ length: 401 }, (_, i) => { const u = 0.5 + i / 800, { p, t } = legAt(u); return p[0] + Math.abs(t[1]) * secAt(u) / 2; }));
const tW = SCHED.nX * BASE_MAT.BID.t, leg1 = legMax + tW;
export const BOW_DEF = {
  pn: 'LEZ-32-170', rev: 'B', status: 'released', nha: 'LEZ-000 (aircraft)', qty: 1, kind: 'laminate',
  title: 'Main gear bow',
  solidText: 'CadQuery solid: the right half lofted along the bow (6781 0/90 core by pack, ear prism at the mount), mirrored',
  templates: 'Bow mould halves (female, two-piece) with the leg-end inserts; pack-drop template along the leg',
  revs: [{ rev: 'A', date: '2026-11-18', short: 'Initial definition', change: `Initial definition. The bow was a 152-ply linear taper with the root width and the mount tab ASSUMED, checked only at the root; its leg ended inside the tyre (BL 43.4) with no axle fitting, and nothing checked the leg's torsion under braking. As defined: the leg ends vertical at BL ${fx(GEO.gear.p1[0] * 12)} (outboard face ${fx(leg1)}), inboard of the brake stack, WL ${fx(GEO.gear.p1[1] * 12)}, and the axle flange bolts laterally through it (4 × AN${AXB.nb}). Width ${BOW.w0} → ${BOW.w1} in (design). The ${FIXED_ROOT()} UNI plies at the mounts drop in ${packs.length} packs by a fully stressed schedule (bending and torsion at every station, +15 %), with a ${SCHED.nX}-ply ±45 BID over-wrap that shares the torque. Each mount has a UNI ear over the ${GM.D} in tube of LEZ-32-120 (it was a tab on a 0.625 in tube). Bow ${fx(bowMassOf({ ...V }), 1)} lb (it was 35 lb from a book that did not carry the torsion).` }, { rev: 'B', date: '2026-11-18', short: 'Leg-end axle pads', change: `Interface review (docs/icd/d_maingear.md D170-9): the leg curves into its end, so its outboard face falls away ${fx(LEGPAD.fMin, 2)}–${fx(LEGPAD.fMax, 2)} in from the flat axle flange (BL ${BOW.legFace}) over the flange's WL ${fx(LEGPAD.z0)}–${fx(LEGPAD.z1)}; the upper axle bolts would have pulled the flange onto a slope. Added G-T4, a ${LEGPAD.n}-ply stepped BID pad on each leg end moulded flat against the leg-end insert (in the ply book and the record mass, outside the solid like the over-wrap).` }],
  effectivity: 'One per aircraft, axle to axle; the right half is drawn', params: bowParams(),
  datums: [{ id: 'A', what: 'Centre line, BL 0' }, { id: 'B', what: `Bow plane, FS ${fx(S0, 1)}` }, { id: 'C', what: `Centre-section mid-plane, WL ${fx(ZR)}` }],
  features: [
    { id: 'bow', kind: 'profile', label: `Centre-line: straight BL 0 to ±${fx(YM)} at WL ${fx(ZR)}, legs (Hermite, GEO.gear) to vertical ends at BL ±${fx(GEO.gear.p1[0] * 12)}, WL ${fx(GEO.gear.p1[1] * 12)}; leg arc ${fx(Lleg, 1)} in; width ${BOW.w0} → ${BOW.w1} in`, tol: 'Centre-line ±1/16 in to the mould; width ±0.03' },
    { id: 'bow', kind: 'layup', label: `${FIXED_ROOT()} × 6781 0/90 at the mounts (${fx(t0, 3)} in) in ${packs.length} packs of ${BOW.pack}, longest first, alternate halves; drops at ${drops.map((u) => fx(u * Lleg, 1)).join(', ')} in from the mount; ${t1 / tU} × 6781 0/90 (${fx(t1, 3)} in) at the axle`, tol: 'Pack ends ±0.25 in; drops staggered ≥ 1 in' },
    { id: 'bow', kind: 'layup', label: `Over-wrap: ${SCHED.nX} × 6781 ±45 axle to axle (${fx(tW, 3)} in), 1 in overlap on the aft face, staggered`, tol: 'Overlaps ≥ 1 in' },
    { id: 'ear', kind: 'layup', label: `Ears at BL ±${fx(YM)}: ${EAR.ns} × 6781 0/90 strap over the ${GM.D} in tube (axis WL ${fx(GM.ztc)}), ${EAR.Lfl} in flanges on the bow top, 6781 0/90 filler under the tube; ${EAR.nw} × 6781 0/90 clamp wraps ${EAR.Lw} in wide each side of the ear`, tol: 'Tube axis ±0.03 in to the jig' },
    { id: 'axle', kind: 'layup', label: `Leg-end axle pads G-T4: ${LEGPAD.n} × 6781 ±45 stepped, moulded flat at BL ±${BOW.legFace} over WL ${fx(LEGPAD.z0)}–${fx(LEGPAD.z1)} × ${LEGPAD.w} in (fills ${fx(LEGPAD.fMin, 3)}–${fx(LEGPAD.fMax, 3)} in)`, tol: 'Flat within 0.01 in over the flange footprint' },
    { id: 'axle', kind: 'hole', label: `Axle bolts 4 × Ø ${fx(AXB.D + 0.006, 3)} laterally through each leg end at FS ±${AXB.a}, WL ${fx(ZAX - AXB.b)} and ${fx(ZAX + AXB.b)}`, tol: 'Match-drilled through the axle flange', assy: true },
  ],
  tolerances: { general: '.X ±0.06 · .XX ±0.03 · ply ends ±0.25', flatness: 'Leg-end axle pads flat within 0.01 in; axles coaxial within 0.06 in (shim for toe and camber)', holes: 'Axle holes match-drilled through the flange', breakEdges: 'Edges radiused 1/8 in before the over-wrap' },
  drawingNotes: ['Ply IDs: G-P packs, G-X over-wraps, G-T1 ear straps, G-T2 ear fillers, G-T3 clamp wraps.', 'Molded part (female two-piece mould), unlike the moldless airframe.'], generalNote: 'Cured laminate tap-tested; no dry fibre at the drops.', na: {},
  material: { spec: '6781 S2-glass (caps 6781 laid 0/90), MTM45-1 prepreg (NCAMP); ears floxed (cotton flock) on the bow top', alt: 'None: the allowables are the MTM45-1 glass values', form: `${LAM_FORM()}, pressed to thickness in the mould`, density: null,
    allowables: [...LAM_ALLOW(false)] },
  process: book().steps.map((s) => ({ op: `Step ${s.step}`, spec: s.title })),
  checks: ['gear-bend', 'gear-ils', 'gear-prop', 'gear-leg', 'gear-tors', 'gear-tab', 'gear-axle'],
  rules: [{ id: 'stagger', label: 'Pack drops staggered ≥ 1 in', v: stag, min: 1 }, { id: 'eD', label: 'Axle bolt edge distance fore-aft e/D ≥ 2', v: (BOW.w1 / 2 - AXB.a) / AXB.D / 2, min: 1 },
    { id: 'end', label: 'Axle bolt edge distance below the lower bolt e/D ≥ 2', v: (ZAX - AXB.b - GEO.gear.p1[1] * 12) / AXB.D / 2, min: 0.95 },
    { id: 'face', label: 'Leg end (with over-wrap) inboard of the brake-stack face BL 39.9', v: BOW.legFace - leg1 + 1, min: 1 }],
  mass: { each: bowMassOf({ ...V }), from: 'half-solid 6781 0/90 core and ear volumes × 2 × 6781 0/90 density, plus the over-wrap and clamp wraps from the ply book; checked against the solid and the ply book' },
  hardware: [], hardwareNote: `None on the bow: the mount bolts are LEZ-32-120's, the 4 × AN${AXB.nb} axle bolts each side are LEZ-32-310's.`,
  interfaces: [
    { id: 'I1', with: 'LEZ-32-120 attachment', feature: 'ear', what: 'Ear bore = tube OD; ear clears the belly', check: () => { const c = GM.dc - GM.r - EAR.ns * tU; return { ok: c >= 0.25, detail: `tube Ø${GM.D}, ear top ${fx(c, 2)} in clear of the belly along its normal` }; } },
    { id: 'I2', with: 'LEZ-32-310 brake (axle flange, disc)', feature: 'axle', what: 'Leg end inboard of the axle flange face; ≥ 1 in from the disc face', check: () => { const disc = YC - (DISC.offset * 12 + DISC.t * 6); return { ok: leg1 <= BOW.legFace + 1e-6 && disc - BOW.legFace >= 1, detail: `leg face BL ${fx(leg1)} ≤ ${BOW.legFace}; disc face BL ${fx(disc)}` }; } },
    { id: 'I3', with: 'LEZ-32-300 tyre (grown 3.4 %)', feature: 'bow', what: 'Every point of the bow (core + over-wrap, both faces, mount to leg end) ≥ 0.5 in from the grown tyre', check: () => {
      const R = TYRE.odMax / 2 * 1.034, hw = TYRE.width / 2 * 1.034, sec = (u) => FIXED.gearSectionFn({ gearPlies: FIXED.gearPliesMin }, { GUD: { t: tU } }, u); let w = { c: 1e9 };
      for (let i = 0; i <= 200; i++) { const u = i / 200, { p, t } = legAt(u), h = sec(u).t / 2 + tW, n = [-t[1], t[0]];
        for (const k of [-1, 1]) { const y = p[0] + k * n[0] * h, z = p[1] + k * n[1] * h, c = cylBLDist([y, S0, z], YC - hw, YC + hw, S0, ZAX, R); if (c < w.c) w = { c, y, z, u }; } }
      return { ok: w.c >= 0.5, detail: `${fx(w.c)} in from the grown tyre (BL ${fx(w.y)}, WL ${fx(w.z)}, leg ${fx(w.u * 100, 0)} %)` }; } },
    { id: 'I5', with: 'LEZ-32-310 axle flange (seat on the leg end)', feature: 'axle', what: 'Leg end flat to the flange face: leg never proud of BL face, pad G-T4 fills the fall-away over the flange footprint, holes inside the pad', check: () => {
      const pad = book().plies.find((q) => q.id === 'G-T4'), tPad = pad ? pad.plies * BASE_MAT.BID.t : 0, cover = LEGPAD.z0 <= ZAX - FLANGE.hz + 1e-9 && LEGPAD.z1 >= ZAX + FLANGE.hz - 1e-9 && LEGPAD.w / 2 >= FLANGE.hy;
      const holes = [-1, 1].every((b) => ZAX + b * AXB.b > LEGPAD.z0 && ZAX + b * AXB.b < LEGPAD.z1) && AXB.a + AXB.D < LEGPAD.w / 2;
      const ok = LEGPAD.fMin >= 0 && tPad >= LEGPAD.fMax - 0.01 && cover && holes;
      return { ok, detail: `fall-away ${fx(LEGPAD.fMin, 3)}–${fx(LEGPAD.fMax, 3)} in over WL ${fx(LEGPAD.z0)}–${fx(LEGPAD.z1)}; pad ${pad ? `${pad.plies} × 6781 (${fx(tPad, 2)} in)` : 'missing'}; flange FS ±${FLANGE.hy}, WL ${fx(ZAX - FLANGE.hz)}–${fx(ZAX + FLANGE.hz)}${cover ? '' : ' NOT covered'}${holes ? '' : '; holes off the pad'}` }; } },
    { id: 'I4', with: 'LEZ-53-150 belly', feature: 'bow', what: 'Centre section clears the belly at BL 0', check: () => { const c = fusAt(GEO.gear.s).bot * 12 - (ZR + t0 / 2 + tW); const ok = c >= 0.25; return { ok, detail: `${fx(c)} in` }; } },
  ],
  tooling: { needed: true, text: 'Two-piece female bow mould with leg-end inserts; pack-drop template; ear jig holding both tubes coaxial at BL ±8.64; the axle flange as the drill guide.' },
  sourcing: { blank: `${Math.ceil(ft2('GUD') / 12.5 * 1.15)} yd 6781 0/90, ${Math.ceil(ft2('BID') / 12.5 * 1.15)} yd 6781 (50 in, +15 %)`, vendor: PP_VENDOR.vendor, url: PP_VENDOR.url,
    cost: Math.ceil(ft2('GUD') / 12.5 * 1.15) * PRICE.UNI + Math.ceil(ft2('BID') / 12.5 * 1.15) * PRICE.BID + gal() * (PRICE.L285gal + 2 * PRICE.H287qt), costAsOf: '2026-11-18', perAircraft: 1, lead: 'Stock items', note: 'Cloth and resin only; the mould is tooling. Prices approximate.' },
};
function FIXED_ROOT() { return packs.reduce((a, p) => a + p.plies, 0); }
void legAt;
