'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import PhoneOutlinedIcon from '@mui/icons-material/PhoneOutlined';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import { useUsersStore } from '@/store/usersStore';
import { Loading } from '@/components/common/Loading';
import { ErrorMessage } from '@/components/common/ErrorMessage';

export default function UserDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const selectedUser = useUsersStore((s) => s.selectedUser);
  const isLoading = useUsersStore((s) => s.isLoadingDetail);
  const error = useUsersStore((s) => s.error);
  const fetchUserById = useUsersStore((s) => s.fetchUserById);
  const clearSelectedUser = useUsersStore((s) => s.clearSelectedUser);

  useEffect(() => {
    if (id) {
      fetchUserById(id);
    }
    return () => {
      clearSelectedUser();
    };
  }, [id, fetchUserById, clearSelectedUser]);

  if (isLoading) {
    return <Loading message="Loading user profile..." fullHeight />;
  }

  if (error || !selectedUser) {
    return (
      <Box py={4}>
        <Button
          component={Link}
          href="/dashboard/users"
          startIcon={<ArrowBackIcon />}
          sx={{ mb: 3 }}
        >
          Back to Users
        </Button>
        <ErrorMessage
          title="User Not Found"
          message={error || `Unable to load details for user #${id}.`}
          onRetry={() => fetchUserById(id)}
        />
      </Box>
    );
  }

  const fullName = `${selectedUser.firstName || ''} ${selectedUser.lastName || ''}`.trim() || selectedUser.username;
  const address = selectedUser.address;
  const company = selectedUser.company;

  return (
    <Box>
      {/* Navigation Header */}
      <Box mb={3} display="flex" alignItems="center" gap={2}>
        <Button
          component={Link}
          href="/dashboard/users"
          variant="outlined"
          size="small"
          startIcon={<ArrowBackIcon />}
          sx={{ borderRadius: 2 }}
        >
          Back to Users
        </Button>
      </Box>

      {/* Hero Profile Card */}
      <Card elevation={0} sx={{ p: { xs: 2.5, sm: 3 }, mb: 3 }}>
        <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} gap={3}>
          <Avatar
            src={selectedUser.image}
            alt={fullName}
            sx={{
              width: { xs: 80, sm: 96 },
              height: { xs: 80, sm: 96 },
              bgcolor: 'primary.main',
              fontSize: '2rem',
              fontWeight: 700,
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            }}
          >
            {selectedUser.firstName?.charAt(0) || 'U'}
          </Avatar>

          <Box sx={{ flexGrow: 1 }}>
            <Box display="flex" alignItems="center" gap={1.5} flexWrap="wrap">
              <Typography variant="h5" component="h1" fontWeight={700}>
                {fullName}
              </Typography>
              <Chip
                label={`User ID: #${selectedUser.id}`}
                size="small"
                variant="outlined"
                sx={{ fontWeight: 600 }}
              />
              {selectedUser.role && (
                <Chip
                  label={selectedUser.role.toUpperCase()}
                  size="small"
                  color="primary"
                  sx={{ fontWeight: 600, fontSize: '0.7rem' }}
                />
              )}
            </Box>

            <Typography variant="body2" color="text.secondary" mt={0.5}>
              @{selectedUser.username} {selectedUser.maidenName && `(née ${selectedUser.maidenName})`}
            </Typography>

            <Box display="flex" flexWrap="wrap" gap={2} mt={1.5}>
              {selectedUser.email && (
                <Box display="flex" alignItems="center" gap={0.5}>
                  <EmailOutlinedIcon fontSize="small" color="action" />
                  <Typography variant="body2">{selectedUser.email}</Typography>
                </Box>
              )}
              {selectedUser.phone && (
                <Box display="flex" alignItems="center" gap={0.5}>
                  <PhoneOutlinedIcon fontSize="small" color="action" />
                  <Typography variant="body2">{selectedUser.phone}</Typography>
                </Box>
              )}
            </Box>
          </Box>
        </Box>
      </Card>

      {/* Structured Details Grid */}
      <Grid container spacing={3}>
        {/* Personal Details */}
        <Grid item xs={12} md={6}>
          <Card elevation={0} sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <PersonOutlineIcon color="primary" />
                <Typography variant="h6" fontWeight={600}>
                  Personal Information
                </Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />

              <Box display="flex" flexDirection="column" gap={1.5}>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">Age</Typography>
                  <Typography variant="body2" fontWeight={500}>{selectedUser.age || 'N/A'}</Typography>
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">Gender</Typography>
                  <Typography variant="body2" fontWeight={500} sx={{ textTransform: 'capitalize' }}>
                    {selectedUser.gender || 'N/A'}
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">Birth Date</Typography>
                  <Typography variant="body2" fontWeight={500}>{selectedUser.birthDate || 'N/A'}</Typography>
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">Blood Group</Typography>
                  <Typography variant="body2" fontWeight={500}>{selectedUser.bloodGroup || 'N/A'}</Typography>
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">Height / Weight</Typography>
                  <Typography variant="body2" fontWeight={500}>
                    {selectedUser.height ? `${selectedUser.height} cm` : 'N/A'} / {selectedUser.weight ? `${selectedUser.weight} kg` : 'N/A'}
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">Eye Color / Hair</Typography>
                  <Typography variant="body2" fontWeight={500}>
                    {selectedUser.eyeColor || 'N/A'} &bull; {selectedUser.hair ? `${selectedUser.hair.color} (${selectedUser.hair.type})` : 'N/A'}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Professional & Company */}
        <Grid item xs={12} md={6}>
          <Card elevation={0} sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <BusinessOutlinedIcon color="primary" />
                <Typography variant="h6" fontWeight={600}>
                  Employment & Company
                </Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />

              <Box display="flex" flexDirection="column" gap={1.5}>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">Company</Typography>
                  <Typography variant="body2" fontWeight={600}>{company?.name || 'N/A'}</Typography>
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">Department</Typography>
                  <Typography variant="body2" fontWeight={500}>{company?.department || 'N/A'}</Typography>
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">Job Title</Typography>
                  <Typography variant="body2" fontWeight={500}>{company?.title || 'N/A'}</Typography>
                </Box>
                {company?.address && (
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">Office Location</Typography>
                    <Typography variant="body2" fontWeight={500} textAlign="right">
                      {company.address.city}, {company.address.state}
                    </Typography>
                  </Box>
                )}
              </Box>

              {/* Education */}
              <Box display="flex" alignItems="center" gap={1} mt={4} mb={2}>
                <SchoolOutlinedIcon color="primary" />
                <Typography variant="h6" fontWeight={600}>
                  Education
                </Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />

              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">University</Typography>
                <Typography variant="body2" fontWeight={500} textAlign="right">
                  {selectedUser.university || 'N/A'}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Address & Residential Location */}
        <Grid item xs={12}>
          <Card elevation={0}>
            <CardContent sx={{ p: 3 }}>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <LocationOnOutlinedIcon color="primary" />
                <Typography variant="h6" fontWeight={600}>
                  Residential Address
                </Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="caption" color="text.secondary" display="block">STREET</Typography>
                  <Typography variant="body2" fontWeight={500}>{address?.address || 'N/A'}</Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="caption" color="text.secondary" display="block">CITY</Typography>
                  <Typography variant="body2" fontWeight={500}>{address?.city || 'N/A'}</Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="caption" color="text.secondary" display="block">STATE / POSTAL</Typography>
                  <Typography variant="body2" fontWeight={500}>
                    {address?.state || 'N/A'} {address?.postalCode ? `(${address.postalCode})` : ''}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="caption" color="text.secondary" display="block">COUNTRY</Typography>
                  <Typography variant="body2" fontWeight={500}>{address?.country || 'United States'}</Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

