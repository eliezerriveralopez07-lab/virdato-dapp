// src/app/api/analytics/overview/address/route.ts

import { NextRequest, NextResponse } from "next/server";

/**
 * Stub analytics endpoint to satisfy Next.js typed route config on Vercel.
 * We don't actually use this in the app.
 */
export async function GET(
  _request: NextRequest,
  _context: { params: Promise<{}> }
): Promise<NextResponse> {
  return NextResponse.json(
    {
      ok: true,
      message:
        "Stub analytics address endpoint. This exists only to satisfy Next.js typed route types on Vercel.",
    },
    { status: 200 }
  );
}
