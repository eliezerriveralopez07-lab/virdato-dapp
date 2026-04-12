import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { xConfig } from "../../../../../lib/providers/x/config";

type TokenRefreshResponse = {
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

export async function POST(req: NextRequest) {
  try {
    const { connectedAccountId } = await req.json();

    if (!connectedAccountId) {
      return NextResponse.json(
        { ok: false, error: "Missing connectedAccountId" },
        { status: 400 }
      );
    }

    const account = await prisma.connectedAccount.findUnique({
      where: { id: connectedAccountId },
    });

    if (!account || account.platform !== "x" || !account.refreshToken) {
      return NextResponse.json(
        { ok: false, error: "Connected X account with refresh token not found" },
        { status: 404 }
      );
    }

    const body = new URLSearchParams({
      refresh_token: account.refreshToken,
      grant_type: "refresh_token",
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
        { ok: false, error: `Refresh failed: ${text}` },
        { status: 500 }
      );
    }

    const tokenJson = (await tokenRes.json()) as TokenRefreshResponse;

    const expiresAt =
      typeof tokenJson.expires_in === "number"
        ? new Date(Date.now() + tokenJson.expires_in * 1000)
        : null;

    const updated = await prisma.connectedAccount.update({
      where: { id: connectedAccountId },
      data: {
        accessToken: tokenJson.access_token ?? account.accessToken,
        refreshToken: tokenJson.refresh_token ?? account.refreshToken,
        tokenType: tokenJson.token_type ?? account.tokenType,
        scope: tokenJson.scope ?? account.scope,
        expiresAt: expiresAt ?? account.expiresAt,
      },
    });

    return NextResponse.json({ ok: true, account: updated });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown refresh error",
      },
      { status: 500 }
    );
  }
}