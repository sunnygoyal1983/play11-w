import { NextResponse } from "next/server";

/**
 * Dangerous maintenance endpoint disabled.
 * Use Prisma migrations locally instead of exposing DDL over HTTP.
 */
export async function GET() {
  return NextResponse.json(
    { error: 'This endpoint has been disabled for security reasons' },
    { status: 410 }
  );
}
