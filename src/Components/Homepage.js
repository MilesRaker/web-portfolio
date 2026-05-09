import { Stack, Typography } from '@mui/material';
import React from 'react';
import './Homepage.css';
import TelemetryDemo from './TelemetryDemo';

function Homepage() {
    return(
        <Stack className='homepageContainer'>
            <Typography variant='h2'>
                Miles Raker
            </Typography>
            <Typography variant='h5' color="secondary">
                Design Engineer | Aerospace Electrical Engineer | Active Secret Clearance
            </Typography>
            <Typography variant='body1'>
                I design and build experimental aircraft systems at Scaled Composites — one of the most prolific
                experimental aircraft developers in the world. My work spans the full electrical stack: instrumentation
                systems, power distribution, control systems, payload networks, and embedded hardware. Company subject
                matter expert on flight test instrumentation, with hands-on experience across 20+ programs and 50+
                flight tests. I combine rigorous EE depth with full-stack software capability to deliver complete,
                end-to-end solutions.
            </Typography>
            <Typography variant='h5' color="secondary">
                About This Site
            </Typography>
            <Typography variant='body1'>
                Built with React, React Router, and Material UI. The telemetry demo below is a simulated aircraft
                parameter display — the kind of real-time instrumentation view I design and operate in flight test.
                Source code on GitHub:
            </Typography>
            <a href="https://github.com/MilesRaker/web-portfolio" target="_blank" rel="noreferrer">Source Code</a>
            <TelemetryDemo />
        </Stack>
    )
}

export default Homepage;