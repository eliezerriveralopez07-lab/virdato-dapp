import { NextRequest, NextResponse } from "next/server";
import { xConfig } from "../../../../../lib/providers/x/config";
import {
  getXAuthorizedUserStats,
  upsertConnectedXAccount,
} from "../../../../../lib/providers/x/service";

function getCurrentAppUserId() {
  return "TEMP_USER_ID_123";
}

type TokenResponse = {
  token_type?: string;
  expires_in?: number;
  access_token?: string;
  scope?: string;
  refresh_token?: string;
};

function buildBasicAuthHeader(clientId: string, clientSecret: string): string {
  const raw = `${clientId}:${clientSecret}`;
  const encoded = Buffer.from(raw, "utf8").toString("base64");
  return `Basic ${encoded}`;
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    if (error) {
      return NextResponse.json(
        { ok: false, error: `X OAuth error: ${error}` },
        { status: 400 }
      );
    }

    if (!code || !state) {
      return NextResponse.json(
        { ok: false, error: "Missing code or state" },
        { status: 400 }
      );
    }

    const cookieState = req.cookies.get("x_oauth_state")?.value;
    const codeVerifier = req.cookies.get("x_code_verifier")?.value;

    if (!cookieState || state !== cookieState) {
      return NextResponse.json(
        { ok: false, error: "Invalid OAuth state" },
        { status: 400 }
      );
    }

    if (!codeVerifier) {
      return NextResponse.json(
        { ok: false, error: "Missing code verifier" },
        { status: 400 }
      );
    }

    const body = new URLSearchParams({
      code,
      grant_type: "authorization_code",
      redirect_uri: xConfig.redirectUri,
      code_verifier: codeVerifier,
      // For confidential clients, X uses Authorization: Basic.
      // Including client_id in body is optional here; leaving it out avoids ambiguity.
    });

    const tokenRes = await fetch(xConfig.tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: buildBasicAuthHeader(
          xConfig.clientId,
          xConfig.clientSecret
        ),
      },
      body,
      cache: "no-store",
    });

    if (!tokenRes.ok) {
      const text = await tokenRes.text();
      return NextResponse.json(
        { ok: false, error: `Token exchange failed: ${text}` },
        { status: 500 }
      );
    }

    const tokenJson = (await tokenRes.json()) as TokenResponse;

    if (!tokenJson.access_token) {
      return NextResponse.json(
        { ok: false, error: "Missing access token from X" },
        { status: 500 }
      );
    }

    const xUser = await getXAuthorizedUserStats(tokenJson.access_token);

    const expiresAt =
      typeof tokenJson.expires_in === "number"
        ? new Date(Date.now() + tokenJson.expires_in * 1000)
        : null;

    await upsertConnectedXAccount({
      userId: getCurrentAppUserId(),
      platformAccountId: xUser.accountId,
      username: xUser.username,
      displayName: xUser.displayName,
      accessToken: tokenJson.access_token ?? null,
      refreshToken: tokenJson.refresh_token ?? null,
      tokenType: tokenJson.token_type ?? null,
      scope: tokenJson.scope ?? null,
      expiresAt,
      metadataJson: {
        followers: xUser.followers,
        following: xUser.following,
        tweets: xUser.tweets,
        listed: xUser.listed,
        likes: xUser.likes,
        mediaCount: xUser.mediaCount,
      },
    });

    const response = NextResponse.redirect(`${xConfig.appUrl}/rewards`);

    response.cookies.set("x_oauth_state", "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    });

    response.cookies.set("x_code_verifier", "", {
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
        error: error instanceof Error ? error.message : "Unknown callback error",
      },
      { status: 500 }
    );
  }
}