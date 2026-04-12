import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const wallet = String(body?.wallet || "").toLowerCase();
    const epoch = Number(body?.epoch);
    const txHash = String(body?.txHash || "");
    const claimedAt = body?.claimedAt ? new Date(body.claimedAt) : new Date();

    if (!wallet || !epoch || !txHash) {
      return NextResponse.json(
        { error: "Missing wallet, epoch, or txHash" },
        { status: 400 }
      );
    }

    const epochRow = await prisma.epoch.findFirst({
      where: {
        epochNumber: epoch,
      },
    });

    if (!epochRow) {
      return NextResponse.json({ error: "Epoch not found" }, { status: 404 });
    }

    const updated = await prisma.epochClaim.updateMany({
      where: {
        epochId: epochRow.id,
        wallet: {
          equals: wallet,
          mode: "insensitive",
        },
      },
      data: {
        claimed: true,
        claimedAt,
        claimTxHash: txHash,
      },
    });

    return NextResponse.json({
      success: true,
      updatedCount: updated.count,
    });
  } catch (err: any) {
    console.error("claim-confirm route error:", err);
    return NextResponse.json(
      { error: err?.message || "Unknown error" },
      { status: 500 }
    );
  }
}