import React from 'react';
import type { Metadata } from 'next';
import { AppProviders } from '@/providers/AppProviders';

export const metadata: Metadata = {
  title: 'Help Study Abroad - Admin Portal',
  description: 'Technical assessment admin dashboard foundation with NextAuth and Zustand',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}

