// Block E — the nose-gear opening in the shell (LEZ-53-150 rev E): the strut slot from the NG-30 box to the well (half-width
// slotHW, as the airframe model cuts it) and the well/door opening to the panel (the well's inner faces, ±2.28 in), open in
// the fuselage section checks (fus-bend, fus-shear) through the existing belly-cut hook. Evaluated after wp26.
import { FIXED } from '../structures.js';
import { slotHW, WELL } from './wp11_nose_gear.js';
// half-width: the well's inner faces aft of FS 29.04; between F22 and the well no wider than the strut channel's inner faces
// (its walls stand on the skin beside the cut); forward of F22 the slot table (inside the NG-30 plates)
export const NOSE_SLOT = { s0: 0.62, s1: WELL.s1, wellS0: WELL.s0, hw: (s) => (s >= WELL.s0 ? WELL.halfW : s >= WELL.chan.s0 ? Math.min(slotHW(s), WELL.chan.halfW) : slotHW(s)) * 12 };   // ft stations, half-width in
{ const prev = FIXED.fusCut; FIXED.fusCut = (s, yIn) => (prev ? prev(s, yIn) : false) || (s >= NOSE_SLOT.s0 && s <= NOSE_SLOT.s1 && Math.abs(yIn) < NOSE_SLOT.hw(s)); }
