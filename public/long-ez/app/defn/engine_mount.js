// LEZ-71-220 engine mount weldment: the definition record. Twelve 4130 N tubes from the four firewall pick-ups to the
// four conical-mount cups (LEZ-71-224); sizes from wp22. The CadQuery solid (cad/mount.py) is each tube from node to node.
// Frame: x = BL, y = FS (aft), z = WL (up), inches. Notional.
import { MOUNT, ENG } from '../parts/wp1_powerplant.js';
import { O235, LUGS } from '../parts/engine_o235.js';
import { MOUNT_SIZING, TUBES, UPK_SHIFT } from '../parts/wp22_mount.js';
import { r4, want } from './util.js';

const fx = (x, n = 2) => x.toFixed(n), RHO = 0.283;
const area = (od, w) => Math.PI * ((od / 2) ** 2 - (od / 2 - w) ** 2);
export function mntParams() {
  const nodes = Object.fromEntries(Object.entries(MOUNT.nodes).map(([k, p]) => [k, [r4(p[1] * 12), r4(p[0] * 12), r4(p[2] * 12)]]));
  return { nodes, members: MOUNT_SIZING.cut.map((t) => [t.a, t.b, t.od, t.w, t.group]) };
}
export function mntExpect(p, m) {
  const out = [want('Tubes', p.members.length, (m.tubes || []).length, 0)];
  p.members.forEach(([a, b, od, w], i) => { const L = Math.hypot(...p.nodes[a].map((v, j) => v - p.nodes[b][j])); out.push(want(`Tube T${String(i + 1).padStart(2, '0')} ${a}–${b} volume (in³)`, area(od, w) * L, (m.tubes || [])[i] ?? NaN, 0.002)); });
  return out;
}
const C = MOUNT_SIZING.cut, G = MOUNT_SIZING.groups;
const stock = Object.entries(C.reduce((a, t) => { const k = `${t.od} × ${t.w}`; a[k] = (a[k] || 0) + t.L; return a; }, {}));
const PRICE = { '0.625 × 0.035': 3.62, '0.75 × 0.035': 3.95, '0.75 × 0.049': 4.85 };   // $/ft, Aircraft Spruce 4130 N tube (approx.)
export const MNT_DEF = {
  pn: 'LEZ-71-220', rev: 'D', status: 'released', nha: 'LEZ-71-200', qty: 1,
  title: 'Engine mount weldment',
  revs: [{ rev: 'A', date: '2026-11-17', short: 'Initial definition', change: `Initial definition. The tubes (3/4 × .049 longerons, 5/8 × .035 elsewhere), the weld and column allowables and the thrust were ASSUMED. Each group now takes the lightest 4130 N tube at the +15 % reserve, no smaller than 5/8 × .035; all three come out at the minimum (lowest MS +${fx(Math.min(...Object.values(MOUNT_SIZING.ms)))} on a longeron). Allowables from MIL-HDBK-5; thrust is a bound.` },
    { rev: 'B', date: '2026-11-18', short: 'Upper nodes 0.5 in inboard, 1.5 in down', change: `The upper pick-ups (LEZ-71-222 rev B) move 0.5 in inboard and 1.5 in down so their plates sit inside the firewall outline (ICD G-F2); the upper firewall nodes move with them (BL ±${fx(Math.abs(MOUNT.nodes.FTL[1]) * 12)}, WL ${fx(MOUNT.nodes.FTL[2] * 12)}). Re-sized: every group still takes the 5/8 × .035 minimum (lowest MS +${fx(Math.min(...Object.values(MOUNT_SIZING.ms)))}).` },
    { rev: 'C', date: '2026-11-18', short: 'Ring diagonal deleted', change: `The ring's diagonal (ETL–EBR) lay in the cup plane, FS 161.79, and crossed the engine's accessory housing 1.3 in deep (ICD G phase 2, solid-clash check on LEZ-71-200). Deleted: the four side faces of the truss are triangulated (a longeron and a diagonal each), so the ring needs none. 12 tubes; sizes re-run (lowest MS +${fx(Math.min(...Object.values(MOUNT_SIZING.ms)))}).` },
    { rev: 'D', date: '2026-11-18', short: 'Upper nodes 1.5 in inboard, 1.0 in down', change: `Firewall integration (block A ICD): at rev B's WL 41.46 the LEZ-71-222 backing plate (cabin side) ran 0.43 in into the CS spar's top and the lower base bolts stood 0.19 in above it. The upper nodes now sit ${UPK_SHIFT.inboard} in inboard and ${UPK_SHIFT.down} in down from the original (BL ±${fx(Math.abs(MOUNT.nodes.FTL[1]) * 12)}, WL ${fx(MOUNT.nodes.FTL[2] * 12)}): the plate's lower edge clears the spar top by 0.06 in and both plates keep rev B's insets inside the OML. Re-sized: lowest MS +${fx(Math.min(...Object.values(MOUNT_SIZING.ms)))}.` }],
  effectivity: 'One per aircraft', params: mntParams(),
  datums: [{ id: 'A', what: 'Firewall aft face (the pick-up bushings bear on the fittings there)' }, { id: 'B', what: 'Aircraft centre line, BL 0' }, { id: 'C', what: 'Crankshaft centre line height' }],
  features: [
    { id: 'longeron', kind: 'tube', label: `Longerons (4): ${G.longeron[0]} × ${G.longeron[1]} 4130 N, firewall pick-up to the cup on the same corner`, tol: 'Node positions ±1/32 in in the jig' },
    { id: 'diagonal', kind: 'tube', label: `Diagonals (4): ${G.diagonal[0]} × ${G.diagonal[1]}, each pick-up to the opposite cup`, tol: 'Fit-up gap ≤ 0.010 in' },
    { id: 'ring', kind: 'tube', label: `Ring (4): ${G.ring[0]} × ${G.ring[1]} round the four cups (no diagonal across it: it would cross the accessory housing)`, tol: 'Cup faces square to the crankshaft ±1°' },
  ],
  tolerances: { general: 'Node positions ±1/32 in; tube lengths cut to the jig', holes: 'Bushing bores reamed after welding (LEZ-71-224)', breakEdges: 'Deburr inside and out' },
  drawingNotes: ['Tube lengths in the cut list are node to node; fish-mouth each end to the jig.', 'Weld cups, bushings and gussets (LEZ-71-224) in the same jig.'],
  generalNote: 'TIG weld, normalise; drain holes; oil the insides.',
  na: { cut: 'Tubes cut to the cut list: no flat pattern', layup: 'Metal part' },
  material: { spec: 'MIL-T-6736 (AMS 6360) 4130 N round tube; ER70S-2 or 4130 filler', alt: 'AMS 6361 4130 tube, same sizes', form: 'round tube, normalised', density: RHO,
    allowables: [['4130 N tube F_tu / F_ty', '95 / 75 ksi', 'MIL-HDBK-5'], ['At fusion welds (not heat-treated after welding)', 'F_tu 80 ksi', 'MIL-HDBK-5'], ['E', '29.0 Msi', 'MIL-HDBK-5']] },
  process: [
    { op: 'Cut', spec: 'Saw and fish-mouth the tubes to the cut list and the jig; clean to bright metal 1 in back from each joint.' },
    { op: 'Weld', spec: 'Tack in the jig with the cups and bushings; TIG weld each cluster; stress-relieve (normalise) the clusters.' },
    { op: 'Finish', spec: 'Drill drain holes, oil the insides, prime and paint (heat-resistant).' },
    { op: 'Inspect', spec: 'Welds: no undercut, full penetration; node positions in the jig; dye-penetrant the cup clusters.' },
  ],
  checks: ['mount-tube'],
  rules: [
    { id: 'min', label: 'No tube smaller than 5/8 × .035 (OD / wall)', v: Math.min(...C.map((t) => Math.min(t.od / 0.625, t.w / 0.035))), min: 1 },
    { id: 'ld', label: 'Wall to OD ratio ≥ 1/24 (weld burn-through)', v: Math.min(...C.map((t) => t.w / t.od * 24)), min: 1 },
    { id: 'std', label: 'Every tube a standard size', v: C.every((t) => TUBES.some(([o, w]) => o === t.od && w === t.w)) ? 1 : 0, min: 1 },
  ],
  mass: { each: MOUNT_SIZING.mass, from: 'tube volumes (node to node) × 0.283 lb/in³; cups, bushings and gussets are LEZ-71-224' },
  hardware: [], hardwareNote: 'None on the weldment: the pick-up bolts are on LEZ-71-222 / -223, the isolator bolts with LEZ-71-221.',
  interfaces: [
    { id: 'I1', with: 'LEZ-71-221 isolators / O-235 conical lugs', feature: 'ring', what: `Cup nodes exactly on the engine's conical-lug pattern (${O235.mount.dy} × ${O235.mount.dz} in, TCDS/SSP; ICD G-R1)`, check: () => { const N = MOUNT.nodes, d = Math.max(...LUGS(ENG.accFace, ENG.crankZ).map((L) => Math.hypot(...N[`E${L.k}`].map((v, i) => v - L.at[i])) * 12)); const dy = (N.ETL[1] - N.ETR[1]) * 12, dz = (N.ETL[2] - N.EBL[2]) * 12; return { ok: d < 0.001 && Math.abs(dy - O235.mount.dy) < 0.001 && Math.abs(dz - O235.mount.dz) < 0.001, detail: `cup pattern ${fx(dy)} × ${fx(dz)} in; worst node to lug ${fx(d, 4)} in` }; } },
    { id: 'I2', with: 'LEZ-71-222 upper pick-ups and LEZ-71-223 lower brackets', feature: 'longeron', what: 'Firewall nodes on the pick-ups', check: () => { const N = MOUNT.nodes; return { ok: Math.abs(N.FTL[0] - N.FTR[0]) < 1e-9 && Math.abs(N.FBL[0] - N.FBR[0]) < 1e-9, detail: `upper nodes FS ${fx(N.FTL[0] * 12)} (bolt axis on LEZ-71-222), lower FS ${fx(N.FBL[0] * 12)} (bushings on LEZ-71-223)` }; } },
  ],
  tooling: { needed: true, text: 'Welding jig: a steel plate drilled to the firewall pick-up pattern and a crankcase-pattern fixture holding the four cups square to the crankshaft line.' },
  sourcing: { blank: stock.map(([k, L]) => `${k} 4130 N: ${fx(L / 12 * 1.15, 1)} ft`).join('; '), vendor: 'Aircraft Spruce (4130 N chrome-moly tube)', url: 'https://www.aircraftspruce.com/menus/mp/tubing.html',
    cost: stock.reduce((a, [k, L]) => a + (PRICE[k] ?? 5) * Math.ceil(L / 12 * 1.15), 0), costAsOf: '2026-11-17', perAircraft: 1, lead: 'Stock', note: 'Approximate per-foot prices; check the current catalogue.' },
};
