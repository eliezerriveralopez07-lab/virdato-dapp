export type PlatformMetrics = {
  platform: "youtube" | "x" | "instagram" | "tiktok" | "facebook" | "linkedin";
  connected: boolean;
  username?: string | null;
  views?: number;
  likes?: number;
  followers?: number;
  posts?: number;
  impressions?: number;
  listed?: number;
  mediaCount?: number;
};

export type PlatformScore = {
  platform: PlatformMetrics["platform"];
  connected: boolean;
  username?: string | null;
  raw: PlatformMetrics;
  score: number;
};

export type RewardTier = "Starter" | "Bronze" | "Silver" | "Gold" | "Platinum";

export function safeNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

export function scoreYoutube(metrics: PlatformMetrics): number {
  const views = safeNumber(metrics.views);
  const likes = safeNumber(metrics.likes);
  const impressions = safeNumber(metrics.impressions);

  return Math.round(views + likes * 2 + impressions * 0.1);
}

export function scoreX(metrics: PlatformMetrics): number {
  const followers = safeNumber(metrics.followers);
  const likes = safeNumber(metrics.likes);
  const posts = safeNumber(metrics.posts);
  const listed = safeNumber(metrics.listed);
  const mediaCount = safeNumber(metrics.mediaCount);
  const impressions = safeNumber(metrics.impressions);

  return Math.round(
    followers * 3 +
      likes * 2 +
      posts * 10 +
      listed * 20 +
      mediaCount * 5 +
      impressions * 0.1
  );
}

export function scorePlatform(metrics: PlatformMetrics): PlatformScore {
  let score = 0;

  if (metrics.platform === "youtube") {
    score = scoreYoutube(metrics);
  } else if (metrics.platform === "x") {
    score = scoreX(metrics);
  }

  return {
    platform: metrics.platform,
    connected: metrics.connected,
    username: metrics.username ?? null,
    raw: metrics,
    score,
  };
}

export function totalSocialScore(metrics: PlatformMetrics[]) {
  const breakdown = metrics.map(scorePlatform);
  const total = breakdown.reduce((sum, item) => sum + item.score, 0);

  return { total, breakdown };
}

export function getTierFromScore(score: number): RewardTier {
  if (score >= 1_000_000) return "Platinum";
  if (score >= 500_000) return "Gold";
  if (score >= 100_000) return "Silver";
  if (score >= 1_000) return "Bronze";
  return "Starter";
}

export function getTierProgress(score: number): number {
  if (score >= 1_000_000) return 100;
  if (score >= 500_000) return Math.min(100, (score / 1_000_000) * 100);
  if (score >= 100_000) return Math.min(100, (score / 500_000) * 100);
  if (score >= 1_000) return Math.min(100, (score / 100_000) * 100);
  return Math.min(100, (score / 1_000) * 100);
}

export function getRewardBreakdown(score: number) {
  const tier = getTierFromScore(score);

  const baseByTier: Record<RewardTier, number> = {
    Starter: 0,
    Bronze: 20,
    Silver: 150,
    Gold: 600,
    Platinum: 2000,
  };

  const variableReward = Math.round(score * 0.0005);
  const baseReward = baseByTier[tier];
  const grossReward = baseReward + variableReward;

  return {
    tier,
    baseReward,
    variableReward,
    grossReward,
  };
}