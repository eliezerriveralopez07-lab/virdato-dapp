import { prisma } from "../../app/lib/prisma";
import { getYouTubeStats } from "../../lib/youtube";

export async function ingestYouTubeForWindow(periodStart: Date, periodEnd: Date) {
  const accounts = await prisma.userAccount.findMany({
    where: {
      youtubeChannelId: { not: null },
      verificationStatus: "VERIFIED",
      eligibilityDecision: "APPROVE",
    },
  });

  for (const account of accounts) {
    if (!account.youtubeChannelId) continue;

    const yt = await getYouTubeStats(account.youtubeChannelId);

    await prisma.analyticsAggregate.create({
      data: {
        wallet: account.wallet,
        source: "youtube",
        periodStart,
        periodEnd,
        views: BigInt(yt.views.toString()),
        likes: 0n,
        comments: 0n,
        shares: 0n,
        clicks: 0n,
        reposts: 0n,
        impressions: 0n,
        authenticityScore: account.authenticityScore,
        aiLikelihoodScore: Math.max(0, 100 - account.authenticityScore),
        engagementQuality: 80,
        anomalyScore: account.riskScore,
        eligibilityDecision: account.eligibilityDecision,
        notes: "Imported from verified linked YouTube channel.",
      },
    });
  }
}