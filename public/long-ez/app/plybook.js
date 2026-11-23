// Ply book v2: sized structure -> per-part layup schedules, weights, properties, manufacturing rules,
// flat patterns, roll nesting, process sheets with inspection points.
import { BASE_MAT, MATSYS, GEO, FIXED, laminate, wingSec, wingletSec, fusAt, fusSide, fusPanel, surfaceGeom, gearSection, materials, strakeSec, wingRootSec, CTL, gearLegLength, gearBowVc } from './structures.js';

const IN = 1 / 12;
const lerp = (a, b, t) => a + (b - a) * t;
export const PROCESS = {
  // prepreg (block P, Miles 2026-11-19): fibre weight fraction of the cured ply, for reference only (no resin is mixed): 7781 resin
  // content 35 ± 3 wt % (NMS 451/4 Rev D Table 1); 6781 v_f 45.5–50 % (CAM-RP-2009-001 Rev C)
  fibreWeightFraction: 0.65,
  rollWidth: 50, // in, prepreg roll width (the Fibre Glast 7781 prepreg proxy is 50 in wide, accessed 2026-11-19; MTM45-1 roll widths are by quote)
  spliceOverlap: 1.0, // in
  spliceStagger: 2.0, // in between splices in successive plies
  // the one shared cure definition: every record reads these strings (integration 2026-11-19); since block P the NCAMP M cycle
  get cure() { return `Vacuum-bag cure on the ${MATSYS.cure.cycle}: ≥ ${MATSYS.cure.vac} inHg throughout, ramp ${MATSYS.cure.ramp} to ${MATSYS.cure.dwell}, cool under full vacuum to ≤ 140 °F before debagging (${MATSYS.cure.src}); ${MATSYS.cure.bag}`; },
  get postCure() { return `No free-standing post-cure: the M cycle is the whole cure (the 350 °F MH post-cure would exceed the Divinycell HT ${MATSYS.core.procF} °F processing limit); witness coupons cured with the part (${MATSYS.tests})`; },
  get layup() { return `Lay up from the freezer: thaw sealed to room temperature before opening; log out-time (≤ ${MATSYS.outDays} days at shop temperature, ${MATSYS.outDaysTack} with a tack test; NMS 451 sec 3.6.2.2); debulk under vacuum every 3–4 plies (≥ 10 min, DESIGN); core bonds with ${MATSYS.adhesive.name} or co-cured without film where NCAMP or Diab practice allows`; },
  get storage() { return `Prepreg stored sealed at ≤ ${MATSYS.storeF} °F, ${MATSYS.storeMonths} months from manufacture (${MATSYS.handSrc})`; },
  get form() { return `MTM45-1 prepreg, vacuum-bag only, co-cured on CNC-milled Divinycell HT on the ${MATSYS.cure.cycle} (250 °F)`; },
  ovenNote: 'Oven size is not a constraint (Miles, 2026-11-19: large ovens available)',
  witness: 'Witness coupons: one 12 × 12 in 6781 panel (and one HTS40 panel on carbon-capped parts) laid up, bagged and cured beside every part; SBS, Tg and C-scan per the coupon programme (DESIGN)',
  cnc: 'CNC-milled core: the core programme (part solid → 3-axis toolpath with the cap troughs, spar-block pockets and the 0.0101 in ply allowances cut in) replaces the hot-wire templates; core tolerance ± 0.010 in (DESIGN)',
};
/** cured areal weight (lb/ft² per ply): the NCAMP cured ply thickness × density (prepreg), or the retired wet-layup formula */
const lbPerFt2 = (mat) => BASE_MAT[mat].areal ?? (BASE_MAT[mat].fabric / 16) / 9 / 0.60;
const wt = (mat, areaFt2, n = 1) => areaFt2 * lbPerFt2(mat) * n;

export function airfoil(x, tc, m = 0.02, p = 0.4) {
  const yt = 5 * tc * (0.2969 * Math.sqrt(Math.max(x, 0)) - 0.126 * x - 0.3516 * x * x + 0.2843 * x ** 3 - 0.1015 * x ** 4);
  const yc = x < p ? m / (p * p) * (2 * p * x - x * x) : m / ((1 - p) ** 2) * (1 - 2 * p + 2 * p * x - x * x);
  return { yu: yc + yt, yl: yc - yt, yc, yt };
}
function arc(tc, m, side, x) {
  let s = 0, px = 0, py = 0;
  const N = 80;
  for (let i = 1; i <= N; i++) {
    const xx = x * (1 - Math.cos(Math.PI / 2 * i / N)), a = airfoil(xx, tc, m), yy = side > 0 ? a.yu : a.yl;
    s += Math.hypot(xx - px, yy - py); px = xx; py = yy;
  }
  return s;
}
/** airfoil ordinates of frame F at span y, chord fraction x (handles control-surface frames and tapered-t/c strakes) */
export function afAt(F, y, x) { return F.afY ? F.afY(y, x) : F.af ? F.af(x) : airfoil(x, F.tcAt ? F.tcAt(y) : F.tc, F.m); }
/** surface arc length (chord units of F) from x0 to x1 on one side */
function arcF(F, y, side, x0, x1) {
  let s = 0, prev = null;
  const N = 60;
  for (let i = 0; i <= N; i++) { const x = x0 + (x1 - x0) * (1 - Math.cos(Math.PI / 2 * i / N)), a = afAt(F, y, x), q = [x, side > 0 ? a.yu : a.yl]; if (prev) s += Math.hypot(q[0] - prev[0], q[1] - prev[1]); prev = q; }
  return s;
}
/** polygon flat pattern along the span: x = developed length, y from 0 to width(y) (or centred if centred) */
function spanPoly(ya, yb, Lfac, wfun, centred = false, breaks = []) {
  const ys = [...new Set([ya, yb, ...breaks.filter((b) => b > ya && b < yb), ...Array.from({ length: 25 }, (_, i) => ya + (yb - ya) * i / 24)])].sort((a, b) => a - b);
  const top = [], bot = [];
  for (const y of ys) {
    const xs = (y - ya) * Lfac, eps = 1e-4;
    const wl = wfun(Math.max(ya, y - eps)), wr = wfun(Math.min(yb, y + eps));
    for (const w of Math.abs(wl - wr) > 1e-6 && y > ya && y < yb ? [wl, wr] : [wfun(y)]) { top.push([xs, centred ? w / 2 : w]); bot.push([xs, centred ? -w / 2 : 0]); }
  }
  return { kind: 'poly', pts: [...top, ...bot.reverse()] };
}

export const FRAMES = {
  wing: {
    span: [GEO.wing.attachY, GEO.wing.tipY], tc: GEO.wing.tc, m: GEO.wing.m, sec: (y) => wingSec(y),
    pt: (y, x, o, off = 0) => { const s = wingSec(y); return [s.le + x * s.c, y, s.z + o * s.c + off]; }, thickAxis: [0, 0, 1],
  },
  canard: {
    span: [-GEO.canard.semi, GEO.canard.semi], tc: GEO.canard.tc, m: 0.02, sec: () => ({ le: GEO.canard.le, c: GEO.canard.c }),
    pt: (y, x, o, off = 0) => [GEO.canard.le + x * GEO.canard.c, y, GEO.canard.z + o * GEO.canard.c + off], thickAxis: [0, 0, 1],
  },
  winglet: {
    span: [0, GEO.winglet.h], tc: GEO.winglet.tc, m: 0, sec: (h) => wingletSec(h),
    pt: (h, x, o, off = 0) => {
      const s = wingletSec(h), tip = wingSec(GEO.wing.tipY), ca = GEO.winglet.cant * Math.PI / 180, lat = o * s.c + off;
      return [s.le + x * s.c, GEO.winglet.y0 + h * Math.sin(ca) + lat * Math.cos(ca), tip.z + h * Math.cos(ca) - lat * Math.sin(ca)];
    },
    thickAxis: [0, 1, 0],
  },
  wingletLow: { // lower (ventral) winglet: hangs below the wing tip, trailing edges aligned
    span: [0, GEO.wingletLow.h], tc: GEO.wingletLow.tc, m: 0,
    sec: (h) => { const tip = wingSec(GEO.wing.tipY), c = lerp(GEO.wingletLow.c[0], GEO.wingletLow.c[1], h / GEO.wingletLow.h); return { le: tip.le + tip.c - c, c }; },
    pt: (h, x, o, off = 0) => {
      const tip = wingSec(GEO.wing.tipY), c = lerp(GEO.wingletLow.c[0], GEO.wingletLow.c[1], h / GEO.wingletLow.h), le = tip.le + tip.c - c, ca = GEO.winglet.cant * Math.PI / 180, lat = o * c + off;
      return [le + x * c, GEO.winglet.y0 - h * Math.sin(ca) + lat * Math.cos(ca), tip.z - h * Math.cos(ca) - lat * Math.sin(ca)];
    },
    thickAxis: [0, 1, 0],
  },
  strake: {
    span: [GEO.strake.rootY, GEO.strake.outY], tc: 0.12, m: 0, tcAt: (y) => strakeSec(y).tc, sec: (y) => strakeSec(y), afY: (y, x) => strakeSec(y).af(x), xr: [0.02, 1.0],
    pt: (y, x, o, off = 0) => { const s = strakeSec(y); return [s.le + x * s.c, y, s.z + o * s.c + off]; }, thickAxis: [0, 0, 1],
  },
  // wing-root jut-out: the outer wing panel's inboard extension aft of the CS spar, from the cowl side to the root rib
  wingRoot: {
    span: [GEO.strake.rootY, GEO.join.y], tc: GEO.wing.tc, m: 0, sec: (y) => wingRootSec(y), afY: (y, x) => wingRootSec(y).af(x), xr: [0.0, 0.98],
    pt: (y, x, o, off = 0) => { const s = wingRootSec(y); return [s.le + x * s.c, y, s.z + o * s.c + off]; }, thickAxis: [0, 0, 1],
  },
};
// control surfaces: the aft chord fraction of their parent surface, in local chord units
for (const [id, c] of Object.entries(CTL)) {
  const P0 = FRAMES[c.parent], cf = c.cf(), xh = 1 - cf, [a, b] = c.span();
  FRAMES[id] = {
    span: [a, b], tc: P0.tc / cf, m: 0, xh, cf, parent: c.parent, thickAxis: P0.thickAxis,
    sec: (y) => { const s = P0.sec(y); return { le: s.le + xh * s.c, c: cf * s.c }; },
    pt: (y, x, o, off = 0) => P0.pt(y, xh + x * cf, o * cf, off),
    af: (x) => { const A = airfoil(xh + x * cf, P0.tc, P0.m); return { yu: A.yu / cf, yl: A.yl / cf, yc: A.yc / cf, yt: A.yt / cf }; },
  };
}
function integ(a, b, f, N = 60) { let s = 0; for (let i = 0; i < N; i++) { const y = lerp(a, b, (i + 0.5) / N); s += f(y) * (b - a) / N; } return s; }

// --------------------------------------------------------------------- lifting parts
/** opts: prefix, skin (BID per side), core, spanLabel, coreNote, doublers[], mirror (one piece across the
 *  centre-line: caps continuous, doublers both sides), cuts [{span, x}] (skins stop at the hinge line over a
 *  control surface), webs (unsized parts: hinge-face web count), xsp, innerSkin (sandwich tank skins: BID on
 *  the inside face), ribs [{y, plies, note}], hollow (sandwich shell, not a solid core), extraFrames [] */
function liftingBook(key, sz, opts) {
  const F = FRAMES[key], gm = sz ? surfaceGeom(key) : null, [y0, y1] = F.span, plies = [];
  const A = (y) => (opts.mirror ? Math.abs(y) : y);
  const chord = (y) => F.sec(A(y)).c, capB = (y) => gm.sec(A(y)).b * IN;
  const sweep = gm ? gm.sweep : Math.atan((F.sec(y1).le + F.sec(y1).c - F.sec(y0).le - F.sec(y0).c) / (y1 - y0 || 1));
  const cosL = Math.cos(sweep), Lin = (a, b) => (b - a) * 12 / cosL;
  const xsp = gm ? gm.sec(A(y0)).xsp : opts.xsp ?? 0.02;
  const cuts = opts.cuts || [], xe = (y) => { const ay = A(y); for (const c of cuts) if (ay > c.span[0] && ay < c.span[1]) return c.x; return 1; };
  const brk = cuts.flatMap((c) => (opts.mirror ? [c.span[0], c.span[1], -c.span[0], -c.span[1]] : c.span));
  let seq = 0;
  const add = (p) => { seq += 1; plies.push({ seq, plies: 1, ...p, weight: wt(p.mat, p.area, p.plies || 1) }); };
  const pre = opts.prefix, nWeb = sz ? sz.web : opts.webs || 0;
  const webH = (y) => { const af = afAt(F, y, xsp); return (af.yu - af.yl) * chord(y); };
  for (let k = 1; k <= nWeb; k++) add({
    id: `${pre}-W${String(k).padStart(2, '0')}`, mat: 'BID', angle: 45, region: 'web', side: 0, span: [y0, y1],
    area: integ(y0, y1, webH) / cosL, note: sz ? 'Shear web, laid on the HT61 spar block' : 'Hinge-face closeout web', step: 2,
    flat: { kind: 'trap', L: Lin(y0, y1), w0: webH(y0) * 12, w1: webH(y1) * 12 },
  });
  const stepOf = opts.steps || { lowerCap: 4, lowerSkin: 5, upperCap: 7, upperSkin: 8 };
  for (const side of [-1, 1]) {
    const S = side < 0 ? 'L' : 'U';
    if (sz) {
      const caps = [...(side < 0 ? sz.lower : sz.upper)].sort((a, b) => a.y1 - b.y1);
      caps.forEach((c, i) => {
        const span = opts.mirror ? [-c.y1, c.y1] : [c.y0, c.y1];
        add({
          id: `${pre}-${S}C${String(i + 1).padStart(2, '0')}`, mat: opts.capMat || 'UNI', angle: 0, region: 'cap', side, span, chord: 'cap', capIndex: i, capCount: caps.length,
          area: integ(span[0], span[1], capB) / cosL, note: c.y1 >= (opts.mirror ? y1 : y1) - 1e-6 ? `Spar cap, full ${opts.mirror ? 'span, continuous through the centre-line' : 'length'}` : `Spar cap, ${opts.mirror ? 'drops at ±' : 'drops at '}${opts.spanLabel} ${c.y1.toFixed(2)} ft`, step: side < 0 ? stepOf.lowerCap : stepOf.upperCap,
          flat: opts.mirror ? spanPoly(span[0], span[1], 12 / cosL, (y) => gm.sec(A(y)).b, true) : { kind: 'strip', L: Lin(c.y0, c.y1), w0: gm.sec(c.y0).b, w1: gm.sec(c.y1).b },
        });
      });
      if (sz.tipG) { const T = sz.tipG, nG = side < 0 ? T.lower : T.upper;   // block P: 6781 glass tip caps past the carbon (COM keep-out), outermost in the trough
        for (let k = 1; k <= nG; k++) add({ id: `${pre}-${S}G${String(k).padStart(2, '0')}`, mat: 'GUD', angle: 0, region: 'cap', side, span: [T.g0, y1], chord: 'cap', depth: (k - 0.5) * BASE_MAT.GUD.t,
          area: integ(T.g0, y1, capB) / cosL, note: `Glass tip cap, 6781 0/90: BL ${(T.g0 * 12).toFixed(1)} to the tip, lapping the carbon ${T.lap} in inboard of its last drop at BL ${(T.cf * 12 - 2).toFixed(1)} (no carbon within the COM dipole's near field)`, step: side < 0 ? stepOf.lowerCap : stepOf.upperCap,
          flat: { kind: 'strip', L: Lin(T.g0, y1), w0: gm.sec(T.g0).b, w1: gm.sec(y1).b } }); }
    }
    for (const dbl of opts.doublers || []) {
      const n = typeof dbl.n === 'function' ? dbl.n() : dbl.n || 1;
      for (const [tag, span] of opts.mirror ? [[`${dbl.tag}R`, dbl.span], [`${dbl.tag}L`, [-dbl.span[1], -dbl.span[0]]]] : [[dbl.tag, dbl.span]]) {
        const arcW = (y) => arcF(F, A(y), side, dbl.chord[0], dbl.chord[1]) * chord(y);
        add({
          id: `${pre}-${S}D${tag}`, mat: dbl.mat, angle: dbl.angle, region: 'doubler', side, span, chord: dbl.chord, plies: n,
          area: integ(span[0], span[1], arcW), note: `${dbl.note}${n > 1 ? ` (${n} plies, stepped 0.5 in)` : ''}`, step: side < 0 ? stepOf.lowerSkin : stepOf.upperSkin,
          flat: { kind: 'trap', L: Lin(span[0], span[1]), w0: arcW(span[0]) * 12, w1: arcW(span[1]) * 12 },
        });
      }
    }
    const aw = (y) => arcF(F, A(y), side, 0, xe(y)) * chord(y) * 12 + 1;
    for (let k = 1; k <= opts.skin; k++) add({
      id: `${pre}-${S}S${String(k).padStart(2, '0')}`, mat: 'BID', angle: 45, region: 'skin', side, span: [y0, y1], chord: [0, 1], cuts, mirror: !!opts.mirror,
      area: integ(y0, y1, (y) => aw(y) / 12, 120), note: `${side < 0 ? 'Lower' : 'Upper'} skin${cuts.length ? ', stops at the hinge line over the control surface' : ''}, 1 in LE overlap`, step: side < 0 ? stepOf.lowerSkin : stepOf.upperSkin,
      flat: cuts.length ? spanPoly(y0, y1, 12 / cosL, aw, false, brk) : { kind: 'trap', L: Lin(y0, y1), w0: aw(y0), w1: aw(y1) },
    });
    for (let k = 1; k <= (opts.innerSkin || 0); k++) add({
      id: `${pre}-${S}N${k}`, mat: 'BID', angle: 45, region: 'skin', inner: true, side, span: [y0, y1], chord: [0, 1],
      area: integ(y0, y1, (y) => aw(y) / 12), note: `${side < 0 ? 'Lower' : 'Upper'} skin, tank-side face (MTM45-1, fuel-resistant once cured)`, step: side < 0 ? stepOf.lowerSkin : stepOf.upperSkin,
      flat: { kind: 'trap', L: Lin(y0, y1), w0: aw(y0), w1: aw(y1) },
    });
  }
  for (const rb of opts.ribs || []) {
    const c = chord(rb.y), pts = [];
    for (let k = 0; k <= 30; k++) { const x = (1 - Math.cos(Math.PI * k / 30)) / 2; pts.push([x * c * 12, afAt(F, rb.y, x).yu * c * 12]); }
    for (let k = 29; k >= 1; k--) { const x = (1 - Math.cos(Math.PI * k / 30)) / 2; pts.push([x * c * 12, afAt(F, rb.y, x).yl * c * 12]); }
    const area = Math.abs(pts.reduce((a2, p, i) => { const q = pts[(i + 1) % pts.length]; return a2 + p[0] * q[1] - q[0] * p[1]; }, 0)) / 2 / 144;
    add({ id: `${pre}-R${rb.tag}`, mat: 'BID', angle: 45, region: 'rib', side: 0, y: rb.y, plies: rb.plies, area, note: rb.note, step: rb.step, flat: { kind: 'poly', pts } });
  }
  for (const ex of opts.extra || []) ex(add, Lin);
  const perim = (y) => (arcF(F, y, 1, 0, 1) + arcF(F, y, -1, 0, 1)) * chord(y);
  // streamwise sections integrated along BL give the true area and volume of a swept surface (a shear keeps area): no 1/cos Λ
  const coreVol = opts.hollow ? integ(y0, y1, (y) => perim(y) * opts.coreIn * IN) : integ(y0, y1, (y) => 0.685 * (F.tcAt ? F.tcAt(y) : F.tc) * chord(y) ** 2);
  return { plies, core: { mat: opts.core, volume: coreVol, weight: coreVol * BASE_MAT[opts.core].rho * 62.43, note: opts.coreNote }, frame: key, xsp, capW: (y) => (gm ? gm.sec(A(y)).b : 0), hollow: !!opts.hollow, coreIn: opts.coreIn };
}
function liftingSteps(name, coreLabel) {
  return [
    { step: 1, title: `Mill the ${coreLabel} cores (CNC core programme)`, inspect: ['Core matches the programme within ± 0.010 in (check plates at root and tip)', 'Cap troughs and spar-block pocket cut to the stack thickness', 'Blocks aligned on the cure fixture, twist set'] },
    { step: 2, title: 'Bond the HT61 spar block (FM 300-2); lay the shear-web plies', inspect: ['Prepreg out-time logged (≤ 10 days)', 'Web plies debulked, no bridging at the corners'] },
    { step: 3, title: 'Join the cores (FM 300-2 at the block joints); check the lower trough', inspect: ['Trough depth = lower-cap stack thickness'] },
    { step: 4, title: 'Lay the lower cap plies (shortest first), debulk every 3–4 plies', inspect: ['Ply count tally against the schedule', 'Drops staggered ≥ 1 in, ramp ≥ 20:1', 'No waviness > 1/16 in'] },
    { step: 5, title: 'Lower doublers, isolation plies and skins; debulk', inspect: ['Splices staggered ≥ 2 in', 'LE overlap ≥ 1 in', 'Glass isolation ply under every metal fitting on carbon'] },
    { step: 6, title: 'Bag and cure (M cycle); flip onto the cure fixture', inspect: [PROCESS.cure, 'Witness coupon in the bag', 'Tap test the lower surface; mark voids > 1/4 in'] },
    { step: 7, title: 'Upper cap plies (shortest first), debulk', inspect: ['Ply count tally', 'Drops staggered ≥ 1 in'] },
    { step: 8, title: 'Upper doublers, isolation plies, skins and lightning mesh; bag and cure (M cycle)', inspect: [PROCESS.postCure, 'Tap test the upper surface', `Weigh ${name}: within ±5 % of predicted`, 'Check incidence and washout on the fixture'] },
  ];
}

const BOOK_EXTRAS = [];
export function registerBookExtras(key, fn) { const i = BOOK_EXTRAS.findIndex((e) => e.key === key); if (i >= 0) BOOK_EXTRAS[i].fn = fn; else BOOK_EXTRAS.push({ key, fn }); }
export { wt as plyWeight };
export function buildPlyBook(R) {
  const Z = R.Z, g = GEO, books = {};
  books.wing = {
    id: 'wing', name: 'Outer wing panel', count: 2, mesh: /^Wing_/,
    blurb: 'CNC-milled Divinycell HT61 core with HTS40 carbon spar caps let into troughs, a 6781 S2-glass shear web on an HT61 spar block and ±45° 6781 skins (all glass), which stop at the aileron hinge line; copper lightning mesh over the carbon-capped surface. MTM45-1 prepreg, co-cured on the M cycle. Bolts to the centre-section spar at the strake junction.',
    ...liftingBook('wing', Z.wing, {
      prefix: 'W', skin: FIXED.skinBID, core: 'XPS', spanLabel: 'BL', coreNote: 'Divinycell HT61, CNC-milled in 3 blocks with the spar block and cap beds',
      cuts: [{ span: g.wing.aileron, x: 1 - g.wing.aileronCf }],
      doublers: [
        { tag: '1', mat: 'BID', angle: 45, n: () => Z.attachBID, span: [g.wing.attachY, g.wing.attachY + 0.75], chord: [0.15, 0.55], note: 'Wing-attach hard-point doubler' },
        { tag: '2', mat: 'UNI', angle: 0, n: FIXED.attach.doublerUNI, span: [g.wing.attachY, g.wing.attachY + 0.6], chord: [0.2, 0.45], note: 'Attach-fitting HTS40 pad' },
        { tag: '3', mat: 'BID', angle: 45, span: [g.wing.tipY - 0.5, g.wing.tipY], chord: [0, 1], note: 'Winglet-joint doubler' },
      ],
    }),
    steps: liftingSteps('each panel', 'HT61'),
    tool: { name: 'CNC core programme + cure fixture', kind: 'cnc', text: 'Moldless construction on CNC-milled cores: the core programme (from the part solid) cuts each HT61 block with its spar-trough and cap-bed pockets, replacing the hot-wire templates; a cure fixture holds the core at the correct twist while each side is laid up, bagged and cured (M cycle, 250 °F).', items: ['CNC core programme (3 blocks, troughs and pockets cut in)', 'Root and tip check plates (airfoil + trough notch)', 'Divinycell HT61 blocks, 3 spanwise pieces', 'Cure-fixture cradles at 3 stations (set washout; 250 °F-rated)', 'Vacuum bag, breather, release film; witness-coupon plate'] },
  };
  books.canard = {
    id: 'canard', name: 'Canard', count: 1, mesh: /^Canard_/,
    blurb: 'One-piece canard spanning the fuselage: HTS40 carbon caps on a CNC-milled Divinycell HT61 core, 6781 S2-glass skins and web, copper lightning mesh over the carbon-capped surface; MTM45-1 prepreg co-cured on the M cycle.',
    ...liftingBook('canard', Z.canard, {
      prefix: 'C', skin: FIXED.skinBID, core: 'PVC', spanLabel: 'BL', coreNote: 'Divinycell HT61, CNC-milled, tip to tip', mirror: true,
      cuts: [{ span: g.canard.elevator, x: 1 - g.canard.elevCf }],
      doublers: [{ tag: '1', mat: 'BID', angle: 45, n: 4, span: [0.35, 0.85], chord: [0.1, 0.7], note: 'Canard attach-tab doubler (at F22/F28)' }],
    }),
    steps: liftingSteps('the canard', 'HT61'),
    tool: { name: 'CNC core programme + canard cure fixture', kind: 'cnc', text: 'Constant-chord CNC core programme for every block; the one-piece canard is laid up upside-down on a cure fixture, tip to tip, bagged and cured (M cycle), then flipped.', items: ['CNC core programme (constant chord, 4 blocks)', 'HT61 blocks ×4', 'Cure-fixture cradles at BL 0 and the tips (250 °F-rated)'] },
  };
  books.winglet = {
    id: 'winglet', name: 'Winglet (upper + lower)', count: 2, mesh: /^Winglet_/,
    blurb: 'All-glass winglet (the COM dipole is in the right fin): 6781 S2-glass caps laid 0/90, skins and web on a CNC-milled HT61 core, built onto the wing tip with a small lower winglet below it. The caps carry lateral-gust and rudder loads; the skins stop at the rudder hinge line and the rudder is a separate part.',
    ...liftingBook('winglet', Z.winglet, {
      prefix: 'L', skin: FIXED.skinBID, core: 'PVC', capMat: 'GUD', spanLabel: 'h', coreNote: 'Divinycell HT61, CNC-milled: upper block + lower winglet block',
      cuts: [{ span: g.winglet.rudder, x: 1 - g.winglet.rudderCf * (1 + (g.winglet.rudderBal || 0)) }],   // DC-005: the shroud ends ahead of the balance nose
      extra: [(add) => { // lower winglet: BID skins on a PVC block, inboard then outboard
        const Fl = FRAMES.wingletLow, [a, b] = Fl.span, c = (h) => Fl.sec(h).c;
        for (const side of [-1, 1]) for (let k = 1; k <= FIXED.skinBID; k++) {
          const aw = (h) => arcF(Fl, h, side, 0, 1) * c(h) * 12 + 1;
          add({ id: `L-V${side < 0 ? 'I' : 'O'}${k}`, mat: 'BID', angle: 45, region: 'skin', frame: 'wingletLow', side, span: [a, b], chord: [0, 1], area: integ(a, b, (h) => aw(h) / 12), note: `Lower winglet ${side < 0 ? 'inboard' : 'outboard'} skin`, step: side < 0 ? 5 : 8, flat: { kind: 'trap', L: (b - a) * 12, w0: aw(a), w1: aw(b) } });
        }
      }],
      doublers: [{ tag: '1', mat: 'BID', angle: 45, n: 2, span: [0, 0.45], chord: [0, 1], note: 'Root splice doubler (wraps 3 in onto the wing tip)' }],
    }),
    steps: liftingSteps('each winglet', 'HT61'),
    tool: { name: 'CNC core programme', kind: 'cnc', text: 'One CNC core programme; the milled core is located on the wing tip with the cant block, laid up and cured in place (M cycle, the panel in the oven).', items: ['CNC core programme (upper and lower blocks)', 'HT61 blocks', 'Cant-angle setting block (250 °F-rated)'] },
  };
  // strakes ------------------------------------------------------------
  const SK = FIXED.strake, gs0 = g.strake;
  books.strake = {
    id: 'strake', name: 'Strake (fuel tank)', count: 2, mesh: /^Strake_/,
    blurb: 'All-glass leading-edge extension between the fuselage and the wing root, over the centre-section spar. Hollow 6781 / HT61 sandwich skins on sandwich ribs form the integral fuel tank; the ribs split it into bays. Skins and ribs are cured flat or on tools (M cycle) and bonded on with FM 300-2 (250 °F, the assembly in the oven).',
    ...liftingBook('strake', null, {
      prefix: 'K', skin: SK.faceBID, innerSkin: 1, core: SK.core, coreIn: SK.coreIn, hollow: true, spanLabel: 'BL', coreNote: `${SK.coreIn} in HT61 sandwich skins (CNC-cut); the tank is hollow`,
      steps: { lowerCap: 4, lowerSkin: 4, upperCap: 6, upperSkin: 6 },
      ribs: gs0.ribs.map((y, i, a) => ({ tag: String(i + 1), y, plies: 2 * SK.ribBID, note: i === 0 ? 'Inboard tank rib (bonds to the fuselage side)' : i === a.length - 1 ? 'Outboard end rib: the tank\'s outboard wall, facing the wing root across the joint gap' : 'Tank baffle rib (splits the tank into bays)', step: 2 })),
    }),
    steps: [
      { step: 1, title: 'CNC-cut the HT61 skin and rib cores (core programme)', inspect: ['Rib outline within ± 0.010 in'] },
      { step: 2, title: 'Lay up and cure the ribs flat, both faces (M cycle)', inspect: [PROCESS.cure, 'No porosity on the tank side (tap test)', 'Witness coupon'] },
      { step: 3, title: 'Bond the ribs to the fuselage side and the centre-section spar (FM 300-2, 250 °F)', inspect: ['Ribs square to the spar, fillets continuous'] },
      { step: 4, title: 'Lower skin: lay up on the skin tool (tank-side face, core, outside), cure, bond on (FM 300-2)', inspect: ['Tank-side face sealed', 'Splices staggered ≥ 2 in'] },
      { step: 5, title: 'Fuel fittings, sump, vent; seal and leak-check the bays', inspect: ['Leak check at ≈ 1/4 psi, soap-bubble every joint'] },
      { step: 6, title: 'Upper skin: lay up, cure, bond on (FM 300-2, the assembly in the oven)', inspect: [PROCESS.postCure, 'Final leak check', 'Weigh: within ±5 %'] },
    ],
    tool: { name: 'Rib jig templates on the fuselage + skin tools', kind: 'ribjig', text: 'Assembled in place: rib templates locate the cured tank ribs on the fuselage side and the centre-section spar; the skins are laid up and cured on CNC-cut tools (250 °F-rated) and bonded over them with FM 300-2.', items: ['Rib templates at the three rib stations', 'Upper and lower skin tools (CNC, 250 °F)', 'Strake leading-edge template', 'Leak-test manifold'] },
  };
  // control surfaces ---------------------------------------------------
  const CT = FIXED.ctl;
  const ctlBook = (id, name, core, count, mesh, blurb, prefix) => ({
    id, name, count, mesh, blurb,
    ...liftingBook(id, null, {
      prefix, skin: id === 'rudder' ? CT.rudderSkinBID : CT.skinBID, core, webs: CT.hingeWebBID, xsp: id === 'rudder' ? CT.rudderXsp : 0.025, spanLabel: id === 'rudder' ? 'h' : 'BL', coreNote: `${BASE_MAT[core].label}, CNC-milled to the parent's aft contour`,
      steps: { lowerCap: 3, lowerSkin: 3, upperCap: 5, upperSkin: 5 },
      doublers: [{ tag: 'H', mat: 'BID', angle: 45, n: id === 'rudder' ? CT.rudderDblBID : 2, span: FRAMES[id].span, chord: [0, 0.35], note: id === 'rudder' ? 'Hinge-line / torque doubler (DC-005: 3 plies, the skin is 1 ply)' : 'Hinge-line / torque doubler' }],
    }),
    steps: [
      { step: 1, title: 'Mill the core to the parent surface\'s aft contour (CNC core programme)', inspect: ['Gap to the cove 1/16–1/8 in'] },
      { step: 2, title: 'Lay the hinge face (closeout web), debulk', inspect: ['Web wraps 1 in onto both skins'] },
      { step: 3, title: `${id === 'rudder' ? 'Inboard' : 'Lower'} skin and hinge doubler`, inspect: ['Splices staggered ≥ 2 in'] },
      { step: 4, title: 'Bag and cure (M cycle); flip', inspect: [PROCESS.cure] },
      { step: 5, title: `${id === 'rudder' ? 'Outboard' : 'Upper'} skin and hinge doubler; bag and cure (M cycle)`, inspect: [PROCESS.postCure] },
      { step: 6, title: `Install hinges${id === 'rudder' ? ' and return spring' : ' and counterweight'}; balance check`, inspect: ['Free movement, no binding over full travel', id === 'rudder' ? 'Returns to neutral' : 'Static balance within limits'] },
    ],
    tool: { name: 'CNC core programme', kind: 'cnc', text: 'The core programme is cut from the parent surface\'s aft contour so the surface fills the cove; laid up and cured on a cradle like the parent.', items: ['CNC core programme', 'HT61 block', 'Cure cradle (250 °F-rated)'] },
  });
  books.aileron = ctlBook('aileron', 'Aileron', 'XPS', 2, /^Aileron_/, 'HT61-core aileron filling the cove behind the wing\'s aft spar line; 6781 skins on a hinge-face web (all glass), hinged at the wing.', 'A');
  books.elevator = ctlBook('elevator', 'Elevator', 'PVC', 2, /^Elevator_/, 'Slotted elevator behind the canard (one each side of the fuselage), torque tube along the hinge line.', 'E');
  books.rudder = ctlBook('rudder', 'Rudder', 'PVC', 2, /^Rudder_/, 'Outward-only rudder in the winglet trailing edge; a return spring brings it back to neutral.', 'R');
  // CS spar -----------------------------------------------------------
  const cs = g.csSpar, capN = Z.csCap, csPlies = [];
  let q = 0;
  const csAdd = (p) => { q += 1; csPlies.push({ seq: q, plies: 1, ...p, weight: wt(p.mat, p.area, p.plies || 1) }); };
  const perim = 2 * (cs.depthFt + cs.width) * 12;
  for (const face of ['F', 'A']) for (let k = 1; k <= Z.csWeb; k++) csAdd({ id: `S-${face}W${k}`, mat: 'BID', angle: 45, region: 'web', side: face === 'F' ? -1 : 1, span: [-cs.halfSpan, cs.halfSpan], area: 2 * cs.halfSpan * cs.depthFt, note: `${face === 'F' ? 'Front' : 'Aft'} shear web`, step: 2, flat: { kind: 'strip', L: 2 * cs.halfSpan * 12, w0: cs.depthFt * 12, w1: cs.depthFt * 12 } });
  for (const side of [-1, 1]) for (let k = 1; k <= capN; k++) {
    const len = cs.halfSpan - (k > capN * 0.6 ? (k - capN * 0.6) * 0.1 : 0);
    csAdd({ id: `S-${side < 0 ? 'L' : 'U'}C${String(k).padStart(2, '0')}`, mat: 'UNI', angle: 0, region: 'cap', side, span: [-len, len], capIndex: k - 1, capCount: capN, area: 2 * len * cs.cap * IN, note: len < cs.halfSpan ? 'Cap, staggered short of the wing fittings' : 'Cap, full length', step: side < 0 ? 3 : 4, flat: { kind: 'strip', L: 2 * len * 12, w0: cs.cap, w1: cs.cap } });
  }
  for (const sgn of [-1, 1]) csAdd({ id: `S-D${sgn < 0 ? 'L' : 'R'}`, mat: 'BID', angle: 45, region: 'doubler', side: 0, plies: Z.attachBID, span: sgn < 0 ? [-cs.halfSpan, -cs.halfSpan + 0.6] : [cs.halfSpan - 0.6, cs.halfSpan], area: 0.6 * perim / 12, note: `Wing-fitting doubler (${Z.attachBID} plies)`, step: 5, flat: { kind: 'strip', L: 7.2, w0: perim, w1: perim } });
  for (let k = 1; k <= 2; k++) csAdd({ id: `S-X${k}`, mat: 'BID', angle: 45, region: 'skin', side: 0, span: [-cs.halfSpan, cs.halfSpan], area: 2 * cs.halfSpan * perim / 12, note: 'Overall wrap', step: 5, flat: { kind: 'strip', L: 2 * cs.halfSpan * 12, w0: perim + 1, w1: perim + 1 } });
  books.csSpar = {
    id: 'csSpar', name: 'Centre-section spar', count: 1, internal: true,
    blurb: 'Box beam through the fuselage behind the rear seat: HTS40 carbon caps, 6781 S2-glass webs and wrap on HT61, MTM45-1 co-cured on the M cycle, glass isolation plies under every metal fitting. Takes both wing root moments plus the strake lift; the wings bolt to fittings at its ends.',
    plies: csPlies, core: { mat: 'PVC', volume: 2 * cs.halfSpan * cs.depthFt * cs.width, weight: 2 * cs.halfSpan * cs.depthFt * cs.width * BASE_MAT.PVC.rho * 62.43, note: 'Divinycell HT61 blocks, CNC-milled, bonded with FM 300-2' },
    box: { s: cs.s, z: cs.z, w: cs.width, h: cs.depthFt, half: cs.halfSpan, capW: cs.cap * IN },
    steps: [
      { step: 1, title: 'Bond the CNC-milled HT61 core blocks on the jig board (FM 300-2)', inspect: ['Straight within 1/32 in over the length'] },
      { step: 2, title: 'Shear webs, front and aft; debulk', inspect: ['Ply count', 'Prepreg out-time logged (≤ 10 days)'] },
      { step: 3, title: 'Lower cap (shortest first), debulk every 3–4 plies', inspect: ['Ply count tally', 'Stagger ≥ 1 in at the ends'] },
      { step: 4, title: 'Upper cap, debulk', inspect: ['Ply count tally'] },
      { step: 5, title: 'Glass isolation plies at the fittings, fitting doublers and overall wrap; bag and cure (M cycle)', inspect: [PROCESS.cure, PROCESS.postCure, 'Fitting holes drilled through end-plate guides', 'Weigh: within ±5 % of predicted'] },
    ],
    tool: { name: 'CS-spar layup and cure jig', kind: 'beamjig', text: 'Built flat on a straight, level jig board (250 °F-rated, it goes into the oven with the bagged spar) with end plates that locate the wing-fitting holes, so both wings come out at the same incidence and dihedral.', items: ['Level jig board with centre-line (250 °F-rated)', 'End plates drilled for the wing fittings', 'CNC-milled HT61 core blocks', 'Cap-width guides'] },
  };
  // fuselage side ---------------------------------------------------------
  // The fuselage shell on its true contour: two side panels (belly edge → cockpit sill), the belly (across
  // the bottom between the side panels) and the top decks (forward deck ahead of the canopy, turtledeck
  // behind it). Each panel is developed flat: x along the fuselage, y = arc length across the panel.
  const Fz = FIXED.fuselage, s0 = g.F22, s1 = g.firewall, outline = [];
  for (let s = s0; s <= s1 + 1e-6; s += 0.25) { const fs = fusSide(s); outline.push([s, fs.zLo + fs.arc]); }
  for (let s = s1; s >= s0 - 1e-6; s -= 0.25) outline.push([s, fusSide(s).zLo]);
  const devFlat = (kind, sa, sb, frac = 1) => { // (a doubly-curved panel is cut as gores in practice; this is its developed envelope) // developed flat pattern, centred on the panel's mid-arc
    const top = [], bot = [], n = Math.max(4, Math.round((sb - sa) / 0.25));
    for (let i = 0; i <= n; i++) { const sx = sa + (sb - sa) * i / n, a = fusPanel(sx, kind).arc * frac; top.push([(sx - sa) * 12, a * 6]); bot.push([(sx - sa) * 12, -a * 6]); }
    return { kind: 'poly', pts: [...top, ...bot.reverse()] };
  };
  const sideArea = integ(s0, s1, (s) => fusSide(s).arc), fp = [];
  const C0 = g.canopy[0], C1 = g.canopy[1];
  const PANELS = {
    side: { name: 'Side panel', kind: 'side', srange: [s0, s1], qty: 2, area: sideArea },
    belly: { name: 'Belly', kind: 'belly', srange: [s0, s1], qty: 1, area: integ(s0, s1, (s) => fusPanel(s, 'belly').arc) },
    nose: { name: 'Nose', kind: 'ring', srange: [0.15, s0], qty: 1, area: integ(0.15, s0, (s) => fusPanel(s, 'ring').arc) },
    fdeck: { name: 'Forward deck', kind: 'deck', srange: [s0, C0], qty: 1, area: integ(s0, C0, (s) => fusPanel(s, 'deck').arc) },
    tdeck: { name: 'Turtledeck', kind: 'deck', srange: [C1, s1], qty: 1, area: integ(C1, s1, (s) => fusPanel(s, 'deck').arc) },
  };
  let f = 0;
  const fAdd = (p) => { f += 1; fp.push({ seq: f, plies: 1, qty: 1, ...p, weight: wt(p.mat, p.area, p.plies || 1) }); };
  const sideFlat = { kind: 'poly', pts: outline.map(([s, z]) => [(s - s0) * 12, (z - 2.0) * 12]) };
  // 1–5: side panels, laid up flat on the table, then bent onto the bulkheads
  for (let k = 1; k <= Fz.faceBID; k++) fAdd({ id: `F-I${k}`, mat: 'BID', angle: 45, region: 'face', panel: 'side', qty: 2, side: -1, area: sideArea, note: 'Side inside face (laid up flat, uncured, before draping onto the bulkheads)', step: 2, flat: sideFlat });
  for (let k = 1; k <= Fz.longeronPlies; k++) {
    const st = s0 + 0.1 * Math.max(0, k - Fz.longeronPlies + 4);
    fAdd({ id: `F-T${String(k).padStart(2, '0')}`, mat: 'GUD', angle: 0, region: 'longeron', panel: 'side', qty: 2, side: 1, srange: [st, s1], area: (s1 - st) * Fz.longeronW * IN, capIndex: k - 1, capCount: Fz.longeronPlies, note: 'Top longeron, 6781 laid 0/90 (pocket milled into the side core)', step: 3, flat: { kind: 'strip', L: (s1 - st) * 12, w0: Fz.longeronW, w1: Fz.longeronW } });
  }
  const GMt = FIXED.gearMount;
  // main-gear hard points: on the belly under the attach-angle flanges (BL ±GEO.gear.padY), one pad per side (the belly is one panel)
  { const bp = fusPanel(g.gear.s, 'belly'), arcAt = (y) => { let a0 = 0, a1 = bp.arc; for (let i = 0; i < 50; i++) { const m = (a0 + a1) / 2; if (bp.at(m).y < y) a0 = m; else a1 = m; } return (a0 + a1) / 2; };
    const aR = arcAt(g.gear.padY), zr = (sg, w) => { const c = sg > 0 ? aR : bp.arc - aR; return [c - w / 2, c + w / 2]; };
    for (const [sg, h] of [[1, 'R'], [-1, 'L']]) {
      fAdd({ id: `F-D1${h}`, mat: 'BID', angle: 45, region: 'doubler', panel: 'belly', qty: 1, side: 1, plies: GMt.padBID, srange: [g.gear.s - 0.6, g.gear.s + 0.6], zrange: zr(sg, 0.45), area: 1.2 * 0.45, note: `Main-gear mount area base pad, ${sg > 0 ? 'right' : 'left'} (${GMt.padBID} plies, on the belly)`, step: 4, flat: { kind: 'strip', L: 14.4, w0: 5.4, w1: 5.4 } });
      for (const [tag, sr, nm] of [['F-D4', [g.gear.s - 0.42, g.gear.s - 0.16], 'forward'], ['F-D5', [g.gear.s + 0.16, g.gear.s + 0.42], 'aft']]) fAdd({ id: `${tag}${h}`, mat: 'BID', angle: 45, region: 'doubler', panel: 'belly', qty: 1, side: 1, plies: GMt.padsBID, srange: sr, zrange: zr(sg, 0.3), area: 0.26 * 0.3, note: `Gear attach-angle pad, ${nm}, ${sg > 0 ? 'right' : 'left'} (${GMt.padsBID} plies, on the belly)`, step: 4, flat: { kind: 'strip', L: 3.1, w0: 3.6, w1: 3.6 } });
    } }
  fAdd({ id: 'F-D2', mat: 'BID', angle: 45, region: 'doubler', panel: 'side', qty: 2, side: 1, plies: 3, srange: [7.6, 8.4], zrange: [0.4, 1.2], area: 0.8 * 0.8, note: 'Seat-belt hard-point doubler (3 plies)', step: 4, flat: { kind: 'strip', L: 9.6, w0: 9.6, w1: 9.6 } });
  fAdd({ id: 'F-D3', mat: 'BID', angle: 45, region: 'doubler', panel: 'side', qty: 2, side: 1, plies: Z.fwPlies, srange: [s1 - 0.5, s1], zrange: [0.1, 0.85], area: 0.5 * 0.75, note: `Firewall engine-mount hard-point (${Z.fwPlies} plies)`, step: 4, flat: { kind: 'strip', L: 6, w0: 14.4, w1: 14.4 } });
  // 6: belly — urethane bottom fitted between the sides; inside BID + UNI glassed in place
  const bellyFlat = devFlat('belly', s0, s1);
  for (let k = 1; k <= Fz.faceBID; k++) fAdd({ id: `F-BI${k}`, mat: 'BID', angle: 45, region: 'face', panel: 'belly', side: -1, area: PANELS.belly.area, note: 'Belly inside face', step: 6, flat: bellyFlat });
  for (let k = 1; k <= Fz.bottomUNI; k++) fAdd({ id: `F-BU${k}`, mat: 'GUD', angle: 0, region: 'bellyuni', panel: 'belly', side: -1, capIndex: k - 1, capCount: Fz.bottomUNI, area: PANELS.belly.area * 0.55, note: 'Belly 6781 laid 0/90 (fore-aft, centre 55 % of the bottom)', step: 6, flat: devFlat('belly', s0, s1, 0.55) });
  // 7: fuselage upside down in the jig — outside of sides and belly in one continuous layup
  for (let k = 1; k <= Fz.faceBID; k++) fAdd({ id: `F-O${k}`, mat: 'BID', angle: 45, region: 'face', panel: 'side', qty: 2, side: 1, area: sideArea, note: 'Side outside face (after the sides are on the bulkheads)', step: 7, flat: sideFlat });
  for (let k = 1; k <= Fz.faceBID; k++) fAdd({ id: `F-BO${k}`, mat: 'BID', angle: 45, region: 'face', panel: 'belly', side: 1, area: PANELS.belly.area, note: 'Belly outside face (laps 2 in onto the sides)', step: 7, flat: bellyFlat });
  // 8: top decks — shaped foam glassed outside, then inside
  for (const [pk, tag] of [['fdeck', 'N'], ['tdeck', 'K']]) {
    const P0 = PANELS[pk], fl = devFlat('deck', ...P0.srange);
    for (let k = 1; k <= Fz.faceBID; k++) fAdd({ id: `F-${tag}O${k}`, mat: 'BID', angle: 45, region: 'face', panel: pk, srange: P0.srange, side: 1, area: P0.area, note: `${P0.name} outside face`, step: 8, flat: fl });
    for (let k = 1; k <= Fz.faceBID; k++) fAdd({ id: `F-${tag}I${k}`, mat: 'BID', angle: 45, region: 'face', panel: pk, srange: P0.srange, side: -1, area: P0.area, note: `${P0.name} inside face`, step: 8, flat: fl });
  }
  // 9: nose — foam block carved to shape, glassed outside, hollowed, glassed inside
  const noseFlat = devFlat('ring', 0.15, s0);
  for (let k = 1; k <= Fz.faceBID; k++) fAdd({ id: `F-QO${k}`, mat: 'BID', angle: 45, region: 'face', panel: 'nose', side: 1, area: PANELS.nose.area, note: 'Nose outside face (cut as gores)', step: 9, flat: noseFlat });
  for (let k = 1; k <= Fz.faceBID; k++) fAdd({ id: `F-QI${k}`, mat: 'BID', angle: 45, region: 'face', panel: 'nose', side: -1, area: PANELS.nose.area, note: 'Nose inside face', step: 9, flat: noseFlat });
  const coreArea = 2 * sideArea + PANELS.belly.area + PANELS.fdeck.area + PANELS.tdeck.area + PANELS.nose.area;
  books.fuselage = {
    id: 'fuselage', name: 'Fuselage shell', count: 1, mesh: /^Fuselage(_\d+)?$/, meshFilter: (p) => p.s < GEO.firewall,
    blurb: 'All-glass HT61-core sandwich shell (MTM45-1 / 6781): two sides laid up and cured flat on the inside, then heat-formed onto the bulkheads, a belly with fore-aft 6781 0/90, the outside skin, the top decks and the nose. The 6781 0/90 top longerons carry fuselage bending around the open cockpit; thick 6781 pads in the bottom corners take the main-gear mount extrusions.',
    plies: fp, panel: { outline, s0, s1, coreIn: Fz.coreIn }, panels: PANELS,
    core: { mat: 'PU', volume: coreArea * Fz.coreIn * IN, weight: coreArea * Fz.coreIn * IN * BASE_MAT.PU.rho * 62.43, note: `${Fz.coreIn} in Divinycell HT61 sheet, CNC-contoured (sides, belly, decks)` },
    steps: [
      { step: 1, title: 'CNC-cut the HT61 sides to the side programme (contour-scored where they curve)', inspect: ['Outline within ± 0.010 in'] },
      { step: 2, title: 'Lay the inside face of each side flat on the table (uncured prepreg), debulk', inspect: ['Prepreg out-time logged (≤ 10 days)', 'No bridging, plies fully tacked'] },
      { step: 3, title: 'Lay the top-longeron 6781 0/90 in the pocket milled into the side core, debulk', inspect: ['Ply count tally', 'Longeron straight, no waviness'] },
      { step: 4, title: 'Hard-point doublers (gear, belts, firewall)', inspect: ['Doubler location against the template marks'] },
      { step: 5, title: 'Drape the uncured sides onto the bulkheads in the fuselage jig; bag and cure in the jig (M cycle)', inspect: [PROCESS.cure, 'Jig stations square and level (250 °F-rated jig)', 'Sides symmetric about the centre-line'] },
      { step: 6, title: 'Fit the belly core between the sides (FM 300-2 at the joints); lay the belly inside (6781 ±45 + fore-aft 0/90); bag and cure', inspect: ['Core joints bonded, no gaps > 1/32 in', '0/90 ply count tally'] },
      { step: 7, title: 'Flip; lay the outside of the sides and belly in one continuous layup; bag and cure', inspect: ['Belly skin laps ≥ 2 in onto the sides', 'Tap test'] },
      { step: 8, title: 'Fit the CNC-milled deck cores; lay up and cure outside, then inside', inspect: ['Deck contour against the check plates'] },
      { step: 9, title: 'Nose: CNC-mill the HT61 nose core, lay up and cure outside, hollow it out, lay up and cure inside', inspect: [PROCESS.postCure, 'Nose-gear well clearance', 'Weigh fuselage shell: within ±5 %'] },
      { step: 10, title: 'Float the main-gear mount extrusions onto the hard-point pads (flox, glass isolation ply on the pad); drill with the gear bow bolted in place', inspect: ['Extrusions square to the centre-line', 'Bow sits flat on both mounts; wheel toe/camber per plans'] },
    ],
    tool: { name: 'Side layup table + fuselage cure jig', kind: 'table', text: 'Each side is laid up flat on a table (uncured prepreg on the contour-scored HT61 sheet cut to the side programme), with clamping blocks to hold the longeron plies straight; the uncured sides are then draped onto the bulkheads in the fuselage jig, bagged and cured in it (M cycle; the jig is 250 °F-rated).', items: ['Flat layup table with full-size side outline', 'Longeron clamping blocks', 'Fuselage assembly and cure jig (F22, F28, panel, seat and firewall stations; 250 °F-rated)'] },
  };
  // F22 ------------------------------------------------------------------
  const F2 = FIXED.F22, fa = fusAt(g.F22), bp = [];
  let b = 0;
  const bAdd = (p) => { b += 1; bp.push({ seq: b, plies: 1, ...p, weight: wt(p.mat, p.area, p.plies || 1) }); };
  const bArea = fa.w * (fa.top - fa.bot) * 0.92, bFlat = { kind: 'strip', L: fa.w * 12, w0: (fa.top - fa.bot) * 12, w1: (fa.top - fa.bot) * 12 };
  for (const side of [-1, 1]) {
    for (let k = 1; k <= F2.faceBID; k++) bAdd({ id: `B-${side < 0 ? 'F' : 'A'}${k}`, mat: 'BID', angle: 45, region: 'face', side, area: bArea, note: `${side < 0 ? 'Forward' : 'Aft'} face`, step: side < 0 ? 1 : 3, flat: bFlat });
    if (side > 0) {
      bAdd({ id: 'B-D', mat: 'BID', angle: 45, region: 'doubler', side, plies: Z.f22Dbl, area: 2 * 0.35 * 0.3, note: `Canard-bolt hard-point doubler (${Z.f22Dbl} plies)`, step: 2, flat: { kind: 'strip', L: 4.3, w0: 3.6, w1: 3.6 } });
      bAdd({ id: 'B-U', mat: 'GUD', angle: 0, region: 'doubler', side, plies: F2.doublerUNI, area: 2 * 0.35 * 0.15, note: `Hard-point 6781 0/90 (bolt bearing, ${F2.doublerUNI} plies)`, step: 2, flat: { kind: 'strip', L: 4.3, w0: 1.8, w1: 1.8 } });
    }
  }
  books.F22 = {
    id: 'F22', name: 'Bulkhead F22 (canard mount)', count: 1, internal: true,
    blurb: "All-glass 6781 / HT61 sandwich bulkhead at fuselage station 22 (MTM45-1, M cycle). The canard bolts to its upper edge; leg holes let the pilot's feet through to the pedals.",
    plies: bp, panel: { s: g.F22, w: fa.w, top: fa.top, bot: fa.bot, coreIn: F2.coreIn },
    core: { mat: 'PVC', volume: bArea * F2.coreIn * IN, weight: bArea * F2.coreIn * IN * BASE_MAT.PVC.rho * 62.43, note: `${F2.coreIn} in HT61 sheet` },
    steps: [
      { step: 1, title: 'Lay the forward face flat on the caul, the CNC-cut HT61 core on it', inspect: ['Prepreg out-time logged', 'Debulked'] },
      { step: 2, title: 'Lay the hard-point doublers; bag and cure (M cycle)', inspect: [PROCESS.cure, 'Witness coupon in the bag'] },
      { step: 3, title: 'Lay the aft face; bag and cure; trim to the programme; pot inserts in flox', inspect: [PROCESS.postCure, 'Outline within ±1/32 in', 'Insert positions against the drill guide', 'Leg holes edge-sealed with flox'] },
    ],
    tool: { name: 'Flat cure caul + trim programme', kind: 'flat', text: 'Laid up flat on a 250 °F-rated caul plate, bagged and cured (M cycle), then trimmed to the CNC programme; the hard-point inserts are potted in flox after the cure.', items: ['Flat caul plate (250 °F-rated)', 'CNC trim programme (outline, leg holes)', 'Bolt-hole drill guide'] },
  };
  // cowling ----------------------------------------------------------------
  const CW = FIXED.cowl, cs0 = g.cowl.s0, cs1 = g.cowl.s1, cwp = [];
  const CPAN = {
    upper: { name: 'Upper cowl', kind: 'upper', srange: [cs0, cs1], qty: 1, area: integ(cs0, cs1, (x) => fusPanel(x, 'upper').arc) },
    lower: { name: 'Lower cowl', kind: 'lower', srange: [cs0, cs1], qty: 1, area: integ(cs0, cs1, (x) => fusPanel(x, 'lower').arc) },
  };
  let cq = 0;
  for (const pk of ['upper', 'lower']) for (let k = 1; k <= CW.BID; k++) { cq += 1; cwp.push({ seq: cq, plies: 1, qty: 1, id: `H-${pk === 'upper' ? 'U' : 'L'}${k}`, mat: 'BID', angle: 45, region: 'face', panel: pk, side: 1, area: CPAN[pk].area, note: `${CPAN[pk].name}, solid laminate ply ${k}`, step: pk === 'upper' ? 2 : 3, flat: devFlat(pk, cs0, cs1), weight: wt('BID', CPAN[pk].area) }); }
  books.cowl = {
    id: 'cowl', name: 'Cowling', count: 1, mesh: /^Fuselage(_\d+)?$/, meshFilter: (p) => p.s >= GEO.firewall, solid: true,
    blurb: 'Upper and lower engine cowls aft of the firewall: solid 6781 S2-glass shells (MTM45-1, M cycle) laid over a 250 °F-rated male tool, split at the side and fastened with hinge pins. Secondary structure (fairing loads only), so no strength checks.',
    plies: cwp, panel: { s0: cs0, s1: cs1, coreIn: 0 }, panels: CPAN, core: null,
    steps: [
      { step: 1, title: 'Build the male tool on the firewall (CNC-milled HT foam or tooling board, sealed, released; 250 °F-rated)', inspect: ['Tool clears the engine by ≥ 1/2 in everywhere'] },
      { step: 2, title: `Upper cowl: ${CW.BID} plies 6781 over the tool, debulk`, inspect: ['No bridging at the inlet lips', 'Prepreg out-time logged'] },
      { step: 3, title: `Lower cowl: ${CW.BID} plies 6781, flange at the split line`, inspect: ['Split-line flange straight'] },
      { step: 4, title: 'Bag and cure (M cycle), pull, trim; fit hinge-pin fasteners', inspect: [PROCESS.cure, 'Gap ≤ 1/16 in along the split'] },
    ],
    tool: { name: 'Male tool (250 °F)', kind: 'plug', text: 'A male tool milled to the cowl contour (high-temperature tooling board or sealed HT foam); both cowl halves are laid up over it, bagged, cured on the M cycle and pulled.', items: ['Male tool, CNC-milled (250 °F-rated)', 'Split-line dam', 'Hinge-pin hardware'] },
  };
  // main gear bow (one piece) -----------------------------------------------
  const M = materials(R.d), gg = g.gear, packs = [], nPly = Z.gearPlies, pack = 8, nPack = Math.ceil(nPly / pack);
  const Lleg = gearLegLength(), Lc = gg.mountY, t0 = nPly * M.GUD.t;
  let gs = 0;
  const bowW = (u) => lerp(gg.w[0], gg.w[1], Math.max(0, u)); // in
  for (let k = 0; k < nPack; k++) {
    const n = Math.min(pack, nPly - k * pack), tk = (k + 1) * pack * M.GUD.t;
    const uEnd = k < nPack * gg.taper ? 1 : Math.min(1, Math.max(0.2, (t0 - tk) / (t0 - t0 * gg.taper)));
    const half = Lc + Lleg * uEnd; // ft, centre-line to the drop
    gs += 1;
    packs.push({ seq: gs, id: `G-P${String(k + 1).padStart(2, '0')}`, mat: 'GUD', angle: 0, region: 'pack', plies: n, u: [0, uEnd], packIndex: k, packCount: nPack,
      area: 2 * (Lc * gg.w[0] + integ(0, uEnd, (u) => bowW(u) * Lleg)) * IN, note: `${n} plies 6781 0/90, ${uEnd >= 1 ? 'axle to axle' : `drops at ${(uEnd * 100).toFixed(0)} % of each leg`}`, step: 2,
      flat: spanPoly(-half, half, 12, (x) => bowW((Math.abs(x) - Lc) / Lleg), true) });
  }
  for (const k of [1, 2]) { gs += 1; packs.push({ seq: gs, id: `G-X${k}`, mat: 'BID', angle: 45, region: 'wrap', plies: 1, u: [0, 1], area: 2 * (Lc + Lleg) * (2 * gg.w[0] + 2 * t0) * IN, note: 'Torsion/abrasion over-wrap, axle to axle', step: 3, flat: spanPoly(-(Lc + Lleg), Lc + Lleg, 12, (x) => 2 * bowW((Math.abs(x) - Lc) / Lleg) + 2 * t0, true) }); }
  gs += 1;
  packs.push({ seq: gs, id: 'G-T1', mat: 'GUD', angle: 0, region: 'tab', plies: FIXED.gearMount.tabUNI, qty: 2, u: [0, 0], area: (10 / 12) * (gg.tabL / 12), note: `Mount tab: 6781 0/90 straps over the ${gg.tubeD} in steel tube (one tab each side)`, step: 4, flat: { kind: 'strip', L: 10, w0: gg.tabL, w1: gg.tabL } });
  packs.forEach((p) => { p.weight = wt(p.mat, p.area, p.plies); });
  books.gear = {
    id: 'gear', name: 'Main gear bow', count: 1, mesh: /^MainGear/,
    blurb: `One-piece solid S2-glass bow (MTM45-1 / 6781 laid 0/90, molded, M cycle): a straight centre section crosses under the fuselage belly at FS ${(gg.s * 12).toFixed(0)}, and the legs curve down to the axles. It bolts on at two mount tabs (steel tubes in 6781 straps) between aluminium extrusions floxed into the fuselage bottom corners: 4 × AN6 bolts. Thickness is set by stiffness: the pusher prop must clear the ground at limit landing deflection.`,
    plies: packs, core: null, section: (u) => gearSection(Z, M, u),
    steps: [
      { step: 1, title: 'Wax and release both mold halves', inspect: ['Release film continuous'] },
      { step: 2, title: 'Lay 6781 0/90 ply packs axle to axle (alternate halves; drops toward both axles), debulk every pack', inspect: ['Pack weight tally against the schedule', 'Warp straight along the bow', 'Centre mark on the bow', 'Prepreg out-time logged (≤ 10 days)'] },
      { step: 3, title: 'Over-wrap, close and clamp the mold, cure (M cycle, the mold in the oven)', inspect: [PROCESS.cure, PROCESS.postCure, 'Bleed at all flash lines'] },
      { step: 4, title: 'Demold, trim; lay the mount tabs over the steel tubes (glass isolation is inherent: all glass), bag and cure', inspect: ['Tubes square to the bow, at the marked BL', 'Tab straps wrap the tube fully'] },
      { step: 5, title: 'Bolt the bow between the fuselage extrusions (4 × AN6), torque', inspect: ['Bolts torqued per plans', 'Toe and camber checked with the fuselage level', 'Weigh bow: within ±5 %'] },
    ],
    tool: { name: 'Two-piece female mold', kind: 'mold', text: 'Unlike the moldless airframe, the gear bow is a molded part: 6781 prepreg laid 0/90 goes into a matched two-piece female mold (250 °F-rated), axle to axle, and is pressed to final thickness and cured on the M cycle. The mount tabs are laid on after demolding.', items: ['Lower mold half with bow-shaped cavity', 'Upper mold half (shown lifted)', 'Alignment dowels and clamping bolts'] },
  };
  // plies added by system parts (hard-points for interfaces), registered by systems.js
  for (const e of BOOK_EXTRAS) e.fn(books, R);
  for (const bk of Object.values(books)) { bk.plies.forEach((p) => { if (p.weight == null) p.weight = wt(p.mat, p.area, p.plies || 1); }); bk.props = props(bk, R, M); bk.rules = rules(bk, R, M); bk.pieces = flatPieces(bk); }
  return books;
}

// --------------------------------------------------------------------- properties (typed for unit conversion)
function props(bk, R, M) {
  const rows = [], skin = laminate([{ mat: 'BID', angle: 45 }, { mat: 'BID', angle: 45 }], M);
  const plyW = bk.plies.reduce((a, p) => a + p.weight * (p.qty || 1), 0), coreW = bk.core ? bk.core.weight : 0;
  const nU = bk.plies.filter((p) => p.mat === 'UNI').reduce((a, p) => a + p.plies, 0), nG = bk.plies.filter((p) => p.mat === 'GUD').reduce((a, p) => a + p.plies, 0), nB = bk.plies.filter((p) => p.mat === 'BID').reduce((a, p) => a + p.plies, 0);
  rows.push(['Construction', bk.id === 'gear' ? 'Solid laminate (molded)' : !bk.core ? 'Solid 6781 laminate over a tool' : bk.hollow ? `Hollow sandwich shell, ${BASE_MAT[bk.core.mat].label} core skins` : `Foam-core sandwich, ${BASE_MAT[bk.core.mat].label} core`, 'text']);
  rows.push(['Plies (HTS40 carbon / 6781 0/90 / 6781 fabric)', `${nU} / ${nG} / ${nB}`, 'text']);
  rows.push(['Laminate weight (cured MTM45-1 prepreg)', plyW, 'lbm']);
  if (bk.core) rows.push(['Core weight', coreW, 'lbm']);
  rows.push(['Part weight, each (no paint, filler or hardware)', plyW + coreW, 'lbm']);
  if (['wing', 'canard', 'winglet'].includes(bk.id)) {
    const sz = R.Z[bk.id];
    rows.push([`Skin laminate Ex (2 × 6781 ±45, ${R.d.env})`, skin.Ex, 'mod']);
    rows.push(['Skin laminate Gxy', skin.Gxy, 'mod']);
    rows.push(['Cap plies at root / tip (upper)', `${sz.upper.length} / ${sz.upper.filter((p) => p.y1 >= sz.gm.y1 - 1e-6).length}`, 'text']);
    rows.push(['Cap plies at root / tip (lower)', `${sz.lower.length} / ${sz.lower.filter((p) => p.y1 >= sz.gm.y1 - 1e-6).length}`, 'text']);
    rows.push(['Shear-web plies (sized)', `${sz.web} × 6781`, 'text']);
    if (R.aero[bk.id]) {
      rows.push(['Mean bending stiffness EI', R.aero[bk.id].EI, 'EI']);
      rows.push(['Mean torsional stiffness GJ', R.aero[bk.id].GJ, 'EI']);
      rows.push(['1st bending / torsion frequency', `${R.aero[bk.id].fb.toFixed(1)} / ${R.aero[bk.id].ft.toFixed(1)} Hz`, 'text']);
    }
  }
  if (bk.id === 'csSpar') { rows.push(['Cap plies (upper / lower, centre line)', `${R.Z.csCap} / ${R.Z.csCapL ?? R.Z.csCap} HTS40`, 'text']); rows.push(['Web plies (each web)', `${R.Z.csWeb} × 6781`, 'text']); if (bk.hard) rows.push(['Hard points (4: each end, upper and lower)', `${bk.hard.nPad} × 6781 pad + ${bk.hard.nFill} × 6781 filler, 1:${bk.hard.ramp}`, 'text']); }
  if (bk.id === 'fuselage') { rows.push(['Face laminate Ex', skin.Ex, 'mod']); rows.push(['Top longeron', `${FIXED.fuselage.longeronPlies} × 6781 0/90 × ${FIXED.fuselage.longeronW} in`, 'text']); }
  if (bk.id === 'F22') rows.push(['Faces / hard-point', `${FIXED.F22.faceBID} × 6781 each face · +${R.Z.f22Dbl} × 6781 ±45 +${FIXED.F22.doublerUNI} × 6781 0/90 at bolts`, 'text']);
  if (bk.id === 'gear') {
    const s0 = gearSection(R.Z, M, 0), s1 = gearSection(R.Z, M, 1);
    rows.push(['Centre / mount section (w × t)', `${s0.w.toFixed(2)} × ${s0.t.toFixed(2)} in · ${R.Z.gearPlies} plies`, 'text']);
    rows.push(['Axle section (w × t)', `${s1.w.toFixed(2)} × ${s1.t.toFixed(2)} in`, 'text']);
    rows.push(['Track / mount spacing', `${(GEO.gear.track * 12).toFixed(1)} / ${(2 * GEO.gear.mountY * 12).toFixed(1)} in`, 'text']);
    rows.push(['Attachment', GEO.gear.attachText || `2 tabs · ${GEO.gear.tubeD} in steel tubes · ${2 * GEO.gear.boltsPerSide} × AN6 bolts into floxed extrusions`, 'text']);
    const g1 = R.rows.find((r) => r.id === 'gear-prop');
    if (g1) rows.push(['Axle deflection at limit landing', g1.trace.result[0][1], 'in']);
  }
  return rows;
}

// --------------------------------------------------------------------- manufacturing rules
function rules(bk, R, M) {
  const out = [], push = (rule, ok, detail) => out.push({ rule, ok, detail });
  if (['wing', 'canard', 'winglet', 'csSpar', 'fuselage'].includes(bk.id)) {
    const caps = bk.plies.filter((p) => p.region === 'cap' || p.region === 'longeron');
    for (const side of [-1, 1]) {
      const c = caps.filter((p) => p.side === side);
      if (!c.length) continue;
      const ends = c.map((p) => (p.span ? p.span[1] : -p.srange[0])).sort((a, b) => a - b), full = Math.max(...ends), drops = ends.filter((e) => e < full - 1e-6);
      let minGap = Infinity;
      for (let i = 1; i < drops.length; i++) minGap = Math.min(minGap, Math.abs(drops[i] - drops[i - 1]) * 12);
      const lbl = bk.id === 'fuselage' ? 'Longeron' : side < 0 ? 'Lower cap' : 'Upper cap';
      push(`${lbl}: drop stagger ≥ ${FIXED.overlap.dropStagger} in`, !(minGap < FIXED.overlap.dropStagger - 0.01), drops.length > 1 ? `min stagger ${minGap.toFixed(2)} in over ${drops.length} drops` : `${drops.length} drop(s)`);
      const tc = M[c[0].mat].t; push(`${lbl}: ramp ratio ≥ 20:1`, FIXED.overlap.dropStagger / tc >= 20, `${(FIXED.overlap.dropStagger / tc).toFixed(0)}:1 (stagger ÷ ply thickness)`);
      if (bk.id !== 'fuselage') push(`${lbl}: every drop covered by a continuous ply`, true, 'layup order runs shortest to longest');
    }
  }
  const faces = bk.plies.filter((p) => ['skin', 'face'].includes(p.region));
  if (faces.length) {
    const L = laminate(faces.filter((p) => p.side === faces[0].side).map((p) => ({ mat: p.mat, angle: p.angle })), M);
    push('Skin/face laminate balanced (A16 = A26 = 0)', L.balanced, 'woven 6781 on the bias');
    const up = faces.filter((p) => p.side > 0).length, lo = faces.filter((p) => p.side < 0).length;
    push('Sandwich faces symmetric about the core', up === lo || !up || !lo, `${lo} / ${up} face plies`);
  }
  if (['wing', 'canard', 'winglet'].includes(bk.id)) { const sz = R.Z[bk.id]; push('Cap stacks unsymmetric by design', true, `upper ${sz.upper.length} vs lower ${sz.lower.length} plies; each sized to its own critical case`); }
  if (bk.id === 'gear') { push('Solid laminate symmetric (packs alternate halves)', true, `${bk.plies.filter((p) => p.region === 'pack').length} packs`); push('Bow symmetric about the centre-line (drops mirrored on both legs)', true, 'every pack runs axle-ward the same distance each side'); }
  if (bk.hollow) push('Fuel-tank faces sealed (tank-side 6781 ply on every skin)', bk.plies.some((p) => p.inner), 'one 6781 ply on the tank side of each sandwich skin');
  const pcs = bk.pieces || flatPieces(bk);
  let spl = 0;
  for (const pc of pcs) spl += splitToFit(pc.poly, pc.angle, PROCESS.rollWidth).splices;
  push(`Splices (${PROCESS.spliceOverlap} in overlap, staggered ≥ ${PROCESS.spliceStagger} in ply to ply)`, true, `${spl} splices per part on ${PROCESS.rollWidth} in rolls`);
  return out;
}

// --------------------------------------------------------------------- flat patterns and roll nesting
/** part-number scheme: LEZ-<assy>-<ply code>[.<layer>]-<dash><band>
 *  assy = 3-digit assembly number, ply code = ply id without hyphens, layer = 2-digit layer within a
 *  multi-ply row, dash 1 = LH / as shown, 2 = RH / opposite (mirror), band = A, B, C… when the ply is
 *  spliced from roll-width bands. */
export const PN_BASE = { wing: 110, canard: 120, winglet: 130, csSpar: 140, fuselage: 150, cowl: 155, F22: 160, gear: 170, strake: 180, aileron: 191, elevator: 192, rudder: 193 };
export const plyPN = (part, plyId) => `LEZ-${PN_BASE[part]}-${plyId.replace(/-/g, '')}`;
export function piecePN(part, plyId, layer, nLayer, copy, seg, nSeg) {
  return `${plyPN(part, plyId)}${nLayer > 1 ? `.${String(layer + 1).padStart(2, '0')}` : ''}-${copy + 1}${nSeg > 1 ? String.fromCharCode(65 + seg) : ''}`;
}
export function piecePoly(f) {
  if (f.kind === 'poly') return f.pts;
  if (f.kind === 'strip') return [[0, -f.w0 / 2], [f.L, -f.w1 / 2], [f.L, f.w1 / 2], [0, f.w0 / 2]];
  return [[0, 0], [f.L, 0], [f.L, f.w1], [0, f.w0]];
}
function flatPieces(bk) {
  const out = [];
  for (const p of bk.plies) {
    if (!p.flat) continue;
    const poly = piecePoly(p.flat);
    for (let k = 0; k < (p.plies || 1); k++) out.push({ ply: p.id, part: bk.id, mat: p.mat, angle: p.mat === 'BID' ? 45 : 0, poly, copies: bk.count * (p.qty || 1), layer: k, nLayer: p.plies || 1 });
  }
  return out;
}
export const rot = (pts, deg) => { const t = deg * Math.PI / 180, c = Math.cos(t), s = Math.sin(t); return pts.map(([x, y]) => [x * c - y * s, x * s + y * c]); };
export const bbox = (pts) => { const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]); return { x0: Math.min(...xs), y0: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) }; };
const polyArea = (pts) => Math.abs(pts.reduce((a, p, i) => { const q = pts[(i + 1) % pts.length]; return a + p[0] * q[1] - q[0] * p[1]; }, 0)) / 2;
function edgeAt(poly, x, top) {
  let best = null;
  for (let j = 0; j < poly.length; j++) {
    const a = poly[j], b = poly[(j + 1) % poly.length];
    if ((a[0] - x) * (b[0] - x) <= 0 && a[0] !== b[0]) { const y = a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]); if (best === null || (top ? y > best : y < best)) best = y; }
  }
  return best;
}
/** clip a polygon to the band ya <= y <= yb (Sutherland-Hodgman, two half-planes) */
function clipBand(poly, ya, yb) {
  const clip = (pts, keep, inter) => {
    const out = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length], ka = keep(a), kb = keep(b);
      if (ka) out.push(a);
      if (ka !== kb) out.push(inter(a, b));
    }
    return out;
  };
  const at = (y) => (a, b) => [a[0] + (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]), y];
  return clip(clip(poly, (p) => p[1] >= ya, at(ya)), (p) => p[1] <= yb, at(yb));
}
/** lay the piece on the roll at its cutting angle and cut it into roll-width bands with spliced overlaps */
export function splitToFit(poly, angle, W) {
  const r = rot(poly, angle), bb = bbox(r), ov = PROCESS.spliceOverlap;
  const n = Math.max(1, Math.ceil((bb.h - ov) / (W - ov) - 1e-9)), segs = [];
  for (let i = 0; i < n; i++) {
    const ya = bb.y0 + i * (W - ov), yb = Math.min(bb.y0 + bb.h, ya + W), c = clipBand(r, ya, yb);
    if (c.length >= 3) segs.push(c);
  }
  return { segs, splices: segs.length - 1, rotated: true };
}
export function nest(books, W = PROCESS.rollWidth) {
  const res = {};
  for (const mat of ['UNI', 'GUD', 'BID']) {
    const pcs = [];
    let splices = 0;
    for (const bk of Object.values(books)) for (const pc of bk.pieces) if (pc.mat === mat) for (let c = 0; c < pc.copies; c++) {
      const { segs, splices: sp } = splitToFit(pc.poly, pc.angle, W);
      splices += sp;
      segs.forEach((s, si) => { const b = bbox(s); pcs.push({ ply: pc.ply, part: pc.part, pn: piecePN(pc.part, pc.ply, pc.layer, pc.nLayer, c, si, segs.length), layer: pc.layer, copy: c, band: si, nBand: segs.length, pts: s.map(([x, y]) => [x - b.x0, y - b.y0]), w: b.w, h: Math.min(b.h, W), area: polyArea(s) }); });
    }
    // tall (full-band) pieces chain along the roll with their slanted ends nested; short pieces go in shelves after
    const prof = (p) => {
      const ys = [], L = [], Rr = [];
      for (let i = 0; i <= 10; i++) {
        const y = 0.02 * p.h + 0.96 * p.h * i / 10;
        let lo = Infinity, hi = -Infinity;
        for (let j = 0; j < p.pts.length; j++) {
          const A = p.pts[j], B = p.pts[(j + 1) % p.pts.length];
          if ((A[1] - y) * (B[1] - y) <= 0 && A[1] !== B[1]) { const x = A[0] + (B[0] - A[0]) * (y - A[1]) / (B[1] - A[1]); lo = Math.min(lo, x); hi = Math.max(hi, x); }
        }
        if (lo < Infinity) { ys.push(y); L.push(lo); Rr.push(hi); }
      }
      return { ys, L, R: Rr };
    };
    const tall = pcs.filter((p) => p.h >= 0.5 * W), short = pcs.filter((p) => p.h < 0.5 * W);
    let x = 0, prev = null;
    for (const p of tall) {
      p.y = 0; p.prof = prof(p);
      if (!prev) p.x = 0;
      else {
        let adv = -Infinity;
        p.prof.ys.forEach((y, i) => { // match prev's right profile at the nearest y
          let k = 0, dmin = Infinity;
          prev.prof.ys.forEach((yy, j) => { const dd = Math.abs(yy - y); if (dd < dmin) { dmin = dd; k = j; } });
          adv = Math.max(adv, prev.x + prev.prof.R[k] - p.prof.L[i]);
        });
        p.x = Math.max(adv + 0.25, prev.x);
      }
      prev = p;
      x = Math.max(x, p.x + p.w);
    }
    short.sort((a, b) => b.h - a.h || b.w - a.w);
    const shelves = [];
    x += tall.length ? 0.5 : 0;
    for (const p of short) {
      let placed = false;
      for (const sh of shelves) if (sh.used + p.h <= W + 1e-6 && p.w <= sh.w + 1e-6) { p.x = sh.x; p.y = sh.used; sh.used += p.h + 0.25; placed = true; break; }
      if (!placed) { shelves.push({ x, w: p.w, used: p.h + 0.25 }); p.x = x; p.y = 0; x += p.w + 0.5; }
    }
    const area = pcs.reduce((a, p) => a + p.area, 0);
    const byPly = {};
    for (const p of pcs) (byPly[p.ply] ||= []).push(p);
    res[mat] = { pieces: pcs, byPly, length: x, yards: x / 36, utilisation: area / Math.max(x * W, 1), splices, area };
  }
  return res;
}
