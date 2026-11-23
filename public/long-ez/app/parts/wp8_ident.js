// Identification of bought-in parts: a standard or vendor part number (std) where one governs, otherwise a
// source-control drawing (scd: the requirement the buyer orders against: performance, envelope, interface,
// qualification). Every fabricated part gets a generated dimensioned drawing (sysdrawing.js).
import { partByPN } from '../systems.js';
import { FIXED } from '../structures.js';

const ID = {
  'LEZ-71-210': { std: 'Lycoming O-235-L2C (type-certificated engine; model and data per the engine data plate and operator\'s manual)' },
  'LEZ-71-221': { scd: { spec: 'Conical elastomeric isolator set for the Lycoming Type 1 (conical) mount, front and rear halves per boss, AN7 through-bolt; per the engine installation manual', envelope: [2.9, 2.9, 2.0] } },
  'LEZ-61-100': { scd: { spec: 'Fixed-pitch laminated-wood pusher propeller, 62 in diameter, pitch for a 2,700–2,800 rpm cruise, urethane-protected leading edges, hub drilled to the engine flange via the extension; static balance within the maker\'s limit', envelope: [62, 6.5, 4.5] } },
  'LEZ-61-120': { scd: { spec: 'Spinner 11 in dia. with front and rear bulkheads, aluminium, sized to clear the cowl exit; mass ≤ 2.0 lb', envelope: [11, 11, 6] } },
  'LEZ-76-110': { std: 'Push-pull control cable assemblies to the cable drawing: throttle and mixture with 10-32 rod ends and friction lock; carb heat plain; conduit OD 0.25 in, minimum bend 6 in' },
  'LEZ-27-151': { std: 'Cable MIL-DTL-83420 Type I Comp. B (CRES) 3/16 in 7×19; MS20667-6 swaged fork ends; MS21251-B6S turnbuckle body with MS21256 clips' },
  'LEZ-23-110': { std: 'Coax M17/128-RG400 with M39012 BNC plugs; dipole element laid up in the winglet per the antenna drawing' },
  'LEZ-28-170': { scd: { spec: `Flush locking fuel filler cap and neck, 2 in opening, fuel-resistant O-ring, cap chained; marking "AVGAS 100LL / ${FIXED.fuelQty ? FIXED.fuelQty.placard : 26} US GAL USABLE" at each filler (FAR 23.1557 yardstick)`, envelope: [3.0, 3.0, 1.5] } },
  'LEZ-28-180': { scd: { spec: 'Flush belly quick-drain: 1/8 NPT inlet from the sump drain line, push-to-drain poppet flush with the skin, fuel-resistant seal, positive lock closed', envelope: [0.8, 0.8, 1.3] } },
  'LEZ-28-190': { scd: { spec: 'Fuel sight gauge: fuel-resistant clear tube 1/4 in on two AN832-4 fittings, calibrated in US gallons by filling in 2 gal steps', envelope: [6.0, 0.4, 0.4] } },
  'LEZ-27-171': { scd: { spec: '14 V reversing linear actuator, 3 in stroke, ≥ 150 lb at 4 A, internal limit switches, back-drivable above the brake placard speed', envelope: [8.1, 1.4, 1.4] } },
  'LEZ-32-300': { std: 'Tyre Goodyear Flight Special II 5.00-5 6-ply 505C61-8 (TSO-C62c; 120 mph, 1,285 lb at 50 psi, OD 13.65–14.2 in, width ≤ 4.95 in); tube 5.00-5; wheel half of the Matco W51LT kit' },
  'LEZ-24-110': { scd: { spec: 'Sealed lead-acid AGM battery, 12 V, ≥ 16 Ah (20 h rate), ≥ 500 A cranking, any-attitude, vented box overboard; ≤ 15.5 lb; envelope 7.1 × 3.5 × 6.6 in', envelope: [7.1, 3.5, 6.6] } },
  'LEZ-24-120': { scd: { spec: 'Continuous-duty master contactor, 14 V coil ≤ 0.6 A, 100 A continuous, 5/16 in studs; plus 10 A blade fuse in a sealed in-line holder (F3)', envelope: [3.0, 2.5, 2.5] } },
  'LEZ-24-130': { std: 'Circuit breakers MS26574 push-to-reset (ratings per the wire list); ANL fuses 40 A (F1) and 50 A (F2) in insulated holders; Schottky diode 30 A on a heat-sink bracket (D1); bus bars per the panel drawing' },
  'LEZ-24-140': { scd: { spec: 'Ground blocks: cabin 30 faston tabs + 1/4 in stud; firewall 8 tabs + 5/16 in stud through the firewall (stainless, fire-sealed)', envelope: [3.0, 1.0, 0.8] } },
  'LEZ-24-150': { scd: { spec: 'Solid-state regulator with overvoltage crowbar (trip 16.0 ± 0.3 V) and ALT LOW output, DB-9; for a 40 A internally-unregulated alternator', envelope: [3.0, 2.0, 1.2] } },
  'LEZ-80-100': { scd: { spec: 'Intermittent-duty starter contactor, 14 V coil, 200 A make, 5/16 in studs', envelope: [2.5, 2.5, 3.0] } },
  'LEZ-33-100': { std: 'Combination position (TSO-C30c) and anti-collision (TSO-C96a) LED wingtip units, left red / right green with aft white' },
  'LEZ-33-120': { scd: { spec: 'LED landing light, 14 V, ≤ 2 A, ≥ 30,000 cd, sealed, behind a clear nose window', envelope: [2.5, 2.5, 1.5] } },
  'LEZ-25-130': { std: 'Restraint: 4-point harness with lap belt to TSO-C22g and shoulder harness to TSO-C114, rotary buckle' },
  'LEZ-74-120': { std: 'Aviation spark plugs, 18 mm, massive electrode, from the engine maker\'s approved plug list (heat range per the operator\'s manual)' },
};
for (const [pn, v] of Object.entries(ID)) { const p = partByPN(pn); if (p) Object.assign(p, v); }
