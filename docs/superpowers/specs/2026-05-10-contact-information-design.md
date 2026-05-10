# Contact Information Visibility Design

## Goal

Make Miles Raker's phone number and email highly visible throughout the portfolio without making the site feel cluttered or less professional.

## Placement

The primary placement is the global top bar because it appears on every page and is the first place visitors scan for identity and navigation. The contact information should sit near the name, title, and navigation as compact call and email actions.

The secondary placement is the homepage introduction, where a short availability/contact line can reinforce the call to action for first-time visitors before they reach the telemetry demo.

## Content

Use the contact details already present in the resume:

- Phone: `(360) 606-8381`
- Email: `MilesRaker@gmail.com`

Both should be clickable:

- Phone uses a `tel:` link.
- Email uses a `mailto:` link.

## UI Behavior

On wider screens, show concise contact actions in the top bar, including enough text to make the phone and email immediately understandable. On smaller screens, allow the actions to wrap cleanly below the name/title area so the header remains readable and the navigation still works.

The homepage should include a compact contact strip or line below the introductory text. It should use the same contact targets as the top bar and avoid adding a separate contact form or new page.

## Scope

This change should update the existing React/MUI components and styles only. It should not add routing, a backend contact form, analytics, or new dependencies.

## Verification

Verify that the top bar and homepage render without overflow on desktop and mobile widths, and that the `tel:` and `mailto:` links are present in the DOM.
