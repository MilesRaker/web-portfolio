# Values Spiderweb Design

## Goal

Replace the current Values accordion page with an interactive spiderweb-style chart that presents Miles Raker's six values around the rocket logo.

## Branch

Use branch `codex/values-spiderweb-chart` for the implementation work.

## Current State

`src/Components/Values.js` currently renders six Material UI accordions. `src/Components/Values.css` provides simple spacing and label styles. There is no dedicated `Values.test.js` yet.

The six value names stay unchanged:

- Authentic
- Curious
- Kind
- Loyal
- Playful
- Self-confident

## Definition Copy

- Authentic: Staying grounded in who I am and what I believe.
- Curious: Staying open, asking questions, and learning quickly.
- Kind: Treating people with patience, generosity, and respect.
- Loyal: Showing up for the team, especially when it matters.
- Playful: Bringing energy, humor, and creativity into the work.
- Self-confident: Trusting that I can learn what the mission requires.

## Layout

The page keeps the `Values` route and replaces the accordion UI with a centered web visualization.

The rocket logo appears in the center. Six spokes radiate from the rocket to value nodes. The values are placed at different distances from the center so the layout feels organic rather than like a uniform radar chart. The leftmost node is `Authentic`, and the remaining values are ordered clockwise:

1. Authentic
2. Curious
3. Kind
4. Loyal
5. Playful
6. Self-confident

Each value is displayed in a circular node. In the default state, each node shows only the value name.

## Interaction

Hovering a value node brings it into focus by increasing its visual prominence and reducing emphasis on inactive nodes. The hover state must not shift surrounding layout.

Clicking a value node toggles its expanded state. An expanded node grows enough to show the value definition in addition to the name. Clicking a different node moves the expanded state to that node. Clicking the active node collapses it.

Each node is keyboard-focusable and can be toggled with normal button behavior. Focus styles should be visible.

## Load Animation

The load animation runs once when the Values page mounts.

1. The rocket logo is visible immediately on page load.
2. The rocket spins by itself for `0.5s`.
3. At `0.5s`, the rocket continues spinning and the leftmost spoke begins drawing from the center outward.
4. Each next spoke starts `0.333s` after the previous spoke started.
5. Each spoke takes `1s` to draw.
6. When a spoke finishes drawing, its value circle spawns from a point and expands to its resting size.
7. After the final circle finishes expanding, the rocket stops spinning.

The first spoke is the leftmost spoke for `Authentic`. Spokes are drawn clockwise in the value order listed above.

Users with reduced-motion preferences should see the completed static layout without the timed draw sequence.

## Rocket Toggle Animation

After the initial load animation completes, the center rocket becomes an interactive toggle for collapsing and expanding the web.

Clicking the rocket while the web is expanded starts the collapse sequence:

1. The rocket starts spinning again.
2. Value circles collapse to a point in the same order used for drawing: leftmost first, then clockwise.
3. Each value circle starts collapsing `0.333s` after the previous value circle starts.
4. Once a value circle finishes collapsing, its related spoke collapses back toward the center.
5. After all value circles and all related spokes are gone, the rocket stops spinning.

Clicking the rocket again while the web is collapsed replays the same expansion animation used on page load: rocket visible and spinning, then spokes draw from the center outward, then each value circle spawns after its spoke finishes. The rocket stops after the final value circle finishes expanding.

The rocket should ignore additional toggle clicks while a collapse or expansion animation is already running, so the animation state cannot get out of sync.

## Responsive Behavior

On desktop and tablet widths, the radial spiderweb remains the primary layout. Node radii, node sizes, and font sizes scale through CSS custom properties and media queries.

On narrow mobile widths, the web still presents as a radial visualization, but spacing tightens and expanded definitions may appear in a centered readable panel below the web if the active node would become too cramped.

## Implementation Shape

Use a CSS-positioned layout rather than a charting library. Store value metadata in an array in `Values.js`, including name, definition, angle, radius, and animation order.

Render spokes as positioned elements whose width animates from `0` to the node radius. Render nodes as buttons positioned from the same metadata. The center rocket uses the existing logo asset.

`Values.css` owns the geometry, animation keyframes, responsive sizing, hover/focus states, and reduced-motion behavior.

## Testing

Add a dedicated `src/Components/Values.test.js`.

Test coverage should verify:

- All six value names render.
- Definitions are not shown before a node is expanded.
- Clicking a value shows its definition.
- Clicking the active value collapses its definition.
- Clicking another value moves the expanded definition.

Run the Values test and the production build before considering implementation complete.
