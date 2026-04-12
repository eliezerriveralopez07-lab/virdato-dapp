type XProviderConfig = {
  bearerToken: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
  appUrl: string;
  authorizeUrl: string;
  tokenUrl: string;
  apiBaseUrl: string;
};

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const xConfig: XProviderConfig = {
  bearerToken: required("X_BEARER_TOKEN", process.env.X_BEARER_TOKEN),
  clientId: required("X_CLIENT_ID", process.env.X_CLIENT_ID),
  clientSecret: required("X_CLIENT_SECRET", process.env.X_CLIENT_SECRET),
  redirectUri: required("X_REDIRECT_URI", process.env.X_REDIRECT_URI),
  scopes: (process.env.X_OAUTH_SCOPES || "tweet.read users.read offline.access")
    .split(/\s+/)
    .filter(Boolean),
  appUrl: required("APP_URL", process.env.APP_URL),
  authorizeUrl: "https://x.com/i/oauth2/authorize",
  tokenUrl: "https://api.x.com/2/oauth2/token",
  apiBaseUrl: "https://api.x.com/2",
};