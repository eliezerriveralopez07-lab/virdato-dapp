import crypto from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { buildInstagramAuthorizeUrl } from "@/lib/instagram";

export async function GET() {
  const state = crypto.randomBytes(24).toString("hex");

  const cookieStore = await cookies();
  cookieStore.set("instagram_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 60 * 10,
  });

  const authorizeUrl = buildInstagramAuthorizeUrl(state);
  return NextResponse.redirect(authorizeUrl);
}