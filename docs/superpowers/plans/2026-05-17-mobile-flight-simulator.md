# Mobile Flight Simulator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobile-only full-screen flight simulator overlay that starts in manual mode, uses phone tilt for stick control, and provides labeled throttle/pedal controls plus takeoff prompts.

**Architecture:** Keep `TelemetryDemo` as the owning component for physics and instruments, but extract small pure helpers for orientation mapping and prompt gating so the risky behavior is easy to test. Desktop keeps the existing inline simulator; mobile renders a compact entry button and opens a fixed overlay that reuses the same physics loop with mobile-specific controls and layout.

**Tech Stack:** React 18, Material UI 5, `react-typescript-flight-indicators`, `react-gauge-component`, Jest, React Testing Library.

---

## File Structure

- Create `src/Components/flightSimulatorUtils.js`
  - Export reusable constants and pure helpers for rotation speed, clamping, orientation calibration, tilt deadband, and prompt eligibility.
- Create `src/Components/flightSimulatorUtils.test.js`
  - Unit tests for tilt mapping, clamping, deadband, neutral calibration, and rotation-prompt gating.
- Modify `src/Components/TelemetryDemo.js`
  - Import shared helpers.
  - Keep desktop behavior intact.
  - Add mobile entry button, overlay open/close state, orientation permission/calibration, mobile controls, and prompt display.
  - Split repeated instrument JSX into small internal render helpers if needed to avoid duplicating large blocks.
- Modify `src/Components/Homepage.test.js`
  - Keep homepage smoke tests stable with the mocked `TelemetryDemo`.
- Create `src/Components/TelemetryDemo.test.js`
  - Render tests for desktop inline behavior, mobile entry behavior, overlay open/close, labels, prompt text, and slider interactions.

---

### Task 1: Extract Testable Simulator Helpers

**Files:**
- Create: `src/Components/flightSimulatorUtils.js`
- Create: `src/Components/flightSimulatorUtils.test.js`
- Modify: `src/Components/TelemetryDemo.js`

- [ ] **Step 1: Write failing utility tests**

Create `src/Components/flightSimulatorUtils.test.js`:

```javascript
import {
  ROTATION_SPEED,
  clamp,
  createOrientationNeutral,
  mapOrientationToStick,
  shouldTriggerRotationPrompt,
} from './flightSimulatorUtils';

describe('flight simulator utilities', () => {
  test('clamps values to a min and max range', () => {
    expect(clamp(-2, -1, 1)).toBe(-1);
    expect(clamp(0.25, -1, 1)).toBe(0.25);
    expect(clamp(2, -1, 1)).toBe(1);
  });

  test('captures beta and gamma as the neutral orientation', () => {
    expect(createOrientationNeutral({ beta: 12, gamma: -8 })).toEqual({ beta: 12, gamma: -8 });
  });

  test('maps calibrated neutral orientation to centered stick', () => {
    const neutral = createOrientationNeutral({ beta: 10, gamma: -5 });

    expect(mapOrientationToStick({ beta: 10, gamma: -5 }, neutral)).toEqual({ stickX: 0, stickY: 0 });
  });

  test('maps tilt toward and away from the user to back and forward stick', () => {
    const neutral = createOrientationNeutral({ beta: 0, gamma: 0 });

    expect(mapOrientationToStick({ beta: 25, gamma: 0 }, neutral).stickY).toBeCloseTo(1);
    expect(mapOrientationToStick({ beta: -25, gamma: 0 }, neutral).stickY).toBeCloseTo(-1);
  });

  test('maps left and right phone tilt to left and right stick', () => {
    const neutral = createOrientationNeutral({ beta: 0, gamma: 0 });

    expect(mapOrientationToStick({ beta: 0, gamma: -25 }, neutral).stickX).toBeCloseTo(-1);
    expect(mapOrientationToStick({ beta: 0, gamma: 25 }, neutral).stickX).toBeCloseTo(1);
  });

  test('applies a small deadband around neutral', () => {
    const neutral = createOrientationNeutral({ beta: 0, gamma: 0 });

    expect(mapOrientationToStick({ beta: 1, gamma: -1 }, neutral)).toEqual({ stickX: 0, stickY: 0 });
  });

  test('clamps extreme device orientation values', () => {
    const neutral = createOrientationNeutral({ beta: 0, gamma: 0 });

    expect(mapOrientationToStick({ beta: 90, gamma: 90 }, neutral)).toEqual({ stickX: 1, stickY: 1 });
    expect(mapOrientationToStick({ beta: -90, gamma: -90 }, neutral)).toEqual({ stickX: -1, stickY: -1 });
  });

  test('triggers the rotation prompt when airspeed crosses Vr once', () => {
    expect(ROTATION_SPEED).toBe(120);
    expect(shouldTriggerRotationPrompt({ previousIas: 119, currentIas: 120, alreadyShown: false })).toBe(true);
    expect(shouldTriggerRotationPrompt({ previousIas: 120, currentIas: 121, alreadyShown: false })).toBe(false);
    expect(shouldTriggerRotationPrompt({ previousIas: 119, currentIas: 120, alreadyShown: true })).toBe(false);
  });
});
```

- [ ] **Step 2: Run the helper tests and verify they fail**

Run:

```bash
npm test -- --watchAll=false src/Components/flightSimulatorUtils.test.js
```

Expected: FAIL because `src/Components/flightSimulatorUtils.js` does not exist.

- [ ] **Step 3: Add the minimal helper implementation**

Create `src/Components/flightSimulatorUtils.js`:

```javascript
export const ROTATION_SPEED = 120;
export const TILT_FULL_SCALE_DEG = 25;
export const TILT_DEADBAND_DEG = 2;

export function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

export function createOrientationNeutral(reading) {
  return {
    beta: Number(reading?.beta) || 0,
    gamma: Number(reading?.gamma) || 0,
  };
}

function normalizeTilt(deltaDeg) {
  if (Math.abs(deltaDeg) <= TILT_DEADBAND_DEG) return 0;
  const adjusted = deltaDeg > 0
    ? deltaDeg - TILT_DEADBAND_DEG
    : deltaDeg + TILT_DEADBAND_DEG;
  return clamp(adjusted / (TILT_FULL_SCALE_DEG - TILT_DEADBAND_DEG), -1, 1);
}

export function mapOrientationToStick(reading, neutral) {
  const beta = Number(reading?.beta) || 0;
  const gamma = Number(reading?.gamma) || 0;
  const neutralBeta = Number(neutral?.beta) || 0;
  const neutralGamma = Number(neutral?.gamma) || 0;

  return {
    stickX: normalizeTilt(gamma - neutralGamma),
    stickY: normalizeTilt(beta - neutralBeta),
  };
}

export function shouldTriggerRotationPrompt({ previousIas, currentIas, alreadyShown }) {
  return !alreadyShown && previousIas < ROTATION_SPEED && currentIas >= ROTATION_SPEED;
}
```

- [ ] **Step 4: Import shared constants into `TelemetryDemo.js`**

In `src/Components/TelemetryDemo.js`, replace the local `clamp` function and `STALL_SPEED` value with imports while preserving existing behavior:

```javascript
import {
  ROTATION_SPEED,
  clamp,
} from './flightSimulatorUtils';
```

Then replace:

```javascript
const STALL_SPEED    = 120;
```

with:

```javascript
const STALL_SPEED = ROTATION_SPEED;
```

Delete the local `function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }` line.

- [ ] **Step 5: Run tests for the helper and existing telemetry behavior**

Run:

```bash
npm test -- --watchAll=false src/Components/flightSimulatorUtils.test.js src/Components/Homepage.test.js src/Components/Router.test.js
```

Expected: PASS.

- [ ] **Step 6: Commit helper extraction**

Run:

```bash
git add src/Components/flightSimulatorUtils.js src/Components/flightSimulatorUtils.test.js src/Components/TelemetryDemo.js
git commit -m "test: add flight simulator utility coverage"
```

---

### Task 2: Add Mobile Entry and Full-Screen Overlay Shell

**Files:**
- Create: `src/Components/TelemetryDemo.test.js`
- Modify: `src/Components/TelemetryDemo.js`

- [ ] **Step 1: Write failing render tests for desktop and mobile entry behavior**

Create `src/Components/TelemetryDemo.test.js`:

```javascript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import useMediaQuery from '@mui/material/useMediaQuery';
import TelemetryDemo from './TelemetryDemo';

jest.mock('@mui/material/useMediaQuery');

jest.mock('react-typescript-flight-indicators', () => ({
  AttitudeIndicator: ({ pitch, roll }) => <div data-testid="attitude-indicator">pitch {pitch} roll {roll}</div>,
  Altimeter: ({ altitude }) => <div data-testid="altimeter">alt {altitude}</div>,
  HeadingIndicator: ({ heading }) => <div data-testid="heading-indicator">heading {heading}</div>,
}));

jest.mock('react-gauge-component', () => function MockGaugeComponent({ id, value }) {
  return <div data-testid={id}>value {value}</div>;
});

function renderDesktop() {
  useMediaQuery.mockReturnValue(false);
  return render(<TelemetryDemo />);
}

function renderMobile() {
  useMediaQuery.mockReturnValue(true);
  return render(<TelemetryDemo />);
}

beforeEach(() => {
  jest.useFakeTimers();
  useMediaQuery.mockReset();
});

afterEach(() => {
  jest.useRealTimers();
});

test('renders the inline simulator on desktop', () => {
  renderDesktop();

  expect(screen.getByText(/telemetry live/i)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /click for flight simulator/i })).not.toBeInTheDocument();
});

test('renders only a mobile simulator entry button before launch', () => {
  renderMobile();

  expect(screen.getByRole('button', { name: /click for flight simulator/i })).toBeInTheDocument();
  expect(screen.queryByText(/telemetry live/i)).not.toBeInTheDocument();
});

test('opens and closes the mobile full-screen overlay', () => {
  renderMobile();

  userEvent.click(screen.getByRole('button', { name: /click for flight simulator/i }));

  expect(screen.getByRole('dialog', { name: /flight simulator/i })).toBeInTheDocument();
  expect(document.body).toHaveStyle({ overflow: 'hidden' });

  userEvent.click(screen.getByRole('button', { name: /exit/i }));

  expect(screen.queryByRole('dialog', { name: /flight simulator/i })).not.toBeInTheDocument();
  expect(document.body.style.overflow).toBe('');
});
```

- [ ] **Step 2: Run the new tests and verify they fail**

Run:

```bash
npm test -- --watchAll=false src/Components/TelemetryDemo.test.js
```

Expected: FAIL because mobile still returns the current component behavior or no launchable overlay.

- [ ] **Step 3: Implement mobile entry shell and body scroll lock**

In `src/Components/TelemetryDemo.js`, add mobile overlay state near existing state declarations:

```javascript
const [mobileOpen, setMobileOpen] = useState(false);
```

Add this effect after `const isMobile = useMediaQuery('(max-width:600px)');`:

```javascript
useEffect(() => {
  if (!mobileOpen) return undefined;
  const previousOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  return () => {
    document.body.style.overflow = previousOverflow;
  };
}, [mobileOpen]);
```

Add an early mobile return before the current desktop panel return:

```javascript
if (isMobile && !mobileOpen) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
      <Button
        variant="outlined"
        onClick={() => setMobileOpen(true)}
        sx={{ ...MONO, fontSize: '0.75rem', letterSpacing: 1, color: C.green, borderColor: C.green }}
      >
        Click for flight simulator
      </Button>
    </Box>
  );
}
```

Wrap the existing returned simulator panel in an overlay when `isMobile && mobileOpen`. The simplest first pass is:

```javascript
const panel = (
  <Box sx={{ bgcolor: C.bg, border: `1px solid ${C.dim}`, borderRadius: 2, p: 2, mt: 4, maxWidth: 880, mx: 'auto', position: 'relative' }}>
    {/* existing simulator contents stay here */}
  </Box>
);

if (isMobile && mobileOpen) {
  return (
    <Box
      role="dialog"
      aria-label="Flight simulator"
      sx={{
        position: 'fixed',
        inset: 0,
        zIndex: 1300,
        bgcolor: C.bg,
        color: C.text,
        overflow: 'hidden',
      }}
    >
      <Button
        aria-label="Exit"
        onClick={() => setMobileOpen(false)}
        sx={{ position: 'absolute', top: 8, right: 8, zIndex: 2, color: C.text, borderColor: C.dim }}
        variant="outlined"
      >
        Exit
      </Button>
      {panel}
    </Box>
  );
}

return panel;
```

When moving JSX into `panel`, remove `mt: 4`, `maxWidth: 880`, and border radius for the mobile overlay through conditional styles:

```javascript
mt: isMobile ? 0 : 4,
maxWidth: isMobile ? 'none' : 880,
height: isMobile ? '100svh' : 'auto',
borderRadius: isMobile ? 0 : 2,
overflow: isMobile ? 'hidden' : 'visible',
```

- [ ] **Step 4: Run overlay tests**

Run:

```bash
npm test -- --watchAll=false src/Components/TelemetryDemo.test.js
```

Expected: PASS for desktop inline, mobile entry, and overlay open/close tests.

- [ ] **Step 5: Commit mobile overlay shell**

Run:

```bash
git add src/Components/TelemetryDemo.js src/Components/TelemetryDemo.test.js
git commit -m "feat: add mobile simulator overlay shell"
```

---

### Task 3: Start Mobile Overlay in Manual Mode

**Files:**
- Modify: `src/Components/TelemetryDemo.js`
- Modify: `src/Components/TelemetryDemo.test.js`

- [ ] **Step 1: Add a failing test for manual mode on mobile launch**

Append to `src/Components/TelemetryDemo.test.js`:

```javascript
test('mobile overlay starts in manual control mode', () => {
  renderMobile();

  userEvent.click(screen.getByRole('button', { name: /click for flight simulator/i }));

  expect(screen.queryByRole('button', { name: /click to take control/i })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: /recenter/i })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run:

```bash
npm test -- --watchAll=false src/Components/TelemetryDemo.test.js -t "manual control mode"
```

Expected: FAIL because opening the overlay does not yet force `MODE.INTERACTIVE` or show mobile-only recenter control.

- [ ] **Step 3: Add a mobile launch function that seeds manual flight from the runway**

In `src/Components/TelemetryDemo.js`, add:

```javascript
function openMobileSimulator() {
  controlsRef.current = { stickX: 0, stickY: 0, throttle: 0.05, rudder: 0 };
  setThrottle(0.05);
  setRudder(0);
  setLandingResult(null);
  setRollTimeLeft(30);
  resetPhysics({ ...INIT_PHYSICS });
  prevAltRef.current = INIT_PHYSICS.alt;
  setMode(MODE.INTERACTIVE);
  setMobileOpen(true);
}
```

Change the mobile entry button handler from:

```javascript
onClick={() => setMobileOpen(true)}
```

to:

```javascript
onClick={openMobileSimulator}
```

Inside the mobile overlay, add a Recenter button next to Exit for now:

```javascript
<Button
  aria-label="Recenter"
  onClick={() => {}}
  sx={{ position: 'absolute', top: 8, left: 8, zIndex: 2, color: C.text, borderColor: C.dim }}
  variant="outlined"
>
  Recenter
</Button>
```

The handler becomes real in Task 4.

- [ ] **Step 4: Run the manual mode test**

Run:

```bash
npm test -- --watchAll=false src/Components/TelemetryDemo.test.js -t "manual control mode"
```

Expected: PASS.

- [ ] **Step 5: Run the full TelemetryDemo test file**

Run:

```bash
npm test -- --watchAll=false src/Components/TelemetryDemo.test.js
```

Expected: PASS.

- [ ] **Step 6: Commit mobile manual launch**

Run:

```bash
git add src/Components/TelemetryDemo.js src/Components/TelemetryDemo.test.js
git commit -m "feat: start mobile simulator in manual mode"
```

---

### Task 4: Add Device Orientation Control and Recenter

**Files:**
- Modify: `src/Components/TelemetryDemo.js`
- Modify: `src/Components/TelemetryDemo.test.js`

- [ ] **Step 1: Add failing tests for orientation support message and recenter control**

Append to `src/Components/TelemetryDemo.test.js`:

```javascript
test('shows orientation enable control when DeviceOrientationEvent permission is requestable', async () => {
  const requestPermission = jest.fn().mockResolvedValue('granted');
  window.DeviceOrientationEvent = function DeviceOrientationEvent() {};
  window.DeviceOrientationEvent.requestPermission = requestPermission;

  renderMobile();
  userEvent.click(screen.getByRole('button', { name: /click for flight simulator/i }));

  userEvent.click(screen.getByRole('button', { name: /enable tilt control/i }));

  await waitFor(() => expect(requestPermission).toHaveBeenCalledTimes(1));
});

test('shows a tilt unavailable message when orientation is unsupported', () => {
  delete window.DeviceOrientationEvent;

  renderMobile();
  userEvent.click(screen.getByRole('button', { name: /click for flight simulator/i }));

  expect(screen.getByText(/tilt control unavailable/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the orientation tests and verify they fail**

Run:

```bash
npm test -- --watchAll=false src/Components/TelemetryDemo.test.js -t "orientation|tilt"
```

Expected: FAIL because the overlay has no orientation permission UI.

- [ ] **Step 3: Wire orientation state and permission handling**

Update imports in `src/Components/TelemetryDemo.js`:

```javascript
import {
  ROTATION_SPEED,
  clamp,
  createOrientationNeutral,
  mapOrientationToStick,
} from './flightSimulatorUtils';
```

Add state and refs near other state:

```javascript
const [tiltStatus, setTiltStatus] = useState('idle'); // idle | enabled | unavailable | denied
const orientationNeutralRef = useRef(null);
const latestOrientationRef = useRef(null);
```

Add these functions:

```javascript
function applyOrientation(reading) {
  latestOrientationRef.current = reading;
  if (!orientationNeutralRef.current) {
    orientationNeutralRef.current = createOrientationNeutral(reading);
  }
  const { stickX, stickY } = mapOrientationToStick(reading, orientationNeutralRef.current);
  controlsRef.current.stickX = stickX;
  controlsRef.current.stickY = stickY;
}

function recenterTilt() {
  if (!latestOrientationRef.current) {
    orientationNeutralRef.current = null;
    return;
  }
  orientationNeutralRef.current = createOrientationNeutral(latestOrientationRef.current);
  controlsRef.current.stickX = 0;
  controlsRef.current.stickY = 0;
}

async function enableTiltControl() {
  if (typeof window.DeviceOrientationEvent === 'undefined') {
    setTiltStatus('unavailable');
    return;
  }

  const permissionApi = window.DeviceOrientationEvent.requestPermission;
  if (typeof permissionApi === 'function') {
    const result = await permissionApi();
    if (result !== 'granted') {
      setTiltStatus('denied');
      return;
    }
  }

  setTiltStatus('enabled');
}
```

Add an effect:

```javascript
useEffect(() => {
  if (!isMobile || !mobileOpen) return undefined;
  if (typeof window.DeviceOrientationEvent === 'undefined') {
    setTiltStatus('unavailable');
    return undefined;
  }
  if (typeof window.DeviceOrientationEvent.requestPermission === 'function' && tiltStatus !== 'enabled') {
    setTiltStatus('idle');
    return undefined;
  }
  setTiltStatus('enabled');
  function onDeviceOrientation(event) {
    applyOrientation({ beta: event.beta, gamma: event.gamma });
  }
  window.addEventListener('deviceorientation', onDeviceOrientation);
  return () => window.removeEventListener('deviceorientation', onDeviceOrientation);
}, [isMobile, mobileOpen, tiltStatus]); // eslint-disable-line react-hooks/exhaustive-deps
```

Replace the temporary Recenter handler:

```javascript
onClick={recenterTilt}
```

Add status UI inside the mobile overlay below the top buttons:

```javascript
{isMobile && mobileOpen && tiltStatus === 'idle' && (
  <Button
    variant="outlined"
    onClick={enableTiltControl}
    sx={{ position: 'absolute', top: 52, left: 8, zIndex: 2, color: C.green, borderColor: C.green, ...MONO, fontSize: '0.65rem' }}
  >
    Enable tilt control
  </Button>
)}
{isMobile && mobileOpen && tiltStatus === 'unavailable' && (
  <Typography sx={{ position: 'absolute', top: 58, left: 8, right: 8, zIndex: 2, color: C.amber, ...MONO, fontSize: '0.7rem', textAlign: 'center' }}>
    Tilt control unavailable. Use touch controls.
  </Typography>
)}
{isMobile && mobileOpen && tiltStatus === 'denied' && (
  <Typography sx={{ position: 'absolute', top: 58, left: 8, right: 8, zIndex: 2, color: C.amber, ...MONO, fontSize: '0.7rem', textAlign: 'center' }}>
    Tilt control denied. Use touch controls.
  </Typography>
)}
```

- [ ] **Step 4: Run orientation tests**

Run:

```bash
npm test -- --watchAll=false src/Components/TelemetryDemo.test.js -t "orientation|tilt"
```

Expected: PASS.

- [ ] **Step 5: Add and pass an integration test for deviceorientation events**

Append:

```javascript
test('recenter button recalibrates the current orientation', () => {
  window.DeviceOrientationEvent = function DeviceOrientationEvent() {};

  renderMobile();
  userEvent.click(screen.getByRole('button', { name: /click for flight simulator/i }));

  window.dispatchEvent(new Event('deviceorientation'));
  userEvent.click(screen.getByRole('button', { name: /recenter/i }));

  expect(screen.getByRole('button', { name: /recenter/i })).toBeInTheDocument();
});
```

Run:

```bash
npm test -- --watchAll=false src/Components/TelemetryDemo.test.js -t "recenter"
```

Expected: PASS.

- [ ] **Step 6: Commit orientation controls**

Run:

```bash
git add src/Components/TelemetryDemo.js src/Components/TelemetryDemo.test.js
git commit -m "feat: control mobile simulator with device tilt"
```

---

### Task 5: Add Labeled Mobile Throttle and Pedal Sliders

**Files:**
- Modify: `src/Components/TelemetryDemo.js`
- Modify: `src/Components/TelemetryDemo.test.js`

- [ ] **Step 1: Add failing tests for mobile control labels and interactions**

Append to `src/Components/TelemetryDemo.test.js`:

```javascript
test('mobile overlay shows labeled throttle and pedal controls', () => {
  renderMobile();

  userEvent.click(screen.getByRole('button', { name: /click for flight simulator/i }));

  expect(screen.getByText(/throttle/i)).toBeInTheDocument();
  expect(screen.getByText(/pedals/i)).toBeInTheDocument();
  expect(screen.getByRole('slider', { name: /throttle/i })).toBeInTheDocument();
  expect(screen.getByRole('slider', { name: /pedals/i })).toBeInTheDocument();
});

test('mobile pedal slider returns to center on release', () => {
  renderMobile();

  userEvent.click(screen.getByRole('button', { name: /click for flight simulator/i }));
  const pedals = screen.getByRole('slider', { name: /pedals/i });

  userEvent.keyboard('{Tab}');
  pedals.focus();
  userEvent.keyboard('{ArrowRight}');
  expect(pedals).toHaveAttribute('aria-valuenow', '1');

  userEvent.tab();
  expect(pedals).toHaveAttribute('aria-valuenow', '0');
});
```

- [ ] **Step 2: Run the mobile controls tests and verify they fail**

Run:

```bash
npm test -- --watchAll=false src/Components/TelemetryDemo.test.js -t "throttle|pedal"
```

Expected: FAIL because mobile sliders do not exist yet.

- [ ] **Step 3: Add mobile slider components inside `TelemetryDemo.js`**

Add internal components near `ThrottleControl`:

```javascript
function MobileThrottleSlider({ value, onChange }) {
  return (
    <Box sx={{ position: 'absolute', left: 8, top: 104, bottom: 24, width: 52, display: 'flex', alignItems: 'center', flexDirection: 'column', gap: 1, zIndex: 2 }}>
      <Typography sx={{ color: C.text, ...MONO, fontSize: '0.65rem', letterSpacing: 1 }}>
        Throttle
      </Typography>
      <input
        aria-label="Throttle"
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{
          writingMode: 'vertical-lr',
          direction: 'rtl',
          width: 36,
          flex: 1,
          accentColor: C.green,
        }}
      />
    </Box>
  );
}

function MobilePedalSlider({ value, onChange }) {
  function center() {
    onChange(0);
  }

  return (
    <Box sx={{ position: 'absolute', right: 8, top: 104, bottom: 24, width: 68, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 1, zIndex: 2 }}>
      <Typography sx={{ color: C.text, ...MONO, fontSize: '0.65rem', letterSpacing: 1 }}>
        Pedals
      </Typography>
      <input
        aria-label="Pedals"
        type="range"
        min="-1"
        max="1"
        step="1"
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        onMouseUp={center}
        onTouchEnd={center}
        onBlur={center}
        style={{
          width: 64,
          accentColor: C.green,
        }}
      />
    </Box>
  );
}
```

Add a mobile rudder handler near `handleThrottleChange`:

```javascript
function handleRudderChange(val) {
  controlsRef.current.rudder = val;
  setRudder(val);
}
```

Render the controls inside the mobile overlay:

```javascript
<MobileThrottleSlider value={throttle} onChange={handleThrottleChange} />
<MobilePedalSlider value={rudder} onChange={handleRudderChange} />
```

Place them as children of the fixed overlay, not inside the instrument grid, so they remain pinned to the sides.

- [ ] **Step 4: Run mobile control tests**

Run:

```bash
npm test -- --watchAll=false src/Components/TelemetryDemo.test.js -t "throttle|pedal"
```

Expected: PASS.

- [ ] **Step 5: Run the full TelemetryDemo test file**

Run:

```bash
npm test -- --watchAll=false src/Components/TelemetryDemo.test.js
```

Expected: PASS.

- [ ] **Step 6: Commit labeled mobile controls**

Run:

```bash
git add src/Components/TelemetryDemo.js src/Components/TelemetryDemo.test.js
git commit -m "feat: add labeled mobile flight controls"
```

---

### Task 6: Add Mobile Takeoff Prompts

**Files:**
- Modify: `src/Components/TelemetryDemo.js`
- Modify: `src/Components/TelemetryDemo.test.js`

- [ ] **Step 1: Add failing prompt tests**

Append to `src/Components/TelemetryDemo.test.js`:

```javascript
test('shows initial takeoff prompt briefly when mobile overlay opens', () => {
  renderMobile();

  userEvent.click(screen.getByRole('button', { name: /click for flight simulator/i }));

  expect(screen.getByText(/accelerate to rotation speed/i)).toBeInTheDocument();

  jest.advanceTimersByTime(2500);

  expect(screen.queryByText(/accelerate to rotation speed/i)).not.toBeInTheDocument();
});
```

The `Tilt back to liftoff` prompt depends on live physics reaching `ROTATION_SPEED`; cover its pure trigger in `flightSimulatorUtils.test.js` from Task 1 and manually verify it in Task 8. Do not overfit component tests to interval timing.

- [ ] **Step 2: Run the prompt test and verify it fails**

Run:

```bash
npm test -- --watchAll=false src/Components/TelemetryDemo.test.js -t "initial takeoff prompt"
```

Expected: FAIL because no mobile prompt UI exists.

- [ ] **Step 3: Implement prompt state and timed clearing**

In `src/Components/TelemetryDemo.js`, import:

```javascript
import {
  ROTATION_SPEED,
  clamp,
  createOrientationNeutral,
  mapOrientationToStick,
  shouldTriggerRotationPrompt,
} from './flightSimulatorUtils';
```

Add state and refs:

```javascript
const [mobilePrompt, setMobilePrompt] = useState(null);
const rotationPromptShownRef = useRef(false);
const previousIasRef = useRef(INIT_PHYSICS.ias);
const mobilePromptTimeoutRef = useRef(null);
```

Add helper:

```javascript
function showMobilePrompt(message) {
  setMobilePrompt(message);
  window.clearTimeout(mobilePromptTimeoutRef.current);
  mobilePromptTimeoutRef.current = window.setTimeout(() => setMobilePrompt(null), 2200);
}
```

In `openMobileSimulator`, reset prompt state:

```javascript
rotationPromptShownRef.current = false;
previousIasRef.current = INIT_PHYSICS.ias;
showMobilePrompt('Accelerate to rotation speed');
```

Add an effect:

```javascript
useEffect(() => {
  if (!isMobile || !mobileOpen || mode !== MODE.INTERACTIVE) return;
  if (shouldTriggerRotationPrompt({
    previousIas: previousIasRef.current,
    currentIas: physState.ias,
    alreadyShown: rotationPromptShownRef.current,
  })) {
    rotationPromptShownRef.current = true;
    showMobilePrompt('Tilt back to liftoff');
  }
  previousIasRef.current = physState.ias;
}, [isMobile, mobileOpen, mode, physState.ias]); // eslint-disable-line react-hooks/exhaustive-deps
```

Render inside the mobile overlay:

```javascript
{mobilePrompt && (
  <Box sx={{
    position: 'absolute',
    left: 72,
    right: 84,
    top: '45%',
    zIndex: 3,
    textAlign: 'center',
    pointerEvents: 'none',
  }}>
    <Typography sx={{
      display: 'inline-block',
      px: 2,
      py: 1,
      color: C.green,
      bgcolor: 'rgba(8, 12, 18, 0.86)',
      border: `1px solid ${C.green}`,
      borderRadius: 1,
      ...MONO,
      fontSize: '0.9rem',
      letterSpacing: 1,
      textTransform: 'uppercase',
    }}>
      {mobilePrompt}
    </Typography>
  </Box>
)}
```

- [ ] **Step 4: Run prompt tests**

Run:

```bash
npm test -- --watchAll=false src/Components/TelemetryDemo.test.js -t "prompt"
```

Expected: PASS.

- [ ] **Step 5: Run helper tests for rotation trigger**

Run:

```bash
npm test -- --watchAll=false src/Components/flightSimulatorUtils.test.js
```

Expected: PASS.

- [ ] **Step 6: Commit mobile prompts**

Run:

```bash
git add src/Components/TelemetryDemo.js src/Components/TelemetryDemo.test.js src/Components/flightSimulatorUtils.js src/Components/flightSimulatorUtils.test.js
git commit -m "feat: add mobile simulator takeoff prompts"
```

---

### Task 7: Fit Instruments Into Mobile Overlay

**Files:**
- Modify: `src/Components/TelemetryDemo.js`
- Modify: `src/Components/TelemetryDemo.test.js`

- [ ] **Step 1: Add a test that mobile overlay renders the critical instruments**

Append to `src/Components/TelemetryDemo.test.js`:

```javascript
test('mobile overlay keeps critical instruments visible', () => {
  renderMobile();

  userEvent.click(screen.getByRole('button', { name: /click for flight simulator/i }));

  expect(screen.getByTestId('attitude-indicator')).toBeInTheDocument();
  expect(screen.getByTestId('heading-indicator')).toBeInTheDocument();
  expect(screen.getByTestId('altimeter')).toBeInTheDocument();
  expect(screen.getByTestId('gauge-ias')).toBeInTheDocument();
  expect(screen.getByTestId('gauge-g')).toBeInTheDocument();
  expect(screen.getByTestId('gauge-beta')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the instrument visibility test**

Run:

```bash
npm test -- --watchAll=false src/Components/TelemetryDemo.test.js -t "critical instruments"
```

Expected: PASS if the overlay still includes current instruments. If it fails, fix missing render before resizing.

- [ ] **Step 3: Add mobile sizing constants and conditional styles**

Inside `TelemetryDemo.js`, define:

```javascript
const attitudeSize = isMobile ? 'min(48vw, 34svh, 210px)' : '260px';
const secondaryInstrumentSize = isMobile ? 'min(25vw, 96px)' : '160px';
const gaugeWidth = isMobile ? 'min(25vw, 96px)' : 160;
```

Use the constants in existing instrument JSX:

```javascript
style={{ width: gaugeWidth }}
```

```javascript
<AttitudeIndicator pitch={state.pitch} roll={state.roll} size={attitudeSize} showBox />
<HeadingIndicator heading={state.heading} size={secondaryInstrumentSize} showBox />
<Altimeter altitude={state.alt} size={secondaryInstrumentSize} showBox />
```

Adjust the instrument panel container:

```javascript
<Box sx={{
  display: 'grid',
  gridTemplateColumns: isMobile ? 'minmax(68px, 1fr) minmax(130px, 1.5fr) minmax(68px, 1fr)' : 'none',
  ...(isMobile
    ? { gap: 1, alignItems: 'start', px: '70px', pt: 10, height: 'calc(100svh - 24px)', overflow: 'hidden' }
    : { display: 'flex', gap: 2, justifyContent: 'center', alignItems: 'flex-start', flexWrap: 'wrap' }),
}}>
```

For left and right stacks, reduce widths on mobile:

```javascript
sx={{ minWidth: isMobile ? 0 : 160, gap: isMobile ? 0.5 : 0 }}
```

Hide the rudder strip chart inside the mobile overlay because the right-side pedal control and sideslip gauge cover the mobile need:

```javascript
{!isMobile && (
  <Box sx={{ mt: 2 }}>
    <RudderStripChart value={rudder} />
    ...
  </Box>
)}
```

- [ ] **Step 4: Run the TelemetryDemo tests**

Run:

```bash
npm test -- --watchAll=false src/Components/TelemetryDemo.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit mobile instrument layout**

Run:

```bash
git add src/Components/TelemetryDemo.js src/Components/TelemetryDemo.test.js
git commit -m "feat: fit simulator instruments on mobile"
```

---

### Task 8: Full Verification and Manual QA

**Files:**
- Modify only if verification exposes defects.

- [ ] **Step 1: Run focused test suite**

Run:

```bash
npm test -- --watchAll=false src/Components/flightSimulatorUtils.test.js src/Components/TelemetryDemo.test.js src/Components/Homepage.test.js src/Components/Router.test.js
```

Expected: PASS.

- [ ] **Step 2: Run production build**

Run:

```bash
npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 3: Start local dev server**

Run:

```bash
npm start
```

Expected: React dev server starts and serves the app, usually at `http://localhost:3000`.

- [ ] **Step 4: Manual desktop verification**

Open `http://localhost:3000` at a desktop viewport.

Expected:

- The homepage still renders the inline telemetry demo.
- `Click for flight simulator` is not visible on desktop.
- Existing desktop autopilot/manual controls still work.
- No new mobile-only controls appear on desktop.

- [ ] **Step 5: Manual mobile viewport verification**

Open `http://localhost:3000` in a narrow mobile viewport around `390 x 844`.

Expected:

- The homepage shows `Click for flight simulator` instead of the inline panel.
- Tapping it opens a full-screen overlay.
- Exit closes the overlay.
- `Accelerate to rotation speed` appears briefly on load.
- The simulator starts in manual mode.
- `Throttle` and `Pedals` labels are visible.
- Throttle slider is on the left and stays where released.
- Pedal slider is on the right and returns to center after release.
- Recenter is reachable.
- Instruments do not overlap controls.

- [ ] **Step 6: Manual tilt verification on a real phone**

Serve the app to a phone or use the deployed branch preview if available.

Expected:

- If the browser requires permission, `Enable tilt control` appears.
- After permission, the current phone position acts as neutral.
- Tilting toward the user pulls back.
- Tilting away pushes forward.
- Tilting left moves the stick left.
- Tilting right moves the stick right.
- Recenter resets the current phone position to neutral.
- Reaching Vr shows `Tilt back to liftoff` briefly.

- [ ] **Step 7: Commit any verification fixes**

If manual QA required changes, run:

```bash
git add src/Components/TelemetryDemo.js src/Components/TelemetryDemo.test.js src/Components/flightSimulatorUtils.js src/Components/flightSimulatorUtils.test.js
git commit -m "fix: polish mobile simulator verification issues"
```

If no changes were needed, do not create a commit.

---

## Self-Review

Spec coverage:

- Mobile entry button: Task 2.
- Full-screen overlay with exit and scroll lock: Task 2.
- Manual default mode: Task 3.
- Tilt stick control and recenter: Task 4.
- Throttle and pedal sliders with labels: Task 5.
- Momentary user prompts: Task 6.
- Mobile instrument layout: Task 7.
- Fallback when tilt is unavailable or denied: Task 4.
- Verification: Task 8.

No planned step adds routing, backend services, analytics, or new flight physics. The plan keeps the physics loop in `TelemetryDemo` and extracts only pure utility helpers needed for reliable tests.
