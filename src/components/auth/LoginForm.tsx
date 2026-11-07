'use client';

import React, { useState, useEffect, useRef, FormEvent, ChangeEvent } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
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
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { getSafeCallbackUrl } from '@/lib/safe-callback-url';

// Re-export for callers expecting it from LoginForm
export { getSafeCallbackUrl };

export type LoginStatus = 'idle' | 'authenticating' | 'navigating' | 'navigation-recovery';
export const NAVIGATION_RECOVERY_TIMEOUT_MS = 4000;

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
  const pathname = usePathname();
  const rawCallbackUrl = searchParams.get('callbackUrl');
  const safeCallbackUrl = getSafeCallbackUrl(rawCallbackUrl);

  // Form input states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Explicit lifecycle states (Requirement S1-02)
  const [loginStatus, setLoginStatus] = useState<LoginStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ username?: string; password?: string }>({});

  const recoveryTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup recovery timer on unmount
  useEffect(() => {
    return () => {
      if (recoveryTimerRef.current) {
        clearTimeout(recoveryTimerRef.current);
      }
    };
  }, []);

  // Navigation confirmation: if route moves away from /login or reaches destination, clear status
  useEffect(() => {
    if (pathname && pathname !== '/login') {
      if (recoveryTimerRef.current) {
        clearTimeout(recoveryTimerRef.current);
      }
      setLoginStatus('idle');
    }
  }, [pathname]);

  const isBusy = loginStatus === 'authenticating' || loginStatus === 'navigating';

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

    // S1-02 Step 1: Ignore submission if already authenticating or navigating
    if (isBusy) return;

    // In recovery state, clicking submit redirects directly to safe destination
    if (loginStatus === 'navigation-recovery') {
      handleProceedToDashboard();
      return;
    }

    if (!validateForm()) {
      return;
    }

    setLoginStatus('authenticating');
    setErrorMessage(null);

    try {
      const result = await signIn('dummyjson-credentials', {
        redirect: false,
        username: username.trim(),
        password,
      });

      // S1-02 Step 2: Authentication failure -> return to idle, display error
      if (!result) {
        setErrorMessage('The authentication service is temporarily unavailable. Please try again later.');
        setLoginStatus('idle');
        return;
      }

      if (result.error) {
        setErrorMessage(mapAuthError(result.error));
        setLoginStatus('idle');
        return;
      }

      // S1-02 Step 3: Authentication success -> set to navigating
      if (result.ok) {
        setLoginStatus('navigating');

        // Initiate authoritative navigation
        try {
          window.location.assign(safeCallbackUrl);
        } catch {
          router.push(safeCallbackUrl);
        }

        // S1-02 Step 5: Navigation recovery fallback timer
        recoveryTimerRef.current = setTimeout(() => {
          setLoginStatus('navigation-recovery');
        }, NAVIGATION_RECOVERY_TIMEOUT_MS);
      } else {
        setLoginStatus('idle');
      }
    } catch {
      setErrorMessage('An unexpected error occurred during login. Please try again.');
      setLoginStatus('idle');
    }
  };

  const handleProceedToDashboard = () => {
    if (typeof window !== 'undefined') {
      window.location.assign(safeCallbackUrl);
    }
  };

  const handleFillDemo = (demoUser: string, demoPass: string) => {
    if (isBusy) return;
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
              disabled={isBusy}
            />
            <Chip
              size="small"
              label="michaelw / michaelwpass"
              variant="outlined"
              onClick={() => handleFillDemo('michaelw', 'michaelwpass')}
              clickable
              disabled={isBusy}
            />
          </Box>
        </Box>

        {/* S1-02 Navigation Recovery Alert */}
        {loginStatus === 'navigation-recovery' && (
          <Alert
            severity="info"
            sx={{ mb: 2.5 }}
            action={
              <Button
                color="primary"
                size="small"
                variant="contained"
                onClick={handleProceedToDashboard}
                endIcon={<ArrowForwardIcon />}
              >
                Proceed
              </Button>
            }
          >
            Authentication succeeded! Click Proceed to open your dashboard.
          </Alert>
        )}

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
            disabled={isBusy || loginStatus === 'navigation-recovery'}
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
            disabled={isBusy || loginStatus === 'navigation-recovery'}
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
                    disabled={isBusy || loginStatus === 'navigation-recovery'}
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
            disabled={isBusy}
            sx={{
              mt: 3,
              mb: 1,
              py: 1.25,
              position: 'relative',
            }}
          >
            {loginStatus === 'authenticating' ? (
              <>
                <CircularProgress size={22} color="inherit" sx={{ mr: 1 }} />
                Verifying credentials...
              </>
            ) : loginStatus === 'navigating' ? (
              <>
                <CircularProgress size={22} color="inherit" sx={{ mr: 1 }} />
                Opening Dashboard...
              </>
            ) : loginStatus === 'navigation-recovery' ? (
              'Proceed to Dashboard'
            ) : (
              'Sign In'
            )}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}
