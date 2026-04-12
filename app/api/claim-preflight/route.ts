import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../lib/prisma";
import {
  claimAddress,
  claimAbi,
  publicClient,
  tokenAddress,
  tokenAbi,
} from "../../../backend/integrity/clients";

const ZERO_ROOT =
  "0x0000000000000000000000000000000000000000000000000000000000000000";

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

    const epoch = await prisma.epoch.findFirst({
      where: {
        status: "CLAIMS_OPEN",
        merkleRoot: {
          not: ZERO_ROOT,
        },
      },
      orderBy: { epochNumber: "desc" },
    });

    if (!epoch) {
      return NextResponse.json({
        ok: false,
        reason: "No claimable epoch",
      });
    }

    const claim = await prisma.epochClaim.findFirst({
      where: {
        epochId: epoch.id,
        wallet: {
          equals: wallet,
          mode: "insensitive",
        },
      },
    });

    if (!claim) {
      return NextResponse.json({
        ok: false,
        reason: "Wallet not in snapshot",
      });
    }

    const alreadyClaimed = (await publicClient.readContract({
      address: claimAddress,
      abi: claimAbi,
      functionName: "claimed",
      args: [BigInt(epoch.epochNumber), wallet as `0x${string}`],
    })) as boolean;

    if (alreadyClaimed) {
      return NextResponse.json({
        ok: false,
        reason: "Already claimed",
      });
    }

    const claimContractBalance = (await publicClient.readContract({
      address: tokenAddress,
      abi: tokenAbi,
      functionName: "balanceOf",
      args: [claimAddress],
    })) as bigint;

    const amountWei = BigInt(claim.cappedRewardWei);

    if (claimContractBalance < amountWei) {
      return NextResponse.json({
        ok: false,
        reason: "Insufficient claim contract funding",
        claimContractBalance: claimContractBalance.toString(),
        amountWei: amountWei.toString(),
      });
    }

    return NextResponse.json({
      ok: true,
      epoch: epoch.epochNumber,
      amountWei: claim.cappedRewardWei,
      proof: claim.proof,
      merkleRoot: epoch.merkleRoot,
      claimContractBalance: claimContractBalance.toString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, reason: err?.message || "Unknown error" },
      { status: 500 }
    );
  }
}