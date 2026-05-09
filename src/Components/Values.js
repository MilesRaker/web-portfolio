import { Typography } from '@mui/material';
import React, { useEffect, useState } from 'react';
import './Values.css';

const VALUES = [
  {
    name: 'Authentic',
    definition: 'Staying grounded in who I am and what I believe.',
    angle: 180,
    radius: 260,
  },
  {
    name: 'Curious',
    definition: 'Staying open, asking questions, and learning quickly.',
    angle: 238,
    radius: 215,
  },
  {
    name: 'Kind',
    definition: 'Treating people with patience, generosity, and respect.',
    angle: 300,
    radius: 285,
  },
  {
    name: 'Loyal',
    definition: 'Showing up for the team, especially when it matters.',
    angle: 18,
    radius: 235,
  },
  {
    name: 'Playful',
    definition: 'Bringing energy, humor, and creativity into the work.',
    angle: 72,
    radius: 300,
  },
  {
    name: 'Self-confident',
    definition: 'Trusting that I can learn what the mission requires.',
    angle: 126,
    radius: 245,
  },
];

const SPOKE_START_DELAY = 0.5;
const SPOKE_STAGGER = 0.333;
const SPOKE_DURATION = 1;
const NODE_DURATION = 0.35;
const EXPAND_DURATION_MS = (SPOKE_START_DELAY + ((VALUES.length - 1) * SPOKE_STAGGER) + SPOKE_DURATION + NODE_DURATION) * 1000;
const COLLAPSE_DURATION_MS = (((VALUES.length - 1) * SPOKE_STAGGER) + NODE_DURATION + SPOKE_DURATION) * 1000;

const WEB_PHASE_CLASS = {
  expanding: 'isExpanding',
  expanded: 'isExpanded',
  collapsing: 'isCollapsing',
  collapsed: 'isCollapsed',
};

function prefersReducedMotion() {
  return typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export default function Values() {
  const [activeValue, setActiveValue] = useState(null);
  const [focusedValue, setFocusedValue] = useState(null);
  const [webPhase, setWebPhase] = useState('expanding');

  useEffect(() => {
    if (webPhase !== 'expanding' && webPhase !== 'collapsing') return undefined;

    const nextPhase = webPhase === 'expanding' ? 'expanded' : 'collapsed';
    const duration = prefersReducedMotion()
      ? 0
      : webPhase === 'expanding'
        ? EXPAND_DURATION_MS
        : COLLAPSE_DURATION_MS;
    const timeoutId = window.setTimeout(() => setWebPhase(nextPhase), duration);

    return () => window.clearTimeout(timeoutId);
  }, [webPhase]);

  function toggleValue(name) {
    setActiveValue(current => (current === name ? null : name));
  }

  function toggleWeb() {
    if (webPhase === 'expanded') {
      setActiveValue(null);
      setFocusedValue(null);
      setWebPhase('collapsing');
    } else if (webPhase === 'collapsed') {
      setWebPhase('expanding');
    }
  }

  const isAnimating = webPhase === 'expanding' || webPhase === 'collapsing';
  const rocketLabel = webPhase === 'collapsed'
    ? 'Expand values web'
    : webPhase === 'expanded'
      ? 'Collapse values web'
      : 'Values web animation in progress';

  return (
    <main className="valuesContainer">
      <Typography variant="h2" className="valuesHeading">Values</Typography>

      <section className={`valuesWeb ${WEB_PHASE_CLASS[webPhase]}`} aria-label="Personal values spiderweb chart">
        <button
          type="button"
          className="valuesRocketBadge"
          onClick={toggleWeb}
          disabled={isAnimating}
          aria-label={rocketLabel}
        >
          <img
            className="valuesRocketIcon"
            src={`${process.env.PUBLIC_URL}/RocketIcon.ico`}
            alt=""
          />
        </button>

        {VALUES.map((value, index) => {
          const spokeDelay = SPOKE_START_DELAY + index * SPOKE_STAGGER;
          const nodeDelay = spokeDelay + SPOKE_DURATION;
          const collapseNodeDelay = index * SPOKE_STAGGER;
          const collapseSpokeDelay = collapseNodeDelay + NODE_DURATION;
          const isActive = activeValue === value.name;
          const focusAnchor = focusedValue || activeValue;
          const isDimmed = Boolean(focusAnchor && focusAnchor !== value.name && !isActive);

          return (
            <React.Fragment key={value.name}>
              <span
                className="valueSpoke"
                style={{
                  '--angle': `${value.angle}deg`,
                  '--radius': `${value.radius}px`,
                  '--spoke-delay': `${spokeDelay}s`,
                  '--collapse-spoke-delay': `${collapseSpokeDelay}s`,
                }}
                aria-hidden="true"
              />
              <span
                className="valueNode"
                style={{
                  '--angle': `${value.angle}deg`,
                  '--radius': `${value.radius}px`,
                  '--node-delay': `${nodeDelay}s`,
                  '--collapse-node-delay': `${collapseNodeDelay}s`,
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
                  aria-label={value.name}
                >
                  <span className="valueNodeName">{value.name}</span>
                  {isActive && (
                    <span className="valueNodeDefinition">
                      {value.definition}
                    </span>
                  )}
                </button>
              </span>
            </React.Fragment>
          );
        })}
      </section>
    </main>
  );
}
