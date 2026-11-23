// LEZ-32-311 brake master cylinder (bought in), right one drawn in place on the right pedal: vendor envelope. The pedal
// toe arm and the aft anchor are block C's (LEZ-27-150). Notional; sizes typed from memory.
import { MC_P, MC_LB, MC_GEO, BRK, toeLever, MC_SCD } from '../parts/wpD2_brakes.js';
import { TOE_STOP } from './c27_pedals.js';
import { L as CL } from '../parts/wpC1_controls.js';
import { PNL } from '../parts/wpB3_panel.js';
import { partByPN } from '../systems.js';
import { primVolumes, primMass, rhoFrom } from './d_prims.js';
import { openItem } from './d_icd.js';

const fx = (x, n = 2) => x.toFixed(n);
export const MCY_RHO = rhoFrom(MC_P, MC_LB);
export const MCY_DEF = {
  pn: 'LEZ-32-311', rev: 'D', status: 'released', nha: 'LEZ-32-310', qty: 2, kind: 'cots',
  title: 'Brake master cylinder',
  revs: [{ rev: 'A', date: '2026-11-18', short: 'Initial definition', change: `Initial definition: Matco MC-4 class toe-brake master cylinder, ${BRK.bore} in bore, integral reservoir, 5.0 in eye to eye at mid-stroke (typed from memory). It sat 2 in below the pedal; it now hangs on the pedal assembly, rod eye on the toe arm at FS ${fx(MC_GEO.R[1])}, WL ${fx(MC_GEO.R[2])}, body eye on block C's anchor at FS ${fx(MC_GEO.eye[1])}.` },
    { rev: 'B', date: '2026-11-18', short: 'Pull-to-apply cylinder', change: `Block C hung the pedal's toe tab ${fx(toeLever().arm, 2)} in below-aft of the rod eye, so a toe press swings the rod eye forward, away from the body eye: the rod is pulled. A push-to-apply cylinder (the MC-4 class of rev A) would not make pressure, and reversing it end for end changes nothing (the two eye points stay where C's clevis and ear are). The cylinder is now a pull-to-apply (tension) type by source control (SCD), rod retracted with the brakes off, same eyes and envelope; the toe ratio ${fx(toeLever().ratio, 3)} now comes from C's geometry (it was a 1.0 bound), and the rod, eye bolts and rated pull are checked in tension (brk-mc).` }, { rev: 'C', date: '2026-11-19', short: 'Moved 0.50 in forward', change: 'Block J interface (ICD J-R3): with block C\'s ear on its body eye at FS 40.28 the assembly stood 0.07 in under J\'s AXIS LCD collar. The cylinder moves 0.50 in forward along FS on the same axis (rod eye FS 34.90, body eye FS 39.78, WL unchanged); length, stroke, bore and outlet position on the body unchanged; block C\'s LEZ-27-150 rev B moves its clevises with it.' }, { rev: 'D', date: '2026-11-19', short: 'Available stroke; toe stop', change: `Final integration (O1 closed with block C's LEZ-27-150 rev C toe stop): the SCD now states ${BRK.strokeAvail.toFixed(2)} in of available stroke beside the ${BRK.stroke} in that makes full pressure, so the toe stop (${fx(TOE_STOP.rod, 2)} in) ends the travel before the cylinder bottoms. Check I5.` }],

  effectivity: 'Left and right (the left is the mirror placement)', params: MC_P,
  datums: [{ id: 'A', what: 'Rod-eye bolt axis (on the pedal toe arm)' }, { id: 'B', what: 'Body-eye bolt axis (on the anchor)' }],
  features: [
    { id: 'body', kind: 'profile', label: `Body Ø1.00 × 3.0 with reservoir, boss Ø0.60 × 0.6 to the body eye (AN3); outlet 1/8 NPT under the forward end with AN816-3D (clear of the panel harnesses above)`, tol: 'Vendor' },
    { id: 'rod', kind: 'profile', label: `Piston rod Ø${BRK.rodD} × 1.4 to the rod eye (AN3); eye to eye 5.0 in with the brakes off (rod retracted); pull-to-apply, stroke ≥ ${BRK.stroke} in`, tol: 'Vendor' },
  ],
  tolerances: { general: 'Vendor drawing governs', holes: 'Eyes for AN3 bolts', breakEdges: '—' },
  drawingNotes: ['Bought-in: vendor envelope; confirm on the vendor drawing.', 'Reservoir cap up; fill with MIL-PRF-5606.'], generalNote: 'Bleed from the caliper up.',
  na: { cut: 'Bought in', layup: 'Bought in' },
  material: { spec: `Pull-to-apply toe-brake master cylinder to the source control drawing: ${MC_SCD()}`, alt: 'Any pull-type cylinder meeting the SCD (bore, eyes, eye to eye, stroke, rated pull); a push-type cylinder does not fit this pedal', form: 'bought complete', density: null,
    allowables: [['Bore', `${BRK.bore} in`, 'VENDOR (typed from memory)']] },
  process: [{ op: 'Install', spec: 'Rod eye to the pedal toe arm, body eye to the anchor on the pedal assembly (both AN3, block C brackets); outlet up; connect LEZ-32-312; bleed.' }],
  checks: ['brk-line', 'brk-mc'],
  rules: [{ id: 'eye', label: 'Eye to eye, brakes off (in), SCD 5.0', v: Math.hypot(...MC_GEO.eye.map((v, i) => v - MC_GEO.R[i])), min: 4.99 }],
  mass: { each: primMass(primVolumes(MC_P), MCY_RHO), from: 'envelope volumes × effective densities from the vendor weight (typed from memory)' },
  hardware: [{ std: 'AN3-6A', qty: 2, desc: 'eye bolts (rod eye, body eye)' }, { std: 'MS21042L3', qty: 2, desc: 'nuts' }, { std: 'AN816-3D', qty: 1, desc: 'outlet nipple' }],
  hardwareNote: '2 × AN3 eye bolts with MS21042L3 nuts on the pedal assembly; AN816-3D outlet nipple.',
  interfaces: [
    { id: 'I1', with: 'LEZ-27-150 pedals (block C)', feature: 'rod', what: 'Rod eye inside the pedal envelope (toe arm), in its upper half; both sides', check: () => {
      const p = partByPN('LEZ-27-150'); if (!p) return { ok: false, detail: 'no LEZ-27-150 record' };
      const eye = (sg) => [MC_GEO.R[1] / 12, sg * MC_GEO.R[0] / 12, MC_GEO.R[2] / 12], inBox = (q, b) => q.every((v, i) => Math.abs(v - b.c[i]) <= b.d[i] / 2 + 1e-9);
      const ok = [-1, 1].every((sg) => p.geo.some((b) => b.t === 'box' && inBox(eye(sg), b) && eye(sg)[2] >= b.c[2]));
      return { ok, detail: `rod eye FS ${fx(MC_GEO.R[1])}, BL ±${fx(MC_GEO.R[0])}, WL ${fx(MC_GEO.R[2])} ${ok ? 'in the upper (toe) half of' : 'OUTSIDE'} the pedal envelope` }; } },
    { id: 'I3', with: 'LEZ-27-150 rod clevis and body ear (block C)', feature: 'body', what: 'C\'s clevis and ear on this cylinder\'s rod eye and body eye (≤ 0.01 in), both eyes on the pedal so rudder travel does not stroke it', check: () => {
      const dR = Math.hypot(CL.mcRod[0] - MC_GEO.R[1], CL.mcRod[1] - MC_GEO.R[0], CL.mcRod[2] - MC_GEO.R[2]), dB = Math.hypot(CL.mcBody[0] - MC_GEO.eye[1], CL.mcBody[1] - MC_GEO.eye[0], CL.mcBody[2] - MC_GEO.eye[2]);
      return { ok: dR <= 0.01 && dB <= 0.01, detail: `rod clevis ${fx(dR, 3)} in, body ear ${fx(dB, 3)} in from the eyes (FS ${fx(MC_GEO.R[1])} / ${fx(MC_GEO.eye[1])})` }; } },
    { id: 'I4', with: 'LEZ-27-150 toe tab (block C)', feature: 'rod', what: 'Cylinder type matches the way the toe strokes it (pull-type when a toe press lengthens it)', check: () => { const k = toeLever(), need = k.apply > 0 ? 'pull' : 'push';
      return { ok: BRK.type === need && /pull-to-apply/i.test(MC_SCD()) === (need === 'pull'), detail: `toe press ${k.apply > 0 ? 'lengthens' : 'shortens'} the cylinder (tab arm ${fx(k.arm, 3)} in about the toe hinge, ratio ${fx(k.ratio, 3)}): needs ${need}-to-apply; SCD ${BRK.type}-to-apply` }; } },
    { id: 'I5', with: 'Instrument panel LEZ-31-100 (block B)', feature: 'body', what: 'Body boss ≥ 0.1 in ahead of the panel\'s forward face', check: () => { const u = MC_GEO.u, aft = MC_GEO.eye[1] + 0.3 * Math.abs(u[2]), g = PNL.fwd - aft; return { ok: g >= 0.1, detail: `boss aft edge FS ${fx(aft)}, panel forward face FS ${fx(PNL.fwd)}: ${fx(g)} in` }; } },
    { id: 'I5', with: 'LEZ-27-150 rev C toe stop (block C)', feature: 'rod', what: `C's toe stop ends the travel past the ${BRK.stroke} in that makes full pressure and short of the ${BRK.strokeAvail.toFixed(2)} in available (the cylinder never bottoms)`, check: () => { const T = TOE_STOP; return { ok: T.rod > BRK.stroke && T.rod < BRK.strokeAvail, detail: `toe stop at ${fx(T.rod, 2)} in of rod stroke (${fx(T.pad, 2)} in at the toe pad, ratio ${fx(toeLever().ratio, 3)}): full pressure at ${BRK.stroke}, bottoms at ${BRK.strokeAvail.toFixed(2)}` }; } },
    { id: 'I2', with: 'LEZ-32-312 brake line', feature: 'body', what: 'Outlet port where the line starts', check: () => { const p = partByPN('LEZ-32-311').ports['OUT-R'].at, d = Math.hypot(p[0] * 12 - MC_GEO.out[1], p[1] * 12 - MC_GEO.out[0], p[2] * 12 - MC_GEO.out[2]); return { ok: d < 1e-6, detail: `OUT-R at FS ${fx(MC_GEO.out[1])}, BL ${fx(MC_GEO.out[0])}, WL ${fx(MC_GEO.out[2])}` }; } },
  ],
  tooling: { needed: false, text: 'None.' },
  sourcing: { blank: '—', vendor: 'Pull-type toe-brake master cylinder to the SCD, via Aircraft Spruce (vendor part number to be confirmed against the SCD; the MC-4 class of rev A is push-type)', url: 'https://www.aircraftspruce.com/menus/lg/mastercylinders.html', cost: 197.85, costAsOf: '2026-11-19', perAircraft: 2, lead: 'Stock', note: 'No pull-type toe-brake cylinder was found to price (source audit 2026-11-19). The buyable part is the Matco MC-4 (06-11150, $197.85; Aircraft Spruce, accessed 2026-11-19): push type, 7.5 ±0.25 in hole to hole, stroke about 1.388 in, remote reservoir. Adopting it needs block C to re-rig the toe tab for a push stroke and the longer body (ask in docs/icd/c_controls.md); until then this record keeps the pull-type SCD.' },
};
