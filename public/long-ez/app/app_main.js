// Long-EZ Ply & Structures Explorer v2 — application module
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import * as S from './structures.js';
import { buildPlyBook, nest, PROCESS, airfoil, FRAMES, plyPN, afAt } from './plybook.js';
import { plyDrawingSVG, rollSVG, cutList } from './drawing.js';
import * as SYS from './systems.js';
import './parts/index.js';
import { DESIGN_CHANGES } from './defn/changes.js';
import { buildSystems, buildFaces, redrawFace } from './sysgeom.js';
import { buildNoseGear } from './ngview.js';
import { NG } from './parts/ng_layout.js';
import { initSystemsUI } from './ui_systems.js';
import { initDefnUI } from './ui_defn.js';
import { partDrawingSVG } from './sysdrawing.js';
import { HINGE, STRUT } from './parts/wp4_avionics_cabin.js';
import { CL, latchPose } from './parts/canopy_layout.js';
import { batcher, HIDDEN_LAYER } from './batcher.js';
import { capSchedule, SPAR } from './parts/wp15_cs_spar.js';
import { SPAR_END, CLV } from './parts/wp13_airframe_joints.js';
import { buildLifting, buildBox, buildSidePanel, buildBulkhead, buildGear, buildTool, COLORS, FTM, P, setGearSection, FUS_AXIS_Z, FUS_RM } from './geom.js';

const $ = (id) => document.getElementById(id);
const MOBILE = matchMedia('(max-width: 1000px)');   // stacked layout (tablets, phones)
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ===================================================================== units
const U = { mode: 'US' };
const CONV = {
  lb: [1, 'lb', 4.44822, 'N'], lbm: [1, 'lb', 0.453592, 'kg'], in: [1, 'in', 25.4, 'mm'], ft: [1, 'ft', 0.3048, 'm'],
  psi: [1, 'psi', 0.00689476, 'MPa'], inlb: [1, 'in·lb', 0.112985, 'N·m'], lbin: [1, 'lb/in', 0.175127, 'N/mm'],
  lbin2: [1, 'lb·in²', 0.00286961, 'N·m²'], EI: [1, 'lb·in²', 0.00286961, 'N·m²'], mod: [1e-6, 'Msi', 0.00689476e-3, 'GPa'],
  kt: [1, 'KEAS', 0.514444, 'm/s EAS'], in2: [1, 'in²', 645.16, 'mm²'],
};
function fmtNum(v, digits) {
  if (typeof v !== 'number' || !Number.isFinite(v)) return v === Infinity ? '∞' : String(v);
  const a = Math.abs(v);
  if (digits !== undefined) return v.toFixed(digits);
  if (a >= 1e6) return v.toExponential(3);
  if (a >= 1000) return Math.round(v).toLocaleString('en-US');
  if (a >= 100) return v.toFixed(0);
  if (a >= 10) return v.toFixed(1);
  if (a >= 1) return v.toFixed(2);
  return v.toFixed(3);
}
function q(v, unit) {
  if (typeof v !== 'number') return `${esc(v)}${unit && unit !== 'text' ? ` ${unit}` : ''}`;
  const c = CONV[unit];
  if (!c) return `${fmtNum(v)}${unit ? ` ${unit}` : ''}`;
  if (unit === 'psi' && U.mode === 'US' && Math.abs(v) >= 1000) return `${fmtNum(v / 1000)} ksi`;
  return U.mode === 'US' ? `${fmtNum(v * c[0])} ${c[1]}` : `${fmtNum(v * c[2])} ${c[3]}`;
}
const fmtMS = (ms) => (!Number.isFinite(ms) ? '—' : ms > 5 ? '> +5' : `${ms >= 0 ? '+' : ''}${ms.toFixed(2)}`);
const msClass = (ms) => (ms < 0 ? 'b' : ms < 0.15 ? 'w' : 'g');
const msBadge = (ms) => `<span class="ms ${msClass(ms)}">${fmtMS(ms)}</span>`;
function msColor(ms) {
  if (!Number.isFinite(ms)) return 'rgb(70,84,102)';
  const stops = [[-0.2, [255, 70, 70]], [0, [255, 140, 60]], [0.1, [242, 201, 76]], [0.4, [120, 200, 110]], [1.5, [40, 160, 110]], [5, [20, 110, 90]]];
  if (ms <= stops[0][0]) return `rgb(${stops[0][1]})`;
  for (let i = 0; i < stops.length - 1; i++) {
    const [a, ca] = stops[i], [b, cb] = stops[i + 1];
    if (ms <= b) { const t = (ms - a) / (b - a); return `rgb(${ca.map((v, k) => Math.round(v + (cb[k] - v) * t)).join(',')})`; }
  }
  return `rgb(${stops[stops.length - 1][1]})`;
}
function strainColor(r) { // r = strain / allowable strain
  const t = Math.max(0, Math.min(1, r));
  const stops = [[0, [40, 90, 200]], [0.4, [60, 190, 200]], [0.7, [242, 201, 76]], [1, [255, 70, 70]]];
  for (let i = 0; i < stops.length - 1; i++) { const [a, ca] = stops[i], [b, cb] = stops[i + 1]; if (t <= b) { const u = (t - a) / (b - a); return ca.map((v, k) => Math.round(v + (cb[k] - v) * u)); } }
  return [255, 70, 70];
}

// ===================================================================== renderer & scene
const stage = $('stage');
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: false });
const DPR_MAX = Math.min(devicePixelRatio, 2);   // the frame governor (render loop) steps this down on a slow GPU, never below 1
let dpr = DPR_MAX;
renderer.setPixelRatio(dpr);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
stage.prepend(renderer.domElement);
const labels = new CSS2DRenderer({ element: $('labels') });
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101823);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.7;
const camera = new THREE.PerspectiveCamera(35, 1, 0.05, 400);
const controls = new OrbitControls(camera, renderer.domElement);
controls.addEventListener('start', () => { ui.userCam = true; });   // the build follow-camera yields to the user until the next step
controls.enableDamping = true;
// ---- interaction tracking: the render loop draws while the user is busy (and for a moment after), the boot's heavy
// steps wait for a pause so they never land in the middle of an orbit, and the analysis slices get short while orbiting
const INPUT = { last: 0, held: 0 };
const poke = () => { INPUT.last = performance.now(); };
for (const ev of ['pointermove', 'wheel', 'keydown', 'click', 'input', 'change', 'resize', 'scroll']) window.addEventListener(ev, poke, { capture: true, passive: true });
window.addEventListener('pointerdown', () => { INPUT.held++; poke(); }, { capture: true, passive: true });
for (const ev of ['pointerup', 'pointercancel', 'blur']) window.addEventListener(ev, () => { INPUT.held = 0; poke(); }, { capture: true, passive: true });
controls.addEventListener('change', poke);
const busy = (ms = 400) => INPUT.held > 0 || performance.now() - INPUT.last < ms;
/** resolves once the user has left the 3D view alone for a moment (the boot's long steps wait for it) */
const calm = (ms = 400) => new Promise((res) => { const t = () => (busy(ms) ? setTimeout(t, 60) : res()); t(); });
window.__lez = { camera, controls, scene }; // test hook (camera presets in the screenshot scripts)
const sun = new THREE.DirectionalLight(0xfff1dc, 2.0);
sun.position.set(-8, 14, 6);
scene.add(sun, new THREE.HemisphereLight(0xbfd4ff, 0x3a3226, 0.6));
const ground = new THREE.Mesh(new THREE.CircleGeometry(30, 64), new THREE.MeshStandardMaterial({ color: 0x252e3a, roughness: 1 }));
ground.rotation.x = -Math.PI / 2;
scene.add(ground);
const grid = new THREE.GridHelper(18.288, 12, 0x3d4a5c, 0x2c3746);
grid.position.y = 0.002;
scene.add(grid);
const partGroup = new THREE.Group(), labelGroup = new THREE.Group();
scene.add(partGroup, labelGroup);
const cutPlane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0xf2a93b, transparent: true, opacity: 0.25, side: THREE.DoubleSide, depthWrite: false }));
cutPlane.visible = false;
scene.add(cutPlane);

// ===================================================================== state
let design = { ...S.DEFAULT_DESIGN };
let R, BOOKS, NEST, VERSION = '', airframe = null;
const airMeshes = [];
let sel = null, mode = 'air', explode = 1, hoverMesh = null, toolGroup = null;
const built = {};
const ui = { showSys: true, seq: 0, seqAnim: 0, flipA: 0, wasMoving: false, colour: 'none', caseId: null, plotQ: 'loads', cutU: 0.15, exag: true, vnWC: 'W1', openTrace: null };
const changeLog = [];
const ORDER = ['wing', 'aileron', 'canard', 'elevator', 'winglet', 'rudder', 'strake', 'csSpar', 'fuselage', 'F22', 'cowl', 'gear'];
const FRAME_PARTS = ['aileron', 'elevator', 'rudder', 'strake'], FLIP_PARTS = ['wing', 'canard', 'aileron', 'elevator', 'strake', 'csSpar'];

// ===================================================================== analysis run
function hash(str) { let h = 0x811c9dc5; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(16).padStart(8, '0'); }
let prevRun = null;
/** analysis with the mass model: when defined parts have taken over estimate items, a first pass sizes the
 *  structure, its ply books give the defined masses, and the analysis runs with them. The first pass is the sizing
 *  alone (S.sizing): the books' plies and masses depend on the sizing only, so the mass model is the one a full first
 *  analysis gives, and the load cases are evaluated once */
function massModel(dz) { const r = S.sizing(dz); setGearSection((u) => S.gearSection(r.Z, r.M, u)); SYS.applyMassModel(buildPlyBook(r)); }
function analyseModel(dz) {
  if (SYS.ADOPTED.size) massModel(dz);
  return S.analyse(dz, false);
}
function run() {
  prevRun = R ? { minMS: R.minMS, d: R.d } : null;
  R = analyseModel(design);
  finishRun();
}
function finishRun() {
  if (typeof DUI !== 'undefined') DUI.invalidate();
  const prevMS = prevRun ? prevRun.minMS : null, prevD = prevRun ? prevRun.d : null;
  const t1 = performance.now();
  setGearSection((u) => S.gearSection(R.Z, R.M, u));
  BOOKS = buildPlyBook(R);
  NEST = nest(BOOKS);
  for (const b of Object.values(BOOKS)) {
    b.checks = Object.values(R.governing).filter((c) => c.part === b.id).sort((a, c) => a.ms - c.ms);
    b.minMS = Math.min(...b.checks.map((c) => c.ms));
  }
  const sig = JSON.stringify({ d: R.d, Z: { w: [R.Z.wing.upper.length, R.Z.wing.lower.length, R.Z.wing.web], c: [R.Z.canard.upper.length, R.Z.canard.lower.length, R.Z.canard.web], l: [R.Z.winglet.upper.length, R.Z.winglet.web], cs: R.Z.csCap, csw: R.Z.csWeb, g: R.Z.gearPlies, a: R.Z.attachBID, fw: R.Z.fwPlies, f22: R.Z.f22Dbl } });
  VERSION = `LEZ-${hash(sig).toUpperCase()}`;
  const changes = prevD ? Object.keys(design).filter((k) => prevD[k] !== design[k]).map((k) => `${k}: ${prevD[k]} → ${design[k]}`) : ['initial analysis'];
  changeLog.push({ t: new Date(), version: VERSION, changes, minMS: R.minMS, prevMS });
  for (const k of Object.keys(built)) { disposeGroup(built[k].group); delete built[k]; }
  if (!ui.caseId || !R.cases.find((c) => c.id === ui.caseId)) ui.caseId = 'W1-S2';
  $('version').textContent = VERSION;
  rebuildSystems();
}
// ===================================================================== systems layer
let sysGroup = null, faceGroup = null, NGEAR = null;
function rebuildSystems() {
  if (sysGroup) disposeGroup(sysGroup);
  sysGroup = buildSystems(SYS.PARTS);
  scene.add(sysGroup);
  sysGroup.visible = ui.showSys && mode === 'air';
  if (faceGroup) disposeGroup(faceGroup);
  faceGroup = buildFaces(SYS.PARTS); scene.add(faceGroup); faceGroup.visible = mode === 'air';
  const t0 = NGEAR ? NGEAR.state.t : 0;
  if (NGEAR) disposeGroup(NGEAR.group);
  NGEAR = buildNoseGear(SYS.PARTS); scene.add(NGEAR.group); NGEAR.group.visible = mode === 'air'; flagFace = null; setGear(t0);
  if (CANOPY) setCanopy(CANOPY.deg);   // canopy-borne latch pieces follow the canopy
}
// ===================================================================== nose gear: crank-driven retract, every moving part articulated
let gearAnim = null, flagFace = null, gearUp = false;
function setGear(t) {
  if (!NGEAR) return;
  const q = NGEAR.set(t), st = q.down ? 'down' : q.up ? 'up' : 'transit';
  if (!flagFace && faceGroup) faceGroup.traverse((o) => { if (o.userData.spec && o.userData.spec.draw === 'gearflag') flagFace = o; });
  if (flagFace && flagFace.userData.spec.state !== st) redrawFace(flagFace, { state: st });
  const lbl = $('gearState'); if (lbl) lbl.textContent = st === 'down' ? 'DOWN · locked over centre' : st === 'up' ? 'UP · stowed in the NB well' : `In transit · crank turn ${(Math.abs(q.crank) / 360).toFixed(1)} of ${NG.turns.toFixed(1)} · strut ${q.phi.toFixed(0)}°`;
}
function animateGear(up) {
  if (!NGEAR) return;
  const from = NGEAR.state.t, to = up ? 1 : 0, t0 = performance.now(), dur = 4200 * Math.abs(to - from) + 1;
  gearUp = up; const b = $('gearBtn'); if (b) b.textContent = up ? '▼ Extend nose gear' : '▲ Retract nose gear';
  gearAnim = () => { const u = Math.min(1, (performance.now() - t0) / dur); setGear(from + (to - from) * u); if (u >= 1) gearAnim = null; };
}
// ===================================================================== canopy: opens about the right-sill hinge line
let CANOPY = null;
const strutMat = new THREE.MeshStandardMaterial({ color: 0x8c96a3, metalness: 0.6, roughness: 0.35 });
function canopyMatrix(deg) {
  const C = CANOPY, R = new THREE.Matrix4().makeRotationAxis(C.axis, C.sign * deg * Math.PI / 180);
  return new THREE.Matrix4().makeTranslation(C.A.x, C.A.y, C.A.z).multiply(R).multiply(new THREE.Matrix4().makeTranslation(-C.A.x, -C.A.y, -C.A.z));
}
function setupCanopy() {
  const c = airframe.getObjectByName('Canopy');
  if (!c) return;
  airframe.updateMatrixWorld(true);
  const lerp3 = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t), [h0, h1] = HINGE;
  const A = P(...h0), B = P(...h1), hs = lerp3(h0, h1, (STRUT.s - h0[0]) / (h1[0] - h0[0]));
  CANOPY = { obj: c, base: c.matrixWorld.clone(), A, axis: B.clone().sub(A).normalize(), sign: 1, deg: 0,
    fixed: P(STRUT.s, hs[1] + STRUT.fixed[0], hs[2] + STRUT.fixed[1]), move: P(STRUT.s, hs[1] + STRUT.move[0], hs[2] + STRUT.move[1]) };
  // pick the rotation sense that lifts the canopy's free (left) edge
  const ctr = new THREE.Box3().setFromObject(c).getCenter(new THREE.Vector3()), up = ctr.clone().applyMatrix4(canopyMatrix(20));
  if (up.y < ctr.y) CANOPY.sign = -1;
  CANOPY.strut = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1, 10), strutMat);
  CANOPY.strut.userData.pn = 'LEZ-56-120'; CANOPY.strut.userData.orig = strutMat;
  scene.add(CANOPY.strut);
  setCanopy(0);
}
function setCanopy(deg) {
  if (!CANOPY) return;
  const C = CANOPY, M = canopyMatrix(deg).multiply(C.base), loc = C.obj.parent.matrixWorld.clone().invert().multiply(M);
  loc.decompose(C.obj.position, C.obj.quaternion, C.obj.scale);
  C.deg = deg;
  const b = C.move.clone().applyMatrix4(canopyMatrix(deg)), d = new THREE.Vector3().subVectors(b, C.fixed), L = d.length();
  C.strut.position.copy(C.fixed).addScaledVector(d, 0.5); C.strut.scale.set(1, L, 1);
  C.strut.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  C.strut.visible = !!(ui.showSys && mode === 'air');
  setLatch(C.latch ?? 0);
}
/** canopy latch: f 0 locked … 1 unlocked. The handle turns about its pivot, the rod slides aft, the link follows; all of it
 *  rides on the canopy (canopy_layout.js kinematics, the same the checks use) */
const linkMat = new THREE.MeshStandardMaterial({ color: 0x9aa4ae, metalness: 0.6, roughness: 0.35 });
function setLatch(f) {
  if (!CANOPY) return;
  CANOPY.latch = f;
  const q = latchPose(f), Mc = canopyMatrix(CANOPY.deg), piv = P(CL.P[0], CL.yR, CL.P[1]);
  const Mh = new THREE.Matrix4().makeTranslation(piv.x, piv.y, piv.z).multiply(new THREE.Matrix4().makeRotationX(-q.rot)).multiply(new THREE.Matrix4().makeTranslation(-piv.x, -piv.y, -piv.z));
  const Mr = new THREE.Matrix4().makeTranslation(0, 0, q.x * FTM);
  for (const g of (sysGroup && sysGroup.userData.canopy) || []) { g.matrix.copy(Mc).multiply(g.userData.body === 'latchHandle' ? Mh : g.userData.body === 'latchRod' ? Mr : new THREE.Matrix4()); g.matrixWorldNeedsUpdate = true; }
  if (!CANOPY.link) { CANOPY.link = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 1, 8), linkMat); CANOPY.link.userData.pn = 'LEZ-52-110'; CANOPY.link.userData.orig = linkMat; scene.add(CANOPY.link); }
  const a = P(q.B[0], CL.yR + 0.03, q.B[1]).applyMatrix4(Mc), b = P(q.C[0], CL.yR + 0.03, q.C[1]).applyMatrix4(Mc), d = new THREE.Vector3().subVectors(b, a), L = d.length();
  CANOPY.link.position.copy(a).addScaledVector(d, 0.5); CANOPY.link.scale.set(1, L, 1); CANOPY.link.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  CANOPY.link.visible = !!(ui.showSys && mode === 'air');
}
let canopyAnim = null;
function animateCanopy(open) {
  if (!CANOPY) return;
  // opening: unlatch (handle up, rod aft) then lift; closing: lower then latch
  const from = CANOPY.deg, to = open ? STRUT.openDeg : 0, l0 = CANOPY.latch ?? 0, t0 = performance.now(), TL = 700, TC = 1400;
  const ease = (u) => (u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2);
  canopyAnim = () => {
    const t = performance.now() - t0;
    if (open) { const ul = Math.min(1, t / TL); CANOPY.latch = l0 + (1 - l0) * ease(ul); const uc = Math.min(1, Math.max(0, (t - TL) / TC)); setCanopy(from + (to - from) * ease(uc)); if (uc >= 1) canopyAnim = null; }
    else { const uc = Math.min(1, t / TC); setCanopy(from + (to - from) * ease(uc)); const ul = Math.min(1, Math.max(0, (t - TC) / TL)); if (uc >= 1) { setLatch(l0 * (1 - ease(ul))); if (ul >= 1) canopyAnim = null; } }
  };
}
window.__lez.canopy = (deg, latch) => { if (latch != null && CANOPY) CANOPY.latch = latch; setCanopy(deg); };
window.__lez.gear = (t) => setGear(t);
function select3D(pn) {
  if (!sysGroup || !R) return;
  for (const g of [sysGroup, NGEAR && NGEAR.group]) if (g) g.traverse((o) => { if (o.isMesh && o.userData.orig) { o.material = o.userData.pn === pn ? hiSysMat : o.userData.orig; } });
}
const hiSysMat = new THREE.MeshStandardMaterial({ color: 0xf2a93b, emissive: 0x5a3500, roughness: 0.5 });
const SUI = initSystemsUI({ R: () => R, BOOKS: () => BOOKS, q, esc, msBadge, traceHTML: (c) => traceHTML(c), copy: (t, b) => copy(t, b), select3D, openDrawing: (pn) => openPartDrawing(pn), showSys: (on) => { ui.showSys = on; if (sysGroup) sysGroup.visible = on && mode === 'air'; if (CANOPY) setCanopy(CANOPY.deg); airframeLook(); }, xray: (on) => { ui.xray = on; airframeLook(); }, canopy: (open) => animateCanopy(open) });
const DUI = window.__lez.dui = initDefnUI({ R: () => R, BOOKS: () => BOOKS, ORDER, q, esc, msBadge, traceHTML: (c) => traceHTML(c), select3D, scene, camera, renderer, design: () => design,
  sysGroup: () => sysGroup, partGroup: () => partGroup, xray: (on) => { ui.xray = on; $('sysXray').checked = on; airframeLook(); }, onLayout: () => resize(),
  frameObj: (obj, dir, k) => frameDir(obj, dir, k),
  selectBook: (id, toParts) => { if (toParts) showTab('parts'); select(id); },
  openLayup: (id) => { showTab('parts'); select(id); mode = 'layup'; setModeButtons(); showPart(); setTimeout(() => { if ($('seqPlay') && !seqTimer) $('seqPlay').click(); }, 350); },
  openSystems: (pn) => { showTab('systems'); SUI.select(pn, true); } });
function disposeGroup(g) { g.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose()); }); g.removeFromParent(); }
const caseById = (id) => R.cases.find((c) => c.id === id);

// ===================================================================== legend / top bar
$('legend').innerHTML = [['UNI', 'HTS40 carbon unitape (0°)'], ['GUD', '6781 S2-glass 0/90 (glass caps)'], ['BID', '6781 S2-glass (±45°)'], ['doublerBID', 'Doubler / hard-point'], ['XPS', 'HT61 core (surfaces)'], ['PU', 'HT61 core (shell)'], ['PVC', 'HT61 core (bulkheads, blocks)']]
  .map(([k, t]) => `<div><span class="swatch" style="background:#${COLORS[k].toString(16).padStart(6, '0')}"></span>${t}</div>`).join('');
function fillCaseSelects() {
  const opts = R.cases.map((c) => `<option value="${c.id}">${c.id} · ${esc(c.short)}</option>`).join('');
  for (const id of ['caseSel', 'plotCase']) { const el = $(id); el.innerHTML = opts; el.value = ui.caseId; }
}
$('units').addEventListener('change', (e) => { U.mode = e.target.value; refreshAll(); });
// labels on/off (remembered per viewer)
{ const t = $('lblToggle'), apply = (on) => { $('labels').classList.toggle('off', !on); t.checked = on; };
  let on = true; try { on = localStorage.getItem('lez.labels') !== '0'; } catch (e) { /* storage unavailable */ }
  apply(on); t.addEventListener('change', () => { apply(t.checked); try { localStorage.setItem('lez.labels', t.checked ? '1' : '0'); } catch (e) { /* ignore */ } }); }
$('colour').addEventListener('change', (e) => { ui.colour = e.target.value; applyColour(); });
$('caseSel').addEventListener('change', (e) => { ui.caseId = e.target.value; $('plotCase').value = ui.caseId; applyColour(); if (sel) { drawPlot(); } });

// ===================================================================== parts list & selection
function renderPartList() {
  $('partList').innerHTML = ORDER.map((id) => `<button data-part="${id}" aria-pressed="${sel === id}"><span>${BOOKS[id].name}</span>${msBadge(BOOKS[id].minMS)}</button>`).join('');
  $('partList').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => select(b.dataset.part)));
}
function select(id, keepMode) {
  if (!R) return;   // still booting
  if (id !== sel) { ui.seq = 0; seqStop(); }
  sel = id;
  if (!keepMode) mode = 'air';
  setModeButtons();
  renderPartList();
  if (sel) {
    const gov = BOOKS[sel].checks[0];
    if (gov && gov.case && caseById(gov.case)) { ui.caseId = gov.case; $('caseSel').value = ui.caseId; $('plotCase').value = ui.caseId; }
  }
  showPart();
  applyColour();
}
function setModeButtons() { $('modes').querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === mode))); }
$('modes').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { mode = b.dataset.mode; setModeButtons(); showPart(); }));
$('explode').addEventListener('input', (e) => { explode = e.target.value / 100; $('explodeO').textContent = `${e.target.value}%`; applyExplode(); relabel(); });

function build(id) {
  const flat = id === 'fuselage' && mode === 'tool';
  if (built[id] && !!built[id].flat === flat) return built[id];
  if (built[id]) { disposeGroup(built[id].group); delete built[id]; }
  const b = BOOKS[id];
  const r = id === 'csSpar' ? buildBox(b) : (id === 'fuselage' || id === 'cowl') ? buildSidePanel(b, { flat }) : id === 'F22' ? buildBulkhead(b) : id === 'gear' ? buildGear(b) : buildLifting(b);
  for (const m of r.meshes) { m.userData.base = m.position.clone(); m.userData.baseOpacity = m.material.opacity; }
  if (r.core) r.core.userData.base = r.core.position.clone();
  built[id] = r;
  return r;
}
function seqStep() { return mode === 'layup' && sel && ui.seq ? BOOKS[sel].steps[ui.seq - 1] : null; }
// ---- ply-by-ply build steps (books with seqMode 'ply'): every ply and build prop of the step goes on in turn, each
// dropping onto the part and rolling out along the span; the step's clock runs only once any turn of the part is done
const plyMode = () => sel && BOOKS[sel] && BOOKS[sel].seqMode === 'ply';
function stepSchedule(b, st) {
  const items = [...b.plies.filter((p) => p.step === st.step).map((p) => ({ ply: p, seq: p.seq })), ...(b.buildProps || []).filter((x) => x.step === st.step).map((x) => ({ prop: x, seq: x.seq }))].sort((a, c) => a.seq - c.seq);
  const lead = st.step === 1 ? 1.0 : 0, dt = items.length ? Math.min(0.45, 7.0 / items.length) : 0, dur = 0.75;
  items.forEach((it, i) => { it.t0 = lead + i * dt; });
  return { items, dur, lead, total: items.length ? items.at(-1).t0 + dur : lead + 0.3, ply: new Map(items.filter((x) => x.ply).map((x) => [x.ply, x.t0])), prop: new Map(items.filter((x) => x.prop).map((x) => [x.prop.id, x.t0])) };
}
const ease = (u) => { u = Math.min(1, Math.max(0, u)); return 1 - (1 - u) ** 3; };
function applyPlyBuild(r, st) {
  const S = ui.sched, clk = ui.seqClock;
  for (const m of r.meshes) {
    const p = m.userData.ply; let u = 1;
    m.scale.set(1, 1, 1); m.position.copy(m.userData.base);
    if (p.step > st.step) { m.visible = false; continue; }
    if (p.step === st.step) u = (clk - (S.ply.get(p) ?? 0)) / S.dur;
    m.visible = u > 0; if (!m.visible) continue;
    const e = ease(u), kx = ease(u * 1.5);
    m.position.addScaledVector(m.userData.dir, (1 - e) * 1.2 * FTM);
    m.scale.x = Math.max(0.002, kx); m.position.x += m.userData.pivotX * (1 - kx);
    m.userData.cur = p.step === st.step;
    m.material.emissive.setHex(p.step === st.step ? (u < 1.25 ? 0x7a4200 : 0x2a1800) : 0x000000);
  }
  for (const g of r.props || []) {
    const pr = g.userData.prop; let u = 1;
    if (pr.step > st.step) { g.visible = false; continue; }
    if (pr.step === st.step) u = (clk - (S.prop.get(pr.id) ?? 0)) / S.dur;
    g.visible = u > 0; g.position.copy(g.userData.dir).multiplyScalar((1 - ease(u)) * (pr.travel || 1) * FTM);   // comes in from its own side
  }
  if (r.core) { r.core.position.copy(r.core.userData.base); if (st.step === 1) r.core.position.y += (Math.cos(ui.flipA) >= 0 ? 1 : -1) * (1 - ease(clk / Math.max(0.01, S.lead))) * 1.2 * FTM; }   // drops from above whichever way up the part is
  if (r.fixed) r.fixed.visible = true;
  r.group.traverse((o) => { if (o.userData && o.userData.core && o.material) { o.material.opacity = 0.38; o.material.depthWrite = false; } });
}
function applyExplode() {
  const r = sel && built[sel];
  if (!r) return;
  if (r.fixed) r.fixed.visible = false;
  for (const g of r.props || []) { g.visible = mode === 'layup'; g.position.set(0, 0, 0); }
  if (plyMode() && seqStep() && mode === 'layup') { applyPlyBuild(r, seqStep()); return; }
  if (plyMode()) { for (const m of r.meshes) m.scale.set(1, 1, 1); if (r.core) r.core.position.copy(r.core.userData.base); }
  const f = mode === 'layup' ? explode : 0, st = seqStep();
  for (const m of r.meshes) {
    const p = m.userData.ply;
    m.userData.cur = false;
    let d = null;
    if (!st) { m.visible = true; d = m.userData.gap * f; }
    else if (p.step < st.step) { m.visible = true; d = 0; }
    else if (p.step === st.step) { m.visible = true; m.userData.cur = true; d = 0.06 + m.userData.gap * 0.18 + ui.seqAnim * 1.6; } // coming down onto the part
    else m.visible = false;
    if (d !== null) {
      if (m.userData.radial) { // nested shells: scale about the fuselage axis so the ply keeps the fuselage shape
        const k = Math.max(0.35, 1 + (p.side >= 0 ? 1 : -1) * d * 0.6 / FUS_RM);
        m.scale.set(k, k, 1); m.position.set(0, FUS_AXIS_Z * FTM * (1 - k), 0);
      } else m.position.copy(m.userData.base).addScaledVector(m.userData.dir, d * FTM);
    }
    m.material.emissive.setHex(m.userData.cur ? 0x4a2a00 : 0x000000);
  }
  if (r.ctx) r.ctx.visible = mode === 'layup';
  // see-through cores during the build sequence, so webs and caps inside stay visible
  r.group.traverse((o) => { if (o.userData && o.userData.core && o.material) { o.material.opacity = st ? 0.38 : 0.78; o.material.depthWrite = !st; } });
}
const ghostMat = new THREE.MeshStandardMaterial({ color: 0x9fb3c8, transparent: true, opacity: 0.08, depthWrite: false });
const hiMat = new THREE.MeshStandardMaterial({ color: 0xf2a93b, emissive: 0x5a3500, roughness: 0.5, transparent: true, opacity: 0.55 });
const vcMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0 });
const xrayMat = new THREE.MeshStandardMaterial({ color: 0xc9d6e4, transparent: true, opacity: 0.16, depthWrite: false });
function airframeLook() {
  if (!airframe) return;
  airframe.visible = mode === 'air';
  if (ui.colour !== 'none') return;
  const book = sel && BOOKS[sel];
  for (const m of airMeshes) {
    if (!book) m.material = ui.xray && ui.showSys ? xrayMat : m.userData.orig;
    else if (book.mesh && book.mesh.test(m.name)) m.material = book.internal || book.id === 'cowl' ? ghostMat : hiMat;
    else m.material = ghostMat;
  }
}
function clearScene() {
  partGroup.clear();
  if (toolGroup) { disposeGroup(toolGroup); toolGroup = null; }
  labelGroup.clear();
  $('labels').querySelectorAll('.lbl').forEach((e) => e.remove());
}
function showPart() {
  clearScene();
  $('pickHint').hidden = !!sel;
  $('partView').hidden = !sel;
  ground.visible = grid.visible = mode === 'air';
  if (sysGroup) sysGroup.visible = ui.showSys && mode === 'air';
  if (faceGroup) faceGroup.visible = mode === 'air';
  if (NGEAR) NGEAR.group.visible = mode === 'air';
  if (CANOPY) setCanopy(CANOPY.deg);
  airframeLook();
  cutPlane.visible = false;
  if (!sel) { $('mode').textContent = 'Airframe · click a part'; frame(null); return; }
  const b = BOOKS[sel];
  $('pName').textContent = `${b.name}${b.count > 1 ? ` (×${b.count})` : ''}`;
  $('pBlurb').textContent = b.blurb;
  $('explodeCtl').hidden = mode !== 'layup';
  $('seqCtl').hidden = mode !== 'layup';
  $('toolText').hidden = mode !== 'tool';
  $('toolText').innerHTML = `<b>${esc(b.tool.name)}.</b> ${esc(b.tool.text)}<ul>${b.tool.items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`;
  renderPartPanels(b);
  if (mode !== 'air' && window.__lez.dui) window.__lez.dui.hide();
  const r = build(sel);
  partGroup.add(r.group);
  if (r.fixed) partGroup.add(r.fixed);
  r.group.rotation.set(0, 0, 0); r.group.position.set(0, 0, 0); ui.flipA = 0;
  if (mode === 'layup' && r.core && FLIP_PARTS.includes(sel)) { ui.flipA = flipTarget(); placeFlip(r); }
  r.group.visible = mode !== 'air' || !!b.internal || b.id === 'cowl';
  for (const m of r.meshes) { m.material.opacity = m.userData.baseOpacity; m.visible = true; }
  if (r.core) r.core.visible = true;
  applyExplode();
  if (mode === 'air') { $('mode').textContent = `${b.name} · in the airframe`; frame(null); }
  else if (mode === 'layup') { renderSeq(); relabel(); frame(r.group); }
  else {
    $('mode').textContent = `${b.name} · ${b.tool.name}`;
    const tl = [];
    toolGroup = buildTool(b, tl);
    if (['hotwire', 'cnc'].includes(b.tool.kind)) for (const m of r.meshes) m.visible = false;
    if (['table', 'flat'].includes(b.tool.kind)) layFlat(r.group, b.tool.kind);
    partGroup.add(toolGroup);
    for (const [m, txt] of tl) addLabel(m, txt, 'tool');
    frame(partGroup);
  }
  updateCutPlane();
}
function layFlat(g, kind) {
  if (kind === 'table') g.rotation.set(0, 0, Math.PI / 2); else g.rotation.set(-Math.PI / 2, 0, 0);
  g.position.set(0, 0, 0); g.updateMatrixWorld(true);
  const bb = new THREE.Box3().setFromObject(g), c = bb.getCenter(new THREE.Vector3());
  g.position.set(-c.x, -bb.min.y + 0.002, -c.z);
}
function addLabel(obj, txt, cls = '', slot = null) {
  const el = document.createElement('div');
  el.className = `lbl ${cls}`; el.textContent = txt;
  const o = new CSS2DObject(el);
  obj.updateMatrixWorld(true);
  if (obj.userData && obj.userData.anchors) { // a point on the ply's own surface (curved shells have their bbox centre in empty space)
    const a = obj.userData.anchors, i = Math.min(a.length - 1, slot ?? obj.userData.labelSlot ?? 2);
    o.position.copy(obj.localToWorld(a[i].clone())); labelGroup.add(o); return;
  }
  const bb = new THREE.Box3().setFromObject(obj);
  o.position.copy(bb.getCenter(new THREE.Vector3()));
  o.position.y = cls === 'core' ? bb.min.y : bb.max.y;
  labelGroup.add(o);
}
function relabel() {
  labelGroup.clear(); $('labels').querySelectorAll('.lbl').forEach((e) => e.remove());
  if (mode !== 'layup' || !sel || !built[sel]) return;
  const r = built[sel], b = BOOKS[sel], st = seqStep();
  groupLabels(r, b, st ? (m) => m.userData.ply.step === st.step : null);
  if (r.ctxLabels) for (const [o, t] of r.ctxLabels) addLabel(o, t, 'tool');
}
function groupLabels(r, b, only = null) {
  const groups = new Map();
  for (const m of r.meshes) { if (m.userData.hand === 'LH' || (only && !only(m))) continue; const p = m.userData.ply, key = `${p.side}|${p.region}|${p.mat}|${p.panel || p.frame || ''}|${p.inner ? 'in' : ''}`; if (!groups.has(key)) groups.set(key, []); groups.get(key).push(m); }
  const sideName = (s) => (b.id === 'fuselage' ? (s < 0 ? 'Inside ' : 'Outside ') : b.id === 'F22' ? (s < 0 ? 'Fwd ' : 'Aft ') : (b.id === 'winglet' || b.id === 'rudder') ? (s < 0 ? 'Inboard ' : s > 0 ? 'Outboard ' : '') : s < 0 ? 'Lower ' : s > 0 ? 'Upper ' : '');
  const rn = { cap: 'spar cap', pad: 'hard points (pad + filler)', skin: 'skin', web: b.id === 'csSpar' || ['wing', 'canard', 'winglet'].includes(b.id) ? 'shear web' : 'hinge-face web', doubler: 'doubler', face: 'face', longeron: 'top longeron', pack: 'ply packs', wrap: 'over-wrap', rib: 'tank ribs', tab: 'mount tabs' };
  r.group.updateMatrixWorld(true);
  const slots = {};
  for (const [key, ms] of groups) {
    const [s, region, mat, pk, inn] = key.split('|'), n = ms.reduce((a, m) => a + (m.userData.ply.plies || 1), 0), mid = ms[Math.floor(ms.length / 2)];
    if (pk === 'wingletLow') { addLabel(mid, `Lower winglet ${+s < 0 ? 'inboard' : 'outboard'} skin · ${n} × ${mat}`); continue; }
    if (inn) { addLabel(mid, `${sideName(+s)}skin, tank side · ${n} × ${mat}`); continue; }
    if (b.panels) {
      const used = (slots[pk] = (slots[pk] || 0) + 1), order = [2, 3, 1, 4, 0];
      addLabel(mid, `${b.panels[pk].name} · ${region === 'face' ? (b.solid ? 'laminate' : +s < 0 ? 'inside face' : 'outside face') : region === 'bellyuni' ? 'fore-aft UNI' : rn[region]} · ${n} × ${mat}`, '', order[(used - 1) % 5]);
      continue;
    }
    addLabel(mid, `${b.id === 'csSpar' && region === 'web' ? (s < 0 ? 'Front ' : 'Aft ') : sideName(+s)}${rn[region] || region} · ${n} × ${mat}`);
  }
  if (!only) for (const c of r.cores || (r.core ? [r.core] : [])) if (!c.userData.noLabel) addLabel(c, c.userData.label, 'core');
}
function frame(obj) {
  let bb;
  if (obj) { obj.updateMatrixWorld(true); bb = new THREE.Box3().setFromObject(obj); }
  else bb = airframe ? new THREE.Box3().setFromObject(airframe) : new THREE.Box3(new THREE.Vector3(-4, 0, 0), new THREE.Vector3(4, 2.4, 6));
  const c = bb.getCenter(new THREE.Vector3()), size = bb.getSize(new THREE.Vector3()).length();
  let dir = [-0.75, 0.62, -0.8];
  if (obj && mode === 'layup') dir = { wing: [-0.55, 0.3, -1], aileron: [-0.5, 0.6, -1], canard: [-0.6, 0.35, -1], elevator: [-0.5, 0.5, -1], winglet: [1, 0.25, -0.7], rudder: [1, 0.3, -0.6], strake: [-0.6, 0.8, -0.9], csSpar: [-0.35, 0.45, -1], fuselage: [0.75, 0.9, -0.85], F22: [-0.8, 0.45, -1], cowl: [0.8, 0.6, 0.9], gear: [-0.2, 0.25, -1] }[sel] || dir;
  if (obj && mode === 'tool') dir = { winglet: [1, 0.45, -0.6], rudder: [1, 0.45, -0.6], gear: [-0.5, 0.6, -1], F22: [-0.6, 0.9, -0.8], fuselage: [-0.9, 0.9, -0.5], cowl: [0.8, 0.6, 0.9] }[sel] || [-0.7, 0.6, -0.9];
  camera.position.copy(c).addScaledVector(new THREE.Vector3(...dir).normalize(), size * (obj ? 1.15 : 0.95) + 0.4);
  controls.target.copy(c);
  controls.update();
}

/** frame an object from a given direction; k scales the distance */
function frameDir(obj, dir, k = 1.15) {
  obj.updateMatrixWorld(true);
  const bb = new THREE.Box3().setFromObject(obj), c = bb.getCenter(new THREE.Vector3()), size = bb.getSize(new THREE.Vector3()).length();
  camera.position.copy(c).addScaledVector(new THREE.Vector3(...dir).normalize(), size * k + 0.15);
  controls.target.copy(c); controls.update();
}

// ===================================================================== part panels
function partSpan(id) {
  if (id === 'wing') return { a: S.GEO.wing.attachY, b: S.GEO.wing.tipY, lbl: 'BL', unit: 'ft' };
  if (id === 'canard') return { a: 0, b: S.GEO.canard.semi, lbl: 'BL', unit: 'ft' };
  if (id === 'winglet') return { a: 0, b: S.GEO.winglet.h, lbl: 'h', unit: 'ft' };
  if (id === 'csSpar') return { a: 0, b: S.GEO.csSpar.halfSpan, lbl: 'BL', unit: 'ft' };
  if (id === 'fuselage') return { a: S.GEO.F22, b: S.GEO.firewall, lbl: 'FS', unit: 'ft' };
  if (id === 'gear') return { a: 0, b: 1, lbl: 'leg', unit: '' };
  if (FRAME_PARTS.includes(id)) { const [a, b] = FRAMES[id].span; return { a, b, lbl: id === 'rudder' ? 'h' : 'BL', unit: 'ft', noPlot: true }; }
  if (id === 'cowl') return { a: S.GEO.cowl.s0 + 0.05, b: S.GEO.cowl.s1 - 0.1, lbl: 'FS', unit: 'ft', noPlot: true };
  return null;
}
function renderPartPanels(b) {
  // properties
  $('props').innerHTML = b.props.map(([k, v, unit]) => `<tr><td>${esc(k)}</td><td>${unit === 'text' ? esc(v) : q(v, unit === 'mod' ? 'mod' : unit)}</td></tr>`).join('');
  // checks with traces
  $('checks').innerHTML = b.checks.map((c, i) => `<tr class="chk" data-i="${i}"><td>${esc(c.name)}<div class="note">${esc(c.mode)} · ${esc(c.where)}</div></td><td><span class="case">${esc(c.case)}</span><div class="note">${esc(c.short || '')}</div></td><td class="num">${msBadge(c.ms)}</td></tr><tr class="trace" data-i="${i}" hidden><td colspan="3">${traceHTML(c)}</td></tr>`).join('');
  $('checks').querySelectorAll('tr.chk').forEach((tr) => tr.addEventListener('click', () => { const t = $('checks').querySelector(`tr.trace[data-i="${tr.dataset.i}"]`); t.hidden = !t.hidden; }));
  if (ui.openTrace) { const i = b.checks.findIndex((c) => c.id === ui.openTrace); if (i >= 0) $('checks').querySelector(`tr.trace[data-i="${i}"]`).hidden = false; ui.openTrace = null; }
  // rules
  $('rules').innerHTML = b.rules.map((r) => `<li class="${r.ok ? 'ok' : 'bad'}"><b>${r.ok ? '✓' : '✗'}</b> ${esc(r.rule)} <span class="note">— ${esc(r.detail)}</span></li>`).join('');
  // process & traveler
  renderTraveler(b);
  // section & plot
  const sp = partSpan(b.id);
  $('sectionBox').hidden = !sp; $('plotBox').hidden = !sp || !!sp.noPlot;
  if (sp) { $('cut').value = Math.round(ui.cutU * 100); drawSection(); if (!sp.noPlot) drawPlot(); }
}
function traceHTML(c) {
  const t = c.trace;
  if (!t) return '';
  return `<div class="trace-box"><div class="f">${esc(t.formula)}</div>
  <table><thead><tr><th>Input</th><th>Value</th><th>Source</th></tr></thead><tbody>${t.inputs.map(([n, v, u, s]) => `<tr><td>${esc(n)}</td><td class="num">${typeof v === 'number' ? q(v, u) : esc(v)}</td><td><span class="src" title="${esc(S.SOURCES[s] || s)}">${esc(s)}</span></td></tr>`).join('')}</tbody></table>
  <table><tbody>${t.result.map(([n, v, u]) => `<tr><td>${esc(n)}</td><td class="num">${typeof v === 'number' ? q(v, u) : esc(v)}</td></tr>`).join('')}
  <tr><td><b>Margin of safety</b> · ${esc(c.caseLabel || c.case)}</td><td class="num">${msBadge(c.ms)}</td></tr></tbody></table></div>`;
}

// ---------------------------------------------------------------- traveler (as-built tracking, this browser only)
function tKey() { return `lez-traveler-${VERSION}`; }
const TRAV = {};
function loadTraveler() { return (TRAV[tKey()] ||= {}); }
function saveTraveler(t) { TRAV[tKey()] = t; }
const plyExt = (p) => (p.y != null ? `BL ${p.y.toFixed(2)} ft` : p.span ? `${p.span[0].toFixed(2)}–${p.span[1].toFixed(2)} ft` : p.srange ? `FS ${(p.srange[0] * 12).toFixed(0)}–${(p.srange[1] * 12).toFixed(0)}` : p.u ? `${(p.u[0] * 100).toFixed(0)}–${(p.u[1] * 100).toFixed(0)} %` : 'full');
function renderTraveler(b) {
  const T = loadTraveler(), tp = T[b.id] || { plies: {}, steps: {}, weight: '' };
  $('steps').innerHTML = b.steps.map((s) => `<li><label><input type="checkbox" data-step="${s.step}" ${tp.steps[s.step] ? 'checked' : ''}> <b>${s.step}. ${esc(s.title)}</b></label><ul>${s.inspect.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></li>`).join('');
  const total = b.plies.reduce((a, p) => a + (p.plies || 1), 0);
  $('plyCount').textContent = `· ${total} plies${b.plies.some((p) => p.plies > 1) ? ` in ${b.plies.length} rows` : ''}`;
  $('plies').innerHTML = b.plies.map((p) => {
    const ext = plyExt(p);
    const st = tp.plies[p.id] || {};
    return `<tr data-ply="${p.id}" data-step="${p.step}"><td class="num">${p.seq}</td><td>${esc(p.id)}<div class="pn">${plyPN(b.id, p.id)}</div><div class="note">${esc(p.note)} · step ${p.step}</div></td><td>${p.mat}${p.plies > 1 ? ` ×${p.plies}` : ''}</td><td class="num">${p.mat === 'BID' ? '±45°' : `${p.angle}°`}</td><td class="num">${ext}</td><td class="num">${q(p.weight, 'lbm')}</td><td class="tv"><input type="checkbox" data-k="laid" ${st.laid ? 'checked' : ''} title="Laid"><input type="checkbox" data-k="insp" ${st.insp ? 'checked' : ''} title="Inspected"></td></tr>`;
  }).join('');
  const pred = b.plies.reduce((a, p) => a + p.weight * (p.qty || 1), 0) + (b.core ? b.core.weight : 0);
  $('asbuilt').value = tp.weight || '';
  const done = b.plies.filter((p) => (tp.plies[p.id] || {}).insp).length;
  const upd = () => {
    const w = parseFloat($('asbuilt').value), dv = Number.isFinite(w) ? (w / (U.mode === 'US' ? 1 : 0.453592) - pred) / pred * 100 : null;
    $('asbuiltO').innerHTML = `Predicted ${q(pred, 'lbm')} · ${done}/${b.plies.length} rows inspected${dv === null ? '' : ` · as-built ${dv >= 0 ? '+' : ''}${dv.toFixed(1)} % ${Math.abs(dv) <= 5 ? '<span class="ok">within ±5 %</span>' : '<span class="bad">outside ±5 % — investigate</span>'}`}`;
  };
  upd();
  $('asbuilt').oninput = () => { tp.weight = $('asbuilt').value; T[b.id] = tp; saveTraveler(T); upd(); };
  $('steps').querySelectorAll('input').forEach((el) => el.addEventListener('change', () => { tp.steps[el.dataset.step] = el.checked; T[b.id] = tp; saveTraveler(T); }));
  $('plies').querySelectorAll('tr').forEach((tr) => {
    tr.addEventListener('mouseenter', () => highlight(tr.dataset.ply, false));
    tr.addEventListener('mouseleave', () => highlight(null, false));
    tr.addEventListener('click', (e) => { if (e.target.closest('input')) return; openPlyDrawing(b.id, tr.dataset.ply); });
    tr.querySelectorAll('input').forEach((el) => el.addEventListener('change', () => { const id = tr.dataset.ply; tp.plies[id] = { ...(tp.plies[id] || {}), [el.dataset.k]: el.checked }; T[b.id] = tp; saveTraveler(T); renderTraveler(b); }));
  });
}
function highlight(id, fromScene) {
  const r = sel && built[sel];
  if (!r) return;
  for (const m of r.meshes) {
    const on = m.userData.ply.id === id;
    m.material.emissive.setHex(on ? 0xff6a00 : m.userData.cur ? 0x4a2a00 : 0x000000);
    m.material.opacity = id && !on && mode === 'layup' ? 0.25 : m.userData.baseOpacity;
  }
  const st = seqStep();
  $('plies').querySelectorAll('tr').forEach((tr) => { tr.classList.toggle('hl', tr.dataset.ply === id); tr.classList.toggle('cur', !!st && +tr.dataset.step === st.step); });
  if (fromScene && id) { const tr = $('plies').querySelector(`tr[data-ply="${id}"]`); if (tr) tr.scrollIntoView({ block: 'nearest' }); }
}

// ---------------------------------------------------------------- build-sequence player
let seqTimer = null, lastT = performance.now();
function renderSeq() {
  if (!sel) return;
  const b = BOOKS[sel], N = b.steps.length, st = seqStep(), R0 = $('seq');
  R0.max = N; R0.value = ui.seq;
  $('seqO').textContent = st ? `Step ${ui.seq} of ${N}` : 'All plies, exploded';
  $('mode').textContent = st ? `${b.name} · build step ${ui.seq}/${N}: ${st.title}` : `${b.name} · ply layup (exploded)`;
  if (!st) { $('seqCap').innerHTML = `<span class="note">Step through the process sheet to see the part go together: what is already in place, and the plies that go on at each step (highlighted, coming down onto the part).</span>`; }
  else {
    const now = b.plies.filter((p) => p.step === st.step), done = b.plies.filter((p) => p.step < st.step);
    const cnt = (arr) => { const c = {}; arr.forEach((p) => { c[p.mat] = (c[p.mat] || 0) + (p.plies || 1); }); return Object.entries(c).map(([m, n]) => `${n} ${m}`).join(' + ') || 'none'; };
    const ids = now.length ? (now.length > 4 ? `${now[0].id} … ${now[now.length - 1].id}` : now.map((p) => p.id).join(', ')) : '';
    $('seqCap').innerHTML = `<b>${st.step}. ${esc(st.title)}</b>`
      + `<div>${now.length ? `Adds <b>${cnt(now)}</b> plies <span class="pn">${esc(ids)}</span>` : 'No plies added — process step'}${b.id === 'fuselage' && now.some((p) => p.qty > 1) ? ' · side plies shown on both sides' : ''}</div>`
      + `<div class="note">Already in place: ${done.length ? cnt(done) + ' plies' : 'core / tool only'}${FLIP_PARTS.includes(b.id) && b.id !== 'strake' ? ` · part shown ${flipTarget() ? 'lower side up, as glassed in the jig' : 'upper side up'}` : ''}</div>`
      + (b.seqMode === 'ply' ? `<div id="seqNow" class="seqnow"></div>` : '')
      + `<ul>${st.inspect.map((x) => `<li>Inspect: ${esc(x)}</li>`).join('')}</ul>`;
  }
  highlight(null, false);
}
function setSeq(k, animate = true) {
  if (!sel) return;
  ui.seq = Math.max(0, Math.min(BOOKS[sel].steps.length, k));
  ui.seqAnim = animate && ui.seq && !plyMode() ? 1 : 0;
  ui.stepStart = performance.now(); ui.userCam = false;
  if (plyMode() && ui.seq) {
    ui.sched = stepSchedule(BOOKS[sel], seqStep()); ui.seqClock = animate ? 0 : ui.sched.total + 1;
    const r = built[sel]; if (ui.seq === 1 && r && r.core) { ui.flipA = flipTarget(); placeFlip(r); }   // the build starts the way up it is laid; no turn before the first step
  }
  applyExplode(); renderSeq();
  labelGroup.clear(); $('labels').querySelectorAll('.lbl').forEach((e) => e.remove());
  if (!ui.seqAnim) relabel();
}
/** build follow-camera: eases the view onto whatever is going on (a ply, a pack, a clevis block, the bolts), keeping
 *  the viewing direction; the whole part while it is being turned or when the item spans it */
const _bb = new THREE.Box3(), _c = new THREE.Vector3(), _sz = new THREE.Vector3(), _view = new THREE.Vector3();
function followBuild(r, turning, dt) {
  const S = ui.sched, k = S.items.filter((x) => x.t0 <= ui.seqClock).length, it = S.items[Math.max(0, k - 1)];
  let obj = r.group;
  if (!turning && k && it) obj = it.ply ? r.meshes.find((m) => m.userData.ply === it.ply) : (r.props || []).find((g) => g.userData.prop === it.prop);
  if (!obj) obj = r.group;
  if (obj !== r.group && obj.isMesh) { const sc = obj.scale.x; obj.scale.x = 1; const pz = obj.position.clone(); obj.position.copy(obj.userData.base); obj.updateMatrixWorld(true); _bb.setFromObject(obj); obj.scale.x = sc; obj.position.copy(pz); obj.updateMatrixWorld(true); }
  else { obj.updateMatrixWorld(true); _bb.setFromObject(obj); }
  if (_bb.isEmpty()) return;
  _bb.getCenter(_c); _bb.getSize(_sz);
  const span = Math.max(_sz.x, _sz.y, _sz.z), want = Math.min(Math.max(span * 1.15, 3.2 * FTM), 9.5 * FTM), a = 1 - Math.exp(-dt * 2.2);
  const dir = camera.position.clone().sub(controls.target), dist = dir.length(); dir.normalize();
  dir.lerp(_view.set(-0.32, 0.86, -0.55).normalize(), a * 0.6).normalize();   // from above and ahead: the face being laid is always up
  controls.target.lerp(_c, a);
  camera.position.copy(controls.target).addScaledVector(dir, dist + (want - dist) * a);
}
/** the ply-by-ply caption: what is going on right now, and how far through the step */
function seqNow() {
  const el = $('seqNow'); if (!el || !ui.sched) return;
  const S = ui.sched, n = S.items.length, k = S.items.filter((x) => x.t0 <= ui.seqClock).length, it = S.items[Math.max(0, k - 1)];
  const turning = built[sel] && Math.abs(flipTarget() - ui.flipA) > 1e-3;
  const txt = turning ? 'Turning the part on the jig…' : !k ? (ui.seq === 1 ? 'Core blocks go onto the jig board…' : 'Getting ready…')
    : it.ply ? `Laying ${it.ply.id}: ${it.ply.plies > 1 ? `${it.ply.plies} plies ` : ''}${it.ply.mat} ${it.ply.region === 'pad' ? '0/90 + ±45' : it.ply.angle ? '±45°' : '0°'} — ${it.ply.note}` : `Placing: ${it.prop.name}`;
  const key = `${k}|${turning}`; if (el.dataset.k === key) return; el.dataset.k = key;
  el.innerHTML = `<div class="bar"><i style="width:${n ? (100 * k / n).toFixed(0) : 0}%"></i></div><span class="pn">${k}/${n}</span> ${esc(txt)}`;
}
function seqStop() { if (seqTimer) { clearInterval(seqTimer); seqTimer = null; } const b = $('seqPlay'); if (b) b.textContent = '▶ Play build'; }
$('seq').addEventListener('input', (e) => { seqStop(); setSeq(+e.target.value); });
$('seqPrev').addEventListener('click', () => { seqStop(); setSeq(ui.seq - 1); });
$('seqNext').addEventListener('click', () => { seqStop(); setSeq(ui.seq + 1); });
$('seqAll').addEventListener('click', () => { seqStop(); setSeq(0, false); });
$('seqPlay').addEventListener('click', () => {
  if (seqTimer) { seqStop(); return; }
  $('seqPlay').textContent = '❚❚ Pause';
  if (ui.seq >= BOOKS[sel].steps.length) setSeq(0, false);
  setSeq(ui.seq + 1);
  seqTimer = setInterval(() => {
    if (!sel || mode !== 'layup') { seqStop(); return; }
    const done = plyMode() && ui.sched ? ui.seqClock >= ui.sched.total + 1.4 : performance.now() - ui.stepStart >= 2600;
    if (!done) return;
    if (ui.seq >= BOOKS[sel].steps.length) { seqStop(); return; }
    setSeq(ui.seq + 1);
  }, 120);
});
/** build orientation: wings and the canard are glassed lower-side-up first, then flipped into the jig */
function flipTarget() {
  const st = seqStep();
  if (!st || !FLIP_PARTS.includes(sel) || sel === 'strake') return 0;
  const b = BOOKS[sel], steps = b.steps, i = ui.seq - 1;
  const sideOf = (k) => { const pl = b.plies.filter((p) => p.step === steps[k].step && p.side); return pl.length ? Math.sign(pl.reduce((a, p) => a + p.side, 0)) : 0; };
  let sd = sideOf(i);
  if (!sd) {
    const after = [], before = [];
    for (let k = i + 1; k < steps.length; k++) after.push(k);
    for (let k = i - 1; k >= 0; k--) before.push(k);
    for (const k of /flip/i.test(steps[i].title) ? after : [...before, ...after]) { sd = sideOf(k); if (sd) break; }
  }
  return sd < 0 ? Math.PI : 0;
}
function placeFlip(r) {
  if (!r.pivot) { const bb = new THREE.Box3(); r.core.geometry.computeBoundingBox(); bb.copy(r.core.geometry.boundingBox); r.pivot = bb.getCenter(new THREE.Vector3()).add(r.core.userData.base || r.core.position); }
  r.group.rotation.set(ui.flipA, 0, 0);
  const c = r.pivot.clone(), rc = c.clone().applyEuler(r.group.rotation);
  r.group.position.copy(c.sub(rc));
}
function seqTick() {
  const t = performance.now(), dt = Math.min(0.1, (t - lastT) / 1000); lastT = t;
  const r = sel && built[sel];
  let moving = false;
  if (ui.seqAnim > 0) { ui.seqAnim = Math.max(0, ui.seqAnim - dt / 0.8); applyExplode(); moving = true; }
  if (plyMode() && mode === 'layup' && seqStep() && ui.sched && ui.seqClock < ui.sched.total + 1.5) {   // runs on through the hold so the player knows the step is done
    const turning = r && r.core && Math.abs(flipTarget() - ui.flipA) > 1e-3;
    if (!turning) ui.seqClock += dt;
    applyExplode(); seqNow(); moving = true;
    if (!ui.userCam) followBuild(r, turning, dt);
  }
  if (r && mode === 'layup' && r.core && FLIP_PARTS.includes(sel)) {
    const tgt = flipTarget(), d = tgt - ui.flipA;
    if (Math.abs(d) > 1e-4) { ui.flipA += Math.sign(d) * Math.min(Math.abs(d), dt * Math.PI / 1.1); placeFlip(r); moving = true; }
  }
  if (ui.wasMoving && !moving) relabel();
  ui.wasMoving = moving;
}

// ---------------------------------------------------------------- section cut
$('cut').addEventListener('input', (e) => { ui.cutU = e.target.value / 100; drawSection(); updateCutPlane(); });
$('exag').addEventListener('change', (e) => { ui.exag = e.target.checked; drawSection(); });
function updateCutPlane() {
  cutPlane.visible = false;
  if (!sel || mode === 'tool') return;
  const sp = partSpan(sel);
  if (!sp) return;
  const v = sp.a + (sp.b - sp.a) * ui.cutU;
  cutPlane.visible = true;
  cutPlane.rotation.set(0, 0, 0);
  if (['wing', 'canard', 'csSpar'].includes(sel)) {
    const c = sel === 'wing' ? S.wingSec(v) : sel === 'canard' ? { le: S.GEO.canard.le, c: S.GEO.canard.c, z: S.GEO.canard.z } : { le: S.GEO.csSpar.s - 0.4, c: 0.8, z: S.GEO.csSpar.z };
    cutPlane.scale.set(c.c * 1.3 * FTM, 1.2 * FTM, 1);
    cutPlane.position.copy(P(c.le + c.c / 2, v, c.z ?? 3.05));
    cutPlane.rotation.y = Math.PI / 2;
  } else if (sel === 'winglet') {
    const s = S.wingletSec(v), ca = S.GEO.winglet.cant * Math.PI / 180;
    cutPlane.scale.set(s.c * 1.3 * FTM, 0.8 * FTM, 1);
    cutPlane.position.copy(P(s.le + s.c / 2, S.GEO.wing.tipY + v * Math.sin(ca), 3.05 + v * Math.cos(ca)));
    cutPlane.rotation.x = -Math.PI / 2;
  } else if (sel === 'fuselage' || sel === 'cowl') {
    const f = S.fusAt(v);
    cutPlane.scale.set((f.w + 0.6) * FTM, (f.top - f.bot + 0.6) * FTM, 1);
    cutPlane.position.copy(P(v, 0, (f.top + f.bot) / 2));
  } else if (FRAME_PARTS.includes(sel)) {
    const F = FRAMES[sel], c = F.sec(v), mid = F.pt(v, 0.5, 0);
    if (F.thickAxis[1]) { cutPlane.scale.set(c.c * 1.6 * FTM, 0.6 * FTM, 1); cutPlane.position.copy(P(...mid)); cutPlane.rotation.x = -Math.PI / 2; }
    else { cutPlane.scale.set(c.c * 1.4 * FTM, 0.9 * FTM, 1); cutPlane.position.copy(P(...mid)); cutPlane.rotation.y = Math.PI / 2; }
  } else cutPlane.visible = false;
  if (mode === 'layup') cutPlane.visible = false;
}
function canvasCtx(id) {
  const cv = $(id), dpr = devicePixelRatio || 1, W = cv.clientWidth, H = cv.clientHeight;
  cv.width = W * dpr; cv.height = H * dpr;
  const g = cv.getContext('2d'); g.scale(dpr, dpr); g.clearRect(0, 0, W, H);
  return { g, W, H };
}
function drawSection() {
  if (!sel || $('sectionBox').hidden) return;
  const { g, W, H } = canvasCtx('section');
  const sp = partSpan(sel), v = sp.a + (sp.b - sp.a) * ui.cutU, M = R.M, X = ui.exag ? 5 : 1, b = BOOKS[sel];
  g.font = '11px Inter, sans-serif';
  const notes = [];
  const cCore = (m) => `#${COLORS[m].toString(16).padStart(6, '0')}`;
  if (['wing', 'canard', 'winglet'].includes(sel)) {
    const sz = R.Z[sel], gm = sz.gm, s = gm.sec(v), F = FRAMES[sel], cIn = s.c * 12;
    const CM = gm.glass ? M.GUD : M.UNI, nu = S.plyCount(sz.upper, v), nl = S.plyCount(sz.lower, v), tU = nu * CM.t, tL = nl * CM.t, tS = S.FIXED.skinBID * M.BID.t, tW = sz.web * M.BID.t;
    const k = (W - 70) / cIn, ox = 40, oy = H / 2 + 6;
    const pt = (x, o) => [ox + x * cIn * k, oy - o * cIn * k];
    // core
    g.beginPath();
    for (let i = 0; i <= 60; i++) { const x = (1 - Math.cos(Math.PI * i / 60)) / 2, a = airfoil(x, F.tc, F.m); const [px, py] = pt(x, a.yu); i ? g.lineTo(px, py) : g.moveTo(px, py); }
    for (let i = 60; i >= 0; i--) { const x = (1 - Math.cos(Math.PI * i / 60)) / 2, a = airfoil(x, F.tc, F.m); const [px, py] = pt(x, a.yl); g.lineTo(px, py); }
    g.fillStyle = cCore(b.core.mat); g.globalAlpha = 0.55; g.fill(); g.globalAlpha = 1;
    // skins (offset outward, exaggerated)
    for (const side of [1, -1]) {
      g.beginPath();
      for (let i = 0; i <= 60; i++) { const x = (1 - Math.cos(Math.PI * i / 60)) / 2, a = airfoil(x, F.tc, F.m); const [px, py] = pt(x, side > 0 ? a.yu : a.yl); i ? g.lineTo(px, py) : g.moveTo(px, py); }
      g.strokeStyle = '#d6e4f2'; g.lineWidth = Math.max(1, tS * X * k); g.stroke();
    }
    // spar block, caps and web
    const xa = s.xsp - s.b / 2 / cIn, xb = s.xsp + s.b / 2 / cIn, af = airfoil(s.xsp, F.tc, F.m);
    const [bx0, by0] = pt(xa, af.yu), [bx1, by1] = pt(xb, af.yl);
    g.fillStyle = cCore('PVC'); g.globalAlpha = 0.7; g.fillRect(bx0, by0, bx1 - bx0, by1 - by0); g.globalAlpha = 1;
    g.fillStyle = '#e8c36a';
    g.fillRect(bx0, by0, bx1 - bx0, Math.max(1, tU * X * k)); g.fillRect(bx0, by1 - Math.max(1, tL * X * k), bx1 - bx0, Math.max(1, tL * X * k));
    g.fillStyle = '#d6e4f2'; g.fillRect(bx0 - Math.max(1, tW * X * k), by0, Math.max(1, tW * X * k), by1 - by0); g.fillRect(bx1, by0, Math.max(1, tW * X * k), by1 - by0);
    // dims
    g.strokeStyle = '#93a3b8'; g.fillStyle = '#e6edf5'; g.lineWidth = 1;
    const [cx0] = pt(0, 0), [cx1] = pt(1, 0);
    g.beginPath(); g.moveTo(cx0, H - 14); g.lineTo(cx1, H - 14); g.stroke();
    g.fillText(`chord ${q(cIn, 'in')}`, (cx0 + cx1) / 2 - 30, H - 3);
    g.beginPath(); g.moveTo(bx1 + 18, by0); g.lineTo(bx1 + 18, by1); g.stroke();
    g.fillText(`depth ${q(s.h, 'in')}`, bx1 + 22, (by0 + by1) / 2 + 4);
    g.fillText(`upper cap ${nu} × ${CM.label} = ${q(tU, 'in')}`, bx0 - 10, by0 - 8);
    g.fillText(`lower cap ${nl} × ${CM.label} = ${q(tL, 'in')}`, bx0 - 10, by1 + 16);
    notes.push(`${sp.lbl} ${v.toFixed(2)} ft`, `cap width ${q(s.b, 'in')}`, `skins ${S.FIXED.skinBID} × 6781 (${q(tS, 'in')})`, `web ${sz.web} × 6781 each side`, `core ${S.BASE_MAT[b.core.mat].label} + HT61 spar block`);
  } else if (sel === 'csSpar') {
    const cs = S.GEO.csSpar, h = cs.depthFt * 12, w = cs.width * 12, av = Math.abs(v), nC = capSchedule(R.d, R.Z).nAt(av), k = Math.min((W - 120) / w, (H - 50) / h), ox = (W - w * k) / 2, oy = 22;
    // spar end: clevis tail (grey) under the cap, BID pad below it, stepped filler inboard of the tail end; drawn true to
    // scale there (the ×5 exaggeration would bury the tail)
    const SP = SPAR, Dp = SP.depth, inTail = av >= SP.yTail && av <= SP.yWeb;
    const hp = av >= SP.yHP0 && av <= SP.yWeb ? Array.from({ length: SP.nHP }, (_, i) => i + 1).filter((j) => SP.yIn(j) <= av && (j <= SPAR_END.nPad || av <= SP.yTail)) : [], nHP = hp.length;
    const Xs = nHP || inTail ? 1 : X, tC = nC * M.UNI.t, tW = R.Z.csWeb * M.BID.t;
    g.fillStyle = cCore('PVC'); g.globalAlpha = 0.6; g.fillRect(ox, oy, w * k, h * k); g.globalAlpha = 1;
    g.fillStyle = '#e8c36a'; const capPx = Math.max(1, tC * Xs * k);
    const cw = cs.cap * k; g.fillRect(ox + (w * k - cw) / 2, oy, cw, capPx); g.fillRect(ox + (w * k - cw) / 2, oy + h * k - capPx, cw, capPx);
    for (const top of [true, false]) {
      const yd = (dIn) => top ? oy + dIn * k : oy + h * k - dIn * k, cx0 = ox + (w * k - cw) / 2;
      if (nHP) { g.fillStyle = '#c9b8e6'; const a = yd(Dp.padBot - (hp[0] - 1) * M.BID.t), c = yd(Dp.padBot - hp.at(-1) * M.BID.t); g.fillRect(cx0, Math.min(a, c), cw, Math.abs(a - c)); }
      if (inTail) { g.fillStyle = '#9aa4ae'; const a = yd(Dp.tailTop + SPAR_END.flox), c = yd(Dp.tailBot), tw = CLV.W * k; g.fillRect(ox + (w * k - tw) / 2, Math.min(a, c), tw, Math.abs(a - c)); }
    }
    g.fillStyle = '#d6e4f2'; const wp = Math.max(1, tW * Xs * k); g.fillRect(ox - wp, oy, wp, h * k); g.fillRect(ox + w * k, oy, wp, h * k);
    g.strokeStyle = '#d6e4f2'; g.lineWidth = Math.max(1, 2 * M.BID.t * Xs * k); g.strokeRect(ox - wp - 2, oy - 2, w * k + 2 * wp + 4, h * k + 4);
    g.fillStyle = '#e6edf5'; g.fillText(`depth ${q(h, 'in')}`, ox + w * k + 14, oy + h * k / 2); g.fillText(`width ${q(w, 'in')}`, ox, oy + h * k + 18);
    notes.push(`BL ${v.toFixed(2)} ft`, `caps ${nC} HTS40 × ${q(cs.cap, 'in')}${nC < R.Z.csCap ? ` (${R.Z.csCap} at the centre line)` : ''}`, `webs ${R.Z.csWeb} × 6781 each`, '2 × 6781 overall wrap', ...(nHP ? [`hard point ${nHP} × 6781${inTail ? ' under the clevis tail (grey)' : ', stepped filler'}`] : []), ...(Xs !== X ? ['drawn true to scale at the spar end'] : []));
  } else if (sel === 'fuselage') {
    // true outline (same super-ellipse as the 3D loft), laminate drawn inward from the mould line
    const o = S.fusOutline(v, 192), f = o.f, Hh = (f.top - f.bot) * 12, Ww = f.w * 12, Fz = S.FIXED.fuselage;
    const k = Math.min((W - 210) / Ww, (H - 46) / Hh), cx = W / 2, oy = 12;
    const P = (y, z) => [cx + y * 12 * k, oy + (f.top - z) * 12 * k];
    const tf = Fz.faceBID * M.BID.t * X, tc = Fz.coreIn, tu = Fz.bottomUNI * M.GUD.t * X;
    const n = o.pts.length, nrm = o.pts.map((p, i) => { // inward unit normal (ft space)
      const a = o.pts[(i - 1 + n) % n], b = o.pts[(i + 1) % n], tx = b[0] - a[0], tz = b[1] - a[1], L = Math.hypot(tx, tz) || 1;
      return [-tz / L, tx / L];
    });
    const layer = (i, d) => [o.pts[i][0] + nrm[i][0] * d / 12, o.pts[i][1] + nrm[i][1] * d / 12];
    const regs = o.pts.map((p, i) => { const b2 = o.pts[(i + 1) % n], t = (p[2] + (b2[2] < p[2] ? b2[2] + 2 * Math.PI : b2[2])) / 2; return S.fusRegion(o, (p[0] + b2[0]) / 2, t); });
    // contiguous runs of one region (rotate the start so no run wraps)
    let s0 = regs.findIndex((r, i) => r !== regs[(i - 1 + n) % n]); if (s0 < 0) s0 = 0;
    const runs = [];
    for (let m = 0; m < n; m++) { const i = (s0 + m) % n; if (!runs.length || runs[runs.length - 1].r !== regs[i]) runs.push({ r: regs[i], idx: [] }); runs[runs.length - 1].idx.push(i); }
    const band = (idx, d0, d1, fill) => {
      const ids = [...idx, (idx[idx.length - 1] + 1) % n], q = [...ids.map((i) => layer(i, d0)), ...ids.reverse().map((i) => layer(i, d1))].map(([y, z]) => P(y, z));
      g.beginPath(); q.forEach(([x, y], m) => (m ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fillStyle = fill; g.fill();
    };
    for (const { r, idx } of runs) {
      if (r === 'open') continue;
      band(idx, 0, tf, '#d6e4f2');
      band(idx, tf, tf + tc, r === 'top' ? '#c9a24a' : cCore('PU'));
      band(idx, tf + tc, 2 * tf + tc, '#d6e4f2');
      if (r === 'bottom') band(idx, 2 * tf + tc, 2 * tf + tc + tu, '#e8c36a');
    }
    // mould line
    g.beginPath(); o.pts.forEach(([y, z], i) => { const [px, py] = P(y, z); i ? g.lineTo(px, py) : g.moveTo(px, py); }); g.closePath();
    g.strokeStyle = 'rgba(214,228,242,.35)'; g.lineWidth = 0.6; g.stroke();
    // top longerons: UNI strips bonded to the inner face just below the sill, running down the side
    const lw = Fz.longeronW / 12, lt = Fz.longeronPlies * M.GUD.t * X / 12;
    for (const sgn of [-1, 1]) {
      let iS = 0, dBest = Infinity;
      o.pts.forEach((p, i) => { if (Math.sin(p[2]) > 0 && Math.sign(p[0]) === sgn) { const dd = Math.abs(Math.abs(p[0]) - o.ohw); if (dd < dBest) { dBest = dd; iS = i; } } });
      const [y0, z0] = layer(iS, tf), ny = nrm[iS][0]; // routed recess in the foam, under the outside face
      const q = [[y0, z0], [y0, z0 - lw], [y0 + ny * lt, z0 - lw], [y0 + ny * lt, z0]].map(([y, z]) => P(y, z));
      g.beginPath(); q.forEach(([x, y], m) => (m ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fillStyle = '#e8c36a'; g.fill();
    }
    // cockpit opening / canopy line
    const [sxL, syL] = P(-o.ohw, o.sill[1]), [sxR] = P(o.ohw, o.sill[1]);
    if (o.open) { g.setLineDash([5, 4]); g.strokeStyle = '#7fb0e6'; g.lineWidth = 1; g.beginPath(); g.moveTo(sxL, syL); g.lineTo(sxR, syL); g.stroke(); g.setLineDash([]); }
    // neutral axis
    const sec = S.fuselageSection(v, M), zNA = f.bot + sec.zc / 12, [nx0, nyy] = P(-o.w - 0.1, zNA), [nx1] = P(o.w + 0.1, zNA);
    g.setLineDash([10, 3, 2, 3]); g.strokeStyle = '#f2a93b'; g.lineWidth = 1; g.beginPath(); g.moveTo(nx0, nyy); g.lineTo(nx1, nyy); g.stroke(); g.setLineDash([]);
    // dimensions
    g.strokeStyle = '#93a3b8'; g.fillStyle = '#e6edf5'; g.lineWidth = 0.8; g.font = '10.5px Inter, sans-serif';
    const [bx0, byB] = P(-o.w, f.bot), [bx1] = P(o.w, f.bot), [, byT] = P(0, f.top), arrowH = (x0, x1, y) => { g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y); g.moveTo(x0 + 5, y - 3); g.lineTo(x0, y); g.lineTo(x0 + 5, y + 3); g.moveTo(x1 - 5, y - 3); g.lineTo(x1, y); g.lineTo(x1 - 5, y + 3); g.stroke(); };
    arrowH(bx0, bx1, byB + 14); const wt = `width ${q(Ww, 'in')}`; g.fillText(wt, cx - g.measureText(wt).width / 2, byB + 27);
    const dx = bx1 + 14; g.beginPath(); g.moveTo(dx, byT); g.lineTo(dx, byB); g.moveTo(dx - 3, byT + 5); g.lineTo(dx, byT); g.lineTo(dx + 3, byT + 5); g.moveTo(dx - 3, byB - 5); g.lineTo(dx, byB); g.lineTo(dx + 3, byB - 5); g.stroke();
    g.fillText(q(Hh, 'in'), dx + 5, (byT + byB) / 2 + 4);
    // callouts with leaders
    const call = (px, py, left, ty, lines, col = '#e6edf5') => { // text block hugs the canvas edge; leader runs to it
      const tw = Math.max(...lines.map((l) => g.measureText(l).width)), tx = left ? 4 : W - 4 - tw, ex = left ? tx + tw + 3 : tx - 3;
      g.strokeStyle = '#93a3b8'; g.beginPath(); g.moveTo(px, py); g.lineTo(ex, ty); g.stroke();
      g.fillStyle = col; lines.forEach((l, i) => g.fillText(l, tx, ty + 4 + (i - (lines.length - 1) / 2) * 12));
    };
    const pSide = P(-o.w, (f.top + f.bot) / 2 - 0.15), pBot = P(-o.w * 0.45, f.bot), pL = P(-o.ohw, o.sill[1] - lw / 2), pT = P(o.w * 0.35, o.zc + o.h * 0.97);
    call(pSide[0], pSide[1], true, pSide[1] + 6, ['Side panel', `${Fz.coreIn} in HT61`, `${Fz.faceBID} × 6781 each face`]);
    call(pBot[0], pBot[1], true, H - 40, ['Belly', `+${Fz.bottomUNI} × 6781 0/90 inside`]);
    call(pL[0], pL[1], true, Math.max(20, pL[1] - 30), ['Top longeron (recessed)', `${Fz.longeronPlies} × 6781 0/90 × ${Fz.longeronW} in`], '#e8c36a');
    if (o.open) call((sxL + sxR) / 2 + 20, syL, false, Math.max(18, syL - 22), ['Cockpit opening', '(canopy, non-structural)'], '#7fb0e6');
    else call(pT[0], pT[1], false, Math.max(18, pT[1] - 10), ['Turtledeck', 'HT61 + 6781 shell']);
    call(nx1, nyy, false, nyy + 22, [`Neutral axis`, `${q(sec.zc, 'in')} above bottom`], '#f2a93b');
    g.fillStyle = '#e6edf5'; g.textAlign = 'center'; g.fillText(`${o.open ? 'Open (cockpit)' : 'Closed'} section · FS ${(v * 12).toFixed(0)}`, cx, H - 4); g.textAlign = 'left';
    notes.push(`EI ${(sec.EI / 1e6).toFixed(0)}×10⁶ lb·in²`, `side-panel depth ${q(sec.Hs, 'in')}`, `longeron ${q(sec.zL, 'in')} above bottom`, 'outline matches the 3D loft (super-ellipse sides, flat belly, rounded turtledeck)');
  } else if (FRAME_PARTS.includes(sel)) {
    // generic section from the part's own frame: core (or hollow sandwich shell), skins, hinge web, ribs
    const F = FRAMES[sel], c = F.sec(v).c, cIn = c * 12, sk = b.plies.filter((p) => p.region === 'skin' && !p.inner && p.side > 0).length;
    const tS = sk * M.BID.t, k = Math.min((W - 80) / cIn, (H - 60) / (cIn * 0.5)), ox = 40, oy = H / 2;
    const pt = (x, o) => [ox + x * cIn * k, oy - o * cIn * k];
    const ring = (inset = 0) => { const q = []; for (let i = 0; i <= 50; i++) { const x = (1 - Math.cos(Math.PI * i / 50)) / 2, a = afAt(F, v, x); q.push(pt(x, Math.max(a.yc ?? 0, a.yu - inset / cIn))); } for (let i = 50; i >= 0; i--) { const x = (1 - Math.cos(Math.PI * i / 50)) / 2, a = afAt(F, v, x); q.push(pt(x, Math.min(a.yc ?? 0, a.yl + inset / cIn))); } return q; };
    const fill = (q, col, alpha = 1) => { g.beginPath(); q.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.globalAlpha = alpha; g.fillStyle = col; g.fill(); g.globalAlpha = 1; };
    fill(ring(), cCore(b.core.mat), 0.6);
    if (b.hollow) fill(ring(b.coreIn), '#0f1620');
    g.strokeStyle = '#d6e4f2'; g.lineWidth = Math.max(1.2, tS * X * k); g.beginPath(); ring().forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.stroke();
    if (b.hollow) { g.lineWidth = Math.max(1, M.BID.t * X * k); g.beginPath(); ring(b.coreIn).forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.stroke(); }
    const webs = b.plies.filter((p) => p.region === 'web');
    if (webs.length) { const a0 = afAt(F, v, b.xsp), [wx, wy0] = pt(b.xsp, a0.yu), [, wy1] = pt(b.xsp, a0.yl); g.fillStyle = '#d6e4f2'; g.fillRect(wx - Math.max(1.5, webs.length * M.BID.t * X * k), wy0, Math.max(1.5, webs.length * M.BID.t * X * k), wy1 - wy0); }
    g.fillStyle = '#e6edf5'; g.font = '10.5px Inter, sans-serif';
    g.fillText(`chord ${q(cIn, 'in')} · ${sk} × 6781 skins${b.hollow ? ` on ${b.coreIn} in ${S.BASE_MAT[b.core.mat].label} (tank inside)` : ''}${webs.length ? ` · ${webs.length} × 6781 hinge web` : ''}`, 8, H - 8);
    if (b.hollow) { const rb = b.plies.filter((p) => p.region === 'rib').map((p) => p.y.toFixed(2)); g.fillText(`tank ribs at BL ${rb.join(', ')} ft`, 8, 14); }
    notes.push(`${sp.lbl} ${v.toFixed(2)} ft`, sel === 'strake' ? 'hollow fuel-tank shell' : `${(F.cf * 100).toFixed(0)} % chord control surface behind the ${F.parent} hinge line`);
  } else if (sel === 'cowl') {
    const o = S.fusOutline(v, 160), f = o.f, Hh = (f.top - f.bot) * 12, Ww = f.w * 12, k = Math.min((W - 120) / Ww, (H - 40) / Hh), cx = W / 2, oy = 14;
    const Pp = (y, z) => [cx + y * 12 * k, oy + (f.top - z) * 12 * k], t = S.FIXED.cowl.BID * M.BID.t * X;
    g.lineWidth = Math.max(1.5, t * k); g.strokeStyle = '#d6e4f2'; g.beginPath(); o.pts.forEach(([y, z], i) => { const [px, py] = Pp(y, z); i ? g.lineTo(px, py) : g.moveTo(px, py); }); g.closePath(); g.stroke();
    const [lx, ly] = Pp(-o.w, o.zc), [rx] = Pp(o.w, o.zc);
    g.setLineDash([4, 3]); g.strokeStyle = '#f2a93b'; g.lineWidth = 1; g.beginPath(); g.moveTo(lx - 14, ly); g.lineTo(lx + 6, ly); g.moveTo(rx - 6, ly); g.lineTo(rx + 14, ly); g.stroke(); g.setLineDash([]);
    g.fillStyle = '#e6edf5'; g.font = '10.5px Inter, sans-serif'; g.fillText('upper cowl', cx - 26, oy + 20); g.fillText('lower cowl', cx - 26, oy + Hh * k - 8); g.fillStyle = '#f2a93b'; g.fillText('split line', rx + 4, ly - 6);
    notes.push(`FS ${(v * 12).toFixed(0)}`, `${S.FIXED.cowl.BID} × 6781 solid laminate`, 'secondary structure');
  } else if (sel === 'gear') {
    const s = S.gearSection(R.Z, M, v), k = Math.min((W - 80) / s.w, (H - 50) / s.t), ox = (W - s.w * k) / 2, oy = (H - s.t * k) / 2 - 6;
    g.fillStyle = '#e8c36a'; g.fillRect(ox, oy, s.w * k, s.t * k);
    g.strokeStyle = 'rgba(40,40,50,0.5)';
    const n = Math.round(s.t / M.GUD.t);
    for (let i = 8; i < n; i += 8) { const y = oy + s.t * k * i / n; g.beginPath(); g.moveTo(ox, y); g.lineTo(ox + s.w * k, y); g.stroke(); }
    g.strokeStyle = '#d6e4f2'; g.lineWidth = 2; g.strokeRect(ox - 2, oy - 2, s.w * k + 4, s.t * k + 4);
    g.fillStyle = '#e6edf5'; g.fillText(`${q(s.w, 'in')} × ${q(s.t, 'in')} · ${n} plies`, ox, oy + s.t * k + 18);
    notes.push(`${(v * 100).toFixed(0)} % along the leg`, 'lines every 8-ply pack (6781 0/90)', '2 × 6781 over-wrap');
  }
  $('sectionNote').textContent = notes.join(' · ') + (ui.exag ? ' · laminate thickness ×5 for legibility' : '');
}

// ---------------------------------------------------------------- spanwise plots
$('plotCase').addEventListener('change', (e) => { ui.caseId = e.target.value; $('caseSel').value = ui.caseId; drawPlot(); applyColour(); });
$('plotQ').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { ui.plotQ = b.dataset.q; $('plotQ').querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); drawPlot(); }));
function drawPlot() {
  if (!sel || $('plotBox').hidden) return;
  const { g, W, H } = canvasCtx('plot');
  const lc = caseById(ui.caseId), sp = S.spanwise(sel, R.d, R.Z, lc), rows = sp.rows;
  g.font = '10px ui-monospace, Menlo, monospace';
  if (!rows.length || rows.every((r) => !r.M && !r.V)) { g.fillStyle = '#93a3b8'; g.fillText(`This part carries no load in case ${lc.id}. Pick another case.`, 12, H / 2); return; }
  const L = 46, Rr = 10, xs = rows.map((r) => r.y), x0 = Math.min(...xs), x1 = Math.max(...xs);
  const X = (x) => L + (W - L - Rr) * (x - x0) / (x1 - x0 || 1);
  const panel = (top, h, series, title) => {
    const vals = series.flatMap((s) => rows.map(s.f)).filter(Number.isFinite);
    let lo = Math.min(0, ...vals), hi = Math.max(0, ...vals);
    if (series.some((s) => s.clamp)) { lo = Math.max(lo, -0.5); hi = Math.min(hi, 3); }
    if (hi - lo < 1e-9) hi = lo + 1;
    const Y = (v) => top + h - (h - 12) * (Math.min(hi, Math.max(lo, v)) - lo) / (hi - lo);
    g.strokeStyle = '#243143'; g.strokeRect(L, top, W - L - Rr, h);
    g.fillStyle = '#93a3b8'; g.fillText(title, L + 4, top + 10);
    g.fillText(fmtNum(hi), 2, top + 12); g.fillText(fmtNum(lo), 2, top + h - 2);
    if (lo < 0 && hi > 0) { g.strokeStyle = '#3d4a5c'; g.beginPath(); g.moveTo(L, Y(0)); g.lineTo(W - Rr, Y(0)); g.stroke(); }
    for (const s of series) {
      g.strokeStyle = s.c; g.lineWidth = 1.6; g.beginPath();
      let started = false;
      rows.forEach((r, i) => {
        const v = s.f(r);
        if (!Number.isFinite(v)) { started = false; return; }
        const px = X(r.y), py = Y(v);
        if (!started) { g.moveTo(px, py); started = true; } else if (s.step) { g.lineTo(px, Y(s.f(rows[i - 1]))); g.lineTo(px, py); } else g.lineTo(px, py);
      });
      g.stroke(); g.lineWidth = 1;
    }
    let lx = L + 4;
    const ly = series.length > 1 ? top + 22 : top + 10, tw = g.measureText(title).width;
    if (series.length === 1) lx = L + 14 + tw;
    for (const s of series) { const w = g.measureText(s.n).width; g.fillStyle = s.c; g.fillRect(lx, ly - 7, 8, 8); g.fillStyle = '#e6edf5'; g.fillText(s.n, lx + 11, ly); lx += w + 22; }
  };
  const cv = (u) => (v) => (CONV[u] ? (U.mode === 'US' ? v * CONV[u][0] : v * CONV[u][2]) : v);
  const uM = U.mode === 'US' ? 'in·lb' : 'N·m', uV = U.mode === 'US' ? 'lb' : 'N';
  if (ui.plotQ === 'loads') {
    const h = (H - 26) / 3;
    panel(4, h - 4, [{ n: `M (${uM})`, c: '#f2a93b', f: (r) => cv('inlb')(r.M) }], 'Bending moment, limit');
    panel(4 + h, h - 4, [{ n: `V (${uV})`, c: '#7fb0e6', f: (r) => cv('lb')(r.V) }], 'Shear, limit');
    panel(4 + 2 * h, h - 4, [{ n: `T (${uM})`, c: '#b58ad6', f: (r) => cv('inlb')(r.T) }], 'Torsion, limit');
  } else if (ui.plotQ === 'plies') {
    const ser = [{ n: 'provided upper', c: '#f2a93b', f: (r) => r.nu, step: true }];
    if (rows[0].nl !== undefined) ser.push({ n: 'provided lower', c: '#7fb0e6', f: (r) => r.nl, step: true });
    if (rows[0].ru !== undefined) { ser.push({ n: 'required upper', c: '#ffd9a0', f: (r) => r.ru, step: true }); ser.push({ n: 'required lower', c: '#cfe0f0', f: (r) => r.rl, step: true }); }
    panel(4, H - 26, ser, 'Plies: provided vs required by the envelope (all cases)');
  } else {
    const h = (H - 26) / 2;
    panel(4, h - 4, [{ n: 'MS (cap/longeron, this case)', c: '#3ecf8e', f: (r) => r.ms, clamp: true }], 'Margin of safety');
    panel(4 + h, h - 4, [{ n: 'strain % (limit)', c: '#ff8a5c', f: (r) => r.eps * 100 }], 'Compression strain, limit load');
  }
  g.fillStyle = '#93a3b8';
  g.fillText(`${sp.unit} ${x0.toFixed(2)}`, L, H - 6); g.fillText(`${x1.toFixed(2)}`, W - Rr - 30, H - 6);
  g.fillText(`case ${lc.id}`, W / 2 - 30, H - 6);
}

// ===================================================================== 3D colouring by margin or strain
function partParamAt(name, wp) {
  const lat = Math.abs(wp.x) / FTM, ht = wp.y / FTM, s = wp.z / FTM;
  if (/^Aileron_/.test(name)) return ['aileron', lat];
  if (/^Elevator_/.test(name)) return ['elevator', lat];
  if (/^Rudder_/.test(name)) return ['rudder', lat];
  if (/^Wing_[LR]_Root$/.test(name)) return ['wing', S.GEO.wing.attachY];   // the inboard jut-out aft of the CS spar belongs to the wing panel
  if (/^Wing_/.test(name)) return lat >= S.GEO.wing.attachY ? ['wing', lat] : ['csSpar', lat];
  if (/^Canard_/.test(name)) return ['canard', lat];
  if (/^Winglet_/.test(name)) return ['winglet', Math.max(0, Math.min(S.GEO.winglet.h, (ht - S.GEO.wing.z) / Math.cos(S.GEO.winglet.cant * Math.PI / 180)))];
  if (/^Strake_/.test(name)) return ['strake', lat];
  if (/^Fuselage/.test(name)) return s >= S.GEO.firewall ? ['cowl', s] : ['fuselage', s];
  if (/^MainGear/.test(name)) return ['gear', Math.max(0, Math.min(1, (lat - S.GEO.gear.mountY) / (S.GEO.gear.track / 2 - S.GEO.gear.mountY)))];
  return null;
}
function applyColour() {
  if (!airframe) return;
  $('cLegend').hidden = ui.colour === 'none';
  if (ui.colour === 'none') { airframeLook(); return; }
  const lc = caseById(ui.caseId), data = {};
  for (const id of ['wing', 'canard', 'winglet', 'csSpar', 'fuselage', 'gear']) data[id] = S.spanwise(id, R.d, R.Z, lc).rows;
  const epsAllow = { wing: R.Z.wing.comp.epsWr, canard: R.Z.canard.comp.epsWr, winglet: R.Z.winglet.comp.epsWr, csSpar: R.Z.wing.comp.epsWr, fuselage: R.Z.wing.comp.epsWr, gear: S.psi(R.M.GUD.Xc) / S.psi(R.M.GUD.E1) };
  const look = (id, v) => {
    const rows = data[id];
    if (!rows || !rows.length) return null;
    let best = rows[0];
    for (const r of rows) if (Math.abs(r.y - v) < Math.abs(best.y - v)) best = r;
    return best;
  };
  const wp = new THREE.Vector3();
  for (const m of airMeshes) {
    const geo = m.geometry, pos = geo.attributes.position;
    let col = geo.attributes.color;
    if (!col) { col = new THREE.BufferAttribute(new Float32Array(pos.count * 3), 3); geo.setAttribute('color', col); }
    m.updateMatrixWorld(true);
    for (let i = 0; i < pos.count; i++) {
      wp.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld);
      const pp = partParamAt(m.name, wp);
      let rgb = [70, 84, 102];
      if (pp) {
        const r = look(pp[0], pp[1]);
        if (!r && ui.colour === 'margin' && BOOKS[pp[0]] && Number.isFinite(BOOKS[pp[0]].minMS)) rgb = msColor(BOOKS[pp[0]].minMS).match(/\d+/g).map(Number);
        if (r && (r.M || r.V)) {
          if (ui.colour === 'margin') { const c = msColor(r.ms).match(/\d+/g).map(Number); rgb = c; } else rgb = strainColor(r.eps / epsAllow[pp[0]]);
        }
      }
      col.setXYZ(i, rgb[0] / 255, rgb[1] / 255, rgb[2] / 255);
    }
    col.needsUpdate = true;
    m.material = /Glass/.test(m.userData.orig.name || '') ? m.userData.orig : vcMat;
  }
  $('cLegend').innerHTML = ui.colour === 'margin'
    ? `<b>Margin of safety</b> · ${esc(lc.id)}<div class="bar" style="background:linear-gradient(90deg,${[-0.2, 0, 0.1, 0.4, 1.5].map(msColor).join(',')})"></div><div class="ends"><span>−0.2</span><span>0</span><span>+1.5</span></div>`
    : `<b>Strain / allowable strain</b> · ${esc(lc.id)}<div class="bar" style="background:linear-gradient(90deg,rgb(40,90,200),rgb(60,190,200),rgb(242,201,76),rgb(255,70,70))"></div><div class="ends"><span>0</span><span>0.5</span><span>1.0</span></div>`;
}

// ===================================================================== picking & hover
const ray = new THREE.Raycaster(), mouse = new THREE.Vector2();
ray.layers.enable(HIDDEN_LAYER);   // the batched meshes (batcher.js) stay pickable on their hidden layer
let downAt = null;
renderer.domElement.addEventListener('pointerdown', (e) => { downAt = [e.clientX, e.clientY]; });
renderer.domElement.addEventListener('pointerup', (e) => {
  if (!R) return;   // still booting: orbit only
  if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > (e.pointerType === 'touch' ? 10 : 4)) return;
  if (e.pointerType !== 'mouse' && mode === 'air') setTimeout(() => window.__lezPanelTop && window.__lezPanelTop(), 60);
  setMouse(e);
  if (mode === 'layup' && sel && built[sel]) {
    const h = ray.intersectObjects(built[sel].meshes.filter((m) => m.visible), false)[0];
    if (h) openPlyDrawing(sel, h.object.userData.ply.id);
    return;
  }
  if (mode !== 'air') return;
  if (DUI.pick(ray)) return;
  if (sysGroup && sysGroup.visible) { const sh = ray.intersectObject(sysGroup, true)[0]; if (sh) { showTab('systems'); SUI.select(sh.object.userData.pn, true); return; } }
  if (NGEAR && NGEAR.group.visible) { const nh = ray.intersectObject(NGEAR.group, true)[0], ah = ray.intersectObjects(airMeshes, false)[0]; if (nh && nh.object.userData.pn && (ui.xray || !ah || nh.distance <= ah.distance)) { showTab('systems'); SUI.select(nh.object.userData.pn, true); return; } }
  const hits = ray.intersectObjects(airMeshes, false);
  for (const h of hits) { const at = { s: h.point.z / FTM }, id = ORDER.find((k) => BOOKS[k].mesh && BOOKS[k].mesh.test(h.object.name) && (!BOOKS[k].meshFilter || BOOKS[k].meshFilter(at))); if (id) { select(id); return; } }
  if (!hits.length) select(null);
});
renderer.domElement.addEventListener('pointermove', (e) => {
  if (e.pointerType === 'touch' || !R) return;   // no hover on touch: a tap selects, a drag orbits
  setMouse(e);
  const r = sel && built[sel], tip = $('tip');
  if (!r || mode === 'tool' || !r.group.visible) { tip.style.display = 'none'; if (hoverMesh) { hoverMesh = null; highlight(null, false); } return; }
  const hits = ray.intersectObjects(r.meshes.filter((m) => m.visible), false), m = hits.length ? hits[0].object : null;
  if (m !== hoverMesh) { hoverMesh = m; highlight(m ? m.userData.ply.id : null, true); }
  if (m) {
    const p = m.userData.ply, rect = stage.getBoundingClientRect();
    tip.innerHTML = `<b>${esc(p.id)}</b> · ${S.BASE_MAT[p.mat].label}${p.plies > 1 ? ` ×${p.plies}` : ''} · ${p.mat === 'BID' ? '±45°' : `${p.angle}°`}<br>${esc(p.note)}<br><span class="note">Layup step ${p.step} · ${q(p.weight, 'lbm')}</span>`;
    tip.style.display = 'block'; tip.style.left = `${e.clientX - rect.left + 14}px`; tip.style.top = `${e.clientY - rect.top + 14}px`;
  } else tip.style.display = 'none';
});
function setMouse(e) { const r = renderer.domElement.getBoundingClientRect(); mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(mouse, camera); }

// ===================================================================== tabs
document.querySelectorAll('.tabs button').forEach((b) => b.addEventListener('click', () => showTab(b.dataset.tab)));
function showTab(t) {
  document.querySelectorAll('.tabs button').forEach((x) => { x.setAttribute('aria-selected', String(x.dataset.tab === t)); if (x.dataset.tab === t && MOBILE.matches) x.scrollIntoView({ block: 'nearest', inline: 'center' }); });
  document.querySelectorAll('.pane').forEach((p) => p.classList.toggle('on', p.id === `pane-${t}`));
  if (!R) { if (t !== 'defn') $(`pane-${t}`)?.classList.add('waiting'); else DUI.render(); return; }   // still booting: the boot draws it when the analysis is done
  if (t === 'defn') DUI.render();
  if (t === 'env') drawVN();
  if (t === 'cases') renderCases();
  if (t === 'valid') renderValidation();
  if (t === 'book') renderBookTab();
  if (['systems', 'bom', 'wb', 'reqs'].includes(t)) SUI.render(t);
  if (t === 'systems' && !ui.xraySeen) { ui.xraySeen = true; ui.xray = true; $('sysXray').checked = true; if (!sel) airframeLook(); }
  if (t === 'report') renderReport();
  if (t === 'parts' && sel) { drawSection(); drawPlot(); }
}

// ===================================================================== load cases tab
function worst(n = 10) {
  const seen = new Set(), out = [];
  for (const r of [...R.rows].sort((a, b) => a.ms - b.ms)) { const k = `${r.id}|${r.case}`; if (seen.has(k)) continue; seen.add(k); out.push(r); if (out.length >= n) break; }
  return out;
}
function renderCases() {
  $('wcTable').innerHTML = S.WEIGHT_CASES.map((w) => { const a = S.aircraft(R.d, w); return `<tr><td>${w.id}</td><td>${esc(w.label)}</td><td class="num">${q(a.W, 'lbm')}</td><td class="num">FS ${(a.cg * 12).toFixed(1)}</td><td class="num">${(a.shareC * 100).toFixed(1)} %</td><td class="num">${q(a.Vs, 'kt')}</td></tr>`; }).join('');
  $('worst').innerHTML = worst().map((r, i) => `<tr data-i="${i}" class="clickable"><td class="num">${i + 1}</td><td>${esc(r.name)}<div class="note">${esc(r.where)} · ${esc(r.mode)}</div></td><td><span class="case">${esc(r.case)}</span></td><td class="num">${msBadge(r.ms)}</td></tr>`).join('');
  const W10 = worst();
  $('worst').querySelectorAll('tr').forEach((tr) => tr.addEventListener('click', () => { const r = W10[+tr.dataset.i]; ui.openTrace = r.id; showTab('parts'); select(r.part); }));
  // matrix: rows = checks, columns = cases
  const ids = [...new Set(R.rows.map((r) => r.id))], cases = [...R.cases.map((c) => c.id), 'AERO'];
  const byKey = new Map();
  for (const r of R.rows) { const k = `${r.id}|${r.case}`; if (!byKey.has(k) || r.ms < byKey.get(k).ms) byKey.set(k, r); }
  const name = (id) => R.rows.find((r) => r.id === id).name;
  $('matrix').innerHTML = `<thead><tr><th class="rowh">Check \\ case</th>${cases.map((c) => `<th><span>${c}</span></th>`).join('')}</tr></thead><tbody>${ids.map((id) => `<tr><td class="rowh" title="${esc(name(id))}">${esc(name(id))}</td>${cases.map((c) => { const r = byKey.get(`${id}|${c}`); return r ? `<td style="background:${msColor(r.ms)}" title="${esc(name(id))}\n${c}: MS ${fmtMS(r.ms)}"></td>` : '<td class="na"></td>'; }).join('')}</tr>`).join('')}</tbody>`;
  $('caseList').innerHTML = R.cases.map((c) => `<tr><td class="num">${c.id}</td><td>${esc(c.label)}</td><td class="num">${c.V ? q(c.V, 'kt') : '—'}</td><td class="num">${c.n.toFixed(2)}</td></tr>`).join('');
}

// ===================================================================== envelope tab
const FIELDS = [['W', 'Gross weight', 'lb'], ['n1', 'Limit load factor +', 'g'], ['n2', 'Limit load factor −', 'g'], ['VC', 'Design cruise VC', 'KEAS'], ['VD', 'Design dive VD', 'KEAS'], ['UdeC', 'Gust at VC', 'ft/s'], ['UdeD', 'Gust at VD', 'ft/s'], ['CLmax', 'CLmax (wing + canard)', ''], ['FS', 'Factor of safety (FAR ultimate)', ''], ['KD', 'Design factor on ultimate', ''], ['msTarget', 'Sizing target MS', ''], ['nLand', 'Landing load factor', 'g'], ['aileronDeg', 'Aileron deflection', 'deg'], ['elevDeg', 'Elevator deflection', 'deg'], ['rudderDeg', 'Rudder deflection', 'deg'], ['thrust', 'Static thrust', 'lb']];
$('form').innerHTML = FIELDS.map(([k, l, u]) => `<label for="f-${k}">${l}${u ? ` <span class="note">(${u})</span>` : ''}</label><input id="f-${k}" type="number" step="any" value="${design[k]}">`).join('')
  + `<label for="f-env">Environment</label><select id="f-env"><option value="ETW">Hot-wet (140 °F)</option><option value="RTD">Room temp, dry</option></select><label for="f-bvid">Damage tolerance (BVID knock-down)</label><input id="f-bvid" type="checkbox" checked>`;
$('f-env').value = design.env;
$('resize').addEventListener('click', () => {
  const btn = $('resize');
  btn.disabled = true; btn.textContent = 'Sizing…';
  setTimeout(() => {
    const nd = { ...design };
    for (const [k] of FIELDS) { const v = parseFloat($(`f-${k}`).value); if (Number.isFinite(v)) nd[k] = v; }
    nd.env = $('f-env').value; nd.bvid = $('f-bvid').checked;
    design = nd;
    run(); fillCaseSelects(); renderPartList(); renderEnvTables(); if (sel) showPart(); drawVN(); applyColour();
    btn.disabled = false; btn.textContent = 'Re-size plies and re-check';
  }, 30);
});
$('vnWC').addEventListener('change', (e) => { ui.vnWC = e.target.value; drawVN(); });
function renderEnvTables() {
  const a = S.aircraft(R.d, S.WEIGHT_CASES[0]);
  $('acTable').innerHTML = [
    ['CG, gross mid (estimated mass breakdown)', `FS ${(a.cg * 12).toFixed(0)}`], ['Canard share of lift', `${(a.shareC * 100).toFixed(1)} %`], ['Wing loading (wing + canard)', `${a.WS.toFixed(1)} lb/ft²`],
    ['Lift-curve slope, gust factor Kg', `${a.a.toFixed(2)} /rad, ${a.Kg.toFixed(3)}`], ['Stall speed VS', q(a.Vs, 'kt')], ['Manoeuvring speed VA', q(a.VA, 'kt')],
    ['Environment', `${S.ENV[R.d.env].label}${R.d.bvid ? ' + BVID' : ''}`], ['Lowest MS anywhere', fmtMS(R.minMS)],
  ].map(([k, v]) => `<tr><td>${k}</td><td class="num">${v}</td></tr>`).join('');
}
let vnMap = null, vnData = null;
function drawVN() {
  const wc = S.WEIGHT_CASES.find((w) => w.id === ui.vnWC);
  if (!R.vn) R.vn = {};
  vnData = R.vn[ui.vnWC] ||= S.vnGrid(R.d, R.Z, wc);
  const { g, W, H } = canvasCtx('vn');
  if (!W) return;
  const L = 40, Rr = 12, T = 12, B = 30, d = R.d;
  const V1 = d.VD * 1.06, n0 = Math.floor(vnData.env.nMin - 0.6), n1 = Math.ceil(vnData.env.nMax + 0.4);
  const X = (V) => L + (W - L - Rr) * V / V1, Y = (n) => T + (H - T - B) * (n1 - n) / (n1 - n0);
  vnMap = { X, Y };
  g.strokeStyle = '#243143'; g.fillStyle = '#93a3b8'; g.font = '10px ui-monospace, Menlo, monospace';
  for (let n = n0; n <= n1; n++) { g.beginPath(); g.moveTo(L, Y(n)); g.lineTo(W - Rr, Y(n)); g.stroke(); g.fillText(`${n}`, 8, Y(n) + 3); }
  for (let V = 0; V <= V1; V += 25) { g.beginPath(); g.moveTo(X(V), T); g.lineTo(X(V), H - B); g.stroke(); g.fillText(`${V}`, X(V) - 8, H - B + 14); }
  g.fillText('KEAS', W - 42, H - 4); g.fillText('n', 8, 10);
  const dv = d.VD / 30;
  for (const p of vnData.grid) {
    const nT = vnData.env.nPos(p.V), nB = vnData.env.nNeg(p.V), dn = (nT - nB) / 20;
    g.fillStyle = msColor(p.ms);
    g.fillRect(X(p.V - dv), Y(p.n + dn / 2), X(p.V) - X(p.V - dv) + 0.6, Y(p.n - dn / 2) - Y(p.n + dn / 2) + 0.6);
  }
  g.strokeStyle = '#ffffff'; g.lineWidth = 1.6; g.beginPath();
  vnData.env.top.forEach(([V, n], i) => (i ? g.lineTo(X(V), Y(n)) : g.moveTo(X(V), Y(n))));
  g.lineTo(X(d.VD), Y(vnData.env.nNeg(d.VD)));
  [...vnData.env.bot].reverse().forEach(([V, n]) => g.lineTo(X(V), Y(n)));
  g.stroke(); g.lineWidth = 1;
  g.setLineDash([4, 4]); g.strokeStyle = '#93a3b8'; g.beginPath(); g.moveTo(L, Y(1)); g.lineTo(W - Rr, Y(1)); g.stroke(); g.setLineDash([]);
  g.fillStyle = '#fff';
  for (const c of vnData.env.corners) { g.beginPath(); g.arc(X(c[2]), Y(c[3]), 3, 0, Math.PI * 2); g.fill(); }
  for (const [lbl, V] of [['VS', vnData.env.ac.Vs], ['VA', vnData.env.ac.VA], ['VC', d.VC], ['VD', d.VD]]) { g.fillStyle = '#e6edf5'; g.fillText(lbl, X(V) - 6, T + 9); }
  const kx = W - Rr - 120, ky = H - B - 16;
  for (let i = 0; i < 100; i++) { g.fillStyle = msColor(-0.2 + 1.7 * i / 100); g.fillRect(kx + i, ky, 1.2, 8); }
  g.fillStyle = '#e6edf5'; g.fillText('MS −0.2', kx - 48, ky + 8); g.fillText('+1.5', kx + 103, ky + 8);
}
$('vn').addEventListener('mousemove', (e) => {
  if (!vnMap) return;
  const r = e.target.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
  let best = null, bd = 1e9;
  for (const p of vnData.grid) { const d = (vnMap.X(p.V) - x) ** 2 + (vnMap.Y(p.n) - y) ** 2; if (d < bd) { bd = d; best = p; } }
  $('vnTip').innerHTML = best && bd < 400 ? `${q(best.V, 'kt')}, n ${best.n.toFixed(2)} → min MS <b style="color:${msColor(best.ms)}">${fmtMS(best.ms)}</b><br>${esc(best.crit)}` : 'Outside the flight envelope';
});

// ===================================================================== validation tab
function renderValidation() {
  const lc = caseById('W1-S2'), h = S.handCalcWing(R.d, lc), dir = S.surfaceLoads('wing', R.d, lc).at(S.GEO.wing.attachY).M;
  const pct = (a, b) => `${((a - b) / b * 100 >= 0 ? '+' : '')}${((a - b) / b * 100).toFixed(1)} %`;
  const few = S.beamFE('wing', R.d, R.Z, lc), fec = S.beamFE('canard', R.d, R.Z, lc);
  $('vHand').innerHTML = `<tr><td>Outboard lift (area share ${(h.areaFrac * 100).toFixed(1)} % of semi-span ${q(h.semi, 'lb')})</td><td class="num">${q(h.Lout, 'lb')}</td></tr>
    <tr><td>Area centroid of the outer panel</td><td class="num">BL ${h.ybar.toFixed(2)} ft</td></tr>
    <tr><td>Hand calc: attach moment = (L_out − n·W_panel)·(ȳ − y_attach)/cos Λ</td><td class="num">${q(h.Mhand, 'inlb')}</td></tr>
    <tr><td>Engine (Schrenk integration, used by the checks)</td><td class="num">${q(dir, 'inlb')}</td></tr>
    <tr><td><b>Difference</b> (hand calc ignores the Schrenk elliptic share)</td><td class="num">${pct(h.Mhand, dir)}</td></tr>`;
  $('vFE').innerHTML = [['Wing', few], ['Canard', fec]].map(([n, f]) => `<tr><td>${n} root moment</td><td class="num">${q(f.MrootFE, 'inlb')}</td><td class="num">${q(f.MrootDirect, 'inlb')}</td><td class="num">${pct(f.MrootFE, f.MrootDirect)}</td></tr><tr><td>${n} tip deflection (limit)</td><td class="num">${q(f.tipFE, 'in')}</td><td class="num">${q(f.tipDirect, 'in')}</td><td class="num">${pct(f.tipFE, f.tipDirect)}</td></tr>`).join('');
  const A = R.aero;
  $('vAero').innerHTML = [['Wing', A.wing], ['Canard', A.canard]].map(([n, a]) => `<tr><td>${n}</td><td class="num">${a.fb.toFixed(1)} Hz</td><td class="num">${a.ft.toFixed(1)} Hz</td><td class="num">${a.ratio.toFixed(1)}</td><td class="num">${q(a.Vdiv, 'kt')}</td></tr>`).join('')
    + `<tr><td colspan="5" class="note">Aileron reversal ≈ ${q(A.wing.Vrev, 'kt')} · canard tip twist at VD ${A.canard.tipTwistDeg.toFixed(2)}° · requirement 1.2 VD = ${q(1.2 * R.d.VD, 'kt')}. A true flutter analysis (mode shapes, unsteady aerodynamics) is not performed: frequencies are an indicator only.</td></tr>`;
  corrTest();
  drawTornado();
}
function corrTest() {
  const lc = caseById('W1-S2'), fe = S.beamFE('wing', R.d, R.Z, lc), n = parseFloat($('tN').value), meas = parseFloat($('tD').value);
  const pred = fe.tipFE * n / lc.n, inFac = U.mode === 'US' ? 1 : 1 / 25.4;
  $('tPred').innerHTML = Number.isFinite(n) ? `Predicted wing tip deflection at ${n} g: <b>${q(pred, 'in')}</b>${Number.isFinite(meas) ? ` · measured ${q(meas * inFac, 'in')} · error <b>${(((meas * inFac) - pred) / pred * 100).toFixed(1)} %</b> ${Math.abs(((meas * inFac) - pred) / pred) <= 0.1 ? '<span class="ok">(within 10 %: model correlates)</span>' : '<span class="bad">(> 10 %: recalibrate stiffness)</span>'}` : ''}` : '';
}
$('tN').addEventListener('input', corrTest); $('tD').addEventListener('input', corrTest);
let SENS = null;
function drawTornado() {
  if (!SENS || SENS.version !== VERSION) { SENS = { ...S.sensitivity(R.d, R.Z), version: VERSION }; }
  const { g, W, H } = canvasCtx('tornado'), rows = SENS.rows, base = SENS.base;
  const lo = Math.min(...rows.flatMap((r) => [r.lo, r.hi]), base) - 0.02, hi = Math.max(...rows.flatMap((r) => [r.lo, r.hi]), base) + 0.02;
  const L = 160, X = (v) => L + (W - L - 10) * (v - lo) / (hi - lo), rh = (H - 30) / rows.length;
  g.font = '11px Inter, sans-serif';
  rows.forEach((r, i) => {
    const y = 6 + i * rh;
    g.fillStyle = '#e6edf5'; g.fillText(r.label, 4, y + rh * 0.65);
    g.fillStyle = '#ff8a5c'; g.fillRect(Math.min(X(base), X(r.lo)), y + 3, Math.abs(X(r.lo) - X(base)), rh - 6);
    g.fillStyle = '#7fb0e6'; g.fillRect(Math.min(X(base), X(r.hi)), y + 3, Math.abs(X(r.hi) - X(base)), rh - 6);
  });
  g.strokeStyle = '#fff'; g.beginPath(); g.moveTo(X(base), 2); g.lineTo(X(base), H - 24); g.stroke();
  if (lo < 0 && hi > 0) { g.strokeStyle = '#ff5d5d'; g.setLineDash([3, 3]); g.beginPath(); g.moveTo(X(0), 2); g.lineTo(X(0), H - 24); g.stroke(); g.setLineDash([]); }
  g.fillStyle = '#93a3b8'; g.font = '10px ui-monospace, Menlo, monospace';
  g.fillText(`lowest MS ${fmtMS(base)}  ·  orange = input −10 %, blue = +10 %  ·  sizing held fixed`, L, H - 6);
}
$('mcRun').addEventListener('click', () => {
  const N = parseInt($('mcN').value, 10) || 200, out = [];
  let seed = 12345;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  $('mcRun').disabled = true;
  const step = () => {
    const t0 = performance.now();
    while (out.length < N && performance.now() - t0 < 40) out.push(S.mcSample(R.d, R.Z, rand));
    $('mcProg').textContent = `${out.length} / ${N}`;
    if (out.length < N) setTimeout(step, 0); else { $('mcRun').disabled = false; drawMC(out); }
  };
  step();
});
function drawMC(s) {
  const { g, W, H } = canvasCtx('mc'), lo = Math.min(...s), hi = Math.max(...s), nb = 30, bins = new Array(nb).fill(0);
  for (const v of s) bins[Math.min(nb - 1, Math.floor((v - lo) / (hi - lo + 1e-9) * nb))]++;
  const mx = Math.max(...bins), bw = (W - 20) / nb;
  bins.forEach((c, i) => { const v = lo + (i + 0.5) * (hi - lo) / nb; g.fillStyle = msColor(v); g.fillRect(10 + i * bw, H - 20 - (H - 34) * c / mx, bw - 1, (H - 34) * c / mx); });
  g.fillStyle = '#93a3b8'; g.font = '10px ui-monospace, Menlo, monospace';
  g.fillText(fmtMS(lo), 10, H - 6); g.fillText(fmtMS(hi), W - 50, H - 6);
  const mean = s.reduce((a, v) => a + v, 0) / s.length, sd = Math.sqrt(s.reduce((a, v) => a + (v - mean) ** 2, 0) / s.length), pf = s.filter((v) => v < 0).length / s.length;
  const sorted = [...s].sort((a, b) => a - b), p01 = sorted[Math.floor(0.01 * sorted.length)];
  $('mcStats').innerHTML = `Lowest MS over all checks and cases, ${s.length} samples: mean ${fmtMS(mean)}, σ ${sd.toFixed(3)}, 1st percentile ${fmtMS(p01)}, <b>P(MS &lt; 0) = ${(pf * 100).toFixed(1)} %</b>. Scatter is applied about the design (already knocked-down) values, so this overstates the true risk.`;
}

// ===================================================================== ply book tab
function renderBookTab() {
  const resin = Object.values(BOOKS).reduce((a, b) => a + b.plies.reduce((x, p) => x + p.weight * (p.qty || 1), 0) * b.count, 0) * (1 - PROCESS.fibreWeightFraction);
  $('usage').innerHTML = ['UNI', 'GUD', 'BID'].map((m) => `<tr><td>${S.BASE_MAT[m].label}</td><td class="num">${NEST[m].yards.toFixed(1)} yd</td><td class="num">${(NEST[m].utilisation * 100).toFixed(0)} %</td><td class="num">${NEST[m].pieces.length}</td><td class="num">${NEST[m].splices}</td></tr>`).join('')
    + `<tr><td colspan="5" class="note">Roll width ${PROCESS.rollWidth} in (assumed). Resin ≈ ${q(resin, 'lbm')} at ${(PROCESS.fibreWeightFraction * 100).toFixed(0)} % fibre by weight, plus waste. Every part counted at its quantity per aircraft: both wings, ailerons, winglets, rudders, elevators and strakes, the one-piece canard, the whole fuselage shell (sides, belly, decks, nose), cowling, centre-section spar, F22 and the one-piece gear bow.</td></tr>`;
  for (const m of ['UNI', 'GUD', 'BID']) drawRoll(m);
}
const ROLL_PAL = ['#f2a93b', '#ffd27a', '#7fb0e6', '#a9d0ff', '#b58ad6', '#d9b8f0', '#5fd0c0', '#3ecf8e', '#e2b35a', '#ff8a5c', '#c9a0a0', '#9aa9b8'];
function rollMarkup(mat) { return rollSVG(NEST[mat], { mat, order: ORDER, pal: ROLL_PAL, books: BOOKS, units: U.mode, k: 4 }); }
function wireRollClicks(el) {
  el.onclick = (e) => { const pc = e.target.closest('polygon[data-pn]'); if (pc) openPlyDrawing(pc.dataset.part, pc.dataset.ply, pc.dataset.pn); };
}
function drawRoll(mat) {
  const el = $(`roll-${mat}`);
  el.innerHTML = rollMarkup(mat);
  wireRollClicks(el);
  $(`rollNote-${mat}`).innerHTML = ORDER.map((p, i) => `<span class="swatch" style="background:${ROLL_PAL[i]}"></span>${esc(BOOKS[p].name)}`).join(' &nbsp; ') + ' · hover a piece for its part number, click for its drawing';
  const rows = cutList(NEST[mat], BOOKS, U.mode), un = U.mode === 'SI' ? 'mm' : 'in';
  $(`cutN-${mat}`).textContent = rows.length;
  $(`cut-${mat}`).innerHTML = rows.map((r) => `<tr class="clickable" data-pn="${esc(r.pn)}" data-ply="${esc(r.ply)}" data-part="${r.part}"><td><span class="pn">${esc(r.pn)}</span><div class="note">${esc(r.assy)}</div></td><td>${r.band}</td><td class="num">${r.x}</td><td class="num">${r.y}</td><td class="num">${r.l} × ${r.w} ${un}</td></tr>`).join('');
  $(`cut-${mat}`).onclick = (e) => { const tr = e.target.closest('tr[data-pn]'); if (tr) openPlyDrawing(tr.dataset.part, tr.dataset.ply, tr.dataset.pn); };
}
document.querySelectorAll('[data-rollfull]').forEach((b) => b.addEventListener('click', () => openRollDrawing(b.dataset.rollfull)));
document.querySelectorAll('[data-cutcsv]').forEach((b) => b.addEventListener('click', () => {
  const m = b.dataset.cutcsv, un = U.mode === 'SI' ? 'mm' : 'in', rows = cutList(NEST[m], BOOKS, U.mode);
  const csv = [`part_number,ply,assembly,band,x_${un},y_${un},length_${un},width_${un},area_${U.mode === 'SI' ? 'cm2' : 'in2'}`, ...rows.map((r) => [r.pn, r.ply, `"${r.assy}"`, r.band, r.x, r.y, r.l, r.w, r.area].join(','))].join('\n');
  copy(csv, b);
}));

// ===================================================================== drawings (modal)
const DWG = { kind: null, part: null, ply: null, pn: null, mat: null, zoom: 1 };
function openPlyDrawing(part, plyId, pn = null) {
  const book = BOOKS[part], ply = book && book.plies.find((p) => p.id === plyId);
  if (!ply || !ply.flat) return;
  Object.assign(DWG, { kind: 'ply', part, ply: plyId, pn });
  const pieces = (NEST[ply.mat].byPly[plyId] || []).filter((p) => p.copy === 0 && p.layer === 0);
  const svg = plyDrawingSVG({ part, book, ply, ext: plyExt(ply), units: U.mode, version: VERSION, date: new Date().toISOString().slice(0, 10), mat: S.BASE_MAT[ply.mat], selectedPN: pn, pieces: pn ? (NEST[ply.mat].byPly[plyId] || []) : pieces });
  const sh = $('dwgSheet'); sh.className = 'ply'; sh.innerHTML = svg;
  const n = (NEST[ply.mat].byPly[plyId] || []).length;
  $('dwgTitle').textContent = `${plyPN(part, plyId)} · ${book.name} · ply ${ply.seq}/${book.plies.length}${pn ? ` · piece ${pn}` : ''} · ${n} pieces per aircraft`;
  $('dwgPrev').hidden = $('dwgNext').hidden = false; $('dwgZoom').hidden = true;
  $('dwg').hidden = false;
}
function openRollDrawing(mat) {
  Object.assign(DWG, { kind: 'roll', mat, zoom: DWG.kind === 'roll' ? DWG.zoom : 1 });
  const sh = $('dwgSheet'); sh.className = 'roll'; sh.innerHTML = rollMarkup(mat);
  const svg = sh.querySelector('svg'); svg.style.height = `${(DWG.zoom * Math.max(320, innerHeight - 110)).toFixed(0)}px`; svg.style.width = 'auto';
  wireRollClicks(sh);
  $('dwgTitle').textContent = `${mat} roll cut layout · ${NEST[mat].pieces.length} pieces · ${NEST[mat].yards.toFixed(1)} yd`;
  $('dwgPrev').hidden = $('dwgNext').hidden = true; $('dwgZoom').hidden = false; $('dwgZoom').textContent = DWG.zoom > 1 ? 'Zoom ×1' : 'Zoom ×2';
  $('dwg').hidden = false;
}
function openPartDrawing(pn) {
  Object.assign(DWG, { kind: 'part', pn });
  const sh = $('dwgSheet'); sh.className = 'ply'; sh.innerHTML = partDrawingSVG(pn);
  const p = SYS.partByPN(pn);
  $('dwgTitle').textContent = `${pn} · ${p ? p.name : ''}`;
  $('dwgPrev').hidden = $('dwgNext').hidden = $('dwgZoom').hidden = true;
  $('dwg').hidden = false;
}
function stepPly(dir) {
  if (DWG.kind !== 'ply') return;
  const pl = BOOKS[DWG.part].plies.filter((p) => p.flat), i = pl.findIndex((p) => p.id === DWG.ply), nx = pl[(i + dir + pl.length) % pl.length];
  openPlyDrawing(DWG.part, nx.id);
}
function closeDrawing() { $('dwg').hidden = true; $('dwgSheet').innerHTML = ''; DWG.kind = null; }
$('dwgClose').addEventListener('click', closeDrawing);
$('dwgPrev').addEventListener('click', () => stepPly(-1));
$('dwgNext').addEventListener('click', () => stepPly(1));
$('dwgZoom').addEventListener('click', () => { DWG.zoom = DWG.zoom > 1 ? 1 : 2; openRollDrawing(DWG.mat); });

addEventListener('keydown', (e) => {
  if ($('dwg').hidden) return;
  if (e.key === 'Escape') closeDrawing(); else if (e.key === 'ArrowLeft') stepPly(-1); else if (e.key === 'ArrowRight') stepPly(1);
});
function refreshDrawing() { if (DWG.kind === 'part') openPartDrawing(DWG.pn); else if (DWG.kind === 'ply') openPlyDrawing(DWG.part, DWG.ply, DWG.pn); else if (DWG.kind === 'roll') openRollDrawing(DWG.mat); }

// ===================================================================== report tab
function reportMarkdown() {
  const d = R.d, lines = [];
  lines.push(`# Long-EZ notional structure — stress summary`, '', `Version **${VERSION}** · ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC`, '');
  lines.push('> Demonstration only. Notional layups sized by this tool from public dimensions and typical material data. Not the Rutan plans; not for construction.', '');
  lines.push('## Design inputs', '', '| Input | Value |', '|---|---|', ...Object.entries(d).filter(([k]) => k !== 'k').map(([k, v]) => `| ${k} | ${v} |`), '');
  lines.push(`Environment: ${S.ENV[d.env].label}${d.bvid ? ', BVID knock-down ' + S.BVID_KD : ''}. Ultimate factor ${d.FSu ?? d.FS} × design factor ${d.KD ?? 1} = ${d.FS.toFixed(2)} on limit loads.`, '');
  lines.push('## Lowest margins', '', '| # | Check | Case | Location | Mode | MS |', '|---|---|---|---|---|---|', ...worst(15).map((r, i) => `| ${i + 1} | ${r.name} | ${r.case} | ${r.where} | ${r.mode} | ${fmtMS(r.ms)} |`), '');
  lines.push('## Governing case for every check', '', '| Part | Check | Case | MS |', '|---|---|---|---|', ...Object.values(R.governing).sort((a, b) => a.part.localeCompare(b.part) || a.ms - b.ms).map((r) => `| ${r.part} | ${r.name} | ${r.case} | ${fmtMS(r.ms)} |`), '');
  lines.push('## Sized layup', '', `- Wing caps ${R.Z.wing.upper.length} upper / ${R.Z.wing.lower.length} lower UNI at the attach; web ${R.Z.wing.web} BID`, `- Canard caps ${R.Z.canard.upper.length} / ${R.Z.canard.lower.length} UNI at BL 0; web ${R.Z.canard.web} BID; PVC core`, `- Winglet caps ${R.Z.winglet.upper.length} UNI each side; web ${R.Z.winglet.web} BID`, `- CS spar caps ${R.Z.csCap} UNI; webs ${R.Z.csWeb} BID; fitting doublers ${R.Z.attachBID} BID`, `- Gear leg ${R.Z.gearPlies} UNI at the root (stiffness-driven: prop clearance)`, `- Firewall hard-points ${R.Z.fwPlies} BID; F22 hard-point ${R.Z.f22Dbl} BID`, '');
  lines.push('## Open items (not analysed)', '', ...OPEN_ITEMS.map((x) => `- ${x}`), '');
  lines.push('## Design change history', '', '| Change | Date | Status | What and why | Before → after |', '|---|---|---|---|---|', ...DESIGN_CHANGES.map((c) => `| ${c.id} ${c.title} | ${c.date} | ${c.status} | ${c.reason} Decision: ${c.decision} Change: ${c.change} Effect: ${c.effect} | ${c.before.join('; ')} → ${c.after.join('; ')} |`), '');
  lines.push('## Session change log', '', '| Version | Changes | Lowest MS |', '|---|---|---|', ...changeLog.map((c) => `| ${c.version} | ${c.changes.join('; ')} | ${fmtMS(c.minMS)} |`), '');
  lines.push('## Sources', '', ...Object.entries(S.SOURCES).map(([k, v]) => `- **${k}**: ${v}`));
  return lines.join('\n');
}
const OPEN_ITEMS = [
  'Flutter: only frequency separation is estimated; no mode shapes or unsteady aerodynamics.',
  'Control-surface mass balance: needs surface mass properties.',
  'Metallic fittings, bolts in shear, engine mount tubes and the nose gear are not analysed.',
  'Fatigue, creep and temperature cycling are not analysed.',
  'Strake fuel-tank pressure and slosh loads are not analysed.',
  'Allowables are typical-value stand-ins; real use needs coupon testing to A/B-basis.',
  'Spanwise loads use Schrenk; a panel or vortex-lattice solution would refine the canard–wing interaction.',
];
function renderReport() {
  $('rVersion').textContent = VERSION;
  const dEl = $('rDesign'); if (dEl) dEl.innerHTML = DESIGN_CHANGES.map((c) => `<tr><td><b>${esc(c.id)}</b><div class="note">${esc(c.title)}</div></td><td>${esc(c.date)}</td><td class="note">${esc(c.status)}${c.published ? `<div>${esc(c.published)}</div>` : ''}</td><td class="note"><b>Why:</b> ${esc(c.reason)}<br><b>Decision:</b> ${esc(c.decision)}<br><b>Change:</b> ${esc(c.change)}<br><b>Effect:</b> ${esc(c.effect)}${c.revisions ? `<br><b>Revisions:</b> ${esc(c.revisions.join(', '))}` : ''}</td><td class="note">${c.before.map(esc).join('<br>')}<br>→<br>${c.after.map(esc).join('<br>')}</td></tr>`).join('');
  $('rLog').innerHTML = changeLog.map((c) => `<tr><td>${c.t.toLocaleTimeString()}</td><td class="num">${c.version}</td><td>${esc(c.changes.join('; '))}</td><td class="num">${msBadge(c.minMS)}</td></tr>`).join('');
  $('rOpen').innerHTML = OPEN_ITEMS.map((x) => `<li>${esc(x)}</li>`).join('');
  $('rPreview').textContent = reportMarkdown();
}
async function copy(text, btn) {
  try { await navigator.clipboard.writeText(text); btn.textContent = 'Copied'; } catch (e) { btn.textContent = 'Copy blocked — select the preview and copy'; }
  setTimeout(() => { btn.textContent = btn.dataset.label; }, 2200);
}
$('copyMd')?.addEventListener('click', (e) => copy(reportMarkdown(), e.target));
$('copyCsv')?.addEventListener('click', (e) => copy(['version,part,check,case,location,mode,MS', ...R.rows.map((r) => [VERSION, r.part, r.name, r.case, r.where, r.mode, Number.isFinite(r.ms) ? r.ms.toFixed(4) : ''].map((x) => `"${String(x).replace(/"/g, '""')}"`).join(','))].join('\n'), e.target));

// ===================================================================== materials tab
function renderMats() {
  const M = R.M;
  $('mats').innerHTML = Object.entries(S.BASE_MAT).filter(([, m]) => m.kind !== 'adhesive').map(([k, m]) => {
    const e = M[k], pr = m.kind === 'ply'
      ? `t ${q(m.t, 'in')}/ply · E1 ${q(S.psi(m.E1), 'mod')} → ${q(S.psi(e.E1), 'mod')} · Xt ${q(S.psi(m.Xt), 'psi')} → ${q(S.psi(e.Xt), 'psi')} · Xc ${q(S.psi(m.Xc), 'psi')} → ${q(S.psi(e.Xc), 'psi')} · S ${q(S.psi(m.S), 'psi')} → ${q(S.psi(e.S), 'psi')} · ${m.areal ? `${m.areal.toFixed(4)} lb/ft² cured` : ''} · design × ${e.kA}${m.alternate ? ' · alternate, not used' : ''}`
      : `E ${q(S.psi(m.E), 'psi')} → ${q(S.psi(e.E), 'psi')} · G ${q(S.psi(m.Gc), 'psi')} → ${q(S.psi(e.Gc), 'psi')} · ${(m.rho * 62.43).toFixed(1)} lb/ft³`;
    return `<tr><td><span class="swatch" style="background:${m.color}"></span>${m.label}<div class="note">${esc(m.name)}</div></td><td class="note">${pr}</td></tr>`;
  }).join('') + `<tr><td colspan="2" class="note">Values shown as the NCAMP RTD mean → the design value (× the M-cycle reduction, BOUND) in the current environment (${S.ENV[R.d.env].label}${R.d.bvid ? ', BVID' : ''}).</td></tr>`;
  $('envTable').innerHTML = Object.entries(S.ENV).map(([k, e]) => { const b = S.BASE_MAT.BID, w = k === 'ETW' ? b.etw : b, r = (f) => (w[f] / b[f]).toFixed(2); return `<tr><td>${k}</td><td>${esc(e.label)} (6781 ETW / RTD)</td><td class="num">${r('Xt')}</td><td class="num">${r('Xc')}</td><td class="num">${r('S')}</td><td class="num">${r('E1')}</td><td class="num">${e.fcore}</td></tr>`; }).join('') + `<tr><td>BVID</td><td>Barely visible impact damage</td><td class="num">—</td><td class="num">${S.BVID_KD}</td><td class="num">—</td><td class="num">—</td><td class="num">—</td></tr>`;
  $('massTable').innerHTML = S.MASS_ITEMS.map((m) => `<tr><td>${esc(m[1])}</td><td class="num">${q(m[2], 'lbm')}</td><td class="num">FS ${(m[3] * 12).toFixed(0)}</td></tr>`).join('');
}

// ===================================================================== refresh / boot
function refreshAll() {
  refreshDrawing();
  renderPartList(); renderEnvTables(); renderMats(); $('mode').textContent = $('mode').textContent;
  if (sel) renderPartPanels(BOOKS[sel]);
  const on = document.querySelector('.tabs button[aria-selected="true"]').dataset.tab;
  showTab(on);
}
// ===================================================================== small screens: split handle between the 3D view and the panel
{
  const app = $('app'), sp = $('split'), presets = [0.5, 0.78, 0.26];
  let k = 0, drag = null;
  const setH = (px) => { const h = Math.max(120, Math.min(innerHeight - 140, px)); app.style.setProperty('--stageH', `${Math.round(h)}px`); };
  sp.addEventListener('pointerdown', (e) => { drag = { y: e.clientY, h: stage.clientHeight, moved: false }; sp.setPointerCapture(e.pointerId); });
  sp.addEventListener('pointermove', (e) => { if (!drag) return; const dy = e.clientY - drag.y; if (Math.abs(dy) > 4) drag.moved = true; if (drag.moved) setH(drag.h + dy); });
  sp.addEventListener('pointerup', () => { if (drag && !drag.moved) { k = (k + 1) % presets.length; setH(innerHeight * presets[k]); } drag = null; });
  sp.addEventListener('keydown', (e) => { if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); setH(stage.clientHeight + (e.key === 'ArrowDown' ? 40 : -40)); } });
  // the legend starts folded on small screens; tap it to open
  const lg = $('legend'); if (MOBILE.matches) lg.classList.add('min');
  lg.addEventListener('click', () => { if (MOBILE.matches) lg.classList.toggle('min'); });
  // picking a part in the 3D view on a phone: bring the panel's top into view
  window.__lezPanelTop = () => { if (MOBILE.matches) document.querySelector('aside').scrollTo({ top: 0, behavior: 'smooth' }); };
}
function resize() {
  const w = stage.clientWidth, h = stage.clientHeight; renderer.setSize(w, h); labels.setSize(w, h); camera.aspect = w / Math.max(h, 1);
  const dock = $('sheetDock'); if (dock && !dock.hidden) camera.setViewOffset(w, h, 0, dock.offsetHeight / 2, w, h); else camera.clearViewOffset();   // keep the framed part above the docked sheet
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(stage);
resize();
const tick = () => new Promise((r) => setTimeout(r, 20));
/** The appearance model's seats were wider and longer than the defined cabin: the front seat back's outer edges ran into
 *  the strake-to-fuselage close-out (LEZ-57-150) and its upper-left corner into the canopy latch rod (LEZ-52-120); the rear
 *  seat ran aft of the rear seat bulkhead (LEZ-53-175, FS 104.7) through the ELT, and its sides over the engine-control
 *  cables, the fuel-selector drive and the primer line along the cabin walls. Fitted here (vertex warp in the model's
 *  station frame, cushions and belts alike) so they clear every system part; checked by a mesh-intersection pass. */
function fitSeats(root) {
  root.updateMatrixWorld(true);
  const v = new THREE.Vector3(), inv = new THREE.Matrix4(), IN = FTM / 12;   // world metres ↔ model inches
  const clamp01 = (x) => Math.min(1, Math.max(0, x));
  const warp = {
    // front: 1.5 % narrower overall; the upper back (WL 38.5 → 40) aft of FS 69 → 70.5 tapers to 80 % width
    FrontSeat: (p) => { const fs = p.z / IN, wl = p.y / IN, w = clamp01((wl - 38.5) / 1.5) * clamp01((fs - 69) / 1.5); p.x *= 0.985 * (1 - 0.2 * w); },
    // rear: 80 % width; stations from FS 83.1 compressed so the back ends at FS 104.2, 0.5 in ahead of the rear seat bulkhead
    RearSeat: (p) => { p.x *= 0.8; const fs = p.z / IN; p.z = (83.1 + (fs - 83.1) * (104.2 - 83.1) / (109.1 - 83.1)) * IN; },
  };
  root.traverse((o) => {
    if (!o.isMesh) return;
    let n = o, key = null;
    while (n && !key) { key = Object.keys(warp).find((k) => (n.name || '').startsWith(k)); n = n.parent; }
    if (!key) return;
    const g = o.geometry = o.geometry.clone(), P = g.attributes.position; inv.copy(o.matrixWorld).invert();
    for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i).applyMatrix4(o.matrixWorld); warp[key](v); v.applyMatrix4(inv); P.setXYZ(i, v.x, v.y, v.z); }
    P.needsUpdate = true; g.computeBoundingSphere(); g.computeBoundingBox();
  });
}
(async () => {
  const L = (t) => { $('loading').textContent = t; };

  const T = [];
  let t = performance.now();
  const lap = (n) => { const now = performance.now(); T.push(`${n} ${(now - t).toFixed(0)} ms`); t = now; };   // timings go to the console; the corner indicator shows the step
  // First view: the Definition tab from its audit cache and the airframe, before the analysis; the loading line becomes
  // a small corner note and the 3D view can be orbited while the load cases run (a few tens of ms per task). The other
  // tabs fill when the analysis is done; until then they say so.
  const tabNow = () => document.querySelector('.tabs button[aria-selected="true"]').dataset.tab;
  await tick();
  if (tabNow() === 'defn') DUI.render();
  L('Loading airframe…'); await tick();
  await new Promise((resolve) => import('./longez-glb.js').then(({ default: b64 }) => {
    const str = atob(b64), bin = new Uint8Array(str.length); for (let i = 0; i < str.length; i++) bin[i] = str.charCodeAt(i);   // a plain loop: Uint8Array.from with a callback is ~10x slower on 2 MB
    new GLTFLoader().parse(bin.buffer, '', (gltf) => {
      airframe = gltf.scene;
      fitSeats(airframe);
      airframe.traverse((o) => {
        if (!o.isMesh) return;
        let n = o.name, p = o;
        while (p && !/^(Wing|Aileron|Canard|Elevator|Winglet|Rudder|Fuselage|MainGear|Strake|Canopy)/.test(n) && p.parent) { p = p.parent; n = p.name; }
        o.name = n; o.userData.orig = o.material; airMeshes.push(o);
        if (/Glass/.test(o.material.name || '')) { o.material.transparent = true; o.material.opacity = 0.3; o.material.depthWrite = false; }
      });
      scene.add(airframe);
      setupCanopy();
      frame(null);
      resolve();
    }, (e) => { $('loading').textContent = 'Could not read the model'; console.error(e); resolve(); });
  }));
  lap('airframe'); window.__lezFirstView = Math.round(performance.now());
  // the loading indicator becomes a small spinning pill in the 3D view's upper-left corner, just under the mode label
  // (and the top bar when that wraps onto the left), until the analysis, the systems and the nose gear are all in
  const pill = $('loading'); pill.classList.add('pill');
  const placePill = () => {
    const st = $('stage').getBoundingClientRect(); let top = 12;
    for (const id of ['mode', 'topbar']) { const r = $(id).getBoundingClientRect(); if (r.width && r.left - st.left < 280) top = Math.max(top, r.bottom - st.top + 6); }
    pill.style.top = `${Math.round(top)}px`;
  };
  placePill(); const pillRO = new ResizeObserver(placePill); pillRO.observe($('stage'));
  const d = { ...design };
  L('Loading · sizing plies…'); await tick();
  await calm();
  if (SYS.ADOPTED.size) { massModel(d); lap('sizing and mass model'); await tick(); }
  L('Loading · structural analysis (42 load cases)…'); await tick();
  const ch = new MessageChannel(), pause = () => new Promise((r) => { ch.port1.onmessage = () => r(); ch.port2.postMessage(0); });
  R = await S.analyseAsync(d, pause, () => (busy() ? 8 : 100)); lap('42 load cases');   // short slices while the user orbits, so frames keep coming   // the same result as S.analyse(d, false), ≤ ~0.2 s per task
  L('Loading · ply book, systems and gear…'); await tick(); await calm();
  finishRun(); lap('ply book');
  L('Loading · panels…'); await tick(); await calm();
  fillCaseSelects(); renderPartList(); renderEnvTables(); renderMats();
  document.querySelectorAll('.pane.waiting').forEach((p) => p.classList.remove('waiting'));
  showTab(tabNow());   // whichever tab is open now, drawn with the analysis
  airframeLook();
  lap('panels');
  pillRO.disconnect(); $('loading').remove();
  console.log('[LEZ] boot', T.join(', '), window.__lezBoot ? `· modules ${window.__lezBoot}` : '', `· first view ${window.__lezFirstView} ms`);
  setTimeout(() => DUI.warm(), 1500);   // the Definition tab's live engine (a worker) once the page has settled
})();
$('gearBtn').addEventListener('click', () => animateGear(!gearUp));
// ---- render loop. The systems layer and the nose gear draw through batcher.js (one merged mesh per material instead of
// ~1,400 meshes). A frame is drawn only when something can have changed: the camera moved, an animation runs, a batch
// was rebuilt, the user touched the page in the last 1.5 s, or 0.4 s have passed (async loads show up within that).
// A governor lowers the pixel ratio a step if frames stay slow while drawing continuously (a weak or very high-DPI GPU).
const BATCH = new WeakMap(), batchOf = (g) => { let b = BATCH.get(g); if (!b) BATCH.set(g, (b = batcher(g))); return b; };
const camLast = new Float32Array(32), camNow = new Float32Array(32);
let lastDraw = 0, slow = 0, prevT = 0;
window.__lezBatch = () => [sysGroup, NGEAR && NGEAR.group].filter(Boolean).map((g) => ({ group: g.name, ...batchOf(g).stats() }));   // test hook
renderer.setAnimationLoop((now) => {
  if (canopyAnim) canopyAnim(); if (gearAnim) gearAnim(); seqTick();
  const damped = controls.update();
  scene.updateMatrixWorld();
  let changed = false;
  for (const g of [sysGroup, NGEAR && NGEAR.group]) if (g && g.parent) changed = batchOf(g).sync() || changed;
  camera.updateMatrixWorld(); camNow.set(camera.matrixWorld.elements); camNow.set(camera.projectionMatrix.elements, 16);
  let camMoved = false; for (let i = 0; i < 32; i++) if (camNow[i] !== camLast[i]) { camMoved = true; break; }
  const animating = !!(canopyAnim || gearAnim || ui.wasMoving || damped || camMoved);
  if (!(animating || changed || busy(1500) || now - lastDraw > 400)) { prevT = 0; return; }
  renderer.render(scene, camera); labels.render(scene, camera);
  camLast.set(camNow);
  // governor: only judges back-to-back frames while the view is moving
  const dt = prevT ? now - prevT : 0; prevT = now; lastDraw = now;
  if (animating && dt > 0 && dt < 250) {
    if (dt > 26) { if (++slow > 45 && dpr > 1) { dpr = Math.max(1, +(dpr - 0.25).toFixed(2)); renderer.setPixelRatio(dpr); slow = 0; } }
    else { slow = Math.max(0, slow - 1); }
  }
});
