import { prisma } from "../../app/lib/prisma";
import { CLAIM_BUFFER_BPS } from "./config";
import { claimAddress, distributorAddress, operatorAccount, publicClient, tokenAbi, tokenAddress, walletClient } from "./clients";

export async function getTokenBalance(address: `0x${string}`) {
  return (await publicClient.readContract({
    address: tokenAddress,
    abi: tokenAbi,
    functionName: "balanceOf",
    args: [address],
  })) as bigint;
}

export async function ensureEpochFunding(epochNumber: number) {
  const epoch = await prisma.epoch.findUnique({ where: { epochNumber } });
  if (!epoch) throw new Error(`Epoch ${epochNumber} not found`);

  const required = BigInt(epoch.totalCappedWei);
  const buffer = (required * CLAIM_BUFFER_BPS) / 10000n;
  const minimumNeeded = required + buffer;
  const claimBalance = await getTokenBalance(claimAddress);

  if (claimBalance >= minimumNeeded) {
    await prisma.epoch.update({
      where: { id: epoch.id },
      data: { totalFundedWei: claimBalance.toString(), status: "FUNDED" },
    });
    return { funded: true, alreadyEnough: true, claimBalance, minimumNeeded };
  }

  const shortfall = minimumNeeded - claimBalance;

  const hash = await walletClient.writeContract({
    account: operatorAccount,
    address: tokenAddress,
    abi: tokenAbi,
    functionName: "transfer",
    args: [claimAddress, shortfall],
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error("Funding transfer failed");

  const newBalance = await getTokenBalance(claimAddress);

  await prisma.epoch.update({
    where: { id: epoch.id },
    data: {
      status: "FUNDED",
      totalFundedWei: newBalance.toString(),
      fundingTxHash: hash,
    },
  });

  return { funded: true, alreadyEnough: false, shortfall, claimBalance: newBalance, hash };
}