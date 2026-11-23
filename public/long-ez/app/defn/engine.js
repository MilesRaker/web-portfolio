// The Definition tab's live engine: loads the parts and the definition records, runs the analysis the way
// tests/audit.mjs does (the mass model from the sizing, then the analysis with it, then the routing clashes) and answers
// the inspector: a part's record, its live release audit and readiness, its drawing sheet, the parameter hashes the audit
// cache is checked against. Runs in a module worker (worker.js) so the page stays responsive; if a worker cannot start,
// the explorer imports this module on the main thread instead. DOM-free.
let E = null;

const plain = (v) => JSON.parse(JSON.stringify(v, (k, x) => (typeof x === 'function' ? undefined : x instanceof RegExp ? String(x) : typeof x === 'number' && !Number.isFinite(x) ? null : x)));

/** load and analyse; progress(text) reports each stage. design: the explorer's design (the default unless re-sized) */
export async function init(design, progress = () => {}) {
  progress('loading the engine');
  const S = await import('../structures.js'), PB = await import('../plybook.js'), SYS = await import('../systems.js');
  progress('loading the parts'); await import('../parts/index.js');
  progress('analysing');
  const d = design || S.DEFAULT_DESIGN;
  SYS.applyMassModel(PB.buildPlyBook(S.sizing(d)));   // the mass model: as the audit's first pass (its plies depend on the sizing alone)
  const R = S.analyse(d, false), B = PB.buildPlyBook(R), clashes = SYS.clashCheck();
  progress('loading the definition records');
  const REL = await S.withAnalysisMemoAsync(() => import('./release.js')), SH = await S.withAnalysisMemoAsync(() => import('./sheet.js')), STD = await import('./standard.js');
  E = { S, SYS, R, B, clashes, REL, SH, STD, design: d };
  return { pns: Object.keys(REL.DEFS) };
}
const need = () => { if (!E) throw new Error('engine not initialised'); return E; };

/** a part's (or a ply-book laminate's) readiness and release audit, live: the shape of an audit-cache row */
export function audit(pn) {
  const { S, SYS, R, B, clashes, STD, REL } = need();
  return S.withAnalysisMemo(() => {
    const book = Object.keys(B).find((id) => id === pn || SYS.structPN(id) === pn);
    let a;
    if (book && !SYS.partByPN(pn)) a = { ...STD.assessBook(book, B[book], R.rows.filter((r) => r.part === book && !r.sys), R.rows, clashes), name: B[book].name, ata: 0 };
    else { const p = SYS.partByPN(pn); if (!p) return null; a = { ...STD.assessPart(p, { rows: R.rows, clashes }), name: p.name, ata: p.ata, nha: p.nha }; }
    const D = REL.DEFS[a.defPN || a.pn];
    return plain({ pn: a.pn, defPN: a.defPN, book: !!a.book, name: a.name, ata: a.ata, nha: a.nha, fields: a.fields,
      release: a.release ? { pn: a.release.pn, rev: a.release.rev, ok: a.release.ok, items: a.release.items, bound: a.release.bound } : null, title: D && D.def.title, status: D && D.def.status, live: true });
  });
}
/** current parameter hash of each record (pns: a slice, so the caller can show progress) */
export function hashes(pns) {
  const { S, REL } = need();
  return S.withAnalysisMemo(() => Object.fromEntries(pns.map((pn) => { const D = REL.DEFS[pn]; try { return [pn, D ? D.hash(D.params()) : null]; } catch (e) { return [pn, `error: ${e.message}`]; } })));
}
/** where each record's solid goes in the aircraft (the 3D view builds the meshes from these) */
export function places(pns) {
  const { S, REL } = need();
  return S.withAnalysisMemo(() => Object.fromEntries(pns.map((pn) => { const D = REL.DEFS[pn]; if (!D || !D.solid) return [pn, null]; const p = D.params();
    return [pn, { place: D.place ? plain(D.place(p)) : null, vMid: D.vMid ? D.vMid(p) : null, book: D.book || null, laminate: !!D.laminate, install: !!D.install, shows: D.shows || null,
      mesh: D.solid.ref ? { file: D.solid.ref.file, name: D.solid.ref.name } : null }]; })));
}
/** the record and everything the inspector shows from it, as plain data; interfaces carry their check results */
export function record(pn) {
  const { S, REL, SH } = need(), D = REL.DEFS[pn]; if (!D) return null;
  return S.withAnalysisMemo(() => {
    const d = D.def, ifc = d.interfaces.map((f) => { const c = f.check(); return { id: f.id, with: f.with, what: f.what, feature: f.feature, ok: !!c.ok, detail: c.detail }; });
    const def = plain({ ...d, interfaces: undefined }); def.interfaces = ifc;
    const sol = D.solid ? { hash: D.solid.hash, made: D.solid.made, measured: plain(D.solid.measured), mesh: D.solid.ref ? { file: D.solid.ref.file, name: D.solid.ref.name } : null } : null;
    return { pn, def, install: !!D.install, laminate: !!D.laminate, book: D.book || null, shows: D.shows || null, solid: sol, measure: plain(REL.measureCheck(pn) || []), sheet: SH.sheetSVG(pn), params: D.hash(D.params()) };
  });
}
/** a solid's mesh for a record whose solid came in with its module (no index entry to load it from) */
export function mesh(pn) { const D = need().REL.DEFS[pn]; return D && D.solid && D.solid.mesh ? D.solid.mesh : null; }
