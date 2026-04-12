import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../lib/prisma";

const ZERO_ROOT =
  "0x0000000000000000000000000000000000000000000000000000000000000000";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const walletParam = searchParams.get("wallet");

    if (!walletParam) {
      return NextResponse.json(
        { error: "Missing wallet parameter" },
        { status: 400 }
      );
    }

    const wallet = walletParam.toLowerCase();

    // 1) Get latest valid open epoch
    const epoch = await prisma.epoch.findFirst({
      where: {
        status: "CLAIMS_OPEN",
        merkleRoot: {
          not: ZERO_ROOT,
        },
      },
      orderBy: {
        epochNumber: "desc",
      },
    });

    if (!epoch) {
      return NextResponse.json({
        claimReady: false,
        reason: "NO_ACTIVE_EPOCH",
      });
    }

    // 2) Find this wallet inside the current epoch claims
    const eligible = await prisma.epochClaim.findFirst({
      where: {
        epochId: epoch.id,
        wallet,
      },
    });

    if (!eligible) {
      return NextResponse.json({
        claimReady: false,
        reason: "WALLET_NOT_ELIGIBLE",
        epoch: epoch.epochNumber,
      });
    }

    // 3) If already claimed, stop here
    if (eligible.claimed) {
      return NextResponse.json({
        claimReady: false,
        reason: "ALREADY_CLAIMED",
        epoch: epoch.epochNumber,
        amount: eligible.cappedRewardWei,
        claimTxHash: eligible.claimTxHash,
        claimedAt: eligible.claimedAt,
      });
    }

    // 4) Proof validation
    const proof = Array.isArray(eligible.proof) ? eligible.proof : [];

    if (proof.length === 0) {
      return NextResponse.json({
        claimReady: false,
        reason: "INVALID_PROOF",
        epoch: epoch.epochNumber,
      });
    }

    // 5) Amount validation
    const amount = eligible.cappedRewardWei;

    if (!amount || amount === "0") {
      return NextResponse.json({
        claimReady: false,
        reason: "INVALID_AMOUNT",
        epoch: epoch.epochNumber,
      });
    }

    // 6) Success
    return NextResponse.json({
      claimReady: true,
      epoch: epoch.epochNumber,
      amount,
      proof,
      root: epoch.merkleRoot,
    });
  } catch (error) {
    console.error("claim-payload error:", error);

    const detail =
      error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        error: "Internal server error",
        detail,
      },
      { status: 500 }
    );
  }
}