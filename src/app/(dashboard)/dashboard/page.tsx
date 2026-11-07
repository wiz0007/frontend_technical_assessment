'use client';

import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import Avatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import SyncAltIcon from '@mui/icons-material/SyncAlt';
import SecurityIcon from '@mui/icons-material/Security';
import { useAuthStore } from '@/store/authStore';
import { Loading } from '@/components/common/Loading';

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (isLoading && !user) {
    return <Loading message="Loading dashboard session..." fullHeight />;
  }

  const fullName = user
    ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username
    : 'Admin User';

  return (
    <Box>
      {/* Welcome Banner */}
      <Box mb={4}>
        <Box display="flex" alignItems="center" gap={1.5} mb={1}>
          <Typography variant="h4" component="h1" fontWeight={700} color="text.primary">
            Welcome back, {fullName}!
          </Typography>
          <Chip
            label="Authenticated"
            color="success"
            size="small"
            icon={<CheckCircleOutlineIcon />}
            sx={{ fontWeight: 600 }}
          />
        </Box>
        <Typography variant="body1" color="text.secondary">
          Help Study Abroad Admin Dashboard &mdash; Sprint 1 Foundation is active and verified.
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* User Profile Overview */}
        <Grid item xs={12} md={5}>
          <Card elevation={0}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Authenticated Profile
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={3}>
                Profile data retrieved from DummyJSON authentication endpoint.
              </Typography>

              <Box display="flex" alignItems="center" gap={2} mb={3}>
                <Avatar
                  src={user?.image || undefined}
                  alt={fullName}
                  sx={{
                    width: 64,
                    height: 64,
                    bgcolor: 'primary.main',
                    fontSize: '1.5rem',
                    fontWeight: 700,
                  }}
                >
                  {user?.firstName?.charAt(0) || user?.username?.charAt(0)?.toUpperCase() || 'U'}
                </Avatar>
                <Box>
                  <Typography variant="subtitle1" fontWeight={700}>
                    {fullName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    @{user?.username}
                  </Typography>
                  <Chip
                    label={`User ID: #${user?.id}`}
                    size="small"
                    variant="outlined"
                    sx={{ mt: 0.5, height: 22, fontSize: '0.75rem' }}
                  />
                </Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Box display="flex" flexDirection="column" gap={1.5}>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Email Address
                  </Typography>
                  <Typography variant="body2" fontWeight={500}>
                    {user?.email || 'N/A'}
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Gender
                  </Typography>
                  <Typography variant="body2" fontWeight={500} sx={{ textTransform: 'capitalize' }}>
                    {user?.gender || 'N/A'}
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    NextAuth Status
                  </Typography>
                  <Typography variant="body2" fontWeight={600} color="success.main">
                    Active Session
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Zustand Sync
                  </Typography>
                  <Typography variant="body2" fontWeight={600} color={isAuthenticated ? 'success.main' : 'error.main'}>
                    {isAuthenticated ? 'Synchronized' : 'Desynchronized'}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Foundation & Architecture Status */}
        <Grid item xs={12} md={7}>
          <Card elevation={0} sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Sprint 1 Foundation Status
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={3}>
                Core architectural layers initialized and operational.
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: 'divider',
                      bgcolor: 'action.hover',
                    }}
                  >
                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                      <VerifiedUserIcon color="primary" fontSize="small" />
                      <Typography variant="subtitle2" fontWeight={600}>
                        Authentication API
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      Connected to DummyJSON official endpoint with credentials validation and token payload processing.
                    </Typography>
                  </Box>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: 'divider',
                      bgcolor: 'action.hover',
                    }}
                  >
                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                      <SyncAltIcon color="primary" fontSize="small" />
                      <Typography variant="subtitle2" fontWeight={600}>
                        State Synchronization
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      NextAuth session authority seamlessly mirrored into client-side Zustand store for reactive UI consumption.
                    </Typography>
                  </Box>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: 'divider',
                      bgcolor: 'action.hover',
                    }}
                  >
                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                      <SecurityIcon color="primary" fontSize="small" />
                      <Typography variant="subtitle2" fontWeight={600}>
                        Route Protection
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      Edge middleware verifies JWT tokens for all /dashboard/* routes and guards against unauthenticated access.
                    </Typography>
                  </Box>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: 'divider',
                      bgcolor: 'action.hover',
                    }}
                  >
                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                      <CheckCircleOutlineIcon color="primary" fontSize="small" />
                      <Typography variant="subtitle2" fontWeight={600}>
                        Sprint 2 Ready
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      Clean architecture ready for Users and Products modules without requiring structural rewrites.
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

