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

/**
 * Validates and sanitizes callback URLs to prevent open redirects, protocol-relative attacks,
 * and dangerous URI schemes.
 */
export function getSafeCallbackUrl(raw: string | null): string {
  if (!raw || typeof raw !== 'string') {
    return '/dashboard';
  }

  const trimmed = raw.trim();

  // Reject empty, protocol-relative, backslash-based, or dangerous schemes
  if (
    trimmed === '' ||
    trimmed.startsWith('//') ||
    trimmed.startsWith('/\\') ||
    trimmed.startsWith('\\') ||
    trimmed.toLowerCase().startsWith('javascript:') ||
    trimmed.toLowerCase().startsWith('data:') ||
    trimmed.toLowerCase().startsWith('vbscript:')
  ) {
    return '/dashboard';
  }

  try {
    const parsed = new URL(trimmed, 'http://localhost');

    // Must be same origin
    if (parsed.origin !== 'http://localhost') {
      return '/dashboard';
    }

    // Must start with a single slash
    if (!parsed.pathname.startsWith('/') || parsed.pathname.startsWith('//')) {
      return '/dashboard';
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return '/dashboard';
  }
}

/**
 * Standardized user-facing error message mapping.
 */
function mapAuthError(errorCode?: string | null): string {
  if (!errorCode) {
    return 'Invalid username or password. Please verify your credentials and try again.';
  }

  const normalized = errorCode.toUpperCase();

  if (
    normalized.includes('INVALID_CREDENTIALS') ||
    normalized.includes('CREDENTIALSSIGNIN') ||
    normalized.includes('CREDENTIAL')
  ) {
    return 'Invalid username or password. Please verify your credentials and try again.';
  }

  if (normalized.includes('NETWORK_ERROR')) {
    return 'Unable to reach the authentication server. Please check your internet connection and try again.';
  }

  if (normalized.includes('TIMEOUT')) {
    return 'The authentication request timed out. Please try again.';
  }

  if (normalized.includes('SERVICE_UNAVAILABLE')) {
    return 'The authentication service is temporarily unavailable. Please try again later.';
  }

  if (normalized.includes('MALFORMED_RESPONSE')) {
    return 'Authentication failed due to an unexpected server response. Please try again.';
  }

  if (normalized.includes('EMPTY_FIELDS')) {
    return 'Username and password cannot be empty or whitespace.';
  }

  return 'An unexpected authentication error occurred. Please try again.';
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawCallbackUrl = searchParams.get('callbackUrl');
  const safeCallbackUrl = getSafeCallbackUrl(rawCallbackUrl);

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

    // Prevent submission while already submitting
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
        setErrorMessage('The authentication service is temporarily unavailable. Please try again later.');
        setIsLoading(false);
        return;
      }

      if (result.error) {
        setErrorMessage(mapAuthError(result.error));
        setIsLoading(false);
        return;
      }

      if (result.ok) {
        // Perform authoritative navigation to flush client router cache
        try {
          window.location.assign(safeCallbackUrl);
        } catch {
          router.push(safeCallbackUrl);
        }

        // Safety timeout ensures loading state cannot remain permanently active
        // if browser navigation stalls or encounters an error
        setTimeout(() => {
          setIsLoading(false);
        }, 4000);
      } else {
        setIsLoading(false);
      }
    } catch {
      setErrorMessage('An unexpected error occurred during login. Please try again.');
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
