'use client';

import React, { useState, FormEvent, ChangeEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import SchoolIcon from '@mui/icons-material/School';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';

  // Form states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Status and error states
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ username?: string; password?: string }>({});

  const validateForm = (): boolean => {
    const errors: { username?: string; password?: string } = {};

    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
      errors.username = 'Username is required';
    } else if (trimmedUsername.length < 2) {
      errors.username = 'Username must be at least 2 characters';
    }

    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 4) {
      errors.password = 'Password must be at least 4 characters';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleUsernameChange = (e: ChangeEvent<HTMLInputElement>) => {
    setUsername(e.target.value);
    if (fieldErrors.username) {
      setFieldErrors((prev) => ({ ...prev, username: undefined }));
    }
    if (errorMessage) setErrorMessage(null);
  };

  const handlePasswordChange = (e: ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (fieldErrors.password) {
      setFieldErrors((prev) => ({ ...prev, password: undefined }));
    }
    if (errorMessage) setErrorMessage(null);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Prevent submission while already submitting or loading
    if (isLoading) return;

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const result = await signIn('dummyjson-credentials', {
        redirect: false,
        username: username.trim(),
        password,
      });

      if (!result) {
        setErrorMessage('Authentication service is currently unavailable. Please try again.');
        setIsLoading(false);
        return;
      }

      if (result.error) {
        // DummyJSON returns 'Invalid credentials' or custom message
        const isCredentialMismatch =
          result.error.toLowerCase().includes('credential') ||
          result.error === 'CredentialsSignin';

        setErrorMessage(
          isCredentialMismatch
            ? 'Invalid username or password. Please verify your credentials and try again.'
            : result.error
        );
        setIsLoading(false);
        return;
      }

      if (result.ok) {
        // Safe redirect to callbackUrl or /dashboard
        const safeTarget =
          callbackUrl.startsWith('/') && !callbackUrl.startsWith('//')
            ? callbackUrl
            : '/dashboard';
        router.push(safeTarget);
        router.refresh();
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'An unexpected error occurred during login.';
      setErrorMessage(message);
      setIsLoading(false);
    }
  };

  const handleFillDemo = (demoUser: string, demoPass: string) => {
    setUsername(demoUser);
    setPassword(demoPass);
    setFieldErrors({});
    setErrorMessage(null);
  };

  return (
    <Card
      elevation={0}
      sx={{
        width: '100%',
        maxWidth: 440,
        mx: 'auto',
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
        backgroundColor: 'background.paper',
        boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.08)',
      }}
    >
      <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
        {/* Branding & Header */}
        <Box textAlign="center" mb={3}>
          <Box
            sx={{
              display: 'inline-flex',
              p: 1.5,
              borderRadius: 2,
              bgcolor: 'primary.light',
              color: 'primary.contrastText',
              mb: 1.5,
            }}
          >
            <SchoolIcon fontSize="large" />
          </Box>
          <Typography variant="h5" component="h1" fontWeight={700} color="text.primary">
            Help Study Abroad
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            Admin Portal &bull; Sprint 1 Foundation
          </Typography>
        </Box>

        {/* Demo credentials hint for testing */}
        <Box
          sx={{
            mb: 3,
            p: 1.5,
            bgcolor: 'action.hover',
            borderRadius: 2,
            border: '1px dashed',
            borderColor: 'divider',
          }}
        >
          <Typography variant="caption" display="block" color="text.secondary" mb={1} fontWeight={600}>
            DEMO CREDENTIALS (DUMMYJSON API):
          </Typography>
          <Box display="flex" gap={1} flexWrap="wrap">
            <Chip
              size="small"
              label="emilys / emilyspass"
              color="primary"
              variant="outlined"
              onClick={() => handleFillDemo('emilys', 'emilyspass')}
              clickable
            />
            <Chip
              size="small"
              label="michaelw / michaelwpass"
              variant="outlined"
              onClick={() => handleFillDemo('michaelw', 'michaelwpass')}
              clickable
            />
          </Box>
        </Box>

        {/* Error message alert */}
        {errorMessage && (
          <Alert severity="error" sx={{ mb: 2.5 }} onClose={() => setErrorMessage(null)}>
            {errorMessage}
          </Alert>
        )}

        {/* Login Form */}
        <Box component="form" onSubmit={handleSubmit} noValidate>
          <TextField
            margin="normal"
            required
            fullWidth
            id="username"
            label="Username"
            name="username"
            autoComplete="username"
            autoFocus
            value={username}
            onChange={handleUsernameChange}
            error={Boolean(fieldErrors.username)}
            helperText={fieldErrors.username}
            disabled={isLoading}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <PersonOutlineIcon color="action" fontSize="small" />
                </InputAdornment>
              ),
            }}
          />

          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="Password"
            type={showPassword ? 'text' : 'password'}
            id="password"
            autoComplete="current-password"
            value={password}
            onChange={handlePasswordChange}
            error={Boolean(fieldErrors.password)}
            helperText={fieldErrors.password}
            disabled={isLoading}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LockOutlinedIcon color="action" fontSize="small" />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle password visibility"
                    onClick={() => setShowPassword((prev) => !prev)}
                    edge="end"
                    size="small"
                  >
                    {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={isLoading}
            sx={{
              mt: 3,
              mb: 1,
              py: 1.25,
              position: 'relative',
            }}
          >
            {isLoading ? (
              <>
                <CircularProgress size={24} color="inherit" sx={{ mr: 1 }} />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}

