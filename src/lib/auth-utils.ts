import type { Session } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';

/**
 * Helper function to determine if a user is an admin
 * @param email The user's email address
 * @returns A boolean indicating if the user is an admin
 */
export function isAdminUser(email: string): boolean {
  // For client-side checks, we still need a simple way to check
  // This will be called from the client who doesn't have direct DB access
  const adminEmails = ['admin@play11.com', 'admin@example.com'];
  return adminEmails.includes(email);
}

/**
 * Helper function to check a user's role value
 * This function handles both string enum values and actual UserRole enum
 */
export function isAdminRole(role: any): boolean {
  // Check if it's the UserRole enum
  if (role === UserRole.ADMIN) {
    return true;
  }

  // Check if it's a string value
  if (
    typeof role === 'string' &&
    (role === 'ADMIN' || role === UserRole.ADMIN)
  ) {
    return true;
  }

  return false;
}

/**
 * Function to check if a user is authenticated and is an admin
 * @param session The user's session
 * @returns A boolean indicating if the user is authenticated and is an admin
 */
export async function isAuthenticatedAdmin(
  session: Session | null
): Promise<boolean> {
  // Check if user is authenticated
  if (!session?.user?.email) {
    return false;
  }

  console.log('Checking admin access for:', session.user.email);
  console.log('Session role:', session.user.role);

  // If role is directly available in the session, use it
  if (session.user.role && isAdminRole(session.user.role)) {
    console.log('User is admin based on session role');
    return true;
  }

  // Fall back to database check if role not in session
  // This is for backward compatibility with existing sessions
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  // Check if user exists and has admin role
  if (!user) return false;

  console.log('User role from database:', user.role);

  // Check both role-based and email-based admin status
  // This ensures that both new role-based and legacy email-based admin users work
  const isAdmin = isAdminRole(user.role) || isAdminUser(user.email);

  console.log('Is admin result:', isAdmin);

  return isAdmin;
}

/**
 * Transforms user data to add derived fields needed by the admin UI
 * @param user The raw user data from the database
 * @returns Transformed user data for the admin UI
 */
export function transformUserForAdminUI(user: any) {
  return {
    ...user,
    // Add isVerified field if it doesn't exist (aliased from kycVerified)
    isVerified:
      user.isVerified !== undefined ? user.isVerified : user.kycVerified,
    // Add isAdmin field based on role or email
    isAdmin:
      isAdminRole(user.role) || (user.email ? isAdminUser(user.email) : false),
  };
}
