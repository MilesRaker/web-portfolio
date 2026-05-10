# Pre-Production Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prepare the portfolio for production launch by fixing landing-page repetition, tightening metadata, restoring test/build confidence, and documenting accessibility, security, and deployment readiness.

**Architecture:** Keep the current Create React App, React Router, and Material UI structure. Make small, focused changes to existing page components and public metadata, then use tests plus manual responsive/accessibility verification to confirm the site is launch-ready. Do not migrate away from CRA in this pass; record dependency modernization as a follow-up unless a deployed-bundle risk is found.

**Tech Stack:** React 18, Create React App / react-scripts, React Router v6, Material UI v5, Jest / React Testing Library, static public assets.

---

## File Structure

- Modify: `src/Components/Homepage.js` - remove repeated masthead copy and add a distinct landing-page pitch plus a short telemetry module description.
- Modify: `src/Components/Homepage.css` - fix invalid `max-width` value and improve landing-page spacing/readability if needed.
- Modify: `public/index.html` - replace Create React App description and stale boilerplate metadata.
- Modify: `public/manifest.json` - replace Create React App names, fix the broken icon source, and align theme/background colors.
- Modify: `src/Components/Skills.js` - remove unused imports that trigger build warnings.
- Modify: `src/Components/TelemetryDemo.js` - review and either fix the hook dependency warning or add a precise lint suppression near the intentional ref pattern.
- Modify: empty test files under `src/Components/*.test.js` - either delete empty suites or replace them with minimal smoke tests.
- Create or modify: `docs/pre-production-review.md` - record accessibility, security, responsive, and deployment findings that are review outputs rather than app code.

---

### Task 1: Landing Page Copy and Telemetry Framing

**Files:**
- Modify: `src/Components/Homepage.js`
- Modify: `src/Components/Homepage.css`
- Test: `src/Components/Homepage.test.js`

- [ ] **Step 1: Write the homepage smoke test**

Replace the empty `src/Components/Homepage.test.js` with:

```javascript
import { render, screen } from '@testing-library/react';
import Homepage from './Homepage';

test('renders a distinct landing page pitch and telemetry description', () => {
  render(<Homepage />);

  expect(screen.getByRole('heading', { name: /flight test systems/i })).toBeInTheDocument();
  expect(screen.getByText(/real-time instrumentation display/i)).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: /^miles raker$/i })).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run the homepage test and verify it fails**

Run: `npm.cmd test -- --watchAll=false src/Components/Homepage.test.js`

Expected: FAIL because the current homepage still renders `Miles Raker` as the main heading and does not include the new telemetry framing.

- [ ] **Step 3: Update homepage copy**

In `src/Components/Homepage.js`, replace the repeated name/title block with a distinct landing intro. Use copy in this shape:

```javascript
<Typography variant="h2">
  Flight Test Systems, Instrumentation, and Full-Stack Tools
</Typography>
<Typography variant="h5" color="secondary">
  I build electrical systems, data tools, and real-time displays for experimental aircraft programs.
</Typography>
<Typography variant="body1">
  My work sits where aircraft hardware, flight test data, and software tooling meet: instrumentation,
  power distribution, control systems, payload networks, embedded hardware, and the applications that
  make complex test data usable. I bring aerospace electrical engineering depth and full-stack software
  capability to deliver complete, end-to-end systems.
</Typography>
<Typography variant="h5" color="secondary">
  Telemetry Demo
</Typography>
<Typography variant="body1">
  The simulated display below is a compact example of the real-time instrumentation views used during
  flight test. It is here to show the kind of live engineering interface I design and operate, not to
  document every control in the module.
</Typography>
```

Keep the existing GitHub source link and `<TelemetryDemo />`.

- [ ] **Step 4: Fix homepage CSS**

In `src/Components/Homepage.css`, make `max-width` valid and center the content:

```css
.homepageContainer {
    display: flex;
    max-width: 1440px;
    margin: 1em auto 0;
    gap: 1rem;
}
```

- [ ] **Step 5: Run the homepage test and verify it passes**

Run: `npm.cmd test -- --watchAll=false src/Components/Homepage.test.js`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/Components/Homepage.js src/Components/Homepage.css src/Components/Homepage.test.js
git commit -m "refine landing page copy"
```

---

### Task 2: Metadata and Manifest Cleanup

**Files:**
- Modify: `public/index.html`
- Modify: `public/manifest.json`

- [ ] **Step 1: Update document metadata**

In `public/index.html`, change the description to:

```html
<meta
  name="description"
  content="Portfolio for Miles Raker, an aerospace electrical engineer specializing in flight test instrumentation, aircraft systems, and software tools."
/>
```

Keep the title as `Miles Raker Portfolio` unless a later review chooses a sharper title.

- [ ] **Step 2: Update manifest identity**

In `public/manifest.json`, replace the current CRA defaults with:

```json
{
  "short_name": "Miles Raker",
  "name": "Miles Raker Portfolio",
  "icons": [
    {
      "src": "RocketIcon.ico",
      "sizes": "64x64 32x32 24x24 16x16",
      "type": "image/x-icon"
    },
    {
      "src": "logo192.png",
      "type": "image/png",
      "sizes": "192x192"
    },
    {
      "src": "logo512.png",
      "type": "image/png",
      "sizes": "512x512"
    }
  ],
  "start_url": ".",
  "display": "standalone",
  "theme_color": "#fafafa",
  "background_color": "#ffffff"
}
```

- [ ] **Step 3: Build to verify metadata changes do not break production output**

Run: `npm.cmd run build`

Expected: build completes. Existing unrelated warnings may remain until Task 3.

- [ ] **Step 4: Commit**

```bash
git add public/index.html public/manifest.json
git commit -m "update portfolio metadata"
```

---

### Task 3: Test Suite and Build Warning Cleanup

**Files:**
- Modify: `src/Components/Skills.js`
- Modify: `src/Components/TelemetryDemo.js`
- Modify or delete: `src/Components/Contact.test.js`
- Modify or delete: `src/Components/NavTabsHorizontal.test.js`
- Modify or delete: `src/Components/NavTabsVertical.test.js`
- Modify or delete: `src/Components/Router.test.js`
- Modify or delete: `src/Components/TopBar.test.js`

- [ ] **Step 1: Remove unused Skills imports**

In `src/Components/Skills.js`, change:

```javascript
import { Box, Typography, Divider, ToggleButtonGroup, ToggleButton } from '@mui/material';
```

to:

```javascript
import { Box, Typography, Divider } from '@mui/material';
```

- [ ] **Step 2: Review the TelemetryDemo hook warning**

Find the `useEffect` around `StickControl` that currently disables `react-hooks/exhaustive-deps`. If `controlsRef` is intentionally stable because it is a ref passed from the parent, keep the suppression but make it specific and explanatory:

```javascript
  // controlsRef is a stable ref object owned by the parent; this effect only attaches pointer listeners while interactive mode is active.
  }, [interactive]); // eslint-disable-line react-hooks/exhaustive-deps
```

If the warning appears on a different effect after code inspection, apply the same standard: either include the dependency when behavior remains unchanged, or add a short reason for the intentional ref-based dependency.

- [ ] **Step 3: Replace or delete empty tests**

For each empty suite, choose the smallest meaningful action:

```text
Delete if the component no longer exists or has no useful behavior to assert:
- src/Components/Contact.test.js

Replace with smoke tests if the component is active:
- src/Components/NavTabsHorizontal.test.js
- src/Components/NavTabsVertical.test.js
- src/Components/Router.test.js
- src/Components/TopBar.test.js
```

- [ ] **Step 4: Add nav tab smoke tests**

Use this pattern for both nav tab test files, adjusting the imported component:

```javascript
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import NavTabsHorizontal from './NavTabsHorizontal';

test('renders primary navigation tabs', () => {
  render(
    <MemoryRouter>
      <NavTabsHorizontal />
    </MemoryRouter>
  );

  expect(screen.getByRole('tab', { name: /resume/i })).toBeInTheDocument();
  expect(screen.getByRole('tab', { name: /values/i })).toBeInTheDocument();
  expect(screen.getByRole('tab', { name: /projects/i })).toBeInTheDocument();
});
```

- [ ] **Step 5: Add TopBar smoke test**

Use:

```javascript
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TopBar from './TopBar';

test('renders the site masthead and logo link', () => {
  render(
    <MemoryRouter>
      <TopBar />
    </MemoryRouter>
  );

  expect(screen.getByRole('img', { name: /rocket idea logo/i })).toBeInTheDocument();
  expect(screen.getByText(/aerospace electrical engineer/i)).toBeInTheDocument();
});
```

- [ ] **Step 6: Add Router smoke test**

Use:

```javascript
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Router from './Router';

test('renders the homepage route by default', () => {
  render(
    <MemoryRouter initialEntries={['/']}>
      <Router />
    </MemoryRouter>
  );

  expect(screen.getByRole('heading', { name: /flight test systems/i })).toBeInTheDocument();
});
```

- [ ] **Step 7: Run all tests**

Run: `npm.cmd test -- --watchAll=false`

Expected: all test suites pass.

- [ ] **Step 8: Run production build**

Run: `npm.cmd run build`

Expected: build completes without the unused import warning. If the telemetry hook warning remains, confirm the nearby code includes a specific explanatory suppression.

- [ ] **Step 9: Commit**

```bash
git add src/Components/Skills.js src/Components/TelemetryDemo.js src/Components/*.test.js
git commit -m "restore test and build confidence"
```

---

### Task 4: Accessibility and Responsive Review

**Files:**
- Modify if needed: `src/Components/TopBar.js`
- Modify if needed: `src/Components/NavTabsHorizontal.js`
- Modify if needed: `src/Components/NavTabsVertical.js`
- Modify if needed: `src/Components/TelemetryDemo.js`
- Modify if needed: `src/Components/Values.js`
- Create: `docs/pre-production-review.md`

- [ ] **Step 1: Start the app locally**

Run: `npm.cmd start`

Expected: development server opens or reports a local URL, usually `http://localhost:3000`.

- [ ] **Step 2: Keyboard review**

Manually verify:

```text
Tab reaches the logo link, Resume, Values, Projects, project cards, modal Close button, resume download, and Values controls.
Focus is visible on every interactive element.
Project modal traps focus well enough for MUI Dialog defaults and closes with Escape.
Telemetry demo can be understood without interacting with every control.
```

- [ ] **Step 3: Screen semantics review**

Inspect the rendered pages and note findings:

```text
Homepage has one clear h1/h2-level landing heading and does not duplicate the masthead.
Navigation has useful aria-label text.
Decorative images have empty alt; meaningful images have descriptive alt.
Values spiderweb button labels describe the action.
Charts or visual-only displays have nearby text that summarizes their purpose.
```

- [ ] **Step 4: Reduced motion review**

Use browser dev tools or OS/browser settings to emulate `prefers-reduced-motion: reduce`.

Expected:

```text
Values web does not force long animation delays.
Telemetry animation remains acceptable because it is the primary demo; document if no reduced-motion toggle will be added in this launch pass.
```

- [ ] **Step 5: Responsive review**

Check widths around 375px, 768px, 1024px, and 1440px.

Expected:

```text
TopBar does not overlap or clip important text.
Homepage copy remains readable.
Telemetry demo does not overflow horizontally in a way that blocks reading.
Resume paper and project cards remain usable.
Values spiderweb controls remain reachable.
```

- [ ] **Step 6: Record review output**

Create `docs/pre-production-review.md` with:

```markdown
# Pre-Production Review

## Accessibility

- Keyboard navigation:
- Focus visibility:
- Heading structure:
- Motion:
- Visual/chart fallbacks:

## Responsive Layout

- Mobile:
- Tablet:
- Desktop:

## Security and Dependencies

- Production bundle:
- Development tooling:
- Follow-up:

## Deployment

- Build:
- Static routing:
- Resume assets:
- Metadata:
```

Fill each bullet with a concrete pass/fail note and any fixes made during the review.

- [ ] **Step 7: Commit**

```bash
git add src/Components/TopBar.js src/Components/NavTabsHorizontal.js src/Components/NavTabsVertical.js src/Components/TelemetryDemo.js src/Components/Values.js docs/pre-production-review.md
git commit -m "document pre-production accessibility review"
```

Only stage component files that actually changed.

---

### Task 5: Security and Deployment Readiness

**Files:**
- Modify: `docs/pre-production-review.md`
- Modify if needed: `README.md`
- Modify if needed: `public/robots.txt`

- [ ] **Step 1: Run production dependency audit**

Run: `npm.cmd audit --omit=dev`

Expected current result: vulnerabilities are reported through CRA/Jest/webpack/SVGO/PostCSS dependency chains.

- [ ] **Step 2: Classify audit findings**

In `docs/pre-production-review.md`, record:

```markdown
### Dependency Audit

- `npm audit --omit=dev` reports vulnerabilities through `react-scripts` and its build/test tooling dependency tree.
- This is a static portfolio with no server-side runtime in the deployed app.
- Launch action: confirm no vulnerable package is intentionally shipped for runtime user input processing.
- Follow-up action: plan a future migration from Create React App/react-scripts to Vite or another maintained build tool.
```

- [ ] **Step 3: Verify production build**

Run: `npm.cmd run build`

Expected: production build completes.

- [ ] **Step 4: Verify static assets**

Check:

```text
public/resume.pdf exists.
public/resume.md exists and loads through Resume.js fetch.
public/RocketIcon.ico exists and matches manifest/icon references.
public/robots.txt is acceptable for public indexing.
```

- [ ] **Step 5: Record deployment assumptions**

In `docs/pre-production-review.md`, add:

```markdown
### Deployment Assumptions

- The app is built as a static React single-page app.
- Hosting should serve `build/index.html` as the fallback for client-side routes such as `/resume`, `/values`, and `/projects`.
- The app currently assumes it is hosted at `/`; set `homepage` in `package.json` only if deploying under a subpath.
```

- [ ] **Step 6: Final verification**

Run:

```bash
npm.cmd test -- --watchAll=false
npm.cmd run build
```

Expected: tests pass and build succeeds.

- [ ] **Step 7: Commit**

```bash
git add docs/pre-production-review.md README.md public/robots.txt
git commit -m "record deployment readiness review"
```

Only stage `README.md` and `public/robots.txt` if they changed.

---

## Final Review Checklist

- [ ] Landing page no longer repeats the TopBar identity/title.
- [ ] Telemetry module has one concise description for the whole module.
- [ ] `public/index.html` and `public/manifest.json` no longer contain CRA defaults.
- [ ] Empty Jest suites no longer fail the test run.
- [ ] `npm.cmd test -- --watchAll=false` passes.
- [ ] `npm.cmd run build` succeeds.
- [ ] Build warnings are resolved or intentionally documented.
- [ ] Accessibility/responsive findings are recorded in `docs/pre-production-review.md`.
- [ ] Dependency audit findings are classified with launch action and follow-up action.
- [ ] Deployment assumptions for static routing and root hosting are documented.

## Self-Review

- Spec coverage: This plan covers landing-page repetition, telemetry framing, metadata, formatting, accessibility, security/dependency review, tests, build warnings, responsive checks, and deployment readiness.
- Placeholder scan: No `TBD`, unresolved `TODO`, or generic "add tests" steps remain. Each code-changing task includes concrete code or exact review criteria.
- Scope check: CRA/Vite migration is intentionally excluded from this launch plan and captured as a follow-up because it is larger than the requested pre-production review.
