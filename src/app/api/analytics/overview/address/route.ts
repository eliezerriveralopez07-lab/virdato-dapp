import { NextRequest, NextResponse } from 'next/server';

type RouteParams = {
  address: string;
};

export async function GET(
  _req: NextRequest,
  { params }: { params: RouteParams }
) {
  const { address } = params;

  // TODO: replace this with your real logic
  // e.g. const data = await getAnalyticsForAddress(address);

  return NextResponse.json({
    address,
    message: 'Analytics endpoint is wired correctly.',
  });
}
