# Mobile Flight Simulator Design

## Goal

Make the telemetry demo usable and compelling on mobile by replacing the cramped inline panel with a dedicated full-screen simulator experience. The mobile version should feel immediate: tap the entry link, enter manual control, and fly using phone tilt plus touch controls.

## Entry Behavior

On desktop and larger tablet layouts, keep the current inline telemetry demo behavior.

On mobile layouts, do not render the full simulator inline on the homepage. Render a compact entry control labeled `Click for flight simulator`. Activating it opens a fixed full-screen overlay above the current page.

The overlay includes an exit button that closes the simulator and returns the user to the homepage position underneath. The page behind the overlay should not scroll while the overlay is open.

## Mobile Overlay Mode

The mobile overlay loads directly into manual control mode. It should not require the user to switch from autopilot before controlling the aircraft.

If browser or platform rules require motion/orientation permission, the overlay should show an enable/start control before tilt control begins. Once orientation input is available, the simulator calibrates the current phone position as neutral. A visible `Recenter` control recalibrates the neutral point at any time.

## Controls

Phone tilt controls the stick:

- Neutral calibrated phone position maps to centered stick.
- Tilting the top of the phone toward the user pulls the stick back.
- Tilting the top of the phone away from the user pushes the stick forward.
- Tilting the phone left moves the stick left.
- Tilting the phone right moves the stick right.

The tilt mapping should clamp to the existing `-1` to `1` control range for `stickX` and `stickY`. It should include a small deadband around neutral so the aircraft is not twitchy while the user is trying to hold level.

The mobile overlay also includes two touch controls:

- A vertical throttle slider on the left side with a visible `Throttle` label. Bottom is idle or low throttle, top is full throttle. The value remains where the user leaves it.
- A horizontal pedal/rudder slider on the right side with a visible `Pedals` label. Center is neutral, left is left pedal/rudder, and right is right pedal/rudder. The control should return to center when released.

These controls write to the existing flight control state used by the physics loop: `throttle`, `rudder`, `stickX`, and `stickY`.

## User Prompts

The mobile overlay should provide brief, state-based text prompts to help first-time users understand takeoff without adding persistent instruction clutter.

On first load in manual mode, `Accelerate to rotation speed` appears momentarily across the simulator. It should be visually prominent, then fade or clear automatically.

Once the aircraft reaches rotation speed, `Tilt back to liftoff` appears momentarily across the simulator. This prompt should trigger once per mobile simulator session when indicated airspeed first reaches `Vr`. Use the existing stall/rotation threshold from the physics model unless implementation reveals a clearer named rotation-speed constant is needed.

Prompts should not block controls, should not require dismissal, and should not stack over each other.

## Instrument Layout

The mobile layout should prioritize the attitude indicator as the primary visual. Airspeed, altitude, heading, G-load, sideslip, phase, and warning state remain visible in a compact arrangement sized to the viewport.

The layout should use stable responsive constraints so indicators and controls do not overlap on narrow mobile screens. Desktop-only mode buttons and pointer-based stick controls should be hidden inside the mobile overlay.

## Fallbacks

If device orientation is unavailable, denied, or unsupported, the overlay should not fail silently. It should explain that tilt control is unavailable and provide a touch stick fallback or an equivalent manual control so the simulator remains usable.

Throttle and pedal controls should still work even when tilt control is unavailable.

## Scope

Implement this within the existing React/MUI telemetry demo structure. Prefer reusing the current flight physics and instrument rendering logic. Extract small helper functions or subcomponents when they make the mobile behavior easier to test and maintain.

Do not add routing, backend services, analytics, or new flight physics features as part of this change.

## Verification

Automated tests should cover:

- Mobile renders the `Click for flight simulator` entry control instead of the inline simulator.
- Desktop continues rendering the inline simulator.
- Opening and closing the mobile overlay works.
- Mobile starts in manual control mode.
- Orientation events map to `stickX` and `stickY` with calibration, clamping, and deadband behavior.
- The throttle slider writes persistent throttle values.
- The throttle and pedal sliders have visible labels.
- The pedal slider writes rudder values and returns to center on release.
- The initial `Accelerate to rotation speed` prompt appears briefly on mobile overlay load.
- The `Tilt back to liftoff` prompt appears briefly when the aircraft first reaches `Vr`.

Manual verification should include at least one narrow mobile viewport and one desktop viewport. On mobile, confirm the overlay fills the screen, the exit and recenter controls are reachable, instruments are readable, and controls do not overlap.
