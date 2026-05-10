# Pre-production Review

This document captures Task 4 launch-readiness notes for the portfolio before the final production dependency and security review in Task 5.

## Accessibility

- Keyboard navigation should reach every interactive control in a predictable top-to-bottom, left-to-right order across the TopBar, main page sections, project links, resume content, and telemetry demo controls.
- Visible focus must remain clear on links, buttons, form controls, navigation items, and any telemetry controls. Manual review should confirm focus is not clipped by containers and remains visible against both light and dark backgrounds.
- The page should preserve one clear primary heading for the main portfolio pitch, followed by ordered section headings. Manual review should confirm whether the landing heading should be promoted to `h1` or remain aligned with the existing MUI theme hierarchy.
- Motion-sensitive users should be protected by `prefers-reduced-motion`; Task 3 confirmed `Values.css` includes reduced-motion handling. Manual review should also check any animated telemetry or chart transitions for reduced-motion behavior.
- Visual/chart content should not be the only way to understand the telemetry module. Charts, status indicators, and demos should have nearby text labels, accessible names, or fallback summaries so color and shape are not the only signals.
- The resume page renders structured Markdown content and offers a PDF download. Confirm the rendered resume headings, links, and download action remain usable with keyboard and screen-reader navigation.

## Responsive Layout

- Mobile review should cover the smallest supported viewport, including TopBar wrapping, navigation tap targets, section spacing, telemetry demo controls, and resume scaling.
- Tablet review should confirm the homepage pitch, skills/content sections, and telemetry module do not create awkward single-column gaps or clipped controls.
- Desktop review should confirm the layout uses available width without stretching content beyond readable line lengths. Resume content currently uses a Material UI `Container` with a medium max width; `Router.css` also had a legacy invalid `max-width` unit corrected for consistency.
- Manual verification should include at least one narrow mobile viewport, one tablet-width viewport, and one wide desktop viewport with browser zoom at 100% and 200%.
- Remaining areas to manually verify: long project names, external-link wrapping, resume asset loading, chart label density, and focus order after responsive navigation changes.

## Security and Dependencies

- The portfolio is a static React application with no backend runtime, server-side request handling, database, or intentional user-input processing path in production.
- `npm.cmd audit --omit=dev` currently exits with 25 vulnerabilities: 10 low, 4 moderate, and 11 high. Findings are primarily in the Create React App / `react-scripts` build, test, and development tooling chain, including `@tootallnate/once`, `jsdom` / Jest dependencies, `nth-check` / SVGO, `postcss` / `resolve-url-loader`, `serialize-javascript` / Workbox / `css-minimizer-webpack-plugin` / `rollup-plugin-terser`, and `webpack-dev-server`.
- The audit results should not be ignored, but they are materially different from a vulnerable backend service or a production feature that processes untrusted user input. Launch is acceptable after the test suite and production build pass, provided the generated build is reviewed as static assets only and does not expose unexpected source, secrets, or environment-specific files.
- The generated CRA build contains static assets only. It also emits JavaScript and CSS sourcemaps by default; confirm the production source-map deployment policy before launch if source exposure is a concern.
- `webpack-dev-server` has no available fix through the current CRA dependency chain. The durable follow-up is to migrate away from CRA / `react-scripts` to Vite or another maintained build tool.
- Build tooling emits a Node `fs.F_OK` deprecation warning. Treat this as a build-tooling warning to resolve during the CRA migration rather than as a production runtime blocker.
- Secret pattern scanning, excluding `node_modules`, `build`, `.git`, and `package-lock`, found no credentials. The only matches were documentation lines containing `REQUIRED SUB-SKILL`, which are false positives.

## Deployment

- `npm.cmd run build` passed during the previous verification and should be re-run as the final launch verification before deployment.
- The app builds as a static React bundle and is intended to be served from Azure Static Web Apps without a backend service.
- SPA routing needs Azure Static Web Apps fallback configuration so direct refreshes on routes such as `/resume`, `/projects`, and `/values` resolve to the React app instead of returning a host-level 404.
- Resume and brand assets exist in `public`: `resume.pdf`, `resume.md`, `RocketIcon.ico`, `logo192.png`, and `logo512.png`. Deployment should preserve this exact casing so resume links and icons resolve on case-sensitive hosts.
- Metadata and robots/indexing behavior are updated for launch. `public/robots.txt` allows indexing per controller verification; deployment should confirm the final hosted file is reachable and unchanged.
- The app assumes root hosting at `/`. The `package.json` `homepage` field is only needed if deploying under a subpath.
