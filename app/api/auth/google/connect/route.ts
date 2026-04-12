import { NextResponse } from "next/server";
import crypto from "crypto";
import { googleConfig } from "../../../../../lib/providers/google/config";

function generateState() {
  return crypto.randomBytes(24).toString("hex");
}

export async function GET() {
  const state = generateState();

  const params = new URLSearchParams({
    client_id: googleConfig.clientId,
    redirect_uri: googleConfig.redirectUri,
    response_type: "code",
    scope: googleConfig.scopes.join(" "),
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });

  const authUrl = `${googleConfig.authorizeUrl}?${params.toString()}`;
  const response = NextResponse.redirect(authUrl);

  response.cookies.set("google_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  });

  return response;
}