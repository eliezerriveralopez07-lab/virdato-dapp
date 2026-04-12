import { buildMerkleTree } from "./buildMerkle";

export function getClaimPayload(wallet: string, epoch: number) {
  const normalizedWallet = wallet.toLowerCase();
  const { proofs } = buildMerkleTree(epoch);

  const match = proofs.find(
    (entry) => entry.address.toLowerCase() === normalizedWallet
  );

  if (!match) return null;

  return {
    epoch,
    amountWei: match.amount,
    proof: match.proof,
  };
}