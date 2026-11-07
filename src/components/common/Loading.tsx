'use client';

import React from 'react';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';

interface LoadingProps {
  message?: string;
  size?: number;
  fullHeight?: boolean;
}

export function Loading({
  message = 'Loading...',
  size = 40,
  fullHeight = false,
}: LoadingProps) {
  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      py={fullHeight ? 0 : 6}
      minHeight={fullHeight ? '60vh' : 'auto'}
      gap={2}
    >
      <CircularProgress size={size} color="primary" />
      {message && (
        <Typography variant="body2" color="text.secondary">
          {message}
        </Typography>
      )}
    </Box>
  );
}

