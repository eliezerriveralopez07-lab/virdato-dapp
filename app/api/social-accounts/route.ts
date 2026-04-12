import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

const SUPPORTED_PLATFORMS = [
  "youtube",
  "x",
  "instagram",
  "tiktok",
  "facebook",
  "linkedin",
] as const;

type SupportedPlatform = (typeof SUPPORTED_PLATFORMS)[number];

export async function GET() {
  try {
    // Replace with your real signed-in app user later
    const userId = "TEMP_USER_ID_123";

    const connectedAccounts = await prisma.connectedAccount.findMany({
      where: {
        userId,
        isActive: true,
        platform: {
          in: [...SUPPORTED_PLATFORMS],
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const latestByPlatform = new Map<string, (typeof connectedAccounts)[number]>();

    for (const account of connectedAccounts) {
      if (!latestByPlatform.has(account.platform)) {
        latestByPlatform.set(account.platform, account);
      }
    }

    const accounts = SUPPORTED_PLATFORMS.map((platform: SupportedPlatform) => {
      const account = latestByPlatform.get(platform);

      return {
        platform,
        connected: Boolean(account),
        id: account?.id ?? null,
        userId: account?.userId ?? null,
        platformAccountId: account?.platformAccountId ?? null,
        username: account?.username ?? null,
        displayName: account?.displayName ?? null,
        createdAt: account?.createdAt ?? null,
        updatedAt: account?.updatedAt ?? null,
        metadataJson: account?.metadataJson ?? null,
      };
    });

    return NextResponse.json({ ok: true, accounts });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Failed to load social accounts.",
      },
      { status: 500 }
    );
  }
}