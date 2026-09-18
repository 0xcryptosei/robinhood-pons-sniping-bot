import "dotenv/config";

import type { AppConfig } from "./types.js";

const DEFAULT_BACKFILL_BLOCKS = 0n;

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function loadConfig(): AppConfig {
  return {
    wssUrl: requireEnv("ROBINHOOD_WSS_URL"),
    backfillBlocks: BigInt(process.env.BACKFILL_BLOCKS ?? DEFAULT_BACKFILL_BLOCKS),
  };
}
