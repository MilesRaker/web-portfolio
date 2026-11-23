// ui_defn.js — the Definition tab: readiness of every part against the part definition standard, an inspector in four
// groups, and for parts with a definition record the CadQuery solid in the 3D view and a drawing sheet docked under it,
// linked both ways (hover a dimension → its feature lights on the solid; click the solid → its dimensions light).
// The matrix and the inspector's readiness read the precomputed audit (defn/audit_cache.json, written by
// tests/audit.mjs); the records, sheets and a live re-audit come from the live engine (defn/live.js: a worker), so the
// tab never runs the release audit of every part on the page. A part whose parameters have changed since the cache was
// written is marked stale; a solid's mesh module loads when its 3D view needs it.
import * as THREE from 'three';
import * as SYS from './systems.js';
import { FTM } from './geom.js';
import { GROUPS, FIELDS, STATE, score } from './defn/fields.js';
import { liveEngine } from './defn/live.js';
import { ATTACH, LUG } from './parts/wp13_airframe_joints.js';
import { GEO, CS_FIT } from './structures.js';

/** ctx: { R(), BOOKS(), ORDER, q, esc, msBadge, traceHTML(c), select3D(pn), selectBook(id), openLayup(id), openSystems(pn),
 *        scene, camera, renderer, frameObj(obj), xray(on), sysGroup(), design() } */
export function initDefnUI(ctx) {
  const $ = (id) => document.getElementById(id), { esc, q, msBadge } = ctx;
  let rows = null, selPN = null, group = 'def', filt = { text: '', open: false };
  // ---------------------------------------------------------------- the audit cache and the live engine
  let cache, cacheState = 'loading';   // 'loading' | 'ok' | 'none'
  const live = new Map(), records = new Map(), stale = new Set(), places = {};
  let engine = null, engState = '', engDesign = null, hashState = '';
  const meta = (pn) => (places[pn] || (cache && cache.defs[pn]) || null);   // record flags: book, install, shows, laminate, mesh
  const hasRec = (pn) => !!(cache && cache.defs[pn]) || !!places[pn];
  fetch(new URL('./defn/audit_cache.txt', import.meta.url)).then((r) => (r.ok ? r.json() : null)).catch(() => null).then((c) => {
    cache = c; cacheState = c ? 'ok' : 'none'; rows = null; if (shown()) { renderMatrix(); if (selPN) renderInspector(); }
    if (!c) assessAllLive();
  });
  const shown = () => $('pane-defn') && $('pane-defn').classList.contains('on');
  const designKey = (d) => JSON.stringify(Object.keys((cache && cache.design) || d).sort().map((k) => [k, d[k]]));
  const designMoved = () => !!cache && !!ctx.design && designKey(ctx.design()) !== designKey(cache.design);
  /** the live engine (started on first need, or once the page has settled): records, sheets, live audits, hashes */
  function eng() {
    const d = ctx.design ? ctx.design() : null, key = d ? designKey(d) : '';
    if (engine && engDesign === key) return engine;
    if (engine) engine.terminate();
    engDesign = key; records.clear(); for (const k of Object.keys(places)) delete places[k]; hashState = '';
    engine = liveEngine(d, (t) => { engState = t; status(); });
    engine.ready.then(() => { engState = `ready (${engine.kind === 'worker' ? 'worker' : 'main thread'})`; status(); checkStale(); }, (e) => { engState = `failed: ${e.message}`; status(); });
    return engine;
  }
  /** compare every record's parameter hash with the cache's, a slice at a time (the engine answers between slices) */
  async function checkStale() {
    if (!cache || hashState) return; hashState = 'checking';
    const pns = Object.keys(cache.defs), E = eng();
    for (let i = 0; i < pns.length; i += 12) {
      hashState = `checking parameters ${i}/${pns.length}`; status();
      const h = await E.call('hashes', pns.slice(i, i + 12));
      for (const [pn, v] of Object.entries(h)) if (v !== cache.defs[pn].params) stale.add(pn); else stale.delete(pn);
    }
    hashState = 'done'; status(); if (shown()) { renderMatrix(); if (selPN) renderInspector(); }
  }
  /** no cache: assess every part live, a part per request, with progress */
  async function assessAllLive() {
    const E = eng(); await E.ready; const pns = [...ctx.ORDER, ...SYS.PARTS.map((p) => p.pn)];
    for (let i = 0; i < pns.length; i++) { engState = `assessing live ${i + 1}/${pns.length}`; status(); const a = await E.call('audit', pns[i]); if (a) live.set(pns[i], a); if (i % 20 === 19 && shown()) { rows = null; renderMatrix(); } }
    engState = 'ready'; rows = null; status(); if (shown()) renderMatrix();
  }
  function status() {
    let el = $('dfCache');
    if (!el) { el = document.createElement('p'); el.id = 'dfCache'; el.className = 'note dfcache'; $('dfSummary').after(el); }
    const c = cache, ago = c ? new Date(c.generated) : null, st = [...stale].filter((pn) => c && c.defs[pn]);
    const parts = [];
    if (cacheState === 'loading') parts.push('Reading the audit cache…');
    else if (!c) parts.push('<b class="bad">No audit cache</b> (defn/audit_cache.json): run <code>node tests/audit.mjs</code> to write it. Assessing live meanwhile.');
    else parts.push(`Audit cache of ${esc(ago.toLocaleString())}, tree <span class="pn">${esc(c.tree)}</span>`);
    if (c && designMoved()) parts.push('<b class="warn">The design has been re-sized since the cache: every row is from the default design; re-audit a part to see it live.</b>');
    if (c && hashState === 'done') parts.push(st.length ? `<b class="warn">${st.length} part${st.length > 1 ? 's' : ''} whose parameter hash here differs from the audit's: ${st.slice(0, 6).map(esc).join(', ')}${st.length > 6 ? ' …' : ''}</b> · marked ⚠ in the matrix; re-audit in the inspector to see them live` : 'every record\'s parameters match the cache');
    else if (c && hashState) parts.push(esc(hashState));
    if (engState) parts.push(`live engine: ${esc(engState)}`);
    el.innerHTML = parts.join(' · ');
  }

  // ---------------------------------------------------------------- readiness
  const placeholder = (pn, name, ata, nha) => ({ pn, name, ata, nha, missing: true, release: null, fields: Object.fromEntries(FIELDS.map((f) => [f.id, { st: 'miss', why: 'Not in the audit cache: re-run node tests/audit.mjs, or re-audit this part live' }])) });
  function assembleRows() {
    const by = new Map(((cache && cache.rows) || []).map((a) => [a.pn, a]));
    for (const [pn, a] of live) by.set(pn, a);
    const books = ctx.ORDER.filter((id) => by.has(id)).map((id) => by.get(id));
    const parts = SYS.PARTS.map((p) => by.get(p.pn) || (cache || live.size ? placeholder(p.pn, p.name, p.ata, p.nha) : null)).filter(Boolean);
    return [...books, ...parts];
  }
  const dot = (f) => `<i class="st ${f.st}" title="${esc(`${STATE[f.st]}: ${f.why}`)}"></i>`;
  const isStale = (a) => stale.has(a.defPN || a.pn) && !live.has(a.pn);
  function renderMatrix() {
    rows = rows || assembleRows(); status();
    if (!rows.length) { $('dfSummary').textContent = cacheState === 'loading' ? 'Reading the audit cache…' : 'Assessing every part live…'; $('dfMatrix').innerHTML = ''; $('dfCount').textContent = ''; return; }
    const n = rows.length, full = rows.filter((a) => score(a) === 1).length, rel = rows.filter((a) => a.release && a.release.ok).length, held = rows.filter((a) => a.release && !a.release.ok && a.status === 'held').length;
    const cells = rows.flatMap((a) => Object.values(a.fields)).filter((f) => f.st !== 'na'), done = cells.filter((f) => f.st === 'done').length;
    $('dfSummary').innerHTML = `<b>${full}</b> of ${n} parts meet the definition standard on every field · <b>${rel}</b> released${held ? ` · <b>${held}</b> defined, release held` : ''} · ${(100 * done / cells.length).toFixed(0)} % of applicable fields done`;
    $('dfGates').innerHTML = [['A', 'Decisions locked, pilot part released', rel >= 1], ['B', 'Primary structure released', false], ['C', 'All systems released', false], ['D', 'Build-ready definition Rev A', false]]
      .map(([g, t, ok]) => `<div class="gate${ok ? ' ok' : ''}" title="${esc(t)}"><b>${g}</b><span>${esc(t)}</span><em>${ok ? 'passed' : 'open'}</em></div>`).join('');
    const tx = filt.text.trim().toLowerCase();
    const show = rows.filter((a) => (!tx || `${a.pn} ${a.name}`.toLowerCase().includes(tx)) && (!filt.open || score(a) < 1));
    const groups = [['Primary structure (ply books)', show.filter((a) => a.book)], ...[...new Set(show.filter((a) => !a.book).map((a) => a.ata))].sort((x, y) => x - y).map((ata) => [`ATA ${ata} ${SYS.ATA[ata] || ''}`, show.filter((a) => !a.book && a.ata === ata)])];
    const head = `<thead><tr><th class="rowh">Part</th>${FIELDS.map((f) => `<th title="${esc(`${f.label}: ${f.holds}`)}"><span>${esc(f.short)}</span></th>`).join('')}<th><span>Done</span></th></tr></thead>`;
    const flag = (a) => (a.missing ? ' <span class="stale" title="Not in the audit cache">⚠</span>' : isStale(a) ? ' <span class="stale" title="Parameter hash differs from the audit cache\'s: re-audit in the inspector">⚠</span>' : live.has(a.pn) ? ' <span class="live" title="Re-audited live">●</span>' : '');
    const body = groups.filter(([, xs]) => xs.length).map(([g, xs]) => `<tr class="grp"><td class="rowh" colspan="${FIELDS.length + 2}">${esc(g)}</td></tr>` + xs.map((a) =>
      `<tr class="clickable${a.pn === selPN ? ' hl' : ''}${isStale(a) || a.missing ? ' stale' : ''}" data-pn="${esc(a.pn)}"><td class="rowh" title="${esc(a.name)}"><span class="pn">${esc(a.book ? a.name : a.pn)}</span>${a.book ? '' : ` ${esc(a.name)}`}${flag(a)}</td>${FIELDS.map((f) => `<td>${dot(a.fields[f.id])}</td>`).join('')}<td class="num">${(100 * score(a)).toFixed(0)}%</td></tr>`).join('')).join('');
    $('dfMatrix').innerHTML = head + `<tbody>${body}</tbody>`;
    $('dfMatrix').querySelectorAll('tr[data-pn]').forEach((tr) => tr.addEventListener('click', () => selectPart(tr.dataset.pn, true)));
    $('dfCount').textContent = `${show.length} shown`;
  }

  // ---------------------------------------------------------------- inspector
  function selectPart(pn, from) {
    rows = rows || assembleRows();
    selPN = pn; const a = rows.find((x) => x.pn === pn); if (!a) return;
    $('dfMatrix').querySelectorAll('tr[data-pn]').forEach((tr) => tr.classList.toggle('hl', tr.dataset.pn === pn));
    const dp = a.defPN || a.pn;
    if (a.book && a.defPN) { ctx.selectBook(pn); showSolid(a.defPN); } else if (a.book) { ctx.selectBook(pn); showSolid(null); } else { ctx.select3D(pn); showSolid(hasRec(pn) ? pn : null); }
    if (hasRec(dp)) loadRecord(dp);
    renderInspector();
    if (from) $('dfInspector').scrollIntoView({ block: 'start', behavior: 'smooth' });
  }
  /** fetch a record from the live engine (once), then redraw the inspector if it is still showing that part */
  function loadRecord(pn) {
    if (records.has(pn)) return records.get(pn);
    const p = eng().call('record', pn).then((r) => { records.set(pn, r); const a = rows && rows.find((x) => x.pn === selPN); if (a && (a.defPN || a.pn) === pn) renderInspector(); return r; },
      (e) => { records.delete(pn); engState = `record ${pn} failed: ${e.message}`; status(); throw e; });
    records.set(pn, p); return p;
  }
  const recNow = (pn) => { const r = records.get(pn); return r && !(r instanceof Promise) ? r : null; };
  async function reaudit(pn) {
    const b = $('dfBody').querySelector('[data-act="reaudit"]'); if (b) { b.disabled = true; b.textContent = 'Re-auditing… (starting the live engine)'; }
    const E = eng(); const t = setInterval(() => { const x = $('dfBody').querySelector('[data-act="reaudit"]'); if (x && x.disabled) x.textContent = `Re-auditing… (${engState || 'working'})`; }, 250);
    try { const a = await E.call('audit', pn); if (a) { a.at = new Date(); live.set(pn, a); const dp = a.defPN || a.pn; records.delete(dp); if (hasRec(dp)) { const h = await E.call('hashes', [dp]); if (cache && cache.defs[dp] && h[dp] !== cache.defs[dp].params) stale.add(dp); else stale.delete(dp); } } }
    catch (e) { engState = `re-audit failed: ${e.message}`; }
    finally { clearInterval(t); }
    rows = null; renderMatrix(); if (selPN === pn) { if (hasRec(pn) || (rows.find((x) => x.pn === pn) || {}).defPN) loadRecord((rows.find((x) => x.pn === pn) || {}).defPN || pn); renderInspector(); }
  }
  const row = (f, a, extra = '') => `<div class="fld"><div class="fh">${dot(a.fields[f.id])}<b>${esc(f.label)}</b><span class="note">${esc(STATE[a.fields[f.id].st])}</span></div><div class="fw">${esc(a.fields[f.id].why)}</div>${extra}</div>`;
  function renderInspector() {
    const a = rows && rows.find((x) => x.pn === selPN); $('dfInspector').hidden = !a; if (!a) return;
    const dp = a.defPN || a.pn, M = hasRec(dp) ? meta(dp) : null, cd = cache && cache.defs[dp], rec = M ? recNow(dp) : null, p = !a.book && SYS.partByPN(a.pn);
    const title = (rec && rec.def.title) || a.title || (cd && cd.title), rev = (rec && rec.def.rev) || (a.release && a.release.rev) || (cd && cd.rev), held = (a.status || (cd && cd.status)) === 'held';
    $('dfName').innerHTML = `${a.book ? (a.defPN ? `<span class="pn">${esc(a.defPN)}</span> ` : '') : `<span class="pn">${esc(a.pn)}</span> `}${esc(M ? title : a.name)}${M ? ` <span class="rev">Rev ${esc(rev)}</span> ${a.release && a.release.ok ? '<span class="ms g">released</span>' : held ? '<span class="ms y">release held</span>' : '<span class="ms b">release audit open</span>'}` : ''}`;
    $('dfBlurb').textContent = (p && p.blurb) || (a.book ? ((ctx.BOOKS() || {})[a.pn] || {}).blurb || '' : '');
    $('dfGroups').innerHTML = GROUPS.map((g) => { const fs = FIELDS.filter((f) => f.group === g.id), app = fs.filter((f) => a.fields[f.id].st !== 'na'), d = app.filter((f) => a.fields[f.id].st === 'done').length;
      return `<button data-g="${g.id}" aria-pressed="${g.id === group}">${esc(g.label)}<small>${app.length ? `${d}/${app.length}` : '—'}</small></button>`; }).join('');
    $('dfGroups').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { group = b.dataset.g; renderInspector(); }));
    const la = live.get(a.pn), when = la ? `re-audited live ${la.at ? la.at.toLocaleTimeString() : ''}` : cache && !a.missing ? `from the audit cache (${new Date(cache.generated).toLocaleString()})${isStale(a) ? ' · <b class="warn">stale: its parameter hash here differs from the audit\'s</b>' : ''}` : a.missing ? '<b class="warn">not in the audit cache</b>' : 'assessed live';
    const re = `<button class="btn ghost" data-act="reaudit" title="Run this part's release audit and readiness now, in the live engine">Re-audit live</button>`;
    const links = a.book ? `<div class="rowbtns"><button class="btn" data-act="layup">▶ Play the ply-by-ply layup</button>${M ? '<button class="btn ghost" data-act="sheet">Open the drawing sheet</button><button class="btn ghost" data-act="solid">Frame the solid</button>' : ''}<button class="btn ghost" data-act="part">Open in Parts</button>${re}</div>`
      : `<div class="rowbtns">${M ? '<button class="btn" data-act="sheet">Open the drawing sheet</button><button class="btn ghost" data-act="solid">' + (M.install ? 'Frame the joint' : 'Frame the solid') + '</button>' : ''}<button class="btn ghost" data-act="sys">Open in Systems</button>${re}</div>`;
    const src = `<p class="note dfsrc">Readiness ${when}.</p>`;
    const wait = M && !rec ? `<p class="note">Loading the record from the live engine (${esc(engState || 'starting')})…</p>` : '';
    $('dfBody').innerHTML = links + src + (M && rec ? richGroup(a, rec) : wait + FIELDS.filter((f) => f.group === group).map((f) => row(f, a)).join('') + (M && group === 'src' && a.release ? auditList(a) : ''));
    $('dfBody').querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', () => {
      const k = b.dataset.act;
      if (!ctx.R() && ['layup', 'part', 'sys'].includes(k)) return;   // those views need the analysis (still running at boot)
      if (k === 'layup') ctx.openLayup(a.pn); else if (k === 'part') ctx.selectBook(a.pn, true); else if (k === 'sys') ctx.openSystems(a.pn);
      else if (k === 'sheet') openSheet(dp); else if (k === 'solid') { showSolid(dp, true); } else if (k === 'reaudit') reaudit(a.pn);
    }));
    $('dfBody').querySelectorAll('tr.chk').forEach((tr) => tr.addEventListener('click', () => { const t = tr.nextElementSibling; if (t && t.classList.contains('trace')) t.hidden = !t.hidden; }));
    $('dfBody').querySelectorAll('[data-feat]').forEach((el) => { el.addEventListener('mouseenter', () => lightFeature(el.dataset.feat)); el.addEventListener('mouseleave', () => lightFeature(null)); });
  }
  const auditList = (a) => `<div class="fld"><div class="fh"><b>Release audit</b><span class="note">${a.release.items.filter((x) => x.ok).length}/${a.release.items.length} pass</span></div><ul class="audit">${a.release.items.map((x) => `<li class="${x.ok ? '' : 'bad'}">${x.ok ? '✓' : '✗'} <span class="cat">${esc(x.cat)}</span> ${esc(x.msg)}</li>`).join('')}</ul></div>`;
  const fx4 = (v) => (v == null || !Number.isFinite(Number(v)) ? 'missing' : Number(v).toFixed(4));
  function richGroup(a, D) {
    const d = D.def, R = ctx.R(), F = (id) => FIELDS.find((f) => f.id === id);
    if (group === 'def') {
      const m = D.measure;
      return row(F('identity'), a, `<table class="kv"><tbody><tr><td>Part number</td><td>${esc(d.pn)} rev ${esc(d.rev)}</td></tr><tr><td>Next-higher assembly</td><td>${esc(d.nha)}</td></tr><tr><td>Quantity</td><td>${d.qty} per aircraft</td></tr><tr><td>Effectivity</td><td>${esc(d.effectivity)}</td></tr>${d.revs.map((r) => `<tr><td>Rev ${esc(r.rev)} · ${esc(r.date)}</td><td>${esc(r.change)}</td></tr>`).join('')}</tbody></table>`)
        + (D.install ? row(F('solid'), a) : row(F('solid'), a, `<table class="kv"><tbody><tr><td>Built with</td><td>${esc(D.solid.made)} from model parameters ${esc(D.solid.hash)}</td></tr><tr><td>Volume</td><td>${D.solid.measured.volume.toFixed(4)} in³</td></tr><tr><td>Faces · holes</td><td>${D.solid.measured.faces} · ${D.solid.measured.holes.length}</td></tr></tbody></table>`))
        + row(F('drawing'), a, `<div class="sheetthumb" data-act="sheet" title="Open beside the 3D view">${D.sheet}</div><table class="feat"><thead><tr><th>Feature</th><th>Tolerance</th></tr></thead><tbody>${d.features.map((f) => `<tr data-feat="${esc(f.id === 'outline' ? 'outline' : f.id)}"><td>${esc(f.label)}${f.note ? `<div class="note">${esc(f.note)}</div>` : ''}</td><td>${esc(f.tol)}</td></tr>`).join('')}</tbody></table>
          ${D.install ? '' : `<details><summary>Drawing check: ${m.filter((x) => x.ok).length}/${m.length} dimensions measured back from the solid</summary><table class="kv"><tbody>${m.map((x) => `<tr><td>${x.ok ? '✓' : '✗'} ${esc(x.what)}</td><td class="num">${fx4(x.want)} / ${fx4(x.got)}</td></tr>`).join('')}</tbody></table></details>`}`)
        + row(F('cut'), a) + row(F('layup'), a);
    }
    if (group === 'eng') {
      if (!R) return `<p class="note">The structural analysis is still running; its checks show here when it is done.</p>` + FIELDS.filter((f) => f.group === 'eng').map((f) => row(f, a)).join('');
      const mine = d.checks.map((id) => R.rows.filter((r) => r.id === id).sort((x, y) => x.ms - y.ms)[0]).filter(Boolean);
      return row(F('material'), a, `<table class="kv"><tbody><tr><td>Material</td><td>${esc(d.material.spec)}<div class="note">${esc(d.material.form)} · alternative: ${esc(d.material.alt)}</div></td></tr>${d.material.allowables.map(([k, v, s]) => `<tr><td>${esc(k)}</td><td>${esc(v)} <span class="src">${esc(s)}</span></td></tr>`).join('')}${d.process.map((x) => `<tr><td>${esc(x.op)}</td><td>${esc(x.spec)}</td></tr>`).join('')}</tbody></table>`)
        + row(F('subst'), a, `<table><tbody>${mine.map((c) => `<tr class="chk"><td>${esc(c.name)}<div class="note">${esc(c.mode)} · ${esc(c.case)}</div></td><td class="num">${msBadge(c.ms)}</td></tr><tr class="trace" hidden><td colspan="2">${ctx.traceHTML(c)}</td></tr>`).join('')}</tbody></table>
          <p class="note">Bounded inputs (no ASSUMED input on the load path): ${(a.release ? a.release.bound : []).map(esc).join(' · ')}</p>
          <table class="kv"><tbody>${d.rules.map((r) => `<tr><td>${r.v >= r.min - 1e-9 ? '✓' : '✗'} ${esc(r.label)}</td><td class="num">${r.v.toFixed(2)}</td></tr>`).join('')}</tbody></table>`)
        + row(F('mass'), a, `<p class="note">${q(d.mass.each, 'lbm')} each × ${d.qty} = ${q(d.mass.each * d.qty, 'lbm')} per aircraft; ${esc(d.mass.from)}.</p>`);
    }
    if (group === 'int') {
      return row(F('hardware'), a) + row(F('interfaces'), a, `<table><tbody>${d.interfaces.map((f) => `<tr data-feat="${esc(f.feature)}"><td><b>${esc(f.id)}</b> ${esc(f.with)}<div class="note">${esc(f.what)}</div><div class="note">${esc(f.detail)}</div></td><td>${f.ok ? '<span class="ms g">pass</span>' : '<span class="ms b">fail</span>'}</td></tr>`).join('')}</tbody></table>`)
        + row(F('tooling'), a);
    }
    const s = d.sourcing;
    return row(F('sourcing'), a, `<table class="kv"><tbody><tr><td>Blank</td><td>${esc(s.blank)}</td></tr><tr><td>Vendor</td><td><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.vendor)}</a></td></tr><tr><td>Cost</td><td>$${s.cost.toFixed(2)} each, $${(s.cost * s.perAircraft).toFixed(2)} per aircraft <span class="note">(listed ${esc(s.costAsOf)})</span></td></tr><tr><td>Lead time</td><td>${esc(s.lead)}</td></tr><tr><td>Note</td><td>${esc(s.note)}</td></tr>${s.standIn ? s.standIn.lines.map((l) => `<tr><td>Stand-in: ${esc(l.group)}</td><td><b>$${l.usd.toFixed(2)}</b> · ${l.qty} ${esc(l.unit)}${l.bound ? ' · BOUND' : ''} · ${esc(l.item)}<div class="note">${esc(l.src)}</div></td></tr>`).join('') + `<tr><td>Stand-in total</td><td><b>$${s.standIn.total.toFixed(2)}</b> each (${esc(s.standIn.asOf)}), pending the quotes</td></tr>` : ''}</tbody></table>`)
      + (a.release ? auditList(a) : '');
  }

  // ---------------------------------------------------------------- the solids in 3D
  // Every part with a definition record shows its CadQuery solid in place of its box stand-ins; the selected part is
  // solid, the others ghosted so the joint reads as an assembly. The selected part's mesh loads first; the others follow,
  // one per idle moment, and join the view as they arrive.
  const solidMat = new THREE.MeshStandardMaterial({ color: 0xc9d1da, metalness: 0.55, roughness: 0.38, side: THREE.DoubleSide });
  const ghostMat = new THREE.MeshStandardMaterial({ color: 0x9fb0c2, metalness: 0.3, roughness: 0.5, transparent: true, opacity: 0.32, depthWrite: false, side: THREE.DoubleSide });
  const hiMat = new THREE.MeshStandardMaterial({ color: 0xf2a93b, emissive: 0x6a3a00, metalness: 0.3, roughness: 0.45, side: THREE.DoubleSide });
  const solids = {}, building = new Map(); let shownPN = null, fillQueue = null;
  // laminate regions in their ply colours; the wrap of a laminate is ghosted so the caps and hard points show through
  const lamMat = { cap: new THREE.MeshStandardMaterial({ color: 0xe8c873, roughness: 0.7, side: THREE.DoubleSide }), hp: new THREE.MeshStandardMaterial({ color: 0xc9b8e6, roughness: 0.7, side: THREE.DoubleSide }),
    pocket: new THREE.MeshStandardMaterial({ color: 0x9aa4ae, metalness: 0.4, roughness: 0.5, transparent: true, opacity: 0.55, side: THREE.DoubleSide }),
    block: new THREE.MeshStandardMaterial({ color: 0xb58ad6, roughness: 0.8, side: THREE.DoubleSide }) };
  const baseMat = (m) => ((meta(m.userData.defPN) || {}).laminate ? (m.userData.feat === 'outline' ? ghostMat : lamMat[m.userData.feat] || solidMat) : solidMat);
  const withSolid = () => Object.keys((cache && cache.defs) || places).filter((pn) => { const M = meta(pn); return M && !M.install && (M.mesh || M.solid || (places[pn] && !places[pn].install)); });
  /** where every record's solid goes, from the live engine (once) */
  let placing = null;
  const placeAll = () => (placing ||= eng().call('places', Object.keys((cache && cache.defs) || {})).then((r) => { Object.assign(places, Object.fromEntries(Object.entries(r).filter(([, v]) => v))); return places; }));
  async function meshOf(pn) {
    const M = places[pn]; if (!M) return null;
    if (M.mesh) { const mod = await import(`./defn/solids/${M.mesh.file}.js`); return mod[M.mesh.name].mesh; }
    return eng().call('mesh', pn);   // a record whose solid came in with its module
  }
  function buildSolid(pn) {
    if (solids[pn]) return Promise.resolve(solids[pn]);
    if (building.has(pn)) return building.get(pn);
    const job = placeAll().then(() => meshOf(pn)).then((m) => {
      const D = places[pn]; if (!m || !D) return null;
      const k = FTM / 12, grp = new THREE.Group();
      const geos = m.groups.map((g) => { const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(m.pos, 3)); geo.setIndex(m.idx.slice(g.start, g.start + g.count)); geo.computeVertexNormals(); return { feat: g.feat, geo }; });
      const place = D.place ? D.place.map((q) => new THREE.Matrix4().set(q.sx * k, 0, 0, FTM * q.x, 0, 0, k, FTM * q.y, 0, k, 0, FTM * q.z, 0, 0, 0, 1))   // own frame: x across, y aft, z up
        : D.book ? [new THREE.Matrix4().set(k, 0, 0, 0, 0, 0, k, FTM * CS_FIT.L, 0, k, 0, FTM * GEO.csSpar.s, 0, 0, 0, 1)]   // x BL, y aft, z up from the box bottom
        : [-1, 1].flatMap((sg) => [ATTACH.pinU, ATTACH.pinL].map((pin) => new THREE.Matrix4().set(sg * k, 0, 0, sg * FTM * LUG.yPin, 0, 0, k, FTM * (pin[2] - D.vMid / 12), 0, k, 0, FTM * pin[0], 0, 0, 0, 1)));
      for (const Mx of place) for (const g of geos) { const mesh = new THREE.Mesh(g.geo, solidMat); mesh.matrixAutoUpdate = false; mesh.matrix.copy(Mx); mesh.userData = { feat: g.feat, defPN: pn }; grp.add(mesh); }
      grp.visible = false; grp.renderOrder = 2; ctx.scene.add(grp);
      solids[pn] = grp; building.delete(pn); applyLook(); return grp;
    }).catch((e) => { building.delete(pn); console.warn('[LEZ] solid', pn, e); return null; });
    building.set(pn, job); return job;
  }
  /** visibility and materials for what is shown now */
  function applyLook() {
    const pn = shownPN, Mp = pn && meta(pn);
    const lit = (q) => q === pn || (Mp && Mp.install && (Mp.shows || []).includes(q));   // an installation lights the parts it joins
    for (const [q, g] of Object.entries(solids)) { const Mq = meta(q) || {}; g.visible = !!pn && (q === pn || !Mq.book || !(Mp && Mp.book)); g.children.forEach((m) => { m.material = lit(q) ? baseMat(m) : ghostMat; }); }
    const pg = ctx.partGroup && ctx.partGroup(); if (pg) pg.visible = !(pn && Mp && Mp.book);   // the ply-book box gives way to the laminate's solid
    const sg = ctx.sysGroup(); if (sg) sg.traverse((o) => { const Mo = o.isMesh && cache && cache.defs[o.userData.pn]; if (Mo && Mo.solid) o.visible = !pn; });   // the box stand-ins give way to the true shapes; an installation's hardware stays drawn
  }
  function showSolid(pn, frame = true) {
    shownPN = pn || null; applyLook();
    if (!pn) return;
    ctx.xray(true);
    const M = meta(pn), first = M && M.install ? (M.shows || []) : [pn];
    Promise.all(first.map(buildSolid)).then(() => { if (shownPN === pn) { applyLook(); if (frame) frameSolid(pn); } });
    // the rest of the assembly, one solid per idle moment
    if (!fillQueue) { fillQueue = true; placeAll().then(() => { const todo = withSolid().filter((q) => !solids[q]); const idle = window.requestIdleCallback ? (f) => window.requestIdleCallback(f, { timeout: 800 }) : (f) => setTimeout(f, 30);
      const next = () => { const q = todo.shift(); if (!q) return; buildSolid(q).then(() => idle(next)); }; idle(next); }); }
  }
  function frameSolid(pn) {
    const M0 = meta(pn); if (M0 && M0.install) pn = (M0.shows || [])[0];   // frame the joint at its first detail part
    const g = solids[pn], D = places[pn]; if (!g || !D) return;
    if (D.book) { ctx.frameObj(g, [-0.45, 0.6, -0.9], 1.1); return; }
    if (D.place) {   // one bracket, seen from aft, outboard and a little below, through the x-rayed engine bay
      const n = g.children.length / D.place.length, one = new THREE.Group();
      g.children.slice(0, n).forEach((c) => { const cl = c.clone(); cl.matrixAutoUpdate = false; cl.matrix.copy(c.matrix); one.add(cl); });
      const sx = Math.sign(D.place[0].x) || 1; ctx.frameObj(one, [0.75 * sx, 0.1, 1], 1.6); return; }
    // the left wing's upper and lower parts, seen from above, outboard and aft through the x-rayed skin
    const n = g.children.length / 4, one = new THREE.Group(); g.children.slice(0, 2 * n).forEach((c) => { const cl = c.clone(); cl.matrixAutoUpdate = false; cl.matrix.copy(c.matrix); one.add(cl); });
    ctx.frameObj(one, [-0.55, 0.75, 0.75], 1.5);
  }
  const FEATS = { thick: ['top', 'bottom'], outline: ['outline'] };
  function lightFeature(f) {
    const want = f ? f.split(' ').flatMap((x) => FEATS[x] || [x]) : [], g = solids[shownPN];
    if (g) g.children.forEach((m) => { m.material = want.includes(m.userData.feat) ? hiMat : baseMat(m); });
    for (const host of [$('sdSheet'), $('dfBody')]) if (host) host.querySelectorAll('[data-feat]').forEach((el) => el.classList.toggle('hl', !!f && el.dataset.feat.split(' ').some((x) => f.split(' ').includes(x))));
  }

  // ---------------------------------------------------------------- docked sheet
  async function openSheet(pn) {
    if (!hasRec(pn)) return;
    showSolid(pn);
    const cd = cache && cache.defs[pn];
    $('sdTitle').textContent = `${pn}${cd ? ` rev ${cd.rev} · ${cd.title}` : ''}`; $('sdSheet').innerHTML = `<p class="note" style="padding:12px">Drawing the sheet in the live engine (${esc(engState || 'starting')})…</p>`; $('sheetDock').hidden = false; ctx.onLayout();
    const D = await loadRecord(pn); if ($('sheetDock').hidden) return;
    $('sdTitle').textContent = `${D.def.pn} rev ${D.def.rev} · ${D.def.title}`;
    $('sdSheet').innerHTML = D.sheet;
    $('sdSheet').querySelectorAll('[data-feat]').forEach((el) => { el.addEventListener('mouseenter', () => lightFeature(el.dataset.feat)); el.addEventListener('mouseleave', () => lightFeature(null)); el.addEventListener('click', () => lightFeature(el.dataset.feat)); });
  }
  $('sdBig').addEventListener('click', () => { const d = $('sheetDock'), big = d.classList.toggle('big'); $('sdBig').textContent = big ? 'Smaller' : 'Larger'; ctx.onLayout(); });
  $('sdClose').addEventListener('click', () => { $('sheetDock').hidden = true; $('sdSheet').innerHTML = ''; lightFeature(null); ctx.onLayout(); });
  $('dfFilter').addEventListener('input', (e) => { filt.text = e.target.value; renderMatrix(); });
  $('dfOpen').addEventListener('change', (e) => { filt.open = e.target.checked; renderMatrix(); });
  $('dfLegend').innerHTML = Object.entries(STATE).map(([k, v]) => `<span><i class="st ${k}"></i>${esc(v)}</span>`).join('') + '<span><span class="stale">⚠</span> stale against the cache</span><span><span class="live">●</span> re-audited live</span>';

  /** a click in the 3D view on the solid: light the feature and its dimensions */
  function pick(raycaster) {
    if (!shownPN || !Object.keys(solids).length) return false;
    const h = raycaster.intersectObjects(Object.values(solids), true)[0]; if (!h) return false;
    const pn = h.object.userData.defPN, f = h.object.userData.feat;
    if (pn !== selPN) selectPart(pn);
    lightFeature(f === 'top' || f === 'bottom' ? 'thick' : f);
    return true;
  }

  return {
    render() { renderMatrix(); if (selPN) renderInspector(); },
    /** a new analysis run: a re-sized design leaves the cache (the default design's) behind; the live engine follows */
    invalidate() { rows = null; if (engine && ctx.design && designKey(ctx.design()) !== engDesign) { live.clear(); eng(); } },
    /** start the live engine once the page has settled (records, sheets and the stale check need it) */
    warm() { eng(); },
    select: selectPart, pick, openSheet,
    /** the layup and tooling views show the ply book, not the solids */
    hide() { if (shownPN) { showSolid(null); $('sheetDock').hidden = true; ctx.onLayout(); } },
    get solidShown() { return !!shownPN; },
  };
}
