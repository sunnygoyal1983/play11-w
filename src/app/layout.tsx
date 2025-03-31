"use client";

import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import SessionWrapper from '@/components/SessionWrapper';
import ToastWrapper from '@/components/ToastWrapper';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Play11 - Fantasy Cricket Platform',
  description: 'Create your fantasy cricket team and compete with others',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <SessionWrapper>
          {children}
        </SessionWrapper>
        <ToastWrapper />
      </body>
    </html>
  );
}
