// WP2 — flight controls (ATA 27) and landing-gear systems (ATA 32): side stick, pitch and roll rods, elevator
// torque tube and balance weights, rudder cables, landing brake, nose gear with manual worm-drive retract,
// main wheels and hydraulic brakes. Notional, public data and FAR 23 yardsticks; not for construction.
import { GEO, registerChecks, mk, gearLeg, WEIGHT_CASES, weightCase, aircraft } from '../structures.js';
import { defineParts, defineGraph, defineReqs, adoptMass, partByPN, PARTS, V3 } from '../systems.js';

const { sub, len } = V3;
const S1 = (title, inspect) => ({ title, inspect });
const CTL = { massItem: 'controls' };

// ------------------------------------------------------------------------------------------- layout (model frame, ft)
const STICK = [3.9167, 0.83, 3.00], STICK_R = [7.025, 0.81, 2.34];          // pivots under the right console (GLB sticks)
const ELEV_HINGE_S = GEO.canard.le + (1 - GEO.canard.elevCf) * GEO.canard.c;
const ELEV_BC = [ELEV_HINGE_S + 0.05, 0.30, GEO.canard.z - 0.05];         // elevator torque-tube bellcrank, in the fuselage
const ROLL_BC = [9.425, 0.40, 2.70];                                     // aileron bellcrank behind the rear seat, ahead of the firewall
const PEDAL = (sg) => [3.05, sg * 0.36, 2.55];
const AXLE = (sg) => { const p = gearLeg(1); return [GEO.gear.s, sg * p[0], p[1]]; };
const pitchRod = [[STICK[0], STICK[1] - 0.08, STICK[2] - 0.25], [3.7843, 0.62, 2.95], [3.4, 0.45, 3.25], [ELEV_BC[0] + 0.15, ELEV_BC[1], ELEV_BC[2] - 0.20]];
const rollRod = [[STICK[0] + 0.1, STICK[1] - 0.05, STICK[2] - 0.30], [STICK_R[0], STICK_R[1] - 0.05, STICK_R[2] + 0.02], [ROLL_BC[0] - 0.1, ROLL_BC[1] + 0.25, ROLL_BC[2]]];
const ailRod = (sg) => [[ROLL_BC[0] + 0.05, sg * 0.70, 2.85], [9.825, sg * 1.20, 3.00], [10.475, sg * 2.40, 3.05], [11.275, sg * 3.75, 3.05], [12.225, sg * 4.90, 3.05]];
const rudCable = (sg) => [PEDAL(sg), [3.40, sg * 0.82, 3.25], [8.275, sg * 0.82, 3.40], [9.475, sg * 0.80, 3.30], [10.475, sg * 1.60, 3.10], [10.775, sg * 3.00, 3.06], [10.825, sg * 3.70, 3.05], [11.175, sg * 3.90, 3.05], [11.875, sg * 4.50, 3.05], [14.225, sg * 12.15, 3.05], [14.475, sg * 12.40, 3.25]];
// wheel centre (axle) and the internal-caliper brake on the inboard side of each main wheel (Matco W51LT; disc size ASSUMED)
export const WHEEL = (sg) => [GEO.gear.s, sg * GEO.gear.track / 2, GEO.gear.axleZ], DISC = { r: 0.25, t: 0.25 / 12, offset: 0.25 };
const DISC_C = (sg) => { const w = WHEEL(sg); return [w[0], w[1] - sg * DISC.offset, w[2]]; };
const MC_PORT = (sg) => [3.25, sg * 0.36, 2.40], CAL_PORT = (sg) => { const d = DISC_C(sg); return [d[0], d[1] - sg * 0.05, d[2] + DISC.r + 0.04]; };
const brakeLine = (sg) => {
  const leg = [0.15, 0.4, 0.7, 0.95].map((u) => { const p = gearLeg(u); return [GEO.gear.s + 0.10, sg * p[0], p[1] + 0.06]; });
  return [MC_PORT(sg), [3.40, sg * 0.45, 2.30], [3.7591, sg * 0.55, 2.25], [8.375, sg * 0.55, 2.22], [GEO.gear.s, sg * 0.55, 2.18], [GEO.gear.s + 0.08, sg * 0.74, 1.98], ...leg, CAL_PORT(sg)];
};

// ------------------------------------------------------------------------------------------- parts
defineParts([
  // ---- ATA 27 flight controls
  { ...CTL, pn: 'LEZ-27-100', name: 'Flight-control installation', kind: 'install', ata: 27, massEach: 0.4, geo: [{ t: 'box', c: STICK, d: [0.05, 0.05, 0.05] }],
    blurb: 'Pitch and roll from a right-console side stick through rigid rods (no cables), so there is no stretch and no tension to rig. Rudders by cable from the front pedals; each rudder only deflects outward and doubles as a yaw damper/airbrake when both are pushed.',
    steps: [S1('Rig neutral, travel and stops for all three axes', ['Elevator, aileron and rudder throws within ±1/16 in of the rigging table', 'Free-play at each surface TE ≤ 1/32 in']), S1('Duplicate inspection of every rod end and safety', ['Every jam nut torqued and witness-marked', 'Rod-end thread engagement past the check hole'])],
    src: { mass: 'ASSUMED' } },
  { ...CTL, pn: 'LEZ-27-110', name: 'Side stick and console base (front)', kind: 'mechanism', ata: 27, nha: 'LEZ-27-100', massEach: 1.6, meshes: /^SideStick$/,
    geo: [{ t: 'cyl', a: STICK, b: [STICK[0], STICK[1], STICK[2] + 0.62], r: 0.03 }, { t: 'box', c: [STICK[0], STICK[1], STICK[2] - 0.1], d: [0.30, 0.18, 0.16] }],
    blurb: 'Wrist-action stick on a two-axis gimbal in the right console: fore-aft drives the pitch rod, side-to-side rotates the roll tube. Grip 7 in above the pivot; rod arms 2.5 in.',
    props: [['Grip arm / rod arm', '7.0 / 2.5 in (ASSUMED)'], ['Pilot force (23.397 yardstick)', '167 lb pitch, 67 lb roll']],
    interfaces: [{ id: 'stick-base', name: 'Stick base → fuselage side', host: 'fuselage', at: STICK, n: 4, d: 0.19, kind: 'insert', insertD: 0.75, embed: 0.5, tHost: 0.10, load: () => ({ F: [167 * 7 / 2.5, 67 * 7 / 2.5, 0], note: '23.397 pilot forces through the stick ratio' }) }],
    steps: [S1('Machine gimbal; press bearings; assemble on the console bracket', ['No axial play in either axis', 'Stick returns smoothly, no binding through full travel'])], src: { mass: 'ASSUMED' } },
  { ...CTL, pn: 'LEZ-27-111', name: 'Rear stick, removable', kind: 'mechanism', ata: 27, nha: 'LEZ-27-100', massEach: 0.5, geo: [{ t: 'cyl', a: STICK_R, b: [STICK_R[0], STICK_R[1], STICK_R[2] + 0.75], r: 0.025 }],
    blurb: 'Plugs onto the roll tube in the rear cockpit for a pilot-rated passenger; stowed when not needed. No rudder pedals in the rear seat.', steps: [S1('Fit the quick-release pin', ['Pin cannot be fitted without the safety clip engaging'])], src: { mass: 'ASSUMED' } },
  { ...CTL, pn: 'LEZ-27-120', name: 'Pitch pushrod, stick to elevator bellcrank (3/4 × .035 2024-T3)', kind: 'line', ata: 27, nha: 'LEZ-27-100', material: '2024',
    geo: [{ t: 'path', pts: pitchRod, dIn: 0.75, wallIn: 0.035, cls: 'pushrod' }], guides: 24,
    steps: [S1('Cut, rivet rod-end inserts, fit UHMW guides every 24 in', ['Rod straight within 1/16 in over its length', 'Guides clear by ≥ 1/32 in all round'])], src: { mass: 'GEOMETRY' } },
  { ...CTL, pn: 'LEZ-27-130', name: 'Elevator torque tube and bellcrank', kind: 'machined', ata: 27, nha: 'LEZ-27-100', material: '4130',
    geo: [{ t: 'cyl', a: [ELEV_HINGE_S, -0.60, GEO.canard.z - 0.02], b: [ELEV_HINGE_S, 0.60, GEO.canard.z - 0.02], r: 0.05, wall: 0.035 }, { t: 'box', c: ELEV_BC, d: [0.25, 0.04, 0.25] }],
    blurb: 'Couples the two elevators across the fuselage at the canard hinge line; the bellcrank arm takes the pitch rod. Elevators come off with the canard (two bolts per side).',
    steps: [S1('Weld bellcrank to the tube in the jig; drill elevator drive tangs', ['Both elevators neutral within 1/16 in with the tube clamped'])], src: { mass: 'GEOMETRY' } },
  { ...CTL, pn: 'LEZ-27-135', name: 'Elevator mass-balance weights (L/R)', kind: 'machined', ata: 27, nha: 'LEZ-27-130', material: 'steel', qty: 2, massEach: 1.1,
    geo: [-1, 1].map((sg) => ({ t: 'cyl', a: [ELEV_HINGE_S - 0.06, sg * 2.6, GEO.canard.z], b: [ELEV_HINGE_S - 0.06, sg * 3.6, GEO.canard.z], r: 0.03 })),
    blurb: 'Lead slugs on arms forward of the hinge line bring each elevator to static balance about its hinge (flutter margin; FAR 23.629 yardstick).',
    steps: [S1('Balance each painted elevator on knife edges; trim lead to balance', ['Static balance: TE does not drop when released level'])], src: { mass: 'ASSUMED (balance of a painted elevator)' } },
  { ...CTL, pn: 'LEZ-27-140', name: 'Roll tube, front stick to rear stick to bellcrank (5/8 × .035 4130)', kind: 'line', ata: 27, nha: 'LEZ-27-100', material: '4130',
    geo: [{ t: 'path', pts: rollRod, dIn: 0.625, wallIn: 0.035, cls: 'pushrod' }], guides: 24,
    steps: [S1('Fit tube, bearings at each console station', ['Rotates freely, no axial play'])], src: { mass: 'GEOMETRY' } },
  { ...CTL, pn: 'LEZ-27-141', name: 'Aileron bellcrank (centre section)', kind: 'machined', ata: 27, nha: 'LEZ-27-100', material: '6061', massEach: 0.5, geo: [{ t: 'box', c: ROLL_BC, d: [0.2, 0.3, 0.2] }],
    steps: [S1('Machine; bushed pivot on the CS-spar bracket', ['Pivot bolt safetied, no end play'])], src: { mass: 'ASSUMED' } },
  { ...CTL, pn: 'LEZ-27-142', name: 'Aileron rods, bellcrank to aileron (L/R, 5/8 × .035 2024-T3)', kind: 'line', ata: 27, nha: 'LEZ-27-100', material: '2024', qty: 2,
    geo: [-1, 1].map((sg) => ({ t: 'path', pts: ailRod(sg), dIn: 0.625, wallIn: 0.035, cls: 'pushrod', extSeg: [1, 2] })), guides: 24,
    blurb: 'Rod-end jointed rods aft of the centre-section spar, through the strake behind the tank and out the wing to the aileron horn.',
    steps: [S1('Install before closing the wing; guides at each rib', ['Full aileron travel with no rod contact', 'Rod ends safetied'])], src: { mass: 'GEOMETRY' } },
  { ...CTL, pn: 'LEZ-27-150', name: 'Rudder/brake pedals (front)', kind: 'mechanism', ata: 27, nha: 'LEZ-27-100', massEach: 1.8, meshes: /^RudderPedals$/,
    geo: [-1, 1].map((sg) => ({ t: 'box', c: [2.95, sg * 0.36, 2.85], d: [0.10, 0.26, 0.45] })),
    blurb: 'Hung pedals beside the nose-gear box. First travel pulls the rudder cable; the toe of each pedal works its brake master cylinder.',
    steps: [S1('Assemble; set pedal-to-rudder neutral', ['Pedals square at neutral', 'Brake not applied at full rudder'])], src: { mass: 'ASSUMED' } },
  { ...CTL, pn: 'LEZ-27-165', name: 'Pitch trim: console lever, friction guide, spring cartridge on the pitch rod', kind: 'mechanism', ata: 27, nha: 'LEZ-27-100', massEach: 0.6, meshes: /^TrimLever$/,
    geo: [{ t: 'box', c: [4.4699, -0.80, 3.28], d: [0.40, 0.06, 0.06] }, { t: 'cyl', a: [4.4699, -0.80, 3.13], b: [4.1318, -0.80, 3.13], r: 0.025 }],
    blurb: 'Spring trim: the lever in a friction slot on the left console sets the preload of a spring cartridge that biases the pitch rod, so the stick force trims out without a trim tab.',
    steps: [S1('Set the cartridge neutral with the lever mid-slot', ['Full lever travel trims from Vx to Vne hands-off (flight test)', 'Lever holds position against 3 lb'])], src: { mass: 'ASSUMED' } },
  { ...CTL, pn: 'LEZ-27-151', name: 'Rudder cables in conduit (L/R, 3/16 in 7×19 stainless)', kind: 'cable', ata: 27, nha: 'LEZ-27-100', qty: 2,
    geo: [-1, 1].map((sg) => ({ t: 'path', pts: rudCable(sg), dIn: 0.25, massPerFt: 0.045, cls: 'cable', extSeg: [4, 10] })),
    blurb: 'Each pedal pulls one rudder outward through a cable in PTFE-lined conduit along the upper longeron, through the CS spar and out the wing to the winglet. Return springs at the rudder.',
    props: [['Cable', '3/16 in 7×19 CRES, 3,700 lb break (FAR 23.689 minimum is 1/8 in; DC-005 chose 3/16 in for stiffness)']],
    steps: [S1('Swage terminals; proof-load 60 % of break', ['Swage go/no-go gauge', 'Conduit clamped every 18 in, no sharp bends'])], src: { mass: '0.045 lb/ft cable + conduit (ASSUMED)' } },
  { ...CTL, pn: 'LEZ-27-160', name: 'Control stops (pitch, roll, rudder)', kind: 'machined', ata: 27, nha: 'LEZ-27-100', material: '6061', massEach: 0.3,
    geo: [{ t: 'box', c: [STICK[0], STICK[1], STICK[2] - 0.2], d: [0.08, 0.08, 0.05] }],
    blurb: 'Adjustable stops at the stick base (pitch, roll) and at each rudder horn, set so the surfaces never reach their structural limits (FAR 23.675 yardstick).',
    steps: [S1('Set stops after rigging; safety-wire', ['Stops contact before any rod or surface bottoms'])], src: { mass: 'ASSUMED' } },
  { ...CTL, pn: 'LEZ-27-170', name: 'Landing brake (belly speed brake)', kind: 'laminate', ata: 27, nha: 'LEZ-27-100', massEach: 2.4, meshes: /^LandingBrake$/,
    geo: [{ t: 'box', c: [72.75 / 12, 0, 2.06], d: [16 / 12, 12 / 12, 0.06] /* seat-3 2026-11-22: the panel as defined, FS 64.75–80.75, BL ±6 (was an ASSUMED 25.2 × 16.2 in box centred FS 62.6) */, external: true /* belly speed-brake panel: flush when stowed, below the belly when deployed */ }],
    blurb: 'Hinged belly panel behind the front seat (aft of the pilot, under the rear passenger\'s feet area), opened about 70° for approach. 3 × 6781 over 1/4 in foam, hinged at its forward edge.',
    steps: [S1('Lay up on the fuselage belly as the mould; cut free; hinge', ['Closes flush ±1/16 in'])], src: { mass: 'ASSUMED' } },
  { ...CTL, pn: 'LEZ-27-171', name: 'Landing-brake actuator, 12 V linear', kind: 'cots', ata: 27, nha: 'LEZ-27-170', massEach: 1.3, geo: [{ t: 'cyl', a: [5.5667, 0, 2.20], b: [6.1667, 0, 2.30], r: 0.06 }],
    blurb: 'Electric linear actuator with limit switches; power and switch in WP3. Mechanical blow-back above the brake\'s placard speed.', src: { mass: 'ASSUMED' } },
  // ---- ATA 32 landing-gear systems
  { massItem: 'gear', pn: 'LEZ-32-120', name: 'Main-gear attachment: steel mount tubes, 6781 0/90 wrap tabs, bonded aluminium extrusions, AN6 bolts; bow-to-belly fairing', kind: 'weldment', ata: 32, material: '4130', massEach: 2.6, oml: true, meshes: /^GearFairing$/,
    geo: [-1, 1].flatMap((sg) => { const g = GEO.gear, y = sg * g.mountY; return [
      { t: 'cyl', a: [g.s - g.tabL / 24 - 0.05, y, 2.12], b: [g.s + g.tabL / 24 + 0.05, y, 2.12], r: g.tubeD / 24, wall: 0.065 },                                  // steel mount tube
      { t: 'box', c: [g.s, y, 2.21], d: [g.tabL / 12 + 0.25, 0.20, 0.10], mat: '6061' },                                                                        // extrusion, bonded into the hard-point
      { t: 'box', c: [g.s, y, 2.03], d: [g.tabL / 12, 0.12, 0.14], colour: 0x9fb3c8 }]; }).concat([{ t: 'box', c: [GEO.gear.s, 0, 2.02], d: [1.10, 1.96, 0.12], colour: 0xe8e8e4, op: 0.0 }]), // fairing envelope (drawn by the airframe model)
    hardware: [{ std: 'AN6-17A', qty: 2 * GEO.gear.boltsPerSide, desc: 'bolt, mount tube to extrusion (double shear)' }, { std: 'MS21042L6', qty: 2 * GEO.gear.boltsPerSide, desc: 'self-locking nut' }, { std: 'AN960-616', qty: 4 * GEO.gear.boltsPerSide, desc: 'washer' }],
    blurb: 'How the bow hangs on the fuselage: each end of the straight centre section carries a 6781 0/90 tab wrapped round a 4130 tube; each tube bolts with AN6 bolts in double shear to an aluminium extrusion flox-bonded into the fuselage-bottom hard-point. A moulded fairing fills the inch between the bow and the belly so the bow reads as part of the airframe (the tabs pass through it).',
    steps: [S1('Bond the extrusions into the hard-point pads in the jig; drill for the AN6 bolts through tube and extrusion', ['Bow square to the centreline ±0.1°', 'Bolts torqued and witness-marked']), S1('Mould the fairing to the belly and bow; fit with screws so the bolts stay inspectable', ['Fairing removable with 6 screws'])], src: { mass: 'ASSUMED' } },
  { massItem: 'gear', pn: 'LEZ-32-300', external: true /* main wheels */, hide3D: true /* drawn by the airframe model */, name: 'Main wheels, 5.00-5 tyres and tubes (L/R)', kind: 'cots', ata: 32, qty: 2, massEach: 4.5,
    geo: [-1, 1].map((sg) => { const w = WHEEL(sg); return { t: 'cyl', a: [w[0], w[1] - 0.206, w[2]], b: [w[0], w[1] + 0.206, w[2]], r: 14.2 / 24 }; }), src: { mass: 'Goodyear 505C61-8 tyre + tube + Matco wheel half (ASSUMED split)' } },
  { massItem: 'gear', pn: 'LEZ-32-310', external: true /* wheel brakes */, name: 'Brakes: Matco internal-caliper brake and disc (L/R, part of the W51LT wheel and brake kit)', kind: 'cots', ata: 32, qty: 2, massEach: 1.6,
    geo: [-1, 1].flatMap((sg) => { const d = DISC_C(sg); return [{ t: 'cyl', a: [d[0], d[1] - DISC.t / 2, d[2]], b: [d[0], d[1] + DISC.t / 2, d[2]], r: DISC.r, mat: 'steel' }, { t: 'box', c: [d[0], d[1] - sg * 0.03, d[2] + DISC.r - 0.04], d: [0.16, 0.06, 0.10], colour: 0xb03a2e }]; }),
    props: [['Max accelerate-stop kinetic energy per brake (Matco W51LT)', '337,932 ft·lb'], ['Torque at 450 psi', '4,266 in·lb']], ke: 337932,
    ports: { 'IN-L': { at: CAL_PORT(-1), kind: 'brake', fit: 'AN816-3D / bleeder' }, 'IN-R': { at: CAL_PORT(1), kind: 'brake', fit: 'AN816-3D / bleeder' } },
    std: 'Matco W51LT wheel and brake kit (5 in wheel for 5.00-5 tyres, internal caliper, three 1.25 in pistons; static capacity 1,420 lb, load limit 4,260 lb, max accelerate-stop KE 337,932 ft·lb); MIL-PRF-5606 fluid; AN816-3D inlet with bleeder', src: { mass: 'ASSUMED split of the 9.2 lb wheel-and-brake kit weight' } },
  { massItem: 'gear', pn: 'LEZ-32-311', name: 'Brake master cylinders (L/R)', kind: 'cots', ata: 32, nha: 'LEZ-32-310', qty: 2, massEach: 0.4,
    geo: [-1, 1].map((sg) => ({ t: 'cyl', a: [3.0, sg * 0.36, 2.45], b: [3.25, sg * 0.36, 2.40], r: 0.04 })),
    ports: { 'OUT-L': { at: MC_PORT(-1), kind: 'brake', fit: 'AN816-3D' }, 'OUT-R': { at: MC_PORT(1), kind: 'brake', fit: 'AN816-3D' } },
    scd: { spec: 'Toe-brake master cylinder with integral reservoir, 5/8 in bore, MIL-PRF-5606, 1/8 NPT outlet; envelope 1.0 dia × 6.0 in', envelope: [6.0, 1.0, 1.0] }, src: { mass: 'ASSUMED' } },
  { massItem: 'gear', pn: 'LEZ-32-312', name: 'Brake lines (L/R, 3/16 × .028 5052 tube + hose down the legs)', kind: 'line', ata: 32, nha: 'LEZ-32-310', material: 'aluminium', qty: 2,
    geo: [-1, 1].map((sg) => { const sd = sg < 0 ? 'L' : 'R'; return { t: 'path', pts: brakeLine(sg), dIn: 0.1875, wallIn: 0.028, cls: 'brake', extSeg: [5, 6, 7, 8, 9, 10], ends: [`LEZ-32-311:OUT-${sd}`, `LEZ-32-310:IN-${sd}`], endFit: ['AN818-3D / AN819-3D', '-3 hose swivel (leg section)'] }; }),
    steps: [S1('Bend, flare, P-clamp down the gear-leg trailing edge; bleed', ['Firm pedal, no sponginess', 'No leak at 1.5 × max pedal pressure'])], src: { mass: 'GEOMETRY' } },
]);

// ------------------------------------------------------------------------------------------- loads and checks
const FS_ = (d) => d.FS;
export function column(P, od, w, L, E, Fcy) { // P limit compression (lb), tube od × wall (in), L (in) → {Pa, mode}
  const ro = od / 2, ri = ro - w, A = Math.PI * (ro * ro - ri * ri), rho = Math.sqrt((ro * ro + ri * ri) / 4), sl = L / rho, slc = Math.sqrt(2 * Math.PI ** 2 * E / Fcy);
  const scr = sl < slc ? Fcy - (Fcy ** 2 / (4 * Math.PI ** 2 * E)) * sl * sl : Math.PI ** 2 * E / (sl * sl);
  return { Pa: scr * A, A, sl, mode: `${sl < slc ? 'Johnson' : 'Euler'} column, L/ρ ${sl.toFixed(0)}` };
}
registerChecks('wp2', (d, lc) => {
  if (lc.id !== 'W1-S1') return [];
  const out = [], tag = (r, pn) => { r.sys = pn; out.push(r); return r; };
  // the flight-control checks (pitch rod, aileron rods, rudder cable) moved to block C (wpC1_controls.js, c27-*)
  // brake kinetic energy
  { const ac = aircraft(d, WEIGHT_CASES[0]), ke = 0.0443 * ac.W * ac.Vs ** 2 / 2, cap = partByPN('LEZ-32-310').ke;
    tag(mk('gear', 'gear-brake-ke', 'Brake kinetic-energy capacity', lc, 'each main brake', 'rated energy', cap / ke - 1, {
      formula: 'KE = 0.0443·W·V_so² / N  (FAR 23.735 yardstick; ft·lb, V in kt)',
      inputs: [['Gross weight', ac.W, 'lb', 'MODEL'], ['Stall speed, landing', ac.Vs, 'kt', 'MODEL'], ['Brakes N', 2, '', 'MODEL'], ['Rated KE per brake (Matco W51LT)', cap, 'ftlb', 'VENDOR']],
      result: [['Required KE per brake', ke, 'ftlb']] }), 'LEZ-32-310'); }
  return out;
});
/** worm self-locking: lead angle below the friction angle */
export function wormLock() { const w = partByPN('LEZ-32-210').worm, lam = Math.atan(w.lead / (Math.PI * w.pitchD)); return { ok: Math.tan(lam) < w.mu, lamDeg: lam * 180 / Math.PI, mu: w.mu }; }

// ------------------------------------------------------------------------------------------- schematics
defineGraph('controls', {
  title: 'Flight controls (ATA 27)',
  nodes: [
    { id: 'ST', label: 'Side stick', sub: 'right console', col: 0, row: 1, pn: 'LEZ-27-110' },
    { id: 'PR', label: 'Pitch rod', sub: '3/4 in 2024', col: 1, row: 0, pn: 'LEZ-27-120' },
    { id: 'EB', label: 'Elevator torque tube', sub: 'bellcrank', col: 2, row: 0, pn: 'LEZ-27-130' },
    { id: 'EL', label: 'Elevators', sub: 'mass-balanced', col: 3, row: 0, pn: 'LEZ-27-135' },
    { id: 'RT', label: 'Roll tube', sub: 'rear stick plugs on', col: 1, row: 1, pn: 'LEZ-27-140' },
    { id: 'RB', label: 'Aileron bellcrank', sub: 'centre section', col: 2, row: 1, pn: 'LEZ-27-141' },
    { id: 'AL', label: 'Ailerons', sub: 'via rods L/R', col: 3, row: 1, pn: 'LEZ-27-142' },
    { id: 'PD', label: 'Pedals', sub: 'front only', col: 0, row: 2, pn: 'LEZ-27-150' },
    { id: 'RC', label: 'Rudder cables', sub: '3/16 in, conduit', col: 1, row: 2, pn: 'LEZ-27-151' },
    { id: 'RU', label: 'Rudders', sub: 'outward only', col: 3, row: 2 },
    { id: 'MC', label: 'Master cylinders', sub: 'toe brakes', col: 1, row: 3, pn: 'LEZ-32-311' },
    { id: 'BR', label: 'Wheel brakes', sub: 'L/R', col: 3, row: 3, pn: 'LEZ-32-310' },
  ],
  edges: [{ a: 'ST', b: 'PR', cls: 'mech', label: 'pitch' }, { a: 'PR', b: 'EB', cls: 'mech' }, { a: 'EB', b: 'EL', cls: 'mech' }, { a: 'ST', b: 'RT', cls: 'mech', label: 'roll' }, { a: 'RT', b: 'RB', cls: 'mech' }, { a: 'RB', b: 'AL', cls: 'mech' },
    { a: 'PD', b: 'RC', cls: 'mech' }, { a: 'RC', b: 'RU', cls: 'mech' }, { a: 'PD', b: 'MC', cls: 'mech' }, { a: 'MC', b: 'BR', cls: 'brake', label: 'brake lines' }],
});
defineGraph('gear', {
  title: 'Nose-gear retract (ATA 32)',
  nodes: [
    { id: 'C', label: 'Panel crank', sub: 'shaft + U-joint', col: 0, row: 0, pn: 'LEZ-32-214' },
    { id: 'W', label: 'Worm, NG-64 crank, spring link', sub: 'self-locking, over-centre', col: 1, row: 0, pn: 'LEZ-32-212' },
    { id: 'S', label: 'Strut & wheel', sub: 'retracts aft into the NB well', col: 2, row: 0, pn: 'LEZ-32-200' },
    { id: 'F', label: 'DOWN flag', sub: 'panel window', col: 2, row: 1, pn: 'LEZ-32-210' },
    { id: 'Z', label: 'Gear warning', sub: 'buzzer at low throttle (WP3)', col: 1, row: 1 },
  ],
  edges: [{ a: 'C', b: 'W', cls: 'mech' }, { a: 'W', b: 'S', cls: 'mech', label: 'spring link' }, { a: 'W', b: 'F', cls: 'mech' }, { a: 'W', b: 'Z', cls: 'signal', label: 'not-down switch' }],
});

// ------------------------------------------------------------------------------------------- requirements closed by WP2
defineReqs([
  { id: 'R-STR-8', closed: true, verify: () => ({ ok: !!partByPN('LEZ-27-135'), detail: 'elevators statically balanced; rigid rod circuits for pitch and roll; TE free-play ≤ 1/32 in' }) },
  { id: 'R-STR-10', checks: /^ctl-(pitch-rod|roll-rod|rud-cable)$/, closed: true },
  { id: 'R-CTL-1', checks: /^ctl-rud-cable$/, closed: true, verify: () => ({ ok: !!partByPN('LEZ-27-160'), detail: 'stops at the stick base, the pedals and on the rudders; 3/16 in cables' }) },
  { id: 'R-GEAR-1', checks: /^ngear-strut$/, closed: true, verify: () => { const w = wormLock(); return { ok: w.ok, detail: `worm lead angle ${w.lamDeg.toFixed(1)}° < friction angle (μ ${w.mu}): holds without a lock; DOWN flag in the panel` }; } },
  { id: 'R-GEAR-2', checks: /^gear-brake-ke$/, closed: true },
]);
adoptMass(['controls']);
void PARTS; void weightCase;
