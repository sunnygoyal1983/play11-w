import { NextResponse } from "next/server";

/**
 * Dangerous maintenance endpoint disabled.
 * Writing schema files and running prisma generate over HTTP is not allowed.
 */
export async function GET() {
  return NextResponse.json(
    { error: 'This endpoint has been disabled for security reasons' },
    { status: 410 }
  );
}
