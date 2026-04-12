import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { getYouTubeStats } from "../../../lib/youtube";
import {
  getXAuthorizedUserStats,
  getXPublicProfileStats,
} from "../../../lib/providers/x/service";
import {
  type PlatformMetrics,
  totalSocialScore,
  getRewardBreakdown,
  getTierProgress,
  safeNumber,
} from "../../../lib/socialScoring";

type StoredXMetadata = {
  followers?: number;
  following?: number;
  tweets?: number;
  listed?: number;
  likes?: number;
  mediaCount?: number;
};

function readStoredXMetadata(value: unknown): StoredXMetadata {
  if (!value || typeof value !== "object") return {};
  return value as StoredXMetadata;
}

async function getConnectedXMetrics() {
  const userId = "TEMP_USER_ID_123";

  const account = await prisma.connectedAccount.findFirst({
    where: {
      userId,
      platform: "x",
      isActive: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (!account) {
    return {
      connected: false,
      username: null as string | null,
      displayName: null as string | null,
      followers: 0,
      following: 0,
      tweets: 0,
      listed: 0,
      likes: 0,
      mediaCount: 0,
    };
  }

  let metrics:
    | {
        username: string;
        displayName: string | null;
        followers: number;
        following: number;
        tweets: number;
        listed: number;
        likes: number;
        mediaCount: number;
      }
    | null = null;

  if (account.accessToken) {
    try {
      const live = await getXAuthorizedUserStats(account.accessToken);
      metrics = {
        username: live.username,
        displayName: live.displayName,
        followers: live.followers,
        following: live.following,
        tweets: live.tweets,
        listed: live.listed,
        likes: live.likes,
        mediaCount: live.mediaCount,
      };
    } catch {
      metrics = null;
    }
  }

  if (!metrics && account.username) {
    try {
      const live = await getXPublicProfileStats(account.username);
      metrics = {
        username: live.username,
        displayName: live.displayName,
        followers: live.followers,
        following: live.following,
        tweets: live.tweets,
        listed: live.listed,
        likes: live.likes,
        mediaCount: live.mediaCount,
      };
    } catch {
      metrics = null;
    }
  }

  if (!metrics) {
    const stored = readStoredXMetadata(account.metadataJson);

    metrics = {
      username: account.username ?? "",
      displayName: account.displayName ?? null,
      followers: stored.followers ?? 0,
      following: stored.following ?? 0,
      tweets: stored.tweets ?? 0,
      listed: stored.listed ?? 0,
      likes: stored.likes ?? 0,
      mediaCount: stored.mediaCount ?? 0,
    };
  }

  return {
    connected: true,
    username: metrics.username || null,
    displayName: metrics.displayName,
    followers: metrics.followers,
    following: metrics.following,
    tweets: metrics.tweets,
    listed: metrics.listed,
    likes: metrics.likes,
    mediaCount: metrics.mediaCount,
  };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const channelId = searchParams.get("channelId");
    const wallet = searchParams.get("wallet") || "TEMP_WALLET";

    if (!channelId) {
      return NextResponse.json(
        { error: "Missing channelId query parameter." },
        { status: 400 }
      );
    }

    const yt = await getYouTubeStats(channelId);
    const x = await getConnectedXMetrics();

    const youtubeMetrics: PlatformMetrics = {
      platform: "youtube",
      connected: true,
      username: channelId,
      views: safeNumber(yt?.views ?? 0),
      likes: safeNumber((yt as any)?.likes ?? 0),
      impressions: safeNumber((yt as any)?.impressions ?? 0),
      followers: 0,
      posts: 0,
      listed: 0,
      mediaCount: 0,
    };

    const xMetrics: PlatformMetrics = {
      platform: "x",
      connected: x.connected,
      username: x.username,
      followers: x.followers,
      likes: x.likes,
      posts: x.tweets,
      listed: x.listed,
      mediaCount: x.mediaCount,
      impressions: 0,
      views: 0,
    };

    const social = totalSocialScore([youtubeMetrics, xMetrics]);
    const reward = getRewardBreakdown(social.total);
    const normalizedTierProgress = getTierProgress(social.total);

    const periodCap = 1_000_000;
    const remainingPeriodPoolBefore = periodCap;
    const estimatedVird = Math.min(reward.grossReward, remainingPeriodPoolBefore);
    const remainingPeriodPoolAfter = Math.max(
      0,
      remainingPeriodPoolBefore - estimatedVird
    );

    const youtubeScore =
      social.breakdown.find((item) => item.platform === "youtube")?.score ?? 0;
    const xScore =
      social.breakdown.find((item) => item.platform === "x")?.score ?? 0;

    return NextResponse.json({
      channelId,
      wallet,
      youtube: {
        views: safeNumber(yt?.views ?? 0),
        likes: safeNumber((yt as any)?.likes ?? 0),
        impressions: safeNumber((yt as any)?.impressions ?? 0),
        score: youtubeScore,
      },
      x: {
        connected: x.connected,
        username: x.username,
        displayName: x.displayName,
        followers: x.followers,
        following: x.following,
        tweets: x.tweets,
        listed: x.listed,
        likes: x.likes,
        mediaCount: x.mediaCount,
        score: xScore,
      },
      socialBreakdown: {
        youtubeScore,
        xScore,
        combinedScore: social.total,
      },
      engagementTotal: social.total,
      normalizedTierProgress,
      estimatedVird,
      grossReward: reward.grossReward,
      baseReward: reward.baseReward,
      variableReward: reward.variableReward,
      periodCap,
      remainingPeriodPoolBefore,
      remainingPeriodPoolAfter,
      tier: reward.tier,
      message: x.connected
        ? "Rewards calculated from YouTube + connected X metrics."
        : "Rewards calculated from YouTube metrics. X can be added when connected.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to calculate rewards.",
      },
      { status: 500 }
    );
  }
}