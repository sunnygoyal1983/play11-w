import { NextResponse } from "next/server";

/**
 * Debug endpoints are disabled in all environments.
 */
export async function GET() {
  return NextResponse.json(
    { error: 'Debug endpoints are disabled' },
    { status: 410 }
  );
}

export async function POST() {
  return NextResponse.json(
    { error: 'Debug endpoints are disabled' },
    { status: 410 }
  );
}
