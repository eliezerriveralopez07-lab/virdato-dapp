import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import {
  calculateAuthenticityScore,
  calculateWalletRiskScore,
  getEligibilityDecision,
} from "../../../../backend/integrity/riskScoring";
import { getYouTubeStats } from "../../../../lib/youtube";

export async function POST(req: NextRequest) {
  try {
    const secret = req.headers.get("x-operator-secret");
    if (!process.env.OPERATOR_SECRET || secret !== process.env.OPERATOR_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const wallet = String(body?.wallet || "").trim().toLowerCase();

    if (!wallet) {
      return NextResponse.json({ error: "Missing wallet" }, { status: 400 });
    }

    const user = await prisma.userAccount.findUnique({
      where: { wallet },
    });

    if (!user || !user.youtubeChannelId) {
      return NextResponse.json(
        { error: "No linked YouTube channel for this wallet" },
        { status: 404 }
      );
    }

    const yt = await getYouTubeStats(user.youtubeChannelId);

    const authenticityScore = calculateAuthenticityScore({
      channelAgeDays: 180,
      totalViews: Number(yt.views),
      totalVideos: Number(yt.videos),
      subscribers: Number(yt.subscribers),
      engagementRate: 0.01,
      duplicateContentSignals: 0,
      aiLikelihoodScore: 0,
      anomalyScore: 0,
    });

    const riskScore = calculateWalletRiskScore({
      walletAgeDays: 180,
      linkedChannelChanges: 0,
      failedClaims30d: 0,
      fundedByKnownCluster: false,
      suspiciousTransferPattern: false,
      sanctionedFlag: false,
      multiWalletClusterScore: 0,
    });

    const eligibilityDecision = getEligibilityDecision(
      authenticityScore,
      riskScore
    );

    const updated = await prisma.userAccount.update({
      where: { wallet },
      data: {
        authenticityScore,
        riskScore,
        eligibilityDecision,
        verificationStatus:
          eligibilityDecision === "APPROVE" ? "VERIFIED" : "PENDING",
        verificationReason: `Auto-scored from YouTube and wallet risk engine. Authenticity=${authenticityScore}, Risk=${riskScore}`,
        lastRiskScanAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      wallet: updated.wallet,
      youtubeChannelId: updated.youtubeChannelId,
      authenticityScore: updated.authenticityScore,
      riskScore: updated.riskScore,
      eligibilityDecision: updated.eligibilityDecision,
      verificationStatus: updated.verificationStatus,
    });
  } catch (err: any) {
    console.error("score-user route error:", err);
    return NextResponse.json(
      { error: err?.message || "Unknown error" },
      { status: 500 }
    );
  }
}