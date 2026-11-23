// Memory-audit integration (2026-11-19, Miles's decisions on the research findings memaudit/materials.json, hwregs.json and pass2.json):
// the revisions it makes to the block A, B and C records. Each record whose values, sizing or solid changed takes a new rev with the
// reason. Applied by the record files themselves (release-level records) and by the block files (their DEFS). Notional.
const DATE = '2026-11-19';
const next = (r) => String.fromCharCode((r || 'A').charCodeAt(0) + 1);
const LAM = 'Laminate values from the sources: 7715 UNI 7.30 oz/yd², cured 0.0094 in at v_f 0.417, E1 33.5 GPa; 7725 BID 8.80 oz/yd², cured 0.0113 in; H45 and Styrofoam at their published minimums; hot-wet fc 0.70 / fs 0.48 (NCAMP 7781); post-cure 15 h at 80 °C in the oven (MGS L285 powered-aircraft schedule, oven size not a constraint)';
const FLAT = `${LAM}. Faces and hard points are thicker by the cured ply (0.0113 in); the solid is rebuilt; checks hold the reserve`;
const MET = 'Metal allowables per MIL-HDBK-5J / 5H CN1 as transcribed: 2024-T351 Fsu 38 ksi, 6061-T6 extrusion Fbru 82 ksi, 2024-T3 tube Fbru 122 / Fsu 39 ksi, 4130 N Fbru 200 ksi (190 over 0.188 in); AN shear from Fsu 75 ksi (AN3 2,126, AN4 3,682 lb)';
export const REVS_MEM = {
  'LEZ-57-140': ['Thinner UNI: asymmetric caps, deeper end joint', `${LAM}. The caps re-size: upper 32 → 55 UNI at the centre line (4.25 in wide, was 4.0), lower 32 → 26 (it is in tension at +g) with build-up plies from each clevis web face inboard so the end joint keeps 45 over the clevis tail (room 0.45 in: the pins 0.10 in deeper, LUG.cap). Net-section checks judge matrix modes at limit, fibre at ultimate. New check cs-tank-wall (23.965(a)(2) full-tank pressure with the wing shear). Block J's low-tunnel ligament check still reads one cap count for both caps (ICD a_airframe, open ask).`],
  'LEZ-57-110': ['H45 cap beds; root plies fill the plate room', `${LAM}. The caps lie on 0.50 in H45 cap beds the caps' width (the Panel Core 30 shear modulus, 400 psi, would have taken 90 UNI): 31 / 14 UNI needed, both caps carry 45 at the root to fill the room over the LWA plate (pin depth, I2) and drop off past the joint; pads sized for the net section too; ramps 0.113 in per ply (1:10 on the thicker BID).`],
  'LEZ-57-116': ['Drag-spar caps on the H45 block', `${LAM}. The drag-spar caps are 1.0 in wide on the 1.0 in H45 block (were 2.0 in on Styrofoam): the caps re-size; the block stays clear of block C's cuts; cure step added.`],
  'LEZ-57-130': ['Thinner UNI', `${LAM}. Caps re-size 7 → 13 UNI; solid rebuilt.`],
  'LEZ-55-120': ['Thinner UNI; F22 bolts and F28 pins re-picked', `${LAM}. Caps re-size 27 / 14 → 53 / 27 UNI. AN grips with the corrected thread terms (DLA catalogue) and washers ≤ 1/8 in: the F22 bolts and the F28 pins are re-picked (wp16 fitAN).`],
  'LEZ-57-180': ['Integral tank: 23.965(a)(2); 3 BID outer faces', `${LAM}. The outer face goes to 3 BID ±45 (the hot-wet shear knock-down took strake-tank to MS 0.09). New checks strake-tank-comb (full-tank pressure at the limit load factor, 6.08 lb/gal, with the strake's lift as skin membrane) and strake-rib-p (end rib under the pressure).`],
  'LEZ-57-151': ['Thicker BID; cure step', `${FLAT}; cure step added.`],
  'LEZ-57-152': ['Thicker BID', FLAT],
  'LEZ-57-142': ['Bolt 1 further from the root face', `${LAM}; ${MET}. Laminate shear-out at the hot-wet shear knock-down puts the first LWA bolt 3.5 in from the wing root face; the plate and its bolt row follow; Fsu 38 ksi.`],
  'LEZ-57-143': ['Pins deeper; bolt row moved; Fsu 38 ksi', `${MET}. The pin depth grows 0.10 in (the deeper cap room over the tail) and the tail bolts follow the spar's shear-out; clevis rebuilt.`],
  'LEZ-57-141': ['2024-T351 Fsu 38 ksi', MET],
  'LEZ-57-144': ['6061-T6 extrusion Fbru 82 ksi', `${MET}. The angle re-picks on 82 ksi bearing.`],
  'LEZ-57-145': ['AN grips, washers, AN8 torque', 'AN grip terms corrected (AN3 / AN4 / AN6 0.469 / 0.531 / 0.656, DLA catalogue): bolts re-picked; washers ≤ 1/8 in combined (AC 43.13-1B 7-37: regular or light AN960 under head and nut, no third washer); AN8 torque 480–690 in-lb (AC 43.13-1B table 7-1); AN960-1016 OD 1.188; AN10 price $6.43 (to be quoted).'],
  'LEZ-71-222': ['4130 Fbru per MIL-HDBK-5J', `${MET}.`],
  'LEZ-53-150': ['FR-3703 core; longerons 20 → 30 UNI', `${LAM}. Miles: the 2 lb urethane (no public data) is replaced by General Plastics LAST-A-FOAM FR-3703, 3 lb/ft³ (published compression 45, tension 75, shear 40 psi; moduli BOUND), +4 lb. Top longerons 14 → 30 UNI (thinner plies and a softer core), MS ≥ 0.10.`],
  'LEZ-53-160': ['Thicker BID', `${FLAT}. Block E's F22_FWD constant (21.7625) must follow the forward face (21.745): ICD ask.`],
  'LEZ-53-165': ['Thicker BID; pins AN4-11A', `${FLAT}. The canard's F28 pins re-pick to AN4-11A with the corrected grip terms.`],
  'LEZ-53-170': ['Strap angle limit per AC 21-34', `${FLAT}. The strap limit is AC 21-34's 5° below to 30° above horizontal at the shoulder (was 30° below, typed): at 24° below the rule fails; the anchors cannot rise into the band inside the canopy (the back leaves the OML 1 in clearance near WL 47): Miles to decide (structure above the shoulder or accepted rationale).`],
  'LEZ-53-175': ['Thicker BID', FLAT], 'LEZ-53-180': ['Thicker BID; paper density; AC 20-135A', `${FLAT}. Fiberfrax 970J 13.4 lb/ft³ (heavy end); fireproof test per AC 20-135A (SAE AS6826).`],
  'LEZ-08-105': ['Thicker BID', FLAT], 'LEZ-08-100': ['Steel density 0.283', `${FLAT}; 4130 at 0.283 lb/in³.`], 'LEZ-08-110': ['Thicker BID', FLAT],
  'LEZ-55-193': ['MS20667-4 fork end', 'The rudder cable is 1/8 in: its fork end is MS20667-4 (the -3 is for 3/32 cable).'],
  'LEZ-56-100': ['Thicker BID', FLAT], 'LEZ-56-110': ['Hinge bearing 104 ksi; AD4 368 lb', '2024-T3 sheet Fbru at e/D 1.5 104 ksi (MIL-HDBK-5H CN1); MS20470AD4 368 lb (AC 43.13-1B table 4-8), one value everywhere; #8 screw tension kept at the conservative 1,000 lb; check cable fill 0.71.'],
  'LEZ-56-120': ['Thicker BID', FLAT], 'LEZ-56-130': ['Thicker BID', FLAT], 'LEZ-52-130': ['Thicker BID', FLAT], 'LEZ-52-140': ['Thicker BID; AMS 5518', `${FLAT}. The 301 ½-hard spring stock is AMS 5518 (AMS 5519 is full hard).`],
  'LEZ-31-100': ['Thicker BID; #8 screw shear 1,050 lb', `${FLAT}. Display screws at 1,050 lb single shear, the threads-in-the-plane end of the range.`],
  'LEZ-25-100': ['Thicker BID', FLAT], 'LEZ-25-110': ['Console core 0.37 in; reach model', `${FLAT}. The console core is 0.37 in so the console keeps its 0.415 in depth over block G's LEZ-76-100. Reach from ANSUR II (5th female 22.6 in, shoulder 6.6 in off the centre line, acromion 23.7 in): block F's selector knob now fails I6 (24.9 in): ICD b_cockpit ask to block F.`],
  'LEZ-25-120': ['Confor 6.0 lb/ft³', 'Confor CF-45EG at 6.0 lb/ft³ (3M/Aearo MSS50).'], 'LEZ-25-121': ['Confor 6.0 lb/ft³', 'Confor CF-45EG at 6.0 lb/ft³ (3M/Aearo MSS50).'],
  'LEZ-25-130': ['Harness price; strap limit', 'Hooker Sport Harness $315 (Aircraft Spruce). The strap angle is checked against AC 21-34 (block A\'s LEZ-53-170): open.'],
  'LEZ-25-140': ['AN42B eyebolts', 'The baggage-net tie-downs are AN42B 10-32 eyebolts (not "AN3 eyebolts").'],
  'LEZ-27-100': ['Hardware masses; AN3 shear', `${MET}. AN3-7A 0.0114 lb, AN3-6A 0.0101 lb, AN960-10 0.0021 lb; rod ends Aurora MM-3 / CM-3 (both male), 1,169 lb, ball width 0.312; the 23.405 lever rule is labelled DESIGN (Part 25's).`],
  'LEZ-27-150': ['1/8 in cable hardware', 'MS20667-4 fork ends, MS21251-B5S turnbuckle with MS21260-S4 terminal, MS20220-2 fin pulley (1,680 lb) with an AN3 guard pin (the MS24566-1B line was a pulley, not a guard pin).'],
  'LEZ-27-151': ['1/8 in cable hardware', 'Fork ends MS20667-4 and turnbuckle MS21251-B5S in the check (2,000 / 2,200 lb).'],
  'LEZ-27-170': ['BID face 18 ksi; H45 67 psi', 'Panel face allowable ≈ 2 τ12 = 18 ksi (NCAMP 7781, BOUND) and H45 shear 67 psi (minimum); thicker BID; actuator anchor moves with the PA-01 (7.13 in retracted).'],
  'LEZ-27-171': ['PA-01 actuator', 'PA-14 superseded by PA-01 (same mounting): 3 in stroke, 7.13 in retracted, 169 lb option, $114.99.'],
};
for (const pn of ['LEZ-27-110', 'LEZ-27-111', 'LEZ-27-120', 'LEZ-27-130', 'LEZ-27-135', 'LEZ-27-140', 'LEZ-27-160', 'LEZ-27-165']) REVS_MEM[pn] = ['Rod ends and allowables', `${MET}. Rod ends Aurora MM-3 / CM-3 (male), 1,169 lb ultimate, ball width 0.312 in: the solid follows.`];
/** apply to one record (idempotent) */
export function memRev(d) { const e = d && REVS_MEM[d.pn]; if (!e || (d.revs || []).some((r) => r.date === DATE && r.short === e[0])) return d;
  const rev = next([d.rev, ...(d.revs || []).map((r) => r.rev)].filter(Boolean).sort().at(-1)); d.rev = rev; d.revs = [...(d.revs || []), { rev, date: DATE, short: e[0], change: e[1], phase: 'mem' }]; return d; }
export const applyMemRevs = (DEFS) => { for (const k of Object.keys(DEFS)) memRev(DEFS[k]?.def); return DEFS; };
