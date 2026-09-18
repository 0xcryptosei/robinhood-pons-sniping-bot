import "dotenv/config";

import type { Hex } from "viem";

import { wssToHttpUrl } from "../rpc/http-client.js";
import type { AppConfig } from "./types.js";

const DEFAULT_BACKFILL_BLOCKS = 0n;
const DEFAULT_BUY_AMOUNT_ETH = "0.01";
const DEFAULT_BUY_DELAY_MS = 2_000;
const DEFAULT_MAX_SNIPE_TAX_BPS = 100;
const DEFAULT_SNIPE_TAX_POLL_MS = 200;
const DEFAULT_SNIPE_TAX_MAX_WAIT_MS = 8_000;
const DEFAULT_SLIPPAGE_BPS = 300;
const DEFAULT_PRIORITY_FEE_GWEI = "2";
const DEFAULT_MAX_FEE_GWEI = "50";

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function parsePrivateKey(): Hex | null {
  const value = process.env.PRIVATE_KEY?.trim();
  if (!value) return null;
  return (value.startsWith("0x") ? value : `0x${value}`) as Hex;
}

function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) return defaultValue;
  return value.toLowerCase() === "true";
}

export function loadConfig(): AppConfig {
  const wssUrl = requireEnv("ROBINHOOD_WSS_URL");

  return {
    wssUrl,
    httpUrl: process.env.ROBINHOOD_RPC_URL?.trim() || wssToHttpUrl(wssUrl),
    backfillBlocks: BigInt(process.env.BACKFILL_BLOCKS ?? DEFAULT_BACKFILL_BLOCKS),
    buy: {
      enabled: parseBoolean(process.env.BUY_ENABLED, true),
      privateKey: parsePrivateKey(),
      amountEth: process.env.BUY_AMOUNT_ETH?.trim() || DEFAULT_BUY_AMOUNT_ETH,
      delayMs: Number(process.env.BUY_DELAY_MS ?? DEFAULT_BUY_DELAY_MS),
      resumeOnFailure: parseBoolean(process.env.BUY_RESUME_ON_FAILURE, false),
      maxSnipeTaxBps: Number(process.env.MAX_SNIPE_TAX_BPS ?? DEFAULT_MAX_SNIPE_TAX_BPS),
      snipeTaxPollMs: Number(process.env.SNIPE_TAX_POLL_MS ?? DEFAULT_SNIPE_TAX_POLL_MS),
      snipeTaxMaxWaitMs: Number(process.env.SNIPE_TAX_MAX_WAIT_MS ?? DEFAULT_SNIPE_TAX_MAX_WAIT_MS),
      slippageBps: Number(process.env.SLIPPAGE_BPS ?? DEFAULT_SLIPPAGE_BPS),
      priorityFeeGwei: process.env.PRIORITY_FEE_GWEI?.trim() || DEFAULT_PRIORITY_FEE_GWEI,
      maxFeeGwei: process.env.MAX_FEE_GWEI?.trim() || DEFAULT_MAX_FEE_GWEI,
    },
  };
}

export function validateConfig(config: AppConfig): void {
  const { buy } = config;

  if (!Number.isFinite(buy.delayMs) || buy.delayMs < 0) {
    throw new Error("BUY_DELAY_MS must be a non-negative number");
  }

  const amount = Number(buy.amountEth);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("BUY_AMOUNT_ETH must be a positive number");
  }

  if (buy.enabled && !buy.privateKey) {
    throw new Error("BUY_ENABLED=true requires PRIVATE_KEY in .env");
  }

  if (buy.maxSnipeTaxBps < 0 || buy.maxSnipeTaxBps > 10_000) {
    throw new Error("MAX_SNIPE_TAX_BPS must be between 0 and 10000");
  }

  if (!Number.isFinite(buy.snipeTaxPollMs) || buy.snipeTaxPollMs < 50) {
    throw new Error("SNIPE_TAX_POLL_MS must be at least 50");
  }

  if (!Number.isFinite(buy.snipeTaxMaxWaitMs) || buy.snipeTaxMaxWaitMs < 0) {
    throw new Error("SNIPE_TAX_MAX_WAIT_MS must be a non-negative number");
  }

  if (!Number.isFinite(buy.slippageBps) || buy.slippageBps < 0 || buy.slippageBps >= 10_000) {
    throw new Error("SLIPPAGE_BPS must be between 0 and 9999");
  }

  const priorityFee = Number(buy.priorityFeeGwei);
  const maxFee = Number(buy.maxFeeGwei);
  if (!Number.isFinite(priorityFee) || priorityFee <= 0) {
    throw new Error("PRIORITY_FEE_GWEI must be a positive number");
  }
  if (!Number.isFinite(maxFee) || maxFee <= 0) {
    throw new Error("MAX_FEE_GWEI must be a positive number");
  }
  if (priorityFee > maxFee) {
    throw new Error("PRIORITY_FEE_GWEI must not exceed MAX_FEE_GWEI");
  }
}
