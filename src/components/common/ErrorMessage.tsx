'use client';

import React from 'react';
import Alert, { AlertProps } from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';

interface ErrorMessageProps {
  title?: string;
  message: string;
  severity?: AlertProps['severity'];
  onRetry?: () => void;
  onClose?: () => void;
}

export function ErrorMessage({
  title,
  message,
  severity = 'error',
  onRetry,
  onClose,
}: ErrorMessageProps) {
  if (!message) return null;

  return (
    <Box my={2}>
      <Alert
        severity={severity}
        onClose={onClose}
        action={
          onRetry ? (
            <Button color="inherit" size="small" onClick={onRetry}>
              Retry
            </Button>
          ) : undefined
        }
      >
        {title && <AlertTitle>{title}</AlertTitle>}
        {message}
      </Alert>
    </Box>
  );
}

