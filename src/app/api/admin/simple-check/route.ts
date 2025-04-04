import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminUser } from '@/lib/auth-utils';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Simple check directly from session without database
    let isAdmin = false;

    if (session?.user?.email) {
      // Method 1: Check hardcoded emails
      isAdmin = isAdminUser(session.user.email);

      // Method 2: Check role if available
      if (session.user.role) {
        if (typeof session.user.role === 'string') {
          isAdmin = isAdmin || session.user.role === 'ADMIN';
        } else {
          // Try to access role property if it's an object
          isAdmin = isAdmin || session.user.role === 'ADMIN';
        }
      }
    }

    return NextResponse.json({
      isAdmin,
      session: {
        authenticated: !!session,
        user: session?.user
          ? {
              id: session.user.id,
              email: session.user.email,
              role: session.user.role,
            }
          : null,
      },
    });
  } catch (error) {
    console.error('Simple admin check error:', error);
    return NextResponse.json(
      {
        isAdmin: false,
        error: 'Failed to check admin status',
        errorDetails: String(error),
      },
      { status: 500 }
    );
  }
}
