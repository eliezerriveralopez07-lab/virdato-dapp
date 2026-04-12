import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import {
  claimAbi,
  claimAddress,
  publicClient,
} from "../../../../backend/integrity/clients";

const ZERO_ROOT =
  "0x0000000000000000000000000000000000000000000000000000000000000000";

export async function POST(req: NextRequest) {
  try {
    const secret = req.headers.get("x-operator-secret");

    if (!process.env.OPERATOR_SECRET || secret !== process.env.OPERATOR_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const openEpochs = await prisma.epoch.findMany({
      where: {
        status: "CLAIMS_OPEN",
        merkleRoot: {
          not: ZERO_ROOT,
        },
      },
      include: {
        claims: true,
      },
      orderBy: {
        epochNumber: "asc",
      },
    });

    const results: Array<{
      epochNumber: number;
      claimedCount: number;
      totalClaimedWei: string;
    }> = [];

    for (const epoch of openEpochs) {
      let totalClaimedWei = 0n;
      let claimedCount = 0;

      for (const claim of epoch.claims) {
        const onChainClaimed = (await publicClient.readContract({
          address: claimAddress,
          abi: claimAbi,
          functionName: "claimed",
          args: [BigInt(epoch.epochNumber), claim.wallet as `0x${string}`],
        })) as boolean;

        if (onChainClaimed) {
          totalClaimedWei += BigInt(claim.cappedRewardWei);
          claimedCount += 1;

          await prisma.epochClaim.update({
            where: { id: claim.id },
            data: {
              claimed: true,
              claimedAt: claim.claimedAt ?? new Date(),
            },
          });
        }
      }

      await prisma.epoch.update({
        where: { id: epoch.id },
        data: {
          totalClaimedWei: totalClaimedWei.toString(),
        },
      });

      results.push({
        epochNumber: epoch.epochNumber,
        claimedCount,
        totalClaimedWei: totalClaimedWei.toString(),
      });
    }

    return NextResponse.json({
      success: true,
      reconciledEpochs: results,
    });
  } catch (err: any) {
    console.error("reconcile-claims route error:", err);
    return NextResponse.json(
      { error: err?.message || "Unknown error" },
      { status: 500 }
    );
  }
}