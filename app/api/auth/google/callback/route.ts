import { NextRequest, NextResponse } from "next/server";
import { googleConfig } from "../../../../../lib/providers/google/config";
import {
  getAuthorizedYouTubeChannel,
  getGoogleUserInfo,
  upsertConnectedYouTubeAccount,
} from "../../../../../lib/providers/google/service";

function getCurrentAppUserId() {
  return "TEMP_USER_ID_123";
}

type GoogleTokenResponse = {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
  id_token?: string;
};

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    if (error) {
      return NextResponse.json(
        { ok: false, error: `Google OAuth error: ${error}` },
        { status: 400 }
      );
    }

    if (!code || !state) {
      return NextResponse.json(
        { ok: false, error: "Missing code or state" },
        { status: 400 }
      );
    }

    const cookieState = req.cookies.get("google_oauth_state")?.value;

    if (!cookieState || cookieState !== state) {
      return NextResponse.json(
        { ok: false, error: "Invalid Google OAuth state" },
        { status: 400 }
      );
    }

    const body = new URLSearchParams({
      code,
      client_id: googleConfig.clientId,
      client_secret: googleConfig.clientSecret,
      redirect_uri: googleConfig.redirectUri,
      grant_type: "authorization_code",
    });

    const tokenRes = await fetch(googleConfig.tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
      cache: "no-store",
    });

    if (!tokenRes.ok) {
      const text = await tokenRes.text();
      return NextResponse.json(
        { ok: false, error: `Google token exchange failed: ${text}` },
        { status: 500 }
      );
    }

    const tokenJson = (await tokenRes.json()) as GoogleTokenResponse;

    if (!tokenJson.access_token) {
      return NextResponse.json(
        { ok: false, error: "Missing Google access token" },
        { status: 500 }
      );
    }

    const profile = await getGoogleUserInfo(tokenJson.access_token);
    const channel = await getAuthorizedYouTubeChannel(tokenJson.access_token);

    const expiresAt =
      typeof tokenJson.expires_in === "number"
        ? new Date(Date.now() + tokenJson.expires_in * 1000)
        : null;

    await upsertConnectedYouTubeAccount({
      userId: getCurrentAppUserId(),
      platformAccountId: channel.channelId,
      username: channel.customUrl || channel.channelId,
      displayName: channel.title,
      accessToken: tokenJson.access_token ?? null,
      refreshToken: tokenJson.refresh_token ?? null,
      tokenType: tokenJson.token_type ?? null,
      scope: tokenJson.scope ?? null,
      expiresAt,
      metadataJson: {
        googleSub: profile.googleSub,
        email: profile.email,
        picture: profile.picture,
        description: channel.description,
        thumbnailUrl: channel.thumbnailUrl,
        viewCount: channel.viewCount,
        subscriberCount: channel.subscriberCount,
        videoCount: channel.videoCount,
        syncedAt: new Date().toISOString(),
      },
    });

    const response = NextResponse.redirect(`${googleConfig.appUrl}/rewards`);

    response.cookies.set("google_oauth_state", "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown Google callback error",
      },
      { status: 500 }
    );
  }
}