// systems.js — aircraft systems framework (WP0).
// Part definitions are DATA: one record per part, whatever it is made of. Generators turn a record's
// primitives into mass, CG, 3D geometry and shop output; integration loops tie every part back to the
// structure (interfaces → hard-point plies + strength checks), to weight & balance (mass roll-up), to the
// rest of the systems (routing, clash and separation checks) and to the requirements (verification matrix).
// Units: positions in ft in the airframe frame (s aft of the nose, y right, z up); diameters, wall
// thicknesses and fastener sizes in inches; masses in lb. Every number carries a source tag.
import { GEO, FIXED, FT, psi, fusAt, fusOutline, FUS_SHAPE, wingSec, strakeSec, massItems, MASS_ITEMS, setMassModel, registerChecks, mk } from './structures.js';
import { FRAMES, afAt, PN_BASE, registerBookExtras } from './plybook.js';

// ------------------------------------------------------------------------------------------- numbering
export const ATA = {
  8: 'Weighing & ballast', 20: 'Standard practices (wiring and line supports)', 21: 'Air conditioning', 23: 'Communications', 24: 'Electrical power', 25: 'Equipment / furnishings', 27: 'Flight controls',
  28: 'Fuel', 31: 'Indicating', 32: 'Landing gear', 33: 'Lights', 34: 'Navigation', 51: 'Standard practices (structures: lightning protection, galvanic isolation)', 52: 'Doors', 53: 'Fuselage', 56: 'Windows (canopy)',
  55: 'Stabilisers (canard, elevators, rudders)', 57: 'Wings', 61: 'Propeller', 71: 'Powerplant', 72: 'Engine',
  73: 'Engine fuel & control', 74: 'Ignition', 76: 'Engine controls', 77: 'Engine indicating', 78: 'Exhaust', 79: 'Oil', 80: 'Starting',
};
/** structural books (ply-book parts) keep their numbers as aliases under these chapters */
export const STRUCT_ATA = { wing: 57, aileron: 57, strake: 57, csSpar: 57, canard: 55, elevator: 55, winglet: 57, rudder: 55, fuselage: 53, F22: 53, cowl: 71, gear: 32 };
export const structPN = (id) => `LEZ-${STRUCT_ATA[id]}-${PN_BASE[id]}`;

// densities, lb/in³ (typical handbook values, ASSUMED)
export const DENSITY = { '4130': 0.284, steel: 0.284, stainless: 0.289, '6061': 0.098, '2024': 0.100, aluminium: 0.098, copper: 0.323, brass: 0.307,
  glass: 0.065, acrylic: 0.043, nylon: 0.041, rubber: 0.040, foam: 0.0017, wood: 0.022, fuel: 6.0 / 231, oil: 7.5 / 231, air: 0 };

// ------------------------------------------------------------------------------------------- registry
export const PARTS = [];      // system part records (data)
export const GRAPHS = {};     // schematics: { id: { title, nodes, edges } }
export const KEEPOUTS = [];   // volumes routes must stay out of
export const PASS = [];       // declared pass-throughs (firewall, bulkheads, strake ribs)
export const REQS = [];       // requirements (verification matrix)
export const ADOPTED = new Set(); // estimate mass items now taken over by defined parts
/** set when site/parts/index.js has evaluated every parts module: geometry that reads other parts' routes (block A's
 *  flat parts) is built lazily and rebuilt once after this; LOAD.after runs then (e.g. to refresh masses) */
export const LOAD = { done: false, after: [] };
export const markLoaded = () => { LOAD.done = true; for (const f of LOAD.after) f(); };
const KINDS = ['laminate', 'machined', 'weldment', 'mechanism', 'cable', 'line', 'harness', 'cots', 'install'];

/** add or replace parts by part number; fills defaults and validates the record */
export function defineParts(list) {
  for (const raw of list) {
    const p = { qty: 1, geo: [], interfaces: [], steps: [], notes: [], src: {}, ...raw };
    if (!p.pn || !p.name) throw new Error(`part without pn/name: ${JSON.stringify(raw).slice(0, 80)}`);
    if (!KINDS.includes(p.kind)) throw new Error(`${p.pn}: unknown kind ${p.kind}`);
    p.ata = p.ata ?? Number(p.pn.split('-')[1]);
    const i = PARTS.findIndex((q) => q.pn === p.pn);
    if (i >= 0) PARTS[i] = p; else PARTS.push(p);
  }
}
export const defineGraph = (id, g) => { GRAPHS[id] = g; };
export const defineKeepouts = (list) => { for (const k of list) { const i = KEEPOUTS.findIndex((q) => q.id === k.id); if (i >= 0) KEEPOUTS[i] = k; else KEEPOUTS.push(k); } };
export const definePass = (list) => { for (const k of list) { const i = PASS.findIndex((q) => q.id === k.id); if (i >= 0) PASS[i] = k; else PASS.push(k); } };
export const defineReqs = (list) => { for (const r of list) { const i = REQS.findIndex((q) => q.id === r.id); if (i >= 0) REQS[i] = { ...REQS[i], ...r }; else REQS.push(r); } };
export const adoptMass = (ids) => ids.forEach((i) => ADOPTED.add(i));
export const partByPN = (pn) => PARTS.find((p) => p.pn === pn);

// ------------------------------------------------------------------------------------------- vectors
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const len = (a) => Math.hypot(a[0], a[1], a[2]);
export const V3 = { add, sub, mul, dot, len };
/** minimum bend radius for a route, inches (AC 43.13-1B practice, ASSUMED design rules):
 *  wire bundles 10 × OD, coax and shielded ignition leads 6 × OD (≥ 1 in), rigid aluminium tube 3 × OD, hose 5 × OD, nylon pitot-static tube 1 in.
 *  Push-pull cables, control cables, push-rods and exhaust are formed parts and are not filleted. */
export function bendRule(g) {
  const d = g.dIn || 0.25;
  switch (g.cls) {
    case 'power': case 'signal': return Math.max(10 * d, 1.0);
    case 'ign': return Math.max(6 * d, 1.0);   // shielded ignition leads
    case 'rf': return Math.max(6 * d, 1.0);
    case 'pitot': return 1.0;
    case 'fuel': case 'oil': case 'brake': case 'air': return g.wallIn ? 3 * d : 5 * d;
    default: return 0;
  }
}
/** fillet a polyline: each interior corner becomes an arc of radius R (ft), reduced where the legs are too short.
 *  Returns the smooth points and, per corner, the achieved / required radius (terminations are corners 1 and n−2). */
export function filletPts(pts, R, seg = 12) {
  if (!R || pts.length < 3) return { pts: pts.slice(), ratios: [] };
  const out = [pts[0]], ratios = [], L = []; for (let i = 1; i < pts.length; i++) L.push(len(sub(pts[i], pts[i - 1])));
  for (let i = 1; i < pts.length - 1; i++) {
    const a = norm(sub(pts[i - 1], pts[i])), b = norm(sub(pts[i + 1], pts[i])), c = Math.min(1, Math.max(-1, dot(a, b))), th = Math.acos(c);   // interior angle
    const defl = Math.PI - th; if (defl < 1e-3) { out.push(pts[i]); continue; }
    const tWant = R / Math.tan(th / 2), tMax = Math.min(L[i - 1], L[i]) * 0.5, t = Math.min(tWant, tMax), r = t * Math.tan(th / 2);
    ratios.push({ i, ratio: r / R, at: pts[i] });
    const p0 = add(pts[i], mul(a, t)), p1 = add(pts[i], mul(b, t)), bis = norm(add(a, b)), ctr = add(pts[i], mul(bis, r / Math.sin(th / 2)));
    const n = Math.max(2, Math.ceil(defl / (Math.PI / seg)));
    const u0 = sub(p0, ctr), u1 = sub(p1, ctr);
    for (let k = 0; k <= n; k++) { const f = k / n, w = Math.sin(defl) > 1e-6 ? [Math.sin((1 - f) * defl) / Math.sin(defl), Math.sin(f * defl) / Math.sin(defl)] : [1 - f, f]; out.push(add(ctr, add(mul(u0, w[0]), mul(u1, w[1])))); }
  }
  out.push(pts.at(-1));
  return { pts: out, ratios };
}
export function pathLength(pts) { let L = 0; for (let i = 1; i < pts.length; i++) L += len(sub(pts[i], pts[i - 1])); return L; }

// ------------------------------------------------------------------------------------------- primitives → mass
// box {c, d:[ds,dy,dz] ft} · cyl {a, b, r ft, wall? in} · frame {nodes:{id:[..]}, members:[[a,b,odIn,wallIn]]}
// path {pts, dIn, wallIn?, massPerFt?} · each may carry mat; mass overrides allowed on the part (massEach)
export function primMass(p, mat) {
  const rho = DENSITY[p.mat || mat] ?? 0;
  if (p.t === 'box' || p.t === 'obox') { const v = p.d[0] * p.d[1] * p.d[2] * 1728 * (p.fill ?? 1); return { m: rho * v, c: p.c, v }; }
  if (p.t === 'cyl') {
    const L = len(sub(p.b, p.a)) * 12, ro = p.r * 12, ri = p.wall ? Math.max(0, ro - p.wall) : 0, v = Math.PI * (ro * ro - ri * ri) * L;
    return { m: rho * v, c: mul(add(p.a, p.b), 0.5), v };
  }
  if (p.t === 'frame') {
    let m = 0, mc = [0, 0, 0], vv = 0;
    for (const [a, b, od, w] of p.members) {
      const A = p.nodes[a], B = p.nodes[b], L = len(sub(B, A)) * 12, v = Math.PI * ((od / 2) ** 2 - (od / 2 - w) ** 2) * L, mm = rho * v;
      m += mm; vv += v; mc = add(mc, mul(add(A, B), 0.5 * mm));
    }
    return { m, c: m ? mul(mc, 1 / m) : p.nodes[Object.keys(p.nodes)[0]], v: vv };
  }
  if (p.t === 'path') {
    const Lft = pathLength(p.pts), L = Lft * 12;
    let m;
    if (p.massPerFt != null) m = p.massPerFt * Lft;
    else { const ro = p.dIn / 2, ri = p.wallIn ? ro - p.wallIn : 0; m = rho * Math.PI * (ro * ro - ri * ri) * L; }
    let mc = [0, 0, 0];
    for (let i = 1; i < p.pts.length; i++) { const sl = len(sub(p.pts[i], p.pts[i - 1])); mc = add(mc, mul(add(p.pts[i], p.pts[i - 1]), 0.5 * sl)); }
    return { m, c: Lft ? mul(mc, 1 / Lft) : p.pts[0], v: Math.PI * (p.dIn / 2) ** 2 * L, L: Lft };
  }
  return { m: 0, c: [0, 0, 0], v: 0 };
}
/** total mass (all instances described by the geometry) and CG of a system part */
export function partMass(p) {
  const pm = p.geo.map((g) => primMass(g, p.material));
  const vol = pm.reduce((a, q) => a + q.v, 0), mGeo = pm.reduce((a, q) => a + q.m, 0);
  const wc = (w) => { const tot = pm.reduce((a, q) => a + w(q), 0); return tot ? mul(pm.reduce((a, q) => add(a, mul(q.c, w(q))), [0, 0, 0]), 1 / tot) : null; };
  if (p.massEach != null) {
    const m = p.massEach * p.qty, c = p.cg || wc((q) => q.v) || [0, 0, 0];
    return { m, c, from: p.src.mass || 'ASSUMED' };
  }
  return { m: mGeo + (p.extraMass || 0), c: p.cg || wc((q) => q.m) || [0, 0, 0], from: 'GEOMETRY' };
}

// ------------------------------------------------------------------------------------------- structure mass/CG
export const FINISH = 0.15; // paint, filler, micro, fairing and hardware allowance on laminate parts (ASSUMED)
const lerp = (a, b, t) => a + (b - a) * t;
/** weight (with the finish allowance) and CG of a ply-book part, all instances per aircraft */
export function bookMass(b) {
  const lam = b.plies.reduce((a, p) => a + p.weight * (p.qty || 1), 0), core = b.core ? b.core.weight : 0;
  const m = (lam + core) * b.count * (1 + FINISH);
  return { m, c: bookCG(b), lam: lam * b.count, core: core * b.count };
}
export function bookCG(b) {
  const g = GEO;
  if (b.frame && FRAMES[b.frame]) {
    const F = FRAMES[b.frame], [a, c] = F.span; let w = 0, acc = [0, 0, 0];
    for (let i = 0; i < 24; i++) {
      const y = lerp(a, c, (i + 0.5) / 24), ch = F.sec(Math.abs(y)).c, q = F.pt(y, 0.42, 0);
      acc = add(acc, mul([q[0], b.count > 1 ? 0 : q[1], q[2]], ch)); w += ch;
    }
    return mul(acc, 1 / w);
  }
  if (b.panels) {
    let w = 0, acc = [0, 0, 0];
    for (const pk of Object.keys(b.panels)) {
      const P0 = b.panels[pk], [sa, sb] = P0.srange, qty = P0.qty || 1;
      for (let i = 0; i < 12; i++) {
        const s = lerp(sa, sb, (i + 0.5) / 12), f = fusAt(s), area = (sb - sa) / 12 * (pk === 'side' ? 0.6 : 1) * f.w;
        const z = pk === 'belly' || pk === 'lower' ? f.bot + 0.1 : pk === 'side' ? (f.top + f.bot) / 2 - 0.2 : pk === 'nose' ? (f.top + f.bot) / 2 : f.top - 0.1;
        acc = add(acc, mul([s, 0, z], area * qty)); w += area * qty;
      }
    }
    return mul(acc, 1 / w);
  }
  if (b.id === 'csSpar') return [g.csSpar.s, 0, g.csSpar.z];
  if (b.id === 'F22') { const f = fusAt(g.F22); return [g.F22, 0, (f.top + f.bot) / 2]; }
  if (b.id === 'gear') return [g.gear.s, 0, (g.gear.rootZ + g.gear.axleZ + 0.32) / 2];
  return [0, 0, 0];
}

// ------------------------------------------------------------------------------------------- mass roll-up
/** which defined parts take over each estimate item (structure by book id, systems by their massItem) */
export const MASS_MAP = {
  wings: ['wing', 'winglet', 'aileron', 'rudder'], canard: ['canard', 'elevator'],
  fus: ['fuselage', 'strake', 'csSpar', 'F22', 'cowl'], gear: ['gear'], engine: [], nose: [], panel: [],
};
/** estimate list vs parts: per item the defined weight/CG, coverage, and whether the item is adopted */
export function massRollup(books) {
  const rows = [];
  const sysBy = (id) => PARTS.filter((p) => p.massItem === id);
  for (const [id, name, w, s] of MASS_ITEMS) {
    const bks = (MASS_MAP[id] || []).filter((k) => books[k]).map((k) => ({ ref: structPN(k), name: books[k].name, ...bookMass(books[k]) }));
    const sys = sysBy(id).map((p) => ({ ref: p.pn, name: p.name, ...partMass(p) }));
    const all = [...bks, ...sys], m = all.reduce((a, q) => a + q.m, 0);
    const c = m ? mul(all.reduce((a, q) => add(a, mul(q.c, q.m)), [0, 0, 0]), 1 / m) : null;
    const payload = ['pilot', 'pax', 'fuel', 'bag', 'nosebag'].includes(id);
    rows.push({ id, name, est: { w, s }, defined: all.length ? { w: m, s: c[0], y: c[1], z: c[2], parts: all } : null, adopted: ADOPTED.has(id) && all.length > 0, payload });
  }
  const loose = PARTS.filter((p) => !p.massItem || !MASS_ITEMS.some(([id]) => id === p.massItem));
  return { rows, unassigned: loose.map((p) => p.pn) };
}
/** push the adopted items into the engine's weight cases (returns the mass list used) */
export function applyMassModel(books) {
  const R0 = massRollup(books), items = R0.rows.map((r) => (r.adopted ? [r.id, `${r.name} (defined)`, r.defined.w, r.defined.s] : [r.id, r.name, r.est.w, r.est.s]));
  setMassModel(ADOPTED.size ? items : null);
  return { items, rollup: R0 };
}

// ------------------------------------------------------------------------------------------- interfaces
// iface = { id, part: pn, host: book id, at:[s,y,z], n, d (in), kind:'bolt'|'insert', embed (in), tHost (in),
//           plies: host doubler {panel?, side, srange|span, zrange|chord, n, step}, load:(d, lc) => {F:[Fs,Fy,Fz] lb limit} }
export const IFACE = () => PARTS.flatMap((p) => p.interfaces.map((i) => ({ ...i, part: p.pn })));
registerChecks('interfaces', (d, lc, Z, M) => {
  const out = [];
  for (const f of IFACE()) {
    const L = f.load ? f.load(d, lc) : null;
    if (!L) continue;
    const Rm = len(L.F) * (L.ult ? (d.KD ?? 1) : d.FS), n = f.n || 1;
    const tH = f.tHost ?? 0.1, brg = Rm / (n * f.d * tH), msB = psi(M.BID.Fbru) / brg - 1;
    let ms = msB, mode = 'laminate bearing', extra = [];
    if (f.kind === 'insert') {
      const Pa = psi(M.FLOX.shear) * Math.PI * (f.insertD || 1) * (f.embed || 0.5) * n, msI = Pa / Rm - 1;
      extra = [['Insert pull-out allowable', Pa, 'lb']];
      if (msI < ms) { ms = msI; mode = 'flox insert shear-out'; }
    }
    const r = mk(f.host, `if-${f.id}`, `${f.name || f.id} → ${f.host} hard-point`, lc, f.where || `FS ${(f.at[0] * 12).toFixed(0)}`, mode, ms, {
      formula: 'R = FS·|F|;  σ_br = R / (n·d·t_host)' + (f.kind === 'insert' ? ';  P_allow = τ_flox·π·D·L·n' : ''),
      inputs: [['Interface load |F| (limit)', len(L.F), 'lb', 'DERIVED'], ['Fasteners n', n, '', f.src || 'ASSUMED'], ['Fastener diameter d', f.d, 'in', f.src || 'ASSUMED'], ['Host laminate at the hard-point', tH, 'in', 'SIZED'], ['Load source', L.note || f.part, 'text', 'MODEL']],
      result: [['R (ult.)', Rm, 'lb'], ['σ bearing', brg, 'psi'], ...extra],
    });
    r.sys = f.part;
    out.push(r);
  }
  return out;
});
// hard-point plies requested by interfaces, added to the host part's ply book
registerBookExtras('interfaces', (books) => {
  let k = 0;
  for (const f of IFACE()) {
    if (!f.plies || !books[f.host]) continue;
    const b = books[f.host], P0 = f.plies, seq = b.plies.length + 1; k += 1;
    const ply = { seq, plies: P0.n, qty: P0.qty || 1, id: `${b.plies[0].id.split('-')[0]}-I${String(k).padStart(2, '0')}`, mat: 'BID', angle: 45, region: 'doubler', side: P0.side ?? 1, note: `Hard-point for ${f.name || f.id} (${f.part}, ${P0.n} plies)`, step: P0.step || b.steps.length, iface: f.id };
    if (P0.srange) { const L = (P0.srange[1] - P0.srange[0]) * 12, W = (P0.zrange[1] - P0.zrange[0]) * 12; Object.assign(ply, { panel: P0.panel || 'side', srange: P0.srange, zrange: P0.zrange, area: L * W / 144, flat: { kind: 'strip', L, w0: W, w1: W } }); }
    else { const L = (P0.span[1] - P0.span[0]) * 12, c = (FRAMES[b.frame] ? FRAMES[b.frame].sec(Math.abs(P0.span[0])).c : 1) * (P0.chord[1] - P0.chord[0]) * 12; Object.assign(ply, { span: P0.span, chord: P0.chord, area: L * c / 144, flat: { kind: 'strip', L, w0: c, w1: c } }); }
    b.plies.push(ply);
  }
});

// ------------------------------------------------------------------------------------------- zones & routing
const WALL = 0.045; // ft: sandwich wall inside the mould line (3/8 in core + faces)
export function insideFus(s, y, z, inset = WALL) {
  const f = fusAt(s), w = f.w / 2 - inset, zc = (f.top + f.bot) / 2, h = (f.top - f.bot) / 2 - inset;
  if (w <= 0 || h <= 0) return false;
  const c = Math.abs(y) / w, sn = Math.abs(z - zc) / h;
  if (c > 1 || sn > 1) return false;
  const cc = c ** (1 / FUS_SHAPE.side), ss = sn ** (1 / (z < zc ? FUS_SHAPE.belly : FUS_SHAPE.top));
  return cc * cc + ss * ss <= 1;
}
function insideFrame(F, s, y, z, inset = 0.02) {
  const ay = Math.abs(y), [a, b] = F.span;
  if (ay < Math.min(a, b) || ay > Math.max(a, b)) return false;
  const sec = F.sec(ay), x = (s - sec.le) / sec.c;
  const [xa, xb] = F.xr || [0.02, 0.98];   // closed faces (strake aft wall, wing-root jut-out front) count to the face
  if (x < xa || x > xb) return false;
  const af = afAt(F, ay, x), mid = F.pt(ay, x, 0)[2], o = (z - mid) / sec.c;
  return o < af.yu - inset / sec.c && o > af.yl + inset / sec.c;
}
/** inside the outer mould line (no inset): fuselage incl. the engine bay to the cowl end, strakes, wings, canard */
export function insideOML(p) {
  const [s, y, z] = p;
  if (s >= 0 && s <= GEO.cowl.s1 && insideFus(s, y, z, 0)) return true;
  for (const q of PARTS) if (q.oml) for (const g of q.geo) if (g.t === 'box' && Math.abs(s - g.c[0]) <= g.d[0] / 2 && Math.abs(y - g.c[1]) <= g.d[1] / 2 && Math.abs(z - g.c[2]) <= g.d[2] / 2) return true; // blisters
  return insideFrame(FRAMES.strake, s, y, z, 0) || insideFrame(FRAMES.wing, s, y, z, 0) || insideFrame(FRAMES.wingRoot, s, y, z, 0) || insideFrame(FRAMES.canard, s, y, z, 0);
}
/** the heights of a march from z0 upward in steps dz while below zEnd, by repeated addition (the exact values such a loop
 *  visits); the last entry is the first height ≥ zEnd */
export function marchHeights(z0, dz, zEnd) { const o = []; let z = z0; while (z < zEnd) { o.push(z); z += dz; } o.push(z); return o; }
// first index in [lo, hi) at which a predicate that is false then true (monotone) holds; hi if none
const firstTrue = (lo, hi, P) => { while (lo < hi) { const m = (lo + hi) >> 1; if (P(m)) hi = m; else lo = m + 1; } return lo; };
/** first index of the increasing heights zs at which |zs[k] − c| ≤ half holds (a contiguous set): -1 if none */
function firstWithin(zs, c, P) {
  const n = zs.length, split = firstTrue(0, n, (k) => zs[k] >= c), k = firstTrue(0, split, P);
  if (k < split) return k;
  return split < n && P(split) ? split : -1;
}
/** the first index k of the increasing heights zs (ft) at which insideOML([s, y, zs[k]]) holds, or -1. The same answer as
 *  testing each height in turn: insideOML is a union, so this is the earliest of each member's first height, and each
 *  member is tested with its own arithmetic, only where it can hold (perf: the nose-gear skin and belly marches) */
export function firstInsideOML(s, y, zs) {
  const n = zs.length; let best = n;
  for (const q of PARTS) if (q.oml) for (const g of q.geo) if (g.t === 'box' && Math.abs(s - g.c[0]) <= g.d[0] / 2 && Math.abs(y - g.c[1]) <= g.d[1] / 2) {
    const k = firstWithin(zs, g.c[2], (i) => Math.abs(zs[i] - g.c[2]) <= g.d[2] / 2); if (k >= 0 && k < best) best = k; }
  for (const F of [FRAMES.strake, FRAMES.wing, FRAMES.wingRoot, FRAMES.canard]) {
    const ay = Math.abs(y), [a, b] = F.span; if (ay < Math.min(a, b) || ay > Math.max(a, b)) continue;
    const sec = F.sec(ay), x = (s - sec.le) / sec.c, [xa, xb] = F.xr || [0.02, 0.98]; if (x < xa || x > xb) continue;
    const af = afAt(F, ay, x), mid = F.pt(ay, x, 0)[2], U = af.yu - 0 / sec.c, L = af.yl + 0 / sec.c, o = (i) => (zs[i] - mid) / sec.c;
    if (sec.c > 0) { const k = firstTrue(0, n, (i) => o(i) > L); if (k < n && o(k) < U && k < best) best = k; }
    else for (let i = 0; i < best; i++) if (o(i) < U && o(i) > L) { best = i; break; }
  }
  if (s >= 0 && s <= GEO.cowl.s1) {
    const f = fusAt(s), zc = (f.top + f.bot) / 2, h = (f.top - f.bot) / 2;
    const k0 = h > 0 ? firstWithin(zs, zc, (i) => !(Math.abs(zs[i] - zc) / h > 1)) : -1;   // outside this range insideFus is false
    if (k0 >= 0) for (let i = k0; i < best && !(Math.abs(zs[i] - zc) / h > 1); i++) if (insideFus(s, y, zs[i], 0)) { best = i; break; }
  }
  return best < n ? best : -1;
}
const cross3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], norm = (v) => mul(v, 1 / (len(v) || 1));
/** sample points (box corners, cylinder rims, sphere poles) of every primitive that is meant to be inside the OML (part.external / primitive.external / path extSeg excluded) */
export function containment() {
  const out = [];
  for (const p of PARTS) {
    if (p.external || p.oml) continue;
    p.geo.forEach((g, gi) => {
      if (g.external) return;
      let pts = [];
      if (g.t === 'box' || g.t === 'obox') { const p_ = (g.pitch || 0) * Math.PI / 180, cs = Math.cos(p_), sn = Math.sin(p_); // obox: aft end lower for pitch > 0
        pts = [-1, 1].flatMap((i) => [-1, 1].flatMap((j) => [-1, 1].map((k) => { const ds = i * g.d[0] / 2, dz = k * g.d[2] / 2; return [g.c[0] + ds * cs + dz * sn, g.c[1] + j * g.d[1] / 2, g.c[2] - ds * sn + dz * cs]; }))); }
      else if (g.t === 'cyl') { const ax = sub(g.b, g.a), L = len(ax), u = mul(ax, 1 / (L || 1)), t0 = Math.abs(u[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0], e1 = norm(cross3(u, t0)), e2 = cross3(u, e1);
        pts = [g.a, g.b].flatMap((c) => [0, 1, 2, 3, 4, 5, 6, 7].map((k) => add(c, add(mul(e1, g.r * Math.cos(k * Math.PI / 4)), mul(e2, g.r * Math.sin(k * Math.PI / 4)))))); }
      else if (g.t === 'sphere') pts = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]].map((d) => add(g.c, mul(d, g.r)));
      else if (g.t === 'frame') pts = Object.values(g.nodes);
      else if (g.t === 'path') { const ext = new Set((g.extSeg || []).flat()); pts = g.pts.filter((q, k) => !(ext.has(k) || ext.has(k - 1))); }
      for (const q of pts) if (!insideOML(q)) out.push({ pn: p.pn, ata: p.ata, gi, t: g.t, at: q });
    });
  }
  return out;
}
/** named spaces a route may run in */
export const ZONES = {
  nose: (s, y, z) => s > 0.25 && s < GEO.F22 && insideFus(s, y, z),
  cabin: (s, y, z) => s >= GEO.F22 && s <= GEO.firewall && insideFus(s, y, z),
  bay: (s, y, z) => s > GEO.firewall && s < GEO.cowl.s1 && insideFus(s, y, z, 0.02),
  strake: (s, y, z) => insideFrame(FRAMES.strake, s, y, z),
  wing: (s, y, z) => insideFrame(FRAMES.wing, s, y, z) || insideFrame(FRAMES.wingRoot, s, y, z),
  canard: (s, y, z) => Math.abs(y) > 1.0 && insideFrame({ ...FRAMES.canard, span: [1.0, GEO.canard.semi] }, s, y, z, 0.01),
};
export function zoneOf(p) { for (const [k, f] of Object.entries(ZONES)) if (f(p[0], p[1], p[2])) return k; return null; }
/** separation rules between route classes, inches (ASSUMED design rules, in the spirit of AC 43.13-1B) */
export const SEP = { 'fuel|power': 2, 'fuel|signal': 1, 'fuel|cable': 0.25, 'fuel|brake': 0.25, 'fuel|pushrod': 0.25, 'oil|power': 2, 'fuel|rf': 1, 'power|rf': 2, 'brake|power': 1, 'fuel|exhaust': 6, 'power|exhaust': 6, 'ign|exhaust': 6, 'fuel|ign': 2, 'ign|rf': 2 };
/** fire-sleeved and heat-shielded runs (route.shield) may come within 1 in of the exhaust */
const SHIELDED_EXHAUST = 1;
const sepOf = (a, b) => SEP[`${a}|${b}`] ?? SEP[`${b}|${a}`] ?? 0;
function segDist(p1, q1, p2, q2) { // closest distance between two segments
  const d1 = sub(q1, p1), d2 = sub(q2, p2), r = sub(p1, p2), a = dot(d1, d1), e = dot(d2, d2), f = dot(d2, r);
  let s, t;
  if (a < 1e-12 && e < 1e-12) return len(r);
  if (a < 1e-12) { s = 0; t = Math.min(1, Math.max(0, f / e)); } else {
    const c = dot(d1, r);
    if (e < 1e-12) { t = 0; s = Math.min(1, Math.max(0, -c / a)); } else {
      const b = dot(d1, d2), den = a * e - b * b;
      s = den > 1e-12 ? Math.min(1, Math.max(0, (b * f - c * e) / den)) : 0;
      t = (b * s + f) / e;
      if (t < 0) { t = 0; s = Math.min(1, Math.max(0, -c / a)); } else if (t > 1) { t = 1; s = Math.min(1, Math.max(0, (b - c) / a)); }
    }
  }
  return len(sub(add(p1, mul(d1, s)), add(p2, mul(d2, t))));
}
const inKeep = (k, p) => {
  if (k.t === 'box') return Math.abs(p[0] - k.c[0]) <= k.d[0] / 2 && Math.abs(p[1] - k.c[1]) <= k.d[1] / 2 && Math.abs(p[2] - k.c[2]) <= k.d[2] / 2;
  if (k.t === 'cyl') { const ab = sub(k.b, k.a), t = dot(sub(p, k.a), ab) / dot(ab, ab); return t >= 0 && t <= 1 && len(sub(p, add(k.a, mul(ab, t)))) <= k.r; }
  if (k.t === 'sphere') return len(sub(p, k.c)) <= k.r;
  return false;
};
export const routes = () => PARTS.flatMap((p) => p.geo.filter((g) => g.t === 'path' && g.cls).map((g, i) => ({ part: p.pn, name: p.name, i, ...g, external: g.external || p.external })));
/** clash audit: each route sampled every 0.05 ft must sit in a zone (or be marked external), stay out of the
 *  keep-outs, cross the firewall only at a pass-through, and keep the class separations from other routes */
export function clashCheck() {
  const out = [], rts = routes();
  for (const r of rts) {
    for (let i = 1; i < r.pts.length; i++) {
      const A = r.pts[i - 1], B = r.pts[i], n = Math.max(1, Math.ceil(len(sub(B, A)) / 0.05));
      for (let k = 0; k <= n; k++) {
        const p = add(A, mul(sub(B, A), k / n));
        if (!r.external && !(r.extSeg || []).includes(i) && !zoneOf(p)) { out.push({ part: r.part, kind: 'zone', at: p, detail: `${r.name}: leaves the airframe's interior` }); k = n; i = r.pts.length; break; }
        for (const ko of KEEPOUTS) if ((!ko.applies || ko.applies(r.cls)) && ko.owner !== r.part && inKeep(ko, p)) out.push({ part: r.part, kind: 'keepout', at: p, detail: `${r.name}: inside keep-out "${ko.why}"` });
      }
      const fw = GEO.firewall;
      if ((A[0] - fw) * (B[0] - fw) < 0) {
        const t = (fw - A[0]) / (B[0] - A[0]), x = add(A, mul(sub(B, A), t));
        if (insideFus(x[0], x[1], x[2], -0.02) && !PASS.some((q) => Math.abs(q.at[0] - fw) < 0.05 && len(sub(q.at, x)) <= (q.r || 0.08))) out.push({ part: r.part, kind: 'firewall', at: x, detail: `${r.name}: crosses the firewall without a fire-sealed pass-through` });
      }
    }
  }
  for (let a = 0; a < rts.length; a++) for (let b = a + 1; b < rts.length; b++) {
    const A = rts[a], B = rts[b], need0 = sepOf(A.cls, B.cls), hot = A.cls === 'exhaust' || B.cls === 'exhaust', need = hot && (A.shield || B.shield) ? Math.min(need0, SHIELDED_EXHAUST) : need0;
    if (!need || A.part === B.part) continue;
    let dmin = Infinity, at = null;
    for (let i = 1; i < A.pts.length; i++) for (let j = 1; j < B.pts.length; j++) { const dd = segDist(A.pts[i - 1], A.pts[i], B.pts[j - 1], B.pts[j]); if (dd < dmin) { dmin = dd; at = A.pts[i]; } }
    const clear = dmin * 12 - (A.dIn + B.dIn) / 2;
    if (clear < need) out.push({ part: A.part, other: B.part, kind: 'separation', at, detail: `${A.name} ↔ ${B.name}: ${clear.toFixed(2)} in clear, rule ${need} in (${A.cls}/${B.cls})` });
  }
  return out;
}

// ------------------------------------------------------------------------------------------- BOM
/** indented BOM: aircraft → ATA chapter → assembly → parts (structure books + system parts) */
export function buildBOM(books) {
  const rows = [], items = [];
  for (const [id, b] of Object.entries(books)) { const mm = bookMass(b); items.push({ pn: structPN(id), alias: `LEZ-${PN_BASE[id]}`, name: b.name, ata: STRUCT_ATA[id], qty: b.count, kind: 'laminate', mEach: mm.m / b.count, nha: null, book: id }); }
  for (const p of PARTS) { const mm = partMass(p); items.push({ pn: p.pn, name: p.name, ata: p.ata, qty: p.qty, kind: p.kind, mEach: mm.m / p.qty, nha: p.nha || null, sys: true }); }
  rows.push({ level: 0, pn: 'LEZ-000', name: 'Long-EZ (notional, public data)', qty: 1, kind: 'aircraft', mEach: items.filter((i) => !i.nha).reduce((a, i) => a + i.mEach * i.qty, 0) });
  const kids = (pn) => items.filter((i) => i.nha === pn).sort((a, b) => a.pn.localeCompare(b.pn));
  const hw = (it) => { const p = it.sys && partByPN(it.pn); return p ? hardwareOf(p).map((h) => ({ pn: h.std, name: h.desc, qty: h.qty, kind: 'hardware', mEach: 0, hw: true })) : []; };
  const walk = (it, lvl) => { rows.push({ ...it, level: lvl }); for (const h of hw(it)) rows.push({ ...h, level: lvl + 1 }); for (const c of kids(it.pn)) walk(c, lvl + 1); };
  for (const ata of [...new Set(items.map((i) => i.ata))].sort((a, b) => a - b)) {
    const top = items.filter((i) => i.ata === ata && !i.nha).sort((a, b) => a.pn.localeCompare(b.pn));
    if (!top.length) continue;
    rows.push({ level: 1, pn: `ATA ${ata}`, name: ATA[ata] || '', qty: 1, kind: 'chapter', mEach: top.reduce((a, i) => a + i.mEach * i.qty, 0) });
    for (const it of top) walk(it, 2);
  }
  const orphans = items.filter((i) => i.nha && !items.some((j) => j.pn === i.nha)).map((i) => i.pn);
  return { rows, orphans };
}

// ------------------------------------------------------------------------------------------- requirements
// Amateur-built aircraft are not certified to Part 23; the older prescriptive Part 23 sections are used as a
// design yardstick (section numbers to be verified against eCFR). checks: regex over check ids;
// verify: () => {ok, detail} for non-check evidence; wp: package that closes it when still open.
defineReqs([
  { id: 'R-STR-1', ref: '23.305 / 23.307', title: 'Structure carries limit loads without detrimental deformation and ultimate loads without failure', checks: /^(wing|canard|winglet)-(cap|web|webbuck|torsion|drop|core|bearing|lebond|joint)|^cs-|^fus-(bend|shear)|^f22-|^strake-tank/, method: 'analysis' },
  { id: 'R-STR-2', ref: '23.333 / 23.341', title: 'Flight envelope and gust loads covered by the load-case matrix', checks: /^(wing|canard)-cap$/, method: 'analysis' },
  { id: 'R-STR-3', ref: '23.349', title: 'Rolling conditions', checks: /^aileron-torsion$/, method: 'analysis' },
  { id: 'R-STR-4', ref: '23.351 / 23.441', title: 'Yawing and lateral loads (winglets, rudders)', checks: /^winglet-|^rudder-torsion$/, method: 'analysis' },
  { id: 'R-STR-5', ref: '23.361 / 23.363 / 23.371', title: 'Engine torque, side load and gyroscopic loads into the mount and firewall', checks: /^fus-engine$/, method: 'analysis', wp: 'WP1' },
  { id: 'R-STR-6', ref: '23.473–23.511', title: 'Ground loads: main gear, mounts and attachment', checks: /^gear-(bend|ils|tab)$|^fus-gear$/, method: 'analysis' },
  { id: 'R-STR-7', ref: '23.561', title: 'Emergency landing: occupant restraint anchors', checks: /^fus-belt$/, method: 'analysis' },
  { id: 'R-STR-8', ref: '23.629', title: 'Flutter, divergence and control reversal', checks: /^(wing|canard)-(div|freq|rev|twist)$/, method: 'analysis', wp: 'WP2' },
  { id: 'R-STR-8r', ref: '23.629 / 23.659 (AC 23.629-1B)', title: 'Rudder flutter and mass balance: the winglet rudder with a set-back balance is outside the 23.629(d) simplified criteria (unconventional tail); cleared by rational analysis, ground vibration test and flight flutter test to VD; mass properties and the ballast provision tracked (DC-005)', checks: /^rud-massbal$/, method: 'test', wp: 'WP2' },
  { id: 'R-STR-9', ref: '23.925', title: 'Propeller ground clearance at limit landing deflection', checks: /^gear-prop$/, method: 'analysis' },
  { id: 'R-STR-yaw', ref: '23.177 / 23.233', title: 'Static directional stability (Cnβ > 0, yardstick 0.0010 /deg), rudder power for the 0.2 VSO crosswind, yaw damping', checks: /^yaw-(cnb|cndr|cnr)$/, method: 'analysis' },
  { id: 'R-STR-10', ref: '23.397 / 23.405', title: 'Control system loads from pilot effort', method: 'analysis', wp: 'WP2' },
  { id: 'R-CTL-1', ref: '23.675 / 23.685 / 23.689', title: 'Control stops, system details, cable systems', method: 'analysis', wp: 'WP2' },
  { id: 'R-GEAR-1', ref: '23.729', title: 'Retracting nose gear: positive lock and position indication', method: 'analysis', wp: 'WP2' },
  { id: 'R-GEAR-2', ref: '23.735', title: 'Brakes: kinetic-energy capacity', method: 'analysis', wp: 'WP2' },
  { id: 'R-PWR-1', ref: '23.1041 / 23.1091 / 23.1093', title: 'Cooling, induction and induction icing protection', method: 'analysis', wp: 'WP1' },
  { id: 'R-PWR-2', ref: '23.1121 / 23.1191', title: 'Exhaust clearance and firewall', method: 'analysis', wp: 'WP1' },
  { id: 'R-FUEL-1', ref: '23.955 / 23.959', title: 'Fuel flow at the worst attitude; unusable fuel', method: 'analysis', wp: 'WP1' },
  { id: 'R-FUEL-2', ref: '23.965 / 23.975', title: 'Fuel tank pressure and vents', checks: /^strake-tank$/, method: 'analysis', wp: 'WP1' },
  { id: 'R-ELEC-1', ref: '23.1351 / 23.1357 / 23.1365', title: 'Electrical capacity, circuit protection, cables', method: 'analysis', wp: 'WP3' },
  { id: 'R-AV-1', ref: '23.1325', title: 'Static pressure system', method: 'test', wp: 'WP4' },
  { id: 'R-AV-2', ref: '23.1385–23.1401', title: 'Position and anti-collision lights', method: 'inspection', wp: 'WP4' },
  { id: 'R-AV-3', ref: '91.227', title: 'ADS-B Out installed', method: 'inspection', wp: 'WP4' },
  { id: 'R-CAB-1', ref: '23.783', title: 'Canopy: latching and unlatched warning', method: 'analysis', wp: 'WP4' },
  { id: 'R-CAB-2', ref: '23.787 / 23.853', title: 'Baggage and interior materials', method: 'inspection', wp: 'WP4' },
  { id: 'R-INT-1', ref: '—', title: 'Every route clear of structure, keep-outs and other systems', verify: () => { const c = clashCheck(); return { ok: c.length === 0, detail: c.length ? `${c.length} clash(es)` : `${routes().length} routes clear` }; }, method: 'analysis', wp: 'WP5', needsParts: true },
  { id: 'R-INT-2', ref: '23.23 / 23.25', title: 'Weight and CG from defined parts within limits', method: 'analysis', wp: 'WP5' },
]);
/** status of every requirement against the current analysis: pass / fail / open (with the package that closes it) */
export function reqStatus(R) {
  const gov = Object.values(R.governing);
  return REQS.map((r) => {
    const hits = r.checks ? gov.filter((c) => r.checks.test(c.id)) : [];
    let ev = null;
    if (r.verify && (!r.needsParts || PARTS.length)) ev = r.verify();
    const min = hits.length ? Math.min(...hits.map((c) => c.ms)) : null;
    const status = hits.some((c) => c.ms < 0) || (ev && !ev.ok) ? 'fail' : (hits.length && (!r.wp || r.closed)) || (ev && ev.ok && r.closed) ? 'pass' : hits.length || ev ? 'partial' : 'open';
    return { ...r, hits: hits.map((c) => c.id), min, evidence: ev, status };
  });
}

// ============================================================================================= quality control
// Identification: every part carries a standard / vendor part number (std), a source-control specification (scd, for
// bought-in LRUs), or enough data for a generated dimensioned drawing (fabricated kinds). Fluid lines end on named
// ports of named parts; electrical wires run from a pin of a connector of an LRU to another.
export const EQUIP = [];      // { ref, pn, name, at, conns: { J1: { type, std, pins: { '1': 'SIGNAL', ... }, stud? } }, load? }
export const WIRES = [];      // { id, awg, spec, from: 'REF:CONN:PIN', to, sig, harness, shield?, coax?, len }
export const FLUID = ['fuel', 'oil', 'brake', 'pitot', 'air'];
export const FAB_KINDS = ['machined', 'weldment', 'laminate', 'line', 'harness', 'cable', 'mechanism', 'install'];
export const defineEquipment = (list) => { for (const e of list) { const i = EQUIP.findIndex((q) => q.ref === e.ref); if (i >= 0) EQUIP[i] = e; else EQUIP.push(e); } };
export const defineWires = (list) => { for (const w of list) { const i = WIRES.findIndex((q) => q.id === w.id); if (i >= 0) WIRES[i] = w; else WIRES.push(w); } };
export const equipByRef = (ref) => EQUIP.find((e) => e.ref === ref);
/** 'REF:CONN:PIN' → { e, c, pin, name } (or null) */
export function pinOf(addr) {
  const [ref, conn, pin] = String(addr).split(':'), e = equipByRef(ref), c = e && e.conns[conn];
  return c && c.pins[pin] != null ? { e, c, conn, pin, name: c.pins[pin], ref } : null;
}
/** 'PN:PORT' → { part, port, at, kind, fit } (or null) */
export function portOf(ref) {
  const [pn, id] = String(ref).split(':'), p = partByPN(pn), q = p && p.ports && p.ports[id];
  return q ? { part: p, id, ...q } : null;
}
// ---- standard hardware from interfaces: AN bolts (dash = diameter in 16ths; length code whole inches + eighths),
//      MS21042 all-metal lock nuts, AN960 washers, NAS1832 potted inserts for sandwich hard-points
const AN_D = { 0.1875: 3, 0.25: 4, 0.3125: 5, 0.375: 6, 0.4375: 7, 0.5: 8 };
export function anBolt(d, gripIn) {
  const n = AN_D[d] ?? Math.round(d * 16), L = Math.max(0.5, Math.ceil((gripIn + d * 1.4) * 8) / 8);
  const code = `${Math.floor(L)}${Math.round((L % 1) * 8)}`.replace(/^0/, '');
  return { bolt: `AN${n}-${code}A`, nut: `MS21042L${n}`, washer: n <= 3 ? 'AN960-10' : `AN960-${n}16`, L };
}
export function hardwareOf(p) {
  const hw = [...(p.hardware || [])];
  for (const f of p.interfaces || []) {
    const n = (f.n || 1);
    if (f.kind === 'insert') hw.push({ std: `NAS1832C${AN_D[f.d] ?? 3}-${Math.round((f.embed || 0.5) * 16)}`, qty: n, desc: `potted insert, ${f.name}` }, { std: anBolt(f.d, 0.25).bolt, qty: n, desc: 'bolt into insert' }, { std: anBolt(f.d, 0.25).washer, qty: n, desc: 'washer' });
    else { const b = anBolt(f.d, (f.tHost || 0.1) + 0.19); hw.push({ std: b.bolt, qty: n, desc: `bolt, ${f.name}` }, { std: b.nut, qty: n, desc: 'self-locking nut' }, { std: b.washer, qty: 2 * n, desc: 'washer' }); }
  }
  return hw;
}
/** quality-control report: identification, fluid continuity, wiring, process/inspection, hardware */
export function qc() {
  const F = [], add = (sys, ok, cat, pn, msg) => F.push({ sys, ok, cat, pn, msg });
  const sysOf = (ata) => `ATA ${ata} ${ATA[ata] || ''}`;
  // identification
  for (const p of PARTS) {
    const s = sysOf(p.ata);
    if (p.kind === 'cots') add(s, !!(p.std || p.scd), 'identification', p.pn, p.std ? `standard / vendor P/N ${p.std}` : p.scd ? `source-control drawing ${p.pn}-SCD (${p.scd.spec || 'envelope, mounting, interface'})` : 'bought-in part with no standard P/N or source-control spec');
    else {
      const need = p.kind === 'line' ? (p.geo.some((g) => g.t === 'path') ? null : 'no routed geometry') : p.kind === 'harness' || p.kind === 'cable' ? (p.kind === 'cable' && !p.std ? 'control cable without a cable spec' : p.kind === 'harness' && !WIRES.some((w) => [].concat(w.harness).includes(p.pn)) ? 'harness with no wires assigned' : null) : (!p.geo.length ? 'no geometry to dimension' : (!p.material && !['install', 'mechanism', 'laminate'].includes(p.kind) ? 'no material callout' : null));
      add(s, !need, 'identification', p.pn, need || `dimensioned drawing ${p.pn} (${p.kind}${p.material ? `, ${p.material}` : ''}${p.std ? `; ${p.std}` : ''})`);
    }
    if (p.kind !== 'cots') add(s, p.steps.length > 0 && p.steps.some((t) => t.inspect && t.inspect.length), 'process', p.pn, p.steps.length ? 'process steps with inspection points' : 'no process / inspection steps');
  }
  // fluid continuity: every fluid line end sits on a named port of the right kind, each port used once
  const used = {};
  for (const p of PARTS) for (const [gi, g] of p.geo.entries()) {
    if (g.t !== 'path' || !FLUID.includes(g.cls)) continue;
    const s = sysOf(p.ata), tag = `${p.pn} run ${gi + 1}`;
    if (!g.ends || g.ends.length !== 2) { add(s, false, 'continuity', p.pn, `${tag}: ${g.cls} line ends not tied to ports`); continue; }
    g.ends.forEach((ref, k) => {
      const q = portOf(ref), pt = k ? g.pts[g.pts.length - 1] : g.pts[0];
      if (!q) { add(s, false, 'continuity', p.pn, `${tag}: end ${k + 1} → unknown port ${ref}`); return; }
      const gap = len(sub(pt, q.at)) * 12;
      add(s, gap <= 0.375 && q.kind === g.cls, 'continuity', p.pn, `${tag}: end ${k + 1} on ${ref} (${q.kind}), gap ${gap.toFixed(2)} in${q.fit ? `, ${q.fit}` : ''}${g.endFit ? ` ↔ ${g.endFit[k]}` : ''}`);
      (used[ref] ||= []).push(tag);
    });
  }
  for (const p of PARTS) for (const [a, b] of p.mates || []) {
    const A = portOf(a), B = portOf(b), gap = A && B ? len(sub(A.at, B.at)) * 12 : Infinity;
    add(sysOf(p.ata), gap <= 0.375 && A.kind === B.kind, 'continuity', p.pn, `joint ${a} ↔ ${b}: ${A && B ? `gap ${gap.toFixed(2)} in` : 'unknown port'}`);
    for (const r of [a, b]) (used[r] ||= []).push(`joint ${a} ↔ ${b}`);
  }
  for (const p of PARTS) for (const [id, q] of Object.entries(p.ports || {})) {
    const ref = `${p.pn}:${id}`, n = (used[ref] || []).length;
    if (q.open) continue;
    add(sysOf(p.ata), n === 1, 'continuity', p.pn, `port ${ref} (${q.kind}) ${n === 1 ? `connected to ${used[ref][0]}` : n ? `used by ${n} lines` : 'not connected'}`);
  }
  for (const t of TRACES) { const r = trace(t.from, t.to); add(t.sys, r.ok, 'continuity', t.from.split(':')[0], `${t.name}: ${r.ok ? r.path.join(' → ') : `no continuous path from ${t.from} to ${t.to}`}`); }
  // wiring: both ends on declared pins; connector pins single-wired; declared pins used; harness assignment
  const onPin = {};
  for (const w of WIRES) {
    const hs = [].concat(w.harness), ends = [w.from, w.to].map(pinOf), h = partByPN(hs[0]), s = h ? sysOf(h.ata) : 'ATA 24 Electrical power';
    add(s, ends.every(Boolean) && hs.every((x) => partByPN(x)) && (w.awg || w.coax || w.hv) && w.len > 0, 'wiring', hs[0], `${w.id} ${w.awg ? `${w.awg} AWG` : w.spec} ${w.sig}: ${w.from} → ${w.to}${ends.every(Boolean) ? '' : ' (pin not declared)'}${h ? '' : ' (no harness part)'}, ${w.len ? `${w.len.toFixed(1)} ft` : 'no length'}`);
    for (const a of [w.from, w.to]) (onPin[a] ||= []).push(w.id);
  }
  for (const e of EQUIP) for (const [cn, c] of Object.entries(e.conns)) for (const [pin, name] of Object.entries(c.pins)) {
    const a = `${e.ref}:${cn}:${pin}`, n = (onPin[a] || []).length, s = sysOf(partByPN(e.pn)?.ata ?? 24);
    if (/^(NC|SPARE)/.test(name)) { add(s, n === 0, 'wiring', e.pn, `${a} ${name}${n ? ' has a wire on a spare pin' : ''}`); continue; }
    const max = c.stud ? (c.maxLugs || 4) : 1;
    add(s, n >= 1 && n <= max, 'wiring', e.pn, `${a} ${name}: ${n ? onPin[a].join(', ') : 'no wire'}${n > max ? ` (more than ${max} on one ${c.stud ? 'stud' : 'pin'})` : ''}`);
  }
  // containment: everything that is not an external item lies inside the OML
  const outside = containment();
  for (const p of PARTS) { if (p.external) continue; const bad = outside.filter((o) => o.pn === p.pn); add(sysOf(p.ata), !bad.length, 'oml', p.pn, bad.length ? `${bad.length} point(s) outside the OML, e.g. ${bad[0].t} at FS ${(bad[0].at[0] * 12).toFixed(1)} BL ${(bad[0].at[1] * 12).toFixed(1)} WL ${(bad[0].at[2] * 12).toFixed(1)}` : 'inside the OML'); }
  // hardware callouts for every structural interface
  for (const p of PARTS) if ((p.interfaces || []).length) add(sysOf(p.ata), hardwareOf(p).length > 0, 'hardware', p.pn, hardwareOf(p).map((h) => `${h.qty} × ${h.std}`).join(', '));
  const systems = [...new Set(F.map((f) => f.sys))].sort((a, b) => Number(a.split(' ')[1]) - Number(b.split(' ')[1])).map((sys) => ({ sys, items: F.filter((f) => f.sys === sys) }));
  return { systems, total: F.length, fails: F.filter((f) => !f.ok) };
}
// ---- end-to-end traces through ports: lines connect ports; parts connect their own ports through p.flow
export const TRACES = [];
export const defineTraces = (list) => { for (const t of list) TRACES.push(t); };
export function trace(from, to) {
  const adj = {};
  const link = (a, b, via) => { (adj[a] ||= []).push([b, via]); (adj[b] ||= []).push([a, via]); };
  for (const p of PARTS) {
    for (const g of p.geo) if (g.t === 'path' && g.ends && g.ends.length === 2) link(g.ends[0], g.ends[1], p.pn);
    for (const [a, b] of p.flow || []) link(`${p.pn}:${a}`, `${p.pn}:${b}`, p.pn);
    for (const [a, b] of p.mates || []) link(a, b, p.pn);
  }
  const prev = { [from]: null }, q = [from];
  while (q.length) { const n = q.shift(); if (n === to) break; for (const [m] of adj[n] || []) if (!(m in prev)) { prev[m] = n; q.push(m); } }
  if (!(to in prev)) return { ok: false, path: [] };
  const path = []; for (let n = to; n; n = prev[n]) path.unshift(n);
  return { ok: true, path };
}
