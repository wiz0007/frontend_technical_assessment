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
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import SyncAltIcon from '@mui/icons-material/SyncAlt';
import SecurityIcon from '@mui/icons-material/Security';
import LayersIcon from '@mui/icons-material/Layers';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { Loading } from '@/components/common/Loading';

export default function DashboardPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (isLoading) {
    return <Loading message="Resolving authenticated session..." fullHeight />;
  }

  // Fallback for unauthenticated access (in addition to middleware protection)
  if (!isAuthenticated || !user) {
    return (
      <Box py={4} maxWidth={600} mx="auto">
        <Alert
          severity="warning"
          action={
            <Button color="inherit" size="small" onClick={() => router.push('/login')}>
              Go to Login
            </Button>
          }
        >
          No active session detected. Please sign in to view the dashboard.
        </Alert>
      </Box>
    );
  }

  const fullName =
    [user.firstName, user.lastName].filter(Boolean).join(' ') ||
    user.username ||
    'Admin User';

  const formattedGender = user.gender
    ? user.gender.charAt(0).toUpperCase() + user.gender.slice(1)
    : 'Not provided';

  return (
    <Box>
      {/* Welcome Banner */}
      <Box mb={4}>
        <Box display="flex" alignItems="center" gap={1.5} mb={1} flexWrap="wrap">
          <Typography variant="h4" component="h1" fontWeight={700} color="text.primary">
            Welcome back, {fullName}!
          </Typography>
          <Chip
            label={isAuthenticated ? 'Active Session' : 'Unauthenticated'}
            color={isAuthenticated ? 'success' : 'default'}
            size="small"
            icon={<CheckCircleOutlineIcon />}
            sx={{ fontWeight: 600 }}
          />
        </Box>
        <Typography variant="body1" color="text.secondary">
          Help Study Abroad Admin Dashboard &mdash; Sprint 1 Foundation Architecture.
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
                Session identity retrieved from DummyJSON authentication provider.
              </Typography>

              <Box display="flex" alignItems="center" gap={2} mb={3}>
                <Avatar
                  src={user.image || undefined}
                  alt={fullName}
                  sx={{
                    width: 64,
                    height: 64,
                    bgcolor: 'primary.main',
                    fontSize: '1.5rem',
                    fontWeight: 700,
                  }}
                >
                  {user.firstName?.charAt(0) || user.username?.charAt(0)?.toUpperCase() || 'U'}
                </Avatar>
                <Box>
                  <Typography variant="subtitle1" fontWeight={700}>
                    {fullName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    @{user.username}
                  </Typography>
                  <Chip
                    label={`ID: #${user.id}`}
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
                    {user.email || 'Not provided'}
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Gender
                  </Typography>
                  <Typography variant="body2" fontWeight={500}>
                    {formattedGender}
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Session Status
                  </Typography>
                  <Typography variant="body2" fontWeight={600} color="success.main">
                    Authenticated
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Zustand Sync
                  </Typography>
                  <Typography
                    variant="body2"
                    fontWeight={600}
                    color={isAuthenticated ? 'success.main' : 'error.main'}
                  >
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
                Sprint 1 Architecture Status
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={3}>
                Core operational layers initialized for subsequent development phases.
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
                        Authentication Provider
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      Connected to DummyJSON official endpoint with credentials validation and runtime payload verification.
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
                        Session Authority
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      NextAuth session authority seamlessly mirrored into client-side Zustand store without token leakage.
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
                        Server Route Protection
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      Edge middleware validates JWT tokens for all /dashboard/* routes and guards unauthenticated entry.
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
                      <LayersIcon color="primary" fontSize="small" />
                      <Typography variant="subtitle2" fontWeight={600}>
                        Sprint 2 Foundation
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      Modular structure prepared for Users and Products modules without architectural restructuring.
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
