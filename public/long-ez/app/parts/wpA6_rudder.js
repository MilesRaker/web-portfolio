// WPA6 — rudder LEZ-55-193 on the control-surface template (wp19 / ctl_surface.js), adapted to the winglet: the section
// is the winglet's own airfoil aft of the hinge line in the winglet's canted section planes (h along the fin), lofted
// in those planes. The rudder only goes outward (30° since DC-005, DEFAULT_DESIGN.rudderDeg): the MS20257-P3 hinge is on the inboard
// skin and the outboard corner is bevelled so full travel outward clears the cove by the gap. A 6061-T6 horn on a BID pad at the
// lower (root) end stands forward of the hinge face on the outboard side; the rudder cable (LEZ-27-151, block C) pulls it
// forward, 1.25 in outboard of the hinge axis; a return spring to the winglet brings the rudder back to neutral.
// Adding CTLS.rudder makes wp19's checks produce rudder-hinge and rudder-horn rows; rudder-torsion is in structures.js.
// Notional.
import { GEO, BASE_MAT, DEFAULT_DESIGN } from '../structures.js';
import { FRAMES, afAt, registerBookExtras, plyWeight } from '../plybook.js';
import { CTLS, ctlSection, ctlStations, ctlVolume, ctlShell, CTL_RHO, padPlies } from './wp19_ctl.js';
import { r4 } from './wpA0_flat.js';

const tB = BASE_MAT.BID.t;
/** rev B: the cable load is block C's (LINK.cable: the 200 lb pedal force (FAR 23.397) on a 5.6 in pad over the pedal horn's
 *  effective arm (1.907 in at rev B, 587 lb limit; 1.980 in now, 566 lb live); carried here because block C imports this module, and checked against C's live
 *  value in the record). The horn keeps its 1.25 in arm, so its hole (RD_HORN) and C's cable end stay put; its thickness
 *  is sized: the lightest 6061-T6 sheet that keeps horn bending at the +15 % reserve. */
export const RUD_CABLE = 587;
CTLS.rudder = { pn: 'LEZ-55-193', parent: 'winglet', hinge: -1, travel: () => DEFAULT_DESIGN.rudderDeg, balance: () => GEO.winglet.rudderBal || 0, balRamp: () => GEO.winglet.rudderBalRamp || 0, gap: 0.06, endGap: 0.06, endGapLo: 0.1875, endGapHi: 0.125 /* DC-005 review 2: the hinge axis leans 20° in the h-planes, so the end faces move along h as the rudder turns; sized by wpAB endClearance for ≥ 0.03 in at 30° */, rod: RUD_CABLE,
  rodSrc: 'LEZ-27-151 (block C): 200 lb pedal force (FAR 23.397) × 5.6 in pad / the effective pedal horn (587 lb kept as the conservative carried value; C\'s live value is checked in the record)', horn: { arm: 1.25, armAxis: 1.10, fwd: 0.0 /* DC-005 review (2026-11-21): the cable point at the hinge face (was 1.5 in forward of it, which put the horn at dead centre near 30°); the arm now stays 1.15–1.03 in over 0–30° */, w: 1.25, t: 0.125, bolt: 3, nPad: 0, hornY: 'lower' } };
{ const h = CTLS.rudder.horn, P = DEFAULT_DESIGN.FS * RUD_CABLE; for (const t of [0.125, 0.160, 0.190, 0.250, 0.313, 0.375]) { h.t = t; if (35000 / (6 * P * h.arm / (t * h.w ** 2)) - 1 >= 0.15) break; } }
const F = FRAMES.winglet, CA = GEO.winglet.cant * Math.PI / 180, AX = [[0, 1, 0], [Math.cos(CA), 0, -Math.sin(CA)]];
/** section origin (in, [BL, 0, WL]) at height h: the winglet's leading edge on its chord plane */
const O = (h) => { const q = F.pt(h, 0, 0); return [+(q[1] * 12).toFixed(9), 0, +(q[2] * 12).toFixed(9)]; };
/** the template's section at h with its "WL" taken back to the lateral offset in the section plane (in) */
export const rdSection = (h) => { const s = ctlSection('rudder', h), z = F.pt(h, 0, 0)[2] * 12; return { ...s, pts: s.pts.map(([x, v]) => [x, v - z]) }; };
export function rdParams() {
  const st = ctlStations('rudder'), rr = (a) => a.map(([u, v]) => [r4(u), r4(v)]);
  return { segs: st.slice(0, -1).map((h, i) => ({ piece: 'U', ha: r4(h * 12), hb: r4(st[i + 1] * 12), keep: [i === 0, i === st.length - 2], O: [O(h), O(st[i + 1])], regions: { oml: [rr(rdSection(h).pts), rr(rdSection(st[i + 1]).pts)] } })),
    axes: { U: AX }, group: { oml: 'OML' }, feat: { OML: 'outline' }, n: st.length - 1 };
}
export const rdPoint = (P, s, e, q) => [0, 1, 2].map((i) => s.O[e][i] + q[0] * P.axes.U[0][i] + q[1] * P.axes.U[1][i]);
/** the horn's cable attach point (ft, [FS, BL, WL], right side): forward of the hinge face at the lower end, arm outboard */
export const RD_HORN = (() => {
  const [a] = ctlStations('rudder'), h = a + 1.0 / 12, sc = ctlSection('rudder', h), c = F.sec(h).c, yl = afAt(F, h, sc.xH).yl;
  const yp = sc.balance ? sc.balance.mid : yl;   // DC-005: set-back hinge, the pin on the axis at mid-depth (was on the inboard skin)
  const Hh = CTLS.rudder.horn, hinge = F.pt(h, sc.xH, yp), at = sc.balance ? F.pt(h, sc.xH - Hh.fwd / 12 / c, yp, Hh.armAxis / 12)   // DC-005: arm measured from the axis, outboard; the horn tip stands ≈ 0.3 in proud of the skin at the lower end, under a small fairing
    : F.pt(h, sc.xH - Hh.fwd / 12 / c, yl, Hh.arm / 12);   // 1.5 in forward of the hinge face, arm outboard of the pin
  return { h, hinge, at, depth: sc.depth };
})();
// ply book: horn pad and the true core volume, as wp19 does for the aileron and the elevator
registerBookExtras('rudder', (books, R) => {
  const b = books.rudder; if (!b) return;
  const C = CTLS.rudder, [a] = ctlStations('rudder'), nP = padPlies('rudder', R.M, R.d.FS), pw = 2.0, ph = ctlSection('rudder', a).depth * 0.8;
  b.plies.push({ id: `${b.plies[0].id[0]}-HP`, mat: 'BID', angle: 45, region: 'doubler', side: -1, local: true, span: [a, a + pw / 12], chord: [0, 0.15], plies: nP, area: pw * ph / 144, weight: plyWeight('BID', pw * ph / 144, nP), step: 2, seq: b.plies.length + 1,
    note: `Horn pad: ${nP} × 6781 ±45 on the hinge-face web at the lower end, ${pw} in tall, under the horn's two AN${C.horn.bolt} bolts`, flat: { kind: 'strip', L: pw, w0: ph, w1: ph } });
  const V = ctlVolume('rudder'), sh = ctlShell(b.plies), core = Math.max(0, V - sh.in3);
  b.core = { ...b.core, volume: core / 1728, weight: core * CTL_RHO(b.core.mat), note: `${b.core.note} (${(core / 1728).toFixed(3)} ft³ from the part's sections)` };
});
void tB;
