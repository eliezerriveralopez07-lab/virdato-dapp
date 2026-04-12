import { prisma } from "../../prisma";
import { xConfig } from "./config";

type XUserPublicMetrics = {
  followers_count?: number;
  following_count?: number;
  tweet_count?: number;
  listed_count?: number;
  like_count?: number;
  media_count?: number;
};

type XUserResponse = {
  data?: {
    id: string;
    username: string;
    name?: string;
    public_metrics?: XUserPublicMetrics;
  };
};

type XPostResponse = {
  data?: {
    id: string;
    text?: string;
    public_metrics?: {
      retweet_count?: number;
      reply_count?: number;
      like_count?: number;
      quote_count?: number;
      bookmark_count?: number;
      impression_count?: number;
    };
  };
};

function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
}

async function parseError(res: Response): Promise<never> {
  const text = await res.text();
  throw new Error(`X API ${res.status}: ${text}`);
}

export async function getXPublicProfileStats(username: string) {
  const url =
    `${xConfig.apiBaseUrl}/users/by/username/${encodeURIComponent(username)}` +
    `?user.fields=public_metrics,name,username`;

  const res = await fetch(url, {
    headers: authHeader(xConfig.bearerToken),
    cache: "no-store",
  });

  if (!res.ok) {
    await parseError(res);
  }

  const json = (await res.json()) as XUserResponse;
  const user = json.data;

  if (!user) {
    throw new Error(`X user not found for username: ${username}`);
  }

  return {
    platform: "x" as const,
    accountId: user.id,
    username: user.username,
    displayName: user.name ?? null,
    followers: user.public_metrics?.followers_count ?? 0,
    following: user.public_metrics?.following_count ?? 0,
    tweets: user.public_metrics?.tweet_count ?? 0,
    listed: user.public_metrics?.listed_count ?? 0,
    likes: user.public_metrics?.like_count ?? 0,
    mediaCount: user.public_metrics?.media_count ?? 0,
  };
}

export async function getXAuthorizedUserStats(accessToken: string) {
  const url =
    `${xConfig.apiBaseUrl}/users/me` +
    `?user.fields=public_metrics,name,username`;

  const res = await fetch(url, {
    headers: authHeader(accessToken),
    cache: "no-store",
  });

  if (!res.ok) {
    await parseError(res);
  }

  const json = (await res.json()) as XUserResponse;
  const user = json.data;

  if (!user) {
    throw new Error("Authorized X user not found");
  }

  return {
    platform: "x" as const,
    accountId: user.id,
    username: user.username,
    displayName: user.name ?? null,
    followers: user.public_metrics?.followers_count ?? 0,
    following: user.public_metrics?.following_count ?? 0,
    tweets: user.public_metrics?.tweet_count ?? 0,
    listed: user.public_metrics?.listed_count ?? 0,
    likes: user.public_metrics?.like_count ?? 0,
    mediaCount: user.public_metrics?.media_count ?? 0,
  };
}

export async function getXAuthorizedPostMetrics(postId: string, accessToken: string) {
  const url =
    `${xConfig.apiBaseUrl}/tweets/${encodeURIComponent(postId)}` +
    `?tweet.fields=public_metrics,created_at`;

  const res = await fetch(url, {
    headers: authHeader(accessToken),
    cache: "no-store",
  });

  if (!res.ok) {
    await parseError(res);
  }

  const json = (await res.json()) as XPostResponse;
  const post = json.data;

  if (!post) {
    throw new Error(`X post not found: ${postId}`);
  }

  return {
    postId: post.id,
    likeCount: post.public_metrics?.like_count ?? 0,
    replyCount: post.public_metrics?.reply_count ?? 0,
    repostCount: post.public_metrics?.retweet_count ?? 0,
    quoteCount: post.public_metrics?.quote_count ?? 0,
    bookmarkCount: post.public_metrics?.bookmark_count ?? 0,
    impressionCount: post.public_metrics?.impression_count ?? 0,
  };
}

export async function upsertConnectedXAccount(params: {
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
        platform: "x",
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
      platform: "x",
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