import React, { useEffect } from 'react';
import Box from '@mui/material/Box';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import { Link, useLocation } from 'react-router-dom';

export default function NavTabsHoriztonal() {
      // if on the homepage, do not focus a tab
    // otherwise, focus on current tab
  const location = useLocation();

  const [value, setValue] = React.useState(false);

  useEffect(() => {
    switch(location.pathname){
      case '/':
        setValue(false);
        break;
      case '/resume':
        setValue(0);
        break;
      case '/values':
        setValue(1);
        break;
      case '/contact':
        setValue(2);
        break;
      default :
        setValue(false);
        break;
    }
  },[location])
  
  return (
    <Box sx={{ width: '100%' }}>
      <Tabs value={value} 
      aria-label="nav tabs"
      orientation="horizontal"
      textColor="secondary"
      indicatorColor="secondary"
      >
        <Tab label="Resume" key="Resume" component={Link} to={"/resume"} />
        <Tab label="Values" key="Values" component={Link} to={"/values"} />
        <Tab label="Contact" key="Contact" component={Link} to={"/contact"} />
      </Tabs>
    </Box>
  );
}