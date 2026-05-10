import React, { useState } from 'react';
import { Box, Typography, Divider } from '@mui/material';
import { useTheme, useMediaQuery } from '@mui/material';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, XAxis, YAxis, Cell,
  ResponsiveContainer, Tooltip,
} from 'recharts';

const TIER = { Familiar: 1, Proficient: 2, Advanced: 3, Expert: 4 };

const SKILL_DATA = [
  {
    cluster: 'Instrumentation & Flight Test',
    skills: [
      { name: 'IADS / Curtiss-Wright',          tier: TIER.Advanced   },
      { name: 'Sensor selection & integration',  tier: TIER.Advanced   },
      { name: 'Data acquisition systems',        tier: TIER.Advanced   },
      { name: 'Telemetry system design',         tier: TIER.Proficient },
      { name: 'Flight test execution',           tier: TIER.Proficient },
    ],
  },
  {
    cluster: 'Electrical Engineering',
    skills: [
      { name: 'Relay / discrete logic',   tier: TIER.Advanced   },
      { name: 'Circuit analysis',         tier: TIER.Advanced   },
      { name: 'PCB design (Altium)',       tier: TIER.Proficient },
      { name: 'Power distribution',       tier: TIER.Proficient },
      { name: 'Fabrication & validation', tier: TIER.Proficient },
    ],
  },
  {
    cluster: 'Networking & Protocols',
    skills: [
      { name: 'Payload network integration',  tier: TIER.Advanced   },
      { name: 'Ethernet / IP',                tier: TIER.Proficient },
      { name: 'Protocol analysis & testing',  tier: TIER.Proficient },
    ],
  },
  {
    cluster: 'Software & Programming',
    skills: [
      { name: 'Python',               tier: TIER.Advanced   },
      { name: 'C#',                   tier: TIER.Proficient },
      { name: 'JavaScript / React',   tier: TIER.Proficient },
      { name: 'Arduino / embedded C', tier: TIER.Proficient },
      { name: 'MATLAB',               tier: TIER.Proficient },
    ],
  },
  {
    cluster: 'Program Management',
    skills: [
      { name: 'T&E planning & execution',      tier: TIER.Proficient },
      { name: 'Technical documentation',       tier: TIER.Advanced   },
      { name: 'Cross-functional coordination', tier: TIER.Proficient },
      { name: 'Requirements development',      tier: TIER.Proficient },
      { name: 'Scheduling',                    tier: TIER.Proficient },
    ],
  },
];

const MAX_TIER = 4;

const RADAR_DATA = SKILL_DATA.map(({ cluster, skills }) => ({
  cluster,
  label: cluster.split(' ')[0],
  value: skills.reduce((sum, s) => sum + s.tier, 0) / skills.length,
}));

const TIER_COLOR = {
  1: '#80d6ff',
  2: '#42a5f5',
  3: '#0077c2',
  4: '#004d8c',
};

const TIER_LABELS = ['', 'Familiar', 'Proficient', 'Advanced', 'Expert'];

function ClusterBarChart({ clusterName }) {
  const data = SKILL_DATA.find(c => c.cluster === clusterName).skills;
  return (
    <ResponsiveContainer width="100%" height={data.length * 48 + 40}>
      <BarChart layout="vertical" data={data} margin={{ top: 8, right: 24, bottom: 8, left: 8 }}>
        <YAxis
          type="category"
          dataKey="name"
          width={200}
          tick={{ fontSize: 12, fill: '#333' }}
        />
        <XAxis
          type="number"
          domain={[0, MAX_TIER]}
          ticks={[1, 2, 3, 4]}
          tickFormatter={v => TIER_LABELS[v]}
          tick={{ fontSize: 11, fill: '#666' }}
        />
        <Tooltip formatter={v => [TIER_LABELS[v], 'Proficiency']} />
        <Bar dataKey="tier" isAnimationActive={false}>
          {data.map((entry, i) => (
            <Cell key={i} fill={TIER_COLOR[entry.tier]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function RadarTick({ x, y, payload, textAnchor, activeCluster, onHover }) {
  const cluster = RADAR_DATA.find(d => d.label === payload.value)?.cluster;
  const isActive = cluster === activeCluster;
  return (
    <text
      x={x}
      y={y}
      textAnchor={textAnchor}
      fill={isActive ? '#0077c2' : '#555'}
      fontSize={13}
      fontWeight={isActive ? 700 : 400}
      style={{ cursor: 'pointer' }}
      onMouseEnter={() => cluster && onHover(cluster)}
    >
      {payload.value}
    </text>
  );
}

function DesktopSkillsView() {
  const [activeCluster, setActiveCluster] = useState(null);

  const handleRadarMouseMove = (data) => {
    if (data?.activeLabel) {
      const cluster = RADAR_DATA.find(d => d.label === data.activeLabel)?.cluster;
      if (cluster) setActiveCluster(cluster);
    }
  };

  return (
    <Box>
      <Typography variant="caption" sx={{
        display: 'block',
        textAlign: 'center',
        color: 'text.secondary',
        fontStyle: 'italic',
        mb: 1.5,
      }}>
        Hover over the chart to explore skills by cluster
      </Typography>
      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 3, flexWrap: 'wrap', mb: 2 }}>
        {[1, 2, 3, 4].map(v => (
          <Box key={v} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Box sx={{ width: 12, height: 12, borderRadius: 0.5, bgcolor: TIER_COLOR[v], flexShrink: 0 }} />
            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
              {TIER_LABELS[v]}
            </Typography>
          </Box>
        ))}
      </Box>
      <ResponsiveContainer width="100%" height={380}>
        <RadarChart
          data={RADAR_DATA}
          cx="50%"
          cy="50%"
          outerRadius="72%"
          onMouseMove={handleRadarMouseMove}
        >
          <PolarGrid stroke="#ccc" />
          <PolarAngleAxis
            dataKey="label"
            tick={(props) => (
              <RadarTick {...props} activeCluster={activeCluster} onHover={setActiveCluster} />
            )}
          />
          <PolarRadiusAxis angle={90} domain={[0, MAX_TIER]} tick={false} axisLine={false} />
          <Radar name="Skills" dataKey="value" stroke="#42a5f5" fill="#42a5f5" fillOpacity={0.35} />
        </RadarChart>
      </ResponsiveContainer>

      {activeCluster && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" sx={{
            fontWeight: 700,
            color: 'text.secondary',
            textTransform: 'uppercase',
            letterSpacing: 0.6,
          }}>
            {activeCluster}
          </Typography>
          <ClusterBarChart clusterName={activeCluster} />
        </Box>
      )}
    </Box>
  );
}

function MobileSkillsView() {
  const data = SKILL_DATA.flatMap(({ cluster, skills }, ci) => [
    ...(ci > 0 ? [{ name: `── ${cluster}`, tier: 0, divider: true }] : []),
    ...skills.map(s => ({ ...s, cluster })),
  ]);
  return (
    <ResponsiveContainer width="100%" height={data.length * 44 + 40}>
      <BarChart layout="vertical" data={data} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
        <YAxis
          type="category"
          dataKey="name"
          width={180}
          tick={{ fontSize: 11, fill: '#333' }}
        />
        <XAxis
          type="number"
          domain={[0, MAX_TIER]}
          ticks={[1, 2, 3, 4]}
          tickFormatter={v => TIER_LABELS[v]}
          tick={{ fontSize: 10, fill: '#666' }}
        />
        <Tooltip
          formatter={v => v === 0 ? null : [TIER_LABELS[v], 'Proficiency']}
        />
        <Bar dataKey="tier" isAnimationActive={false}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.divider ? 'transparent' : TIER_COLOR[entry.tier]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export default function Skills() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  return (
    <Box sx={{ mt: 5 }}>
      <Typography variant="h6" sx={{
        fontWeight: 700,
        color: 'secondary.main',
        letterSpacing: 0.8,
        fontSize: '0.85rem',
      }}>
        SKILLS VISUALIZATION
      </Typography>
      <Divider sx={{ borderColor: 'secondary.main', mt: 0.5, mb: 3 }} />
      {isMobile ? <MobileSkillsView /> : <DesktopSkillsView />}
    </Box>
  );
}
