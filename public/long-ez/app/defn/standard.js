// The part definition standard: twelve fields in four groups, and an honest reading of where each part stands on each
// field today. 'done' = meets the standard; 'part' = defined but notional (display geometry, named-but-unspecified
// material, ASSUMED inputs); 'miss' = nothing yet; 'na' = the field does not apply to this kind of part.
import { defOf, releaseAudit } from './release.js';
import { structPN, clashCheck } from '../systems.js';
import { quoteText } from './standin.js';

export { GROUPS, FIELDS, STATE, score } from './fields.js';   // the standard's fields (a light module the explorer reads at startup)

const BOUGHT = ['cots'], SOFT = ['cable', 'line', 'harness'];
const f = (st, why) => ({ st, why });

function inputsOf(rows) {
  const a = [];
  for (const r of rows) for (const inp of (r.trace && r.trace.inputs) || []) a.push(String(inp[3] || ''));
  return a;
}
function substOf(rows, kind) {
  if (!rows.length) return BOUGHT.includes(kind) ? f('na', 'Bought-in: the vendor rating stands in for analysis') : f('miss', 'No strength or integration check yet');
  const src = inputsOf(rows), nA = src.filter((s) => /^ASSUMED/i.test(s)).length, min = Math.min(...rows.map((r) => r.ms));
  if (min < 0) return f('miss', `A check is below zero (MS ${min.toFixed(2)})`);
  return nA ? f('part', `${new Set(rows.map((r) => r.id)).size} check(s), lowest MS +${min.toFixed(2)}; ${nA} ASSUMED input(s)`) : f('done', `${new Set(rows.map((r) => r.id)).size} check(s), lowest MS +${min.toFixed(2)}, every input sourced`);
}

/** a system part (SYS.PARTS entry); ctx = { rows: every analysis check row, clashes: SYS.clashCheck() } */
export function assessPart(p, ctx) {
  const D = defOf(p.pn), mine = ctx.rows.filter((r) => r.sys === p.pn);
  if (D) {
    const a = releaseAudit(p.pn, ctx.rows, ctx.clashes || []), bad = (cat) => a.items.filter((x) => x.cat === cat && !x.ok);
    const ok = (cat, done, why) => (bad(cat).length ? f('miss', bad(cat).map((x) => x.msg).join('; ')) : f('done', why || done));
    return { pn: p.pn, release: a, fields: {
      identity: f('done', `Rev ${D.def.rev}, NHA ${D.def.nha}, ${D.def.effectivity}`),
      solid: D.install ? f('na', `Installation: the detail parts carry the solids (${D.shows.join(', ')})`) : ok('solid', `CadQuery solid, ${D.solid.measured.faces} faces, ${D.solid.measured.holes.length} holes`),
      drawing: D.install ? f('done', 'Installation sheet: joint stack-ups, hardware table, torques') : ok('drawing', 'Dimensioned sheet drawn from the record; every dimension measured back from the solid'),
      cut: D.laminate ? f('done', `Ply table in the record; hot-wire templates ${D.def.templates}`) : f('na', (D.def.na || {}).cut || 'No flat pattern'),
      layup: D.laminate ? f('done', D.def.features.filter((x) => x.kind === 'layup').map((x) => x.label).join(' ')) : f('na', (D.def.na || {}).layup || 'Not a composite part'),
      material: f('done', `${D.def.material.spec}; ${D.def.process.length} process steps`),
      subst: ok('substantiation', `${D.def.checks.length} checks, no ASSUMED input (${a.bound.length} bounded)`),
      mass: ok('mass', `${D.def.mass.each.toFixed(3)} lb each from the ${D.install ? 'hardware lines' : 'solid'}`),
      hardware: D.install ? ok('hardware', D.def.hardwareNote) : f('done', D.def.hardwareNote), interfaces: ok('interfaces', `${D.def.interfaces.length} interfaces checked, no clash`),
      tooling: f('done', D.def.tooling.text), sourcing: f('done', `${D.def.sourcing.vendor}, $${D.def.sourcing.cost} (${D.def.sourcing.costAsOf})`),
    } };
  }
  const k = p.kind, bought = BOUGHT.includes(k), lam = k === 'laminate', soft = SOFT.includes(k);
  const hw = p.hardware || [], ifc = (p.interfaces || []).length + (p.mates || []).length + Object.keys(p.ports || {}).length;
  const mass = String(p.src && p.src.mass || (p.massEach == null ? 'GEOMETRY' : 'ASSUMED'));
  return { pn: p.pn, release: null, fields: {
    identity: f('part', `${p.nha ? `NHA ${p.nha}` : 'Top-level assembly'}; no revision yet`),
    solid: bought ? f('part', 'Bought-in: installation envelope only (display primitives)') : f('part', 'Display primitives (boxes, cylinders, lofts), not the true shape'),
    drawing: bought ? f('na', 'Bought-in: the vendor drawing governs') : f('part', 'Auto outline views, no dimensions'),
    cut: lam ? f('miss', 'No ply cut patterns or core templates') : soft || k === 'install' || bought || k === 'mechanism' ? f('na', 'Not a cut part') : f('miss', 'No flat pattern'),
    layup: lam ? f('part', 'Plies named in the part notes; no ply table') : f('na', 'Not a composite part'),
    material: (p.material || p.spec || p.std) ? f('part', `${p.material || p.spec || p.std}; no process specifications`) : f('miss', 'No material named'),
    subst: substOf(mine, k),
    mass: /^COMPUTED|^GEOMETRY/.test(mass) ? f('part', `Computed from display geometry (${mass})`) : f('part', `ASSUMED (${mass})`),
    hardware: hw.length ? f('part', `${hw.length} line(s) named; grip lengths and torques not all set`) : bought ? f('na', 'Bought complete') : f('part', 'None listed: confirm none is needed'),
    interfaces: ifc ? f('part', `${ifc} mate(s), port(s) or interface(s) named; not all checked feature to feature`) : f('miss', 'No interface defined'),
    tooling: bought || soft ? f('na', 'No tooling') : f('miss', 'No tooling defined'),
    sourcing: bought || p.std ? f('part', `Standard named (${p.std || p.name.slice(0, 40)}); no vendor or cost`) : f('miss', 'No source'),
  } };
}

/** a structural laminate part from the ply books (wing, canard, …); rowsAll / clashes for a laminate with a record */
export function assessBook(id, b, rows, rowsAll = rows, clashes = []) {
  const pn = structPN(id), D = defOf(pn);
  if (D) {
    const a = releaseAudit(pn, rowsAll, clashes), d = D.def, bad = (cat) => a.items.filter((x) => x.cat === cat && !x.ok);
    const ok = (cat, done) => (bad(cat).length ? f(cat === 'substantiation' && d.status === 'held' ? 'part' : 'miss', bad(cat).map((x) => x.msg).join('; ')) : f('done', done));
    const lay = d.features.filter((x) => x.kind === 'layup').map((x) => x.label).join(' ');
    return { pn: id, defPN: pn, release: a, book: true, fields: {
      identity: f('done', `${pn} rev ${d.rev}, NHA ${d.nha}, ${d.effectivity}`),
      solid: ok('solid', d.solidText || `CadQuery solid by region (caps, hard points, webs and wrap, core), ${D.solid.measured.holes.length} holes`),
      drawing: ok('drawing', 'Dimensioned sheet with ply table drawn from the record; every dimension and region volume measured back from the solid'),
      cut: d.templates ? f('done', `Every ply and pack in the nested cut list; core templates ${d.templates} drawn on the sheet with the trough depths`) : f('part', 'Every ply and hard-point pack is in the nested cut list; core templates for the pockets and drop-off steps are not drawn yet'),
      layup: f('done', lay),
      material: f('done', `${d.material.spec}; ${d.process.length} process steps`),
      subst: ok('substantiation', `${d.checks.length} checks, no ASSUMED input (${a.bound.length} bounded)`),
      mass: ok('mass', `${d.mass.each.toFixed(2)} lb from the solid's regions; matches the ply book`),
      hardware: f('done', d.hardwareNote),
      interfaces: ok('interfaces', `${d.interfaces.length} interfaces checked, no clash`),
      tooling: f('done', d.tooling.text),
      // stand-in estimate until the MTM45-1 / HT quotes are in (standin.js): stays 'part' while the quote is outstanding
      sourcing: d.sourcing.quote && d.sourcing.quote.state !== 'received' ? f('part', quoteText(d.sourcing.standIn)) : f(d.sourcing.quote ? 'done' : 'part', `${d.sourcing.vendor}: $${d.sourcing.cost.toFixed(2)} (${d.sourcing.costAsOf})`),
    } };
  }
  return { pn: id, release: null, book: true, fields: {
    identity: f('part', `${b.name}; no revision yet`),
    solid: f('part', 'Outer mould line lofts from public dimensions; plies drawn as offset shells'),
    drawing: f('part', 'Section and planform views, not a dimensioned sheet'),
    cut: f('part', 'Ply cut list nested on the roll; no core templates'),
    layup: f('part', 'Ply book sized to the load cases; drop-offs and overlaps not detailed'),
    material: f('part', 'Rutan-classic glass named; cure and process specifications to come'),
    subst: substOf(rows, 'laminate'),
    mass: f('part', 'Computed from the ply book (plus a finish allowance)'),
    hardware: f('na', 'Laminate: hardware sits with the fittings'),
    interfaces: f('part', 'Joints checked as loads; not feature to feature'),
    tooling: f('part', 'Tooling notes in the ply book; no tool drawings'),
    sourcing: f('miss', 'No cloth, foam or resin quantities with vendors'),
  } };
}

