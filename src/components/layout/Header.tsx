'use client';

import React, { useState } from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Avatar from '@mui/material/Avatar';
import Tooltip from '@mui/material/Tooltip';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import MenuIcon from '@mui/icons-material/Menu';
import LogoutIcon from '@mui/icons-material/Logout';
import CircularProgress from '@mui/material/CircularProgress';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import { signOut } from 'next-auth/react';
import { useAuthStore } from '@/store/authStore';

interface HeaderProps {
  drawerWidth: number;
  onDrawerToggle: () => void;
}

export function Header({ drawerWidth, onDrawerToggle }: HeaderProps) {
  const user = useAuthStore((s) => s.user);
  const clearAuthState = useAuthStore((s) => s.clearAuthState);

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  const handleOpenUserMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseUserMenu = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    if (isLoggingOut) return;
    handleCloseUserMenu();
    setIsLoggingOut(true);
    setLogoutError(null);

    try {
      // 1. Terminate NextAuth session cookie on server
      await signOut({
        redirect: false,
        callbackUrl: '/login',
      });

      // 2. Clear application-level client Zustand state
      clearAuthState();

      // 3. Perform hard redirect to /login to flush in-memory Next.js router cache
      // and prevent stale authenticated content on browser back navigation
      window.location.href = '/login';
    } catch {
      // If sign-out fails, do NOT claim logout succeeded; notify user and allow retry
      setIsLoggingOut(false);
      setLogoutError('Failed to sign out. Please check your network and try again.');
    }
  };

  const displayName = user
    ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username
    : 'Admin User';

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        width: { md: `calc(100% - ${drawerWidth}px)` },
        ml: { md: `${drawerWidth}px` },
        bgcolor: 'background.paper',
        color: 'text.primary',
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Toolbar sx={{ minHeight: { xs: 56, sm: 64 }, px: { xs: 2, sm: 3 } }}>
        <IconButton
          color="inherit"
          aria-label="open drawer"
          edge="start"
          onClick={onDrawerToggle}
          sx={{ mr: 2, display: { md: 'none' } }}
        >
          <MenuIcon />
        </IconButton>

        <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1, fontWeight: 600 }}>
          Admin Dashboard
        </Typography>

        {/* User profile & actions */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ display: { xs: 'none', sm: 'block' }, textAlign: 'right' }}>
            <Typography variant="body2" fontWeight={600} color="text.primary">
              {displayName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {user?.email || 'admin@helpstudyabroad.com'}
            </Typography>
          </Box>

          <Tooltip title="User Account">
            <IconButton onClick={handleOpenUserMenu} sx={{ p: 0.5 }}>
              <Avatar
                alt={displayName}
                src={user?.image || undefined}
                sx={{
                  width: 40,
                  height: 40,
                  bgcolor: 'primary.main',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  border: '2px solid',
                  borderColor: 'primary.light',
                }}
              >
                {user?.firstName?.charAt(0) || user?.username?.charAt(0)?.toUpperCase() || 'A'}
              </Avatar>
            </IconButton>
          </Tooltip>

          <Menu
            sx={{ mt: '45px' }}
            id="menu-appbar"
            anchorEl={anchorEl}
            anchorOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            keepMounted
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            open={Boolean(anchorEl)}
            onClose={handleCloseUserMenu}
            PaperProps={{
              elevation: 3,
              sx: {
                minWidth: 200,
                borderRadius: 2,
                mt: 1,
                border: '1px solid',
                borderColor: 'divider',
              },
            }}
          >
            <Box px={2} py={1}>
              <Typography variant="subtitle2" noWrap fontWeight={600}>
                {displayName}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap display="block">
                @{user?.username || 'admin'}
              </Typography>
            </Box>
            <Divider />
            <MenuItem onClick={handleLogout} disabled={isLoggingOut} sx={{ py: 1, color: 'error.main' }}>
              <ListItemIcon sx={{ color: 'error.main' }}>
                {isLoggingOut ? <CircularProgress size={18} color="inherit" /> : <LogoutIcon fontSize="small" />}
              </ListItemIcon>
              <ListItemText primary={isLoggingOut ? 'Signing out...' : 'Sign Out'} primaryTypographyProps={{ variant: 'body2' }} />
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>

      {/* Logout error notification */}
      <Snackbar
        open={Boolean(logoutError)}
        autoHideDuration={6000}
        onClose={() => setLogoutError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={() => setLogoutError(null)} sx={{ width: '100%' }}>
          {logoutError}
        </Alert>
      </Snackbar>
    </AppBar>
  );
}

