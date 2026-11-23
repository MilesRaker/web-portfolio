// Block P (prepreg airframe conversion, Miles 2026-11-19): the new revision every composite record takes, and the metal records whose
// joints changed with it. Applied once to the merged DEFS (release.js), after every other rev source, so each record's rev list
// ends with this one. Notional; not for construction.
import { sizing, MATSYS, BASE_MAT, GEO } from '../structures.js';

const DATE = '2026-11-19';
const next = (r) => String.fromCharCode((r || 'A').charCodeAt(0) + 1);
const SYSTEM = `Laminate system: ${MATSYS.short} (Miles, 2026-11-19): MTM45-1 / 6781 S2-glass fabric (0.0101 in cured) for skins, webs, faces and the glass caps (laid 0/90), MTM45-1 / HTS40 carbon unitape (0.0055 in) for the wing, canard, CS-spar and jut-out caps, Divinycell HT61 cores CNC-milled (the lowest density that passes), FM 300-2 for core and secondary bonds. Allowables NCAMP MH × 0.72 (6781, HTS40: mean × 0.8 × 0.9) at ETW 200 °F, BOUND until the M-cycle coupon programme (DOT/FAA/AR-03/19); cure ${MATSYS.cure.dwell}, ≥ ${MATSYS.cure.vac} inHg, no post-cure; out-time ≤ ${MATSYS.outDays} days, storage ≤ ${MATSYS.storeF} °F. CNC core programme in place of the hot-wire templates; the steps read debulk, bag, cure`;
const Z = () => sizing().Z;
/** part-specific text (the sizing at the default design); the rest take the system text alone */
const SPEC = {
  'LEZ-57-110': () => `Caps 45 / 45 → ${Z().wing.upper.length} / ${Z().wing.lower.length} HTS40 plies at the root (the plies that fill the room over the LWA plate), dropping to 3 by BL 135; the carbon ends at BL ${(GEO.wing.glassTip.cf * 12).toFixed(1)} and ${Z().wing.tipG.upper} / ${Z().wing.tipG.lower} glass tip caps (6781 0/90) run to the tip (COM keep-out); web ${Z().wing.web} × 6781; HT61 core in place of Styrofoam and the H45 cap beds; copper mesh strips over both caps (LEZ-51-100); 6781 isolation ply in each LWA-plate bond line`,
  'LEZ-55-120': () => `Caps 53 / 27 → ${Z().canard.upper.length} / ${Z().canard.lower.length} HTS40; web ${Z().canard.web} × 6781; HT61 core; copper mesh strips over both caps (LEZ-51-100)`,
  'LEZ-57-140': () => `Caps 54 / 28 → ${Z().csCap} / ${Z().csCapL} HTS40 at the centre line; webs ${Z().csWeb} × 6781 each (3 for C's control pass-throughs); HT61 core; 6781 isolation ply in each clevis-tail bond line; mesh strip over the caps (LEZ-51-100)`,
  'LEZ-57-130': () => `All glass (the COM dipole is in the right fin): caps 13 → ${Z().winglet.upper.length} × 6781 laid 0/90, straps 6781 0/90; HT61 core`,
  'LEZ-32-170': () => `Glass bow, 6781 laid 0/90 (MTM45-1, molded, M cycle): ${Z().gearPlies} plies at the mounts (224 × 7715 before), sized at a 1420 lb gross-case weight to the 10 % reserve (the 15 % bow would come within 0.25 in of the belly)`,
  'LEZ-53-150': () => `All glass: 6781 faces on HT61 in place of FR-3703; the shell's faces wrinkle far later on HT61, so the top longerons re-size 30 → 3 and the belly plies 6 → 2 (6781 laid 0/90, fus-bend MS 0.23); sides draped uncured onto the bulkheads and cured in the jig`,
  'LEZ-57-180': () => 'All glass (strakes): outer faces 3 × 7725 → 2 × 6781 (strake-tank MS 0.68 on the 1.73 psi landing-case field), inner face and ribs 6781, on HT61; skins cured on tools and bonded with FM 300-2 (the assembly in the oven)',
  'LEZ-08-110': () => 'Plates 10 → 11.5 lb each: the prepreg airframe\'s empty CG is further aft, and with two 10 lb plates the lightest pilot the placard could take was 126 lb (R-INT-2 asks ≤ 125); with 11.5 lb plates it is 118 lb. 11.5 lb is the most the slab plates take before the lead reaches block E\'s NG-30 plate cap at FS 10.15 (lead now ends FS 10.13); pins re-checked',
  'LEZ-57-116': () => `Drag-spar caps HTS40 (the wing's root build-up), webs 6781 on HT61; copper mesh strips over the caps; the drag angle sits on the glass skin and its 6781 doubler`,
  'LEZ-57-142': () => 'A 6781 isolation ply lies in the bond line on the cap side (the HTS40 cap over the plate); the plate unchanged; joint checks on the HTS40 / 6781 stack (wing-end-*)',
  'LEZ-57-143': () => 'A 6781 isolation ply lies in the tail\'s bond line on the cap side (HTS40); the block unchanged; joint checks on the new stack (cs-end-*)',
  'LEZ-57-141': () => 'Bolts to the CS spar through the glass webs (no carbon contact); bearing on the 6781 hard points (cs-hp-drag)',
  'LEZ-57-144': () => 'Sits on the jut-out\'s glass lower skin and its 6781 doubler over the HTS40 drag-spar cap (isolation by the glass, galv-iso)',
  'LEZ-57-145': () => 'Through-bolts through the HTS40 caps wet-installed in sealant (AC 20-107B ¶6.e); the AN hardware unchanged (CRES or Ti for Miles to decide)',
};
const isComposite = (D) => { const d = D?.def; if (!d) return false; const sp = String(d.material?.spec || '');
  return !!(D.laminate || d.kind === 'laminate' || /L285|7725|7715|\bBID\b|\bUNI\b|H45|H100|Divinycell|urethane|Styrofoam|FR-3703|MTM45/.test(sp)); };
export function applyPrepregRevs(DEFS) {
  for (const [pn, D] of Object.entries(DEFS)) {
    const d = D?.def; if (!d || pn === 'LEZ-51-100') continue;
    if (!isComposite(D) && !SPEC[pn]) continue;
    if ((d.revs || []).some((r) => r.phase === 'prepreg')) continue;
    const rev = next([d.rev, ...(d.revs || []).map((r) => r.rev)].filter(Boolean).sort().at(-1));
    const change = `${SPEC[pn] ? `${SPEC[pn]()}. ` : ''}${SYSTEM}.`;
    d.revs = [...(d.revs || []), { rev, date: DATE, short: SPEC[pn] ? 'MTM45-1 prepreg conversion (block P); re-sized' : 'MTM45-1 prepreg conversion (block P)', change, phase: 'prepreg' }]; d.rev = rev;
  }
  return DEFS;
}
void BASE_MAT;
