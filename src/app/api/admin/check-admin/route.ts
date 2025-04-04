import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAuthenticatedAdmin } from '@/lib/auth-utils';

/**
 * API endpoint to verify admin access
 * Used by client-side components to check if user has admin privileges
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Log session data for debugging
    console.log('Session in check-admin:', {
      email: session?.user?.email,
      role: session?.user?.role,
      id: session?.user?.id,
    });

    const isAdmin = await isAuthenticatedAdmin(session);

    console.log('IsAdmin result:', isAdmin);

    return NextResponse.json({ isAdmin });
  } catch (error) {
    console.error('Error checking admin status:', error);
    return NextResponse.json(
      {
        isAdmin: false,
        error: 'Failed to verify admin status',
      },
      { status: 500 }
    );
  }
}
