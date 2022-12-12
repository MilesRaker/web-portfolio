import {Typography, Container, Card, CardMedia, CardContent, CardActions, Button, Grid} from '@mui/material';
import React from 'react';
import customThemeOne from "./ThemeProvider";
// import PortfolioPreview from "src/images/ReactPortfolio.jpg";

const headerSx = {
    fontFamily: 'Quattrocento Sans',
    textDecoration: 'underline',
    textDecorationColor: customThemeOne.palette.secondary.main,
}


export default function Projects() {



    const openWebpageInNewTab = url => {
        window.open(url, '_blank', 'noopener,noreferrer');
    };


    return (
        <Container>
            <Typography>

            </Typography>
            <Grid xs={12}>
                <Grid xs={12} m={6} l={4}>
                    <Card>
{/*                        <CardMedia
                            component="img"
                            alt={"React Portfolio"}
                            image={}
                            style={{height: 180, maxWidth:'100%'}}/>*/}
                        <CardContent>
                            <Typography gutterBottom variant="h4" component="div" sx={headerSx}>Portfolio Website</Typography>
                            <Typography variant="body2" color="text.secondary">
                                www.MilesRaker.com is a React App designed to showcase my software development work.    This application uses React Router to manager components and utilizes Material UI library.
                            </Typography>
                        </CardContent>
                        <CardActions>
                            <Button size="small" sx={{color: "black", background: "light-blue"}} variant={"contained"} onClick={() => openWebpageInNewTab('www.milesraker.com')}>Portfolio Homepage</Button>
                            <Button size="small" sx={{color: "black", background: "light-blue"}} variant={"contained"} onClick={() => openWebpageInNewTab('https://github.com/MilesRaker/web-portfolio')}>View on GitHub</Button>
                        </CardActions>
                    </Card>
                </Grid>
                <Grid xs={12} m={6} l={4}>
                    <Card>
                        <CardContent>
                            <Typography gutterBottom variant="h4" component="div" sx={headerSx}>CodeUp Project Directory</Typography>
                            <Typography variant="body2" color="text.secondary">
                                A website built with HTML, CSS, and JavaScript which sorts a list of projects completed at CodeUp by skills and abilities.
                            </Typography>
                        </CardContent>
                        <CardActions>
                            <Button size="small" sx={{color: "black", background: "light-blue"}} variant={"contained"} onClick={() => openWebpageInNewTab('https://main.d2g2jzmwau9k9y.amplifyapp.com/')}>View Project Live</Button>
                            <Button size="small" sx={{color: "black", background: "light-blue"}} variant={"contained"} onClick={() => openWebpageInNewTab('https://github.com/MilesRaker/CodeUpPortfolio')}>View on GitHub</Button>
                        </CardActions>
                    </Card>
                </Grid>


                </Grid>
        </Container>
    );

}