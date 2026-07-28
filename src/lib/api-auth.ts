import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from 'next-auth/next';
import type { Session } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/auth-utils';

export function unauthorized(message = 'Unauthorized') {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function forbidden(message = 'Forbidden') {
  return NextResponse.json({ error: message }, { status: 403 });
}

/**
 * Require an authenticated admin session. Returns the session or an error response.
 */
export async function requireAdmin(): Promise<
  { session: Session; error?: never } | { session?: never; error: NextResponse }
> {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return { error: unauthorized('Authentication required') };
  }

  if (!isAdminRole(session.user.role)) {
    return { error: forbidden('Admin access required') };
  }

  return { session };
}

/**
 * Fail-closed cron secret check. Rejects when CRON_SECRET is unset or mismatched.
 */
export function requireCronSecret(request: NextRequest): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return unauthorized('Cron authentication is not configured');
  }

  const headerSecret =
    request.headers.get('x-cron-secret') ||
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');

  if (!headerSecret || headerSecret !== secret) {
    return unauthorized('Invalid cron credentials');
  }

  return null;
}

/**
 * Optional CRON_API_KEY check (header x-api-key or Authorization Bearer).
 * Fail-closed when the env var is unset.
 */
export function requireCronApiKey(request: NextRequest): NextResponse | null {
  const expected = process.env.CRON_API_KEY || process.env.CRON_SECRET;
  if (!expected) {
    return unauthorized('Cron API key is not configured');
  }

  const provided =
    request.headers.get('x-api-key') ||
    request.headers.get('x-cron-secret') ||
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');

  if (!provided || provided !== expected) {
    return unauthorized('Invalid API key');
  }

  return null;
}
