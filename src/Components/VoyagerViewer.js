import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import './ProteusViewer.css';

// Rutan Model 76 Voyager (N269VA), built 1:1 in Blender from Smithsonian dimensions,
// a published 3-view and NASA photos. Shares the scoped .pv- styles with the Proteus viewer.
// The GLB is served base64-encoded as a .txt file because the Amplify SPA rewrite rule
// only passes a short list of static extensions through.
const MODEL_URL = `${process.env.PUBLIC_URL}/voyager/voyager-glb.txt`;
const FT = 0.3048;
const D2R = Math.PI / 180;

const PUBLISHED = [
  ['Wingspan (with winglets)', 110.8],
  ['Canard span', 33.3],
  ['Boom length', 29.2],
  ['Fuselage length', 25.4],
  ['Height', 10.3],
];

function startViewer(root) {
  const $ = (k) => root.querySelector(`[data-pv="${k}"]`);
  const stage = $('stage');
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  stage.prepend(renderer.domElement);
  const labels = new CSS2DRenderer({ element: $('labels') });

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.75;

  const camera = new THREE.PerspectiveCamera(35, 1, 0.2, 800);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.maxPolarAngle = Math.PI * 0.495;
  controls.minDistance = 3;
  controls.maxDistance = 160;

  const sun = new THREE.DirectionalLight(0xfff1dc, 2.2);
  sun.position.set(-18, 30, 14);
  sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 4096);
  Object.assign(sun.shadow.camera, { left: -24, right: 24, top: 24, bottom: -24, near: 1, far: 100 });
  sun.shadow.bias = -0.0004;
  scene.add(sun, sun.target);
  scene.add(new THREE.HemisphereLight(0xbfd4ff, 0x3a3226, 0.55));

  const ground = new THREE.Mesh(new THREE.CircleGeometry(90, 96), new THREE.MeshStandardMaterial({ color: 0x5d6168, roughness: 0.95 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  const grid = new THREE.GridHelper(48.768, 16, 0x7a8698, 0x6b7584); // 160 ft, 10 ft squares
  grid.material.transparent = true;
  grid.material.opacity = 0.35;
  grid.position.y = 0.002;
  scene.add(grid);

  const person = new THREE.Group(); // 6 ft figure for scale
  {
    const m = new THREE.MeshStandardMaterial({ color: 0xf2a93b, roughness: 0.6 });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 1.15, 6, 12), m);
    body.position.y = 0.765;
    body.scale.z = 0.7;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 12), m);
    head.position.y = 1.829 - 0.11;
    body.castShadow = true;
    head.castShadow = true;
    person.add(body, head);
  }
  scene.add(person);

  const parts = { surfaces: [], doors: [], gears: [], splays: [], steer: [], braces: [], props: {} };
  const engines = { front: false, rear: false };
  const state = { pitch: 0, roll: 0, yaw: 0, steer: 0 };
  let model = null;
  let gearVal = 0;
  let gearTarget = 0;
  let sweeping = false;
  let sweepT0 = 0;
  let tween = null;
  let disposed = false;
  const dimGroup = new THREE.Group();
  scene.add(dimGroup);

  const qa = new THREE.Quaternion();
  const rot = (o, angRad) => o.quaternion.copy(o.userData.base).multiply(qa.setFromAxisAngle(o.userData.ax, angRad));
  const smooth = (t) => t * t * (3 - 2 * t);
  const clamp01 = (t) => Math.min(1, Math.max(0, t));
  const Y = new THREE.Vector3(0, 1, 0);
  const seg = (m, p, q) => {
    const v = q.clone().sub(p);
    const L = v.length();
    m.position.copy(p).addScaledVector(v, 0.5);
    m.quaternion.setFromUnitVectors(Y, v.normalize());
    m.scale.set(1, Math.max(L, 1e-4), 1);
  };

  function applyPose() {
    if (!model) return;
    for (const o of parts.surfaces) {
      const u = o.userData;
      const deg = u.kind === 'elevator' ? state.pitch : u.kind === 'aileron' ? state.roll * u.sign : state.yaw;
      rot(o, deg * D2R);
    }
    // gear sequence: 0 = down & locked, 1 = up with doors shut
    const travel = smooth(clamp01((gearVal - 0.04) / 0.76));
    const doorOpen = 1 - smooth(clamp01((gearVal - 0.82) / 0.16));
    for (const o of parts.gears) rot(o, o.userData.retract_deg * D2R * travel);
    for (const o of parts.splays) rot(o, -o.userData.angle0 * D2R * smooth(clamp01(travel * 1.6)));
    for (const o of parts.steer) rot(o, state.steer * D2R * (1 - clamp01(travel * 4)));
    for (const o of parts.doors) rot(o, o.userData.sign * 95 * D2R * doorOpen);
    model.updateMatrixWorld(true);
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    const k = new THREE.Vector3();
    const aft = new THREE.Vector3(0, 0, 1);
    for (const br of parts.braces) { // folding drag braces: anchor -> knee -> strut
      br.A.getWorldPosition(a);
      br.B.getWorldPosition(b);
      const d = a.distanceTo(b);
      const half = br.L / 2;
      const dir = b.clone().sub(a).normalize();
      const n = aft.clone().sub(dir.clone().multiplyScalar(aft.dot(dir)));
      if (n.lengthSq() < 1e-6) n.copy(Y);
      n.normalize();
      const off = d < br.L ? Math.sqrt(Math.max(0, half * half - (d / 2) * (d / 2))) : 0;
      k.copy(a).add(b).multiplyScalar(0.5).addScaledVector(n, off);
      seg(br.c1, a, k);
      seg(br.c2, k, b);
      br.knee.position.copy(k);
    }
  }

  function measure() {
    const box = new THREE.Box3().setFromObject(model);
    const bx = (re) => {
      const out = new THREE.Box3();
      model.traverse((o) => { if (o.isMesh && re.test(o.name)) out.expandByObject(o); });
      return out;
    };
    const can = bx(/^(Canard|Elevator)/);
    const boomL = bx(/^Boom_L/);
    // fuselage length: spinner apex to spinner apex along the thrust line
    const zs = [];
    const v = new THREE.Vector3();
    model.traverse((o) => {
      if (!o.isMesh || !/^(Fuselage|PropFront_Blades|PropRear_Blades)/.test(o.name)) return;
      const pos = o.geometry.attributes.position;
      for (let i = 0; i < pos.count; i += 1) {
        v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
        if (Math.abs(v.x) < 0.02) zs.push(v.z);
      }
    });
    const measured = [
      (box.max.x - box.min.x) / FT,
      (can.max.x - can.min.x) / FT,
      (boomL.max.z - boomL.min.z) / FT,
      (Math.max(...zs) - Math.min(...zs)) / FT,
      box.max.y / FT,
    ];
    $('checks').innerHTML = PUBLISHED.map(([name, pub], i) => {
      const m = measured[i];
      const d = m - pub;
      const cls = Math.abs(d) <= 0.25 ? 'good' : 'off';
      return `<tr><td>${name}</td><td class="num">${pub.toFixed(1)} ft</td><td class="num">${m.toFixed(2)} ft</td><td class="num ${cls}">${d >= 0 ? '+' : ''}${d.toFixed(2)}</td></tr>`;
    }).join('');
    return box;
  }

  function buildDims(box) {
    const mat = new THREE.LineBasicMaterial({ color: 0xf2a93b });
    const line = (pts) => dimGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat));
    const label = (txt, p) => {
      const d = document.createElement('div');
      d.className = 'pv-dim';
      d.textContent = txt;
      const o = new CSS2DObject(d);
      o.position.copy(p);
      dimGroup.add(o);
    };
    const V = (x, y, z) => new THREE.Vector3(x, y, z);
    const zf = box.min.z - 1.2;
    line([V(box.min.x, 0.02, zf), V(box.max.x, 0.02, zf)]);
    line([V(box.min.x, 0.02, zf - 0.4), V(box.min.x, 0.02, zf + 0.4)]);
    line([V(box.max.x, 0.02, zf - 0.4), V(box.max.x, 0.02, zf + 0.4)]);
    label(`${((box.max.x - box.min.x) / FT).toFixed(1)} ft span`, V(0, 0.05, zf));
    const xl = box.max.x + 1.2;
    line([V(xl, 0.02, box.min.z), V(xl, 0.02, box.max.z)]);
    label(`${((box.max.z - box.min.z) / FT).toFixed(1)} ft length`, V(xl, 0.05, (box.min.z + box.max.z) / 2));
    const xt = box.max.x * 0.3;
    const zt = box.max.z + 0.8;
    line([V(xt, 0, zt), V(xt, box.max.y, zt)]);
    line([V(xt - 0.3, box.max.y, zt), V(xt + 0.3, box.max.y, zt)]);
    label(`${(box.max.y / FT).toFixed(1)} ft height`, V(xt, box.max.y / 2, zt));
    person.position.set(2.2, 0, box.min.z + 0.4);
  }

  const views = { q: [-24, 9, -13], front: [0, 2.6, -46], side: [-30, 2.2, 5], top: [0.01, 58, 5], under: [-9, 0.22, -3] };
  function setView(key, instant) {
    const c = new THREE.Vector3(0, 1.3, 5);
    const to = new THREE.Vector3(...views[key]);
    if (key === 'under') {
      controls.maxPolarAngle = Math.PI;
      c.set(0, 1.1, 5.5);
    } else controls.maxPolarAngle = Math.PI * 0.495;
    if (instant || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      camera.position.copy(to);
      controls.target.copy(c);
      return;
    }
    tween = { p0: camera.position.clone(), t0: controls.target.clone(), p1: to, t1: c, s: performance.now() };
  }

  function onModel(gltf) {
    if (disposed) return;
    model = gltf.scene;
    model.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        const n = o.material.name || '';
        if (/Glass|Stripe/.test(n)) {
          o.material.polygonOffset = true;
          o.material.polygonOffsetFactor = -2;
          o.material.polygonOffsetUnits = -2;
        }
        if (/Glass/.test(n)) {
          o.material.roughness = 0.04;
          o.material.envMapIntensity = 1.6;
        }
      }
      const u = o.userData || {};
      if (!u.kind) return;
      o.userData.base = o.quaternion.clone();
      if (u.axis) o.userData.ax = new THREE.Vector3(...u.axis).normalize();
      if (['aileron', 'elevator', 'rudder'].includes(u.kind)) parts.surfaces.push(o);
      else if (u.kind === 'door') parts.doors.push(o);
      else if (u.kind === 'gear') parts.gears.push(o);
      else if (u.kind === 'splay') parts.splays.push(o);
      else if (u.kind === 'steer') parts.steer.push(o);
      else if (u.kind === 'prop') {
        parts.props[o.name] = o;
        o.userData.spin = 0;
        o.userData.rate = 0;
      }
    });
    scene.add(model);
    model.updateMatrixWorld(true);
    const braceMat = new THREE.MeshStandardMaterial({ color: 0x9ea4ab, metalness: 1, roughness: 0.35 });
    for (const pre of ['MainGear_L', 'MainGear_R', 'NoseGear']) {
      const A = model.getObjectByName(`${pre}_BraceAnchor`);
      const B = model.getObjectByName(`${pre}_BraceAttach`);
      if (!A || !B) continue;
      const r = pre.startsWith('Main') ? 0.028 : 0.024;
      const mk = () => {
        const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1, 14), braceMat);
        c.castShadow = true;
        scene.add(c);
        return c;
      };
      const knee = new THREE.Mesh(new THREE.SphereGeometry(r * 1.5, 12, 10), braceMat);
      scene.add(knee);
      const L = A.getWorldPosition(new THREE.Vector3()).distanceTo(B.getWorldPosition(new THREE.Vector3()));
      parts.braces.push({ A, B, L, c1: mk(), c2: mk(), knee });
    }
    const loading = $('loading');
    if (loading) loading.style.display = 'none';
    applyPose();
    buildDims(measure());
    setView('q', true);
  }

  const fail = (msg) => (e) => {
    const el = $('loading');
    if (el) el.textContent = msg;
    console.error(e); // eslint-disable-line no-console
  };
  fetch(MODEL_URL)
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.text();
    })
    .then((b64) => {
      const bin = Uint8Array.from(atob(b64.trim()), (c) => c.charCodeAt(0));
      new GLTFLoader().parse(bin.buffer, '', onModel, fail('Could not read the model file'));
    })
    .catch(fail('Could not load the model file'));

  // ---- UI wiring ----
  const listeners = [];
  const on = (el, ev, fn) => {
    el.addEventListener(ev, fn);
    listeners.push([el, ev, fn]);
  };
  const sweepBtn = $('sweep');
  const stopSweep = () => {
    sweeping = false;
    sweepBtn.setAttribute('aria-pressed', 'false');
  };
  const setters = {};
  for (const key of ['pitch', 'roll', 'yaw', 'steer']) {
    const el = $(key);
    const out = $(`${key}-o`);
    const show = (v) => {
      out.textContent = `${(+v).toFixed(1).replace('.0', '')}°`;
    };
    on(el, 'input', () => {
      state[key] = +el.value;
      show(el.value);
      stopSweep();
      applyPose();
    });
    setters[key] = (v) => {
      el.value = v;
      show(v);
      state[key] = v;
    };
  }
  on(sweepBtn, 'click', () => {
    sweeping = !sweeping;
    sweepT0 = performance.now();
    sweepBtn.setAttribute('aria-pressed', String(sweeping));
  });
  on($('neutral'), 'click', () => {
    stopSweep();
    Object.values(setters).forEach((s) => s(0));
    applyPose();
  });

  const gearEl = $('gear');
  const gearOut = $('gear-o');
  const gearBtn = $('gearbtn');
  const chip = $('gearchip');
  function syncGearUI() {
    gearEl.value = Math.round(gearVal * 100);
    gearOut.textContent = `${Math.round(gearVal * 100)}%`;
    const st = gearVal <= 0.001 ? 'down' : gearVal >= 0.999 ? 'up' : 'transit';
    chip.className = `pv-chip ${st}`;
    chip.textContent = st === 'down' ? 'DOWN' : st === 'up' ? 'UP' : 'IN TRANSIT';
    gearBtn.textContent = gearTarget > 0.5 ? 'Extend gear' : 'Retract gear';
  }
  on(gearEl, 'input', () => {
    gearVal = +gearEl.value / 100;
    gearTarget = gearVal;
    syncGearUI();
    applyPose();
  });
  on(gearBtn, 'click', () => {
    gearTarget = gearTarget > 0.5 ? 0 : 1;
  });
  root.querySelectorAll('[data-view]').forEach((b) => on(b, 'click', () => setView(b.dataset.view)));
  const toggle = (id, obj) => {
    const b = $(id);
    on(b, 'click', () => {
      const v = b.getAttribute('aria-pressed') !== 'true';
      b.setAttribute('aria-pressed', String(v));
      obj.visible = v;
    });
  };
  toggle('dims', dimGroup);
  toggle('person', person);
  for (const [id, key] of [['eng-front', 'front'], ['eng-rear', 'rear']]) {
    const b = $(id);
    on(b, 'click', () => {
      engines[key] = !engines[key];
      b.setAttribute('aria-pressed', String(engines[key]));
    });
  }
  const qs = new THREE.Quaternion();
  function spinProps(dt) {
    for (const [name, key] of [['PropFront', 'front'], ['PropRear', 'rear']]) {
      const p = parts.props[name];
      if (!p) continue;
      const target = engines[key] ? 7.0 : 0; // rev/s shown, slowed for the eye
      p.userData.rate += (target - p.userData.rate) * Math.min(1, dt * 0.9);
      if (p.userData.rate < 0.01 && !engines[key]) continue;
      p.userData.spin += p.userData.rate * dt * Math.PI * 2 * (p.userData.dir || 1);
      p.quaternion.copy(p.userData.base).multiply(qs.setFromAxisAngle(p.userData.ax, p.userData.spin));
    }
  }

  function resize() {
    const w = stage.clientWidth;
    const h = stage.clientHeight;
    renderer.setSize(w, h);
    labels.setSize(w, h);
    camera.aspect = w / Math.max(h, 1);
    camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(stage);
  resize();

  let last = performance.now();
  renderer.setAnimationLoop((now) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (gearVal !== gearTarget) {
      const step = dt / 7; // ~7 s for a full cycle
      gearVal = gearTarget > gearVal ? Math.min(gearTarget, gearVal + step) : Math.max(gearTarget, gearVal - step);
      syncGearUI();
      applyPose();
    }
    spinProps(dt);
    if (sweeping) {
      const t = (now - sweepT0) / 1000;
      setters.pitch(+(18 * Math.sin(t * 1.3)).toFixed(1));
      setters.roll(+(18 * Math.sin(t * 1.3 + 2.1)).toFixed(1));
      setters.yaw(+(22 * Math.sin(t * 1.3 + 4.2)).toFixed(1));
      setters.steer(+(25 * Math.sin(t * 0.9)).toFixed(1));
      applyPose();
    }
    if (tween) {
      const e = smooth(clamp01((now - tween.s) / 900));
      camera.position.lerpVectors(tween.p0, tween.p1, e);
      controls.target.lerpVectors(tween.t0, tween.t1, e);
      if (e >= 1) tween = null;
    }
    controls.update();
    renderer.render(scene, camera);
    labels.render(scene, camera);
  });

  return () => {
    disposed = true;
    renderer.setAnimationLoop(null);
    ro.disconnect();
    listeners.forEach(([el, ev, fn]) => el.removeEventListener(ev, fn));
    controls.dispose();
    scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
    });
    pmrem.dispose();
    renderer.dispose();
    renderer.domElement.remove();
    $('labels').innerHTML = '';
  };
}

function Ctl({ id, label, min, max }) {
  return (
    <div className="pv-ctl">
      <label htmlFor={`pv-${id}`}>{label}</label>
      <output data-pv={`${id}-o`}>0°</output>
      <input id={`pv-${id}`} data-pv={id} type="range" min={min} max={max} step="0.5" defaultValue="0" />
    </div>
  );
}

export default function VoyagerViewer() {
  const rootRef = useRef(null);
  useEffect(() => {
    document.title = 'Rutan Voyager Viewer | Miles Raker';
    return startViewer(rootRef.current);
  }, []);

  return (
    <div className="pv-root" ref={rootRef}>
      <aside className="pv-panel">
        <header>
          <h1>Voyager · Model 76</h1>
          <p>
            Full-scale (1:1) model of the first airplane to fly around the world non-stop and unrefueled
            (December 1986), built in Blender from Smithsonian dimensions, a published 3-view and NASA photos.
            Registration <span className="pv-tail">N269VA</span>.
          </p>
        </header>

        <section aria-labelledby="pv-h-ctl">
          <h2 id="pv-h-ctl">Flight controls</h2>
          <Ctl id="pitch" label="Pitch · canard elevators" min="-20" max="20" />
          <Ctl id="roll" label="Roll · ailerons" min="-20" max="20" />
          <Ctl id="yaw" label="Yaw · twin rudders" min="-25" max="25" />
          <Ctl id="steer" label="Nose-wheel steering" min="-30" max="30" />
          <p className="pv-hint">Positive pitch = trailing edge down (nose up). Positive roll = right wing down. Positive yaw = rudders right.</p>
          <div className="pv-row">
            <button type="button" data-pv="sweep" aria-pressed="false">Sweep controls</button>
            <button type="button" data-pv="neutral">Neutral</button>
          </div>
        </section>

        <section aria-labelledby="pv-h-eng">
          <h2 id="pv-h-eng">Engines</h2>
          <div className="pv-row">
            <button type="button" data-pv="eng-front" aria-pressed="false">Front O-240 (tractor)</button>
            <button type="button" data-pv="eng-rear" aria-pressed="false">Rear IOL-200 (pusher)</button>
          </div>
          <p className="pv-hint">The front engine was used for takeoff and the heavy early climb; the liquid-cooled rear engine ran for nearly the whole flight.</p>
        </section>

        <section aria-labelledby="pv-h-gear">
          <h2 id="pv-h-gear">Landing gear</h2>
          <div className="pv-gearline">
            <button type="button" data-pv="gearbtn" className="pv-primary">Retract gear</button>
            <span data-pv="gearchip" className="pv-chip down">DOWN</span>
          </div>
          <div className="pv-ctl">
            <label htmlFor="pv-gear">Gear position</label>
            <output data-pv="gear-o">0%</output>
            <input id="pv-gear" data-pv="gear" type="range" min="0" max="100" step="1" defaultValue="0" />
          </div>
          <p className="pv-hint">Doors open, struts swing aft into the booms and fuselage, braces fold, doors close. Retraction geometry is inferred.</p>
        </section>

        <section aria-labelledby="pv-h-view">
          <h2 id="pv-h-view">View</h2>
          <div className="pv-row">
            <button type="button" data-view="q">3/4</button>
            <button type="button" data-view="front">Front</button>
            <button type="button" data-view="side">Side</button>
            <button type="button" data-view="top">Top</button>
            <button type="button" data-view="under">Under</button>
          </div>
          <div className="pv-row">
            <button type="button" data-pv="dims" aria-pressed="true">Dimension lines</button>
            <button type="button" data-pv="person" aria-pressed="true">6 ft figure</button>
          </div>
        </section>

        <section aria-labelledby="pv-h-check">
          <h2 id="pv-h-check">Model vs. published</h2>
          <table>
            <thead><tr><th>Dimension</th><th>Published</th><th>Model</th><th>Δ</th></tr></thead>
            <tbody data-pv="checks"><tr><td colSpan="4">Measuring…</td></tr></tbody>
          </table>
          <p className="pv-hint">Model column is measured live from the loaded geometry. Published values: Smithsonian National Air and Space Museum object record A19880548000.</p>
        </section>

        <details>
          <summary>Sources and assumptions</summary>
          <ul>
            <li>Overall dimensions from the Smithsonian NASM record; wing area 363 sq ft and aspect ratio 33.8 from published specifications.</li>
            <li>Relative placement of fuselage, booms, canard and wing measured from a published 3-view; fin height from NASA photo EC87-0029-02, because the 3-view's side view disagrees with the published 10.3 ft height.</li>
            <li>Right boom nose extends about 1 ft ahead of the canard for the weather radar (Air &amp; Space magazine).</li>
            <li>The Roncz 1046/1080/1082 airfoils are not public: NACA-style sections stand in. Canard chord, control-surface sizes and prop blade shape are estimates.</li>
            <li>Shown empty on its gear with the wings unflexed; fully fueled, the tips drooped almost to the runway.</li>
            <li>Gear retraction direction and door layout are inferred.</li>
          </ul>
        </details>
      </aside>
      <div className="pv-stage" data-pv="stage">
        <div className="pv-loading" data-pv="loading">Loading airframe…</div>
        <div className="pv-labels" data-pv="labels" />
      </div>
    </div>
  );
}
