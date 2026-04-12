import { createPublicClient, createWalletClient, http, parseAbi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import {
  BASE_RPC_URL,
  OPERATOR_PRIVATE_KEY,
  REWARD_DISTRIBUTOR_ADDRESS,
  MERKLE_REWARDS_ADDRESS,
  VIRD_TOKEN_ADDRESS,
} from "./config";

export const publicClient = createPublicClient({
  chain: base,
  transport: http(BASE_RPC_URL),
});

export const operatorAccount = privateKeyToAccount(
  OPERATOR_PRIVATE_KEY as `0x${string}`
);

export const walletClient = createWalletClient({
  account: operatorAccount,
  chain: base,
  transport: http(BASE_RPC_URL),
});

export const distributorAbi = parseAbi([
  "function currentEpoch() view returns (uint256)",
  "function merkleRoots(uint256) view returns (bytes32)",
  "function finalizeEpoch(bytes32 root)",
  "function dao() view returns (address)",
]);

export const tokenAbi = parseAbi([
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address,uint256) returns (bool)",
]);

export const claimAbi = parseAbi([
  "event Claimed(uint256 indexed epoch, address indexed account, uint256 amount)",
  "function claimed(uint256,address) view returns (bool)",
  "function claim(uint256,uint256,bytes32[])",
]);

export const distributorAddress = REWARD_DISTRIBUTOR_ADDRESS as `0x${string}`;
export const claimAddress = MERKLE_REWARDS_ADDRESS as `0x${string}`;
export const tokenAddress = VIRD_TOKEN_ADDRESS as `0x${string}`;