import { NextResponse } from "next/server";

/**
 * Dangerous migration endpoint disabled.
 * Run database migrations via Prisma CLI, not HTTP.
 */
export async function GET() {
  return NextResponse.json(
    { error: 'This endpoint has been disabled for security reasons' },
    { status: 410 }
  );
}
