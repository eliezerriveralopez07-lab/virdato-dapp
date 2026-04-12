import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const wallet = searchParams.get("wallet");

    if (!wallet) {
      return NextResponse.json(
        { error: "Missing wallet" },
        { status: 400 }
      );
    }

    const normalizedWallet = wallet.trim().toLowerCase();

    const record = await prisma.userAccount.findUnique({
      where: {
        wallet: normalizedWallet,
      },
    });

    if (!record) {
      return NextResponse.json(
        { error: "No linked channel found for this wallet" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      wallet: record.wallet,
      youtubeChannelId: record.youtubeChannelId,
    });
  } catch (err: any) {
    console.error("linked-channel route error:", err);
    return NextResponse.json(
      { error: err?.message || "Unknown error" },
      { status: 500 }
    );
  }
}