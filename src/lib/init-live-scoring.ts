/**
 * Helper function to initialize the live scoring system at app startup
 * This is separated from layout.tsx to avoid RSC vs Client Component issues
 */

// Server-side check
let isInitialized = false;

export function initLiveScoring() {
  // Only run on server-side and once
  if (typeof window === 'undefined' && !isInitialized) {
    isInitialized = true;

    // Wait for the server to fully start before initializing
    setTimeout(async () => {
      try {
        console.log('Attempting to initialize live scoring system...');
        const response = await fetch(
          'http://localhost:3000/api/cron/start-live-scoring',
          {
            method: 'POST',
            headers: {
              'x-cron-secret': process.env.CRON_SECRET || '',
            },
          }
        );

        if (response.ok) {
          console.log('Live scoring system initialized successfully');
        } else {
          console.error(
            'Failed to initialize live scoring system, status:',
            response.status
          );
        }
      } catch (error) {
        console.error('Error initializing live scoring system:', error);
      }
    }, 5000); // Wait 5 seconds after server start
  }
}
