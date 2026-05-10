# Contact Information Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add highly visible phone and email contact actions to the portfolio top bar and homepage.

**Architecture:** Keep the contact targets as constants inside the components that render them, using existing React and MUI patterns. The global top bar carries the primary contact actions on every route, while the homepage adds a secondary first-impression contact strip.

**Tech Stack:** React, React Router, Material UI, Jest/React Testing Library.

---

## File Structure

- Modify `src/Components/TopBar.js`: add `Call` and `Email` links using MUI buttons or chips, with responsive wrapping inside the existing toolbar.
- Modify `src/Components/Homepage.js`: add a compact homepage contact strip below the intro copy and before the telemetry demo content.
- Modify or add tests in `src/Components/TopBar.test.js` and `src/Components/Homepage.test.js`: assert visible contact labels and correct `tel:` and `mailto:` links.

---

### Task 1: Top Bar Contact Actions

**Files:**
- Modify: `src/Components/TopBar.js`
- Test: `src/Components/TopBar.test.js`

- [ ] **Step 1: Write failing top bar tests**

Add assertions that the top bar renders phone and email actions:

```javascript
expect(screen.getByRole('link', { name: /call/i })).toHaveAttribute('href', 'tel:+13606068381');
expect(screen.getByRole('link', { name: /email/i })).toHaveAttribute('href', 'mailto:MilesRaker@gmail.com');
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- --watchAll=false TopBar.test.js`

Expected: FAIL because the contact links do not exist yet.

- [ ] **Step 3: Add the top bar contact actions**

In `TopBar.js`, import the needed MUI controls and icons, define the phone and email constants, and render compact `Call` and `Email` links in the toolbar. Use `href="tel:+13606068381"` and `href="mailto:MilesRaker@gmail.com"`.

- [ ] **Step 4: Run the top bar test**

Run: `npm test -- --watchAll=false TopBar.test.js`

Expected: PASS.

---

### Task 2: Homepage Contact Strip

**Files:**
- Modify: `src/Components/Homepage.js`
- Test: `src/Components/Homepage.test.js`

- [ ] **Step 1: Write failing homepage tests**

Add assertions that the homepage renders visible phone and email contact links:

```javascript
expect(screen.getByRole('link', { name: /email miles/i })).toHaveAttribute('href', 'mailto:MilesRaker@gmail.com');
expect(screen.getByRole('link', { name: /call miles/i })).toHaveAttribute('href', 'tel:+13606068381');
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- --watchAll=false Homepage.test.js`

Expected: FAIL because the homepage contact strip does not exist yet.

- [ ] **Step 3: Add the homepage contact strip**

In `Homepage.js`, add a compact contact section below the introductory body copy and before the `Telemetry Demo` heading. Include the sentence `Available for aerospace electrical systems, instrumentation, and full-stack tooling work.` followed by two visible links: `Email Miles` and `Call Miles`.

- [ ] **Step 4: Run the homepage test**

Run: `npm test -- --watchAll=false Homepage.test.js`

Expected: PASS.

---

### Task 3: Visual and Regression Verification

**Files:**
- Verify: `src/Components/TopBar.js`
- Verify: `src/Components/Homepage.js`

- [ ] **Step 1: Run the focused component tests**

Run: `npm test -- --watchAll=false TopBar.test.js Homepage.test.js`

Expected: PASS.

- [ ] **Step 2: Build the app**

Run: `npm run build`

Expected: Production build completes successfully.

- [ ] **Step 3: Inspect desktop and mobile layout**

Start or reuse the local dev server, open the homepage, and check desktop and mobile widths. Expected: contact links are visible, readable, clickable, and do not overlap the name, subtitle, or navigation.

---

## Self-Review

- Spec coverage: the plan covers the global top bar, homepage strip, clickable `tel:` and `mailto:` targets, no new route, no backend, and no new dependency.
- Placeholder scan: no placeholder tasks remain.
- Type consistency: tests use the same visible labels and link targets specified in the implementation steps.
