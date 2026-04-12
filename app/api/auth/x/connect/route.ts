import { NextResponse } from "next/server";
import { xConfig } from "../../../../../lib/providers/x/config";
import {
  generateCodeChallenge,
  generateCodeVerifier,
  generateState,
} from "../../../../../lib/providers/x/pkce";

export async function GET() {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  const state = generateState();

  const params = new URLSearchParams({
    response_type: "code",
    client_id: xConfig.clientId,
    redirect_uri: xConfig.redirectUri,
    scope: xConfig.scopes.join(" "),
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  const authUrl = `${xConfig.authorizeUrl}?${params.toString()}`;
  const response = NextResponse.redirect(authUrl);

  response.cookies.set("x_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  });

  response.cookies.set("x_code_verifier", codeVerifier, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  });

  return response;
}