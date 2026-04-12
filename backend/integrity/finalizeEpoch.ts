import { prisma } from "../../app/lib/prisma";
import { buildMerkleTreeFromDb } from "./buildMerkle";
import {
  distributorAbi,
  distributorAddress,
  operatorAccount,
  publicClient,
  walletClient,
} from "./clients";

export async function finalizeEpochOnChain(epochNumber: number) {
  const epoch = await prisma.epoch.findUnique({
    where: { epochNumber },
  });

  if (!epoch) {
    throw new Error(`Epoch ${epochNumber} not found`);
  }

  const { root } = await buildMerkleTreeFromDb(epochNumber);

  if (!root || root === "0x") {
    throw new Error("Empty Merkle root");
  }

  const { request } = await publicClient.simulateContract({
    account: operatorAccount,
    address: distributorAddress,
    abi: distributorAbi,
    functionName: "finalizeEpoch",
    args: [root],
  });

  const hash = await walletClient.writeContract(request);

  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  if (receipt.status !== "success") {
    throw new Error("Epoch finalization failed");
  }

  const onChainRoot = await publicClient.readContract({
    address: distributorAddress,
    abi: distributorAbi,
    functionName: "merkleRoots",
    args: [BigInt(epochNumber)],
  });

  await prisma.epoch.update({
    where: { id: epoch.id },
    data: {
      status: "FINALIZED",
      merkleRoot: String(onChainRoot),
      finalizeTxHash: hash,
      finalizedAt: new Date(),
    },
  });

  return {
    root,
    onChainRoot: String(onChainRoot),
    hash,
  };
}