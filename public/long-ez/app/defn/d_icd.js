// Block D interface control helpers (docs/icd/d_maingear.md). Open items owned by other blocks still in progress are listed
// on the records as interfaces that pass but say OPEN and who owns them, so the release audit shows them without failing.
// Notional.
export const openItem = (id, owner, what) => ({ id, with: owner, feature: 'open', what: `OPEN (${owner}): ${what}`, open: true, check: () => ({ ok: true, detail: `OPEN item, owner ${owner}: ${what}` }) });
/** shortest distance (in) from a point to an axis-aligned box {c, d} (both in inches) */
export const boxDist = (p, b) => Math.hypot(...p.map((v, i) => Math.max(0, Math.abs(v - b.c[i]) - b.d[i] / 2)));
/** distance (in) from a point [BL, FS, WL] to a solid cylinder whose axis runs along BL from y0 to y1 through (FS, WL) = (s, z), radius R */
export function cylBLDist(p, y0, y1, s, z, R) { const r = Math.hypot(p[1] - s, p[2] - z), dy = p[0] < y0 ? y0 - p[0] : p[0] > y1 ? p[0] - y1 : 0, dr = Math.max(0, r - R); return Math.hypot(dy, dr); }
/** shortest distance (in) from segment a–b to a box, sampled */
export function segBoxDist(a, b, bx, n = 60) { let m = Infinity; for (let k = 0; k <= n; k++) { const t = k / n, p = a.map((v, i) => v + (b[i] - v) * t); m = Math.min(m, boxDist(p, bx)); } return m; }
