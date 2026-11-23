// Block P (prepreg airframe conversion, Miles 2026-11-19): the shared laminate rows of the composite definition records —
// allowables, material spec, process steps, prepreg sourcing (proxies) and the rev text. Every value comes from
// structures.js MATSYS / BASE_MAT (NCAMP MTM45-1 and Diab Divinycell HT, prepreg.json) or is marked BOUND. Notional.
import { BASE_MAT, MATSYS, DEFAULT_DESIGN, materials, psi } from '../structures.js';
import { PROCESS } from '../plybook.js';

const ksi = (mpa) => (psi(mpa) / 1000).toFixed(1);
/** design allowables in the design environment (ETW 200 °F wet, the M-cycle reduction, no BVID) */
const MD = () => materials({ ...DEFAULT_DESIGN, bvid: false });
const row = (key) => { const m = MD()[key], b = BASE_MAT[key]; return [`${b.label} design values, ETW 200 °F (× ${m.kA})`, `Xt ${ksi(m.Xt)}, Xc ${ksi(m.Xc)}, in-plane shear ${ksi(m.S)}, SBS ${ksi(m.ILSS)}, bearing ${ksi(m.Fbru)} ksi; E ${(psi(m.E1) / 1e6).toFixed(2)} Msi; cured ply ${b.t} in`, `BOUND: ${MATSYS.kAWhy[b.key]}; ${b.src}`]; };
/** allowables rows for a record: the fabric (6781), the carbon cap ply (HTS40) when carbon, the core (HT61) */
export const LAM_ALLOW = (carbon = false) => [
  ...(carbon ? [row('UNI')] : []), row('BID'),
  [`Divinycell HT61 core (minimums, 73.4 °F)`, `shear ${BASE_MAT.HT61.tau} MPa, shear modulus ${BASE_MAT.HT61.Gc} MPa, compression ${BASE_MAT.HT61.sc} MPa, ${BASE_MAT.HT61.rhoPcf} lb/ft³; ETW × 0.75 (BOUND)`, BASE_MAT.HT61.src],
  ['Cure and temperature limits', `${MATSYS.cure.cycle} (${MATSYS.cure.dwell}, ≥ ${MATSYS.cure.vac} inHg, no post-cure); core processing ≤ ${MATSYS.core.procF} °F, service ≤ ${MATSYS.core.svcF} °F; service target ${MATSYS.serviceMaxF} °F`, `${MATSYS.cure.src}; ${MATSYS.core.src}`],
  ['Test requirement', MATSYS.tests, 'Miles, 2026-11-19 (block P)'],
];
/** the material spec of a composite record */
export const LAM_SPEC = (carbon = false, extra = '') => `${carbon ? 'MTM45-1 / HTS40 (12K HTS5631) carbon unitape caps, ' : ''}MTM45-1 / 6781 S2-glass prepreg (NCAMP NMS 451)${carbon ? '' : ', all glass'}; Divinycell HT61 core, CNC-milled; ${MATSYS.adhesive.name} for core and secondary bonds${extra ? `; ${extra}` : ''}`;
export const LAM_FORM = () => PROCESS.form;
/** the layup / cure process op text */
export const LAM_CURE = (how = 'on the caul or fixture') => `${how}: ${PROCESS.layup}. Bag and cure ${MATSYS.cure.cycle}: ${MATSYS.cure.dwell}, ≥ ${MATSYS.cure.vac} inHg, no free-standing post-cure; the part whole in the oven (oven size is not a constraint). ${PROCESS.witness}.`;
// prepreg prices are quote-only [cost-mtm45, cost-ht, cost-unitape not_found]: proxies, BOUND
export const PP_PRICE = {
  fab: 57.86,   // $/yd, 50 in: Fibre Glast prepreg 7781 E-glass, cut, min 10 yd (fibreglast.com, accessed 2026-11-19); not MTM45-1 / 6781 (BOUND)
  cf: 136.0,    // $/yd, 50 in: Rock West 14031 AS4 3K PW prepreg full roll ($7,089.99 / ~52 yd, accessed 2026-11-19); not HTS40 unitape (BOUND)
  coreFt2Qtr: 8.0,   // $/ft² per 1/4 in: Diab 08HP063 HP80 1/4 in sheet $181.96 (dkhardware.com, accessed 2026-11-19); HT61 by quote (BOUND)
  adhesiveFt2: 39.62,  // $/ft² FM 300-2M 0.060 psf: Graco Roberts 50 in × 5 yd roll from $2,476.32 (gracoroberts.com, accessed 2026-11-20; standin.js STANDIN.film)
  note: 'Prepreg and HT core are sold by quote (Syensqo / Diab distributors): costs here use public proxies (7781 prepreg, AS4 PW prepreg, HP80 sheet), BOUND',
};
/** prepreg yards (50 in roll, +15 %) and cost for laminate areas in ft² by role key (UNI carbon, GUD / BID 6781), plus core ft² × thickness */
export function ppBuy(ft2 = {}, coreFt2 = 0, coreIn = 0.375) {
  const yd = (a) => (a ? Math.max(1, Math.ceil(a / (50 / 12 * 3) * 1.15)) : 0);
  const cf = yd(ft2.UNI || 0), gl = yd((ft2.GUD || 0) + (ft2.BID || 0)), core = coreFt2 * coreIn / 0.25 * PP_PRICE.coreFt2Qtr;
  return { cf, gl, cost: +(cf * PP_PRICE.cf + gl * PP_PRICE.fab + core).toFixed(2), text: `${gl ? `${gl} yd MTM45-1 / 6781 S2-glass prepreg` : ''}${cf ? `${gl ? ', ' : ''}${cf} yd MTM45-1 / HTS40 unitape` : ''} (50 in, +15 %)${coreFt2 ? `; ${coreFt2.toFixed(1)} ft² Divinycell HT61 ${coreIn} in (CNC)` : ''}` };
}
export const PP_VENDOR = { vendor: 'Syensqo (Solvay) MTM45-1 prepreg distributor by quote; Diab distributor (Divinycell HT, by quote)', url: 'https://www.wichita.edu/research/NIAR/Research/cytec-mtm45-1.php' };
