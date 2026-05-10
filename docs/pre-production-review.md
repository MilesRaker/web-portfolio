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

- Production bundle review is deferred to Task 5. That task should inspect the generated build output for unexpected source exposure, oversized assets, sourcemap policy, and environment-specific assumptions.
- Dependency review is deferred to Task 5. That task should run the selected audit tooling, review direct production dependencies, and separate runtime risk from development-only tooling risk.
- Development tooling follow-up is deferred to Task 5. That task should document any known warnings from test/build tooling and decide whether they are acceptable for launch.
- No secrets or credentials should be committed in source, docs, public assets, or build output. Task 5 should include a final check for accidental secret-like strings.

## Deployment

- The app should build as a static React bundle and be served from the configured production host without requiring a backend service.
- Static routing should be verified against the target host. Direct refreshes on portfolio routes should either resolve correctly or be covered by host fallback configuration.
- Resume assets should be present in the deployed static asset set, load with correct casing, and remain linked from the portfolio after build fingerprinting.
- Metadata should be reviewed before launch: document title, description, favicon/app icons, social preview metadata, canonical URL, and robots/indexing behavior.
- `public/robots.txt` allows indexing per controller verification; deployment should confirm the final hosted file is reachable and unchanged.
