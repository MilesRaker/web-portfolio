import { Typography } from '@mui/material';
import React, { useState } from 'react';
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
          <img
            className="valuesRocketIcon"
            src={`${process.env.PUBLIC_URL}/RocketIcon.ico`}
            alt=""
          />
        </div>

        {VALUES.map((value, index) => {
          const spokeDelay = SPOKE_START_DELAY + index * SPOKE_STAGGER;
          const nodeDelay = spokeDelay + SPOKE_DURATION;
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
