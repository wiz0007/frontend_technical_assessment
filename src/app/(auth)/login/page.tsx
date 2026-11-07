import React, { Suspense } from 'react';
import { Metadata } from 'next';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import { LoginForm } from '@/components/auth/LoginForm';
import { Loading } from '@/components/common/Loading';

export const metadata: Metadata = {
  title: 'Sign In | Help Study Abroad Admin',
  description: 'Help Study Abroad Admin Portal Authentication',
};

export default function LoginPage() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        py: { xs: 4, sm: 6 },
        px: 2,
        backgroundImage: 'radial-gradient(ellipse at top, #f1f5f9 0%, #f8fafc 100%)',
      }}
    >
      <Container maxWidth="sm">
        <Suspense fallback={<Loading message="Initializing login..." fullHeight />}>
          <LoginForm />
        </Suspense>
      </Container>
    </Box>
  );
}

