import { z } from "zod";

const EnvSchema = z.object({
  BASE_RPC_URL: z.string().url(),
  VIRD_TOKEN_ADDRESS: z.string().startsWith("0x"),
  REWARD_DISTRIBUTOR_ADDRESS: z.string().startsWith("0x"),
  MERKLE_REWARDS_ADDRESS: z.string().startsWith("0x"),
  TREASURY_WALLET_ADDRESS: z.string().startsWith("0x"),
  OPERATOR_PRIVATE_KEY: z.string().startsWith("0x"),
  OPERATOR_SECRET: z.string().min(16),
  CLAIM_BUFFER_BPS: z.string().default("1000"),
  EPOCH_DURATION_DAYS: z.string().default("30"),
});

const env = EnvSchema.parse({
  BASE_RPC_URL: process.env.BASE_RPC_URL,
  VIRD_TOKEN_ADDRESS: process.env.VIRD_TOKEN_ADDRESS,
  REWARD_DISTRIBUTOR_ADDRESS: process.env.REWARD_DISTRIBUTOR_ADDRESS,
  MERKLE_REWARDS_ADDRESS: process.env.MERKLE_REWARDS_ADDRESS,
  TREASURY_WALLET_ADDRESS: process.env.TREASURY_WALLET_ADDRESS,
  OPERATOR_PRIVATE_KEY: process.env.OPERATOR_PRIVATE_KEY,
  OPERATOR_SECRET: process.env.OPERATOR_SECRET,
  CLAIM_BUFFER_BPS: process.env.CLAIM_BUFFER_BPS,
  EPOCH_DURATION_DAYS: process.env.EPOCH_DURATION_DAYS,
});

export const BASE_RPC_URL = env.BASE_RPC_URL;
export const VIRD_TOKEN_ADDRESS = env.VIRD_TOKEN_ADDRESS;
export const REWARD_DISTRIBUTOR_ADDRESS = env.REWARD_DISTRIBUTOR_ADDRESS;
export const MERKLE_REWARDS_ADDRESS = env.MERKLE_REWARDS_ADDRESS;
export const TREASURY_WALLET_ADDRESS = env.TREASURY_WALLET_ADDRESS;
export const OPERATOR_PRIVATE_KEY = env.OPERATOR_PRIVATE_KEY;
export const OPERATOR_SECRET = env.OPERATOR_SECRET;
export const CLAIM_BUFFER_BPS = BigInt(env.CLAIM_BUFFER_BPS);
export const EPOCH_DURATION_DAYS = Number(env.EPOCH_DURATION_DAYS);