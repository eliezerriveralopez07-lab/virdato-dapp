import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export async function GET() {
  try {
    const userId = "TEMP_USER_ID_123";

    const accounts = await prisma.connectedAccount.findMany({
      where: {
        userId,
        platform: "x",
        isActive: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ ok: true, accounts });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown list error",
      },
      { status: 500 }
    );
  }
}