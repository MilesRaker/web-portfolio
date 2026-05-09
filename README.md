# MilesRaker.com — Portfolio Website

Personal portfolio for [Miles Raker](https://milesraker.com). Built with React, React Router v6, and Material UI v5.

## Dev Setup

```bash
npm install
npm start       # http://localhost:3000
npm run build   # production build → /build
```

## Project Structure

```
src/Components/
├── Router.js               Route definitions and layout wrapper
├── TopBar.js               Responsive header (class component, manages resize events)
├── NavTabsHorizontal.js    Desktop nav tabs (>725px)
├── NavTabsVertical.js      Mobile nav tabs (<725px)
├── ThemeProvider.js        MUI custom theme (gray primary, blue secondary #42a5f5)
├── Homepage.js             Landing page
├── Resume.js               Resume page
├── Values.js               Personal values — MUI Accordion
└── Projects.js             Projects showcase
```

## Current Pages

| Route | Status | Description |
|---|---|---|
| `/` | Done | Landing page with intro and links |
| `/resume` | In progress | Interactive resume (see Roadmap) |
| `/values` | Done | Six personal values in accordion layout |
| `/projects` | In progress | Project showcase cards (see Roadmap) |

---

## Roadmap — 2026 Refresh

Context: updating the portfolio for a job search targeting avionics/embedded roles. Priority order below.

---

### 1. Interactive Resume Page

**Goal:** Replace the static PNG with a properly rendered, interactive resume.

**Approach:**
- Resume source of truth is a Markdown file maintained separately (`Miles Raker Resume 2026 DRAFT.md`)
- Parse the Markdown in React (using `react-markdown` or a lightweight custom parser) and render it as a styled component that matches the existing MUI theme
- Drop the PDF output from `build_resume.py` into `public/resume.pdf` and add a Download button
- No separate data source to maintain — the Markdown file drives both the PDF and the web view

**What "interactive" means here:**
- Working hyperlinks (LinkedIn, GitHub)
- Responsive layout (readable on mobile)
- Skills section rendered as tag chips
- Download PDF button in the header

---

### 2. Projects Page

**Goal:** Showcase 4–6 projects with cards linking to detail views or external repos.

**Projects to include (in priority order):**

| Project | Tech | Notes |
|---|---|---|
| Vanguard Instrumentation System | Python, Curtiss-Wright/IADS, sensor selection | Crewed tech demonstrator; Northrop Grumman publicly announced |
| Landing Gear & Fuel Control Systems | Relay logic, fabrication, validation | Clean-sheet design, 18-month program |
| Deimos/Phobos Fuel Controller Redesign | Altium (PCB), Arduino/Python, custom test rig | Embedded redesign + acceptance test |
| IADS Parameter Management Tool | C# | Internal tooling for managing 2,500+ telemetry parameters |
| Python Network Test Suite | Python | Custom validation software for payload network integration |
| Washington Vets2Tech Hiring Portal | React.js | Public intern project; GitHub-linked |

**Card structure:** Title · 2–3 sentence description · tech tag list · optional link

**Sensitivity note:** Do not reference the unacknowledged classified network program by name or as a project card. Resume bullet is appropriate; featured project card is not.

---

### 3. Skills Visualization

**Goal:** Show breadth across disciplines visually — unusual for a portfolio and relevant for avionics/systems roles.

**Approach:** Radar chart or grouped bar using `recharts`, grouped by discipline cluster:
- Instrumentation & Flight Test
- Electrical Engineering
- Networking & Protocols
- Software & Programming
- Systems / Program Management

---

### 4. Telemetry Demo (Stretch Goal)

**Goal:** A real-time simulated aircraft parameter display — differentiating for avionics/embedded roles.

**Approach:** Fake sensor feed (altitude, airspeed, sideslip angle, g-load) scrolling in real time using `recharts`. Mimics the kind of IADS display built and operated in the day job. Even a simple version is a genuine conversation starter in avionics interviews.

---

### 5. Migrate from Create React App to Vite

Migrate from Create React App to Vite, which is the modern replacement. CRA (`react-scripts`) is abandoned by Meta and its internal dependencies carry unfixable security vulnerabilities. Vite resolves all outstanding `npm audit` issues and provides significantly faster dev startup and hot reload.
