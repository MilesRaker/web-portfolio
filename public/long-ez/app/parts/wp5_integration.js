// WP5 — integration: structure masses adopted, nose ballast sized from the loading envelope, front-seat placard,
// final clash and requirement close-out. Notional; W&B against the published Long-EZ CG range (see WB in structures).
import { WB, cgLim, MASS_ITEMS, massItems, FIXED } from '../structures.js';
import { defineParts, defineKeepouts, defineReqs, adoptMass, clashCheck, routes, partByPN } from '../systems.js';
import { BATT } from './wp3_electrical.js';

const S1 = (title, inspect) => ({ title, inspect });
import { BALLAST, NBG, NB, FB_CG, RP_CG } from './wpA5_ballast.js';   // fixed and removable ballast: defined in block A (LEZ-08-100 / -105 / -110); s, sPlate = their centroids (ft)
export { BALLAST };
const PAYLOAD = ['pilot', 'pax', 'fuel', 'bag', 'nosebag'];
export const PILOT_MAX = 250, PAX_MAX = 250, BAG_MAX = 25, FUEL_MAX = FIXED.fuelMaxLb ?? 312, GROSS = 1325;

defineParts([
  { massItem: 'ballast', pn: 'LEZ-08-100', name: `Fixed nose ballast, lead, ${BALLAST.fixed} lb (block forward of the nose ballast bulkhead, side slabs aft of it)`, kind: 'machined', ata: 8, nha: 'LEZ-08-105', material: 'lead', massEach: BALLAST.fixed, cg: [FB_CG.s, 0, 35.2 / 12],
    geo: [{ t: 'box', c: [(NB.s * 12 + NBG.blockFwd + 1.0) / 12, 0, 34.4 / 12], d: [1.5 / 12, 0.25, 1.4 / 12], draw: false }, ...[1, -1].map((sg) => ({ t: 'box', c: [(NB.s * 12 + NBG.slab0 + NBG.slabL / 2) / 12, sg * 2.9 / 12, 34.6 / 12], d: [NBG.slabL / 12, 2.4 / 12, 2.4 / 12], draw: false }))],
    blurb: 'Cast lead: a block cast to the nose\'s inner contour forward of the nose ballast bulkhead (LEZ-08-105) and two side slabs aft of it either side of the nose-gear box, clamped through the bulkhead by four AN5 bolts between 4130 plates. Sized by the loading sweep so that, with the removable plates, every pilot from about 120 to 250 lb is inside the CG range with any passenger, fuel and baggage up to gross. See the note on why the model needs this much.',
    notes: ['The model\'s empty CG sits about 11 in aft of the published Long-EZ fleet (FS 121 vs 109–112) and it is about 115 lb lighter than typical aircraft. Much of this ballast stands in for forward structure and equipment mass the notional ply books and estimates do not capture; a weighed airframe would set the real figure.'],
    steps: [S1('Cast to the definition (LEZ-08-100); drill; bolt through the bulkhead between the plates', [`Weigh: ${BALLAST.fixed}.0 ± 0.5 lb`, 'Bolts torqued and safetied']), S1('Re-weigh the aircraft; amend the W&B and placard', ['Empty weight and CG recorded on the W&B form'])],
    src: { mass: 'Loading sweep (ballastPlacard); the definition solid matches it' } },
  { pn: 'LEZ-08-110', name: `Removable ballast plates, lead, ${BALLAST.plates} × ${BALLAST.plate} lb`, kind: 'machined', ata: 8, nha: 'LEZ-08-100', material: 'lead', qty: BALLAST.plates, massEach: BALLAST.plate, cg: [RP_CG.s, 0, 35.2 / 12],
    geo: [1, -1].map((sg) => ({ t: 'box', c: [(NB.s * 12 + NBG.p0 + NBG.plateL / 2) / 12, sg * 2.9 / 12, 34.6 / 12], d: [NBG.plateL / 12, 2.4 / 12, 2.4 / 12], draw: false })),
    blurb: 'One each side of the nose-gear box on the side slabs\' aft plates, on two ball-lock pins each, for lighter pilots per the front-seat placard. Loading items, not empty weight.',
    steps: [S1('Cast; stamp weight and part number; fit the ball-lock pins', [`Each plate ${BALLAST.plate.toFixed(1)} ± 0.2 lb`, 'Pins cannot be fitted unlatched'])], src: { mass: 'Loading sweep; the definition solid matches it' } },
]);
defineKeepouts([
  { id: 'ko-ballast', t: 'box', c: [0.42, 0, 2.83], d: [0.32, 0.40, 0.28], why: 'nose ballast', owner: 'LEZ-08-100' },
  { id: 'ko-battery', t: 'box', c: BATT, d: [0.58, 0.32, 0.58], why: 'battery', owner: 'LEZ-24-110', applies: (c) => c !== 'power' },
]);

// ------------------------------------------------------------------------------------------- loading sweep
/** empty weight and CG from the mass model (every non-payload item, defined where adopted) */
export function emptyWB() {
  const it = massItems().filter(([id]) => !PAYLOAD.includes(id)), U = FIXED.unusableFuel, W = it.reduce((a, i) => a + i[2], 0) + (U ? U.lb : 0), M = it.reduce((a, i) => a + i[2] * i[3], 0) + (U ? U.lb * U.s : 0);   // + the unusable fuel (block F), empty weight per FAR 23.29
  return { W, s: M / W, items: it };
}
function cgOf(E, wp, wx, f, b, B) { const W = E.W + wp + wx + f + b + B; return { W, s: (E.W * E.s + wp * arm('pilot') + wx * arm('pax') + f * arm('fuel') + b * arm('bag') + B * BALLAST.sPlate) / W }; }
const arm = (id) => MASS_ITEMS.find((i) => i[0] === id)[3];
/** pilot-weight range that keeps every loading (passenger, fuel, baggage, up to gross) inside the CG range */
function pilotRange(E, B) {
  const [lo, hi] = cgLim(), okAt = (wp, side) => {
    for (const wx of [0, 60, 120, 170, 250]) for (let f = 0; f <= FUEL_MAX; f += 26) for (const b of [0, BAG_MAX]) {
      const r = cgOf(E, wp, wx, f, b, B); if (r.W > GROSS) continue;
      if (side < 0 && r.s < lo - 1e-9) return false; if (side > 0 && r.s > hi + 1e-9) return false;
    }
    return true;
  };
  let min = null, max = null;
  for (let wp = 90; wp <= 300; wp++) { if (min == null && okAt(wp, 1)) min = wp; if (okAt(wp, -1)) max = wp; }
  return { min, max: max == null ? null : Math.min(max, PILOT_MAX) };
}
/** front-seat placard: pilot-weight band for each number of removable plates (fixed ballast is in empty weight) */
export function ballastPlacard() {
  const E = emptyWB(), rows = [];
  for (let k = 0; k <= BALLAST.plates; k++) rows.push({ plates: k, ...pilotRange(E, k * BALLAST.plate) });
  const covers = rows.map((r) => [r.min, r.max]).sort((a, b) => a[0] - b[0]), lowest = covers[0][0];
  let reach = covers[0][1], gap = false; for (const [a, b] of covers.slice(1)) { if (a > reach + 1) gap = true; reach = Math.max(reach, b); }
  const useful = GROSS - E.W, twoUp = GROSS - E.W - 200 - 170 - BAG_MAX;
  return { E, rows, lowest, highest: reach, gap, useful, twoUpFuelGal: Math.max(0, twoUp) / 6, fleet: { W: [840, 1000], cgPub: [109, 112] } };
}

defineReqs([
  { id: 'R-INT-1', closed: true },
  { id: 'R-INT-2', closed: true, verify: () => {
    const P = ballastPlacard(), [lo, hi] = cgLim().map((x) => x * 12 - WB.datumIn);
    const ok = !P.gap && P.lowest <= 125 && P.highest >= PILOT_MAX;
    return { ok, detail: `empty ${P.E.W.toFixed(0)} lb @ FS ${(P.E.s * 12 - WB.datumIn).toFixed(1)} (published frame); every loading inside FS ${lo}–${hi} for pilots ${P.lowest}–${P.highest} lb with 0–${BALLAST.plates} plates; useful load ${P.useful.toFixed(0)} lb` };
  } },
]);
adoptMass(['fus', 'wings', 'canard', 'gear', 'ballast']);
void routes; void clashCheck; void partByPN;
