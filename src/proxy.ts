import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { getToken } from 'next-auth/jwt';

const DANGEROUS_UNAUTH_API_PREFIXES = [
  '/api/debug',
  '/api/fix-schema',
  '/api/update-schema',
  '/api/fix-match-status',
  '/api/import',
  '/api/scheduler',
  '/api/sportmonk',
  '/api/import-squad-players',
  '/api/import-matchplayers',
  '/migrate-db',
];

function hasValidCronSecret(request: NextRequest): boolean {
  const secrets = [process.env.CRON_SECRET, process.env.CRON_API_KEY].filter(
    Boolean
  ) as string[];
  if (secrets.length === 0) return false;

  const provided =
    request.headers.get('x-cron-secret') ||
    request.headers.get('x-api-key') ||
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ||
    request.nextUrl.searchParams.get('api_key');

  return Boolean(provided && secrets.includes(provided));
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // Protect admin API routes
  if (pathname.startsWith('/api/admin')) {
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    if (token.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }
  }

  // Protect cron APIs with fail-closed secret
  if (pathname.startsWith('/api/cron') || pathname === '/api/cron') {
    if (!hasValidCronSecret(request)) {
      return NextResponse.json(
        { error: 'Invalid or missing cron credentials' },
        { status: 401 }
      );
    }
  }

  // Lock down dangerous maintenance / import endpoints
  if (
    DANGEROUS_UNAUTH_API_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    )
  ) {
    if (!token || token.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }
  }

  // Admin page routes
  if (pathname.startsWith('/admin')) {
    if (!token) {
      return NextResponse.redirect(new URL('/auth/signin', request.url));
    }

    if (token.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  // Authenticated user pages
  if (
    pathname.startsWith('/profile') ||
    pathname.startsWith('/wallet') ||
    pathname.startsWith('/teams') ||
    pathname.includes('/create-team') ||
    pathname.includes('/join')
  ) {
    if (!token) {
      return NextResponse.redirect(new URL('/auth/signin', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};
