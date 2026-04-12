import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  exchangeCodeForShortLivedToken,
  exchangeForLongLivedToken,
  fetchInstagramMe,
  instagramEnv,
} from "@/lib/instagram";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const errorReason = url.searchParams.get("error_reason");
  const errorDescription = url.searchParams.get("error_description");

  if (error) {
    return NextResponse.redirect(
      `${instagramEnv.APP_BASE_URL}/rewards?instagram_error=${encodeURIComponent(
        `${error}: ${errorReason ?? ""} ${errorDescription ?? ""}`.trim()
      )}`
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${instagramEnv.APP_BASE_URL}/rewards?instagram_error=missing_code_or_state`
    );
  }

  const cookieStore = await cookies();
  const expectedState = cookieStore.get("instagram_oauth_state")?.value;

  if (!expectedState || expectedState !== state) {
    return NextResponse.redirect(
      `${instagramEnv.APP_BASE_URL}/rewards?instagram_error=invalid_state`
    );
  }

  try {
    const shortToken = await exchangeCodeForShortLivedToken(code);
    const longToken = await exchangeForLongLivedToken(shortToken.access_token);
    const me = await fetchInstagramMe(longToken.access_token);

    const expiresAt = new Date(Date.now() + longToken.expires_in * 1000);

    await prisma.connectedAccount.upsert({
      where: {
        platform_platformId: {
          platform: "instagram",
          platformId: me.id,
        },
      },
      update: {
        username: me.username ?? null,
        displayName: me.name ?? me.username ?? null,
        accessToken: longToken.access_token,
        tokenExpiresAt: expiresAt,
        scopes: process.env.INSTAGRAM_SCOPES ?? "instagram_business_basic",
        metadataJson: JSON.stringify({
          account_type: me.account_type ?? null,
          profile_picture_url: me.profile_picture_url ?? null,
        }),
      },
      create: {
        platform: "instagram",
        platformId: me.id,
        username: me.username ?? null,
        displayName: me.name ?? me.username ?? null,
        accessToken: longToken.access_token,
        tokenExpiresAt: expiresAt,
        scopes: process.env.INSTAGRAM_SCOPES ?? "instagram_business_basic",
        metadataJson: JSON.stringify({
          account_type: me.account_type ?? null,
          profile_picture_url: me.profile_picture_url ?? null,
        }),
      },
    });

    cookieStore.delete("instagram_oauth_state");

    return NextResponse.redirect(
      `${instagramEnv.APP_BASE_URL}/rewards?instagram_connected=1`
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "unknown_instagram_callback_error";

    return NextResponse.redirect(
      `${instagramEnv.APP_BASE_URL}/rewards?instagram_error=${encodeURIComponent(
        message
      )}`
    );
  }
}