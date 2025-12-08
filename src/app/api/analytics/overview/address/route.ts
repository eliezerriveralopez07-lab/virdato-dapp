// src/app/api/analytics/overview/address/route.ts

import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/analytics/overview/address
 * Static API route – no route params.
 */
export async function GET(_req: NextRequest) {
  try {
    // TODO: put your real analytics logic here
    // const data = await getOverviewAnalytics();
    // return NextResponse.json(data, { status: 200 });

    return NextResponse.json(
      {
        ok: true,
        endpoint: '/api/analytics/overview/address',
        message: 'Analytics endpoint is alive.',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Analytics address endpoint error:', error);

    return NextResponse.json(
      {
        ok: false,
        error: 'Internal Server Error',
      },
      { status: 500 }
    );
  }
}
