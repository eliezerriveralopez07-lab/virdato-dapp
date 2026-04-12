import { NextResponse } from "next/server";
import { getXPublicProfileStats } from "../../../lib/providers/x/service";

export async function GET() {
  try {
    const stats = await getXPublicProfileStats("aivault_systems");
    return NextResponse.json({ ok: true, stats });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}