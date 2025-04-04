/**
 * CLEAR NEXT-AUTH SESSIONS
 *
 * If you're having issues with admin access even after logging out and back in,
 * you may need to completely clear your cookies and sessions. This script provides
 * instructions for doing so.
 *
 * INSTRUCTIONS:
 *
 * 1. Browser method:
 *    - Chrome: Open DevTools (F12) → Application → Cookies → http://localhost:3000
 *    - Firefox: Open DevTools (F12) → Storage → Cookies → http://localhost:3000
 *    - Edge: Open DevTools (F12) → Application → Cookies → http://localhost:3000
 *    - Delete all cookies related to next-auth:
 *      - next-auth.callback-url
 *      - next-auth.csrf-token
 *      - next-auth.session-token
 *
 * 2. Restart the development server:
 *    - Stop the server (Ctrl+C in terminal)
 *    - Start it again: npm run dev
 *
 * 3. Sign in with admin credentials:
 *    - Email: admin@play11.com
 *    - Password: admin123
 *
 * 4. Verify admin access:
 *    - Navigate to http://localhost:3000/admin/settings
 *    - You should now have proper admin access
 *
 * TROUBLESHOOTING:
 *
 * If you're still having issues:
 * 1. Ensure the admin user exists with the correct role:
 *    - Run: npx ts-node scripts/create-admin-user.ts
 *
 * 2. Check console logs for session data:
 *    - Look for logs showing user role and admin check results
 *
 * 3. Try a different browser or incognito/private window
 */

console.log('Session clearing instructions file created.');
console.log(
  'Please read scripts/clear-sessions.js for details on how to clear your sessions.'
);
