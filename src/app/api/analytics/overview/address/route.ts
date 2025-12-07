import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { VIRD_TOKEN_ADDRESS } from "@/app/lib/virdToken";

type Params = { params: { address: string } };

export async function GET(req: Request, { params }: Params) {
  const addr = params.address.toLowerCase();
  const token = VIRD_TOKEN_ADDRESS.toLowerCase();

  const address = await prisma.address.findUnique({
    where: { address: addr },
    include: {
      txsFrom: {
        where: { token },
        orderBy: { timestamp: "desc" },
        take: 20,
        include: { to: true },
      },
      txsTo: {
        where: { token },
        orderBy: { timestamp: "desc" },
        take: 20,
        include: { from: true },
      },
    },
  });

  if (!address) {
    return NextResponse.json({
      address: addr,
      sent: [],
      received: [],
    });
  }

  const sent = address.txsFrom.map((tx) => ({
    hash: tx.hash,
    to: tx.to.address,
    amountRaw: tx.amountRaw,
    timestamp: tx.timestamp,
  }));

  const received = address.txsTo.map((tx) => ({
    hash: tx.hash,
    from: tx.from.address,
    amountRaw: tx.amountRaw,
    timestamp: tx.timestamp,
  }));

  return NextResponse.json({
    address: address.address,
    sent,
    received,
  });
}
