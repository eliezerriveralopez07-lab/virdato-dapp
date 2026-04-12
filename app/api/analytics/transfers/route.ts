import { NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";

export async function GET() {
  try {
    const rpcUrl =
      process.env.NEXT_PUBLIC_BASE_RPC_URL || "https://mainnet.base.org";

    const client = createPublicClient({
      chain: base,
      transport: http(rpcUrl),
    });

    const blockNumber = await client.getBlockNumber();

    return NextResponse.json({
      chain: "base",
      blockNumber: blockNumber.toString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to fetch Base analytics" },
      { status: 500 }
    );
  }
}