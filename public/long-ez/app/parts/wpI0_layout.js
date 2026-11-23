// WPI0 — block I layout: where every electrical item sits and how every block I run is routed. Inches in the
// definition frame [BL (+ right), FS (aft), WL (up)]; `F()` converts to the systems model (ft, [s, y, z]).
// Imported by wp3_electrical.js and wp7_wiring.js before the routing pass (wp12) and the bulkhead hole generators
// (blocks A, B, E), so every pass-through hole follows these routes. Notional; public data only.
//  • Nose: battery (on its side wall shelf, outboard of the LH nose-gear door drive), master contactor and its fuses on a
//    side-wall bracket between F22 and F28.
//  • Left side wall, F28 to the pedal hanger: the bus module (main / essential bus bars, ANL, diode, fuse blocks, cabin
//    ground block). The six pull-able breakers sit in block B's breaker cut-out (LEZ-31-100 'cb').
//  • The panel harness trunk runs forward of every panel unit (FS 37.6, B31-8) above the rudder-pedal horns.
//  • The starter, ground and power cables pass under the panel's bottom edge (no panel hole), ride the left power raceway,
//    drop below the CS spar and cross the firewall in block A's power boot (BL −2.20, WL 33.10, Ø 3.00 since firewall rev C), each in its own
//    lane; firewall-aft they climb the fire-protected face to the starter contactor and the ground block at block A's
//    layout positions, then run over the crankcase clear of the mount tubes (≥ 0.25 in, G-O4).
import { NOSE_SW } from './ng_layout.js';

export const F = (q) => [q[1] / 12, q[0] / 12, q[2] / 12];
export const FS_FW = 127.50;
/** block A's firewall layout (LEZ-53-180 LAYOUT), hole centres BL / WL: copied here because the routes must exist before
 *  block A's module runs; the records' interface checks compare these with wpA3 LAYOUT */
export const FW_LAYOUT = { power: { c: [-2.20, 33.10], r: 1.50 }, start: [[-2.00, 41.60], [-0.60, 41.60]], gnd: [[-0.50, 43.60], [0.50, 43.60]], ovr: [[0.60, 41.60], [2.00, 41.60]] };   // LEZ-53-180 rev C (boot Ø 3.00 over the cables' swept footprints)
/** lanes through the power boot (hole centre + offset, in): each run's crossing point, chosen so every run stays
 *  ≥ 0.25 in inside the boot's edge (G-O7) with the bundle seated on the grommet; block H's P-lead and GEA lanes are H's
 *  (merged, wpH1 BOOT_AT): this block's three take the rest of the boot */
export const BOOT = { c: FW_LAYOUT.power.c, r: FW_LAYOUT.power.r, lanes: {
  'LEZ-80-110#0': [-0.50, 0.40], 'LEZ-80-110#1': [-0.05, 0.75], 'LEZ-24-160#0': [0.65, 0.20], 'LEZ-74-100#0': [-0.65, -0.10], 'LEZ-77-100#0': [0.45, 0.65] } };   // H's two: its BOOT_AT (wpH1_layout)
export const lane = (k) => { const o = BOOT.lanes[k]; return [BOOT.c[0] + o[0], FS_FW, BOOT.c[1] + o[1]]; };

// ------------------------------------------------------------------------------------------- equipment (in)
/** battery: Odyssey PC680-class AGM (typed from memory: 7.27 × 3.11 × 6.67 in, 15.4 lb, 16 Ah) upright in a 0.050 6061
 *  box, long side fore-aft. Inboard face at BL −3.51: 0.63 in outboard of the old position, 0.25 in from block E's LH door
 *  cam and 0.29 in from the swept door drive (E-I-4, I-R9); the lid's forward-outboard edge is chamfered 0.60 × 0.60 in
 *  to clear the shell's inner face at the nose taper. Aft face 0.20 in ahead of F22. */
export const BAT = { L: 7.27, W: 3.11, H: 6.67, wall: 0.05, inb: -3.52, aft: 21.58, wl0: 31.25, ch: 0 };
BAT.fs0 = BAT.aft - BAT.L - 2 * BAT.wall;
BAT.box = { lo: [BAT.inb - BAT.W - 2 * BAT.wall, BAT.fs0, BAT.wl0], hi: [BAT.inb, BAT.aft, BAT.wl0 + BAT.H + 2 * BAT.wall] };
BAT.c = BAT.box.lo.map((v, i) => (v + BAT.box.hi[i]) / 2);
BAT.pos = [BAT.inb - 0.75, BAT.aft - 1.00, BAT.box.hi[2] + 0.40];   // + post, aft inboard corner of the lid (studs through the lid)
BAT.neg = [BAT.box.lo[0] + 0.75, BAT.aft - 1.00, BAT.box.hi[2] + 0.40];
/** shelf: 3/8 H45 with 2 BID each face, bonded to the side wall with 2-BID tapes, under the box; 4 NAS1832 inserts */
BAT.shelf = { lo: [BAT.box.lo[0] - 0.35, BAT.fs0 - 0.20, BAT.wl0 - 0.415], hi: [BAT.inb, BAT.aft, BAT.wl0] };   // inboard edge flush with the box: the LH door cable runs 0.34 in inboard of it
/** hold-down: the box bolted to the shelf through its floor (4 × AN3 into potted inserts), two straps round the box over the lid */
BAT.straps = [BAT.fs0 + 1.60, BAT.aft - 2.40];
BAT.inserts = [[BAT.box.lo[0] + 0.45, BAT.fs0 + 0.60], [BAT.inb - 0.45, BAT.fs0 + 0.60], [BAT.box.lo[0] + 0.45, BAT.aft - 0.60], [BAT.inb - 0.45, BAT.aft - 0.60]];
/** vent: 1/4 in tube from the box's spigot near the top of its outboard wall, down outside the wall, through the shelf to a
 *  belly drain (shell hole for A); the AGM cells are sealed, the vent drains the box after a cell failure */
BAT.vent = [[BAT.box.lo[0] - 0.16, BAT.fs0 + 1.20, BAT.box.hi[2] - 0.50], [BAT.box.lo[0] - 0.16, BAT.fs0 + 1.20, BAT.wl0 - 0.6]];   // lower end set on the shell's inner face in wpI1
/** master contactor K1 on a side-wall bracket (can axis along BL, studs inboard), main-feed ANL F1, ESS ALT fuse F3 */
export const K1 = { c: [-8.10, 24.20, 34.60], r: 0.875, L: 2.0, studs: { A1: [-6.85, 23.75, 34.60], A2: [-6.85, 24.65, 34.60] }, coil: [-7.30, 24.20, 35.55] };
export const F1 = { c: [-8.45, 26.50, 36.20], d: [1.20, 2.20, 1.00], what: 'ANL 60 A in its holder' };
export const F3 = { c: [-7.40, 22.90, 36.20], d: [0.60, 1.40, 0.60], what: 'ATC 20 A in-line holder' };
/** bus module on the left side wall: G-10 plate, standoffs, bus bars, fuse blocks, diode, ANL, cabin ground block */
export const MOD = { plate: { bl: -9.95, t: 0.0625, fs: [29.30, 36.20], wl: [33.10, 37.40] },
  FB1: { c: [-9.35, 30.90, 36.25], d: [1.10, 2.90, 1.70] }, FB2: { c: [-9.35, 33.80, 34.15], d: [1.10, 4.20, 1.70] }, F2: { c: [-9.30, 34.60, 36.50], d: [1.20, 2.20, 1.00] },
  D1: { c: [-9.60, 30.20, 33.90], d: [0.60, 1.20, 1.20] }, GB1: { c: [-9.55, 32.70, 37.05], d: [0.70, 3.20, 0.50] }, busM: { c: [-9.80, 32.80, 33.45], d: [0.25, 6.0, 0.50] } };
/** breaker sub-panel behind block B's 'cb' cut-out (BL −10.60…−8.30, WL 33.60…35.80): 2 rows of 3 at 0.75 in */
export const CBP = { fsFace: 40.745, plate: { t: 0.063, w: 2.80, h: 2.70, c: [-9.45, 34.70] }, cols: [-10.20, -9.45, -8.70], rows: [35.25, 34.15], body: { r: 0.30, L: 1.80 } };
/** firewall items at block A's layout: starter contactor K2 (can axis vertical on an angle bracket), ground block GB2,
 *  regulator / overvoltage relay VR1 */
export const K2 = { c: [-1.30, 128.70, 41.20], r: 0.80, h: [40.20, 42.20], shelfWL: 40.15, studs: { A1: [-1.75, 128.70, 42.60], A2: [-0.85, 128.70, 42.60] }, coil: [-1.30, 129.60, 41.20] };
export const GB2 = { c: [0.0, 127.80, 43.60], d: [1.60, 0.60, 0.80], stud: [0.0, 128.60, 43.60] };
export const VR1 = { c: [1.30, 128.15, 41.60], d: [1.70, 1.30, 1.70], conn: [1.30, 128.85, 41.60] };
/** engine case ground stud E1 (block H, LEZ-71-210 rev B GND_STUD top): the strap's one engine ground point (G-O6) */
export const E1 = [-2.40, 135.09, 40.26];   // block H's ground stud on the engine rev B accessory housing (wpH1 GND_STUD tip)
/** panel-side equipment at block B's published layout (aft face FS 41.18; bodies forward of the panel) */
export const PNL_AT = { sw: [5.55, 40.30, 35.50], warn: [-6.80, 40.30, 39.60], key: [-9.40, 40.30, 40.40] };

// ------------------------------------------------------------------------------------------- routes (in)
/** replace every interior corner of a polyline by an arc of radius R (in), reduced where the legs are short (each corner
 *  may use half of each adjacent leg), drawn in ≤ 12° steps so the routing check's own fillet sees gentle vertices */
export function arc(pts, R, { skipFirst = false, skipLast = false, skipFrom = Infinity, stepDeg = 12 } = {}) {
  if (pts.length < 3) return pts.map((q) => q.slice());
  const sub = (a, b) => a.map((v, i) => v - b[i]), add = (a, b) => a.map((v, i) => v + b[i]), mul = (a, k) => a.map((v) => v * k), L = (a) => Math.hypot(...a), nrm = (a) => mul(a, 1 / (L(a) || 1));
  const out = [pts[0].slice()];
  for (let i = 1; i < pts.length - 1; i++) {
    const a = nrm(sub(pts[i - 1], pts[i])), b = nrm(sub(pts[i + 1], pts[i])), c = Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2])), th = Math.acos(c), defl = Math.PI - th;
    if (defl < 0.02 || (skipFirst && i === 1) || (skipLast && i === pts.length - 2) || Math.abs(pts[i][0]) >= skipFrom) { out.push(pts[i].slice()); continue; }
    const t = Math.min(R / Math.tan(th / 2), 0.5 * L(sub(pts[i - 1], pts[i])), 0.5 * L(sub(pts[i + 1], pts[i]))), r = t * Math.tan(th / 2);
    const p0 = add(pts[i], mul(a, t)), p1 = add(pts[i], mul(b, t)), ctr = add(pts[i], mul(nrm(add(a, b)), r / Math.sin(th / 2))), u0 = sub(p0, ctr), u1 = sub(p1, ctr);
    const n = Math.max(2, Math.ceil(defl / (stepDeg * Math.PI / 180)));
    for (let k = 0; k <= n; k++) { const f = k / n, w = [Math.sin((1 - f) * defl) / Math.sin(defl), Math.sin(f * defl) / Math.sin(defl)]; out.push(add(ctr, add(mul(u0, w[0]), mul(u1, w[1])))); }
  }
  out.push(pts.at(-1).slice());
  const ded = [out[0]]; for (const q of out.slice(1)) if (L(sub(q, ded.at(-1))) > 0.05) ded.push(q); else ded[ded.length - 1] = q;
  return ded.map((q) => q.map((v) => Math.round(v * 1e4) / 1e4));
}
/** route radii (in): 1.3 × the routing rule (10 × OD for wire, wp12 / systems bendRule) */
export const RAD = (dIn) => 1.3 * Math.max(10 * dIn, 1.0);
const NS = [NOSE_SW[1] * 12, NOSE_SW[0] * 12, NOSE_SW[2] * 12];
/** forward harness LEZ-24-162: bus module → F28 → main-feed ANL → master contactor → F22 → battery + post → over the
 *  battery, outboard of the door drive, down ahead of the ballast and under the slabs and removable plates (below their
 *  WL 33.0 floor: I-R9, nothing through the plates), inboard ahead of E's NG-30 plate (it starts at FS 7.44), through block
 *  A's ballast bulkhead to the landing light's connector;
 *  its F22 hole lies wholly inside F22's canard hard-point region (BL −5.1, WL 37.4; 0.48 in from the canard bolt) */
export const R_FWD = arc([[-9.30, 29.60, 35.60], [-8.60, 27.40, 36.40], [-7.00, 24.20, 37.20], [-5.30, 22.00, 37.10], [BAT.pos[0], BAT.pos[1], BAT.pos[2] + 0.30],
  [-4.30, 16.60, 39.20], [-4.45, 13.90, 38.60], [-4.75, 11.60, 34.60], [-4.55, 10.00, 32.40], [-3.40, 7.00, 32.10], [-1.30, 6.10, 31.90]], RAD(0.25), { skipFirst: true, skipLast: true });
/** under the panel's bottom edge (WL 33.0) for every cabin power run: at FS 41.2 between WL 31.6 and 32.4 */
/** starter + cable, cabin part: master contactor A2 → down and aft along the wall → F28 → under the panel edge →
 *  (raceway LP) → under the CS spar's lower face → its boot lane (the boot supports the bend, AC 43.13 3 × OD) */
export const R_START = { head: arc([K1.studs.A2, [-7.40, 26.40, 33.30], [-9.00, 30.00, 32.80], [-9.90, 38.00, 32.00], [-10.10, 44.00, 33.00]], RAD(0.49), { skipFirst: true }),
  tail: arc([[-10.00, 104.10, 35.35], [-8.70, 108.10, 35.30], [-8.30, 114.50, 34.60], [-9.50, 120.90, 34.50], [-5.10, 124.70, 34.10], [lane('LEZ-80-110#0')[0], 127.80, lane('LEZ-80-110#0')[2]]], RAD(0.49), { skipLast: true }) };
/** battery − cable, cabin part: − post → aft over the box's outboard edge → F22 → under the master contactor → … → boot */
export const R_GND = { head: arc([BAT.neg, [-6.10, 21.30, 37.20], [-6.20, 24.40, 32.40], [-8.80, 29.20, 31.75], [-9.55, 33.80, 31.70], [-9.70, 38.00, 31.60], [-9.90, 43.00, 33.00]], RAD(0.49), { skipFirst: true }),
  tail: arc([[-9.70, 104.10, 35.65], [-8.20, 108.10, 35.80], [-7.70, 114.50, 35.00], [-8.90, 120.90, 34.75], [-4.50, 124.70, 34.35], [lane('LEZ-80-110#1')[0], 127.80, lane('LEZ-80-110#1')[2]]], RAD(0.49), { skipLast: true }) };
/** firewall-aft parts: boot → up the fire-protected face outboard of K2 → A1 stud; boot → up inboard of K2 → GB2 stud;
 *  K2 A2 → a service bow over the strap (engine-motion slack to the first engine clamp at FS 165) → over the crankcase on the centre line (clear of the HT leads at BL ±3.6…) → down aft of the left front
 *  cylinder → starter stud */
export const R_START_FW = [[lane('LEZ-80-110#0')[0], 127.80, lane('LEZ-80-110#0')[2]], [-3.25, 128.60, 35.00], [-3.25, 128.60, 41.80], K2.studs.A1];   // riser between H's GEA trunk (FS 153.5) and the FTR–ETL mount tube
export const R_GND_FW = [[lane('LEZ-80-110#1')[0], 127.80, lane('LEZ-80-110#1')[2]], [-2.70, 128.95, 35.40], [-2.70, 128.95, 43.50], GB2.stud];   // over H's GEA exit, riser ahead of the FTR–ETL tube
export const R_STARTER = [K2.studs.A2, [-1.20, 130.50, 43.40], [-1.20, 134.50, 44.00], [-1.00, 139.50, 41.85], [-1.00, 150.50, 41.85], [-5.90, 160.10, 42.00], [-5.90, 160.40, 33.30], [-5.04, 156.34, 32.88]];
/** power harness LEZ-24-160 path 0, cabin part: bus module → under the panel edge → (raceway LP) → under the spar → boot */
export const R_PWR = { head: arc([[-9.30, 34.80, 33.60], [-9.60, 38.00, 32.20], [-9.80, 44.06, 33.10]], RAD(0.30)),
  tail: arc([[-9.40, 104.10, 34.75], [-7.60, 108.10, 34.90], [-7.20, 114.50, 34.20], [-8.40, 120.90, 34.30], [-4.10, 124.70, 32.40], [lane('LEZ-24-160#0')[0], 127.80, lane('LEZ-24-160#0')[2]]], RAD(0.30)) };
/** power harness path 2, firewall-aft: boot → up the face between K2 and VR1 → aft and up over the oil filter, under GB2
 *  and the strap, over the top mount diagonal → over the crankcase right of centre, under the HT leads → down between the
 *  crankcase nose and the ring gear (FS 186.35, BL 4.60, inboard of the cylinder bases) → forward along the alternator's top to B+ (field lead alongside) */
export const R_PWR_FW = [[lane('LEZ-24-160#0')[0], 127.80, lane('LEZ-24-160#0')[2]], [-0.30, 129.00, 35.00], [-0.30, 129.00, 39.60], [0.30, 132.10, 43.45], [1.60, 139.50, 41.85], [1.20, 150.50, 41.85], [4.60, 160.85, 42.00], [4.60, 160.85, 33.20], [5.04, 156.34, 32.88]];
/** power harness path 1: bus module → under the panel edge → (raceway LP) → aft centre to the boost pump's pigtail */
export const R_PUMP = { head: arc([[-9.30, 33.00, 33.70], [-9.60, 38.00, 32.20], [-9.80, 44.06, 33.20]], RAD(0.20)), tail: [[-9.60, 104.10, 35.45], [-8.80, 108.10, 35.60], [-5.00, 114.50, 34.00], [0.60, 118.50, 31.90]] };
/** panel harness LEZ-24-161 path 0 (trunk): bus module → riser forward of the pedal hanger → trunk at FS 36.9, WL 40.3, just
 *  aft of and below block J's avionics shelf and forward of the AXIS connectors (J layout, merge 7c88a8f) → down inboard of
 *  the pitch rod, under J's right static line and console harness → over the switch sub-panel */
export const R_PANEL = [[-9.20, 34.60, 37.70], [-9.20, 34.80, 39.80], [-7.60, 36.90, 40.30], [5.40, 36.90, 40.30], [8.40, 38.10, 38.60], [7.20, 39.20, 36.50]];   // under J's avionics shelf edge and forward of the AXIS connectors (J layout), clear of J's static lines
/** panel harness path 1: gear-not-down switch S12 → out through the RH NG-30 plate in block E's grommet (second vertex as
 *  E's SW_WIRE assumes: the first segment crosses the plate's mid-plane at E's grommet, below the door-drive keep-out) → aft outboard of the door drive and its cable → F22 → F28 → under the pedal tube → right riser */
export const R_NGSW = arc([NS, [3.24, NS[1], 31.44], [4.20, 14.20, 33.40], [4.20, 21.00, 34.40], [4.80, 28.00, 34.40], [8.60, 32.00, 34.20], [10.00, 36.00, 35.20], [10.20, 38.40, 35.40], [8.40, 38.50, 37.40]], RAD(0.25), { skipFirst: true, skipLast: true });
/** panel harness path 2: bus module → breakers (under the pedal tube and hanger) */
export const R_CB = [[-9.40, 36.10, 34.80], [-9.45, 38.70, 34.70]];
/** panel harness path 3: canopy switch S13 → forward of the console → (raceway LS) → through the panel → behind it */
export const R_S13 = { head: [[-10.56, 49.34, 40.33], [-10.50, 49.60, 39.60], [-10.45, 49.90, 38.20]], tail: [[-10.30, 42.20, 37.40], [-10.25, 40.30, 37.40], [-9.60, 38.60, 38.60]] };
/** engine ground strap LEZ-24-165: GB2 stud → under the starter cable, over the top mount diagonal and the left magneto →
 *  E1 (slack loop for the isolator motion) */
export const R_STRAP = [GB2.stud, [-0.80, 130.30, 43.90], [-1.90, 133.10, 43.60], [-2.50, 134.50, 42.00], E1];
/** key-switch / P-lead harness LEZ-74-100 (block H's part, routed with this trunk): aft end only, into its boot lane */
export const R_PLEAD_TAIL = arc([[-9.10, 120.30, 33.15], [-5.15, 124.70, 32.55], [lane('LEZ-74-100#0')[0], 127.80, lane('LEZ-74-100#0')[2]]], RAD(0.25));
/** block J's systems tunnel through the CS spar (LEZ-57-140 rev F, J-F1): this model's lane for the light harness, 1.0 in
 *  above and 0.8 in outboard of block C's rudder-conduit tunnel (WL 38.60) on the same diagonal, 0.67 in under the spar's
 *  upper face; J publishes the tunnel, the interface check compares */
export const TUNNEL = { fwd: [9.90, 123.06, 39.50], aft: [12.90, 127.50, 39.50], d: 0.80 };
/** wing-root disconnect (inline 3-pin, on a bracket on the root rib inside the jut-out) and the wing conduit (Nyloflow,
 *  cored in with block C's rudder-cable conduit, 1.2 in aft of it); the light inside the tip close-out behind a lens */
export const ROOT = { bl: 40.50, fs: 129.95, wl: 39.55 };   // in block C's systems connector bay (BL 38–43, FS 154.3–157.75), alone in it since option A (J's root disconnects are in the aft root bay below, ≥ 2 in clear)
export const TIP_LIGHT = { lo: [147.70, 157.80, 36.15], hi: [149.00, 160.40, 37.05] };
/** wingtip light harness LEZ-33-110, side sg (−1 left, +1 right): behind the panel at the bus module, under the panel
 *  edge into raceway LP (the right one crosses behind the rear seat bulkhead), through the systems tunnel, aft of the
 *  spar to the root disconnect, along the conduit to the tip, forward along the tip rib to the light */
export const R_TIP_HEAD = arc([[-9.50, 31.50, 33.40], [-9.70, 38.00, 32.20], [-9.90, 44.06, 33.20]], RAD(0.20));
/** lane in J's spar tunnel and C's conduit: on the axis. Option A ("swap lanes", Miles, 2026-11-19): the light harness runs
 *  alone in both, J's COM coax and GMU 11 harness have moved to the aft lane (low CS-spar tunnel, wing aft conduit), so the
 *  0.24 in offset that set this run beside them is gone */
export const LANE_DZ = 0;
export const R_TIP_TAIL = (sg) => arc([...(sg > 0 ? [[-10.10, 104.10, 36.00], [-8.40, 108.10, 36.60], [-8.40, 113.90, 37.40], [7.20, 113.90, 37.40], [8.80, 117.50, 39.60]] : [[-10.40, 104.10, 35.95], [-8.70, 108.10, 36.30], [-8.80, 112.50, 36.50], [-9.60, 116.50, 39.60]]), [sg * 9.70, 120.90, sg < 0 ? 40.30 : 39.55], TUNNEL.fwd.map((v, i) => (i === 0 ? sg * v : i === 2 ? v - LANE_DZ : v)),
  // block C's systems conduit (wpC8_cuts SYSC): jut-out tunnel, connector bay, wing conduit to the tip close-out exit
  [sg * 12.90, 127.65, 39.50 - LANE_DZ], [sg * 21.0, 131.80, 39.50 - LANE_DZ], [sg * 38.0, 131.80, 39.44 - LANE_DZ], [sg * ROOT.bl, ROOT.fs, ROOT.wl], [sg * 43.0, 131.80, 39.42 - LANE_DZ], [sg * 45.0, 131.80, 39.40 - LANE_DZ],
  [sg * 50.0, 131.90, 39.30 - LANE_DZ], [sg * 64.0, 134.50, 39.00 - LANE_DZ], [sg * 145.8, 165.00, 37.00 - LANE_DZ], [sg * 147.60, 163.70, 36.80], [sg * 148.30, 161.50, 36.60],
  [sg * 148.35, TIP_LIGHT.hi[1] + 0.05, 36.40]], RAD(0.20), { skipLast: true, skipFrom: 145 });   // the harness leaves the conduit at its last bend (FS 190.5, BL 145.8) through a lined side port (ask C)
/** segments of a light-harness tail inside the CS spar's systems tunnel (inside the OML, in no named zone of the routing
 *  check): indices into the tail polyline (segment k joins tail[k − 1] and tail[k]) */
export const tunnelSegs = (tail) => tail.map((q, k) => k).filter((k) => k > 0 && [tail[k - 1], tail[k]].every((q) => q[1] >= 122.80 && q[1] <= 127.90 && Math.abs(q[0]) >= 9.9));
