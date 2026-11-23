// Block p_prepreg (prepreg airframe conversion, 2026-11-19): definition records and drawing views for this block's parts. Owned by
// the block's agent. DEFS entries have the same shape as site/defn/release.js; VIEWS entries the same signature as sheet.js (k, D).
import { GEO, wingSec, wingRootSec, surfaceGeom } from '../../structures.js';
import { LSP_DEF, lspParams } from '../p_lsp.js';
import { MESH, ANTENNAS, keepout, ISO } from '../../parts/wpP1_prepreg.js';
import { LUG } from '../../parts/wp13_airframe_joints.js';
import { paramHash } from '../util.js';

export const DEFS = {
  'LEZ-51-100': { def: LSP_DEF, solid: null, install: true, params: lspParams, hash: paramHash, shows: ['LEZ-57-110', 'LEZ-55-120', 'LEZ-57-140', 'LEZ-57-142', 'LEZ-57-143'],
    massOf: () => LSP_DEF.hardware.reduce((a, l) => a + l.qty * l.each, 0) },
};
/** LEZ-51-100: plan (BL across, FS down, 1:40) with the meshed surfaces, the carbon end and the antenna keep-outs; the LWA-plate
 *  bond line at 8:1 with the isolation ply */
export const VIEWS = {
  'LEZ-51-100': (k) => {
    const { L, T, leader } = k, S = 2.5, X = (bl) => 620 + bl * S, Y = (fs) => 110 + fs * S, g = GEO.wing, G = g.glassTip;
    const poly = (pts) => `M${pts.map(([bl, fs]) => `${X(bl).toFixed(1)} ${Y(fs).toFixed(1)}`).join('L')}Z`;
    let o = '';
    for (const sg of [-1, 1]) {
      const ys = Array.from({ length: 21 }, (_, i) => g.attachY + (g.tipY - g.attachY) * i / 20), le = ys.map((y) => [sg * y * 12, wingSec(y).le * 12]), te = ys.map((y) => [sg * y * 12, (wingSec(y).le + wingSec(y).c) * 12]).reverse();
      o += `<g data-feat="mesh-wing" class="feat"><path class="hd" d="${poly([...le, ...te])}"/></g>`;
      const yc = ys.filter((y) => y <= G.cf + 1e-9).concat([G.cf]), spx = (y, k) => { const w = wingSec(y), b = surfaceGeom('wing').sec(y).b; return (w.le + g.spar * w.c) * 12 + k * (b / 2 + MESH.strip); };
      o += `<g data-feat="mesh-wing" class="feat"><path class="pt" d="${poly([...yc.map((y) => [sg * y * 12, spx(y, -1)]), ...yc.slice().reverse().map((y) => [sg * y * 12, spx(y, 1)])])}"/></g>`;
      const jr = Array.from({ length: 9 }, (_, i) => GEO.strake.rootY + (GEO.join.y - GEO.strake.rootY) * i / 8), jl = jr.map((y) => [sg * y * 12, wingRootSec(y).le * 12]), jt = jr.map((y) => { const r = wingRootSec(y); return [sg * y * 12, (r.le + r.c) * 12]; }).reverse();
      o += `<g data-feat="mesh-jut" class="feat"><path class="hd" d="${poly([...jl, ...jt])}"/></g>`;
      const cf = sg * G.cf * 12, w = wingSec(G.cf);
      o += `<g data-feat="mesh-wing" class="feat">${L(X(cf), Y(w.le * 12) - 8, X(cf), Y((w.le + w.c) * 12) + 8, 'cl')}</g>`;
    }
    o += T(X(G.cf * 12), Y(wingSec(G.cf).le * 12) - 14, `CARBON ENDS BL ±${(G.cf * 12).toFixed(1)}`, 'tq', 'middle');
    const cn = GEO.canard, cx = (cn.le + cn.spar * cn.c) * 12, cb = surfaceGeom('canard').sec(0).b / 2 + MESH.strip;
    o += `<g data-feat="mesh-canard" class="feat"><path class="hd" d="${poly([[-cn.semi * 12, cn.le * 12], [cn.semi * 12, cn.le * 12], [cn.semi * 12, (cn.le + cn.c) * 12], [-cn.semi * 12, (cn.le + cn.c) * 12]])}"/><path class="pt" d="${poly([[-cn.semi * 12, cx - cb], [cn.semi * 12, cx - cb], [cn.semi * 12, cx + cb], [-cn.semi * 12, cx + cb]])}"/></g>`;
    const cs = GEO.csSpar, f0 = (cs.s - cs.width / 2) * 12 - MESH.strip, f1 = (cs.s + cs.width / 2) * 12 + MESH.strip;
    o += `<g data-feat="mesh-cs" class="feat"><path class="hd" d="${poly([[-cs.halfSpan * 12, f0], [cs.halfSpan * 12, f0], [cs.halfSpan * 12, f1], [-cs.halfSpan * 12, f1]])}"/></g>`;
    o += leader('mesh-cs', X(-20), Y(f0), X(-120), Y(f0) - 60, `CS-SPAR MESH STRIP ${MESH.strip} IN PAST EACH FACE (DASHED)`);
    o += leader('mesh-canard', X(-40), Y(cn.le * 12), X(-150), Y(cn.le * 12) - 40, 'CANARD: MESH STRIP OVER THE CAPS');
    { const w = wingSec(100 / 12), xs = (w.le + g.spar * w.c) * 12; o += leader('mesh-wing', X(-100), Y(xs), 250, 330, `MESH STRIPS OVER THE WING CAPS, ${MESH.strip} IN PAST EACH EDGE (PANEL DASHED)`); }
    for (const a of ANTENNAS) { const p = a.el[Math.floor(a.el.length / 2)], r = keepout(a.f) * S; o += `<g data-feat="mesh-wing" class="dim"><circle class="ld" cx="${X(p[1]).toFixed(1)}" cy="${Y(p[0]).toFixed(1)}" r="${r.toFixed(1)}"/></g>`; }
    const com = ANTENNAS[0].el[0]; o += leader('mesh-wing', X(com[1]), Y(com[0]), X(com[1]) - 260, Y(com[0]) + 90, `COM KEEP-OUT λ/2π ${keepout(ANTENNAS[0].f).toFixed(1)} IN`);
    o += T(X(0), Y(215), 'PLAN, LOOKING DOWN · 1:40 · KEEP-OUT CIRCLES DOTTED', 'vt');
    // section: LWA plate bond line, 8:1 (the cap over the plate, the isolation ply, flox, the plate)
    const S8 = 800, x0 = 140, y0 = 760, w = 300, tC = 0.033, tI = 0.0101, tF = LUG.flox - tI;
    const band = (id, y, h, cls) => `<g data-feat="${id}" class="feat"><rect class="${cls}" x="${x0}" y="${y.toFixed(1)}" width="${w}" height="${(h * S8).toFixed(1)}"/></g>`;
    o += band('iso-lwa', y0, tC, 'pt') + band('iso-lwa', y0 + tC * S8, tI, 'hd') + band('iso-lwa', y0 + (tC + tI) * S8, tF, 'pt') + band('iso-lwa', y0 + LUG.flox * S8 + tC * S8, 0.06, 'pt');
    o += T(x0 + w + 12, y0 + tC * S8 / 2 + 4, 'HTS40 CAP OVER THE PLATE', 'tq', 'start') + T(x0 + w + 12, y0 + (tC + tI / 2) * S8 + 4, `6781 ISOLATION PLY ${tI} IN`, 'tq', 'start');
    o += T(x0 + w + 12, y0 + (tC + tI + tF / 2) * S8 + 10, `FLOX ${tF.toFixed(4)} IN (BOND LINE ${LUG.flox} IN)`, 'tq', 'start') + T(x0 + w + 12, y0 + (tC + LUG.flox + 0.03) * S8 + 14, 'LWA PLATE 2024-T3 (PAD SIDE: 6781 PAD)', 'tq', 'start');
    o += T(x0, y0 + (tC + LUG.flox + 0.06) * S8 + 46, `SECTION AT THE LWA-PLATE BOND LINE · 8:1 (ALSO THE CLEVIS TAILS)`, 'vt', 'start');
    return { svg: o, bottom: 150, scale: '1:40 / 8:1', notesBox: { x: 1240, top: 150, n: 54, bottom: 860 } };
  },
};
