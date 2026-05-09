import React, { useState, useEffect, useRef } from 'react';
import { Box, Button, Typography, Chip, Stack, useMediaQuery } from '@mui/material';
import { AttitudeIndicator, Altimeter, HeadingIndicator } from 'react-typescript-flight-indicators';
import GaugeComponent from 'react-gauge-component';

// Full-circuit profile: runway → takeoff → climb → flight test → descent → landing → stop
const SCRIPT = [
  // ── Takeoff roll ──────────────────────────────────────────────────────────
  { t:  0, pitch:  0, roll:  0, ias:   0, alt:     0, g: 1.0, beta:  0, heading:  0, throttle: 0.05, phase: 'On Runway' },
  { t:  2, pitch:  0, roll:  0, ias:  30, alt:     0, g: 1.0, beta:  0, heading:  0, throttle: 0.95, phase: 'Takeoff Roll' },
  { t:  8, pitch:  0, roll:  0, ias: 112, alt:     0, g: 1.0, beta:  0, heading:  0, throttle: 0.95, phase: 'Takeoff Roll' },
  { t: 10, pitch:  5, roll:  0, ias: 132, alt:     0, g: 1.1, beta:  0, heading:  0, throttle: 0.90, phase: 'Rotate' },
  { t: 12, pitch: 12, roll:  0, ias: 145, alt:   400, g: 1.2, beta:  0, heading:  0, throttle: 0.90, phase: 'Climb' },
  // ── Climb ─────────────────────────────────────────────────────────────────
  { t: 20, pitch: 10, roll:  0, ias: 200, alt:  5000, g: 1.1, beta:  0, heading:  0, throttle: 0.85, phase: 'Climb' },
  { t: 30, pitch:  6, roll:  0, ias: 250, alt: 11000, g: 1.0, beta:  0, heading:  0, throttle: 0.80, phase: 'Climb' },
  { t: 38, pitch:  0, roll:  0, ias: 280, alt: 15000, g: 1.0, beta:  0, heading:  0, throttle: 0.60, phase: 'Cruise' },
  // ── Flight test (shifted +38 s from original script) ─────────────────────
  { t: 43, pitch:  8, roll:  0, ias: 278, alt: 15100, g: 1.8, beta:  0, heading:  0, throttle: 0.60, phase: 'Pitch Doublet ↑' },
  { t: 45, pitch: -5, roll:  0, ias: 282, alt: 14950, g: 0.4, beta:  0, heading:  0, throttle: 0.60, phase: 'Pitch Doublet ↓' },
  { t: 48, pitch:  0, roll:  0, ias: 280, alt: 15000, g: 1.0, beta:  0, heading:  0, throttle: 0.60, phase: 'Recovery' },
  { t: 52, pitch:  2, roll:-30, ias: 280, alt: 15050, g: 1.2, beta: -1, heading:  0, throttle: 0.60, phase: 'Right Roll' },
  { t: 56, pitch:  0, roll:  0, ias: 280, alt: 15000, g: 1.0, beta:  0, heading: 12, throttle: 0.60, phase: 'Wings Level' },
  { t: 60, pitch:  2, roll: 30, ias: 280, alt: 15050, g: 1.2, beta:  1, heading: 12, throttle: 0.60, phase: 'Left Roll' },
  { t: 64, pitch:  0, roll:  0, ias: 280, alt: 15000, g: 1.0, beta:  0, heading:  0, throttle: 0.60, phase: 'Wings Level' },
  { t: 68, pitch:  0, roll:  0, ias: 280, alt: 15000, g: 1.0, beta:  0, heading:  0, throttle: 0.60, phase: 'Cruise' },
  { t: 71, pitch:  0, roll: -5, ias: 280, alt: 15000, g: 1.0, beta: -6, heading:  0, throttle: 0.60, phase: 'Sideslip Left' },
  { t: 75, pitch:  0, roll:  0, ias: 280, alt: 15000, g: 1.0, beta:  0, heading:  0, throttle: 0.60, phase: 'Recovery' },
  { t: 78, pitch:  0, roll:  5, ias: 280, alt: 15000, g: 1.0, beta:  6, heading:  0, throttle: 0.60, phase: 'Sideslip Right' },
  { t: 82, pitch:  0, roll:  0, ias: 280, alt: 15000, g: 1.0, beta:  0, heading:  0, throttle: 0.60, phase: 'Cruise' },
  { t: 86, pitch:  3, roll:  0, ias: 250, alt: 15100, g: 1.0, beta:  0, heading:  0, throttle: 0.40, phase: 'Decelerating' },
  { t: 93, pitch: 10, roll:  0, ias: 190, alt: 15400, g: 1.0, beta:  0, heading:  0, throttle: 0.30, phase: 'Approach to Stall' },
  { t:100, pitch: 18, roll:  0, ias: 135, alt: 15700, g: 0.9, beta:  0, heading:  0, throttle: 0.20, phase: 'Approach to Stall' },
  { t:104, pitch: 21, roll:  0, ias: 122, alt: 15750, g: 0.6, beta:  0, heading:  0, throttle: 0.18, phase: 'Stall Warning' },
  { t:106, pitch: 22, roll:  2, ias: 115, alt: 15720, g: 0.3, beta:  0, heading:  0, throttle: 0.18, phase: 'Stall' },
  { t:109, pitch:  5, roll:  0, ias: 138, alt: 15580, g: 1.3, beta:  0, heading:  0, throttle: 0.65, phase: 'Recovery' },
  { t:114, pitch:  0, roll:  0, ias: 205, alt: 15280, g: 1.0, beta:  0, heading:  0, throttle: 0.65, phase: 'Recovery' },
  { t:122, pitch:  0, roll:  0, ias: 280, alt: 15000, g: 1.0, beta:  0, heading:  0, throttle: 0.60, phase: 'Cruise' },
  // ── Descent and approach ──────────────────────────────────────────────────
  { t:128, pitch: -4, roll:  0, ias: 250, alt: 13000, g: 1.0, beta:  0, heading:  0, throttle: 0.35, phase: 'Descent' },
  { t:138, pitch: -4, roll:  0, ias: 210, alt:  8000, g: 1.0, beta:  0, heading:  0, throttle: 0.28, phase: 'Descent' },
  { t:148, pitch: -3, roll:  0, ias: 170, alt:  3000, g: 1.0, beta:  0, heading:  0, throttle: 0.25, phase: 'Final Approach' },
  { t:155, pitch: -2, roll:  0, ias: 140, alt:  1000, g: 1.0, beta:  0, heading:  0, throttle: 0.22, phase: 'Final Approach' },
  { t:160, pitch: -1, roll:  0, ias: 128, alt:   300, g: 1.0, beta:  0, heading:  0, throttle: 0.20, phase: 'Flare' },
  { t:163, pitch:  2, roll:  0, ias: 122, alt:    50, g: 1.0, beta:  0, heading:  0, throttle: 0.18, phase: 'Flare' },
  // ── Touchdown and rollout ─────────────────────────────────────────────────
  { t:165, pitch:  2, roll:  0, ias: 120, alt:     0, g: 1.0, beta:  0, heading:  0, throttle: 0.10, phase: 'Touchdown' },
  { t:168, pitch:  1, roll:  0, ias:  80, alt:     0, g: 1.0, beta:  0, heading:  0, throttle: 0.05, phase: 'Ground Roll' },
  { t:173, pitch:  0, roll:  0, ias:  30, alt:     0, g: 1.0, beta:  0, heading:  0, throttle: 0.05, phase: 'Ground Roll' },
  { t:176, pitch:  0, roll:  0, ias:   5, alt:     0, g: 1.0, beta:  0, heading:  0, throttle: 0.05, phase: 'On Runway' },
  { t:178, pitch:  0, roll:  0, ias:   0, alt:     0, g: 1.0, beta:  0, heading:  0, throttle: 0.05, phase: 'On Runway' },
];

const LOOP_MS = 178000;

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function sample(elapsedMs) {
  const t = (elapsedMs % LOOP_MS) / 1000;
  let i = SCRIPT.length - 2;
  for (let k = 0; k < SCRIPT.length - 1; k++) {
    if (t >= SCRIPT[k].t && t < SCRIPT[k + 1].t) { i = k; break; }
  }
  const a = SCRIPT[i];
  const b = SCRIPT[i + 1];
  const span = b.t - a.t;
  const alpha = span === 0 ? 0 : (t - a.t) / span;
  return {
    pitch:    lerp(a.pitch, b.pitch, alpha),
    roll:     lerp(a.roll,  b.roll,  alpha),
    ias:      Math.round(lerp(a.ias, b.ias, alpha)),
    alt:      Math.round(lerp(a.alt, b.alt, alpha)),
    g:        parseFloat(lerp(a.g, b.g, alpha).toFixed(2)),
    beta:     parseFloat(lerp(a.beta, b.beta, alpha).toFixed(1)),
    heading:  parseFloat(lerp(a.heading, b.heading, alpha).toFixed(1)),
    throttle: parseFloat(lerp(a.throttle, b.throttle, alpha).toFixed(2)),
    phase:    a.phase,
  };
}

// ── Physics ───────────────────────────────────────────────────────────────────

const STALL_SPEED    = 120;
const OVERSPEED_WARN = 370;

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function toRad(deg)        { return deg * Math.PI / 180; }

const INIT_PHYSICS = {
  pitch: 0, roll: 0, heading: 0, alt: 0,
  ias: 0, vSpeed: 0, g: 1.0, beta: 0,
};

function computePhase(s) {
  if (s.alt <= 0) {
    if (s.ias >= STALL_SPEED) return 'ROTATE';
    if (s.ias > 20)            return 'TAKEOFF ROLL';
    return 'ON RUNWAY';
  }
  if (s.ias < STALL_SPEED)                              return 'STALL';
  if (s.ias > OVERSPEED_WARN)                           return 'OVERSPEED';
  if (s.g > 3.5)                                        return 'HIGH G';
  if (s.vSpeed > 15  && Math.abs(s.pitch) > 5)         return 'CLIMBING';
  if (s.vSpeed < -15 && Math.abs(s.pitch) > 5)         return 'DESCENDING';
  if (Math.abs(s.beta) > 4)                             return 'SIDESLIP';
  if (Math.abs(s.roll) > 25 && s.vSpeed < -5)          return 'BANKED TURN';
  if (Math.abs(s.roll) > 25)                            return 'IN BANK';
  return 'CRUISE';
}

function stepPhysics(s, ctrl) {
  const dt = 0.05;
  const { stickX, stickY, throttle, rudder } = ctrl;

  // Ground roll / takeoff roll
  if (s.alt <= 0) {
    const ias = clamp(s.ias + (throttle * 12 - 8) * dt, 0, 500);
    let pitch = s.pitch;
    let alt   = 0;
    let vSpeed = 0;
    if (ias >= STALL_SPEED) {
      // Allow rotation above stall speed
      const pitchRate = stickY * 15 * clamp(ias / 200, 0.1, 2.0) - s.pitch * 0.4;
      pitch  = clamp(s.pitch + pitchRate * dt, -5, 25);
      vSpeed = ias * Math.sin(toRad(pitch)) * 1.69;
      alt    = Math.max(0, vSpeed * dt); // lift off when vSpeed > 0
    } else {
      pitch = lerp(s.pitch, 0, 0.15); // nose stays level before rotate speed
    }
    return {
      pitch, roll: lerp(s.roll, 0, 0.15),
      heading: s.heading, alt, ias, vSpeed, g: 1.0, beta: 0,
    };
  }

  const stalled = s.ias < STALL_SPEED;

  // Roll
  const rollRate = stickX * 35;
  let roll = clamp(s.roll + rollRate * dt, -180, 180);

  // Pitch — static stability provides restoring moment toward trim; equilibrium pitch
  // = stickY × 15 × iasRatio / 0.4, so slight back pressure finds a steady pitch angle.
  const iasRatio      = clamp(s.ias / 200, 0.1, 2.0);
  const stabilityRate = s.pitch * 0.4; // restoring: 0.4°/s per degree off trim
  let pitchRate       = (stalled ? 0 : stickY * 15 * iasRatio) - stabilityRate;
  if (stalled) pitchRate -= 3;
  pitchRate -= Math.sin(toRad(roll)) ** 2 * 8; // bank-induced nose-drop
  let pitch = clamp(s.pitch + pitchRate * dt, -60, 60);

  // Precompute bank trig — used by heading, drag, and G-load
  const cosRoll = Math.cos(toRad(roll));
  const safeCos = Math.max(Math.abs(cosRoll), 0.05);

  // Heading — coordinated turn rate: ω = g·tan(φ)/V ≈ 1090·tan(φ)/IAS (°/s)
  // Negative sign: positive roll = left bank → decreasing heading; negative roll = right bank → increasing heading
  const coordYaw = -1090 * Math.sin(toRad(roll)) / (safeCos * Math.max(s.ias, 50));
  let heading = (s.heading + (coordYaw + rudder * 15) * dt) % 360;
  if (heading < 0) heading += 360;

  // Sideslip
  const naturalBeta = Math.sin(toRad(roll)) * 0.3;
  const beta = lerp(s.beta, rudder * 12 - naturalBeta, 0.08);

  // Airspeed — thrust minus pitch drag minus bank-induced drag
  const altFactor   = clamp((60000 - s.alt) / 30000, 0, 1);
  const thrustAccel = (throttle - 0.3) * 18 * altFactor;
  const pitchDrag   = Math.sin(toRad(pitch)) * 25;
  const bankDrag    = (1 / safeCos - 1) * 3;
  let ias = clamp(s.ias + (thrustAccel - pitchDrag - bankDrag) * dt, 0, 500);

  // Vertical speed & altitude
  let vSpeed = ias * Math.sin(toRad(pitch)) * 1.69;
  let alt = s.alt + vSpeed * dt;
  if (alt <= 0)     { alt = 0;     vSpeed = 0; }
  if (alt >= 60000) { alt = 60000; vSpeed = Math.min(0, vSpeed); }

  // G-load: bank factor plus pitch acceleration contribution
  const bankG  = stalled ? 1 : (1 / safeCos);
  const pitchG = (pitchRate * ias) / 1800;
  const g = clamp(bankG + pitchG, -0.5, 8.0);

  // Roll stability — hands-off drifts back toward wings level
  if (Math.abs(stickX) < 0.05) roll = lerp(roll, 0, 0.01);

  return { pitch, roll, heading, alt, ias, vSpeed, g, beta };
}

function useFlightPhysics(controlsRef, active) {
  const physRef = useRef({ ...INIT_PHYSICS });
  const [state, setState] = useState(() => ({ ...INIT_PHYSICS, phase: computePhase(INIT_PHYSICS) }));

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => {
      const next = stepPhysics(physRef.current, controlsRef.current);
      physRef.current = next;
      setState({ ...next, phase: computePhase(next) });
    }, 50);
    return () => clearInterval(id);
  }, [active]);

  function reset(seedState) {
    const s = seedState ? { ...INIT_PHYSICS, ...seedState } : { ...INIT_PHYSICS };
    physRef.current = { ...s };
    setState({ ...s, phase: computePhase(s) });
  }

  return { state, stateRef: physRef, reset };
}

// ── Controls ─────────────────────────────────────────────────────────────────

const STICK_R = 80; // px — radius of stick zone

// displayPos: { x, y } in pixels from centre — used in auto mode
function StickControl({ controlsRef, displayPos, interactive }) {
  const puckPosRef = useRef({ x: 0, y: 0 });
  const [puckPos, setPuckPos] = useState({ x: 0, y: 0 });
  const draggingRef = useRef(false);
  const rafRef      = useRef(null);
  const zoneRef     = useRef(null);

  function movePuck(x, y) {
    const dist = Math.sqrt(x * x + y * y);
    const scale = dist > STICK_R ? STICK_R / dist : 1;
    const pos = { x: x * scale, y: y * scale };
    puckPosRef.current = pos;
    setPuckPos(pos);
    controlsRef.current.stickX = -pos.x / STICK_R;
    controlsRef.current.stickY =  pos.y / STICK_R;
  }

  function springBack() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const { x: fromX, y: fromY } = puckPosRef.current;
    const t0 = Date.now();
    function frame() {
      const elapsed = Date.now() - t0;
      const t = Math.min(elapsed / 200, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      movePuck(fromX * (1 - eased), fromY * (1 - eased));
      if (t < 1) rafRef.current = requestAnimationFrame(frame);
    }
    rafRef.current = requestAnimationFrame(frame);
  }

  useEffect(() => {
    if (!interactive) return;
    function onMove(e) {
      if (!draggingRef.current || !zoneRef.current) return;
      const rect = zoneRef.current.getBoundingClientRect();
      movePuck(e.clientX - (rect.left + rect.width / 2),
               e.clientY - (rect.top  + rect.height / 2));
    }
    function onUp() {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      springBack();
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup',   onUp);
    };
  }, [interactive]); // eslint-disable-line react-hooks/exhaustive-deps

  const renderPos = interactive ? puckPos : { x: displayPos?.x ?? 0, y: displayPos?.y ?? 0 };
  const puckColor = interactive ? '#00e676' : '#42a5f5';
  const puckGlow  = interactive ? '0 0 8px #00e676' : '0 0 6px #42a5f5';

  return (
    <Box
      ref={zoneRef}
      onMouseDown={interactive ? (e => {
        e.preventDefault();
        draggingRef.current = true;
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
      }) : undefined}
      sx={{
        width: STICK_R * 2, height: STICK_R * 2, borderRadius: '50%',
        border: `1px solid #1e2a38`, bgcolor: '#0a1520',
        position: 'relative', cursor: interactive ? 'crosshair' : 'default', flexShrink: 0,
      }}
    >
      <Box sx={{ position: 'absolute', top: '50%', left: 4, right: 4, height: '1px', bgcolor: '#1e2a38', transform: 'translateY(-50%)' }} />
      <Box sx={{ position: 'absolute', left: '50%', top: 4, bottom: 4, width: '1px', bgcolor: '#1e2a38', transform: 'translateX(-50%)' }} />
      <Box sx={{
        position: 'absolute', width: 18, height: 18, borderRadius: '50%',
        bgcolor: puckColor, boxShadow: puckGlow,
        top:  `calc(50% + ${renderPos.y}px - 9px)`,
        left: `calc(50% + ${renderPos.x}px - 9px)`,
        userSelect: 'none', pointerEvents: 'none',
        transition: interactive ? 'none' : 'top 0.1s ease-out, left 0.1s ease-out',
      }} />
    </Box>
  );
}

const THROTTLE_TRACK_H  = 160;
const THROTTLE_HANDLE_H = 20;
const THROTTLE_RANGE    = THROTTLE_TRACK_H - THROTTLE_HANDLE_H;

function ThrottleControl({ value, onChange, interactive }) {
  const draggingRef  = useRef(false);
  const dragStartRef = useRef({ mouseY: 0, throttle: 0 });
  const trackRef     = useRef(null);

  const handleTop   = (1 - value) * THROTTLE_RANGE;
  const handleColor = value > 0.95 ? '#ff3d00' : value > 0.80 ? '#ffa000' : (interactive ? '#00e676' : '#42a5f5');

  useEffect(() => {
    if (!interactive) return;
    function onMove(e) {
      if (!draggingRef.current) return;
      const dy = e.clientY - dragStartRef.current.mouseY;
      onChange(clamp(dragStartRef.current.throttle - dy / THROTTLE_RANGE, 0, 1));
    }
    function onUp() { draggingRef.current = false; }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup',   onUp);
    };
  }, [interactive]); // eslint-disable-line react-hooks/exhaustive-deps

  function startDrag(e, fromThrottle) {
    e.preventDefault();
    draggingRef.current  = true;
    dragStartRef.current = { mouseY: e.clientY, throttle: fromThrottle };
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
      <Box
        ref={trackRef}
        sx={{
          width: 28, height: THROTTLE_TRACK_H, bgcolor: '#0a1520',
          border: '1px solid #1e2a38', borderRadius: 1,
          position: 'relative', cursor: interactive ? 'ns-resize' : 'default',
        }}
        onMouseDown={interactive ? (e => {
          if (!trackRef.current) return;
          const rect   = trackRef.current.getBoundingClientRect();
          const jumped = clamp(1 - (e.clientY - rect.top) / THROTTLE_TRACK_H, 0, 1);
          onChange(jumped);
          startDrag(e, jumped);
        }) : undefined}
      >
        <Box sx={{
          position: 'absolute', bottom: 0, left: 2, right: 2,
          height: `${value * 100}%`, bgcolor: handleColor, opacity: 0.15, borderRadius: 0.5,
        }} />
        <Box
          onMouseDown={interactive ? (e => { e.stopPropagation(); startDrag(e, value); }) : undefined}
          sx={{
            position: 'absolute', top: handleTop, left: 2, right: 2,
            height: THROTTLE_HANDLE_H, bgcolor: handleColor, borderRadius: 0.5,
            boxShadow: `0 0 6px ${handleColor}`,
            cursor: interactive ? 'ns-resize' : 'default',
            transition: interactive ? 'none' : 'top 0.1s ease-out',
          }}
        />
      </Box>
      <Typography variant="caption" sx={{ color: '#b8c8d8', fontFamily: 'monospace', fontSize: '0.65rem' }}>
        {Math.round(value * 100)}%
      </Typography>
    </Box>
  );
}

function RudderStripChart({ value }) {
  const pct      = Math.abs(value) * 100;
  // Thresholds match sideslip gauge: 25 % ≈ 3° beta, 50 % ≈ 6° beta (beta ≈ rudder × 12)
  const barColor = pct > 50 ? '#ff3d00' : pct > 25 ? '#ffa000' : '#00e676';

  return (
    <Box sx={{ width: '100%', px: 1 }}>
      <Box sx={{
        height: 36, bgcolor: '#0a1520', border: '1px solid #1e2a38', borderRadius: 1,
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Deflection bar — extends from center toward L or R */}
        {Math.abs(value) > 0.01 && (
          <Box sx={{
            position: 'absolute', top: 5, bottom: 5,
            left:  value < 0 ? `${(1 + value) * 50}%` : '50%',
            width: `${Math.abs(value) * 50}%`,
            bgcolor: barColor, opacity: 0.75, borderRadius: 0.5,
          }} />
        )}
        {/* Tick marks at ±25%, ±50%, ±75% */}
        {[-75, -50, -25, 25, 50, 75].map(tick => (
          <Box key={tick} sx={{
            position: 'absolute', left: `${50 + tick / 2}%`,
            top: 0, bottom: 0, width: '1px', bgcolor: '#1e2a38',
          }} />
        ))}
        {/* Center marker */}
        <Box sx={{
          position: 'absolute', left: '50%', top: 0, bottom: 0,
          width: '2px', bgcolor: '#2a4a6a', transform: 'translateX(-50%)',
        }} />
        <Typography variant="caption" sx={{ position: 'absolute', left: 5, top: '50%', transform: 'translateY(-50%)', color: '#b8c8d8', fontFamily: 'monospace', fontSize: '0.6rem' }}>L</Typography>
        <Typography variant="caption" sx={{ position: 'absolute', right: 5, top: '50%', transform: 'translateY(-50%)', color: '#b8c8d8', fontFamily: 'monospace', fontSize: '0.6rem' }}>R</Typography>
      </Box>
    </Box>
  );
}

function RudderPedals({ rudder }) {
  const leftActive  = rudder < -0.05;
  const rightActive = rudder >  0.05;

  function pedalSx(active) {
    return {
      width: 52, height: 56, bgcolor: '#0a1520',
      border: `1px solid ${active ? '#00e676' : '#1e2a38'}`,
      borderRadius: 1,
      boxShadow: active ? '0 0 6px #00e676' : 'none',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      transform: active ? 'translateY(4px)' : 'none',
      transition: 'transform 0.06s, box-shadow 0.06s, border-color 0.06s',
    };
  }

  return (
    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-end' }}>
      <Box sx={pedalSx(leftActive)}>
        <Typography variant="caption" sx={{ color: '#b8c8d8', fontFamily: 'monospace', fontSize: '0.65rem' }}>←</Typography>
      </Box>
      <Box sx={pedalSx(rightActive)}>
        <Typography variant="caption" sx={{ color: '#b8c8d8', fontFamily: 'monospace', fontSize: '0.65rem' }}>→</Typography>
      </Box>
    </Box>
  );
}

// ── Presentation ──────────────────────────────────────────────────────────────

const C = {
  green: '#00e676',
  amber: '#ffa000',
  red:   '#ff3d00',
  dim:   '#1e2a38',
  bg:    '#080c12',
  text:  '#b8c8d8',
};

const POINTER = {
  type: 'needle',
  color: '#e0e0e0',
  animate: true,
  animationDuration: 150,
  animationDelay: 0,
  animationThreshold: 0,
};

function InstrumentLabel({ children }) {
  return (
    <Typography variant="caption" sx={{ color: C.text, fontFamily: 'monospace', letterSpacing: 1, mt: -0.5 }}>
      {children}
    </Typography>
  );
}

function TelemetryDemo() {
  const [mode, setMode]             = useState('auto');
  const [throttle, setThrottle]     = useState(0.5);
  const [rudder,   setRudder]       = useState(0);
  const [autoStickPos, setAutoStickPos] = useState({ x: 0, y: 0 });
  const startRef    = useRef(Date.now());
  const controlsRef = useRef({ stickX: 0, stickY: 0, throttle: 0.5, rudder: 0 });
  const keysRef     = useRef(new Set());
  const [landingResult, setLandingResult] = useState(null); // null | 'rolling' | 'crashed' | 'landed' | 'overrun'
  const [rollTimeLeft, setRollTimeLeft]   = useState(30);
  const prevAltRef        = useRef(INIT_PHYSICS.alt);
  const takeoverOffsetRef  = useRef(0);    // script elapsed ms when user took control
  const returningTargetRef = useRef(null); // script sample() snapshot to return toward

  function handleThrottleChange(val) {
    controlsRef.current.throttle = val;
    setThrottle(val);
  }

  // Keyboard input + continuous rudder/throttle tick
  useEffect(() => {
    if (mode !== 'interactive') return;
    const keysSet = keysRef.current; // stable Set — same object for lifetime of this effect

    function onKeyDown(e) {
      keysSet.add(e.key);
      if (e.key === ' ') {
        e.preventDefault();
        controlsRef.current.rudder = 0;
        setRudder(0);
      }
      if (e.key === 'r' || e.key === 'R') resetToAuto();
      if ([' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) e.preventDefault();
    }
    function onKeyUp(e) { keysSet.delete(e.key); }

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup',   onKeyUp);

    const dt = 0.05;
    const tickId = setInterval(() => {
      const keys = keysSet;

      // Throttle — arrow up/down at 30 %/sec
      if (keys.has('ArrowUp') || keys.has('ArrowDown')) {
        setThrottle(prev => {
          const dir  = keys.has('ArrowUp') ? 1 : -1;
          const next = clamp(prev + dir * 0.30 * dt, 0, 1);
          controlsRef.current.throttle = next;
          return next;
        });
      }

      // Rudder — accumulates at 40 %/sec; holds position on release; Space centres
      setRudder(prev => {
        const left  = keys.has('ArrowLeft');
        const right = keys.has('ArrowRight');
        let next;
        if      (left  && !right) next = clamp(prev - 0.40 * dt, -1, 1);
        else if (right && !left)  next = clamp(prev + 0.40 * dt, -1, 1);
        else                      next = prev; // hold position
        controlsRef.current.rudder = next;
        return next;
      });
    }, 50);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup',   onKeyUp);
      clearInterval(tickId);
      keysSet.clear();
    };
  }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

  const isMobile = useMediaQuery('(max-width:600px)');

  // Auto-play — also drives control display positions
  const [autoState, setAutoState] = useState(() => sample(0));
  useEffect(() => {
    if (mode !== 'auto') return;
    const id = setInterval(() => {
      const s = sample(Date.now() - startRef.current);
      setAutoState(s);
      setThrottle(s.throttle);
      // Rudder: invert the steady-state relationship beta ≈ rudder × 12
      setRudder(clamp(s.beta / 12, -1, 1));
      // Stick: roll → puck X (right roll = right), pitch → puck Y (nose-up = down)
      const rawX = -(s.roll  / 90) * STICK_R; // positive roll = visual left bank → puck left
      const rawY = (s.pitch / 30) * STICK_R;
      const dist = Math.sqrt(rawX * rawX + rawY * rawY);
      const sc   = dist > STICK_R ? STICK_R / dist : 1;
      setAutoStickPos({ x: rawX * sc, y: rawY * sc });
    }, 100);
    return () => clearInterval(id);
  }, [mode]);

  // Interactive and returning modes both run physics; pause in terminal landing states
  const physicsActive = (mode === 'interactive' || mode === 'returning') &&
                        (landingResult === null || landingResult === 'rolling');
  const { state: physState, stateRef: physStateRef, reset: resetPhysics } = useFlightPhysics(controlsRef, physicsActive);

  // Touchdown detection
  useEffect(() => {
    if (mode !== 'interactive' || landingResult !== null) {
      prevAltRef.current = physState.alt;
      return;
    }
    if (prevAltRef.current > 0 && physState.alt <= 0) {
      const { ias, pitch } = physState;
      const valid = Math.abs(ias - STALL_SPEED) <= 5 && pitch >= 1 && pitch <= 4;
      setLandingResult(valid ? 'rolling' : 'crashed');
      if (valid) setRollTimeLeft(30);
    }
    prevAltRef.current = physState.alt;
  }, [physState.alt]); // eslint-disable-line react-hooks/exhaustive-deps

  // Rolling countdown
  useEffect(() => {
    if (landingResult !== 'rolling') return;
    const id = setInterval(
      () => setRollTimeLeft(t => Math.max(0, Math.round((t - 0.1) * 10) / 10)),
      100,
    );
    return () => clearInterval(id);
  }, [landingResult]);

  // Overrun when timer hits zero
  useEffect(() => {
    if (landingResult !== 'rolling' || rollTimeLeft > 0) return;
    setLandingResult('overrun');
  }, [rollTimeLeft, landingResult]);

  // Full-stop detection
  useEffect(() => {
    if (landingResult !== 'rolling') return;
    if (physState.ias < 1) setLandingResult('landed');
  }, [physState.ias, landingResult]);

  // Returning autopilot — flies toward the saved script target, then hands off to auto
  useEffect(() => {
    if (mode !== 'returning') return;
    const target = returningTargetRef.current;
    if (!target) return;
    const deadline = Date.now() + 30_000; // 30-second timeout → restart takeoff if exceeded

    const id = setInterval(() => {
      const s = physStateRef.current;

      // Base return-to-conditions inputs
      let stickX = clamp(-s.roll / 15, -1, 1);
      const altErr = target.alt - s.alt;
      const iasErr = target.ias - s.ias;
      let wantPitch   = clamp(altErr / 1000, -12, 15);
      let stickY      = clamp((wantPitch - s.pitch) / 8, -1, 1);
      let newThrottle = clamp((altErr > 300 ? 0.85 : 0.55) + iasErr / 400, 0.05, 0.95);

      // Safety overrides — prevent triggering any warning condition
      const nearStall = s.alt > 0 && s.ias < 145;
      const tooLow    = s.alt > 0 && s.alt < 1500 && !nearStall;
      const nearOver  = s.ias > 360;

      if (nearStall) {
        stickY = clamp(stickY, -1, -0.2); // pitch down to recover airspeed first
        newThrottle = 0.90;
      } else if (tooLow) {
        stickY = Math.max(stickY, 0.5);   // climb away from terrain
        newThrottle = Math.max(newThrottle, 0.75);
      }
      if (nearOver) {
        newThrottle = Math.min(newThrottle, 0.15);
        stickY = Math.max(stickY, 0.3);   // gentle pull-up to shed speed
      }

      controlsRef.current = { stickX, stickY, throttle: newThrottle, rudder: 0 };
      setThrottle(newThrottle);
      setRudder(0);
      setAutoStickPos({ x: -stickX * STICK_R, y: stickY * STICK_R });

      // Converge within 10% of target values
      const altTol = Math.max(target.alt * 0.10, 200);
      const iasTol = Math.max(target.ias * 0.10, 10);
      const converged =
        Math.abs(altErr) < altTol &&
        Math.abs(iasErr) < iasTol &&
        Math.abs(s.roll)  < 10;

      if (converged) {
        // Resume script from where user handed off
        startRef.current = Date.now() - takeoverOffsetRef.current;
        setMode('auto');
      } else if (Date.now() > deadline) {
        // Took too long — restart from the beginning of the takeoff roll
        startRef.current = Date.now();
        controlsRef.current = { stickX: 0, stickY: 0, throttle: 0.05, rudder: 0 };
        setThrottle(0.05);
        setRudder(0);
        setMode('auto');
      }
    }, 100);

    return () => clearInterval(id);
  }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

  const state = mode === 'auto' ? autoState : physState;

  const warnings = [];
  if (state.ias > 400)                           warnings.push({ label: 'OVERSPEED', color: C.red });
  else if (state.ias > 370)                      warnings.push({ label: 'OVERSPEED', color: C.amber });
  if (state.ias < STALL_SPEED && state.alt > 0)  warnings.push({ label: 'STALL',     color: C.red });
  if (state.g > 4.5)                             warnings.push({ label: 'HIGH G',    color: C.red });
  if (state.g < 0)                               warnings.push({ label: 'NEG G',     color: C.amber });
  if (state.alt <= 500 && state.alt > 0)         warnings.push({ label: 'LOW ALT',   color: C.red });

  function enterInteractive() {
    if (mode === 'returning') {
      // Physics is already live at the right state — just hand control to the user
      setMode('interactive');
      return;
    }
    // From auto: seed physics from the current auto state so instruments don't jump
    const vSpeed = autoState.ias * Math.sin(toRad(autoState.pitch)) * 1.69;
    const seedState = {
      pitch:   autoState.pitch,
      roll:    autoState.roll,
      heading: autoState.heading,
      alt:     autoState.alt,
      ias:     autoState.ias,
      vSpeed,
      g:       autoState.g,
      beta:    autoState.beta,
    };
    takeoverOffsetRef.current = Date.now() - startRef.current;
    prevAltRef.current = autoState.alt;
    resetPhysics(seedState);
    const initRudder = clamp(autoState.beta / 12, -1, 1);
    controlsRef.current = { stickX: 0, stickY: 0, throttle: autoState.throttle, rudder: initRudder };
    setThrottle(autoState.throttle);
    setRudder(initRudder);
    setMode('interactive');
  }

  function resetToAuto() {
    if (physState.alt > 0) {
      // Airborne: fly back to script conditions before resuming the test profile
      returningTargetRef.current = sample(takeoverOffsetRef.current);
      setLandingResult(null);
      setRollTimeLeft(30);
      setMode('returning');
    } else {
      // On ground: restart the full circuit from t=0
      startRef.current = Date.now();
      controlsRef.current = { stickX: 0, stickY: 0, throttle: 0.05, rudder: 0 };
      setThrottle(0.05);
      setRudder(0);
      setLandingResult(null);
      setRollTimeLeft(30);
      setMode('auto');
    }
  }

  function resetFromLanding() {
    resetToAuto();
  }

  return (
    <Box sx={{ bgcolor: C.bg, border: `1px solid ${C.dim}`, borderRadius: 2, p: 2, mt: 4, maxWidth: 880, mx: 'auto', position: 'relative' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{
            width: 8, height: 8, borderRadius: '50%',
            bgcolor: C.green, boxShadow: `0 0 6px ${C.green}`, flexShrink: 0,
          }} />
          <Typography variant="caption" sx={{ color: C.text, letterSpacing: 2, fontFamily: 'monospace', fontSize: '0.75rem' }}>
            TELEMETRY SIM
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {/* Warning chips */}
          {warnings.map(w => (
            <Chip
              key={w.label}
              label={w.label}
              size="small"
              sx={{
                bgcolor: 'transparent', color: w.color,
                border: `1px solid ${w.color}`, fontFamily: 'monospace',
                fontSize: '0.65rem', letterSpacing: 1,
                animation: 'telePulse 0.75s ease-in-out infinite',
                '@keyframes telePulse': {
                  '0%, 100%': { opacity: 1 },
                  '50%':      { opacity: 0.3 },
                },
              }}
            />
          ))}
          <Chip
            label={state.phase}
            size="small"
            sx={{ bgcolor: '#0d2137', color: '#42a5f5', border: '1px solid #1a4a6a', fontFamily: 'monospace', letterSpacing: 1, fontSize: '0.7rem' }}
          />
        </Box>
      </Box>

      {/* Ground roll countdown */}
      {landingResult === 'rolling' && (
        <Box sx={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, mb: 2,
          bgcolor: '#0d1a0d', border: `1px solid ${C.amber}`, borderRadius: 1, px: 2, py: 1,
        }}>
          <Typography sx={{ color: C.amber, fontFamily: 'monospace', fontSize: '0.8rem', letterSpacing: 2 }}>
            GROUND ROLL — CUT THROTTLE TO STOP
          </Typography>
          <Typography sx={{
            color: rollTimeLeft < 10 ? C.red : C.amber,
            fontFamily: 'monospace', fontSize: '1rem', letterSpacing: 2, fontWeight: 700,
            ...(rollTimeLeft < 10 && { animation: 'telePulse 0.5s ease-in-out infinite' }),
          }}>
            {Math.ceil(rollTimeLeft)}s
          </Typography>
        </Box>
      )}

      {/* Instrument panel */}
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', alignItems: 'flex-start', flexWrap: 'wrap' }}>

        {/* Left column: G-Load + Airspeed */}
        <Stack alignItems="center" sx={{ minWidth: 160 }}>
          <GaugeComponent
            id="gauge-g"
            type="radial"
            value={state.g}
            minValue={0}
            maxValue={4}
            arc={{ subArcs: [
              { limit: 1.5, color: C.green },
              { limit: 2.5, color: C.amber },
              { limit: 4.0, color: C.red },
            ]}}
            pointer={POINTER}
            labels={{ valueLabel: { formatTextValue: v => Number(v).toFixed(1), style: { fill: C.text } } }}
            style={{ width: 160 }}
            fadeInAnimation={false}
          />
          <InstrumentLabel>G-LOAD</InstrumentLabel>

          <Box sx={{ mt: 2 }}>
            <GaugeComponent
              id="gauge-ias"
              type="radial"
              value={state.ias}
              minValue={0}
              maxValue={400}
              arc={{ subArcs: [
                { limit: 120, color: C.red },
                { limit: 150, color: C.amber },
                { limit: 320, color: C.green },
                { limit: 370, color: C.amber },
                { limit: 400, color: C.red },
              ]}}
              pointer={POINTER}
              labels={{ valueLabel: { formatTextValue: v => Math.round(Number(v)).toString(), style: { fill: C.text } } }}
              style={{ width: 160 }}
              fadeInAnimation={false}
            />
            <InstrumentLabel>AIRSPEED</InstrumentLabel>
            <Typography variant="caption" sx={{ color: '#3a4a5a', fontFamily: 'monospace', fontSize: '0.65rem', letterSpacing: 1 }}>KIAS</Typography>
          </Box>
        </Stack>

        {/* Center: Attitude + Heading */}
        <Stack alignItems="center" spacing={1}>
          <AttitudeIndicator pitch={state.pitch} roll={state.roll} size="260px" showBox />
          <InstrumentLabel>ATTITUDE</InstrumentLabel>
          <HeadingIndicator heading={state.heading} size="160px" showBox />
          <InstrumentLabel>HEADING</InstrumentLabel>
        </Stack>

        {/* Right column: Sideslip + Altimeter */}
        <Stack alignItems="center" sx={{ minWidth: 160 }}>
          <GaugeComponent
            id="gauge-beta"
            type="radial"
            value={state.beta}
            minValue={-10}
            maxValue={10}
            arc={{ subArcs: [
              { limit: -6, color: C.red },
              { limit: -3, color: C.amber },
              { limit:  3, color: C.green },
              { limit:  6, color: C.amber },
              { limit: 10, color: C.red },
            ]}}
            pointer={POINTER}
            labels={{ valueLabel: { formatTextValue: v => Number(v).toFixed(1) + '°', style: { fill: C.text } } }}
            style={{ width: 160 }}
            fadeInAnimation={false}
          />
          <InstrumentLabel>SIDESLIP β</InstrumentLabel>

          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Altimeter altitude={state.alt} size="160px" showBox />
            <InstrumentLabel>ALTITUDE (FT AGL)</InstrumentLabel>
            <Typography variant="caption" sx={{ color: '#3a4a5a', fontFamily: 'monospace', fontSize: '0.65rem' }}>
              {Math.round(state.alt).toLocaleString()}
            </Typography>
          </Box>
        </Stack>

      </Box>

      {/* Mode toggle — centered, stable position */}
      {!isMobile && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          {mode === 'auto' ? (
            <Button
              variant="outlined"
              onClick={enterInteractive}
              sx={{ fontFamily: 'monospace', fontSize: '0.7rem', letterSpacing: 1, color: C.green, borderColor: C.green, px: 3, py: 0.5 }}
            >
              CLICK TO TAKE CONTROL
            </Button>
          ) : mode === 'returning' ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
              <Typography sx={{
                color: C.amber, fontFamily: 'monospace', fontSize: '0.7rem', letterSpacing: 2,
                animation: 'telePulse 1s ease-in-out infinite',
                '@keyframes telePulse': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.35 } },
              }}>
                RETURNING TO TEST CONDITIONS
              </Typography>
              <Button
                variant="outlined"
                onClick={enterInteractive}
                sx={{ fontFamily: 'monospace', fontSize: '0.7rem', letterSpacing: 1, color: C.green, borderColor: C.green, px: 3, py: 0.5 }}
              >
                TAKE CONTROL
              </Button>
            </Box>
          ) : (
            <Button
              variant="outlined"
              onClick={resetToAuto}
              sx={{ fontFamily: 'monospace', fontSize: '0.7rem', letterSpacing: 1, color: C.amber, borderColor: C.amber, px: 3, py: 0.5 }}
            >
              CLICK FOR AUTOPILOT
            </Button>
          )}
        </Box>
      )}

      {/* Rudder position strip chart */}
      <Box sx={{ mt: 2 }}>
        <RudderStripChart value={rudder} />
        <Box sx={{ textAlign: 'center', mt: 0.25 }}>
          <InstrumentLabel>RUDDER POS</InstrumentLabel>
        </Box>
      </Box>

      {/* Controls — always shown on desktop */}
      {!isMobile && (
        <Box sx={{ mt: 3, pt: 2, borderTop: `1px solid #1e2a38` }}>
          <Box sx={{ display: 'flex', gap: 4, justifyContent: 'center', alignItems: 'flex-start' }}>
            {/* Throttle */}
            <Stack alignItems="center" spacing={1}>
              <ThrottleControl value={throttle} onChange={handleThrottleChange} interactive={mode === 'interactive'} />
              <InstrumentLabel>THROTTLE</InstrumentLabel>
            </Stack>
            {/* Stick */}
            <Stack alignItems="center" spacing={1}>
              <StickControl controlsRef={controlsRef} displayPos={autoStickPos} interactive={mode === 'interactive'} />
              <InstrumentLabel>STICK</InstrumentLabel>
            </Stack>
            {/* Rudder pedals */}
            <Stack alignItems="center" spacing={1}>
              <RudderPedals rudder={rudder} />
              <InstrumentLabel>RUDDER PEDALS</InstrumentLabel>
            </Stack>
          </Box>

          {/* Controls legend — interactive mode only */}
          {mode === 'interactive' && (
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
              <Box sx={{
                display: 'grid', gridTemplateColumns: 'auto 1fr', columnGap: 2, rowGap: 0.25,
                bgcolor: '#060a0f', border: '1px solid #1e2a38', borderRadius: 1, px: 2, py: 1,
              }}>
                {[
                  ['STICK',  'click + drag — pitch / roll'],
                  ['↑ / ↓',  'throttle'],
                  ['← / →',  'rudder'],
                  ['SPACE',  'center rudder'],
                  ['R',      'reset to auto'],
                ].map(([key, desc]) => (
                  <React.Fragment key={key}>
                    <Typography sx={{ color: '#42a5f5', fontFamily: 'monospace', fontSize: '0.65rem', letterSpacing: 1 }}>{key}</Typography>
                    <Typography sx={{ color: '#b8c8d8', fontFamily: 'monospace', fontSize: '0.65rem' }}>{desc}</Typography>
                  </React.Fragment>
                ))}
              </Box>
            </Box>
          )}
        </Box>
      )}

      {/* Footer */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1.5 }}>
        <Typography sx={{ color: '#2a3a4a', fontFamily: 'monospace', fontSize: '0.6rem', letterSpacing: 1 }}>
          SIMULATED — NOT REPRESENTATIVE OF ACTUAL VEHICLE
        </Typography>
      </Box>

      {/* Landing outcome overlay */}
      {landingResult && landingResult !== 'rolling' && (
        <Box sx={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          bgcolor: 'rgba(8,12,18,0.92)', borderRadius: 2, zIndex: 10,
        }}>
          <Stack alignItems="center" spacing={2} sx={{ textAlign: 'center', p: 3 }}>
            <Typography sx={{
              color: landingResult === 'landed' ? C.green : C.red,
              fontFamily: 'monospace', fontSize: '1.2rem', letterSpacing: 3, fontWeight: 700,
            }}>
              {landingResult === 'landed'  && 'NICE! YOU LANDED SAFELY'}
              {landingResult === 'crashed' && 'WHOOPS! YOU CRASHED'}
              {landingResult === 'overrun' && 'WHOOPS! RUNWAY OVERRUN'}
            </Typography>
            <Typography sx={{ color: C.text, fontFamily: 'monospace', fontSize: '0.78rem', maxWidth: 360, lineHeight: 1.6 }}>
              {landingResult === 'landed'  && 'Throttle to zero and stopped before the runway end. Great job!'}
              {landingResult === 'crashed' && 'Touch down within 5 KCAS of stall speed with 1–4° nose-up pitch next time.'}
              {landingResult === 'overrun' && "You ran off the end of the runway! Cut throttle immediately after touchdown."}
            </Typography>
            <Button
              variant="outlined"
              onClick={resetFromLanding}
              sx={{ fontFamily: 'monospace', fontSize: '0.7rem', letterSpacing: 1, color: C.green, borderColor: C.green, mt: 1 }}
            >
              RESET SIM
            </Button>
          </Stack>
        </Box>
      )}
    </Box>
  );
}

export default TelemetryDemo;
