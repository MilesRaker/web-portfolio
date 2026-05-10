import { Stack, Typography } from '@mui/material';
import React from 'react';
import './Homepage.css';
import TelemetryDemo from './TelemetryDemo';

function Homepage() {
    return(
        <Stack className='homepageContainer'>
            <Typography variant='h2'>
                Flight Test Systems, Instrumentation, and Full-Stack Tools
            </Typography>
            <Typography variant='h5' color='secondary' component='p'>
                I build electrical systems, data tools, and real-time displays for experimental aircraft programs.
            </Typography>
            <Typography variant='body1'>
                My work sits where aircraft hardware, flight test data, and software tooling meet: instrumentation,
                power distribution, control systems, payload networks, embedded hardware, and the applications that
                make complex test data usable. I bring aerospace electrical engineering depth and full-stack software
                capability to deliver complete, end-to-end systems.
            </Typography>
            <Typography variant='h5' color='secondary' component='h3'>
                Telemetry Demo
            </Typography>
            <Typography variant='body1'>
                The simulated display below is a compact example of the real-time instrumentation display views used during
                flight test. It is here to show the kind of live engineering interface I design and operate, not to
                document every control in the module.
            </Typography>
            <a href="https://github.com/MilesRaker/web-portfolio" target="_blank" rel="noreferrer">Source Code</a>
            <TelemetryDemo />
        </Stack>
    )
}

export default Homepage;
