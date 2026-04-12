export type EngagementInput = {
  youtubeViews?: number;
  youtubeLikes?: number;
  youtubeImpressions?: number;
  youtubeShares?: number;
  youtubeComments?: number;
  youtubeClicks?: number;

  tiktokViews?: number;
  tiktokLikes?: number;
  tiktokImpressions?: number;
  tiktokShares?: number;
  tiktokComments?: number;
  tiktokClicks?: number;

  reposts?: number;
};

export type VirdTier = "None" | "Bronze" | "Silver" | "Gold" | "Platinum";

export type RewardEstimate = {
  tier: VirdTier;
  rawEngagementScore: number;
  normalizedTierProgress: number;
  baseReward: number;
  variableReward: number;
  grossReward: number;
  cappedReward: number;
  periodCap: number;
  remainingPeriodPoolBefore: number;
  remainingPeriodPoolAfter: number;
};

export const VIRD_PERIOD_CAP = 1_000_000;

export const TIER_THRESHOLDS = {
  bronze: 1_000,
  silver: 100_000,
  gold: 500_000,
  platinum: 1_000_000,
} as const;

export const TIER_BASE_REWARDS: Record<Exclude<VirdTier, "None">, number> = {
  Bronze: 20,
  Silver: 150,
  Gold: 600,
  Platinum: 2000,
};

function safe(n?: number): number {
  if (!n || Number.isNaN(n) || n < 0) return 0;
  return n;
}

function clamp01(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

/**
 * Weighted engagement scoring model.
 * Cheap metrics like impressions are discounted.
 * Higher-signal actions like shares/comments/reposts get more weight.
 */
export function calculateEngagementTotal(input: EngagementInput): number {
  const youtubeViews = safe(input.youtubeViews);
  const youtubeLikes = safe(input.youtubeLikes);
  const youtubeImpressions = safe(input.youtubeImpressions);
  const youtubeShares = safe(input.youtubeShares);
  const youtubeComments = safe(input.youtubeComments);
  const youtubeClicks = safe(input.youtubeClicks);

  const tiktokViews = safe(input.tiktokViews);
  const tiktokLikes = safe(input.tiktokLikes);
  const tiktokImpressions = safe(input.tiktokImpressions);
  const tiktokShares = safe(input.tiktokShares);
  const tiktokComments = safe(input.tiktokComments);
  const tiktokClicks = safe(input.tiktokClicks);

  const reposts = safe(input.reposts);

  const score =
    youtubeViews * 1 +
    youtubeLikes * 8 +
    youtubeImpressions * 0.2 +
    youtubeShares * 12 +
    youtubeComments * 10 +
    youtubeClicks * 6 +
    tiktokViews * 1 +
    tiktokLikes * 8 +
    tiktokImpressions * 0.2 +
    tiktokShares * 12 +
    tiktokComments * 10 +
    tiktokClicks * 6 +
    reposts * 15;

  return Math.floor(score);
}

export function getVirdTier(score: number): VirdTier {
  if (score >= TIER_THRESHOLDS.platinum) return "Platinum";
  if (score >= TIER_THRESHOLDS.gold) return "Gold";
  if (score >= TIER_THRESHOLDS.silver) return "Silver";
  if (score >= TIER_THRESHOLDS.bronze) return "Bronze";
  return "None";
}

/**
 * Returns progress inside the current tier band from 0 to 1.
 * Platinum uses a slower logarithmic curve so huge accounts do not instantly max rewards.
 */
export function getTierProgress(score: number, tier: VirdTier): number {
  if (tier === "None") return 0;

  if (tier === "Bronze") {
    const min = TIER_THRESHOLDS.bronze;
    const max = TIER_THRESHOLDS.silver - 1;
    return clamp01((score - min) / (max - min));
  }

  if (tier === "Silver") {
    const min = TIER_THRESHOLDS.silver;
    const max = TIER_THRESHOLDS.gold - 1;
    return clamp01((score - min) / (max - min));
  }

  if (tier === "Gold") {
    const min = TIER_THRESHOLDS.gold;
    const max = TIER_THRESHOLDS.platinum - 1;
    return clamp01((score - min) / (max - min));
  }

  // Platinum: slower ramp for large creators
  const min = TIER_THRESHOLDS.platinum;
  const extra = Math.max(0, score - min);
  const normalized = Math.log10(1 + extra / 1_000_000);
  return clamp01(normalized / 3);
}

export function getVariableReward(tier: VirdTier, progress: number): number {
  if (tier === "None") return 0;

  const p = clamp01(progress);

  switch (tier) {
    case "Bronze":
      return Math.round(10 * p); // 20 to 30 total before dampener/floor
    case "Silver":
      return Math.round(75 * p); // 150 to 225 total before dampener
    case "Gold":
      return Math.round(300 * p); // 600 to 900 total before dampener
    case "Platinum":
      return Math.round(1000 * p); // 2000 to 3000 total before dampener
    default:
      return 0;
  }
}

/**
 * Main reward calculation before period cap is applied.
 */
export function getEstimatedVirdReward(score: number): Omit<
  RewardEstimate,
  "cappedReward" | "periodCap" | "remainingPeriodPoolBefore" | "remainingPeriodPoolAfter"
> {
  const tier = getVirdTier(score);

  if (tier === "None") {
    return {
      tier,
      rawEngagementScore: score,
      normalizedTierProgress: 0,
      baseReward: 0,
      variableReward: 0,
      grossReward: 0,
    };
  }

  const progress = getTierProgress(score, tier);
  const baseReward = TIER_BASE_REWARDS[tier];
  const variableReward = getVariableReward(tier, progress);

  // Anti-whale dampener
  const whaleFactor =
    score > 10_000_000 ? 0.75 :
    score > 5_000_000 ? 0.85 :
    1;

  const adjustedReward = Math.floor((baseReward + variableReward) * whaleFactor);

  // Keep Bronze from feeling worthless
  const finalReward = Math.max(tier === "Bronze" ? 10 : 0, adjustedReward);

  return {
    tier,
    rawEngagementScore: score,
    normalizedTierProgress: Number(progress.toFixed(4)),
    baseReward,
    variableReward,
    grossReward: finalReward,
  };
}

/**
 * Hard cap enforcement for the active period.
 */
export function applyPeriodEmissionCap(params: {
  grossReward: number;
  alreadyDistributedThisPeriod: number;
  periodCap?: number;
}): {
  cappedReward: number;
  periodCap: number;
  remainingPeriodPoolBefore: number;
  remainingPeriodPoolAfter: number;
} {
  const periodCap = params.periodCap ?? VIRD_PERIOD_CAP;
  const alreadyDistributed = Math.max(0, params.alreadyDistributedThisPeriod);
  const remainingBefore = Math.max(0, periodCap - alreadyDistributed);

  const cappedReward = Math.max(
    0,
    Math.min(Math.floor(params.grossReward), remainingBefore)
  );

  const remainingAfter = Math.max(0, remainingBefore - cappedReward);

  return {
    cappedReward,
    periodCap,
    remainingPeriodPoolBefore: remainingBefore,
    remainingPeriodPoolAfter: remainingAfter,
  };
}

/**
 * End-to-end helper.
 */
export function calculateVirdRewardWithCap(params: {
  engagement: EngagementInput;
  alreadyDistributedThisPeriod: number;
  periodCap?: number;
}): RewardEstimate {
  const score = calculateEngagementTotal(params.engagement);
  const estimate = getEstimatedVirdReward(score);

  const capResult = applyPeriodEmissionCap({
    grossReward: estimate.grossReward,
    alreadyDistributedThisPeriod: params.alreadyDistributedThisPeriod,
    periodCap: params.periodCap,
  });

  return {
    ...estimate,
    ...capResult,
  };
}