// e_upstop: block E definition record (see site/defn/e_rec.js). Notional, not for construction.
import { rec, an, fx } from './e_rec.js';
import { NG, KIN, DOOR, SWF, NOSE_SW } from '../parts/ng_layout.js';
import { SIZING } from '../parts/ng_sizing.js';
import { E, PLATE, NG6, DSTOP, USTOP, NG3, NG4, FORK, ARM, HOUSING, SHELF, LINK, WHEEL, DR, DISC, FLAG, BOLTS, secIn, plateTapes, coverSkin, SW_WIRE, GEARBOX_LB } from '../parts/wpE1_nosegear.js';
import * as I from './e_icd.js';
const SZ = SIZING.pick, AS = 'https://www.aircraftspruce.com';
export const UPS = rec({
  pn: 'LEZ-32-226', nha: 'LEZ-32-201', kind: 'machined', title: 'Strut up-stop',
  change: `Initial definition. The block model put the up-stop over the NG-6, 1.3 in from the hinge: the up-lock squeezes the preloaded spring link against it, which at that radius meant ≈ 6000 lb. It now sits over the strut's aft face ${USTOP.pad.u[0]}–${USTOP.pad.u[1]} in below the hinge (stowed), on a 6061 bar between the plates' HP3 hard points, clear of the NG-3 ears and the link through the swing.`,
  datums: [{ id: 'A', what: 'Strut aft face at the stowed angle' }],
  features: [{ id: 'stop', kind: 'plate', label: `Bar 6061-T6 ${fx(USTOP.bar.u[1] - USTOP.bar.u[0])} × 0.5, BL ±${fx(USTOP.bar.y)}, tapped 10-32 each end`, tol: '—' }, { id: 'pad', kind: 'plate', label: '90A HT61 0.25, BL ±0.68', tol: `Shim to contact at ${fx(NG.phi1, 1)}° ± 0.3°` }],
  material: { spec: '6061-T6 bar; 90A HT61', alt: '—', form: 'bar', density: null, allowables: [['Urethane pad bearing', '3 ksi', 'BOUND (typed from memory)']] },
  process: [{ op: 'Install', spec: 'Bar between the plates with an AN3 each end; bond the pad; shim to contact.' }],
  checks: ['ngear-ustop'], hardware: [{ std: an(3, 0.42 + 0.40, 0.06), qty: 2, desc: 'bar bolts' }], hardwareNote: 'Safety-wired.',
  interfaces: [{ id: 'I1', with: 'LEZ-32-200 strut', feature: 'pad', what: 'Contact at UP, clear through the swing', check: () => I.stopCheck('up') }, { id: 'I2', with: 'LEZ-32-213 link', feature: 'stop', what: 'Link clear of the bar', check: I.linkVsStops }],
  tooling: { needed: false, text: 'Shims.' },
  sourcing: { blank: '6061 bar 0.5 × 1.5 × 5; HT61 1/4', vendor: 'Aircraft Spruce; McMaster-Carr (HT61)', url: AS + '/menus/mp/aluminum.html', cost: 15, costAsOf: '2026-11-18', perAircraft: 1, lead: 'Stock', note: 'Approximate.' },
});

void KIN; void DOOR; void SWF; void NOSE_SW; void USTOP; void NG4; void FORK; void ARM; void HOUSING; void LINK; void WHEEL; void DR; void FLAG; void coverSkin; void SW_WIRE; void GEARBOX_LB; void PLATE; void NG6; void DSTOP; void NG3; void SHELF; void DISC; void BOLTS; void secIn; void plateTapes; void I; void an; void SZ; void AS; void E;
