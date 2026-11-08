'use client';

import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

const DRAWER_WIDTH = 260;

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen((prev) => !prev);
  };

  const handleDrawerClose = () => {
    setMobileOpen(false);
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', width: '100%', maxWidth: '100vw', overflowX: 'clip', bgcolor: 'background.default' }}>
      {/* Top Navigation Bar */}
      <Header drawerWidth={DRAWER_WIDTH} onDrawerToggle={handleDrawerToggle} />

      {/* Side Navigation Bar */}
      <Sidebar
        drawerWidth={DRAWER_WIDTH}
        mobileOpen={mobileOpen}
        onDrawerClose={handleDrawerClose}
      />

      {/* Main Content Area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          flexBasis: 0,
          minWidth: 0,
          width: 0,
          maxWidth: '100%',
          overflowX: 'clip',
          p: { xs: 1, sm: 2.5, md: 3 },
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
        }}
      >
        {/* Spacer to push content below the fixed AppBar */}
        <Toolbar sx={{ minHeight: { xs: 56, sm: 64 } }} />

        {children}
      </Box>
    </Box>
  );
}

