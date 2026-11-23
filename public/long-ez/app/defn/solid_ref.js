// Solids by reference: a definition record names its solid by module and export; its record (parameter hash, builder,
// measurements) comes from the generated index (solids/index.js, tests/solid_index.mjs), and the mesh module (up to
// 1 MB of triangles) is imported only when a 3D view needs it. The release audit reads hash and measurements, so it runs
// without the meshes; tests/audit.mjs loads every module first and judges the solids themselves (loadAllSolids).
import { SOLIDS } from './solids/index.js';

const REFS = new Map();
const MISSING = () => ({ pn: null, hash: 'not-indexed', made: 'not in solids/index.js (run node tests/solid_index.mjs)', measured: { volume: 0, volumes: {}, bbox: [0, 0, 0, 0, 0, 0], holes: [], faces: 0 } });
/** the solid exported as `name` by solids/<file>.js; one shared object per solid */
export function solidRef(file, name) {
  const k = `${file}:${name}`;
  if (!REFS.has(k)) { const m = SOLIDS[file] && SOLIDS[file][name], s = m ? JSON.parse(JSON.stringify(m)) : MISSING();
    Object.defineProperty(s, 'ref', { value: { file, name, indexed: !!m }, enumerable: false }); REFS.set(k, s); }
  return REFS.get(k);
}
/** every solid of one module, by export name (as `import * as NS from './solids/<file>.js'` gave) */
export const solidNS = (file) => Object.fromEntries(Object.keys(SOLIDS[file] || {}).map((n) => [n, solidRef(file, n)]));
/** has the mesh been loaded? (a record imported the old way, with its module, always has it) */
export const meshReady = (s) => !!(s && s.mesh);
/** load a solid's module: the module's own record replaces the index's (hash, measurements) and the mesh comes with it.
 *  s.indexFresh tells whether the index agreed with the module */
export async function loadSolid(s) {
  if (!s || s.mesh || !s.ref) return s;
  const mod = await import(`./solids/${s.ref.file}.js`), full = mod[s.ref.name];
  if (!full) throw new Error(`solids/${s.ref.file}.js has no ${s.ref.name}`);
  Object.defineProperty(s, 'indexFresh', { value: full.hash === s.hash && JSON.stringify(full.measured) === JSON.stringify(s.measured), enumerable: false, configurable: true });
  Object.assign(s, full);
  return s;
}
/** load every solid referenced so far (node: the audit judges the modules, not the index); returns the refs whose index
 *  record differed from their module */
export async function loadAllSolids() {
  const stale = [];
  for (const s of REFS.values()) { await loadSolid(s); if (!s.indexFresh) stale.push(`${s.ref.file}:${s.ref.name}`); }
  return stale;
}
