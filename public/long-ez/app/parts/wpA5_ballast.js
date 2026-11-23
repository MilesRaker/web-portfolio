// WPA5 — nose ballast: LEZ-08-105 nose ballast bulkhead (the host, coordinator M-17), LEZ-08-100 fixed ballast,
// LEZ-08-110 removable ballast plates. The 60 lb of fixed lead needs 146 in³; the nose ahead of the nose-gear box holds
// only about 110 in³ above the landing light and the nose-gear parts (WL 33), so the fixed lead is split across a small
// bulkhead just ahead of the nose-gear box: a block cast to the nose's inner contour forward of it, and two side slabs
// aft of it either side of the nose-gear box, all clamped through the bulkhead by four AN5 bolts between 4130 plates.
// The removable plates hang on the side slabs' aft plates on ball-lock pins. Under the FAR 23.561 forward load every
// piece bears on the bulkhead, which spreads the load into the shell through solid hard points and its tapes.
//  • Checks: ballast-bolt (bolt tension and plate bending under the forward block), ballast-bhd (the bulkhead's hard
//    points, core and tapes), ballast-pin (the plates' pins at the up and side factors).
// Lead density, ball-lock pin rating and the 23.561 items-of-mass factors are typed from memory (marked). Notional.
import { slabRow } from './slab_pass.js';
import { FIXED, registerChecks, mk, psi, plyRF, allowB, BASE_MAT } from '../structures.js';
import { plyWeight } from '../plybook.js';
import { defineParts, LOAD, partByPN } from '../systems.js';
import { r4, area2, perim, clipV, clipRect, innerRing, vertPlane, crossingsSlab, slabOf, crossingsThrough, mergeHoles, pip, flatParams, flatVolumes, lazyGeo, flatSlab } from './wpA0_flat.js';
import { RHO } from './wpA1_f28.js';

const IN_ = (n, v, u, s = 'DERIVED') => [n, v, u, s], tB = BASE_MAT.BID.t;
export const BALLAST = { fixed: 60, plate: 11.5, plates: 2 };   // lb (the loading sweep's figures, wp5); block P: plates 10 → 11.5 lb (the prepreg airframe's empty CG is further aft; with 10 lb plates the lightest pilot with both was 126 lb, R-INT-2 asks ≤ 125; 11.5 lb is the most the slab plates take before the lead reaches E's NG-30 plate cap at FS 10.15)
export const LEAD = 0.4097;   // lb/in³ (11.34 g/cm³, handbook value typed from memory)
export const NB = { s: 6.87 / 12, coreIn: 0.375, faceBID: 3, tsh: FIXED.fuselage.coreIn + 2 * FIXED.fuselage.faceBID * tB, clr: 0.10, floor: 33.0, fwdLimit: 3.0, step: 0.5,
  bolt: { an: 5, pts: [[2.6, 34.2], [-2.6, 34.2], [2.6, 36.4], [-2.6, 36.4]] }, steel: 0.125, slabU: [1.10, 4.70], pin: { d: 0.25, rate: 3600 }, tape: { n: 2, lap: 1.0 }, nF: 18.0, nS: 4.5, nU: 3.0 };
NB.t = NB.coreIn + 2 * NB.faceBID * tB;
const P = vertPlane(NB.s), fA = NB.t / 2;   // w = FS − 6.87; the bulkhead spans w ±t/2
const inner = (fs, off) => innerRing(fs / 12, NB.tsh + off);
/** the lead cross-section at station fs (in): the shell's inner contour less the clearance, above the floor WL */
const leadAt = (fs) => clipV(inner(fs, NB.clr), NB.floor, 'above');
const slabAt = (fs, sg) => { const [a, b] = NB.slabU; return clipRect(leadAt(fs), sg > 0 ? [a, b, NB.floor, 99] : [-b, -a, NB.floor, 99]); };
export const NBG = (() => {
  const bh = innerRing(NB.s, NB.tsh), fwdFace = NB.s * 12 - fA, aftFace = NB.s * 12 + fA;
  // forward block: steps of NB.step in, each cut to the narrower (forward) station, until the forward limit
  const steps = []; let Vb = 0;
  for (let w1 = -fA - NB.steel * 0, k = 0; ; k++) { const w0 = w1 - NB.step; if (NB.s * 12 + w0 < NB.fwdLimit + NB.steel) break; const poly = leadAt(NB.s * 12 + w0); steps.push({ k, w0: r4(w0), w1: r4(w1), poly }); Vb += area2(poly) * NB.step; w1 = w0; }
  const blockFwd = steps.at(-1).w0;
  // aft side slabs: the shell section at the slab's aft end, BL 1.10–4.70 each side, thick enough to make up 60 lb
  const slab0 = aftFace - NB.s * 12, slabs = [1, -1].map((sg) => slabAt(NB.s * 12 + slab0, sg));   // cut to the forward (narrower) end
  const Vneed = BALLAST.fixed / LEAD - Vb, slabL = Math.ceil(Vneed / (area2(slabs[0]) + area2(slabs[1])) * 100) / 100;
  // removable plates: aft of the slab's steel plate, same section, 10 lb each
  const p0 = slab0 + slabL + NB.steel, plates = [1, -1].map((sg) => slabAt(NB.s * 12 + p0, sg)), plateL = Math.ceil(BALLAST.plate / LEAD / area2(plates[0]) * 100) / 100;
  return { bh, steps, Vb, blockFwd, slab0, slabL, slabs, p0, plateL, plates, fwdFace, aftFace, perim: perim(bh), A: area2(bh) };
})();
// ------------------------------------------------------------------------------------------- holes
const boltHoles = () => NB.bolt.pts.map(([u, v]) => ({ id: 'bolt', kind: 'bolt', u, v, r: r4((NB.bolt.an / 16 + 0.006) / 2), what: `ballast bolt AN${NB.bolt.an}` }));
const pinHoles = () => [1, -1].map((sg) => ({ id: 'pin', kind: 'pin', u: sg * 2.9, v: 35.3, r: r4(NB.pin.d / 2 + 0.003), what: 'ball-lock pin Ø 1/4' }));
/** lines through a slab of the ballast, as one hole per line, cut only in the named layers */
const through = (w0, w1, layers, polys) => crossingsThrough(P, w0, w1).filter((c) => polys.some((q) => pip([c.u, c.v], q)) || polys.some((q) => q.some((p) => Math.hypot(p[0] - c.u, p[1] - c.v) < c.r))).map((c) => ({ ...c, id: 'pass', only: layers }));
// ------------------------------------------------------------------------------------------- the bulkhead LEZ-08-105
export const nbRegs = () => ({ hp: [1, -1].map((sg) => { const [a, b] = NB.slabU; return sg > 0 ? [a - 0.5, b + 0.5, NB.floor - 0.5, 99] : [-b - 0.5, -a + 0.5, NB.floor - 0.5, 99]; }) });
export function nbLayers() { const c = NB.coreIn / 2, tf = NB.faceBID * tB;
  return [{ name: 'core', mat: 'PVC', w0: -c, w1: c, ol: 'out', cut: 'hp', feat: 'face' }, { name: 'hpk', mat: 'BID', w0: -c, w1: c, ol: 'out', reg: 'hp', feat: 'hp' }, { name: 'faceF', mat: 'BID', w0: -c - tf, w1: -c, ol: 'out', feat: 'face' }, { name: 'faceA', mat: 'BID', w0: c, w1: c + tf, ol: 'out', feat: 'face' }]; }
const lazyArr = (f) => { const o = lazyGeo(() => ({ a: f() })); return new Proxy([], { get: (_, k) => { const a = o.a, v = a[k]; return typeof v === 'function' ? v.bind(a) : v; }, has: (_, k) => k in o.a, ownKeys: () => Reflect.ownKeys(o.a), getOwnPropertyDescriptor: (_, k) => { const d = Object.getOwnPropertyDescriptor(o.a, k); return d && { ...d, configurable: true }; } }); };
export const NBH = lazyArr(() => { const raw = crossingsSlab(P, ...slabOf(nbLayers()), [NBG.bh]); /* rev: from each line's footprint through the whole thickness */ return [...boltHoles(), ...mergeHoles(raw).map((h) => ({ ...h, id: 'pass' }))]; });
export const nbParams = () => flatParams({ P, polys: { out: [NBG.bh] }, holes: NBH, layers: nbLayers(), regs: nbRegs(), cuts: nbRegs() });
export const nbTape = () => { const a = NBG.perim * 2 * NB.tape.lap * 2; return { area: a, lb: plyWeight('BID', a / 144, NB.tape.n) }; };
export const nbMassOf = (v) => nbLayers().reduce((a, l) => a + (v[l.name] ?? 0) * RHO[l.mat], 0) + nbTape().lb;
// ------------------------------------------------------------------------------------------- the fixed ballast LEZ-08-100
/** a lead piece from w0 to w1 split into layers ≤ ½ in thick, so lines through it get short straight holes */
const split = (name, w0, w1, ol, feat) => { const k = Math.max(1, Math.ceil((w1 - w0) / 0.5 - 1e-9)); return Array.from({ length: k }, (_, i) => ({ name: k > 1 ? `${name}${i}` : name, mat: 'LEAD', w0: r4(w0 + (w1 - w0) * i / k), w1: r4(w0 + (w1 - w0) * (i + 1) / k), ol, feat })); };
export function fbLayers() {
  const out = NBG.steps.map((s) => ({ name: `lead${s.k}`, mat: 'LEAD', w0: s.w0, w1: s.w1, ol: `s${s.k}`, feat: 'block' }));
  const bf = NBG.blockFwd;
  out.push({ name: 'plateF', mat: 'STEEL', w0: bf - NB.steel, w1: bf, ol: `s${NBG.steps.length - 1}`, feat: 'plate' });
  out.push(...split('slab', NBG.slab0, NBG.slab0 + NBG.slabL, 'slab', 'slab'), { name: 'plateA', mat: 'STEEL', w0: NBG.slab0 + NBG.slabL, w1: NBG.slab0 + NBG.slabL + NB.steel, ol: 'slab', feat: 'plate' });
  return out;
}
const fbHoles = () => {
  const L = fbLayers(), poly = (l) => (l.ol === 'slab' ? NBG.slabs : [NBG.steps[+l.ol.slice(1)].poly]);
  return [...boltHoles(), ...pinHoles().map((h) => ({ ...h, only: ['plateA'] })), ...L.flatMap((l) => through(l.w0, l.w1, [l.name], poly(l)))];
};
export const fbParams = () => flatParams({ P, polys: { ...Object.fromEntries(NBG.steps.map((s) => [`s${s.k}`, [s.poly]])), slab: NBG.slabs }, holes: fbHoles(), layers: fbLayers() });
export const FB_RHO = { LEAD, STEEL: 0.283 };   // 4130 ω 0.283 lb/in³ (MIL-HDBK-5J table 2.3.1.0(c1), accessed 2026-11-19)
export const fbMassOf = (v) => fbLayers().reduce((a, l) => a + (v[l.name] ?? 0) * FB_RHO[l.mat], 0);
// ------------------------------------------------------------------------------------------- the removable plates LEZ-08-110 (both drawn; qty 2)
export const rpLayers = () => split('plates', NBG.p0, NBG.p0 + NBG.plateL, 'plate', 'plate');
const rpHoles = () => [...pinHoles(), ...rpLayers().flatMap((l) => through(l.w0, l.w1, [l.name], NBG.plates))];
export const rpParams = () => flatParams({ P, polys: { plate: NBG.plates }, holes: rpHoles(), layers: rpLayers() });
export const rpMassOf = (v) => rpLayers().reduce((a, l) => a + (v[l.name] ?? 0), 0) * LEAD / BALLAST.plates;   // each
// lengths of the slabs and plates set so the lead, net of every hole, weighs what the loading sweep asks (to 0.1 %)
for (let i = 0; i < 12; i++) {
  const mF = fbMassOf(flatVolumes(fbParams())), mP = rpMassOf(flatVolumes(rpParams()));
  NBG.slabL = Math.ceil((NBG.slabL + (BALLAST.fixed - mF) / LEAD / (area2(NBG.slabs[0]) + area2(NBG.slabs[1])) * 1.02) * 1000) / 1000;
  NBG.p0 = NBG.slab0 + NBG.slabL + NB.steel; NBG.plateL = Math.ceil((NBG.plateL + (BALLAST.plate - mP) / LEAD / area2(NBG.plates[0]) * 1.02) * 1000) / 1000;
}
// ------------------------------------------------------------------------------------------- centroids (W&B arms, ft)
const cgOf = (p, rho) => { const V = flatVolumes(p); let m = 0, ms = 0; for (const l of p.layers) { const mm = (V[l.name] ?? 0) * rho[l.mat]; m += mm; ms += mm * (NB.s * 12 + (l.w0 + l.w1) / 2); } return { m, s: ms / m / 12 }; };
export const FB_CG = cgOf(fbParams(), FB_RHO), RP_CG = cgOf(rpParams(), { LEAD });
BALLAST.s = FB_CG.s; BALLAST.sPlate = RP_CG.s;

// ------------------------------------------------------------------------------------------- checks (emergency landing, ultimate)
registerChecks('wpA5-ballast', (d, lc, Z, M) => {
  if (lc.type !== 'emergency') return [];
  const out = [], AN5 = { s: 5750, t: 6500 }, mFix = BALLAST.fixed, mBlock = NBG.Vb * LEAD, mAll = mFix + BALLAST.plate * BALLAST.plates;
  const src = 'FAR 23.561(b)(3) items of mass (typed from memory; verify against eCFR)';
  { // bolts: the forward block's forward load in tension, all four; side and up loads in shear; front plate between the bolts
    const T = mBlock * NB.nF / 4, V = mAll * Math.hypot(NB.nS, NB.nU) / 4, inter = Math.hypot(T / AN5.t, V / AN5.s), msB = 1 / inter - 1;
    const span = 5.2, p = mBlock * NB.nF / (area2(NBG.steps.at(-1).poly)), Mp = p * span * span / 8, sig = 6 * Mp / (NB.steel * NB.steel), msP = 75000 / sig - 1;
    out.push(Object.assign(mk('fuselage', 'ballast-bolt', `Fixed ballast: ${4} × AN${NB.bolt.an} through-bolts and the forward 4130 plate`, lc, 'nose ballast, FS 3–9', msB < msP ? 'bolt tension + shear' : 'front plate bending', Math.min(msB, msP), {
      formula: 'T = m_block·n_fwd/4;  V = m_all·√(n_side² + n_up²)/4;  (T/T_a)² + (V/V_a)² ≤ 1;  front plate a 1 in strip spanning the bolt pitch: σ = 6·(p·L²/8)/t²',
      inputs: [IN_('Forward block lead', mBlock, 'lb', 'GEOMETRY (cast to the nose contour)'), IN_('Fixed + removable ballast', mAll, 'lb', 'DESIGN (wp5 loading sweep)'), IN_('Forward / side / up factors', `${NB.nF} / ${NB.nS} / ${NB.nU}`, 'g', src),
        IN_(`AN${NB.bolt.an} shear / tension`, `${AN5.s} / ${AN5.t}`, 'lb', 'AN standard'), IN_('Front plate', `4130 ${NB.steel} in, bolt pitch ${span} in`, 'text', 'DESIGN'), IN_('4130 N F_ty', 75000, 'psi', 'MIL-HDBK-5, 4130 N sheet (AMS 6350)')],
      result: [['T per bolt (ult.)', T, 'lb'], ['V per bolt (ult.)', V, 'lb'], ['σ plate', sig, 'psi']] }), { sys: 'LEZ-08-100' }));
  }
  { // the bulkhead: all the ballast bears on its aft face through the slabs; solid hard points as a strip between the sides; tapes
    const F = mAll * NB.nF, hw = Math.max(...NBG.bh.filter((q) => Math.abs(q[1] - 35) < 0.6).map((q) => q[0])), a = hw - (NB.slabU[0] + NB.slabU[1]) / 2, h = 4.0, t = NB.t;
    const Mb = F / 2 * a, sig = 6 * Mb / (h * t * t), rf = plyRF(Array.from({ length: Math.round(t / tB) }, () => ({ mat: 'BID', angle: 0 })), [sig * t, 0, 0], M), msH = rf.rf - 1;
    const q = F / NBG.perim, tau = q / (2 * NB.tape.lap), msT = psi(M.GUD.ILSS) / tau - 1, ms = Math.min(msH, msT);
    out.push(Object.assign(mk('fuselage', 'ballast-bhd', 'Nose ballast bulkhead: solid hard points between the sides, tapes to the shell', lc, `FS ${(NB.s * 12).toFixed(2)}`, msH < msT ? `hard point bending (${rf.mode})` : 'tape lap shear', ms, {
      formula: 'each slab puts F/2 on the bulkhead: hard point as a cantilever strip to the side wall, M = (F/2)·a, σ = 6M/(h·t²);  tapes q = F/perimeter, τ = q/(2·lap)',
      inputs: [IN_('Ballast, all', mAll, 'lb', 'DESIGN (wp5 loading sweep)'), IN_('Forward factor', NB.nF, 'g', src), IN_('Slab centre to the side wall a', a, 'in', 'GEOMETRY'), IN_('Strip depth h', h, 'in', 'DESIGN'),
        IN_('Hard point t (solid 6781)', t, 'in', 'DESIGN'), IN_('Bonded perimeter', NBG.perim, 'in', 'GEOMETRY'), IN_('Ply strengths', '6781 0/90 (MTM45-1) typical', 'text', allowB(msH)), IN_('Bond allowable', psi(M.GUD.ILSS), 'psi', allowB(msT, 'interlaminar shear strength'))],
      result: [['F (ult.)', F, 'lb'], ['σ hard point', sig, 'psi'], ['τ tapes', tau, 'psi']] }), { sys: 'LEZ-08-105' }));
  }
  { const V = BALLAST.plate * Math.hypot(NB.nU, NB.nS) / 2, ms = NB.pin.rate / V - 1;
    out.push(Object.assign(mk('fuselage', 'ballast-pin', 'Removable plates: ball-lock pins at the up and side factors (forward load bears on the slab plate)', lc, 'each plate, 2 pins', 'pin single shear', ms, {
      formula: 'V = m·√(n_up² + n_side²)/2 per pin;  the forward load bears on the aft plate', inputs: [IN_('Plate', BALLAST.plate, 'lb', 'DESIGN (wp5)'), IN_('Up / side factors', `${NB.nU} / ${NB.nS}`, 'g', src),
        IN_('Ball-lock pin Ø 1/4 single-shear rating', NB.pin.rate, 'lb', `BOUND: typical 1/4 in 17-4 PH ball-lock pin rating typed from memory; MS stays ≥ 0 down to ${V.toFixed(0)} lb`)], result: [['V per pin (ult.)', V, 'lb']] }), { sys: 'LEZ-08-110' }));
  }
  return out;
});

const S1 = (title, inspect) => ({ title, inspect });
defineParts([{ pn: 'LEZ-08-105', name: 'Nose ballast bulkhead (host for the fixed ballast)', kind: 'laminate', ata: 8, nha: 'LEZ-53-150', massItem: 'fus', material: 'HT61 sandwich, 6781 faces, solid hard points',
  massEach: +nbMassOf(flatVolumes(nbParams())).toFixed(3), cg: [NB.s, 0, 33.5 / 12], geo: [{ t: 'box', c: [NB.s, 0, 33.5 / 12], d: [NB.t / 12, 0.3, 0.2], draw: false }],
  blurb: 'Small HT61 sandwich bulkhead just ahead of the nose-gear box; the fixed ballast clamps through it and every ballast piece bears on it in a forward crash.',
  steps: [S1('Glass flat with the solid hard points; cut to the template; drill the bolt pattern', ['Outline within ±1/32 in']), S1('Install at FS 6.87; flox fillets; tape both faces', ['Square to the centre line'])], src: { mass: 'GEOMETRY: the definition solid (LEZ-08-105)' } }]);
void r4; void clipRect;
// the mass above was taken from the provisional geometry; refresh it once every parts module has loaded
LOAD.after.push(() => { const q = partByPN('LEZ-08-105'); if (q) q.massEach = +nbMassOf(flatVolumes(nbParams())).toFixed(3); });

/** final integration (LEZ-31-100 rev C fix): the slab check, every line through the full thickness clear of the laminate in its hole */
export const nbSlab = () => flatSlab(nbParams());
registerChecks('nb-slab', (d, lc) => (lc.id !== 'W1-S1' ? [] : [slabRow(mk, lc, 'ballast-slab', 'Ballast bulkhead: every line through the thickness clear of the laminate in its hole or notch', 'LEZ-08-105', nbSlab(), { slab: 'the full-outline layers (faces and core)', clr: 'lines 1/8 in, rods 1/16 in all round; bolts and pins in their fit holes' })]));
