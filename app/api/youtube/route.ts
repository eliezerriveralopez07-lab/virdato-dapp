import { NextRequest, NextResponse } from "next/server";
import { getYouTubeStats } from "../../../lib/youtube";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const channelId = searchParams.get("channelId");

    if (!channelId) {
      throw new Error("Missing channelId query parameter");
    }

    const stats = await getYouTubeStats(channelId);

    return NextResponse.json({
      channelId,
      ...stats,
    });
  } catch (err: any) {
    console.error("YouTube route error:", err);
    return NextResponse.json(
      { error: err?.message || "Unknown error" },
      { status: 500 }
    );
  }
}