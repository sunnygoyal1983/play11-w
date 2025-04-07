/**
 * Helper function to initialize the wallet transaction fix scheduler at app startup
 * This is separated to avoid RSC vs Client Component issues
 */

// Server-side check
let isInitialized = false;

export function initWalletFixScheduler() {
  console.log('[WALLET-FIX] Initializing wallet fix scheduler...');

  // Only run on server-side and once
  if (typeof window === 'undefined' && !isInitialized) {
    console.log('[WALLET-FIX] Server-side detected, will initialize scheduler');
    isInitialized = true;

    // Wait for the server to fully start before initializing
    console.log('[WALLET-FIX] Setting timeout for 10 seconds before startup');
    setTimeout(async () => {
      try {
        console.log(
          '[WALLET-FIX] Timeout complete, attempting to start scheduler'
        );
        // Dynamically import to avoid issues with SSR
        const { startWalletFixScheduler } = await import(
          '@/services/wallet-fix-scheduler'
        );

        console.log(
          '[WALLET-FIX] Starting wallet transaction fix scheduler...'
        );
        // Start with 15 minute interval in development, 60 in production
        const intervalMinutes = process.env.NODE_ENV === 'development' ? 1 : 1;

        // Run immediately on startup
        console.log(
          '[WALLET-FIX] Calling startWalletFixScheduler with interval:',
          intervalMinutes
        );
        const success = await startWalletFixScheduler(intervalMinutes);

        if (success) {
          console.log(
            `[WALLET-FIX] Wallet transaction fix scheduler started successfully (interval: ${intervalMinutes} minutes)`
          );
        } else {
          console.error(
            '[WALLET-FIX] Failed to start wallet transaction fix scheduler'
          );
        }
      } catch (error) {
        console.error(
          '[WALLET-FIX] Error starting wallet transaction fix scheduler:',
          error
        );
      }
    }, 10000); // Wait 10 seconds after server start (after live scoring is initialized)
  } else {
    if (typeof window !== 'undefined') {
      console.log(
        '[WALLET-FIX] Client-side environment detected, scheduler not started'
      );
    } else if (isInitialized) {
      console.log('[WALLET-FIX] Scheduler already initialized, skipping');
    }
  }
}
