// sysgeom.js — 3D for system parts: every primitive in a part record becomes a mesh (boxes, cylinders,
// welded-tube frames, routed lines as tubes), coloured by route class or ATA chapter.
import * as THREE from 'three';
import { filletPts } from './systems.js';
import { P, FTM } from './geom.js';
import { faceCanvas } from './panelfaces.js';

export const CLASS_COLOURS = { fuel: 0xe2554f, oil: 0x8a5a2b, brake: 0x5aa0d8, pitot: 0x3ecf8e, air: 0xbcd6ee, power: 0xf2a93b, signal: 0xd6c06b, rf: 0xb58ad6, cable: 0x9aa9b8, pushrod: 0xc9ced6, exhaust: 0x9b5a3c, ign: 0x3c4fa0, ground: 0x6b7a8f };
export const ATA_COLOURS = { 21: 0xbcd6ee, 23: 0xb58ad6, 24: 0xf2a93b, 25: 0x8f7a63, 27: 0xc9ced6, 28: 0xe2554f, 31: 0x6b7a8f, 32: 0x5aa0d8, 33: 0xffe28a, 34: 0x3ecf8e, 52: 0xa9d0ff,
  61: 0x8a5a2b, 71: 0x9aa9b8, 72: 0x7f8c99, 73: 0xe2554f, 74: 0xd6c06b, 76: 0xc9ced6, 77: 0x6b7a8f, 78: 0x9b5a3c, 79: 0x8a5a2b, 80: 0x7f8c99 };
const MATS = new Map();
function mat(hex, opts = {}) {
  const k = `${hex}|${opts.metal ? 1 : 0}|${opts.op ?? 1}|${opts.two ? 1 : 0}`;
  if (!MATS.has(k)) MATS.set(k, new THREE.MeshStandardMaterial({ color: hex, roughness: opts.metal ? 0.35 : 0.6, metalness: opts.metal ? 0.6 : 0.05, transparent: (opts.op ?? 1) < 1, opacity: opts.op ?? 1, side: opts.two ? THREE.DoubleSide : THREE.FrontSide }));
  return MATS.get(k);
}
/** closed loft through quadrilateral sections (each 4 model-frame corners, same winding): tapered bars, fairings */
function loftGeom(secs) {   // sections of n corners each (same n, same winding); convex end caps fanned from the centroid
  const S = secs.map((q) => q.map((c) => P(...c))), n = S[0].length, pos = [], tri = (a, b, c) => pos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z), quad = (a, b, c, d) => { tri(a, b, c); tri(a, c, d); };
  for (let i = 0; i < S.length - 1; i++) for (let k = 0; k < n; k++) quad(S[i][k], S[i][(k + 1) % n], S[i + 1][(k + 1) % n], S[i + 1][k]);
  for (const [q, flip] of [[S[0], true], [S.at(-1), false]]) { const c = q.reduce((a, v) => a.clone().add(v), new THREE.Vector3()).multiplyScalar(1 / n); for (let k = 0; k < n; k++) flip ? tri(c, q[(k + 1) % n], q[k]) : tri(c, q[k], q[(k + 1) % n]); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals(); return g;
}
const Z3 = new THREE.Vector3(0, 0, 1), axisQ = (ax) => new THREE.Quaternion().setFromUnitVectors(Z3, P(...ax).normalize());
/** spur / worm-wheel blank with teeth, extruded along its axis */
function gearGeom(rp, teeth, w, module = null) {
  const m = module || (2 * rp / teeth), ra = rp + m, rd = rp - 1.25 * m, sh = new THREE.Shape(), N = teeth;
  for (let i = 0; i < N; i++) { const a = (i / N) * 2 * Math.PI, d = (2 * Math.PI) / N, pts = [[rd, a], [rd, a + d * 0.18], [ra, a + d * 0.32], [ra, a + d * 0.52], [rd, a + d * 0.68], [rd, a + d]];
    pts.forEach(([r, t], k) => { const x = r * Math.cos(t) * FTM, y = r * Math.sin(t) * FTM; i === 0 && k === 0 ? sh.moveTo(x, y) : sh.lineTo(x, y); }); }
  const g = new THREE.ExtrudeGeometry(sh, { depth: w * FTM, bevelEnabled: false, curveSegments: 1 }); g.translate(0, 0, -w * FTM / 2); return g;
}
/** plate profile in the s–z plane, extruded across y (holes allowed) */
function xpolyGeom(pr) {
  const sh = new THREE.Shape(pr.pts.map(([s, z]) => new THREE.Vector2(s * FTM, z * FTM)));
  for (const h of pr.holes || []) sh.holes.push(new THREE.Path(h.map(([s, z]) => new THREE.Vector2(s * FTM, z * FTM))));
  const g = new THREE.ExtrudeGeometry(sh, { depth: (pr.y1 - pr.y0) * FTM, bevelEnabled: false, curveSegments: 6 });
  g.applyMatrix4(new THREE.Matrix4().set(0, 0, 1, pr.y0 * FTM, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1)); return g;
}
const METAL = new Set(['4130', 'steel', 'stainless', '6061', '2024', 'aluminium', 'copper', 'brass', 'bronze', '301']);
function cylBetween(a, b, r, m) {
  const A = P(...a), B = P(...b), d = new THREE.Vector3().subVectors(B, A), L = d.length();
  const g = new THREE.CylinderGeometry(r * FTM, r * FTM, Math.max(L, 1e-4), r > 0.15 ? 40 : r > 0.05 ? 24 : 14);
  const mesh = new THREE.Mesh(g, m);
  mesh.position.copy(A).addScaledVector(d, 0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  return mesh;
}
/** one THREE.Group per part (userData.pn), all under one group */
export function buildSystems(parts) {
  const root = new THREE.Group();
  root.name = 'systems';
  // parts the airframe model already draws (GLB meshes), or that the explorer animates, keep their geometry for mass only
  // primitives on a moving body (the canopy and its latch) go in their own groups; the app moves them with the canopy
  const MOVING = new Set(['canopy', 'latchHandle', 'latchRod']); root.userData.canopy = [];
  for (const p of parts) {
    const geo = p.meshes || p.hide3D || p.anim ? [] : p.geo;
    root.add(partGroup(p, geo.filter((pr) => !MOVING.has(pr.body))));
    for (const body of MOVING) { const g = geo.filter((pr) => pr.body === body); if (!g.length) continue; const grp = partGroup(p, g); grp.matrixAutoUpdate = false; grp.userData.body = body; root.add(grp); root.userData.canopy.push(grp); }
  }
  return root;
}
/** meshes for a part's primitives (world positions), one group tagged with the part number */
export function partGroup(p, geo = p.geo) {
  {
    const g = new THREE.Group(); g.userData.pn = p.pn;
    for (const pr of geo) {
      if (pr.draw === false) continue;   // mass / containment primitive; a smoother visual primitive stands in for it
      const hex = pr.colour ?? (pr.cls ? CLASS_COLOURS[pr.cls] : ATA_COLOURS[p.ata] ?? 0x9aa9b8), m = mat(hex, { metal: METAL.has(pr.mat || p.material), op: pr.op });
      if (pr.t === 'box') {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(pr.d[1] * FTM, pr.d[2] * FTM, pr.d[0] * FTM), m);
        mesh.position.copy(P(...pr.c)); g.add(mesh);
      } else if (pr.t === 'obox') { // box pitched about the lateral axis (nose-up positive), e.g. an inclined filter element
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(pr.d[1] * FTM, pr.d[2] * FTM, pr.d[0] * FTM), m);
        mesh.position.copy(P(...pr.c)); mesh.rotation.x = (pr.pitch || 0) * Math.PI / 180; g.add(mesh);
      } else if (pr.t === 'cyl') g.add(cylBetween(pr.a, pr.b, pr.r, m));
      else if (pr.t === 'loft') g.add(new THREE.Mesh(loftGeom(pr.secs), mat(hex, { metal: METAL.has(pr.mat || p.material), op: pr.op, two: true })));
      else if (pr.t === 'torus') { const mesh = new THREE.Mesh(new THREE.TorusGeometry(pr.R * FTM, pr.r * FTM, 14, 48), m); mesh.position.copy(P(...pr.c)); mesh.quaternion.copy(axisQ(pr.axis)); g.add(mesh); }
      else if (pr.t === 'gear') { const mesh = new THREE.Mesh(gearGeom(pr.rp, pr.teeth, pr.w), m); mesh.position.copy(P(...pr.c)); mesh.quaternion.copy(axisQ(pr.axis)); g.add(mesh); }
      else if (pr.t === 'xpoly') g.add(new THREE.Mesh(xpolyGeom(pr), mat(hex, { metal: METAL.has(pr.mat || p.material), op: pr.op, two: true })));
      else if (pr.t === 'sphere') { const mesh = new THREE.Mesh(new THREE.SphereGeometry(pr.r * FTM, 16, 12), m); mesh.position.copy(P(...pr.c)); g.add(mesh); }
      else if (pr.t === 'frame') for (const [a, b, od] of pr.members) g.add(cylBetween(pr.nodes[a], pr.nodes[b], od / 24, m));
      else if (pr.t === 'path') {
        const r = (pr.drawR ?? Math.max(pr.dIn, 0.25) / 2) / 12 * FTM;
        if (pr.pts.length === 2) g.add(cylBetween(pr.pts[0], pr.pts[1], (pr.drawR ?? Math.max(pr.dIn, 0.25) / 2) / 12, m));
        else if (pr.bendR) {   // filleted at its minimum bend radius: straight legs and true arcs, as built
          const fp = filletPts(pr.pts, pr.bendR).pts.map((q) => P(...q)), cp = new THREE.CurvePath();
          for (let k = 1; k < fp.length; k++) if (fp[k].distanceTo(fp[k - 1]) > 1e-5) cp.add(new THREE.LineCurve3(fp[k - 1], fp[k]));
          g.add(new THREE.Mesh(new THREE.TubeGeometry(cp, Math.max(16, fp.length * 3), r, 8, false), m));
        } else { const pts = pr.pts.map((q) => P(...q)); g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.2), Math.max(16, pts.length * 10), r, 8, false), m)); }
      }
    }
    g.traverse((o) => { if (o.isMesh) { o.userData.pn = p.pn; o.userData.orig = o.material; } });
    return g;
  }
}

/** instrument and switch faces (planes facing aft, toward the pilot): part of the cockpit, shown with or without the systems layer */
export function buildFaces(parts) {
  const root = new THREE.Group(); root.name = 'panel-faces';
  for (const p of parts) for (const f of p.faces || []) {
    const cv = faceCanvas(f); if (!cv) continue;
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(f.w * FTM, f.h * FTM), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
    mesh.position.copy(P(...f.c)); mesh.userData.pn = p.pn; mesh.userData.face = true; mesh.userData.spec = f; root.add(mesh);
  }
  return root;
}
/** redraw one face with a changed state (e.g. the gear position flag) */
export function redrawFace(mesh, patch) {
  const f = { ...mesh.userData.spec, ...patch }, cv = faceCanvas(f); if (!cv) return;
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  mesh.material.map.dispose(); mesh.material.map = tex; mesh.material.needsUpdate = true; mesh.userData.spec = f;
}
