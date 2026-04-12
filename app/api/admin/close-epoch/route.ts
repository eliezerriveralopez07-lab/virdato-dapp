import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const secret = req.headers.get("x-operator-secret");

    if (!process.env.OPERATOR_SECRET || secret !== process.env.OPERATOR_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const epochNumber = Number(body?.epochNumber);

    if (!Number.isInteger(epochNumber) || epochNumber < 0) {
      return NextResponse.json({ error: "Invalid epochNumber" }, { status: 400 });
    }

    const existing = await prisma.epoch.findUnique({
      where: { epochNumber },
    });

    if (!existing) {
      return NextResponse.json({ error: "Epoch not found" }, { status: 404 });
    }

    const updated = await prisma.epoch.update({
      where: { epochNumber },
      data: {
        status: "CLOSED",
      },
    });

    return NextResponse.json({
      success: true,
      epochNumber: updated.epochNumber,
      status: updated.status,
      merkleRoot: updated.merkleRoot,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Unknown error" },
      { status: 500 }
    );
  }
}