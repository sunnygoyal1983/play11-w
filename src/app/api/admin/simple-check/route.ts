import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/auth-utils';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    const isAdmin = Boolean(
      session?.user && isAdminRole(session.user.role)
    );

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
      },
      { status: 500 }
    );
  }
}
