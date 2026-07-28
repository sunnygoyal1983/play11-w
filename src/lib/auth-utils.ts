import type { Session } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';

/**
 * Helper function to determine if a user is an admin by email.
 * Prefer role checks; this is display-only / legacy and must not grant privileges.
 * @deprecated Use role === 'ADMIN' instead
 */
export function isAdminUser(email: string): boolean {
  return false;
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
  if (!session?.user?.email) {
    return false;
  }

  if (session.user.role && isAdminRole(session.user.role)) {
    return true;
  }

  // Fall back to database role check for older sessions
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { role: true },
  });

  if (!user) return false;

  return isAdminRole(user.role);
}

/**
 * Transforms user data to add derived fields needed by the admin UI
 * @param user The raw user data from the database
 * @returns Transformed user data for the admin UI
 */
export function transformUserForAdminUI(user: any) {
  return {
    ...user,
    isVerified:
      user.isVerified !== undefined ? user.isVerified : user.kycVerified,
    isAdmin: isAdminRole(user.role),
  };
}
