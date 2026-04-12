type GoogleProviderConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
  appUrl: string;
  authorizeUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  youtubeApiBaseUrl: string;
};

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const googleConfig: GoogleProviderConfig = {
  clientId: required("GOOGLE_CLIENT_ID", process.env.GOOGLE_CLIENT_ID),
  clientSecret: required(
    "GOOGLE_CLIENT_SECRET",
    process.env.GOOGLE_CLIENT_SECRET
  ),
  redirectUri: required(
    "GOOGLE_REDIRECT_URI",
    process.env.GOOGLE_REDIRECT_URI
  ),
  scopes: (
    process.env.GOOGLE_OAUTH_SCOPES ||
    "openid email profile https://www.googleapis.com/auth/youtube.readonly"
  )
    .split(/\s+/)
    .filter(Boolean),
  appUrl: required("APP_URL", process.env.APP_URL),
  authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenUrl: "https://oauth2.googleapis.com/token",
  userInfoUrl: "https://openidconnect.googleapis.com/v1/userinfo",
  youtubeApiBaseUrl: "https://www.googleapis.com/youtube/v3",
};