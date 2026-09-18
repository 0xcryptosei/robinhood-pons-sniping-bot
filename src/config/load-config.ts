import "dotenv/config";

import { wssToHttpUrl } from "../rpc/http-client.js";
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
  const wssUrl = requireEnv("ROBINHOOD_WSS_URL");

  return {
    wssUrl,
    httpUrl: process.env.ROBINHOOD_RPC_URL?.trim() || wssToHttpUrl(wssUrl),
    backfillBlocks: BigInt(process.env.BACKFILL_BLOCKS ?? DEFAULT_BACKFILL_BLOCKS),
  };
}
