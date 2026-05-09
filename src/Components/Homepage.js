import { Stack, Typography } from '@mui/material';
import React from 'react';
import './Homepage.css';
import TelemetryDemo from './TelemetryDemo';

function Homepage() {
    return(
        <Stack className='homepageContainer'>
            <Typography variant='h2'>
                Portfolio 
            </Typography>
            <Typography variant='h5' color="secondary">
            Software Engineer | Electronics Engineer | Musician
            </Typography>
            <Typography variant='body1'>I am driven and constantly inspired by the power of human connection. 
                Connecting people is about empathy, about authentic kindness, and curiosity to understand.
                This type of connection applies to the individual, groups, and large organizations alike. 
                My mission is to empower every human to connect, allowing our species to do more, together.
            </Typography>
            <Typography variant='h5' color="secondary">
                Project: Web Portfolio
            </Typography>
            <Typography>
                This website serves as both a web portfolio and an example of my web design abilities. This website 
                has been created using React, React-Router, and Material-UI. Source code can be found on github:
            </Typography>
                <a href="https://github.com/MilesRaker/web-portfolio" target="_blank" rel="noreferrer">Source Code</a>
            <TelemetryDemo />
        </Stack>
    )
}

export default Homepage;