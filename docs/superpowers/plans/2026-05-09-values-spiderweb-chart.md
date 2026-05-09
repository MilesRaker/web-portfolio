# Values Spiderweb Chart Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Values accordion with an animated, interactive rocket-centered spiderweb chart.

**Architecture:** `Values.js` owns value metadata, active/hover state, and the web animation phase, then renders a CSS-positioned web from that data. `Values.css` owns geometry, responsive layout, page-load expansion, rocket-triggered collapse/expansion, hover/focus states, and reduced-motion behavior.

**Tech Stack:** React 18, Create React App, Material UI Typography, CSS custom properties, React Testing Library.

---

## File Structure

- Modify: `src/Components/Values.js` - replace accordion markup with metadata-driven web rendering and click/hover state.
- Modify: `src/Components/Values.css` - replace accordion styles with web layout, animations, rocket-toggle animations, responsive rules, and reduced-motion rules.
- Create: `src/Components/Values.test.js` - cover rendering, value click-toggle behavior, and rocket collapse/expand behavior.
- Keep: `docs/superpowers/specs/2026-05-09-values-spiderweb-design.md` - approved design source.

### Task 1: Values Interaction Tests

**Files:**
- Create: `src/Components/Values.test.js`

- [ ] **Step 1: Write the failing tests**

```javascript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Values from './Values';

const definitions = {
  Authentic: 'Staying grounded in who I am and what I believe.',
  Curious: 'Staying open, asking questions, and learning quickly.',
  Kind: 'Treating people with patience, generosity, and respect.',
  Loyal: 'Showing up for the team, especially when it matters.',
  Playful: 'Bringing energy, humor, and creativity into the work.',
  'Self-confident': 'Trusting that I can learn what the mission requires.',
};

test('renders all value names', () => {
  render(<Values />);

  Object.keys(definitions).forEach(name => {
    expect(screen.getByRole('button', { name })).toBeInTheDocument();
  });
});

test('hides definitions before a value is expanded', () => {
  render(<Values />);

  Object.values(definitions).forEach(definition => {
    expect(screen.queryByText(definition)).not.toBeInTheDocument();
  });
});

test('clicking a value expands and collapses its definition', async () => {
  render(<Values />);

  const authentic = screen.getByRole('button', { name: 'Authentic' });
  await userEvent.click(authentic);
  expect(screen.getByText(definitions.Authentic)).toBeInTheDocument();
  expect(authentic).toHaveAttribute('aria-expanded', 'true');

  await userEvent.click(authentic);
  expect(screen.queryByText(definitions.Authentic)).not.toBeInTheDocument();
  expect(authentic).toHaveAttribute('aria-expanded', 'false');
});

test('clicking another value moves the expanded definition', async () => {
  render(<Values />);

  await userEvent.click(screen.getByRole('button', { name: 'Authentic' }));
  await userEvent.click(screen.getByRole('button', { name: 'Curious' }));

  expect(screen.queryByText(definitions.Authentic)).not.toBeInTheDocument();
  expect(screen.getByText(definitions.Curious)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- --watchAll=false --runTestsByPath src/Components/Values.test.js`

Expected: FAIL because `Values.test.js` does not exist or the current accordion implementation does not provide the expected button-only spiderweb behavior.

### Task 2: Values Component

**Files:**
- Modify: `src/Components/Values.js`

- [ ] **Step 1: Replace accordion implementation**

Implement:

```javascript
import { Typography } from '@mui/material';
import React, { useState } from 'react';
import './Values.css';

const VALUES = [
  { name: 'Authentic', definition: 'Staying grounded in who I am and what I believe.', angle: 180, radius: 260 },
  { name: 'Curious', definition: 'Staying open, asking questions, and learning quickly.', angle: 238, radius: 215 },
  { name: 'Kind', definition: 'Treating people with patience, generosity, and respect.', angle: 300, radius: 285 },
  { name: 'Loyal', definition: 'Showing up for the team, especially when it matters.', angle: 18, radius: 235 },
  { name: 'Playful', definition: 'Bringing energy, humor, and creativity into the work.', angle: 72, radius: 300 },
  { name: 'Self-confident', definition: 'Trusting that I can learn what the mission requires.', angle: 126, radius: 245 },
];

const SPOKE_START_DELAY = 0.5;
const SPOKE_STAGGER = 0.333;
const SPOKE_DURATION = 1;

export default function Values() {
  const [activeValue, setActiveValue] = useState(null);
  const [focusedValue, setFocusedValue] = useState(null);

  function toggleValue(name) {
    setActiveValue(current => (current === name ? null : name));
  }

  return (
    <main className="valuesContainer">
      <Typography variant="h2" className="valuesHeading">Values</Typography>

      <section className="valuesWeb" aria-label="Personal values spiderweb chart">
        <div className="valuesRocketBadge" aria-hidden="true">
          <img className="valuesRocketIcon" src={`${process.env.PUBLIC_URL}/RocketIcon.ico`} alt="" />
        </div>

        {VALUES.map((value, index) => {
          const spokeDelay = SPOKE_START_DELAY + index * SPOKE_STAGGER;
          const nodeDelay = spokeDelay + SPOKE_DURATION;
          const isActive = activeValue === value.name;
          const isDimmed = Boolean(focusedValue && focusedValue !== value.name && !isActive);

          return (
            <React.Fragment key={value.name}>
              <span
                className="valueSpoke"
                style={{
                  '--angle': `${value.angle}deg`,
                  '--radius': `${value.radius}px`,
                  '--spoke-delay': `${spokeDelay}s`,
                }}
                aria-hidden="true"
              />
              <span
                className="valueNode"
                style={{
                  '--angle': `${value.angle}deg`,
                  '--radius': `${value.radius}px`,
                  '--node-delay': `${nodeDelay}s`,
                }}
              >
                <button
                  type="button"
                  className={[
                    'valueNodeButton',
                    isActive ? 'isActive' : '',
                    isDimmed ? 'isDimmed' : '',
                  ].filter(Boolean).join(' ')}
                  onClick={() => toggleValue(value.name)}
                  onMouseEnter={() => setFocusedValue(value.name)}
                  onMouseLeave={() => setFocusedValue(null)}
                  onFocus={() => setFocusedValue(value.name)}
                  onBlur={() => setFocusedValue(null)}
                  aria-expanded={isActive}
                >
                  <span className="valueNodeName">{value.name}</span>
                  {isActive && <span className="valueNodeDefinition">{value.definition}</span>}
                </button>
              </span>
            </React.Fragment>
          );
        })}
      </section>
    </main>
  );
}
```

- [ ] **Step 2: Run focused test**

Run: `npm test -- --watchAll=false --runTestsByPath src/Components/Values.test.js`

Expected: tests still fail until CSS classes exist only if the component has syntax errors; otherwise interaction tests pass because CSS is not required for DOM behavior.

### Task 3: Values Styling And Animation

**Files:**
- Modify: `src/Components/Values.css`

- [ ] **Step 1: Replace old accordion CSS**

Implement CSS for:

- `valuesContainer` as a centered page section.
- `valuesWeb` as a fixed-ratio relative canvas.
- `valuesRocketBadge` and `valuesRocketIcon` as centered rocket mark with a finite spin animation lasting `3.515s`.
- `valueSpoke` as a center-origin line that animates from `scaleX(0)` to `scaleX(1)` with delayed starts.
- `valueNode` as a positioned wrapper using the same angle and radius as its spoke.
- `valueNodeButton` as the circle that spawns from a point, focuses on hover/focus, and expands when active.
- `@media (prefers-reduced-motion: reduce)` to show the final layout immediately.

- [ ] **Step 2: Run focused test**

Run: `npm test -- --watchAll=false --runTestsByPath src/Components/Values.test.js`

Expected: PASS.

### Task 4: Full Verification

**Files:**
- Validate: `src/Components/Values.js`
- Validate: `src/Components/Values.css`
- Validate: `src/Components/Values.test.js`

- [ ] **Step 1: Run production build**

Run: `npm run build`

Expected: PASS with `Compiled successfully.`

- [ ] **Step 2: Check git status**

Run: `git status --short`

Expected: modified Values files, new Values test, and the plan file. Existing unstaged `.claude/agents/*.md` deletions may still be present from earlier cleanup and should not be reverted.

### Task 5: Rocket Collapse/Expand Toggle

**Files:**
- Modify: `src/Components/Values.js`
- Modify: `src/Components/Values.css`
- Modify: `src/Components/Values.test.js`

- [ ] **Step 1: Add animation phase state**

Add `webPhase` state in `Values.js` with four values: `expanding`, `expanded`, `collapsing`, and `collapsed`. Initialize to `expanding`, transition to `expanded` after the page-load animation duration, transition to `collapsed` after the collapse duration, and ignore rocket clicks while `expanding` or `collapsing`.

- [ ] **Step 2: Make rocket an accessible button**

Replace the non-interactive center rocket wrapper with a button. Use `aria-label="Collapse values web"` when expanded, `aria-label="Expand values web"` when collapsed, and `aria-label="Values web animation in progress"` while an animation is running.

- [ ] **Step 3: Add collapse CSS**

Add CSS phase classes on `.valuesWeb`:

- `.isExpanding` replays the original page-load sequence.
- `.isExpanded` shows all spokes and value nodes at rest.
- `.isCollapsing` collapses value nodes from leftmost clockwise, then collapses each spoke back to center after its node finishes.
- `.isCollapsed` hides all spokes and nodes.

- [ ] **Step 4: Add rocket toggle tests**

Test that the rocket starts with the animation-in-progress label, changes to `Collapse values web` after the expansion duration, enters the collapsing class when clicked, changes to `Expand values web` after the collapse duration, then enters the expanding class when clicked again.

- [ ] **Step 5: Run verification**

Run:

```bash
npm.cmd test -- --watchAll=false --runTestsByPath src/Components/Values.test.js
npm.cmd run build
```

Expected: focused Values tests pass and the production build completes. Existing unrelated warnings may remain.
