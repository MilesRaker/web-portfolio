import { AppBar, Button, Container, Stack, Toolbar, Typography } from '@mui/material';
import CallIcon from '@mui/icons-material/Call';
import EmailIcon from '@mui/icons-material/Email';
import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import Logo from './Logo.png';
import NavTabsVertical from './NavTabsVertical';
import NavTabsHoriztonal from './NavTabsHorizontal';

const PHONE_HREF = 'tel:+13606068381';
const EMAIL_HREF = 'mailto:MilesRaker@gmail.com';

class TopBar extends Component{ 
    
    constructor(props){
        super(props);
        this.state = {
            windowWidth: 0,
            windowHeight: 0
        };
        this.updateDimensions = this.updateDimensions.bind(this);
    }

    componentDidMount() {
        this.updateDimensions();
        window.addEventListener("resize", this.updateDimensions);
    }

    componentWillUnmount(){
        window.removeEventListener("resize", this.updateDimensions);
    }

    updateDimensions() {
        let windowWidth = typeof window !== "undefined" ? window.innerWidth : 0;
        let windowHeight = typeof window !== "undefined" ? window.innerHeight : 0;

        this.setState({ windowWidth, windowHeight })
    }

    render(){
        const { windowWidth } = this.state;
        
        const styles = {
            showFullName: windowWidth > 975,
            showVerticalTabs: windowWidth < 725,
            showContactText: windowWidth > 900
        }

        return(

            <AppBar position='static' >
                <Toolbar sx={{ flexWrap: 'wrap', gap: 1 }}>

                    <Link to='/'>
                        <img src={Logo} height="75" alt='Rocket Idea Logo' />
                    </Link>

                    <Stack sx={{ flexGrow: 1, minWidth: { xs: 220, sm: 360 } }}>
                        <Container>
                            {styles.showFullName ? (
                                <Typography  align='left' noWrap variant='h1'>Miles Raker</Typography>
                            ) : (
                                <Typography  align='left' variant='h1'>Raker</Typography>
                            )}
                        </Container>
                        <Container>
                        {styles.showFullName ? (
                            <Typography align='left' noWrap variant='subtitle1'>
                                Aerospace Electrical Engineer | Active Secret Clearance | Palmdale, CA
                            </Typography>
                            ) : (
                            <Typography align='center' noWrap variant='subtitle1'>
                                Aerospace Electrical Engineer | Active Secret Clearance | Palmdale, CA
                            </Typography>
                            )}
                        </Container>

                    </Stack>

                    <Stack
                        direction="row"
                        spacing={1}
                        sx={{
                            flexWrap: 'wrap',
                            justifyContent: { xs: 'center', md: 'flex-end' },
                            order: { xs: 3, md: 2 },
                            width: { xs: '100%', md: 'auto' }
                        }}
                    >
                        <Button
                            color="secondary"
                            variant="contained"
                            size="small"
                            startIcon={<CallIcon />}
                            href={PHONE_HREF}
                            aria-label="Call Miles Raker at (360) 606-8381"
                        >
                            {styles.showContactText ? '(360) 606-8381' : 'Call'}
                        </Button>
                        <Button
                            color="secondary"
                            variant="outlined"
                            size="small"
                            startIcon={<EmailIcon />}
                            href={EMAIL_HREF}
                            aria-label="Email Miles Raker"
                            sx={{
                                bgcolor: 'background.paper',
                                borderColor: 'secondary.main',
                                color: 'secondary.main',
                                '&:hover': {
                                    borderColor: 'secondary.main',
                                    bgcolor: 'background.paper'
                                }
                            }}
                        >
                            {styles.showContactText ? 'MilesRaker@gmail.com' : 'Email'}
                        </Button>
                    </Stack>
                    
                
                    <Container sx={{ order: { xs: 2, md: 3 }, width: { xs: 'auto', md: 'auto' } }} >                     
                        {styles.showVerticalTabs ? (
                            <NavTabsVertical />                        
                        ) : (             
                            <NavTabsHoriztonal />      
                        )}
                    </Container>


                </Toolbar>
            </AppBar>

        )
    }
}

export default TopBar;
