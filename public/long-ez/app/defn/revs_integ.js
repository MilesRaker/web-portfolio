// Source-audit integration (2026-11-19, integ/sourced): the merge of the structures and systems source audits, the cross-block
// asks they raised (docs/icd/*.md sections 7 / 8 and the "Source audit asks"), Miles's decisions of 2026-11-19 (primer system,
// shoulder-harness anchors and the lowered seats) and the rev-letter renumbering at merge. Applied once to the merged DEFS
// (release.js), after every other rev source. Notional; not for construction.
const DATE = '2026-11-19';
const next = (r) => String.fromCharCode((r || 'A').charCodeAt(0) + 1);
/** pn → [short, change]; filled by the integration (see the INTEG entries below) */
export const INTEG = {};
export const integRev = (pn, short, change) => { INTEG[pn] = INTEG[pn] ? [`${INTEG[pn][0]}; ${short}`, `${INTEG[pn][1]} ${change}`] : [short, change]; };

/** Renumber at merge: the two source audits (phase 'mem' for blocks A–C, 'src' for D–J) were written against the same base as
 *  the panel fix and the final-integration revs, and some took the same letter. Chronologically they are the latest work, so
 *  their entries move after the others (stable), the integration's own rev comes last, and any letter not above the one before
 *  it is renumbered upward: every record keeps a unique, increasing rev list ending at its current rev. */
export function normalizeRevs(DEFS) {
  for (const e of Object.values(DEFS)) {
    const d = e?.def; if (!d || !d.revs) continue;
    const rank = (r) => (r.phase === 'integ' ? 2 : r.phase === 'mem' || r.phase === 'src' ? 1 : 0);
    const rs = d.revs.map((r, i) => [r, i]).sort((a, b) => rank(a[0]) - rank(b[0]) || a[1] - b[1]).map(([r]) => r);
    let prev = null;
    d.revs = rs.map((r) => { const rev = prev && !(r.rev > prev) ? next(prev) : r.rev; prev = rev; return rev === r.rev ? r : { ...r, rev, was: r.rev }; });
    if (prev) d.rev = prev;
  }
}
export function applyInteg(DEFS) {
  for (const [pn, [short, change]] of Object.entries(INTEG)) {
    const d = DEFS[pn]?.def; if (!d) throw new Error(`integration rev: no record ${pn}`);
    if ((d.revs || []).some((r) => r.phase === 'integ')) continue;
    const rev = next([d.rev, ...(d.revs || []).map((r) => r.rev)].filter(Boolean).sort().at(-1));
    d.revs = [...(d.revs || []), { rev, date: DATE, short, change, phase: 'integ' }]; d.rev = rev;
  }
  normalizeRevs(DEFS);
}
