// ngview.js — the articulated nose gear in the 3D view. Every wp11 part is drawn from its own primitives at the gear-down
// pose and moved each frame by the kinematics in parts/ng_layout.js: the strut, NG-6, NG-3/NG-4, strut cover, fork and wheel
// swing about the hinge; the NG-64 crank and worm wheel about the cross-shaft; the worm and its shaft, and the U-joint,
// panel shaft and crank handle, about their own axes; the spring link is re-drawn between its pins (cartridge and rod
// telescoping as the die spring is squeezed through dead centre).
import * as THREE from 'three';
import { P, FTM } from './geom.js';
import { partGroup } from './sysgeom.js';
import { NG, KIN, DOOR, noseGearPose, doorAxisZ, hornTip, d2r } from './parts/ng_layout.js';

const linkMat = new THREE.MeshStandardMaterial({ color: 0x7aa95c, metalness: 0.5, roughness: 0.4 });
const rodMat = new THREE.MeshStandardMaterial({ color: 0xc9ced6, metalness: 0.8, roughness: 0.25 });
const about = (pt, axis, ang) => { const p = P(...pt); return new THREE.Matrix4().makeTranslation(p.x, p.y, p.z).multiply(new THREE.Matrix4().makeRotationAxis(axis, ang)).multiply(new THREE.Matrix4().makeTranslation(-p.x, -p.y, -p.z)); };
const X = new THREE.Vector3(1, 0, 0);    // three.js x = model lateral (y)
const dirOf = (a, b) => P(...b).sub(P(...a)).normalize();

export function buildNoseGear(parts) {
  const root = new THREE.Group(); root.name = 'nose-gear';
  const bodies = { fixed: [], strut: [], arm: [], worm: [], crank: [], doorL: [], doorR: [], followerL: [], followerR: [] };
  for (const p of parts) {
    if (!p.ngBody || p.meshes || p.ngBody === 'link') continue;
    // a part's primitives may ride on different bodies (e.g. a door's tube turns, its bracket does not)
    const by = new Map(); for (const pr of p.geo) { const b = pr.body || p.ngBody; if (b === 'cable') continue; if (!by.has(b)) by.set(b, []); by.get(b).push(pr); }
    for (const [b, geo] of by) { const g = partGroup(p, geo); g.matrixAutoUpdate = false; root.add(g); (bodies[b] || bodies.fixed).push(g); }
  }
  // spring link: cartridge (from the NG-64 pin) and rod (from the NG-3 pin), plus the two rod-end eyes
  const cyl = (r, m) => { const c = new THREE.Mesh(new THREE.CylinderGeometry(r * FTM, r * FTM, 1, 14), m); c.userData.pn = 'LEZ-32-213'; c.userData.orig = m; root.add(c); return c; };
  const cart = cyl(0.045, linkMat), rod = cyl(0.021, rodMat), eyeB = cyl(0.03, rodMat), eyeC = cyl(0.03, rodMat);
  const place = (m, a, b) => { const A = P(...a), B = P(...b), d = new THREE.Vector3().subVectors(B, A), L = d.length(); m.position.copy(A).addScaledVector(d, 0.5); m.scale.set(1, Math.max(L, 1e-4), 1); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); };
  const wormAxis = new THREE.Vector3(0, 0, 1), crankAxis = dirOf(NG.ujoint, NG.crank);
  // door closing cables (lever tip → fairlead → horn), one per side
  const cableMat = new THREE.MeshStandardMaterial({ color: 0xd0d4da, metalness: 0.8, roughness: 0.3 });
  const cables = [-1, 1].map((sg) => [0, 1].map(() => { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 1, 6), cableMat); c.userData.pn = 'LEZ-32-232'; c.userData.orig = cableMat; root.add(c); return c; }));
  const doorAxis = (sg) => { const a = [DOOR.quadS, sg * DOOR.hingeY, doorAxisZ(DOOR.quadS)], b = [DOOR.s1, sg * DOOR.hingeY, doorAxisZ(DOOR.s1)]; return { a, dir: dirOf(a, b) }; };
  const DA = { L: doorAxis(-1), R: doorAxis(1) }, LV = DOOR.lever;
  let state = { t: 0 };
  function set(t) {
    const q = noseGearPose(t), dPhi = (q.phi - NG.phi0) * d2r, dA = (q.alpha - KIN.ad) * d2r, cr = q.crank * d2r;
    // rotation in the s–z plane by +θ (toward +z from +s) is a rotation about three.js x by −θ
    const Ms = about(NG.O, X, -dPhi), Ma = about(NG.A, X, -dA), Mw = about([NG.A[0], NG.wormY, NG.wormZ], wormAxis, cr), Mc = about(NG.ujoint, crankAxis, cr);
    for (const g of bodies.fixed) g.matrix.identity();
    for (const g of bodies.strut) g.matrix.copy(Ms);
    for (const g of bodies.arm) g.matrix.copy(Ma);
    for (const g of bodies.worm) g.matrix.copy(Mw);
    for (const g of bodies.crank) g.matrix.copy(Mc);
    const th = q.door * d2r, ml = about([LV.pivot[0], 0, LV.pivot[1]], X, -q.lever * d2r);
    for (const g of bodies.doorR) g.matrix.copy(about(DA.R.a, DA.R.dir, th));
    for (const g of bodies.doorL) g.matrix.copy(about(DA.L.a, DA.L.dir, -th));
    for (const g of [...bodies.followerL, ...bodies.followerR]) g.matrix.copy(ml);
    for (const k in bodies) for (const g of bodies[k]) g.matrixWorldNeedsUpdate = true;
    // cables: follower tip (turned with the lever) → fairlead → door horn
    const lp = q.lever * d2r, tipV = [LV.tip[0] - LV.pivot[0], LV.tip[1] - LV.pivot[1]], tip = [LV.pivot[0] + tipV[0] * Math.cos(lp) - tipV[1] * Math.sin(lp), LV.pivot[1] + tipV[0] * Math.sin(lp) + tipV[1] * Math.cos(lp)];
    [-1, 1].forEach((sg, i) => { const y = sg * DOOR.camY, fl = [DOOR.fairlead[0], y, DOOR.fairlead[1]], h = hornTip(q.door, sg); place(cables[i][0], [tip[0], y, tip[1]], fl); place(cables[i][1], fl, h); });
    const B = q.B, C = q.C, v = [C[0] - B[0], 0, C[2] - B[2]], L = Math.hypot(v[0], v[2]), u = v.map((x) => x / L);
    const cartLen = 0.55 * KIN.l, rodLen = 0.62 * KIN.l;
    place(cart, B, [B[0] + u[0] * cartLen, 0, B[2] + u[2] * cartLen]);
    place(rod, C, [C[0] - u[0] * rodLen, 0, C[2] - u[2] * rodLen]);
    place(eyeB, [B[0], -0.035, B[2]], [B[0], 0.035, B[2]]); place(eyeC, [C[0], -0.035, C[2]], [C[0], 0.035, C[2]]);
    state = q;
    return q;
  }
  set(0);
  return { group: root, set, get state() { return state; } };
}
