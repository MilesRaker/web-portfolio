// Block a_airframe: definition records and drawing views for this block's parts. Owned by the block's agent.
// DEFS entries have the same shape as site/defn/release.js; VIEWS entries the same signature as site/defn/sheet.js (k, D).
import { paramHash } from '../util.js';
import { flatView } from '../blkA_views.js';
import { F28_DEF, f28ParamsNow, f28Expect } from '../f28.js';
import { f28MassOf } from '../../parts/wpA1_f28.js';
import { RB_DEF, rbParamsNow } from '../rear_bhd.js';
import { rbMassOf } from '../../parts/wpA2_rearbhd.js';
import { flatExpect } from '../blkA_common.js';
import { FW_DEF, fwParamsNow } from '../firewall.js';
import { fwMassOf, FWG } from '../../parts/wpA3_firewall.js';
import { SB_DEF, sbParamsNow } from '../seat_back.js';
import { sbMassOf, suMassOf } from '../../parts/wpA4_seatback.js';
import { SU_DEF, suParamsNow } from '../seat_top.js';
import { NB_DEF, FB_DEF, RP_DEF, ballastExpect } from '../ballast.js';
import { nbParams, nbMassOf, fbParams, fbMassOf, rpParams, rpMassOf } from '../../parts/wpA5_ballast.js';
import { RD } from '../rudder.js';
import { SFJ_DEF, sfjExpect } from '../strake_fus.js';
import { sfjParams, sfjMassOf, SFJG, sfjSection } from '../../parts/wpA7_sfj.js';

/** LEZ-57-150: side view of the wedge (FS across, WL up, 1:10) and sections at the stations (BL across, WL up, 1:2) */
function sfjView(k, D) {
  const { T, hdim } = k, st = SFJG.st, S = 10, X = (fs) => 60 + (fs - st[0]) * S, Z = (z) => 420 - (z - 33) * S;
  let o = `<g data-feat="wedge" class="feat"><path class="pt" d="M${st.map((s) => { const p = sfjSection(s); return `${X(s).toFixed(1)} ${Z(p[1][1]).toFixed(1)}`; }).join('L')}${st.slice().reverse().map((s) => { const p = sfjSection(s); return `L${X(s).toFixed(1)} ${Z(p[0][1]).toFixed(1)}`; }).join('')}Z"/></g>`;
  o += hdim('wedge', X(st[0]), X(st.at(-1)), Z(33.5), Z(33.5) + 30, (st.at(-1) - st[0]).toFixed(2)) + T(X((st[0] + st.at(-1)) / 2), 500, 'SIDE VIEW, RIB FACE (FS ACROSS, WL UP) · 1:10', 'vt');
  st.filter((_, i) => i % 3 === 0 || i === st.length - 1).forEach((s, j) => { const p = sfjSection(s), x0 = 100 + j * 200, Xs = (u) => x0 + (u - 10) * 25, Zs = (z) => 960 - (z - 33) * 25;
    o += `<g data-feat="wedge" class="feat"><path class="pt" d="M${p.map((q) => `${Xs(q[0]).toFixed(1)} ${Zs(q[1]).toFixed(1)}`).join('L')}Z"/></g>` + T(x0 + 40, 995, `FS ${s.toFixed(1)}`, 'tq'); });
  o += T(500, 1040, 'SECTIONS (BL ACROSS, WL UP; RIB FACE RIGHT) · 1:4', 'vt');
  void D; return { svg: o, bottom: 150, scale: '1:10 / 1:4', notesBox: { x: 1240, top: 150, n: 50, bottom: 860 } };
}
import { ctlStations, ctlSection, CTLS } from '../../parts/wp19_ctl.js';
import { rdSection, RD_HORN } from '../../parts/wpA6_rudder.js';
import { solidRef } from '../solid_ref.js';   // solids by reference: meshes load on demand
const F28_SOLID = solidRef('f28', 'F28_SOLID');
const RB_SOLID = solidRef('rear_bhd', 'RB_SOLID');
const FW_SOLID = solidRef('firewall', 'FW_SOLID');
const SB_SOLID = solidRef('seat_back', 'SB_SOLID');
const SU_SOLID = solidRef('seat_top', 'SU_SOLID');
const NB_SOLID = solidRef('nose_bhd', 'NB_SOLID');
const FB_SOLID = solidRef('ballast', 'FB_SOLID');
const RP_SOLID = solidRef('ballast_plate', 'RP_SOLID');
const RD_SOLID = solidRef('rudder', 'RD_SOLID');
const SFJ_SOLID = solidRef('strake_fus', 'SFJ_SOLID');

/** LEZ-55-193 rudder: side view along the fin (h up, FS across, 1:4) with the hinge line and horn, sections at both ends (1:1) */
function rudderView(k, D) {
  const { L, T, hdim, vdim, leader } = k, st = ctlStations('rudder'), a = st[0], b = st.at(-1), C = CTLS.rudder, S = 12.5, fs0 = Math.min(...st.flatMap((h) => ctlSection('rudder', h).pts.map((q) => q[0])));
  const X = (fs) => 260 + (fs - fs0) * S, Y = (h) => 700 - h * 12 * S;
  const fr = (h) => Math.min(...ctlSection('rudder', h).pts.map((q) => q[0])), te = (h) => Math.max(...ctlSection('rudder', h).pts.map((q) => q[0]));
  let o = `<g data-feat="outline" class="feat"><path class="pt" d="M${X(fr(a))} ${Y(a)}${st.map((h) => `L${X(te(h))} ${Y(h)}`).join('')}L${X(fr(b))} ${Y(b)}${st.slice().reverse().map((h) => `L${X(fr(h))} ${Y(h)}`).join('')}Z"/></g>`;
  o += `<g data-feat="hinge" class="feat">${L(X(fr(a)) - 4, Y(a), X(fr(b)) - 4, Y(b), 'cl')}</g>` + leader('hinge', X((fr(a) + fr(b)) / 2) - 4, Y((a + b) / 2), X(fr(a)) - 220, Y(b) + 40, `HINGE, INBOARD SKIN`);
  o += `<g data-feat="horn" class="feat"><rect class="pt" style="fill:none" x="${X(fr(a)) - 1.5 * S}" y="${Y(a + 2 / 12)}" width="${1.5 * S}" height="${2 * S}"/></g>` + leader('horn', X(fr(a)) - 1.5 * S, Y(a + 1 / 12), X(fr(a)) - 200, Y(a) + 50, `HORN, ATTACH ${C.horn.arm} OUTBD OF PIN`);
  o += vdim('outline', Y(b), Y(a), X(te(b)), X(te(b)) + 40, `${((b - a) * 12).toFixed(2)} ALONG FIN`) + hdim('outline', X(fr(a)), X(te(a)), Y(a), Y(a) + 40, ctlSection('rudder', a).chord.toFixed(2));
  o += T(400, 800, 'SIDE VIEW ALONG THE FIN (FS ACROSS, h UP) · 1:8', 'vt');
  // sections at both ends, 1:1 (lateral up, FS across)
  [[a, 300], [b, 520]].forEach(([h, yc]) => { const s = rdSection(h), f0 = Math.min(...s.pts.map((q) => q[0])), Xs = (x) => 720 + (x - f0) * 50, Ys = (v) => yc - v * 50;
    o += `<g data-feat="${h === a ? 'bevel' : 'outline'}" class="feat"><path class="pt" d="M${s.pts.map((q) => `${Xs(q[0]).toFixed(1)} ${Ys(q[1]).toFixed(1)}`).join('L')}Z"/></g>` + T(720, yc + 70, `SECTION AT h ${(h * 12).toFixed(2)} · 1:2 (OUTBOARD UP)`, 'tq', 'start'); });
  void D; void RD_HORN;
  return { svg: o, bottom: 150, scale: '1:8 / 1:2', notesBox: { x: 1240, top: 150, n: 50, bottom: 860 } };
}

// the flat laminates whose meshes are written in their own plane frame (bulkhead F28, rear bulkhead, firewall, seat back and
// seat top) are placed by that frame; before 2026-11-24 they were placed as if in the aircraft frame and all sat at FS 0, in
// front of the nose
const onFrame = (p) => [{ frame: p.frame }];

export const DEFS = {
  // bulkhead F28: the solid's mesh is in its own plane frame (x across, y through, z up), placed by that frame
  'LEZ-53-165': { def: F28_DEF, solid: F28_SOLID, params: f28ParamsNow, hash: paramHash, expect: f28Expect, laminate: true,
    massOf: (m) => f28MassOf(m.volumes || {}), place: onFrame },
  'LEZ-53-175': { def: RB_DEF, solid: RB_SOLID, params: rbParamsNow, hash: paramHash, expect: flatExpect, laminate: true,
    massOf: (m) => rbMassOf(m.volumes || {}), place: onFrame },
  'LEZ-53-180': { def: FW_DEF, solid: FW_SOLID, params: fwParamsNow, hash: paramHash, expect: flatExpect, laminate: true,
    massOf: (m) => fwMassOf(m.volumes || {}), place: onFrame },
  // front seat back: built in its reclined plane; placed by that plane's frame
  'LEZ-53-170': { def: SB_DEF, solid: SB_SOLID, params: sbParamsNow, hash: paramHash, expect: flatExpect, laminate: true,
    massOf: (m) => sbMassOf(m.volumes || {}), place: onFrame },
  // seat-2: the upper seat back and headrest, built in its vertical plane
  'LEZ-53-171': { def: SU_DEF, solid: SU_SOLID, params: suParamsNow, hash: paramHash, expect: flatExpect, laminate: true,
    massOf: (m) => suMassOf(m.volumes || {}), place: onFrame },
  // nose ballast: the host bulkhead, the fixed lead and the removable plates, all in place
  'LEZ-08-105': { def: NB_DEF, solid: NB_SOLID, params: nbParams, hash: paramHash, expect: flatExpect, laminate: true, massOf: (m) => nbMassOf(m.volumes || {}), place: () => [{ sx: 1, x: 0, y: 0, z: 0 }] },
  'LEZ-08-100': { def: FB_DEF, solid: FB_SOLID, params: fbParams, hash: paramHash, expect: ballastExpect, massOf: (m) => fbMassOf(m.volumes || {}), place: () => [{ sx: 1, x: 0, y: 0, z: 0 }] },
  // the rudder: lofted in the winglet's section planes, right and left (mirrored)
  'LEZ-55-193': { def: RD.def, solid: RD_SOLID, params: RD.params, hash: paramHash, expect: RD.expect, book: 'rudder', laminate: true,
    massOf: (m) => RD.massOf(m.volumes || {}), massBook: RD.bookMassEach, place: () => [1, -1].map((sx) => ({ sx, x: 0, y: 0, z: 0 })) },
  // strake-to-fuselage joint: the close-out wedge lofted in FS planes, right and left (mirrored)
  'LEZ-57-150': { def: SFJ_DEF, solid: SFJ_SOLID, params: sfjParams, hash: paramHash, expect: sfjExpect, laminate: true, massOf: (m) => sfjMassOf(m.volumes || {}), place: () => [1, -1].map((sx) => ({ sx, x: 0, y: 0, z: 0 })) },
  'LEZ-08-110': { def: RP_DEF, solid: RP_SOLID, params: rpParams, hash: paramHash, expect: ballastExpect, massOf: (m) => rpMassOf(m.volumes || {}), place: () => [{ sx: 1, x: 0, y: 0, z: 0 }] },
};
export const VIEWS = {
  'LEZ-57-150': sfjView,
  'LEZ-55-193': rudderView,
  'LEZ-08-105': flatView({ title: 'VIEW FROM AFT (BL + RIGHT)' }),
  'LEZ-08-100': flatView({ title: 'VIEW FROM AFT, ALL STEPS (BL + RIGHT)', wLabel: '← FWD' }),
  'LEZ-08-110': flatView({ title: 'VIEW FROM AFT, BOTH PLATES (BL + RIGHT)', wLabel: '← FWD' }),
  'LEZ-53-170': flatView({ title: 'DEVELOPED VIEW OF THE RECLINED PLANE, FROM AFT', vLabel: 'v UP THE SLOPE', wLabel: '← FWD-UP' }),
  'LEZ-53-180': flatView({ title: 'VIEW FROM AFT (BL + RIGHT)', wLabel: '← FWD (CABIN)', extra: (k, X, Z) => FWG.ribs.map((r) => `<g data-feat="rib" class="feat"><rect class="hd" style="fill:none" x="${X(r.u - r.t / 2).toFixed(1)}" y="${Z(r.v1).toFixed(1)}" width="${((X(r.u + r.t / 2) - X(r.u - r.t / 2))).toFixed(1)}" height="${(Z(r.v0) - Z(r.v1)).toFixed(1)}"/></g>`).join('') }),
  'LEZ-53-175': flatView({ title: 'VIEW FROM AFT (BL + RIGHT)' }),
  'LEZ-53-165': flatView({ title: 'VIEW FROM AFT (BL + RIGHT)', names: (h) => (h.id === 'pin' ? 'CANARD TORQUE PIN AN4' : null) }),
};

// memory-audit integration (2026-11-19): the block's new revisions
import { applyMemRevs } from '../revs_memaudit.js';
applyMemRevs(DEFS);
