import './globals.css';
import { Inter } from 'next/font/google';
import { Providers } from './provider';
import type { Metadata } from 'next';
import { Toaster } from 'react-hot-toast';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Play11 - Fantasy Cricket Platform',
  description: 'Create your fantasy cricket team and compete with others',
};

// Move live scoring initialization to a separate file
import { initLiveScoring } from '@/lib/init-live-scoring';
import { initWalletFixScheduler } from '@/lib/init-wallet-fix';

// Try to initialize the live scoring and wallet fix scheduler
initLiveScoring();
initWalletFixScheduler();

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>{children}</Providers>
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
