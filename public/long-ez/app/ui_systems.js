// ui_systems.js — Systems, BOM, Weight & balance and Requirements tabs.
import * as S from './structures.js';
import * as SYS from './systems.js';
import { ballastPlacard, BALLAST } from './parts/wp5_integration.js';

/** ctx: { R(), BOOKS(), q, esc, msBadge, traceHTML, copy, select3D(pn), showSys(on) } */
export function initSystemsUI(ctx) {
  const $ = (id) => document.getElementById(id), { q, esc, msBadge } = ctx;
  let selPN = null, graph = null;

  function partChecks(pn) { return Object.values(ctx.R().governing).filter((c) => c.sys === pn || c.part === pn).sort((a, b) => a.ms - b.ms); }
  function allRows(pn) { return ctx.R().rows.filter((c) => c.sys === pn || c.part === pn); }

  function renderSystems() {
    const parts = SYS.PARTS, clashes = parts.length ? SYS.clashCheck() : [], rts = SYS.routes();
    const mTot = parts.reduce((a, p) => a + SYS.partMass(p).m, 0);
    $('sysSummary').innerHTML = parts.length
      ? `${parts.length} system parts · ${q(mTot, 'lbm')} · ${rts.length} routed runs · ${clashes.length ? `<span class="bad">${clashes.length} clash${clashes.length > 1 ? 'es' : ''}</span>` : '<span class="ok">no clashes</span>'}`
      : 'No system parts defined yet. The framework is in place; the work packages add the powerplant, fuel, controls, gear systems, electrical, avionics and cabin.';
    // schematics
    const ids = Object.keys(SYS.GRAPHS);
    $('sysGraphSel').innerHTML = ids.map((id) => `<option value="${id}">${esc(SYS.GRAPHS[id].title)}</option>`).join('');
    $('sysGraphBox').hidden = !ids.length;
    if (ids.length) { if (!graph || !SYS.GRAPHS[graph]) graph = ids[0]; $('sysGraphSel').value = graph; drawGraph(graph); }
    // parts by ATA chapter
    const byAta = {};
    for (const p of parts) (byAta[p.ata] ||= []).push(p);
    $('sysParts').innerHTML = Object.keys(byAta).sort((a, b) => a - b).map((a) => `<tr class="grp"><td colspan="4"><b>ATA ${a}</b> ${esc(SYS.ATA[a] || '')}</td></tr>` + byAta[a].map((p) => {
      const ch = partChecks(p.pn), mm = SYS.partMass(p);
      return `<tr class="clickable${p.pn === selPN ? ' hl' : ''}" data-pn="${esc(p.pn)}"><td><span class="pn">${esc(p.pn)}</span><div>${esc(p.name)}${p.qty > 1 ? ` ×${p.qty}` : ''}</div></td><td>${esc(p.kind)}</td><td class="num">${q(mm.m, 'lbm')}</td><td class="num">${ch.length ? msBadge(ch[0].ms) : '—'}</td></tr>`;
    }).join('')).join('');
    $('sysParts').querySelectorAll('tr[data-pn]').forEach((tr) => tr.addEventListener('click', () => selectPart(tr.dataset.pn, true)));
    $('sysClashes').innerHTML = clashes.map((c) => `<li class="bad">${esc(c.detail)}</li>`).join('');
    renderQC();
    renderDetail();
  }
  function renderDetail() {
    const p = selPN && SYS.partByPN(selPN);
    $('sysDetail').hidden = !p;
    if (!p) return;
    const mm = SYS.partMass(p), ch = partChecks(p.pn), rows = allRows(p.pn);
    $('sysDName').innerHTML = `<span class="pn">${esc(p.pn)}</span> ${esc(p.name)}`;
    $('sysDBlurb').textContent = p.blurb || '';
    const prop = [['ATA chapter', `${p.ata} ${SYS.ATA[p.ata] || ''}`], ['Kind', p.kind], ['Quantity per aircraft', p.qty], ['Next-higher assembly', p.nha || '—'], ['Material / spec', p.material || p.spec || '—'],
      ['Mass (all instances)', `${q(mm.m, 'lbm')} · ${mm.from}`], ['CG', `FS ${(mm.c[0] * 12).toFixed(1)} · BL ${(mm.c[1] * 12).toFixed(1)} · WL ${(mm.c[2] * 12).toFixed(1)} in`], ...(p.props || [])];
    $('sysDProps').innerHTML = prop.map(([k, v]) => `<tr><td>${esc(k)}</td><td>${typeof v === 'number' ? q(v, '') : esc(v)}</td></tr>`).join('');
    $('sysDIf').innerHTML = p.interfaces.length ? p.interfaces.map((f) => `<tr><td>${esc(f.name || f.id)}</td><td>${esc(f.host)}</td><td>${f.n || 1} × ${f.kind === 'insert' ? 'insert' : `${f.d} in bolt`}</td><td class="num">FS ${(f.at[0] * 12).toFixed(1)}</td></tr>`).join('') : '<tr><td colspan="4" class="note">No structural interfaces.</td></tr>';
    $('sysDChecks').innerHTML = ch.length ? ch.map((c, i) => `<tr class="chk" data-i="${i}"><td>${esc(c.name)}<div class="note">${esc(c.mode)} · ${esc(c.where)}</div></td><td><span class="case">${esc(c.case)}</span></td><td class="num">${msBadge(c.ms)}</td></tr><tr class="trace" data-i="${i}" hidden><td colspan="3">${ctx.traceHTML(c)}</td></tr>`).join('') : '<tr><td colspan="3" class="note">No strength checks on this part.</td></tr>';
    $('sysDChecks').querySelectorAll('tr.chk').forEach((tr) => tr.addEventListener('click', () => { const t = $('sysDChecks').querySelector(`tr.trace[data-i="${tr.dataset.i}"]`); t.hidden = !t.hidden; }));
    $('sysDSteps').innerHTML = p.steps.map((s, i) => `<li><b>${i + 1}. ${esc(s.title || s)}</b>${s.inspect ? `<ul>${s.inspect.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}</li>`).join('') || '<li class="note">Bought-in item: receiving inspection only.</li>';
    // ports, wires, hardware
    const users = (ref) => { const out = []; for (const o of SYS.PARTS) { o.geo.forEach((g, gi) => (g.ends || []).forEach((e) => { if (e === ref) out.push(`${o.pn} run ${gi + 1}`); })); for (const [a, b] of o.mates || []) { if (a === ref) out.push(b); if (b === ref) out.push(a); } } return out; };
    const ports = Object.entries(p.ports || {});
    $('sysDPortsBox').hidden = !ports.length;
    $('sysDPorts').innerHTML = ports.map(([k, v]) => { const u = users(`${p.pn}:${k}`); return `<tr><td>${esc(k)}</td><td>${esc(v.kind)}</td><td>${esc(v.fit || (v.open ? 'open' : ''))}</td><td>${u.length ? esc(u.join(', ')) : v.open ? '<span class="note">open by design</span>' : '<span class="bad">not connected</span>'}</td></tr>`; }).join('');
    const refs = SYS.EQUIP.filter((e) => e.pn === p.pn).map((e) => `${e.ref}:`);
    const ws = SYS.WIRES.filter((w) => [].concat(w.harness).includes(p.pn) || refs.some((r) => w.from.startsWith(r) || w.to.startsWith(r)));
    $('sysDWiresBox').hidden = !ws.length;
    $('sysDWires').innerHTML = ws.map((w) => `<tr><td><span class="pn">${esc(w.id)}</span><div class="note">${esc(w.awg ? `${w.awg} AWG` : '')} ${esc(w.spec)}</div></td><td>${esc(w.from)}<div class="note">${esc(SYS.pinOf(w.from)?.name || '')}</div></td><td>${esc(w.to)}<div class="note">${esc(SYS.pinOf(w.to)?.name || '')}</div></td><td>${esc(w.sig || '')}</td></tr>`).join('');
    const hw = SYS.hardwareOf(p);
    $('sysDHwBox').hidden = !hw.length;
    $('sysDHw').innerHTML = hw.map((h) => `<tr><td class="num">${h.qty}</td><td><span class="pn">${esc(h.std)}</span></td><td>${esc(h.desc)}</td></tr>`).join('');
    $('sysDNotes').innerHTML = [...(p.notes || []), ...Object.entries(p.src || {}).map(([k, v]) => `${k}: ${v}`)].map((n) => `<li>${esc(n)}</li>`).join('');
    void rows;
  }
  let qcOpen = null;
  function renderQC() {
    const Q = SYS.qc(), cats = ['identification', 'continuity', 'wiring', 'hardware', 'oml'];
    $('qcSummary').innerHTML = `${Q.total} checks across ${Q.systems.length} systems · ${Q.fails.length ? `<span class="bad">${Q.fails.length} finding${Q.fails.length > 1 ? 's' : ''}</span>` : '<span class="ok">0 findings</span>'} · ${SYS.WIRES.length} wires, ${SYS.EQUIP.length} items of equipment. Click a system for its line items.`;
    const cell = (it, c) => { const xs = it.filter((x) => x.cat === c || (c === 'identification' && x.cat === 'process')); if (!xs.length) return '<td class="num note">—</td>'; const bad = xs.filter((x) => !x.ok).length; return `<td class="num"><span class="${bad ? 'bad' : 'ok'}">${xs.length - bad}/${xs.length}</span></td>`; };
    $('qcRows').innerHTML = Q.systems.map((g, i) => { const bad = g.items.filter((x) => !x.ok);
      return `<tr class="clickable" data-i="${i}"><td>${esc(g.sys)}</td>${cats.map((c) => cell(g.items, c)).join('')}<td>${bad.length ? `<span class="bad">${bad.length} open</span>` : '<span class="ok">pass</span>'}</td></tr>`
        + `<tr class="trace" data-i="${i}"${qcOpen === i ? '' : ' hidden'}><td colspan="7"><ul class="note">${g.items.map((x) => `<li class="${x.ok ? '' : 'bad'}">${x.ok ? '✓' : '✗'} <span class="pn">${esc(x.pn)}</span> [${esc(x.cat)}] ${esc(x.msg)}</li>`).join('')}</ul></td></tr>`; }).join('');
    $('qcRows').querySelectorAll('tr.clickable').forEach((tr) => tr.addEventListener('click', () => { const i = Number(tr.dataset.i); qcOpen = qcOpen === i ? null : i; const t = $('qcRows').querySelector(`tr.trace[data-i="${i}"]`); t.hidden = qcOpen !== i; }));
  }
  function selectPart(pn, from3D) {
    selPN = pn; renderSystems(); ctx.select3D(pn);
    if (from3D) $('sysDetail').scrollIntoView({ block: 'nearest' });
  }
  function drawGraph(id) {
    const G = SYS.GRAPHS[id], cw = 168, rh = 64, bw = 140, bh = 38, ox = 16, oy = 40;
    const cols = Math.max(...G.nodes.map((n) => n.col)) + 1, rows = Math.max(...G.nodes.map((n) => n.row)) + 1;
    const W = ox * 2 + cols * cw, H = oy + rows * rh + 16, pos = (n) => [ox + n.col * cw, oy + n.row * rh];
    const by = Object.fromEntries(G.nodes.map((n) => [n.id, n])), col = { fuel: '#e2554f', oil: '#8a5a2b', brake: '#5aa0d8', power: '#f2a93b', signal: '#d6c06b', rf: '#b58ad6', air: '#9fc4ea', pitot: '#3ecf8e', ground: '#9aa9b8', mech: '#c9ced6' };
    let svg = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" class="schem"><text x="${ox}" y="22" class="t">${esc(G.title)}</text>`;
    for (const e of G.edges) {
      const a = by[e.a], b = by[e.b]; if (!a || !b) continue;
      const [ax, ay] = pos(a), [bx, by2] = pos(b), c = col[e.cls] || '#93a3b8';
      const x1 = ax + bw, y1 = ay + bh / 2, x2 = bx, y2 = by2 + bh / 2, mx = (x1 + x2) / 2;
      const d = a.col === b.col ? `M${ax + bw / 2} ${ay + bh}V${by2}` : `M${x1} ${y1}H${mx}V${y2}H${x2}`;
      svg += `<path d="${d}" stroke="${c}" stroke-width="${e.cls === 'power' ? 2.2 : 1.5}" fill="none" marker-end="url(#ar)"/>`;
      if (e.label) svg += `<text x="${a.col === b.col ? ax + bw / 2 + 6 : mx + 4}" y="${a.col === b.col ? (ay + bh + by2) / 2 + 4 : (y1 + y2) / 2 - 4}" class="e">${esc(e.label)}</text>`;
    }
    for (const n of G.nodes) {
      const [x, y] = pos(n);
      svg += `<g class="n${n.pn ? ' link' : ''}" data-pn="${esc(n.pn || '')}"><rect x="${x}" y="${y}" width="${bw}" height="${bh}" rx="6"/><text x="${x + bw / 2}" y="${y + (n.sub ? 15 : 23)}" text-anchor="middle">${esc(n.label)}</text>${n.sub ? `<text x="${x + bw / 2}" y="${y + 30}" text-anchor="middle" class="s">${esc(n.sub)}</text>` : ''}</g>`;
    }
    svg += `<defs><marker id="ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#93a3b8"/></marker></defs></svg>`;
    $('sysGraph').innerHTML = svg;
    $('sysGraph').querySelectorAll('g.link').forEach((g) => g.addEventListener('click', () => selectPart(g.dataset.pn)));
  }
  $('sysDDwg').addEventListener('click', () => { if (selPN) ctx.openDrawing(selPN); });
  $('sysGraphSel').addEventListener('change', (e) => { graph = e.target.value; drawGraph(graph); });
  $('sysShow').addEventListener('change', (e) => ctx.showSys(e.target.checked));
  $('sysXray').addEventListener('change', (e) => ctx.xray(e.target.checked));
  $('sysCanopy').addEventListener('change', (e) => ctx.canopy(e.target.checked));

  function renderBOM() {
    const bom = SYS.buildBOM(ctx.BOOKS());
    $('bomRows').innerHTML = bom.rows.map((r) => `<tr class="${r.level <= 1 ? 'grp' : ''}"><td style="padding-left:${6 + 14 * r.level}px"><span class="pn">${esc(r.pn)}</span>${r.alias ? ` <span class="note">(${esc(r.alias)})</span>` : ''}</td><td>${esc(r.name)}</td><td class="num">${r.qty}</td><td>${esc(r.kind)}</td><td class="num">${q(r.mEach * (r.level >= 2 ? r.qty : 1), 'lbm')}</td></tr>`).join('');
    $('bomNote').textContent = `${bom.rows.filter((r) => r.level >= 2).length} parts. Laminate weights include a ${(SYS.FINISH * 100).toFixed(0)} % finish allowance (paint, filler, micro, hardware; ASSUMED).`;
  }
  $('bomCsv')?.addEventListener('click', (e) => {
    const bom = SYS.buildBOM(ctx.BOOKS());
    ctx.copy(['level,part_number,alias,name,qty,kind,mass_each_lb', ...bom.rows.map((r) => [r.level, r.pn, r.alias || '', `"${r.name}"`, r.qty, r.kind, r.mEach.toFixed(2)].join(','))].join('\n'), e.target);
  });

  function renderWB() {
    const R = ctx.R(), roll = SYS.massRollup(ctx.BOOKS());
    $('wbItems').innerHTML = roll.rows.map((r) => `<tr><td>${esc(r.name)}${r.payload ? ' <span class="note">payload</span>' : ''}</td><td class="num">${q(r.est.w, 'lbm')}<div class="note">FS ${(r.est.s * 12).toFixed(1)}</div></td><td class="num">${r.defined ? `${q(r.defined.w, 'lbm')}<div class="note">FS ${(r.defined.s * 12).toFixed(1)} · ${r.defined.parts.length} parts</div>` : '—'}</td><td>${r.adopted ? '<span class="ok">defined, in use</span>' : r.defined ? 'defined, not yet adopted' : r.payload ? 'loading case' : 'estimate'}</td></tr>`).join('');
    const P = ballastPlacard(), offP = S.WB.datumIn;
    $('wbEmpty').innerHTML = `<tr><td>Empty weight (incl. ${BALLAST.fixed} lb fixed ballast)</td><td class="num">${q(P.E.W, 'lbm')}</td><td>published fleet ${P.fleet.W[0]}–${P.fleet.W[1]} lb</td></tr><tr><td>Empty CG</td><td class="num">FS ${(P.E.s * 12 - offP).toFixed(1)} pub.</td><td>published fleet FS ${P.fleet.cgPub[0]}–${P.fleet.cgPub[1]}</td></tr><tr><td>Useful load</td><td class="num">${q(P.useful, 'lbm')}</td><td>two aboard (200 + 170 + 25 lb bags): ${P.twoUpFuelGal.toFixed(0)} gal of fuel to gross</td></tr>`;
    $('wbPlacard').innerHTML = P.rows.map((r) => `<tr><td>${r.plates} plate${r.plates === 1 ? '' : 's'} (${r.plates * BALLAST.plate} lb)</td><td class="num">${r.min ?? '—'}–${r.max ?? '—'} lb</td></tr>`).join('');
    const lim = S.cgLim().map((x) => x * 12), off = S.WB.datumIn;
    $('wbLim').textContent = `CG limits FS ${lim[0].toFixed(0)}–${lim[1].toFixed(0)} in the model frame (published FS ${S.WB.cgLimPub[0]}–${S.WB.cgLimPub[1]}; model FS = published + ${off} in). ${S.WB.src}.`;
    $('wbCases').innerHTML = S.WEIGHT_CASES.map((wc) => {
      const w = S.weightCase(R.d, wc), ac = S.aircraft(R.d, wc), fuel = w.items.find((i) => i.id === 'fuel');
      return `<tr><td>${esc(wc.id)} ${esc(wc.label)}</td><td class="num">${q(ac.W, 'lbm')}</td><td class="num">FS ${(ac.cg * 12).toFixed(1)}<div class="note">pub. ${(ac.cg * 12 - off).toFixed(1)}</div></td><td class="num">${q(fuel.w, 'lbm')}</td><td class="num">${w.trim > 0.5 ? q(w.trim, 'lbm') : '—'}</td><td class="num">${(ac.shareC * 100).toFixed(1)} %</td></tr>`;
    }).join('');
  }
  function renderReqs() {
    const rs = SYS.reqStatus(ctx.R()), badge = { pass: 'g', partial: 'w', open: '', fail: 'b' };
    const cnt = (s) => rs.filter((r) => r.status === s).length;
    $('reqSummary').textContent = `${cnt('pass')} pass · ${cnt('partial')} partial · ${cnt('open')} open · ${cnt('fail')} fail`;
    $('reqRows').innerHTML = rs.map((r) => `<tr><td><b>${esc(r.id)}</b><div class="note">${esc(r.ref)}</div></td><td>${esc(r.title)}<div class="note">${esc(r.method)}${r.hits.length ? ` · ${r.hits.length} check(s), min ${r.min >= 0 ? '+' : ''}${r.min.toFixed(2)}` : ''}${r.evidence ? ` · ${esc(r.evidence.detail)}` : ''}</div></td><td><span class="ms ${badge[r.status]}">${r.status}</span>${r.status !== 'pass' && r.wp ? `<div class="note">closes in ${esc(r.wp)}</div>` : ''}</td></tr>`).join('');
  }
  return {
    render(tab) { if (tab === 'systems') renderSystems(); if (tab === 'bom') renderBOM(); if (tab === 'wb') renderWB(); if (tab === 'reqs') renderReqs(); },
    select: selectPart,
  };
}
