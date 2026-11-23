// batcher.js — draw-call batching for the big static groups (the systems layer, the nose gear). The systems layer is
// ~1,300 small meshes in ~60 materials; drawn one by one that is ~1,300 draw calls a frame, which is what made orbiting
// stutter. Here every mesh in a group stays exactly where it was (picking, highlighting, hiding and part lookups all keep
// working on it), but it is moved to a layer the camera does not draw, and one merged mesh per material draws all of
// them instead. Each frame sync() looks at the meshes: a changed material or visibility rebuilds only the merged meshes
// it touches; a mesh that moves (canopy, gear legs, explode) leaves the batch for good and draws itself again.
import * as THREE from 'three';

export const HIDDEN_LAYER = 31;   // the camera never enables this layer; the app's raycaster does
const HID = 1 << HIDDEN_LAYER;
const EPS = 1e-7;
const noRaycast = () => {};

function eligible(o) {
  if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || o.isBatchedMesh || o.userData.__batch) return false;
  const m = o.material, g = o.geometry;
  if (!m || Array.isArray(m) || m.map || m.normalMap || m.alphaMap || m.aoMap || m.bumpMap || m.emissiveMap || m.vertexColors) return false;
  if (!g || !g.attributes.position || !g.attributes.normal || g.morphAttributes.position) return false;
  return !o.onBeforeRender || o.onBeforeRender === THREE.Object3D.prototype.onBeforeRender;
}

/** merge meshes (all one material) into one indexed geometry, positions and normals in the group's frame */
function merge(items) {
  let nv = 0, ni = 0;
  for (const it of items) { const g = it.o.geometry; nv += g.attributes.position.count; ni += g.index ? g.index.count : g.attributes.position.count; }
  const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), idx = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
  const nm = new THREE.Matrix3(); let v0 = 0, i0 = 0;
  for (const it of items) {
    const g = it.o.geometry, P = g.attributes.position, N = g.attributes.normal, e = it.rel.elements, n = P.count;
    nm.getNormalMatrix(it.rel); const q = nm.elements;
    for (let k = 0; k < n; k++) {
      const x = P.getX(k), y = P.getY(k), z = P.getZ(k), a = (v0 + k) * 3;
      pos[a] = e[0] * x + e[4] * y + e[8] * z + e[12]; pos[a + 1] = e[1] * x + e[5] * y + e[9] * z + e[13]; pos[a + 2] = e[2] * x + e[6] * y + e[10] * z + e[14];
      const u = N.getX(k), v = N.getY(k), w = N.getZ(k);
      let nx = q[0] * u + q[3] * v + q[6] * w, ny = q[1] * u + q[4] * v + q[7] * w, nz = q[2] * u + q[5] * v + q[8] * w;
      const l = Math.hypot(nx, ny, nz) || 1; nor[a] = nx / l; nor[a + 1] = ny / l; nor[a + 2] = nz / l;
    }
    if (g.index) { const I = g.index.array, c = g.index.count; for (let k = 0; k < c; k++) idx[i0 + k] = I[k] + v0; i0 += c; }
    else { for (let k = 0; k < n; k++) idx[i0 + k] = v0 + k; i0 += n; }
    v0 += n;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); out.setIndex(new THREE.BufferAttribute(idx, 1));
  out.computeBoundingSphere(); out.computeBoundingBox();
  return out;
}

/** a batcher for one group; call sync() once a frame before rendering (after the scene's matrices are current) */
export function batcher(group) {
  const state = new Map();     // mesh → { key, mat, rel, mw, dyn, mask, seen }
  const batches = new Map();   // key → merged mesh
  const inv = new THREE.Matrix4(), gw = new Float32Array(16), tmp = new THREE.Matrix4();
  let frame = 0, gMoved = true;
  const dirty = new Set();
  const same = (a, b) => { for (let i = 0; i < 16; i++) if (Math.abs(a[i] - b[i]) > EPS) return false; return true; };
  const release = (o, s) => { o.layers.mask = s.mask; };

  function visit(o, vis) {
    const v = vis && o.visible;
    if (o.isMesh && !o.userData.__batch) see(o, v);
    const ch = o.children; for (let i = 0; i < ch.length; i++) visit(ch[i], v);
  }
  function see(o, vis) {
    let s = state.get(o);
    if (!s) {
      if (!eligible(o)) { state.set(o, s = { dyn: true, seen: frame, mask: o.layers.mask, key: null }); return; }
      s = { key: null, mat: null, rel: new THREE.Matrix4(), mw: new Float32Array(16), dyn: false, mask: o.layers.mask, seen: frame, fresh: true };
      state.set(o, s);
    }
    s.seen = frame;
    if (s.dyn) return;
    // a mesh that moves relative to the group draws itself from now on
    const mwChanged = !same(o.matrixWorld.elements, s.mw);
    if (mwChanged || gMoved || s.fresh) {
      tmp.multiplyMatrices(inv, o.matrixWorld);
      if (!s.fresh && !same(tmp.elements, s.rel.elements)) { s.dyn = true; if (s.key) dirty.add(s.key); s.key = null; release(o, s); return; }
      s.rel.copy(tmp); s.mw.set(o.matrixWorld.elements); s.fresh = false;
    }
    if (o.material !== s.mat && !eligible(o)) { s.dyn = true; if (s.key) dirty.add(s.key); s.key = null; release(o, s); return; }
    const key = vis ? `${o.material.uuid}|${o.renderOrder}` : null;
    if (key !== s.key || o.material !== s.mat) { if (s.key) dirty.add(s.key); if (key) dirty.add(key); s.key = key; s.mat = o.material; }
    o.layers.mask = HID;   // drawn by its batch (or hidden); still hit by the app's raycaster
  }
  function rebuild(key) {
    const old = batches.get(key);
    if (old) { old.removeFromParent(); old.geometry.dispose(); batches.delete(key); }
    const items = [];
    for (const [o, s] of state) if (!s.dyn && s.key === key) items.push({ o, rel: s.rel });
    if (!items.length) return;
    const m = new THREE.Mesh(merge(items), items[0].o.material);
    m.userData.__batch = true; m.raycast = noRaycast; m.matrixAutoUpdate = false; m.renderOrder = items[0].o.renderOrder;
    group.add(m); m.updateMatrixWorld(true); batches.set(key, m);
  }
  return {
    group,
    /** returns true when a batch was rebuilt (the frame differs from the last) */
    sync() {
      frame++;
      if (!same(group.matrixWorld.elements, gw)) { gw.set(group.matrixWorld.elements); inv.copy(group.matrixWorld).invert(); gMoved = true; }
      { const ch = group.children; for (let i = 0; i < ch.length; i++) visit(ch[i], true); } gMoved = false;   // the group's own visibility hides the batches with it
      for (const [o, s] of state) if (s.seen !== frame) { if (!s.dyn) release(o, s); if (s.key) dirty.add(s.key); state.delete(o); }   // removed from the group
      if (!dirty.size) return false;
      for (const k of dirty) rebuild(k);
      dirty.clear();
      return true;
    },
    stats() { let dyn = 0, inb = 0; for (const s of state.values()) s.dyn ? dyn++ : inb++; return { batches: batches.size, batched: inb, own: dyn }; },
    dispose() { for (const [o, s] of state) release(o, s); for (const b of batches.values()) { b.removeFromParent(); b.geometry.dispose(); } state.clear(); batches.clear(); },
  };
}
