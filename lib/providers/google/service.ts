import { prisma } from "../../prisma";
import { googleConfig } from "./config";

type GoogleUserInfo = {
  sub?: string;
  email?: string;
  name?: string;
  picture?: string;
};

type YouTubeChannelListResponse = {
  items?: Array<{
    id: string;
    snippet?: {
      title?: string;
      customUrl?: string;
      description?: string;
      thumbnails?: Record<string, { url?: string }>;
    };
    statistics?: {
      viewCount?: string;
      subscriberCount?: string;
      videoCount?: string;
    };
  }>;
};

function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
}

async function parseError(res: Response): Promise<never> {
  const text = await res.text();
  throw new Error(`Google API ${res.status}: ${text}`);
}

export async function getGoogleUserInfo(accessToken: string) {
  const res = await fetch(googleConfig.userInfoUrl, {
    headers: authHeader(accessToken),
    cache: "no-store",
  });

  if (!res.ok) {
    await parseError(res);
  }

  const json = (await res.json()) as GoogleUserInfo;

  return {
    googleSub: json.sub ?? null,
    email: json.email ?? null,
    name: json.name ?? null,
    picture: json.picture ?? null,
  };
}

export async function getAuthorizedYouTubeChannel(accessToken: string) {
  const url =
    `${googleConfig.youtubeApiBaseUrl}/channels` +
    `?part=snippet,statistics&mine=true`;

  const res = await fetch(url, {
    headers: authHeader(accessToken),
    cache: "no-store",
  });

  if (!res.ok) {
    await parseError(res);
  }

  const json = (await res.json()) as YouTubeChannelListResponse;
  const channel = json.items?.[0];

  if (!channel) {
    throw new Error(
      "No linked YouTube channel found for this authorized Google account."
    );
  }

  return {
    channelId: channel.id,
    title: channel.snippet?.title ?? null,
    customUrl: channel.snippet?.customUrl ?? null,
    description: channel.snippet?.description ?? null,
    thumbnailUrl:
      channel.snippet?.thumbnails?.default?.url ||
      channel.snippet?.thumbnails?.medium?.url ||
      channel.snippet?.thumbnails?.high?.url ||
      null,
    viewCount: Number(channel.statistics?.viewCount ?? 0),
    subscriberCount: Number(channel.statistics?.subscriberCount ?? 0),
    videoCount: Number(channel.statistics?.videoCount ?? 0),
  };
}

export async function upsertConnectedYouTubeAccount(params: {
  userId: string;
  platformAccountId: string;
  username?: string | null;
  displayName?: string | null;
  accessToken?: string | null;
  refreshToken?: string | null;
  tokenType?: string | null;
  scope?: string | null;
  expiresAt?: Date | null;
  metadataJson?: Record<string, unknown> | null;
}) {
  const {
    userId,
    platformAccountId,
    username,
    displayName,
    accessToken,
    refreshToken,
    tokenType,
    scope,
    expiresAt,
    metadataJson,
  } = params;

  return prisma.connectedAccount.upsert({
    where: {
      platform_platformAccountId: {
        platform: "youtube",
        platformAccountId,
      },
    },
    update: {
      userId,
      username: username ?? undefined,
      displayName: displayName ?? undefined,
      accessToken: accessToken ?? undefined,
      refreshToken: refreshToken ?? undefined,
      tokenType: tokenType ?? undefined,
      scope: scope ?? undefined,
      expiresAt: expiresAt ?? undefined,
      metadataJson: metadataJson ?? undefined,
      isActive: true,
    },
    create: {
      userId,
      platform: "youtube",
      platformAccountId,
      username: username ?? undefined,
      displayName: displayName ?? undefined,
      accessToken: accessToken ?? undefined,
      refreshToken: refreshToken ?? undefined,
      tokenType: tokenType ?? undefined,
      scope: scope ?? undefined,
      expiresAt: expiresAt ?? undefined,
      metadataJson: metadataJson ?? undefined,
      isActive: true,
    },
  });
}