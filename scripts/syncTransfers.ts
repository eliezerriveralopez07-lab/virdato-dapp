// scripts/syncTransfers.ts
import "dotenv/config";
import { createPublicClient, http, parseAbiItem } from "viem";
import { polygonAmoy } from "viem/chains";
import { prisma } from "../src/app/lib/prisma";
import { VIRD_TOKEN_ADDRESS } from "../src/app/lib/virdToken";

const TRANSFER_EVENT = parseAbiItem(
  "event Transfer(address indexed from, address indexed to, uint256 value)"
);

async function main() {
  console.log("Sync script started...");

  const rpcUrl = process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL;
  if (!rpcUrl) {
    throw new Error("Missing NEXT_PUBLIC_ALCHEMY_RPC_URL in .env");
  }

  console.log("RPC URL =", rpcUrl);
  console.log("Token =", VIRD_TOKEN_ADDRESS);

  const client = createPublicClient({
    chain: polygonAmoy,
    transport: http(rpcUrl),
  });

  const fromBlock =
    process.env.VIRDATO_FROM_BLOCK !== undefined
      ? BigInt(process.env.VIRDATO_FROM_BLOCK)
      : 0n;

  const latest = await client.getBlockNumber();

  console.log(
    `Syncing Transfer logs for ${VIRD_TOKEN_ADDRESS} from block ${fromBlock} to ${latest}...`
  );

  const logs = await client.getLogs({
    address: VIRD_TOKEN_ADDRESS,
    event: TRANSFER_EVENT,
    fromBlock,
    toBlock: latest,
  });

  console.log(`Found ${logs.length} Transfer events`);

  for (const log of logs) {
    const { args, transactionHash, blockNumber } = log;
    if (!args) continue;

    const { from, to, value } = args as {
      from: `0x${string}`;
      to: `0x${string}`;
      value: bigint;
    };

    const amountRaw = value.toString();
    const token = VIRD_TOKEN_ADDRESS.toLowerCase();

    const [fromAddr, toAddr] = await Promise.all([
      prisma.address.upsert({
        where: { address: from.toLowerCase() },
        update: {},
        create: { address: from.toLowerCase() },
      }),
      prisma.address.upsert({
        where: { address: to.toLowerCase() },
        update: {},
        create: { address: to.toLowerCase() },
      }),
    ]);

    const block = await client.getBlock({ blockNumber });
    const timestamp = new Date(Number(block.timestamp) * 1000);

    await prisma.transaction.upsert({
      where: { hash: transactionHash },
      update: {},
      create: {
        hash: transactionHash,
        blockNumber: Number(blockNumber),
        timestamp,
        amountRaw,
        token,
        fromId: fromAddr.id,
        toId: toAddr.id,
      },
    });
  }

  console.log("Sync script finished.");
}

main()
  .catch((err) => {
    console.error("Sync script error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
