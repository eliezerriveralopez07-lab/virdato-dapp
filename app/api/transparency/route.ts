import { NextResponse } from "next/server";
import { prisma } from "../../lib/prisma";
import {
  claimAddress,
  publicClient,
  tokenAbi,
  tokenAddress,
} from "../../../backend/integrity/clients";

const ZERO_ROOT =
  "0x0000000000000000000000000000000000000000000000000000000000000000";

export async function GET() {
  const latest = await prisma.epoch.findFirst({
    where: {
      status: "CLAIMS_OPEN",
      merkleRoot: {
        not: ZERO_ROOT,
      },
    },
    orderBy: { epochNumber: "desc" },
  });

  const claimContractBalance = (await publicClient.readContract({
    address: tokenAddress,
    abi: tokenAbi,
    functionName: "balanceOf",
    args: [claimAddress],
  })) as bigint;

  return NextResponse.json({
    latestEpoch: latest?.epochNumber ?? null,
    status: latest?.status ?? null,
    merkleRoot: latest?.merkleRoot ?? null,
    totalGrossWei: latest?.totalGrossWei ?? "0",
    totalCappedWei: latest?.totalCappedWei ?? "0",
    totalFundedWei: latest?.totalFundedWei ?? "0",
    totalClaimedWei: latest?.totalClaimedWei ?? "0",
    fundingTxHash: latest?.fundingTxHash ?? null,
    finalizeTxHash: latest?.finalizeTxHash ?? null,
    claimContractBalance: claimContractBalance.toString(),
  });
}