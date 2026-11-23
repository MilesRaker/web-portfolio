// WPP1 — block P (prepreg airframe conversion, Miles 2026-11-19): the checks the MTM45-1 / HTS40 / Divinycell HT airframe adds,
// and the lightning-strike mesh and galvanic isolation plies as one installation (LEZ-51-100).
//  • rf-keepout: carbon (the HTS40 caps of the wing, canard, CS spar and jut-out) stays outside each antenna's reactive near
//    field, radius λ/2π at the antenna's design frequency; for an antenna on a ground plane only carbon on its radiating side
//    counts. Every skin is glass (6781), so the keep-out zones hold no carbon skin by construction.
//  • galv-iso: a 6781 ply isolates every carbon-to-metal faying surface (FAA AC 20-107B ¶6.e): in the LWA-plate and clevis-tail
//    bond lines (the pad side is glass already) and, at the drag angle, the skin and doubler plies; fasteners through carbon
//    are wet-installed in sealant.
//  • lsp-mesh: copper mesh on every carbon-capped external surface, joined end to end (AC 20-136C ¶10.14.9).
//  • out-time: the largest single layup (ply area between two cures) at a hand-layup rate, against the 10-day out-time.
// The temperature checks (lam-hotwet, core-proc, core-svc) are in structures.js. Inches; [FS, BL, WL]. Notional.
import { GEO, MATSYS, BASE_MAT, registerChecks, mk, wingSec, surfaceGeom, CS_FIT, materials, sizing } from '../structures.js';
import { FRAMES, afAt, buildPlyBook, PROCESS } from '../plybook.js';
import { DIPOLE, finPt, WHIP_AT, GA35_AT, GA35S_AT, BLADE_AT } from './wpJ0_layout.js';
import { LUG } from './wp13_airframe_joints.js';
import { JS as JUT } from './wp20_jutout.js';
import { DANG } from './wp15_cs_spar.js';
import { defineParts } from '../systems.js';

const IN_ = (n, v, u, s = 'DERIVED') => [n, v, u, s], C_IN_MHZ = 11802.85;   // speed of light, in·MHz
const tI = BASE_MAT.BID.t;   // the isolation ply: one 6781 ply
const MESH_STRIP = 3.0;   // in, the LSP strips' lap past each cap edge (MESH.strip)
// ------------------------------------------------------------------------------------------- carbon in the airframe (points, in)
/** sample points of every HTS40 cap (both wings, canard, CS spar, jut-out drag spars), [FS, BL, WL] */
export const CARBON = (() => {
  const pts = [], g = GEO.wing, wg = surfaceGeom('wing'), cg = surfaceGeom('canard');
  // the wing's carbon ends at cf (structures.js GEO.wing.glassTip)
  for (let y = g.attachY; y <= g.glassTip.cf + 1e-9; y += 0.05) { const s = wingSec(y), sec = wg.sec(y), x0 = s.le + g.spar * s.c; for (const sg of [-1, 1]) for (const dx of [-0.5, 0.5]) for (const dz of [-1, 1]) pts.push({ part: 'wing caps', p: [(x0 * 12 + dx * sec.b), sg * y * 12, g.z * 12 + dz * sec.h / 2] }); }
  for (let y = -GEO.canard.semi; y <= GEO.canard.semi + 1e-9; y += 0.05) { const sec = cg.sec(Math.abs(y)), x0 = (GEO.canard.le + GEO.canard.spar * GEO.canard.c) * 12; for (const dx of [-0.5, 0.5]) for (const dz of [-1, 1]) pts.push({ part: 'canard caps', p: [x0 + dx * sec.b, y * 12, GEO.canard.z * 12 + dz * sec.h / 2] }); }
  const cs = GEO.csSpar; for (let y = -cs.halfSpan; y <= cs.halfSpan + 1e-9; y += 0.05) for (const fs of [cs.s - cs.width / 2, cs.s + cs.width / 2]) for (const z of [CS_FIT.U, CS_FIT.L]) pts.push({ part: 'CS spar caps', p: [fs * 12, y * 12, z * 12] });
  for (let y = JUT.yA; y <= GEO.join.y * 12 + 1e-9; y += 0.5) for (const sg of [-1, 1]) for (const k of [-1, 1]) pts.push({ part: 'jut-out drag-spar caps', p: [JUT.sB, sg * y, GEO.wing.z * 12 + k * JUT.h(y) / 2] });
  // the copper LSP strips over the wing and canard caps (LEZ-51-100) are conductors too: their chordwise edges, MESH_STRIP past the caps
  for (let y = g.attachY; y <= g.glassTip.cf + 1e-9; y += 0.05) { const s = wingSec(y), sec = wg.sec(y), x0 = (s.le + g.spar * s.c) * 12; for (const sg of [-1, 1]) for (const dx of [-(sec.b / 2 + MESH_STRIP), sec.b / 2 + MESH_STRIP]) for (const dz of [-1, 1]) pts.push({ part: 'wing LSP mesh strips', p: [x0 + dx, sg * y * 12, g.z * 12 + dz * sec.h / 2] }); }
  return pts;
})();
// ------------------------------------------------------------------------------------------- antennas (block J's layout)
// f: the design frequency (MHz); el: points of the radiating element; gp: the radiating half-space of a ground-plane antenna
// (WL above or below the plane), null for the free dipole
export const ANTENNAS = [
  { id: 'com', what: `COM half-wave dipole in the right fin (J: h ${DIPOLE.h0}–${DIPOLE.h1} in, x/c ${DIPOLE.x} → ${DIPOLE.xTop})`, f: DIPOLE.f, el: Array.from({ length: 45 }, (_, i) => finPt(DIPOLE.h0 + (DIPOLE.h1 - DIPOLE.h0) * i / 44)), gp: null },
  { id: 'elt', what: 'ELT whip on the turtledeck (121.5 MHz homing; six-radial ground plane on the inner skin)', f: 121.5, el: [WHIP_AT], gp: { up: true, z: WHIP_AT[2] - 0.5 } },
  { id: 'ga35s', what: 'GA 35S GPS patch on the aft nose deck', f: 1575.42, el: [GA35S_AT], gp: { up: true, z: GA35S_AT[2] - 0.5 } },
  { id: 'ga35', what: 'GA 35 GPS patch on the forward deck (GTX 45R)', f: 1575.42, el: [GA35_AT], gp: { up: true, z: GA35_AT[2] - 0.5 } },
  { id: 'blade', what: 'Transponder blade on the belly (1030 MHz receive, the lower band)', f: 1030, el: [BLADE_AT], gp: { up: false, z: BLADE_AT[2] + 0.5 } },
];
export const keepout = (f) => C_IN_MHZ / f / (2 * Math.PI);   // in: λ / 2π
export function keepoutRows() {
  return ANTENNAS.map((a) => { let best = { d: Infinity, part: '—', below: Infinity };
    for (const c of CARBON) { const side = !a.gp || (a.gp.up ? c.p[2] > a.gp.z : c.p[2] < a.gp.z);
      for (const e of a.el) { const dd = Math.hypot(c.p[0] - e[0], c.p[1] - e[1], c.p[2] - e[2]); if (side && dd < best.d) best = { ...best, d: dd, part: c.part }; if (!side && dd < best.below) best.below = dd; } }
    const r = keepout(a.f); return { ...a, r, d: best.d, part: best.part, below: best.below, ms: Math.min(99, best.d / r - 1) }; });
}
// ------------------------------------------------------------------------------------------- galvanic isolation (AC 20-107B ¶6.e)
const T_BOND = 0.005;   // in, the least flox bond line left beside the isolation ply (DESIGN)
export const ISO = [
  { id: 'lwa', carbon: 'LEZ-57-110 wing caps (HTS40), the cap over the plate', metal: 'LEZ-57-142 LWA plate, 2024-T3', n: 4, area: (11.44 - 1.25 + 1) * (LUG.W + 1), room: LUG.flox, how: 'one 6781 ply in the plate\'s bond line on the cap side (the pad side is the 6781 pad)', at: [(GEO.csSpar.s) * 12, GEO.join.y * 12 + 5, GEO.wing.z * 12] },
  { id: 'clv', carbon: 'LEZ-57-140 CS spar caps (HTS40), the cap over the tail', metal: 'LEZ-57-143 clevis-block tail, 2024-T351', n: 4, area: (10.85 - 2.1 + 1) * (LUG.W + 1), room: LUG.flox, how: 'one 6781 ply in the tail\'s bond line on the cap side (the pad side is the 6781 pad)', at: [GEO.csSpar.s * 12, GEO.join.y * 12 - 5, GEO.wing.z * 12] },
  { id: 'dang', carbon: 'LEZ-57-116 jut-out drag-spar lower cap (HTS40)', metal: 'LEZ-57-144 drag angle, 6061-T6', n: 2, area: 0, glass: FIXED_SKIN() + DANG.nD, how: `the lower skin (${FIXED_SKIN()} × 6781) and the angle's ${DANG.nD}-ply 6781 doubler lie between`, at: [JUT.sB, JUT.yB, GEO.wing.z * 12] },
];
function FIXED_SKIN() { return 2; }
export const isoMS = (i) => (i.glass ? i.glass - 1 : (i.room - T_BOND) / tI - 1);   // glass plies between, or the bond line's room for the ply
// ------------------------------------------------------------------------------------------- lightning-strike mesh (AC 20-136C)
// copper mesh, 0.040 lb/ft²: BOUND, the heaviest copper grade on the Astroseal Astrostrike specification page (copper grades
// 0.015–0.040 lb/ft², 73–195 g/m²; astrosealproducts.com/product-specs, accessed 2026-11-19; the page's table layout is
// garbled, so the product-to-weight pairing is to be confirmed). Copper, not aluminium, on carbon (galvanic: the Aircraft Spruce
// 05-02632 MicroGrid page recommends copper on carbon, accessed 2026-11-19)
export const MESH = { lbFt2: 0.040, src: 'BOUND: Astroseal Astrostrike copper LSP, 0.015–0.040 lb/ft² (73–195 g/m²), the heaviest used (astrosealproducts.com/product-specs, accessed 2026-11-19)', strip: MESH_STRIP, need: 2.0 };
/** wetted area (ft²) and centroid (ft) of a frame's upper + lower skin between y0 and y1 */
function skinArea(F, y0, y1, N = 40) {
  let A = 0, m = [0, 0, 0];
  for (let i = 0; i < N; i++) { const y = y0 + (y1 - y0) * (i + 0.5) / N, c = F.sec(Math.abs(y)).c, dy = (y1 - y0) / N; let arc = 0;
    for (const sd of [1, -1]) { let pr = null; for (let k = 0; k <= 40; k++) { const x = (1 - Math.cos(Math.PI * k / 40)) / 2, a = afAt(F, Math.abs(y), x), q = [x, sd > 0 ? a.yu : a.yl]; if (pr) arc += Math.hypot(q[0] - pr[0], q[1] - pr[1]); pr = q; } }
    const dA = arc * c * dy, p = F.pt(y, 0.42, 0); A += dA; m = m.map((v, k) => v + p[k] * dA); }
  return { A, c: m.map((v) => v / A) };
}
// the mesh is laid as strips over the carbon: each HTS40 cap's width plus MESH.strip past each edge, on the skin over it, root to the
// carbon's end, joined end to end through the CS-spar strip and the root jumpers (the skins between are glass and need none)
const stripOver = (b0, b1, L) => ((b0 + b1) / 2 / 12 + 2 * MESH.strip / 12) * L;   // ft², b in in, L in ft
export const MESH_SURF = (() => {
  const g = GEO.wing, wg = surfaceGeom('wing'), cg = surfaceGeom('canard'), cosW = Math.cos(wg.sweep), cs = GEO.csSpar, sp = (y) => { const s = wingSec(y); return [(s.le + g.spar * s.c) * 12, y * 12]; };
  const Lw = (g.glassTip.cf - g.attachY) / cosW, w = stripOver(wg.sec(g.attachY).b, wg.sec(g.glassTip.cf).b, Lw), wc = sp((g.attachY + g.glassTip.cf) / 2);
  const cn = stripOver(cg.sec(0).b, cg.sec(GEO.canard.semi).b, 2 * GEO.canard.semi), jut = stripOver(JUT.b, JUT.b, (GEO.join.y * 12 - JUT.yA) / 12);
  return [
    { id: 'wing', what: `Outer wing panels: strips over the upper and lower HTS40 caps, ${MESH.strip} in past each edge, root to the carbon end (both)`, A: 2 * 2 * w, c: [wc[0] / 12, 0, g.z] },
    { id: 'jut', what: `Jut-outs: strips over the drag-spar caps, upper and lower (both)`, A: 2 * 2 * jut, c: [JUT.sB / 12, 0, g.z] },
    { id: 'canard', what: 'Canard: strips over the upper and lower HTS40 caps, tip to tip', A: 2 * cn, c: [GEO.canard.le + GEO.canard.spar * GEO.canard.c, 0, GEO.canard.z] },
    { id: 'cs', what: `Strip over the CS spar caps on the strake and fuselage skins, top and bottom, ${MESH.strip} in past each face`, A: 2 * (2 * cs.halfSpan) * (cs.width + 2 * MESH.strip / 12), c: [cs.s, 0, cs.z] },
  ].map((s) => ({ ...s, lb: s.A * MESH.lbFt2 }));
})();
// ------------------------------------------------------------------------------------------- the installation's mass lines
const ISO_LB = (i) => (i.area ? i.area / 144 * BASE_MAT.BID.areal : 0);
export const LSP_LINES = [
  ...MESH_SURF.map((s) => ({ std: 'Copper LSP mesh (Astrostrike / MicroGrid class), co-cured in the outer skin', qty: 1, each: +s.lb.toFixed(4), desc: `${s.what}: ${s.A.toFixed(1)} ft² × ${MESH.lbFt2} lb/ft² (BOUND)`, c: s.c })),
  { std: 'Bonding jumper, tinned-copper braid 1/2 in, wing mesh to the CS-spar strip', qty: 2, each: 0.02, desc: 'One at each wing root, across the joint gap (BOUND, typed: 0.02 lb each)', c: [GEO.csSpar.s, 0, GEO.wing.z] },
  ...ISO.filter((i) => i.area).map((i) => ({ std: 'Isolation ply, MTM45-1 / 6781, 0.0101 in', qty: i.n, each: +ISO_LB(i).toFixed(4), desc: `${i.metal} ↔ ${i.carbon}: ${i.how}, ${i.area.toFixed(1)} in² each`, c: [i.at[0] / 12, 0, i.at[2] / 12] })),
];
export const LSP_MASS = LSP_LINES.reduce((a, l) => a + l.qty * l.each, 0);
export const LSP_CG = LSP_LINES.reduce((a, l) => a.map((v, k) => v + l.c[k] * l.qty * l.each), [0, 0, 0]).map((v) => v / LSP_MASS);
// ------------------------------------------------------------------------------------------- out-time of the largest layup
// hand layup of fabric prepreg with debulks: 10 ft²/h, one laminator, 8 h a day (BOUND, typed: no public rate found)
export const LAYUP = { rate: 10, hours: 8, src: 'BOUND: 10 ft²/h hand layup with debulks every 3–4 plies, one laminator, 8 h/day (typed; no public rate found)' };
let LAY = null;
export function largestLayup() {
  if (LAY) return LAY;
  const R = sizing(), B = buildPlyBook(R); let best = null;
  for (const b of Object.values(B)) {
    const cures = (b.steps || []).filter((s) => /cure|Cure/.test(s.title)).map((s) => s.step).sort((x, y) => x - y); if (!cures.length) continue;
    let prev = 0; for (const c of cures) { const A = b.plies.filter((p) => p.step > prev && p.step <= c).reduce((a, p) => a + p.area * (p.plies || 1) * (p.qty || 1), 0);
      if (!best || A > best.A) best = { A, book: b.name, step: c }; prev = c; }
  }
  const days = best.A / LAYUP.rate / LAYUP.hours;
  return (LAY = { ...best, days, ms: MATSYS.outDays / Math.max(days, 1e-6) - 1 });
}
// ------------------------------------------------------------------------------------------- checks
registerChecks('wpP1-prepreg', (d, lc) => {
  if (lc.id !== 'W1-S1') return [];
  const out = [], K = keepoutRows(), kw = K.reduce((a, b) => (b.ms < a.ms ? b : a));
  out.push(mk('laminate', 'rf-keepout', 'Carbon-to-antenna keep-out: no HTS40 (nor the copper LSP strips over it) inside any antenna\'s reactive near field (λ/2π)', lc, kw.what, `nearest carbon: ${kw.part}`, kw.ms, {
    formula: 'r = c / (2π f);  d = least distance from the radiating element to carbon or the LSP strips on its radiating side;  MS = d / r − 1',
    inputs: [...K.map((a) => IN_(`${a.what}: f ${a.f} MHz, r ${a.r.toFixed(2)} in`, a.d, 'in', 'MODEL')), IN_('Keep-out radius rule', 'λ/2π', 'text', 'BOUND: the reactive near-field boundary of an electrically small antenna (antenna-theory texts, typed from memory); carbon is conductive and detunes or blocks antennas nearby, E- and S2-glass skins are RF-transparent (FAA AC 20-107B ¶11.c(3)(b), faa.gov, accessed 2026-11-19)'),
      IN_('Design frequencies', K.map((a) => `${a.id} ${a.f}`).join(', '), 'text', 'DESIGN: block J\'s layout (wpJ0: COM dipole cut for 127 MHz) and the band of each antenna')],
    result: [...K.map((a) => [`${a.id}: carbon behind the ground plane (not counted)`, Number.isFinite(a.below) ? a.below : 0, 'in']), ['Least margin', kw.ms, '']] }));
  const iw = ISO.reduce((a, b) => (isoMS(b) < isoMS(a) ? b : a));
  out.push(mk('laminate', 'galv-iso', 'Galvanic isolation: a glass ply between carbon and every aluminium or steel faying surface (AC 20-107B ¶6.e)', lc, iw.metal, iw.glass ? 'glass plies between' : 'isolation ply in the bond line', isoMS(iw), {
    formula: 'bond-line case: MS = (t_bond − t_min) / t_ply − 1 (the 6781 ply fits in the bond line with t_min of flox left);  laid-on case: MS = n_glass − 1',
    inputs: [...ISO.map((i) => IN_(`${i.metal} ↔ ${i.carbon}`, i.glass ?? i.room, i.glass ? 'plies' : 'in', i.glass ? 'SIZED' : 'GEOMETRY')), IN_('Isolation ply', tI, 'in', 'MATSYS: NCAMP cured ply, 6781'), IN_('Least flox bond line beside it', T_BOND, 'in', 'DESIGN'),
      IN_('Rule', 'glass plies between carbon and aluminium; qualify fasteners', 'text', 'FAA AC 20-107B ¶6.e (faa.gov, 2009-09-08, accessed 2026-11-19); fasteners through carbon wet-installed in sealant (DESIGN)')],
    result: ISO.map((i) => [i.id, isoMS(i), '']) }));
  { const cs = GEO.csSpar, need = MESH.need, ms = MESH.strip / need - 1;
    out.push(mk('laminate', 'lsp-mesh', 'Lightning protection: copper mesh over every carbon cap on the external surfaces, joined end to end (AC 20-136C ¶10.14.9)', lc, 'wing, jut-out and canard caps, CS-spar strip', 'mesh lap past the carbon', ms, {
      formula: 'a strip over every HTS40 cap (wing, jut-outs, canard) and over the CS spar, s past each carbon edge, joined end to end;  MS = s / s_min − 1',
      inputs: [...MESH_SURF.map((s) => IN_(s.what, s.A, 'ft²', 'MODEL')), IN_('Strip past each CS spar face', MESH.strip, 'in', 'DESIGN'), IN_('Least lap past the carbon', need, 'in', 'DESIGN: a lap of the mesh past the carbon it protects'), IN_('Mesh areal weight', MESH.lbFt2, 'lb/ft²', MESH.src),
        IN_('Rule', 'cover external surfaces with metal mesh, foil or expanded foil, joined to form a continuous conductor end to end', 'text', 'FAA AC 20-136C ¶10.14.9–10.14.10 (faa.gov, 2026-05-15, accessed 2026-11-19); carbon far less conductive than aluminium, AC 20-107B ¶11.c(3)(b)')],
      result: [['Mesh mass (all surfaces)', MESH_SURF.reduce((a, s) => a + s.lb, 0), 'lb'], ['CS-spar strip width', cs.width * 12 + 2 * MESH.strip, 'in']] })); }
  { const L = largestLayup();
    out.push(mk('laminate', 'out-time', `Prepreg out-time: the largest single layup (${L.book}, up to the cure at step ${L.step}) laid inside the ${MATSYS.outDays}-day out-time`, lc, L.book, 'out-time requirement', L.ms, {
      formula: 'days = A_plies / (rate · hours a day);  MS = out-time / days − 1',
      inputs: [IN_('Ply area of the layup (each ply counted)', L.A, 'ft²', 'MODEL'), IN_('Layup rate', LAYUP.rate, 'ft²/h', LAYUP.src), IN_('Hours a day', LAYUP.hours, 'h', 'DESIGN'), IN_('Out-time at shop temperature', MATSYS.outDays, 'days', MATSYS.handSrc)],
      result: [['Layup time', L.days, 'days'], ['With a passed tack test', MATSYS.outDaysTack, 'days']] })); }
  for (const r of out) r.sys = 'LEZ-51-100';
  return out;
});
// ------------------------------------------------------------------------------------------- the installation part
defineParts([
  { pn: 'LEZ-51-100', name: 'Lightning-strike mesh and galvanic isolation plies (prepreg airframe)', kind: 'install', ata: 51, massItem: 'wings', qty: 1, massEach: +LSP_MASS.toFixed(4), cg: LSP_CG,
    geo: [{ t: 'box', c: LSP_CG, d: [0.05, 0.05, 0.05], draw: false }],
    blurb: 'Copper mesh strips co-cured in the outer skin over every carbon cap (wing panels, jut-outs, canard, and the CS spar), 3 in past each edge, bonded across the wing roots, and a 6781 isolation ply in every carbon-to-aluminium bond line. Mass lumped in the wings item at the installation\'s CG.',
    steps: [{ title: 'Lay the copper mesh as the outermost ply of every carbon-capped skin (wing panels, jut-outs, canard, the CS-spar strip); lap it 2 in at every splice; co-cure (M cycle)', inspect: ['Mesh continuous end to end: resistance tip to tip ≤ the bonding requirement (DESIGN: measure and record)', 'No wrinkles or bridging; mesh flat under the surfacing ply'] },
      { title: 'Lay one 6781 isolation ply in every carbon-to-metal bond line (LWA plates, clevis tails) before the cap plies; install fasteners through carbon wet in sealant', inspect: ['Isolation ply present at each faying surface (tally against the hardware list)', 'Sealant squeeze-out at every fastener through carbon'] },
      { title: 'Fit the bonding jumpers across both wing roots after the wings are on', inspect: ['Jumper bolted to the mesh terminals both sides; continuity checked'] }],
    src: { mass: 'COMPUTED (mesh area × 0.040 lb/ft², BOUND; isolation ply areas × 6781 cured areal weight)' } },
]);
void materials; void PROCESS;
