// Applies the frozen revision history (rev_frozen.js) to the merged records: a revision whose key (part, rev, date) is frozen
// shows its frozen title and change text, so a later design change cannot rewrite an old revision's description. New revisions
// show their live text until tools/freeze_revs.mjs freezes them (run before each publish).
// Guard (2026-11-21 review): rev letters are assigned in order at merge, so a frozen entry is applied only when its title (and
// its phase, when recorded) still match the live revision; otherwise the live text stays and the key is listed under `mismatch`
// rather than attaching text to the wrong revision. REV_FREEZE (release.js) reports frozen / open / mismatch / orphan counts,
// shown in the Report tab.
import { FROZEN } from './rev_frozen.js';
export function freezeRevs(DEFS) {
  let frozen = 0, open = 0; const mismatch = [], used = new Set();
  for (const [pn, v] of Object.entries(DEFS)) { const d = v?.def; if (!d?.revs) continue;
    d.revs = d.revs.map((r) => { const k = `${pn}|${r.rev}|${r.date}`, f = FROZEN[k];
      if (!f) { open++; return r; }
      used.add(k);
      if (f.short !== r.short || (f.phase && r.phase && f.phase !== r.phase)) { mismatch.push(k); return r; }
      frozen++; return { ...r, change: f.change, frozen: true }; }); }
  return { frozen, open, mismatch, orphan: Object.keys(FROZEN).filter((k) => !used.has(k)) };
}
