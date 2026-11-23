// LEZ-57-116 wing-root jut-out: the definition record. The solid is lofted in constant-FS planes (cad/loft3d.py) from the
// sections in wp20_jutout.js: the outer mould line from the cowl side to the root face, and inside the drag spar's band
// its UNI caps and PVC block. Inches; frame x = BL, y = FS (aft), z = WL (up). Notional.
import { GEO, FIXED, BASE_MAT, MATSYS } from '../structures.js';
import { PROCESS } from '../plybook.js';
import { ATTACH, ATT } from '../parts/wp13_airframe_joints.js';
import { DANG } from '../parts/wp15_cs_spar.js';
import { JS, jutStations, jutSection, jutVolumes, jutParams, jutShell, jutMassOf, JUT_RHO, jutInboard } from '../parts/wp20_jutout.js';
import { want } from './util.js';
import { JCUTS } from '../parts/wp20_jutout.js';
import { cutVol } from '../parts/cuts.js';
import { CUTS_TXT, JG, RT, jutClear, sysClear, JACC_LB, SYSC, aftClear, aftArm, aftBayFit, aftFill, aftLinerGap, AFT_RULE } from '../parts/wpC8_cuts.js';
import { AFTC, TUNNEL_PTS, CS_TUNNELS } from '../parts/wpJ0_layout.js';
import { drgParams } from './drag_fitting.js';
import { L as CL } from '../parts/wpC1_controls.js';

const fx = (x, n = 2) => x.toFixed(n), YJ = GEO.join.y * 12, tU = BASE_MAT.UNI.t, tB = BASE_MAT.BID.t;
export function jutExpect(p, m) {
  const P = jutParams(), q = P.segs.flatMap((s) => [0, 1].flatMap((e) => s.regions.oml[e].map((v) => [v[0], s.O[e][1], v[1]]))), mx = (i) => Math.max(...q.map((x) => x[i])), mn = (i) => Math.min(...q.map((x) => x[i])), V = jutVolumes(), mv = m.volumes || {};
  return [want('Root face, BL (in)', mx(0), m.bbox[1], 0.002), want('Inboard end, BL (in)', mn(0), m.bbox[0], 0.002), want('Front wall, FS (in)', mn(1), m.bbox[2], 0.002), want('Aft end, FS (in)', mx(1), m.bbox[3], 0.002),
    want('Outer mould line volume (in³)', V.OML, mv.OML ?? NaN, Math.max(0.01, V.OML * 0.002)), want('HTS40 cap volume (in³)', V.UNI, mv.UNI ?? NaN, Math.max(0.01, V.UNI * 0.003)), want('HT61 block volume (in³)', V.PVC, mv.PVC ?? NaN, Math.max(0.01, V.PVC * 0.003)), want('Segments lofted', p.n, m.segments ?? NaN, 0)].concat(cutRows(m));
}
const cutRows = (m) => { const mc = m.cuts || []; return [...JCUTS.map((c) => { const q = mc.find((x) => x.id === c.id), v = cutVol(c); return want(`Cut ${c.id} (${c.feat}) volume (in³)`, v, q ? q.vol : NaN, Math.max(0.01, v * 0.003)); }), want('Cuts inside the drag-spar caps or block (in³)', 0, mc.reduce((a, x) => a + (x.hit || 0), 0), 0.005)]; };
const wallMargin = () => { const st0 = jutStations()[0], poly = jutSection(st0, {}).oml, b = JG.bay; let m = Infinity;
  for (let k = 0; k <= 10; k++) { const y = Math.max(b.bl[0], jutInboard(st0) + 0.05) + (b.bl[1] - Math.max(b.bl[0], jutInboard(st0) + 0.05)) * k / 10, z = []; for (let i = 0; i < poly.length; i++) { const a = poly[i], c = poly[(i + 1) % poly.length]; if ((a[0] - y) * (c[0] - y) <= 0 && a[0] !== c[0]) z.push(a[1] + (y - a[0]) / (c[0] - a[0]) * (c[1] - a[1])); }
    if (z.length) m = Math.min(m, Math.max(...z) - b.wl[1], b.wl[0] - Math.min(...z)); } return m - FIXED.skinBID * tB; };
const V = jutVolumes(), st = jutStations(), sh = jutShell(), J = JS;
const PRICE = { UNI: PP_PRICE.cf, BID: PP_PRICE.fab, foam34: +(PP_PRICE.coreFt2Qtr * 8 * 3).toFixed(2), L285gal: 0, H287qt: 0 };
const yd = (mat) => Math.ceil(sh.lines.filter((l) => l.mat === mat).reduce((a, l) => a + l.a * l.n, 0) / 144 / 12.5 * 1.15 + (mat === 'UNI' ? V.UNI / tU / 144 / 12.5 * 1.15 : 0));
const gal = (sh.lb + V.UNI * JUT_RHO.UNI) * (1 - PROCESS.fibreWeightFraction) / 1.4 / 10 * 1.3;
export const JUT_DEF = {
  pn: 'LEZ-57-116', rev: 'C', status: 'released', nha: 'LEZ-57-110', qty: 2, kind: 'laminate',
  title: 'Wing-root jut-out',
  solidText: 'CadQuery solid lofted in constant-FS planes: outer mould line from the cowl side to the root face, drag-spar caps and HT61 block',
  templates: 'T1–T2 (front wall and the drag-spar station)',
  revs: [{ rev: 'A', date: '2026-11-17', short: 'Initial definition', change: `Initial definition. The jut-out was 2 BID skins on Styrofoam with its mass from an area estimate, and nothing carried the third bolt's vertical force (${fx(Math.max(...J.cases.map((c) => c.Fz)), 0)} lb ult. × 1.15) the ${fx(J.arm, 1)} in out to the panel: the skins alone would have wrinkled. As defined a drag spar runs on the bolt's line: ${J.n} UNI × ${J.b} in caps (the lower one under the drag angle, the bolt through it), ${J.nW} BID webs each face of a ${J.wBlk} in PVC block, caps lapping ${J.Lov} in onto the panel. Mass from the solid.` }, { rev: 'B', date: '2026-11-19', short: 'K1 bay and control tunnels', change: `Block C's rod B, its corner bellcrank K1 and the rudder conduit run through the jut-out aft of the CS spar (ICD c_controls §8). Added: ${CUTS_TXT.jut()}. The K1 bracket stays on the CS spar, so the bay is open through the front wall and the inboard close-out: the wing slides off over K1 and the inboard rod B. All cuts clear the drag spar and the skins by ≥ 0.1 in; no check changes (the drag spar is untouched).` },
    { rev: 'C', date: '2026-11-19', short: 'Aft lane and root connector bay', change: `Miles's decision (option A, "swap lanes"): C's systems tunnel and bay keep block I's wingtip light harness alone; J's COM coax (right) and GMU 11 harness (left) get the aft lane. Added: ${CUTS_TXT.jutAft()}. Checks: every cut clears the drag spar and the skins by ≥ 0.1 in (the aft bay's floor is the lower skin, at its opening); the aft lane clears every other cut by ≥ ${AFT_RULE} in and the drag fitting's arm by ≥ 0.25 in; the connectors fit the bay and pass its root-face opening; the opening joins wing-access (skin + ring doubler at K_t 4). Mass + ${fx(JACC_LB().aft, 3)} lb (ring doubler, cover, fasteners), core less the cuts.` }],
  effectivity: 'Left and right (mirror images); the right jut-out is drawn',
  params: jutParams(),
  datums: [{ id: 'A', what: `Wing root face, BL ${fx(YJ, 1)} (the panel's datum A)` }, { id: 'B', what: `Front wall, FS ${fx(st[0], 2)}: ${fx(GEO.join.gap * 12, 2)} in off the CS spar's aft face` }, { id: 'C', what: `Drag-spar line, FS ${fx(J.sB, 2)}, through the drag bolt` }],
  features: [
    { id: 'outline', kind: 'profile', label: `Root face BL ${fx(YJ, 1)} in to the cowl side (${fx(GEO.join.cowlGap * 12, 2)} in off the cowl), front wall FS ${fx(st[0], 2)} to the trailing edge; the wing panel's own sections`, tol: 'Contour ±1/32 in; inboard end to the cowl template ±0.04' },
    { id: 'spar', kind: 'layup', label: `Drag spar on C: caps ${J.n} × HTS40 × ${J.b} in, upper BL ${fx(J.yA, 1)} → ${fx(YJ + J.Lov, 1)}, lower BL ${fx(J.yLo0, 1)} → ${fx(YJ + J.Lov, 1)} (${J.Lov} in onto the panel's skins); ${J.wBlk} in HT61 block BL ${fx(J.yA, 1)} → ${fx(YJ, 1)}, ${J.nW} × 6781 ±45 each face, wrapping 1 in onto the caps`, tol: 'Ply ends ±0.25 in' },
    { id: 'skin', kind: 'layup', label: `Skins ${FIXED.skinBID} × 6781 ±45 each side, continuous with the panel's; front wall and inboard close-out 2 × 6781; drag-angle doubler ${DANG.nD} × 6781 0/90 under LEZ-57-144`, tol: 'Overlaps ≥ 1 in' },
    { id: 'pocket', kind: 'pocket', label: `Root pocket for LEZ-57-144: ${DANG.b} × ${DANG.b} × ${DANG.L} in at the bolt, on the lower cap`, tol: 'Angle seated on the cap, flox bed ≤ 1/16 in' },
    { id: 'bay', kind: 'pocket', label: CUTS_TXT.jut(), tol: 'Bay and tunnels ±0.06; front-wall and close-out openings trimmed to the bay, edges flox-sealed' },
    { id: 'aft', kind: 'pocket', label: `Rev C: ${CUTS_TXT.jutAft()}`, tol: 'Tunnel and bay ±0.06; front-wall hole and the bay\'s root-face opening trimmed, edges flox-sealed; ring doubler 1 in all round the lower-skin opening' },
    { id: 'drag', kind: 'hole', label: `Drag-bolt hole Ø ${fx(ATT.drag / 16, 3)} at BL ${fx(J.yB, 1)}, FS ${fx(J.sB, 2)}, through the lower cap and skin`, tol: 'Drilled at assembly through the fitting\'s lug (LEZ-57-145)', assy: true },
  ],
  tolerances: { general: '.X ±0.06  ·  .XX ±0.03  ·  contour ±1/32  ·  ply ends ±0.25', flatness: 'Root face square to the panel within 0.5°', holes: 'Drag bolt drilled through the jig guide', breakEdges: 'Sand cut laminate edges smooth; seal with resin' },
  drawingNotes: ['Built with the wing panel (LEZ-57-110): the jut-out\'s skins are the panel\'s, run inboard; its core blocks are cut with the panel\'s.', 'Right jut-out shown; left opposite.'],
  generalNote: 'Cured laminate tap-tested; edges sealed.', na: {},
  material: { spec: 'HTS40 carbon / 6781 S2-glass, MTM45-1 prepreg (NCAMP), Divinycell HT61 core, Divinycell HT61 spar block', alt: 'None: cloth styles and foams set ply thickness and wrinkling allowables', form: `${LAM_FORM()}`, density: null,
    allowables: [...LAM_ALLOW(true)] },
  process: [
    { op: 'Core', spec: 'CNC-mill the inboard blocks with the panel\'s; rout the drag-spar slot and the root pocket; fit the HT61 block, wrap the webs.' },
    { op: 'Layup', spec: 'With the panel, each side in turn: drag-spar cap (shortest first) in its trough, doubler under the pocket, skins; front wall and inboard close-out 2 × 6781.' }, { op: 'Cure', spec: `${PROCESS.cure}. ${PROCESS.postCure}.` },
    { op: 'Angle', spec: 'LEZ-57-144 floxed into the pocket on the jig with the fitting\'s lug clamped on it.' },
    { op: 'Inspect', spec: 'Tap test the spar caps and the pocket; inboard end to the cowl template.' },
  ],
  checks: ['jut-cap', 'jut-web', 'jut-lap', 'dang-skin', 'wing-access'],
  rules: [
    { id: 'room', label: 'Skin, lower cap and doubler fit under the angle (room / stack)', v: DANG.below / (FIXED.skinBID * tB + J.n * tU + DANG.nD * tB), min: 1 },
    { id: 'end', label: 'Lower cap past the bolt e/D ≥ 4', v: (J.yB - J.yLo0) / (ATT.drag / 16), min: 4 },
    { id: 'clear', label: 'Block clear of the angle (in)', v: J.yA - (J.yB + DANG.L / 2), min: 0.5 },
    { id: 'lap', label: 'Cap lap onto the panel ≥ 6 in', v: J.Lov, min: 6 },
    { id: 'cuts', label: 'K1 bay and tunnels clear the drag spar and the skins by ≥ 0.1 in', v: jutClear().d, min: 0.1 },
    { id: 'sys', label: 'Systems conduit tunnel ≥ 0.25 in, its bay ≥ 0.1 in from the rod-B tunnel, the rudder conduit and the K1 bay (in, the lesser margin)', v: Math.min(sysClear().tunnel.d - 0.25, sysClear().bay.d - 0.1) + 0.25, min: 0.25 },
    { id: 'wall', label: 'Front-wall opening leaves ≥ 0.5 in of wall above and below (in)', v: wallMargin(), min: 0.5 },
    { id: 'aft', label: `Rev C aft lane and bay ≥ ${AFT_RULE} in from every other cut (K1 bay, rod B, rudder conduit, systems tunnel and bay) (in)`, v: aftClear().d, min: AFT_RULE },
    { id: 'arm', label: 'Rev C aft lane over the drag fitting\'s arm (LEZ-57-141) ≥ 0.25 in (in)', v: aftArm(drgParams()).d, min: 0.25 },
    { id: 'conn', label: 'Root disconnects (inline BNC Ø 0.58, GMU circular Ø 0.72, typed) inside the aft bay by ≥ 0.10 in and through its root-face opening with ≥ 0.10 in all round (in, the lesser)', v: Math.min(...aftBayFit().flatMap((q) => [q.inside, q.pass])), min: 0.1 },
    { id: 'fill', label: 'Aft lane conduit bore fill by the cable (GMU harness 0.25 in, the larger) ≤ 40 % (40 % − fill, %)', v: 40 - 100 * aftFill(0.25), min: 0 },
    { id: 'liner', label: 'Lined leg under the K1 bay (and the CS spar\'s low tunnel) passes the cable with ≥ 0.06 in diametral clearance (in)', v: aftLinerGap(0.25), min: 0.06 },
  ],
  mass: { each: jutMassOf({ ...V }), from: 'region volumes (HTS40 caps, HT61 block, HT61 core less the angle pocket) × densities, plus skins, walls, webs, doubler and the caps\' lap; checked against the solid' },
  hardware: [{ std: 'Phenolic tube 3/4 OD, 0.030 wall', qty: 1, desc: 'Rod-B tunnel liner (ft)' }, { std: 'MS24693-C4', qty: 10, desc: 'Systems access-cover screws' }, { std: 'K1000-08 (MS21047-08)', qty: 10, desc: 'Nutplates in the ring doubler' }, { std: 'Nylon tube 3/8 OD', qty: 1, desc: 'Conduit tunnel liner (ft)' }, { std: 'Nylon tube 1/2 OD × 0.035 (rev C)', qty: 1, desc: 'Aft lane conduit (ft; mass in LEZ-20-100)' }, { std: 'Phenolic tube 3/8 OD × 0.025 (rev C)', qty: 1, desc: 'Aft lane liner under the K1 bay (ft; mass in LEZ-20-100)' }, { std: 'MS24693-C4', qty: 10, desc: 'Aft bay cover screws (rev C)' }, { std: 'K1000-08 (MS21047-08)', qty: 10, desc: 'Nutplates in the aft bay\'s ring doubler (rev C)' }], hardwareNote: `Tunnel liners only; otherwise none of its own: the drag angle (LEZ-57-144) and the AN${ATT.drag} drag bolt (LEZ-57-145) sit in it.`,
  interfaces: [
    { id: 'I1', with: 'LEZ-57-144 drag angle', feature: 'pocket', what: 'The angle\'s leg A on the lower cap; bolt through the cap',
      check: () => ({ ok: J.yLo0 < J.yB - DANG.L / 2 && Math.abs(J.sB - ATTACH.drag[0] * 12) < 1e-6, detail: `lower cap from BL ${fx(J.yLo0, 1)}, angle BL ${fx(J.yB - DANG.L / 2, 1)}–${fx(J.yB + DANG.L / 2, 1)}; spar line FS ${fx(J.sB, 2)} on the bolt` }) },
    { id: 'I2', with: 'CS spar (LEZ-57-140) aft face', feature: 'outline', what: 'Front wall stands off by the joint gap',
      check: () => ({ ok: Math.abs(st[0] - (GEO.firewall + GEO.join.gap) * 12) < 1e-6, detail: `front wall FS ${fx(st[0], 3)}, spar aft face FS ${fx(GEO.firewall * 12, 3)}` }) },
    { id: 'I3', with: 'LEZ-57-110 panel root', feature: 'outline', what: 'Root face on the panel\'s datum A; caps lap onto its skins aft of the spar',
      check: () => ({ ok: Math.abs(YJ - GEO.wing.attachY * 12) < 1e-9, detail: `root face BL ${fx(YJ, 1)}` }) },
    { id: 'I5', with: 'LEZ-57-140 CS spar rev H low tunnel; LEZ-57-110 rev E aft conduit', feature: 'aft', what: 'The aft lane starts on the line of the CS spar\'s low tunnel at the front wall and meets the panel\'s aft conduit at the root face',
      check: () => { const t = TUNNEL_PTS(1, 1), c = JCUTS.find((q) => q.id === 'aft-1'), a = [c.a[1], c.a[0], c.a[2]], off = (() => { const w = a.map((v, i) => v - t[1][i]), l = Math.hypot(...AFTC.jut[0].map((v, i) => v - t[1][i])), d = AFTC.jut[0].map((v, i) => (v - t[1][i]) / l), k = w.reduce((s_, v, i) => s_ + v * d[i], 0); return Math.hypot(...w.map((v, i) => v - k * d[i])); })();
        const root = AFTC.jut.at(-1), w0 = AFTC.wing[0], meet = Math.hypot(...root.map((v, i) => v - w0[i])), d = CS_TUNNELS[1].d;
        return { ok: off < 1e-3 && meet < 1e-6 && Math.abs(2 * AFTC.liner.r - d) < 1e-9, detail: `front-wall entry ${off.toFixed(4)} in off the line from the low tunnel's exit (BL ${t[1][1]}, WL ${t[1][2]}, Ø ${d}); root face at FS ${root[0]}, WL ${root[2]} = the panel's conduit start` }; } },
    { id: 'I4', with: 'LEZ-27-142 rod B and K1, LEZ-27-151 conduit (block C)', feature: 'bay', what: 'Bay round K1 and rod A\'s end, open where the fixed parts enter; tunnels on the rod and conduit axes',
      check: () => { const b = JG.bay, inside = (p) => p[0] >= b.fs[0] && p[0] <= b.fs[1] && p[1] <= b.bl[1] && Math.abs(p[2] - (b.wl[0] + b.wl[1]) / 2) <= (b.wl[1] - b.wl[0]) / 2; const pts = [CL.K1a, CL.Q1, CL.K1b], ok = pts.every(inside) && Math.abs(JCUTS[1].a[1] - CL.K1b[0]) < 1e-6; return { ok, detail: `K1 ${pts.map((p) => fx(p[1], 2)).join(' / ')} BL inside the bay to BL ${fx(b.bl[1], 2)}; rod B on FS ${fx(CL.K1b[0], 2)}; clearance to the drag spar ${fx(jutClear().d, 3)} in` }; } },
  ],
  tooling: { needed: true, text: 'CNC-mill templates at the front wall and the drag-spar station (cut with the panel\'s inboard block); the cowl-side template; the wing-attach jig\'s drag-bolt guide.' },
  sourcing: { blank: `${yd('UNI')} yd HTS40, ${yd('BID')} yd 6781 (50 in, +15 %); HT61 from the panel's blocks; 3/4 in HT61 offcut`, vendor: PP_VENDOR.vendor, url: PP_VENDOR.url,
    cost: yd('UNI') * PRICE.UNI + yd('BID') * PRICE.BID + gal * (PRICE.L285gal + 2 * PRICE.H287qt), costAsOf: '2026-11-17', perAircraft: 2, lead: 'Stock items', note: 'Cloth and resin; foam from the panel\'s stock.' },
};

// memory-audit integration (2026-11-19): this record's new revision
import { memRev } from './revs_memaudit.js';
import { LAM_ALLOW, LAM_SPEC, LAM_FORM, LAM_CURE, ppBuy, PP_VENDOR, PP_PRICE } from './p_common.js';
memRev(JUT_DEF);
