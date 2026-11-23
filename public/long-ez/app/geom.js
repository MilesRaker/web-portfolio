// 3D builders for the ply book: layered parts (with explode vectors) and their tooling.
import * as THREE from 'three';
import { MAT, GEO, wingSec, fusAt, fusSide, fusPanel, fusOutline, gearBow, gearBowVc } from './structures.js';
import { FRAMES, airfoil, afAt } from './plybook.js';

export const FTM = 0.3048;
const IN = 1 / 12;
const lerp = (a, b, t) => a + (b - a) * t;
export const P = (s, y, z) => new THREE.Vector3(y * FTM, z * FTM, s * FTM); // model ft -> glTF metres

// ---------------------------------------------------------------- textures (fibre direction)
function stripeTex(kind) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, 128, 128);
  g.strokeStyle = 'rgba(40,40,50,0.55)';
  g.lineWidth = kind === 'UNI' ? 2 : 1.5;
  const step = kind === 'UNI' ? 16 : 32;
  for (let x = 0; x <= 128; x += step) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 128); g.stroke(); }
  if (kind !== 'UNI') for (let y = 0; y <= 128; y += step) { g.beginPath(); g.moveTo(0, y); g.lineTo(128, y); g.stroke(); }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
let TEX = null;
const tex = () => (TEX ||= { UNI: stripeTex('UNI'), BID: stripeTex('BID'), GUD: stripeTex('BID') });

export const COLORS = {
  // block P: UNI = HTS40 carbon (dark), GUD = 6781 laid 0/90 (the old glass-cap gold), BID = 6781 fabric; cores Divinycell HT61
  UNI: 0x5a6270, GUD: 0xe8c36a, BID: 0xd6e4f2, doublerBID: 0xc4b1ee, doublerUNI: 0x7a7f90, doublerGUD: 0xf0a860, XPS: 0x7fb0e6, PU: 0x9c8a74, PVC: 0xb58ad6,
};
export function plyMaterial(p) {
  const key = p.region === 'doubler' || p.region === 'pad' ? (p.mat === 'UNI' ? 'doublerUNI' : p.mat === 'GUD' ? 'doublerGUD' : 'doublerBID') : p.mat;
  return new THREE.MeshStandardMaterial({
    color: COLORS[key], map: tex()[p.mat], roughness: 0.55, metalness: 0, side: THREE.DoubleSide,
    transparent: true, opacity: 0.93, polygonOffset: true, polygonOffsetFactor: -1,
  });
}
export function coreMaterial(mat) {
  return new THREE.MeshStandardMaterial({ color: COLORS[mat], roughness: 0.9, transparent: true, opacity: 0.78, side: THREE.DoubleSide });
}

// ---------------------------------------------------------------- mesh helpers
/** grid surface: f(u,v)->Vector3 (metres), uv(u,v)->[a,b] ft along span/chord for fibre texture */
function grid(nu, nv, f, uv, angle, density) {
  const pos = [], uvs = [], idx = [];
  const th = angle * Math.PI / 180, c = Math.cos(th), s = Math.sin(th);
  for (let i = 0; i <= nu; i++) for (let j = 0; j <= nv; j++) {
    const u = i / nu, v = j / nv, p = f(u, v), [a, b] = uv(u, v);
    pos.push(p.x, p.y, p.z);
    uvs.push((b * c - a * s) * density, (a * c + b * s) * density);
  }
  for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
    const a = i * (nv + 1) + j, b = a + nv + 1;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
/** closed loft through rings of Vector3 (equal length), with end caps */
function loft(rings, caps = true) {
  const n = rings[0].length, pos = [], idx = [];
  rings.forEach((r) => r.forEach((p) => pos.push(p.x, p.y, p.z)));
  for (let i = 0; i < rings.length - 1; i++) for (let j = 0; j < n; j++) {
    const a = i * n + j, b = i * n + (j + 1) % n, c = a + n, d = b + n;
    idx.push(a, c, b, b, c, d);
  }
  if (caps) for (const [ri, flip] of [[0, true], [rings.length - 1, false]]) {
    const r = rings[ri], cen = r.reduce((a, p) => a.add(p), new THREE.Vector3()).multiplyScalar(1 / n);
    const ci = pos.length / 3;
    pos.push(cen.x, cen.y, cen.z);
    for (let j = 0; j < n; j++) { const a = ri * n + j, b = ri * n + (j + 1) % n; if (flip) idx.push(ci, b, a); else idx.push(ci, a, b); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
const cosX = (k, n) => (1 - Math.cos(Math.PI * k / n)) / 2;

// ---------------------------------------------------------------- lifting parts
function airfoilRing(F, y, scale = 1, nx = 28, inset = 0) {
  // inset (ft): pull the ring in along the thickness axis (hollow sandwich shells)
  const pts = [], c = F.sec(y).c;
  for (let k = 0; k <= nx; k++) { const x = cosX(k, nx), a = afAt(F, y, x); pts.push(F.pt(y, x, Math.max(a.yc ?? 0, a.yu * scale - inset / c))); }
  for (let k = nx - 1; k >= 1; k--) { const x = cosX(k, nx), a = afAt(F, y, x); pts.push(F.pt(y, x, Math.min(a.yc ?? 0, a.yl * scale + inset / c))); }
  return pts.map((p) => P(...p));
}
function explodeDir(F, side) {
  const a = F.thickAxis;
  if (a[1]) { const ca = GEO.winglet.cant * Math.PI / 180; return P(0, Math.cos(ca), -Math.sin(ca)).normalize().multiplyScalar(side); }
  return P(0, 0, 1).normalize().multiplyScalar(side);
}

const metal = (c, op = 1) => new THREE.MeshStandardMaterial({ color: c, metalness: 0.55, roughness: 0.38, transparent: op < 1, opacity: op });
/** build props (fittings, bolts) that go in during a layup step: book.buildProps [{ id, name, step, seq, dir, geo }] */
function addProps(grp, book) {
  const props = [];
  for (const pr of book.buildProps || []) {
    const g = new THREE.Group();
    for (const x of pr.geo) {
      let mm;
      if (x.t === 'box') { mm = new THREE.Mesh(new THREE.BoxGeometry(x.d[1] * FTM, x.d[2] * FTM, x.d[0] * FTM), metal(x.colour || 0x9aa4ae)); mm.position.copy(P(...x.c)); }
      else { const a = P(...x.a), c = P(...x.b), L = a.distanceTo(c); mm = new THREE.Mesh(new THREE.CylinderGeometry(x.r * FTM, x.r * FTM, L, 14), metal(x.colour || 0x8c96a3)); mm.position.copy(a.clone().add(c).multiplyScalar(0.5)); mm.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), c.clone().sub(a).normalize()); }
      g.add(mm);
    }
    g.userData = { prop: pr, dir: P(...pr.dir).normalize(), base: g.position.clone() };
    grp.add(g); props.push(g);
  }
  return props;
}
export function buildLifting(book) {
  const F0 = FRAMES[book.frame], [y0, y1] = F0.span;
  const grp = new THREE.Group();
  const meshes = [], cores = [];
  const mirror = y0 < 0 && Math.abs(y0 + y1) < 1e-6, A = (y) => (mirror ? Math.abs(y) : y);
  // cores: solid foam, or (hollow parts) the sandwich-skin shell around an empty fuel tank; plus extra frames
  const frames = [book.frame, ...new Set(book.plies.map((p) => p.frame).filter(Boolean))];
  for (const fk of frames) {
    const F = FRAMES[fk], [a, b] = F.span, rings = [];
    if (book.hollow) {
      const tIn = book.coreIn * IN;
      for (let i = 0; i <= 30; i++) { const y = lerp(a, b, i / 30), o = airfoilRing(F, y, 0.995), n = airfoilRing(F, y, 0.995, 28, tIn); rings.push([...o, o[0], ...n.slice().reverse(), n[n.length - 1]]); }
    } else for (let i = 0; i <= 30; i++) rings.push(airfoilRing(F, lerp(a, b, i / 30), 0.985));
    const core = new THREE.Mesh(loft(rings, !book.hollow), coreMaterial(book.core.mat));
    core.userData = { core: true, info: book.core, label: fk === 'wingletLow' ? `Lower winglet ${MAT[book.core.mat].label} core` : book.hollow ? `${MAT[book.core.mat].label} sandwich core (tank is hollow)` : `${MAT[book.core.mat].label} core` };
    grp.add(core); cores.push(core);
  }
  const rank = { '-1': 0, 1: 0, 0: 0 };
  const t = (m) => MAT[m].t * IN; // ft
  const built = { '-1': 0, 1: 0 }, inner = { '-1': 0, 1: 0 };
  const cnt = { '-1': 0, 1: 0 };
  for (const p of book.plies) if (p.side) cnt[p.side] += 1;
  const spread = Math.max(1.1, 0.55 * F0.sec(A((y0 + y1) / 2)).c); // ft each side, fully exploded
  const capChord = (y, half, w) => { const c = F0.sec(A(y)).c; return book.xsp + (half * (w ?? book.capW(y)) * IN / 2) / c; };
  const xeOf = (p) => (y) => { const ay = mirror ? Math.abs(y) : y; for (const c of p.cuts || []) if (ay > c.span[0] && ay < c.span[1]) return c.x; return 1; };
  // span stations: uniform plus both sides of every hinge-line break, so the skin cut-outs come out square
  const stations = (p, n) => {
    const br = (p.cuts || []).flatMap((c) => (mirror ? [c.span[0], c.span[1], -c.span[0], -c.span[1]] : c.span)).filter((v) => v > p.span[0] && v < p.span[1]);
    const ys = new Set(Array.from({ length: n + 1 }, (_, i) => lerp(p.span[0], p.span[1], i / n)));
    for (const v of br) { ys.add(v - 1e-3); ys.add(v + 1e-3); }
    return [...ys].sort((a2, b2) => a2 - b2);
  };
  for (const p of book.plies) {
    const F = FRAMES[p.frame || book.frame];
    let geo, dir, gap;
    if (p.region === 'web') {
      rank[0] += 1;
      const k = rank[0];
      geo = grid(24, 6, (u, v) => {
        const y = lerp(p.span[0], p.span[1], u), af = afAt(F, A(y), book.xsp);
        return P(...F.pt(y, book.xsp + 0.004 * k, lerp(af.yl, af.yu, v) * 0.97));
      }, (u, v) => [lerp(p.span[0], p.span[1], u), v * 0.4], p.angle, 6);
      dir = P(1, 0, 0).normalize();
      gap = 0.09 * k;
    } else if (p.region === 'rib') { // flat tank rib in the section plane at BL y
      rank[0] += 1;
      const pts = [];
      for (let k = 0; k <= 30; k++) { const x = cosX(k, 30); pts.push([x, afAt(F, p.y, x).yu * 0.97]); }
      for (let k = 29; k >= 1; k--) { const x = cosX(k, 30); pts.push([x, afAt(F, p.y, x).yl * 0.97]); }
      const sh = new THREE.Shape(pts.map(([x, o]) => new THREE.Vector2(x, o)));
      geo = new THREE.ShapeGeometry(sh, 24);
      const pos = geo.attributes.position, uv = [];
      for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), o = pos.getY(i), q = P(...F.pt(p.y, x, o)); uv.push(x * 4, o * 4); pos.setXYZ(i, q.x, q.y, q.z); }
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      geo.computeVertexNormals();
      dir = P(0, 1, 0).normalize(); gap = 0.25 * rank[0];
    } else {
      const side = p.side;
      rank[side] += 1;
      const r = rank[side];
      const isCap = p.region === 'cap' || p.region === 'pad';   // a pad (root hard point) sits inside the cap trough, under the fitting
      let offTrue;
      if (p.depth != null) offTrue = -p.depth * IN;   // given depth (in) below the core surface
      else if (isCap) offTrue = -(p.capCount - p.capIndex) * t(p.mat); // inside the trough (block P: the ply's own thickness, HTS40 or 6781)
      else if (p.inner) { inner[side] += t(p.mat); offTrue = -(book.coreIn * IN) - inner[side]; } // tank-side face of a sandwich skin
      else { built[side] += t(p.mat); offTrue = built[side]; }
      const xe = xeOf(p);
      const xr = (y) => (isCap ? (p.w ? [capChord(y, -1, p.w), capChord(y, 1, p.w)] : [capChord(y, -1), capChord(y, 1)]) : p.region === 'skin' ? [0, xe(y)] : p.chord);
      const ys = isCap ? Array.from({ length: 31 }, (_, i) => lerp(p.span[0], p.span[1], i / 30)) : stations(p, 40);
      const nu = ys.length - 1;
      geo = grid(nu, isCap ? 2 : 22, (u, v) => {
        const y = ys[Math.round(u * nu)], [xa, xb] = xr(y), x = isCap ? lerp(xa, xb, v) : lerp(xa, xb, cosX(v * 22, 22));
        const af = afAt(F, A(y), x), o = side > 0 ? af.yu : af.yl;
        return P(...F.pt(y, x, o, side * offTrue));
      }, (u, v) => { const y = ys[Math.round(u * nu)], [xa, xb] = xr(y); return [y, lerp(xa, xb, v) * F.sec(A(y)).c]; }, p.angle, p.mat === 'UNI' ? 10 : 7);
      dir = explodeDir(F, side);
      gap = spread * r / cnt[side];
    }
    const m = new THREE.Mesh(geo, plyMaterial(p));
    m.userData = { ply: p, dir, gap, label: p.id, pivotX: (p.span ? p.span[0] : 0) * FTM };   // ply-by-ply build: rolls out from its inboard end
    grp.add(m);
    meshes.push(m);
  }
  const props = addProps(grp, book);
  return { group: grp, meshes, core: cores[0], cores, props };
}

// ---------------------------------------------------------------- CS spar (box beam)
export function buildBox(book) {
  // Every ply sits at its true stacking depth (true thickness): webs and caps build outward onto the core, the wrap is
  // outermost, so laying them one by one shows the laminate growing. Build props (clevis blocks, through-bolts) and the
  // layup jig come from book.props / book.jig.
  const b = book.box, grp = new THREE.Group(), meshes = [], IN = 1 / 12;
  const tU = MAT.UNI.t * IN, tB = MAT.BID.t * IN;
  const nWrap = book.plies.filter((p) => p.region === 'skin').reduce((a, p) => a + (p.plies || 1), 0), tw = nWrap * tB;
  const nWeb = { '-1': 0, 1: 0 }; for (const p of book.plies) if (p.region === 'web' && !p.local) nWeb[p.side] += 1;
  const capN = Math.max(0, ...book.plies.filter((p) => p.region === 'cap').map((p) => p.capCount || 0));
  const s0 = b.s - b.w / 2, s1 = b.s + b.w / 2, z0 = b.z - b.h / 2, z1 = b.z + b.h / 2;
  const cw = b.w - 2 * (tw + Math.max(nWeb[-1], nWeb[1]) * tB), ch = b.h - 2 * (tw + capN * tU);
  const core = new THREE.Mesh(new THREE.BoxGeometry(2 * b.half * FTM, ch * FTM, cw * FTM), coreMaterial('PVC'));
  core.position.copy(P(b.s, 0, b.z));
  core.userData = { core: true, info: book.core, label: 'PVC core' };
  grp.add(core);
  const rank = { cap: { '-1': 0, 1: 0 }, web: { '-1': 0, 1: 0 }, pad: { '-1': 0, 1: 0 }, wrap: 0 };
  for (const p of book.plies) {
    let geo, dir, gap;
    if (p.region === 'cap') {
      rank.cap[p.side] += 1;
      const dIn = tw + (p.capCount - 1 - p.capIndex + 0.5) * tU, z = p.side > 0 ? z1 - dIn : z0 + dIn;   // ply 1 (shortest) innermost
      geo = grid(20, 2, (u, v) => P(lerp(b.s - b.capW / 2, b.s + b.capW / 2, v), lerp(p.span[0], p.span[1], u), z), (u, v) => [lerp(p.span[0], p.span[1], u), v * b.capW], 0, 10);
      dir = P(0, 0, p.side).normalize(); gap = 0.08 * rank.cap[p.side];
    } else if (p.region === 'pad') {   // spar-end hard point: a flat pack under the cap, p.depth (in) below the cap's outer face
      rank.pad[p.side] += 1;
      const z = p.side > 0 ? z1 - p.depth / 12 : z0 + p.depth / 12, w = (p.w || b.capW * 12) / 12;
      geo = grid(8, 2, (u, v) => P(lerp(b.s - w / 2, b.s + w / 2, v), lerp(p.span[0], p.span[1], u), z), (u, v) => [lerp(p.span[0], p.span[1], u), v * w], 0, 10);
      dir = P(0, 0, p.side).normalize(); gap = 0.06 * rank.pad[p.side];
    } else if (p.region === 'web') {
      let dIn = tw;
      if (!p.local) { rank.web[p.side] += 1; dIn = tw + (nWeb[p.side] - rank.web[p.side] + 0.5) * tB; }   // first web ply innermost
      const s = p.side < 0 ? s0 + dIn : s1 - dIn;
      geo = grid(20, 4, (u, v) => P(s, lerp(p.span[0], p.span[1], u), lerp(z0 + tw, z1 - tw, v)), (u, v) => [lerp(p.span[0], p.span[1], u), v * b.h], p.angle, 6);
      dir = P(p.side, 0, 0).normalize(); gap = 0.2 * (rank.web[p.side] || 1);
    } else {
      rank.wrap += 1;
      const e = (rank.wrap - 0.5) * tB, ring = [[s0 + e, z0 + e], [s1 - e, z0 + e], [s1 - e, z1 - e], [s0 + e, z1 - e], [s0 + e, z0 + e]];
      geo = grid(16, 4 * 6, (u, v) => {
        const k = Math.min(3, Math.floor(v * 4)), w = v * 4 - k, a = ring[k], c = ring[k + 1];
        return P(lerp(a[0], c[0], w), lerp(p.span[0], p.span[1], u), lerp(a[1], c[1], w));
      }, (u, v) => [lerp(p.span[0], p.span[1], u), v * 2 * (b.w + b.h)], p.angle, 6);
      dir = P(0, 0, 1).normalize(); gap = 1.6 + 0.15 * rank.wrap + (p.region === 'doubler' ? 0.3 : 0);
    }
    const m = new THREE.Mesh(geo, plyMaterial(p));
    // roll-out pivot for the build animation: symmetric plies unroll from the centre line, end plies from their outer end
    const piv = Math.abs(p.span[0] + p.span[1]) < 1e-6 ? 0 : (Math.abs(p.span[1]) > Math.abs(p.span[0]) ? p.span[1] : p.span[0]);
    m.userData = { ply: p, dir, gap, label: p.id, pivotX: piv * FTM };
    grp.add(m); meshes.push(m);
  }
  // build props: clevis blocks, through-bolts (book.props, model ft)
  const props = addProps(grp, book);
  // layup jig: a straight board and two end plates; it stays put while the part is turned on it
  let fixed = null;
  if (book.jig) {
    fixed = new THREE.Group();
    const wood = new THREE.MeshStandardMaterial({ color: 0x8a6a48, roughness: 0.85 }), plate = metal(0x6f7a86);
    const J = book.jig, board = new THREE.Mesh(new THREE.BoxGeometry(J.L * FTM, J.t * FTM, J.w * FTM), wood);
    board.position.copy(P(b.s, 0, z0 - J.gap - J.t / 2)); fixed.add(board);
    for (const sg of [-1, 1]) { const pl = new THREE.Mesh(new THREE.BoxGeometry(0.03 * FTM, (b.h + J.gap + 0.12) * FTM, J.w * 0.7 * FTM), plate); pl.position.copy(P(b.s, sg * (b.half + 0.03), b.z - J.gap / 2 - 0.02)); fixed.add(pl); }
    fixed.userData = { jig: true };
  }
  return { group: grp, meshes, core, props, fixed };
}

// ---------------------------------------------------------------- fuselage shell (true contour)
/** Every fuselage ply sits on its own panel of the real outline: side panels (both hands), belly, forward
 *  deck and turtledeck — together they close into the fuselage. Stack through each panel, outside → in:
 *  outside face, doublers, longeron UNI (recessed in the foam), urethane core, inside face, belly UNI.
 *  Explode is radial: each ply is scaled about the fuselage axis, so a layer keeps the fuselage's shape and
 *  the layers nest like shells (outside plies grow outward, inside plies shrink inward).
 *  opts.flat: one side panel developed flat on the layup table (tooling view). */
export const FUS_AXIS_Z = 3.0, FUS_RM = 1.15;
export function buildSidePanel(book, opts = {}) {
  const grp = new THREE.Group(), meshes = [], flat = !!opts.flat, PN = book.panels;
  const tB = MAT.BID.t * IN, tU = MAT.UNI.t * IN, tc = book.panel.coreIn * IN;
  const nO = 2, coreOut = -nO * tB, coreIn = coreOut - tc;
  const kindOf = (pk) => PN[pk].kind || pk;
  const place = (pk, hand, s, a, off) => {
    const fp = fusPanel(s, kindOf(pk));
    if (flat) return P(s, 0.9 + off, fp.zLo + a);
    const q = fp.at(a, off);
    return P(s, pk === 'side' ? hand * q.y : q.y, q.z);
  };
  const surf = (pk, hand, sr, ar, off, ang, dens, nv = 16) => grid(56, nv, (u, v) => {
    const s = lerp(sr[0], sr[1], u), [a0, a1] = ar(fusPanel(s, kindOf(pk)));
    return place(pk, hand, s, lerp(a0, a1, v), off);
  }, (u, v) => { const s = lerp(sr[0], sr[1], u), [a0, a1] = ar(fusPanel(s, kindOf(pk))); return [s, lerp(a0, a1, v)]; }, ang, dens);
  const instances = flat ? [['side', 1]] : Object.keys(PN).flatMap((pk) => (pk === 'side' ? [['side', 1], ['side', -1]] : [[pk, 0]]));
  const solid = !!book.solid;
  const cores = [];
  for (const [pk, hand] of instances) {
    const sr = PN[pk].srange, rings = [], NA = 16;
    for (let i = 0; i <= 48; i++) {
      const s = lerp(sr[0], sr[1], i / 48), fp = fusPanel(s, kindOf(pk)), r = [];
      for (let j = 0; j <= NA; j++) r.push(place(pk, hand, s, fp.arc * j / NA, coreOut));
      for (let j = NA; j >= 0; j--) r.push(place(pk, hand, s, fp.arc * j / NA, coreIn));
      rings.push(r);
    }
    const c = solid ? null : new THREE.Mesh(loft(rings, false), coreMaterial('PU'));
    if (c) {
    c.userData.anchors = [0.12, 0.3, 0.5, 0.7, 0.88].map((fu) => { const sx = lerp(sr[0], sr[1], fu); return place(pk, hand, sx, fusPanel(sx, kindOf(pk)).arc / 2, (coreOut + coreIn) / 2); });
    const coreAnchors = c.userData.anchors;
    const nm = pk === 'side' ? `Side core${flat ? ' (flat on the table)' : hand > 0 ? ' · right' : ' · left'}` : `${PN[pk].name} core`;
    c.userData = { core: true, info: book.core, label: `Urethane ${nm.toLowerCase()}`, radial: !flat, anchors: coreAnchors, labelSlot: 0 };
    if (!(pk === 'side' && hand > 0)) c.userData.noLabel = true; // one core label is enough (legend shows the colour)
    grp.add(c); cores.push(c);
    }
    // plies of this panel, in lay-up order; explode distances grow away from the core
    let gOut = 0.08, gIn = 0.06, kO = 0, kI = 0, kU = 0;
    const nIfaces = book.plies.filter((p) => p.panel === pk && p.region === 'face' && p.side < 0).length;
    const nOs = book.plies.filter((p) => p.panel === pk && p.region === 'face' && p.side > 0).length;
    for (const p of book.plies) {
      if (p.panel !== pk) continue;
      const srP = p.srange || sr;
      let geo, off, gap;
      if (p.region === 'face' && p.side < 0) {
        kI += 1; off = coreIn - (kI - 0.5) * tB; gIn += 0.16; gap = gIn;
        geo = surf(pk, hand, srP, (fp) => [0, fp.arc], off, p.angle, 6);
      } else if (p.region === 'bellyuni') {
        kU += 1; off = coreIn - nIfaces * tB - (kU - 0.5) * tU; gIn += 0.05; gap = gIn;
        geo = surf(pk, hand, srP, (fp) => [fp.arc * 0.225, fp.arc * 0.775], off, 0, 10, 6);
      } else if (p.region === 'longeron') {
        off = coreOut - (p.capCount - p.capIndex + 0.5) * tU; gOut += 0.028; gap = gOut;
        geo = surf(pk, hand, srP, (fp) => [fp.arc - 1.75 * IN, fp.arc], off, 0, 10, 2);
      } else if (p.region === 'doubler') {
        off = coreOut + 0.004; gOut += 0.14; gap = gOut;
        geo = surf(pk, hand, srP, (fp) => [Math.min(p.zrange[0], fp.arc - 0.05), Math.min(p.zrange[1], fp.arc)], off, p.angle, 6, 4);
      } else {
        kO += 1; off = solid ? -(nOs - kO + 0.5) * tB : coreOut + (kO - 0.5) * tB + 0.006; gOut += solid ? 0.12 : 0.2; gap = gOut;
        geo = surf(pk, hand, srP, (fp) => [0, fp.arc], off, p.angle, 6);
      }
      const m = new THREE.Mesh(geo, plyMaterial(p));
      const anchors = [0.12, 0.3, 0.5, 0.7, 0.88].map((fu) => { const sx = lerp(srP[0], srP[1], fu), fp = fusPanel(sx, kindOf(pk)), ar = p.region === 'longeron' ? [fp.arc - 0.07, fp.arc] : p.region === 'doubler' ? [Math.min(p.zrange[0], fp.arc - 0.05), Math.min(p.zrange[1], fp.arc)] : [0, fp.arc]; return place(pk, hand, sx, (ar[0] + ar[1]) / 2, off); });
      m.userData = { ply: p, dir: P(0, p.side, 0).normalize(), gap: flat ? gap * 0.6 : gap, label: p.id, hand: pk === 'side' ? (hand > 0 ? 'RH' : 'LH') : '', radial: !flat, anchors };
      grp.add(m); meshes.push(m);
    }
  }
  // context: ghost of the whole fuselage and the bulkhead stations the shell is built on
  const ctx = new THREE.Group(), ctxLabels = [];
  if (!flat && book.id === 'fuselage') {
    const rings = [];
    for (let i = 0; i <= 60; i++) { const s = lerp(0.25, 16.2, i / 60), o = fusOutline(s, 64, 0.004); rings.push(o.pts.map(([y, z]) => P(s, y, z))); }
    ctx.add(new THREE.Mesh(loft(rings, false), new THREE.MeshBasicMaterial({ color: 0xb8c8da, transparent: true, opacity: 0.04, depthWrite: false, side: THREE.DoubleSide })));
    const st = [[GEO.F22, 'F22'], [GEO.F28, 'F28'], [40.5 / 12, 'Instrument panel'], [8.10, 'Front seat back'], [10.85, 'Rear seat back'], [GEO.firewall, 'Firewall']];
    for (const [sx, name] of st) {
      const o = fusOutline(sx, 64, -0.03), pts = o.pts.map(([y, z]) => P(sx, y, z));
      ctx.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x7fb0e6, transparent: true, opacity: 0.8 })));
      const anchor = new THREE.Object3D(); anchor.position.copy(P(sx, 0, o.f.bot - 0.12)); ctx.add(anchor);
      ctxLabels.push([anchor, name]);
    }
    grp.add(ctx);
  }
  if (!flat && book.id === 'cowl') { // the firewall the cowl closes onto
    const o = fusOutline(GEO.firewall, 64, -0.01);
    ctx.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(o.pts.map(([y, z]) => P(GEO.firewall, y, z))), new THREE.LineBasicMaterial({ color: 0x7fb0e6 })));
    const anchor = new THREE.Object3D(); anchor.position.copy(P(GEO.firewall, 0, o.f.bot - 0.12)); ctx.add(anchor); ctxLabels.push([anchor, 'Firewall']);
    grp.add(ctx);
  }
  return { group: grp, meshes, core: cores[0] || null, cores, ctx, ctxLabels, flat };
}

// ---------------------------------------------------------------- F22 bulkhead
function bulkheadShape(pn, inset = 0) {
  const hw = pn.w / 2 - 0.04 - inset, zb = pn.bot + 0.05 + inset, zt = pn.top - 0.05 - inset, r = 0.25;
  const sh = new THREE.Shape();
  sh.moveTo(-hw + r, zb); sh.lineTo(hw - r, zb); sh.quadraticCurveTo(hw, zb, hw, zb + r);
  sh.lineTo(hw, zt - r); sh.quadraticCurveTo(hw, zt, hw - r, zt); sh.lineTo(-hw + r, zt);
  sh.quadraticCurveTo(-hw, zt, -hw, zt - r); sh.lineTo(-hw, zb + r); sh.quadraticCurveTo(-hw, zb, -hw + r, zb);
  for (const sg of [-1, 1]) { // leg holes
    const h = new THREE.Path();
    h.absellipse(sg * 0.42, zb + 0.42, 0.2, 0.3, 0, Math.PI * 2, false, 0);
    sh.holes.push(h);
  }
  return sh;
}
function shapeOnPlane(shape, s, uvAngle, dens) {
  const g = new THREE.ShapeGeometry(shape, 24);
  const pos = g.attributes.position, uv = [];
  const th = uvAngle * Math.PI / 180, c = Math.cos(th), sn = Math.sin(th);
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getX(i), z = pos.getY(i);
    const v = P(s, y, z); pos.setXYZ(i, v.x, v.y, v.z);
    uv.push((z * c - y * sn) * dens, (y * c + z * sn) * dens);
  }
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
}
export function buildBulkhead(book) {
  const pn = book.panel, grp = new THREE.Group(), meshes = [];
  const core = new THREE.Mesh(new THREE.ExtrudeGeometry(bulkheadShape(pn), { depth: pn.coreIn * IN, bevelEnabled: false, curveSegments: 24 }), coreMaterial('PVC'));
  // extrude is in local XY (y,z) along +Z(local) -> map: x=y_ft, y=z_ft, z=s
  core.geometry.scale(FTM, FTM, FTM);
  core.position.set(0, 0, (pn.s - pn.coreIn * IN / 2) * FTM);
  core.userData = { core: true, info: book.core, label: 'PVC core' };
  grp.add(core);
  const rank = { '-1': 0, 1: 0 };
  for (const p of book.plies) {
    rank[p.side] += 1;
    const r = rank[p.side], s = pn.s + p.side * (pn.coreIn * IN / 2 + 0.002 * r);
    let shape;
    if (p.region === 'face') shape = bulkheadShape(pn);
    else {
      shape = new THREE.Shape();
      const zt = pn.top - 0.08, w = p.mat === 'UNI' ? 0.15 : 0.3;
      for (const sg of [-1, 1]) {
        const sub = new THREE.Shape();
        sub.moveTo(sg * 0.6 - 0.18, zt - w); sub.lineTo(sg * 0.6 + 0.18, zt - w); sub.lineTo(sg * 0.6 + 0.18, zt); sub.lineTo(sg * 0.6 - 0.18, zt); sub.closePath();
        if (sg < 0) shape = sub; else shape = [shape, sub];
      }
    }
    const shapes = Array.isArray(shape) ? shape : [shape];
    const geos = shapes.map((sh) => shapeOnPlane(sh, s, p.angle, p.mat === 'UNI' ? 10 : 7));
    const geo = geos.length > 1 ? mergeGeos(geos) : geos[0];
    const m = new THREE.Mesh(geo, plyMaterial(p));
    m.userData = { ply: p, dir: P(p.side, 0, 0).normalize(), gap: 0.13 * r, label: p.id };
    grp.add(m); meshes.push(m);
  }
  return { group: grp, meshes, core };
}
function mergeGeos(geos) {
  const pos = [], uv = [], idx = [];
  let off = 0;
  for (const g of geos) {
    const p = g.attributes.position, u = g.attributes.uv;
    for (let i = 0; i < p.count; i++) { pos.push(p.getX(i), p.getY(i), p.getZ(i)); uv.push(u.getX(i), u.getY(i)); }
    const ix = g.index ? g.index.array : [...Array(p.count).keys()];
    for (const i of ix) idx.push(i + off);
    off += p.count;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}

// ---------------------------------------------------------------- main gear leg (right)
/** one-piece bow: v ∈ [−1, 1] along the bow (±1 = axles). Returns [s, y, z] (ft) on the centre-line. */
export function gearPath(v) { const q = gearBow(v); return [q.s, q.y, q.z]; }
const legU = (v) => Math.max(0, gearBow(v).u);
function gearFrame(v) {
  const a = gearPath(Math.max(-1, v - 0.004)), b = gearPath(Math.min(1, v + 0.004));
  const T = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]).normalize(); // (s,y,z)
  const Wd = new THREE.Vector3(1, 0, 0);
  const N = new THREE.Vector3().crossVectors(T, Wd).normalize();
  if (N.z < 0) N.negate();
  return { T, W: Wd, N };
}
let GSEC = (u) => ({ w: lerp(GEO.gear.w[0], GEO.gear.w[1], u), t: lerp(1.5, 0.78, u) });
export function setGearSection(f) { GSEC = f; }
const gW = (v) => GSEC(legU(v)).w * IN, gT = (v) => GSEC(legU(v)).t * IN;
/** v-range of a pack that runs out to leg fraction uEnd on both legs */
const vOf = (uEnd) => { const vc = gearBowVc(); return vc + (1 - vc) * uEnd; };
const steel = () => new THREE.MeshStandardMaterial({ color: 0xb8bec6, metalness: 0.7, roughness: 0.35 });
const alu = () => new THREE.MeshStandardMaterial({ color: 0xd6dbe1, metalness: 0.5, roughness: 0.4 });
export function buildGear(book) {
  const grp = new THREE.Group(), meshes = [];
  let up = 0, dn = 0, ru = 0, rd = 0;
  const pk = book.plies.filter((p) => p.region === 'pack');
  const tPack = (p) => p.plies * MAT.UNI.t * IN;
  const NS = 120;
  for (const p of book.plies) {
    let geo, dir, gap;
    if (p.region === 'pack') {
      const top = p.packIndex % 2 === 0, off = top ? up : -dn;
      if (top) { up += tPack(p); ru += 1; } else { dn += tPack(p); rd += 1; }
      const ve = vOf(p.u[1]);
      geo = grid(NS, 2, (u, v) => {
        const vv = lerp(-ve, ve, u), c = gearPath(vv), f = gearFrame(vv);
        const scale = gT(vv) / gT(0); // taper squeezes the stack
        const o = (top ? off + tPack(p) : off - tPack(p)) * scale, w = gW(vv) * lerp(-0.5, 0.5, v);
        return P(c[0] + f.N.x * o + w, c[1] + f.N.y * o, c[2] + f.N.z * o);
      }, (u, v) => [lerp(-ve, ve, u) * 7, v * gW(0)], 0, 10);
      dir = P(0, 0, top ? 1 : -1).normalize(); gap = 0.1 * (top ? ru : rd);
    } else if (p.region === 'tab') { // UNI straps over a steel tube on top of the bow at each mount
      const geos = [];
      for (const sg of [-1, 1]) {
        const v0 = sg * gearBowVc(), c = gearPath(v0), ht = gT(v0) / 2, R0 = GEO.gear.tubeD / 2 * IN + 0.012, L = GEO.gear.tabL * IN;
        geos.push(grid(16, 18, (u, v) => {
          // strap: flat on the bow top either side, wrapping over the tube (half-cylinder) in the middle
          const a = Math.PI * v, ylat = -Math.cos(a) * (R0 + 0.06 * (v < 0.15 || v > 0.85 ? 1 : 0)), zz = ht + R0 + Math.sin(a) * R0;
          return P(c[0] + lerp(-L / 2, L / 2, u), c[1] + ylat, c[2] + zz);
        }, (u, v) => [u * L * 12, v * 6], 0, 10));
      }
      geo = mergeGeos(geos);
      dir = P(0, 0, 1).normalize(); gap = 1.0;
    } else {
      const rr = book.plies.indexOf(p);
      geo = (() => {
        const rings = [];
        for (let i = 0; i <= NS; i++) {
          const vv = lerp(-1, 1, i / NS), c = gearPath(vv), f = gearFrame(vv), hw = gW(vv) / 2 + 0.01 * (rr % 3), ht = gT(vv) / 2 + 0.01;
          rings.push([[-hw, -ht], [hw, -ht], [hw, ht], [-hw, ht]].map(([w, n]) => P(c[0] + w + f.N.x * n, c[1] + f.N.y * n, c[2] + f.N.z * n)));
        }
        return loft(rings, false);
      })();
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Array(geo.attributes.position.count * 2).fill(0).map((_, i) => (i % 2 ? i * 0.01 : i * 0.013)), 2));
      dir = P(0, 0, -1).normalize(); gap = 0.9 + 0.15 * (rr - pk.length);
    }
    const m = new THREE.Mesh(geo, plyMaterial(p));
    m.userData = { ply: p, dir, gap, label: p.id };
    grp.add(m); meshes.push(m);
  }
  // how it fits: steel tubes in the tabs, aluminium extrusions floxed into the fuselage bottom corners
  // (forward and aft of each tab), AN6 bolts fore-aft through extrusion–tube–extrusion, and the fuselage
  // bottom (ghost) with its hard-point pads
  const ctx = new THREE.Group(), ctxLabels = [], g = GEO.gear;
  for (const sg of [-1, 1]) {
    const v0 = sg * gearBowVc(), c = gearPath(v0), ht = gT(v0) / 2, R0 = g.tubeD / 2 * IN, zt = c[2] + ht + R0 + 0.012;
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(R0 * FTM, R0 * FTM, (g.tabL * IN + 0.02) * FTM, 20), steel());
    tube.rotation.x = Math.PI / 2; tube.position.copy(P(c[0], c[1], zt)); ctx.add(tube);
    const fb = fusAt(g.s).bot, ext = [];
    for (const fa of [-1, 1]) { // extrusion: angle bracket from the fuselage bottom corner down to the tube height
      const h = Math.max(0.12, fusPanel(g.s, 'belly').at(0).z + 0.02 - (zt - 0.06));
      const e = new THREE.Mesh(new THREE.BoxGeometry(0.16 * FTM, h * FTM, 0.12 * FTM), alu());
      e.position.copy(P(c[0] + fa * (g.tabL * IN / 2 + 0.07), c[1], zt - 0.06 + h / 2)); ctx.add(e); ext.push(e);
    }
    const bolt = new THREE.Mesh(new THREE.CylinderGeometry(g.boltD / 2 * IN * FTM, g.boltD / 2 * IN * FTM, (g.tabL * IN + 0.42) * FTM, 12), steel());
    bolt.rotation.x = Math.PI / 2; bolt.position.copy(P(c[0], c[1], zt)); ctx.add(bolt);
    if (sg > 0) { ctxLabels.push([ext[0], 'Mount extrusion (floxed into the fuselage)']); ctxLabels.push([tube, `Steel tube in the UNI tab · AN6 bolts fore-aft`]); }
    void fb;
  }
  { // fuselage bottom around the gear station, as a ghost, so the bow's fit under the belly is visible
    const rings = [];
    for (let i = 0; i <= 12; i++) { const sx = lerp(g.s - 1.6, g.s + 1.6, i / 12), o = fusOutline(sx, 64, 0.004); rings.push(o.pts.map(([y, z]) => P(sx, y, z))); }
    ctx.add(new THREE.Mesh(loft(rings, false), new THREE.MeshBasicMaterial({ color: 0xb8c8da, transparent: true, opacity: 0.08, depthWrite: false, side: THREE.DoubleSide })));
    const o = fusOutline(g.s, 64, -0.02);
    ctx.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(o.pts.map(([y, z]) => P(g.s, y, z))), new THREE.LineBasicMaterial({ color: 0x7fb0e6 })));
    const anchor = new THREE.Object3D(); anchor.position.copy(P(g.s, 0, o.f.top + 0.1)); ctx.add(anchor);
    ctxLabels.push([anchor, `Fuselage at the gear station (FS ${(g.s * 12).toFixed(0)})`]);
  }
  grp.add(ctx);
  return { group: grp, meshes, core: null, ctx, ctxLabels };
}

// ---------------------------------------------------------------- tooling
const toolMat = (c, o = 1) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, metalness: c === 0xb8bec6 ? 0.6 : 0, transparent: o < 1, opacity: o, side: THREE.DoubleSide });
function plateAt(F, y, outer, hole, mat) {
  // outer/hole: arrays of [x/c, ord/c]; mapped into the section plane at span y
  const sh = new THREE.Shape(outer.map(([x, o]) => new THREE.Vector2(x, o)));
  if (hole) sh.holes.push(new THREE.Path(hole.map(([x, o]) => new THREE.Vector2(x, o))));
  const g = new THREE.ShapeGeometry(sh, 32);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) { const v = P(...F.pt(y, pos.getX(i), pos.getY(i))); pos.setXYZ(i, v.x, v.y, v.z); }
  g.computeVertexNormals();
  return new THREE.Mesh(g, mat);
}
function airfoilPoly(F, inflate = 0, nx = 40, y = null) {
  const pts = [], yy = y ?? (F.span[0] + F.span[1]) / 2;
  for (let k = 0; k <= nx; k++) { const x = cosX(k, nx); pts.push([x, afAt(F, yy, x).yu + inflate]); }
  for (let k = nx - 1; k >= 1; k--) { const x = cosX(k, nx); pts.push([x, afAt(F, yy, x).yl - inflate]); }
  return pts;
}
export function buildTool(book, labels) {
  const grp = new THREE.Group();
  const add = (m, txt) => { grp.add(m); if (txt && labels) labels.push([m, txt]); return m; };
  const kind = book.tool.kind;
  if (kind === 'hotwire' || kind === 'cnc') {
    const F = FRAMES[book.frame], [y0, y1] = F.span, nb = book.id === 'wing' ? 3 : book.id === 'canard' ? 4 : 1;
    let ext = 0; for (let k = 0; k <= 20; k++) { const a = afAt(F, (y0 + y1) / 2, k / 20); ext = Math.max(ext, a.yu, -a.yl); }
    const tmpl = toolMat(0xb8bec6), foam = toolMat(0x9cc7f0, 0.18), cradle = toolMat(0x8a6a48);
    const hole = airfoilPoly(F);
    // trough notch at the spar
    const outer = (pad) => [[-0.12 - pad, -ext - 0.08], [1.12 + pad, -ext - 0.08], [1.12 + pad, ext + 0.12], [-0.12 - pad, ext + 0.12]];
    for (let k = 0; k <= nb; k++) {
      const y = lerp(y0, y1, k / nb);
      const ys = k === 0 ? [y + 0.02] : k === nb ? [y - 0.02] : [y - 0.03, y + 0.03];
      ys.forEach((yy, j) => add(plateAt(F, yy, outer(0), hole, tmpl), j === 0 && (k === 0 || k === nb) ? `${kind === 'cnc' ? 'CNC check plate' : 'Hot-wire template'} (${k === 0 ? 'root' : 'tip'})` : null));
    }
    for (let k = 0; k < nb; k++) { // foam blocks
      const ya = lerp(y0, y1, k / nb) + 0.04, yb = lerp(y0, y1, (k + 1) / nb) - 0.04;
      const rings = [];
      for (const y of [ya, yb]) rings.push([[-0.06, -ext * 1.1], [1.06, -ext * 1.1], [1.06, ext * 1.2], [-0.06, ext * 1.2]].map(([x, o]) => P(...F.pt(y, x, o))));
      add(new THREE.Mesh(loft(rings), foam), k === 0 ? `${MAT[book.core.mat].label} ${kind === 'cnc' ? 'block, CNC-milled' : 'foam block'}${nb > 1 ? ` (1 of ${nb})` : ''}` : null);
    }
    if (!F.thickAxis[1]) { // leveling cradles under the lower surface
      for (const u of [0.08, 0.5, 0.92]) {
        const y = lerp(y0, y1, u), low = [];
        for (let k = 0; k <= 30; k++) { const x = lerp(-0.05, 1.05, k / 30); low.push([x, afAt(F, y, Math.min(1, Math.max(0, x))).yl - 0.004]); }
        const base = -ext - 0.55;
        const poly = [[-0.05, base], [1.05, base], ...low.reverse()];
        add(plateAt(F, y, poly, null, cradle), u === 0.5 ? kind === 'cnc' ? 'Cure-fixture cradle (sets twist)' : 'Leveling cradle (sets twist)' : null);
      }
    }
  } else if (kind === 'beamjig') {
    const b = book.box;
    const board = new THREE.Mesh(new THREE.BoxGeometry(2 * (b.half + 0.6) * FTM, 0.08 * FTM, 1.4 * FTM), toolMat(0xc9a77c));
    board.position.copy(P(b.s, 0, b.z - b.h / 2 - 0.06));
    add(board, 'Level jig board');
    for (const sg of [-1, 1]) {
      const pl = new THREE.Mesh(new THREE.BoxGeometry(0.06 * FTM, (b.h + 0.6) * FTM, 0.9 * FTM), toolMat(0xb8bec6));
      pl.position.copy(P(b.s, sg * (b.half + 0.08), b.z + 0.2));
      add(pl, sg > 0 ? 'End plate (locates wing fittings)' : null);
    }
    const cl = new THREE.Mesh(new THREE.BoxGeometry(0.02 * FTM, 0.01 * FTM, 1.3 * FTM), toolMat(0x2a6fdb));
    cl.position.copy(P(b.s, 0, b.z - b.h / 2 - 0.015));
    add(cl, 'Centre-line');
  } else if (kind === 'table' || kind === 'flat') {
    // the part is shown flat on the table in the tooling view (see layoutFlat)
    const L = kind === 'table' ? 12.5 : 3.2, Wt = kind === 'table' ? 3.4 : 3.0;
    const top = new THREE.Mesh(new THREE.BoxGeometry(Wt * FTM, 0.1 * FTM, L * FTM), toolMat(0x59636e));
    top.position.set(0, -0.05 * FTM, 0);
    add(top, kind === 'table' ? 'Flat melamine layup table' : 'Flat glassing table');
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.15 * FTM, 2.6 * FTM, 0.15 * FTM), toolMat(0x7a6650));
      leg.position.set(x * (Wt / 2 - 0.2) * FTM, -1.4 * FTM, z * (L / 2 - 0.3) * FTM);
      grp.add(leg);
    }
    if (kind === 'table') for (let k = 0; k < 7; k++) {
      const blk = new THREE.Mesh(new THREE.BoxGeometry(0.25 * FTM, 0.2 * FTM, 0.3 * FTM), toolMat(0x5c84c4));
      blk.position.set(-(Wt / 2 - 0.25) * FTM, 0.1 * FTM, lerp(-5.2, 5.2, k / 6) * FTM);
      add(blk, k === 3 ? 'Longeron clamping blocks' : null);
    }
  } else if (kind === 'ribjig') { // templates at the rib stations, standing on the fuselage side / CS spar
    const F = FRAMES[book.frame], tm = toolMat(0xb8bec6, 0.85);
    for (const rb of book.plies.filter((p) => p.region === 'rib')) {
      const pts = [];
      for (let k = 0; k <= 30; k++) { const x = cosX(k, 30); pts.push([x, afAt(F, rb.y, x).yu + 0.02]); }
      for (let k = 29; k >= 1; k--) { const x = cosX(k, 30); pts.push([x, afAt(F, rb.y, x).yl - 0.02]); }
      const outer = [[-0.05, -0.12], [1.05, -0.12], [1.05, 0.14], [-0.05, 0.14]];
      add(plateAt(F, rb.y - 0.03, outer, pts, tm), rb.note.replace(/ \(.*\)/, '') + ' template');
    }
    const o = fusOutline(9.0, 64, 0);
    void o;
  } else if (kind === 'plug') { // male plug for the cowl
    const rings = [];
    for (let i = 0; i <= 30; i++) { const sx = lerp(book.panel.s0, book.panel.s1, i / 30), o = fusOutline(sx, 48, -0.03); rings.push(o.pts.map(([y, z]) => P(sx, y, z))); }
    add(new THREE.Mesh(loft(rings), toolMat(0xc9a77c)), 'Foam male plug (faired, waxed)');
    const base = new THREE.Mesh(new THREE.BoxGeometry(2.6 * FTM, 0.1 * FTM, 4.2 * FTM), toolMat(0x59636e));
    base.position.copy(P((book.panel.s0 + book.panel.s1) / 2, 0, 1.75)); add(base, 'Plug stand');
  } else if (kind === 'mold') {
    const half = (sign, lift) => {
      const rings = [];
      for (let i = 0; i <= 80; i++) {
        const u = lerp(-1, 1, i / 80), c = gearPath(u), f = gearFrame(u), hw = gW(u) / 2, ht = gT(u) / 2, Wm = gW(0) / 2 + 0.25, Hm = 0.35;
        const poly = [[-Wm, sign * Hm], [Wm, sign * Hm], [Wm, 0], [hw, 0], [hw, sign * ht], [-hw, sign * ht], [-hw, 0], [-Wm, 0]];
        rings.push(poly.map(([w, n]) => P(c[0] + w + f.N.x * (n + sign * lift), c[1] + f.N.y * (n + sign * lift), c[2] + f.N.z * (n + sign * lift))));
      }
      return new THREE.Mesh(loft(rings), toolMat(sign < 0 ? 0x4b6075 : 0x6f8aa3, sign < 0 ? 1 : 0.55));
    };
    add(half(-1, 0), 'Lower mold half (cavity = finished bow, axle to axle)');
    add(half(1, 0.9), 'Upper mold half (lifted)');
  }
  return grp;
}
