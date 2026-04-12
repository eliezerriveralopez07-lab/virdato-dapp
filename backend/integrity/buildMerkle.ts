import { encodeAbiParameters, keccak256, hexToBytes } from "viem";
import { MerkleTree } from "merkletreejs";
import { prisma } from "../../app/lib/prisma";

export async function buildMerkleTreeFromDb(epochNumber: number) {
  const epoch = await prisma.epoch.findUnique({
    where: { epochNumber },
  });

  if (!epoch) {
    throw new Error(`Epoch ${epochNumber} not found`);
  }

  const claims = await prisma.epochClaim.findMany({
    where: { epochId: epoch.id },
    orderBy: { wallet: "asc" },
  });

  if (!claims.length) {
    await prisma.epoch.update({
      where: { id: epoch.id },
      data: { merkleRoot: "0x" },
    });

    return { root: "0x", proofs: [] as { wallet: string; proof: `0x${string}`[] }[] };
  }

  const leaves = claims.map((claim) =>
    Buffer.from(
      hexToBytes(
        keccak256(
          encodeAbiParameters(
            [
              { name: "epoch", type: "uint256" },
              { name: "account", type: "address" },
              { name: "amount", type: "uint256" },
            ],
            [
              BigInt(epochNumber),
              claim.wallet as `0x${string}`,
              BigInt(claim.cappedRewardWei),
            ]
          )
        )
      )
    )
  );

  const hashPair = (value: Buffer) =>
    Buffer.from(hexToBytes(keccak256(`0x${value.toString("hex")}`)));

  const tree = new MerkleTree(leaves, hashPair, {
    sortPairs: true,
    duplicateOdd: false,
  });

  let root: `0x${string}`;

  if (leaves.length === 1) {
    root = `0x${leaves[0].toString("hex")}` as `0x${string}`;
  } else {
    root = `0x${tree.getRoot().toString("hex")}` as `0x${string}`;
  }

  for (let i = 0; i < claims.length; i++) {
    const proof =
      leaves.length === 1
        ? []
        : (tree.getHexProof(leaves[i]) as `0x${string}`[]);

    await prisma.epochClaim.update({
      where: { id: claims[i].id },
      data: {
        proof,
      },
    });
  }

  await prisma.epoch.update({
    where: { id: epoch.id },
    data: {
      merkleRoot: root,
    },
  });

  return {
    root,
    proofs: claims.map((claim, i) => ({
      wallet: claim.wallet,
      proof:
        leaves.length === 1
          ? []
          : (tree.getHexProof(leaves[i]) as `0x${string}`[]),
    })),
  };
}