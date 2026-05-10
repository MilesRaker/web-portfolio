# MilesRaker.com — Portfolio Website

Personal portfolio for [Miles Raker](https://milesraker.com) — Design Engineer at Scaled Composites, targeting avionics and embedded systems roles. Built with React 18, React Router v6, and Material UI v5.

---

## Table of Contents

- [Live Site](#live-site)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Pages & Routes](#pages--routes)
- [Roadmap — 2026 Refresh](#roadmap--2026-refresh)
- [Deployment](#deployment)

---

## Live Site

**[milesraker.com](https://milesraker.com)**

Hosted on Azure Static Web Apps via GitHub Actions CI/CD (`.github/workflows/`).

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18 |
| Routing | React Router v6 |
| UI Components | Material UI v5 (MUI) |
| CSS-in-JS | Emotion |
| Charts | Recharts |
| Resume Rendering | react-markdown |
| Flight Indicators | react-typescript-flight-indicators |
| Build Tool | Create React App (react-scripts) |
| Hosting | Azure Static Web Apps |
| CI/CD | GitHub Actions |

---

## Getting Started

### Prerequisites

- Node.js 16+
- npm 8+

### Installation

```bash
git clone https://github.com/MilesRaker/web-portfolio.git
cd web-portfolio
npm install
```

### Development

```bash
npm start        # Dev server at http://localhost:3000
npm test         # Run test suite
npm run build    # Production build → /build
```

### Resume PDF

The downloadable resume PDF lives at `public/resume.pdf`. It is built separately from the Markdown source at `public/resume.md` using the Python build script in the companion resume repository. To refresh the PDF, rebuild it from Markdown and drop the output into `public/resume.pdf`.

---

## Project Structure

```
web-portfolio/
├── .claude/                         # Claude Code workspace config
│   ├── agents/                      # Specialized sub-agents for portfolio tasks
│   │   ├── accessibility-checker.md
│   │   ├── build-check.md
│   │   ├── portfolio-reviewer.md
│   │   ├── project-card-writer.md
│   │   ├── recharts-helper.md
│   │   └── resume-sync.md
│   └── settings.local.json
├── .github/
│   └── workflows/                   # Azure Static Web Apps deployment pipeline
├── public/
│   ├── index.html                   # HTML shell
│   ├── resume.md                    # Markdown source of truth for resume
│   ├── resume.pdf                   # Downloadable PDF (built from resume.md)
│   ├── manifest.json
│   └── robots.txt
└── src/
    ├── index.js                     # React root — mounts Router, loads Roboto font
    ├── index.css                    # Global styles
    └── Components/
        ├── Router.js                # Route definitions + ThemeProvider wrapper
        ├── TopBar.js                # Responsive header (class component)
        ├── NavTabsHorizontal.js     # Desktop navigation (>725px)
        ├── NavTabsVertical.js       # Mobile navigation (<725px)
        ├── ThemeProvider.js         # MUI custom theme (gray primary, blue secondary)
        ├── Homepage.js              # Landing page
        ├── Resume.js                # Interactive resume (parses resume.md via react-markdown)
        ├── Skills.js                # Radar + bar chart skill visualization (Recharts)
        ├── TelemetryDemo.js         # Real-time simulated aircraft parameter display
        ├── Projects.js              # Project showcase cards
        ├── Values.js                # Personal values (MUI Accordion)
        └── images/
            └── ResumeImg.png        # Resume image fallback
```

### Theme

Configured in `ThemeProvider.js`:

- **Primary:** light gray (`#fafafa` / `#c7c7c7`)
- **Secondary:** blue (`#42a5f5`)
- **Typography:** Roboto (loaded via `@fontsource/roboto`)

---

## Pages & Routes

| Route | Component | Status | Description |
|---|---|---|---|
| `/` | `Homepage.js` | Done | Landing page with intro and navigation links |
| `/resume` | `Resume.js` | Done | Interactive resume rendered from Markdown; includes Skills visualization and Telemetry Demo |
| `/projects` | `Projects.js` | Done | Project cards for featured engineering work |
| `/values` | `Values.js` | Done | Six personal values in an MUI Accordion layout |

---

## Roadmap — 2026 Refresh

Context: portfolio refresh targeting avionics and embedded systems roles.

---

### 1. Interactive Resume Page — **Complete**

Replaced a static PNG with a fully rendered, interactive resume driven by a Markdown source file.

**Implemented:**
- `public/resume.md` is the single source of truth — drives both the React web view and the downloadable PDF
- Parsed and rendered via `react-markdown` with MUI component overrides
- Skills section rendered as MUI Chip tags
- Download PDF button links to `public/resume.pdf`
- Responsive layout (readable on mobile)
- Working hyperlinks (LinkedIn, GitHub)

**Commit:** `33d63af` — Implement interactive resume page with react-markdown and MUI

---

### 2. Projects Page — **Complete**

Showcase of featured engineering projects, each with a title, description, tech tag list, and optional external link.

**Projects included:**

| Project | Tech |
|---|---|
| Vanguard Instrumentation System | Python, Curtiss-Wright/IADS, sensor selection |
| Landing Gear & Fuel Control Systems | Relay logic, fabrication, validation |
| Deimos/Phobos Fuel Controller Redesign | Altium (PCB), Arduino/Python, custom test rig |
| Python Network Test Suite | Python |
| Washington Vets2Tech Hiring Portal | React.js |

**Commit:** `88b62a3` — Added project cards

---

### 3. Skills Visualization — **Complete**

Radar chart and expandable bar chart embedded at the bottom of the Resume page, showing breadth across five engineering discipline clusters.

**Implemented:**
- Five-axis radar chart (cluster-level overview) built with Recharts
- Click a cluster axis to expand a horizontal bar chart of individual skills
- Four proficiency tiers: Familiar / Proficient / Advanced / Expert
- Mobile-responsive: flat grouped bar chart at narrow widths where radar is illegible
- Hover tooltips listing individual skills and tiers
- Active cluster highlighted on radar while expanded

**Discipline clusters:** Instrumentation & Flight Test · Electrical Engineering · Networking & Protocols · Software & Programming · Systems / Program Management

**Commit:** `da33f1d` — Add Skills Visualization to Resume page

---

### 4. Telemetry Demo — **Complete**

Real-time simulated aircraft parameter display — a differentiating feature for avionics/embedded interviews. Mimics the kind of IADS telemetry display used in flight test operations.

**Implemented:**
- Live-scrolling Recharts line charts for altitude, airspeed, sideslip angle, and g-load
- Full circuit autopilot with physics simulation (takeoff roll, climb, cruise, descent, landing)
- Interactive manual controls: throttle, pitch, roll, landing gear
- Seamless autopilot ↔ manual mode transitions
- Instrument panel with flight indicators (attitude, heading, airspeed, altitude)

**Commits:**
- `edacc33` — Added Telemetry Demo
- `d73ea97` — Expand TelemetryDemo with interactive controls, physics, and UI improvements
- `a7f9d88` — Overhaul TelemetryDemo flight sim with full circuit autopilot and seamless mode transitions
- `4f029ab` — Simplify TelemetryDemo: extract constants, deduplicate reset logic, fix efficiency issues

---

### 5. Update Landing Page — **Complete**

Homepage refresh to reflect current job search focus on avionics and embedded systems roles.

**Commits:** `ecf4a97` — Homepage redesign · `414138d` — Homepage is now responsive

---

### 6. Migrate from Create React App to Vite — **Pending**

Migrate from `react-scripts` (CRA) to Vite. CRA is abandoned by Meta and its internal dependencies carry unfixable audit vulnerabilities. Vite provides faster dev startup, faster hot reload, and a clean security posture.

---

## Deployment

Deployed automatically to **Azure Static Web Apps** on every push to `master` via the GitHub Actions workflow in `.github/workflows/`. No manual deploy step required.

Build output is the `/build` directory produced by `npm run build`. The Azure workflow handles upload.

To test the production build locally before pushing:

```bash
npm run build
npx serve -s build
```
