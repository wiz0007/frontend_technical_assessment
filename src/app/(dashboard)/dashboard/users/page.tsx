'use client';

import React, { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TablePagination from '@mui/material/TablePagination';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';
import Skeleton from '@mui/material/Skeleton';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import VisibilityIcon from '@mui/icons-material/Visibility';
import RefreshIcon from '@mui/icons-material/Refresh';
import PeopleOutlineIcon from '@mui/icons-material/PeopleOutline';
import { useUsersStore } from '@/store/usersStore';
import { ErrorMessage } from '@/components/common/ErrorMessage';

export default function UsersPage() {
  const users = useUsersStore((s) => s.users);
  const total = useUsersStore((s) => s.total);
  const limit = useUsersStore((s) => s.limit);
  const skip = useUsersStore((s) => s.skip);
  const searchQuery = useUsersStore((s) => s.searchQuery);
  const isLoading = useUsersStore((s) => s.isLoading);
  const error = useUsersStore((s) => s.listError);

  const setSearchQuery = useUsersStore((s) => s.setSearchQuery);
  const setPagination = useUsersStore((s) => s.setPagination);
  const fetchUsers = useUsersStore((s) => s.fetchUsers);
  const clearError = useUsersStore((s) => s.clearListError);

  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [, startTransition] = useTransition();

  // Fetch users when pagination (skip, limit) or global search query changes
  useEffect(() => {
    fetchUsers();
  }, [skip, limit, searchQuery, fetchUsers]);

  // Debounced search sync
  useEffect(() => {
    const handler = setTimeout(() => {
      if (localSearch !== searchQuery) {
        startTransition(() => {
          setSearchQuery(localSearch);
        });
      }
    }, 400);

    return () => clearTimeout(handler);
  }, [localSearch, searchQuery, setSearchQuery]);

  const handleClearSearch = () => {
    setLocalSearch('');
    setSearchQuery('');
  };

  const handleChangePage = (_: unknown, newPage: number) => {
    setPagination(newPage + 1, limit);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newLimit = parseInt(event.target.value, 10);
    setPagination(1, newLimit);
  };

  const currentPage = Math.floor(skip / limit);

  return (
    <Box>
      {/* Reserve the toolbar's space in the scrolling document; the toolbar itself is viewport-fixed. */}
      <Box aria-hidden sx={{ height: { xs: 104, sm: 72, md: 76 }, flex: '0 0 auto' }} />
      <Box
        sx={{
          position: 'fixed',
          top: { xs: 56, sm: 72, md: 76 },
          left: { xs: 8, sm: 20, md: 284 },
          right: { xs: 8, sm: 20, md: 24 },
          width: 'auto',
          zIndex: 1090,
          bgcolor: 'background.default',
          pt: { xs: 0.5, sm: 0.5 },
          pb: { xs: 1, sm: 1.5 },
          boxSizing: 'border-box',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
          <Typography variant="h5" component="h1" fontWeight={700} sx={{ flex: 1, minWidth: 0 }}>
            Users Management
          </Typography>
          <TextField
            size="small"
            placeholder="Search users..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            sx={{
              width: { xs: '100%', sm: 250, md: 320 },
              display: { xs: 'none', sm: 'block' },
              flex: { sm: '0 1 320px' },
            }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" color="action" /></InputAdornment>,
              endAdornment: localSearch ? <InputAdornment position="end"><IconButton size="small" onClick={handleClearSearch} edge="end" aria-label="Clear user search"><ClearIcon fontSize="small" /></IconButton></InputAdornment> : null,
            }}
          />
          <IconButton aria-label="Refresh users" onClick={() => fetchUsers(true)} disabled={isLoading} color="primary">
            <RefreshIcon />
          </IconButton>
        </Box>
        <TextField
          fullWidth
          size="small"
          placeholder="Search users by name, username, or email..."
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          sx={{ display: { xs: 'block', sm: 'none' }, mt: 1 }}
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" color="action" /></InputAdornment>,
            endAdornment: localSearch ? <InputAdornment position="end"><IconButton size="small" onClick={handleClearSearch} edge="end" aria-label="Clear user search"><ClearIcon fontSize="small" /></IconButton></InputAdornment> : null,
          }}
        />
      </Box>

      {/* Error Message with Retry */}
      {error && (
        <ErrorMessage
          title="Error Loading Users"
          message={error}
          onRetry={() => {
            clearError();
            fetchUsers();
          }}
        />
      )}

      {/* Users Data Table */}
      <Card elevation={0}>
        <TableContainer
          sx={{
            width: '100%',
            maxWidth: '100%',
            minWidth: 0,
            minHeight: 380,
            overflowX: 'auto',
            overflowY: 'hidden',
            WebkitOverflowScrolling: 'touch',
            overscrollBehaviorX: 'contain',
          }}
        >
          <Table sx={{ minWidth: 900, tableLayout: 'auto' }} aria-label="users table">
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell sx={{ fontWeight: 600 }}>User</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Demographics</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Company & Role</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                // Skeleton loading rows
                Array.from({ length: limit > 10 ? 10 : limit }).map((_, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1.5}>
                        <Skeleton variant="circular" width={40} height={40} />
                        <Box>
                          <Skeleton variant="text" width={120} height={20} />
                          <Skeleton variant="text" width={80} height={16} />
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell><Skeleton variant="text" width={160} /></TableCell>
                    <TableCell><Skeleton variant="text" width={90} /></TableCell>
                    <TableCell><Skeleton variant="text" width={140} /></TableCell>
                    <TableCell align="right"><Skeleton variant="rectangular" width={80} height={32} sx={{ ml: 'auto', borderRadius: 1 }} /></TableCell>
                  </TableRow>
                ))
              ) : users.length === 0 ? (
                // Empty state
                <TableRow>
                  <TableCell colSpan={5} sx={{ py: 8, textAlign: 'center' }}>
                    <PeopleOutlineIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                    <Typography variant="h6" fontWeight={600} color="text.primary">
                      No users found
                    </Typography>
                    <Typography variant="body2" color="text.secondary" mb={2}>
                      {searchQuery
                        ? `No results match your search "${searchQuery}". Try a different term or clear the filter.`
                        : 'No users are available in the system at this time.'}
                    </Typography>
                    {searchQuery && (
                      <Button variant="outlined" size="small" onClick={handleClearSearch}>
                        Clear Search
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                // User records
                users.map((user) => {
                  const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username;
                  return (
                    <TableRow key={user.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1.5}>
                          <Avatar
                            src={user.image}
                            alt={fullName}
                            sx={{ width: 40, height: 40, bgcolor: 'primary.light' }}
                          >
                            {user.firstName?.charAt(0) || 'U'}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight={600} color="text.primary">
                              {fullName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              @{user.username} &bull; ID: #{user.id}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.primary">
                          {user.email || 'N/A'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {user.phone || ''}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {user.age ? `${user.age} yrs` : 'N/A'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
                          {user.gender || ''}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          {user.company?.title || user.role || 'Member'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {user.company?.name || 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Button
                          component={Link}
                          href={`/dashboard/users/${user.id}`}
                          size="small"
                          variant="outlined"
                          startIcon={<VisibilityIcon fontSize="small" />}
                          sx={{ borderRadius: 2 }}
                        >
                          Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* API-side Table Pagination */}
        <TablePagination
          rowsPerPageOptions={[5, 10, 20]}
          component="div"
          count={total}
          rowsPerPage={limit}
          page={currentPage}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="Users per page:"
          disabled={isLoading}
          sx={{
            width: '100%',
            maxWidth: '100%',
            overflowX: 'hidden',
            '& .MuiTablePagination-toolbar': {
              flexWrap: 'wrap',
              justifyContent: { xs: 'center', sm: 'flex-end' },
              minHeight: { xs: 72, sm: 52 },
              px: { xs: 1, sm: 2 },
            },
            '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
              my: { xs: 0.5, sm: 2 },
            },
          }}
        />
      </Card>
    </Box>
  );
}

