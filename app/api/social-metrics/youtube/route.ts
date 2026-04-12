import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getAuthorizedYouTubeChannel } from "../../../../lib/providers/google/service";

type StoredMetadata = {
  viewCount?: number;
  subscriberCount?: number;
  videoCount?: number;
  thumbnailUrl?: string;
  description?: string;
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
        platform: "youtube",
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

    let channel: Awaited<ReturnType<typeof getAuthorizedYouTubeChannel>> | null =
      null;

    if (account.accessToken) {
      try {
        channel = await getAuthorizedYouTubeChannel(account.accessToken);
      } catch {
        channel = null;
      }
    }

    if (!channel) {
      const stored = readStoredMetadata(account.metadataJson);

      return NextResponse.json({
        ok: true,
        connected: true,
        metrics: {
          channelId: account.platformAccountId,
          title: account.displayName,
          customUrl: account.username,
          viewCount: stored.viewCount ?? 0,
          subscriberCount: stored.subscriberCount ?? 0,
          videoCount: stored.videoCount ?? 0,
          thumbnailUrl: stored.thumbnailUrl ?? null,
          description: stored.description ?? null,
        },
      });
    }

    await prisma.connectedAccount.update({
      where: { id: account.id },
      data: {
        username: channel.customUrl || account.username,
        displayName: channel.title || account.displayName,
        metadataJson: {
          ...(typeof account.metadataJson === "object" && account.metadataJson
            ? account.metadataJson
            : {}),
          description: channel.description,
          thumbnailUrl: channel.thumbnailUrl,
          viewCount: channel.viewCount,
          subscriberCount: channel.subscriberCount,
          videoCount: channel.videoCount,
          syncedAt: new Date().toISOString(),
        },
      },
    });

    return NextResponse.json({
      ok: true,
      connected: true,
      metrics: channel,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load YouTube metrics.",
      },
      { status: 500 }
    );
  }
}