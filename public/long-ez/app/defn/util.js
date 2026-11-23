// shared helpers for definition records
export const r4 = (x) => Math.round(x * 1e4) / 1e4;
/** FNV-1a of the parameter JSON: a solid built from other numbers shows up as stale */
export function paramHash(p) {
  const s = JSON.stringify(p); let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16).padStart(8, '0');
}
/** expected-vs-measured row */
export const want = (what, w, got, tol = 1e-4) => ({ what, want: w, got, tol, ok: Math.abs(w - got) <= tol });
