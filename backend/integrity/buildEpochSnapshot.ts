import { prisma } from "../../app/lib/prisma";
import { computeReward } from "./rewardMath";

type AggregatedMetrics = {
  views: bigint;
  likes: bigint;
  comments: bigint;
  shares: bigint;
  clicks: bigint;
  reposts: bigint;
  impressions: bigint;
};

export async function buildEpochSnapshot(epochNumber: number) {
  const epoch = await prisma.epoch.findUnique({
    where: { epochNumber },
  });

  if (!epoch) {
    throw new Error(`Epoch ${epochNumber} not found`);
  }

  const approvedUsers = await prisma.userAccount.findMany({
    where: {
      eligibilityDecision: "APPROVE",
      verificationStatus: "VERIFIED",
      youtubeChannelId: { not: null },
    },
    select: {
      wallet: true,
      authenticityScore: true,
      riskScore: true,
      eligibilityDecision: true,
    },
  });

  const approvedWallets = approvedUsers.map((u) => u.wallet);

  if (approvedWallets.length === 0) {
    await prisma.epochClaim.deleteMany({
      where: { epochId: epoch.id },
    });

    await prisma.epoch.update({
      where: { id: epoch.id },
      data: {
        status: "SNAPSHOT_BUILT",
        totalEligibleWallets: 0,
        totalGrossWei: "0",
        totalCappedWei: "0",
      },
    });

    return {
      epochNumber,
      totalEligibleWallets: 0,
      totalGrossWei: "0",
    };
  }

  const aggregates = await prisma.analyticsAggregate.findMany({
    where: {
      wallet: { in: approvedWallets },
      periodStart: { gte: epoch.periodStart },
      periodEnd: { lte: epoch.periodEnd },
    },
    orderBy: { wallet: "asc" },
  });

  const grouped = new Map<string, AggregatedMetrics>();

  for (const row of aggregates) {
    const current = grouped.get(row.wallet) || {
      views: 0n,
      likes: 0n,
      comments: 0n,
      shares: 0n,
      clicks: 0n,
      reposts: 0n,
      impressions: 0n,
    };

    current.views += BigInt(row.views.toString());
    current.likes += BigInt(row.likes.toString());
    current.comments += BigInt(row.comments.toString());
    current.shares += BigInt(row.shares.toString());
    current.clicks += BigInt(row.clicks.toString());
    current.reposts += BigInt(row.reposts.toString());
    current.impressions += BigInt(row.impressions.toString());

    grouped.set(row.wallet, current);
  }

  await prisma.epochClaim.deleteMany({
    where: { epochId: epoch.id },
  });

  let totalGross = 0n;
  let totalEligibleWallets = 0;

  for (const approvedUser of approvedUsers) {
    const metrics = grouped.get(approvedUser.wallet) || {
      views: 0n,
      likes: 0n,
      comments: 0n,
      shares: 0n,
      clicks: 0n,
      reposts: 0n,
      impressions: 0n,
    };

    const reward = computeReward(metrics);

    if (reward.grossRewardWei <= 0n) {
      continue;
    }

    totalGross += reward.grossRewardWei;
    totalEligibleWallets += 1;

    await prisma.epochClaim.create({
      data: {
        epochId: epoch.id,
        wallet: approvedUser.wallet,
        rawScore: reward.rawScore.toString(),
        tier: reward.tier,
        baseRewardWei: reward.baseRewardWei.toString(),
        variableRewardWei: reward.variableRewardWei.toString(),
        grossRewardWei: reward.grossRewardWei.toString(),
        cappedRewardWei: reward.grossRewardWei.toString(),
        proof: [],
        authenticityScore: approvedUser.authenticityScore,
        riskScore: approvedUser.riskScore,
        eligibilityDecision: approvedUser.eligibilityDecision,
        reviewReason: null,
      },
    });
  }

  await prisma.epoch.update({
    where: { id: epoch.id },
    data: {
      status: "SNAPSHOT_BUILT",
      totalEligibleWallets,
      totalGrossWei: totalGross.toString(),
      totalCappedWei: totalGross.toString(),
    },
  });

  return {
    epochNumber,
    totalEligibleWallets,
    totalGrossWei: totalGross.toString(),
  };
}