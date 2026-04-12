import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  fetchInstagramMe,
  refreshInstagramLongLivedToken,
} from "@/lib/instagram";

export async function POST() {
  try {
    const account = await prisma.connectedAccount.findFirst({
      where: { platform: "instagram" },
      orderBy: { updatedAt: "desc" },
    });

    if (!account?.accessToken) {
      return NextResponse.json(
        { ok: false, error: "No Instagram account connected." },
        { status: 404 }
      );
    }

    const refreshed = await refreshInstagramLongLivedToken(account.accessToken);
    const me = await fetchInstagramMe(refreshed.access_token);
    const expiresAt = new Date(Date.now() + refreshed.expires_in * 1000);

    const updated = await prisma.connectedAccount.update({
      where: { id: account.id },
      data: {
        accessToken: refreshed.access_token,
        tokenExpiresAt: expiresAt,
        username: me.username ?? account.username,
        displayName: me.name ?? me.username ?? account.displayName,
        metadataJson: JSON.stringify({
          account_type: me.account_type ?? null,
          profile_picture_url: me.profile_picture_url ?? null,
        }),
      },
    });

    return NextResponse.json({
      ok: true,
      account: {
        id: updated.id,
        platform: updated.platform,
        platformId: updated.platformId,
        username: updated.username,
        displayName: updated.displayName,
        tokenExpiresAt: updated.tokenExpiresAt,
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Instagram refresh failed",
      },
      { status: 500 }
    );
  }
}