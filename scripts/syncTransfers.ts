import "dotenv/config";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";

async function main() {
  const rpcUrl = process.env.NEXT_PUBLIC_BASE_RPC_URL || "https://mainnet.base.org";

  const client = createPublicClient({
    chain: base,
    transport: http(rpcUrl),
  });

  const blockNumber = await client.getBlockNumber();

  console.log("Base latest block:", blockNumber.toString());
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});