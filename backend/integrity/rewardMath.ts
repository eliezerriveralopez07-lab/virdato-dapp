export type EngagementInput = {
  views: bigint;
  likes: bigint;
  comments: bigint;
  shares: bigint;
  clicks: bigint;
  reposts: bigint;
  impressions: bigint;
};

export type ComputedReward = {
  rawScore: bigint;
  tier: "Bronze" | "Silver" | "Gold" | "Platinum";
  baseRewardWei: bigint;
  variableRewardWei: bigint;
  grossRewardWei: bigint;
};

const E18 = 10n ** 18n;

export function computeRawScore(input: EngagementInput): bigint {
  return (
    input.views +
    input.likes * 2n +
    input.comments * 3n +
    input.shares * 4n +
    input.clicks * 5n +
    input.reposts * 4n +
    input.impressions
  );
}

export function computeReward(input: EngagementInput): ComputedReward {
  const rawScore = computeRawScore(input);

  let tier: ComputedReward["tier"] = "Bronze";
  let base = 20n;

  if (rawScore >= 1_000_000n) {
    tier = "Platinum";
    base = 2000n;
  } else if (rawScore >= 500_000n) {
    tier = "Gold";
    base = 600n;
  } else if (rawScore >= 100_000n) {
    tier = "Silver";
    base = 150n;
  }

  const variableReward = rawScore / 396000n;
  const gross = base + variableReward;

  return {
    rawScore,
    tier,
    baseRewardWei: base * E18,
    variableRewardWei: variableReward * E18,
    grossRewardWei: gross * E18,
  };
}