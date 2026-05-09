import React, { useState, useEffect, useRef } from 'react';
import { Box, Typography, Chip, Stack } from '@mui/material';
import { AttitudeIndicator, Altimeter } from 'react-typescript-flight-indicators';
import GaugeComponent from 'react-gauge-component';

// Handling qualities flight profile — loops every 55 seconds
const SCRIPT = [
  { t:  0, pitch:  0, roll:   0, ias: 280, alt: 15000, g: 1.0, beta:  0, phase: 'Cruise' },
  { t:  5, pitch:  8, roll:   0, ias: 278, alt: 15100, g: 1.8, beta:  0, phase: 'Pitch Doublet ↑' },
  { t:  7, pitch: -5, roll:   0, ias: 282, alt: 14950, g: 0.4, beta:  0, phase: 'Pitch Doublet ↓' },
  { t: 10, pitch:  0, roll:   0, ias: 280, alt: 15000, g: 1.0, beta:  0, phase: 'Recovery' },
  { t: 14, pitch:  2, roll: -30, ias: 280, alt: 15050, g: 1.2, beta: -1, phase: 'Left Roll' },
  { t: 18, pitch:  0, roll:   0, ias: 280, alt: 15000, g: 1.0, beta:  0, phase: 'Wings Level' },
  { t: 22, pitch:  2, roll:  30, ias: 280, alt: 15050, g: 1.2, beta:  1, phase: 'Right Roll' },
  { t: 26, pitch:  0, roll:   0, ias: 280, alt: 15000, g: 1.0, beta:  0, phase: 'Wings Level' },
  { t: 30, pitch:  0, roll:   0, ias: 280, alt: 15000, g: 1.0, beta:  0, phase: 'Cruise' },
  { t: 33, pitch:  0, roll:  -5, ias: 280, alt: 15000, g: 1.0, beta: -6, phase: 'Sideslip Left' },
  { t: 37, pitch:  0, roll:   0, ias: 280, alt: 15000, g: 1.0, beta:  0, phase: 'Recovery' },
  { t: 40, pitch:  0, roll:   5, ias: 280, alt: 15000, g: 1.0, beta:  6, phase: 'Sideslip Right' },
  { t: 44, pitch:  0, roll:   0, ias: 280, alt: 15000, g: 1.0, beta:  0, phase: 'Cruise' },
  { t: 55, pitch:  0, roll:   0, ias: 280, alt: 15000, g: 1.0, beta:  0, phase: 'Cruise' },
];

const LOOP_MS = 55000;

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
    pitch: lerp(a.pitch, b.pitch, alpha),
    roll:  lerp(a.roll,  b.roll,  alpha),
    ias:   Math.round(lerp(a.ias, b.ias, alpha)),
    alt:   Math.round(lerp(a.alt, b.alt, alpha)),
    g:     parseFloat(lerp(a.g, b.g, alpha).toFixed(2)),
    beta:  parseFloat(lerp(a.beta, b.beta, alpha).toFixed(1)),
    phase: a.phase,
  };
}

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
};

function InstrumentLabel({ children }) {
  return (
    <Typography variant="caption" sx={{ color: C.text, fontFamily: 'monospace', letterSpacing: 1, mt: -0.5 }}>
      {children}
    </Typography>
  );
}

function TelemetryDemo() {
  const startRef = useRef(Date.now());
  const [state, setState] = useState(() => sample(0));

  useEffect(() => {
    const id = setInterval(() => setState(sample(Date.now() - startRef.current)), 100);
    return () => clearInterval(id);
  }, []);

  return (
    <Box sx={{ bgcolor: C.bg, border: `1px solid ${C.dim}`, borderRadius: 2, p: 2, mt: 4, maxWidth: 880, mx: 'auto' }}>
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
        <Chip
          label={state.phase}
          size="small"
          sx={{ bgcolor: '#0d2137', color: '#42a5f5', border: '1px solid #1a4a6a', fontFamily: 'monospace', letterSpacing: 1, fontSize: '0.7rem' }}
        />
      </Box>

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
                { limit: 150, color: C.dim },
                { limit: 320, color: C.green },
                { limit: 370, color: C.amber },
                { limit: 400, color: C.red },
              ]}}
              pointer={POINTER}
              labels={{ valueLabel: { formatTextValue: v => Math.round(Number(v)).toString(), style: { fill: C.text } } }}
              style={{ width: 160 }}
              fadeInAnimation={false}
            />
            <InstrumentLabel>IAS (KTS)</InstrumentLabel>
          </Box>
        </Stack>

        {/* Center: Attitude Indicator */}
        <Stack alignItems="center" spacing={1}>
          <AttitudeIndicator pitch={state.pitch} roll={state.roll} size="260px" showBox />
          <InstrumentLabel>ATTITUDE</InstrumentLabel>
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
            <InstrumentLabel>ALTITUDE (FT)</InstrumentLabel>
            <Typography variant="caption" sx={{ color: '#3a4a5a', fontFamily: 'monospace', fontSize: '0.65rem' }}>
              {state.alt.toLocaleString()}
            </Typography>
          </Box>
        </Stack>

      </Box>

      {/* Footer */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1.5 }}>
        <Typography sx={{ color: '#2a3a4a', fontFamily: 'monospace', fontSize: '0.6rem', letterSpacing: 1 }}>
          SIMULATED — NOT REPRESENTATIVE OF ACTUAL VEHICLE
        </Typography>
      </Box>
    </Box>
  );
}

export default TelemetryDemo;
