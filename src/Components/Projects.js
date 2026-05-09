import React, { useState } from 'react';
import {
  Container, Grid, Card, CardContent, CardActionArea,
  Typography, Chip, Box, Dialog, DialogTitle,
  DialogContent, DialogActions, Button,
} from '@mui/material';

const PROJECTS = [
  {
    title: 'Vanguard Instrumentation System',
    summary:
      'Instrumentation system for a crewed technology demonstrator, publicly announced by Northrop Grumman. ' +
      'Covered sensor selection, data acquisition architecture, and real-time parameter monitoring using ' +
      'Curtiss-Wright hardware and IADS.',
    detail:
      'Designed and implemented the full instrumentation suite for a crewed tech demonstrator program. ' +
      'Responsibilities spanned sensor selection, DAU configuration, IADS parameter definition, and ' +
      'ground-station integration. Developed Python tooling to automate parameter management and ' +
      'streamline test card generation across flight test campaigns.',
    tech: ['Python', 'Curtiss-Wright IADS', 'Sensor Selection', 'Data Acquisition', 'Flight Test'],
  },
  {
    title: 'Landing Gear & Fuel Control Systems',
    summary:
      'Clean-sheet design of landing gear actuation and fuel control systems over an 18-month program. ' +
      'Led relay-logic design, fabrication oversight, and end-to-end validation testing from concept ' +
      'through flight clearance.',
    detail:
      'Owned the full design lifecycle for landing gear and fuel control systems on a new aircraft program — ' +
      'from initial architecture through flight-test clearance. Developed relay-logic schematics, specified ' +
      'components, managed fabrication, and authored the validation test plan. Resolved design issues ' +
      'across multiple test iterations before achieving flight-ready status.',
    tech: ['Relay Logic', 'Systems Design', 'Fabrication', 'Validation Testing', 'Flight Test'],
  },
  {
    title: 'Deimos/Phobos Fuel Controller Redesign',
    summary:
      'Embedded hardware redesign of a flight fuel controller, from PCB layout through acceptance testing. ' +
      'Replaced legacy components with a microcontroller-based design and built a custom test rig ' +
      'to validate the system.',
    detail:
      'Redesigned a fuel system controller at the board level using Altium Designer — component selection, ' +
      'schematic capture, and PCB layout with EMI mitigation. Wrote firmware and automated test scripts ' +
      'in Arduino and Python. Built a custom hardware test rig that simulated the flight environment and ' +
      'drove acceptance testing across the full operating envelope.',
    tech: ['Altium Designer', 'PCB Design', 'Arduino', 'Python', 'Embedded Systems'],
  },
  {
    title: 'IADS Parameter Management Tool',
    summary:
      'Internal C# desktop application for managing over 2,500 telemetry parameters across multiple IADS ' +
      'flight test databases. Cut manual parameter entry time and eliminated a class of configuration ' +
      'errors across programs.',
    detail:
      'Built a C# application to manage the full parameter lifecycle in Curtiss-Wright IADS — importing ' +
      'from instrumentation lists, diffing against existing databases, flagging conflicts, and exporting ' +
      'validated configurations. Handled naming conventions, unit conversions, and multi-program ' +
      'edge cases that previously required manual reconciliation.',
    tech: ['C#', 'Curtiss-Wright IADS', 'Desktop Application', 'Flight Test'],
  },
  {
    title: 'Python Network Test Suite',
    summary:
      'Custom Python framework for validating payload network integration on aircraft systems. ' +
      'Automated protocol-level checks that previously required manual inspection, producing ' +
      'structured reports for engineering review.',
    detail:
      'Developed a Python-based test suite to validate network connectivity, protocol compliance, and ' +
      'data integrity across aircraft payload interfaces. The framework automated multi-interface checks ' +
      'and generated structured pass/fail reports. Designed for extensibility as new payload ' +
      'configurations were added to the program.',
    tech: ['Python', 'Networking', 'Test Automation', 'Protocol Validation'],
  },
  {
    title: 'Washington Vets2Tech Hiring Portal',
    summary:
      'Public-facing web application connecting veterans with technology employment in Washington State, ' +
      'built as an open-source intern project. Implemented as a React.js single-page application ' +
      'with filterable job listings and employer profiles.',
    detail:
      'Contributed to the Washington Vets2Tech initiative by building a public hiring portal in React.js. ' +
      'The application presented job listings with filtering by role type, location, and employer, ' +
      'alongside employer profile pages. Developed collaboratively as an open-source intern project.',
    tech: ['React.js', 'JavaScript', 'Web Development'],
  },
];

function ProjectCard({ project, onOpen }) {
  return (
    <Card elevation={2} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardActionArea onClick={() => onOpen(project)} sx={{ flexGrow: 1 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>{project.title}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {project.summary}
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {project.tech.map(tag => (
              <Chip key={tag} label={tag} size="small" color="secondary" />
            ))}
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

function ProjectModal({ project, onClose }) {
  return (
    <Dialog open={!!project} onClose={onClose} maxWidth="sm" fullWidth>
      {project && (
        <>
          <DialogTitle>{project.title}</DialogTitle>
          <DialogContent>
            <Typography variant="body1" paragraph>{project.detail}</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
              {project.tech.map(tag => (
                <Chip key={tag} label={tag} size="small" color="secondary" />
              ))}
            </Box>
          </DialogContent>
          <DialogActions>
            {project.link && (
              <Button href={project.link} target="_blank" rel="noopener noreferrer" color="secondary">
                View Repo
              </Button>
            )}
            <Button onClick={onClose}>Close</Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}

export default function Projects() {
  const [selected, setSelected] = useState(null);

  return (
    <Container sx={{ py: 4 }}>
      <Typography variant="h2" gutterBottom>Projects</Typography>
      <Grid container spacing={3}>
        {PROJECTS.map(project => (
          <Grid item xs={12} sm={6} md={4} key={project.title}>
            <ProjectCard project={project} onOpen={setSelected} />
          </Grid>
        ))}
      </Grid>
      <ProjectModal project={selected} onClose={() => setSelected(null)} />
    </Container>
  );
}
