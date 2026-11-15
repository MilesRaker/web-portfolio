import React, { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import Homepage from './Homepage';
import customTheme from './ThemeProvider';
import TopBar from './TopBar';
import { Container, ThemeProvider } from '@mui/material/'
import Resume from './Resume';
import Values from './Values';
import Projects from './Projects';

// three.js is only downloaded when someone opens /proteus, /voyager or /long-ez
const ProteusViewer = lazy(() => import('./ProteusViewer'));
const VoyagerViewer = lazy(() => import('./VoyagerViewer'));
const LongEZViewer = lazy(() => import('./LongEZViewer'));

export default function Router (){

    return(
        <Container className="container" maxWidth="false">
            <ThemeProvider theme={customTheme} >
                <TopBar /> 

                <div className="routes">
                    <Routes >
                        <Route className="homepage" path='/' element={<Homepage />} />
                        <Route className="resume" path='/resume' element={<Resume />} />
                        <Route className="projects" path='/projects' element={<Projects />} />
                        <Route className="values" path='/values' element={<Values />} />
                        <Route className="proteus" path='/proteus' element={<Suspense fallback={null}><ProteusViewer /></Suspense>} />
                        <Route className="voyager" path='/voyager' element={<Suspense fallback={null}><VoyagerViewer /></Suspense>} />
                        <Route className="long-ez" path='/long-ez' element={<Suspense fallback={null}><LongEZViewer /></Suspense>} />
                    </Routes>
                </div>

            </ThemeProvider>
        </Container>
    )
    
}