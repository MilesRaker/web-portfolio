// Stand-in sourcing estimates for the twelve ply-book laminates (2026-11-20). MTM45-1 prepreg, Divinycell HT61 and FM 300-2 are
// sold by quote: Miles sent the RFQs on 2026-11-20. Until the quotes are in, each part's material cost is worked from its own
// prepreg ply book (nested alone on the 50 in roll), its core volume and its core-bond area at public stand-in prices, plus
// its through-bolts, crush tubes and flox at public catalogue prices. Every price carries its source; every volume or size
// not taken from the model is marked BOUND. The quote vendors are one constant (QUOTE_VENDOR) for the coordinator to update.
// Notional; not for construction.
import { DEFAULT_DESIGN, analyse } from '../structures.js';
import { buildPlyBook, nest } from '../plybook.js';
import { partByPN } from '../systems.js';
import { PP_PRICE } from './p_common.js';
import { pickAN } from '../parts/wp16_wing_attach.js';
import { SPAR, HARD } from '../parts/wp15_cs_spar.js';
import { CLV, SPAR_END, LWA } from '../parts/wp13_airframe_joints.js';
import { CNA } from '../parts/wp24_canard.js';
import { WGL } from '../parts/wp18_winglet.js';
import { F22G } from '../parts/wp25_f22.js';
import { BOW, EAR } from '../parts/wpD1_gear.js';
import { BRK_UNION, BATT_DRAIN, K1_PAD } from './fuselage.js';

export const QUOTE_DATE = '2026-11-20';
/** the quote vendors: one constant, so the coordinator can change a name or add a distributor in one place */
export const QUOTE_VENDOR = {
  prepreg: { name: 'Graco Roberts', where: 'Arlington, TX', what: 'MTM45-1 prepreg (HTS40 unitape, 6781) and FM 300-2 film adhesive', note: 'Syensqo distributor, short-roll and cold-chain service', url: 'https://www.gracoroberts.com/composites/prepregs/' },
  core: { name: 'Diab Americas', where: 'DeSoto, TX', what: 'Divinycell HT61 cores', note: 'cs@us.diabgroup.com', url: 'https://www.diabgroup.com/' },
};
const fx = (x, n = 2) => x.toFixed(n);
const usd = (x) => `$${x.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ------------------------------------------------------------------------------------------- stand-in material prices
// prepreg.json (2026-11-19) proxies, medium confidence; the film from Graco Roberts' public list (2026-11-20)
const HP80 = { usd: 181.96, in3: 40.2 * 81.5 * 0.25 };
export const STANDIN = {
  asOf: QUOTE_DATE,
  glass: { usdYd: PP_PRICE.fab, w: 50, for: 'MTM45-1 / 6781 S2-glass', src: 'Fibre Glast prepreg 7781 E-glass, 50 in, cut, min 10 yd, $57.86/yd (fibreglast.com, accessed 2026-11-19; prepreg.json cost-7781-proxy, medium confidence): not MTM45-1' },
  carbon: { usdYd: PP_PRICE.cf, usdYd2: PP_PRICE.cf / (50 / 36), w: 50, for: 'MTM45-1 / HTS40 unitape', src: 'Rock West 14031 AS4 3K PW prepreg, 50 in, full roll $7,089.99 / ~52 yd ≈ $136/yd ≈ $98/yd² (rockwestcomposites.com, accessed 2026-11-19; prepreg.json cost-as4pw-proxy, medium confidence): not MTM45-1 unitape' },
  core: { usdFt3: HP80.usd / (HP80.in3 / 1728), for: 'Divinycell HT61', src: 'Diab 08HP063 Divinycell HP80 1/4 × 40.2 × 81.5 in sheet $181.96 ≈ $384/ft³ (dkhardware.com, accessed 2026-11-19; prepreg.json cost-hp80, medium confidence): HP80 as the HT stand-in' },
  film: { usdFt2: 2476.32 / (50 * 180 / 144), for: 'FM 300-2', src: 'Graco Roberts, Syensqo FM 300-2M 0.060 psf, 50 in × 5 yd roll (62.5 ft²), from $2,476.32 ≈ $39.62/ft² (gracoroberts.com/adhesives/syensqo-fm-300-2m-adhesive-film-variant, accessed 2026-11-20)' },
  // DESIGN allowances (not sourced): prepreg on top of the nested length (trim, ply rejects, out-time losses, the witness panel);
  // core: CNC-milled from rectangular blocks vs cut from flat sheet; film: trim and laps; flox: mixing losses
  scrap: { prepreg: 0.10, coreMilled: 0.40, coreSheet: 0.15, film: 0.10, flox: 0.50, why: 'DESIGN allowances: prepreg +10 % on the nested roll length (trim, rejects, out-time losses, witness panel); core +40 % CNC-milled from blocks, +15 % cut from sheet; film +10 %; flox +50 % mixing losses' },
};

// ------------------------------------------------------------------------------------------- catalogue hardware prices
const AS = (p, what, url) => ({ usd: p, src: `Aircraft Spruce ${what} (${url}, accessed 2026-11-20)` });
const AN8_BOUND = { usd: 30.0, bound: true, src: 'BOUND: not in the Aircraft Spruce AN8 chart, which ends at -60 (aircraftspruce.com/catalog/hapages/an8.php, accessed 2026-11-20; AN8-56A $24.50, AN8-57A $21.70): special-order length taken at $30' };
export const HW_PRICE = {
  'AN3-5A': AS(0.44, 'AN3-5A, cad undrilled', 'aircraftspruce.com/catalog/hapages/an3.php'),
  'AN3-6A': AS(0.48, 'AN3-6A, cad undrilled', 'aircraftspruce.com/catalog/hapages/an3.php'),
  'AN4-10A': AS(0.85, 'AN4-10A, cad undrilled', 'aircraftspruce.com/catalog/hapages/an4.php'),
  'AN4-11A': AS(1.14, 'AN4-11A, cad undrilled', 'aircraftspruce.com/catalog/hapages/an4.php'),
  'AN6-53A': AS(16.50, 'AN6-53A, cad undrilled', 'aircraftspruce.com/catalog/hapages/an6.php'),
  'AN8-56A': AS(24.50, 'AN8-56A, cad undrilled', 'aircraftspruce.com/catalog/hapages/an8.php'),
  'AN8-57A': AS(21.70, 'AN8-57A, cad undrilled', 'aircraftspruce.com/catalog/hapages/an8.php'),
  'AN8-62A': AN8_BOUND, 'AN8-67A': AN8_BOUND, 'AN8-70A': AN8_BOUND,
  'MS21042L3': AS(0.57, 'MS21042-L3 (price as listed; each or pack not stated)', 'aircraftspruce.com/catalog/pnpages/MS21042-L4.php'),
  'MS21042L4': AS(0.59, 'MS21042-L4 (price as listed; each or pack not stated)', 'aircraftspruce.com/catalog/pnpages/MS21042-L6.php'),
  'MS21042L6': AS(1.78, 'MS21042-L6 (price as listed)', 'aircraftspruce.com/catalog/pnpages/MS21042-L4.php'),
  'MS21042L8': AS(7.50, 'MS21042-L8, 04-00914, each', 'aircraftspruce.com/catalog/pnpages/MS21042-L8.php'),
  'AN960-10': AS(0.10, 'AN960-10, each', 'aircraftspruce.com/catalog/hapages/flatwashers.php'),
  // DC-005 rudder hinge hardware: BOUND (not looked up; scaled from the sourced neighbours above), to be quoted
  'AN3-11A': { usd: 0.70, bound: true, src: 'BOUND: scaled from AN3-5A $0.44 / AN3-6A $0.48 (Aircraft Spruce, 2026-11-20) at ≈ $0.04 per 1/8 in grip' },
  'AN3-16A': { usd: 0.90, bound: true, src: 'BOUND: scaled from AN3-5A / AN3-6A (Aircraft Spruce, 2026-11-20)' },
  'AN4-13A': { usd: 1.30, bound: true, src: 'BOUND: scaled from AN4-10A $0.85 / AN4-11A $1.14 (Aircraft Spruce, 2026-11-20)' },
  'AN4-16A': { usd: 1.60, bound: true, src: 'BOUND: scaled from AN4-10A / AN4-11A (Aircraft Spruce, 2026-11-20)' },
  'AN970-3': { usd: 0.25, bound: true, src: 'BOUND: about twice AN960-10 (Aircraft Spruce, 2026-11-20); large-area washer' },
  'AN970-4': { usd: 0.30, bound: true, src: 'BOUND: about twice AN960-416 (Aircraft Spruce, 2026-11-20); large-area washer' },
  'NAS75-4': { usd: 3.00, bound: true, src: 'BOUND: flanged steel bushing, not looked up' },
  'SAE 841 sleeve 1/4 × 5/16 × 3/8': { usd: 1.50, bound: true, src: 'BOUND: standard-size sintered-bronze sleeve bearing, not looked up' },
  'AN960-416': AS(0.12, 'AN960-416, each', 'aircraftspruce.com/catalog/hapages/flatwashers.php'),
  'AN960-616': AS(0.18, 'AN960-616, each', 'aircraftspruce.com/catalog/hapages/flatwashers.php'),
  'AN960-816': AS(0.22, 'AN960-816, each', 'aircraftspruce.com/catalog/hapages/flatwashers.php'),
  'MS20257P3-6': AS(86.95, 'MS20257P3-6 piano hinge 6 ft, 03-00049-6', 'aircraftspruce.com/catalog/mepages/pianohinge.php'),
  'MS20257P3-3': AS(43.50, 'MS20257P3-3 piano hinge 3 ft, 03-00049-3', 'aircraftspruce.com/catalog/mepages/pianohinge.php'),
};
/** crush tubes, $/ft: the size is the smallest 6061-T6 stock whose bore passes the bolt (DESIGN: no tube size is on the records yet) */
export const TUBE = {
  6: { size: '6061-T6 1/2 OD × .049 (ID .402)', ...AS(3.75, '6061-T6 tube 1/2 × .049, 03-35850, per ft', 'aircraftspruce.com/catalog/mepages/alumtube_6061t6.php') },
  8: { size: '6061-T6 5/8 OD × .058 (ID .509)', ...AS(5.45, '6061-T6 tube 5/8 × .058, 03-36050, per ft', 'aircraftspruce.com/catalog/mepages/alumtube_6061t6.php') },
};
/** flox: MGS L285 with H287 (100 : 40 by weight, taken as by volume: BOUND) thickened with cotton flock, $/in³ of mixed resin */
const L285 = 439.00, H287 = 123.75, FLOCK = 4.85;
export const FLOX = {
  usdIn3: (L285 + 0.4 * 231 / 57.75 * H287) / (1.4 * 231),
  src: 'Aircraft Spruce MGS L285 1 gal 01-41000 $439.00, H287 1 qt 01-41006 $123.75 (aircraftspruce.com/catalog/cmpages/mgsresin.php), flocked cotton 1 lb 01-14800 $4.85 (aircraftspruce.com/catalog/pnpages/01-14800.php), accessed 2026-11-20; mix ratio taken by volume (BOUND); priced as neat mixed resin, the flock adds bulk at $4.85/lb',
  alt: { name: 'Loctite EA 9394 AERO paste (the prepreg-practice hard-point filler, rated hot)', usdIn3: 246.79 / 28.875, src: 'Graco Roberts, Loctite EA 9394 AERO pint kit $246.79 (gracoroberts.com, accessed 2026-11-20)' },
  flock: FLOCK,
};

// ------------------------------------------------------------------------------------------- per-part inputs
let BK = null; const books = () => (BK ||= buildPlyBook(analyse(DEFAULT_DESIGN, false)));
const potCyl = (D, d, t) => Math.PI / 4 * (D * D - d * d) * t;               // in³: flox ring round a hole through a core
const bondTube = (OD, L, g = SPAR_END.flox) => Math.PI * OD * L * g;          // in³: a tube bonded in on a g film of flox
/** bond (film) area, ft² per part: solid cores take one ply's area for every stack of skin / web plies (the core's skin);
 *  sheet cores both faces (2 × volume / thickness) */
function bondSolid(b) {
  const g = {}; for (const p of b.plies) if (['skin', 'web'].includes(p.region)) { const k = `${p.region}|${p.side}|${p.frame || ''}|${JSON.stringify(p.span)}`; g[k] = Math.max(g[k] || 0, p.area); }
  return Object.values(g).reduce((a, x) => a + x, 0);
}
const bondSheet = (b, tIn) => 2 * b.core.volume / (tIn / 12);
const hwLine = (d, re) => (d.hardware || []).filter((h) => re.test(h.std)).map((h) => ({ pn: h.std, qty: h.qty, what: h.desc }));
const hingeIn = (d) => +((d.hardware || []).find((h) => /^MS20257/.test(h.std))?.desc.match(/([\d.]+) in/)?.[1] ?? 0);

const LIFT = { core: 'milled', bond: (b) => bondSolid(b) };
export const PARTS = {
  'LEZ-57-110': { ...LIFT, hw: (d) => [...hwLine(d, /^AN8-/), { pn: 'MS21042L8', qty: 3, what: 'LWA bolt nuts' }, { pn: 'AN960-816', qty: 6, what: 'LWA bolt washers, head and nut' }, ...hwLine(d, /^AN3-/), { pn: 'MS21042L3', qty: 4, what: 'K2 bracket bolt nuts' }],
    tubes: (d) => (d.hardware || []).filter((h) => /^AN8-/.test(h.std)).map((h) => ({ an: 8, qty: h.qty, L: +h.desc.match(/([\d.]+) in through/)[1], what: 'LWA bolt crush tube in the spar block (length ≤ the through depth: BOUND)' })),
    flox: () => [{ in3: 2 * 2 * LWA.area * SPAR_END.flox, what: `LWA plates bedded on ${SPAR_END.flox} in flox, both faces, upper and lower` }],
    excl: 'access-cover screws and nutplates, grommets, liners, the K2 angle and the GMU 11 cover kit (not through-bolts, crush tubes or flox)' },
  'LEZ-57-191': { ...LIFT, hinge: true, hw: (d) => hwLine(d, /^(AN3-|MS21042|AN960)/), flox: (d) => [{ in3: hingeIn(d) * 0.625 * SPAR_END.flox, what: `hinge leaf (${hingeIn(d)} in × 0.625 in) floxed to the skin on ${SPAR_END.flox} in` }] },
  'LEZ-55-192': { ...LIFT, hinge: true, hw: (d) => hwLine(d, /^(AN3-|MS21042|AN960)/), flox: (d) => [{ in3: hingeIn(d) * 0.625 * SPAR_END.flox, what: `hinge leaf (${hingeIn(d)} in × 0.625 in) floxed to the skin on ${SPAR_END.flox} in` }] },
  'LEZ-55-193': { ...LIFT, hw: (d) => hwLine(d, /^(AN3-|MS21042|AN960|NAS75)/), flox: () => [{ in3: 3 * 2.5 * 1.2 * 0.1, what: 'three bracket-notch edge fills, 2.5 × 1.2 × 0.1 in (DC-005, BOUND)' }], excl: 'the return spring (vendor not chosen); the six machined clevis plates (shop parts)' },
  'LEZ-55-120': { ...LIFT, hw: (d) => [...hwLine(d, /^(AN4-|MS21042)/), { pn: 'MS21042L4', qty: 2, what: 'F28 pin nuts' }, { pn: 'AN960-416', qty: 2 * (2 * CNA.nb + 2), what: 'washers under head and nut, F22 bolts and F28 pins' }],
    flox: () => [{ in3: 2 * 2 * CNA.Lf * CNA.w * SPAR_END.flox, what: `F22 and F28 tab flanges (${CNA.Lf} × ${CNA.w} in, both sides) floxed under the canard on ${SPAR_END.flox} in` }] },
  'LEZ-57-130': { ...LIFT, hw: (d) => hwLine(d, /^(AN3-|AN4-|AN970|MS21042)/), flox: () => [{ in3: 0.65 * WGL.c * WGL.depth * (WGL.gap + 0.375) / 2, what: `root bond wedge: 0.65 × ${fx(WGL.c, 1)} in chord × ${fx(WGL.depth)} in depth × the ${WGL.gap}–0.375 in mean gap (BOUND: section fill 0.65)` }, { in3: 2 * (1 - Math.PI / 4) * WGL.R ** 2 * WGL.c, what: `two R ${WGL.R} flox fillets along the root chord` }], excl: 'the three machined 6061-T6 rudder hinge brackets (shop parts), the PET wiper film and the NAS1832 inserts (block C stand-in)' },
  'LEZ-57-180': { core: 'sheet', bond: (b) => bondSheet(b, 0.375), hw: () => [], flox: () => [], excl: 'none on the strake: skins and ribs bonded with FM 300-2; the fuel fittings and their inserts are on the fuel system (LEZ-28)' },
  'LEZ-57-140': { core: 'milled', bond: (b, d, D) => { const p = D.params(), tw = p.wrap * p.tB, tWeb = p.web * p.tB; return 2 * p.L * ((p.Wd - 2 * tw - 2 * tWeb) + (p.H - 2 * tw)) / 144; },
    hw: () => { const ac = pickAN(8, SPAR.h + 2 * 0.063).std, n6 = HARD.reduce((a, h) => a + 2 * h.n, 0), nC = 2 * CLV.bolts.length;
      return [{ pn: ac, qty: nC, what: 'clevis-tail through-bolts (both ends)' }, { pn: 'MS21042L8', qty: nC, what: 'nuts' }, { pn: 'AN960-816', qty: 2 * nC, what: 'washers' },
        ...HARD.map((h) => ({ pn: h.hw.bolt, qty: 2 * h.n, what: `${h.id} hard-point bolts (${h.part}), both sides` })), { pn: 'MS21042L6', qty: n6, what: 'nuts' }, { pn: 'AN960-616', qty: 2 * n6, what: 'washers' }]; },
    tubes: () => [{ an: 8, qty: 2 * CLV.bolts.length, L: SPAR.tube, what: 'clevis-bolt crush tubes between the pads' }, ...HARD.map((h) => ({ an: h.an, qty: 2 * h.n, L: h.tube, what: `${h.id} hard-point crush tubes through the core` }))],
    flox: () => [{ in3: 2 * CLV.bolts.length * bondTube(0.625, SPAR.tube) + HARD.reduce((a, h) => a + 2 * h.n * bondTube(0.5, h.tube), 0), what: `crush tubes bonded in on ${SPAR_END.flox} in flox` },
      { in3: 4 * 2 * (CLV.uWeb - CLV.u0) * CLV.W * SPAR_END.flox, what: `four clevis tails (${fx(CLV.uWeb - CLV.u0)} × ${CLV.W} in) bedded on ${SPAR_END.flox} in flox, both faces` }] },
  'LEZ-53-150': { core: 'sheet', bond: (b) => bondSheet(b, 0.375), hw: () => [],
    flox: () => { const ang = (partByPN('LEZ-32-120')?.geo || []).filter((g) => g.t === 'box' && g.mat === '6061'), t = 0.375;
      return [{ in3: ang.reduce((a, g) => a + (g.d[0] * 12 + 0.5) * (g.d[1] * 12 + 0.5) * t, 0), what: `main-gear angle potting: ${ang.length} flange footprints + 0.25 in all round × the ${t} in core` },
        { in3: 2 * potCyl(BRK_UNION.pot, BRK_UNION.hole, t) + potCyl(BATT_DRAIN.pot, BATT_DRAIN.hole, t), what: `brake-union pots Ø ${BRK_UNION.pot} (2) and the battery-drain pot Ø ${BATT_DRAIN.pot}` },
        { in3: (K1_PAD.fs[1] - K1_PAD.fs[0]) * (K1_PAD.wl[1] - K1_PAD.wl[0]) * K1_PAD.bed / 2 + 2 * potCyl(K1_PAD.pot, 0.19, t), what: `K1 pad's tapered flox bed (0–${K1_PAD.bed} in) and two Ø ${K1_PAD.pot} insert pots` }]; },
    excl: 'none on the shell: inserts and fasteners belong to the parts that bolt to it' },
  'LEZ-53-160': { core: 'sheet', bond: (b) => bondSheet(b, 0.375), hw: () => [],
    flox: () => { const t = 0.375, H = F22G.holes, bolts = H.filter((h) => h.kind === 'bolt'), pass = H.filter((h) => h.kind === 'pass');
      return [{ in3: bolts.reduce((a, h) => a + potCyl(2 * h.r + 0.5, 2 * h.r, t), 0), what: `${bolts.length} canard-bolt flox inserts, 0.25 in all round (BOUND) through the ${t} in core` },
        { in3: pass.reduce((a, h) => a + 2 * Math.PI * h.r * t * SPAR_END.flox, 0), what: `${pass.length} pass-through holes edge-sealed, ${SPAR_END.flox} in` },
        { in3: 2 * F22G.perim * (1 - Math.PI / 4) * 0.25 ** 2, what: `installation fillets R 0.25 (BOUND) both faces along the ${fx(F22G.perim, 1)} in outline` }]; },
    excl: 'none on the detail part: the canard bolts are on LEZ-55-120' },
  'LEZ-71-155': { core: null, bond: () => 0, hw: () => [], flox: () => [], excl: 'none: the hinges, screws, seal and the hinge-leaf flox are on LEZ-71-120' },
  'LEZ-32-170': { core: null, bond: () => 0, hw: () => [], flox: () => [{ in3: 2 * 2 * EAR.Lfl * BOW.w0 * SPAR_END.flox, what: `two ears, ${EAR.Lfl} in flanges each side floxed on the ${BOW.w0} in bow top on ${SPAR_END.flox} in` }], excl: 'none on the bow: the mount bolts are LEZ-32-120\'s, the axle bolts LEZ-32-310\'s' },
};

// ------------------------------------------------------------------------------------------- the estimate
/** a part's stand-in estimate, per part (each): lines { group, item, qty, unit, usd, src, bound } */
export function standIn(pn, D) {
  const P = PARTS[pn], d = D.def, b = books()[D.book], n = b.count, S = STANDIN, lines = [];
  const N = nest({ [D.book]: b }), ydOf = (m) => (N[m] && N[m].pieces.length ? N[m].yards / n : 0), ut = (m) => (N[m] && N[m].pieces.length ? N[m].utilisation : 0);
  const cf = ydOf('UNI'), gl = ydOf('BID') + ydOf('GUD');
  if (cf) { const yd = cf * (1 + S.scrap.prepreg); lines.push({ group: 'prepreg', item: `${S.carbon.for}, ${fx(cf, 1)} yd nested (${fx(ut('UNI') * 100, 0)} % used) + ${S.scrap.prepreg * 100} % scrap`, qty: +yd.toFixed(2), unit: 'yd (50 in)', usd: yd * S.carbon.usdYd, src: S.carbon.src, bound: true }); }
  if (gl) { const yd = gl * (1 + S.scrap.prepreg), u = (ydOf('BID') * ut('BID') + ydOf('GUD') * ut('GUD')) / gl; lines.push({ group: 'prepreg', item: `${S.glass.for}, ${fx(gl, 1)} yd nested (${fx(u * 100, 0)} % used) + ${S.scrap.prepreg * 100} % scrap`, qty: +yd.toFixed(2), unit: 'yd (50 in)', usd: yd * S.glass.usdYd, src: S.glass.src, bound: true }); }
  if (P.core && b.core) { const k = P.core === 'milled' ? S.scrap.coreMilled : S.scrap.coreSheet, v = b.core.volume * (1 + k);
    lines.push({ group: 'core', item: `${S.core.for}, ${fx(b.core.volume, 3)} ft³ net + ${k * 100} % (${P.core === 'milled' ? 'CNC-milled from blocks' : 'cut from sheet'})`, qty: +v.toFixed(3), unit: 'ft³', usd: v * S.core.usdFt3, src: S.core.src, bound: true }); }
  const bond = P.bond(b, d, D);
  if (bond > 0) { const a = bond * (1 + S.scrap.film); lines.push({ group: 'film', item: `${S.film.for} on every core face, ${fx(bond, 1)} ft² + ${S.scrap.film * 100} % (upper bound: co-cure without film where NCAMP or Diab practice allows)`, qty: +a.toFixed(1), unit: 'ft²', usd: a * S.film.usdFt2, src: S.film.src }); }
  for (const h of P.hw(d)) { const pr = HW_PRICE[h.pn]; if (!pr) throw new Error(`stand-in: no catalogue price for ${h.pn} (${pn})`);
    lines.push({ group: 'hardware', item: `${h.pn}: ${h.what}`, qty: h.qty, unit: 'ea', usd: h.qty * pr.usd, src: pr.src, bound: !!pr.bound }); }
  if (P.hinge) { const L = hingeIn(d), pc = L > 36 ? 'MS20257P3-6' : 'MS20257P3-3', pr = HW_PRICE[pc]; lines.push({ group: 'hardware', item: `${pc}: continuous hinge, cut to ${L} in`, qty: 1, unit: 'ea', usd: pr.usd, src: pr.src }); }
  for (const t of (P.tubes ? P.tubes(d) : [])) { const T = TUBE[t.an], ft = t.qty * t.L / 12; lines.push({ group: 'tubes', item: `${T.size}: ${t.qty} × ${fx(t.L)} in, ${t.what}`, qty: +ft.toFixed(2), unit: 'ft', usd: ft * T.usd, src: T.src, bound: !!T.bound }); }
  const fl = P.flox(d), fv = fl.reduce((a, x) => a + x.in3, 0);
  if (fv > 0) { const v = fv * (1 + S.scrap.flox); lines.push({ group: 'flox', item: `flox ${fx(fv, 2)} in³ + ${S.scrap.flox * 100} %: ${fl.map((x) => `${x.what} (${fx(x.in3, 2)})`).join('; ')} (volumes are estimates: BOUND)`, qty: +v.toFixed(2), unit: 'in³', usd: v * FLOX.usdIn3, src: FLOX.src, bound: true }); }
  lines.forEach((l) => { l.usd = +l.usd.toFixed(2); });
  const sum = (g) => +lines.filter((l) => !g || l.group === g).reduce((a, l) => a + l.usd, 0).toFixed(2);
  const groups = Object.fromEntries(['prepreg', 'core', 'film', 'hardware', 'tubes', 'flox'].map((g) => [g, sum(g)]));
  return { asOf: S.asOf, total: sum(), groups, lines, excl: P.excl || '', floxAlt: fv > 0 ? +(fv * (1 + S.scrap.flox) * FLOX.alt.usdIn3).toFixed(2) : 0, cfYd: cf * (1 + S.scrap.prepreg), glYd: gl * (1 + S.scrap.prepreg), coreFt3: P.core && b.core ? b.core.volume : 0, bondFt2: bond };
}
/** the vendors a part's quote is waiting on (core vendor only when it has a core) */
export const quoteVendors = (est) => [QUOTE_VENDOR.prepreg, ...(est.coreFt3 > 0 ? [QUOTE_VENDOR.core] : [])];
export const quoteText = (est) => `quote requested ${QUOTE_DATE} from ${quoteVendors(est).map((v) => v.name).join(' and ')}; stand-in estimate ${usd(est.total)}`;

/** put the stand-in estimate into each ply-book record's sourcing, with a rev (applied once to the merged DEFS) */
export function applyStandIn(DEFS) {
  for (const pn of Object.keys(PARTS)) {
    const D = DEFS[pn]; if (!D) throw new Error(`stand-in: no record ${pn}`);
    const d = D.def, e = standIn(pn, D), s = d.sourcing, V = quoteVendors(e), g = e.groups;
    const blank = [e.cfYd ? `${fx(e.cfYd, 1)} yd MTM45-1 / HTS40` : '', e.glYd ? `${fx(e.glYd, 1)} yd MTM45-1 / 6781` : ''].filter(Boolean).join(', ') + ' (50 in, nested + 10 %)'
      + (e.coreFt3 ? `; ${fx(e.coreFt3 * (1 + (PARTS[pn].core === 'milled' ? STANDIN.scrap.coreMilled : STANDIN.scrap.coreSheet)), 2)} ft³ Divinycell HT61` : '') + (e.bondFt2 ? `; ${fx(e.bondFt2 * 1.1, 0)} ft² FM 300-2` : '');
    d.sourcing = { ...s, blank, vendor: `Quote requested ${QUOTE_DATE}: ${V.map((v) => `${v.name}, ${v.where} (${v.what})`).join('; ')}`, url: QUOTE_VENDOR.prepreg.url,
      cost: e.total, costAsOf: QUOTE_DATE, lead: `Quote pending (${V.map((v) => v.name).join(', ')})`,
      note: `STAND-IN ESTIMATE pending the MTM45-1 and Divinycell HT quotes (${QUOTE_DATE}), each part: prepreg ${usd(g.prepreg)}, core ${usd(g.core)}, FM 300-2 ${usd(g.film)}, bolts / nuts / washers${PARTS[pn].hinge ? ' / hinge' : ''} ${usd(g.hardware)}, crush tubes ${usd(g.tubes)}, flox ${usd(g.flox)}${e.floxAlt ? ` (EA 9394 paste instead: ${usd(e.floxAlt)})` : ''}. Stand-in prices: 7781 prepreg for 6781, AS4 PW for HTS40 unitape, HP80 for HT61 (prepreg.json proxies, medium confidence); ${STANDIN.scrap.why}.${e.excl ? ` Not in the estimate: ${e.excl}.` : ''}`,
      quote: { state: 'requested', date: QUOTE_DATE, vendors: V.map((v) => ({ name: v.name, where: v.where, what: v.what })) }, standIn: e };
    const r = String.fromCharCode([d.rev, ...(d.revs || []).map((x) => x.rev)].filter(Boolean).sort().at(-1).charCodeAt(0) + 1);
    d.revs = [...(d.revs || []), { rev: r, date: QUOTE_DATE, phase: 'sourcing', short: pn === 'LEZ-57-140' ? 'Stand-in cost; core templates T1–T4' : 'Stand-in cost (quotes requested)',
      change: `Sourcing only: the cost was the wet-layup cloth, core and resin figure (2026-11-17/18), never updated in the prepreg conversion. Now a stand-in estimate from the prepreg ply book nested alone on the 50 in roll, the core volume and the core-bond area at public stand-in prices, with this part's through-bolts, crush tubes and flox at catalogue prices: ${usd(e.total)} each. MTM45-1 and FM 300-2 quote requested ${QUOTE_DATE} from ${QUOTE_VENDOR.prepreg.name}${e.coreFt3 ? `, HT61 from ${QUOTE_VENDOR.core.name}` : ''}.${pn === 'LEZ-57-140' ? ' Drawing: CNC core templates T1–T4 (sections at the lower-cap build-up, the hard-point ramp and the clevis-tail pocket) and the core step table added to the sheet; the solid is unchanged.' : ''}` }];
    d.rev = r;
  }
  return DEFS;
}
