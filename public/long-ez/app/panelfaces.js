// panelfaces.js — instrument and switch faces for the panel, drawn on canvases (generic depictions of each unit's
// display and legends; no maker logos). Each face is a plane facing aft (toward the pilot).
const FONT = 'Inter, Arial, sans-serif';
function bezel(g, w, h, r = 0.04) {
  g.fillStyle = '#121416'; g.fillRect(0, 0, w, h);
  g.strokeStyle = '#2b3036'; g.lineWidth = Math.max(2, w * 0.006); g.strokeRect(1, 1, w - 2, h - 2);
}
function knob(g, x, y, r) { g.fillStyle = '#1e2226'; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.strokeStyle = '#3a4048'; g.lineWidth = r * 0.15; g.stroke(); }
function attitude(g, x, y, w, h, pitch = 3, roll = -6) {
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
  g.translate(x + w / 2, y + h / 2); g.rotate(roll * Math.PI / 180);
  const pp = h / 40; // px per degree
  g.fillStyle = '#3d7fd0'; g.fillRect(-w * 1.5, -h * 1.5 + pitch * pp, w * 3, h * 1.5);
  g.fillStyle = '#7a5a33'; g.fillRect(-w * 1.5, pitch * pp, w * 3, h * 1.5);
  g.strokeStyle = '#fff'; g.lineWidth = Math.max(1.5, h * 0.006); g.beginPath(); g.moveTo(-w * 1.5, pitch * pp); g.lineTo(w * 1.5, pitch * pp); g.stroke();
  g.font = `${Math.round(h * 0.035)}px ${FONT}`; g.fillStyle = '#fff'; g.textAlign = 'left';
  for (let k = -20; k <= 20; k += 5) { if (!k) continue; const yy = (pitch - k) * pp, L = k % 10 ? w * 0.06 : w * 0.12; g.beginPath(); g.moveTo(-L, yy); g.lineTo(L, yy); g.stroke(); if (!(k % 10)) g.fillText(String(Math.abs(k)), L + 6, yy + h * 0.012); }
  g.restore();
  g.strokeStyle = '#f5d000'; g.lineWidth = Math.max(3, h * 0.012); const cx = x + w / 2, cy = y + h / 2;
  g.beginPath(); g.moveTo(cx - w * 0.2, cy); g.lineTo(cx - w * 0.06, cy); g.lineTo(cx, cy + h * 0.04); g.lineTo(cx + w * 0.06, cy); g.lineTo(cx + w * 0.2, cy); g.stroke();
}
function tape(g, x, y, w, h, val, step, label, digits = 0) {
  g.fillStyle = 'rgba(20,24,30,0.72)'; g.fillRect(x, y, w, h);
  g.fillStyle = '#fff'; g.font = `${Math.round(h * 0.045)}px ${FONT}`; g.textAlign = 'center';
  const pp = h / (step * 8);
  for (let k = -5; k <= 5; k++) { const v = Math.round(val / step) * step + k * step, yy = y + h / 2 - (v - val) * pp; if (yy < y + 8 || yy > y + h - 4) continue; g.fillText(String(v), x + w / 2, yy + h * 0.015); }
  g.fillStyle = '#000'; g.fillRect(x - 2, y + h / 2 - h * 0.05, w + 4, h * 0.1); g.strokeStyle = '#fff'; g.lineWidth = 2; g.strokeRect(x - 2, y + h / 2 - h * 0.05, w + 4, h * 0.1);
  g.fillStyle = '#fff'; g.font = `600 ${Math.round(h * 0.06)}px ${FONT}`; g.fillText(val.toFixed(digits), x + w / 2, y + h / 2 + h * 0.022);
  g.fillStyle = '#9fe0ff'; g.font = `${Math.round(h * 0.04)}px ${FONT}`; g.fillText(label, x + w / 2, y + h * 0.05);
}
function hsi(g, cx, cy, r, hdg = 95) {
  g.fillStyle = 'rgba(10,12,16,0.85)'; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill();
  g.strokeStyle = '#fff'; g.fillStyle = '#fff'; g.font = `${Math.round(r * 0.16)}px ${FONT}`; g.textAlign = 'center';
  for (let a = 0; a < 360; a += 10) { const t = (a - hdg - 90) * Math.PI / 180, L = a % 30 ? 0.08 : 0.14; g.lineWidth = 2; g.beginPath(); g.moveTo(cx + Math.cos(t) * r, cy + Math.sin(t) * r); g.lineTo(cx + Math.cos(t) * r * (1 - L), cy + Math.sin(t) * r * (1 - L)); g.stroke();
    if (!(a % 30)) g.fillText(a === 0 ? 'N' : a === 90 ? 'E' : a === 180 ? 'S' : a === 270 ? 'W' : String(a / 10), cx + Math.cos(t) * r * 0.72, cy + Math.sin(t) * r * 0.72 + r * 0.05); }
  g.strokeStyle = '#d24cd2'; g.lineWidth = r * 0.05; g.beginPath(); g.moveTo(cx, cy - r * 0.6); g.lineTo(cx, cy + r * 0.6); g.stroke();
  g.fillStyle = '#fff'; g.beginPath(); g.moveTo(cx, cy - r * 0.18); g.lineTo(cx - r * 0.1, cy + r * 0.12); g.lineTo(cx + r * 0.1, cy + r * 0.12); g.fill();
}
const FACES = {
  // 11.6 in landscape: PFD on the left 60 %, moving map + engine strip on the right
  axis(g, W, H) {
    bezel(g, W, H);
    const m = W * 0.035, sx = m, sy = H * 0.06, sw = W - 2 * m, sh = H * 0.86, pw = sw * 0.6;
    attitude(g, sx, sy, pw, sh * 0.72, 2.5, -5);
    tape(g, sx + pw * 0.03, sy + sh * 0.06, pw * 0.14, sh * 0.6, 152, 10, 'KIAS');
    tape(g, sx + pw * 0.80, sy + sh * 0.06, pw * 0.17, sh * 0.6, 7500, 100, 'FT');
    g.fillStyle = '#0c0f13'; g.fillRect(sx, sy + sh * 0.72, pw, sh * 0.28); hsi(g, sx + pw / 2, sy + sh * 0.88, sh * 0.15);
    // map
    const mx = sx + pw + 6, mw = sw - pw - 6;
    g.fillStyle = '#26324a'; g.fillRect(mx, sy, mw, sh * 0.70);
    g.strokeStyle = '#5f7c47'; g.lineWidth = 3; for (let k = 0; k < 7; k++) { g.beginPath(); g.moveTo(mx, sy + k * sh * 0.11 + 10); g.bezierCurveTo(mx + mw * 0.3, sy + k * sh * 0.11 - 18, mx + mw * 0.6, sy + k * sh * 0.11 + 30, mx + mw, sy + k * sh * 0.11); g.stroke(); }
    g.strokeStyle = '#d24cd2'; g.lineWidth = 5; g.beginPath(); g.moveTo(mx + mw * 0.5, sy + sh * 0.62); g.lineTo(mx + mw * 0.62, sy + sh * 0.30); g.lineTo(mx + mw * 0.8, sy + sh * 0.08); g.stroke();
    g.fillStyle = '#fff'; g.beginPath(); const ax = mx + mw * 0.5, ay = sy + sh * 0.62; g.moveTo(ax, ay - 14); g.lineTo(ax - 9, ay + 9); g.lineTo(ax + 9, ay + 9); g.fill();
    // engine strip
    g.fillStyle = '#0c0f13'; g.fillRect(mx, sy + sh * 0.72, mw, sh * 0.28);
    const bars = [['RPM', 0.78, '#3ecf8e'], ['MAP', 0.70, '#3ecf8e'], ['OIL P', 0.62, '#3ecf8e'], ['OIL T', 0.55, '#3ecf8e'], ['CHT', 0.66, '#f2c94c'], ['FUEL', 0.48, '#3ecf8e']];
    g.font = `${Math.round(H * 0.03)}px ${FONT}`; g.textAlign = 'left';
    bars.forEach(([l, f, c], k) => { const yy = sy + sh * 0.745 + k * sh * 0.042; g.fillStyle = '#9aa6b2'; g.fillText(l, mx + 8, yy + sh * 0.03); g.fillStyle = '#2a3038'; g.fillRect(mx + mw * 0.32, yy + 6, mw * 0.6, sh * 0.022); g.fillStyle = c; g.fillRect(mx + mw * 0.32, yy + 6, mw * 0.6 * f, sh * 0.022); });
    // softkey row and knobs
    for (let k = 0; k < 8; k++) { g.fillStyle = '#20252b'; g.fillRect(m + k * sw / 8 + 6, H - H * 0.055, sw / 8 - 12, H * 0.035); }
    knob(g, W - m * 0.5, H * 0.12, m * 0.35); knob(g, m * 0.5, H * 0.12, m * 0.35);
  },
  g5(g, W, H) { bezel(g, W, H); attitude(g, W * 0.08, H * 0.08, W * 0.84, H * 0.78, 2.5, -5); tape(g, W * 0.1, H * 0.16, W * 0.17, H * 0.6, 152, 10, 'KT'); tape(g, W * 0.72, H * 0.16, W * 0.2, H * 0.6, 7500, 100, 'FT'); knob(g, W * 0.86, H * 0.92, W * 0.06); },
  switches(g, W, H, o) {
    g.fillStyle = '#1a1d21'; g.fillRect(0, 0, W, H);
    const n = o.labels.length;
    o.labels.forEach((l, k) => {
      const x = (k + 0.5) * W / n;
      g.fillStyle = '#c9ced6'; g.font = `600 ${Math.round(Math.min(H * 0.16, W / n * 0.15))}px ${FONT}`; g.textAlign = 'center'; g.fillText(l, x, H * 0.2);
      g.fillStyle = '#5b636c'; g.beginPath(); g.arc(x, H * 0.62, W / n * 0.18, 0, 7); g.fill();
      g.strokeStyle = '#e6e9ee'; g.lineWidth = W / n * 0.08; g.lineCap = 'round'; g.beginPath(); g.moveTo(x, H * 0.62); g.lineTo(x, H * 0.36); g.stroke();
      if (o.guard && o.guard.includes(k)) { g.strokeStyle = '#d43b2c'; g.lineWidth = 3; g.strokeRect(x - W / n * 0.32, H * 0.3, W / n * 0.64, H * 0.6); }
    });
  },
  breakers(g, W, H, o) {
    g.fillStyle = '#1a1d21'; g.fillRect(0, 0, W, H);
    o.rows.forEach((row, r) => { const y0 = r * H / o.rows.length, rh = H / o.rows.length;
      g.fillStyle = '#7f8a96'; g.font = `600 ${Math.round(rh * 0.15)}px ${FONT}`; g.textAlign = 'left'; g.fillText(row.title, 6, y0 + rh * 0.16);
      row.items.forEach((it, k) => { const x = (k + 0.5) * W / row.items.length;
        g.fillStyle = '#c9ced6'; g.font = `${Math.round(rh * 0.13)}px ${FONT}`; g.textAlign = 'center'; g.fillText(it[0], x, y0 + rh * 0.36);
        g.fillStyle = '#0b0c0e'; g.beginPath(); g.arc(x, y0 + rh * 0.66, rh * 0.16, 0, 7); g.fill(); g.fillStyle = '#e6e9ee'; g.font = `${Math.round(rh * 0.12)}px ${FONT}`; g.fillText(String(it[1]), x, y0 + rh * 0.70); }); });
  },
  annun(g, W, H, o) { g.fillStyle = '#121416'; g.fillRect(0, 0, W, H); o.items.forEach(([l, c], k) => { const x = k * W / o.items.length; g.fillStyle = c; g.globalAlpha = 0.35; g.fillRect(x + 4, 4, W / o.items.length - 8, H - 8); g.globalAlpha = 1; g.fillStyle = '#f2f2f2'; g.font = `700 ${Math.round(Math.min(H * 0.34, W / o.items.length * 0.15))}px ${FONT}`; g.textAlign = 'center'; g.fillText(l, x + W / o.items.length / 2, H * 0.64); }); },
  key(g, W, H) { g.fillStyle = '#1a1d21'; g.fillRect(0, 0, W, H); const cx = W / 2, cy = H * 0.58, r = Math.min(W, H) * 0.28; g.fillStyle = '#9aa3ad'; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill(); g.fillStyle = '#2a2f35'; g.fillRect(cx - r * 0.12, cy - r * 0.8, r * 0.24, r * 1.6);
    g.fillStyle = '#e6e9ee'; g.font = `600 ${Math.round(H * 0.09)}px ${FONT}`; g.textAlign = 'center'; [['OFF', -160], ['R', -120], ['L', -90], ['BOTH', -55], ['START', -20]].forEach(([l, a]) => { const t = a * Math.PI / 180; g.fillText(l, cx + Math.cos(t) * r * 1.45, cy + Math.sin(t) * r * 1.45 + 4); }); },
  elt(g, W, H) { g.fillStyle = '#c9a227'; g.fillRect(0, 0, W, H); g.fillStyle = '#111'; g.font = `700 ${Math.round(H * 0.2)}px ${FONT}`; g.textAlign = 'center'; g.fillText('ELT', W / 2, H * 0.24); g.font = `600 ${Math.round(H * 0.14)}px ${FONT}`; g.fillText('ON', W * 0.2, H * 0.55); g.fillText('ARM', W * 0.5, H * 0.55); g.fillText('TEST', W * 0.8, H * 0.55);
    g.fillStyle = '#333'; g.beginPath(); g.arc(W * 0.5, H * 0.8, H * 0.12, 0, 7); g.fill(); g.fillStyle = '#d43b2c'; g.beginPath(); g.arc(W * 0.85, H * 0.82, H * 0.07, 0, 7); g.fill(); },
  // mechanical gear-position flag in a panel window: DOWN (green) only on the down lock, barber pole in transit, UP (white on black)
  gearflag(g, W, H, f) {
    const st = f.state || 'down'; g.fillStyle = '#111'; g.fillRect(0, 0, W, H);
    if (st === 'transit') { g.save(); g.beginPath(); g.rect(W * 0.1, H * 0.2, W * 0.8, H * 0.6); g.clip(); for (let x = -H; x < W + H; x += H * 0.35) { g.fillStyle = Math.round(x / (H * 0.35)) % 2 ? '#e8e8e8' : '#c0392b'; g.beginPath(); g.moveTo(x, H); g.lineTo(x + H * 0.35, H); g.lineTo(x + H * 0.35 + H, 0); g.lineTo(x + H, 0); g.fill(); } g.restore(); return; }
    g.fillStyle = st === 'down' ? '#2fbf5a' : '#222'; g.fillRect(W * 0.1, H * 0.2, W * 0.8, H * 0.6);
    g.fillStyle = '#fff'; g.font = `700 ${Math.round(H * 0.42)}px ${FONT}`; g.textAlign = 'center'; g.fillText(st === 'down' ? 'DOWN' : 'UP', W / 2, H * 0.66);
  },
};
/** returns a canvas (or null in Node) for a face spec { draw, w, h (ft), ... } */
export function faceCanvas(f) {
  if (typeof document === 'undefined' || !FACES[f.draw]) return null;
  const px = Math.min(1600, Math.round(f.w * 12 * 110)), c = document.createElement('canvas');
  c.width = px; c.height = Math.max(32, Math.round(px * f.h / f.w));
  FACES[f.draw](c.getContext('2d'), c.width, c.height, f);
  return c;
}
