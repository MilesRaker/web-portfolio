// LEZ-51-100 lightning-strike mesh and galvanic isolation plies (block P, prepreg airframe conversion, Miles 2026-11-19): an
// installation record (no solid of its own). The copper mesh in the outer skin of every carbon-capped surface, the bonding
// jumpers across the wing roots, and the 6781 isolation plies at the carbon-to-metal faying surfaces, as lines with their
// areas and masses; the checks rf-keepout, galv-iso, lsp-mesh and out-time (parts/wpP1) and the cure / temperature checks
// (structures.js). Notional; not for construction.
import { GEO, MATSYS, BASE_MAT } from '../structures.js';
import { PROCESS } from '../plybook.js';
import { LSP_LINES, LSP_MASS, LSP_CG, MESH, MESH_SURF, ISO, isoMS, keepoutRows, ANTENNAS, keepout, LAYUP } from '../parts/wpP1_prepreg.js';
import { LUG } from '../parts/wp13_airframe_joints.js';
import { r4 } from './util.js';
import { LAM_ALLOW } from './p_common.js';

const fx = (x, n = 2) => x.toFixed(n);
export const lspParams = () => ({ mesh: MESH_SURF.map((s) => r4(s.A)), lbFt2: MESH.lbFt2, strip: MESH.strip, iso: ISO.map((i) => r4(i.area)), cf: r4(GEO.wing.glassTip.cf * 12), lines: LSP_LINES.length });
const HW = LSP_LINES.map(({ std, qty, each, desc }) => ({ std, qty, each, desc }));
export const LSP_DEF = {
  pn: 'LEZ-51-100', rev: 'A', status: 'released', nha: 'LEZ-000 (aircraft)', qty: 1, install: true,
  title: 'LSP mesh and galvanic isolation',
  revs: [{ rev: 'A', date: '2026-11-19', short: 'Initial definition (block P)', change: `Initial definition with the MTM45-1 prepreg conversion (Miles, 2026-11-19). HTS40 carbon caps in the wing, canard, CS spar and jut-out drag spars need lightning protection (AC 20-136C ¶10.14.9) and isolation from the aluminium fittings (AC 20-107B ¶6.e). As defined: copper mesh strips in the outer skin over every HTS40 cap of the wing panels, jut-outs and canard, ${MESH.strip} in past each cap edge, and a strip ${MESH.strip} in past each face of the CS spar on the strake and fuselage skins (${fx(MESH_SURF.reduce((a, s) => a + s.A, 0), 1)} ft² at ${MESH.lbFt2} lb/ft², BOUND), bonding jumpers across both wing roots, and a 6781 isolation ply in the LWA-plate and clevis-tail bond lines. The wing's carbon caps end at BL ${fx(GEO.wing.glassTip.cf * 12, 1)}, glass tip caps outboard, so no carbon lies inside the COM dipole's near field (rf-keepout).` }],
  effectivity: 'One per aircraft (both wings, the canard, the CS spar)',
  params: lspParams(),
  datums: [],
  features: [
    ...MESH_SURF.map((s) => ({ id: `mesh-${s.id}`, kind: 'joint', label: `Copper mesh: ${s.what}, ${fx(s.A, 1)} ft²`, tol: 'Laps 2 in at splices; continuous end to end' })),
    { id: 'jumper', kind: 'joint', label: 'Bonding jumpers, tinned-copper braid 1/2 in, wing mesh to the CS-spar strip, each root', tol: 'Bolted to mesh terminals; continuity measured' },
    ...ISO.map((i) => ({ id: `iso-${i.id}`, kind: 'joint', label: `Isolation: ${i.metal} ↔ ${i.carbon}: ${i.how}`, tol: i.glass ? 'Plies per the parent record' : `One 6781 ply (${BASE_MAT.BID.t} in) in the ${LUG.flox} in bond line, ≥ 0.005 in flox left` })),
  ],
  tolerances: { general: 'Mesh laps 2 in; isolation ply overlaps the metal face 0.5 in all round' },
  drawingNotes: ['Mesh strips are the outermost ply (under the surfacing film) over every carbon cap.', 'Fasteners through carbon: wet-installed in sealant.', 'Copper, not aluminium, on carbon.'],
  na: { cut: 'Installation: mesh and plies cut from the parents\' skin and plate patterns', layup: 'Installation: laid with the parent parts' },
  material: { spec: `Copper expanded-foil LSP mesh (Astrostrike / Dexmet MicroGrid class), ${MESH.lbFt2} lb/ft² (BOUND); MTM45-1 / 6781 S2-glass isolation plies; tinned-copper braid jumpers`, alt: 'Copper mesh of a lower areal weight once qualified', form: 'Co-cured with the parent skins (M cycle)', density: null,
    allowables: [['Mesh areal weight', `${MESH.lbFt2} lb/ft²`, MESH.src], ...LAM_ALLOW(false).slice(0, 1), ['Lightning protection', 'cover external surfaces with mesh, foil or expanded foil joined end to end', 'FAA AC 20-136C ¶10.14.9–10.14.10 (faa.gov, accessed 2026-11-19)'], ['Galvanic isolation', 'glass plies between carbon and aluminium; qualify fasteners', 'FAA AC 20-107B ¶6.e (faa.gov, accessed 2026-11-19)']] },
  process: [
    { op: 'Mesh', spec: `Cut the strips to each cap's width plus ${MESH.strip} in each side (wing panels, jut-outs, canard) and the CS-spar strip; lay them as the outermost ply over the caps, laps 2 in; co-cure with the skin (${MATSYS.cure.cycle}).` },
    { op: 'Isolate', spec: `One 6781 ply on the cap side of each LWA plate and clevis tail before the cap plies (bond line ${LUG.flox} in, the ply in it); drag-angle doubler and skin as their records. Fasteners through carbon wet in sealant.` },
    { op: 'Bond', spec: 'Jumpers across each wing root after the wings are on; bolt to the mesh terminals.' },
    { op: 'Inspect', spec: 'Continuity tip to tip and across each root (measure and record); isolation plies tallied at layup; out-time logged per layup.' },
  ],
  checks: ['rf-keepout', 'galv-iso', 'lsp-mesh', 'out-time', 'core-proc', 'core-svc', 'lam-hotwet'],
  rules: [
    { id: 'iso-n', label: 'Isolation plies at the carbon-to-aluminium bond lines (LWA plates and clevis tails, count ≥ 8)', v: ISO.filter((i) => i.area).reduce((a, i) => a + i.n, 0), min: 8 },
    { id: 'cu', label: 'Mesh areal weight carried (lb/ft² ≥ the heaviest public copper grade, 0.040)', v: MESH.lbFt2 / 0.040, min: 1 },
    { id: 'cf', label: 'Wing carbon ends inboard of the tip (in)', v: (GEO.wing.tipY - GEO.wing.glassTip.cf) * 12, min: 3 },
  ],
  mass: { each: +LSP_MASS.toFixed(4), from: `the lines: mesh area × ${MESH.lbFt2} lb/ft² (BOUND), isolation plies × the 6781 cured areal weight, jumpers (BOUND); CG FS ${fx(LSP_CG[0] * 12, 1)}, carried in the wings mass item` },
  hardware: HW,
  hardwareNote: HW.map((l) => `${l.qty} × ${l.std}`).join('; '),
  interfaces: [
    { id: 'I1', with: 'LEZ-57-110 wing panels', feature: 'mesh-wing', what: 'Mesh strips cover both caps of each panel; the carbon caps end at the glass tip',
      check: () => { const w = MESH_SURF.find((s) => s.id === 'wing'); return { ok: w.A > 0 && GEO.wing.glassTip.cf < GEO.wing.tipY, detail: `${fx(w.A, 1)} ft² (both panels); carbon ends BL ${fx(GEO.wing.glassTip.cf * 12, 1)}` }; } },
    { id: 'I2', with: 'LEZ-57-142 LWA plate / LEZ-57-143 clevis block', feature: 'iso-lwa', what: 'The isolation ply fits in the plate\'s and the tail\'s bond line',
      check: () => { const ms = Math.min(isoMS(ISO[0]), isoMS(ISO[1])); return { ok: ms >= 0, detail: `bond line ${LUG.flox} in, ply ${BASE_MAT.BID.t} in: MS ${fx(ms)}` }; } },
    { id: 'I3', with: 'LEZ-23-110 COM dipole (block J)', feature: 'mesh-wing', what: 'No carbon inside the dipole\'s λ/2π',
      check: () => { const k = keepoutRows().find((a) => a.id === 'com'); return { ok: k.ms >= 0, detail: `nearest carbon ${fx(k.d)} in, keep-out ${fx(k.r)} in at ${k.f} MHz` }; } },
    { id: 'I4', with: 'LEZ-55-120 canard', feature: 'mesh-canard', what: 'Mesh strips cover both canard caps',
      check: () => { const c = MESH_SURF.find((s) => s.id === 'canard'); return { ok: c.A > 0, detail: `${fx(c.A, 1)} ft²` }; } },
  ],
  tooling: { needed: true, text: 'Mesh cut patterns from the outer-skin ply patterns of each parent; a continuity meter for the bonding check.' },
  sourcing: { blank: `${Math.ceil(MESH_SURF.reduce((a, s) => a + s.A, 0) / 1.5 * 1.1)} ft of 18 in copper LSP mesh (+10 %); 6781 offcuts; 2 braid jumpers`, vendor: 'Aircraft Spruce 05-02632 (Copper Light/Strike 3CU7-125A MicroGrid, 18 in wide, $16.90/ft, accessed 2026-11-19)', url: 'https://www.aircraftspruce.com/catalog/pnpages/05-02632.php',
    cost: +(Math.ceil(MESH_SURF.reduce((a, s) => a + s.A, 0) / 1.5 * 1.1) * 16.90 + 20).toFixed(2), costAsOf: '2026-11-19', perAircraft: 1, lead: 'Stock (mesh)', note: 'Mesh at the Aircraft Spruce price; jumpers about $20 (BOUND); isolation plies from the 6781 stock.' },
};
void PROCESS; void ANTENNAS; void keepout; void LAYUP;
