// Block F's revisions to block A's released records (coordinator decision 2): the tank fittings in the strake LEZ-57-180
// (rev B), the sealed conduits through the strake joint wedge LEZ-57-150 (rev B) and the fuel holes in the shell
// LEZ-53-150 (rev F). Holes, inserts and conduits are drilled / potted at assembly to the LEZ-28 positions: none is cut
// in the laminate solids (their parameters and solids are unchanged), and their mass (flox and short tubes, under
// 0.05 lb a side) is carried by the LEZ-28 parts. Each revision adds a feature table and an interface that checks the
// positions against the fuel layout. Inches, [BL, FS, WL]. Notional.
import { FL } from '../parts/wp1_powerplant.js';
import { R1, BAYS, cavFloor, cavTop, omlLow, omlTop, hwAt, bellyAt, SHELL_T } from '../parts/wpF0_layout.js';
import { STK, strakeSection } from '../parts/wp21_strake.js';

const fx = (x, n = 2) => x.toFixed(n), DATE = '2026-11-18', S = FL.sump, G = FL.gauge, F = FL.filler, V = FL.vent;
/** lowest / highest cavity point of a rib's tank faces (the rib's centre plane) */
const ribPts = (y) => { const P = strakeSection(y, true).cavity; const lo = P.reduce((a, q) => (q[1] < a[1] ? q : a)), hi = P.reduce((a, q) => (q[1] > a[1] ? q : a)); return { lo, hi }; };
/** strake rev B fittings, right side (left mirrored) */
export const STRAKE_FIT = () => {
  const r2 = ribPts(STK.ribs[1]), r3 = ribPts(STK.ribs[2]);
  return [
    { id: 'outlet', where: 'R1', what: 'Outlet passage Ø 0.53 (LEZ-28-110), flox-potted; bore invert on the floor', at: [R1.inb, S.FSo, S.passA[2]], d: 0.53, by: 'LEZ-28-110' },
    { id: 'gaugeLo', where: 'R1', what: 'Sight-gauge boss, floor (LEZ-28-190), Ø 0.44', at: [R1.inb, G.fs, G.zLo], d: 0.44, by: 'LEZ-28-190' },
    { id: 'gaugeHi', where: 'R1', what: 'Sight-gauge boss, ullage (LEZ-28-190), Ø 0.44', at: [R1.inb, G.fs, G.zHi], d: 0.44, by: 'LEZ-28-190' },
    { id: 'limber2', where: 'R2', what: 'Limber hole Ø 0.50 at the rib\'s low point (fuel passes inboard)', at: [STK.ribs[1], r2.lo[0], r2.lo[1] + 0.30], d: 0.50, by: 'drainage' },
    { id: 'air2', where: 'R2', what: 'Air hole Ø 0.50 at the rib\'s high point (the outer bays vent through the inboard bay)', at: [STK.ribs[1], r2.hi[0], r2.hi[1] - 0.30], d: 0.50, by: 'LEZ-28-160' },
    { id: 'limber3', where: 'R3', what: 'Limber hole Ø 0.50 at the rib\'s low point', at: [STK.ribs[2], r3.lo[0], r3.lo[1] + 0.30], d: 0.50, by: 'drainage' },
    { id: 'air3', where: 'R3', what: 'Air hole Ø 0.50 at the rib\'s high point', at: [STK.ribs[2], r3.hi[0], r3.hi[1] - 0.30], d: 0.50, by: 'LEZ-28-160' },
    { id: 'filler', where: 'upper skin', what: `Filler ring: solid flox / BID insert Ø ${F.capD + 0.5}, cap Ø ${F.capD} flush (LEZ-28-170)`, at: [F.bl, F.fs, F.zTop], d: F.capD, by: 'LEZ-28-170' },
    { id: 'vent', where: 'lower skin', what: 'Vent union: solid insert Ø 1.0, AN832-4D through it (LEZ-28-165)', at: [V.pick[0], V.fsOut, V.zSkin], d: 0.27, by: 'LEZ-28-165' },
  ];
};
export const STRAKE_REV = { rev: 'B', date: DATE, short: 'Tank fittings (block F)', change: 'Block F interface review (docs/icd/f_fuel.md FM-4…FM-7): the record carried no fuel-system holes. Rev B adds, per tank: the outlet passage through R1 at the floor, two sight-gauge bosses in R1, limber holes at the low points and air holes at the high points of R2 and R3, the filler ring insert in the upper skin over the inboard bay (clear of R2) and the vent insert in the lower skin. Drilled and potted at assembly to the LEZ-28 positions; laminate solid and mass unchanged.' };
export const STRAKE_FEAT = () => ({ id: 'fuel', kind: 'hole', label: `Tank fittings (rev B, block F): ${STRAKE_FIT().map((f) => `${f.id} ${f.where} BL ${fx(f.at[0])} FS ${fx(f.at[1], 1)} WL ${fx(f.at[2])} Ø ${fx(f.d)}`).join('; ')}`, tol: '±1/16 in to the LEZ-28 positions', assy: true });
export const STRAKE_IF = () => ({ id: 'I-F1', with: 'LEZ-28 fuel parts (block F)', feature: 'fuel', what: 'R1 fittings inside the cavity\'s height; rib holes inside the rib; filler neck ≥ 0.5 in from R1 / R2; vent insert in the lower skin',
  check: () => { const f = STRAKE_FIT(), bad = [];
    for (const x of f.filter((q) => q.where === 'R1')) { const lo = cavFloor(R1.out, x.at[1]), hi = cavTop(R1.out, x.at[1]); if (x.id !== 'outlet' && (x.at[2] - x.d / 2 < lo - 1e-6 || x.at[2] + x.d / 2 > hi + 1e-6)) bad.push(x.id); }
    for (const x of f.filter((q) => /^(limber|air)/.test(q.id))) { const lo = cavFloor(x.at[0], x.at[1]), hi = cavTop(x.at[0], x.at[1]); if (x.at[2] - x.d / 2 < lo - 0.05 || x.at[2] + x.d / 2 > hi + 0.05) bad.push(x.id); }
    if (F.ribGap < 0.5) bad.push('filler'); if (!(V.zSkin < V.zIn)) bad.push('vent');
    return { ok: !bad.length, detail: bad.length ? `out of place: ${bad.join(', ')}` : `${f.length} fittings a side at the LEZ-28 positions` }; } });

/** sealed conduits through the dry PVC wedge (between the shell's OML and R1's outer face) */
export const WEDGE_CONDUITS = () => [
  { id: 'outlet', what: 'LEZ-28-110 passage', fs: S.FSo, wl: S.passA[2] - 0.6, d: 0.5 },
  { id: 'gaugeLo', what: 'LEZ-28-190 floor fitting', fs: G.fs, wl: G.zLo, d: 0.44 },
  { id: 'gaugeHi', what: 'LEZ-28-190 ullage fitting', fs: G.fs, wl: G.zHi, d: 0.44 },
].map((c) => ({ ...c, gap: R1.inb - hwAt(c.fs, c.wl, 0) }));
export const WEDGE_REV = { rev: 'B', date: DATE, short: 'Fuel conduits (block F)', change: 'Block F (FM-4, FM-7): three crossings of the dry wedge per side — the tank outlet passage and the two sight-gauge fittings — each in a sealed conduit: a G-10 tube 0.1 in over the fitting, flox-potted through the PVC so no fuel reaches the foam. Drilled at assembly; wedge solid unchanged.' };
export const WEDGE_FEAT = () => ({ id: 'fuel', kind: 'hole', label: `Sealed conduits (rev B): ${WEDGE_CONDUITS().map((c) => `${c.what} FS ${fx(c.fs, 1)} WL ${fx(c.wl)} through ${fx(c.gap)} in of wedge`).join('; ')}`, tol: '±1/16 in', assy: true });
export const WEDGE_IF = () => ({ id: 'I-F1', with: 'LEZ-28-110 / -190 (block F)', feature: 'fuel', what: 'Each crossing is inside the wedge\'s station range and conduit sealed', check: () => { const c = WEDGE_CONDUITS(); return { ok: c.every((x) => x.fs > 53.58 && x.fs < 123.06 && x.gap >= 0), detail: c.map((x) => `${x.id} ${fx(x.gap)} in`).join(', ') }; } });

/** shell holes for the fuel system: side wall (passage and gauge fittings), belly (quick-drains) */
export const SHELL_HOLES = () => {
  const out = [];
  for (const sg of [1, -1]) {
    const zp = (S.passA[2] + S.passB[2]) / 2; out.push({ id: `pass${sg > 0 ? 'R' : 'L'}`, where: 'side', at: [sg * hwAt(S.FSo, zp, 0), S.FSo, zp], d: 0.56, by: 'LEZ-28-110 (potted, slotted for the 35° tube)' });
    for (const z of [G.zLo, G.zHi]) out.push({ id: `gauge${sg > 0 ? 'R' : 'L'}`, where: 'side', at: [sg * hwAt(G.fs, z, 0), G.fs, z], d: 0.47, by: 'LEZ-28-190 (potted)' });
    const q = FL.QD(sg); out.push({ id: `drain${sg > 0 ? 'R' : 'L'}`, where: 'belly', at: q.face, d: 0.62, by: 'LEZ-28-180 (potted insert, 2 BID pad 1.5 in)' });
  }
  return out;
};
export const SHELL_REV = { rev: 'F', date: DATE, short: 'Fuel-system holes (block F)', change: 'Block F (FM-4, FM-7, FM-12): side-wall holes for the tank outlet passages and the sight-gauge fittings, and belly holes with potted inserts for the two flush quick-drains aft of the gear fairing. Drilled at assembly; shell solid and mass unchanged.' };
export const SHELL_FEAT = () => ({ id: 'fuel', kind: 'hole', label: `Fuel holes (rev E): ${SHELL_HOLES().map((h) => `${h.id} ${h.where} BL ${fx(h.at[0])} FS ${fx(h.at[1], 1)} WL ${fx(h.at[2])} Ø ${fx(h.d)}`).join('; ')}`, tol: '±1/16 in', assy: true });
export const SHELL_IF = () => ({ id: 'I-F1', with: 'LEZ-28-110 / -180 / -190 (block F)', feature: 'fuel', what: 'Side holes on the side wall, drain holes on the belly (flush)', check: () => { const h = SHELL_HOLES(), bad = h.filter((x) => (x.where === 'belly' ? Math.abs(x.at[2] - bellyAt(Math.abs(x.at[0]), x.at[1], 0)) > 0.15 : Math.abs(Math.abs(x.at[0]) - hwAt(x.at[1], x.at[2], 0)) > 1e-3));
  return { ok: !bad.length, detail: bad.length ? `off: ${bad.map((x) => x.id).join(', ')}` : `${h.length} holes` }; } });
void BAYS; void omlLow; void omlTop; void SHELL_T;
export const STRAKE_NOTE = () => `Rev B tank fittings (block F, drilled and potted at assembly): R1 outlet on the floor at FS ${fx(S.FSo, 1)}; sight-gauge bosses in R1 at FS ${G.fs}; limber and air holes at the low and high points of R2 and R3; filler ring at BL ${fx(F.bl)}, FS ${F.fs}; vent insert in the lower skin at BL ${fx(V.pick[0], 1)}, FS ${fx(V.fsOut, 1)}.`;
