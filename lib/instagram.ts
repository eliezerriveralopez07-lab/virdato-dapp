import { z } from "zod";

const envSchema = z.object({
  INSTAGRAM_APP_ID: z.string().min(1),
  INSTAGRAM_APP_SECRET: z.string().min(1),
  INSTAGRAM_REDIRECT_URI: z.string().url(),
  INSTAGRAM_SCOPES: z.string().min(1),
  APP_BASE_URL: z.string().url(),
});

export const instagramEnv = envSchema.parse({
  INSTAGRAM_APP_ID: process.env.INSTAGRAM_APP_ID,
  INSTAGRAM_APP_SECRET: process.env.INSTAGRAM_APP_SECRET,
  INSTAGRAM_REDIRECT_URI: process.env.INSTAGRAM_REDIRECT_URI,
  INSTAGRAM_SCOPES: process.env.INSTAGRAM_SCOPES,
  APP_BASE_URL: process.env.APP_BASE_URL,
});

export function buildInstagramAuthorizeUrl(state: string) {
  const url = new URL("https://www.instagram.com/oauth/authorize");

  url.searchParams.set("enable_fb_login", "0");
  url.searchParams.set("force_authentication", "1");
  url.searchParams.set("client_id", instagramEnv.INSTAGRAM_APP_ID);
  url.searchParams.set("redirect_uri", instagramEnv.INSTAGRAM_REDIRECT_URI);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", instagramEnv.INSTAGRAM_SCOPES);
  url.searchParams.set("state", state);

  return url.toString();
}

export type InstagramTokenResponse = {
  access_token: string;
  user_id: string;
  permissions?: string[];
};

export async function exchangeCodeForShortLivedToken(code: string) {
  const body = new URLSearchParams({
    client_id: instagramEnv.INSTAGRAM_APP_ID,
    client_secret: instagramEnv.INSTAGRAM_APP_SECRET,
    grant_type: "authorization_code",
    redirect_uri: instagramEnv.INSTAGRAM_REDIRECT_URI,
    code,
  });

  const res = await fetch("https://api.instagram.com/oauth/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error(
      `Instagram token exchange failed: ${JSON.stringify(json)}`
    );
  }

  return json as InstagramTokenResponse;
}

export type InstagramLongLivedTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
};

export async function exchangeForLongLivedToken(shortLivedToken: string) {
  const url = new URL("https://graph.instagram.com/access_token");
  url.searchParams.set("grant_type", "ig_exchange_token");
  url.searchParams.set("client_secret", instagramEnv.INSTAGRAM_APP_SECRET);
  url.searchParams.set("access_token", shortLivedToken);

  const res = await fetch(url.toString(), {
    method: "GET",
    cache: "no-store",
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error(
      `Instagram long-lived token exchange failed: ${JSON.stringify(json)}`
    );
  }

  return json as InstagramLongLivedTokenResponse;
}

export type InstagramMeResponse = {
  id: string;
  username?: string;
  account_type?: string;
  name?: string;
  profile_picture_url?: string;
};

export async function fetchInstagramMe(accessToken: string) {
  const url = new URL("https://graph.instagram.com/v24.0/me");
  url.searchParams.set(
    "fields",
    "id,username,account_type,name,profile_picture_url"
  );
  url.searchParams.set("access_token", accessToken);

  const res = await fetch(url.toString(), {
    method: "GET",
    cache: "no-store",
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error(`Instagram /me failed: ${JSON.stringify(json)}`);
  }

  return json as InstagramMeResponse;
}

export async function refreshInstagramLongLivedToken(accessToken: string) {
  const url = new URL("https://graph.instagram.com/refresh_access_token");
  url.searchParams.set("grant_type", "ig_refresh_token");
  url.searchParams.set("access_token", accessToken);

  const res = await fetch(url.toString(), {
    method: "GET",
    cache: "no-store",
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error(
      `Instagram refresh token failed: ${JSON.stringify(json)}`
    );
  }

  return json as InstagramLongLivedTokenResponse;
}