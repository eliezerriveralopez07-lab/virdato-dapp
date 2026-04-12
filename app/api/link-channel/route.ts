import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../lib/prisma";

function normalizeWallet(wallet: string) {
  return wallet.trim().toLowerCase();
}

function normalizeChannelId(channelId: string) {
  return channelId.trim();
}

function isValidWallet(wallet: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(wallet);
}

function isValidYouTubeChannelId(channelId: string) {
  return /^UC[a-zA-Z0-9_-]{22}$/.test(channelId);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const rawWallet = body?.wallet;
    const rawYoutubeChannelId = body?.youtubeChannelId;

    if (!rawWallet || !rawYoutubeChannelId) {
      return NextResponse.json(
        { error: "Missing wallet or youtubeChannelId" },
        { status: 400 }
      );
    }

    const wallet = normalizeWallet(rawWallet);
    const youtubeChannelId = normalizeChannelId(rawYoutubeChannelId);

    if (!isValidWallet(wallet)) {
      return NextResponse.json(
        { error: "Invalid wallet address" },
        { status: 400 }
      );
    }

    if (!isValidYouTubeChannelId(youtubeChannelId)) {
      return NextResponse.json(
        { error: "Invalid YouTube channel ID" },
        { status: 400 }
      );
    }

    const existingChannelOwner = await prisma.userAccount.findFirst({
      where: {
        youtubeChannelId,
        wallet: {
          not: wallet,
        },
      },
    });

    if (existingChannelOwner) {
      return NextResponse.json(
        { error: "This YouTube channel is already linked to another wallet." },
        { status: 409 }
      );
    }

    const record = await prisma.userAccount.upsert({
      where: { wallet },
      update: {
        youtubeChannelId,
      },
      create: {
        wallet,
        youtubeChannelId,
      },
    });

    return NextResponse.json({
      success: true,
      wallet: record.wallet,
      youtubeChannelId: record.youtubeChannelId,
    });
  } catch (err: any) {
    console.error("link-channel route error:", err);
    return NextResponse.json(
      { error: err?.message || "Unknown error" },
      { status: 500 }
    );
  }
}