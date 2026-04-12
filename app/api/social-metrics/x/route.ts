import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import {
  getXAuthorizedUserStats,
  getXPublicProfileStats,
} from "../../../../lib/providers/x/service";

type StoredMetadata = {
  followers?: number;
  following?: number;
  tweets?: number;
  listed?: number;
  likes?: number;
  mediaCount?: number;
  syncedAt?: string;
};

function readStoredMetadata(value: unknown): StoredMetadata {
  if (!value || typeof value !== "object") return {};
  return value as StoredMetadata;
}

export async function GET() {
  try {
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
      return NextResponse.json({
        ok: true,
        connected: false,
        metrics: null,
      });
    }

    let metrics:
      | {
          platform: string;
          accountId: string;
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
        metrics = await getXAuthorizedUserStats(account.accessToken);
      } catch {
        metrics = null;
      }
    }

    if (!metrics && account.username) {
      try {
        metrics = await getXPublicProfileStats(account.username);
      } catch {
        metrics = null;
      }
    }

    if (!metrics) {
      const stored = readStoredMetadata(account.metadataJson);

      return NextResponse.json({
        ok: true,
        connected: true,
        metrics: {
          platform: "x",
          accountId: account.platformAccountId,
          username: account.username,
          displayName: account.displayName,
          followers: stored.followers ?? 0,
          following: stored.following ?? 0,
          tweets: stored.tweets ?? 0,
          listed: stored.listed ?? 0,
          likes: stored.likes ?? 0,
          mediaCount: stored.mediaCount ?? 0,
        },
      });
    }

    await prisma.connectedAccount.update({
      where: {
        id: account.id,
      },
      data: {
        username: metrics.username ?? account.username,
        displayName: metrics.displayName ?? account.displayName,
        metadataJson: {
          followers: metrics.followers ?? 0,
          following: metrics.following ?? 0,
          tweets: metrics.tweets ?? 0,
          listed: metrics.listed ?? 0,
          likes: metrics.likes ?? 0,
          mediaCount: metrics.mediaCount ?? 0,
          syncedAt: new Date().toISOString(),
        },
      },
    });

    return NextResponse.json({
      ok: true,
      connected: true,
      metrics,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Failed to load X metrics.",
      },
      { status: 500 }
    );
  }
}