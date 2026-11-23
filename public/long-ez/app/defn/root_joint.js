// LEZ-57-152 strake end rib, wing root rib and gap seal: an installation record (no solid of its own). The two close-out
// ribs face each other across the joint gap; the seal strip on the strake rib closes it. The record carries the close-outs
// and the seal as lines, and the check that limit-load motion at the root leaves the gap open. Notional.
import { GEO } from '../structures.js';
import { RJ, SEAL, HUTH, ATT, LWA, CLV, ATTACH } from '../parts/wp13_airframe_joints.js';
import { r4 } from './util.js';
import { JCUTS } from '../parts/wp20_jutout.js';

const fx = (x, n = 2) => x.toFixed(n), gap = GEO.join.gap * 12;
export const rjParams = () => ({ gap: r4(gap), endA: r4(RJ.end.a), rootA: r4(RJ.root.a), sealL: r4(RJ.sealL), seal: [RJ.seal.t, RJ.seal.w], inset: r4(SEAL.inset * 12), k: Math.round(HUTH.k) });
export const RJ_DEF = {
  pn: 'LEZ-57-152', rev: 'C', status: 'released', nha: 'LEZ-000 (aircraft)', qty: 2, install: true,
  title: 'Wing root rib close-out and gap seal',
  revs: [{ rev: 'A', date: '2026-11-17', short: 'Initial definition', change: `Initial definition. The gap check took the pin clearance and the joint stiffness as ASSUMED. The stiffness now comes from Huth's fastener-flexibility formula for the spar-end pin (${fx(HUTH.k / 1e6)} Mlb/in, was 0.6 assumed) and the clearance is carried as a bound. The close-outs and the seal are lines with their areas and masses (${fx(RJ.mass, 3)} lb a side, was 0.30 assumed).` },
    { rev: 'B', date: '2026-11-17', short: 'End rib moves to the strake', change: `The strake end rib is the tank's outboard wall, so it is the strake's rib R4 (LEZ-57-180) and leaves this record, which keeps the wing root rib close-out, the seal and the gap check (${fx(RJ.mass, 3)} lb a side).` },
    { rev: 'C', date: '2026-11-19', short: 'Control tunnels cross aft of the close-out', change: `Block C's rod B, the rudder conduit and the systems conduit (I's light harness, J's GMU 11 harness and COM coax) cross the wing root (ICD c_controls §8). Checked: both cross BL ${fx(GEO.join.y * 12, 1)} aft of the close-out (it ends at the spar's aft face), where the jut-out and the panel are one core, so the close-out and the seal need no opening; new interface I3.` }],
  effectivity: 'Left and right wing roots',
  params: rjParams(),
  datums: [],
  features: [
    { id: 'end', kind: 'joint', label: `Strake end rib (LEZ-57-180 rib R4, ref.): its outer face at BL ${fx(RJ.yS * 12)} carries the seal`, tol: 'Square to the joint plane within 0.03 in' },
    { id: 'root', kind: 'joint', label: `Wing root rib: 2 × 6781 ±45 close-out on the panel section at BL ${fx(GEO.join.y * 12, 1)}, LE to the spar's aft face (${fx(RJ.root.a, 1)} in²); the jut-out continues aft of it`, tol: 'Square to the joint plane within 0.03 in' },
    { id: 'seal', kind: 'joint', label: `Seal: ${RJ.seal.t} × ${RJ.seal.w} in closed-cell neoprene sponge on the strake rib, ${fx(SEAL.inset * 12)} in inside the skin, ${fx(RJ.sealL, 1)} in long; gap ${fx(gap)} in`, tol: 'Gap 0.15 ± 0.03 in all round; seal compressed 20–50 %' },
  ],
  tolerances: { general: 'Gap set with 0.15 in shims at the LE, spar and trailing edge before the close-outs cure' },
  drawingNotes: ['Fit the wing on the jig; set the gap with shims; lay the close-outs; cure; fit the seal.'],
  na: { cut: 'Installation: plies cut to the section templates', layup: 'Installation: 2 × 6781 close-outs on each side' },
  material: { spec: '6781 S2-glass, MTM45-1 prepreg (NCAMP); closed-cell neoprene sponge strip, adhesive-backed', alt: 'EPDM sponge of the same section', form: 'prepreg layup; bought strip', density: null,
    allowables: [['Pin joint flexibility', `C = ${HUTH.C.toExponential(3)} in/lb`, 'Huth (1986)']] },
  process: [
    { op: 'Set', spec: `Wing pinned on the jig; 0.15 in shims between the strake and the wing root at the LE, the spar and the trailing edge.` },
    { op: 'Close out', spec: 'Sand the foam faces, FM 300-2 film, 2 × 6781 ±45 each rib, 1 in onto the skins; cure, then remove the wing.' },
    { op: 'Seal', spec: `Bond the strip to the strake rib ${fx(SEAL.inset * 12)} in inside the skin, clear of the LWA lugs crossing the gap.` },
    { op: 'Inspect', spec: 'Gap 0.15 ± 0.03 in all round with the wing installed; seal compressed 20–50 %.' },
  ],
  checks: ['join-gap'],
  rules: [
    { id: 'squeeze', label: 'Seal compression in the gap 20–50 % (lower bound)', v: (RJ.seal.t - gap) / RJ.seal.t / 0.2, min: 1 },
    { id: 'squeeze-max', label: 'Seal compression in the gap ≤ 50 % (room)', v: 0.5 / ((RJ.seal.t - gap) / RJ.seal.t), min: 1 },
    { id: 'seal-clear', label: 'Seal strip clear of the LWA lugs (in)', v: ATTACH.depth - LWA.t / 2 - SEAL.inset * 12 - RJ.seal.w / 2, min: 0.02 },
    { id: 'seal-skin', label: 'Seal strip inside the skin (in)', v: SEAL.inset * 12 - RJ.seal.w / 2 - 0.026, min: 0.02 },
  ],
  mass: { each: RJ.mass, from: 'the lines: close-out areas × 2 × 6781, seal length × section × 9 lb/ft³' },
  hardware: RJ.lines,
  hardwareNote: RJ.lines.map((l) => `${l.qty} × ${l.std}`).join('; ') + ' per side',
  interfaces: [
    { id: 'I1', with: 'LEZ-57-180 strake / LEZ-57-110 panel', feature: 'end', what: 'Ribs face each other across the design gap',
      check: () => ({ ok: Math.abs((GEO.join.y - RJ.yS) * 12 - gap) < 1e-9, detail: `strake rib BL ${fx(RJ.yS * 12)}, wing rib BL ${fx(GEO.join.y * 12)}: ${fx(gap)} in` }) },
    { id: 'I2', with: 'LEZ-57-142 / -143 spar-end joints', feature: 'seal', what: 'The lugs cross the gap inside the seal line',
      check: () => ({ ok: ATTACH.depth - LWA.t / 2 > SEAL.inset * 12 + RJ.seal.w / 2, detail: `lug top ${fx(ATTACH.depth - LWA.t / 2, 3)} in inside the skin, seal to ${fx(SEAL.inset * 12 + RJ.seal.w / 2, 3)} in` }) },
    { id: 'I3', with: 'LEZ-27-142 rod B, LEZ-27-151 conduit (block C)', feature: 'root', what: 'The control tunnels cross the root aft of the close-out, clear of the seal',
      check: () => { const aft = (GEO.csSpar.s + GEO.csSpar.width / 2) * 12, xs = [JCUTS.find((c) => c.id === 'rodB'), JCUTS.filter((c) => c.id.startsWith('cond')).at(-1), JCUTS.filter((c) => c.id.startsWith('sys-') && c.k === 'cyl').at(-1)].map((c) => c.b[1] - c.r); return { ok: xs.every((x) => x > aft + 0.5), detail: `rod B, rudder-conduit and systems-conduit tunnels at the root from FS ${xs.map((x) => fx(x, 2)).join(' / ')} (their forward edges); close-out and seal end at the spar's aft face FS ${fx(aft, 2)}` }; } },
  ],
  tooling: { needed: true, text: 'The wing-attach jig and 0.15 in gap shims; section templates for the two close-outs.' },
  sourcing: { blank: '6781 offcuts; one 4 ft length of sponge strip a side', vendor: 'Aircraft Spruce (closed-cell neoprene weatherstrip, adhesive-backed)', url: 'https://www.aircraftspruce.com/', cost: 6.0, costAsOf: '2026-11-17', perAircraft: 2, lead: 'Stock', note: 'Strip priced at about $1.50/ft; glass from offcuts.' },
};
void ATT; void CLV;

// memory-audit integration (2026-11-19): this record's new revision
import { memRev } from './revs_memaudit.js';
memRev(RJ_DEF);
