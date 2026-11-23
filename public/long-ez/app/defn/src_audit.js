// Source audit of 2026-11-19 (Miles's decisions; the research findings in docs/blocks/<block>.md "Source audit"): each
// changed part of blocks D–H takes one new rev, appended after the revs its records and ICD phases already carry.
// Notional; not for construction.
export const AUDIT_DATE = '2026-11-19';
const nxt = (r) => String.fromCharCode(String(r || 'A').charCodeAt(0) + 1);
/** append one rev per listed part: map pn → [short, change] */
export function srcAudit(DEFS, map) {
  for (const [pn, [short, change]] of Object.entries(map)) { const d = DEFS[pn]?.def; if (!d) throw new Error(`source audit: no record ${pn}`);
    const r = nxt([d.rev, ...(d.revs || []).map((x) => x.rev)].filter(Boolean).sort().at(-1)); d.revs = [...(d.revs || []), { rev: r, date: AUDIT_DATE, short, change, phase: 'src' }]; d.rev = r; }
}
