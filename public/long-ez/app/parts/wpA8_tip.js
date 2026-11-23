// WPA8 — the rudder cable's pulley and fairlead at the wing tip (block C's route, LEZ-27-151), as block-A revisions of the
// released LEZ-57-130 winglet (rev B: a pulley-bracket hard point in the fin, a lined fairlead hole through the fin's
// inboard root skin) and LEZ-57-110 wing panel (a lined fairlead hole through the tip close-out). The positions are C's
// (RUD.P, RUD.T). Check tip-pulley: the bracket's two AN3 bolts in flox-potted NAS1832 inserts in the fin's inboard skin
// under the cable's resultant at the pulley (ultimate). Notional.
import { GEO, registerChecks, mk, psi, allowB } from '../structures.js';
import { RUD, LINK, ARM } from './wpC1_controls.js';
import { CTLS } from './wp19_ctl.js';

const IN_ = (n, v, u, s = 'DERIVED') => [n, v, u, s];
const sub = (a, b) => a.map((x, i) => x - b[i]), nrm = (a) => { const l = Math.hypot(...a); return a.map((x) => x / l); };
/** the hard point and fairlead (in): MS20220-2 pulley (3.005 in OD, for 1/8–3/16 in cable; was AN210-2A) on a 0.063 in 6061 bracket, 2 × AN3
 *  into NAS1832C3 inserts potted in Ø pot × embed flox in the fin's core; fairlead Ø 0.50 phenolic-lined hole */
// pulley (2026-11-19): MS20220-2, 3.005 in OD, 0.3125 bore, 1,680 lb, for 1/8, 5/32 and 3/16 in cable (DC-005: unchanged for the 3/16 in cable) (the AN210-1/-2 sizes are for 1/16–3/32 cable; MS24566-3B is
// 600 lb, under the two-leg resultant of the ≈ 587 lb limit tension). src 'Aircraft Spruce pulleys catalogue page Cat270143 (accessed 2026-11-19)'
export const TIP = { pulley: 'MS20220-2', pulleyOD: 3.005, pulleyBore: 0.3125, pulleyLimit: 1680, inserts: 2, pot: 0.75, embed: 0.5, fair: 0.50, liner: 'phenolic grommet, Ø 0.3125 bore' };   // DC-005 review: bore 1/8 in over the 3/16 in cable (was Ø 0.25 for 1/8 in)
/** DC-005 review: the rudder's own full-travel stop (the pedal stops sit beyond it, LINK.rudLink.pedalDeg). A 6061-T6 stop block
 *  (0.75 × 0.75 × 1.0 in, urethane bumper face 0.06 in) on the fin's lower hard point, bolted with 2 × AN3 into flox-potted NAS1832C3
 *  inserts (as the pulley bracket). The horn's outboard edge meets the bumper at full travel; the contact radius from the hinge axis is
 *  rc (DESIGN), slightly inside the cable hole so the contact force is ≥ the cable tension. Adjust with shims under the block at rigging. */
export const RSTOP = { block: '6061-T6 block 0.75 × 0.75 × 1.0 in, 0.06 in urethane bumper', bolts: 2, rcFrac: 0.9, shim: 'AN960-10L washers under the block (rigging)' };
/** loads on the rudder stop (lb): at the design cable load (FAR 23.675), and at zero airspeed with the pedal pushed on to its stop
 *  (the cable stretched by the stroke between the two stops) */
export const rudStopLoads = () => {
  const R = LINK.rudLink, arm = CTLS.rudder.horn.armAxis, rc = RSTOP.rcFrac * arm, k = arm / rc;
  const extra = Math.max(0, R.sStop - RUD.stroke), T0 = extra * R.CAB.Ehi * R.CAB.A / R.Lc   /* the stiff bound gives the larger force */, F0 = T0 * LINK.hornEff / ARM.pedalPad;
  return { arm, rc, k, extra, T0, Fped0: F0, Tdes: LINK.cable, Fdes: LINK.cable * k };
};
/** the cable's resultant on the pulley per unit tension: the two legs' unit vectors away from the pulley, added */
export const pulleyFactor = () => { const a = nrm(sub(RUD.T, RUD.P)), b = nrm(sub(RUD.H, RUD.P)); return Math.hypot(a[0] + b[0], a[1] + b[1], a[2] + b[2]); };
/** where the T → P leg crosses the wing's tip face (BL tipY) and the fin's root face (tip face + bond line) (in) */
export const fairleadAt = (bl) => { const t = (bl - RUD.T[1]) / (RUD.P[1] - RUD.T[1]); return RUD.T.map((x, i) => x + t * (RUD.P[i] - x)); };
export const TIP_FACE = () => GEO.wing.tipY * 12, FIN_FACE = () => GEO.wing.tipY * 12 + GEO.winglet.gapIn;

registerChecks('wpA8-tip', (d, lc, Z, M) => {
  if (lc.type !== 'rudder') return [];
  const T = LINK.cable * d.FS, k = pulleyFactor(), R = T * k, Pa = TIP.inserts * psi(M.FLOX.shear) * Math.PI * TIP.pot * TIP.embed, ms = Pa / R - 1;
  return [Object.assign(mk('winglet', 'tip-pulley', 'Rudder-cable pulley bracket in the fin (flox-potted inserts)', lc, `FS ${RUD.P[0].toFixed(2)}, BL ${RUD.P[1].toFixed(2)}`, 'insert shear-out', ms, {
    formula: 'R = FS·T·|u₁ + u₂| (the cable legs\' unit vectors away from the pulley);  P_allow = n·τ_flox·π·D_pot·embed',
    inputs: [IN_('Cable tension (limit)', LINK.cable, 'lb', 'LEZ-27-151 (block C LINK.cable)'), IN_('Leg geometry factor |u₁ + u₂|', k, '', 'GEOMETRY (block C RUD: fairlead, pulley, horn)'),
      IN_('Inserts', `${TIP.inserts} × NAS1832C3 in Ø ${TIP.pot} × ${TIP.embed} in flox`, 'text', 'DESIGN'), IN_('Flox shear', psi(M.FLOX.shear), 'psi', allowB(ms, 'flox (resin) shear'))],
    result: [['R (ult.)', R, 'lb'], ['P_allow', Pa, 'lb']] }), { sys: 'LEZ-57-130' }),
    (() => { const S = rudStopLoads(), F = d.FS * Math.max(S.Fdes, S.T0 * S.k), msS = Pa / F - 1;
      return Object.assign(mk('winglet', 'rud-stop', 'Rudder full-travel stop block on the fin (flox-potted inserts)', lc, 'fin lower hard point, at the horn', 'insert shear-out', msS, {
        formula: 'F = FS·max(T_design, T₀)·a_axis/r_c;  T₀ = Δs·E·A/L (cable stretched from the rudder stop to the pedal stop at zero airspeed);  P_allow = n·τ_flox·π·D_pot·embed',
        inputs: [IN_('Cable design tension (limit, FAR 23.675)', S.Tdes, 'lb', 'LEZ-27-151 (LINK.cable)'), IN_('Stroke between rudder stop and pedal stop', S.extra, 'in', 'DERIVED (LINK.rudLink)'),
          IN_('Horn arm from axis / contact radius', `${S.arm} / ${S.rc.toFixed(3)}`, 'in', 'DESIGN'), IN_('Block', `${RSTOP.block}; ${RSTOP.bolts} × AN3 into NAS1832C3 in Ø ${TIP.pot} × ${TIP.embed} in flox`, 'text', 'DESIGN'), IN_('Flox shear', psi(M.FLOX.shear), 'psi', allowB(msS, 'flox (resin) shear'))],
        result: [['Zero-airspeed cable tension at the pedal stop', S.T0, 'lb'], ['Pedal force to reach the pedal stop at zero airspeed', S.Fped0, 'lb'], ['F (ult.)', F, 'lb'], ['P_allow', Pa, 'lb']] }), { sys: 'LEZ-57-130' }); })()];
});
