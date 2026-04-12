type AuthenticityInput = {
  channelAgeDays?: number;
  totalViews?: number;
  totalVideos?: number;
  subscribers?: number;
  engagementRate?: number;
  duplicateContentSignals?: number;
  aiLikelihoodScore?: number;
  anomalyScore?: number;
};

type WalletRiskInput = {
  walletAgeDays?: number;
  linkedChannelChanges?: number;
  failedClaims30d?: number;
  fundedByKnownCluster?: boolean;
  suspiciousTransferPattern?: boolean;
  sanctionedFlag?: boolean;
  multiWalletClusterScore?: number;
};

export function calculateAuthenticityScore(input: AuthenticityInput): number {
  let score = 100;

  if ((input.channelAgeDays ?? 0) < 30) score -= 20;
  if ((input.totalVideos ?? 0) < 3) score -= 10;
  if ((input.totalViews ?? 0) < 100) score -= 5;
  if ((input.subscribers ?? 0) < 10) score -= 5;

  if ((input.engagementRate ?? 0) < 0.005) score -= 10;

  score -= Math.min(input.duplicateContentSignals ?? 0, 20);
  score -= Math.min(input.aiLikelihoodScore ?? 0, 40);
  score -= Math.min(input.anomalyScore ?? 0, 20);

  return Math.max(0, Math.min(100, score));
}

export function calculateWalletRiskScore(input: WalletRiskInput): number {
  let score = 0;

  if ((input.walletAgeDays ?? 0) < 14) score += 20;
  score += Math.min((input.linkedChannelChanges ?? 0) * 15, 30);
  score += Math.min((input.failedClaims30d ?? 0) * 10, 30);

  if (input.fundedByKnownCluster) score += 20;
  if (input.suspiciousTransferPattern) score += 20;
  if (input.sanctionedFlag) score += 100;

  score += Math.min(input.multiWalletClusterScore ?? 0, 40);

  return Math.max(0, Math.min(100, score));
}

export function getEligibilityDecision(
  authenticityScore: number,
  riskScore: number
): "APPROVE" | "REVIEW" | "REJECT" {
  if (authenticityScore < 40 || riskScore > 60) return "REJECT";
  if (authenticityScore < 70 || riskScore > 30) return "REVIEW";
  return "APPROVE";
}